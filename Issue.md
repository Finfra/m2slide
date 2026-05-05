# Issue Management
* https://github.com/Finfra/m2slide/issues
* Issue HWM: 113
* 오래된 Issue는 `z_old/old_issue.md`에 저장
* Save Point :
    - **v0.6.1 (2026-05-05)** — fix: Issue107·108·109·110 4건 완료. cross-page flicker 가드 SSOT 상수화 + 페이지번호 1-based hash 일치 + outer padding transition 가시화 + ^/v 마름모 네비게이션
    - **v0.6.0 (2026-05-05)** — release: 9키 네비게이션 SSOT 정립 + 트리 탐색 의미 도입 (Issue71-106 36건). Backward 트랜지션·anchor 자식 우선·leaf fall-through 등 키 동작 정밀화 + Pandoc columns/rows 호환 + 메타데이터 SSOT 통합
    - **v0.5.0 (2026-05-03)** — release: 71건 완료 이슈 z_old 아카이브, CHANGELOG.md 신규 (Issue70까지 포함)
    
# 🤔 결정사항
## _meta.yml파일 사용 안함.
* AGENDA.md나 {프로젝트명}.md파일의 yaml front matter에 추가하기로 함. 

## img 폴더 이중 복사 유지 (소스 `img/` + 빌드 `slide/img/`)
* 결정: 현행 `fs.cpSync` 방식 유지
* 이유: `slide/` 폴더를 통째로 삭제 후 재생성하는 빌드 패턴이 잦음


# 🌱 이슈후보
1. 마름모 네비게이션 보기 옵션과 페이지 보기 오션 추가
2. 개요2이상의 페이지에서 첫번째 바 사라지는 버그(file:///Users/nowage/_git/__all/videoMaker/lib/m2slide/Projects/m2SlideStyle1_single/slide/index.html?fwd=1#/16)

# 🔥 진행중

## Issue112. 챕터모드 페이지 번호 전체 기준 + breadcrumb 챕터 번호 제공 (등록: 2026-05-05)
* 카테고리: Frontend
* 목적: 챕터 모드(다중 md + AGENDA.md)에서 페이지 번호가 각 챕터 HTML마다 `1/N`으로 reset됨. 발표·교재 사용 시 사용자가 전체 진행률을 파악하기 어려움. 페이지 번호를 **전역 누적**으로 표시하고, 챕터 번호 breadcrumb을 페이지 번호 옆에 표시하여 위치 인지를 돕는다. 단일 모드는 영향 없음(이미 전역 1/N).
* 상세:
    - 현행: `lib/html-builder.js:742` `slideNumber: 'c/t'` (Reveal.js 기본 — 챕터 HTML별 c/t)
    - 변경 후 표시(예시): `1.2 > 5/123` — 챕터번호.섹션 > 전역페이지/총합
        - `1.2`: AGENDA.md 기반 챕터 번호 (H2/H3 순서 기반, 1.2 = 첫 메인의 2번째 하위)
        - `5`: 전역 페이지 번호 (Agenda 페이지부터 누적 시작, cover 제외)
        - `123`: 전체 슬라이드 총합 (Agenda + 모든 챕터 슬라이드 합)
    - 기준점:
        - cover 슬라이드: 전역 카운트에서 **제외**
        - Agenda(index.html) 슬라이드: 전역 카운트 **시작점**(1번)
        - 각 챕터 HTML의 슬라이드: Agenda 다음부터 등장 순서로 누적
    - 단일 모드: 변경 없음(현행 `c/t` 유지). breadcrumb 미표시.
* 구현 명세:
    - 1단계 — `lib/agenda-parser.js`(또는 동일 역할 모듈)에서 챕터 트리 → `chapter_meta.json`(파일별 `{chapterNumber, slideOffset, totalSlides}` 매핑) 산출
        - `slideOffset`: 각 챕터 HTML의 첫 슬라이드가 전역 몇 번째인지
        - `totalSlides`: 전체 합계 (모든 빌드 산출물 공유)
        - 빌드 1차 패스: 각 md 슬라이드 수 카운트 → offset/total 계산
        - 빌드 2차 패스: 각 HTML에 메타 주입
    - 2단계 — `lib/html-builder.js` Reveal `slideNumber` 콜백 사용:
        - `slideNumber: function(slide) { return chapterNum + ' > ' + (slideOffset + Reveal.getIndices(slide).h + 1) + '/' + totalSlides; }` (1-based 유지)
        - chapterNum/slideOffset/totalSlides는 빌드 시 각 HTML에 inline 주입
    - 3단계 — `_config.yml` 신규 옵션:
        - `page_number_mode: 'global' | 'local'` (default: chapter 모드는 `global`, single은 `local`)
        - `breadcrumb: true | false` (default: chapter 모드에서 `true`)
    - 4단계 — Agenda(index.html) 페이지 번호 표시: `Agenda > 1/123`(또는 chapter `0`)
    - 5단계 — 검증:
        - `m2SlideStyle2_chapter`: 챕터 1의 5번째 슬라이드 → `1 > 5/N` 표시 확인 (N은 전체 합)
        - `m2SlideStyle1_single`: 변경 없이 `c/t` 유지 확인
        - cover 슬라이드: 페이지 번호 표시 자체가 숨겨져 있으므로 영향 없음 (Issue107 마름모/페이지번호 가시성 SSOT 그대로)
        - URL hash 1-based 일관성(Issue108) 유지 확인

## Issue111. 슬라이드 전환·요소 애니메이션 옵션 정리 (등록: 2026-05-05)
* 카테고리: Frontend
* 목적: 현행 슬라이드 전환(좌우 slide)·기본 트랜지션을 재검토하여 reveal.js가 제공하는 애니메이션 옵션(transition, fragment, auto-animate, background)을 m2slide에서 어떤 형태로 노출·제어할지 결정. 불필요한 효과는 제거, 유용한 효과는 마크다운 frontmatter·메타로 일관 노출.
* 상세:
    - 현행: `slide` 트랜지션이 글로벌 적용. fragment·auto-animate는 `<!-- .element / .slide: ... -->` syntax 미검증 (m2slide 자체 파서가 reveal.js markdown 플러그인 syntax를 보존하는지 불명)
    - 검토 항목:
        - **Transition**: `none` / `fade` / `slide` / `convex` / `concave` / `zoom` 중 기본값·옵션 노출 방식
        - **Fragment** (단계별 등장): `fade-in`, `fade-up`, `grow`, `highlight-*`, `strike` 등 — m2slide 마크다운 파서가 HTML 주석 메타를 통과시키는지 테스트
        - **Auto-Animate**: `data-auto-animate` 슬라이드 간 자동 모핑 — 코드/다이어그램 진화 표현용
        - **Background transitions**: `data-background-transition` 단독 옵션
        - **Auto-slide**: `data-autoslide` 자동 재생
    - 제거 후보: 잔상·flicker 유발 가능성이 있거나(이미 Issue104·110에서 transition gating 추가됨) 발표 시 산만한 효과
* 구현 명세:
    - 1단계 — 테스트 프로젝트 `Projects/animationTest/` 신설:
        - 각 transition·fragment·auto-animate를 한 슬라이드씩 배치
        - `m2slide.sh animationTest` 빌드 후 실제 동작 검증
    - 2단계 — 동작 확인된 효과 SSOT 문서화 ([_doc_design/animation.md](_doc_design/animation.md) 신규):
        - frontmatter 키 (`transition`, `transition_speed`, `auto_animate` 등) 정의
        - 슬라이드 메타 syntax (`#fragment-fade-up` 같은 m2slide 확장 또는 reveal 표준 주석 사용)
    - 3단계 — `lib/html-builder.js` Reveal.initialize 옵션 노출 + 마크다운 파서에 메타 변환 추가
    - 4단계 — [`md-m2slide-rules.md`](.claude/rules/md-m2slide-rules.md) 업데이트, [noteForHuman.md](noteForHuman.md) 사용자 가이드 추가
    - 검증: animationTest + 기존 3개 대표 프로젝트(`m2SlideStyle1_single`, `m2SlideStyle2_chapter`, `layoutTest`) 시각 회귀 없음 확인

# 📕 중요

# 📙 일반

# 📗 선택


# ✅ 완료

## Issue113. Agenda 페이지 디자인 개선 — 고양이 배경·제목 고정·선 회피·frame 비례 폰트 (등록: 2026-05-05, 해결: 2026-05-05, commit: a5c7f03) ✅
* 카테고리: Theme
* 목적: standalone `agenda.html`의 시각 마감을 정리. (1) 마스코트 통일감을 위해 우상단 puffer 대신 finfraCat을 흐리게 배치, (2) agenda 헤더 타이틀을 프로젝트명이 아니라 "Agenda"로 고정하되 frontmatter에서 override 가능, (3) 제목이 상단 노랑 가로선과 겹치지 않게 위치 보정, (4) agenda-frame 폰트가 px 기준이라 frame 크기에 따라 균형이 깨지는 문제를 reveal.js content 슬라이드와 동일한 letterbox-aware 스케일로 변경.
* 해결:
    - 배경 — `theme/default/slide.css` `.layout-_agenda::after` pseudo로 finfraCat을 50% opacity로 분리 배치 (요소 자체 opacity면 자식까지 흐려짐). 위치·크기 모두 `--frame-w`/`--frame-h` 비례로 설정 + `translateY(-15.5%)`로 미세 보정.
    - 제목 고정 (`lib/agenda.js`, `lib/generate-slides.js`, `lib/html-builder.js`):
        - `getAgendaPageTitleFromMd()` 신설 — AGENDA.md frontmatter `agenda_title:` 추출
        - `lib/config.js`에 `agendaTitle` 기본값 `'Agenda'` + `_config.yml` `agenda_title:` 파싱
        - `generate-slides.js`: `agendaPageTitle = AGENDA frontmatter > _config.yml > 'Agenda'` 우선순위 결정 후 `generateAgendaHTML({ agendaTitle, documentTitle, ... })`로 분리 전달
        - `generateAgendaHTML` 시그니처에 `agendaTitle`(헤더용) + `documentTitle`(브라우저 탭 `<title>`용) 추가, 구 호출 호환 위해 기존 `title` 인자도 fallback 유지
    - 선 겹침 방지 — `.layout-_agenda .toc-page-header { padding: calc(var(--frame-h) * 0.03) ... }`로 노랑 가로선(top:12 + h:10 = 22px) 아래에 위치 + `position: relative; z-index: 1`로 하단 보장
    - frame 비례 폰트:
        - `body.agenda-page` 에 `--frame-w` / `--frame-h` CSS 변수 정의 — base.css §12 `.agenda-frame { width/height min(...) }` 공식을 그대로 재현하여 reveal.js content 슬라이드의 letterbox된 실제 frame 크기와 동일
        - `html.ratio-fill body.agenda-page` 별도 분기 (fill 모드)
        - `body.agenda-page .agenda-frame { font-size: calc(var(--frame-h) * 0.022) }` → 1080p frame ≈ 23.76px → `.toc-page-title 1.8em` ≈ 42.8px (reveal 슬라이드 톤과 유사)
        - 고양이·헤더 padding도 `calc(var(--frame-h) * X)` 형식 → viewport 변화와 무관하게 frame 비율 그대로 유지
        - `container-type: size`는 markmap SVG 사이징을 깨뜨리므로 미사용 (CSS 변수 방식 채택)
    - toc-markmap 영역 `margin-top: calc(var(--frame-h) * 0.03)` — 마스코트와 시각 분리
    - base.css 미수정 (theme에서 모두 제어)
* 검증:
    - 빌드: `m2SlideStyle1_single`, `m2SlideStyle2_chapter`, `MarkdownGraph`, `layoutTest` 4개 프로젝트 정상
    - 모든 `slide/agenda.html` 헤더 타이틀 `"Agenda"` 고정 출력 확인
    - 브라우저 탭 `<title>` 프로젝트명 유지 확인 (`m2Slide2 : Chapter — Agenda`)
    - frontmatter `agenda_title: 차례` 추가 시 헤더만 `차례`로 override + 탭 타이틀도 `m2Slide2 : Chapter — 차례`로 갱신 → 원복 후 기본값 복귀 검증
    - Chrome으로 `Projects/m2SlideStyle2_chapter/slide/agenda.html` 시각 검증 (창 크기 변경 시 frame 비례 스케일 유지 확인)

## Issue110. 챕터 간 이동 시 cross-page flicker 발생 (등록: 2026-05-05, 해결: 2026-05-05, commit: 6af44f8) ✅
* 카테고리: Frontend
* 목적: 챕터 모드에서 `?fwd=1` / `?back=1` / `?last=1` 파라미터로 페이지 전환 시, Reveal.js 초기화 이전 raw `.reveal` 콘텐츠가 paint되어 layout 무너진 상태가 보이는 flicker. Issue104의 `body.m2-cross-loading .reveal { visibility: hidden }` 가드는 body 파싱 후 실행되어 차단 못함.
* 해결:
    - `lib/html-builder.js` 내 4개 SSOT 상수 신설 — generateHTML/Cover/Agenda 모든 빌더가 공유:
        - `M2_CROSS_GUARD_HEAD_HTML` — `<head>` 안 인라인 script로 `location.search`에 `back=1`/`fwd=1`/`last=1` 포함 시 `document.documentElement.classList.add('m2-cross-loading')` 즉시 실행 (body 파싱 전에 동작)
        - `M2_CROSS_GUARD_CSS` — `html.m2-cross-loading .reveal`, `html.m2-cross-loading .agenda-frame`, `body.m2-cross-loading .reveal`, `body.m2-cross-loading .agenda-frame { visibility: hidden }` — html/body 양쪽 + Reveal/agenda 양쪽 컨테이너 매칭
        - `M2_RELEASE_FN_JS` — `m2ReleaseCrossGuard()` 함수: `Reveal.on('ready')` 시점에 documentElement·body 양쪽 클래스 정리
        - `M2_NAV_HELPER_JS` — `m2NavWithSignal(url, signal)` helper: hash가 포함된 URL에 시그널을 안전 주입 (단순 append 시 `index.html#/2?fwd=1` 형태로 깨지는 회귀 방지)
* 검증: `m2SlideStyle2_chapter` 빌드 후 `02-code-syntax.html`에 가드 마커(html/body 양쪽 셀렉터, m2ReleaseCrossGuard 함수) 정상 주입 확인

> **v0.6.1 (2026-05-05)** — Issue110 cross-page flicker 가드 SSOT 상수화 (`M2_CROSS_GUARD_*`, `M2_NAV_HELPER_JS`)

## Issue107. 슬라이드 우측 하단 네비게이션 UI 정리 — `^/v` 버튼을 `</>` 사이에 배치 + 비활성 회색 처리 (등록: 2026-05-05, 해결: 2026-05-05, commit: 67834c3) ✅
* 카테고리: Frontend
* 목적: 우측 하단 `nav-up-btn`의 "상위" 텍스트 군더더기. ↑/↓ 키 동작에 마우스 진입점 부재 → Reveal `</>` 사이에 `^/v` 마름모 배치 + 비활성 회색 처리.
* Walkthrough:
    - `nav-up-btn` DOM/CSS 제거 ([lib/html-builder.js](lib/html-builder.js))
    - Reveal `.navigate-up`·`.navigate-down` 강제 표시 + `.m2-enabled` 클래스로 활성/비활성 회색 처리
    - 클릭 핸들러: `ArrowUp`/`ArrowDown` keydown 시뮬레이션 (기존 핸들러 재사용)
    - `Reveal.on('ready'/'slidechanged')`에서 `m2UpdateNavControls()` 활성 상태 재계산
    - 좌표 컴팩트 마름모: ↑ `bottom: 2.9em`, ↓ `bottom: 0em`, → `right: 0.8em` (←/→ default 유지)
    - 페이지 번호: viewport 우측 하단 fixed `right: 20px, bottom: 20px, width: 60px, height: 14px` — 마름모 정중앙

> v0.6.0 (2026-05-05) 시점 Issue71-106 36건 아카이브 → [`z_old/old_issue.md`](z_old/old_issue.md)
> v0.5.0 (2026-05-03) 시점 Issue~70 71건 아카이브 → [`z_old/old_issue.md`](z_old/old_issue.md)

## Issue109. 슬라이드 transition 애니메이션을 outer padding 영역까지 가시화 (등록: 2026-05-05, 해결: 2026-05-05, commit: 7907b62) ✅
* 카테고리: Theme
* 목적: `slide_outer_padding`(viewport ↔ `.reveal` 사이의 대칭 여백) 영역에서 슬라이드 전환 애니메이션이 보이지 않음. 페이지 콘텐츠는 padding 안쪽에 정상 표시되지만, 좌·우 슬라이드 transition이 padding 영역까지 흐르지 않고 잘려서 outer padding이 단절감을 줌. transition을 outer padding 영역까지 paint하여 슬라이드가 양 옆으로 자연스럽게 들어오고 나가는 인상을 회복.
* 해결:
    - `lib/css/base.css:189-209` outer padding 블록에 overflow visible 체인 추가:
        - `html, body { overflow: visible !important }` — reveal.js reset.css의 기본 `overflow: hidden` 무력화
        - `.reveal, .reveal .slides { overflow: visible !important }` — transition 중 section이 `.reveal` 외부로 이동해도 paint 유지
    - `body { padding: var(--slide-outer-padding); box-sizing: border-box }` 트릭(Issue63)은 그대로 유지하여 Reveal scaling 1920×1080 fit 동작 보존
    - **검증**: `m2SlideStyle1_single` / `m2SlideStyle2_chapter` / `layoutTest` 3 프로젝트 빌드 + 사용자 브라우저 확인 완료 ("잘작동함")
    - **회귀 없음**: `display: flex`·`height: 100%`·`position`·`transform` 등 레이아웃 속성 변경 없음 (overflow만 조정)

## Issue108. 페이지 번호 표시와 URL hash 1-based 일치 (등록: 2026-05-05, 해결: 2026-05-05, commit: 12ad52b) ✅
* 카테고리: Frontend
* 목적: 우측 하단 페이지 번호 표시(`slideNumber: 'c/t'`)는 1-based로 노출되지만 Reveal.js URL hash는 0-based로 시작하여 사용자가 보는 번호와 주소가 어긋남(예: 표시 `4/34` ↔ 주소 `#/3`). 두 값을 1-based로 통일하여 TOC 슬라이드 생략 여부와 무관하게 페이지 번호와 hash가 일관되게 유지되도록 함.
* 해결:
    - `lib/html-builder.js:691` `Reveal.initialize`에 `hashOneBasedIndex: true` 옵션 추가 — Reveal.js 5.0.4가 정식 지원하는 옵션으로 hash 텍스트만 ±1 시프트(내부 인덱스는 0-based 그대로 유지하므로 키 핸들러 영향 없음)
    - TOC anchor 링크 4곳 +1 시프트 (hashOneBasedIndex 보정):
        - `lib/html-builder.js:94` H1 markmap branch
        - `lib/html-builder.js:105` H2 markmap leaf
        - `lib/html-builder.js:234` chapter-card list (plain 슬라이드)
        - `lib/html-builder.js:275` chapter-card list (layout 슬라이드)
    - Cover 페이지 빌더(`lib/html-builder.js:1759`)는 `hash: false`/`slideNumber: false`라 본 이슈 영향 없음
* 검증:
    - `m2SlideStyle1_single`(단일) — cover 진입 시 `#/1`, 표시 `1/34` 일치, → 키 진행 시 `#/2`/`2/34` 동기화, agenda TOC anchor 클릭 시 의도된 슬라이드로 정확히 이동
    - `m2SlideStyle2_chapter`(챕터) — 7개 챕터 HTML 모두 hash↔표시 일치
* 회귀 진단 기록: 초기 수정 직후 사용자가 "→ 안 되고 PageDown만 됨" 보고 → `hashOneBasedIndex` 단독 적용은 회귀 아님(브라우저 캐시 문제)으로 확인. agenda anchor 링크의 0-based 가정이 hashOneBasedIndex와 충돌하여 잘못된 슬라이드로 진입하던 부수 문제는 anchor +1 시프트로 해결.

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

