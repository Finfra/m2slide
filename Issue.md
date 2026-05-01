# Issue Management
* https://github.com/Finfra/m2slide/issues
* Issue HWM: 36
* 오래된 Issue는 `z_old/old_issue.md`에 저장
* **GitHub Issue 등록 규칙**:
    * GitHub Issue 등록 시 제목의 `IssueXX. ` 접두사는 제거합니다. (GitHub 자체 번호와 중복 방지)
    * 예: `Issue21. 제목` -> `제목`
    * 명령어: `gh issue create --title "제목" --body "내용"`
    * 등록 후 `gh issue close {IssueNum}`으로 닫기 (완료된 경우)

# 🌱이슈 후보
0. meta.yml 운영(생성정보, googleDrive정보, 강의일, version+날짜, ) cf) /Users/nowage/work/AgenticCoding_lec/_doc_work/AgenticCoding_v1.1/meta.yml
1. 제목 페이지 추가 - Markdown Yaml Front Matter (QGCode, 강사명, 강사 연락처, 부제목(part1), QRCode)
2. Orientation slide기능(제목 페이지와 목차 사이 장표 추가 기능."강의에 들어가기 앞서..." 혹은 공지사항 ) 목차에 들어가면 않됨. "## ![오리엔테이션](./00_Orientation.md)"이런 식으로 !로 시작하는 제목은 MarkdownTreeView에 추가시키지 않음.
3. 장표 페이지에서 드레그 지원( up,down,left,right ) 
# 🔥 진행 중

## Issue36_1. 첫 페이지 렌더링 오작동 (등록: 2026-05-01)
* 목적: Issue36 테마 시스템 도입 후 첫 페이지(TOC/Markmap)에서 마크맵이 부분 렌더링되는 버그 수정
* 상세:
    - 현상: `Projects/layoutTest/layoutTest.html#/toc-placeholder`에서 마크맵이 일부만 로드되고, 나머지가 비어있음
    - 재현: layoutTest 프로젝트에서 슬라이드 생성 후 첫 페이지 확인
    - 추정 원인: theme 시스템 적용 중 `_toc` layout의 `{{markmap}}` 치환 또는 초기화 시점 문제

## Issue36_2. nowage 테마로 재테스트 (등록: 2026-05-01)
* 목적: 36_1 원인 분석을 위해 기본 default 테마 대신 nowage 테마로 재테스트
* 상세:
    - 작업: `Projects/layoutTest/_config.yml` 생성 및 `theme: nowage`, `theme_default_layout: contents` 설정
    - 목표: 동일 버그 재현 확인 또는 테마 특화 이슈 파악

## Issue37. H 제목 내 특수문자 처리 버그 (등록: 2026-05-01)
* 목적: 마크다운 H 제목 내에서 backtick으로 감싼 inline code가 HTML로 변환되지 않는 버그 수정
* 상세:
    - 현상: 마크다운 `## 7. \`<!-- nosplit -->\` 휴리스틱 비활성` → HTML 렌더링 시 `## 7. \`\` 휴리스틱 비활성` (backticks와 내용 누락)
    - 재현: `Projects/layoutTest/layoutTest.md:124` 라인
    - 원인: `generate-slides.js`의 제목 파싱 로직에서 backtick 코드 블록을 처리하지 않음
    - 영향: 제목 내 기술 용어 강조나 특수문자 보호 목적 코드 블록이 깨짐

* 

## Issue25. 배경 이미지 설정 기능
* 마크다운 메타데이터(YAML frontmatter)를 통해 전체 슬라이드의 배경 이미지를 지정하는 기능 구현
* `background` 속성으로 이미지 경로 혹은 color 지정 지원

## Issue26. 동영상 지원 기능
* 슬라이드 내 동영상 삽입 및 재생 기능 지원
* 로컬 비디오 파일 재생 확인

## Issue27. 제목 없는 단독 이미지 페이지 자동 확대 (Full Image)
* 제목 없이 이미지만 있는 슬라이드 감지 로직 구현
* 해당 슬라이드에 대해 화면 비율을 유지하면서 화면에 꽉 차게(Contain/Cover) 표시하는 스타일 적용

## Issue28. 베이스 폴더 변경(scripts -> lib) 영향 제거
* **목표**: `scripts` 폴더가 `lib`로 변경됨에 따라, `m2slide` 내에서 상위 폴더를 참조하는 부분이 있다면 수정하여 의존성을 맞춘다.
* **배경**: 전체 프로젝트 구조 리팩토링으로 `scripts`가 `lib`로 이름이 변경됨.



# 🏁 완료된 이슈
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


# 🗑️ 보류된 이슈

