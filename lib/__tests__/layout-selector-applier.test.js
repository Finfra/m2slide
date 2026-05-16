'use strict';

// Issue155: layout-selector-applier 단위 테스트
// 실행: node --test lib/__tests__/layout-selector-applier.test.js

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  splitFrontmatter,
  splitSlides,
  hasManualLayoutMeta,
  injectLayoutMeta,
  applyLayoutSelection,
} = require('../layout-selector-applier');

test('splitFrontmatter: frontmatter 있는 경우', () => {
  const md = `---
title: Test
date: 2026-05-17
---

## Slide 1

본문`;
  const { frontmatter, body } = splitFrontmatter(md);
  assert.ok(frontmatter.includes('title: Test'));
  assert.ok(body.startsWith('## Slide 1'));
});

test('splitFrontmatter: frontmatter 없는 경우', () => {
  const md = `## Slide 1\n본문`;
  const { frontmatter, body } = splitFrontmatter(md);
  assert.equal(frontmatter, '');
  assert.equal(body, md);
});

test('splitSlides: --- 단독 줄로 분리', () => {
  const body = `## Slide 1\n본문 1\n\n---\n\n## Slide 2\n본문 2`;
  const slides = splitSlides(body);
  assert.equal(slides.length, 2);
  assert.ok(slides[0].includes('Slide 1'));
  assert.ok(slides[1].includes('Slide 2'));
});

test('hasManualLayoutMeta: #layout-* 라인 detect', () => {
  assert.equal(hasManualLayoutMeta('#layout-_cover\n\n## 제목'), true);
  assert.equal(hasManualLayoutMeta('#layout-blank\n\n## 제목'), true);
  assert.equal(hasManualLayoutMeta('#layout-_contents_no_title\n\n본문'), true);
});

test('hasManualLayoutMeta: 헤더 다음 디렉티브도 인정', () => {
  const slide = `## 제목

#layout-_cover

본문`;
  assert.equal(hasManualLayoutMeta(slide), true);
});

test('hasManualLayoutMeta: 일반 슬라이드는 false', () => {
  assert.equal(hasManualLayoutMeta('## 제목\n\n본문'), false);
  assert.equal(hasManualLayoutMeta('본문만 있는 슬라이드'), false);
});

test('hasManualLayoutMeta: 다른 디렉티브만 있고 #layout-* 없음 → false', () => {
  const slide = `#transition-fade\n#background-color-tomato\n\n## 제목\n\n본문`;
  assert.equal(hasManualLayoutMeta(slide), false);
});

test('injectLayoutMeta: 헤더 위에 #layout-* 추가', () => {
  const slide = `## 제목\n\n본문`;
  const out = injectLayoutMeta(slide, '_contents');
  assert.ok(out.startsWith('#layout-_contents'));
  assert.ok(out.includes('## 제목'));
  assert.ok(out.includes('본문'));
});

test('injectLayoutMeta: 이미 수동 메타 있으면 변경 없음', () => {
  const slide = `#layout-_cover\n\n## 제목`;
  const out = injectLayoutMeta(slide, '_contents');
  assert.equal(out, slide);
});

test('injectLayoutMeta: 다른 디렉티브와 공존', () => {
  const slide = `#transition-fade\n\n## 제목\n\n본문`;
  const out = injectLayoutMeta(slide, '_contents');
  assert.ok(out.includes('#transition-fade'));
  assert.ok(out.includes('#layout-_contents'));
  assert.ok(out.indexOf('#transition-fade') < out.indexOf('#layout-_contents'));
});

test('applyLayoutSelection: 기본 케이스 — 모든 슬라이드에 layout 주입', () => {
  const md = `---
title: Test
---

## Slide 1

본문

---

## Slide 2

본문 2`;
  const agentJson = {
    slides: [
      { index: 1, layout: '_cover', reason: 'cover' },
      { index: 2, layout: '_contents', reason: 'contents' },
    ],
  };
  const out = applyLayoutSelection(md, agentJson);
  assert.ok(out.includes('#layout-_cover'));
  assert.ok(out.includes('#layout-_contents'));
  assert.ok(out.includes('## Slide 1'));
  assert.ok(out.includes('## Slide 2'));
});

test('applyLayoutSelection: 사용자 수동 메타 보존', () => {
  const md = `## Slide 1\n\n본문\n\n---\n\n#layout-_blank\n\n## Slide 2\n\n본문`;
  const agentJson = {
    slides: [
      { index: 1, layout: '_cover', reason: 'cover' },
      { index: 2, layout: '_contents', reason: 'contents' },
    ],
  };
  const out = applyLayoutSelection(md, agentJson);
  assert.ok(out.includes('#layout-_cover'));
  assert.ok(out.includes('#layout-_blank'));
  assert.ok(!out.includes('#layout-_contents'), 'manual slide should not be overwritten');
});

test('applyLayoutSelection: --force 시 수동 메타도 덮어쓰기', () => {
  const md = `#layout-_blank\n\n## Slide 1\n\n본문`;
  const agentJson = {
    slides: [{ index: 1, layout: '_cover', reason: 'cover' }],
  };
  const out = applyLayoutSelection(md, agentJson, { force: true });
  assert.ok(out.includes('#layout-_cover'));
  assert.ok(!out.includes('#layout-_blank'));
});

test('applyLayoutSelection: JSON에 없는 슬라이드는 그대로 통과 (자동 위임)', () => {
  const md = `## Slide 1\n\n본문\n\n---\n\n## Slide 2\n\n본문`;
  const agentJson = {
    slides: [{ index: 2, layout: '_contents', reason: 'contents' }],
  };
  const out = applyLayoutSelection(md, agentJson);
  assert.ok(out.includes('#layout-_contents'));
  const slide1End = out.indexOf('---');
  const slide1 = out.slice(0, slide1End);
  assert.ok(!slide1.includes('#layout-'), 'slide 1 unchanged (auto-detect delegated)');
});

test('applyLayoutSelection: 화이트리스트 외 layout → stderr 경고 + skip', () => {
  const md = `## Slide 1\n\n본문`;
  const agentJson = {
    slides: [{ index: 1, layout: 'hallucinated_layout', reason: 'x' }],
  };

  let stderrCapture = '';
  const origWrite = process.stderr.write.bind(process.stderr);
  process.stderr.write = (chunk) => { stderrCapture += chunk; return true; };

  try {
    const out = applyLayoutSelection(md, agentJson, { validLayouts: ['_cover', '_contents'] });
    assert.ok(!out.includes('#layout-hallucinated_layout'));
    assert.ok(stderrCapture.includes('hallucinated_layout'));
  } finally {
    process.stderr.write = origWrite;
  }
});

test('applyLayoutSelection: 빈 agentJson — 입력 그대로 반환', () => {
  const md = `---\ntitle: Test\n---\n\n## Slide 1\n\n본문`;
  const out = applyLayoutSelection(md, { slides: [] });
  assert.ok(out.includes('## Slide 1'));
  assert.ok(!out.includes('#layout-'));
});

test('applyLayoutSelection: Frontmatter 보존', () => {
  const md = `---
title: Test
date: 2026-05-17
release_date: 2026-05-17
---

## Slide 1

본문`;
  const agentJson = { slides: [{ index: 1, layout: '_cover', reason: 'x' }] };
  const out = applyLayoutSelection(md, agentJson);
  assert.ok(out.includes('title: Test'));
  assert.ok(out.includes('release_date: 2026-05-17'));
  assert.ok(out.includes('#layout-_cover'));
});

test('applyLayoutSelection: 화이트리스트 underscore alias 양쪽 허용', () => {
  const md = `## Slide 1\n\n본문`;
  const agentJson = {
    slides: [{ index: 1, layout: 'cover', reason: 'x' }],
  };
  const out = applyLayoutSelection(md, agentJson, { validLayouts: ['_cover'] });
  assert.ok(out.includes('#layout-cover'));
});
