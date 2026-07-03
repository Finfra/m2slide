#!/usr/bin/env node
'use strict';

/**
 * m2slide md-check skill — 슬라이드 마크다운 검사·수정 도구.
 *
 * 검출 항목:
 *   M2C001  슬라이드 제목으로 H1 사용 — children H2 없음. default _contents
 *           layout 경로에서 slide-parser가 title을 추출하지 않아 contents-header
 *           블록이 빈 상태로 만들어졌다가 Issue90 cleanup으로 통째 삭제되어
 *           제목 밴드(노란 밑줄·puffer)가 사라짐. → 슬라이드 제목은 H2 권장.
 *
 * 사용:
 *   md-check.js <file_or_dir>...        검사만 (dry-run)
 *   md-check.js --fix <file_or_dir>...  H1 → H2 자동 수정
 *
 * 종료 코드:
 *   0  문제 없음 (또는 --fix 적용 후 모두 수정)
 *   1  문제 검출 (--fix 없을 때) 또는 사용 오류
 *   2  내부 오류
 */

const fs = require('fs');
const path = require('path');

// ───────── 인자 파싱 ─────────
const args = process.argv.slice(2);
const opts = { fix: false, help: false, paths: [] };
for (const a of args) {
  if (a === '--fix') opts.fix = true;
  else if (a === '--help' || a === '-h') opts.help = true;
  else if (a.startsWith('-')) {
    console.error(`알 수 없는 옵션: ${a}`);
    process.exit(1);
  } else opts.paths.push(a);
}

if (opts.help || opts.paths.length === 0) {
  console.log(`사용법: md-check.js [--fix] <file_or_dir>...

m2slide 슬라이드 마크다운(.md) 파일에서 default _contents layout 적용 시
title 추출 누락 문제를 검출하고 선택적으로 자동 수정합니다.

옵션:
  --fix         검출된 문제를 자동 수정 (H1 → H2)
  --help, -h    도움말

검출 코드:
  M2C001  슬라이드 제목으로 H1 사용 — children H2 없음
          (default _contents에서 title 추출 누락 → 제목 밴드/divider 미표시)

예시:
  md-check.js Projects/ramyeon
  md-check.js --fix Projects/ramyeon/ramyeon.md
  md-check.js Projects/                 # 모든 프로젝트 일괄 검사
`);
  process.exit(opts.help ? 0 : 1);
}

// ───────── 유틸 ─────────

// 슬라이드 첫 비공백 라인을 검사. 디렉티브(#layout-*, #transition-*, #auto-animate,
// #autoslide-*, #background-*) skip 후 H1~H6 헤더 발견 시 레벨 반환. 아니면 null.
// 디렉티브 패턴은 m2slide의 extractDirectives와 동기화.
function getTopHeadingLevel(slideText) {
  const lines = slideText.split('\n');
  for (const l of lines) {
    const t = l.trim();
    if (!t) continue;
    // 디렉티브 (값 없는 형) — `#layout-name`, `#auto-animate` 등
    if (/^#[a-z][a-z0-9_-]*$/.test(t)) continue;
    // 디렉티브 (값 포함) — `#transition-fade`, `#background-color-1a1a2e` 등 (위 패턴에 포함됨)
    // 헤더
    const m = t.match(/^(#{1,6})\s+(.+)$/);
    if (m) return m[1].length;
    return null; // 첫 비공백이 헤더 아닌 콘텐츠 (image-only 등)
  }
  return null;
}

// 슬라이드 본문에서 같은 레벨이 있는지가 아니라 "이 슬라이드의 최상위 헤더의 children"
// (= H{N+1})이 같은 슬라이드 안 또는 다음 슬라이드의 최상위로 등장하는지 검사.
// m2slide slide-parser auto-toc 게이트와 동일 의미.
function hasChildren(slide, nextSlide, parentLevel) {
  const childPrefix = '#'.repeat(parentLevel + 1) + ' ';
  const linesInSlide = slide.split('\n');
  // 같은 슬라이드 안 children
  if (linesInSlide.some(l => l.trim().startsWith(childPrefix))) return true;
  // 다음 슬라이드의 최상위가 child level이면 children
  if (nextSlide) {
    const nextTop = getTopHeadingLevel(nextSlide);
    if (nextTop === parentLevel + 1) return true;
  }
  return false;
}

function parseFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return { fm: null, body: content, fmRaw: '' };
  const fields = {};
  for (const line of m[1].split(/\r?\n/)) {
    const km = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*)$/);
    if (km) fields[km[1]] = km[2].trim();
  }
  return { fm: fields, body: content.slice(m[0].length), fmRaw: m[0] };
}

// frontmatter 줄 수(개행 수) 반환 — 슬라이드 라인 번호 계산용
function countLines(s) {
  if (!s) return 0;
  return s.split(/\r?\n/).length - 1;
}

// 슬라이드 안에서 첫 H1 라인 인덱스 (0-based, slide 내부)
function findFirstH1LineIndex(slide) {
  const lines = slide.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (/^#\s+/.test(lines[i])) return i;
  }
  return -1;
}

// 디렉토리/파일 재귀 수집 (.md만, 빌드/임시 폴더 제외)
const SKIP_DIRS = new Set([
  'slide', 'node_modules', '.git', 'res', 'wav', 'img', 'kroki',
  '_doc_work', 'z_done', 'z_old', 'try0', 'graphify-out',
]);

function gatherFiles(p) {
  let stat;
  try { stat = fs.statSync(p); } catch (e) {
    console.error(`❌ 경로 없음: ${p}`); return [];
  }
  if (stat.isFile()) return p.endsWith('.md') ? [p] : [];
  const out = [];
  walk(p, out);
  return out;
}

function walk(dir, out) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('.')) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      walk(full, out);
    } else if (ent.name.endsWith('.md')) {
      out.push(full);
    }
  }
}

// ───────── 핵심 검사 ─────────

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const { fm, body, fmRaw } = parseFrontmatter(content);
  if (!fm) return [];
  if (fm.type !== 'ppt') return [];
  // AGENDA.md는 chapter mode 메타 — slide-parser 경로 다름
  if (path.basename(filePath) === 'AGENDA.md') return [];

  const fmLineCount = countLines(fmRaw);
  const slides = body.split(/\n---\n/);
  const issues = [];
  let lineCursor = fmLineCount + 1; // body의 첫 라인 (1-based)

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const top = getTopHeadingLevel(slide);
    if (top === 1) {
      const next = i + 1 < slides.length ? slides[i + 1] : null;
      if (!hasChildren(slide, next, 1)) {
        const innerLine = findFirstH1LineIndex(slide);
        issues.push({
          code: 'M2C001',
          file: filePath,
          slideIdx: i,
          line: lineCursor + (innerLine >= 0 ? innerLine : 0),
          msg: '슬라이드 제목으로 H1 사용 — children H2 없음 → H2 권장',
          fixable: true,
        });
      }
    }
    lineCursor += slide.split('\n').length + 1; // +1 for `---` separator line
  }
  return issues;
}

// ───────── 자동 수정 ─────────

function applyFix(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const { fm, body, fmRaw } = parseFrontmatter(content);
  if (!fm || fm.type !== 'ppt' || path.basename(filePath) === 'AGENDA.md') {
    return { changed: false, count: 0 };
  }

  const slides = body.split(/\n---\n/);
  let count = 0;
  const newSlides = slides.map((slide, i) => {
    const top = getTopHeadingLevel(slide);
    if (top !== 1) return slide;
    const next = i + 1 < slides.length ? slides[i + 1] : null;
    if (hasChildren(slide, next, 1)) return slide;

    // 첫 H1 한 줄만 H2로 교체
    let done = false;
    const lines = slide.split('\n').map(l => {
      if (done) return l;
      const m = l.match(/^# (.+)$/);
      if (m) {
        done = true;
        return `## ${m[1]}`;
      }
      return l;
    });
    if (done) count++;
    return lines.join('\n');
  });

  if (count === 0) return { changed: false, count: 0 };

  const newBody = newSlides.join('\n---\n');
  fs.writeFileSync(filePath, fmRaw + newBody, 'utf-8');
  return { changed: true, count };
}

// ───────── 메인 ─────────

const allFiles = [];
for (const p of opts.paths) allFiles.push(...gatherFiles(p));

if (allFiles.length === 0) {
  console.log('⚠️  검사 대상 .md 파일이 없습니다');
  process.exit(0);
}

const issuesByFile = {};
let totalIssues = 0;
for (const f of allFiles) {
  const issues = checkFile(f);
  if (issues.length > 0) {
    issuesByFile[f] = issues;
    totalIssues += issues.length;
  }
}

if (totalIssues === 0) {
  console.log(`✅ 검사 ${allFiles.length}개 파일 — 문제 없음`);
  process.exit(0);
}

console.log(`📋 검사 ${allFiles.length}개 파일 — ${totalIssues}건 검출\n`);
for (const [f, issues] of Object.entries(issuesByFile)) {
  console.log(`📄 ${f}`);
  for (const it of issues) {
    console.log(`  [${it.code}] line ${it.line} (slide ${it.slideIdx + 1}): ${it.msg}`);
  }
  console.log('');
}

if (!opts.fix) {
  console.log('💡 자동 수정: --fix 옵션 추가');
  process.exit(1);
}

console.log('🔧 자동 수정 적용 중...');
let totalFixed = 0;
for (const f of Object.keys(issuesByFile)) {
  const r = applyFix(f);
  if (r.changed) {
    console.log(`  ✏️  ${f} — ${r.count}건 수정 (H1 → H2)`);
    totalFixed += r.count;
  }
}
console.log(`\n✅ ${totalFixed}건 수정 완료`);
console.log('💡 변경 후 재빌드 권장: ./m2slide.sh <ProjectName>');
process.exit(0);
