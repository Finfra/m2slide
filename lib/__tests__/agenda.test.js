'use strict';

// Issue141: getOutlinePath - AGENDA.md outline depth 추출 테스트
// 실행: node --test lib/__tests__/agenda.test.js

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { getOutlinePath } = require('../agenda');

test('getOutlinePath - H2 entry mode, depth 3까지', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'outline-'));
  const agendaPath = path.join(tmpDir, 'AGENDA.md');
  fs.writeFileSync(agendaPath, [
    '## [1. 도입](./01-intro.md)',
    '### [1.1 인사](./01.1-greeting.md)',
    '#### [1.1.1 자기소개](./01.1.1-about.md)',
    '#### [1.1.2 약력](./01.1.2-bio.md)',
    '### [1.2 목표](./01.2-goal.md)',
    '## [2. 본론](./02-main.md)',
  ].join('\n'));

  assert.deepStrictEqual(getOutlinePath('01-intro.html', agendaPath), ['1. 도입']);
  assert.deepStrictEqual(getOutlinePath('02-main.html', agendaPath), ['2. 본론']);
  assert.deepStrictEqual(getOutlinePath('01.1-greeting.html', agendaPath), ['1. 도입', '1.1 인사']);
  assert.deepStrictEqual(getOutlinePath('01.2-goal.html', agendaPath), ['1. 도입', '1.2 목표']);
  assert.deepStrictEqual(getOutlinePath('01.1.1-about.html', agendaPath), ['1. 도입', '1.1 인사', '1.1.1 자기소개']);
  assert.deepStrictEqual(getOutlinePath('01.1.2-bio.html', agendaPath), ['1. 도입', '1.1 인사', '1.1.2 약력']);
  assert.deepStrictEqual(getOutlinePath('99-unknown.html', agendaPath), []);
  assert.deepStrictEqual(getOutlinePath('any.html', '/nonexistent/AGENDA.md'), []);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('getOutlinePath - H1 entry mode (한 단계 shift)', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'outline-h1-'));
  const agendaPath = path.join(tmpDir, 'AGENDA.md');
  fs.writeFileSync(agendaPath, [
    '# [1. 도입](./01-intro.md)',
    '## [1.1 인사](./01.1-greeting.md)',
    '### [1.1.1 자기소개](./01.1.1-about.md)',
    '# [2. 본론](./02-main.md)',
  ].join('\n'));

  assert.deepStrictEqual(getOutlinePath('01-intro.html', agendaPath), ['1. 도입']);
  assert.deepStrictEqual(getOutlinePath('01.1-greeting.html', agendaPath), ['1. 도입', '1.1 인사']);
  assert.deepStrictEqual(getOutlinePath('01.1.1-about.html', agendaPath), ['1. 도입', '1.1 인사', '1.1.1 자기소개']);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('getOutlinePath - plain heading(링크 없는 #) 혼재 시 무시 (D5)', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'outline-plain-'));
  const agendaPath = path.join(tmpDir, 'AGENDA.md');
  fs.writeFileSync(agendaPath, [
    '# 인트로 섹션',                      // plain heading — outline 무시
    '',
    '## [1. 도입](./01-intro.md)',
    '### [1.1 인사](./01.1-greeting.md)',
  ].join('\n'));

  assert.deepStrictEqual(getOutlinePath('01-intro.html', agendaPath), ['1. 도입']);
  assert.deepStrictEqual(getOutlinePath('01.1-greeting.html', agendaPath), ['1. 도입', '1.1 인사']);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('getOutlinePath - frontmatter 있는 AGENDA.md', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'outline-fm-'));
  const agendaPath = path.join(tmpDir, 'AGENDA.md');
  fs.writeFileSync(agendaPath, [
    '---',
    'title: Test Presentation',
    'instructor_name: Tester',
    '---',
    '',
    '## [1. 도입](./01-intro.md)',
    '### [1.1 인사](./01.1-greeting.md)',
  ].join('\n'));

  assert.deepStrictEqual(getOutlinePath('01-intro.html', agendaPath), ['1. 도입']);
  assert.deepStrictEqual(getOutlinePath('01.1-greeting.html', agendaPath), ['1. 도입', '1.1 인사']);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
