'use strict';

// Issue141: head_left/head_right 옵션 파싱 테스트
// 실행: node --test lib/__tests__/config.test.js

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createDefaultConfig, applyConfig } = require('../config');

test('config: head_left/head_right 디폴트', () => {
  const def = createDefaultConfig();
  assert.strictEqual(def.styleConfig.head_left, 'd1');
  assert.strictEqual(def.styleConfig.head_right, 'now');
});

test('config: d{N} 명시', () => {
  const c = createDefaultConfig();
  applyConfig('head_left: d2\nhead_right: d5\n', c);
  assert.strictEqual(c.styleConfig.head_left, 'd2');
  assert.strictEqual(c.styleConfig.head_right, 'd5');
});

test('config: none + now', () => {
  const c = createDefaultConfig();
  applyConfig('head_left: none\nhead_right: now\n', c);
  assert.strictEqual(c.styleConfig.head_left, 'none');
  assert.strictEqual(c.styleConfig.head_right, 'now');
});

test('config: 잘못된 값 → fallback', () => {
  const c = createDefaultConfig();
  applyConfig('head_left: invalid\nhead_right: d0\n', c);
  assert.strictEqual(c.styleConfig.head_left, 'd1');
  assert.strictEqual(c.styleConfig.head_right, 'now');
});

test('config: head_breadcum 파싱 (true/false/디폴트/잘못된값)', () => {
  // 디폴트 = true
  const def = createDefaultConfig();
  assert.strictEqual(def.styleConfig.head_breadcum, true);
  // 명시 false
  const c1 = createDefaultConfig();
  applyConfig('head_breadcum: false\n', c1);
  assert.strictEqual(c1.styleConfig.head_breadcum, false);
  // yes/no 동의어
  const c2 = createDefaultConfig();
  applyConfig('head_breadcum: yes\n', c2);
  assert.strictEqual(c2.styleConfig.head_breadcum, true);
  const c3 = createDefaultConfig();
  applyConfig('head_breadcum: no\n', c3);
  assert.strictEqual(c3.styleConfig.head_breadcum, false);
  // 잘못된 값 → default true
  const c4 = createDefaultConfig();
  applyConfig('head_breadcum: maybe\n', c4);
  assert.strictEqual(c4.styleConfig.head_breadcum, true);
});
