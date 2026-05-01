# Issue Management
* https://github.com/Finfra/m2slide/issues
* Issue HWM: 45
* 오래된 Issue는 `z_old/old_issue.md`에 저장
* **GitHub Issue 등록 규칙**:
    * GitHub Issue 등록 시 제목의 `IssueXX. ` 접두사는 제거합니다. (GitHub 자체 번호와 중복 방지)
    * 예: `Issue21. 제목` -> `제목`
    * 명령어: `gh issue create --title "제목" --body "내용"`
    * 등록 후 `gh issue close {IssueNum}`으로 닫기 (완료된 경우)

# 🤔 결정사항

# 🌱 이슈후보
0. meta.yml 운영(생성정보, googleDrive정보, 강의일, version+날짜, ) cf) /Users/nowage/work/AgenticCoding_lec/_doc_work/AgenticCoding_v1.1/meta.yml
1. 제목 페이지 추가 - Markdown Yaml Front Matter (QGCode, 강사명, 강사 연락처, 부제목(part1), QRCode)
2. Orientation slide기능(제목 페이지와 목차 사이 장표 추가 기능."강의에 들어가기 앞서..." 혹은 공지사항 ) 목차에 들어가면 않됨. "## ![오리엔테이션](./00_Orientation.md)"이런 식으로 !로 시작하는 제목은 MarkdownTreeView에 추가시키지 않음.
3. 장표 페이지에서 드레그 지원( up,down,left,right )
4. m2SlideStyle2_chapter 프로젝트 구조 정비 — 폴더 이름이 `_chapter`인데 markdown/ 폴더가 없어 Single Page Mode로 빌드됨. 의도가 Chapter Mode 샘플이라면 markdown/ + AGENDA.md 추가, 아니면 폴더 이름 변경 필요

# 🚧 진행중

## Issue26. 동영상 지원 기능
* 슬라이드 내 동영상 삽입 및 재생 기능 지원
* 로컬 비디오 파일 재생 확인
* layoutTest프로젝트에서 _doc_work/_resource/mp4/Movie-1.mp4 활용하여 테스트


## Issue44. raw HTML `<video>`/`<audio>` multi-line block이 `<p>` wrap으로 깨짐 (등록: 2026-05-01)
* 목적: 마크다운 본문에 작성한 multi-line raw HTML block(`<video>...<source>...</video>`, `<audio>`, `<iframe>` 등)이 마크다운 파서에 의해 라인별로 `<p>` 태그에 감싸져 DOM 구조가 깨지는 버그 수정
* 상세:
    - 현상: `Projects/layoutTest/slide/layoutTest.html#/23~25` (## 20~22) 슬라이드에서 video 태그가 화면에 표시되지 않음
    - 재현: `./m2slideDo.sh layoutTest` 후 `Projects/layoutTest/slide/layoutTest.html` 의 #/23~#/25 확인
    - 출력 결과 (`layoutTest.html:601-606`):
        ```html
        <p><video width="100%" height="auto" controls></p>
        <p>  <source src="./video/Movie-1.mp4" type="video/mp4"></p>
        <p>  Your browser does not support the video tag.</p>
        <p></video></p>
        ```
    - 원인: `lib/generate-slides.js`의 `convertMarkdownToHTML()` 단락 처리 로직이 빈 줄 단위로 라인을 묶어 `<p>...</p>`로 wrap. block-level HTML 태그(`<video>`, `<audio>`, `<iframe>`, `<table>`, `<div>` 등)는 보존해야 하나 그 판별이 없음
* 구현 명세:
    - `lib/generate-slides.js` `convertMarkdownToHTML()`에 block-level HTML 패스스루 로직 추가:
        - 라인이 `<(video|audio|iframe|table|figure|div|section)[\s>]` 로 시작하면 해당 닫힘 태그 만날 때까지의 모든 라인을 단일 블록으로 보존 (라인별 `<p>` wrap 금지)
        - 닫힘 태그 매칭은 nesting depth 추적
    - 인라인 HTML(`<span>`, `<a>`, `<strong>` 등)은 기존대로 처리 (영향 없음)
    - 펜스드 코드 블록(```` ```html ````) 내부는 영향 없음 (이미 코드로 escape됨)
* 회귀 검증:
    - layoutTest #/23~25에서 video element가 정상 재생되어야 함
    - 기존 코드 블록 표시 (#/16~22, ## 13~19) 회귀 없음
    - LlmAndVibeCoding 등 다른 프로젝트 빌드 정상

# 📕 중요

# 📙 일반

## Issue45. layout 이름 정규화 정책 문서·회귀 검증 정합성 점검 (등록: 2026-05-02)
* 목적: Issue41(코드 수정)이 머지된 후 layout 이름 정규화 정책이 코드·룰 문서·회귀 테스트 3축에서 일관되게 유지되는지 점검 + `_doc_design/`에 영속 정책 문서화. Issue41이 단일 PR로 처리하기 어려운 정합성 차원 작업을 분리.
* 상세:
    - **현상 추적**: `.claude/rules/md-m2slide-rules.md` 주석은 "`_` prefix 제거 형태"라고 명시하나 Issue41 이전까지 실제 코드는 정규화 없이 underscore 포함 키만 사용 — 문서·동작 괴리 누적
    - **회귀 누락**: 5개 프로젝트(LlmAndVibeCoding, LlmAndVibeCoding2, m2SlideStyle1_single, m2SlideStyle2_chapter, MarkdownGraph) 중 `theme_default_layout` 키 명시 사용 빈도와 underscore 사용 패턴이 자동 검증되지 않음
    - **Issue41과 분리 이유**: Issue41은 lookup 폴백·경고 dedup 코드 변경이 핵심 — 본 이슈는 그 변경이 안착된 뒤 정책·문서·테스트 정합성을 책임지는 후속 검증 작업
* 구현 명세:
    - **정책 SSOT 문서화**: `_doc_design/layout.md`에 layout 이름 표기 정책 섹션 추가
        * 사용자 표기: `_` prefix 없는 형태 권장 (`contents`, `blank`)
        * 시스템 자동 감지(Issue27_1·27_2)는 underscore 포함 형태 유지 (`_blank`, `_contents_no_title`) — 사용자 영역과 시스템 영역 분리
        * 코드는 양쪽 표기를 모두 alias로 인식 (Issue41 구현)
    - **룰 문서 동기화**: `.claude/rules/md-m2slide-rules.md`의 layout 표기 가이드를 `_doc_design/layout.md`와 일치시키고 cross-link 추가
    - **회귀 테스트 자동화**: `m2slideDo.sh`에 `--lint-config` (가칭) 옵션 추가하여 모든 프로젝트의 `_config.yml` `theme_default_layout` 키를 스캔, 미존재 layout 키 사용 시 경고
    - **검증 범위**:
        * 5개 프로젝트 빌드 후 layout 미발견 경고 0건 확인
        * `theme_default_layout: contents` / `theme_default_layout: _contents` 양쪽 표기 모두 정상 동작
        * `#layout-blank` / `#layout-_blank` 양쪽 명시 정상 동작
* 선행 조건: Issue41 종결 후 진행
* 비고: 본 이슈는 본문이 헤더 손실된 상태로 잔존했던 잔재를 별도 이슈로 분리해 재정립한 것임 (2026-05-02)

# 📗 선택

# ✅ 완료


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

