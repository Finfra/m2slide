// authoring-pipeline v2 단위 검증
// node --test lib/__tests__/pipeline-v2.test.js

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const state = require('../pipeline-state');
const history = require('../pipeline-history');
const artifacts = require('../pipeline-artifacts');

// 테스트는 임시 프로젝트명 사용. m2slide 본체에 영향 없음.
const TEST_PROJECT = `__v2test_${process.pid}`;

function cleanup() {
  const dir = state.pipelineDir(TEST_PROJECT);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

test('state.yml round-trip', () => {
  cleanup();
  const init = state.defaultState(TEST_PROJECT);
  state.saveState(TEST_PROJECT, init);
  const loaded = state.loadState(TEST_PROJECT);
  assert.equal(loaded.project, TEST_PROJECT);
  assert.equal(loaded.current_stage, 1);
  assert.equal(loaded.last_completed_stage, 0);
  assert.deepEqual(loaded.checkpoints_acked, []);
  cleanup();
});

test('acquireLock + releaseLock', () => {
  cleanup();
  const ok = state.acquireLock(TEST_PROJECT);
  assert.equal(ok, true);
  const s = state.loadState(TEST_PROJECT);
  assert.equal(s.locked, true);
  assert.equal(s.lock_pid, process.pid);
  state.releaseLock(TEST_PROJECT);
  const s2 = state.loadState(TEST_PROJECT);
  assert.equal(s2.locked, false);
  assert.equal(s2.lock_pid, null);
  cleanup();
});

test('markStageComplete 단계 진행', () => {
  cleanup();
  state.saveState(TEST_PROJECT, state.defaultState(TEST_PROJECT));
  state.markStageComplete(TEST_PROJECT, 1);
  let s = state.loadState(TEST_PROJECT);
  assert.equal(s.last_completed_stage, 1);
  assert.equal(s.current_stage, 2);
  state.markStageComplete(TEST_PROJECT, 2);
  state.markStageComplete(TEST_PROJECT, 3);
  s = state.loadState(TEST_PROJECT);
  assert.equal(s.last_completed_stage, 3);
  assert.equal(s.current_stage, 4);
  cleanup();
});

test('markCheckpointAcked 누적', () => {
  cleanup();
  state.saveState(TEST_PROJECT, state.defaultState(TEST_PROJECT));
  state.markCheckpointAcked(TEST_PROJECT, 4);
  state.markCheckpointAcked(TEST_PROJECT, 5);
  state.markCheckpointAcked(TEST_PROJECT, 4); // 중복
  const s = state.loadState(TEST_PROJECT);
  assert.deepEqual(s.checkpoints_acked.sort(), [4, 5]);
  cleanup();
});

test('history.md append-only', () => {
  cleanup();
  history.appendStart(TEST_PROJECT, 1, 'info-filler', 'questions.yml');
  history.appendEnd(TEST_PROJECT, 1, ['Info.md'], 'PASS', '01-stage');
  history.appendError(TEST_PROJECT, 2, 'network timeout');
  const text = fs.readFileSync(history.historyPath(TEST_PROJECT), 'utf8');
  assert.ok(text.includes('[stage 1] start'));
  assert.ok(text.includes('[stage 1] end'));
  assert.ok(text.includes('[stage 2] error'));
  assert.ok(text.includes('network timeout'));
  cleanup();
});

test('artifacts.snapshotStage 작은 파일 복사', () => {
  cleanup();
  const tmpFile = path.join(os.tmpdir(), `v2test-${process.pid}.md`);
  fs.writeFileSync(tmpFile, '# test\n\nsmall content\n');
  const stageDir = artifacts.snapshotStage(TEST_PROJECT, 1, [tmpFile]);
  const copied = path.join(stageDir, path.basename(tmpFile));
  assert.ok(fs.existsSync(copied));
  const manifest = path.join(stageDir, '_manifest.yml');
  assert.ok(fs.existsSync(manifest));
  const mtext = fs.readFileSync(manifest, 'utf8');
  assert.ok(mtext.includes('stage: 1'));
  fs.unlinkSync(tmpFile);
  cleanup();
});

test('yaml 파서 round-trip — flat scalar + array', () => {
  const obj = {
    project: 'foo',
    current_stage: 5,
    locked: true,
    checkpoints_acked: [4, 5, 7],
    last_run_status: 'success',
    last_run_at: null,
  };
  const text = state.stringifySimpleYaml(obj);
  const parsed = state.parseSimpleYaml(text);
  assert.equal(parsed.project, 'foo');
  assert.equal(parsed.current_stage, 5);
  assert.equal(parsed.locked, true);
  assert.deepEqual(parsed.checkpoints_acked, [4, 5, 7]);
  assert.equal(parsed.last_run_status, 'success');
  assert.equal(parsed.last_run_at, null);
});
