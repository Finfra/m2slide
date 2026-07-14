#!/usr/bin/env node
'use strict';

// Issue292: 라이선스 뱃지(.m2-license-badge)가 재사용하는 테마 텍스트色(--kn-text)이
// 테마 기본 배경(.reveal background) 위에서 WCAG 2.1 contrast ratio ≥4.5:1 을 만족하는지 검증.
// 실행: node lib/lint-license.js  (또는 ./m2slide.sh --lint-license)
// rc=0: 모든 theme 통과. rc=1: 1개 이상 기준 미달(또는 색상 파싱 실패로 검증 불가).
// 설계 SSOT: _doc_arch/license-attribution.md §4

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const THEME_DIR = path.join(ROOT_DIR, 'theme');
const MIN_RATIO = 4.5;

function expandImports(cssAbsPath, seen) {
  seen = seen || new Set();
  const abs = path.resolve(cssAbsPath);
  if (seen.has(abs) || !fs.existsSync(abs)) return '';
  seen.add(abs);
  const dir = path.dirname(abs);
  const src = fs.readFileSync(abs, 'utf-8');
  return src.replace(/^[ \t]*@import\s+(?:url\()?\s*["']([^"']+)["']\s*\)?\s*;[ \t]*$/gm, (match, rel) => {
    const target = path.resolve(dir, rel);
    if (!fs.existsSync(target)) return match;
    return expandImports(target, seen);
  });
}

// 색상 리터럴 → [r,g,b] (0~255). 파싱 불가하면 null.
function parseColor(raw) {
  const v = raw.trim();
  const hex6 = v.match(/^#([0-9a-fA-F]{6})$/);
  if (hex6) {
    const n = parseInt(hex6[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const hex3 = v.match(/^#([0-9a-fA-F]{3})$/);
  if (hex3) {
    const [r, g, b] = hex3[1].split('').map((c) => parseInt(c + c, 16));
    return [r, g, b];
  }
  const named = { white: [255, 255, 255], black: [0, 0, 0] };
  if (named[v.toLowerCase()]) return named[v.toLowerCase()];
  return null;
}

// 배경 선언 값(단색 또는 gradient)에서 후보 hex 색 전부 추출
function extractColorCandidates(bgValue) {
  const hexes = bgValue.match(/#[0-9a-fA-F]{3,6}\b/g) || [];
  const candidates = hexes.map(parseColor).filter(Boolean);
  if (candidates.length === 0) {
    const solid = parseColor(bgValue);
    if (solid) candidates.push(solid);
  }
  return candidates;
}

function relLuminance([r, g, b]) {
  const lin = (c) => {
    const cs = c / 255;
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(rgb1, rgb2) {
  const l1 = relLuminance(rgb1);
  const l2 = relLuminance(rgb2);
  const [lighter, darker] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

function lastMatch(re, text) {
  let m;
  let last = null;
  while ((m = re.exec(text))) last = m;
  return last;
}

function main() {
  if (!fs.existsSync(THEME_DIR)) {
    console.error(`❌ theme/ 디렉토리 없음: ${THEME_DIR}`);
    process.exit(1);
  }

  const themes = fs.readdirSync(THEME_DIR).filter((d) => {
    if (d === '_shared') return false;
    return fs.existsSync(path.join(THEME_DIR, d, 'slide.css'));
  });

  console.log(`🔍 lint-license: ${themes.length}개 theme의 --m2-license-fg(뱃지 글자色) ↔ .reveal 배경 대비(WCAG 2.1) 검증 (기준 ${MIN_RATIO}:1)`);
  console.log('');

  let failures = 0;
  let unresolved = 0;

  for (const themeName of themes) {
    const cssPath = path.join(THEME_DIR, themeName, 'slide.css');
    const merged = expandImports(cssPath);

    const textMatch = lastMatch(/--m2-license-fg:\s*([^;]+);/g, merged);
    const revealBlocks = [];
    const blockRe = /\.reveal\s*\{([^}]*)\}/g;
    let bm;
    while ((bm = blockRe.exec(merged))) revealBlocks.push(bm[1]);
    let bgValue = null;
    for (const block of revealBlocks) {
      const bgm = lastMatch(/background(?:-color)?:\s*([^;]+);/g, block);
      if (bgm) bgValue = bgm[1];
    }

    if (!textMatch || !bgValue) {
      unresolved++;
      console.log(`🟡 ${themeName}: --m2-license-fg 또는 .reveal background 파싱 실패 — 수동 확인 필요`);
      continue;
    }

    const textRgb = parseColor(textMatch[1]);
    const bgCandidates = extractColorCandidates(bgValue);
    if (!textRgb || bgCandidates.length === 0) {
      unresolved++;
      console.log(`🟡 ${themeName}: 색상 리터럴 파싱 실패 (text="${textMatch[1].trim()}", bg="${bgValue.trim()}") — 수동 확인 필요`);
      continue;
    }

    // gradient 등 다중 후보 중 최악(가장 낮은 대비) 케이스로 판정
    let worstRatio = Infinity;
    for (const bgRgb of bgCandidates) {
      const ratio = contrastRatio(textRgb, bgRgb);
      if (ratio < worstRatio) worstRatio = ratio;
    }

    const pass = worstRatio >= MIN_RATIO;
    const mark = pass ? '✅' : '❌';
    console.log(`${mark} ${themeName}: contrast ${worstRatio.toFixed(2)}:1 (기준 ${MIN_RATIO}:1) — text=${textMatch[1].trim()} bg="${bgValue.trim()}"`);
    if (!pass) failures++;
  }

  console.log('');
  if (failures > 0) {
    console.error(`❌ ${failures}개 theme이 대비 기준(${MIN_RATIO}:1) 미달 — .m2-license-badge 및 전체 텍스트 가독성 위험`);
    process.exit(1);
  }
  if (unresolved > 0) {
    console.log(`⚠️ ${unresolved}개 theme 색상 파싱 불가 — 수동 확인 권장 (fail 아님)`);
  }
  console.log('✅ lint-license 통과');
  process.exit(0);
}

main();
