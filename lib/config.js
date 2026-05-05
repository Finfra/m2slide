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
    themeDefaultLayout: null,
    layoutTemplates: {},
    tocPlaceholder: false,
    coverEnabled: false,
    autoLayoutDetect: true,
    // Issue112: 챕터 모드 페이지 번호 — 'global'(전역 누적, breadcrumb 표시) / 'local'(챕터별 c/t)
    pageNumberMode: 'global',
    breadcrumb: true,
    // Issue115: 우측 하단 네비게이션 표시 모드 — 'both'(마름모 + 페이지번호) / 'diamond'(마름모만) / 'page'(페이지번호만)
    navIndicator: 'both',
    videoDefault: 'controls',
    // Issue113: agenda 페이지 헤더 타이틀 — _config.yml `agenda_title:`로 override.
    // AGENDA.md frontmatter `agenda_title:`이 더 우선 (generate-slides.js에서 적용).
    agendaTitle: 'Agenda',
    projectMeta: {},
    projectDownloadsHTML: '',
    configBaseDir: ROOT_DIR,
    styleConfig: {
      markmap_depth: 3,
      chapter_markmap_depth: undefined,
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
  const c = raw.match(/^slide_css:\s*(.+)$/m);
  if (c) {
    cfg.slideCssRel = c[1].split('#')[0].trim();
  }
  const hasSlideCss = !!c;
  const t = raw.match(/^theme:\s*(.+)$/m);
  if (t && !cfg.slideCssRel) {
    cfg.themeName = t[1].split('#')[0].trim();
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
  const tp = raw.match(/^toc_placeholder:\s*(.+)$/m);
  if (tp) {
    const val = tp[1].split('#')[0].trim().toLowerCase();
    cfg.tocPlaceholder = (val === 'true' || val === 'yes' || val === '1');
  }
  const ce = raw.match(/^cover_enabled:\s*(.+)$/m);
  if (ce) {
    const val = ce[1].split('#')[0].trim().toLowerCase();
    cfg.coverEnabled = (val === 'true' || val === 'yes' || val === '1');
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

module.exports = { createDefaultConfig, loadConfig, loadProjectMeta, detectDownloadAssets, buildDownloadButtonsHTML, slideRatioNumeric };
