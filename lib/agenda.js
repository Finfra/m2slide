'use strict';

const fs = require('fs');
const path = require('path');

// Frontmatter를 분리해 본문만 반환. 두 가지 AGENDA.md 포맷을 모두 지원하기 위함.
function _stripFrontmatter(content) {
  if (!content.startsWith('---')) return { yaml: '', body: content };
  const end = content.indexOf('\n---', 3);
  if (end === -1) return { yaml: '', body: content };
  return {
    yaml: content.slice(4, end),
    body: content.slice(end + 4).replace(/^\s*\n/, '')
  };
}

// 메인 엔트리 헤더 레벨 자동 감지: H1 링크 항목이 있으면 'h1', 없으면 'h2'(기존 동작).
function _detectEntryLevel(body) {
  for (const line of body.split('\n')) {
    if (/^# !?\[.+?\]\(.+?\)\s*$/.test(line)) return 'h1';
  }
  return 'h2';
}

// 레벨별 매칭 패턴 묶음
function _patternsFor(level) {
  if (level === 'h1') {
    return {
      main:        /^# \[(.+?)\]\((.+?)\)\s*$/,
      mainHidden:  /^# !\[(.+?)\]\((.+?)\)\s*$/,
      mainAny:     /^# !?\[(.+?)\]\((.+?)\)\s*$/,
      sub:         /^## \[(.+?)\]\((.+?)\)\s*$/,
      subHidden:   /^## !\[(.+?)\]\((.+?)\)\s*$/,
      subAny:      /^## !?\[(.+?)\]\((.+?)\)\s*$/,
      mainAnyTest: /^# !?\[/,
      subAnyTest:  /^## !?\[/
    };
  }
  // h2 (기존 기본)
  return {
    main:        /^## \[(.+?)\]\((.+?)\)\s*$/,
    mainHidden:  /^## !\[(.+?)\]\((.+?)\)\s*$/,
    mainAny:     /^## !?\[(.+?)\]\((.+?)\)\s*$/,
    sub:         /^### \[(.+?)\]\((.+?)\)\s*$/,
    subHidden:   /^### !\[(.+?)\]\((.+?)\)\s*$/,
    subAny:      /^### !?\[(.+?)\]\((.+?)\)\s*$/,
    mainAnyTest: /^## !?\[/,
    subAnyTest:  /^### !?\[/
  };
}

// AGENDA.md의 프레젠테이션 제목 추출.
// 우선순위: frontmatter title → 첫 번째 plain H1(링크 아님) → fallback.
function getAgendaTitle(agendaPath, fallback) {
  try {
    if (!agendaPath || !fs.existsSync(agendaPath)) return fallback || '';
    const content = fs.readFileSync(agendaPath, 'utf-8');
    const { yaml, body } = _stripFrontmatter(content);
    const ymTitle = yaml.match(/^title:\s*(.+)$/m);
    if (ymTitle) return ymTitle[1].trim();
    for (const line of body.split('\n')) {
      // 링크가 아닌 plain H1 한 줄
      if (/^# (?!!?\[)(.+)$/.test(line)) {
        return line.replace(/^# /, '').trim();
      }
    }
    return fallback || '';
  } catch (_) { return fallback || ''; }
}

function getSubsections(fileName, agendaPath) {
  try {
    if (!agendaPath || !fs.existsSync(agendaPath)) return [];
    const content = fs.readFileSync(agendaPath, 'utf-8');
    const { body } = _stripFrontmatter(content);
    const lines = body.split('\n');
    const level = _detectEntryLevel(body);
    const pat = _patternsFor(level);
    // 메인 엔트리 패턴 — 파일명 일치
    const mainOfFile = level === 'h1'
      ? new RegExp(`^# !?\\[(.+?)\\]\\(\\.\/${fileName}\\)`)
      : new RegExp(`^## !?\\[(.+?)\\]\\(\\.\/${fileName}\\)`);
    let foundMainSection = false;
    const subsections = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (mainOfFile.test(line)) { foundMainSection = true; continue; }
      if (foundMainSection) {
        // 다음 메인 엔트리 도달 시 종료
        if (pat.mainAnyTest.test(line)) break;
        const subMatch = line.match(pat.sub);
        if (subMatch) {
          subsections.push({ title: subMatch[1], htmlFile: path.basename(subMatch[2], '.md') + '.html' });
        }
      }
    }
    return subsections;
  } catch (_) { return []; }
}

function getParentPage(fileName, agendaPath) {
  try {
    if (!agendaPath || !fs.existsSync(agendaPath)) return 'index.html';
    const content = fs.readFileSync(agendaPath, 'utf-8');
    const { body } = _stripFrontmatter(content);
    const lines = body.split('\n');
    const level = _detectEntryLevel(body);
    const pat = _patternsFor(level);
    const subOfFile = level === 'h1'
      ? new RegExp(`^## \\[(.+?)\\]\\(\\.\/${fileName}\\)`)
      : new RegExp(`^### \\[(.+?)\\]\\(\\.\/${fileName}\\)`);

    for (let i = 0; i < lines.length; i++) {
      if (subOfFile.test(lines[i])) {
        for (let j = i - 1; j >= 0; j--) {
          const parentMatch = lines[j].match(pat.mainAny);
          if (parentMatch) return path.basename(parentMatch[2], '.md') + '.html';
        }
      }
    }
    return 'index.html';
  } catch (_) { return 'index.html'; }
}

function getNextChapter(fileName, agendaPath) {
  return _getAdjacentChapter(fileName, agendaPath, +1);
}

// Issue70: 이전 챕터 lookup. 첫 챕터(또는 미발견)이면 '' 반환 (호출 측에서 agenda 폴백)
function getPrevChapter(fileName, agendaPath) {
  return _getAdjacentChapter(fileName, agendaPath, -1);
}

// Issue87: 마지막 챕터(=AGENDA.md 최하단 main/sub 항목) 파일명. AGENDA.md 없으면 ''.
// ⇟ PgDown(마지막 페이지 직행) 대상.
function getLastChapter(agendaPath) {
  try {
    if (!agendaPath || !fs.existsSync(agendaPath)) return '';
    const content = fs.readFileSync(agendaPath, 'utf-8');
    const { body } = _stripFrontmatter(content);
    const level = _detectEntryLevel(body);
    const pat = _patternsFor(level);
    let last = '';
    for (const line of body.split('\n')) {
      const m = line.match(pat.mainAny) || line.match(pat.subAny);
      if (m) last = path.basename(m[2], '.md') + '.html';
    }
    return last;
  } catch (_) { return ''; }
}

function _getAdjacentChapter(fileName, agendaPath, direction) {
  try {
    if (!agendaPath || !fs.existsSync(agendaPath)) {
      return direction > 0 ? 'index.html' : '';
    }
    const content = fs.readFileSync(agendaPath, 'utf-8');
    const { body } = _stripFrontmatter(content);
    const lines = body.split('\n');
    const level = _detectEntryLevel(body);
    const pat = _patternsFor(level);
    const chapters = [];
    for (const line of lines) {
      const mainMatch = line.match(pat.mainAny);
      if (mainMatch) { chapters.push(path.basename(mainMatch[2], '.md') + '.html'); continue; }
      const subMatch = line.match(pat.subAny);
      if (subMatch) chapters.push(path.basename(subMatch[2], '.md') + '.html');
    }
    const currentHtml = path.basename(fileName, '.md') + '.html';
    const idx = chapters.indexOf(currentHtml);
    if (idx === -1) return direction > 0 ? 'index.html' : '';
    const target = idx + direction;
    if (target < 0) return '';
    if (target >= chapters.length) return 'index.html';
    return chapters[target];
  } catch (_) {
    return direction > 0 ? 'index.html' : '';
  }
}

// AGENDA.md를 markmap 트리로 변환. 메인 엔트리 헤더 레벨(H1/H2)을 자동 감지.
function parseAgenda(agendaPath) {
  const content = fs.readFileSync(agendaPath, 'utf-8');
  const { body } = _stripFrontmatter(content);
  const lines = body.split('\n');
  const level = _detectEntryLevel(body);
  const pat = _patternsFor(level);
  const root = { content: '', children: [] };
  let currentSection = null;

  for (const line of lines) {
    // hidden 메인 엔트리 — TOC에서 제외
    if (pat.mainHidden.test(line)) { currentSection = null; continue; }

    const mainMatch = line.match(pat.main);
    if (mainMatch) {
      currentSection = {
        content: `<a href="${path.basename(mainMatch[2], '.md') + '.html'}">${mainMatch[1]}</a>`,
        children: []
      };
      root.children.push(currentSection);
      continue;
    }

    // hidden 서브 엔트리 — TOC에서 제외
    if (pat.subHidden.test(line)) continue;

    const subMatch = line.match(pat.sub);
    if (subMatch && currentSection) {
      currentSection.children.push({
        content: `<a href="${path.basename(subMatch[2], '.md') + '.html'}">${subMatch[1]}</a>`,
        children: []
      });
    }
  }
  return root;
}

module.exports = { parseAgenda, getSubsections, getParentPage, getNextChapter, getPrevChapter, getLastChapter, getAgendaTitle };
