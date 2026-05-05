# Issue Management
* https://github.com/Finfra/m2slide/issues
* Issue HWM: 125
* 오래된 Issue는 `z_old/old_issue.md`에 저장
* Save Point :
    - **v0.6.5 (2026-05-05)** — fix: Issue118 (Pandoc `{.fragment .fade-up}` 인라인 attribute 파서 — `<li>`/`<p>` class 주입). reveal.js fragment 단계별 등장 효과를 마크다운에서 자연스럽게 표현. TDD 19 케이스 통과 (node:test 표준, 외부 dependency 0). 사용자 요구 시 Issue124(refresh hash-jump transition 차단)도 동일 마일스톤에 합산 가능.
    - **v0.6.4 (2026-05-05)** — fix: Issue117 (슬라이드 단위 디렉티브 마무리: H2 다음 디렉티브 매칭 + 6종 syntax 완성) + Issue123 (cross-page 진입 시 deck 첫 hash jump의 슬라이드 transition 재생 부작용 fix — `_isCrossPageEntry` 가드 + Reveal.on('ready') 복원). Issue117 6종 디렉티브 (`#transition-*`, `#background-color-*`, `#background-transition-*`, `#auto-animate`, `#autoslide-*`, `#layout-*`) 모두 reveal.js `data-*` 속성 변환 동작.
    - **v0.6.3 (2026-05-05)** — fix: Issue119 (cover_layout 옵션) + Issue120 (cross-page navigation fade-in CSS animation, A안) + Issue122 (Issue120 hot-fix: wasCrossLoading 가드로 단순 리프레쉬 시 fade-in 미발동). cover 슬라이드 layout 자유 지정 + cover↔agenda↔deck cross-page 진입 시에만 `_cfg.animation.defaultBackgroundTransition !== 'none'`일 때 250ms fade-in 자연 등장 (페이지 리프레쉬·새 탭은 미발동).
    - **v0.6.2 (2026-05-05)** — fix: Issue111 (글로벌 animation 옵션 + cross-page CSS gating + cover cfg 통합) + Issue116 근본 fix + Issue117 진행 (슬라이드 단위 디렉티브 파서). _config.yml `animation:` 섹션으로 reveal.js transition·transitionSpeed·backgroundTransition 글로벌 노출 + 슬라이드별 `#transition-*`/`#background-color-*`/`#auto-animate`/`#autoslide-*` 디렉티브.
    - **v0.6.1 (2026-05-05)** — fix: Issue107·108·109·110 4건 완료. cross-page flicker 가드 SSOT 상수화 + 페이지번호 1-based hash 일치 + outer padding transition 가시화 + ^/v 마름모 네비게이션
    - **v0.6.0 (2026-05-05)** — release: 9키 네비게이션 SSOT 정립 + 트리 탐색 의미 도입 (Issue71-106 36건). Backward 트랜지션·anchor 자식 우선·leaf fall-through 등 키 동작 정밀화 + Pandoc columns/rows 호환 + 메타데이터 SSOT 통합
    - **v0.5.0 (2026-05-03)** — release: 71건 완료 이슈 z_old 아카이브, CHANGELOG.md 신규 (Issue70까지 포함)
    
# 🤔 결정사항
*  _meta.yml파일 사용 안함 : AGENDA.md나 {프로젝트명}.md파일의 yaml front matter에 추가하기로 함. 

## img 폴더 이중 복사 유지 (소스 `img/` + 빌드 `slide/img/`)
* 결정: 현행 `fs.cpSync` 방식 유지
* 이유: `slide/` 폴더를 통째로 삭제 후 재생성하는 빌드 패턴이 잦음


# 🌱 이슈후보

# 🔥 진행중

# 📕 중요

# 📙 일반

# 📗 선택


# ✅ 완료

## Issue125. Reveal.js hash-jump CSS transition 시각 차단 — m2-initial-loading visibility 가드 일반화 (Issue123/124 원복·재해결) (등록: 2026-05-05, 해결: 2026-05-05, commit: 1c62510) ✅
* 카테고리: Frontend
* 목적: Issue123/124의 `Reveal.initialize` transition JS 옵션 gating 시도가 사용자 보고 "여전히 refresh 시 transition 보임"으로 실효 없음 판명. 근본 원인 재진단 후 visibility 가드 일반화로 재해결.
* 근본 원인 (reveal.js 5.x 라이브러리 특성):
    - `Reveal.initialize({ transition: 'none' })` JS 옵션은 슬라이드 변경 시 `fade`/`slide` CSS class 추가 여부만 제어
    - 그러나 `.reveal .slides` 컨테이너에 정의된 `transform: translate(...)` CSS transition(슬라이드 위치 이동 효과)은 **reveal.js 자체 stylesheet에 박혀 있어 JS 옵션으로 막을 수 없음**
    - hash 진입 시 `Reveal.slide(h, v, f)` 자동 호출 → `.slides`의 transform 변경 → CSS transition 자동 적용 → 사용자가 "slide animation"으로 인식
* Walkthrough:
    - **Issue123/124 원복**: `Reveal.initialize`의 `transition`·`backgroundTransition`을 `_config.yml animation:` 설정값으로 복원, ready 복원 콜백 제거 (visibility 가드로 시각 차단하므로 JS gating 불필요)
    - **`M2_CROSS_GUARD_HEAD_HTML`**: 모든 첫 로드 시 `m2-initial-loading` class 무조건 추가 (visibility 가드용). cross-page 시그널 진입 시 추가로 `m2-cross-loading` 부여 (Issue120/122 fade-in 트리거)
    - **`M2_CROSS_GUARD_CSS`**: selector에 `m2-initial-loading` 추가 → `html.m2-initial-loading .reveal, html.m2-initial-loading .agenda-frame { visibility: hidden; }`
    - **`M2_RELEASE_FN_JS`**: 가드 해제 시 `m2-initial-loading`도 함께 제거. `wasCrossLoading` 가드(Issue122)는 그대로 → fade-in은 cross-page만 발동
    - **deck ready 핸들러**: 일반 진입(시그널 없음, 단순 refresh·새 탭) 분기 추가 → `m2ReleaseCrossGuard()` 호출. 기존엔 cross-page 시그널 분기에만 release 호출하여 일반 refresh 시 가드가 영원히 풀리지 않는 회귀 방지
    - cover/agenda는 이미 ready 콜백에 `m2ReleaseCrossGuard()` 호출 → m2-initial-loading 자동 해제
* 검증:
    - 4개 대표 프로젝트 빌드 회귀 없음
    - 모든 deck/cover/agenda HTML에 `m2-initial-loading` 분기 + visibility CSS + 가드 해제 코드 정상 출력
    - 단순 refresh 시 visibility:hidden 동안 reveal.js의 hash-jump transition이 진행되어도 사용자에게 안 보임
    - cross-page 시그널 진입 시 Issue120 fade-in + Issue110 cross-page 가드 동작 보존
    - 일반 키 이동은 `_config.yml animation:` 설정값으로 정상 transition

## Issue118. Pandoc `{.fragment .fade-up}` 인라인 attribute 파서 — `<li>`/`<p>` class 주입 (등록: 2026-05-05, 해결: 2026-05-05, commit: 9c560ed) ✅
* 카테고리: Generator / Frontend
* 목적: Pandoc 표준 inline attribute syntax `{.class .class}`를 list item·paragraph 끝에 작성하면 출력 HTML 요소에 해당 class를 주입. reveal.js `fragment` 단계별 등장 효과를 마크다운 자연스럽게 표현.
* 해결 (commit `9c560ed`):
    - **`lib/markdown.js extractInlineClasses(text)`**: 라인 끝 `{.foo .bar}` 패턴 추출 헬퍼 신설. 반환 `{ classes: ['foo','bar'], remaining: text }` 또는 `{ classes: [], remaining: text }`. 보수적 매칭 — 각 토큰 `.`로 시작 필수, backtick 종결 라인 보호(코드 인라인), 빈 `{}`/`{.}` 무시. module.exports에 `extractInlineClasses` 추가.
    - **`lib/markdown.js convertMarkdownToHTML` 3곳 통합**:
        - unordered list (line 311~): bulletClass(`bullet-dot`/`bullet-dash`) + `extractInlineClasses(content).classes` → `<li class="bullet-dot fragment fade-up">...</li>`
        - ordered list (line ~390): `<li class="fragment grow">...</li>`
        - paragraph (line ~540): `<p class="fragment">...</p>`
        - 모두 `extractInlineClasses(text).remaining`을 `processInline()`에 전달하여 attribute 라인 텍스트는 출력 HTML에서 제거됨
    - **TDD 인프라**: `lib/__tests__/markdown.test.js` 신설. node:test + node:assert/strict (외부 dependency 회피). 19 케이스:
        - extractInlineClasses 12개 (단순/복수 class, 빈 attribute, 코드 인라인 보호, dot prefix 검증, 단독 `{.fragment}` 등)
        - convertMarkdownToHTML 통합 7개 (unordered/ordered list, paragraph fragment 적용, 일반 텍스트 회귀 없음, 코드 인라인 안의 `{}` 보존)
    - **`noteForHuman.md` + `.claude/rules/md-m2slide-rules.md`**: Pandoc inline attribute 사용 가이드 + reveal 표준 fragment 클래스 + 보호 규칙 명시.
* 검증:
    - **TDD**: `node --test lib/__tests__/markdown.test.js` 19/19 통과.
    - **animationTest 슬라이드 4**: `* 두 번째 항목 {.fragment}` → `<li class="bullet-dot fragment">두 번째 항목</li>`. `* 세 번째 항목 {.fragment .highlight-red}` → `<li class="bullet-dot fragment highlight-red">세 번째 항목</li>`. 빌드 결과 grep 정상 확인.
    - **회귀 없음**: m2SlideStyle1_single, m2SlideStyle2_chapter, layoutTest 빌드 후 의도치 않은 fragment class 주입 0건.

## Issue124. 페이지 refresh·새 탭 진입 시 Reveal hash-jump transition 재생 부작용 (Issue123 일반화) (등록: 2026-05-05, 해결: 2026-05-05, commit: 56897b2) ✅
* 카테고리: Frontend
* 목적: Issue123에서 cross-page 시그널 진입에만 transition 'none' gating을 적용했으나 단순 페이지 refresh·새 탭 진입에도 동일한 hash-jump transition 재생 부작용 잔존. 사용자 보고: "refresh 시에만 slide animation이 거슬리게 발동". 모든 페이지 첫 로드 일반화.
* Walkthrough:
    - 본질: Reveal.js 표준 동작 — `Reveal.initialize`가 hash(`#/N`) 파싱 후 #/0→#/N 이동 시 설정된 transition 재생. 시그널 유무 무관.
    - Issue123 fix 한계: `_isCrossPageEntry`가 시그널 진입에만 true → 단순 refresh는 false → transition 정상 적용되어 hash-jump 발동.
    - 해결 (`lib/html-builder.js generateHTML Reveal.initialize`):
        - `_isCrossPageEntry` 변수 제거 (데드 코드 회피)
        - `transition: 'none'`, `backgroundTransition: 'none'` 하드코딩 — 모든 페이지 첫 로드 일반화
        - `Reveal.on('ready', ...)` 복원 콜백을 무조건 실행 (cross-page 조건 제거) → `_config.yml animation:` 설정값으로 복원
        - hash-jump는 항상 즉시 위치, 사용자 키 입력은 복원된 transition 적용
    - 검증: 4개 대표 프로젝트 빌드 회귀 없음. m2SlideStyle1_single 산출물에 `transition: 'none'` 하드코딩 + ready 복원 코드(`Reveal.configure({ transition: 'convex', backgroundTransition: 'zoom' })`) 정상 출력 — `_config.yml` 설정값(convex/zoom) 반영.

## Issue117. 슬라이드 단위 애니메이션 디렉티브 — `#transition-*`/`#background-*`/`#auto-animate`/`#autoslide-*` (등록: 2026-05-05, 해결: 2026-05-05, commit: 7d3130c, 6f34f65) ✅
* 카테고리: Generator / Frontend
* 목적: Issue111 글로벌 `animation:` 옵션 위에 슬라이드별 override 수단 제공. `#layout-*`와 동일 패턴으로 슬라이드 디렉티브 라인을 작성하면 해당 `<section>` 태그에 reveal.js `data-*` 속성으로 변환 주입.
* 해결:
    - **`lib/slide-parser.js`** (commit `7d3130c`): `extractDirectives(rawSlideText)` 신설. `_emptyDirectives()` 객체에 layout / transition / transitionSpeed / backgroundColor / backgroundTransition / autoAnimate / autoslide 7종 필드. 화이트리스트는 `lib/config.js` `VALID_TRANSITIONS`/`VALID_TRANSITION_SPEEDS`와 동기화. 기존 `extractLayoutMeta()`는 `extractDirectives()` 호출 후 `{ layout, text }`로 변환하여 Issue81 호환 유지. `parseMarkdownFile()`에서 추출된 directives를 slide 객체에 부여.
    - **`lib/html-builder.js`** (commit `7d3130c`): `_applyDirectiveAttrs(html, directives)` 헬퍼 추가. `generatePlainSlideHTML`/`generateSlideHTML` 두 경로 모두에서 첫 `<section>` 태그에 `data-transition`/`data-transition-speed`/`data-background-color`/`data-background-transition`/`data-auto-animate`(값 없는 attribute)/`data-autoslide` 변환 주입. reveal.js 표준 동작에 따라 슬라이드별 `data-*`가 글로벌 `Reveal.initialize` 옵션보다 자동 우선.
    - **H2 다음 디렉티브 매칭** (commit `6f34f65`): SSOT 명세(_doc_design/animation.md) 형태 `## 제목 / #transition-zoom / #auto-animate / 본문` 슬라이드에서 H2가 첫 비공백 라인이라 디렉티브 매칭이 실패하던 회귀 fix. `extractDirectives()`에 H1~H6 헤더 + 빈 라인 skip 후 디렉티브 매칭 시도하는 분기 추가. Case 1 (Issue81 호환: 첫 비공백 라인이 디렉티브)도 그대로 동작.
    - **`Projects/animationTest/animationTest.md`**: 6종 디렉티브 검증 슬라이드 추가.
    - **`noteForHuman.md` + `.claude/rules/md-m2slide-rules.md`**: 디렉티브 표 + 화이트리스트 + 글로벌 관계 + H2 위/다음 두 형태 모두 동작 명시.
    - **스코프 외 (Issue117_1 후보)**: `#background-image-*` (경로 정규식 한계 — frontmatter 또는 인용부호 syntax로 별도 검토).
* 검증:
    - JS syntax: `lib/slide-parser.js`, `lib/html-builder.js` `node -c` OK.
    - animationTest 빌드 후 6종 디렉티브 모두 `<section data-* class="layout-_contents">` 정상 변환 grep 확인 (transition fade·zoom-fast / auto-animate / background-color #1a1a2e·#0f3460 / background-transition zoom / autoslide 2000).
    - 3개 대표 프로젝트(`m2SlideStyle1_single`, `m2SlideStyle2_chapter`, `layoutTest`) 회귀 없음 (의도치 않은 data-* 주입 0건).

## Issue123. Cross-page 시그널(?fwd=1) 진입 시 deck 첫 hash jump의 슬라이드 transition 재생 부작용 (등록: 2026-05-05, 해결: 2026-05-05, commit: 73426f4) ✅
* 카테고리: Frontend
* 목적: `?fwd=1#/N` URL로 cross-page 진입 시 Reveal.js가 사용자 설정 transition으로 초기화되어 hash jump 시 #/0→#/N 슬라이드 전환 애니메이션을 재생하던 부작용 수정. cross-page navigation은 페이지 단위 진입이므로 deck 내 slide transition은 발생하지 않아야 함 (이후 사용자 키 입력에서만 정상 transition).
* Walkthrough:
    - 원인: `lib/html-builder.js` deck `Reveal.initialize`가 `transition: '${_cfg.animation.defaultTransition}'`로 시작 → Reveal.js가 hash 파싱 후 #/N으로 이동할 때 설정된 transition 재생. 기존엔 `?last=1&back=1` 케이스만 `Reveal.configure({ transition: 'none' })`로 막고 있었음.
    - 해결 (`lib/html-builder.js` deck `Reveal.initialize`):
        - `_isCrossPageEntry` 변수 신설 (location.search에 `fwd=1`/`back=1`/`last=1` 포함 시 true)
        - `transition`·`backgroundTransition`을 `_isCrossPageEntry ? 'none' : '<defaultValue>'`로 conditional 변경
        - `Reveal.on('ready', ...)` 콜백 신규 추가: `_isCrossPageEntry === true`일 때 `Reveal.configure({ transition, backgroundTransition })`로 원래 값 복원 → 이후 사용자 키 입력은 정상 transition
    - 기존 `?last=1&back=1` 분기 처리는 그대로 유지 (중복 안전, 회귀 위험 회피)
    - 검증: 4개 대표 프로젝트 빌드 회귀 없음. m2SlideStyle1_single index.html + m2SlideStyle2_chapter 7개 deck + layoutTest/animationTest 모든 deck HTML에 `_isCrossPageEntry` 분기와 ready 복원 코드 정상 출력. 일반 진입·단순 리프레쉬는 `_isCrossPageEntry === false`로 정상 transition 유지.

## Issue122. Cross-page fade-in이 단순 페이지 리프레쉬에도 발동하는 부작용 (등록: 2026-05-05, 해결: 2026-05-05, commit: 6eec5d7) ✅
* 카테고리: Frontend
* 목적: Issue120(cross-page fade-in)이 의도와 달리 페이지 리프레쉬·새 탭 진입 시에도 250ms fade-in을 발동시키던 부작용 수정. cross-page navigation(`?fwd=1`/`?back=1`/`?last=1` 시그널 진입)에서만 fade-in 동작하도록 gating 추가.
* Walkthrough:
    - 원인: `M2_RELEASE_FN_JS`가 모든 페이지 진입 시 무조건 `body.classList.add('m2-cross-loaded')` 실행 → CSS selector 매칭 → 리프레쉬에도 fade-in 발동. `M2_CROSS_GUARD_HEAD_HTML`은 cross-page 시그널 진입에만 `m2-cross-loading` class를 부여하지만 release 함수가 이 신호를 무시함.
    - 해결 (`lib/html-builder.js M2_RELEASE_FN_JS`): 클래스 제거 직전에 `wasCrossLoading = documentElement.classList.contains('m2-cross-loading') || body.classList.contains('m2-cross-loading')` 캡처. `!wasCrossLoading`이면 즉시 return → fade-in 미발동. true일 때만 기존 `body.classList.add('m2-cross-loaded')` + animationend 리스너 실행.
    - 검증: 4개 대표 프로젝트(`m2SlideStyle1_single`, `m2SlideStyle2_chapter`, `layoutTest`, `animationTest`) 빌드 회귀 없음. deck/cover/agenda 3개 페이지 유형 모두 `wasCrossLoading` 분기 정상 출력.

## Issue120. Cross-page navigation fade-in CSS animation (A안) (등록: 2026-05-05, 해결: 2026-05-05, commit: 90dd3c7) ✅
* 카테고리: Frontend
* 목적: Issue111 후속 분석 결과, agenda 페이지는 reveal.js 미사용이라 transition 옵션이 적용 불가. cross-page navigation(cover↔agenda↔deck)에서 Issue110 가드 해제 시점에 짧은 fade-in CSS animation을 추가하여 페이지 전환을 시각적으로 부드럽게 만듦. agenda에 reveal을 도입하지 않고도 동일한 시각 효과를 cover/agenda/deck 모두에 일관 적용 (B안 reveal 도입은 회귀 위험으로 보류).
* 해결 (commit `90dd3c7` — Issue119와 동봉 commit):
    - **`lib/html-builder.js _crossPageFadeInCss(cfg)`** 헬퍼 함수 신설: `cfg.animation.defaultBackgroundTransition === 'none'`이면 빈 문자열 반환 (gating). 그 외 값(fade/slide/convex/concave/zoom)일 때 `@keyframes m2-page-fade-in { from { opacity: 0 } to { opacity: 1 } } body.m2-cross-loaded { animation: m2-page-fade-in 250ms ease-out !important }` 출력.
    - **`M2_CROSS_GUARD_CSS` 사용 위치 3곳에 inline 추가**: deck `${M2_CROSS_GUARD_CSS}${_crossPageFadeInCss(_cfg)}` (line 736), cover (line 1868), agenda (line 2096) — 3개 페이지 모두 일관 적용.
    - **`M2_RELEASE_FN_JS` 확장**: 가드 해제(`m2-cross-loading` class 제거) 직후 `document.body.classList.add('m2-cross-loaded')` 호출 + `animationend` 리스너로 자가 제거. CSS selector가 없으면(none gating 시) class 추가만 되고 animation 효과는 0 → 안전.
* 검증:
    - 4개 대표 프로젝트(`m2SlideStyle1_single`, `m2SlideStyle2_chapter`, `layoutTest`, `animationTest`) 빌드 성공.
    - **fade 활성 시** (default_background_transition: fade): 모든 deck/cover/agenda HTML에 `@keyframes m2-page-fade-in` + `body.m2-cross-loaded` selector + JS class add + animationend listener 출력 (line 1387-1388 + 2780-2783).
    - **none gating 시** (default_background_transition: none): CSS keyframes·selector 미출력. JS는 그대로 남으나 selector 매칭 없어 효과 0 — 안전.
* B안(Agenda reveal.js 도입)은 별도 후속 이슈로 분리. agenda는 1슬라이드라 transition 본 효과는 0이고, 시각적으로는 본 A안의 cross-page fade-in으로 충분 — 사용자 결정.

## Issue119. Cover 슬라이드 layout 지정 옵션 — `cover_layout: <name>` (등록: 2026-05-05, 해결: 2026-05-05, commit: 90dd3c7) ✅
* 카테고리: Generator / Theme
* 목적: single 모드(및 chapter 모드 별도 cover index.html) cover 슬라이드 layout이 `_cover`로 하드코딩되어 사용자가 다른 layout(예: 프로젝트별 커스텀 cover, `_blank` 등)을 지정 불가하던 버그. `_config.yml`에 `cover_layout:` 옵션을 추가하여 cover 슬라이드 layout을 자유롭게 지정 가능. 기본값 `_cover`로 기존 동작 보존.
* Walkthrough:
    - `lib/config.js`: `coverLayout: '_cover'` 기본값 + `cover_layout: <name>` 파서 (화이트리스트 `^_?[a-z][a-z0-9-]*$`, theme_default_layout과 동일).
    - `lib/html-builder.js`: single 모드 cover 주입(L473)·chapter 모드 `generateCoverHTML`·클라이언트 `isCoverSlide()` 판정 모두 `_cfg.coverLayout` 기반으로 변경 (`M2SLIDE_COVER_LAYOUT` 변수 신규 노출).
    - 검증: m2SlideStyle1_single에 임시로 `cover_layout: blank` 적용 후 산출물 첫 슬라이드 `<section class="layout-_blank">` 정상 교체 확인. 원복 후 `layout-_cover` 복귀. m2SlideStyle1_single, m2SlideStyle2_chapter, layoutTest 빌드 회귀 없음.
    - 문서: `.claude/rules/md-m2slide-rules.md` "Cover 슬라이드 자동 주입" 섹션에 cover_layout override 항목 추가 + `_doc_design/chapter-single-mode.md`에 `cover_layout` 동작 표 신규.

## Issue111. 슬라이드 전환·요소 애니메이션 옵션 정리 (등록: 2026-05-05, 해결: 2026-05-05, commit: 45e897c, 1d72147, 7d3130c) ✅
* 카테고리: Frontend
* 목적: 현행 슬라이드 전환(좌우 slide)·기본 트랜지션을 재검토하여 reveal.js가 제공하는 애니메이션 옵션을 m2slide에서 어떤 형태로 노출·제어할지 결정.
* 분할 (2026-05-05): SSOT 명세를 그대로 구현하면 slide-parser·markdown.js inline parser 변경이 필요해 회귀 위험 큼. 본 이슈는 **글로벌 transition 옵션 노출 + SSOT 문서**까지로 스코프 축소:
    - **Issue117** (이슈후보) — 슬라이드 단위 애니메이션 디렉티브 (`#transition-*` 등)
    - **Issue118** (이슈후보) — Pandoc `{.fragment}` inline attribute 파서
* 해결:
    - **Phase 1·2 — 검증·SSOT 문서**: `Projects/animationTest/` 신설하여 reveal.js markdown plugin syntax(`<!-- .slide: ... -->`, `<!-- .element: ... -->`, `{.fragment}`) 통과 여부 빌드+grep 검증 → 모두 텍스트로만 보존되고 section/element attribute로 변환되지 않음 확인. [`_doc_design/animation.md`](_doc_design/animation.md)에 결과·향후 syntax 설계 SSOT 작성.
    - **Phase 3 — 글로벌 옵션 노출** (commit `45e897c`):
        - **`lib/config.js`**: `VALID_TRANSITIONS = ['none','fade','slide','convex','concave','zoom']` + `VALID_TRANSITION_SPEEDS = ['default','fast','slow']` 화이트리스트. `cfg.animation = { defaultTransition: 'slide', defaultTransitionSpeed: 'default', defaultBackgroundTransition: 'fade' }` 기본값. `applyConfig`에 `animation:` 섹션 파서 + 잘못된 값 console.warn + default fallback (`nav_indicator` 패턴과 동일).
        - **`lib/html-builder.js`**: `generateHTML` deck 핸들러의 `Reveal.initialize` 하드코딩 `transition: 'slide'`/`backgroundTransition: 'fade'`를 `_cfg.animation.*` 기반 동적 주입으로 교체. `transitionSpeed` 새로 노출. `generateCoverHTML`/`generateAgendaHTML`은 의도적으로 `transition: 'none'` 유지 (Issue110 cover/agenda 진입 애니메이션 미적용 정책 보존).
        - **`_config.org.yml`**: `animation:` 섹션 + 3종 옵션 + 화이트리스트 인라인 주석. 슬라이드 단위 override는 후속 Issue117 안내.
    - **Phase 4 — 사용자 가이드** (commit `45e897c`):
        - **`noteForHuman.md`**: 슬라이드 트랜지션 사용 예시 + 화이트리스트 + cover/agenda 정책 명시.
        - `md-m2slide-rules.md`는 슬라이드 단위 디렉티브(Issue117)·인라인 attribute(Issue118) 도입 시점에 함께 갱신 예정 (현 이슈에선 변경 사항 없음 — frontmatter `transition:` 키는 이미 글로벌 키와 별개로 동작 안 함, 차후 Issue117에서 정의).
* 검증:
    - JS syntax: `lib/config.js`, `lib/html-builder.js` `node -c` OK
    - **Default 동작 보존**: `m2SlideStyle1_single`(1) + `m2SlideStyle2_chapter`(deck 8) + `layoutTest`(1) 빌드 후 모든 deck HTML이 `Reveal.initialize({ transition: 'slide', transitionSpeed: 'default', backgroundTransition: 'fade', ... })` 동일 주입 확인 (이전 하드코딩과 같은 값 → 시각·동작 회귀 없음). cover/index.html은 의도대로 `transition: 'none'` 유지.
    - **Override 동작**: `Projects/animationTest/_config.yml`에 `animation: default_transition: zoom / default_transition_speed: fast / default_background_transition: convex` 적용 → 빌드 결과 HTML이 그대로 주입됨 확인.
    - **Invalid 값 fallback**: `default_transition: invalidValue` 등 잘못된 값 입력 시 `⚠️ Invalid animation.default_transition: 'invalidvalue' — allowed: none | fade | slide | convex | concave | zoom` 경고 + `cfg.animation.defaultTransition = 'slide'` (기본값) 유지 확인.
* 후속 fix (commit `1d72147`):
    - **회귀 발견**: 사용자가 `default_transition: 'none'`을 설정해도 `?fwd=1`/`?back=1` cross-page 진입 시 Issue104의 `body.m2-fwd-enter`/`body.m2-back-enter` CSS `@keyframes m2-slide-from-left/right` 400ms 애니메이션이 그대로 발생. reveal.js transition 옵션과 별개의 강제 CSS 애니메이션이라 'none' 의도에 위배.
    - **`lib/html-builder.js`**: `generateHTML` `<style>` 블록의 cross-page selector(`body.m2-back-enter .reveal .slides > section.present { animation: ... }` / `body.m2-fwd-enter ...`)를 `_cfg.animation.defaultTransition === 'none'`일 때 출력 생략. body classList.add는 인라인 JS에 그대로 두어 다른 동작(가드 해제 등)에 영향 없음 — 효과만 차단.
    - **`_config.org.yml`**: m2slide 글로벌 default를 `slide`/`fade` → `none`/`none`으로 전환. m2slide 정체성을 "기본 트랜지션 없음 + 사용자가 명시 선택할 때만 활성화"로 정립. 프로젝트별 `_config.yml`에서 `animation: default_transition: slide` 등으로 override 가능.
    - **회귀 검증**: m2SlideStyle1_single / m2SlideStyle2_chapter (deck/index/agenda) / layoutTest 4개 모두 cross-page selector 0건. animationTest(zoom override)는 selector 2건 정상 출력.

## Issue116. 개요2이상 페이지에서 첫번째 바 사라지는 버그 (등록: 2026-05-05, 해결: 2026-05-05, commit: ebc6b2b, 419235c) ✅
* 카테고리: Frontend / Theme / Generator
* 목적: 단일 모드 슬라이드 중 H3 image-only/list-only 슬라이드(예: `m2SlideStyle1_single` `#/16` "이미지 Only")에서 상단 노랑 가로선이 누락되어 다른 페이지와 시각 일관성이 깨지던 문제.
* 1차 시도 (`ebc6b2b`, 불완전):
    - `theme/default/slide.css` §2 셀렉터를 `:has(> .title)`로 좁혀 `.title`이 `.contents-body` 안쪽일 때만 section::before가 살아 상단 바를 그리도록 우회.
    - 한계: 같은 `layout-_contents`인데 H 레벨에 따라 DOM 구조가 갈리는 **구조적 비대칭**(generator 레이어 문제)을 그대로 두고 CSS에서만 fallback 분기 → 사용자 지적 "큰 문제"의 원인.
* 근본 원인:
    - `lib/html-builder.js:336` Issue90 fix 정규식이 `<h2 class="title">`만 매칭하여 contents-body 밖으로 끌어올리고 H3/H4/H5/H6는 contents-body 안쪽에 남겨둠.
    - 결과: `## H2` 슬라이드는 `<section><h2 class="title">+<contents-body>`, `### H3` 슬라이드는 `<section><contents-body><h3 class="title">…` — 동일 layout이지만 DOM이 다름.
    - 추가로 `.contents-body { overflow-y: auto }`(`base.css` §9)가 `.title::before(top:-12px)`를 clipping하여 H3 슬라이드 상단 가로선이 화면에 안 그려짐.
* 근본 해결 (`419235c`):
    - **Generator (`lib/html-builder.js:336`)**: 정규식을 `<h2`→`<(h[2-6])`로 확장 + closing tag backref(`\3`)로 안전 매칭. H2~H6 모든 `.title`을 `section` 직속 자식으로 일관 끌어올림 → DOM 구조 비대칭 제거.
    - **Theme (`theme/default/slide.css` §2)**: 1차 시도의 `:has(> .title)` 우회 제거하고 원래의 단순 `section.layout-_contents::before { display: none }`로 복원. Generator가 SSOT, CSS는 Issue90 본래 의도(`> .title::before`로 가로선)대로 단순화.
    - 효과: 모든 `layout-_contents` 슬라이드가 동일 DOM 구조 → `> .title::before` 일관 매칭 → clipping 문제 자동 차단 (구조적 차원에서 원천 해결).
* 검증:
    - **DOM 일관성**: 5개 대표 슬라이드(`#/14` H2 개요 / `#/16` H3 이미지 Only / `#/17` H3 이미지+텍스트 / `#/19` H3 리스트 Only / `#/22` H2 2분할) 모두 `SECTION.layout-_contents`가 `.title`의 직속 부모로 확인.
    - **잔존 패턴 0건**: `grep '<div class="contents-body"><h[1-6]'` 결과 `m2SlideStyle1_single` / `m2SlideStyle2_chapter` 빌드 결과물에서 0건.
    - **시각 검증**: Chrome 1920×1080 헤드리스 + 250px 크롭 → `#/16` 상단 가로선 복원 + 슬라이드 14 / 17 / 19 / 22 시각 회귀 없음.
    - **3개 대표 프로젝트** (`m2SlideStyle1_single`, `m2SlideStyle2_chapter`, `layoutTest`) `m2slide.sh` 빌드 성공.

## Issue115. 우측 하단 네비게이션 표시 모드 옵션 — 마름모 ↔ 페이지번호 보기 토글 (등록: 2026-05-05, 해결: 2026-05-05, commit: 35d73a6, 0353534, e144aa2) ✅
* 카테고리: Frontend
* 목적: Issue107에서 우측 하단에 `^/v` 마름모 + 페이지번호를 동시 배치한 이후, 발표 환경에 따라 표현을 토글할 수 있는 정적 옵션 부재. 발표자 선호(키 vs 마우스)에 따라 시각 단서를 분리해서 노출할 수 있도록 `_config.yml` 옵션 추가.
* 해결:
    - **`lib/config.js`** (commit `35d73a6`): `VALID_NAV_INDICATORS = ['both', 'diamond', 'page']` 화이트리스트 + `navIndicator: 'both'` 기본값 + `applyConfig`에 `nav_indicator:` 파서. 잘못된 값 입력 시 `console.warn` 후 default fallback.
    - **`lib/html-builder.js`** (commit `0353534`): 3개 페이지(`generateHTML`/`generateCoverHTML`/`generateAgendaHTML`) body에 `data-nav-indicator="${_cfg.navIndicator}"` 속성 일관 주입. `<style>` 블록에 분기 selector 2종:
        - `body[data-nav-indicator="diamond"] .reveal .slide-number { display: none !important }` — 페이지번호 숨김
        - `body[data-nav-indicator="page"] .reveal .controls .navigate-up/down/left/right { display: none !important }` — 마름모 + 좌우 화살표 모두 숨김
    - **`_config.org.yml`** (commit `e144aa2`): `nav_indicator: both` 옵션 + 3종 모드 인라인 주석 노출.
    - Cover/Agenda 페이지는 시각 영향 없음(`controls`/`slide-number` 자체가 비표시). 일관성 차원에서 `data-nav-indicator` 속성만 전파하여 향후 런타임 토글 시 동일 속성 기반 동작 보장.
* 검증:
    - JS syntax: `lib/config.js`, `lib/html-builder.js` `node -e require()` OK
    - default `both`: `m2SlideStyle1_single`(1) + `m2SlideStyle2_chapter`(9) + `layoutTest`(2) HTML 모두 `data-nav-indicator="both"` 주입 확인
    - `diamond` override: body 속성 + CSS selector 정상 반영 (페이지번호 숨김)
    - `page` override: body 속성 정상 반영 (마름모 + 좌우 화살표 숨김)
    - Invalid 값 (`nav_indicator: invalid`): `⚠️ Invalid nav_indicator: 'invalid' — allowed: both | diamond | page` 경고 + default `both` fallback
    - 원본 config 복원 후 회귀 없음

## Issue114. Home/End 키 동작 보강 — Cover/Agenda/첫 챕터 boundary fallback (등록: 2026-05-05, 해결: 2026-05-05, commit: b3b3359) ✅
* 카테고리: Frontend
* 목적: ⇤Home/⇥End가 챕터 sibling 점프 전용이라 Cover, Agenda, 첫 챕터(이전 sibling 부재), 마지막 챕터(다음 sibling 부재)에서 동작 없음이던 문제. boundary에서 트리 한 단계 위·아래로 fall-through하여 발표 중 빠른 위치 이동 보강.
* 해결:
    - **Cover 핸들러** (`lib/html-builder.js generateCoverHTML`): ⇥End/'.'(Period)/⌘+→ → `agenda.html?fwd=1` (다음 sibling 부재 → child fall-through). ⇤Home은 최상위라 no-op 유지.
    - **Agenda 핸들러** (`generateAgendaHTML`): Home/End 분기 분리 — ⇤Home/','(Comma)/⌘+← → `index.html?back=1` (cover_enabled=true 한정, parent fall-up). ⇥End/'.'(Period)/⌘+→ → `firstHrefFromToc(_tocData)` (첫 챕터 TOC, child fall-down).
    - **챕터 deck 핸들러** (`generateHTML` line 1525~): chapter 모드 ⇤Home에서 PREV_CHAPTER 빈값 시 `agenda.html?back=1` fallback 추가. 마지막 챕터 ⇥End는 NEXT_CHAPTER 빈값/'index.html' 체크로 동작 없음 유지(사용자 결정 b).
    - Single 모드는 영향 없음 (트리 탐색 sibling 의미가 chapter와 다름; 별도 이슈로 추후 검토).
    - Issue92 fallback 키(`,`/`.`/⌘+←/⌘+→) 모두 새 매트릭스 적용.
* 검증: `m2SlideStyle2_chapter` 빌드 후 3개 핸들러(`index.html`/`agenda.html`/`01-text-layout.html`)에 Issue114 마커 정상 주입 확인. 사용자 키 동작 확인 후 종결.

> 매트릭스 갱신: [`_doc_design/key_navigation.md`](_doc_design/key_navigation.md) (gitignore — 로컬 SSOT) Cover/Agenda/첫 챕터 행 + 단축키 섹션 boundary fallback 명시.

## Issue112. 챕터모드 페이지 번호 전체 기준 + breadcrumb 챕터 번호 제공 (등록: 2026-05-05, 해결: 2026-05-05, commit: a5c7f03, 7a805ac) ✅
* 카테고리: Frontend
* 목적: 챕터 모드(다중 md + AGENDA.md)에서 페이지 번호가 각 챕터 HTML마다 `1/N`으로 reset되어 사용자가 전체 진행률을 파악하기 어려운 문제. 페이지 번호를 전역 누적으로 표시하고 챕터 번호 breadcrumb prefix를 함께 노출. 단일 모드는 변경 없음.
* 해결:
    - **AGENDA.md → 챕터 번호 매핑** (`lib/agenda.js` `getChapterNumberMap`): 메인 엔트리는 `'1', '2', ...`, 서브 엔트리는 `'1.1', '1.2', ...` 형식의 `{[htmlFile]: chapterNum}` 매핑 산출.
    - **2-pass 빌드** (`lib/generate-slides.js`):
        - 1차 — 모든 챕터 HTML 빌드 (head에 `<script>window.M2_CHAPTER_META=null;/*M2_CHAPTER_META_PLACEHOLDER*/</script>` placeholder 인라인)
        - 2차 — 빌드된 각 HTML의 top-level `<section>` 개수 합산하여 `{mode, breadcrumb, chapterNum, slideOffset, totalSlides}` JSON을 placeholder에 치환 주입
    - **Reveal `slideNumber` callback** (`lib/html-builder.js`): chapterMeta 있을 때 array 반환 형식 `[chapterNum + ' › ' + globalNum, '/', totalSlides]` 사용. reveal.js 5.x callback은 string return 무시·array `[a, sep, b]` 표준 (문자열 반환 시 fallback으로 chapter 인덱스만 표시되는 회귀 발견).
    - **breadcrumb 모드 CSS** (`lib/html-builder.js` 인라인): `body.m2-breadcrumb-mode .reveal .slide-number { width: auto; min-width: 60px; padding: 0 6px; white-space: nowrap }` — 기존 60px 고정 width를 풀어 breadcrumb 텍스트 잘림 방지.
    - **body 클래스 토글** (`lib/html-builder.js`): chapterMeta가 set되고 breadcrumb=true·chapterNum non-empty일 때 `document.body.classList.add('m2-breadcrumb-mode')`로 폭 확장 룰 활성화.
    - **설정** (`_config.yml`, `lib/config.js`):
        - `page_number_mode: 'global' | 'local'` (default: `global`)
        - `breadcrumb: true | false` (default: `true`)
        - 단일 모드는 placeholder가 null로 유지되어 Reveal 기본 `c/t` fallback (회귀 없음)
* 검증: `m2SlideStyle2_chapter` 빌드 결과 `3 › 9 / 19` 형식 정상 표시 확인 (브라우저). `m2SlideStyle1_single`은 placeholder null 유지 + `c/t` 폴백 회귀 없음. `layoutTest` 빌드 정상.

> 코드는 a5c7f03(Issue113과 함께 lib/* 변경분 동봉) + 7a805ac(`_config.org.yml` 옵션 노출)에 분산.

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

