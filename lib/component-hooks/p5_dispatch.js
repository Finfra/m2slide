'use strict';

// p5_dispatch.js — p5.js instance mode 디스패처 (Issue207).
// component-libraries.yml 의 p5.init_hook 가 본 모듈을 지정.
//
// ```p5 fenced block 본문 = 사용자 sketch 코드.
//   인자: p (p5 인스턴스), el (컴포넌트 컨테이너 div).
//   권장 패턴 — el 컨테이너 크기에 맞춰 캔버스 생성:
//     p.setup = function() { p.createCanvas(el.clientWidth, el.clientHeight); };
//     p.draw  = function() { p.background(220); p.ellipse(p.mouseX, p.mouseY, 50, 50); };
//
// fitContainer(el): 슬라이드 영역 채우도록 컨테이너 width/height 강제 (model3d fitHeight 차용).
// 캔버스 CSS는 setup 직후 width/height 100% 강제 → 사용자가 고정 픽셀로 createCanvas해도
//   CSS 스케일로 늘어남 (다만 픽셀 보간으로 약간 흐려질 수 있어 권장 패턴 사용 권장).
// 활성 슬라이드 외부의 인스턴스는 noLoop()으로 일시정지 (CPU 절약).
// 슬라이드 재진입 시 loop() 재개. 사용자 코드는 슬라이드 콘텐츠로 신뢰 처리(d3·mermaid 와 동일).
// 설계 SSOT: _doc_arch/component-libraries.md, _doc_arch/component-slide-visual.md

exports.script = `
(function() {
  var instances = new WeakMap(); // el → p5 instance

  function fitContainer(el) {
    var parent = el.parentElement;
    if (parent && parent.clientHeight > 240) {
      el.style.height = (parent.clientHeight - 80) + 'px';
    }
    el.style.width = '100%';
    el.style.display = 'block';
  }

  function applyCanvasFit(el) {
    el.querySelectorAll('canvas').forEach(function(c) {
      c.style.width = '100%';
      c.style.height = '100%';
      c.style.display = 'block';
    });
  }

  function renderP5(el) {
    if (el.dataset.rendered) return;
    el.dataset.rendered = '1';
    if (typeof p5 === 'undefined') {
      el.innerHTML = '<div class="component-error">p5: 라이브러리 로드 실패</div>';
      return;
    }
    var code = (el.textContent || '').trim();
    el.textContent = '';
    fitContainer(el);
    try {
      var sketch = new Function('p', 'el', code);
      var inst = new p5(function(p) { sketch(p, el); }, el);
      instances.set(el, inst);
      // p5 setup이 동기 실행되어 canvas DOM이 다음 microtask엔 존재.
      queueMicrotask(function() { applyCanvasFit(el); });
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
      // 슬라이드 재진입 시 부모 영역이 갱신될 수 있으므로 fit 재적용.
      fitContainer(el);
      applyCanvasFit(el);
      var inst = instances.get(el);
      if (inst) {
        // Issue216: 컨테이너 크기 변동 시 캔버스 내부 픽셀 크기도 동기화
        // (고정 픽셀 createCanvas 패턴 + 사전 렌더된 캔버스 대응)
        if (typeof inst.resizeCanvas === 'function' && el.clientWidth > 0 && el.clientHeight > 0) {
          try { inst.resizeCanvas(el.clientWidth, el.clientHeight); } catch (e) { /* noop */ }
        }
        if (typeof inst.loop === 'function') inst.loop();
      }
    });
  }

  // Issue216: renderAll 제거 — 비활성 슬라이드(display:none/off-screen)에서
  // el.clientWidth/Height 가 0/부정확값 반환 → p.createCanvas(0,0) 으로 캔버스
  // 내부 픽셀 크기가 잘못 고정되는 문제. 현재 슬라이드만 즉시 렌더, 나머지는
  // resumeSlide 진입 시 lazy render.

  if (typeof Reveal !== 'undefined' && Reveal.on) {
    Reveal.on('ready', function() {
      var current = Reveal.getCurrentSlide && Reveal.getCurrentSlide();
      if (current) {
        current.querySelectorAll('div[data-component="p5"]').forEach(renderP5);
      }
    });
    Reveal.on('slidechanged', function(e) {
      pauseSlide(e.previousSlide);
      resumeSlide(e.currentSlide);
    });
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      document.querySelectorAll('div[data-component="p5"]').forEach(renderP5);
    });
  }
})();
`;
