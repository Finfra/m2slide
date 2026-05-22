'use strict';

// Issue118: Pandoc inline attribute `{.foo .bar}` 파서 테스트
// 실행: node --test lib/__tests__/markdown.test.js
// 외부 dependency 회피 — Node 표준 node:test + node:assert

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { extractInlineClasses, convertMarkdownToHTML } = require('../markdown');

describe('extractInlineClasses', () => {
  test('단순 fragment: 라인 끝 {.fragment} 추출', () => {
    const r = extractInlineClasses('두 번째 항목 {.fragment}');
    assert.deepEqual(r, { classes: ['fragment'], remaining: '두 번째 항목' });
  });

  test('복수 class: {.fragment .fade-up}', () => {
    const r = extractInlineClasses('두 번째 {.fragment .fade-up}');
    assert.deepEqual(r, { classes: ['fragment', 'fade-up'], remaining: '두 번째' });
  });

  test('class 3개', () => {
    const r = extractInlineClasses('항목 {.fragment .highlight-blue .grow}');
    assert.deepEqual(r, { classes: ['fragment', 'highlight-blue', 'grow'], remaining: '항목' });
  });

  test('일반 텍스트 — attribute 없음', () => {
    const r = extractInlineClasses('일반 텍스트');
    assert.deepEqual(r, { classes: [], remaining: '일반 텍스트' });
  });

  test('일반 텍스트의 { 보존: {a, b}는 집합', () => {
    const r = extractInlineClasses('{a, b}는 집합');
    assert.deepEqual(r, { classes: [], remaining: '{a, b}는 집합' });
  });

  test('빈 attribute {} 무시 (attribute 패턴 아님)', () => {
    const r = extractInlineClasses('항목 {}');
    assert.deepEqual(r, { classes: [], remaining: '항목 {}' });
  });

  test('빈 dot {.} 무시', () => {
    const r = extractInlineClasses('항목 {.}');
    assert.deepEqual(r, { classes: [], remaining: '항목 {.}' });
  });

  test('코드 인라인 보호: 라인 끝이 backtick으로 끝남 → 매칭 안 함', () => {
    const r = extractInlineClasses('코드 `{.foo}`');
    assert.deepEqual(r, { classes: [], remaining: '코드 `{.foo}`' });
  });

  test('attribute 다음 trailing 공백 허용', () => {
    const r = extractInlineClasses('항목 {.fragment}   ');
    assert.deepEqual(r, { classes: ['fragment'], remaining: '항목' });
  });

  test('속성에 dot prefix 없는 토큰은 무시되지 않음 — 각 토큰은 .로 시작 필수', () => {
    // {fragment foo}는 모두 .없음 → attribute 패턴 아님 → 그대로 보존
    const r = extractInlineClasses('항목 {fragment foo}');
    assert.deepEqual(r, { classes: [], remaining: '항목 {fragment foo}' });
  });

  test('빈 문자열', () => {
    const r = extractInlineClasses('');
    assert.deepEqual(r, { classes: [], remaining: '' });
  });

  test('단독 {.fragment} (앞 텍스트 없음)', () => {
    const r = extractInlineClasses('{.fragment}');
    assert.deepEqual(r, { classes: ['fragment'], remaining: '' });
  });

  // Issue149: reveal.js 표준 주석 syntax
  test('reveal 주석: <!-- .element: class="fragment" -->', () => {
    const r = extractInlineClasses('두 번째 항목 <!-- .element: class="fragment" -->');
    assert.deepEqual(r, { classes: ['fragment'], remaining: '두 번째 항목' });
  });

  test('reveal 주석: 다중 class fragment fade-up', () => {
    const r = extractInlineClasses('두 번째 항목 <!-- .element: class="fragment fade-up" -->');
    assert.deepEqual(r, { classes: ['fragment', 'fade-up'], remaining: '두 번째 항목' });
  });

  test('reveal 주석: single quote 허용', () => {
    const r = extractInlineClasses("항목 <!-- .element: class='fragment grow' -->");
    assert.deepEqual(r, { classes: ['fragment', 'grow'], remaining: '항목' });
  });

  test('reveal 주석: 빈 class 무시', () => {
    const r = extractInlineClasses('항목 <!-- .element: class="" -->');
    assert.deepEqual(r, { classes: [], remaining: '항목 <!-- .element: class="" -->' });
  });

  test('reveal 주석: trailing 공백 허용', () => {
    const r = extractInlineClasses('항목 <!-- .element: class="fragment" -->   ');
    assert.deepEqual(r, { classes: ['fragment'], remaining: '항목' });
  });

  test('reveal 주석: 코드 인라인 보호 (백틱 종결 시 매칭 안 함)', () => {
    const r = extractInlineClasses('`<!-- .element: class="fragment" -->`');
    assert.deepEqual(r, { classes: [], remaining: '`<!-- .element: class="fragment" -->`' });
  });

  test('reveal 주석: 일반 HTML 주석은 매칭 안 함', () => {
    const r = extractInlineClasses('항목 <!-- 일반 주석 -->');
    assert.deepEqual(r, { classes: [], remaining: '항목 <!-- 일반 주석 -->' });
  });
});

describe('convertMarkdownToHTML — Issue118 통합', () => {
  test('list item에 {.fragment} 적용 → li class 병합', () => {
    const md = '* 두 번째 항목 {.fragment .fade-up}';
    const html = convertMarkdownToHTML(md, 'controls');
    assert.match(html, /<li class="bullet-dot fragment fade-up">두 번째 항목<\/li>/);
  });

  test('list item 일반 — 회귀 없음', () => {
    const md = '* 일반 항목';
    const html = convertMarkdownToHTML(md, 'controls');
    assert.match(html, /<li class="bullet-dot">일반 항목<\/li>/);
  });

  test('paragraph에 {.fragment} 적용 → p class 병합', () => {
    const md = '이 단락은 단계 등장 {.fragment}';
    const html = convertMarkdownToHTML(md, 'controls');
    assert.match(html, /<p class="fragment">이 단락은 단계 등장<\/p>/);
  });

  test('paragraph 일반 — 회귀 없음 (class attribute 미주입)', () => {
    const md = '일반 단락 텍스트';
    const html = convertMarkdownToHTML(md, 'controls');
    assert.match(html, /<p>일반 단락 텍스트<\/p>/);
  });

  test('ordered list item에 {.fragment} 적용', () => {
    const md = '1. 첫 번째 {.fragment .grow}';
    const html = convertMarkdownToHTML(md, 'controls');
    assert.match(html, /<li class="fragment grow">첫 번째<\/li>/);
  });

  test('일반 텍스트의 {} 보존 — 디렉티브 아님', () => {
    const md = '* {a, b}는 집합';
    const html = convertMarkdownToHTML(md, 'controls');
    assert.match(html, /<li class="bullet-dot">\{a, b\}는 집합<\/li>/);
  });

  test('코드 인라인 안의 {} 보존 — `{.foo}`', () => {
    const md = '* 코드 `{.foo}`';
    const html = convertMarkdownToHTML(md, 'controls');
    // backtick으로 끝나는 라인은 attribute 매칭 안 됨
    assert.match(html, /<li class="bullet-dot">코드 <code>\{\.foo\}<\/code><\/li>/);
  });
});

describe('convertMarkdownToHTML — Issue149 reveal.js 주석 syntax 통합', () => {
  test('list item에 reveal 주석 적용 → li class 병합', () => {
    const md = '* 두 번째 항목 <!-- .element: class="fragment fade-up" -->';
    const html = convertMarkdownToHTML(md, 'controls');
    assert.match(html, /<li class="bullet-dot fragment fade-up">두 번째 항목<\/li>/);
  });

  test('paragraph에 reveal 주석 적용 → p class 병합', () => {
    const md = '이 단락 <!-- .element: class="fragment" -->';
    const html = convertMarkdownToHTML(md, 'controls');
    assert.match(html, /<p class="fragment">이 단락<\/p>/);
  });

  test('ordered list item에 reveal 주석 적용', () => {
    const md = '1. 첫 번째 <!-- .element: class="fragment grow" -->';
    const html = convertMarkdownToHTML(md, 'controls');
    assert.match(html, /<li class="fragment grow">첫 번째<\/li>/);
  });

  test('reveal + Pandoc 병존 가능 (다른 라인)', () => {
    const md = '* A <!-- .element: class="fragment" -->\n* B {.fragment .fade-up}';
    const html = convertMarkdownToHTML(md, 'controls');
    assert.match(html, /<li class="bullet-dot fragment">A<\/li>/);
    assert.match(html, /<li class="bullet-dot fragment fade-up">B<\/li>/);
  });
});

describe('convertMarkdownToHTML — Issue188 htmlArt 구조 도해', () => {
  test('::: htmlart process → m2-htmlart htmlart-process div + --htmlart-n', () => {
    const md = '::: htmlart process\n* 기획\n* 설계\n* 구현\n:::';
    const html = convertMarkdownToHTML(md, 'controls');
    assert.match(html, /<div class="m2-htmlart htmlart-process" data-htmlart="process" style="--htmlart-n:3">/);
    assert.match(html, /<\/div>/);
  });

  test('19종 타입 모두 변환 (v1 4종 + v2 확장 10종 + v3 list 5종)', () => {
    const types = [
      'process', 'cycle', 'hierarchy', 'pyramid',
      'timeline', 'venn', 'matrix', 'target', 'funnel',
      'gear', 'radial', 'chevron', 'step', 'arrow',
      'numbered', 'hexagon', 'bracket', 'block', 'tab',
    ];
    for (const t of types) {
      const html = convertMarkdownToHTML(`::: htmlart ${t}\n* A\n* B\n:::`, 'controls');
      assert.match(html, new RegExp(`<div class="m2-htmlart htmlart-${t}" data-htmlart="${t}"`));
    }
  });

  test('v3 list 2단 타입(bracket·tab) — 그룹/멤버 중첩 ul 변환', () => {
    for (const t of ['bracket', 'tab']) {
      const md = `::: htmlart ${t}\n* 그룹A\n  - 멤버1\n  - 멤버2\n:::`;
      const html = convertMarkdownToHTML(md, 'controls');
      assert.match(html, new RegExp(`<div class="m2-htmlart htmlart-${t}" data-htmlart="${t}"`));
      assert.match(html, /<li class="bullet-dash">멤버1<\/li>/);
    }
  });

  test('미지원 타입 → component-error (빌드 비차단)', () => {
    const md = '::: htmlart bogusxyz\n* A\n:::';
    const html = convertMarkdownToHTML(md, 'controls');
    assert.match(html, /<div class="m2-htmlart component-error" data-htmlart-error="1">/);
    assert.match(html, /미지원 타입/);
  });

  test('타입 누락(::: htmlart 단독) → component-error', () => {
    const md = '::: htmlart\n* A\n:::';
    const html = convertMarkdownToHTML(md, 'controls');
    assert.match(html, /<div class="m2-htmlart component-error"/);
    assert.match(html, /타입 미지정/);
  });

  test('--htmlart-n 은 top-level * 항목만 카운트 (하위 - 제외)', () => {
    const md = '::: htmlart cycle\n* 학습\n  - 보조\n* 적용\n  - 보조\n:::';
    const html = convertMarkdownToHTML(md, 'controls');
    assert.match(html, /style="--htmlart-n:2"/);
  });

  test('내부 리스트는 중첩 ul/li 로 변환 (process)', () => {
    const md = '::: htmlart process\n* 루트\n  - 자식\n:::';
    const html = convertMarkdownToHTML(md, 'controls');
    assert.match(html, /<div class="m2-htmlart htmlart-process"[^>]*>\s*<ul>/);
    assert.match(html, /<li class="bullet-dash">자식<\/li>/);
  });

  test('hierarchy 는 bullet 텍스트를 <span class="ha-node"> 로 래핑 (Issue189 가로 트리)', () => {
    const md = '::: htmlart hierarchy\n* 루트\n  - 자식\n:::';
    const html = convertMarkdownToHTML(md, 'controls');
    assert.match(html, /<span class="ha-node">루트<\/span>/);
    assert.match(html, /<span class="ha-node">자식<\/span>/);
  });

  test('process/cycle/pyramid 는 ha-node 래핑 안 함', () => {
    for (const t of ['process', 'cycle', 'pyramid']) {
      const html = convertMarkdownToHTML(`::: htmlart ${t}\n* 항목\n:::`, 'controls');
      assert.ok(!html.includes('ha-node'), `${t} 는 ha-node 없어야 함`);
    }
  });
});

describe('convertMarkdownToHTML — Issue203 cards title-only 가로 행(rows)', () => {
  test('전부 title-only → m2-cards cards rows', () => {
    const md = '::: cards\n* **첫째 강조 문장**\n* **둘째 강조 문장**\n* **셋째 강조 문장**\n:::';
    const html = convertMarkdownToHTML(md, 'controls');
    assert.match(html, /<div class="m2-cards cards rows">/);
  });

  test('단일 title-only 항목도 rows', () => {
    const md = '::: cards\n* **유일 항목**\n:::';
    const html = convertMarkdownToHTML(md, 'controls');
    assert.match(html, /<div class="m2-cards cards rows">/);
  });

  test('혼합(일부 본문 있음) → rows 미적용, grid 유지', () => {
    const md = '::: cards\n* **본문 카드**\n  - 본문 한 줄\n* **title-only 카드**\n:::';
    const html = convertMarkdownToHTML(md, 'controls');
    assert.match(html, /<div class="m2-cards cards">/);
    assert.ok(!/m2-cards cards rows/.test(html), '혼합 블록은 rows 아님');
  });

  test('전부 본문 있음 → rows 미적용', () => {
    const md = '::: cards\n* **카드A**\n  - 본문A\n* **카드B**\n  - 본문B\n:::';
    const html = convertMarkdownToHTML(md, 'controls');
    assert.match(html, /<div class="m2-cards cards">/);
    assert.ok(!/m2-cards cards rows/.test(html), '본문 카드 블록은 rows 아님');
  });

  test('회귀 — columns fenced div 는 cards rows 영향 없음', () => {
    const cols = convertMarkdownToHTML('::: columns\n* A\n:::', 'controls');
    assert.match(cols, /<div class="m2-cols columns">/);
    assert.ok(!cols.includes('cards rows'), 'columns 에 cards rows 미주입');
  });
});
