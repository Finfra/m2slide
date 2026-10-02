'use strict';

// Issue423: 이미지 해소 시 `X.annot.png` 짝 픽업 + `{raw}` 원본 강제 (prj7 cg-image-pipeline ③)
// 실행: node --test lib/__tests__/image-annot-pair.test.js

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { convertMarkdownToHTML, setModel3dInlineOptions } = require('../markdown');
const { resolveImageUrl } = require('../image-pair');

let tmp;
before(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'annot-pair-'));
  fs.mkdirSync(path.join(tmp, 'img'));
  for (const f of ['shot.png', 'shot.annot.png', 'plain.png', 'svgonly.png', 'svgonly.annot.svg']) {
    fs.writeFileSync(path.join(tmp, 'img', f), 'x');
  }
  setModel3dInlineOptions({ projectDir: tmp });
});
after(() => {
  setModel3dInlineOptions({ projectDir: null });
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('resolveImageUrl', () => {
  test('짝 있으면 .annot.png 로 치환', () => {
    assert.deepEqual(resolveImageUrl('img/shot.png', [tmp]), { url: 'img/shot.annot.png', raw: false });
    assert.equal(resolveImageUrl('./img/shot.png', [tmp]).url, './img/shot.annot.png');
  });
  test('{raw} 접미는 원본 강제 — 접미 제거', () => {
    assert.deepEqual(resolveImageUrl('img/shot.png{raw}', [tmp]), { url: 'img/shot.png', raw: true });
  });
  test('짝 없으면 원본 그대로', () => {
    assert.equal(resolveImageUrl('img/plain.png', [tmp]).url, 'img/plain.png');
  });
  test('.annot.svg 는 대상 아님', () => {
    assert.equal(resolveImageUrl('img/svgonly.png', [tmp]).url, 'img/svgonly.png');
  });
  test('이미 .annot.png 면 그대로', () => {
    assert.equal(resolveImageUrl('img/shot.annot.png', [tmp]).url, 'img/shot.annot.png');
  });
  test('원격·data URL 은 건드리지 않음', () => {
    assert.equal(resolveImageUrl('https://x/shot.png', [tmp]).url, 'https://x/shot.png');
  });
});

describe('convertMarkdownToHTML 통합', () => {
  test('① 단독 줄 — 짝 있으면 shot.annot.png', () => {
    const h = convertMarkdownToHTML('![](img/shot.png)');
    assert.match(h, /<img src="img\/shot\.annot\.png"/);
  });
  test('② {raw} — 원본 shot.png', () => {
    const h = convertMarkdownToHTML('![](img/shot.png){raw}');
    assert.match(h, /<img src="img\/shot\.png"/);
    assert.doesNotMatch(h, /\{raw\}/);
  });
  test('③ 짝 없음 — 원본 그대로', () => {
    const h = convertMarkdownToHTML('![](img/plain.png)');
    assert.match(h, /<img src="img\/plain\.png"/);
  });
  test('인라인(문장 속) 이미지도 같은 해소', () => {
    const h = convertMarkdownToHTML('앞 ![](img/shot.png) 뒤 ![](img/shot.png){raw}');
    assert.match(h, /img\/shot\.annot\.png/);
    assert.match(h, /src="img\/shot\.png"/);
  });
});
