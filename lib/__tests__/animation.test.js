'use strict';

// Issue129: animation.default_background_transition 회귀 테스트
// 실행: node --test lib/__tests__/animation.test.js
//
// 검증 범위:
//   1. config 파싱 — animation.default_background_transition 값 (default/explicit/whitelist/invalid)
//   2. 슬라이드별 #background-transition-{name} 디렉티브 파싱 (Issue117)
//   3. 빌드 통합 — Reveal.initialize 옵션에 backgroundTransition 주입 + 슬라이드별 data-background-* 속성
//      + animation.default_background_transition 값이 모든 deck에 적용되는지

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const { createDefaultConfig, applyConfig } = require('../config');
const { extractDirectives } = require('../slide-parser');

// ─────────────────────────────────────────────────────────────
// 1. config 파싱 단위 테스트
// ─────────────────────────────────────────────────────────────

test('config: animation.default_background_transition 디폴트 = fade', () => {
  const def = createDefaultConfig();
  assert.strictEqual(def.animation.defaultBackgroundTransition, 'fade');
});

test('config: animation.default_background_transition 화이트리스트 (none/fade/slide/convex/concave/zoom)', () => {
  for (const v of ['none', 'fade', 'slide', 'convex', 'concave', 'zoom']) {
    const c = createDefaultConfig();
    applyConfig(`animation:\n  default_background_transition: ${v}\n`, c);
    assert.strictEqual(c.animation.defaultBackgroundTransition, v, `value=${v}`);
  }
});

test('config: animation.default_background_transition 잘못된 값 → 디폴트 fade 유지', () => {
  const c = createDefaultConfig();
  // console.warn 출력 억제
  const orig = console.warn;
  console.warn = () => {};
  try {
    applyConfig('animation:\n  default_background_transition: bogus\n', c);
  } finally {
    console.warn = orig;
  }
  assert.strictEqual(c.animation.defaultBackgroundTransition, 'fade');
});

// ─────────────────────────────────────────────────────────────
// 2. 슬라이드 디렉티브 파싱 단위 테스트 (Issue117 #background-transition-*)
// ─────────────────────────────────────────────────────────────

test('directive: #background-transition-zoom 파싱', () => {
  const { directives } = extractDirectives('## 제목\n\n#background-transition-zoom\n\n* 본문\n');
  assert.strictEqual(directives.backgroundTransition, 'zoom');
});

test('directive: #background-transition 화이트리스트 외 값 무시 → null', () => {
  const { directives } = extractDirectives('## 제목\n\n#background-transition-bogus\n\n* 본문\n');
  assert.strictEqual(directives.backgroundTransition, null);
});

test('directive: #background-color-{hex} 파싱 (# prepend)', () => {
  const { directives } = extractDirectives('## 제목\n\n#background-color-ff0000\n\n* 본문\n');
  assert.strictEqual(directives.backgroundColor, '#ff0000');
});

test('directive: #background-color-{name} 파싱 (CSS 컬러명)', () => {
  const { directives } = extractDirectives('## 제목\n\n#background-color-tomato\n\n* 본문\n');
  assert.strictEqual(directives.backgroundColor, 'tomato');
});

// Issue117_1 (md-m2slide-rules에 식별된 후보) — #background-image-{path} / #background-size-{cover|contain|auto}
// path는 `/`·`.` 포함 가능하므로 화이트리스트 대신 \S+ 매칭. size는 reveal.js 표준 키워드만 화이트리스트.
test('directive: #background-image-{path} 파싱 (상대경로)', () => {
  const { directives } = extractDirectives('## 제목\n\n#background-image-./img/bg.png\n\n* 본문\n');
  assert.strictEqual(directives.backgroundImage, './img/bg.png');
});

test('directive: #background-image-{path} 파싱 (절대경로)', () => {
  const { directives } = extractDirectives('## 제목\n\n#background-image-/assets/cover.jpg\n\n* 본문\n');
  assert.strictEqual(directives.backgroundImage, '/assets/cover.jpg');
});

test('directive: #background-image-{url} 파싱 (http URL)', () => {
  const { directives } = extractDirectives('## 제목\n\n#background-image-https://example.com/bg.png\n\n* 본문\n');
  assert.strictEqual(directives.backgroundImage, 'https://example.com/bg.png');
});

test('directive: #background-size-cover 파싱', () => {
  const { directives } = extractDirectives('## 제목\n\n#background-size-cover\n\n* 본문\n');
  assert.strictEqual(directives.backgroundSize, 'cover');
});

test('directive: #background-size-contain 파싱', () => {
  const { directives } = extractDirectives('## 제목\n\n#background-size-contain\n\n* 본문\n');
  assert.strictEqual(directives.backgroundSize, 'contain');
});

test('directive: #background-size-auto 파싱', () => {
  const { directives } = extractDirectives('## 제목\n\n#background-size-auto\n\n* 본문\n');
  assert.strictEqual(directives.backgroundSize, 'auto');
});

test('directive: #background-size 화이트리스트 외 값 무시 → null', () => {
  const { directives } = extractDirectives('## 제목\n\n#background-size-bogus\n\n* 본문\n');
  assert.strictEqual(directives.backgroundSize, null);
});

test('directive: #background-image + #background-size 동시 파싱', () => {
  const { directives } = extractDirectives(
    '## 제목\n\n#background-image-./img/bg.png\n#background-size-cover\n\n* 본문\n'
  );
  assert.strictEqual(directives.backgroundImage, './img/bg.png');
  assert.strictEqual(directives.backgroundSize, 'cover');
});

// ─────────────────────────────────────────────────────────────
// 3. 빌드 통합 테스트 — fixture 빌드 후 HTML 검증
//    (시간 소요 ~3-5초)
// ─────────────────────────────────────────────────────────────

function buildFixture(animYaml, mdBody) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'm2slide-anim-'));
  const projDir = path.join(tmp, 'AnimFixture');
  fs.mkdirSync(projDir, { recursive: true });

  fs.writeFileSync(path.join(projDir, '_config.yml'),
    'theme: default\n' +
    'theme_default_layout: contents\n' +
    'cover_enabled: false\n' +
    'cards_placeholder: false\n' +
    'slide_ratio: "3:2"\n' +
    animYaml);

  fs.writeFileSync(path.join(projDir, 'AnimFixture.md'), mdBody);

  const root = path.resolve(__dirname, '../..');
  execSync(`node "${path.join(root, 'lib/generate-slides.js')}" "${projDir}"`,
    { stdio: 'pipe' });

  // Single Page Mode → slide/index.html 생성
  const htmlPath = path.join(projDir, 'slide', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');
  return { html, tmp, projDir };
}

test('build: animation.default_background_transition: zoom → Reveal.initialize 주입', () => {
  const { html, tmp } = buildFixture(
    'animation:\n  default_background_transition: zoom\n',
    '## 슬라이드 1\n\n* 본문 1\n\n---\n\n## 슬라이드 2\n\n* 본문 2\n'
  );
  try {
    assert.match(html, /backgroundTransition:\s*'zoom'/,
      'Reveal.initialize에 backgroundTransition: \'zoom\' 주입 안됨');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('build: animation.default_background_transition 화이트리스트 5종 → Reveal.initialize 주입', () => {
  // default 케이스(animation 미설정)는 _config.org.yml 레이어 영향으로 글로벌 값이 들어가므로
  // 본 테스트는 명시값에 대해서만 검증
  for (const v of ['fade', 'slide', 'convex', 'concave']) {
    const { html, tmp } = buildFixture(
      `animation:\n  default_background_transition: ${v}\n`,
      '## 슬라이드 1\n\n* 본문\n'
    );
    try {
      assert.match(html, new RegExp(`backgroundTransition:\\s*'${v}'`),
        `value=${v} 미주입`);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }
});

test('build: 슬라이드별 #background-color → data-background-color 속성 + #background-transition → data-background-transition', () => {
  const { html, tmp } = buildFixture(
    'animation:\n  default_background_transition: fade\n',
    '## 슬라이드 1\n\n#background-color-ff0000\n#background-transition-zoom\n\n* 빨강\n\n' +
    '---\n\n' +
    '## 슬라이드 2\n\n#background-color-00ff00\n\n* 초록\n'
  );
  try {
    assert.match(html, /data-background-color="#ff0000"/, '슬라이드 1 background-color (#ff0000) 미주입');
    assert.match(html, /data-background-color="#00ff00"/, '슬라이드 2 background-color (#00ff00) 미주입');
    assert.match(html, /data-background-transition="zoom"/, '슬라이드 1 background-transition 미주입');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('build: animation.default_background_transition: none → cross-page fade-in keyframes 미주입 (Issue120)', () => {
  const { html, tmp } = buildFixture(
    'animation:\n  default_background_transition: none\n',
    '## 슬라이드 1\n\n* 본문\n'
  );
  try {
    assert.match(html, /backgroundTransition:\s*'none'/);
    // Issue120 가드 — defaultBackgroundTransition='none' 시 _crossPageFadeInCss(cfg)는 빈 문자열 반환
    // → m2-page-fade-in @keyframes·body.m2-cross-loaded selector 미주입.
    // (JS 주석 안의 "@keyframes m2-page-fade-in" 텍스트는 매칭에서 제외하기 위해 정의 형태 `{` 포함)
    assert.doesNotMatch(html, /@keyframes\s+m2-page-fade-in\s*\{/,
      'default_background_transition: none 일 때 m2-page-fade-in keyframes 정의 미주입되어야 함');
    assert.doesNotMatch(html, /body\.m2-cross-loaded\s*\{/,
      'default_background_transition: none 일 때 body.m2-cross-loaded selector 미주입되어야 함');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('build: 슬라이드별 #background-image + #background-size → data-background-image + data-background-size 속성 (Issue117_1)', () => {
  const { html, tmp } = buildFixture(
    'animation:\n  default_background_transition: fade\n',
    '## 슬라이드 1\n\n#background-image-./img/bg.png\n#background-size-cover\n\n* 배경 이미지\n\n' +
    '---\n\n' +
    '## 슬라이드 2\n\n#background-image-https://example.com/cover.jpg\n\n* URL 배경\n'
  );
  try {
    assert.match(html, /data-background-image="\.\/img\/bg\.png"/, '슬라이드 1 background-image (상대경로) 미주입');
    assert.match(html, /data-background-size="cover"/, '슬라이드 1 background-size (cover) 미주입');
    assert.match(html, /data-background-image="https:\/\/example\.com\/cover\.jpg"/, '슬라이드 2 background-image (URL) 미주입');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('build: animation.default_background_transition: fade → cross-page fade-in keyframes 주입 (Issue120)', () => {
  const { html, tmp } = buildFixture(
    'animation:\n  default_background_transition: fade\n',
    '## 슬라이드 1\n\n* 본문\n'
  );
  try {
    assert.match(html, /@keyframes\s+m2-page-fade-in\s*\{/,
      'default_background_transition: fade 일 때 m2-page-fade-in keyframes 정의 주입되어야 함');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
