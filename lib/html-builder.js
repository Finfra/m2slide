'use strict';

const fs = require('fs');
const path = require('path');
const { renderLayout } = require('./layout');
const { convertMarkdownToHTML } = require('./markdown');
const { getSubsections, getParentPage, getNextChapter, getPrevChapter, getLastChapter } = require('./agenda');
const { parseMarkdownFile, extractSlots } = require('./slide-parser');
const { buildDownloadButtonsHTML, slideRatioNumeric } = require('./config');

let _cfg = null;
const _warnedMissingLayouts = new Set();

// Issue64: base.css 1회 로드 후 캐싱. inline <style>로 모든 HTML 페이지에 주입
// 우선순위 스택 4단 (CSS SSOT: _doc_design/css.md "CSS 우선순위 스택")
const BASE_CSS = fs.readFileSync(path.join(__dirname, 'css', 'base.css'), 'utf-8');

// Issue110: cross-page flicker 가드 SSOT.
// 페이지 진입(?back=1/?fwd=1/?last=1) 시 Reveal·agenda 컨테이너를 잠시 visibility:hidden 처리하여
// 초기화 전 raw 콘텐츠가 paint되어 발생하는 잔상·flicker를 차단함. 모든 빌더(generateHTML/Cover/Agenda)가 공유.
const M2_CROSS_GUARD_HEAD_HTML = `<script>
    // Issue110: cross-page flicker 가드 — body 파싱 전 documentElement에 클래스 부여
    try {
      var s = location.search;
      if (s.indexOf('back=1') !== -1 || s.indexOf('fwd=1') !== -1 || s.indexOf('last=1') !== -1) {
        document.documentElement.classList.add('m2-cross-loading');
      }
    } catch (e) {}
  </script>`;

const M2_CROSS_GUARD_CSS = `
    /* Issue110: cross-page flicker 가드 — Reveal·agenda 양쪽 컨테이너 적용 */
    html.m2-cross-loading .reveal,
    html.m2-cross-loading .agenda-frame,
    body.m2-cross-loading .reveal,
    body.m2-cross-loading .agenda-frame { visibility: hidden; }`;

const M2_RELEASE_FN_JS = `function m2ReleaseCrossGuard(){
      document.documentElement.classList.remove('m2-cross-loading');
      document.body.classList.remove('m2-cross-loading');
    }`;

// Issue110: 시그널(?fwd=1/?back=1/?last=1)을 hash 앞에 안전하게 주입.
// 단순 append("url + '?fwd=1'")는 url이 'index.html#/2' 형태면 'index.html#/2?fwd=1'이 되어
// Reveal.js의 hash 파싱이 깨지고 첫 슬라이드(cover)로 떨어지는 회귀 발생 → 본 helper로 hash 분리.
const M2_NAV_HELPER_JS = `function m2NavWithSignal(url, signal){
      var hashIdx = url.indexOf('#');
      var base = hashIdx === -1 ? url : url.slice(0, hashIdx);
      var hash = hashIdx === -1 ? '' : url.slice(hashIdx);
      var sep = base.indexOf('?') === -1 ? '?' : '&';
      return base + sep + signal + hash;
    }`;

// Issue112: 챕터 모드 페이지 번호 메타 placeholder.
// 빌드 1차 패스에서는 null로 인라인됨. 2차 패스에서 generate-slides.js가 chapterMeta JSON으로 치환.
// 형식 (global 모드): { mode: 'global', breadcrumb: bool, chapterNum: '1.2', slideOffset: 0, totalSlides: 123 }
const M2_CHAPTER_META_PLACEHOLDER = `<script>window.M2_CHAPTER_META=null;/*M2_CHAPTER_META_PLACEHOLDER*/</script>`;

function configure(cfg) { _cfg = cfg; }

// Issue66: Reveal.js width/height/ratioClass 분기 공통 헬퍼.
// generateHTML(챕터 본문 + single index)·generateCoverHTML(chapter cover) 양쪽이 공유하여
// slide_ratio 적용 일관성 확보.
//   '16:9' → 1920×1080 fixed, 'ratio-16-9'
//   '3:2'  → 1920×1280 fixed, 'ratio-3-2'
//   'fill' → '100%'/'100%', 'ratio-fill'
// (Issue65 화이트리스트 통과 후 호출되므로 그 외 값은 도달 불가)
function resolveRevealDimensions(slideRatio) {
  if (slideRatio === '3:2') return { width: 1920, height: 1280, ratioClass: 'ratio-3-2' };
  if (slideRatio === 'fill') return { width: '100%', height: '100%', ratioClass: 'ratio-fill' };
  return { width: 1920, height: 1080, ratioClass: 'ratio-16-9' };
}

// Generate table of contents data for markmap (root → H1 → H2)
function generateTOCFromFile(filePath, agendaPath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let yamlTitle = '';

  // Extract YAML frontmatter
  let fileTocPlaceholder = false;
  if (content.startsWith('---')) {
    const end = content.indexOf('\n---', 3);
    if (end !== -1) {
      const yaml = content.slice(4, end);
      const m = yaml.match(/^title:\s*(.+)$/m);
      if (m) yamlTitle = m[1].trim();
      const tp = yaml.match(/^toc_placeholder:\s*(.+)$/m);
      if (tp) {
        const v = tp[1].split('#')[0].trim().toLowerCase();
        fileTocPlaceholder = (v === 'true' || v === 'yes' || v === '1');
      }
      content = content.slice(end + 4).trim();
    }
  }

  const lines = content.split('\n');

  const sections = [];
  let currentSection = null;
  let inCode = false;
  let slideIndex = 0;

  // Issue58: _toc 슬라이드는 서브챕터(AGENDA.md H3)가 있을 때만 존재 → 그때만 slideIndex +1 오프셋
  const hasTocInDeck = agendaPath && fs.existsSync(agendaPath)
    ? getSubsections(path.basename(filePath), agendaPath).length > 0
    : false;
  if (hasTocInDeck) {
    slideIndex = 1;
  }
  // cover_enabled=true + single 모드: cover 슬라이드가 #/0 점유 → +1 오프셋
  if (!agendaPath && _cfg.coverEnabled) {
    slideIndex += 1;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Toggle code fence state
    if (line.trim().startsWith('```')) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;

    // Count slide separators to map headings → slide index
    if (/^---\s*$/.test(line)) {
      slideIndex += 1;
      continue;
    }

    // H1 becomes a branch
    const h1 = line.match(/^# (.+)$/);
    if (h1) {
      // Issue108: hashOneBasedIndex: true 적용 — anchor의 #/N은 reveal 내부 N-1 슬라이드로 매핑되므로 +1 시프트
      currentSection = { content: `<a href="#/${slideIndex + 1}">${h1[1]}</a>`, children: [] };
      sections.push(currentSection);
      continue;
    }

    // H2 becomes a child pointing to that slide
    const h2 = line.match(/^## (.+)$/);
    if (h2) {
      const title = h2[1];
      const item = {
        // Issue108: hashOneBasedIndex 보정
        content: `<a href="#/${slideIndex + 1}">${title}</a>`,
        children: []
      };
      // H1 부모가 있으면 그 children으로, 없으면 root 직접 children으로 push
      // (Issue39: H1 없는 마크다운에서 빈 wrapper section 생성 방지 → markmap 깊이 축소)
      if (currentSection) {
        currentSection.children.push(item);
      } else {
        sections.push(item);
      }
      continue;
    }
  }

  // Include subsections from AGENDA (if any)
  const fileName = path.basename(filePath);
  const subsections = getSubsections(fileName, agendaPath);
  if (subsections.length > 0) {
    sections.push({
      content: '하위 챕터',
      children: subsections.map(sub => ({ content: `<a href="${sub.htmlFile}">${sub.title}</a>`, children: [] }))
    });
  }

  return { content: '', children: sections };
}

// Step 8: TOC 슬라이드 HTML 생성 (layout-_toc 적용 또는 기존 방식)
// markmapHtml: markmap에 주입할 HTML (SVG 등). 현재 구조에서는 #toc-container가 별도 오버레이로 존재.
function generateTocSlideHTML(tocTitle, markmapHtml) {
  if (_cfg.layoutTemplates['_toc']) {
    // Issue55: _cfg.projectMeta + downloadButtons 변수 노출 (_toc layout이 헤더에 다운로드 버튼 표시)
    const vars = {
      ..._cfg.projectMeta,
      downloadButtons: _cfg.projectDownloadsHTML,
      title: tocTitle || '',
      content: '',
      markmap: markmapHtml || '',
    };
    let html = renderLayout('_toc', vars);
    // toc-placeholder id 추가 (기존 JS가 참조하므로 유지)
    html = html.replace(/<section\b([^>]*)>/, (_, attrs) => {
      if (/id="/.test(attrs)) return `<section${attrs}>`;
      return `<section${attrs} id="toc-placeholder">`;
    });
    // layout-_toc class 이미 템플릿에 있으므로 중복 추가 방지
    if (!/class="[^"]*\blayout-_toc/.test(html)) {
      html = html.replace(/<section\b([^>]*)>/, (_, attrs) => {
        if (/class="/.test(attrs)) {
          return `<section${attrs.replace(/class="([^"]*)"/, `class="$1 layout-_toc"`)}>`;
        }
        return `<section${attrs} class="layout-_toc">`;
      });
    }
    return html.replace(/^(\s*<section)/, '      <section').replace(/<\/section>\s*$/, '      </section>');
  }
  // 기존 방식 폴백
  return `      <section id="toc-placeholder"></section>`;
}

// Generate plain (non-layout) HTML slide from parsed slide
function generatePlainSlideHTML(slide) {
  // Title slide - empty placeholder (markmap is outside Reveal.js)
  if (slide.isTitle) {
    return generateTocSlideHTML(slide.title || '', '');
  }

  // Regular slide - convert to HTML
  let html = convertMarkdownToHTML(slide.content, _cfg.videoDefault);
  let isTitleOnly = false;

  // Check if it's just a single H1/H2/H3 (ignoring whitespace)
  if (/^[\s\n]*<(h[123])(?: [^>]*)?>.*?<\/\1>[\s\n]*$/i.test(html)) {
    isTitleOnly = true;
  }

  // Wrap content in div.theContents to enable styling and auto-sizing
  // Priority: H2 > H1 > H3 > wrap everything
  let splitIndex = -1;

  const h2Start = html.indexOf('<h2');
  if (h2Start !== -1) {
    const h2Close = html.indexOf('</h2>', h2Start);
    if (h2Close !== -1) {
      splitIndex = h2Close + 5;
    }
  } else {
    const h1Start = html.indexOf('<h1');
    if (h1Start !== -1) {
      const h1Close = html.indexOf('</h1>', h1Start);
      if (h1Close !== -1) {
        splitIndex = h1Close + 5;
      }
    } else {
      const h3Start = html.indexOf('<h3');
      if (h3Start !== -1) {
        const h3Close = html.indexOf('</h3>', h3Start);
        if (h3Close !== -1) {
          splitIndex = h3Close + 5;
        }
      }
    }
  }

  if (splitIndex !== -1) {
    const head = html.slice(0, splitIndex);
    const rest = html.slice(splitIndex).trim();

    if (rest.length === 0) {
      // Header with empty content -> Title Only
      isTitleOnly = true;
      html = head;
    } else {
      html = `${head}\n<div class="theContents">\n${rest}\n</div>`;
    }
  } else {
    // No header, wrap everything if there is content
    if (html.trim().length > 0) {
      html = `<div class="theContents">\n${html}\n</div>`;
    }
  }

  // If it's a title-only slide and has children (chapter overview), append the list
  if (isTitleOnly && slide.children && slide.children.length > 0) {
    const count = slide.children.length;
    // Card-block 다중 행 레이아웃: flex-wrap으로 항목 수에 적응
    const listHtml = `<ul class="chapter-list chapter-list--cards" data-count="${count}">\n` +
      slide.children.map(child =>
        // Issue108: hashOneBasedIndex 보정
        `<li class="chapter-card"><a href="#/${child.index + 1}">${child.title}</a></li>`
      ).join('\n') +
      '\n</ul>';
    html += '\n' + listHtml;
  }

  const classes = [];
  if (isTitleOnly) classes.push('title-slide');
  if (slide.hasText) classes.push('has-text');
  const sectionClass = classes.length > 0 ? ` class="${classes.join(' ')}"` : '';
  const chapterAttr = slide.chapterTitle ? ` data-chapter-title="${slide.chapterTitle.replace(/"/g, '&quot;')}"` : '';

  return `      <section${sectionClass}${chapterAttr}>
${html}
      </section>`;
}

// Step 7: generateSlideHTML - layout 적용 디스패처
function generateSlideHTML(slide) {
  // isTitle 슬라이드는 layout 적용 대상 아님 (plain으로 위임)
  // Issue94: isTable은 layout 경로로 통과시켜 theme_default_layout(_contents) 적용 보장.
  // 과거 reveal.js markdown plugin에 data-markdown으로 위임하던 시기의 우회였으나,
  // 현재는 convertMarkdownToHTML이 직접 <table> HTML 생성하므로 우회 불필요
  if (slide.isTitle) {
    return generatePlainSlideHTML(slide);
  }

  const layoutName = slide.layout || _cfg.themeDefaultLayout;

  if (layoutName && _cfg.layoutTemplates[layoutName]) {
    const { content: bodyText, slots } = extractSlots(slide.rawMarkdown || '');
    const title = slide.title || '';
    const contentHtml = convertMarkdownToHTML(bodyText, _cfg.videoDefault);
    const slotsHtml = {};
    for (const [k, v] of Object.entries(slots)) slotsHtml[k] = convertMarkdownToHTML(v, _cfg.videoDefault);

    // Issue49: _cfg.projectMeta 값을 layout 변수로 노출 (cover 등에서 사용)
    // Issue55: downloadButtons 변수 노출 (_toc layout에서 사용)
    const cardsHtml = (slide.children && slide.children.length > 0)
      ? `<ul class="chapter-list chapter-list--cards" data-count="${slide.children.length}">\n` +
        // Issue108: hashOneBasedIndex 보정
        slide.children.map(c => `<li class="chapter-card"><a href="#/${c.index + 1}">${c.title}</a></li>`).join('\n') +
        '\n</ul>'
      : '';
    const vars = { ..._cfg.projectMeta, downloadButtons: _cfg.projectDownloadsHTML, title, content: contentHtml, markmap: '', cards: cardsHtml, ...slotsHtml };
    let html = renderLayout(layoutName, vars);

    // Issue90: title이 비어 있을 때 빈 contents-header 제거 (H2 슬라이드는 H2가 contents-body
    // 내부 .title로 들어가므로 contents-header가 빈 상태로 남아 가이드라인 모드에서 거대한 박스로
    // 시각화되어 갭 비대칭처럼 보임. 빌드 단계에서 제거하여 백업본의 단순 구조와 시각적 등가 확보)
    if ((!title || title.trim() === '') && /class="contents-header"/.test(html)) {
      html = html.replace(/\s*<div class="contents-header">[\s\S]*?<\/div>\s*(?=<div class="contents-body")/g, '\n  ');
    }

    // Issue90 / Issue116: contents-body의 첫 자식이 <h2..h6 class="title">이면
    // contents-body 밖(section 직속 자식)으로 이동
    // (백업본 구조 <section><h{N} class="title">+<div class="theContents">와 시각적·구조적 등가).
    // → 제목이 .contents-body의 flex 자식이 아니게 되어 .contents-body 박스에 포함되지 않고,
    //   title_contents_gap(.title margin-bottom)이 자연스럽게 .title↔.contents-body 사이 갭으로 적용됨.
    // → 또한 .contents-body { overflow-y: auto }가 .title::before(top:-12px) 상단 가로선을
    //   clipping하던 Issue116 회귀를 구조적으로 차단함 (Issue90 fix가 H2만 처리하여
    //   H3/H4 image-only/list-only 슬라이드는 누락되던 문제 정규식 확장으로 해결).
    // layoutName은 alias 정규화 전 값이므로 'contents'/'_contents'/'contents_no_title'/'_contents_no_title' 모두 처리
    if (/^_?contents(_no_title)?$/.test(layoutName)) {
      html = html.replace(
        /<div class="contents-body">(\s*)(<(h[2-6])[^>]*\bclass="[^"]*\btitle\b[^"]*"[^>]*>[\s\S]*?<\/\3>)([\s\S]*?)<\/div>(\s*<\/section>)/,
        '$2\n  <div class="contents-body">$1$4</div>$5'
      );
    }

    // class="layout-{name}" 자동 추가 (템플릿에 없으면)
    if (!/class="[^"]*\blayout-/.test(html)) {
      html = html.replace(/<section\b([^>]*)>/, (_, attrs) => {
        if (/class="/.test(attrs)) {
          return `<section${attrs.replace(/class="([^"]*)"/, `class="$1 layout-${layoutName}"`)}>`;
        }
        return `<section${attrs} class="layout-${layoutName}">`;
      });
    }

    // image-only / video-only 자동 감지 시 modifier 클래스 추가
    const fullModifier = slide.autoFullImage ? 'layout-_blank--full-image'
                       : slide.autoFullVideo ? 'layout-_blank--full-video'
                       : null;
    if (fullModifier) {
      html = html.replace(/<section\b([^>]*)>/, (_, attrs) => {
        if (/class="/.test(attrs)) {
          return `<section${attrs.replace(/class="([^"]*)"/, `class="$1 ${fullModifier}"`)}>`;
        }
        return `<section${attrs} class="${fullModifier}">`;
      });
    }

    // Issue92: autoToc(_toc layout 자동 부여) 슬라이드는 원본 마크다운 헤딩 레벨을 보존
    // → Home/End sibling 점프가 H1 anchor만 대상으로 하도록 키 핸들러에서 활용
    if (slide.autoToc && slide.headingLevel) {
      html = html.replace(/<section\b/, `<section data-heading-level="${slide.headingLevel}"`);
    }
    return html;
  }

  if (layoutName && !_cfg.layoutTemplates[layoutName]) {
    if (!_warnedMissingLayouts.has(layoutName)) {
      _warnedMissingLayouts.add(layoutName);
      const themePaths = _cfg.themeName ? `theme/${_cfg.themeName}/layouts/ 및 theme/default/layouts/` : 'theme/default/layouts/';
      console.warn(`⚠️ layout '${layoutName}' not found in ${themePaths} — falling back to plain section`);
    }
  }
  return generatePlainSlideHTML(slide);
}

// Generate complete HTML file
// options: { skipTocPlaceholder?: boolean }  — Issue55: chapter cover-only deck에서 _toc 자동 prepend 억제
function generateHTML(filePath, agendaPath, outputDir, isFirstFile = false, options = {}) {
  // Issue55: 빌드 시점 다운로드 자산 검출 (Phase 2) — projectDir = outputDir의 부모
  // outputDir 예: /path/to/Projects/Name/slide → projectDir: /path/to/Projects/Name
  _cfg.projectDownloadsHTML = buildDownloadButtonsHTML(path.dirname(outputDir));

  const slides = parseMarkdownFile(filePath, _cfg.autoLayoutDetect, _cfg.tocPlaceholder);
  const fileName = path.basename(filePath);
  const tocData = generateTOCFromFile(filePath, agendaPath);

  // Issue55 Phase 4: chapter cover-only deck — 모든 슬라이드 제거 후 cover만 주입
  if (options.skipTocPlaceholder) {
    slides.length = 0;
  }
  // Issue58: agenda 존재 여부
  const hasAgenda = agendaPath && fs.existsSync(agendaPath);

  // Issue58: _toc 슬라이드는 서브챕터(AGENDA.md H3)가 있을 때만 표시
  // single 모드(hasAgenda=false): 서브챕터 없음 → _toc 미생성
  const hasTocItems = hasAgenda
    ? getSubsections(fileName, agendaPath).length > 0
    : false;

  // isTitle 슬라이드 제거: 서브챕터가 없으면 제거 (단순 챕터·single 모드 공통)
  if (!hasTocItems && !options.skipTocPlaceholder) {
    for (let i = slides.length - 1; i >= 0; i--) {
      if (slides[i].isTitle) slides.splice(i, 1);
    }
  }

  // Step 8: _toc layout — 서브챕터가 있을 때만 적용 (single·chapter 모드 공통)
  if (_cfg.layoutTemplates['_toc'] && hasTocItems && !options.skipTocPlaceholder) {
    if (slides.length > 0 && slides[0].isTitle) {
      // isTitle 슬라이드가 이미 있으면 _toc layout 적용
      slides[0].layout = '_toc';
    } else {
      // isTitle 슬라이드가 없으면 _toc 슬라이드를 맨 앞에 삽입
      // 문서 제목 결정: frontmatter title 우선, 없으면 첫 H1, 없으면 파일명
      let docTitle = path.basename(filePath, '.md');
      const fileRaw = fs.readFileSync(filePath, 'utf-8');
      const fmMatch = fileRaw.match(/^---[\s\S]*?^title:\s*(.+)$/m);
      if (fmMatch) {
        docTitle = fmMatch[1].trim();
      } else {
        const h1Match = fileRaw.match(/^# (.+)$/m);
        if (h1Match) docTitle = h1Match[1].trim();
      }
      slides.unshift({
        title: docTitle,
        subtitle: null,
        author: null,
        slogan: null,
        content: '',
        rawMarkdown: '',
        isTitle: true,
        chapterTitle: '',
        layout: '_toc'
      });
    }
  }

  // single 모드 + cover_enabled=true: #/0에 커버 슬라이드 주입 (chapter 모드는 별도 index.html 커버 페이지로 처리)
  if (isFirstFile && _cfg.coverEnabled && !hasAgenda && _cfg.layoutTemplates['_cover']) {
    // 제목 우선순위: _meta.yml title → MD frontmatter title → 파일명
    let coverTitle = _cfg.projectMeta.title || '';
    if (!coverTitle) {
      const rawFm = fs.readFileSync(filePath, 'utf-8');
      const fmMatch = rawFm.match(/^---[\s\S]*?^title:\s*(.+)$/m);
      if (fmMatch) coverTitle = fmMatch[1].trim();
    }
    if (!coverTitle) coverTitle = path.basename(filePath, '.md');
    slides.unshift({
      title: coverTitle,
      subtitle: _cfg.projectMeta.subtitle || null,
      author: _cfg.projectMeta.instructor_name || null,
      slogan: null,
      content: '',
      rawMarkdown: '',
      isTitle: false,  // layout 시스템 경로 사용 (_cover 렌더링)
      chapterTitle: '',
      layout: '_cover'
    });
  }

  // children.slideRef → 변이 완료 후 최종 인덱스로 해소
  // (isTitle 제거 또는 _toc prepend 이후 인덱스가 달라지므로 재계산 필요)
  slides.forEach(slide => {
    if (slide.children && slide.children.length > 0) {
      slide.children = slide.children.map(child => {
        if (child.slideRef) {
          const idx = slides.indexOf(child.slideRef);
          return idx >= 0 ? { title: child.title, index: idx } : { title: child.title, index: child.index };
        }
        return child;
      });
    }
  });

  const parentPage = hasAgenda ? getParentPage(fileName, agendaPath) : '';
  const nextChapter = hasAgenda ? getNextChapter(fileName, agendaPath) : '';
  const prevChapter = hasAgenda ? getPrevChapter(fileName, agendaPath) : '';
  // Issue87: ⇟ PgDown(마지막 페이지 직행)용
  const lastChapter = hasAgenda ? getLastChapter(agendaPath) : '';
  const title = slides[0].title || path.basename(filePath, '.md');
  const titleMeta = slides[0];

  const slidesHTML = slides.map(generateSlideHTML).join('\n\n');

  // Generate CSS link using outputDir
  let slideCssLink = '';
  if (_cfg.slideCssRel) {
    const cssAbsPath = path.isAbsolute(_cfg.slideCssRel)
      ? _cfg.slideCssRel
      : path.join(_cfg.configBaseDir, _cfg.slideCssRel);

    // Always use outputDir relative to cssAbsPath
    // outputDir is absolute (resolved in main)
    const relHref = path.relative(outputDir, cssAbsPath);
    slideCssLink = `\n  <link rel="stylesheet" href="${relHref}?v=${Date.now()}">`;
  }

  // Issue66: 공통 헬퍼 resolveRevealDimensions로 단일화 (generateCoverHTML과 동일 분기 공유)
  const { width: revealWidth, height: revealHeight, ratioClass } = resolveRevealDimensions(_cfg.slideRatio);

  const openPropsLink = _cfg.useOpenProps ? `\n  <link rel="stylesheet" href="https://unpkg.com/open-props"/>` : '';
  const fontImports = _cfg.styleConfig.style.global.fontImport.map(url => `\n  <link rel="stylesheet" href="${url}"/>`).join('');

  // Determine markmap depth
  // If we have an agenda (multi-page project chapter), prioritize chapter_markmap_depth
  // Otherwise (single page project), use standard markmap_depth
  const markmapDepth = hasAgenda
    ? (_cfg.styleConfig.chapter_markmap_depth || _cfg.styleConfig.markmap_depth || 1)
    : (_cfg.styleConfig.markmap_depth || 1);

  const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${title}</title>
  ${M2_CROSS_GUARD_HEAD_HTML}
  ${M2_CHAPTER_META_PLACEHOLDER}
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/dist/reset.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/dist/reveal.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github.css">${openPropsLink}
  <style data-m2slide-base="true">
${BASE_CSS}
  </style>${fontImports}${slideCssLink}
  <script>
    // Suppress specific SVG errors from Markmap/D3 to avoid noise in PDF generation
    (function() {
      const originalConsoleError = console.error;
      console.error = function(...args) {
        if (args.length > 0 && typeof args[0] === 'string' &&
            (args[0].includes('attribute transform') || args[0].includes('translate(NaN'))) {
          return;
        }
        originalConsoleError.apply(console, args);
      };

      // Monkey patch D3 if available to prevent NaN attributes
      window.addEventListener('load', function() {
        if (window.d3 && window.d3.selection) {
          const originalAttr = window.d3.selection.prototype.attr;
          window.d3.selection.prototype.attr = function(name, value) {
            if (name === 'transform' && typeof value === 'string' && (value.includes('NaN') || value.includes('undefined'))) {
              return this;
            }
            return originalAttr.apply(this, arguments);
          };
        }
      });
    })();
  </script>
  <style>
    /* Issue53: 페이지 번호 클릭 비활성화 — prev arrow 클릭 영역 침범 방지 */
    .reveal .slide-number,
    .reveal .slide-number a {
      pointer-events: none;
      text-decoration: none;
    }
    /* Markmap SVG baseline (allow container to control size) */
    #toc-mindmap {
      width: 100%;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
      overflow: hidden;
      display: block;
    }
    #toc-mindmap a {
      text-decoration: none;
      color: inherit;
    }
    #toc-mindmap text {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif !important;
      font-size: 16px !important;
      font-weight: 700;
    }
    /* Issue55 Phase 7: #toc-container 오버레이 제거 — TOC slide 내부 .toc-mindmap-svg + agenda.html에서 마크맵 렌더 */
    /* Issue107: Reveal 기본 ↑/↓ 컨트롤을 ←/→ 사이 다이아몬드 위치에 강제 노출 + 비활성 회색 처리 */
    /* Reveal default ↓ bottom: -1.4em 으로 비대칭 → bottom: 0em 으로 보정해 정사각 마름모 만듦 */
    /* (↑ bottom 6.4em center y 8.2em / ←/→ bottom 3.2em center y 5em / ↓ bottom 0em center y 1.8em → ↑↔↓ 6.4em == ←↔→ 6.4em) */
    .reveal .controls .navigate-up {
      bottom: 2.9em !important;
    }
    .reveal .controls .navigate-right {
      right: 0.8em !important;
    }
    .reveal .controls .navigate-down {
      bottom: 0em !important;
      padding-bottom: 0 !important;
    }
    .reveal .controls .navigate-up,
    .reveal .controls .navigate-down {
      display: block !important;
      visibility: visible !important;
      pointer-events: auto !important;
      opacity: 0.25;
      transition: opacity 0.2s;
      cursor: default;
    }
    .reveal .controls .navigate-up.m2-enabled,
    .reveal .controls .navigate-down.m2-enabled {
      opacity: 1;
      cursor: pointer;
    }
    .reveal .controls .navigate-up.m2-enabled:hover,
    .reveal .controls .navigate-down.m2-enabled:hover {
      opacity: 0.7;
    }
    /* 페이지 번호 — 마름모 정중앙 */
    /* theme/default/slide.css:80 에서 .reveal .controls를 position: fixed + bottom:0 right:0 으로 viewport 기준 강제 */
    /* → .controls 안의 화살표 button 좌표가 viewport 우측 하단 기준이 됨. 페이지번호도 같은 기준 위해 fixed */
    /* theme/default/slide.css 의 .slide-number !important 룰을 덮어쓰기 위해 일부 속성은 !important 필요 */
    .reveal .slide-number {
      position: fixed !important;
      right: 20px !important;
      bottom: 20px !important;
      width: 60px !important;
      height: 14px !important;
      background: transparent !important;
      color: rgba(0, 0, 0, 0.6) !important;
      padding: 0 !important;
      font-size: 13px !important;
      text-align: center;
      transform: none;
      line-height: 1;
      pointer-events: none;
      z-index: 200;
    }
    /* Issue112: breadcrumb 모드에서는 페이지 번호 너비 확장 (1.2 › 5/123 등) */
    body.m2-breadcrumb-mode .reveal .slide-number {
      width: auto !important;
      min-width: 60px !important;
      padding: 0 6px !important;
      white-space: nowrap;
    }
    /* Issue115: nav_indicator — 우측 하단 표시 모드 (both | diamond | page) */
    /* diamond: 페이지번호만 숨김 (마름모만 노출) */
    body[data-nav-indicator="diamond"] .reveal .slide-number {
      display: none !important;
    }
    /* page: 마름모(↑/↓) + 좌우 화살표(←/→) 모두 숨김 (페이지번호만 노출) */
    body[data-nav-indicator="page"] .reveal .controls .navigate-up,
    body[data-nav-indicator="page"] .reveal .controls .navigate-down,
    body[data-nav-indicator="page"] .reveal .controls .navigate-left,
    body[data-nav-indicator="page"] .reveal .controls .navigate-right {
      display: none !important;
    }
    /* Last slide message */
    #last-slide-message {
      display: none;
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 15px 25px;
      border-radius: 8px;
      font-size: 16px;
      z-index: 1000;
      text-align: center;
    }
    /* Issue104: 챕터 간 cross-page 이동 시 진입 방향 애니메이션 (Reveal.js 표준 컨벤션) */
    @keyframes m2-slide-from-left {
      from { transform: translate3d(-100%, 0, 0); opacity: 0; }
      to   { transform: translate3d(0, 0, 0); opacity: 1; }
    }
    @keyframes m2-slide-from-right {
      from { transform: translate3d(100%, 0, 0); opacity: 0; }
      to   { transform: translate3d(0, 0, 0); opacity: 1; }
    }
    ${_cfg.animation.defaultTransition === 'none' ? '/* Issue111 후속: default_transition: none → cross-page 진입 애니메이션도 비활성 (사용자가 모든 트랜지션 OFF 의도) */' : `/* backward (← 키): 좌측에서 등장 → 우측 모션 (Reveal backward와 동일) */
    body.m2-back-enter .reveal .slides > section.present {
      animation: m2-slide-from-left 400ms ease-out !important;
    }
    /* forward (→ 키): 우측에서 등장 → 좌측 모션 (Reveal forward와 동일) */
    body.m2-fwd-enter .reveal .slides > section.present {
      animation: m2-slide-from-right 400ms ease-out !important;
    }`}
    ${M2_CROSS_GUARD_CSS}
  </style>
</head>
<body class="${_cfg.topAlign ? 'top-align-mode' : ''} ${_cfg.guidLine ? 'guide-line-mode' : ''} media-enlarge-${_cfg.styleConfig.style.theContents.media_container_enlarge || 'original'}" data-nav-indicator="${_cfg.navIndicator}" style="
  --global-font-family: ${_cfg.styleConfig.style.global.fontFamily};
  --title-font-family: ${_cfg.styleConfig.style.title.font_family || 'inherit'};
  --title-font-weight: ${_cfg.styleConfig.style.title.font_weight || '700'};
  --title-font-size: ${_cfg.styleConfig.style.title.font_size};
  --title-color: ${_cfg.styleConfig.style.title.font_color};
  --title-align: ${_cfg.styleConfig.style.title.align};
  --title-padding: ${_cfg.styleConfig.style.title.outer_padding};
  --main-title-font-family: ${_cfg.styleConfig.style.main_title.fontFamily || 'inherit'};
  --main-title-font-weight: ${_cfg.styleConfig.style.main_title.font_weight || '700'};
  --main-title-font-size: ${_cfg.styleConfig.style.main_title.font_size};
  --main-title-color: ${_cfg.styleConfig.style.main_title.font_color};
  --main-title-align: ${_cfg.styleConfig.style.main_title.align};
  --main-title-padding: ${_cfg.styleConfig.style.main_title.outer_padding};
  --outline-title-font-family: ${_cfg.styleConfig.style.outline_title.font_family || 'inherit'};
  --outline-title-font-weight: ${_cfg.styleConfig.style.outline_title.font_weight || '700'};
  --outline-title-font-size: ${_cfg.styleConfig.style.outline_title.font_size};
  --outline-title-color: ${_cfg.styleConfig.style.outline_title.font_color};
  --outline-title-align: ${_cfg.styleConfig.style.outline_title.align};
  --outline-title-padding: ${_cfg.styleConfig.style.outline_title.outer_padding};
  --outline-title-sub-font-family: ${_cfg.styleConfig.style.outline_title_sub.font_family || 'inherit'};
  --outline-title-sub-font-weight: ${_cfg.styleConfig.style.outline_title_sub.font_weight || '500'};
  --outline-title-sub-font-size: ${_cfg.styleConfig.style.outline_title_sub.font_size};
  --outline-title-sub-color: ${_cfg.styleConfig.style.outline_title_sub.font_color};
  --outline-title-sub-align: ${_cfg.styleConfig.style.outline_title_sub.align};
  --outline-title-sub-padding: ${_cfg.styleConfig.style.outline_title_sub.outer_padding};
  --content-font-family: ${_cfg.styleConfig.style.theContents.fontFamily || 'inherit'};
  --content-font-size: ${_cfg.styleConfig.style.theContents.font_size};
  --content-color: ${_cfg.styleConfig.style.theContents.font_color};
  --content-align: ${_cfg.styleConfig.style.theContents.align};
  --content-padding: ${_cfg.styleConfig.style.theContents.outer_padding};
  --title-contents-gap-pct: ${_cfg.titleContentsGap};
  --slide-ratio: ${slideRatioNumeric(_cfg.slideRatio)};
  --slide-outer-padding: ${_cfg.slideOuterPadding};
  --slide-inner-padding: ${_cfg.slideInnerPadding};
">
  <!-- Issue107: nav-up-btn 제거 — Reveal 기본 .controls .navigate-up/.navigate-down에 동작 위임 -->
  <!-- Issue55 Phase 7: #toc-container 오버레이 제거 — 마크맵은 _toc.html layout 내부 SVG 또는 agenda.html에서 렌더 -->

  <div id="last-slide-message">마지막 페이지입니다. 다음 챕터로 이동하려면 다시 →를 누르세요.</div>

  <div class="reveal ${ratioClass}">
    <div class="slides">

${slidesHTML}

    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/markmap-view@0.18.12/dist/browser/index.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/dist/reveal.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/plugin/markdown/markdown.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/plugin/highlight/highlight.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/plugin/notes/notes.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <script>
    // Allow URL toggle: ?top=1 to enable top-align-mode regardless of config
    try {
      var qs = new URLSearchParams(window.location.search);
      if (qs.get('top') === '1') document.body.classList.add('top-align-mode');
    } catch (e) {}

    // Issue110: cross-page 가드는 head의 M2_CROSS_GUARD_HEAD_HTML(documentElement.classList.add)에서 처리됨

    // Issue112: chapterMeta breadcrumb 모드 시 body class 토글 (페이지 번호 너비 확장)
    try {
      if (window.M2_CHAPTER_META && window.M2_CHAPTER_META.breadcrumb && window.M2_CHAPTER_META.chapterNum) {
        document.body.classList.add('m2-breadcrumb-mode');
      }
    } catch (e) {}

    var isPrintMode = /print-pdf/gi.test(window.location.search);

    Reveal.initialize({
      hash: true,
      // Issue108: URL hash와 페이지 번호 표시 모두 1-based로 통일 (#/1이 첫 슬라이드)
      hashOneBasedIndex: true,
      plugins: [ RevealMarkdown, RevealHighlight, RevealNotes ],
      width: '${revealWidth}',
      height: '${revealHeight}',
      margin: 0.0,
      // Issue63: width 남을 때 horizontal center / height 남을 때 top 정렬.
      // ratio 모드에서는 항상 false (Reveal vertical centering이 ratio fit과 충돌하는 이슈 회피).
      // ratio-fill 모드에서만 사용자 top_align 설정 따름.
      center: ${ratioClass === 'ratio-fill' ? !_cfg.topAlign : false},
      // Issue112: 챕터 모드 page_number_mode=global일 때 chapterMeta 기반 callback.
      //   reveal.js 5.x callback은 [a, separator, b] array 반환 형식 표준.
      //   문자열 반환은 무시되어 fallback(챕터 인덱스만)으로 떨어지는 회귀 발생.
      //   그 외(local/single)는 'c/t' 유지
      slideNumber: (window.M2_CHAPTER_META && window.M2_CHAPTER_META.mode === 'global')
        ? function(slide) {
            var m = window.M2_CHAPTER_META;
            var idx = (typeof Reveal.getIndices === 'function') ? Reveal.getIndices(slide) : { h: 0 };
            var globalNum = (m.slideOffset || 0) + (idx.h || 0) + 1;
            var left = (m.breadcrumb && m.chapterNum) ? (m.chapterNum + ' › ' + globalNum) : String(globalNum);
            return [left, '/', m.totalSlides];
          }
        : 'c/t',
      // Issue111: 전역 transition·배경 트랜지션은 _config.yml animation: 섹션에서 override 가능
      //   기본값(slide / fade)은 lib/config.js createDefaultConfig에서 정의 (이전 하드코딩과 동일)
      transition: '${_cfg.animation.defaultTransition}',
      transitionSpeed: '${_cfg.animation.defaultTransitionSpeed}',
      backgroundTransition: '${_cfg.animation.defaultBackgroundTransition}',
      touch: false,  // Issue51: 커스텀 드래그 핸들러가 touch 이벤트를 직접 관리
      // Issue89: Home/End/PgUp/PgDown은 m2slide 매트릭스가 처리. Reveal 기본 keymap 비활성화로 hijack 차단
      keyboard: {
        36: null,  // Home
        35: null,  // End
        33: null,  // PageUp
        34: null   // PageDown
      }
    });

    // Initialize mermaid for diagrams (manual rendering)
    mermaid.initialize({
      startOnLoad: false,  // Disable auto-render, we'll render manually
      theme: 'default',
      securityLevel: 'loose',
      themeVariables: {
        fontFamily: '"Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif'
      },
      flowchart: {
        htmlLabels: true,
        curve: 'basis',
        useMaxWidth: false
      },
      sequence: {
        diagramMarginX: 50,
        diagramMarginY: 10,
        actorMargin: 50,
        width: 150,
        height: 65,
        boxMargin: 10,
        boxTextMargin: 5,
        noteMargin: 10,
        messageMargin: 35,
        mirrorActors: true,
        useMaxWidth: false
      },
      timeline: {
        useMaxWidth: false
      }
    });

    // Render all Mermaid diagrams when Reveal.js is ready
    Reveal.on('ready', function() {
      // Find all mermaid elements in all slides
      const allMermaidElements = document.querySelectorAll('.mermaid');

      if (allMermaidElements && allMermaidElements.length > 0) {
        allMermaidElements.forEach(function(element, index) {
          // Skip if already rendered
          if (element.querySelector('svg')) {
            return;
          }

          const graphDefinition = element.textContent;
          if (!graphDefinition || !graphDefinition.trim()) {
            return;
          }

          const graphId = 'mermaid-diagram-' + index;

          try {
            mermaid.render(graphId, graphDefinition).then(function(result) {
              if (result && result.svg) {
                element.innerHTML = '<div class="graph-scroll">' + result.svg + '</div>';
              }
            }).catch(function(error) {
              console.error('Mermaid rendering error for diagram ' + index + ':', error);
            });
          } catch (e) {
            console.error('Mermaid rendering error for diagram ' + index + ':', e);
          }
        });
      }
    });

    // Render all Kroki diagrams (runtime fallback)
    Reveal.on('ready', function() {
      const allKrokiElements = document.querySelectorAll('.kroki');
      if (allKrokiElements && allKrokiElements.length > 0) {
        allKrokiElements.forEach(function(element, index) {
          // Skip if already rendered
          if (element.querySelector('svg') || element.querySelector('img')) {
            return;
          }

          const diagramType = element.getAttribute('data-type');
          const diagramSource = element.textContent.trim();

          if (!diagramType || !diagramSource) {
            return;
          }

          // Prefer GET image to avoid CORS issues on file:// origins
          try {
            const imgUrl = 'https://kroki.io/' + diagramType + '/svg?source=' + encodeURIComponent(diagramSource);
            element.innerHTML = '<div class="graph-scroll"><img alt="' + diagramType + ' diagram" src="' + imgUrl + '"/></div>';
          } catch (error) {
            console.error('Kroki rendering setup error for ' + diagramType + ' diagram ' + index + ':', error);
            element.innerHTML = '<p style="color: red;">Failed to prepare ' + diagramType + ' diagram.</p>';
          }
        });
      }
    });


    // Inject configuration
    window.slideConfig = ${JSON.stringify(_cfg.styleConfig)};

    // Dynamic Styling and Resizing Script
    let observer; // Define observer at top level

    function applyDynamicStyles() {
      const config = window.slideConfig;
      if (!config) return;

      // 1. Apply Title Styles - REMOVED (Migrated to CSS)

      const allSlides = document.querySelectorAll('.reveal .slides section');
      // No dynamic title styling anymore

      // 2. Resize Lists in current slide
      const currentSlide = Reveal.getCurrentSlide();
      if (!currentSlide) return;

      // 1. Fit lists (ul/ol)
      // Only target top-level lists to avoid double-sizing nested ones
      // 1. Fit content (theContents)
      // Target the container itself
      const contents = currentSlide.querySelectorAll('.theContents');
      if (contents.length === 0) return;

      contents.forEach(content => {
        // Check if auto font size is enabled
        if (config.style.theContents.font_size_auto === false) {
            return;
        }

        // Get title size for reference (from current slide or config)
        let titleSizePx = 60; // fallback
        const titleEl = currentSlide.querySelector('h1, h2');
        if (titleEl) {
          titleSizePx = parseFloat(window.getComputedStyle(titleEl).fontSize);
        }

        const maxFontSize = titleSizePx * (config.style.theContents.fontSizeMaxRatio || 0.66);
        const minFontSize = parseFloat(config.style.theContents.fontSizeMin || '20px');

        // Binary search or iterative approach to find best fit
        // Range: [minFontSize, maxFontSize]

        let low = minFontSize;
        let high = maxFontSize;
        let bestFit = minFontSize;

        // Reset styles for measurement
        content.style.fontSize = maxFontSize + 'px';
        content.style.lineHeight = '1.2'; // Tighter line height for large text

        // Check if it fits at max
        // We compare slide scrollHeight with slide clientHeight to detect overflow
        if (currentSlide.scrollHeight <= currentSlide.clientHeight) {
           bestFit = maxFontSize;
        } else {
           // Binary search
           for (let i = 0; i < 10; i++) { // 10 iterations is enough precision
              const mid = (low + high) / 2;
              content.style.fontSize = mid + 'px';
              // Check if slide overflows
              if (currentSlide.scrollHeight <= currentSlide.clientHeight) {
                 bestFit = mid;
                 low = mid;
              } else {
                 high = mid;
              }
           }
        }

        // Unobserve to prevent infinite loop (style change -> resize -> observer -> style change)
        if (observer) observer.unobserve(content);

        // Apply best fit
        content.style.fontSize = bestFit + 'px';

        // If even at min size it overflows, enable scroll (already auto in CSS)
        if (bestFit <= minFontSize + 1) {
           content.style.fontSize = minFontSize + 'px';
        }

        // Re-observe after a delay to skip the immediate resize caused by our change
        if (observer) {
          requestAnimationFrame(() => {
            observer.observe(content);
          });
        }
      });
    }

    Reveal.on('ready', () => {
      applyDynamicStyles();

      // Use ResizeObserver to handle dynamic content changes (images loading, etc.)
      observer = new ResizeObserver(entries => {
        // Debounce or throttle could be added if needed, but for now direct call
        // Check if the resized element is the current slide
        const currentSlide = Reveal.getCurrentSlide();
        if (currentSlide && entries.some(entry => entry.target === currentSlide || currentSlide.contains(entry.target))) {
           applyDynamicStyles();
        }
      });

      // Observe all content containers to detect changes (e.g. images/diagrams loading)
      document.querySelectorAll('.reveal .slides section .theContents').forEach(content => {
        observer.observe(content);
      });
    });
    Reveal.on('slidechanged', applyDynamicStyles);
    // Also re-apply on resize
    window.addEventListener('resize', applyDynamicStyles);

    // Issue55 Phase 6/7: TOC 슬라이드 내부 .toc-mindmap-svg에 markmap 렌더 (#toc-container 오버레이 폐기)
    var tocData = ${JSON.stringify(tocData, null, 6)};
    var markmapInitialized = false;
    var markmapInstance = null;

    function findTocSlideSvg() {
      var tocSlide = document.getElementById('toc-placeholder');
      if (!tocSlide) return null;
      return tocSlide.querySelector('.toc-mindmap-svg');
    }

    function initTocMarkmapIfNeeded() {
      if (markmapInitialized) {
        if (markmapInstance && markmapInstance.fit && !isPrintMode) {
          requestAnimationFrame(function(){ try { markmapInstance.fit(); } catch(e){} });
        }
        return;
      }
      if (!window.markmap) return;
      var svg = findTocSlideSvg();
      if (!svg) return;
      try {
        markmapInstance = window.markmap.Markmap.create(svg, {
          autoFit: true,
          fitRatio: 0.95,
          spacingHorizontal: 80,
          spacingVertical: 12,
          paddingX: 40,
          initialExpandLevel: ${markmapDepth}
        }, tocData);
        markmapInitialized = true;
        if (!isPrintMode) {
          setTimeout(function(){ if (markmapInstance && markmapInstance.fit) { try { markmapInstance.fit(); } catch(e){} } }, 50);
        } else {
          setTimeout(function(){ if (markmapInstance && markmapInstance.fit) { try { markmapInstance.fit(); } catch(e){} } }, 1000);
        }
      } catch(e) {
        console.warn('Markmap initialization failed:', e);
      }
    }

    Reveal.on('ready', function() {
      initTocMarkmapIfNeeded();
    });
    Reveal.on('slidechanged', function() {
      var cur = Reveal.getCurrentSlide();
      if (cur && cur.id === 'toc-placeholder') {
        initTocMarkmapIfNeeded();
      }
    });

    // Keep Markmap fitted on window resize
    var resizeTimeout;
    window.addEventListener('resize', function(){
      if (isPrintMode) return; // Skip resize logic in print mode

      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function() {
        if (markmapInstance && markmapInstance.fit) {
          try { markmapInstance.fit(); } catch(e) {}
        }
        adjustGraphScrollHeights();
        fitSmallDiagrams();
        topBiasCurrentSlide();
      }, 100);
    });

    // Adjust scroll height for tall diagrams based on Reveal scale
    function adjustGraphScrollHeights() {
      // Use Reveal logical size and subtract actual header height on current slide
      var cfg = (typeof Reveal.getConfig === 'function') ? Reveal.getConfig() : { width: 1280, height: 720 };
      var baseH = cfg && cfg.height ? cfg.height : 720;

      var cur = (typeof Reveal.getCurrentSlide === 'function') ? Reveal.getCurrentSlide() : null;
      var headerSpace = 0;
      if (cur) {
        // Sum heights of visible H1/H2 in current slide
        var heads = cur.querySelectorAll('h1, h2');
        heads.forEach(function(h){
          var cs = window.getComputedStyle(h);
          var mh = parseFloat(cs.marginTop) + parseFloat(cs.marginBottom);
          headerSpace += h.offsetHeight + mh;
        });
        // Add a small buffer below titles
        headerSpace += 40;
      }

      var available = baseH - headerSpace - 40; // smaller buffer to allow larger content
      if (available < 200) available = 200;

      // Only adjust graph-scroll inside current slide to avoid layout thrash
      var apply = function(scope){
        scope.querySelectorAll('.graph-scroll').forEach(function(el){
          el.style.maxHeight = available + 'px';
          el.style.overflowY = 'auto';
          // Prefer height-based fit for diagrams
          el.querySelectorAll('svg, img').forEach(function(di){
            di.style.maxHeight = available + 'px';
            di.style.height = 'auto';
            di.style.width = 'auto';
            di.style.maxWidth = '100%';
          });
        });
      };
      if (cur) apply(cur); else apply(document);
    }

    // title_contents_gap: title 높이의 % 만큼 margin-bottom을 h*.title에 적용
    // .present 셀렉터로 현재 슬라이드만 처리해 hidden slide의 offsetHeight=0 오진 방지
    function applyTitleContentsGap() {
      var raw = getComputedStyle(document.body).getPropertyValue('--title-contents-gap-pct');
      var pct = parseFloat(raw);
      if (isNaN(pct)) pct = 30;
      document.querySelectorAll(
        '.reveal .slides section.present h1.title,' +
        '.reveal .slides section.present h2.title,' +
        '.reveal .slides section.present h3.title'
      ).forEach(function(el) {
        var h = el.offsetHeight;
        if (h > 0) el.style.marginBottom = Math.round(h * pct / 100) + 'px';
      });
    }

    // Vertically bias content to top by reducing extra center spacing using margin
    var lastAdjustedSlide = null;
    function topBiasCurrentSlide() {
      if (typeof Reveal.getCurrentSlide !== 'function') return;
      var slide = Reveal.getCurrentSlide();
      if (!slide) return;
      // reset previous
      if (lastAdjustedSlide && lastAdjustedSlide !== slide) {
        lastAdjustedSlide.style.marginTop = '';
      }
      // compute extra space when content is short (Reveal may center it)
      var cfg = (typeof Reveal.getConfig === 'function') ? Reveal.getConfig() : { height: 720 };
      var logicalH = cfg && cfg.height ? cfg.height : 720;
      var contentH = slide.scrollHeight;
      var extra = (logicalH - contentH) / 2; // space added by vertical centering
      if (extra > 10) {
        // leave a small 10px top padding, pull the rest up via negative margin
        var offset = Math.min(extra - 10, logicalH * 0.25); // cap shift to 25% of slide height
        slide.style.marginTop = '-' + Math.round(offset) + 'px';
        lastAdjustedSlide = slide;
      } else {
        slide.style.marginTop = '';
      }
    }

    // Enlarge small diagrams up to slide width, capping height to 3:2
    function fitSmallDiagrams() {
      var cfg = (typeof Reveal.getConfig === 'function') ? Reveal.getConfig() : { width: 1280, height: 720 };
      var contentW = (cfg && cfg.width ? cfg.width : 1280) - 120; // padding (60px each side)
      if (contentW < 320) contentW = 320;
      var capH = Math.floor(contentW * 2 / 3);

      document.querySelectorAll('.graph-scroll > svg, .graph-scroll > img').forEach(function(el){
        var rect = el.getBoundingClientRect();
        var curW = rect && rect.width ? rect.width : 0;
        // Only upscale when clearly smaller than container
        if (curW > 0 && curW < contentW * 0.7) {
          el.style.width = contentW + 'px';
          el.style.maxHeight = capH + 'px';
          el.style.height = 'auto';
        } else {
          // Do not force width for already large diagrams
          el.style.removeProperty('width');
          el.style.removeProperty('max-height');
        }
      });
    }

    Reveal.on('ready', function(){
      if (document.body.classList.contains('top-align-mode')) {
        // Enforce top alignment in case theme defaults differ
        if (typeof Reveal.configure === 'function') { Reveal.configure({ center: false }); }
        // Remove extra top padding on current slide to keep content tight to top
        var cur = Reveal.getCurrentSlide();
        if (cur) cur.style.paddingTop = '10px';
        topBiasCurrentSlide();
      }
      adjustGraphScrollHeights();
      fitSmallDiagrams();
      // rAF: 첫 슬라이드 레이아웃 완료 후 gap 적용
      requestAnimationFrame(applyTitleContentsGap);
    });
    Reveal.on('slidechanged', function(){
      adjustGraphScrollHeights();
      fitSmallDiagrams();
      // rAF: slide 전환 애니메이션/레이아웃 완료 후 gap 적용
      requestAnimationFrame(applyTitleContentsGap);
      if (document.body.classList.contains('top-align-mode')) { topBiasCurrentSlide(); }
    });
    window.addEventListener('resize', function(){
      adjustGraphScrollHeights();
      fitSmallDiagrams();
      applyTitleContentsGap();
      if (document.body.classList.contains('top-align-mode')) { topBiasCurrentSlide(); }
    });

    // Last slide message state
    var lastSlideMessageShown = false;
    var lastSlideMessage = document.getElementById('last-slide-message');

    // Issue55 Phase 9 + Issue70: 키 네비게이션 — 페이지 계층 단계별 이동
    // M2SLIDE_MODE: 'single' | 'chapter' (빌드 시점 주입)
    // M2SLIDE_COVER: 'true' | 'false' (cover_enabled, Single mode ← override 판정용)
    // PREV_CHAPTER: 이전 챕터 HTML 파일명 (chapter mode TOC slide ← 대상)
    // NEXT_CHAPTER: 다음 챕터 HTML 파일명 (chapter mode ↓ 대상, key_navigation.md K9)
    var M2SLIDE_MODE = '${hasAgenda ? 'chapter' : 'single'}';
    var M2SLIDE_COVER = ${_cfg.coverEnabled ? 'true' : 'false'};
    var PREV_CHAPTER = '${prevChapter}';
    var NEXT_CHAPTER = '${nextChapter}';
    // Issue87: ⇟ PgDown(마지막 페이지 직행) — Single mode은 '' (deck last로 자체 계산)
    var LAST_CHAPTER = '${lastChapter}';
    function isCoverSlide(slide) {
      if (!slide) return false;
      return slide.classList && slide.classList.contains('layout-_cover');
    }
    function isTocSlide(slide) {
      if (!slide) return false;
      return slide.id === 'toc-placeholder';
    }
    // Issue71: section anchor — layout-_toc class를 가지나 toc-placeholder id는 없는 슬라이드 (H1·H2 sub-section autoToc 모두 포함)
    function isAnchorSlide(slide) {
      if (!slide) return false;
      if (!slide.classList || !slide.classList.contains('layout-_toc')) return false;
      return slide.id !== 'toc-placeholder';
    }
    // Issue92: H1 레벨 anchor만 sibling 점프(Home/End) 및 본문 ↑ 부모 lookup 대상
    // (H2 sub-section autoToc는 isAnchorSlide==true이지만 isH1Anchor==false → sibling/parent 후보에서 제외)
    function isH1Anchor(slide) {
      if (!isAnchorSlide(slide)) return false;
      return slide.dataset && slide.dataset.headingLevel === '1';
    }
    function findTocSlideIndex() {
      // 0X-*.html (chapter)에서 #/toc-placeholder의 horizontal index 찾기
      var slides = Reveal.getHorizontalSlides();
      for (var i = 0; i < slides.length; i++) {
        if (slides[i].id === 'toc-placeholder') return i;
      }
      return -1;
    }
    // Issue71+92: 현재 horizontal index 이전에서 가장 가까운 H1 anchor 슬라이드 index 반환 (Home sibling 점프용)
    function findPrevH1AnchorIndex(currentH) {
      var slides = Reveal.getHorizontalSlides();
      for (var i = currentH - 1; i >= 0; i--) {
        if (isH1Anchor(slides[i])) return i;
      }
      return -1;
    }
    // K9+Issue92: 현재 horizontal index 이후에서 가장 가까운 H1 anchor 슬라이드 index 반환 (End sibling, ↓ TOC 첫 H1)
    function findNextH1AnchorIndex(currentH) {
      var slides = Reveal.getHorizontalSlides();
      for (var i = currentH + 1; i < slides.length; i++) {
        if (isH1Anchor(slides[i])) return i;
      }
      return -1;
    }
    // Issue99: 현재 horizontal index 이전에서 가장 가까운 anchor (H1 또는 H2 sub) 반환 — ↑ 부모 점프용
    // 본문 leaf의 직속 부모는 H2 sub-anchor가 우선(있을 때), 없으면 H1 anchor로 폴백
    function findPrevAnyAnchorIndex(currentH) {
      var slides = Reveal.getHorizontalSlides();
      for (var i = currentH - 1; i >= 0; i--) {
        if (isAnchorSlide(slides[i])) return i;
      }
      return -1;
    }
    // Issue105: enclosing anchor의 heading level 반환 (현재가 anchor면 자기 level, 본문이면 직전 anchor level, 없으면 1)
    function getEnclosingAnchorLevel(currentH) {
      var slides = Reveal.getHorizontalSlides();
      var cur = slides[currentH];
      if (isAnchorSlide(cur) && cur.dataset && cur.dataset.headingLevel) {
        return parseInt(cur.dataset.headingLevel, 10) || 1;
      }
      for (var i = currentH - 1; i >= 0; i--) {
        var s = slides[i];
        if (isAnchorSlide(s) && s.dataset && s.dataset.headingLevel) {
          return parseInt(s.dataset.headingLevel, 10) || 1;
        }
      }
      return 1;
    }
    // Issue105: 트리 탐색 sibling 점프 (Home/End용)
    // currentH 이전/이후 슬라이드 중 anchor && headingLevel <= level 첫 매치 반환
    function findPrevSiblingAnchorIndex(currentH, level) {
      var slides = Reveal.getHorizontalSlides();
      for (var i = currentH - 1; i >= 0; i--) {
        var s = slides[i];
        if (!isAnchorSlide(s)) continue;
        var lv = (s.dataset && s.dataset.headingLevel) ? parseInt(s.dataset.headingLevel, 10) : 1;
        if (lv <= level) return i;
      }
      return -1;
    }
    function findNextSiblingAnchorIndex(currentH, level) {
      var slides = Reveal.getHorizontalSlides();
      for (var i = currentH + 1; i < slides.length; i++) {
        var s = slides[i];
        if (!isAnchorSlide(s)) continue;
        var lv = (s.dataset && s.dataset.headingLevel) ? parseInt(s.dataset.headingLevel, 10) : 1;
        if (lv <= level) return i;
      }
      return -1;
    }
    // Issue106: 자식 sub-anchor (level > 현재) 첫 매치 반환 — anchor에서 ↓ 시 outline 우선 이동
    // currentH+1부터 scan, anchor 발견 시 level > 현재면 자식, level ≤ 현재면 scope 종료(-1)
    function findFirstChildAnchorIndex(currentH, level) {
      var slides = Reveal.getHorizontalSlides();
      for (var i = currentH + 1; i < slides.length; i++) {
        var s = slides[i];
        if (!isAnchorSlide(s)) continue;
        var lv = (s.dataset && s.dataset.headingLevel) ? parseInt(s.dataset.headingLevel, 10) : 1;
        if (lv > level) return i;
        return -1;
      }
      return -1;
    }

    // Issue107: Reveal 기본 ↑/↓ 컨트롤을 ArrowUp/ArrowDown 키 시뮬레이션으로 hijack + 활성 상태 가시화
    function m2DispatchKey(key, code) {
      var ev = new KeyboardEvent('keydown', { key: key, keyCode: code, which: code, bubbles: true, cancelable: true });
      document.dispatchEvent(ev);
    }
    function m2EvalDownEnabled() {
      var cur = Reveal.getCurrentSlide();
      if (!cur) return false;
      if (isCoverSlide(cur) || isTocSlide(cur) || isAnchorSlide(cur)) return true;
      // leaf
      if (M2SLIDE_MODE === 'chapter') {
        return !!(NEXT_CHAPTER && NEXT_CHAPTER !== 'index.html');
      }
      return findNextH1AnchorIndex(Reveal.getIndices().h) >= 0;
    }
    function m2UpdateNavControls() {
      var upBtn = document.querySelector('.reveal .controls .navigate-up');
      var downBtn = document.querySelector('.reveal .controls .navigate-down');
      if (!upBtn || !downBtn) return;
      var cur = Reveal.getCurrentSlide();
      if (!cur) return;
      // ↑ : Cover면 비활성, 그 외 활성 (Cover는 최상위)
      upBtn.classList.toggle('m2-enabled', !isCoverSlide(cur));
      // ↓ : leaf fall-through 가능 여부 + Cover/TOC/Anchor 항상 활성
      downBtn.classList.toggle('m2-enabled', m2EvalDownEnabled());
    }
    Reveal.on('ready', function() {
      var upBtn = document.querySelector('.reveal .controls .navigate-up');
      var downBtn = document.querySelector('.reveal .controls .navigate-down');
      if (upBtn) {
        upBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopImmediatePropagation();
          if (!upBtn.classList.contains('m2-enabled')) return;
          m2DispatchKey('ArrowUp', 38);
        }, true);
      }
      if (downBtn) {
        downBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopImmediatePropagation();
          if (!downBtn.classList.contains('m2-enabled')) return;
          m2DispatchKey('ArrowDown', 40);
        }, true);
      }
      m2UpdateNavControls();
    });
    Reveal.on('slidechanged', m2UpdateNavControls);

    // Issue110: cross-page 가드 해제 + 진입 애니메이션 (Issue70/Issue104 통합)
    //   ?last=1&back=1 → 마지막 슬라이드 점프 + backward 애니메이션
    //   ?last=1        → 마지막 슬라이드 점프 (애니메이션 없음, PgDown jump)
    //   ?back=1        → backward 애니메이션 (← cross-chapter)
    //   ?fwd=1         → forward 애니메이션 (→ cross-chapter)
    ${M2_RELEASE_FN_JS}
    function m2PlayEnterAnim(direction) {
      // direction: 'back' | 'fwd'
      requestAnimationFrame(function() {
        m2ReleaseCrossGuard();
        var cls = direction === 'back' ? 'm2-back-enter' : 'm2-fwd-enter';
        document.body.classList.add(cls);
        setTimeout(function(){ document.body.classList.remove(cls); }, 450);
      });
    }
    Reveal.on('ready', function(){
      try {
        var s = location.search;
        var hasLast = s.indexOf('last=1') !== -1;
        var hasBack = s.indexOf('back=1') !== -1;
        var hasFwd  = s.indexOf('fwd=1') !== -1;
        if (hasLast) {
          var totalH = Reveal.getHorizontalSlides().length;
          if (totalH > 0) {
            if (hasBack) {
              Reveal.configure({ transition: 'none' });
              Reveal.slide(totalH - 1, 0);
              requestAnimationFrame(function() {
                m2ReleaseCrossGuard();
                document.body.classList.add('m2-back-enter');
                setTimeout(function() {
                  Reveal.configure({ transition: 'slide' });
                  document.body.classList.remove('m2-back-enter');
                }, 450);
              });
            } else {
              // last=1 단독 (PgDown jump): 트랜지션 없이 점프 + 가드만 해제
              Reveal.slide(totalH - 1, 0);
              requestAnimationFrame(m2ReleaseCrossGuard);
            }
          } else {
            requestAnimationFrame(m2ReleaseCrossGuard);
          }
        } else if (hasBack) {
          m2PlayEnterAnim('back');
        } else if (hasFwd) {
          m2PlayEnterAnim('fwd');
        }
      } catch (_) {}
    });

    // Issue89: capture phase 등록 — Reveal.js 5.0.4가 Home/End 등 일부 키를 자체 keymap으로 가로채므로
    // bubble보다 먼저 호출되는 capture phase에서 stop()으로 차단해야 본 매트릭스가 우선 적용됨
    document.addEventListener('keydown', function(event) {
      var cur = Reveal.getCurrentSlide();
      // 키 동작 종결 헬퍼: 브라우저 default + Reveal.js 기본 핸들러까지 차단 (key_navigation.md 매트릭스 강제)
      function stop() { event.preventDefault(); event.stopImmediatePropagation(); }
      // chapter 모드의 deck 내 TOC slide 폴백 점프 (없으면 agenda)
      function gotoTocOrAgenda() {
        if (M2SLIDE_MODE === 'chapter') {
          var i = findTocSlideIndex();
          if (i >= 0) { Reveal.slide(i, 0); return; }
        }
        // Issue110: chapter→agenda는 parent 이동 → backward 시그널
        window.location.href = 'agenda.html?back=1';
      }

      // Issue87: ⇞ PgUp — 어디서든 agenda.html 직행 (구 ⌂ Home 동작 승계)
      if (event.key === 'PageUp' || event.keyCode === 33) {
        stop();
        // Issue110: PgUp은 parent 점프 → backward 시그널
        window.location.href = 'agenda.html?back=1';
        return;
      }

      // Issue87: ⇟ PgDown — 마지막 페이지 직행 (Reveal 기본 hijack)
      // Chapter: LAST_CHAPTER + ?last=1 → Reveal.on('ready')에서 마지막 슬라이드로 이동
      // Single: 같은 deck 마지막 horizontal 슬라이드
      if (event.key === 'PageDown' || event.keyCode === 34) {
        stop();
        if (M2SLIDE_MODE === 'chapter' && LAST_CHAPTER) {
          window.location.href = LAST_CHAPTER + '?last=1';
        } else {
          var totalLast = Reveal.getHorizontalSlides().length;
          if (totalLast > 0) Reveal.slide(totalLast - 1, 0);
        }
        return;
      }

      // Issue87 (2026-05-04 swap): ↑ 키 — 페이지 계층 parent 이동 (K3, 구 ⇤ Home 동작 승계)
      // Issue101: 페이지 계층 = leaf → H2 sub-anchor → H1 anchor → TOC/agenda → cover
      //   leaf 본문 → 직전 anchor (H2 우선, 없으면 H1)
      //   H2 sub-anchor → 직전 H1 anchor (없으면 TOC/agenda 폴백)
      //   H1 anchor → TOC/agenda
      if (event.key === 'ArrowUp' || event.keyCode === 38) {
        if (isCoverSlide(cur)) { stop(); return; } // Cover: 최상위
        if (isTocSlide(cur))   { stop(); window.location.href = 'agenda.html?back=1'; return; }
        if (isH1Anchor(cur))   { stop(); gotoTocOrAgenda(); return; }
        if (isAnchorSlide(cur)) {
          // H2 sub-anchor → 직전 H1 anchor
          var h1Idx = findPrevH1AnchorIndex(Reveal.getIndices().h);
          stop();
          if (h1Idx >= 0) { Reveal.slide(h1Idx, 0); return; }
          gotoTocOrAgenda();
          return;
        }
        // 본문 leaf → 같은 deck 직전 anchor (H2 우선, 없으면 H1) — Issue100 회복
        var anchorIdx = findPrevAnyAnchorIndex(Reveal.getIndices().h);
        stop();
        if (anchorIdx >= 0) { Reveal.slide(anchorIdx, 0); return; }
        gotoTocOrAgenda();
        return;
      }

      // Issue87 (2026-05-04 swap): ↓ 키 — 페이지 계층 child 이동 (K3, 구 ⇥ End 동작 승계)
      // Cover→agenda 포함. deck 내부:
      //   TOC slide → 첫 H1 anchor (없으면 첫 본문 #/1)
      //   H1 anchor → 같은 deck 직후 슬라이드
      //   본문(leaf) → Chapter 모드: 다음 챕터 첫 슬라이드 (TOC slide, 메시지 없음·1회) [Issue99]
      //                Single 모드: 동작 없음 (leaf 유지)
      if (event.key === 'ArrowDown' || event.keyCode === 40) {
        if (isCoverSlide(cur)) { stop(); window.location.href = 'agenda.html?fwd=1'; return; }
        if (isTocSlide(cur)) {
          var firstAnchor = findNextH1AnchorIndex(-1);
          stop();
          if (firstAnchor >= 0) Reveal.slide(firstAnchor, 0);
          else if (Reveal.getHorizontalSlides().length > 1) Reveal.slide(1, 0);
          return;
        }
        if (isAnchorSlide(cur)) {
          // Issue106: 자식 sub-anchor (level > 현재) 우선 — outline 트리 의미. 없으면 직후 슬라이드 (기존)
          var idxD = Reveal.getIndices().h;
          var anchorLv = getEnclosingAnchorLevel(idxD);
          var firstChild = findFirstChildAnchorIndex(idxD, anchorLv);
          stop();
          if (firstChild >= 0) {
            Reveal.slide(firstChild, 0);
          } else if (idxD + 1 < Reveal.getHorizontalSlides().length) {
            Reveal.slide(idxD + 1, 0);
          }
          return;
        }
        // 본문(leaf): leaf fall-through, 메시지 없이 즉시 이동
        //   Chapter 모드 → 다음 챕터 첫 슬라이드 (Issue99)
        //   Single 모드 → 다음 H1 anchor (Issue103). 마지막 H1 섹션이면 무동작
        stop();
        if (M2SLIDE_MODE === 'chapter') {
          if (NEXT_CHAPTER && NEXT_CHAPTER !== 'index.html') {
            // Issue104: 다음 챕터 진입은 forward — ?fwd=1 시그널로 forward 애니메이션
            window.location.href = NEXT_CHAPTER + '?fwd=1';
          }
        } else {
          var leafNextH1 = findNextH1AnchorIndex(Reveal.getIndices().h);
          if (leafNextH1 >= 0) Reveal.slide(leafNextH1, 0);
        }
        return;
      }

      // Issue87 (2026-05-04 swap): ⇤ Home — 이전 sibling 점프 (K4)
      // Chapter: 이전 챕터 TOC slide / Single: 같은 deck 직전 H1 anchor
      // Issue92: ',' (Comma) 를 fallback 으로 매핑 — 일부 macOS·외장 키보드 환경에서 Home keydown이 OS 단계에서 가로채져 페이지로 전달되지 않음
      // Issue92_1: ⌘+← 도 Home fallback — Keyboard Maestro 등 키 리매핑 도구가 Home → ⌘ArrowLeft 변환 시 호환
      if (event.key === 'Home' || event.keyCode === 36 || event.code === 'Comma' || (event.metaKey && event.key === 'ArrowLeft')) {
        if (isCoverSlide(cur)) { stop(); return; } // Cover: 최상위
        if (M2SLIDE_MODE === 'chapter') {
          stop();
          // Issue104: 이전 챕터 진입은 backward 방향 — ?back=1 시그널로 backward 애니메이션 재생
          // Issue114: 첫 챕터(PREV_CHAPTER 빈값)는 agenda fallback (parent 진입)
          if (PREV_CHAPTER) window.location.href = PREV_CHAPTER + '?back=1';
          else window.location.href = 'agenda.html?back=1';
          return;
        }
        // Issue105: Single — 트리 탐색 sibling. enclosing anchor 레벨 N 기준 직전 anchor at level ≤ N
        var curHForHome = Reveal.getIndices().h;
        var encLevelHome = getEnclosingAnchorLevel(curHForHome);
        var prevAnchorIdx = findPrevSiblingAnchorIndex(curHForHome, encLevelHome);
        stop();
        if (prevAnchorIdx >= 0) Reveal.slide(prevAnchorIdx, 0);
        return;
      }

      // ← 키 처리 — Issue70 통일 매트릭스
      // Issue92_1: ⌘+← 는 Home fallback 으로 위에서 처리되었으므로 제외
      if ((event.key === 'ArrowLeft' || event.keyCode === 37) && !event.metaKey) {
        var idxL = Reveal.getIndices();
        // Chapter mode TOC slide 또는 (TOC 없는 chapter의) 첫 슬라이드 #/0 → 이전 챕터 마지막 (없으면 agenda)
        var atChapterDeckStart = (M2SLIDE_MODE === 'chapter' && idxL.h === 0 && idxL.v === 0);
        if (isTocSlide(cur) || atChapterDeckStart) {
          event.preventDefault();
          if (M2SLIDE_MODE === 'chapter' && PREV_CHAPTER) {
            // Issue104: ← 이전 챕터 마지막 진입은 backward — &back=1 시그널 추가
            window.location.href = PREV_CHAPTER + '?last=1&back=1';
          } else {
            // Issue110: ← 첫 deck에서 agenda 폴백 — backward 시그널
            window.location.href = 'agenda.html?back=1';
          }
          return;
        }
        // Single mode + cover_enabled + 본문 첫 슬라이드(#/1) → agenda.html (Cover 우회)
        if (M2SLIDE_MODE === 'single' && M2SLIDE_COVER && idxL.h === 1 && idxL.v === 0) {
          event.preventDefault();
          // Issue110: ← 본문에서 agenda로 — backward 시그널
          window.location.href = 'agenda.html?back=1';
          return;
        }
      }

      // → 키: Cover 슬라이드 override → agenda.html (D6 결정)
      // (↓는 위 child 이동 블록에서 이미 Cover 처리됨)
      // Issue92_1: ⌘+→ 는 End fallback 으로 아래에서 처리되므로 제외
      if ((event.key === 'ArrowRight' || event.keyCode === 39) && !event.metaKey) {
        if (isCoverSlide(cur)) {
          event.preventDefault();
          // Issue110: → from cover → agenda는 forward (child 이동)
          window.location.href = 'agenda.html?fwd=1';
          return;
        }
      }

      // Issue87 (2026-05-04 swap): ⇥ End — 다음 sibling 점프 (K4, ⇤와 대칭)
      // Chapter: 다음 챕터 TOC slide / Single: 같은 deck 직후 H1 anchor
      // Issue92: '.' (Period) 를 fallback 으로 매핑 — Home/End 동일 사유
      // Issue92_1: ⌘+→ 도 End fallback — Keyboard Maestro 등이 End → ⌘ArrowRight 변환 시 호환
      if (event.key === 'End' || event.keyCode === 35 || event.code === 'Period' || (event.metaKey && event.key === 'ArrowRight')) {
        if (M2SLIDE_MODE === 'chapter') {
          stop();
          // 마지막 챕터(NEXT_CHAPTER 빈값/wrap)는 동작 없음 (K5)
          if (NEXT_CHAPTER && NEXT_CHAPTER !== 'index.html') {
            // Issue104: 다음 챕터 진입은 forward — ?fwd=1 시그널
            window.location.href = NEXT_CHAPTER + '?fwd=1';
          }
          return;
        }
        // Issue105: Single — 트리 탐색 sibling. enclosing anchor 레벨 N 기준 직후 anchor at level ≤ N
        var curHForEnd = Reveal.getIndices().h;
        var encLevelEnd = getEnclosingAnchorLevel(curHForEnd);
        var nextAnchorIdx = findNextSiblingAnchorIndex(curHForEnd, encLevelEnd);
        stop();
        if (nextAnchorIdx >= 0) Reveal.slide(nextAnchorIdx, 0);
        return;
      }

      // → 키: 마지막 슬라이드 → 다음 챕터 (기존 동작 유지)
      if (event.key === 'ArrowRight' || event.keyCode === 39) {
        var totalSlides = Reveal.getTotalSlides();
        var currentSlideNumber = Reveal.getSlidePastCount() + 1;
        var hasNextChapter = '${nextChapter}' !== '';
        if (currentSlideNumber >= totalSlides) {
          if (hasNextChapter) {
            if (lastSlideMessageShown) {
              lastSlideMessage.style.display = 'none';
              lastSlideMessageShown = false;
              // Issue104: 다음 챕터 진입은 forward — ?fwd=1 시그널
              window.location.href = '${nextChapter}?fwd=1';
            } else {
              event.preventDefault();
              lastSlideMessage.style.display = 'block';
              lastSlideMessageShown = true;
            }
          } else {
            event.preventDefault();
          }
        }
      }
    }, true);  // Issue89: capture phase

    // Hide message when slide changes
    Reveal.on('slidechanged', function() {
      lastSlideMessage.style.display = 'none';
      lastSlideMessageShown = false;
    });

    // Issue51: touch/mouse 드래그 네비게이션 (Reveal touch:false이므로 직접 구현)
    // synthetic keydown으로 기존 Phase 9 키 핸들러(isCoverSlide, M2SLIDE_MODE 등) 재사용
    (function(){
      var startX, startY, startTime;
      var SWIPE_MIN_PX = 50;
      var SWIPE_MAX_MS = 700;

      function simulateKey(key, keyCode) {
        document.dispatchEvent(new KeyboardEvent('keydown', {
          key: key, keyCode: keyCode, bubbles: true, cancelable: true
        }));
      }

      function onSwipe(dx, dy) {
        var adx = Math.abs(dx), ady = Math.abs(dy);
        if (adx >= ady && adx >= SWIPE_MIN_PX) {
          // 수평 swipe: 좌→우 = ← (prev), 우→좌 = → (next)
          simulateKey(dx < 0 ? 'ArrowRight' : 'ArrowLeft', dx < 0 ? 39 : 37);
        } else if (ady > adx && ady >= SWIPE_MIN_PX) {
          // 수직 swipe (Issue87 2026-05-04 swap): 위→아래 = ↑(parent), 아래→위 = ↓(child)
          // 단축키(⇤/⇥/⇞/⇟)는 swipe로 트리거 불가 — sibling/끝단 점프는 키보드 전용
          simulateKey(dy > 0 ? 'ArrowUp' : 'ArrowDown', dy > 0 ? 38 : 40);
        }
      }

      // ── Touch (모바일/태블릿) ──
      document.addEventListener('touchstart', function(e) {
        if (e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startTime = Date.now();
      }, { passive: true });

      document.addEventListener('touchend', function(e) {
        if (e.changedTouches.length !== 1) return;
        if (Date.now() - startTime > SWIPE_MAX_MS) return;
        onSwipe(
          e.changedTouches[0].clientX - startX,
          e.changedTouches[0].clientY - startY
        );
      }, { passive: true });

      // ── Mouse drag (데스크톱) ──
      var isDragging = false;
      document.addEventListener('mousedown', function(e) {
        if (e.button !== 0) return;
        startX = e.clientX; startY = e.clientY;
        startTime = Date.now(); isDragging = false;
      });
      document.addEventListener('mousemove', function(e) {
        if (e.buttons !== 1) return;
        if (Math.abs(e.clientX - startX) > 10 || Math.abs(e.clientY - startY) > 10) {
          isDragging = true;
        }
      });
      document.addEventListener('mouseup', function(e) {
        if (e.button !== 0 || !isDragging) { isDragging = false; return; }
        isDragging = false;
        // 텍스트 선택 시 드래그 무시
        if (window.getSelection && window.getSelection().toString().length > 0) return;
        if (Date.now() - startTime > SWIPE_MAX_MS) return;
        onSwipe(e.clientX - startX, e.clientY - startY);
      });
    })();
  </script>
${_cfg.guidLine ? `  <div id="m2-guide-layout-label" style="
    position: fixed;
    bottom: 10px;
    left: 10px;
    color: #8b00ff;
    font-size: 12px;
    font-weight: bold;
    font-family: monospace;
    background: rgba(255,255,255,0.85);
    padding: 3px 10px;
    border-radius: 4px;
    border: 4px double #8b00ff;
    pointer-events: none;
    z-index: 9999;
  "></div>
  <script>
  (function(){
    function updateLayoutLabel() {
      var label = document.getElementById('m2-guide-layout-label');
      if (!label) return;
      var cur = Reveal.getCurrentSlide();
      if (!cur) { label.textContent = ''; return; }
      var cls = cur.className || '';
      var m = cls.match(/\\blayout-([\\w-]+)/);
      label.textContent = m ? m[1] : '(plain)';
    }
    Reveal.on('ready', updateLayoutLabel);
    Reveal.on('slidechanged', updateLayoutLabel);
  })();
  </script>` : ''}
</body>
</html>
`;

  return html;
}


// cover_enabled=true 시 index.html을 Reveal.js 단일 슬라이드 커버 덱으로 생성
// .reveal section.layout-_cover CSS가 적용되도록 Reveal.js 컨텍스트 필수
function generateCoverHTML({ title, slideCssRel, outputDir, lastChapter = '', mode = 'chapter' }) {
  const coverTitle = title || _cfg.projectMeta.title || '';
  let coverSection;
  if (_cfg.layoutTemplates['_cover']) {
    coverSection = renderLayout('_cover', {
      ..._cfg.projectMeta,
      title: coverTitle,
      downloadButtons: '',
      content: '',
      markmap: '',
    });
  } else {
    coverSection = `<section class="layout-_cover"><div class="cover-header"><h1 class="cover-title">${coverTitle}</h1></div></section>`;
  }

  let cssLink = '';
  if (slideCssRel) {
    const cssAbs = path.isAbsolute(slideCssRel) ? slideCssRel : path.join(_cfg.configBaseDir, slideCssRel);
    const relHref = path.relative(outputDir, cssAbs);
    cssLink = `\n  <link rel="stylesheet" href="${relHref}?v=${Date.now()}">`;
  }

  const openPropsLink = _cfg.useOpenProps ? `\n  <link rel="stylesheet" href="https://unpkg.com/open-props"/>` : '';
  const fontImports = (_cfg.styleConfig.style.global.fontImport || [])
    .map(u => `\n  <link rel="stylesheet" href="${u}"/>`)
    .join('');

  // 커버 페이지는 .theContents/.media-container 구조가 없으므로
  // media-enlarge-* 는 적용 제외 (section height:100vh+display:flex 가 layout-_cover를 파괴)
  // guide-line-mode / top-align-mode 는 정상 적용
  const coverBodyClasses = [
    _cfg.topAlign ? 'top-align-mode' : '',
    _cfg.guidLine ? 'guide-line-mode' : '',
  ].filter(Boolean).join(' ');
  // Issue115: Cover는 `.reveal .controls, .reveal .slide-number { display: none !important }`라 시각 영향 없음.
  // 일관성 차원에서 data-nav-indicator만 전파 (향후 런타임 토글 시 동일 속성 기반 동작 보장).
  const bodyClassAttr = (coverBodyClasses ? ` class="${coverBodyClasses}"` : '') + ` data-nav-indicator="${_cfg.navIndicator}"`;

  // Issue66: 공통 헬퍼 resolveRevealDimensions로 단일화 (generateHTML과 동일 분기 공유)
  const { width: revealWidth, height: revealHeight, ratioClass } = resolveRevealDimensions(_cfg.slideRatio);

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${coverTitle}</title>
  ${M2_CROSS_GUARD_HEAD_HTML}
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/dist/reset.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/dist/reveal.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github.css">${openPropsLink}
  <style data-m2slide-base="true">
${BASE_CSS}
  </style>${fontImports}${cssLink}
  <style>
    /* 커버 페이지 전용: 컨트롤·슬라이드번호·프로그레스 숨김 */
    .reveal .controls, .reveal .progress, .reveal .slide-number { display: none !important; }
    .reveal { cursor: pointer; }
    ${M2_CROSS_GUARD_CSS}
  </style>
</head>
<body${bodyClassAttr} style="
  --global-font-family: ${_cfg.styleConfig.style.global.fontFamily};
  --title-font-family: ${_cfg.styleConfig.style.title.font_family || 'inherit'};
  --title-font-weight: ${_cfg.styleConfig.style.title.font_weight || '700'};
  --title-font-size: ${_cfg.styleConfig.style.title.font_size};
  --title-color: ${_cfg.styleConfig.style.title.font_color};
  --title-align: ${_cfg.styleConfig.style.title.align};
  --title-padding: ${_cfg.styleConfig.style.title.outer_padding};
  --main-title-font-family: ${_cfg.styleConfig.style.main_title.fontFamily || 'inherit'};
  --main-title-font-weight: ${_cfg.styleConfig.style.main_title.font_weight || '700'};
  --main-title-font-size: ${_cfg.styleConfig.style.main_title.font_size};
  --main-title-color: ${_cfg.styleConfig.style.main_title.font_color};
  --main-title-align: ${_cfg.styleConfig.style.main_title.align};
  --main-title-padding: ${_cfg.styleConfig.style.main_title.outer_padding};
  --outline-title-font-family: ${_cfg.styleConfig.style.outline_title.font_family || 'inherit'};
  --outline-title-font-weight: ${_cfg.styleConfig.style.outline_title.font_weight || '700'};
  --outline-title-font-size: ${_cfg.styleConfig.style.outline_title.font_size};
  --outline-title-color: ${_cfg.styleConfig.style.outline_title.font_color};
  --outline-title-align: ${_cfg.styleConfig.style.outline_title.align};
  --outline-title-padding: ${_cfg.styleConfig.style.outline_title.outer_padding};
  --outline-title-sub-font-family: ${_cfg.styleConfig.style.outline_title_sub.font_family || 'inherit'};
  --outline-title-sub-font-weight: ${_cfg.styleConfig.style.outline_title_sub.font_weight || '500'};
  --outline-title-sub-font-size: ${_cfg.styleConfig.style.outline_title_sub.font_size};
  --outline-title-sub-color: ${_cfg.styleConfig.style.outline_title_sub.font_color};
  --outline-title-sub-align: ${_cfg.styleConfig.style.outline_title_sub.align};
  --outline-title-sub-padding: ${_cfg.styleConfig.style.outline_title_sub.outer_padding};
  --content-font-family: ${_cfg.styleConfig.style.theContents.fontFamily || 'inherit'};
  --content-font-size: ${_cfg.styleConfig.style.theContents.font_size};
  --content-color: ${_cfg.styleConfig.style.theContents.font_color};
  --content-align: ${_cfg.styleConfig.style.theContents.align};
  --content-padding: ${_cfg.styleConfig.style.theContents.outer_padding};
  --title-contents-gap-pct: ${_cfg.titleContentsGap};
  --slide-ratio: ${slideRatioNumeric(_cfg.slideRatio)};
  --slide-outer-padding: ${_cfg.slideOuterPadding};
  --slide-inner-padding: ${_cfg.slideInnerPadding};
">
<div class="reveal ${ratioClass}">
  <div class="slides">
${coverSection}
  </div>
</div>
<script src="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/dist/reveal.js"></script>
<script>
Reveal.initialize({
  controls: false,
  progress: false,
  slideNumber: false,
  hash: false,
  // Issue66: ratio 모드(16:9/3:2)는 vertical centering이 ratio fit과 충돌하므로 false 강제.
  // ratio-fill 모드만 사용자 top_align 설정 따름 (generateHTML 정책과 일관)
  center: ${ratioClass === 'ratio-fill' ? !_cfg.topAlign : false},
  transition: 'none',
  touch: false,
  // Issue66: cover 페이지도 cfg.slideRatio 기반 dimensions 적용 (이전엔 100%/100% 하드코딩 → fill 강제 동작 버그)
  width: ${typeof revealWidth === 'number' ? revealWidth : `'${revealWidth}'`},
  height: ${typeof revealHeight === 'number' ? revealHeight : `'${revealHeight}'`},
  margin: 0.0,
  // Issue89: m2slide가 처리하는 키 — Reveal 기본 keymap 비활성화
  keyboard: { 36: null, 35: null, 33: null, 34: null }
});
// Issue110: cross-page 가드 해제 (Cover는 진입 애니메이션 미적용 — transition: 'none')
${M2_RELEASE_FN_JS}
Reveal.on('ready', function(){
  try { requestAnimationFrame(m2ReleaseCrossGuard); } catch (_) {}
});
// Issue87 (2026-05-04 swap): Cover 페이지 키 매핑 (key_navigation.md 매트릭스)
//   →/↓/Space → agenda.html (Cover의 child = Agenda)
//   ↑/⇤/← : Cover 최상위·sibling 없음 → 동작 없음
//   ⇥ End → agenda.html (Issue114: boundary fallback — Cover에서 다음 sibling 부재 시 child로 fall-through)
//   ⇞ PgUp → agenda.html (어디서든 직행)
//   ⇟ PgDown → LAST_CHAPTER?last=1 (chapter) / 동작 없음 (single — cover==index 자체가 deck)
var COVER_LAST_CHAPTER = '${lastChapter}';
var COVER_MODE = '${mode}';
// Issue89: capture phase — Reveal 기본 keymap이 Home/End를 가로채는 것 차단
document.addEventListener('keydown', function(e) {
  // Issue92_1: ⌘+→ 는 End fallback (Issue114: agenda 진행)으로 아래에서 처리, 일반 → 만 child 이동
  if (((e.key === 'ArrowRight' || e.keyCode === 39) && !e.metaKey) ||
      e.key === 'ArrowDown' || e.keyCode === 40 ||
      e.key === ' ' || e.keyCode === 32) {
    e.preventDefault(); e.stopImmediatePropagation(); window.location.href = 'agenda.html?fwd=1'; return;
  }
  if (e.key === 'PageUp' || e.keyCode === 33) {
    e.preventDefault(); e.stopImmediatePropagation(); window.location.href = 'agenda.html?fwd=1'; return;
  }
  if (e.key === 'PageDown' || e.keyCode === 34) {
    e.preventDefault(); e.stopImmediatePropagation();
    if (COVER_MODE === 'chapter' && COVER_LAST_CHAPTER) {
      window.location.href = COVER_LAST_CHAPTER + '?last=1';
    }
    return;
  }
  // Issue114: ⇥ End — Cover에서 Agenda로 fall-through (다음 sibling 부재 시 child 진행)
  // Issue92: '.' (Period) fallback / Issue92_1: ⌘+→ fallback 동일 처리
  if (e.key === 'End' || e.keyCode === 35 || e.code === 'Period' ||
      (e.metaKey && e.key === 'ArrowRight')) {
    e.preventDefault(); e.stopImmediatePropagation();
    window.location.href = 'agenda.html?fwd=1';
    return;
  }
  // ↑(parent)·⇤(이전 sibling)·← : Cover 최상위·sibling 없음 → 동작 없음
  // Issue92: ',' (Comma) Home fallback — Cover Home은 동작 없음 유지
  // Issue92_1: ⌘+← Home fallback — 동일 no-op
  if (e.key === 'ArrowUp' || e.keyCode === 38 ||
      e.key === 'Home' || e.keyCode === 36 || e.code === 'Comma' ||
      e.key === 'ArrowLeft' || e.keyCode === 37 ||
      (e.metaKey && e.key === 'ArrowLeft')) {
    e.preventDefault(); e.stopImmediatePropagation(); return;
  }
}, true);
document.querySelector('.reveal').addEventListener('click', function() { window.location.href = 'agenda.html?fwd=1'; });
</script>
${_cfg.guidLine ? `<div id="m2-guide-layout-label" style="
  position: fixed;
  bottom: 10px;
  left: 10px;
  color: #8b00ff;
  font-size: 12px;
  font-weight: bold;
  font-family: monospace;
  background: rgba(255,255,255,0.85);
  padding: 3px 10px;
  border-radius: 4px;
  border: 4px double #8b00ff;
  pointer-events: none;
  z-index: 9999;
"></div>
<script>
(function(){
  function updateLayoutLabel() {
    var label = document.getElementById('m2-guide-layout-label');
    if (!label) return;
    var cur = Reveal.getCurrentSlide();
    if (!cur) { label.textContent = ''; return; }
    var cls = cur.className || '';
    var m = cls.match(/\\blayout-([\\w-]+)/);
    label.textContent = m ? m[1] : '(plain)';
  }
  Reveal.on('ready', updateLayoutLabel);
  Reveal.on('slidechanged', updateLayoutLabel);
})();
</script>` : ''}
</body>
</html>`;
}

// cover_enabled=false 시 index.html → agenda.html 자동 redirect
function generateRedirectHTML(targetUrl) {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=${targetUrl}">
  <link rel="canonical" href="${targetUrl}">
  <title>Redirecting…</title>
</head>
<body>
  <a href="${targetUrl}">${targetUrl}로 이동</a>
</body>
</html>
`;
}

// Issue55 Phase 3: agenda.html standalone 생성기
// `_toc.html` layout을 standalone HTML 문서로 wrap (reveal.js 미포함, markmap 직접 렌더)
// 두 모드 공통 사용 — chapter는 parseAgenda 결과, single은 generateTOCFromFile 결과를 tocData로 받음
function generateAgendaHTML({ projectDir, agendaTitle, documentTitle, title, tocData, slideCssRel, outputDir, lastChapter = '', mode = 'chapter', coverEnabled = true }) {
  // Issue113: 헤더에 표시되는 타이틀(agendaTitle, default 'Agenda')과
  //           브라우저 탭 <title>(documentTitle, 프로젝트명)을 분리.
  //           구 호출 호환: 신규 키 미지정 시 기존 `title` 인자(프로젝트명)를 양쪽에 사용.
  const headerTitle = (agendaTitle != null) ? agendaTitle : (title || '');
  const docTitle = (documentTitle != null) ? documentTitle : (title || '');

  // 다운로드 자산 검출
  const downloadButtons = buildDownloadButtonsHTML(projectDir);

  // Issue69: agenda.html도 cfg.slideRatio 기반 ratio fit 적용 (이전엔 100%/100% 하드코딩 → fill 강제 동작 버그)
  // standalone HTML 문서이므로 reveal.js 의존 없이 .agenda-frame 박스로 ratio fit 처리
  const { ratioClass } = resolveRevealDimensions(_cfg.slideRatio);
  const ratioVar = slideRatioNumeric(_cfg.slideRatio);

  // _agenda.html layout 렌더 — 없으면 _toc 폴백, 둘 다 없으면 인라인 fallback
  let bodyHtml;
  const agendaLayoutName = _cfg.layoutTemplates['_agenda'] ? '_agenda' : (_cfg.layoutTemplates['_toc'] ? '_toc' : null);
  if (agendaLayoutName) {
    bodyHtml = renderLayout(agendaLayoutName, {
      ..._cfg.projectMeta,
      title: headerTitle,
      content: '',
      markmap: '',
      downloadButtons,
    });
  } else {
    // Fallback (theme에 _agenda/_toc 모두 없을 때)
    bodyHtml = `<div class="layout-_agenda"><header class="toc-page-header"><h1 class="toc-page-title">${headerTitle}</h1><div class="toc-page-downloads">${downloadButtons}</div></header><div class="toc-markmap"><svg class="toc-mindmap-svg"></svg></div></div>`;
  }

  // CSS 링크 산출
  let cssLink = '';
  if (slideCssRel) {
    const cssAbs = path.isAbsolute(slideCssRel) ? slideCssRel : path.join(_cfg.configBaseDir, slideCssRel);
    const relHref = path.relative(outputDir, cssAbs);
    cssLink = `<link rel="stylesheet" href="${relHref}?v=${Date.now()}">`;
  }

  const tocDataJson = JSON.stringify(tocData);
  const expandLevel = _cfg.styleConfig.markmap_depth || 2;

  // Issue69: standalone 페이지 스타일은 base.css §12로 이동. 인라인 CSS 제거.
  const bodyClass = ['agenda-page', _cfg.guidLine ? 'guide-line-mode' : ''].filter(Boolean).join(' ');

  return `<!doctype html>
<html lang="ko" class="${ratioClass}" style="--slide-ratio: ${ratioVar}; --slide-outer-padding: ${_cfg.slideOuterPadding}; --slide-inner-padding: ${_cfg.slideInnerPadding};">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${docTitle} — ${headerTitle}</title>
${M2_CROSS_GUARD_HEAD_HTML}
<style data-m2slide-base="true">
${BASE_CSS}
</style>
<style>${M2_CROSS_GUARD_CSS}
</style>
${cssLink}
</head>
<body class="${bodyClass}" data-nav-indicator="${_cfg.navIndicator}">
<div class="agenda-frame">
${bodyHtml}
</div>
${_cfg.guidLine ? `<div id="m2-guide-layout-label" style="
  position: fixed;
  bottom: 10px;
  left: 10px;
  color: #8b00ff;
  font-size: 12px;
  font-weight: bold;
  font-family: monospace;
  background: rgba(255,255,255,0.85);
  padding: 3px 10px;
  border-radius: 4px;
  border: 4px double #8b00ff;
  pointer-events: none;
  z-index: 9999;
">layout: _agenda</div>` : ''}
<script src="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/markmap-view@0.18.12/dist/browser/index.js"></script>
<script>
(function(){
  const tocData = ${tocDataJson};
  function init() {
    if (!window.markmap) { return setTimeout(init, 50); }
    const svg = document.querySelector('.toc-mindmap-svg');
    if (!svg) return;
    const opts = window.markmap.deriveOptions({ initialExpandLevel: ${expandLevel} });
    window.mm = window.markmap.Markmap.create(svg, opts, tocData);
    // Issue110: cross-page 가드 해제 (markmap 렌더 후 다음 frame)
    requestAnimationFrame(m2ReleaseCrossGuard);
  }
  ${M2_RELEASE_FN_JS}
  // Issue110: markmap CDN 로드 실패·지연에도 무한 가드 방지 — 2초 후 강제 해제
  setTimeout(m2ReleaseCrossGuard, 2000);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
// Issue87 (2026-05-04 swap): agenda 키 핸들러 (key_navigation.md 매트릭스)
//   ←/↑ (parent) → Cover (cover_enabled=true) / 동작 없음 (cover_enabled=false)
//   →/↓ (child)/Space → 첫 챕터 TOC(Chapter) / 첫 H1 anchor·본문(Single)
//   ⇤/⇥ (sibling) → 동작 없음 (Agenda는 메타 페이지, sibling 없음)
//   ⇞ PgUp → 무시 (자기 페이지)
//   ⇟ PgDown → LAST_CHAPTER?last=1 (Chapter) / index.html?last=1 (Single)
(function(){
  ${M2_NAV_HELPER_JS}
  const _tocData = ${tocDataJson};
  function firstHrefFromToc(node){
    if (!node || !node.children || node.children.length === 0) return null;
    for (const child of node.children) {
      if (child && child.content && typeof child.content === 'string') {
        const m = child.content.match(/href="([^"]+)"/);
        if (m) return m[1];
      }
      const nested = firstHrefFromToc(child);
      if (nested) return nested;
    }
    return null;
  }
  const AGENDA_MODE = '${mode}';
  const AGENDA_LAST_CHAPTER = '${lastChapter}';
  const AGENDA_COVER_ENABLED = ${coverEnabled ? 'true' : 'false'};
  const nextUrl = firstHrefFromToc(_tocData);
  // Issue89: capture phase — 일관성 (agenda는 reveal.js 미사용이라 hijack 우려는 적으나 동일 패턴 유지)
  document.addEventListener('keydown', function(e){
    // ← / ↑ (parent) → Cover (cover_enabled=true에 한함)
    // Issue92_1: ⌘+← 는 Home fallback (sibling, no-op)으로 아래에서 처리되므로 제외
    if (((e.key === 'ArrowLeft' || e.keyCode === 37) && !e.metaKey) ||
        e.key === 'ArrowUp' || e.keyCode === 38) {
      e.preventDefault(); e.stopImmediatePropagation();
      if (AGENDA_COVER_ENABLED) window.location.href = 'index.html?back=1';
      return;
    }
    // → / ↓ (child) / Space → 첫 챕터/첫 H1 anchor
    // Issue92_1: ⌘+→ 는 End fallback (sibling, no-op)으로 아래에서 처리되므로 제외
    if (((e.key === 'ArrowRight' || e.keyCode === 39) && !e.metaKey) ||
        e.key === 'ArrowDown' || e.keyCode === 40 ||
        e.key === ' ' || e.keyCode === 32) {
      if (nextUrl) {
        e.preventDefault(); e.stopImmediatePropagation();
        // Issue110: hash 포함 URL(single 모드 'index.html#/2')에서도 ?fwd=1을 hash 앞에 안전 주입
        window.location.href = m2NavWithSignal(nextUrl, 'fwd=1');
      }
      return;
    }
    // Issue114: ⇤ Home → Cover (parent fall-up, cover_enabled=true 한정) / ⇥ End → 첫 챕터 TOC (child fall-down)
    // Issue92: ',' (Comma) / '.' (Period) fallback / Issue92_1: ⌘+← / ⌘+→ fallback 동일 처리
    if (e.key === 'Home' || e.keyCode === 36 || e.code === 'Comma' ||
        (e.metaKey && e.key === 'ArrowLeft')) {
      e.preventDefault(); e.stopImmediatePropagation();
      if (AGENDA_COVER_ENABLED) window.location.href = 'index.html?back=1';
      return;
    }
    if (e.key === 'End' || e.keyCode === 35 || e.code === 'Period' ||
        (e.metaKey && e.key === 'ArrowRight')) {
      e.preventDefault(); e.stopImmediatePropagation();
      if (nextUrl) window.location.href = m2NavWithSignal(nextUrl, 'fwd=1');
      return;
    }
    // ⇞ PgUp → 자기 페이지 무시
    if (e.key === 'PageUp' || e.keyCode === 33) {
      e.preventDefault(); e.stopImmediatePropagation();
      return;
    }
    // ⇟ PgDown → 마지막 페이지
    if (e.key === 'PageDown' || e.keyCode === 34) {
      e.preventDefault(); e.stopImmediatePropagation();
      if (AGENDA_MODE === 'chapter' && AGENDA_LAST_CHAPTER) {
        window.location.href = AGENDA_LAST_CHAPTER + '?last=1';
      } else if (AGENDA_MODE === 'single') {
        window.location.href = 'index.html?last=1';
      }
      return;
    }
  }, true);
})();
</script>
</body>
</html>`;
}

module.exports = {
  configure,
  generateTOCFromFile,
  generateTocSlideHTML,
  generatePlainSlideHTML,
  generateSlideHTML,
  generateHTML,
  generateCoverHTML,
  generateRedirectHTML,
  generateAgendaHTML
};
