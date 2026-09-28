#!/usr/bin/env node
// sync-projects-md.js (Issue253 / Issue254)
// Projects.md 활성/비활성 표를 Projects/<Name>/VERSION 파일 기준으로 자동 동기화하고,
// Projects.md 의 publishing 열을 SSOT 로 삼아 Projects/.gitignore 추적 허용목록을 자동 생성.
//
// 동작:
//   - 활성 표: Projects/ 하위 실제 폴더(단, _*·z* 제외)를 행으로. 버전 열 = VERSION 파일 값.
//     설명·Manual Check·publishing·작업 열은 기존 행을 보존(사람 작성 열 머지). 신규 폴더는 행 추가.
//   - 제거(표에 있으나 폴더 없음): `# 비활성 프로젝트 (z_done)` 표로 행 이동(버전·설명 등 마지막 값 보존).
//   - publishing 열 = git 추적 드라이버 (Issue254): 값이 있으면 Projects/.gitignore 에 `!/<Name>/` 로 추적,
//     값이 없으면 ignore. Projects.md 자체는 gitignored 로컬 파일이므로, publishing 값이 비어 있고 폴더가
//     현재 Projects/.gitignore 에 이미 허용돼 있으면 publishing='x' 로 시드(fresh clone·회귀 방지).
//   - idempotent: 재실행 시 안정. (Projects.md + Projects/.gitignore 양쪽)
//
//   - 경로 열 = 외부 마운트의 유일한 기록 (Issue416): 비면 로컬(Projects/<Name> 실디렉토리), 채우면 외부.
//     경로 있는 활성 행은 Projects/<Name> 심링크를 표대로 생성·재지정한다(실디렉토리는 절대 건드리지 않음).
//     표에 경로가 없는 기존 심링크는 그 target 을 경로로 시드해 흡수한다(마이그레이션·수동 ln 대비).
//     경로가 없으면(볼륨 미마운트 등) 경고만 하고 행을 활성에 남긴다 — 사라지면 메타가 비활성으로 밀려난다.
//
// Usage: node lib/sync-projects-md.js [--check]
//        node lib/sync-projects-md.js --link <외부경로> <토큰>   # 행 추가(경로 기록) + sync
//        node lib/sync-projects-md.js --unlink <토큰>            # 심링크 제거 + 행 비활성 + sync
//   --check: 변경 필요 여부만 판정(파일 미수정). 변경 필요 시 exit 1.
//   env M2SLIDE_ROOT: 루트 주입(테스트용). 미지정 시 이 스크립트의 상위 폴더.

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.env.M2SLIDE_ROOT ? path.resolve(process.env.M2SLIDE_ROOT) : path.resolve(__dirname, '..');
const PROJECTS_MD = path.join(ROOT, 'Projects.md');
const PROJECTS_ORG_MD = path.join(ROOT, 'Projects_org.md');
const PROJECTS_DIR = path.join(ROOT, 'Projects');
const PROJECTS_GITIGNORE = path.join(PROJECTS_DIR, '.gitignore');

// Projects/.gitignore 에서 폴더가 아닌 특수 파일 추적 허용(고정 프리앰블).
const GITIGNORE_FILE_ALLOWS = ['.gitignore', 'README.md', 'slide.css.md'];

const ACTIVE_HEADER = '# 활성 프로젝트';
const INACTIVE_HEADER = '# 비활성 프로젝트 (z_done)';
// 열 순서 (Issue254 · Issue416 경로 열 추가): 분류 · 프로젝트 · 경로 · 버전 · 설명 · Manual Check · publishing · 작업
const COLS = ['분류', '프로젝트', '경로', '버전', '설명', 'Manual Check', 'publishing', '작업'];
// 표 헤더 이름 → 메타 키. 열은 위치가 아니라 이름으로 읽는다(열 추가에 안전).
const COL_KEY = { '분류': 'category', '프로젝트': 'name', '경로': 'path', '버전': 'version', '설명': 'desc',
  'Manual Check': 'manual', 'publishing': 'publishing', '작업': 'work' };

// publishing 열 = git 추적 드라이버 (Issue254). affirmative(o/y/yes/✓ 등)만 추적,
// 'x'·'n'·빈값은 제외. (사용자가 o/x 를 yes/no 마커로 사용)
const AFFIRM_RE = /^(o|y|yes|true|1|✓|v|ok)$/i;
const isTracked = (v) => AFFIRM_RE.test((v || '').trim());

// --- helpers ---------------------------------------------------------------

function isProjectDir(name) {
  // _ppt, z_done, z_just_test 등 메타·아카이브 폴더 제외. 심링크는 target 이 폴더면 포함(statSync 가 따라감).
  if (name.startsWith('_') || name.startsWith('z') || name.startsWith('.')) return false;
  return fs.statSync(path.join(PROJECTS_DIR, name)).isDirectory();
}

const expandHome = (p) => (p.startsWith('~') ? path.join(require('os').homedir(), p.slice(1)) : p);
const realOrNull = (p) => { try { return fs.realpathSync(p); } catch { return null; } };
const lstatOrNull = (p) => { try { return fs.lstatSync(p); } catch { return null; } };

// Projects/ 하위 심링크 → target (readlink 실패는 무시). 경로 시드용.
function scanSymlinks() {
  const out = new Map();
  for (const n of fs.readdirSync(PROJECTS_DIR)) {
    const full = path.join(PROJECTS_DIR, n);
    const st = lstatOrNull(full);
    if (!st || !st.isSymbolicLink()) continue;
    out.set(n, realOrNull(full) || path.resolve(PROJECTS_DIR, fs.readlinkSync(full)));
  }
  return out;
}

function scanActiveFolders() {
  return fs.readdirSync(PROJECTS_DIR)
    .filter((n) => {
      try { return isProjectDir(n); } catch { return false; }
    })
    .sort((a, b) => a.localeCompare(b));
}

function readVersion(name) {
  const vf = path.join(PROJECTS_DIR, name, 'VERSION');
  if (fs.existsSync(vf)) {
    const v = fs.readFileSync(vf, 'utf-8').trim();
    if (v) return v;
  }
  return '';
}

// 표 셀 텍스트에서 프로젝트 이름 추출(백틱·링크 제거)
function cellToName(cell) {
  let s = cell.trim();
  const link = s.match(/\[([^\]]+)\]\([^)]*\)/);
  if (link) s = link[1];
  return s.replace(/`/g, '').trim();
}

function splitRow(line) {
  // 선행/후행 파이프 제거 후 셀 분리
  return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
}

function isSeparatorRow(line) {
  return /^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.includes('-');
}

// 섹션 헤더 다음의 첫 번째 markdown 표를 파싱. { rows: [{name, cells}], range:[start,end] } | null
function parseTableAfter(lines, header) {
  const hIdx = lines.findIndex((l) => l.trim() === header);
  if (hIdx === -1) return null;
  let i = hIdx + 1;
  while (i < lines.length && lines[i].trim() === '') i++;
  if (i >= lines.length || !lines[i].trim().startsWith('|')) return { rows: [], range: [hIdx, hIdx], headerIdx: hIdx };
  const start = i;
  const colNames = splitRow(lines[i]);
  i++; // header row
  if (i < lines.length && isSeparatorRow(lines[i])) i++; // separator
  const rows = [];
  while (i < lines.length && lines[i].trim().startsWith('|')) {
    const cells = splitRow(lines[i]);
    const meta = rowToMeta(cells, colNames);
    rows.push({ name: meta.name, cells, meta });
    i++;
  }
  return { rows, range: [start, i], headerIdx: hIdx };
}

// 기존 행 셀 → 정규화 메타. 헤더 이름으로 매핑하고(Issue416), 이름을 못 읽는 레거시 표만 위치로 판정.
// 버전은 항상 VERSION 파일 우선이므로 참고값.
function rowToMeta(cells, header) {
  const g = (i) => (cells[i] || '').trim();
  if (header && header.includes('프로젝트')) {
    const m = { category: '', name: '', path: '', version: '', desc: '', manual: '', publishing: '', work: '' };
    header.forEach((h, k) => { if (COL_KEY[h]) m[COL_KEY[h]] = g(k); });
    m.name = cellToName(m.name);
    return m;
  }
  if (cells.length >= 7) {
    return { category: g(0), name: cellToName(cells[1] || ''), path: '', version: g(2), desc: g(3), manual: g(4), publishing: g(5), work: g(6) };
  }
  // 레거시 6열: 분류 없음
  return { category: '', name: cellToName(cells[0] || ''), path: '', version: g(1), desc: g(2), manual: g(3), publishing: g(4), work: g(5) };
}

// 표시 폭(East Asian wide = 2). Hangul·CJK·전각 문자를 2칸으로 계산해
// 모노스페이스 정렬을 기존 손패딩 스타일과 일치시킴.
function dispWidth(s) {
  let w = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    const wide =
      (cp >= 0x1100 && cp <= 0x115f) ||   // Hangul Jamo
      (cp >= 0x2e80 && cp <= 0xa4cf) ||   // CJK 계열
      (cp >= 0xac00 && cp <= 0xd7a3) ||   // Hangul Syllables
      (cp >= 0xf900 && cp <= 0xfaff) ||   // CJK Compatibility Ideographs
      (cp >= 0xfe30 && cp <= 0xfe4f) ||   // CJK Compatibility Forms
      (cp >= 0xff00 && cp <= 0xff60) ||   // Fullwidth Forms
      (cp >= 0xffe0 && cp <= 0xffe6);
    w += wide ? 2 : 1;
  }
  return w;
}

function renderTable(rows) {
  // rows: COLS 순서 배열 (헤더 제외한 데이터)
  const all = [COLS, ...rows];
  const widths = COLS.map((_, c) => Math.max(...all.map((r) => dispWidth(r[c] || ''))));
  const pad = (s, w) => s + ' '.repeat(Math.max(0, w - dispWidth(s)));
  const line = (r) => '| ' + COLS.map((_, c) => pad(r[c] || '', widths[c])).join(' | ') + ' |';
  const sep = '| ' + widths.map((w) => ':' + '-'.repeat(Math.max(3, w) - 1)).join(' | ') + ' |';
  return [line(COLS), sep, ...rows.map(line)].join('\n');
}

// Projects_org.md (공개용, publishing=o 만) 전용 열: 분류·프로젝트·버전·설명만.
// Manual Check·publishing·작업은 내부 운영 메모라 공개 문서에서 제외.
const ORG_COLS = ['분류', '프로젝트', '버전', '설명'];

function renderOrgTable(rows) {
  const all = [ORG_COLS, ...rows];
  const widths = ORG_COLS.map((_, c) => Math.max(...all.map((r) => dispWidth(r[c] || ''))));
  const pad = (s, w) => s + ' '.repeat(Math.max(0, w - dispWidth(s)));
  const line = (r) => '| ' + ORG_COLS.map((_, c) => pad(r[c] || '', widths[c])).join(' | ') + ' |';
  const sep = '| ' + widths.map((w) => ':' + '-'.repeat(Math.max(3, w) - 1)).join(' | ') + ' |';
  return [line(ORG_COLS), sep, ...rows.map(line)].join('\n');
}

// Issue424 — 원고를 m2slide-deck(Projects_deck) 으로 옮긴 덱. 경로 열이 Projects_deck/ 안을 가리키는 행.
// 이 repo 에 원고가 없으니 공개 표·추적목록에서는 빠지지만, 공개 문서에서 흔적 없이 사라지면 안 된다.
const DECK_ROOT = path.join(ROOT, 'Projects_deck');
const MOVED_HEADER = '# m2slide-deck 으로 이전된 프로젝트';

function deckRelPath(p) {
  const deckReal = realOrNull(DECK_ROOT);
  const real = p ? realOrNull(expandHome(p)) : null;
  if (!deckReal || !real || !real.startsWith(deckReal + path.sep)) return null;
  return path.relative(deckReal, real).split(path.sep).join('/');
}

// deck repo 의 웹 주소 — origin remote 를 https 로 정규화. 원격이 없으면 null(링크 없이 경로만 적는다).
function deckRepoWeb() {
  const git = (...a) => {
    const r = require('child_process').spawnSync('git', ['-C', DECK_ROOT, ...a], { encoding: 'utf-8' });
    return r.status === 0 ? r.stdout.trim() : '';
  };
  const url = git('remote', 'get-url', 'origin');
  const m = url.match(/^(?:git@([^:]+):|https?:\/\/([^/]+)\/)(.+?)(?:\.git)?$/);
  if (!m) return null;
  const branch = git('symbolic-ref', '--short', 'refs/remotes/origin/HEAD').replace(/^origin\//, '') || 'main';
  return { base: `https://${m[1] || m[2]}/${m[3]}`, branch };
}

function renderMovedSection(movedRows) {
  if (!movedRows.length) return '';
  const web = deckRepoWeb();
  const repoLink = web ? `[m2slide-deck](${web.base})` : '`Projects_deck`';
  const rows = movedRows.map((r) => {
    const rel = deckRelPath(r[2]);
    const where = web ? `[${rel}](${web.base}/tree/${web.branch}/${rel})` : `\`${rel}\``;
    return [r[0], r[1], r[3], r[4], where];
  });
  const cols = [...ORG_COLS, '원고 위치'];
  const all = [cols, ...rows];
  const widths = cols.map((_, c) => Math.max(...all.map((r) => dispWidth(r[c] || ''))));
  const pad = (s, w) => s + ' '.repeat(Math.max(0, w - dispWidth(s)));
  const line = (r) => '| ' + cols.map((_, c) => pad(r[c] || '', widths[c])).join(' | ') + ' |';
  const sep = '| ' + widths.map((w) => ':' + '-'.repeat(Math.max(3, w) - 1)).join(' | ') + ' |';
  return [
    MOVED_HEADER,
    '',
    `아래 프로젝트의 원고는 ${repoLink} 저장소로 이전됨. 이 저장소의 \`Projects/\` 에는 없으며, 발행본(GitHub Pages)은 그대로 [목록](https://finfra.github.io/m2slide/)에서 볼 수 있음.`,
    '',
    [line(cols), sep, ...rows.map(line)].join('\n'),
    '',
  ].join('\n');
}

// Projects.md(개인용, 전체) → Projects_org.md(공개용, publishing=o 행만) 생성.
// SSOT는 Projects.md — 본 함수는 매 sync 마다 파생 재생성(수동 편집 금지).
function renderProjectsOrgMd(publishedRows, movedRows = [], date = new Date().toISOString().slice(0, 10)) {
  const rows = publishedRows.map((r) => [r[0], r[1], r[3], r[4]]); // 분류,프로젝트,버전,설명
  const table = renderOrgTable(rows);
  const moved = renderMovedSection(movedRows);
  return [
    '---',
    'title: Projects 목록 (공개)',
    'description: m2slide Projects/ 하위 공개 프로젝트 목록 (publishing=o)',
    'date: ' + date,
    'tags: []',
    '---',
    '# 개요',
    '',
    '공개 저장소(GitHub)에 동기화되는 프로젝트만 나열. 전체 목록·내부 메모는 로컬 전용 `Projects.md` 참조(gitignored).',
    '',
    '⚠️ 본 파일은 `./m2slide.sh --sync-projects` 가 `Projects.md` 에서 자동 파생 — 직접 편집 금지.',
    '',
    '# 프로젝트',
    '',
    table,
    '',
    ...(moved ? [moved] : []),
    '## 이모지 범례',
    '',
    'dev-server(`./m2slide.sh --serve start`) 구동 후 [http://jm4.local:9877/p/](http://jm4.local:9877/p/) 접속 시 아래 이모지가 카드에 반영된 형태로 확인 가능함(전체 목록 기준 — 이 문서는 그중 공개분만).',
    '',
    '* 분류: 📢 PR · ℹ️ Info · 🎓 lec · 🧩 m2 · 🧪 test · 📁 그 외',
    '* 🏷️ 버전 · 📝 설명',
    '* 본 문서 수록 프로젝트는 모두 🌐 공개(publishing=o) 상태',
    '',
  ].join('\n');
}

// 현재 Projects/.gitignore 에서 추적 허용된 폴더명 Set (`!/<Name>/` 패턴).
// fresh clone·publishing 미기입 시 회귀 방지용 시드로 사용.
function readGitignoreAllow() {
  const set = new Set();
  if (!fs.existsSync(PROJECTS_GITIGNORE)) return set;
  for (const line of fs.readFileSync(PROJECTS_GITIGNORE, 'utf-8').split('\n')) {
    const m = line.trim().match(/^!\/([^/]+)\/$/);
    if (m) set.add(m[1]);
  }
  return set;
}

// publishing 값이 있는 폴더 목록으로 Projects/.gitignore 전체 내용을 생성.
// 고정 프리앰블(전체 ignore + 특수 파일 허용) + 폴더 허용목록.
function renderGitignore(publishedNames) {
  const names = [...publishedNames].sort((a, b) => a.localeCompare(b));
  const out = [
    '# Projects/.gitignore — Projects.md 의 publishing 열이 SSOT (Issue254).',
    '# `./m2slide.sh --sync-projects` 가 publishing=o(affirmative) 폴더만 추적 허용목록으로 자동 생성 (x·빈값=제외).',
    '# ⚠️ 수동 편집 금지 — 추적 여부는 Projects.md publishing 열을 고쳐 재동기화할 것.',
    '',
    '# Ignore all files and directories in Projects folder only (not recursive)',
    '/*',
    '',
    '# Track special files',
    ...GITIGNORE_FILE_ALLOWS.map((f) => `!/${f}`),
    '',
    '# Allow project directories (publishing = o)',
    ...names.map((n) => `!/${n}/`),
    '',
  ];
  return out.join('\n');
}

// --- main ------------------------------------------------------------------

const TOKEN_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const die = (msg, code = 1) => { console.error(`❌ ${msg}`); process.exit(code); };

// op: { kind: 'sync' } | { kind: 'link', src, tok } | { kind: 'unlink', tok }
function sync(check, op = { kind: 'sync' }) {
  if (!fs.existsSync(PROJECTS_MD)) die(`Projects.md 없음: ${PROJECTS_MD}`, 2);
  const raw = fs.readFileSync(PROJECTS_MD, 'utf-8');
  const lines = raw.split('\n');

  const activeTbl = parseTableAfter(lines, ACTIVE_HEADER);
  if (!activeTbl) die(`'${ACTIVE_HEADER}' 섹션을 찾을 수 없음: ${PROJECTS_MD}`, 2);
  const inactiveTbl = parseTableAfter(lines, INACTIVE_HEADER);

  // 기존 행 메타 (순서 보존 배열 + 이름 맵)
  let activeList = activeTbl.rows.map((r) => ({ ...r.meta }));
  let inactiveList = (inactiveTbl ? inactiveTbl.rows : []).map((r) => ({ ...r.meta }));
  const notes = [];

  // --link / --unlink — 표를 먼저 고치고 아래 공통 경로(심링크 조정)가 나머지를 한다 ---------
  if (op.kind === 'link') {
    if (!TOKEN_RE.test(op.tok)) die(`토큰 형식 위반 (${TOKEN_RE.source}): ${op.tok}`);
    const real = realOrNull(expandHome(op.src));
    if (!real || !fs.statSync(real).isDirectory()) die(`디렉토리가 아니거나 존재하지 않음: ${op.src}`);
    const dest = path.join(PROJECTS_DIR, op.tok);
    const st = lstatOrNull(dest);
    if (st && !st.isSymbolicLink()) die(`Projects/${op.tok} 가 이미 실디렉토리로 존재함 — 다른 토큰을 쓸 것`);
    const cur = activeList.find((m) => m.name === op.tok);
    const curReal = cur && cur.path ? (realOrNull(expandHome(cur.path)) || expandHome(cur.path)) : (st ? realOrNull(dest) : null);
    if (curReal && curReal !== real) {
      die(`토큰 '${op.tok}' 이 다른 경로에 이미 등재됨: ${curReal}\n   해제 후 다시 등재: --unlink ${op.tok}`);
    }
    if (cur) cur.path = real;
    else {
      const prev = inactiveList.find((m) => m.name === op.tok) || {};
      inactiveList = inactiveList.filter((m) => m.name !== op.tok);
      activeList.push({ ...prev, name: op.tok, path: real, publishing: prev.publishing || 'x' });
    }
  } else if (op.kind === 'unlink') {
    const dest = path.join(PROJECTS_DIR, op.tok);
    const st = lstatOrNull(dest);
    const row = activeList.find((m) => m.name === op.tok);
    if (!st && !(row && row.path)) die(`Projects/${op.tok} 없음`);
    // 오삭제 차단이 이 모드의 존재 이유 — 실디렉토리는 절대 건드리지 않는다.
    if (st && !st.isSymbolicLink()) die(`Projects/${op.tok} 는 실디렉토리입니다 — 마운트 해제 전용이라 거부합니다`);
    if (st && !check) fs.unlinkSync(dest);
    if (row) {
      activeList = activeList.filter((m) => m !== row);
      inactiveList = inactiveList.filter((m) => m.name !== op.tok);
      inactiveList.push(row);
    }
    notes.push(`마운트 해제: ${op.tok} (실제 경로는 그대로 남음${row && row.path ? ` — ${row.path}` : ''})`);
  }

  // 경로 시드 — 표에 경로가 없는 기존 심링크를 흡수한다 --------------------------------
  const links = scanSymlinks();
  const activeByName = new Map(activeList.map((m) => [m.name, m]));
  const inactiveNames = new Set(inactiveList.map((m) => m.name));
  for (const [name, target] of links) {
    if (name.startsWith('_') || name.startsWith('z') || name.startsWith('.')) continue;
    const m = activeByName.get(name);
    if (m && !m.path) m.path = target;
    else if (!m && inactiveNames.has(name)) {
      // 비활성 표에 있던 토큰이 심링크로 돌아옴 → 되살림
      const prev = inactiveList.find((x) => x.name === name);
      inactiveList = inactiveList.filter((x) => x !== prev);
      activeList.push({ ...prev, path: prev.path || target });
    }
  }

  // 심링크 조정 — 경로 있는 활성 행을 표대로 맞춘다 --------------------------------------
  let fsChanged = false;
  const pinned = new Set(); // 경로가 지금 없어도 활성에 남길 행
  for (const m of activeList) {
    if (!m.path) continue;
    pinned.add(m.name);
    const want = realOrNull(expandHome(m.path));
    const dest = path.join(PROJECTS_DIR, m.name);
    const st = lstatOrNull(dest);
    if (!want) { notes.push(`⚠️ 경로 없음 (볼륨 미마운트?): ${m.name} → ${m.path} — 행은 유지`); continue; }
    if (st && !st.isSymbolicLink()) {
      notes.push(`⚠️ Projects/${m.name} 가 실디렉토리라 심링크를 만들지 않음 — 경로 열(${m.path})과 충돌, 한쪽을 정리할 것`);
      continue;
    }
    if (st && realOrNull(dest) === want) continue;
    fsChanged = true;
    if (check) continue;
    if (st) fs.unlinkSync(dest);
    fs.symlinkSync(want, dest);
    notes.push(`${st ? '↻ 재지정' : '+ 마운트'}: ${m.name} → ${want}`);
  }

  const folders = scanActiveFolders();
  const folderSet = new Set(folders);
  const keep = (name) => folderSet.has(name) || pinned.has(name);

  // 현재 Projects/.gitignore 추적 허용목록 — publishing 미기입 폴더의 시드(회귀 방지).
  const allowSet = readGitignoreAllow();
  // publishing 결정: 사람이 명시한 값(o/x 등) 우선. 빈값이면 현재 추적 중일 때만 'o'(affirmative) 시드.
  const seedPub = (name, existing) => {
    const e = (existing || '').trim();
    if (e) return e;
    return allowSet.has(name) ? 'o' : '';
  };

  // 행 배열은 COLS 순서: [분류, 프로젝트, 경로, 버전, 설명, Manual Check, publishing, 작업]
  const mkRow = (name, m, pub) =>
    [m.category || '', name, m.path || '', readVersion(name) || m.version || '?', m.desc || '', m.manual || '', pub, m.work || ''];
  const inactiveMeta = new Map(inactiveList.map((m) => [m.name, m]));

  // 새 활성 행: 기존 순서 유지(유지 대상만) + 신규 폴더 append
  const newActive = [];
  const seen = new Set();
  for (const m of activeList) {
    if (!keep(m.name) || seen.has(m.name)) continue;
    newActive.push(mkRow(m.name, m, seedPub(m.name, m.publishing)));
    seen.add(m.name);
  }
  for (const name of folders) {
    if (seen.has(name)) continue;
    // 비활성 표에 있던 프로젝트가 되살아난 경우 메타 승계
    const m = { ...(inactiveMeta.get(name) || {}) };
    if (!m.path && links.has(name)) m.path = links.get(name); // 표에 없던 심링크 → 경로 시드
    newActive.push(mkRow(name, m, seedPub(name, m.publishing)));
    seen.add(name);
  }

  // 비활성 행: 기존 비활성(단, 되살아난 것 제외) + 새로 제거된 활성 행 (버전은 마지막 값 보존)
  const newInactive = [];
  const inSeen = new Set();
  const mkInactiveRow = (m) => [m.category || '', m.name, m.path || '', m.version || '?', m.desc || '', m.manual || '', m.publishing || '', m.work || ''];
  for (const m of inactiveList) {
    if (seen.has(m.name) || inSeen.has(m.name)) continue; // 되살아남 → 활성으로 이동됨
    newInactive.push(mkInactiveRow(m));
    inSeen.add(m.name);
  }
  for (const m of activeList) {
    if (seen.has(m.name) || inSeen.has(m.name)) continue; // 폴더 제거된 활성 행
    newInactive.push(mkInactiveRow(m));
    inSeen.add(m.name);
  }

  // 재조립 -----------------------------------------------------------------
  let out = lines.slice();
  const activeBlock = renderTable(newActive).split('\n');
  const inactiveBlock = renderTable(newInactive).split('\n');

  // 인덱스 안정 위해 큰 인덱스부터 splice
  const edits = [{ range: activeTbl.range, block: activeBlock }];
  if (inactiveTbl) edits.push({ range: inactiveTbl.range, block: inactiveBlock });
  edits.sort((a, b) => b.range[0] - a.range[0]);
  for (const e of edits) out.splice(e.range[0], e.range[1] - e.range[0], ...e.block);

  // 비활성 섹션이 아예 없으면: 활성 표 바로 뒤(다음 헤더 앞)에 신설
  if (!inactiveTbl && newInactive.length > 0) {
    const aIdx = out.findIndex((l) => l.trim() === ACTIVE_HEADER);
    let j = aIdx + 1;
    while (j < out.length && !(out[j].startsWith('# ') && out[j].trim() !== ACTIVE_HEADER)) j++;
    out.splice(j, 0, '', INACTIVE_HEADER, '', ...inactiveBlock, '');
  }

  const result = out.join('\n');

  // Projects/.gitignore 생성: publishing 이 affirmative(o 등)인 로컬 활성 폴더만 추적.
  // 행 배열 인덱스: [0]분류 [1]프로젝트 [2]경로 [3]버전 [4]설명 [5]ManualCheck [6]publishing [7]작업
  // 외부(경로 있음) 행은 git 추적 대상이 될 수 없다 — 원고가 이 repo 밖에 있다.
  const publishedRows = newActive.filter((r) => isTracked(r[6]) && !r[2]);
  const publishedNames = publishedRows.map((r) => r[1]);
  const publishedSet = new Set(publishedNames);
  const giResult = renderGitignore(publishedSet);
  const giRaw = fs.existsSync(PROJECTS_GITIGNORE) ? fs.readFileSync(PROJECTS_GITIGNORE, 'utf-8') : '';
  const giChanged = giResult !== giRaw;

  // Projects_org.md (공개용, publishing=o 행만) — 본문 불변이면 date 갱신도 skip(노이즈 방지).
  // 이전 절(Issue424)까지 비교해야 덱을 옮기거나 되돌렸을 때 문서가 따라온다 — date 줄만 빼고 전체를 대조한다.
  const movedRows = newActive.filter((r) => isTracked(r[6]) && deckRelPath(r[2]));
  const orgRaw = fs.existsSync(PROJECTS_ORG_MD) ? fs.readFileSync(PROJECTS_ORG_MD, 'utf-8') : '';
  const undated = (s) => s.replace(/^date: .*$/m, 'date:');
  const orgChanged = undated(orgRaw) !== undated(renderProjectsOrgMd(publishedRows, movedRows, ''));
  const orgResult = orgChanged ? renderProjectsOrgMd(publishedRows, movedRows) : orgRaw;

  // 추적목록 변경 diff (전/후) — 투명 보고
  const added = [...publishedSet].filter((n) => !allowSet.has(n)).sort();
  const dropped = [...allowSet].filter((n) => !publishedSet.has(n)).sort();

  for (const n of notes) console.log(`   ${n}`);

  if (check) {
    const mdChanged = result !== raw;
    if (mdChanged || giChanged || orgChanged || fsChanged) {
      const which = [mdChanged && 'Projects.md', giChanged && 'Projects/.gitignore', orgChanged && 'Projects_org.md',
        fsChanged && 'Projects/ 심링크'].filter(Boolean).join(' + ');
      console.error(`❌ 동기화 필요(${which}) — \`./m2slide.sh --sync-projects\` 실행 요망`);
      process.exit(1);
    }
    console.log('✅ 동기화됨(Projects.md + Projects/.gitignore + Projects_org.md + 심링크, 변경 없음)');
    return;
  }

  if (result === raw && !giChanged && !orgChanged && !fsChanged) {
    console.log('✅ 이미 동기화 상태(Projects.md + Projects/.gitignore + Projects_org.md + 심링크, 변경 없음)');
    return;
  }
  if (result !== raw) fs.writeFileSync(PROJECTS_MD, result, 'utf-8');
  if (giChanged) fs.writeFileSync(PROJECTS_GITIGNORE, giResult, 'utf-8');
  if (orgChanged) fs.writeFileSync(PROJECTS_ORG_MD, orgResult, 'utf-8');
  const ext = newActive.filter((r) => r[2]).length;
  console.log(`✅ 동기화 완료 — 활성 ${newActive.length}건(외부 ${ext}), 비활성 ${newInactive.length}건, 추적 ${publishedNames.length}건`);
  if (orgChanged) console.log(`   Projects_org.md 갱신 (공개 ${publishedNames.length}건)`);
  if (added.length) console.log(`   + 추적 추가: ${added.join(', ')}`);
  if (dropped.length) console.log(`   - 추적 제외: ${dropped.join(', ')}`);
}

const argv = process.argv.slice(2);
const check = argv.includes('--check');
const li = argv.indexOf('--link');
const ui = argv.indexOf('--unlink');
if (li >= 0) {
  const src = argv[li + 1];
  if (!src) die('Usage: --link <외부경로> [토큰]');
  const tok = argv[li + 2] && !argv[li + 2].startsWith('--') ? argv[li + 2] : path.basename(realOrNull(expandHome(src)) || src);
  sync(check, { kind: 'link', src, tok });
} else if (ui >= 0) {
  if (!argv[ui + 1]) die('Usage: --unlink <토큰>');
  sync(check, { kind: 'unlink', tok: argv[ui + 1] });
} else {
  sync(check);
}
