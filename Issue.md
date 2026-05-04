# Issue Management
* https://github.com/Finfra/m2slide/issues
* Issue HWM: 105
* 오래된 Issue는 `z_old/old_issue.md`에 저장
* Save Point :
    - **v0.5.0 (2026-05-03)** — release: 71건 완료 이슈 z_old 아카이브, CHANGELOG.md 신규 (Issue70까지 포함)
    
# 🤔 결정사항
## _meta.yml파일 사용 안함.
* AGENDA.md나 {프로젝트명}.md파일의 yaml front matter에 추가하기로 함. 

## img 폴더 이중 복사 유지 (소스 `img/` + 빌드 `slide/img/`)
* 결정: 현행 `fs.cpSync` 방식 유지
* 이유: `slide/` 폴더를 통째로 삭제 후 재생성하는 빌드 패턴이 잦음


# 🌱 이슈후보
2. 쳅터모드에서 페이지 번호가 해당 md마다 1부터 시작하는데, 전체 기준으로 제공되어야함. 단, md 방식에서는 breadcum방식으로 쳅터 번호를 페이지 옆에 제공해야함. 관련 설정 필요. 
1. 페이지 네비게이션 번호와 주소 맞지 않음. 페이지 네비게션 번호가 0(toc때문)부터 시작해야함.향후 toc를 생략하는 상황에서도 1부터 시작해서 잘 맞게됨. 

# 🔥 진행중

## Issue104. Chapter ← 이전 챕터 진입 시 트랜지션 방향 역전 — 순방향 애니메이션이 뒤로가기 의도와 충돌 (등록: 2026-05-04)
* 카테고리: Frontend
* 목적: Chapter 모드에서 ← 키로 이전 챕터(`?last=1`)로 이동 시, 새 페이지가 fresh load되어 Reveal.js가 forward 트랜지션(우→좌 슬라이드)을 재생함. 사용자는 "뒤로 가는 동작"을 인식하므로 backward 트랜지션(좌→우 슬라이드)이어야 직관적
* 상세:
    - 재현: 페이지 2 (`Projects/m2SlideStyle2_chapter/slide/03-data-visualization.html`)에서 ← 키 누름
    - 현재: 페이지 1 (`02-code-syntax.html?last=1#/2`)로 이동하면서 forward 슬라이드 애니메이션 재생 → 방향 혼동
    - 기대: backward 슬라이드 애니메이션(반대 방향) 재생 → 사용자가 "뒤로 갔음"을 시각적으로 인지
    - 영향 범위: Chapter 모드 ← (TOC slide·#/0에서 이전 챕터로 진입), Home/⌘← (이전 챕터 첫 슬라이드 진입)도 동일 이슈 가능
* 구현 명세 (계획):
    - 도착 페이지에서 진입 방향을 인지할 수 있는 URL 시그널 추가 (ex: `?last=1&dir=back`, 기존 `?last=1` 자체로도 ← 진입 시그널로 충분)
    - [`lib/html-builder.js`](lib/html-builder.js)의 navigation 코드 (lines 1262-1289) — ← / Home에서 PREV_CHAPTER 진입 시 `?last=1` (기존) 또는 `?dir=back` 추가
    - 도착 페이지의 `Reveal.on('ready')` 핸들러에서 시그널 감지 시:
        - 옵션 A (CSS): body에 `.m2-enter-back` 클래스 부착 → CSS keyframe으로 backward slide 애니메이션 1회 재생
        - 옵션 B (JS): `Reveal.configure({ transition: 'slide' })` 상태에서 첫 표시 시 임시로 다른 슬라이드를 거쳐 backward 방향으로 트랜지션 (시각 잔상 위험)
        - 권장: 옵션 A — Reveal.js 기본 트랜지션 비활성화 + 자체 CSS keyframe (제어성·안정성)
    - 검증: chapter 프로젝트 빌드 후 페이지 2 → ← → 페이지 1 진입 시 슬라이드가 좌측에서 우측으로 들어옴 확인
* 검증:
    - `m2SlideStyle2_chapter` 빌드 산출물 확인
    - 브라우저: 페이지 2 → ← → 페이지 1, backward 트랜지션 시각 확인
    - 회귀: 일반 페이지 직접 진입(`?last=1` 없이)은 트랜지션 없음(현행) 유지

# 📕 중요

# 📙 일반

# 📗 선택


# ✅ 완료

## Issue105. ⇤/⇥ Single 모드 sibling을 H1 전용에서 레벨 인식 트리 탐색으로 확장 (등록: 2026-05-04, 해결: 2026-05-04, commit: 2e188b5) ✅
* 카테고리: Frontend
* 목적: H2 sub-anchor 간 sibling 이동(`4.1 ↔ 4.2`) 불가 — Issue92의 H1-only 정책 부수 효과. 사용자 멘탈 모델("같은 레벨에서 옆으로")과 어긋남. 트리 탐색 의미로 일반화
* 구현 명세 (실행):
    - 신규 함수 ([`lib/html-builder.js`](lib/html-builder.js)):
        - `getEnclosingAnchorLevel(currentH)`: enclosing anchor 레벨 N 결정 (현재가 anchor면 자기 level, 본문이면 직전 anchor level, 기본 1)
        - `findPrevSiblingAnchorIndex(currentH, level)`: currentH 이전 슬라이드 중 anchor && `headingLevel <= level` 첫 매치
        - `findNextSiblingAnchorIndex(currentH, level)`: currentH 이후 슬라이드 중 anchor && `headingLevel <= level` 첫 매치
    - Home 핸들러 Single 분기: `findPrevH1AnchorIndex` → `findPrevSiblingAnchorIndex(curH, encLevel)`
    - End 핸들러 Single 분기: `findNextH1AnchorIndex` → `findNextSiblingAnchorIndex(curH, encLevel)`
    - Chapter 모드는 변경 없음 (deck 단위 점프 유지)
    - 설계 동기: [`_doc_design/key_navigation.md`](_doc_design/key_navigation.md) Issue105 항목 (단축키 동작 표·K4·변경 이력)
* 효과:
    - H2 anchor 간 sibling 이동 가능 (예: `4.1 ↔ 4.2`)
    - H2 마지막 sibling에서 ⇥ → 부모 H1의 다음 H1 sibling으로 자연 fall-up (트리 탐색)
    - 본문 슬라이드도 동일 — enclosing anchor 레벨 기준
    - H1 ↔ H1 회귀 유지 (자식 H2 skip)
* 검증:
    - `m2SlideStyle1_single` 빌드 산출물 `index.html`에 신규 함수 7회 occurrence 부착 확인 (`getEnclosingAnchorLevel`, `findPrev/NextSiblingAnchorIndex`, Home/End 호출부)
    - `m2SlideStyle2_chapter`, `layoutTest` 빌드 회귀 없음 (Chapter ⇤/⇥는 기존 deck 단위 점프 유지)
    - 브라우저: `index.html#/14` 열림 — 사용자 ⇥/⇤ 직접 확인 가능

## Issue103. Single 모드 본문(leaf)에서 ↓ 키 무동작 — 다음 H1 anchor fall-through 미구현 (등록: 2026-05-04, 해결: 2026-05-04, commit: 7570cf0) ✅
* 카테고리: Frontend
* 목적: Single 모드에서도 leaf ↓가 fall-through로 다음 주요 섹션(H1 anchor)으로 이동. Chapter 모드 leaf ↓(다음 챕터)와 대칭
* 상세:
    - 재현: `Projects/m2SlideStyle1_single/slide/index.html#/3` ("중첩 리스트", 본문 leaf)에서 ↓ 누름 → 무반응
    - 기대: `#/5` ("2. 코드 및 신택스 하이라이팅", 다음 H1 anchor)로 즉시 이동
    - 도착지는 ⇥ End와 동일하나 위치 무관 leaf fall-through로 의미 통일
* 구현 명세 (실행):
    - [`lib/html-builder.js`](lib/html-builder.js) ArrowDown leaf branch에 Single 모드 분기 추가
    - `M2SLIDE_MODE === 'chapter'`: 기존 Chapter fall-through 유지
    - `else` (Single): `findNextH1AnchorIndex(Reveal.getIndices().h)` → ≥0이면 `Reveal.slide(idx, 0)`. 마지막 H1 섹션은 무동작
    - 메시지·확인 없이 1회 누름 (양 모드 공통)
    - [`_doc_design/key_navigation.md`](_doc_design/key_navigation.md) Single 모드 매트릭스·K7·변경 이력 동기 갱신
* 검증:
    - `m2SlideStyle1_single` 빌드 산출물 `index.html`에 leaf branch Single 분기 코드 부착 확인 (`leafNextH1 = findNextH1AnchorIndex(...)`)
    - `m2SlideStyle2_chapter` 빌드 산출물에도 동일 분기 부착 (Chapter 분기 우선) — 회귀 없음
    - `layoutTest` 빌드 통과
    - 브라우저: `index.html#/3` ↓ → `#/5` 이동, 마지막 섹션 본문에서 무동작

## Issue101. 코드 박스 시각 안정화 — CDN github.css 의존 제거 + 자체 .code-wrapper 박스 (등록: 2026-05-04, 해결: 2026-05-04, commit: 42979cf) ✅
* 카테고리: Theme
* 목적: Issue98 옵션 1(CDN github.css `.hljs` 배경 살리기)은 CDN 가용성·라이트 테마 가정·highlight.js 버전 의존이라는 3가지 안정성 위험을 가짐. 코드 박스 자체는 자체 CSS로 정의하고 CDN은 토큰 색상 보강 역할로 분리하여 안정성 확보
* 근본 원인 (Issue98 옵션 1의 한계):
    1. CDN 장애·오프라인 시 `.hljs` 배경(`#f6f8fa`) 미적용 → 코드가 본문과 시각 구분 사라짐
    2. github.css는 라이트 테마 — 다크 슬라이드 배경 사용 시 `#f6f8fa` 부조화
    3. highlight.js 향후 버전이 `.hljs { background, padding }` 정의를 변경하면 의도치 않은 시각 변화
    4. RevealHighlight 플러그인 미실행 환경에서 `hljs` 클래스만 부착되어 토큰 색상 빠진 채 박스만 남는 어색한 상태 가능
* 구현 명세 (실행):
    - [`theme/default/slide.css`](theme/default/slide.css) `.reveal section[class*="layout-"] .code-wrapper` 자체 박스 스타일 신규
        - `background: var(--code-bg, #f6f8fa)`, `padding: 0.8em 1em`, `border-radius: 6px`, `border: 1px solid var(--code-border, #e1e4e8)` 테마 변수 매핑
        - `font-family: var(--code-font-family, 'SF Mono', Monaco, Menlo, Consolas, 'Courier New', monospace)`, `font-size: 0.85em`, `line-height: 1.45` 명시
        - `box-shadow: 0 1px 2px rgba(0,0,0,0.05)`, `overflow: auto`
    - `.code-wrapper code`는 `background: transparent; padding: 0` — github.css `.hljs` 배경 무력화하여 자체 박스만 보이게
    - 결과: github.css는 토큰 색상(.hljs-keyword, .hljs-string 등)만 담당, 박스(배경·패딩·radius·폰트)는 자체 정의로 용도 분리
* 검증:
    - `m2SlideStyle2_chapter`/`m2SlideStyle1_single`/`layoutTest` 3종 빌드 성공
    - 산출물 `slide/css/custom.css`에 `.code-wrapper` 자체 스타일 정상 부착 확인
    - `02-code-syntax.html` `<pre class="code-wrapper"><code class="language-javascript hljs">` / `language-python hljs` 정상
    - 브라우저 시각 확인: 박스 배경·padding·border-radius 정상, Python `if n &lt;= 1:` HTML escape 유지
    - 회귀 없음: 다른 본문 슬라이드, 마스코트, 가로선, mermaid/kroki 다이어그램 영향 없음

## Issue102. H2 sub-anchor에서 ↑ 시 직속 부모 H1 anchor로 이동 안 함 (Issue100 후속) (등록: 2026-05-04, 해결: 2026-05-04, commit: 354d142) ✅
* 카테고리: Frontend
* 목적: Issue100 수정 후 `Projects/m2SlideStyle1_single/slide/index.html#/14` (H2 sub-anchor "4.1. 이미지") 에서 ↑ 누름 시 직속 부모 #/12 (H1 anchor "4. 이미지 및 미디어") 로 이동해야 하나 즉시 agenda.html 로 점프. 페이지 계층 (leaf → H2 → H1 → TOC/agenda → cover) 의 H2→H1 단계 누락
* 근본 원인: [`lib/html-builder.js`](lib/html-builder.js) ↑ 핸들러 `if (isAnchorSlide(cur)){ ... gotoTocOrAgenda() }` 분기가 H1 anchor와 H2 sub-anchor를 구분 없이 모두 TOC/agenda로 전송. H2 sub-anchor는 H1을 부모로 가져야 함
* 구현 명세 (실행):
    - ↑ 핸들러 분기 재구성:
        - `isH1Anchor(cur)` → `gotoTocOrAgenda()` (H1 → 한 단계 위 TOC/agenda)
        - `isAnchorSlide(cur)` (H2 sub-anchor) → `findPrevH1AnchorIndex` 결과로 점프, 없으면 TOC/agenda 폴백
        - leaf 본문 → `findPrevAnyAnchorIndex` (Issue100 동일)
* 검증:
    - `m2SlideStyle1_single` #/14 → ↑ → #/12 (H1) 정상 이동
    - #/12 (H1) → ↑ → agenda.html 정상
    - #/15 (leaf) → ↑ → #/14 (Issue100 회귀 없음)
    - m2SlideStyle2_chapter, layoutTest 빌드 회귀 없음

## Issue99. Chapter 모드 본문(leaf)에서 ↓ 키 무동작 — 다음 챕터 fall-through 미구현 (등록: 2026-05-04, 해결: 2026-05-04, commit: 68eb82b) ✅
* 카테고리: Frontend
* 목적: [`_doc_design/key_navigation.md`](_doc_design/key_navigation.md) "본문 leaf ↓ → 다음 챕터 첫 슬라이드(TOC slide, 메시지 없음·1회)" 설계가 코드에 반영되지 않음. `02-code-syntax.html?last=1#/2`에서 ↓ 무반응 — `→ →`(2회·메시지) 만 다음 챕터로 이동
* 상세:
    - 재현: `Projects/m2SlideStyle2_chapter/slide/01-text-layout.html#/2` 또는 `#/3`에서 ↓ 누름 → 무반응
    - 기대: `02-code-syntax.html` 첫 슬라이드(TOC slide, `#/0`)로 즉시 이동, 메시지 없음
    - → 와 차별점: ① 위치 무관 (본문 어느 슬라이드에서나 1회로 즉시 이동) ② 메시지 없음
* 구현 명세 (실행):
    - [`lib/html-builder.js`](lib/html-builder.js) `generateHTML` ArrowDown 분기 leaf branch (line 1230-1236) 수정
    - Chapter 모드(`M2SLIDE_MODE === 'chapter'`)이고 `NEXT_CHAPTER` 유효(빈값/`'index.html'` 아님) 시 → `window.location.href = NEXT_CHAPTER`
    - Single 모드 또는 마지막 챕터는 무동작 (가드 통과 안 함)
    - 커밋 68eb82b(Issue100 fix)에 함께 포함되어 적용됨
* 검증:
    - `m2SlideStyle2_chapter` 빌드 후 `01-text-layout.html` 산출물에 leaf branch 코드 부착 확인 (`NEXT_CHAPTER='02-code-syntax.html'`, mode=chapter)
    - 마지막 챕터 `07-m2slide-features.html`은 `NEXT_CHAPTER='index.html'`로 가드 → 무동작 정상
    - `m2SlideStyle1_single/index.html`: `M2SLIDE_MODE='single'`로 가드 → leaf ↓ 무동작 회귀 정상
    - `m2SlideStyle1_single`, `layoutTest` 빌드 통과

## Issue100. 본문 leaf에서 ↑ 키가 직속 부모(H2 sub-anchor) 건너뛰고 H1 anchor로 점프 (등록: 2026-05-04, 해결: 2026-05-04, commit: 68eb82b) ✅
* 카테고리: Frontend
* 목적: `Projects/m2SlideStyle1_single/slide/index.html#/15` (H2 sub-anchor `#/14` 직후 본문 leaf) 에서 ↑ 키 누름 시 #/14가 아닌 #/12 (H1 anchor "4. 이미지 및 미디어")로 점프. 직속 부모 의미 위반. `_doc_design/key_navigation.md` 설계의 ↑=parent 규칙에서 H2 sub-anchor도 부모 후보에 포함되어야 함
* 근본 원인: [`lib/html-builder.js`](lib/html-builder.js) `findPrevAnchorIndex` (Issue92에서 H1만 매칭하는 `isH1Anchor`로 변경됨) — Home/End sibling 점프와 ↑ parent 점프가 같은 함수를 공유하여 H2 sub-anchor가 ↑ 후보에서도 제외됨. Issue92는 sibling 점프(Home/End)에서 H2를 제외하려는 의도였으나 ↑ parent 점프까지 영향
* 구현 명세 (실행):
    - 함수 분리: `findPrevH1AnchorIndex`/`findNextH1AnchorIndex` (Home/End sibling, ↓ TOC→첫 H1 — `isH1Anchor` 유지) + `findPrevAnyAnchorIndex` (↑ parent — `isAnchorSlide` 사용으로 H2 sub-anchor 포함)
    - 호출부 갱신: ↑ key (line 1194) → `findPrevAnyAnchorIndex` / Home (1239) → `findPrevH1AnchorIndex` / End (1293) → `findNextH1AnchorIndex` / ↓ TOC (1209) → `findNextH1AnchorIndex(-1)` (currentH=-1로 처음부터 검색)
* 검증:
    - `m2SlideStyle1_single` 빌드 후 `index.html#/15` → ↑ → `#/14` (H2 sub-anchor) 정상 이동
    - `#/14` (H2 anchor) → ↑ → agenda.html (anchor 슬라이드 → TOC/agenda 폴백 정상)
    - Home/End sibling 점프는 H1 anchor만 매칭 (Issue92 의도 유지)
    - `m2SlideStyle2_chapter`, `layoutTest` 빌드 회귀 없음

## Issue98. 코드 블록 좌측 정렬 + HTML escape + hljs 클래스 누락 — 코드 하이라이트 다중 결함 (등록: 2026-05-04, 해결: 2026-05-04, commit: d567d53) ✅
* 카테고리: Generator + Theme
* 목적: `Projects/m2SlideStyle2_chapter/slide/02-code-syntax.html#/1`에서 코드가 가운데 정렬 + Python `if n <= 1:` HTML escape 누락 + `<pre>` 가 hljs 박스 스타일 미적용. 3건의 코드 하이라이트 기능 근본 결함을 한 묶음 해결
* 근본 원인:
    1. **좌측 정렬 누락**: `lib/css/base.css` `.reveal pre`에 `text-align` 미설정 → Reveal.js 기본 `.reveal { text-align: center }` 상속
    2. **HTML escape 누락**: `lib/markdown.js`의 정규 코드 블록 분기에서 `codeLines.join('\n')`을 raw 삽입 → Python `<= 1:` 등이 HTML 태그로 파싱
    3. **hljs 박스 차단**: `theme/default/slide.css:275-279`의 `background: transparent !important`가 `pre`, `pre code`에 적용 → CDN github.css `.hljs` 배경(#f6f8fa) 무력화. 빌드 산출물에 `hljs` 클래스 미부착으로 CSS 매칭 불안정
* 구현 명세 (실행):
    - **A. 좌측 정렬 추가** ([`lib/css/base.css`](lib/css/base.css)): `.reveal pre`, `.reveal pre code`에 `text-align: left` 추가
    - **B. HTML escape 추가** ([`lib/markdown.js`](lib/markdown.js)): `escapeHtml` 헬퍼(`&`/`<`/`>`만 처리) 신규 + 정규 코드 블록 분기에 적용. mermaid/kroki 분기는 raw 유지
    - **C. hljs 박스 시각 복구** (옵션 1 채택): [`theme/default/slide.css`](theme/default/slide.css)의 `background: transparent !important` selector에서 `pre`, `pre code` 제거 → github.css `.hljs` 배경 살림. 추가로 [`lib/markdown.js`](lib/markdown.js)의 `langClass`에 `hljs` 명시 부착 → `class="language-X hljs"` (lang 없을 때도 `class="hljs"`)
* 검증:
    - `m2SlideStyle2_chapter`, `m2SlideStyle1_single`, `layoutTest` 3종 빌드 성공
    - `02-code-syntax.html` 산출물에 `<pre class="code-wrapper"><code class="language-javascript hljs">` / `language-python hljs` 정상 부착 확인
    - Python `if n <= 1:` → `if n &lt;= 1:` HTML escape 정상 (`m2SlideStyle1_single/index.html`, `m2SlideStyle2_chapter/02-code-syntax.html` 모두 확인)
    - 코드 블록이 `text-align: left`로 좌측 정렬, github.css `.hljs` 배경 박스 적용 (브라우저 검증 완료)

## Issue97. default_lec theme를 default theme의 Issue80/86 시각 변경과 동기화 (등록: 2026-05-04, 해결: 2026-05-04, commit: 8883e2e) ✅
* 카테고리: Theme
* 목적: `theme_layout_lec.md` §3.1·§3.4가 "DOM 스키마 외 슬롯·시각 배치는 default §3.X 동일"로 명시하나 default가 Issue80(a268ad4) / Issue86(582d064)으로 갱신된 후 `theme/default_lec/slide.css`가 동기화되지 않아 설계 SSOT와 코드 어긋남. 코드를 설계에 맞춤 + hr.png 미적용은 의도적 차이로 설계 문서에 명시
* 구현 명세 (실행):
    - **코드 (`theme/default_lec/slide.css`)**:
        - cover-meta: 박스 스타일 제거 + 우상단 `position: absolute (top:24px, right:5%)`, font-size 0.55em (Issue80 §2.1 동기)
        - `_cover` min-height: 100vh → 100% (base.css §10 layout-* 100% 규칙 동기)
        - slide-number: `position: fixed !important; bottom: 0 !important; right: 24px; z-index: 200 !important`, font-size 14px (Issue86 동기)
        - controls: `position: fixed; bottom: 0; right: 0; z-index: 200` 추가
        - progress: `position: fixed; left: 0; right: 0; bottom: 0; z-index: 100` 추가
        - `_cover` 슬라이드에서 slide-number/controls/progress hide selector 추가
        - `_contents` puffer position 96% 6% → 96% 28px + `_contents_no_title` 추가
        - `_contents_no_title > .contents-body { padding-top: 0; margin-top: 0 }` 추가
    - **설계 문서 (`_doc_design/theme_layout_lec.md`, gitignored)**:
        - §3.1: cover-meta 우상단 absolute 명시 (Issue80 동기) + min-height 100% 명시
        - §5.1: hr.png 옵션 3 결정(default 전용, lec은 단색 2px 유지) 명시 + page-number/controls/progress 위치 정책 명시
* 검증:
    - `LlmAndVibeCoding_test` (default_lec) 빌드 통과 — 산출물 `slide/css/custom.css`에 5건 변경 모두 반영 확인
    - default theme 회귀 검증 통과: `m2SlideStyle1_single`, `m2SlideStyle2_chapter`, `layoutTest` 빌드 성공
    - 브라우저 확인: cover-meta 우상단 absolute, slide-number letterbox 표시, _cover에서 네비게이션 hide

## Issue96. 2x2 그리드 (columns 안에 rows 중첩) 균등 분할 미적용 (등록: 2026-05-04, 해결: 2026-05-04, commit: fdbe8da) ✅
* 카테고리: Theme
* 목적: `Projects/layoutTest/slide/index.html#/7` (2x2 그리드 — `::: columns` 안에 `::: rows` 중첩) 에서 4개 row가 contents-body 상단에 작은 박스로 수축되고 균등 분할되지 않음
* 근본 원인: [`lib/css/base.css`](lib/css/base.css)
    - `.m2-cols { align-items: center }` + `flex` 미설정 → column 박스가 세로로 콘텐츠 자연 크기로 수축, contents-body 높이를 채우지 못함
    - `.m2-col`이 flex 컨테이너 아님 → 자식 `.m2-rows`의 `flex: 1 1 auto`가 작동할 부모 컨텍스트 부재
* 구현 명세:
    - `.m2-cols`에 `flex: 1 1 auto; min-height: 0;` 추가 (contents-body 높이 채움)
    - `.m2-cols:has(.m2-rows), .columns:has(.rows)`에 `align-items: stretch` 추가 → 중첩 rows 있을 때만 column 풀-height. 단순 image+text 2-col(`#/4`)은 기존 center 정렬 유지
    - `.m2-col`에 `display: flex; flex-direction: column;` 추가 → 내부 `.m2-rows`가 flex item으로 작동
* 검증: layoutTest, m2SlideStyle1_single, m2SlideStyle2_chapter 3종 빌드 성공. `#/7` 2x2 그리드 4개 row 균등 분할 정상. `#/4`/`#/5`/`#/6` 회귀 없음

## Issue94. 테이블 슬라이드에 layout-_contents 클래스 미적용 (등록: 2026-05-04, 해결: 2026-05-04, commit: 45cedeb) ✅
* 카테고리: Generator
* 목적: 테이블이 포함된 슬라이드만 `<section>`에 `class="layout-_contents"`가 부여되지 않아 `theme_default_layout: contents` 환경에서 §3 제목 스타일·상하단 hr.png 가로선·우상단 puffer 마스코트가 모두 누락됨. 다른 본문 슬라이드와 동일한 레이아웃 적용 보장
* 근본 원인: [`lib/html-builder.js:251`](lib/html-builder.js)의 디스패처 `if (slide.isTitle || slide.isTable) { return generatePlainSlideHTML(slide); }`이 테이블 슬라이드를 plain 경로로 위임. `generatePlainSlideHTML`은 `title-slide`/`has-text` 클래스만 부여하고 `layout-{name}` 클래스는 추가하지 않음. 과거 reveal.js markdown plugin에 `data-markdown`으로 위임하던 흔적이지만 현재는 `convertMarkdownToHTML`이 직접 `<table>` HTML을 생성하므로 우회 불필요
* 구현 명세:
    - `lib/html-builder.js:251` 디스패처에서 `slide.isTable` 조건 제거 — 테이블 슬라이드도 layout 경로(_contents) 통과
    - `lib/slide-parser.js:212` (선행 09babdf 포함): isTable 슬라이드 반환 시 `title`/`rawMarkdown`/`hasText` 필드 추가하여 layout 경로 정상 통과 보장 (extractFirstH1로 H2 제목 분리)
* 검증: m2SlideStyle1_single `#/29` `#/30` 슬라이드에 `<section class="layout-_contents"><h2 class="title">+<div class="contents-body"><table>` 정상 구조. m2SlideStyle2_chapter `06-tables-mixed.html` 동일 정상. layoutTest 빌드 성공 (테이블 슬라이드 없음, 회귀 없음)

## Issue95. Pandoc `::: rows` 행이 contents-body 채우지 못하고 height 비례 미적용 (등록: 2026-05-04, 해결: 2026-05-04, commit: 09babdf) ✅
* 카테고리: Theme
* 목적: `Projects/layoutTest/slide/index.html#/6` (상/하 분할) 에서 두 번째 `.m2-row`가 `.contents-body` 영역에 흡수되어 보이고, 마크다운에 명시한 `height="40%"`/`height="60%"` 비례가 무시되어 콘텐츠 자연 크기로 떠 있음. 추가로 행 내부 이미지가 행 경계를 넘어 오버플로
* 근본 원인:
    - `lib/css/base.css`의 `.m2-rows` / `.m2-row` 규칙에 `flex`/`min-height` 부재 → `.contents-body`(flex column) 안에서 자연 높이로 수축, 인라인 `height: N%` 미적용
    - `.m2-row`가 flex column이 아니라 `.media-container`의 `flex-grow`가 적용되지 않음 → 이미지 자연 크기로 행 경계 초과
* 구현 명세:
    - `lib/css/base.css` `.m2-rows / .rows`: `flex: 1 1 auto; min-height: 0;` 추가 → contents-body 남은 높이 채움
    - `lib/css/base.css` `.m2-row / .row`: `flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; overflow: hidden;` → 균등/비례 분할 + 내부 미디어 컨테인
    - `.m2-row > .media-container`: `flex: 1 1 0; min-height: 0; overflow: hidden` + img/svg에 `max-height: 100%; object-fit: contain` → 이미지 행 경계 내 contained
* 검증: layoutTest, m2SlideStyle1_single, m2SlideStyle2_chapter 3종 빌드 성공. `#/6` 둘째 행 박스가 `m2-row row` 라벨로 표시되고 contents-body 끝까지 도달, 이미지 행 경계 내 contained. `#/7` (2x2 nested rows) 균등 분할 정상. `.m2-cols` 가로 분할 영향 없음 (해당 규칙 미변경)

## Issue93. Pandoc `::: columns` / `::: rows` 본문 누락 (등록: 2026-05-04, 해결: 2026-05-04, commit: 09babdf) ✅
* 카테고리: Generator
* 목적: `Projects/layoutTest/layoutTest.md` 슬라이드 4~7 (`Pandoc ::: columns 두 컬럼`, `3분할 카드`, `상/하 분할`, `2x2 그리드`) 의 본문이 산출물 HTML에서 빈 `<div class="contents-body"></div>`로 렌더되어, Pandoc fenced div 다분할 레이아웃 기능이 완전히 동작 안 함
* 근본 원인: [`lib/html-builder.js:258`](lib/html-builder.js)의 `extractSlots(slide.rawMarkdown)` 호출이 `convertMarkdownToHTML`보다 먼저 실행됨. `extractSlots` 정규식 `/^:::\s+([a-z][a-zA-Z0-9-]*)\s*\n([\s\S]*?)\n:::\s*$/gm` ([`lib/slide-parser.js:111`](lib/slide-parser.js)) 이 `::: columns ... :::` / `::: rows ... :::` 블록을 "이름 있는 슬롯"으로 매칭하여 본문에서 제거. `_contents` layout 템플릿에 `{{columns}}` / `{{rows}}` 변수가 없어 콘텐츠 silently 누락
* 구현 명세:
    - `lib/slide-parser.js` `extractSlots`에 `PANDOC_LAYOUT_RESERVED = new Set(['columns', 'column', 'rows', 'row'])` 화이트리스트 추가, 매칭 시 원본 텍스트 그대로 반환하여 후속 `preprocessPandocDiv`가 fenced div로 처리하도록 위임
* 검증: layoutTest 빌드 후 slide 4~7의 `<div class="contents-body">` 안에 `<div class="m2-cols columns">`/`<div class="m2-rows rows">` 정상 마크업 출력. `#/7` (2x2 nested) 정상. m2SlideStyle1_single, m2SlideStyle2_chapter 회귀 없음. 사용자 정의 슬롯(`::: leftPanel` 등) 영향 없음 (예약어 4개만 제외)

## Issue91. 제목 underline이 contents-header 안쪽에 있어 위/아래 갭 비대칭 (등록: 2026-05-04, 해결: 2026-05-04, commit: 2b1c3d9) ✅
* 카테고리: Theme
* 목적: 슬라이드 위쪽 가로선(`section::before`)과 제목 아래 underline(`.title::after`)이 서로 다른 박스 기준이라 좌우 끝이 정렬되지 않고, underline이 contents-header/box 안쪽에 갇혀 위/아래 갭 비대칭으로 보임. 두 가로선을 모두 `.title` 박스에 부착하여 자동 정렬
* 구현 명세 (Issue90과 동일 커밋에서 해결):
    - `theme/default/slide.css`:
        - `.layout-_contents`에서 `section::before` 숨김 (대신 `.title::before` 사용)
        - 위쪽 가로선: `.title::before { top: -12px; right: 0 }` — `.title` 박스 외부 위, 슬라이드 하단 가로선과 동일 폭
        - 아래 underline: `.title::after { bottom: -12px; right: 10% }` — `.title` 박스 외부 아래, 우상단 puffer 회피용 right 10% 유지
    - `lib/html-builder.js`:
        - 빈 `contents-header`(빈 `<h1 class="contents-title">`) 빌드 후 제거
        - `.contents-body` 첫 자식 H2를 section 직속 자식으로 이동 (백업본 `<section><h2 class="title">+<div class="theContents">` 구조와 등가)
* 검증: m2SlideStyle1_single, m2SlideStyle2_chapter 빌드 산출물에서 두 가로선 모두 `.title` 박스 외부에 위치하고 좌우 끝이 자동 정렬됨 (`.title` width: 100% → 박스 폭에 종속)

## Issue90. title_contents_gap이 .contents-title에 적용 안 됨 (등록: 2026-05-04, 해결: 2026-05-04, commit: 2b1c3d9) ✅
* 카테고리: Theme
* 목적: `_config.yml`의 `title_contents_gap` 설정이 chapter 모드의 H2 슬라이드에서 작동하지 않아 모드별 제목↔본문 갭이 일관되지 않음. 모든 제목 클래스에 일관 적용 + cascade 충돌 해소
* 근본 원인:
    - `base.css:135` `.reveal .title { margin-bottom: calc(var(--title-contents-gap-pct, 0) * 0.01em) }` (specificity 0,0,2,0)이 theme `.reveal section[class*="layout-"] .contents-body > .title { margin: 0.3em auto 0.3em auto }` shorthand (specificity 0,0,4,1)에 의해 override됨 — `margin-bottom: 0.3em` 강제 명시로 변수 무력화
    - `.contents-body`가 flex column이지만 H2가 그 자식이 아니라 외부로 이동했을 때 .title 자체의 sibling collapse 가능
* 구현 명세:
    - `lib/css/base.css`:
        - `.reveal .title` 룰을 `.title, .contents-title, .chapter-title, .chapter-toc-title, .toc-title, .blank-title, .closing-title, .exercise-title` 그룹으로 분리
        - font-* 속성은 `.title` 전용 유지, `margin-bottom: calc(...)`만 그룹 전체에 일관 적용
    - `theme/default/slide.css`:
        - `.contents-body > .title`의 `margin: 0.3em auto 0.3em auto` shorthand 분리 → `margin-top/left/right`만 명시, `margin-bottom`은 base.css의 calc(...)이 정상 적용되도록 제거
        - `.title:first-child + * { margin-top: 0 !important }` — sibling margin collapse 차단
        - `section[class*="layout-"] > .title` 셀렉터 추가 — H2가 contents-body 외부 이동 시에도 동일 스타일 적용
        - `.layout-_contents > .title { width: 100%, padding/margin 좌우 0, box-sizing: border-box }` — section padding과 동일 폭 보장
* 검증: m2SlideStyle1_single, m2SlideStyle2_chapter, layoutTest 3종 빌드 통과. `title_contents_gap: 0/30/60` 변경 시 갭 비례 변화 확인. 가이드라인 모드에서 `.title` 박스가 `.contents-body` 외부에 위치하고 두 가로선이 정렬됨

## Issue92. Home/End sibling 점프가 H2 sub-section까지 매칭 + 일부 환경에서 Home/End keydown 미전달 (등록: 2026-05-04, 해결: 2026-05-04, commit: b9610bb) ✅
* 카테고리: Frontend
* 목적: Single 모드에서 ⇤ Home / ⇥ End 가 설계 의도(인접 H1 anchor 점프)와 다르게 동작 + 일부 macOS 환경에서 Home/End keydown 이벤트가 페이지까지 도달하지 않아 키 자체가 무반응. 두 문제 모두 해결하여 발표 중 sibling 챕터 점프를 안정적으로 보장
* 상세:
    - 증상1: `Projects/m2SlideStyle1_single` `index.html#/12` (H1 `4. 이미지 및 미디어`) 에서 ⇥ End 가 `#/14` (H2 `4.1. 이미지`) 로 잡힘. 사용자 기대치는 다음 H1 인 `#/20` (`5. 레이아웃 예제`). ⇤ Home 도 H2 sub-anchor (`#/14`, `#/17`) 가 후보에 들어가 H1 점프 의미 훼손
    - 원인1: `lib/html-builder.js` `findPrevAnchorIndex` / `findNextAnchorIndex` 가 `isAnchorSlide` (`layout-_toc` + `id !== 'toc-placeholder'`) 만 검사. 설계 ([`_doc_design/key_navigation.md`](_doc_design/key_navigation.md) L87) 는 "직전/직후 **H1 anchor**" 명시이나 코드는 H2 sub-section autoToc 까지 모두 매칭
    - 원인2: `lib/slide-parser.js` autoToc 분기는 헤딩 레벨에 무관하게 (children 존재 시) `layout: '_toc'` 로 wrap. 렌더된 section에 heading level 정보가 없어 키 핸들러가 H1 vs H2 구분 불가
    - 증상2: 사용자 환경 (macOS) 에서 물리적 Home/End 키를 눌러도 window 최상위 capture phase 에서도 keydown 자체가 잡히지 않음 (PgUp/PgDown 은 정상 도달). 진단 페이지 `_doc_work/key-test.html` 로 확인. 원인은 OS·키보드·리매핑 도구 단계 추정 — 우리 코드로는 해결 불가
* 구현 명세:
    - `lib/slide-parser.js` autoToc 분기에서 `s.headingLevel = level` 보존
    - `lib/html-builder.js` `generateSlideHTML` 에서 `slide.autoToc && slide.headingLevel` 인 section 에 `data-heading-level="${level}"` 속성 주입
    - 키 핸들러 (`generateHTML` 본문 deck) 에 `isH1Anchor` 헬퍼 추가 — `isAnchorSlide` + `dataset.headingLevel === '1'`. `findPrevAnchorIndex` / `findNextAnchorIndex` 가 `isH1Anchor` 사용. `isAnchorSlide` 자체는 ↑/↓ parent/child 의미 유지 위해 그대로 (H2 sub-section TOC 도 anchor 로 인정)
    - Home/End 핸들러에 fallback 매칭 추가: `event.code === 'Comma'` / `event.code === 'Period'` (`,` / `.`). cover 핸들러 ([`generateCoverHTML`](lib/html-builder.js)) 와 agenda 핸들러 ([`generateAgendaHTML`](lib/html-builder.js)) 에도 동일 fallback 적용 (no-op 매핑 확장). `event.code` 기반이라 Shift·한글 IME 무관
    - 설계 문서 [`_doc_design/key_navigation.md`](_doc_design/key_navigation.md) 키 정의 표 / 핵심 원칙 / 변경 이력 갱신 — `,`·`.` fallback 명시
* 검증:
    - 빌드 3종 (`m2SlideStyle1_single`, `m2SlideStyle2_chapter`, `layoutTest`) 모두 성공
    - `Projects/m2SlideStyle1_single/slide/index.html` H1 anchor (`data-heading-level="1"`) 7개 (#/1, #/5, #/8, #/12, #/20, #/28, #/31), H2 sub-anchor (`data-heading-level="2"`) 2개 (#/14, #/17) 분리 확인
    - `,` / `.` 키 동작 사용자 직접 확인 완료 — `#/12` 에서 `,` → `#/8`, `.` → `#/20` 정상
    - 진단 페이지 `_doc_work/key-test.html` 는 검증 완료 후 삭제

### Issue92_1. macOS 환경에서 Home/End 물리 키 keydown 미전달 원인 규명·복구 (등록: 2026-05-04, 해결: 2026-05-04, commit: 3cdde72) ✅
* 카테고리: Frontend
* 목적: Issue92 fallback (`,` / `.`) 으로 우회는 했으나, 표준 ⇤ Home / ⇥ End 물리 키가 정상 동작해야 발표 중 손가락 위치를 자연스럽게 유지 가능. macOS 단계에서 Home/End keydown 이 브라우저까지 전달되지 않는 근본 원인을 규명하고 복구
* 원인 (식별):
    - **Keyboard Maestro** `KeyHome` / `KeyEnd` 매크로가 Home/End 키를 ⌘ArrowLeft / ⌘ArrowRight 로 변환 (조건: iTerm front 가 아닐 때 → ⌘LeftArrow + Home 시뮬레이션, 그 외 → ⌘LeftArrow). 결과적으로 페이지에는 Home keydown 이 도달하지 않고 ⌘+ArrowLeft 가 도달
    - IME 무관 확인 (영문 모드에서도 동일), Karabiner / BetterTouchTool 무관 확인, macOS 시스템 단축키 무관 확인 → KM 매크로가 단일 원인
    - 사용자가 KM 매크로의 다른 기능 의존성으로 매크로 자체를 변경 불가
* 구현 명세 (실행):
    - `lib/html-builder.js` 4개 핸들러에 `⌘+← → Home`, `⌘+→ → End` 동의어 매핑 추가:
        - deck Home 핸들러: `(event.metaKey && event.key === 'ArrowLeft')` 추가
        - deck End 핸들러: `(event.metaKey && event.key === 'ArrowRight')` 추가
        - cover handler: Home/End fallback 분기에 `(e.metaKey && (ArrowLeft||ArrowRight))` 추가, ArrowRight child 분기에 `!e.metaKey` 조건 강화
        - agenda handler: 동일 패턴 적용 (ArrowLeft/ArrowRight 일반 분기 `!e.metaKey`, Home/End fallback 분기에 ⌘+arrow 추가)
    - deck ArrowLeft / ArrowRight 일반 핸들러에 `!event.metaKey` 조건 추가 — Home/End 분기와 충돌 방지
    - 진단 도구 `_doc_work/key-test.html` 재생성하여 OS 단계 이벤트 도달 여부 검증
* 검증:
    - `m2SlideStyle1_single` 빌드 성공, 산출물 `index.html` 5건 + `agenda.html` 3건 `Issue92_1` 마커 확인
    - `index.html#/12` 에서 Home(KM 변환) → #/8, End(KM 변환) → #/20 정상 동작 (사용자 검증)
    - ⌘+← / ⌘+→ 직접 입력도 동일 동작
    - 일반 ←/→ 슬라이드 prev/next 회귀 없음
* 디버깅 노트: [`_doc_work/debug_TECH.md`](_doc_work/debug_TECH.md) "키보드 네비게이션" 섹션에 사례 박제
* 비고:
    - 원인이 사용자 환경(KM 매크로) 한정이므로 다수 사용자에게는 재현 안 될 수 있으나, ⌘+arrow → Home/End 동의어 매핑은 일반적 macOS 텍스트 편집 컨벤션과도 일치하여 부수 비용 없음
    - 향후 KeyboardEvent 정규화 레이어가 필요하면 본 패턴을 베이스로 일반화 가능

## Issue89. ⇤ Home / ⇥ End 키 동작 안 함 — Reveal.js hijack 수정 (등록: 2026-05-04, 해결: 2026-05-04, commit: ba4e084) ✅
* 카테고리: Frontend
* 목적: Issue87에서 추가한 ⇤ Home / ⇥ End sibling 점프가 Reveal.js 5.0.4의 자체 keymap에 의해 가로채져 동작 안 함. capture phase 등록으로 우선순위 확보
* 원인: Reveal.js 5.0.4가 Home/End(keyCode 35/36)를 자체 keymap("첫/마지막 슬라이드")으로 가로챔. 우리 `document.addEventListener('keydown', handler)`가 bubble phase(3번째 인자 누락)에 등록되어 `Reveal.initialize()`가 먼저 호출된 시점 이후 무력화
* 구현 명세:
    - `lib/html-builder.js` 3종 핸들러를 `{capture: true}`로 변경 — bubble보다 먼저 호출되어 stop()으로 Reveal 핸들러 차단
        - `generateHTML` deck 핸들러
        - `generateCoverHTML` cover 핸들러 (각 if 블록에 `e.stopImmediatePropagation()` 추가)
        - `generateAgendaHTML` agenda 핸들러 (일관성 유지)
* 검증: 4종 산출물(Single deck, Chapter cover/agenda/deck) 모두 `}, true);` capture phase 마커 주입 확인. PgUp/PgDown·←/→/↑/↓·⎋ 회귀 없음
* 사용자 검증 시나리오:
    - Single `#/9` → Home → `#/8`, `#/12` → Home → `#/8`
    - Single `#/8` → End → `#/12`, `#/9` → End → `#/12`
    - Chapter 본문 → Home/End → 이전/다음 챕터 페이지 이동

## Issue88. key_navigation.md 정합성 후속 수정 (등록: 2026-05-04, 해결: 2026-05-04, commit: a44b7b6) ✅
* 카테고리: Generator (설계 문서)
* 목적: Issue87 설계 변경 후 검토 결과 6건 정합성 보강. mermaid 라벨·구현 매핑·변형 캡션·결정사항 표현 정리
* 구현 명세:
    1. Mermaid TOC2 라벨에 "anchor 없을 시" 단서 추가
    2. 구현 매핑 함수명 정정 (`getParentPage` 잘못된 참조 제거 → deck 내부 lookup + 정적 redirect 조합 명시)
    3. cover_enabled=false 변형 캡션에 ↑ 동작 명시 (Cover 부재 → 동작 없음)
    4. K12("K3/K4 swap 사유")를 결정사항 표 외 "변경 이력" 섹션으로 분리
    5. K11 표현 정리 ("hijack 인지" → "Reveal 기본 동작 override")
    6. 후속 검토 항목 추가 — Chapter 모드에서 같은 챕터 내 H1 anchor sibling 점프 수단 부재 (긴 챕터 UX 개선 후보)
* 검증: `_doc_design/key_navigation.md` 표/매트릭스/mermaid/결정사항 모순 없음, Issue87 구현과 동기 commit

## Issue87. key_navigation 설계 반영 — 9키 네비게이션 체계 구현 (등록: 2026-05-04, 해결: 2026-05-04, commit: a44b7b6) ✅
* 카테고리: Frontend + Generator
* 목적: [`_doc_design/key_navigation.md`](_doc_design/key_navigation.md) SSOT를 빌드 산출물에 반영. ↑/↓를 페이지 계층 parent/child 이동, ⇤/⇥를 sibling 점프, ⇞/⇟를 끝단 직행으로 매핑한 9키 네비게이션 체계 구현
* 구현 명세:
    - **키 매핑 (2026-05-04 swap 후 최종)**:
        - ↑/↓ = 페이지 계층 parent/child 이동 (수직)
        - ⇤ Home / ⇥ End = 이전/다음 sibling 점프 (수평) — Chapter: 챕터 TOC, Single: H1 anchor
        - ⇞ PgUp = 어디서든 Agenda Page 직행 (Reveal 기본 동작 override)
        - ⇟ PgDown = 마지막 페이지 직행 (Chapter: `LAST_CHAPTER?last=1`, Single: deck 마지막)
    - `lib/agenda.js`: `getLastChapter()` 신규 (⇟용). `getPrevChapter`(Issue70 기존)·`getNextChapter`(기존) 재활용
    - `lib/generate-slides.js`: `lastChapter`/`mode`/`coverEnabled` props를 `generateCoverHTML`/`generateAgendaHTML`로 wiring
    - `lib/html-builder.js`:
        - `generateHTML` (1074–1230): deck용 9키 핸들러 — `findPrev/NextAnchorIndex` 재활용, `LAST_CHAPTER` 변수 주입
        - `generateCoverHTML` (1438+): Cover 전용 9키 핸들러 — Cover에서 ↑/⇤/⇥/← 모두 동작 없음 (최상위·sibling 없음)
        - `generateAgendaHTML` (1606+): Agenda 전용 9키 핸들러 — Agenda는 메타 페이지라 ⇤/⇥ 동작 없음
    - swipe·mouse drag IIFE: ←/→/↑/↓ 4방향만 dispatch (단축키는 키보드 전용)
* 변경 이력:
    - 초기 설계: ↑/↓ = sibling, ⇤/⇥ = parent/child
    - 2026-05-04 swap (사용 피드백): Home/End의 "양 끝 이동" 시각이 sibling 점프(수평)에 더 정합 → ↑↔Home, ↓↔End 매핑 교환. 함수명·산출물 구조는 변경 없음
* 검증:
    - `m2SlideStyle1_single` (Single mode), `m2SlideStyle2_chapter` (Chapter mode) 빌드 통과
    - HTML 산출물 4종(Single deck, Chapter cover, Chapter agenda, Chapter deck) 모두 swap 마커 주입 확인
    - PageUp/PageDown Reveal 기본 동작 override 확인
    - swipe로 ⇤/⇥/⇞/⇟ 트리거 안 됨 확인

## Issue86. default theme 시각 개선 — 가로선 hr.png 통일 + 페이지 UI를 outer padding 바깥으로 (등록: 2026-05-04, 해결: 2026-05-04, commit: 582d064) ✅
* 카테고리: Theme
* 목적: default theme의 가로선·페이지번호·controls·progress 위치/시각 언어를 콘텐츠 박스 정렬·outer padding 바깥 배치로 정돈하여 슬라이드 외곽 시각 일관성 향상
* 상세:
    - 일반 layout 상하단 가로선(`section[class*="layout-"]::before/::after`): `left/right: 4%` → `56px`로 변경하여 base.css §10 layout-* padding(56px)과 정렬 → 콘텐츠 박스 폭과 가로선 일치
    - standalone agenda 상단 가로선(`.layout-_agenda::before`): `left/right: 24px`로 변경하여 base.css §12 `.agenda-frame .layout-_agenda` padding(24px)·`.toc-markmap` 폭과 정렬
    - 가로선 단색(`background: var(--kn-accent)`, 2px) → hr.png 이미지(10px, sketch 톤)로 통일. 제목 밑줄(h1::after hr.png)과 시각 언어 일치
    - 페이지 번호·controls·progress: `position: fixed`로 변경하여 viewport 기준 위치 — body의 `--slide-outer-padding`(외곽 letterbox) 영역에 표시되도록 함. `bottom: 0`으로 viewport 하단 정렬 + `z-index: 100~200`으로 progress↔slide-number↔controls 가시성 보장
    - cover layout(`layout-_cover`)이 현재 슬라이드일 때 progress/slide-number/controls 모두 `display: none` (사용자 결정: 표지에는 네비게이션 노출 없음)
    - default_lec theme도 일반 layout 가로선 `left/right` 정렬을 default와 동기 (4% → 56px). hr.png 이미지화는 default만 우선 적용 (옵션 3 선택)
* 검증:
    - m2SlideStyle1_single (outer padding 10px), m2SlideStyle2_chapter (outer padding 110px) 빌드 통과
    - `slide/css/custom.css`에 변경분 모두 반영 확인 (`left: 56px`, `left: 24px`, `hr.png` 가로선, `position: fixed` slide-number/controls/progress)
    - 브라우저 시각 확인 — 가로선 박스 폭 정렬, hr.png sketch 톤 일관, progress·페이지번호·controls가 outer padding 영역(letterbox)에 표시
    - cover 슬라이드에서 progress/slide-number/controls 미표시 확인

## Issue85. slide_outer_padding 4면 균등 적용 + agenda 반영 + unitless 0 calc 회귀 수정 (등록: 2026-05-04, 해결: 2026-05-04, commit: 1a9d78d) ✅
* 카테고리: Theme + Generator + Build
* 목적: `slide_outer_padding`이 좌/상단에만 적용되어 슬라이드가 우/하단으로 흘러넘치는 버그 수정. 추가로 standalone agenda.html이 padding을 무시하는 문제 + unitless `0` 사용 시 CSS3 calc unit-type 불일치로 layout이 무너지는 회귀 동시 해결
* 상세:
    - `.reveal { inset: var(--slide-outer-padding) }` → `body { padding: var(--slide-outer-padding); box-sizing: border-box }` 로 변경. Reveal.js scaling 영역(body content box)을 축소해서 4면 균등 fit 형성
    - `.agenda-frame` width/height 공식에 `calc(100vw - 2 * var(--slide-outer-padding))` 반영. agenda.html은 reveal.js 컨텍스트가 아니라 별도 처리 필요
    - `generateAgendaHTML`이 `<html style="...">`에 `--slide-ratio`만 주입하고 padding은 누락 → `--slide-outer-padding`/`--slide-inner-padding`도 함께 주입
    - CSS3 calc()는 `length - 0` (unitless 0) 연산을 invalid 처리하여 min() 결과가 무너짐 → `:root` 기본값과 `createDefaultConfig` 기본값을 `0` → `0px`로 정정 + 파서에 unitless 0 자동 정규화 추가
* 검증:
    - m2SlideStyle1_single (10px), m2SlideStyle2_chapter (110px), layoutTest (default 0px) 3종 빌드 통과
    - 일반 슬라이드 + agenda.html 모두 4면 균등 외곽 여백 시각 확인
    - 회귀 없음 (default 0px 동작 동일)

## Issue80. theme_layout_default.md §2 레이아웃 변경 결정사항 default theme 적용 (등록: 2026-05-04, 해결: 2026-05-04, commit: a268ad4) ✅
* 카테고리: Theme
* 선행: Issue84 완료 (commit 568f456) — fallback 동작 명세 확보 후 진행
* 목적: `_doc_design/theme_layout_default.md` §2에 명세된 레이아웃 설계 결정사항 6종을 `theme/default/` 실제 layout HTML·`slide.css`에 반영. 설계 SSOT ↔ 빌드 산출물 정합성 회복
* 상세:
    - `_cover` (§2.1): cover-meta 박스 제거 + 우상단 absolute 이동 (version·lecture_date 작게). instructor 검정·중앙 하단 한 줄(`cover-body display:block; text-align:center`). `<span class="cover-label">강사:</span>` 제거
    - `_agenda` (§2.2): standalone wrapper(`div.layout-_agenda`)에 `position: relative` + 상단 노랑 가로선(`::before` top 12px) + 우상단 puffer2s 마스코트 신규. `.toc-page-downloads`에 `margin-right: 9%` 추가하여 puffer2s 영역과 분리
    - `_toc` (§2.3): `.reveal section.layout-_toc`에 `finfraPuffer2s` 우상단 background-image 신규 (본문 layout 일관성)
    - `_contents` (§2.4): 현행(우상단 puffer2s + 상하 가로선 + hr.png 밑줄) 회귀 검증 통과. CSS selector에 `_contents_no_title` 함께 묶어 마스코트 공유
    - `_contents_no_title` (§2.5): `> .contents-body { padding-top: 0; margin-top: 0 }` — 헤더 부재로 본문이 제목 영역까지 확장
    - `_blank` (§2.6): `::before`/`::after { content: none }`로 가로선 제거 + `.blank-header { display: none }` + `> .blank-body { padding: 0 }` + `:has(.slides > section.present.layout-_blank) .slide-number { display: none }`
* 검증:
    - layoutTest, m2SlideStyle1_single, m2SlideStyle2_chapter 3종 빌드 통과
    - 산출물 `slide/css/custom.css`에 변경분 모두 반영 확인 (Issue80 §2.1·§2.5·§2.6 코멘트 + `_agenda::before` 11건 등)
    - 브라우저 시각 검증 (4개 슬라이드: layoutTest/single/chapter index + chapter agenda)

## Issue84. 설계 문서 `theme.md` §2 `slide_css:` 우선순위 표 정정 (등록: 2026-05-04, 해결: 2026-05-04, commit: 568f456) ✅
* 목적: `theme.md` §2가 `slide_css:`를 단순 "우선순위 1 (최우선)"으로 기술하나, 실제 코드(`lib/config.js:241-260`)는 "`slide_css:` 지정 + 파일 존재 시 최우선, 미존재 시 `theme:` fallback"으로 동작. 동작 조건 누락된 spec 정정
* 상세:
    - `_doc_design/theme.md` §2 표에 "파일 존재 시 우선" 조건 명시
    - 표 아래에 fallback 동작 보강: `slide_css:` 지정 파일 미존재 시 → `theme:`로 fallback (silent failure 방지) + `theme:` 미존재 시 default fallback + warning
* 검증: 문서 변경만 (gitignored `_doc_design/`). `lib/config.js` 동작과 기재 일치 재확인

## Issue83. 설계 문서 `theme_layout.md` §5.1·§11.2·§15 `_toc` 자동 적용 조건 정정 (등록: 2026-05-04, 해결: 2026-05-04, commit: 568f456) ✅
* 목적: `theme_layout.md` §5.1·§11.2가 "첫 슬라이드 자동 `_toc` 적용"으로만 기술하나, 실제 코드(`lib/html-builder.js:341`)는 Issue58 이후 "AGENDA.md 서브챕터(H3) 존재 시"에만 `_toc` 적용. Issue58 변경분 미반영 정정
* 상세:
    - §5.1: 적용 조건 3개(`_toc.html` 존재 + `hasTocItems` + `!skipTocPlaceholder`) 명시. single mode/서브챕터 없는 chapter는 미적용 + `isTitle` 슬라이드 제거 명시
    - §11.2: 처리 흐름 7단계로 재구성, 조건 검사·기존 isTitle 교체·fallback 분리 명시
    - §15 검증 기준 7,8,8a 분리 — 적용 케이스/미적용 케이스/예외 fallback
* 검증: 문서 변경만 (gitignored `_doc_design/`). chapter-single-mode.md와 정합성 유지

## Issue82. `lib/layout.js` dead `_WARNED_MISSING_LAYOUTS` 제거 + 설계 문서 §4.4 정정 (등록: 2026-05-04, 해결: 2026-05-04, commit: ee70b2a) ✅
* 목적: `theme_layout.md` §4.4가 회귀 보장 요소로 기재한 `_WARNED_MISSING_LAYOUTS` Set이 실제로는 `lib/layout.js:58`에 dead code로 남아있고, 실제 dedup은 `lib/html-builder.js`의 `_warnedMissingLayouts`가 담당. 코드·문서 모두 실태에 정렬
* 상세:
    - `lib/layout.js`에서 `_WARNED_MISSING_LAYOUTS` Set 선언 제거 + Issue41 코멘트 정리 (Issue82 코멘트로 갱신)
    - `_doc_design/theme_layout.md` §4.4 회귀 보장 요소 표기 정정: `lib/layout.js _registerLayoutTemplate()` + `lib/html-builder.js _warnedMissingLayouts`
* 검증: 4개 프로젝트 빌드 회귀 없음 (m2SlideStyle1_single, m2SlideStyle2_chapter, layoutTest, LlmAndVibeCoding)

## Issue81. 슬라이드 layout 메타 `#layout-` prefix 정식 지원 (등록: 2026-05-04, 해결: 2026-05-04, commit: c27ae5d) ✅
* 목적: 설계 문서(`_doc_design/theme_layout.md` §6, §6.2 + `.claude/rules/md-m2slide-rules.md` 다수 예제)는 `#layout-name` syntax를 명시하나 실제 코드(`lib/slide-parser.js` `extractLayoutMeta`)는 `#name` 형태만 인식하여 모든 문서·예제가 동작하지 않던 상태. spec ↔ code 정합성 회복
* 상세:
    - `extractLayoutMeta` regex 확장: `^#(_?[a-z][a-z0-9-]*)\s*$` → `^#(?:layout-)?(_?[a-z][a-z0-9-]*)\s*$`
    - `#layout-name` 정식 + `#name` alias 양쪽 모두 인식. 기존 프로젝트 회귀 0
    - 방어적 파서 동작 유지 (`# ` 공백, `#한글`, `#My` 대문자 거부)
    - JSDoc 코멘트 갱신: 정식·alias 양식 명시
* 검증:
    - 파서 단위 10/10 통과: `#layout-cover`/`#cover`/`#layout-_blank`/`#_toc`/`#my-layout`/`#layout-contents-no-title` 양식 + 거부 케이스
    - 4개 프로젝트 빌드 회귀 없음 (m2SlideStyle1_single, m2SlideStyle2_chapter, layoutTest, LlmAndVibeCoding)

## Issue79. `_meta.yml` 폐기 + 메타데이터를 슬라이드 소스 frontmatter로 통합 (등록: 2026-05-04, 해결: 2026-05-04, commit: d49f9bb) ✅
* 목적: 결정사항 "_meta.yml파일 사용 안함"(Issue.md 결정사항 섹션)에 따라 운영 메타데이터를 별도 파일로 분리하지 않고 슬라이드 소스 파일(AGENDA.md / `{ProjectName}.md`)의 YAML frontmatter에 통합. 단일 SSOT로 책임 단순화
* 상세:
    - 폐기: `Projects/*/_meta.yml` 6개 파일 (layoutTest, LlmAndVibeCoding, LlmAndVibeCoding_test, m2SlideStyle1_single, m2SlideStyle2_chapter, MarkdownGraph)
    - 메타 출처 정책:
        - Chapter mode: `markdown/AGENDA.md` frontmatter
        - Single mode: `{ProjectName}.md` 등 generate-slides.js 우선순위로 결정된 슬라이드 소스 `.md` frontmatter
    - 코드: `lib/config.js` `loadProjectMeta(projectDir, inputDir, cfg)` 시그니처 확장, `resolveMetaSourcePath()` 신규 (mode별 출처 결정). `lib/generate-slides.js` 호출부를 inputDir 결정 후로 이동
    - 6개 프로젝트 frontmatter 마이그레이션 (instructor_name·instructor_contact·version·release_date·created_at·created_by 등)
    - 부수 작업: `nowage` 테마 → `default_lec` rename(강의용 공식 테마, git 추적 등록), `lib/html-builder.js` keydown 핸들러 리팩터링(stop()/gotoTocOrAgenda() 헬퍼 추출)
    - 문서 갱신: `_doc_design/{meta-yml,Glossary,chapter-single-mode,theme_layout,theme_layout_default}.md`, `.claude/rules/md-m2slide-rules.md`, `CLAUDE.md`, `README.md`
* 검증:
    - 6개 프로젝트 전수 빌드 통과 — 콘솔 `✅ Project meta loaded from frontmatter: ...`
    - cover 슬라이드 `cover-instructor-name`에 frontmatter 값 정상 치환 (`남중구 (핀프라)`)
    - `_meta.yml` 잔존 참조 0건 (코드·문서, historical Issue 코멘트 제외)

## Issue78. 번호 prefix layout 6종 폐기 + layout_default.md를 theme_layout_default.md에 머징 (등록: 2026-05-03, 해결: 2026-05-03, commit: afdb361) ✅
* 목적: Issue73에서 추가된 번호 prefix layout 6종(`2.2.contents-full`, `2.3.contents-split`, `4.2.chapter`, `6.1.exercise`, `6.2.exercise-small`, `9.1.closing`)을 폐기하고, 시각 디자인 SSOT(과거 `layout_default.md`)를 `theme_layout_default.md`에 통합하여 default theme 단일 진입점으로 단순화함
* 상세:
    - 폐기 대상: `theme/default/layouts/` 번호 prefix HTML 6개 (`git rm` 처리)
    - `_doc_design/layout_default.md` → `theme_layout_default.md` §7 "디자인 방향성"·§8 "변경 가이드라인" 머징 후 삭제
    - 부수 작업(범위 확장): layout HTML class를 파일명 기준 `_` prefix 유지 표기로 정렬 (`layout-cover` → `layout-_cover` 등) — `_doc_design/theme_layout.md` §4.2/§4.3 규정 정렬
    - `lib/css/base.css`, `theme/default/slide.css`, `lib/html-builder.js`의 selector·생성 클래스명 일괄 갱신
* 검증:
    - 빌드 검증: `m2SlideStyle1_single`, `m2SlideStyle2_chapter`, `layoutTest` 모두 통과
    - 산출물 HTML에서 `layout-_<name>` 클래스 정상 출력 확인 (8건 이상)
    - 폐기된 번호 prefix layout 6종은 어떤 프로젝트에서도 미참조 (grep 0건)
    - `layout_default.md` 잔존 참조 0건 (`_doc_design/`·`_doc_work/`·`.claude/`·`Issue.md`)

## Issue77. markmap fold 인디케이터 원 크기 30% 축소 (등록: 2026-05-03, 해결: 2026-05-03, commit: a29a0fa) ✅
* 목적: agenda 페이지 markmap 서브챕터 fold 인디케이터 원이 너무 크게 표시되는 문제 해결
* 상세:
    - `theme/default/slide.css`: `.toc-markmap circle`, `.toc-mindmap-svg circle`에 `r: 4.2` 추가
    - markmap-view 기본 radius 6 → 4.2 (30% 축소)
* 검증: `LlmAndVibeCoding` 빌드 → `agenda.html` 시각 확인

## Issue76. lib/combine-pdfs.py 신규 — macOS Quartz 기반 PDF 병합 (등록: 2026-05-03, 해결: 2026-05-03, commit: 1cb45ba) ✅
* 목적: 챕터별 PDF를 단일 파일로 병합하는 CLI 스크립트 추가
* 상세: 5/2 작성 후 어떤 이슈에도 포함되지 않은 잔재 → 사후 등록·수습
* 구현: `lib/combine-pdfs.py` (Python 3, macOS Quartz/PDFKit 의존)
* 사용법: `combine-pdfs.py <output.pdf> <input1.pdf> [...]`

## Issue75. _agenda.html instructor div 제거 + CLAUDE.md base.css 가드 섹션 추가 (등록: 2026-05-03, 해결: 2026-05-03, commit: 8d47945) ✅
* 목적: agenda 헤더에서 강사 정보 노출 제거 + base.css 수정 운영 가드 룰 박제
* 상세:
    - `_agenda.html`: instructor 정보는 cover에만 표시, agenda는 markmap+downloads 중심으로 단순화
    - `CLAUDE.md`: "🛑 base.css 수정 가드 (필독)" 섹션 신규 — Issue64 후속 운영 가드
* 사후 등록: 5/3 11:53/12:23 시각의 잔재 → 사후 수습

## Issue74. AGENDA title Format A/B 통일 + cover 강사 label 미세 개선 (등록: 2026-05-03, 해결: 2026-05-03, commit: 67222eb) ✅
* 목적: AGENDA.md title 파싱을 헬퍼로 일원화하여 Format A/B 양쪽 지원, cover 강사 라벨 가독성 개선
* 상세:
    - `lib/generate-slides.js`, `lib/generate-epub.js`: agenda.js의 `getAgendaTitle()` 헬퍼로 통일
    - Format A (`# Plain Title`) + Format B (frontmatter title) 양쪽 지원
    - `theme/default/layouts/_cover.html`: "강사" → "강사: " (콜론 추가) + EOF newline 정리
* 사후 등록: Issue67 시각대(5/3 11:15~11:21) 잔재

## Issue73. theme/default/layouts/ 번호 prefix layout 6종 신규 추가 (등록: 2026-05-03, 해결: 2026-05-03, commit: da0cc88) ✅
* 목적: 번호 prefix 컨벤션(`_doc_design/theme_layout.md`) 기반 layout 변형 추가
* 상세:
    - 신규 6건: `2.2.contents-full.html` (전체 높이 contents), `2.3.contents-split.html` (좌/우 split), `4.2.chapter.html`, `6.1.exercise.html`, `6.2.exercise-small.html`, `9.1.closing.html`
    - 5/1 작성됐으나 어떤 이슈에도 포함되지 않은 잔재 → 사후 등록·수습

## Issue72. CSS `!important` 과도 사용 1차 최적화 (등록: 2026-05-03, 해결: 2026-05-03, commit: 05b7782) ✅
* 목적: `_doc_design/css.md` SSOT 기반으로 CSS의 `!important` 과도 사용을 정리. **안정성**(specificity로 충분히 우선되는 케이스만 제거) + **수동 용이성**(사용자 override 가능성 회복) + **slide.css 최소화**가 목표
* plan: (단순/중간 — plan 파일 미생성, 본 이슈 본문 명세로 충분)
* 상세:
    - 현황: `lib/css/base.css` 64건 + `theme/default/slide.css` 51건 + `theme/nowage/slide.css` 46건 = **161건** `!important` 사용
    - 분류:
        - **A. 보존 (의도적 강제 override)**: guide-line-mode 디버깅 블록 (~80건), Reveal.js 인라인 스타일 차단(`inset` 라인 182), `ratio-fill` 모드 height/overflow override(204-206), Reveal.js controls/page-num 강제(theme), `position: relative` (Reveal.js absolute 차단), media-enlarge-* 블록 (50건; 후속 이슈 분리)
        - **B. 제거 가능 (specificity·cascade order로 충분)**: 본 이슈 1차 작업 대상
* 구현 명세:
    - **B-1**: `lib/css/base.css:255` `.reveal ul ul, ...` `margin-left: 1.5em !important;` → `margin-left: 1.5em;` (layout 셀렉터가 더 높은 specificity로 자연 override)
    - **B-2**: `lib/css/base.css:1087` `.reveal section[class*="layout-"] ul ul` `margin-left: 1.2em !important;` → `margin-left: 1.2em;` (B-1과 짝, 같은 specificity 내 후순위 정의 우선)
    - **B-3**: `theme/default/slide.css:195` 및 `theme/nowage/slide.css:184` `.reveal section.layout-chapter` `justify-content: flex-end !important;` → `flex-end;` (theme이 base.css 후 로드, 동일 specificity면 후순위 우선)
    - **B-4**: `theme/default/slide.css:245-247` 및 `theme/nowage/slide.css:234-236` `.reveal section.layout-closing` (`justify-content`/`align-items`/`text-align`) `!important` 제거 (B-3과 동일 근거)
    - **후속 이슈 후보**: media-enlarge-* 50건 (광범위 회귀 위험으로 분리), theme guide-line-mode color-coded 80건 (디버깅용으로 보존이 적절한지 재검토)
* 검증:
    - `m2SlideStyle1_single`/`m2SlideStyle2_chapter`/`layoutTest` 빌드 통과
    - 활성 `!important` 161 → 151건 (-10건), 시각 회귀 없음
    - chapter 하단 정렬·closing 중앙 정렬 유지, list nested 들여쓰기 정상
* 비고: 커밋 `05b7782`에는 사용자의 이전 미커밋 작업(`theme/default/slide.css` toc-page 색상·배경 변경)이 함께 포함됨 (사용자 동의 하 일괄 커밋)

## Issue71. ↑ 키 H1 section anchor 단위 이동 + Home 키 도입 (등록: 2026-05-03, 해결: 2026-05-03, commit: d54eab7) ✅
* 목적: `_doc_design/key_navigation.md` v1에서 후속 검토로 분리되었던 "본문 → H1 section anchor → Agenda" 4단계 페이지 계층(Single)·5단계(Chapter) 구현. 동시에 Home 키를 도입해 어디서든 1키로 Agenda 진입 가능하게 함
* plan: (단순/중간 — plan 파일 미생성, 본 이슈 본문 명세로 충분)
* 상세:
    - 현재 동작: Single 본문에서 ↑ → 즉시 `agenda.html` 직행. H1 section 슬라이드(layout-_toc.autoToc)를 거치지 않음
    - 사용자 보고: `m2SlideStyle1_single/slide/index.html#/13` ("이미지" H1 children) 위치에서 ↑ → `#/12` H1 section으로 가야 자연스러운데 agenda로 감
    - 마크다운 파서(`lib/slide-parser.js:243-269`)는 이미 H1 children이 있는 슬라이드를 `layout: '_toc'` + `autoToc: true`로 자동 분류 중. 따라서 별도 H1 식별 로직 불필요 — layout 클래스만 활용
    - chapter mode `#/toc-placeholder` 슬라이드와 구분: id가 `toc-placeholder`면 chapter 시작 TOC, 그 외 `layout-_toc`면 H1 section anchor
* 구현 명세:
    - `_doc_design/key_navigation.md` 매트릭스 갱신 (K4 v1을 H1 anchor 단위로 승격, Chapter 모드도 본문→H1→TOC 단계 추가, Home 키 행 추가)
    - `lib/html-builder.js` deck `keydown` 핸들러:
        - 본문 슬라이드(layout-_toc 아님)에서 ↑ 시 같은 deck 내 자기보다 앞쪽의 가장 가까운 `layout-_toc`(toc-placeholder 제외) 인덱스 찾아 `Reveal.slide(idx, 0)` — 없으면 기존 폴백(Single agenda / Chapter toc-placeholder / agenda)
        - autoToc 슬라이드(layout-_toc + id≠toc-placeholder)에서 ↑ 시 Single → agenda.html, Chapter → 같은 deck `#/toc-placeholder`(있으면) → 없으면 agenda
        - Home 키(keyCode 36) → 항상 `agenda.html`로 이동 (cover/agenda 자체에서는 동작 없음 또는 reload 방지)
    - `lib/html-builder.js` agenda standalone 핸들러: Home 키는 자기 페이지이므로 무시
    - `lib/html-builder.js` cover 핸들러: Home 키 → agenda.html
* 검증:
    - `Projects/m2SlideStyle1_single` 빌드 → `index.html#/13`에서 ↑ → `#/12`(또는 직전 H1 anchor) 이동 확인
    - `Projects/m2SlideStyle2_chapter` 빌드 → 본문에서 ↑ → 같은 deck H1 anchor → 다시 ↑ → `#/toc-placeholder` 이동 확인
    - 모든 페이지에서 Home 키 → `agenda.html` 진입

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

> v0.5.0 (2026-05-03) 시점 71건 아카이브 → [`z_old/old_issue.md`](z_old/old_issue.md)

# 🚫 취소

# 📜 참고

## Issue25. 배경 이미지 설정 기능 (보류: 2026-05-01)
* 마크다운 메타데이터(YAML frontmatter)를 통해 전체 슬라이드의 배경 이미지를 지정하는 기능 구현
* `background` 속성으로 이미지 경로 혹은 color 지정 지원
* **보류 사유**: theme/{name}/slide.css 시스템(Issue36/38)으로 동일 목적 달성 가능 (ex: `.reveal { background: url('img/bg.png') center/cover; }`). 비기술 사용자가 마크다운만으로 슬라이드별 배경을 자주 바꾸는 use-case가 누적되면 재검토.

