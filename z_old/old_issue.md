# Old Issues (Archived)

> Issue.md에서 release 시점에 아카이브된 완료 이슈 모음. 시간 역순 (최신 release가 위).

## v0.8.0 (2026-07-13) — 159건 아카이브

## Issue291. dev-server overview 장표 hover 확대 + Tab 고정 + 힌트 (등록: 2026-07-13, 해결: 2026-07-13, commit: 456d6cb) ✅
* 목적: 개요 페이지(`/p/<P>`) 슬라이드 미리보기가 480×270 축소본이라 내용 확인이 어려움. 의견 작성 시 장표를 크게 보면서 바로 입력할 수 있게 hover 확대 + Tab 포커스 이동 제공
* 카테고리: Build (dev-server)
* 구현 명세 (Walkthrough):
    - `lib/dev-server/server.py` `_common_styles` — `.preview-cell.zoomed` 오버레이 CSS(`transform-origin:top right`, `position:absolute;right:0` → 좌·하 성장으로 4번째 열 의견 입력란 미침범), `.zoom-hint` 힌트 배지 CSS
    - `_serve_project_overview` 행 생성 — preview 셀에 `<span class="zoom-hint">⇥ Tab → 의견 작성</span>` 추가
    - `_feedback_script` — hover 상태 머신 JS: `mouseenter`→확대(셀 위치 기반 fit-scale `min(0.6, (셀우측−12)/1920)`, 하한 0.3), `mouseleave`→복원(단 pin 시 유지), `Tab`(확대 중)→pin+같은 행 `.fb-text` 포커스, textarea `blur`→복원. `.zoomed:not(.pinned)` 조건으로 힌트 배지 표시
    - 검증: puppeteer 자동 테스트 — hover/Tab/blur 상태 전이 6단계 통과, 창 너비 1300/1500/1900 전부 왼쪽 넘침 없음(x≥11px)·의견란 미침범, 힌트 hover 시 표시·pin 시 숨김 확인

## Issue290. dev-server `/pd/` 덱에 `/p/` proxy 전 기능 부여 — 단일 root resolver 통합 (등록: 2026-07-13, 해결: 2026-07-13, commit: 5bd3efb) ✅
* 목적: `/pd/`(덱 목록)이 static `index.html` 직링크만 제공 → `/p/` 의 슬라이드 목록·deck nav(`/n/`)·solo view(`/s/`)·text 추출·config GUI 를 전혀 못 씀. 있는 코드 최소 수정으로 덱도 동일 proxy 진입 → 전 기능 획득
* plan: `_doc_work/plan/pd-p-unify_plan.md`
* task: `_doc_work/tasks/pd-p-unify_task.md`
* report: `_doc_work/report/pd-p-unify_issue290_report.md`
* depends: Issue281
* 구현 명세 (Walkthrough):
    - 원인: `/p/<X>/...` proxy 가 `os.path.join(getcwd(), 'Projects', project)` 를 12곳 하드코딩 → 2단계 깊이 덱(`Projects_deck/decks/<cat>/<deck>/`) 도달 불가. Issue281 이 이 때문에 proxy 우회(static 직링크)로 최소 구현
    - `_project_root(project)` 신설: `Projects/<P>` 우선 → 없으면 `Projects_deck/decks/*/<P>` category 순회 first-match (다중 동명 → stderr 경고), 둘 다 부재 → 비존재 `Projects/<P>` 반환(하류 isdir 가드 parity). 하드코딩 12곳 치환
    - `_PATH_PROJECT_RE` 확장: optional prefix `(?:Projects/|Projects_deck/decks/[^/]+/)` → group(1)=project(덱 basename)·group(2)=stem 양쪽 동일 추출 (rewrite crux — 미확장 시 덱 자산·nav rewrite 깨짐). `_short_file_rel` 도 `_project_root` 기반 cwd-상대 경로화
    - config 존재 가드 3곳(`_serve_config_get`·`_handle_config_post`·open-config): `project not in _list_projects()` → `isdir(_project_root(project))` (초기 검증서 config 만 404 로 드러난 지점)
    - `_serve_deck_list` 카드 href: static `index.html` → `/p/<deck>/n/c` + `/p/<deck>` 슬라이드 목록
    - 검증: 신규 덱 RamyeonCooking `/p/.../{n/c, ,/s/1/1, ?mode=text, /config}` 전건 200 · 기존 AgenticCoding 회귀 0(동일 5종 200) · `/pd/` 카드 링크 `/p/<deck>/n/c` 확인 · `test_server.py` PathProjectResolveTest 6종 추가 = 59 tests OK · py_compile 통과
    - 엣지: 동명 충돌 → `Projects/` 우선 / 다중 category 동명 덱 → first-match+경고 / 덱 config 쓰기 = 독립 deck repo 커밋(Issue288 준수)
    - 후속(별도 이슈): `--lint-deployment` 덱 확장 / category-qualified 토큰(`/p/<cat>__<deck>`)
* 설계 SSOT: `_doc_arch/dev-server.md` "`/p/` vs `/pd/` — 리스트 채널 비대칭 + 통합 (Issue290 구현)" 절

## Issue289. local_image_gen 큐 경유 전환 — 직접 실행 폐지, mflux-enqueue+폴링 (등록: 2026-07-13, 해결: 2026-07-13, commit: 427fb61, 5344e09) ✅
* 목적: 동시 생성 메모리 사고(2026-07-13) 대응 — prj55 잡 큐(Issue4)에 맞춰 `local_image_gen`을 직접 mflux 실행 → 큐 등록·폴링으로 교체 (P5, Issue287 후속)
* plan: `_doc_work/plan/media-creater-image-backend_plan.md`
* task: `_doc_work/tasks/media-creater-image-backend_task.md`
* depends: prj55#Issue4
* 구현 결과 (Walkthrough):
    - tools.yml invocation 교체 (5344e09): `mflux-enqueue`(출력 절대경로) → `mflux-queue-status <id>` 폴링(30s·타임아웃 5분/잡·종료코드 0/2/3/4/5). pgrep 임시 가드 폐지 → 직접 실행 전면 금지 + 큐 미가용 즉시 강등. `--lint-data` rc 0
    - 실왕복 검증: MediaBackendTest 라면 콘셉트 enqueue → 단일 worker done → `img/ramen-art.png`(1.2MB, 1024²) 산출·재빌드·렌더 확인 (캡처 `_doc_work/capture/verify-issue289-ramen.png`). Issue287 P4에서 강등됐던 local 실산출 운영 검증 동시 해소
    - 직렬화 실증: 검증 시점 대기열 6잡(본 잡 + queue-test 5잡·바탕화면 저해상도) 전건 rc 0 done — 동시 요청에도 mflux 프로세스 최대 1개 유지
    - 설계 문서 FIXME·TODO 해소 (`_doc_arch/media-creater-image-backend.md` — "큐 경유가 유일 경로"로 확정), task P5 5/5

## Issue288. RamyeonCooking 덱에 mflux T5 라면 이미지 추가 (등록: 2026-07-13, 해결: 2026-07-13, commit: 8d874c0 [deck repo]) ✅
* 목적: prj55(DeviceManagement) mflux 확장 테스트에서 한국 재현 1위로 선정된 T5 이미지(Z-Image-Turbo, 양은냄비·꼬불면·쇠젓가락)를 RamyeonCooking 덱 리소스로 편입
* depends: prj55#Issue3 (완료 — 2026-07-13)
* 구현 결과 (Walkthrough):
    - 소스 `_doc_base/mflux/tests/05_zimage-turbo_korean.png`(1024×1024) → `Projects_deck/decks/misc/RamyeonCooking/img/ramyeon_pot_zimage.png` 복사
    - `RamyeonCooking.md` "완성된 한 그릇 🍜" 슬라이드 신설(완성 슬라이드 뒤, `![](./img/ramyeon_pot_zimage.png)` + `::: source` AI 생성 표기), `release_date` 2026-07-13 갱신
    - `img/CREDITS.md` 에 AI 생성(mflux Z-Image-Turbo, seed 25, 저작권 프리 로컬 생성물) 출처 행 추가
    - 빌드 검증: `./m2slide.sh Projects_deck/decks/misc/RamyeonCooking` rc 0 → `slide/img/ramyeon_pot_zimage.png` 자동 복사(img 이중 복사 결정사항), `index.html` `<img>` ref 존재·"완성된 한 그릇" 슬라이드 렌더·placeholder 0. Chrome `#/10` 시각 확인
    - 커밋 경계: deck 자산은 독립 repo(github.com/finfra/m2slide-deck, `Projects_deck/` 본체 미추적)에 커밋(`8d874c0`), m2slide 본체엔 Issue.md 만
    - 잔여: seed 변경 추가 변형은 prj55 mflux 환경(`/Volumes/jM4_2T/Applications/mflux/bin/mflux-run`)에서 on-demand

## Issue287. media-creater 이미지 생성 백엔드 확장 — svg_direct·free_image·local_image_gen (등록: 2026-07-12, 해결: 2026-07-13, commit: 87b7cf7, d9ae44b, d0bfa24) ✅
* 목적: Claude가 래스터 이미지를 생성하지 못해 media-creater(파이프라인 단계 5)가 placeholder·생성 명세만 남기고 실제 이미지를 산출하지 못하는 공백 해소 — 생성 명세를 소비할 실행 백엔드 3종을 tools.yml에 반영
* plan: `_doc_work/plan/media-creater-image-backend_plan.md`
* task: `_doc_work/tasks/media-creater-image-backend_task.md`
* depends: prj55#Issue3
* 구현 결과 (Walkthrough):
    - P1 `svg_direct` 신설 (d9ae44b) — Claude SVG 직접 저작, viewBox 필수·외부 참조 금지(file:// 배포 규약)·시스템 폰트. `vector_illustration` 패턴 룰 추가
    - P2 `free_image` 라우팅 (d9ae44b) — free-image 스킬(Openverse CC) 사진류 1차 승격, `image_placeholder` 최종 fallback 강등. `image_fallback_chain` 신설 + checkpoint/report 강등 사유 필드
    - P3 `local_image_gen` 연동 (d0bfa24) — prj55 설치 산출(mflux-run wrapper·schnell 4-step·실측 76초/장·peak 36GB) 반영, `custom_illustration` 룰 신설. 볼륨 미마운트 시 wrapper fail-loud
    - P4 검증 — `--lint-data` rc 0. 테스트 프로젝트(Projects/MediaBackendTest)로 media-creater agent 실행: 라우팅 3/3 정확, free_image 실산출(CC-BY jpg + CREDITS.md + 출처 슬라이드 자동), svg_direct 실산출 2건, local 은 mflux 머신 점유(prj55 동시 생성) 감지 → 강등 체인 실검증. 빌드 후 `<img>` 3/3 렌더·참조 파일 4/4 실존·이미지 placeholder 잔존 0. 캡처 `_doc_work/capture/verify-issue287-{mountain,svg}.png`
    - 잔여(비차단, 설계 문서 미해결 항목 이관): local 직접 생성 1건 운영 검증, LoRA 스타일 프리셋 ↔ `info_field_map.style` 매핑 (prj55 튜닝 확정 후)
    - 설계 SSOT: `_doc_arch/media-creater-image-backend.md`. SCAR 본문 무변경(데이터-주도) — tools.yml 만으로 3개 백엔드 반영, agent 가 즉시 인식함을 실검증

## Issue286. m2unity 출력 백엔드 계약 3종 정의 — IR 스키마·`--unity` dispatch·골든 덱 (등록: 2026-07-12, 해결: 2026-07-13, commit: 3deaf8b) ✅
* 목적: kr.finfra.m2unity(md→Unity 렌더 백엔드)가 m2slide 를 계약 SSOT(마스터)로 추종하도록 계약 3종을 m2slide 측 정본으로 정의. 비차단 이슈 — 정의가 산출물, 실동 exporter 는 후속.
* 구현 결과 (commit 3deaf8b):
    - ① 덱 IR(JSON) 스키마 — `data/m2unity/deck-ir.schema.json` (draft-07). md→HTML 직행 파이프라인엔 AST 부재 → 신규 계약. 필드 실 정보 접지: `deck.meta`(loadProjectMeta) / `chapters` / `slides`(splitSlides `\n---\n`) / `directives`(extractDirectives 10필드 1:1) / `elements`(heading·text·list·table·code·image 닫힌집합 + `component` escape)
    - ② `--unity` dispatch — `m2slide.sh --export-ir`/`--unity` CLI stub(exit 2 + 계약 안내). 프로세스 위임(코드 병합 아님). 실동 exporter 는 계약 ① 확정 후 별도 이슈
    - ③ 골든 덱 회귀 — `data/m2unity/golden-deck/{golden.md, golden.ir.json(동결)}`. golden.ir.json ⊨ schema(핵심규칙 PASS) + `directives` = 실제 `extractDirectives(golden.md)` 실측 일치(slide3 `backgroundColor:"#1a1a2e"`, 나머지 null/false)
    - 거버넌스: 계약 마스터 = m2slide, m2unity = 추종. 변경은 m2slide 발 단방향. `.gitignore` 에 `data/m2unity/` whitelist(cross-repo fixture 추적). 설계 SSOT `_doc_arch/m2unity-contract.md` 는 _doc_arch 정책상 local-only
    - 검증: `bash -n` OK, `--lint-data` 통과, 대표 빌드 `m2Slide_single_mode` 회귀 0
    - 요청 출처: unity_base Issue7 — 설계 SSOT `unity_base/_doc_arch/m2unity-design.md`

## Issue285. columns 명시 width 합 100% + .m2-cols gap:4% → 우측 넘침·짤림 (등록: 2026-07-12, 해결: 2026-07-12, commit: 57ff687) ✅
* 목적: `::: {.column width="50%"}` 2개(합 100%) 또는 3개(33/33/34) 사용 시, `.m2-cols`의 `gap:4%`가 폭에 더해져 총 104%(2col)/108%(3col) → 마지막 컬럼이 슬라이드 우측으로 넘쳐 텍스트가 잘림.
* 상세:
    - `lib/css/base.css:645` `.m2-cols { gap: 4%; justify-content: space-between; }`
    - 인라인 `flex: 0 0 N%; max-width: N%`(빌더가 width 속성으로 주입)가 `.m2-col{flex:1}` 을 override → 폭 고정 → gap 만큼 총합 초과
    - `md-m2slide-rules`·Pandoc 예시는 width 합 100% 를 안내(`width="50%"` ×2)하지만 gap 미반영이라 그대로 쓰면 넘침
* 구현 결과 (commit 57ff687 — 명세 (a) 채택):
    - `lib/markdown.js` `preprocessPandocDiv`: columns 그룹 open 시 `scanColumnWidths()` 로 direct-child column 사전 스캔 → 모든 child 가 % width 이고 `Σwidth > 100 - 4*(n-1)` 일 때만 factor `(100-gap*(n-1))/Σwidth` 비율 유지 축소 주입 (50/50→48/48, 33/33/34→30.36/30.36/31.28)
    - 축소만 수행 (factor<1) — gap-aware 48/48 등 여유 합·혼합(width 일부 생략)·px 지정 그룹은 무변경. 중첩 columns 는 그룹별 독립 스케일
    - `COLS_GAP_PCT=4` 상수는 `base.css .m2-cols gap:4%` 와 동기 (CSS 변경 시 함께 갱신 주석)
    - 테스트 8건 추가 (`lib/__tests__/markdown.test.js`, 총 63 pass) + `md-m2slide-rules.md` §4 자동 축소 정책 문서화
    - 검증: aTest 빌드 → `03-text.html` `flex: 0 0 48%` ×2, headless Chrome geometry 실측 우측 경계 1134/1280 (넘침 0) + 캡처 `_doc_work/capture/verify-issue285-columns.png`. 대표 프로젝트(single/chapter) 회귀 빌드 OK, `--lint-deployment` 통과

## Issue284. 슬라이드 세로 밸런싱 — 텍스트 slide 상단 몰림 + 컴포넌트↔텍스트 간격 부족 (등록: 2026-07-12, 해결: 2026-07-12, commit: c8f912c, 8bf294f, 83a8d3b) ✅
* 목적: 텍스트 비중 슬라이드가 상단으로 몰려 하단이 비고(`.contents-body` flex-start), htmlArt/cards 컴포넌트와 인접 설명 텍스트가 붙어 답답함. 전체 세로 밸런싱을 정책으로 정리.
* 상세:
    - `.contents-body` 는 `flex-direction:column` 인데 `justify-content` 미설정 → 기본 `flex-start`(상단 정렬). media-container(flex-grow:1)가 있는 슬라이드만 채워지고, 텍스트-only 슬라이드는 상단 몰림
    - **카드 제목 밴드 높이 불균일**: `.m2-cards li > strong` 가 `display:block` 이라 1줄/2줄 제목이 섞이면 노란 밴드 높이가 제각각(시각적 어긋남). → `theme/_shared/components.css` 에서 flex 중앙정렬 + `min-height:3.2em`(2줄 기준, border-box)로 균일화(본 세션 적용, 전 theme 공유)
    - **컴포넌트↔후행 텍스트 간격**: 컴포넌트(htmlArt/cards/media) 바로 뒤 텍스트가 붙어 보임. `.contents-body` gap(0.5em) 위에 `.component-container/.m2-cards/.m2-htmlart + *` 에 `margin-top:0.9em` 추가(총 ~1.4em). 컴포넌트 자체 margin 은 Issue198 금지라 "다음 형제"에만 부여(본 세션 적용)
    - **제약1**: `justify-content:center`(세로 중앙정렬)는 CSS 가드 금지 항목 — 제목 소실 위험 (CLAUDE.md "CSS 수정 시 주의사항"). 전역 적용 불가
    - **제약2**: `.m2-htmlart` 직접 margin 은 Issue198(flex item margin 이 잔여공간 잠식→도해 축소)로 금지
    - 1차 조치(본 세션): `theme/default/slide.css` `.contents-body` 에 `gap:0.5em` 추가 — 컴포넌트↔텍스트 균일 간격만 부여(정렬·flex-grow 계약 불변, 대표 3프로젝트 회귀 없음 확인). 단 default theme 한정
* 구현 명세:
    - gap 정책을 `default_lec`·`default_dark`·`theme/_shared` 파리티로 확대 검토 (구조 규칙은 `_shared` 우선)
    - 세로 중앙 분산은 전역 금지 → **opt-in**(예: `.balance-center` 클래스 또는 `_config.yml` 옵션)으로 신중 도입 + 대표 프로젝트(single/chapter/layoutTest) 회귀 테스트 의무
    - `data/md-builder/styles.yml` 에 "컴포넌트+텍스트 공존 슬라이드 밸런싱" 저작 가이드 추가
* 구현 결과 (commit c8f912c 1차 gap, 8bf294f 카드 밴드·간격, 83a8d3b 완결):
    - `default_lec` `.contents-body` gap 0.5em parity (default_dark 는 default @import 상속)
    - `contents_balance` 옵션 신설 (top 기본 | center) — `--m2-contents-justify` CSS 변수 opt-in, config-sync 4곳(config.js·_config.org.yml·server.py 스키마·config-gui.md) 동기화
    - `data/md-builder/styles.yml` `vertical_balance_policy` 저작 가이드 (+_backup)
    - 검증: StellarEvolution `contents_balance: center` 적용 headless 캡처 — 상단 몰림 해소·간격 균일 (`_doc_work/capture/verify-issue284-balance.png`), 대표 프로젝트(single/chapter) 회귀 빌드 OK

## Issue283. htmlArt timeline 노드 라벨이 길거나 4개 이상이면 박스 overflow·겹침·클리핑 (등록: 2026-07-12, 해결: 2026-07-12, commit: 83a8d3b) ✅
* 목적: `::: htmlart timeline` 에 4노드 + 각 노드에 2행 긴 설명(예: "0초 — 면 투입, 타이머 시작")을 주면 위/아래 교차 박스가 축과 겹치고 마지막 노드가 슬라이드 밖으로 잘림.
* 상세:
    - `renderTimeline` (htmlart_dispatch.client.js) 박스 크기·간격이 라벨 길이·노드 수에 적응하지 않음
    - 짧은 라벨(예: "0초 · 면 투입")로 줄이면 회피되나 근본 대응 아님
* 구현 명세:
    - 노드 수·라벨 길이에 따라 박스 폭·세로 오프셋·폰트 축소 또는 자동 줄바꿈/말줄임 적용
    - 검증: 4~6노드 + 장문 라벨에서 박스 겹침·슬라이드 밖 클리핑 없음
* 구현 결과 (commit 83a8d3b):
    - `renderTimeline` 적응형 크기: 라벨 최대 폭(em, `textEm` 신설) 기반 nodeW 212~300 확장, wrap 줄 수 추정으로 nodeH 112~240 산정(폰트는 기준 높이 고정 산정 → 순환 회피), 5노드+ segW 압축(위/아래 교대 배치라 가로 겹침 없음)
    - 검증: StellarEvolution "태양의 일생 타임라인" 5노드 + 2행 장문 subs headless 캡처 — 박스 내 텍스트 완전 수용, 축 겹침·클리핑 없음 (`_doc_work/capture/verify-issue283-timeline.png`)

## Issue282. markmap 목차·agenda가 heading의 Font Awesome 마커(:fa-*:)를 변환 안 함 — 원문 노출 (등록: 2026-07-12, 해결: 2026-07-12, commit: 83a8d3b) ✅
* 목적: `## :fa-basket-shopping: 준비물` 처럼 슬라이드 제목에 `:fa-*:` 아이콘 마커를 쓰면 슬라이드 본문에는 아이콘으로 뜨지만, markmap 목차·agenda.html에는 `:fa-basket-shopping:` 원문이 그대로 노출됨.
* 상세:
    - 아이콘 변환은 `lib/markdown.js:962` (`:fa-x:` → `<i class="fa-solid fa-x">`) 한 곳뿐 — 슬라이드 본문 HTML 변환 단계
    - markmap 목차 노드 라벨은 `lib/html-builder.js` `generateTOCFromFile` `:291`(H2)·`:283`(H1)에서 `## ` 뒤 원문 문자열을 그대로 `<a>` 라벨로 사용 → fa 변환 미적용
* 구현 명세:
    - `generateTOCFromFile`에서 title 문자열을 markmap 라벨로 쓰기 전 `:fa-([a-z][a-z0-9-]*):` 마커를 제거(권장) 또는 `<i>`로 변환. H1(:283)·H2(:291) 양쪽 적용
    - 검증: `## :fa-fire: 제목` → agenda.html 노드에 아이콘 또는 순수 텍스트만, `:fa-` 원문 미노출
* 구현 결과 (commit 83a8d3b):
    - `lib/html-builder.js` `stripIconMarkers()` 신설 — `generateTOCFromFile` H1·H2 라벨에서 `:fa-*:` 제거 (TOC/agenda 페이지 FA CSS 미주입 가능성 → `<i>` 변환 대신 제거 채택)
    - 검증: StellarEvolution `## :fa-clock: 태양의 일생 타임라인` → index.html markmap·agenda.html 라벨 순수 텍스트, 본문 heading 은 아이콘 렌더

## Issue281. dev-server /pd/ — Projects_deck 덱 목록 페이지 (등록: 2026-07-12, 해결: 2026-07-12, commit: e31da3c) ✅
* 목적: `Projects_deck/decks/<category>/<deck>` 공유 덱 저장소를 dev-server 에서 열람 가능하게 함 (최소 코드)
* plan: `_doc_work/plan/pd-deck-list_plan.md`
* task: `_doc_work/tasks/pd-deck-list_task.md`
* 상세:
    - `GET /pd/` — 카테고리별 섹션 + 덱 카드 목록. `slide/index.html` 존재 시 static 경로(`/Projects_deck/.../slide/index.html`) 직링크, 없으면 "빌드 산출물 없음" 표시
    - `Projects_deck/decks/` 폴더 존재 시에만 공통 헤더(home·/p/ 등)에 `🃏 decks` 링크 노출
    - `Projects_deck` 경로는 legacy `/Projects/` 차단 regex 에 안 걸림 → `super().do_GET()` static 서빙 그대로 활용 (proxy 기계 불요)
* 구현 명세:
    - `lib/dev-server/server.py`: `do_GET` 라우트 2줄 + `_serve_deck_list()` + `_common_header` 조건 링크 1줄
    - 검증: `curl /pd/` → 총 1개 덱(misc/RamyeonCooking) 렌더, deck static index.html·css 200, `/`·`/p/` 헤더에 `🃏 decks` 링크 노출

## Issue280. agenda 카드 모드 상단 장식(고양이 마스코트·제목 위 라인) 부재 + 상단 테두리 paint 소실 + 로딩 blank (등록: 2026-07-12, 해결: 2026-07-12, commit: 526cfce) ✅
* 목적: agenda 카드 모드(`agenda_card_mode: true`)가 markmap 모드 대비 상단 장식(제목 위 노랑 hr 가로선, 우상단 고양이 마스코트)이 없고, 노랑 카드 박스의 상단 테두리 한 줄이 레티나(2x)에서 사라지며, 카드 모드 진입 시 2초간 화면이 blank 였던 문제를 종합 해결. Issue278(카드 테두리 accent 복구·헤더 투명화) 후속 정합.
* 상세:
    - **상단 장식 부재**: markmap agenda는 `.layout-_agenda::before`(hr 가로선)·`::after`(고양이)로 상단을 꾸미나, 카드 모드 wrapper는 `.layout-_cards.layout-_toc`라 두 selector에 매치되지 않아 장식이 전무.
    - **상단 테두리 paint 소실**: `.toc-cards { overflow: auto }`(스크롤 컨테이너) + `margin-top: calc(var(--frame-h)*0.05)`(분수 60.63px) + deviceScaleFactor 2 조합에서 Chrome이 top border 2px 를 그리지 않음. geometry 실측상 `border-top: 2px solid` 계산은 존재(정상 위치 top=297, frame[89~1302] 안)하나 화면 미표시. markmap analog `.toc-markmap`은 `overflow: hidden`이라 무증상 — 이것이 결정적 단서.
    - **로딩 blank**: 카드 모드는 markmap svg 부재로 `if(!svg) return`이 로딩 가드 해제(`m2ReleaseCrossGuard`) 앞에서 빠져나가, 2초 fallback 타이머까지 `visibility:hidden` 유지.
* 구현 (commit 526cfce):
    - `theme/default/slide.css` `.agenda-frame .toc-cards`: `overflow: auto` → `hidden` (markmap analog 통일, 카드는 프레임 대비 여유 커 스크롤 불필요 → 안전).
    - `theme/default/slide.css` `.agenda-frame .layout-_cards::after`: markmap과 동일 고양이(finfraCat) 우상단 배치(`--frame-h/--frame-w` 비례). `toc-cards { z-index:1 }`로 마스코트(z-index:0) 위에 카드 박스를 두어 겹침 방지.
    - `theme/default/slide.css` `.agenda-frame .layout-_cards::before`: markmap과 동일 제목 위 노랑 hr.png 가로선(top:12px, 좌우 24px inset).
    - `lib/html-builder.js` agenda 초기화 스크립트: `if(!svg){ requestAnimationFrame(m2ReleaseCrossGuard); return; }`로 카드 모드에서 가드 즉시 해제 → 2초 blank 제거. markmap 모드는 svg 존재로 분기 미진입(회귀 0).
* 검증:
    - StellarEvolution(default_dark) 카드·markmap 양 모드 재빌드 후 시스템 Chrome(`channel:'chrome'`) headless 2x 캡처 — 제목선·고양이·투명 제목·상단 테두리 모두 정상 표시.
    - paint 버그는 playwright geometry 실측(`.toc-cards` border-top 값·위치) + `overflow:hidden` 임시 전환 A/B 로 원인 확정.
    - markmap 모드 회귀 0(`.layout-_agenda` selector 미변경, svg 분기 미진입).
* 참고: Playwright MCP는 chrome-for-testing 미인식으로 실패 → 설치된 시스템 Chrome을 playwright `channel:'chrome'`으로 구동하여 geometry 측정·캡처.

## Issue279. default_dark standalone agenda 카드 평상시 라이트·hover 시 다크+어두운 텍스트로 가독성 붕괴 (등록: 2026-07-11, 해결: 2026-07-11, commit: b90f029) ✅
* 목적: darkmode(default_dark) standalone agenda 페이지 카드가 평상시 라이트 그레이로 렌더되고, hover 시에만 다크 배경 + 어두운 텍스트가 되어 글자가 안 보이는 문제 해결
* 상세:
    - 재현: `/p/StellarEvolution/n/a` — 카드 평상시 라이트 그레이(다크 테마와 불일치), hover 카드는 어두운 남색 + 어두운 글자(판독 불가)
    - 원인: base.css `.chapter-list--cards .chapter-card`(0,2,0)의 라이트 배경 `rgba(255,255,255,0.6)` 이 default_dark의 bare `.chapter-card`(0,1,0)를 specificity 로 이김 → 평상시 라이트 유지. hover 시엔 default_dark `.chapter-card:hover`(0,2,0)가 동률+후순위로 승리해 다크 배경이 되지만, 링크 색은 base `.chapter-list--cards .chapter-card a { color: inherit }`(0,2,1)가 이겨 다크 글자 유지 → 판독 불가
    - in-deck toc 는 `.reveal .chapter-card`(0,2,0) 셀렉터가 있어 정상 — standalone agenda(non-.reveal)만 회귀
* 구현 명세:
    - theme/default_dark/slide.css §5 카드 셀렉터에 `.chapter-list--cards .chapter-card`(+ `a`, `:hover`, `:hover a`) 고특이도 변형 병기 — 평상시부터 다크 카드 + 라이트 텍스트(#dfe6f2, hover #f2f7fd)로 통일
    - 검증: StellarEvolution 재빌드 → custom.css 반영 확인 + `--lint-deployment` 통과. Playwright headless는 브라우저 미설치(CDN DNS 차단)로 불가 — cascade 분석 + Chrome 시각 채널로 대체

## Issue278. agenda 카드 모드 노란 테두리 소실 + default_dark 비카드 agenda 헤더 불투명 (등록: 2026-07-11, 해결: 2026-07-11, commit: 3192afd) ✅
* 목적: standalone agenda.html의 두 시각 회귀 해결 — (a) `agenda_card_mode: true` 시 markmap 박스의 노란 테두리(`--kn-accent`) 프레임이 사라짐, (b) default_dark 테마 비카드 agenda에서 `.toc-page-header` 다크 gradient(`!important`)가 우측 마스코트(finfraCat, z-index 0)를 가려 뒤 이미지가 안 보임
* 상세:
    - 테두리는 `theme/default/slide.css` `.agenda-frame .toc-markmap`에만 정의 — 카드 모드 컨테이너(`.toc-cards`)에는 매치되는 프레임 스타일 없음 (default_lec 동일)
    - `theme/default_dark/slide.css` §5의 `.toc-page-header` gradient가 agenda 페이지에서 헤더 뒤 요소를 덮음
* 구현 명세 (적용 완료):
    - `theme/default/slide.css` + `theme/default_lec/slide.css`: `.agenda-frame .layout-_cards`(flex column) + `.agenda-frame .toc-cards`(테두리·라운드·flex) 추가 — `.toc-markmap` 프레임과 parity
    - `theme/default_dark/slide.css`: gradient 셀렉터를 `.reveal .toc-page-header`(in-deck)로 한정, `.agenda-page .toc-page-header`는 `transparent !important`
* 검증: StellarEvolution 빌드 + headless 캡처 — 카드 모드(`_doc_work/capture/issue278-agenda-card.png`) 테두리 복구, 비카드 모드(`issue278-agenda-markmap.png`) 헤더 투명·마스코트 노출. `--lint-deployment` 통과

## Issue277. 테마 stellar_dark → default_dark rename + StellarEvolution 참조 수정 (등록: 2026-07-11, 해결: 2026-07-11, commit: c7852be) ✅
* 목적: 우주 다크 테마를 특정 프로젝트 종속 명칭(stellar) 대신 범용 명칭(default_dark)으로 정착 — default 상속 다크 variant 표준 테마로 재사용 가능하게 함
* 상세:
    - `theme/stellar_dark/` → `theme/default_dark/` 폴더 rename (untracked 상태 — plain mv, 디스크 대문자 `Theme` → 소문자 `theme` 정규화 포함)
    - 참조 갱신: `Projects/StellarEvolution/_config.yml` `theme:`, `.gitignore` 추적 화이트리스트(`!/theme/default_dark/`)·주석, `theme/default_dark/slide.css` 헤더 주석
    - 빌드 산출물: `Projects/StellarEvolution/slide/css/custom.css` 재빌드 반영, `docs/StellarEvolution/` rsync 동기화 (stale 구빌드 → Issue271 포함 최신 빌드)
* 구현 명세 (Walkthrough):
    - rename-reference-rules 5단계 준수: 사전 grep(3개 파일) → mv → 참조 갱신 → 사후 grep 잔존 0건(주석 "(구 stellar_dark)" 의도적 유지 제외) → 단일 commit
    - 검증: `./m2slide.sh StellarEvolution` 빌드 로그 `✅ Theme applied: default_dark` + `--lint-deployment` 통과 + dev-server `/p/StellarEvolution/s/1/1` 정상 서빙
    - 참고: `Projects/StellarEvolution/`·`docs/StellarEvolution/` 은 gitignore/미추적 — theme 폴더 + .gitignore 만 커밋. docs 발행(추적)은 `/deploy-docs` 별도 결정 (vendor 21M 정책 검토 필요)

## Issue272. htmlArt 컴포넌트 다크(black) 테마 대비 미흡 — 시각검증상 Issue274로 실질 해결 (등록: 2026-07-10, 해결: 2026-07-11, commit: 35c5870) ✅
* 목적: htmlArt(d3 SVG SmartArt)가 밝은 배경 전제로 색/텍스트가 고정되어 다크 테마에서 대비·가독성이 떨어진다는 우려(등록 시 "예상 — 시각 확인 필요")를 검증·해소.
* 결론: **시각 확인 결과 다크 대비 문제 없음** — Issue274(선/테두리/화살표 → `--m2-line` 변수화) + 기존 `--m2-surface`/`--m2-text` 반응으로 이미 다크 테마 자동 호환. 추가 하드코딩 색 없음.
* 검증 (StellarEvolution + stellar_dark, Chrome headless 다크 캡처 4종):
    - process(적색거성→…), hierarchy(질량 갈림길), cycle(항성 핵합성) 모두 노드=dark surface(`--m2-surface #161a26`) + gold 테두리 + 흰 제목(`--m2-text`) + 회색 부제, 라인=밝은 회색(`--m2-line`)으로 대비 양호.
    - 캡처: `_doc_work/capture/issue272-dark-s{9,11,14}*.png`
* 조치: 유일한 비반응 하드코딩이던 `--htmlart-box-bg: rgba(0,0,0,.045)`는 grep 결과 lib/·theme/ 어디서도 참조 안 되는 **dead var** → `theme/_shared/components.css`에서 제거.
* 회귀: 라이트(aTest/default) htmlArt process 정상(`_doc_work/capture/issue272-light-aTest-c9s2.png`) + 다크 재캡처 동일 — 회귀 0.

## Issue271. layout 배경 하드코딩(#ffffff !important)이 다크 테마를 덮음 — 배경 테마 변수화 (등록: 2026-07-10, 해결: 2026-07-11, commit: cee8334) ✅
* 목적: 신규 다크 테마(stellar_dark)에서 cover 슬라이드와 standalone agenda.html 배경이 흰색으로 남아 밝은 텍스트가 안 보이는 회귀 발견. 근본 원인은 theme/default(및 theme/default_lec)가 layout 배경색을 하드코딩한 것.
* 상세:
    - `theme/default/slide.css` §4.1 `.reveal section.layout-_cover { background-color: #ffffff !important; }` — cover가 theme `.reveal` 배경을 `!important`로 덮음. default_lec도 동일 패턴.
    - `lib/css/base.css` §12 standalone agenda.html: `body.agenda-page`·`.agenda-frame` `background:#ffffff` 하드코딩 → 다크 테마 agenda 배경 흰색.
* 구현 (commit cee8334):
    - theme/default/slide.css:368 + theme/default_lec/slide.css:287 cover: `#ffffff !important` → `var(--m2-bg, #ffffff) !important`.
    - lib/css/base.css:1261(body.agenda-page)·1275(.agenda-frame): `#ffffff` → `var(--m2-bg, #ffffff)`.
    - base.css :root `--m2-bg: #ffffff` 정의라 default·default_lec·팔레트 미지정 테마는 흰색 유지(회귀 0). 다크 테마는 `:root --m2-bg` override 만으로 cover·agenda 자동 반응.
* 검증 (base.css 가드 준수):
    - 대표 빌드 3종(m2Slide_single_mode·m2Slide_chapter_mode·aTest, 모두 default theme) 컴파일된 cover bg = `var(--m2-bg,#ffffff)`, `--m2-bg=#ffffff` → 흰색 유지 확인.
    - StellarEvolution(stellar_dark): cover는 §6 workaround `transparent !important`가 var 규칙 뒤(cascade 후순위)라 그라디언트 유지. agenda.html은 custom.css `:root --m2-bg:#0c0e16`(base inline 뒤 link 로드 = 후순위 승) → 다크 반응 cascade 확인.
    - stellar_dark의 agenda-frame 우회 override는 이제 잉여(base.css var 로 자동 해결). 제거는 후속 정리 대상.
* 후속: Issue272(htmlArt 다크 대비)는 별도 이슈로 유지.

## Issue276. 설정 GUI 테마 콤보박스에 사용 가능한 테마 목록 미표시 (등록: 2026-07-11, 해결: 2026-07-11, commit: a2cb13b) ✅
* 목적: dev-server 설정 GUI(테마·레이아웃 탭)에서 테마 콤보박스 ▾ 클릭 시 현재 테마 1개만 표시되고 다른 테마(default·default_lec·stellar_dark)가 보이지 않음. 테마 전환 불가.
* 상세:
    - 서버측 `_list_themes()`·`_config_schema_out()`는 정상 (테마 3개 모두 options 주입, `/p/<P>/config` 응답에 `themes: [default, default_lec, stellar_dark]` 확인).
    - 근본 원인: 클라이언트 `wireCombo` 의 `open()` 이 `filter()` 호출 (`lib/dev-server/server.py:2228-2229`). 입력칸에 현재 테마 전체값이 들어있어 그 문자열을 포함하는 li 만 남기고 나머지를 `display:none` 처리 → 콤보 펼침 시 현재 테마만 노출.
    - palette 콤보도 동일 `wireCombo` 사용 — 같은 증상.
* 구현 명세:
    - `showAll()` 신설 — `open()`(▾ 토글·focus 진입) 시 전체 li 표시, `filter()` 는 사용자 타이핑(`input` 이벤트)에서만 적용.
    - 검증: dev-server 재시작 후 `/p/` 서빙 JS 에 `open(){closeAllCombos();showAll();...}` 반영 확인. `/p/StellarEvolution/config` 응답에 테마 3개 options 주입 확인.

## Issue275. dev-server 프로젝트 목록(/p/) 카드별 _config.yml 설정 GUI + Open settings file (등록: 2026-07-10, 해결: 2026-07-11, commit: 1f18955) ✅
* 목적: dev-server 프로젝트 목록 페이지(`/p/`)가 `Projects.md` 메타를 읽기 전용으로만 표시하여, 프로젝트별 렌더 옵션(`_config.yml`)을 바꾸려면 매번 파일을 손으로 편집해야 했음. 각 카드에서 바로 편집 가능한 GUI를 추가하여 반복 편집 부담을 제거.
* plan: `_doc_work/plan/config-gui_plan.md`
* task: `_doc_work/tasks/config-gui_task.md`
* arch: `_doc_arch/config-gui.md`
* 확장 (2026-07-10 추가): 초판 13키 단일폼 → `_config.org.yml` 전체 옵션(약 30개)으로 확장.
    - theme 콤보박스(`theme/` 디렉토리 동적 스캔 + 자유입력).
    - 미설정 시 기본값 placeholder + 라벨 우측 ⚪ 미설정 배지.
    - 5탭 그룹: ①테마·레이아웃 ②목차·구조 ③네비게이션 ④색·애니메이션 ⑤크기·폰트 (사용자 결정 폼 미회수 → 권장값 진행).
    - 다국어(i18n) ko/en, GUI 전체(탭·라벨·버튼·상태·검증) — 클라이언트 즉시 전환.
    - 중첩 키 편집: `animation.*`(2단계)·`style.theContents.*`(3단계) dotted-path + 제네릭 nested writer.
    - 설계 SSOT: `_doc_arch/config-gui.md`. 미해결: style 3단계 nested 유닛 검증, en 완역(FIXME).
* 확장 (2026-07-11 추가): 모달 footer에 "📄 Open settings file" 버튼 — 카드별 `_config.yml`을 VSCode로 직접 여는 엔드포인트. prj1 hub Settings의 동명 기능 대응. GUI 폼으로 못 다루는 저수준 키(slide_css·style 3단계 등)를 파일에서 직접 편집하는 탈출구.
    - `POST /p/<P>/open-config` — `open -a "Visual Studio Code" Projects/<P>/_config.yml`. 파일 없으면 touch 후 open (Save가 파일 생성하는 동작과 일관). 프로젝트는 `_list_projects()` 화이트리스트 검증, 경로 고정(Projects/<P>/_config.yml) — 임의 경로 open 불가. 서버 127.0.0.1 bind.
    - footer 좌측 버튼 + i18n(ko/en) + 상태 토스트. server.py 단일 파일 변경 + test_server.py 유닛 4건 추가.
* 구현 명세:
    - `GET /p/<P>/config` — 현재 편집 가능 값 + 스키마 JSON 반환.
    - `POST /p/<P>/config` — `{"values":{...변경분...}}` 화이트리스트 검증 후 `_config.yml` 라인 편집 + `./m2slide.sh <P> --no-serve` 재빌드.
    - `POST /p/<P>/open-config` — `_config.yml` VSCode open (신규, Open settings file 버튼).
    - 화이트리스트 키: theme·palette·theme_default_layout·cover_enabled·agenda_enabled·toc_placeholder·agenda_card_mode·toc_card_mode·nav_indicator·nav_color·markmap_depth·chapter_markmap_depth·card_columns.
    - `_write_config_keys` — 주석·순서 보존 라인 편집, `#` 포함 값(hex color)은 자동 인용. 값 검증 타입별(bool·int 범위·enum·css color·slug 패턴) + 금지문자 차단.
    - 프런트: 카드 `position:relative` + `.cfg-gear` ⚙️, 공용 모달 `#cfg-overlay` + 스키마 기반 폼 JS(변경분 diff POST), ESC/배경 클릭 닫기, 라이트·다크 대응.
    - 검증: py_compile OK, 유닛 53/53(config GUI + 신규 open-config 4건), 서버 재시작 후 curl — unknown project 404(no spawn)·valid 200(opened·VSCode spawn)·GET config 200·버튼/i18n/script 서빙 확인. 모달 시각 스크린샷은 Playwright chrome 미설치로 skip.

## Issue274. htmlArt 선/지시 도형 색 config(_config.yml) + 테마 변수화 (nav_color 패턴) (등록: 2026-07-10, 해결: 2026-07-10, commit: 3b7dd06) ✅
* depends: Issue272 (관련 — 본 이슈가 htmlArt 선/화살표 대비 부분을 config·테마 변수로 구현)
* 목적: 다크 테마에서 htmlArt(d3 SVG SmartArt)의 연결선·화살표·박스 테두리가 기본 검정(rgba(0,0,0,...))으로 하드코딩되어 어두운 배경에 묻힘. `nav_color:` 처럼 (1) 테마 `:root` 속성으로 기본색을 정의하고 (2) `_config.yml` 에서 override 가능하게 하여 배경색에 맞춰 선/지시 도형 색을 지정 가능하게 함.
* 구현 명세:
    - 테마 속성: theme `:root` 에 `--m2-line`(htmlArt 선/지시 도형 기본색) 신설. 라이트 테마(default·default_lec)는 **미설정**(하드코딩 fallback 유지 → 회귀 0), 다크 테마는 밝은 선색 지정(stellar_dark 는 `.gitignore /theme/*` 로컬 테마라 참조 구현만).
    - config: `_config.yml htmlart_line_color:` 키 신설 (`auto|light|dark|<css-color>`, nav_color 미러, CSS injection 방지 검증). `cfg.htmlartLineColor` → body 인라인 `--m2-htmlart-line` 주입(최우선).
    - 배선: `theme/_shared/components.css` `--htmlart-arrow`·`--htmlart-box-border` = `var(--m2-htmlart-line, var(--m2-line, <기존 하드코딩>))` — override > 테마 > fallback 3단. d3 렌더(`htmlart_dispatch.client.js`)는 이미 해당 변수 소비 → CSS 배선만으로 반영.
* 검증:
    - node config.test.js 5/5 통과 + htmlart_line_color 파서 6종(auto/light/dark/hex/rgba/injection-reject) 유닛 검증.
    - StellarEvolution(stellar_dark) custom.css: `--m2-line: rgba(233,234,242,0.55)` → 밝은 선 해상도. 라이트 데크(m2Slide_single_mode) custom.css: `--m2-line` 미정의 → 기존 rgba fallback(회귀 0).
    - `htmlart_line_color: "#ff3366"` e2e: body 인라인 `--m2-htmlart-line:#ff3366` 주입 확인 후 revert. `--lint-deployment` 통과.
    - 기존 integration.test.js 2건 fail 은 head-bar outline 이슈로 본 변경과 무관(clean HEAD 에서도 동일 fail).
* 자동 결정(/dev): 번호 충돌(273 = StellarEvolution 기완료) 발견 → HWM 273→274, 본 이슈 Issue274 로 재부여. commit 015c07b 는 Issue273 메시지로 랜딩 후 amend 로 Issue274 정정.

## Issue273. StellarEvolution 고퀄화 + stellar_dark 다크 테마 + agenda_card_mode (등록: 2026-07-10, 해결: 2026-07-10, commit: fe8acdc) ✅
* 목적: StellarEvolution 강연 데크를 장표 수 불변(16장)으로 시각 고퀄화(htmlArt·p5 3D·시뮬레이터)하고, 검은 배경 리소스와 어울리는 다크 테마 + 카드형 목차를 지원.
* 상세:
    - 데크: mermaid 6블록 → htmlArt(process·hierarchy·cycle) 교체, p5 WEBGL 3D 2종(회전 항성·태양↔적색거성), p5 시뮬레이터 3종(핵융합·대화형 HR도·초신성), NASA·Kurzgesagt refs 사실 반영
    - 신규 테마 `theme/stellar_dark/` — default `@import` 상속 + 다크 override(배경 그라디언트·표·코드·인용·카드 목차)
    - `agenda_card_mode` 옵션 — agenda.html(/n/a)을 markmap 대신 카드 그리드로 렌더 (기본 off, 회귀 0)
* 구현 명세:
    - `lib/config.js`: `agendaCardMode` 기본값 + `agenda_card_mode:` 파서 (+동시 작업분 `nav_color` 파서 함께 랜딩 — 다크 테마 nav 화살표 가시성)
    - `lib/html-builder.js`: `generateAgendaHTML` 카드 렌더 분기 (tocData → `.chapter-card` 링크) + `--m2-nav-color` 체인
    - `theme/stellar_dark/slide.css`(gitignore — 커스텀 테마 정책): 다크 팔레트·cover 투명화(§6)·세로 여백 §6b(htmlart `flex:0 1 auto`+`max-height:48vh`, contents-body center)·blockquote padding
    - 검증: puppeteer(시스템 Chrome)로 deck 뷰(/n/) computed style 실측(padding 52/60px, htmlart 427px≤512 cap, blockquote 70px) + 스크린샷. `--lint-deployment` 통과
    - 로컬 전용(gitignore): `Projects/StellarEvolution/`(publishing=x), `Projects.md`, `theme/stellar_dark/`
    - 후속 이슈 파생: Issue271(layout 배경 하드코딩 테마 변수화), Issue272(htmlArt 다크 대비)

## Issue270. SCAR·런타임 자산 self-contained 배치 + 중첩 하위 프로젝트 상위 호출 해결 (등록: 2026-07-09, 해결: 2026-07-10, commit: 9ba6278) ✅
* 목적: 결정사항("배포 위해 SCAR는 프로젝트 폴더 배치") 실현 + 부작용(중첩 하위 프로젝트 상위 호출 불가)·오프라인 자산 self-containment 해결. 타 PC clone 후 오프라인 즉시 작동.
* report: `_doc_work/report/scar-selfcontained_issue270_report.md` / 설계: `_doc_arch/scar-portability.md`
* 결과 (A+B 방식, 4 Phase 완료):
    - **상위 호출**: m2slide 로컬 `.claude/`=SSOT + 상위 `videoMaker/.claude/commands/m2s.md` 위임 bridge(commit ae6620e, 별도 repo). 복제 없음. standalone은 bridge 불요.
    - **오프라인 vendor**: `lib/asset-manifest.js` + `lib/vendor/fetch-vendor.js`(21M, .ttf prune) + `lib/vendor-rewrite.js` 빌드 후처리 CDN→`./vendor` 치환. 잔여 CDN 0, 실렌더 콘솔 에러 0.
    - **발행 데크 예외**: GitHub Pages 발행 13개 `_config.yml asset_mode: cdn`(웹 서빙·용량). vendor=로컬 오프라인 전용.
    - **SCAR hard-dep**: `pptx2md-run.sh`→`.claude/vendor/`, form-template 참조 stale 교정.
    - **dev-server proxy**: `server.py` vendor rewrite 지원. 42 테스트 OK, 유닛 167 pass/2 fail(사전결함, 신규 0).

## Issue269. fPmIntro 영문판 프로젝트 생성 (fPmIntro_en) (등록: 2026-07-06, 해결: 2026-07-06, commit: a819b3a) ✅
* 목적: 기존 한글 fPM 소개 프로젝트 `fPmIntro`(10챕터 발표 자료)의 영문 버전을 `Projects/fPmIntro_en`으로 생성하여 영어권 대상 fPM 소개 지원
* 상세:
    - 원본: `Projects/fPmIntro/` (AGENDA + 01/01.1/02/02.1/03/04/05/05.1/05.2/06 챕터, chapter mode, theme default)
    - markdown 본문·frontmatter·표·htmlart·cards·mermaid·wordart 라벨 영어 번역
    - Info.md 기획 메타 영어 번역
* 결과 (Walkthrough):
    - `Projects/fPmIntro_en/` 생성 (config·VERSION·Info.md·AGENDA + 10챕터) → `./m2slide.sh fPmIntro_en` 빌드 성공 (10챕터 57슬라이드)
    - SVG 다이어그램(`fpm-system-map.svg`) 텍스트 라벨 영어화(잔여 한글 0), 이미지 alt 텍스트 영어화
    - 미치환 `{{ }}` 0건, 본문 `<p>/<li>/<td>/<h>` 한글 잔여 0 (잔여 "번호"는 reveal.js 페이지번호 JS/CSS 주석 boilerplate)
    - 스크린샷 17장은 실제 한글 fPM UI라 재캡처 불가 → 원본 복사 유지("가급적" 범위 밖). 데모 mp4는 finfra.kr 외부 URL 유지(`*.mp4` gitignore)
    - Projects.md publishing=o 등록 + `Projects/.gitignore` 화이트리스트 추가 (--sync-projects)
    - 결과 링크: http://127.0.0.1:9877/p/fPmIntro_en/n/c

## Issue268. m2slide_info 영문판 프로젝트 생성 (m2slide_info_en) (등록: 2026-07-06, 해결: 2026-07-06, commit: 211cc96) ✅
* 목적: 기존 한글 설명용 프로젝트 `m2slide_info`(5챕터 소개 자료)의 영문 버전을 `Projects/m2slide_info_en`으로 생성하여 영어권 잠재 사용자에게 소개 자료 제공
* 상세:
    - 원본: `Projects/m2slide_info/` (AGENDA + 01~05 챕터, chapter mode, theme default_lec)
    - markdown 본문·frontmatter·표·cards·mermaid·chart·wordart 라벨을 영어로 번역
    - Info.md 기획 메타도 영어 번역하여 함께 생성
* 결과 (Walkthrough):
    - `Projects/m2slide_info_en/` 생성 (config·VERSION·Info.md·AGENDA + 01~05 챕터) → `./m2slide.sh m2slide_info_en` 빌드 성공 (5챕터 37슬라이드)
    - mermaid graph 노드·chart.js labels/dataset label 영어화 확인, 미치환 `{{ }}` 0건
    - 커버 한글 식별자(남중구·핀프라) 0건, homepage `finfra.kr` 유지
    - Projects.md publishing=o 등록 + `Projects/.gitignore` 화이트리스트 추가 (--sync-projects)
    - 결과 링크: http://127.0.0.1:9877/p/m2slide_info_en/n/c

## Issue267. m2Slide 영문판 프로젝트 생성 (m2Slide_en) (등록: 2026-07-06, 해결: 2026-07-06, commit: 211cc96) ✅
* 목적: 기존 한글 브로셔용 프로젝트 `m2Slide`(3챕터 임팩트 요약)의 영문 버전을 `Projects/m2Slide_en`으로 생성하여 영어권 대상 배포 지원
* 상세:
    - 원본: `Projects/m2Slide/` (AGENDA + 01-what/02-why/03-start, chapter mode, theme default)
    - markdown 본문·frontmatter(title/subtitle/description)·표·mermaid·htmlart 라벨을 영어로 번역
* 결과 (Walkthrough):
    - `Projects/m2Slide_en/` 생성 (config·VERSION·AGENDA + 01~03 챕터) → `./m2slide.sh m2Slide_en` 빌드 성공 (3챕터 10슬라이드)
    - htmlart(process/compare/radial) 라벨·표 영어화, 미치환 `{{ }}` 0건
    - 사용자 요청 반영: 커버 강사명 `남중구 (핀프라)` → `Steve J. South (finfra.kr)` (identifier-meta-rules — 사용자 명시 값)
    - Projects.md publishing=o 등록 + `Projects/.gitignore` 화이트리스트 추가 (--sync-projects)
    - 결과 링크: http://127.0.0.1:9877/p/m2Slide_en/n/c

## Issue266. default_lec 텍스트 전용 슬라이드 세로 중앙 정렬 제거 — top 정렬로 통일 (등록: 2026-07-06, 해결: 2026-07-06, commit: bcd9cad) ✅
* 목적: dev-server 피드백("문단 가운데 아니고 위로", AgenticCoding chap1/slide12) 반영 — 텍스트 전용 `_contents`/`_contents_no_title` 슬라이드 본문을 세로 중앙 정렬하는 `justify-content: center` 규칙(theme/default_lec/slide.css)을 제거하여 top 정렬로 통일. 반영 범위 질의 결과 사용자가 "테마 전체 top 정렬" 선택 (프로젝트 옵션 신설·보류 대신).
* 상세:
    - 해당 규칙은 "짧은 본문 아래 큰 빈 공간" 문제로 최근 추가된 것 — 제거 시 default_lec 사용 5개 프로젝트(AgenticCoding·GenContentProd·LlmFlow·graphify·m2slide_info) 전체 영향
    - 재발 방지: 규칙 자리에 top 정렬이 의도된 정책임을 알리는 주석 잔존
* 구현 명세:
    - `theme/default_lec/slide.css` 텍스트 전용 세로 중앙 블록 제거 (flex column 기본 = top)
    - AgenticCoding 재빌드 + slide12 top 정렬 검증, default_lec 타 프로젝트 1종 이상 재빌드 무회귀 확인
* 결과 (Walkthrough):
    - AgenticCoding·LlmFlow 재빌드 — slide12 본문 제목 직하 top 배치 확인 + LlmFlow 텍스트 슬라이드 정상 렌더 (캡처 `_doc_work/capture/verify-issue266-*.png`)
    - /feedback-process 절차 5 수행: 피드백 1건 `dev-feedback.done.jsonl` 이관, 인박스 비움 → 개요 페이지 미처리 0건
    - commit `bcd9cad`에 선행 세션 미커밋 default_lec parity 작업 동반 포함 (동일 파일 혼재 — 메시지에 명시)

## Issue264. dev-server 피드백 수동 처리 커맨드 + 개요 페이지 복붙 커맨드 박스 (등록: 2026-07-06, 해결: 2026-07-06, commit: b278aea) ✅
* 목적: Issue261로 적재되는 `_pipeline/feedback/dev-feedback.jsonl` 피드백의 소비 채널 확보 — 세션 자동 생성 대신 **수동 커맨드 방식**(사용자 결정) 채택. `/feedback-process <P>` 커맨드 신설 + 개요 페이지(`/p/<P>`) 상단 summary 우측·하단 bulk bar 우측 2곳에 복붙용 커맨드 박스(📋 복사 버튼 + 미처리 건수) 표시.
* 상세:
    - 배경: 사용자가 개요 페이지 [전송] 후 Claude Code 세션이 생기지 않는다고 보고 — 조사 결과 저장은 정상, 처리기가 설계 TODO(`_doc_arch/dev-server-feedback.md`)로 미구현이었음
    - 처리 방식 3택 질의 결과 "3번 커맨드 방식" 선택 + "표시한 부분(상단 summary 옆·하단 bulk bar 옆)에 복붙할 커맨드" 요구
* 구현 명세:
    - `lib/dev-server/server.py`: `_pending_feedback_count(project)` helper + `_serve_project_overview` 커맨드 박스 2곳 주입 + `_common_styles` `.fb-cmd-*` 스타일 + `_feedback_script` 복사 버튼 핸들러·전송 성공 시 미처리 카운트 갱신
    - `.claude/commands/feedback-process.md`: jsonl 읽기 → dedup → title/chap/slide로 소스 md 슬라이드 특정 → 의견 반영 수정 → 재빌드·검증 → 처리분 `dev-feedback.done.jsonl` 이관(인박스 비움) → 보고
    - `lib/dev-server/test_server.py`: pending count·커맨드 박스 렌더 테스트 추가
* 결과 (Walkthrough):
    - 테스트 42건 통과 (신규 3건 포함), dev-server 재시작 후 curl로 커맨드 박스 2곳·미처리 3건 렌더 확인
    - Playwright: 복사 버튼 클릭 → "✓ 복사됨" 피드백 동작, 캡처 `_doc_work/capture/verify-issue264-cmd-box-{top,bulkbar}.png`
    - 설계 문서 소비 설계·done.jsonl 규약·설계 결정 추가 (`_doc_arch/dev-server-feedback.md`)

## Issue263. Safari 진입 시 렌더링 오류 가능 경고 배너 (등록: 2026-07-06, 해결: 2026-07-06, commit: 5a37266) ✅
* 목적: Safari에서 markmap 등 일부 슬라이드 요소가 깨져 보이는 문제(라벨 겹침 등)에 대해, 모든 슬라이드 페이지 진입 시 Safari 감지 → 렌더링 오류 가능 경고를 표시하고 사용자가 확인 후 시작하게 함.
* 상세:
    - 재현: Safari에서 `/p/m2Slide/n/1/1#/toc-placeholder` — TOC markmap 라벨이 좌상단에 겹쳐 렌더 (Chrome 정상)
    - 요구: 슬라이드 시작 전 경고 → [계속 보기] 확인 후 진행
* 구현 명세:
    - `lib/html-builder.js`에 `M2_SAFARI_WARNING_HTML` 스니펫 상수 신설, `M2_CROSS_GUARD_HEAD_HTML` 주입 3개소(generateHTML deck·generateCoverHTML·generateAgendaHTML)에 동반 주입
    - UA 판정: `/safari/i` 매치 + `chrome|chromium|crios|edg|fxios|android` 제외
    - 세션당 1회만 표시(sessionStorage `m2SafariWarned`) — 챕터 간 이동 시 재경고 없음
    - 테스트 강제 표시: `?safari-warn=1` 쿼리 (비Safari에서도 배너 노출)
    - 외부 의존 0 (inline JS/CSS) — file:// 배포 호환
* 결과 (Walkthrough):
    - UA 판정 7케이스(Safari mac/iOS 표시, Chrome·Edge·Firefox·CriOS·Android 미표시) 전부 통과
    - Playwright: 일반 진입 미표시 + `?safari-warn=1` 강제 표시 → [계속 보기] 클릭 → 배너 제거 + sessionStorage 기록 확인
    - m2Slide·m2Slide_chapter_mode·m2Slide_single_mode 재빌드, deck·agenda·cover 3종 산출물 스니펫 포함 확인, `--lint-deployment` 위반 0건

## Issue262. H1 없는 챕터 파일 TOC markmap 링크 off-by-one — `#/1`이 TOC 자신을 가리킴 (등록: 2026-07-06, 해결: 2026-07-06, commit: ef69ab2) ✅
* 목적: chapter mode에서 챕터 소스 `.md`에 H1이 없을 때(H2만 존재) toc-placeholder markmap 링크가 전부 -1 시프트되어 첫 항목 클릭 시 TOC 자신(`#/1`)으로 이동하는 버그 수정.
* 상세:
    - 재현: `http://jm4.local:9877/p/m2Slide/n/1/1#/toc-placeholder` — tocData 링크 `#/1`·`#/2`, 실제 deck은 toc=`#/1`, 본문=`#/2`·`#/3`
    - 원인: `lib/html-builder.js generateTOCFromFile`의 `h1SlideRemoved` 보정이 파일에 H1이 실제로 존재하는지 확인하지 않음. H1이 없으면 제거될 H1 슬라이드 자체가 없는데 `slideIndex=0`으로 시작 → 모든 앵커 -1
    - 대조: H1 있는 `m2Slide_chapter_mode`는 정상 (`#/2`부터 정확)
* 구현 명세:
    - `generateTOCFromFile`에서 code fence 밖 `^# ` 존재 여부(`fileHasH1`) 사전 스캔
    - `hasTocInDeck`일 때 `slideIndex = (h1SlideRemoved && fileHasH1) ? 0 : 1` — H1 부재 시 첫 소스 슬라이드가 deck 슬롯을 그대로 차지하므로 1 시작
    - 검증: m2Slide(H1 없음) 링크 `#/2`·`#/3` + m2Slide_chapter_mode(H1 있음) 무회귀
* 결과 (Walkthrough):
    - 재빌드 후 tocData 링크 `#/2`·`#/3` 정상, Playwright로 TOC 항목 클릭 → `#/2` "마크다운 한 벌이면 끝" 착지 확인
    - 무회귀: m2Slide_chapter_mode 링크 불변(`#/1`~`#/4`), 영향 범위 스캔 결과 H1 없는 챕터는 m2Slide 3개뿐
    - 기존 테스트 통과 (integration 2건 실패는 수정 전부터 존재한 head-bar 관련 기존 실패)

## Issue261. dev-server 개요 페이지 슬라이드 목록 피드백 UI — bytes 이동 + 의견 입력 + policy 체크 전송 (등록: 2026-07-05, 해결: 2026-07-05, commit: 320d2cd) ✅
* 목적: `/p/<P>` 슬라이드 목록을 읽기 전용에서 슬라이드 단위 피드백 수집 채널로 확장 — bytes를 title 셀 우측 하단 배지로 이동하고, 그 자리에 의견 textarea + 행 [전송] + [policy] 체크박스(기본 false), 페이지 하단 일괄 전송 바를 추가. policy=true 항목은 프로젝트 L2 정책 인박스까지 반영.
* plan: `_doc_work/plan/dev-server-feedback_plan.md`
* task: `_doc_work/tasks/dev-server-feedback_task.md`
* 상세:
    - 설계 SSOT: `_doc_arch/dev-server-feedback.md` (UI·API·저장·policy 흐름)
    - 신규 `POST /p/<P>/feedback` (`items[]` 단일 스키마, 행 단건·하단 일괄 공용, do_POST 최초 도입)
    - 저장: 전 항목 `Projects/<P>/_pipeline/feedback/dev-feedback.jsonl` append, policy=true는 `Projects/<P>/_pipeline/policy/_dev-feedback.yml` `pending:` 추가 적재
    - 인박스 → 정식 단계 yml 분류·반영 처리기는 범위 밖 (설계 문서 🚧 TODO, 후속 이슈)
* 결과 (Walkthrough):
    - `server.py`: `_serve_project_overview` 테이블 재구성(bytes-badge·feedback-cell·bulk-bar) + `_common_styles` 확장 + `do_POST`/`_handle_feedback_post`/`_feedback_script` 신설
    - `test_server.py`: FeedbackPostTest 10건 추가 — 전체 39건 통과
    - 검증: curl POST 왕복(saved 2·policy_saved 1, jsonl·yml 확인, PyYAML 파싱 OK) + Playwright 스크린샷(`_doc_work/capture/verify-issue261-overview-feedback.png`)

## Issue259. TOC 슬라이드(h>0)에서 ← 키가 이전 챕터로 점프 — deck 내 이전 슬라이드로 가야 함 (등록: 2026-07-05, 해결: 2026-07-05, commit: e72a11c, 4e07c6b, 0ec84cd) ✅
* 목적: chapter divider(`#layout-chapter`)가 toc-placeholder 앞(h=0)에 오는 deck에서 `#/toc-placeholder`(h=1) ← 키 입력 시 같은 deck의 이전 슬라이드(h=0)로 이동해야 하나, 이전 챕터 마지막(`PREV_CHAPTER?last=1&back=1`)으로 cross-page 점프하는 회귀 수정.
* 상세:
    - 재현: `m2Slide_visual_component/02-diagram-math-symbol.html#/toc-placeholder`에서 ← → `01-text-structure.html?last=1&back=1#/11`로 이동 (기대: 02 챕터 h=0 divider 슬라이드)
    - 원인: `lib/html-builder.js` ← 키 핸들러(Issue70 매트릭스)의 `if (isTocSlide(cur) || atChapterDeckStart)` — `isTocSlide(cur)`가 슬라이드 위치(h index) 무관하게 무조건 cross-chapter 분기. TOC가 deck 첫 슬라이드(h=0)라는 옛 가정 잔존
    - 2026-07-02 "chapter divider를 toc-placeholder 앞으로 순서 역전" 변경 이후 TOC가 h=1이 되어 가정 붕괴
    - 구분 판정: reveal.js 라이브러리 문제 아님 — m2slide 자체 keydown 핸들러(프로젝트 코드) 문제
* 구현 명세:
    - 조건을 `(isTocSlide(cur) && idxL.h === 0 && idxL.v === 0) || atChapterDeckStart`로 변경 — TOC가 deck 시작일 때만 cross-chapter 점프, 그 외에는 Reveal 기본 ← (deck 내 이전 슬라이드)
    - 검증: m2Slide_visual_component 빌드 후 `/n/2/2`(toc)에서 ← → 같은 deck h=0 확인, divider 없는 챕터(toc가 h=0)에서 ← → 이전 챕터 마지막 유지 확인

## Issue260. GmarketSans webfont CDN 404 — 제목 폰트 깨짐 (등록: 2026-07-05, 해결: 2026-07-05, commit: 87feeb1, 4e07c6b, 0ec84cd) ✅
* 목적: `lib/css/base.css`의 `@import url('https://cdn.jsdelivr.net/gh/webfontworld/gmarket/GmarketSans.css')`가 404(레포 소실)라 GmarketSansBold 웹폰트가 전혀 로드되지 않는 문제 수정 — 제목(chapter divider·contents title 전체)이 로컬 폰트 유무에 따라 synthetic double-bold(뭉개짐) 또는 generic sans-serif로 렌더됨.
* 상세:
    - 재현: 배포본 `m2Slide_visual_component/01·02-*.html` 첫 슬라이드 제목 폰트 이상 (font-weight 700/900 요청 + 실 페이스 부재 → faux-bold)
    - 확인: `cdn.jsdelivr.net/gh/webfontworld/gmarket/GmarketSans.css` → HTTP 404, `webfontworld.github.io/gmarket/GmarketSans.css` → 200이나 본문 1바이트 (양쪽 모두 사망)
    - 사용처: base.css 변수 4곳(`--main-title-font-family` 등) 모두 `GmarketSansBold` 단일 페이스만 사용
    - 구분 판정: 특정 프로젝트 문제 아님 — base.css 공통 문제라 전 프로젝트 빌드 산출물 영향
* 구현 명세:
    - 죽은 `@import`를 가용 CDN(`https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansBold.woff`, 200 확인) 기반 `@font-face`로 교체
    - `font-weight: 100 900` 범위 선언으로 synthetic bold 재발 차단 + `font-display: swap`
    - base.css 수정 가드 준수: 대표 3프로젝트(m2Slide_single_mode·m2Slide_chapter_mode·layoutTest) 빌드 검증 의무
    - (실행 노트) layoutTest 프로젝트는 아카이브되어 부재 — single_mode·chapter_mode·visual_component 3종으로 빌드·폰트 로드 검증 수행

## Issue258. authoring-pipeline.md 단계 10 데이터 접근 표 불일치 (등록: 2026-07-03, 해결: 2026-07-03, commit: 9b57808) ✅
* 목적: `_doc_arch/authoring-pipeline.md` 내부 두 표의 단계 10(md2tts-txt) data 접근 기술 모순 해소 — 접근 허용 표는 `(없음)`, 운영 상태 표는 `data/md2tts-txt/ (글로벌 룰)`.
* 상세:
    - 실제 `data/md2tts-txt/` 폴더는 존재하나 **빈 폴더**였음 (leftover) — Stage Policy 각주("단계 8·10은 data 정책 없어 cascade 미적용")·`.claude/rules/data-access-rules.md` 모두 `(없음)`과 정합, 운영 상태 표만 이탈
    - 발견 경위: noteForHuman.md 단계 표 유동 연결 검토(2026-05-27), 이슈후보 3 승격
* 구현 명세:
    - 운영 상태 표 단계 10 행을 `(없음 — 글로벌 tts-pronunciation-rules.md만 허용)`으로 통일
    - 디렉토리 트리에서 `data/md2tts-txt/` 항목 제거 (slot-designer가 마지막 자식으로 승격)
    - 빈 `data/md2tts-txt/` 폴더 rmdir
    - 검증: `grep -rn "data/md2tts-txt" _doc_arch/ .claude/ data/` → 잔존 참조 0건. 단계 10 표기 3곳(`authoring-pipeline.md` 두 표 + `data-access-rules.md`) 모두 `(없음)` 일치
    - GitHub: https://github.com/Finfra/m2slide/issues/28
    - 참고: `_doc_arch/`는 gitignore 대상이라 fix 본문은 커밋에 미포함 — commit은 Issue.md 종결 기록

## Issue251. config 가 AGENDA frontmatter theme 미반영 — chapter mode 조용한 테마 불일치 (등록: 2026-06-30, 해결: 2026-07-03, commit: 6925ccd) ✅
* 목적: chapter mode 프로젝트가 `markdown/AGENDA.md` frontmatter 에 `theme: <name>` 만 선언하고 `_config.yml` 이 없으면, config.js 가 themeName=null→`default` 로 빌드하여 선언 테마가 조용히 무시되는 함정 차단.
* 근본 원인 (1차): `lib/config.js` 의 theme 해석이 `_config.yml`/`_config.org.yml` 만 읽고 AGENDA.md frontmatter `theme:` 는 반영 안 함.
* 근본 원인 (2차 — 실제 회귀 원인, 본 세션 재조사로 발견): 이전 세션(`01ad51a` 일괄 커밋)에서 frontmatter fallback 코드(`if (!cfg.themeName && projectDir) {...}`)가 이미 추가돼 있었으나 **죽은 코드**였음. `_config.org.yml` 이 전역 기본값으로 `theme: default` 를 선언 → `loadConfig` 최초 단계에서 `cfg.themeName` 이 이미 `'default'` 로 채워짐 → `!cfg.themeName` 조건이 항상 false → fallback 미실행. `/tmp` 스크래치 프로젝트(AGENDA `theme: default_lec`, `_config.yml` 없음)로 재현 확인.
* 구현 명세:
    - `lib/config.js` `loadConfig()`: override 파일(`ROOT/_config.yml`, `projectDir/_config.yml`) 의 raw 텍스트에 `^theme:`/`^slide_css:` 라인이 실제로 있는지 검사해 `themeExplicitlySet` 플래그로 추적 (`_config.org.yml` 전역 기본값은 이 플래그에 영향 없음).
    - frontmatter fallback 조건을 `if (!cfg.themeName && projectDir)` → `if (!themeExplicitlySet && projectDir)` 로 변경.
    - 우선순위: `ROOT/_config.yml`·`projectDir/_config.yml` 의 `theme:`/`slide_css:` (최우선) > 슬라이드 소스 frontmatter `theme:` > `_config.org.yml` 전역 기본값(`default`).
* 검증:
    - `/tmp` 스크래치 프로젝트(AGENDA `theme: default_lec`, override `_config.yml` 없음) 빌드 → `✅ Theme from frontmatter: default_lec` + `theme/default_lec/slide.css` 적용 (수정 전에는 조용히 `default` 적용됨)
    - 동일 프로젝트에 `_config.yml`(`theme: default`) 추가 → override 우선 적용되어 `default` 로 복귀 (우선순위 회귀 없음)
    - 대표 프로젝트(`m2Slide_single_mode`, `m2Slide_chapter_mode`, `fPmIntro`) 재빌드 — 모두 기존과 동일하게 `default` 테마 적용, 에러 없음
    - `./m2slide.sh --lint-data` 통과

## Issue250. layout 제목 폰트 누락 — base.css title SSOT 통합 (등록: 2026-06-30, 해결: 2026-07-03, commit: 01ad51a) ✅
* 목적: layout 제목군(`.chapter-title`·`.contents-title`·`.cover-title` 등)이 GmarketSansBold(`--main-title-font-family`)를 적용받지 못하고 `.reveal` 의 `--global-font-family`(Pretendard, 미로드) → 시스템 폰트(Apple SD Gothic Neo)로 폴백되던 회귀를 단일 출처로 영구 차단.
* 근본 원인: `lib/css/base.css` 의 title font-family 룰(`.reveal .title { font-family: var(--title-font-family) }`)이 `.chapter-title`·`.contents-title` 등 layout 제목 클래스를 selector 에 포함하지 않음. base.css 의 같은 클래스 묶음 룰은 `margin-bottom` 만 줌. 결과적으로 각 theme(`default`·`default_lec`)의 §3 공유 title 블록도 font-family 를 안 줘서 양쪽 테마 모두 깨짐. 테마 단위로 고치면 신규 theme 추가 시 또 누락하는 두더지 잡기.
* 구현 명세 (영구 SSOT):
    - `lib/css/base.css` §title SSOT — `.reveal .cover-title, .contents-title, .chapter-title, .chapter-toc-title, .toc-title, .blank-title, .closing-title, .summary-title, .exercise-title, section[class*="layout-"] h1` 묶음에 `font-family: var(--main-title-font-family, 'GmarketSansBold', sans-serif)` 적용. 각 theme 은 `--main-title-font-family` 변수만 override.
    - `theme/default/slide.css`·`theme/default_lec/slide.css` 의 중복 `font-family` 라인 제거, SSOT 위임 주석만 남김.
* 결과: 코드 변경은 이전 세션에서 이미 커밋(`01ad51a` "chore: 진행 중 변경사항 일괄 커밋 — history rewrite 사전 정리")됨. 본 세션에서 재검증만 수행:
    - `m2Slide_single_mode`·`m2Slide_chapter_mode`·`m2Slide_visual_component` 3종 빌드 성공, `--lint-config` 관련 에러 없음
    - Playwright headless computed style 검증: `m2Slide_visual_component` `.chapter-title`(H1) → `GmarketSansBold, sans-serif`, `.title`(H2) 다수 → `GmarketSansBold`, `.toc-page-title` → `GmarketSansBold, sans-serif`, `m2Slide_chapter_mode` cover 페이지 `.cover-title`(H1) → `GmarketSansBold, sans-serif` — 전 클래스 시스템 폰트 폴백 없음, 회귀 0
    - `custom.css`(theme 빌드 산출물)에는 중복 font-family 없음 확인, SSOT 규칙은 base.css inline `<style>`로만 주입됨(설계대로)

## Issue257. note-writer agent 실장 + authoring-pipeline 단계 재번호(9=note-writer, 10=md2tts-txt, 11=외부) (등록: 2026-07-03, 해결: 2026-07-03, commit: e09bb16) ✅
* 목적: Issue256에서 "4.5" 자리에 표만 등재하고 미구현으로 남겼던 note-writer agent를 실제 구현하고, 오케스트레이터 흐름에 정식 연동. 사용자 지시: note-writer는 md2tts-txt와 포지션이 같음(슬라이드 완전 구성 끝난 이후 시행) — 4.5가 아니라 단계 8(slide 생성) 다음, md2tts-txt 바로 앞자리(신규 단계 9)로 재번호.
* depends: Issue256
* plan: `_doc_work/plan/note-writer-agent_plan.md`
* 상세:
    - 재번호: 4.5(폐기) → 9=note-writer(신규) → 10=md2tts-txt(기존 9에서 이동) → 11=외부 videoMaker(기존 10에서 이동)
    - 영향 파일: `_doc_arch/authoring-pipeline.md`(SSOT) · `.claude/agents/authoring-pipeline.md`(오케스트레이터, 실제 흐름 연동) · `.claude/commands/m2.md` · `.claude/rules/data-access-rules.md` · `Harness.md` · `noteForHuman.md` · `_doc_arch/speaker-notes-design.md`(포지션 재설계) · 기타 "단계 9"/"1~9" 언급 문서 다수
    - 신규 SCAR: `.claude/agents/note-writer.md` (media-creater.md 패턴 준용, 데이터-주도) + `data/note-writer/patterns.yml`
* 구현 명세: plan 파일 참조.
* 검증: `/m2 continue` 흐름 문서상 단계 9(note-writer)가 더 이상 skip 서술 없음, 오케스트레이터 dispatch 목록에 9 포함, `--from-stage`/`--to-stage` 상한 1~10 반영, 회귀 문서 grep(구 "4.5" 잔존 0건, 구 "단계 9=md2tts-txt" 잔존 0건).
* 결과(2026-07-03, 커밋 대기 — Issue256과 함께 미커밋): **완료**.
    - 신규: `.claude/agents/note-writer.md`(media-creater.md 패턴 준용) + `data/note-writer/patterns.yml`(slug 생성·톤 프리셋·노트 길이 가이드·검증·체크포인트, YAML 파싱 확인)
    - 재번호 반영: SSOT(`_doc_arch/authoring-pipeline.md`, 표+단계별 상세+코드블록+데이터 격리 표), 오케스트레이터(`.claude/agents/authoring-pipeline.md` — 상한 1~10, dispatch 목록에 9 추가, 체크포인트 4·5·7·9), `.claude/commands/m2.md`(resume 표에 "선택 단계" 로직 포함, 상한값), `data-access-rules.md`, `Harness.md`, `noteForHuman.md`, `_doc_arch/speaker-notes-design.md`(4.5안 폐기 기록 보존 + 최종 위치 서술), 2차 영향 7개 문서
    - grep 회귀 검증: 잔존 "4.5"는 모두 의도된 폐기 기록(히스토리 서술)뿐, "단계 9=md2tts-txt" 오참조 0건, 테이블 컬럼 수 불일치 0건, YAML/frontmatter 파싱 정상
    - ppt2m2slide.md의 기존 TODO("PPT speaker notes 변환처 미정")를 note-writer/note.md로 연결하는 후속 힌트도 함께 갱신
    - 문서 정정: 2026-07-03 이슈-선후행-정리 작업에서 코드/문서 grep 대조로 완료 재확인 후 🔥 진행 중 → ✅ 완료 이동(원 이슈 텍스트 자체는 이미 "결과: 완료"로 자기보고했으나 섹션 이동이 누락되어 있었음). 2026-07-06 deploy 세션에서 미커밋 구현분(`.claude/agents/note-writer.md` 등)이 commit e09bb16으로 랜딩 → commit: TBD 확정.

## Issue256. 발표자 노트 `{md파일명}_note.md` 분리 관리 — slide-id 매칭 + 빌드 병합 (등록: 2026-07-03, 해결: 2026-07-03, commit: e09bb16) ✅
* 목적: 발표자 노트를 슬라이드 본문 `.md`에 인라인(`Note:`)하지 않고 `{md파일명}_note.md` 별도 파일로 분리 관리. reveal.js speaker view(`s` 키)가 실제로 노트를 표시하는지는 현재 미구현·미검증 상태(reveal.js notes plugin은 로드되어 있으나 파싱·병합 로직 전무) — 기술적 증명 필요.
* plan: `_doc_work/plan/speaker-notes_plan.md`
* task: `_doc_work/tasks/speaker-notes_task.md`
* 상세:
    - 설계 문서: `_doc_arch/speaker-notes-design.md` (Q&A로 확정 — 매칭 방식: slide id, 파이프라인 편입: 신규 stage `note-writer`)
    - 본 이슈 범위: `#id-{slug}` 디렉티브 파싱 + `lib/notes.js` note.md 파서 + `lib/html-builder.js` 빌드 병합(`<aside class="notes">` 삽입) + aTest 프로젝트 기술 검증
    - note-writer agent(신규 stage 4.5, Info.md/refs 기반 자동 노트 초안 생성)는 규모가 커 **범위 밖** — 본 이슈 완료 후 별도 이슈로 분리
* 구현 명세:
    - `lib/slide-parser.js` `extractDirectives()`에 `#id-{slug}` 매처 추가(legacy alias 매처보다 먼저 매칭되도록 위치 고정)
    - `lib/notes.js` 신규 — `{stem}_note.md`를 `## {slide-id}` 기준으로 파싱해 `Map<slide-id, rawMarkdownText>` 반환
    - `lib/html-builder.js` `generateHTML()`에서 파일별 note.md 로드 → `_applyDirectiveAttrs` 호출 두 지점(`generatePlainSlideHTML`·`generateSlideHTML`) 모두에 `_applyNotesAside` 추가
* 검증: `Projects/aTest`에 노트 테스트 챕터 추가 → 1차(빌드 HTML 내 `<aside class="notes">` grep 대조) + 2차(Playwright로 `s` 키 입력 후 speaker view 팝업 스크린샷 노트 텍스트 확인) 2단계. 2차는 headless 환경 제약 가능 — 실패 시에도 결과를 있는 그대로 기록.
* 결과(2026-07-03, 커밋 대기 — 미커밋): 1차·2차 검증 모두 **성공**, headless 제약 없음.
    - 빌드 중 부수 발견 — `{stem}_note.md`가 별도 챕터로도 렌더되던 문제를 `lib/generate-slides.js`·`lib/generate-epub.js`의 `.md` glob 필터에 `_note.md` 제외 조건 추가로 해결
    - 1차: `<aside class="notes">` 정확 삽입(2줄 노트는 `<p>` 2개 분리) · id 미부여 슬라이드는 `<aside>` 미삽입 · orphan note.md 항목 `console.warn` 정상 발화 · `--lint-deployment aTest` 위반 0건 · 기존 애니메이션 디렉티브 테스트 21/21 통과(회귀 없음)
    - 2차: dev-server 접속 → `s` 키 → speaker view 팝업 즉시 포착 → 스크린샷 3장으로 노트 텍스트 실제 렌더 확인. 스크린샷: `_doc_work/capture/issue256-speaker-view-{notes-check-1,notes-check-2,no-id}.png`
    - 상세는 `_doc_work/tasks/speaker-notes_task.md` "검증 결과" 섹션, 설계 문서 갱신은 `_doc_arch/speaker-notes-design.md`
    - note-writer agent(stage 4.5)는 계획대로 범위 밖 유지 — 별도 이슈 필요 시 🌱 이슈후보 등록
    - 문서 정정: 2026-07-03 이슈-선후행-정리 작업에서 코드(`lib/notes.js`·`lib/slide-parser.js`·`lib/html-builder.js`)·테스트(`node --test` 회귀 통과)·산출물(`Projects/aTest/markdown/20-speaker-notes-test_note.md` 등) 대조로 완료 재확인 후 🔥 진행 중 → ✅ 완료 이동. 2026-07-06 deploy 세션에서 미커밋 구현분(`lib/notes.js`·`lib/slide-parser.js`·`lib/html-builder.js` + `_note.md` glob 제외)이 commit e09bb16으로 랜딩 → commit: TBD 확정.

## Issue255. 모든 PPT 메타에 github_url·homepage 글로벌 기본값 주입 (등록: 2026-07-02, 해결: 2026-07-03, commit: 01ad51a) ✅
* 목적: 생성되는 모든 PPT 의 cover 메타에 GitHub 주소(`github.com/Finfra/m2slide`)와 finfra.kr 주소(`https://finfra.kr`)가 항상 포함되도록 글로벌 기본값을 도입. 사용자 요청 — "생성되는 모든 pt 메타데이터에 github·finfra.kr 주소 삽입".
* 상세:
    - 결정(폼 회수): github=`github.com/Finfra/m2slide`, homepage=`https://finfra.kr`, 적용 범위=둘 다(SSOT 기본값 + 기존 소급).
    - cover 템플릿(default theme)에 `{{github_url}}`(좌상)·`{{homepage}}`(우하) 슬롯은 이미 존재하나, `loadProjectMeta`가 frontmatter만 파싱 → 기본값 없어 미치환(빈 wrapper 제거)되던 상태.
    - meta-yml.md line 32 "글로벌 기본값 없음" 정책에 이 두 필드를 예외로 추가.
* 구현 명세:
    - `lib/config.js` `loadProjectMeta`: `DEFAULT_PROJECT_META = { github_url, homepage }` 를 base 로 병합 (frontmatter·VERSION 이 override). frontmatter 부재(early return) 경로에도 기본값 주입 → **모든 빌드 소급 적용**(기존 프로젝트 포함 = "둘 다" 충족).
    - `_doc_arch/meta-yml.md`: 글로벌 기본값 정책·스키마 표·cover 슬롯 표에 `github_url`·`homepage` 추가.
    - default_lec cover 도 코너 슬롯 3종(`github_url`·`version_badge`·`homepage`) 추가 — default theme 과 parity 확보(당초 "미보유" 계획에서 범위 확장).
* 결과: `lib/config.js` `DEFAULT_PROJECT_META` 구현 + `theme/default/layouts/_cover.html`·`theme/default_lec/layouts/_cover.html`·`theme/default_lec/slide.css` 코너 슬롯 반영, `_doc_arch/meta-yml.md` 문서화까지 커밋 01ad51a에 이미 포함되어 있었음(Issue.md 결과 기록만 누락된 상태였음).
* 검증: frontmatter에 `github_url`/`homepage` 미선언한 `BasicKnowledgeForAI_small`(theme: default) 빌드 → `/p/BasicKnowledgeForAI_small/n/c` cover HTML에 `<div class="cover-corner cover-tl">github.com/Finfra/m2slide</div>`·`<div class="cover-corner cover-br">https://finfra.kr</div>` 기본값 치환 확인 (2026-07-03 재검증).
    - `data/info-filler/questions.yml`·`data/md-builder` 템플릿 명시 emit(선택 사항)은 fallback이 이미 보장하므로 후속 필요 시에만 진행.

## Issue254. Projects.md gitignored + publishing 열 SSOT 로 Projects/.gitignore 자동 생성 (등록: 2026-07-02, 해결: 2026-07-02) ✅
* 목적: `Projects.md` 를 git 미추적 로컬 인덱스로 전환하고, 그 publishing 열을 SSOT 로 `Projects/.gitignore` 추적 허용목록을 `--sync-projects` 가 자동 생성하도록 함. 수동 유지되던 `Projects/.gitignore` 를 Projects.md 로 일원 관리.
* 상세:
    - **추적 드라이버 = publishing 열**(사용자 결정): publishing 값 있으면 `!/<Name>/` 추적, 없으면 ignore. Projects.md note "publishing 아닌 건 github 동기화 안 함"과 정합
    - **Projects.md gitignored**: 루트 `.gitignore` 에 `Projects.md` 추가 + `git rm --cached Projects.md`. Issue.md·CLAUDE.md 처럼 로컬 파일화
    - **회귀 방지 시드**: publishing 미기입 폴더는 현재 `Projects/.gitignore` 허용 여부로 `x` 역시드 → 기존 추적 상태 보존(드롭 0). aTest 는 기존 publishing=x 존중하여 추적 추가(explicit)
* 구현 명세:
    - `lib/sync-projects-md.js`: `readGitignoreAllow()`·`renderGitignore()` 추가, publishing 시드 로직, `Projects/.gitignore` 생성·`--check` 양쪽 판정, 추적 add/drop diff 로그
    - `.gitignore`: `Projects.md` 등록. `Projects/.gitignore`: 자동 생성본으로 교체(11 폴더 추적, 헤더에 수동편집 금지 안내)
    - 문서: `.claude/commands/sync-projects.md`(관계 섹션 신설)·`.claude/rules/project-version-rules.md`(구동 원칙 추가)
    - 검증: `node -c` OK, `--sync-projects` idempotent, `git check-ignore` 로 추적 폴더 new file 허용·미추적 폴더 ignore·기존 커밋 파일 신규 ignore 0건 확인
    - **후속(사용자 Projects.md 재편)**: (1) `분류` 열 신설 → 스크립트 7열 스키마 대응(`rowToMeta` 7/6열 자동감지). (2) publishing 판정 재정의 — "값 있음"→**`o`=추적 / `x`·빈값=제외**(`AFFIRM_RE`/`isTracked`), seed 값도 `o`. (3) 재동기화: 추적 10(+BasicKnowledgeForAI_small·fPmIntro·m2Slide_visual_component), 제외 4(AgenticCoding·LlmFlow·aTest·graphify). (4) publishing=x 이며 커밋돼 있던 AgenticCoding(395)·graphify(1) 은 사용자 승인 후 `git rm --cached -r` untrack(디스크 보존)

## Issue253. VERSION 파일 컴파일 시점 임베드 + Projects.md 표 자동 동기화 SCAR (등록: 2026-07-02, 해결: 2026-07-02, commit: efea317) ✅
* 목적: (1) 빌드 시 `Projects/<Name>/VERSION` 을 읽어 슬라이드 HTML(cover)에 버전 문자열을 **컴파일 시점에 정적 임베드** — 런타임 파일 참조 없이 산출물에 박제. (2) `Projects.md` 활성/비활성 표를 VERSION·폴더 기준으로 자동 동기화하는 로컬 SCAR 신설.
* 구현:
    - `lib/config.js loadProjectMeta` — VERSION 파일 존재 시 `cfg.projectMeta.version` 을 VERSION 값으로 주입(VERSION 우선, frontmatter fallback). `{{version}}` 치환이 정적 문자열 산출 → 컴파일 시점 임베드.
    - `lib/sync-projects-md.js` (신규) + `m2slide.sh --sync-projects [--check]` + `.claude/commands/sync-projects.md`: 활성 표 버전 열 = VERSION 값, 사람 작성 열 보존, 폴더 제거 시 `# 비활성 프로젝트 (z_done)` 표로 이동, idempotent, East-Asian 표시폭 정렬.
    - `.claude/rules/project-version-rules.md` — 빌드 임베드·표 동기화 원칙 반영. `Projects/{graphify,m2Slide}/VERSION` 추가(나머지 프로젝트는 `Projects/.gitignore` 미추적이라 커밋 제외, 파일은 디스크에 존재).
* 검증: 빌드 3종(single/chapter/GenContentProd) 성공·회귀 0, GenContentProd cover 소스 `v1.1`→VERSION `1.1` 임베드 확인(VERSION 우선), `--sync-projects` idempotent + 팬텀 행 제거→비활성 이동 확인, `--lint-deployment` 위반 0.

## Issue252. dev-server cross-page `?last=1` 진입 실패 — chapter-nav 변수에 `#/1` 오주입으로 이전 챕터 마지막 슬라이드 대신 toc-placeholder 착지 (등록: 2026-07-02, 해결: 2026-07-02, commit: 72ec356) ✅
* 목적: `/p/<P>/n/<chap>/1` deck 에서 ← (또는 TOC ←) 키로 이전 챕터로 넘어갈 때 마지막 슬라이드(K2)로 가야 하나 첫 슬라이드(`#/toc-placeholder`)에 착지하던 회귀 수정.
* 근본 원인: dev-server `_rewrite_nav_strings` 가 빌드 산출물의 모든 `'*.html'` 문자열에 `#/1` 을 자동 주입(Issue242). chapter-nav JS 변수(`PREV_CHAPTER` 등)는 런타임에 `VAR + '?last=1&back=1'` 로 쿼리를 **뒤에** 붙이므로 최종 URL 이 `…/n/N/1#/1?last=1&back=1` 가 됨. (1) 강제 `#/1` → 첫 슬라이드 진입 (2) 쿼리가 hash 뒤로 밀려 `location.search` 빔 → 빌드 산출물의 `Reveal.on('ready')` `?last=1` 핸들러 미발화 → 마지막 슬라이드 점프 소실. 사용자가 본 `#/toc-placeholder` 는 점프 실패 후 잔류 상태.
* 영향 범위: 런타임에 쿼리를 붙이는 7개 변수 — `PREV_CHAPTER`·`NEXT_CHAPTER`·`PREV_SIBLING_CHAPTER`·`NEXT_SIBLING_CHAPTER`·`LAST_CHAPTER`(PgDown)·`COVER_LAST_CHAPTER`·`AGENDA_LAST_CHAPTER`.
* 해결:
    1. `lib/dev-server/server.py` — `_NAV_CHAPTER_VAR_RE` 정규식 추가 + `_rewrite_nav_strings` 선행 pre-pass. 이 7개 변수 선언만 hash 미주입 bare short-path(`/p/<P>/n/N/1`)로 rewrite. 빈 값(`''`, 첫 챕터)은 `.html` 부재로 미매칭 → 보존. 정적 href·`_tocData` JSON href 는 기존 `#/1` 유지(쿼리 미부착이라 안전).
    2. `lib/dev-server/test_server.py` — `ChapterNavVarRewriteTest` 5 케이스(변수 매칭·전체 변수명·빈 값 skip·이미 치환된 값 skip·hash 미포함).
    3. `_doc_arch/dev-server.md` — proxy rewrite 예외 규칙 문서화.
* 검증: 서버 응답 `PREV_CHAPTER='/p/FpmIntro/n/1/1'`(hash 제거) ✅. Playwright — ch2 TOC 에서 ← → `/p/FpmIntro/n/1/1#/8`(ch1 마지막, curIdx 7/8) ✅. dev-server 단위 테스트 30 pass(25 기존 + 5 신규) ✅.
* 근거: 로직(설계 문서 `key_navigation.md` K2)은 정확했고 결함은 dev-server rewrite 구현에 있었음.

## Issue249. layout-contents-full 이미지/SVG 세로 overflow — contents 영역 초과 (등록: 2026-05-28, 해결: 2026-05-28, commit: TBD)
* 목적: `#layout-contents-full` 슬라이드의 이미지·SVG(단일·다중 모두)가 contents 영역(하단 프레임선)을 넘어가는 문제 해결.
* 근본 원인: contents-full만 html-builder의 title hoist 대상에서 누락 → title이 `.contents-body` 내부에 남아 media-container와 flex 자식 경쟁 → media flex:1 collapse(이미지 소멸) 또는 height 제약 부재로 overflow. 추가로 default_lec에 `section[class*="layout-"] { min-height:100% }` 누락(default 테마엔 존재)되어 flex 높이 chain 단절.
* 해결 (3-part, _contents와 동일 구조로 통일):
    1. `lib/html-builder.js` hoist 정규식 `^_?contents(_no_title)?$` → `^_?contents(_no_title|-full)?$` — contents-full도 title을 section 직속으로 hoist (body엔 media만 남김)
    2. `theme/{default,default_lec}/slide.css` — `layout-contents-full > .contents-body`를 flex-column 처리 추가 (기존 `_contents`/`_contents_no_title`와 동일)
    3. `theme/default_lec/slide.css` — `section[class*="layout-"] { min-height:100% }` 포팅(default 동등). flex 높이 chain definite 확보
* 검증: /n/4/1 단일 다이어그램 fit ✅, /n/2/1#/8 이미지 2개(matrix+pdf-p013) 양쪽 fit ✅, 텍스트 슬라이드·chapter divider 회귀 0
* 참고: 단일 이미지 fit용 base.css `.media-enlarge-width img { max-height:100% }`도 2026-05-28 동반 적용

## Issue248. dev-server URL semantic 분리 — `/s/` = solo design view (단일 슬라이드), `/n/` = deck navigation (path-based) (등록: 2026-05-28, 해결: 2026-05-28, commit: ebbca88, 91ea9db, b7d7a3d, 95d431c, 7ce2bf5) ✅
* 목적: 슬라이드 디자인 확인 시 단일 section만 추출(solo) + deck navigation 시 URL 안정성 보장. 초기 v1은 `?mode=nav` 쿼리로 구현했으나 cross-page nav 시 query가 손실(`/s/1/?fwd=1#/toc-placeholder` 깨짐)되어 path-based로 재설계.
* 최종 설계 (v2):
    - `/p/<P>/s/<chap>/<slide>` = **solo design view** (단일 section + 풀 테마/JS). plain text는 `?mode=text`
    - `/p/<P>/n/<chap>/<slide>` = **deck navigation** (전체 deck + reveal.js nav). slide token은 1-base 정수 또는 reveal.js section id (`toc-placeholder` 등)
    - `/p/<P>/n/<chap>` = chap 단독 진입 (slide_n=1)
    - `/p/<P>/n/c` / `/n/a` / `/n/t` = deck entry (cover/agenda/toc) — fallback chain 자동 처리
    - legacy: `?mode=nav`/`?mode=raw` 302→ `/n/` form. `/s/c`·`/s/a`·`/s/t` 302→ `/n/{c,a,t}`. cross-page nav rewrites도 모두 `/n/` 타깃
* 결과 (5 commits — ebbca88·91ea9db·b7d7a3d·95d431c·TBD):
    - `lib/dev-server/server.py`:
        - `_serve_solo_slide(file_rel, n)` — build artifact section N만 남긴 응답 (theme/JS 유지)
        - `_proxy_build_artifact(slide_n)` — slide_n이 int 또는 str(reveal.js section id) 수용. `#/<token>` hash inject (`json.dumps` JS-safe escape)
        - `_serve_short_nav_indexed(project, chap_idx, slide)` + `_serve_nav_{c,a,t}` — `/n/` path 핸들러
        - `_SHORT_NAV_CHAP_RE`·`_SHORT_NAV_CHAPONLY_RE`·`_SHORT_NAV_{C,A,T}_RE` 신규 regex
        - `_stem_to_short_path` cross-page rewrite 타깃을 `/n/` form으로 전환
        - `/s/c`·`/s/a`·`/s/t` 302→ `/n/{c,a,t}`. `?mode=nav` 302→ `/n/<chap>/<n>`
        - 프로젝트 목록 카드 first_link → `/n/c`, overview 테이블 title → `/n/<chap>/<slide>`, "open deck" → `/n/<chap>/1`. preview iframe은 `/s/` (solo) 유지
        - overview iframe 썸네일 (480×270, scale 0.25, lazy)
    - `lib/dev-server/test_server.py`: `SoloSliceTest` 3개 + `NavRouteRegexTest` 5개 신규 (총 14 → 22 tests OK)
    - `.claude/rules/apply-verify-rules.md`·`_doc_arch/dev-server.md`·`.claude/skills/open-slide/SKILL.md`: `/s/` solo + `/n/` deck path 분리 반영, legacy `?mode=nav` deprecation 명시
* hash `#/N`은 브라우저가 서버로 전송 안 함 → 쿼리/path 둘 다 분기 가능했으나 cross-page rewrites와 URL 안정성 이유로 path-based 채택
* 검증: bare `/s/2/3`=1 section (solo), `/n/2/3`=50 sections (deck), `/n/1/toc-placeholder` → `#/toc-placeholder` inject, `/s/c` → 302 `/n/c`, `?mode=nav` → 302 `/n/<chap>/<n>`. 22 tests OK.

## Issue246. ppt2m2slide 사후 diff 학습 — 변환본 vs 사용자 수정본 차이 자동 추출 (등록: 2026-05-27, 해결: 2026-05-27, commit: 31aa92d) ✅
* 목적: Issue245 Phase C — ppt2m2slide로 .pptx 변환 후 사용자가 markdown/*.md를 수정한 내용을 원본 변환본과 diff하여 mappings.yml 학습 후보로 추출. ppt2m2slide의 후속 변환 정확도를 점진 향상.
* plan: `_doc_work/plan/ppt2m2slide-post-diff_plan.md`
* 결과 (Phase C-1·C-2·C-3·C-4 모두 완료):
    - C-1: `lib/tuner/ppt-post-diff.py` 신규 — line-level diff + 카테고리화 + `data/_proposals/post-convert-<ts>-<cat>.md` 자동 생성
    - C-2: 6종 카테고리(layout_changed·slot_added·image_replaced·mapping_missing·frontmatter_changed·text_corrected) 정의 + 카테고리별 임계치(mapping_missing=1, layout/slot=2, image=3, text=5)
    - C-3: ppt2m2slide agent Step 7(변환 직후 markdown 스냅샷 저장 `_pipeline/post-convert/markdown/`) + Step 8(사후 diff 사용자 명시 트리거) 추가
    - C-4: `promote-to-data.py` 일반화 — `post-convert-*.md`도 promotion-*과 동일 워크플로우(list/show/merge/reject/hold) 처리. `--lint-data` Step 3도 양쪽 status 검증
* 정책 SSOT: `data/ppt2m2slide/post-diff-rules.yml` (untracked, gitignored)
* 검증: 인공 시나리오(`/tmp/ppt-diff-test`)로 4 events 검출(frontmatter_changed·mapping_missing·layout_changed·slot_added) → mapping_missing 1건만 임계치 충족 후 후보 생성
* v2 후속:
    - frontmatter 라인 분류 정밀도 (현재 snapshot 기준이라 사용자 추가 frontmatter는 body로 오분류 가능)
    - 카테고리별 removed/added 정확 분리 (현재 body 전체 표시)
    - cross-project 누적 임계치 (한 프로젝트 1회 발생이 다른 프로젝트와 합쳐 임계치 도달 시 학습)
* 관련:
    - Issue245 (학습 루프 v1, 완료) — 본 이슈와 통합 워크플로우 (promote-to-data.py)
    - Issue247 (backup·lint, 완료) — 본 이슈도 backup 의무 동일 적용

## Issue247. data-access-rules backup·lint 강화 — promotion 머지 시 자동 backup + 일관성 검증 (등록: 2026-05-27, 해결: 2026-05-27, commit: e53b0bf) ✅
* 목적: Issue245 Phase D — promote-to-data.py로 yml 머지 결정 시 해당 `data/<stage>/*.yml`이 사용자에 의해 실제 수정될 때 자동 backup이 보장되고, 정합성 위반 시 lint로 사전 차단. 학습 루프의 신뢰성·되돌리기 가능성 확보.
* 결과 (Phase D-1·D-2·D-3 모두 완료):
    - D-1: `lib/tuner/backup-data-yml.sh` 신규 — `data/<stage>/_backup/<YYYYMMDD-HHMMSS>-<원본>.yml` 자동 백업, 30개 회전
    - D-2: `promote-to-data.py --action merge` 시 backup 자동 호출 + `.claude/rules/data-access-rules.md`에 "Promotion 머지 시 backup 의무" 절 추가
    - D-3: `./m2slide.sh --lint-data` 신규 subcommand — yml 파싱·patterns categories↔priority 일관성·promotion-*.md status 유효성 3종 lint
* 검증: `./m2slide.sh --lint-data` 통과 (모든 data/*.yml 파싱 OK, patterns 매핑 OK, promotion status 유효)

## Issue245. 피드백 → `data/<stage>/` 학습 루프 v1 — slide-tuner · ppt2m2slide 사용자 피드백 자동 분류·격리·promotion (등록: 2026-05-27, 해결: 2026-05-27, commit: e53b0bf) ✅
* 목적: slide-tuner / ppt2m2slide 사용 중 발생하는 사용자 피드백을 forward 단계 표(noteForHuman.md L42-58)의 참조 `data/<stage>/*.yml`에 자동·반자동으로 누적하여, 다음 회차 작업 시 같은 패턴 반복 수정을 회피하는 학습 루프 구축. v1 MVP는 slide-tuner 측 집계기 + promotion 폼까지.
* plan: `_doc_work/plan/feedback-learning-loop_plan.md`
* 결과 (Phase A·B 완료):
    - Phase A: `lib/tuner/aggregate-feedback.py` 신규 + slide-tuner agent Step 9 — round-N.md 파싱 후 카테고리별 카운트, 임계치 초과 시 `data/_proposals/promotion-<ts>-<cat>.md` 자동 생성
    - Phase B: `lib/tuner/promote-to-data.py` 신규 (list/show/action merge|reject|hold) + Step 10 — AskUserQuestion 카드 컨펌 후 status 갱신 + 카테고리별 머지 가이드 출력
    - patterns.yml `promotion` 절 추가 — thresholds·target_yml·output 정책 외부화
    - 검증: BasicKnowledgeForAI_small_model round-1.md → novel 1건 → `promotion-1779801709-novel.md` 자동 생성
* 후속 분리:
    - Issue246: Phase C (ppt2m2slide 사후 diff) — 진행 중
    - Issue247: Phase D (backup·lint 강화) — 완료

## Issue244. slide-tuner — source(PDF/PPTX) ↔ 웹 캡처 side-by-side 일괄 피드백 자동화 (등록: 2026-05-26, 해결: 2026-05-27, commit: 3ae083a) ✅
* 목적: ppt2m2slide 변환 후 사용자가 매번 스크린샷 + CSV로 피드백을 주는 수동 워크플로우를, 사용자가 폼 한 장으로 N장 슬라이드의 의견을 일괄 제출하면 agent가 자동 수정 + 재빌드 + 재확인까지 반복하는 학습 루프로 자동화
* plan: `_doc_work/plan/slide-tuner_plan.md`
* task: `_doc_work/tasks/slide-tuner_task.md`
* arch: `_doc_arch/slide-tuner.md`
* round-1: `_doc_work/tuner/1779801709/round-1.md`
* 상세:
    - source: Issue241 학습 사례 — 사용자 스크린샷·CSV 수동 매칭 부담 인식
    - 핵심 UX: 비교폼 카드 N개 (좌: 현재 슬라이드 / 우: PDF 페이지 / 하: 정상 체크 + textarea)
    - Mode B form 자동 회수 인프라(`htm-ask-intercept.sh`) 활용
    - v1 범위: 캡처 + PDF 페어링 + 단일 라운드 폼 + 자유 텍스트 피드백 + md 단순 수정 (4 카테고리 분류)
    - v2+ 분리: PDF crop 자동화, LLM 분류, data yml 자동 반영, Issue commit
* v1 MVP 진행 결과 (2026-05-26):
    - Step 1~8 + Step 4.8(alignment) 전 단계 시연 완료
    - BasicKnowledgeForAI_small_model 21장 비교 라운드 1회 완주
    - 회수 결과: 20장 정상 / 1장 수정(c2/s3 "윈도우에서 접속시")
    - patch 적용: bullet 2+3 통합 ("file은 fileZilla ftp 사용 / upload(일명 sftp)")
    - 신규 산출물:
        * `lib/tuner/extract-pdf-pages.py`, `build-pairing.py`, `detect-viewport.py`, `build-form.py`, `build-align-form.py`
        * `data/slide-tuner/patterns.yml` (v1 4종 카테고리)
        * `.claude/agents/slide-tuner.md`
        * `_doc_arch/slide-tuner.md`, `_doc_work/tuner/probe-mode-b.md`
    - 발견 이슈 (v2+ 후속 — 별도 이슈로 분리 권장):
        * PDF offset 자동 검출 한계 — Step 4.8 사용자 컨펌 사전 검증 의무 (현재 채택안)
        * fetch URL `cwd` 파라미터 raw `/` Firefox fetch 실패 — `quote(safe="")` 완전 인코딩 필수
        * v1 카테고리로 미커버되는 novel 패턴 — `layout_bullet_merge` 카테고리 후보 (`_proposals/tuner-1779804147-novel-c2s3.md`)
* 구현 명세:
    - Step 1 (선행): raw HTML form vs AskUserQuestion 호환성 검증 — `_doc_work/tuner/probe-mode-b.md` 결정
    - Step 2: 보조 스크립트 3개 (extract-pdf-pages.py, build-pairing.py, detect-viewport.py)
    - Step 3: `.claude/agents/slide-tuner.md` 운영 명세
    - Step 4: Playwright 캡처 + pdftoppm + 페어링 매핑
    - Step 4.8 (Issue242 후속): PDF↔슬라이드 alignment 사전 검증 (offset 사용자 컨펌)
    - Step 5: 비교·피드백 폼 HTML 생성기
    - Step 6: 피드백 회수 + md 단순 수정 (v1 카테고리 4종)
    - Step 7: 재빌드 + 변경 슬라이드 재캡처 (max-rounds 5)
    - Step 8: Issue.md 갱신 + 라운드별 이력 보존

## Issue243. _config.yml `agenda_enabled: false` 옵션 — agenda.html 생성·네비게이션 fallback 차단 (등록: 2026-05-27, 해결: 2026-05-27, commit: b256042) ✅
* 목적: PDF SSOT 변환 프로젝트(예: GenContentProd_v1.1)에서 agenda.html이 불필요. cover_enabled·toc_placeholder·cards_placeholder와 동등한 opt-out 플래그 제공. 빌드 산출물에서 agenda.html 미생성 + index.html cover/redirect를 첫 챕터로 직행.
* 결과:
    - `lib/config.js`: `agendaEnabled: true` default + `agenda_enabled:` 파싱 추가
    - `lib/generate-slides.js`: `cfg.agendaEnabled === false` 시 agenda.html 생성 skip + cover_enabled=false redirect target = 첫 챕터로 분기 + generateCoverHTML에 `agendaEnabled`·`firstChapter` 인자 전달
    - `lib/html-builder.js`:
        * deck nav `M2SLIDE_AGENDA_URL`(back) + 신규 `M2SLIDE_AGENDA_FWD_URL`(forward) 변수화 — agenda_enabled=false 시 forward = `<firstChapter>?fwd=1`
        * deck nav 하드코딩 3건(↓ cover→agenda, → cover override, End cover→agenda) 변수 치환
        * generateCoverHTML 신규 인자 `agendaEnabled`·`firstChapter` 수용 + cover nav `COVER_AGENDA_FWD` 변수 추가
        * cover nav 하드코딩 4건(→/↓/Space, PgUp, End, click) 변수 치환
    - `lib/agenda.js`: `getFirstChapter()` helper 신규 + module.exports 등록
    - 회귀 검증: `aTest_v1` (agenda_enabled 미설정 → 기존 동작 그대로) + `GenContentProd_v1.1` (agenda_enabled=false → agenda.html 미생성 + cover `01-opening.html?fwd=1` 직행) 양쪽 빌드 통과 + lint-deployment 0 violations

## Issue241. BasicKnowledgeForAI_small_model 슬라이드 7건 PDF 정합 + data 정책 보강 (등록: 2026-05-26, 해결: 2026-05-26, commit: TBD) ✅
* 목적: `BasicKnowledgeForAI_small_model` 모델 7개 슬라이드(#/7, #/8, #/10, #/12, #/13, #/14, #/15)의 PDF 원본 대비 누락·md 렌더링 오류 수정 + 학습 패턴을 `data/ppt2m2slide/heuristics.yml`·`data/media-creater/tools.yml`에 영구 보강
* 결과:
    - 슬라이드 수정 7건 — pipe-table source PDF crop, 화살표 합성 이미지 추출, 외부 URL 로컬화, inline 링크 백틱 wrap, flex pair_comparison_layout 적용
    - 신규 이미지 8개 추출 (`s07_ordered_left/right`, `s08_unordered_left`, `s12_python_arrow`, `s12_html_arrow`, `s13_pipe_source`, `s14_finfra_logo`, `s15_pipe_source`) — PDF p8/9/13/14/15/16에서 `pdftoppm -r 200` + `magick -crop` 사용
    - `data/ppt2m2slide/heuristics.yml` +98 lines: `composite_shape_images`(텍스트+화살표+이미지 합성 shape → PDF crop 전략), `external_url_image`(http URL → 로컬 crop), `image_source_decision`(pptx native picture > PDF crop > web fetch 우선순위)
    - `data/media-creater/tools.yml` +25 lines: `pair_comparison_layout`(flex container, 동일 height, gap 30px — `::: columns` 비율 강제 빈 공간 회피)
    - 검증: dev-server `/p/BasicKnowledgeForAI_small_model/s/1/{7,8,10,12,13,14,15}` Playwright capture 통과, PDF p8/9/11/13/14/15/16 시각 일치
* 학습 인사이트:
    - pptx 임베디드 이미지(`ppt/media/imageN.png`)는 PICTURE shape 만 커버. 텍스트박스·화살표·라인 shape 은 미커버 → PDF render + crop 이 유일한 보존 경로
    - `::: columns` width 강제는 이미지 폭과 column 폭 불일치 시 빈 공간 발생. 동일 height flex container 가 시각 균형 + 화살표 연결에 우월
    - PPT pipe-table syntax 텍스트박스는 코드블록 wrap 필수 (m2slide markdown 파서가 HTML `<table>` 자동 렌더 회피)
    - 외부 URL 이미지는 `.claude/rules/file-deployment-rules.md` 위반 — PDF crop fallback 권장
* 목적: `Projects/_ppt/BasicKnowledgeForAI_small.pptx`를 ppt2m2slide로 변환하여 `Projects/BasicKnowledgeForAI_small_model`과 일치 여부 확인 + 차이 발견 시 data 정책 yml 보강 (최대 10턴 반복)
* 결과:
    - **Turn 1에서 0 diff 수렴** — 추가 반복 불필요
    - 비교 결과 (turn 1):
        - `AGENDA.md`: byte-equal (12 lines)
        - `01-markdown.md`: byte-equal (269 lines, H1 16개)
        - `02-linux.md`: byte-equal (90 lines, H1 4개)
        - `_config.yml` / `Info.md`: byte-equal
        - `markdown/img/`: 동일 16장 (파일명 일치)
    - 빌드 검증: `./m2slide.sh BasicKnowledgeForAI_small` 성공 (21 slides total = 16 + 5, chapter mode, palette office_rainbow exact, slide_ratio 3:2)
    - mode 판정·layout 분류·htmlart/chart/palette 매핑·이미지 추출 모두 모델과 일치
* 구현 명세:
    - 변경된 data yml: **0건** (정책이 이미 잘 튜닝되어 있음 — Issue228 후속 원본 보존 + Issue227 cover 회피 정책 정상 작동)
    - 보고서: `data/_proposals/BasicKnowledgeForAI_small-2026-05-26.md` (기존 파일 갱신, 신규 후보 0건)
    - PDF 23 페이지 → m2slide 21 슬라이드 (slide 1 cover_root + slide 23 빈 슬라이드 skip은 정책 의도)

## Issue238. palette --m2-accent-1이 --kn-accent를 오염시켜 theme 구조색 변경 (등록: 2026-05-26, 해결: 2026-05-26, commit: cefe39e) ✅
* 목적: palette 교체 시 agenda markmap 테두리·title 밑줄 등 theme 구조색이 의도치 않게 바뀌는 문제 수정
* 상세:
    - `theme/default/slide.css`: `--kn-accent: var(--m2-accent-1, #F5C518)` — palette 첫 accent에 alias
    - `office_rainbow` palette: `--m2-accent-1: #0365C0` (파랑) → `--kn-accent`가 파랑이 되어 markmap border·card title bg 등도 파랑으로 바뀜
    - palette는 htmlArt·component 시각화용 의도였으나 theme 구조색까지 오염
    - 발견 위치: `BasicKnowledgeForAI_small` agenda 페이지 markmap 테두리 파란색으로 표시
* 구현 명세:
    - `--kn-accent: #F5C518` 고정 (alias 제거) — `default` / `default_lec` 양쪽 theme 동시 수정
    - `--m2-card-title-bg: var(--m2-accent-1, #F5C518)` — 카드 제목 밴드는 palette에 반응하도록 직접 참조
    - 회귀 테스트: `m2SlideStyle1_single`, `m2SlideStyle2_chapter` 모두 `--kn-accent: #F5C518` 확인

## Issue239. dev-server /p/P/s/ — chapter mode에서 agenda로 리다이렉트되어 #hash 소실 (등록: 2026-05-26, 해결: 2026-05-26, commit: 12baaa6, f1400ca, fbabfc2) ✅
* 목적: `/p/<P>/s/#/2` 접근 시 첫 챕터 슬라이드가 표시되지 않고 agenda로 리다이렉트되는 버그 수정. `/p/P/s/` → 404, 명명 라우트(`/s/cover`, `/s/<n>/toc`) 추가
* 상세:
    - chapter mode `index.html`은 `<meta http-equiv="refresh">` agenda 리다이렉트 페이지 → `#/2` 해시 소실
    - 최종 설계: `/p/P/s/` 그대로 두면 `s.html` 미존재 → 404 (hash 전달 불가이므로 나머지는 명명 라우트로)
    - `/p/P/s/cover` → `index.html` 프록시 (cover deck)
    - `/p/P/s/<n>/toc` → 챕터 N HTML 첫 슬라이드(`slide_n=1`) 프록시 (TOC/markmap)
    - `_serve_cover_entry`, `_serve_chapter_toc` 핸들러 메서드 추가

## Issue237. explicit #layout-* H1 슬라이드 End/Home 키 sibling 점프 불가 — headingLevel 누락 (등록: 2026-05-26, 해결: 2026-05-26, commit: f330c5b) ✅
* 목적: m2SlideStyle1_single `index.html#/2`(H1 + `#layout-_cover` 명시 슬라이드)에서 End 키 눌러도 다음 H1 anchor로 이동하지 않음. slide-parser.js 앵커 감지 패스에서 explicit layout 지정 슬라이드가 early return되어 headingLevel 미설정 → data-heading-level 미주입 → isAnchorSlide() false → findNextSiblingAnchorIndex() -1 → End key noop.
* 상세:
    - 재현: `./m2slide.sh m2SlideStyle1_single` 후 `index.html?fwd=1#/2`에서 End 키 → 아무 반응 없음 (의도: 다음 H1 섹션 첫 슬라이드로 점프)
    - 원인: `lib/slide-parser.js` forEach에서 `if (s.layout) return;` early exit이 explicit #layout-* H1 슬라이드의 headingLevel 설정을 차단
    - 추가: `lib/html-builder.js` isCoverSlide() chapter mode 조건 누락 (Issue230 후속) 동시 수정
* 구현 명세:
    - slide-parser.js: `if (s.layout && level === 1 && !s.headingLevel)` 분기 추가 → headingLevel=1 보존 후 return
    - html-builder.js: `if (M2SLIDE_MODE !== 'single') return false;` 추가 (chapter mode cover는 leaf 처리)
* 카테고리: Generator (slide-parser) + Frontend (End/Home navigation)

## Issue230. Single mode 중간 H1 슬라이드가 cover로 분류되어 →/↓/End 시 agenda.html 점프 — isCoverSlide() deck 위치 한정 누락 (등록: 2026-05-25, 컨텐츠 잘못 만들어진 것이 문제 였음. 기능에 문제 없음.)
* 목적: m2SlideStyle1_single 등 single mode 프로젝트에서 `index.html#/2`(`# 2. 코드 ...` H1 챕터 divider)에서 → 키 누르면 `agenda.html?fwd=1`로 점프. layout-selector가 모든 본문 H1에 `#layout-_cover` 자동 부착 → `isCoverSlide()`가 deck 진입점이 아닌 중간 슬라이드까지 cover로 판정 → cover navigation 룰(↓·→·End → agenda) 발동. cover는 의미상 deck 진입점(#/0)만이어야 함.
* 상세:
    - 재현: `./m2slide.sh m2SlideStyle1_single` 후 `index.html?fwd=1#/2`에서 → 키 → `agenda.html?fwd=1` (의도: #/3 다음 슬라이드)
    - 원인: `lib/html-builder.js:1609` `isCoverSlide()`가 layout class만 검사. layout-selector가 H1 슬라이드를 `_cover`로 일괄 분류 시 모든 H1이 cover로 인식
    - 영향: single mode + chapter mode 양쪽. layout-selector .ppt.md 사용 프로젝트 전부
* 구현 명세:
    - `isCoverSlide()`에 deck 진입점 조건 추가: `Reveal.getHorizontalSlides()[0] === slide`
    - 시각적 _cover layout은 유지(스타일은 그대로), navigation 의미만 leaf로 격하
* 카테고리: Frontend (navigation) + Generator (cover 의미 정합성)
* 
## Issue236. dev-server /_dev/raw + /_dev/list endpoint — curl-friendly section view (등록: 2026-05-25, 해결: 2026-05-25, commit: 58de985) ✅
* 목적: reveal.js JS 클라이언트 렌더 우회. curl + grep으로 특정 슬라이드 컨텐츠 즉시 확인 가능하게 함. AppleScript Chrome·Playwright 없이 빠른 디자인 파악.
* 상세:
    - curl로 `index.html?fwd=1#/N` fetch 시 모든 section 포함된 raw HTML 반환 — 특정 N번째 활성 슬라이드 추출 불가 (reveal.js JS가 클라이언트에서 처리)
    - 사용자: "지금 작업이 특정 페이지 내용 확인하는 것이 목적" — curl 빠른 디자인 파악 필요
* 구현 명세:
    - `lib/dev-server/server.py`에 `DevHandler` 확장 (기존 QuietHandler 대체)
    - `/_dev/raw?file=PATH&n=N` — N번째 top-level `<section>` plain HTML 래핑 응답 (theme CSS link carry-over로 디자인 fidelity)
    - `/_dev/list?file=PATH[&format=json]` — 모든 section 인덱스 (title + bytes + raw URL). HTML 기본, JSON 옵션
    - `/_dev/` — 사용법 help
    - 보안: 경로 traversal 차단 (403), `.html` 만 허용 (400), localhost bind
    - `find_top_section_spans()` — `.reveal .slides` 안 depth-1 section 만 추출 (nested vertical slide는 부모 포함)
    - 빌드 산출물 무변경 — dev-server 메모리 동적 응답 (file:// 배포 rule 영향 0)
    - `_doc_arch/dev-server.md` 갱신 — 3채널 분기 표 (file:// SSOT / http live / http raw) + raw endpoint 섹션 신설
    - `.claude/rules/file-deployment-rules.md` 예외 절에 `/_dev/` endpoint 명시
* 검증:
    - python ast 통과
    - `curl /_dev/list?...format=json` → 36 sections, title·bytes 정확
    - `curl /_dev/raw?file=...&n=10` → "플로우차트 (Flowchart)" + mermaid 코드 정확 응답
    - 경로 traversal `../../../etc/passwd` → 403, 존재 안 함 → 404, 범위 초과 → 404
    - latin-1 호환성 버그 fix (em dash `—` → `:`) — HTTP reason phrase ASCII 강제
* 카테고리: Build (dev-server) + DX

## Issue235. 슬라이드 dev-server + 파일 단위 배포 rule (등록: 2026-05-25, 해결: 2026-05-25, commit: 6a65b1d) ✅
* 목적: `file://` 단독 동작(배포 호환)을 SSOT로 유지하면서 개발 중 HTTP server 자동 시동으로 Playwright·curl 헤드리스 검증 채널 확보. 빌드 산출물의 파일 단위 배포 가능성을 rule로 명시·검증.
* plan: `_doc_work/plan/slide-dev-server_plan.md`
* 상세:
    - 기존 AppleScript Chrome 제어는 시각 확인만 가능, 헤드리스 검증 불가 (curl/Playwright 채널 부재)
    - Playwright MCP는 `file://` 차단 → HTTP server 별도 시동 필요
    - 배포 시 사용자는 단일 `.html` 파일 + `img/` 만으로 동작해야 함 (server-only 의존 금지)
* 구현 명세:
    - `lib/dev-server/server.py` 신규 — Python stdlib `http.server` (port 9877, 127.0.0.1 bind, document root = repo root)
    - `lib/dev-server/lifecycle.sh` — idempotent start/stop/status/restart (pid `_doc_work/.dev-server.pid`, log `.dev-server.log`)
    - `m2slide.sh --serve {start|stop|status|restart}` subcommand
    - `m2slide.sh` 빌드 시 dev-server 자동 시동 (`--no-serve` opt-out, `_config.yml dev_server: false` opt-out)
    - `m2slide.sh --lint-deployment [project]` — `localhost`, `127.0.0.1`, `0.0.0.0`, `/Users/`, `/home/`, `file:///Users/` regex grep
    - `_doc_arch/dev-server.md` 영속 설계 SSOT — 두 채널 분기 (file:// SSOT / HTTP 보조)
    - `.claude/rules/file-deployment-rules.md` 신규 — 파일 단위 배포 보장 rule + 허용·금지 패턴 표
    - `.claude/rules/apply-verify-rules.md` §4 검증 채널 이중화 + §4.5 파일 단위 배포 검증 신설
    - `.claude/skills/open-slide/SKILL.md` `--verify` 플래그 (HTTP+Playwright navigate+screenshot+console)
* 검증: bash -n + python ast 통과, lifecycle 4종 동작, curl HTTP 200, lint 위반 0건, 자동 시동 + URL 안내, `--no-serve` opt-out 동작
* 카테고리: Build + Asset + Project

## Issue234. ppt2m2slide 학습 round 3 — PPT 색 강조 → **bold** + 출처 텍스트박스 → ::: source 슬롯 (등록: 2026-05-25, 해결: 2026-05-25, commit: 0d1f8c0) ✅
* 목적: Issue233 후속 사용자 피드백 2건 반영 — ① PPT 빨강 강조 텍스트(`매우 간단한 구조의 문법`, `직관적으로 인식` 등) 손실 → `**bold**` 변환 + theme 강조 스타일 ② PPT 출처 텍스트박스(`[공통] ... https://...`) m2slide slot 없음 → `::: source` 슬롯 (default theme 하단 absolute)
* 상세:
    - 입력: BasicKnowledgeForAI_small.pptx slide 3 (Markdown이란?) — PPT XML `<a:schemeClr val="accent5">` 5개 run + TEXT_BOX 1개 (URL 포함)
    - python-pptx `font.color.rgb` API는 schemeClr/inherited color에 대해 AttributeError raise → lxml XML walk로 직접 추출 필요
    - PPT가 단어 중간에서 run 분할하는 케이스 ("매" plain + "우 간단한 구조의 문법" colored) → 인접 same-color run 자동 병합
    - `extractSlots` PANDOC_LAYOUT_RESERVED 미등재 시 ::: source 가 빈 슬롯으로 추출되어 본문에서 사라지는 시스템 버그 발견 → 'source' 추가로 fix
* 구현 명세:
    - 1) `lib/ppt-emphasis-extract.py` 신규 — python-pptx + lxml XML walk로 컬러 run + 출처 텍스트박스 추출 → md 후처리 (`<a:srgbClr>` / `<a:schemeClr val="accentN">` 양쪽 지원, 인접 same-color run 병합, 코드블록·이미 감싼 곳 skip)
    - 2) `lib/markdown.js LAYOUT_CLASS_ALIASES`에 `source: 'm2-source source'` 추가
    - 3) `lib/slide-parser.js PANDOC_LAYOUT_RESERVED`에 `'source'` 추가 (시스템 버그 fix)
    - 4) `theme/default/slide.css` + `theme/default_lec/slide.css`에 `.m2-source` (position absolute bottom-right, font-size 0.55em, italic, opacity 0.55) + `.contents-body strong { color: var(--m2-accent-5); font-weight: 700 }` 추가
    - 5) `.claude/agents/ppt2m2slide.md` Step 3.5 신설 (markdown 후처리)
    - 6) `data/ppt2m2slide/heuristics.yml preservation.text_emphasis.enabled: true` + `source_textbox` 섹션 신설
* 검증:
    - BasicKnowledgeForAI_small.pptx slide 3 재변환 → "간단한 구조의 문법", "직관적으로 인식", "md" 모두 빨강 **bold** 표시 ✅
    - "출처: 마크다운 작성법 (ihoneymon)" 우하단 작은 글씨 표시 ✅
    - v1·v2 양쪽 적용 + rebuild 통과
* 카테고리: Generator (ppt2m2slide post-process script) + Theme (default slide.css) + Frontend (slide-parser 시스템 버그 fix)

## Issue233. ppt2m2slide data 폴더 학습 — BasicKnowledgeForAI_small.pptx 슬라이드별 분석 + office_rainbow palette + PPT 보존 정책 보강 (등록: 2026-05-25, 해결: 2026-05-25, commit: 41b5e5a) ✅
* 목적: `/Users/nowage/Desktop/BasicKnowledgeForAI_small.pptx` (23슬라이드)를 슬라이드별 PNG 캡처 후 m2slide 빌드 산출물과 1:1 비교하여 ppt2m2slide 단발 실행만으로 원본과 ≥80% 시각 유사 산출물이 나오도록 data 카탈로그 학습. 단발 PPT 변환 정확도 향상이 산출물.
* plan: `_doc_work/plan/ppt2m2slide_data_training_plan.md`
* 상세:
    - 입력: BasicKnowledgeForAI_small.pptx (23장 — 부록1 Markdown 17장 + 부록2 Linux 5장 + 빈 슬라이드 1장)
    - 기준선 캡처: PowerPoint sandbox 제약 → libreoffice headless → PDF → macOS Quartz PyObjC 렌더로 PNG 23장 생성
    - m2slide 캡처: puppeteer headless (1920x1080) — hashOneBasedIndex:true 대응 `#/N` 1-base 인덱싱
    - 시각 diff 22/22 (PPT 23 - 빈 1) — 콘텐츠 매칭 100% / 시각 매칭 ≈ 80%
* 구현 명세:
    - 1차: `office_rainbow` 팔레트 추가 (`data/palettes/catalog.yml` + `theme/default/palettes/office_rainbow.css` + `theme/default_lec/palettes/office_rainbow.css`) — PPT Office 2016+ 기본 무지개 6색 (`#0365C0`·`#00882B`·`#DCBD23`·`#DE6A10`·`#C82506`·`#773F9B`)
    - 2차: `data/ppt2m2slide/heuristics.yml` 보강 — `preservation.text_emphasis` (PPT 색상 → markdown span) + `preservation.callouts_over_image` (이미지 위 텍스트박스 v2 정책) + `slide_type_layout` (chapter/cover_root/section_break 슬라이드 타입별 layout)
    - 3차: `data/ppt2m2slide/mappings.yml` 보강 — `known_theme_color_mapping` (PPT theme 6 hex tuple → palette 직접 매핑, ΔE 우회 캐시)
    - 4차: `data/md-builder/styles.yml` — `ppt_source_handling.bypass_style_rules: true` + `ppt_text_emphasis_handling` (PPT 원본 어조 보존)
    - 5차: `data/media-creater/tools.yml` — `ppt_extracted_media` 섹션 (image_extraction · image_overlay_callouts · background_shapes)
    - 검증: ppt2m2slide agent 단발 재실행 → `Projects/BasicKnowledgeForAI_small_v2/` 자동 생성 + palette `office_rainbow` 자동 매칭 (사용자 정정 불필요) ✅
    - 보고서: `data/_proposals/BasicKnowledgeForAI_small-2026-05-25.md` 슬라이드별 diff 표 + 향후 코드 작업 필요 항목 4개
    - 향후 별도 이슈 후보: ① cover_root prepend 구현 (heuristics spec 있으나 agent 코드 미구현) ② PPT 텍스트 색상 보존 (python-pptx run.font.color → markdown span 변환) ③ 이미지 callout overlay 합성 캡처 ④ 코드 블록 syntax highlight palette 연동
* 카테고리: Generator (ppt2m2slide) + Asset (palette·heuristics·mappings)

## Issue232. H1 슬라이드 contents-header 누락 + 백틱 인라인 코드 link 침범 + H1/H2 puffer 비대칭 (등록: 2026-05-25, 해결: 2026-05-25, commit: 8215612) ✅
* 목적: `BasicKnowledgeForAI_small/01-markdown.html` `#/11`(`# Markdown 문법 - 링크` H1만 있는 슬라이드)의 contents-header가 통째 사라지고 빈 가로 띠로 보이던 회귀 차단. 동시에 본문 백틱 인라인 코드 `` `[name](URL)` ``이 `<code>&lt;a href="URL"&gt;name&lt;/a&gt;</code>`로 변환되던 markdown 파서 inline 처리 순서 버그 차단 + H1 슬라이드와 H2 슬라이드의 puffer 마스코트 시각 비대칭 차단.
* 상세:
    - 회귀 ①: `slide-parser`의 `if (layout) { title 추출 }` 가드가 layout 미명시 슬라이드(H1만 있고 `theme_default_layout: contents` fallback 경로)를 skip → `slideTitle=''` 유지 → html-builder Issue90 로직이 빈 `contents-header` 통째 제거
    - 회귀 ②: `lib/markdown.js processInline()`이 link 정규식을 inline-code 정규식보다 먼저 실행 → 백틱 안의 `[name](URL)` 패턴이 `<a>` 태그로 치환 → 뒤이은 inline-code 변환이 `<a>` HTML을 escape 해 `<code>` 안에 밀어넣음
    - 회귀 ③: H1 → `<h1 class="outline-title">` 생성. Issue90 hoist 정규식이 `h[2-6]` + `class="title"`만 매칭 → H1 hoist 누락 → theme/default puffer CSS `.layout-_contents > .title` 미매치 → 마스코트 누락
    - 1차 fix(parser fallback) 부작용: title은 표시되나 template `<h1 class="contents-title">` 경로로 흘러 m2Slide H2 hoist 경로와 다른 DOM 구조 생성 → puffer 여전히 미표시
* 구현 명세:
    - 1차 parser fallback fix revert (slide-parser.js 원복)
    - `lib/html-builder.js` Issue90 hoist 정규식 확장: `h[2-6]` → `h[1-6]` + class 매칭에 `outline-title` 포함 + hoist 시 `outline-title` → `title` 정규화 (puffer CSS selector 매치)
    - `lib/markdown.js processInline()` 인라인 코드 stash/restore 패턴 도입: `\x01CODE${idx}\x01` sentinel 로 코드 격리 후 link·bold 변환, 마지막에 placeholder 복원
    - 사례 기록: `_doc_work/debug_TECH.md` § Issue232 추가 (3중 회귀 진단·1차 fix 부작용·최종 fix·함정 3종)
* 카테고리: Generator (slide-parser·markdown 파서·html-builder hoist) + Frontend (CSS selector 일관성)


## Issue231. graphify CLI 미활용 회귀 — slide 코드 추적 시 grep 우선 + 자동 트리거 부재 (등록: 2026-05-25, 해결: 2026-05-25, commit: b80e4c5) ✅
* 목적: m2slide 코드/아키텍처 질문 처리 시 `.claude/rules/graphify-rules.md`의 "CLI 우선" 룰을 무시하고 `grep`+`Read`로 진행한 회귀 차단. 직전 세션(`#/11` head-bar 누락 원인 추적)에서 `slide-parser.js`·`html-builder.js`·`head-resolver.js` 다중 파일 추적에 grep만 사용 → graphify의 EXTRACTED/INFERRED edge traversal 이점 미활용 → 토큰·시간 낭비. `graphify-out/GRAPH_REPORT.brief.md` 존재 + `graphify` CLI 정상 동작 + `~/.local/bin/graphify` 설치 상태였음에도 우회.
* 상세:
    - 현 룰의 한계: "CLI 우선" 원칙만 적시되어 있고 **자동 발동 트리거(어떤 사용자 요청 패턴에서 graphify를 써야 하는가)** 미명시. 룰 위반 감지 메커니즘 없음
    - memory 누락: `feedback_graphify_first` 없음 → 세션 간 회귀 차단 메커니즘 부재
    - 회귀 사례: 2026-05-25 head-bar 누락 분석 시 `grep -rn "head_left"`, `grep -n "outline-title"` 다수 호출. `graphify query "contents-header head-bar title hoisting"`로 단발 해결 가능했음
* 구현 명세:
    - `.claude/rules/graphify-rules.md`에 "자동 발동 트리거" 섹션 추가 — 사용자 표현 트리거(왜/어디서/추적/원인/관계/호출/흐름) + 사용 패턴 트리거(grep 3회 이상 → graphify 전환) + 명령어 매핑 표
    - "위반 시 대응" 섹션 추가 — grep 4회 이상 누적 + 다중 파일 추적 시 self-trigger
    - memory 저장: `feedback_graphify_first.md` + MEMORY.md 인덱스 갱신
    - learning_log.md 한 줄 append
* 카테고리: SCAR 룰 + 도구 사용 정책

## Issue229. default 테마에 sub-chapter(`_chapter`) layout 추가 — chapter divider page (등록: 2026-05-24, 해결: 2026-05-24, commit: 6ed4ca8) ✅
* 목적: chapter divider 슬라이드(메인 챕터 제목 + 하위 sub-section 목록 표시)는 default_lec에 `4.2.chapter.html` + `.layout-chapter` CSS 있으나 default 테마에는 부재. `theme: default` 프로젝트가 chapter divider 슬라이드 생성 불가. default에도 동일 layout 추가 (디자인은 default 미니멀 톤 — typography·divider 위주, 배경 이미지 없음)
* 상세:
    - default_lec `_chapter` 슬롯 구조(header + chapter-title + divider + content) 차용
    - default 색 변수(`--m2-accent-1`) + 단순 divider line + 큰 제목
    - underscore form `_chapter.html` 작성 시 `chapter`·`_chapter` 양쪽 메타 자동 alias 등록(generate-slides.js)
* 구현 (6ed4ca8):
    - 신규: `theme/default/layouts/_chapter.html` — chapter-header(title) + chapter-body(content) 슬롯. 빈 self-closing div(`<div class="chapter-divider"></div>`)는 빌더가 제거하므로 CSS `::after` pseudo-element로 divider line 그리기
    - 수정: `theme/default/slide.css` — 파일 끝에 `.layout-chapter`·`.layout-_chapter` 블록 추가. flex 중앙정렬 + chapter-title(2.6em bold) + chapter-header::after(60% width 4px accent line) + chapter-body(72% max-width, accent border 박스). `--m2-accent-1` 변수 상속
    - 정리: 기존 깨진 chapter CSS(line 441-458, `../theme-img/finfraPuffer2.png` 폴더 부재) 제거
    - default_lec은 기존 `4.2.chapter.html` + `.layout-chapter` CSS 유지 (회귀 0)
* 검증 (6ed4ca8):
    - 빌드: `./m2slide.sh m2SlideStyle1_single` 성공 (36 section)
    - HTML 직접 확인: `slide/index.html:1511` `<section data-slide-hash="#/3" class="layout-chapter">` 정상 + chapter-header/chapter-title/chapter-body 슬롯 모두 매핑
    - Chrome AppleScript 진입 (`file:///.../slide/index.html?fwd=1#/3`) 시각 확인
    - default_lec 회귀: layouts/4.2.chapter.html + slide.css `.layout-chapter` 6건 grep 일치
* 카테고리: Theme


## Issue223. `open-slide` 스킬 신규 — 임의 슬라이드 자동 진입 + Chrome 포커스 강제 (등록: 2026-05-24, 해결: 2026-05-24, commit: b72c7dc) ✅
* 목적: 코드/콘텐츠 수정 후 특정 슬라이드(예: 08.4 #/6) 직접 검증할 때 매번 `file:///.../slide/<chapter>.html?fwd=1#/N` URL을 수작업 조립 + macOS `open` 동일 URL 재호출 시 새 탭만 추가되고 foreground 안 옴. 슬래시 커맨드 대신 **스킬**로 만들어 description 매칭 자동 트리거 → claude가 "슬라이드 X 열어줘", "검증해줘" 등 발화 시 자동 호출.
* 구현:
    - 신규: `.claude/skills/open-slide/SKILL.md` (프로젝트 로컬 SCAR, `git add -f`로 추적 — `.gitignore`의 `.claude` 무시 우회)
        - frontmatter title `open-slide`, description에 트리거 keyword(`슬라이드 N번`, `X.Y #N`, `검증해줘`, `open slide`) 명시
        - 입력 형식: `{project} {chapter_prefix} {N} [--firefox] [--build]`
        - chapter prefix glob 매칭: 1개 매칭만 통과, 0/다중 시 에러 + 매칭 목록 안내
        - URL 조립: `?fwd=1#/N` (쿼리 hash 앞 — apply-verify-rules §4.1)
        - 실행: Chrome AppleScript heredoc (`tell application "Google Chrome" → make new tab + activate`) — shell `open -a` ban 회피 (apply-verify-rules §4)
        - 옵션: `--firefox` (Firefox AppleScript), `--build` (open 전 `./m2slide.sh <project>`)
    - 책임 분리: `/run` 빌드+cover, `open-slide` 스킬 임의 진입
* 검증 (b72c7dc):
    - 정상 매칭: `aTest_v1 08.4` → `08.4.ratio-compare-explain.html` 단일 매칭
    - 다중 매칭: `aTest_v1 08` → 6개 검출 (08-htmlart, 08.1~08.5)
    - 미매칭: `aTest_v1 99` → 에러
    - AppleScript heredoc 실제 Chrome 포커스 + 새 탭 진입 확인 (`aTest_v1 08.4 6`)
* 카테고리: DX (개발자 도구) + Build (스킬 wrapper)
* 관련: `/run` 커맨드, `apply-verify-rules.md` §4.1


## Issue214. ppt2m2slide 에이전트 설계 — 기존 PPT를 m2slide 프로젝트로 역변환 (등록: 2026-05-24, 해결: 2026-05-24, commit: b897367) ✅
* 목적: m2slide가 미완성이라 그동안 m2slide → PPT export → PPT 수정 → 발표 워크플로우로 작업했음. PPT 수정분이 m2slide로 환류되지 않아 매번 같은 PPT 작업을 반복. 기존 PPT(.pptx)를 m2slide 프로젝트(`Projects/<Name>/`)로 역변환하는 agent를 신설하여 PPT 자산을 m2slide 카탈로그로 흡수.
* depends: Issue217 ✅
* plan: `_doc_work/plan/ppt2m2slide_plan.md`
* task: `_doc_work/tasks/ppt2m2slide_task.md`
* 구현:
    - 신규: `.claude/agents/ppt2m2slide.md` (model:opus, color:magenta, tools:Read/Write/Edit/Bash/Glob) — info-filler/agenda-designer 데이터-주도 패턴 차용
    - 신규: `data/ppt2m2slide/heuristics.yml` (layout 판정·mode 임계값·palette 매칭·체크포인트 메시지) + `mappings.yml` (SmartArt→htmlart·chart→component·media·fallback)
    - 신규: `_doc_arch/ppt2m2slide.md` 영속 설계 SSOT (변환 파이프라인·체크포인트·라운드트립 검증)
    - 신규: `.claude/commands/ppt2m2slide.md` 슬래시 진입점 (`/ppt2m2slide <pptx> [name] [--mode] [--no-checkpoint]`)
    - 수정: `_doc_arch/authoring-pipeline.md`에 `## Reverse pipeline (ppt2m2slide)` 한 줄 추가
    - 책임 분리: pptx2md 글로벌 스킬 raw 추출만, m2slide 의미론 매핑은 본 agent 단독
    - 자동 머지 금지: `_proposals/` 산출물은 항상 사용자 승인 후 수동 머지
* 검증 (b897367 합본):
    - YAML 파싱 OK (heuristics.yml + mappings.yml)
    - BasicKnowledgeForAI 변환 round-trip — 239 슬라이드 → chapter mode 자동 + 13 챕터 + 17 sub-chapter, 빌드 rc=0, 32 HTML 모두 200 OK
    - 회귀: aTest·m2SlideStyle1_single·m2SlideStyle2_chapter 영향 0
    - 산출물 5개 모두 .gitignore 대상 (.claude/_doc_arch/_doc_work/data/* 의도적 제외) — Issue217 fix(b897367)와 합본 검증
* 카테고리: Generator + Project + Build


## Issue228. agenda.js·html-builder.js cross-page navigation `.ppt.md` 미정규화 — PREV_CHAPTER/NEXT_CHAPTER/subsections lookup 실패 (등록: 2026-05-24, 해결: 2026-05-24, commit: b897367) ✅
* 목적: layout-selector가 `.ppt.md` 파생본 생성 후 빌드 입력이 `.ppt.md`인 케이스에서 `agenda.js`의 `path.basename(fileName, '.md')`가 `.ppt`만 떼고 `02-linux-basic.ppt` 반환 → AGENDA.md 링크 (`./02-linux-basic.md` 기반 `02-linux-basic.html`)와 매칭 실패 → PREV_CHAPTER·NEXT_SIBLING 빈 값 → ← 키 cross-page navigation 시 이전 챕터로 못 가고 agenda fallback. Issue225와 같은 패턴.
* 상세:
    - 재현: `02-linux-basic.html#/toc-placeholder`에서 ← → `agenda.html?back=1` (정상 동작 = `01-markdown.html?back=1#/<last>`)
    - 원인1: `lib/agenda.js:235,210` `path.basename(fileName, '.md')` — `.ppt.md` → `.ppt` 잔존
    - 원인2: `lib/html-builder.js:258,592` `fileName = path.basename(filePath)` — `.ppt.md` raw 그대로 agenda.js 호출
    - 결과: `window.PREV_CHAPTER = ''` (빈 값) → keydown handler가 agenda로 fallback
    - 영향: layout-selector .ppt.md 사용하는 모든 chapter mode 프로젝트 cross-page navigation 전반 (←/→ 챕터간 이동, subsections lookup, sibling 점프)
* 구현 명세:
    - 수정: `lib/agenda.js` 상단에 `_baseFromInput(fileName)` helper 추가 — `.ppt.md`/`.md` 둘 다 base 이름 추출
    - 수정: `lib/agenda.js:210,244` `_getSiblingChapter`·`_getAdjacentChapter`의 `currentHtml` 생성 시 `_baseFromInput(fileName) + '.html'` 사용
    - 수정: `lib/html-builder.js:258,592` `fileName` 정규화 — `.ppt.md` → `.md` 치환 후 agenda.js 함수에 전달 (downstream getSubsections/getParentPage regex도 일관 동작)
    - 검증: playwright로 ← 키 cross-page 이동 확인 (`02-linux-basic.html#/toc-placeholder` → `01-markdown.html?back=1`)
    - 회귀 검증: 다른 정상 프로젝트(aTest 등) 빌드 결과 cross-page 동작 영향 없는지 확인
* 카테고리: Generator + Build


## Issue227. ppt2m2slide·layout-selector 산출물 슬라이드 구분자 `---` 누락 — 챕터 내 모든 H1이 1슬라이드로 병합 (등록: 2026-05-24, 해결: 2026-05-24, commit: b897367) ✅
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


## Issue225. .ppt.md 빌드 결과 파일명 미일치 — agenda.html cross-page 링크 404 (등록: 2026-05-24, 해결: 2026-05-24, commit: b897367) ✅
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


## Issue217. ppt2m2slide chapter 검출 H1-only 한계 + agenda 확정 전 사용자 컨펌 의무화 (등록: 2026-05-24, 해결: 2026-05-24, commit: b897367) ✅
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

## Issue219. htmlArt `callout` 타입 추가 — 중앙 hub + 다방향 callout arrow (등록: 2026-05-24, 해결: 2026-05-24, commit: 596d564) ✅
* 목적: 사용자 제공 이미지 2장(중앙 hub + 방사 callout arrow + 라벨) 기반 신규 htmlArt 타입. 강의·소개 슬라이드에서 핵심 주제(중앙) + 부연·태그 그룹(방사 라벨)을 박스 없이 fan-out 으로 표현하는 패턴 — 기존 `explain`·`radial`·`annotate`로 표현 불가하던 짧은 화살표 + 다방위 자유 분산 + 라벨 색 분리 패턴 충족.
* 구현:
    - `lib/markdown.js`: `HTMLART_TYPES` Set에 `callout` 추가 + orientation attr(`.h`/`.v`/`.fan`) → `data-orientation` 전파
    - `data/htmlart/types.yml`: tier v7 신규. signal_ko/en, decision_table 등재
    - `lib/component-hooks/htmlart_dispatch.client.js`: `renderCallout(el)` (선행 1430cc0 분리). 아이콘 토큰 `:fa-*:` 파싱, `**bold**` accent-1/일반 accent-2, 태그 sep(`|`/` / `) 처리, orientation별 분산 좌표
    - `lib/__tests__/markdown.test.js`: callout 케이스 4종 추가 (25종 갱신)
* 검증: `node --test lib/__tests__/markdown.test.js` → 55 pass / 0 fail
* 카테고리: Frontend + Generator
* 후속: ppt2m2slide(Issue214) SmartArt 매핑 카탈로그가 본 타입을 자동 활용

## Issue218. htmlArt `bend_process` 타입 추가 — N단계 줄바꿈 serpentine 흐름 (등록: 2026-05-24, 해결: 2026-05-24, commit: 596d564) ✅
* 목적: PowerPoint SmartArt "Bending Process"(휘어지는 프로세스) 대응. 단계 수가 많아 한 줄에 못 담길 때 행 끝에서 곡선으로 꺾어 역방향 이어지는 N단계 흐름. 기존 `process`·`step`·`workflow`로 표현 불가하던 multi-row serpentine 패턴 충족. ppt2m2slide(Issue214) SmartArt 매핑 후보로도 필수.
* 구현:
    - `data/htmlart/types.yml`: `bend_process` 항목 추가 (smartart_category: process, signal_ko/en, decision_table에서 `process`보다 우선순위 낮게 등재)
    - `data/htmlart/smartart-catalog.yml`: PowerPoint "Bending Process" → `bend_process` 매핑
    - `lib/markdown.js`: `HTMLART_TYPES` Set에 `bend_process` 추가
    - `lib/component-hooks/htmlart_dispatch.client.js`: `renderBendProcess` (선행 1430cc0 분리). 컨테이너 폭 기준 N_per_row 자동 계산, 행별 좌↔우 교대 배치, 곡선 연결
    - `lib/__tests__/markdown.test.js`: 타입 카운트 갱신
* 검증: `node --test lib/__tests__/markdown.test.js` → 55 pass / 0 fail
* 카테고리: Frontend + Generator (htmlart 카탈로그 확장)
* 후속: Issue214 ppt2m2slide의 SmartArt 매핑 카탈로그가 본 타입을 자동 활용

## Issue220. ESC overview thumbnail 1장만 표시 회귀 — `.reveal.overview .slides { overflow:hidden }` clip (등록: 2026-05-24, 해결: 2026-05-24, commit: dd6b009) ✅
* 목적: ESC overview에서 모든 슬라이드 thumbnail이 정상 grid + 본문 가시 표시되도록 회귀 해결. 사용자 화면에서 ESC 누르면 thumbnail 1장만 viewport에 보이고 나머지 sections 시각 paint 누락.
* 통합 회귀 흐름 종결 (3단계, 사용자 인식 "한 이슈"):
    1. Issue226 (8ae3e9c) — ESC 진입 차단 (cfg.keyboard에 27 미명시) → fix: `keyboard: {27: 'toggleOverview'}` 명시
    2. Issue215 (df96409 + e63c1b3) — spacing 100배 (width 문자열 concat) → fix: `width: 1920` (number) 전달
    3. **본 이슈 (dd6b009)** — `.reveal.overview .slides { overflow:hidden }` clip → 본 fix
* Root cause:
    - Issue215 1차 commit(df96409)이 base.css에 추가한 `.reveal.overview, .reveal.overview .slides { overflow: hidden !important; }` 룰 중 `.slides` 부분이 reveal.js Overview의 sections grid를 clip
    - reveal.js Overview는 sections를 `transform: translate3d(0,0,0)`, `(1990px,0,0)`, `(3980px,0,0)`...로 `.slides` box(width:1920) **밖** 좌표에 배치 후 `.slides` 자체에 scale + translate 적용해 viewport에 맵핑
    - 우리 `overflow:hidden`이 `.slides` box 밖 sections를 clip → 현재 슬라이드 1장(local x=0)만 시각 paint, 나머지 sections(local x=1990, 3980, ...) clip
    - playwright 1200x800 ESC press 후 23 sections × 234x156 좌표 정상이나 1장만 시각 표시 확인 → fix 적용 후 5 sections grid 분산 정상
* 변경:
    - `lib/css/base.css`: `.reveal.overview { overflow: hidden }` (viewport root clip 유지) + `.reveal.overview .slides { overflow: visible }` 분리. reveal.js 표준 동작 위임
* 검증 (playwright):
    - aTest/m2Slide 빌드 후 ESC → 5 sections grid 분산 (m2Slide 소개 / 1. m2Slide란? / 한 줄 요약 / 왜 m2Slide인가 / 2. 핵심 기능) viewport에 thumbnail 정상 표시
    - 일반 모드 슬라이드 transition outer padding 가시화(Issue109) 유지 (`.reveal.overview` 외 영역 무변경)
* 가드 준수: base.css 수정 가드 — display/height/position/transform 금지 속성 미변경 (overflow만 조정, overview 한정 셀렉터)
* 카테고리: Theme (CSS)
* 관련: Issue215 (width number fix), Issue226 (keyboard ESC config), Issue109 (overflow:visible outer padding)

## Issue226. ESC 키 reveal.js overview 진입 실패 — keyboard config에 27:'toggleOverview' 명시 (등록: 2026-05-24, 해결: 2026-05-24, commit: 8ae3e9c) ✅
* 목적: ESC 키를 눌렀을 때 reveal.js 표준 overview 모드 진입이 안 되고 forward navigation(`#/N` → `#/N+1`)으로 처리되는 회귀 해결. 사용자 chrome screenshot에서 슬라이드 1장만 viewport 채우고 다른 sections opacity 0 적층 확인.
* Root cause:
    - cfg.keyboard에 `{33,34,35,36 → null}` (PageUp/PageDown/End/Home 비활성)만 있고 ESC(27)는 reveal.js native default 기대였음
    - 그러나 m2slide custom keydown handler(`lib/html-builder.js` `document.addEventListener('keydown', ..., true)`)가 **capture phase**로 등록되어 reveal.js native handler에 도달 전 다른 navigation 분기로 처리됨
    - 진단 (playwright):
        - `Reveal.toggleOverview(true)` API 호출 → 정상 grid 분산 (32 sections × 340×227 thumbnail)
        - `page.keyboard.press('Escape')` native press → hasOverview=false + URL forward navigation only
* 변경:
    - `lib/html-builder.js:1130-1136` chapter Reveal.initialize keyboard 객체에 `27: 'toggleOverview'` 추가
    - `lib/html-builder.js:2274` cover Reveal.initialize keyboard 객체에 동일 명시
    - reveal.js 5.0.4 표준 keyboard config 형식 — m2slide custom handler capture phase와 무관하게 reveal.js가 toggleOverview 실행
* 검증:
    - 빌드 후 aTest 02-component.html line 2657 산출물 반영 확인 (`27: 'toggleOverview'`)
    - playwright 재검증 launch 충돌(사용자 chrome 실행 중) — 사용자 chrome reload 후 ESC 진입 시 `.reveal.overview` class 부착 + thumbnail grid 분산 예상
* 후속: Issue220 (ESC overview thumbnail visibility) 재검증 필요 — 본 fix 후 진입 정상이면 thumbnail content 가시성 별 회귀인지 재판정
* 카테고리: Generator (html-builder.js keyboard config)

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

## v0.7.0 (2026-05-06) — 58건 아카이브

### 본 릴리즈 신규 (Issue127-128)

## Issue127. `/deploy-docs` 신규 커맨드 + `_config.yml: deploy_formats` 옵션 — multi-project GitHub Pages 배포 + 산출물 형식 자동화 (등록: 2026-05-06, 해결: 2026-05-06, commit: 477da13) ✅
* 카테고리: Build / Generator
* 목적: 다수 프로젝트를 `docs/` 하위에 카드 형태로 배포·갱신·제거하는 워크플로우 도입. 기존 `lib/deploy.sh`(단일 프로젝트, 단순 복사)를 보완하는 Claude Code 슬래시 커맨드 + `_config.yml` 옵션 통합.
* Walkthrough:
    - **`.claude/commands/deploy-docs.md` 신규**: `/deploy-docs <project>` 자동 분기 (docs/<project>/ 존재 시 update, 없으면 new) + `/deploy-docs <project> delete` (사용자 승인 필수). 217 → 340줄로 확장.
    - **빌드 옵션 자동 감지**: `Projects/<name>/_config.yml`의 `deploy_formats: [epub, pdf, pptx]` 한 줄 추출 → `m2slide.sh --epub --pdf --pptx` 옵션 자동 전달. sed 정규식은 코멘트(`#` 이후) 제거 선행으로 코멘트 안의 예시 대괄호 충돌 방지.
    - **카드 메타데이터 자동화**: 빌드된 `slide/index.html`의 `<title>` 태그에서 카드 제목 추출 (fallback: project명). 산출물 존재 여부(`HAS_EPUB`/`HAS_PDF`/`HAS_PPTX`) 기반 `📚 EPUB` / `📄 PDF` / `📊 PPTX` 배지 동적 노출.
    - **`docs/index.html` 카드 갱신**: `<!-- PROJECT_ENTRIES_START -->` 마커 내부에서 `data-project` 속성으로 unique 매칭 — new 모드는 append, update 모드는 자리 교체(다른 카드 순서 보존). 동일 project 중복 카드 발생 금지.
    - **CSS 추가**: `docs/index.html`에 `.badge-epub`(amber) / `.badge-pdf`(red) / `.badge-pptx`(emerald) + `.badge + .badge` 마진. 카드 자체가 `<a>` 태그이므로 배지는 시각 표시용 `<span>` (실제 다운로드는 슬라이드 페이지의 다운로드 버튼 사용).
    - **검증 3종 + 추가 검증**: HTML 존재 / placeholder 누수 0 / 카드 등록 1건. 명시 형식 누락 시 의존성 설치 가이드 출력 + graceful degradation (빌드는 계속).
    - **소스 보존**: 어떤 모드에서도 `Projects/<project>/`는 수정·삭제 금지. 빌드 산출물 `slide/`만 사용.
    - **README.md 업데이트**: GitHub Pages 배포 섹션 3-방법 비교 (`/deploy-docs` / `lib/deploy.sh` / 수동) + `deploy_formats` 옵션 안내 + 핵심 기능 §4 다양한 출력 형식 추가.
* 검증: `m2SlideStyle1_single`에 `deploy_formats: [epub]` 추가 후 `/deploy-docs m2SlideStyle1_single` update 모드 동작 확인 — EPUB 1.2MB 생성 + 카드에 📚 EPUB 배지 + 검증 5종 통과.

## Issue128. agenda 페이지 다운로드 버튼 위치 — 헤더 우측 → `.layout-_agenda` 우하단 absolute (Issue80 후속) (등록: 2026-05-06, 해결: 2026-05-06, commit: 477da13) ✅
* 카테고리: Theme / Frontend
* 목적: Issue80 §2.2의 `margin-right: 16%` 회피 마진으로도 마스코트(우상단)와 다운로드 버튼(헤더 우측)의 시각적 충돌이 잔존. 위치 자체를 바꿔 충돌 영역을 분리.
* Walkthrough:
    - **`theme/default/layouts/_agenda.html`**: `.toc-page-downloads`를 `<header class="toc-page-header">` 안에서 빼내어 `.layout-_agenda` 마지막 자식으로 이동. positioned ancestor를 헤더가 아닌 `.layout-_agenda`(이미 `position: relative`)로 잡아 frame 전체 기준 absolute 가능.
    - **`theme/default/slide.css:511-518`**: `float: right; margin-top: 8px` → `position: absolute; bottom: calc(var(--frame-h, 100vh) * 0.03 + 5px); right: calc(var(--frame-w, 100vw) * 0.03); z-index: 5`. Issue113 frame 변수(--frame-h/--frame-w) 재사용으로 viewport letterbox 변화 무관.
    - **`theme/default/slide.css:798-799`**: Issue80 §2.2 `margin-right: 16%` 회피 마진 제거 (헤더 밖으로 분리되어 무용).
    - **`lib/html-builder.js:2113`**: fallback 코드(theme에 _agenda/_toc 모두 없을 때 사용)도 동일 구조로 변경.
    - **시각적 결과**: 4분할 — Agenda 제목(상단) / Markmap(중앙) / 다운로드(우하단) / 마스코트(우상단). z-index 5로 마스코트(z-index 0) 위에 표시되어 클릭 가능.
* 검증: `m2SlideStyle1_single`(EPUB 있음) + `m2SlideStyle2_chapter`(downloads 없음) 양쪽 빌드 — 후자는 `.toc-page-downloads` 자체 미생성 확인. agenda.html HTML 구조 변경 + viewport scale 무관 위치 검증.

### 본 릴리즈 누적 v0.6.x 시리즈 (Issue71-126, 56건)

## Issue126. `_config.yml background:` 글로벌 배경 옵션 — none/#hex/image/video 4종 자동 판정 (등록: 2026-05-05, 해결: 2026-05-05, commit: a75adbc) ✅
* 카테고리: Generator / Frontend
* design: [`_doc_arch/background.md`](_doc_arch/background.md) (5개 레이어 SSOT, #3 자리)
* 목적: 프로젝트 단위 배경을 `_config.yml`에 1줄로 지정. 값 패턴 자동 판정으로 색상·이미지·비디오 통합 처리.
* Walkthrough:
    - **`lib/config.js`**: `defaultConfig`에 `background: 'none'` / `backgroundType` / `backgroundFilename` 추가. `applyConfig`에 `background:` 파서 신설 — YAML 따옴표 처리(`"#FFFFFF"`) + hex의 `#` 보존(주석 분리 회피) + 4종 정규식 판정. 그 외 값은 warn 후 무시.
    - **`lib/html-builder.js`**:
        - `_globalBackgroundCss(cfg)` 헬퍼: type별 inline CSS — color는 `.reveal-viewport { background-color }`, image는 `.reveal-viewport { background: url(bg/{filename}) center/cover }`, video는 `video.m2-bg-video { position:fixed; object-fit:cover; z-index:-1 }`
        - `_globalBackgroundVideoTag(cfg)`: video 타입일 때 `<video class="m2-bg-video" autoplay muted loop playsinline src="bg/{filename}">` 문자열
        - generateHTML(deck) / generateCoverHTML(cover) / generateAgendaHTML(agenda) 3개 페이지 빌더에 inline CSS + body 직후 video 태그 일관 삽입
    - **`lib/generate-slides.js`**: image/video 타입 시 `cfg.background`를 `projectDir` 기준으로 resolve → `slide/bg/{filename}`로 복사. 파일 미존재 시 warn + `none`으로 fallback.
* 검증:
    - 4개 대표 프로젝트(`m2SlideStyle1_single`, `m2SlideStyle2_chapter`, `layoutTest`, `animationTest`) 빌드 회귀 없음. 미설정 시 inline CSS·video 태그 0건 출력(gating).
    - 4종 신규 테스트: m2SlideStyle1_single에 임시로 `background: "#1a1a2e"` / `background: img/scenery.png` / `background: img/test-bg.mp4` 적용 후 산출물 HTML 정상 + slide/bg/ 자산 복사 확인. agenda·cover에도 일관 적용. 원복 후 회귀 없음.

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
    - **H2 다음 디렉티브 매칭** (commit `6f34f65`): SSOT 명세(_doc_arch/animation.md) 형태 `## 제목 / #transition-zoom / #auto-animate / 본문` 슬라이드에서 H2가 첫 비공백 라인이라 디렉티브 매칭이 실패하던 회귀 fix. `extractDirectives()`에 H1~H6 헤더 + 빈 라인 skip 후 디렉티브 매칭 시도하는 분기 추가. Case 1 (Issue81 호환: 첫 비공백 라인이 디렉티브)도 그대로 동작.
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
    - 문서: `.claude/rules/md-m2slide-rules.md` "Cover 슬라이드 자동 주입" 섹션에 cover_layout override 항목 추가 + `_doc_arch/chapter-single-mode.md`에 `cover_layout` 동작 표 신규.

## Issue111. 슬라이드 전환·요소 애니메이션 옵션 정리 (등록: 2026-05-05, 해결: 2026-05-05, commit: 45e897c, 1d72147, 7d3130c) ✅
* 카테고리: Frontend
* 목적: 현행 슬라이드 전환(좌우 slide)·기본 트랜지션을 재검토하여 reveal.js가 제공하는 애니메이션 옵션을 m2slide에서 어떤 형태로 노출·제어할지 결정.
* 분할 (2026-05-05): SSOT 명세를 그대로 구현하면 slide-parser·markdown.js inline parser 변경이 필요해 회귀 위험 큼. 본 이슈는 **글로벌 transition 옵션 노출 + SSOT 문서**까지로 스코프 축소:
    - **Issue117** (이슈후보) — 슬라이드 단위 애니메이션 디렉티브 (`#transition-*` 등)
    - **Issue118** (이슈후보) — Pandoc `{.fragment}` inline attribute 파서
* 해결:
    - **Phase 1·2 — 검증·SSOT 문서**: `Projects/animationTest/` 신설하여 reveal.js markdown plugin syntax(`<!-- .slide: ... -->`, `<!-- .element: ... -->`, `{.fragment}`) 통과 여부 빌드+grep 검증 → 모두 텍스트로만 보존되고 section/element attribute로 변환되지 않음 확인. [`_doc_arch/animation.md`](_doc_arch/animation.md)에 결과·향후 syntax 설계 SSOT 작성.
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

> 매트릭스 갱신: [`_doc_arch/key_navigation.md`](_doc_arch/key_navigation.md) (gitignore — 로컬 SSOT) Cover/Agenda/첫 챕터 행 + 단축키 섹션 boundary fallback 명시.

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


## v0.5.0 (2026-05-03) — 71건 아카이브


## Issue70. 키 네비게이션 체계 정리 — Single ←·Chapter ↑·Chapter 챕터 간 ← (등록: 2026-05-03, 해결: 2026-05-03, commit: fa43351) ✅
* 목적: m2slide 키보드(swipe/drag 포함) 네비게이션을 페이지 계층 기반 단일 매트릭스로 정리하고, 사용자 보고 4건(Single ↑/←, Chapter ↑/←) 해결
* design: `_doc_arch/key_navigation.md`
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
    - Phase 7: `_doc_arch/chapter-single-mode.md` cross-reference 추가
* 변경 파일:
    - `lib/agenda.js`: `getPrevChapter` + `_getAdjacentChapter` 추가
    - `lib/html-builder.js`: `PREV_CHAPTER`/`M2SLIDE_COVER` 주입, `Reveal.on('ready')` `?last=1` 핸들러, ↑/← graceful fallback
    - `_doc_arch/key_navigation.md` (신규 SSOT, gitignored)
    - `_doc_arch/chapter-single-mode.md` (cross-reference, gitignored)

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
    - `_doc_arch/css.md`: §3.4.2 표 갱신 (4행 → 3행 + 그 외 throw), 변경 이력에 Issue65 추가
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
    - `_doc_arch/css.md`: §3.4 "Slide_ratio 기반 기하 체계" 신규 + Reveal.js 매핑 표 + 책임 분담 표
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
    - `_doc_arch/css.md`: 임시 "리팩터링 계획" 섹션 제거 + 영구 목록 3종 (base.css/slide.css/_config.yml) + 변경 이력 행
    - `README.md`: base.css 폴더 구조, CSS 우선순위, 신규 테마 작성 가이드 추가
* 검증:
    - `m2SlideStyle1_single`, `m2SlideStyle2_chapter`, `layoutTest` 3개 프로젝트 빌드 성공
    - 신규 테마 `_minimal` fallback 검증 통과 (빈 slide.css + 빈 layouts/로 cover layout 정상 렌더)
    - base.css 이미지 자산 의존 0건 확인 (theme 자산 제거 시 base 영향 없음 보장)
    - 시각 회귀 사용자 확인 통과
* 후속 이슈 후보: default minimal 분화, nowage 차별화

## Issue62. cover-title 반응형 크기 조정 및 CSS 구현 설계 문서화 (등록: 2026-05-02, 해결: 2026-05-02, commit: b12a8db, 789947d) ✅
* 목적: cover 슬라이드 제목이 뷰포트 너비에 따라 줄바꿈 없이 최대 크기로 표시되도록 수정. CSS 구현 형태 SSOT(`_doc_arch/css.md`) 작성.
* 카테고리: Theme / Frontend
* 복잡도: 중간
* 상세:
    - **선행 이슈**: Issue61 (title_contents_gap) 작업 중 발견
    - m2SlideStyle1_single vs m2SlideStyle2_chapter에서 cover-title 줄바꿈 차이 발생
    - 원인: `font-size: 3.4em` (136px) — 좁은 뷰포트에서 30자 제목이 줄바꿈됨
    - 수정: `clamp(1.2em, 5vw, 3.4em)` 적용 (7vw → 5vw; 30자 × 0.6em 공식 적용)
    - `layout-cover` section에 `min-height: 100vh !important` 추가 — flex push로 instructor 하단 고정
    - `_doc_arch/css.md` 생성: CSS 변수 체계·반응형 타이포그래피·레이아웃 패턴 SSOT
* 구현 명세:
    - `theme/default/slide.css`, `theme/nowage/slide.css`: clamp(1.2em, 5vw, 3.4em) + min-height: 100vh
    - `_doc_arch/css.md`: 변수 체계, 5vw 공식, 섹션 높이 규칙, 금지 사항 정의

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
* design: `_doc_arch/chapter-single-mode.md`
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
    - **설계 SSOT 갱신**: `_doc_arch/meta-yml.md`에 cover 정책·변수표·QR 렌더링 v1/v2 계획 추가
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
    - **설계 SSOT**: `_doc_arch/meta-yml.md` 작성 — v1 스키마 + 필드 카테고리 + 단계적 도입 계획 정의
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
* 목적: `_doc_arch/keynote-nowage-theme/` 디자인 이미지 9종(cover, contents, contents-noTopMargin, chapter-toc, chapter, exercise, exercise-small, blank, closing)에 정의된 keynote 시각 언어를 `theme/nowage`에 반영. 단순 구조 위주였던 기존 테마에 마스코트·노랑 강조선·페이지 번호·sketch 풍 타이포 등 결합.
* 카테고리: Theme (테마 시각 디자인)
* 상세:
    - 디자인 SSOT: `_doc_arch/keynote-nowage-theme/*.png` + `img/finfra*.png`
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
* 목적: Issue41(코드 수정) 머지 후 layout 이름 정규화 정책을 코드·룰 문서·회귀 테스트 3축에서 일관 유지 + `_doc_arch/`에 영속 정책 문서화
* 구현 명세:
    - **정책 SSOT 문서화**: `_doc_arch/layout.md`에 "Layout 이름 표기 정책" 섹션 신규 추가
        * 영역 분리표 (사용자 작성 / 사용자 슬라이드 / 시스템 자동 감지 / 파일 시스템)
        * Alias 정규화 동작 명시 (Issue41 `_registerLayoutTemplate()` 헬퍼)
        * 회귀 보장 요소 4종 명시 (코드 alias, 경고 dedup, 룰 문서, lint-config)
    - **룰 문서 동기화**: `.claude/rules/md-m2slide-rules.md` `## 1. 슬라이드별 layout override`에 "Layout 이름 표기 규칙" 서브 섹션 추가 — `_doc_arch/layout.md` cross-link
    - **회귀 테스트 자동화**: `m2slideDo.sh`에 `--lint-config` 옵션 추가
        * `theme/*/layouts/*.html` 파일 시스템 스캔으로 사용 가능 layout 수집 (underscore alias 포함)
        * `Projects/*/_config.yml`의 `theme_default_layout` 값을 BSD-호환 sed로 추출
        * 미존재 layout 사용 시 ✗ 표시 + exit 1, 정상 시 ✓ + exit 0
    - **검증 범위 결과**:
        * 5개 프로젝트(LlmAndVibeCoding, LlmAndVibeCoding2, m2SlideStyle1_single, m2SlideStyle2_chapter, MarkdownGraph) + layoutTest 빌드 정상, layout 미발견 경고 0건
        * `m2SlideStyle1_single` (`theme_default_layout: contents`) 정상 동작
        * lint-config 실증: layoutTest 사용자 로컬 config의 stale `2.1.contents` 참조를 정확히 검출 (Issue38 표준화 이전 잔재 — 사용자 로컬 영역이라 미수정)
* 변경 파일:
    - `_doc_arch/layout.md` (Layout 이름 표기 정책 섹션 +60줄)
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
    - `_doc_arch/video-default.md`: 영속 설계 SSOT (8개 프리셋 매핑 + video-only 풀스크린 정책)
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
* design: `_doc_arch/theme.md`
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
* **design**: `_doc_arch/layout.md`
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
    - 외부 참조 파일 업데이트: `lib/slide_capture/prepare_project.sh`, `_tool/scenario_ramyeon_all.sh`, `_doc_arch/pipeline_steps.md`, `lib/README.md`, `_doc_work/work_m2slide.md`, `_doc_work/scenario_ramyeon.md`, provision 문서

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
    - 설계 동기: [`_doc_arch/key_navigation.md`](_doc_arch/key_navigation.md) Issue106 항목 (Single/Chapter 매트릭스, K3, 변경 이력)
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
    - 설계 동기: [`_doc_arch/key_navigation.md`](_doc_arch/key_navigation.md) Issue105 항목 (단축키 동작 표·K4·변경 이력)
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
    - [`_doc_arch/key_navigation.md`](_doc_arch/key_navigation.md) Single 모드 매트릭스·K7·변경 이력 동기 갱신
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
* 목적: [`_doc_arch/key_navigation.md`](_doc_arch/key_navigation.md) "본문 leaf ↓ → 다음 챕터 첫 슬라이드(TOC slide, 메시지 없음·1회)" 설계가 코드에 반영되지 않음. `02-code-syntax.html?last=1#/2`에서 ↓ 무반응 — `→ →`(2회·메시지) 만 다음 챕터로 이동
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
* 목적: `Projects/m2SlideStyle1_single/slide/index.html#/15` (H2 sub-anchor `#/14` 직후 본문 leaf) 에서 ↑ 키 누름 시 #/14가 아닌 #/12 (H1 anchor "4. 이미지 및 미디어")로 점프. 직속 부모 의미 위반. `_doc_arch/key_navigation.md` 설계의 ↑=parent 규칙에서 H2 sub-anchor도 부모 후보에 포함되어야 함
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
    - **설계 문서 (`_doc_arch/theme_layout_lec.md`, gitignored)**:
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
    - 원인1: `lib/html-builder.js` `findPrevAnchorIndex` / `findNextAnchorIndex` 가 `isAnchorSlide` (`layout-_toc` + `id !== 'toc-placeholder'`) 만 검사. 설계 ([`_doc_arch/key_navigation.md`](_doc_arch/key_navigation.md) L87) 는 "직전/직후 **H1 anchor**" 명시이나 코드는 H2 sub-section autoToc 까지 모두 매칭
    - 원인2: `lib/slide-parser.js` autoToc 분기는 헤딩 레벨에 무관하게 (children 존재 시) `layout: '_toc'` 로 wrap. 렌더된 section에 heading level 정보가 없어 키 핸들러가 H1 vs H2 구분 불가
    - 증상2: 사용자 환경 (macOS) 에서 물리적 Home/End 키를 눌러도 window 최상위 capture phase 에서도 keydown 자체가 잡히지 않음 (PgUp/PgDown 은 정상 도달). 진단 페이지 `_doc_work/key-test.html` 로 확인. 원인은 OS·키보드·리매핑 도구 단계 추정 — 우리 코드로는 해결 불가
* 구현 명세:
    - `lib/slide-parser.js` autoToc 분기에서 `s.headingLevel = level` 보존
    - `lib/html-builder.js` `generateSlideHTML` 에서 `slide.autoToc && slide.headingLevel` 인 section 에 `data-heading-level="${level}"` 속성 주입
    - 키 핸들러 (`generateHTML` 본문 deck) 에 `isH1Anchor` 헬퍼 추가 — `isAnchorSlide` + `dataset.headingLevel === '1'`. `findPrevAnchorIndex` / `findNextAnchorIndex` 가 `isH1Anchor` 사용. `isAnchorSlide` 자체는 ↑/↓ parent/child 의미 유지 위해 그대로 (H2 sub-section TOC 도 anchor 로 인정)
    - Home/End 핸들러에 fallback 매칭 추가: `event.code === 'Comma'` / `event.code === 'Period'` (`,` / `.`). cover 핸들러 ([`generateCoverHTML`](lib/html-builder.js)) 와 agenda 핸들러 ([`generateAgendaHTML`](lib/html-builder.js)) 에도 동일 fallback 적용 (no-op 매핑 확장). `event.code` 기반이라 Shift·한글 IME 무관
    - 설계 문서 [`_doc_arch/key_navigation.md`](_doc_arch/key_navigation.md) 키 정의 표 / 핵심 원칙 / 변경 이력 갱신 — `,`·`.` fallback 명시
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
* 검증: `_doc_arch/key_navigation.md` 표/매트릭스/mermaid/결정사항 모순 없음, Issue87 구현과 동기 commit

## Issue87. key_navigation 설계 반영 — 9키 네비게이션 체계 구현 (등록: 2026-05-04, 해결: 2026-05-04, commit: a44b7b6) ✅
* 카테고리: Frontend + Generator
* 목적: [`_doc_arch/key_navigation.md`](_doc_arch/key_navigation.md) SSOT를 빌드 산출물에 반영. ↑/↓를 페이지 계층 parent/child 이동, ⇤/⇥를 sibling 점프, ⇞/⇟를 끝단 직행으로 매핑한 9키 네비게이션 체계 구현
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
* 목적: `_doc_arch/theme_layout_default.md` §2에 명세된 레이아웃 설계 결정사항 6종을 `theme/default/` 실제 layout HTML·`slide.css`에 반영. 설계 SSOT ↔ 빌드 산출물 정합성 회복
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
    - `_doc_arch/theme.md` §2 표에 "파일 존재 시 우선" 조건 명시
    - 표 아래에 fallback 동작 보강: `slide_css:` 지정 파일 미존재 시 → `theme:`로 fallback (silent failure 방지) + `theme:` 미존재 시 default fallback + warning
* 검증: 문서 변경만 (gitignored `_doc_arch/`). `lib/config.js` 동작과 기재 일치 재확인

## Issue83. 설계 문서 `theme_layout.md` §5.1·§11.2·§15 `_toc` 자동 적용 조건 정정 (등록: 2026-05-04, 해결: 2026-05-04, commit: 568f456) ✅
* 목적: `theme_layout.md` §5.1·§11.2가 "첫 슬라이드 자동 `_toc` 적용"으로만 기술하나, 실제 코드(`lib/html-builder.js:341`)는 Issue58 이후 "AGENDA.md 서브챕터(H3) 존재 시"에만 `_toc` 적용. Issue58 변경분 미반영 정정
* 상세:
    - §5.1: 적용 조건 3개(`_toc.html` 존재 + `hasTocItems` + `!skipTocPlaceholder`) 명시. single mode/서브챕터 없는 chapter는 미적용 + `isTitle` 슬라이드 제거 명시
    - §11.2: 처리 흐름 7단계로 재구성, 조건 검사·기존 isTitle 교체·fallback 분리 명시
    - §15 검증 기준 7,8,8a 분리 — 적용 케이스/미적용 케이스/예외 fallback
* 검증: 문서 변경만 (gitignored `_doc_arch/`). chapter-single-mode.md와 정합성 유지

## Issue82. `lib/layout.js` dead `_WARNED_MISSING_LAYOUTS` 제거 + 설계 문서 §4.4 정정 (등록: 2026-05-04, 해결: 2026-05-04, commit: ee70b2a) ✅
* 목적: `theme_layout.md` §4.4가 회귀 보장 요소로 기재한 `_WARNED_MISSING_LAYOUTS` Set이 실제로는 `lib/layout.js:58`에 dead code로 남아있고, 실제 dedup은 `lib/html-builder.js`의 `_warnedMissingLayouts`가 담당. 코드·문서 모두 실태에 정렬
* 상세:
    - `lib/layout.js`에서 `_WARNED_MISSING_LAYOUTS` Set 선언 제거 + Issue41 코멘트 정리 (Issue82 코멘트로 갱신)
    - `_doc_arch/theme_layout.md` §4.4 회귀 보장 요소 표기 정정: `lib/layout.js _registerLayoutTemplate()` + `lib/html-builder.js _warnedMissingLayouts`
* 검증: 4개 프로젝트 빌드 회귀 없음 (m2SlideStyle1_single, m2SlideStyle2_chapter, layoutTest, LlmAndVibeCoding)

## Issue81. 슬라이드 layout 메타 `#layout-` prefix 정식 지원 (등록: 2026-05-04, 해결: 2026-05-04, commit: c27ae5d) ✅
* 목적: 설계 문서(`_doc_arch/theme_layout.md` §6, §6.2 + `.claude/rules/md-m2slide-rules.md` 다수 예제)는 `#layout-name` syntax를 명시하나 실제 코드(`lib/slide-parser.js` `extractLayoutMeta`)는 `#name` 형태만 인식하여 모든 문서·예제가 동작하지 않던 상태. spec ↔ code 정합성 회복
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
    - 문서 갱신: `_doc_arch/{meta-yml,Glossary,chapter-single-mode,theme_layout,theme_layout_default}.md`, `.claude/rules/md-m2slide-rules.md`, `CLAUDE.md`, `README.md`
* 검증:
    - 6개 프로젝트 전수 빌드 통과 — 콘솔 `✅ Project meta loaded from frontmatter: ...`
    - cover 슬라이드 `cover-instructor-name`에 frontmatter 값 정상 치환 (`남중구 (핀프라)`)
    - `_meta.yml` 잔존 참조 0건 (코드·문서, historical Issue 코멘트 제외)

## Issue78. 번호 prefix layout 6종 폐기 + layout_default.md를 theme_layout_default.md에 머징 (등록: 2026-05-03, 해결: 2026-05-03, commit: afdb361) ✅
* 목적: Issue73에서 추가된 번호 prefix layout 6종(`2.2.contents-full`, `2.3.contents-split`, `4.2.chapter`, `6.1.exercise`, `6.2.exercise-small`, `9.1.closing`)을 폐기하고, 시각 디자인 SSOT(과거 `layout_default.md`)를 `theme_layout_default.md`에 통합하여 default theme 단일 진입점으로 단순화함
* 상세:
    - 폐기 대상: `theme/default/layouts/` 번호 prefix HTML 6개 (`git rm` 처리)
    - `_doc_arch/layout_default.md` → `theme_layout_default.md` §7 "디자인 방향성"·§8 "변경 가이드라인" 머징 후 삭제
    - 부수 작업(범위 확장): layout HTML class를 파일명 기준 `_` prefix 유지 표기로 정렬 (`layout-cover` → `layout-_cover` 등) — `_doc_arch/theme_layout.md` §4.2/§4.3 규정 정렬
    - `lib/css/base.css`, `theme/default/slide.css`, `lib/html-builder.js`의 selector·생성 클래스명 일괄 갱신
* 검증:
    - 빌드 검증: `m2SlideStyle1_single`, `m2SlideStyle2_chapter`, `layoutTest` 모두 통과
    - 산출물 HTML에서 `layout-_<name>` 클래스 정상 출력 확인 (8건 이상)
    - 폐기된 번호 prefix layout 6종은 어떤 프로젝트에서도 미참조 (grep 0건)
    - `layout_default.md` 잔존 참조 0건 (`_doc_arch/`·`_doc_work/`·`.claude/`·`Issue.md`)

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
* 목적: 번호 prefix 컨벤션(`_doc_arch/theme_layout.md`) 기반 layout 변형 추가
* 상세:
    - 신규 6건: `2.2.contents-full.html` (전체 높이 contents), `2.3.contents-split.html` (좌/우 split), `4.2.chapter.html`, `6.1.exercise.html`, `6.2.exercise-small.html`, `9.1.closing.html`
    - 5/1 작성됐으나 어떤 이슈에도 포함되지 않은 잔재 → 사후 등록·수습

## Issue72. CSS `!important` 과도 사용 1차 최적화 (등록: 2026-05-03, 해결: 2026-05-03, commit: 05b7782) ✅
* 목적: `_doc_arch/css.md` SSOT 기반으로 CSS의 `!important` 과도 사용을 정리. **안정성**(specificity로 충분히 우선되는 케이스만 제거) + **수동 용이성**(사용자 override 가능성 회복) + **slide.css 최소화**가 목표
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
* 목적: `_doc_arch/key_navigation.md` v1에서 후속 검토로 분리되었던 "본문 → H1 section anchor → Agenda" 4단계 페이지 계층(Single)·5단계(Chapter) 구현. 동시에 Home 키를 도입해 어디서든 1키로 Agenda 진입 가능하게 함
* plan: (단순/중간 — plan 파일 미생성, 본 이슈 본문 명세로 충분)
* 상세:
    - 현재 동작: Single 본문에서 ↑ → 즉시 `agenda.html` 직행. H1 section 슬라이드(layout-_toc.autoToc)를 거치지 않음
    - 사용자 보고: `m2SlideStyle1_single/slide/index.html#/13` ("이미지" H1 children) 위치에서 ↑ → `#/12` H1 section으로 가야 자연스러운데 agenda로 감
    - 마크다운 파서(`lib/slide-parser.js:243-269`)는 이미 H1 children이 있는 슬라이드를 `layout: '_toc'` + `autoToc: true`로 자동 분류 중. 따라서 별도 H1 식별 로직 불필요 — layout 클래스만 활용
    - chapter mode `#/toc-placeholder` 슬라이드와 구분: id가 `toc-placeholder`면 chapter 시작 TOC, 그 외 `layout-_toc`면 H1 section anchor
* 구현 명세:
    - `_doc_arch/key_navigation.md` 매트릭스 갱신 (K4 v1을 H1 anchor 단위로 승격, Chapter 모드도 본문→H1→TOC 단계 추가, Home 키 행 추가)
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

