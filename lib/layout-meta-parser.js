'use strict';

const fs = require('fs');
const path = require('path');

// Issue154: layout HTML 파일의 <!-- @meta ... --> frontmatter 파싱.
// m2slide는 zero-dep 정책이므로 외부 YAML 라이브러리 없이 제한된 schema만 처리:
//   - description: <inline string>
//   - recommended_for: <YAML list>
//   - not_recommended_for: <YAML list>
//   - slots: <YAML list>
//   - example: |
//       <multiline literal block>
//
// 입력 HTML에 @meta 블록이 없으면 null 반환 (silent fallback, 회귀 안전).
// YAML 본문 파싱 오류 시 throw (lint 단계에서 잡음).

const META_BLOCK_RE = /<!--\s*@meta\s*\n([\s\S]*?)\n\s*-->/;

const META_REQUIRED_FIELDS = ['description', 'recommended_for', 'slots'];
const META_KNOWN_FIELDS = new Set([
  'description',
  'recommended_for',
  'not_recommended_for',
  'slots',
  'example',
]);

function parseLayoutMeta(htmlContent) {
  const m = htmlContent.match(META_BLOCK_RE);
  if (!m) return null;
  const body = m[1];
  return _parseMiniYaml(body);
}

function _parseMiniYaml(body) {
  const lines = body.split('\n');
  const out = {};
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line) || /^\s*#/.test(line)) {
      i++;
      continue;
    }

    const kv = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!kv) {
      throw new Error(`@meta YAML parse error at line ${i + 1}: ${line}`);
    }

    const key = kv[1];
    const inlineVal = kv[2].trim();

    if (!META_KNOWN_FIELDS.has(key)) {
      throw new Error(`@meta unknown field: ${key}`);
    }

    if (inlineVal === '|') {
      const [block, nextI] = _readLiteralBlock(lines, i + 1);
      out[key] = block;
      i = nextI;
      continue;
    }

    if (inlineVal === '') {
      const [list, nextI] = _readList(lines, i + 1);
      out[key] = list;
      i = nextI;
      continue;
    }

    out[key] = _stripQuotes(inlineVal);
    i++;
  }

  for (const f of META_REQUIRED_FIELDS) {
    if (!(f in out)) {
      throw new Error(`@meta missing required field: ${f}`);
    }
  }

  return out;
}

function _readList(lines, startI) {
  const items = [];
  let i = startI;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) {
      i++;
      continue;
    }
    const m = line.match(/^\s+-\s+(.+)$/);
    if (!m) break;
    items.push(_stripQuotes(m[1].trim()));
    i++;
  }
  return [items, i];
}

function _readLiteralBlock(lines, startI) {
  let baseIndent = null;
  const out = [];
  let i = startI;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) {
      out.push('');
      i++;
      continue;
    }
    const indent = line.match(/^(\s*)/)[1].length;
    if (baseIndent === null) {
      if (indent === 0) break;
      baseIndent = indent;
    }
    if (indent < baseIndent) break;
    out.push(line.slice(baseIndent));
    i++;
  }
  while (out.length && out[out.length - 1] === '') out.pop();
  return [out.join('\n'), i];
}

function _stripQuotes(v) {
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

function loadAllLayouts(themeDir) {
  if (!fs.existsSync(themeDir)) return [];
  const layoutsDir = path.join(themeDir, 'layouts');
  if (!fs.existsSync(layoutsDir)) return [];

  const out = [];
  const files = fs.readdirSync(layoutsDir).filter((f) => f.endsWith('.html'));
  for (const file of files) {
    const fullPath = path.join(layoutsDir, file);
    const name = _layoutNameFromFile(file);
    let meta = null;
    let parseError = null;
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      meta = parseLayoutMeta(content);
    } catch (e) {
      parseError = e.message;
      process.stderr.write(`⚠️ ${fullPath}: ${e.message}\n`);
    }
    out.push({ name, file: fullPath, meta, parseError });
  }
  return out;
}

function _layoutNameFromFile(filename) {
  const base = filename.replace(/\.html$/, '');
  const numbered = base.match(/^\d+\.\d+\.(.+)$/);
  return numbered ? numbered[1] : base;
}

module.exports = {
  parseLayoutMeta,
  loadAllLayouts,
  META_REQUIRED_FIELDS,
  META_KNOWN_FIELDS,
};
