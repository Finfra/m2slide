'use strict';

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

let _videoDefault = 'controls'; // convertMarkdownToHTML 호출 시 설정됨

// model3d 인라인 빌드 옵션 (file:// 환경에서 Chrome fetch 차단 우회)
//   _model3dProjectDir : 프로젝트 루트 (./img/* 상대 경로 해석 기준)
//   _model3dInlineGlb  : GLB → base64 data URI 자동 치환 on/off (default true)
//   _model3dInlineMaxKb: 인라인 임계 (KB). 초과 모델은 skip + warn (default 5000 = 5MB)
let _model3dProjectDir = null;
let _model3dInlineGlb = true;
let _model3dInlineMaxKb = 5000;

function setModel3dInlineOptions({ projectDir, inlineGlb, inlineMaxKb } = {}) {
  if (projectDir !== undefined) _model3dProjectDir = projectDir || null;
  if (typeof inlineGlb === 'boolean') _model3dInlineGlb = inlineGlb;
  if (typeof inlineMaxKb === 'number' && inlineMaxKb > 0) _model3dInlineMaxKb = inlineMaxKb;
}

// model3d config body 에서 src 가 로컬 파일이면 base64 data URI 로 치환.
//   - http://, https://, data: 로 시작하면 무변경
//   - 절대 경로면 그대로 사용, 상대 경로는 _model3dProjectDir 기준 해석
//   - 파일 없으면 무변경 (런타임 model-viewer 가 에러 표시)
//   - 파일 크기 > _model3dInlineMaxKb 면 무변경 + console.warn
//   - JSON 파싱 실패 시 원본 그대로 반환 (런타임 디스패처가 에러 표시 담당)
function inlineModel3dGlb(configText) {
  if (!_model3dInlineGlb || !_model3dProjectDir) return configText;
  let cfg;
  try { cfg = JSON.parse(configText); }
  catch (_) { return configText; } // 잘못된 JSON 은 런타임이 처리
  if (!cfg || typeof cfg.src !== 'string') return configText;
  const src = cfg.src;
  if (/^(https?:|data:)/i.test(src)) return configText; // 외부·이미 인라인
  // 경로 해석
  const absPath = path.isAbsolute(src)
    ? src
    : path.resolve(_model3dProjectDir, src.replace(/^\.\//, ''));
  if (!fs.existsSync(absPath)) return configText;
  let stat;
  try { stat = fs.statSync(absPath); } catch (_) { return configText; }
  const sizeKb = stat.size / 1024;
  if (sizeKb > _model3dInlineMaxKb) {
    console.warn(`[model3d] 인라인 skip (${sizeKb.toFixed(1)}KB > ${_model3dInlineMaxKb}KB): ${src}`);
    return configText;
  }
  let b64;
  try { b64 = fs.readFileSync(absPath).toString('base64'); }
  catch (e) {
    console.warn(`[model3d] 파일 읽기 실패: ${src} — ${e.message}`);
    return configText;
  }
  cfg.src = `data:model/gltf-binary;base64,${b64}`;
  return JSON.stringify(cfg);
}

// Kroki 빌드 타임 캐시 디렉토리 (2-tier).
//   _krokiCacheDir       : 빌드 출력 캐시 (slide/kroki/) — HTML img src가 가리키는 실제 위치
//   _krokiSourceCacheDir : source-of-truth 캐시 (lib/kroki/) — git 추적, slide/ 정리에도 살아남음
// 동작:
//   1) 빌드 출력 캐시 hit → 즉시 사용
//   2) source-of-truth 캐시 hit → 빌드 출력으로 복사 후 사용
//   3) 둘 다 miss → 외부 kroki 서버 fetch → 빌드 출력에 저장 + source-of-truth에 mirror
//   4) fetch 실패 → null (HTML에 fallback URL 또는 placeholder 박힘)
let _krokiCacheDir = null;
let _krokiSourceCacheDir = null;
let _krokiCacheRel = 'kroki';   // HTML img src 기준 상대 경로 (slide/kroki/...)
let _krokiServer = 'https://kroki.io';

function setKrokiCacheDir(absDir, relPath, server, sourceDir) {
  _krokiCacheDir = absDir || null;
  _krokiSourceCacheDir = sourceDir || null;
  if (relPath) _krokiCacheRel = relPath;
  if (server) _krokiServer = server.replace(/\/+$/, '');
}

// kroki path-based URL 생성. zlib deflate + base64url
function krokiPathUrl(lang, source, server) {
  const deflated = zlib.deflateSync(Buffer.from(source, 'utf-8'));
  const b64 = deflated.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  return `${(server || _krokiServer).replace(/\/+$/, '')}/${lang}/svg/${b64}`;
}

// 빌드 타임 SVG fetch + 캐시. 성공 시 로컬 상대경로(예: 'kroki/plantuml_abcd1234.svg') 반환,
// 실패 시 null. 캐시 적중 시 즉시 반환(네트워크 호출 없음).
function fetchKrokiSvgCached(lang, source, opts = {}) {
  if (!_krokiCacheDir) return null; // 캐시 비활성
  try {
    const hash = crypto.createHash('sha256').update(`${lang}\n${source}`).digest('hex').slice(0, 12);
    const filename = `${lang}_${hash}.svg`;
    const absPath = path.join(_krokiCacheDir, filename);
    const relRef = `${_krokiCacheRel.replace(/\/+$/, '')}/${filename}`;
    // 1) 빌드 출력 캐시 hit
    if (fs.existsSync(absPath) && fs.statSync(absPath).size > 0) {
      return relRef;
    }
    // 빌드 출력 디렉토리 보장 (이후 복사·fetch 양쪽에 필요)
    fs.mkdirSync(_krokiCacheDir, { recursive: true });
    // 2) source-of-truth 캐시 hit → 빌드 출력으로 복사
    if (_krokiSourceCacheDir) {
      const srcPath = path.join(_krokiSourceCacheDir, filename);
      if (fs.existsSync(srcPath) && fs.statSync(srcPath).size > 0) {
        try {
          fs.copyFileSync(srcPath, absPath);
          return relRef;
        } catch (e) {
          console.warn(`[kroki] source 캐시 복사 실패 (${lang}): ${e.message}`);
          // 복사 실패 시 fetch 경로로 진행
        }
      }
    }
    // 3) 둘 다 miss → 외부 fetch
    // curl로 동기 fetch (Node 동기 HTTP 회피). timeout 짧게.
    const url = krokiPathUrl(lang, source, opts.server);
    const timeoutSec = opts.timeoutSec || 8;
    const args = [
      '-sS', '-fL',
      '--max-time', String(timeoutSec),
      '-A', 'm2slide/kroki-cache (Node.js)',
      '-o', absPath,
      url,
    ];
    try {
      execFileSync('curl', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    } catch (e) {
      // 실패 시 빈 파일 정리
      try { if (fs.existsSync(absPath)) fs.unlinkSync(absPath); } catch (_) {}
      const stderr = (e && e.stderr ? e.stderr.toString().trim() : e.message || '').slice(0, 200);
      console.warn(`[kroki] fetch 실패 (${lang}): ${stderr}`);
      return null;
    }
    if (!fs.existsSync(absPath) || fs.statSync(absPath).size === 0) {
      try { fs.unlinkSync(absPath); } catch (_) {}
      return null;
    }
    // 4) fetch 성공 → source-of-truth로 mirror (write-through)
    if (_krokiSourceCacheDir) {
      try {
        fs.mkdirSync(_krokiSourceCacheDir, { recursive: true });
        fs.copyFileSync(absPath, path.join(_krokiSourceCacheDir, filename));
      } catch (e) {
        // mirror 실패는 빌드 차단하지 않음 (다음 빌드는 fetch 재시도)
        console.warn(`[kroki] source 캐시 mirror 실패 (${lang}): ${e.message}`);
      }
    }
    return relRef;
  } catch (e) {
    console.warn(`[kroki] cache 처리 오류 (${lang}): ${e.message}`);
    return null;
  }
}

const LAYOUT_CLASS_ALIASES = {
  columns: 'm2-cols columns',
  column: 'm2-col column',
  rows: 'm2-rows rows',
  row: 'm2-row row',
  // 카드 컴포넌트 — `::: cards` fenced div: 내부 리스트를 카드 그리드로 렌더 (CSS .m2-cards)
  cards: 'm2-cards cards',
  // 출처·인용 슬롯 (Issue234) — `::: source` fenced div: 슬라이드 하단 작은 글씨 (citation/footnote 용도)
  source: 'm2-source source',
};

// htmlArt 구조 도해 타입 화이트리스트 (v1 4 + v2 10 + v3 list 5 + v4 비율·균형 2 + v5 비교·풀이 2 + v6 워크플로 1 + ext 1 + v7 1 = 26종) — `::: htmlart <type>`
//   설계 SSOT: _doc_arch/htmlArt.md / 타입 카탈로그: data/htmlart/types.yml
//   전체 SmartArt 카탈로그·구현 현황: _doc_arch/htmlArt_list.md
const HTMLART_TYPES = new Set([
  'process', 'cycle', 'hierarchy', 'pyramid',                       // v1 (Issue188)
  'timeline', 'venn', 'matrix', 'target', 'funnel',                 // v2 확장 (Issue202)
  'gear', 'radial', 'chevron', 'step', 'arrow',                     // v2 확장 (Issue202)
  'numbered', 'hexagon', 'bracket', 'block', 'tab',                 // v3 list 타입군 (Issue204)
  'pie', 'balance',                                                  // v4 비율·균형 (Basic Pie·Pie Process·Balance 흡수)
  'compare',                                                         // v5 좌우 비교 (Issue208 — Opposing Ideas/Counterbalance Arrows 흡수)
  'explain',                                                         // v5 중앙 명제 풀이 (Issue211 — radial 변형, 박스 없는 phrase + elbow line)
  'workflow',                                                        // v6 사람 endcap + 단계 박스 체인 (Issue209 — process 변형, 양 끝 페르소나)
  'bend_process',                                                    // v6 N단계 줄바꿈 serpentine 흐름 (Issue218 — Bending Process 흡수)
  'annotate',                                                        // v6 원문 주해 (Issue213 — 색 윗줄·밑줄 + 좌·우 라벨)
  'callout',                                                         // v7 중앙 hub + 다방향 callout arrow + 라벨 (Issue219)
]);

// Issue98: 정규 코드 블록 텍스트 컨텍스트용 최소 escape (`<`, `>`, `&` 만)
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Issue118: Pandoc inline attribute `{.foo .bar}` 추출 (라인 단위)
//   `* 항목 {.fragment .fade-up}` → { classes: ['fragment','fade-up'], remaining: '* 항목' }
//   매칭 실패 시(일반 텍스트, 빈 attribute, backtick 종결 라인) → { classes: [], remaining: text }
//   - 패턴: 라인 끝의 `{.token .token ...}` (각 토큰은 `.`로 시작 필수)
//   - 앞에 공백 1개 이상 필수 (텍스트와 attribute 분리)
//   - backtick 직후 attribute는 코드 인라인 안의 `{}`일 가능성 높아 매칭 안 함 (보수적)
//   - 빈 `{}` 또는 `{.}` 또는 `{이름}` (.없음)은 attribute 패턴 아님 → 매칭 실패
function extractInlineClasses(text) {
  if (typeof text !== 'string' || text.length === 0) {
    return { classes: [], remaining: text || '' };
  }
  // Issue149: reveal.js 표준 주석 syntax 우선 매칭
  //   `* 항목 <!-- .element: class="fragment fade-up" -->` → { classes: ['fragment','fade-up'], remaining: '* 항목' }
  //   단/이중 따옴표 모두 허용. before가 backtick 종결이면 코드 인라인 보호로 매칭 안 함
  const rm = text.match(/^(.*?)\s*<!--\s*\.element:\s*class\s*=\s*["']([^"']+)["']\s*-->\s*$/);
  if (rm) {
    const beforeR = rm[1];
    if (!/`\s*$/.test(beforeR)) {
      const tokensR = rm[2].trim().split(/\s+/).filter(Boolean);
      if (tokensR.length > 0) {
        return { classes: tokensR, remaining: beforeR.replace(/\s+$/, '') };
      }
    }
  }
  // 라인 끝 trim 후 `{...}` 추출. trailing 공백 흡수.
  // 보수적 패턴: 마지막 } 직전이 backtick이면 매칭 안 함 (코드 인라인 보호)
  const m = text.match(/^(.*?)\s+\{([^{}]+)\}\s*$/);
  if (!m) {
    // 단독 `{.fragment}` (앞 텍스트 없음) 케이스 별도 처리
    const sm = text.match(/^\s*\{([^{}]+)\}\s*$/);
    if (!sm) return { classes: [], remaining: text };
    const tokens = sm[1].trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0 || !tokens.every(t => /^\.[\w-]+$/.test(t))) {
      return { classes: [], remaining: text };
    }
    return { classes: tokens.map(t => t.slice(1)), remaining: '' };
  }
  const before = m[1];
  // 코드 인라인 보호: before가 backtick으로 끝나면 코드 안의 `{...}`일 가능성 → 매칭 안 함
  if (/`\s*$/.test(before)) {
    return { classes: [], remaining: text };
  }
  const tokens = m[2].trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || !tokens.every(t => /^\.[\w-]+$/.test(t))) {
    return { classes: [], remaining: text };
  }
  return { classes: tokens.map(t => t.slice(1)), remaining: before };
}

// Parse `{.cls width="48%" height="40%" .extra}` style attribute block
function parseLayoutAttrs(attrStr) {
  if (!attrStr) return { classes: [], style: '' };
  const classes = [];
  const styles = [];
  // .className tokens
  const classMatches = attrStr.match(/\.[\w-]+/g) || [];
  classMatches.forEach(m => classes.push(m.slice(1)));
  // width=... / width="..."
  const wMatch = attrStr.match(/\bwidth\s*=\s*"?([^"\s}]+)"?/);
  if (wMatch) styles.push(`flex: 0 0 ${wMatch[1]}`, `max-width: ${wMatch[1]}`);
  const hMatch = attrStr.match(/\bheight\s*=\s*"?([^"\s}]+)"?/);
  if (hMatch) styles.push(`height: ${hMatch[1]}`);
  return { classes, style: styles.join('; ') };
}

// T2: Pandoc fenced div preprocessor
// Open: `^:::+ classname [{...}]`  Close: `^:::+\s*$`
function preprocessPandocDiv(markdown) {
  const lines = markdown.split('\n');
  const out = [];
  const stack = []; // tracks open fences for matching close
  let inCode = false;
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (ln.match(/^```/)) { inCode = !inCode; out.push(ln); continue; }
    if (inCode) { out.push(ln); continue; }

    // Open: `:::+ classname [{...}]` or `:::+ {.classname ...}`
    const openWithName = ln.match(/^(:{3,})\s+(\w[\w-]*)(?:\s+\{([^}]*)\})?\s*$/);
    const openOnlyAttr = ln.match(/^(:{3,})\s+\{([^}]*)\}\s*$/);
    const closeOnly = ln.match(/^(:{3,})\s*$/);

    // Issue188: htmlArt 구조 도해 `::: htmlart <type>` — openWithName(`::: htmlart` 단독)보다 먼저 가로채기
    //   process|cycle|hierarchy|pyramid → <div class="m2-htmlart htmlart-<type>">
    //   미지원/누락 타입 → .component-error (빌드 비차단). cycle 등간격 배치용 --htmlart-n 주입.
    // Issue210: Pandoc attribute syntax 확장 — `::: htmlart pie {.palette-cool .accent-3}`
    //   .palette-X → data-palette=X (런타임 또는 빌드 단계에서 m2-accent-N override)
    //   .accent-N → data-accent=N (1~6, htmlart-accent 단일 색 강제)
    const openHtmlart = ln.match(/^(:{3,})\s+htmlart(?:\s+([A-Za-z][\w-]*))?(?:\s+\{([^}]*)\})?\s*$/);
    if (openHtmlart) {
      const type = (openHtmlart[2] || '').toLowerCase();
      const attrStr = openHtmlart[3] || '';
      // 매칭 close 까지 top-level `*` 항목 수 카운트 (--htmlart-n) + close 인덱스
      let n = 0, depth = 1, closeIdx = -1;
      for (let j = i + 1; j < lines.length; j++) {
        if (/^:{3,}\s+\S/.test(lines[j])) depth++;
        else if (/^:{3,}\s*$/.test(lines[j])) { depth--; if (depth === 0) { closeIdx = j; break; } }
        else if (depth === 1 && /^\*\s+\S/.test(lines[j])) n++;
      }
      if (!HTMLART_TYPES.has(type)) {
        const label = type ? `미지원 타입 "${escapeHtml(type)}"` : '타입 미지정';
        out.push(`<div class="m2-htmlart component-error" data-htmlart-error="1">htmlArt: ${label} — ${[...HTMLART_TYPES].join(' | ')}</div>`);
        stack.push(true);
        continue;
      }
      // Issue210: attribute 파싱 — .palette-X, .accent-N (1~6)
      let dataAttrs = '', extraStyle = '';
      const palMatch = attrStr.match(/\.palette-([a-z][a-z0-9_-]*)/);
      if (palMatch) {
        dataAttrs += ` data-palette="${escapeHtml(palMatch[1])}"`;
      }
      const accMatch = attrStr.match(/\.accent-([1-6])/);
      if (accMatch) {
        dataAttrs += ` data-accent="${accMatch[1]}"`;
        // 단일 색 강제 — --htmlart-accent를 해당 m2-accent-N으로 직접 override
        extraStyle += `--htmlart-accent:var(--m2-accent-${accMatch[1]});`;
      }
      // Issue219: callout orientation 옵션 — .h/.horizontal · .v/.vertical · .fan
      //   data-orientation 으로 전파, renderCallout가 분산 좌표 계산에 사용.
      const orMatch = attrStr.match(/\.(horizontal|vertical|fan|h|v)\b/);
      if (orMatch) {
        let o = orMatch[1];
        if (o === 'h') o = 'horizontal';
        if (o === 'v') o = 'vertical';
        dataAttrs += ` data-orientation="${o}"`;
      }
      const styleAttr = extraStyle ? `--htmlart-n:${n};${extraStyle}` : `--htmlart-n:${n}`;
      out.push(`<div class="m2-htmlart htmlart-${type}" data-htmlart="${type}"${dataAttrs} style="${styleAttr}">`);
      // hierarchy: bullet 텍스트를 <span class="ha-node">로 래핑 — 가로 트리 박스 노드용
      // (bare text node는 박스 불가. hierarchy 한정, process/cycle/pyramid는 li 자체가 박스)
      if (type === 'hierarchy' && closeIdx !== -1) {
        for (let j = i + 1; j < closeIdx; j++) {
          const bm = lines[j].match(/^(\s*)([*-])\s+(.+?)\s*$/);
          out.push(bm ? `${bm[1]}${bm[2]} <span class="ha-node">${bm[3]}</span>` : lines[j]);
        }
        out.push('</div>');
        i = closeIdx;
        continue;
      }
      // pyramid: 최상위 bullet(들여쓰기 0) 라벨을 <span class="pyr-band-label">로 래핑
      //   — 좌측 삼각형 슬라이스 표시용. 하위 들여쓰기 항목은 우측 상세 패널로 렌더.
      if (type === 'pyramid' && closeIdx !== -1) {
        for (let j = i + 1; j < closeIdx; j++) {
          const tm = lines[j].match(/^\*\s+(.+?)\s*$/);
          out.push(tm ? `* <span class="pyr-band-label">${tm[1]}</span>` : lines[j]);
        }
        out.push('</div>');
        i = closeIdx;
        continue;
      }
      stack.push(true);
      continue;
    }

    if (openWithName) {
      const baseName = openWithName[2];
      const attrStr = openWithName[3] || '';
      const { classes: extraClasses, style } = parseLayoutAttrs(attrStr);
      let aliased = LAYOUT_CLASS_ALIASES[baseName] || baseName;
      // Issue203: `::: cards` 블록의 모든 최상위 항목이 title-only(본문 중첩 리스트 없음)면
      //   rows 클래스 추가 → CSS .m2-cards.rows 가 1열 가로 행으로 렌더(긴 텍스트 줄바꿈·빈 body 띠 해소).
      //   본문 라인(들여쓰기 bullet)이 1개라도 있으면 grid 유지. 빌드 단계 자동 감지(작성자 무개입).
      if (baseName === 'cards') {
        let depth = 1, subInCode = false, hasBody = false;
        for (let j = i + 1; j < lines.length; j++) {
          if (/^```/.test(lines[j])) { subInCode = !subInCode; continue; }
          if (subInCode) continue;
          if (/^:{3,}\s+\S/.test(lines[j])) depth++;
          else if (/^:{3,}\s*$/.test(lines[j])) { depth--; if (depth === 0) break; }
          else if (depth === 1 && /^\s+[-*]\s+\S/.test(lines[j])) { hasBody = true; break; }
        }
        if (!hasBody) aliased += ' rows';
      }
      const allClasses = [aliased, ...extraClasses.filter(c => c !== baseName)].join(' ');
      const styleAttr = style ? ` style="${style}"` : '';
      out.push(`<div class="${allClasses}"${styleAttr}>`);
      stack.push(true);
      continue;
    }
    if (openOnlyAttr) {
      // attr-only block (e.g. `:::: {.column width="48%"}`)
      const attrStr = openOnlyAttr[2];
      const { classes: extraClasses, style } = parseLayoutAttrs(attrStr);
      const mappedClasses = extraClasses.map(c => LAYOUT_CLASS_ALIASES[c] || c).join(' ');
      const styleAttr = style ? ` style="${style}"` : '';
      out.push(`<div class="${mappedClasses}"${styleAttr}>`);
      stack.push(true);
      continue;
    }
    if (closeOnly && stack.length > 0) {
      out.push('</div>');
      stack.pop();
      continue;
    }
    out.push(ln);
  }
  // Close any leftover (defensive)
  while (stack.length > 0) { out.push('</div>'); stack.pop(); }
  return out.join('\n');
}

// T3: Slidev `::right::` slot preprocessor
function preprocessSlidevSlot(markdown) {
  const lines = markdown.split('\n');
  let slotIdx = -1;
  let inCode = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^```/)) { inCode = !inCode; continue; }
    if (inCode) continue;
    if (lines[i].match(/^::right::\s*$/)) {
      if (slotIdx === -1) slotIdx = i;
      else { /* second slot ignored */ }
    }
  }
  if (slotIdx === -1) return markdown;
  // Extract leading H1/H2/H3 headers (and surrounding blank lines) to keep them
  // OUTSIDE the m2-cols wrapper. generateSlideHTML splits at the first H2/H1 to
  // wrap the rest in <div class="theContents">; if the header sits inside the
  // first column, that wrapper breaks the m2-cols structure.
  const beforeLines = lines.slice(0, slotIdx);
  const afterLines = lines.slice(slotIdx + 1);
  const headerLines = [];
  let headerEnd = 0;
  for (let i = 0; i < beforeLines.length; i++) {
    if (beforeLines[i].match(/^#{1,3}\s/) || beforeLines[i].trim() === '') {
      headerLines.push(beforeLines[i]);
      headerEnd = i + 1;
    } else {
      break;
    }
  }
  const beforeBody = beforeLines.slice(headerEnd);
  return [
    ...headerLines,
    '<div class="m2-cols">',
    '<div class="m2-col">',
    ...beforeBody,
    '</div>',
    '<div class="m2-col">',
    ...afterLines,
    '</div>',
    '</div>',
  ].join('\n');
}

// T4: Heuristic auto 2-column when slide has both list block and standalone image
function preprocessHeuristic(markdown) {
  const lines = markdown.split('\n');
  // Skip if any raw <div> present (user-managed layout) — avoid double wrapping
  for (const ln of lines) {
    if (ln.match(/<div\b/i)) return markdown;
  }
  // Detect blocks + first-occurrence index for source order
  let firstListIdx = -1;
  let firstImgIdx = -1;
  let inCode = false;
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (ln.match(/^```/)) { inCode = !inCode; continue; }
    if (inCode) continue;
    if (firstListIdx === -1 && (ln.match(/^\s*[-*]\s+\S/) || ln.match(/^\s*\d+\.\s+\S/))) firstListIdx = i;
    // Issue26: 비디오도 이미지와 동일하게 미디어 블록으로 인식
    if (firstImgIdx === -1 && ln.match(/^!\[[^\]]*\]\([^)]+\)\s*$/)) firstImgIdx = i;
  }
  if (firstListIdx === -1 || firstImgIdx === -1) return markdown;
  const imageFirst = firstImgIdx < firstListIdx;

  // Split lines into header lines (H1/H2/H3 at top) and body
  const headerLines = [];
  const bodyLines = [];
  let headerDone = false;
  for (const ln of lines) {
    if (!headerDone && (ln.match(/^#{1,3}\s/) || ln.trim() === '')) {
      headerLines.push(ln);
      continue;
    }
    headerDone = true;
    bodyLines.push(ln);
  }

  // Partition body: image lines → right column, others → left column
  const leftLines = [];
  const rightLines = [];
  let inCode2 = false;
  for (const ln of bodyLines) {
    if (ln.match(/^```/)) { inCode2 = !inCode2; leftLines.push(ln); continue; }
    if (inCode2) { leftLines.push(ln); continue; }
    if (ln.match(/^!\[[^\]]*\]\([^)]+\)\s*$/)) rightLines.push(ln);
    else leftLines.push(ln);
  }

  // Source order preservation: if image appears before list, place image-left
  const firstColLines = imageFirst ? rightLines : leftLines;
  const secondColLines = imageFirst ? leftLines : rightLines;

  return [
    ...headerLines,
    '<div class="m2-cols">',
    '<div class="m2-col">',
    ...firstColLines,
    '</div>',
    '<div class="m2-col">',
    ...secondColLines,
    '</div>',
    '</div>',
  ].join('\n');
}

function convertMarkdownToHTML(markdown, videoDefault) {
  _videoDefault = videoDefault || _videoDefault;
  // Issue182: generic fenced 디스패처 — 레지스트리(component-libraries.yml) 등재 컴포넌트 fenced 언어.
  //   ```chart / ```map / ```d3 등 status: applied 라이브러리의 fenced 언어를 data-component div 로 변환.
  let componentLangs = new Set();
  try { componentLangs = require('./component-registry').getComponentFencedLangs(); } catch (e) {}
  // === Issue34 preprocessing pipeline ===
  // 1. <!-- nosplit --> flag (disables T4 heuristic only)
  //    Issue37: backtick 인라인 코드 내부 `<!-- nosplit -->`는 제거 대상에서 제외
  let noSplit = false;
  {
    const codeStash = [];
    const stashed = markdown.replace(/`[^`\n]+`/g, (m) => {
      codeStash.push(m);
      return `CODE${codeStash.length - 1}`;
    });
    if (/<!--\s*nosplit\s*-->/.test(stashed)) {
      noSplit = true;
      const stripped = stashed.replace(/<!--\s*nosplit\s*-->/g, '');
      markdown = stripped.replace(/CODE(\d+)/g, (_, i) => codeStash[Number(i)]);
    }
  }
  // 2. Pandoc fenced div
  markdown = preprocessPandocDiv(markdown);
  // 3. Slidev slot
  markdown = preprocessSlidevSlot(markdown);
  // 4. Heuristic (skipped automatically when nosplit or any <div> already in markdown)
  if (!noSplit) {
    markdown = preprocessHeuristic(markdown);
  }

  let lines = markdown.split('\n');
  let html = [];
  let inList = false;
  let inOrderedList = false;
  let inBlockquote = false;
  let blockquoteLines = [];
  let listLevel = 0;
  let olLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Headers (inline 처리: backtick code, bold, link 등)
    if (line.match(/^### /)) {
      const content = line.replace(/^### /, '');
      html.push(`<h3 class="title">${processInline(content)}</h3>`);
      continue;
    }
    if (line.match(/^## /)) {
      const content = line.replace(/^## /, '');
      html.push(`<h2 class="title">${processInline(content)}</h2>`);
      continue;
    }
    if (line.match(/^# /)) {
      const content = line.replace(/^# /, '');
      html.push(`<h1 class="outline-title">${processInline(content)}</h1>`);
      continue;
    }

    // Blockquote start
    if (line.match(/^>/)) {
      if (!inBlockquote) {
        inBlockquote = true;
        blockquoteLines = [];
      }
      blockquoteLines.push(line.replace(/^> ?/, ''));
      continue;
    } else if (inBlockquote) {
      // End blockquote
      html.push('<blockquote>');
      html.push(blockquoteLines.map(l => processInline(l)).join('<br>\n'));
      html.push('</blockquote>');
      inBlockquote = false;
      blockquoteLines = [];
    }

    // Unordered list (supports - and *, with nesting)
    const bulletMatch = line.match(/^(\s*)([-*])\s+(.*)$/);
    if (bulletMatch) {
      // Normalize indentation: replace tabs with 2 spaces
      const indent = bulletMatch[1].replace(/\t/g, '  ').length;
      const bulletChar = bulletMatch[2];
      const content = bulletMatch[3];
      const level = Math.floor(indent / 2); // 2 spaces = 1 level

      if (!inList) {
        html.push('<ul>');
        inList = true;
        listLevel = 0;
      }

      // Handle nesting
      if (level > listLevel) {
        // Start new nested list
        while (listLevel < level) {
          // Remove closing </li> from previous item if it exists, to nest <ul> inside it
          if (html.length > 0 && html[html.length - 1].endsWith('</li>')) {
            html[html.length - 1] = html[html.length - 1].slice(0, -5);
            html.push('<ul>');
          } else {
            // Fallback if no previous li (shouldn't happen in valid markdown usually)
            html.push('<ul>');
          }
          listLevel++;
        }
      } else if (level < listLevel) {
        // Close nested lists
        while (listLevel > level) {
          html.push('</ul>');
          html.push('</li>'); // Close the parent li
          listLevel--;
        }
      } else {
        // Same level, close previous item if needed
        // (Not strictly needed if we don't open <li> explicitly until content, but for simplicity)
      }

      // Apply different class based on bullet character
      let bulletClass = '';
      if (bulletChar === '*') {
        bulletClass = 'bullet-dot';
      } else if (bulletChar === '-') {
        bulletClass = 'bullet-dash';
      }
      // Issue118: Pandoc inline attribute `{.fragment .fade-up}` 추출 → li class에 병합
      const _ic = extractInlineClasses(content);
      const _allCls = [bulletClass, ..._ic.classes].filter(Boolean).join(' ');
      const _clsAttr = _allCls ? ` class="${_allCls}"` : '';
      html.push(`<li${_clsAttr}>${processInline(_ic.remaining)}</li>`);
      continue;
    } else if (inList && !line.match(/^\s*[-*]\s/)) {
      // Check if it's a continuation (indented text)
      if (line.trim() !== '' && line.match(/^\s+/)) {
        const indent = line.match(/^(\s*)/)[1].length;
        // Determine target level: indent should be >= (level * 2) + 2
        // e.g. Level 0 (0 indent) -> content at 2+. Level 1 (2 indent) -> content at 4+.
        // If indent is 2, it belongs to Level 0.

        // Close nested lists if indent is insufficient for current level
        while (listLevel > 0 && indent < (listLevel * 2) + 2) {
          html.push('</ul>');
          html.push('</li>');
          listLevel--;
        }

        if (html.length > 0 && html[html.length - 1].endsWith('</li>')) {
          // Append text to the last li (line break)
          html[html.length - 1] = html[html.length - 1].slice(0, -5) + '<br>' + processInline(line.trim()) + '</li>';
          continue;
        }
      }

      // Close all nested lists
      while (listLevel > 0) {
        html.push('</ul>');
        html.push('</li>');
        listLevel--;
      }
      html.push('</ul>');
      inList = false;
    }

    // Ordered list
    // Ordered list
    const olMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (olMatch) {
      // Normalize indentation: replace tabs with 2 spaces
      const indent = olMatch[1].replace(/\t/g, '  ').length;
      const content = olMatch[3];
      const level = Math.floor(indent / 2); // 2 spaces = 1 level

      if (!inOrderedList) {
        html.push('<ol>');
        inOrderedList = true;
        olLevel = 0;
      }

      // Handle nesting
      if (level > olLevel) {
        // Start new nested list
        while (olLevel < level) {
          // Remove closing </li> from previous item if it exists, to nest <ol> inside it
          if (html.length > 0 && html[html.length - 1].endsWith('</li>')) {
            html[html.length - 1] = html[html.length - 1].slice(0, -5);
            html.push('<ol>');
          } else {
            // Fallback
            html.push('<ol>');
          }
          olLevel++;
        }
      } else if (level < olLevel) {
        // Close nested lists
        while (olLevel > level) {
          html.push('</ol>');
          html.push('</li>'); // Close the parent li
          olLevel--;
        }
      }

      // Issue118: Pandoc inline attribute `{.fragment}` → ordered list li class 주입
      const _ico = extractInlineClasses(content);
      const _clsAttrO = _ico.classes.length > 0 ? ` class="${_ico.classes.join(' ')}"` : '';
      html.push(`<li${_clsAttrO}>${processInline(_ico.remaining)}</li>`);
      continue;
    } else if (inOrderedList && !line.match(/^\s*\d+\.\s/)) {
      // Check if it's a continuation (indented text)
      if (line.trim() !== '' && line.match(/^\s+/)) {
        const indent = line.match(/^(\s*)/)[1].length;

        // Close nested lists if indent is insufficient for current level
        while (olLevel > 0 && indent < (olLevel * 2) + 2) {
          html.push('</ol>');
          html.push('</li>');
          olLevel--;
        }

        if (html.length > 0 && html[html.length - 1].endsWith('</li>')) {
          // Append text to the last li (line break)
          html[html.length - 1] = html[html.length - 1].slice(0, -5) + '<br>' + processInline(line.trim()) + '</li>';
          continue;
        }
      }

      // Close all nested lists
      while (olLevel > 0) {
        html.push('</ol>');
        html.push('</li>');
        olLevel--;
      }
      html.push('</ol>');
      inOrderedList = false;
    }

    // Code blocks
    if (line.match(/^```/)) {
      // Extract language from code block (e.g., ```javascript, ```mermaid)
      const langMatch = line.match(/^```([\w-]+)/);
      const lang = langMatch ? langMatch[1] : '';

      let codeLines = [];
      i++; // Skip opening ```
      while (i < lines.length && !lines[i].match(/^```/)) {
        codeLines.push(lines[i]);
        i++;
      }

      // Special handling for mermaid diagrams
      if (lang === 'mermaid') {
        html.push('<div class="media-container mermaid">');
        html.push(codeLines.join('\n'));
        html.push('</div>');
      }
      // Issue184: HTML artifact — ```wordart fenced block 본문 = raw HTML (escape 없이 통과).
      //   WordArt 장식 텍스트(theme slide.css 의 .wordart-* 클래스)용 — Cards 로 표현하기
      //   복잡한 경우의 리치 HTML 블록. 순수 CSS 컴포넌트라 init_hook·CDN 불필요
      //   (component-libraries.yml 미등재 — componentLangs 경로보다 먼저 분기).
      else if (lang === 'wordart') {
        html.push('<div class="component-container wordart-block">');
        html.push(codeLines.join('\n'));
        html.push('</div>');
      }
      // text-wireframe: ASCII 와이어프레임을 D2Coding 모노스페이스 textarea 로 그대로 표시.
      //   ditaa 와 달리 Kroki 변환 안 함 — D2Coding 은 한글을 정확히 ASCII 2자 폭으로 렌더하므로
      //   한글 라벨이 들어간 박스아트도 plain text 상태에서 정렬이 보장됨 (ditaa CJK code-point
      //   격자 정렬 문제 원천 회피). readonly textarea — 발표 중 선택·스크롤 가능, 편집 차단.
      //   D2Coding 웹폰트는 html-builder 가 text-wireframe 블록 존재 시에만 조건 주입.
      else if (lang === 'text-wireframe') {
        const rows = Math.max(codeLines.length, 1);
        const body = escapeHtml(codeLines.join('\n'));
        html.push('<div class="text-wireframe-block">');
        html.push(`<textarea class="text-wireframe" readonly rows="${rows}" spellcheck="false" wrap="off" aria-label="text wireframe">${body}</textarea>`);
        html.push('</div>');
      }
      // Issue181/182: 레지스트리 등재 fenced 컴포넌트(chart/map/d3 등) → data-component div.
      //   본문은 config(JSON 등). escapeHtml 후 textContent 로 디코드. 코어 디스패처 훅이 렌더.
      // Issue183: component 슬롯(.component-container) 사용 — diagram 슬롯(.media-container)과 분리.
      //   media-container 의 blanket svg/img 룰은 viewBox/replaced 콘텐츠를 가정하므로
      //   viewBox 없는 raw SVG(d3)·타일 img(map) 를 깨뜨림. 컴포넌트는 자체 사이징 책임.
      else if (componentLangs.has(lang)) {
        let body = codeLines.join('\n');
        // model3d: GLB src 로컬 경로 → base64 data URI 인라인 (file:// fetch 우회)
        if (lang === 'model3d') body = inlineModel3dGlb(body);
        html.push(`<div class="component-container" data-component="${lang}">`);
        html.push(escapeHtml(body));
        html.push('</div>');
      }
      // Special handling for Kroki diagrams
      else if (['blockdiag', 'seqdiag', 'actdiag', 'nwdiag', 'packetdiag', 'rackdiag',
        'ditaa', 'dot', 'graphviz', 'vega', 'vegalite', 'plantuml'].includes(lang)) {
        const source = codeLines.join('\n');
        // 1) 빌드 타임 SVG fetch + 캐시 시도 (실패해도 진행)
        const cachedRel = fetchKrokiSvgCached(lang, source);
        if (cachedRel) {
          // 캐시 hit/fetch 성공 → 로컬 SVG 파일을 img src로 참조 (외부 의존 0)
          html.push('<div class="media-container kroki">');
          html.push(`<div class="graph-scroll"><img src="${cachedRel}" alt="${lang} diagram"/></div>`);
          html.push('</div>');
        } else {
          // 2) Fallback: 표준 path-based kroki URL 생성 + onerror 안내
          //    deflate 자체가 실패할 일은 거의 없지만 try/catch 유지.
          let url = '';
          try {
            url = krokiPathUrl(lang, source);
          } catch (e) {
            url = '';
          }
          if (url) {
            const safeLang = lang.replace(/"/g, '');
            const onerr = "this.onerror=null;this.replaceWith(Object.assign(document.createElement('div'),{className:'kroki-error',innerHTML:'<strong>" + safeLang + " diagram</strong> 렌더링 실패 (kroki.io 응답 없음)<br><small>네트워크 또는 kroki 서비스 점검 필요</small>'}));";
            html.push('<div class="media-container kroki">');
            html.push(`<div class="graph-scroll"><img src="${url}" alt="${safeLang} diagram" onerror="${onerr.replace(/"/g, '&quot;')}"/></div>`);
            html.push('</div>');
          } else {
            // 정말 안 되는 경우만 raw text 노출 (디버깅용)
            html.push(`<div class="media-container kroki kroki-error" data-type="${lang}">`);
            html.push(`<pre class="code-wrapper"><code class="hljs">${escapeHtml(source)}</code></pre>`);
            html.push('</div>');
          }
        }
      }
      else {
        // Regular code block (Issue98: HTML escape + hljs class 명시 부착)
        const langClass = lang ? ` class="language-${lang} hljs"` : ' class="hljs"';
        html.push(`<pre class="code-wrapper"><code${langClass}>` + escapeHtml(codeLines.join('\n')) + '</code></pre>');
      }
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      html.push('');
      continue;
    }

    // Raw HTML pass-through (layout wrapper divs from Issue34 preprocessing)
    if (line.match(/^\s*<\/?div\b/)) {
      html.push(line);
      continue;
    }

    // Tables - convert markdown table to HTML
    if (line.match(/^\|/)) {
      const tableLines = [line];
      while (i + 1 < lines.length && lines[i + 1].match(/^\|/)) {
        i++;
        tableLines.push(lines[i]);
      }
      // Need header + separator (at least 2 lines)
      if (tableLines.length < 2 || !tableLines[1].match(/^\|?[\s:|-]+\|/)) {
        tableLines.forEach(l => html.push(`<p>${processInline(l)}</p>`));
        continue;
      }
      const splitRow = (row) => {
        let s = row.trim();
        if (s.startsWith('|')) s = s.slice(1);
        if (s.endsWith('|')) s = s.slice(0, -1);
        return s.split('|').map(c => c.trim());
      };
      const alignments = splitRow(tableLines[1]).map(c => {
        if (c.startsWith(':') && c.endsWith(':')) return 'center';
        if (c.endsWith(':')) return 'right';
        if (c.startsWith(':')) return 'left';
        return '';
      });
      const cellTag = (tag, content, idx) => {
        const a = alignments[idx];
        const s = a ? ` style="text-align:${a}"` : '';
        return `<${tag}${s}>${processInline(content)}</${tag}>`;
      };
      let tbl = '<table>\n<thead>\n<tr>';
      splitRow(tableLines[0]).forEach((c, idx) => { tbl += cellTag('th', c, idx); });
      tbl += '</tr>\n</thead>\n<tbody>\n';
      for (let r = 2; r < tableLines.length; r++) {
        if (!tableLines[r].trim()) continue;
        tbl += '<tr>';
        splitRow(tableLines[r]).forEach((c, idx) => { tbl += cellTag('td', c, idx); });
        tbl += '</tr>\n';
      }
      tbl += '</tbody>\n</table>';
      html.push(tbl);
      continue;
    }

    // Standalone image/video (not inside text)
    // Issue26/43: 비디오 확장자면 <video {preset 속성}>, 그 외엔 <img>
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    if (imgMatch) {
      const alt = imgMatch[1];
      const url = imgMatch[2];
      if (isVideoUrl(url)) {
        const attrs = VIDEO_DEFAULT_PRESETS[_videoDefault] || VIDEO_DEFAULT_PRESETS['controls'];
        html.push(`<div class="media-container"><video src="${url}" ${attrs} preload="metadata">${alt || ''}</video></div>`);
      } else {
        html.push(`<div class="media-container"><img src="${url}" alt="${alt}"></div>`);
      }
      continue;
    }

    // Regular paragraph
    // Issue118: Pandoc inline attribute `{.fragment}` → p class 주입
    const _icp = extractInlineClasses(line);
    const _clsAttrP = _icp.classes.length > 0 ? ` class="${_icp.classes.join(' ')}"` : '';
    html.push(`<p${_clsAttrP}>${processInline(_icp.remaining)}</p>`);
  }

  // Close any open lists or blockquotes
  // Close any remaining nested lists
  if (inList) {
    while (listLevel > 0) {
      html.push('</ul>');
      html.push('</li>');
      listLevel--;
    }
    html.push('</ul>');
  }
  if (inOrderedList) {
    while (olLevel > 0) {
      html.push('</ol>');
      html.push('</li>');
      olLevel--;
    }
    html.push('</ol>');
  }
  if (inBlockquote) {
    html.push('<blockquote>');
    html.push(blockquoteLines.map(l => processInline(l)).join('<br>\n'));
    html.push('</blockquote>');
  }

  return html.join('\n');
}

// Issue26: 비디오 확장자 판별
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogv', 'ogg', 'mov', 'm4v'];

// Issue43: ![](*.mp4) 변환 시 적용할 video 속성 preset 매핑
// _config.yml의 `video_default:` 값으로 선택. 8개 후보 + 기본값 'controls'
// 'autoplay-nocontrols'는 음소거 없이 자동재생을 시도 — 대부분 브라우저에서 차단됨(사용자 인터랙션 필요)
const VIDEO_DEFAULT_PRESETS = {
  'controls':              'controls',
  'autoplay-muted':        'autoplay muted controls playsinline',
  'autoplay-loop':         'autoplay muted loop controls playsinline',
  'loop':                  'controls loop',
  'muted':                 'muted controls',
  'background':            'autoplay muted loop playsinline',
  'minimal':               'autoplay muted playsinline',
  'autoplay-nocontrols':   'autoplay playsinline',
};
function isVideoUrl(url) {
  const m = String(url || '').split(/[?#]/)[0].match(/\.([a-zA-Z0-9]+)$/);
  return !!m && VIDEO_EXTENSIONS.includes(m[1].toLowerCase());
}

// Issue181: Font Awesome 아이콘 :fa-name: → <i> 태그.
//   코드 스팬(`...`) 안의 :fa-x: 는 보존 — backtick 으로 split 후 비코드 세그먼트만 변환.
function transformIcons(text) {
  return text.split(/(`[^`]+`)/).map((seg) =>
    seg.startsWith('`')
      ? seg
      : seg.replace(/:fa-([a-z][a-z0-9-]*):/g, '<i class="fa-solid fa-$1"></i>')
  ).join('');
}

// Process inline elements (bold, images, code, etc.)
function processInline(text) {
  // Issue181: 아이콘 변환 (코드 스팬 밖에서만) — 이미지/링크/코드 처리 전에 수행
  text = transformIcons(text);

  // Issue233: 인라인 코드를 placeholder로 먼저 추출 → 링크·bold 변환이 코드 내부를
  // 침범하지 못하도록 격리. 예: `` `[name](URL)` `` 같은 마크다운 link 문법을
  // 백틱 코드로 보존하려는 케이스에서, 링크 정규식이 코드 내부 `[..](..)`을 먼저
  // <a> 태그로 치환하여 결과가 `<code>&lt;a href="URL"&gt;name&lt;/a&gt;</code>`로 깨지던 회귀 차단.
  // Issue146 HTML escape는 placeholder 복원 시 동일하게 유지.
  const codeStash = [];
  text = text.replace(/`([^`]+)`/g, (m, code) => {
    const idx = codeStash.length;
    codeStash.push(`<code>${escapeHtml(code)}</code>`);
    return `CODE${idx}`;
  });

  // Images FIRST (before links, because images also use [] syntax)
  // Issue26/43: 마크다운 이미지 문법 ![]()이 비디오 확장자면 <video>로 변환
  // 속성은 _config.yml의 video_default preset 따름 (VIDEO_DEFAULT_PRESETS)
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (m, alt, url) => {
    if (isVideoUrl(url)) {
      const attrs = VIDEO_DEFAULT_PRESETS[_videoDefault] || VIDEO_DEFAULT_PRESETS['controls'];
      return `<video src="${url}" ${attrs} preload="metadata">${alt || ''}</video>`;
    }
    return `<img src="${url}" alt="${alt}">`;
  });

  // Links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Autolink <https://...> / <http://...> / <mailto:...> (CommonMark)
  // 마크다운 링크([x](y)) 치환 뒤에 수행 → 이미 <a>로 변환된 href 속성의 URL은
  // `<`로 시작하지 않으므로 미간섭. 미지원 시 브라우저가 <...>를 빈 태그로 간주해
  // URL이 통째로 소실되던 회귀 차단.
  text = text.replace(/<((?:https?:\/\/|mailto:)[^>\s]+)>/g, (m, url) => {
    const href = url.replace(/^mailto:/, 'mailto:');
    const label = url.replace(/^mailto:/, '');
    return `<a href="${href}">${label}</a>`;
  });

  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Issue233: 인라인 코드 placeholder 복원
  text = text.replace(/CODE(\d+)/g, (_, idx) => codeStash[Number(idx)]);

  return text;
}


module.exports = { convertMarkdownToHTML, processInline, isVideoUrl, extractInlineClasses, VIDEO_DEFAULT_PRESETS, VIDEO_EXTENSIONS, setKrokiCacheDir, setModel3dInlineOptions };
