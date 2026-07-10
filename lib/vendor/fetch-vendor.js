#!/usr/bin/env node
'use strict';
// lib/vendor/fetch-vendor.js — vendor 자산 다운로드 (Issue270)
//
// asset-manifest.js 의 URL 을 lib/vendor/ 로 다운로드. 오프라인 self-contained 배포용.
// 폰트 CSS(fontCss)는 내부 상대 url() 자산을 동일 디렉토리에 미러.
// google font(googleFont)는 css2 응답 + gstatic woff2 미러 + 절대→상대 치환.
//
// 사용:
//   node lib/vendor/fetch-vendor.js            # core+component 전체
//   node lib/vendor/fetch-vendor.js --core     # core 만
//
// 재실행 안전(idempotent) — 이미 있으면 다시 받되 덮어씀. 실패 항목은 경고 후 계속.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { CORE, COMPONENT } = require('../asset-manifest');

const VENDOR_DIR = __dirname; // lib/vendor
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

function curl(url, destPath, extraHeaders) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  const args = ['-fsSL', '--max-time', '60', '-o', destPath];
  if (extraHeaders) for (const h of extraHeaders) args.push('-H', h);
  args.push(url);
  execFileSync('curl', args, { stdio: ['ignore', 'ignore', 'pipe'] });
}

// CSS 내부 url(...) 추출 (data: 제외)
function extractCssUrls(css) {
  const out = [];
  const re = /url\(\s*['"]?([^'")]+?)['"]?\s*\)/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    const u = m[1].trim();
    if (u && !u.startsWith('data:')) out.push(u);
  }
  return out;
}

// URL 의 디렉토리 부분 (마지막 / 까지)
function urlDir(u) { return u.slice(0, u.lastIndexOf('/') + 1); }

let ok = 0, fail = 0;
const failed = [];

function fetchEntry(e) {
  const dest = path.join(VENDOR_DIR, e.local);
  try {
    if (e.googleFont) {
      // css2 — 모던 UA 로 woff2 @font-face 응답 획득
      curl(e.url, dest, ['User-Agent: ' + UA]);
      let css = fs.readFileSync(dest, 'utf-8');
      const destDir = path.dirname(dest);
      const gDir = path.join(destDir, '_g');
      const refs = extractCssUrls(css).filter(u => /^https?:/i.test(u));
      for (const ref of refs) {
        const base = path.basename(ref.split('?')[0]);
        const localRef = path.join(gDir, base);
        try {
          curl(ref, localRef);
          css = css.split(ref).join('_g/' + base);
        } catch (err) { console.warn(`  ⚠️ nested google font 실패: ${ref}`); }
      }
      fs.writeFileSync(dest, css, 'utf-8');
    } else if (e.fontCss) {
      curl(e.url, dest);
      let css = fs.readFileSync(dest, 'utf-8');
      const base = urlDir(e.url); // CDN css 디렉토리
      const destDir = path.dirname(dest);
      let changed = false;
      for (const ref of extractCssUrls(css)) {
        if (/^https?:/i.test(ref)) {
          // 절대 url — _ext/ 로 미러
          const bn = path.basename(ref.split('?')[0]);
          try { curl(ref, path.join(destDir, '_ext', bn)); css = css.split(ref).join('_ext/' + bn); changed = true; }
          catch (err) { console.warn(`  ⚠️ nested 절대 자산 실패: ${ref}`); }
        } else {
          // 상대 url — 동일 트리에 미러 (css 는 상대 그대로 유지)
          const clean = ref.split('?')[0].split('#')[0];
          const absRef = base + clean;
          try { curl(absRef, path.join(destDir, clean)); }
          catch (err) { console.warn(`  ⚠️ nested 상대 자산 실패: ${absRef}`); }
        }
      }
      if (changed) fs.writeFileSync(dest, css, 'utf-8');
    } else {
      curl(e.url, dest);
    }
    ok++;
    console.log(`  ✅ ${e.local}`);
  } catch (err) {
    fail++;
    failed.push(e.local + ' ← ' + e.url);
    console.warn(`  ❌ ${e.local} (${e.url}) — ${err.message.split('\n')[0]}`);
  }
}

// .ttf 제거 — @font-face 는 woff2 우선, woff fallback 이면 충분(전 브라우저 지원).
//   woff2 있는데 브라우저가 ttf 요청하지 않으므로 삭제해도 404 미발생. repo 용량 절감.
function pruneTtf(dir) {
  let n = 0;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) n += pruneTtf(p);
    else if (name.toLowerCase().endsWith('.ttf')) { fs.unlinkSync(p); n++; }
  }
  return n;
}

const coreOnly = process.argv.includes('--core');
const list = coreOnly ? CORE : CORE.concat(COMPONENT);
console.log(`vendor 다운로드 시작 (${list.length}개, ${coreOnly ? 'core만' : 'core+component'}) → ${VENDOR_DIR}`);
for (const e of list) fetchEntry(e);
const pruned = pruneTtf(VENDOR_DIR);
if (pruned) console.log(`🧹 .ttf ${pruned}개 제거 (woff2/woff 유지)`);
console.log(`\n완료: 성공 ${ok}, 실패 ${fail}`);
if (failed.length) { console.log('실패 목록:'); failed.forEach(f => console.log('  - ' + f)); process.exitCode = 1; }
