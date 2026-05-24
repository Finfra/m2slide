'use strict';

// htmlart_dispatch — htmlArt 구조 도해 d3 SVG 렌더 클라이언트 훅 (Issue193).
// component-libraries.yml 의 htmlart.init_hook 가 본 모듈을 지정.
//
// 배경: htmlArt 4타입(process/cycle/hierarchy/pyramid)은 순수 CSS 구현이었다.
//   cycle 원형 배치·hierarchy 연결선은 CSS 로 좌표·곡선 계산이 불가능해
//   nth-child 하드코딩(8개 한계)·고정 px·화살표 부재 등 한계가 누적됐다(Issue188~192).
//   → 렌더 백엔드를 d3 SVG 로 전환. 사용자 결정(2026-05-21): 4타입 전부 d3 API 통일.
//   preprocessPandocDiv 가 낸 `data-htmlart` div + 내부 `<ul>` 은 그대로 두고
//   (graceful degradation — JS 미동작 시 list 표시), 본 훅이 reveal ready 후
//   ul 트리를 파싱하여 d3 로 SVG 도해를 생성해 교체한다.
//
// 진행: v1 4 + v2 10 + v3 list 5 + v4 비율·균형 2 = 21타입 전부 d3 SVG 렌더.
//   v4 (pie·balance) — Basic Pie·Pie Process·Balance(미구현 ❌) 흡수.
//   theme `_shared/components.css` 의 타입별 htmlArt CSS 블록은 전부 제거됨
//   (`.m2-htmlart` 공통 컨테이너 — CSS 변수·component-error 만 잔존).
//
// d3 API 사용:
//   - 공통: d3.select(DOM 구성) · d3.range(순회) · d3.scaleLinear(비례)
//   - cycle·radial·arrow: d3.pointRadial(원형 좌표) · d3.path().arc(순환 곡선)
//   - hierarchy: d3.hierarchy + d3.tree(트리 레이아웃) · d3.linkVertical(연결선)
//   - pyramid·funnel: d3.scaleLinear(층 너비 비례)
//   - process·timeline·chevron·step·matrix: 박스/polygon 체인
//   - venn·target·gear: circle/path 도형
//   d3@7.9.0 는 html-builder.js 정적 블록이 무조건 로드. 색상은 .m2-htmlart 가
//   정의한 CSS 변수(--htmlart-accent 등)를 SVG 요소가 상속한다.
// 설계 SSOT: _doc_arch/htmlArt.md / 타입 카탈로그: data/htmlart/types.yml
//   전체 SmartArt 카탈로그·구현 현황: _doc_arch/htmlArt_list.md


// 클라이언트 JS는 별도 파일(.client.js) raw 로드 — template literal이 `\s`·`\d`
// 등 미인식 escape 의 backslash를 strip하는 ECMA 사양 회피 (Issue<N>).
const fs = require('fs');
const path = require('path');
const script = fs.readFileSync(path.join(__dirname, 'htmlart_dispatch.client.js'), 'utf8').trim();

module.exports = { script };
