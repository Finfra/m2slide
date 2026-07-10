'use strict';
// lib/asset-manifest.js — vendor 자산 SSOT (Issue270)
//
// 빌드 산출물(slide/*.html)이 참조하는 CDN 자산의 원본 URL ↔ lib/vendor/ 로컬 경로 매핑.
// 소비처:
//   - lib/vendor/fetch-vendor.js  : manifest 순회하여 lib/vendor/ 로 다운로드
//   - lib/vendor-rewrite.js       : 빌드 후처리 — 산출 HTML 의 CDN URL → ./vendor/<local> 치환
//
// local: lib/vendor/ 기준 상대경로. slide/vendor/ 로 그대로 복사되므로 산출물에서 ./vendor/<local> 로 참조.
// fontCss: CSS 내부에 상대 url()(폰트 파일)이 있어 디렉토리 미러가 필요한 항목 (fetch-vendor 가 동일 디렉토리에 중첩 자산 다운로드)
// googleFont: fonts.googleapis.com css2 — 반환 CSS 내부 @font-face src 가 절대 gstatic URL. fetch-vendor 가 css 다운로드 + woff2 미러 + 절대→상대 치환

// Core — 모든 데크가 로드 (오프라인 필수)
const CORE = [
  { url: 'https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/dist/reveal.js',                local: 'reveal.js@5.0.4/dist/reveal.js' },
  { url: 'https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/dist/reveal.css',               local: 'reveal.js@5.0.4/dist/reveal.css' },
  { url: 'https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/dist/reset.css',                local: 'reveal.js@5.0.4/dist/reset.css' },
  { url: 'https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/plugin/markdown/markdown.js',   local: 'reveal.js@5.0.4/plugin/markdown/markdown.js' },
  { url: 'https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/plugin/highlight/highlight.js', local: 'reveal.js@5.0.4/plugin/highlight/highlight.js' },
  { url: 'https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/plugin/notes/notes.js',         local: 'reveal.js@5.0.4/plugin/notes/notes.js' },
  { url: 'https://cdn.jsdelivr.net/npm/markmap-view@0.18.12/dist/browser/index.js',    local: 'markmap-view@0.18.12/dist/browser/index.js' },
  { url: 'https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js',                       local: 'd3@7.9.0/dist/d3.min.js' },
  { url: 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js',                local: 'mermaid@11/dist/mermaid.min.js' },
  { url: 'https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github.css',         local: 'highlight.js@11.9.0/styles/github.css' },
  { url: 'https://cdn.jsdelivr.net/npm/d2coding@1.3.2/d2coding-full.css',              local: 'd2coding@1.3.2/d2coding-full.css', fontCss: true },
  { url: 'https://unpkg.com/open-props',                                               local: 'open-props/open-props.css' },
  { url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansBold.woff', local: 'gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansBold.woff' },
  { url: 'https://fonts.googleapis.com/css2?family=Nanum+Gothic+Coding&display=swap',  local: 'fonts/nanum-gothic-coding.css', googleFont: true },
];

// Component — 데크별 opt-in (해당 컴포넌트 사용 시에만 로드). manifest 에 두어 후처리 치환·오프라인 동작 커버.
const COMPONENT = [
  { url: 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css',                    local: 'katex@0.16.11/dist/katex.min.css', fontCss: true },
  { url: 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js',                     local: 'katex@0.16.11/dist/katex.min.js' },
  { url: 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js',       local: 'katex@0.16.11/dist/contrib/auto-render.min.js' },
  { url: 'https://cdn.jsdelivr.net/npm/chart.js@4.4.6/dist/chart.umd.min.js',                local: 'chart.js@4.4.6/dist/chart.umd.min.js' },
  { url: 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.6.0/css/all.min.css', local: 'fontawesome-free@6.6.0/css/all.min.css', fontCss: true },
  { url: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css',                       local: 'leaflet@1.9.4/dist/leaflet.css', fontCss: true },
  { url: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js',                        local: 'leaflet@1.9.4/dist/leaflet.js' },
  { url: 'https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js',            local: 'react@18.3.1/umd/react.production.min.js' },
  { url: 'https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js',    local: 'react-dom@18.3.1/umd/react-dom.production.min.js' },
  { url: 'https://cdn.jsdelivr.net/npm/@babel/standalone@7.26.4/babel.min.js',               local: 'babel-standalone@7.26.4/babel.min.js' },
  { url: 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js',     local: 'model-viewer@3.5.0/model-viewer.min.js' },
  { url: 'https://cdn.jsdelivr.net/npm/p5@1.11.2/lib/p5.min.js',                              local: 'p5@1.11.2/lib/p5.min.js' },
];

const ALL = CORE.concat(COMPONENT);

module.exports = { CORE, COMPONENT, ALL };
