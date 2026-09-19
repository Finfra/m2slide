'use strict';

// Issue141: _contents layout head_left/head_right 옵션 → outline 텍스트 매핑 순수 함수
// 영속 설계 SSOT: _doc_design/head.md

const HEAD_SEPARATOR = ' > ';

// Issue378: 슬롯 텍스트 선두의 일차 접두(`N-`)를 렌더 시점에만 떼는 순수 함수
// mode: 'full'(기본·무변경) | 'short'
//   short 는 **뒤에 숫자가 이어지는 `숫자-` 한 번만** 제거한다.
//   `1-5. 닫는 절` → `5. 닫는 절` · `4.2.1. …`(점 형식) 과 `1-` 로 시작하지 않는 텍스트는 무변경.
//   원고의 `## 1-5.` 번호는 AGENDA·PRACTICE·DESIGN 이 참조하는 공용 식별자라 소스에서 뗄 수 없다.
function _stripHeadNumber(text, mode) {
  if (mode !== 'short' || typeof text !== 'string' || !text) return text;
  return text.replace(/^\d+-(?=\d)/, '');
}

// option, otherOption: 'd{N}' | 'now' | 'none'
// outlinePath: ['d1 title', 'd2 title', ..., 'd{currentDepth} title']
// headBreadcum: master toggle (default true). false 시 now → 빈 (전역 비활성화)
// headNumber: 'full'(기본) | 'short' — now breadcrumb 은 **세그먼트마다 개별 적용**
// 반환: 표시 텍스트 (빈 문자열 가능)
function _resolveHeadSlot(option, otherOption, outlinePath, separator, headBreadcum, headNumber) {
  if (headBreadcum === undefined) headBreadcum = true;
  if (headNumber === undefined) headNumber = 'full';
  if (!outlinePath || outlinePath.length === 0) return '';
  if (option === 'none') return '';
  // d{N} 절대 depth (head_breadcum 무관 — 단일 항목)
  const dMatch = /^d([1-9][0-9]?)$/.exec(option);
  if (dMatch) {
    const n = parseInt(dMatch[1], 10);
    return (n >= 1 && n <= outlinePath.length) ? _stripHeadNumber(outlinePath[n - 1], headNumber) : '';
  }
  // now: breadcrumb (head_breadcum=false면 전역 비활성)
  if (option === 'now') {
    if (!headBreadcum) return '';
    let startIdx = 0; // 0-based: d1 = 0
    const otherDMatch = /^d([1-9][0-9]?)$/.exec(otherOption || '');
    if (otherDMatch) startIdx = parseInt(otherDMatch[1], 10); // d{m} 다음(m+1)부터 → 0-based m
    if (startIdx >= outlinePath.length) return '';
    return outlinePath.slice(startIdx).map((s) => _stripHeadNumber(s, headNumber)).join(separator);
  }
  return '';
}

module.exports = { _resolveHeadSlot, _stripHeadNumber, HEAD_SEPARATOR };
