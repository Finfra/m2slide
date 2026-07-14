#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const { createDefaultConfig, loadConfig, loadProjectMeta, buildDownloadButtonsHTML } = require('./config');
const { loadLayoutTemplates } = require('./layout');
const { parseAgenda, getAgendaTitle, getAgendaPageTitleFromMd, getLastChapter, getChapterNumberMap } = require('./agenda');
const { configure, generateTOCFromFile, generateHTML, generateCoverHTML, generateRedirectHTML, generateAgendaHTML } = require('./html-builder');
const { applyVendor } = require('./vendor-rewrite');

const ROOT_DIR = path.resolve(__dirname, '..');

// Issue191: theme slide.css 의 `@import` 를 재귀 인라인 전개한다.
// 빌드 산출물(slide/css/custom.css)은 단일 파일 — slide.css 복사 시 @import "..."
// 라인을 대상 파일 내용으로 치환. theme/_shared/components.css 같은 공통 partial 을
// 별도 복사 없이 합쳐 출력하므로 순수 런타임 @import(partial 미복사 404) 문제를 회피.
function expandCssImports(cssAbsPath, _seen) {
  const seen = _seen || new Set();
  const abs = path.resolve(cssAbsPath);
  if (seen.has(abs)) {
    console.warn(`⚠️ CSS @import 순환 감지, 건너뜀: ${abs}`);
    return '';
  }
  seen.add(abs);
  const dir = path.dirname(abs);
  const src = fs.readFileSync(abs, 'utf-8');
  // 줄 시작(공백 only)·줄 끝 강제 — CSS 주석 안의 @import 텍스트 오매칭 방지
  return src.replace(/^[ \t]*@import\s+(?:url\()?\s*["']([^"']+)["']\s*\)?\s*;[ \t]*$/gm, (match, rel) => {
    const target = path.resolve(dir, rel);
    if (!fs.existsSync(target)) {
      console.warn(`⚠️ CSS @import 대상 없음: ${rel} (from ${abs}) — 원본 라인 유지`);
      return match;
    }
    return `/* >>> @import ${rel} (Issue191 인라인 전개) */\n`
      + expandCssImports(target, seen)
      + `\n/* <<< @import ${rel} */`;
  });
}

// Issue155: <X>.ppt.md 파생본이 존재하면 같은 base 이름의 <X>.md를 후보에서 제외.
// layout-selector agent가 생성한 .ppt.md를 m2slide 빌드 입력으로 우선 사용.
function _preferPptMd(files) {
  const pptBases = new Set();
  for (const f of files) {
    if (f.endsWith('.ppt.md')) {
      pptBases.add(f.slice(0, -'.ppt.md'.length));
    }
  }
  return files.filter(f => {
    if (f.endsWith('.ppt.md')) return true;
    const base = f.slice(0, -'.md'.length);
    return !pptBases.has(base);
  });
}

// Issue292: LICENSE.md CC BY 4.0 조건 — 첫 장·마지막 장 표기 자동 삽입.
// 설계 SSOT: _doc_arch/license-attribution.md §1(대상 판정)·§2(뱃지 마크업)·§5(자동 보정 로직)
const LICENSE_BADGE_HTML = '<div class="m2-license-badge" data-m2-license="true">Powered by finfra.kr, Made by m2slide</div>';

function injectLicenseBadge(htmlPath, position) {
  if (!fs.existsSync(htmlPath)) {
    console.error(`❌ license badge 삽입 실패 — 대상 파일 없음: ${htmlPath}`);
    return false;
  }
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const slidesIdx = html.indexOf('<div class="slides">');

  // Case A: reveal.js 덱(<div class="slides"><section>...) — 첫/마지막 top-level section에 삽입
  if (slidesIdx !== -1) {
    const head = html.slice(0, slidesIdx);
    const body = html.slice(slidesIdx);
    // Issue112 countTopSections와 동일 가정(vertical slides 미사용) — top-level <section 시작 위치 전부 수집
    const sectionStarts = [];
    const re = /<section\b/g;
    let m;
    while ((m = re.exec(body))) sectionStarts.push(m.index);
    if (sectionStarts.length === 0) {
      console.error(`❌ license badge 삽입 실패 — <section> 미발견: ${htmlPath}`);
      return false;
    }
    const targetStart = position === 'first' ? sectionStarts[0] : sectionStarts[sectionStarts.length - 1];
    const tagEnd = body.indexOf('>', targetStart);
    if (tagEnd === -1) {
      console.error(`❌ license badge 삽입 실패 — section 여는 태그 파싱 실패: ${htmlPath}`);
      return false;
    }
    const nextSectionStart = sectionStarts.find(s => s > targetStart);
    const sectionSlice = body.slice(targetStart, nextSectionStart === undefined ? body.length : nextSectionStart);
    if (sectionSlice.includes('data-m2-license="true"')) {
      return true; // 이미 삽입되어 있음 (동일 section이 first/last 양쪽에 해당하는 1-슬라이드 데크 등)
    }
    const newHtml = head + body.slice(0, tagEnd + 1) + LICENSE_BADGE_HTML + body.slice(tagEnd + 1);
    fs.writeFileSync(htmlPath, newHtml, 'utf-8');
    return true;
  }

  // Case B: standalone 페이지(agenda.html 등 — reveal.js 미사용, section 구조 없음) — 1회만 삽입
  // .agenda-frame(position:relative, ratio-fit 박스)이 있으면 그 첫 자식으로(상대 위치 앵커 확보),
  // 없으면 <body> 직후로 fallback.
  if (html.includes('data-m2-license="true"')) {
    return true; // 이미 삽입됨
  }
  const frameMatch = html.match(/<div class="agenda-frame"[^>]*>/);
  const anchorMatch = frameMatch || html.match(/<body[^>]*>/);
  if (!anchorMatch) {
    console.error(`❌ license badge 삽입 실패 — <div class="slides">·.agenda-frame·<body> 모두 미발견: ${htmlPath}`);
    return false;
  }
  const insertAt = anchorMatch.index + anchorMatch[0].length;
  const badgeClass = frameMatch ? 'm2-license-badge m2-license-badge--frame' : 'm2-license-badge m2-license-badge--standalone';
  const newHtml = html.slice(0, insertAt) + `<div class="${badgeClass}" data-m2-license="true">Powered by finfra.kr, Made by m2slide</div>` + html.slice(insertAt);
  fs.writeFileSync(htmlPath, newHtml, 'utf-8');
  return true;
}

// 삽입 후 자체 검증 — 조용한 누락 금지 (설계 §5)
function verifyLicenseBadge(htmlPath, position) {
  if (!fs.existsSync(htmlPath)) return;
  const html = fs.readFileSync(htmlPath, 'utf-8');
  if (!html.includes('data-m2-license="true"')) {
    console.error(`❌ license badge 검증 실패 — ${position} 위치에 뱃지 없음: ${htmlPath}`);
  }
}

function main() {
  const args = process.argv.slice(2);
  let inputDir, outputDir, projectDir;

  if (args.length === 0) {
    let currentProject = 'LlmAndVibeCoding';
    const orgPath = path.join(ROOT_DIR, '_config.org.yml');
    if (fs.existsSync(orgPath)) {
      const raw = fs.readFileSync(orgPath, 'utf-8');
      const m = raw.match(/^current_project:\s*(.+)$/m);
      if (m) currentProject = m[1].split('#')[0].trim();
    }
    projectDir = path.join(ROOT_DIR, 'Projects', currentProject);
  } else if (args.length === 1) {
    const argPath = path.resolve(args[0]);
    const baseName = path.basename(argPath);
    if (baseName === 'markdown' || baseName === 'slide') {
      projectDir = path.dirname(argPath);
    } else {
      projectDir = argPath;
    }
  } else {
    inputDir = path.resolve(args[0]);
    outputDir = path.resolve(args[1]);
    projectDir = path.dirname(inputDir);
  }

  const cfg = createDefaultConfig();
  loadConfig(projectDir, cfg);
  loadLayoutTemplates(cfg.themeName || 'default', cfg);
  configure(cfg);

  if (!inputDir) {
    const markdownDir = path.join(projectDir, 'markdown');
    inputDir = fs.existsSync(markdownDir) ? markdownDir : projectDir;
  }
  if (!outputDir) {
    outputDir = path.join(projectDir, 'slide');
  }

  // Issue79: 메타데이터는 슬라이드 소스 frontmatter에서 추출 (inputDir 결정 후 호출)
  loadProjectMeta(projectDir, inputDir, cfg);

  console.log(`Project directory: ${projectDir}`);
  console.log(`Input directory: ${inputDir}`);
  console.log(`Output directory: ${outputDir}`);

  if (!fs.existsSync(inputDir)) {
    console.error(`❌ Error: Input directory does not exist: ${inputDir}`);
    process.exit(1);
  }
  if (!fs.existsSync(outputDir)) {
    console.log(`Creating output directory: ${outputDir}`);
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Copy img, video, theme-img assets
  // chapter mode(inputDir != projectDir)는 projectDir/img·video도 자동 복사 (ppt2m2slide 산출 정책 일치).
  // markdown/img·video가 우선 — 동일 키 후위 항목은 fs.rmSync 후 재복사되어 markdown 산출이 보존됨.
  // 그래서 projectDir 원천을 먼저 두고 inputDir(markdown) 원천을 뒤에 두어 markdown 우선 정책 유지.
  const assetSources = [];
  if (path.resolve(projectDir) !== path.resolve(inputDir)) {
    assetSources.push([path.join(projectDir, 'img'), path.join(outputDir, 'img')]);
    assetSources.push([path.join(projectDir, 'video'), path.join(outputDir, 'video')]);
  }
  assetSources.push([path.join(inputDir, 'img'), path.join(outputDir, 'img')]);
  assetSources.push([path.join(inputDir, 'video'), path.join(outputDir, 'video')]);
  assetSources.push([path.join(ROOT_DIR, 'theme', cfg.themeName || 'default', 'img'), path.join(outputDir, 'theme-img')]);

  const mergedDsts = new Set();
  for (const [src, dst] of assetSources) {
    if (!fs.existsSync(src)) continue;
    console.log(`\nCopying ${path.basename(src)} from ${src} to ${dst}`);
    if (mergedDsts.has(dst)) {
      // 이미 dst에 다른 원천이 복사됨 — 병합(merge): rmSync 생략, 동일 키는 markdown 원천이 덮어씀
      fs.cpSync(src, dst, { recursive: true, force: true });
    } else {
      if (fs.existsSync(dst)) fs.rmSync(dst, { recursive: true, force: true });
      fs.cpSync(src, dst, { recursive: true });
      mergedDsts.add(dst);
    }
    console.log(`✅ ${path.basename(src)} copied successfully`);
  }

  // Issue126: 글로벌 배경 자산 복사 (image/video) — slide/bg/{filename}
  if ((cfg.backgroundType === 'image' || cfg.backgroundType === 'video') && cfg.backgroundFilename) {
    const bgSrc = path.isAbsolute(cfg.background)
      ? cfg.background
      : path.join(projectDir, cfg.background);
    if (fs.existsSync(bgSrc)) {
      const bgOutputDir = path.join(outputDir, 'bg');
      if (!fs.existsSync(bgOutputDir)) fs.mkdirSync(bgOutputDir, { recursive: true });
      const bgDest = path.join(bgOutputDir, cfg.backgroundFilename);
      fs.copyFileSync(bgSrc, bgDest);
      console.log(`✅ Copied background ${cfg.backgroundType}: ${bgSrc} → ${bgDest}`);
    } else {
      console.warn(`⚠️ Warning: background file not found: ${bgSrc} — 무시`);
      cfg.backgroundType = 'none';
      cfg.backgroundFilename = null;
    }
  }

  // Copy CSS + update cfg.slideCssRel
  if (cfg.slideCssRel) {
    const cssAbsPath = path.isAbsolute(cfg.slideCssRel)
      ? cfg.slideCssRel
      : path.join(cfg.configBaseDir, cfg.slideCssRel);
    if (fs.existsSync(cssAbsPath)) {
      const cssOutputDir = path.join(outputDir, 'css');
      if (!fs.existsSync(cssOutputDir)) fs.mkdirSync(cssOutputDir, { recursive: true });
      const cssDestPath = path.join(cssOutputDir, 'custom.css');
      fs.writeFileSync(cssDestPath, expandCssImports(cssAbsPath), 'utf-8');
      console.log(`✅ Built custom CSS (@import 전개) → ${cssDestPath}`);
      cfg.slideCssRel = cssDestPath;
    } else {
      console.warn(`⚠️ Warning: Custom CSS file not found: ${cssAbsPath}`);
    }
  }

  // Copy local fonts + update cfg.styleConfig.style.global.fontImport
  if (cfg.styleConfig.style.global.fontImport && cfg.styleConfig.style.global.fontImport.length > 0) {
    const newImports = [];
    const cssOutputDir = path.join(outputDir, 'css');
    let cssDirCreated = fs.existsSync(cssOutputDir);
    cfg.styleConfig.style.global.fontImport.forEach(importPath => {
      if (importPath.match(/^https?:/i) || importPath.startsWith('//')) {
        newImports.push(importPath);
      } else {
        const fontAbsPath = path.resolve(ROOT_DIR, importPath);
        if (fs.existsSync(fontAbsPath)) {
          if (!cssDirCreated) { fs.mkdirSync(cssOutputDir, { recursive: true }); cssDirCreated = true; }
          const fontDestPath = path.join(cssOutputDir, path.basename(fontAbsPath));
          fs.copyFileSync(fontAbsPath, fontDestPath);
          console.log(`✅ Copied local font/css to ${fontDestPath}`);
          newImports.push(`css/${path.basename(fontAbsPath)}`);
        } else {
          console.warn(`⚠️ Warning: Local font file not found: ${fontAbsPath}`);
          newImports.push(importPath);
        }
      }
    });
    cfg.styleConfig.style.global.fontImport = newImports;
  }

  const agendaPath = path.join(inputDir, 'AGENDA.md');
  const hasAgenda = fs.existsSync(agendaPath);
  let filesToProcess = [];

  if (hasAgenda) {
    console.log('\n📖 Chapter Mode detected (AGENDA.md found)');
    // Issue155: <X>.ppt.md 있으면 <X>.md 대체 (layout-selector agent 파생본 우선)
    filesToProcess = _preferPptMd(
      fs.readdirSync(inputDir)
        // Issue256: `{stem}_note.md`는 발표자 노트 소스 자산 — 별도 챕터로 렌더하지 않음
        .filter(f => f.endsWith('.md') && f !== 'AGENDA.md' && !f.endsWith('_note.md'))
        .sort()
    );
  } else {
    console.log('\n📄 Single Page Mode detected (No AGENDA.md)');
    // Issue155: <X>.ppt.md 있으면 <X>.md 대체
    // Issue256: `{stem}_note.md`는 발표자 노트 소스 자산 — 별도 챕터로 렌더하지 않음
    const files = _preferPptMd(fs.readdirSync(inputDir).filter(f => f.endsWith('.md') && !f.endsWith('_note.md')));
    const projectName = path.basename(projectDir);
    // Issue155 fix: .ppt.md 파생본도 projectFile로 인식
    const projectFile = files.find(f =>
      f.toLowerCase() === (projectName + '.md').toLowerCase() ||
      f.toLowerCase() === (projectName + '.ppt.md').toLowerCase()
    );
    const readmeFile = files.find(f => f.toLowerCase() === 'readme.md');
    const normalFiles = files.filter(f => /^[a-zA-Z0-9가-힣]/.test(f));
    let targetFile = null;
    if (projectFile) {
      console.log(`Selected by Priority 1 (Project Name): ${projectFile}`);
      targetFile = projectFile;
    } else if (readmeFile) {
      console.log(`Selected by Priority 2 (README.md): ${readmeFile}`);
      targetFile = readmeFile;
    } else if (files.length === 1) {
      console.log(`Selected by Priority 3 (Single File): ${files[0]}`);
      targetFile = files[0];
    } else if (normalFiles.length === 1) {
      console.log(`Selected by Priority 4 (Single Normal File): ${normalFiles[0]}`);
      targetFile = normalFiles[0];
    } else if (normalFiles.length > 1) {
      console.error(`❌ Error: Multiple candidate files found: ${normalFiles.join(', ')}`);
      console.error(`Please rename one to ${projectName}.md or leave only one main file.`);
      process.exit(1);
    } else {
      console.error(`❌ Error: No suitable markdown file found in ${inputDir}`);
      process.exit(1);
    }
    filesToProcess = [targetFile];
  }

  console.log(`\nFound ${filesToProcess.length} markdown file(s) to process`);

  if (filesToProcess.length === 0) {
    console.error(`\n❌ Error: No chapter markdown files found in ${inputDir}`);
    console.error(`  AGENDA.md exists but no chapter .md files (e.g. 01-foo.md, 02-bar.md) present.`);
    console.error(`  Add chapter md files referenced in AGENDA.md, or remove AGENDA.md for single mode.`);
    process.exit(1);
  }

  filesToProcess.forEach((file, idx) => {
    const inputPath = path.join(inputDir, file);
    const isFirstFile = idx === 0;
    // Issue218: .ppt.md 파생본도 원본 base 이름으로 출력 (agenda.html 링크는 원본 .md 기준)
    const outputName = (!hasAgenda) ? 'index.html' : file.replace(/(\.ppt)?\.md$/, '.html');
    const outputPath = path.join(outputDir, outputName);
    console.log(`Processing: ${file}`);
    const html = generateHTML(inputPath, hasAgenda ? agendaPath : null, outputDir, !hasAgenda && isFirstFile);
    fs.writeFileSync(outputPath, html, 'utf-8');
    console.log(`  → Generated: ${outputPath}`);
  });

  // agenda.html (both modes) — agenda_enabled=false면 skip
  const firstMdPath = path.join(inputDir, filesToProcess[0]);
  let agendaTitle = '';
  let agendaTocData;
  if (hasAgenda) {
    agendaTocData = parseAgenda(agendaPath);
    // Format A (`# Plain Title` + `## [..](..)`)와 Format B (frontmatter title + `# [..](..)`) 모두 지원
    agendaTitle = getAgendaTitle(agendaPath, path.basename(projectDir));
  } else {
    agendaTocData = generateTOCFromFile(firstMdPath, null);
    const rewriteSingleLinks = (node) => {
      if (node.content && typeof node.content === 'string') {
        node.content = node.content.replace(/href="#\//g, 'href="index.html#/');
      }
      if (node.children) node.children.forEach(rewriteSingleLinks);
    };
    rewriteSingleLinks(agendaTocData);
    const fileRaw = fs.readFileSync(firstMdPath, 'utf-8');
    // leading frontmatter 블록만 파싱 (본문 코드블록 title: 오매칭 방지, 2026-07-02)
    const fmBlock = /^---\r?\n/.test(fileRaw) ? (fileRaw.match(/^---\r?\n([\s\S]*?)\r?\n---/) || [, ''])[1] : '';
    const fmMatch = fmBlock.match(/^title:\s*(.+)$/m);
    agendaTitle = fmMatch
      ? fmMatch[1].trim().replace(/^(['"])([\s\S]*)\1$/, '$2')
      : (fileRaw.match(/^# (.+)$/m) || [, path.basename(firstMdPath, '.md')])[1].trim();
  }
  cfg.projectDownloadsHTML = buildDownloadButtonsHTML(projectDir);
  // Issue87: ⇟ PgDown용 마지막 챕터 (Single mode은 '')
  const lastChapter = hasAgenda ? getLastChapter(agendaPath) : '';
  const mode = hasAgenda ? 'chapter' : 'single';
  if (cfg.agendaEnabled) {
    console.log('\nGenerating agenda.html...');
    // Issue113: agenda 페이지 헤더 타이틀 우선순위
    //   AGENDA.md frontmatter `agenda_title:` > _config.yml `agenda_title:` > 'Agenda'
    // 단일 모드는 firstMdPath frontmatter도 동일하게 인정.
    const agendaPageTitle = (hasAgenda
      ? getAgendaPageTitleFromMd(agendaPath)
      : getAgendaPageTitleFromMd(firstMdPath)
    ) || cfg.agendaTitle || 'Agenda';
    const agendaHTML = generateAgendaHTML({ projectDir, agendaTitle: agendaPageTitle, documentTitle: agendaTitle, tocData: agendaTocData, slideCssRel: cfg.slideCssRel, outputDir, lastChapter, mode, coverEnabled: cfg.coverEnabled });
    const agendaOutputPath = path.join(outputDir, 'agenda.html');
    fs.writeFileSync(agendaOutputPath, agendaHTML, 'utf-8');
    console.log(`✅ Generated: ${agendaOutputPath}`);
  } else {
    console.log('\nSkipping agenda.html (agenda_enabled=false)');
  }

  // index.html (chapter mode only — single mode: already generated above)
  if (hasAgenda) {
    const indexPath = path.join(outputDir, 'index.html');
    if (cfg.coverEnabled) {
      console.log('\nWriting index.html as cover page (cover_enabled=true)...');
      // Issue243: agenda_enabled=false 시 cover→첫 챕터 forward target 주입
      const firstChapterFile = filesToProcess[0] ? filesToProcess[0].replace(/\.md$/, '.html') : '';
      fs.writeFileSync(indexPath, generateCoverHTML({ title: agendaTitle, slideCssRel: cfg.slideCssRel, outputDir, lastChapter, mode, agendaEnabled: cfg.agendaEnabled, firstChapter: firstChapterFile }), 'utf-8');
      console.log(`✅ Cover page: ${indexPath}`);
    } else {
      // agenda 비활성 시 첫 챕터로 redirect (agenda.html 없으므로)
      const redirectTarget = cfg.agendaEnabled ? 'agenda.html' : filesToProcess[0].replace(/\.md$/, '.html');
      console.log(`\nWriting index.html as redirect to ${redirectTarget}...`);
      fs.writeFileSync(indexPath, generateRedirectHTML(redirectTarget), 'utf-8');
      console.log(`✅ Redirect: ${indexPath}`);
    }
  }

  // Issue112: 챕터 모드 + page_number_mode='global' 시 chapterMeta 주입 (2차 패스)
  //   1차 패스(위)에서 빌드된 각 챕터 HTML의 top-level <section> 개수를 합산하여
  //   {chapterNum, slideOffset, totalSlides} 메타를 placeholder에 치환 주입.
  //   1차 패스에서는 placeholder가 null로 남아 있어 'c/t' 형식이 유지됨.
  if (hasAgenda && cfg.pageNumberMode === 'global') {
    console.log('\n🔢 Issue112: Injecting global page-number meta...');
    const chapterNumMap = getChapterNumberMap(agendaPath);
    // 빌드된 챕터 HTML의 top-level <section> 카운트
    // .reveal > .slides 직속 <section>만 셈 (vertical slides는 nested로 들어가지만 m2slide는 미사용)
    function countTopSections(htmlPath) {
      const html = fs.readFileSync(htmlPath, 'utf-8');
      // Issue: 이전 구현은 non-greedy `<div class="slides">([\s\S]*?)</div>\s*</div>` 로
      // 슬라이드 영역을 캡처했으나, 슬라이드 내부 contents-body 의 nested div 가 `</div></div>`
      // 패턴을 먼저 만족시켜 첫 슬라이드만 잡고 종료 → 챕터당 section 수가 항상 2 로 잘못 집계됨.
      // (5챕터 × 2 = totalSlides 10, slideOffset 0/2/4/6/8 회귀 발생)
      // 본 빌드에서 `<section` 토큰은 .reveal > .slides 직속 슬라이드에만 출현하므로
      // `<div class="slides">` 이후 영역에서 단순 카운트 (vertical slides 미사용 전제).
      const slidesIdx = html.indexOf('<div class="slides">');
      if (slidesIdx === -1) return 0;
      const after = html.slice(slidesIdx);
      const matches = after.match(/<section\b/g);
      return matches ? matches.length : 0;
    }
    // Issue218: .ppt.md 파생본도 원본 base 이름으로 매핑
    const orderedChapters = filesToProcess.map(f => f.replace(/(\.ppt)?\.md$/, '.html'));
    const chapterCounts = {};
    let total = 0;
    for (const html of orderedChapters) {
      const fullPath = path.join(outputDir, html);
      if (!fs.existsSync(fullPath)) continue;
      const cnt = countTopSections(fullPath);
      chapterCounts[html] = { offset: total, count: cnt };
      total += cnt;
    }
    console.log(`  Total slides across chapters: ${total}`);
    // 각 챕터 HTML에 chapterMeta 주입
    for (const html of orderedChapters) {
      const fullPath = path.join(outputDir, html);
      if (!fs.existsSync(fullPath)) continue;
      const meta = {
        mode: 'global',
        breadcrumb: cfg.breadcrumb !== false,
        chapterNum: chapterNumMap[html] || '',
        slideOffset: chapterCounts[html].offset,
        totalSlides: total
      };
      const json = JSON.stringify(meta);
      let raw = fs.readFileSync(fullPath, 'utf-8');
      const before = raw;
      raw = raw.replace(
        /window\.M2_CHAPTER_META=null;\/\*M2_CHAPTER_META_PLACEHOLDER\*\//,
        `window.M2_CHAPTER_META=${json};`
      );
      if (raw !== before) {
        fs.writeFileSync(fullPath, raw, 'utf-8');
        console.log(`  ✅ ${html}: chapter ${meta.chapterNum || '-'} @ offset ${meta.slideOffset} (${chapterCounts[html].count} slides)`);
      } else {
        console.warn(`  ⚠️ ${html}: placeholder not found, skipped`);
      }
    }
  }

  // Issue292: 라이선스 표기(첫 장·마지막 장) 자동 삽입 — 설계: _doc_arch/license-attribution.md
  if (cfg.licenseAttribution !== false) {
    console.log('\n©️ Injecting license attribution badge (first & last slide)...');
    const lastChapterHtml = hasAgenda
      ? filesToProcess[filesToProcess.length - 1].replace(/(\.ppt)?\.md$/, '.html')
      : 'index.html';
    let firstTargetHtml;
    if (!hasAgenda) {
      firstTargetHtml = 'index.html';
    } else if (cfg.coverEnabled) {
      firstTargetHtml = 'index.html';
    } else if (cfg.agendaEnabled) {
      firstTargetHtml = 'agenda.html';
    } else {
      firstTargetHtml = filesToProcess[0].replace(/(\.ppt)?\.md$/, '.html');
    }
    const firstPath = path.join(outputDir, firstTargetHtml);
    const lastPath = path.join(outputDir, lastChapterHtml);
    injectLicenseBadge(firstPath, 'first');
    injectLicenseBadge(lastPath, 'last');
    verifyLicenseBadge(firstPath, 'first');
    verifyLicenseBadge(lastPath, 'last');
  }

  // Issue270: 오프라인 self-contained — CDN URL → ./vendor 로컬 자산 치환 (assetMode='vendor')
  if ((cfg.assetMode || 'vendor') !== 'cdn') {
    applyVendor(outputDir);
  }

  console.log('\n✅ All files processed!');
}

main();
