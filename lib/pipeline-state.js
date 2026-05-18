// authoring-pipeline v2: state.yml 관리 모듈
// _doc_work/pipeline/<Name>/state.yml 영속 추적 + lock
//
// 외부 의존 없음. 단순 yaml subset 파서 (flat scalar + array of scalar).

const fs = require('fs');
const path = require('path');

const M2SLIDE_ROOT = path.resolve(__dirname, '..');

function pipelineDir(projectName) {
  return path.join(M2SLIDE_ROOT, '_doc_work', 'pipeline', projectName);
}

function statePath(projectName) {
  return path.join(pipelineDir(projectName), 'state.yml');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

// 간단한 yaml flat parser — key: value, key: [a, b], --- 처리
function parseSimpleYaml(text) {
  const obj = {};
  const lines = text.split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line === '---' || line.startsWith('#')) continue;
    const m = line.match(/^([a-z_][a-z0-9_]*)\s*:\s*(.*)$/i);
    if (!m) continue;
    const [, key, valRaw] = m;
    let val = valRaw.trim();
    if (val === 'null' || val === '~' || val === '') {
      obj[key] = null;
    } else if (val === 'true') {
      obj[key] = true;
    } else if (val === 'false') {
      obj[key] = false;
    } else if (/^-?\d+$/.test(val)) {
      obj[key] = parseInt(val, 10);
    } else if (val.startsWith('[') && val.endsWith(']')) {
      const inner = val.slice(1, -1).trim();
      obj[key] = inner ? inner.split(',').map(s => {
        const t = s.trim().replace(/^["']|["']$/g, '');
        return /^-?\d+$/.test(t) ? parseInt(t, 10) : t;
      }) : [];
    } else {
      obj[key] = val.replace(/^["']|["']$/g, '');
    }
  }
  return obj;
}

function stringifySimpleYaml(obj) {
  const lines = ['---'];
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) {
      lines.push(`${k}: null`);
    } else if (typeof v === 'boolean' || typeof v === 'number') {
      lines.push(`${k}: ${v}`);
    } else if (Array.isArray(v)) {
      lines.push(`${k}: [${v.map(x => typeof x === 'number' ? x : `"${x}"`).join(', ')}]`);
    } else {
      const s = String(v);
      const needQuote = /[:#\[\]{},&*!|>'"%@`]/.test(s) || /^\s|\s$/.test(s);
      lines.push(needQuote ? `${k}: "${s.replace(/"/g, '\\"')}"` : `${k}: ${s}`);
    }
  }
  return lines.join('\n') + '\n';
}

function loadState(projectName) {
  const p = statePath(projectName);
  if (!fs.existsSync(p)) return null;
  const text = fs.readFileSync(p, 'utf8');
  return parseSimpleYaml(text);
}

function saveState(projectName, state) {
  const p = statePath(projectName);
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, stringifySimpleYaml(state));
}

function defaultState(projectName) {
  return {
    project: projectName,
    current_stage: 1,
    last_completed_stage: 0,
    last_run_at: null,
    last_run_status: 'pending',
    checkpoints_acked: [],
    locked: false,
    lock_pid: null,
    lock_started_at: null,
  };
}

function isPidAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM';
  }
}

function acquireLock(projectName) {
  let state = loadState(projectName);
  if (!state) state = defaultState(projectName);
  if (state.locked && state.lock_pid && isPidAlive(state.lock_pid) && state.lock_pid !== process.pid) {
    return false;
  }
  state.locked = true;
  state.lock_pid = process.pid;
  state.lock_started_at = new Date().toISOString();
  saveState(projectName, state);
  return true;
}

function releaseLock(projectName) {
  const state = loadState(projectName);
  if (!state) return;
  if (state.lock_pid !== process.pid && isPidAlive(state.lock_pid)) {
    // 다른 PID 의 lock — 무단 해제 금지
    return;
  }
  state.locked = false;
  state.lock_pid = null;
  state.lock_started_at = null;
  saveState(projectName, state);
}

function markStageComplete(projectName, stage) {
  let state = loadState(projectName);
  if (!state) state = defaultState(projectName);
  if (stage > state.last_completed_stage) state.last_completed_stage = stage;
  state.current_stage = Math.min(stage + 1, 10);
  state.last_run_at = new Date().toISOString();
  state.last_run_status = 'success';
  saveState(projectName, state);
}

function markCheckpointAcked(projectName, stage) {
  let state = loadState(projectName);
  if (!state) state = defaultState(projectName);
  const acked = state.checkpoints_acked || [];
  if (!acked.includes(stage)) acked.push(stage);
  state.checkpoints_acked = acked;
  saveState(projectName, state);
}

function markFailed(projectName, stage, reason) {
  let state = loadState(projectName);
  if (!state) state = defaultState(projectName);
  state.current_stage = stage;
  state.last_run_at = new Date().toISOString();
  state.last_run_status = 'failed';
  state.last_failure_reason = reason;
  saveState(projectName, state);
}

module.exports = {
  pipelineDir,
  statePath,
  loadState,
  saveState,
  defaultState,
  acquireLock,
  releaseLock,
  markStageComplete,
  markCheckpointAcked,
  markFailed,
  parseSimpleYaml,
  stringifySimpleYaml,
};
