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
//   - `#background-image-{path|url}` → backgroundImage (Issue117_1; path는 \S+ 매칭이라 `/`·`.` 허용)
//   - `#background-size-{cover|contain|auto}` → backgroundSize (Issue117_1; reveal.js 표준 키워드 화이트리스트)
//   - `#auto-animate` → autoAnimate (값 없는 attribute)
//   - `#autoslide-{ms}` → autoslide (정수)
// 불허: `# contents` (공백), `## sub` (H2), `#한글`, `#My` (대문자) → 본문 통과
// 화이트리스트는 `lib/config.js` `VALID_TRANSITIONS`/`VALID_TRANSITION_SPEEDS`와 동일 (Issue111)
const VALID_TRANSITIONS_DIRECTIVE = ['none', 'fade', 'slide', 'convex', 'concave', 'zoom'];
const VALID_SPEEDS_DIRECTIVE = ['default', 'fast', 'slow'];

// Issue117_1: #background-size 화이트리스트 (reveal.js data-background-size 표준 키워드)
// `100px 100px` 같은 공백 포함 값은 단일 토큰 디렉티브로 표현 불가 → 본 화이트리스트 외 무시
const VALID_BACKGROUND_SIZES = ['cover', 'contain', 'auto'];

function _emptyDirectives() {
  return {
    layout: null,
    transition: null,
    transitionSpeed: null,
    backgroundColor: null,
    backgroundTransition: null,
    backgroundImage: null,
    backgroundSize: null,
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
  // Chapter mode 한 슬라이드에 H1(챕터) + H2(슬라이드) 두 헤더가 연속될 수 있어
  // 헤더+빈줄을 반복 skip하여 디렉티브 영역 위치 탐색.
  let directiveStart = i;
  while (i < lines.length && /^#{1,6}\s+\S/.test(lines[i].trim())) {
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

    // #background-size-{cover|contain|auto} (Issue117_1)
    // 본 매처는 반드시 #background-image보다 먼저 — `size`/`image` prefix가 다르므로 실제로는 무관하나
    // 실수 방지(예: `#background-image-cover` 식 오타) 시 size 의도가 image로 흡수되지 않도록 size 우선 평가
    m = line.match(/^#background-size-([a-z]+)\s*$/);
    if (m && VALID_BACKGROUND_SIZES.includes(m[1])) {
      directives.backgroundSize = m[1];
      i++; consumed = i; continue;
    }

    // #background-image-{path|url} (Issue117_1)
    // 경로에 `/`·`.` 포함되므로 \S+ 매칭 (공백 전까지 모두 path).
    // path 정규화·존재 검증은 하지 않음(reveal.js가 런타임에 src 로드 실패 시 처리).
    m = line.match(/^#background-image-(\S+)\s*$/);
    if (m) {
      directives.backgroundImage = m[1];
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
// 'cards': `::: cards` 는 카드 컴포넌트 fenced div — preprocessPandocDiv가 처리하므로
// 슬롯으로 잡으면 안 됨 (시스템 `{{cards}}` 슬롯과 이름 충돌 방지 포함)
// 'htmlart': `::: htmlart <type>` 구조 도해 fenced div (Issue188) — `::: htmlart`(타입 누락)도
// 슬롯 오추출 방지 위해 예약. preprocessPandocDiv가 처리.
// 'source': `::: source` 출처·인용 슬롯 (Issue234) — preprocessPandocDiv가 m2-source 클래스 div로 변환,
// 테마 CSS가 슬라이드 하단 absolute 위치로 배치. 슬롯 추출되면 본문에서 사라져 렌더 안 됨.
const PANDOC_LAYOUT_RESERVED = new Set(['columns', 'column', 'rows', 'row', 'cards', 'htmlart', 'source']);

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

// hasAgenda: chapter 모드 여부. 2026-05-10 Single 모드에서 _cards autoToc 변환·tocPlaceholder prepend 차단용.
function parseMarkdownFile(filePath, autoLayoutDetect = true, tocPlaceholder = false, hasAgenda = true) {
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

  // 2026-05-10 Single 모드 가드 — `_config.yml` 주석 "Chapter모드에서 Only" 명세 준수.
  const useTocPlaceholder = (tocPlaceholder || yamlTocPlaceholder) && hasAgenda;
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
      // theme_default_layout(_contents) 자동 적용으로 가로선·puffer·title underline 정상 표시.
      // H1만(또는 H1+sub) 있을 때 슬롯 title 비우고 본문에 H1 보존 → html-builder Issue232 hoist가
      // section 직속 `<h1 class="title">`로 promote → `> .title::before` 상단 노랑 바 발화 (Issue243).
      const tableH1 = extractFirstH1(textForSlide);
      return {
        content: textForSlide,
        rawMarkdown: textForSlide,
        title: '',
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
        // H1(챕터) + H2(슬라이드) 동시 존재 시 H1만 제거. H2는 본문에 남겨 html-builder가
        // .title로 호이스팅 → 단일 슬라이드 제목으로 표시. H1만 있을 때는 H1을 슬라이드 제목으로.
        // contents 변종 layout은 html-builder Issue90/116 hoisting이 H2를 .title로 끌어올리므로
        // 본문에 H2를 남겨야 함. 그 외 layout(_blank/_cover 등)은 hoisting 미적용이라
        // parser에서 H2를 title로 추출해 {{title}} placeholder에 주입.
        const h1Extracted = extractFirstH1(textForSlide);
        const isContentsLayout = /^_?contents(_no_title|-split|-full)?$/.test(layout);
        if (h1Extracted.title) {
          const sub = extractFirstHeading(h1Extracted.body);
          if (sub.title) {
            if (isContentsLayout) {
              slideTitle = '';
              rawMarkdown = h1Extracted.body;
            } else {
              slideTitle = sub.title;
              rawMarkdown = sub.body;
            }
          } else if (isContentsLayout) {
            // H1-only + _contents 변종: H1을 body에 남겨 html-builder Issue232 hoist가
            // section 직속 .title로 promote → 상단 노랑 바(::before) 매칭 발화.
            // (H1+H2 case와 동일하게 {{title}} 슬롯 비우고 본문 hoist 경로로 통일)
            slideTitle = '';
            rawMarkdown = textForSlide;
          } else {
            slideTitle = h1Extracted.title;
            rawMarkdown = h1Extracted.body;
          }
        } else if (!isContentsLayout) {
          const heading = extractFirstHeading(textForSlide);
          if (heading.title) {
            slideTitle = heading.title;
            rawMarkdown = heading.body;
          }
        }
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

    const level = getTopHeadingLevel(s.content);

    // explicit #layout-* 지정 슬라이드도 H1이면 anchor 자격 부여 (Home/End sibling 점프 대상)
    // layout 유무 무관하게 H1 headingLevel 보존 — html-builder가 data-heading-level 주입
    if (s.layout && level === 1 && !s.headingLevel) {
      s.headingLevel = level;
      return;
    }
    if (s.layout) return;
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
      // 2026-05-10 (revert): Single 모드 가드 제거 — H1 챕터 타이틀 슬라이드는 mode 무관 _cards autoToc 카드 리스트 렌더링 (사용자 요청).
      // Map Slide(toc_placeholder)와 Cards Page(cards_placeholder)는 별도 chapter 게이트 유지(html-builder).
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
