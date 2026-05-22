'use strict';

// model3d_dispatch.js — model-viewer 웹컴포넌트 초기화 훅 (Issue206)
// JSON config → <model-viewer> 속성 매핑. model-viewer는 웹컴포넌트라 JS 최소.
exports.script = `
(function() {
  function renderModel3d(el) {
    if (el.dataset.rendered) return;
    el.dataset.rendered = '1';

    let config;
    try {
      config = JSON.parse(el.textContent.trim());
    } catch (e) {
      el.innerHTML = '<div class="component-error">model3d: JSON 파싱 오류 — ' + e.message + '</div>';
      return;
    }

    if (!config.src) {
      el.innerHTML = '<div class="component-error">model3d: src 필드 없음 (GLB/GLTF 경로 필수)</div>';
      return;
    }

    const viewer = document.createElement('model-viewer');
    viewer.setAttribute('src', config.src);
    viewer.setAttribute('alt', config.alt || '3D 모델');
    viewer.setAttribute('camera-controls', '');
    viewer.setAttribute('touch-action', 'pan-y');

    if (config.poster)             viewer.setAttribute('poster', config.poster);
    if (config.ar)                 viewer.setAttribute('ar', '');
    if (config.autoRotate)         viewer.setAttribute('auto-rotate', '');
    if (config.rotationPerSecond)  viewer.setAttribute('rotation-per-second', config.rotationPerSecond);
    if (config.fieldOfView)        viewer.setAttribute('field-of-view', config.fieldOfView);
    if (config.minCameraOrbit)     viewer.setAttribute('min-camera-orbit', config.minCameraOrbit);
    if (config.maxCameraOrbit)     viewer.setAttribute('max-camera-orbit', config.maxCameraOrbit);
    if (config.backgroundColor)    viewer.style.backgroundColor = config.backgroundColor;

    viewer.style.width  = '100%';
    viewer.style.height = config.height || '400px';

    // GLB 로딩 실패 시 error 이벤트 → component-error 표시
    viewer.addEventListener('error', function(e) {
      el.innerHTML = '<div class="component-error">model3d: GLB 로딩 실패 — ' + config.src + ' (파일 없음 또는 형식 오류)</div>';
    });

    el.textContent = '';
    el.appendChild(viewer);
  }

  function fitHeight(el) {
    const parent = el.parentElement;
    if (parent && parent.clientHeight > 240) {
      const h = (parent.clientHeight - 80) + 'px';
      el.style.height = h;
      const v = el.querySelector('model-viewer');
      if (v) v.style.height = h;
    }
  }

  function renderAll() {
    document.querySelectorAll('div[data-component="model3d"]').forEach(function(el) {
      renderModel3d(el);
      fitHeight(el);
    });
  }

  if (typeof Reveal !== 'undefined') {
    Reveal.on('ready', renderAll);
    Reveal.on('slidechanged', function(e) {
      e.currentSlide.querySelectorAll('div[data-component="model3d"]').forEach(function(el) {
        if (!el.dataset.rendered) renderModel3d(el);
        fitHeight(el);
      });
    });
  } else {
    document.addEventListener('DOMContentLoaded', renderAll);
  }
})();
`;
