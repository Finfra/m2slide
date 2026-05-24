# Issue Management
* https://github.com/Finfra/m2slide/issues
* Issue HWM: 227
* 오래된 Issue는 `z_old/old_issue.md`에 저장
* Save Point :
    - **v0.7.0 (2026-05-06)** — release: `/deploy-docs` 신규 커맨드 + `_config.yml: deploy_formats` 옵션 (EPUB/PDF/PPTX 자동 빌드·배포 + 메인 인덱스 카드 다운로드 배지) + agenda 다운로드 버튼 위치 변경(우상단 헤더 → `.layout-_agenda` 우하단 absolute, 마스코트 충돌 회피). v0.6.x 시리즈(Issue71-126 + Issue127-128) 누적 z_old 아카이브.
    - **v0.5.0 (2026-05-03)** — release: 71건 완료 이슈 z_old 아카이브, CHANGELOG.md 신규 (Issue70까지 포함)
    
# 🤔 결정사항
*  _meta.yml파일 사용 안함 : AGENDA.md나 {프로젝트명}.md파일의 yaml front matter에 추가하기로 함. 
*  현재 프로젝트가 contents 생성에 치중함에 따라 m2slide모듈은 분리되어야하나 지금은 생성되는 컨텐츠와 slide생성이 밀접하고 scar부분에 한정되어 있어서 한동안 함께 진행 후 분리하고 push예정.

## img 폴더 이중 복사 유지 (소스 `img/` + 빌드 `slide/img/`)
* 결정: 현행 `fs.cpSync` 방식 유지
* 이유: `slide/` 폴더를 통째로 삭제 후 재생성하는 빌드 패턴이 잦음
* 영상등 기타 리소스 파일도 마찬가지. 

## 개별 에니메이션 지원
* 결정: 로우나 값 단위의 개별 에니메이션 기능 지원
* 이유: VideoMaker Project에서 영상 플레이시 필요.
* 진행: Issue149로 reveal.js 표준 `<!-- .element: class="..." -->` 주석 syntax 지원 추가 완료 (Pandoc `{.fragment}`와 병존)

# 🌱 이슈후보
1. 폰에는 화살표키 없음. 적용 방법 모색할 것.
2. HtmlArtEval cover 슬라이드 제목 우측 끝 빈 박스 렌더 (Issue202 등록 시 동반 발견 — word-break와 별개. `_cover.html` 변수 미치환 또는 frontmatter 빈 값 추정)

# 🚧 진행중

## Issue227. ppt2m2slide·layout-selector 산출물 슬라이드 구분자 `---` 누락 — 챕터 내 모든 H1이 1슬라이드로 병합 (등록: 2026-05-24)
* 목적: ppt2m2slide reverse-pipeline + layout-selector 단계 6 산출 `.ppt.md`에 슬라이드 구분자 `---` 단독 줄이 부재. `slide-parser.js:334` `content.split(/\n---\n/)`가 `---` 부재 시 전체를 1슬라이드로 처리 → `01-markdown.html`이 16 H1 슬라이드를 1 cover 슬라이드로 합침. agenda 진입 후 챕터 내 슬라이드 navigation 불가.
* 상세:
    - 재현: `Projects/BasicKnowledgeForAI/markdown/01-markdown.ppt.md`에 16개 `# 제목` H1 + 각각 `#layout-_contents` directive 있으나 본문 `---` 단독 줄 0개. 빌드 결과 `slide/01-markdown.html` section 카운트 2개 (toc-placeholder + 단일 cover)
    - 원인1: `lib/slide-parser.js:334` `content.split(/\n---\n/)` — `---` 단독 줄만 슬라이드 분리. H1은 분리 트리거 아님
    - 원인2: `.claude/agents/ppt2m2slide.md` Step 6-3·`layout-selector.md` 산출 단계에서 `---` 자동 삽입 의무 없음. pptx2md raw output 그대로 사용
    - 영향: ppt2m2slide로 변환한 모든 프로젝트의 챕터 .md (마크다운에 명시적 `---` 있는 sub-chapter는 정상). 13 챕터 + 17 sub-chapter 중 sub-chapter는 split_subchapters.py로 `---` 정상 삽입되어 무관
    - 사용자 보고: "다음으로 넘어가지 않는 문제" — agenda → 챕터 진입 후 → 키로 다음 슬라이드 안 감
* 구현 명세:
    - 즉시 fix: 기존 `.ppt.md` 13개 (01·02·04·06·07·08·09·10·11·13 챕터, 03/05/12는 축소·sub-chapter로 이관됨)에 H1 사이 `---` 자동 삽입 후처리. 첫 H1 (cover) 직후부터 매 H1 직전에 빈 줄 + `---` + 빈 줄 삽입
    - 영구 fix:
        - `.claude/agents/ppt2m2slide.md` Step 6-3에 "H1 단위 슬라이드 분리 시 각 H1 직전(첫 H1 제외)에 `---` 단독 줄 삽입" 룰 추가
        - `.claude/agents/layout-selector.md`에 `.ppt.md` 생성 시 동일 룰 추가
    - 검증: 재빌드 후 `01-markdown.html` section 카운트 17 (toc + 16 slides) 확인 + playwright로 navigation 동작 확인
    - 회귀 검증: 다른 정상 프로젝트(aTest 등) 빌드 결과 section 카운트 변화 없는지 확인
* 카테고리: Generator + agent (ppt2m2slide / layout-selector)

## Issue226. ESC 키 reveal.js overview 진입 실패 — m2slide custom keydown handler가 ESC intercept (등록: 2026-05-24)
* 목적: 사용자가 ESC 키를 눌렀을 때 reveal.js 표준 overview 모드 진입이 안 되고 forward navigation(`#/N` → `#/N+1`)으로 처리되는 회귀 해결. 사용자가 "여러 슬라이드 안 보임" 보고 + chrome screenshot에서 1장만 viewport 채우고 다른 sections opacity 0 적층 확인.
* 상세:
    - 재현: `Projects/aTest/slide/02-component.html#/2` 진입 후 ESC → URL #/3 변경 + `.reveal.overview` class 미부착 + 다른 sections opacity 0
    - 진단 (playwright):
        - `Reveal.toggleOverview(true)` API 호출 → 정상 grid 분산 (32 sections × 340×227 thumbnail viewport 안 분산, hasOverview=true)
        - `page.keyboard.press('Escape')` native press → hasOverview=false + hash forward navigation only
        - `Reveal.getConfig().overview === true` (활성)
        - `Reveal.getConfig().keyboard = {33:null, 34:null, 35:null, 36:null}` (PageUp/PageDown/End/Home 만 null, ESC 27은 native 그대로여야 함)
    - 즉 m2slide custom keydown handler (`lib/html-builder.js` Reveal.initialize 이후 document.addEventListener('keydown', ..., true) capture phase)가 ESC를 가로채 forward navigation으로 처리하고 reveal.js native ESC handler에 도달 안 함
    - 영향: 모든 m2slide 데크에서 ESC overview 기능 사용 불가
    - Issue215 (width number fix)는 적용되어 있어 API 호출 시 overview는 정상. 진입 경로(키 입력)만 차단됨
* 구현 명세:
    - 후보1: `lib/html-builder.js`의 keydown handler에서 ESC keyCode 27 검출 시 `Reveal.toggleOverview()` 명시 호출 + `event.preventDefault()` 후 return
    - 후보2: m2slide custom handler를 capture phase(`true`)에서 bubble phase(`false`)로 변경하여 reveal.js native handler 먼저 실행 (단 다른 키 처리 순서 영향 검토 필요)
    - 후보3: `Reveal.initialize({ keyboard: { 27: 'toggleOverview' } })` 명시 등록 — 가장 안전
    - 검증: aTest 02-component.html#/2 진입 후 ESC → `.reveal.overview` class 부착 + sections grid 분산 + 다시 ESC → 일반 모드 복귀
* 카테고리: Generator (html-builder.js keydown handler)
* 관련: Issue215 (width number fix), Issue220 (ESC overview thumbnail visibility — 본 이슈 해결 후 Issue220 재검증)
* 영속: 사용자가 본 chrome screenshot에서 작은 박스 슬라이드 1장 + 다른 슬라이드 숨김 ← ESC 후 forward navigation 결과의 fade-in/out transition 잔상으로 해석. ESC 진짜 overview 진입이면 사용자 화면은 27 thumbnails grid이어야 함

## Issue225. .ppt.md 빌드 결과 파일명 미일치 — agenda.html cross-page 링크 404 (등록: 2026-05-24)
* 목적: layout-selector가 생성한 `.ppt.md` 파생본을 빌드하면 `<base>.ppt.html`로 떨어지나 agenda.html 내 cross-page 링크는 원본 `.md` 기준(`<base>.html`)으로 작성됨. 결과적으로 agenda.html에서 다음 챕터 클릭 시 `ERR_FILE_NOT_FOUND`. BasicKnowledgeForAI (ppt2m2slide + layout-selector 출력) 빌드에서 회귀 확인.
* 상세:
    - 재현: `Projects/BasicKnowledgeForAI/slide/agenda.html` 열고 `01. MarkDown` 클릭 → `01-markdown.html?fwd=1` 요청, 실제 파일은 `01-markdown.ppt.html` → 404
    - 원인1: `lib/generate-slides.js:240` — `file.replace('.md', '.html')` 첫 `.md`만 치환. `01-markdown.ppt.md` → `01-markdown.ppt.html`
    - 원인2: `lib/generate-slides.js:326` — `orderedChapters` 매핑 동일 패턴, chapter offset 계산 오작동
    - agenda.html 링크 생성 로직은 원본 .md 파일명 기준이라 가정 (chapter mode 다른 프로젝트는 `.ppt.md` 미사용이라 미발각)
    - 영향: layout-selector 적용 + chapter mode 프로젝트 전수
* 구현 명세:
    - 수정: `lib/generate-slides.js:240,326` — `f.replace(/(\.ppt)?\.md$/, '.html')`로 `.ppt` 접미사도 함께 제거
    - 빌드 결과: `01-markdown.ppt.md` → `01-markdown.html` (원본 base 기준)
    - 검증:
        - BasicKnowledgeForAI 재빌드 + agenda.html 모든 챕터 링크 클릭 회귀 확인
        - 대표 프로젝트 회귀 검증: `m2SlideStyle1_single`(single, .ppt.md 없음), `m2SlideStyle2_chapter`(chapter, .ppt.md 없음), `aTest`(chapter, .ppt.md 없음) — 빌드 결과 파일명 변경 없는지 확인
* 카테고리: Generator + Build

## Issue223. `open-slide` 스킬 신규 — 임의 슬라이드 자동 진입 + Chrome 포커스 강제 (등록: 2026-05-24)
* 목적: 코드/콘텐츠 수정 후 특정 슬라이드(예: 08.4 #/6) 직접 검증할 때 매번 `file:///.../slide/<chapter>.html?fwd=1#/N` URL을 수작업 조립 + macOS `open` 동일 URL 재호출 시 새 탭만 추가되고 foreground 안 옴. 슬래시 커맨드 대신 **스킬**로 만들어 description 매칭 자동 트리거 → claude가 "슬라이드 X 열어줘", "검증해줘" 등 발화 시 자동 호출.
* 상세:
    - 기존 자산:
        - `apply-verify-rules.md` §4.1 — URL 규약 SSOT
        - `run.sh` / `/run` — 빌드 + 초기 진입 cover만, 슬라이드 번호 인자 없음
    - 누락: 임의 슬라이드 진입 + 자동 트리거 + Chrome 포커스 강제
    - 영향: 검증 반복 시 매번 절대경로·쿼리·hash 수작업, Chrome backgrounded
* 구현 명세:
    - 신규: `.claude/skills/open-slide/SKILL.md` (프로젝트 로컬, m2slide-specific)
        - frontmatter title `open-slide`, description: "m2slide 슬라이드 검증·재오픈 시 자동 발동. 프로젝트·챕터·슬라이드 번호로 정확한 URL 조립하여 Chrome에 포커스까지 강제. 슬라이드 N번 직접 열기, 수정 후 확인, 검증 사이클 마찰 제거"
        - 입력 형식: `{project} {chapter_prefix} {N}` (예: `aTest_v1 08.4 6`)
        - chapter prefix 매칭: `Projects/<project>/slide/<prefix>*.html` glob → 단일 매칭 검증, 다중·미발견 시 에러
        - URL 조립: `file://<abs>/Projects/<project>/slide/<resolved>.html?fwd=1#/<N>`
        - 실행:
            ```bash
            open -a "Google Chrome" --new '<URL>'
            osascript -e 'tell application "Google Chrome" to activate'
            ```
        - 옵션: `--firefox` (Firefox 강제), `--build` (open 전 `./m2slide.sh <project>`)
    - 자동 트리거 keyword (description에 명시): "슬라이드 열기", "슬라이드 확인", "verify slide", "open slide", "검증", 슬라이드 번호 형식(`08.4 #6`)
    - 책임 분리: `/run` 빌드+cover, `open-slide` 스킬 임의 진입
* 검증:
    - `aTest_v1 08.4 6` → 정확한 슬라이드 진입 + Chrome 포커스
    - prefix 모호성: `08` 입력 시 다중 매칭 검출·에러 보고
    - claude 자체 "08.5 슬라이드 보여줘" 발화 시 스킬 자동 호출 확인
* 카테고리: DX (개발자 도구) + Build (스킬 wrapper)
* 관련: `/run` 커맨드, `apply-verify-rules.md` §4.1

## Issue220. ESC overview 진입 시 thumbnail content 시각적 비표시 — Issue215 잔존 회귀 (등록: 2026-05-24)
* 목적: Issue215 fix(commit e63c1b3, width/height number 전달) 이후 ESC overview 진입 시 sections 좌표·grid spacing은 정상이나 화면이 비어 보이는 잔존 회귀 해결.
* 상세:
    - playwright evaluate에서 sections visible:true, display:block, opacity:1, content 자식 elements 존재, viewport 안 위치 확인됨에도 screenshot에 thumbnails 미표시
    - 강제 `background: rgba(255,0,0,0.2) !important; outline: 3px solid red !important` 적용해도 안 보임 — DOM은 그려졌으나 visual layer에 paint 안 됨
    - 영향: Issue215 fix는 spacing 회귀(100배)를 해결했으나 thumbnail content가 보이지 않아 사용자 ESC overview UX 불가
* 원인 후보:
    - reveal.js overview re-layout 후 `Reveal.layout()` 호출 시점에 transform 적용이 안정되기 전 캡처 (타이밍)
    - reveal.css의 `.reveal.overview .slides section { height:100% !important }`와 우리 base.css의 `min-height:0; max-height:none !important` 잔여 충돌 (Issue215 보조 변경)
    - `.media-enlarge-height/fit .reveal .slides section.present { ... overflow:hidden }`가 .present만이라 비활성 section content가 1920×1280 그대로 그려지지만 section 자체는 scale 0.177 후 340×227 viewport, content overflow가 viewport 밖 짤림
    - z-index 또는 stacking context 충돌 (overlay 레이어)
* 구현 명세:
    - 재현: aTest 04-htmlart.html 열고 ESC → sections 좌표 정상이나 화면 빈 상태 확인
    - 후보1: `.reveal.overview .slides section`에 `overflow:hidden` + `contain: layout style` 추가하여 thumbnail box 안에만 content 그리도록 클리핑
    - 후보2: Issue215 보조 변경(`min-height:0` 등) revert 하고 reveal.css 표준 `height:100% !important`에 위임
    - 후보3: 슬라이드별 `display:flex/height:100%` 강제(`media-enlarge-*` 한정)가 overview에 미치는 영향 분리 검토
    - 검증: aTest 5개 챕터 + m2Slide·graphify ESC overview thumbnail content 시각 표시
* 카테고리: Theme (CSS) + Frontend (reveal.js overview UX)
* 관련: Issue215 (Root cause + 1차 fix), Issue109 (overflow:visible outer padding 의도)

## Issue219. htmlArt `callout` 타입 추가 — 중앙 hub + 다방향 callout arrow (등록: 2026-05-24)
* 목적: 사용자 제공 이미지 2장(중앙 hub + 방사 callout arrow + 라벨) 기반 신규 htmlArt 타입. 강의·소개 슬라이드에서 핵심 주제(중앙) + 부연·태그 그룹(방사 라벨)을 박스 없이 fan-out 으로 표현하는 패턴이 흔함. 기존 `explain`(좌·우 column 풀이)·`radial`(중심 박스+스포크 박스)·`annotate`(원문 span 주해)로는 표현 불가 — 짧은 화살표 + 다방위 자유 분산 + 라벨 색 분리(강조/태그) 패턴이 모두 부재.
* plan: (단순/중간 — plan 파일 생략)
* 상세:
    - 입력: 첫 항목 = 중앙 hub (아이콘 토큰 `:fa-*:` 또는 emoji 1자 첫 부분 자동 파싱). 나머지 = branch (작성 순서 = 배치 순서)
    - 라벨 강조: `**볼드**` branch → accent-1(primary), 일반 → accent-2(secondary)
    - 태그 그룹: 라벨 안 `|` 또는 ` / ` sep → 토큰 사이 옅은 vertical bar
    - orientation 옵션(Pandoc attribute): `{.h}`/`{.horizontal}`(기본, 가로 stem) · `{.v}`/`{.vertical}`(세로) · `{.fan}`(이미지 2 형태, 상반원 부채꼴)
    - 권장 branch 수: 2-6
    - graceful degradation: JS 미동작 시 `<ul>` 그대로 노출 (다른 htmlArt 타입과 동일)
    - 참고 명세: `_doc_work/refs/htmlart-callout-reference.md` (이미지 2장 구조·시각 SSOT)
* 구현 명세:
    - `lib/markdown.js`: `HTMLART_TYPES` Set에 `callout` 추가
    - `data/htmlart/types.yml`: tier `v7` 신규 또는 ext 추가. signal_ko `["중앙 주제", "방사 라벨", "콜아웃", "주제+태그"]`, signal_en `["callout", "annotation hub"]`. decision_table에 specific 위치 등재
    - `lib/component-hooks/htmlart_dispatch.client.js`: `renderCallout(el)` 추가 + dispatch case 매핑
        - 입력 파싱: 첫 항목에서 `:fa-([\w-]+):` 토큰 분리 → icon slot, 나머지 텍스트 = title
        - `**bold**` 감지 → accent-1 class, 미감지 → accent-2
        - orientation 클래스(`data-orientation`)에 따라 분산 좌표 계산
        - branch path: hub edge → 짧은 stem(stub) → arrow head, 끝에 박스 없는 텍스트
        - 태그 sep(`|` 또는 ` / `) → `<span class="ha-tag-sep">|</span>` 삽입
    - `lib/__tests__/markdown.test.js`: callout 케이스 추가 (24종 → 25종 갱신)
    - `_doc_arch/htmlArt.md`: v7 섹션 추가, 타입 25종 표·통계·카테고리 매핑 갱신
    - `Projects/htmlArtTest/htmlArtTest.md` 또는 신규 슬라이드: callout 데모 3종 (horizontal·fan·vertical)
* 검증:
    - `node --test lib/__tests__/markdown.test.js`
    - `./m2slide.sh htmlArtTest` 빌드 + Firefox 검증
* 카테고리: Frontend + Generator
* 후속: ppt2m2slide(Issue214) SmartArt 매핑에 PowerPoint "Callout"/"Radial Callout" → `callout` 추가

## Issue218. htmlArt `bend_process` 타입 추가 — N단계 줄바꿈 serpentine 흐름 (등록: 2026-05-24)
* 목적: PowerPoint SmartArt "Bending Process"(휘어지는 프로세스) 대응. 단계 수가 많아 한 줄에 다 못 담길 때 행 끝에서 곡선으로 다음 줄로 꺾어 역방향으로 이어지는 N단계 흐름. 기존 `process`(가로 직선 1행)·`step`(계단)·`workflow`(사람+박스)로 표현 불가. 강의·튜토리얼 PPT에 흔히 등장(7단계 작업 사이클, 학습 로드맵 등)하므로 ppt2m2slide(Issue214) 매핑 후보로도 필수.
* 상세:
    - 입력: 평면 리스트 — 최상위 항목 = 단계, 작성 순서 = 진행 순서
    - sublevel: 하위 들여쓰기 = 단계 라벨/보조 설명 (예: "스킬, GEM, GPTS", "대화로 진행", "가장 오래 걸림")
    - visual: 번호 원(circle) + 라벨, 행 끝에서 곡선으로 다음 줄, 역방향 진행 (serpentine)
    - 권장 단계 수: 4-12 (3 이하면 `process` 권장, 13 이상이면 `timeline` 권장)
    - 옵션: 단계 비활성(회색) 표시 — 작성 시 별도 디렉티브 또는 prefix(`~~`)로 표시 검토
    - 단계 간 transition 라벨(보조 설명) 지원 — sublevel 첫 줄을 라벨로, 나머지를 단계 본문으로 분리하는 방식 검토
    - 참고 이미지: `_doc_work/capture/issue218/` (7단계 + 5단계 샘플)
* 구현 명세:
    - 신규: `data/htmlart/types.yml`에 `bend_process` 항목 추가 (tier: v3 또는 v6 워크플로와 동일 tier)
        - smartart_category: process
        - signal 추가: signal_kr `["휘어지는 프로세스", "꺾이는 흐름", "여러 줄 단계", "serpentine"]`, signal_en `["bending process", "serpentine", "wrap process", "multi-row steps"]`
        - matcher: `process` 보다 우선순위 낮게(특정 signal 명시 시만 발동). 미명시 + 단계 수 ≥ 7이면 자동 추천 검토
    - 신규: `data/htmlart/smartart-catalog.yml` 매핑에 PowerPoint "Bending Process" → `bend_process` 추가
    - 신규: `lib/component-hooks/htmlart_dispatch.js` (또는 htmlart 렌더 모듈)에 `bend_process` 케이스 — d3 기반:
        - 컨테이너 폭 기준 한 행 단계 수(N_per_row) 자동 계산 (단계 박스 최소 폭 기준)
        - 행별 좌→우, 우→좌 교대 배치
        - 행 끝에서 `d3.path().arcTo()` 또는 cubic-bezier로 곡선 연결
        - 비활성 단계(회색) 옵션 처리
        - 사이 라벨 텍스트 배치 (라인 위)
    - 신규: 테스트 프로젝트 `Projects/htmlartTest`(또는 기존)에 bend_process 샘플 슬라이드 추가
    - 수정: `_doc_arch/htmlart.md` 또는 관련 설계 문서에 bend_process 항목 추가
    - 미수정: 기존 htmlart 타입 렌더 로직
* 카테고리: Frontend + Generator (htmlart 카탈로그 확장)
* 후속: Issue214 ppt2m2slide의 SmartArt 매핑 카탈로그가 본 타입을 자동 활용

## Issue217. ppt2m2slide chapter 검출 H1-only 한계 + agenda 확정 전 사용자 컨펌 의무화 (등록: 2026-05-24)
* 목적: `ppt2m2slide`가 pptx2md 산출물의 챕터 구조를 H1(`#`) 카운트만으로 판정하여, pptx2md가 챕터·슬라이드 제목을 모두 H2(`##`)로 변환하는 일반 케이스에서 chapter mode 진입 실패. `Projects/BasicKnowledgeForAI`(202장, 13개 `## 부록N` 챕터)가 single mode로 떨어져 2720줄 단일 .md 생성. 다중 챕터 PPT는 거의 모두 동일 문제 재발 예상. mode 자동 판정 + 사용자 컨펌 없는 통과를 차단.
* 상세:
    - 원인1: `data/ppt2m2slide/heuristics.yml mode_decision.chapter.require_h1_count: 2` 만 본다. H2 numbered prefix(`부록N`, `Chapter N`, `Part N`, `N.`, `섹션N`) 미검출
    - 원인2: `.claude/agents/ppt2m2slide.md` Step 6 — mode 자동 판정 결과를 사용자에게 보여주지 않고 그대로 산출물 생성. 체크포인트 2는 매핑 검토만, mode 변경 기회 없음
    - 원인3: `.claude/agents/agenda-designer.md` 동일 — single↔chapter 판정 모호 시 사용자 컨펌 미강제
    - 영향: 본 변환 시 BasicKnowledgeForAI 같이 다중 챕터 자료가 single mode로 전락 → 사용자가 수동 분할 필요 (회피 비용 큼)
* 구현 명세:
    - 수정: `data/ppt2m2slide/heuristics.yml`
        - `mode_decision`에 `chapter_marker_patterns` 추가 (H2 numbered prefix regex 목록: `^##\s+(부록|챕터|Chapter|Part|Section|섹션)\s*\d+`, `^##\s+\d+\.\s+\S+` 등)
        - chapter 후보 카운트: H1 카운트 + chapter_marker_patterns 매칭 H2 카운트
        - `checkpoint_messages.step6_mode` 신규 — mode 자동 판정 + 검출 boundary 목록을 표시·컨펌
    - 수정: `.claude/agents/ppt2m2slide.md` Step 6
        - mode 자동 판정 직후 `AskUserQuestion` 무조건 호출 (chapter list 미리보기 + single/chapter 선택)
        - `--no-checkpoint` 플래그도 mode 컨펌만은 우회 금지 (산출물 구조 결정은 사용자만)
    - 수정: `.claude/agents/agenda-designer.md`
        - 동일 패턴 — 모호 시 detected boundary list 표시 + 사용자 컨펌
    - 신규: `data/agenda-designer/patterns.yml`에 `chapter_marker_patterns` 항목 추가 (ppt2m2slide와 공유)
    - 재처리: `Projects/BasicKnowledgeForAI`를 chapter mode로 재변환 (별도 ops 작업, 본 이슈 후속)
* 카테고리: Generator (agent 데이터-주도)
* 후속: Issue214 (ppt2m2slide 본 변환 — 본 이슈 완료 후 진행)

## Issue214. ppt2m2slide 에이전트 설계 — 기존 PPT를 m2slide 프로젝트로 역변환 (등록: 2026-05-24)
* 목적: m2slide가 미완성이라 그동안 m2slide → PPT export → PPT 수정 → 발표 워크플로우로 작업했음. PPT 수정분이 m2slide로 환류되지 않아 매번 같은 PPT 작업을 반복. 기존 PPT(.pptx)를 m2slide 프로젝트(`Projects/<Name>/`)로 역변환하는 agent를 신설하여 PPT 자산을 m2slide 카탈로그로 흡수. 여러 PPT 변환 누적 시 m2slide 카탈로그가 풍부해져 발표 가능 임계점에 빠르게 도달.
* depends: Issue217
* plan: `_doc_work/plan/ppt2m2slide_plan.md`
* task: `_doc_work/tasks/ppt2m2slide_task.md`
* 상세:
    - PPT 슬라이드 → markdown 슬라이드(`---` 구분자) 변환
    - PPT layout → m2slide layout 매핑 (`#layout-*` 디렉티브)
    - PPT SmartArt → m2slide htmlart 변환 시도. 매핑 실패 시 `data/_proposals/`로 신규 type 후보 분리
    - PPT 차트/임베디드 미디어 → m2slide component (chart/model3d/video) 또는 img/ 자산
    - PPT theme 색상 → palette 매칭. 실패 시 `_proposals/`로 신규 팔레트 후보
    - chapter mode (AGENDA.md + 다중 .md) / single mode 자동 판정
    - 사용자 검토 체크포인트 3개 (메타 수집 후 / 매핑 후 / 빌드 직전)
* 구현 명세:
    - 신규: `.claude/agents/ppt2m2slide.md` (info-filler/agenda-designer 데이터-주도 패턴 차용, model: opus, tools: Read/Write/Edit/Bash/Glob)
    - 신규: `data/ppt2m2slide/{heuristics,mappings}.yml` 외부화 카탈로그
    - 신규: `_doc_arch/ppt2m2slide.md` 영속 설계 SSOT (Mermaid 흐름도)
    - 신규: `.claude/commands/ppt2m2slide.md` 슬래시 진입점 (`/ppt2m2slide <pptx> [name] [--mode] [--no-checkpoint]`)
    - 수정: `_doc_arch/authoring-pipeline.md` reverse-pipeline 한 줄 추가
    - 미수정: `lib/generate-slides.js` 등 빌드 파이프라인, 기존 카탈로그 (`data/htmlart/types.yml` 등)
    - 책임 분리: pptx2md 글로벌 스킬은 raw 추출만, m2slide 의미론 매핑은 ppt2m2slide 단독
    - 자동 머지 금지: `_proposals/` 산출물은 항상 사용자 승인 후 수동 머지
* 카테고리: Generator + Project + Build

# 📕 중요

# 📙 일반

# ✅ 완료

## Issue221. htmlArt nodeBox 영문 long token clip — width cap + overflow-wrap fallback (등록: 2026-05-24, 해결: 2026-05-24, commit: 1430cc0) ✅
* 목적: aTest_v1 08.4 workflow 슬라이드의 "Gemini · NotebookLM"·"Claude In PPT" 박스에서 단일 영문 토큰(`NotebookLM`)이 박스 폭(196px)을 초과하여 좌우 clip 발생. 카드 텍스트 잘림 회귀 해결.
* Root cause:
    - 재현: `Projects/aTest_v1/slide/08.4.ratio-compare-explain.html#/6`
    - `nodeBox`의 titleFs = `min(h*0.30, w*0.21, 44)` → 41px. `word-break:keep-all`로 영문 단일 단어가 분리되지 않아 41px × "NotebookLM"(10자) ≈ 250px > 196px 박스에서 overflow:hidden으로 잘림
    - 영향 범위: workflow 외 cycle/hierarchy/process/cards 등 nodeBox 사용 모든 htmlArt 타입에서 동일 회귀 가능
* 변경 (lib/component-hooks/htmlart_dispatch.client.js):
    - `longestTokenLen(s)` 헬퍼 추가 — 공백·`·`·`•`·`-`·`_`·`/`·`|`로 split하여 최장 토큰 글자 수 반환
    - title width cap: `floor(innerW / (titleTokLen * 0.58))` (0.58em ≈ 영문 sans avg glyph), `titleFs = min(기존, widthCap)`, floor 10px
    - subs도 동일 cap 적용 (긴 단일 단어 보호)
    - title/subs 양쪽 div에 `overflow-wrap:anywhere` 추가 — keep-all 유지하면서 long token만 fallback break
* 동시 적용 (same commit 1430cc0):
    - `htmlart_dispatch.js`의 1311줄 client script template literal을 `htmlart_dispatch.client.js` 별도 파일로 분리 + `fs.readFileSync` raw 로드 패턴 — Issue222 fix(`↻` literal)의 인프라 기반
    - Issue222 동시 종결 (commit 묶음 분리 불가)
* 검증: `./m2slide.sh aTest_v1` 빌드 OK, 08.4 #/6 박스 안 텍스트 clip 사라짐, 폰트 자동 축소됨
* 카테고리: Frontend (htmlart dispatch) + Generator (nodeBox 공통 헬퍼)
* 관련: Issue200/201/205 (nodeBox font sizing 히스토리), Issue222 (같은 commit)

## Issue222. htmlArt cycle 중앙 ↻ 심볼 더블 이스케이프 회귀 — `↻` 6글자 텍스트로 출력 (등록: 2026-05-24, 해결: 2026-05-24, commit: 1430cc0) ✅
* 목적: cycle 도해 중앙에 회전 심볼(↻, U+21BB)이 표시되어야 하나 `↻` 6글자 raw 텍스트가 출력되어 슬라이드를 가리는 시각 회귀. `Projects/aTest_v1/slide/08.1.basic-chain.html?fwd=1#/3`에서 큰 회색 "↻" 텍스트 노출 확인.
* Root cause:
    - `lib/component-hooks/htmlart_dispatch.client.js:139` — `.text('\\u21BB')` 더블 이스케이프
    - `htmlart_dispatch.js`가 fs.readFileSync로 .client.js를 raw 로드하므로 JavaScript escape는 1회면 충분. 그러나 코드는 `\\u21BB`로 작성되어 실제 문자열이 역슬래시 + u21BB 6글자가 됨. SVG text 노드에 그대로 fill되어 화면 표시
    - 영향: cycle 타입을 사용하는 모든 슬라이드 회귀 (aTest_v1 08.1·08.2·08.3·08.4·08.5, htmlArtTest 등)
* 변경:
    - `.text('\\u21BB')` → `.text('↻')` literal로 변경 (raw 로드 환경에서 escape strip 회피)
* 동시 적용 (same commit 1430cc0):
    - `.js`/`.client.js` 분리 리팩터링 + Issue221 fix(longestTokenLen + overflow-wrap)
* 검증: cycle 슬라이드 중앙에 ↻ 정상 표시, raw `↻` 텍스트 사라짐
* 카테고리: Frontend (htmlart 렌더 회귀)
* 관련: Issue221 (같은 commit)

## Issue224. `::: cards` 다수 카드 슬라이드 overflow clip — px 고정값 em 전환 (등록: 2026-05-24, 해결: 2026-05-24, commit: ea777cb, b14f748, 05d25ff, 502015f) ✅
* 목적: 카드 개수가 많은 슬라이드에서 카드 그리드가 슬라이드 세로 영역을 초과하여 하단이 잘리는 회귀. font_size_auto가 `.theContents` 폰트를 줄여 overflow를 잡으려 하나 카드 박스 크기·간격이 px 고정이라 폰트만 줄어들고 카드 행 높이·열 폭은 그대로 유지되어 잘림이 해소되지 않음. `Projects/aTest/slide/02-component.html?fwd=1#/8` (6 cards 블록) 등에서 재현.
* Root cause:
    - `theme/_shared/components.css` §카드 컴포넌트(line 89~178)의 5종 px 고정값(`minmax(180px,1fr)`·`gap 10px`·title `padding 7px 14px`·본문 `padding 8px 13px`·중첩 ul `padding 2px`·`border-radius 10px`·`box-shadow 0 2px 6px`)이 폰트 비례 축소되지 않음
    - `lib/html-builder.js:1274` overflow 감지 후 `.theContents` font-size를 이진 탐색으로 fontSizeMin(20px)까지 줄여도 카드 박스 크기는 그대로 → 행 수·박스 높이 불변 → 잘림 해소 실패
* 변경:
    - `theme/_shared/components.css`: 카드 관련 px 값 전체 em 기반 전환
        - `minmax(180px, 1fr)` → `minmax(8em, 1fr)` (line 94)
        - `gap: 10px` → `gap: 0.5em` (line 95)
        - 제목 padding `7px 14px` → `0.35em 0.7em` (line 118)
        - 본문 padding `8px 13px` → `0.4em 0.65em` (line 130)
        - 중첩 ul padding `2px 0 2px 1.4em` → `0.1em 0 0.1em 1.4em` (line 134)
        - 카드 li `border-radius: 10px` → `0.5em` + `box-shadow 0 2px 6px` → `0 0.1em 0.3em` (line 108, 110)
        - title-only `.rows` strong `border-radius: 10px` → `0.5em` + `box-shadow 0 2px 6px` → `0 0.1em 0.3em` (line 177-178)
* 검증:
    - `./m2slide.sh aTest` 빌드 OK (108 slides), `./m2slide.sh aTest_v1` 빌드 OK
    - built CSS `Projects/aTest/slide/css/custom.css:116` `minmax(8em, 1fr)` 반영 확인
    - 브라우저: `Projects/aTest/slide/02-component.html?fwd=1#/8` (6 cards 블록) 자동 오픈, font_size_auto 트리거 시 카드 비례 축소되어 잘림 해소
    - 회귀 점검: 카드 적은 슬라이드(1~3개)는 폰트 축소 미트리거 → 시각 변화 거의 없음 (border-radius·box-shadow 미세 차이만)
* 보강 (b14f748): 1차 fix만으로는 카드 28개(htmlArtTest #/2, 4×7) 케이스가 잘림 잔존 — font_size_auto가 fontSizeMin 20px 한계 도달해도 카드 영역 빠듯
    - `.m2-cards` 컨테이너에 `font-size: 0.92em` 추가 (`.theContents` 축소와 합산)
    - `minmax(8em, 1fr)` → `minmax(6.5em, 1fr)` (더 narrow 카드 → 같은 폭에 더 많은 열 fit → 행 수 감소)
    - `gap 0.5em` → `0.35em`, `margin 0.25em` → `0.2em` (간격 압축)
    - 제목 padding `0.35em 0.7em` → `0.25em 0.6em`, `line-height: 1.3` 명시
    - 본문 padding `0.4em 0.65em` → `0.3em 0.55em`
    - 제목 `font-size 1.05em` → `1em` (제목·본문 동일 비율)
* 보강 2 (05d25ff): 사용자 스크린샷 재분석 — 잘림 그리드가 `.m2-cards`가 아닌 시스템 autoToc cards (`.chapter-list--cards .chapter-card`) (`lib/css/base.css:561-573`). H2 슬라이드 수 많은 single-mode 프로젝트(htmlArtTest 28, m2Slide 20)에서 자동 cards 페이지가 viewport 초과
    - base.css 수정 가드 회피 위해 `theme/default/slide.css` + `theme/default_lec/slide.css`에 em 기반 override 추가
    - `.chapter-list--cards`: `font-size 0.9em`, `gap 0.7em`
    - `.chapter-card`: `min-width 9em`, `max-width 15em`, `padding 0.5em 0.7em`, `border-radius 0.4em`, `flex 4열 기본`
    - `.chapter-card a`: `font-size 0.92em`, `line-height 1.3`
* 보강 3 (502015f): playwright 측정으로 root cause 확정 — cards 슬라이드(`layout-_cards layout-_toc title-slide`)는 `.theContents` 컨테이너 없음 → `applyDynamicStyles` querySelectorAll length 0 → 즉시 return → font_size_auto 미적용
    - `lib/html-builder.js:1242` selector `.theContents` → `.theContents, .toc-cards` 확장
    - 동일 binary search fit 로직을 `.toc-cards`에도 적용 — 카드 폰트 자동 축소 + em 기반 카드 박스 비례 축소 동시 작동
    - 검증 (playwright http://localhost:8765/index.html?fwd=1#/2 viewport 1920x1080):
        - 전: scrollH 1187, overflow 107px, toc-cards fontSize 40px 고정
        - 후: scrollH 1080, overflow 0, toc-cards inline fontSize 35.96px (binary search fit)
* 카테고리: Theme (CSS) + Generator (JS)
* 관련: `lib/html-builder.js:1274` font_size_auto binary search, Issue203 (title-only rows), `_doc_arch/component-slide.md` Core 계열

## Issue215. ESC overview 모드 슬라이드 1개만 표시 회귀 — width/height 문자열 전달로 spacing 100배 비정상 (등록: 2026-05-24, 해결: 2026-05-24, commit: df96409, e63c1b3) ✅
* 목적: ESC 키로 overview 모드 진입 시 챕터 슬라이드 27장이 모두 같은 좌표에 겹쳐 1장처럼 보임. aTest 04-htmlart.html에서 재현. reveal.js overview 그리드 정상 표시 복구.
* Root cause (1차 commit 후 잔존 회귀를 playwright 실제 ESC 검증으로 발견):
    - `lib/html-builder.js:1099-1100` chapter Reveal.initialize에서 `width: '${revealWidth}'` 무조건 인용 → number 1920이 문자열 "1920"으로 reveal.js에 전달
    - reveal.js Overview 코드 `overviewSlideWidth = i.width + e` (e=70)가 문자열 concat `"1920" + 70 = "192070"` 픽셀이 되어 grid spacing 정상의 100배
    - 결과: 27 sections이 viewport 폭의 100배 간격으로 배치되어 화면에 1장도 보이지 않음
    - 1차 추정(Issue109 overflow:visible + theme min-height:100%)은 원인의 일부지만 spacing 100배가 진짜 회귀 원인
* 변경:
    - `lib/html-builder.js` (e63c1b3): cover Reveal.initialize(L2261-2262)의 `${typeof X === 'number' ? X : "'X'"}` 패턴 동일 적용 — ratio-3-2/16-9는 number 그대로, ratio-fill만 `'100%'` 인용
    - `lib/css/base.css` (df96409): `.reveal.overview` 한정 `overflow: hidden`, `min-height: 0`, `max-height: none` 추가 (보조적 보호) + `media-enlarge-height/fit` 전역 `display:flex !important`를 `section.present` 한정으로 좁힘 (cross-page 잔상 동반 발견)
* 검증:
    - playwright `Reveal.configure({width:1920, height:1280})` 강제 후 toggleOverview → spacing 정상 352px (= (1920+70) × scale 0.177), 27 sections viewport 안 grid 분산
    - rebuild 후 aTest/m2Slide/graphify/LlmAndVibeCoding HTML 산출물 `width: 1920,` (인용 없음) 확인
    - overview OFF 시 `.slides`·`.reveal`·`body` overflow `visible` 유지(Issue109 outer padding 가시화 의도 보존)
* 잔존 — 별 이슈 후보: rebuild 후 ESC 진입 시 sections 좌표는 정상이나 thumbnail content가 시각적으로 보이지 않음 (강제 background 적용해도 안 보임). reveal.js의 overview re-layout 타이밍 또는 우리 CSS의 section 자체 가시 영역 제한 가능성. 별 이슈로 분리하여 추가 조사 예정
* 가드 준수: `base.css` 수정 가드 — `display`·`height`·`position`·`transform` 금지 속성 미변경 (overflow + min/max-height만 조정, overview 한정 셀렉터)
* 카테고리: Generator + Theme (html-builder.js + CSS)

## Issue216. p5.js 슬라이드 진입 시 캔버스 크기 깨짐 — `renderAll`이 비활성 슬라이드까지 사전 렌더 (등록: 2026-05-24, 해결: 2026-05-24, commit: 3db86ef) ✅
* 목적: `p5` 컴포넌트가 포함된 슬라이드를 네비게이션으로 진입하면 캔버스가 가로 막대·세로 막대·정사각 등 비정상 크기로 표시됨. 해당 슬라이드 URL(`#/14`)로 새로고침하면 정상. p5 캔버스 내부 픽셀 크기를 슬라이드가 실제로 가시화된 시점의 컨테이너 크기로 결정하도록 디스패처 초기화 시점을 lazy로 전환.
* 변경:
    - `lib/component-hooks/p5_dispatch.js` `renderAll()` 함수 제거 — 비활성 슬라이드(display:none/off-screen) 사전 렌더 시 `el.clientWidth/clientHeight` 가 0/부정확값 반환 → `p.createCanvas(0,0)` 으로 캔버스 내부 픽셀 크기가 잘못 고정되던 문제 차단
    - `Reveal.on('ready')` 핸들러: 현재 슬라이드(`Reveal.getCurrentSlide()`)의 `p5` 컴포넌트만 즉시 `renderP5`. 나머지는 `resumeSlide` 진입 시 lazy render (기존 `if (!el.dataset.rendered) renderP5(el);` 활용)
    - `resumeSlide`: `fitContainer` + `applyCanvasFit` 이후 `inst.resizeCanvas(el.clientWidth, el.clientHeight)` 추가 — 고정 픽셀 `createCanvas(600, 320)` 패턴 + 컨테이너 크기 변동 동기화 (방어적)
    - 검증: `aTest_v1/14-simulation.html` 직접 open + ←/→ 네비게이션 진입 두 경로 모두 정상 비율
* 부수 효과: 첫 로드 시 비활성 슬라이드 p5 인스턴스 생성 비용 사라짐 (CPU 절약)
* 카테고리: Generator (component-hook)

## Issue209. htmlArt `workflow` 타입 추가 — 사람 endcap + 단계 박스 체인 (등록: 2026-05-24, 해결: 2026-05-24, commit: 71c382b) ✅
* 목적: "기획구상 → ... → 결과문서" 형태의 워크플로 패턴을 htmlArt 표준 타입으로 추가. 양 끝에 사람(역할·페르소나) endcap이 있고 중간에 N개의 단계 박스가 배치되는 시각 구조. 기존 `process`는 박스 체인만 표현하고 endcap·페르소나 강조 불가.
* 변경:
    - `lib/markdown.js` HTMLART_TYPES에 `workflow` 추가 (24종) + 주석 갱신
    - `data/htmlart/types.yml` `workflow` 항목(tier v6, smartart_category process) + `decision_table` `workflow` 신호 등록 (`process`보다 위) + `type_whitelist`/`min_nodes` 갱신 + type_count 23→24
    - `lib/component-hooks/htmlart_dispatch.js` `renderWorkflow` d3 SVG 핸들러 — N>=2 시 좌 사람 endcap, N>=3 시 우 사람 endcap, 중간은 표준 박스(nodeBox 재사용) + 화살표. 사람 SVG = 머리 원 + 라운드 사각 몸, 색은 `--htmlart-accent` 상속
    - `lib/__tests__/markdown.test.js` 23→24 화이트리스트 + workflow 신규 케이스 (52 tests 전체 pass)
    - `Projects/aTest/markdown/04-htmlart.md` 카탈로그 도입부 23→24 + workflow 데모 슬라이드(compare↔explain 사이, #/25)
* 단순화 사항: 본 1차 구현은 `{person}`·`{group}`·`{tool}` 메타 파싱 미적용 — 첫·마지막 항목 자동 endcap 규칙으로 대체. 메타 토큰 + 그룹 캡션은 후속 이슈 후보
* 카테고리: Generator + Asset

## Issue208. htmlArt `compare` 타입 추가 — 2분할 좌우 비교 (등록: 2026-05-24, 해결: 2026-05-24, commit: 83dfe2a, 71c382b) ✅
* 목적: 좌우 동등 병렬로 두 영역을 대비하는 슬라이드 패턴을 htmlArt 표준 타입으로 추가. 21종 중 의미·시각이 모두 맞는 타입 없음 — `balance`(시소·무게), `bracket`(그룹 적층), `matrix`(2×2), `venn`(교집합) 모두 불일치. SmartArt 원본 카탈로그의 "Opposing Arrows", "Counterbalance Arrows", "Opposing Ideas" 매핑.
* 변경:
    - 신규 타입 `compare` (tier v5, smartart_category relationship) — Issue211 작업분(commit 83dfe2a) 동반 흡수 구현
    - `data/htmlart/types.yml` `compare` 항목 + `decision_table` 신호(`balance`보다 위, "좌우 비교/대립/vs/이분법" 키워드)
    - `lib/markdown.js` HTMLART_TYPES에 `compare` 등재
    - `lib/component-hooks/htmlart_dispatch.js` `renderCompare` — 라벨 `**헤드라인** / 부제` 파싱 + 순수 HTML grid 2열(중앙 구분선 + 좌·우 컬럼) — d3 SVG 불필요
    - `lib/__tests__/markdown.test.js` `v5 compare` 케이스 (2그룹 라벨·부제·bullet 변환 검증)
    - `Projects/aTest/markdown/04-htmlart.md` compare 데모 슬라이드 (도구의 영역 vs 사고의 영역)
* balance vs compare 경계: balance = 무게·기울기 비대칭, compare = 동등 병렬
* 카테고리: Generator + Asset

## Issue213. _contents body video·img 풀폭 표시 — media-container fit 규칙 확장 (등록: 2026-05-24, 해결: 2026-05-24, commit: 7724ccc) ✅
* 목적: H2 제목이 있는 슬라이드(`_contents` layout)에 마크다운 `![](./video/*.mp4)` 또는 `![](./img/*.png)`을 단독 배치할 때 video/img가 자연 크기(예: 320x240)로 작게 표시되어 빈 슬라이드처럼 보이는 문제 해결. 제목 없는 미디어 단독 슬라이드는 `_blank--full-video` 자동 감지가 처리하지만 제목 보존하고 풀폭 표현이 필요한 경우 우회 수단이 없었음.
* 상세:
    - 원인 = `theme/default/slide.css`의 media-container fit 규칙이 `.mermaid svg`·`.media-container svg`만 100%/100% + object-fit: contain 적용. video·img는 자연 크기 유지
    - `_contents` body는 이미 `display: flex; flex-direction: column` + `.media-container { flex: 1 1 0 }`로 잔여 영역 100% 확보된 상태 — 자식 video/img만 fit 규칙 누락
    - aTest 01-layout.md `## 동영상 단독 슬라이드`(#/16) 사례에서 발견. video가 슬라이드 중앙에 320×240으로 표시되어 빈 영역 다대
* 구현 명세:
    - `theme/default/slide.css:347-356`: SVG fit 규칙 셀렉터 그룹에 `.reveal section[class*="layout-"] .media-container video`·`.reveal section[class*="layout-"] .media-container img` 추가. width/height 100% + max-* none + object-fit: contain
    - aTest 빌드 검증: `slide/css/custom.css` 반영 확인, `01-layout.html#/16` `_contents` layout video 풀폭 표시
* 카테고리: Theme
* 참고: 자동 감지(`_blank--full-video`)와 보완 관계 — 제목 없는 단독 미디어는 자동 감지, 제목 유지 케이스는 본 규칙으로 처리

## Issue212. model3d GLB `file://` 로딩 실패 — 빌드 타임 base64 data URI 자동 인라인 (등록: 2026-05-24, 해결: 2026-05-24, commit: 965bdc1) ✅
* 목적: Chrome 86+ `file://` 페이지 `fetch()` 차단 정책으로 model-viewer 컴포넌트가 `./img/*.glb` 로딩 실패하던 문제 해결. HTTP 서버 경유(playwright + python http.server) 시는 정상 동작하나 `open file://...` 직접 open 시 매번 "model3d: GLB 로딩 실패" 빨간 박스 표시. ComponentTest 슬라이드 1·2·9의 test-cube 3건 모두 영향.
* 상세:
    - 원인 = Chrome 86 (2020~) 보안 강화로 `file:` 오리진의 fetch·XHR 차단. `<img>`·`<link>` 등 브라우저 내장 로더는 동작하지만 model-viewer 내부 `fetch()` 호출은 차단됨
    - 우회 4범주(HTTP/인라인/타 브라우저/플래그) 검토 → **빌드 타임 GLB → base64 data URI 인라인**이 사용자 무개입 정답
    - model-viewer가 `data:model/gltf-binary;base64,...` 공식 지원 — fetch 우회 가능
    - 944 bytes GLB → base64 +33% 크기 증가 (1.3KB). HTML 110KB → 113.7KB (거의 무시)
    - 대용량 GLB 가드: `inline_max_kb` 임계 초과 시 인라인 skip + console warn → `run.sh --serve` 폴백
* 구현 명세:
    - `lib/markdown.js`: `setModel3dInlineOptions({projectDir, inlineGlb, inlineMaxKb})` setter + `inlineModel3dGlb(configText)` 함수. fenced model3d 처리 시 JSON 파싱 → src 로컬 경로(http/https/data 아님)이면 fs.readFileSync + base64 + src 치환. 외부 URL·이미 data URI·임계 초과 GLB는 무변경
    - `lib/html-builder.js`: `generateHTML()` 진입 시 setKrokiCacheDir와 동일 패턴으로 `setModel3dInlineOptions` 호출. `_cfg.model3d.inline_glb`/`inline_max_kb` 전달, projectDir = `path.dirname(outputDir)`
    - `lib/config.js`: `_config.yml model3d:` 섹션 YAML 파서 추가 (`inline_glb` boolean, `inline_max_kb` integer). animation 섹션 패턴 차용
    - `run.sh`: `--serve [--port=N]` 플래그 추가. 포트 충돌 시 +1 자동 증가(10회). `python3 -m http.server` 백그라운드 + Chrome `http://127.0.0.1:N/index.html` open. 대용량 GLB 비인라인 검증·HTTP 환경 의존 컴포넌트(폰트·CDN) 검증용
    - `_doc_work/debug_TECH.md`: `model3d GLB file:// 로딩 실패` 섹션 신규 추가 (핵심 레이어·triage·사례 박제·빠른 명령어)
    - ComponentTest 빌드 검증: data URI 3건 인라인 + 잔존 src 참조 0건 + HTML 113.7KB
* 카테고리: Generator + Build
* 참고: `_doc_work/z_htm/claude-htm-1779591365.html` (원인 분석), `_doc_work/z_htm/claude-htm-1779591598.html` (해결 방법 비교), `_doc_work/z_htm/claude-htm-ask-1779591782.html` (사용자 결정)

## Issue211. htmlArt `explain` 타입 추가 — 중앙 명제 + 사방 풀이 phrase (등록: 2026-05-24, 해결: 2026-05-24, commit: 83dfe2a) ✅
* 목적: "하나의 핵심 명제를 여러 관점·풀이 문장으로 풀어 설명"하는 슬라이드 패턴을 htmlArt 표준 타입으로 추가. 중앙 큰 강조 명제 + 사방 풀이 phrase + elbow line. 기존 `radial`(중심 허브 + 스포크 박스 노드)과 시각 유사하나 의도·표현 분리:
    - `radial` = 중심 개념 + 관련 요소들의 "방사 관계" (균질 박스 노드)
    - `explain` = 한 명제의 "다관점 풀이/정의 확장" (박스 없는 풀이 phrase + 가는 라인)
* 변경:
    - `data/htmlart/types.yml` — `explain` 항목 (tier v5, smartart_category `relationship`) + `decision_table` 신호 (`radial`보다 위) + `type_whitelist` + `min_nodes: 2` + type_count 22→23
    - `lib/markdown.js` — `HTMLART_TYPES` 에 `explain` 추가 (화이트리스트, 23종)
    - `lib/component-hooks/htmlart_dispatch.js` — `renderExplain` d3 SVG 핸들러 (`d3.pointRadial` 원형 좌표 + elbow line + foreignObject 텍스트, 박스 없음)
    - `theme/_shared/components.css` — `.htmlart-explain` 스타일 + 3 CSS 변수(`--htmlart-explain-center-fg`/`-leaf-fg`/`-line`)
    - `Projects/htmlArtTest/htmlArtTest.md` — explain 예제 슬라이드 1장 + 도입부 타입수 21→23 갱신 + version 0.3.0→0.3.1
    - `lib/__tests__/markdown.test.js` — 22→23종 화이트리스트 테스트 + explain 신규 케이스 (51 tests 전체 pass)
* 카테고리: Generator + Asset
* 참고: `_doc_work/z_htm/claude-htm-ask-1779589823.html` (제안 검토 결과)

## Issue210. 컬러 팔레트 시스템 — theme variant + htmlArt 객체 단위 컬러 override (등록: 2026-05-24, 해결: 2026-05-24, commit: 83dfe2a) ✅
* 목적: PowerPoint Office Theme 대응 — theme별 N색 팔레트(`Accent 1-6 + Text/Bg + Surface`) 도입으로 (1) `_config.yml palette:` 키로 theme 컬러 variant 교체, (2) htmlArt 블록 단위 `{.palette-X}`/`{.accent-N}` override. pie 슬라이드 teal 톤 하드코딩 동반 정리.
* plan: `_doc_work/plan/color-palette_plan.md`
* task: `_doc_work/tasks/color-palette_task.md`
* arch: `_doc_arch/color-palette.md`
* 상세:
    - 신규 CSS 변수 9 슬롯: `--m2-accent-1`~`--m2-accent-6` + `--m2-text` + `--m2-bg` + `--m2-surface`
    - 호환: `--kn-accent` = `var(--m2-accent-1)` alias로 회귀 0 보증
    - 신규 카탈로그: `data/palettes/catalog.yml` (default/warm/cool/mono 4종 기본)
    - 신규 파일: `theme/{default,default_lec}/palettes/{default,warm,cool,mono}.css` 8개
    - `_config.yml` 신규 키: `palette: <name>` (기본 `default`)
    - 블록 단위: `::: htmlart pie {.palette-cool}` 또는 `{.accent-3}` Pandoc attribute syntax
    - 색 자동 순환 정책 (D4 표): 균질형(pie·cycle·gear·matrix·venn) Accent 순환, 순차형 단색+opacity, 중심형 2색
* 구현:
    - Phase 1 (SSOT·데이터): `_doc_arch/color-palette.md` + `data/palettes/catalog.yml`
    - Phase 2 (CSS 인프라): `lib/css/base.css` 변수 + `theme/_shared/components.css` `--htmlart-accent` 매핑 변경 + `[data-palette=X]` selector + `theme/{default,default_lec}/palettes/*.css` 8개
    - Phase 3 (빌드): `lib/config.js` `palette` 키 + `lib/html-builder.js` palette CSS inline 주입 (3 페이지 템플릿)
    - Phase 4 (htmlArt override): `lib/markdown.js` `::: htmlart` attribute 파싱 (`{.palette-X .accent-N}`) + `lib/component-hooks/htmlart_dispatch.js` pie 하드코딩 제거 + `sliceColor(i)` 6 순환 + 범례 패널 항상 표시(panelW=320)
    - Phase 6 (데모): `Projects/paletteTest` 신규 (9 슬라이드) + `.claude/rules/md-m2slide-rules.md` §8 컬러 섹션
    - 검증: 164 tests pass + 4 팔레트 inline override 확인 (warm `#E74C3C` / cool `#3498DB` / mono `#2C3E50`) + Chrome 시각 검증
* 후속 이슈 후보: Phase 4.5 (theme PNG/hex 하드코딩 마이그레이션), Phase 5 (슬라이드 단위 `#palette-X` 메타), 균질형 cycle/gear/matrix/venn 색 정책 점진 적용

## Issue207. Simulation View(p5.js) 컴포넌트 추가 (등록: 2026-05-24, 해결: 2026-05-24, commit: 4e75e96, cf8b76e, e42ae02, 4752f0a, 00b5435, fc0262a, 9e5c957) ✅
* 목적: 슬라이드에 인터랙티브 시뮬레이션(자율 움직임·마우스 반응·입자 시스템)을 작성할 수 있도록 p5.js 컴포넌트 추가. component-slide-visual.md 119행 "Simulation View ❌ 적용 예정(1순위)" 해소
* plan: `_doc_work/plan/simulation-p5_plan.md`
* 카테고리: Generator + Frontend + Asset
* 구현:
    - `data/component-libraries.yml` 에 p5 엔트리 등재 (conditional CDN + p5_dispatch 훅, p5@1.11.2)
    - `lib/component-hooks/p5_dispatch.js` 신규 — instance mode + slidechanged noLoop()/loop() 일시정지·재개
    - `lib/component-hooks/p5_dispatch.js` 후속 fix — `fitContainer(el)` + `applyCanvasFit(el)` 추가하여 캔버스가 슬라이드 영역 채움 (model3d fitHeight 패턴 차용)
    - ComponentTest 프로젝트에 예제 슬라이드 4종 (bouncing ball / mouse trail / particle system / 에러 표시). `p.createCanvas(el.clientWidth, el.clientHeight)` 권장 패턴 사용
    - 문서 갱신: `.claude/rules/md-m2slide-rules.md` Simulation View 섹션 추가, `_doc_arch/component-slide-visual.md` 라이브러리 표에 p5 행 추가 + 미적용 표에서 제거
* 구현 명세:
    - p5.js **instance mode 강제** — `p.setup/draw/mouseX` 등 `p.` prefix. 다중 인스턴스 격리 + 글로벌 오염 방지
    - 사용자 코드 인자: `p` (p5 인스턴스), `el` (컴포넌트 컨테이너 div, dispatcher가 슬라이드 영역에 맞춰 사전 fit)
    - slidechanged 이벤트에서 비활성 슬라이드 p5 인스턴스 `noLoop()` 일시정지 → 활성 시 `loop()` 재개 (CPU 절약)
    - dispatcher: `fitContainer(el)` 부모 영역 채움 + `applyCanvasFit(el)` canvas CSS `width:100%; height:100%; display:block` 강제
* 검증:
    - 테스트 41/41 pass (기존 36 + p5 5건 신규)
    - 빌드 OK: ComponentTest(p5 주입 1회) + m2SlideStyle1_single / m2SlideStyle2_chapter / htmlArtTest (모두 미주입 — conditional 정상)
    - 브라우저 시각 확인: bouncing ball / mouse trail / particles 슬라이드 영역 fit + 에러 슬라이드 `.component-error` 표시
    - 후속 사용자 지적 "캔버스가 슬라이드 영역 채워야" → 옵션 C (dispatcher fit + 예제 권장) 채택하여 해결
* commit:
    - 4e75e96: yml 레지스트리 등재
    - cf8b76e: p5_dispatch 훅 (TDD RED → GREEN)
    - e42ae02: 레지스트리 통합 테스트 3건
    - 4752f0a: ComponentTest 예제 4종 추가
    - 00b5435: md-m2slide-rules + component-slide-visual 문서 갱신
    - fc0262a: Issue207 등록 + HWM 갱신
    - 9e5c957: 캔버스 슬라이드 영역 fit (dispatcher fitContainer + 예제 권장 패턴)

## Issue206. m2slide 3D 모델 뷰어 컴포넌트 추가 — model-viewer 3.5.0 (등록: 2026-05-22, 해결: 2026-05-22, commit: 43c3fbe) ✅
* 목적: `component-slide-visual.md`에 `❌ 적용 예정`으로 등재된 3D 모델 컴포넌트 구현. `\`\`\`model3d` fenced block + JSON config (`src`/`alt`/`autoRotate`/`poster`/`ar`/`height` 등) 저작 문법으로 GLB 모델을 슬라이드에 인터랙티브 렌더.
* 카테고리: Generator + Frontend
* 구현:
    - `data/component-libraries.yml`: model3d 엔트리 (injection: conditional, status: applied, module_js CDN)
    - `lib/component-registry.js`: `module_js` CDN 타입 지원 추가 (ES Module 웹컴포넌트 로드용)
    - `lib/component-hooks/model3d_dispatch.js`: JSON config → `<model-viewer>` 속성 매핑 + GLB 로딩 실패 시 component-error 표시 (error 이벤트 핸들러)
    - `lib/__tests__/component-libraries.test.js`: Issue206 테스트 그룹 3건 추가 (36 pass)
    - `_doc_arch/component-libraries.md`: `module_js` CDN 타입 스키마 등재
    - `_doc_arch/component-slide-visual.md`: 3D 모델 항목 ❌ → ✅
    - `Projects/ComponentTest/` 재생성 + model3d 샘플 슬라이드 (GLB 누락 오류/JSON 파싱 오류/chart 병존 검증)
    - `.claude/rules/md-m2slide-rules.md`: 저작 문법 등재
* 검증: 테스트 36/36 통과. ComponentTest 빌드 성공 + model3d CDN 주입 확인. model3d 없는 덱 CDN 미주입 확인. m2SlideStyle1/2 회귀 빌드 성공. GLB 누락 오류 표시 확인.

## Issue204. htmlArt list 타입군 5종 신설 — numbered·hexagon·bracket·block·tab (등록: 2026-05-22, 해결: 2026-05-22, commit: 03de042) ✅
* 목적: htmlArt가 SmartArt List 카테고리를 "비순차 박스 묶음은 `::: cards`가 담당"하여 비대상으로 두던 설계 결정을 번복. List 카테고리의 비순차·장식형 시각 패턴을 generic 타입 5종(numbered·hexagon·bracket·block·tab)으로 신설하여 표현 범위 확장.
* 구현: `lib/markdown.js` HTMLART_TYPES 5종 추가, `htmlart_dispatch.js` render 함수 5개, `data/htmlart/types.yml`·`smartart-catalog.yml` 갱신, 테스트 44 pass, htmlArtTest 5종 데모 슬라이드

## Issue205. htmlArt arrow 화살표 깨짐 + pyramid 상세 패널 분리·글자크기 (등록: 2026-05-22, 해결: 2026-05-22, commit: 702af67) ✅
* 목적: htmlArtTest 검수 중 2건 — (1) arrow 좌·우 방향 화살표 안 보임 (2) pyramid 상세 패널 분리·글자크기 위계 역전.
* 해결:
    - pyramid 수정(rowBg 행 배경 띠 + 폰트 26px/800 + subFsOverride=18): commit 702af67 ✅
    - arrow 수정(rectEdge 방향 인식 + Rr=330): 디스크 적용 완료, 미커밋 — renderArrow가 미커밋 v2 블롭(Issue202/204 15개 렌더러) 일부라 단독 커밋 불가. htmlArt v2 정식 커밋 시 함께 포함될 예정.

## Issue202. 슬라이드 전역 한글 어절 중간 줄바꿈 금지 (word-break: keep-all) (등록: 2026-05-22, 해결: 2026-05-22, commit: 9f31dba) ✅
* 목적: 슬라이드 전체에서 한글 텍스트가 어절 중간에서 줄바꿈됨 — HtmlArtEval cover 제목 "변환본"이 "변" + "환본"으로 끊김. CJK는 `word-break` 기본값 `normal`에서 글자 사이 어디서나 줄바꿈 허용 → `keep-all` 미명시 시 어절 중간 끊김. cover뿐 아니라 제목·본문·노드 전반 발생. 사용자가 `/dev`로 코드 단위 일괄 해결 요청.
* 카테고리: Theme
* 상세:
    - 코드 조사(CSS 4파일): 기존 `keep-all`은 `chapter-card`·`head-bar` 슬롯 2곳만 국소 적용. 제목·본문·노드 등 슬라이드 본체 텍스트 전부 미적용
    - code 블록(code-wrapper)은 의도적으로 `break-word` 유지 — 손대지 않음
* 구현 (해결):
    - `theme/default/slide.css` + `theme/default_lec/slide.css` 양쪽 `.reveal .slides section`에 `word-break: keep-all` + `overflow-wrap: break-word` 추가 (사용자 선택: theme slide.css 2파일 레이어 — base.css 미수정)
    - `word-break`는 상속 속성 → 슬라이드 안 모든 텍스트(제목·본문·노드) 자동 전파. code 블록은 code-wrapper 규칙(높은 specificity)이 `break-word`로 override
    - `overflow-wrap: break-word` — 끊을 수 없는 초장문 토큰(URL 등) 오버플로 안전망
* 검증: `./m2slide.sh` HtmlArtEval·m2SlideStyle1_single·m2SlideStyle2_chapter 빌드 성공. 빌드 산출물 `custom.css` 287행에 규칙 반영 확인. Chrome 표시 — cover 제목 어절 단위 줄바꿈.

## Issue203. cards title-only 항목 가로 행(rows) 자동 레이아웃 (등록: 2026-05-22, 해결: 2026-05-22, commit: d6f963f) ✅
* 목적: `::: cards` 블록이 전부 본문 없는 title-only 카드일 때, 좁은 grid 열에서 긴 텍스트가 어색하게 줄바꿈되고 제목 높이 불균형으로 빈 회색 body 띠가 생김. 파서가 자동 감지하여 가로 행(rows)으로 렌더해 해소. (브레인스토밍 완료 — 사용자 승인)
* 카테고리: Generator + Theme
* 상세:
    - 증상 재현: `Projects/HtmlArtEval/slide/index.html` slide 3 "한 줄 요약" — title-only 카드 3개 grid 3열에서 긴 문장 줄바꿈 + 짧은 카드 빈 회색 body 띠
    - 트리거: 자동 감지 (작성자 무개입) — 브레인스토밍 1차 결정
    - 구현 방식: B안(파서 클래스) 채택 — A안(CSS `:has()`) 대비 EPUB 동일 동작 + 테스트 가능
* 결과 (Walkthrough):
    - `lib/markdown.js` `preprocessPandocDiv`: `::: cards` 본문 look-ahead — 들여쓰기 bullet(본문)이 0개면 `m2-cards`에 `rows` 클래스 추가
    - `theme/_shared/components.css`: `.m2-cards.rows > ul` → 1열 그리드. title-only `<li>`(`:not(:has(> ul/ol))`) → 빈 회색 body 박스 제거 + `<strong>`에 `border-radius`·`box-shadow`. 안전 속성만 (금지 속성 무사용)
    - per-li 식별은 명세의 `card-title-only` 클래스 주입 대신 CSS `:has()`로 단순화 — 같은 결과, 파서 변경 최소화. `:has()` 미지원 EPUB 리더는 graceful degradation
    - `lib/__tests__/markdown.test.js`: title-only 전부/단일/혼합/본문있음 5케이스 추가 — 전체 149개 통과
    - `data/md-builder/styles.yml`: cards `component_syntax` 가이드 추가
    - `.claude/rules/md-m2slide-rules.md`·`_doc_arch/slide-components.md`: rows 자동 동작 문서화 (해당 경로는 m2slide `.gitignore` 대상 — 디스크 반영, 커밋 제외)
    - 검증: `./m2slide.sh HtmlArtEval` 재빌드 → slide 3 `<div class="m2-cards cards rows">` 확인, 브라우저 표시
    - 작업 트리 내 Issue202-era 미커밋 변경은 surgical 스테이징(`git apply --cached`)으로 본 커밋에서 제외

## Issue201. htmlArt pyramid 우측 패널 제목 중복 (등록: 2026-05-22, 해결: 2026-05-22, commit: 7431c97) ✅
* 목적: pyramid 도해의 우측 상세 패널 제목(`비전`·`전략`·`실행`)이 삼각형 밴드 라벨과 글자 그대로 중복. 사용자가 브라우저에서 발견.
* 카테고리: Generator (`htmlart_dispatch.js`)
* 구현 (해결):
    - `renderPyramid`: 패널 `nodeBox` 호출의 title 인자를 `''` 로 — 패널은 subs(상세)만 표시. 삼각형 밴드와 같은 y 좌표라 시각 매칭됨
    - `nodeBox`: title 빈 문자열이면 제목 div skip. title 없는 박스(패널)는 subs 가 본문이므로 `subFs` 를 `titleFs*0.66` → `*0.92` 로 키우고 opacity·margin 장식 생략
* 검증: `node --test` 144/144 통과. htmlArtTest #/6 pyramid — 우측 패널이 `장기 방향`·`중기 계획`·`일상 작업`(상세)만 표시, 삼각형 밴드 라벨과 중복 제거. 스크린샷 확인.

## Issue200. htmlArt 노드 글자 크기 — 박스 비례 폰트로 확대 (등록: 2026-05-21, 해결: 2026-05-21, commit: e5824b5) ✅
* 목적: htmlArt 4타입 도해의 노드 텍스트가 카드 컴포넌트 대비 상대적으로 작아 박스를 채우지 못함. 사용자가 카드 슬라이드와 나란히 비교하여 지적.
* 카테고리: Generator (`htmlart_dispatch.js`)
* 구현 (해결):
    - 원인: `nodeBox` 폰트가 14px/11.5px 고정. SVG 텍스트는 viewBox 좌표계라 viewBox 가 클수록 화면에서 작아짐. 노드 박스를 키워도 viewBox 가 함께 커져 화면 글자 크기는 불변 → 폰트/노드 **비율** 자체를 키워야 함
    - `nodeBox`: 고정 폰트 → 박스 비례. `titleFs = min(h*0.30, w*0.21, 44)`, `subFs = max(titleFs*0.66, 12)`. process·cycle·hierarchy 공용 헬퍼
    - pyramid 밴드 `<text>`: 16px → 21px
    - `word-break:keep-all` — 한글 어절 단위 줄바꿈(글자 중간 끊김 방지). hierarchy 긴 루트 라벨 대응
    - padding 5/10 → 6/12, sub margin-top 2 → 3
* 검증: `node --test` 144/144 통과. htmlArtTest 4타입 스크린샷 — 노드 제목·부제 텍스트가 박스를 카드 수준으로 채움. hierarchy 긴 루트 라벨(`m2slide 구성요소`)이 어절 경계로 2줄 정렬.

## Issue199. htmlArt columns 슬롯 안 도해 높이 0 붕괴 (등록: 2026-05-21, 해결: 2026-05-21, commit: 123e12c) ✅
* 목적: `::: {.column}` 슬롯 안에 넣은 htmlArt 도해(htmlArtTest #/7 타입 교체 데모)가 raw 텍스트(`process:`·`pyramid:`)만 남고 SVG 가 0 높이로 사라짐. 사용자 브라우저 확인 중 발견.
* 카테고리: Theme (`_shared/components.css`) + Generator (`htmlart_dispatch.js`)
* 구현 (해결):
    - 원인: Issue197 이 svg 를 `height:100%` 로 통일 — flex 부모 전제. columns 컬럼은 base.css `.m2-cols{align-items:center}` 때문에 높이가 콘텐츠 기준으로 붕괴 → `.m2-col`(flex column) 안 `.m2-htmlart`(flex:1 1 0, basis 0)가 grow 공간 없어 0 → svg `height:100%` 가 0 참조
    - `theme/_shared/components.css` — `.m2-cols:has(.m2-htmlart)` 를 `align-items:stretch` 로 override. htmlArt 있는 columns 만 컬럼을 본문 높이로 stretch (base.css 미수정 — 가드 회피, components.css specificity override)
    - `htmlart_dispatch.js` — 렌더 후 svg viewBox 비율을 컨테이너 `aspect-ratio` inline 으로 부여 (비-flex 부모 완전 fallback. flex 부모에선 flex:1 우선해 무시)
* 검증: `node --test` 144/144 통과. htmlArtTest #/7 columns 안 process·pyramid 도해 정상 렌더(elH 0→252px). contents-body 직속 htmlArt 회귀 0(process contentFill 65→67%). aTest·m2SlideStyle2_chapter 빌드 회귀 0.

## Issue198. htmlArt 도해 letterbox — viewBox aspect 슬라이드 영역 미정합 + 컨테이너 fill 통일 (등록: 2026-05-21, 해결: 2026-05-21, commit: 6bd083a) ✅
* 목적: Issue197(flex 잔여공간 채움) 후속. htmlArt 4타입 도해가 여전히 슬라이드 콘텐츠 영역의 30~64%만 채움. Playwright 측정으로 두 겹 원인 확정 — (1) `.m2-htmlart` 컨테이너가 `flex:1 1 0` 인데도 `margin:0.6em 0` 때문에 `.contents-body` 의 64%만 점유 (2) d3 SVG viewBox aspect 가 슬라이드 영역(~3:1)과 불일치하여 컨테이너 안에서 또 letterbox.
* 카테고리: Generator (`htmlart_dispatch.js` viewBox) + Theme (`_shared/components.css`)
* 구현 (해결):
    - **P1 컨테이너 fill**: `theme/_shared/components.css` `.m2-htmlart` `margin:0.6em 0` 제거 — flex item margin 이 `.contents-body` 잔여공간을 별도 잠식해 도해 축소. 콘텐츠 컨테이너 fill 계약 주석 명시(`.media-container`·`.component-container` 와 동일)
    - **P2 letterbox 제거**: `htmlart_dispatch.js` viewBox aspect 를 슬라이드 콘텐츠 영역(~3:1)에 정합 — process boxW 224→196·boxH 120→230·arrowGap 64→52·padY 18→28 (aspect 6.97→3.29), hierarchy nodeH 58→90·nodeSize 세로 +34→+96 (4.07→2.31), pyramid bandH 74→88 (2.99→2.58), cycle 무수정(1.17 이미 정합). `preserveAspectRatio` meet 유지(clip 0)
* 검증: `node --test` 144/144 통과. htmlArtTest 4타입 콘텐츠 실채움 — process 32→65%·hierarchy 30→65%·pyramid 41→65%·cycle 64→65% (letterbox 제거로 4타입 균일화, 잔여 35%는 슬라이드 상단 bullet·padding 의 자연 점유분). aTest mermaid/chart/d3/map 회귀 0. process·hierarchy 스크린샷 시각 확인.
* 비고: mermaid(`.media-container` 88%)·chart/map/d3(`.component-container` 88~92%)는 측정상 양호하여 무수정. excalidraw 등 외부 모듈은 사용자 명시로 범위 제외.

## Issue197. htmlArt 도해 크기 산정이 상단 텍스트 미반영 — 컨테이너 잔여공간 채움 (등록: 2026-05-21, 해결: 2026-05-21, commit: 412c194) ✅
* 목적: htmlArt 4타입 도해 SVG 가 `max-height:Nvh`(고정 뷰포트 비율)로 크기를 정해, 같은 슬라이드 상단의 제목·bullet 텍스트가 점유한 높이를 반영하지 못함. vh 를 키우면 텍스트+도해 합계가 슬라이드를 초과해 잘리고(clip), 낮추면 도해가 작아짐. 4타입 공통 — Issue195 의 "max-height 상향"은 증상만 건드린 잘못된 처방.
* 카테고리: Generator (`htmlart_dispatch.js`) + Theme (`_shared/components.css`)
* 구현 (해결):
    - `theme/_shared/components.css` `.m2-htmlart` 에 `flex:1 1 0; min-height:0; overflow:hidden` 추가 — `.contents-body`(이미 flex column)의 bullet `<ul>` 다음 잔여 세로 공간을 도해가 차지(`.media-container` 와 동일 메커니즘). 비-flex 부모에선 무시(fallback)
    - `htmlart_dispatch.js` 4타입 svg inline style 통일 — `height:auto;max-height:Nvh`(52/62/70/74) → `height:100%;max-height:92vh`. flex 컨테이너에선 잔여 공간 정확히 채움, 비-flex fallback 에선 aspect+92vh cap
    - `preserveAspectRatio` 기본값(meet) → letterbox, clip 구조적으로 불가
* 검증: `node -c` 통과. htmlArtTest 재빌드 성공. 산출물 index.html 에 `height:100%;max-height:92vh` 4건(4타입)·custom.css 에 `flex: 1 1 0` 반영 확인. 시각 확인은 Chrome 수동(Playwright 브라우저 잠금).
* 비고: 디버깅 지식은 `_doc_work/debug_TECH.md` § htmlArt·SVG 컴포넌트 크기 에 사례 박제. Fix 커밋에 cycle ↻ 심벌 확대(Issue195 피드백 잔여)·hierarchy 노드 간격 조정 동반.

## Issue196. 카드 컴포넌트 여백 과다 (등록: 2026-05-21, 해결: 2026-05-21, commit: 81b57b3) ✅
* 목적: `::: cards` 카드 컴포넌트가 슬라이드 영역 대비 여백이 과다함. 카드 박스 사이 간격·카드 내부 padding·그리드 외곽 여백이 커서 콘텐츠가 작게 보임.
* 카테고리: Theme (`theme/_shared/components.css` `.m2-cards`)
* 구현 (해결):
    - `theme/_shared/components.css` `.m2-cards` (Issue191 공통 추출 후 단일 SSOT — `default`·`default_lec` 양 테마 공유):
        - 그리드 `gap` 18px → 10px, `margin` 0.5em → 0.25em
        - `grid-template-columns` minmax 200px → 180px (`auto-fit` 시 카드가 슬라이드 폭을 더 채움)
        - 제목 밴드 `strong` padding 10/18px → 7/14px
        - 카드 본문 `ul`/`ol` padding 12/18px → 8/13px
* 검증: aTest·m2SlideStyle1_single·m2SlideStyle2_chapter 빌드 회귀 0. `expandCssImports` 인라인 전개 후 산출물 custom.css에 `minmax(180px`·`gap: 10px` 반영 확인. Playwright — aTest 카드 슬라이드 6장 3열 렌더, grid overflow -49(슬라이드 영역 내, 클리핑 0).

## Issue195. htmlArt hierarchy 연결선 카드 관통 + 도해 크기 (등록: 2026-05-21, 해결: 2026-05-21, commit: c0cc712) ✅
* 목적: Issue193 d3 렌더 후속 — (1) hierarchy 노드 박스 배경이 반투명(`rgba(0,0,0,.045)`)이라 뒤를 지나는 `d3.linkVertical` 연결선이 박스를 관통해 보임 (2) 4타입 도해가 슬라이드 영역 대비 작아 여백 과다.
* 카테고리: Generator (`htmlart_dispatch.js`) + Theme (`components.css`)
* 구현 (해결):
    - `nodeBox` 비-accent 배경을 불투명 surface로 전환 — `theme/_shared/components.css` `.m2-htmlart`에 `--htmlart-surface`(불투명 `#f4f4f5`) 변수 추가 → 연결선이 박스 뒤로 가려짐
    - hierarchy 연결선 edge-to-edge — 부모 박스 하단 ↔ 자식 박스 상단 연결(박스 내부 관통 제거)
    - 4타입 도해 채움(꽉차게): hierarchy 노드·트리 간격 확대, cycle viewBox 노드 외곽 hug + 노드 212×108 + 화살표 marker 58u(`userSpaceOnUse`+`overflow:visible`)·stroke 10, pyramid/process 박스 확대, svg `max-height` 를 슬라이드 영역에 맞춰 조정
* 검증: `node --test` 144/144 통과. htmlArtTest·graphify 빌드 회귀 0. Playwright 4타입 렌더 — hierarchy·pyramid·process·cycle overflow 전부 음수(슬라이드 영역 내, 클리핑 0).

## Issue193. htmlArt 렌더 백엔드 CSS → d3 SVG 전환 (등록: 2026-05-21, 해결: 2026-05-21, commit: 20cc48e) ✅
* 목적: htmlArt 4타입(process/cycle/hierarchy/pyramid)이 순수 CSS 구현이라 Issue188~192 5개 이슈가 전부 시각 튜닝 반복으로 소진됨. cycle 원형 배치·hierarchy 연결선은 CSS로 좌표·곡선 계산이 불가능 — `nth-child` 8개 하드코딩, 고정 600px, 화살표 부재. 렌더 백엔드를 클라이언트 d3 SVG로 전환.
* arch: `_doc_arch/htmlArt.md`
* 카테고리: Generator + Theme
* 결정 (2026-05-21, 사용자 폼 응답): **전 타입 d3 API 통일** — 4타입 모두 d3 API 렌더.
* 구현 (해결):
    - 신규 component hook `lib/component-hooks/htmlart_dispatch.js` — reveal ready 시 `div[data-htmlart]` 내부 ul 트리 파싱 → 타입별 d3 SVG 렌더 후 ul 교체
        - cycle: `d3.pointRadial` 원형 좌표 + `d3.path().arc()` 순환 곡선 화살표
        - hierarchy: `d3.hierarchy` + `d3.tree().nodeSize()` 조직도 레이아웃 + `d3.linkVertical()` 연결선. 다중 루트 가상 루트 처리
        - pyramid: `d3.scaleLinear` 층 너비 비례 + SVG `<polygon>` 적층 사다리꼴 + 우측 상세 패널
        - process: `d3.range` 단계 박스 가로 체인 + 진행 방향 삼각 화살표 `<polygon>`
    - `data/component-libraries.yml`에 `htmlart` 엔트리 (`init_hook: htmlart_dispatch`, `detect_inline: data-htmlart=`, CDN 없음 — d3@7.9.0 재사용. d3는 `html-builder.js` 정적 블록이 무조건 로드)
    - `theme/_shared/components.css`의 타입별 htmlArt CSS 블록 전부 제거 — `.m2-htmlart` 공통 컨테이너(CSS 변수·component-error)만 잔존 (Issue194 pyramid clip-path CSS도 d3로 대체됨)
    - `data/htmlart/types.yml` cycle impl_note d3 갱신, `lib/__tests__/component-libraries.test.js` htmlart 검증 3건
    - 입력 모델(`::: htmlart <type>` + 들여쓰기 ul) 무변경 — graceful degradation(JS 미동작 시 list 노출)
* 검증: `node --test` 144/144 통과. htmlArtTest 빌드 후 4타입 전부 d3 SVG 렌더 확인(Playwright — svg/foreignObject/polygon/path 카운트 + 에러 0, `stillUl` false). graphify(default_lec) 빌드 회귀 0.
* 비고: `_doc_arch/htmlArt.md` 갱신은 `.gitignore` 대상이라 커밋 제외 — 로컬 유지 (Issue188 동일 정책).

## Issue194. htmlArt pyramid — 적층 밴드 → 단일 삼각형 + 상세 패널 (등록: 2026-05-21, 해결: 2026-05-21, commit: a7d026b) ✅
* 목적: 기존 pyramid는 둥근 사각형 밴드를 폭만 키워 적층하는 방식이라 연속된 진짜 삼각형 모양이 형성되지 않음. 첨부된 PowerPoint 피라미드 SmartArt처럼 단일 삼각형(좌) + 층별 상세 패널(우) 구조로 재설계.
* 카테고리: Generator + Theme
* 상세:
    - `lib/markdown.js`: pyramid 블록 최상위 bullet 라벨을 `<span class="pyr-band-label">`로 래핑 (hierarchy `ha-node` 패턴 동일). 하위 들여쓰기 항목은 그대로 중첩 `<ul>`로 파싱 → 우측 상세 패널이 됨
    - `theme/_shared/components.css`: 각 층 = 등높이 flex 행. 삼각형 모양은 `.pyr-band-label::before`에 `clip-path: polygon()`으로 분리해 그림 — 좌표를 `--htmlart-i`/`--htmlart-n` 비례로 계산하여 N개 슬라이스가 하나의 삼각형 합성. 라벨 텍스트는 clip 미적용 → 꼭대기 좁은 층 라벨도 온전히 표시. 하위 항목은 우측 테두리 패널 + `•` 마커
    - `data/htmlart/types.yml`: pyramid `visual:` 설명 갱신
* 구현 명세:
    - 검증: `node --test lib/__tests__/markdown.test.js` 38/38 통과, `htmlArtTest` 빌드 후 슬라이드 #/6(pyramid)·#/7(type 교체) 시각 확인
    - 빌드 산출물(`Projects/htmlArtTest/slide/*`)은 진행중 Issue193 작업과 혼재되어 본 커밋에서 제외 — 소스 3파일만 커밋

## Issue192. htmlArt hierarchy — 가로 트리 → 상하 조직도 전환 (등록: 2026-05-21, 해결: 2026-05-21, commit: 5301ca9) ✅
* 목적: Issue189~190의 hierarchy는 좌→우 가로 트리(부모 왼쪽)였으나 사용자 요구는 부모를 위에 두는 상하 조직도. 또한 좌→우 버전의 per-li `::after` bus 세그먼트가 시각적으로 끊겨 보임. 부모 위·자식 가로 행 아래의 PowerPoint Organization Chart 형태로 재설계.
* arch: `_doc_arch/htmlArt.md`
* 카테고리: Theme (`theme/_shared/components.css`)
* 구현 명세 (해결):
    - `theme/_shared/components.css` hierarchy 블록 전면 교체 (Issue191 공통 CSS 추출 후이므로 단일 파일 수정)
    - 레이아웃: `ul` flex row(자식 가로 펼침), `li` flex column(노드 위 + 자식 ul 아래)
    - 연결선: `li::before`/`::after` border-top 반쪽 가로 bus + `::after` border-left 세로 drop. first/last-child 바깥 bus 트림, only-child drop만. `ul::before` 부모→bus 세로선. 끊김 없는 연속 연결선
    - base.css `●` 마커 suppressor와 specificity 충돌 → connector 셀렉터를 `.m2-htmlart.htmlart-hierarchy` 복합 클래스로 강화
* 검증: htmlArtTest 빌드 + hierarchy 브라우저 렌더 확인(부모 위·자식 행·연결선 연속). m2SlideStyle1/2 회귀 0.

## Issue191. 공통 컴포넌트 CSS 중복 제거 — theme/_shared/components.css 추출 + @import (등록: 2026-05-21, 해결: 2026-05-21, commit: 96e5861) ✅
* 목적: htmlArt·cards·시각화 컴포넌트 CSS가 `theme/default/slide.css`·`theme/default_lec/slide.css` 두 파일에 byte-identical하게 매번 수동 복제됨. Issue188~190(htmlArt)에서 두 파일을 동시 복붙으로 동기화했으나, 두 theme이 독립 복사본(@import 없음)이라 누락 시 즉시 drift. 이미 발생한 문제(369줄 중복)와 앞으로 발생할 문제(공통 기능 추가 시마다 복붙) 동시 해결.
* 카테고리: Theme + Build
* 상세:
    - 두 파일에서 완전 동일한 공통 컴포넌트 블록: component 슬롯/WordArt/error 66줄, cards 73줄, htmlArt 230줄 = 총 369줄
    - 원인: `theme/{name}/slide.css`는 theme별 독립 파일. 공통 selector(`.m2-htmlart`·`.m2-cards`·component 슬롯)도 각 theme에 중복 작성
    - 빌드 제약: `generate-slides.js`가 `slide.css` 단일 파일을 `slide/css/custom.css`로 `copyFileSync` → 순수 런타임 `@import`는 partial 미복사로 404
* 구현 명세 (해결):
    - `theme/_shared/components.css` 신규 (388줄) — 공통 컴포넌트 3블록 단일 SSOT. 색상은 theme `:root` 변수 상속 유지
    - `default/slide.css`(1582→1213)·`default_lec/slide.css`(1260→891)에서 3블록 제거 + 헤더 주석 다음 `@import "../_shared/components.css";` 추가
    - `generate-slides.js`: CSS 복사 단계(`copyFileSync`)를 `expandCssImports()` 재귀 인라인 전개로 교체. `@import` 정규식은 줄 시작·줄 끝 강제(`^[ \t]*@import...;$`)로 CSS 주석 내 오매칭 방지. 빌드 산출물은 단일 `custom.css` 유지 — 현행 동작 보존
    - `.gitignore`: `theme/_shared/` 추적 whitelist 추가 (`/theme/*` 패턴 예외)
* 검증: `node --test` 141/141 통과. default(htmlArtTest·m2SlideStyle1_single·m2SlideStyle2_chapter)·default_lec(graphify) 빌드 회귀 0. custom.css 잔여 @import 룰 0건, htmlArt/cards/wordart selector 정상 전개 확인.

## Issue190. htmlArt 도해 시각 정밀 조정 — process 간격, cycle 중심·노드, hierarchy 연결선 (등록: 2026-05-21, 해결: 2026-05-21, commit: e438512) ✅
* 목적: Issue189 후속 피드백. process 박스 간격 부족, cycle ↻가 링 중심 아님·노드 폭 부족(텍스트 줄바꿈·클리핑), hierarchy 연결선이 트리 밖 돌출.
* arch: `_doc_arch/htmlArt.md`
* 카테고리: Theme (`default`·`default_lec` slide.css)
* 구현 명세 (해결):
    - process: 컬럼 gap `64→92px`, 화살표 `22→27px`, `justify-content: center`
    - cycle: 노드 고정 높이(`100px`)로 margin 정확 중심 정렬 → ↻ 링 중심 일치. 노드 폭 `162→224px`, 서브텍스트 `nowrap` 1줄, 컨테이너 `540→600px`. 제목 클리핑 해소(높이·행간·폰트)
    - hierarchy: `ul ul` border-left bus 제거 → per-li `::after` 세로 세그먼트. first/last/only-child 트림으로 연결선이 첫·끝 자식 중심 범위만 차지 — 트리 밖 돌출 제거
* 검증: `node --test` 141/141 통과. htmlArtTest 빌드 + process·cycle·hierarchy 브라우저 렌더 확인. m2SlideStyle1/2 회귀 0.

## Issue189. htmlArt 도해 시각 개선 — process 간격·화살표, cycle 비율, hierarchy 가로 트리 (등록: 2026-05-21, 해결: 2026-05-21, commit: aa7cbae) ✅
* 목적: Issue188 직후 사용자 피드백 반영. process 박스 간격 부족·화살표 미가시, cycle 너비 부족·노드 높이 과다로 원형 안 보임, hierarchy 세로 트리라 markmap과 차별 없음 — htmlArt 가치는 가로 표현.
* arch: `_doc_arch/htmlArt.md`
* 카테고리: Generator (`markdown.js`) + Theme (`default`·`default_lec` slide.css)
* 구현 명세 (해결):
    - process: `> ul` gap `26/30 → 34/64`, 화살표 `14px accent → 22px --htmlart-arrow`(rgba 0.5 진한 회색) — 가시성 확보
    - cycle: 컨테이너 `470 → 540`, radius `170 → 205`, 노드 폭 `150 → 162`, 서브텍스트 `0.72 → 0.62em` — 노드 압축으로 원형 가독성 확보
    - hierarchy: 세로 들여쓰기 트리 → **가로 트리**(좌→우 박스 노드 + 세로 bus 연결선). `markdown.js` preprocessPandocDiv가 htmlart hierarchy 블록 bullet 텍스트를 `<span class="ha-node">`로 래핑(bare text node 박스 불가 — hierarchy 한정). 세로 트리는 markmap 영역, htmlArt hierarchy는 가로 표현 목적
* 검증: `node --test` 141/141 통과 (htmlArt 8 케이스 — ha-node 래핑 검증 추가). htmlArtTest 빌드 + process·cycle·hierarchy 브라우저 렌더 확인. m2SlideStyle1/2 회귀 0.

## Issue188. htmlArt core 구현 — `::: htmlart <type>` 파서 + theme CSS 4종 (등록: 2026-05-21, 해결: 2026-05-21, commit: 9b154b0) ✅
* 목적: htmlArt 설계(`_doc_arch/htmlArt.md`)를 코드로 구현. 들여쓰기 아웃라인을 `::: htmlart <type>` fenced div로 감싸면 process·cycle·hierarchy·pyramid 구조 도해로 렌더. 스캐폴드(`Projects/htmlArtTest`)가 raw 텍스트로 표시되던 것을 실제 렌더로 전환.
* arch: `_doc_arch/htmlArt.md`
* 카테고리: Generator (`markdown.js` preprocessPandocDiv) + Theme (`default`·`default_lec` slide.css)
* 구현 명세 (해결):
    - `markdown.js` preprocessPandocDiv에 `::: htmlart <type>` 분기 — `<div class="m2-htmlart htmlart-<type>" data-htmlart="<type>" style="--htmlart-n:N">`. 미지원/누락 타입은 `.component-error` (빌드 비차단). openWithName보다 먼저 가로채기
    - `slide-parser.js` PANDOC_LAYOUT_RESERVED에 `htmlart` 추가 (슬롯 오추출 방지)
    - `theme/default`·`default_lec` slide.css에 `.htmlart-{process,cycle,hierarchy,pyramid}` 4종 CSS. base.css `●` 마커·nested-ul `margin-left:1.2em` override 위해 `section[class*="layout-"]` prefix로 specificity 강화. cycle은 `--htmlart-n` 기반 radial 배치(position:absolute + transform rotate)
    - `data/htmlart/types.yml` status `design→active`, media-creater `tools.yml` htmlart_catalog `active`
    - 예제 프로젝트 `Projects/htmlArtTest` (타입 4종 + 타입 교체 데모 슬라이드)
    - `markdown.test.js` htmlArt 6 케이스 추가
* 검증: `node --test` 139/139 통과. htmlArtTest 빌드 + 5종 슬라이드 브라우저 렌더 확인(process·cycle·hierarchy·pyramid + `::: columns` 중첩 데모). m2SlideStyle1/2 회귀 0.
* 비고: `_doc_arch/htmlArt.md`·`data/media-creater/tools.yml` 갱신은 `.gitignore` 대상이라 커밋 제외 — 로컬 유지 (Issue184 동일 정책).

## Issue187. authoring-pipeline 전 agent의 사용자-변동 콘텐츠 data 외부화 커버리지 점검 (등록: 2026-05-21, 해결: 2026-05-21, commit: 865c4fc) ✅
* 목적: "에이전트=구현 플랫폼, 사용자 요청에 따라 바뀌는 콘텐츠는 `data/` 파일 참조 필수" 원칙이 9단계 전 agent에 일관 적용됐는지 점검.
* 카테고리: Project
* 상세:
    - 7개 agent(info-filler·refs-collector·agenda-designer·media-creater·layout-selector·slot-designer) + `md-builder` skill의 `data/<단계>/` 커버리지 점검
* 점검 결과:
    - info-filler→`questions.yml`, refs-collector→`channels.yml`, agenda-designer→`patterns.yml`, md-builder→`styles.yml`, media-creater→`tools.yml`, layout-selector→`rules.yml`, slot-designer→`patterns.yml` — 7개 SCAR 전부 `data/<단계>/` SSOT 선언·로드 확인 (v2 데이터-주도 — Issue169~174 전환 완료)
    - 유일 갭: 심벌·이모지는 특정 agent 단독 소유가 아닌 cross-stage 콘텐츠라 어느 `data/<단계>/` 폴더에도 없었음 → Issue186으로 top-level `data/symbol-usage.yml`·`data/emoji-usage.yml` 신설하여 해소
    - 결론: 추가 신규 data 파일 불요. 점검 완료, 갭은 Issue186으로 흡수

## Issue186. 심벌·이모지 사용 정의 data 파일 신설 — data/symbol-usage.yml + data/emoji-usage.yml (등록: 2026-05-21, 해결: 2026-05-21, commit: 865c4fc) ✅
* 목적: 슬라이드 본문에 쓰이는 심벌(Font Awesome `:fa-name:`)·이모지는 사용자 요청에 따라 계속 바뀌는 콘텐츠임에도 "어떤 상황에 무엇을 쓰는지" 정의한 data 파일이 없어 에이전트(특히 단계 4 md-builder)가 일관 참조할 SSOT가 부재. 데이터-주도 SCAR 원칙(에이전트=구현 플랫폼, 정책·콘텐츠는 `data/` 외부화)에 맞춰 2개 data 파일 신설.
* 카테고리: Project (data/ SSOT) + Generator (에이전트 참조 연결)
* 상세:
    - `data/symbol-usage.yml` — 상황별 권장 Font Awesome 심벌 카탈로그 (18 situation + 유니코드 대안)
    - `data/emoji-usage.yml` — 상황별 권장 이모지 카탈로그 (18 situation + tone_guide)
    - `md-builder`(단계 4)·`media-creater`(단계 5) 입력에 두 파일 등재, md-builder 본문 작성 알고리즘에 참조 규칙 추가
    - 설계문서 갱신: `authoring-pipeline.md` data 인벤토리, `component-libraries.md`, `slide-components.md`
    - `.gitignore` 신규 SSOT data yml 2종 화이트리스트
* 구현 명세:
    - 출처: 볼트 `symbol.md`/`Emoji.md`를 큐레이션 ("상황 → 권장" 매핑, 전체 덤프 아님)
    - 심벌 = Font Awesome `:fa-name:` 컴포넌트 (유니코드 특수문자는 plain text 대안 병기)

## Issue184. 시각화 4도구 통합 — React artifact·HTML artifact(WordArt)·excalidraw·d3 콘텐츠 기반 자동 선택 (등록: 2026-05-21, 해결: 2026-05-21, commit: 2df139e) ✅
* 목적: media-creater agent가 슬라이드 본문 성격에 따라 4종 시각화 도구를 `data/media-creater/tools.yml` 기준으로 자동 선택하도록 통합. React artifact(기본)·HTML artifact(WordArt 장식 텍스트)·excalidraw(복잡 다이어그램)·d3(그래프)를 콘텐츠 패턴에 매핑.
* plan: `_doc_work/plan/visualization-4tools_plan.md`
* 카테고리: Generator (`markdown.js` fenced) + Asset (component-hooks, `component-libraries.yml`) + Theme (WordArt CSS) + Project (media-creater `tools.yml`·agent)
* depends: Issue183 ✅ (diagram/component 슬롯 분리)
* 구현 명세 (해결):
    - **React artifact** (`` ```react ``): `component-libraries.yml`에 react 라이브러리 등록(React 18.3.1 UMD + ReactDOM + Babel-standalone, `injection: conditional`) → `componentLangs` 경로가 자동 라우팅. `react_dispatch.js` 신규 — Babel-standalone가 브라우저에서 JSX 변환 후 `ReactDOM.createRoot` 마운트. markdown.js 무수정.
    - **HTML artifact** (`` ```wordart ``): `markdown.js`에 raw HTML passthrough 분기 추가(escape 없이 `.component-container.wordart-block` 통과). theme `slide.css` ×2에 `.wordart-*` 5종(그라데이션·외곽선·그림자·3D·발광) 순수 CSS. CDN·디스패처 없음 — `component-libraries.yml` 미등재.
    - **excalidraw·d3**: `tools.yml`에 기존 등재 — 선택 기준(`content_pattern_rules`)만 갱신.
    - **media-creater**: `tools.yml`에 `react_artifact`·`html_artifact` 도구 + `decorative_text` 룰 + `selection_policy`(`default_tool: react_artifact`) 추가. agent 본문 알고리즘에 "매칭 0건 → `selection_policy.default_tool` fallback" 단계 추가.
* 검증: `node --test` 133/133 통과(Issue184 7종 추가). ComponentTest 빌드 + 브라우저 런타임 검증(playwright) — React counter/clock·WordArt 5효과·SVG 곡선 정상 렌더, console 에러 0(favicon 404 제외), 회귀 0(mermaid/d3/chart/map). 대표 3종 빌드 성공.
* 비고: `_doc_arch/slide-components.md`·`.claude/rules/md-m2slide-rules.md` 문서 갱신은 디스크 반영되나 m2slide `.gitignore`(`_doc_arch`·`.claude`) 대상이라 커밋 제외 — 로컬 유지. plan은 markdown.js 변경 범위를 실제보다 크게 기술(실제: React=yml 등록만, wordart=4줄 분기).

## Issue185. authoring-pipeline 정책 글로벌↔프로젝트 cascade — L1 data/<단계>/*.yml + L2 Projects/<N>/_pipeline/policy/<단계>.yml (등록: 2026-05-21, 해결: 2026-05-21, commit: 050a60c, 586d339, 825bcbe, 3874521, cbe0cf9) ✅
* 목적: 파이프라인 정책(`data/<단계>/*.yml`)이 글로벌 전용이라 "이 프로젝트만 카드를 넓게" 같은 프로젝트별 요청을 영구 저장할 자리가 없던 문제 해소. `_config.yml`이 쓰는 글로벌↔프로젝트 cascade 패턴을 정책 축에 도입. 렌더 설정·Info.md 불변.
* plan: `_doc_work/plan/pipeline-policy-cascade_plan.md`
* arch: `_doc_arch/pipeline-policy-cascade.md`
* 카테고리: Project (authoring-pipeline 정책 cascade) + Generator (SCAR 데이터 로드 절차)
* 상세:
    - L1 글로벌 기본값 `data/<단계>/*.yml`(기존) + L2 프로젝트 override `Projects/<N>/_pipeline/policy/<단계>.yml`(신규) 2-레이어
    - 각 단계 SCAR이 단계 진입 시 L1 Read → L2 deep-merge(프로젝트 우선)
    - 기존 키로 표현 안 되는 신규 요청은 글로벌 스키마 자동 확장 → 키 정의는 항상 L1 1벌, merge 항상 결정적
* 구현 명세 (해결):
    - 설계 SSOT `_doc_arch/pipeline-policy-cascade.md` 신규
    - 7개 단계 SCAR(info-filler/refs-collector/agenda-designer/md-builder/media-creater/layout-selector/slot-designer)에 "프로젝트 정책 cascade (L2)" + "정책 변경 요청 처리" 절차 삽입
    - `authoring-pipeline.md`: 책임 분할 표 L2 row, 진행 단계 표 L2 주석, `_pipeline` 트리 `policy/`, 후속 작업 v3 후보 항목 대체
    - 폐기된 v3 후보 잔재 `data/layout-selector/overrides/` 폴더 + dead yml 블록 제거
* 검증: slot-designer cascade 트레이스(L2 우선 deep-merge) 통과, `m2SlideStyle1_single` 하위호환 빌드 성공, 통합 리뷰 머지 가능
* 후속 후보: `layout-selector.md` frontmatter `title`+`name` 중복 (Issue173 기존 문제, md-rules 위반 — 본 이슈 범위 밖)

## Issue183. media-container 슬롯 설계 결함 — diagram/component 슬롯 분리 (등록: 2026-05-20, 해결: 2026-05-20, commit: 6bbaa8e) ✅
* 목적: `media-container` 단일 슬롯이 이질적 콘텐츠 5종(mermaid·kroki·chart·map·d3)을 수용하면서 암묵 계약("콘텐츠는 자체 스케일 기하 viewBox/replaced 보유")을 명시하지 않아, 계약 위반 컴포넌트마다 깨지거나 per-component 해킹이 필요한 구조적 결함을 해소. d3 인포그래픽이 슬라이드를 안 채우는 증상(ComponentTest #/8)의 근본 원인.
* depends: Issue182 ✅ (d3·map applied 경로)
* 카테고리: Theme (슬롯 CSS 계약) + Generator (`markdown.js` fenced 디스패처) + Asset (component-hooks)
* 상세:
    - 현상: `markdown.js`가 chart/map/d3 fenced를 mermaid와 동일한 `<div class="media-container" data-component="X">`로 변환 → `slide.css`의 `.media-container svg{width:100%!important;height:100%!important}` blanket 룰 적용
    - 결함 1 (d3): d3 사용자 코드가 `viewBox` 없는 raw SVG 생성 → blanket 룰이 SVG 요소만 늘리고 좌표계는 안 늘림 → 콘텐츠가 좌상단 고정·슬라이드 미충전
    - 결함 2 (map): `.media-container img` 룰이 Leaflet 타일 `<img>`를 0크기로 클로버 → `map_dispatch.js`가 `el.classList.remove("media-container")` 런타임 해킹으로 회피
    - mermaid(viewBox)·kroki(replaced `<img>`)·chart(canvas responsive)는 계약을 우연히 만족하여 동작
* 구현 명세 (해결):
    - 슬롯 타입 분리(B안): diagram 슬롯(`.media-container`, viewBox/replaced 가정 — mermaid·kroki) vs component 슬롯(`.component-container`, 컴포넌트 자체 사이징 책임 — chart·map·d3)
    - `markdown.js` fenced 핸들러: `componentLangs` 매칭 시 `.component-container` emit (mermaid·kroki는 `.media-container` 유지) — ef8baef 선반영
    - `slide.css` ×2: `.component-container` 슬롯 룰 추가 (flex 영역만 제공). `.media-container svg` blanket 룰은 클래스 분리로 diagram 슬롯 전용 자연 격리
    - `d3_dispatch.js`: 렌더 후 `viewBox` 없는 SVG에 width/height attr 기반 `viewBox` 자동 주입 — ef8baef 선반영
    - `map_dispatch.js`: `classList.remove("media-container")` 해킹 제거 — ef8baef 선반영
    - `chart_dispatch.js`: 무수정 (canvas responsive는 component 슬롯에서도 동작 확인)
    - `_doc_arch/component-libraries.md`에 "슬롯 계약" 절 추가 — diagram/component 슬롯 정의·콘텐츠 계약 명시
* 검증: `node --test` 126/126 통과 (Issue183 테스트 3종 추가). `ComponentTest` 빌드 — chart·d3·map → `.component-container`, mermaid → `.media-container`. `MermaidExample` 회귀 0 (mermaid 25·kroki 12 모두 `.media-container`).

## Issue182. 슬라이드 구성요소 라이브러리 Phase 2 — 지도·인포그래픽 (등록: 2026-05-20, 해결: 2026-05-20, commit: ef8baef) ✅
* 목적: Issue180 Phase 0 인프라 위에 데이터 시각화 구성요소 2종(지도·인포그래픽)을 적용. `component-libraries.yml`의 leaflet `planned → applied`, d3 `planned → applied`(인포그래픽 직접 사용 경로 신설로 `🚧 → ✅` 승격).
* plan: `_doc_work/plan/slide-components_plan.md`
* task: `_doc_work/tasks/slide-components_task.md`
* depends: Issue180 (Phase 0 인프라)
* 카테고리: Generator (`markdown.js` fenced 디스패처 generic화) + Asset (component-hooks)
* 상세:
    - 지도(Leaflet): `` ```map `` fenced + `lib/component-hooks/map_dispatch.js` 훅 (OpenStreetMap 타일)
    - 인포그래픽(d3): `` ```d3 `` fenced + `lib/component-hooks/d3_dispatch.js` 훅 (d3 기존 로드분 재사용, CDN 추가 불필요)
    - `markdown.js` fenced 핸들러를 레지스트리 주도 generic 디스패처로 전환 (chart 하드코딩 제거)
    - 디스패처 수정: unconditional 라이브러리도 init_hook은 detect 매칭 시 주입 (d3 대응)
    - `data/media-creater/tools.yml` map_inline·d3_inline 도구 + `md-m2slide-rules.md` 등재
    - `ComponentTest`에 지도·인포그래픽 슬라이드 추가
* 검증: `node --test lib/__tests__/component-libraries.test.js` 20/20 통과 (phase2 그룹 — leaflet·d3 applied, getComponentFencedLangs, ```map/```d3 fenced 변환, 디스패처 주입). `ComponentTest` 빌드 OK. m2SlideStyle1_single 회귀 0.

## Issue181. 슬라이드 구성요소 라이브러리 Phase 1 — 수식·아이콘·차트 (등록: 2026-05-20, 해결: 2026-05-20, commit: ef8baef) ✅
* 목적: Issue180 Phase 0 인프라(레지스트리·generic 디스패처) 위에 강의 최빈 구성요소 3종(수식·아이콘·차트)을 적용. `component-libraries.yml`의 katex·fontawesome·chartjs를 `planned → applied` 전환.
* plan: `_doc_work/plan/slide-components_plan.md`
* task: `_doc_work/tasks/slide-components_task.md`
* depends: Issue180 (Phase 0 인프라)
* 카테고리: Generator (`markdown.js` 인라인 변환·fenced 디스패처) + Asset (component-hooks)
* 상세:
    - 수식(KaTeX): `lib/component-hooks/katex_autorender.js` 훅 + `markdown.js` `$$…$$`·`\(…\)` 보존 검증
    - 아이콘(Font Awesome): `markdown.js` inline `:fa-name:` → `<i>` 변환
    - 차트(chart.js): `` ```chart `` fenced → `data-component="chart"` div + `chart_dispatch` 훅
    - `data/media-creater/tools.yml` chart_inline 도구 + `data/md-builder/styles.yml` component_syntax 등재
    - `ComponentTest`에 수식·아이콘·차트 슬라이드 추가
* 검증: `node --test` 20/20 통과 (phase1 그룹 — katex·chartjs·fontawesome applied, ```chart fenced→`data-component` div, `:fa-name:`→`<i>` 코드 스팬 보존, `$$…$$`·`\(…\)` 마커 보존). `ComponentTest` 빌드 OK.

## Issue180. 슬라이드 구성요소 라이브러리 Phase 0 — 레지스트리·generic fenced 디스패처 인프라 (등록: 2026-05-20, 해결: 2026-05-20, commit: ef8baef) ✅
* 목적: 시각화 라이브러리 표의 미적용 항목 중 강의 코어 5종(수식·차트·아이콘·지도·인포그래픽)을 적용하기 위한 기반 인프라 구축. Phase 0는 레지스트리 + generic fenced 디스패처를 **신규 모듈·신규 경로로만** 추가하여 기존 코드(mermaid 경로·기존 4종 CDN 주입)를 비파괴로 유지. Phase 1·2의 단독 선행 의존.
* plan: `_doc_work/plan/slide-components_plan.md`
* task: `_doc_work/tasks/slide-components_task.md`
* 카테고리: Generator (`html-builder.js` 디스패처) + Build (레지스트리 인프라) + Asset (`component-libraries.yml`)
* 상세:
    - `_doc_arch/component-libraries.md` 신규 — 구현 아키텍처 SSOT (레지스트리 스키마·문법 컨벤션·디스패처 contract·파이프라인 배정)
    - `data/component-libraries.yml` 신규 — 라이브러리 메타 SSOT (코어 5종 + 기존 4종 status)
    - `lib/component-registry.js` + `lib/component-hooks/` 디렉토리 신설
    - `lib/html-builder.js` — generic fenced 디스패처 신설 (mermaid 경로 비파괴 공존) + 신규 라이브러리 조건 주입
    - `_doc_arch/authoring-pipeline.md` 트리 갱신
    - `Projects/ComponentTest/` 샘플 scaffold + `lib/__tests__/component-libraries.test.js` + fixtures 테스트 하니스
* 구현 명세:
    - additive 무회귀 원칙 — mermaid·markmap·기존 CDN 주입 코드 무수정. 회귀 0 구조적 보장
* 검증: `node --test` 20/20 통과 (phase0 그룹 — registry 파싱, planned→빈 주입, applied conditional detect 매칭, css→head/js→body, 미등록 fenced 무에러). `ComponentTest`·`m2SlideStyle1_single` 빌드 회귀 0. `data/component-libraries.yml`·`_doc_arch/component-libraries.md` SSOT는 `.gitignore` 예외 + force-add로 추적.

## Issue179. default_lec summary layout — 학습 정리·요약 전용 layout 분리 (등록: 2026-05-19, 해결: 2026-05-19, commit: 07b02b1) ✅
* 목적: 현재 `closing` layout이 Q&A·마무리·정리·요약을 모두 떠맡고 있어 강의 흐름상 "오늘 학습한 내용" 슬라이드가 closing(puffer1 거대 마스코트, 중앙 큰 타이틀, 축제 느낌) 디자인으로 표현됨. summary는 콘텐츠 가독성이 우선이므로 별도 layout 필요. graphify slide 17(`오늘 학습한 내용`)이 적용 대상.
* 카테고리: Theme (default_lec) + Generator (layout-selector / md-builder data)
* 상세:
    - 신규 layout: `theme/default_lec/layouts/9.2.summary.html` (class `layout-summary`, slots `title` + `content`)
    - `theme/default_lec/slide.css §4.7.5`: cat·butterfly 작은 코너 마스코트 + 좌정렬·top-align body, title 2.4em (closing 3.6em 대비 컴팩트)
    - `data/slot_meta.yml`: title/content layouts에 `9.2.summary` 추가
    - `data/layout-selector/rules.yml`: `closing_summary` 규칙을 `summary_recap`(정리·요약·학습한 내용·Recap → summary)과 `qna_closing`(마무리·Q&A·다음 단계·Closing → closing) 두 개로 분리
    - `data/md-builder/styles.yml`: `summary_next` pattern에 `layout_hint: summary` + triggers에 "학습한 내용", "복습", "recap", "review" 추가
    - 적용: `Projects/graphify/graphify.ppt.md` slide 17 `#layout-closing` → `#layout-summary`. slide 18(다음 단계)은 closing 유지
* 검증: graphify + m2SlideStyle1_single + m2SlideStyle2_chapter 빌드 회귀 없음. graphify slide 17 HTML 출력 `<section class="layout-summary">` + `summary-title` + `summary-body` 구조 확인 (file:// 17번 슬라이드 브라우저 검증)

## Issue178. graphify mermaid syntax — `[/graphify . 빌드]` 평행사변형 토큰 충돌 fix (등록: 2026-05-19, 해결: 2026-05-19, commit: 9f70f93) ✅
* 목적: graphify slide 15 (`코드베이스 탐색 워크플로`) mermaid 렌더 실패. 노드 라벨 `B[/graphify . 빌드]`의 `[/`가 평행사변형 시작 토큰으로 해석되나 종결 `/]` 없어 parser fail → 원본 텍스트 노출.
* 카테고리: Project (graphify content)
* 상세:
    - 파일: `Projects/graphify/graphify.md:210`, `graphify.ppt.md:232` (실제 빌드 source)
    - mermaid 노드 형태: `[text]` 사각형 / `[/text/]` 평행사변형 (시작·종결 슬래시 필요)
    - `B[/graphify . 빌드]` 시작 `[/`, 종결 `]` → 매칭 안 됨
    - 다른 mermaid 블록(라인 18·48·82·112)은 슬래시 없어 정상
* 구현 명세:
    - `B[/graphify . 빌드]` → `B["/graphify . 빌드"]` (따옴표 wrap)
    - mermaid 따옴표 내부 raw string 처리 → 슬래시·점·특수문자 안전
    - `./m2slide.sh graphify` 재빌드 후 slide 15 mermaid SVG 렌더 확인 완료

## Issue177. default_lec 전체 재구성 — default 구조 통일 + md-builder 단계 4 호환 (등록: 2026-05-19, 해결: 2026-05-19, commit: e501eed) ✅
* 목적: default 테마가 신버전(slide.css 1207L, Issue113/130/131/138/141/143/154/176 누적)으로 진화하면서 default_lec(774L)와 구조 불일치 발생. default_lec를 default 구조로 통일하고 강의 특화 부분만 override 레이어로 분리. 동시에 authoring-pipeline 단계 4(md-builder)가 default_lec 호환 슬라이드 패턴을 잘 생성하도록 styles.yml 정합.
* 카테고리: Theme (default_lec) + Generator (md-builder data)
* 상세:
    - **현재 불일치 (정밀 diff)**:
        - `_blank.html`: default `class="layout-_blank"` vs default_lec `class="layout-blank"` (underscore 불일치)
        - `_contents.html`: default `layout-_contents` vs default_lec `layout-contents`
        - `_contents_no_title.html`: default `layout-_contents_no_title` vs default_lec `layout-contents` (**BUG — 잘못된 class 부여**)
        - `_cover.html`: WIP `layout-cover` → `layout-_cover`
        - `_toc.html`: default는 markmap 전용 분리(Issue138), default_lec는 `toc-cards` 결합형 유지 → 분리 필요
        - `_cards.html`: default 신규 (Issue138), default_lec 누락
        - `_agenda.html`: 구조 차이 (instructor_name 위치, downloadButtons 위치)
        - `slide.css`: default 1207L, default_lec 774L — Issue113/130/131/138/141/143/154/176 백포팅 필요
    - **번호 layouts** (강의 특화): `2.2.contents-full`, `2.3.contents-split`, `4.2.chapter`, `6.1.exercise`, `6.2.exercise-small`, `9.1.closing` → 보존
    - **md-builder 단계 4**: `data/md-builder/styles.yml`의 `slide_patterns`에 강의 특화 패턴 추가 → layout-selector가 default_lec 번호 layouts로 매핑 가능
* 구현 명세:
    - **Issue177_1**: default_lec 시스템 layouts class 정규화 (`layout-_*` underscore 일관 적용) ✅
    - **Issue177_2**: `_contents_no_title.html` BUG 수정 (잘못된 class 교체) ✅
    - **Issue177_3**: `_cards.html` default_lec 추가 + `_toc.html` markmap 전용으로 분리 (Issue138 백포팅) ✅
    - **Issue177_4**: `_agenda.html` default 구조 동기화 (instructor_name·downloadButtons 위치) ✅
    - **Issue177_5**: `slide.css` 백포팅 — Mermaid SVG fit + Issue101 code-wrapper + _contents transparent + Issue138 toc-markmap hide ✅
    - **Issue177_6**: 번호 layouts 호환 점검 — base CSS와 충돌 없음 확인 ✅
    - **Issue177_7**: `data/md-builder/styles.yml`에 `chapter_intro` + `exercise_check` 패턴 추가 ✅
    - **Issue177_8**: 빌드 검증 — graphify(default_lec/single) + m2SlideStyle1_single + m2SlideStyle2_chapter + LayoutTest 모두 회귀 없음 ✅
* 검증:
    - graphify (default_lec): 모든 class underscore 정규화 확인 (`layout-_blank`, `layout-_contents`, `layout-_cover`, `layout-closing`, `layout-split-image-text`)
    - default 테마 3개 프로젝트: 회귀 없음
    - LayoutTest: `_cards` 포함 6개 시스템 layout 모두 렌더
    - 검토 페이지: `_doc_work/z_htm/issue177-review-1779192901.html`

## Issue176. default_lec contents-split layout — H2 title 미주입 + bullet 마커 중복 fix (등록: 2026-05-19, 해결: 2026-05-19, commit: 3786fd7) ✅
* 목적: `#layout-contents-split` 슬라이드에서 H2 제목이 split-header에 안 나타나고 본문 list 마커가 두 개씩(`•` + `●`) 보이던 회귀 수정. graphify 프로젝트 슬라이드 검증 중 발견.
* 카테고리: Theme (default_lec — 2.3.contents-split layout + slide.css)
* 상세:
    - 원인1 (title 누락): `2.3.contents-split.html` 템플릿이 `{{title}}` 사용하지만 slide-parser `extractFirstH1`은 H1만 매칭 → H2 슬라이드에서 `slide.title` 항상 빈 값
    - 원인2 (bullet 중복): base.css `.bullet-dot { list-style-type: disc }` (line 290) + `[class*="layout-"] ul > li::before "●"` (line 1106) 동시 적용. ul `list-style: none` 있어도 li 레벨 list-style-type이 disc 복귀시켜 native 마커 + ::before 마커 둘 다 렌더
* 구현 명세:
    - `theme/default_lec/layouts/2.3.contents-split.html`: `<h1 class="split-title">{{title}}</h1>` → `{{content}}` 치환. H2 자동 `<h2 class="title">` 변환되어 split-header 주입. slots 메타도 `title` → `content` 갱신
    - `theme/default_lec/slide.css`: `.layout-split-image-text .split-header > h2.title, > h3.title { margin: 0 auto }` 위치 보정만 추가. font-size·sketch 효과는 base.css `.reveal .title` (1.5em) + §3 통합 selector에서 자연 상속
    - `theme/default_lec/slide.css`: `section[class*="layout-"] li.bullet-dot, li.bullet-dash { list-style-type: none }` 글로벌 layout 영역 적용. `ul > li::before`가 마커 SSOT, native list-style 무력화
    - base.css 미수정 (theme 단독 fix)
* 검증:
    - 빌드 `./m2slide.sh graphify` 성공
    - `Projects/graphify/slide/index.html` 라인 1469 `<h2 class="title">graphify가 해결하는 문제</h2>` 정상 split-header 주입
    - bullet 단일 마커 (`●` 만) 렌더

## Issue175. Info.md `design_mood` 필드 추가 — 그래픽 디자인 톤 SSOT (등록: 2026-05-19, 해결: 2026-05-19, commit: fd6f458) ✅
* 목적: `image_style`(AI 이미지 한정)과 별개로, 슬라이드 전반의 시각 디자인 톤(ex: "라이트 테마, 밝은 분위기, 파스텔 컬러")을 사전 수집할 자유 문자열 필드를 미디어 계획 섹션에 추가. theme 선택·layout 추천·미디어 생성 모두 hint로 소비.
* 카테고리: Build (파이프라인 SCAR — info-filler 데이터-주도)
* 상세:
    - 필드명: `design_mood` (단일 자유 문자열, default 빈 값)
    - 위치: Info.md 미디어 계획 H1 섹션, `image_style` 위
    - 사용자 결정 (2026-05-19 HTML form): 미디어 계획 / design_mood / 단일 자유 문자열
* 구현 명세:
    - `data/Info.template.md` 미디어 계획 섹션에 `* design_mood:` 라인 추가 (`image_style` 위)
    - `data/info-filler/questions.yml` `media_options[]` 에 `id: design_mood` entry 추가 (default `""`, example `"라이트 테마, 밝은 분위기, 파스텔 컬러"`)
    - `_doc_arch/info.md` "미디어 계획" 표에 `design_mood` 행 추가 + 단계별 사용 표에 hint 명시 (agenda-designer/layout-selector/media-creater 참고)
    - `data/media-creater/tools.yml` `info_field_map` 신규 섹션 (style/color_tone placeholder → Info.md `image_style`/`design_mood` 매핑, fallback chain 정의) + spec_template 주석 갱신
    - `data/layout-selector/rules.yml` theme_discovery 섹션에 design_mood hint 주석 (LLM agent theme 후보 선정 시 참고)
    - `.gitignore` data/Info.template.md SSOT 추적 예외 추가 (`!/data/Info.template.md`)
    - SCAR 본문 하드코딩 없음 (info-filler agent는 yml만 Read하므로 agent.md 변경 불필요)

## Issue174. slot-designer 데이터-주도 SCAR 전환 (등록: 2026-05-19, 해결: 2026-05-19) ✅
* 목적: Issue169 info-filler 패턴을 slot-designer agent에 적용. `data/slot-designer/patterns.yml`을 SSOT로 하는 데이터-주도 SCAR로 전환. **단계 3~7 SCAR 전환 마무리** — 단계 1~7 데이터-주도 SCAR 전환 종료.
* 카테고리: Build (파이프라인 SCAR)
* depends: Issue173 ✅
* 산출물:
    - `.claude/agents/slot-designer.md` — 3개 신규 절(데이터 로드 / 적용 알고리즘 / 확장 지점) 추가 + 본문 하드코딩(layout↔slot 매핑 표·매칭 휴리스틱·검증 체크리스트·체크포인트 메시지) 제거 → yml 참조로 대체
    - `data/slot-designer/patterns.yml` v2 — 12개 최상위 키 (`catalog_priority[]`/`layout_slot_map`/`match_rules`/`content_split_rules[]`/`preservation_policy`/`processing_policy`/`placeholder_discovery`/`validation_rules[]`/`checkpoint`/`report_template`/`out_of_scope[]`)
    - `_doc_arch/authoring-pipeline.md` 단계 7 표 ⏳ → ✅ Issue174 갱신 + "# 후속 작업" 절 마무리 (5개 SCAR → 0개)
* 검증:
    - YAML parse OK (12 keys)
    - SCAR 3개 신규 절 존재
    - 하드코딩 제거 확인
    - 회귀 빌드 OK (`./m2slide.sh m2SlideStyle1_single`, `m2SlideStyle2_chapter`)
* 후속: 단계 1~7 SCAR 전환 종료. 단계 8 m2slide.sh는 스크립트, 단계 9 md2tts-txt는 글로벌 룰이라 SCAR 전환 대상 외.

## Issue173. layout-selector 데이터-주도 SCAR 전환 (등록: 2026-05-19, 해결: 2026-05-19) ✅
* 목적: Issue169 info-filler 패턴을 layout-selector agent에 적용. `data/layout-selector/rules.yml` + `overrides/`를 SSOT로 하는 데이터-주도 SCAR로 전환.
* 카테고리: Build (파이프라인 SCAR)
* depends: Issue172 ✅
* 산출물:
    - `.claude/agents/layout-selector.md` — 3개 신규 절(데이터 로드 / 적용 알고리즘 / 확장 지점) 추가 + 본문 하드코딩(슬라이드 패턴 표·Semantic 신호·휴리스틱 임계값·실행 제약) 제거 → yml 참조로 대체
    - `data/layout-selector/rules.yml` v2 — 14개 최상위 키 (`priority_policy`/`pattern_rules[]`/`thresholds`/`theme_discovery`/`auto_detection_delegation`/`output_format`/`ppt_md_generation`/`preservation_rules`/`validation_rules`/`checkpoint`/`execution_constraints`/`report_template`/`overrides`)
    - `_doc_arch/authoring-pipeline.md` 단계 6 표 ⏳ → ✅ Issue173 갱신
* 검증:
    - YAML parse OK (14 keys)
    - SCAR 3개 신규 절 존재
    - 하드코딩 제거 확인
    - 회귀 빌드 OK (`./m2slide.sh m2SlideStyle2_chapter`)
* 후속: Issue174 (slot-designer, 단계 7 마지막)

## Issue172. media-creater 데이터-주도 SCAR 전환 (등록: 2026-05-19, 해결: 2026-05-19) ✅
* 목적: Issue169 info-filler 패턴을 media-creater agent에 적용. `data/media-creater/tools.yml`을 SSOT로 하는 데이터-주도 SCAR로 전환.
* 카테고리: Build (파이프라인 SCAR)
* depends: Issue171 ✅
* 산출물:
    - `.claude/agents/media-creater.md` — 3개 신규 절(데이터 로드 / 적용 알고리즘 / 확장 지점) 추가 + 본문 하드코딩(시각화 패턴 매핑 표·생성 명세 양식·체크포인트 메시지) 제거 → yml 참조로 대체
    - `data/media-creater/tools.yml` v2 — 10개 최상위 키 (`tools[]`/`content_pattern_rules[]`/`processing_policy`/`spec_template`/`validation_rules[]`/`stock_sources[]`/`checkpoint`/`report_template`/`video_policy`)
    - `_doc_arch/authoring-pipeline.md` 단계 5 표 ⏳ → ✅ Issue172 갱신
* 검증:
    - YAML parse OK (10 keys)
    - SCAR 3개 신규 절 존재
    - 하드코딩 제거 확인
    - 회귀 빌드 OK (`./m2slide.sh m2SlideStyle1_single`)
* 후속: Issue173~174 (layout-selector/slot-designer)

## Issue171. md-builder 데이터-주도 SCAR 전환 (등록: 2026-05-19, 해결: 2026-05-19) ✅
* 목적: Issue169 info-filler 패턴을 md-builder skill에 적용. `data/md-builder/styles.yml`을 SSOT로 하는 데이터-주도 SCAR로 전환.
* 카테고리: Build (파이프라인 SCAR)
* depends: Issue170 ✅
* 산출물:
    - `.claude/skills/md-builder/SKILL.md` — 3개 신규 절(데이터 로드 / 적용 알고리즘 / 확장 지점) 추가 + 본문 하드코딩(슬라이드 유형별 본문 패턴 표·검증 체크리스트·체크포인트 메시지) 제거 → yml 참조로 대체
    - `data/md-builder/styles.yml` v2 — 11개 최상위 키 (`styles[]`/`style_selection_rules[]`/`slide_patterns[]`/`content_limits`/`md_rules_compliance[]`/`checkpoint`/`validation_rules`/`header_preservation`/`layout_meta_policy`/`report_template`)
    - `_doc_arch/authoring-pipeline.md` 단계 4 표 ⏳ → ✅ Issue171 갱신
* 검증:
    - YAML parse OK (11 keys)
    - SCAR 3개 신규 절 존재
    - 하드코딩 제거 확인
    - 회귀 빌드 OK (`./m2slide.sh m2SlideStyle2_chapter`)
* 후속: Issue172~174 (media-creater/layout-selector/slot-designer)

## Issue170. agenda-designer 데이터-주도 SCAR 전환 (등록: 2026-05-19, 해결: 2026-05-19) ✅
* 목적: Issue169 info-filler 패턴을 agenda-designer agent에 적용. `data/agenda-designer/patterns.yml`을 SSOT로 하는 데이터-주도 SCAR로 전환.
* 카테고리: Build (파이프라인 SCAR)
* depends: Issue169 ✅ (commit 2529153)
* 산출물:
    - `.claude/agents/agenda-designer.md` — 3개 신규 절(데이터 로드 / 적용 알고리즘 / 확장 지점) 추가 + 본문 하드코딩(mode 판정 표·챕터 수 권장 표·기본 outline 10단계·산출물 템플릿) 제거 → yml 참조로 대체
    - `data/agenda-designer/patterns.yml` v2 — 9개 최상위 키 (`mode_decision`/`chapter_count`/`default_outline`/`patterns[]`/`selection_rules[]`/`templates`/`file_naming`/`validation_rules`/`checkpoint`/`report_template`)
    - `_doc_arch/authoring-pipeline.md` 단계 3 표 ⏳ → ✅ Issue170 갱신
* 검증:
    - YAML parse OK (11 keys)
    - SCAR 3개 신규 절 존재 확인
    - 하드코딩 제거 확인 (mode 판정 표·outline 10단계 grep 0건)
    - 회귀 빌드 OK (`./m2slide.sh m2SlideStyle1_single`)
* 후속: Issue171~174 (md-builder/media-creater/layout-selector/slot-designer)

## Issue169. info-filler v2 패턴 전환 — 데이터-주도 SCAR (등록: 2026-05-19, 해결: 2026-05-19, commit: 2529153) ✅
* 목적: Issue166 refs-collector reference 패턴을 info-filler agent에 적용. `data/info-filler/questions.yml`을 SSOT로 하는 데이터-주도 SCAR로 전환.
* 카테고리: Build (파이프라인 SCAR)
* depends: Issue166 ✅ (commit dac9db9)
* 산출물:
    - `.claude/agents/info-filler.md` — 3개 신규 절(데이터 로드 / 적용 알고리즘 / 확장 지점) 추가 + 본문 하드코딩(7개 필드 표·선택 옵션 4개 섹션 명세) 제거 → yml 참조로 대체
    - `data/info-filler/questions.yml` — v2 스키마 9개 최상위 키 (`planning`/`build_options`/`media_options`/`output_options`/`dependencies`/`tts_text_rules`/`validation_rules`/`interview_policy`/`report_template`)
    - `_doc_work/tasks/authoring-pipeline_task.md` — 단계 1 SCAR 전환 표 ⏳ → ✅ Issue169 갱신
* 검증:
    - 단위 7/7 PASS (yml 스키마 + SCAR 절 존재 + 하드코딩 제거 확인)
    - 회귀 빌드 OK (`./m2slide.sh m2SlideStyle1_single`)
* 후속:
    - Issue165 umbrella 남은 5개 SCAR 전환 (agenda-designer, md-builder, media-creater, layout-selector, slot-designer)

## Issue168. authoring-pipeline v1/v2 명명 제거 — 단일 SSOT 일원화 (등록: 2026-05-18, 해결: 2026-05-18, commit: d8f0a65) ✅
* 목적: v1 실사용 없음. v1/v2 명명 전면 폐기. `authoring-pipeline_v2.md` → `authoring-pipeline.md`로 통합. 기존 deprecation stub 삭제. 본문·참조에서 모든 v1/v2 라벨 제거.
* 카테고리: Build (파이프라인 인프라)
* 산출물:
    - `_doc_arch/authoring-pipeline.md` — 단일 SSOT (v2 파일 rename)
    - 구 v1 deprecation stub `_doc_arch/authoring-pipeline.md` 삭제
    - 모든 참조 일괄 갱신 (plan/task/report/SCAR/Issue.md)
    - 본문 v1/v2 라벨 정리 (frontmatter name·H2·표 컬럼·후보 라벨)
    - report: `_doc_work/report/authoring-pipeline-naming-unification_issue168_report.md`
* 검증:
    - 단위 7/7 PASS
    - 회귀 빌드 OK
    - 작동 문서 v1/v2 라벨 grep 결과 0건
* 후속:
    - 6개 SCAR 데이터-주도 패턴 전환 (각 단계별 별도 이슈)
    - Issue166/167 역사적 plan/task/report 파일은 보존

## Issue167. authoring-pipeline v1 제거 — v2 단독 SSOT 통합 (등록: 2026-05-18, 해결: 2026-05-18, commit: d4ca868) ✅
* 목적: v2(Issue166)로 데이터-주도 SCAR + `Projects/<Name>/_pipeline/` 영속 추적 완비됨. v1과 병존 시 fallback 경로 + dual SSOT 유지 부담 → v1 완전 제거하고 v2를 단독 SSOT로 통합.
* 카테고리: Build (파이프라인 인프라)
* 산출물:
    - `_doc_arch/authoring-pipeline.md` (549 → 49 lines) — deprecation notice + v2 redirect 표
    - `_doc_arch/authoring-pipeline.md` 확장 — 단계 1~9 상세 명세 통합 (자기-완결)
    - SCAR 갱신: `.claude/commands/m2.md`, `.claude/agents/authoring-pipeline.md` — v1 fallback 라벨 제거
    - plan/task: "v1 시대 참고" → "보조 arch" 절로 재정의
    - report: `_doc_work/report/authoring-pipeline-v1-deprecation_issue167_report.md` 신규
* 검증:
    - 단위 7/7 PASS
    - v1 ref 잔존 = deprecation notice·역사적 기록(report) 한정
    - SSOT/SCAR/plan에서 v1 코드/운영 ref 0건

## Issue165. `/m2` 라우터 기준 authoring-pipeline 단계 1~9 전체 통합 추적 umbrella task (등록: 2026-05-18, 해결: 2026-05-18, commit: f704852) ✅
* 목적: Issue157 umbrella를 승계하여 Issue164(`/m2` 라우터) + Issue166(v2 인프라) 완료 후의 매핑 기준으로 plan/task 재정렬.
* depends: Issue166 ✅ (commit dac9db9)
* 산출물:
    - `_doc_work/plan/authoring-pipeline_plan.md` 갱신 — v2 진입점 절 + 단계별 매핑 표에 data 폴더/artifacts 경로/SCAR v2 전환 컬럼 추가
    - `_doc_work/tasks/authoring-pipeline_task.md` 갱신 — v2 SCAR 전환 추적 표 신설
    - `_doc_work/report/authoring-pipeline_issue165_report.md` 신규
* 후속:
    - 6개 SCAR(info-filler, agenda-designer, md-builder, media-creater, layout-selector, slot-designer) v2 패턴 전환 후속 이슈 (각 단계별)
    - 본 umbrella는 후속 이슈 종결 시마다 v2 전환 추적 표 ⏳ → ✅ 갱신 의무

## Issue166. authoring-pipeline v2 구현 — 데이터-주도 SCAR + /pm 무중단 History/Artifacts (등록: 2026-05-18, 해결: 2026-05-18, commit: dac9db9) ✅
* 목적: [v2 SSOT](_doc_arch/authoring-pipeline.md) 3가지 핵심 변경(데이터-주도 SCAR / Info.md=사용자 요청 SSOT / `/pm` 무중단 History·Artifacts) 통합.
* 카테고리: Build (파이프라인 인프라)
* 산출물:
    - `_doc_arch/authoring-pipeline.md` — v2 SSOT 설계
    - `data/{info-filler,refs-collector,agenda-designer,md-builder,media-creater,layout-selector,slot-designer}/` — 단계별 시드 yml 7종
    - `lib/pipeline-state.js` — state.yml 관리 + lock
    - `lib/pipeline-history.js` — append-only 로그
    - `lib/pipeline-artifacts.js` — 단계별 스냅샷
    - `.claude/commands/m2.md`, `.claude/agents/authoring-pipeline.md`, `.claude/agents/refs-collector.md` 갱신 (refs-collector는 v2 패턴 reference)
    - `_doc_work/plan/authoring-pipeline-v2_plan.md`, `_doc_work/tasks/authoring-pipeline-v2_task.md`
    - report: `_doc_work/report/authoring-pipeline-v2_issue166_report.md`
* 검증:
    - 단위 7/7 PASS (`lib/__tests__/pipeline-v2.test.js`)
    - 통합 `Projects/v2test/` end-to-end — state.yml/history.md/artifacts/ 정상 생성
    - 회귀 `m2SlideStyle1_single` 빌드 — 변화 없음
* 후속:
    - Issue165 depends에 본 이슈 추가 → 종결과 함께 해소 → Issue165 진행 가능
    - 나머지 6개 SCAR v2 패턴 전환은 각 단계별 후속 이슈

## Issue164. authoring-pipeline 진입점 `/m2` 라우터 커맨드 신규 (등록: 2026-05-18, 해결: 2026-05-18, commit: f2b2b5e) ✅
* 목적: authoring-pipeline 단계 1~9를 손쉽게 시작·재개·부분 실행하는 단일 진입점을 Git-style subcommand 패턴(`/m2 init|continue|run|build|status|list`)으로 제공. mental model 단순화 + 플래그 폭주 회피.
* 카테고리: Build (커맨드·진입점)
* 산출물:
    - `.claude/commands/m2.md` — 단일 라우터 커맨드 (sonnet)
    - `_doc_arch/authoring-pipeline.md` — "작업 진입점 — /m2 라우터 커맨드" 섹션 + 관련 작업 표 갱신
    - `noteForHuman.md` — "Usage — /m2 라우터 커맨드" 섹션 (subcommand 일람·시나리오·기존 진입점 관계)
* 구현 요약:
    - 6 subcommand: `init`/`continue`/`run`/`build`/`status`/`list` + `--help`
    - resume 자동 감지: 10단계 산출물 검사 (Info.md → refs/ → AGENDA.md → *.md 본문 → img/ → *.ppt.md → slot → slide/*.html → *.txt+*.tts.txt)
    - 위임 우선: 실제 단계 작업은 `.claude/agents/authoring-pipeline.md` orchestrator agent의 `--from-stage`/`--to-stage`에 매핑. 라우터는 인자 파싱·resume 감지·위임만 담당
    - 기존 진입점 호환: `./m2slide.sh` ≡ `/m2 build`, `/new-project` (글로벌) → `/m2 init` 내부 호출
* 검증:
    - 산출물 4종 존재 확인 (command/SSOT/Usage/Issue 엔트리)
    - 참조 cross-link grep 확인 (`/m2` 18건 noteForHuman, 24건 SSOT)
    - 커맨드 spec — 빌드/UI 변경 없음 → apply-verify 미발동
* 후속:
    - umbrella 승계: Issue165 (단계별 추적 + `/m2` subcommand 컬럼 추가 예정)
    - 단계별 agent/skill 미구현 단계는 stub 모드 (Issue157 → Issue165 추적)

## Issue157. authoring-pipeline 단계 1~9 전체 통합 추적 umbrella task (등록: 2026-05-17, 해결: 2026-05-18, 승계: Issue165) ✅
* 목적: `_doc_arch/authoring-pipeline.md` 10단계 중 m2slide 책임 영역(단계 1~9) 전체 구현 상태를 단일 산출물에서 추적하는 umbrella plan/task 신규.
* 결과: Issue164 `/m2` 라우터 커맨드 신규로 운영 진입점이 orchestrator agent에서 라우터 subcommand로 전환됨에 따라 본 umbrella는 Issue165로 승계. 매핑 표·추적 정책은 Issue165에서 `/m2` subcommand 컬럼 추가로 재정렬.
* 산출물: `_doc_work/plan/authoring-pipeline_plan.md`, `_doc_work/tasks/authoring-pipeline_task.md` (Issue165가 계속 갱신)
* 카테고리: Project (nPTiR 메타 추적)
* 종결 사유: 운영 진입점 변경에 따른 추적 기준 재수립 → Issue165 승계

## Issue156. new-project SCAR 업데이트 + authoring-pipeline 오케스트레이션 agent 추가 (등록: 2026-05-17, 해결: 2026-05-17, commit: 624d201) ✅
* 목적: `_doc_arch/authoring-pipeline.md` 단계 1~9 전체 프로세스를 자동으로 이어 진행하는 orchestrator agent 신규 + 글로벌 `/new-project` SCAR가 m2slide 타입 프로젝트 초기화 시 본 agent를 연결하도록 업데이트. Issue155로 단계 6이 운영 전환되어 전 단계가 agent/skill로 채워질 준비가 되었으므로 파이프라인 전체를 한 번에 구동할 진입점 마련.
* depends: Issue155 ✅ (commit 4d82d13), Issue157 ⏳ (선행 권고였으나 선행 누락 — 본 이슈 종결 후 사용자 회고 지적. 후속 운영에서 Issue157 umbrella plan/task의 매핑 표가 본 orchestrator의 단계별 위임 대상 SSOT로 작동해야 하므로, Issue157 완료 시 orchestrator의 "단계별 위임 매핑" 표를 Issue157 plan과 동기화 검증 필요)
* 카테고리: Generator (agent) + Project (SCAR)
* 해결:
    - `.claude/agents/authoring-pipeline.md` 신규 (sonnet model) — 단계 1~9 순차 실행 orchestrator. system prompt 8개 섹션 (핵심 원칙·입력·위임 매핑·핵심 절차·자율 작업 제약·검증·Out of Scope·참고). 위임 매핑 표로 운영(6·8·9) / todo(1·2·3·4·5·7) 단계 분류
    - 단계별 위임 대상: 6=`layout-selector` agent (Issue155), 8=`m2slide.sh` script, 9=`md2tts` agent. todo 단계는 stub 모드 (산출물 존재 시 검증만, 없으면 사용자 수동 작성 안내)
    - 사람 체크포인트: 단계 4 md 생성, 단계 5 media, 단계 7 slot designer 종료 후 사용자 검토 요청 (`--no-checkpoint`로 생략 가능)
    - 산출물 검증 게이트: 단계별 존재·무결성 확인 후 다음 단계 진입. 단계 6 `./run.sh --lint-config` / 단계 8 `slide/*.html` placeholder grep / 단계 9 `wc -l` 일치
    - 실패 정책: 1회 재시도 후 중단 + 사용자 보고 (Opus 4.7 실행 제약 준수)
    - 진행 로그: `_doc_work/pipeline/<Name>_run_<timestamp>.md`에 단계별 시작·종료·산출물·검증 결과 기록
    - `_doc_arch/authoring-pipeline.md` "오케스트레이터" 절 신설 (개요 직후) — 위치·책임·입력·체크포인트·로그·운영/todo 분류·실패 정책·글로벌 SCAR 분리 명시
* Walkthrough:
    - 검증: `./run.sh --lint-config` 8 프로젝트 ✓ / `./run.sh --lint-layouts` 19/19 메타 valid (회귀 없음)
    - agent 파일 frontmatter 정상 (sonnet, tools: Read/Write/Edit/Bash/Glob/Grep/Task, color: blue)
    - SSOT 백링크 검증: `_doc_arch/authoring-pipeline.md` grep "Issue156" 1건 + agent 파일 grep "authoring-pipeline" 8건
    - 문서 영향만 — 빌드 산출물 변경 없음 (apply-verify-rules 예외 조항: 마크다운·문서 파일 수정만)
* Out of scope (별 이슈로 분리):
    - 단계 1~5·7의 개별 agent/skill 구현 (info-filler, refs-collector, agenda-designer, md-builder, media-creater, slot-designer)
    - 글로벌 `/new-project` SCAR 실제 수정 — `~/.claude/Issue.md`로 분리 (글로벌 SCAR 변경 규칙 준수)
    - 단계 10 (videoMaker 영상 렌더링) 통합 — `run.sh`가 별도 진입점
    - 병렬 단계 실행 (v2 후보)
    - 단계별 산출물의 git commit 자동화
* 영향: authoring-pipeline 단계 진입점 단일화. m2slide 타입 신규 프로젝트 onboarding 자동화 기반 마련. 단계 1~5·7 후속 agent 구현 시 본 orchestrator의 위임 매핑 표만 갱신하면 즉시 통합 가능.

## Issue163. authoring-pipeline 단계 7 — slot-designer agent 신설 (등록: 2026-05-17, 해결: 2026-05-17, commit: acb4816) ✅
* 산출: `.claude/agents/slot-designer.md` (sonnet) — `.ppt.md` 슬라이드별 layout 메타 read → slot fenced div 자동 매핑. data/slot_*.yml 4종 카탈로그 활용. 사용자 수동 slot 보존.
* depends: Issue155 (단계 6 layout-selector + `.ppt.md`)
* 검증: frontmatter 5필드, 카탈로그 4종 read, 빌드 후 placeholder 미잔존 grep 정책 명세화

## Issue162. authoring-pipeline 단계 5 — media-creater agent 신설 (등록: 2026-05-17, 해결: 2026-05-17, commit: acb4816) ✅
* 산출: `.claude/agents/media-creater.md` (sonnet) — 본문 분석 → mermaid 인라인 삽입 / img placeholder + 생성 명세 / excalidraw 별도 파일. gemini-image-describer 등 외부 스킬 위임 정책 명세화.
* depends: Issue161
* 보조: `make-mermaid`, `excalidraw-diagram`, `mermaid-diagram` 스킬 위임 표

## Issue161. authoring-pipeline 단계 4 — md-builder skill 신설 (등록: 2026-05-17, 해결: 2026-05-17, commit: acb4816) ✅
* 산출: `.claude/skills/md-builder/SKILL.md` — AGENDA 골격 + refs/ 기반 슬라이드 본문 자동 작성. 사람 검토 체크포인트, 빌드 lint 실패 시 1회 자동 수정.
* depends: Issue160
* 준수: md-rules + md-slide-rules + md-m2slide-rules 3단계 규칙 + release-date-rules 자동 갱신

## Issue160. authoring-pipeline 단계 3 — agenda-designer agent 신설 (등록: 2026-05-17, 해결: 2026-05-17, commit: acb4816) ✅
* 산출: `.claude/agents/agenda-designer.md` (sonnet) — Info.md + refs/ → AGENDA.md(chapter) 또는 single skeleton 자동 작성. 분량·goals 기반 mode 자동 판정.
* depends: Issue159
* 규칙: chapter mode 인라인 링크 형식(`## [제목](./파일.md)`), single mode frontmatter `type: ppt` 검증

## Issue159. authoring-pipeline 단계 2 — refs-collector agent 신설 (등록: 2026-05-17, 해결: 2026-05-17, commit: acb4816) ✅
* 산출: `.claude/agents/refs-collector.md` (sonnet) — Info.md refs_seed → WebSearch + WebFetch → Projects/<Name>/refs/*.md 적재 + refs.md 인덱스 자동 갱신. 글로벌 refs-rules 준수.
* depends: Issue158
* 위임: `scrap` skill, `gemini-scrapper`, `obsidian-cli` 가용 시 우선 활용

## Issue158. authoring-pipeline 단계 1 — info-filler agent 신설 (등록: 2026-05-17, 해결: 2026-05-17, commit: acb4816) ✅
* 산출: `_doc_arch/info.md` SSOT (Info.md 스키마 7개 H1 섹션) + `.claude/agents/info-filler.md` (sonnet) — 인터뷰형 대화로 Info.md 자동 생성. 후속 단계 입력 SSOT.
* depends: Issue157 (umbrella)
* 검증: frontmatter 3필드 + 본문 7개 H1 섹션 + 필수 필드(주제·청중·분량) 비어있지 않음

## Issue155. m2slide layout-selector LLM agent 구현 (단계 6) (등록: 2026-05-17, 해결: 2026-05-17, commit: 4d82d13) ✅
* 목적: `_doc_arch/authoring-pipeline.md` 단계 6 (layout selector)를 LLM agent로 구현. 슬라이드 소스 `.md` → `.ppt.md` 파생본 변환, 각 슬라이드에 `#layout-*` 메타 주입. PowerPoint Designer 추천 능력을 markdown SSOT + reveal.js 출력에 이식.
* plan: `_doc_work/plan/layout-selector-agent_plan.md`
* task: `_doc_work/tasks/layout-selector-agent_task.md`
* depends: Issue154 ✅ (commit 605e479)
* 카테고리: Generator (agent)
* 해결:
    - `.claude/agents/layout-selector.md` 신규 (sonnet model) — system prompt 7개 섹션 (핵심 원칙·1~8단계 절차·보존 규칙·자율 작업 제약·검증·Out of Scope·참고). 동적 layout 카탈로그 로드, 자동 감지 위임, 사용자 수동 메타 보존, JSON 출력.
    - `lib/layout-selector-applier.js` 신규 (146줄) — `applyLayoutSelection()` API. Frontmatter 보존, 슬라이드 분리, 수동 메타 detect, 메타 주입 위치 (Issue117_1 디렉티브 영역 규약), `--force`/`--skip` 플래그
    - `lib/generate-slides.js` `_preferPptMd()` 추가 — `<X>.ppt.md` 존재 시 `<X>.md` 대체 (single + chapter 모드)
    - `bin/m2slide-layout-selector.sh` CLI wrapper
    - `lib/__tests__/layout-selector-applier.test.js` 18 단위 테스트 통과
    - `_doc_arch/authoring-pipeline.md` 단계 6 운영 갱신
* Walkthrough:
    - dry-run 검증: `Projects/m2SlideStyle1_single/m2SlideStyle.md` (34 슬라이드) → agent JSON 추천 → `lib/layout-selector-applier`로 `.ppt.md` 생성 → `m2slide.sh m2SlideStyle1_single` 빌드 성공 → HTML class 분포 `layout-_cover 11`, `layout-_contents 23`, `layout-_blank 1` 합리적
    - 회귀: 모든 단위 테스트 30/30 통과 (`layout-meta-parser 12` + `layout-selector-applier 18`)
    - 빌드 회귀: `m2SlideStyle2_chapter`, `LayoutTest` 빌드 성공
    - `./run.sh --lint-layouts` 19/19 메타 valid 유지
* Out of scope (별 design 또는 후속 plan):
    - 단계 7 slot designer 통합 — Issue156 orchestrator 후속 별 design
    - `#transition-*`·`#background-*` 디렉티브 추천 (v2 후보)
    - `m2slide.sh --auto-layout` 통합 호출 (별 plan)
    - cover 자동 주입(Issue49)과의 상호작용 변경
    - 챕터 간 layout 일관성 검증 (v2)
    - 실제 LLM 비결정성 회귀 fixture + 비용 실측 (dogfooding 단계)
    - 멀티 평가자 rubric (v2)
* 영향: authoring-pipeline 단계 6 todo → 운영 전환. Issue156(orchestrator agent + /new-project SCAR) unblock.

## Issue154. theme HTML layout 파일에 description frontmatter 주입 (등록: 2026-05-17, 해결: 2026-05-17, commit: 605e479) ✅
* 목적: `theme/{default,default_lec}/layouts/*.html` 각 layout에 표준화된 메타(description, recommended_for, slots, example)를 HTML 주석 `<!-- @meta ... -->` 형식으로 주입. 후속 Issue155 layout-selector LLM agent의 layout discovery 입력 품질 보장 선행 작업.
* plan: `_doc_work/plan/layout-description-frontmatter_plan.md`
* task: `_doc_work/tasks/layout-description-frontmatter_task.md`
* 카테고리: Theme
* 해결:
    - `lib/layout-meta-parser.js` 신규 — zero-dep mini-YAML parser (parseLayoutMeta/loadAllLayouts), 메타 누락 시 silent fallback, YAML 오류 시 throw
    - `lib/lint-layouts.js` + `run.sh --lint-layouts` 플래그 — 모든 `theme/*/layouts/*.html` @meta 검증, rc=0/1
    - `lib/layout.js` `_stripMetaBlock()` — 빌드 시 @meta 블록을 layout 템플릿에서 제거 (산출 HTML에 노출 안 함)
    - `theme/default/layouts/*.html` 7개 + `theme/default_lec/layouts/*.html` 12개 = 총 19개 layout에 @meta 주입
    - `_doc_arch/theme_layout.md` §16 신설 (스키마·작성 정책·fallback·검증)
    - `_doc_arch/authoring-pipeline.md` 단계 6 입력에 @meta 참조 추가
    - `lib/__tests__/layout-meta-parser.test.js` 12 단위 테스트 통과
* Walkthrough:
    - 검증: `node --test lib/__tests__/layout-meta-parser.test.js` 12/12 통과
    - `./run.sh --lint-layouts` 19/19 메타 valid, `./run.sh --lint-config` 회귀 없음
    - 3개 대표 프로젝트(`m2SlideStyle1_single`, `m2SlideStyle2_chapter`, `LayoutTest`) 빌드 성공
    - HTML 산출물에 @meta 누출 없음 (`grep -c "@meta" slide/*.html` = 0)
    - HTML `class="layout-*"` 적용 정상 (m2SlideStyle1_single index.html 45회)
* 영향: 후속 Issue155 unblock (layout-selector agent의 layout discovery 입력 품질 보강)

## Issue153. authoring-pipeline.md에 slot 카탈로그 4 yml + 통합 guide 반영 (등록: 2026-05-16, 해결: 2026-05-16, commit: 94cbef1) ✅
* 목적: Issue148~152로 추가된 `data/slot_*.yml` 4 SSOT + `_doc_arch/slot_guide.md` 통합 가이드를 저작 파이프라인 문서(`authoring-pipeline.md`)에 반영.
* 카테고리: Project (docs)
* 해결:
    - 단계 6 (layout selector) layout 화이트리스트 안내 옆에 slot 카탈로그 4 yml + 통합 guide 링크 추가
    - 단계 7 (slot designer) "산출물" 절에 inline class syntax(Pandoc/reveal) 두 형식 명시
    - 단계 7에 "슬롯 카탈로그 (SSOT)" 표 신설 — 4 카테고리(meta/pandoc/animation/user) 각 yml 링크 + 대상 설명
    - 단계 7 "도구"·"검증"에 Pandoc 예약명 충돌 차단(`PANDOC_LAYOUT_RESERVED`) + animation 테스트(30 케이스) 명시
    - 문서 끝 "참조" 섹션에 theme/theme_layout + slot 4 yml + 통합 guide 링크 추가
* Walkthrough:
    - 코드 미수정 — 빌드 영향 없음
    - 문서 일관성: slot 4 yml은 항상 통합 guide와 함께 노출, 책임 분리(m2slide syntax vs reveal.js 클래스 효과)는 slot_guide.md가 단독 소유
* 영향 범위: _doc_arch/authoring-pipeline.md (ignored)

## Issue152. slot_animation.yml에서 reveal.js 자체 fragment 클래스 카탈로그 제거 (등록: 2026-05-16, 해결: 2026-05-16, commit: 5fbe41a) ✅
* 목적: `data/slot_animation.yml`은 m2slide가 직접 처리하는 inline class syntax만 정의. reveal.js 자체가 옵션으로 처리하는 fragment 클래스 카탈로그(`fragment`/`fade-up`/`grow`/`highlight-*` 등 15개)는 m2slide 책임 아님 → 제거. `Projects/animationTest/animationTest.md` L55-57처럼 진짜 슬롯 애니메이션 syntax만 포함.
* 카테고리: Project (data/, docs)
* 해결:
    - `data/slot_animation.yml`에서 `fragment_classes:` 섹션 제거 (15개 reveal 표준 클래스 목록)
    - 책임 분리 주석 추가 — "m2slide(이 파일): inline class 추출·주입 syntax / reveal.js: 클래스 자체 시각 효과"
    - syntax/protection_rules/applies_to/tests 유지 — m2slide 파서 책임 영역
    - `_doc_arch/slot_guide.md` "reveal.js 표준 fragment 클래스 카탈로그" 절 제거
    - 책임 분리 인용블록 + L55-57 예시로 교체 + reveal 공식 링크 안내
* Walkthrough:
    - yml `yaml.safe_load` 통과 (keys: schema_version/category/last_updated/syntax/protection_rules/applies_to/tests, `fragment_classes` 없음)
    - syntax 2건 유지 (Pandoc + reveal_element)
    - 코드 미수정 — 빌드 영향 없음
* 영향 범위: data/slot_animation.yml(ignored), _doc_arch/slot_guide.md(ignored)

## Issue151. slot guide 4 md → 1 md 통합 (등록: 2026-05-16, 해결: 2026-05-16, commit: db27074) ✅
* 목적: Issue150에서 분리한 `_doc_arch/slot_{meta,pandoc,animation,user}_guide.md` 4 파일을 단일 `_doc_arch/slot_guide.md`로 통합. 가이드는 한 곳에서 관리.
* 카테고리: Project (docs)
* 해결:
    - `_doc_arch/slot_guide.md` 신규 — H1 섹션 4개(meta/pandoc/animation/user)로 통합. 통합 참조 섹션에 4 yml + 구현 위치 + reveal.js 공식 링크
    - `_doc_arch/slot_meta_guide.md`, `slot_pandoc_guide.md`, `slot_animation_guide.md`, `slot_user_guide.md` 4 파일 삭제
    - `data/slot_*.yml` 4건의 "가이드:" 주석을 통합 경로로 갱신
    - `_doc_arch/theme_layout.md` SSOT 링크 갱신 — 4 yml + 1 통합 guide 구조 명시
    - `.claude/rules/md-m2slide-rules.md` 참조 링크 동일 패턴 갱신
* Walkthrough:
    - yml 4건 `yaml.safe_load` 통과
    - `ls _doc_arch/slot*.md` → `slot_guide.md` 단독 존재 확인
    - 빌드 영향 없음 (코드 미수정)
* 영향 범위: _doc_arch/slot_guide.md(신규, ignored), 4 guide md(삭제, ignored), data/slot_*.yml(주석 갱신, ignored), _doc_arch/theme_layout.md(ignored), .claude/rules/md-m2slide-rules.md(ignored)

## Issue150. `data/slot.yml` 4분할 + guide md 분리 (등록: 2026-05-16, 해결: 2026-05-16, commit: 5e9070d) ✅
* 목적: 단일 `data/slot.yml`을 카테고리별 4 파일로 분리해 관심사 분리·확장성 향상. 가이드도 yml별 md로 분리. Issue148 후속.
* 카테고리: Project (data/, docs)
* 구조 (4 yml + 4 guide):
    - `data/slot_meta.yml` — 빌더 자동 주입 시스템·메타 슬롯 15개 (title/content/subtitle/part_subtitle/cards/markmap/downloadButtons/head_left/head_right/instructor_name/instructor_contact/lecture_date/version/qr_code_path/qr_url)
    - `data/slot_pandoc.yml` — Pandoc 예약 4개 (columns/column/rows/row) + 충돌 방지 메모
    - `data/slot_animation.yml` — 개별 element 애니메이션: Issue118 Pandoc `{.fragment}` + Issue149 reveal `<!-- .element: ... -->` syntax 정의 + reveal fragment 클래스 카탈로그 15개 (fragment/fade-*/grow/shrink/highlight-*/current-visible/semi-fade-out) + 보호 규칙 + 테스트 메타
    - `data/slot_user.yml` — 사용자 정의 슬롯 패턴 (regex + naming + Slidev 호환 + 충돌 방지 + 예시 4)
* 해결:
    - 기존 `data/slot.yml` 삭제 후 위 4 yml 신규
    - 각 yml에 schema_version=1, category, last_updated 메타 필드
    - `_doc_arch/slot_meta_guide.md` / `slot_pandoc_guide.md` / `slot_animation_guide.md` / `slot_user_guide.md` 4 guide 신규 (Frontmatter + 형제 가이드 상호 링크)
    - `_doc_arch/theme_layout.md` SSOT 단일 → 4분할 링크로 갱신
    - `.claude/rules/md-m2slide-rules.md` "참고" SSOT 링크 4분할로 갱신
* Walkthrough:
    - 4 yml 모두 `yaml.safe_load` 통과 (category 키 정상 매핑)
    - 가이드 4개 형제 상호 링크 검증
    - 빌드 영향 없음 — parser/builder 코드 미수정 (문서/데이터만)
* 영향 범위: data/(4 신규+1 삭제, ignored), _doc_arch/slot_*_guide.md(4 신규, ignored), _doc_arch/theme_layout.md(ignored), .claude/rules/md-m2slide-rules.md(ignored)

## Issue149. reveal.js 표준 `<!-- .element: class="..." -->` 주석 syntax 지원 (등록: 2026-05-16, 해결: 2026-05-16, commit: 7a76d62) ✅
* 목적: animationTest L43-47 등에서 사용한 reveal.js 표준 fragment 주석 syntax를 m2slide 자체 파서가 처리하여 `<li>`/`<p>` class에 주입. 기존 Pandoc `{.fragment}` syntax(Issue118)와 병존. 결정사항 "개별 에니메이션 지원"의 일환.
* 카테고리: Generator (lib/markdown.js)
* 재현 (수정 전):
    - `Projects/animationTest/animationTest.md` L43-47: `* 두 번째 항목 <!-- .element: class="fragment fade-up" -->`
    - 빌드 결과 `slide/index.html` line 1512: `<li class="bullet-dot">두 번째 항목 <!-- .element: class="fragment fade-up" --></li>` — 주석이 텍스트로 잔존, class 미적용
* 해결:
    - [`lib/markdown.js:129`](lib/markdown.js#L129) `extractInlineClasses(text)`에 reveal 패턴 매칭 추가 (Pandoc 패턴 매칭 전에 시도)
    - 정규식: `^(.*?)\s*<!--\s*\.element:\s*class\s*=\s*["']([^"']+)["']\s*-->\s*$`
    - 매칭 시 `{ classes: [tokens], remaining: before }` 반환 → 기존 3 호출 위치(unordered/ordered/paragraph li, p) 자동 동작
    - 단/이중 따옴표 모두 허용, trailing 공백 흡수
    - 코드 인라인 보호: before 백틱 종결 시 매칭 안 함 (Pandoc 동일 정책)
    - `lib/__tests__/markdown.test.js` reveal 케이스 11개 추가 (extractInlineClasses 7 + convertMarkdownToHTML 통합 4)
    - `.claude/rules/md-m2slide-rules.md` 정책 갱신 — 기존 "미지원" 문구를 syntax 비교 표로 교체
* Walkthrough:
    - TDD 30/30 통과 (`node --test lib/__tests__/markdown.test.js`) — Issue118 19 + Issue149 11
    - animationTest 재빌드 후 `slide/index.html` line 1512-1514:
        - `<li class="bullet-dot fragment fade-up">두 번째 항목</li>`
        - `<li class="bullet-dot fragment highlight-blue">세 번째 항목</li>`
        - `<li class="bullet-dot fragment grow">네 번째 항목</li>`
    - Pandoc syntax(L55-57) 회귀 없음 — line 1530-1531 정상 출력 유지
    - 회귀 빌드: m2SlideStyle1_single, m2SlideStyle2_chapter, LayoutTest, MermaidExample 모두 성공
* 영향 범위: lib/markdown.js, lib/__tests__/markdown.test.js(ignored), .claude/rules/md-m2slide-rules.md(ignored)

## Issue148. 지원 slot을 `data/slot.yml`로 카탈로그화 (열린 구조) (등록: 2026-05-16, 해결: 2026-05-16, commit: 26324d4) ✅
* 목적: 현재 m2slide가 지원하는 slot(시스템·Pandoc 예약·사용자 정의)을 `data/slot.yml` SSOT로 정리하여 향후 slot 추가 시 참조 가능한 열린 구조 확보.
* 카테고리: Project (data/, docs)
* 상세:
    - 시스템 슬롯(템플릿 placeholder `{{...}}`): title, subtitle, part_subtitle, content, cards, markmap, downloadButtons, head_left, head_right, instructor_name, instructor_contact, lecture_date, version, qr_code_path, qr_url
    - Pandoc 예약(`extractSlots`에서 슬롯 추출 제외): columns, column, rows, row — `preprocessPandocDiv`로 별도 처리
    - 사용자 정의 슬롯(Pandoc fenced div `::: name`): 임의 `[a-z][a-zA-Z0-9-]*` 매칭. layout 템플릿의 `{{name}}` placeholder로 치환. ex) leftPanel, rightPanel, left, right
* 해결:
    - `data/slot.yml` 신규: schema_version=1, system(15), pandoc_reserved(4), user_defined_pattern(regex + 예시 4) 3-카테고리 카탈로그
    - 각 system slot에 name·desc·source·layouts 필드 부여 — 어느 layout 템플릿에서 쓰이는지 역추적 가능
    - `_doc_arch/theme_layout.md` "표준 슬롯" 섹션에 SSOT 링크 추가
    - `.claude/rules/md-m2slide-rules.md` "참고" 섹션에 SSOT 링크 추가
    - 파서 변경 없음 — 문서/카탈로그 목적. 기존 `extractSlots` 정규식이 이미 열린 구조 (`[a-z][a-zA-Z0-9-]*`)
* Walkthrough:
    - YAML 검증: `python3 -c "import yaml; yaml.safe_load(open('data/slot.yml'))"` 통과 (system 15, pandoc_reserved 4, user examples 4)
    - layout placeholder 매핑은 `grep -oE '\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}' theme/*/layouts/*.html` 결과로 추출
    - `data/`, `_doc_arch/`, `.claude/`가 `.gitignore`에 들어가 있어 SSOT 파일들은 push되지 않음 (사용자 결정: 현재 ignore 정책 유지, Issue.md만 추적)
* 영향 범위: data/slot.yml(신규, ignored), _doc_arch/theme_layout.md(ignored), .claude/rules/md-m2slide-rules.md(ignored)

## Issue147. `cards_placeholder: false` + `toc_placeholder: true` 조합에서 `id="toc-placeholder"` 중복 생성 (등록: 2026-05-10, 해결: 2026-05-10, commit: 2300788) ✅
* 목적: Chapter 모드에서 두 옵션 조합 시 동일 id를 가진 슬라이드 2장이 연속 생성되어 `#/toc-placeholder` 진입 후 → 키 이동 시 URL hash가 변하지 않는 문제 해결.
* 카테고리: Generator (lib/html-builder.js)
* 재현:
    - `Projects/LlmAndVibeCoding_v2/_config.yml` (`cards_placeholder: false`) + 글로벌 `_config.org.yml` (`toc_placeholder: true`)
    - `./m2slide.sh LlmAndVibeCoding_v2` 빌드 → `slide/02-llm-tool-evolution.html`에 `id="toc-placeholder"` 2건 (line 1437 Map Slide + line 1450 TocSlide)
    - 브라우저: `02-llm-tool-evolution.html?fwd=1#/toc-placeholder` 진입 → → 키 → horizontal index 0→1 이동되지만 URL hash는 `#/toc-placeholder` 유지 (Reveal.js의 id 기반 hash 라우팅 + duplicate id 결합)
* 원인:
    - `lib/slide-parser.js:330` — `useTocPlaceholder=true`일 때 `slides.unshift('')` → `isTitle:true` 슬라이드 #/0 prepend (Issue138 이전 Cards Page 생성용 legacy 메커니즘)
    - `lib/html-builder.js:613-618` — `!hasTocItems`일 때만 isTitle 제거 → 서브챕터 있는 챕터(hasTocItems=true)에선 isTitle 잔존
    - `lib/html-builder.js:654-679` — `cards_placeholder=true` 경로에서만 isTitle → `_cards` layout 변환·소비. `cards_placeholder=false`면 잔존
    - `lib/html-builder.js:644-650` (Issue144 도입) — `!cardsPlaceholder` 시 `autoToc + _cards`만 splice. isTitle은 미처리
    - `lib/html-builder.js:687-699` — `_cfg.tocPlaceholder && hasAgenda`이면 `isMapSlide:true` 슬라이드 unshift. 잔존 isTitle 위에 또 prepend → 두 슬라이드 모두 generateTocSlideHTML / Map Slide 경로에서 `id="toc-placeholder"` 부여 → DOM id 중복
* 해결:
    - [lib/html-builder.js:644-650](lib/html-builder.js#L644-L650) `!cardsPlaceholder` splice 분기에 `s.isTitle === true` 슬라이드 제거 추가
    - Issue138 이후 isTitle은 cards_placeholder=true 경로에서만 의미를 가지므로 false 시점에는 deck에서 완전 제거하는 것이 사용자 의도와 일치 (Issue144 splice 정책과 동일 설계 철학)
* Walkthrough:
    - LlmAndVibeCoding_v2 재빌드 → 17개 챕터 모두 `id="toc-placeholder"` 1건 이하 (이전 02/03/04 챕터 중복 해소)
    - LlmAndVibeCoding 재빌드 → 16개 챕터 모두 1건 이하 (이전 다수 중복 해소)
    - 회귀(m2SlideStyle2_chapter cards_placeholder=false): 7개 챕터 1건씩 정상
    - 회귀(m2SlideStyle1_single, LayoutTest, MermaidExample) Single 모드: agenda/index만 0건, 챕터 페이지 없음 → 영향 없음
    - 브라우저 확인: `02-llm-tool-evolution.html?fwd=1#/toc-placeholder` → → 키 → 정상적으로 #/1 (다음 슬라이드)로 hash 전환
* 영향 범위: lib/html-builder.js

## Issue146. inline code 백틱 내 HTML 미이스케이프로 `<!-- ... -->`·`<div ...>` 내용 누락 (등록: 2026-05-10, 해결: 2026-05-10, commit: 2eefd8b) ✅
* 목적: 슬라이드 마크다운에서 `` `<!-- .slide: ... -->` `` 또는 `` `<div data-fragment-index>` `` 같이 `<`/`>` 포함 inline code가 브라우저에서 사라지거나 레이아웃이 깨지는 문제 해결.
* 카테고리: Generator (Frontend 영향)
* 원인:
    - [`lib/markdown.js:768`](lib/markdown.js#L768) `processInline()` 의 백틱 치환이 `<code>$1</code>`로 그대로 감쌈 → `<`, `>`, `&` 미이스케이프
    - 브라우저는 `<code><!-- ... --></code>`를 HTML 주석으로 해석 → 내용 삭제
    - 브라우저는 `<code><div ...></code>`를 실제 `<div>` 태그 열림으로 해석 → 문단 강제 줄바꿈
* 해결:
    - 백틱 치환 시 캡처 그룹을 `escapeHtml()`로 이스케이프 후 `<code>`로 감싸도록 변경
    - `escapeHtml()` 헬퍼는 같은 파일 [`lib/markdown.js:118`](lib/markdown.js#L118)에 이미 정의되어 있어 그대로 활용
* 검증:
    - `lib/__tests__/markdown.test.js` 19개 케이스 통과
    - `Projects/animationTest/slide/index.html` 출력에 `<code>&lt;!-- .slide: ... --&gt;</code>`, `<code>&lt;div data-fragment-index&gt;</code>` 형태로 이스케이프 확인
    - `m2SlideStyle1_single`, `m2SlideStyle2_chapter` 회귀 빌드 성공
    - 브라우저(Chrome) 렌더링 확인: 0. 검증 목적 슬라이드 3가지 syntax 모두 정상 표시
* 비고:
    - 본 fix 커밋(`2eefd8b`)에 사전 작업 중이던 unstaged 변경(kroki 2-tier 캐시 enhancement: `lib/markdown.js` 외 영역 + `lib/html-builder.js` + `run.sh` + `lib/kroki/*.svg`)이 함께 묶여 commit 됨. 별도 이슈 분리 필요 시 split 가능.

## Issue143. `_contents` puffer2s 마스코트가 `head_right` 텍스트를 가림 (등록: 2026-05-10, 해결: 2026-05-10, commit: d83a113) ✅
* 목적: `_contents` 레이아웃 우상단 푸퍼 마스코트(`finfraPuffer2s.png`)가 섹션 절대 위치(`background-position: 96% 28px`)로 배치되어 Issue141 contents-head-bar `head_right` 텍스트와 중첩 → 절대 위치 제거 후 title 밴드(첫번째↔두번째 hr 사이)로 이동시켜 head-bar와 분리.
* 카테고리: Theme (default + default_lec)
* 해결:
    - section 레벨 `background-image`(puffer2s) 제거 → `.layout-_contents > .title` (section 직속 자식)에 background 부착
    - **selector 정정**: 기존안 `.contents-body > .title:first-child`는 매칭 실패 — `html-builder.js`가 H2~H6 `.title`을 section 직속으로 끌어올리는 구조 반영 필요. 최종 selector `.layout-_contents > .title, .layout-contents-full > .title`
    - `background-position: right 4% center` (수직 중앙) + `background-size: auto 119%` (90% → 108% 20%↑ → 119% 추가 10%↑, 사용자 요청 반영)
    - title underline `::after { right: 10% }` → `right: 0` 풀폭 복원 (puffer가 title 밴드 내부로 이동했으므로 회피 불필요)
    - `.contents-body > .title::after { right: 10% }` 룰 제거
    - default + default_lec 양쪽 동기화
* Walkthrough:
    - LlmAndVibeCoding 빌드 → 02.3.cli-based.html 슬라이드(`<section class="layout-_contents">` + `contents-head-bar` + `<h2 class="title">`) 정상 생성 확인
    - m2SlideStyle1_single, m2SlideStyle2_chapter, layoutTest 회귀 빌드 통과
    - 산출 `slide/css/custom.css`에서 `.reveal section.layout-_contents > .title { background-image: finfraPuffer2s.png; background-size: auto 119% }` 반영 확인
* 영향 범위: theme/default/slide.css, theme/default_lec/slide.css

## Issue129. `default_background_transition` 회귀 테스트 (등록: 2026-05-06, 해결: 2026-05-10, commit: e214b43) ✅
* 목적: `_config.yml` `animation.default_background_transition` 옵션이 모든 슬라이드에 background transition을 적용하는지 회귀 테스트 마련.
* 카테고리: Frontend (테스트)
* 해결:
    - `lib/__tests__/animation.test.js` 신규 (12 케이스, 182 lines)
    - 단위: config 파싱(디폴트 fade·화이트리스트 6종·invalid fallback) + 슬라이드 디렉티브 파싱(`#background-transition-*`, `#background-color-*` hex/name)
    - 통합: tmp fixture 빌드 후 HTML grep — Reveal.initialize `backgroundTransition` 옵션 주입(zoom/fade/slide/convex/concave 5종) + 슬라이드별 `data-background-color`/`data-background-transition` 속성 + Issue120 가드(none → m2-page-fade-in keyframes·body.m2-cross-loaded selector 미주입)
* Walkthrough:
    - `node --test lib/__tests__/animation.test.js` → 12/12 pass
    - 전체 회귀 (`agenda + config + head-resolver + markdown + animation`) → 43/43 pass
* 의존성: background-image 디렉티브 또는 frontmatter `background_image:`(Issue117_1 후보) 도입 시 fixture 확장 가능 — 본 테스트는 transition 영역만 우선 커버
* 영향 범위: lib/__tests__/animation.test.js (신규, 다른 파일 영향 없음)

## Issue144. `cards_placeholder: false` 옵션이 parser 단계 autoToc 변환을 막지 못함 (등록: 2026-05-10, 해결: 2026-05-10, commit: b2bd80a, <후속 splice 변경>) ✅
* 목적: `_config.yml` `cards_placeholder: false` 시 Cards Page 슬라이드 자체가 deck에 출력되지 않아야 함 (디자인만 contents로 바꾸는 게 아니라 슬라이드 자체 미출력).
* 카테고리: Generator
* 상세:
    - 재현: `Projects/LlmAndVibeCoding/_config.yml`에 `cards_placeholder: false` 설정 + `./m2slide.sh LlmAndVibeCoding` 빌드
    - 1차(b2bd80a) 시점 결과: `slide/01-opening.html` 첫 슬라이드(`#/0`)가 `class="layout-_cards layout-_toc"` autoToc 카드 그리드로 렌더링 (옵션 false 무시)
    - 원인: `lib/slide-parser.js:409`의 autoToc 변환 로직이 옵션 검사 없이 H1+H2 children 구조를 발견하면 무조건 `s.layout = '_cards'; s.autoToc = true`로 변환
    - `lib/html-builder.js:631`의 `if (_cfg.cardsPlaceholder ...)` 게이트는 prepend(신규 _cards 슬라이드 삽입) 경로만 막고, 이미 parser가 만들어 놓은 autoToc 슬라이드는 통과
* 해결:
    - 1차(b2bd80a, revert 방식): `!_cfg.cardsPlaceholder` 일 때 autoToc `_cards` 슬라이드를 일반 contents 슬라이드로 revert (`s.layout = null`, `s.autoToc = false`).
    - **2차(splice 방식, 사용자 의도 반영)**: revert가 아니라 `slides.splice(i, 1)`로 deck에서 완전 제거. 사용자 의도는 "카드 디자인 비활성"이 아니라 "Cards Page 슬라이드 자체 미출력".
    - 후속 H2 anchor 슬라이드의 `data-heading-level=2`는 유지되어 ⇤/⇥ sibling 점프 정상.
    - 부가 효과: H1 슬라이드 안에 image/H2/bullets 등 함께 작성된 콘텐츠도 사라짐 → 보존 필요 시 `---` 분리로 별도 슬라이드 작성 권장 (Glossary.md 명세).
* Walkthrough:
    - LlmAndVibeCoding(cards_placeholder=false) 빌드 → `01-opening.html` H1 슬라이드 사라짐 (`data-heading-level="1"` 0건).
    - m2SlideStyle2_chapter(cards_placeholder=false) 빌드 → 02-code-syntax.html 5개→4개 슬라이드(#/1 H1 제거).
    - m2SlideStyle1_single, layoutTest(default true) 회귀 통과 → cards 정상 표시.
* 설계 문서 갱신:
    - `_doc_arch/Glossary.md` Cards Page 섹션에 false 동작 명세 추가
    - `_doc_arch/chapter-single-mode.md` 모드 비교 표에 cards_placeholder 게이트 명시
    - `_config.org.yml` + 프로젝트 `_config.yml` 주석 명확화 (true/false 동작 양쪽 기술)
* 영향 범위: lib/html-builder.js, _doc_arch/Glossary.md, _doc_arch/chapter-single-mode.md, _config.org.yml, Projects/{LlmAndVibeCoding,m2SlideStyle2_chapter}/_config.yml

## Issue132. ePub 분할 레이아웃(2/3분할 카드) 렌더링 버그 (등록: 2026-05-06, 해결: 2026-05-10, commit: 9d3de29) ✅
* 목적: HTML 출력에서 정상 동작하는 2분할/3분할 레이아웃이 EPUB 출력에서 깨지는 문제 수정
* 카테고리: Generator (lib/generate-epub.js)
* 원인:
    - `lib/generate-epub.js:62-64` 모든 `<div>`·`</div>` 라인 무조건 skip → raw `<div>` 분할 레이아웃 손실
    - Pandoc fenced div(`::: columns` / `::: {.column}`) 처리 부재 → 클래스 보존 실패
    - chapter 인라인 CSS에 flex 레이아웃 정의 부재
* 해결:
    - [lib/generate-epub.js](lib/generate-epub.js) `markdownToXHTML`에 Pandoc fenced div 파서 추가 — 콜론 3개 이상 매칭(outer 4 / inner 5 변형 fixture 대응), class·width·height attribute 파싱하여 `<div class style>`로 변환, 깊이 추적
    - raw HTML 통과 처리(`div/section/article/aside/figure/header/footer`) — paragraph wrap 회피
    - chapter 인라인 `<style>`에 `.columns`/`.column`/`.m2-cols`/`.m2-col`/`.card`/`.rows`/`.row` flex 정의 추가
* 검증:
    - `node --test lib/__tests__/*.js` 34/34 통과 (회귀 무영향)
    - `m2SlideStyle2_chapter --epub` 빌드 성공
    - `chapter5.xhtml`(05-layout-examples): Pandoc fenced div 12건 + raw `<div>` 6건 모두 보존
    - 7개 챕터 `xmllint --noout` 유효성 통과
    - 브라우저(Chrome) 시각 확인 — 분할 레이아웃 정상 렌더

## Issue131. `_contents` 레이아웃 제목 폰트를 소제목 크기와 동일하게 (등록: 2026-05-06, 해결: 2026-05-10, commit: 843cc4e) ✅
* 목적: `_contents` 레이아웃의 `contents-title`(`2.8em`)을 본문 `.title`(소제목, `--title-font-size: 1.5em`)과 동일 크기로 위계 균형
* 카테고리: Theme (default + default_lec)
* 해결:
    - **base.css 수정 가드 회피** — `theme/default/slide.css`·`theme/default_lec/slide.css` 양쪽에 override 추가
    - `.reveal section.layout-_contents .contents-title { font-size: var(--title-font-size, 1.5em); }` (SSOT 변수 사용)
    - base.css는 미수정 — 모든 프로젝트 회귀 위험 회피
* 검증:
    - 대표 프로젝트 3종 빌드: `m2SlideStyle1_single`, `m2SlideStyle2_chapter`, `layoutTest`
    - 빌드 산출물 `slide/css/custom.css`(theme slide.css 복사본)에 Issue131 마커 + override 3건 모두 반영
    - 브라우저(Chrome) 시각 확인 — 제목과 본문 H2.title 크기 균일

## Issue142. `head_breadcum` master toggle 코드 구현 (등록: 2026-05-10, 해결: 2026-05-10, commit: 88bfa08) ✅
* 목적: `_doc_arch/head.md`에 정의된 `head_breadcum: true` master toggle 옵션을 코드에 적용
* 해결 (Issue141 작업 내에서 함께 구현, commit 88bfa08):
    - `lib/config.js`: `head_breadcum` boolean 파싱 추가 (default `true`, `true/yes/1` → true, `false/no/0` → false, invalid → default + warn)
    - `lib/_internal/head-resolver.js:_resolveHeadSlot`: 5번째 인자 `headBreadcum = true` 추가. `now` 분기 진입 시 `if (!headBreadcum) return '';` 검사
    - `lib/html-builder.js:generateSlideHTML`: `_resolveHeadSlot` 호출부 2개에 `cfg.styleConfig.head_breadcum` 5번째 인자 전달
    - 테스트: config.test.js 1 케이스 + head-resolver.test.js 1 케이스 추가
    - 빌드 검증: `head_breadcum: false` 토글 시 `now` 옵션 빈 → strip 확인 (m2SlideStyle1_single)
* 의존성: Issue141 (head-bar 구현)에 통합되어 종결

## Issue141. _contents head_left/head_right 시스템 슬롯 + outline depth + breadcrumb (등록: 2026-05-10, 해결: 2026-05-10, commit: 7f9a416..e79357a) ✅
* 목적: `_contents` layout 상단에 outline 컨텍스트를 좌/우 분리 자동 표시. 발표 도중 청중이 현재 챕터 위치를 시각화. d{N}/now/none 옵션 + breadcrumb 알고리즘 + head_breadcum master toggle.
* design: `_doc_arch/head.md` (영속 SSOT)
* plan: `_doc_work/plan/head-slots-contents-layout_plan.md`
* task: `_doc_work/tasks/head-slots-contents-layout_task.md`
* 해결:
    - 신규 모듈 `lib/_internal/head-resolver.js` — `_resolveHeadSlot(option, otherOption, outlinePath, separator, headBreadcum)` 순수 함수
    - `lib/agenda.js` — `getOutlinePath(fileName, agendaPath)` 함수 추가 (현재 head-bar에서는 미사용, 향후 활용 여지)
    - `lib/config.js` — `head_left` (default `d1`) / `head_right` (default `now`) / `head_breadcum` (default `true`) 파싱 + invalid fallback
    - `lib/html-builder.js:530-577` — single/chapter mode 통일 알고리즘. 슬라이드 자체 H1/H2 + numbering 자동 추론
        - H1 = d1 (chapterTitle), numbering 있는 H2의 부모 numbering 매칭으로 ancestor trail 구성
        - H3+ = 슬라이드 제목·부제 (outline 제외, contents-title이 표시)
        - numbering 없는 H2 = outline 제외 (출력 비움 정책)
    - `theme/default + theme/default_lec`: `_contents.html` head-bar div + `slide.css` flex 좌/우 정렬 + 빈 슬롯 3중 안전망 (_stripEmptyWrappers + :empty + :has())
    - `_config.org.yml`: 디폴트 3개 키 추가
    - 신규 테스트 4파일: agenda.test.js (4) + config.test.js (5) + head-resolver.test.js (3) + integration.test.js (3) = 15 케이스
* 검증:
    - 전체 34 케이스 PASS (신규 15 + 기존 19 회귀 무영향)
    - 시각 검증: m2SlideStyle1_single (single, numbering 추론 정확), m2SlideStyle2_chapter (chapter, single과 동일 결과)
    - 옵션 교차 검증: `head_left=d1/head_right=now` (default), `head_breadcum: false` toggle
    - 빈 슬롯 자동 strip 확인 (single mode H1 없는 슬라이드 + cover/agenda 빌드)
* 정책 진화 (사용자 컨펌 다중):
    - 초기: AGENDA.md outline 기반
    - → single mode H1만 챕터로 인정
    - → H2 sub-챕터 d2 추가
    - → H3까지 outline 인정 + head_breadcum master toggle 도입
    - → numbering 자동 추론 (4.2.1의 부모 4.2 자동 매칭)
    - → numbering 없는 H2 outline 제외
    - → 최종: single/chapter mode 통일 알고리즘 (AGENDA.md outline은 head-bar에서 미사용)
* Task 10 문서화 완료 (commit dc405f1 후속):
    - `_doc_arch/Glossary.md` — Header 시스템 슬롯 표·상세 섹션 최종 정책 반영
    - `_doc_arch/theme_layout_default.md` — `_contents` 슬롯 표에 head_left/head_right 추가 + DOM 스키마 갱신
    - `.claude/rules/md-m2slide-rules.md` — Header 시스템 슬롯 섹션(§1.5) 신규 추가 (옵션·알고리즘·예시·toggle)

## Issue140. `toc_placeholder: true` Map Slide 미삽입 회귀 (Issue58 도입) (등록: 2026-05-10, 해결: 2026-05-10, commit: 453f423) ✅
* 목적: AGENDA.md에 서브섹션이 없는 평탄 H1-only 구조 프로젝트(예: `m2SlideStyle2_chapter`)에서 `toc_placeholder: true` 설정에도 Map Slide(`<section id="toc-placeholder">` + markmap SVG)가 삽입되지 않는 회귀 해결.
* 상세:
    - 회귀 도입: 9ed3298 (Issue58, 2026-05-02) — `hasTocItems` 게이트 신설 ("H3 없으면 `_toc` 미포함")
    - 후속 변경: 7c4adda(Issue137), 2044cc5(Issue138)에서 게이트 유지
    - 사용자 시나리오: `03-data-visualization.html#/4` 마지막 슬라이드 → → 키 → `04-images-media.html?fwd=1` 진입 시 `#/0`이 Cards Page만 표시되고 Map Slide 부재
* 카테고리: Generator (lib/html-builder.js)
* 해결:
    - [lib/html-builder.js:591](lib/html-builder.js#L591) Map Slide 게이트에서 `hasTocItems` 제거 → `if (_cfg.tocPlaceholder && !options.skipTocPlaceholder)` (Single 모드 가드 `&& hasAgenda` Issue141과 통합)
    - [lib/html-builder.js:163-167](lib/html-builder.js#L163-L167) `hasTocInDeck` 오프셋을 `_cfg.tocPlaceholder && !!agendaPath` 기반으로 변경 (Chapter 모드 한정)
    - Cards Page 게이트도 `&& hasAgenda` 추가 (Single 모드 보호, Issue141 통합 변경)
    - markmap 데이터(`tocData`)는 `generateTOCFromFile`이 파일 자체의 H1/H2를 항상 파싱하므로 AGENDA.md 서브섹션 없어도 Map Slide markmap 정상 렌더
* 검증:
    - `m2SlideStyle2_chapter` 빌드: 7개 챕터 HTML 모두 `id="toc-placeholder"` 1건씩 존재
    - `LlmAndVibeCoding` 회귀 무영향: 16개 챕터 모두 1건씩, 중복 없음
    - TOC 링크 1-based hash 매핑 정확 (#/2 = Cards Page, #/3~ = 본문)
    - 브라우저(Chrome) 시각 확인 — markmap SVG 정상 렌더

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
    - `_doc_arch/key_navigation.md` 단축키 표·K4·K5·구현 매핑·변경 이력 갱신
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
    - `_doc_arch/key_navigation.md` ⇤/⇥ 단축키 표 Single 컬럼 + K5 결정 + 변경 이력 갱신
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

## Issue145. Fragment 단계별 등장 + 색 강조 동시 적용 syntax 부재 (등록: 2026-05-10, 보류: 2026-05-10)
* 목적: 한 요소에 두 개의 fragment-index를 거는 reveal.js 표준 패턴(등장 → 다음 단계에서 색 강조)을 m2slide 마크다운으로 자연스럽게 표현할 수 있게 함. 현재 인라인 attribute `{.fragment .highlight-red}`는 단일 class 세트만 li/p에 주입하므로 등장과 색 강조를 분리 적용할 수 없음.
* 카테고리: Generator
* 보류 사유: 사용자 결정 — 진행하지 않는 것으로 보류. 현재 raw HTML 우회 경로가 존재하고 사용 빈도가 낮아 우선순위 후순위. 재개 시 본 문서의 구현 명세 그대로 활용 가능.
* 재개 조건:
    - 사용자 명시 요청 또는 fragment-index 다단계 요구 사례 누적
    - reveal.js markdown syntax 호환성 강화가 다른 이슈와 묶여 일괄 처리 가능한 시점
* 상세:
    - 위치: `lib/markdown.js` `extractInlineClasses()` (L96-123) + list/paragraph 적용부 (L419-423, L495-, L661-)
    - 케이스 1: `Projects/animationTest/animationTest.md` L42-45 — reveal.js 표준 주석 `<!-- .element: class="..." -->` 가 그대로 텍스트로 출력되어 무효 (m2slide는 reveal.js markdown 플러그인을 사용하지 않음). 산출 `slide/index.html` L1493-1496에서 주석이 `<li>` 본문에 그대로 포함된 상태 확인
    - 케이스 2: `Projects/animationTest/animationTest.md` L51-55 — `{.fragment .highlight-red}` 적용 시 reveal.js 사양상 `.highlight-*`는 처음부터 visible. 결과적으로 step 0에서 첫 번째·세 번째 항목만 보이고 두 번째 자리에 빈 공간 발생 (사양 동작이지만 사용자 의도 표현 한계)
    - reveal.js 사양 근거: `.fragment.highlight-{red,green,blue,...}` selector는 `opacity:1; visibility:inherit` 시작 + `.visible` 단계에서 `color` 변경 (등장 효과 아님)
    - 사용자 요구 시나리오: "두 번째 항목 등장 → 세 번째 항목 등장 → 세 번째 항목 빨간색 강조" 같은 3단계 fragment-index 시나리오
    - 현재 우회: raw HTML로 `<ul>` 전체를 작성 + `<span class="fragment highlight-red" data-fragment-index="N">` 중첩 — 가독성·유지보수 저하
* 구현 명세 (재개 시):
    - **옵션 A (권장)**: reveal.js 표준 주석 syntax 지원
        - 패턴: `<!-- .element: class="fragment fade-up" data-fragment-index="2" -->` 를 직전 li/p에 매칭하여 class 병합 + data-* 속성 주입
        - 매칭 정규식 후보: 라인 끝 또는 li/p 종료 직전의 `<!--\s*\.element:\s*([^>]*?)\s*-->` 캡처 → attribute 토큰 분리 (`class="..."`, `data-*="..."`)
        - 적용 지점: `convertMarkdownToHTML()` 내 list 항목 처리 직후 후처리 단계, paragraph 종결 직전 후처리 단계
        - 장점: reveal.js 표준 호환, fragment-index·data-autoslide·data-background-* 등 모든 속성 자유 지정, 학습 곡선 낮음
    - **옵션 B (보조)**: 인라인 attribute에 `key=value` 토큰 확장
        - `{.fragment .highlight-red data-fragment-index=3}` 형태로 attribute key=value 토큰 허용
        - `parseLayoutAttrs()` (L126~) 패턴 재사용 가능 — 이미 width=, height= 토큰 처리 중
        - 옵션 A와 충돌 없이 보조로 도입 가능
    - **옵션 C (선택)**: chained class 표기 — `{.fragment}{.highlight-red data-fragment-index=2}` 시 한 요소에 여러 fragment를 자동으로 wrapping `<span>`으로 감싸는 syntax sugar
    - 우선순위: 옵션 A → B → C 순서로 단계 도입. 옵션 A만으로도 사용자 요구 시나리오 충족
    - 기존 `{.fragment .highlight-red}` 동작은 호환성을 위해 유지 (deprecation 없음)
    - 보호 규칙 추가: 코드 인라인 안의 `<!-- ... -->`, code block 내부의 주석은 매칭 제외
* 검증 (재개 시):
    - `node --test lib/__tests__/markdown.test.js` 통과 (신규 테스트 케이스 포함)
    - `./m2slide.sh animationTest` 빌드 후 `slide/index.html`에서 fragment-index·class 정확 주입 확인
    - 브라우저 수동 확인: step 진행 시 의도 단계 등장·색 강조 순서 일치
* 후속 작업 (재개 시):
    - `.claude/rules/md-m2slide-rules.md` "단계별 등장 — Pandoc inline attribute (Issue118)" 섹션에 옵션 A 신규 syntax 사례 추가
    - `Projects/animationTest/animationTest.md` 슬라이드 3·4 갱신 — 신규 syntax 데모로 전환

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

