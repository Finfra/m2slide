# Old Issues (Archived)

> Issue.md에서 release 시점에 아카이브된 완료 이슈 모음. 시간 역순 (최신 release가 위).

## v0.5.0 (2026-05-03) — 71건 아카이브


## Issue70. 키 네비게이션 체계 정리 — Single ←·Chapter ↑·Chapter 챕터 간 ← (등록: 2026-05-03, 해결: 2026-05-03, commit: fa43351) ✅
* 목적: m2slide 키보드(swipe/drag 포함) 네비게이션을 페이지 계층 기반 단일 매트릭스로 정리하고, 사용자 보고 4건(Single ↑/←, Chapter ↑/←) 해결
* design: `_doc_design/key_navigation.md`
* plan: `_doc_work/plan/key_navigation_plan.md`
* task: `_doc_work/tasks/key_navigation_task.md`
* 카테고리: Frontend, Generator
* 복잡도: 중간 (변경 파일 2개, ↑ 검증·prev chapter lookup 신규)
* 선행 이슈: Issue51 (swipe/drag), Issue55 (3페이지 모델), Issue57 (Agenda/TOC ←)
* 현상 (4건):
    - **Single ↑**: 본문에서 ↑ → 무조건 Agenda. 본문 내 H1 계층 단계별 이동 미지원 (의도된 v1 동작이나 사용자 멘탈 모델과 격차 있음 — H1 anchor는 v2 후보로 분리)
    - **Single ←**: 본문 첫 슬라이드(`index.html#/1`)에서 ← → Cover(`#/0`)로 이동. **Agenda로 가야 함**
    - **Chapter ↑**: ↑가 ←처럼 동작. Single 본문 → Agenda와 동일 멘탈 모델로 통일
    - **Chapter 챕터 간 ←**: TOC slide(또는 chapter `#/0`)에서 ← → 이전 챕터의 마지막 슬라이드로 이동
* 통일 원칙:
    - **↑** : 페이지 계층의 직속 부모 (Single 본문→Agenda, Chapter 본문→deck TOC slide, TOC→Agenda, Agenda→Cover)
    - **←** : deck 내 이전 슬라이드. deck 첫 슬라이드(또는 single 본문 첫)면 "이전 챕터 마지막" 또는 "Agenda"로 fallback
    - **→/↓** : 다음 슬라이드. 마지막이면 다음 챕터(기존 동작 유지). Cover에서는 Agenda 직행(D5/D6, Issue55)
    - **⎋** : Reveal.js overview (1회). ⎋*2(2회 연속)는 썸네일 보기(as-is, Reveal 표준)
* 구현 결과 (Phase 0-7):
    - Phase 0: Reveal.js 5.x hash clamp 의존성 회피 → `?last=1` query 방식 채택
    - Phase 1: `lib/agenda.js`에 `_getAdjacentChapter` 헬퍼 + `getPrevChapter`/`getNextChapter` wrapper (DRY)
    - Phase 2: `lib/html-builder.js`에 `PREV_CHAPTER` JS 변수 빌드 시점 주입
    - Phase 3: Chapter mode TOC slide(또는 `atChapterDeckStart`) ← → `PREV_CHAPTER + '?last=1'` 또는 `agenda.html`
    - Phase 4: Single mode + cover_enabled + `idx.h===1` ← → `agenda.html` (Cover 우회). `M2SLIDE_COVER` 변수 신규
    - Phase 5: 근본 원인 — m2SlideStyle2_chapter `AGENDA.md`가 H2 subsection 없음 → `getSubsections()=[]` → toc-placeholder 미생성 → `findTocSlideIndex()=-1` → 핸들러 silent fail. **Fix**: chapter mode + tocIdx===-1 시 `agenda.html` graceful fallback
    - Phase 6: 3개 프로젝트 빌드 + HTML 변수 주입 검증 통과 (브라우저 12 시나리오는 후속 사용자 검증)
    - Phase 7: `_doc_design/chapter-single-mode.md` cross-reference 추가
* 변경 파일:
    - `lib/agenda.js`: `getPrevChapter` + `_getAdjacentChapter` 추가
    - `lib/html-builder.js`: `PREV_CHAPTER`/`M2SLIDE_COVER` 주입, `Reveal.on('ready')` `?last=1` 핸들러, ↑/← graceful fallback
    - `_doc_design/key_navigation.md` (신규 SSOT, gitignored)
    - `_doc_design/chapter-single-mode.md` (cross-reference, gitignored)

## Issue66. cover 페이지 Reveal.initialize 하드코딩으로 slide_ratio 무효화 (등록: 2026-05-03, 해결: 2026-05-03, commit: bffd865) ✅
* 목적: chapter 모드 진입 페이지(`index.html`, cover_enabled=true)에서 `slide_ratio` 설정이 사실상 무시되고 항상 `fill`처럼 동작하는 버그 수정
* 카테고리: Generator
* 복잡도: 단순 (변경 파일 1개, 수정 자명)
* 선행 이슈: Issue63 (slide_ratio 체계), Issue65 (값 단일화)
* 현상:
    - chapter 모드 + `cover_enabled: true`인 프로젝트(예: `m2SlideStyle2_chapter`)에서 첫 화면(`index.html`)이 viewport 전체를 채움
    - `slide_ratio: "3:2"`/`"16:9"` 어느 값으로 설정해도 cover 페이지는 동일하게 fill로 표시
    - 챕터 본문(`01-*.html` 등)은 정상적으로 ratio fit 동작 → 사용자 시점에서 "chapter 모드 전체가 fill"로 인식됨
* 원인 분석 (2026-05-03 직접 HTML 비교 검증):
    - `lib/html-builder.js`에 두 개의 HTML 생성 함수 존재
        - `generateHTML` (챕터 본문 + single 모드 index): `revealWidth`/`revealHeight`를 `slideRatio`별로 분기 → `Reveal.initialize`에 전달
        - `generateCoverHTML` (chapter 모드 cover): `ratioClass`만 계산하고 DOM 클래스로 부여. **`Reveal.initialize` 호출 부에서 하드코딩**
    - 인라인 CSS 변수(`--slide-ratio`)와 DOM ratio class(`ratio-16-9` 등)는 cfg 따라 정상 출력됨을 직접 확인 → 원인은 **Reveal.initialize 옵션 하드코딩 단 1곳**
    - 추가 충돌 옵션: `center: true`도 하드코딩 — `generateHTML`은 "ratio 모드에서는 항상 false (vertical centering이 ratio fit과 충돌하는 이슈 회피)" 정책. cover도 동일 정책 적용해야 일관성 유지
* 영향 범위 (2026-05-03 경로 분기 확인):
    - **chapter 모드 + `cover_enabled: true`만 영향**: `index.html`이 `generateCoverHTML` 별도 함수로 생성됨 — 하드코딩 적용
    - **single 모드 + `cover_enabled: true`는 정상**: cover 슬라이드가 `generateHTML` 경로의 `#/0`에 주입됨 — ratio 분기 정상 동작
    - `slide_ratio: fill` 사용 프로젝트는 의도대로 동작하므로 시각 변화 없음
* 정책 결정 (2026-05-03 확정):
    - **Single 모드 영향 최소화**: 현재 single 모드는 정상 작동(`generateHTML` 경로 사용)이므로 fix 작업 시 `generateHTML` 쪽 로직은 그대로 유지. 변경은 `generateCoverHTML` 내부에 한정
    - **공통 헬퍼 추출**: `resolveRevealDimensions(slideRatio) → { width, height, ratioClass }` 헬퍼를 정의하여 `generateHTML`·`generateCoverHTML` 두 함수가 공유 (DRY)
* 구현 결과 (commit bffd865):
    - `lib/html-builder.js`:
        - `generateHTML`: 기존 ratio 분기 블록(15줄)을 `resolveRevealDimensions(_cfg.slideRatio)` 헬퍼 호출 1줄로 교체 (동작 동일성 보장)
        - `generateCoverHTML`: `ratioClass` 분기를 동일 헬퍼로 단일화
        - `generateCoverHTML`의 `Reveal.initialize` 하드코딩 제거 → 헬퍼 결과 사용 (`width`, `height`, `center: ratioClass === 'ratio-fill' ? !_cfg.topAlign : false`)
        - `resolveRevealDimensions` 헬퍼는 Issue69(commit 84a2fbe) 작업 시 선행 추가됨 (agenda.html에서도 동일 헬퍼 활용)
* 검증 결과:
    - `m2SlideStyle2_chapter` (slide_ratio: "16:9") 빌드 → `index.html`의 `Reveal.initialize`에 `width: 1920, height: 1080, center: false` 정상 적용
* 회귀 영향:
    - `slide_ratio: fill` 프로젝트: 변화 없음
    - `"16:9"`/`"3:2"` 프로젝트의 cover 페이지: viewport 채움 → 비율 박스로 변경 (이것이 원래 의도였으므로 시각 회귀가 곧 정상화)

## Issue69. agenda.html이 _config.yml의 slide_ratio를 적용하지 않음 (등록: 2026-05-03, 해결: 2026-05-03, commit: 84a2fbe, 357de16) ✅
* 목적: agenda.html(chapter 모드 진입 직후 페이지 / single 모드 standalone agenda)이 `slide_ratio` 설정을 무시하고 항상 viewport 100%로 렌더링되는 버그 수정
* 카테고리: Generator
* 복잡도: 단순 (변경 파일 2개, 수정 자명)
* 선행 이슈: Issue63 (slide_ratio 체계), Issue65 (값 단일화), Issue66 (cover 동일 root cause)
* 현상:
    - `slide_ratio: "16:9"` / `"3:2"` / `fill` 어느 값으로 설정해도 `agenda.html`은 동일하게 viewport 전체로 렌더링됨
    - chapter 본문(`01-*.html`) 및 cover(`index.html`, Issue66 수정 완료 시점 기준)와 시각 일관성 깨짐
* 원인 분석:
    - `lib/html-builder.js` `generateAgendaHTML()`이 `_cfg.slideRatio`를 단 한 곳도 참조하지 않음
    - 다른 페이지 생성기와 비교: `generateHTML`/`generateCoverHTML`은 `resolveRevealDimensions(_cfg.slideRatio)` 호출 + `--slide-ratio` CSS 변수 주입
    - `generateAgendaHTML`은 reveal.js를 쓰지 않는 standalone HTML 문서라는 이유로 ratio 처리가 통째로 빠진 것이 root cause
    - 인라인 CSS가 `html, body { width: 100%; height: 100%; }`와 `.toc-mindmap-svg { height: calc(100vh - 200px); }`를 강제하여 ratio fit이 원천적으로 불가능
* 정책 결정:
    - **standalone HTML 문서이므로 reveal.js 의존 없이 CSS만으로 처리**: `<html>`에 ratio class + `--slide-ratio` CSS 변수 주입 + 인라인 height 강제 제거
    - agenda.html 전용 ratio fit 박스(`<div class="agenda-frame">`)를 base.css §12로 분리
    - markmap SVG의 `calc(100vh - 200px)` 높이 계산은 ratio fit 박스 내부 기준(`calc(100% - 200px)`)으로 변경
* 구현 결과 (commit 84a2fbe):
    - `lib/html-builder.js`:
        - `resolveRevealDimensions` 헬퍼 추가 (Issue66과 공유 의도, agenda 호출 의존성 충족)
        - `generateAgendaHTML()` 시작부에서 `resolveRevealDimensions(_cfg.slideRatio)` + `slideRatioNumeric(_cfg.slideRatio)` 호출
        - `<html lang="ko">` → `<html lang="ko" class="${ratioClass}" style="--slide-ratio: ${ratioVar};">`
        - 인라인 `<style>` 블록 제거 → `${BASE_CSS}` 인라인 + body class `agenda-page`
        - bodyHtml을 `<div class="agenda-frame">...</div>`로 wrap
    - `lib/css/base.css` §12 신설:
        - `body.agenda-page`: letterbox 컨테이너 (flex 중앙 정렬 + 흰색 bg)
        - `.agenda-frame`: ratio 박스 (`width: min(100vw, 100vh * var(--slide-ratio))` / `height: min(100vh, 100vw / var(--slide-ratio))`)
        - `html.ratio-fill .agenda-frame`: fill 모드 override
        - `.agenda-frame .toc-mindmap-svg { height: calc(100% - 200px); }` — agenda-frame 기준
* 회귀 영향:
    - `slide_ratio: fill` 프로젝트: 변화 없음
    - `"16:9"`/`"3:2"` 프로젝트의 agenda 페이지: viewport 채움 → 비율 박스로 변경 (정상화)

## Issue68. single-page mode PDF 미생성 + 프로젝트 루트 stale EPUB 누적 (등록: 2026-05-03, 해결: 2026-05-03, commit: 0cec27f) ✅
* 목적: `./m2slide.sh --pdf --epub` 실행 시 single-page mode 프로젝트(`m2SlideStyle1_single`)에서 PDF가 한 번도 생성되지 않고 agenda.html 다운로드 영역에 PDF 버튼이 누락되는 버그 수정. 부수적으로 프로젝트 루트에 stale EPUB이 누적되는 현상도 정리
* 카테고리: Build
* 복잡도: 단순 (변경 파일 1개, m2slide.sh)
* 현상:
    - `./m2slide.sh --pdf --epub m2SlideStyle1_single` 실행 시 `slide/{ProjectName}.pdf` 미생성
    - agenda.html 헤더 다운로드 영역에 EPUB 버튼만 표시 (PDF 버튼 누락)
    - decktape 출력에 `Unable to activate the Reveal JS DeckTape plugin for ... agenda.html` 에러 + `No chapter PDFs found to combine` 경고
    - 별건: `Projects/m2SlideStyle2_chapter/m2SlideStyle.epub` 같은 옛 파일명 규칙 orphan EPUB이 프로젝트 루트에 잔존
* 원인 분석:
    - **A. PDF 루프의 모드 가정 오류** (`m2slide.sh` PDF 섹션):
        - chapter mode 전제로 `index.html`을 무조건 스킵 (Markmap 인덱스 가정)
        - 그러나 single-page mode에서는 `index.html`이 **실제 슬라이드 덱**, `agenda.html`이 Markmap 랜딩 — 매핑이 정반대
        - 결과: single mode에서 처리 대상이 `agenda.html`뿐 → decktape이 비-덱 페이지에 reveal plugin 적용 실패 → PDF 0개 → combine 단계 noop
    - **B. 프로젝트 루트의 stale 다운로드 산출물**:
        - `lib/generate-epub.js`가 `PROJECT_DIR/{ProjectName}.epub`에 일단 쓰고 m2slide.sh가 `slide/`로 mv하는 2단계 흐름
        - 과거 파일명 도출 규칙(`path.basename(projectDir)` 변경 등)에 따라 mv되지 않은 orphan이 PROJECT_DIR 루트에 영구 잔존
* 구현 명세:
    - `m2slide.sh` 빌드 초기 단계: PROJECT_DIR 루트의 `*.epub`/`*.pdf`/`*.pptx`를 `find -maxdepth 1 -delete`로 정리 (이 산출물은 항상 `slide/`에만 존재해야 함)
    - `m2slide.sh` PDF 루프:
        - `agenda.html`은 두 모드 모두 Markmap 랜딩이므로 무조건 스킵
        - `INPUT_DIR == PROJECT_DIR`을 single-page mode 신호로 사용 (markdown/ 부재)
        - chapter mode에서는 기존대로 `index.html` 스킵, single mode에서는 `index.html` 처리
* 검증 결과 (2026-05-03 빌드):
    - `m2SlideStyle1_single` (single mode): `slide/m2SlideStyle1_single.pdf` (3.2M, 33 슬라이드 결합) 생성, agenda.html에 EPUB+PDF 양쪽 버튼 출력, PROJECT_DIR 루트 EPUB/PDF 0건
    - `m2SlideStyle2_chapter` (chapter mode): 7개 챕터 PDF + 결합 PDF 정상 생성, agenda.html EPUB+PDF 버튼 정상, decktape의 agenda.html 실패 메시지 사라짐 (cosmetic 회귀 정상화), orphan `m2SlideStyle.epub` 자동 정리
* 회귀 영향:
    - 두 모드 모두 산출물·버튼 둘 다 정상 동작
    - 사용자가 PROJECT_DIR 루트에 직접 둔 `*.epub`/`*.pdf`/`*.pptx` 파일은 삭제됨 (이 위치는 빌드 산출물 임시 영역으로만 사용되므로 사용자 자료 두지 않는 것이 약속된 위치)

## Issue67. cover layout 빈 메타 변수 → 빈 박스/래퍼 잔존 (등록: 2026-05-03, 해결: 2026-05-03, commit: b3a486e) ✅
* 목적: `_meta.yml`에 `version`/`lecture_date`/`qr_code_path`/`qr_url`/`subtitle` 등 일부 메타가 미정의일 때 cover 슬라이드에 빈 span/div와 broken `<img src="">`이 그대로 남아 시각적 빈 박스 흔적을 남기는 버그 제거
* 카테고리: Generator / Theme
* 복잡도: 단순 (변경 파일 2개, 방법 자명)
* 현상:
    - `Projects/m2SlideStyle2_chapter/_meta.yml`처럼 instructor만 정의되고 나머지 필드 미정의 시 cover 페이지에 흰 QR 박스 + 빈 meta 영역 잔존
    - 원인: `lib/layout.js:60-66` `renderLayout`이 단순 `{{var}}` 치환만 수행 → 미정의 변수는 빈 문자열로 치환되지만 `<span class="cover-version"></span>` 같은 래퍼는 그대로 남음
    - 추가: `<img src="" ...>`은 `onerror` 핸들러가 모든 브라우저에서 일관 발화 안 함, `cover-qr-image`의 `background:#fff + border + padding` 스타일 (theme/default/slide.css:392-397)이 흰 박스 잔존을 유발
* 구현 (A+B 혼합):
    - **A. `lib/layout.js` renderLayout 후처리 (`_stripEmptyWrappers`)**:
        - 변수 치환 후 `<img\b[^>]*\bsrc=""[^>]*>` 패턴 제거 (빈 src img 통째)
        - `<(span|div)\b[^>]*>\s*</\1>` 패턴 반복 제거 (자식 비워진 wrapper도 do-while로 자연 제거)
    - **B. `theme/default/slide.css`에 `:empty` 보조 규칙**:
        - `.cover-qr:empty, .cover-meta:empty, .cover-body:empty { display: none; }`
* 검증 결과 (2026-05-03 빌드):
    - `m2SlideStyle2_chapter/slide/index.html`: `<img src="">` 0건, 빈 `cover-*` span/div 0건, cover-meta+cover-qr div 통째로 사라짐, instructor 영역 정상 보존
    - 회귀 검증: `01-text-layout.html`, `agenda.html`, `LlmAndVibeCoding/index.html` 모두 빈 wrapper 0건
* 회귀 영향:
    - cover layout만 시각 변화. 다른 layout(`_toc`, `_agenda`, `_blank` 등)은 같은 후처리 통과하지만 빈 wrapper 패턴 자체가 거의 발생하지 않음

## Issue65. slide_ratio: none 값 제거 — 유효값 단일화 (16:9 / 3:2 / fill) (등록: 2026-05-03, 해결: 2026-05-03, commit: 9c83d87, 201eeba) ✅
* 목적: Issue63 이후 `none`이 `16:9`의 단순 alias로 전락. 유효값을 명확히 하기 위해 `none` 제거 + 기본값을 `16:9`로 명시. `fill`은 비율 무제약(viewport 채움) 단독 의미 유지.
* plan: `_doc_work/plan/slide_ratio_none_removal_plan.md`
* 카테고리: Build / Generator
* 복잡도: 중간 (plan 필수, task/report 생략)
* 선행 이슈: Issue63 (slide_ratio 기반 슬라이드 레이아웃 크기 체계 정립)
* 정책 결정 (2026-05-03 확정):
    - 테스트 매핑: `m2SlideStyle1_single`=`"16:9"`, `m2SlideStyle2_chapter`=`"3:2"` (실제 파일값 그대로)
    - `none` 처리: **즉시 제거 (hard error)**. deprecated 경고 기간 없음
* 결과:
    - `lib/config.js`: `VALID_SLIDE_RATIOS = ['16:9', '3:2', 'fill']` 화이트리스트 도입. `loadConfig` try-catch **외부**에서 검증 throw (catch에 의해 silent swallow되지 않도록 분리)
    - `lib/config.js` `createDefaultConfig` 기본값 `slideRatio: 'none'` → `'16:9'`
    - `lib/config.js` `slideRatioNumeric()` 헬퍼: `none` 분기 제거. 사전 화이트리스트 검증으로 잘못된 값 도달 불가
    - `lib/html-builder.js` / `lib/css/base.css`: 코드 주석에서 `none` 단독 명시 제거. Issue65 표기로 정리
    - `_config.org.yml`: `slide_ratio` 주석을 `16:9 | 3:2 | fill`로 갱신
    - `_doc_design/css.md`: §3.4.2 표 갱신 (4행 → 3행 + 그 외 throw), 변경 이력에 Issue65 추가
    - 마이그레이션: `Projects/LlmAndVibeCoding_test/_config.yml` `none` → `"16:9"` (Projects/* 는 gitignored)
* 검증:
    - `m2SlideStyle1_single` (`"16:9"`)  → `ratio-16-9` + 1920×1080 ✅
    - `m2SlideStyle2_chapter` (`"3:2"`) → `ratio-3-2`  + 1920×1280 ✅
    - `layoutTest` (`fill`)             → `ratio-fill` + 100%/100% ✅
    - `LlmAndVibeCoding_test` (마이그레이션 후 `"16:9"`) → `ratio-16-9` + 1920×1080 ✅
    - `slide_ratio: none` 임시 입력 → `Error: Invalid slide_ratio 'none'. Allowed: 16:9 | 3:2 | fill` 빌드 실패 ✅
    - `slide_ratio: "4:3"` 회귀 → 동일 형식 에러로 거부 ✅
    - `node -c` 문법 검증 통과
* 회귀 영향:
    - 시각 변화 없음 (Issue63 이후 `none`이 이미 16:9 fallback이었음 — 이번엔 명시 강제만 추가)
    - 마이그레이션 누락 프로젝트는 빌드 실패로 즉시 노출 → 디버깅 용이
* 후속 이슈 후보: 없음 (정책 단일화 종결)

## Issue63. slide_ratio 기반 슬라이드 레이아웃 크기 체계 정립 (등록: 2026-05-02, 해결: 2026-05-03, commit: c34d560, 33d4cc1) ✅
* 목적: `_config.yml`의 `slide_ratio` 값을 핵심 설계 기준으로 삼아 슬라이드 전 영역(contents 높이·너비·패딩)의 크기를 수학적으로 일관되게 결정
* plan: `_doc_work/plan/slide_ratio_layout_plan.md`
* task: `_doc_work/tasks/slide_ratio_layout_task.md`
* report: `_doc_work/report/slide_ratio_layout_issue63_report.md`
* 카테고리: Theme / Build
* 복잡도: 복잡
* 선행 이슈: Issue62 (cover-title 반응형 크기 조정 및 CSS 구현 설계 문서화)
* 결과 (Phase 1 — c34d560: CSS 변수 노출):
    - `lib/config.js`: `slideRatioNumeric()` 헬퍼 + `slide_outer_padding`/`slide_inner_padding` 파싱
    - `lib/html-builder.js`: `<body style>`에 `--slide-ratio`/`--slide-outer-padding`/`--slide-inner-padding` 인라인 주입 (generateHTML/generateCoverHTML 두 경로)
    - `lib/css/base.css :root`: 동일 기본값 박제 (1.b 정책 JS↔CSS 동기화 준수)
    - `_config.org.yml`: `slide_outer_padding: 0`, `slide_inner_padding: 0` 신규 키
* 결과 (Phase 2 — 33d4cc1: 시각 적용 + none 의미 변경):
    - `slide_ratio: none`/미지정/잘못된 값 → **16:9 기본 적용** (Reveal.js 1920×1080 fixed)으로 의미 변경 → 자동 비율 보존 + 중앙 배치 + 뷰포트 fit (요구 [4][5] 시각 충족)
    - `slide_ratio: fill` 신규 (구 `none` 동작 = 비율 무제약, 100%/100%)
    - `lib/css/base.css`: `.reveal { inset: var(--slide-outer-padding) !important }` → 외부 여백 시각 적용 (요구 [6])
    - `lib/css/base.css`: `.reveal .slides section { padding: var(--slide-inner-padding) }` → 콘텐츠↔슬라이드 대칭 여백 (요구 [6])
    - `slideRatioNumeric`: `'fill' → 'auto'` 케이스 추가
    - ratio class 체계: `ratio-none` 폐기 → `ratio-fill` 신규 (CSS 분기), `ratio-16-9`/`ratio-3-2` 유지
    - `_doc_design/css.md`: §3.4 "Slide_ratio 기반 기하 체계" 신규 + Reveal.js 매핑 표 + 책임 분담 표
* 검증:
    - `m2SlideStyle1_single`, `m2SlideStyle2_chapter`, `layoutTest` 3개 프로젝트 빌드 성공 + ratio-16-9 클래스 + 1920×1080 dimensions 확인
    - 헬퍼 단위 테스트 (`16:9`, `3:2`, `none`, `fill`, `4:3`) 통과
    - `node -c` 문법 검증 통과
    - 사용자 시각 검증: 슬라이드가 16:9 박스로 중앙 배치, 좌우 여백 자연 발생
* 요구사항 충족:
    - [1] `--slide-ratio` 수치 노출 + `<body style>` 인라인 ✅
    - [2] contents 영역 = header + gap + body (현행 flex 자연 분배 유지) ✅
    - [3] `width = height × var(--slide-ratio)` 변수 활용 가능 ✅
    - [4] slide 영역 중앙 배치 (Reveal.js 자동) ✅
    - [5] 비율 보존 + 뷰포트 fit + overflow 없음 (Reveal.js fixed dimensions) ✅
    - [6] outer/inner 대칭 패딩 (`.reveal inset` + `section padding`) ✅
* 회귀 영향: 기존 `slide_ratio: none` 프로젝트는 16:9 비율 박스로 표시됨 (의도된 동작 — Issue63 본질 요구). 비율 무제약이 필요하면 `slide_ratio: fill` 명시.
* 후속 이슈 후보: contents-body·contents-header height 분리 명시 시스템 / outer padding 색상·배경 control / `auto-fit-content` 모드 (콘텐츠 기반 비율 자동 결정)

## Issue64. lib/css/base.css 도입 — _config.yml + slide.css 슬림화 (KISS·DRY) (등록: 2026-05-02, 해결: 2026-05-03, commit: 7a10b81, 028284e) ✅
* 목적: 두 테마(`default`/`nowage`) `slide.css`가 1422줄 100% 동일한 상태를 해소. 공통 CSS를 `lib/css/base.css`로 추출하여 `_config.yml` style 섹션 + `slide.css`를 슬림화하고 KISS·DRY 원칙 회복.
* plan: `_doc_work/plan/css_refactoring_plan.md`
* task: `_doc_work/tasks/css_refactoring_task.md`
* report: `_doc_work/report/css_refactoring_issue64_report.md`
* 카테고리: Theme / Build
* 복잡도: 복잡 (plan 필수, 7 Phase 다중 단계, 두 테마 + 세 프로젝트 회귀 검증)
* 선행 이슈: Issue62 (cover-title clamp + min-height) — 완료됨
* 결과:
    - `lib/css/base.css` 신규 (1051줄): 6단 구성 (@import + :root + Reveal 보정 + 공통 레이아웃 + 컴포넌트 + 반응형)
    - `lib/html-builder.js`: BASE_CSS 캐싱 + `generateHTML`/`generateCoverHTML` 두 함수에 inline `<style>` 주입
    - `lib/config.js`: styleConfig 기본값을 base.css `:root`와 동기화 (1.b 정책 — JS↔CSS 기본값 동기화 영구 의무)
    - `theme/default/slide.css`: 1422 → 403줄 (71% 감소). 이미지·색상 등 테마 고유만 보존
    - `theme/nowage/slide.css`: default와 동일 (cp 동기화). 차별화는 후속 이슈
    - `_config.org.yml`: 72 → 35줄 (style 50 → 8줄, 84% 감소)
    - `_doc_design/css.md`: 임시 "리팩터링 계획" 섹션 제거 + 영구 목록 3종 (base.css/slide.css/_config.yml) + 변경 이력 행
    - `README.md`: base.css 폴더 구조, CSS 우선순위, 신규 테마 작성 가이드 추가
* 검증:
    - `m2SlideStyle1_single`, `m2SlideStyle2_chapter`, `layoutTest` 3개 프로젝트 빌드 성공
    - 신규 테마 `_minimal` fallback 검증 통과 (빈 slide.css + 빈 layouts/로 cover layout 정상 렌더)
    - base.css 이미지 자산 의존 0건 확인 (theme 자산 제거 시 base 영향 없음 보장)
    - 시각 회귀 사용자 확인 통과
* 후속 이슈 후보: default minimal 분화, nowage 차별화

## Issue62. cover-title 반응형 크기 조정 및 CSS 구현 설계 문서화 (등록: 2026-05-02, 해결: 2026-05-02, commit: b12a8db, 789947d) ✅
* 목적: cover 슬라이드 제목이 뷰포트 너비에 따라 줄바꿈 없이 최대 크기로 표시되도록 수정. CSS 구현 형태 SSOT(`_doc_design/css.md`) 작성.
* 카테고리: Theme / Frontend
* 복잡도: 중간
* 상세:
    - **선행 이슈**: Issue61 (title_contents_gap) 작업 중 발견
    - m2SlideStyle1_single vs m2SlideStyle2_chapter에서 cover-title 줄바꿈 차이 발생
    - 원인: `font-size: 3.4em` (136px) — 좁은 뷰포트에서 30자 제목이 줄바꿈됨
    - 수정: `clamp(1.2em, 5vw, 3.4em)` 적용 (7vw → 5vw; 30자 × 0.6em 공식 적용)
    - `layout-cover` section에 `min-height: 100vh !important` 추가 — flex push로 instructor 하단 고정
    - `_doc_design/css.md` 생성: CSS 변수 체계·반응형 타이포그래피·레이아웃 패턴 SSOT
* 구현 명세:
    - `theme/default/slide.css`, `theme/nowage/slide.css`: clamp(1.2em, 5vw, 3.4em) + min-height: 100vh
    - `_doc_design/css.md`: 변수 체계, 5vw 공식, 섹션 높이 규칙, 금지 사항 정의

## Issue61. title_contents_gap이 media-enlarge-fit 모드 + H3 슬라이드에서 미적용 (등록: 2026-05-02, 해결: 2026-05-02, commit: 4e418c2, 789947d, 8db51ae) ✅
* 목적: `title_contents_gap` 설정이 `media_container_enlarge: fit` 모드에서 시각적으로 적용되지 않는 원인 수정
* 카테고리: Frontend / Generator
* 복잡도: 중간
* 상세:
    - 재현 슬라이드: `Projects/m2SlideStyle1_single/slide/index.html#/14` (H3 + 이미지 슬라이드)
    - **원인1 (JS 타이밍)**: `ready`/`slidechanged` 이벤트 시 Reveal.js 레이아웃 미완료 → `offsetHeight = 0` → `if (h > 0)` 조건 실패
    - **원인2 (비현재 슬라이드 skip)**: 전체 슬라이드 대상 querySelector → hidden slide `offsetHeight = 0` 오진
    - **원인3 (guide_line h3 누락)**: guide-line CSS에서 h3 제외 → h3.title 배경이 section 빨간색과 동일 → gap 불가시
    - **부수 버그**: `sectionClass` 생성 로직에서 `isTitleOnly=true && hasText=true` 동시 발생 시 `class` 속성 중복 출력
* 해결:
    - `lib/html-builder.js`: `applyTitleContentsGap` → `.present` 셀렉터 + `requestAnimationFrame` 적용
    - `theme/default/slide.css`: `.reveal .title` margin-bottom CSS 변수 직접 적용
    - `theme/default/slide.css`: guide-line 셀렉터에 `h3` 추가 → 녹색↔빨간gap↔파란 대비 확보


## Issue60. generate-slides.js 모듈 분리 리팩터링 (등록: 2026-05-02, 해결: 2026-05-02, commit: 05c1299) ✅
* 목적: 3202줄 단일 파일을 7개 모듈(module.exports)로 분리하여 유지보수성 향상
* plan: `_doc_work/plan/m2slide_lib_plan.md`
* 카테고리: Generator
* 해결:
    - 7개 모듈 추출: utils.js / config.js / layout.js / agenda.js / markdown.js / slide-parser.js / html-builder.js
    - generate-slides.js: 3202줄 → 225줄 (오케스트레이션 전용)
    - html-builder.js: `configure(cfg)` 패턴으로 전역 변수 17개 완전 제거
    - STYLE_CONFIG → cfg.styleConfig 치환 완료, bridge 패턴 제거

## Issue59. cover_enabled=true 시 커버 페이지 복원 (등록: 2026-05-02, 해결: 2026-05-02, commit: bba0104) ✅
* 목적: `cover_enabled: true` 설정 시 커버 페이지가 표시되지 않는 문제 수정 (Issue58에서 의도치 않게 제거됨)
* 카테고리: Generator / Frontend
* 복잡도: 중간
* 해결:
    - chapter 모드: `cover_enabled=true` → `index.html`을 Reveal.js 단일 슬라이드 커버 덱으로 생성. `false` → `agenda.html` redirect 유지
    - single 모드: `cover_enabled=true` → `#/0`에 `_cover` layout 슬라이드 주입
    - `generateCoverHTML`: Reveal.js CDN + theme CSS 포함, `.reveal section.layout-cover` CSS 적용 보장
    - `agenda.html` `↑` 키: `cover_enabled=true`이면 `index.html`(커버)로, `false`이면 최상위 유지
    - `generateTOCFromFile`: single 모드 커버 주입 시 `slideIndex +1` 오프셋 보정

## Issue58. Cover Slide 제거 및 TOC 통합 (등록: 2026-05-02, 해결: 2026-05-02, commit: 9ed3298) ✅
* 목적: Cover Slide를 모든 모드에서 제거하고 cover 내용을 TOC에 흡수하여 슬라이드 번호 정합성 확보
* 상세:
    - **single mode**: `#/0` Cover Slide 제거 → TOC Slide(`#/0`)가 title·subtitle·instructor 등 cover 내용 흡수. 기존 `#/2` 첫 콘텐츠가 `#/1`로 이동
    - **chapter mode**: `index.html` → `agenda.html` meta refresh redirect로 대체. cards 링크 `#/1` 시작
    - **조건부 트리뷰**: AGENDA.md에 H3 서브챕터가 있을 때만 markmap 렌더, 없으면 cards 목록만 표시
* 해결:
    - `lib/generate-slides.js`: `hasTocItems`(서브챕터 유무) 기반 `_toc` 조건부 렌더링, isTitle 제거 로직 연동
    - `slideRef` 패턴: children에 객체 참조 저장 → mutation 후 실제 인덱스 재계산으로 카드 링크 정합성
    - chapter mode `index.html` → `agenda.html` meta refresh redirect 생성
    - `agenda.html` `ArrowUp`: `index.html` 이동 제거 → redirect 루프 방지
    - `_toc`/`_agenda` 템플릿: `{{instructor_name}}` 흡수

## Issue57. Agenda/TOC 페이지 ArrowLeft 키 누락 (등록: 2026-05-02, 해결: 2026-05-02, commit: c730a5c) ✅
* 목적: Agenda(agenda.html) 및 챕터 덱 TOC 슬라이드에서 ↑는 작동하나 ← 키는 아무 동작 없는 문제 수정
* 카테고리: Frontend (키 네비게이션)
* 복잡도: 단순
* 해결:
    - `generateAgendaHTML` keydown 핸들러: `ArrowLeft` 조건을 `ArrowUp`과 동일하게 추가 → `index.html`로 이동
    - 챕터 덱 keydown 핸들러: `isTocSlide(cur)`일 때 `ArrowLeft` → `agenda.html`로 이동 블록 추가

## Issue52. m2SlideStyle2_chapter 프로젝트 구조 정비 (등록: 2026-05-02, 해결: 2026-05-02, commit: c57e016) ✅
* 목적: `Projects/m2SlideStyle2_chapter/` 폴더 구조와 의도 일치 — Chapter Mode 샘플인지 Single Page인지 명확화
* 카테고리: Project
* 복잡도: 단순
* 해결:
    - 옵션 A 선택: `markdown/` + `AGENDA.md` + 챕터별 7개 `*.md` 파일 이미 존재 확인 (이전 Issue55 Phase 10 작업에서 선행 정비됨)
    - `./run.sh m2SlideStyle2_chapter` → `📖 Chapter Mode detected` 정상 확인
    - `slide/` 산출물: `agenda.html`, `index.html`, `01~07-*.html` 7개 챕터 모두 생성

## Issue51. 장표 드래그 네비게이션 (up/down/left/right) (등록: 2026-05-02, 해결: 2026-05-02, commit: c57e016) ✅
* 목적: 슬라이드 페이지에서 마우스/터치 드래그로 prev/next/up/down 슬라이드 이동 (모바일·태블릿 친화)
* 카테고리: Frontend (reveal.js 인터랙션)
* 복잡도: 복잡
* 해결:
    - Reveal.initialize에 `touch: false` 추가 → 기존 reveal.js 내장 swipe 비활성, 커스텀 핸들러가 전담
    - `simulateKey(key, keyCode)` 헬퍼로 synthetic keydown 발생 → 기존 Phase 9 `keydown` 핸들러(`isCoverSlide`, `M2SLIDE_MODE`, 마지막 슬라이드 챕터 이동) 완전 재사용
    - touch 이벤트: `touchstart`/`touchend`, MIN 50px, MAX 700ms
    - mouse 이벤트: `mousedown`/`mousemove`/`mouseup`, 텍스트 선택 시 무시
    - 수평(|dx| ≥ |dy|): 우→좌 = ArrowRight, 좌→우 = ArrowLeft
    - 수직(|dy| > |dx|): 아래→위 = ArrowDown, 위→아래 = ArrowUp
    - CSS 변경 없음 (CSS 가드 준수)

## Issue50. Orientation 슬라이드 + TOC 제외 메타 (`!` prefix) (등록: 2026-05-02, 해결: 2026-05-02, commit: c57e016) ✅
* 목적: 제목 페이지와 목차 사이에 "강의 시작 전 공지사항" 등 Orientation 슬라이드 삽입 + 해당 슬라이드는 markmap TOC에 노출 안 되게 함
* 카테고리: Generator + Project (AGENDA 정책)
* 복잡도: 복잡
* 해결:
    - `parseAgenda()`: `## ![title](path)` 패턴 인식 — `currentSection = null` 처리로 TOC 트리 제외, 빌드는 정상
    - `### ![title](path)` 패턴도 지원 (숨김 서브챕터)
    - `getSubsections()`: mainPattern에 `!?` 추가 → `## !?\[...\]` 매칭. 구분자도 `/^## !?\[/` 로 수정
    - `getParentPage()`: 역방향 부모 검색 정규식에 `!?` 추가
    - `getNextChapter()`: main/sub 모두 `!?` 추가 — 숨김 챕터도 네비게이션 순서에는 포함
    - 슬라이드 단위 토글(frontmatter `toc_index: false` / `#noindex`) — v2 후보


## Issue55. chapter/single 모드 출력 구조 통일 — 3페이지 모델 (등록: 2026-05-02, 해결: 2026-05-02, commit: 71841f5) ✅
* 목적: chapter/single 모드 출력 비대칭 해소 — 두 모드 모두 Cover Page (`index.html`) + Agenda Page (`agenda.html`) + (chapter 한정) TOC Page 3페이지 모델로 통일
* 카테고리: Generator + Theme + Frontend
* 복잡도: 복잡 (plan + task 필수, CSS 인접 영역, 키 네비게이션 재정의 포함)
* plan: `_doc_work/plan/chapter-single-mode-unify_plan.md`
* task: `_doc_work/tasks/chapter-single-mode-unify_task.md`
* design: `_doc_design/chapter-single-mode.md`
* 상세:
    - 현재 single 모드는 `{ProjectName}.html` 단독 + `#toc-container` 오버레이로 마크맵 표시. chapter 모드는 `index.html`에 마크맵 + 다운로드 헤더(인라인 CSS).
    - 두 모드 모두 `index.html`은 cover slide(`#/0`) 표시. cover에서 →/↓ 키로 `agenda.html` 이동
    - `cover_enabled=false` 시 `index.html`이 meta refresh로 `agenda.html` 자동 redirect
    - ↑ 키 계층 — Single 3단계 (Cover↑Agenda↑본문), Chapter 4단계 (Cover↑Agenda↑TOC↑본문)
    - 선행 이슈: Issue49 (`_meta.yml` + `cover_enabled` + cover layout alias) 해결 완료
* 구현 명세:
    - Phase 1: `_toc.html` layout 확장 (헤더 + 다운로드 + 마크맵 SVG) + theme CSS 클래스
    - Phase 2: 다운로드 자산 검출 헬퍼 + `{{downloadButtons}}` 변수 주입
    - Phase 3: `generateAgendaHTML` standalone 생성기 신설 (layout 기반)
    - Phase 4: `index.html` 출력 분기 — full deck (single) / lightweight deck (chapter) / redirect-only HTML (cover_enabled=false)
    - Phase 5: Single deck `#/toc-placeholder` 미생성
    - Phase 6: Chapter `0X-*.html#/toc-placeholder` 유지 + `_toc.html` layout 적용
    - Phase 7: `#toc-container` 오버레이 HTML/CSS/JS 완전 제거
    - Phase 8: `generateIndexHTML` 함수 제거
    - Phase 9: 키 네비게이션 재정의 (↑·→/↓ 모드별·위치별 분기) + agenda.html →/↓ 키 다음 페이지 이동
    - Phase 10: m2SlideStyle1_single + m2SlideStyle2_chapter 테스트 (cover_enabled 토글 + 자산 부재 시나리오 포함)
    - 확정 결정: D1=A · D2=B · D3=A · D4=A · D5=B · D6=B

## Issue56. theme/nowage markmap 링크 밑줄 제거 (등록: 2026-05-02, 해결: 2026-05-02, commit: 542ed18) ✅
* 목적: agenda.html markmap 노드 내 `<a>` 링크에 브라우저 기본 text-decoration(밑줄)이 나타나는 문제 제거
* 카테고리: Theme (`theme/nowage/slide.css`)
* 복잡도: 단순
* 해결:
    - `theme/nowage/slide.css` `.toc-markmap` 섹션 하단에 `.toc-markmap a`, `.toc-mindmap-svg foreignObject a`, `.markmap-foreign a` 셀렉터로 `text-decoration: none` 규칙 추가 (hover 포함)
    - markmap-view는 SVG foreignObject 내부에 HTML `<a>` 렌더링 → 브라우저 기본 밑줄 적용 영역이므로 명시적 차단 필요
    - `m2SlideStyle2_chapter` 재빌드로 `slide/css/custom.css` 갱신 확인
* 비고: `theme/nowage/`는 `.gitignore` 처리 사용자 영역 — CSS 변경은 추적되지 않음. Issue.md만 커밋

## Issue49. 제목 페이지 자동 생성 — Frontmatter 기반 cover 슬라이드 (등록: 2026-05-02, 해결: 2026-05-02, commit: 71b5fc5, 6d42c37) ✅
* 목적: 마크다운 YAML Frontmatter + meta.yml 정보로 첫 페이지(cover 슬라이드)를 자동 생성
* 카테고리: Generator + Theme
* 복잡도: 중간
* 해결:
    - **데이터 출처**: Issue48에서 도입한 `meta.yml` (PROJECT_META) 사용 — 별도 frontmatter 신규 키 없이 단일 SSOT 유지
    - **옵트인 방식**: `meta.yml`에 `cover_enabled: true` 명시 시에만 자동 주입 (기본 false → backward compatible)
    - **주입 위치**: `generateHTML(filePath, agendaPath, outputDir, isFirstFile=false)` 시그니처 확장 + 메인 루프에서 첫 파일에만 `isFirstFile=true` 전달
        - 단일 페이지 모드: 유일한 파일에 주입
        - 챕터 모드: 알파벳/숫자 순 첫 `.md` 파일에만 주입 (검증 완료: 01-opening.html cover=1, 그 외 0)
    - **중복 방지**: 사용자가 이미 `#layout-cover`(또는 `#layout-_cover`) 메타로 슬라이드 수동 배치 시 자동 주입 건너뜀
    - **PROJECT_META 변수 노출**: `generateSlideHTML` 내 `vars` 객체에 머지하여 layout template `{{instructor_name}}` 등 사용 가능 — cover 외 다른 layout에서도 활용 가능
    - **신규 layout**: `theme/default/layouts/_cover.html` (제공) — 9개 변수: `{{title}}`, `{{subtitle}}`, `{{instructor_name}}`, `{{instructor_contact}}`, `{{part_subtitle}}`, `{{lecture_date}}`, `{{version}}`, `{{qr_code_path}}`, `{{qr_url}}`
    - **QR 렌더링 v1**: 정적 이미지(`qr_code_path`) `<img>` + URL 텍스트(`qr_url`). `onerror` fallback으로 미존재 이미지 숨김
    - **이름 정정**: 이슈 본문의 `QGCode` → 이슈48에서 이미 `qr_code_path`로 표준화 완료
    - **룰 동기화**: `.claude/rules/md-m2slide-rules.md` "Cover 슬라이드 자동 주입" 절 추가
    - **설계 SSOT 갱신**: `_doc_design/meta-yml.md`에 cover 정책·변수표·QR 렌더링 v1/v2 계획 추가
* 검증:
    - A. meta.yml 부재: cover 미주입 (기존 5개 프로젝트 backward compat ✓)
    - B. meta.yml 있으나 `cover_enabled` 부재: cover 미주입 ✓
    - C. `cover_enabled: true` (단일 페이지): cover 1개 주입, 모든 변수 정상 치환 ✓
    - D. `cover_enabled: true` (챕터 모드): 첫 파일만 cover 1개, 나머지 14개 챕터 0개 ✓
* 후속:
    - QR 클라이언트 동적 생성(qrcode.js) — 후속 이슈 후보
    - footer 표시 (`version`, `lecture_date`) — 후속 이슈 후보
    - Issue50 Orientation 슬라이드 (cover → Orientation → TOC 순서 정책)

## Issue48. meta.yml 운영 — 프로젝트 메타데이터 분리 SSOT (등록: 2026-05-02, 해결: 2026-05-02, commit: 0a2f75a, c36e7d9) ✅
* 목적: 프로젝트별 운영 메타데이터(instructor, version, lecture_date, gdrive, qr 등)를 별도 `meta.yml`로 분리하여 `_config.yml`(렌더링 설정)과 책임 명확화
* 카테고리: Build (config 시스템)
* 복잡도: 중간
* 해결:
    - **설계 SSOT**: `_doc_design/meta-yml.md` 작성 — v1 스키마 + 필드 카테고리 + 단계적 도입 계획 정의
    - **구현**: `lib/generate-slides.js`에 `PROJECT_META` 글로벌 + `loadProjectMeta(projectDir)` 함수 추가, `loadConfig()` 직후 호출
    - **선택적 로드**: `meta.yml` 미존재 시 silent skip — backward compatible (5개 기존 프로젝트 모두 영향 없음 확인)
    - **명명 정정**: 참고 출처의 `QGCodePath` → `qr_code_path` (오타 보정), `part1_subtitle` → `part_subtitle` (일반화)
    - **룰 동기화**: `.claude/rules/md-m2slide-rules.md`에 "meta.yml — 운영 메타데이터" 절 추가
* 검증:
    - meta.yml 미존재 시: 6개 프로젝트(MarkdownGraph, LlmAndVibeCoding, LlmAndVibeCoding2, m2SlideStyle1_single, m2SlideStyle2_chapter, layoutTest) 빌드 성공
    - meta.yml 존재 시: `✅ meta.yml loaded: ... (7 fields: instructor_name, instructor_contact, lecture_date, part_subtitle...)` 콘솔 출력 확인
    - 잘못된 YAML: 빌드 중단 없이 무시 또는 경고 (단순 라인 파서 — 중첩 객체 미지원, v1 한계)
* 후속:
    - Issue49: cover 슬라이드 자동 생성 (PROJECT_META의 `instructor_*`, `qr_*`, `part_subtitle` 활용)
    - 미정: footer 표시 (`version`, `lecture_date`), EPUB opf 메타 매핑

## Issue54. 자동 layout 슬라이드 화면 밖 렌더링 — `position: relative` 가 reveal.js 스택 깨뜨림 (등록: 2026-05-02, 해결: 2026-05-02, commit: 6141a6c) ✅
* 목적: layoutTest 프로젝트의 11/13/15/18 페이지(자동 감지된 `layout-blank--full-image`, `layout-contents` (no_title), `layout-blank--full-video`)가 빈 화면으로 보임. 컨텐츠는 DOM에 존재하나 슬라이드가 viewport 아래(y=1085, 2165...)로 밀려나 보이지 않음.
* 카테고리: Theme (`theme/nowage/slide.css`)
* 복잡도: 단순 (CSS 한 줄 제거)
* 원인:
    - `theme/nowage/slide.css`의 `.reveal section[class*="layout-"] { position: relative; padding: ... }` 규칙이 reveal.js 기본 `position: absolute` 를 덮어쓰면서 `layout-*` 슬라이드들이 normal flow 로 진입
    - 누적 효과: 첫 layout 슬라이드(y=5) → 두 번째(y=1085) → 세 번째(y=2165) ... 모두 viewport(1080px) 밖으로 이동
    - 빈 페이지 4건 모두 자동 감지된 layout 슬라이드:
        - `#/11`: `layout-blank--full-image` (image-only)
        - `#/13`: `layout-contents` (`## ` 빈 제목)
        - `#/15`: `layout-contents` (헤더 부재)
        - `#/18`: `layout-blank--full-video` (video-only)
* 해결:
    - `theme/nowage/slide.css`의 `.reveal section[class*="layout-"]` 규칙에서 `position: relative` 제거
    - `padding: 28px 56px 56px 56px` 유지 + 재발 방지 주석(Issue54 참조) 추가
    - `::before` / `::after` pseudo-element는 reveal.js 기본 `position: absolute` 컨텍스트만으로 정상 동작 확인
    - 검증: layoutTest 재빌드 후 puppeteer 회귀 테스트 — 21개 슬라이드 전부 viewport 내(y=5) 위치 확인, body 컨테이너도 가시 영역(y=10~38) 확인
    - 비고: `theme/nowage/`는 `.gitignore` 처리되는 사용자 커스텀 영역이므로 CSS 변경분은 commit 추적 외. Issue.md 만 commit 으로 보존
    - CSS 가드 룰의 "position 금지" 정신과 일치 (reveal.js 기본을 깨뜨린 속성을 원복)

## Issue53. 페이지 번호 링크 비활성화 — prev arrow 클릭 영역 침범 해결 (등록: 2026-05-02, 해결: 2026-05-02, commit: f67aff6) ✅
* 목적: 우측 하단 페이지 번호("17 / 21")가 `<a href>` 링크로 렌더링되어 좌측 prev arrow(`<`) 버튼의 클릭 가능 영역을 가림. 페이지 번호는 표시만 하고 클릭은 불필요.
* 카테고리: Frontend (Reveal.js 인터랙션)
* 상세:
    - **재현**: Reveal.js `slideNumber: 'c/t'` 설정 시 페이지 번호가 `<a class="slide-number">` 앵커로 렌더링되어 좌측 prev/next 버튼 위에 겹쳐 클릭 영역을 잠식.
    - **원인**: Reveal.js 기본 동작 — slideNumber 요소가 현재 슬라이드 hash 링크로 클릭 가능. 페이지 번호는 시각적 정보용일 뿐 클릭 네비게이션 불필요.
* 구현 명세:
    - `lib/generate-slides.js` 인라인 `<style>`에 `.reveal .slide-number, .reveal .slide-number a { pointer-events: none; }` 추가
    - 안전 속성(`pointer-events`)만 사용 — CSS 가드 위반 없음 (display/height/position 미수정)
* 검증:
    - `./m2slide.sh layoutTest` 빌드 후 출력 HTML에 새 CSS 반영 확인
    - 페이지 번호는 정상 표시되며 클릭 시 무반응, prev arrow 클릭 영역 회복
* 변경 파일:
    - `lib/generate-slides.js` (인라인 CSS +5줄)

## Issue46. TOC markmap 노드 클릭 시 슬라이드 인덱스 1칸 어긋남 — `_toc` 자동 prepend 미반영 (등록: 2026-05-02, 해결: 2026-05-02, commit: 1d20fdb) ✅
* 목적: 단일 파일 프로젝트(layoutTest 등)의 TOC markmap에서 첫 H1 노드("분할 레이아웃") 클릭이 무반응이고 후속 H1/H2 노드는 1칸 어긋난 슬라이드로 이동하던 버그 수정.
* 카테고리: Generator (markmap TOC 링크 생성)
* 상세:
    - **재현**: `Projects/layoutTest/slide/layoutTest.html#/0` → markmap "분할 레이아웃" 클릭 무반응. 후속 H1은 잘못된 슬라이드로 이동.
    - **원인**: `lib/generate-slides.js:1608-1636`은 `_toc` 레이아웃 템플릿이 존재하면 `toc_placeholder` 설정과 무관하게 TOC 슬라이드를 자동 prepend 함. 그러나 `generateTOCFromFile` (1357~)은 `TOC_PLACEHOLDER || fileTocPlaceholder` 케이스만 `slideIndex=1`로 보정 — 자동 prepend 케이스를 감지 못해 모든 markmap href가 실제 인덱스보다 1 작음.
    - **결과**: 첫 H1은 `#/0`(TOC 슬라이드 자신)을 가리켜 클릭 무반응, 후속은 모두 1칸씩 어긋남.
* 구현 명세:
    - `lib/generate-slides.js` `generateTOCFromFile`에 `autoTocPrepended = !useTocPlaceholder && !!LAYOUT_TEMPLATES['_toc']` 조건 추가
    - `if (useTocPlaceholder || autoTocPrepended) slideIndex = 1`로 보정 로직 확장
    - 주석에 두 prepend 경로(toc_placeholder 명시 / `_toc` 자동) 명시
* 검증:
    - `Projects/layoutTest` 빌드 후 tocData href와 실제 section 인덱스 1:1 매칭 확인 (분할 레이아웃 #/1, 자동 레이아웃 감지 #/9, 동영상 #/16)
    - H2 자식 노드도 정확한 슬라이드 매칭 (휴리스틱 #/2, 3분할 카드 #/5 등)
    - 회귀: MarkdownGraph, m2SlideStyle1_single(`toc_placeholder: true`), m2SlideStyle2_chapter, LlmAndVibeCoding(다중 챕터), LlmAndVibeCoding2 모두 정상 빌드
* 변경 파일:
    - `lib/generate-slides.js` (`generateTOCFromFile` slideIndex 초기화 분기 +8줄)

## Issue47. keynote-nowage-theme 시각 디자인 적용 (등록: 2026-05-02, 해결: 2026-05-02, commit: 1dc825a) ✅
* 목적: `_doc_design/keynote-nowage-theme/` 디자인 이미지 9종(cover, contents, contents-noTopMargin, chapter-toc, chapter, exercise, exercise-small, blank, closing)에 정의된 keynote 시각 언어를 `theme/nowage`에 반영. 단순 구조 위주였던 기존 테마에 마스코트·노랑 강조선·페이지 번호·sketch 풍 타이포 등 결합.
* 카테고리: Theme (테마 시각 디자인)
* 상세:
    - 디자인 SSOT: `_doc_design/keynote-nowage-theme/*.png` + `img/finfra*.png`
    - 핵심 시각 요소: 노랑 강조색(#F5C518) 상/하단 가로선, 제목 하단 `hr.png` 브러시 밑줄, 우하단 페이지 번호, 레벨별 마커(● → ─ → ▶ → •), 마스코트(puffer/butterfly/cat) layout별 배치
    - 자산 파이프라인 신설: `theme/{name}/img/` → `slide/theme-img/` 자동 복사 — 사용자 프로젝트의 `img/`와 충돌 없음
* 구현 명세:
    - **마스코트 자산 도입**: `theme/nowage/img/`에 `finfra{Butterfly,Cat,Puffer1,Puffer2,Puffer2s}.png` + `hr.png` 6종 배치 (gitignored 사용자 영역)
    - **자산 복사 로직**: `lib/generate-slides.js` video 복사 블록 다음에 theme img 복사 추가. `THEME_NAME` 기준으로 `theme/{name}/img/` 존재 시 `slide/theme-img/`로 복사. 미존재 시 silent skip (default 테마 등 backward compatible).
    - **CSS 시각 언어 추가** (`theme/nowage/slide.css` `## 9. Keynote Nowage Visual Language` 신규 섹션):
        * 색상 변수 정의 (`--kn-accent: #F5C518` 외 3종)
        * 모든 `section[class*="layout-"]`에 상/하 노랑 가로선 + padding 조정 + 페이지 번호 스타일
        * 제목(H1·`*-title`)에 굵은 sketch 타이포 + `hr.png` 노랑 브러시 밑줄 (기존 `*-divider` 숨김)
        * 리스트 마커 차별화: L1 ● / L2 ─ / L3 ▶ / L4·L5 •
        * layout별 마스코트 위치:
            - cover: puffer1 좌상단 + 노랑 박스 부제 우하단
            - contents/contents-full: puffer2s 우상단 (작게)
            - chapter-toc: puffer2 좌상단 + 노랑 박스 TOC 우하단
            - chapter: puffer2 중앙-좌, 제목 하단
            - exercise: butterfly 좌측 + cat 우하단
            - exercise-small: butterfly 크게 좌측 + cat 우하단
            - closing: puffer1 중앙(크게) + cat 우하단
            - blank: 장식 없음 (상하 노랑선만)
* 가드:
    - CSS 수정 시 CLAUDE.md "CSS 수정 시 주의사항" 준수 — `display: flex` / `height: 100%` / `position` 등 Reveal.js 레이아웃 핵심 속성은 건드리지 않음. 신규 섹션은 layout-* 한정 영향만 적용.
    - `theme/nowage/`는 `.gitignore`로 사용자 sandbox 영역 — 본 변경의 자산·CSS는 추적되지 않음. 추적 대상은 `lib/generate-slides.js`의 자산 복사 로직 + 본 이슈 문서뿐.
* 검증:
    - `node -c lib/generate-slides.js` 문법 통과
    - `m2SlideStyle1_single` (theme: nowage) 빌드 정상, `slide/theme-img/` 6개 파일 복사 + `slide/css/custom.css`에 신규 섹션 포함 확인
    - `layoutTest` 빌드 정상
* 변경 파일:
    - `lib/generate-slides.js` (theme img 복사 블록 +13줄)
    - `theme/nowage/img/*.png` 6종 (gitignored)
    - `theme/nowage/slide.css` (`## 9. Keynote Nowage Visual Language` 섹션 +266줄, gitignored)
    - `Issue.md` (Issue47 등록 + 종결)

## Issue45. layout 이름 정규화 정책 문서·회귀 검증 정합성 점검 (등록: 2026-05-02, 해결: 2026-05-02, commit: ea56fa1) ✅
* 목적: Issue41(코드 수정) 머지 후 layout 이름 정규화 정책을 코드·룰 문서·회귀 테스트 3축에서 일관 유지 + `_doc_design/`에 영속 정책 문서화
* 구현 명세:
    - **정책 SSOT 문서화**: `_doc_design/layout.md`에 "Layout 이름 표기 정책" 섹션 신규 추가
        * 영역 분리표 (사용자 작성 / 사용자 슬라이드 / 시스템 자동 감지 / 파일 시스템)
        * Alias 정규화 동작 명시 (Issue41 `_registerLayoutTemplate()` 헬퍼)
        * 회귀 보장 요소 4종 명시 (코드 alias, 경고 dedup, 룰 문서, lint-config)
    - **룰 문서 동기화**: `.claude/rules/md-m2slide-rules.md` `## 1. 슬라이드별 layout override`에 "Layout 이름 표기 규칙" 서브 섹션 추가 — `_doc_design/layout.md` cross-link
    - **회귀 테스트 자동화**: `m2slideDo.sh`에 `--lint-config` 옵션 추가
        * `theme/*/layouts/*.html` 파일 시스템 스캔으로 사용 가능 layout 수집 (underscore alias 포함)
        * `Projects/*/_config.yml`의 `theme_default_layout` 값을 BSD-호환 sed로 추출
        * 미존재 layout 사용 시 ✗ 표시 + exit 1, 정상 시 ✓ + exit 0
    - **검증 범위 결과**:
        * 5개 프로젝트(LlmAndVibeCoding, LlmAndVibeCoding2, m2SlideStyle1_single, m2SlideStyle2_chapter, MarkdownGraph) + layoutTest 빌드 정상, layout 미발견 경고 0건
        * `m2SlideStyle1_single` (`theme_default_layout: contents`) 정상 동작
        * lint-config 실증: layoutTest 사용자 로컬 config의 stale `2.1.contents` 참조를 정확히 검출 (Issue38 표준화 이전 잔재 — 사용자 로컬 영역이라 미수정)
* 변경 파일:
    - `_doc_design/layout.md` (Layout 이름 표기 정책 섹션 +60줄)
    - `.claude/rules/md-m2slide-rules.md` (Layout 이름 표기 규칙 서브 섹션 +12줄)
    - `m2slideDo.sh` (`--lint-config` 옵션 + usage 주석)

## Issue44. raw HTML `<video>`/`<audio>` multi-line block이 `<p>` wrap으로 깨짐 (등록: 2026-05-01, 해결: 2026-05-02, commit: 2f90ee8) ✅
* 목적: 마크다운 본문 multi-line raw HTML block(`<video>...<source>...</video>` 등)이 라인별 `<p>` wrap으로 DOM 구조가 깨지는 버그 수정
* 종결 근거: Issue43(`![](*.mp4)` 마크다운 비디오 임베드, commit 2f90ee8)으로 사용 측면 완전 해결됨
    - 사용자는 raw `<video>` 태그를 작성할 필요 없음 — `![alt](path.mp4)` 한 줄로 충분
    - layoutTest.md #/23~25 슬라이드는 마크다운 shortcut으로 변환되어 더 이상 raw HTML 경로를 타지 않음
    - raw HTML 예시(코드 블록)는 `<pre><code>` 안에서 그대로 보존됨 (정상)
* 잔존 사항: raw HTML `<video>` block-level 패스스루 로직 자체는 미구현. 향후 raw HTML이 필요한 use-case가 누적되면 별도 이슈로 재등록
* 검증: layoutTest 빌드 후 `<p><video>` / `<p></video>` 패턴 0건 확인 (`/usr/bin/grep -an '<p><video\|<p></video>' Projects/layoutTest/slide/layoutTest.html`)

## Issue26. 동영상 지원 기능 (해결: 2026-05-02, commit: 2f90ee8) ✅
* 목적: 슬라이드 내 동영상 삽입 및 재생 기능 지원 — 비디오 임베드의 부모 이슈
* 상세:
    - 슬라이드 내 동영상 삽입 및 재생 기능 지원 → Issue43 (`![](*.mp4)` 마크다운 비디오 임베드)에서 구현
    - 로컬 비디오 파일 재생 확인 → layoutTest의 `video/Movie-1.mp4` 사용
    - layoutTest 프로젝트에서 Movie-1.mp4 활용 테스트 → Issue43 회귀 검증으로 확인
* 종결 근거: Issue43 구현(`2f90ee8`)으로 모든 요구사항 충족
    - 마크다운 `![alt](path.mp4)` 자동 `<video>` 변환
    - 8개 video preset (`controls`/`autoplay-muted`/`autoplay-loop`/`loop`/`muted`/`background`/`minimal`/`autoplay-nocontrols`)
    - video-only 슬라이드 자동 풀스크린 (`layout-blank--full-video`)
    - raw `<video>` 태그 작성도 지원 (단, multi-line block 파서 버그는 Issue44에서 별도 처리)
* 후속: Issue44 (raw `<video>` multi-line block `<p>` wrap 버그 수정)는 별개 진행

## Issue27. 제목 없는 단독 이미지 페이지 자동 확대 (Full Image) (등록: 2026-05-01, 해결: 2026-05-02, commit: bde5f69) ✅
* 제목 없이 이미지만 있는 슬라이드 감지 로직 구현
* 해당 슬라이드에 대해 화면 비율을 유지하면서 화면에 꽉 차게(Contain/Cover) 표시하는 스타일 적용
* 두 가지 케이스로 분리하여 서브 이슈로 처리 (Issue27_1, Issue27_2)
* 추가로 자동 감지 토글 옵션(Issue27_3)과 풀스크린 이미지 사이즈 정정(Issue27_4) 분리

## Issue27_1. 전체 이미지 단독 슬라이드 → `_blank.html` 적용 (등록: 2026-05-01, 해결: 2026-05-02, commit: bde5f69) ✅
* 목적: 슬라이드 본문이 이미지 한 개로만 구성된 경우 `_blank.html` 레이아웃을 자동 적용하여 이미지를 화면에 꽉 차게 표시
* 상세:
    - 감지 조건: 제목(H1/H2/H3) 없음 + 본문이 이미지 1개로만 구성 (텍스트·리스트·코드블록 등 부재)
    - 적용 레이아웃: `_blank.html` (title 영역, contents wrapper 모두 없는 깡통 layout)
    - 이미지 스타일: aspect ratio 유지 + viewport 풀사이즈 (`object-fit: contain` + `width/height: 100%`)
* 구현 명세:
    - `lib/generate-slides.js`: `isImageOnlySlide()` 헬퍼 추가, `parseMarkdownFile()`에서 매칭 시 `layout = '_blank'` + `autoFullImage = true` 마커
    - `generateSlideHTML()`에서 `autoFullImage` 마커가 있으면 `<section>`에 `layout-blank--full-image` modifier 클래스 추가
    - 사용자 명시 `#layout-*` override는 항상 우선

## Issue27_2. 제목 비어있는 슬라이드 → `_contents_no_title.html` 적용 (등록: 2026-05-01, 해결: 2026-05-02, commit: bde5f69) ✅
* 목적: 제목 문자열은 비어 있고 본문 콘텐츠만 있는 슬라이드에 `_contents_no_title.html` 레이아웃을 자동 적용
* 상세:
    - 감지 조건: 제목 헤더 자체는 존재하되 텍스트가 비어 있거나(`## ` 단독), 제목 헤더가 아예 없으면서 본문 콘텐츠가 다양함(이미지·텍스트·리스트 혼합)
    - 적용 레이아웃: `_contents_no_title.html` (Issue38에서 추가된 title 영역 제거 변형)
    - Issue27_1(이미지 단독)과 우선순위 분기 — 이미지 1개 단독은 27_1, 그 외는 27_2
* 구현 명세:
    - `lib/generate-slides.js`: `hasEmptyTitle()` + `stripEmptyLeadingHeader()` 헬퍼 추가, `parseMarkdownFile()`에서 자동 감지 + `autoBody` 분기로 빈 헤더 제거 후 body 사용
    - 우선순위: `_blank` (image-only) > `_contents_no_title` (no-title) > 기본 layout
    - 사용자 명시 `#layout-*` override는 항상 우선

## Issue27_3. 자동 layout 감지 ON/OFF 옵션을 `_config.yml`에 추가 (등록: 2026-05-01, 해결: 2026-05-02, commit: bde5f69) ✅
* 목적: Issue27_1·27_2의 자동 layout 감지 동작을 프로젝트별 config로 켜고 끌 수 있게 함
* 상세:
    - 신설 키: `auto_layout_detect: true|false` (기본값: `true`)
    - `_config.org.yml` (SSOT 기본값) 및 프로젝트별 `_config.yml`에 키와 주석 추가
    - false로 두면 `parseMarkdownFile()`에서 자동 감지 분기 자체를 건너뜀
* 구현 명세:
    - `lib/generate-slides.js`: 전역 `AUTO_LAYOUT_DETECT` 변수 + `applyConfig()`에 `auto_layout_detect` 파싱 추가
    - `parseMarkdownFile()` 자동 감지 블록을 `if (!layout && AUTO_LAYOUT_DETECT)` 가드로 감쌈
* 검증: layoutTest에서 `true`/`false` 토글 시 빌드된 HTML의 `layout-blank--full-image` 카운트가 1↔0으로 변함 확인

## Issue27_4. `_blank` full-image 이미지 크기 확대 (등록: 2026-05-01, 해결: 2026-05-02, commit: bde5f69) ✅
* 목적: image-only 자동 감지 슬라이드에서 이미지가 viewport에 꽉 차도록 크기 확대 (작은 원본 크기로 축소 표시되던 문제 해결)
* 상세:
    - 원인: 기존 CSS `width: auto; height: auto; max-*: 100%`이 원본 이미지 크기를 상한으로 사용
    - 해결: `width: 100%; height: 100%`로 변경, `max-width/height: 100%` + `object-fit: contain` 유지로 잘림 방지·레터박스 허용
* 구현 명세:
    - `theme/default/slide.css`의 `.layout-blank--full-image .blank-body img` 블록 변경
    - `theme/nowage/slide.css` (gitignored 사용자 테마) 동일 변경 적용
* 검증: layoutTest #/9에서 `scenery.png`가 viewport 짧은 변에 맞춰 최대화 + 양쪽 레터박스로 비율 유지

## Issue41. theme_default_layout 값 정규화 + 경고 dedup (등록: 2026-05-01, 해결: 2026-05-02, commit: 2f90ee8) ✅
* 목적: `_config.yml`의 `theme_default_layout: contents` 설정이 layout lookup 실패하여 모든 슬라이드에 plain section fallback + 빌드 시 경고가 N회(슬라이드 수만큼) 반복되는 버그 수정
* 상세:
    - 현상: `m2SlideStyle1_single` 빌드 시 `⚠️ layout 'contents' not found in theme/nowage/layouts/ 및 theme/default/layouts/ — falling back to plain section` 26회 출력
    - 원인 1 (lookup 키 불일치): `loadLayoutTemplates()`가 layout 파일명을 그대로 키로 저장 (`_contents.html` → `LAYOUT_TEMPLATES['_contents']`). 사용자가 `_config.yml`에 `theme_default_layout: contents`(underscore 없이)로 작성하면 lookup 실패
    - 원인 2 (경고 노이즈): layout 미발견 시 슬라이드마다 동일 경고 반복 — N개 슬라이드면 N회 출력
* 구현 명세:
    - `lib/generate-slides.js` `_registerLayoutTemplate()` 헬퍼 신설: layout 등록 시 underscore prefix 제거 alias 키도 함께 등록 (`_contents.html` → `LAYOUT_TEMPLATES['_contents']` + `LAYOUT_TEMPLATES['contents']`)
    - `loadLayoutTemplates()` Step1·Step2 모두 `_registerLayoutTemplate()` 경유로 변경
    - `_WARNED_MISSING_LAYOUTS` Set 도입: 동일 layoutName 미발견 경고는 빌드당 1회만 출력 (renderLayout 분기에서 dedup)
    - 회귀 검증:
        * `m2SlideStyle1_single` 빌드 시 경고 0건 + 26개 슬라이드 모두 `layout-contents` 클래스 적용 확인
        * Issue27_1·27_2 자동 감지(`_blank`, `_contents_no_title`) 회귀 없음
        * 5개 프로젝트 (LlmAndVibeCoding, LlmAndVibeCoding2, m2SlideStyle1_single, m2SlideStyle2_chapter, MarkdownGraph) 재빌드 정상

## Issue43. `_config.org.yml` video 기본 옵션 정리 + `![](~.mp4)` 마크다운 비디오 임베드 (등록: 2026-05-01, 해결: 2026-05-02, commit: 2f90ee8) ✅
* 목적: 마크다운 표준 이미지 문법 `![alt](path)`를 비디오 확장자에 자동 매핑하여 `<video>` 태그로 변환. `_config.org.yml`의 `video_default:` 키로 8개 프리셋 중 선택. 추가로 video-only 슬라이드 자동 풀스크린(Issue27_1·27_4의 video 버전).
* 상세:
    - 8개 옵션 프리셋: `controls`(기본) / `autoplay-muted` / `autoplay-loop` / `loop` / `muted` / `background` / `minimal` / `autoplay-nocontrols`
    - `playsinline` 속성을 자동재생 계열 프리셋에 자동 부여 (iOS 인라인 재생)
    - 비디오 확장자: `mp4`, `webm`, `ogv`, `ogg`, `mov`, `m4v`
    - **공개 정책**: `_config.org.yml`은 git 추적 공개 버전 — 옵션 주석에 이슈 번호(IssueNN) 표기 금지
* 구현 명세:
    - `lib/generate-slides.js`:
        * `VIDEO_DEFAULT` 전역 + `applyConfig()` 파싱 + 잘못된 값에 대한 fallback 경고
        * `VIDEO_DEFAULT_PRESETS` 매핑 테이블 (8개 프리셋)
        * `isVideoUrl()` 헬퍼 (확장자 검사)
        * `convertMarkdownToHTML()` standalone `![](*.mp4)` → `<video src=... preset attrs>` 변환
        * `processInline()` 인라인 `![](*.mp4)` 동일 변환
        * `isVideoOnlySlide()` 헬퍼 — 본문이 단일 비디오 임베드만 있을 때 감지 (image-only와 상호 배타적)
        * `parseMarkdownFile()` 자동 감지 분기에 video-only → `layout = '_blank'` + `autoFullVideo = true`
        * `generateSlideHTML()` `autoFullVideo` 처리 → `layout-blank--full-video` modifier
    - `theme/default/slide.css` (+ `theme/nowage/slide.css`): `.layout-blank--full-video .blank-body video` 셀렉터 (`width/height: 100%`, `object-fit: contain`)
    - `_doc_design/video-default.md`: 영속 설계 SSOT (8개 프리셋 매핑 + video-only 풀스크린 정책)
    - 우선순위: `_blank` (image-only / video-only) > `_contents_no_title` (title-empty) > 기본 layout
    - 사용자 명시 `#layout-*` override는 항상 우선
* 회귀 검증:
    - layoutTest 빌드: video-only 슬라이드가 `<section class="layout-blank layout-blank--full-video">` + `<video src=... controls>` 로 렌더링 (1건 검증)
    - image-only 자동 감지 회귀 없음 (`layout-blank--full-image` 1건 유지)
    - MarkdownGraph, m2SlideStyle1_single 빌드 정상

## Issue40. PPT 슬라이드 마크다운 규칙 정립 — md-slide-rules + md-m2slide-rules 2계층 (등록: 2026-05-01, 해결: 2026-05-01) ✅
* 목적: 슬라이드용 마크다운 작성 규칙을 글로벌·로컬 2계층으로 정립하여 Issue39 같은 generator-마크다운 컨벤션 충돌 재발 방지
* 상세:
    - 글로벌 일반 규칙 신규 작성: `~/.claude/rules/md-slide-rules.md` — 슬라이드 도구 공통(Pandoc/Slidev/Marp/m2slide). Frontmatter, 구분자, 헤더 컨벤션, 멀티 컬럼(`::: columns`), md-rules 면제 항목 명시
    - 글로벌 md-rules 갱신: `~/.claude/rules/md-rules.md`의 `type: ppt` 항목에 "→ md-slide-rules.md 따를 것" 한 줄 추가
    - 프로젝트 로컬 m2slide 특화 신규 작성: `.claude/rules/md-m2slide-rules.md` — md-slide-rules 상속 + m2slide 고유 확장(`#layout-*`, `::: slotName`, Slidev `::right::`, `<!-- nosplit -->`, AGENDA.md, 자동 layout 감지, frontmatter 추가 키)
    - `CLAUDE.md`에 규칙 섹션 추가: 슬라이드 마크다운 작성 시 의무 참조 순서(md-rules → md-slide-rules → md-m2slide-rules) 명시
* 구현 명세:
    - 2계층 상속 구조: md-rules(일반) ← md-slide-rules(슬라이드 공통) ← md-m2slide-rules(m2slide 특화)
    - 룰 파일은 `.claude/`가 gitignored이므로 사용자 로컬 자산. 글로벌 ~/.claude/rules/md-slide-rules.md는 별도 위치
    - Issue39 사후 회고에서 도출 — generator의 robustness만으로는 부족, 작성 규칙 명시화 필요

## Issue39. TOC markmap 초기 렌더링 누락 — tocData 빈 wrapper + `#toc-mindmap` ID 중복 (등록: 2026-05-01, 해결: 2026-05-01, commit: 4567248) ✅
* 목적: 첫 슬라이드 진입 시 markmap TOC의 항목들이 펼쳐지지 않고, 빈 중간 노드를 클릭해야 12개 항목이 표시되는 문제 해결
* 상세:
    - 현상: `Projects/layoutTest/slide/layoutTest.html#/toc-placeholder` 최초 로드 시 markmap이 root + 빈 중간 노드 2개만 표시되며 실제 12개 항목은 collapsed. 사용자가 노드 클릭 후에야 펼쳐짐
    - 재현: H1 없이 H2로만 구성된 마크다운(`Projects/layoutTest/layoutTest.md`, MarkdownGraph 등)에서 발생
* 원인 분석 (생성된 HTML 직접 분석 결과):
    - **주 원인 (tocData 구조)**: `generateTOCFromFile()`에서 H1이 없는 마크다운의 경우 `currentSection = { content: '', children: [] }`로 빈 wrapper section을 만들고 H2들을 그 children으로 넣음. 결과적으로 markmap 데이터 깊이가 3단계가 됨 (root '' → wrapper '' → 12개 H2 항목)
    - `_config.yml`의 `markmap_depth: 2` → `initialExpandLevel: 2`로 깊이 0~1만 펼쳐 빈 노드 2개만 보이고 실제 항목들은 collapsed
    - **부 원인 (ID 중복)**: `<svg id="toc-mindmap">`이 2개 — `#toc-container` 오버레이(SSOT)와 `_toc` 레이아웃 슬라이드 내부(Issue36_1 추가). `querySelector` 첫 매칭에만 바인딩되어 두 번째 SVG는 영구 빈 상태 + HTML 표준 위반
* 구현 명세:
    - 주 수정: `lib/generate-slides.js` `generateTOCFromFile()` H2 처리 분기 — H1 없을 때 빈 wrapper 미생성, H2를 root의 직접 children으로 push. 깊이 root → 항목들 (2단계로 축소)
    - 부 수정: `theme/default/layouts/_toc.html`, `theme/nowage/layouts/_toc.html`의 `<svg id="toc-mindmap">` 제거 (오버레이가 SSOT, Issue36_1 부분 롤백)
    - 검증: layoutTest, MarkdownGraph(H2 only), m2SlideStyle1_single(H1+H2), LlmAndVibeCoding(AGENDA) 4종 재빌드 회귀 없음 확인
    - 후속: Issue40에서 슬라이드 마크다운 작성 규칙(md-slide-rules + md-m2slide-rules) 정립

## Issue28. 베이스 폴더 변경(scripts -> lib) 영향 제거 (등록: 2026-05-01, 해결: 2026-05-01) ✅
* 목적: `scripts` 폴더가 `lib`로 변경됨에 따라, `m2slide` 내에서 상위 폴더를 참조하는 부분이 있다면 수정하여 의존성을 맞춘다
* 배경: 전체 프로젝트 구조 리팩토링으로 `scripts`가 `lib`로 이름이 변경됨
* 검증 결과:
    - m2slide 디렉토리 전체에서 `scripts` 폴더 참조 0건 확인 (`m2slide.sh`, `m2slideDo.sh`, `lib/`, `Theme/`, `docs/`, `README.md`, `GEMINI.md`, `_config.org.yml`, `CLAUDE.md`, `noteForHuman*.md`, `PROMPTS.md`, `Harness.md`)
    - 상위 `lib/CLAUDE.md` 및 `videoMaker/CLAUDE.md`에서도 모든 경로가 이미 `lib/` 기준으로 정리됨
    - 코드 변경 없이 검증만으로 종결 (단순 이슈)

## Issue37. H 제목 내 특수문자 처리 버그 (등록: 2026-05-01, 해결: 2026-05-01, commit: 9d160e5) ✅
* 목적: 마크다운 H 제목 내에서 backtick으로 감싼 inline code가 HTML로 변환되지 않는 버그 수정
* 상세:
    - 현상: 마크다운 `## 7. \`<!-- nosplit -->\` 휴리스틱 비활성` → HTML 렌더링 시 `## 7. \`\` 휴리스틱 비활성` (backticks와 내용 누락)
    - 재현: `Projects/layoutTest/layoutTest.md:124` 라인
    - 원인: 두 단계 결함의 결합 — (1) `<!-- nosplit -->` 전역 strip 로직이 backtick 인라인 코드 내부의 HTML 주석까지 제거함, (2) 헤더 파싱이 `processInline`을 거치지 않아 backtick code/bold/link 등이 제목에서 변환되지 않음
* 구현 명세:
    - `lib/generate-slides.js` `convertMarkdownToHTML()` 진입부: 인라인 코드를 `\x00CODE{n}\x00` placeholder로 stash → `<!-- nosplit -->` 제거 → placeholder 복원 (backtick 내부 HTML 주석 보호)
    - `lib/generate-slides.js:472-487` 헤더 처리: `<h1/h2/h3>` 생성 시 캡처된 텍스트를 `processInline()`에 통과시켜 backtick/bold/link 등 인라인 마크다운 정상 변환
    - 검증: `Projects/layoutTest/slide/layoutTest.html:400`에서 `<h2 class="title">7. <code><!-- nosplit --></code> 휴리스틱 비활성</h2>` 확인

## Issue38. layout 파일명 표준화 + default 테마 fallback 시스템 (2026-05-01 해결, commit: b58b563) ✅
* 목적: theme layout 파일명을 underscore prefix 컨벤션으로 표준화하고, 커스텀 theme에 layout이 없을 때 default theme에서 자동 fallback 하도록 함
* 상세:
    - 파일명 표준화: `Theme/nowage/layouts/8.1.blank.html` → `_blank.html`, `2.1.contents.html` → `_contents.html`
    - 신규 layout: `_contents_no_title.html` (`_contents.html`에서 title 영역 제거한 변형)
    - `_` prefix는 시스템/기본 layout을 의미. 모든 `_`-prefix layout을 `Theme/default/layouts/`에 복사하여 SSOT 보유
    - `generate-slides.js` 로직 변경: 커스텀 theme에 layout이 없으면 `Theme/default/layouts/`에서 자동 보충
    - 양쪽에 모두 없을 경우 warning 출력 + plain section fallback (기존 동작 유지)
* 구현 명세:
    - `lib/generate-slides.js` `loadLayoutTemplates()`: 2단계 로딩 (themeName !== 'default'일 때만 default 보충, 순환 방지)
    - warning 메시지에 검색한 모든 경로 표시 (`theme/{name}/layouts/ 및 theme/default/layouts/`)
    - `Theme/default/layouts/`: `_blank.html`, `_contents.html`, `_contents_no_title.html`, `_toc.html` 4종 추가 (git 추적)
    - `Theme/nowage/layouts/`: `_blank.html`, `_contents.html`, `_contents_no_title.html` 추가 (gitignored)

## Issue36. theme/{name}/ + HTML 템플릿 layout 시스템 도입 (2026-05-01 해결, commit: 687ce22) ✅
* **목적**: `resource/` 단일 CSS 구조를 `theme/{name}/` 디렉토리 기반 + HTML 템플릿 layout 시스템으로 전환
* plan: `_doc_work/plan/theme_plan.md`
* task: `_doc_work/tasks/theme_task.md`
* design: `_doc_design/theme.md`
* **상세**:
    - `resource/slide.css` → `theme/default/slide.css` 이동
    - `_config.yml`에 `theme:`, `theme_default_layout:` 키 신규 도입 (`slide_css:` 하위 호환 유지)
    - 슬라이드별 layout override: 마크다운 `#layout-name` 메타 한 줄 (방어적 파서 `^#_?[a-z][a-z0-9-]*$`)
    - 슬롯 분리: `::: slotName ... :::` (fenced div) → 템플릿 `{{slotName}}` 치환
    - 첫 슬라이드(TOC) `_toc` 시스템 layout 자동 적용 + `{{markmap}}` 변수 주입
    - `theme/*` gitignore (default만 추적), 사용자 커스텀 영역 분리
    - `m2SlideStyle1_single`에 `theme: nowage` + `theme_default_layout: contents` 적용
    - 미존재 theme/layout 시 warning + plain section fallback
* **구현 명세**:
    - `lib/generate-slides.js`: theme 파싱, layout 메타 추출, 슬롯 분리, 템플릿 로드+치환, `_toc` 자동 적용 (+247줄)
    - `theme/default/{slide.css, layouts/_toc.html}` (git 추적)
    - `theme/nowage/{slide.css, layouts/*.html 11개}` (gitignored, `.layout-*` selector 포함)
    - `.gitignore`: `/theme/*` + `!/theme/default/`

## Issue36_1. 첫 페이지 렌더링 오작동 (등록: 2026-05-01, 해결: 2026-05-01, commit: a95cd61) ✅
* 목적: Issue36 테마 시스템 도입 후 첫 페이지(TOC/Markmap)에서 마크맵이 부분 렌더링되는 버그 수정
* 상세:
    - 현상: `Projects/layoutTest/layoutTest.html#/toc-placeholder`에서 마크맵이 전혀 렌더링되지 않음 (SVG 요소 부재)
    - 원인: _toc layout 템플릿에 마크맵을 렌더링할 SVG 요소(`<svg id="toc-mindmap"></svg>`) 누락
    - 클라이언트 사이드 마크맵 초기화 스크립트가 `#toc-mindmap` SVG를 찾지 못해 렌더링 불가
* **구현 명세**:
    - `theme/default/layouts/_toc.html`: `<div class="toc-markmap">` 내부에 `<svg id="toc-mindmap"></svg>` 추가
    - `theme/{name}/layouts/_toc.html` (모든 테마): 동일하게 적용
    - JavaScript tocData 주입은 정상 작동, SVG 요소 추가로 클라이언트 사이드 렌더링 가능

## Issue36_2. nowage 테마로 재테스트 (등록: 2026-05-01, 해결: 2026-05-01, commit: a95cd61) ✅
* 목적: 36_1 원인 분석을 위해 기본 default 테마 대신 nowage 테마로 재테스트
* 상세:
    - 작업: `theme/nowage/layouts/_toc.html`에 SVG 요소 추가 (36_1과 동일한 수정)
    - 검증: layoutTest 프로젝트 nowage 테마로 재생성 후 마크맵 렌더링 확인 완료
    - 결과: default와 nowage 테마 모두 마크맵 렌더링 정상 작동

## Issue35. chapter-list TOC 카드 블록 레이아웃 전환 (2026-05-01 해결, commit: 30181b9) ✅
* **목적**: `toc_placeholder`로 자동 생성되는 챕터 목차의 시각 정렬 개선
* **상세**:
    - 기존 `display: grid` + `repeat(auto-fit, minmax(260px, 1fr))` 다중 컬럼은 항목별 텍스트 길이 차이로 컬럼 폭이 좁아지고 정렬이 들쭉날쭉했음
    - 카드 블록 + flex-wrap 다중 행 레이아웃으로 전환 — 한 행 3개 기본, 마지막 행 가운데 정렬
    - 재현 시각: `Projects/m2SlideStyle1_single/slide/m2SlideStyle.html#/15` ("5. 레이아웃 예제(DIV 활용)") 7개 항목이 3+3+1 카드 배치
* **구현 명세**:
    - `lib/generate-slides.js:1156-1162`: `<ul class="chapter-list chapter-list--cards" data-count="N">` + `<li class="chapter-card">` 마크업으로 변경, `column-count` inline style 제거
    - `resource/slide.css`: `.chapter-list--cards` modifier 신규 (flex-wrap, min 240/max 360px, 흰 반투명 배경 + hover 떠오름, `word-break: keep-all`). 기존 `.chapter-list` grid 규칙은 보존

## Issue34. 다분할 레이아웃 마크다운 단축 표기 지원 (2026-05-01 해결, commit: bfdd1c0) ✅
* **목적**: 좌/우·상/하·N분할·그리드 레이아웃을 최소 지시자 마크다운으로 작성 가능하게 함
* **task**: `_doc_work/tasks/layout-multi-column_task.md`
* **design**: `_doc_design/layout.md`
* **상세**:
    - 1단계 휴리스틱: 한 슬라이드에 리스트+이미지 공존 시 좌/우 자동 2분할 (raw `<div>`가 있으면 자동 스킵)
    - 2단계 Slidev 슬롯 `::right::`: 좌/우 2분할 명시 단축 표기
    - 3단계 Pandoc 펜스 div `::: columns` / `::: rows`: N분할·상하·그리드·비율 제어. `width="N%"` → flex/max-width inline style. `height="N%"` → height inline style. `.card` 클래스로 카드 스타일
    - `<!-- nosplit -->` 으로 1단계 휴리스틱 비활성화 가능
* **구현 명세**:
    - `lib/generate-slides.js`: `convertMarkdownToHTML` 진입부 4단계 전처리 파이프라인(`preprocessPandocDiv`, `preprocessSlidevSlot`, `preprocessHeuristic`) + `<div>` 라인 패스스루
    - `resource/slide.css`: `.m2-cols/.columns`, `.m2-col/.column`, `.m2-rows/.rows`, `.m2-row/.row`, `.card` 클래스 (Reveal.js `.slides section` 컨테이너는 보존)

## Issue34_1. 다분할 레이아웃 렌더링 버그 수정 (2026-05-01 해결, commit: bfdd1c0) ✅
* **목적**: Issue34 시각 검증에서 발견된 두 가지 렌더링 버그 수정
* **상세**:
    - **버그1**: 휴리스틱 2분할에서 소스 순서 `이미지 → 리스트`도 항상 텍스트-좌/이미지-우로 배치되던 문제 — 소스 순서 보존
    - **버그2**: `::right::` 슬롯 슬라이드의 H2가 첫 컬럼 내부에 들어가면 `generateSlideHTML`의 `theContents` H2-split이 m2-cols 구조를 깨뜨려 이미지가 우측이 아닌 아래에 표시되던 문제
    - 재현: `Projects/m2SlideStyle1_single/slide/m2SlideStyle.html#/17` (버그1), `#/18` (버그2)
* **구현 명세**:
    - `preprocessHeuristic()`: 첫 단독 이미지/리스트 라인의 등장 순서를 인덱스로 비교하여 컬럼 배치 결정 (이미지 먼저 → 이미지가 좌측)
    - `preprocessSlidevSlot()`: 슬라이드 선두의 H1/H2/H3 헤더 라인을 wrapper 밖으로 추출

## Issue32. m2slide.sh -h/--help 옵션 추가 (2026-05-01 해결, commit: 2bbb15a) ✅
* **목적**: `./m2slide.sh --help` 실행 시 usage가 출력되지 않고 `--help`를 프로젝트명으로 해석하던 버그 수정
* **상세**:
    - `m2slide.sh`에 `usage()` 함수 추가 (한국어 도움말, Arguments/Options/Detection priority/Examples 4섹션)
    - 옵션 파싱 루프 앞쪽에서 `-h|--help` 케이스를 처리하여 즉시 종료
    - 알 수 없는 `-`로 시작하는 옵션은 에러 + usage 출력 후 exit 1
* **구현 명세**: `m2slide.sh:13-65` — `usage()` 신설, case문에 `-h|--help`/`-*` 추가

## Issue31. top_align 버그 수정 및 title_contents_gap 옵션 추가 (2026-05-01 해결, commit: 8ca0915) ✅
* **목적**: `top_align: false` 설정이 실제로 적용되지 않던 버그를 수정하고, Title↔Contents 갭을 제어하는 `title_contents_gap` 옵션을 추가
* **상세**:
    - `generate-slides.js`에서 `center: false` 하드코딩 → `center: ${!TOP_ALIGN}` 으로 수정
    - `Reveal.configure({ center: false })` 및 `topBiasCurrentSlide()` 호출을 `top-align-mode` 조건부로 제한
    - `title_contents_gap` 파싱 추가 (`applyConfig()`), CSS 변수 `--title-contents-gap-pct` 주입
    - `applyTitleContentsGap()` JS 함수 추가: `h2.title.offsetHeight * pct / 100` → `margin-bottom` 적용
    - `document.documentElement` → `document.body` 수정 (CSS 변수 상속 방향 버그 수정)
    - `0 || 30` falsy 버그 수정 → `isNaN(pct) ? 30 : pct` 패턴으로 변경
    - `_config.org.yml`에 `title_contents_gap: 30` 기본값 추가
    - `m2slide.sh`: 프로젝트명 단독 전달 시 `Projects/{name}` 경로 자동 해석 추가
    - 루트 `_config.yml` 삭제 (Issue30 잔여분)
* **구현 명세**:
    - `title_contents_gap: 30` → title 높이의 30% 갭 (기본값)
    - `0`: 갭 없음, `50`: title 높이의 절반, `100`: title 높이와 동일
    - ready / slidechanged / resize 이벤트 모두 연동

## Issue30. _config.org.yml을 기본값 SSOT로 변경 (2026-05-01 해결, commit: 6805b6d) ✅
* **목적**: `generate-slides.js`에 하드코딩된 기본값을 `_config.org.yml`에서 읽도록 변경
* **상세**:
    - `applyConfig(raw)` 함수 분리: config 파싱 로직을 독립 함수로 추출
    - `loadConfig()` 재구성: `_config.org.yml` → `ROOT_DIR/_config.yml` → `projectDir/_config.yml` 순으로 레이어드 적용
    - 인자 없이 실행 시 default project를 `_config.org.yml`의 `current_project`에서 읽도록 변경 (기존 하드코딩 `'LlmAndVibeCoding'` 제거)
* **구현 명세**: `lib/generate-slides.js` — `applyConfig` 신설, `loadConfig` 레이어드 방식으로 교체

## Issue29. convert.sh → m2slide.sh 이름 변경 (2026-05-01 해결, commit: c5030fb) ✅
* **목적**: 진입점 스크립트를 도구 역할이 명확한 이름으로 변경
* **상세**:
    - `convert.sh` → `m2slide.sh` (git mv)
    - 내부 참조 파일 업데이트: `_config.org.yml`, `README.md`, `Projects/README.md`, `Projects/LlmAndVibeCoding/README.md`, `Projects/LlmAndVibeCoding2/README.md`, `Projects/m2SlideStyle1_single/_config.yml`, `Projects/m2SlideStyle2_chapter/_config.yml`, `Projects/MarkdownGraph/_config.yml`, `lib/deploy.sh`
    - 외부 참조 파일 업데이트: `lib/slide_capture/prepare_project.sh`, `_tool/scenario_ramyeon_all.sh`, `_doc_design/pipeline_steps.md`, `lib/README.md`, `_doc_work/work_m2slide.md`, `_doc_work/scenario_ramyeon.md`, provision 문서

## Issue24. Slide 폴더 포터블화 (상대 경로 및 리소스 포함 문제 해결) (2025-12-07 해결, commit: 40e8bc4)
* `generate-slides.js` 수정: `SLIDE_CSS_REL`로 지정된 CSS 파일과 `config.yml`의 `font_import`에 지정된 로컬 폰트 파일을 `slide/css/` 폴더로 자동 복사.
* `SLIDE_CSS_REL` 및 `font_import` 참조 경로를 복사된 파일(`css/custom.css`, `css/filename`)로 자동 변경하여 상대 경로 의존성을 제거.
* 이로써 생성된 `slide` 폴더를 다른 위치로 이동해도 스타일과 폰트가 깨지지 않게 됨.

## Issue20. PPTX 생성 옵션 (--pptx) 추가 (2025-12-07 해결, commit: 40e8bc4)
* `convert.sh`에 `--pptx` 옵션 추가
* Pandoc을 활용하여 마크다운을 PowerPoint(.pptx)로 변환하는 자동화 스크립트 구현
* Single Page Mode 및 Chapter Mode 모두 지원
* Pandoc 실행 시 이미지 경로 문제 해결을 위한 `--resource-path` 옵션 적용

## Issue23. 단일 페이지 모드에서 ePub 생성 지원 (2025-12-07 해결, commit: 40e8bc4)
* `generate-epub.js`가 Single Page Mode에서도 동작하도록 `md` 파일 위치 처리 로직 개선.
* `convert.sh`에서 모드에 따른 적절한 `inputDir` 설정과 함수 호출.
* `markdown` 폴더가 없으면 프로젝트 루트의 `.md` 파일을 찾아 EPub 생성.
* `convert.sh`에 `--pptx` 옵션 추가
* Pandoc을 활용하여 마크다운을 PowerPoint(.pptx)로 변환하는 자동화 스크립트 구현
* `GEMINI.md`에 명시된 Pandoc 변환 가이드를 스크립트로 통합

## Issue18. PDF 생성 옵션 (--pdf) 추가 (2025-12-07 해결, commit: 40e8bc4)
* `convert.sh`에 `--pdf` 옵션 추가 구현 완료.
* `decktape`가 설치되어 있으면 사용하고, 없으면 `npx decktape`를 자동으로 실행하여 PDF 변환.
* `convert.sh [Projects] --pdf` 형식으로 실행 가능.
## Issue22. 테이블 내 이미지 크기 자동 조절 (2025-12-07 해결, commit: 40e8bc4)
* `slide.css`를 수정하여 테이블 내부(`table img`) 이미지가 텍스트 높이(`1.5em`)에 맞춰 자동 조절되도록 설정.
* `vertical-align: middle`을 적용하여 텍스트와 이미지의 정렬을 맞춤.

## Issue21. 번호 있는 리스트(Ordered List) 중첩 오작동 (2025-12-07 해결, commit: 0310884)
* `generate-slides.js`에서 정렬된 리스트(OL)의 중첩 로직이 구현되지 않았던 문제 수정.
* Unordered List(UL)와 동일한 중첩 로직(들여쓰기 감지 및 `olLevel` 관리)을 적용하여, 정렬된 리스트도 들여쓰기에 따라 중첩되도록 수정함.
* `<li>` 태그 내부에 nested `<ol>`이 정상적으로 삽입되도록 처리.

## Issue19. 단일 페이지 모드용 종합 샘플 프로젝트(m2Slide 스타일) 추가 (2025-12-07 해결, commit: 40e8bc4)
* m2Slide 사용법과 기능을 보여주는 종합 예제 프로젝트 `Projects/m2SlideStyle` 생성
* 단일 페이지 모드(Single Page Mode)로 구성
* 포함 내용:
    * 다양한 텍스트 레이아웃
    * 이미지 배치 패턴
    * 각종 그래프 및 Mermaid 다이어그램 예시
    * 코드 블록 및 Syntax Highlighting
    * m2Slide 자체 스타일 가이드 및 기능 설명 포함


## Issue17. 단일 페이지 모드 시 markdown 폴더 없이 루트 md 파일 인식 지원 (2025-12-06 해결, commit: 103203c)
* `convert.sh` 및 `generate-slides.js` 수정: `markdown` 폴더가 없으면 프로젝트 루트를 입력으로 자동 인식
* 파일 인식 우선순위 로직 구현:
    1. 프로젝트 폴더명과 동일한 `.md` 파일
    2. `README.md`
    3. `.md` 파일이 하나만 있는 경우 해당 파일
    4. 2개 이상일 경우 특수문자로 시작하지 않는 파일 (하나일 때만 선택, 여러 개면 에러)
* `AGENDA.md`가 없는 경우 "Single Page Mode"로 작동하여 `index.html` 생성 스킵

## Issue16. 단일 페이지 프로젝트(MarkdownGraph) markmap depth 미적용 수정 (2025-12-06 해결, commit: 3603790)
* `generate-slides.js`에서 `markmapDepth` 결정 로직 개선: `AGENDA.md` 유무(`hasAgenda`)를 확인하여 분기 처리
* 다중 페이지 프로젝트(챕터): `config.chapter_markmap_depth` 우선 적용
* 단일 페이지 프로젝트: `config.markmap_depth` 적용

## Issue15. 챕터별 페이지 markmap depth 별도 설정 (상대적 깊이 적용) (2025-12-06 해결, commit: 3603790)
* `config.yml`에 `chapter_markmap_depth` (기본값: 3) 추가
* `generate-slides.js`에서 챕터별 페이지 생성 시 `chapter_markmap_depth`를 우선 적용하도록 수정하여 챕터 상세 페이지에서 더 깊은 레벨(3차)까지 표시되도록 개선

## Issue14. 챕터별 프로젝트(LlmAndVibeCoding) markmap 미출력 수정 (2025-12-06 해결, commit: 3603790)
* `generate-slides.js`의 `generateIndexHTML` 함수에서 `initialExpandLevel`이 1로 하드코딩되어 있던 문제 수정
* `config.yml`의 `markmap_depth` 설정을 따르도록 변경하여 `markmap_depth: 2`일 경우 하위 챕터까지 바로 보이도록 개선

## Issue13. Markmap Depth 설정 및 표시 오류 수정 (2025-12-06 해결, commit: eaa5870)
* `generate-slides.js`에서 `config.yml`의 `markmap_depth` 설정을 제대로 읽지 못하는 문제 수정
* `config.yml`의 `markmap_depth` 기본값을 1에서 2로 변경하여 초기 로드 시 노드가 보이도록 개선


## Issue12. font_size_auto 미작동 수정 (2025-11-30 해결, commit: 7bbeaac)
* `font_size_auto`가 H2(소제목)가 있는 슬라이드에서만 작동하던 문제 수정
* H2가 없으면 H1(대제목) 이후의 모든 내용을 `.theContents`로 감싸도록 로직 개선
* `ResizeObserver`를 도입하여 이미지 로딩 등 컨텐츠 크기 변화를 실시간으로 감지하고 폰트 크기를 자동 재조정하도록 개선 (브라우저 네이티브 API 활용)
* `config.yml`에서 `font_size_auto` 설정 지원 (기본값: false)
* `config.yml` 키 이름 변경: `max_font_size` -> `font_size`, `max_font_color` -> `font_color`
* `fit`/`height` 모드에서 `font_size_auto` 최적화 (이미지 컨테이너 높이 자동 조절)
* `config.yml`에서 `font_weight` 설정 지원 (기본값: title 700, sub 500)

## Issue11. 스타일 상세 설정 (config.yml) (2025-11-30 해결, commit: 84ddacb)
* `config.yml`에 `title`, `sub_title`, `theContents`에 대한 상세 스타일 설정 추가
* 지원 항목: `max_font_size`, `max_font_color`, `align`, `outer_padding`
* `generate-slides.js`에서 해당 설정을 파싱하여 CSS 변수 또는 스타일로 적용

## Issue10. 개요 페이지 컬럼 수 제한 (2025-11-30 해결, commit: 2982855)
* 반응형 다단 레이아웃(Issue 7) 적용 시, 컬럼 수가 리스트 항목 수를 넘지 않도록 제한
* 예: 리스트 항목이 2개면 최대 2단까지만 표시 (화면이 넓어도 3단이 되지 않게 함)
## Issue7. 개요1 페이지 반응형 다단 레이아웃 (2025-11-30 해결, commit: a0f7f03)
* 개요1 페이지(Overview)의 리스트를 화면 너비에 따라 반응형으로 다단 처리
* `column-width: 300px` 활용하여 너비가 좁으면 1단, 넓으면 2단 이상으로 자동 조절

## Issue8. index.html 네비게이션 개선 (2025-11-30 해결, commit: 2d6421a)
* index.html 첫페이지에서 오른쪽 화살표 누르면 다음 페이지로 이동

## Issue9. 챕터 간 네비게이션 개선 (2025-11-30 해결, commit: 2d6421a)
* 해당 챕터의 마지막 페이지에서 오른쪽 화살표 누르면 마지막 페이지라는 메세지 표시
* 다시 오른쪽 화살표 누르면 다음 챕터 첫페이지로 이동
## Issue6. 이미지/SVG 크기 옵션 추가 (2025-11-30 해결, commit: f047fbb)
* `config.yml`에 `style > theContents > media_container_enlarge` 옵션 추가
* 4가지 모드 지원:
  1. `original`: 원본 크기 유지 (단, 화면 넘지 않음)
  2. `width`: 너비 최대화
  3. `height`: 높이 최대화
  4. `fit`: 스크롤 없이 화면에 꽉 차게 (비율 유지)
## Issue4. 리스트(UL) 글자 크기 최적화 (2025-11-29 해결, commit: 08e8483)
* 최대 크기는 제목의 2/3 수준으로 설정
* 내용이 많으면 줄이되, 최소 크기(`config.yml` 지정) 이하로는 줄어들지 않게 함 (스크롤 허용)
* `config.yml`에 최소 글자 크기 설정 추가

## Issue5. 제목 크기 및 패딩 설정 (2025-11-29 해결, commit: 08e8483)
* 제목 크기를 2배로 확대
* 상단 패딩 추가
* `config.yml`에서 제목 크기 배율과 패딩값 설정 가능하게 함

## Local Issue1. H1 페이지 수정 (2025-11-29 해결, commit: 647e8eb)
* 내용 없는 개요 페이지(H1)는 제목을 2배 크게 하고, 하위 장표(H2) 리스트를 자동으로 추가하기

## Local Issue2. 개요 1을 오른쪽 위에 작은 글씨로 넣기 (2025-11-29 해결, commit: 647e8eb)
* 현재 내용이 개요1의 슬라이드 일경우 우측 상단에 표시

## Local Issue3. 단일 페이지 상위 이동 (2025-11-29 해결, commit: 647e8eb)
* 화살표키 위를 입력하면 상위 페이지로 가게 되어 있는데, 단일 페이지일 경우는 가장 앞페이지로 오기



---

# v0.6.0 (2026-05-05) — Issue71-106 36건 아카이브

## Issue104. Chapter ← 이전 챕터 진입 시 트랜지션 방향 역전 — 순방향 애니메이션이 뒤로가기 의도와 충돌 (등록: 2026-05-04, 해결: 2026-05-05, commit: 48f63e2) ✅
* 카테고리: Frontend
* 목적: Chapter 모드에서 ← 키로 이전 챕터(`?last=1`)로 이동 시, fresh page load로 Reveal.js가 forward 트랜지션(우→좌)을 재생함. 사용자는 "뒤로 가는 동작"으로 인식하므로 backward 트랜지션(좌→우)이 직관적
* 구현 명세 (실행, 옵션 A 채택 — 자체 CSS keyframe):
    - URL 시그널 ([`lib/html-builder.js`](lib/html-builder.js)):
        - PREV_CHAPTER href: `?back=1` (Home 단독) / `?last=1&back=1` (← 키로 이전 챕터 마지막 슬라이드 진입)
        - NEXT_CHAPTER href: `?fwd=1` (End / 본문 마지막 → / leaf ↓)
    - 도착 페이지 `Reveal.on('ready')` 핸들러:
        - hasBack && hasLast: `transition: 'none'`으로 마지막 슬라이드 즉시 점프 + `body.m2-back-enter` 부착 → backward keyframe 1회 재생
        - hasBack 단독: `body.m2-back-enter` 부착 (첫 슬라이드 진입 backward 애니메이션)
        - hasFwd: `body.m2-fwd-enter` 부착 (forward 애니메이션)
        - 450ms 후 클래스 제거
    - CSS keyframes (template `<style>`, Reveal.js 표준 컨벤션):
        - `m2-slide-from-left` (← 키 backward — 좌측에서 등장, 우측 모션)
        - `m2-slide-from-right` (→ 키 forward — 우측에서 등장, 좌측 모션)
        - `body.m2-back-enter`, `body.m2-fwd-enter` selector + `!important`로 Reveal inline transform 우선
    - `body.m2-cross-loading` 클래스로 cross-page 진입 동안 `.reveal { visibility: hidden }` → Reveal 내부 forward 트랜지션 깜빡임 차단 후 `requestAnimationFrame`에서 노출 + 애니메이션 시작
* 효과:
    - ← 키로 이전 챕터 진입 시 슬라이드가 좌측에서 등장 (Reveal backward와 동일) — 뒤로 가는 시각 정합
    - → 키로 다음 챕터 진입 시 슬라이드가 우측에서 등장 (Reveal forward와 동일) — 앞으로 가는 시각 정합
    - PgDown(?last=1만, back 없음)은 즉시 점프 (기존 동작 유지)
* 검증:
    - 3종 프로젝트 빌드 통과
    - `m2SlideStyle2_chapter/slide/01-text-layout.html` 산출물에 keyframes·시그널 핸들러·body 클래스 25 occurrences 부착
    - 브라우저: 페이지 2 → ← → 페이지 1 backward 트랜지션, 페이지 1 → →→ → 페이지 2 forward 트랜지션 시각 확인 가능

## Issue106. anchor에서 ↓ 누름 시 자식 sub-anchor 우선 — H1 → 첫 H2로 점프 (등록: 2026-05-04, 해결: 2026-05-04, commit: dc60188) ✅
* 카테고리: Frontend
* 목적: H1 anchor에서 ↓ 가 outline 자식(H2) 우선해야 사용자 멘탈 모델("하위 toc 있으면 그곳으로, 없으면 직후 슬라이드")과 정합
* 구현 명세 (실행):
    - 신규 함수 `findFirstChildAnchorIndex(currentH, level)` ([`lib/html-builder.js`](lib/html-builder.js)):
        - currentH+1부터 scan, anchor 슬라이드 발견 시:
            - level > 현재 → 반환 (자식 anchor 발견)
            - level ≤ 현재 → -1 반환 (scope 종료)
    - ↓ 핸들러 anchor 분기 갱신: `findFirstChildAnchorIndex(idxD, encLv)` 결과 ≥ 0 → 그곳 / -1 → 기존 `idxD + 1` 동작
    - Single/Chapter 모드 공통 적용
    - 설계 동기: [`_doc_design/key_navigation.md`](_doc_design/key_navigation.md) Issue106 항목 (Single/Chapter 매트릭스, K3, 변경 이력)
* 효과:
    - #/12 (H1 "4. 이미지 및 미디어") ↓ → #/14 (H2 "4.1") — content "개요"(#/13) skip
    - #/14 (H2 "4.1", 자식 없음) ↓ → #/15 content (회귀 없음)
    - #/1 (H1 "1", 자식 없음) ↓ → #/2 content (회귀 없음)
* 검증:
    - `m2SlideStyle1_single` 빌드 산출물 `index.html`에 `findFirstChildAnchorIndex` 부착 확인 (2 occurrences)
    - `m2SlideStyle2_chapter`, `layoutTest` 빌드 회귀 없음

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

