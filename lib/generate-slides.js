#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const { createDefaultConfig, loadConfig, loadProjectMeta, buildDownloadButtonsHTML } = require('./config');
const { loadLayoutTemplates } = require('./layout');
const { parseAgenda } = require('./agenda');
const { configure, generateTOCFromFile, generateHTML, generateCoverHTML, generateRedirectHTML, generateAgendaHTML } = require('./html-builder');

const ROOT_DIR = path.resolve(__dirname, '..');

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
  loadProjectMeta(projectDir, cfg);
  loadLayoutTemplates(cfg.themeName || 'default', cfg);
  configure(cfg);

  if (!inputDir) {
    const markdownDir = path.join(projectDir, 'markdown');
    inputDir = fs.existsSync(markdownDir) ? markdownDir : projectDir;
  }
  if (!outputDir) {
    outputDir = path.join(projectDir, 'slide');
  }

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
    filesToProcess = fs.readdirSync(inputDir)
      .filter(f => f.endsWith('.md') && f !== 'AGENDA.md')
      .sort();
  } else {
    console.log('\n📄 Single Page Mode detected (No AGENDA.md)');
    const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.md'));
    const projectName = path.basename(projectDir);
    const projectFile = files.find(f => f.toLowerCase() === (projectName + '.md').toLowerCase());
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
    const agendaContent = fs.readFileSync(agendaPath, 'utf-8');
    const titleMatch = agendaContent.match(/^# (.+)$/m);
    agendaTitle = titleMatch ? titleMatch[1] : path.basename(projectDir);
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
  const agendaHTML = generateAgendaHTML({ projectDir, title: agendaTitle, tocData: agendaTocData, slideCssRel: cfg.slideCssRel, outputDir });
  const agendaOutputPath = path.join(outputDir, 'agenda.html');
  fs.writeFileSync(agendaOutputPath, agendaHTML, 'utf-8');
  console.log(`✅ Generated: ${agendaOutputPath}`);

  // index.html (chapter mode only — single mode: already generated above)
  if (hasAgenda) {
    const indexPath = path.join(outputDir, 'index.html');
    if (cfg.coverEnabled) {
      console.log('\nWriting index.html as cover page (cover_enabled=true)...');
      fs.writeFileSync(indexPath, generateCoverHTML({ title: agendaTitle, slideCssRel: cfg.slideCssRel, outputDir }), 'utf-8');
      console.log(`✅ Cover page: ${indexPath}`);
    } else {
      console.log('\nWriting index.html as redirect (cover_enabled=false)...');
      fs.writeFileSync(indexPath, generateRedirectHTML('agenda.html'), 'utf-8');
      console.log(`✅ Redirect: ${indexPath}`);
    }
  }

  console.log('\n✅ All files processed!');
}

main();
