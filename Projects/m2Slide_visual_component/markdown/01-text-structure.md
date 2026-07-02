---
title: 텍스트·구조 요소
type: ppt
release_date: 2026-06-28
---

# 1. 텍스트·구조 요소
#layout-chapter

---

## 1.1 표 (Table)
#layout-contents

마크다운 파이프 테이블. m2slide는 Reveal.js `data-markdown` 플러그인에 위임하여 렌더.
정렬: `:---` (좌) / `:---:` (중앙) / `---:` (우).

| 구성요소 | 렌더 백엔드 | CDN 추가 | 특징 |
| :--- | :---: | :---: | :--- |
| 표 (Table) | reveal.js markdown | 없음 | 마크다운 파이프 문법 |
| 카드 (cards) | m2slide 파서 | 없음 | `:::cards` fenced div |
| 멀티컬럼 | m2slide 파서 | 없음 | `:::columns` / `::right::` |
| htmlArt | d3.js | d3 재사용 | 27종 구조 도해 |
| Chart.js | Chart.js | CDN 조건부 | 막대·선·원형 차트 |

---

## 1.2 코드 블록 (Code Block)
#layout-contents

fenced code block — 언어 지정 필수. Reveal.js가 highlight.js로 syntax highlight.
슬라이드 한 장에 15~20줄 이내 권장.

```python
# Python — KMP 문자열 검색 예시
def kmp_search(text, pattern):
    n, m = len(text), len(pattern)
    lps = [0] * m
    j = 0
    # failure function 계산
    i = 1
    while i < m:
        if pattern[i] == pattern[j]:
            j += 1
            lps[i] = j
            i += 1
        elif j != 0:
            j = lps[j - 1]
        else:
            lps[i] = 0
            i += 1
    return lps
```

---

## 1.2b 코드 블록 — JavaScript
#layout-contents

```javascript
// JavaScript — 비동기 fetch + 에러 처리
async function fetchData(url) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('fetch 실패:', err);
    return null;
  }
}
```

---

## 1.3 카드 컴포넌트 (::: cards)
#layout-contents

`::: cards` fenced div. 최상위 `*` + `**볼드**` = 제목 밴드, 하위 `-` = 본문.
렌더 백엔드: m2slide 자체 파서 + theme `slide.css` (추가 CDN 없음).

::: cards
* **텍스트·구조**
  - 표, 코드블록, 카드
  - 멀티컬럼, markmap TOC
* **다이어그램·수식**
  - Mermaid (flowchart, sequence, gantt)
  - KaTeX (블록 / 인라인)
  - Font Awesome 심벌
* **차트·지도**
  - Chart.js (bar/line/pie)
  - Leaflet (OpenStreetMap)
  - d3 인포그래픽
* **인터랙티브**
  - React artifact (JSX + Babel)
  - p5.js Simulation
  - model-viewer 3D GLB
:::

---

## 1.3b 카드 — title-only (가로 행 자동 레이아웃)
#layout-contents

모든 카드가 title-only(본문 없음)이면 자동으로 가로 행(rows) 레이아웃으로 렌더됨.

::: cards
* **기획 → 설계 → 구현 → 배포**
* **자동 생성 · 라이브 데모 · 회귀 테스트**
* **m2slide 시각 구성요소 전체 쇼케이스**
:::

---

## 1.4 멀티컬럼 — ::: columns
#layout-contents

Pandoc 표준 `::: columns` + `::: {.column width="N%"}`.
m2slide CSS 클래스: `.m2-cols` + `.m2-col`.

::: columns
::: {.column width="50%"}
**좌측 (50%)**

* 설계·아키텍처
* 렌더 백엔드 선택
* 데이터 흐름 설계

```yaml
theme: default_lec
theme_default_layout: contents
markmap_depth: 2
```
:::
::: {.column width="50%"}
**우측 (50%)**

* 마크다운 소스 작성
* htmlArt 타입 결정
* fragment 애니메이션 설정

```bash
./m2slide.sh m2Slide_visual_component_v1.0
```
:::
:::

---

## 1.4b 멀티컬럼 — ::right:: (Slidev 호환)
#layout-contents

`::right::` 한 줄로 좌/우 2분할 단축 표기.

좌측 — **저작 문법 요약**

* `:::columns` — Pandoc 표준 N분할
* `::right::` — Slidev 호환 2분할 단축
* `:::rows` — 상하 분할
* 카드 · htmlArt도 내부 컬럼 지원

::right::

| 문법 | 분할 방식 | 비율 |
| :--- | :--- | :--- |
| `::right::` | 50/50 고정 | 자동 |
| `:::columns` | 자유 지정 | N% |
| `:::rows` | 상하 | N% |

---

## 1.5 슬롯 (Fenced Div Slot)
#layout-contents

layout 템플릿의 `{{slotName}}` placeholder에 매핑되는 임의 슬롯.
`:::leftPanel` / `:::rightPanel` 등 layout에 따라 사용 가능 슬롯이 다름.

::: leftPanel
**슬롯 leftPanel**

* layout 템플릿이 `{{leftPanel}}` 선언 시 동작
* fenced div `::: leftPanel ... :::` 로 콘텐츠 주입
* 시스템 슬롯: `{{title}}`, `{{content}}`, `{{markmap}}`
:::

::: rightPanel
**슬롯 rightPanel**

* 사용자 정의 슬롯명은 layout HTML에 `{{rightPanel}}`을 선언해야 치환됨
* `::: slotName ... :::` 형식 — Pandoc fenced div 호환
* 슬롯 미선언 layout에서는 무시됨
:::

---

## 1.6 markmap TOC
#layout-contents

챕터 모드에서 각 HTML 파일의 **첫 슬라이드**에 markmap 마인드맵 TOC 자동 주입.
`toc_placeholder: true` (`_config.yml`) 시 지정 슬라이드에 주입.

**자동 주입 조건**

* `markdown/AGENDA.md`가 존재하는 chapter mode
* 첫 슬라이드(H1 또는 `#layout-_toc` 지정)에 `{{markmap}}` slot 자동 채움
* `markmap_depth: 2` — 초기 펼침 깊이 (1~3 권장)
* `chapter_markmap_depth: 3` — 챕터별 상세 마인드맵 깊이

**마크다운 소스 구조 → markmap 트리**

| AGENDA.md 헤더 | markmap 트리 |
| :--- | :--- |
| `## [챕터](./파일.md)` | 루트 → 챕터 노드 |
| `### [하위](./파일.md)` | 챕터 → 하위 노드 |
| 챕터 내 `## 슬라이드 제목` | 챕터 → 슬라이드 리프 |
