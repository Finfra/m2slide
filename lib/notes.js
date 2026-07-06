'use strict';

const fs = require('fs');
const path = require('path');

// Issue256: 발표자 노트를 슬라이드 본문과 분리된 `{stem}_note.md`에서 읽어
// `## {slide-id}` 헤더 기준으로 Map<slide-id, rawMarkdownText>를 만든다.
// slide-id는 `#id-{slug}` 디렉티브(lib/slide-parser.js)와 동일 화이트리스트를 공유.
// 설계 SSOT: _doc_arch/speaker-notes-design.md

const NOTE_HEADER_RE = /^##\s+([a-z][a-z0-9-]*)\s*$/;

// mdFilePath와 같은 디렉토리의 `{stem}_note.md`를 찾아 파싱한다.
// 파일이 없으면 null. `.ppt.md` 파생본은 정규화된 stem(확장자 제거된 원본 basename)을 그대로 넘겨야 함
// — 호출부(html-builder.js)가 이미 `.ppt.md` → `.md` 정규화를 수행하므로 여기서는 재정규화하지 않는다.
function loadNoteSource(mdFilePath) {
  const dir = path.dirname(mdFilePath);
  const stem = path.basename(mdFilePath, '.md');
  const notePath = path.join(dir, `${stem}_note.md`);
  if (!fs.existsSync(notePath)) return null;

  const raw = fs.readFileSync(notePath, 'utf-8');
  const lines = raw.split('\n');
  const map = new Map();
  let currentId = null;
  let buf = [];

  function flush() {
    if (currentId) map.set(currentId, buf.join('\n').trim());
    buf = [];
  }

  for (const line of lines) {
    const m = line.match(NOTE_HEADER_RE);
    if (m) {
      flush();
      currentId = m[1];
    } else if (currentId) {
      buf.push(line);
    }
  }
  flush();

  return map.size > 0 ? map : null;
}

module.exports = { loadNoteSource };
