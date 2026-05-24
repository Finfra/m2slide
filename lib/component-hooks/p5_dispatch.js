'use strict';

// p5_dispatch.js — p5.js instance mode 디스패처 (Issue207).
// component-libraries.yml 의 p5.init_hook 가 본 모듈을 지정.
//
// ```p5 fenced block 본문 = 사용자 sketch 코드.
//   인자: p (p5 인스턴스), el (컴포넌트 컨테이너 div).
//   사용 예:
//     p.setup = function() { p.createCanvas(400, 400); };
//     p.draw  = function() { p.background(220); p.ellipse(p.mouseX, p.mouseY, 50, 50); };
//
// 활성 슬라이드 외부의 인스턴스는 noLoop()으로 일시정지 (CPU 절약).
// 슬라이드 재진입 시 loop() 재개. 사용자 코드는 슬라이드 콘텐츠로 신뢰 처리(d3·mermaid 와 동일).
// 설계 SSOT: _doc_arch/component-libraries.md, _doc_arch/component-slide-visual.md

exports.script = `
(function() {
  var instances = new WeakMap(); // el → p5 instance

  function renderP5(el) {
    if (el.dataset.rendered) return;
    el.dataset.rendered = '1';
    if (typeof p5 === 'undefined') {
      el.innerHTML = '<div class="component-error">p5: 라이브러리 로드 실패</div>';
      return;
    }
    var code = (el.textContent || '').trim();
    el.textContent = '';
    try {
      var sketch = new Function('p', 'el', code);
      var inst = new p5(function(p) { sketch(p, el); }, el);
      instances.set(el, inst);
    } catch (e) {
      el.innerHTML = '<div class="component-error">p5 렌더 실패: ' + e.message + '</div>';
    }
  }

  function pauseSlide(slide) {
    if (!slide) return;
    slide.querySelectorAll('div[data-component="p5"]').forEach(function(el) {
      var inst = instances.get(el);
      if (inst && typeof inst.noLoop === 'function') inst.noLoop();
    });
  }

  function resumeSlide(slide) {
    if (!slide) return;
    slide.querySelectorAll('div[data-component="p5"]').forEach(function(el) {
      if (!el.dataset.rendered) renderP5(el);
      var inst = instances.get(el);
      if (inst && typeof inst.loop === 'function') inst.loop();
    });
  }

  function renderAll() {
    document.querySelectorAll('div[data-component="p5"]').forEach(renderP5);
  }

  if (typeof Reveal !== 'undefined' && Reveal.on) {
    Reveal.on('ready', function() {
      renderAll();
      // ready 직후엔 현재 슬라이드 외 전부 일시정지
      var current = Reveal.getCurrentSlide && Reveal.getCurrentSlide();
      document.querySelectorAll('section').forEach(function(s) {
        if (s !== current) pauseSlide(s);
      });
    });
    Reveal.on('slidechanged', function(e) {
      pauseSlide(e.previousSlide);
      resumeSlide(e.currentSlide);
    });
  } else {
    document.addEventListener('DOMContentLoaded', renderAll);
  }
})();
`;
