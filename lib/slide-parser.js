'use strict';

const fs = require('fs');
const { isVideoUrl } = require('./markdown');

// Issue81/Issue117: 슬라이드 raw 텍스트에서 디렉티브 메타 추출 (방어적 파서)
// 슬라이드 첫 비공백 라인부터 연속된 디렉티브 라인을 모두 읽고 첫 비-디렉티브 라인 전까지 누적.
// 디렉티브 종류:
//   - `#layout-name` 또는 `#name` → layout (Issue81 호환)
//   - `#transition-{none|fade|slide|convex|concave|zoom}` 선택적 `-{default|fast|slow}` 후행 → transition + transitionSpeed
//   - `#background-color-{hex 6/3 자리 또는 CSS 컬러명}` → backgroundColor (hex는 # 자동 prepend)
//   - `#background-transition-{name}` → backgroundTransition
//   - `#auto-animate` → autoAnimate (값 없는 attribute)
//   - `#autoslide-{ms}` → autoslide (정수)
// 불허: `# contents` (공백), `## sub` (H2), `#한글`, `#My` (대문자) → 본문 통과
// 화이트리스트는 `lib/config.js` `VALID_TRANSITIONS`/`VALID_TRANSITION_SPEEDS`와 동일 (Issue111)
const VALID_TRANSITIONS_DIRECTIVE = ['none', 'fade', 'slide', 'convex', 'concave', 'zoom'];
const VALID_SPEEDS_DIRECTIVE = ['default', 'fast', 'slow'];

function _emptyDirectives() {
  return {
    layout: null,
    transition: null,
    transitionSpeed: null,
    backgroundColor: null,
    backgroundTransition: null,
    autoAnimate: false,
    autoslide: null,
  };
}

function extractDirectives(rawSlideText) {
  const lines = rawSlideText.split('\n');
  const directives = _emptyDirectives();

  // Skip leading blank lines
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i++;

  // Issue117 후속: 슬라이드 첫 비공백 라인이 H1~H6 헤더이면 헤더 + 빈 라인을 skip하고
  // 그 다음에 디렉티브 영역을 매칭. SSOT(_doc_design/animation.md) 예시 형태:
  //   ## 제목
  //   #transition-zoom
  //   #auto-animate
  //
  //   * 본문
  // Case 1 (Issue81 호환: 첫 비공백 라인 자체가 디렉티브)도 그대로 동작.
  let directiveStart = i;
  if (i < lines.length && /^#{1,6}\s+\S/.test(lines[i].trim())) {
    i++;
    while (i < lines.length && lines[i].trim() === '') i++;
    directiveStart = i;
  }

  let consumed = directiveStart;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (line === '') break;
    if (!line.startsWith('#')) break;

    let m;

    // #transition-fade / #transition-fade-fast — transition 화이트리스트
    m = line.match(/^#transition-([a-z]+)(?:-([a-z]+))?\s*$/);
    if (m && VALID_TRANSITIONS_DIRECTIVE.includes(m[1])) {
      const speed = m[2];
      if (!speed || VALID_SPEEDS_DIRECTIVE.includes(speed)) {
        directives.transition = m[1];
        if (speed) directives.transitionSpeed = speed;
        i++; consumed = i; continue;
      }
    }

    // #background-transition-{name}
    m = line.match(/^#background-transition-([a-z]+)\s*$/);
    if (m && VALID_TRANSITIONS_DIRECTIVE.includes(m[1])) {
      directives.backgroundTransition = m[1];
      i++; consumed = i; continue;
    }

    // #background-color-{hex|name}
    m = line.match(/^#background-color-([a-z0-9]+)\s*$/i);
    if (m) {
      let val = m[1];
      // 3 또는 6자리 hex이면 # 자동 prepend
      if (/^[0-9a-f]{3}$|^[0-9a-f]{6}$/i.test(val)) val = '#' + val;
      directives.backgroundColor = val;
      i++; consumed = i; continue;
    }

    // #auto-animate
    if (/^#auto-animate\s*$/.test(line)) {
      directives.autoAnimate = true;
      i++; consumed = i; continue;
    }

    // #autoslide-{ms}
    m = line.match(/^#autoslide-(\d+)\s*$/);
    if (m) {
      directives.autoslide = parseInt(m[1], 10);
      i++; consumed = i; continue;
    }

    // #layout-{name} 정식
    m = line.match(/^#layout-(_?[a-z][a-z0-9-]*)\s*$/);
    if (m) {
      if (!directives.layout) directives.layout = m[1];
      i++; consumed = i; continue;
    }

    // Legacy alias `#name` — 다른 디렉티브로 인식되지 않을 때만 layout으로 처리
    m = line.match(/^#(_?[a-z][a-z0-9-]*)\s*$/);
    if (m && !directives.layout) {
      directives.layout = m[1];
      i++; consumed = i; continue;
    }

    // 인식되지 않는 #-시작 라인 → 디렉티브 영역 종료
    break;
  }

  // 디렉티브 매칭이 하나도 안 됐으면 원본 그대로 반환 (heading skip도 무효)
  if (consumed === directiveStart) {
    return { directives, text: rawSlideText };
  }
  // 디렉티브 라인만 제거. heading skip한 경우 heading + 빈줄은 보존, 디렉티브 라인 + 그 다음 빈줄 1개 흡수
  const before = lines.slice(0, directiveStart);
  let after = lines.slice(consumed);
  if (after.length > 0 && after[0].trim() === '') after = after.slice(1);
  const remaining = before.concat(after).join('\n').replace(/^\s*\n/, '');
  return { directives, text: remaining };
}

// Issue81 호환: 기존 `{ layout, text }` 반환 형식 유지
function extractLayoutMeta(rawSlideText) {
  const r = extractDirectives(rawSlideText);
  return { layout: r.directives.layout, text: r.text };
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

// Issue93: Pandoc layout 예약어는 슬롯 추출에서 제외 — preprocessPandocDiv가
// fenced div(`::: columns`/`::: rows` 등)로 별도 처리하므로 슬롯으로 잡혀
// `_contents` 템플릿의 `{{content}}` 밖으로 빠지면서 본문이 누락됨
const PANDOC_LAYOUT_RESERVED = new Set(['columns', 'column', 'rows', 'row']);

function extractSlots(slideMarkdown) {
  const slots = {};
  let content = slideMarkdown;
  const re = /^:::\s+([a-z][a-zA-Z0-9-]*)\s*\n([\s\S]*?)\n:::\s*$/gm;
  content = content.replace(re, (match, name, body) => {
    if (PANDOC_LAYOUT_RESERVED.has(name)) return match;
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

    const { directives: slideDirectives, text: textForSlide } = extractDirectives(slide);
    const explicitLayout = slideDirectives.layout;
    let layout = explicitLayout;
    let autoBody = null;
    let autoFullImage = false;
    let autoFullVideo = false;

    if (isTable(textForSlide)) {
      // Issue94: layout 경로 통과 위해 일반 슬라이드와 동일하게 title/rawMarkdown 추출.
      // theme_default_layout(_contents) 자동 적용으로 가로선·puffer·title underline 정상 표시
      const tableExtracted = extractFirstH1(textForSlide);
      return {
        content: textForSlide,
        rawMarkdown: tableExtracted.body,
        title: tableExtracted.title,
        isTable: true,
        chapterTitle: currentChapterTitle,
        layout,
        directives: slideDirectives,
        hasText: hasTextContent(textForSlide)
      };
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
      directives: slideDirectives,
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
      // Issue138: autoToc 슬라이드 layout `_toc` → `_cards` (Cards Page 명명·SSOT 일치).
      // _toc layout은 호환성 위해 deprecated 유지(theme/default/layouts/_toc.html), 신규 변환은 모두 _cards로.
      s.layout = '_cards';
      s.autoToc = true;
      s.headingLevel = level;  // Issue92: Home/End sibling 점프가 H1만 대상으로 하도록 레벨 보존
      const extracted = extractFirstHeading(s.content);
      s.title = extracted.title;
      s.rawMarkdown = extracted.body;
    }
  });

  return slideObjects;
}

module.exports = {
  parseMarkdownFile,
  extractDirectives,
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
