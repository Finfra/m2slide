#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const { createDefaultConfig, loadConfig, loadProjectMeta, buildDownloadButtonsHTML } = require('./config');
const { loadLayoutTemplates } = require('./layout');
const { parseAgenda, getAgendaTitle, getAgendaPageTitleFromMd, getLastChapter, getChapterNumberMap } = require('./agenda');
const { configure, generateTOCFromFile, generateHTML, generateCoverHTML, generateRedirectHTML, generateAgendaHTML } = require('./html-builder');

const ROOT_DIR = path.resolve(__dirname, '..');

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
  for (const [src, dst] of [
    [path.join(inputDir, 'img'), path.join(outputDir, 'img')],
    [path.join(inputDir, 'video'), path.join(outputDir, 'video')],
    [path.join(ROOT_DIR, 'theme', cfg.themeName || 'default', 'img'), path.join(outputDir, 'theme-img')]
  ]) {
    if (fs.existsSync(src)) {
      console.log(`\nCopying ${path.basename(src)} from ${src} to ${dst}`);
      if (fs.existsSync(dst)) fs.rmSync(dst, { recursive: true, force: true });
      fs.cpSync(src, dst, { recursive: true });
      console.log(`✅ ${path.basename(src)} copied successfully`);
    }
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
      fs.copyFileSync(cssAbsPath, cssDestPath);
      console.log(`✅ Copied custom CSS to ${cssDestPath}`);
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
        .filter(f => f.endsWith('.md') && f !== 'AGENDA.md')
        .sort()
    );
  } else {
    console.log('\n📄 Single Page Mode detected (No AGENDA.md)');
    // Issue155: <X>.ppt.md 있으면 <X>.md 대체
    const files = _preferPptMd(fs.readdirSync(inputDir).filter(f => f.endsWith('.md')));
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

  filesToProcess.forEach((file, idx) => {
    const inputPath = path.join(inputDir, file);
    const isFirstFile = idx === 0;
    const outputName = (!hasAgenda) ? 'index.html' : file.replace('.md', '.html');
    const outputPath = path.join(outputDir, outputName);
    console.log(`Processing: ${file}`);
    const html = generateHTML(inputPath, hasAgenda ? agendaPath : null, outputDir, !hasAgenda && isFirstFile);
    fs.writeFileSync(outputPath, html, 'utf-8');
    console.log(`  → Generated: ${outputPath}`);
  });

  // agenda.html (both modes)
  console.log('\nGenerating agenda.html...');
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
    const fmMatch = fileRaw.match(/^---[\s\S]*?^title:\s*(.+)$/m);
    agendaTitle = fmMatch
      ? fmMatch[1].trim()
      : (fileRaw.match(/^# (.+)$/m) || [, path.basename(firstMdPath, '.md')])[1].trim();
  }
  cfg.projectDownloadsHTML = buildDownloadButtonsHTML(projectDir);
  // Issue87: ⇟ PgDown용 마지막 챕터 (Single mode은 '')
  const lastChapter = hasAgenda ? getLastChapter(agendaPath) : '';
  const mode = hasAgenda ? 'chapter' : 'single';
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

  // index.html (chapter mode only — single mode: already generated above)
  if (hasAgenda) {
    const indexPath = path.join(outputDir, 'index.html');
    if (cfg.coverEnabled) {
      console.log('\nWriting index.html as cover page (cover_enabled=true)...');
      fs.writeFileSync(indexPath, generateCoverHTML({ title: agendaTitle, slideCssRel: cfg.slideCssRel, outputDir, lastChapter, mode }), 'utf-8');
      console.log(`✅ Cover page: ${indexPath}`);
    } else {
      console.log('\nWriting index.html as redirect (cover_enabled=false)...');
      fs.writeFileSync(indexPath, generateRedirectHTML('agenda.html'), 'utf-8');
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
      const slidesMatch = html.match(/<div class="slides">([\s\S]*?)<\/div>\s*<\/div>/);
      if (!slidesMatch) return 0;
      const inner = slidesMatch[1];
      // top-level section만: nested 안에 들어간 <section>은 'class="present"' 같은 attrs 다양 → 빌드 시점에는 plain <section ..> 직속만
      // m2slide는 vertical slides 미사용이므로 모든 <section ..>은 top-level
      const matches = inner.match(/<section\b/g);
      return matches ? matches.length : 0;
    }
    const orderedChapters = filesToProcess.map(f => f.replace('.md', '.html'));
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

  console.log('\n✅ All files processed!');
}

main();
