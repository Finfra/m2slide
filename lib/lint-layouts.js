#!/usr/bin/env node
'use strict';

// Issue154: layout HTML 파일 @meta frontmatter lint
// 실행: node lib/lint-layouts.js
// rc=0: 모든 layout 메타 valid
// rc=1: 오류 1건 이상 (필수 필드 누락·YAML 오류·알 수 없는 필드)
//
// 메타 없는 layout 파일(@meta 블록 부재)은 경고만 출력하고 통과 (silent fallback policy).

const fs = require('fs');
const path = require('path');
const { parseLayoutMeta, META_REQUIRED_FIELDS } = require('./layout-meta-parser');

const ROOT_DIR = path.resolve(__dirname, '..');
const THEME_DIR = path.join(ROOT_DIR, 'theme');

function main() {
  if (!fs.existsSync(THEME_DIR)) {
    console.error(`❌ theme/ 디렉토리 없음: ${THEME_DIR}`);
    process.exit(1);
  }

  let totalLayouts = 0;
  let layoutsWithMeta = 0;
  let errors = 0;
  let warnings = 0;
  const errorEntries = [];
  const warningEntries = [];

  const themes = fs.readdirSync(THEME_DIR).filter((d) => {
    const layoutsDir = path.join(THEME_DIR, d, 'layouts');
    return fs.existsSync(layoutsDir) && fs.statSync(layoutsDir).isDirectory();
  });

  console.log(`🔍 lint-layouts: ${themes.length}개 theme 스캔`);
  console.log('');

  for (const themeName of themes) {
    const layoutsDir = path.join(THEME_DIR, themeName, 'layouts');
    const files = fs.readdirSync(layoutsDir).filter((f) => f.endsWith('.html'));

    for (const file of files) {
      totalLayouts++;
      const fullPath = path.join(layoutsDir, file);
      const rel = path.relative(ROOT_DIR, fullPath);
      const content = fs.readFileSync(fullPath, 'utf-8');

      let meta;
      try {
        meta = parseLayoutMeta(content);
      } catch (e) {
        errors++;
        errorEntries.push(`✗ ${rel}: ${e.message}`);
        continue;
      }

      if (meta === null) {
        warnings++;
        warningEntries.push(`⚠ ${rel}: @meta 블록 없음 (layout 이름만 사용 — 후속 layout-selector agent 품질 저하 가능)`);
        continue;
      }

      layoutsWithMeta++;
      console.log(`✓ ${rel} (${Object.keys(meta).length} fields)`);
    }
  }

  console.log('');
  console.log(`총 ${totalLayouts}개 layout (메타 보유: ${layoutsWithMeta}, 메타 없음: ${warnings}, 오류: ${errors})`);

  if (warningEntries.length > 0) {
    console.log('');
    console.log('경고 (메타 누락):');
    warningEntries.forEach((w) => console.log(w));
  }

  if (errorEntries.length > 0) {
    console.log('');
    console.log('오류:');
    errorEntries.forEach((e) => console.log(e));
    console.log('');
    console.log(`❌ ${errors}개 오류. 필수 필드: ${META_REQUIRED_FIELDS.join(', ')}`);
    process.exit(1);
  }

  console.log('');
  console.log('✅ 모든 layout @meta 검증 통과 (또는 메타 없음 fallback)');
  process.exit(0);
}

main();
