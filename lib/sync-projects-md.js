#!/usr/bin/env node
// sync-projects-md.js (Issue253)
// Projects.md 활성/비활성 표를 Projects/<Name>/VERSION 파일 기준으로 자동 동기화.
//
// 동작:
//   - 활성 표: Projects/ 하위 실제 폴더(단, _*·z* 제외)를 행으로. 버전 열 = VERSION 파일 값.
//     설명·Manual Check·publishing·작업 열은 기존 행을 보존(사람 작성 열 머지). 신규 폴더는 행 추가.
//   - 제거(표에 있으나 폴더 없음): `# 비활성 프로젝트 (z_done)` 표로 행 이동(버전·설명 등 마지막 값 보존).
//   - idempotent: 재실행 시 안정.
//
// Usage: node lib/sync-projects-md.js [--check]
//   --check: 변경 필요 여부만 판정(파일 미수정). 변경 필요 시 exit 1.

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PROJECTS_MD = path.join(ROOT, 'Projects.md');
const PROJECTS_DIR = path.join(ROOT, 'Projects');

const ACTIVE_HEADER = '# 활성 프로젝트';
const INACTIVE_HEADER = '# 비활성 프로젝트 (z_done)';
const COLS = ['프로젝트', '버전', '설명', 'Manual Check', 'publishing', '작업'];

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
    rows.push({ name: cellToName(cells[0] || ''), cells });
    i++;
  }
  return { rows, range: [start, i], headerIdx: hIdx };
}

// 기존 행 셀 → 열 맵(설명·Manual Check·publishing·작업). 버전 제외(항상 VERSION 파일 우선).
function rowToMeta(cells) {
  return {
    version: cells[1] || '',
    desc: cells[2] || '',
    manual: cells[3] || '',
    publishing: cells[4] || '',
    work: cells[5] || '',
  };
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

  // 기존 행 메타 맵
  const activeMeta = new Map(activeTbl.rows.map((r) => [r.name, rowToMeta(r.cells)]));
  const inactiveMeta = new Map((inactiveTbl ? inactiveTbl.rows : []).map((r) => [r.name, rowToMeta(r.cells)]));

  // 새 활성 행: 기존 순서 유지(폴더 존재하는 것만) + 신규 폴더 append
  const newActive = [];
  const seen = new Set();
  for (const r of activeTbl.rows) {
    if (folderSet.has(r.name)) {
      const m = activeMeta.get(r.name) || inactiveMeta.get(r.name) || {};
      newActive.push([r.name, readVersion(r.name) || m.version || '?', m.desc || '', m.manual || '', m.publishing || '', m.work || '']);
      seen.add(r.name);
    }
  }
  for (const name of folders) {
    if (seen.has(name)) continue;
    // 비활성 표에 있던 프로젝트가 되살아난 경우 메타 승계
    const m = inactiveMeta.get(name) || {};
    newActive.push([name, readVersion(name) || m.version || '?', m.desc || '', m.manual || '', m.publishing || '', m.work || '']);
    seen.add(name);
  }

  // 비활성 행: 기존 비활성(단, 되살아난 것 제외) + 새로 제거된 활성 행
  const newInactive = [];
  const inSeen = new Set();
  for (const r of (inactiveTbl ? inactiveTbl.rows : [])) {
    if (folderSet.has(r.name)) continue; // 되살아남 → 활성으로 이동됨
    const m = rowToMeta(r.cells);
    newInactive.push([r.name, m.version || '?', m.desc || '', m.manual || '', m.publishing || '', m.work || '']);
    inSeen.add(r.name);
  }
  for (const r of activeTbl.rows) {
    if (folderSet.has(r.name) || inSeen.has(r.name)) continue; // 폴더 제거된 활성 행
    const m = rowToMeta(r.cells);
    newInactive.push([r.name, m.version || '?', m.desc || '', m.manual || '', m.publishing || '', m.work || '']);
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

  if (check) {
    if (result !== raw) {
      console.error('❌ Projects.md 동기화 필요 — `node lib/sync-projects-md.js` 실행 요망');
      process.exit(1);
    }
    console.log('✅ Projects.md 동기화됨(변경 없음)');
    return;
  }

  if (result === raw) {
    console.log('✅ Projects.md 이미 동기화 상태(변경 없음)');
    return;
  }
  fs.writeFileSync(PROJECTS_MD, result, 'utf-8');
  console.log(`✅ Projects.md 동기화 완료 — 활성 ${newActive.length}건, 비활성 ${newInactive.length}건`);
}

sync(process.argv.includes('--check'));
