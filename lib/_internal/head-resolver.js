'use strict';

// Issue141: _contents layout head_left/head_right 옵션 → outline 텍스트 매핑 순수 함수
// 영속 설계 SSOT: _doc_design/head.md

const HEAD_SEPARATOR = ' > ';

// option, otherOption: 'd{N}' | 'now' | 'none'
// outlinePath: ['d1 title', 'd2 title', ..., 'd{currentDepth} title']
// 반환: 표시 텍스트 (빈 문자열 가능)
function _resolveHeadSlot(option, otherOption, outlinePath, separator) {
  if (!outlinePath || outlinePath.length === 0) return '';
  if (option === 'none') return '';
  // d{N} 절대 depth
  const dMatch = /^d([1-9][0-9]?)$/.exec(option);
  if (dMatch) {
    const n = parseInt(dMatch[1], 10);
    return (n >= 1 && n <= outlinePath.length) ? outlinePath[n - 1] : '';
  }
  // now: breadcrumb 범위 결정
  if (option === 'now') {
    let startIdx = 0; // 0-based: d1 = 0
    const otherDMatch = /^d([1-9][0-9]?)$/.exec(otherOption || '');
    if (otherDMatch) startIdx = parseInt(otherDMatch[1], 10); // d{m} 다음(m+1)부터 → 0-based m
    if (startIdx >= outlinePath.length) return '';
    return outlinePath.slice(startIdx).join(separator);
  }
  return '';
}

module.exports = { _resolveHeadSlot, HEAD_SEPARATOR };
