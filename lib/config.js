'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// Step5 이전 임시: VIDEO_DEFAULT_PRESETS 키 목록 (markdown.js 추출 후 require로 교체)
const _VIDEO_PRESET_KEYS = ['controls', 'autoplay-muted', 'autoplay-loop', 'loop', 'muted', 'background', 'minimal', 'autoplay-nocontrols'];

function createDefaultConfig() {
  return {
    topAlign: false,
    guidLine: false,
    slideRatio: 'none',
    titleContentsGap: 30,
    useOpenProps: false,
    slideCssRel: null,
    themeName: null,
    themeDefaultLayout: null,
    layoutTemplates: {},
    tocPlaceholder: false,
    coverEnabled: false,
    autoLayoutDetect: true,
    videoDefault: 'controls',
    projectMeta: {},
    projectDownloadsHTML: '',
    configBaseDir: ROOT_DIR,
    styleConfig: {
      markmap_depth: 3,
      chapter_markmap_depth: undefined,
      style: {
        global: { fontFamily: 'Pretendard, sans-serif', fontImport: [] },
        title: { font_size: '1em', font_color: '#000000', align: 'center', outer_padding: '1%', font_family: '', font_weight: '700' },
        main_title: { font_size: '80px', font_color: '#333333', align: 'center', outer_padding: '40px 0 20px 0', font_family: '', font_weight: '700' },
        outline_title: { font_size: '2.5em', font_color: '#000000', align: 'center', outer_padding: '0', font_family: '', font_weight: '700' },
        outline_title_sub: { font_size: '1em', font_color: '#666666', align: 'right', outer_padding: '5px', font_family: '', font_weight: '500' },
        theContents: {
          font_size: '1em', font_color: '#000000', align: 'left', outer_padding: '5px', font_family: '',
          fontSizeMin: '20px', fontSizeMaxRatio: 0.66, font_size_auto: true, media_container_enlarge: 'original'
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
    cfg.slideRatio = r[1].split('#')[0].trim().toLowerCase();
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
}

// Issue48: _meta.yml → cfg.projectMeta
function loadProjectMeta(projectDir, cfg) {
  if (!projectDir) return;
  const metaPath = path.join(projectDir, '_meta.yml');
  if (!fs.existsSync(metaPath)) return;

  try {
    const raw = fs.readFileSync(metaPath, 'utf-8');
    const fmMatch = raw.match(/^---\s*\n([\s\S]*?)\n---\s*$/m);
    const body = fmMatch ? fmMatch[1] : raw;

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
      meta[key] = val;
    }
    cfg.projectMeta = meta;
    const keys = Object.keys(meta);
    console.log(`✅ _meta.yml loaded: ${metaPath} (${keys.length} fields: ${keys.slice(0, 4).join(', ')}${keys.length > 4 ? '...' : ''})`);
  } catch (e) {
    console.warn(`⚠️ _meta.yml parse failed: ${metaPath} — ${e.message}`);
    cfg.projectMeta = {};
  }
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

module.exports = { createDefaultConfig, loadConfig, loadProjectMeta, detectDownloadAssets, buildDownloadButtonsHTML };
