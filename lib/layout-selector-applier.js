'use strict';

// Issue155: layout-selector agent의 JSON 출력을 입력 .md에 적용하여 .ppt.md 생성.
//
// 입력: 원본 .md 본문 (Frontmatter 포함), agent JSON (slides 배열)
// 출력: .ppt.md 본문 — 슬라이드별 #layout-{name} 메타 주입 (사용자 수동 메타 보존)
//
// 사용 예:
//   const { applyLayoutSelection, hasManualLayoutMeta, injectLayoutMeta } = require('./layout-selector-applier');
//   const out = applyLayoutSelection(originalMd, agentJson, { force: false });
//   fs.writeFileSync('output.ppt.md', out);

const LAYOUT_META_RE = /^#layout-_?[a-z][a-z0-9_-]*$/;
const DIRECTIVE_RE = /^#(layout|transition|background-color|background-transition|background-image|background-size|auto-animate|autoslide)(-_?[a-z][a-z0-9_-]*|-[a-z0-9.\/:_-]+|)$/;

function splitFrontmatter(content) {
  if (!content.startsWith('---')) {
    return { frontmatter: '', body: content };
  }
  const end = content.indexOf('\n---', 3);
  if (end === -1) {
    return { frontmatter: '', body: content };
  }
  const frontmatter = content.slice(0, end + 4);
  const body = content.slice(end + 4).replace(/^\n+/, '');
  return { frontmatter, body };
}

function splitSlides(body) {
  return body.split(/\n---\n/);
}

function joinSlides(slides) {
  return slides.join('\n---\n');
}

function hasManualLayoutMeta(slideText) {
  const lines = slideText.split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === '') continue;
    if (LAYOUT_META_RE.test(line)) return true;
    if (DIRECTIVE_RE.test(line)) continue;
    if (/^#{1,6}\s/.test(rawLine)) continue;
    return false;
  }
  return false;
}

function injectLayoutMeta(slideText, layoutName) {
  if (hasManualLayoutMeta(slideText)) {
    return slideText;
  }

  const directive = `#layout-${layoutName}`;
  const lines = slideText.split('\n');
  let insertAt = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const t = raw.trim();
    if (t === '') {
      insertAt = i + 1;
      continue;
    }
    if (DIRECTIVE_RE.test(t)) {
      insertAt = i + 1;
      continue;
    }
    break;
  }

  const before = lines.slice(0, insertAt);
  const after = lines.slice(insertAt);

  const out = [...before, directive];
  if (after.length > 0 && after[0].trim() !== '') {
    out.push('');
  }
  out.push(...after);
  return out.join('\n');
}

function applyLayoutSelection(originalMd, agentJson, options = {}) {
  const { frontmatter, body } = splitFrontmatter(originalMd);
  const slides = splitSlides(body);

  const slidesByIndex = new Map();
  if (agentJson && Array.isArray(agentJson.slides)) {
    for (const s of agentJson.slides) {
      slidesByIndex.set(s.index, s.layout);
    }
  }

  const validLayouts = options.validLayouts || null;

  const newSlides = slides.map((slideText, i) => {
    const index = i + 1;
    const hasManual = hasManualLayoutMeta(slideText);

    if (hasManual && !options.force) {
      return slideText;
    }

    const recommended = slidesByIndex.get(index);
    if (!recommended) {
      return slideText;
    }

    if (validLayouts && !validLayouts.includes(recommended) && !validLayouts.includes(recommended.replace(/^_/, '')) && !validLayouts.includes('_' + recommended)) {
      process.stderr.write(`⚠️ slide ${index}: layout '${recommended}' not in whitelist — skip\n`);
      return slideText;
    }

    if (hasManual && options.force) {
      return _replaceLayoutMeta(slideText, recommended);
    }

    return injectLayoutMeta(slideText, recommended);
  });

  const newBody = joinSlides(newSlides);
  return frontmatter ? `${frontmatter}\n${newBody}` : newBody;
}

function _replaceLayoutMeta(slideText, newLayout) {
  const lines = slideText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (LAYOUT_META_RE.test(lines[i].trim())) {
      lines[i] = `#layout-${newLayout}`;
      return lines.join('\n');
    }
  }
  return slideText;
}

module.exports = {
  splitFrontmatter,
  splitSlides,
  joinSlides,
  hasManualLayoutMeta,
  injectLayoutMeta,
  applyLayoutSelection,
  LAYOUT_META_RE,
  DIRECTIVE_RE,
};
