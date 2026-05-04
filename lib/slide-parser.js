'use strict';

const fs = require('fs');
const { isVideoUrl } = require('./markdown');

// Issue81: 슬라이드 raw 텍스트에서 layout 메타 추출 (방어적 파서)
// 매칭 규칙: 첫 비어있지 않은 라인이 다음 형태일 때만 layout으로 인식
//   정식: `#layout-name` (설계 문서 _doc_design/theme_layout.md §6 표준)
//   alias: `#name`         (이전 형식, 하위 호환 유지)
//   허용: `#layout-contents`, `#layout-_blank`, `#contents`, `#_toc`, `#my-layout`
//   불허: `# contents` (공백), `## sub` (H2), `#한글`, `#My` (대문자) → 본문 통과
function extractLayoutMeta(rawSlideText) {
  const lines = rawSlideText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue;
    const m = line.match(/^#(?:layout-)?(_?[a-z][a-z0-9-]*)\s*$/);
    if (m) {
      const remaining = lines.slice(i + 1).join('\n').replace(/^\s*\n/, '');
      return { layout: m[1], text: remaining };
    }
    return { layout: null, text: rawSlideText };
  }
  return { layout: null, text: rawSlideText };
}

function extractFirstH1(text) {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^#\s+(.+)$/);
    if (m) {
      const remaining = lines.slice(0, i).concat(lines.slice(i + 1)).join('\n');
      return { title: m[1].trim(), body: remaining };
    }
  }
  return { title: '', body: text };
}

function getTopHeadingLevel(text) {
  const m = text.match(/^(#{1,6}) /m);
  return m ? m[1].length : null;
}

function extractFirstHeading(text) {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^#{1,6}\s+(.+)$/);
    if (m) {
      const remaining = lines.slice(0, i).concat(lines.slice(i + 1)).join('\n');
      return { title: m[1].trim(), body: remaining };
    }
  }
  return { title: '', body: text };
}

function isImageOnlySlide(text) {
  const meaningful = text.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith('<!--'));
  if (meaningful.length !== 1) return false;
  const m = meaningful[0].match(/^!\[[^\]]*\]\(([^)]+)\)\s*$/);
  if (!m) return false;
  return !isVideoUrl(m[1]);
}

function isVideoOnlySlide(text) {
  const meaningful = text.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith('<!--'));
  if (meaningful.length !== 1) return false;
  const m = meaningful[0].match(/^!\[[^\]]*\]\(([^)]+)\)\s*$/);
  if (!m) return false;
  return isVideoUrl(m[1]);
}

function hasEmptyTitle(text) {
  const lines = text.split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith('<!--')) continue;
    if (/^#{1,3}\s*$/.test(t)) return true;
    if (/^#{1,3}\s+\S/.test(t)) return false;
    return true;
  }
  return false;
}

function stripEmptyLeadingHeader(text) {
  const lines = text.split('\n');
  const out = [];
  let stripped = false;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!stripped) {
      if (t === '') { out.push(lines[i]); continue; }
      if (t.startsWith('<!--')) { out.push(lines[i]); continue; }
      if (/^#{1,3}\s*$/.test(t)) { stripped = true; continue; }
      out.push(lines[i]);
      stripped = true;
      continue;
    }
    out.push(lines[i]);
  }
  return out.join('\n').replace(/^\n+/, '');
}

function extractSlots(slideMarkdown) {
  const slots = {};
  let content = slideMarkdown;
  const re = /^:::\s+([a-z][a-zA-Z0-9-]*)\s*\n([\s\S]*?)\n:::\s*$/gm;
  content = content.replace(re, (_, name, body) => {
    slots[name] = body.trim();
    return '';
  });
  return { content: content.trim(), slots };
}

function isTable(content) {
  const withoutCodeBlocks = content.replace(/```[\s\S]*?```/g, '');
  if (!withoutCodeBlocks.includes('|')) return false;
  const lines = withoutCodeBlocks.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^\s*\|?[\s\-:|]+\|\s*$/)) return true;
  }
  return false;
}

function hasTextContent(markdown) {
  const diagramLangs = [
    'mermaid', 'blockdiag', 'seqdiag', 'actdiag', 'nwdiag', 'packetdiag', 'rackdiag',
    'ditaa', 'dot', 'graphviz', 'vega', 'vegalite', 'plantuml'
  ];
  let cleanedMarkdown = markdown.replace(/```(\w+)?[\s\S]*?```/g, (match, lang) => {
    if (lang && diagramLangs.includes(lang.toLowerCase())) return '';
    return match;
  });
  const lines = cleanedMarkdown.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) continue;
    if (trimmed.match(/^!\[.*\]\(.*\)$/)) continue;
    if (trimmed.startsWith('<!--')) continue;
    return true;
  }
  return false;
}

function parseMarkdownFile(filePath, autoLayoutDetect = true, tocPlaceholder = false) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let yamlTitle = null;
  let yamlSubtitle = null;
  let yamlAuthor = null;
  let yamlSlogan = null;
  let yamlTocPlaceholder = false;

  if (content.startsWith('---')) {
    const end = content.indexOf('\n---', 3);
    if (end !== -1) {
      const yaml = content.slice(4, end);
      const titleMatch = yaml.match(/^title:\s*(.+)$/m);
      if (titleMatch) yamlTitle = titleMatch[1].trim();
      const subtitleMatch = yaml.match(/^subtitle:\s*(.+)$/m);
      if (subtitleMatch) yamlSubtitle = subtitleMatch[1].trim();
      const authorMatch = yaml.match(/^author:\s*(.+)$/m);
      if (authorMatch) yamlAuthor = authorMatch[1].trim();
      const sloganMatch = yaml.match(/^slogan:\s*(.+)$/m);
      if (sloganMatch) yamlSlogan = sloganMatch[1].trim();
      const tocMatch = yaml.match(/^toc_placeholder:\s*(.+)$/m);
      if (tocMatch) {
        const v = tocMatch[1].split('#')[0].trim().toLowerCase();
        yamlTocPlaceholder = (v === 'true' || v === 'yes' || v === '1');
      }
      content = content.slice(end + 4).trim();
    }
  }

  const useTocPlaceholder = tocPlaceholder || yamlTocPlaceholder;
  const slides = content.split(/\n---\n/).map(slide => slide.trim());

  if (useTocPlaceholder) slides.unshift('');

  let currentChapterTitle = '';

  const slideObjects = slides.map((slide, index) => {
    const h1Match = slide.match(/^# (.+)$/m);
    if (h1Match) currentChapterTitle = h1Match[1];

    if (index === 0 && useTocPlaceholder) {
      let title = yamlTitle;
      if (!title) {
        const firstH1 = slides.slice(1).map(s => s.match(/^# (.+)$/m)).find(Boolean);
        title = firstH1 ? firstH1[1] : 'Slide';
      }
      return { title, subtitle: yamlSubtitle, author: yamlAuthor, slogan: yamlSlogan, content: slide, isTitle: true, chapterTitle: '' };
    }

    const { layout: explicitLayout, text: textForSlide } = extractLayoutMeta(slide);
    let layout = explicitLayout;
    let autoBody = null;
    let autoFullImage = false;
    let autoFullVideo = false;

    if (isTable(textForSlide)) {
      return { content: textForSlide, isTable: true, chapterTitle: currentChapterTitle, layout };
    }

    if (!layout && autoLayoutDetect) {
      if (isImageOnlySlide(textForSlide)) {
        layout = '_blank';
        autoBody = textForSlide;
        autoFullImage = true;
      } else if (isVideoOnlySlide(textForSlide)) {
        layout = '_blank';
        autoBody = textForSlide;
        autoFullVideo = true;
      } else if (hasEmptyTitle(textForSlide)) {
        layout = '_contents_no_title';
        autoBody = stripEmptyLeadingHeader(textForSlide);
      }
    }

    let slideTitle = '';
    let rawMarkdown = textForSlide;
    if (layout) {
      if (autoBody !== null) {
        slideTitle = '';
        rawMarkdown = autoBody;
      } else {
        const extracted = extractFirstH1(textForSlide);
        slideTitle = extracted.title;
        rawMarkdown = extracted.body;
      }
    }

    return {
      content: textForSlide,
      rawMarkdown,
      title: slideTitle,
      layout,
      autoFullImage,
      autoFullVideo,
      chapterTitle: currentChapterTitle,
      hasText: hasTextContent(textForSlide)
    };
  });

  slideObjects.forEach((s, i) => {
    if (s.isTitle || s.isTable) return;
    if (s.layout) return;

    const level = getTopHeadingLevel(s.content);
    if (level === null) return;

    const children = [];
    for (let j = i + 1; j < slideObjects.length; j++) {
      const nextLevel = getTopHeadingLevel(slideObjects[j].content);
      if (nextLevel === null) continue;
      if (nextLevel <= level) break;
      if (nextLevel === level + 1) {
        const m = slideObjects[j].content.match(/^#{1,6}\s+(.+)$/m);
        if (m) children.push({ title: m[1].trim(), index: j, slideRef: slideObjects[j] });
      }
    }

    if (children.length > 0) {
      s.children = children;
      s.layout = '_toc';
      s.autoToc = true;
      const extracted = extractFirstHeading(s.content);
      s.title = extracted.title;
      s.rawMarkdown = extracted.body;
    }
  });

  return slideObjects;
}

module.exports = {
  parseMarkdownFile,
  extractLayoutMeta,
  extractFirstH1,
  extractSlots,
  isImageOnlySlide,
  isVideoOnlySlide,
  hasEmptyTitle,
  stripEmptyLeadingHeader,
  isTable,
  hasTextContent
};
