'use strict';

// map_dispatch — Leaflet 지도 렌더 클라이언트 훅 (Issue182 Phase 2).
// component-libraries.yml 의 leaflet.init_hook 가 본 모듈을 지정.
// ```map fenced block 본문 = JSON:
//   { "center": [lat, lng], "zoom": N, "markers": [{ "coords": [lat,lng], "popup": "텍스트" }] }
// 타일: OpenStreetMap (서브도메인 없는 현행 URL). 설계 SSOT: _doc_arch/component-libraries.md
//
// 처리 주의:
//   - reveal.js 는 비현재 슬라이드를 display:none 으로 숨김 → ready 시점 컨테이너 크기 0.
//     slidechanged 마다 fitHeight + invalidateSize() 로 보정.
//   - Issue183: component 슬롯(.component-container) 사용 — diagram 슬롯(.media-container)과
//     분리되어 .media-container img 룰이 Leaflet 타일 <img> 에 적용되지 않는다.
//     (이전 classList.remove("media-container") 해킹은 슬롯 분리로 불필요해져 제거.)
//   - 높이는 부모 컨테이너(contents-body 등)를 채우도록 fitHeight 로 계산 (고정 420px 은 fallback).

const script = [
  '(function(){',
  '  var maps = [];',
  '  function fitHeight(el){',
  '    var ph = (el.parentElement && el.parentElement.clientHeight) || 0;',
  '    if (ph > 240) el.style.height = ph + "px";',
  '    else if (!el.style.height) el.style.height = "420px";',
  '  }',
  '  function renderAll(){',
  '    if (typeof L === "undefined") return;',
  '    document.querySelectorAll("div[data-component=\\"map\\"]").forEach(function(el){',
  '      if (el.getAttribute("data-rendered")) return;',
  '      var cfg;',
  '      try { cfg = JSON.parse((el.textContent || "").trim()); }',
  '      catch(e){ el.innerHTML = "<div class=\\"component-error\\">map config JSON 파싱 실패</div>"; return; }',
  '      el.textContent = "";',
  '      el.setAttribute("data-rendered", "1");',
  '      fitHeight(el);',
  '      try {',
  '        var map = L.map(el).setView(cfg.center || [0,0], cfg.zoom || 2);',
  '        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {',
  '          attribution: "\\u00a9 OpenStreetMap", maxZoom: 19',
  '        }).addTo(map);',
  '        (cfg.markers || []).forEach(function(m){',
  '          var mk = L.marker(m.coords).addTo(map);',
  '          if (m.popup) mk.bindPopup(m.popup);',
  '        });',
  '        maps.push(map);',
  '      } catch(e){ el.innerHTML = "<div class=\\"component-error\\">map 렌더 실패: " + e.message + "</div>"; }',
  '    });',
  '  }',
  '  function refresh(){',
  '    maps.forEach(function(m){',
  '      try { fitHeight(m.getContainer()); m.invalidateSize(); } catch(e){}',
  '    });',
  '  }',
  '  if (window.Reveal && Reveal.on) {',
  '    Reveal.on("ready", function(){ renderAll(); setTimeout(refresh, 120); });',
  '    Reveal.on("slidechanged", function(){ setTimeout(refresh, 120); });',
  '  } else {',
  '    document.addEventListener("DOMContentLoaded", renderAll);',
  '  }',
  '})();',
].join('\n');

module.exports = { script };
