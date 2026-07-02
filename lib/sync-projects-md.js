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
// Usage: node lib/sync-projects-md.js [--check]
//   --check: 변경 필요 여부만 판정(파일 미수정). 변경 필요 시 exit 1.

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PROJECTS_MD = path.join(ROOT, 'Projects.md');
const PROJECTS_DIR = path.join(ROOT, 'Projects');
const PROJECTS_GITIGNORE = path.join(PROJECTS_DIR, '.gitignore');

// Projects/.gitignore 에서 폴더가 아닌 특수 파일 추적 허용(고정 프리앰블).
const GITIGNORE_FILE_ALLOWS = ['.gitignore', 'README.md', 'slide.css.md'];

const ACTIVE_HEADER = '# 활성 프로젝트';
const INACTIVE_HEADER = '# 비활성 프로젝트 (z_done)';
// 열 순서 (Issue254): 분류 · 프로젝트 · 버전 · 설명 · Manual Check · publishing · 작업
const COLS = ['분류', '프로젝트', '버전', '설명', 'Manual Check', 'publishing', '작업'];

// publishing 열 = git 추적 드라이버 (Issue254). affirmative(o/y/yes/✓ 등)만 추적,
// 'x'·'n'·빈값은 제외. (사용자가 o/x 를 yes/no 마커로 사용)
const AFFIRM_RE = /^(o|y|yes|true|1|✓|v|ok)$/i;
const isTracked = (v) => AFFIRM_RE.test((v || '').trim());

// --- helpers ---------------------------------------------------------------

function isProjectDir(name) {
  // _ppt, z_done, z_just_test 등 메타·아카이브 폴더 제외
  if (name.startsWith('_') || name.startsWith('z')) return false;
  return fs.statSync(path.join(PROJECTS_DIR, name)).isDirectory();
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
  i++; // header row
  if (i < lines.length && isSeparatorRow(lines[i])) i++; // separator
  const rows = [];
  while (i < lines.length && lines[i].trim().startsWith('|')) {
    const cells = splitRow(lines[i]);
    rows.push({ name: rowToMeta(cells).name, cells });
    i++;
  }
  return { rows, range: [start, i], headerIdx: hIdx };
}

// 기존 행 셀 → 정규화 메타. 7열(분류 포함)·6열(레거시, 분류 없음) 자동 감지.
// 버전은 항상 VERSION 파일 우선이므로 참고값.
function rowToMeta(cells) {
  const g = (i) => (cells[i] || '').trim();
  if (cells.length >= 7) {
    return { category: g(0), name: cellToName(cells[1] || ''), version: g(2), desc: g(3), manual: g(4), publishing: g(5), work: g(6) };
  }
  // 레거시 6열: 분류 없음
  return { category: '', name: cellToName(cells[0] || ''), version: g(1), desc: g(2), manual: g(3), publishing: g(4), work: g(5) };
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
  // rows: [[c0,c1,...c5], ...] (헤더 제외한 데이터)
  const all = [COLS, ...rows];
  const widths = COLS.map((_, c) => Math.max(...all.map((r) => dispWidth(r[c] || ''))));
  const pad = (s, w) => s + ' '.repeat(Math.max(0, w - dispWidth(s)));
  const line = (r) => '| ' + COLS.map((_, c) => pad(r[c] || '', widths[c])).join(' | ') + ' |';
  const sep = '| ' + widths.map((w) => ':' + '-'.repeat(Math.max(3, w) - 1)).join(' | ') + ' |';
  return [line(COLS), sep, ...rows.map(line)].join('\n');
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

function sync(check) {
  const raw = fs.readFileSync(PROJECTS_MD, 'utf-8');
  const lines = raw.split('\n');

  const activeTbl = parseTableAfter(lines, ACTIVE_HEADER);
  if (!activeTbl) {
    console.error(`❌ '${ACTIVE_HEADER}' 섹션을 찾을 수 없음: ${PROJECTS_MD}`);
    process.exit(2);
  }
  const inactiveTbl = parseTableAfter(lines, INACTIVE_HEADER);

  const folders = scanActiveFolders();
  const folderSet = new Set(folders);

  // 현재 Projects/.gitignore 추적 허용목록 — publishing 미기입 폴더의 시드(회귀 방지).
  const allowSet = readGitignoreAllow();
  // publishing 결정: 사람이 명시한 값(o/x 등) 우선. 빈값이면 현재 추적 중일 때만 'o'(affirmative) 시드.
  const seedPub = (name, existing) => {
    const e = (existing || '').trim();
    if (e) return e;
    return allowSet.has(name) ? 'o' : '';
  };

  // 기존 행 메타 맵
  const activeMeta = new Map(activeTbl.rows.map((r) => [r.name, rowToMeta(r.cells)]));
  const inactiveMeta = new Map((inactiveTbl ? inactiveTbl.rows : []).map((r) => [r.name, rowToMeta(r.cells)]));

  // 새 활성 행: 기존 순서 유지(폴더 존재하는 것만) + 신규 폴더 append
  // 행 배열은 COLS 순서: [분류, 프로젝트, 버전, 설명, Manual Check, publishing, 작업]
  const mkRow = (name, m, pub) =>
    [m.category || '', name, readVersion(name) || m.version || '?', m.desc || '', m.manual || '', pub, m.work || ''];

  const newActive = [];
  const seen = new Set();
  for (const r of activeTbl.rows) {
    if (folderSet.has(r.name)) {
      const m = activeMeta.get(r.name) || inactiveMeta.get(r.name) || {};
      newActive.push(mkRow(r.name, m, seedPub(r.name, m.publishing)));
      seen.add(r.name);
    }
  }
  for (const name of folders) {
    if (seen.has(name)) continue;
    // 비활성 표에 있던 프로젝트가 되살아난 경우 메타 승계
    const m = inactiveMeta.get(name) || {};
    newActive.push(mkRow(name, m, seedPub(name, m.publishing)));
    seen.add(name);
  }

  // 비활성 행: 기존 비활성(단, 되살아난 것 제외) + 새로 제거된 활성 행 (버전은 마지막 값 보존)
  const newInactive = [];
  const inSeen = new Set();
  const mkInactiveRow = (m) => [m.category || '', m.name, m.version || '?', m.desc || '', m.manual || '', m.publishing || '', m.work || ''];
  for (const r of (inactiveTbl ? inactiveTbl.rows : [])) {
    if (folderSet.has(r.name)) continue; // 되살아남 → 활성으로 이동됨
    newInactive.push(mkInactiveRow(rowToMeta(r.cells)));
    inSeen.add(r.name);
  }
  for (const r of activeTbl.rows) {
    if (folderSet.has(r.name) || inSeen.has(r.name)) continue; // 폴더 제거된 활성 행
    newInactive.push(mkInactiveRow(rowToMeta(r.cells)));
    inSeen.add(r.name);
  }

  // 재조립 -----------------------------------------------------------------
  let out = lines.slice();

  // 활성 표 치환 (뒤쪽부터 처리하여 인덱스 밀림 방지)
  const activeBlock = renderTable(newActive).split('\n');
  // 비활성 표 블록
  const inactiveBlock = renderTable(newInactive).split('\n');

  // 인덱스 안정 위해 활성/비활성 위치를 각각 계산 후 큰 인덱스부터 splice
  const edits = [];
  edits.push({ range: activeTbl.range, block: activeBlock });

  if (inactiveTbl) {
    edits.push({ range: inactiveTbl.range, block: inactiveBlock });
  }

  edits.sort((a, b) => b.range[0] - a.range[0]);
  for (const e of edits) {
    out.splice(e.range[0], e.range[1] - e.range[0], ...e.block);
  }

  // 비활성 섹션이 아예 없으면: 활성 표 바로 뒤(다음 헤더 앞)에 신설
  if (!inactiveTbl && newInactive.length > 0) {
    // 활성 헤더 위치를 재탐색(splice 이후)
    const aIdx = out.findIndex((l) => l.trim() === ACTIVE_HEADER);
    // 활성 표 끝 = 다음 '# ' 헤더 직전
    let j = aIdx + 1;
    while (j < out.length && !(out[j].startsWith('# ') && out[j].trim() !== ACTIVE_HEADER)) j++;
    const insertAt = j;
    const section = ['', INACTIVE_HEADER, '', ...inactiveBlock, ''];
    out.splice(insertAt, 0, ...section);
  }

  const result = out.join('\n');

  // Projects/.gitignore 생성: publishing 이 affirmative(o 등)인 활성 폴더만 추적.
  // 행 배열 인덱스: [0]분류 [1]프로젝트 [2]버전 [3]설명 [4]ManualCheck [5]publishing [6]작업
  const publishedNames = newActive.filter((r) => isTracked(r[5])).map((r) => r[1]);
  const publishedSet = new Set(publishedNames);
  const giResult = renderGitignore(publishedSet);
  const giRaw = fs.existsSync(PROJECTS_GITIGNORE) ? fs.readFileSync(PROJECTS_GITIGNORE, 'utf-8') : '';
  const giChanged = giResult !== giRaw;

  // 추적목록 변경 diff (전/후) — 투명 보고
  const added = [...publishedSet].filter((n) => !allowSet.has(n)).sort();
  const dropped = [...allowSet].filter((n) => !publishedSet.has(n)).sort();

  if (check) {
    const mdChanged = result !== raw;
    if (mdChanged || giChanged) {
      const which = [mdChanged && 'Projects.md', giChanged && 'Projects/.gitignore'].filter(Boolean).join(' + ');
      console.error(`❌ 동기화 필요(${which}) — \`./m2slide.sh --sync-projects\` 실행 요망`);
      process.exit(1);
    }
    console.log('✅ 동기화됨(Projects.md + Projects/.gitignore, 변경 없음)');
    return;
  }

  if (result === raw && !giChanged) {
    console.log('✅ 이미 동기화 상태(Projects.md + Projects/.gitignore, 변경 없음)');
    return;
  }
  if (result !== raw) fs.writeFileSync(PROJECTS_MD, result, 'utf-8');
  if (giChanged) fs.writeFileSync(PROJECTS_GITIGNORE, giResult, 'utf-8');
  console.log(`✅ 동기화 완료 — 활성 ${newActive.length}건, 비활성 ${newInactive.length}건, 추적 ${publishedNames.length}건`);
  if (added.length) console.log(`   + 추적 추가: ${added.join(', ')}`);
  if (dropped.length) console.log(`   - 추적 제외: ${dropped.join(', ')}`);
}

sync(process.argv.includes('--check'));
