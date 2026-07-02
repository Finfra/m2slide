---
title: 핵심 기능
type: ppt
---

* 4종 출력 형식 + 자동 목차 + 인터랙티브 마인드맵

---

## 출력 형식
#layout-contents

| 형식 | 옵션          | 용도                                   |
| :--- | :------------ | :------------------------------------- |
| HTML | (기본)        | Reveal.js 프레젠테이션 (브라우저 발표) |
| EPUB | `--epub`      | 전자책 (iBooks·Calibre·Google Play)    |
| PDF  | `--pdf`       | 챕터별 합본 PDF (decktape 기반)        |
| PPTX | `--pptx`      | PowerPoint 호환 (pandoc 기반)          |

---

## Reveal.js HTML 프레젠테이션
#layout-contents

* `---` 구분자로 슬라이드 자동 분리
* **Markmap 목차**: 클릭 가능한 인터랙티브 마인드맵 자동 생성
* **계층적 네비게이션**: 메인·하위 챕터 자동 연결, 상위 페이지 버튼
* 반응형 디자인 (데스크톱·모바일 최적화)

---

## EPUB 전자책
#layout-contents

* EPUB 3.0 표준 준수
* AGENDA.md 기반 자동 목차
* **Mermaid 다이어그램**: SVG 이미지로 자동 변환 (mmdc 설치 시)
* 이미지 자동 임베딩

---

## 인터랙티브 요소
#layout-contents

* **Markmap 마인드맵**: 챕터 구조를 시각화한 목차
* **단계별 등장**: `{.fragment}` 인라인 attribute로 fragment 효과
* **슬라이드 단위 디렉티브**: `#transition-zoom`, `#background-image-...` 등
* **자동 layout 감지**: 이미지만 있는 슬라이드는 자동 풀스크린
