'use strict';

// Issue423: 이미지 URL 해소 — 「짝 조회」 단일 지점 (prj7 cg-image-pipeline ③)
//   `![](shot.png)`       → 옆에 `shot.annot.png` 가 있으면 그것을 쓴다
//   `![](shot.png){raw}`  → 원본 강제 (짝이 있어도 shot.png)
//   `![](shot.annot.png)` → 그대로
// m2slide 는 img-annotate 를 부르지 않는다 — 이미 있는 `--flatten` 산출(.annot.png)을 집기만 한다.
// `.annot.svg`(기본 산출)는 대상이 아니다. {raw} 는 이미지 원본 강제 전용 토큰(Issue419 의 raw HTML 옵트인과 무관).
// 존재 판정 기준 = **원고 쪽 소스 디렉토리**(baseDirs: 프로젝트 루트·markdown/). 빌드 slide/img/ 복사본은
//   소스의 병합 복사라 소스가 SSOT 다([decisions.md] img/ 이중 복사).

const fs = require('fs');
const path = require('path');

const RAW_SUFFIX = /\{raw\}\s*$/;
const PNG_NON_ANNOT = /^(.*?)(?<!\.annot)\.png$/i;

function resolveImageUrl(url, baseDirs) {
  let raw = false;
  let u = url;
  if (RAW_SUFFIX.test(u)) { raw = true; u = u.replace(RAW_SUFFIX, ''); }
  if (raw || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(u)) return { url: u, raw };
  const m = u.match(PNG_NON_ANNOT);
  if (!m) return { url: u, raw };
  const paired = `${m[1]}.annot.png`;
  const rel = paired.replace(/^\.\//, '');
  const hit = (baseDirs || []).filter(Boolean).some(d => {
    try { return fs.statSync(path.resolve(d, rel)).isFile(); } catch (_) { return false; }
  });
  return { url: hit ? paired : u, raw };
}

module.exports = { resolveImageUrl };
