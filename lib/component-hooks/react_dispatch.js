'use strict';

// react_dispatch — React artifact 렌더 클라이언트 훅 (Issue184).
// component-libraries.yml 의 react.init_hook 가 본 모듈을 지정.
//
// ```react fenced block 본문 = JSX 컴포넌트 코드.
//   Babel-standalone 가 브라우저에서 JSX → JS 변환 (빌드 의존성 0 유지).
//   변환 후 React·ReactDOM·el·render 4개를 인자로 받는 함수로 실행.
//   el     = 컴포넌트 컨테이너 div
//   render = (element) => 해당 el 에 React 트리 마운트 (ReactDOM.createRoot 래퍼)
//   사용자 슬라이드 콘텐츠이므로 신뢰 (d3·mermaid 와 동일 신뢰 수준).
//
// CDN 3종(react·react-dom·@babel/standalone)은 conditional 주입 — 본 훅 <script>
//   앞에 동기 <script src> 로 로드되므로 ready 시점엔 전역 React/ReactDOM/Babel 보장.
// 설계 SSOT: _doc_arch/component-libraries.md

const script = [
  '(function(){',
  '  function render(){',
  '    if (typeof React === "undefined" || typeof ReactDOM === "undefined" || typeof Babel === "undefined") return;',
  '    document.querySelectorAll("div[data-component=\\"react\\"]").forEach(function(el){',
  '      if (el.getAttribute("data-rendered")) return;',
  '      var code = (el.textContent || "").trim();',
  '      el.textContent = "";',
  '      el.setAttribute("data-rendered", "1");',
  '      try {',
  '        var js = Babel.transform(code, { presets: ["react"] }).code;',
  '        var mount = function(element){ ReactDOM.createRoot(el).render(element); };',
  '        new Function("React", "ReactDOM", "el", "render", js)(React, ReactDOM, el, mount);',
  '      } catch(e){',
  '        el.innerHTML = "<div class=\\"component-error\\">React 렌더 실패: " + e.message + "</div>";',
  '      }',
  '    });',
  '  }',
  '  if (window.Reveal && Reveal.on) Reveal.on("ready", render);',
  '  else document.addEventListener("DOMContentLoaded", render);',
  '})();',
].join('\n');

module.exports = { script };
