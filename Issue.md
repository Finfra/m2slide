# Issue Management
* https://github.com/Finfra/m2slide/issues
* Issue HWM: 134
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

## Issue133. Single 모드 ⇤/⇥ boundary fallback (Chapter Issue114 대칭) (등록: 2026-05-09)
* 목적: Single 모드에서 첫 H1 anchor 또는 그 본문에서 ⇤(Home/`,`)를 누르면 `agenda.html?back=1`로, 마지막 anchor/본문에서 ⇥(End/`.`)를 누르면 `agenda.html?fwd=1`로 fall-through하여 Chapter 모드 Issue114 boundary fallback과 정책 일관성 확보
* 상세:
    - 현 동작(설계 line 97, K5): Single 모드 ⇤/⇥ sibling 부재 시 무동작 → 사용자가 navigation 막혔다고 인식
    - Chapter 모드는 Issue114에서 첫 챕터 ⇤ → `agenda.html?back=1`, Cover ⇥ → `agenda.html?fwd=1` 등 boundary fallback 적용됨
    - 재현: `Projects/m2SlideStyle1_single/slide/index.html#/2`에서 Home(또는 `,`) 누름 → 기대값 `agenda.html?back=1`이나 실제 무동작
    - 영향 파일: `lib/html-builder.js` (single 모드 deck Home/End 핸들러), `_doc_design/key_navigation.md` (line 97 + K5 결정 갱신)
* 카테고리: Frontend (키 네비게이션)
* 구현 명세:
    - 1단계 — 설계 갱신: `_doc_design/key_navigation.md` line 97(⇤ Single)·line 98(⇥ Single) + K5 결정 + 변경 이력에 본 정책 추가
        - ⇤ Single: 직전 sibling anchor at `level ≤ N` 부재 시 → `agenda.html?back=1`
        - ⇥ Single: 직후 sibling anchor at `level ≤ N` 부재 시 → `agenda.html?fwd=1`
        - K5 결정 분리: Chapter는 양쪽 한 끝 무동작 유지(Cover ⇤ / 마지막 챕터 ⇥), Single은 양쪽 모두 agenda fallback
    - 2단계 — 구현: `lib/html-builder.js` `generateHTML` Home/End 핸들러의 single 분기에서 `prevAnchorIdx < 0` / `nextAnchorIdx < 0`일 때 `window.location.href = 'agenda.html?back=1'` / `'agenda.html?fwd=1'` 분기 추가
    - 3단계 — 빌드·검증: 대표 single 프로젝트(`m2SlideStyle1_single`) 빌드 후 #/2에서 Home·`,` → agenda.html?back=1 이동 확인. 마지막 슬라이드에서 End·`.` → agenda.html?fwd=1 확인
    - 4단계 — 회귀: Chapter 프로젝트(`m2SlideStyle2_chapter`) Issue114 동작 무회귀 확인
* 검증:
    - 빌드된 `index.html` 키 핸들러 코드에 `agenda.html?back=1` / `?fwd=1` 분기 존재
    - 브라우저 수동 — single mode 첫·마지막 anchor에서 Home/End → agenda 이동
    - chapter mode 회귀 — Cover ⇤ 무동작, Cover ⇥ → agenda?fwd=1, 첫 챕터 ⇤ → agenda?back=1 유지

## Issue130. Cover instructor(author+contact) 영역 노란 테두리 (등록: 2026-05-06)
* 목적: `_cover` 레이아웃의 instructor 영역(name + contact)을 노란색 사각형 테두리로 강조하여 시각적 구분
* 상세:
    - 대상 셀렉터: `.reveal section.layout-_cover .cover-instructor`
    - default 및 default_lec 양쪽 theme `slide.css`에 적용
    - base.css는 건드리지 않음 (theme 단위 스타일로 우회)
* 카테고리: Theme
* 구현 명세:
    - `theme/default/slide.css`, `theme/default_lec/slide.css`에 `.cover-instructor` 박스 스타일 추가
    - `border: 2px solid #FFD700;` (gold/yellow), `padding: 0.4em 0.8em;`, `border-radius: 6px;`, `display: inline-block;`
    - guide-line 모드 셀렉터와 충돌 없도록 동일 영역에 추가

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

