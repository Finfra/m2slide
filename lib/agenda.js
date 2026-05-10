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

// Issue113: agenda 페이지 헤더에 표시할 타이틀 추출 (프로젝트명과 분리).
// 우선순위: AGENDA.md frontmatter `agenda_title:` → null (호출 측에서 _config.yml/default 폴백)
// 따옴표 제거.
function getAgendaPageTitleFromMd(agendaPath) {
  try {
    if (!agendaPath || !fs.existsSync(agendaPath)) return null;
    const content = fs.readFileSync(agendaPath, 'utf-8');
    const { yaml } = _stripFrontmatter(content);
    const m = yaml.match(/^agenda_title:\s*(.+)$/m);
    if (!m) return null;
    let val = m[1].trim();
    val = val.replace(/^["']|["']$/g, '');
    return val || null;
  } catch (_) { return null; }
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

// Issue136: 계층 인식 sibling 점프 — main↔main, sub↔sub 같은 레벨만 이동.
// 마지막/첫 sub인 경우 부모의 다음/이전 main으로 fall-up. ⇤/⇥(Home/End) 단축키 전용.
// _getAdjacentChapter(flat 파일 순서)와 분리하여 ↓·→·← 등 sequential 이동은 영향 없음.
function getNextSiblingChapter(fileName, agendaPath) {
  return _getSiblingChapter(fileName, agendaPath, +1);
}

function getPrevSiblingChapter(fileName, agendaPath) {
  return _getSiblingChapter(fileName, agendaPath, -1);
}

function _getSiblingChapter(fileName, agendaPath, direction) {
  try {
    if (!agendaPath || !fs.existsSync(agendaPath)) return '';
    const content = fs.readFileSync(agendaPath, 'utf-8');
    const { body } = _stripFrontmatter(content);
    const lines = body.split('\n');
    const level = _detectEntryLevel(body);
    const pat = _patternsFor(level);
    // 평탄화 + level (1=main, 2=sub) 메타 보존
    const entries = [];
    for (const line of lines) {
      const mainMatch = line.match(pat.mainAny);
      if (mainMatch) {
        entries.push({ html: path.basename(mainMatch[2], '.md') + '.html', level: 1 });
        continue;
      }
      const subMatch = line.match(pat.subAny);
      if (subMatch) {
        entries.push({ html: path.basename(subMatch[2], '.md') + '.html', level: 2 });
      }
    }
    const currentHtml = path.basename(fileName, '.md') + '.html';
    const idx = entries.findIndex(e => e.html === currentHtml);
    if (idx === -1) return '';
    const curLevel = entries[idx].level;
    const step = direction;
    // Single 모드 Issue105와 동일 패턴 — level ≤ curLevel 첫 매치 반환
    // sub(L2) PREV: 같은 부모 내 sub 또는 부모 main(L1) 둘 다 ≤2 → 트리 sibling으로 자연 fall-up
    // main(L1) NEXT: sub(L2) skip → 다음 main만 매칭
    for (let i = idx + step; i >= 0 && i < entries.length; i += step) {
      if (entries[i].level <= curLevel) return entries[i].html;
    }
    return '';
  } catch (_) {
    return '';
  }
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

// Issue112: AGENDA.md 기반 챕터 번호 매핑.
// 메인 엔트리 = '1', '2', ... / 서브 엔트리 = '1.1', '1.2', ...
// hidden 항목(`!`)도 포함 (모든 빌드된 HTML에 번호 부여)
function getChapterNumberMap(agendaPath) {
  if (!agendaPath || !fs.existsSync(agendaPath)) return {};
  const content = fs.readFileSync(agendaPath, 'utf-8');
  const { body } = _stripFrontmatter(content);
  const lines = body.split('\n');
  const level = _detectEntryLevel(body);
  const pat = _patternsFor(level);
  const map = {};
  let mainIdx = 0;
  let subIdx = 0;
  for (const line of lines) {
    const mainMatch = line.match(pat.mainAny);
    if (mainMatch) {
      mainIdx++;
      subIdx = 0;
      const html = path.basename(mainMatch[2], '.md') + '.html';
      map[html] = String(mainIdx);
      continue;
    }
    const subMatch = line.match(pat.subAny);
    if (subMatch) {
      subIdx++;
      const html = path.basename(subMatch[2], '.md') + '.html';
      map[html] = `${mainIdx}.${subIdx}`;
    }
  }
  return map;
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

// Issue141: AGENDA.md outline 트리에서 fileName의 ancestor 경로를 d1부터 자기까지 반환.
// 임의 depth 지원. plain heading(링크 없음)은 stack 무시.
// 반환 예: ['1. 도입', '1.1 인사', '1.1.1 자기소개']
// 미등록·AGENDA.md 미존재: []
function getOutlinePath(fileName, agendaPath) {
  try {
    if (!agendaPath || !fs.existsSync(agendaPath)) return [];
    const content = fs.readFileSync(agendaPath, 'utf-8');
    const { body } = _stripFrontmatter(content);
    const lines = body.split('\n');
    const level = _detectEntryLevel(body);
    const d1HeaderLevel = level === 'h1' ? 1 : 2;
    const baseName = fileName.replace(/\.html$/, '');
    const headerEntryRe = /^(#+) !?\[(.+?)\]\((.+?)\)\s*$/;

    const stack = [];
    for (const line of lines) {
      const m = line.match(headerEntryRe);
      if (!m) continue;  // plain heading은 자동 무시
      const headerLevel = m[1].length;
      const title = m[2];
      const link = m[3];
      const depth = headerLevel - d1HeaderLevel + 1;
      if (depth < 1) continue;
      while (stack.length > 0 && stack[stack.length - 1].depth >= depth) stack.pop();
      stack.push({ depth, title });
      const linkBase = link.replace(/^\.\//, '').replace(/\.md$/, '');
      if (linkBase === baseName) return stack.map(s => s.title);
    }
    return [];
  } catch (_) { return []; }
}

module.exports = { parseAgenda, getSubsections, getParentPage, getNextChapter, getPrevChapter, getNextSiblingChapter, getPrevSiblingChapter, getLastChapter, getAgendaTitle, getAgendaPageTitleFromMd, getChapterNumberMap, getOutlinePath };
