# Issue Management
* https://github.com/Finfra/m2slide/issues
* Issue HWM: 108
* 오래된 Issue는 `z_old/old_issue.md`에 저장
* Save Point :
    - **v0.6.0 (2026-05-05)** — release: 9키 네비게이션 SSOT 정립 + 트리 탐색 의미 도입 (Issue71-106 36건). Backward 트랜지션·anchor 자식 우선·leaf fall-through 등 키 동작 정밀화 + Pandoc columns/rows 호환 + 메타데이터 SSOT 통합
    - **v0.5.0 (2026-05-03)** — release: 71건 완료 이슈 z_old 아카이브, CHANGELOG.md 신규 (Issue70까지 포함)
    
# 🤔 결정사항
## _meta.yml파일 사용 안함.
* AGENDA.md나 {프로젝트명}.md파일의 yaml front matter에 추가하기로 함. 

## img 폴더 이중 복사 유지 (소스 `img/` + 빌드 `slide/img/`)
* 결정: 현행 `fs.cpSync` 방식 유지
* 이유: `slide/` 폴더를 통째로 삭제 후 재생성하는 빌드 패턴이 잦음


# 🌱 이슈후보
1. 쳅터모드에서 페이지 번호가 해당 md마다 1부터 시작하는데, 전체 기준으로 제공되어야함. 단, md 방식에서는 breadcum방식으로 쳅터 번호를 페이지 옆에 제공해야함. 관련 설정 필요.

# 🔥 진행중

## Issue107. 슬라이드 우측 하단 네비게이션 UI 정리 [진행중] — `^/v` 버튼을 `</>` 사이에 배치 + 비활성 회색 처리 (등록: 2026-05-05)
* 카테고리: Frontend
* 목적: 현재 우측 하단 `nav-up-btn`의 "상위" 텍스트가 군더더기. ↑ 키만 노출되고 ↓ 키는 시각적 진입점이 없어 사용자가 키보드 단축키 존재를 모름. Reveal.js 기본 `</>` 사이에 `^/v` 버튼을 배치해 4방향 네비게이션을 일관되게 노출하고, 더 이상 이동할 곳이 없는 방향은 회색(disabled) 표시로 가시화.
* 상세:
    - 현재 `lib/html-builder.js:535-562` `.nav-up-btn`이 `right: 70px` 위치에 텍스트 "상위"와 함께 표시됨
    - Reveal.js 기본 `.controls`는 `.navigate-left`·`.navigate-right`만 활성화, `.navigate-up`·`.navigate-down`은 수직 슬라이드 부재로 비활성
    - `↑` 키(html-builder.js:1319) = 페이지 계층 parent 이동 / `↓` 키(html-builder.js:1345) = child 이동 (Cover→agenda, TOC→첫 anchor, anchor→자식, leaf→다음 챕터/H1)
    - 마우스 사용자가 ↓ 동작에 접근할 시각적 단서가 없음
* 구현 명세:
    - **DOM**: `nav-up-btn` 제거. Reveal `.controls` 내부 `.navigate-up`·`.navigate-down` 강제 표시 (display block, opacity로 활성/비활성)
    - **클릭 이벤트**: `.navigate-up` click → `ArrowUp` keydown 시뮬레이션 / `.navigate-down` click → `ArrowDown` keydown 시뮬레이션 (기존 keydown 핸들러 재사용)
    - **활성/비활성 판정**:
        - `^`(↑): 현재 슬라이드가 Cover면 비활성. 그 외 활성
        - `v`(↓): Single 모드의 leaf에서 다음 H1 anchor 없으면 비활성 / Chapter 모드에서 leaf이고 NEXT_CHAPTER 없으면 비활성. 그 외 활성
        - `<`/`>`: Reveal.js 기본 enabled 클래스 그대로 사용 (이미 회색 처리됨)
    - **상태 갱신**: `Reveal.on('slidechanged')` 및 `Reveal.on('ready')`에서 활성/비활성 재계산
    - **CSS**: `.controls .navigate-up`, `.controls .navigate-down`을 `.controls .navigate-left`·`.controls .navigate-right`와 동일 스타일·위치 적용. `.disabled` 또는 `[data-disabled]` 상태에서 `opacity: 0.3` (회색)
    - **검증**: `m2SlideStyle2_chapter` 프로젝트로 빌드 후 (1) Cover에서 ^ 회색 (2) leaf에서 v 활성 (3) 마지막 챕터 leaf에서 v 회색 (4) 클릭 시 키와 동일 이동 확인

# 📕 중요

# 📙 일반

# 📗 선택


# ✅ 완료

> v0.6.0 (2026-05-05) 시점 Issue71-106 36건 아카이브 → [`z_old/old_issue.md`](z_old/old_issue.md)
> v0.5.0 (2026-05-03) 시점 Issue~70 71건 아카이브 → [`z_old/old_issue.md`](z_old/old_issue.md)

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

