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
