---
name: md-m2slide-rules
description: m2slide 프로젝트 마크다운 작성 규칙. md-slide-rules의 m2slide 특화 버전
date: 2026-05-01
---

> 기본 규칙은 `~/.claude/rules/md-slide-rules.md` 참조 (Frontmatter, 슬라이드 구분자, 헤더 컨벤션, 멀티 컬럼 등 슬라이드 도구 공통).
> 본 규칙은 그 위에 m2slide 고유 확장만 정의함. 충돌 시 본 규칙 우선.

# 적용 범위

* `Projects/{ProjectName}/` 하위 모든 마크다운 (`*.md`, `markdown/*.md`, `AGENDA.md`)
* `m2slide.sh` 또는 `node generate-slides.js`로 변환되는 모든 마크다운

# Frontmatter 확장

m2slide 고유 키. md-slide-rules 표준 키(`title`, `subtitle`, `author`, `date`, `type: ppt`)에 추가로 사용 가능:

```yaml
---
title: 프레젠테이션 제목
subtitle: 부제
author: 발표자
slogan: 한 줄 슬로건 (선택)
type: ppt
theme: nowage              # theme/{name}/ 디렉토리 이름. 미지정 시 default
theme_default_layout: contents  # 기본 레이아웃 (`_` prefix 제거 형태)
top_align: false           # 슬라이드 상단 정렬 강제
title_contents_gap: 30     # title↔contents 갭 (title 높이의 %)
guide_line: false          # 디버깅용 가이드 라인 표시
markmap_depth: 2           # TOC 마인드맵 초기 펼침 깊이
chapter_markmap_depth: 3   # 챕터별 페이지 마인드맵 깊이
toc_placeholder: false     # 첫 슬라이드 자동 TOC 생성 여부
font_size_auto: true       # 콘텐츠 자동 폰트 크기 조정
auto_layout_detect: true   # image-only/empty-title 자동 layout 감지
---
```

* 프로젝트 단위 설정은 `Projects/{Name}/_config.yml`에 두는 것을 권장 (frontmatter는 슬라이드 단위 override 용도)
* `_config.yml`이 더 강력한 SSOT — frontmatter는 보조 수단

# 운영 메타데이터 — 슬라이드 소스 frontmatter 통합 (Issue79; 구 Issue48/49 정책 폐기)

`_config.yml`(렌더링 설정)과 별도로 강사·버전·강의일·QR 등 **운영/배포 메타**는 슬라이드 소스 `.md` frontmatter에 직접 작성. 영속 SSOT는 [`_doc_arch/meta-yml.md`](../../_doc_arch/meta-yml.md).

* 메타 출처:
    - Chapter mode: `markdown/AGENDA.md` frontmatter
    - Single mode: `{ProjectName}.md` 등 슬라이드 소스 `.md` frontmatter (generate-slides.js 우선순위 적용)
* 책임 분할:
    - `_config.yml` → theme, layout, markmap_depth 등 렌더링
    - 슬라이드 소스 frontmatter → instructor, version, lecture_date, qr_code_path 등 운영
    - `cover_enabled`은 렌더링 토글이므로 `_config.yml` 소속 (예외)
* `_meta.yml`은 **사용하지 않음** — Issue79 이전 프로젝트는 frontmatter로 마이그레이션
* 필드 명명: snake_case (예: `instructor_name`, `lecture_date`, `qr_code_path`)
* 필드 카테고리: 강사 / 강의 메타 / 버전 / 생성 / 외부 자산 / QR / Cover — 상세 스키마는 설계 문서 참조

## Cover 슬라이드 자동 주입 (Issue49)

* `_config.yml`에 `cover_enabled: true` 작성 시 첫 파일의 첫 슬라이드 위치에 cover layout 슬라이드 자동 주입 (변수 값은 메타 출처 frontmatter에서 채움)
* 단일 페이지 모드: 유일한 파일에 주입
* 챕터 모드: 알파벳/숫자 순 첫 `.md` 파일에만 주입 (나머지 챕터는 미주입)
* 사용자가 슬라이드에 수동으로 `#layout-cover`(또는 `#layout-_cover`) 메타를 적은 경우 자동 주입 건너뜀 (중복 방지)
* 템플릿 위치: `theme/{name}/layouts/_cover.html` 또는 번호 prefix 사용 시 `theme/{name}/layouts/N.M.cover.html` (alias 자동 등록). 기본 fallback은 `theme/default/layouts/_cover.html`
* **cover layout override (Issue119)**: `_config.yml`에 `cover_layout: <name>` 작성 시 cover 슬라이드에 사용할 layout 변경 가능 (기본 `_cover`). single 모드 + chapter 모드 양쪽 모두 적용. 화이트리스트는 `theme_default_layout`과 동일(`^_?[a-z][a-z0-9-]*$`). underscore 유무는 alias 자동 등록으로 양쪽 모두 허용.
* 사용 가능 변수: `{{title}}`, `{{subtitle}}`, `{{instructor_name}}`, `{{instructor_contact}}`, `{{part_subtitle}}`, `{{lecture_date}}`, `{{version}}`, `{{qr_code_path}}`, `{{qr_url}}`
* QR 렌더링 v1: 정적 이미지(`qr_code_path`) + URL 텍스트(`qr_url`). 동적 생성(qrcode.js)은 v2 후보

# 헤더 컨벤션 (m2slide 권장)

md-slide-rules의 헤더 컨벤션을 그대로 따르되, **markmap TOC 깊이 확보를 위해 H1 사용 권장**:

```markdown
# 챕터 제목 (선택 — markmap에서 그룹 노드)
## 슬라이드 제목 (필수 — 각 슬라이드)
```

* H1 없이 H2만 사용해도 작동함 (Issue39 수정으로 빈 wrapper 노드 미생성)
* H1 사용 시 markmap이 `root → H1 → H2` 트리 구조로 가독성 향상
* 단일 챕터 단순 프로젝트는 H2 only도 OK (layoutTest, MarkdownGraph 사례)

# 슬라이드 구분자

```markdown
## 슬라이드 1

* 콘텐츠

---

## 슬라이드 2
```

* `---` 단독 줄로 슬라이드 분리 (md-slide-rules와 동일)
* Frontmatter 종료 `---`과 본문 분리 `---` 구분 명확히

# m2slide 고유 확장

## 1. 슬라이드별 layout override

```markdown
#layout-blank

![full screen image](./img/cover.png)

---

#layout-contents

## 일반 슬라이드
* 내용
```

* 슬라이드 첫 줄에 `#layout-{name}` 메타 — `theme/{name}/layouts/{name}.html` 또는 `_{name}.html` 매핑
* 출력 HTML에서는 메타 라인 제거됨
* 파서 패턴: `^#_?[a-z][a-z0-9-]*$` (방어적)
* 사용자 명시는 항상 자동 감지(Issue27_1·27_2)보다 우선

### Layout 이름 표기 규칙

상세 정책: [`_doc_arch/theme_layout.md`](../../_doc_arch/theme_layout.md)의 "Layout 이름 표기 정책" 섹션 참조.

* **사용자 작성 표기 (권장)**: `_` prefix **없이** 작성
    - `_config.yml`: `theme_default_layout: contents` (✓), `theme_default_layout: blank` (✓)
    - 슬라이드 메타: `#layout-contents` (✓), `#layout-blank` (✓)
* **시스템/파일명 표기**: `_` prefix **유지** — 파일 시스템에서 시스템 layout 표시
    - 파일명: `theme/default/layouts/_blank.html`, `_contents.html`, `_contents_no_title.html`
* **양쪽 표기 모두 허용** (Issue41 alias 정규화): `theme_default_layout: _contents` 또는 `#layout-_blank` 작성도 정상 동작 — 단 가독성을 위해 underscore 없는 형태 권장
* **lint 자동 검증**: `./run.sh --lint-config`로 모든 프로젝트의 `_config.yml` `theme_default_layout` 값을 사전 스캔하여 미존재 layout 검출 (Issue45 추가)

### 슬라이드 단위 애니메이션 디렉티브 (Issue117)

`#layout-*`와 동일 패턴으로 슬라이드 첫 비공백 라인부터 연속된 디렉티브 라인을 누적 파싱. **첫 비공백 라인이 H1~H6 헤더이면 헤더 + 빈 라인을 skip하고 그 다음 디렉티브 영역**을 매칭함 (Issue117 후속). 즉 두 형태 모두 동작:

```markdown
## 제목 위에 디렉티브 (Issue81 호환)
#transition-zoom

* 본문
```

```markdown
## 제목 다음에 디렉티브 (Issue117 SSOT 권장)
#transition-zoom
#auto-animate

* 본문
```

| 디렉티브 | reveal.js 매핑 | 예시 |
| :--- | :--- | :--- |
| `#transition-{name}` | `data-transition` | `#transition-fade` |
| `#transition-{name}-{speed}` | `+ data-transition-speed` | `#transition-zoom-fast` |
| `#background-color-{hex 또는 name}` | `data-background-color` | `#background-color-1a1a2e` (hex 자동 # prepend) / `#background-color-tomato` |
| `#background-transition-{name}` | `data-background-transition` | `#background-transition-zoom` |
| `#background-image-{path 또는 url}` | `data-background-image` | `#background-image-./img/bg.png` / `#background-image-https://example.com/bg.jpg` (Issue117_1) |
| `#background-size-{cover\|contain\|auto}` | `data-background-size` | `#background-size-cover` (Issue117_1) |
| `#auto-animate` | `data-auto-animate` | `#auto-animate` (인접 슬라이드와 모핑) |
| `#autoslide-{ms}` | `data-autoslide` | `#autoslide-2000` (2초 자동 진행) |

**화이트리스트** (글로벌 `_config.yml animation:`과 동일):

* transition `name`: `none | fade | slide | convex | concave | zoom`
* speed: `default | fast | slow`
* background-size: `cover | contain | auto` (reveal.js 표준 키워드. `100px 100px` 같은 공백 포함 값은 단일 토큰 디렉티브로 표현 불가 — 필요 시 raw `<section data-background-size="...">` 사용)

**글로벌 default와의 관계**: 슬라이드별 디렉티브가 있으면 reveal.js가 자동으로 글로벌 `animation:` 옵션보다 우선시 (reveal.js 표준 동작 — `<section data-transition="...">`이 있는 슬라이드는 해당 값 사용, 없으면 글로벌 옵션). 즉 글로벌 `animation: default_transition: slide` 설정 위에 특정 슬라이드만 `#transition-zoom`으로 override 가능.

**`#background-image-*` path 규칙** (Issue117_1):

* path는 `\S+` 매칭 — 공백 전까지 모두 path로 인식. 상대경로(`./img/bg.png`), 절대경로(`/assets/cover.jpg`), HTTP(S) URL(`https://...`) 모두 허용.
* 상대경로는 결과 HTML 위치 기준으로 reveal.js가 해석. `Projects/{Name}/img/`는 빌드 시 `slide/img/`로 자동 복사되므로 `./img/foo.png`로 작성하면 됨.
* path 존재 여부는 빌드 시 검증하지 않음 (reveal.js가 런타임 src 로드 실패 시 처리).
* 큰따옴표(`"`)는 자동 escape됨. path에 공백이 들어가야 하는 케이스(드물지만)는 디렉티브로 표현 불가 → raw `<section>` 작성 또는 파일명 변경 권장.

**reveal.js 표준 `<!-- .slide: ... -->` 주석 (슬라이드 단위 속성)은 미지원**:
`<!-- .slide: data-background-image="..." -->` (reveal.js Markdown plugin 전용 — 슬라이드 단위 속성)는 m2slide 자체 파서가 처리하지 않아 HTML 주석으로 그냥 지나감. 슬라이드별 배경 이미지는 반드시 위 m2slide 디렉티브로 작성.

**reveal.js 표준 `<!-- .element: class="..." -->` 주석 (요소 단위 클래스)은 지원** (Issue149):
list item / paragraph 끝에 `<!-- .element: class="fragment fade-up" -->` 작성 시 해당 요소(`<li>`/`<p>`)에 class 주입. Pandoc `{.fragment .fade-up}` syntax(Issue118)와 동등하게 동작하며 병존 가능. 단/이중 따옴표 허용, 코드 인라인 백틱 종결 보호.

### 단계별 등장 — inline attribute (Pandoc Issue118 + reveal.js Issue149)

list item / paragraph 끝에 두 가지 syntax 중 하나를 작성하면 출력 HTML 요소(`<li>`/`<p>`)에 class 주입. reveal.js fragment 단계 등장 효과를 마크다운으로 자연스럽게 표현.

| Syntax | 형식 | 출처 |
| :--- | :--- | :--- |
| Pandoc | `{.fragment .fade-up}` | Issue118 |
| reveal.js | `<!-- .element: class="fragment fade-up" -->` | Issue149 |

둘 다 동일하게 동작하며 같은 파일 내 혼용 가능.

```markdown
* 첫 번째 (즉시 표시)
* 두 번째 {.fragment}
* 세 번째 {.fragment .fade-up}
* 네 번째 {.fragment .highlight-blue}
```

* 변환: `* 두 번째 {.fragment .fade-up}` → `<li class="bullet-dot fragment fade-up">두 번째</li>`
* paragraph도 동일: `이 단락은 단계 {.fragment}` → `<p class="fragment">이 단락은 단계</p>`
* ordered list도 지원
* **보호 규칙**:
    - 코드 인라인 안의 `{.foo}` 보존 (백틱 종결 라인은 매칭 안 함)
    - 일반 텍스트 `{a, b}는 집합` 보존 (각 토큰 `.`로 시작 필수)
    - 빈 attribute `{}` 또는 `{.}` 무시
* reveal.js 표준 fragment 클래스: `fragment`, `fragment.fade-up`/`-down`/`-left`/`-right`, `fragment.grow`, `fragment.shrink`, `fragment.highlight-red`/`-green`/`-blue`, `fragment.fade-in-then-out`, `fragment.current-visible`
* 임의 클래스도 주입 가능 (테마 CSS와 결합)
* 테스트: `node --test lib/__tests__/markdown.test.js` (30 케이스 — Issue118 19 + Issue149 11)

## 1.5. Header 시스템 슬롯 (head_left / head_right) — Issue141

`_contents` layout 상단에 outline 컨텍스트를 좌/우 자동 표시하는 시스템 슬롯. 사용자 마크다운 입력용 아님 (`::: head_left :::` 작성 무의미).
영속 SSOT: [`_doc_arch/head.md`](../../_doc_arch/head.md).

**옵션** (`_config.yml`):

| 키 | 허용값 | default | 의미 |
| :--- | :--- | :--- | :--- |
| `head_left` | `d1`~`d99` \| `now` \| `none` | `d1` | 좌측 슬롯 |
| `head_right` | (동일) | `now` | 우측 슬롯 |
| `head_breadcum` | `true` \| `false` | `true` | `now` breadcrumb master toggle |

**옵션 값 의미**:

* `d{N}` — 챕터 outline 절대 depth N의 단일 텍스트
* `now` — 현재 챕터 위치 breadcrumb. 다른 head 옵션이 `d{m}`이면 `d{m+1}`부터 현재까지 ` > ` 연결
* `none` — 표시 안 함

**outline 알고리즘** (single + chapter mode 통일, 2026-05-10 정책):

* H1 = d1 (메인 챕터)
* **numbering 있는** H2(예 `## 4.2.1. ...`)만 outline 인정. numbering 없는 H2는 제외 (출력 비움)
* 직전 H2의 numbering 부모 chain(예 `4.2.1` → `4.2`)을 같은 H1 안 H2 list에서 자동 매칭 → ancestor trail 구성
* H3+ = 슬라이드 제목·부제 (outline 제외, contents-title이 표시)
* AGENDA.md outline은 head-bar에 미사용 (entry·navigation·markmap 전용)

**예시** (`# 4. 이미지 및 미디어` + `## 4.1. 이미지` + `## 4.2.1. 리스트[서브...]` + `### 슬라이드 제목` 마크다운):

| 슬라이드 | head_left (d1) | head_right (now) |
| :--- | :--- | :--- |
| 4.1. 이미지 직속 슬라이드 | `4. 이미지 및 미디어` | `4.1. 이미지` |
| 4.2.1. 직속 슬라이드 | `4. 이미지 및 미디어` | `4.2. 리스트 > 4.2.1. 리스트[서브...]` (numbering 추론) |
| numbering 없는 H2 슬라이드 | `4. 이미지 및 미디어` | (빈 — head-bar 자동 비표시) |

**`head_breadcum: false` toggle 효과**:
* `now` 옵션 → 빈 문자열 (좌/우 동일 적용)
* `d{N}` 옵션 → 영향 없음 (단일 항목, breadcrumb 아님)
* 사용 시나리오: outline depth 깊어 breadcrumb 너무 길어지는 경우, 또는 미니멀 디자인 원할 때

## 2. 슬롯(Fenced div) — Pandoc 호환

md-slide-rules의 `::: columns` 표준 외에 m2slide는 임의 슬롯명 지원:

```markdown
::: leftPanel
좌측 콘텐츠 (템플릿의 {{leftPanel}}로 치환)
:::

::: rightPanel
우측 콘텐츠 (템플릿의 {{rightPanel}}로 치환)
:::
```

* layout 템플릿(`theme/{name}/layouts/*.html`)의 `{{slotName}}` placeholder에 매핑
* 시스템 슬롯: `{{title}}`, `{{content}}`, `{{markmap}}` (`_toc` layout 전용)

## 3. Slidev 호환 슬롯

```markdown
## 제목

좌측 텍스트

::right::

![이미지](./img/right.png)
```

* `::right::` 한 줄로 좌/우 2분할 단축 표기
* 슬롯 위쪽은 좌측, 아래쪽은 우측 컬럼

## 4. 멀티 컬럼 — Pandoc 표준 (md-slide-rules 동일)

```markdown
::: columns
::: {.column width="60%"}
좌측 60%
:::
::: {.column width="40%"}
우측 40%
:::
:::
```

* m2slide CSS 클래스: `.m2-cols`, `.m2-col` (또는 Pandoc 표준 `.columns`, `.column`)
* `width="N%"` → flex/max-width inline style
* **width 합 자동 축소**: 그룹 내 모든 column 이 % width 를 명시하고 합이 `gap 4%` 포함 100% 를 초과하면(ex: 50%+50%) 빌더가 비율 유지 축소(48%/48%)하여 우측 넘침을 방지함. 혼합(width 일부 생략)·px 지정 그룹은 무변경
* 상하 분할: `::: rows` / `::: {.row height="N%"}`
* 카드 스타일: `.card` 클래스 추가 (컬럼 내부 단일 박스 — 카드 컴포넌트 `::: cards`와 별개)

## 4.5. 카드 컴포넌트 (`::: cards`)

리스트를 카드 그리드로 배치하는 Core 계열 구조 구성요소. `::: cards` fenced div로 감싼 **최상위 리스트 항목**이 카드 1개가 되며, 각 카드는 **제목 밴드 + 본문**으로 구성된다.

```markdown
## 시각화 컴포넌트

::: cards
* **수식**
  - KaTeX 블록·인라인 LaTeX 렌더
* **차트**
  - chart.js 캔버스 그래프
  - 막대·선·원형 지원
  - 실시간 데이터 갱신
:::
```

### 카드 구조

* 최상위 `*` 항목 1개 = 카드 1개
* 카드 첫 줄 = **제목** — 반드시 `**볼드**`로 작성. 출력 시 본문보다 진한 배경의 **제목 밴드**로 렌더 (`<strong>` → `.m2-cards li > strong`)
* 제목 아래 들여쓰기 중첩 리스트(`-`) = **카드 본문**
* **들여쓰기 단위**: m2slide 리스트 파서는 **2칸 = 1레벨**(`Math.floor(indent/2)`). 카드 본문 1단계 = 2칸, 2단계 = 4칸. (일반 md-rules의 4칸 권장과 다른 m2slide 파서 고유 동작 — 카드 본문은 2칸 기준)

### 본문 bullet 규칙

| 본문 상태 | 출력 마커 |
| :--- | :--- |
| 한 줄(단일 항목) | 마커 없음 (flush left) |
| 여러 줄(2개 이상) — 1단계 | `·` (가운뎃점) |
| 본문의 2단계(중첩) | `-` (하이픈) |

* 작성 시 본문은 m2slide 표준대로 `-`로 적되(레벨2+ = `-`), **출력 마커는 CSS가 위 규칙으로 자동 결정** (단일 항목 `:only-child` → 마커 제거)
* 변환: `<div class="m2-cards cards">` → 카드 그리드 `<ul>` → 카드 `<li>`(제목 `<strong>` + 본문 `<ul>`)
* **본문 깊이는 1단계 권장**: 카드는 균질 항목을 단순 제시하는 용도 — 본문을 2단계 이상 깊게 중첩하지 말 것. 깊은 계층이 필요하면 카드가 아니라 일반 리스트·인포그래픽을 사용. (2단계 `-` 규칙은 불가피한 경우의 최소 fallback)

### 가로 행(rows) 자동 레이아웃

`::: cards` 블록의 **모든 카드가 title-only**(제목 `**볼드**`만 있고 본문 중첩 리스트가 없음)이면, 빌드 시 자동으로 가로 행(rows) 레이아웃으로 렌더된다 — grid 1열, 카드별 full-width 제목 밴드.

* 트리거: 블록 본문에 들여쓰기 bullet(카드 본문)이 **하나도 없을 때**. 하나라도 있으면 기존 grid 유지
* 작성자 무개입 — `::: cards`를 그대로 쓰면 빌드(`generate-slides.js`)가 판정. 별도 디렉티브 불필요
* 효과: 좁은 grid 열에서 긴 강조 문장이 어색하게 줄바꿈되던 문제 + 카드 높이 불균형에 따른 빈 회색 body 띠 해소
* 한 줄 강조 문장 N개(예: "핵심 요약")는 title-only 카드로 묶으면 가로 행으로 깔끔하게 렌더된다
* 혼합 블록(일부 title-only + 일부 본문 있음)은 grid 유지 — 단 그 안의 title-only 카드는 빈 body 박스만 제거

### 기타

* 별도 라이브러리 불필요 — m2slide 자체 마크다운 파서 + theme `slide.css`의 `.m2-cards` 스타일
* **카드 vs 인포그래픽**: 카드는 균질 항목 N개를 단순 박스로 병렬 제시. 데이터·개념을 도해로 종합 표현하는 복잡한 시각화는 인포그래픽(` ```d3 `)을 사용
* **카드 폭 제어 (프로젝트 한정)**: `Projects/{Name}/_config.yml`의 `card_columns: N` (정수 1~12)으로 그리드 열 수를 고정 → 열이 적을수록 카드가 넓어짐. 미지정 시 `auto-fit`(콘텐츠 폭 기준 자동 배치). theme CSS는 `--m2-card-columns` 변수를 읽어 적용하므로 **이 프로젝트만** 영향 (전역 기본 무변경)
* CSS 위치: `theme/{name}/slide.css` (`default`·`default_lec` 적용). 기타 테마는 미지원 — 필요 시 해당 theme `slide.css`에 `.m2-cards` 블록 추가
* **색상은 테마 상속이 기본**: 제목 밴드 배경·글자는 theme `:root`의 `--kn-accent`·`--kn-text`를 상속 (하드코딩 색 없음). 특정 색을 쓰려면 theme `:root`에서 `--m2-card-title-bg`/`--m2-card-title-fg`/`--m2-card-body-bg`/`--m2-card-border` 변수만 명시 override
* 설계 SSOT: [`_doc_arch/component-slide.md`](../../_doc_arch/component-slide.md) Core 계열

## 5. 휴리스틱 자동 2분할

리스트 + 이미지가 한 슬라이드에 공존하면 자동으로 좌/우 2분할:

```markdown
## 제목

* 리스트 항목 1
* 리스트 항목 2

![이미지](./img/diagram.png)
```

* 소스 순서대로 좌측/우측 배치 (텍스트 먼저면 텍스트-좌, 이미지 먼저면 이미지-좌)
* raw `<div>` 라인 있으면 자동 스킵
* 비활성화: 슬라이드에 `<!-- nosplit -->` 추가

```markdown
## 비활성 예제 <!-- nosplit -->

* 리스트
![이미지](./img/x.png)
```

## 6. AGENDA.md (다중 페이지 모드)

다수 챕터 프로젝트는 `markdown/AGENDA.md` 파일로 챕터 구조 정의:

```markdown
## [1. 오프닝](./01-opening.md)
### [1.1 인사](./01.1-greeting.md)
### [1.2 소개](./01.2-intro.md)
## [2. 본론](./02-main.md)
```

* H2 = 메인 챕터 (각각 별도 HTML 파일)
* H3 = 하위 챕터 (메인 챕터의 자식 페이지)
* 인라인 링크 형식 필수: `## [제목](./파일.md)`
* 파일명 규칙: `XX-title.md`(메인), `XX.Y-title.md`(하위)
* 단일 페이지 프로젝트는 AGENDA.md 불필요

## 7. 자동 layout 감지 (Issue27_1, 27_2)

특정 슬라이드 패턴은 자동으로 적절한 layout 적용:

| 패턴                              | 자동 적용 layout       |
| :-------------------------------- | :--------------------- |
| 제목 없음 + 이미지 1개만          | `_blank` (풀스크린)    |
| 빈 제목 또는 제목 부재 + 콘텐츠   | `_contents_no_title`   |
| (그 외)                           | `theme_default_layout` |

* 사용자 `#layout-*` 명시는 항상 우선
* `_config.yml`의 `auto_layout_detect: false`로 비활성화 가능

## 8. 컬러 팔레트 시스템 (Issue210)

`_config.yml palette:` 키로 theme 컬러 variant 교체. htmlArt 블록 단위 `{.palette-X}`·`{.accent-N}` override. PowerPoint Office Theme 대응. 영속 SSOT: [`_doc_arch/color-palette.md`](../../_doc_arch/color-palette.md).

### 데크 전체 — `_config.yml`

```yaml
theme: default
palette: warm       # default | warm | cool | mono. 미지정 시 default (회귀 0 보증)
```

* 카탈로그: `data/palettes/catalog.yml` (기본 4 팔레트). 신규 팔레트: 본 파일 + `theme/{name}/palettes/{palette}.css` 동시 작성.
* 빌드 시 `theme/{themeName}/palettes/{palette}.css` 또는 `theme/default/palettes/{palette}.css` fallback CSS가 inline `<style>` 주입됨.

### htmlArt 블록 단위 — Pandoc attribute

```markdown
::: htmlart pie {.palette-cool}
* A 40%
* B 30%
* C 30%
:::

::: htmlart process {.accent-3}
* 입력
* 처리
* 출력
:::
```

* `{.palette-X}` — 블록 내부에서 X 팔레트 활성 (현 구현은 단일 블록 변수 inline override 대신 `data-palette` 부여, theme별 CSS 매핑은 후속)
* `{.accent-N}` — N=1~6, `--htmlart-accent`를 해당 m2 accent 단일 색으로 강제 (균질형 순환 비활성, opacity 점층 사용)
* 둘 병용 가능: `{.palette-cool .accent-3}`

### 색 자동 순환 정책 (D4)

| 분류 | 타입 | 색 정책 |
| :--- | :--- | :--- |
| 균질형 N개 | `pie` · `cycle` · `gear` · `matrix` · `venn` | `var(--m2-accent-${(i%6)+1})` 순환 |
| 순차/점층형 | `process` · `timeline` · `chevron` · `step` · `funnel` | accent-1 단색 + opacity 점층 |
| 중심+자식형 | `hierarchy` · `radial` · `arrow` | 중심 accent-1, 자식 accent-2 |
| 목록·계열형 | `numbered` · `hexagon` · `block` · `bracket` · `tab` · `target` | accent-1 단색 |
| 좌우 대비형 | `balance` · `compare` | 좌 accent-1, 우 accent-2 |

* Phase 4 (Issue210) 구현 — pie만 우선 적용. 나머지 균질형은 후속 작업으로 동일 정책 점진 적용.
* `{.accent-N}` 명시 시 자동 순환 무시.

# 시각화 구성요소 (Issue181 — 수식·심벌·차트)

시각화 라이브러리 기반 구성요소 저작 문법. 라이브러리 메타 SSOT는 [`data/component-libraries.yml`](../../data/component-libraries.yml), 설계 SSOT는 [`_doc_arch/component-libraries.md`](../../_doc_arch/component-libraries.md).

## 수식 (KaTeX)

```markdown
블록 수식: $$E = mc^2$$
인라인 수식: \(a^2 + b^2 = c^2\)
```

* 블록 `$$…$$`, 인라인 `\(…\)` — LaTeX 문법
* **단일 `$` 미지원** — 통화·셸 변수·정규식과 충돌하므로 금지
* 빌드 시 KaTeX가 자동 렌더 (데크에 `$$`·`\(` 신호 있을 때만 CDN 조건 주입)

## 심벌 (Font Awesome)

```markdown
시작하기 :fa-rocket: 와 완료 :fa-check-circle:
```

* `:fa-{이름}:` → `<i class="fa-solid fa-{이름}">` 변환
* 코드 인라인(`` `:fa-x:` ``) 안의 마커는 보존 (변환 안 함)
* 강조·목록 마커 보조용. 심벌명은 Font Awesome 6 solid 세트 기준

## 차트 (chart.js)

````markdown
```chart
{
  "type": "bar",
  "data": {
    "labels": ["A", "B", "C"],
    "datasets": [{ "label": "값", "data": [12, 19, 7] }]
  }
}
```
````

* `` ```chart `` fenced block 본문 = Chart.js config **JSON**
* 빌드 시 `<div data-component="chart">`로 변환 → Chart.js가 `<canvas>` 렌더
* config JSON 파싱 실패 시 슬라이드에 에러 메시지 표시 (빌드는 중단 안 함)

## 지도 (Leaflet)

````markdown
```map
{
  "center": [37.5665, 126.9780],
  "zoom": 11,
  "markers": [{ "coords": [37.5665, 126.9780], "popup": "서울" }]
}
```
````

* `` ```map `` fenced block 본문 = JSON (`center`·`zoom`·`markers`)
* 빌드 시 `<div data-component="map">`로 변환 → Leaflet가 OpenStreetMap 타일 지도 렌더
* `center` = `[위도, 경도]`, `markers[].coords` 동일 형식

## 인포그래픽 (d3)

````markdown
```d3
const svg = d3.select(el).append('svg').attr('width', 400).attr('height', 200);
svg.selectAll('rect').data([40, 80, 120]).enter().append('rect')
  .attr('x', (d, i) => i * 90).attr('y', d => 200 - d)
  .attr('width', 70).attr('height', d => d).attr('fill', 'steelblue');
```
````

* `` ```d3 `` fenced block 본문 = `d3`·`el` 인자를 받는 JS 코드
* `el` = 컴포넌트 컨테이너 div. d3 API로 자유롭게 SVG·시각화 작성
* d3는 markmap 의존성으로 이미 로드됨 (CDN 추가 없음)
* 본문은 사용자 슬라이드 콘텐츠로 신뢰 처리 (mermaid 코드블록과 동일 수준)

## React artifact (Issue184)

인터랙티브 컴포넌트를 슬라이드에 직접 작성. media-creater 4도구 중 **기본(fallback)**.

````markdown
```react
function Counter() {
  const [n, setN] = React.useState(0);
  return <button onClick={() => setN(n + 1)}>클릭 {n}회</button>;
}
render(<Counter />);
```
````

* `` ```react `` fenced block 본문 = JSX 컴포넌트 코드
* 사용 가능 인자: `React`, `ReactDOM`, `el`(컨테이너 div), `render`(`el`에 마운트하는 헬퍼)
* 마운트는 `render(<App />)` 또는 직접 `ReactDOM.createRoot(el).render(...)`
* JSX는 Babel-standalone가 **브라우저에서 변환** — m2slide 빌드 의존성 0 유지
* CDN(React 18.3.1 + ReactDOM + Babel-standalone)은 `react` 블록이 있는 데크에만 조건 주입
* 본문은 사용자 슬라이드 콘텐츠로 신뢰 처리 (d3·mermaid와 동일 수준)
* 변환·실행 실패 시 슬라이드에 `.component-error` 메시지 표시 (빌드 중단 안 함)

## HTML artifact — WordArt (Issue184)

Cards로 표현하기 복잡한 장식 텍스트·리치 HTML. **WordArt 장식 효과** 위주.

````markdown
```wordart
<h1 class="wordart-gradient">그라데이션 타이틀</h1>
<p class="wordart-3d">입체 텍스트</p>
```
````

* `` ```wordart `` fenced block 본문 = raw HTML (escape 없이 그대로 렌더)
* 순수 CSS 컴포넌트 — CDN·JS 디스패처 불필요
* WordArt 유틸 클래스 (theme `slide.css`):
    - `.wordart-gradient` — 그라데이션 텍스트
    - `.wordart-outline` — 외곽선(중공) 텍스트
    - `.wordart-shadow` — 그림자 텍스트
    - `.wordart-3d` — 입체(적층 그림자) 텍스트
    - `.wordart-glow` — 발광(네온) 텍스트
* 곡선 텍스트가 필요하면 본문에 inline `<svg><textPath>` 직접 작성
* 블록은 `.component-container.wordart-block`으로 래핑 — 슬라이드 영역 중앙 정렬

## 3D 모델 뷰어 (Issue206 — model-viewer)

````markdown
```model3d
{
  "src": "./img/model.glb",
  "alt": "3D 모델 설명",
  "autoRotate": true,
  "poster": "./img/model-poster.png"
}
```
````

* `` ```model3d `` fenced block 본문 = JSON config
* `src`: GLB/GLTF 파일 경로 (필수). `Projects/{Name}/img/`에 배치 → `slide/img/`로 자동 복사
* `alt`: 접근성 대체 텍스트 (선택, 기본 "3D 모델")
* `autoRotate`: `true` 시 자동 회전 (선택)
* `poster`: 로딩 중 표시할 이미지 경로 (선택)
* `ar`: `true` 시 AR 모드 활성화 (모바일 지원 브라우저만)
* `height`: 뷰어 높이 (기본 "400px")
* `rotationPerSecond`: 자동 회전 속도 (예: "30deg")
* `backgroundColor`: 배경색 CSS 값 (예: "#1a1a2e")
* camera-controls 기본 활성화 (마우스/터치로 회전·확대)
* CDN(model-viewer 3.5.0)은 `model3d` 블록 있는 데크에만 조건 주입
* GLB 파일은 별도 제작 필요 — `img/` 폴더에 배치 후 상대 경로 참조

## Simulation View (Issue207 — p5.js)

````markdown
```p5
let x = 0;
p.setup = function() {
  p.createCanvas(el.clientWidth, el.clientHeight);
};
p.draw = function() {
  p.background('#1a1a2e');
  p.fill('#4ec9b0');
  p.ellipse(x, p.height / 2, 40, 40);
  x = (x + 2) % p.width;
};
```
````

* `` ```p5 `` fenced block 본문 = p5 instance(`p`) + 컨테이너(`el`) 인자를 받는 JS 코드
* p5.js **instance mode** — `p.setup`, `p.draw`, `p.mouseX` 등 모든 p5 API는 `p.` prefix 필수 (전역 모드 사용 금지: 다중 인스턴스 격리·다른 컴포넌트와 글로벌 오염 방지)
* 사용 가능 인자:
    - `p` — p5 인스턴스 (`p.createCanvas`, `p.background`, `p.ellipse`, `p.mouseX/Y` 등 전체 p5 API)
    - `el` — 컴포넌트 컨테이너 div (캔버스가 이 안에 자동 마운트). dispatcher가 슬라이드 영역에 맞춰 `el.clientWidth/clientHeight` 사전 설정
* **권장 패턴 — 컨테이너 크기 기준 캔버스 생성**:
    - `p.createCanvas(el.clientWidth, el.clientHeight)` 사용 → 슬라이드 영역 fit + 픽셀 해상도 일치 (선명함)
    - 고정 픽셀(`p.createCanvas(600, 320)`)도 동작은 하나 dispatcher가 canvas CSS 100%로 강제 늘려 픽셀 보간 발생 (약간 흐려질 수 있음)
* dispatcher 자동 처리:
    - `el` 컨테이너에 슬라이드 영역 채우는 width/height 강제 (model3d `fitHeight` 패턴 차용)
    - 생성된 canvas에 CSS `width:100%; height:100%; display:block` 적용
    - 슬라이드 재진입 시 fit 재적용 (창 크기 변동 대응)
* CDN(p5@1.11.2)은 `p5` 블록 있는 데크에만 조건 주입
* 본문은 사용자 슬라이드 콘텐츠로 신뢰 처리 (d3·mermaid·react와 동일 수준)
* 슬라이드 전환 시 비활성 p5 인스턴스는 자동 `noLoop()` 일시정지 → 활성 시 `loop()` 재개 (CPU 절약)
* 변환·실행 실패 시 슬라이드에 `.component-error` 메시지 표시 (빌드 중단 안 함)

## text-wireframe — 원문 ASCII (D2Coding)

ASCII 와이어프레임을 변환 없이 **원문 그대로** D2Coding 모노스페이스 textarea로 표시. ditaa(Kroki)와 달리 도형 변환을 하지 않음.

````markdown
```text-wireframe
┌────────┐      ┌────────┐      ┌────────┐
│  입력  │ ───▶ │  파서  │ ───▶ │  출력  │
└────────┘      └────────┘      └────────┘
```
````

* `` ```text-wireframe `` fenced block 본문 = ASCII 아트 원문. 그대로 escape 후 `<textarea class="text-wireframe" readonly>`로 렌더
* **박스드로잉 전용 기호 권장**: `+ - |` 대신 유니코드 박스드로잉 문자를 사용하면 선이 끊김 없이 이어져 깔끔함
    - 모서리: `┌ ┐ └ ┘` / 가로선: `─` / 세로선: `│` / 분기: `├ ┬ ┤ ┴ ┼`
    - 화살표: `▶ ◀ ▲ ▼ → ←` / 연결: `─▶` `◀─`
* **D2Coding 필수**: D2Coding은 한글을 정확히 ASCII 2자 폭으로 렌더하므로, 한글 라벨이 들어간 박스아트도 plain text 상태로 정렬이 보장됨 — ditaa의 **CJK code-point 격자 정렬 문제를 원천 회피** (한글 박스 깨짐 없음)
* **자간·라인 고정**: textarea에 `letter-spacing:0`·`word-spacing:0`·리거처 비활성·좁은 `line-height`가 적용되어 박스드로잉 가로선·세로선이 인접 문자/줄과 끊김 없이 이어짐
* **작성 정렬 규칙**: 박스 테두리·세로변을 **D2Coding 컬럼 기준**(한글 1자 = 2칸)으로 맞춰 작성. 일반 모노스페이스 에디터(한글 ≈ 2칸이지만 글꼴마다 다름)에서는 어긋나 보일 수 있으나 D2Coding 렌더에서 정렬됨
* readonly textarea — 발표 중 선택·스크롤 가능, 편집 차단(`readonly`). `white-space:pre`·`wrap=off`로 줄바꿈·공백 보존
* D2Coding 웹폰트(CDN `d2coding@1.3.2`)는 `text-wireframe` 블록이 있는 데크에만 조건 주입 (file:// 배포 호환)
* 도형 렌더가 필요하면 `ditaa`(영문 라벨 권장) 또는 `mermaid` 사용. 한글 라벨 + 텍스트 보존이 목적이면 `text-wireframe`

# 이미지·자산

* 이미지는 `Projects/{Name}/img/` 또는 `markdown/img/`에 배치
* 마크다운에서 상대 경로 `./img/foo.png` 참조
* 변환 시 `slide/img/`로 자동 복사

# 발표자 노트

reveal.js 표준 사용:

```markdown
## 슬라이드

* 내용

Note: 발표 시 참고할 메모. 슬라이드에 표시 안 됨.
```

* `S` 키로 발표자 모드 진입 시 표시

# 작성 시 체크리스트

* [ ] Frontmatter `type: ppt` 명시 (md-slide-rules 준수)
* [ ] 슬라이드 구분자 `---` 사용 일관성
* [ ] H2 슬라이드 제목 명확 (markmap TOC 항목으로 노출됨)
* [ ] H1 사용 검토 (다중 챕터 프로젝트는 H1 챕터 그룹화 권장)
* [ ] `_config.yml` 설정 확인 (`theme`, `markmap_depth`, `auto_layout_detect`)
* [ ] 이미지 상대 경로 + alt 텍스트
* [ ] 슬라이드 한 장에 콘텐츠가 너무 많지 않은가
* [ ] 코드 블록 언어 지정
* [ ] 멀티 컬럼은 Pandoc 표준 또는 m2slide 슬롯 일관 사용

# 참고

* 슬라이드 도구 공통 규칙: [`~/.claude/rules/md-slide-rules.md`](../../../../../.claude/rules/md-slide-rules.md)
* 일반 마크다운 규칙: [`~/.claude/rules/md-rules.md`](../../../../../.claude/rules/md-rules.md)
* m2slide CSS 가드: [`CLAUDE.md`](../../CLAUDE.md) "CSS 수정 시 주의사항"
* theme/layout 시스템: [`_doc_arch/theme.md`](../../_doc_arch/theme.md), [`_doc_arch/theme_layout.md`](../../_doc_arch/theme_layout.md)
* slot 카탈로그 SSOT (4 yml, Issue150) + 통합 가이드 (Issue151): [`data/slot_meta.yml`](../../data/slot_meta.yml) / [`data/slot_pandoc.yml`](../../data/slot_pandoc.yml) / [`data/slot_animation.yml`](../../data/slot_animation.yml) / [`data/slot_user.yml`](../../data/slot_user.yml) — 가이드 [`_doc_arch/slot_guide.md`](../../_doc_arch/slot_guide.md)
