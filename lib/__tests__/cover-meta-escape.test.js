'use strict';

// Issue419: 표지(_cover) 슬롯에 들어가는 frontmatter 값의 HTML 이스케이프 회귀 테스트
// 실행: node --test lib/__tests__/cover-meta-escape.test.js
//
// 배경: title/subtitle/instructor_name 등 frontmatter 값이 layout 변수({{title}} 등)로 치환될 때
//   escape 없이 그대로 들어가 `<b>`·`&` 가 태그·엔티티로 새어 나왔다.
//   prj41 videoMaker tdd #05 `title-card-frontmatter-fields` 가 이 성질을 재며 red 였다(prj5#Issue101 ①).
// 범위: 표지 슬롯 텍스트의 escape 만. raw HTML 옵트인(토큰 미정·보류)은 별도 결정 — `{raw}` 는 Issue423 이미지 원본 강제가 쓴다.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const GEN = path.join(ROOT, 'lib/generate-slides.js');

const FM = [
  '---',
  'title: 최소 <b>제목</b> & 테스트',
  'subtitle: 부제 <i>기울임</i> & 끝',
  'instructor_name: 강사 <script>alert(1)</script>',
  'type: ppt',
  '---',
].join('\n');

const CONFIG = 'theme: default\ncover_enabled: true\ncards_placeholder: false\n';

// 임시 프로젝트를 만들어 generate-slides.js 로 빌드한다. stdout·stderr 를 함께 돌려준다.
function buildProject(name, files) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'm2slide-cover-esc-'));
  const projDir = path.join(tmp, name);
  for (const [rel, body] of Object.entries(files)) {
    const p = path.join(projDir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, body);
  }
  const r = spawnSync('node', [GEN, projDir], { encoding: 'utf-8' });
  if (r.status !== 0) throw new Error(`build failed rc=${r.status}\n${r.stderr}`);
  return {
    log: `${r.stdout}\n${r.stderr}`,
    read: (rel) => fs.readFileSync(path.join(projDir, 'slide', rel), 'utf-8'),
    cleanup: () => fs.rmSync(tmp, { recursive: true, force: true }),
  };
}

function assertCoverEscaped(html, label) {
  assert.ok(
    html.includes('class="cover-title">최소 &lt;b&gt;제목&lt;/b&gt; &amp; 테스트<'),
    `${label}: title 이 이스케이프되지 않음`
  );
  assert.ok(!html.includes('cover-title">최소 <b>'), `${label}: title 의 <b> 가 태그로 새어 나옴`);
  assert.ok(
    html.includes('class="cover-subtitle">부제 &lt;i&gt;기울임&lt;/i&gt; &amp; 끝<'),
    `${label}: subtitle 이 이스케이프되지 않음`
  );
  assert.ok(
    html.includes('class="cover-instructor-name">강사 &lt;script&gt;alert(1)&lt;/script&gt;<'),
    `${label}: instructor_name 이 이스케이프되지 않음`
  );
  assert.ok(!html.includes('<script>alert(1)</script>'), `${label}: instructor_name 의 <script> 가 태그로 새어 나옴`);
}

test('cover escape: single mode — frontmatter title/subtitle/instructor_name 이 _cover 슬롯에 이스케이프되어 들어간다', () => {
  const b = buildProject('CoverEsc', {
    '_config.yml': CONFIG,
    'CoverEsc.md': `${FM}\n\n## 첫 슬라이드\n\n* 내용\n`,
  });
  try {
    const html = b.read('index.html');
    assert.ok(html.includes('class="layout-_cover"'), 'single: 표지 section 미주입 (cover_enabled 전제 깨짐)');
    assertCoverEscaped(html, 'single');
  } finally {
    b.cleanup();
  }
});

test('cover escape: chapter mode — AGENDA.md frontmatter 값이 표지 index.html 에 이스케이프되어 들어간다', () => {
  const b = buildProject('CoverEscCh', {
    '_config.yml': CONFIG,
    'markdown/AGENDA.md': `${FM}\n\n# [1. 첫 장](./01-first.md)\n`,
    'markdown/01-first.md': '## 첫 슬라이드\n\n* 내용\n',
  });
  try {
    const html = b.read('index.html');
    assert.ok(html.includes('class="layout-_cover"'), 'chapter: 표지 section 미생성 (cover_enabled 전제 깨짐)');
    assertCoverEscaped(html, 'chapter');
  } finally {
    b.cleanup();
  }
});

test('cover escape: HTML 태그가 든 frontmatter 값은 빌드 로그에 경고 1줄을 남긴다 (조용히 글자로 바꾸지 않는다)', () => {
  const b = buildProject('CoverEscWarn', {
    '_config.yml': CONFIG,
    'CoverEscWarn.md': `${FM}\n\n## 첫 슬라이드\n\n* 내용\n`,
  });
  try {
    assert.match(b.log, /frontmatter.*HTML.*(이스케이프|escape)/i, '경고 없음 — 의도적 HTML 을 쓴 덱이 조용히 깨진다');
  } finally {
    b.cleanup();
  }
});
