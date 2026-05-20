'use strict';

// katex_autorender — KaTeX auto-render 클라이언트 초기화 훅 (Issue181 Phase 1).
// component-libraries.yml 의 katex.init_hook 가 본 모듈을 지정.
// reveal.js ready 후 document.body 의 수식 델리미터를 렌더.
//
// 델리미터: 블록 $$…$$ / 인라인 \(…\) / 블록 \[…\] — 단일 $ 는 미사용 (통화·셸 변수 충돌 회피).
// 설계 SSOT: _doc_arch/component-libraries.md

// 배열-join 으로 작성 — 템플릿 리터럴 중첩 이스케이프 회피.
// 단일따옴표 문자열에서 '\\\\(' → 문자열값 '\\(' → 브라우저 JS 가 '\\(' 를 \( 로 해석.
const script = [
  '(function(){',
  '  function render(){',
  '    if (typeof renderMathInElement !== "function") return;',
  '    try {',
  '      renderMathInElement(document.body, {',
  '        delimiters: [',
  '          {left:"$$",right:"$$",display:true},',
  '          {left:"\\\\(",right:"\\\\)",display:false},',
  '          {left:"\\\\[",right:"\\\\]",display:true}',
  '        ],',
  '        throwOnError:false',
  '      });',
  '    } catch(e) { console.error("[katex] render 실패:", e); }',
  '  }',
  '  if (window.Reveal && Reveal.on) Reveal.on("ready", render);',
  '  else document.addEventListener("DOMContentLoaded", render);',
  '})();',
].join('\n');

module.exports = { script };
