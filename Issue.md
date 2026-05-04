# Issue Management
* https://github.com/Finfra/m2slide/issues
* Issue HWM: 92
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

## Issue90. title_contents_gap이 .contents-title에 적용 안 됨 (등록: 2026-05-04)
* 카테고리: Theme
* 목적: `_config.yml`의 `title_contents_gap` 설정이 chapter 모드의 `.contents-title`(contents-header 안의 제목)에는 적용되지 않아 모드별 제목↔본문 갭이 일관되지 않음. 모든 제목 클래스에 일관 적용되도록 보강
* 상세:
    - `lib/css/base.css:142` — `margin-bottom: calc(var(--title-contents-gap-pct, 0) * 0.01em);`이 `.reveal .title`에만 정의됨
    - chapter 모드는 H2가 `.contents-header > .contents-title` 구조로 빌드되어 `.title` 셀렉터 미매치 → `title_contents_gap: 30` 무시됨
    - single 모드는 `.contents-body > .title:first-child`로 빌드되어 일부 적용되나, `:first-child` 박스의 `padding-bottom`과 중복 작용
* 구현 명세:
    - base.css `.reveal .title { margin-bottom: ... }` 셀렉터를 `.reveal .title, .reveal .contents-title, .reveal .chapter-title, .reveal .toc-title, .reveal .chapter-toc-title`로 확장 (또는 `.reveal [class$="-title"], .reveal .title` 일괄)
    - 빌드 산출물(`Projects/m2SlideStyle1_single`, `Projects/m2SlideStyle2_chapter`) HTML에서 `.contents-title { margin-bottom: ...em }` 적용 확인
    - `_config.yml`의 `title_contents_gap` 값을 0/30/60으로 바꿔 가며 챕터/싱글 모두 갭 변화 시각 확인
* 후속: Issue91 — 갭 적용 후 contents-title의 underline 가로선이 contents-header 안에 있어 갭 비대칭으로 보이는 문제 해결

# 📙 일반

## Issue91. 제목 underline이 contents-header 안쪽에 있어 위/아래 갭 비대칭 (등록: 2026-05-04)
* 카테고리: Theme
* 목적: 슬라이드 위쪽 가로선(`section::before`)은 contents-header 박스 **바깥**에 있는 반면, 제목 아래 underline(`.contents-title::after` 또는 `.title::after`)은 박스 **안쪽**에 위치하여 시각적으로 위/아래 갭이 비대칭으로 보임. underline을 박스 바깥으로 빼서 첫번째 가로선과 동일한 시각적 패턴으로 정렬
* 상세:
    - guide-line-mode 검증 결과(m2SlideStyle2_chapter `01-text-layout.html#/1`):
        - 위 가로선: contents-header(초록) 박스 위쪽 외부에 위치 (자연스러움)
        - 아래 가로선: contents-header 박스 안쪽 하단에 위치 (제목 underline)
    - underline의 `position: absolute; bottom: 0`이 `.title`/`.contents-title` 박스 기준이라 박스 안에 갇힘
* 구현 명세:
    - 옵션A: `.title::after`/`.contents-title::after`의 `bottom: 0` → `bottom: -10px` (또는 `-100%`)로 박스 외부로 밀어냄. underline은 contents-header padding-bottom 아래쪽 또는 contents-body 시작 직전에 위치
    - 옵션B: contents-header에 `padding-bottom: 0` + `margin-bottom: 0`으로 만들고, underline을 contents-header `::after`로 분리 (구조 변경)
    - 옵션A가 변경 폭 작아 우선 검토
* 의존: Issue90 선행 해결 (title_contents_gap 정상 작동 확보 후 underline 위치 조정해야 갭 제어가 의미 있음)
* 검증: m2SlideStyle1_single, m2SlideStyle2_chapter 빌드 후 첫 본문 슬라이드에서 위/아래 가로선 모두 contents-header(또는 .title) 박스 외부에 위치, 위 갭 == 아래 갭 시각 확인

# 📙 일반

# 📗 선택


# ✅ 완료

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

### Issue92_1. macOS 환경에서 Home/End 물리 키 keydown 미전달 원인 규명·복구 (등록: 2026-05-04)
* 카테고리: Frontend
* 목적: Issue92 fallback (`,` / `.`) 으로 우회는 했으나, 표준 ⇤ Home / ⇥ End 물리 키가 정상 동작해야 발표 중 손가락 위치를 자연스럽게 유지 가능. macOS 단계에서 Home/End keydown 이 브라우저까지 전달되지 않는 근본 원인을 규명하고 OS·키보드·리매핑 도구 설정으로 복구
* 상세:
    - 진단 결과 (key-test.html, window 최상위 capture phase): ↑↓←→·PgUp·PgDown·Cmd·Cmd+Arrow 전달 정상이나 Home/End 만 keydown 이벤트 자체가 페이지에 미도달
    - 우리 JS 핸들러 단계 이전 (브라우저 이벤트 생성 이전 단계) 에서 차단되므로 코드 수정 불가능 — OS·키보드 펌웨어·리매핑 앱 단계 조사 필요
    - 의심 후보:
        - macOS 시스템 설정 → 키보드 → 키보드 단축키에서 Home/End 가 다른 동작에 할당
        - Karabiner-Elements / BetterTouchTool / Hammerspoon / Magnet / Rectangle 등 키 리매핑 도구가 Home/End 가로챔
        - 한/영 IME 가 Home/End 가로챔 (영문 모드 vs 한글 모드 비교 필요)
        - 외장 키보드 펌웨어 매핑 또는 Fn 레이어 설정
        - macOS 접근성 → 단축키 설정
* 구현 명세:
    - 사용자 환경 점검 단계:
        - `Karabiner-EventViewer` 앱 설치 후 Home/End 입력 시 OS 단계에서 잡히는지 확인
        - 입력 모드 (한/영) 를 영문으로 고정한 뒤 재시도
        - 시스템 환경설정 → 키보드 → 단축키 탭의 모든 카테고리에서 Home·End 매핑 검토
        - 키 리매핑 앱 비활성화 후 재시도 (각 앱 quit → 테스트)
        - 다른 키보드 (외장 vs 내장 vs 다른 외장) 로 교차 검증
    - 원인 식별 후 해당 설정 변경 또는 비활성화로 복구
    - 진단 페이지 (`_doc_work/key-test.html`) 재생성 후 사용 — 향후 재발 시 동일 절차로 빠르게 분리 가능
* 검증:
    - key-test.html 에서 Home·End 물리 키 입력 시 keydown 로그 정상 출력
    - `Projects/m2SlideStyle1_single/slide/index.html#/12` 에서 Home → #/8, End → #/20 정상 동작
* 비고:
    - 원인이 OS 환경 (사용자 머신 한정) 으로 확정되면 코드 변경 없이 종결 가능
    - 다수 사용자에게 재현되면 Issue92 fallback 외 추가 코드적 대응 (예: KeyboardEvent 정규화 layer) 검토

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

