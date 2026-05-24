'use strict';

// Issue180 Phase 0: 컴포넌트 라이브러리 레지스트리 + generic fenced 디스패처 테스트
// 실행: node --test lib/__tests__/component-libraries.test.js

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadRegistry, parseRegistry, buildComponentInjections } = require('../component-registry');
const { convertMarkdownToHTML } = require('../markdown');

// ── 그룹 1: 레지스트리 스키마 ────────────────────────────────────────────────
test('registry: data/component-libraries.yml 로드 + 필수 키 유효', () => {
  const reg = loadRegistry({ fresh: true });
  assert.strictEqual(reg.version, 1);
  assert.ok(Array.isArray(reg.libraries));
  assert.ok(reg.libraries.length >= 8, '라이브러리 8종 이상');
  for (const lib of reg.libraries) {
    assert.ok(typeof lib.id === 'string' && lib.id, `id 누락: ${JSON.stringify(lib)}`);
    assert.ok(['conditional', 'unconditional'].includes(lib.injection), `injection 부정: ${lib.id}`);
    assert.ok(['planned', 'applied'].includes(lib.status), `status 부정: ${lib.id}`);
    assert.ok(Array.isArray(lib.cdn), `cdn 배열 아님: ${lib.id}`);
    assert.ok(Array.isArray(lib.detect_fenced_lang), `detect_fenced_lang 배열 아님: ${lib.id}`);
    assert.ok(Array.isArray(lib.detect_inline), `detect_inline 배열 아님: ${lib.id}`);
  }
});

test('registry: 코어 5종(katex·chartjs·fontawesome·leaflet·d3) 등재', () => {
  const reg = loadRegistry({ fresh: true });
  const ids = reg.libraries.map((l) => l.id);
  for (const id of ['katex', 'chartjs', 'fontawesome', 'leaflet', 'd3']) {
    assert.ok(ids.includes(id), `코어 라이브러리 누락: ${id}`);
  }
});

test('registry: 블록 스타일 파서 — cdn 맵 + detect 리스트 + 이스케이프', () => {
  const reg = loadRegistry({ fresh: true });
  const katex = reg.libraries.find((l) => l.id === 'katex');
  assert.strictEqual(katex.cdn.length, 3);
  assert.strictEqual(katex.cdn[0].type, 'css');
  assert.ok(katex.cdn[0].url.startsWith('https://'));
  assert.deepStrictEqual(katex.detect_inline, ['$$', '\\(']); // "\\(" → \(
});

test('parseRegistry: null·정수·빈 리스트 스칼라 파싱', () => {
  const reg = parseRegistry([
    'version: 1',
    'libraries:',
    '  - id: x',
    '    stage: 5',
    '    injection: conditional',
    '    status: planned',
    '    init_hook: null',
    '    cdn: []',
    '    detect_fenced_lang: []',
    '    detect_inline: []',
  ].join('\n'));
  const x = reg.libraries[0];
  assert.strictEqual(x.stage, 5);
  assert.strictEqual(x.init_hook, null);
  assert.deepStrictEqual(x.cdn, []);
  assert.deepStrictEqual(x.detect_fenced_lang, []);
});

// ── 그룹 2: 조건 주입 ────────────────────────────────────────────────────────
test('injection: Phase 0 — 코어 5종 planned → 빈 주입 (출력 HTML 회귀 0)', () => {
  const inj = buildComponentInjections('<section>아무 콘텐츠</section>');
  assert.strictEqual(inj.headHtml, '');
  assert.strictEqual(inj.bodyHtml, '');
});

test('injection: applied conditional + detect 매칭 → 주입 / 미매칭 → 미주입', () => {
  const reg = parseRegistry([
    'version: 1',
    'libraries:',
    '  - id: chartjs',
    '    injection: conditional',
    '    status: applied',
    '    init_hook: null',
    '    cdn:',
    '      - type: js',
    '        url: https://example.com/chart.js',
    '    detect_fenced_lang:',
    '      - "chart"',
    '    detect_inline: []',
  ].join('\n'));
  const hit = buildComponentInjections('<div data-component="chart"></div>', reg);
  assert.ok(hit.bodyHtml.includes('https://example.com/chart.js'), '매칭 시 주입');
  const miss = buildComponentInjections('<div>차트 없음</div>', reg);
  assert.strictEqual(miss.bodyHtml, '', '미매칭 시 미주입');
});

test('injection: planned conditional → detect 매칭돼도 미주입', () => {
  const reg = parseRegistry([
    'version: 1',
    'libraries:',
    '  - id: chartjs',
    '    injection: conditional',
    '    status: planned',
    '    init_hook: null',
    '    cdn:',
    '      - type: js',
    '        url: https://example.com/chart.js',
    '    detect_fenced_lang:',
    '      - "chart"',
    '    detect_inline: []',
  ].join('\n'));
  const inj = buildComponentInjections('<div data-component="chart"></div>', reg);
  assert.strictEqual(inj.bodyHtml, '');
});

test('injection: css → headHtml(<link>), js → bodyHtml(<script>)', () => {
  const reg = parseRegistry([
    'version: 1',
    'libraries:',
    '  - id: katex',
    '    injection: conditional',
    '    status: applied',
    '    init_hook: null',
    '    cdn:',
    '      - type: css',
    '        url: https://example.com/katex.css',
    '      - type: js',
    '        url: https://example.com/katex.js',
    '    detect_fenced_lang: []',
    '    detect_inline:',
    '      - "$$"',
  ].join('\n'));
  const inj = buildComponentInjections('<p>식: $$x$$</p>', reg);
  assert.ok(inj.headHtml.includes('katex.css') && inj.headHtml.includes('<link'));
  assert.ok(inj.bodyHtml.includes('katex.js') && inj.bodyHtml.includes('<script'));
});

// ── 그룹 3: 회귀 — unconditional 미주입 ──────────────────────────────────────
test('regression: unconditional 라이브러리는 디스패처가 주입 안 함', () => {
  const reg = loadRegistry({ fresh: true });
  const inj = buildComponentInjections('<div data-component="d3"></div><section>$$x$$</section>', reg);
  assert.ok(!inj.bodyHtml.includes('mermaid'), 'mermaid 미주입 (정적 블록 담당)');
  assert.ok(!inj.bodyHtml.includes('markmap'), 'markmap 미주입');
  assert.ok(!inj.bodyHtml.includes('reveal.js@5'), 'reveal.js 미주입');
  assert.ok(!inj.bodyHtml.includes('d3@7'), 'd3 미주입 (unconditional)');
});

// ── 그룹 4: fenced 디스패처 graceful ────────────────────────────────────────
test('dispatcher: 미등록 fenced 언어 → 에러 없이 빈 주입', () => {
  const reg = loadRegistry({ fresh: true });
  assert.doesNotThrow(() => {
    const inj = buildComponentInjections('<div data-component="unknownlang"></div>', reg);
    assert.strictEqual(inj.headHtml, '');
    assert.strictEqual(inj.bodyHtml, '');
  });
});

test('dispatcher: 빈/null deck 입력 → 에러 없이 빈 주입', () => {
  assert.doesNotThrow(() => {
    assert.strictEqual(buildComponentInjections('').headHtml, '');
    assert.strictEqual(buildComponentInjections(null).bodyHtml, '');
  });
});

// ── 그룹 5: Phase 1 — 수식·심벌·차트 ───────────────────────────────────────
test('phase1: katex·chartjs·fontawesome status applied', () => {
  const reg = loadRegistry({ fresh: true });
  for (const id of ['katex', 'chartjs', 'fontawesome']) {
    const lib = reg.libraries.find((l) => l.id === id);
    assert.strictEqual(lib.status, 'applied', `${id} status applied 아님`);
  }
});

test('phase1: 차트 ```chart fenced → data-component div', () => {
  const html = convertMarkdownToHTML('## 차트\n\n```chart\n{"type":"bar"}\n```\n');
  assert.ok(/data-component="chart"/.test(html), 'data-component div 생성');
  assert.ok(html.includes('&quot;type&quot;') || html.includes('"type"'), 'config 본문 보존');
});

test('phase1: 심벌 :fa-name: → <i>, 코드 스팬 보존', () => {
  const html = convertMarkdownToHTML('## 심벌 :fa-rocket: 텍스트\n\n코드 `:fa-x:` 보존\n');
  assert.ok(/<i class="fa-solid fa-rocket"><\/i>/.test(html), '심벌 <i> 변환');
  assert.ok(html.includes('<code>:fa-x:</code>'), '코드 스팬 내 마커 보존');
});

test('phase1: 수식 $$…$$·\\(…\\) 마커 보존', () => {
  const html = convertMarkdownToHTML('## 수식\n\n블록 $$E=mc^2$$ 인라인 \\(a+b\\)\n');
  assert.ok(html.includes('$$E=mc^2$$'), '블록 수식 보존');
  assert.ok(html.includes('\\(a+b\\)'), '인라인 수식 보존');
});

test('phase1: 디스패처 — 수식·심벌·차트 데크 → 3종 주입', () => {
  const reg = loadRegistry({ fresh: true });
  const deck = '<div data-component="chart">{}</div><p>$$x$$ <i class="fa-solid fa-x"></i></p>';
  const inj = buildComponentInjections(deck, reg);
  assert.ok(inj.bodyHtml.includes('chart.js@4'), 'chart.js 주입');
  assert.ok(inj.bodyHtml.includes('katex'), 'katex 주입');
  assert.ok(inj.headHtml.includes('fontawesome-free'), 'fontawesome 주입');
});

// ── 그룹 6: Phase 2 — 지도·인포그래픽 ────────────────────────────────────────
const { getComponentFencedLangs } = require('../component-registry');

test('phase2: leaflet·d3 status applied', () => {
  const reg = loadRegistry({ fresh: true });
  assert.strictEqual(reg.libraries.find((l) => l.id === 'leaflet').status, 'applied');
  assert.strictEqual(reg.libraries.find((l) => l.id === 'd3').status, 'applied');
});

test('phase2: getComponentFencedLangs → chart·map·d3', () => {
  const langs = getComponentFencedLangs();
  for (const l of ['chart', 'map', 'd3']) {
    assert.ok(langs.has(l), `fenced 언어 누락: ${l}`);
  }
});

test('phase2: ```map / ```d3 fenced → data-component div', () => {
  const mapHtml = convertMarkdownToHTML('## 지도\n\n```map\n{"center":[0,0]}\n```\n');
  assert.ok(/data-component="map"/.test(mapHtml), 'map div 생성');
  const d3Html = convertMarkdownToHTML('## d3\n\n```d3\nel.textContent="x";\n```\n');
  assert.ok(/data-component="d3"/.test(d3Html), 'd3 div 생성');
});

test('phase2: 디스패처 — map → leaflet CDN+훅, d3 → 훅만(CDN 미주입)', () => {
  const reg = loadRegistry({ fresh: true });
  const mapInj = buildComponentInjections('<div data-component="map"></div>', reg);
  assert.ok(mapInj.headHtml.includes('leaflet') || mapInj.bodyHtml.includes('leaflet'), 'leaflet CDN 주입');
  assert.ok(mapInj.bodyHtml.includes('L.tileLayer'), 'map 훅 주입');
  const d3Inj = buildComponentInjections('<div data-component="d3"></div>', reg);
  assert.ok(d3Inj.bodyHtml.includes('new Function'), 'd3 훅 주입');
  assert.ok(!d3Inj.bodyHtml.includes('d3@7'), 'd3 CDN 미주입 (unconditional — 정적 블록 담당)');
});

// ── 그룹 7: Issue183 — diagram/component 슬롯 분리 ───────────────────────────
test('issue183: chart·map·d3 fenced → .component-container 슬롯', () => {
  for (const lang of ['chart', 'map', 'd3']) {
    const html = convertMarkdownToHTML(`## c\n\n\`\`\`${lang}\n{}\n\`\`\`\n`);
    assert.ok(
      new RegExp(`<div class="component-container" data-component="${lang}">`).test(html),
      `${lang} → component-container 슬롯`
    );
    assert.ok(!/class="media-container"[^>]*data-component/.test(html),
      `${lang} → media-container 미사용`);
  }
});

test('issue183: mermaid → .media-container 슬롯 유지 (diagram 슬롯)', () => {
  const html = convertMarkdownToHTML('## m\n\n```mermaid\ngraph TD; A-->B\n```\n');
  assert.ok(/<div class="media-container mermaid">/.test(html), 'mermaid → media-container');
  assert.ok(!html.includes('component-container'), 'mermaid → component-container 미사용');
});

test('issue183: kroki(dot) → .media-container 슬롯 유지 (diagram 슬롯)', () => {
  const html = convertMarkdownToHTML('## k\n\n```dot\ndigraph{a->b}\n```\n');
  assert.ok(/class="media-container kroki"/.test(html), 'kroki → media-container');
  assert.ok(!html.includes('component-container'), 'kroki → component-container 미사용');
});

// ── 그룹 8: Issue184 — React artifact + HTML artifact(WordArt) ────────────────
test('issue184: react 라이브러리 등재 + status applied', () => {
  const reg = loadRegistry({ fresh: true });
  const react = reg.libraries.find((l) => l.id === 'react');
  assert.ok(react, 'react 라이브러리 등재');
  assert.strictEqual(react.status, 'applied', 'react status applied');
  assert.strictEqual(react.injection, 'conditional', 'react conditional 주입');
  assert.strictEqual(react.init_hook, 'react_dispatch', 'react init_hook');
  assert.ok(react.detect_fenced_lang.includes('react'), 'react fenced 언어 등재');
  assert.strictEqual(react.cdn.length, 3, 'react CDN 3종(react·react-dom·babel)');
});

test('issue184: getComponentFencedLangs → react 포함', () => {
  const langs = getComponentFencedLangs();
  assert.ok(langs.has('react'), 'react fenced 언어 집합 포함');
});

test('issue184: ```react fenced → .component-container data-component="react"', () => {
  const html = convertMarkdownToHTML('## r\n\n```react\nrender(<b>hi</b>);\n```\n');
  assert.ok(/<div class="component-container" data-component="react">/.test(html),
    'react → component-container 슬롯');
});

test('issue184: 디스패처 — react 데크 → React·ReactDOM·Babel CDN + react_dispatch 훅', () => {
  const reg = loadRegistry({ fresh: true });
  const inj = buildComponentInjections('<div data-component="react"></div>', reg);
  assert.ok(inj.bodyHtml.includes('react@18'), 'React CDN 주입');
  assert.ok(inj.bodyHtml.includes('react-dom@18'), 'ReactDOM CDN 주입');
  assert.ok(inj.bodyHtml.includes('@babel/standalone'), 'Babel-standalone CDN 주입');
  assert.ok(inj.bodyHtml.includes('Babel.transform'), 'react_dispatch 훅 주입');
});

test('issue184: react 블록 없는 데크 → React/Babel CDN 미주입 (conditional)', () => {
  const reg = loadRegistry({ fresh: true });
  const inj = buildComponentInjections('<div data-component="d3"></div>', reg);
  assert.ok(!inj.bodyHtml.includes('react@18'), 'react 블록 없으면 React CDN 미주입');
  assert.ok(!inj.bodyHtml.includes('@babel/standalone'), 'Babel CDN 미주입');
});

test('issue184: ```wordart fenced → .wordart-block raw HTML passthrough (escape 안 함)', () => {
  const html = convertMarkdownToHTML(
    '## w\n\n```wordart\n<h1 class="wordart-gradient">Hi</h1>\n```\n');
  assert.ok(/<div class="component-container wordart-block">/.test(html),
    'wordart → component-container.wordart-block 슬롯');
  assert.ok(html.includes('<h1 class="wordart-gradient">Hi</h1>'),
    'wordart 본문 raw HTML 그대로 통과 (escape 안 함)');
  assert.ok(!html.includes('&lt;h1'), 'wordart 본문 escape 되지 않음');
});

test('issue184: wordart 는 component-libraries.yml 미등재 (라이브러리 아님)', () => {
  const reg = loadRegistry({ fresh: true });
  assert.ok(!reg.libraries.find((l) => l.id === 'wordart'),
    'wordart 라이브러리 미등재 (순수 CSS — CDN·hook 없음)');
});

// ── Issue193: htmlArt 렌더 백엔드 (CSS → SVG) ───────────────────────────────
test('issue193: htmlart 라이브러리 등재 + status applied + CDN 없음', () => {
  const reg = loadRegistry({ fresh: true });
  const ha = reg.libraries.find((l) => l.id === 'htmlart');
  assert.ok(ha, 'htmlart 라이브러리 등재');
  assert.strictEqual(ha.status, 'applied');
  assert.strictEqual(ha.injection, 'conditional');
  assert.strictEqual(ha.init_hook, 'htmlart_dispatch');
  assert.strictEqual(ha.cdn.length, 0, 'CDN 없음 — d3 재사용');
  assert.deepStrictEqual(ha.detect_inline, ['data-htmlart=']);
});

test('issue193: data-htmlart 신호 데크 → htmlart_dispatch 훅 주입 / CDN 미주입', () => {
  const reg = loadRegistry({ fresh: true });
  const hit = buildComponentInjections(
    '<div class="m2-htmlart htmlart-cycle" data-htmlart="cycle"></div>', reg);
  assert.ok(hit.bodyHtml.includes('function renderCycle'),
    'htmlart_dispatch 훅 주입 (renderCycle 포함)');
  assert.strictEqual(hit.headHtml, '', 'CDN 없음 — headHtml 비어 있음');
  const miss = buildComponentInjections('<div>도해 없음</div>', reg);
  assert.ok(!miss.bodyHtml.includes('data-htmlart'), '신호 없으면 미주입');
});

test('issue193: convertMarkdownToHTML ::: htmlart cycle → data-htmlart 신호 생성', () => {
  const html = convertMarkdownToHTML(
    '::: htmlart cycle\n* 학습\n* 적용\n* 개선\n:::', 'controls');
  assert.ok(html.includes('data-htmlart="cycle"'),
    'htmlart cycle div 가 detect_inline 신호(data-htmlart=) 포함');
});

// ── Issue206: model3d (3D 모델 뷰어 — model-viewer) ─────────────────────────
test('issue206: model3d 엔트리가 레지스트리에 존재', () => {
  const reg = loadRegistry({ fresh: true });
  const entry = reg.libraries.find((l) => l.id === 'model3d');
  assert.ok(entry, 'model3d 엔트리 없음');
  assert.strictEqual(entry.injection, 'conditional');
  assert.strictEqual(entry.init_hook, 'model3d_dispatch');
  assert.deepStrictEqual(entry.detect_fenced_lang, ['model3d']);
  assert.strictEqual(entry.cdn[0].type, 'module_js', 'CDN 타입이 module_js여야 함');
});

test('issue206: model3d 없는 덱에 CDN 미주입', () => {
  const reg = loadRegistry({ fresh: true });
  const result = buildComponentInjections('<p>일반 텍스트</p>', reg);
  assert.ok(!result.bodyHtml.includes('model-viewer'), 'model3d 없는 덱에 CDN 주입됨');
});

test('issue206: applied 이후 module_js CDN이 <script type="module">로 주입', () => {
  // status: applied 상태 임시 패치 후 검증
  const reg = loadRegistry({ fresh: true });
  const entry = reg.libraries.find((l) => l.id === 'model3d');
  const origStatus = entry.status;
  entry.status = 'applied';
  const result = buildComponentInjections(
    '<div class="component-container" data-component="model3d">{"src":"./test.glb"}</div>', reg);
  entry.status = origStatus; // 복원
  assert.ok(
    result.bodyHtml.includes('type="module"') && result.bodyHtml.includes('model-viewer'),
    `module_js CDN 미주입. bodyHtml: ${result.bodyHtml.slice(0, 200)}`
  );
});

// ── Issue207: p5.js 시뮬레이션 뷰어 ──────────────────────────────────────────
test('p5_dispatch hook script — instance mode 패턴·slidechanged 일시정지 포함', () => {
  const { resolveHook } = require('../component-hooks');
  const script = resolveHook('p5_dispatch');
  assert.notEqual(script, '', 'p5_dispatch 훅이 존재해야 함');
  assert.match(script, /data-component="p5"/, 'p5 컴포넌트 선택자 포함');
  assert.match(script, /new p5\(/, 'instance mode 호출 포함');
  assert.match(script, /noLoop|remove/, 'slidechanged 시 일시정지·정리 로직 포함');
  assert.match(script, /Reveal\.on\(.slidechanged./, 'reveal slidechanged 이벤트 처리');
  assert.match(script, /component-error/, '에러 표시 fallback 포함');
});
