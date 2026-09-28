// lint-deployment.test.js (Issue424)
// `m2slide.sh --lint-deployment <경로>` 가 --link 로 올린 심링크 프로젝트도 실제로 검사하는지 본다.
// find 는 시작 경로의 심링크를 따라가지 않아(-P 기본) 링크 프로젝트를 0개 검사하고 «위반 0» 을 냈다.
//
// Run: node --test lib/__tests__/lint-deployment.test.js

'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const M2SLIDE = path.resolve(__dirname, '..', '..', 'm2slide.sh');

function mkProject(tmp, name, html) {
  const p = path.join(tmp, name);
  fs.mkdirSync(path.join(p, 'slide'), { recursive: true });
  if (html !== undefined) fs.writeFileSync(path.join(p, 'slide', 'index.html'), html);
  return p;
}

function lint(target) {
  const r = spawnSync('bash', [M2SLIDE, '--lint-deployment', target], { encoding: 'utf-8' });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

const BAD = '<img src="http://localhost:9877/x.png">';
const GOOD = '<img src="./img/x.png">';

test('실디렉토리 프로젝트의 위반을 잡는다 (기준선)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'm2-lint-'));
  const r = lint(mkProject(tmp, 'real', BAD));
  assert.strictEqual(r.code, 1, r.out);
});

test('심링크로 올린 프로젝트도 따라 들어가 위반을 잡는다', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'm2-lint-'));
  const real = mkProject(tmp, 'deckBad', BAD);
  const link = path.join(tmp, 'linkBad');
  fs.symlinkSync(real, link);
  const r = lint(link);
  assert.strictEqual(r.code, 1, `심링크 경유 위반을 놓쳤다:\n${r.out}`);
});

test('심링크 프로젝트가 깨끗하면 통과하고 검사한 파일 수를 알린다', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'm2-lint-'));
  const real = mkProject(tmp, 'deckGood', GOOD);
  const link = path.join(tmp, 'linkGood');
  fs.symlinkSync(real, link);
  const r = lint(link);
  assert.strictEqual(r.code, 0, r.out);
  assert.match(r.out, /검사 1개/);
});

test('검사할 slide/*.html 이 0개면 «위반 없음» 이 아니라 없다고 알린다', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'm2-lint-'));
  const r = lint(mkProject(tmp, 'unbuilt'));
  assert.strictEqual(r.code, 0, r.out);
  assert.match(r.out, /검사할 slide\/\*\.html 없음/);
  assert.doesNotMatch(r.out, /No deployment violations/);
});
