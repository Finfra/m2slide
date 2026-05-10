'use strict';

// Issue141: head-resolver 순수 함수 테스트
// 실행: node --test lib/__tests__/head-resolver.test.js

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { _resolveHeadSlot, HEAD_SEPARATOR } = require('../_internal/head-resolver');

test('head-resolver: HEAD_SEPARATOR 상수', () => {
  assert.strictEqual(HEAD_SEPARATOR, ' > ');
});

test('head-resolver: 절대 depth + now breadcrumb', () => {
  const path3 = ['1. 도입', '1.1 인사', '1.1.1 자기소개'];
  const SEP = ' > ';
  // 절대 depth
  assert.strictEqual(_resolveHeadSlot('d1', 'now', path3, SEP), '1. 도입');
  assert.strictEqual(_resolveHeadSlot('d2', 'd1', path3, SEP), '1.1 인사');
  assert.strictEqual(_resolveHeadSlot('d3', 'd1', path3, SEP), '1.1.1 자기소개');
  // 범위 초과
  assert.strictEqual(_resolveHeadSlot('d4', 'now', path3, SEP), '');
  assert.strictEqual(_resolveHeadSlot('d99', 'now', path3, SEP), '');
  // none
  assert.strictEqual(_resolveHeadSlot('none', 'd1', path3, SEP), '');
  // now + d{m} → m+1부터
  assert.strictEqual(_resolveHeadSlot('now', 'd1', path3, SEP), '1.1 인사 > 1.1.1 자기소개');
  assert.strictEqual(_resolveHeadSlot('now', 'd2', path3, SEP), '1.1.1 자기소개');
  assert.strictEqual(_resolveHeadSlot('now', 'd3', path3, SEP), '');  // 남은 depth 없음
  // now + none/now → 전체
  assert.strictEqual(_resolveHeadSlot('now', 'none', path3, SEP), '1. 도입 > 1.1 인사 > 1.1.1 자기소개');
  assert.strictEqual(_resolveHeadSlot('now', 'now', path3, SEP), '1. 도입 > 1.1 인사 > 1.1.1 자기소개');
  // outlinePath 빈
  assert.strictEqual(_resolveHeadSlot('d1', 'now', [], SEP), '');
  assert.strictEqual(_resolveHeadSlot('now', 'none', [], SEP), '');
});

test('head-resolver: head_breadcum master toggle', () => {
  const path3 = ['1. 도입', '1.1 인사', '1.1.1 자기소개'];
  const SEP = ' > ';
  // headBreadcum=true (default) — now 동작 (기존 케이스 통과 확인)
  assert.strictEqual(_resolveHeadSlot('now', 'd1', path3, SEP, true), '1.1 인사 > 1.1.1 자기소개');
  // headBreadcum=false — now → 빈 (전역 비활성)
  assert.strictEqual(_resolveHeadSlot('now', 'd1', path3, SEP, false), '');
  assert.strictEqual(_resolveHeadSlot('now', 'none', path3, SEP, false), '');
  assert.strictEqual(_resolveHeadSlot('now', 'now', path3, SEP, false), '');
  // headBreadcum=false라도 d{N} 절대 depth는 정상 동작 (영향 없음)
  assert.strictEqual(_resolveHeadSlot('d1', 'now', path3, SEP, false), '1. 도입');
  assert.strictEqual(_resolveHeadSlot('d2', 'now', path3, SEP, false), '1.1 인사');
  // headBreadcum 미지정 (undefined) → default true
  assert.strictEqual(_resolveHeadSlot('now', 'd1', path3, SEP), '1.1 인사 > 1.1.1 자기소개');
});
