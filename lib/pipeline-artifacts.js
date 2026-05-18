// authoring-pipeline v2: artifacts/ 스냅샷 저장
//
// 작은 텍스트는 복사, 큰 바이너리는 매니페스트 yml + md5만 기록

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pipelineDir, stringifySimpleYaml } = require('./pipeline-state');

const MAX_INLINE_BYTES = 256 * 1024;  // 256KB 이하는 직접 복사

function artifactsDir(projectName) {
  return path.join(pipelineDir(projectName), 'artifacts');
}

function md5File(p) {
  const buf = fs.readFileSync(p);
  return crypto.createHash('md5').update(buf).digest('hex');
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function copySmall(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(s, d);
    } else if (entry.isFile()) {
      const st = fs.statSync(s);
      if (st.size <= MAX_INLINE_BYTES) {
        fs.copyFileSync(s, d);
      } else {
        // 큰 파일은 매니페스트로 대체
        const manifestPath = d + '.manifest.yml';
        fs.writeFileSync(manifestPath, stringifySimpleYaml({
          path: s,
          size: st.size,
          md5: md5File(s),
          created_at: new Date().toISOString(),
        }));
      }
    }
  }
}

// snapshotStage(projectName, stage, sourcePaths) -> artifactPath
// sourcePaths: 절대경로 배열. 파일 또는 폴더.
function snapshotStage(projectName, stage, sourcePaths) {
  const base = artifactsDir(projectName);
  const stageDir = path.join(base, `${pad2(stage)}-stage`);
  fs.mkdirSync(stageDir, { recursive: true });
  const manifest = {
    stage,
    captured_at: new Date().toISOString(),
    sources: [],
  };
  for (const src of sourcePaths) {
    if (!fs.existsSync(src)) continue;
    const st = fs.statSync(src);
    const name = path.basename(src);
    const dest = path.join(stageDir, name);
    if (st.isDirectory()) {
      copyDirRecursive(src, dest);
      manifest.sources.push(`${name}/ (dir)`);
    } else if (st.size <= MAX_INLINE_BYTES) {
      copySmall(src, dest);
      manifest.sources.push(`${name} (${st.size} bytes)`);
    } else {
      const manifestFile = dest + '.manifest.yml';
      fs.writeFileSync(manifestFile, stringifySimpleYaml({
        path: src,
        size: st.size,
        md5: md5File(src),
        created_at: new Date().toISOString(),
      }));
      manifest.sources.push(`${name} (manifest, ${st.size} bytes)`);
    }
  }
  // stage 매니페스트 (단순 인덱스)
  const manifestPath = path.join(stageDir, '_manifest.yml');
  const lines = ['---', `stage: ${stage}`, `captured_at: ${manifest.captured_at}`, 'sources:'];
  for (const s of manifest.sources) lines.push(`  - ${s}`);
  fs.writeFileSync(manifestPath, lines.join('\n') + '\n');
  return stageDir;
}

module.exports = {
  artifactsDir,
  snapshotStage,
  md5File,
  MAX_INLINE_BYTES,
};
