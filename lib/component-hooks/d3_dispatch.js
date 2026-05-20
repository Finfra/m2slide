'use strict';

// d3_dispatch — d3 인포그래픽 렌더 클라이언트 훅 (Issue182 Phase 2).
// component-libraries.yml 의 d3.init_hook 가 본 모듈을 지정.
// d3 CDN 은 markmap 의존성으로 이미 무조건 로드됨 — 본 훅은 fenced 렌더만 담당.
//
// ```d3 fenced block 본문 = d3·el 인자를 받는 JS 코드.
//   el = 컴포넌트 컨테이너 div. 사용자 슬라이드 콘텐츠이므로 신뢰 (mermaid 와 동일 신뢰 수준).
//
// Issue183: 사용자 d3 코드는 흔히 고정 px width/height 의 viewBox 없는 SVG 를 만든다.
//   component 슬롯 CSS(.component-container > svg)는 SVG 요소를 슬라이드 영역에 맞춰 늘리는데,
//   viewBox 가 없으면 좌표계가 안 늘어나 콘텐츠가 좌상단에 작게 고정된다.
//   → 렌더 후 viewBox 없는 SVG 에 width/height attr 기반 viewBox 를 주입하고
//      고정 width/height attr 을 제거해 CSS 가 비례 확대하도록 한다.
// 설계 SSOT: _doc_arch/component-libraries.md

const script = [
  '(function(){',
  '  function fitSvg(el){',
  '    var svg = el.querySelector("svg");',
  '    if (!svg || svg.getAttribute("viewBox")) return;',
  '    var vw = parseFloat(svg.getAttribute("width")) || svg.clientWidth || 480;',
  '    var vh = parseFloat(svg.getAttribute("height")) || svg.clientHeight || 270;',
  '    svg.setAttribute("viewBox", "0 0 " + vw + " " + vh);',
  '    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");',
  '    svg.removeAttribute("width");',
  '    svg.removeAttribute("height");',
  '  }',
  '  function render(){',
  '    if (typeof d3 === "undefined") return;',
  '    document.querySelectorAll("div[data-component=\\"d3\\"]").forEach(function(el){',
  '      if (el.getAttribute("data-rendered")) return;',
  '      var code = (el.textContent || "").trim();',
  '      el.textContent = "";',
  '      el.setAttribute("data-rendered", "1");',
  '      try { new Function("d3", "el", code)(d3, el); fitSvg(el); }',
  '      catch(e){ el.innerHTML = "<div class=\\"component-error\\">d3 렌더 실패: " + e.message + "</div>"; }',
  '    });',
  '  }',
  '  if (window.Reveal && Reveal.on) Reveal.on("ready", render);',
  '  else document.addEventListener("DOMContentLoaded", render);',
  '})();',
].join('\n');

module.exports = { script };
