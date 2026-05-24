---
title: m2Slide 소개
subtitle: 마크다운 한 벌로 슬라이드·전자책·PDF·PPTX까지
instructor_name: 남중구 (핀프라)
instructor_contact: nowage@gmail.com
description: m2Slide 도구의 핵심 컨셉과 사용법을 한눈에 정리한 소개 자료
version: 1.0.0
date: May 10, 2026
release_date: 2026-05-11
created_at: 2026-05-10
created_by: nowage
type: ppt
tags: [m2slide, intro, markdown, slide]
---

# 1. m2Slide란?

* 마크다운 → Reveal.js 슬라이드·EPUB·PDF·PPTX 자동 변환 도구
* 프로젝트별 독립 폴더로 다수의 강연·문서 자료 관리

---

## 한 줄 요약

* **마크다운 한 벌로 모든 산출물을 만든다.**
* 슬라이드용 별도 도구·바이너리 포맷 학습 부담 제거
* 강사·작성자는 **콘텐츠**에만 집중하면 됨

---

## 왜 m2Slide인가

* **단일 SSOT**: `.md` 한 파일이 슬라이드·전자책·PDF의 원본
* **Git 친화적**: 텍스트 기반 → diff·리뷰·협업 용이
* **확장 가능**: theme + layout 시스템으로 자유로운 디자인
* **순수 Node.js**: 외부 의존성 거의 없음 (Mermaid·PDF 변환만 옵션)

---

# 2. 핵심 기능

* 4종 출력 형식 + 자동 목차 + 인터랙티브 마인드맵

---

## 출력 형식

| 형식 | 옵션          | 용도                                   |
| :--- | :------------ | :------------------------------------- |
| HTML | (기본)        | Reveal.js 프레젠테이션 (브라우저 발표) |
| EPUB | `--epub`      | 전자책 (iBooks·Calibre·Google Play)    |
| PDF  | `--pdf`       | 챕터별 합본 PDF (decktape 기반)        |
| PPTX | `--pptx`      | PowerPoint 호환 (pandoc 기반)          |

---

## Reveal.js HTML 프레젠테이션

* `---` 구분자로 슬라이드 자동 분리
* **Markmap 목차**: 클릭 가능한 인터랙티브 마인드맵 자동 생성
* **계층적 네비게이션**: 메인·하위 챕터 자동 연결, 상위 페이지 버튼
* 반응형 디자인 (데스크톱·모바일 최적화)

---

## EPUB 전자책

* EPUB 3.0 표준 준수
* AGENDA.md 기반 자동 목차
* **Mermaid 다이어그램**: SVG 이미지로 자동 변환 (mmdc 설치 시)
* 이미지 자동 임베딩

---

## 인터랙티브 요소

* **Markmap 마인드맵**: 챕터 구조를 시각화한 목차
* **단계별 등장**: `{.fragment}` 인라인 attribute로 fragment 효과
* **슬라이드 단위 디렉티브**: `#transition-zoom`, `#background-image-...` 등
* **자동 layout 감지**: 이미지만 있는 슬라이드는 자동 풀스크린

---

# 3. 사용법

* 마크다운 작성 → 한 줄 명령어 → 끝

---

## 동작 모드 두 가지

* **단일 페이지 모드**: `Projects/{이름}/{이름}.md` 한 파일
    - 짧은 발표·요약 자료에 적합
* **챕터 모드**: `Projects/{이름}/markdown/AGENDA.md` + 챕터별 `.md`
    - 긴 강의·다중 섹션 자료에 적합
    - `markdown/` 폴더 안 `AGENDA.md` 존재 여부로 자동 판정

---

## 빌드 명령어

```bash
## HTML 슬라이드 생성
./m2slide.sh m2Slide

## HTML + EPUB 동시 생성
./m2slide.sh m2Slide --epub

## 브라우저로 바로 확인
./run.sh m2Slide
```

---

## 슬라이드 작성 예시

```markdown
---
title: 발표 제목
type: ppt
---

## 첫 슬라이드

* 항목 1
* 항목 2

---

## 두 번째 슬라이드

* `---` 한 줄로 슬라이드 분리
```

* 마크다운만 알면 누구나 작성 가능

---

# 4. 확장성

* theme + layout으로 디자인을 자유롭게

---

## Theme & Layout 시스템

* `theme/{name}/slide.css` — 전체 시각 스타일 SSOT
* `theme/{name}/layouts/*.html` — 슬라이드 레이아웃 템플릿
* 슬라이드별 override: 첫 줄 `#layout-blank`로 layout 변경
* 슬롯(`::: slotName ... :::`)으로 템플릿에 콘텐츠 주입

---

## 멀티 컬럼 레이아웃

```markdown
::: columns
::: {.column width="60%"}
좌측 콘텐츠
:::
::: {.column width="40%"}
우측 콘텐츠
:::
:::
```

* Pandoc 표준 호환
* 휴리스틱 자동 2분할: 텍스트 + 이미지 한 슬라이드 → 자동 좌·우 분할

---

## 커스터마이징 포인트

* **`_config.yml`**: theme, layout, markmap 깊이, slide 비율 등
* **frontmatter**: instructor·version·release_date·QR 등 운영 메타
* **슬라이드 디렉티브**: `#transition-*`, `#background-*`, `{.fragment}`
* **이미지·자산**: `Projects/{이름}/img/` 자동 복사

---

# 5. 마무리

* 마크다운 한 벌로 콘텐츠 자산을 일원화

---

## 핵심 가치 요약

* **단일 SSOT**: 마크다운 하나로 모든 형식 산출
* **Git 친화적**: 텍스트 기반 협업·리뷰
* **확장 가능**: theme·layout·디렉티브로 디자인 자유도 확보
* **저비용 진입**: 마크다운만 알면 즉시 시작

---

## 참고

* 온라인 데모: [finfra.github.io/m2slide](https://finfra.github.io/m2slide/)
* GitHub: [github.com/Finfra/m2slide](https://github.com/Finfra/m2slide)
* 문의: nowage@gmail.com
