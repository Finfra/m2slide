// 챕터 진입 장(`#layout-chapter`)의 제목은 H1 이다 (Issue418 P2)
//
//   `# 01. 제목` + `#layout-chapter` + `::: part` + `## 부제` 에서 H1 이 사라지고 H2 가
//   `{{title}}` 을 차지했다 — m2slide_info 01장·prj7 visual-gen-gate 덱에서 재현.
//   chapter layout 의 슬롯 정의는 `{{title}}` = 챕터 제목이고(4.2.chapter.html example 이
//   `# 제목` 을 쓴다) H2 는 부제라 `{{content}}` 로 가야 한다.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { parseMarkdownFile } = require('../slide-parser');

function parse(md) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'm2-chtitle-'));
  const f = path.join(dir, 'deck.md');
  fs.writeFileSync(f, md);
  return parseMarkdownFile(f, true, false, false);
}

const DECK = [
  '# 01. m2slide란?',
  '',
  '#layout-chapter',
  '',
  '::: part',
  'Chapter 1.',
  ':::',
  '',
  '## 정체성 한 줄 정의',
  '',
  '자산이 늘면 판단이 반복된다',
  '',
  '---',
  '',
  '## 1.1. 본문',
  '',
  '* 항목',
].join('\n');

test('chapter layout: H1 이 제목이고 H2 부제는 본문에 남는다', () => {
  const s = parse(DECK)[0];
  assert.strictEqual(s.layout, 'chapter');
  assert.strictEqual(s.title, '01. m2slide란?');
  assert.match(s.rawMarkdown, /^## 정체성 한 줄 정의$/m);
  assert.match(s.rawMarkdown, /자산이 늘면 판단이 반복된다/);
});

test('chapter layout: H1 만 있으면 H1 이 제목 (기존 동작 유지)', () => {
  const s = parse('# 03. 판정\n\n#layout-chapter\n\n범위 안인가\n\n---\n\n## 3.1. x\n')[0];
  assert.strictEqual(s.title, '03. 판정');
  assert.match(s.rawMarkdown, /범위 안인가/);
});

test('비-chapter layout 은 그대로 — H1(그룹) + H2(장 제목) 이면 H2 가 제목', () => {
  const s = parse('# 그룹\n\n#layout-exercise\n\n## 실습 1\n\n* 단계\n')[0];
  assert.strictEqual(s.title, '실습 1');
  assert.doesNotMatch(s.rawMarkdown, /^# 그룹$/m);
});
