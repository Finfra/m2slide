'use strict';

// lib/component-hooks/ — 시각화 라이브러리별 클라이언트 초기화 스니펫.
//
// 각 훅 파일: lib/component-hooks/<initHookId>.js
//   module.exports = { script: '<클라이언트 JS 문자열>' }
//   <initHookId>는 data/component-libraries.yml 의 init_hook 필드 값.
//
// 디스패처(html-builder.js)가 status: applied 라이브러리의 init_hook 을
// resolveHook() 로 조회 → 반환된 script 를 인라인 <script> 로 출력 HTML 에 삽입.
//
// Phase 0: 코어 5종 모두 status: planned → 훅 파일 미존재. resolveHook 은 '' 반환.
// Phase 1~2: katex_autorender.js / chart_dispatch.js / map_dispatch.js / d3_dispatch.js 추가.
//
// 설계 SSOT: _doc_arch/component-libraries.md

const fs = require('fs');
const path = require('path');

// initHookId → 훅 스크립트 문자열. 미존재·로드 실패 시 '' (graceful).
function resolveHook(initHookId) {
  if (!initHookId || typeof initHookId !== 'string') return '';
  const hookPath = path.join(__dirname, `${initHookId}.js`);
  if (!fs.existsSync(hookPath)) return '';
  try {
    const mod = require(hookPath);
    if (mod && typeof mod.script === 'string') return mod.script;
    return '';
  } catch (e) {
    console.warn(`[component-hooks] 훅 로드 실패: ${initHookId} — ${e.message}`);
    return '';
  }
}

module.exports = { resolveHook };
