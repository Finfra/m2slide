'use strict';

// Issue154: layout-meta-parser 단위 테스트
// 실행: node --test lib/__tests__/layout-meta-parser.test.js

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { parseLayoutMeta, loadAllLayouts } = require('../layout-meta-parser');

const SAMPLE_HTML = `<!-- @meta
description: 일반 본문 슬라이드. H2 제목 + 리스트/단락.
recommended_for:
  - 일반 본문
  - 리스트 슬라이드
  - 텍스트 단락
not_recommended_for:
  - 표지 슬라이드
  - 풀스크린 이미지
slots:
  - title
  - content
example: |
  ## 슬라이드 제목

  * 항목 1
  * 항목 2
-->
<section class="layout-_contents">
  <h2>{{title}}</h2>
  <div class="content">{{content}}</div>
</section>
`;

test('parseLayoutMeta: 정상 케이스 — 모든 필드 파싱', () => {
  const meta = parseLayoutMeta(SAMPLE_HTML);
  assert.equal(meta.description, '일반 본문 슬라이드. H2 제목 + 리스트/단락.');
  assert.deepEqual(meta.recommended_for, ['일반 본문', '리스트 슬라이드', '텍스트 단락']);
  assert.deepEqual(meta.not_recommended_for, ['표지 슬라이드', '풀스크린 이미지']);
  assert.deepEqual(meta.slots, ['title', 'content']);
  assert.ok(meta.example.includes('## 슬라이드 제목'));
  assert.ok(meta.example.includes('* 항목 1'));
});

test('parseLayoutMeta: @meta 블록 없음 → null (silent fallback)', () => {
  const html = '<section class="layout-x"><h2>{{title}}</h2></section>\n';
  assert.equal(parseLayoutMeta(html), null);
});

test('parseLayoutMeta: 필수 필드 누락 → throw', () => {
  const html = `<!-- @meta
description: 설명만 있고 recommended_for 없음
slots:
  - content
-->`;
  assert.throws(() => parseLayoutMeta(html), /missing required field: recommended_for/);
});

test('parseLayoutMeta: 알 수 없는 필드 → throw', () => {
  const html = `<!-- @meta
description: x
recommended_for:
  - a
slots:
  - content
unknown_field: y
-->`;
  assert.throws(() => parseLayoutMeta(html), /unknown field: unknown_field/);
});

test('parseLayoutMeta: 따옴표 제거 (string)', () => {
  const html = `<!-- @meta
description: "큰따옴표로 감싼 설명"
recommended_for:
  - 'a'
  - "b"
slots:
  - content
-->`;
  const meta = parseLayoutMeta(html);
  assert.equal(meta.description, '큰따옴표로 감싼 설명');
  assert.deepEqual(meta.recommended_for, ['a', 'b']);
});

test('parseLayoutMeta: example multiline literal block 인덴트 정상 제거', () => {
  const html = `<!-- @meta
description: x
recommended_for:
  - a
slots:
  - content
example: |
    indented line 1
    indented line 2

    after blank
-->`;
  const meta = parseLayoutMeta(html);
  assert.equal(meta.example, 'indented line 1\nindented line 2\n\nafter blank');
});

test('parseLayoutMeta: not_recommended_for 생략 가능 (선택 필드)', () => {
  const html = `<!-- @meta
description: x
recommended_for:
  - a
slots:
  - content
-->`;
  const meta = parseLayoutMeta(html);
  assert.ok(!('not_recommended_for' in meta));
});

test('parseLayoutMeta: 빈 줄·주석 무시', () => {
  const html = `<!-- @meta

# 이것은 yaml 주석
description: x

recommended_for:
  - a

slots:
  - content
-->`;
  const meta = parseLayoutMeta(html);
  assert.equal(meta.description, 'x');
  assert.deepEqual(meta.recommended_for, ['a']);
});

test('loadAllLayouts: 디렉토리 없음 → []', () => {
  const result = loadAllLayouts('/nonexistent/path/xyz');
  assert.deepEqual(result, []);
});

test('loadAllLayouts: 정상 디렉토리 스캔', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'layout-meta-test-'));
  const layoutsDir = path.join(tmpDir, 'layouts');
  fs.mkdirSync(layoutsDir);

  fs.writeFileSync(
    path.join(layoutsDir, '_contents.html'),
    SAMPLE_HTML,
  );
  fs.writeFileSync(
    path.join(layoutsDir, '_no_meta.html'),
    '<section>no meta</section>',
  );

  const result = loadAllLayouts(tmpDir);
  assert.equal(result.length, 2);

  const contents = result.find((r) => r.name === '_contents');
  assert.ok(contents);
  assert.equal(contents.meta.description, '일반 본문 슬라이드. H2 제목 + 리스트/단락.');
  assert.equal(contents.parseError, null);

  const noMeta = result.find((r) => r.name === '_no_meta');
  assert.ok(noMeta);
  assert.equal(noMeta.meta, null);
  assert.equal(noMeta.parseError, null);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('loadAllLayouts: 번호 prefix 파일명에서 layout 이름 추출', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'layout-meta-test-'));
  const layoutsDir = path.join(tmpDir, 'layouts');
  fs.mkdirSync(layoutsDir);

  fs.writeFileSync(
    path.join(layoutsDir, '1.2.cover.html'),
    SAMPLE_HTML,
  );

  const result = loadAllLayouts(tmpDir);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'cover');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('loadAllLayouts: YAML 오류 파일 → parseError 기록 + 계속 진행', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'layout-meta-test-'));
  const layoutsDir = path.join(tmpDir, 'layouts');
  fs.mkdirSync(layoutsDir);

  fs.writeFileSync(
    path.join(layoutsDir, '_broken.html'),
    `<!-- @meta
description: x
-->`,
  );
  fs.writeFileSync(
    path.join(layoutsDir, '_good.html'),
    SAMPLE_HTML,
  );

  const result = loadAllLayouts(tmpDir);
  assert.equal(result.length, 2);

  const broken = result.find((r) => r.name === '_broken');
  assert.ok(broken.parseError);
  assert.equal(broken.meta, null);

  const good = result.find((r) => r.name === '_good');
  assert.ok(good.meta);
  assert.equal(good.parseError, null);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
