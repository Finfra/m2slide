'use strict';
// lib/vendor-rewrite.js — 빌드 후처리 (Issue270)
//
// 산출물 slide/ 하위 vendor 자산 복사 + HTML·CSS 의 CDN URL → ./vendor 상대경로 치환.
// 오프라인 self-contained 배포용. assetMode='vendor' 일 때 generate-slides.js 마지막에 호출.
//
// - lib/vendor/ 부재 시 자동 skip (경고 후 CDN 유지) → 회귀 0 보증.
// - 파일 깊이별 상대 prefix 계산 (slide/*.html → ./vendor/, slide/css/*.css → ../vendor/).

const fs = require('fs');
const path = require('path');
const { ALL } = require('./asset-manifest');

const VENDOR_SRC = path.join(__dirname, 'vendor'); // lib/vendor

// slideRoot 기준 파일 위치 깊이에 맞춘 vendor 상대 prefix
function relPrefix(fileAbs, slideRoot) {
  const rel = path.relative(slideRoot, path.dirname(fileAbs));
  const depth = (rel === '' || rel === '.') ? 0 : rel.split(path.sep).length;
  return depth === 0 ? './vendor/' : '../'.repeat(depth) + 'vendor/';
}

function rewriteText(content, prefix) {
  let out = content;
  for (const e of ALL) {
    if (out.includes(e.url)) out = out.split(e.url).join(prefix + e.local);
  }
  return out;
}

// vendor 존재 여부 (fetch-vendor 실행 여부)
function vendorAvailable() {
  return fs.existsSync(VENDOR_SRC) && fs.existsSync(path.join(VENDOR_SRC, 'reveal.js@5.0.4'));
}

// slideRoot(=outputDir) 하위 vendor 복사 + 모든 html/css 치환
function applyVendor(slideRoot) {
  if (!vendorAvailable()) {
    console.warn('⚠️ lib/vendor 미존재 — vendor 치환 skip (CDN 유지). `node lib/vendor/fetch-vendor.js` 로 자산 다운로드.');
    return false;
  }
  const dest = path.join(slideRoot, 'vendor');
  if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
  // fetch-vendor.js(다운로드 스크립트)는 산출물에 불필요 — 복사 제외
  fs.cpSync(VENDOR_SRC, dest, { recursive: true, filter: (src) => path.basename(src) !== 'fetch-vendor.js' });

  let count = 0;
  function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      if (name === 'vendor') continue; // 복사한 vendor 자체는 치환 대상 아님
      const p = path.join(dir, name);
      const st = fs.statSync(p);
      if (st.isDirectory()) { walk(p); continue; }
      if (!/\.(html|css)$/i.test(name)) continue;
      const before = fs.readFileSync(p, 'utf-8');
      const after = rewriteText(before, relPrefix(p, slideRoot));
      if (after !== before) { fs.writeFileSync(p, after, 'utf-8'); count++; }
    }
  }
  walk(slideRoot);
  console.log(`✅ vendor 치환: ${count}개 파일 → ./vendor (${dest})`);
  return true;
}

module.exports = { applyVendor, vendorAvailable };
