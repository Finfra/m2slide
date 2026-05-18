// authoring-pipeline v2: history.md append-only 로그
//
// _doc_work/pipeline/<Name>/history.md
// 각 entry는 ISO8601 + 단계 + 액션 + 결과

const fs = require('fs');
const path = require('path');
const { pipelineDir } = require('./pipeline-state');

function historyPath(projectName) {
  return path.join(pipelineDir(projectName), 'history.md');
}

function ensureHistory(projectName) {
  const p = historyPath(projectName);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, `---\nname: ${projectName}-history\ndescription: authoring-pipeline v2 진행 로그 (append-only)\n---\n\n# 진행 로그\n\n`);
  }
}

function appendEntry(projectName, content) {
  ensureHistory(projectName);
  fs.appendFileSync(historyPath(projectName), content);
}

function nowIso() {
  return new Date().toISOString();
}

function appendStart(projectName, stage, delegate, inputDesc) {
  const block = `## ${nowIso()} [stage ${stage}] start\n* 위임: ${delegate}\n* 입력: ${inputDesc || '(기본)'}\n\n`;
  appendEntry(projectName, block);
}

function appendEnd(projectName, stage, outputs, verification, artifactPath) {
  const outList = Array.isArray(outputs) ? outputs.map(o => `    - ${o}`).join('\n') : `    - ${outputs}`;
  const block = `## ${nowIso()} [stage ${stage}] end\n* 산출물:\n${outList}\n* 검증: ${verification || 'PASS'}\n* artifact: ${artifactPath || '(없음)'}\n\n`;
  appendEntry(projectName, block);
}

function appendError(projectName, stage, reason) {
  const block = `## ${nowIso()} [stage ${stage}] error\n* 사유: ${reason}\n\n`;
  appendEntry(projectName, block);
}

function appendCheckpoint(projectName, stage, action) {
  const block = `## ${nowIso()} [stage ${stage}] checkpoint-${action}\n\n`;
  appendEntry(projectName, block);
}

module.exports = {
  historyPath,
  appendStart,
  appendEnd,
  appendError,
  appendCheckpoint,
};
