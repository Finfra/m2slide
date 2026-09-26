// sync-projects-md.test.js (Issue416)
// Projects.md `경로` 열 = 외부 마운트의 유일한 기록. sync 가 심링크를 표대로 복원·흡수하고
// 실디렉토리는 건드리지 않는지 임시 루트에서 검증한다.
//
// Run: node --test lib/__tests__/sync-projects-md.test.js

'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT = path.resolve(__dirname, '..', 'sync-projects-md.js');

// 안전장치: 루트 주입(M2SLIDE_ROOT)을 모르는 스크립트를 실행하면 임시 루트가 아니라 **실제 repo** 의
// Projects.md·Projects/.gitignore·Projects_org.md 를 고쳐 쓴다(2026-09-26 실발생). 실행 전에 막는다.
if (!fs.readFileSync(SCRIPT, 'utf-8').includes('M2SLIDE_ROOT')) {
  throw new Error(`${SCRIPT} 가 M2SLIDE_ROOT 를 지원하지 않음 — 실제 repo 오염을 막기 위해 테스트를 실행하지 않는다`);
}

// 임시 m2slide 루트 — Projects/ + Projects.md(활성 표 헤더만) + 외부 폴더
function mkRoot(rows = []) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'm2slide-sync-'));
  const root = path.join(tmp, 'repo');
  fs.mkdirSync(path.join(root, 'Projects'), { recursive: true });
  const header = '| 분류 | 프로젝트 | 경로 | 버전 | 설명 | Manual Check | publishing | 작업 |';
  const sep = '| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |';
  fs.writeFileSync(path.join(root, 'Projects.md'),
    ['# 개요', '', '# 활성 프로젝트', '', header, sep, ...rows, ''].join('\n'));
  return { tmp, root };
}

function mkExt(tmp, name) {
  const p = path.join(tmp, 'outside', name);
  fs.mkdirSync(p, { recursive: true });
  return fs.realpathSync(p);
}

function run(root, ...args) {
  const r = spawnSync('node', [SCRIPT, ...args], {
    env: { ...process.env, M2SLIDE_ROOT: root }, encoding: 'utf-8',
  });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

// 활성 표 → [{name, path, ...}] (헤더 이름 기반)
function activeRows(root, header = '# 활성 프로젝트') {
  const lines = fs.readFileSync(path.join(root, 'Projects.md'), 'utf-8').split('\n');
  let i = lines.findIndex((l) => l.trim() === header);
  if (i < 0) return [];
  while (!lines[++i].trim().startsWith('|'));
  const split = (l) => l.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
  const cols = split(lines[i]);
  i += 2;
  const out = [];
  while (i < lines.length && lines[i].trim().startsWith('|')) {
    const cells = split(lines[i]);
    out.push(Object.fromEntries(cols.map((c, k) => [c, cells[k] || ''])));
    i++;
  }
  return out;
}

const link = (root, tok) => path.join(root, 'Projects', tok);

test('표에 없는 기존 심링크는 경로를 시드해 행으로 흡수한다', () => {
  const { tmp, root } = mkRoot();
  const ext = mkExt(tmp, 'extA');
  fs.symlinkSync(ext, link(root, 'extA'));
  const r = run(root);
  assert.strictEqual(r.code, 0, r.out);
  const row = activeRows(root).find((x) => x['프로젝트'] === 'extA');
  assert.ok(row, 'extA 행이 생겨야 한다');
  assert.strictEqual(row['경로'], ext);
});

test('경로 있는 행의 심링크가 없으면 만든다 (다른 머신 복원)', () => {
  const { tmp, root } = mkRoot();
  const ext = mkExt(tmp, 'extB');
  fs.writeFileSync(path.join(root, 'Projects.md'),
    fs.readFileSync(path.join(root, 'Projects.md'), 'utf-8')
      .replace(/\n$/, `\n| lec | extB | ${ext} | | | | x | |\n`));
  const r = run(root);
  assert.strictEqual(r.code, 0, r.out);
  assert.ok(fs.lstatSync(link(root, 'extB')).isSymbolicLink());
  assert.strictEqual(fs.realpathSync(link(root, 'extB')), ext);
});

test('심링크가 다른 곳을 가리키면 표 경로로 재지정한다', () => {
  const { tmp, root } = mkRoot();
  const want = mkExt(tmp, 'want');
  const wrong = mkExt(tmp, 'wrong');
  fs.symlinkSync(wrong, link(root, 'extC'));
  fs.writeFileSync(path.join(root, 'Projects.md'),
    fs.readFileSync(path.join(root, 'Projects.md'), 'utf-8')
      .replace(/\n$/, `\n| | extC | ${want} | | | | | |\n`));
  assert.strictEqual(run(root).code, 0);
  assert.strictEqual(fs.realpathSync(link(root, 'extC')), want);
});

test('같은 이름의 실디렉토리는 절대 건드리지 않는다', () => {
  const { tmp, root } = mkRoot();
  const ext = mkExt(tmp, 'extD');
  fs.mkdirSync(link(root, 'extD'));
  fs.writeFileSync(path.join(link(root, 'extD'), 'keep.md'), 'x');
  fs.writeFileSync(path.join(root, 'Projects.md'),
    fs.readFileSync(path.join(root, 'Projects.md'), 'utf-8')
      .replace(/\n$/, `\n| | extD | ${ext} | | | | | |\n`));
  const r = run(root);
  assert.ok(!fs.lstatSync(link(root, 'extD')).isSymbolicLink());
  assert.ok(fs.existsSync(path.join(link(root, 'extD'), 'keep.md')));
  assert.match(r.out, /실디렉토리/);
});

test('경로가 없으면(볼륨 미마운트) 경고만 하고 행을 활성에 남긴다', () => {
  const { tmp, root } = mkRoot();
  const gone = path.join(tmp, 'unmounted', 'extE');
  fs.writeFileSync(path.join(root, 'Projects.md'),
    fs.readFileSync(path.join(root, 'Projects.md'), 'utf-8')
      .replace(/\n$/, `\n| lec | extE | ${gone} | 1.0 | 설명 | | x | |\n`));
  const r = run(root);
  assert.strictEqual(r.code, 0, r.out);
  assert.match(r.out, /경로 없음/);
  const row = activeRows(root).find((x) => x['프로젝트'] === 'extE');
  assert.ok(row, '활성 행이 유지돼야 한다');
  assert.strictEqual(row['설명'], '설명');
  assert.ok(!fs.existsSync(link(root, 'extE')));
});

test('--link 는 행을 추가하고 심링크를 만든다 (멱등)', () => {
  const { tmp, root } = mkRoot();
  const ext = mkExt(tmp, 'extF');
  assert.strictEqual(run(root, '--link', ext, 'tokF').code, 0);
  assert.strictEqual(fs.realpathSync(link(root, 'tokF')), ext);
  assert.strictEqual(activeRows(root).find((x) => x['프로젝트'] === 'tokF')['경로'], ext);
  assert.strictEqual(run(root, '--link', ext, 'tokF').code, 0);
  assert.strictEqual(activeRows(root).filter((x) => x['프로젝트'] === 'tokF').length, 1);
});

test('--unlink 는 심링크만 지우고 행을 비활성으로 옮긴다 — 다음 sync 가 되살리지 않는다', () => {
  const { tmp, root } = mkRoot();
  const ext = mkExt(tmp, 'extG');
  fs.writeFileSync(path.join(ext, 'src.md'), 'keep');
  run(root, '--link', ext, 'tokG');
  const r = run(root, '--unlink', 'tokG');
  assert.strictEqual(r.code, 0, r.out);
  assert.ok(!fs.existsSync(link(root, 'tokG')));
  assert.ok(fs.existsSync(path.join(ext, 'src.md')), '원본은 남아야 한다');
  assert.ok(!activeRows(root).some((x) => x['프로젝트'] === 'tokG'));
  assert.ok(activeRows(root, '# 비활성 프로젝트 (z_done)').some((x) => x['프로젝트'] === 'tokG'));
  run(root);
  assert.ok(!fs.existsSync(link(root, 'tokG')), 'sync 가 해제된 마운트를 되살리면 안 된다');
});

test('--unlink 는 실디렉토리를 거부한다', () => {
  const { root } = mkRoot();
  fs.mkdirSync(link(root, 'realH'));
  const r = run(root, '--unlink', 'realH');
  assert.notStrictEqual(r.code, 0);
  assert.ok(fs.existsSync(link(root, 'realH')));
});

test('구 7열 표(경로 열 없음)를 읽어 경로 열을 끼워 넣고 사람 열을 보존한다', () => {
  const { tmp, root } = mkRoot();
  fs.mkdirSync(link(root, 'localI'));
  const ext = mkExt(tmp, 'extI');
  fs.symlinkSync(ext, link(root, 'extI'));
  fs.writeFileSync(path.join(root, 'Projects.md'), [
    '# 활성 프로젝트', '',
    '| 분류 | 프로젝트 | 버전 | 설명 | Manual Check | publishing | 작업 |',
    '| :-- | :-- | :-- | :-- | :-- | :-- | :-- |',
    '| m2 | localI | 1.0 | 로컬 설명 | o | o | 메모 |',
    '| lec | extI | 2.0 | 외부 설명 | | x | |', '',
  ].join('\n'));
  assert.strictEqual(run(root).code, 0);
  const rows = activeRows(root);
  const loc = rows.find((x) => x['프로젝트'] === 'localI');
  assert.strictEqual(loc['경로'], '');
  assert.strictEqual(loc['설명'], '로컬 설명');
  assert.strictEqual(loc['작업'], '메모');
  assert.strictEqual(rows.find((x) => x['프로젝트'] === 'extI')['경로'], ext);
});

test('sync 후 --check 는 변경 없음(rc0)', () => {
  const { tmp, root } = mkRoot();
  fs.symlinkSync(mkExt(tmp, 'extJ'), link(root, 'extJ'));
  fs.mkdirSync(link(root, 'localJ'));
  run(root);
  const r = run(root, '--check');
  assert.strictEqual(r.code, 0, r.out);
});
