'use strict';

// chart_dispatch — Chart.js 렌더 클라이언트 훅 (Issue181 Phase 1).
// component-libraries.yml 의 chartjs.init_hook 가 본 모듈을 지정.
// reveal.js ready 후 div[data-component="chart"] 의 textContent(JSON config)를
// 파싱하여 <canvas> 에 Chart.js 차트를 렌더.
//
// 저작 문법: ```chart fenced block 본문 = Chart.js config JSON.
// 설계 SSOT: _doc_arch/component-libraries.md

const script = [
  '(function(){',
  '  function render(){',
  '    if (typeof Chart !== "function") return;',
  '    document.querySelectorAll("div[data-component=\\"chart\\"]").forEach(function(el){',
  '      if (el.querySelector("canvas")) return;',
  '      var cfg;',
  '      try { cfg = JSON.parse((el.textContent || "").trim()); }',
  '      catch(e){ el.innerHTML = "<div class=\\"component-error\\">chart config JSON 파싱 실패</div>"; return; }',
  '      el.textContent = "";',
  '      var canvas = document.createElement("canvas");',
  '      el.appendChild(canvas);',
  '      try { new Chart(canvas, cfg); }',
  '      catch(e){ el.innerHTML = "<div class=\\"component-error\\">chart 렌더 실패: " + e.message + "</div>"; }',
  '    });',
  '  }',
  '  if (window.Reveal && Reveal.on) Reveal.on("ready", render);',
  '  else document.addEventListener("DOMContentLoaded", render);',
  '})();',
].join('\n');

module.exports = { script };
