'use strict';

// Issue141: head-resolver 순수 함수 테스트
// 실행: node --test lib/__tests__/head-resolver.test.js

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { _resolveHeadSlot, _stripHeadNumber, HEAD_SEPARATOR } = require('../_internal/head-resolver');

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

// ── Issue378: head_number (full|short) ──────────────────────────────────
test('head-resolver: _stripHeadNumber — short 는 뒤에 숫자가 오는 `N-` 만 1회 제거', () => {
  // 제거 대상 — `숫자-` 뒤에 숫자가 이어진다
  assert.strictEqual(_stripHeadNumber('1-5. 닫는 절 — 1일차 정리', 'short'), '5. 닫는 절 — 1일차 정리');
  assert.strictEqual(_stripHeadNumber('2-0. 여는 절', 'short'), '0. 여는 절');
  assert.strictEqual(_stripHeadNumber('12-3. 열두째 날', 'short'), '3. 열두째 날');
  // 1회만 — 두 번째 `N-` 는 남는다
  assert.strictEqual(_stripHeadNumber('1-2-3. 중첩', 'short'), '2-3. 중첩');
  // 비대상 — 점 형식 · 숫자 아닌 것이 뒤따름 · 번호 없음
  assert.strictEqual(_stripHeadNumber('4.2.1. 리스트', 'short'), '4.2.1. 리스트');
  assert.strictEqual(_stripHeadNumber('1- 대시 뒤 공백', 'short'), '1- 대시 뒤 공백');
  assert.strictEqual(_stripHeadNumber('1일차 — 생성형 AI', 'short'), '1일차 — 생성형 AI');
  assert.strictEqual(_stripHeadNumber('닫는 절', 'short'), '닫는 절');
  // full(기본) · 미지정 → 무변경
  assert.strictEqual(_stripHeadNumber('1-5. 닫는 절', 'full'), '1-5. 닫는 절');
  assert.strictEqual(_stripHeadNumber('1-5. 닫는 절', undefined), '1-5. 닫는 절');
  // 빈 값·비문자열 방어
  assert.strictEqual(_stripHeadNumber('', 'short'), '');
  assert.strictEqual(_stripHeadNumber(null, 'short'), null);
});

test('head-resolver: head_number — d{N} 슬롯과 now breadcrumb 양쪽 적용', () => {
  const SEP = ' > ';
  const path = ['1일차 — 생성형 AI R&D 활용', '1-5. 닫는 절', '1-5-2. 산출물'];
  // full(기본) — 하위호환: 6번째 인자 미지정과 'full' 이 같아야 한다
  assert.strictEqual(_resolveHeadSlot('d2', 'd1', path, SEP, true), '1-5. 닫는 절');
  assert.strictEqual(_resolveHeadSlot('d2', 'd1', path, SEP, true, 'full'), '1-5. 닫는 절');
  // short — d{N} 슬롯
  assert.strictEqual(_resolveHeadSlot('d2', 'd1', path, SEP, true, 'short'), '5. 닫는 절');
  // d1 은 `N-` 형태가 아니라 무변경 (일차 제목)
  assert.strictEqual(_resolveHeadSlot('d1', 'd2', path, SEP, true, 'short'), '1일차 — 생성형 AI R&D 활용');
  // now breadcrumb — 세그먼트마다 개별 적용
  assert.strictEqual(_resolveHeadSlot('now', 'd1', path, SEP, true, 'full'), '1-5. 닫는 절 > 1-5-2. 산출물');
  assert.strictEqual(_resolveHeadSlot('now', 'd1', path, SEP, true, 'short'), '5. 닫는 절 > 5-2. 산출물');
  // head_breadcum=false 는 head_number 와 무관하게 now 를 비운다
  assert.strictEqual(_resolveHeadSlot('now', 'd1', path, SEP, false, 'short'), '');
  // none 도 무관
  assert.strictEqual(_resolveHeadSlot('none', 'd1', path, SEP, true, 'short'), '');
});
