# Issue Management
* https://github.com/Finfra/m2slide/issues
* Issue HWM: 141
* 오래된 Issue는 `z_old/old_issue.md`에 저장
* Save Point :
    - **v0.7.0 (2026-05-06)** — release: `/deploy-docs` 신규 커맨드 + `_config.yml: deploy_formats` 옵션 (EPUB/PDF/PPTX 자동 빌드·배포 + 메인 인덱스 카드 다운로드 배지) + agenda 다운로드 버튼 위치 변경(우상단 헤더 → `.layout-_agenda` 우하단 absolute, 마스코트 충돌 회피). v0.6.x 시리즈(Issue71-126 + Issue127-128) 누적 z_old 아카이브.
    - **v0.5.0 (2026-05-03)** — release: 71건 완료 이슈 z_old 아카이브, CHANGELOG.md 신규 (Issue70까지 포함)
    
# 🤔 결정사항
*  _meta.yml파일 사용 안함 : AGENDA.md나 {프로젝트명}.md파일의 yaml front matter에 추가하기로 함. 

## img 폴더 이중 복사 유지 (소스 `img/` + 빌드 `slide/img/`)
* 결정: 현행 `fs.cpSync` 방식 유지
* 이유: `slide/` 폴더를 통째로 삭제 후 재생성하는 빌드 패턴이 잦음


# 🌱 이슈후보
1. 폰에는 화살표키 없음. 적용 방법 모색할 것.
# 🔥 진행중

## Issue141. _contents head_left/head_right 시스템 슬롯 + outline depth + breadcrumb (등록: 2026-05-10)
* 목적: `_contents` layout 상단에 AGENDA.md outline 컨텍스트를 좌/우 분리 자동 표시. 발표 도중 청중이 현재 챕터 위치를 시각화. d{N}/now/none 옵션 + breadcrumb 알고리즘.
* design: `_doc_design/head.md`
* plan: `_doc_work/plan/head-slots-contents-layout_plan.md`
* task: `_doc_work/tasks/head-slots-contents-layout_task.md`
* 상세:
    - `_contents` layout 상단에 `.contents-head-bar` 신규 영역 (좌/우 분리)
    - `_config.yml`: `head_left: d1` / `head_right: now` 디폴트
    - 옵션 `d{N}` (절대 depth) | `now` (breadcrumb) | `none` (비표시)
    - AGENDA.md 임의 depth 확장 지원 (####, ##### 등). plain heading 무시
    - now 알고리즘: 다른 head 옵션이 d{m}이면 d{m+1}부터 현재까지 ` > ` 연결
    - 적용 layout: `_contents`만 (`_contents_no_title`·`_agenda` 미적용)
    - theme: default + default_lec 양쪽
* 카테고리: Frontend (layout) + Generator (lib/agenda.js, lib/html-builder.js, lib/config.js)
* 구현 명세:
    - 신규: `lib/_internal/head-resolver.js` (순수 함수 분리)
    - `lib/agenda.js`에 `getOutlinePath(fileName, agendaPath)` → `string[]` 추가
    - `lib/config.js`에 head_left/head_right 파싱 (default `d1`/`now`)
    - `lib/html-builder.js:497 generateHTML` 진입부에서 outlinePath 1회 계산 + 모든 slide 객체에 부착
    - `generateSlideHTML` vars 주입: `_resolveHeadSlot(option, otherOption, outlinePath, ' > ')`
    - HTML: `<div class="contents-head-bar"><div class="contents-head-left">...</div><div class="contents-head-right">...</div></div>` (기존 `.contents-header` 위)
    - CSS: theme의 `slide.css`에 추가 (base.css 가드 회피). 빈 슬롯 3중 안전망 (`_stripEmptyWrappers` + `:empty` + `:has()`)
    - 신규 테스트 4파일: agenda.test.js (4) + config.test.js (4) + head-resolver.test.js (2) + integration.test.js (3)
* 검증:
    - 신규 13 케이스 + 기존 19 회귀 무영향 = 32 PASS
    - 빌드 검증: `m2SlideStyle1_single` (single mode head-bar 미표시), `m2SlideStyle2_chapter` (chapter outline 자동), `layoutTest` (시각 회귀 없음)
    - 옵션 교차 4종: `now/none`, `d2/now`, `none/none`, `d99/now`
    - guide-line 모드 라벨 가시화

## Issue140. `toc_placeholder: true` Map Slide 미삽입 회귀 (Issue58 도입) (등록: 2026-05-10)
* 목적: AGENDA.md에 서브섹션이 없는 평탄 H1-only 구조 프로젝트(예: `m2SlideStyle2_chapter`)에서 `toc_placeholder: true` 설정에도 Map Slide(`<section id="toc-placeholder">` + markmap SVG)가 삽입되지 않는 회귀 해결.
* 상세:
    - 회귀 도입: 9ed3298 (Issue58, 2026-05-02) — `hasTocItems` 게이트 신설 ("H3 없으면 `_toc` 미포함")
    - 후속 변경: 7c4adda(Issue137), 2044cc5(Issue138)에서 게이트 유지
    - 현 동작: [lib/html-builder.js:591](lib/html-builder.js#L591) `if (_cfg.tocPlaceholder && hasTocItems && ...)` 게이트 때문에 `m2SlideStyle2_chapter`의 모든 챕터에서 Map Slide 누락
    - 빌드 확인: `grep 'id="toc-placeholder"' Projects/m2SlideStyle2_chapter/slide/*.html` → 0건
    - 사용자 시나리오: `03-data-visualization.html#/4` 마지막 슬라이드 → → 키 → `04-images-media.html?fwd=1` 진입 시 `#/0`이 Cards Page만 표시되고 Map Slide 부재
* 구현 명세:
    - [lib/html-builder.js:591](lib/html-builder.js#L591) Map Slide 게이트에서 `hasTocItems` 제거 → `if (_cfg.tocPlaceholder && !options.skipTocPlaceholder)`
    - [lib/html-builder.js:163-167](lib/html-builder.js#L163-L167) `hasTocInDeck` 오프셋 계산을 `_cfg.tocPlaceholder` 기반으로 변경 (Map Slide가 #/0을 점유하면 슬라이드 인덱스 +1 시프트 필요)
    - markmap 데이터(`tocData`)는 `generateTOCFromFile`이 파일 자체의 H1/H2를 항상 파싱하므로 AGENDA.md 서브섹션 없어도 Map Slide markmap은 정상 렌더
    - 검증: `m2SlideStyle2_chapter` 빌드 후 `id="toc-placeholder"` 7개 챕터 HTML 모두 존재 확인 + 브라우저에서 markmap SVG 렌더 확인

# 📕 중요

# 📙 일반

## Issue129. `default_background_transition` 회귀 테스트 (등록: 2026-05-06)
* 목적: `_config.yml` `animation.default_background_transition` 옵션이 모든 슬라이드에 background transition을 적용하는지 회귀 테스트 마련
* 상세:
    - Issue117에서 슬라이드별 `#background-transition-{name}` 디렉티브 추가됨
    - 글로벌 default(`animation.default_background_transition`) 동작은 검증 미흡
    - 향후 `#background-image-*` 디렉티브 또는 frontmatter `background_image:` 도입(Issue117_1 후보) 시 함께 검증 필요
* 카테고리: Frontend
* 구현 명세:
    - 테스트 fixture 프로젝트에 슬라이드 2장 이상 + 각 슬라이드 background-color 차등
    - `_config.yml`에 `animation.default_background_transition: zoom` 등 적용
    - 빌드 후 출력 HTML에서 `<section data-background-color="...">` 존재 + `Reveal.initialize` 옵션의 `backgroundTransition` 값 확인
    - background-image 디렉티브 도입 시 fixture 확장
* 의존성: background-image 또는 frontmatter `background_image` 기능 도입(Issue117_1 후보)이 선행되면 더 의미 있음. 단독으로도 부분 검증 가능

## Issue131. `_contents` 레이아웃 제목 폰트를 소제목 크기와 동일하게 (등록: 2026-05-06)
* 목적: `_contents` 레이아웃의 `contents-title`(현재 `2.8em`)이 본문 헤더(소제목)와 시각적으로 균일하도록 폰트 크기 축소
* 상세:
    - 현재 `lib/css/base.css:752-756` `font-size: 2.8em` — `contents-full`과도 동일 값
    - 사용자 의도: 제목과 소제목의 위계 차이를 줄여 한 슬라이드 안에서 시각 균형 확보
    - `_contents`만 영향, `contents-full`은 그대로 유지(긴 콘텐츠는 큰 제목이 적합)
* 카테고리: Theme (또는 Generator 기반)
* 구현 명세:
    - **base.css 수정 가드 발동** — CLAUDE.md "base.css 수정 가드" 절에 따라 사용자 컨펌 후 진행
    - 우회 검토: theme의 `slide.css`에서 `.reveal section.layout-_contents .contents-title { font-size: 2.0em }` 등으로 override 가능 → 우회 권장
    - 컨펌 시 변경 범위:
        - 우회안: `theme/default/slide.css` 및 `theme/default_lec/slide.css`에 `.layout-_contents .contents-title` 폰트 크기 override 추가
        - 직접 수정안: `lib/css/base.css:753`을 H3 기준 폰트 크기로 변경
    - 대표 프로젝트 빌드 검증 필수: `m2SlideStyle1_single`, `m2SlideStyle2_chapter`, `layoutTest`

## Issue132. ePub 분할 레이아웃(2/3분할 카드) 렌더링 버그 (등록: 2026-05-06)
* 목적: HTML 출력에서 정상 동작하는 2분할/3분할 레이아웃이 EPUB 출력에서 깨지는 문제 수정
* 상세:
    - 증상 스크린샷: `/Users/nowage/Desktop/epub버그/20260506_182102.png` 외 2장
    - 영향 패턴:
        - 3분할 카드 레이아웃 — `<div>` 기반
        - 2분할 (좌: 텍스트 / 우: 이미지) — `<div>` 기반
        - 3분할 카드 — Pandoc fenced div(`::: columns / ::: {.column}`) 기반
    - HTML(reveal.js)에서는 `m2-cols`/`columns` 클래스 + flex CSS로 동작하나, `generate-epub.js`의 XHTML 변환·CSS 인라인 단계에서 누락 가능성
* 카테고리: Generator (generate-epub.js)
* 구현 명세:
    - 1단계 — 재현: 분할 레이아웃 슬라이드 작성 후 `./m2slide.sh {Name} --epub` 실행, EPUB 내부 XHTML 파일 검증
    - 2단계 — 분석: `generate-epub.js`의 `convertMarkdownToHTML` 또는 fenced div 처리 로직에서 `m2-cols`/`columns` 클래스 보존 여부 + EPUB 전용 CSS에 flex 스타일 정의 여부 확인
    - 3단계 — 수정: 누락된 클래스 보존 + EPUB CSS에 flex 레이아웃(`display: flex; gap: 1em;`) + `.column[width]` inline style 매핑 추가
    - 4단계 — 검증: iBooks 또는 EPUB validator로 분할 레이아웃 시각 확인

# 📗 선택


# ✅ 완료

## Issue139. End 키 → agenda fallback 제거 (모든 모드) (등록: 2026-05-10, 해결: 2026-05-10, commit: bcdd2ad) ✅
* 목적: 마지막 챕터/anchor 또는 Cover 페이지에서 End 키 누르면 `agenda.html`로 돌아가는 fallback 동작 제거. End는 "다음 sibling 점프" 의미만 남기고 boundary에서는 무동작.
* 상세:
    - Issue133(2026-05-09)에서 추가된 Single 모드 End boundary fallback (`html-builder.js:1828`) 되돌리기
    - Issue114에서 추가된 Cover 페이지 End → agenda fall-through (`html-builder.js:2128-2133`) 제거
    - Chapter 모드는 이미 마지막 main 챕터에서 End 무동작이므로 변경 없음
    - Home 키는 변경하지 않음 (사용자 요청 범위 외)
* 카테고리: Frontend (키 네비게이션)
* 해결:
    - `lib/html-builder.js` Single 분기 End 핸들러: `else window.location.href = 'agenda.html?fwd=1';` 제거 → sibling 부재 시 무동작
    - `lib/html-builder.js` Cover 페이지 End 핸들러: `window.location.href = 'agenda.html?fwd=1';` 제거 → `e.preventDefault(); e.stopImmediatePropagation(); return;`만 유지
    - 관련 주석(상단 매트릭스, ⌘+→ 안내) Issue139 마커로 갱신
* 검증:
    - `node -c lib/html-builder.js` 문법 OK
    - `node --test lib/__tests__/*.js` 19/19 통과
    - 대표 프로젝트 빌드 정상: `m2SlideStyle1_single`, `m2SlideStyle2_chapter`, `layoutTest`
    - Single mode `slide/index.html` Issue139 주석 + End fallback 제거 확인 (line 3104)
    - Chapter mode chapter HTML도 동일 처리 확인 (line 2441)
    - Cover (`m2SlideStyle2_chapter/slide/index.html`) End 핸들러: agenda 이동 코드 제거 + `return;`만 유지 (line 1380-1385)
    - 브라우저 수동: Single mode 마지막 H1 End → 무동작, Chapter mode Cover End → 무동작

## Issue138. Cards Page / Map Slide 의미 분리 — `_cards.html` 신규 + Map Slide layout 제거 + 두 옵션 분리 (등록: 2026-05-09, 해결: 2026-05-10, commit: 2044cc5) ✅
* 목적: 같은 `layout-_toc` 클래스가 두 가지 시각적 결과(markmap vs cards)를 내는 의미적 불일치 해소. Glossary 분류 원칙(layout 있음 = Page, layout 없음 = Slide)에 맞춰 명명·구조 정리. TOC Page = 상위 명칭, Cards Page = `_cards.html` layout cards 변형, Map Slide = layout 없는 svg 슬라이드. `toc_placeholder` / `cards_placeholder` 두 옵션으로 각각 독립 활성
* 상세:
    - 재현: `Projects/LlmAndVibeCoding/slide/02-llm-tool-evolution.html` — `#/0`(`#toc-placeholder`)는 markmap만, `#/2`는 cards만. 두 슬라이드 모두 `class="layout-_toc title-slide"` 공유
    - 명명 결정 (2026-05-10):
        - **TOC Page** (페이지) = Chapter deck 내 목차 페이지의 상위 명칭 (향후 변형 확장 카테고리)
        - **Cards Page** (페이지) = TOC Page의 cards 변형. layout `_cards.html` (신규). autoToc 자동 주입
        - **Map Slide** (슬라이드) = `<section id="toc-placeholder" class="layout-_toc">` + svg 직접 (cards 영역 없음)
    - 옵션 결정 (2026-05-10):
        - `toc_placeholder: true` → Map Slide 자동 삽입 (글로벌 default true)
        - `cards_placeholder: true` → Cards Page 자동 삽입 (글로벌 default true)
        - 둘 다 true면 Map Slide #/0 + Cards Page #/1 두 슬라이드 생성
* 해결:
    - `theme/default/layouts/_cards.html` 신규 (cards 슬롯, `class="layout-_cards layout-_toc"` 동시 부여 — 기존 CSS 호환)
    - `theme/default/layouts/_toc.html` 단순화: markmap 영역만 (Cards 슬롯 제거, Map Slide 전용)
    - `lib/slide-parser.js:403`: autoToc 변환 layout `_toc` → `_cards`
    - `lib/html-builder.js` Step 8: Map Slide(`isMapSlide` 플래그) + Cards Page(`_cards` layout) 분리 생성. parser autoToc 슬라이드 우선 + isTitle 중복 제거
    - `lib/html-builder.js` generateSlideHTML: isMapSlide 슬라이드는 `<section id="toc-placeholder" class="layout-_toc">` + `<svg>` 직접 출력 (guide-line-mode 좌하단 라벨 `_toc` 표시)
    - `lib/html-builder.js` isAnchorSlide JS hook: `layout-_cards` OR `layout-_toc` 매칭으로 anchor 식별 확장
    - `lib/config.js`+`_config.org.yml`: `cardsPlaceholder` 옵션 신규 (기본 true)
    - `Projects/LlmAndVibeCoding/_config.yml`: `toc_placeholder: true` + `cards_placeholder: true` 명시
* 검증:
    - LlmAndVibeCoding 02·03·04 빌드: Map Slide(`<section id="toc-placeholder" class="layout-_toc">`) + Cards Page(`<section data-heading-level="1" class="layout-_cards layout-_toc">`) 두 슬라이드 분리 확인
    - 01-opening (서브챕터 없음): hasTocItems=false라 Map Slide 미생성, parser autoToc Cards Page만 (의도된 동작)
    - m2SlideStyle1_single (single mode): Cards Page 자동 생성, 회귀 없음
    - m2SlideStyle2_chapter: 빌드 성공
* 의존성: Issue137(commit `7c4adda`) 완료

## Issue137. `toc_placeholder` 옵션 vs `id="toc-placeholder"` 마커 이름 충돌 + 빈 placeholder 잔여 슬라이드 (등록: 2026-05-09, 해결: 2026-05-09, commit: 7c4adda) ✅
* 목적: `_config.yml`의 `toc_placeholder: false`를 설정해도 chapter 모드의 일부 메인 챕터 HTML에 `id="toc-placeholder"` 빈 슬라이드가 강제 삽입되는 혼란 해소. 옵션 의미 명확화 + 잔여 빈 placeholder 슬라이드 정리
* 상세:
    - 재현: `Projects/LlmAndVibeCoding/_config.yml#L4` `toc_placeholder: false` + 빌드 → `02-llm-tool-evolution.html#L1437`에 빈 `<section ... id="toc-placeholder">` + `#L1448`에 실제 콘텐츠를 가진 `<section data-heading-level="1" class="layout-_toc title-slide">` 두 슬라이드 동시 존재
    - 영향 파일: 02·03·04-*.html (AGENDA.md H3 서브챕터 보유 메인 챕터). 01·서브챕터 leaf·single mode 영향 없음
    - 근본 원인 두 갈래:
        1. `_config.yml` 키 `toc_placeholder` (slide-parser.js:299): 디버그용 #/0 빈 슬라이드 강제 unshift
        2. `html-builder.js:514` Issue58 로직: hasTocItems=true면 빈 _toc 슬라이드 prepend → `id="toc-placeholder"` 부여
    - 두 메커니즘이 이름만 공유하여 옵션이 끄지 못하는 별도 경로 발생. 추가로 parser autoToc 변환 결과와 강제 prepend가 같은 H1 슬라이드를 두 번 만드는 잔여물 발생
* 해결:
    - `lib/html-builder.js` Step 8 (line 524-560): parser autoToc 슬라이드가 슬라이드 0에 있으면 별도 빈 placeholder prepend 생략. `isTocPlaceholder` 플래그로 markmap 컨테이너 마커 슬라이드 통합 식별
    - `generateSlideHTML` (line 457-466): `isTocPlaceholder` 플래그 슬라이드에 `id="toc-placeholder"` 부여 → markmap JS·sibling 점프 양쪽이 동일 슬라이드 참조
    - `isAnchorSlide` (line 1395-1402): `id !== 'toc-placeholder'` 조건 제거 → 통합 슬라이드가 markmap 컨테이너 + H1 sibling anchor 두 역할 양립
    - `lib/config.js`+`Projects/LlmAndVibeCoding/_config.yml`: `toc_placeholder` 디버그 옵션 의미를 주석으로 명시 (id 마커와 별개)
* 검증:
    - LlmAndVibeCoding 02·03·04 빌드: `id="toc-placeholder"` 단일 슬라이드 통합 (이전 9 sections → 8 sections), `data-heading-level="1"` + `layout-_toc` + `id="toc-placeholder"` 세 역할 부여
    - 영향 없음 회귀: 01-opening, 02.1~04.2 leaf, m2SlideStyle2_chapter (H3 0개), m2SlideStyle1_single·layoutTest (single mode) 변동 없음
    - LlmAndVibeCoding_test (`toc_placeholder: true` 디버그 옵션) 동작 보존
    - JS 변경 빌드 산출물 반영 확인 (02-llm-tool-evolution.html:2185 isAnchorSlide)

## Issue136. Chapter 모드 ⇤/⇥ 계층 인식 sibling 점프 (main/sub 구분) (등록: 2026-05-09, 해결: 2026-05-09, commit: ef8e2a6) ✅
* 목적: Chapter 모드 ⇤(Home/`,`)/⇥(End/`.`)를 main/sub 챕터 계층을 인식하는 sibling 점프로 변경. main 조장에서 ⇥ 누르면 다음 main으로 직행(중간 sub 건너뜀). sub 조장에서는 같은 부모의 다음 sub로 이동
* 상세:
    - 재현: `Projects/LlmAndVibeCoding/slide/02-llm-tool-evolution.html#/toc-placeholder`(main 챕터 02 TOC)에서 End 누름 → 기대값 `03-vibecoding-concept.html?fwd=1`(다음 main)이나 실제 `02.1.chat-based.html?fwd=1`(서브챕터)로 이동
    - 근본 원인: `lib/agenda.js:179-185`의 `_getAdjacentChapter`가 main(`##`)과 sub(`###`) 엔트리를 flat 배열로 평탄화 → `getNextChapter('02-...')` → `02.1.chat-based.html` 반환
    - 부작용: ⇥가 →·↓와 동일 동작이 되어 단축키 의미 상실. 서브 개요가 많은 프로젝트(LlmAndVibeCoding 등) 빠른 탐색 불가
* 카테고리: Frontend (키 네비게이션) + Generator (agenda.js)
* 구현 명세:
    - `lib/agenda.js` 신규 함수: `getNextSiblingChapter`·`getPrevSiblingChapter` (level-aware walk — entry level N 기준 step 방향 첫 `level ≤ N` 매치 반환)
    - `lib/html-builder.js`: `PREV_SIBLING_CHAPTER`/`NEXT_SIBLING_CHAPTER` 변수 주입, Chapter ⇤/⇥ 핸들러를 sibling 변수로 교체. ↓·→ sequential 이동은 기존 `NEXT_CHAPTER`(파일 순서) 유지
    - Chapter ⇥ boundary는 K5 무동작 정책 유지 (마지막 main이 명확한 종착점). Chapter ⇤ boundary는 Issue114 첫 챕터 → `agenda?back=1` parent fallback 유지
    - `_doc_design/key_navigation.md` 단축키 표·K4·K5·구현 매핑·변경 이력 갱신
* 검증:
    - 빌드된 `02-llm-tool-evolution.html`에 `NEXT_SIBLING_CHAPTER='03-vibecoding-concept.html'` 주입 (sub 02.1~02.3 skip)
    - 02.1 → NEXT=02.2 / PREV=02 (부모 fall-up)
    - 02.3 → NEXT=03 (부모의 다음 main fall-up)
    - 마지막 main 08 → NEXT=`''` → 무동작 (사용자 확인)
    - m2SlideStyle2_chapter 회귀 빌드 정상

## Issue133. Single 모드 ⇤/⇥ boundary fallback (Chapter Issue114 대칭) (등록: 2026-05-09, 해결: 2026-05-09, commit: ef8e2a6) ✅
* 목적: Single 모드에서 첫 H1 anchor 또는 그 본문에서 ⇤(Home/`,`)를 누르면 `agenda.html?back=1`로, 마지막 anchor/본문에서 ⇥(End/`.`)를 누르면 `agenda.html?fwd=1`로 fall-through하여 navigation dead-end 회피
* 상세:
    - 직전 동작: Single 모드 `findPrev/NextSiblingAnchorIndex` 부재 시 무동작 → 사용자 navigation 막힘 인식
    - 재현: `Projects/m2SlideStyle1_single/slide/index.html#/2`에서 Home → 기대값 `agenda.html?back=1`이나 실제 무동작
    - Chapter Issue114 boundary fallback과 정책 대칭 (단 Chapter ⇥ 마지막 main은 K5 무동작 유지 — 비대칭 사유: Chapter는 마지막 main이 명확한 종착점, Single은 deck 내부 anchor가 끝이라 fallback 필요)
* 카테고리: Frontend (키 네비게이션)
* 구현 명세:
    - `lib/html-builder.js` Single 분기 Home/End 핸들러에서 `prevAnchorIdx < 0` / `nextAnchorIdx < 0`일 때 `window.location.href = 'agenda.html?back=1'` / `'agenda.html?fwd=1'` 분기 추가
    - `_doc_design/key_navigation.md` ⇤/⇥ 단축키 표 Single 컬럼 + K5 결정 + 변경 이력 갱신
* 검증:
    - 빌드된 `index.html` 키 핸들러 line 2987(`?back=1`), 3050(`?fwd=1`) Issue133 fallback 주입 확인
    - 브라우저 수동: single mode 첫·마지막 anchor에서 Home/End → agenda 이동
    - chapter mode 회귀: Cover ⇤ 무동작, 첫 챕터 ⇤ → agenda?back=1, 마지막 main ⇥ 무동작 유지

## Issue130. Cover instructor(author+contact) 영역 노란 테두리 (등록: 2026-05-06, 해결: 2026-05-09, commit: 06aa280) ✅
* 목적: `_cover` 레이아웃의 instructor 영역(name + contact)을 노란색 사각형 테두리로 강조하여 시각적 구분
* 상세:
    - 대상 셀렉터: `.reveal section.layout-_cover .cover-instructor`
    - default_lec theme `slide.css`에 적용 (default theme은 별도 검토 후 진행)
    - base.css는 건드리지 않음 (theme 단위 스타일로 우회)
* 카테고리: Theme
* 구현 명세:
    - `theme/default_lec/slide.css`에 `.cover-instructor` 박스 스타일 추가
    - `border: 2px solid #FFD700;` (gold/yellow), `padding: 0.4em 0.8em;`, `border-radius: 6px;`, `display: inline-block;`

## Issue135. _toc 슬라이드 markmap이 동일 페이지 슬라이드 이동 시 작게 다시 그려지는 문제 (등록: 2026-05-09, 해결: 2026-05-09, commit: 35221b2) ✅
* 목적: Issue134 후속. 다른 페이지에서 toc-placeholder로 진입할 때는 정상이지만 같은 페이지 내 슬라이드 이동(`slidechanged` 이벤트) 시 markmap이 좌상단에 작게 다시 그려지는 회귀 해결
* 상세:
    - 재현: `02-llm-tool-evolution.html?fwd=1#/2`에서 ←로 `#/toc-placeholder` 이동 시 markmap 축소. 반면 `01-opening.html`에서 →로 진입 시는 정상
    - 원인: Issue134 수정에서 `refit()`이 `initTocMarkmapIfNeeded` 함수 내부 closure로 정의됨. `markmapInitialized=true` 이후의 early-return 경로(`slidechanged`·resize)는 그 closure에 접근 못 하고 raw `markmapInstance.fit()`만 호출 → BCR monkey-patch 적용 안 됨 → reveal `transform: scale` 영향으로 작게 fit
    - 영향 파일: `lib/html-builder.js` (toc markmap init·resize handler)
* 카테고리: Frontend (Markmap·TOC 렌더링)
* 구현 명세:
    - `refit` 함수를 `refitMarkmap`으로 외부 스코프로 끌어내 모든 호출 경로(initial init, slidechanged early-return, resize handler)가 동일 monkey-patch 적용 함수 사용
    - `slidechanged` early-return 경로에 다단 retry(rAF + 50ms + 300ms) 추가 — flex 재계산·reveal transform settle 시점 차이 보정
    - window resize handler의 raw `markmapInstance.fit()` 호출도 `refitMarkmap()`으로 교체
    - debug_TECH.md § Markmap·TOC 렌더링 사례에 본 회귀 박제
* 검증:
    - `02-llm-tool-evolution.html?fwd=1#/2` → ←/Home으로 `#/toc-placeholder` 이동 시 markmap이 컨테이너 가득 채움
    - `01-opening.html`에서 → 진입 시 정상 동작 무회귀
    - window resize 시에도 일관된 비율 유지
    - 빌드 산출물에서 `markmapInstance.fit()` 단독 호출이 try/finally 안(refitMarkmap 내부)에만 존재하는지 grep 검증

## Issue134. _toc 슬라이드 markmap이 reveal.js 안에서 작게 그려지는 문제 (등록: 2026-05-09, 해결: 2026-05-09, commit: c41e988) ✅
* 목적: chapter `_toc` 슬라이드(`#toc-placeholder`)에서 markmap이 컨테이너의 좌상단 일부만 차지하는 시각 회귀 + autoToc 슬라이드의 빈 SVG 영역을 일관되게 처리
* 상세:
    - 증상 ① — `02-llm-tool-evolution.html#/toc-placeholder` 등에서 markmap이 toc-markmap 영역의 1/3만 채움. agenda.html(standalone)은 정상
    - 증상 ② — `02.1.chat-based.html` 같은 sub-chapter의 autoToc `_toc` 슬라이드에서 markmap SVG가 빈 채로 큰 박스만 노출
    - 증상 ③ — 윈도우 높이를 줄이면 markmap이 더 작아지는 비례 변화
    - 영향 파일: `lib/html-builder.js`(toc markmap 초기화), `theme/default/slide.css`(빈 markmap 숨김)
    - 영향 프로젝트: LlmAndVibeCoding, m2SlideStyle1_single, m2SlideStyle2_chapter, layoutTest
* 카테고리: Frontend (Markmap·TOC 렌더링)
* 구현 명세:
    - 증상 ① 원인: `markmap.fit()`이 `svg.getBoundingClientRect()`로 측정하는데 reveal.js `.slides` `transform: scale(X)`가 BCR에 visual(scaled) 크기를 반환하게 만들어 markmap이 좁은 영역에 fit한다고 오판
    - 증상 ① 해결: `refit()` 함수에서 `markmap.fit()` 호출 직전 `svg.getBoundingClientRect`를 logical px(`parentNode.offsetWidth/offsetHeight`) 반환하도록 monkey-patch, fit() 직후 try/finally로 원복
    - 증상 ② 원인: markmap JS는 `id="toc-placeholder"` 단일 슬라이드만 렌더하나 `slide-parser.js`의 autoToc는 다른 H1/H2 anchor에도 `layout-_toc` 부여 → 빈 SVG 노출
    - 증상 ② 해결: theme CSS에 `.layout-_toc:not(#toc-placeholder) > .toc-markmap { display: none }` 추가
    - 추가 안전장치: rAF + 50/300/800ms 다단 fit() + ResizeObserver + agenda와 동일한 `deriveOptions` 기본 옵션
    - 디버깅 박제: `_doc_work/debug_TECH.md` § Markmap·TOC 렌더링 (Issue134 사례)
* 검증:
    - 빌드된 `02-llm-tool-evolution.html#/toc-placeholder` markmap이 toc-markmap 컨테이너 전체 채움
    - 윈도우 크기 변경 시에도 일관된 비율 유지(BCR monkey-patch 효과)
    - `02.1.chat-based.html` 등 autoToc 슬라이드는 빈 박스 없이 cards만 노출
    - 대표 프로젝트 4개 모두 재빌드: LlmAndVibeCoding, m2SlideStyle1_single, m2SlideStyle2_chapter, layoutTest

# ⏸️ 보류

## Issue42. `slide_ratio` 옵션 완전 제거 (보류: 2026-05-01)
* 목적: theme 시스템 도입 후 사실상 단일 분기(`none`)만 사용되는 `slide_ratio` 옵션을 코드·CSS·설정에서 완전 제거
* 상세:
    - 도입 배경: c0a24ef(2025-11-28)에서 Reveal.js 기본 중앙정렬을 끄기 위해 `.ratio-none`/`.ratio-16-9`/`.ratio-3-2` 클래스 + `Reveal.initialize({width,height})` 분기로 도입
    - 현재 상태: 모든 프로젝트 `_config.yml`이 `none`만 사용. `16:9`/`3:2` 분기는 데드 코드
    - 1차 정리(2026-05-01): `_config.org.yml`에는 옵션을 남겨두고, `Projects/{layoutTest, m2SlideStyle2_chapter, MarkdownGraph}/_config.yml`에서 라인 제거 완료
* 보류 사유: `.reveal.ratio-none .slides { inset:0; transform:none }`이 현 레이아웃의 핵심 reset이므로 단순 제거는 불가. 셀렉터를 `.reveal .slides`로 바꾸는 css 수정이 필요한데 [`CLAUDE.md`](CLAUDE.md) "CSS 수정 시 주의사항"의 위험 속성(`transform`, `position`, `inset`)에 직접 닿는 작업이라 회귀 테스트 비용이 큼. theme 시스템 안정화 후 재개.
* 재개 조건:
    - default·nowage 양쪽 테마에서 `.ratio-none` 의존성을 한꺼번에 제거할 수 있는 시점
    - 모든 프로젝트의 첫·중간·끝 슬라이드 시각 회귀 테스트 자동화 마련
* 구현 명세 (재개 시):
    - `lib/generate-slides.js:10,48-51,1486-1499,1738,1765-1766` `SLIDE_RATIO`/`ratioClass`/`revealWidth`/`revealHeight` 분기 삭제
    - `theme/default/slide.css:55,67`, `theme/nowage/slide.css:57,69` 셀렉터 `.reveal.ratio-none` → `.reveal`
    - `_config.org.yml:50` 라인 제거
    - Reveal.initialize 호출부 width/height 인자 제거 (기본값 위임)

# 🚫 취소

# 📜 참고

## Issue25. 배경 이미지 설정 기능 (보류: 2026-05-01)
* 마크다운 메타데이터(YAML frontmatter)를 통해 전체 슬라이드의 배경 이미지를 지정하는 기능 구현
* `background` 속성으로 이미지 경로 혹은 color 지정 지원
* **보류 사유**: theme/{name}/slide.css 시스템(Issue36/38)으로 동일 목적 달성 가능 (ex: `.reveal { background: url('img/bg.png') center/cover; }`). 비기술 사용자가 마크다운만으로 슬라이드별 배경을 자주 바꾸는 use-case가 누적되면 재검토.

