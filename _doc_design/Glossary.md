---
name: Glossary
description: m2slide 핵심 용어 정의 — 모드, 페이지 모델, 레이아웃, 설정, 네비게이션 등 SSOT
date: 2026-05-02
---

# Info

## Glossary

| 용어                     | 분류      | 정의 요약                                                                                |
| :----------------------- | :-------- | :--------------------------------------------------------------------------------------- |
| Single Mode              | 모드      | AGENDA.md 없는 단일 파일 프로젝트. deck 1개, TOC Page 없음                               |
| Chapter Mode             | 모드      | AGENDA.md로 챕터를 연결하는 멀티 파일 프로젝트. 챕터당 deck 1개                          |
| Cover Page               | 페이지    | 발표 표지. `slide/index.html`. `cover_enabled=false` 시 agenda.html redirect             |
| Agenda Page              | 페이지    | 마크맵 전체 목차 + 다운로드 헤더. `slide/agenda.html`. 두 모드 공통 standalone           |
| TOC Page                 | 페이지    | Chapter deck 내 목차 페이지의 상위 명칭. cards 변형(=Cards Page) 보유                    |
| Cards Page               | 페이지    | TOC Page의 cards 변형. layout `_toc`. autoToc 자동 주입                                  |
| Map Slide                | 슬라이드  | markmap svg 슬라이드. layout 없음. `#toc-placeholder` id                                 |
| `_config.yml`            | 설정 파일 | 렌더링 설정 SSOT (theme, layout, markmap_depth, cover_enabled 등)                        |
| Project Meta Frontmatter | 설정 출처 | 운영 메타 SSOT (강사명·날짜·버전·QR 등).                                                 |
| `AGENDA.md`              | 설정 파일 | Chapter 모드 챕터 구조 인덱스. H2=메인 챕터, H3=하위 챕터                                |
| Theme                    | 스타일    | `theme/{name}/` 디렉토리 단위 스타일 묶음. `slide.css` + `layouts/` 포함                 |
| Layout                   | 스타일    | `layouts/*.html` 슬라이드 HTML 구조 템플릿. `#layout-{name}`으로 선택                    |
| Slot                     | 스타일    | 레이아웃 `{{slotName}}` placeholder에 마크다운 콘텐츠를 주입하는 메커니즘                |
| `_cards.html`            | 레이아웃  | Cards Page 전용 레이아웃 (Issue138 신규). autoToc 자동 주입                              |
| `_toc.html`              | 레이아웃  | (deprecated) Cards Page 변환 전 호환용. `_cards.html` 신규 사용 권장                     |
| `_agenda.html`           | 레이아웃  | Agenda Page standalone 전용 레이아웃 (`<body>` 직속, reveal.js 미포함)                   |
| `#layout-{name}` 메타    | 마크다운  | 슬라이드 첫 줄 layout override 지시자. 출력 HTML에서 제거됨                              |
| `::: columns :::` 슬롯   | 마크다운  | Pandoc 표준 N분할. `{.column width="N%"}` 속성으로 비율 제어                             |
| `nosplit`                | 마크다운  | `<!-- nosplit -->` 주석으로 슬라이드 단위 자동 2분할 비활성화                            |
| `!` prefix               | 마크다운  | `#!layout-{name}` — 마크맵 TOC 목록 제외 슬라이드 (Orientation 슬라이드)                 |
| 마름모 네비게이션        | UI        | 우측 하단 `</>` 사이에 `^/v` 4방향 화살표를 다이아몬드 형태로 배치 + 페이지 번호 정중앙. |


# 프로젝트 모드

## Single Mode (단일 페이지 모드)

`AGENDA.md` 없이 하나의 마크다운 파일(또는 `markdown/` 내 단일 파일)로 구성되는 프로젝트.
모든 슬라이드가 하나의 `index.html` deck에 포함됨.

* 진입: `slide/index.html` (Cover Page + 본문 슬라이드)
* TOC Page: **미생성** — `agenda.html`이 그 역할 대체
* 대표 예: `Projects/m2SlideStyle1_single`, `Projects/MarkdownGraph`

## Chapter Mode (챕터 모드)

`AGENDA.md`로 여러 챕터 파일(`XX-title.md`, `XX.Y-title.md`)을 연결하는 멀티 파일 프로젝트.
각 챕터가 별도 Reveal.js deck HTML로 변환됨.

* 진입: `slide/index.html` (Cover Page — 단 1장의 lightweight deck)
* 챕터 deck: `slide/0X-*.html` (각 파일에 TOC 슬라이드 포함)
* 대표 예: `Projects/LlmAndVibeCoding`, `Projects/m2SlideStyle2_chapter`

---

# 3-Page Model (페이지 모델)

Issue55에서 Single/Chapter 모드 공통으로 정의한 3종 페이지 구조.

## Cover Page

발표 표지. 발표자 이름·날짜·제목 등 커버 정보를 표시하는 첫 진입 페이지.

* 파일: `slide/index.html`
* Single 모드: deck의 `#/0` 슬라이드 (cover + 본문 슬라이드가 한 파일)
* Chapter 모드: cover 슬라이드 1장만 있는 lightweight deck
* `cover_enabled: false` 시 `agenda.html`로 자동 redirect

## Agenda Page

마크맵(Markmap) 기반 전체 목차 + 다운로드 헤더가 있는 standalone HTML 페이지.
발표 전 전체 구조를 한눈에 보거나 특정 챕터/슬라이드로 바로 이동하는 데 사용.

* 파일: `slide/agenda.html`
* Single/Chapter 공통 존재
* 다운로드 버튼(EPUB/PDF/PPTX)을 헤더에 자동 표시 (파일 존재 시)
* `_agenda.html` 레이아웃을 standalone 방식으로 렌더 (`<body>` 직속, reveal.js 미포함)

## TOC Page

Chapter deck 내부에 삽입되는 **목차 페이지의 상위 명칭**. 현재 구체 변형은 Cards Page 한 가지. 향후 layout 변형 추가 시 같은 카테고리로 묶음.

* Chapter 모드에서만 존재 (Single 모드는 agenda.html 대체)

### Cards Page (TOC Page의 cards 변형)

* layout: `_cards` (`theme/default/layouts/_cards.html`, Issue138 신규)
* 자동 활성: `_config.yml` `cards_placeholder: true` (글로벌 default true)
* 위치: deck 내 H1/H2 anchor 자리에 자동 주입 (autoToc, [lib/html-builder.js](../lib/html-builder.js) Issue58·138)
* 표시: 같은 챕터 내 후속 슬라이드들을 `.chapter-card` 박스로 카드화
* CSS: `.toc-page-header` + `.toc-cards ul.chapter-list--cards` (현재 `.layout-_toc` selector 호환 위해 layout-_toc class 동시 부여)
* 클릭 동작: 카드 → 해당 anchor로 이동 (`href="#/N"`)

## Map Slide

Chapter deck `#/0` 위치(`id="toc-placeholder"` 슬라이드)에 markmap svg만 표시되는 **layout 없는 슬라이드**. TOC Page와 별개의 독립 슬라이드.

* layout: 없음 (단순 `<section id="toc-placeholder">` + `<svg>`)
* 자동 활성: `_config.yml` `toc_placeholder: true` (글로벌 default true)
* 표시: AGENDA.md 트리 전체를 markmap 마인드맵으로 시각화
* 렌더: `initTocMarkmapIfNeeded` JS가 `#toc-placeholder` id 매칭 시에만 SVG 채움
* CSS: `.toc-page-header` + `.toc-markmap > svg.toc-mindmap-svg` (단독 selector)
* 클릭 동작: 마인드맵 노드 → 해당 슬라이드 anchor로 이동

---

# 설정 파일

## `_config.yml`

프로젝트별 **렌더링 설정** SSOT. 테마·레이아웃·마크맵 깊이 등 시각·출력 제어.

* 위치: `Projects/{ProjectName}/_config.yml`
* 글로벌 기본값: `_config.org.yml` (Issue30)
* 주요 키:
    - `theme:` — 사용할 theme 이름 (`theme/{name}/`)
    - `theme_default_layout:` — 슬라이드 기본 layout 이름
    - `cover_enabled:` — Cover Page 표시 여부 (렌더링 토글이므로 frontmatter 메타가 아닌 여기)
    - `markmap_depth:`, `chapter_markmap_depth:` — TOC 마인드맵 펼침 깊이
    - `auto_layout_detect:` — 이미지 전용/빈 제목 슬라이드 자동 layout 감지 활성화
    - `top_align:`, `title_contents_gap:` — 슬라이드 정렬·간격
    - `toc_placeholder:` — TOC 슬라이드 자동 삽입 여부

## Project Meta Frontmatter (구 `_meta.yml` — Issue79부터 폐기)

프로젝트별 **운영/배포 메타데이터** SSOT. 렌더링과 무관한 강사·버전·강의일 정보를 슬라이드 소스 frontmatter에 직접 작성.

* 위치:
    - Chapter mode: `markdown/AGENDA.md` frontmatter
    - Single mode: `{ProjectName}.md` 등 슬라이드 소스 frontmatter (generate-slides.js 우선순위 적용)
* 선택적: frontmatter 미존재 시 silent skip
* 주요 필드: `instructor_name`, `instructor_contact`, `lecture_date`, `part_subtitle`, `version`, `qr_code_path`, `qr_url`, `gdrive_url`
* Cover 슬라이드의 `{{slotName}}` 치환에 사용됨 (Issue49)
* 상세 SSOT: [`meta-yml.md`](meta-yml.md)

## `AGENDA.md`

Chapter 모드에서 챕터 파일 순서·계층을 정의하는 인덱스 파일.

* 위치: `Projects/{ProjectName}/markdown/AGENDA.md`
* 형식: 인라인 링크 (`## [제목](./파일.md)`, `### [하위제목](./파일.md)`)
* H2 = 메인 챕터, H3 = 하위 챕터
* AGENDA.md가 없으면 Single 모드로 동작

---

# Theme / Layout 시스템

## Theme

`theme/{name}/` 디렉토리 1개가 하나의 테마 단위. CSS + HTML 레이아웃 템플릿 묶음.

* 진입점: `theme/{name}/slide.css` (필수)
* 레이아웃 템플릿: `theme/{name}/layouts/*.html`
* `default` theme: 항상 존재, git 추적
* 사용자 커스텀 theme(예: `nowage`): `.gitignore`로 제외 (사용자별 영역)
* `_config.yml`의 `theme:` 키로 선택. 미지정 시 `default` 자동 적용

## Layout

슬라이드의 HTML 구조 템플릿. `theme/{name}/layouts/*.html` 파일.

* 파일명: `_{name}.html` (시스템 layout) — 예: `_toc.html`, `_blank.html`, `_contents.html`
* 슬라이드에서 선택: `#layout-{name}` 메타 (첫 줄, 출력 HTML에서 제거됨)
* `_config.yml`에서 기본값: `theme_default_layout: contents`
* Alias 정규화 (Issue41): `contents`와 `_contents` 모두 동작 (권장: underscore 없이)
* 자동 감지 (Issue27): 이미지 단독 슬라이드 → `_blank`, 빈 제목 슬라이드 → `_contents_no_title`

## Slot (슬롯)

레이아웃 템플릿의 `{{slotName}}` placeholder에 마크다운 콘텐츠를 주입하는 메커니즘.

* 마크다운 표기: `::: slotName ... :::` (fenced div)
* 시스템 슬롯: `{{title}}`, `{{content}}`, `{{markmap}}`
* 사용자 슬롯: 템플릿 정의에 따라 임의 이름 사용 가능 (예: `{{leftPanel}}`, `{{rightPanel}}`)
* Slidev 호환 단축: `::right::` 한 줄로 좌/우 2분할

## `_toc.html` / `_agenda.html` 레이아웃

TOC Page(deck 내 cards)와 Agenda Page(standalone)는 **별도 레이아웃 파일**. Map Slide는 layout 없이 svg 직접 표시.

| 파일           | 사용 위치                                          | 형태                                                                  |
| :------------- | :------------------------------------------------- | :-------------------------------------------------------------------- |
| `_cards.html`  | Cards Page (Issue138 신규)                          | `<section class="layout-_cards layout-_toc title-slide">` (autoToc 자동 주입) |
| `_toc.html`    | (deprecated) `#layout-_toc` 명시 호환용              | `<section class="layout-_toc title-slide">`                            |
| `_agenda.html` | Agenda Page (`slide/agenda.html`)                  | `<div class="layout-_agenda">` standalone (`<body>` 직속, reveal.js 미포함) |
| (없음)         | Map Slide (`#toc-placeholder`)                      | `<section id="toc-placeholder">` + `<svg>` 직접 (layout 미사용)        |

* `_toc.html` 슬롯: `{{title}}`, `{{cards}}` (autoToc가 생성한 `ul.chapter-list--cards` HTML)
* `_agenda.html` 슬롯: `{{title}}`, `{{markmap}}`, `{{downloadButtons}}` (EPUB/PDF/PPTX 검출 후 `<a>` HTML)
* 공통 CSS 클래스: `.toc-page-header`, `.toc-markmap`, `.toc-mindmap-svg`, `.toc-cards`, `.chapter-card`
* markmap 렌더: Map Slide는 Reveal hook(`ready`/`slidechanged`) + `#toc-placeholder` id 매칭, Agenda Page는 `DOMContentLoaded`

---

# 네비게이션

## ↑ 키 (상위 페이지 이동)

현재 위치에서 한 단계 상위 페이지로 이동. 페이지 계층:

* **Chapter 모드 (4단계)**: 본문 슬라이드 → TOC Page → Agenda Page → Cover Page
* **Single 모드 (3단계)**: 본문 슬라이드 → Agenda Page → Cover Page

## →/↓ 키 (Cover 특수 동작)

Cover 슬라이드(`index.html#/0`)에서 →/↓ 키를 누르면 Reveal.js 기본(다음 슬라이드) 대신 `agenda.html`로 이동. 그 외 슬라이드에서는 기본 동작 유지.

## 마름모 네비게이션 (Diamond Navigation)

우측 하단에 `</>` `^/v` 4방향 화살표를 다이아몬드 형태로 배치하고 그 정중앙에 페이지 번호를 표시하는 UI 패턴 (Issue107).

* DOM: Reveal.js 기본 `.reveal .controls` 내부의 `.navigate-left/right/up/down` 4개 버튼 재활용 (별도 nav-up-btn 미사용)
* 위치: theme/default/slide.css 가 `.reveal .controls`를 `position: fixed; bottom: 0; right: 0`으로 viewport 우측 하단에 고정 → button 좌표가 viewport 기준
* 좌표 (em 기준은 `.controls` font-size 10px = 1em/10px):
    - ← `right: 6.4em` `bottom: 3.2em` (default)
    - → `right: 0.8em` `bottom: 3.2em` (default 0 → 0.8em 좌측 보정)
    - ↑ `right: 3.2em` `bottom: 2.9em` (default 6.4em → 컴팩트 마름모로 보정)
    - ↓ `right: 3.2em` `bottom: 0em` (default -1.4em + padding 1.4em → 화면 잘림 방지)
* 클릭 동작: `.navigate-up/down` 클릭 → `ArrowUp/ArrowDown` keydown 시뮬레이션으로 기존 키 핸들러 재사용
* 활성/비활성 가시화: `.m2-enabled` 클래스 토글로 `opacity: 1` ↔ `opacity: 0.25`
    - ↑: Cover 슬라이드면 비활성, 그 외 활성
    - ↓: Cover/TOC/Anchor 슬라이드면 활성, leaf에서는 mode별 판정 (Chapter: NEXT_CHAPTER 존재 / Single: 다음 H1 anchor 존재)
    - ←/→: Reveal 기본 enabled 클래스 그대로 사용
* 상태 갱신: `Reveal.on('ready')` + `Reveal.on('slidechanged')`에서 `m2UpdateNavControls()` 재계산
* 페이지 번호: `position: fixed; right: 20px; bottom: 20px; width: 60px; height: 14px; text-align: center` — element 중심이 마름모 정중앙(viewport 우측 하단에서 50px, 50px)에 일치

---

# 출력 파일

## `slide/index.html`

Cover Page. Single 모드에서는 전체 deck(cover + 본문), Chapter 모드에서는 cover 1장 lightweight deck.

## `slide/agenda.html`

Agenda Page. 마크맵 기반 전체 목차 + 다운로드 버튼. Single/Chapter 공통.

## `slide/0X-*.html` (Chapter 모드 전용)

각 챕터 deck. `AGENDA.md`의 챕터 파일 하나당 1개 생성. 첫 슬라이드는 TOC Page(`#/toc-placeholder`).

## `slide/img/`

마크다운에서 참조하는 이미지가 자동 복사되는 폴더 (`markdown/img/` → `slide/img/`).

---

# 기타 주요 개념

## `#layout-{name}` 메타

슬라이드 첫 줄에 작성하는 layout override 지시자. 출력 HTML에서는 제거됨. 파서 패턴: `^#layout-[a-z][a-z0-9-]*\s*$` (`#layout-` prefix 필수, 영문 소문자 시작). Issue41 alias 정규화로 `#layout-_blank`/`#layout-blank` 양쪽 모두 동작. 상세: [`theme_layout.md` §6](theme_layout.md).

## `nosplit`

리스트+이미지 자동 2분할 휴리스틱을 슬라이드 단위로 비활성화하는 주석. `## 제목 <!-- nosplit -->` 형태로 사용.

## `!` prefix (Orientation 슬라이드)

`#!layout-{name}` 형태로 마크맵 TOC 목록에서 해당 슬라이드를 제외하는 메타 (Issue50).

## EPUB / PDF / PPTX

m2slide가 지원하는 추가 출력 포맷. 빌드 시점에 `slide/` 폴더에 존재하면 Agenda Page 다운로드 버튼에 자동 표시.

---

# 관련 SSOT 문서

본 Glossary는 용어 정의 SSOT이며, 각 용어의 상세 메커니즘·정책은 다음 문서들이 책임짐.

| 용어 영역                                                                             | 상세 SSOT                                            |
| :------------------------------------------------------------------------------------ | :--------------------------------------------------- |
| Theme 시스템 (`theme/{name}/`)                                                        | [`theme.md`](theme.md)                               |
| Layout 일반 규약 (HTML·슬롯·자동 적용)                                                | [`theme_layout.md`](theme_layout.md)                 |
| default theme 통합 SSOT (시스템 layout 6종 자체 정보 + 시각 디자인 + 변경 가이드라인) | [`theme_layout_default.md`](theme_layout_default.md) |
| CSS 아키텍처·변수·반응형                                                              | [`css.md`](css.md)                                   |
| 메타 frontmatter 스키마                                                               | [`meta-yml.md`](meta-yml.md)                         |
| Cover/Agenda/TOC 3페이지 모델                                                         | [`chapter-single-mode.md`](chapter-single-mode.md)   |
| 키보드 네비게이션                                                                     | [`key_navigation.md`](key_navigation.md)             |
| 비디오 임베드 정책                                                                    | [`video-default.md`](video-default.md)               |
| `lib/` 모듈 분리 설계                                                                 | [`m2slide_lib.md`](m2slide_lib.md)                   |
| 점진 개선 로드맵                                                                      | [`upgrade.md`](upgrade.md)                           |
