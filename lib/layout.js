'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// loadLayoutTemplates 호출 후 cfg.layoutTemplates와 동일 객체 참조
// → renderLayout 시그니처 변경 없이 하위 호환 유지 (Step7에서 cfg 인자로 정리)
let _templates = {};

// Issue41: underscore prefix 제거 alias 및 번호 prefix alias 함께 등록
function _registerLayoutTemplate(name, content) {
  if (!_templates[name]) {
    _templates[name] = content;
  }
  const stripped = name.replace(/^_/, '');
  if (stripped !== name && !_templates[stripped]) {
    _templates[stripped] = content;
  }
  // Issue49: 번호 prefix(N.M.) alias — `1.1.cover.html` → `cover` 키도 등록
  const numStripped = name.replace(/^[\d.]+\./, '');
  if (numStripped !== name && !_templates[numStripped]) {
    _templates[numStripped] = content;
  }
}

function loadLayoutTemplates(themeName, cfg) {
  // cfg.layoutTemplates와 동일 객체 공유
  _templates = cfg.layoutTemplates;

  const dir = path.join(ROOT_DIR, 'theme', themeName, 'layouts');
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(f => {
      if (f.endsWith('.html')) {
        const name = f.replace(/\.html$/, '');
        const content = fs.readFileSync(path.join(dir, f), 'utf8');
        _registerLayoutTemplate(name, content);
      }
    });
  }

  if (themeName !== 'default') {
    const defaultDir = path.join(ROOT_DIR, 'theme', 'default', 'layouts');
    if (fs.existsSync(defaultDir)) {
      fs.readdirSync(defaultDir).forEach(f => {
        if (f.endsWith('.html')) {
          const name = f.replace(/\.html$/, '');
          const content = fs.readFileSync(path.join(defaultDir, f), 'utf8');
          _registerLayoutTemplate(name, content);
        }
      });
    }
  }
}

// Issue41: layout 미발견 경고 dedup
const _WARNED_MISSING_LAYOUTS = new Set();

function renderLayout(layoutName, vars) {
  const tpl = _templates[layoutName];
  if (!tpl) return null;
  return tpl.replace(/\{\{\s*(_?[a-zA-Z][a-zA-Z0-9_-]*)\s*\}\}/g, (_, key) => {
    return vars[key] != null ? vars[key] : '';
  });
}

module.exports = { loadLayoutTemplates, renderLayout };
