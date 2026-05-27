'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// Step5 이전 임시: VIDEO_DEFAULT_PRESETS 키 목록 (markdown.js 추출 후 require로 교체)
const _VIDEO_PRESET_KEYS = ['controls', 'autoplay-muted', 'autoplay-loop', 'loop', 'muted', 'background', 'minimal', 'autoplay-nocontrols'];

// Issue65: slide_ratio 유효값 화이트리스트. 외 입력은 빌드 실패 (hard error)
const VALID_SLIDE_RATIOS = ['16:9', '3:2', 'fill'];

// Issue115: nav_indicator 유효값 — 우측 하단 네비게이션 표시 모드
const VALID_NAV_INDICATORS = ['both', 'diamond', 'page'];

// Issue111: reveal.js 5.x transition·backgroundTransition 화이트리스트
//   _config.yml `animation:` 섹션에서 default 값 override 가능 (Reveal.initialize에 그대로 전달)
const VALID_TRANSITIONS = ['none', 'fade', 'slide', 'convex', 'concave', 'zoom'];
const VALID_TRANSITION_SPEEDS = ['default', 'fast', 'slow'];

function createDefaultConfig() {
  return {
    topAlign: false,
    guidLine: false,
    slideRatio: '16:9',
    slideOuterPadding: '0px',
    slideInnerPadding: '0px',
    titleContentsGap: 30,
    useOpenProps: false,
    slideCssRel: null,
    themeName: null,
    // Issue210: 컬러 팔레트 시스템 — theme variant 교체. theme/{themeName}/palettes/{palette}.css (또는 default fallback) 자동 로드
    //   미지정 시 'default' 자동 적용 (회귀 0 보증 — default 팔레트의 --m2-accent-1 = 기존 --kn-accent 값)
    //   카탈로그: data/palettes/catalog.yml / 설계 SSOT: _doc_arch/color-palette.md
    palette: 'default',
    themeDefaultLayout: null,
    layoutTemplates: {},
    // Issue137: 디버그·실험 옵션 — true 시 모든 파일 #/0에 빈 isTitle 슬라이드 강제 unshift (parser 단계).
    // chapter 모드 자동 _toc 슬라이드(html-builder.js:514-)와는 별개 메커니즘.
    // HTML id="toc-placeholder" 마커는 hasTocItems=true 챕터에서 자동 부여되므로 본 옵션 끄기 무관.
    tocPlaceholder: false,
    // Issue138: chapter 모드 #/N에 자동 삽입할 Cards Page (autoToc cards) 슬라이드 활성화.
    // true 시 hasTocItems(AGENDA.md H3 서브챕터 보유) 챕터에 cards 슬라이드 prepend.
    // Map Slide(markmap, layout 없음)와 Cards Page(layout-_cards)를 명확히 분리하기 위한 옵션.
    cardsPlaceholder: true,
    // toc_placeholder Map Slide를 markmap SVG 대신 H1 카드 그리드로 렌더
    tocCardMode: false,
    coverEnabled: false,
    // agenda.html 페이지 + 챕터 back navigation 활성. true(default): agenda.html 생성 + chapter에서 '⇤ back' → agenda. false: agenda.html 미생성 + back nav 무효.
    agendaEnabled: true,
    // Issue119: cover 슬라이드에 사용할 layout 이름 (single 모드 #/0 + chapter 모드 별도 index.html cover)
    coverLayout: '_cover',
    // Issue126: 글로벌 배경 — _config.yml `background:` 값 4종 자동 판정
    //   none: 미적용 (기본) / #hex: 색상 / *.png/jpg/...: 이미지 / *.mp4/webm/...: 비디오
    //   상세: _doc_design/background.md
    background: 'none',
    backgroundType: 'none',  // 'none' | 'color' | 'image' | 'video'
    backgroundFilename: null,  // 이미지/비디오 파일명 (slide/bg/{filename}로 복사됨)
    autoLayoutDetect: true,
    // Issue112: 챕터 모드 페이지 번호 — 'global'(전역 누적, breadcrumb 표시) / 'local'(챕터별 c/t)
    pageNumberMode: 'global',
    breadcrumb: true,
    // Issue115: 우측 하단 네비게이션 표시 모드 — 'both'(마름모 + 페이지번호) / 'diamond'(마름모만) / 'page'(페이지번호만)
    navIndicator: 'both',
    // Issue111: 슬라이드 전환·배경 트랜지션 전역 기본값 (Reveal.initialize에 전달)
    //   default_transition: none/fade/slide/convex/concave/zoom (default: 'slide' — 기존 deck 동작 보존)
    //   default_transition_speed: default/fast/slow
    //   default_background_transition: 동일 화이트리스트 (default: 'fade')
    animation: {
      defaultTransition: 'slide',
      defaultTransitionSpeed: 'default',
      defaultBackgroundTransition: 'fade'
    },
    videoDefault: 'controls',
    // Kroki 다이어그램 렌더링 서버 endpoint.
    //   기본 'https://kroki.io' (외부 공식). 자체 호스팅 시 _config.yml에 kroki_server: http://localhost:8000 등 지정.
    //   빌드 시점에 ${krokiServer}/{lang}/svg/{deflate+base64url}로 GET 요청해 SVG를 받아 slide/kroki/에 캐시함.
    krokiServer: 'https://kroki.io',
    // Issue113: agenda 페이지 헤더 타이틀 — _config.yml `agenda_title:`로 override.
    // AGENDA.md frontmatter `agenda_title:`이 더 우선 (generate-slides.js에서 적용).
    agendaTitle: 'Agenda',
    projectMeta: {},
    projectDownloadsHTML: '',
    configBaseDir: ROOT_DIR,
    styleConfig: {
      markmap_depth: 3,
      chapter_markmap_depth: undefined,
      head_left: 'd1',     // Issue141: outline 옵션 (d{N}|now|none, default 'd1')
      head_right: 'now',   // Issue141: outline 옵션 (default 'now')
      head_breadcum: true, // Issue141: now breadcrumb master toggle (false 시 now → 빈)
      cardColumns: 'auto-fit', // `::: cards` 그리드 열 수. 'auto-fit'(기본) | 정수 1~12. _config.yml card_columns 키로 override
      // Issue64 1.b: 기본값을 lib/css/base.css :root와 동기화
      // _config.yml에서 키 생략 시 본 기본값 → inline <body style> → CSS 변수 → base.css :root와 동일 결과
      style: {
        global: { fontFamily: 'Pretendard, sans-serif', fontImport: [] },
        title: { font_size: '1.5em', font_color: '#000000', align: 'center', outer_padding: '1%', font_family: 'GmarketSansBold', font_weight: '50' },
        main_title: { font_size: '2em', font_color: '#333333', align: 'center', outer_padding: '40px 0 20px 0', font_family: 'GmarketSansBold', font_weight: '400' },
        outline_title: { font_size: '2em', font_color: '#000000', align: 'center', outer_padding: '0', font_family: 'GmarketSansBold', font_weight: '600' },
        outline_title_sub: { font_size: '0.5em', font_color: '#666666', align: 'right', outer_padding: '5px', font_family: 'GmarketSansBold', font_weight: '100' },
        theContents: {
          font_size: '1em', font_color: '#000000', align: 'left', outer_padding: '1%', font_family: 'Nanum Gothic Coding',
          fontSizeMin: '20px', fontSizeMaxRatio: 0.66, font_size_auto: true, media_container_enlarge: 'fit'
        }
      }
    }
  };
}

// 미export — loadConfig 내부 전용
function applyConfig(raw, cfg) {
  const m = raw.match(/^top_align:\s*(.+)$/m);
  if (m) {
    const val = m[1].split('#')[0].trim().toLowerCase();
    cfg.topAlign = (val === 'true' || val === 'yes' || val === '1');
  }
  const g = raw.match(/^guide_line:\s*(.+)$/m);
  if (g) {
    const val = g[1].split('#')[0].trim().toLowerCase();
    cfg.guidLine = (val === 'true' || val === 'yes' || val === '1');
  }
  const r = raw.match(/^slide_ratio:\s*(.+)$/m);
  if (r) {
    // Issue65: 따옴표 제거(YAML "16:9" 대응). 화이트리스트 검증은 loadConfig 후속 단계에서 수행
    cfg.slideRatio = r[1].split('#')[0].trim().replace(/^["']|["']$/g, '').toLowerCase();
  }
  // unitless 0 → 0px 정규화 (calc()에서 length 연산 시 unit type 일치 필수)
  const normalizePadding = (v) => /^0+(\.0+)?$/.test(v) ? '0px' : v;
  const sop = raw.match(/^slide_outer_padding:\s*(.+)$/m);
  if (sop) {
    cfg.slideOuterPadding = normalizePadding(sop[1].split('#')[0].trim());
  }
  const sip = raw.match(/^slide_inner_padding:\s*(.+)$/m);
  if (sip) {
    cfg.slideInnerPadding = normalizePadding(sip[1].split('#')[0].trim());
  }
  // card_columns: `::: cards` 그리드 열 수 (프로젝트 한정 카드 폭 제어).
  //   'auto-fit'/'auto-fill' 또는 정수 1~12. 그 외 값은 무시하고 기본 'auto-fit' 유지.
  const cc = raw.match(/^card_columns:\s*(.+)$/m);
  if (cc) {
    const v = cc[1].split('#')[0].trim().replace(/^["']|["']$/g, '').toLowerCase();
    if (v === 'auto-fit' || v === 'auto-fill') {
      cfg.styleConfig.cardColumns = v;
    } else if (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 12) {
      cfg.styleConfig.cardColumns = v;
    } else {
      console.warn(`⚠️ Invalid card_columns: ${v} — 무시 (허용: auto-fit | auto-fill | 1~12)`);
    }
  }
  const c = raw.match(/^slide_css:\s*(.+)$/m);
  if (c) {
    cfg.slideCssRel = c[1].split('#')[0].trim();
  }
  const hasSlideCss = !!c;
  const t = raw.match(/^theme:\s*(.+)$/m);
  if (t && !cfg.slideCssRel) {
    cfg.themeName = t[1].split('#')[0].trim();
  }
  // Issue210: palette 키 — theme/{themeName}/palettes/{palette}.css 자동 로드
  //   화이트리스트 검증은 html-builder 빌드 단계(파일 존재 여부 + lint-palette)에서 수행
  const pl = raw.match(/^palette:\s*(.+)$/m);
  if (pl) {
    const v = pl[1].split('#')[0].trim().replace(/^["']|["']$/g, '');
    if (/^[a-z][a-z0-9_-]*$/.test(v)) {
      cfg.palette = v;
    } else {
      console.warn(`⚠️ Invalid palette: ${v} — 무시 (허용: ^[a-z][a-z0-9_-]*$)`);
    }
  }
  const tdl = raw.match(/^theme_default_layout:\s*(.+)$/m);
  if (tdl) {
    const v = tdl[1].split('#')[0].trim();
    if (/^_?[a-z][a-z0-9-]*$/.test(v)) {
      cfg.themeDefaultLayout = v;
    } else {
      console.warn(`⚠️ Invalid theme_default_layout: ${v} — 무시 (허용: ^_?[a-z][a-z0-9-]*$)`);
    }
  }
  const op = raw.match(/^use_open_props:\s*(.+)$/m);
  if (op) {
    const val = op[1].split('#')[0].trim().toLowerCase();
    cfg.useOpenProps = (val === 'true' || val === 'yes' || val === '1');
  }
  const md = raw.match(/^markmap_depth:\s*(.+)$/m);
  if (md) {
    cfg.styleConfig.markmap_depth = parseInt(md[1].split('#')[0].trim(), 10);
  }
  const cmd = raw.match(/^chapter_markmap_depth:\s*(.+)$/m);
  if (cmd) {
    cfg.styleConfig.chapter_markmap_depth = parseInt(cmd[1].split('#')[0].trim(), 10);
  }
  // Issue141: head_left/head_right outline 옵션 (d{N}|now|none)
  const HEAD_OPTION_RE = /^(d[1-9][0-9]?|now|none)$/;
  function _parseHeadOption(rawVal, defaultVal) {
    const trimmed = rawVal.split('#')[0].trim().replace(/^["']|["']$/g, '');
    if (HEAD_OPTION_RE.test(trimmed)) return trimmed;
    console.warn(`[config] 잘못된 head 값 "${trimmed}", 기본값 "${defaultVal}" 사용`);
    return defaultVal;
  }
  const hl = raw.match(/^head_left:\s*(.+)$/m);
  if (hl) cfg.styleConfig.head_left = _parseHeadOption(hl[1], 'd1');
  const hr = raw.match(/^head_right:\s*(.+)$/m);
  if (hr) cfg.styleConfig.head_right = _parseHeadOption(hr[1], 'now');
  // Issue141: head_breadcum master toggle (true|false). invalid → default true + warn
  const hbc = raw.match(/^head_breadcum:\s*(.+)$/m);
  if (hbc) {
    const v = hbc[1].split('#')[0].trim().toLowerCase().replace(/^["']|["']$/g, '');
    if (v === 'true' || v === 'yes' || v === '1') cfg.styleConfig.head_breadcum = true;
    else if (v === 'false' || v === 'no' || v === '0') cfg.styleConfig.head_breadcum = false;
    else { console.warn(`[config] 잘못된 head_breadcum 값 "${v}", 기본값 true 사용`); cfg.styleConfig.head_breadcum = true; }
  }
  const tp = raw.match(/^toc_placeholder:\s*(.+)$/m);
  if (tp) {
    const val = tp[1].split('#')[0].trim().toLowerCase();
    cfg.tocPlaceholder = (val === 'true' || val === 'yes' || val === '1');
  }
  // Issue138: cards_placeholder — Cards Page 자동 삽입 옵션 (autoToc cards 슬라이드)
  const cp = raw.match(/^cards_placeholder:\s*(.+)$/m);
  if (cp) {
    const val = cp[1].split('#')[0].trim().toLowerCase();
    cfg.cardsPlaceholder = (val === 'true' || val === 'yes' || val === '1');
  }
  // toc_card_mode: Map Slide(toc-placeholder)를 markmap 대신 H1 카드 그리드로 렌더
  const tcm = raw.match(/^toc_card_mode:\s*(.+)$/m);
  if (tcm) {
    const val = tcm[1].split('#')[0].trim().toLowerCase();
    cfg.tocCardMode = (val === 'true' || val === 'yes' || val === '1');
  }
  // kroki_server: 다이어그램 렌더링 서버 endpoint (기본 https://kroki.io)
  const ks = raw.match(/^kroki_server:\s*(.+)$/m);
  if (ks) {
    const v = ks[1].split('#')[0].trim().replace(/^['"]|['"]$/g, '').replace(/\/+$/, '');
    if (v) cfg.krokiServer = v;
  }
  const ce = raw.match(/^cover_enabled:\s*(.+)$/m);
  if (ce) {
    const val = ce[1].split('#')[0].trim().toLowerCase();
    cfg.coverEnabled = (val === 'true' || val === 'yes' || val === '1');
  }
  // agenda_enabled: agenda.html 생성·back navigation 활성. default true (회귀 0 보증)
  const ae = raw.match(/^agenda_enabled:\s*(.+)$/m);
  if (ae) {
    const val = ae[1].split('#')[0].trim().toLowerCase();
    cfg.agendaEnabled = (val === 'true' || val === 'yes' || val === '1');
  }
  // Issue119: cover 슬라이드 layout 지정. theme_default_layout과 동일 화이트리스트(`^_?[a-z][a-z0-9-]*$`).
  const cl = raw.match(/^cover_layout:\s*(.+)$/m);
  if (cl) {
    const v = cl[1].split('#')[0].trim().replace(/^["']|["']$/g, '');
    if (/^_?[a-z][a-z0-9-]*$/.test(v)) {
      cfg.coverLayout = v;
    } else {
      console.warn(`⚠️ Invalid cover_layout: '${v}' — 무시 (허용: ^_?[a-z][a-z0-9-]*$, 기본 '_cover' 사용)`);
    }
  }
  // Issue126: 글로벌 배경 — _config.yml `background:` 값 자동 판정 (4종)
  // 상세: _doc_design/background.md
  const bg = raw.match(/^background:\s*(.+)$/m);
  if (bg) {
    let val = bg[1].trim();
    // 따옴표로 묶인 값(YAML 표준 — hex의 # 주석 충돌 회피)은 따옴표 안만 추출
    const quoted = val.match(/^"([^"]*)"|^'([^']*)'/);
    if (quoted) {
      val = quoted[1] != null ? quoted[1] : quoted[2];
    } else if (val.charAt(0) !== '#') {
      // hex(#FFFFFF)는 #으로 시작하므로 주석 분리 스킵, 그 외만 # 이후 절단
      val = val.split('#')[0].trim();
    }
    val = val.trim();
    if (val.toLowerCase() === 'none' || val === '') {
      cfg.background = 'none';
      cfg.backgroundType = 'none';
    } else if (/^#[0-9a-fA-F]{3,8}$/.test(val) && [4, 5, 7, 9].includes(val.length)) {
      cfg.background = val;
      cfg.backgroundType = 'color';
    } else if (/\.(png|jpe?g|gif|svg|webp|avif)$/i.test(val)) {
      cfg.background = val;
      cfg.backgroundType = 'image';
      cfg.backgroundFilename = val.split('/').pop();
    } else if (/\.(mp4|webm|ogv|mov)$/i.test(val)) {
      cfg.background = val;
      cfg.backgroundType = 'video';
      cfg.backgroundFilename = val.split('/').pop();
    } else {
      console.warn(`⚠️ Invalid background: '${val}' — 허용: none | #RRGGBB | *.png/jpg/svg/webp/avif | *.mp4/webm/ogv/mov`);
    }
  }
  // Issue112: page_number_mode (global | local)
  const pnm = raw.match(/^page_number_mode:\s*(.+)$/m);
  if (pnm) {
    const val = pnm[1].split('#')[0].trim().toLowerCase().replace(/^["']|["']$/g, '');
    if (val === 'global' || val === 'local') cfg.pageNumberMode = val;
    else console.warn(`⚠️ Invalid page_number_mode: '${val}' — allowed: global | local`);
  }
  // Issue112: breadcrumb (true | false) — 챕터 모드에서 페이지 번호 옆 챕터 번호 표시
  const bc = raw.match(/^breadcrumb:\s*(.+)$/m);
  if (bc) {
    const val = bc[1].split('#')[0].trim().toLowerCase();
    cfg.breadcrumb = (val === 'true' || val === 'yes' || val === '1');
  }
  // Issue115: nav_indicator (both | diamond | page) — 우측 하단 표시 모드
  const ni = raw.match(/^nav_indicator:\s*(.+)$/m);
  if (ni) {
    const val = ni[1].split('#')[0].trim().toLowerCase().replace(/^["']|["']$/g, '');
    if (VALID_NAV_INDICATORS.includes(val)) cfg.navIndicator = val;
    else console.warn(`⚠️ Invalid nav_indicator: '${val}' — allowed: ${VALID_NAV_INDICATORS.join(' | ')}`);
  }
  // Issue113: agenda 페이지 헤더 타이틀 (default 'Agenda', AGENDA.md frontmatter agenda_title이 우선)
  const at = raw.match(/^agenda_title:\s*(.+)$/m);
  if (at) {
    let val = at[1].split('#')[0].trim();
    val = val.replace(/^["']|["']$/g, '');
    if (val) cfg.agendaTitle = val;
  }
  const tcg = raw.match(/^title_contents_gap:\s*(.+)$/m);
  if (tcg) {
    const val = parseFloat(tcg[1].split('#')[0].trim());
    if (!isNaN(val)) cfg.titleContentsGap = val;
  }
  const ald = raw.match(/^auto_layout_detect:\s*(.+)$/m);
  if (ald) {
    const val = ald[1].split('#')[0].trim().toLowerCase();
    cfg.autoLayoutDetect = (val === 'true' || val === 'yes' || val === '1');
  }
  const vd = raw.match(/^video_default:\s*(.+)$/m);
  if (vd) {
    const val = vd[1].split('#')[0].trim();
    if (_VIDEO_PRESET_KEYS.includes(val)) {
      cfg.videoDefault = val;
    } else {
      console.warn(`⚠️ Invalid video_default: '${val}' — falling back to 'controls' (allowed: ${_VIDEO_PRESET_KEYS.join(', ')})`);
    }
  }

  // Issue111: animation 섹션 파싱 — Reveal.initialize 글로벌 transition 옵션
  //   YAML 예시:
  //     animation:
  //       default_transition: slide
  //       default_transition_speed: default
  //       default_background_transition: fade
  //   잘못된 값은 console.warn + default fallback (기존 nav_indicator 패턴과 동일).
  const animMatch = raw.match(/^animation:\s*\n((?:[ \t]+\S[^\n]*\n?)+)/m);
  if (animMatch) {
    const animBody = animMatch[1];
    const dt = animBody.match(/^[ \t]+default_transition:\s*(.+)$/m);
    if (dt) {
      const val = dt[1].split('#')[0].trim().toLowerCase().replace(/^["']|["']$/g, '');
      if (VALID_TRANSITIONS.includes(val)) cfg.animation.defaultTransition = val;
      else console.warn(`⚠️ Invalid animation.default_transition: '${val}' — allowed: ${VALID_TRANSITIONS.join(' | ')}`);
    }
    const dts = animBody.match(/^[ \t]+default_transition_speed:\s*(.+)$/m);
    if (dts) {
      const val = dts[1].split('#')[0].trim().toLowerCase().replace(/^["']|["']$/g, '');
      if (VALID_TRANSITION_SPEEDS.includes(val)) cfg.animation.defaultTransitionSpeed = val;
      else console.warn(`⚠️ Invalid animation.default_transition_speed: '${val}' — allowed: ${VALID_TRANSITION_SPEEDS.join(' | ')}`);
    }
    const dbt = animBody.match(/^[ \t]+default_background_transition:\s*(.+)$/m);
    if (dbt) {
      const val = dbt[1].split('#')[0].trim().toLowerCase().replace(/^["']|["']$/g, '');
      if (VALID_TRANSITIONS.includes(val)) cfg.animation.defaultBackgroundTransition = val;
      else console.warn(`⚠️ Invalid animation.default_background_transition: '${val}' — allowed: ${VALID_TRANSITIONS.join(' | ')}`);
    }
  }

  // model3d 인라인 빌드 설정 (file:// 환경 Chrome fetch 차단 우회)
  //   _config.yml 예시:
  //     model3d:
  //       inline_glb: true        # default true. false 시 fetch 방식 유지 (HTTP 서버 운영)
  //       inline_max_kb: 5000     # 이 크기 초과 GLB 는 인라인 skip + warn
  const m3dMatch = raw.match(/^model3d:\s*\n((?:[ \t]+\S[^\n]*\n?)+)/m);
  if (m3dMatch) {
    const body = m3dMatch[1];
    cfg.model3d = cfg.model3d || {};
    const ig = body.match(/^[ \t]+inline_glb:\s*(.+)$/m);
    if (ig) {
      const v = ig[1].split('#')[0].trim().toLowerCase();
      if (v === 'true' || v === 'false') cfg.model3d.inline_glb = (v === 'true');
      else console.warn(`⚠️ Invalid model3d.inline_glb: '${v}' — allowed: true | false`);
    }
    const im = body.match(/^[ \t]+inline_max_kb:\s*(\d+)\s*$/m);
    if (im) cfg.model3d.inline_max_kb = parseInt(im[1], 10);
  }

  const styleSection = raw.match(/^style:\s*\n([\s\S]*)$/m);
  if (styleSection) {
    const lines = styleSection[1].split('\n');
    let currentSection = null;

    lines.forEach(line => {
      const indent = line.search(/\S/);
      const content = line.trim();
      if (!content) return;

      if (indent === 2 && content.endsWith(':')) {
        currentSection = content.slice(0, -1);
      } else if (indent === 6 && content.startsWith('- ') && currentSection === 'global') {
        let val = content.slice(2).trim();
        if (val && (val.startsWith("'") || val.startsWith('"')) && val.endsWith(val[0])) {
          val = val.slice(1, -1);
        }
        cfg.styleConfig.style.global.fontImport.push(val);
      } else if (indent === 4 && currentSection) {
        let parts = content.split(':');
        let key = parts[0].trim();
        let val = parts.slice(1).join(':').trim();
        if (val) val = val.split(' #')[0].trim();
        if (val && (val.startsWith("'") || val.startsWith('"')) && val.endsWith(val[0])) {
          val = val.slice(1, -1);
        }
        if (key && val) {
          if (currentSection === 'global') {
            if (key === 'font_family') cfg.styleConfig.style.global.fontFamily = val;
          } else if (currentSection === 'title') {
            if (key === 'font_size') cfg.styleConfig.style.title.font_size = val;
            if (key === 'font_color') cfg.styleConfig.style.title.font_color = val;
            if (key === 'align') cfg.styleConfig.style.title.align = val;
            if (key === 'outer_padding') cfg.styleConfig.style.title.outer_padding = val;
            if (key === 'font_family') cfg.styleConfig.style.title.font_family = val;
            if (key === 'font_weight') cfg.styleConfig.style.title.font_weight = val;
          } else if (currentSection === 'main_title') {
            if (key === 'font_size') cfg.styleConfig.style.main_title.font_size = val;
            if (key === 'font_color') cfg.styleConfig.style.main_title.font_color = val;
            if (key === 'align') cfg.styleConfig.style.main_title.align = val;
            if (key === 'outer_padding') cfg.styleConfig.style.main_title.outer_padding = val;
            if (key === 'font_family') cfg.styleConfig.style.main_title.fontFamily = val;
            if (key === 'font_weight') cfg.styleConfig.style.main_title.font_weight = val;
          } else if (currentSection === 'outline_title') {
            if (key === 'font_size') cfg.styleConfig.style.outline_title.font_size = val;
            if (key === 'font_color') cfg.styleConfig.style.outline_title.font_color = val;
            if (key === 'align') cfg.styleConfig.style.outline_title.align = val;
            if (key === 'outer_padding') cfg.styleConfig.style.outline_title.outer_padding = val;
            if (key === 'font_family') cfg.styleConfig.style.outline_title.font_family = val;
            if (key === 'font_weight') cfg.styleConfig.style.outline_title.font_weight = val;
          } else if (currentSection === 'outline_title_sub') {
            if (key === 'font_size') cfg.styleConfig.style.outline_title_sub.font_size = val;
            if (key === 'font_color') cfg.styleConfig.style.outline_title_sub.font_color = val;
            if (key === 'align') cfg.styleConfig.style.outline_title_sub.align = val;
            if (key === 'outer_padding') cfg.styleConfig.style.outline_title_sub.outer_padding = val;
            if (key === 'font_family') cfg.styleConfig.style.outline_title_sub.font_family = val;
            if (key === 'font_weight') cfg.styleConfig.style.outline_title_sub.font_weight = val;
          } else if (currentSection === 'theContents') {
            if (key === 'font_size') cfg.styleConfig.style.theContents.font_size = val;
            if (key === 'font_color') cfg.styleConfig.style.theContents.font_color = val;
            if (key === 'align') cfg.styleConfig.style.theContents.align = val;
            if (key === 'outer_padding') cfg.styleConfig.style.theContents.outer_padding = val;
            if (key === 'font_family') cfg.styleConfig.style.theContents.fontFamily = val;
            if (key === 'font_size_min') cfg.styleConfig.style.theContents.fontSizeMin = val;
            if (key === 'font_size_max_ratio') cfg.styleConfig.style.theContents.fontSizeMaxRatio = parseFloat(val);
            if (key === 'font_size_auto') {
              const valLower = val.toLowerCase();
              cfg.styleConfig.style.theContents.font_size_auto = (valLower === 'true' || valLower === 'yes' || valLower === '1');
            }
            if (key === 'media_container_enlarge') {
              cfg.styleConfig.style.theContents.media_container_enlarge = val.toLowerCase();
            }
          }
        }
      }
    });
  }
  return hasSlideCss;
}

// 레이어 우선순위: ROOT/_config.org.yml → ROOT/_config.yml → projectDir/_config.yml
// ⚠️ loadLayoutTemplates() 호출 없음 — 진입점에서 loadConfig 후 별도 호출
function loadConfig(projectDir, cfg) {
  try {
    const orgPath = path.join(ROOT_DIR, '_config.org.yml');
    if (fs.existsSync(orgPath)) {
      const hasCss = applyConfig(fs.readFileSync(orgPath, 'utf-8'), cfg);
      if (hasCss) cfg.configBaseDir = ROOT_DIR;
    }

    const overrides = [];
    overrides.push({ p: path.join(ROOT_DIR, '_config.yml'), base: ROOT_DIR });
    if (projectDir) overrides.push({ p: path.join(projectDir, '_config.yml'), base: projectDir });

    for (const c of overrides) {
      if (fs.existsSync(c.p)) {
        const hasCss = applyConfig(fs.readFileSync(c.p, 'utf-8'), cfg);
        if (hasCss) cfg.configBaseDir = c.base;
      }
    }

    const slideCssAbsPath = cfg.slideCssRel
      ? (path.isAbsolute(cfg.slideCssRel) ? cfg.slideCssRel : path.join(cfg.configBaseDir, cfg.slideCssRel))
      : null;
    const slideCssExists = slideCssAbsPath && fs.existsSync(slideCssAbsPath);
    if (!cfg.slideCssRel || !slideCssExists) {
      const themeName = cfg.themeName || 'default';
      const themeCss = path.join(ROOT_DIR, 'theme', themeName, 'slide.css');
      if (fs.existsSync(themeCss)) {
        cfg.slideCssRel = themeCss;
        cfg.configBaseDir = ROOT_DIR;
        console.log(`✅ Theme applied: ${themeName} (${themeCss})`);
      } else if (themeName !== 'default') {
        const defaultCss = path.join(ROOT_DIR, 'theme', 'default', 'slide.css');
        if (fs.existsSync(defaultCss)) {
          cfg.slideCssRel = defaultCss;
          cfg.configBaseDir = ROOT_DIR;
          console.warn(`⚠️ theme/${themeName}/slide.css not found, fallback to default`);
        }
      }
    }
  } catch (_) { }

  // Issue65: slide_ratio 화이트리스트 검증 (try-catch 외부 — 잡히지 않고 즉시 빌드 실패 유도)
  if (!VALID_SLIDE_RATIOS.includes(cfg.slideRatio)) {
    throw new Error(`Invalid slide_ratio '${cfg.slideRatio}'. Allowed: ${VALID_SLIDE_RATIOS.join(' | ')}`);
  }
}

// Issue79: 메타데이터를 슬라이드 소스 frontmatter에서 추출 (_meta.yml 폐기)
//   Chapter mode: <inputDir>/AGENDA.md frontmatter
//   Single mode:  선택된 슬라이드 소스(.md) frontmatter — projectDir 또는 inputDir 우선순위 탐색
function loadProjectMeta(projectDir, inputDir, cfg) {
  if (!projectDir) return;
  // 호환: inputDir 미지정 시 markdown/ 자동 감지
  if (typeof inputDir === 'object' && inputDir !== null && cfg === undefined) {
    cfg = inputDir;
    inputDir = null;
  }
  if (!inputDir) {
    const markdownDir = path.join(projectDir, 'markdown');
    inputDir = fs.existsSync(markdownDir) ? markdownDir : projectDir;
  }

  const sourcePath = resolveMetaSourcePath(projectDir, inputDir);
  if (!sourcePath) return;

  try {
    const raw = fs.readFileSync(sourcePath, 'utf-8');
    const fmMatch = raw.match(/^---\s*\n([\s\S]*?)\n---\s*$/m);
    if (!fmMatch) {
      cfg.projectMeta = {};
      return;
    }
    const body = fmMatch[1];

    const meta = {};
    const lines = body.split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim() || line.trim().startsWith('#')) continue;
      const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2].split('#')[0].trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      // 빈 값·빈 배열·빈 객체는 메타 키로 취급하지 않음
      if (val === '' || val === '[]' || val === '{}') continue;
      meta[key] = val;
    }
    cfg.projectMeta = meta;
    const keys = Object.keys(meta);
    console.log(`✅ Project meta loaded from frontmatter: ${path.relative(projectDir, sourcePath)} (${keys.length} fields: ${keys.slice(0, 4).join(', ')}${keys.length > 4 ? '...' : ''})`);
  } catch (e) {
    console.warn(`⚠️ Project meta parse failed: ${sourcePath} — ${e.message}`);
    cfg.projectMeta = {};
  }
}

// Issue79: 메타 출처 .md 파일 결정. generate-slides.js의 mode 감지·우선순위 로직과 일치
function resolveMetaSourcePath(projectDir, inputDir) {
  const agendaPath = path.join(inputDir, 'AGENDA.md');
  if (fs.existsSync(agendaPath)) return agendaPath;

  if (!fs.existsSync(inputDir)) return null;
  const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.md'));
  if (files.length === 0) return null;
  const projectName = path.basename(projectDir);
  const projectFile = files.find(f => f.toLowerCase() === (projectName + '.md').toLowerCase());
  if (projectFile) return path.join(inputDir, projectFile);
  const readmeFile = files.find(f => f.toLowerCase() === 'readme.md');
  if (readmeFile) return path.join(inputDir, readmeFile);
  if (files.length === 1) return path.join(inputDir, files[0]);
  const normalFiles = files.filter(f => /^[a-zA-Z0-9가-힣]/.test(f));
  if (normalFiles.length === 1) return path.join(inputDir, normalFiles[0]);
  return null;
}

// Issue55: slide/{ProjectName}.{epub,pdf,pptx} 존재 여부 검사
function detectDownloadAssets(projectDir) {
  if (!projectDir) return { epub: null, pdf: null, pptx: null };
  const projectName = path.basename(projectDir);
  const slideDir = path.join(projectDir, 'slide');
  const result = { epub: null, pdf: null, pptx: null };
  for (const ext of ['epub', 'pdf', 'pptx']) {
    const fileName = `${projectName}.${ext}`;
    if (fs.existsSync(path.join(slideDir, fileName))) {
      result[ext] = fileName;
    }
  }
  return result;
}

function buildDownloadButtonsHTML(projectDir) {
  const a = detectDownloadAssets(projectDir);
  const parts = [];
  if (a.epub) parts.push(`<a href="${a.epub}" download class="toc-download-btn toc-download-epub">📚 EPUB</a>`);
  if (a.pdf)  parts.push(`<a href="${a.pdf}" download class="toc-download-btn toc-download-pdf">📄 PDF</a>`);
  if (a.pptx) parts.push(`<a href="${a.pptx}" download class="toc-download-btn toc-download-pptx">📊 PPTX</a>`);
  return parts.join('');
}

// Issue63/Issue65: slide_ratio 문자열을 CSS aspect-ratio 호환 수치로 변환
//   '16:9' → '1.7778', '3:2' → '1.5', 'fill' → 'auto' (비율 무제약 명시)
//   호출 전 applyConfig 단계에서 화이트리스트 검증을 통과하므로 잘못된 값은 도달 불가
function slideRatioNumeric(slideRatio) {
  if (slideRatio === 'fill') return 'auto';
  const m = typeof slideRatio === 'string' && slideRatio.match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/);
  if (!m) return '1.7778'; // 미설정 시 16:9 기본 (createDefaultConfig에서 이미 '16:9'로 초기화되므로 도달 드뭄)
  const a = parseFloat(m[1]);
  const b = parseFloat(m[2]);
  return (a / b).toFixed(4).replace(/\.?0+$/, '');
}

module.exports = { createDefaultConfig, applyConfig, loadConfig, loadProjectMeta, detectDownloadAssets, buildDownloadButtonsHTML, slideRatioNumeric };
