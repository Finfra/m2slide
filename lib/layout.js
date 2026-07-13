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

// Issue154: layout HTML 파일의 <!-- @meta ... --> frontmatter는 빌드 산출물에 노출 안 함.
// 메타는 layout-selector agent·lint 도구가 디스크에서 직접 파싱하므로 렌더링 시 제거.
const META_BLOCK_RE = /<!--\s*@meta\s*\n[\s\S]*?\n\s*-->\s*\n?/;

function _stripMetaBlock(content) {
  return content.replace(META_BLOCK_RE, '');
}

function loadLayoutTemplates(themeName, cfg) {
  // cfg.layoutTemplates와 동일 객체 공유
  _templates = cfg.layoutTemplates;

  const dir = path.join(ROOT_DIR, 'theme', themeName, 'layouts');
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(f => {
      if (f.endsWith('.html')) {
        const name = f.replace(/\.html$/, '');
        const content = _stripMetaBlock(fs.readFileSync(path.join(dir, f), 'utf8'));
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
          const content = _stripMetaBlock(fs.readFileSync(path.join(defaultDir, f), 'utf8'));
          _registerLayoutTemplate(name, content);
        }
      });
    }
  }
}

// Issue82: layout 미발견 경고 dedup은 lib/html-builder.js의 _warnedMissingLayouts 담당.
// 이전 위치(여기 lib/layout.js)에 남아있던 동명 Set은 미사용 dead code였으므로 제거.

// tplOverride: 호출자가 template을 사전 수정한 경우 전달. 없으면 _templates[layoutName] 사용.
function renderLayout(layoutName, vars, tplOverride) {
  const tpl = tplOverride != null ? tplOverride : _templates[layoutName];
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
  // 예외: class에 "contents-head"를 포함하는 div(contents-head-bar / -left / -right)는
  // 비어도 보존. 테마(default_lec)가 present-but-empty head-bar를 전제로
  //   (1) 빈 head-bar collapse(slide.css :empty / :has(children empty) → display:none)
  //   (2) 단일모드 등 head-bar 무내용 시 상단 §2 브러시(제목 위 노란 바) 복원
  // 을 처리하므로, 여기서 head-bar를 통째로 제거하면 그 CSS fallback이 :has() 매칭 대상
  // 자체를 잃어 무력화된다(제목 위 노란 바 소멸 회귀). html-builder.js의 "contents-head-bar는
  // 보존된다" 주석이 전제하는 불변식을 이 negative lookahead가 강제한다.
  let prev;
  do {
    prev = html;
    html = html.replace(/<(span|div)\b(?![^>]*contents-head)[^>]*>\s*<\/\1>/g, '');
  } while (html !== prev);

  return html;
}

module.exports = { loadLayoutTemplates, renderLayout };
