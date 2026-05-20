'use strict';

// lib/component-registry.js — 시각화 라이브러리 레지스트리 로더 + generic fenced 디스패처.
//
// data/component-libraries.yml (블록 스타일 YAML)을 로드하여:
//   - loadRegistry()              : 레지스트리 객체 반환 (캐시)
//   - buildComponentInjections()  : 데크별 조건 주입 HTML 산출
//
// additive 무회귀: injection: unconditional / status: planned 라이브러리는 디스패처가
// 건드리지 않음. status: applied + injection: conditional + detect 매칭만 주입.
// Phase 0: 코어 5종 전부 planned → buildComponentInjections는 항상 빈 결과 → 출력 HTML 불변.
//
// 설계 SSOT: _doc_arch/component-libraries.md

const fs = require('fs');
const path = require('path');
const { resolveHook } = require('./component-hooks');

const REGISTRY_PATH = path.join(__dirname, '..', 'data', 'component-libraries.yml');

// ── 블록 스타일 YAML 파서 (component-libraries.yml 전용) ──────────────────────
// 지원: 'key: value' 스칼라, 'key:' + 블록 시퀀스(- 스칼라 | - key:value 맵), 'key: []'.
// 미지원: flow map {}. 본 파일의 규칙적 구조에 한정 (m2slide는 범용 YAML 파서 미보유).

function stripComment(s) {
  let inQuote = false, q = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuote) { if (c === q) inQuote = false; }
    else if (c === '"' || c === "'") { inQuote = true; q = c; }
    else if (c === '#' && (i === 0 || s[i - 1] === ' ' || s[i - 1] === '\t')) return s.slice(0, i);
  }
  return s;
}

function parseScalar(v) {
  v = (v || '').trim();
  if (v === '') return '';
  if (v === 'null' || v === '~') return null;
  if (v === '[]') return [];
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+$/.test(v)) return Number(v);
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    const inner = v.slice(1, -1);
    if (v[0] === '"') return inner.replace(/\\\\/g, '\\').replace(/\\"/g, '"');
    return inner;
  }
  return v;
}

function parseInlineList(s) {
  const inner = s.replace(/^\[/, '').replace(/\]$/, '').trim();
  if (!inner) return [];
  return inner.split(',').map((x) => parseScalar(x.trim()));
}

function applyField(obj, kv) {
  const m = kv.match(/^([a-zA-Z_]+):\s*(.*)$/);
  if (!m) return;
  obj[m[1]] = parseScalar(m[2]);
}

function newLibrary() {
  return {
    id: null, component: null, stage: null, injection: null,
    status: null, init_hook: null, cdn: [],
    detect_fenced_lang: [], detect_inline: [],
  };
}

function parseRegistry(text) {
  const libs = [];
  let version = null;
  let cur = null;        // 현재 라이브러리
  let listKey = null;    // indent-4 블록 키 ('cdn' | 'detect_fenced_lang' | 'detect_inline')
  let curCdnItem = null; // 현재 cdn 맵 항목

  for (const raw of String(text).split('\n')) {
    let line = stripComment(raw.replace(/\r$/, ''));
    if (!line.trim()) continue;
    const t = line.trim();
    if (t === '---') continue;
    const indent = line.search(/\S/);

    if (indent === 0) {
      const m = t.match(/^([a-zA-Z_]+):\s*(.*)$/);
      if (m && m[1] === 'version') version = parseScalar(m[2]);
      cur = null; listKey = null; curCdnItem = null;
      continue;
    }
    if (indent === 2 && t.startsWith('- ')) {
      cur = newLibrary();
      libs.push(cur);
      listKey = null; curCdnItem = null;
      applyField(cur, t.slice(2).trim());
      continue;
    }
    if (!cur) continue;

    if (indent === 4) {
      curCdnItem = null;
      const m = t.match(/^([a-zA-Z_]+):\s*(.*)$/);
      if (!m) continue;
      const key = m[1], val = m[2].trim();
      if (key === 'cdn') {
        listKey = 'cdn';
      } else if (key === 'detect_fenced_lang' || key === 'detect_inline') {
        if (val.startsWith('[')) { cur[key] = parseInlineList(val); listKey = null; }
        else if (val === '') { cur[key] = []; listKey = key; }
        else { cur[key] = [parseScalar(val)]; listKey = null; }
      } else {
        applyField(cur, t);
        listKey = null;
      }
      continue;
    }
    if (indent === 6 && t.startsWith('- ')) {
      const rest = t.slice(2).trim();
      if (listKey === 'cdn') {
        curCdnItem = { type: null, url: null };
        cur.cdn.push(curCdnItem);
        applyField(curCdnItem, rest);
      } else if (listKey === 'detect_fenced_lang' || listKey === 'detect_inline') {
        cur[listKey].push(parseScalar(rest));
      }
      continue;
    }
    if (indent >= 8 && curCdnItem) {
      applyField(curCdnItem, t);
      continue;
    }
  }
  return { version, libraries: libs };
}

// ── 레지스트리 로드 (캐시) ───────────────────────────────────────────────────
let _cache = null;
function loadRegistry(opts) {
  if (_cache && !(opts && opts.fresh)) return _cache;
  const text = fs.readFileSync(REGISTRY_PATH, 'utf-8');
  _cache = parseRegistry(text);
  return _cache;
}

// ── generic fenced 디스패처 ──────────────────────────────────────────────────
// deckHtml: 렌더된 슬라이드 HTML 문자열.
//   fenced 컴포넌트는 data-component="<lang>" 마커로, inline 마커는 리터럴로 탐지.
// 반환: { headHtml, bodyHtml } — 조건 주입 <link>/<script> 문자열.
//   주입 항목이 있을 때만 선행 '\n' 포함, 없으면 '' → 호출부 템플릿이 바이트 불변 유지.
// registryOverride: 테스트용 — 지정 시 파일 로드 대신 해당 레지스트리 사용.
function buildComponentInjections(deckHtml, registryOverride) {
  let registry = registryOverride;
  if (!registry) {
    try {
      registry = loadRegistry();
    } catch (e) {
      console.warn(`[component-registry] 레지스트리 로드 실패 — ${e.message}`);
      return { headHtml: '', bodyHtml: '' };
    }
  }
  const text = String(deckHtml || '');
  const headParts = [];
  const bodyParts = [];

  for (const lib of registry.libraries) {
    if (lib.status !== 'applied') continue;          // planned → 비활성
    const detected =
      (lib.detect_fenced_lang || []).some((l) => text.includes(`data-component="${l}"`)) ||
      (lib.detect_inline || []).some((m) => m && text.includes(m));
    if (!detected) continue;

    // CDN: conditional 만 주입 (unconditional 은 html-builder.js 정적 <script> 블록이 담당)
    if (lib.injection === 'conditional') {
      for (const res of (lib.cdn || [])) {
        if (res.type === 'css') headParts.push(`  <link rel="stylesheet" href="${res.url}">`);
        else if (res.type === 'js') bodyParts.push(`  <script src="${res.url}"></script>`);
      }
    }
    // init_hook: injection 무관 — detect 매칭 + applied 면 주입.
    //   d3 처럼 CDN 은 unconditional(이미 로드)이나 fenced 컴포넌트 렌더 훅이 필요한 케이스 대응.
    const hook = resolveHook(lib.init_hook);
    if (hook) bodyParts.push(`  <script>\n${hook}\n  </script>`);
  }
  return {
    headHtml: headParts.length ? '\n' + headParts.join('\n') : '',
    bodyHtml: bodyParts.length ? '\n' + bodyParts.join('\n') : '',
  };
}

// applied 라이브러리의 fenced 언어 집합 — markdown.js generic fenced 디스패처가 사용.
//   ```chart / ```map / ```d3 등 — status: applied 인 라이브러리의 detect_fenced_lang 합집합.
function getComponentFencedLangs() {
  let registry;
  try {
    registry = loadRegistry();
  } catch (e) {
    return new Set();
  }
  const langs = new Set();
  for (const lib of registry.libraries) {
    if (lib.status !== 'applied') continue;
    for (const l of (lib.detect_fenced_lang || [])) langs.add(l);
  }
  return langs;
}

module.exports = {
  loadRegistry, parseRegistry, buildComponentInjections, getComponentFencedLangs, REGISTRY_PATH,
};
