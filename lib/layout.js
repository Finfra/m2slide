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
  let html = tpl.replace(/\{\{\s*(_?[a-zA-Z][a-zA-Z0-9_-]*)\s*\}\}/g, (_, key) => {
    return vars[key] != null ? vars[key] : '';
  });
  return _stripEmptyWrappers(html);
}

// Issue67: 변수 치환 후 빈 wrapper(`<span></span>`, `<div></div>`)와
// 빈 src의 `<img src="">`를 제거. cover layout 같이 옵셔널 메타 필드를 가진
// 템플릿에서 미정의 값으로 인한 빈 박스 흔적 방지.
// 자식이 비워진 부모 wrapper도 같이 사라지도록 do-while 반복.
function _stripEmptyWrappers(html) {
  // 빈 src를 가진 void 요소 제거 (img/source/track 등 src 속성을 갖는 대표격)
  html = html.replace(/<img\b[^>]*\bsrc=""[^>]*>/g, '');

  // span/div 빈 래퍼 반복 제거 (whitespace only inside)
  let prev;
  do {
    prev = html;
    html = html.replace(/<(span|div)\b[^>]*>\s*<\/\1>/g, '');
  } while (html !== prev);

  return html;
}

module.exports = { loadLayoutTemplates, renderLayout };
