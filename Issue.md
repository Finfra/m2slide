# Issue Management
* https://github.com/Finfra/m2slide/issues
* Issue HWM: 427
* Checkpoints:
    - 70e29d3 (2026-09-11) m2slide→pptx 정책 갱신·lane G SmartArt 종결 시점
    - 3510da8 (2026-08-11) ig-maker·ppt-maker 통합 착수 직전
    - bf2efa7 (2026-07-13) 작업 트리 스냅샷
* 오래된 Issue는 `z_old/old_issue.md`에 저장
* Save Point :
    - **v0.8.0 (2026-07-13)** — release: 라이선스 이중화(CC BY 4.0 + 상업, LICENSE.md 신설) + dev-server 확장(/s/·/n/ semantic 분리, /pd/ 덱 목록, 설정 GUI, 피드백 루프) + default_dark 테마·palette 시스템 + authoring-pipeline 학습 루프(slide-tuner·ppt2m2slide·note-writer) + self-contained vendor 자산. 완료 이슈 159건 z_old 아카이브.
    - **v0.7.0 (2026-05-06)** — release: `/deploy-docs` 신규 커맨드 + `_config.yml: deploy_formats` 옵션 (EPUB/PDF/PPTX 자동 빌드·배포 + 메인 인덱스 카드 다운로드 배지) + agenda 다운로드 버튼 위치 변경(우상단 헤더 → `.layout-_agenda` 우하단 absolute, 마스코트 충돌 회피). v0.6.x 시리즈(Issue71-126 + Issue127-128) 누적 z_old 아카이브.
    - **v0.5.0 (2026-05-03)** — release: 71건 완료 이슈 z_old 아카이브, CHANGELOG.md 신규 (Issue70까지 포함)
    
# 🤔 결정사항

결정은 **각 정본 문서**에 산다 — 여기 사본을 두지 않는다(2026.09.02 정리).

| 결정                                                                               | 정본                                                                                 |
| :--------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------- |
| 별도 `_meta.yml` 파일 미사용 — `AGENDA.md`·`{프로젝트명}.md` frontmatter 에 넣는다 | [meta-yml.md](_doc_arch/meta-yml.md) "별도 `_meta.yml` 파일은 쓰지 않는다"           |
| m2slide 모듈 분리는 나중에 — 지금은 상위 프로젝트와 함께                           | [decisions.md](_doc_arch/decisions.md) "m2slide 모듈 분리는 나중에"                  |
| SCAR 는 가급적 프로젝트 폴더에 배치 (배포용 자족)                                  | [scar-portability.md](_doc_arch/scar-portability.md) "SSOT 경계"                     |
| `img/` 소스·빌드 이중 복사 유지                                                    | [decisions.md](_doc_arch/decisions.md) "`img/` 이중 복사를 유지한다"                 |
| 로우·값 단위 개별 애니메이션 지원 (Issue149 완료)                                  | [animation.md](_doc_arch/animation.md) "3. m2slide syntax 설계"                      |
| 왕복 구조적 4축은 pptx 에 밀반입하지 않는다 (선언된 손실 유지)                     | [decisions.md](_doc_arch/decisions.md) "왕복 구조적 4축은 pptx 에 밀반입하지 않는다" |

# 🌱 이슈후보


1. single mode 의 H1 을 원고로 되찾기 — chapter mode 는 챕터 TOC 장 제목에서 되찾았으나(Issue388) single mode 는 H1 만 있던 장이 pptx 에 흔적을 남기지 않아 불가. 정방향이 신호(lane S·docProps)만 남기면 되고 **deck 은 변하지 않는다**(되살린 `# H1` 을 재빌드하면 `cards_placeholder: false` 가 다시 지운다). 닫으면 `fidelity.yml h1_chapter` 를 `lossy` 로 올릴 수 있다
1. `m2Slide_chapter_mode` 의 `bullet_nesting` ±4 — m2slide(2칸=1레벨) ↔ pandoc(CommonMark) 해석차. **왕복 문제이기 전에 HTML·pptx 산출물 불일치**다(`fidelity.yml` caveat 에 🚧 로 있음)
1. htmlart 캔버스 종횡비 정렬 — `arrow` 외 나머지(funnel·venn·bracket·block·hexagon·step·numbered·balance 는 가로를, timeline·chevron·process·hierarchy·workflow 는 세로를 버린다). 원인은 Issue390 과 같다 — 그 이슈가 «세로 반지름을 고정하고 가로를 목표 비율에서 역산한다» 는 해법과 M 스윕 검증 절차를 남겼으니([types.yml](data/htmlart/types.yml) `arrow.canvas_note`) 거기서 시작한다. 다만 타입마다 배치 재설계가 필요하다
1. htmlart 고정 폰트 잔여 + 세로 넘침 — `centerLabel` 을 고정 폰트로 부르는 `venn`(28/18)·`hexagon`(25/17)·`pie`(20/15) 와 `balance` 가 세로로 넘친다. prj60 전수(2026-09-20, `z_test/htmlart-fo-audit.mjs`) venn 4건(+4~15px)·balance 10건(+6~23px). Issue391 과 같은 결함 계열 — fit 경로(`uniformTitleFs`)로 통일
1. `::: part` 를 소비하지 않는 테마에서 그 블록이 **조용히 사라진다** — `theme/default` 의 `_chapter.html` 에 `{{part}}` 가 없어 원고에 쓴 5개가 HTML·pptx 양쪽에서 버려진다(aTest-all 실측). 슬롯 미소비를 저작 단계에서 경고할지
1. 캡처 이미지 테두리가 `default`·`default_dark` 에는 **아예 없다** — `--m2-media-border` 도 `.reveal .media-container img` 규칙도 `default_lec` 에만 있다(2026-09-20 실측). Issue397 과 같은 결함 계열이나 성격이 갈린다: `default` 는 기존 덱 **전부**의 렌더가 바뀌어 회귀 범위가 다르고, `default_dark` 는 배경이 `#0c0e16` 이라 **검정 alpha 로는 성립하지 않아** 흰 alpha 로 다시 역산해야 한다(기준은 같은 WCAG 3:1)
1. 앱 소개 5덱(fPmIntro·fPmIntro_en·n3shIntro·fSnippetCliIntro·fWarrangeCliIntro) prj42a `decks/tech/` 2차 이관 — Issue424_1 안정 후(사용자 결정 2026-09-28). fSnippet·fWarrange 는 publishing 빈값이라 **첫 공개(H:공개)** 확정 필요. fPmIntro 의 mp4 34MB 는 prj42a `.gitignore` `*.mp4` + finfra.kr 호스팅. docs 이전 링크 표시는 Issue424 규약 그대로
1. LlmFlow(353장) prj42a 이관 — **보류**(사용자 결정 2026-09-28). publishing `x` 라 이관 = 첫 공개. 공개 결정이 먼저이며 그 전까지 원고는 git 미추적 상태로 남는다
1. `Projects.md` publishing `o` 15개 vs `Projects/.gitignore` 허용목록 11개 불일치 — AgenticCoding·graphify·StellarEvolution·n3shIntro 가 빠져 원고가 git 미추적. 앞 3개는 Issue424_1 이관으로 해소되지만 `--sync-projects` 가 왜 어긋났는지(생성 로직 vs 미실행)는 남는다 (Issue424 에서 발견)
1. `--lint-deployment` 가 강의 본문의 명령·경로 예시(`curl localhost:3000`·`/Users/...`)를 위반으로 잡는다 — AgenticCoding·LlmFlow·z_done 30줄. 자산 참조(`src`·`href`·`url(`)만 보도록 좁힐지 (Issue424 에서 발견)
1. `Projects.md` publishing `o`·`Projects/.gitignore` 허용(`!/n3shIntro/`)인데 **원고 추적 파일 0개** — 허용목록만 맞고 `git add` 가 된 적이 없다(2026-09-29 `git ls-files Projects/n3shIntro` 0). 앱 소개 5덱 prj42a 2차 이관 때 해소 예정이나, `--sync-projects` 가 «허용 ↔ 실제 추적» 불일치를 보고하게 할지 (Issue425 에서 발견)
1. [글로벌 SCAR] `~/.claude/sh/issue-tx.py` 가 서브 이슈 번호 `Issue424_1` 을 `4241` 로 읽어 `stage/commit --issues` 에 서브 블록을 싣지 못한다 — prj42 에서는 HEAD blob 변환 + 임시 인덱스로 우회. `~/.claude/Issue.md` 등록 후보 (Issue424 에서 발견)


# 🚧 진행중

## Issue415: 아이폰에서 **탭(클릭)만으로** 덱이 동작하는지 ego-browser 로 점검·수정하고 aTest → aTest-all 2단계로 안정화 (등록: 2026-09-23)
* 목적: 키보드 없는 아이폰에서 m2slide 덱을 탭만으로 넘기고 쓸 수 있어야 한다(사용자 전제: **터치 = 클릭**). 동시에 prj3 외부*핀봇(외부자문·외부컨설턴트)이 팀장핀봇 배분 경로로 실제 동작하는지 실증한다(요청: 사용자 → 나래, prj3#Issue678 후속)
* plan: `_doc_work/plan/iphone-tap-nav_plan.md`
* task: `_doc_work/plan/iphone-tap-nav_task.md`
* report: `_doc_work/report/issue415-result_report.md`
* 🎯 **현재 배분 지시 (2026-09-24, 나래) — 이것만 한다**:
    - ① QA 배분 `fbot-qa-issue415` 를 `close --evidence`(증적: `_doc_work/report/iphone-tap-nav_qa-stage1_report.md`)
    - ② **A1 만** 외부컨설턴트핀봇(`contractor`, 도구 `codex-worker`)에 발주 — 스와이프 IIFE(`lib/html-builder.js` `SWIPE_MIN_PX` 부근)가 **스크롤 뷰(`.reveal-scroll`)에서는 세로 스와이프를 키로 바꾸지 않게**. 가로 스와이프·페이지 뷰(PC) 세로 스와이프는 유지. 뷰 모드는 회전·리사이즈로 바뀌므로 초기화 시점 상수로 굳히지 말 것. 요청서 초안 `_doc_work/plan/iphone-tap-nav_patch-PA.md` 의 A1 절 사용 (A2·표지 전면 탭은 이번 범위 밖 — 사용자 결정 2026-09-24)
    - ③ 받은 patch 를 적용 → 전 프로젝트 재렌더(`for d in Projects/*/slide; do ./m2slide.sh "Projects/$(basename $(dirname $d))"; done`)
    - ④ 검증은 **ego 모바일 자동 테스트** — `z_test/ego-mobile/run.sh aTest aTest-all` (1단계 → 2단계). 완료 조건 = **M6 PASS** + 나머지 항목 무회귀(현재 M1~M5·L1 PASS, M6 만 FAIL — 기준 리포트 `_doc_work/report/ego-mobile_20260924_133335.md`)
    - 🔴 **1차 시도 실패 원인 (2026-09-24 13:42, 나래 확인)** — 팀장이 codex-worker 를 **백그라운드 Bash** 로 발주하고 턴을 끝내자 `claude -p` 프로세스가 종료되며 codex 도 함께 죽었다(시작 70초 만, worktree `/tmp/codex-worker.20260924_134109.60018` 잔존). **백그라운드 Agent 는 `-p` 세션을 붙잡지만 백그라운드 Bash 는 못 붙잡는다.** 재시도 방법: 외부컨설턴트를 **Agent** 로 띄우고, 그 Agent 안에서 codex-worker 를 **포그라운드**(Bash timeout 600000)로 실행. 10분을 넘기면 `nohup … &` 로 분리 실행 후 `until [ -f <patch> ]` 폴링을 10분 단위로 반복. contractor 배분 `fbotdisp-1790224856-27fb3a77` 은 열린 채 유지 — 새 배분 없이 이것으로 재시도
    - ✅ **배분 지시 ①~④ 완료 (2026-09-24 13:48, 팀장 `fbot-lead-m2slide`, commit: `0a4369e`)**
        - ① QA 배분은 이미 원장에서 종결돼 있었다(`close --dry-run` → 미종결 아님)
        - ② 외부컨설턴트를 **Agent** 로 띄우고 그 안에서 codex-worker 를 nohup + 포그라운드 폴링 → rc0·130초. 납품 [codex-work_20260924_134413.patch](_doc_work/report/codex-work_20260924_134413.patch): 세로 분기에 `if (Reveal.isScrollView()) return;` 1줄(touchend 시점 판정, Reveal 5.0.4 공개 API)
        - ③ `git apply --check` 통과 → 적용 → Projects 29개 재렌더 전부 OK
        - ④ [ego-mobile_20260924_134709.md](_doc_work/report/ego-mobile_20260924_134709.md) — aTest·aTest-all **M6 PASS**(위·아래 쓸기 키 합성 0), M1~M5·L1 무회귀
        - 관측(비차단): aTest L1 은 표지에서 가로 스와이프 시 `n/a`(agenda)로 넘어간다 — 기준 133659 와 동일, 133335 에서는 `→ ?` 로 1회 FAIL. 흔들리는 항목이라 QA 재측정 대상
        - 남은 완료 조건(이 배분 밖): PC 클릭·키보드 매트릭스 재검증 · 결과 보고서 · 외부자문핀봇 배분 기록
    - ✅ **ego 모바일 자동 테스트 러너 커밋 (2026-09-26, pm-do 위임, commit: `03bdf44`)** — `z_test/ego-mobile/`(`run.sh`·`mobile-check.js`) + 본 이슈 plan·task·report 필드
    - ✅ 간격·htmlArt 두 수정은 팀장이 선커밋함(`cf74c53`) — codex base 에 포함됨
    - ⚠️ 간격(`scrollLayout: 'compact'`)·htmlArt 높이(`base.css`) 수정은 **이미 적용됨(미커밋)** — patch 가 이 둘을 되돌리지 않게. codex 는 base 커밋만 보므로 위임 전 이 두 파일(`lib/html-builder.js`·`lib/css/base.css`)을 먼저 커밋하거나 `--base` 를 맞출 것
* 상세:
    - ① ego-browser 아이폰 에뮬(ex: 390×844, `Emulation.setDeviceMetricsOverride` `mobile:true`)에서 **탭·클릭만** 으로 다음/이전·챕터 경계·agenda·오버뷰 등 내비게이션 전수 점검 → 결함 목록. 키 입력 사용 금지
    - ② 결함 수정(업데이트)
    - ③ 테스트 2단계 — 1단계 `aTest` → 통과 시 2단계 `aTest-all` (회귀 + 아이폰 재점검)
    - ④ 산출: 기획안(plan/task) · 안정화 진행 · 결과 보고서(`_doc_work/report/`)
    - 선례: 원형 `m2-nav-arrows`·`setupMobileNavigation` 제거 이력(«마우스/터치 클릭으로 다음/이전 페이지 이동» 이슈) · 설계 [key_navigation.md](_doc_arch/key_navigation.md)
* 인사계획 (나래 검토 2026-09-23 — 팀장핀봇 `fbot-lead-m2slide` 가 배분):

| 단계          | 담당 (자리)                              | 할 일                                         | 도구                  |
| :------------ | :--------------------------------------- | :-------------------------------------------- | :-------------------- |
| 1 기획안      | 기획핀봇 (`42/dev-planner-1`)            | plan·task — 탭 전용 점검 매트릭스·완료 조건   | nPTiR                 |
| 1' 설계 대조  | 외부자문핀봇 (`42/ext-advisor-1`)        | 내비게이션 설계 문서 ↔ 구현 drift (터치 관점) | `codex-arch-reviewer` |
| 2 아이폰 점검 | QA핀봇 (`42/rev-qa-1`)                   | ① 실측 → 결함 목록                            | ego-browser           |
| 3 수정        | 외부컨설턴트핀봇 (`42/ext-contractor-1`) | 결함별 patch 납품 → 팀장이 적용               | `codex-worker`        |
| 4 안정화 검증 | QA핀봇 (`42/rev-qa-1`)                   | ③ 2단계 테스트 + 아이폰 재점검, 4축 판정      | 러너·ego-browser      |
| 5 보고        | 팀장핀봇 → 나래                          | 결과 보고서                                   | —                     |

* 인사계획 검토 결과 (반영 완료·주의):
    - ✅ 4개 role 배분 dry-run 전부 허가 · 예산(배분 26·채용 13 잔여) 충분
    - ✅ 외부*핀봇 자리 부재 → prj3 `data/fbot/org/42.yml` 에 `ext` 외부협력부서 2자리 추가
    - ⚠️ **codex 샌드박스에서 ego-browser 불가**(실측: `cannot connect to the ego_cli bootstrap`) → 아이폰 점검은 QA핀봇, 외부컨설턴트핀봇은 **코드 수정만**
    - ⚠️ 외부자문 도구는 `_doc_arch` 전용 → 계획서가 아니라 **설계 문서** 대조로 한정
    - ⚠️ codex 는 **base 커밋만** 본다 — 작업트리에 미커밋 변경이 많다(`Projects/*/slide/*.html` 등). 위임 전 관련 변경 커밋 여부 확인
    - ⚠️ `aTest` 픽스처가 **git 미추적**(이슈후보 29) → codex worktree 에는 픽스처가 없다. patch 검증은 QA 가 적용 후 수행
    - ⚠️ 팀장 동시 배분 상한 **3** → 단계를 직렬로 돌린다
* 🔴 사용자 실기기 보고 (2026-09-23, 나래 경유) — **최우선 결함**:
    - 증상: 모바일로 `aTest` 를 열면 처음엔 **스크롤로 잘 보이다가**, 갑자기 **리프레쉬되면서 스크롤이 안 된다**
    - ✅ **원인 확정 (QA 2026-09-23, 4/4 결정론 재현)** — 리프레쉬가 아니라 **이동**이다: Issue51 스와이프 IIFE 가 스크롤 뷰의 **세로 드래그(=스크롤)를 스와이프로 오인** → `ArrowUp` 합성 → `gotoTocOrAgenda()` → `agenda.html` 이동 → agenda 는 `scrollable:false`. `{passive:true}` 라 스크롤은 막지 않고 **손을 떼는 순간** 키가 나가서 «되다가 갑자기» 로 보였다. 증거: [iphone-tap-nav_qa-stage1_report.md](_doc_work/report/iphone-tap-nav_qa-stage1_report.md) §실기기 결함 재현
    - 처방(P-A): 스와이프 판정에 **뷰 모드**를 넣어 스크롤 뷰에서만 세로 스와이프 dispatch 를 끈다. 가로 스와이프·페이지 뷰(PC·태블릿) 세로 스와이프는 유지 — 제거가 1순위가 아니다
    - ~~나래 가설~~ **반증**(이력 보존): H1 resize 핸들러 3곳 덮어쓰기 — 높이 844→750→844·회전 2사이클 모두 스크롤 유지 / H2 iOS 실제 재로드 — `__sentinel` 생존·`navigation.type="navigate"`. 전제(`scrollActivationWidth` 435 → 스크롤 뷰 자동 진입)는 런타임에서도 참이었으나 결론이 틀렸다
    - 계측 함정 2건(다음 계측자 필독): CDP 제스처는 1100~2254ms 라 `SWIPE_MAX_MS`(700) 에 걸려 «오인 없음» 으로 오진한다 → 페이지 내부 `TouchEvent` 합성(103ms) / `keydown` 프로브는 덱의 `stopImmediatePropagation()` 에 차단된다 → `window` 캡처
* 🧪 사용자 수동 테스트 (2026-09-23, ego 스페이스 #7 — 고정 폭 iframe 틀 [모바일](../../../../../.claude/_doc_work/htm/m2slide-mobile-bench.html)·[PC](../../../../../.claude/_doc_work/htm/m2slide-pc-bench.html)): **PC 는 정상 · 키보드 없는 모바일이 문제** → P-A 최우선 확정. ⚠️ 모바일 틀은 터치 이벤트가 없어 A1(스와이프 오인)은 실기기 또는 DevTools 기기 모드에서만 재현된다
* 🔴 사용자 실기기 보고 2 (2026-09-23) — **스크롤 뷰에서 슬라이드 간격이 너무 크다**(아이폰, htmlArt 차트 뒤 빈 공간이 화면 대부분):
    - 원인(확정): reveal `scrollLayout` 기본값 `"full"` — 스크롤 뷰에서 한 장의 높이를 **뷰포트 높이**로 잡는다. m2slide 는 이 옵션을 설정하지 않는다(`lib/*.js` 0건). 390 폭에서 3:2 슬라이드 실높이는 260 인데 844 를 차지해 584px 가 빈칸
    - 실측(ego 런타임 `Reveal.configure({scrollLayout:"compact"})`, 소스 무수정): 장당 높이 **844 → 260** · 8장 스크롤 길이 **7606 → 2934(−61%)**. PC 는 폭 435 이상이라 스크롤 뷰 미사용 → 영향 없음
    - 처방 후보(P-A 편입): `Reveal.initialize` 에 `scrollLayout: 'compact'` — 덱·표지·agenda 초기화 전부 대조. `scrollSnap` 과의 상호작용은 QA 재측정 항목
* ✅ 적용 완료 (2026-09-24, 사용자 직접 지시 — 나래 인박스 경로와 별개, 미커밋):
    - ① 세로 간격: `lib/html-builder.js` 덱·표지 `Reveal.initialize` 에 `scrollLayout: 'compact'` → 장당 844 → 260
    - ② 🔴 사용자 실기기 보고 3 — **모바일에서 htmlArt process·pie 본문이 비었다**. 원인: reveal `reveal.css` 의 `.reveal-viewport.reveal-scroll .scroll-page section { display:block !important }` 가 `base.css` 의 layout section flex 를 덮어써 `-body` 가 늘지 못하고 `flex:1 1 0` 인 htmlArt 가 높이 0. 처방: `lib/css/base.css` 에 `.reveal-viewport.reveal-scroll .scroll-page section[class*="layout-"] { display:flex !important }` (**base.css 가드 — 사용자 컨펌 2026-09-24**)
    - 검증(Playwright **WebKit** iPhone 14, tailnet 경로): 모바일 htmlArt 높이 aTest process·pie **0 → 193** · aTest-all numbered 180 / PC 1440×900 process CSS 938.92px·화면 646px **수정 전과 동일** / Projects 29개 재렌더 전부 OK
* ✅ 사용자 결정 Q1~Q3 (2026-09-23, 나래 경유 — [plan](_doc_work/plan/iphone-tap-nav_plan.md) 열린 질문 종결):
    - Q1 본문 여백 탭 = 다음 슬라이드 → **도입 안 함**. A1 수정 후 스크롤로 충분한지 재측정
    - Q2 표지 탭 대상 → **표지 전면 탭**(버튼 은폐 유지, 챕터모드 표지와 같은 방식). 대상 파일이 CSS 가 아니라 `html-builder.js` — P-C 가 아니라 P-A 계열로 재배치
    - Q3 오버뷰 탭 대응물 → **불필요**. T14 는 «미설계» 로 [key_navigation.md](_doc_arch/key_navigation.md) 에 기록, A3 제외
    - 발주 순서(전임 팀장 제안 채택): **P-A(A1·A2·Q2 표지 전면 탭) 먼저** → QA 재측정 «스크롤만으로 전 구간 도달?» → 가능하면 C1(스크롤 뷰 `.controls` 은폐)은 reveal 의도된 설계로 닫고 근거 기록, 불가하면 C1 발주. 요청서 초안: `_doc_work/plan/iphone-tap-nav_patch-{PA,PC}.md`
    - ⚠️ 전임 팀장 몸체(세션 `75901e41`)는 12:57 종료 — prj3#Issue679 수정 후 **새로 배분·스폰**해 이어받는다. QA 배분 `close --evidence` 도 그때
* 🔴 검토 범위 확장 — **모바일 + PC 둘 다** (사용자 지시 2026-09-23, 나래 경유):
    - 모바일(아이폰 에뮬 390×844, 스크롤 뷰): 탭(클릭) 전용 — 기존 전제 유지
    - PC(데스크톱 ex: 1440×900, 페이지 뷰): **클릭 + 키보드 매트릭스([key_navigation.md](_doc_arch/key_navigation.md)) 회귀**. 「키보드 없음」 전제는 모바일에만 적용
    - ⚠️ 실기기 결함 수정이 resize 핸들러·스크롤 뷰를 건드리므로 **PC 회귀 위험이 가장 크다** — patch 마다 두 환경 모두 재검증. 결과 보고서는 모바일·PC 를 나란히 둔 표로
* 구현 명세:
    - 완료 조건: 아이폰 에뮬에서 탭만으로 전 내비게이션 통과 · **PC 에서 클릭·키보드 내비게이션 무회귀** · **위 실기기 결함(리프레쉬 후 스크롤 불가) 해소** · `aTest`·`aTest-all` 초록 · 결과 보고서 · 외부*핀봇 2종 각 1회 이상 배분·완료 기록(원장)

# 📕 중요

## Issue427: `lane-t.py` 4:3 좌표 상수 가정 — 글로벌 reference 가 이미 판형에 맞춰져 표지·섹션 placeholder 를 **두 번 늘려** 캔버스 밖으로 민다 (등록: 2026-09-29)
* 목적: `6.roundtrip.sh`(aTest)·`9.single-parity.sh`(gate16) 가 check-conform `✕ FAIL 캔버스 이탈 1장` 으로 빌드 rc1 이다. prj3#Issue783 귀속 조사에서 원인이 글로벌 산출물이 아니라 **이 저장소의 계약 가정**으로 확정됐다 — 글로벌이 바뀐 계약을 한쪽(lane-t)이 아직 모른다
* depends: prj3#Issue783
* 상세:
    - 출처: prj3 fbot-developer-issue783 (prj3#Issue756 C 등급 — 타 repo 이슈 **등록**만, 코드 수정은 이 저장소 소관)
    - 계약 변화: prj3 `f75dc1af`(Issue719 P1) 부터 `theme2reference.py` 의 `fit_canvas()` 가 캔버스를 넓히면서 **마스터·레이아웃 xfrm 도 같은 비율로 옮긴다**(prj7 계약 «16:9 레이아웃 오른쪽 끝 ≥ 캔버스 85%»). 그런데 [lane-t.py](lib/pptx/lane-t.py) 는 `OLD_W, OLD_H = 9144000, 6858000` · `OLD_BOX_L, OLD_BOX_W = 457200, 8229600` 을 상수로 두고 `remap_x/remap_w/remap_y` 로 **4:3 좌표라고 가정해** 다시 늘린다
    - 실측(2026-09-29, igTest theme.yml 338.67×225.78mm): 글로벌 산출 reference 의 Title Slide `Title 1 [25,70 287×48]mm` — 판형 안. `lane-t --mode layout` 뒤 `[27,84 401×54]` — 폭 401 > 339 **이탈**. Section Header·푸터 placeholder 도 같이 이탈(본문 레이아웃은 실측 PX 로 덮어써 무사 — 표지·섹션만 «비례 보정» 경로라 드러난다)
    - 증명(격리 사본 `/tmp/i783/m2`, 원본 무변경): 아래 패치만 넣으면 `6.roundtrip.sh` rc0(«왕복이 계약대로 돈다») · `9.single-parity.sh` 전부 통과 · `3.parity.sh igTest` 7/7
* 구현 명세:
    - TDD red 먼저: 글로벌 `theme2reference.py --adapt` 로 만든 reference 에 `lane-t --mode layout` 을 돌린 뒤 모든 마스터·레이아웃 placeholder 가 판형 안인지 단언 → 현 HEAD 에서 red 확인
    - 수정 방향(증명 패치 — 원본 프레임을 상수가 아니라 **reference 에서 읽는다**. 옛 4:3 reference 도 그대로 동작):
        ```python
        # layout 모드 fix_placeholders 호출 직전
        right = max((ph.left + ph.width for ph in prs.slide_master.placeholders), default=0)
        if right > OLD_W * 1.02:          # 이미 판형에 맞춰진 reference
            sx, sy = prs.slide_width / OLD_W, prs.slide_height / OLD_H
            OLD_H, OLD_BOX_L, OLD_BOX_W = OLD_H * sy, OLD_BOX_L * sx, OLD_BOX_W * sx
        ```
        전역 재할당보다 `fix_placeholders` 에 프레임을 인자로 넘기는 편이 낫다 — 판단은 이 저장소 몫
    - 검증: `bash z_test/ig-ppt/6.roundtrip.sh` rc0 · `9.single-parity.sh` 전부 통과 · `3.parity.sh igTest` 7/7 · 완료 시 prj3#Issue783 에 해시 통지

# 📙 일반

## Issue423: 이미지 해소 시 `X.annot.png` 짝 픽업 + 원본 강제 옵트아웃 — prj7 주석본 픽업 규약 구현 (등록: 2026-09-28)
* 목적: prj7 cg 가 캡처 주석본(`img-annotate`)을 만들어도 덱을 만드는 경로가 그 산출을 집지 않아 **안 쓰인다**. prj7 규약(사용자 확정 2026-09-24) «`X.png` 를 넣을 때 옆에 `X.annot.png` 가 있으면 그것을 쓴다» 의 구현 자리가 m2slide 이미지 해소다
* 상세:
    - 출처: prj7#Issue23 발의 «prj42 m2slide 이미지 해소 + `{raw}`» → prj7#Issue43 ② 로 등록(기획핀봇 fbot-planner-issue43). 총괄핀봇 나래 전결 `fbotev-1790570660-4058710d` · prj3#Issue756 C 등급 — 타 repo 이슈 **등록**만
    - 규약 SSOT: [cg-image-pipeline.md](~/_git/___cg/_doc_arch/cg-image-pipeline.md) ③ «규약 — 「호출」이 아니라 「짝 조회」다». 사본을 두지 않고 표기 3종만 옮긴다 — `![](shot.png)` 는 짝 `shot.annot.png` 가 있으면 치환 · `![](shot.png){raw}` 는 원본 강제 · `![](shot.annot.png)` 는 그대로
    - 🔴 m2slide 는 `img-annotate` 를 **부르지 않는다** — 이미 있는 파일을 집기만 하므로 prj7 도구에 의존이 생기지 않는다. 짝은 `--flatten` 산출 `.annot.png` 이고 기본 산출 `.annot.svg` 는 대상이 아니다
    - 실측(2026-09-28): `lib/` 의 `.annot.` 처리 0건. HTML 이미지 해소는 [markdown.js](lib/markdown.js) 두 곳 — 단독 줄 정규식(`^!\[..\]\(..\)\s*$` — `{raw}` 접미가 붙으면 매치가 깨진다)과 인라인 치환. pptx·epub·pdf 경로가 같은 해소를 타는지는 미확인
    - ⚠️ **토큰 충돌** — prj42 에서 `{raw}` 는 이미 Issue419 의 «표지 frontmatter raw HTML 옵트인(보류)» 을 가리키는 말로 쓰였다([html-builder.js](lib/html-builder.js) 17행 · [cover-meta-escape.test.js](lib/__tests__/cover-meta-escape.test.js) 9행 주석). 이미지 원본 강제와 뜻이 다르므로 구현 전에 토큰을 가를지 정한다 — prj7 규약 쪽 개명이 필요하면 prj7 에 반송
    - ⚠️ **보류 이력** — 2026-09-27 사용자 결정(prj5#Issue101 ①)은 «escape 만 — `.annot.`·`{raw}` 는 보류» 였다. 2026-09-28 결정(mq `20260928-133624-001` [H:비용] «부분 진행»)의 prj7 잔여 마감 중 이 이슈 **등록**만 진행됐다. 구현 착수는 나래의 prj42 팀장 배분을 따른다
* 구현 명세:
    - TDD red 먼저: 픽스처 `shot.png`+`shot.annot.png` 로 빌드해 ① 짝 있으면 `<img src>` 가 `shot.annot.png` ② 옵트아웃이면 `shot.png` ③ 짝 없으면 원본 그대로 — 3단언 red 확인 → 구현 → green
    - 해소 판정은 **한 함수**로 둔다 — HTML 단독·인라인·pptx·epub 가 각자 판정하면 갈린다
    - 짝 존재 판정의 기준 경로(원고 쪽 vs 빌드 `img/` 복사본)를 정한다 — `img/` 이중 복사([decisions.md](_doc_arch/decisions.md) "`img/` 이중 복사를 유지한다")라 기준이 둘이다
    - 완료 시 prj7 에 이슈 번호·커밋 해시 통지 → prj7 `tdd/playlist.md` #10 `annot-pair-pickup`(⏸️) E2E 는 prj7 이 쓴다(«조합» 검증이라 prj7 소관). prj42 는 단위 테스트까지
    - 범위 밖: `img-annotate` 호출·자동 주석 생성 · prj3 `ppt-check` `check-annot-pair`(WARN) 발의

# 📗 선택

# ✅ 완료

## Issue426: TDD 풀 회귀(prj5#Issue108) — 러너 오라클 결함 2건: PDF ⑤ 출처 판정·ego 모바일 L1 경합 (등록: 2026-09-29, 해결: 2026-09-29, commit: 24efb27) ✅
* 목적: prj5#Issue108 TDD 풀에서 재생목록 #3·#4(`1.integrity.sh`)·#9(`ego-mobile/run.sh`)가 red 였다. 둘 다 **제품 결함이 아니라 러너 판정 결함**이라 green 인 산출물을 실패로 보고했다 — «실패» 가 거짓이면 진짜 회귀도 묻힌다
* 상세:
    - #3·#4 ⑤ 표지·목차 자리: 1.design_rnd(외부 마운트, 이번에 기본 대상에 새로 들어옴) 합본 앞 3p 가 `표지 → (텍스트 없음) → (출처 불명)` 으로 판정돼 rc1. 실제 순서는 정상 — 3p 는 1챕터 표지인데 제목이 `-webkit-text-stroke` 라 Chrome 인쇄에서 윤곽선(path)으로 나가 텍스트가 0이고, 남은 줄은 내비 표시 `1 › 1 / 446` 뿐이다. `_origin()` docstring 은 «내비 줄은 자연히 빠진다» 고 했지만 실제로는 세어져 «출처 불명» 이 됐다
    - #9 L1 가로 스와이프: aTest 표지의 «다음» 이 agenda 페이지 이동인데, 스와이프 합성 `evaluate` 가 touchend 를 await 한 뒤 반환해 이동이 응답보다 먼저 커밋되면 `Inspected target navigated or closed` 로 throw → L1 미기록 + ERR. 수정 전 aTest 3회 중 2회 재현(경합)
* 구현 명세:
    - `z_test/pdf/lib/integrity.py` `_origin()`: 내비 줄(`^\d+ › \d+ /\s*\d+$`)을 본문 줄에서 빼고, 본문 줄이 0이면 내비 챕터 번호 1 → 첫 챕터로 판정
    - `z_test/ego-mobile/mobile-check.js`: touchend 를 페이지 안 `setTimeout` 으로 예약하고 evaluate 는 즉시 반환 — 이동 결과는 기존 재시도 루프가 잰다
    - TDD(red→green):
        - ⑤ red: `python3 /tmp/p42_i426_check.py`(정상 합본·표지목차 누락·목차 누락 3케이스) → 정상 합본 ok=False rc1 · `1.integrity.sh 1.design_rnd` rc1 ⇒ green: 3케이스 PASS rc0(음성 2케이스는 계속 실패 판정 — Issue402 가드 유지) · `1.integrity.sh 1.design_rnd` rc0 · `1.integrity.sh`(기본) rc0
        - L1 red: `z_test/ego-mobile/run.sh aTest` 3회 → rc1·rc1·rc0 ⇒ green: 5회 연속 rc0(L1 PASS `/p/aTest/n/1/1#0 → /p/aTest/n/a#-1`) · `run.sh aTest aTest-all` rc0(14 PASS)
* 결과(developer, 2026-09-29): 러너 2파일 수정 `24efb27`(미푸시). 제품 코드 무변경. 같은 풀에서 #7·#8·#12 red 는 m2slide 가 아니라 글로벌 ppt-deck `f75dc1af`(prj3 Issue719) 회귀로 귀속 — prj3 `Issue783` 등록(`0c00a06f`·`386edd98`)

## Issue425: Issue424 후속 — Pages main 반영(docs 커밋 6개) · aTest-all 분류 test · 이슈후보 2건 등록 (등록: 2026-09-29, 해결: 2026-09-29, commit: c0a5823 · main: 2e5a497, b8394ac, 65eb9d4, 27d9646, 4450577, 9c878fa) ✅
* 목적: 사용자 지시 2026-09-29 *«나래로 위임하여 계속 진행»* — Issue424 종결 보고의 «지시 받으면 진행» 항목 A·B 를 마무리하고 동반 발견 결함을 이슈후보로 남긴다(요청: 세션 b89831bd → 나래 인박스 `fbotreq-1790609303-77637e12`)
* 상세:
    - A. **Pages 반영** — Pages 는 `main` 서빙인데 docs(pages) 커밋 6개(`0c7456a`·`bc755c0`·`cc5121d`·`73ac9f7`·`7c1db38`·`499c73b`)가 `feat/ig-ppt-maker-integration` 에만 있다. 공개 반영(H:공개)은 위 사용자 지시로 승인됨(나래 판정 — 승인 근거: A 를 «지시 받으면 진행» 으로 보고한 직후의 지시)
    - B. `Projects.md`(로컬 등록부) **aTest-all 분류 열만 `test`** — cg-e2e 와 같은 회귀 픽스처인데 `/p/` «그 외» 에 있다
    - D. 이슈후보 등록: ① `--lint-deployment` 가 강의 본문 예시(`curl localhost`·`/Users/...`)를 잡는 오탐 ③ publishing `o` 인데 원고 미추적(n3shIntro — 앱 소개 2차 이관 때 해소 예정). ② issue-tx 서브 번호 오독은 prj3 소관 — 나래가 prj3 에 등록
    - 범위 밖: C(앱 소개 5덱 2차 prj42a 이관 — 분류 폴더·미공개 2덱 첫 공개가 사람 결정 대기) · E(LlmFlow 보류 유지 — 건드리지 않는다)
* 구현 명세:
    - A: `main` 에 6커밋 cherry-pick(충돌 시 docs 쪽 정본 유지·충돌 내역 결과에 기록) → push `main` → Pages 갱신 후 `finfra.github.io/m2slide` 갤러리 «원고 이전»·«통합됨» 카드와 `docs/m2Slide`·`m2Slide_en`·`m2Slide_MermaidExample` 리다이렉트 확인(ego-browser)
    - ⚠️ 작업트리에 다른 세션 미커밋 변경이 있다 — `main` 전환 전 worktree 를 쓰거나 전환 가능 여부를 먼저 확인. 남의 변경을 stash·checkout 으로 건드리지 않는다
    - B: 분류 열 1칸 수정 → `--sync-projects` 후 `/p/` 🧪 테스트 구역 표시 확인
    - 검증: A 리다이렉트 3종·카드 2종 200 · B `/p/` 표시 · D 이슈후보 2건 등재
    - TDD 해당 없음: 배포 반영·등록부 분류·이슈 등록 — 제품 코드 무변경
* 결과(developer, 2026-09-29):
    - B ✅ `Projects.md` aTest-all 분류 `test` 확인 — `--sync-projects` «이미 동기화 상태(변경 없음)», `/p/` 🧪 테스트(5) 구역에 aTest-all 표시(dev-server 9877 실측). Projects.md 는 gitignored 로컬 등록부라 커밋 없음
    - D ✅ ① `--lint-deployment` 오탐은 69acb96 에서 이미 이슈후보 등재 → 중복 등록 안 함(issue-g 규칙4) · ③ n3shIntro «허용목록 o · 추적 0» 신규 등재. ② 는 명세대로 prj3(나래) 소관
    - A 는 release(fbot-release-issue425) 소관 — developer 는 push 하지 않음. 원격 `main` 은 9c878fa(6커밋 cherry-pick, patch 동일)까지 반영된 상태를 확인
* 결과(release, 2026-09-29):
    - A ✅ 임시 worktree(`origin/main` detached, 작업트리 무접촉)에서 6커밋 cherry-pick — **충돌 0**. 결과 `docs/` 전체가 기능 브랜치 `378eba2` 의 `docs/` 와 diff 0 → `git push origin HEAD:main`(비강제) `eb96e75..9c878fa`. 로컬 `main` ref 는 건드리지 않음(원래 origin 보다 4커밋 뒤)
    - main 대응 해시: `0c7456a→2e5a497` · `bc755c0→b8394ac` · `cc5121d→65eb9d4` · `73ac9f7→27d9646` · `7c1db38→4450577` · `499c73b→9c878fa`
    - 게이트: Pages 워크플로 run `36444425372` success(upload-pages-artifact·deploy-pages ✓)
    - 라이브 parity(ego-browser + curl): `m2Slide/`→`m2slide_info/index.html` · `m2Slide_en/`→`m2slide_info_en/index.html` · `m2Slide_MermaidExample/`→`m2Slide_visual_component/07-diagram-gallery.html` 도착 · 갤러리 «원고 이전» 6카드·«통합됨» 카드 표시 · `m2slide-deck` 이전 링크 6개 전부 200
    - 보고: `_doc_work/report/issue425-release_report.md`

## Issue424: Projects 원고 정리 — 덱 통합 2건 + 강연 덱 prj42a(Projects_deck) 이관 (등록: 2026-09-28, 착수: 2026-09-28, 해결: 2026-09-28, commit: 960541e, 582e054, ec70efd, 0c7456a, bad0ca7, d1a62ce, 8f53425, b712415, 2afc9cd, bc755c0, cc5121d, 5ca9883, 45f2372, 73ac9f7, 7c1db38 · prj42a: 83f334d, 7c2ea87, 1ad4ee4, 44b7759, cbd27c2, de09b05) ✅
* 목적: 본체 `Projects/` 에 강연·소개·테스트 덱이 섞여 있고, 공개(publishing `o`) 강연 일부는 원고가 어느 git 에도 없다. [deck-repo.md](_doc_arch/deck-repo.md) 의 «도구와 콘텐츠 분리» 를 적용해 «m2slide 자신을 설명·검증하는 덱은 prj42, 그 밖의 콘텐츠는 prj42a» 로 가른다
* 상세:
    - 정리안(29덱 판정표·중복도 대조): `_doc_work/htm/hub_htm_20260928_220734_a_deck-migration.md`
    - **사용자 결정 2026-09-28** (AskUserQuestion): LlmFlow 이관 **보류**(publishing `x` — 이관 = 첫 공개) · 앱 소개 5덱은 **1차 후 별도** · m2Slide 통합 **진행** · MermaidExample 통합 **진행**
    - **사용자 조건 2026-09-28**: 옮기거나 합친 덱은 m2slide **`docs/`(Pages)에 이전된 링크를 표시**해야 한다 — 기존 URL 로 들어온 사람이 새 위치를 찾을 수 있어야 한다
    - 실측(2026-09-28): publishing `o` 인데 원고가 git 미추적인 덱 4개(AgenticCoding·graphify·StellarEvolution·n3shIntro) — `Projects.md` publishing `o` 15개 vs `Projects/.gitignore` 허용목록 11개. `docs/` 에는 빌드본만 있어 디스크 유실 시 원고 복구 불가
    - 제외: `1.design_rnd`(prj60 소유 링크 · 고객사 과정 진행 중) · `cg-e2e`(prj7 링크) · 회귀 픽스처 전부(igTest 는 m2slide_info 와 줄 100% 일치하지만 동결 픽스처)
    - ⚠️ prj42a 는 **공개 저장소**이고 기본 라이선스가 CC BY-NC-SA 4.0 이다 — 옮기는 덱의 현재 라이선스 배지와 맞는지 확인. push 는 사용자가 한다
* 구현 명세:
    - 공통 이관 절차(덱마다): `mv Projects/<X> Projects_deck/decks/education/<X>` → `./m2slide.sh --link Projects_deck/decks/education/<X> <X>` (폴더 이름 유지 → `/p/<X>`·`/deploy-docs <X>`·`docs/<X>/` URL 불변) → prj42 추적분은 `git rm --cached -r`(이력 보존) → `--sync-projects` 가 링크 덱을 허용목록에서 빼는지 확인 → prj42a 에 `_template/README.md` 기준 README + 커밋
    - **이전 링크 표시(docs/)**: 이관 덱은 `docs/index.html` 카드에 «원고 이전 → `github.com/Finfra/m2slide-deck/tree/main/decks/education/<X>`» 링크를, 통합 덱은 «통합됨 → <정본 덱>» 링크를 단다. 표시 로직은 `/deploy-docs` 카드 생성 절차(B-5)에 넣어 재배포 때 사라지지 않게 한다 — 손으로 고친 카드는 다음 배포에 덮인다
    - 검증: 덱마다 `./m2slide.sh <X>` rc0 · `/p/<X>` 표시 · `--lint-deployment <X>` 0 · `docs/index.html` 에 이전 링크 존재 · 링크 대상 경로가 prj42a 에 실재
    - 완료 기준: 아래 서브 이슈 전부 ✅
* 결과:
    - 서브 4건 ✅ — 강연 6덱 prj42a 이관 · m2Slide(·_en) 통합 · MermaidExample 통합 · 테스트 잔재 3 z_done. `/p/` 는 링크 8(외부) 포함 활성 23 · 비활성 17
    - 이전 링크 표시(사용자 조건)는 세 자리에 있다 — `docs/index.html` 카드(이전 6 · 통합 3) · `Projects_org.md` «m2slide-deck 으로 이전된 프로젝트» 절 · `docs/<옛 덱>/` 리다이렉트 스텁. 재배포에도 남도록 `/deploy-docs` 5-a·5-b 와 `sync-projects-md.js` 에 넣었다
    - 동반 결함 `2afc9cd`: `--lint-deployment` 가 `--link` 심링크 프로젝트를 0개 검사하고 통과시켰다(`find` 기본 -P). 앞서 이관 6덱에 보고한 «lint 위반 0» 은 이 결함 때문에 **검사 없는 통과**였고, 고친 뒤 재검사에서 AgenticCoding 본문 예시 3건이 걸렸다(원래 있던 오탐 — 이슈후보) · 기록 `_doc_work/debug_TECH.md` 2026-09-28
    - **사용자 정정 2026-09-28 (분류)**: 강연 5덱(AgenticCoding·BasicKnowledgeForAI_small·GenContentProd·LlmAndVibeCoding·graphify)은 education 이 아니라 신설 `decks/agentic-ai/`(Agentic AI), StellarEvolution 은 `decks/misc/` — prj42a `e1ceff0` · prj42 `Projects.md` 경로 열 → `--sync-projects` 심링크 재지정 · 갤러리·`Projects_org.md` 링크 갱신. 위 결과의 `decks/education/` 표기는 이 정정 전 상태다
    - **사용자 정정 2026-09-28 (cg-e2e)**: 테스트 영역 — `Projects.md` 분류를 `test` 로(로컬 등록부, `/p/` 🧪 테스트 구역)
    - push(사용자 지시 2026-09-28): 로컬 `/p/`·`/pd/` 2단계 링크 5,617개 200·오류 페이지 0 확인 후 m2slide-deck(`f5029b3..e1ceff0`) → m2slide 순
    - ⚠️ **push 하지 않았다 — 순서가 있다**: ① m2slide-deck push(갤러리·`Projects_org.md` 링크 대상) ② m2slide push. Pages 는 main 에서 서빙하고 현 브랜치는 `feat/ig-ppt-maker-integration` 이라 docs(pages) 커밋 5개(`0c7456a`·`bc755c0`·`cc5121d`·`73ac9f7`·`7c1db38`)는 main 반영이 필요하다

## Issue424_1: 강연 1차 6덱 prj42a 이관 + docs 이전 링크 (등록: 2026-09-28, 해결: 2026-09-28, commit: 960541e, 582e054, ec70efd, 0c7456a · prj42a: 83f334d, 7c2ea87, 1ad4ee4, 44b7759, cbd27c2, de09b05) ✅
* 목적: AgenticCoding·BasicKnowledgeForAI_small·GenContentProd·LlmAndVibeCoding·StellarEvolution·graphify 를 `Projects_deck/decks/education/` 으로 옮긴다 — 6덱 모두 이미 Pages 공개 중이라 노출 범위는 바뀌지 않는다
* 상세:
    - prj42 추적 해제 대상은 3덱(BasicKnowledgeForAI_small 50·GenContentProd 204·LlmAndVibeCoding 62 파일). 나머지 3덱은 원래 미추적 — prj42a 커밋이 첫 버전 관리다
    - AgenticCoding 은 이미지 71장 약 40MB — prj42a push 용량 확인
    - `Projects/_ppt/` 강연 원본 pptx·pdf 와 `z_done/` 강연 구버전은 옮기지 않는다(공개 불필요)
    - 6덱 모두 `docs/` 발행본과 `docs/index.html` 카드가 있다(LEC 4 · INFO graphify · ETC StellarEvolution) — 이전 링크는 이 카드들에 단다
* 구현 명세: Issue424 공통 절차 · 덱 단위로 커밋해 한 덱이 막혀도 나머지가 진행되게 한다
* 결과:
    - 방식: `mv Projects/<X> Projects_deck/decks/education/<X>` → `--link` 심링크. `/p/` 목록·`Projects.md` 등록부(경로 열, 소유 prj `42a`)·`/deploy-docs` 가 그대로 동작한다. `--sync-projects` 는 경로 있는 행을 허용목록에서 빼므로(`publishedRows` 의 `!r[2]`) 3덱이 자동으로 추적 제외됐다
    - prj42a: 덱 단위 커밋 6 — `83f334d` StellarEvolution · `7c2ea87` graphify · `1ad4ee4` BasicKnowledgeForAI_small · `44b7759` LlmAndVibeCoding · `cbd27c2` GenContentProd · `de09b05` AgenticCoding. 덱마다 `_template` 형식 README(저자는 frontmatter `instructor_name` 이 있는 4덱만 옮김 — StellarEvolution·graphify 는 «원고에 미기재»)
    - prj42: `960541e` `Projects_org.md` 에 «m2slide-deck 으로 이전된 프로젝트» 절 자동 생성(README 가 링크하는 공개 목록 — 이전 링크 표시 조건의 두 번째 자리) · `582e054` 3덱 추적 해제 · `ec70efd` `/deploy-docs` 5-a(이전 덱 카드 규약) · `0c7456a` `docs/index.html` 6카드에 «📦 원고 이전 → m2slide-deck» 링크
    - 검증: 6덱 이름 빌드 rc0 · placeholder·`undefined` 0 · `--lint-deployment` 위반 0 · `/p/<X>` 표시 · `sync-projects-md.test.js` 13/13(신규 3, red 확인) · ego-browser `file://` 갤러리 `card-source` 6·중첩 `<a>` 0·카드 간격 0 — 캡처 `_doc_work/capture/issue424/docs-gallery-lec.png`
    - ⚠️ push 하지 않았다. **순서가 있다** — m2slide-deck 을 먼저 push 해야 갤러리 링크가 404 가 아니다. `0c7456a`(docs)는 현 브랜치가 `feat/ig-ppt-maker-integration` 이라 Pages(main) 반영에 cherry-pick 이 필요하다
    - 부수: `Projects/.gitignore` 재생성으로 `n3shIntro`(publishing `o`)가 허용목록에 들어갔다 — 원고는 커밋하지 않아 untracked 로 보인다. 앱 소개 2차 이관 때 결정
    - 발견: `issue-tx.py` 가 `Issue424_1` 을 `4241` 로 읽어 서브 블록을 스테이징하지 못한다 — Issue.md 커밋은 HEAD blob 에 같은 변환을 적용해 임시 인덱스로 우회했다(글로벌 SCAR 라 여기서 고치지 않음)

## Issue424_2: m2Slide(·_en) → m2slide_info(·_en) 통합 (등록: 2026-09-28, 해결: 2026-09-28, commit: bad0ca7, d1a62ce, 8f53425, b712415, bc755c0, cc5121d) ✅
* 목적: m2Slide(7장: what·why·30초 시작)는 m2slide_info(34장: what·why·where·강점·마무리)의 축약판이다. 소개 덱을 하나로 모은다
* 상세:
    - m2Slide 고유분은 «한 번 쓰고 네 가지로 낸다» 문장과 빌드 한 줄 정도 → m2slide_info 01장에 흡수. 영문판도 같다
    - `README.md`·`README_kr.md` 첫 소개 링크가 `m2Slide(_en)` 을 가리킨다 → info 로 교체
    - `docs/m2Slide(_en)/` 에는 리다이렉트 한 장을 남기고, 카드에는 «통합됨 → m2slide_info» 를 표시한다
    - `lib/dev-server/test_server.py` 가 `'m2Slide'` 를 경로 변환 문자열로 쓴다 — 폴더 이동 후에도 통과하는지 확인
* 구현 명세: 원고 흡수 → `release_date` 갱신 → 빌드·HTML 검증 → m2Slide(·_en) 는 `z_done/<Name>_v<VERSION>` 으로 이동(project-version-rules)
* 결과:
    - 흡수(`bad0ca7`): 01장 «한 번 쓰고, 네 가지로 낸다» 산출물 4종 표 · 빌드 예시 `--epub` 줄 · 03장 «발표가 편해진다» · 05장 m2Slide 링크 2곳 → 시각 구성요소 쇼케이스·문의. 한·영 동일. `release_date` 는 이미 2026-09-28
    - `d1a62ce` dev-server 홈 예시 m2Slide → m2slide_info(test_server 74 OK) · `8f53425` 추적 해제(`z_done/m2Slide_v1.0`·`m2Slide_en_v1.0`) · `b712415` README 링크 제거 + `/deploy-docs` 5-b(통합 덱 규약)
    - Pages: `bc755c0` m2slide_info(·_en) 재발행(HEAD 임시 worktree — 타 세션 미커밋 `lib/generate-slides.js` 배제) · `cc5121d` `docs/m2Slide(·_en)/` 파일별 리다이렉트 스텁 + 갤러리 «통합됨» 카드
    - 검증: 빌드 rc0 · 흡수 슬라이드 산출 확인 · m2Slide 링크 0 · ego `file://` 리다이렉트 3건 도착(깊은 링크 포함)

## Issue424_3: m2Slide_MermaidExample → m2Slide_visual_component 챕터 통합 (등록: 2026-09-28, 해결: 2026-09-28, commit: 5ca9883, 45f2372, 73ac9f7, 7c1db38) ✅
* 목적: Mermaid 도 시각 구성요소의 하나다 — 쇼케이스를 한 덱으로 모은다
* 상세:
    - MermaidExample 은 single mode 41장 → visual_component(chapter mode 96장)에 챕터 1개로 넣는다
    - visual_component 는 회귀 덱이기도 하다([transform.yml](data/m2slide2ppt/transform.yml) 참조) — 챕터를 더하면 회귀 기준이 바뀌므로 관련 러너를 다시 돌려 기준을 재설정한다
    - `docs/m2Slide_MermaidExample/` 은 리다이렉트 + 카드 «통합됨 → m2Slide_visual_component» 표시
* 구현 명세: 챕터 추가 → AGENDA 갱신 → 빌드·HTML 검증 → 회귀 러너 재측정 → MermaidExample 은 z_done 이동
* 결과:
    - ⚠️ 명세의 «41장을 챕터 1개로» 와 다르게 **2장에 없는 종류 23장만** 옮겼다 — 2장이 이미 Mermaid 11종·Kroki 4종을 갖고 있어 같은 종류를 두 벌 두면 쇼케이스가 중복된다. 겹친 14종은 2장 예시가 정본, 원본 전체는 `z_done/m2Slide_MermaidExample_v1.0` 에 보관
    - `5ca9883` 7장 «다이어그램 확장 갤러리»(Mermaid 확장 12 · Kroki blockdiag 계열 4 · Vega · PlantUML 4 · 정리) + AGENDA `release_date` 2026-09-19 → 2026-09-28 · `45f2372` 추적 해제
    - Pages: `73ac9f7` visual_component 재발행(7장 + kroki SVG 캐시 9) · `7c1db38` `docs/m2Slide_MermaidExample/` → 7장 리다이렉트 + «통합됨» 카드
    - 검증: ego `file://` 7장 25장 전 장 순회 mermaid 13/13 · kroki 9/9 · 렌더 오류 0. 명세의 «회귀 러너 재측정» 은 대상이 없었다 — visual_component 를 읽는 러너는 없고 참조 2곳(`transform.yml`·`htmlart_dispatch.client.js`)은 주석 속 실측 사례다

## Issue424_4: 참조 없는 테스트 잔재 z_done 이동 (등록: 2026-09-28, 해결: 2026-09-28, commit: 없음 — 미추적 폴더 이동) ✅
* 목적: `/p/` 목록에서 러너·코드가 쓰지 않는 덱을 걷어낸다
* 상세:
    - MediaBackendTest(참조 0) · aTest.bak.20260909(참조 0, 백업본) · aTest_rt(`z_test/pdf/lib/integrity.py` 주석 속 실측 사례 1곳뿐)
    - 삭제가 아니라 z_done 이동 — 되돌릴 수 있게 둔다
* 구현 명세: 이동 전 `grep -rF` 로 참조 0 재확인 → z_done 이동 → `--sync-projects` → `/p/` 목록에서 사라졌는지 확인
* 결과: `z_done/MediaBackendTest` · `z_done/aTest.bak.20260909_v2.0`(VERSION 2.0 — project-version-rules) · `z_done/aTest_rt`. 3개 모두 git 미추적이라 저장소 변경은 없다. `--sync-projects` 로 비활성 표 이동 · `/p/` 목록 0건 확인. `aTest_rt` 는 `z_test/pdf/lib/integrity.py` 주석과 `data/_proposals/aTest_rt-2026-09-09.md` 에 실측 사례로 남아 있을 뿐 실행 경로 참조가 아니다

## Issue422: 발행 덱 7개 표지 subtitle 의 의도적 HTML 정리 — Issue419 escape 후속 (등록: 2026-09-28, 해결: 2026-09-28, commit: 1d839eb, 6a652d8, 3f656fd) ✅
* 목적: Issue419(표지 frontmatter HTML escape, 사용자 결정 «escape 만») 이후 subtitle 의 의도적 HTML(`<strong>`·`<small>`·`&nbsp;`)이 재빌드 시 글자로 보인다
* report: `_doc_work/report/deck-republish_report.md`
* 상세:
    - 출처: prj3 mq `20260927-203951-001` — prj3#Issue756 C 등급 결정: 선택지 ②(원고 subtitle 평문 정리). ①(raw 옵트인)은 사용자 결정 «escape 만» 과 어긋나고 ③(현상 유지)은 재빌드를 막는다
    - 대상 `Projects/`: fPmIntro·fPmIntro_en·fSnippetCliIntro·fWarrangeCliIntro·igTest·m2slide_info·m2slide_info_en
    - ⚠️ 앞 4개는 `docs/` 발행본 — **재발행(push)은 H 등급(공개)** 이라 사용자 결정 묶음으로 따로 올라감
    - **사용자 결정 2026-09-28: 정리 후 재발행** (prj3 세션 05cbbead AskUserQuestion · mq `20260928-120443-001` · 위임 지시 `_doc_work/delegation_2026.09.28_deck-republish.md`). 원격 push 는 prj3 세션이 한다
    - ⚠️ **범위 정정(실측 2026-09-28)**: 위 «앞 4개» 는 틀렸다. `docs/` 에 실제로 있는 것은 `fPmIntro`·`fPmIntro_en`·`m2slide_info`·`m2slide_info_en` 이고, `fSnippetCliIntro`·`fWarrangeCliIntro` 는 `docs/`·`docs/index.html` 카드·`Projects.md` publishing 어디에도 없다(미발행 — git 미추적). 재발행은 **실제 발행본 4덱**으로 하고, 두 CLI 덱을 `docs/` 에 새로 싣는 것은 신규 공개라 이번 결정 밖이다
* 구현 명세:
    - 7개 원고 subtitle 을 markdown 강조·평문으로 치환 → 재빌드 → escape 경고 0 확인. 로컬 커밋까지, 발행 push 는 사용자 결정 후
    - 치환 형태는 **평문**이다 — 표지 `{{subtitle}}` 은 escape 만 하고 인라인 markdown 을 렌더하지 않으므로 `**강조**` 는 별표가 글자로 보인다. `<strong>`·`<small>` 은 태그만 걷고 `&nbsp;·&nbsp;` 은 ` · ` 로 바꾼다(문구 불변)
    - 발행본 재빌드는 HEAD 기준 **임시 worktree** 에서 한다 — 작업 트리의 타 세션 미커밋 `lib/generate-slides.js` 변경이 `docs/` 산출물에 섞이지 않게
* 결과:
    - `1d839eb` 원고 4개(추적분) subtitle 평문 + `release_date` 갱신 — 미추적 3원고(fSnippetCliIntro·fWarrangeCliIntro·igTest)는 로컬 치환만
    - `6a652d8` `docs/fPmIntro`·`docs/fPmIntro_en` 재발행본(26 파일) · `3f656fd` `docs/m2slide_info`·`docs/m2slide_info_en`(16 파일) — 덱 묶음별로 나눠 push 범위를 prj3 가 고를 수 있게 했다
    - 검증: 7덱 빌드 rc0 · **escape 경고 0** · 배포 lint 위반 0 · placeholder 0 · `docs/index.html` 카드 불변 · ego-browser `file://` 표지 4장 subtitle 자식 요소 0(태그 글자 노출 없음) — 캡처 `_doc_work/capture/issue422/`
    - origin/main(`7b0e819`) 위 `git apply --check` 3건 OK — Pages 는 docs 커밋만 main 에 cherry-pick 하면 된다
    - ⚠️ 재발행은 subtitle 만 바꾸지 않는다 — 현 브랜치 렌더 전반이 함께 실린다(전역 글꼴 Pretendard→Nanum Gothic Coding `70e29d3` 등, docs +17570/−2486). 원격 push 는 하지 않았다(prj3 몫)

## Issue421: 테마 라이선스 v1.0 → v1.2 재동기 + THIRD-PARTY-NOTICES (prj6#Issue17 적대적 검토 반영) (등록: 2026-09-27, 해결: 2026-09-28, commit: f78906c) ✅
* 목적: Issue420 의 `theme/LICENSE.md` 는 v1.0 이다. 적대적 검토에서 ① 유료 산출물에 'Powered by finfra.kr' 를 강제하면서 상표 정책은 유료 사용을 금지하는 모순 ② PDF·PPTX 에 CSS 가 복제되지 않아 저작권 조건이 닿지 않을 수 있는 문제가 나왔다. v1.2 는 한정 상표 허락과 계약 약정 병렬로 둘 다 해소한다
* depends: prj6#Issue17
* 상세:
    - `theme/LICENSE.md` → THEME-LICENSE v1.2 전문(§2 계약 약정 · §3 표기용 한정 상표 허락 · `{{EFFECTIVE_DATE}}`=이번 커밋일). 표기 문구·첫/끝 장 위치는 현행 그대로
    - `theme/THIRD-PARTY-NOTICES.md` 신설 — 실측(2026-09-27) 외부 폰트·제3자 이미지 없음 → `None` 한 줄 + 마스코트(finfraPuffer·Cat·Butterfly)가 Finfra 원작임을 1줄
    - `TRADEMARK.md`·`COMMERCIAL.md`·`NOTICE` → v1.2 (m2slide 는 배포본 약관이 없으므로 COMMERCIAL 의 DISTRIBUTION-TERMS 행과 NOTICE 의 Official Build Components 구절은 뺀다)
    - ⚠️ 다른 세션이 이 repo 에서 작업 중(작업트리 dirty 120) — 자기 파일만 `git add`, `-A` 금지
    - 근거: 템플릿 `/Users/nowage/_git/___architect/data/template/license/`(v1.2, prj6 `3195f25`) · 검토 처분표 `/Users/nowage/_git/___architect/_doc_work/report/license-hook-review_issue17_report.md` §반영 결과 · 정본 `/Users/nowage/_git/___architect/_doc_arch/license-profiles.md` §3-2·§5 · §3-3
    - **한국어 테마 라이선스 추가** (prj6 템플릿 `/Users/nowage/_git/___architect/data/template/license/THEME-LICENSE_ko.md`): `theme/LICENSE_ko.md` 를 영문 `theme/LICENSE.md` v1.2 와 **같은 커밋**으로 — 테마 §6 이 한국 거주 개인에게 동등 효력을 약속한다. `.gitignore` 의 `!/theme/LICENSE.md` 옆에 `!/theme/LICENSE_ko.md` 도 추가해야 추적된다
* 구현 명세:
    - 검증: `theme/LICENSE.md` `Version 1.2` · `./m2slide.sh --lint-license` 통과 · 빌드 산출물 첫/끝 장 뱃지 그대로 · `grep -c '{{'` 0
    - 금지: `git push` · npm publish · `Finfra/homebrew-tap` 수정 · 기존 태그 변경 · 템플릿 frontmatter·`📄 템플릿` 블록 복사
    - `Issue.md` 는 `python3 ~/.claude/sh/issue-tx.py --file Issue.md stage --issues <N>` / `check` 경유 · 커밋 후 ✅ 이동 + hash 기록
* 결과 (2026-09-28, fbot-lead-m2slide 직접 수행 — 나래 경유 위임):
    - `theme/LICENSE.md` v1.2(발효 2026-09-28) · `theme/LICENSE_ko.md` 신설 — 템플릿 본문과 diff 0(frontmatter·`📄 템플릿` 블록만 제거), 조항 번호 §1~§6 1:1
    - `theme/THIRD-PARTY-NOTICES.md` 신설(None + 마스코트 원작 1줄) · `.gitignore` 에 `!/theme/LICENSE_ko.md`·`!/theme/THIRD-PARTY-NOTICES.md` — 후자도 `/theme/*` 에 걸려 화이트리스트가 필요했다
    - `TRADEMARK.md` v1.2 — `{{MARKS}}`=`"m2slide"`. 배포본 약관이 없어 «unmodified official builds» 대신 «unmodified copies» 유지, Notes 의 DISTRIBUTION-TERMS 언급 제거
    - `COMMERCIAL.md` 테마 행 §3 → §4 · `NOTICE` 는 «Except for the theme assets under theme/» 로 예외 대상을 테마로 바꿔 Apache 전체 선언을 피했다
    - README(en·kr) 테마 행 한국어본 링크 · CHANGELOG `[Unreleased]` 1줄 · (로컬) `_doc_arch/license-attribution.md` v1.2 주석
    - 검증: `--lint-license` 통과(3 테마 6.77~6.90:1) · 자리표 `{{` 0 · `m2Slide_single_mode` 임시 사본 빌드 rc0 · 뱃지 첫(0)/끝(36) 장 유지(Issue420 과 동일)
    - 남은 것: `box.png`·`hr.png`(붓 질감 장식 프레임·구분선)의 원작 여부는 따로 확인하지 않았다 — prj6 실측 «제3자 이미지 없음» 을 따랐다 (검증 필요). push 미실행(금지 조건)

## Issue418: m2slide pptx 파리티·빌드 게이트·깨진 링크 (등록: 2026-09-27, 해결: 2026-09-27, commit: `384896f`, `f6e911a`, `2f2100a`, `5f7f002`) ✅
* 목적: 같은 원고에서 HTML 16장이 pptx 28장으로 불어나고 도해가 평문이 됐는데 빌드는 rc=0 으로 끝났다 (prj7#Issue36 점검)
* 상세:
    - `lib/pptx/build-pptx.sh`: 최종 check-conform 이 `tail -1 || true` — FAIL 이면 항목 출력 + exit 2
    - `lib/pptx/build-source.py`: 챕터 1장이 3장으로 분할, 덱 목차 장 끼어듦, 표지 제목이 폴더명, 부제 `<strong>` 앞 절단
    - `lib/pptx/lane-b.py`: 프로세스 도해·카드 4개·제목만 카드가 평문 불릿으로 강등 — 도형 변환 대상 추가 또는 강등 장 로그
    - `lib/generate-slides.js`: 챕터 진입 장 H1 유실(m2slide_info 예제에서도 재현)
    - `lib/htmlart/` annotate: 한글 여러 줄에서 강조선 미표시·연결선 이탈
    - `m2slide.sh --pdf`: 본문 제외·Chrome 미지정 · 외부 경로 빌드 후 dev-server URL 404
    - 링크 깨짐: `.claude/rules/md-m2slide-rules.md` 등 `~/.claude/rules/md-slide-rules.md`(→ `_doc_arch/rules-ondemand/`) · `opus-4-7-execution-rules`(→ `opus-4-8`) 약 15곳 · README pptx 사용법 보강
* 구현 명세:
    - 근거: prj7 `_doc_work/report/output-quality-2026.09.27/m2slide.md`
    - 위임: pm-do 세션(팀장핀봇 `fbot-lead-m2slide`, `solo`) — 2026-09-27 23:00 OS 재부팅으로 중단 후 재개. P3 는 서브 에이전트가 원인 규명·수정, 팀장이 diff·red 재현으로 검증
* 결과:
    - 원 문제 덱 사본 재빌드: pptx **28장 → 17장**(HTML 16 + agenda) · 최종 FAIL **1 → 0** · 표지 제목 = frontmatter · 평문 이월 3건이 장 번호·사유로 로그에 남음
    - P4 게이트: 최종 check-conform FAIL → `build-pptx.sh` rc 2(항목 전문 출력) → `m2slide.sh` rc 1. `--pptx-no-verify` 만 통과
    - P5·P6b: 모드 판정·원고 선택을 HTML 빌더와 통일(입력 폴더 AGENDA.md) · single 메타 = 슬라이드 소스 frontmatter · 모든 H1 진입부 정규화 · 표지 글자를 요소 깊이로 추출(태그 절단·`&lt;` 누출 해소)
    - 캔버스 이탈의 실제 원인: lane T 좌표 정책이 **3:2(1920×1280) 실측**인데 16:9 에 그대로 적용 — ego 로 두 판형 앵커를 재어 하단 고정 이동으로 보정, pie 범례는 HTML `renderPie` 의 `max(56, 520/n)` 로 재계산
    - P6: lane B 대상 추가 대신 **평문 이월 로그**(장 번호·제목·사유 «블록 뒤에 본문이 더 있다»)로 닫음. 네이티브 차트(pie)는 이월 집계에서 제외
    - P2: 원인은 `generate-slides.js` 가 아니라 `slide-parser.js resolveSlideTitle` — chapter layout 에서도 H1 을 버렸다. pptx(`entry_slide`)·역변환(`pptx2source` h1_attach)을 함께 맞춤
    - P3: 한글·3줄과 무관 — 로드 시 **전환 중 3D transform 상태의 비현재 장**을 한 번 재고 끝나던 것. 순차 이동 진입에서만 재현(직접 로드는 옛 코드도 통과). `offset*` 좌표 + ResizeObserver 재그리기
    - P7: single 판정 통일(`markdown/덱.md` 단독 덱의 본문 index.html 누락 해소) · puppeteer 캐시 부재 시 시스템 Chrome 자동 지정
    - P8: legacy 안내 URL 은 **저장소 안 프로젝트도 404** 였다(Issue236.11 차단 경로) → `/p/<이름>/n/c`, 저장소 밖은 `file://`
    - 링크: 추적 파일 11곳 + 정책 yml 3종(백업 후 단독 커밋). 상대 링크 5단계는 원래부터 `~/_git/__all/.claude` 로 풀려 끊겨 있었다 — 깊이 재계산. README en·kr pptx 절 교체
    - TDD: red — `9.single-parity.sh` 9단언 전부 ❌ · `chapter-title.test.js` 1 fail · `1.annotate-nav.sh` HEAD 판 over 6 → green — 9/9 · 3/3 · 0. 회귀: `node --test` 204/204 · 3.parity igTest·m2Slide_chapter_mode 7/7 · 4.laneb 6/6 · 5.lanem · 6.roundtrip aTest·igTest·aTest-all 계약대로 · 7.coverage 미측정 0 · 8.assembly FAIL 0 · policy-fixture · lint-data
    - 재생목록 #12 `single-mode-pptx-parity`
    - ⚠️ 영향 범위(P2): `#layout-chapter` + H1 + H2 인 챕터 장 32개(8개 프로젝트 — GenContentProd·aTest-all·cg-e2e·fSnippetCliIntro·fWarrangeCliIntro·igTest·m2slide_info·m2slide_info_en)가 **재빌드하면** 큰 제목이 H2 부제 → H1 으로 바뀐다. `docs/` 발행본 재빌드·재배포는 하지 않았다
    - 후속 후보(이 이슈 범위 밖 — 이슈화는 우선순위 판단 후):
        - lane B — 블록 **뒤에 본문이 더 있는** cards·process 도 도형으로(지금은 평문 이월 + 로그). prj7 덱 7개 블록 중 3개가 이 형태였다 — «실측 8건 전부 블록이 장 끝» 전제가 깨졌다
        - single mode 에서 `# H1` + `## H2` + 본문이 **한 장**이면 autoToc 가 그 장을 Cards Page 로 바꾼 뒤 `cards_placeholder: false` 로 **경고 없이** 지운다 — HTML·pptx 양쪽 손실 — P3 조사 중 발견
        - pptx 챕터 진입 장 꼴 — `Title and Content` 로 나와 제목이 위에 붙고 chapter 마스코트가 본문과 겹친다(conform WARN). HTML 처럼 가운데 큰 제목 + 부제로
        - annotate 다줄 target — 2번째 줄 이하 over 선이 줄 사이에 들어가 윗줄 밑줄로 읽히고 곡선이 본문을 가로지른다(설계 한계, Issue364 높이 예산과 함께)
    - 범위 밖(타 prj 소유 — 수정 안 함): prj3 `data/visual-gen/rules.yml`·`registry.yml`(D1·D2) · prj7 `generators/_slide/m2slide/card.md`·`tdd/_slide/m2slide/test_m2slide.py`(D4) · 미추적 `.agents/`·`.codex/`·`AGENTS.md` 의 옛 경로(생성 도구 산출물)

## Issue420: 라이선스 프로파일 A 적용 — CC BY 4.0 이중 → 코드 Apache-2.0 + theme/ Finfra Theme License(훅 ①③), 뱃지 코드 유지 (등록: 2026-09-27, 해결: 2026-09-27, commit: `c153b9b`) ✅
* 목적: CC 는 소프트웨어 비권장이고 위치 지정 표기는 CC BY 조항과 긴장한다. 표기 의무를 테마 자산 저작권으로 옮기면 사용자 원고를 2차저작물로 주장할 필요가 없어 깨끗하다. 뱃지 동작은 그대로다
* 상세:
    - 루트 `LICENSE.md`(CC BY 이중) 삭제 → `LICENSE`(Apache-2.0 원문) · `NOTICE` · `TRADEMARK.md` · `COMMERCIAL.md`(배포본 약관 없음 — `{{N}}` 행 삭제, 테마 행만)
    - `theme/LICENSE.md` = THEME-LICENSE 템플릿. 문구 "Powered by finfra.kr, Made by m2slide"·첫/끝 장 위치는 현행(`LICENSE.md:10`·`lib/config.js`)과 동일 유지
    - 뱃지 자동 삽입·`license_attribution: false` 경고 코드 유지. 경고 문구 근거만 "CC BY 4.0 위반 소지" → "테마 라이선스 조건 이탈"(코드 + `_doc_arch/license-attribution.md` 동시 — 2원 구조)
    - README(en·kr) 라이선스 절: 코드 Apache-2.0 / `theme/` Finfra Theme License 표 · CHANGELOG 항목 · "<0.8.0 MIT, 0.8.0~이번 커밋 이전 CC BY 4.0 이중" 주석
    - ⚠️ 다른 세션이 이 repo 에서 작업 중(작업트리 dirty) — 자기 파일만 `git add`, `-A` 금지
    - 정본 `/Users/nowage/_git/___architect/_doc_arch/license-profiles.md` §4 row 42 · 템플릿 `/Users/nowage/_git/___architect/data/template/license/README.md`(자리표 값 표 포함 — `{{N}}`=250 · `{{LICENSOR}}`=`Finfra Co., Ltd. (https://finfra.kr)` · `{{CONTACT}}`=finfra@gmail.com)
* 구현 명세:
    - 검증: 파일 5종 + `theme/LICENSE.md` 존재 · `./m2slide.sh --lint-license` 통과 · 기존 테스트 green · 빌드 산출물 첫/끝 장 뱃지 그대로
    - 금지: `git push`(사용자가 push) · npm publish · 기존 릴리스 태그 변경
    - `Issue.md` 는 `python3 ~/.claude/sh/issue-tx.py --file Issue.md stage --issues <N>` / `check` 경유 · 커밋 후 ✅ 이동 + hash 기록
* 결과:
    - 신설: [LICENSE](LICENSE)(Apache-2.0 원문 — fCapture·fSnippet `_public` 과 md5 동일) · [NOTICE](NOTICE) · [TRADEMARK.md](TRADEMARK.md) · [COMMERCIAL.md](COMMERCIAL.md)(테마·상표 행만) · [theme/LICENSE.md](theme/LICENSE.md). `{{YEAR}}`=2025(GitHub repo 생성 2025-11-16)
    - ⚠️ `theme/LICENSE.md` 가 `.gitignore` `/theme/*` 에 막혀 있었다 → `!/theme/LICENSE.md` 화이트리스트 추가
    - 템플릿 조정: 배포본 약관이 없는 repo 라 TRADEMARK·COMMERCIAL 의 `official builds`·`DISTRIBUTION-TERMS.md` 참조를 테마 라이선스 참조로 교체. THEME-LICENSE 의 `THIRD-PARTY-NOTICES.md`(부재) 는 «`lib/vendor/`·CDN 자산은 각자 라이선스» 로 교체 — 테마 폴더에 제3자 폰트·이미지 없음(실측)
    - 경고 문구 교체: `lib/config.js`·`server.py`(설정 GUI help)·`_config.org.yml`·주석 2곳 + `_doc_arch/license-attribution.md`(로컬 전용, gitignored). `generate-slides.js` 는 다른 세션 미커밋분이 있어 **내 hunk 만** `git apply --cached` 로 스테이징
    - 검증: `--lint-license` 통과 · `node --test` 201/201 · `test_server` 74 OK · `m2Slide_single_mode` 뱃지 첫(0)/끝(36) 장·문구 무변경 · `license_attribution: false` 새 경고 출력 확인
    - TDD 예외: 동작 변경 없음(경고 문자열·라이선스 문서 교체) — 기존 스위트 무회귀로 갈음

## Issue419: 표지(`_cover`) frontmatter 값 HTML 이스케이프 — `<b>`·`&` 가 태그·엔티티로 새어 나옴 (등록: 2026-09-27, 해결: 2026-09-27, commit: `d3407e3`) ✅
* 목적: prj41 videoMaker tdd #05 `title-card-frontmatter-fields` 가 red — m2slide 가 title/subtitle/instructor_name 등 frontmatter 값을 layout 변수(`{{title}}` 등)로 치환할 때 escape 하지 않는다. 사용자 결정(prj5#Issue101 ①, 2026-09-27 20:08): **escape 만** 한다. `.annot.`·`{raw}` 옵트인은 보류
* 상세:
    - 원인 지점 3곳 — 모두 [html-builder.js](lib/html-builder.js): ① single 표지 슬라이드 생성(`coverTitle` → `slide.title`) ② `_cfg.projectMeta` 를 layout 변수로 spread 하는 자리(`_cover`·`_toc`·`_cards`·`_agenda`) ③ chapter `generateCoverHTML` 의 `coverTitle`·fallback `<h1>`
    - 위임: pm-do 세션(팀장핀봇 `fbot-lead-m2slide`, `solo`). prj41 파일은 수정하지 않고 `~/_git/__all/videoMaker/tdd/run.sh 05` 로 확인만
* 구현 명세:
    - TDD: 재현 테스트 [cover-meta-escape.test.js](lib/__tests__/cover-meta-escape.test.js)(single·chapter·경고) red 확인 → [utils.js](lib/utils.js) `escapeHtmlAttr` 로 frontmatter 문자열 값 escape → green → prj41 `tdd/run.sh 05` green
    - 재생목록: [playlist.md](tdd/playlist.md) #11 `cover-meta-html-escape`
    - TDD: red — `cover-meta-escape.test.js` 3 fail(`single: title 이 이스케이프되지 않음`·`chapter: …`·`경고 없음`) → green — 3 pass · 전체 `node --test lib/__tests__/*.test.js` 201 pass · prj41 `tdd/run.sh 05` ALL GREEN(baseline 은 `cover-title">최소 <b>제목</b> & 테스트` 로 ❌)
    - ⚠️ 영향 범위(실측 2026-09-27): frontmatter `subtitle` 에 **의도적 HTML**(`<strong>`·`<small>`·`&nbsp;`)을 쓴 프로젝트 7개 — `fPmIntro`·`fPmIntro_en`·`fSnippetCliIntro`·`fWarrangeCliIntro`·`igTest`·`m2slide_info`·`m2slide_info_en`(앞 4개는 `docs/` 발행). escape 후 **재빌드하면 태그가 글자로 보인다**. 빌드 로그 경고로 드러내고, raw 옵트인(보류)이 결정될 때까지 원고는 건드리지 않는다(콘텐츠 불가침)

## Issue417: TDD 재생목록 전 목표 green — prj5#Issue100 웨이브 (등록: 2026-09-27, 해결: 2026-09-27, commit: `ac4e933`) ✅
* 목적: prj5 Issue100(TDD 대상 전 prj 재생목록 완성)의 prj42 몫 — [tdd/playlist.md](tdd/playlist.md) 10개 목표를 실제로 돌려 전량 ✅
* 상세:
    - 착수 시 9/10 ✅ 로 적혀 있었으나 **실행하니 #1·#2 가 red** 였다 — 둘 다 제품 회귀가 아니라 테스트·스캐너 쪽 전제가 낡은 것
    - #1 통합 테스트 3건: 픽스처 drift(`aTest`=single·`m2Slide`=chapter 로 바뀜) → 모드가 이름에 박힌 `m2Slide_single_mode`·`m2Slide_chapter_mode` 로 고정 + `--no-serve`
    - #2 위생 스캐너: 원고 선택이 빌더와 갈림(`markdown/*.md + *.md`) → chapter 루트 설계 문서(1.design_rnd `DESIGN.md`·`AUTHORING.md`) 9건 오검출. 빌더 규칙(markdown/ 우선) 단일 헬퍼로 통일, 재현 픽스처 선행
    - #6 신설: `1.integrity` ⑤ — chapter 합본 앞 3p 출처를 원고로 되짚음(쪽 수만으로는 제자리를 모른다). 변이 PDF 3종 red · 실 PDF green
* 검증(jm4, 격리 사본·읽기 전용): unit+integration 198/198 · policy-fixture 통과 · 1.integrity ①~⑤(chapter 33p·4:3 single 27p) · 3.nondeterminism --mechanism 조기 판정 0 · 3.parity 7/7 · 6.roundtrip 계약대로 · ego-mobile M1~M6·L1 PASS · sync-projects+test_server 74 OK
* 환경 발견: `~/.cache/puppeteer` 비어 `--pdf` 가 Chrome 146 을 못 찾음 → `PUPPETEER_EXECUTABLE_PATH` 로 시스템 Chrome 지정(debug_TECH 2026-09-27)

## Issue416: Projects.md 를 `/p/` 프로젝트 목록의 유일한 등록부로 — `경로` 열로 외부 마운트 표기·복원 (등록: 2026-09-26, 해결: 2026-09-26, commit: 39eb61a) ✅
* 목적: `/p/` 카드 한 장의 출처가 다섯 군데(폴더 목록·심링크·덱 루트·Projects.md·___pm 레지스트리)로 흩어져 *"정본이 Projects.md 아니었나"* 라는 직관과 실제 동작이 어긋난다. 외부 프로젝트 여부·경로가 파일시스템 심링크에만 있어 표에서 보이지 않고, 다른 머신에서는 마운트가 복원되지 않는다
* 상세:
    - `Projects.md` 활성·비활성 표에 `경로` 열 추가 — 비면 로컬, 채우면 외부. 외부 여부 판정의 단일 지점
    - `--sync-projects`: 경로 있는 행의 심링크를 생성·재지정(실디렉토리는 건드리지 않음), 표에 없는 기존 심링크는 경로를 시드해 행으로 흡수, 경로가 없으면(볼륨 미마운트 등) 경고만 하고 행 유지
    - `--link`/`--unlink`: 표 편집 + sync 로 축소 (unlink 는 심링크일 때만, 행은 비활성으로)
    - dev-server `/p/`: 표 열을 이름으로 파싱, 표에 없는 폴더는 `⚠️ 미등재` 칸에 모음, 마운트 배지를 표 경로 우선으로 판정
    - 덱(`Projects_deck`) 흡수는 범위 밖(2단계)
* 구현 명세:
    - `lib/sync-projects-md.js` — 헤더 이름 기반 열 매핑, `M2SLIDE_ROOT` env 로 루트 주입(테스트용), `--link <path> <tok>`·`--unlink <tok>` 서브모드
    - `lib/dev-server/server.py` — `_read_projects_md_active_rows` 헤더 기반, `_serve_project_list` 미등재 칸, `_mount_info` 표 경로 우선
    - 검증(TDD): `node --test lib/__tests__/sync-projects-md.test.js` · `python3 -m unittest lib/dev-server/test_server.py` · `tdd/playlist.md` 10행 추가
* 결과:
    - sync 10건 · 서버 74건(신규 8) 통과. `tdd/playlist.md` 10행 ✅, Node 24 에서 깨지던 `node --test lib/__tests__/` 를 glob 으로 보정
    - 실 `Projects.md` 이전 완료 — 외부 2건(`1.design_rnd`·`cg-e2e`) 경로 기록, `/p/` 배지 prj60·prj7 실측
    - ⚠️ 별건 드리프트: publishing=o 인데 `Projects/.gitignore` 에 없는 4건(AgenticCoding·StellarEvolution·graphify·n3shIntro) — sync 가 추적 추가하려 하므로 두 파일은 HEAD 유지, 결정 대기
    - ⚠️ 기존 실패 3건(integration head-bar 77~79)은 변경 전에도 실패 — 본 이슈 무관

## Issue414: 목차(markmap)가 화면을 안 채운다 — 렌더 결과가 **뷰포트 크기에 의존**한다 (등록: 2026-09-21, 해결: 2026-09-21, commit: `2075d6b`) ✅
* 목적: agenda·챕터 TOC 의 markmap 이 박스의 절반도 못 채우고 좌상단에 몰린다. 브라우저 창(1280 내외)에서 보면 그럴듯한데 **PDF·대형 화면에서만** 작아 보여 «변환 문제» 로 오인되기 쉽다.
* 상세 (실측 2026-09-21 · `1.design_rnd` agenda · 같은 HTML 을 두 뷰포트로):
    - 1280×900 — 박스 1152 · 콘텐츠 798 · 채움 **69%** · `transform: … scale(2)`
    - 1920×1440 — 박스 1872 · 콘텐츠 **798(동일)** · 채움 **43%** · `scale(2)`
    - 🔴 박스는 커지는데 **스케일이 2 에서 멈춘다** — markmap-view 의 `maxInitialScale` 기본값이 **2** 다
    - 즉 **렌더 결과가 뷰포트 크기에 의존**하는 것이 본체다. 덱은 1920 폭으로 설계되는데 창에서 맞춰 보면 문제가 안 보이고, 배포본에서 드러난다
    - ⚠️ 변환(PDF) 결함이 **아니다** — 같은 뷰포트로 브라우저를 열면 브라우저도 똑같이 작다. [pdf-parity.md](_doc_arch/pdf-parity.md) 의 3경로 대조로 보면 ①②③ 이 모두 같은 계열(C4)
* 구현 명세:
    - 로직: `deriveOptions` 에 `maxInitialScale` 을 올려 **`fitRatio` 가 판정하게** 한다. 그러면 어느 크기에서나 같은 비율로 찬다
    - 적용 지점은 **둘** — 덱 TOC 슬라이드([html-builder.js](lib/html-builder.js) `markmapDepth`)와 agenda 페이지(`expandLevel`). 한쪽만 고치면 다른 쪽이 그대로 남는다
    - ⚠️ 무한대로 열지 않는다 — 항목이 1~2개뿐인 덱에서 글자가 터무니없이 커진다
    - 검증: 두 뷰포트에서 채움 비율이 **같아야** 한다(뷰포트 독립). 다른 덱 회귀 0
* 해결:
    - `maxInitialScale: 6` — 1920 폭에서 6항목이 요구하는 4.53 에 여유를 둔 값
    - 검증 — `1.design_rnd` agenda: 1280 **96%**(scale 2.76) · 1920 **96%**(scale 4.53) → **뷰포트 독립 확인**
    - 회귀 — `m2Slide_chapter_mode` agenda: 폭 77% · 높이 **95%**. 항목이 많아 **세로가 제약**인 정상 fit 동작이고, 한 축이 95% 를 채우는 것이 fitRatio 의 정의다
    - 챕터 TOC 도 같은 수정으로 좌측 45% → **폭 거의 전부**로 개선
    - 📌 이 건은 «PDF 가 이상하다» 로 들어왔으나 **화면도 같은 크기에서는 똑같이 이상했다**. 3경로 대조의 0단계(«HTML 에서도 깨지는가»)가 한 번 더 값을 했다
* 🔴 **원인이 둘이었다 — 1차 수정만으로는 PDF 가 그대로였다** (후속 commit: `ee02c9a`)
    - 상한을 올려 브라우저는 96% 로 찼는데 **PDF 는 여전히 작았다**. `--media print` 유무 A/B 로 갈라 보니 둘 다 작아 그쪽이 아니었다
    - 진짜 두 번째 원인 — **decktape 는 `page.goto()` 를 먼저 하고 `page.setViewport()` 를 나중에 한다**(decktape.js 292행 → 360행). markmap 은 **기본 800×600** 에서 fit 하고, 그 뒤 뷰포트가 1920×1440 으로 커져도 다시 fit 하지 않는다
    - 덱 TOC 슬라이드는 `autoFit` + `refitMarkmap` 재시도가 이 자리를 덮고 있었으나 **agenda 페이지에는 없었다** — 그래서 agenda 만 작게 나왔다
    - 처방: agenda 의 markmap 컨테이너를 **`ResizeObserver` 로 관찰**해 크기가 바뀌면 debounce 후 `fit()`. ⚠️ resize 이벤트에 기대지 않는다 — CDP `Emulation` 경로는 이벤트가 오지 않을 수 있어 박스 자체를 관찰하는 편이 확실하다
    - 검증: decktape 산출 agenda 가 박스를 **꽉 채움**(고치기 전 ~40%)

## Issue413: PDF 파리티 회귀 러너 부재 — 결함 7건이 전부 배포본에서야 드러났다 (등록: 2026-09-21, 해결: 2026-09-21, commit: `b4e8e46`) ✅
* 목적: `--pdf` 경로에 **회귀 러너가 0종**이다. pptx 는 `z_test/ig-ppt/` 에 9종이 있다. 이 비대칭 때문에 2026-09-20~21 의 결함 7건이 전부 배포본에서야 드러났고, 사용자가 캡처를 11장 찍어 보내야 알았다. 더 나쁜 것은 **대부분이 `rc 0` + ✅ 로 성공 보고**됐다는 점이다.
* plan: `_doc_work/plan/pdf-parity_plan.md`
* task: `_doc_work/plan/pdf-parity_task.md`
* 상세:
    - 설계 SSOT 는 [pdf-parity.md](_doc_arch/pdf-parity.md) 가 이미 정리했다 — 원인 계열 4종(C1 계약 미전달·C2 도구 내부 결함·C3 런타임 타이밍 의존·C4 HTML 자체 결함)·3경로 대조 진단법·비결정성 판정 규약. 본 이슈는 **그 방법론을 실행체로 굳히는 것**이다
    - 지금 있는 것은 전부 «빌드 중 자기 점검» 이다(`Printed N` 대조·`--expect`·폰트 격리·`PDF_LOSS`). **«고친 것이 그대로인가» 를 나중에 다시 묻는 수단이 없다**
    - ⚠️ **작은 덱으로는 C3 가 재현되지 않는다** — 446장 연속 인쇄 중에만 타이밍이 밀린다. 기존 픽스처만으로 러너를 돌리면 이 계열은 영원히 안 잡힌다
* 구현 명세:
    - 러너 3종 — `1.integrity`(무결성) · `2.tripath`(3경로 대조, **계열까지 찍는다**) · `3.nondeterminism`(N회 반복 조판 일치, 기본 N=3)
    - **차단 지점으로 만들지 않는다** — 차단은 이미 빌드 안에 있고, 러너까지 차단이면 오탐 1건이 배포를 막는다(pptx `8.assembly.sh` 와 같은 판단)
    - 🔴 **역검증이 완료 조건의 본체다** — `3.nondeterminism` 이 Issue407 고치기 **전** 코드에서 실패하고 **후** 코드에서 통과해야 한다. 그러지 못하면 러너는 장식이다
    - 착수 전 결정 3건(N 기본값·픽스처 신설 여부·게이팅)은 task 에 근거와 함께 닫아 두었다. 남은 2건(대용량 실덱 확보·PyMuPDF 의존)은 러너를 만들어 봐야 답이 보이므로 열어 둔다
* 해결 — **완료 조건의 본체였던 T4 에서 접근을 바꿨다. 그 전환이 이 이슈의 교훈이다.**
    - 러너 3종 — [1.integrity](z_test/pdf/1.integrity.sh)(페이지 수·비율·폰트 격리·백지 장) · [2.tripath](z_test/pdf/2.tripath.sh)(3경로 대조 → 계열 판정) · [3.nondeterminism](z_test/pdf/3.nondeterminism.sh)(반복 조판 지문 + `--mechanism`)
    - 🔴 **반복으로는 증명하지 못했다** — 구 코드로 같은 챕터를 N=3·N=6 **총 9회** 뽑았는데 한 번도 갈리지 않았다. 원 결함은 6챕터 446장 연속 빌드에서 났고 그 조건을 러너로 재현하지 못했다. 표본을 더 쌓아도 «안 나왔다» 만 쌓인다
    - ✅ **기전 검사로 대체해 증명했다** — 고친 내용이 «판정을 레이아웃이 멈춘 뒤에만 내린다» 이므로 그 조건을 직접 확인한다. CPU 8배 감속 후 latch 된 body 가 측정 키(`data-htmlart-side-m`)를 거쳤는가:
        - 구 코드 `latchedWithoutMeasure=1` → **rc 1 ❌** · 현 코드 `0` → **rc 0 ✅**
    - ⚠️ 이것은 «비결정성 없음» 의 증명이 **아니다.** 「오판을 영구 고정하는 구조가 없음」의 증명이다 — 그 구조가 원인이었으므로 **원인 제거는 증명된다**. 결과의 부재를 증명할 수 없을 때 **원인의 부재를 증명한다**
    - 📌 **첫 실행에서 실제 결함 2건을 잡았다** — `aTest_rt` single mode 오판(agenda 유무로 갈랐는데 single 도 agenda 를 만든다) · `igTest` **stale PDF**(21:21 산출 vs 23:41 HTML)
    - stale 은 실패가 아니라 **rc 3 «판정 불가»** 로 따로 센다. 원고보다 오래된 산출물을 «불일치» 로 보고하면 있지도 않은 손실을 쫓게 된다
    - 구현 중 잡은 함정 3종을 주석으로 남겼다 — ego 에 **env 가 전달되지 않는다**(JSON 리터럴로 주입) · `li` 마커 때문에 **요소 상자 ≠ 글자 스팬**(Range 로 내용 상자, 실측 0.382 vs 0.410) · **unquoted heredoc 안의 백틱**이 명령 치환으로 터진다
    - 배선: [apply-verify-rules](.claude/rules/apply-verify-rules.md) §4.12. ⚠️ 세 러너 모두 **차단 지점이 아니다** — 차단은 이미 `--pdf` 빌드 안에 있다
    - 범위에서 뺀 것: 대용량 회귀 픽스처 신설(재현되지 않으므로 값이 없다) · `harness-arch.md` 등재(글로벌 전용 진입점이라 대상 아님)
    - 검증: `1.integrity` 4덱(통과 1 · STALE 3) · `2.tripath` 판정 4갈래 단위 검증 + live 3경로 **38.72px@x0.41 정확 일치** · `--mechanism` 구/현 코드 역검증

## Issue412: 덱 특성 커버리지를 policy 처럼 한 곳에서 관리한다 (등록: 2026-09-21, 해결: 2026-09-21, commit: `6634161`) ✅
* 목적: 픽스처 덱이 **무엇을 커버하는가** 가 어디에도 선언돼 있지 않아, 커버되지 않는 특성이 생겨도 아무도 볼 수 없다. 실측 근거를 `data/` 로 승격하고 `7.coverage` 가 그 구멍을 감사하게 한다.
* plan: `_doc_work/plan/parity-fixture-coverage_plan.md`
* task: `_doc_work/plan/parity-fixture-coverage_task.md`
* depends: Issue403, Issue404, Issue405, Issue406, Issue409, Issue410
* 상세 (실측 2026-09-20, prj60(__lec) `1.design_rnd` 520장):
    - 그 덱에서 렌더 결함 **7건**이 한 번에 나왔는데 같은 시점 `aTest`·`igTest` 는 **전부 초록불**이었다
    - 장 제목 레벨 분포 — aTest `H2 37 · H3 0` / 1.design_rnd `H2 63 · **H3 398(86%)**`. pandoc 은 `--slide-level=2` 라 H3 장은 제목을 잃고, **7건 중 5건이 그 한 뿌리**에서 나왔다
    - 🔴 결함보다 심각한 것은 **「보이지 않았다」는 사실**이다. 「픽스처에 H3 장이 0개」가 어디에도 선언돼 있지 않아 [`7.coverage.sh`](z_test/ig-ppt/7.coverage.sh) 조차 구멍을 못 봤다 — 그 러너는 «계약이 선언한 **요소**» 만 보고 «원고가 가질 수 있는 **특성**» 은 보지 않는다
    - 근거가 흩어진 네 곳과 한계: `fidelity.yml` `evidence`(왕복만) · 러너 스크립트의 덱 이름(커버 범위를 못 읽음) · 코드 주석(가로질러 못 셈) · `_doc_work`(gitignored, 이 머신에만)
    - `z_test/` 전수 grep 결과 **`1.design_rnd` 0건** — 이번에 고친 7건은 회귀로 고정되지 않았다
* 구현 명세:
    - `data/m2slide2ppt/fixtures.yml` 신설(`kind: catalog`) — 픽스처 덱 목록 + 덱별 **원고 특성 실측 수치**
    - 특성은 **기계로 셀 수 있는 것만** 넣는다(제목 레벨·중첩 깊이·중간 코드·카드 본문 줄수·표지 제목 폭·본문 가진 진입 장·lane C 이월 종류). 「느낌」은 감사할 수 없다
    - ⚠️ **수치를 러너 스크립트에 박지 않는다** — `3.parity` ① 이 이미 그 실수를 했고 지금은 `lane-s.json` 에서 세어 얻는다. 박으면 또 하나의 복제본이 되고 갈린 날 정본을 못 찾는다
    - `7.coverage.sh` 에 «덱 특성» 감사 블록 추가. 판정 문법은 기존과 동일(🔴 검사기가 안 잼 / ❌ 픽스처에 없음 / ⚠️ 한 덱뿐). **차단하지 않는다**
    - H3 특성은 **새 최소 덱**으로 담는다(사용자 확정 2026-09-21) — `aTest-all` 에 덧붙이면 그 계열의 기존 evidence 수치가 전부 바뀌어 계약 갱신 범위가 번진다
    - `fidelity.yml` `subheading` 의 caveat *"H2 제목이 없는 슬라이드는 매칭 키가 없다"* 는 Issue403 으로 전제가 사라졌다 — 문구 교체
    - **검증은 반증으로 한다** — 신규 픽스처를 뺀 상태로 러너를 돌려 `title_level_h3` 가 `❌ 픽스처에 없음` 으로 뜨는지 본다. 초록불만 보면 감사가 실제로 도는지 알 수 없다
    - 설계 SSOT: [`_doc_arch/pptx-parity.md`](_doc_arch/pptx-parity.md) "근거는 어디에 사는가 — 덱 특성 커버리지"

* 결과:
    - `data/m2slide2ppt/fixtures.yml`(`kind: catalog`) 신설 — **축의 정의·근거는 사람이, 수치는 `lib/pptx/scan-fixtures.py` 가** 채운다
    - `check-coverage.py` 에 `deck_traits()` 추가. 판정 문법은 기존과 같고 **이진 축**(`binary: true`)만 구분했다 — `long_cover_title` 은 0/1 이라 「표본이 얇다」가 성립하지 않는다
    - 픽스처 `Projects/h3Test` 신설(12장 · 빌드 15장 · FAIL 0 · WARN 0 · 백지 장 0). **7축 전부**를 담는다
    - 🔴 **검증을 반증으로 했다** — h3Test 투입 **전** `long_cover_title` ❌ · `title_level_h3` ⚠️(4개) 였던 것이 투입 **후** 둘 다 ✅ 로 뒤집혔다. 초록불만 보면 감사가 실제로 도는지 알 수 없다
    - 계약 갱신 — `subheading` caveat 의 전제(「H2 없는 장은 매칭 키가 없다」)가 Issue403 으로 사라졌음을 명시하고 **남는 한계**(한 장에 H3 둘 이상)를 따로 적었다. `h2_slide_title` evidence 에 H3 덱 근거 추가
    - 회귀 6종 전부 rc0 (3.parity · 4.laneb · 5.lanem · 6.roundtrip · 7.coverage · 8.assembly)
    - ⚠️ **정책 yml 혼재 커밋** — `fidelity.yml` 이 코드와 같은 커밋(`6634161`)에 섞였다. [data-access-rules](.claude/rules/data-access-rules.md) 「정책 yml 커밋 규율」 위반이며, 같은 규율이 *"되돌리지 말고 후속 커밋에서 분리 이력을 남긴다"* 고 정하므로 히스토리를 재작성하지 않고 여기 적는다
    - ⚠️ `--lint-data` **전체는 여전히 실패**한다. 원인은 이 이슈와 무관하다 — 외부 강의 덱 심링크 `Projects/1.design_rnd` 의 슬라이드 제목에 `(Issue6` 등 내부 추적 표기가 남아 검사 5에 걸린다

## Issue410: lane B 카드 글자가 상자 밖으로 흘러나간다 (등록: 2026-09-20, 해결: 2026-09-21, commit: `66e7ac5`) ✅
* depends: Issue404
* 목적: 카드 높이를 **평균 줄 수**로 잡아, 글이 많은 카드의 본문이 상자 아래로 새어 나간다. 카드는 같은 높이로 나란히 서므로 평균은 애초에 맞는 기준이 아니다.
* 상세 (실측 2026-09-20, `1.design_rnd` p7 `::: cards` 4장):
    - 「설치 3종」·「검색 사이트」 카드의 본문이 회색 상자 **아래로 2줄씩** 삐져나왔다. 글자는 보이므로 내용 손실은 아니나 카드가 깨져 보인다
    - `build_page()` 의 `rows = max(rows / n, 2)` 가 **총합÷카드수**(평균)다. 4장 중 하나만 길어도 그 카드는 반드시 넘친다
* 구현 명세:
    - 카드별 줄 수를 따로 세고 **최댓값**을 쓴다 — 그것이 그 줄의 높이다
    - 검증: p7 을 캡처해 네 카드 모두 글자가 상자 안에 들어오는지 본다

* 결과: 카드 높이를 실제 줄 수로. 네 카드 모두 글자가 상자 안에 들어왔다

## Issue409: 중첩 불릿이 부모보다 크게 렌더된다 (등록: 2026-09-20, 해결: 2026-09-21, commit: `66e7ac5`) ✅
* depends: Issue403
* 목적: 본문 장 대부분에서 **2단계 불릿이 1단계보다 글자가 크다**. 읽는 사람에게는 하위 항목이 상위 항목보다 강조돼 보여 구조가 뒤집힌다.
* 상세 (실측 2026-09-20, `1.design_rnd` p8·p10·p18·p20):
    - 산출 pptx 의 본문 문단은 **크기를 직접 갖지 않는다**(전부 상속). 크기는 레이아웃 `lstStyle` → 마스터 `bodyStyle` 순으로 내려온다
    - 본문 크기 교정([build-pptx.sh](lib/pptx/build-pptx.sh) ①-b)은 레이아웃 `lstStyle` 의 **`lvl1pPr` 하나만** 고친다 — 실측 `lvl1pPr` 만 존재
    - 나머지 레벨은 마스터 기본값을 물려받는다(실측 `lvl1 32 · lvl2 28 · lvl3 24pt`). 본문이 20pt 로 줄면 **lvl2 가 28pt 로 남아 역전**된다
    - HTML 은 중첩을 **부모와 같은 크기**로 렌더한다(실측 s18: depth1·depth2 모두 40.48px)
    - 이 덱에서 특히 두드러지는 이유는 lane C 이월 240건이 htmlart 를 **중첩 불릿으로 눕히기** 때문이다 — 중첩이 많을수록 역전이 자주 보인다
* 구현 명세:
    - [lane-t.py](lib/pptx/lane-t.py) `--mode layout` 에서 본문 placeholder 의 `lvl2~lvl5` 크기를 `lvl1` 과 같게 적는다(`level_sizes`)
    - ⚠️ **마스터가 아니라 레이아웃**에 적는다 — 마스터는 제목·기타 스타일까지 공유해 영향 범위를 다 알 수 없다
    - 검증: 중첩이 있는 장을 캡처해 2단계가 1단계보다 크지 않은지 **눈으로** 본다

* 결과: lvl2~lvl5 를 lvl1 과 동일하게. HTML 도 중첩을 부모와 같은 크기로 렌더한다(실측 s18 40.48px)

## Issue406: 표지가 깨진다 — 제목이 상자를 넘고 부제가 두 번 나온다 (등록: 2026-09-20, 해결: 2026-09-21, commit: `66e7ac5`) ✅
* 목적: 첫 장이 배포물의 얼굴인데 두 결함이 겹쳐 있다. ① 제목이 상자를 크게 넘어 PowerPoint 에서 **좌우로 잘려 나가고** LibreOffice 에서는 3줄로 접혀 가로선·부제를 덮는다. ② 부제 「대금지오웰 ReBuild 아카데미」가 **두 번** 렌더된다.
* 상세 (실측 2026-09-20, `1.design_rnd` p1):
    - 제목 상자 318.9 × 27.9mm · 글자 77.5pt. 한글 27자를 그 크기로 넣으면 폭이 **약 561mm** 라 상자의 1.76배다
    - HTML 은 같은 제목을 **한 줄**에 담는다(실측 `.cover-title` 80px · 1줄). px 을 pt 로 그대로 옮긴 것이 어긋남의 원인이며, `word_wrap=False` 는 줄바꿈만 막을 뿐 **넘침을 감추지 못한다**
    - 부제는 pandoc 이 만든 `Subtitle` placeholder(T=127.2mm)와 lane T 가 그린 TextBox(T=108.7mm)가 **둘 다** 살아 있다
    - 🔴 placeholder 정리 조건이 «비어 있을 때만» 이었다. 그 조건은 frontmatter 에 `subtitle:` 이 **없는** 덱에서만 맞는다 — 있는 덱은 placeholder 가 차 있어 살아남는다
    - ⚠️ 이 결함은 1차 파리티 캡처에 **그대로 찍혀 있었는데 놓쳤다**. 제목 유무만 전수로 세고 화면은 3장만 봤다 — 「검사를 통과했다」와 「보고 확인했다」는 다른 말이다
* 구현 명세:
    - 제목은 `text_width_px` 로 재어 **상자 폭에 맞게 줄인다**. 밑줄도 같은 값을 써야 글자 폭과 어긋나지 않는다
    - 부제 placeholder 는 **우리가 다시 그릴 때는 무조건** 지운다(비었는지 묻지 않는다)
    - 검증: 표지를 캡처해 제목이 한 줄로 상자 안에 들어오고 부제가 1개인지 **눈으로** 본다

* 결과: 제목 77.5→41.7pt 로 한 줄 · 부제 1개. 폭 어림의 CJK 문장부호 반각 오산도 함께 교정

## Issue405: 코드 상자가 앞 문단을 덮는다 — 소프트 줄바꿈을 세지 않아서 (등록: 2026-09-20, 해결: 2026-09-21, commit: `66e7ac5`) ✅
* depends: Issue403
* 목적: 코드가 장 **중간**에 오면 `restyle_code` 가 앞 문단 높이를 어림해 상자를 까는데, 그 어림이 `<a:br>`(명시 줄바꿈)만 센다. 한글 장문 불릿은 소프트 줄바꿈으로 2~3줄이 되는데 전부 **1줄**로 잡혀 상자가 한참 위에 깔리고 **다른 문단을 덮는다**.
* 상세 (실측 2026-09-20, `1.design_rnd` p13 실습 P1-0-1):
    - 상자가 코드 글자보다 **약 100px 위**에 깔려 「완료조건 …」 불릿을 가렸다
    - 이 덱은 코드 상자가 **69개**다 — 원 주석의 *"코드가 중간에 오는 원고는 드물다"* 라는 전제가 이 덱에서는 성립하지 않는다
    - Issue403 이전에는 제목이 본문으로 흘러들어 문단 구성 자체가 달랐으므로, 제목이 제자리를 찾은 뒤에야 이 어긋남이 또렷해졌다
* 구현 명세:
    - `wrapped_lines()` 를 새로 두고 **소프트 줄바꿈까지** 센다(동아시아 폭 1 · 라틴 0.55, lane B `em_width` 와 같은 어림)
    - 과대추정이 안전한 방향이다 — 상자가 아래로 조금 가는 것은 읽기에 지장이 없지만 위로 가면 글자를 덮는다
    - 검증: p13 의 상자 top 이 코드 문단 위 여백 안에 들어오는지 캡처로 본다

* 결과: 장 중간 코드는 상자를 포기하고 run 하이라이트로 — 자리를 확신할 때(첫 문단)만 상자를 깐다

## Issue404: lane B 도형이 본문 불릿 위에 겹쳐 그려진다 (등록: 2026-09-20, 해결: 2026-09-21, commit: `66e7ac5`) ✅
* depends: Issue403
* 목적: `::: cards`·정형 htmlart 를 네이티브 도형으로 그리는 lane B 가 **도형을 본문 아래가 아니라 본문 위에** 놓는다. 본문 불릿이 도형에 가려 읽히지 않는다 — 산출물에 글자가 남아 있어 어떤 텍스트 검사도 잡지 못한다.
* 상세 (실측 2026-09-20, `1.design_rnd` p6 `::: htmlart compare`):
    - 본문 placeholder 36.2~95.1mm · lane B 카드 44.6~98.6mm → **50mm 겹침**
    - lane B 의 계산은 맞다 — 본문을 58.9mm 로 **제대로 줄였고**(대조군 p8·p10 은 179.7mm) `y0 = top + lead_h + GAP` = 99.1mm 을 구해 `info-build.py --y0` 로 넘긴다
    - 🔴 **렌더러가 그 값을 지키지 않는다.** 도형은 테마 기본값 `layout.y0: 6.0` 기준으로 그려지고, `merge_shapes` 는 좌표를 그대로 옮기므로 겹침이 그대로 간다
    - Issue403 이전에는 **드러나지 않았다** — lane B 는 장 제목으로 대상을 찾는데 제목이 없어 대상 0장이었다. 제목이 살아나자 12장이 대상이 되며 표면화됐다
* 구현 명세:
    - 병합 **직전**에 렌더된 장의 도형 전체를 `y0` 에서 시작하도록 옮긴다([`lane-b.py`](lib/pptx/lane-b.py) `anchor_to`). 어느 렌더러를 쓰든 「본문 아래에서 시작한다」를 이 자리가 보장한다
    - ⚠️ `info-build.py` 는 **글로벌 SCAR** 라 이 저장소에서 고치지 않는다([global-scar-change-rules](~/.claude/rules/global-scar-change-rules.md)). 렌더러 쪽 결함은 별도 이슈로 prj3 에 올린다 🚧
    - 보정 건수를 로그에 낸다 — 조용히 고치면 렌더러 결함이 영영 안 보인다
    - 검증: p6 카드 top 이 본문 bottom 아래인지 mm 로 재고, 앞 20장 캡처로 겹침이 사라졌는지 본다

* 결과: 겹침 0 · 넘침 0 (보정 3장). 표식 승계를 빠뜨리면 redraw_cards 가 다시 그린 카드를 못 찾는다

## Issue403: 슬라이드 제목이 `### H3` 인 덱은 pptx 에서 제목을 전부 잃는다 (등록: 2026-09-20, 해결: 2026-09-21, commit: `66e7ac5`) ✅
* 목적: pandoc 을 `--slide-level=2` 로 부르므로 **`### H3` 로 시작하는 장은 Title placeholder 가 빈 채로 나간다.** 제목 글자는 본문 첫 문단으로 흘러들어 강조색(초록) 굵은 줄이 되고, 장 제목이 있어야 할 자리는 비어 있다. HTML 은 H3 도 슬라이드 제목(`class="title"`)으로 렌더하므로 **같은 원고의 두 산출물이 갈린다**.
* 상세 (실측 2026-09-20, prj60(__lec) `202609_Rebuild/1.design_rnd`):
    - 이 덱의 헤딩 분포는 `# 6 · ## 63 · ### 398` 이다 — **슬라이드 제목의 86% 가 H3**. `## N-M.` 은 절 진입 장이고 실제 장 제목은 H3 다
    - 대조군 `aTest` 는 `# 7 · ## 37` 로 **H3 장이 0개**라 이 결함이 드러나지 않았다. 「aTest 는 통과하는데 이 덱만 깨진다」의 실제 원인이 테마가 아니라 **헤딩 레벨 규약**이다
    - 눈으로 본 증상(p6 · p13): 제목이 본문 좌상단에 본문 크기·초록색으로 붙고, 상단 제목 자리는 공백이다. `Content with Caption` 이 배정된 장은 그 레이아웃의 **작은 캡션용 제목 자리** 탓에 더 어색하다
    - 🔴 **lane S 도 같은 자리에서 죽는다** — `scan_signals` 가 `H2.match` 로만 장을 식별해 **H3 장은 신호를 하나도 적지 않는다**. 빌드 로그의 `lane S 신호 기입 — 장 2` 가 그 결과다(398장 중 2장). 즉 복원 신호가 사실상 없다
    - 코드베이스는 이 사실을 **이미 알고 있었다** — [`check-parity.py`](lib/pptx/check-parity.py) 주석과 계약 [`fidelity.yml`](data/m2slide2ppt/fidelity.yml) `subheading` 의 caveat 가 적고 있다. 다만 「4건」 규모로 보고 **우회할 사실**로 다뤘고, 덱 전체가 H3 인 경우는 상정하지 않았다
* 구현 명세:
    - 블록의 **최상위 헤딩을 H2 로 승격**한다(상대 깊이 보존). m2slide 의 의미는 «한 블록 = 한 장 · 최상위 헤딩 = 그 장의 제목» 이므로, 그 의미를 pandoc 의 slide level 에 맞추는 것이 정본이다
    - ⚠️ 승격은 `drop_auto_toc`·`normalize_chapter` **뒤**에 둔다. 그 둘은 부모·자식 판정에 헤딩 레벨을 쓰므로 먼저 올리면 판정이 뒤집힌다(Issue401 이 지킨 장이 다시 흔들린다)
    - ⚠️ `--slide-level=3` 으로 바꾸는 우회는 쓰지 않는다 — 이 덱은 H2 진입 장과 H3 장이 **공존**하므로 한쪽이 반드시 깨진다
    - `scan_signals` 의 장 식별을 **최상위 헤딩 아무 레벨**로 넓히고 원래 레벨을 `hlvl` 신호로 적는다. 역변환은 그 값으로 `###` 를 되돌린다 — 승격이 왕복에서 레벨을 깎지 않게 한다
    - 계약 `subheading` 의 caveat(「H2 없는 장은 매칭 키가 없다」)는 이 수정으로 **전제가 사라진다**. 문구를 갱신한다
    - 검증: 앞 20장을 pptx→PDF→PNG 와 HTML 캡처로 대조해 제목이 제 자리에 오는지 본다. 회귀는 `3.parity.sh igTest` · `6.roundtrip.sh aTest` · `7.coverage.sh`

* 결과: 제목이 살아나며 머리말 0→644 · lane S 신호 2→442장 · lane B 대상 0→12장이 줄줄이 따라 살아났다. 승격 398장

## Issue411: venn·hexagon·pie 라벨이 박스를 넘쳐 **잘린 채 겹쳐 보인다** — 고정 폰트 (등록: 2026-09-20, 해결: 2026-09-20, commit: `98f7cbe`) ✅
* 목적: venn 의 제목이 두 줄로 접히면 윗줄이 반쯤 잘린 채 아랫줄과 포개져 읽을 수 없다. 사용자 신고는 «PDF 변환 오류» 였으나 **HTML 원본에서 픽셀 단위로 같은 증상**이다 — 변환은 충실히 옮겼을 뿐이다.
* 상세 (실측 2026-09-20 · prj60 `1.design_rnd` p382 「3일차에 도구로 썼던 것을 원리로 되짚음」):
    - `centerLabel()` 은 `foreignObject` 에 flex 중앙정렬 div 를 넣는다. 내용이 `height` 를 넘으면 **위아래로 똑같이 넘쳐** 잘리므로, 제목 윗줄이 반토막 나 아랫줄과 겹친 것처럼 보인다
    - 호출부가 폰트를 **고정**으로 넘기고 있었다 — `venn` 28/18(박스 96 고정) · `hexagon` 25/17 · `pie` 범례 20/15
    - `pie` 는 특히 나쁘다 — 범례 칸 높이가 `(R*2)/slices.length` 로 **조각 수에 반비례**해 줄어드는데 폰트는 그대로다
    - 같은 계열의 선례가 이미 있다 — `chevron`(Issue391)이 «htmlart 중 유일한 auto-fit 부재» 로 같은 증상을 냈고 `uniformTitleFs` fit 경로로 해소했다. 그때 나머지가 남았다
* 구현 명세:
    - 로직: 세 호출부를 chevron 과 **같은 fit 경로**로 통일한다. `uniformTitleFs(items, w+12, h)` — `fitFsFor` 가 nodeBox 의 padding 12*2 를 전제하므로 `centerLabel`(padding 6*2)에는 그 차 12 를 더해 넘긴다
    - 종전 값(28·25·20)은 **상한**으로 남긴다 — 짧은 라벨이 든 장은 1px 도 바뀌지 않아야 한다
    - `pie` 는 백분율 접미(`(12.5%)`)까지 포함해 재야 한다 — 실제 렌더되는 문자열이 그것이다
    - 검증: htmlart 전 타입 쇼케이스에서 `foreignObject` 넘침 0
* 해결:
    - 검증 — `m2Slide_visual_component` 05-htmlart-27: 라벨 **147개 · 26개 타입 전부 넘침 0**
    - `1.design_rnd` p382 venn: 제목 28 → **18px** 자동 축소, `needH(96) == boxH(96)` 로 정확히 수용. 라벨 3개 전부 온전히 읽힘
    - 짧은 라벨 장(`04-day4` p305 venn)은 **28px 그대로** — 상한 정책대로 무변경
    - 📌 이 건으로 *"PDF 변환 오류"* 신고 중 **한 계열은 변환 무관**임이 확정됐다. 나머지 두 계열은 Issue407(비결정 조판)·Issue408(이모지 잘림)

## Issue407: `--pdf` 본문이 **실행마다 다르게** 조판된다 — 2열 판정이 레이아웃 확정 전에 굳는다 (등록: 2026-09-20, 해결: 2026-09-20, commit: `5edae5a`) ✅
* 목적: 446p 배포본에서 불릿이 슬라이드 밖으로 잘리거나 도해를 덮는 장이 나온다. **화면(HTML)은 멀쩡한데 PDF 에서만** 그렇고, 같은 명령으로 다시 뽑으면 멀쩡해지기도 한다 — 재현이 안 되니 «어느 장이 깨지는가» 를 원고에서 예측할 수 없다.
* 상세 (실측 2026-09-20 · prj60 `1.design_rnd` `03-day3` p20 「기법보다 대상이 먼저임」):
    - 같은 문자열을 세 경로로 재니 — 브라우저 화면 **38.72px** · PDF 단독 추출(`--slides 20`) **38.7px** · PDF 전체 추출(배포본 p184) **44.0px**. 전체 추출만 1.14배 크고 열이 좁아져 마지막 불릿이 잘렸다
    - 🔴 **같은 챕터를 재추출하니 29.0pt(정상)로 나왔다** — 입력이 같은데 결과가 갈린다. 비결정적이다
    - 폰트가 갈리는 이유: 2열 전환이 성립하면 본문이 `.htmlart-side-rest`(2.2rem=35.2px)에 담겨 `ul` 이 38.72px, 불발되면 `ul` 이 `.contents-body`(40px)를 직접 상속해 **44px**
    - 원인 — [htmlart_dispatch.client.js](lib/component-hooks/htmlart_dispatch.client.js) `relayoutSquished()` 가 ① `slidechanged` **즉시** `getBoundingClientRect()` 로 재고 ② `width<40`·`height<10` 만 거르는 약한 가드를 지나 ③ `data-htmlart-side-checked` 로 **영구 고정**한다. 그 순간 SVG·웹폰트가 아직 자리를 잡는 중이면 «그럴듯하지만 틀린» 값으로 판정하고, 다음 `slidechanged` 때는 이미 다른 슬라이드라 되돌릴 길이 없다
    - 446장을 연속 인쇄하는 동안 매 장 `page.pdf()` 가 끼어들어 타이밍이 밀린다 → **대용량 덱에서만, 실행마다 다른 장에서** 표면화. 작은 덱으로는 재현되지 않는다
* 구현 명세:
    - 로직: 판정을 «레이아웃이 **멈춘 뒤**» 에만 내린다. 측정값을 키로 기록하고 **연속 두 번 같은 값**이 나올 때만 latch. 안 멈추면 판정하지 않고 손대지 않은 1열을 남긴다(구 가드가 떨어지던 자리와 같은 안전측)
    - 재시도는 rAF + 60·180·400·700ms. decktape 는 슬라이드마다 `--pause`(기본 1000ms)를 두므로 전부 인쇄 전에 끝난다. 이미 latch 된 body 는 즉시 return 이라 반복 비용이 없다
    - 검증: 같은 챕터를 **여러 번** 뽑아 매번 같은 조판이 나오는지 (1회 통과로는 판정 불가 — 고치기 전에도 한 번은 정상이 나왔다)
* 해결:
    - `measureSide()` 로 측정을 분리하고 `data-htmlart-side-m` 에 직전 측정 키를 남겨 **안정화 gate** 를 걸었다
    - 검증 — `03-day3` 전체 추출 **2회 모두** p20 본문 29.0pt · x=0.410 · 도해 라벨 27개 · 마지막 불릿 생존(깨짐이면 33.0pt·x=0.512·라벨 3개). dev-server 로 기전 직접 확인 — `data-htmlart-side-m="1008x98x1008x661"` 이 연속 일치한 뒤 `checked=1`, 2열·폰트 35.2→38.72px 정상
    - ⚠️ **2회 통과가 race 부재의 증명은 아니다.** 고치기 전에도 한 번은 정상이 나왔다. 증명한 것은 «판정이 안정화 후에만 내려진다» 는 기전이고, 2회는 회귀가 없다는 확인이다

## Issue408: 제목의 **이모지 윗부분이 잘린다** — 장식 브러시가 글자 위에 그려진다 (등록: 2026-09-20, 해결: 2026-09-20, commit: `5edae5a, 7a4f28d`) ✅
* 목적: 배포본 p39·p40·p42 등 `🙋 실습 P1-1-…` 장에서 이모지의 손 윗부분이 사라진다. 한글 제목만 보면 멀쩡해 여태 드러나지 않았다.
* 상세 (실측 2026-09-20):
    - 원인은 `theme/default_lec/slide.css` 의 `.contents-head-bar::after` — 노란 브러시(`hr.png`)가 `bottom:-6px` 로 head-bar 를 **4px 넘어** 제목 박스 안까지 내려오고 `z-index:100` 이라 **제목 위에** 그려진다. 불투명 PNG 라 걸린 글자가 지워진다
    - 그 `z-index` 는 의도된 것이다 — 「하단 가로선이 본문에 가려지지 않도록」(동 파일 §2 주석). 문제는 **내용이 장식 아래**에 있다는 것
    - 한글·라틴 글리프는 그 띠까지 올라오지 않는다. **이모지는 em 박스를 넘어 위로 뻗어** 걸린다
    - ⚠️ **화면에서는 3px 차로 간신히 비껴간다** — 그래서 HTML 만 보면 «멀쩡하다». PDF 에서는 브러시가 5px 아래로 내려와(실측 정규화 0.0444 vs 화면 0.0410) 닿는다. 여유가 0 에 가까운 설계가 본체다
* 구현 명세:
    - 로직: 여백을 늘려 피하지 않는다 — 그러면 다시 «몇 px 차» 싸움이 되고 전 덱의 제목이 내려간다. **내용을 장식 위로** 올려 미세한 차이와 무관하게 만든다
    - 검증: 고치기 전/후 같은 장을 PDF 로 뽑아 손끝이 남는지 대조
* 해결 — **첫 수정은 빗나갔다. 그 사실이 이 이슈의 교훈이다.**
    - ❌ 1차: `section[class*="layout-"] > .title` 에 `z-index:101`. `layout-exercise-small` 의 제목은 `.title` 이 아니라 **`h1.exercise-title`** 이고 `div.exercise-header` **안에** 있어 선택자가 아예 안 걸렸다. p40 이 멀쩡해 보인 것은 🙋 와 ✅ 의 잉크 높이가 달라서였고, 사용자가 p157(`✅ 검증 P2-4`)로 재지적했다
    - ✅ 2차: **브러시 쪽에서** `z-index:100` 을 걷어냈다. 그러면 트리 순서대로 칠해지고, head-bar 가 제목보다 앞에 있으므로 제목이 위가 된다. 선은 글자 **뒤로** 지나간다
    - ⚠️ **제목 선택자를 늘리는 방향은 버렸다** — layout 마다 제목 클래스·중첩이 갈려 있어 목록을 유지해야 하고, 빠뜨린 layout 이 곧 재발이다. 실제로 1차에서 빠뜨렸다. 고칠 곳은 **덮는 쪽**이지 덮이는 쪽이 아니다
    - 검증 — `02-day2 #/64`(`✅ 검증 P2-4`) 브라우저 렌더: `::after` z=auto, 이모지 온전, 브러시가 뒤로 지나감

## Issue401: `--pptx` 가 본문 있는 진입 장을 통째로 버린다 — HTML 은 남긴다 (등록: 2026-09-20, 해결: 2026-09-20, commit: `94b3faa`) ✅
* 목적: 같은 원고로 지은 HTML 과 pptx 의 **내용이 갈린다**. `## N-M.` 진입 장이 `#layout-*` 을 달고 본문(도입 문단·불릿·도해)을 담고 있으면 HTML 은 정상 렌더하는데 pptx 는 그 장을 **통째로 버린다**. 빠진 장은 「비어 있는 장」으로도 세어지지 않아 `check-conform`·`check-empty`·`3.parity` 어느 것도 잡지 못하고 배포까지 조용히 간다.
* 상세 (실측 2026-09-20, prj60(__lec) `202609_Rebuild/1.design_rnd` · 505장 덱):
    - 「자식 헤딩을 가졌으면서 본문이 있는 진입 장」이 원고에 **36개**(본문 합 366줄). pptx 505장 전체 텍스트에서 그 제목 표본 5종을 찾았으나 **0건**이다
    - 표본 `## 4-1. 기술 보고서 초안 작성`(본문 17줄) — HTML `04-day4.html` 에는 도입 문단·quadrantChart 가 모두 있고, pptx 에는 제목도 본문도 이미지도 없다
    - 그 장에 실려 있던 **mermaid 1건이 장과 함께 사라졌다** — 원고 펜스 18개 → 전처리 소스 17개
    - 빌드 로그는 이 생략을 `Cards Page 생략 — 자식 헤딩을 가진 진입 장 36개 (HTML 과 같은 판정)` 이라 적는다. **그 괄호가 틀렸고**, 틀린 채로 안심시켜 재발을 덮는다
* 구현 명세:
    - 원인은 [`lib/pptx/build-source.py`](lib/pptx/build-source.py) `drop_auto_toc` 가 slide-parser 의 가드 한 줄을 빠뜨린 것이다. HTML 쪽 정본은 [`lib/slide-parser.js`](lib/slide-parser.js) 의 `if (s.layout) return;` — **명시 `#layout-*` 이 붙은 장은 `_cards` autoToc 로 변환하지 않으므로** `cards_placeholder: false` 라도 살아남는다
    - ⚠️ 같은 파일의 `normalize_chapter` 는 이미 `explicit_entry` 로 그 가드를 갖고 있다. **한 파일 안에서 판정이 갈려 있었다** — H1 진입 장은 지키고 H2 이하 진입 장은 버렸다
    - 고칠 곳은 `drop_auto_toc` 하나다. `LAYOUT_LINE` 이 걸리는 블록은 건너뛰고, 유지 건수를 로그에 내어 「지켰다」가 보이게 한다
    - 검증: 고친 뒤 재빌드해 36개 진입 장의 제목·본문이 pptx 에 나타나는지 전수 대조한다. 장 수만 보면 안 된다 — `defer_heavy` 가 장을 쪼개므로 HTML 섹션 수와 pptx 장 수는 원래 일치하지 않는다
    - 회귀: `./z_test/ig-ppt/3.parity.sh` · `7.coverage.sh`
* 결과:
    - [`lib/pptx/build-source.py`](lib/pptx/build-source.py) `drop_auto_toc` 에 `LAYOUT_LINE` 가드를 넣고 유지 건수를 `auto_toc_kept` 로 로그에 냈다. **가드는 자식 확인 뒤에 둔다** — 앞에 두면 애초에 지워지지 않을 장까지 세어 「유지 434개」가 찍히고, 그 수로는 무엇을 지켰는지 못 읽는다(본 이슈가 겨냥한 오해를 로그가 되풀이한다)
    - 실측 `1.design_rnd`: **505장 → 547장**. 진입 장 36개 제목·본문이 전수 복원됐고, 그 장에 묻혀 있던 mermaid 1건도 살아나 코드펜스 잔존이 2 → **0** 이 됐다
    - 로그가 `Cards Page 생략 … 36개` 대신 `진입 장 유지 — 명시 layout 36개` 로 바뀌어, 지운 수뿐 아니라 **지킨 수**가 보인다
    - 회귀 `3.parity.sh igTest` 단언 7종 rc0 · `7.coverage.sh` rc0. 파리티 ①(`42장 = HTML 본문 39 + 구조 3`)이 통과한 것은 **지워야 할 장까지 살려 놓지는 않았다**는 뜻이다

## Issue399: `--pdf` 산출물의 한글 글리프가 다른 글자로 치환된다 — 슬라이드 수가 늘수록 (등록: 2026-09-20, 해결: 2026-09-20, commit: `39126aa`) ✅
* 목적: decktape 로 뽑은 PDF 에서 한글 본문이 **보이는 글자만** 엉뚱하게 찍힌다. 텍스트 레이어는 원문이라 검색·복사는 되지만, 배포·인쇄본으로는 쓸 수 없다. Issue396(비율)과 **무관한 별개 결함**이며 그보다 치명적이다.
* 상세:
    - 증상 A (주): 본문 한글이 **다른 글자로 치환**된다. 원문 `6일 내내 같은 말이었음 — 질문은 강의노트 QnA 시트로 남김.` → 화면 `6일 내내 게은 미이d 음 — 출문은 & 의5 트 시자 시트로 김남.`
    - **텍스트 레이어는 정상**이다 — PDF 에서 추출하면 원문 그대로 나온다. 어긋난 것은 그려지는 글리프뿐이라 데이터 손실은 없다
    - 🔴 **재현 조건이 슬라이드 수다** — `Projects/1.design_rnd/slide/06-day6.html` 의 **같은 슬라이드**를 두 방식으로 뽑아 대조했다:
        - `--slides 1,5` (2장): `3일차는 손으로, 6일차는 머리로 만짐` · `검색(Retrieval)이 눈에 보인 자리였음` → **정상**
        - 전체 71장: 같은 자리가 `눼일차는 손으로` · `검색(Retr어va았거)` · `P3-3` → `P는는` → **깨짐**
    - 계측: 폰트가 전부 **Type 3** 로 임베딩된다. 71장 산출물에서 `Type 3` 1261 객체(한글 — GmarketSansBold·AppleSDGothicNeo·NanumGothicCoding) 대 `CID TrueType` 984(라틴). poppler 가 변환 중 `Syntax Warning: Bad bounding box in Type 3 glyph` 를 반복 출력한다
    - ⚠️ 2장 산출물에도 Type 3 가 34 객체 있으나 **렌더는 정상**이다 — 따라서 «Type 3 이라서 깨진다»가 아니라 **Type 3 객체가 누적될 때 매핑이 어긋난다**로 보인다
    - 뷰어 문제가 아니다 — macOS Quartz(Preview 엔진)와 poppler(`pdftoppm`) **양쪽에서 동일하게** 재현된다
    - 폰트는 정상 설치돼 있다 (`~/Library/Fonts/GmarketSansBold.otf`(CFF)·`NanumGothicCoding-Regular.ttf`(TTF)). 산출 HTML 에 `@font-face` 선언은 없고 시스템 폰트를 직접 참조한다
    - 증상 B (별개 가능성): 벤 다이어그램 라벨이 **두 줄로 겹쳐** 그려진다. 이쪽은 2장 산출물에서도 나타나 원인이 다를 수 있다
    - **아닌 것**: ① Issue396 이전의 16:9 산출물에도 있었다 → `--size` 무관 ② 챕터별 개별 PDF 에도 있다 → `combine-pdfs.py` 무관
    - 발견 경로: prj60(__lec) `202609_Rebuild/1.design_rnd` 446p 합본 검수 중. 전 6 챕터에서 관측
* 구현 명세:
    - 조사: decktape 는 슬라이드마다 `Page.printToPDF` 를 호출해 이어붙인다. **슬라이드 수에 비례해 Type 3 객체가 쌓이는 지점**과 매핑이 어긋나기 시작하는 임계를 먼저 잡는다 — 2장 정상·71장 깨짐 사이를 이분 탐색하면 좁혀진다
    - Chrome 이 로컬 설치 폰트를 CID TrueType 이 아닌 Type 3 로 떨어뜨리는 조건을 규명한다. 라틴 폰트는 CID TrueType 으로 나가므로 **한글(대용량 글리프) 서브셋 경로**가 갈리는 것으로 보인다
    - 회피 후보(검증 필요): ① 웹폰트를 `@font-face` + woff2 로 명시 임베딩 ② decktape `--chrome-arg` 폰트 관련 플래그 ③ 챕터를 더 잘게 쪼개 합본
    - ⚠️ 설계는 해결자에게 맡긴다 — Issue396 에서 명세가 제시한 «매핑표»가 판정 이중화를 부를 뻔했다. 여기서도 특정 구현을 지정하지 않는다
    - 검증: 같은 슬라이드를 2장 추출분과 전체 추출분으로 렌더해 **글리프가 일치**하는지 대조한다. 텍스트 추출 비교로는 잡히지 않는다 — 텍스트는 원래 정상이다

* 해결 — **원인은 Type 3 가 아니었다. decktape 자신의 폰트 통합이다.**
    - decktape 3.16.1 `printSlide()` 의 `parseFont` 는 슬라이드마다 따로 찍힌 Chrome 폰트 **서브셋**을 «폰트 이름 + 메타데이터» 로 묶어 하나로 통합한다. 그런데 갈아끼우는 것은 `FontFile2` **하나뿐**이고, 각 페이지의 `CIDToGIDMap`·`/W`·콘텐츠 스트림 CID 는 그대로 둔다. 게다가 글리프 병합을 유니코드로 하면서 **마스터에 이미 윤곽선이 있는 인덱스면 들어온 글리프를 조용히 버린다**
    - 그래서 «CID 는 그대로인데 그 CID 가 가리키는 글리프만 남의 것» 이 된다 → **ToUnicode 는 멀쩡하고 그려지는 글자만 어긋난다.** 등록 상세의 *"텍스트 레이어는 정상"* 이 바로 이 구조의 지문이었다
    - 슬라이드가 늘수록 심해지는 것도 같은 이유다 — 마스터 하나에 서브셋이 겹겹이 쌓일수록 자리를 뺏긴 글리프가 많아진다. 2장은 충돌이 거의 없어 멀쩡하다
    - ⚠️ **등록 시 가설 «Type 3 객체가 누적될 때 매핑이 어긋난다» 는 기각됐다.** decktape 는 Type0/CIDFontType2 만 만지고 Type 3 는 건드리지 않는다. 실제로 깨진 본문은 `NanumGothicCoding`(CID TrueType)이고, Type 3 로 나가는 제목(`GmarketSansBold`)은 **양쪽 다 멀쩡**했다. poppler 의 `Bad bounding box in Type 3 glyph` 는 같은 자리에서 나던 **별개 잡음**이라 원인으로 오인하기 쉬웠다
    - 계측 (1.design_rnd `06-day6`, 71장 — 같은 HTML 을 두 방식으로):
        - 통합 on — Type0 참조 1519건 : `FontFile2` 스트림 **37개** (그중 하나를 **69 페이지**가 공유, 크기 11KB)
        - 통합 off — Type0 참조 1519건 : `FontFile2` 스트림 **984개**, 페이지당 전용
        - 결정적 증거 — 두 PDF 의 **p6 텍스트 레이어가 완전히 동일**(`강사가 도구 두 개를 그 자리에서 돌림 · 터미널과 출력이 화면에 뜸 · 「되긴 되는구나」가 생김`)한데, 통합 on 은 자기 텍스트 레이어와 **다른 글리프**를 그렸다(`강사가 6 구 두 ( 를 … 터미께- 출력이 —A 에 뜸 …`). 자기완결적 증명이라 다른 변인이 끼어들 자리가 없다
    - 처방 — upstream 을 고칠 수 없으니 **통합을 끈 사본으로 실행한다**: [lib/pdf/decktape-run.sh](lib/pdf/decktape-run.sh) 가 decktape 진입점을 해소해 `parseFont` 를 무력화한 사본을 매 실행 재생성하고 그것으로 돈다. 원본은 건드리지 않는다(옆에 파일 하나를 더 쓸 뿐)
    - ⚠️ **앵커를 못 찾으면 죽는다.** 조용히 원본으로 떨어지면 글리프가 깨진 PDF 가 «성공» 으로 나오고, 그 손실은 텍스트 추출로 **절대 안 잡힌다**. decktape 가 올라가 내부가 바뀌면 rc 3 으로 멈추고 갱신을 요구한다
    - 남긴 장치 — [lib/pdf/check-pdf-fonts.py](lib/pdf/check-pdf-fonts.py) 가 장마다 «하나의 `FontFile2` 를 둘 이상의 페이지가 공유하는가» 를 잰다. 공유가 있으면 통합이 돈 것이고 곧 치환된 PDF 다. 판별력 실측 — 구 산출물 rc 1(37개 중 30개 공유·최대 69p) / 신 산출물 rc 0. 도구(PyMuPDF) 부재는 **SKIP 이라고 말하고** 통과로 위장하지 않는다
    - 덤으로 **`PDF_LOSS` 를 실제로 읽게 했다** — Issue398 이 세운 이 플래그를 어디서도 소비하지 않아, 장 단위 손실을 알고도 `exit 0` 으로 끝나고 있었다. 이제 결함이 있으면 rc 2 다
    - 비용: 챕터 PDF 20.45MB → **21.99MB (+7.5%)**. 폰트 중복보다 이미지가 지배적이라 이 정도다
    - 🚧 **증상 B(벤 다이어그램 라벨 겹침)는 이 이슈에서 고치지 않았다** — 2장 추출에서도 나타나 원인 축이 다르다.
      신 산출물 448p 의 venn 장(p214)을 확대해 보니 **재현되지 않았다.** 다만 그 사이 원고가 바뀌었고 원인을 못 박은 것이 아니므로 «고쳤다» 고 적지 않는다 —
      이슈후보의 «htmlart 고정 폰트 잔여 + 세로 넘침 — `venn`(28/18)» 과 같은 계열로 보이며, 그 항목이 이미 prj60 전수 4건(+4~15px)을 근거로 갖고 있다
    - 검증: `m2Slide_chapter_mode` 33p 회귀 rc 0 · `1.design_rnd` 전 6 챕터 폰트 격리 OK · 깨졌던 p6 을 렌더해 원문과 글자 단위 일치 확인

## Issue402: chapter mode `--pdf` 가 **덱 표지와 전체 목차**를 통째로 버린다 (등록: 2026-09-20, 해결: 2026-09-20, commit: `39126aa`) ✅
* 목적: 446p 배포본 1p 가 «1일차» 챕터 표지로 시작한다. 덱 제목도, 전 과정 차례도 PDF 어디에도 없다. 챕터마다 자기 표지·자기 목차가 있어서 **있는 것처럼 보이는** 것이 이 결함의 성질이다.
* 상세 (실측 2026-09-20 · prj60 `1.design_rnd`):
    - [m2slide.sh](m2slide.sh) PDF 루프가 `index.html`·`agenda.html` 을 **둘 다 `continue`** 로 건너뛴다. 주석은 *"index.html is redirect/cover (not a deck)"* 인데 **사실과 다르다** — chapter mode 의 `index.html` 은 `Reveal.initialize` 를 갖춘 **1장짜리 덱**이고 그 한 장이 덱 표지다(실측: 표제 `[설계·R&D] AI 활용 도면·기술문서 분석·지식화` · 부제 · 강사 배지)
    - `agenda.html` 은 정말로 Reveal 덱이 아니다(`<section>` 0개) — Markmap 랜딩이다. 그래서 `reveal` 플러그인으로는 못 뽑는다
    - 구 산출물 446p 의 p1·p2 = 1일차 챕터 표지·1일차 챕터 목차. 덱 표지와 전체 목차는 **0p**
* 구현 명세:
    - 로직: chapter mode 에서 `index.html` 은 `reveal` 로, `agenda.html` 은 `generic --max-slides 1` 로 한 장씩 뽑아 **표지·목차 순으로 앞에 붙인다**
    - 합본 순서를 **파일명 정렬에 맡기지 않는다** — `find | sort` 는 `agenda` 를 `index` 앞에 놓고, 접두 숫자를 붙여 맞추는 것은 `0-intro.html` 같은 이름 하나에 무너진다. 목록을 명시적으로 만든다
    - `agenda.html` 은 Reveal 덱이 아니라 **자기 크기를 모른다** — 형제 챕터가 HTML 에서 읽어 둔 값을 물려받는다(Issue396 의 «매핑표를 두지 않는다» 를 이어간다)
    - 검증: chapter mode·single mode 양쪽에서 중복·누락 없이 나오는지
* 해결:
    - `_pdf_export()` 로 «크기 산출 → decktape → 손실 대조 → 폰트 격리 검사» 를 한 자리에 모으고, 챕터·표지·목차가 **같은 절차**를 지나게 했다. 예전엔 챕터 경로에만 검사가 있었다
    - 목차 페이지의 **다운로드 버튼(PDF·PPTX)** 을 인쇄에서 뺐다 — 웹 UI 이지 인쇄물의 일부가 아니다. `--media print` + agenda 페이지 전용 인라인 `@media print` 규칙([html-builder.js](lib/html-builder.js)). ⚠️ `lib/css/base.css` 는 전 프로젝트 공유라 가드 대상이므로 **건드리지 않았다**
    - **single mode 는 그대로다** — 거기선 `index.html` 이 덱 자체라 표지·목차가 이미 안에 있다. 앞에 또 붙이면 중복이다
    - 검증: `m2Slide_chapter_mode` 31p → **33p**(표지·목차 2장 증가) · 순서 `000-cover → 001-agenda → 01-…` · 목차 페이지에 다운로드 버튼 없음 · `1.design_rnd` 446p → **448p**

## Issue400: htmlart `block` — 악센트 바가 글자를 덮는다 (등록: 2026-09-20, 해결: 2026-09-20, commit: `9a87f78`) ✅
* 목적: `block` 도해의 제목 첫 글자가 좌측 악센트 바에 가려 잘려 보인다. 접수 시 추정은 *"박스 너비가 자동으로 안 늘어난다"* 였으나 **실측 결과가 갈렸다** — 너비가 모자란 것이 아니라 바가 글자 위에 덧칠된 것이다.
* 상세 (실측 2026-09-20, `1.design_rnd` p26 `ChatGpt 의 장점`):
    - 악센트 바는 viewBox `x 24~48`, nodeBox 의 텍스트 영역은 `x=36` 부터 — **영역이 애초에 겹쳐 있다**
    - 제목 `빠른 응답 속도 — 실시간 대화에 적합함` 은 한 줄로 폭 703 을 채워 중앙정렬 시 좌변이 `x=40.5` → 바 우변 48 에 **7.5 단위(화면 7.4px) 가 깔린다**
    - 바가 foreignObject **뒤에** append 되어 페인트 순서상 위에 오므로 글자가 덮인다(`barPaintedAfter: true`)
    - 2·3번 항목은 2줄로 접혀 각 줄이 div 안쪽에서 짧아진 덕에 **우연히** 안 보였을 뿐, 텍스트 영역 자체는 똑같이 겹쳐 있었다
    - ⚠️ `fitFsFor`·`uniformTitleFs`·`nodeBox` 는 셋 다 박스 **전체 폭**(740)으로 셈하고 바의 존재를 모른다 — 바를 그리는 쪽과 글자를 앉히는 쪽이 갈려 있었다
* 구현 명세:
    - 로직: `nodeBox` 에 `padLeftExtra` 를 더해 **텍스트 영역(padding-left)과 fit 계산 양쪽에** 같은 값을 반영. 한쪽만 반영하면 통과한 폰트가 렌더에서 다시 깔린다(Issue364 가 남긴 것과 같은 자리)
    - **바에 자기 폭을 준다** — `blockW` 740 → `textW(740)+accentW(24)`. 반대로 textW 에서 24 를 빼면 `innerW` 712 → 688 이라 3항목 중 1항목이 1줄 → 2줄로 접혀 **겹침은 사라지되 판독성이 나빠진다**. 캔버스만 24 넓히면 글자 폭은 712 그대로다
    - `padLeftExtra` 기본값 0 → 나머지 20 타입은 1px 도 바뀌지 않는다
    - 검증: `1.design_rnd` block **15장 전수 겹침 0건**(최악 +7.4px → -10.1px, 줄 수 불변) · `m2Slide_visual_component` 21타입 foreignObject 150개 **넘침 0건** · `--lint-deployment` 0건
* 파생: 전수 계측 중 **캔버스 종횡비 낭비**가 따로 드러났다 — 본문 동거 장에서 `block` 이 가로의 21~53% 를 버린다(ex 2/48·3/56·6/30 은 1008px 중 ~495px 만 사용). 접수 시 추정이 겨눈 것이 이쪽이나 **같은 결함이 아니다**: 폰트는 이미 `blockH*0.30` 상한(37)에 걸려 있어 캔버스를 넓혀도 글자는 커지지 않고 줄 접힘만 준다. 🌱 이슈후보 「htmlart 캔버스 종횡비 정렬」로 이관

## Issue398: PDF 합본이 306p 를 **조용히** 잃는다 — 성공으로 보고된다 (등록: 2026-09-20, 해결: 2026-09-20, commit: `1d0ef84`) ✅
* 목적: `--pdf` 합본이 입력 페이지의 일부만 담는데 `rc 0` + `✅ Combined PDF` 로 **성공 보고**한다. 배포하고 나서야 안다. 손실 자체보다 **조용한 것**이 문제다.
* 상세 (실측 2026-09-20):
    - 재현: `./m2slide.sh 1.design_rnd --pdf` → decktape 가 6 챕터에 걸쳐 **Printed 446 slides**(91+71+74+70+69+71) 를 찍었는데 합본은 **140p**. **306p 소실**
    - 그런데 [combine-pdfs.py](lib/combine-pdfs.py) 는 `rc 0` 으로 끝나고 `✅ Combined PDF` 를 출력한다 — 어디에도 경고가 없다
    - 작은 덱에서는 안 난다 — `igTest` 는 Printed 39 → 합본 39p 로 온전하다. **대용량에서만** 표면화된다
    - 원인: 원본 `PDFDocument` 를 **루프 변수로만** 잡아 다음 반복에서 재바인딩되며 해제되고, 그때 이미 삽입한 `PDFPage` 가 함께 무효화된다(PyObjC 소유권). 작은 덱은 GC 타이밍상 살아남아 드러나지 않았다
    - ⚠️ **Issue396(`--size` 전달)이 촉발했다** — 페이지 픽셀이 1280×720 → 1920×1440 으로 4배가 되며 메모리 압박이 커졌다. 다만 **결함 자체는 그 전부터 `combine-pdfs.py` 에 있었고** 조건이 안 맞아 잠들어 있었을 뿐이다. 원인 축이 달라(decktape 크기 ↔ Quartz 병합) 별도 이슈로 가른다
* 구현 명세:
    - 로직: ① 원본 문서를 리스트에 담아 **끝까지 살려 두고** ② 페이지는 `copy()` 로 **복사해** 넣는다 (원본 수명에 얽히지 않게)
    - ③ **쓰기 전에 페이지 수를 대조**하고 불일치면 합본을 쓰지 않고 `rc 2` 로 죽는다. ④ 쓴 뒤 파일을 다시 열어 재확인한다 — `writeToURL_` 이 true 여도 산출물이 온전한지는 별개다
    - ⚠️ ③④ 가 이 이슈의 **본체**다. ①② 로 원인을 없애도 다음 원인이 오면 또 조용히 잃는다
    - 검증: `igTest`(39p) 회귀 0 + `1.design_rnd`(446p) 합본이 446p 인지 대조
* 해결 — **①만으로는 절반이었다.** 등록 시 원인을 PyObjC 소유권 하나로 단정했으나 실제로는 두 층이었다:
    - **① 병합 손실 (140p → 284p)** — 원본 문서 참조 유지 + 페이지 `copy()` 로 해소. 등록 시 분석이 맞았다
    - **② 상류 격차 (284p → 446p)** — decktape 가 찍은 446 장과 챕터 PDF 합계 284p 가 갈렸다. 이 층은 **「입력 합 = 출력 합」 검사로 구조적으로 안 잡힌다** — 입력이 이미 덜 담고 있으면 그 합끼리는 일치하기 때문이다. 그래서 [m2slide.sh](m2slide.sh) 가 decktape 출력을 `tee` 로 받아 `Printed N slides` 를 회수하고 **그 장의 산출 PDF 와 즉시 대조**한 뒤 총합을 `--expect N` 으로 합본까지 넘긴다
    - ⚠️ **②의 원인은 확정하지 못했다.** 계측을 넣은 뒤로 재현되지 않고 446p 가 온전히 나온다(전 챕터 Printed = PDF). 각 장 직후 PDF 를 열어 세는 동작이 파일 완결을 보장하는 부수 효과일 수 있으나 **추정이다**. 원인을 못 박지 못한 자리이므로 계측을 남긴다 — 다시 나면 그때는 **어느 장에서 갈리는지가 로그에 찍힌다**
    - 판정 한 줄: *"고친 것은 손실이고, 남긴 것은 손실을 숨기지 못하게 하는 장치다."*
    - 검증: `igTest` Printed 7·7·8·10·7 = **39 · 합본 39p** · `1.design_rnd` Printed 91·71·74·70·69·71 = **446 · 합본 446p** · 전 페이지 1440×1080(1.333) — Issue396 의 4:3 도 이로써 전량 검증됐다


## Issue396: `--pdf` 가 `slide_ratio` 를 무시해 4:3 프로젝트가 16:9 PDF 로 잘림 (등록: 2026-09-20, 해결: 2026-09-20, commit: `04b96e2`) ✅
* 목적: `_config.yml` 의 `slide_ratio` 가 HTML 빌드 경로에만 반영되고 PDF 변환 경로로 전달되지 않아, 4:3 프로젝트의 PDF 가 16:9 로 나오며 슬라이드 내용이 페이지 밖으로 잘린다. 계약을 이어 재발을 막는다.
* 상세:
    - 발견 경로: `Projects/1.design_rnd`(__lec 202609_Rebuild, `slide_ratio: "4:3"`) 를 `./m2slide.sh 1.design_rnd --pdf` 로 빌드. exit 0 이고 446p 합본이 생성되었으나 **전 페이지 레이아웃 붕괴**
    - 증상: 표지 제목이 페이지 좌측 1/3 에 작게 찍히고, 본문 슬라이드는 다이어그램 하단·불릿이 통째로 잘림. 읽을 수 없는 산출물
    - 계측: 생성 PDF 페이지 규격 **960 x 540 pt (비율 1.778)** / 같은 프로젝트의 생성 HTML 은 `Reveal.initialize({ width: 1920, height: 1440 })` (비율 1.333)
    - 원인: `m2slide.sh` 651행 decktape 호출에 `--size` 인자가 없다. decktape 는 미지정 시 기본 **1280x720(16:9)** 을 쓰므로, 프로젝트 비율과 무관하게 항상 16:9 PDF 가 나온다
    - 16:9 프로젝트에서는 우연히 일치해 드러나지 않는다 — **4:3 프로젝트에서만 표면화**되는 결손
* 구현 명세:
    - 로직: PDF 생성 블록에서 `_config.yml` 의 `slide_ratio` 를 읽어 decktape `--size` 로 전달한다. 매핑 — `4:3` → `1920x1440`, `16:9` → `1920x1080`, `3:2` → `1920x1280`. 미지정·`fill` 은 현행 기본값 유지
    - 참조: `slide_ratio` 파싱은 HTML 빌드 경로가 이미 하고 있으므로 그 값을 재사용한다 (별도 파서 신설 금지 — 판정 단일 지점)
    - 검증: `--size 1920x1440` 을 수동 지정해 2장(표지·본문) 실측 완료 → 페이지 **1440 x 1080 pt (1.333)**, 헤더·본문·다이어그램·하단 불릿 전부 정상 렌더 확인
    - 회귀: 4:3 프로젝트 1건 + 16:9 프로젝트 1건을 `--pdf` 로 뽑아 페이지 규격이 각각 1.333 / 1.778 인지 대조
* 해결:
    - **매핑표는 두지 않았다** — 명세가 제시한 «`4:3` → `1920x1440`» 표를 [m2slide.sh](m2slide.sh) 에 두면 그것이 곧 **두 번째 판정 지점**이 되어 [config.js](lib/config.js) 의 해석과 갈린다. 명세 자신이 요구한 «별도 파서 신설 금지 — 판정 단일 지점» 이 그 뜻이다
    - 대신 **산출 HTML 이 이미 갖고 있는 답을 읽는다** — `Reveal.initialize` 의 `width`/`height` 가 `slide_ratio` 해석의 **최종 결과**다. 비율이 늘어도 `m2slide.sh` 는 안 고친다. 추출은 전 프로젝트 **25 건에서 `slide_ratio` 와 일치** 확인
    - 읽기 실패는 조용히 넘기지 않고 경고한다 — 기본값으로 떨어져 **비율이 어긋난 PDF 가 성공처럼 나오는 것**이 이 이슈의 증상 자체였다
    - 📌 **영향 범위가 등록 시 기술보다 넓다** — 상세에 «16:9 에서는 우연히 일치해 드러나지 않는다» 고 적었으나 **실제 기본값은 3:2(1920×1280)** 다. 어긋나던 것은 4:3 만이 아니라 **3:2 프로젝트 대다수**였고, 우연히 맞았던 것은 `16:9` 를 명시한 2 건(`aTest_rt`·`LlmFlow`)뿐이다. 4:3 에서 유독 눈에 띄었을 뿐이다
    - decktape 호출 지점은 `m2slide.sh` **한 곳뿐**임을 전수 확인 — 다른 PDF 경로에 같은 결손은 없다
    - 검증(세 비율 모두 `--pdf` 실측): `16:9` aTest_rt **1440×810 (1.778)** · `3:2` igTest **1440×960 (1.500)** · `4:3` 1.design_rnd **1440×1080 (1.333)**


## Issue397: 흰 배경 캡처에서 이미지 테두리가 경계로 읽히지 않는다 — `--m2-media-border` 16% (등록: 2026-09-20, 해결: 2026-09-20, commit: `0971877`) ✅
* 목적: 발주처 prj60 `1.design_rnd` 1일차 80장(「표준 조항은 왜 요약이 어려운가」)의 ISO 머리말 캡처에서 **이미지 경계가 보이지 않는다**. 개요 피드백으로 *"이미지에 테두리"* 접수
* 상세 (실측 2026-09-20 · 빌드 HTML + CSS 대조):
    - ⚠️ **테두리가 없는 것이 아니다 — 이미 걸려 있는데 안 읽히는 것이다.** 신고를 문면대로 받으면 세 번 헛짚는다
    - ① 이미지는 `<div class="media-container"><img>` 로 **정상 배치**돼 있다(자동 2단 휴리스틱 결과). 이 슬라이드만의 예외가 아니다
    - ② `theme/default_lec/slide.css` 에 `.reveal .media-container img { border: 2px solid var(--m2-media-border, rgba(0,0,0,0.16)) }` 가 **이미 있다**
    - ③ 빌드 산출물 `slide/css/custom.css` 743행에도 같은 규칙, 485행에 변수가 **반영돼 있다**. 낡은 빌드가 아니다
    - ④ 남는 원인은 **값의 강도**다. 16% 검정은 흰 배경 스크린샷이 흰 슬라이드에 얹힐 때 경계로 지각되지 않는다
    - 공교롭게 그 CSS 주석 자체가 *"흰 배경 스크린샷이 흰 슬라이드에 얹히면 경계가 사라져"* 라는 의도를 적고 있다 — **의도는 맞았고 값만 부족했다**
* 구현 명세:
    - 판정 먼저 — `--m2-media-border` 를 **일괄 상향**할지, **밝은 이미지에만** 진한 테두리를 줄지 가른다. 일괄 상향은 어두운 배경 캡처에서 테두리가 과해질 수 있다
    - 팔레트별로 값이 갈리는지 확인한다(`theme/default_lec/palettes/`). 현재는 변수 기본값 하나로 보인다
    - ⚠️ **덱 쪽에서는 우회로가 없다** — 덱 단위 CSS 주입 키(`custom_css`·`extra_css`)가 0건이고 `slide/css/custom.css` 는 테마 복사 산출물이라 고쳐도 다음 빌드에 덮인다. 그래서 발주처가 아니라 여기서 고친다
    - 같은 덱에서 온 Issue392·Issue393 과 **원인 축이 다르다** — 저 둘은 `htmlart` 캔버스·폰트이고 이것은 raster 이미지 테두리다
* 해결 — **일괄 상향. 값은 눈대중이 아니라 WCAG 에서 역산했다**:
    - 실측으로 진단 확정 — 브라우저 computed style 이 `2px solid rgba(0,0,0,0.16)` · `.reveal` 배경 `rgb(255,255,255)`. 합성색 `#d6d6d6` → 대비 **1.45:1**. WCAG 2.1 §1.4.11(비텍스트 대비) 기준 **3:1 의 절반도 안 된다**. 이슈의 ④ 그대로였다
    - 값 결정 — 3:1 이 되는 회색이 `#949494` 이고 그것이 검정 **0.42** 다. 팔레트 5종 배경이 전부 near-white(`#FFFFFF`~`#FFF8F0`)라 **5종 모두 3.01~3.03:1** 로 들어온다 → 팔레트별로 값을 가를 필요가 없었다
    - ⚠️ **「밝은 이미지에만」 갈래는 셋 다 성립하지 않아 기각**했다:
        - ① 테두리가 읽혀야 할 상대는 **이미지가 아니라 슬라이드 배경**이고, 그 배경이 하나로 고정돼 있다
        - ② 어두운 캡처에서는 「과해지는」 것이 아니라 **이미 있는 경계에 묻힌다** — `obsidian-download.png`(평균 휘도 21) 장표 실측, 테두리가 이미지 가장자리에 흡수되어 그대로다. 등록 시 우려했던 부작용이 실재하지 않았다
        - ③ 런타임 밝기 판정은 **`file://` 배포에서 아예 불가능**하다 — 로컬 이미지를 canvas 에 올리면 tainted 되어 `getImageData` 가 SecurityError. [file-deployment-rules](.claude/rules/file-deployment-rules.md) 의 「단일 `.html` + `img/` 만으로 동작」 계약과 정면 충돌한다. 빌드 시점 판정도 PNG 디코더 의존을 들여와야 해 「외부 의존 0」 과 어긋난다
    - 검증 — p80 재빌드 후 computed 대비 **3.04:1**. `svg` 는 `0px` 로 불변(raster 한정 범위 유지). default_lec 3개 덱(1.design_rnd 446장 · igTest · AgenticCoding) 재빌드 정상 · `--lint-license` 3 theme 통과 · `--lint-deployment` 위반 0
    - 🚧 **남은 것 — `default`·`default_dark` 에는 이 테두리가 아예 없다.** 같은 결함 계열이지만 기존 덱 전부의 렌더가 바뀌므로 별건으로 가른다. `default_dark` 는 배경이 `#0c0e16` 이라 검정 alpha 로는 성립하지 않아 흰 alpha 로 다시 역산해야 한다
* 참조: 발주처 기록 prj60#Issue33 (피드백 20건 반영 — 이 건만 보류로 남겼다)

## Issue392: `radial` 인포그래픽이 본문과 세로로 쌓여 글자가 판독 불가 (등록: 2026-09-20, 해결: 2026-09-20, commit: `aa02735`) ✅
* 목적: 발주처 prj60 `1.design_rnd` 1일차 16장(「인공지능의 탄생 — 1956년 다트머스 회의」)에서 `htmlart radial` 이 **글자를 읽을 수 없을 만큼 작게** 렌더됐다. 개요 피드백으로 *"ig안의 글자 안보임. 좌우 배치"* 접수
* 상세 (실측 2026-09-20 · dev-server `?mode=text`):
    - 재현: `http://127.0.0.1:9877/p/1.design_rnd/s/1/16`
    - 구조: 도입문 `<p>` 1줄 + `.m2-htmlart.htmlart-radial`(`--htmlart-n:4`) + 본문 불릿 3개가 **한 슬라이드에 세로로 쌓인다**
    - 인포그래픽이 남은 세로 공간만 차지해 캔버스가 눌리고, 그 안 라벨이 따라 줄어 판독이 안 된다
    - 보고자가 제시한 해법은 **좌우 배치** — 인포그래픽과 본문 불릿을 나란히 두면 캔버스 세로가 살아난다
* 구현 명세:
    - 판정 먼저 — 원고에서 `::: columns` 로 감싸 해결할 일인지, 렌더러가 자동 분할해야 할 일인지 가른다. 휴리스틱 자동 2분할은 **리스트+이미지** 조합만 대상이라 htmlart 블록에는 걸리지 않는다
    - 자동 분할 대상을 htmlart 블록까지 넓힐지, 아니면 radial 캔버스에 최소 높이·폰트 하한을 둘지 결정
    - Issue364·Issue391 계열(폰트 auto-fit)과 인접하나, 여기서 눌리는 것은 **글자가 아니라 캔버스**라 판정이 다르다
* 해결 — **원인이 둘이었고 서로 다른 자리였다.** 좌우 배치만으로는 절반만 낫는다:
    - **① 눌린 캔버스** — `.m2-htmlart` 는 `flex:1 1 0` 으로 본문이 쓰고 남은 세로만 받는다(Issue197/198). 본문이 길면 그 잔여가 얇아지고 svg 는 viewBox 비율을 지키므로 **가로를 통째로 버리며** 축소된다(컨테이너 1017×253 · viewBox 812×710 → 배율 **0.356**, 가로 1017 중 289 만 사용)
    - ⚠️ **무조건 좌우 분할은 기각했다** — 전 프로젝트 실측 htmlart **331 장 중 304 장(92%)이 본문과 동거**한다. 대부분은 본문이 짧아 이미 충분한 세로를 받고 있고, 그 장까지 뒤집으면 덱 전체가 바뀐다. 빌드 시점 휴리스틱([preprocessHeuristic](lib/markdown.js))으로 가를 수 없는 이유도 같다 — **눌렸는지는 렌더 높이를 재야 안다**(게다가 그 휴리스틱은 raw `<div>` 가드에 걸려 htmlart 장에서는 애초에 돌지 않는다)
    - 그래서 판정은 **«옮기면 실제로 커지는가»** 하나다 — 좌우로 옮겼을 때 배율을 미리 셈해 **1.25 배 이상**일 때만 전환한다([relayoutSquished](lib/component-hooks/htmlart_dispatch.client.js)). 전환은 DOM 재배치뿐이고 재렌더가 없다(svg 가 viewBox 라 컨테이너만 따라 커진다). 표시 계약은 [components.css](theme/_shared/components.css) `.htmlart-side`
    - **② 박스가 콘텐츠에 비해 작음** — `uniformTitleFs` 는 형제 **최솟값**을 쓰므로 **한 노드의 과밀이 나머지 전부를 하한(10px)까지 끌어내린다**. 스포크 3 중 1 개만 부제 2 줄인데 셋 다 10px 였다. 좌우 배치로도 viewBox 안 비율은 그대로라 해소되지 않는다 → `boxNeedH()` 로 콘텐츠 실측해 박스를 키웠다(balance Issue395·timeline Issue283 과 같은 처방)
    - 부작용이 좁은 이유 — 목표 폰트가 기존 `fitFsFor` 의 start 상한과 **같은 식**이라 정상 노드는 `needH` 가 기본값(102)을 넘지 않아 1px 도 안 바뀌고, `Rr` 은 기존 274 를 **하한으로 남겨** 기본 케이스 반지름이 줄지 않는다
    - 검증(본문 `li` 44px 기준): 스포크 **6.1px(0.14 배) → 16.8px(0.38 배)** · 중심 12.8 → 20.1. 회귀 4개 덱 **79 장 전수 — 넘침 0 · 좌우전환 5 장(6%)** · p22 tab 은 이득 1.01 배라 **미전환**(캔버스가 거의 정사각)
    - 🚧 남은 것 — 본문 대비 0.25 미만이 3 장 남는다(`tab` 0.23 · `workflow` 0.24 · `cycle` 0.24). 좌우 전환 이득이 없는 장들이며 이슈후보 «캔버스 종횡비 정렬»·«고정 폰트 잔여» 계열이라 별건이다

## Issue393: `tab` 인포그래픽에서 항목 텍스트가 칸을 넘친다 (등록: 2026-09-20, 해결: 2026-09-20, commit: `7f5a6c7`) ✅
* 목적: 같은 덱 1일차 22장(「LLM 의 기본 원리 — 무엇을 배우고 무엇을 하는가」)에서 `htmlart tab` 의 글자가 칸 밖으로 넘어간다고 접수됐다 (*"글자 넘어감."*)
* 상세 (실측 2026-09-20 · dev-server `?mode=text`):
    - 재현: `http://127.0.0.1:9877/p/1.design_rnd/s/1/22`
    - 구조: `.m2-htmlart.htmlart-tab`(`--htmlart-n:2`), 각 탭이 제목 1줄 + 하위 불릿 3줄을 담는다
    - Issue364(폭 축 auto-fit)·Issue391(chevron)과 같은 계열이나 `tab` 은 **세로로도 넘친다** — 하위 불릿 3줄이 탭 높이를 초과한다
* 구현 명세:
    - `tab` 렌더러에 폰트 auto-fit 이 걸려 있는지부터 확인한다 (`chevron` 처럼 통째로 빠져 있을 수 있다)
    - 폭·높이 **양축** 판정이 필요하다. 폭만 맞추면 세로 넘침이 남는다
* 해결 (실측이 이슈 추정과 갈렸다):
    - **넘치는 것은 항목이 아니라 탭 제목이었다.** 항목(`nodeBox`)은 `uniformTitleFs` 로 이미 fit 되어 있어 foreignObject 넘침 **0건**이고, 세로도 `rowH` 가 항목 수에서 역산되므로 구조적으로 넘치지 않는다 — 즉 «양축 판정» 은 필요 없었다
    - 실제 결함은 탭 제목의 **26px 고정**이다. 「학습 프로세스 — 무엇을 배웠나」 14.96em → 389 단위로 `tabW` 300 을 **89 초과**해 사다리꼴 밖 패널 위에 걸쳤다
    - ⚠️ 이 결함이 [htmlart-fo-audit.mjs](z_test/htmlart-fo-audit.mjs) 에 **안 잡힌 이유** — 그 감사는 foreignObject 기준인데 탭 제목은 SVG `text` 다. 같은 이유로 `fitFsFor`(줄 수 기반)도 쓸 수 없다(SVG `text` 는 wrap 이 없다) → 한 줄 폭만 본다
    - 처방은 chevron(Issue391)과 갈린다 — **폰트를 줄이기 전에 탭을 넓혔다**. tab 은 캔버스 788 중 탭이 300 이라 가로 여유가 있고, 탭 라벨은 그룹을 가르는 표제라 작아지면 구조가 안 읽힌다. 넓혀도 모자랄 때만 축소(하한 12px)
    - 검증: 넘침 +89 → **-11.7 / -16.3**(탭 안), 폰트 **26px 유지**. 회귀 4개 덱 79 장 전수 넘침 0

## Issue395: `balance` 라벨 박스가 콘텐츠를 따라 늘지 않아 글자가 잘린다 (등록: 2026-09-20, 해결: 2026-09-20, commit: `b1dae17`) ✅
* 목적: 같은 덱 5일차 17장(「청구항을 넓게 쓰는 것과 좁게 쓰는 것」)에서 저울 접시 위 라벨 박스의 **제목 윗줄이 반쯤 잘리고 부제도 아래로 잘린다**. 접수 문구 *"컨텐츠 부분이 위로 늘어나지 않아서 글자가 짤림"*
* 상세 (실측 2026-09-20 · `z_test/htmlart-fo-audit.mjs` ONLY=balance):
    - 재현: `http://127.0.0.1:9877/p/1.design_rnd/n/5/17`
    - 5일차 balance 3장(5·17·58)의 **foreignObject 6개 전부** 세로 넘침 — overV 4.2 · 4.5 · 8.9 · 14.1px
    - 원인은 `renderBalance` 의 `plateH=78` **고정**이다. 제목 22px·부제 13px 도 고정이라 auto-fit 이 통째로 빠져 있었다 (Issue391 chevron 과 같은 계열의 잔존 부재)
    - 박스 내부가 `justify-content:center` 라 넘칠 때 **위·아래로 균등하게** 벌어지고 foreignObject 가 그 바깥을 잘라 낸다 → 화면에는 「윗줄이 잘린 제목」으로 나타난다
    - 가로는 여유가 있었다(over 전부 음수) — **세로 전용** 결함이다
* 구현 명세:
    - `plateH` 를 `wrapLines` 실측으로 산출한다. 박스는 접시 **위에** 놓이므로 높이를 키우면 자연히 위로 자란다 — 캔버스(820×460)는 건드리지 않는다(상단 여백이 이미 270px 남아 있었다)
    - 좌·우는 **큰 쪽으로 통일**한다. 따로 재면 시소 양팔의 박스가 어긋난다
    - 상한은 기울어진 팔 위에서 박스가 캔버스 상단을 넘지 않는 높이. 걸리면 폰트를 줄여 맞추고, 줄여도 안 들어가면 **`console.warn` 으로 알린다** — 조용히 자르지 않는다
    - 계산 계수(line-height 1.1·1.3·padding)는 렌더 style 과 **한 쌍**으로 고친다. 한쪽만 고치면 통과한 값이 렌더에서 넘친다
* 결과 (실측 2026-09-20):
    - `renderBalance` 가 `wrapLines` 로 제목·부제 줄 수를 재어 `plateH` 를 정한다. 좌·우는 큰 쪽으로 통일, 상한 초과 시 폰트 축소 → 그래도 넘치면 `console.warn`
    - balance foreignObject 넘침 **6/6 → 0**. 5일차 전 타입 145개에서도 0
    - 박스 78 → **132/140px** 로 자라고 폰트는 22px 불변 (글자를 줄여 맞춘 것이 아니라 박스를 키웠다)
    - 데모 27종 덱(`m2Slide_visual_component`)의 balance 는 **78px 그대로** — 짧은 라벨은 기존 기하를 유지하므로 회귀 0
* ⚠️ 귀속 정정: 코드 본문은 `eceb243`(Issue394 step)에 **딸려 들어갔다** — 그 세션이 파일 단위로 스테이징해 이 세션의 미커밋분을 함께 담았다([issue-g](~/.claude/rules/issue-g.md) 규칙10 이 경고하는 형태). 되돌리지 않고 `b1dae17` 에서 주석 귀속만 바로잡았다
* 남는 것 (별건):
    - 원고가 `**넓은 청구항** / 구성요소가 적음` 처럼 **compare 의 `/` 문법**으로 쓰여 있어 `/` 가 라벨에 그대로 노출된다. `balance` 는 그 문법을 갖고 있지 않다 — 원고를 고칠지 balance 에 파싱을 더할지는 별도 판정
    - 캔버스 상단 여백이 여전히 크다(도해가 아래로 몰린다). Issue390 계열(캔버스 종횡비) 사안


## Issue394: `step` 상승 연결선이 박스 뒤로 숨어 진행 방향이 읽히지 않음 (등록: 2026-09-20, 해결: 2026-09-20, commit: eceb243) ✅
* 목적: 계단형 `htmlart step` 에서 단과 단을 잇는 선이 어디로 가는지 보이지 않는다. 계단의 의미는 «다음 단으로 올라간다» 인데 그 방향을 그림이 말해 주지 못한다.
* 상세:
    - 실발생: `Projects/1.design_rnd` 01-day1.md `#id-coa-llm-position` — 3단 계단 사이에 연회색 세로 토막만 보이고 화살표가 없다
    - 원인 1 — **라이저가 역행해 박스 뒤로 숨는다.** `stepX = boxW*0.74` 라 다음 박스 왼쪽 가장자리가 현재 박스 오른쪽 가장자리보다 `0.26*boxW` **왼쪽**에 있다. ㄱ자 경로 `M x1 y1 L x2 y1 L x2 y2` 의 수평 구간이 `x2 < x1` 이라 되돌아가며, 그 구간이 통째로 박스 i 영역 안이다. 연결선 `g` 를 박스보다 먼저 그리므로 그대로 덮인다
    - 원인 2 — **화살표 머리가 아예 없다.** `renderProcess`·`renderArrow` 와 달리 `stroke` 만 있고 marker·polygon 이 없다
    - 원인 3 — **색이 테두리색이다.** `--htmlart-box-border`(기본 `rgba(0,0,0,.3)`)라 강조 요소가 아닌 보조선으로 읽힌다
    - 원인 4 — **화살표가 설 자리가 없다.** `stepY = boxH*1.06` 이라 단 사이 세로 여유가 `0.06*boxH ≈ 7px` 뿐이다. 색만 바꿔도 7px 안에서는 방향이 안 보인다
* 구현 명세:
    - `renderStep()` — 단 간격을 `stepY = boxH*1.30` 으로 벌려 화살표 자리를 만들고, `stepX = boxW*0.90` 으로 함께 넓혀 캔버스 종횡비(≈1.6:1)를 유지한다
    - ㄱ자 라이저를 버리고 **우상향 대각 화살표**로 바꾼다 — 박스 i 윗변 86% 지점 → 박스 i+1 아랫변 14% 지점. 계단 상승 방향과 벡터가 일치한다
    - 색은 `--htmlart-accent`. 방향이 이 타입의 의미 자체이므로 `renderArrow` 와 같은 취급이다 (`--htmlart-arrow` 회색은 보조선용)
    - 머리는 `polygon` 직접 계산 — 짧은 선분이라 `markerUnits` 기반 스케일이 과하게 걸린다
    - 검증: `1.design_rnd` 빌드 후 화살표 `polygon` 개수 = 단 수 − 1, 화살표 bbox 가 박스 bbox 에 가려지지 않음
* 결과: `1.design_rnd` p23(3단)·`m2Slide_visual_component` 5.13(4단) 양쪽에서 단마다 accent 우상향 화살표가 보인다. 화살표 중심의 topmost 요소가 polygon 자신이라 박스에 가려지지 않음을 DOM 으로 확인했고, 캔버스 종횡비는 1.62:1 → 1.60:1 로 사실상 유지됐다. `htmlart-fo-audit` 전수 29장 넘침 0.
* 관측(별건): 본 검증에서 **ego-browser 캡처가 1회 성공**했다. [apply-verify-rules](.claude/rules/apply-verify-rules.md) §4.2 의 Playwright 예외는 «ego 캡처 15초 타임아웃» 실측을 근거로 하는데 지금은 그 전제가 성립하지 않는다. 예외 해제 판정은 글로벌 Issue653 소관이라 여기서는 사실만 남긴다.



## Issue391: `chevron` 라벨이 이웃 도형에 덮여 사라진다 — 유일하게 폰트 auto-fit 이 없는 타입 (등록: 2026-09-20, 해결: 2026-09-20, commit: `ef8c158`, `597ee09`) ✅
* 목적: 발주처 prj60 `__lec` 3일차 「크롤링의 기법」에서 `페이지네이션` 이 **`|이지네이·` 로 좌우가 잘려** 보고됐다. Issue364(폭 축 auto-fit)가 **`chevron` 만 빠진 채** 종결돼 남은 잔여 케이스다. 다른 타입은 `fitFsFor` 로 폰트를 낮춰 담는데 `chevron` 은 **낮추는 코드 자체가 없다**
* 상세 (실측 2026-09-20 · ego-browser · prj60 `03-day3.html`·`06-day6.html`):
    - **원인 ①  폰트가 고정이다.** [renderChevron](lib/component-hooks/htmlart_dispatch.client.js#L797) 은 `nodeBox` 가 아니라 `centerLabel(svg, …, 29, 19)` 을 부른다 — **제목 29px·부제 19px 하드코딩**이고 `uniformTitleFs`/`fitFsFor` 를 거치지 않는다. `process`·`step`·`timeline` 등은 전부 `nodeBox` 경로라 `widthCap` 이 걸린다
    - **원인 ②  중간칸 유효 폭이 노치에 깎여 127px 뿐이다.** `chW=290, tip=chH*0.4=81.6` 이고 라벨 폭은 `chW-tip-notch` 다. 첫 칸만 `notch=0` 이라 208px 이고, **2번째 칸부터는 `290-81.6-81.6=126.8px`**(`centerLabel` 의 `padding:0 6px` 제외 115px). 29px 고정 + `word-break:keep-all` 이면 **공백 없는 한글 5자부터 넘친다**
    - **원인 ③  경고가 없다.** [data/htmlart/types.yml](data/htmlart/types.yml) 의 `chevron` 항목에 **`max_chars` 가 아예 없다** → `markdown.js` 의 Issue364 경고가 이 타입에서는 절대 뜨지 않는다. 같은 절 주석은 *"상한을 넘겨도 잘리지는 않는다 — `fitFsFor` 가 폰트를 낮춰 담는다"* 고 적고 있으나 **`chevron` 에는 그 전제가 성립하지 않는다**
    - **Issue364 와 다른 점**: 364 는 `overflow:hidden` 2중 클리핑에 **세로로** 삼켜지는 것이었다. 이쪽은 **가로로 삐져나간 뒤 다음 polygon 이 그 위에 그려져 덮인다** — DOM 상으로는 아무것도 클리핑되지 않아 성격이 다르다
    - 🔴 **기존 계측 4종이 전부 통과시킨다** — 클리핑 조상이 없고(삐져나가는 것이라), 슬라이드 경계 안이고, SVG 내부라 형제 겹침에서 제외된다. 실제로 prj60 이 `slide-audit.mjs` 로 0건을 받은 장에서 사용자가 육안으로 잡았다
    - **실측치** (prj60 6일차 「RAG 세 글자의 뜻」, 3노드):

      | 라벨 | foreignObject 폭 | 텍스트 실폭 | 초과 |
      | :--- | ---: | ---: | ---: |
      | `Generation — 답하기` | 240px | 274px | **34px** (좌우 17px씩) |
      | `Augmented — 붙이기` | 240px | 247px | 7px |

    - ⚠️ **계측 기준을 내부 div 로 잡으면 0건이 나온다**(1차 오탐으로 겪었다) — flex 자식이라 `max-content` 로 늘어나 텍스트는 언제나 div 안에 들어맞는다. **기준은 foreignObject 경계**여야 한다
* 구현 명세:
    - **최소 수정**: `renderChevron` 이 `uniformTitleFs(items, chW-tip*2, chH)` 를 구해 `centerLabel` 에 넘긴다. 다만 `centerLabel` 은 `titleFs`/`subFs` 를 인자로만 받으므로 호출부 한 줄로 끝난다. 폭 인자는 **가장 좁은 칸(중간칸) 기준**이어야 한다 — 첫 칸 기준으로 재면 여전히 넘친다
    - **함께**: `types.yml` 의 `chevron` 에 `max_chars` 를 넣어 경고 경로를 살린다. 폰트 fit 이 들어가면 상한은 *"넘으면 작아진다"* 의 의미가 되므로 다른 타입과 같은 성격이 된다. fit 전 임시값은 **중간칸 4자**다
    - **검증**: `foreignObject` 경계 대 텍스트 실폭 계측 — prj60 `Project/202609_Rebuild/1.design_rnd/_pipeline/tools/slide-audit-fo.mjs` 가 이미 그 형태로 있다 (볼륨이 달라 상대링크 불가 — 경로 그대로 표기). 수정 후 208장 전수에서 0건이어야 한다
    - ⚠️ **`chevron` 을 폐기하지 않는다** — 강한 진행감이 필요한 자리가 있고, 짧은 라벨(2~4자)에서는 정상 동작한다. 고칠 것은 **폰트 고정**이다
* 📌 발주처 회피는 이미 끝났다 (prj60, 2026-09-20): 해당 2장을 `htmlart process` 로 교체하고 `DESIGN.md` 상한 표에 *"`chevron` 중간칸 4자"* + 판정 한 줄(*"공백 없이 5자를 넘는 토막이 있으면 `chevron` 을 쓰지 않는다"*)을 박았다. **본 이슈가 막고 있는 것은 없다**
* ✅ 결과 (2026-09-20 · `ef8c158` 정책 · `597ee09` 코드):
    - [renderChevron](lib/component-hooks/htmlart_dispatch.client.js): `Math.min(29, uniformTitleFs(items, labelW+12, chH))` — 중간칸(`chW-2*tip` = 126.8) 기준 체인 균일 fit. `centerLabel` padding 6 과 `fitFsFor` 가 전제하는 12 의 차를 `+12` 로 보정해 innerW 가 실제 안쪽 폭+안전 8 이 되게 했다. 짧은 라벨(2~3자 어절)은 29px 그대로 — 저장소 데모(`m2Slide_visual_component` 5장 14번) 5개 라벨 29px 불변 실측
    - [types.yml](data/htmlart/types.yml) `chevron`: `max_chars: 14` + 신설 `max_token_chars: 4`. [markdown.js](lib/markdown.js) 가 가장 긴 토막을 렌더러 `longestTokenEm` 과 같은 구분자로 잘라 따로 경고한다 — `페이지네이션` 은 총량 6자라 총량 상한으로는 영영 경고되지 않았다. 테스트 6건 추가([markdown.test.js](lib/__tests__/markdown.test.js) 72/72)
    - 실측 (ego-browser · foreignObject 경계 대 텍스트 실폭·실높이):

      | 대상 | 수정 전 | 수정 후 |
      | :--- | :--- | :--- |
      | 픽스처 `페이지네이션` | +40px (29px) | 0 (17px) |
      | 픽스처 `Generation — 답하기` | +19.8px | 0 (18px) |
      | 픽스처 부제 동반 `6-2 — 그 볼트를 그대로 올림` | 가로 0 · **세로 +28/+32px** | 0 (23/15px) |
      | prj60 6일치 427섹션 · htmlart 204장 · fo 841 | — | chevron 0건 |
      | 저장소 데모 5장 chevron 5라벨 | 29px | 29px 불변 |

    - 🔍 **세로 축은 등록 시점엔 몰랐다** — 가로만 재던 계측이 놓친 두 번째 결함(부제 동반 장이 fo 클리핑으로 조용히 잘림)이 같은 fit 으로 함께 해소됐다. 재사용 도구 [z_test/htmlart-fo-audit.mjs](z_test/htmlart-fo-audit.mjs) 는 두 축을 다 잰다. 진단 기록: [debug_TECH.md](_doc_work/debug_TECH.md) 2026-09-20 항목
    - ⚠️ 제목의 *"유일하게"* 는 체인형 한정이다 — `centerLabel` 을 고정 폰트로 부르는 곳이 셋 더 있다(`venn` 28/18 · `hexagon` 25/17 · `pie` 20/15). prj60 전수에서 `venn` 4건·`balance` 10건이 **세로로** 넘친다 → 🌱 이슈후보 등재
    - 부기: `--lint-data` 실패 9건은 전부 `Projects/1.design_rnd`(prj60 심링크) `DESIGN.md`·`AUTHORING.md` 텍스트 위생 건이라 본 변경과 무관 · prj60 `DESIGN.md` 의 *"chevron 중간칸 4자"* 회피 규칙은 이제 빌드 경고가 같은 판정을 낸다(회피 해제는 prj60 판단)

## Issue390: htmlart 캔버스 종횡비가 본문 영역과 어긋나 도해가 작게 그려진다 — `arrow` 는 가로 40% 를 버린다 (등록: 2026-09-20, 해결: 2026-09-20, commit: `26bba40`) ✅
* 목적: 4:3 덱에서 htmlart 도해가 본문 영역을 다 못 쓰고 가운데 작게 그려진다. SVG `preserveAspectRatio` 기본값이 `meet` 이라 캔버스·컨테이너 중 **짧은 축**에 맞춰 축소되는데, 타입별 캔버스 종횡비가 본문 영역과 크게 어긋나 있다. 가장 심한 `arrow` 부터 잡는다
* 상세:
    - **실측** (prj-lec `1.design_rnd` 3일차 · 창 1920x1080 · `slide_ratio: "4:3"` · `#/4` 슬라이드)
        - 본문 `.contents-body` **1356x717 = 1.89:1**. htmlart 블록은 `flex:1 1 0` 으로 남는 세로를 **이미 전부 받은 상태**라 CSS 로 더 짜낼 여지가 없다 (형제는 불릿 UL 68px 뿐)
        - `arrow` 캔버스 **950x844 = 1.13:1** → 높이 717 에 맞춰지며 실폭 **807**. **가로 1356 중 549px(40%) 를 버린다**
    - **원인 위치**: [renderArrow](lib/component-hooks/htmlart_dispatch.client.js#L854) `var nodeW=210, nodeH=104, Rr=330 … var cx=Rr+nodeW/2+40, cy=Rr+nodeH/2+40, W=cx*2, H=cy*2`. `d3.pointRadial(i*step, Rr)` 로 **반지름 단일 원**에 배치하므로 M 과 무관하게 캔버스가 항상 정사각에 가깝다
    - **같은 덱 3일차 렌더 28개 분포** (본문 1.89:1 기준)
        - 가로를 버림 18개 — funnel 1.03 · venn 1.07 · **arrow 1.13** · bracket 1.25~1.85 · block 1.33 · hexagon 1.55 · step 1.62 · numbered 1.66 · balance 1.78
        - 세로를 버림 7개 — timeline 2.81 · chevron 2.83~4.41 · process 3.29 · hierarchy 3.38 · workflow 4.08
        - 맞음 3개 — callout 1.88
        - 덱 전체 `arrow` 사용 **7장**
    - **선례가 같은 파일에 있다** — Issue363 이 `callout` 에서 같은 4:3 증상을 `wide` 캔버스 변형으로 해결했고 [types.yml](data/htmlart/types.yml) `callout.orientation_note` 에 선택 기준을 남겼다. Issue364 가 확인한 대로 `slide_ratio` 는 `htmlart_dispatch.client.js` 에 **도달하지 않으므로** 판형 분기가 아니라 **캔버스 종횡비 자체**로 푼다
* 구현 명세:
    - **배치**: 단일 반지름 `Rr` 를 타원 `Rx`/`Ry` 로 분리해 가로로 퍼뜨린다. `d3.pointRadial` 대신 `x=cx+Rx*sin(θ)`, `y=cy-Ry*cos(θ)` (θ=i*step, 0 이 위쪽 — 기존 `pointRadial` 과 시작 각·회전 방향을 맞춘다). 목표 캔버스 종횡비 **1.8~1.9**
    - **화살표는 손대지 않아도 된다** — `rectEdge` 가 방향 단위벡터 기반이라 배치만 바꿔도 성립한다 (Issue205 에서 방향 인식으로 고쳐둔 덕). 다만 타원 배치는 좌우 노드의 진입각이 눕게 되므로 머리·꼬리가 박스에 묻히지 않는지 재확인
    - **M 스윕**: 입력 2~6 에서 노드가 겹치지 않는지 확인. 특히 M=2(좌우 1쌍)·M=4(상하좌우) 가 타원에서 극단이 된다
    - **검증**: `1.design_rnd` 3일차 `#/4` 에서 SVG `getBoundingClientRect().width` 가 컨테이너 1356 에 근접하는지 실측. 나머지 `arrow` 6장 육안 확인. 3:2·16:9 덱에서 회귀 없는지 대조
    - **범위**: 본 이슈는 `arrow` 1종. 가로를 버리는 나머지 8종(17장)은 원인이 같으나 타입마다 배치 재설계가 필요해 **별건**으로 이슈후보에 남긴다
* 해결:
    - **배치**: 단일 반지름 `Rr` 를 타원 `Rx`/`Ry` 로 분리했다. 세로 `Ry=210` 만 고정하고 가로 `Rx` 를 목표 종횡비(1.87)에서 **역산**한다 — M 이 달라져 노드 각도가 바뀌어도 캔버스 비율이 흔들리지 않는다. 각도 규약은 그대로다(`d3.pointRadial(t,R) === [R*sin(t), -R*cos(t)]`, t=0 이 위쪽)
    - **M=2 만 예외** — 상하 1쌍이면 `Rx` 가 배치에 쓰이지 않아 캔버스가 되레 세로로 길어진다(0.55:1). 좌우로 눕혀 «좌 → 허브 ← 우» 로 둔다. 납작하지만(4.50:1) 폭을 100% 쓰고 수렴 의미와도 맞는다
    - **화살표는 손대지 않았다** — `rectEdge` 가 방향 단위벡터 기반이라(Issue205) 배치만 바꿔도 성립한다. 명세가 지목한 «좌우 노드의 눕는 진입각» 은 전 M 에서 머리 묻힘 **0건**으로 실측 확인
    - **실측** (`1.design_rnd` 3일차 `#/4` · 창 1920x1080 · 4:3 — 이슈 등록 시와 같은 조건)

      | 축 | 전 | 후 |
      | :--- | ---: | ---: |
      | 캔버스 | 950x844 = 1.13:1 | **1129x604 = 1.87:1** |
      | 실폭 (컨테이너 1356) | 807 (59%) | **1340 (99%)** |
      | meet 스케일 | 0.849 | **1.187** |

    - **arrow 7장 전부** 같은 배율(1.66배 = 1.869/1.126)로 커졌다. 장별 활용률(46~99%)이 갈리는 것은 htmlart 블록에 배분된 **세로 높이** 차이지 캔버스 종횡비가 아니다 — 그 축은 본 이슈 밖
    - **M 스윕 2~8** (수치 + 브라우저 실렌더 양쪽): 노드 겹침 0 · 캔버스 이탈 0 · 화살표 머리 묻힘 0 · 몸통 최소 59px(머리 46px 보다 큼). M=3~8 은 캔버스 1129x604 로 **고정**
    - **판형 회귀 없음**: 4:3·3:2·16:9 세 판형에서 같은 캔버스가 나온다 — `slide_ratio` 가 이 파일에 도달하지 않는다는 Issue364 의 확인과 일치한다. `--lint-deployment` rc0
    - **카탈로그**: [types.yml](data/htmlart/types.yml) `arrow.canvas_note` 에 선택 근거를 남겼다 — `callout.orientation_note`(Issue363)와 같은 자리이므로, 나머지 8종을 잡을 때 여기서 시작한다
    - ⚠️ `--lint-data` 는 rc1 이지만 위반 7건은 전부 `1.design_rnd` 원고의 이슈 번호 표기로 **선행 상태**이며 본 이슈와 무관하다(작업트리 미변경 확인)

## Issue389: 왕복 — 정방향이 pptx 로 옮기지 않아 신호 자체가 없는 2축 (등록: 2026-09-20, 해결: 2026-09-20, commit: `2d734b3`, `3cbe7c8`, `cce46d7`, `ecddf22`) ✅
* 결과:
    - ① `part_label` — **테마 조건부였다.** `{{part}}` 슬롯은 `default_lec` 에만 있어 `default` 덱은 HTML 도 그 글자를 렌더하지 않는다(aTest-all HTML 0회 · igTest 5회). 원고의 `::: part` 유무로 판정하면 `default` 덱 pptx 만 더 보여주는 새 불일치가 됐을 것이므로 lane T 가 **빌드 산출 HTML** 을 읽어 판정한다. igTest `part_label` 5/5 · `paragraph` −5 → 0
    - ② `cards_hyperlink` 2/2 · ③ 카드 코드 인라인 포함 `inline_emphasis` 62/62 — 원인은 **원문이 두 번 벗겨지는 것**이었다(`build-source` ⑫ `strip_inline` → lane T 가 도형에서 다시 평문 읽기). `items_md` 를 나란히 싣고 lane T 가 run 을 쪼개 되입힌다
    - **고아 rel 규칙은 늘리지 않는다** — 그 rel 은 lane B 가 링크를 걷고 다시 안 달아 생긴 **이 결함의 증상**이었고, 수리 후 0 이다(p19 실측). 남아 보였던 p50 4건은 **표 셀 안** 링크라 제 스캔이 표를 훑지 않은 오탐이었다(`table` 20/20 · `hyperlink` 1/1 통과). 동기가 사라졌고, `check-assembly.py` 는 글로벌 SCAR 라 여기서 고칠 수도 없다
    - 구 계약의 *"고칠 곳은 글로벌 `ppt-info` 라 m2slide 안에서 못 고친다"* 는 **틀렸다** — 카드를 최종적으로 그리는 주체는 lane T `redraw_cards` 다(Issue349)
* depends: Issue388
* 목적: Issue388 과 같은 순환 테스트에서 나온 차이 중 **pptx 에 신호가 아예 없는** 것들이다. 되찾으려면 정방향이 옮겨야 하고 그것은 **pptx 의 보이는 꼴을 바꾼다** — 그래서 역변환 단독 수정인 Issue388 과 갈라 둔다
* 상세:
    - **① `part_label` 5→0 · `paragraph` −5 (같은 5건)** — 챕터 머리의 `::: part` 라벨(`Chapter 1.`~`Chapter 5.`)이 pptx 에 **한 글자도 없다**. HTML 챕터 layout 은 그것을 제목 위에 렌더하므로 이것은 원고 축이 아니라 **보이는 것의 차이**다
    - Issue386 이 이 축을 `declared_drop`(`reverse_action: none`)으로 선언해 러너를 초록으로 만들었다. 선언은 *"모르는 손실"* 을 없애는 장치이지 손실을 정당화하는 장치가 아니므로, 옮길 수 있으면 옮기는 것이 맞다
    - **② `cards_hyperlink` 2→0** — `::: cards` 안의 `[글자](URL)` 이 도형 글자로만 남고 링크가 빠진다. 다만 **URL 자체는 슬라이드 rel 에 남아 있다**(실측 p19 외부 rel 2건: `github.com/Finfra/m2slide`·`finfra.github.io/m2slide`) — 어느 run 도 그것을 참조하지 않는 **고아 rel** 이다. 즉 lane B 가 원래 문단을 걷을 때 rel 을 지우지 않았고 새 도형에 달지도 않았다
    - 부수 관측 — 고아 외부 rel 은 `8.assembly` 의 5규칙에 걸리지 않는다(그 규칙은 *지운 슬라이드*의 rel 만 본다). 규칙을 늘릴지는 이 이슈에서 판단한다
    - **③ 카드 안 코드 인라인 1건** — lane B 가 카드 본문을 단일 run 으로 평탄화해 `_config.yml` 의 서식이 사라진다(Issue388 ③ 이 못 잡는 나머지)
* 구현 명세:
    - ⚠️ **글로벌 `ppt-info` 는 무수정 호출이다**(CLAUDE.md lane B). 그러므로 수리 지점은 `lib/pptx/lane-b.py` 의 **병합 단계**이거나 `build-source.py` 의 표시 단계다 — 카드 도형이 자리를 잡은 뒤 링크·서식을 run 에 다시 입히는 후처리
    - ① `::: part` 는 챕터 진입 장에 텍스트 도형으로 심는다. 좌표는 HTML computed style 실측으로 정한다(Issue379 와 같은 절차). lane T 소관으로 보이나 착수 시 재확인
    - 시각 축이 바뀌므로 `check-visual`·`3.parity` 를 반드시 함께 돌린다. 되찾으면 `fidelity.yml` 의 `part_label`·`cards_hyperlink` 등급을 올린다
    - **구조적으로 못 되찾는 축은 이 이슈 밖이다** — `inline_symbol`(`:fa-*:` 글리프 폰트 부재) · `mermaid_fence`(pptx 에 렌더 PNG 만 남고 원본 소스가 없다) · `component_fence`·`wordart_fence`(웹 전용). 이들을 되찾으려면 **원고 조각을 pptx 안에 밀반입**해야 하므로 별도 결정이 필요하다


## Issue388: 왕복 — 역변환이 pptx 에 남은 신호를 못 읽어 3축을 버린다 (등록: 2026-09-20, 해결: 2026-09-20, commit: `015ab97`, `813effe`) ✅
* 결과:
    - ① `h1_chapter` — chapter mode 3덱 전부 왕복(aTest-all 6/6 · igTest 5/5 · m2Slide_chapter_mode 7/7). **자리가 둘이었다** — `# H1` 만 있던 장은 TOC 로 바뀌고, `# H1`+`## H2` 한 장은 진입 장 **뒤에** TOC 가 붙는다. 구 계약의 recover 지침(*"첫 본문 장에 붙인다"*)대로 했다가 무관한 본문 장이 진입 장으로 오인돼 `h2_slide_title` −6 · `bullets` −21 · `slide_order` −11 로 깨졌고, 사전 패스로 갈라 해결
    - single mode(aTest) 1건은 남는다 — `cards_placeholder: false` 가 **HTML·pptx 양쪽에서** 그 장을 지우므로 산출물끼리는 어긋나지 않는다. 원고 축만의 격차이고 정방향 표식이 필요해 이슈후보로 넘겼다
    - ② 카드 본문이 **블록 밖으로 새던** 것 해소 — `bullet_nesting` aTest ±3 · aTest-all ±11 · igTest ±8 → 0. lane B 가 카드를 세 도형(테두리·제목 띠·본문 TextBox)으로 그리는데 역변환이 AUTO_SHAPE 만 봤다
    - ③ 코드 인라인 — 서체 명시가 신호다. 전수 실측에서 **오탐 0**(본문 run 중 `latin` 명시 6개가 전부 코드 인라인, 일반 불릿 268 run 은 0)
* 목적: 사용자 지시(2026-09-20) — *"aTest·aTest-all 을 렌더 → pptx → m2slide 로 되돌려 **차이가 없게끔** 순환 테스트"*. `6.roundtrip` 는 두 덱 모두 rc0 이지만 그것은 *"선언된 차이는 통과"* 라는 뜻이고 차이 0 이 아니다. 실측한 차이 중 **신호가 이미 pptx 에 있는데 역변환이 읽지 않아 잃는 것** 3축을 되찾는다
* 상세:
    - **① `h1_chapter` 6→0 (aTest-all) · 1→0 (aTest)** — `pptx2source.convert()` 가 챕터를 `if lay == "Section Header"` 로만 판정한다. 그런데 실측 두 덱의 layout 분포는 `Title Slide`·`Title and Content`·`Content with Caption` 뿐으로 **`Section Header` 는 0회** — 그 분기는 죽은 코드다. Issue374(`3.parity` 챕터 경계)·Issue379(lane T 챕터 마스코트)가 걷어낸 **같은 낡은 전제의 세 번째 자리**다
    - H1 텍스트는 pptx 에 살아 있다 — 정방향이 챕터 진입 장의 H1 을 걷고 그 자리에 `chapter_toc` 장을 만들며 **그 장의 제목이 H1** 이다(실측 p04 제목 `01. 변환 경로 커버리지`). 역변환은 그 장을 `synthesized` 로 지우면서 제목을 읽지 않고 버린다
    - **② 카드 본문이 블록 밖으로 샌다 → `bullet_nesting` 깊이 1→0 (aTest 3건 · aTest-all 11건)** — lane B 가 카드 한 장을 **세 도형**으로 그린다: 테두리 `Rounded Rectangle`(글자 없음) · 제목 띠 `Rectangle`(AUTO_SHAPE) · 본문 `TextBox`(TEXT_BOX). `group_boxes()` 는 `autoshapes`(AUTO_SHAPE)만 보므로 제목만 집고, 본문 TextBox 는 일반 텍스트 경로로 흘러 **블록 뒤 상위 불릿**이 된다
    - 실측 대조 — 원본 `* **lane A**` + `  - 불릿·표·이미지` → 왕복 `* **lane A**` … `:::` 뒤에 `* 불릿·표·이미지`. 같은 lane B 의 `htmlart process` 는 한 도형에 제목·본문이 함께 있어 정상 복원된다(`* 기획` / `  - 주제 정의`)
    - **③ `inline_emphasis` 코드 인라인 7→0 (aTest-all)** — `run_markup()` 이 `b`/`i` 만 마크다운으로 되돌린다. 굵게는 55/55 생존하는데 코드는 **전멸**이다(`` `_config.yml` ``·`` `file://` ``×2·`` `.pptx` ``×2·`` `ppt2m2slide` ``×2)
    - 신호는 pptx 에 있다 — 코드 폰트 교정이 그 run 에 `latin` 서체를 박는다(`para_kind()` 가 코드**블록** 판정에 이미 쓰는 기제). 전수 실측: 제목·코드문단을 뺀 본문 run 중 `latin` 명시는 aTest-all 에서 **정확히 6개이고 전부 그 코드 인라인**이며 일반 불릿 268 run 은 0 — **오탐 0**
    - 남은 1건(`_config.yml의 theme·layout`)은 카드 안이라 lane B 가 run 서식을 뭉개 신호가 없다 → Issue389 소관
* 구현 명세:
    - 수정 범위는 **`lib/pptx/pptx2source.py` 단독**이다. 정방향(pptx 산출)을 건드리지 않으므로 덱 산출물·시각 축 회귀가 원리적으로 없다
    - ① 챕터 판정을 **lane S 표식**으로 옮긴다 — `chapter_toc` synth 장을 지울 때 그 제목을 `# H1` 로 뒤따르는 본문 장 앞에 붙인다. 장을 새로 만들지 않으므로 `slide_order` 가 흔들리지 않는다. `Section Header` 분기는 사람이 PowerPoint 에서 만든 pptx 를 위해 **폴백으로 남긴다**
    - ② 카드 본문 TextBox 를 테두리 도형의 기하로 짝지어 `  - 본문` 으로 내고, 일반 텍스트 경로에서 **제외**한다. 짝짓기 실패 시 현행 동작(상위 불릿)을 유지해 손실이 늘지 않게 한다
    - ③ `run_markup()` 에 코드 인라인 복원을 더한다. `emphasis` 가 꺼진 자리(코드블록)에서는 하지 않는다 — 하이라이트가 서체를 박으므로 켜면 코드 안에 백틱이 박힌다. 굵게와 겹치면 원고 표기대로 **코드가 안쪽**(`**`x`**`)
    - 검증: `6.roundtrip aTest`·`aTest-all` 재실행으로 위 3축이 차이 0 이 되는지 · 되찾은 축은 `fidelity.yml` 등급을 실태에 맞게 올린다(`declared_drop`→`lossless` 등) · `3.parity`·`7.coverage`·`8.assembly` 무회귀

## Issue387: 본문 폰트 family 지정 배선이 끊겨 있었다 — 제한 완화 + 용량 가드레일 (등록: 2026-09-20, 해결: 2026-09-20, commit: `1b1a8d9`) ✅
* 목적: 사용자 지시(2026-09-20) — *"웹폰트로만 제한하지 말 것. 포털처럼 응답속도가 빠른 사이트가 아님. 단 너무 큰 폰트는 가드레일에서 걸를 것."* 지금은 쓸 수 있는 폰트가 `lib/vendor/` 에 미러된 구글폰트로 좁혀져 있다. 그 제한을 풀되 **과대 폰트 자산은 차단**한다
* 카테고리: Asset
* 상세:
    - 현황 실측(2026-09-20): `lib/vendor/` **21M** · woff2 **119** · woff **23** · **ttf 0 · otf 0**. [fetch-vendor.js](lib/vendor/fetch-vendor.js#L101) 가 받은 뒤 `.ttf` 를 지운다(주석: *"repo 용량 절감"*)
    - ⚠️ **용량 절감이 최우선이던 전제가 사용자 판단으로 바뀌었다** — 이 저장소의 산출물은 포털이 아니라 강의 덱이고, 몇 MB 가 응답속도를 좌우하지 않는다
    - 상호작용 주의 — 폰트 family 를 넓히면 두 판정이 함께 움직인다: [check-visual.py](lib/pptx/check-visual.py) 의 `font_outside_theme` 축(allowlist = pptx 테마 major/minor)과 [3.parity.sh](z_test/ig-ppt/3.parity.sh) ⑥(테마 밖 폰트 0). **정책을 allowlist 로 쓰면 그것이 곧 whitelisting** 이라 그 축이 무력해진다(그 경계는 이미 한 번 다퉜다)
* 구현 명세:
    - ① **지정 경로를 연다** — theme·`_config.yml` 에서 vendor 미러 밖 family 를 지정할 수 있게 하고, 그 family 가 vendor 에 없으면 **시스템 폰트로 해석**한다(없으면 브라우저 대체 — 그것이 정상 동작임을 문서에 박는다)
    - ② **용량 가드레일** — 상한값은 현황 실측으로 산정하고 근거를 이슈에 남긴다(사용자 위임 2026-09-20). 형태는 *"받는 단계에서 경고하고 보존 · 검사 단계에서 상한 초과를 단언"* 을 기본으로 한다 — 조용히 버리면 *"어떤 폰트가 없는지"* 가 비밀이 된다
    - ③ `font_outside_theme`·`3.parity` ⑥ 의 판정을 **재정의**한다. 열린 family 를 통과시키되 *"아무 폰트나 통과"* 가 되지 않는 경계를 세운다
    - ④ 문서 — `repo-tracking-rules.md` 의 *"woff2/woff만 보관(.ttf 제외)"* 조항 · `css.md`/`theme.md` 의 폰트 절 · `m2slide-identity.md` 의 *"외부 의존 0"* 과의 관계(시스템 폰트는 로컬 자원이라 외부 의존이 아니다)
    - 검증: 시스템 폰트 지정 덱이 빌드·렌더되고 · 상한 초과 자산이 가드레일에 걸리며 · `3.parity` ⑥ 과 `--lint-deployment` 가 기존 덱에서 불변
* 결과 — 🔑 **등록 시 적은 전제가 부분적으로 틀렸다.** family 지정은 **막혀 있지 않았다**:
    - `style.theContents.font_family` 는 [config.js:563](lib/config.js#L563) 이 파싱하고 [html-builder.js:1276](lib/html-builder.js#L1276) 이 `--content-font-family` 로 산출한다 — 실측에서 `index.html` 에 지정값이 그대로 나갔다. 기본값 목록에도 시스템 폰트(`Apple SD Gothic Neo`·`Noto Sans KR`)가 이미 섞여 있다
    - 🔑 **실제 결함은 그 변수를 쓰는 셀렉터가 하나뿐이었다는 것** — [base.css:322](lib/css/base.css#L322) 의 `.reveal .theContents`. 현행 layout 템플릿의 본문 컨테이너는 `contents-body`·`exercise-body`·`summary-body` … 이라 **변수가 아무 요소에도 닿지 않았다.** 그래서 파싱·산출이 정상인데 화면에서는 보이지 않았다(본문 `li` computed = `--global-font-family` 기본값)
    - ① **theme 두 곳에 배선** — `.reveal section[class*="layout-"] > div[class$="-body"]` 가 그 변수를 쓴다. **base.css 는 건드리지 않았다**(수정 가드 준수 — theme 으로 우회 가능했다). 상속을 덮는 선언이라 명시도 다툼이 없고, 변수 미지정 시 `inherit` 이라 기존 덱 무변경
    - ② **용량 가드레일** — 파일당 **5MB** · 총량 **24MB** 를 `fetch-vendor.js` 가 경고한다. 상한 근거(실측 폰트 142개 9.2MB): 중위 12KB · p90 19KB(구글폰트 subset 조각) · 최대 **2.0MB** `d2coding-bold-full.woff`(한글 전체 글리프) · 그 다음 615KB. 한글 전체 글리프가 2MB 대이므로 5MB 면 그런 폰트를 **두세 종 더** 받을 여유가 있고 **CJK 전체 세트(10~20MB)는 걸린다**. 총량은 현재의 2.6배
    - 🔑 **받은 것을 버리지 않는다** — 경고만 하고 보존한다. 조용히 지우면 *"어떤 폰트가 없는지"* 가 비밀이 되고 그 덱은 오프라인에서 **이유 없이 대체 폰트로** 렌더된다. `.ttf` 삭제(구 정책)가 정확히 그 형태였다
    - **오프라인 보장 범위는 지정 범위와 다르다** — vendor([asset-manifest.js](lib/asset-manifest.js))에 미러된 폰트만 오프라인에서 확실히 뜬다. 시스템 폰트는 기기에 있으면 뜨고 없으면 대체된다. 그것이 정상이며 [m2slide-identity](_doc_arch/m2slide-identity.md) 의 *"외부 의존 0"* 과 충돌하지 않는다(로컬 자원이지 네트워크 의존이 아니다)
    - **검증** — 시스템 폰트 지정 픽스처에서 본문 `li`·`-body` computed 가 지정값으로 바뀜 · 기존 3덱 산출 diff **실질 0**(24건 전부 캐시버스터) · 가드레일이 현재 자산에서 초과 0
    - 문서 — [css.md](_doc_arch/css.md) 「본문 폰트 family 지정」 신설 · [repo-tracking-rules](.claude/rules/repo-tracking-rules.md) vendor 행에 가드레일 반영
    - ⚠️ `.ttf` 보존(포맷 축)은 **이번 범위 밖**이다 — 사용자가 family 축을 골랐다. 필요해지면 별건으로 등록한다
    - ℹ️ 커밋 범위 — `theme/default_lec/slide.css` 에 다른 세션 미커밋 hunk 가 있어 `git apply --cached` 로 내 hunk 1개만 담았다(남의 변경 0줄 확인)

## Issue386: `6.roundtrip igTest` — pptx 에 없는 글자 6종. **part 라벨은 선언, `version_badge` 는 배선 누락** (등록: 2026-09-20, 해결: 2026-09-20, commit: `1abf08d`, `2207101`) ✅
* 목적: 왕복 검사가 `Chapter 1.`~`Chapter 5.` · `v0.8.0` 을 *"pptx 에 없는 글자"* 로 잡는다. 실측으로 가르니 **성격이 둘로 갈린다** — 앞 5건은 의도된 드롭이라 계약에 선언할 일이고, `v0.8.0` 은 **표지 코너 슬롯 배선이 빠진 것**이라 고쳐야 한다
* 카테고리: Build
* 상세 (실측 2026-09-20 · igTest):
    - **`Chapter N.` 5건 — 의도된 드롭.** HTML 챕터 파일의 `<p>Chapter N.</p>` 이고 원고 `::: part` 라벨에서 나온다. pptx 는 [build-source.py](lib/pptx/build-source.py) 의 `PART_BLOCK` 이 그 펜스를 지운다 — 챕터 진입 장의 **제목이 그 역할을 대신**하므로 라벨을 그대로 옮기면 중복이다(Issue374 선행 수정 `bf3efa3` 이 세운 방향)
    - 🔑 **`v0.8.0` — 배선 누락이고, 게다가 자리와 내용이 어긋나 있다.** 표지 템플릿([_cover.html](theme/default/layouts/_cover.html#L28))의 코너는 **셋**이다:

      | HTML | 슬롯 | 값(igTest) | pptx 배선 |
      | :--- | :--- | :--- | :--- |
      | `cover-corner cover-tl` | `{{github_url}}` | `github.com/Finfra/m2slide` | ✅ `corner_tl` |
      | `cover-corner cover-tr` | `{{version_badge}}` | **`v0.8.0`** | ❌ **없다** |
      | `cover-corner cover-br` | `{{homepage}}` | `finfra.kr` | ✅ `corner_br` |
      | `cover-meta > cover-version` | `{{version}}` | `1.0` | ⚠️ `version` 좌표(**우상단** l 1624)에 들어간다 |

    - ⚠️ 즉 **pptx 우상단에는 `1.0` 이 앉아 있는데 HTML 우상단은 `v0.8.0`** 이다. [lane-t.py:118-120](lib/pptx/lane-t.py#L118) 의 추출 정규식이 `cover-tl`·`cover-br`·`cover-meta` 셋만 있고 **`cover-tr` 이 빠져** 있어, 빈 우상단 좌표를 `version`(중앙 메타)이 차지한 꼴이다
    - 두 값은 **다른 것**이다 — `version_badge` 는 frontmatter 필드, `version` 은 `Projects/<N>/VERSION` 파일(project-version-rules). 표지에 둘 다 보이므로 pptx 도 둘 다 보여야 파리티다
* 구현 명세:
    - ① `Chapter N.` → [fidelity.yml](data/m2slide2ppt/fidelity.yml) 에 `part_label` 항목을 `grade: declared_drop` 으로 선언. `reverse_action` 은 역변환이 되살릴 필요가 없으므로 `none`. 근거에 *"진입 장 제목이 그 역할을 대신한다"* 를 적는다
    - ② `version_badge` → lane T 추출에 `cover-tr` 을 더하고 **우상단 좌표를 그것에 준다**. `version`(VERSION 파일)은 HTML `cover-meta` 자리를 실측해 좌표를 신설한다 — 두 값이 겹치지 않게
    - ⚠️ 좌표는 **HTML computed style 실측**으로 얻는다(Issue379 와 같은 절차). reveal `transform: scale()` 적용 후 값을 그대로 쓰면 틀린다
    - 검증: `6.roundtrip igTest` **통과** · `3.parity` 3덱 7/7 불변 · 표지 텍스트에 `v0.8.0`·`1.0` 둘 다 존재 · `7.coverage` 새 🔴/❌ 0
* 결과 — **세 가지가 겹쳐 있었다.** `6.roundtrip igTest` 가 **rc0 통과**:
    - ① **표지 우상단 코너 배선 누락** — `cover-tr`(`version_badge`)이 [lane-t.py](lib/pptx/lane-t.py#L118) 추출에 **없었다.** 그래서 빈 우상단 좌표를 중앙 메타의 `version` 이 차지했고, 🔑 **자리와 내용이 어긋났다**(pptx 우상단 `1.0` ↔ HTML 우상단 `v0.8.0`). 좌표는 그대로 쓴다 — 기존 `version` 좌표의 우변 1824 가 실측(tr l 1787 + w 37)과 **일치**한다. 값 선택만 `corner_tr or version` 으로 고쳤다
    - 🔑 **판정을 새로 만들지 않았다 — 테마가 이미 정해 뒀다.** `slide.css:857` 의 `:has(.cover-tr:not(:empty)) … .cover-version { display: none }` 즉 *"version_badge 가 있으면 version 은 중복이라 숨긴다"*. HTML 이 정본이므로 pptx 도 같은 규칙을 쓴다
    - ② **화면에 없는 글자를 빠짐으로 세고 있었다** — 위 규칙으로 숨겨지는 `cover-version` 을 정적 HTML 파싱이 *"HTML 에 있다"* 로 셌다. `aside class="notes"`(발표자 노트)를 제외하는 **선례와 같은 취지**로 파서에서 건너뛴다. 코너가 비어 이것이 보이는 덱에서는 pptx 도 같은 자리에 넣으므로 제외해도 빠짐이 생기지 않는다
    - ③ **`declared_drop` 선언만으로는 아무것도 바뀌지 않았다** — 두 곳이 그 선언을 몰랐다. `declared_drop_texts()` 는 `fidelity.yml` 을 읽지 않고 **원고 패턴으로** 모으므로(mermaid·raw HTML 과 같은 방식) part 블록 수집을 더했고, `collect()` 는 `::: part` 를 `div_other` 에 섞어 담아 **`7.coverage` 가 *"계약은 선언했는데 검사기가 안 재는 축"* 으로 잡았다** → 전용 축으로 분리
    - 🔑 **`7.coverage` 가 제 일을 했다** — 계약에 항목을 더하자마자 🔴 로 잡았다. 그 러너가 없으면 *"선언은 했는데 아무도 재지 않는 축"* 이 조용히 늘어난다(apply-verify-rules §4.10 이 세운 목적 그대로)
    - **검증** — `6.roundtrip` igTest **rc0**(*"HTML 의 글자가 pptx 에 전부 있다"*) · aTest·aTest-all·m2Slide_chapter_mode ✅ · `3.parity` 3덱 7/7 · `4.laneb` 6/6 · `5.lanem` ✅ · `8.assembly` 통과 · **`7.coverage` 미측정 축 0**(`part_label` 2덱에서 5건씩) · 표지 텍스트에 `v0.8.0` 존재

## Issue382: pptx **패키지 조립 무결성** 검사 부재 — 글로벌 `check-assembly` 배선 (등록: 2026-09-20, 해결: 2026-09-20, commit: `bfb73be`) ✅
* 목적: lane B/G/M/S/T 가 pptx 의 XML part·rel 을 **손으로 끼우는데**, 그 조립이 온전한지 재는 검사가 하나도 없다. 글로벌 [`check-assembly.py`](~/.claude/skills/ppt-check/scripts/check-assembly.py) 를 **배선만** 해서 그 축을 덮는다.
* 카테고리: Build
* 상세:
    - 요청 출처: prj7 cg 위임 [`_doc_work/delegation_cg-crossfeed.md`](_doc_work/delegation_cg-crossfeed.md) A2. 대조표 정본은 prj7 `_doc_arch/ppt-parity-crossfeed.md`. **판정 = 채택**
    - ⚠️ **요청서의 전제 일부는 사실과 다르다** — *"장 유실·순서"* 는 이미 덮여 있다: [`z_test/ig-ppt/3.parity.sh`](z_test/ig-ppt/3.parity.sh) ① slide-count(HTML 본문 장 + 구조 장 = pptx 장) · ③ title-parity(제목 문자열·순서) · ④ structure-slides. 실제로 빈 축은 **패키지 층**(zip 항목 중복·끊긴 rel·미선언 미디어 확장자)이고, parity 는 python-pptx **렌더 텍스트**로 판정하므로 그 층을 구조적으로 **볼 수 없다**
    - 이 축의 실사고가 이미 있었다 — lane G 의 `diagramDrawing` 관계를 슬라이드 rels 가 아닌 data 파트에 걸었을 때 LibreOffice 가 빈 그룹으로 들여왔다(실측 2026-09-11, [`CLAUDE.md`](CLAUDE.md) "lane G" 절). 당시 **어떤 검사도 잡지 못했고** 사람이 눈으로 찾았다
    - 실측(2026-09-20): 글로벌 `check-assembly.py` 를 기존 산출물에 **무개조로** 돌리니 그대로 동작한다. aTest-all(51장)·igTest(42장)·m2Slide_chapter_mode(34장) 전부 `FAIL 0 · SKIP 3 · 검사 8` rc0
    - 즉 지금은 **깨끗하다** — 본 이슈는 결함 수정이 아니라 **회귀 가드 신설**이다. 손으로 XML 을 끼우는 lane 이 늘수록 이 축이 조용히 깨질 자리가 는다
* 구현 명세:
    - 배선 위치 1순위는 `z_test/ig-ppt/` 전용 단언. **`build-pptx.sh` 내장은 2순위** — 내장 검증(`check-conform`·`check-xml-order`·`check-empty`)은 FAIL 시 빌드를 죽이므로, 현재 FAIL 0 인 축을 차단 지점에 바로 넣으면 오탐 1건이 빌드를 막는다
    - baseline 불요 5규칙만 켠다: `zip_entry_names_unique` · `dropped_slide_relationship_removed` · `reorder_key_is_stable_across_save` · `no_duplicate_or_missing_after_reorder` · `declared_extensions_cover_all_media`
    - `--baseline` 필요 3규칙은 Issue383 소관 — 여기서는 SKIP 으로 두되 **SKIP 건수를 보고**한다. 숨기면 *"통과"* 와 *"축이 사라짐"* 이 구분되지 않는다([`check-coverage.py`](lib/pptx/check-coverage.py) 와 같은 취지)
    - ⚠️ **`lib/pptx/` 에 새 스크립트를 만들지 않는다.** 글로벌 SCAR 를 호출한다 — 복사하면 prj7 이 경고한 2원 갈라짐이 그대로 재현된다
    - 글로벌 도구가 없는 머신에서는 **SKIP 하고 그 사실을 보고**한다 (조용한 통과 금지)
* 결과 — 명세 1순위대로 **전용 러너 배선**. [8.assembly.sh](z_test/ig-ppt/8.assembly.sh) 신설:
    - **판정은 글로벌 SCAR 가 한다** — 러너는 호출·집계·보고만 한다. `lib/pptx/` 에 복사하지 않았다(prj7 이 경고한 2원 갈라짐 회피). 요약 줄에서 FAIL·SKIP 건수를 얻고, **rc 와 FAIL 건수를 함께 본다** — 도구가 요약 형식을 바꿔도 놓치지 않는다
    - **차단 지점이 아니다** — 명세가 `build-pptx.sh` 내장을 2순위로 둔 이유를 그대로 따랐다. 내장 검증은 FAIL 시 빌드를 죽이므로 현재 FAIL 0 인 축을 거기 넣으면 **오탐 1건이 배포를 막는다**
    - `--baseline` 3규칙은 Issue383 소관으로 SKIP 하되 **건수를 보고**한다. 글로벌 도구 부재 시에도 **SKIP + 경고 보고** — *"도구 부재는 무결성 통과가 아니다"* 를 출력에 박았다
    - 🔑 **통과만 확인하면 검사가 작동하는지 알 수 없어 고의 손상으로 재봤다** — `presentation.xml` 의 `sldId` 하나를 지운 손상본을 만들어 **FAIL 2 포착**(`dropped_slide_relationship_removed` 고아 part 1 · `no_duplicate_or_missing_after_reorder` 목록 41 ≠ part 42) · 러너 **rc1**. Issue339 의 `check-empty` 가 substring 필터 탓에 검사 전체가 무력화됐던 것을 그냥 통과로 읽었던 일이 있어 그 절차를 지켰다
    - ⚠️ **rc 는 파이프 없이 직접 측정했다** — 처음에 `… | tail -6` 뒤에서 `$?` 를 읽어 **tail 의 rc(0)** 를 러너 rc 로 오독했다. 같은 함정을 `| grep` 에서도 한 번 밟았다
    - **검증** — 정상 3덱(aTest-all 51장 · igTest 42장 · m2Slide_chapter_mode 34장) `FAIL 0 · SKIP 3` · 러너 rc0 · 손상본 rc1 · 도구 부재 SKIP rc0
    - 문서 — [apply-verify-rules](.claude/rules/apply-verify-rules.md) §4.11 신설 · [CLAUDE.md](CLAUDE.md) 「패키지 조립 무결성」 절 신설(lane 절 뒤). 요청서가 사실과 달랐던 부분(*"장 유실·순서"* 는 이미 `3.parity` ①③④ 가 덮는다)은 등록 시 이슈 본문이 이미 바로잡아 두었다
    - ℹ️ 커밋은 이 3파일만 담았다 — 같은 워킹트리에 다른 세션의 미커밋 3파일(`client.js`·`generate-slides.js`·`slide.css`)이 있어 `git add` 를 파일 단위로 좁혔다

## Issue385: 실습 2종 layout 이 이론 장과 머리 구조가 갈린다 — head-bar 부재 + 제목 브러시 잘림 (등록: 2026-09-20, 해결: 2026-09-20, commit: 4af5434) ✅
* 목적: 실습 장표가 이론 장표와 **다른 덱처럼** 보인다. 제목 아래 노랑 브러시가 글자 폭에서 끊기고, 상단 보조 제목(head-bar) 두 칸이 아예 없다. 같은 과정 안에서 장을 넘길 때마다 제목이 좌우로 출렁인다
* 상세:
    - 요청 출처: prj60 `__lec` 강의 덱(`202609_Rebuild/1.design_rnd`) — m2slide 저장소에서 `exercise` 계열을 실제로 쓰는 **유일한 덱**이다(`Projects/1.design_rnd` 심볼릭 링크)
    - **제목 브러시**: [base.css §1208](lib/css/base.css) 이 `section[class*="layout-"] > div[class$="-header"]` 에 `display:flex` 와 `align-items:center` 를 함께 준다. flex 교차축이 `center` 면 자식이 shrink-to-fit 이 되어 `.exercise-title` 박스가 글자 폭만큼만 잡히고 `::after` 의 `hr.png` 가 그 안에서 끊긴다. 이론 장은 제목이 `-header` div 밖(section 직계 `.title`)이라 이 규칙을 안 받아 전폭이었다
    - **head-bar**: 실습 템플릿에 `{{head_left}}`·`{{head_right}}` 슬롯이 아예 없었다. `html-builder` 는 layout 과 무관하게 두 값을 `vars` 에 넣으므로 템플릿만 받으면 된다
    - ⚠️ **head-bar 규칙이 layout 이름을 나열하는 선택자로 4곳에 흩어져 있고 실습 2종이 네 목록에 전부 빠져 있었다** — `position:relative` · `::after` 브러시 · `display:flex` 본체 · 좌/우 자식·빈 값 숨김. 그래서 슬롯만 달면 `display:block`·`position:static`·브러시 없음으로 떨어진다
    - 실측(수정 전, `offsetWidth` 기준): 이론 제목폭 **1808**·left **56** 고정 vs 실습 **1312·1610·1220** / left **304·155·350** 유동
* 구현 명세:
    - 템플릿 [6.1.exercise.html](theme/default_lec/layouts/6.1.exercise.html)·[6.2.exercise-small.html](theme/default_lec/layouts/6.2.exercise-small.html) 에 head-bar 추가 + `@meta` slots 갱신. 죽은 `exercise-divider` 는 제거(`_stripEmptyWrappers` 가 지우고 theme §3 이 숨기는 이중 사문)
    - theme 에 실습 전용 블록 — `align-items: stretch` · 제목 `margin-left/right: 0; width: 100%` · head-bar 규칙 한 벌
    - 🔴 **`margin: 0 auto` 가 `align-items` 를 이긴다** — flex 아이템의 auto margin 이 남는 공간을 먼저 흡수한다. 교차축만 바꿔서는 안 되고 좌우 margin 을 0 으로 되돌려야 한다
    - 🔴 **기존 `.layout-exercise .exercise-header` 블록에 합치지 말 것** — (0,3,1) 이라 base.css 의 (0,3,2) 에 진다. 자식 결합자 + `div` 요소로 동점을 만들어야 후순위 로드가 이긴다
    - 검증: 이론 장과 head-bar top·height·display·브러시, 제목 top·width·left, body top 이 **전부 일치**할 것 + 3덱 전수 계측 회귀 0
* 결과: 이론 장과 **전 축 일치** — head-bar top 28 · height 37 · `display:flex` · `hr.png` 브러시, 제목 top 65 · **width 1808(전폭)** · left 56 고정, body top 198. 실습 `exercise`·`exercise-small`·검증 장 모두 같은 값
* 회귀: 3덱 197장 전수 계측 **0건**(표지 `::part` 오탐 1건씩은 기존과 동일). 변경이 전부 `.layout-exercise`/`-small` 스코프라 다른 layout 은 선택자에 닿지 않는다
* ⚠️ 동시 편집 — `theme/default_lec/slide.css` 에 제3 세션의 미커밋 27줄(2026.09.19)이 있어 **hunk 단위로 인덱스에만 적용**해 커밋했다. 워킹트리의 남의 변경은 보존했고 커밋에 섞이지 않은 것을 `git diff --cached` 로 확인했다
* 🔴 **후속 (2026-09-20, commit: 3060e1d)** — head-bar 를 달자 **노랑 선이 4개**가 됐다(head-bar 위·아래·제목 아래·하단). §2 상단 프레임 브러시(`section::before`, top 12px)를 숨기는 목록에도 실습 2종이 빠져 있었기 때문이다. 이론 장은 *"head-bar 가 자기 아래에 브러시를 그리니 위엣것은 숨긴다"* 로 이미 처리돼 있었다. 같은 숨김 + 빈 head-bar 복원 규칙을 실습에도 추가해 **3개로 맞췄다**(head-bar::after · 제목::after · section::after — 이론 장과 구성 동일)
* ⚠️ **나열 선택자 누락이 이 이슈에서만 5곳**이었다 — `position:relative` · `::after` 브러시 · `display:flex` 본체 · 좌/우 자식·빈 값 숨김 · **§2 상단 브러시 숨김**. 새 layout 을 추가할 때 head-bar 를 쓰려면 이 다섯을 모두 확인해야 한다


## Issue384: prj7 cg crossfeed 접수 — 주입 2건 판정 + svg-direct·free-image 전역 자산 명시 (등록: 2026-09-20, 해결: 2026-09-20, commit: `f789ae7, 100308d`) ✅
* 목적: prj7 이 `ppt-maker`(prj3) ↔ m2slide 축을 대조해 보낸 주입 후보 2건을 실측으로 판정하고, m2slide 소유이면서 전역에서 호출되는 자산 2종을 문서에 명시한다.
* 카테고리: Build
* 상세:
    - 요청서: [`_doc_work/delegation_cg-crossfeed.md`](_doc_work/delegation_cg-crossfeed.md) (prj7 cg, 2026.09.20). 경계는 *"변환기를 고치면 prj42, 언제 그 경로로 갈지 정하면 prj7"* — 발의는 prj7, **채택 판단은 prj42**
    - A2(조립 무결성) → **채택**, Issue382 로 등록. A1(기준선 대비) → **보류**, Issue383 으로 등록
    - ⚠️ 핵심 발견: A1·A2 는 별개 기능이 아니라 **같은 글로벌 스크립트 하나**다. `--baseline` 은 `check-assembly.py` 의 플래그이므로 A2 를 배선하면 A1 은 구현 없이 따라온다. 따라서 남는 판단은 *"언제 쓰는가"* 뿐이다
    - B(전역 자산 명시) → **반영**. `svg_direct`·`free_image` 는 m2slide 소유지만 글로벌 `visual-gen` 레지스트리에 `scope: prj42` 로 등재돼 m2slide 밖 세션이 `/vg` 로 고른다. 3개 지점에 1줄씩 명시:
        - [`.claude/skills/free-image/SKILL.md`](.claude/skills/free-image/SKILL.md) 목적 절
        - [`data/media-creater/tools.yml`](data/media-creater/tools.yml) `svg_direct`·`free_image` 항목 위 주석
        - [`.claude/agents/media-creater.md`](.claude/agents/media-creater.md) 보조 도구 표 뒤
    - 이관은 하지 않는다 — prj7 판정(ⓑ 연계만)에 동의. 판정 기준 *"누가 고치나"* 가 m2slide 본체와 같은 결론을 낸다
* 검증:
    - `check-assembly.py` 3개 덱 실측 rc0 (Issue382 근거)
    - `data/media-creater/tools.yml` yaml 파싱 OK (tools 16개, `svg_direct`·`free_image` 보존)
    - `--lint-data` 검사 6(data/ 범주 선언) 통과. ⚠️ 검사 5 는 **기존 실패 5건** 잔존(`Projects/1.design_rnd/DESIGN.md` 슬라이드 제목의 내부 추적 표기) — 본 변경과 무관하며 별건


## Issue381: htmlart callout **branch 라벨**이 3줄이면 6px 잘린다 (등록: 2026-09-19, 해결: 2026-09-20, commit: `5797733`) ✅
* 목적: `m2Slide_visual_component` 5장 30번(원고 슬라이드 29 · `5.27b callout — horizontal`)의 branch 라벨 `**바이브 코딩으로 쉽고, 빠르게, 정확하게**` 가 박스를 6px 넘겨 잘린다. [Issue370](#issue370) 전덱 스캔에서 유일하게 남은 넘침이다
* 상세 (실측 2026-09-19 — `scrollHeight` vs `clientHeight`):
    - ⚠️ **이슈후보 표현("허브 라벨")이 부정확했다 — 넘치는 것은 hub 가 아니라 branch 라벨이다.** hub(`HTML 대시보드 워크플로우` · fs **82px** · fo 920×210)는 넘침 0이고, branch 라벨(fs **44px** · fo 480×**150**)이 `scrollHeight 156 > clientHeight 150` 이다
    - 줄높이 53.68px(44 × 1.22) × **3줄** = 161px 이라 150 고정 박스에 들어가지 않는다. 같은 장의 다른 라벨 2개(`보고서|제안서|…` · `화면용|출력용|…`)는 2줄이라 정상 — 곧 **3줄이 되는 순간 잘린다**
    - [Issue364](#issue364) 와 같은 무경고 클리핑 축이다(폭 축 auto-fit 은 있고 높이 축이 없다)
* 구현 명세:
    - [Issue364](#issue364) 의 `wrapLines`·`fitFsFor` 를 재사용한다 — 이미 같은 파일 상단 유틸이고 `word-break:keep-all` wrap 을 흉내 낸다
    - ⒜ 라벨 폰트를 줄 수 기반으로 낮춘다(박스 고정) — 형제 라벨과 글자 크기가 달라질 수 있다. `uniformTitleFs` 로 **형제 일관성**을 함께 세우는 편이 낫다
    - ⒝ `labelH` 를 줄 수 기반으로 늘린다(폰트 고정) — 8방위 zone 배치가 anchor 기준이라 박스가 커지면 **이웃 라벨과 겹칠 수 있다**. 그쪽은 검증 비용이 크다
    - **판정 제안: ⒜** — Issue364 가 이미 세운 축이고 배치 계약을 건드리지 않는다
    - ⚠️ **파일 경합** — 같은 `renderCallout` 의 hub stem 을 다른 세션이 미커밋(34줄)으로 손대는 중이다(2026-09-19 관측). 내 변경은 branch 라벨 영역이라 줄이 다르지만, **커밋에 남의 미완성 작업을 섞지 않도록** 그쪽 커밋 뒤에 착수한다
    - 검증: 해당 장 넘침 0 · callout 4종(horizontal·vertical·fan·wide) 전 슬라이드 넘침 0 · `m2Slide_visual_component` 전덱 노드 넘침 0(Issue370 기준 262 노드)
* 결과 — **⒜ 폰트 축소**(판정 제안대로). 문제 장만 44 → 42, **정상 장은 불변**:
    - 줄 수를 **렌더가 실제로 쓰는 값**으로 센다 — `padding: 0 14px` · `line-height: 1.22` · `labelH 150`. 토큰 라벨(` | ` 구분)은 구분자까지 넣어 재야 폭이 과소평가되지 않는다
    - **형제 라벨은 같은 크기** — 하나만 작아지면 그것이 더 눈에 띈다. 가장 제약이 큰 라벨을 기준으로 전체를 함께 낮춘다
    - ⒝(`labelH` 확대) 비채택 — 8방위 zone 이 **anchor 기준 배치**(`labelBox`)라 박스가 커지면 이웃 라벨과 겹칠 수 있고, 그 검증 비용이 폰트 축소보다 크다
    - **검증** — 문제 장 fs 44 → **42 · 넘침 0**. 정상 장 3종(fan·vertical·wide)은 **fs 44 불변 · 넘침 0** — Issue364 와 같이 *넘치는 경우에만* 걸린다. 전덱 `m2Slide_visual_component` **262 노드** · `aTest-all` 28 노드 넘침 0(Issue370 기준과 동일)
    - 🔑 **커밋 범위를 hunk 단위로 갈랐다** — 이 파일에는 다른 세션의 미커밋 작업 34줄(hub stem `hubTextH` · bracket `labelFs`)이 함께 있었다. `git add -p` 는 이 환경에서 대화형 플래그가 막혀 쓸 수 없고, `git checkout --` 는 **남의 작업을 워킹트리에서 지우는** 위험이 있어 쓰지 않았다. 대신 `git diff` 에서 내 hunk 2개만 골라 **`git apply --cached`** 로 인덱스에만 담았다 — 워킹트리 불변이라 남의 작업이 위험에 놓이지 않는다. 커밋 후 그 34줄이 그대로 남아 있음을 확인했다

## Issue380: `3.parity` 가 single mode 덱의 본문을 대조하지 못한다 (등록: 2026-09-19, 해결: 2026-09-20, commit: `c9ff265`) ✅
* 목적: 챕터 HTML 이 없고 본문이 `index.html` 안에 있는 single mode 덱에서 `html_body=0` 이 되어 기대값이 성립하지 않는다. [Issue374](#issue374) 가 ①③ 을 `skip` 으로 막아 **거짓 통과·거짓 실패를 없앴지만 검증 구멍은 남았다** — 실측 대상 `aTest` 는 지금 `통과 5/7 · 건너뜀 2` 다
* depends: Issue374
* 상세:
    - 챕터 목록 구성은 [3.parity.sh](z_test/ig-ppt/3.parity.sh) 가 AGENDA.md 를 정본으로 읽고, 없으면 `index.html`·`agenda.html` **제외** 후 나머지 HTML 을 챕터로 삼는다. single mode 는 그 둘뿐이라 `chapters=[]` 가 된다
    - ⚠️ single mode 의 `index.html` 은 **본문 + 표지 + (목차)** 가 한 파일에 섞여 있다. 그대로 본문으로 세면 구조 장이 이중 계수된다 — `has_cover` 판정이 이미 `index.html` 의 `layout-_cover` 를 보고 있으므로 그 장을 빼야 한다
    - 실측(aTest): pptx 9장 · 본문 구간 7장 · 구조 2장(표지 1 + `agenda` 표식 1)
* 구현 명세:
    - `chapters` 가 비면 `index.html` 을 **유일 챕터**로 삼되, top-level `<section>` 중 **구조 장을 제외**하고 센다 — `layout-_cover`·`id="toc-placeholder"`·`layout-_agenda`
    - 제외 판정은 [Issue373](#issue373) 이 harvest 에서 쓴 것과 **같은 규칙**을 쓴다(`id="toc-placeholder"` 제외). 판정이 또 갈리지 않게 한다
    - ③ 제목 순차 대조는 그 유일 챕터에 대해 돌리고, 진입쌍(챕터명↔H1) 뒤집힘은 single mode 에 없으므로 `head=0` 으로 둔다
    - 검증: `3.parity aTest` 가 **skip 0 으로 7/7** · igTest·aTest-all 7/7 불변 · `6.roundtrip` 3덱 불변
* 결과 — `index.html` 을 유일 챕터로 삼고 **구조 장만 걷어낸다**. `aTest` 가 **건너뜀 0 으로 7/7**:
    - 판정 규칙을 새로 만들지 않고 [Issue373](#issue373) 이 agenda harvest 에서 쓴 것을 그대로 썼다 — `id="toc-placeholder"` · `layout-_cover` · `layout-_agenda`. 같은 것을 두 곳에서 다르게 판정하는 일([Issue372](#issue372)·[Issue376](#issue376))을 되풀이하지 않는다
    - ⚠️ `index.html` 을 **그대로** 본문으로 세면 구조 장이 `n_prologue` 와 **이중 계수**된다 — `has_cover` 판정이 이미 그 파일의 `layout-_cover` 를 보고 있다
    - 진입쌍 집합 비교(HTML=[챕터 H1, 챕터 TOC] ↔ pptx=[챕터명, H1])는 single mode 에 챕터 진입 장이 없어 성립하지 않으므로 `head=0` 으로 껐다
    - **검증** — `aTest`: ① 9장 = 본문 7 + 구조 2 · ③ 챕터 1 · 본문 7장 · ④ 표지 1 + `agenda`×1 + 진입 0 · **skip 0**. igTest·aTest-all 7/7 불변 · `6.roundtrip` 3덱 불변

## Issue379: 테마 배경 자산(CSS `background-image`)이 pptx 로 옮겨지지 않는다 (등록: 2026-09-19, 해결: 2026-09-20, commit: `81ae730`, `e2d2fe7`) ✅
* 목적: `6.roundtrip igTest` 가 **`finfraPuffer2.png` 1종**으로 실패한다. 원고의 `#layout-chapter` 5개가 요구하는 `.layout-chapter`·`.layout-chapter-toc` 배경인데 lane T 는 장식(가로선·표지·머리말·카드…)만 심고 **배경 자산은 다루지 않는다**. [Issue374](#issue374) 검증에서 드러났다
* 상세:
    - 검사 주체는 [check-parity.py](lib/pptx/check-parity.py) `css_theme_assets()` — 빌드 CSS 가 참조하는 `theme-img/` 자산을 긁고 `pptx_media_hashes()` 의 **패키지 이미지 바이트**와 대조한다. 태그만 세면 로고가 통째로 빠져도 1:1 이 맞기 때문에(실측 2026-09-10) CSS 참조를 본다
    - 대상 판정은 **덱이 실제로 쓰는 layout** 의 배경만이다(HTML `<section class>` 에서 `layout-` 을 긁는다). igTest 는 `layout-chapter` 5장이 있어 `finfraPuffer2.png` 가 "사용 중" 으로 잡힌다
    - ⚠️ **본 이슈는 Issue374 와 무관하게 이전부터 있었다** — 원고(`#layout-chapter` 5개)도 그 CSS 규칙([slide.css:431·456](theme/default_lec/slide.css#L431))도 최근 변경이 없다(`git show` 확인). Issue374 가 `3.parity` 를 고치며 함께 돌린 `6.roundtrip` 에서 **보였을 뿐**이다
    - `fidelity.yml` 에 이 축의 선언이 없다 — 곧 지금은 `undeclared_gain` 의 반대편(선언 없는 **손실**)이라 계약이 판정하지 못한다
* 구현 명세:
    - 판정이 먼저다 — **계약을 고칠 것인가 변환을 고칠 것인가**
        - ⒜ **`declared_drop` 으로 선언** — CSS 배경은 pptx 에서 `<p:bg>` 또는 배경 도형이 되어야 하는데, 그것은 장식이 아니라 **레이아웃 자산**이라 lane T 의 책임 범위를 넘는다. 선언하면 `6.roundtrip` 이 예산으로 흡수한다. 비용 최소
        - ⒝ **lane T 확장** — `theme-img/` 를 슬라이드 배경으로 심는다. 정합성은 높으나 배치·크기(`background-position: 6% 10%` · `background-size: 16% auto`)를 EMU 로 옮겨야 하고, 그 값은 layout 마다 다르다
    - ⚠️ 어느 쪽이든 **`7.coverage.sh` 의 판정과 맞물린다** — 계약에서 축을 거두면 그 러너가 *"아무도 재지 않는 축"* 으로 잡을 수 있다. 거두는 판단은 사람이 한다(apply-verify-rules §4.10)
    - 검증: `6.roundtrip igTest` 통과 + `7.coverage.sh` 4덱에서 새 🔴/❌ 0
* 결과 — **⒝ lane T 확장**. 판정은 실측이 갈랐다:
    - 🔑 **lane T 는 이미 마스코트를 심고 있었다 — 4종 중 3종이다.** pptx 미디어 해시 대조(igTest): `finfraPuffer1`(표지)·`finfraPuffer2s`(본문 제목 옆)·`finfraCat`(agenda) **✅ 실림** · `finfraPuffer2` **❌ 누락**. 같은 성격 자산의 3/4 를 옮기고 있으므로 이것은 **설계가 아니라 누락**이고, 그래서 ⒜(`declared_drop` 선언)는 *"다른 마스코트는 다 넣는데 챕터만 뺀다"* 는 계약이 되어 정당화되지 않는다
    - **왜 그 하나만 빠졌나** — 챕터 진입 장이 pptx 에서 본문 장과 **같은 layout**(`Title and Content`)으로 나와(Issue374 확인) lane T 에 가를 근거가 없었다. 판정은 **lane S 표식**(`layout: chapter`)으로 세웠다 — lane T ornament 는 lane S 가 alt-text 를 심기 **전**에 돌아 pptx 안의 신호를 읽을 수 없으므로 사이드카를 읽는 기존 경로를 그대로 썼다
    - **좌표는 ego-browser computed style 실측** — 먼저 section CSS 박스가 캔버스 전체 1920×1280 임을 확인했다(렌더 1720×1146.7 은 reveal `transform: scale(0.895833)` 적용 **후** 값이다 · 1720/0.895833 = 1920). 이미지 원본 392×358 에 `background-size: 16% auto` → 307.2×280.6 · `background-position: 0% 26%` → x 0 · y 0.26×(1280−280.6) = 259.8
    - **검증** — `finfraPuffer2.png` ❌ → **✅**(igTest·aTest-all 양쪽). `6.roundtrip` aTest·aTest-all ✅ · `3.parity` 3덱 7/7 · `4.laneb` 6/6
    - ⚠️ **`6.roundtrip igTest` 는 아직 실패한다** — 남은 것은 *"pptx 에 없는 글자 6종"*(`Chapter 1.`~`Chapter 5.` · `v0.8.0`)이고 **기준선(이 수정 전)에서도 같은 실패**임을 stash 대조로 확인했다. 자산 축이 해소되니 드러난 **다음 실패**이며 별건이라 이슈후보로 넘겼다
    - 🚧 `.layout-chapter-toc`(같은 자산 · `6% 10%`)는 그 layout 을 쓰는 덱이 없어 좌표 실측이 불가능해 미등록으로 뒀다 — 추측으로 넣지 않는다

## Issue378: head-bar 슬롯의 일차 접두(`N-`)를 렌더에서만 떼는 `head_number` 옵션 (등록: 2026-09-19, 해결: 2026-09-19, commit: 92f3c9e) ✅
* 목적: `head_left: d2` / `head_right: d1` 인 덱에서 좌측 `1-5. 닫는 절` 의 `1-` 과 우측 `1일차 — …` 가 **한 줄 안에서 같은 정보를 두 번** 표시한다. 원고의 절 번호(`## 1-5.`)는 타 문서가 참조하는 **공용 식별자**라 소스에서 뗄 수 없으므로 렌더 시점에만 줄인다
* 상세:
    - 요청 출처: prj60 `__lec` 강의 덱(`202609_Rebuild/1.design_rnd`) — 그 프로젝트의 `AGENDA.md` 54곳·`PRACTICE.md` 4곳·`DESIGN.md` 2곳이 `N-M.` 번호를 참조한다. 소스에서 번호를 떼면 그 참조가 전부 끊긴다
    - 적용 대상은 `head_left`·`head_right` 양쪽이고, `now` breadcrumb 은 **세그먼트마다 개별** 적용한다
    - 슬롯을 쓰는 layout 은 `_contents` 계열에 더해 [Issue371](#issue371) 에서 `contents-split` 이 늘었다 — 해소는 `_resolveHeadSlot` 한 지점이라 layout 이 늘어도 자동 적용된다
    - ⚠️ **하위호환이 요건이다** — 옵션 미지정 시 기존 출력과 완전히 동일해야 한다
* 구현 명세:
    - 순수 함수 `_stripHeadNumber(text, mode)` 를 [head-resolver.js](lib/_internal/head-resolver.js) 에 두고 `_resolveHeadSlot` 이 6번째 인자로 받는다
    - **제거 조건은 `숫자-` 뒤에 숫자가 이어질 때 1회뿐**이다. 그래야 점 형식(`4.2.1.`)과 `1일차 —` 가 영향을 받지 않는다
    - 설정 키 동기화 4곳([config-sync-rules](.claude/rules/config-sync-rules.md)): [config.js](lib/config.js) 파서 · [_config.org.yml](_config.org.yml) · [server.py](lib/dev-server/server.py) `_CONFIG_SCHEMA` · [config-gui.md](_doc_arch/config-gui.md)
    - 검증: 단위 테스트(full/short × `1-5.`·`4.2.1.`·번호 없음·breadcrumb 다중) + **빌드 전후 diff 0** 실측
* 결과: `full`(기본)·`short` 2값. `short` 는 `1-5. 닫는 절` → `5. 닫는 절`. 실측 — 파서 5종(기본·short·full·주석 동반·따옴표) 정상, 잘못된 값은 경고 후 `full` 폴백
* 하위호환 실측: `m2Slide_chapter_mode` 빌드 전/후 head 슬롯 **48개 전부 동일**(diff 0). 단위 테스트 5/5 통과. `integration.test.js` 3건 실패는 본 변경 전부터 있던 것(빌드 산출물 부재)으로 확인
* ⚠️ `_doc_arch/head.md`·`_doc_arch/config-gui.md` 갱신분은 [repo-tracking-rules](.claude/rules/repo-tracking-rules.md) 에 따라 `_doc_arch` 가 gitignore 대상이라 **커밋에 담기지 않았다** — 로컬에만 있다


## Issue377: 브라우저 검증 엔진을 Playwright → ego-browser 로 전환 (등록: 2026-09-19, 해결: 2026-09-19, commit: 7587d6f) ✅
* 목적: 프로젝트 SCAR 가 Playwright 를 검증 표준으로 지목하고 있어 글로벌 *"기본은 ego"* 정책([browser-engine-rules](~/.claude/rules/browser-engine-rules.md))과 갈라져 있었다. 세션이 Playwright 를 집은 것은 판단 착오가 아니라 **룰을 따른 결과**였으므로, 룰 쪽을 고쳐 재발 지점을 없앤다
* 상세:
    - 관측(2026-09-19, 사용자 지적): 다른 세션이 슬라이드 확인에 ego 가 아닌 Playwright 사용
    - 전수 조사: 프로젝트 SCAR 5종(`apply-verify-rules`·`capture-output-rules`·`open-slide`·`slide-compare`·`slide-tuner`)에 Playwright 명시 20여 곳, **ego 언급 0건**. 글로벌 룰은 상시 로드되지만 프로젝트 룰이 더 구체적이라 그쪽이 이겼다
    - 실측(aTest · dev-server 9877 · ego lite 0.5.0.32): `goto` 172ms · `snapshot()` 12ms · `evaluate()` 1ms 로 검증 축 전부 동작. **`file://` 직접 진입 성공** — Playwright 가 차단하던 축이라 배포 계약 검증이 가능해진 순증
    - 캡처만 불가: `page.screenshot()`·`cdp("Page.captureScreenshot")` 이 전 옵션에서 15초 타임아웃. 3회 재시도·`fromSurface:false`·viewport override 유무를 갈라 **6회 연속 실패·성공 0회**. ego lite 는 GUI 정상 실행 중이라 앱 부재가 아니다
* 구현 명세:
    - `apply-verify-rules` §4.0 신설(엔진 판정·실측 표) · 헤드리스 예시를 ego heredoc 으로 교체 · §4.2 신설(캡처 한정 Playwright 예외 + 해제 재실측 절차)
    - `capture-output-rules` 트리거를 엔진 중립으로 일반화, ego `page.screenshot({path})` 예시 추가
    - `open-slide` `--verify` 를 ego 진입 + CDP console 수집으로 교체, 캡처만 예외 표기
    - `slide-compare` Step 5 · `slide-tuner` Step 7 은 산출물이 *"사람이 대조할 PNG"* 라 예외 유지하되 **근거와 해제 조건을 명시**
    - ⚠️ 캡처 예외는 **잠정**이다 — 원인 미규명. 글로벌 ego 자산 문제이므로 **글로벌 Issue653** 으로 추적(사용자 승인 후 등록 완료). 연관 문서 오류는 **글로벌 Issue652**(web-auto 의 ego API 예시가 현행과 불일치)

## Issue376: exercise 계열 레이아웃에 표가 있으면 제목이 슬롯에서 사라진다 (등록: 2026-09-19, 해결: 2026-09-19, commit: `dcd9338`) ✅
* 목적: `layout-exercise`·`layout-exercise-small` 슬라이드에 표가 들어가면 `exercise-title` 슬롯이 비어 제목이 본문으로 밀리고, agenda TOC 에도 「슬라이드 N」 으로만 뜬다. 실습 장에서 제목은 수강생이 지금 무엇을 하는지 가리키는 신호라 비면 안 된다
* 상세:
    - 재현: prj3(`__lec`) `Projects/1.design_rnd` 1일차 덱 슬라이드 11 (`## 🙋 실습 P1-0-4 — 10개 도메인 접속 점검표`, `#layout-exercise-small`, 본문에 2열 표)
    - 산출 HTML: `<h1 class="exercise-title"></h1>` 이 빈 채로 남고, 제목은 `exercise-body` 안의 `<h2 class="title">` 로 들어감
    - agenda.html `tocData` 는 슬롯 제목을 읽으므로 해당 항목이 「슬라이드 11」 로 표기됨
    - 같은 절의 P1-0-1·P1-0-2(동일 `exercise-small`, 표 없음)는 정상이라 **표 유무가 갈림**
* 구현 명세:
    - 지점: [lib/slide-parser.js:438](lib/slide-parser.js#L438) — `isTable(textForSlide)` 경로가 `title: ''` 로 고정 반환
    - 그 자리 주석(Issue94·Issue232·Issue243)대로 이는 **`_contents` 계열을 전제한 의도된 동작**이다. html-builder 의 hoist 가 본문 H1 을 `<h1 class="title">` 로 올려 상단 노랑 바까지 발화시킨다
    - 누락된 것은 **exercise 계열**이다. 이 레이아웃은 제목을 `exercise-title` 슬롯에 넣는 구조라 hoist 대상이 아니고, 빈 슬롯이 그대로 남는다
    - 수정안 A: `isTable` 분기에서 `layout` 이 exercise 계열이면 `extractFirstHeading` 결과를 `title` 로 넘긴다 (이미 `tableH1` 을 뽑아 두고 쓰지 않는 코드가 있음)
    - 수정안 B: html-builder 의 hoist 대상에 `exercise-title` 슬롯을 추가한다
    - 검증: 위 재현 덱을 다시 빌드해 ① `exercise-title` 이 채워지는가 ② agenda TOC 에 제목이 뜨는가 ③ 표 없는 exercise 장·표 있는 contents 장이 회귀하지 않는가
* 결과 — **수정안 A 를 택했으나 이슈가 적은 형태로는 고쳐지지 않았다**:
    - 🔑 **`tableH1` 을 title 로 넘기는 것만으로는 안 된다** — [`extractFirstH1`](lib/slide-parser.js#L186) 은 `^#\s+` 으로 **H1 만** 본다. 재현 케이스 제목은 `## 🙋 실습 P1-0-4 …` 즉 **H2** 라 그 값이 빈다. 이슈 본문이 *"`extractFirstHeading` 결과"* 라 적은 것이 정확했고, 코드에 놓여 있던 `tableH1` 은 애초에 쓸 수 없는 값이었다
    - 🔑 **근본 원인은 판정이 두 곳에 있고 한쪽이 낡은 것** — 일반 경로는 *"contents 계열이 아니면 첫 heading 을 슬롯 제목으로 뽑는다"* 는 규칙을 갖고 있는데 `isTable` 경로가 그 규칙을 **타지 않고** 조기 반환했다. 그래서 개별 특례를 더하는 대신 판정 전체를 **`resolveSlideTitle` 하나로 뽑아 두 경로가 공유**하게 했다 — [Issue372](#issue372) 에서 겪은 *"두 처리기가 갈린다"* 와 같은 형태라 같은 방식으로 닫았다
    - **수정안 B 는 비채택** — hoist 는 본문 H1 을 `<h1 class="title">` 로 올려 **상단 노랑 바까지 발화**시키는 장치(Issue232·Issue243)이고 exercise 계열은 `exercise-title` 슬롯 + divider 구조라 목적이 다르다. 게다가 재현 제목이 H2 라 H1 대상 hoist 로는 닿지 않는다. 무엇보다 **원인이 hoist 부재가 아니라 판정 미적용**이다
    - ⚠️ **`layout` 이 없으면 지금처럼 `title: ''`** 을 돌려준다 — 그때는 `theme_default_layout`(contents 계열)이 적용되는 hoist 경로다. 여기서 제목을 뽑으면 **명시 layout 없는 기존 표 슬라이드 전부**의 렌더가 바뀐다
    - 🔑 **부수로 같은 원인의 다른 증상을 잡았다 — 제목이 두 개 렌더되고 있었다.** `graphify` 덱의 `#layout-contents` 명시 + H1+H2 + 표 슬라이드 2장에서, 표 때문에 H1 이 본문에 남아 hoist 가 그것을 `.title` 로 올리고 H2 도 `.title` 을 받았다. **표 없는 같은 구조는 H1 을 지운다** — 곧 이것도 *"표 유무가 갈림"* 의 다른 얼굴이다. 픽스처(E 표 없음 / F 표 있음)로 이제 양쪽이 **제목 1개**로 같아지는 것을 확인했다
    - **검증** — 재현 픽스처 6케이스: exercise·exercise-small 표 있음 2장 **슬롯 채워짐 · 본문 중복 0** · 표 없는 exercise 불변 · 표 있는 contents 불변 · H1+H2 contents 는 표 유무 무관 제목 1개 · agenda TOC 에 제목 전부 표기(「슬라이드 N」 0). 전 덱 **26개 재빌드 diff**: 171건 중 **168 캐시버스터** · 실질 3건 전부 위 의도된 변화
    - 러너 불변 — `3.parity` igTest·aTest-all 7/7 · aTest 5/7+건너뜀 2 · `6.roundtrip` aTest·aTest-all ✅ · `4.laneb` 6/6 · `5.lanem` ✅
    - ℹ️ `integration.test.js` 7건 실패와 `--lint-deployment` 30건은 **HEAD 에서도 동일한 기존 상태**다(후자는 원고 본문의 `http://localhost:11434` 안내·mermaid 라벨·docker 경로를 문자열로 잡은 오탐)

## Issue361: sreMsa v2.1.2 가독성 처방을 `legibility` goal 로 정책 스키마에 편입 (등록: 2026-09-19, 해결: 2026-09-19, commit: `d25edf7`) ✅
* 목적: m2slide 의 `legibility` 계열은 **선언만 있고 비어 있다.** [lint-policy-schema.py](lib/lint-policy-schema.py) 가 술어 6종(`chars_max`·`items_max`·`font_size_min`·`box_overflow_max`·`lines_max`·`no_empty_bullet_li`)을 열거하지만 실제로 쓰는 룰은 [styles.yml](data/md-builder/styles.yml) 의 `backtick_marker_conflict_policy` 하나뿐이고, 그마저 `no_empty_bullet_li` 만 쓴다 — **나머지 5종은 소비처 0건**이다. 한편 prj61 sreMsa 는 v2.1.2 에서 그 5종을 실제로 기계 판정하는 검증기와 실측 근거를 이미 만들었다. 그 처방을 정책 스키마로 옮겨 빈 계열을 채운다
* 상세 (근거 — prj61 sreMsa Issue18, 2026-09-19 종결, commit 960908b):
    - 정본 리포트 `~/work/sreMsa/_doc_work/report/v2.1.2_가독성교정_issue18_report.md` · 검증기 `~/work/sreMsa/sh/ig-legibility-check.py`
    - 실측 규모 — 인포그래픽 run 887개 중 **16pt 미만 769 → 0**, **bold 393 → 213**, **도형 밖 넘침 6 → 0**, 신규 겹침·장식 침범 0, 장 수 보존(147·133)
    - 처방① **바닥 글자 크기 16pt** — 기존 `font_size_min` 술어에 그대로 대응한다
    - 처방② **본문 굵기 해제** — 16pt 본문의 bold 를 전부 푼다. 유지는 넷뿐(바닥보다 큰 글자 · 진한 채움 위 흰 글자 · 강조 배경 안 글자 · 원형 안 3자 이하 기호). **대응 술어 없음**
    - 처방③ **넘침 흡수 순서** — 글자를 키우면 도형을 넘치므로 줄이지 않고 ⑴가로 확장 ⑵여백 0 ⑶이웃 라벨 죔 ⑷도형 확대 ⑸괘선 길이 ⑹라벨을 막대 밖으로 순으로 흡수한다. `box_overflow_max` 에 대응하되 **전술의 순서 자체가 정책의 일부**다
    - 처방④ **신규 겹침 0 · 신규 장식 침범 0** — 교정이 만들어 낸 새 충돌을 기준본과 대조해 센다. **대응 술어 없음**
    - 처방⑤ **적용 범위가 판정의 핵심** — *"placeholder 가 아니면서 run 에 크기가 명시된 도형"* 만 고친다. 곧 **우리가 생성한 도형만**이고 상속분(Keynote 산 원본)은 건드리지 않는다. 근거는 원본 전수 조사에서 그런 run 이 0개라는 실측이다. **대응 필드 없음**
    - ⚠️ **⑹ 은 값을 가진 도형을 키우면 그래프가 거짓말이 되는 예외다** — 카나리 5% 막대는 높이 0.046in 이라 막대를 그대로 두고 라벨만 밖으로 꺼냈다. legibility 와 fidelity 가 정면으로 부딪치는 지점이고, 스키마가 이 충돌을 표현할 수 있어야 한다
    - ⚠️ **⑶ 은 전 장 일괄 적용이 회귀를 냈다** — 추정 글꼴이 실제보다 좁아 멀쩡하던 카드 제목이 두 줄로 접혔다(part1 s22 실측). 228건 → 필요분 4건으로 줄였다. `confidence` 와 적용 범위를 어떻게 둘지의 실사례다
* 구현 명세:
    - 산출은 **스키마 정의 + 정책 yml 룰**이다. 교정 스크립트 이식은 범위 밖 — sreMsa 는 pptx 후처리이고 m2slide 는 원고 → 산출 경로라 구현체가 다르다. 옮기는 것은 *판정 기준*이지 *코드*가 아니다
    - ① [policy-goal-schema.md](_doc_arch/policy-goal-schema.md) 에 `legibility` 계열 절을 세우고 신규 술어를 정의한다 — `emphasis_scope`(굵기 유지 조건 화이트리스트)·`overlap_count_max`·`decoration_intrusion_max`. 이름·의미는 등록 시점 잠정이며 착수 때 확정한다
    - ② 문서를 먼저 고치고 [lint-policy-schema.py](lib/lint-policy-schema.py) 의 `GOAL_CHECK_FAMILIES["legibility"]` 를 뒤따라 동기화한다 (순서는 [data-access-rules.md](.claude/rules/data-access-rules.md) 의 동기화 의무)
    - ③ **적용 범위 축을 어디에 둘지 가른다** — 처방⑤ 의 판정 기준은 덱 용도(`purpose`, 축 2)가 아니라 **요소의 출처**(생성분 / 상속분)라서 기존 두 축 어디에도 맞지 않는다. 축을 새로 세울지, `applies_to_*` 계열로 흡수할지가 이 이슈의 설계 핵심이다
    - ④ 룰이 `data/md-builder/styles.yml`(원고 측)과 [transform.yml](data/m2slide2ppt/transform.yml)(pptx 산출 측) 중 어디에 사는지 가른다. 굵기·바닥 크기는 산출 측 테마 값이라 후자일 가능성이 높다
    - ⑤ `evidence` 에 prj61 실측을 그대로 적는다(project: sreMsa · date: 2026-09-19 · 위 수치). `confidence` 는 단일 프로젝트 1회 관측이라 **medium 이 상한**이다
    - 검증: `./m2slide.sh --lint-data` rc0 + 검사 4(goal-oriented 스키마)가 신규 술어를 계열 정합으로 받아들일 것
    - 종료 조건: ①~④ 가 문서·코드에 반영되고 `--lint-data` 가 통과하며, 신규 술어를 실제로 쓰는 룰이 최소 1건 등록된다
* ⚠️ **본 이슈는 등록까지만 수행했다** (사용자 지시 2026-09-19 — "등록만 하고 구현은 하지 말 것"). 착수 전 ③ 의 설계 판정을 먼저 사용자와 확인한다
* 결과 — **①~④ 전부**. 착수 전 ③④ 를 사용자에게 확인하고(이슈가 요구한 절차) 그 판정대로 냈다:
    - **③ 적용 범위 — 축을 세우지 않는다** (사용자 판정: *"축 신설 없이 술어 조건으로"*). 근거가 실측이다: m2slide 정방향 pptx 는 reference-doc 테마 + 생성 도형이라 **모든 요소가 생성분**이고, sreMsa 가 겪은 *"Keynote 산 상속분을 건드리지 않는다"* 문제가 **구조적으로 존재하지 않는다**. 소비처 0 인 축을 세우면 *이 계열이 비어 있던 것과 같은 실패*를 축 층에서 되풀이한다. 범위는 룰 내부 `scope.target: run_with_explicit_size` 로 적었다. 🚧 `ppt2m2slide` 로 상속분이 유입되는 경로가 실제 소비처를 가지면 그때 축으로 승격
    - **④ 룰 위치 — `transform.yml`** (사용자 판정). 굵기·바닥 글자 크기는 **산출 측 테마 값**이고 집행 지점도 lane T·retheme 이다. 원고에는 pt 라는 개념이 없어 **판정 근거를 원고에서 얻을 수 없다** — 판정과 집행이 같은 단계에 있어야 갈리지 않는다
    - **신규 술어 3종** — `emphasis_scope`(굵기 유지 조건 화이트리스트) · `overlap_count_max` · `decoration_intrusion_max`. 뒤 둘은 교정이 **새로 만든** 충돌만 센다 — 원래 있던 겹침과 성격이 다르고 그 **차분**을 재는 술어가 기존 계열에 없었다
    - 🔑 **`goal_check` 에 조건·전술을 넣었다가 검사 4에 걸렸고, 그것이 옳은 동작이었다.** 처음 설계는 `target`·`absorb_order`·`value_bearing_shapes` 를 `goal_check` 안에 뒀는데 lint 가 *"계열에 없는 술어"* 로 거부했다. `goal_check` 는 **판정 술어의 닫힌 집합**이고 조건·전술은 판정이 아니다 — 섞으면 *"무엇을 재는가"* 와 *"어떻게 고치는가"* 가 한 자리에 엉킨다. `scope`·`remedy` 로 분리했고 이 경험을 [policy-goal-schema.md](_doc_arch/policy-goal-schema.md) 에 경고로 남겼다
    - **흡수 순서는 `remedy.absorb_order` 가 목록으로 들고 있다** — 순서가 정책의 본체다. ⑹(라벨을 막대 밖으로)은 legibility 와 fidelity 가 정면으로 부딪치는 예외라 `remedy.value_bearing_shapes: keep_geometry` 로 명시했다(값을 가진 도형을 키우면 **그래프가 거짓말이 된다** — 카나리 5% 막대 0.046in 실측)
    - `confidence: medium` 상한 — 단일 프로젝트 1회 관측이고, ⑶ 이웃 라벨 죔은 전 장 일괄 적용이 회귀를 낸 실사례(228건 → 필요분 4건)가 있다
    - **검증** — `--lint-data` 검사 4 **통과**(goal-oriented 룰 11개, 신규 술어를 계열 정합으로 받음) · 정책 yml backup 선행(`_backup/20260919-204137-transform.yml`) · 커밋은 정책 규율대로 정책 yml + 정책 문서 + 정책 lint 구현만
    - ⚠️ **`--lint-data` rc0 은 달성하지 못했다** — 검사 5 가 `Projects/1.design_rnd/DESIGN.md` 의 내부 이슈 번호 누출 **5건**을 잡는데 **다른 세션이 작업 중인 덱**의 기존 위반이며 본 이슈와 무관하다(`run-policy-fixture.sh` 실패도 같은 원인 하나이고 골든 픽스처 자체는 통과)
    - 🚧 **집행체는 아직 없다** — 본 이슈의 산출은 이슈 명세대로 **스키마 정의 + 정책 룰**이다. lane T 에서 이 바닥선을 실제로 재고 흡수하는 코드는 후속이다
    - ℹ️ 설계 문서([policy-goal-schema.md](_doc_arch/policy-goal-schema.md))는 이 repo 가 `_doc_arch` 를 추적하지 않아(`.gitignore:6` — repo-tracking-rules) 커밋에 담기지 않는다. 로컬 파일로는 정상 갱신됐다

## Issue374: 챕터 진입 장의 정본을 세우고 러너를 그것에 맞춘다 (등록: 2026-09-19, 해결: 2026-09-19, commit: `ac5c094`) ✅
* 목적: `3.parity igTest` 가 3/7 로 남아 있는데, 원인 추적에서 **판정이 두 번 뒤집혔다**. 더 큰 사실은 그 과정에서 드러났다 — **장 구성 규칙이 어디에도 설계 문서로 없다.** 규칙은 [build-source.py](lib/pptx/build-source.py) 의 docstring·주석에만 있어 러너·설계 문서·코드가 서로 다른 전제를 든다
* plan: `_doc_work/plan/chapter-entry-parity_plan.md`
* depends: Issue369
* 상세 — 한 세션 안에서 세 번 어긋났다:
    - **코드 ↔ 코드**: `normalize_chapter` docstring 이 *"part 라벨은 버린다"* 고 정해 두었는데 `explicit_entry` 경로에만 빠져 있었다 → `Chapter N.` 이 직전 장으로 흘러 왕복 −3 · lane B 2/6 (commit `bf3efa3` 로 해소, igTest 37 → 42장)
    - **설계 ↔ 실측**: [chapter-single-mode.md](_doc_arch/chapter-single-mode.md) 는 *"`cards_placeholder=false` 면 H1 챕터 타이틀을 deck 에서 제거"* 라 단언하는데 **명시 `#layout-*` 이 붙으면 살아남는다**(slide-parser 가 `s.layout` 이 있으면 autoToc 판정을 건너뛴다). 이 예외가 문서에 없다
    - **러너 ↔ 정책**: `3.parity` 는 `html_body + n_prologue`(41)를 기대하는데 현행 pptx 는 거기에 **Agenda 장 1개**를 더 만든다(42). ③④ 는 `Section Header` 전제인데 현행 진입 장은 `## 부제 + 목록` 이라 `Title and Content` 로 나온다
    - ⚠️ `6.roundtrip` 은 같은 덱에서 **통과**한다(생성물 예산 ±2 로 흡수). **두 러너가 같은 사실을 다르게 판정**하는 상태 자체가 정합 대상이다
* 구현 명세:
    - **① 문서 먼저** — 러너를 먼저 고치면 그 기대값이 또 다른 복제본이 되어 다음 변경 때 같은 자리에서 갈린다. `pptx-parity.md` 에 「장 구성 — 무엇이 몇 장이 되나」 절 신설(생성물 예산 정의 포함) + `chapter-single-mode.md` 에 명시 layout 예외 반영
    - **② 러너는 참조하게** — `3.parity` 의 `want` 에 pptx 전용 생성 장을 반영하되 **숫자를 박지 말고 pptx 에서 세어 얻는다**. ③④ 의 `Section Header` 전제 제거 — 챕터 경계는 AGENDA 챕터명 + 제목 순서로 찾는다
    - **③ 검증** — `3.parity igTest` 7/7 · 회귀 0(`6.roundtrip` 3덱 · `4.laneb` · `5.lanem` · `--lint-data` · `--coverage`) · **두 러너가 같은 덱에서 같은 판정**
    - 열린 질문 3건은 plan `# 열린 질문` 절 참조 (Agenda 장의 계약상 지위 · 진입 장을 Section Header 로 낼 것인가 🚧 · 두 러너 일원화 여부)
* Checkpoints:
* 결과 — **①②③**. `3.parity igTest` **3/7 → 7/7**:
    - 🔑 **Q1 은 결정이 아니라 확인으로 닫혔다** — `Agenda` 장은 [fidelity.yml](data/m2slide2ppt/fidelity.yml) 에 **이미 `agenda_slide` / `grade: synthesized`** 로 선언돼 있었다(HTML `agenda.html` 1장 ↔ pptx 1장). 새 계약이 필요한 게 아니라 **러너가 그 선언을 안 읽던 것**이 문제였다. 같은 파일에 `deck_toc_slide` 도 선언돼 있는데 러너가 그것을 빼먹은 것이 ① 의 42 ↔ 41 이었다
    - **① 문서 먼저** — [pptx-parity.md](_doc_arch/pptx-parity.md) 「장 구성 — 무엇이 몇 장이 되나」 신설(대응 원칙 · 생성 장 카탈로그 · 진입 장 판정 · `Section Header` 경고). [chapter-single-mode.md](_doc_arch/chapter-single-mode.md) 에 **명시 `#layout-*` 예외** 반영 — `slide-parser` 가 `s.layout` 이 있으면 autoToc 판정을 건너뛰므로 `cards_placeholder=false` 의 제거 대상이 되지 않는다
    - 🔑 **생성 장 셋을 한 덩어리로 세면 틀린다** — `chapter_toc` 는 HTML 챕터 안에도 있어 본문 계수에 이미 잡히고, `deck_toc`·`agenda` 만 예산에 더한다. 실측 igTest 표식 7개(`deck_toc` 1 · `agenda` 1 · `chapter_toc` 5) 중 **더할 것은 2개**. 러너는 숫자를 박지 않고 `lane-s.json` 에서 센다
    - 🔑 **`Section Header` 개수로 챕터 경계를 찾는 판정이 애초에 성립하지 않았다** — 그 layout 은 제목만 담으므로 현행 진입 장(`## 부제 + 목록`)은 `Title and Content` 로 나온다. 실측 igTest 는 **챕터 5개인데 `Section Header` 0개**다. 경계는 AGENDA 순서 + 챕터별 HTML 장수로 자른다
    - **진입 장 수는 세어 보고만 하고 단언하지 않는다** — 챕터별로 명시 layout 유무가 달라 *"챕터 수와 같아야 한다"* 도 *"0 이거나 전부"* 도 성립하지 않는다(실측 aTest-all: 챕터 6 중 진입 장 5). 진입쌍 어긋남은 ③ 이 잡는다
    - 🔑 **`skip` 축 신설 — 구 러너는 한 덱에서 두 판정이 엇갈렸다.** 챕터 HTML 이 0개인 single mode(aTest)에서 ①은 *"0장 기대"* 로 실패시키고 ③은 대조 대상이 없어 **조용히 통과**시켰다. 대조 불가를 명시해 건너뛰고, **skip 을 통과로 세지 않는다**(총계가 `통과 5/7 · 건너뜀 2` 로 나온다) — 통과로 세면 거짓 안심, 실패로 세면 고칠 것 없는 빨간불이다
    - **검증** — `3.parity`: igTest 3/7 실패 → **7/7** · aTest-all 3/7 실패 → **7/7** · aTest 2/7 실패 → **실패 0**(①③ skip). `6.roundtrip` aTest·aTest-all ✅ · `4.laneb` 6/6 · `5.lanem` ✅ · **장 수 축에서 두 러너가 같은 판정**
    - Q2(진입 장을 `Section Header` 로 낼 것인가)·Q3(두 러너 일원화)은 plan 이 명시한 대로 **범위 밖** 그대로다
    - ⚠️ **남은 것 — `6.roundtrip igTest` 는 테마 자산 1건으로 실패한다**(`finfraPuffer2.png`). 원고의 `#layout-chapter` 5개가 요구하는 CSS 배경인데 lane T 가 배경 자산을 pptx 로 옮기지 않는 **기존 격차**다(원고·해당 CSS 규칙 모두 이번에 건드리지 않았다 — `git show` 로 확인). 장 수 축이 아니라 `3.parity` 에 없는 축이라 종료 조건과 무관하며 이슈후보로 넘겼다
    - ⚠️ `--lint-data` 는 `Projects/1.design_rnd/DESIGN.md` 의 내부 이슈 번호 누출 5건으로 실패한다 — **다른 세션이 작업 중인 덱**의 기존 위반이라 본 이슈 범위 밖

## Issue371: default_lec `contents-split` 이 반쪽이다 — divider 는 테마가 숨기고 머리말 슬롯은 템플릿에 없다 (등록: 2026-09-19, 해결: 2026-09-19, commit: `7dc0644`) ✅
* 목적: 발주처 prj60 `__lec` 이 `2.3.contents-split` 을 쓰려다 **제목 아래가 빈 띠로 남고 머리말(`1일차 — …`)이 통째로 사라지는** 것을 보고. 진단 결과 템플릿·테마·엔진 셋 중 **템플릿만 있고 나머지 둘과의 배선이 안 됐다**. 본 이슈는 진단·해법 선택지까지 하고 수정은 별도 결정으로 넘긴다
* 상세:
    - **① `.split-divider` 규칙 — 답은 "없다"가 아니라 "테마가 적극적으로 숨긴다"이다**
        - [default_lec/slide.css](theme/default_lec/slide.css) 안 `.split-divider` 선언 **0건** (보고와 일치)
        - 단 [base.css:916](lib/css/base.css#L916) 에 `.reveal section.layout-split-image-text .split-divider { width:40%; margin:0.5em 0 0 0; }` 가 **있다.** 그러나 `border`·`background`·`height` 가 없어 `<div>` 로는 **애초에 보이지 않는다**(`<hr>` 였다면 기본 border 로 보였다 — 템플릿은 `<div>` 를 쓴다, [2.3.contents-split.html:30](theme/default_lec/layouts/2.3.contents-split.html#L30))
        - 결정타는 [slide.css:167](theme/default_lec/slide.css#L167) — `.reveal section[class*="layout-"] [class$="-divider"]:not([class*="htmlart-"]) { display: none !important; }`. `split-divider` 는 `-divider` 로 끝나고 `htmlart-` 를 포함하지 않으니 **매칭 → 강제 숨김**. default_lec 는 divider 를 버리고 `hr.png` 브러시로 갈아탔다([slide.css:164](theme/default_lec/slide.css#L164) 주석)
        - ⚠️ **그 대체 수단인 브러시도 split 에는 안 걸린다 — 제목 아래가 비는 진짜 이유가 이것이다.** 브러시는 [slide.css:141-152](theme/default_lec/slide.css#L142) 의 `::after` 셀렉터 목록으로 붙는데, 그중 `> .title::after` 는 **`section` 의 직계 자식** `.title` 만 노린다. split 템플릿은 `{{content}}` 를 `<div class="split-header">` 로 **한 겹 감싸므로**([2.3.contents-split.html:28-29](theme/default_lec/layouts/2.3.contents-split.html#L28)) `section > .title` 이 성립하지 않는다. divider 가 없어서가 아니라 **브러시가 선택자에서 빗나가서** 비는 것이다
    - **② 머리말 — 다른 테마와 충돌하지 않는다. 엔진 수정도 필요 없다**
        - `2.3.contents-split.html` 은 **`theme/default_lec/layouts/` 에만 있다**(`theme/` 전체에서 유일 — `default`·`default_dark` 에는 파일 자체가 없다) → 템플릿만 고치면 되고 **타 테마 영향 0**
        - 엔진 측은 **이미 준비돼 있다** — [html-builder.js:567-568](lib/html-builder.js#L567) 이 `_hl`/`_hr` 을 계산해 [html-builder.js:577](lib/html-builder.js#L577) 에서 **모든 layout 의 vars 에 무조건 주입**한다. 템플릿이 `{{head_left}}` 를 **안 쓸 뿐**이다
        - 선례: [_contents.html:26-28](theme/default_lec/layouts/_contents.html#L26) · [2.2.contents-full.html:23-25](theme/default_lec/layouts/2.2.contents-full.html#L23) 가 `.contents-head-bar` > `.contents-head-left`/`-right` 구조로 쓴다
    - **③ 빈 div 를 제거하는 주체** — [layout.js:82](lib/layout.js#L82) `_stripEmptyWrappers`, 호출은 [layout.js:75](lib/layout.js#L75) `renderLayout` 말미. [layout.js:97](lib/layout.js#L97) 의 `/<(span|div)\b(?![^>]*contents-head)[^>]*>\s*<\/\1>/g` 를 **변화가 없을 때까지 반복** 적용한다. 예외는 클래스에 `contents-head` 를 포함하는 div 뿐이므로 `<div class="split-divider"></div>` 는 **제거된다** (보고와 일치). 다만 남아 있었어도 slide.css:167 이 `display:none` 이라 **결과는 같다**
* 구현 명세:
    - **ⓐ 머리말 복구** — 템플릿에 `.contents-head-bar` 블록을 `_contents.html:26-28` 과 **같은 클래스명으로** 넣고 `@meta slots` 에 `head_left`·`head_right` 를 추가한다
        - ⚠️ **클래스명을 바꾸면 안 된다.** `_stripEmptyWrappers` 의 예외가 문자열 `contents-head` 에 걸려 있어([layout.js:87](lib/layout.js#L87) 주석) `split-head-bar` 같은 이름을 쓰면 **빈 head-bar 가 통째로 제거되고**, 그 순간 default_lec 의 `:has()` 기반 fallback(빈 head-bar collapse · 제목 위 브러시 복원)이 **매칭 대상을 잃어 무력화**된다
    - **ⓑ 제목 아래 띠 복구** — 셋 중 택일 (사용자 판정 대상)
        - ⒜ 템플릿에서 `{{content}}` 를 `.split-header` **밖으로 꺼내** `section > .title` 이 성립하게 한다 → 브러시가 자동으로 붙고 **CSS 수정 0**. 단 `.split-header { padding: 1.5em 0 }`([base.css:906](lib/css/base.css#L906))의 여백 역할을 대체해야 한다
        - ⒝ [slide.css:142](theme/default_lec/slide.css#L142) 의 브러시 셀렉터 목록에 `.reveal section.layout-split-image-text .split-header > .title::after` 를 **추가**한다. 템플릿 불변, 테마 1파일만 수정
        - ⒞ `.split-divider` 를 slide.css:167 숨김에서 예외 처리하고 직접 스타일을 준다. **비권장** — default_lec 가 divider 를 버리고 브러시로 간 방향에 역행하고, 브러시와 구분선이 **둘 다** 나올 위험이 있다
        - **판정 제안: ⒝** — 영향 범위가 default_lec 한 파일이고, 다른 layout 의 브러시 규칙과 같은 자리에 살아 SSOT 가 갈리지 않는다
    - **ⓒ** ⒝ 채택 시 `<div class="split-divider"></div>` 는 **템플릿에서 지운다** — 제거·숨김 양쪽에 걸려 있는 죽은 마크업이다
    - 검증: prj60 `1.design_rnd` 의 `contents-split` 슬라이드에서 머리말·제목 띠 렌더를 육안 확인 + `./m2slide.sh` 기존 3덱 회귀 0(해당 layout 미사용이라 0 예상)
    - 종료 조건: `contents-split` 이 `contents`·`contents-full` 과 **머리말·제목 띠에서 같은 겉모습**을 내고, `theme/` 의 다른 테마 렌더 변화 0
* 결과 — **ⓐ + ⓑ⒝ + ⓒ**(이슈의 판정 제안 그대로):
    - ⚠️ **발주처 덱에는 이 layout 사용이 이미 0 건이었다** — `1.design_rnd` 에서 `layout-split-image-text` 는 **인라인 CSS 9 건뿐이고 실제 `<section>` 은 0 개**다. 깨져서 포기한 상태라 재현 픽스처(default_lec · `contents` / `contents-full` / `contents-split` 3 장 비교)를 만들어 증상부터 확정했다
    - **ⓐ 머리말** — 엔진은 이미 준비돼 있었다(`_hl`/`_hr` 을 **모든 layout 의 vars 에 무조건** 주입). 템플릿이 `{{head_left}}` 를 안 쓴 것뿐이다. 🔑 **클래스명은 `contents-head-bar` 그대로** 써야 한다 — 이슈 경고대로 `contents-head` 문자열이 [`_stripEmptyWrappers`](lib/layout.js#L87) 의 유일한 예외이고 테마의 `:has()` fallback 도 그 이름에 걸려 있어, 다른 이름이면 **빈 바가 제거되고 fallback 이 매칭 대상을 잃는다**
    - 🔑 **ⓑ 원인은 divider 부재가 아니라 브러시가 선택자에서 빗나간 것** — 브러시는 `section > .title::after` 인데 split 은 `{{content}}` 를 `.split-header` 로 한 겹 감싸 직계가 아니다. 실측이 이를 확정: `contents-full` 은 `brush:true · afterH 10px`, split 은 `brush:false · afterH auto`. ⒝(테마 1 파일에 셀렉터 추가)를 택했다 — ⒜는 [base.css](lib/css/base.css#L906) `.split-header{padding:1.5em 0}` 의 여백 역할을 대체해야 하고(그 파일은 수정 가드 대상), ⒞는 default_lec 가 divider 를 버리고 브러시로 간 방향에 역행한다
    - 겉모습을 맞추려 **4 곳에 함께 편입**했다 — 제목 풀폭(브러시가 텍스트 폭에 머물지 않게) · 상단 `::before` 숨김 · `head-bar::after` 브러시 · 빈 head-bar 의 `:has()` fallback. 하나라도 빠지면 *"머리말은 나오는데 선이 어긋난다"* 가 된다
    - **ⓒ** `<div class="split-divider"></div>` 제거 — `_stripEmptyWrappers` 가 지우고 `slide.css:167` 이 `display:none` 하는, **제거·숨김 양쪽에 걸린 죽은 마크업**이었다
    - **검증**(ego-browser computed `::after`): split 이 `contents-full` 과 **제목브러시 10px · 제목폭 1620 · 머리말 2 항목 · 머리말브러시 10px · 상단선 none** 으로 전부 동일. 회귀 — split 사용 덱이 **0 건**이고 추가 셀렉터가 전부 `.layout-split-image-text` 한정이라 타 layout·타 테마 렌더 변화 0 · 대표 덱 빌드 오류 0 · `--lint-layouts`·`--lint-license` 통과
    - ⚠️ `--lint-deployment` 가 `AgenticCoding` 에서 2 건을 잡지만 원고 본문의 정상 내용(`http://localhost:3000 열기` 예시 · `/Users/... vs ./...` 설명)을 문자열로 잡은 **기존 오탐**이다. 그 덱은 split 을 쓰지 않아 본 수정과 무관

## Issue373: agenda markmap 이 챕터 안 계층을 버린다 — harvest 가 `h1`/`h2` 를 가르지 않고 평평하게 담는다 (등록: 2026-09-19, 해결: 2026-09-19, commit: `9135be4`) ✅
* 목적: 발주처 prj60 `__lec` 1일차 덱에서 [agenda.html](Projects/1.design_rnd/slide/agenda.html) markmap 이 **챕터 한 파일의 62 슬라이드를 전부 형제로** 낸다. 원고는 `#` 7 · `##` 54 로 2단인데 agenda 만 평평하다. 같은 원고에서 만드는 덱 안 목차(`#/toc-placeholder`)는 [html-builder.js:295-320](lib/html-builder.js#L295) `generateTOCFromFile` 이 `#`=가지 · `##`=잎으로 정상 중첩하므로, **한 원고에서 두 목차가 다른 구조로 나온다**
* 상세 (실측 2026-09-19 — `Projects/1.design_rnd` 가 prj60 과 같은 원고):
    - **원인 확정** — [generate-slides.js:354-379](lib/generate-slides.js#L354) 의 agenda markmap 확장 보강 블록. `<section>` 을 훑으며 [:373](lib/generate-slides.js#L373) 에서 `/<h[12][^>]*>([\s\S]*?)<\/h[12]>/` 로 제목만 뽑고 [:376](lib/generate-slides.js#L376) 에서 `items.push(...)` 로 **레벨 구분 없이 평평하게** 담는다. [:378](lib/generate-slides.js#L378) 이 그 배열을 통째로 `node.children` 에 넣는다 → 발주처 1차 진단대로다
    - **실측**: 원고 `01-day1.md` = `#` 7 · `##` 54 (코드펜스 제외). 산출 `01-day1.html` 의 `.slides` 하위 top-level `<section>` = 62 (= 61 + toc-placeholder 1). agenda 의 `01-day1.html#/N` 앵커 = **1~62 전부, 전원 형제**
    - ⚠️ **`h1`/`h2` 태그로 가르면 안 된다 — 62 섹션 중 첫 heading 이 `<h1>` 인 것이 26 개다.** 원고의 `#` 은 7 개뿐이고, 나머지 19 개는 `##` 인데 레이아웃 템플릿이 제목을 `<h1>` 로 렌더한 것이다. 태그 기준으로 가르면 **가짜 가지 19 개**가 생긴다
    - ✅ **`data-heading-level` 이 정답이다.** [html-builder.js:636-637](lib/html-builder.js#L636) 이 `<section>` 에 붙이며, 실측상 `data-heading-level="1"` 이 붙은 섹션은 **정확히 7 개**이고 그 제목이 원고 `#` 7 줄과 **1:1 일치**한다(`#/1,3,12,24,37,48,58`)
    - ⚠️ 단 **`data-heading-level="2"` 는 한 번도 나오지 않는다** — H2 는 무속성이다. 곧 *"속성 1 = 가지, 무속성 = 그 가지의 잎"* 규칙으로 써야 하고, `="2"` 를 기대하는 구현은 빈 결과를 낸다
    - ⚠️ `slide.headingLevel` 의 **대입 지점을 현재 트리에서 grep 으로 찾지 못했다** (`lib/` 전체에서 `headingLevel` 은 [html-builder.js](lib/html-builder.js) 12 곳뿐이고 전부 소비처·주석). 산출물에는 실제로 붙으므로 어딘가에서 동적으로 부여된다 (검증 필요) — 고치기 전에 대입 지점을 확정할 것
    - **toc-placeholder 혼입은 버그다** — `#/2` 섹션은 `id="toc-placeholder"` 이면서 안에 챕터 제목 `<h1>` 을 갖고 있어, `#/1`(챕터 표지)과 **제목이 똑같은 노드**가 agenda 에 두 번 뜬다. 원고에 대응 heading 이 없는 삽입 슬라이드이므로 제외 대상
    - **`###` 서브 엔트리로 우회할 수 없다**는 판단도 맞다. [generate-slides.js:355](lib/generate-slides.js#L355) 가 children 이 있으면 건너뛰지만, [agenda.js:334](lib/agenda.js#L334) 가 `path.basename(경로, '.md') + '.html'` 로만 해석한다. `node -e` 실측: `./01-day1.md#/3` → **`3.html`** (보고된 `01-day1.md#/3.html` 이 아니다 — `#/` 의 `/` 를 경로 구분자로 보고 basename 이 `3` 이 된다). 어느 쪽이든 **없는 파일을 조용히 가리키는 죽은 링크**라 결론은 같다
    - **기존 덱 영향도 전수** (`Projects/` 94 개 챕터가 harvest 경로를 탄다):

      | 구분 | 수 | 고치면 |
      | :--- | :-- | :--- |
      | `#` 2 개 이상 + `##` 있음 | **1** (`1.design_rnd/01-day1.md`) | 2 단으로 바뀐다 — **본 이슈의 대상** |
      | `#` 2 개 이상 + `##` 0 | 10 (AgenticCoding 2 · BasicKnowledgeForAI_small 2 · fPmIntro 3 · fPmIntro_en 3) | 전원이 가지가 되지만 자식이 없어 **지금과 같은 평면** |
      | `#` 1 개 | 77 | 챕터 노드 아래 **제목이 같은 노드가 한 겹 더** 생긴다 — 77 중 **75 가 agenda 항목명과 동일 문자열** |

    - 곧 **회귀 위험은 `#` 1 개짜리 77 개**에 있다. 레벨만 살리면 `챕터 → (같은 제목) → 잎` 이 되어 한 겹이 헛돈다
* 구현 명세:
    - ① harvest 를 `data-heading-level="1"` 기준 **2 단 조립**으로 바꾼다 — 속성이 있으면 새 가지를 열고, 없으면 **직전 가지의 자식**으로 넣는다. 가지가 아직 없으면(파일 첫 슬라이드가 H2) 지금처럼 루트 직계로 둔다 ([html-builder.js:295-320](lib/html-builder.js#L295) 의 `currentSection` 처리와 같은 모양 → **두 목차의 판정이 한 규칙으로 합쳐진다**)
    - ② **toc-placeholder 제외** — `<section ... id="toc-placeholder">` 이면 push 하지 않는다. ⚠️ `idx` 증가는 **그대로 둔다**. `#/N` 은 산출 DOM 순서가 ground truth 라 건너뛴 만큼 당기면 모든 뒤 앵커가 1 씩 어긋난다
    - ③ **`#` 이 1 개뿐이면 가지를 만들지 않고 지금처럼 평면 유지** — 위 표의 77 개를 무변경으로 지키는 가장 싼 가드다. (대안: 첫 가지 제목이 agenda 항목명과 같으면 챕터 노드로 흡수. 75/77 이 해당하나 문자열 비교라 표기 흔들림에 약하다)
    - ④ **markmap 펼침 깊이 동반 확인** — [`_config.yml`](Projects/1.design_rnd/_config.yml) `markmap_depth: 2`, agenda 산출의 `initialExpandLevel: 2`. 계층이 한 겹 깊어지면 잎이 기본 접힘이 된다. 원 요구가 *"클릭해서 펼치기"* 였으므로 접힘이 정상이지만, **의도한 접힘인지 1 회 확인**할 것
    - ⑤ **`agenda.js` 같은 파일 앵커 지원은 별개 해법이고, 권하지 않는다.** [agenda.js](lib/agenda.js) 에 `path.basename(m[2], '.md') + '.html'` 이 **12 곳** 있고([:119](lib/agenda.js#L119)~[:334](lib/agenda.js#L334)) 전부 *"엔트리 1 개 = 파일 1 개"* 를 전제한다. 앵커를 허용하면 [getChapterNumberMap:290-298](lib/agenda.js#L290) 의 `map[html]` 이 같은 키에 두 번 써져 챕터 번호가 덮이고, `getNextChapter`·`getParentPage`·`getNextSiblingChapter` 의 ⇤/⇥ 이동이 같은 파일을 서로 다른 챕터로 센다. **난이도 상** — 프래그먼트 분리 + 12 곳 + 네비게이션 4 종 재정의. ①~③ 이 같은 증상을 훨씬 싸게 없앤다
    - 검증: `Projects/1.design_rnd` 재빌드 후 agenda 의 `01-day1.html#/N` 가지 7 · 잎 54 · toc-placeholder 0 · 앵커 번호가 재빌드 전과 동일. 나머지 93 개 챕터는 **agenda 산출 diff 0**
    - 종료 조건: 위 검증 2 항 통과 + `data-heading-level` 대입 지점 확정 기록
* 결과 — **①②③ 전부**. [generateTOCFromFile](lib/html-builder.js#L295) 의 `currentSection` 처리와 같은 모양으로 맞춰 **두 목차의 판정을 한 규칙으로 합쳤다**:
    - 🔑 **`data-heading-level` 대입 지점을 확정했다 — 그리고 못 찾았던 이유가 [Issue372](#issue372) 였다.** 대입은 [slide-parser.js:535-536·561](lib/slide-parser.js#L535) `s.headingLevel = level` 두 곳, 주입은 [html-builder.js:637](lib/html-builder.js#L637). 이슈가 *"grep 으로 찾지 못했다"* 고 적은 것은 **그 파일에 리터럴 NUL 이 박혀 grep 이 바이너리로 판정**했기 때문이고, Issue372 에서 sentinel 을 없앤 **직후** 정상적으로 잡혔다. 곧 이 항목은 Issue372 의 부수 효과로 자동 해소됐다
    - **가르는 기준은 태그가 아니라 속성** — 이슈 경고대로 `h1`/`h2` 로 가르면 가짜 가지 19 개가 생긴다(레이아웃이 H2 제목도 `<h1>` 로 렌더). 그리고 `="2"` 는 **한 번도 나오지 않아**(H2 는 무속성) *"속성 1 = 가지, 무속성 = 그 가지의 잎"* 로 읽는다
    - **toc-placeholder 제외 · `idx` 는 유지** — 건너뛴 만큼 당기면 뒤 앵커 전부가 1 씩 어긋난다. 실측으로 확인: 사라진 앵커는 `01-day1.html#/2`·`05-day5.html#/2` **둘뿐**이고 **새로 생긴 앵커 0** · 최대 앵커 62 그대로
    - **`#` 1 개면 평면 유지** — 표의 77 개 덱을 지키는 가드다
    - **검증** — `1.design_rnd/01-day1` 이 **level-1 7 개**(원고 `#` 7 과 1:1: 여는 절·1-1~1-4·닫는 절) · **`##` 잎 54** · toc-placeholder 0. 나머지 **16 덱 깊이 2 불변**(잎 감소분은 전부 toc-placeholder 제거분이며 챕터 수와 일치 — ex) LlmFlow 16 챕터 → 잎 −16)
    - ④ `initialExpandLevel: 2` 이므로 3 단이 된 `##` 잎은 **기본 접힘**이다 — 원 요구인 *"클릭해서 펼치기"* 와 일치하므로 그대로 둔다(1 회 확인 완료)
    - ⚠️ **종료 조건의 *"나머지 93 개 챕터 diff 0"* 은 문자 그대로는 성립하지 않는다** — ②(toc-placeholder 제외)가 **모든 덱에 의도적으로** 영향을 주기 때문이다(agenda 17 개 전부 diff, 내용은 중복 노드 1 개 제거뿐). 두 조항이 서로를 배제하므로 *"①③으로 인한 계층 변화가 대상 1 건 외에 없어야 한다"* 로 읽고 그것을 실측했다 — **계층이 바뀐 덱은 `1.design_rnd` 하나**
    - ⑤ `agenda.js` 같은 파일 앵커 지원은 이슈 권고대로 **건드리지 않았다**

## Issue372: 레이아웃 슬롯 추출기가 fenced div 중첩을 추적하지 않는다 — 같은 파이프라인의 두 처리기가 문법이 다르다 (등록: 2026-09-19, 해결: 2026-09-19, commit: `433c807`) ✅
* 목적: 슬롯 안에 htmlart 를 넣는 조합(`::: left` 안의 `::: htmlart`)이 **성립하지 않는다.** `:::` 로 쓰면 슬롯이 htmlart 의 닫는 줄을 먼저 먹어 남은 `:::` 가 본문에 `<p>:::</p>` 로 새고, Pandoc 관행대로 `::::` 로 피하면 **슬롯 이름 매칭 자체가 실패**해 좌우 내용이 전부 `{{content}}` 로 쏟아진다. 발주처 prj60 `__lec` 보고
* 상세:
    - **⚠️ 먼저 — `extractSlots` 실체 경로와, 그것이 grep 에 안 잡힌 이유**
        - 실체는 **[slide-parser.js:284](lib/slide-parser.js#L284)** 다. export 는 같은 파일 [541](lib/slide-parser.js#L541) 행이고 [html-builder.js:9](lib/html-builder.js#L9) 의 `require('./slide-parser')` 가 그대로 이 파일을 집는다 — **동명 파일도 다른 빌드 경로도 없다**
        - 보고된 *"`grep extractSlots` 0건"* 은 **거짓 음성**이다. 원인: `lib/slide-parser.js` 에 **NUL 바이트(0x00) 4개**가 있어 grep 이 파일을 **바이너리로 판정**한다(`command grep` 결과 `Binary file lib/slide-parser.js matches`). Claude Code 셸의 `grep` 래퍼는 `-I`(바이너리 건너뜀)를 붙여 돌기 때문에 **아무 경고 없이 0건**을 돌려준다. `grep -a` 를 쓰면 정상적으로 잡힌다
        - NUL 은 손상이 아니라 **의도된 sentinel** 이다 — [slide-parser.js:331](lib/slide-parser.js#L331) `splitSlidesRespectingFences` 가 코드펜스를 `\x00FENCE{n}\x00` 로 치환해 보호한다(337·341행)
        - 🚧 **파급이 본 이슈보다 크다** — 이 파일은 **grep 기반 도구 전체에서 조용히 안 보인다.** 검색·감사·인덱싱이 `slide-parser.js` 를 통째로 빠뜨린 채 *"없다"* 고 답해 왔을 수 있다. sentinel 을 **비-NUL 제어문자**로 바꾸면 기능 변화 없이 해소된다 — 같은 저장소의 [htmlart_dispatch.client.js](lib/component-hooks/htmlart_dispatch.client.js) 가 이미 STX/ETX(`\x01`·`\x02`)를 sentinel 로 쓰면서도 텍스트로 판정된다(실측: NUL 0개, `\x01`×4·`\x02`×3). **별도 이슈로 승격할지 판단 필요**
    - **두 처리기의 규칙 대조** — 같은 `:::` 문법을 같은 빌드 안에서 **다르게 읽는다**:

      | 축 | 슬롯 추출기 `extractSlots` | 본문 전처리 `preprocessPandocDiv` |
      | :--- | :--- | :--- |
      | 위치 | [slide-parser.js:284](lib/slide-parser.js#L284) | [markdown.js:295](lib/markdown.js#L295) |
      | 방식 | 정규식 1발 — [`:287`](lib/slide-parser.js#L287) | 줄 단위 순회 + `stack`([:297](lib/markdown.js#L297)) + `depth`([:324-325](lib/markdown.js#L324)) |
      | 중첩 | **추적 안 함** — `[\s\S]*?` 가 lazy 라 **첫 `:::`** 를 닫는 줄로 본다 | 추적함 |
      | 콜론 수 | **정확히 3개**(`^:::`) | **3개 이상**(`^:{3,}`, [:307-309](lib/markdown.js#L307)) |
      | 실행 순서 | **먼저** — [html-builder.js:550](lib/html-builder.js#L550) 이 raw 마크다운에 적용 | **나중** — `convertMarkdownToHTML` → [markdown.js:579](lib/markdown.js#L579) |

    - **실측 (2026-09-19 — 실제 export 를 node 로 직접 호출):**

      ```
      A) ::: 3콜론 중첩
         slots keys  : ["left","right"]
         slots.left  : "::: htmlart matrix\n* 노드\n* 노드2"   ← htmlart 가 닫히지 않은 채 슬롯에 들어감
         잔여 content : ":::"                                  ← 본문으로 새어 <p>:::</p> 렌더

      B) :::: 4콜론 회피
         slots keys  : []                                      ← 슬롯 0개
         잔여 content : 원문 전체                                ← 전부 {{content}} 로
      ```

      → 보고된 두 증상이 **소스 수준에서 그대로 재현된다**
    - ⚠️ **기존 예약어 가드는 이 경우에 발동하지 않는다.** [`PANDOC_LAYOUT_RESERVED`](lib/slide-parser.js#L282) 가 `htmlart` 를 갖고 있지만, 가드는 **매치된 블록의 이름이 예약어일 때**만 걸린다. 정규식이 왼쪽부터 훑어 `left` 를 먼저 매치하므로 **안쪽 `htmlart` 는 가드가 볼 기회조차 없다** — 곧 현행 가드는 **top-level htmlart 만** 보호한다
    - **왜 갈렸나** (추정, 검증 필요): `extractSlots` 는 [Issue93 주석](lib/slide-parser.js#L273)이 보여주듯 *"Pandoc 예약어를 슬롯으로 잘못 집지 않기"* 를 **예약어 집합으로 땜질**하며 자랐고 중첩은 애초 고려 대상이 아니었다. 반면 `preprocessPandocDiv` 는 `columns`/`rows` 중첩이 **기본 사용례**라 처음부터 stack 을 갖고 출발했다. **다른 시점에 다른 문제를 풀며 각자 자란 것**이지 설계 판단으로 갈린 흔적은 없다
* 구현 명세:
    - ① `extractSlots` 를 정규식 1발에서 **줄 단위 depth 추적**으로 바꾼다. `preprocessPandocDiv` 의 열기·닫기 판정([markdown.js:307-309](lib/markdown.js#L307))을 그대로 쓰면 두 처리기의 문법이 **한 지점으로 합쳐진다** — 본 이슈의 본체는 이 통일이다
        - 열기 `^:{3,}\s+name` · 닫기 `^:{3,}\s*$` · `depth` 가 0 으로 돌아온 줄이 그 슬롯의 끝. 코드펜스 안은 세지 않는다(`preprocessPandocDiv` 의 `inCode` 처리 [markdown.js:300-304](lib/markdown.js#L300) 와 동일하게)
        - 예약어 가드는 **top-level 에서만** 적용해 현행 의미를 유지한다. 중첩된 `htmlart` 는 슬롯 본문에 온전히 담긴 채 나중에 `preprocessPandocDiv` 가 처리한다
    - ② 판정을 **공유 헬퍼로 뽑는 것이 정답**이다. `slide-parser.js:4` 가 이미 `markdown.js` 를 require 하는 **단방향 의존**이라, 헬퍼를 `markdown.js` 에 두고 export 하면 **순환 없이** 공유된다. 이 편이 *"두 처리기가 다시 갈리는"* 재발을 막는다
    - ③ 회귀 범위 — `:::` 슬롯을 쓰는 **모든 덱**이 대상이나, 현행과 달라지는 것은 **슬롯 안에 다시 `:::` 가 있는 경우뿐**이고 그 경우는 지금 정상 렌더가 **불가능**하므로 정상 덱의 렌더는 바뀌지 않는다 (검증 필요 — 기존 덱 전수 빌드 diff 로 확인)
    - 검증: 위 실측 A·B 가 각각 `slots={left,right}` + 본문 잔여 0 을 내고, `:::`·`::::` 가 **같은 결과**를 낼 것. `./m2slide.sh` 기존 덱 전수 빌드 후 산출 HTML diff 0
    - 종료 조건: 슬롯 안 htmlart 가 정상 렌더되고, 콜론 3개·4개가 동일 결과를 내며, 기존 덱 산출 diff 0
* 결과 — **①②를 함께 냈다**(판정을 공유 헬퍼로 뽑는 것이 이슈의 본체였다):
    - **판정 단일 지점** — `isCodeFenceLine`·`isFencedDivOpen`·`isFencedDivClose`·`findFencedDivClose` 를 [markdown.js](lib/markdown.js) 에 두고 export. `slide-parser.js → markdown.js` 단방향 의존이라 순환 없이 공유된다. 같은 파일의 `scanColumnWidths` 도 그 헬퍼를 쓰게 바꿨다 — **한 파일 안에도 두 벌을 두지 않는다**
    - **`extractSlots` 를 줄 단위 depth 추적으로** — 열기 `^:{3,}\s+\S` · 닫기 `^:{3,}\s*$` · 코드펜스 안은 세지 않는다. 예약어 가드는 **top-level 만** 보던 기존 의미를 유지한다(중첩 `htmlart` 는 슬롯 본문에 온전히 담긴 채 `preprocessPandocDiv` 가 처리)
    - 🔑 **부수로 드러난 구 버그 — 코드펜스 안의 슬롯 예시가 지워지고 있었다.** 구 구현은 `inCode` 를 보지 않아 문서에 예시로 적은 ` ```markdown / ::: leftPanel … ` 를 슬롯으로 빼내 **코드블록을 통째로 비웠다**(`z_done/aTest_v1/markdown/02-slot.md` 실측 — 산출이 ` ```markdown\n\n\n``` `). 전수 동등성 검사의 유일한 차이가 이것이었고, **회귀가 아니라 수정**이다
    - 🔑 **NUL sentinel 을 함께 없앴다 — 이슈가 "별도 승격 판단" 으로 남긴 항목.** 같은 이슈에서 처리하는 것이 맞다고 판정했다: 비용이 한 줄인데 방치하면 **모든 grep 기반 도구가 이 파일을 조용히 빠뜨린다**(실제로 그 때문에 `extractSlots` 가 없는 것으로 오진됐다). `\x00FENCE{n}\x00` → **이스케이프 표기** `\x01`(STX) 로 바꿔 소스에 제어문자를 0개로 만들었다 — 같은 저장소 [client.js](lib/component-hooks/htmlart_dispatch.client.js) 가 이미 STX/ETX 를 쓰면서 텍스트로 판정되는 선례를 받았다
    - **검증** — 이슈 실측 A(`:::`)·B(`::::`)가 **같은 결과**(`slots={left,right}` · 잔여 content 0) · 빌드 픽스처 양쪽에서 htmlart 렌더 1건·`:::` 잔존 0·미치환 placeholder 0 · 원고 **1151 슬라이드** 구·신 동등성 차이 1건(위 코드펜스 개선뿐) · 슬롯 사용 **20 덱 재빌드 산출 diff 0**(차이 136 전부 `custom.css?v=<타임스탬프>` 캐시버스터. `1.design_rnd/05-day5` 만 실질 차이였으나 원고 mtime 19:56:38 로 **다른 세션의 원고 변경**임을 확인) · 코드펜스 안 `---` 보호 유지·sentinel 누출 0

## Issue370: htmlart annotate 라벨이 target 본문 글자 위로 올라탄다 — 라벨 x 가 상수라 거터 예약이 없다 (등록: 2026-09-19, 해결: 2026-09-19, commit: `c5345b9`) ✅
* 목적: 발주처 prj60 `__lec` 에서 주해 라벨이 target 글자 위에 겹쳐 그려진다는 보고. 발주처가 문장을 3차에 걸쳐 줄였으나(44자 → 26자 → 22자) **22자에서도 양쪽 64px 씩 겹쳤다.** 진단 결과 원인은 문장 길이가 아니라 **라벨 x 좌표가 target 과 무관한 상수**이고 target 텍스트 박스가 viewBox 전폭을 쓰는 것이다. 본 이슈는 **진단·상한 산출까지** 하고 수정은 별도 결정으로 넘긴다
* depends: Issue364
* 상세:
    - **① 라벨 x 에 클램프가 없다 — 상수다.** [client.js:1457](lib/component-hooks/htmlart_dispatch.client.js#L1457) `var labelX = side==='left' ? 30 : W - 30 - labelW;` · `labelW=300`([client.js:1384](lib/component-hooks/htmlart_dispatch.client.js#L1384)). 좌 라벨 `30~330`, 우 라벨 `1070~1370` 으로 **고정**이며, 실측 span 박스 `b.x` 를 참조하는 자리가 **한 군데도 없다**
    - **target 텍스트 박스는 전폭이다.** [client.js:1406](lib/component-hooks/htmlart_dispatch.client.js#L1406) `.attr('x',0)…attr('width',W)` (`W=1400`, [client.js:1382](lib/component-hooks/htmlart_dispatch.client.js#L1382)) + 안쪽 div `width:100%` flex center, **max-width 없음**
    - ⇒ 겹침이 산술로 결정된다: **한 줄 실폭 > `W − 2×(30+labelW)` = 740** 이면 반드시 겹친다. 문장을 줄여서 빠져나갈 수 있는 문제가 아니라 **임계를 넘었는지 아닌지**의 문제다
    - **② `over`/`under` 는 라벨 y 를 옮기지 않는다 — 그리고 그것은 설계다.** [client.js:1448-1449](lib/component-hooks/htmlart_dispatch.client.js#L1448) 에서 `pos` 가 쓰이는 곳은 `lineY`(span 강조 줄 + 곡선 시작점) **뿐**이다. 라벨 y 는 [client.js:1458-1460](lib/component-hooks/htmlart_dispatch.client.js#L1458) 이 `cy`(=310) 기준으로만 계산한다 → 주해 1개면 `284~336` 으로 target 띠(`250~370`) 한가운데. [client.js:1437-1440](lib/component-hooks/htmlart_dispatch.client.js#L1437) 주석이 *좌/우 균형 분할·곡선 비교차*를 라벨 배치 목적으로 명시하므로 **라벨을 좌·우 거터에 두는 것이 의도**다. 누락된 것은 y 로직이 아니라 **그 거터를 target 이 침범하지 못하게 하는 제약**이다
    - **③ "영문은 괜찮다"는 전제가 성립하지 않는다.** 저장소 자체 폭 모델([`charEm`](lib/component-hooks/htmlart_dispatch.client.js#L47) — 한글 1.0em / 그 외 0.58em)에 `targetFs=56`·`letter-spacing 0.02em` 을 적용한 계산:

      | 케이스 | 자 | 추정 한 줄 폭 | 판정 |
      | :--- | ---: | ---: | :--- |
      | 쇼케이스(영문) `The quick brown fox…` | 43 | **1445px** | wrap 임계 1400 에 **3% 차로 걸침** |
      | 발주처 1차 | 44 | 1996px | 접힘 → 세로 잘림([Issue364](#issue364)) |
      | 발주처 2차 | 26 | 1304px | 한 줄, 편측 **282px** 침범 |
      | 발주처 3차 | 22 | 984px | 한 줄, 편측 **122px** 침범 |

    - 쇼케이스([05-htmlart-27.md:455](Projects/m2Slide_visual_component/markdown/05-htmlart-27.md#L455))는 한 줄이면 전폭 1400 을 채워 겹치고, 접히더라도 greedy wrap 이라 1행이 약 1315px 이라 **역시 겹친다.** 곧 *영문이라 안전한 것*이 아니라 **그 슬라이드를 아무도 들여다보지 않은 것**에 가깝다 (검증 필요 — 육안·`getBoundingClientRect` 실측 미실시. 모델 추정이 임계에 3% 차로 붙어 있어 판정이 뒤집힐 여지가 있다)
    - ⚠️ **위험 구간이 한국어 문장의 자연 길이와 정확히 겹친다** — 한 줄 실폭 **740~1400px**, 곧 **한글 13~30자**. 그 아래면 안전, 그 위면 접혀 [Issue364](#issue364) 의 세로 잘림으로 넘어간다. **annotate 의 안전 창은 한글 12자(영문 22자) 이하 하나뿐이다**
    - Issue364 와의 경계: Issue364 는 **세로 축**(줄수 × 줄높이 > 120), 본 이슈는 **가로 축**(한 줄 폭 > 740). annotate 는 두 결함을 동시에 갖는다 — Issue364 실측표의 `annotate 44자 🔴 +7px` 이 세로 축 쪽 근거다
    - **실사용 영향도 — 현역 덱 0건.** `::: htmlart annotate` 원고는 4건인데 z_done 아카이브 2건(`Projects/z_done/aTest/markdown/04-htmlart.md:421`·`Projects/z_done/aTest_v1/markdown/08.4.ratio-compare-explain.md:98`), 쇼케이스 1건, 그 pptx 파이프라인 사본 1건이 전부다 → **회귀 위험이 사실상 없다**
* 구현 명세:
    - **해법 후보 A — target 텍스트 박스를 거터 안쪽으로 가둔다** *(권장)*
        - [client.js:1406](lib/component-hooks/htmlart_dispatch.client.js#L1406) 의 foreignObject 를 `x = 30+labelW+gap`, `width = W − 2×(30+labelW+gap)` 로 좁힌다(gap=20 → `x=350, width=700`). target 이 거터 밖으로 **나갈 수 없게 되어 겹침이 구조적으로 불가능**해진다
        - 대신 줄이 늘어나므로 **세로 축을 함께 풀어야 한다** — fo 높이 120 고정을 줄 수 기반으로 늘리고 라벨 기준 `cy`([client.js:1459](lib/component-hooks/htmlart_dispatch.client.js#L1459))를 target 실높이 중심으로 재계산. [Issue364](#issue364) 해법 후보 A(`volumeCap`)와 같은 성격이라 **한 이슈에서 함께 내는 편이 낫다**(그래서 `depends`)
        - 영향도: 현역 덱 0건. 쇼케이스 1건은 700 폭에서 2~3줄로 접혀 **렌더가 바뀐다** — 다만 지금도 겹쳐 있으므로 개선 방향의 변화다 (검증 필요 — before/after 캡처)
        - 한계: 700px 은 한글 **12자/줄**이라 긴 문장은 3줄 이상이 된다. 56px 고정 폰트를 유지하면 세로가 터지므로 폰트 축소가 반드시 동반된다
    - **해법 후보 B — 라벨 x 를 target 실측으로 클램프하고 viewBox 를 넓힌다**
        - `drawLines()` 는 이미 span 실측 박스를 갖고 있다([client.js:1424-1437](lib/component-hooks/htmlart_dispatch.client.js#L1424)). target 실측 좌우 끝으로 `labelX_left = min(30, minX − labelW − gap)` · `labelX_right = max(W−30−labelW, maxX + gap)` 로 **밀어낸다**. 음수·W 초과가 되므로 **viewBox 확장이 동반**된다
        - **선례가 같은 파일 안에 있다** — callout 의 `wide` orientation 이 정확히 같은 기법이다([client.js:1505-1508](lib/component-hooks/htmlart_dispatch.client.js#L1505) 주석: *"viewBox 를 라벨 실좌표까지 넓혀 레터박스 여백 의존을 없앤 변형"*). 4:3 에서 orient 무관 자동 적용이라고 적혀 있어 **판형 대응까지 검증된 경로**다
        - 영향도: viewBox 확장은 **도해 전체를 축소**시킨다 — [Issue363](#issue363) 이 정상 도해까지 15% 줄여 문제가 된 실패 모드와 같은 성격이다. 다만 annotate 는 **현역 덱 0건**이라 이 타입에 한해서는 그 리스크가 실질적으로 없다
        - 한계: target 이 길수록 viewBox 가 계속 넓어져 글자가 무한정 작아진다. 확장 상한이 필요하고 상한에 걸리면 결국 후보 A 로 되돌아온다
    - **판정 제안: A 를 기본, B 를 보완.** A 가 *"target 은 거터를 침범하지 않는다"* 는 불변식을 세우고, B 는 라벨 자리가 그래도 모자랄 때의 탈출구다. ⚠️ **A 를 단독으로 넣으면 안 된다** — 폭을 좁히면 줄이 늘어 Issue364 의 세로 잘림을 오히려 키운다
    - ⚠️ **착수 전 ③ 의 육안 검증을 먼저 한다.** 쇼케이스가 실제로 겹쳐 있는지에 따라 *"회귀 0"* 인지 *"이미 깨진 것을 고치는 것"* 인지가 갈린다
    - 종료 조건: 겹침 판정 산식이 소스와 일치하고(한 줄 폭 ≤ 안전 폭), 쇼케이스·prj60 3차 문장 양쪽에서 라벨 박스와 target 박스가 겹치지 않음을 `getBoundingClientRect` 로 실측 확인
* 결과 — **후보 A 를 세로 축과 함께 냈다**(이슈의 판정 제안대로. A 단독은 금지였다):
    - 🔑 **착수 전 ③ 육안 검증이 판을 갈랐다** — 쇼케이스는 *"회귀 0"* 이 아니라 **이미 깨져 있었다**. 실측(`getBoundingClientRect`): 한 줄 **1252px**(모델 추정 1445 는 15% 과대였으나 결론은 같다) · 좌 라벨 2개 **256×22** · 우 라벨 **256×52 전면 겹침**. 곧 *영문이라 안전한 것*이 아니라 그 슬라이드를 아무도 들여다보지 않은 것이었다
    - **A 거터 예약** — target fo 를 `x=30+labelW+20`, `width=W−2×gutter` 로 가둔다. 라벨을 밖으로 밀어내는 후보 B 는 viewBox 확장이 동반돼 [Issue363](#issue363) 의 실패 모드(정상 도해까지 축소)를 밟으므로 **target 을 가두는 쪽**을 택했다. 겹침이 **산술이 아니라 구조로** 불가능해진다
    - **거터는 라벨 실측으로 좁힌다** — `labelW = clamp(160, 300, textEm(최장 라벨)×24)`. 고정 300 은 6자 라벨에서 절반이 빈 거터가 되고 그만큼 target 이 불필요하게 접혔다(실측 22자 케이스: labelW 208 → targetW 884, 2줄로 끝남)
    - **세로 축 동반** — 폭을 좁히면 줄이 늘어 [Issue364](#issue364) 의 세로 잘림을 키운다. 같은 총량 축(`wrapLines` 재사용, `letter-spacing:0.02em` 은 fs×1.02 로 근사)으로 fs·fo 높이를 함께 산정
    - 🔑 **이슈에 없던 결함이 실측에서 하나 더 나왔다 — 라벨 자체도 잘려 있었다.** `labelH` 52 고정에 2줄(24×1.3×2 = 62.4)이 들어가지 않는다(쇼케이스 13자 라벨 `scrollHeight 57 > clientHeight 52`). Issue364 와 같은 무경고 클리핑이라 함께 풀었다(줄 수 기반 `labelH`, 라벨 다수로 세로가 넘치면 간격을 먼저 줄인다)
    - **다줄 대비** — span 정렬을 `x` 단독에서 `(줄, x)` 로 바꿨다. 다줄에서 x 만 보면 라벨 순서가 줄을 넘나들어 곡선이 교차한다. 한 줄이면 y 가 모두 같아 **기존 순서와 동일**하다
    - **검증** — 쇼케이스(영문 43자) + 발주처 재현 3종(44·26·22자) 5케이스 전부 **겹침 0 · 잘림 0**. 변경은 `renderAnnotate` 안에만 있어(hunk 5개 전부) 나머지 26종은 코드가 그대로다
    - ⚠️ **별건 발견** — 전덱 스캔에서 `ha-callout-svg` 1건이 6px 넘친다(`m2Slide_visual_component` 5장 30번, *"바이브 코딩으로 쉽고, 빠르게, 정확하게"*). annotate 가 아니고 본 수정과 무관한 **기존 결함**이라 이슈후보로 넘겼다

## Issue364: htmlart 노드 본문이 박스에서 조용히 잘린다 — 폭 축 auto-fit 만 있고 높이 축이 없다 (등록: 2026-09-19, 해결: 2026-09-19, commit: `6affdd4`, `6e46c09`) ✅
* 목적: 발주처 prj60 `__lec` 에서 **넘침 경고도 빌드 경고도 없이 글자가 박스 경계에서 잘리는** 증상이 보고됐다. 실측 결과 원인은 4:3 이 아니라 **`titleFsFor` 의 auto-fit 이 "가장 긴 토큰의 폭" 한 축만 보고 총량(줄 수 × 줄높이)을 보지 않는 것**이다. 작성자가 지킬 수 있는 타입별 글자수 상한도 문서화돼 있지 않다. 본 이슈는 **진단·상한 산출까지** 하고 수정은 별도 결정으로 넘긴다
* 상세 (실측 2026-09-19, ego-browser `scrollHeight` vs `clientHeight`, prj60 `01-day1.html` 62섹션·119 노드박스 전수):
    - **잘림 지점**: [htmlart_dispatch.client.js](lib/component-hooks/htmlart_dispatch.client.js) `nodeBox` 가 foreignObject 안 div 에 `overflow:hidden` 을 건다(L92-101). foreignObject 자체도 클리핑한다 — **2중 클리핑**이라 밖으로 새지 않고 조용히 사라진다
    - **박스 크기는 전부 고정값**이다. 내용 기반이 아니다:

      | 타입 | 박스(viewBox 단위) | 소스 |
      | :--- | :--- | :--- |
      | `process` | `boxW=196, boxH=230` | [client.js:325](lib/component-hooks/htmlart_dispatch.client.js#L325) |
      | `numbered` | `cardW=640, cardH=134` | [client.js:852](lib/component-hooks/htmlart_dispatch.client.js#L852) |
      | `matrix` | `cell=320` (정사각) | [client.js:625](lib/component-hooks/htmlart_dispatch.client.js#L625) |

    - **auto-fit 은 있다 — 다만 폭 축만이다.** `titleFsFor`([client.js:73-79](lib/component-hooks/htmlart_dispatch.client.js#L73))의 `widthCap` 은 `longestTokenEm(title)` 즉 **줄바꿈 불가 단일 토큰 하나**의 폭만 본다(Issue217 이 영문 장단어 클립을 막으려 넣은 것). 한글은 어절이 2~4자라 토큰이 짧아 `widthCap` 이 안 걸리고 폰트가 상한(`min(h*0.30, w*0.21, 44)`)에 그대로 붙는다 → 큰 글자로 여러 줄 wrap → **세로로 넘쳐 잘린다**. 박스 자동 확장·줄 수 기반 축소는 **구현이 없다**
    - ⚠️ 총량을 재는 헬퍼 [`textEm`](lib/component-hooks/htmlart_dispatch.client.js#L55) 은 **이미 있는데 `titleFsFor` 가 쓰지 않는다** — Issue283 timeline 적응형 박스용으로만 들어갔다. 고칠 재료는 이미 파일 안에 있다
    - **4:3 이 만든 문제가 아니라 드러낸 문제다.** `slide_ratio` 는 [config.js](lib/config.js)(검증·CSS `aspect-ratio`)와 [html-builder.js](lib/html-builder.js)(덱 컨테이너)까지만 가고 `htmlart_dispatch.client.js` 에 **도달하지 않는다**. 박스·폰트는 전부 viewBox 좌표 상수이고 SVG 는 `viewBox` 만 지정해 스케일되므로 **잘림 임계는 모든 비율에서 동일**하다. 실측에서도 foreignObject `width`/`height` 가 하드코딩값과 정확히 일치했다(`process` 196×230 → `clientHeight` 226 = 230 − 테두리 2×2). 4:3 은 캔버스가 좁아 작성자가 더 긴 문장을 넣게 된 정황일 뿐이다
    - **prj60 실측 상관관계** (🔴 = `scrollHeight > clientHeight`):

      | 타입 | 노드 | 폰트 | 결과 |
      | :--- | ---: | ---: | :--- |
      | `process` 제목만 | 14·16자 | 41px | 정상 |
      | `process` 제목만 | **17자** | 41px | 🔴 +16px |
      | `process` 제목+부제 | 8자+24자 | 41/27px | 🔴 +31px |
      | `process` 제목+부제 | 8자+30자 | 41/27px | 🔴 +67px (최악) |
      | `numbered` | 31·32·39자 | 40px | 정상 |
      | `numbered` | **37·44자** | 40px | 🔴 +13px |
      | `numbered` | **108자** | 37px | 🔴 +52px |
      | `matrix` | **42~45자** | 44px | 🔴 +6px (빠듯) |
      | `annotate` | 44자 | 56px | 🔴 +7px |

    - 글자수와 잘림이 **단조 대응하지 않는다**(39자 정상 / 37자 잘림). 어절 길이가 `widthCap` 을 통해 폰트를 바꾸기 때문이다 — 작성자가 육안으로 규칙을 찾을 수 없는 이유이자, 경고가 필요한 이유다
    - 부수 발견: `uniformTitleFs`([client.js:81](lib/component-hooks/htmlart_dispatch.client.js#L81))는 체인 전체의 **최솟값**을 쓴다. 한 노드에 긴 토큰이 하나 있으면 형제 전부의 폰트가 같이 내려간다 — 의도된 일관성 장치지만 상한 산출 시 노드 단독으로 계산하면 안 된다
* 구현 명세:
    - **(즉시 회피 — prj60 이 오늘 쓸 값)** 전형값은 한글 3자 어절 기준, 보수값은 2·3·4자 어절 전수의 최솟값이다. **보수값을 지키면 어떤 문장이어도 안 잘린다**:

      | 타입 | 박스 | 전형(3자 어절) | **보수(권장)** |
      | :--- | :--- | ---: | ---: |
      | `process` 제목만 | 196×230 | 16자 | **13자** |
      | `numbered` | 640×134 | 33자 | **31자** |
      | `matrix` | 320×320 | 40자 | **27자** |

    - ⚠️ **`process` 에 부제(중첩 항목)를 달면 예산이 급락한다** — 제목 길이가 폰트(41px 고정)를 안 낮추고 줄 수만 늘리기 때문:

      | 제목 | 부제 최대(보수) | 합계 |
      | ---: | ---: | ---: |
      | 5~8자 | 14자 | 19~22자 |
      | 9~12자 | 6자 | 15~18자 |
      | 13자 이상 | **0자 (부제 불가)** | 13~14자 |

      → 실무 규칙: **`process` 는 제목만 13자 이내로 쓴다.** 부제가 꼭 필요하면 제목 ≤8자 + 부제 ≤14자
    - 참고로 함께 측정된 타입(전수 정상): `timeline` 300×229 ≤40자 · `callout` 920×150 ≤23자 · `bracket` 250×82 ≤33자. `annotate` 1400×120 은 44자에서 잘림
    - **해법 후보 A — `titleFsFor` 에 높이(총량) 축 추가** *(권장)*
        - `textEm(s)` 로 총 폭을 구해 `innerW` 로 나눠 예상 줄 수를 내고, `줄수 × fs × 1.2 ≤ h − padding` 이 될 때까지 `fs` 를 낮추는 `volumeCap` 을 `min(...)` 에 한 항으로 추가. 부제도 같은 방식
        - 부작용: **긴 노드만 글자가 작아진다.** `volumeCap` 은 지금 넘치는 노드에서만 걸리므로 **정상 노드는 렌더가 1px도 안 바뀐다** → 기존 3:2·16:9 덱 회귀 범위가 "이미 잘려 있던 노드"로 한정된다. [Issue363](#issue363) 의 viewBox 확장이 **정상 도해까지 15% 축소**시킨 것과 성격이 다르다
        - 한계: 120자급은 `fs` 하한 10px 에 걸려 **여전히 잘린다**. 하한 도달은 후보 C 의 경고로 알려야 한다
    - **해법 후보 B — 박스 높이를 내용 기반으로(적응형 `boxH`)**
        - `timeline` 이 Issue283 에서 이미 택한 방식. 최장 노드에 맞춰 `boxH` 를 키우고 `W`/`H` 재계산
        - 부작용: **viewBox 가 커져 도해 전체가 축소된다** — [Issue363](#issue363) 의 실패 모드 그대로다. 게다가 영향이 잘린 노드에 그치지 않고 **그 도해 전체·모든 비율의 모든 기존 덱**에 미친다. `matrix` 는 `W=H` 정사각 제약이라 높이만 늘리면 배치가 깨진다
        - 판정: 단독 적용 **비권장**. 하려면 opt-in 속성(ex `{.autofit}`)으로 신규 덱에만
    - **해법 후보 C — 빌드 타임 경고** *(A 와 함께, 먼저 낼 수 있음)*
        - 부작용 **없음**(빌드 비차단 경고). 기존 덱 렌더 0 영향. 다만 고쳐주지는 않는다
    - **(c) 빌드 경고 구현 가능 여부 — 가능하고 난이도 낮다 (반나절)**: [markdown.js:322-328](lib/markdown.js#L322) 의 전처리 루프가 **이미** `::: htmlart` open~close 사이 전 줄을 순회하며 top-level `*` 를 세고 있다(`--htmlart-n`). 같은 루프에서 `lines[j]` 글자수를 재고 타입별 상한과 대조해 `console.warn` 하면 끝 — 새 파싱이 필요 없다. 상한 SSOT 는 [types.yml](data/htmlart/types.yml) `min_nodes` 옆에 `max_chars` 로 얹는다. 정밀 판정(어절 기반)은 A 의 `volumeCap` 공식을 빌드 측에서 재사용하면 렌더와 판정이 갈리지 않는다
    - ⚠️ **조용한 잘림이 이 문제의 본질이다.** A 만 넣고 C 를 빼면 하한 도달 케이스가 다시 무경고로 잘린다 — A·C 를 한 이슈에서 함께 낼 것
* 결과 — **A·C 를 함께 냈다**(이슈가 요구한 대로. A 만 넣으면 하한 도달이 다시 무경고로 잘린다):
    - **A `fitFsFor`** — 제목 **+ 부제** 총량이 박스 높이에 들어갈 때까지 폰트를 낮춘다. 부제를 따로 재면 안 된다는 것이 실측으로 확인됐다 — `subFs` 는 `titleFs*0.66` 으로 따라오는데 **둘의 합산 높이를 아무도 보지 않았다**(제목 8자 + 부제 30자 → +67px). `uniformTitleFs` 도 `subs` 를 보게 해 형제 일관성과 잘림 방지를 함께 세웠다
    - 🔑 **줄 수는 글자 총량이 아니라 어절 wrap 시뮬레이션으로 센다** — CSS `word-break:keep-all` 은 어절이 남은 폭에 안 들어가면 통째로 다음 줄로 보내 **줄 끝에 빈 공간을 남긴다**. 총량 추정 4줄 vs 실제 6줄이었고, 이 차이 때문에 **첫 판이 41px 을 통과시켜 +24px 이 그대로 남았다**(실측으로 발견해 `wrapLines` 로 교체)
    - **C 빌드 경고** — [markdown.js](lib/markdown.js) 의 기존 `--htmlart-n` 카운트 루프를 재사용(새 파싱 0). 상한 SSOT 는 [types.yml](data/htmlart/types.yml) `max_chars` 이고, yaml 파서 대신 정규식으로 읽어 **값을 코드에 복제하지 않는다**(외부 의존 0 원칙). 경고 문구는 *"폰트가 자동 축소된다"* — A 가 있어 잘리지는 않으므로 대가(가독성)를 알리는 것이 정확하다
    - **검증**(ego-browser `scrollHeight` vs `clientHeight`): 재현 픽스처 3종 전부 해소(process 17자 +16→0 · 제목8+부제30자 +24→0 · numbered 108자 →0) · **정상 노드 불변** 확인(m2Slide_visual_component 147 노드 · aTest-all 12 · m2Slide_chapter_mode 26 — 넘침 0) · 경고 3건 동작 · `6.roundtrip` aTest·aTest-all ✅ · `4.laneb` 6/6
    - 해법 B(적응형 박스)는 **비채택** — Issue363 의 실패 모드(정상 도해까지 축소)를 그대로 밟고 `matrix` 는 정사각 제약이 깨진다


## Issue375: default_lec 실습 2종 — 마스코트·여백·제목 밴드를 이론 장표에 맞춘다 (등록: 2026-09-19, 해결: 2026-09-19, commit: 본 커밋) ✅
* 목적: 발주처 prj60(`__lec`) 1일차 덱에서 **실습 장표만 이론 장표와 따로 논다**는 지적을 받았다. 원인은 셋이고, 전부 [default_lec](theme/default_lec/slide.css) 안에서 `layout-exercise` 와 `layout-exercise-small` 이 **같은 "실습"인데 각자 선언**돼 있던 데서 온다
* 상세 (실측 기준 폭 1806px):
    - **① 마스코트가 2종 사이에서 1.57배 갈렸다** — 나비 `14%`(exercise) vs `22%`(exercise-small). 고양이도 `16%` vs `18%`. 장을 넘길 때마다 같은 그림이 커졌다 작아졌다 했다
    - **② 좌여백이 큰 마스코트를 피하느라 과했다** — `exercise-body` 좌여백이 `18%`(325px)·`30%`(542px). 실습 지시문이 우측으로 밀려 불필요하게 접혔다
    - **③ 제목 밴드가 이론 장표와 갈렸다** — §4.2 가 `_contents` 제목만 `--title-font-size`(1.5em)로 내려 잡고, 실습 제목은 [base.css](lib/css/base.css) 기본값(`exercise` 2.8em · `exercise-small` 2.2em)에 방치돼 **이론 60px vs 실습 88·112px**. 2줄 제목일 때 본문 시작선이 **195px(이론) vs 389px(exercise)** 까지 벌어져, 장을 넘길 때 제목 밴드가 출렁였다
* 구현 명세:
    - 2종을 **공통 선언으로 병합**한다. 각자 선언한 것이 갈림의 원인이므로 값을 맞추는 것이 아니라 선언을 하나로 만든다
    - 나비 `9%` · 고양이 `12%` — `9%` 는 `summary` 레이아웃(§4.7.5)이 이미 쓰던 값이라 **테마 안 기준선**이다. 새 숫자를 발명하지 않았다
    - 좌여백 `13%`(235px) 단일. ⚠️ [Issue359](#issue359) 의 `> div` 자식 결합자를 **반드시 유지** — base.css §9 의 `0-3-2` shorthand 를 이기려면 명시도 동점이 필요하다
    - 제목은 `--title-font-size` 를 이론 장표와 공유하고, `exercise-header` 에 `padding: 34px 0 31px 0` 을 준다. `34px` 은 `_contents` 의 `contents-head-bar` 밴드 높이(padding-top 8px + 1em 라인)다 — 실습 레이아웃엔 head-bar 가 없으므로 헤더 상단 패딩이 그 자리를 대신해야 제목 시작선이 맞는다. 하단 `31px` 은 `_contents` 제목의 `margin-bottom` 과 같다
    - 종료 조건: 재빌드 후 이론·실습 전장의 제목 시작 y·제목 블록 높이·본문 시작 y 가 일치
* 결과 (발주처 prj60 세션 실측 + 본 세션 회귀 점검):
    - ✅ **재빌드 후 전수 일치** — 이론 31장 / 실습 16장 **전부** 제목 시작 `62px` · 제목 블록 높이 `102px` · 본문 시작 `195px`. 실습 16장 나비·고양이 `9%`/`12%` 단일값. 좌여백 `542·325px` → `235px`
    - ✅ **회귀 위험 0 (본 repo 전수 확인)** — 빌드 산출물 `Projects/*/slide` 28덱 + `docs/*` 17덱, html **398장**에서 `<section class="…layout-exercise…">` 실마크업 **0건**. `exercise-body`·`exercise-title`·`exercise-header` 마크업도 **0건**. 원고 `*.md` 의 `#layout-exercise` 지시자도 **0건**
    - ⚠️ `layout-exercise` **문자열** 매치는 205장이나 전부 각 덱에 인라인·복사된 **CSS 보일러플레이트**다 — 파일 수만 세면 오판한다. 실마크업을 가진 파일은 레이아웃 템플릿 2개([6.1.exercise.html](theme/default_lec/layouts/6.1.exercise.html)·[6.2.exercise-small.html](theme/default_lec/layouts/6.2.exercise-small.html))뿐
    - ✅ **이중 안전장치** — 빌드 산출물은 테마 CSS 스냅샷을 자기 `css/custom.css` 와 인라인에 동봉한다(`docs/fPmIntro/css/custom.css` 에 구 값 `14%`·`22%`·`18%`·`30%` 잔존 확인). 따라서 테마 수정은 **재빌드 전까지 기존 덱에 닿지 않는다**
    - ✅ [theme/default](theme/default/slide.css) 는 구 값을 그대로 둔다 — 본 커밋 diff 범위 밖이라 영향 없다
    - 📌 후속: `default_lec` 을 쓰는 덱을 **재빌드하면** 실습 장표 꼴이 바뀐다. 현재 실습 레이아웃을 실제로 쓰는 덱이 발주처 1일차뿐이라 지금은 영향이 없지만, 과거 덱을 되살려 재빌드할 때는 이 변경을 전제로 봐야 한다

## Issue360: layout `*-body` 명시도 충돌 전수 — base.css shorthand 가 theme 가로 padding 을 삼킨다 (등록: 2026-09-19, 해결: 2026-09-19, commit: `eb498e3`) ✅
* 목적: [Issue359](#issue359) 로 `exercise`·`exercise-small` 을 고치면서 **같은 충돌이 살아 있는 layout 6종을 더 찾았다.** exercise 와 달리 이쪽은 실사용 덱이 전부 쓰는 layout 이라 고치는 순간 기존 덱의 렌더가 바뀐다 — 그래서 Issue359 에 묶지 않고 분리했다
* depends: Issue359
* 상세 (실측 2026-09-19, ego-browser `getComputedStyle`, 1920 기준):
    - 원인은 Issue359 와 같다 — [base.css](lib/css/base.css) `.reveal section[class*="layout-"] > div[class$="-body"]`(명시도 **0-3-2**, `padding: 1em 0`)가 theme 의 0-3-1 선언을 이긴다. theme 이 나중에 로드돼도 소용없다
    - theme [default_lec](theme/default_lec/slide.css): `cover-body`(L722 `0.6em 5% 0.6em 0` → 실측 `30px 0`) · `summary-body`(L578 `0 6% 0 5%` → `42px 0`) · `chapter-toc-body`(L433 `1em 1.4em`) · `chapter-body`(L488 `0` → `40px 0`) · `_contents_no_title > .contents-body`(L405 `padding-top: 0` → `40px`)
    - theme [default](theme/default/slide.css): `_toc > .toc-body`(L794 `1em 1.5em`) · `cover-body`(L689) · `chapter-toc-body`(L447) · `_contents_no_title`(L426). `_blank > .blank-body`(L531)는 `!important` 라 이미 이긴다
    - **가장 눈에 띄는 것은 cover** — 강사명 박스가 `padding-right: 5%` 를 못 받아 우측 끝에 붙는다. 같은 슬라이드의 `cover-tr`·`cover-br` 은 `right: 5%` 라 **둘이 안 맞는다**
    - 선례가 이미 있다: [default/slide.css](theme/default/slide.css) L1468 주석이 *"base.css §5 를 이기려고 `.slides` 를 넣었다"* 고 적고 `.reveal .slides section.layout-chapter .chapter-body`(0-4-1)로 올려 놨다. 같은 함정을 이미 한 번 밟았다는 뜻이다
* 구현 명세:
    - 고치는 방법은 Issue359 와 같다 — 선택자에 `> div` 를 넣어 0-3-2 동점을 만든다. base.css 는 건드리지 않는다
    - ⚠️ **일괄 적용 전에 시각 확인이 필요하다.** 고치면 theme 작성자가 의도한 값이 비로소 먹으므로 기존 덱의 여백이 전부 바뀐다. layout 별 before/after 캡처를 붙여 사용자 승인 후 반영
    - 근본 대안도 함께 검토: base.css L782 의 shorthand `padding: 1em 0` 을 `padding-block: 1em` 으로 바꾸면 좌우를 아예 건드리지 않아 theme 의 가로 선언이 자연히 산다. **base.css 수정이라 [CLAUDE.md](CLAUDE.md) "base.css 수정 가드" 의 사용자 컨펌 대상**
    - 검증: `./m2slide.sh m2Slide_single_mode` · `m2Slide_chapter_mode` + 테스트 필수 4항목 + layout 별 `getComputedStyle` before/after
* 결과 (사용자 승인 2026-09-19 — base.css 수정 가드):
    - **실측으로 문제가 한 겹 넓은 것이 드러났다** — 범용 규칙이 theme 뿐 아니라 **base 자신의 layout 별 규칙까지** 이기고 있었다. L854 등의 `1.5em` 은 한 번도 적용된 적 없고 실제 기준은 줄곧 `1em` 이었다(`_contents` 실측 40px)
    - 채택: 범용 규칙의 padding 만 `:where(...) { padding-block: 1em }` 으로 분리(명시도 0 · 가로 미선언) + layout 별 7규칙을 `padding-block: 1em` 으로 정정. `flex-grow`·`overflow-y`·`min-height` 는 명시도를 그대로 뒀다 — 내리면 `closing-body` 의 `flex-grow: 0` 이 되살아나 배치가 바뀐다
    - **미검증 값을 되살리지 않았다**: `1.5em` 을 살린 시험에서 세로 +20px 로 실제 한 장이 넘쳤다(m2Slide_visual_component). `:where` 기본값에만 맡긴 시험에서는 theme 의 `padding-top: 0`(0-0-4)이 기본값을 이겨 padding 이 0 으로 떨어졌다 — 두 실측이 지금 형태를 정했다
    - 실측 변화: `_cover` `34 0 34 0` → `20.4 90.4 0 0`(가로 5% + theme 세로 의도) · `chapter`(default_lec) `40 0` → `0`(theme `padding: 0` 복원) · `_contents`·`_blank`·`chapter`(default) 변화 없음
    - 회귀 검증: 4개 덱 **156장 넘침 3→3**(AgenticCoding 기존 3장) · 제목 표시 정상 · 뷰포트 1280/1920/1024 동일 · 캡처 [before](_doc_work/capture/i360-before-cover.png)·[after](_doc_work/capture/i360-final-cover.png)·[default_lec chapter](_doc_work/capture/i360-lec-chapter-after.png)
    - theme 측 수정(A안)은 불필요해졌다 — 규칙 차원에서 풀려 열거하지 않은 layout(summary·chapter-toc·_contents_no_title 등)도 함께 산다

## Issue369: `aTest-all` — 갈린 픽스처를 한 덱으로 합쳐 모든 축을 한 번에 잰다 (등록: 2026-09-19, 해결: 2026-09-19, commit: `74b52bc`, `af45902`, `0eb5ed7`, `da29927`, `ffb7182`) ✅
* 목적: 왕복 계약을 재는 픽스처가 **aTest**(single·변환 경로 커버리지)·**igTest**(chapter·인포그래픽)·**m2Slide_chapter_mode**(chapter·레이아웃) 셋으로 갈려 있다. 갈린 픽스처는 **축이 빠진 것을 못 본다** — [Issue358](#issue358) 에서 표 정렬 오판(근거 덱이 전부 좌측 정렬이라 차이가 드러날 수 없었다)과 `font_outside_theme` 축 소실이 정확히 그 형태였다. igTest 내용을 합친 `aTest-all` 한 덱으로 **계약이 선언한 모든 요소를 한 번에** 왕복시킨다
* depends: Issue358
* 상세:
    - **왜 합치나** — 계약([fidelity.yml](data/m2slide2ppt/fidelity.yml))은 요소 38종 + 시각 12축을 선언하는데, 어느 한 덱도 그 전부를 담지 않는다. 덱마다 통과해도 **어느 축이 아무 덱에도 없는지**는 아무도 세지 않는다
    - **모드는 chapter** — single 이 못 가진 축(덱 전체 목차·Agenda·챕터 TOC·H1 진입 장·`cards_placeholder` 분기)을 담는다. single 전용 축은 기존 `aTest` 가 계속 맡는다
    - **theme 은 `default`** — `transform.yml` 의 `theme_geometry` 실측값이 default 기준이라고 스스로 적고 있다. igTest 는 `default_lec` 이므로 옮기면서 꼴이 바뀌지만, 왕복 축은 테마 독립이고 시각 축은 그 프로젝트 CSS 를 실측해 대조하므로 문제되지 않는다
    - **기존 픽스처는 남긴다** — aTest 는 single mode 회귀, igTest 는 인포그래픽 lane, m2Slide_chapter_mode 는 레이아웃 데모로 각자 역할이 있다. `aTest-all` 은 **커버리지 감사용**으로 더하는 것이지 대체가 아니다
* 구현 명세:
    - ① `Projects/aTest-all/` 생성 — chapter mode(`markdown/` + `AGENDA.md`), `_config.yml` 은 aTest 기준(theme `default` · `slide_ratio: "3:2"` · `cards_placeholder: false`)
    - ② 원고 = aTest(`aTest.md`) + igTest(`markdown/*.md` 5챕터)를 챕터로 배치. **문구는 옮기기만 하고 새로 짓지 않는다**
    - ③ 계약 요소 커버리지를 **세는 도구**를 만든다 — fidelity 의 요소·축 목록 ↔ 그 덱이 실제로 담은 것을 대조해 *"아무 덱에도 없는 축"* 을 보고. 이것이 이 이슈의 본체다(합본 자체는 수단)
    - ④ `./z_test/ig-ppt/6.roundtrip.sh aTest-all` 전건 통과 + `4.laneb`·`5.lanem`·`--lint-data`
    - ⑤ 기존 3덱 회귀 0
    - 종료 조건: `aTest-all` 왕복 FAIL 0 + 커버리지 보고가 **미측정 축 0** 을 내거나, 남은 축을 이유와 함께 선언
* 진행 (2026-09-19 · commit `af45902`, `0eb5ed7`):
    - ✅ **`Projects/aTest-all/` 생성** — chapter mode 6챕터(aTest 1 + igTest 5) · HTML 47장. 이미지는 두 덱 것을 한 곳에 병합. 문구는 옮기기만 했고 챕터 번호만 AGENDA 에 맞췄다(구조 표식)
    - ✅ **합치자마자 계약 밖 차이 8건이 나왔다** — 이것이 이 이슈의 근거다. 갈린 덱에서는 하나도 안 보이던 것들이다. ③ 계약 대조·⑤ 시각 축은 이제 **전건 통과**
    - ✅ **① chapter mode 메타 출처가 갈려 있었다** — build-source 의 lane S 는 *첫 챕터* frontmatter 를, 검사기 `meta_source()` 는 AGENDA 를 봤다. **같은 규칙을 쓰게 맞췄다**
    - ✅ **② 챕터 진입 장 안의 H2 부제·layout 디렉티브를 본문으로 셌다** — 그 장은 HTML 도 pptx 도 만들지 않는다(`cards_placeholder: false`). H1 은 계속 잰다
    - ✅ **③ 하이퍼링크를 역변환이 읽지 않았다** — URL 은 pptx 에 `a:hlinkClick` 으로 **멀쩡히 있었다**. 본문·표 셀 양쪽에서 복원한다. *"복원 경로가 없는 것"* 과 *"실제로 잃는 것"* 은 다르다는 실증
    - ✅ **④ 불릿 없는 인용(`> …`)은 복원 경로가 아예 없었다** — 기존 덱이 전부 `* > …` 라 드러나지 않았다
    - ✅ **⑤ smart quotes** — pandoc 이 `"` → `“”`. 글자 전달을 묻는 축에서는 같게 본다
    - ✅ **⑥ 링크를 2축으로** — `hyperlink`(본문·표, lossless) / `cards_hyperlink`(lane B 도형, declared_drop). `wordart_fence` 는 `lossy` → `declared_drop` 으로 정정(요소 종류가 바뀌는 경우를 `lossy` 정의가 담지 못했다)
    - ✅ **⑴ 장 수 −3 원인 규명 완료** (2026-09-19 전면 재실행) — **한 뿌리**였다. TOC 장은 pptx 에 **있다**(p04 `01. 변환 경로 커버리지` · p12 `정체성 한 줄 정의`) — 제목이 다를 뿐이다(HTML 은 챕터명, pptx 는 `subtitle`). 실제로 빠진 것은 **챕터 진입 장 6개**이고, `48 − 6 + 구조 3 = 45` 로 정확히 맞는다
        - 🔴 **그런데 그 블록이 깨끗이 지워지지 않는다.** ch02 중간 원고 머리에 H1 은 지워졌는데 **`#layout-chapter` 와 `::: part` 가 남아 있다**. `::: part` 는 비표준 fenced div 라 껍데기만 걷히고 내용(`Chapter 1.`)이 평문으로 남고, [normalize_chapter](lib/pptx/build-source.py) 가 스스로 경고한 *"part 라벨은 버린다 — 남기면 pandoc 이 제목 없는 장으로 흘린다(무제목 5장의 정체가 이것이었다)"* 가 그대로 재발했다
        - 🔴 **`4.laneb aTest-all` 2/6 실패도 같은 뿌리다** — `직접 확인할 수 있음` 장의 pptx 본문 끝에 흘러든 `Chapter 2.`·`02. m2slide란?` 두 문단이 붙어, lane B 의 *"본문 끝이 사이드카와 일치할 때만 걷어낸다"* 안전장치가 작동해 그 장을 건너뛰었다(→ ② 도형 없음 · ④ 평문 불릿 잔존). **마크다운 링크가 원인이 아니었다** — `INLINE_MD` 는 링크를 이미 정규화하고 사이드카 값도 pptx 와 같다
        - 다음 수정 지점: `normalize_chapter` 가 `cards_ph=False` 경로에서 **blocks[0] 을 통째로 교체하지 못하는** 조건을 찾는다(ch02 는 교체가 아예 안 일어난 것으로 보인다 — 챕터 인식 실패 의심). 고치면 장 수·lane B 가 함께 닫힌다
    - ✅ **⑴ 수정 완료** (commit `bf3efa3`, 종결 후 후속) — 원인은 챕터 인식 실패가 아니라 **`explicit_entry` 경로의 누락**이었다. 그 경로는 H1 만 걷어내고 진입 블록을 장으로 남기는데, 그러면 `::: part` 의 `Chapter N.` 이 **제목보다 앞에** 남아 pandoc 이 직전 장 본문에 붙인다. `PART_BLOCK` 을 함께 제거해 제목이 맨 앞에 오게 했다 — docstring 이 이미 *"part 라벨은 버린다"* 고 정해 둔 것이 이 경로에만 빠져 있었다
        - **두 러너가 한 수정으로 닫혔다**: `6.roundtrip aTest-all` **−3 → ✅ 통과**(장 수 +2, 예산 안 · 글자 누락 0) · `4.laneb aTest-all` **2/6 → ✅ 6/6**(도형 5장 전부 복원 — 흘러든 `Chapter 2.` 때문에 lane B 안전장치가 그 장을 건너뛰고 있었다)
        - 회귀 0 — `6.roundtrip` aTest·m2Slide_chapter_mode · `4.laneb` aTest · `3.parity` igTest(3/7 기존 유지) · `--lint-data`
    - ⏳ **남은 것** — ⑵ 구현 명세 ③ **커버리지 감사 도구**(이 이슈의 본체 — 아직 미착수) ⑶ `cards_hyperlink` 를 lossless 로 올리려면 글로벌 `ppt-info` 수정이 필요해 별도 이슈
    - 📌 기존 3덱 회귀 0 (`6.roundtrip` aTest·m2Slide_chapter_mode · `--lint-data`)
* 종결 (2026-09-19) — 종료 조건 둘을 모두 달성:
    - ✅ **`aTest-all` 왕복 FAIL 0** — 합치자 계약 밖 차이 **8건**이 나왔고 전부 해소했다. 기존 3덱 회귀 0
    - ✅ **커버리지 미측정 축 0** — [check-coverage.py](lib/pptx/check-coverage.py) + [7.coverage.sh](z_test/ig-ppt/7.coverage.sh) 신설. 첫 실행이 곧바로 4종을 찾았고 전부 해소했다
    - **이 이슈가 실증한 것**: 갈린 픽스처에서는 *"차이 없음"* 과 *"차이를 못 봄"* 이 구분되지 않는다. 합치자 8건, 커버리지를 재자 4건 — 합쳐 12건이 **한 세션 만에** 드러났다. 그중 둘(`inline_emphasis`·`slide_order`)은 **계약에 선언돼 있는데 검사기가 아예 안 재던** 축으로, Issue358 의 `font_outside_theme` 과 같은 형태다
    - **남은 경고(차단 아님)**: 한 덱에만 있는 축 6종(`table_cell_image`·`subheading`·`ordered_list`·`htmlart_lane_b`·`inline_symbol`·`slot_right`) — 그 덱을 고치면 축이 사라진다. 근거가 얇다는 알림이며 러너는 통과시킨다
    - **이월** → 별도 이슈: `cards_hyperlink` 를 lossless 로 올리려면 **글로벌 SCAR(`ppt-info` 블록 렌더러)** 가 run 에 `a:hlinkClick` 을 붙여야 한다. [global-scar-change-rules](~/.claude/rules/global-scar-change-rules.md) 상 `~/.claude/Issue.md` 등록이 필요하고, 타 repo 편집이라 승인을 물었고 **사용자 판정 2026-09-19 "지금은 두자"** — 계약이 `declared_drop` + `recover` 로 이미 선언하고 있어 손실이 기록되지 않는 상태는 아니다. 필요해지면 그때 등록한다


## Issue358: m2slide → pptx 미세 조정 — HTML 실측 ↔ pptx 렌더 대조를 같은 방식으로 반복 (등록: 2026-09-11, 해결: 2026-09-19, commit: `137acd5`, `45a644e`, `b77e86e`, `a7750f0`, `d75c05e`, `19f0677`, `02d3c86`, `7cfdeaa`, `85fa4bc`, `c0032d1`, `a20797f`, `52b4407`, `7e2123e`, `76799bd` 외 7건) ✅
* 목적: Issue342~357 로 변환 정책이 "대체로 맞는" 상태가 됐다. 남은 차이를 같은 방식 — HTML 실측(ego-browser, 1920×1280) ↔ LibreOffice 렌더 대조 → [transform.yml](data/m2slide2ppt/transform.yml)·[fidelity.yml](data/m2slide2ppt/fidelity.yml) 갱신 → 재빌드 → 6.roundtrip 러너 — 으로 좁혀 간다. 원고는 손대지 않는다
* depends: Issue357
* 상세 (알려진 잔여 — 발견 순):
    - **PowerPoint 실물 확인 반영** — Issue354·357 은 LibreOffice 렌더 + PowerPoint 서체 캐시·저장본 구조 대조까지가 검증 한계였다. 사용자가 PowerPoint 에서 본 차이(서체·SmartArt 편집 가능 여부·수식)를 첫 입력으로 받는다
    - **나머지 htmlart 를 lane G(SmartArt) 로** — timeline·chevron·step·funnel·numbered·compare 는 아직 lane B 도형 근사. 종류마다 HTML 렌더러 기하를 실측해 `smartart.catalog` + 캐시 기하를 더한다(레이아웃 자원: `SmartArt.framework` lo/cs/qs)
    - **Issue343 이월** — 중첩 깊이(2칸 vs CommonMark)·하이픈 뒤 공백 없는 불릿의 정본 결정, 무제 이미지 장(`_blank`·문단+이미지)의 pptx 배치. m2Slide_chapter_mode 러너 FAIL 2건(장 +5·글자 25종)이 이 항목이다
    - ~~**표 폭** — 열 폭을 모노스페이스 어림(한글 1em·그 외 0.5em)으로 잡아 HTML 904 vs pptx 876~~ ✅ **해결** (2026-09-19, commit `02d3c86`·`7cfdeaa`·`85fa4bc`·`c0032d1`)
        - 원인은 어림 계수가 아니라 **두 가지**였다. ① `table_geometry.fs` 가 45.4 — 본문 문단 글자를 표에 그대로 쓴 값이고, HTML 의 `td`·`th` 는 실측 **40px** 이다(1920px = 13.333in 이라 1px = 정확히 0.5pt → 22.7pt vs 20pt, 13.5% 초과). ② 폭 계산에 **여유가 0** 이었다 — `'lane A'` 68.1pt vs 가용 68.0pt, **0.1pt 초과로 두 줄**이 됐다
        - 계수(한글 1.0·라틴 0.5)는 **맞았다** — ego-browser Range 실측으로 확인(`'구분'` 80px=1.0em · `'lane A'` 120px=0.5em)
        - 해법은 안전 계수를 지어내는 대신 **CSS 규칙을 옮긴 것**이다 — HTML 표는 `table-layout:auto` + `min-width:50%` · `max-width:90%` 이고, 본문 폭(1808)의 50% = **904px** 이 곧 Issue358 이 적어 둔 그 904 다. 남는 폭을 열에 비례 배분하면 여유가 생기고 그것이 잘림 방지다
        - 결과: 표 폭 904px(HTML 904) · 열 226·293.8·384.2(HTML 226·293.5·383.5) · 글자 20pt(HTML 40px) · 잘림 0
    - ~~**일반 장 표 미처리**~~ ✅ **해결** (같은 날, commit `c0032d1`) — 표 서식이 `relayout_caption`(= `Content with Caption` 전용) 안에만 있어 일반 `Title and Content` 표는 pandoc 기본 그대로였다. 실측 m2Slide_chapter_mode p32 **8.5pt**·열 602px 균등 vs 같은 덱 p33 20pt·904px — 한 덱 안에서 표 두 개가 서로 다른 꼴이었다. 서식을 `apply_table_style()` 로 추출해 두 경로가 공유한다. ⚠️ 세로 위치는 건드리지 않았다 — 일반 장 표의 HTML 배치 규칙은 아직 실측 전이다
    - ~~**표 정렬 소실**~~ ✅ **계약 오판이었다** (commit `85fa4bc`) — `fidelity.yml` 이 `lossy`("정렬 지시자는 대응 어휘가 없어 소실")로 선언했으나 실측하면 LEFT/CENTER/RIGHT 가 **전부 보존**된다. 구 근거 덱 aTest 의 표는 세 열이 모두 `:---`(좌측)이라 **정렬 차이가 드러날 수 없었다**. `lossless` 로 정정. 교훈: 근거 덱이 그 축을 담지 않으면 *"차이 없음"* 과 *"차이를 못 봄"* 이 구분되지 않는다
    - **코드 상자 안 수식** — 코드 다음 문단의 OMML 은 PowerPoint 렌더를 봐야 한다(LibreOffice 는 fallback 평문)
    - **cards 본문 여러 줄·2단계** — aTest 는 한 줄 카드뿐. 여러 줄·`-` 2단계 카드의 높이 규칙(`card_geometry.body_line_h`) 실측
    - ~~**🔴 러너가 잃은 축 — "테마 밖 폰트 0"**~~ ✅ **해결** (2026-09-19, commit `a20797f`·`52b4407`·`7e2123e`·`76799bd`) — `check-visual` 에 `font_outside_theme` 축 신설(계약 `must_match`). 허용 기준은 **pptx 템플릿이 실제로 들고 있는 서체**(테마 major/minor)다 — ⚠️ 첫 판이 정책 `font.code` 를 허용 근거로 넣어 Menlo 를 통과시켰다(*화이트리스트로 덮기*와 실질이 같아 축의 존재 이유가 사라진다). 이어서 원인 제거 — `font.code` 를 **Menlo → NanumGothicCoding**(사용자 결정). 구 값은 CSS 체인에 실제로 있는 값이었으나 **HTML 은 폴백 체인이 있고 pptx 는 단일 지정**이라, 임베드 폰트 없는 이 pptx 는 Menlo 가 없는 머신에서 조용히 대체된다. `lane-t.py` 의 하드코딩 폴백 `or "Menlo"` 도 템플릿 서체로 정정. 결과: 3덱 전부 `밖 0` · aTest 빌드 WARN 1 → 0 · 3.parity igTest **4/7 → 3/7**
    - **🔴 구(舊) 기록 — 러너가 잃은 축 (원문)** (순환 테스트 재실행 2026-09-19 발견). `3.parity igTest` ⑥ 이 Menlo ×5 를 잡았는데 **aTest 에도 Menlo 가 있다**(p4). 그런데 `6.roundtrip aTest` 는 통과한다 — 그 러너의 시각 축에 `body_font`(서체 일치)는 있어도 **테마 밖 폰트를 세는 축이 없기 때문**이다. 주 러너가 `3.parity` → `6.roundtrip` 으로 옮겨 가며 **검출 축 하나가 조용히 사라졌다**. 축이 없으면 고쳐도 고쳐졌는지 잴 수 없으므로 **이것을 먼저** 복원한다. 그 다음 Menlo 잔존 원인 실측(theme 서체는 NanumGothicCoding 이고 retheme 가 `typeface=` 를 치환하는데 남았다 — 못 훑는 자리인지 그 뒤에 심어진 것인지)
    - **`3.parity` ③④ — 구조 실측 완료, 정본 결정 대기** (2026-09-19). 내용 손실은 **없다**(pptx 에 제목이 없는 HTML 장 4개를 찾았으나 본문 텍스트로는 전부 존재). HTML 한 챕터는 **두 장**이다 — `[1] layout-chapter` 는 *"Chapter 1. 정체성 한 줄 정의"* 로 **li 0개(제목만)**, `[2] layout-_cards layout-_toc` 가 *"m2slide란?"* + **li 5개**(챕터 내 목차). 현행 변환은 이 둘을 `## 부제 + 목록` **한 장으로 병합**해 pandoc 이 `Title and Content` 로 낸다 → `Section Header` 0개 · 장 수 `39 − 5 + 3 = 37`
        - ⚠️ **문서와 실측이 어긋나 고치지 못했다.** [normalize_chapter](lib/pptx/build-source.py) docstring 은 *"`# 01. m2slide란?` → Section Header(제목만)"* 를 약속하는데 중간 원고에 그 장이 **없다**(로그: `H1 진입 생략(cards_placeholder=false)`). 그리고 [_config.org.yml](_config.org.yml) 은 *"false 시 H1 슬라이드 자체를 deck 에서 제거"* 라 하는데 igTest 는 false 인데도 HTML 에 `layout-_cards` 장이 **남아 있다**
        - 결정이 필요한 것: `cards_placeholder` 가 지우는 대상이 `[1]` 인가 `[2]` 인가, 그리고 pptx 챕터 진입을 **제목만 장(Section Header)으로 분리**할 것인가 현행 병합을 최종형으로 볼 것인가. 사용자 방향은 "(b) 변환을 Section Header 로 → 남는 차이만 러너 정리" 지만, 위 두 불일치를 먼저 정하지 않으면 36장 덱의 장 구성을 추측으로 바꾸게 된다
    - **(구 기록) `3.parity` 기대값이 낡았다** — igTest 4/7 중 ①③④ 는 회귀가 아니다. `45a644e`("진입 장 판정을 HTML 과 일치")가 `cards_placeholder=false` 덱에서 H1 진입 장을 생략하도록 바꾼 **의도된 결과**이고 장 수도 계산이 맞는다(HTML 본문 39 − 진입 5 + 표지 1 + 목차 1 + Agenda 1 = 37). 러너가 구 기준(진입 5장)을 들고 있다. 기대값을 맞추든 `6.roundtrip` 으로 일원화하든 **두 러너의 기대값이 갈리는 구조**부터 정한다
    - **raw HTML 태그가 pptx 에 글자로 노출** — `m2Slide_chapter_mode` 내용 대조의 *"pptx 에만 있는 글자"* 에 `<li>원하는 레이아웃을 직접 구성할 수 있습니다.</li>` 등이 그대로 있다. HTML 빌드에서는 태그로 렌더되지만 pptx 에서는 글자다. 러너는 *"HTML 글자가 pptx 에 전부 있는가"* 가 기준이라 통과시키지만 청중은 `<li>` 를 본다
* 구현 명세:
    - 한 항목마다 ① ego-browser 로 HTML 실측 ② `soffice --headless --convert-to pdf` + `pdftoppm` 렌더 ③ 나란히 대조 ④ 정책 갱신(backup 후, 단독 커밋) ⑤ 필요 시 lane T/G 코드 ⑥ `./z_test/ig-ppt/6.roundtrip.sh aTest` 전건 + `4.laneb`·`5.lanem`·`--lint-data`
    - 정책이 소유해야 할 값(좌표·색·서체·기하)은 코드에 박지 않는다 — 검사기가 그 정책을 읽어 must_match 로 잰다
    - 종료 조건: 위 잔여 항목이 전부 계약(fidelity.yml)에 선언되거나 해소되고, aTest·m2Slide_chapter_mode 러너가 FAIL 0
* 진행 (2026-09-19 · commit `137acd5`, `45a644e`, `b77e86e`, `a7750f0`):
    - ✅ **러너 FAIL 0 달성** — `6.roundtrip` 이 aTest·m2Slide_chapter_mode 둘 다 통과. 후자는 FAIL 3건(bullets·h2_slide_title·table) + 장 수 +5 + 모자란 글자 25종이던 상태였다
    - ✅ **표 폭** (잔여 4번) — `02d3c86`·`7cfdeaa`·`85fa4bc`·`c0032d1` 로 해소. 표 계약은 `lossy → lossless` 로 **정정**(정렬은 보존된다 — 구 판정의 근거 덱이 전부 좌측 정렬이라 차이가 드러날 수 없었다)
    - ✅ **Issue343 이월 일부** (잔여 3번) — *하이픈 뒤 공백 없는 불릿*은 계약 서술이 **오판**임을 실측으로 밝혔다. HTML 도 pptx 도 CommonMark 느슨한 이어짐으로 **같게** 렌더하며, 어긋나 있던 것은 검사기였다. 무제 이미지 장은 빈 `## ` 생성 중단 + `head_bar_text` 선언으로 정리. **중첩 깊이(2칸 vs CommonMark)는 그대로 `bullet_nesting: lossy`** — 원고를 고치지 않고는 해소되지 않는다
    - ✅ **생성 장 3종을 계약에 세웠다** — `deck_toc_slide` 신설(계약에 아예 없었다) · `agenda_slide`·`chapter_toc_slide` 판정을 위치 휴리스틱에서 lane S `synth` 표식으로. 역변환이 36장 중 **0장** 걸러내던 것이 9장 정상 제거
    - ✅ **진입 장 판정을 세 곳에서 일치** — slide-parser(HTML `autoToc`) · build-source(`drop_auto_toc`) · check-roundtrip(`entry_slides`). 자식 헤딩을 가진 **H2 진입 장**을 pptx 만 만들던 것을 고쳤다(챕터4: HTML 6 · pptx 8 → 6)
    - ✅ **표 셀 그림을 별도 축으로** — `table_cell_image` 신설. pptx 네이티브 표의 셀은 그림을 담을 수 없어(`a:tc` 는 txBody 만) alt 텍스트만 남는다. `table` 에 섞어 재면 셀 글자·행열·정렬이 멀쩡한데 표가 깨진 것처럼 보인다
    - ✅ **lane G 확장 — chevron** (commit `d75c05e`, `19f0677`) — `htmlart chevron` 이 Basic Chevron Process SmartArt 로 나간다. LibreOffice 렌더로 HTML 과 같은 꼴(맞물린 갈매기·진행에 따른 농도·첫 장만 평평) 확인, 역변환 무손실. **한 종류를 더하는 일이 카탈로그 한 줄이 아님**이 드러났다 — `.glo` 의 layoutNode 이름이 레이아웃마다 통째로 달라 데이터 모델을 새로 지어야 한다. 그래서 `BUILDERS` 디스패치를 세웠고 다음 종류는 그 위에 붙는다
    - ⏳ **남은 것** — ① PowerPoint 실물 확인(사용자 입력 대기) ② lane G 나머지 5종(timeline·step·funnel·numbered·compare) ③ 코드 상자 안 수식(PowerPoint 렌더 확인 필요) ④ cards 본문 여러 줄·2단계 높이 규칙(픽스처 필요)
    - 📌 **선행 결함 2건 더** — ⑴ `m2Slide_visual_component` p28(Graphviz 장) 코드 상자가 캔버스를 벗어난다(lane T `restyle_code` · lane G 무관) ⑵ lane B/G 는 **H2 제목이 없는 장을 건너뛴다** — fPmIntro 의 chevron 장이 `# H1` 이라 대상에서 빠졌다(제목이 매칭 키인 구조적 한계)
    - 📌 **선행 결함 발견 (별건)** — `3.parity.sh igTest` 가 4/7 실패한다(slide-count·title-parity·structure-slides·font-outside-theme). **본 작업 이전 커밋에서도 동일**함을 워크트리 대조로 확인했다. 원인은 `cards_placeholder` 기본값 false 로 H1 진입 장이 없어 Section Header 가 0개인 것이며, 러너 쪽 전제가 낡았다
* 종결 (2026-09-19 · 사용자 판정 "종료해도 됨"):
    - 종료 조건이던 **러너 FAIL 0 을 달성**했다 — `6.roundtrip` 이 aTest·m2Slide_chapter_mode 둘 다 전건 통과
    - 이 이슈가 남긴 가장 큰 교훈은 **계약이 추정으로 쓰인 자리가 있었다**는 것이다. 표 정렬(`lossy` → 실측하니 보존)·하이픈 뒤 공백 없는 불릿(*"산출물 불일치"* → 실측하니 양쪽 같음) 둘 다 **근거 덱이 그 축을 담지 않아** 차이 없음과 차이를 못 봄이 구분되지 않았다. 같은 이유로 `font_outside_theme` 축은 러너를 옮기며 **조용히 사라져** 있었다
    - **이월** → [Issue369](#issue369): 위 교훈의 구조적 해법(갈린 픽스처를 한 덱으로 합쳐 모든 축을 한 번에 잰다)
    - **이월** → 별도 이슈 필요: ⑴ PowerPoint 실물 확인(서체·SmartArt 편집 가능 여부·코드 상자 안 수식 — 사용자 입력이 첫 단계) ⑵ lane G 나머지 5종(timeline·step·funnel·numbered·compare) ⑶ cards 본문 여러 줄·2단계 높이 규칙 ⑷ `3.parity` 기대값 갱신 또는 `6.roundtrip` 일원화 ⑸ raw HTML 태그가 pptx 에 글자로 노출


## Issue368: 피드백 종류 축 구현 — `원고/도구` 선택 + 도구 의견의 prj42 전달 (등록: 2026-09-19, 해결: 2026-09-19, commit: `f4057eb`) ✅
* 목적: Issue367 에서 확정한 축1·축3 을 m2slide 측에 구현한다. 지금은 `policy` 체크박스 하나가 소유 경계를 겸해 모호하고, 도구 결함 의견이 외부 repo 에 고여 prj42 로 돌아올 길이 없다
* depends: Issue367
* 상세:
    - 확정된 방향: 종류는 `원고 / 도구` 택일 · 원고는 요청 prj 로(현행) · 도구는 prj42 로 · 처리 주체는 그 prj 세션
    - 글로벌 `/feedback-process` 승격은 **prj3 소관**이라 본 이슈 범위 밖이다 — 본 이슈는 m2slide 측(서버 UI·적재·커맨드 문자열)만 다룬다
* 구현 명세:
    - ① 개요 의견 셀의 `policy` 체크박스를 `원고 / 도구` 라디오로 교체한다. 기본값은 **원고** — 대부분의 의견이 그 덱의 내용이기 때문이다. POST 스키마의 `policy: bool` 은 `kind: "content"|"tool"` 로 바꾸고, 구 필드는 한 릴리스 동안 받아 `policy:true → kind:"tool"` 로 읽는다(기존 인박스 호환)
    - ② `kind: "tool"` 항목의 적재처를 정한다 — m2slide `_doc_work/feedback/tool-inbox.jsonl` 신설이 1안이고, 출처(`project`·`real path`·`prj`)를 레코드에 함께 적어 **어느 덱에서 온 지적인지** 잃지 않게 한다. `_doc_work/` 는 git 미추적이라 로컬 학습 루프 입력이라는 성격과 맞는다
    - ③ 개요 커맨드 박스가 마운트 프로젝트에서는 **그 prj 기준 문자열**을 내게 한다 (`_mount_info` 가 이미 실제 경로·prj 번호를 준다). 복사 버튼 tooltip 의 *"m2slide 폴더의 세션에 붙여넣기"* 문구도 함께 고친다
    - ④ [dev-server-feedback.md](_doc_arch/dev-server-feedback.md) 의 저장 규약 표·소비 설계 절을 ①~③ 에 맞춰 고친다
    - 검증: 마운트 프로젝트에서 원고 의견 → 외부 경로 적재 · 도구 의견 → m2slide 적재(출처 보존) · 본체 프로젝트는 종전과 동일 · `test_server.py` 에 종류별 라우팅 테스트 추가
* 결과:
    - `policy` 체크박스 → `원고 / 도구` 라디오. 기본은 **원고** — 의견 대부분이 덱 내용이다
    - POST 스키마 `policy: bool` → `kind: "content"|"tool"`. 구 필드는 계속 받아 `policy:true → tool` 로 읽는다
    - 도구 의견은 m2slide `_doc_work/feedback/tool-inbox.jsonl` 로 가며 `source`(project·real·mount·prj)를 달고 간다 — 어느 덱이 촉발했는지 잃지 않는다
    - 구 `_pipeline/policy/_dev-feedback.yml` 쓰기는 **폐기**했다. 유일한 종착지가 promotion 이었고 처리기가 끝내 미구현이라 소비처가 0 이었다(기존 파일은 건드리지 않는다)
    - 개요 커맨드 박스가 마운트면 **실행 위치(소유 경로·prj)** 를 함께 낸다. 본체는 종전 문구 유지
    - 검증: 원고→외부 repo · 도구→m2slide(출처 보존) · 구 포맷 호환 · 본체 회귀 없음 · 테스트 66건 통과(라우팅 2건 신규)

## Issue367: 외부 마운트 피드백의 소유·전달 책임 설계 — 의견이 누구에게 가고 누가 처리하는가 (등록: 2026-09-19, 해결: 2026-09-19, commit: `4fd9f5c`) ✅
* 목적: 사용자 지적(2026-09-19) — *"외부 프로젝트에서 진행하는 경우 의견이 prj42 가 아니라 요청한 프로젝트에 전달되어야 한다"*. 현재는 **적재 위치만 우연히 맞고 처리 책임과 역방향 경로가 설계돼 있지 않다**
* depends: Issue365
* 상세:
    - **현상①** — 원고 의견은 외부 경로 `_pipeline/feedback/dev-feedback.jsonl` 에 정상 적재된다(실측). 그런데 소비 설계([dev-server-feedback.md](_doc_arch/dev-server-feedback.md) "소비 설계")는 *"m2slide 폴더의 Claude Code 세션에 붙여넣어 실행"* 으로 못박혀 있다 → **m2slide 세션이 타 repo 원고를 고치게 된다**. 글로벌 [input-interpretation-rules](~/.claude/rules/input-interpretation-rules.md) 의 *"현재 프로젝트 밖 부작용 = 승인 필수"* 와 정면으로 어긋난다
    - **현상②** — `policy: true` 항목은 외부 경로 `_pipeline/policy/_dev-feedback.yml` 로 간다. 그런데 그 인박스의 **종착지는 m2slide 글로벌 `data/<단계>/*.yml` promotion** 이다 → 도구 정책 의견이 외부 repo 에 고여 **prj42 로 돌아올 길이 없다**. 현상①의 정확한 거울상이다
    - **현상③** — 개요 커맨드 박스가 내는 `/feedback-process <P>` 는 m2slide 로컬 커맨드다. 외부 prj 세션에는 그 커맨드가 존재하지 않는다
* 구현 명세:
    - 본 이슈의 산출은 **결정과 문서**다. 코드 변경은 결정 후 별도 이슈로 분리한다
    - **축1 — 의견의 종류**: 원고(그 덱의 내용) / 도구(m2slide 렌더·테마·레이아웃 결함)로 갈린다. 현재 `policy` 체크박스 하나가 *"정책화 여부"* 와 *"소유 경계"* 를 겸해 모호하다. 체크박스를 종류 선택으로 바꿀지, 축을 하나 더 세울지 결정한다
    - **축2 — 적재처**: 원고 → 요청 prj(현행 유지) · 도구 → prj42. 후자의 구체 경로를 정한다 (m2slide `_doc_work/feedback/inbox.jsonl` 신설 / `Issue.md` 🌱 이슈후보 자동 등록 / 기존 policy promotion 경로 재사용 중 택1)
    - **축3 — 처리 주체**: 원고 의견은 **그 prj 세션**이 돌아야 위 룰과 정합한다. `/feedback-process` 를 글로벌 SCAR 로 승격할지 · prj 별로 배포할지 · `/fpm-do <N>` 위임으로 넘길지 결정한다
    - **축4 — 커맨드 문자열**: 개요가 마운트 여부를 알게 되면(Issue366) 커맨드 박스도 그 prj 기준으로 내야 한다 (`cd <실제경로>` 안내 또는 `/fpm-do <N> "/feedback-process <P>"`)
    - 판정 결과를 [dev-server-feedback.md](_doc_arch/dev-server-feedback.md) 에 "외부 마운트 — 소유와 전달" 절로 기술하고, 소비 설계 절의 *"m2slide 폴더 세션"* 문구를 그에 맞게 고친다
    - ⚠️ **착수 전 사용자 확인 필수** — 축1·축3 은 기술 판단이 아니라 업무 방식 선택이다
* ✅ **결정 (2026-09-19 사용자 확정)**:
    - **축1 = 종류 선택으로 교체**. `policy` 체크박스를 없애고 `원고 / 도구` 라디오를 둔다. 의견 1건은 둘 중 하나에 속하며 **그 선택이 곧 전달처**다. 기존 policy(정책 승격) 의미는 '도구' 쪽으로 흡수한다
    - **축3 = `/feedback-process` 를 글로벌 SCAR 로 승격**. 마운트 프로젝트의 원고 의견은 **그 prj 세션이 자기 repo 원고를 고친다** → "현재 프로젝트 밖 부작용" 자체가 성립하지 않게 된다
    - 따라서 **축2** 는 원고 → 요청 prj(현행 유지) · 도구 → prj42 로 확정되고, **축4** 는 개요가 마운트를 알 때(Issue366 완료) 그 prj 기준 커맨드 문자열을 내는 것으로 확정된다. 도구 의견의 prj42 측 구체 경로는 착수 시 정한다
    - ⚠️ 글로벌 SCAR 승격은 **prj3(`~/.claude/Issue.md`) 이슈 등록 절차**를 거친다 — 본 repo 에서 즉흥 수정하지 않는다([global-scar-change-rules](~/.claude/rules/global-scar-change-rules.md))
    - m2slide 측 구현은 Issue368 로 분리했다. 본 이슈는 **설계 확정**으로 종결한다

## Issue366: `/p/` 목록·개요에서 외부 마운트 프로젝트를 구분 표기 (등록: 2026-09-19, 해결: 2026-09-19, commit: `4fd9f5c`) ✅
* 목적: 마운트 프로젝트가 본체 프로젝트와 화면상 구분되지 않는다. 지금 고치는 원고가 **어느 repo 것인지** 개요만 보고 알 수 없고, 의견 전달처가 갈리는 순간(Issue367) 이 구분은 선택이 아니라 전제가 된다
* depends: Issue365
* 상세:
    - `/pd/`(덱 목록)는 별도 페이지라 구분이 되지만, `/p/` 목록에 올라온 뒤로는 본체와 동일하게 보인다
    - 판정 자체는 비용이 없다 — `os.path.islink(Projects/<P>)` 한 줄이면 갈린다
* 구현 명세:
    - [`_serve_project_list()`](lib/dev-server/server.py) 카드에 🔗 배지 + `realpath` 를 `title` 속성으로. 본체 프로젝트에는 아무 표기도 붙이지 않는다(무표기가 기본)
    - [`_serve_project_overview()`](lib/dev-server/server.py) 머리에도 같은 배지 + 실제 경로 + 소유 prj 번호 1줄
    - `Projects_deck` 경유(deck 토큰)도 같은 축으로 표기 — 지금은 `/p/` 에서 출처를 알 수 없다
    - 검증: 심링크 1건 등재 후 `/p/` 에 배지 노출 · 본체 프로젝트 카드에는 미노출 · 개요 머리의 실제 경로가 `realpath` 와 일치

## Issue365: 외부 프로젝트를 `/p/` 에 올리는 공식 수단 — `--link`/`--unlink`/`--links` (등록: 2026-09-19, 해결: 2026-09-19, commit: `4fd9f5c`) ✅
* 목적: 다른 repo 에서 진행 중인 덱을 dev-server 개요에 올리는 방법이 지금은 `ln -sfn` 손작업이고, 그 사실이 문서 어디에도 없다. 실측(2026-09-19)으로 심링크가 목록 등재·개요 렌더·solo 뷰·의견 저장까지 **완전히 동작**함을 확인했으므로, 우연히 되는 동작을 **공식 수단으로 승격**한다
* depends: (없음)
* 상세:
    - 경로 해소 단일 지점 [server.py `_project_root()`](lib/dev-server/server.py) 는 `Projects/<P>` → `Projects_deck/decks/*/<P>` 순으로 `os.path.isdir()` 판정한다. isdir 은 심링크를 따라가므로 **외부 경로가 그대로 통과**한다
    - 실측 결과: 빌드 성공(산출물은 외부 경로 `slide/`) · `/p/` 목록 등재 · 개요 의견 셀 생성 · solo 뷰 200 · 의견 POST `saved:1` · 적재 위치가 **외부 경로** `_pipeline/feedback/dev-feedback.jsonl` · 개요 "미처리 N건" 반영 · `Projects/.gitignore` 의 `/*` 로 git 오염 0
    - 빠진 것은 기능이 아니라 **입구**다 — 등재·해제 수단, 중복 토큰 검사, 실수로 실디렉토리를 지우는 것을 막는 가드
    - 서버 루트는 기동 시 `os.chdir(root)` 로 m2slide 에 고정되고 탐색 루트는 위 두 곳뿐이라, *"제3의 프로젝트 루트를 등록하는 설정"* 은 구조적으로 없다. 그래서 수단이 심링크인 것이며 이 이슈는 그 전제를 바꾸지 않는다
* 구현 명세:
    - `./m2slide.sh --link <외부경로> [토큰]` — 토큰 생략 시 경로 basename. 순서: 경로 존재·isdir 확인 → 토큰 형식 검사(`^[A-Za-z0-9][A-Za-z0-9._-]*$`) → **중복 토큰 검사**(`Projects/` 실체·심링크 + `Projects_deck/decks/*/`) → `ln -sfn` → 결과 1줄 보고(토큰·실제 경로·소유 prj)
    - `./m2slide.sh --unlink <토큰>` — **`os.path.islink` 참일 때만** 제거한다. 실디렉토리면 거부하고 사유를 출력 (오삭제 차단이 이 서브커맨드의 존재 이유)
    - `./m2slide.sh --links` — 토큰 · 실제 경로(`realpath`) · 소유 prj 번호 표. prj 번호는 `~/_git/___pm/projects/{N}` 최장 prefix 역조회로 **런타임 산출**한다(`sh/fpm_function.sh` `cdf-num()` 과 동일 정책) — 별도 메타 파일을 만들지 않는다
    - ⚠️ 마운트 메타를 **파일로 남길지 여부는 Issue367 의 소유 설계에 종속**된다. 본 이슈는 런타임 산출만으로 끝나는 범위에 머문다
    - 문서: [dev-server.md](_doc_arch/dev-server.md) 에 "외부 프로젝트 마운트" 절 신설 — 지금 이 문서는 `Projects/` 전제로만 쓰여 있다
    - 검증: 위 실측 절차 재현(빌드 → `/p/` 등재 → 의견 POST → 외부 경로 적재) + `--unlink` 가 실디렉토리를 거부하는지 1건

## Issue363: htmlart `callout` 라벨이 viewBox 밖에 그려진다 — 4:3 자동 확장 + `wide` orientation (등록: 2026-09-19, 해결: 2026-09-19, commit: `85fa4bc`, `b3bb28b`, `e656fd4`) ✅
* 목적: Issue362 의 4:3 검증에서 드러난 **선행 결함**. 4:3 이 만든 문제가 아니라 4:3 이 **드러낸** 문제다
* depends: Issue362
* 상세 — 원인 사슬:
    - [htmlart_dispatch.client.js:1548](lib/component-hooks/htmlart_dispatch.client.js#L1548) `renderCallout` 의 viewBox 는 `0 0 2000 1200` 고정인데, `W`/`E` zone 라벨 박스는 `labelBox()` 가 `x = -460` ~ `x = 2460` 에 배치한다 — **viewBox 밖 좌우 460 단위씩**
    - SVG 는 `width:100%;height:100%` + 기본 `preserveAspectRatio="xMidYMid meet"` 이다. `meet` 레터박스 여백이 viewBox 밖 라벨을 우연히 보여주고 있었을 뿐이다
    - htmlart 블록은 남는 세로 공간을 채우도록 자란다 → 4:3(슬라이드 1440) 에서 블록이 높아짐 → `meet` 스케일 상승(3:2 `0.7325` → 4:3 `0.8658`) → 레터박스 여백이 좁아짐(각 171 → 38 논리px) → viewBox 밖 라벨이 **슬라이드 경계 밖으로 밀려 잘린다**
    - 실측(4:3, `m2Slide_visual_component` 5.27c vertical): `W` zone 라벨 "속도 2배 향상" 이 "도 2배 향상" 으로 좌측 잘림. 최우측 요소가 슬라이드 폭 1920 을 `+130.9` 초과
    - 3:2 에서도 라벨 박스 자체는 이미 슬라이드 밖(`-109`)이다. 텍스트가 박스보다 좁아 **우연히** 안 잘렸을 뿐이라 원래부터 아슬아슬했다
* 구현 1차 — 사용자 판정(2026-09-19): **기존 배치를 고치지 않고 레이아웃을 추가한다**
    - 정공법(기존 viewBox 확장)은 `meet` 스케일이 `0.7325 → 0.619` 로 떨어져 **기존 덱의 callout 도해가 통째로 작아진다**. 라벨이 온전해지는 것은 개선이지만 기존 외관을 바꾸는 대가가 이슈 밖이라 택하지 않았다
    - 대신 [renderCallout](lib/component-hooks/htmlart_dispatch.client.js#L1554) 에 `wide` 를 더했다 — `vertical` 과 **같은 좌우 배치(V_p)** 에 캔버스만 `2920×1200` 으로 넓힌 변형. `fan` 이 이미 `2200×1500` 별도 캔버스를 쓰므로 **orient 마다 캔버스를 달리하는 패턴은 이 코드에 이미 있었다**
    - `2920` 은 임의 값이 아니다 — `hubW 920 + 좌우 각 (arm 520 + labelW 480)` 이라 **여백 없이 딱 맞는다**. 기존 좌표식을 하나도 안 건드리고 `cx` 만 따라 옮겨진다
    - [markdown.js](lib/markdown.js#L347) 파서에 `{.w}`/`{.wide}` → `data-orientation="wide"`. ⚠️ 정규식 alternation 은 `wide` 를 `w` **앞**에 둔다 — 뒤에 두면 축약이 긴 이름을 가로챈다(회귀 가드 테스트 1건 추가)
    - 카탈로그 [types.yml](data/htmlart/types.yml) `callout.orientation_note` 에 선택 기준을 적었다 — *"4:3 에서 좌우 분산이 필요하면 vertical 대신 wide"*
* 검증 (ego-browser 실측, `Reveal.configure({transition:"none"})` — Issue362 의 트랜지션 오탐 교훈 적용):

  | 판형 | `{.v}` | `{.w}` |
  | :--- | :--- | :--- |
  | 4:3 | 좌우 각 **117.2px 넘침** (잘림 재현) | **161.1px 여유** |
  | 3:2 | 33.3px 여유 (무변경) | 202.6px 여유 |

    - 대가는 크기다 — 4:3 에서 svg 높이 `930.7 → 769.5`. 폭 제한 스케일이 낮아지므로 도해가 작게 보인다. **그래서 기존 배치를 바꾸지 않고 선택지로 더한 것**이다
    - 회귀 — 3:2 에서 `fan`(2200×1500) · `horizontal`(2000×1200) · `vertical`(2000×1200) viewBox·배치 전부 불변
    - `node --test lib/__tests__/markdown.test.js` 66/66 (wide 3케이스 신규) · `--lint-data` · `--lint-deployment` rc0
    - 데모 `m2Slide_visual_component` 에 5.27d 장 추가 (5.27c `{.v}` 와 나란히 대비). branch 5개로 두어 **정동(W·E) zone 을 실제로 쓰게** 했다 — 4개면 대각 zone 만 쓰므로 가장 먼 케이스를 실증하지 못한다
    - 4:3 에서 W·E 를 쓰는 5-branch `{.w}` 도 좌우 **50.2px 여유**(넘침 0). 2920 이 콘텐츠 실폭이라 여유가 얇은 것이지 모자란 것이 아니다
* ⚠️ **등록 시 서술 정정 — 밖으로 나가는 것은 W/E 만이 아니다**:
    - 등록 본문은 5.27c 의 잘린 라벨을 *"`W` zone"* 이라 적었으나, 그 장의 branch 는 4개라 `V_p[4]=['NW','NE','SW','SE']` — 실제로는 **`NW` zone** 이다. `labelBox` 로 재면 `lx = (1000-320)-480 = -260` 으로 역시 viewBox 밖이다
    - 즉 `vertical` 은 **branch 수와 무관하게 항상 밖**이다 — 4개면 대각(`-260`~`2260`), 그 밖의 수면 W/E(`-460`~`2460`). 지목 대상만 틀렸고 결함의 범위는 등록 당시 추정보다 **넓다**
    - `wide` 는 가장 먼 W/E 기준으로 캔버스를 잡았으므로 대각 zone 은 자동으로 들어온다
* 구현 2차 — 사용자 지적(2026-09-19): *"설정에서 4:3 을 지원하지 않는 한 해결되지 않을 것 같은데, 해결했다고 주장하는 이유는?"*
    - **지적이 옳다.** 1차가 검증한 명제는 *"4:3 에서 `{.w}` 를 쓰면 안 잘린다"* 이지 *"4:3 에서 callout 이 안 잘린다"* 가 아니었다. 설정을 4:3 으로 바꾼 기존 원고는 그대로 잘리고, 원고를 일일이 고쳐야 해소되므로 **등록 이슈의 회피책과 부담의 성격이 같았다**
    - 4:3 설정 자체는 [Issue362](#issue362)(`b81c1a1`)에서 이미 지원된다 — [config.js:20](lib/config.js#L20) `VALID_SLIDE_RATIOS` · [html-builder.js:207](lib/html-builder.js#L207) `1920×1440` · [server.py:1875](lib/dev-server/server.py#L1875) GUI enum. 1차의 117.2px 넘침도 실제 4:3 빌드에서 잰 값이다
    - **판단 오류**: *"기존 덱 도해가 15% 작아진다"* 를 이유로 자동 적용을 포기했는데, `slide_ratio` 전수 조회 결과 **4:3 을 쓰는 기존 덱은 0건**(3:2 11건·16:9 2건)이다. 4:3 은 Issue362 가 방금 추가한 신규 판형이므로 당연하다 — 회귀와 자동 해결이 충돌한다고 본 전제 자체가 틀렸다
    - 좌표식 전수 계산으로 **결함 범위가 등록·1차 추정보다 넓다**는 것도 드러났다. 등록 본문은 *"branch 3개 이하 horizontal 은 안전"* 이라 했으나 N=3 도 `NE` 때문에 `2260` 으로 밖이다:

  | branch | horizontal 범위 | vertical 범위 |
  | :--- | :--- | :--- |
  | 1·2 | `0~2000` (안) | `0~2460` · `-460~2460` |
  | 3·4 | `0~2260` | `-460~2460` · `-260~2520` |
  | 5·6 | `-260~2260` | `-460~2460` |
  | 7·8 | `-260~2460` · `-460~2460` | `-460~2460` |

    - 그래서 캔버스를 **고정 2920 으로 키우지 않고 라벨 실좌표로 계산**한다 — 필요 폭이 조합마다 2260~2920 이라 고정값은 과잉이고 그만큼 도해가 불필요하게 작아진다. [mkSvg](lib/component-hooks/htmlart_dispatch.client.js#L482) 에 min-x 인자를 더하고(기존 4인자 호출은 `0` 으로 떨어져 무변경), `renderCallout` 이 zones 확정 후 `labelBox` 로 범위를 재 viewBox 를 감싼다
    - 적용 조건은 둘 — `.reveal.ratio-4-3`(자동) 또는 `{.w}` 명시. **판형은 빌드 시점에 정해지는 정적 사실이라 런타임 측정과 달리 오탐이 없다**(전환 중 `getBoundingClientRect` 가 회전 transform 을 포함하는 함정은 Issue362 에서 실제로 밟았다)
* 검증 2차 (4:3 전수 — 원고 수정 0):

  | 장 | orient·branch | viewBox | 넘침 |
  | :--- | :--- | :--- | :--- |
  | 5.27 | fan · 8 | `-294.96 0 2789.92 1500` | 94.4px 여유 |
  | 5.27b | horizontal · 4 | `0 0 2260 1200` | 좌 437.2 · 우 50.2 여유 |
  | 5.27c | vertical · 4 | `-260 0 2520 1200` | 50.2px 여유 (1차엔 **117.2px 넘침**) |
  | 5.27d | wide · 5 | `-460 0 2920 1200` | 50.2px 여유 |

    - 3:2 회귀 — `fan` `0 0 2200 1500` · `horizontal` `0 0 2000 1200` · `vertical` `0 0 2000 1200` **전부 원래 값**. `{.w}` 명시만 판형과 무관하게 확장 유지
    - 좌측이 확장 불필요한 `horizontal` 은 `vbX=0` 이 유지된다 — 필요한 쪽만 넓힌다
* ⚠️ **커밋이 Issue358 작업과 섞였다** — 같은 repo 에서 Issue358 세션이 **동시 진행 중**이었고, 본 이슈가 `git add` 해 둔 인덱스가 그 세션의 커밋에 실렸다. 그래서 본 이슈의 코드 변경은 독립 커밋이 아니라 `85fa4bc`(*"Policy(Issue358): 표 계약을 lossy → lossless 로 정정"*) 안에 있다
    - 되돌리지 않는다 — [data-access-rules](.claude/rules/data-access-rules.md) *"이미 섞어 커밋했다면 되돌리지 말고 후속 커밋에서 분리 이력을 남긴다"*. 강제 히스토리 재작성은 협업자 재clone 을 요구한다
    - 교훈: **한 repo 에 두 세션이 붙어 있으면 `git add` 로 인덱스를 점유한 채 다른 일을 하지 않는다.** 인덱스는 repo 단위 공유 자원이라 남의 `git commit` 이 그대로 집어간다. 경로를 지정하는 `git commit -- <path>` 가 안전하다

## Issue362: `slide_ratio: "4:3"` 지원 — 기존 강의 덱(4:3)과 한 파일로 합치기 위해 (등록: 2026-09-19, 해결: 2026-09-19, commit: `b81c1a1`) ✅
* 목적: prj60(`__lec`) 대금지오웰 설계·R&D 교안을 m2slide 로 만드는데, 그 교안이 **기존 강의 덱과 한 파일로 합쳐져야 한다**. 그 덱들이 전부 4:3 이라 m2slide 가 4:3 을 못 내면 HTML 도 pptx 도 그 판형으로 못 간다
* triage: 중간 (화이트리스트 1줄이 아니라 JS·Python 3모듈 + 비율 소비 지점 전수 감사. 레이아웃 수정은 불필요했고, 대신 htmlart callout 선행 결함 1건을 별건으로 분리)
* 요청 출처: prj60 `__lec` — `Project/202609_Rebuild/1.design_rnd`. 지금까지 `16:9` 로 우회해 둔 상태였다
* 기존 덱 4:3 판형 실측값 (13004800 × 9753600 EMU = 1.3333):
    - `~/work/sreMsa/ppt_withVm_3d/kubernetes_part1_v2.1.2.pptx` (147장)
    - `~/work/sreMsa/ppt_withVm_3d/kubernetes_part2_v2.1.2.pptx` (133장)
    - prj60 `Project/202609_Rebuild/1.design_rnd/build/base.pptx`
* 상세 — 비율 소비 지점 전수 추적 결과:

  | 위치 | 역할 | 4:3 대응 |
  | :--- | :--- | :--- |
  | [config.js:20](lib/config.js#L20) `VALID_SLIDE_RATIOS` | 화이트리스트 (hard error 게이트) | **수정** — `'4:3'` 추가 |
  | [html-builder.js:197](lib/html-builder.js#L197) `resolveRevealDimensions` | Reveal width/height/ratioClass | **수정** — `1920×1440`·`ratio-4-3` 분기 추가 |
  | [server.py:1875](lib/dev-server/server.py#L1875) 설정 GUI enum | dev-server 비율 드롭다운 | **수정** — 옵션 추가 |
  | [config.js:771](lib/config.js#L771) `slideRatioNumeric` | CSS `--slide-ratio` 값 | 무수정 — 정규식 기반이라 `4:3 → 1.3333` 자동 |
  | [build-pptx.sh:169](lib/pptx/build-pptx.sh#L169) 판형 교정 | theme.yml canvas | 무수정 — 정규식 기반. `338.67×254.00mm` 산출 확인 |
  | [check-visual.py:243](lib/pptx/check-visual.py#L243) 판형 검증 | HTML↔pptx 대조 | 무수정 — 정규식 기반 |
  | [detect-viewport.py:29](lib/tuner/detect-viewport.py#L29) `RATIO_MAP` | tuner 뷰포트 | 무수정 — **이미 `4:3 → 1920×1440` 을 갖고 있었다** |
  | [base.css](lib/css/base.css) · theme `slide.css` | ratio 클래스 | 무수정 — `ratio-fill` 만 특례 처리하고 나머지는 `--slide-ratio` 변수로 일반화돼 있다. `ratio-4-3` 전용 CSS 불필요 |

* 구현 명세 — 논리 폭은 **언제나 1920 고정**이고 높이만 늘린다 (`1920×1440`):
    - theme CSS 의 `font-size`·`padding` 이 전부 **1920 논리폭 좌표계**에서 쓰였다. 폭을 줄이면(ex `1440×1080`) 가로 조판이 통째로 어긋난다
    - 같은 원칙을 [build-pptx.sh](lib/pptx/build-pptx.sh) 가 이미 명문화해 뒀다 — *"폭은 그대로 두고 높이만 비율에 맞춘다"*. `3:2 → 1920×1280` 선례와도 일치
* 검증 — `default_lec` layout 7종 · htmlart 27종 · cards · 표 전수 빌드 후 [ego-browser](~/.claude/skills/ego-browser/SKILL.md) 실측:
    - **layout 7종 전부 정상** — `chapter`·`contents`·`contents-full`·`contents-split`·`exercise`·`exercise-small`·`summary`·`closing` 넘침 0. `cards`(3열·6장) · 7열 표 · 긴 셀 표 · 코드블록 도 정상
    - htmlart 27종 중 **25종 정상**. `callout` 의 `horizontal`·`vertical` 2변형만 가로 넘침 (→ Issue363 분리)
    - ⚠️ **넘침 측정은 `Reveal.configure({transition:"none"})` 로 트랜지션을 끄고 재야 한다.** `convex` 전환 중 `getBoundingClientRect` 가 회전 transform 을 포함해 **450ms 대기로는 오탐이 난다** — 최초 측정에서 exercise·summary·closing 이 넘치는 것으로 잡혔으나 전부 허위였다
* 회귀 — `m2Slide_single_mode`(3:2) · `m2Slide_chapter_mode`(3:2) · `m2Slide_visual_component`(3:2) 변경 전후 빌드 산출 대조:
    - 캐시버스터 타임스탬프를 정규화하면 남는 diff 는 **주석 1줄뿐**(`ratio-3-2/16-9` → `ratio-3-2/4-3/16-9`). Reveal `width`·`height`·`ratioClass` 전부 동일

## Issue359: `exercise`·`exercise-small` 본문 들여쓰기가 안 먹는다 — CSS 명시도 충돌 (등록: 2026-09-19, 해결: 2026-09-19, commit: `d537625`) ✅
* 목적: prj60 작업 중 실측으로 드러난 것. `default_lec` 테마의 `exercise` 계열 layout 이 본문 좌측 들여쓰기를 선언해 두고도 **적용받지 못해** 나비 마스코트가 글자를 덮는다. 원고가 아니라 CSS 명시도 문제다
* 상세:
    - 충돌 표 (먼저 로드되는 쪽이 **명시도로** 이긴다):

      | 출처 | 선택자 | 명시도 | 선언 |
      | :--- | :--- | :--- | :--- |
      | [base.css](lib/css/base.css) L782 (먼저 로드) | `.reveal section[class*="layout-"] > div[class$="-body"]` | **0-3-2** | `padding: 1em 0` |
      | [default_lec/slide.css](theme/default_lec/slide.css) L507·L522 (나중 로드) | `.reveal section.layout-exercise .exercise-body` | 0-3-1 | `padding-left: 18%` |

    - shorthand `padding: 1em 0` 이 `padding-left`·`padding-right` 를 **0 으로 리셋**한다. 나중에 로드돼도 명시도가 낮아 theme 선언이 진다
    - 실측(ego-browser `getComputedStyle`, 1920 기준): **before `padding: 40px 0px 40px 0px`** — 선언한 18%/30%·4% 가 전혀 안 걸렸다
    - 증상: 나비(`background-position: 4% 60%`, `background-size: 14%`)가 본문 글자와 겹친다. `exercise-small` 은 나비가 22% 라 더 심하다. 부수적으로 `htmlart numbered` SVG 가 폭이 안 줄어 본문 영역을 넘친다
    - 🔴 **`#layout-exercise` 실사용 0건**(`Projects/` 전수 grep)인 이유가 이것으로 보인다 — 안 쓴 게 아니라 **써 보니 깨져서** 안 쓴 것. 동시에 기존 덱에 회귀 위험이 없는 근거이기도 하다
    - 같은 결함이 `theme/default` 에도 **글자 그대로 복제**돼 있었다(L469·L484) — 함께 고쳤다
* 구현 명세:
    - 선택자에 **자식 결합자 + 요소 선택자**(`> div`)를 넣어 0-3-2 동점을 만든다. 동점이면 나중 로드가 이긴다
    - `.reveal section.layout-exercise > div.exercise-body` · `.reveal section.layout-exercise-small > div.exercise-body`
    - ⚠️ **base.css 는 고치지 않는다** — [CLAUDE.md](CLAUDE.md) 의 base.css 가드(사용자 컨펌 필수)와 우선순위 규칙(`theme slide.css > layout CSS > base.css`)을 따라 theme 에서 끝낸다
    - 장황해 보이는 선택자가 되돌려지지 않도록 **왜 `> div` 가 필요한지** 주석을 규칙 위에 남긴다
    - 검증: 대표 프로젝트 2종 빌드 + 테스트 필수 4항목 + `exercise` 최소 원고로 `padding-left` 실측
* 결과:
    - 실측 **before `padding-left: 0px` → after `325.44px`(= 1808 × 18%)** · exercise-small `0px → 542.40px`(= 30%) · `padding-right` 양쪽 `72.31px`(= 4%). 나비와 본문이 겹치지 않음을 캡처로 확인
    - 회귀 검증: `./m2slide.sh m2Slide_single_mode`·`m2Slide_chapter_mode` rc0. 산출 diff 는 **캐시버스터 타임스탬프 + 본 수정분뿐**. 테스트 필수 4항목(첫 슬라이드 제목·다음 슬라이드 제목·스크롤 `overflow-y: auto` 유지·880×587 리사이즈) 전건 통과, 콘솔 에러 0
    - 전수 확인 중 **같은 충돌이 live layout 6종에 더 있음**을 발견 — 기존 덱 렌더가 바뀌는 범위라 [Issue360](#issue360) 으로 분리

## Issue343: m2slide 파서와 pandoc 이 같은 원고를 다르게 읽는다 — HTML 덱과 pptx 가 갈린다 (등록: 2026-09-10, 해결: 2026-09-11, commit: `fd7567e`, `8ad540c`, `4e904c4`, `a0621e9`) ✅
* 목적: Issue342 왕복 검증 중에 드러난 것. **왕복 문제가 아니라 산출물 불일치**다 — 같은 원고가 HTML 덱과 pptx 에서 다른 모양으로 렌더된다
* depends: Issue342
* 상세:
    - **중첩 깊이**: m2slide 파서는 2칸을 1레벨로 읽고([md-m2slide-rules](.claude/rules/md-m2slide-rules.md) "카드 본문 2칸 기준"), pandoc 은 CommonMark(부모 마커 + 공백) 기준이다. `    - 레벨 2`(4칸)를 m2slide 는 레벨 2 로, pandoc 은 레벨 1 로 읽는다
    - **비표준 불릿 표기**: `  -HTML DIV 태그를 사용하여` 처럼 **하이픈 뒤 공백이 없는** 줄을 m2slide 는 산문으로, pandoc 은 앞 리스트 항목의 연속으로 읽는다 (m2Slide_chapter_mode `05-layout-examples.md` 에 실재)
    - 실측(2026-09-10): `./z_test/ig-ppt/6.roundtrip.sh m2Slide_chapter_mode` — `bullet_nesting` −2/+2 · `bullets` −3/+3
* 구현 명세:
    - 고칠 곳이 **변환기인지 원고인지 먼저 가른다**. 비표준 표기는 원고 쪽이 맞고, 중첩 깊이는 두 파서 중 어느 쪽을 정본으로 볼지 결정이 필요하다
    - ⚠️ 원고 수정은 사용자 콘텐츠라 임의로 하지 않는다 — 확인 후 진행
    - 결정 후 `data/m2slide2ppt/fidelity.yml` 의 `bullet_nesting`·`paragraph` 등급을 재조정
* 결과: m2slide → pptx 변환 정책(transform.yml·fidelity.yml)을 실측으로 갱신해 aTest 왕복이 계약대로 전건 통과(원고 16종·시각 must_match 11·전수 대조 0). 사용자 판정 2026-09-11 "완벽하지는 않으나 대체적으로 맞음" 으로 종결. **이월**: 중첩 깊이·비표준 불릿의 정본 결정(m2Slide_chapter_mode +5장·글자 25종)과 무제 이미지 장 배치는 원고 수정 여부 결정이 필요해 [Issue358](#issue358) 미세 조정에서 같은 방식(실측 → 정책 → 러너)으로 이어 간다

## Issue357: `htmlart process` 가 pptx 에서 SmartArt 가 아니었다 — lane G 신설 (등록: 2026-09-11, 해결: 2026-09-11, commit: `4e904c4`, `a0621e9`) ✅
* 목적: 사용자 지적 — htmlArt 는 애초에 PowerPoint SmartArt 를 본뜬 것인데 pptx 는 ppt-info 도형 근사(lane B `cards`+`flow_arrow`)로 나와 HTML 과 꼴이 다르고 SmartArt 로 편집도 안 됐다
* depends: Issue355
* 상세:
    - 정본 대응은 **SmartArt 그 자체**(역방향 [mappings.yml](data/ppt2m2slide/mappings.yml) "Basic Process" → process 와 대칭). 파트 5종(data·layout·quickStyle·colors·drawing)을 직접 만든다 — python-pptx 에 다이어그램 API 가 없어 `pptx.opc` 로 파트·관계를 맺는다
    - 레이아웃·색·스타일 정의는 PowerPoint 앱 자원(`SmartArt.framework/Resources` lo/cs/qs — `process1.glo`·`accent1_1.gcs`·`simple1.gqs`, 평문 XML)에서 읽는다. 자원이 없는 기계는 lane G 가 사이드카를 `lane: b` 로 되돌려 lane B 가 이어받는다(그래서 lane B **앞**에 돈다)
    - 캐시(`dsp:drawing`)는 HTML `renderProcess` 실측 기하로 그린다(viewBox 196/230/52/28 · 강조색 테두리 2 · 모서리 14 · 제목 `titleFsFor` 체인 최솟값 · 하위 ×0.66 · 삼각 화살표 검정 45%) → 열자마자 HTML 과 같은 꼴, 편집하면 SmartArt 규칙(Basic Process 재배치)
    - ⚠️ **`diagramDrawing` 관계는 슬라이드 rels** 에 있어야 한다(`dsp:dataModelExt@relId` = 슬라이드 rId). data 파트에 걸었더니 LibreOffice 가 빈 그룹으로 들여왔다 — 이식 실험(PowerPoint 저장본 파트를 우리 장에 통째로)으로 좁혀 잡았다. LibreOffice 는 캐시만 그리고 자기 레이아웃은 하지 않는다. 기록: [debug_TECH.md](_doc_work/debug_TECH.md)
    - 역변환은 `dgm:dataModel` 의 parOf 로 항목·하위·순서를 그대로 되찾고 종류는 lane S 신호 → 레이아웃 id 순. 전수 대조는 데이터 모델 글자를 센다. 계약 `htmlart_smartart: lossless` 신설
    - 이월: timeline·chevron·step·funnel 등은 lane B 그대로 — 레이아웃별 캐시 기하 실측이 필요해 `smartart.catalog` 에 더할 때 별도 이슈
* 구현 명세: [smartart.py](lib/pptx/smartart.py)(신설) · [lane-g.py](lib/pptx/lane-g.py)(신설) · [build-source.py](lib/pptx/build-source.py) ⑫ `lane: g` · [build-pptx.sh](lib/pptx/build-pptx.sh) ③-b2 · [transform.yml](data/m2slide2ppt/transform.yml) `smartart` · [fidelity.yml](data/m2slide2ppt/fidelity.yml) · [pptx2source.py](lib/pptx/pptx2source.py)·[check-parity.py](lib/pptx/check-parity.py)·[check-roundtrip.py](lib/pptx/check-roundtrip.py) · [CLAUDE.md](CLAUDE.md) "lane G" 절
* 결과: aTest p7 LibreOffice 렌더가 HTML 과 일치 · 왕복 원고 동일(`htmlart_smartart 1/1 lossless`) · 시각·전수 대조 전건 · 4.laneb 6/6 · conform WARN 0. ⚠️ PowerPoint 실물 확인은 사용자 몫 — 구조는 PowerPoint 저장본(pres 포인트·캐시·슬라이드 rels)과 같게 맞췄다

## Issue356: HTML `htmlart pie` 가 균등 분할됐다 — 정규식 이중 이스케이프 (등록: 2026-09-11, 해결: 2026-09-11, commit: `8ad540c`) ✅
* 목적: `::: htmlart pie` 의 `모바일 45%` 가 HTML 에서 25% 로 그려졌다(ego-browser 실측) — pptx 대조 중 HTML 쪽에서 발견
* depends: Issue353
* 상세:
    - [htmlart_dispatch.client.js](lib/component-hooks/htmlart_dispatch.client.js) 정규식 3줄(996·1080·1152)의 `\\s` 가 문자열 안에서 `\s` 가 아니라 리터럴 `\\s` 가 되어 값 토큰(`N%`)이 안 잡혔다 → 전 항목 `value=null` → 균등 분할
* 구현 명세: 3줄을 `\s` 로 교정. pie 외 balance 등 같은 패턴을 쓰는 렌더러도 같은 줄에서 고쳤다
* 결과: 45/30/15/10 정상 · 범례 `모바일 (45%)` · pptx 네이티브 차트와 값 일치

## Issue355: 글+표/그림 장(`Content with Caption`)의 배치가 HTML 과 달랐다 (등록: 2026-09-11, 해결: 2026-09-11, commit: `fd7567e`, `8ad540c`) ✅
* 목적: pandoc 은 글을 좁은 좌측에·표/그림을 우측에·alt 를 캡션으로 낸다. HTML 은 **리스트+이미지만** 2분할이고 문단+표는 위아래(표 내용 폭·가운데·회색 머리행), 캡션은 없다(alt 는 `img[alt]` 로만)
* depends: Issue354
* 상세:
    - HTML 실측(ego-browser 1920×1280): `.m2-cols` 868/868 gap 72 · 표 th/td 45.4px pad 16/40 · th bg rgba(0,0,0,.06) · td 밑선 1px rgba(0,0,0,.2) · 문단 아래 40px
    - 2분할은 **리스트+이미지** 일 때만(pandoc 은 평문 문단에만 `<a:buNone/>` 을 적어 구분된다). 문단+이미지·무제 이미지 장은 pandoc 자리 그대로 둔다 — HTML 배치가 다른 규칙(세로 흐름·`_blank`)이라 근사하지 않는다(Issue343 이월)
    - 캡션은 항상 그림 `descr`(alt-text)로 옮기고 상자를 없앤다. 역변환은 `descr` 를 alt 로 되돌리고, 전수 대조는 `descr` 를 `img[alt]` 와 짝짓는다
    - 표는 pandoc 표 스타일(`tableStyleId`·firstRow·bandRow)을 끄고 셀 여백·글자·머리행 채움·밑선을 직접 적는다. 열 폭은 모노스페이스 폭 어림(한글 1em·그 외 0.5em)+패딩
    - 제목이 없는 장도 해당한다 — 처음엔 제목 유무 분기 안에 호출을 두어 m2Slide_chapter_mode p18·p19·p22 가 빠졌다
* 구현 명세: [transform.yml](data/m2slide2ppt/transform.yml) `split_geometry`·`table_geometry` · [lane-t.py](lib/pptx/lane-t.py) `relayout_caption`/`has_bullets` · [pptx2source.py](lib/pptx/pptx2source.py) alt ← `descr` · [check-parity.py](lib/pptx/check-parity.py) · [check-visual.py](lib/pptx/check-visual.py) 시각 축 `caption_layout`(must_match) · [fidelity.yml](data/m2slide2ppt/fidelity.yml)
* 결과: aTest p5(표)·p6(그림) LibreOffice 렌더가 HTML 과 일치 · m2Slide_chapter_mode `Content with Caption` 7장 위반 0

## Issue354: 제목 서체가 안 먹었다 — 마스터 placeholder 리터럴 + 한글 ea + OS family (등록: 2026-09-11, 해결: 2026-09-11, commit: `fd7567e`, `8ad540c`) ✅
* 목적: Issue350 이 `majorFont` 를 바꿨는데도 PowerPoint·LibreOffice 에서 제목이 `NanumGothicCoding` 이었다 — 사용자 "폰트 안 맞음(모든 페이지)"
* depends: Issue350
* 상세 (겹이 셋이다):
    - ① `theme2reference`·`retheme --font-only` 가 마스터/레이아웃 **제목 placeholder lstStyle 에 서체를 리터럴로** 적어 `+mj-lt` 참조가 끊겨 있었다 → `set_major_font` 가 `+mj-lt/+mj-ea/+mj-cs` 로 되돌리고 `defRPr b` 를 정책대로 맞춘다
    - ② 한글 제목은 latin 이 아니라 **ea·`script="Hang"`** 서체로 그려진다 → majorFont 의 latin·ea·cs·script 전부를 같은 이름으로 (HTML 도 한글 제목에 GmarketSansBold 하나를 쓴다)
    - ③ OS family — name 테이블 ID1 `Gmarket Sans Bold` 로 갔다가 되돌렸다(라틴만 맞고 한글 ea 매칭이 깨짐). PowerPoint 서체 캐시(`FontCache/systemfontmetadata.json` fa)와 LibreOffice A/B 렌더 모두 **`Gmarket Sans` + b=1** (face 가 Light/Medium/Bold 뿐이라 family + bold 가 Bold face)
    - ④ [pptxutil.py](lib/pptx/pptxutil.py) 신설 — PowerPoint 저장본이 OMML 본문을 `mc:AlternateContent` 로 감싸 `slide.shapes` 가 못 보던 것을 `iter_shapes` 로 순회. 첫 판의 `id(child)` 중복 제거가 lxml 프록시 id 재사용으로 **도형을 건너뛰어** 러너가 가로선 17→12 오탐을 냈다(제거)
    - 표지 제목 155px(computed) · 표지/Agenda 제목 `noAutofit`(상자 높이 = 글자 높이라 뷰어 재계산 시 줄어든다) · 강사 박스 2px FFD700 radius 6
    - check-visual `title_font` 가 majorFont latin·ea/Hang·마스터 placeholder 리터럴 셋을 다 본다 — 이 부류를 초록불로 통과시키던 구멍. `css_body_font` 의 `mono|coding` 제외 휴리스틱도 제거(default_lec 본문이 'Nanum Gothic Coding')
    - 진단 기록: [debug_TECH.md](_doc_work/debug_TECH.md) "2026-09-11 m2slide→pptx 제목 서체·도형 순회 오진"
* 구현 명세: [transform.yml](data/m2slide2ppt/transform.yml) `font`·`cover_geometry` · [lane-t.py](lib/pptx/lane-t.py) `set_major_font(bold=)`·`add_outline(radius)` · [pptxutil.py](lib/pptx/pptxutil.py) · [check-visual.py](lib/pptx/check-visual.py)
* 결과: 전 9장 제목 Gmarket Sans Bold(LibreOffice v8 렌더, 한글 포함) · 시각 축 must_match 전건 · 전수 대조 모자란 것 0

## Issue353: `htmlart pie` 가 pptx 에 없었다 — 네이티브 파이 차트 + 도형 범례 (등록: 2026-09-11, 해결: 2026-09-11, commit: `fd7567e`, `8ad540c`) ✅
* 목적: lane B 카탈로그 밖(pie)은 lane C(ig-maker) 소관이라 pptx 에 평문 불릿만 남았다 — 사용자 "파이 그래프 안 들어감"
* depends: Issue352
* 상세:
    - "근사하지 않는다" 원칙의 예외 — **차트는 pptx 가 자기 어휘로 가진 것**이라 근사가 아니다. python-pptx `add_chart(PIE)` + plotArea `manualLayout` 으로 HTML 실측 자리(중심 675,715 · r 407)
    - 범례는 차트 내장이 아니라 **도형**(색 칩 roundRect + `이름 (N%)` + 서브라벨) — 내장 범례의 manualLayout 은 뷰어마다 다르게 풀리고(LibreOffice 는 한 줄로 눕힌다) 라벨 꼴·서브라벨을 못 담는다. 전부 `m2slide:content/pie-*` 표식
    - HTML 범례 글자는 svg viewBox(964×600) 안 foreignObject 라 **viewBox 단위** — 캔버스 축척 1.565 를 곱해 label 31.3 · sub 23.5 · pct 37.6px. 첫 판(20/15/24)이 그대로 pt 로 가서 작았다
    - 역변환: 차트 범주 → `* 모바일 45%` · `pie-sub` 표식 → `  - iOS·Android`. 전수 대조는 범례 글자를 범주의 파생물로 걷어내고, 카드 판정에서 색 칩을 뺀다
* 구현 명세: [transform.yml](data/m2slide2ppt/transform.yml) `native_charts`·`pie_geometry` · [fidelity.yml](data/m2slide2ppt/fidelity.yml) `htmlart_lane_c: lossless` · [lane-t.py](lib/pptx/lane-t.py) `render_pie` · [pptx2source.py](lib/pptx/pptx2source.py) · [check-parity.py](lib/pptx/check-parity.py)
* 결과: aTest p8 — 45/30/15/10 · 범례·서브라벨 HTML 과 일치 · 왕복 원고 동일(`htmlart_lane_c 1/1 lossless`)

## Issue352: 코드 블록이 pptx 에서 HTML `pre` 꼴이 아니었다 + placeholder 높이 0 (등록: 2026-09-11, 해결: 2026-09-11, commit: `fd7567e`, `8ad540c`) ✅
* 목적: 사용자 실측(PowerPoint) — 코드가 상자 없이 본문 글자로 눕고 크기·색이 달랐다
* depends: Issue351
* 상세:
    - HTML `pre` 실측(ego-browser 1920×1280): 56,245,1808×155 · pad 27/34 · fs 38.6px(첫 판 34 는 오측) · lh 49.3 · bg F6F8FA · radius 6 · 키워드 D73A49 · 아래 요소까지 60
    - lane T `restyle_code` 가 placeholder 를 상자 안으로 옮길 때 `top` 만 써서 python-pptx 가 ext 0×0 xfrm 을 만들어 **높이 0** → 뷰어 `normAutofit` 이 글자를 점처럼 줄였다(LibreOffice 렌더 5px). 높이 부여 + `noAutofit`
    - 코드 상자는 `m2slide:ornament/codebox` 표식 → 역변환·전수 대조가 걸러낸다. build-pptx ③-b 강조색 교정은 코드 문단(`buNone`+latin)을 건너뛴다
* 구현 명세: [transform.yml](data/m2slide2ppt/transform.yml) `code_geometry` · [lane-t.py](lib/pptx/lane-t.py) `restyle_code`/`is_code_para` · [build-pptx.sh](lib/pptx/build-pptx.sh) ③-b
* 결과: aTest p4 — LibreOffice 렌더가 HTML 과 일치(Menlo 19.3pt · 키워드 색 · 상자 · 수식은 상자 아래)

## Issue350: pptx 서체가 HTML 과 달랐다 — Windows 폰트를 고르고 있었다 (등록: 2026-09-11, 해결: 2026-09-11, commit: `417bd04`, `f09a28b`) ✅
* 목적: 글로벌 `theme-from-css.py` 가 CSS 체인에서 `Malgun Gothic`(Windows)을 골라 macOS 에서 대체 렌더됐다. 같은 파일이 기계마다 다르게 보인다
* depends: Issue349
* 상세:
    - HTML 실측(ego-browser) — 제목 `GmarketSansBold` · 본문 `Nanum Gothic Coding`. 둘 다 이 기계에 설치돼 있다
    - theme.yml 에는 서체가 **하나뿐**이라 `theme2reference` 가 major/minor 를 같은 값으로 넣는다
    - ⚠️ **두 번 되돌려졌다** — ① `set_major_font` 를 `prs.save()` **앞**에 부르면 메모리 내용이 덮어쓴다 ② `retheme.py --font-only`(③-c)가 theme.yml 서체로 pptx 전체를 덮는다. 그래서 최종 교정은 **retheme 뒤 단계**(lane T ornament)에서 한다
* 구현 명세: [`transform.yml`](data/m2slide2ppt/transform.yml) `font:` 가 실측 서체를 소유 · build-pptx ①-c 가 본문 서체를, lane T 가 제목 서체(`majorFont`)를 적용
* 결과: major `GmarketSansBold` · minor `Nanum Gothic Coding` — HTML 실측과 일치

## Issue351: Agenda 장이 pptx 에 없었다 + 목차 레이아웃 미적용 (등록: 2026-09-11, 해결: 2026-09-11, commit: `417bd04`, `f09a28b`) ✅
* 목적: HTML 은 `agenda.html` 을 **별도 페이지로 항상** 내는데 pptx 에는 그 장이 없었다
* depends: Issue350
* 상세:
    - agenda.html 내용은 **JS(markmap)가 그린다** — 정적 HTML 에 글자가 없어 전수 대조가 볼 수 없다. 그래서 계약에 `synthesized` + `slides: 1` 로 선언하고 대조기가 그만큼 허용한다
    - HTML `layout-_agenda` 는 reveal 덱이 아니라 별도 프레임(`.agenda-frame` 896×597)이라 **프레임 기준 좌표를 캔버스 1920 으로 환산**했다
* 구현 명세: build-source ⑮ 가 표지 다음에 Agenda 장을 만든다(제목 고정 `Agenda`) · lane T 가 노란 테두리 박스·고양이 마스코트·좌측 제목을 입힌다 · 역변환이 그 장을 걸러낸다(원고에 없으므로)
* 결과: aTest 9장(HTML 8 + agenda 1) · 왕복·시각·전수 대조 전부 통과 · lane B 6/6 · lane M · lint-data 통과

## Issue348: 장 구성이 HTML 과 pptx 에서 갈렸다 — 읽는 설정이 달랐다 (등록: 2026-09-10, 해결: 2026-09-10) ✅
* 목적: 같은 원고가 HTML 8장 · pptx 10장으로 나왔다. 세 검사가 모두 통과하는데도 그랬다
* depends: Issue347
* 상세:
    - **읽는 설정 집합이 다르다** — HTML([`config.js`](lib/config.js))은 `cards_placeholder`·`toc_placeholder` 를 읽는데 [`build-source.py`](lib/pptx/build-source.py) 는 `cover_enabled` **하나만** 읽었다. 그래서 `cards_placeholder: false`(H1 슬라이드 제거)를 pptx 가 무시하고 H1 진입 장 + 자동 목차 장을 만들었다
    - **계약이 원고만 봤다** — `h1_chapter: lossless` 는 원고 기준이고 산출물 기준이 아니었다. 원고 축과 시각 축이 다른 정본을 보던 자리
    - **`agenda_chapters` 가 늘 0건이었다** — `## [제목]` 만 찾는데 실제 AGENDA 는 `# [제목]`(H1). m2Slide_chapter_mode 7챕터를 한 번도 인식하지 못했다(기존 결함)
    - **전수 대조가 장 수를 실패로 세지 않았다** — 출력만 했다
* 구현 명세: build-source 가 두 설정을 읽는다 · chapter mode 판정은 `markdown/` 디렉토리로(AGENDA 파싱 결과에 기대지 않는다) · `agenda_chapters` 가 H1 도 받는다 · check-parity 가 장 수 불일치를 실패로 든다
* 결과: aTest HTML 8 = pptx 8. m2Slide_chapter_mode 는 HTML 31 · pptx 35 로 **+4 남음**(원인 미확인 — pandoc 이 장을 더 나누는 축으로 보이나 확인하지 않았다)

## Issue349: pptx 카드가 m2slide 카드와 다른 디자인이었다 (등록: 2026-09-10, 해결: 2026-09-10) ✅
* 목적: lane B 가 글로벌 ppt-info 의 `cards`(좌측 액센트 바 + 회색 본문)를 쓰는데 m2slide 카드는 **상단 노란 제목 밴드 + 본문**이다. 세로 위치도 달랐다(lane B 중앙 · HTML 상단)
* depends: Issue348
* 상세:
    - 실측(ego-browser) — HTML 카드 `l 56 · t 253 · w 593 · h 237` · 밴드 `h 130 · bg #F5C518` · 본문 `fs 40`. pptx 는 `t 595` · 전체 `F2F5FA` + 좌측 10px 액센트 바(3색 순환)
    - 전수 대조가 **글자만** 보므로 이 차이를 못 잡았다
* 구현 명세: [`lane-t.py`](lib/pptx/lane-t.py) `redraw_cards` 가 lane B 도형에서 글자를 회수해 m2slide 카드로 다시 그린다. **커넥터가 있으면 손대지 않는다**(순차 블록은 별도 판단)
* 결과: aTest 카드 3개 재작성 · lane B 회귀 6/6(단언 ③ 을 테마 장식 제외로 갱신) · 왕복·시각·전수 대조 전부 통과

## Issue345: pptx 에 m2slide 테마의 **꼴** 이식 — lane T (등록: 2026-09-10, 해결: 2026-09-10) ✅
* 목적: Issue344 가 색·판형을 맞췄지만 pptx 를 PowerPoint 로 열면 여전히 민 흰 바탕이었다. *"뭐가 같냐"* 는 지적의 실체가 여기 있었다
* depends: Issue344
* 상세:
    - **placeholder 가 슬라이드 폭을 안 채운다** — `theme2reference --adapt` 는 슬라이드 **크기만** theme.yml canvas 로 키우고 placeholder 좌표는 pandoc 기본(10×7.5in)으로 둔다. 13.33in 판에 9.5in 상자가 앉아 **우측 3.8in 가 빈 채로** 배포됐다. 눈에 가장 크게 띄는 차이였다
    - **테마 장식이 없다** — m2slide 는 상·하단 노랑 가로선과 제목 밑줄(`hr.png`)로 판을 짜는데 pptx 에는 그 어휘가 없었다
* 구현 명세:
    - [`lane-t.py`](lib/pptx/lane-t.py) 신설 — `--mode layout`(reference placeholder 재배치) · `--mode ornament`(최종 pptx 에 가로선·밑줄). python-pptx 가 마스터에 그림을 넣지 못해 두 걸음이다
    - 좌표는 **HTML 덱을 실제로 렌더해 잰 값** — CSS 선언만으로는 flex 최종 위치가 정해지지 않는다. [`transform.yml`](data/m2slide2ppt/transform.yml) `theme_geometry` 가 소유하고 이식·검증이 **같은 값**을 읽는다
    - `hr.png` 는 손으로 그은 붓 자국이라 **도형으로 근사하지 않고** 이미지를 그대로 넣는다
    - 시각 계약에 `content_box`·`theme_rule`·`title_underline` 3축 추가 (must_match)
* 결과:
    - aTest·m2Slide_chapter_mode 둘 다 시각 축 `must_match` 7/7 일치. 판·가로선·밑줄이 HTML 실측과 정확히 같다
    - 장식 그림에 `m2slide:ornament` alt-text 표식 — 없으면 왕복이 본문 이미지로 읽는다(실측: 10장에 21개 오염 → 표식 후 1=1)
    - 남은 `known_gap` 2종 — 본문 서체(Windows 폰트 선택)·**세부 꼴**(카드 밴드 모서리·자간·줄간). 세부까지는 CSS→pptx 번역기가 필요하다
* 미해결 🚧:
    - `theme_geometry` 는 `default` theme 기준 실측이다. **다른 theme 을 쓰면 다시 재야 한다** — 자동 측정 경로가 없다

## Issue344: pptx 판형·테마 색이 HTML 덱과 달랐다 — 시각 축 계약 신설 (등록: 2026-09-10, 해결: 2026-09-10) ✅
* 목적: Issue342 가 만든 왕복 계약은 **원고 축만** 잰다. 그 사이 `slide_ratio: "3:2"` 인 덱이 16:9 pptx 로 나가는 동안 왕복 검사는 초록불이었다 — Issue342 가 지적한 것("규격만 재고 충실을 안 잰다")과 **같은 종류의 사각지대**를 새로 만든 셈이다
* depends: Issue342
* 상세:
    - **판형 불일치**: 글로벌 [`theme-from-css.py`](file:///Users/nowage/.claude/skills/ppt-spec/scripts/theme-from-css.py) 의 `CANVAS` 에는 `16:9`·`4:3`·`a4` 뿐이라 m2slide 의 `3:2` 를 표현할 어휘가 없고, [`build-pptx.sh`](lib/pptx/build-pptx.sh) 는 `--canvas` 를 넘기지도 않아 **언제나 16:9 로 굳었다** (실측 aTest·m2Slide_chapter_mode 둘 다)
    - **먹색 불일치**: 제목 run 은 색을 직접 갖지 않고 테마 `dk1` 을 상속하는데, 그 값이 `#1A1A1A` 였다. CSS 정본은 `--kn-text: #111111` (ΔE 15.6). 기존 ②-b 교정은 placeholder 에 `srgbClr` 이 **직기입된** 경우만 고치므로 테마 상속을 못 잡았다
* 구현 명세:
    - [`build-pptx.sh`](lib/pptx/build-pptx.sh) ①-c — 산출된 `theme.yml` 의 canvas 높이와 `palette.ink` 를 CSS 실측으로 덮는다. **글로벌 스킬은 건드리지 않았다**
    - [`fidelity.yml`](data/m2slide2ppt/fidelity.yml) `visual:` 절 신설 — 판형·강조색·배경·제목색(`must_match`) · 서체·레이아웃 꼴(`known_gap`)
    - [`check-visual.py`](lib/pptx/check-visual.py) 신설 + 러너 ⑤ 로 편입
* 결과:
    - aTest·m2Slide_chapter_mode 둘 다 `must_match` 전건 일치. 원고 왕복은 무영향(33=33 유지)
    - 남은 `known_gap` 2종 — 본문 서체(pptx 가 CSS 체인에서 Windows 폰트 `Malgun Gothic` 을 고른다)·레이아웃 꼴(글로벌 스킬이 색·서체만 옮기도록 설계돼 있다)
* 미해결 🚧:
    - 근본 원인인 **글로벌 `theme-from-css.py` 에 `3:2` 부재**는 그대로다. 로컬에서 덮고 있을 뿐이라 다른 프로젝트가 같은 함정을 밟는다 — `~/.claude/Issue.md` 이슈 등록 대상(타 repo 수정이라 사용자 승인 필요)
    - 레이아웃 꼴 이식은 pptx 레이아웃 마스터를 m2slide theme 에서 생성하는 별도 규모의 일

## Issue342: m2slide → pptx 에 변환 정책이 없다 — round-trip 계약 신설 + agent 화 (등록: 2026-09-09, 해결: 2026-09-10, commit: 3835de0, bb837c5) ✅
* 목적: 역방향(`pptx → m2slide`)은 [`data/ppt2m2slide/`](data/ppt2m2slide/) 3종 yml 로 데이터-주도인데, **정방향(`m2slide → pptx`)은 정책이 전부 코드 상수·정규식에 박혀 있다**. 그래서 *"이 변환에서 무엇이 어떻게 손실되는가"* 를 선언할 자리도, 검증할 장치도, 학습할 경로도 없다. 이 비대칭이 pptx 산출 품질 회귀가 조용히 통과하는 근본 원인이다
* 상세:
    - 정책이 코드에 박힌 지점 — [`build-source.py`](lib/pptx/build-source.py): `FENCE_DROP`·`FENCE_DROP_LABEL`(컴포넌트 드롭 카탈로그) · `ID_LINE`·`ANIM_LINE`·`SLOT_RIGHT`(디렉티브 제거) · `ATTR`·`SYMBOL`·`ELEMENT_COMMENT`(인라인 제거) · `LANE_B_CATALOG`(도형 렌더 대상) · `normalize_chapter`(챕터 TOC **자동 생성**) · `defer_heavy`(표·그림 순서 변경)
    - 현행 검증 3종(`check-conform`·`check-xml-order`·`check-empty`)은 **pptx 내부 규격**만 잰다. *"원고가 pptx 에 제대로 옮겨졌는가"* 는 아무도 재지 않는다
    - 실측(aTest 10장 픽스처, 2026-09-09): 빌드 rc0 · FAIL 0 · WARN 0 인데도 frontmatter 전량 · `#id-*`·`#transition-*` 디렉티브 · `{.fragment}` · `::: htmlart pie`(lane C 이월) · ` ```chart ` 컴포넌트가 소실되고, 원본에 **없던** 챕터 TOC 장이 생성됨
* 구현 명세:
    - 신설 `data/m2slide2ppt/` (kind: policy/stage) — 요소별 pptx 표현과 **복원 등급**(lossless·lossy·declared-drop)을 선언하는 round-trip 충실도 계약
    - 신설 round-trip 검증 — 원본 md ↔ 역변환 md 를 대조해 **계약에 선언되지 않은 손실**만 FAIL 로 든다. 선언된 손실은 통과(그것이 계약의 목적)
    - 변환 기능을 agent 방식으로 전환 — 코드 상수를 정책 yml 로 외부화하고 판정을 agent 가 소유
    - 수렴 판정: `aTest → pptx → aTest_rt` 왕복에서 **undeclared diff 0** 이 될 때까지 정책 갱신 반복
* 결과:
    - 계약 요소 32종 — lossless 15 · lossy 9 · declared_drop 6 · synthesized 2
    - **aTest 왕복 수렴**: 슬라이드 8=8 · 불릿 21=21 · frontmatter 11 필드 · `#id-*` 7건 ·
      `#transition-zoom` · `::: htmlart pie` · `{.fragment}` · 코드 언어 전부 복원.
      남은 손실은 컴포넌트 config 1건(lane A 진입 전 삭제되어 원리적으로 복원 불가)
    - lane S 신설 — 도형 alt-text + `docProps/custom.xml` 에 복원 신호. 둘 다 pptx
      표준 필드라 화면에 안 보이고 PowerPoint 편집·재저장에 살아남는다
    - m2Slide_chapter_mode 일반화 검증에서 계약 밖 차이 5건 → 1건. 남은 1건은
      **원고의 비표준 표기**가 원인이라 Issue343 으로 분리(원고는 건드리지 않았다)
    - 회귀 4.laneb 6/6 · 5.lanem 통과 · lint-data 통과


## Issue341: policy 미해결 3종 처리 — 승격 심사·축 2 소비·리스트 치환 (등록: 2026-09-09, 해결: 2026-09-09) ✅
* 목적: Issue340 이 남긴 미해결 셋을 닫는다. 셋 다 **장치는 있는데 작동하지 않는** 상태다 — 승격은 사람이 기억해야 일어나고, 덱 목적(축 2)은 소비하는 룰이 0건이며, 가장 위험한 병합 함정에는 검사가 없다
* depends: Issue340

### Issue341_1: 커밋 시 승격 심사 환기
* 상세:
    - 승격 4단계(관측 → `aggregate-feedback.py` → `_proposals/promotion-*.md` → 사람 판단)의 **3번이 사람 기억에 의존**한다. 실측: `pending` 3건이 이 세션의 커밋 4회 동안 한 번도 환기되지 않았다
    - 그중 `promotion-1779899438-text_diff.md` 는 `count 7 · threshold 3` 으로 [`_suggest_confidence()`](lib/tuner/promote-to-data.py) 기준 **`medium` 제안 대상**이다. 즉 심사받아야 할 후보가 실제로 대기 중인데 아무도 모른다
* 구현 명세:
    - [check-policy-commit.sh](lib/hooks/check-policy-commit.sh) 와 같은 자리(pre-commit)에서 `data/_proposals/promotion-*.md` 의 `status: pending` 을 세어 **심사 대상만** 알린다
    - 심사 대상 판정은 `_suggest_confidence()` 와 **같은 규칙**을 쓴다(`count >= max(threshold, 2)` → medium). 규칙을 두 벌 두면 갈라진다 — 파이썬 헬퍼를 훅이 호출하는 형태
    - ⚠️ **자동 승격 금지.** 승격이 사람 승인인 것은 설계의 핵심이다(프로젝트 하나의 사정이 전 프로젝트 기본값을 조용히 바꾸면 안 된다). 훅은 **차단도 하지 않는다** — 알리기만 한다
    - `count <= 1` 인 low 후보는 소음이므로 요약 한 줄로만 센다

### Issue341_2: 축 2(덱 목적)를 실제로 소비하는 첫 룰
* 상세:
    - ⚠️ **원인 정정**: 앞선 보고에서 *"Info.md 15개 purpose 미기재라 완화 경로가 비어 있다"* 고 적었으나 실측 결과 **`applies_to_purpose`·`relax_when` 을 쓰는 룰이 0건**이다. purpose 를 15개 다 채워도 **완화 효과는 0**이다 — 미기재는 증상이 아니라 무해한 상태(미기재 = `lecture` 간주 = 현행 동작 = 회귀 0)
    - 진짜 공백은 **축 2를 소비하는 룰이 하나도 없다**는 것이다. lint 는 그 필드의 유효성을 검사할 준비만 돼 있다(검사 10·11)
* 구현 명세:
    - 근거 있는 첫 소비처 하나만 붙인다 — [policy-goal-schema.md](_doc_arch/policy-goal-schema.md) 가 `promo` 를 *"광고·홍보, 비주얼 우선 · 완화(통짜 비주얼 허용)"* 로 정의하고, `drop_redundant_page_screenshot`(통짜 페이지 래스터 제거)이 정확히 그 반대편 규칙이다. 홍보 덱에서는 통짜 비주얼이 **정당한 선택**이므로 이 룰에 `applies_to_purpose` 를 단다
    - ⚠️ **`purpose` 값을 덱에 임의로 채우지 않는다.** 어느 덱이 홍보용인지는 콘텐츠 판단이라 사용자 확인 사항이다([identifier-meta-rules](.claude/rules/identifier-meta-rules.md) 와 같은 취지). 룰 쪽 배선만 먼저 하고, 실제 `purpose: promo` 기재는 사용자가 지목한 덱에만 넣는다
    - `--lint-data` 검사 10 이 이 필드를 이미 검사하므로 배선만으로 집행이 붙는다

### Issue341_3: 리스트 치환 함정 lint
* 상세:
    - deep-merge 는 dict 만 재귀하고 **리스트는 L2 값으로 통째 치환**한다(결정성 우선). 그런데 primary yml 의 최상위 컬렉션은 대부분 리스트라, L2 에 신규 항목 1개만 적으면 **L1 의 기존 항목이 전부 사라진다** — *"추가"* 를 의도했는데 결과는 *"대체"* 다(Issue308 파일럿 실측)
    - 현재 방어는 [pipeline-policy-cascade.md](_doc_arch/pipeline-policy-cascade.md) 의 ⚠️ 문단 **하나뿐**이고 검사가 없다. 사람이 그 문단을 읽었는지에 걸려 있다
* 구현 명세:
    - [lint-policy-schema.py](lib/lint-policy-schema.py) `lint_l2_overrides()` 계열에 검사 추가 — L2 가 L1 의 리스트를 **축소**했으면(병합 결과 길이 < L1 길이, 또는 L1 항목이 결과에서 사라졌으면) 보고한다
    - ⚠️ **의도적 축소는 정당하다** — 그래서 FAIL 이 아니라 **경고**다. 다만 *"몰라서 잃은 것"* 과 *"알고 줄인 것"* 을 가르기 위해 사라진 항목을 이름으로 나열한다
    - 판정은 항목 id·name 키가 있으면 그것으로, 없으면 원소 자체로 비교한다
* Checkpoints:
* 결과:
    - **341_1 승격 심사 환기 ✅** — [promote-to-data.py](lib/tuner/promote-to-data.py) 에 `--review` 추가(심사 대상만 출력, rc 1 = 대상 있음). 판정은 `_suggest_confidence()` 를 **그대로 재사용**한다(규칙을 두 벌 두면 갈라진다). [check-promotion-due.sh](lib/hooks/check-promotion-due.sh) 신설 + [install-hooks.sh](lib/hooks/install-hooks.sh) 를 훅 2종 설치로 일반화. **정책 yml 유무와 무관하게 매 커밋 동작**한다(승격은 다른 축)
        - 구현 중 발견: `Proposal` 에 `threshold` property 가 없어 `--review` 가 즉시 죽었다. 누락 시 1 로 두되 `max(threshold, 2)` 계산이 보수적이라 **모르는 값이 승격을 앞당기지 않는다**
        - **실측 동작 확인** — 직후 정책 커밋에서 심사 대상 1건이 실제로 환기됐다
    - **341_2 축 2 첫 소비 ✅** — `drop_redundant_page_screenshot` 에 `applies_to_purpose: [lecture, info, handout]` · `relax_when: [promo, archive]` 부여 (commit `2f05a4e`)
        - ⚠️ **원인 재정정**: 런타임 게이트 `purpose_gates_out()` 는 **이미 구현돼 있었다**(Issue307). 빠진 것은 그것을 쓰는 룰이었다 — 필드를 붙이자 즉시 작동했다(실측: lecture·info·handout=False / promo·archive=True)
        - `purpose` 값을 덱에 임의로 채우지 않았다 — 어느 덱이 홍보용인지는 콘텐츠 판단이라 사용자 확인 사항이다. 미기재 = `lecture` 간주 = 회귀 0
    - **341_3 리스트 치환 lint ✅** — [lint-policy-schema.py](lib/lint-policy-schema.py) 에 `lint_l2_list_shrink()` 신설. L2 가 건드린 리스트만 대조해 **사라진 L1 항목을 이름으로** 나열한다. 의도적 축소가 정당하므로 **경고이지 실패가 아니다**
        - 역검증: 최상위(`tone_presets` 4→0)·중첩(`nested.items` 2 소실) 둘 다 검출. 현 실 프로젝트 위반 0건
* 미해결:
    - 🚧 축 2 를 소비하는 룰이 아직 **1개**다. 나머지 룰은 여전히 전 목적 무차별 적용이며, 확장은 근거가 생길 때마다 개별 판단한다
    - 🚧 `purpose` 기재 자체는 **사용자 판단 대기** — 15개 덱 중 어느 것이 `promo`·`archive` 인지 지목되면 그때 기재한다


## Issue340: data/ 범주 경계 정리 — 허용 목록의 구멍과 L1/L2 용어 충돌 (등록: 2026-09-09, 해결: 2026-09-09) ✅
* 목적: `data/` 아래 파일이 **정책인지 카탈로그인지**, 그리고 **어느 축의 L1/L2 인지**를 판정할 수 있게 한다. 지금은 둘 다 위치로만 추정해야 하고, 그래서 규칙이 현실과 어긋난 채 방치돼 있다
* 상세:
    - **① 허용 목록의 구멍 — `slot-designer` 는 지금 문서상 위반이다.** [data-access-rules](.claude/rules/data-access-rules.md) 는 공유 허용 파일을 **하드코딩 5개**(`component-libraries`·`visual-elements`·`symbol-usage`·`emoji-usage`·`Info.template.md`)로 못박았는데, 실제 `data/` 에는 목록 밖 카탈로그가 **8개** 더 있다:
        - `slot_meta.yml`·`slot_pandoc.yml`·`slot_animation.yml`·`slot_user.yml` — **slot-designer agent 본문이 4종 모두 참조**(실측)
        - `htmlart/types.yml`·`htmlart/smartart-catalog.yml`·`palettes/catalog.yml`·`_meta.yml`·`_meta_lec.yml`
        - 실제로는 정당한 사용이고 **규칙 쪽이 낡았다**. 방치하면 *"어차피 안 맞는 규칙"* 이 되어 진짜 위반도 안 잡힌다
        - 원인은 구조다 — **허용 목록을 사람이 손으로 유지**하므로 카탈로그가 늘 때마다 갱신을 기억해야 하고, 잊으면 조용히 어긋난다
    - **② L1/L2 가 두 축에서 충돌한다.** `data/promo-cartoon/policy.yml` 첫 줄은 자기를 *"(L2, m2slide)"* 라 부르고 글로벌 `~/.claude/data/promo-cartoon/policy.yml` 을 L1 이라 한다. 그런데 [pipeline-policy-cascade.md](_doc_arch/pipeline-policy-cascade.md) 정의표는 `data/<단계>/*.yml` 을 **L1** 으로 못박는다 — **같은 파일이 축에 따라 L1 이자 L2** 다
        - 모순이 아니라 **축이 둘인데 이름이 하나**인 것이다 (축 A: m2slide↔프로젝트 / 축 B: 글로벌 SCAR↔m2slide)
    - **③ cascade 문서의 범위가 현실보다 좁다** — 열거된 "단계" 는 8종인데 `data/` 에는 `ppt2m2slide`·`slide-tuner`·`promo-cartoon` 이 더 있다. 이들이 축 A 밖이라는 명시가 없다
    - ⚠️ 앞선 조사에서 *"헷갈리는 경계"* 로 함께 꼽았던 `_config.yml` vs policy · `rules/*.md` vs policy 는 **이미 정본이 있다**([config-sync-rules](.claude/rules/config-sync-rules.md) · 글로벌 `global-scar-change-detail`). 본 이슈 범위 밖이다
* 구현 명세:
    - **1단계 — 파일이 스스로 범주를 말한다.** `data/` 하위 모든 yml 첫 줄에 `# kind:` 1줄 선언. 이미 전 파일이 첫 줄 자기설명 주석을 갖고 있으므로(실측) **형식을 고정하는 것**이다
        - `policy/stage` — 파이프라인 단계 정책(`data/<stage>/`). 접근은 **자기 단계만**
        - `policy/upstream` — 글로벌 SCAR 정책에 얹는 m2slide 측 값(`promo-cartoon` 류). 그 벤더만
        - `catalog` — 어휘·인벤토리(`slot_*`·`htmlart/`·`palettes/`·`component-libraries` …). **전 단계 허용**
        - 판정 근거가 **위치에서 선언으로** 옮겨가므로 폴더가 늘거나 파일이 옮겨져도 규칙이 안 깨진다
    - **2단계 — 허용 목록을 선언 기반으로 교체.** `data-access-rules` 의 하드코딩 5개 목록을 *"`kind: catalog` 인 파일은 전 단계에서 읽을 수 있다"* 한 줄로 대체 → **구멍 8개 즉시 폐쇄** + 유지보수 부담 제거. `--lint-data` 에 `kind` 부재·오값 검사(검사 6번) 추가로 집행
    - **3단계 — 축 B 에서 `L2` 라는 말을 쓰지 않는다.** `L1/L2` 는 축 A 전용으로 고정하고 축 B 는 `upstream` → `local override`. `data/promo-cartoon/policy.yml` 헤더 1줄 + cascade 문서 "범위" 절에 축 A 전용 명시 + 비단계 폴더 3종 취급 한 줄
    - **하지 않을 것**: `Glossary.md` 에 큰 절 신설 금지 — 21KB 문서에 이 경계가 없다는 사실이 *"거기 써도 안 읽힌다"* 는 증거다(포인터 1행이면 충분). 새 룰 파일 신설 금지 — 고칠 곳은 기존 2개와 각 yml 첫 줄뿐이다. `identity vs policy` 경계는 **혼동 사건이 없어** 조항으로 쓰지 않는다
* Checkpoints:
* 결과:
    - **1단계** — `data/` 하위 yml **26개 전건**에 `# kind:` 첫 줄 선언(`policy/stage` 12 · `catalog` 13 · `policy/upstream` 1). 이미 전 파일이 첫 줄 자기설명을 갖고 있어 형식을 고정하는 작업이었다
    - **2단계** — [data-access-rules](.claude/rules/data-access-rules.md) 의 하드코딩 5개 목록을 *"`kind: catalog` 인 파일은 모든 단계에서 읽을 수 있다"* 로 교체. **구멍 8개 폐쇄** — `slot-designer` 의 문서상 위반 상태가 해소됐다(읽는 `slot_*.yml` 4종이 모두 `catalog` 로 판정)
    - **3단계** — 축 B 에서 `L2` 표기 제거. `data/promo-cartoon/policy.yml` 헤더를 `upstream → local override` 로 고치고, [pipeline-policy-cascade.md](_doc_arch/pipeline-policy-cascade.md) 에 *「이 문서의 L1·L2 는 이 축 전용」* 절 + **비단계 폴더 4종 취급 표** 추가
    - **집행** — [lint-policy-kind.py](lib/lint-policy-kind.py) 신설, `--lint-data` **검사 6번**으로 배선. 선언 누락·오값·위치 불일치(카탈로그 자리에 policy 자칭 = 격리 우회) 3종을 차단. 알려진 실패 3종으로 역검증해 전건 검출 확인
    - `_doc_arch/Glossary.md` 에는 큰 절 대신 **포인터 2행**만 추가 (그 문서에 이 경계가 없었다는 사실 자체가 "거기 써도 안 읽힌다" 는 증거)
    - 검증: `--lint-data` 6/6 통과 · aTest 빌드 무회귀 · 문서 상대경로 링크 4건 유효
* 미해결:
    - 🚧 `data/_meta.yml`·`_meta_lec.yml` 은 **코드 소비처 0건**이고 [Glossary](_doc_arch/Glossary.md) 가 *"구 `_meta.yml` — Issue79부터 폐기"* 라 적고 있다. 폐기 잔재로 보이나 삭제는 별도 판단이라 `kind: catalog` 만 붙여 두었다


## Issue339: m2slide → pptx 조용한 내용 손실 3종 (등록: 2026-09-09, 해결: 2026-09-09, commit: `f4c36eb`) ✅
* 목적: `ppt(pdf) → m2slide → ppt` 왕복에서 **되돌아온 ppt 가 원고보다 적은 것**을 막는다. 지금은 `--pptx` 가 rc0 · FAIL 0 으로 끝나면서 슬라이드 본문이 통째로 비어 나온다 — 실패가 아니라 **성공으로 위장한 손실**이라 배포까지 간다
* 상세:
    - 실측 픽스처: `Projects/aTest`(패턴당 1장으로 축소한 21장 데크). `./m2slide.sh aTest --pptx` → rc0 · FAIL 0 · WARN 1 인데 아래 3종이 사라진다
    - **① 수식이 같은 슬라이드의 본문을 함께 끌고 사라진다 (가장 심각)** — pandoc 3.10 pptx writer 는 Math 인라인을 만나면 그 슬라이드의 콘텐츠 shape 을 **아예 만들지 않는다**. 최소 재현(reference-doc 유무 무관):
        - 코드블록만 → 정상 · 불릿만 → 정상
        - `$$E = mc^2$$` 단독 → 본문 소실 · `$E=mc^2$` 단독 → 본문 소실
        - 불릿 + `$$…$$` → **불릿까지 함께 소실** · 코드블록 + `$$…$$` → **코드까지 함께 소실**
        - `\(…\)` 는 소실은 면하지만 백슬래시만 벗겨진 **리터럴 `(E=mc^2)`** 로 노출
        - aTest p05(코드블록 + 수식) 실측 = 제목 1개만 남은 백지
    - **② 컴포넌트 펜스 드롭이 백지를 남긴다** — [build-source.py](lib/pptx/build-source.py) `FENCE_DROP = {chart, d3, p5, map, model3d, react}` 는 설정·코드 원문 노출을 막는 옳은 판단이지만, **그 자리에 아무것도 놓지 않는다**. aTest p18(chart)·p19(p5) 는 제목만 있는 빈 장으로 배포된다
    - **③ 검증이 이 손실을 보지 못한다** — `check-conform --lane a` 는 본문 0 장을 위반으로 보지 않아 FAIL 0. Issue317 이 세운 차단 게이트가 **가장 흔한 손실 유형에는 열려 있다**
* 구현 명세:
    - **① lane M — 수식을 네이티브 OMML 로 복원**. pandoc 에 Math 를 주지 않는 것이 원인 제거다
        - `build-source.py` 에 ⑬ 단계: `$$…$$` · `$…$` · `\(…\)` 를 코드펜스 밖에서 탐지 → 사이드카 `_pipeline/pptx/lane-m.json` 에 (원고·슬라이드 인덱스·LaTeX·display 여부) 기록 → 원고에는 **마커 문단**으로 치환. 마커는 평문이라 같은 슬라이드의 불릿·코드가 살아남는다
        - 후처리 `lib/pptx/lane-m.py`: 각 LaTeX 를 `pandoc -o x.docx` 로 변환 → `word/document.xml` 의 `<m:oMath>` 를 추출 → pptx 의 마커 문단을 그 OMML 로 교체. **추가 의존 0** (pandoc 은 이미 필수). 실현성 실측 완료 — `$$E = mc^2$$` → `<m:sSup>` 포함 정상 OMML
        - lane B 와 같은 철학: 그림이 아니라 **편집 가능한 네이티브 요소**
        - 배선은 lane B 렌더 **다음**. 실패 시 그 수식만 평문 fallback 으로 남기고 rc0 (lane A 를 깨지 않는다)
    - **② 드롭 자리에 대체 문단** — `FENCE_DROP` 제거 시 그 종류를 밝히는 한 줄을 남긴다. 문구는 구조 표식이며 내용 창작이 아니다(⑨ 목차 라벨과 같은 예외). 캡처 이미지 치환은 후속 후보
    - **③ 본문 0 장 검출** — 제목만 있고 도형·그림·표가 0 인 장을 세어 보고한다. 챕터 진입 장(H1 단독)·표지는 정상이므로 제외한다
    - 회귀 러너: `z_test/ig-ppt/5.lanem.sh` 신설 — 수식 장의 OMML 존재 · 같은 장의 코드·불릿 생존 · 백지 장 0 을 단언
* Checkpoints:
* 결과:
    - **lane M 신설** — [build-source.py](lib/pptx/build-source.py) ⑬ 이 수식을 평문 마커(`⟦m2math:NNNN⟧`)로 치환하고 [lane-m.py](lib/pptx/lane-m.py) 가 산출 뒤 네이티브 OMML 을 심는다. 변환기는 pandoc 자신(`-o docx` → `<m:oMath>`)이라 **추가 의존 0**. `mc:Fallback` 에 평문 LaTeX 를 남겨 수식 미지원 뷰어에서도 글자가 보인다
    - **컴포넌트 드롭 자리에 구조 표식** — `FENCE_DROP` 이 지운 자리에 종류를 밝히는 한 줄. 백지 장을 만들지 않는다
    - **[check-empty.py](lib/pptx/check-empty.py) 신설** — 본문 0 장 보고. 경고이지 차단이 아니다(간지 장·lane C 이월처럼 정당하게 비는 자리가 있다)
    - 회귀 러너 `z_test/ig-ppt/5.lanem.sh` 단언 6종 통과 · 기존 러너 무회귀(4.laneb aTest 6/6 · 3.parity igTest 7/7) · 최종 FAIL 0 · WARN 0
    - 픽스처: `Projects/aTest` 를 **10장**(1.9KB — 원본 42장 14.9KB)으로 축소. `--pptx` 6.9s → **2.7s**. 원본은 `Projects/aTest.bak.20260909` 백업
        - 유지 축: lane A(표·불릿·이미지·코드) · lane B(cards·process) · lane C(pie 이월) · lane M(display + **인라인** 수식) · 컴포넌트 드롭 표식 · 면제 layout 2종(`Title Slide`·`Section Header`)
        - 뺀 것: mermaid(mmdc·Chrome 기동이 첫 빌드 14s 의 주범) · 여분 이미지 3장 · compare · matrix · numbered · p5 · wordart · 컬럼. H1 챕터는 **1개만** — 하나가 2장(Section Header + 챕터 TOC)을 만든다
        - ⚠️ **축소가 러너 버그를 드러냈다** — `5.lanem.sh` ③ 이 `"<m:oMath>"` 정확 일치로 세고 있었다. 인라인 수식은 그 요소가 ns 선언을 이고 나오므로(`<m:oMath xmlns:m="…">`) 조용히 0 으로 세어져 **없는 회귀를 보고했다**. display 만 있던 21장 픽스처에서는 안 걸렸다. 패턴을 `<m:oMath[ >]` 로 고쳤다
    - 진단 기록: `_doc_work/debug_TECH.md` (오진 2건 — 표를 못 읽은 계측 함정 · 검사기 layout 부분일치로 검사 무력화)


## Issue338: 아이덴티티 L2 문서 신설 — 불변 조항 (등록: 2026-09-03, 해결: 2026-09-09) ✅
* 목적: 이 프로젝트가 **무엇이고 무엇이 아닌가**를 판정에 쓸 수 있는 형태로 남긴다. 새 기능을 붙일 때 *"이게 이 제품의 일부인가"* 를 매번 주관으로 다투지 않기 위해서다
* depends: prj1#Issue472
* 상세:
    - [CLAUDE.md](CLAUDE.md) frontmatter 에 **L1 은 이미 기재됨**(prj1#Issue472_3 팬아웃). 본 이슈는 그 위의 **L2 불변 조항 문서**다
    - 한 줄 정체성: 마크다운 → 웹 슬라이드 변환기
    - 형식은 prj1 `fpm-identity.md` → prj6 `architect-identity.md` → prj5 `common-identity.md` 로 **세 번 검증된 것**을 준용한다
* 구현 명세:
    - `_doc_arch/m2slide-identity.md` 신설. 절 구성: 개요(왜 필요해졌나 — 구체 사건) / 무엇인가(한 줄 + 축) / 무엇이 아닌가(표) / 불변 조항(번호 고정) / 현행 준수 실측 / 미해결
    - **조항은 *"지키면 좋은 것"* 이 아니라 *"어기면 그 기능이 이 제품의 일부가 아닌 것"* 으로 쓴다.** 기능 목록을 나열하는 문서가 아니다
    - 이 프로젝트에서 다룰 후보: 원고가 SSOT 이고 슬라이드가 생성물이라는 경계 · 외부 의존 0 원칙
    - 재료: `_doc_base/promotion_0.initial.md`(있으면 포지셔닝·타깃) · 기존 `_doc_arch/` 설계 문서 · 실제로 혼동이 일어났던 이슈
    - ⚠️ 근거 없는 조항을 발명하지 말 것 — **실제로 헷갈렸던 사건**이 있는 것부터 적는다. 없으면 조항 1개로 시작해도 된다
    - 스키마·형식 정본: prj6 [project-identity-scheme.md](~/_git/___architect/_doc_arch/project-identity-scheme.md)
* 결과:
    - `_doc_arch/m2slide-identity.md` 신설 (98줄). 절 구성은 명세대로 — 개요(구체 사건 3건) / 무엇인가 / 무엇이 아닌가(표 5행) / 불변 조항 4개 / 현행 준수 실측 / 미해결 3건
    - **조항은 실제로 헷갈렸던 사건이 있는 것만 썼다** — ① 원고 SSOT(산출물 직접 수정이 룰 예외 조항으로 존재) ② 파일 하나 배포(dev-server 도입이 `file-deployment-rules` 신설을 불렀다) ③ 외부 의존 0(Issue339 lane M 이 새 렌더러 대신 pandoc 재사용을 택한 근거) ④ 파생 형식이 웹을 좁히지 않음(Issue339 에서 컴포넌트를 웹에서 빼지 않고 pptx 에 표식만 남긴 판정)
    - 근거 없는 조항은 쓰지 않고 **미해결로 남겼다** — 저작 파이프라인이 정체성의 일부인지(비대칭) · `ppt2m2slide` 확대 시 "PowerPoint 대체가 아니다" 재판정
    - [CLAUDE.md](CLAUDE.md) 프로젝트 개요 머리에 L2 진입 링크 추가


## Issue333: lane B 카탈로그 확장 — 순차형 htmlart 와 남은 대응 (등록: 2026-08-25, 해결: 2026-09-01, commit: `7d74658`) ✅
* depends: Issue331
* 목적: Issue331 이 깐 lane B 배선 위에서 **카탈로그를 넓힌다.** 지금 4종(`cards`·`numbered`·`process`·`compare`)만 도형으로 그리고 나머지 htmlart 는 전부 lane C 이월이라 평문 불릿으로 남는다.
* 상세:
    - 넓힐 수 있는 것 — `timeline`·`chevron`·`step`·`funnel` 은 **순차형**이라 `process` 매핑(`cards` + `flow_arrow`)을 그대로 늘리면 된다. m2slide 쪽 표만 고치면 되고 글로벌 수정이 필요 없다
    - 넓힐 수 **없는** 것 — `pie`·`matrix`·`venn`·`pyramid`·`hierarchy`·`radial`·`gear`·`target` 은 ppt-info 에 대응 블록이 없다. 블록 신설은 **글로벌 소관**이므로 `~/.claude/Issue.md` 등록 후 별도 세션이다. 여기서 비슷한 블록으로 근사하지 않는다(원본과 다른 도해가 조용히 나간다)
    - 블록 **뒤에 본문이 더 있는 장**도 지금은 이월한다 — 지울 자리가 문단 목록의 끝이 아니게 되고 도형 자리도 정해지지 않는다(실측 8건 전부 블록이 장 끝이라 현재 발생 0건이지만, 카탈로그를 넓히면 부딪힌다)
* 구현 명세:
    - [`build-source.py`](lib/pptx/build-source.py) `LANE_B_CATALOG` 에 순차형 4종 추가 → [`lane-b.py`](lib/pptx/lane-b.py) `build_page` 는 `process` 분기를 그대로 탄다
    - 픽스처는 `Projects/z_done/aTest_v1`(htmlArt 전 타입 보존)에서 필요한 장만 추려 온다
    - 검증: [`4.laneb.sh`](z_test/ig-ppt/4.laneb.sh) 단언 6종 통과 + [`3.parity.sh`](z_test/ig-ppt/3.parity.sh) 7/7 유지
* 결과 (Walkthrough):
    - `LANE_B_CATALOG` 에 순차형 4종(`htmlart timeline`·`chevron`·`step`·`funnel`) → `process` 매핑 추가. **코드 변경은 표 4줄뿐** — 사이드카 `kind` 가 `process` 로 적히므로 `lane-b.py` `build_page` 의 기존 분기(카드 + `flow_arrow` 커넥터)를 무수정으로 탄다. HTML 의 시각 변주(연대축·갈매기·계단·깔때기)는 근사하지 않는다 — 살아남는 것은 순서와 연결이고 그것이 flow_arrow 가 그리는 것
    - 픽스처: `z_done/aTest_v1/markdown/17-htmlart-catalog.md` 에서 4장(timeline·chevron·step·funnel)을 추려 `Projects/aTest/aTest.md` compare 뒤에 추가(제목·#id·설명 불릿 형식은 기존 htmlArt 장과 통일, release_date 갱신). ⚠️ aTest 는 [repo-tracking-rules](.claude/rules/repo-tracking-rules.md) 로 **gitignore** 대상이라 픽스처 확장분은 로컬 파일로만 남는다(Issue331 산출물과 동일 패턴)
    - 검증: [`4.laneb.sh`](z_test/ig-ppt/4.laneb.sh) aTest **6/6 통과** — 사이드카 lane B **4→8장**(신규 4장 전부 `kind: process` 기록), 대상 8장 전부 글자 있는 네이티브 도형·그림 0·평문 불릿 제거, **lane C 이월 3건(pie×2·matrix) 미개입**, `check-conform --lane a` FAIL 0. [`3.parity.sh`](z_test/ig-ppt/3.parity.sh) igTest **7/7 유지**(회귀 0)
    - ⚠️ **`funnel` 은 근사 금지 원칙의 명시적 예외다** (2026-09-01 검토 부기). `timeline`·`chevron`·`step` 은 **순서가 정보의 전부**라 옮겨도 잃는 것이 시각 변주뿐이지만, 깔때기는 순서에 더해 **단계마다 줄어드는 양**을 도형 폭으로 말한다. 균등 카드 + 커넥터로 그리면 그 축소가 사라지고 청중은 "순차 4단계"로 읽는다 — 코드 주석의 `단계 축소 = 순서` 는 등가 선언이지만 등가가 아니다. 평문 불릿보다는 낫다는 판단으로 유지하되, **`pyramid` 처럼 "크기가 곧 의미"인 블록을 같은 논리로 끌어오는 선례로 삼지 않는다**
    - ⚠️ **검증 재현성 부채**: `4.laneb.sh` 의 픽스처 `Projects/aTest` 가 gitignore 라 **clone 한 사람은 이 검증을 재현할 수 없다**. Issue331 부터 이어진 패턴인데 카탈로그가 4→8종으로 늘어 러너의 가치가 커진 만큼 부채도 커졌다 — 추적 대상 `igTest` 로 순차형 픽스처를 이관하는 후속 필요
    - 📌 남은 대응: `pie`·`matrix`·`venn` 류는 ppt-info 블록 신설이 선행 — 사용자 승인(폼 회수)을 받아 **글로벌 `~/.claude/Issue.md` Issue491 로 등록 완료**(별도 세션 처리 예정). 신설 후 m2slide 쪽은 `LANE_B_CATALOG` 매핑 1줄씩 추가하는 후속 이슈만 남는다. "블록 뒤 본문" 케이스는 이번 확장 후에도 실측 발생 0건이라 현행 이월 유지

## Issue337: (!) n3shIntro 덱 업데이트 — 추가 장표 인포그래픽화(ig-maker 핀봇) + 덱 반영 (등록: 2026-08-31, 해결: 2026-08-31, commit: `a2f39fe`, `bed2b97`) ✅
* 목적: Issue335·336 으로 검증된 레이아웃 준수 파이프라인(v2)을 n3shIntro 나머지 장표에 적용한다. 사용자 지시 — "n3shIntro 업데이트 진행(ig-maker 핀봇 활용)"
* depends: Issue336
* 상세:
    - 대상 선별(fit 게이트 판정) → 캡처 → _source/N 배치 → ig-maker 병렬 완주 → 발행 svg 를 원고에 반영 → 재빌드 → VERSION 1.1
    - 슬라이드 6(커리큘럼)은 검증분 curriculum-3.svg(레이아웃 준수판) 반영
* 결과 (Walkthrough):
    - 선별: 다이어그램 중심 2장(슬라이드 2 개념도·슬라이드 4 모디파이어 층) + 기검증분(슬라이드 6)
    - `fbot-igmaker-issue337` 배치(prj=42) → **봇 2개 병렬 완주**(ig-4-b4f7·ig-5-4d25) — 폴더·로그 충돌 0, 둘 다 `content` 자가 판정·content_box 준수·게이트 전부 통과
    - **레이아웃 계약의 부산물 활용** — 5.svg(타이틀 없는 콘텐츠판)를 `img/curriculum-{3,4,5}-content.svg` 로 복사해 슬라이드에 임베드. 테마 h2 밴드와 이중 타이틀 없이 전폭 렌더
    - 원고 3 슬라이드(2·4·6): 불릿+mermaid → 인포그래픽 단독(내용 중복 제거). VERSION 1.0→1.1, 재빌드·렌더 육안 검증 2장
    - 1차 반영은 불릿 병기로 시도 → 우측 반폭 축소로 텍스트 불가독 실측 → 단독 배치로 교정
    - 📎 커밋 2건이다 — `a2f39fe` 는 원고·svg·VERSION 이 [repo-tracking-rules](.claude/rules/repo-tracking-rules.md) gitignore 대상이라 실질 diff 가 `Issue.md` 뿐이고, 실산출은 `bed2b97`(`docs/` 배포 — index 카드 + n3shIntro 12파일)에 담겼다. `bed2b97` 은 완료 이동(`5c1ebba`) **뒤**에 커밋돼 한때 `commit:` 필드에서 누락돼 있었다(2026-09-01 검토에서 보강)


## Issue336: 테마 레이아웃 카탈로그 선언 — ig-maker 가 선택할 layouts 절 + curriculum 테마 정본 (등록: 2026-08-31, 해결: 2026-08-31, commit: `bab8424`) ✅
* 목적: Issue335 after 에서 ig-maker 가 전체 캔버스를 재작화한 원인의 절반은 **선택할 레이아웃 카탈로그가 프로젝트에 없었기** 때문이다(theme/curriculum/theme.yml 자체가 부재 — 내장 기본 테마로 조립). 테마 정본을 세우고 layouts 카탈로그를 선언해 prj3#Issue484(ig-maker 구조 개정)의 판정 재료를 공급한다
* 상세:
    - `_asset_ppt/theme/curriculum/theme.yml` 신설 — canvas·margin·palette(원본 실측 hex)·**layouts 카탈로그**
    - layouts 스키마는 prj3 `_doc_arch/ig-maker.md` §레이아웃 계약이 SSOT — 여기는 **값**만 선언
    - 초기 2종: `content`(테마 타이틀 밴드+본문 영역 — 덱 장표 표준) · `canvas`(전면 — 독립 인포그래픽용)
* 구현 명세:
    - 검증: prj3 개정(Issue484 로 재번호) 후 `_source/3` 재생성이 이 카탈로그를 읽어 `content` 를 선택하고 본문 영역만 작화하는지 확인
* 결과 (Walkthrough):
    - `theme/curriculum/theme.yml` 신설 — canvas·margin·palette(실측 hex 5슬롯)·layouts 2종(content·canvas). 스키마 SSOT 는 prj3 `ig-maker.md` §12
    - `_source/3` 재생성 실증: 봇이 `content` 자가 판정(`4.layout.yml` 기록, 애매성 없음) → viewBox 를 content_box 비율로 고정해 구조적 침범 불가 → 타이틀은 테마 골드 밴드로 조립. 게이트 전부 통과(문구 16/16·커넥터 5/5)
    - 색이 팔레트 **슬롯명**(band/green/purple) 참조로 바뀜 — hex 인라인 0건. ⚠️ 로더가 `gold` 슬롯 키를 병합하지 않아 band 로 대체(로더 허용 키 확장은 후속 판단)
    - 리포트 갱신: `_doc_work/report/ig-maker-before-after_report.md` "after v2" 절
* ✅ **§12 계약 적합성 사후 실측** (2026-08-31, 선행 prj3#Issue484 `fcb5bf4` 확정 후 재검):
    - **스키마 일치** — `layouts:` 절이 §12-2 최소셋(`content`·`canvas`)을 그대로 갖고 키도 `title_band`·`footer`·`content_box` 3종뿐이다. 여기는 **값만** 선언한다는 경계가 지켜졌다(스키마 조항을 복제하지 않음)
    - **전사 무결** — `theme.yml layouts.content.content_box`(x10.0 y28.0 w318.67 h150.0) 와 `4.layout.yml` 기록값이 **완전 일치**. `layout: content` · `reason` 기재 → §12-3 "기록 없는 선택은 게이트 위반" 충족
    - **영역 침범 0** — 4·5.svg 의 viewBox 종횡비 2.1250 이 content_box 비율 2.1245 와 일치(오차 0.02%)하여 좌표계 자체가 콘텐츠 영역이다. 두 파일 좌표 **488개 전수 검사 결과 viewBox 이탈 0건**(x 최대 1265/1275 · y 최대 570/600)
    - **금지 문법 미사용** — `content` 선택 시 금지인 [타이틀 계층]·[한 줄 정리 밴드] 없음. 4.svg 의 골드(`#F5C518`) 3회는 전부 **카드 액센트**(테두리·번호 배지·별 아이콘)이고 상단 전폭 밴드가 아니다. 타이틀 밴드는 조립본 7.svg(16:9 전체 캔버스 1355×762)에만 존재 → §12-4 "7단계는 테마 값으로 조립" 충족
* 🔧 **낡은 참조 정리** — 선행 이슈가 483 → 484 로 재번호되며 본문·산출물에 구 번호가 남아 있었다. `Issue.md` 목적 · `4.layout.yml` 헤더 · `0.origin.yml` notes **3곳 갱신**(잔존 0건 확인). 덤으로 `7.md` 머리말이 슬롯명을 `gold` 로 적어 놓고 데이터는 `band` 를 쓰던 불일치도 바로잡았다 — 재현자가 없는 슬롯을 찾게 만드는 줄이었다
* 📎 산출물(`Projects/n3shIntro/**`)과 리포트(`_doc_work/**`)는 [repo-tracking-rules](.claude/rules/repo-tracking-rules.md) 로 **gitignore** 대상이라 커밋에 담기지 않는다 — 로컬 파일로만 남는다. 실물 경로는 `Projects/n3shIntro/ppt/_asset_ppt/theme/curriculum/theme.yml`(위 상세의 `_asset_ppt/…` 는 `ppt/` 가 빠진 축약 표기)
* ⚠️ **커밋 위생 결함 — 사후 정정** (2026-09-01 검토): 위 줄은 본래 *"커밋되는 것은 `Issue.md` 뿐"* 이라고 적혀 있었으나 **사실과 다르다.** `bab8424` 의 실제 변경은 3파일이고, 커밋 메시지가 언급조차 않는 다음 2건이 함께 들어갔다 — 둘 다 이 이슈(테마 레이아웃 카탈로그)와 무관하다
    - [`.claude/commands/serve.md`](.claude/commands/serve.md) — dev-server tailnet 접근 항목 신설(`tailscale serve --bg --http=9877`). **tailscaled 에 영속되는 머신 상태 변경**이라 오히려 눈에 띄어야 할 변경이었다
    - [`lib/dev-server/server.py`](lib/dev-server/server.py) — 개요 페이지 카테고리 `pr`(📢 프레임워크) → `app`(📱 앱) 교체. 사용자에게 보이는 분류 체계 변경이므로 **별도 이슈감**이었다
    - 원인: 산출물이 gitignore 라 *"어차피 diff 가 비어 있다"* 가 기본값이 되면, 무관한 변경이 섞여도 걸리지 않는다. `git log` 로 위 둘을 추적하면 "테마 레이아웃 카탈로그" 아래 묻혀 검색되지 않는다

## Issue335: n3sh 소개 프로젝트(n3shIntro·Info 분류) 생성 + ig-maker before·after 실증 (등록: 2026-08-31, 해결: 2026-08-31, commit: `e300215`, `bab8424`) ✅
* 목적: prj58 n3sh(세벌식 390 속기 확장, 최근 pqrs 공개)를 소개하는 프로젝트를 **Info 분류**(도구 소개 — 강연자료 아님, graphify 선례)로 생성하고, 그 장표를 재료로 ig-maker 파이프라인의 **before·after 개선 실증**을 수행한다. Issue334(샘플 4장 분석 기반 개선)의 실작업 본체
* depends: Issue334
* 상세:
    - 산출: `Projects/n3shIntro/` — 상세 원고(`n3shIntro.ppt.md`)·`_config.yml`·`VERSION`·`Info.md`
    - before: 현행 ig-maker 로 대표 장표 도형화 → `ppt/` 산출 + `~/Desktop` 백업
    - upgrade: `~/Desktop/sample/ig` 4장 실측 분석 → ig-maker 개선
    - after: 동일 장표 재생성 → 수치·시각 비교 리포트(`_doc_work/report/`)
    - 담당: fbot-igmaker (prj3 카탈로그 2026-08-31 신설 직능)
* 결과 (Walkthrough):
    - n3shIntro 생성(Info 분류·원고 9장·Projects.md 등재) → 슬라이드 6 캡처(1300×650) → before 완주(도형 24·게이트 전부 통과) → 샘플 4장 문법 7종 추출 → prj3 `agents/ig-maker.md` 4단계 프롬프트 개정 → after 완주(도형 30·게이트 전부 통과)
    - **벤치마크 문법 1/7 → 7/7** · 문구 무결(13/13→18/18)·플로우 논리 보존(커넥터 5=5). 상세: `_doc_work/report/ig-maker-before-after_report.md`
    - 백업: `~/Desktop/n3sh-ig-backup/{before,after}/`
    - 수행: fbot-igmaker-issue335 (before `ig-1-e7f7` · after `ig-2-c8f9`) — 재시도 루프 0

## Issue334: (!) 인포그래픽 개선 — ~/Desktop/sample/ig 샘플 4장 분석 기반 ig-maker 성능 개선 (등록: 2026-08-31, 해결: 2026-08-31, commit: `e300215`) ✅
* 목적: 사용자 제공 샘플(`~/Desktop/sample/ig/IMG_0211~0214.JPG` 4장)을 분석해 개선 방향을 기획하고, 기존 ig-maker 파이프라인을 활용해 인포그래픽 품질·성능을 개선한다. **prj3 핀봇 조직의 첫 리크루팅 E2E 실증**(prj3#Issue482)의 실작업 대상 이슈이기도 하다
* 상세:
    - 트리거(사용자, 2026-08-31): "~/Desktop/sample/ig 의 내용 prj42 의 인포그래픽 개선작업 진행해줘"
    - 담당: `fbot-igmaker-issue334` (igmaker 직능 — prj3 카탈로그 2026-08-31 신설, agents/ig-maker.md 승격)
    - (!) 약식 등록 — 표준 시나리오 1 의 1단계. 정식 승격(plan/task)은 착수 시 작업핀봇이 수행
* 구현 명세:
    - ① 샘플 4장 실측 분석(구성·도형화 난도) → ② 개선 방향 기획 → ③ ig-maker 파이프라인으로 변환·개선 → ④ 전후 비교


## Issue331: lane B — cards·htmlart 를 네이티브 도형으로 (등록: 2026-08-18, 해결: 2026-08-25, commit: 24b8b09) ✅
* depends: Issue328, Issue329 (둘 다 완료)
* 완료 실측 (2026-08-25, commit 24b8b09): 배선 3단 신설 — [`build-source.py`](lib/pptx/build-source.py) ⑫ 가 대상 장을 `_pipeline/pptx/lane-b.json` 에 **표시**하고, [`lane-b.py`](lib/pptx/lane-b.py) 가 글로벌 [`ppt-info/info-build.py`](file:///Users/nowage/.claude/skills/ppt-info/SKILL.md) 를 **무수정 호출**해 받은 도형을 본문 자리에 **병합**한다. [`build-pptx.sh`](lib/pptx/build-pptx.sh) ③-b2 가 그 자리다
* 📊 **착수 전 실측** — 이슈 본문의 *"htmlart 는 통째로 사라졌다"* 는 2026-08-25 시점에는 **사실이 아니었다.** `md2pptx` 가 펜스 껍데기만 벗기고 내용은 남기므로 사라지는 것이 아니라 **평문으로 눕는다**. 격차의 성격은 같고(표현 등가 상실) 정도만 다르다
    - igTest 41장 — `::: cards` 3블록(장 6·9·37), 카드 8항목이 전부 본문 placeholder 안의 평문 불릿. 도형 0 · 그림 0. htmlart 는 이 덱에 **0건**
    - aTest 41장 — `::: cards` 2블록(장 2·12) + htmlart 5블록(장 19 pie · 21 process · 22 matrix · 23 compare · 40 pie). 전부 평문 불릿. 도형 0 · 그림 0
* 🔑 **원고를 바꾸지 않고 사이드카에만 표시한다.** lane B 가 어떤 이유로 빠져도(자산 부재·pyyaml 부재·렌더 실패·본문 대조 불일치) 평문 불릿이 그대로 남는다 — 원고에서 블록을 들어내 버리면 그 안전망이 사라진다. *"구조(lane A)가 먼저다"* 를 배선으로 굳힌 것이고, 그래서 `lane-b.py` 는 **rc0 으로 끝나는 것이 기본**이며 실패는 stderr 로 크게 알린다
* 🔑 **어느 문단을 지울지 셈으로 맞히지 않는다.** 사이드카가 적어 둔 `flat`(블록이 만들어 낼 문단 문자열)이 실제 본문 문단의 **끝과 정확히 일치할 때만** 지운다. 원고·평탄화 규칙이 달라지면 대조가 깨지고, 그때는 지우지 않고 건너뛴다 — 조용한 오배치보다 낫다
* 🔑 **카탈로그 밖은 근사하지 않는다.** lane B/C 경계는 *"패턴 카탈로그에 있는가"* 하나다. 카탈로그: `cards`·`htmlart numbered` → ppt-info `cards`(좌측 액센트 바) · `htmlart process` → `cards` + `flow_arrow`(`p:cxnSp` 네이티브 커넥터 — 도형을 옮겨도 따라온다) · `htmlart compare` → `compare`. 나머지는 lane C 이월로 **적고 손대지 않는다**(도형 배치 자체가 판단이라 근사하면 원본과 다른 도해가 나간다)
* 🔑 **테마는 실측 `theme.yml` 을 그대로 쓴다** — 색·캔버스가 lane A 와 같아야 같은 덱으로 보인다. 고치는 것은 둘뿐이다: `margin` 을 **대상 장 본문 placeholder 기하로** 덮고(테마 기본 전폭 10.2~328.5mm vs pandoc 제목·본문 12.7~241.3mm — 전폭으로 그리면 도형만 제목보다 넓어진다), `font.body` 를 카드용으로 낮춘다(카드는 밀집 표현이다)
* 🔑 **배선 자리가 ③-b 다음·③-c 앞인 것은 실측 근거가 있다.** 앞이면 ③-b 의 bold 색 교정이 카드 글자를 강조색으로 덮어 계단색이 사라지고, 뒤면 도형 서체가 ③-c `retheme` 을 놓쳐 `3.parity.sh` ⑥(테마 밖 폰트 0)이 깨진다
* ✅ **검증** — igTest `cards` 3장 **3/3 도형 렌더**(장 6: 도형 6 · 장 9: 4 · 장 37: 6, 전부 `AUTO_SHAPE` + 글자) · **그림 0** · `check-conform --lane a` **FAIL 0 · WARN 0**. aTest `cards` 2 + `process` 1 + `compare` 1 → **4/4**, lane C 이월 3건(`pie`×2 · `matrix`) **미개입**
    - [`3.parity.sh`](z_test/ig-ppt/3.parity.sh) **rc0 · 7/7 유지** (회귀 0). aTest 는 `--no-lane-b` 기준선과 **판정 완전 동일**(4/7 — single mode 라 러너의 챕터 전제가 안 맞는 기존 상태이며 lane B 무관)
    - `--pptx` · `--ppt-make` **양쪽 경로 모두** lane B 3/3 적용 확인. `1.infographic.sh`·`2.deck.sh` rc0
    - 회귀 러너 신설 [`4.laneb.sh`](z_test/ig-ppt/4.laneb.sh) — 단언 6종(사이드카 · 글자 있는 네이티브 도형 · 그림 0 · 평문 불릿 제거 · lane C 미개입 · conform). igTest·aTest **6/6**
* 🐞 **곁다리로 잡은 결함 2건** — ① `build-source.py` 심벌 제거(⑥)가 `[ \t]{2,} → " "` 를 줄 전체에 걸어 **선두 들여쓰기까지 뭉갰다**. `  - :fa-check: 완료` 의 2칸이 1칸이 되어 중첩 레벨이 통째로 사라진다(실측: aTest 심벌 카드 2장이 최상위 10항목으로 펴짐). ② python-pptx 로 **상속** placeholder 의 `height` 만 쓰면 `a:ext` 가 새로 생기며 `cx` 가 0 이 된다 — 본문이 폭 0 으로 사라진다. 네 값을 전부 적는다
* ⚙️ **기본 on 으로 두고 `--pptx-no-lane-b` 로 끈다.** 설계 3레인 표는 lane B 를 "옵트인" 으로 적었지만 그 게이트가 지키려던 위험은 **lane C 의 토큰 비용**(장당 33만)이다. lane B 는 초 단위·토큰 0 이고 결정적이며 실패해도 lane A 를 남기는 덧칠이라 그 위험이 없다 — 위험 없는 곳에 게이트를 두면 기능이 그냥 안 쓰인다. 끄는 스위치는 남겼다(회귀를 가를 때 *"lane B 탓인가"* 를 1초에 답해야 한다)
* 📌 남은 것은 **Issue333**(lane B 카탈로그 확장)으로 분리 등록. 순차형 4종은 m2slide 표만 고치면 되고, `pie`·`matrix` 류는 ppt-info 에 대응 블록이 없어 **글로벌 신설**이 선행이다
* 📎 설계 SSOT [`_doc_arch/pptx-parity.md`](_doc_arch/pptx-parity.md) "lane B 구현" 절을 함께 갱신했으나, 이 repo 는 `_doc_arch/` 를 gitignore 하므로([repo-tracking-rules](.claude/rules/repo-tracking-rules.md)) **로컬 파일로만 남는다**

## Issue332: ppt-maker 오케스트레이션 도입 — 원본 하나로 완성 덱까지 (등록: 2026-08-18, 해결: 2026-08-25, commit: 62f1cb4) ✅
* 완료 실측 (2026-08-25, commit 62f1cb4): 진입점 [`m2slide.sh --ppt-make`](m2slide.sh) 신설 — ①입력 판정 ②앞단 `ppt-init` ③lane A ④뒷단 `ppt-check` ⑤인포그래픽 게이트 ⑥보고. 구현은 [`lib/pptx/ppt-make.sh`](lib/pptx/ppt-make.sh) 이고 **하는 일은 글로벌 호출과 결과 회수뿐**이다. [`3.parity.sh`](z_test/ig-ppt/3.parity.sh) **rc0 · 7/7 유지**(회귀 0). 새 경로 산출물로 `--no-build` 재판정도 7/7. 신·구 경로 pptx 는 **전 XML 파트·미디어 3개 바이트 동일**(차이는 tempdir 이름·docProps 시각뿐 — 비결정 요소). `2.deck.sh` rc0 · `--lint-deployment` 위반 0
* 🔑 **재귀 회피를 원칙 하나로 두지 않았다.** 되위임 폴백이 사는 지점은 글로벌에 정확히 둘이다 — `deck.py` 폴백 ①(*"m2slide 가 있으면 `m2slide.sh --pptx`"*)과 그 `deck.py` 를 lane A 에서 부르는 `make.py`. ① **그 둘을 부르지 않고** 되위임 폴백이 없는 하위 스크립트만 직접 부른다(`init.py`·`check.py`·`igselect.py`·`igpath.py`) → 호출 방향이 **m2slide → 글로벌 단방향**임이 구조로 성립한다. ② 그 위에 `M2SLIDE_PPTX_DEPTH` **재진입 가드**를 걸어 되불림이 무한 루프가 아니라 **rc1 즉시 실패**가 되게 했다. 둘 다 둔 이유는 성격이 다르기 때문이다 — **원칙은 사람이 어길 수 있고, 가드는 어겨지지 않는다**. 실증: 가드 무장(`=1`)에서 `--pptx`·`--ppt-make` 둘 다 rc1 · 평시 실행은 가드가 물린 채 rc0 완주(= 실행 중 재진입 0건) · 정적 grep 으로 `deck.py`/`make.py` 호출 0건(전부 주석)
* 🔑 **`make.py` 를 부르지 않은 이유는 재귀만이 아니다 — 품질이 더 크다.** `make.py` lane A 는 `deck.py <파일>` 을 `--theme`·`--reference` **없이** 부른다(소스 확인). 그러면 pandoc 기본 서식이 나와 **테마가 통째로 빠진 덱**이 된다. m2slide 의 lane A 는 CSS 실측 → `theme.yml` → reference-doc 을 거치므로 글로벌 오케스트레이터의 lane A 로 대체할 수 없다 — 즉 이 이슈에서 붙일 수 있는 것은 **앞단·뒷단·게이트·보고**이고 lane A 는 기존 경로가 정본이다
* 🔑 **차단 게이트는 ③ 하나로 남겼다.** `ppt-maker` 7단계는 *"통과하지 못하면 완료가 아니다"* 지만 m2slide 에서 그 역할은 ③ 이 이미 한다(Issue317). 뒷단이 더하는 `legible` 류는 **휴리스틱이라 오탐이 성립**한다 — 실측(aTest p24): `check-legible` 이 *"mermaid 원문 노출 — `flowchart TD`"* 로 FAIL 했지만 실제 문장은 문법 소개 덱의 **산문** `flowchart TD 위→아래 흐름` 이었다. 고칠 수 없는 글로벌 휴리스틱이 빌드를 죽이면 회피 수단이 *"검증 끄기"* 뿐이 되므로 **보고는 크게, 차단은 ③ 에** 둔다
* 🔑 **팔레트 대조에 `--theme` 를 주지 않는다.** m2slide 는 제목색·강조색을 CSS 실측으로 **의도적으로 덮으므로**(Issue329) `theme.yml` 대조는 설계대로 동작한 결과를 FAIL 로 만든다. 대신 [`build-pptx.sh`](lib/pptx/build-pptx.sh) ③-d 가 덮은 값을 `_pipeline/pptx/measured.env` 로 남기고 뒷단이 그것만 `--allow` 로 풀어 **남는 이탈만** 비차단 정보로 찍는다
* 🆕 **그 결과로 드러난 신규 결함**: igTest 팔레트 이탈 2 — `#60A0B0`·`#06287E`. 둘 다 **pandoc 이 코드 스팬에 박는 syntax highlighting 색**이며 `Courier`(Issue329 G6)와 정확히 같은 계열이다. `retheme.py --font-only` 는 서체만 바꾸므로 걷어내지 못한다 → 후속 이슈 후보(글로벌 위임 아님 — Courier 선례대로 m2slide 배선으로 걷어낼 사안)
* 🔒 **경계 준수**: 글로벌 SCAR(`ppt-maker`·`ppt-deck`·`ppt-check`·`ig-selector`) **무수정**. lane C 팬아웃 **미실행**(장당 33만 토큰) — 실측으로 확인: `--ig` 실행 전후 `Projects/igTest/ppt/strengths/` 해시 동일. `ppt-init` 은 `pptx.yml` **옵트인 프로젝트만** 돈다(전 프로젝트 롤아웃 안 함 — 기존 판정 유지)
* ⚠️ 설계 SSOT [`ig-ppt-integration.md`](_doc_arch/ig-ppt-integration.md) "오케스트레이션" 절을 함께 갱신했으나 이 repo 는 `_doc_arch/` 를 **gitignore** 한다(repo-tracking-rules) — 커밋에 담기지 않고 로컬 파일로만 남는다
* depends: Issue330
* 목적: 지금은 사람이 lane 을 고르고 단계를 잇는다. 글로벌 [`ppt-maker`](file:///Users/nowage/.claude/skills/ppt-maker/SKILL.md)(원본 → init·trace·spec·deck·check 오케스트레이션)를 m2slide 진입점에 붙여 **한 번의 호출로 완성 덱**까지 가게 한다. prj82 가 `run.sh` 로 하던 일을 제품 경로로 옮기는 것과 같은 성격.
* 상세:
    - prj82 계승·비계승 판정은 [`pptx-parity.md`](_doc_arch/pptx-parity.md) "prj82 에서 무엇을 가져오나" 절 — `potx.md` **원칙**은 계승(m2slide 판은 `theme.yml`), `pages.py` 파이썬 원고는 **비계승**(m2slide 원고는 마크다운이고 그것이 존재 이유)
    - ⚠️ 순환 주의 — `ppt-deck`/`ppt-maker` 폴백 ①이 *"m2slide 가 있으면 m2slide.sh 에 위임"* 이라 무조건 호출하면 상호 재귀([`ig-ppt-integration.md`](_doc_arch/ig-ppt-integration.md) "순환" 절). `md2pptx.py` 직접 호출 원칙 유지
    - lane 자동 선택은 **하지 않는다** — lane C(ig-maker)는 장당 33만 토큰이라 `ig-selector` 승인 게이트가 존재 이유다
* 구현 명세:
    - lane A 완주(Issue326~329)와 parity 러너(Issue330) 통과가 선행 — 구조가 틀린 덱을 오케스트레이션으로 감싸면 결함이 자동화된다
    - m2slide 쪽은 **호출과 결과 회수**만. 오케스트레이션 로직을 복제하지 않는다

## Issue329: 테마 일치 완성 — layout 유도 매핑 + 코드 폰트 이탈 제거 (등록: 2026-08-18, 해결: 2026-08-25, commit: 53169cb, 7220b2e) ✅
* depends: Issue327
* 완료 실측 (2026-08-25, commit 7220b2e): [`3.parity.sh`](z_test/ig-ppt/3.parity.sh) igTest **6/7 → 7/7 rc0**. 잔여 3종이 모두 닫혔다 — ① 테마 밖 폰트 `Courier` ×20 → **0** ② 본문 크기 9.5pt(폭의 0.99%) → **20.0pt(2.08%)** 로 HTML `--r-main-font-size` 40px / reveal 캔버스 1920px = 2.083% 와 일치 ③ aTest 2×2 장 `{.column}` 누출 1 → **0**, 장 쪼개짐 42 → **41장**. igTest 41장 · 제목 보유 41/41(100%) 로 Issue328 실측에서 회귀 없음. `check-conform --lane a` igTest FAIL 0 · aTest FAIL 0 WARN 0
* 🔑 **G6 `Courier` 출처 = pandoc pptx writer 하드코딩** (판정 근거 3종: `reference.pptx` 전수 스캔 0회 · 산출 pptx 에서도 `ppt/slides/*.xml` 에만 있고 master·layout·theme 에 없음 · 코드 스팬 한 줄짜리 md 를 같은 reference 로 넣어도 재현). **글로벌 자산의 결함이 아니므로 위임하지 않았다** — [`build-pptx.sh`](lib/pptx/build-pptx.sh) ③-c 에 글로벌 [`retheme.py`](file:///Users/nowage/.claude/skills/ppt-deck/scripts/retheme.py)(비-`+` typeface → 테마 서체 치환)를 배선해 걷어낸다. ⚠️ `--font-only` 가 필수다 — 색까지 맡기면 ②-b·③-b 가 CSS 실측으로 교정한 제목색(#111111)·강조색(#2ECC71)이 theme.yml 값으로 되돌아간다
* 🔑 **본문 크기는 CSS 가 정본이다** — `theme-from-css.py` 는 이름과 달리 크기를 재지 않고 `title: 27`·`body: 9.5` 를 상수로 박는다(색·캔버스만 실측한다). 조직 템플릿이 없을 때 쓰는 무난한 기본값이지만 m2slide 는 **빌드 산출 HTML 한 장에서 실측할 수 있다** — base.css 가 `<style>` 로 인라인되고 reveal 캔버스 폭이 `Reveal.initialize({width: …})` 에 적히기 때문이며, 브라우저를 띄우지 않으므로 빌드에 헤드리스 의존이 늘지 않는다. ①-c 가 그 비율을 pptx 캔버스로 환산해 덮고, 키우면 넘칠 수 있으므로 ③-b 에서 **본문 placeholder 에도 자동 축소**를 건다(제목과 같은 이유 — pandoc 이 빈 `<a:bodyPr/>` 로 레이아웃 설정을 덮는다)
* 🔑 **중첩 `::: {.column}` 누출의 원인은 attribute 제거가 fence 줄까지 물린 것**이다. `ATTR` 정규식이 `::::::: {.row .card}` 의 attribute 를 벗기면 그 줄이 맨 `:::::::` 가 되고, `md2pptx.FENCE_OPEN` 이 정보 없는 `:::` 를 **닫는 줄**로 읽어(`info == ""` → `stack.pop`) 여닫이가 어긋난다. 짝을 잃은 `:::: {.column}` 이 본문에 글자 그대로 새고 장까지 쪼개졌다(교정 전 실측: aTest 8·9번 장이 `좌상단 …` / `좌하단 … :::: {.column} 우상단 … ::::::: 우하단 …`). [`build-source.py`](lib/pptx/build-source.py) 에 `FENCE_LINE` 가드를 넣어 fence 줄에서는 attribute 제거를 건너뛴다 — **껍데기 처리는 md2pptx 소관**이다
* 목적: 색·서체는 옮겨졌지만(accent `F5C518`·Malgun Gothic 실측 확인) **layout 개념과 코드 서식이 이탈**해 있다. m2slide layout 5종과 pptx 마스터의 대응을 세우고 템플릿 밖 폰트를 없앤다.
* 상세:
    - 🟢 **초기 판단이 실측에서 뒤집혔다** — "마스터 레이아웃을 신설해야 한다"고 봤으나, `theme2reference.py --adapt` 가 표준 11종을 **이미 만들어 두었다**(reference.pptx 실측). 즉 G3 는 마스터 문제가 아니라 **원고를 그 모양으로 쓰는 문제**다
    - pandoc 은 레이아웃을 이름으로 고르지 않고 **슬라이드 구조로 자동 선택**한다 → 매핑표는 [`pptx-parity.md`](_doc_arch/pptx-parity.md) "layout 매핑" 절
    - ~~G6: `Courier` 15회(코드블록). 출처가 reference 테마인지 pandoc 하드코딩인지 **미판정** — 전자면 글로벌(prj3) 위임, 후자면 원고에서 코드블록 표현 교체~~ → **판정 완료: pandoc 하드코딩**. 위 🔑 항 참조(위임 아님, `retheme.py --font-only` 배선으로 해소)
    - 🔑 **챕터 진입 장이 3장으로 쪼개진다** (Issue326 실측 2026-08-18): 원본 `chapter` layout 1장이 pptx 에서 `Section Header`(H1) + 제목 없는 장("Chapter 1.") + `Title and Content`(부제) **3장**이 된다. 이것이 제목 보유율이 87% 에서 100% 로 못 가는 직접 원인(45장 중 6장 무제목 = 챕터 5개 × 1 + α). 원고에서 챕터 진입부를 **H1 단독**으로 만들면 1장으로 수렴한다
* 🟢 부분 완료 (2026-08-19, commit: 53169cb): ① 챕터 진입 3장 → **2장**(Section Header + 챕터 TOC) 수렴 ② 무제목 장 **6 → 0**(igTest 41/41 제목 보유) — 원인이 둘이었다: H1 뒤 본문이 흘러나가는 것과 `Content with Caption` 넘침(표·그림 **뒤**의 글). 후자는 무거운 블록을 장 끝으로 옮겨 막았고, mermaid 펜스도 **그림이므로** 무거운 블록에 넣었다 ③ 제목색·강조색을 **CSS 실측값으로 교정**([`css-var.py`](lib/pptx/css-var.py)) — 글로벌 `title_color()` 는 accent 중 가장 어두운 색(#977A0E)을 고르는 추정이라 실제(#111111)와 달랐다 ④ 좁은 제목칸의 긴 한글 제목 잘림 → 자동 축소(레이아웃뿐 아니라 **장 쪽에도** 걸어야 듣는다. pandoc 이 빈 `<a:bodyPr/>` 로 상속을 덮는다)
* 구현 명세:
    - 원고 생성기에 layout 유도 규칙 구현 (`chapter`→H1 단독 / 도해 장→이미지+캡션 / 2분할→`::: columns`)
    - 코드 폰트 출처 판정 후 분기 — 위임이면 `~/.claude/Issue.md` 등록(*-maker·ppt-* 무수정 원칙)
    - 검증: 산출 pptx 레이아웃 분포가 원본 layout 분포와 대응 · 테마 밖 폰트 0 · `check-conform --lane a` WARN 감소

## Issue330: parity 회귀 러너 — `z_test/ig-ppt/3.parity.sh` (등록: 2026-08-18, 해결: 2026-08-25, commit: ebf226a) ✅
* 완료 실측 (2026-08-25, igTest 빌드 포함 6.6초): **6/7 통과** — ① 슬라이드 41장 = HTML 본문 39 + 구조 2 ✅ · ② Title placeholder 41/41(100%) ✅ · ③ 제목 문자열·순서 일치(챕터 5 · 본문 29장) ✅ · ④ 구조 슬라이드 7장(표지 1 · 목차 1 · 챕터 진입 5) ✅ · ⑤ 마크다운 누출 0 ✅ · ⑥ **테마 밖 폰트 `Courier` ×20 ❌** · ⑦ `check-conform --lane a` FAIL 0 ✅
* ⑥ 은 러너 오탐이 아니라 **실재 결함**이며 소관은 Issue329 잔여 G6 이라 여기서 고치지 않았다. 다만 그 이슈의 *"출처 미판정"* 은 이번에 판정됐다 — `reference.pptx` 에도 `ppt-deck` 스크립트에도 `Courier` 가 없고, 코드 스팬 한 줄짜리 md 를 pandoc 에 넣으면 **reference-doc 유무와 무관하게** `Courier` 가 나온다(실측). 즉 pandoc pptx writer 하드코딩이며, 글로벌 [`retheme.py`](file:///Users/nowage/.claude/skills/ppt-deck/scripts/retheme.py)(비-`+` typeface → 테마 폰트 치환)가 m2slide 경로에 배선돼 있지 않다. 실린 장은 인라인 코드가 있는 8장(6·8·14·22·28·32·33·40)
* 🔑 **오탐 대비를 설계에 넣었다** — ③⑤ 는 XML 날것이 아니라 렌더 텍스트(`text_frame.text`)로 판정한다. 선례 2건(XML 주석 인용·`<tspan>` 분절)이 모두 날것 grep 에서 났기 때문이고, run 이 쪼개져도 문단 단위로 다시 붙는다. ⑤ 패턴은 m2slide 고유 문법으로 좁혔다(`-->` 처럼 산문에 자연히 나오는 토큰은 제외 — 오탐이 러너를 무력화한다)
* 🔑 **변이 테스트 5종으로 각 단언의 독립 발화를 확인**했다(러너가 무엇도 못 잡는 상태로 통과하는 것을 막기 위함): 장 제거 → ①③ / 제목 공백화 → ③만(②는 98% 로 **통과** — Issue326 회귀를 ② 혼자서는 못 잡는다는 근거) / 리터럴 주입 → ⑤ / 목차 훼손 → ④ / 현행 → ⑥
* 챕터 진입 2장은 HTML 과 **순서가 뒤집혀 있다**(HTML `[챕터 H1, 챕터 TOC]` ↔ pptx `[Section Header(챕터명), 챕터 TOC(H1)]`). Issue329 가 의도해 수렴시킨 매핑이라 ③ 은 쌍 내부만 집합으로 보고 **본문 장은 순서까지 정확히** 대조한다
* 빌드는 `--pptx-no-verify` 로 짓는다 — 내장 검증이 먼저 죽으면 나머지 6종이 측정되지 않는다. 검증을 건너뛰는 것이 아니라 **판정 지점을 러너로 모으는** 것이며 ⑦ 이 같은 검사를 직접 수행한다
* depends: Issue326
* 목적: 충실도를 **눈이 아니라 러너가** 판정하게 한다. 기존 [`2.deck.sh`](z_test/ig-ppt/2.deck.sh)는 *"3장 나오고 색이 있고 지시자가 안 샜다"* 만 보므로 **35장이 제목 없이 나와도 통과했다** — 실제로 통과했고, 그래서 결함이 배포까지 갔다.
* 상세:
    - 판정 기준은 **원본 HTML** 이다 — 그쪽이 정본이고, 두 산출물을 같은 잣대로 재는 유일한 지점이다
    - 팬아웃 0 이라 비용 0 — 매 빌드에 붙일 수 있다
* 구현 명세:
    - 단언 7종: 슬라이드 수 대응 · Title placeholder ≥95% · 제목 문자열·순서 일치 · 구조 슬라이드 존재 · 마크다운 누출 0 · 테마 밖 폰트 0 · `check-conform --lane a` FAIL 0
    - 픽스처는 `Projects/igTest` (Issue324 재구축본)
    - 러너 작성 시 **오탐 주의** — 선례 2건(XML 주석 인용·`<tspan>` 분절)이 있다. 렌더 텍스트 기준으로 판정할 것

## Issue328: 구조 슬라이드 주입 — cover·agenda·챕터 TOC 12장 복원 (등록: 2026-08-18, 해결: 2026-08-25, commit: 53169cb) ✅
* depends: Issue327
* 완료 실측 (2026-08-25 재현): igTest — **45장/무제목 6 → 41장/무제목 0(제목 보유 100%)** · 구조 슬라이드 **0 → 7**(표지 1 · 목차 1 · 챕터 TOC 5). 원본 HTML `<section>` 40 과 대응. `cover_enabled: false` 에서 표지 미주입 확인(`00-cover.md` 생성 0). single mode 회귀 없음 — aTest 42장 · 제목 보유 90% → 93% · FAIL 0. `check-conform --lane a` FAIL 0 · WARN 1(기존 `Courier` — Issue329 잔여). [`2.deck.sh`](z_test/ig-ppt/2.deck.sh) 5단언 통과
* 🔑 검증 중 발견·해소 — `--pages` 부분 변환에서 **표지 YAML 이 글자 그대로 슬라이드에 찍혔다**. `md2pptx.slice_pages()` 가 `---` 를 슬라이드 경계로 보므로 메타데이터의 여닫이가 경계가 되고 그 사이가 본문 블록으로 승격된다(실측: 1번 장 전체가 `title: "m2Slide란?" subtitle: "…"`). 리터럴 누출 0(Issue327)을 깨는 형태라 [`build-pptx.sh`](lib/pptx/build-pptx.sh) 가 `--pages` 동반 시 표지 파일을 빼도록 **원인 쪽을 막았다** — 그 전까지 `2.deck.sh` 가 빨간 상태였다
* 목적: 원본 39장 중 **12장(cover 1 · agenda 1 · 챕터 TOC 10)이 pptx 에 통째로 없다.** 이 장들은 원고 md 에 존재하지 않고 m2slide 빌드가 주입하므로, 원고 생성기가 같은 일을 pptx 원고에도 해야 한다.
* 상세:
    - 원본 layout 분포 실측(2026-08-18): `_contents` 29 · `_toc` 10 · `chapter` 5 · `_cover` 1 · `_agenda` 1
    - cover 메타 출처는 `markdown/AGENDA.md` frontmatter(instructor·version·lecture_date 등) + `_config.yml` `cover_enabled`·`cover_layout` — [`meta-yml.md`](_doc_arch/meta-yml.md) 규약 준수
    - 챕터 TOC 는 각 챕터의 H2 목록에서 생성 (`toc_card_mode` 는 HTML 전용 표현이므로 pptx 에서는 불릿 목록으로 등가 처리)
* 구현: [`build-source.py`](lib/pptx/build-source.py) 가 표지·목차·챕터 TOC 를 주입한다. 표지는 **pandoc 메타데이터**로 적어야 `Title Slide` 레이아웃이 잡힌다(실측) — 파일 첫 줄을 비워 `md2pptx.strip_frontmatter()`(파일이 `---` 로 *시작할 때만* 걷어냄)를 통과시킨다. 챕터 TOC 는 챕터 진입부의 부제 H2 를 제목으로 삼아 합쳤다(장수 팽창 없이 원본 2장 ↔ 산출 2장). 실측은 아래 완료 실측 참조
* 구현 명세:
    - 원고 생성기가 cover(문서 최상단 제목·부제 메타) · agenda(H2+불릿) · 챕터 TOC(각 챕터 진입부) 를 md 로 생성
    - `cover_enabled: false` 프로젝트에서는 주입하지 않는다 — 설정을 존중
    - 검증: 산출 장수가 원본 `<section>` 수와 대응 · cover/agenda/TOC 각 1장 이상 실존

## Issue327: pptx 원고 생성기 골격 — `lib/pptx/build-source.py` 신설 (등록: 2026-08-18, 해결: 2026-08-18, commit: 0338cc3) ✅
* 완료 실측 (2026-08-18): [`build-source.py`](lib/pptx/build-source.py) 신설 + [`build-pptx.sh`](lib/pptx/build-pptx.sh) 를 `--m2slide` 자동수집 → **중간 원고 전달**로 교체. igTest — 산출 pptx 리터럴 누출 **0건**(`{.`·`:::`·`#layout-`·`#id-`·주석), 45장·Title 39(87%)·FAIL 0 유지. single mode 회귀 없음(aTest 42장 FAIL 0, 정리 attr 10·`#id` 31·심벌 8·애니 3)
* 🔑 **G8 발견·해소** — ig-maker 가 만든 `img/strengths-1.svg`(장당 33만 토큰)가 pptx 에서 **조용히 누락**되고 있었다. 원고는 `markdown/` 에 있고 실물은 프로젝트 루트 `img/` 에 있는데 **빌드만 두 곳을 병합 복사**하기 때문. 변환 로그가 `✕ 없음` 을 정직하게 찍었지만 빌드가 성공으로 끝나 아무도 보지 않았다 — *"성공으로 보이는 품질 회귀"*. 생성기가 m2slide 탐색 규칙(원고 옆 → 프로젝트 루트)으로 해소: **이미지 파일없음 1→0 · SVG 변환 0→1**(산출 94KB→179KB)
* 역할 경계 준수: `#layout-*` 제거·fenced div 껍데기·mermaid 렌더는 **md2pptx 소관이라 건드리지 않았다** — 같은 판정을 두 곳에서 하면 갈린다(Issue323 에서 실제로 겪은 형태)
* depends: Issue326
* 목적: m2slide 만 아는 것(빌드 지식)을 pptx 경로에 전달할 **유일한 통로**를 만든다. 구조 슬라이드·layout·cards 는 원고 md 에 없고 `_config.yml`·AGENDA·빌더가 만들기 때문에, md 만 읽는 글로벌 변환기는 원리적으로 알 수 없다.
* 상세:
    - 아키텍처 결정 근거·대안 3안 비교는 [`pptx-parity.md`](_doc_arch/pptx-parity.md) "아키텍처 결정" 절. 채택안 ⓒ = **중간 원고**
    - `md2pptx.py` 는 위치 인자로 md 파일 목록을 받으므로(`md nargs="*"`), `--m2slide <폴더>` 대신 **생성 원고를 넘기면** 글로벌 수정 없이 성립한다
    - 산출 위치 `Projects/<N>/_pipeline/pptx/source/*.md` — `_pipeline/` 은 git 미추적([repo-tracking-rules](.claude/rules/repo-tracking-rules.md))
    - ⚠️ **내용을 새로 쓰지 않는다.** 문구는 원본 그대로 옮기고 구조만 만든다 — 넘으면 두 산출물이 다른 말을 하기 시작한다
* 구현 명세:
    - 본 이슈 범위는 **골격 + 문법 정리(G5)** 까지: `{.fragment}`·`<!-- .element: -->`·`::right::`·`#id-*`·비-pandoc 슬롯 fenced div 제거·평탄화
    - 구조 슬라이드 주입은 Issue328, layout 유도는 Issue329 로 분리 (한 커밋에 몰면 회귀 원인 격리가 안 된다)
    - `build-pptx.sh` 가 원고 생성 → 그 목록을 `md2pptx.py` 에 전달하도록 배선 교체
    - 검증: 산출 pptx 에서 `{.`·`:::`·`#layout-` 리터럴 0 (현행 `{.fragment}` 4번 장·`# ` 5번 장 누출)

## Issue323: theme-from-css `--kn-accent` 오탐 — prj3 위임 + 임시 교정 수명 관리 (등록: 2026-08-18, 해결: 2026-08-18, commit: 81ea414) ✅
* 완료 실측 (2026-08-18): **trigger 충족** — prj3#Issue434 가 `cc01ad8`(`:root --kn-accent` 폴백)로 완료됨을 확인. m2slide 임시 교정 36줄 제거 후 **글로벌 단독 산출이 구 교정본과 accent 4색 전부 일치**(`#F5C518 #FFE15A #C49D13 #977A0E` — 실렌더 `--kn-accent` 와 같다). reference.pptx accent1~4 반영 확인 · `2.deck` 러너 5단언 통과 · `check-conform --lane a` FAIL 0
* 판정 근거: 같은 판정을 로컬·글로벌 두 곳에서 하면 갈린다. 글로벌이 같은 로직(`shade()` 포함)을 승계했으므로 로컬 사본은 중복이며, 남겨 두면 다음 글로벌 개선이 로컬 덮어쓰기에 가려진다
* depends: prj3#Issue434
* trigger: prj3#Issue434 ✅ 완료 + commit hash 기록 → [`build-pptx.sh`](lib/pptx/build-pptx.sh) 의 `--kn-accent` 임시 교정 제거 + igTest `--pptx` 재검증
* 목적: [`ig-ppt-integration.md`](_doc_arch/ig-ppt-integration.md) 🔧 FIXME(palette 미지정 덱 accent 오탐 — 글로벌 `theme-from-css.py` 소관)를 prj3#Issue434 로 정식 위임하고, m2slide 쪽 임시 교정의 제거 조건을 명시한다. *-maker 는 prj82·범용 공용이라 m2slide 세션에서 직접 수정하지 않는다(사용자 지시 2026-08-18).
* 상세:
    - prj3#Issue434 등록 완료 (2026-08-18, prj3 commit 3c54dd7) — 오탐 메커니즘·폴백 명세·검증 조건 포함
    - m2slide 는 그때까지 `build-pptx.sh` 의 임시 우회(palette 미지정 시 `--kn-accent` 덮어쓰기)를 유지한다
* 구현 명세:
    - 본 이슈는 prj3 해결 대기 — trigger 충족 시 임시 교정 제거 + 재검증 후 종결

## Issue326: `--slide-level 2` 전환 — 제목 소실(5/35) 복원 (등록: 2026-08-18, 해결: 2026-08-18, commit: 6ea4db9) ✅
* 완료 실측 (2026-08-18): [`build-pptx.sh`](lib/pptx/build-pptx.sh) 에 `--slide-level 2` 전달(사용자 인자가 뒤에 와서 덮을 수 있게 배치). igTest 재산출 — **35장 Title 5(14%) → 45장 Title 39(87%)**, `check-conform --lane a` FAIL 0 유지(WARN 1 = 기존 Courier). single mode 회귀 없음 확인: aTest 41장 Title 8(20%) → 42장 Title 38(90%) — 두 모드 다 H2 가 슬라이드 제목이라는 같은 규약을 따르기 때문
* 부수: [`2.deck.sh`](z_test/ig-ppt/2.deck.sh) 기대값이 레벨 1 시절 상수(3장)라 실패 → **하한(원고 3블록 ≤ 산출) + 제목 보유율 ≥60%** 로 교체. 상수로 두면 개선할 때마다 러너가 막고 기대값을 습관적으로 고치게 된다. 정밀 장수·제목 판정은 Issue330 parity 러너로 이관
* 🔑 발견: 챕터 진입 장 1개가 **3장으로 쪼개진다**(H1 + "Chapter N." + 부제) — 87%가 100%가 아닌 직접 원인. Issue329 에 실측 근거로 기재
* depends: Issue325
* 목적: PPTX 산출물의 **86% 슬라이드에 제목이 없는** 상태를 고친다. m2slide 는 **H2 가 슬라이드 제목**인데 변환이 `--slide-level=1`(H1 경계)로 돌아 H2 가 본문 첫 줄로 강등된다.
* 상세:
    - 🟢 **실측으로 이미 확인된 해법** (2026-08-18): 같은 원고·같은 reference 로 `--slide-level` 만 바꾼 결과 — `1` → 35장·Title **5**장 / `2` → 45장·Title **39**장. **39 는 원본 HTML 슬라이드 수와 정확히 일치**한다
    - 45−39=6 은 H1 챕터 진입 장이 별도 슬라이드로 서기 때문 — 없앨 것이 아니라 `Section Header` 로 매핑할 대상(Issue329)
    - 비용 0·즉시 되돌림 가능. 다른 격차와 달리 **인자 한 개**다
* 구현 명세:
    - [`lib/pptx/build-pptx.sh`](lib/pptx/build-pptx.sh) 가 `md2pptx.py` 호출 시 `--slide-level 2` 전달
    - ⚠️ single mode 덱(H1 이 슬라이드 제목인 프로젝트)에서 회귀하지 않는지 확인 — 필요하면 chapter/single 판별로 레벨을 가른다
    - 검증: `igTest` 재산출 후 Title placeholder ≥95% · `check-conform --lane a` FAIL 0 · 기존 [`2.deck.sh`](z_test/ig-ppt/2.deck.sh) 통과 유지

## Issue325: PPTX 충실도 설계 SSOT 작성 — 실측 격차 카탈로그 + 원고 생성기 아키텍처 (등록: 2026-08-18, 해결: 2026-08-18) ✅
* 목적: *"다운로드한 pptx 가 원본과 너무 다르다"* 는 관측을 **격차 목록·원인·해법 경계**로 확정해 후속 이슈 전부의 근거로 삼는다. 일치화를 시도한 적이 없었으므로(사용자 확인) 배선 문서와 별개로 충실도 설계가 필요했다.
* 산출: [`_doc_arch/pptx-parity.md`](_doc_arch/pptx-parity.md) 신설
* 완료 범위 (실측 2026-08-18 · `~/Downloads/igTest.pptx` 35장 ↔ 원본 39장):
    - **파리티 정의** — 픽셀 일치가 아니라 3축(구조 동형 → 테마 동일 → 표현 등가) 우선순위. pptx 는 편집 가능해야 하므로 캡처 복제는 목표가 아니다
    - **격차 카탈로그 G1~G7** — 제목 5/35 · 구조 슬라이드 12장 부재 · layout 대응 0 · cards/htmlart 소실 · 마크다운 누출 2종 · Courier 15회 · 팔레트 스코프 오탐
    - **원인 3종 분리** — O1 경계 레벨(인자) · O2 전달 경로 부재(구조적) · O3 어휘 미정의(렌더러). ⚠️ O2 를 글로벌 변환기 결함으로 읽으면 안 된다는 판정 포함
    - **아키텍처 결정** — 대안 3안(글로벌 확장·캡처 경유·중간 원고) 비교 후 **ⓒ 중간 원고 생성기** 채택. 글로벌 무수정 + 중간물이 검사 가능
    - **layout 매핑표** — 🟢 초기 판단 뒤집힘: 마스터 신설이 아니라 **원고 구조로 유도**하는 문제(표준 11종은 `--adapt` 가 이미 생성해 둠, 실측)
    - **3레인 경계** — A(텍스트·토큰 0) / B(도형·소) / C(ig-maker·장당 33만). "A 를 건너뛰고 C 로 가지 않는다"
    - **prj82 계승 판정** — `potx.md` 원칙 계승 · 렌더러는 글로벌 경유 · `pages.py` 파이썬 원고는 비계승(m2slide 원고는 마크다운이고 그것이 존재 이유)
* 부수 실측: `--slide-level` 을 `2` 로 바꾸면 Title placeholder 가 **5 → 39장**(원본 슬라이드 수와 정확히 일치) — Issue326 의 근거

## Issue324: igTest 재구축 — 픽스처 초기화 + 통합 회귀 전판 + ig-maker 1장 E2E (등록: 2026-08-18, 해결: 2026-08-18, commit: 11c6ad1) ✅
* 완료 실측 (2026-08-18): 재구축(기존본 스크래치 보존 → playground fresh 복사 → 템플릿 2종 → `igpath resolve` 4키 기대값 일치) + 회귀 전판 통과 — 빌드 · `--pptx` rc0(검증 내장) · `0.cost-gate` 5단언(실덱 후보 6장 exit 4 재현) · `2.deck` 4단언 · `1.infographic` 8단언 · lint-deployment. E2E 1장 — 인스턴스 `ig-1-5e92`(sonnet, 31.8만 토큰·23분·재시도 0, 글로벌 장당 실측치와 일치), `7.pptx` 이미지 0·텍스트 프레임 15·conform WARN 0, igsvg rc0, palette 채움(`seeded_by: ppt-init` 쓰기 확대 경로 prj3#382 검증), 발행본=원본 cmp 일치, 슬라이드 실렌더 육안 확인(크롬 비복제 — 1라운드의 revise 사유를 프롬프트 선제 명시로 재발 방지)
* 부수 교정: 러너 검사 4(원문 보존)가 `<tspan>` 줄바꿈 분절을 누락으로 **오탐**(실측 5건) — 렌더 텍스트·공백 무시 기준으로 교정, 가짜 문구 반증 테스트로 검출력 유지 확인
* depends: Issue320, Issue322
* 목적: 사용자 지시("igTest 다시 만드는 수준") 이행 — playground 원본에서 픽스처를 fresh 재생성하고, 2차 정합 상태에서 통합 경로 전판(빌드 · `--pptx` 검증 차단 · 비용 게이트 · 회귀 러너 3종 · lint)을 재검증한다. ig-maker 1장 E2E(캡처→팬아웃→발행→슬라이드 참조)로 SVG 소비 경로를 재실증한다.
* 상세:
    - 기존 igTest 는 삭제하지 않고 스크래치로 이동 보존(오판 대비 — ig-maker §4-5 "삭제를 승인 대상으로 남겨 둔 절차가 오판을 막았다"와 같은 취지)
    - 재생성 절차 = Issue319 규약: `~/.claude/playground/resource/m2slide` 복사(markdown 5챕터 + `_config.yml` + `VERSION` + `Info.md`) + [`data/ppt-integration/`](data/ppt-integration/README.md) 템플릿 2종 복사
    - E2E 팬아웃은 **1장** — 게이트 임계(warn 2) 미만, 1라운드 선례(Issue312) 있음. 인스턴스는 sonnet 모델 명시(본 세션 모델 상속 금지 — 크레딧 과금 회피)
    - 픽스처는 git 미추적(Issue319) — `--sync-projects` 실행 금지(추적 목록 부작용 실측 있음)
* 구현 명세:
    - 재구축: 이동 보존 → playground 복사 → 템플릿 복사 → `igpath resolve` 4키 기대값 확인
    - 회귀: `./m2slide.sh igTest` 빌드 → `--pptx` 검증 통과 → `z_test/ig-ppt/0.cost-gate.sh` → `2.deck.sh` → lint(deployment)
    - E2E: [`lib/ig/capture-for-ig.sh`](lib/ig/capture-for-ig.sh) → ig-maker 1장(sonnet) → `igpublish` → `04-strengths.md` 참조 → 재빌드 → `1.infographic.sh` 통과

## Issue322: ```pptx-info 펜스 블록의 m2slide 빌드 통과성 실측 + 사용 정책 박제 (등록: 2026-08-18, 해결: 2026-08-18, commit: e496f0c) ✅
* 완료 실측 (스크래치 프로젝트, 2026-08-18): HTML 빌드 = `<code class="language-pptx-info hljs">` 코드블록 리터럴 렌더·빌드 정상. `--pptx`(lane A) = pandoc 일반 코드블록 통과·검증 rc0. 즉 빌드는 비파괴지만 **yaml 소스가 청중에 노출** → "m2slide 마크다운에서 쓰지 않는다" 정책을 [`md-m2slide-rules`](.claude/rules/md-m2slide-rules.md) 에 박제 + 통합 SSOT 판정 완료 표기
* 목적: 상위 설계 [`pptx-scar.md`](file:///Users/nowage/.claude/_doc_arch/pptx-scar.md) §8-3 이 prj42 몫으로 지정한 *"` ```pptx-info ` 블록을 파서가 통과시키는지 확인(미지원 코드블록으로 렌더될 수 있음)"* 을 이행한다. 실측 후 m2slide 마크다운에서의 사용 정책을 규칙으로 박제한다.
* 상세:
    - `pptx-info` 블록은 파트 C(ppt-info, lane B 인포그래픽 덱)의 페이지 정의 입력이다. m2slide 덱(lane A)의 인포그래픽 경로는 ig-maker SVG 발행(`img/`)이 정본이므로, m2slide 마크다운에서는 **쓰지 않는다**가 유력 — 실측으로 확정
    - 확인 지점 2곳: ① m2slide HTML 빌드가 블록을 만나면 어떻게 렌더되나(코드블록 리터럴? 빌드 깨짐?) ② `--pptx`(md2pptx lane A) 경로에서의 처리
* 구현 명세:
    - 스크래치 프로젝트에 `pptx-info` 블록 포함 md 를 넣고 빌드 실측
    - 결과를 [`md-m2slide-rules.md`](.claude/rules/md-m2slide-rules.md) 시각화 구성요소 절에 1항 추가 + `ig-ppt-integration.md` 연동
    - 실측이 "빌드 깨짐"이면 대응 재판정(별도 이슈 분리)

## Issue321: promo-cartoon(cartoon-maker) L2 정책 배선 — m2slide 최초 도입 + 파일럿 1장 (등록: 2026-08-18, 해결: 2026-08-18, commit: 749edf0) ✅
* 완료 실측: L2 `data/promo-cartoon/policy.yml` 생성 + 파일럿 카툰(`data/promo-cartoon/output/m2slide-killer-scene-1.{svg,png}` — SVG 2.8MB·PNG 282KB) 1장 산출. 육안 검증 통과 — ③ 4단계 아이콘 SVG 도형(문서·슬라이더·재생·2×2 그리드) 렌더 정상·검은 사각 0, 카툰체 하이브리드 폰트(TmonMonsori·나눔손글씨·나눔스퀘어라운드) 적용, 마스코트 6포즈 base64 embed 정상, ④ 체크 심볼·⑤ 4컷·⑥ CTA 전부 정상. 산출물·L2 는 정책상 git 미추적(`/data/*` 기본 제외 실측) — commit 은 등록 커밋(구현 명세 포함)
* 목적: 글로벌 [`promo-cartoon`](file:///Users/nowage/.claude/skills/promo-cartoon/SKILL.md) 설계의 "최초 프로젝트 도입 시 L2 정책 파일 생성" TODO 를 m2slide 에서 이행한다. m2slide 제품 홍보 카툰(세로형 1장 SVG→PNG)을 이 repo 에서 정책 기반으로 생성 가능하게 한다.
* 상세:
    - L2 `data/promo-cartoon/policy.yml` — `product: m2slide` · `killer_scene_source: ~/_git/___common/_doc_base/promotion_0.initial.md`(m2slide Killer Scene ①~④ 표 실존 확인) · `output_dir: data/promo-cartoon/output/`
    - gitignore 는 이미 충족 — 루트 `.gitignore` 의 `/data/*` 기본 제외 + 화이트리스트 방식이라 `data/promo-cartoon/` 은 화이트리스트 미추가로 자동 제외(`git check-ignore` 실측). 설계 문서의 ".gitignore 추가 필수"는 m2slide 에선 구조적으로 이행됨
    - ⚠️ ③ `{{STEP*_ICON}}` 은 호출자 주입값 — **이모지 금지, SVG 도형 주입**(prj3#426 이 ④는 템플릿에서 해결했으나 ③은 호출자 책임으로 잔존. 이모지를 넣으면 rsvg 가 검은 사각으로 렌더)
    - 마스코트 7종은 기존 스프라이트 재사용 — 이미지 생성 비용 0
* 구현 명세:
    - `data/promo-cartoon/policy.yml` 생성 (L2 허용 키만)
    - 파일럿 카툰 1장 — m2slide Killer Scene ①("슬라이드를 고치지 말고 패턴을 고쳐라") 6블록 SVG 조립 + `rsvg-convert` PNG export → `data/promo-cartoon/output/`
    - 검증: PNG 실렌더에서 검은 사각·실루엣 0 (③ 아이콘 SVG 도형 사용) · 마스코트 base64 embed 정상 · L1+L2 병합 값 확인

## Issue320: ig·ppt·cartoon 설계 2차 정합 — 글로벌 8/11~8/17 변경 반영 (등록: 2026-08-18, 해결: 2026-08-18, commit: 90cf746) ✅
* 완료 실측: `ig-ppt-integration.md` 에 igsvg 대조 게이트·카툰 편입 경로 절 신설 + 미해결 4건 재판정(위임 1·유지 1·판정 완료 3) 반영. `issue-rules.md` 완료 섹션명 표기 정정(구 `🏁 완료-해결순` → 실물 `✅ 완료`). ⚠️ `_doc_arch/` 는 gitignore(로컬 전용)라 커밋은 룰 정정분만 담김
* 목적: 1라운드(Issue309~319) 종결 이후 글로벌 *-maker 쪽에 들어온 변경(prj3 Issue382~388·412·425·426)을 m2slide 통합 SSOT 에 반영하고, [`ig-ppt-integration.md`](_doc_arch/ig-ppt-integration.md) 미해결 4건 + 상위 설계([`pptx-scar.md`](file:///Users/nowage/.claude/_doc_arch/pptx-scar.md) §8 "prj42 수정 필요 3건" 중 잔여 2건)를 재판정해 결정을 박제한다. 검토 결론 — **글로벌 *-maker 는 수정 불요**, m2slide 쪽 문서·배선 갱신으로 전부 흡수된다.
* 상세:
    - 반영 대상 글로벌 변경: `igsvg` 대조 게이트 재정의(prj3#388 — 입력을 5.svg 고정에서 해제, 기준은 `7.pptx` 문구·우회 플래그 없음) · `7.svg` 생성 주체 확정(#383 — 에이전트가 그리고 igsvg 는 판정만) · agent id 형식 집행(#384) · `.ready` `seeded_by` 쓰기 권한 확대(#382) · ig-selector 갈래 2 = promo-cartoon 위임(pptx-scar §6-1-c P5)
    - 재판정 ①: 상위 설계 §8-2 `Projects/_ppt/` 공용 자산 루트 — **신설하지 않음**. m2slide 는 프로젝트=덱 단위고 테마가 프로젝트마다 다르다. `Projects/<N>/ppt/_asset_ppt` 상향 탐색 공유(Issue310)로 충분
    - 재판정 ②: 파이프라인 단계 5 선별 자동화 — **사람 지목 유지**. 팬아웃·승인 게이트는 ig-selector 소유(Issue313)라 m2slide 가 자동화하면 게이트 우회가 된다
    - 재판정 ③: `pptx.yml` 전 프로젝트 롤아웃 — **옵트인 유지**(필요 프로젝트만 템플릿 복사). 근거: ppt/ 폴더는 덱 작업이 실제로 있는 프로젝트에만 의미가 있다
    - 부수 정정: [`.claude/rules/issue-rules.md`](.claude/rules/issue-rules.md) 의 완료 섹션명 기술(`🏁 완료-해결순`)이 실제 파일(`✅ 완료`)·상위 videoMaker 규칙(2026-05-10 단일화)과 어긋남 — 실물에 맞춰 정정
* 구현 명세:
    - `_doc_arch/ig-ppt-integration.md` 섹션 단위 Edit — "알려진 편차·미해결" 4건 재판정 결과 반영 + igsvg 게이트·카툰 편입 경로 절 추가
    - `.claude/rules/issue-rules.md` 완료 섹션명 정정
    - 검증: 문서 내 죽은 참조 0 · 미해결 마커 잔존은 근거와 함께만

## Issue317: ppt-check 검증 배선 + m2slide lint 통합 (등록: 2026-08-11, 해결: 2026-08-11, commit: 647db93) ✅
* **결정: 경고가 아니라 차단** (2026-08-11). 근거 — `check-conform` 의 FAIL 은 *"PowerPoint 가 거부하거나 깨져 보이는 위반"*이다. 통과시키면 `index.html` 에 다운로드 버튼까지 달려 배포된다. [`build-pptx.sh`](lib/pptx/build-pptx.sh) 가 구 pandoc 직접 경로로 **폴백하지 않는 것과 같은 이유**이며(성공으로 보이는 품질 회귀 차단), `--pptx` 는 옵트인 경로라 기본 빌드(`./m2slide.sh <P>`)에는 영향이 없다
* **심각도 구분은 m2slide 가 하지 않는다.** FAIL/WARN 은 `check-conform` 이 이미 가르며 WARN 은 rc0 이라 통과한다 — igTest 35장 실측 `FAIL 0 · WARN 1`(템플릿 밖 폰트 Courier)에서 빌드 성공. m2slide 가 자체 임계를 또 두면 판정이 두 곳으로 갈라진다
* **배선 결함 발견·수정**: 기존 코드는 검증 실패를 `❌ Failed to generate PPTX` 로 보고했다 — 파일은 생성됐는데 생성 실패라 하고, "pandoc 이 처리 못 하는 문법" 을 의심하라고 오도했다. `build-pptx.sh` 가 **산출 파일 갱신 여부**로 두 사건을 가른다 (rc 2 = 검증 실패·파일 있음 / rc 1 = 생성 실패·파일 없음). 낡은 산출물이 남아 있어도 mtime 비교로 오분류하지 않는다
* **`--pptx-no-verify` 신설**: 차단을 의도적으로 넘길 때만. 산출물이 규격을 지킨다는 뜻이 아니므로 통과 시에도 생략 사실을 출력한다
* 실측 5종 전부 확인 — 정상 `rc0` · 검증실패 `rc2` → m2slide.sh `exit 1`(이때 `index.html` 갱신도 건너뛰므로 실패한 덱에 다운로드 버튼이 붙지 않는다) · 생성실패 `rc1` · 낡은 산출물 잔존 시 오분류 0 · `--pptx-no-verify` `rc0`
* ⚠️ **`--lane a` 필수** — `check-conform` 기본값은 `b`(인포그래픽)이고 그 lane 은 본문 이미지를 위반으로 본다. m2slide 덱은 lane A 라 mermaid 렌더 이미지가 **정상 콘텐츠**인데 기본값으로 재면 FAIL 이 뜬다. 같은 pptx 실측: `--lane a` rc 0 / lane 미지정 rc 1. `md2pptx.py` 는 이미 `--lane a` 로 부르므로 **손으로 재검할 때만** 문제가 된다 → 3곳에 명시([`build-pptx.sh`](lib/pptx/build-pptx.sh) 주석·실패 안내문·[`CLAUDE.md`](CLAUDE.md)·[`apply-verify-rules`](.claude/rules/apply-verify-rules.md) §4.7)
* 목적: PPTX·인포그래픽 산출을 "성공했다"가 아니라 **검증 통과**로 판정한다.
* depends: Issue314, Issue315
* 상세:
    - 글로벌 `ppt-check` 는 검증 5종 보유(PowerPoint 가 거부하는 위반 포함) — m2slide 자체 lint(`--lint-deployment`·`--lint-data`·`--lint-license`)와 역할이 겹치지 않음
* 구현 명세:
    - `--pptx` 산출 직후 `ppt-check` 자동 실행, 실패 시 rc≠0 로 빌드 실패 ✅ — `md2pptx.py` 가 `check-conform`(`--lane a`) + `check-xml-order` 를 내장 실행하고, 그 rc 가 `build-pptx.sh` → `m2slide.sh` 로 전파된다
    - [`apply-verify-rules`](.claude/rules/apply-verify-rules.md) 의 lint 목록에 항목 추가 ✅ — §4.7 신설. **lint subcommand 가 아니라 `--pptx` 빌드 내장**이라는 점을 목록에 명시

## Issue313: ig-selector 비용 게이트 배선 — 자동 팬아웃 금지 (등록: 2026-08-11, 해결: 2026-08-11, commit: ca62a88, fb49bbe, 7373785, 55e5895) ✅
* 완료 실측 (2026-08-11, `Projects/igTest` 35장 덱): 스모크테스트 5개 단언 전부 통과 — 10장 `exit 4` / 9장 `exit 0`(임계 경계) · 파이프 삼킴 재현 · pipefail 시 4 보존 · 실덱 후보 6장이 프로젝트 임계 초과로 `exit 4`. 회귀 러너 [`z_test/ig-ppt/0.cost-gate.sh`](z_test/ig-ppt/0.cost-gate.sh) — ig-maker 를 돌리지 않으므로 **비용 0**
* ⚠️ **등록 당시 가정이 반증됐다.** "덱이 20~40장이라 기본 임계에 거의 항상 걸린다"는 틀렸다 — 게이트가 세는 것은 **덱 장수가 아니라 후보 장수**이고 분류기가 크게 걷어낸다. 35장 → 후보 6장(17%) = 198만 토큰인데 기본 임계(warn 5 · hard 10)에서 **rc0 통과**했다. 즉 기본값은 m2slide 덱에서 사실상 무동작이며, 임계는 **올릴 것이 아니라 내려야** 한다
* 확정 임계: `warn_pages: 2` · `hard_pages: 3` ([`ig-selector.yml.template`](data/ppt-integration/ig-selector.yml.template) 에 주석 해제 반영). 근거 — warn 2 는 Issue319 가 회귀 러너 팬아웃 상한으로 이미 확정한 값, hard 3 은 99만 토큰·75~90분으로 한 세션 무인 실행 상한선
* ⚠️ **삼킴 경로는 파이프로 특정됐다.** `igselect cost ... | tee log` 의 rc 는 마지막 명령의 것이라 `exit 4` 가 `0` 으로 바뀐다(실측). 파이프가 필요하면 `set -o pipefail` 을 함께 건다 — 명령치환(`$(...)`)은 rc 를 전파하므로 안전
* 부수 정정: [`data/ppt-integration/README.md`](data/ppt-integration/README.md) 의 "임계를 낮추면 팬아웃이 는다" 는 방향이 반대였다 — 팬아웃을 늘리는 쪽은 **올리는** 재정의다
* 목적: 장당 **33만 토큰·25~30분**(글로벌 실측)인 ig-maker 를 파이프라인이 조용히 N장 돌리는 사고를 구조적으로 차단한다.
* depends: Issue312
* 상세:
    - 선별·승인·팬아웃·조합·발행은 전부 `ig-selector` 소유 — m2slide 가 팬아웃을 **가져오지 않는다**(글로벌 사용자 결정 2026-08-09). m2slide 는 호출과 결과 회수만
    - 픽스처의 `Projects/igTest/.claude/ig-selector.yml` 은 **git 미추적**이다(igTest 자체가 미추적). 템플릿 복사로 언제든 재생성된다
* 구현 명세:
    - `Projects/<Name>/.claude/ig-selector.yml` 부분 재정의 템플릿 + 판정 축 문서화 ✅ — 부분 재정의 동작 확인(`cost.warn/hard` 만 교체, `tokens_per_page`·`text.*` 등 기본값 보존)
    - media-creater 가 인포그래픽을 여러 장 요구할 때 **일괄 자동 실행 금지** ✅ — `tools.yml` `ig_maker.gate` 에 삼킴 경로·임계 실측 추가
    - exit 4 를 rc0 으로 뭉개는 wrapper 금지 — 스모크테스트로 확인 ✅

## Issue319: 소규모 테스트 픽스처 + 회귀 러너 (등록: 2026-08-11, 해결: 2026-08-11, commit: d6e1aaa, 2dc8453, fea7dbc) ✅
* 완료 실측: 러너 2종 전부 통과. 픽스처는 `Projects/igTest`(git 미추적, playground 원본 복사로 재생성). ⚠️ 러너 작성 중 오탐 2건을 겪음 — ig-maker 가 헤더 주석에 규약 문구(`@import 0`)와 제거 대상 문자열(`4 › 23 / 39`)을 그대로 인용하므로 **XML 주석을 먼저 걷어내고 `<text>`/`<tspan>` 렌더 텍스트만 판정**해야 한다
* 목적: 통합 검증을 **적은 페이지**로 돌린다. 40장짜리 실덱으로 검증하면 ig-maker 비용(장당 33만 토큰)과 회귀 원인 격리 난이도가 동시에 폭발한다.
* depends: Issue309
* 상세:
    - 픽스처 `Projects/igTest` 배치 완료 (2026-08-11) — `~/.claude/playground/resource/m2slide` 소스 복사(markdown 5챕터 + `_config.yml` + `VERSION` + `Info.md`). 빌드 산출물·`_pipeline/` 은 복사하지 않음
    - **페이지 수 기준이 둘이라 혼동 주의** — playground `test_task_define.md` 의 "9 페이지"는 **pandoc 슬라이드(H1 기준)** 이고, 같은 원고를 m2slide 로 빌드하면 **39 슬라이드**다(실측: 7+7+8+10+7). 인포그래픽 대상 "6·7 페이지"는 전자 기준(04-strengths · 05-wrap-up 진입 장)
    - 픽스처는 **git 미추적**이다 — `Projects/.gitignore` 가 `Projects.md` publishing 열에서 생성되고 igTest 는 발행 대상이 아니다. 재생성은 playground 원본 복사로 언제든 가능하므로 추적하지 않는다([repo-tracking-rules](.claude/rules/repo-tracking-rules.md) 판정 4)
    - ⚠️ `./m2slide.sh --sync-projects` 는 `Projects/.gitignore`·`Projects_org.md` 를 **함께** 갱신하며, 실행 시 기존 미추적 프로젝트 3건(AgenticCoding·StellarEvolution·graphify)이 추적 목록에 추가되는 부작용이 관측됐다(2026-08-11, revert 처리). 픽스처 작업 중 무심코 커밋하지 말 것
* 구현 명세:
    - playground 6종 중 **1·2번을 m2slide 쪽 러너로 이식** — `z_test/ig-ppt/{1.infographic,2.deck}/run.sh`. 각 run.sh 는 playground 원본을 인용하되 입력을 `Projects/igTest` 로 바꾼다
    - 통과 조건은 playground `test_task_define.md` 를 그대로 인용 — 1번: 2장·이미지 0·원본 문구가 편집 가능한 도형 텍스트로 존재·회귀 `summary` / 2번: 3장·accent 색 반영·`#layout-*` 누출 0·회귀 `convert`(어휘 커버리지 90%↑)
    - `ppt-check --baseline Projects/igTest --regress-mode <mode> --strict` 로 판정
    - 비용 상한 명시 — 1번은 팬아웃 0(ppt-info 블록 데이터), ig-maker 팬아웃이 붙는 경로는 **2장 이하**로 제한

## Issue318: 문서·룰 동기화 (등록: 2026-08-11, 해결: 2026-08-11, commit: 4235c61, fb49bbe) ✅
* 목적: 통합 결과를 CLAUDE.md·룰·설계 문서에 반영해 다음 세션이 같은 조사를 반복하지 않게 한다.
* depends: Issue312, Issue315
* 구현 명세:
    - [`CLAUDE.md`](CLAUDE.md) — PPTX 변환 절(현 pandoc 직접 안내)을 ppt-deck 경유로 갱신
    - [`_doc_arch/authoring-pipeline.md`](_doc_arch/authoring-pipeline.md) 단계 5 갱신 · [`.claude/rules/data-access-rules.md`](.claude/rules/data-access-rules.md) 단계별 data 접근표에 ig 관련 항목 반영 여부 판정
    - [`_doc_arch/ig-ppt-integration.md`](_doc_arch/ig-ppt-integration.md) 의 미해결 마커(🚧/🔧) 정리

## Issue316: theme CSS → reference.pptx 2단 배선 (등록: 2026-08-11, 해결: 2026-08-11, commit: 9c94d97) ✅
* 목적: PPTX 가 m2slide 덱과 **같은 팔레트**를 쓰게 한다. 이 단계를 빼면 덱은 나오지만 색이 원본과 무관해진다(playground 실측: accent 검출 0회).
* depends: Issue315
* 상세:
    - **범위 축소 (2026-08-11 실측)** — "조사"가 아니라 **이미 있는 2단 파이프 배선**이다:
        1. [`theme-from-css.py`](file:///Users/nowage/.claude/skills/ppt-spec/scripts/theme-from-css.py) `<m2slide루트> --theme <name> --palette <p> --name <테마명> --out theme.yml` — `theme/<name>/slide.css`·`palettes/<p>.css` 를 실측하고, 없으면 `slide/css/custom.css` 로 폴백한다. `[data-palette="X"]` 스코프 병합까지 지원
        2. [`theme2reference.py`](file:///Users/nowage/.claude/skills/ppt-deck/scripts/theme2reference.py) `theme.yml --out reference.pptx --adapt` — 그 테마를 pandoc reference-doc 으로
    - 즉 m2slide 가 할 일은 `_config.yml` 의 `theme:`·`palette:` 값을 두 스크립트에 **그대로 전달**하는 것뿐이다. 손으로 만든 potx 는 선택 사항으로 남는다
* 구현 명세:
    - `_config.yml` 의 `theme`·`palette` 를 읽어 `--theme`·`--palette` 로 전달 (파서는 [`lib/config.js`](lib/config.js) 가 이미 해석)
    - 산출 `theme.yml`·`reference.pptx` 위치는 덱 작업 폴더(`ppt/<ppt명>/_asset_ppt/`·`_source/`) — Issue310 경로 규약을 따른다
    - 사용자 지정 potx 를 우선하는 override 경로를 남길지 설계에서 확정
    - 검증: 산출 pptx 에서 m2slide accent 색 검출 ≥1회 (playground 2번 케이스 기준)

## Issue315: `m2slide.sh --pptx` → md2pptx.py 배선 (테마 반영) (등록: 2026-08-11, 해결: 2026-08-11, commit: 9c94d97) ✅
* 완료 실측 (igTest): accent 검출 17회 (구 경로 0회) · Malgun Gothic 193회 (0회) · `#layout-*` 누출 0건 (5건) · 전체 변환 35장 FAIL 0. 회귀 러너 [`z_test/ig-ppt/2.deck.sh`](z_test/ig-ppt/2.deck.sh) 4항목 통과
* 목적: PPTX 산출이 테마를 잃는 현 상태를 고친다. pandoc 직접 호출을 글로벌 `ppt-deck` 의 **m2slide 전용 진입점**으로 교체한다.
* depends: Issue309
* 상세:
    - 현재 코드: `m2slide.sh` PPTX 블록이 single/chapter 분기 후 `pandoc ... -o "$PPTX_OUTPUT"` 직접 호출. `--reference-doc` 없음 → 조직 서식·테마 전무
    - **범위 축소 (2026-08-11 실측)** — 쓸 도구는 `deck.py` 가 아니라 [`md2pptx.py`](file:///Users/nowage/.claude/skills/ppt-deck/scripts/md2pptx.py) 다. `--m2slide <프로젝트폴더>` 플래그가 `markdown/*.md` 를 자동 수집(AGENDA 제외·이름순)하고 `--pages 1-3` 부분 변환·`#layout-*` 지시자 제거까지 이미 처리한다. 문서 예시 자체가 이 repo 경로(`m2slide/Projects/fPmIntro_en`)를 가리킨다
    - **순환은 `deck.py` 경로에만 있다** — `deck.py` 폴백 ①이 `m2slide.sh` 로 되위임하므로 그 경로를 쓰면 `m2slide.sh → deck.py → m2slide.sh` 무한 재귀가 된다. `md2pptx.py` 직접 호출은 이 재귀가 성립하지 않는다. 만약 `deck.py` 를 쓰기로 바꾸면 `--force-lane a` 가 필수
    - reference 는 [`theme2reference.py`](file:///Users/nowage/.claude/skills/ppt-deck/scripts/theme2reference.py) 가 theme.yml 에서 만든다(Issue316) — lane A 가 색을 물려받는 유일한 경로
* 구현 명세:
    - `m2slide.sh` PPTX 블록 교체 — `python3 ~/.claude/skills/ppt-deck/scripts/md2pptx.py --m2slide "$PROJECT_DIR" --reference "$REF" -o "$PPTX_OUTPUT"` (single/chapter 분기는 `--m2slide` 가 흡수하는지 실측 후 결정)
    - `ppt-deck`·pandoc 미설치 시 **기존 pandoc 직접 경로로 폴백하지 말 것** — 조용한 품질 회귀. 명시적 안내 후 종료
    - 회귀 검증은 Issue319 픽스처로 — `./m2slide.sh igTest --pptx` (전체) + `--pages 1-3` 부분 변환. 통과 조건은 playground 2번 케이스와 동일(3장 · accent 색 반영 · `#layout-*` 누출 0)
    - 옵션 키가 추가되면([`_config.yml`](_config.org.yml) `pptx_reference` 등) [`config-sync-rules`](.claude/rules/config-sync-rules.md) 4곳 동기화 의무

## Issue314: ig 산출 SVG 의 배포 규약 검증 (등록: 2026-08-11, 해결: 2026-08-11, commit: 9a5f7cb, 2dc8453) ✅
* 목적: ig-maker 가 발행한 `img/{ppt명}-{장표번호}.svg` 가 m2slide 의 단일 파일 배포 규약을 깨지 않는지 보장한다.
* depends: Issue312
* 상세:
    - [`file-deployment-rules`](.claude/rules/file-deployment-rules.md): 빌드 산출물은 임의 단일 `.html` + 동일 디렉토리 `img/` 만으로 `file://` 동작해야 함. SVG 내부의 외부 폰트·`@import`·remote href 는 위반
    - ig-maker 발행은 **복사**(symlink 아님)라 `slide/img/` 자동 복사 규약과 충돌 없음 — 실측으로 확인
* 구현 명세:
    - `./m2slide.sh --lint-deployment <project>` rc0
    - SVG 내 외부 참조 검사 항목 추가 검토(현 lint 패턴은 localhost·절대경로 중심)
    - 대표 슬라이드 1장 `file://` 직접 열기 육안 검증

## Issue312: media-creater 에 ig_maker 도구 등록 + design_html orphan 정리 (등록: 2026-08-11, 해결: 2026-08-11, commit: ca62a88, 8fad72b) ✅
* 완료 실측: `ig_maker` 도구로 실제 SVG 1장 산출 → 슬라이드 반영까지 확인. 구 `design_html` 은 handler 부재 orphan 이었음이 확정됐고 참조 3곳(tools.yml 2 · agent md 1) 전부 정리
* 목적: 파이프라인 단계 5(media-creater)가 인포그래픽 요구를 ig-maker 로 라우팅하게 하고, 실체 없는 `design_html` handler 를 정리한다.
* depends: Issue309, Issue311
* 상세:
    - `design_html` 은 `delegate_skill: design-html` 을 가리키나 그 스킬이 **존재하지 않음**(실측). 선택지는 ① 제거 ② ig_maker 로 대체 ③ 실제 스킬 신설 — 설계(Issue309)에서 확정
    - `type: infographic` 라우팅 순서를 재정의: 구조적 텍스트·기존 그래픽 → ig_maker, 단순 관계도 → mermaid, 데이터 그래프 → d3, SmartArt 형 → htmlart
* 구현 명세:
    - `data/media-creater/tools.yml` 수정 — **수정 직전** `./lib/tuner/backup-data-yml.sh data/media-creater/tools.yml` 필수([data-access-rules](.claude/rules/data-access-rules.md))
    - 정책 yml 변경은 **단독 커밋**(코드·산출물 동반 금지). 커밋 메시지에 근거 명시
    - [`.claude/agents/media-creater.md`](.claude/agents/media-creater.md) 의 "design-html 인포그래픽" 절 동기 수정
    - `./m2slide.sh --lint-data` rc0 확인

## Issue311: 슬라이드 캡처 브리지 — md 덱 → ig-maker 입력 (등록: 2026-08-11, 해결: 2026-08-11, commit: 9a5f7cb) ✅
* 목적: ig-maker 입력 계약(이미지 1장)과 m2slide 원본(md)의 간극을 메운다. 대상 슬라이드를 PNG 로 렌더해 ig-maker 에 넘기는 단일 경로를 만든다.
* depends: Issue310
* 상세:
    - 기존 자산 재사용 우선: [`lib/slide_capture/`](lib/slide_capture/) (Puppeteer) · dev-server solo view `/p/<P>/s/<chap>/<slide>` · [`.claude/skills/slide-compare`](.claude/skills/slide-compare) — **새 캡처기를 만들지 않는다**
    - 캡처 출력은 [`capture-output-rules`](.claude/rules/capture-output-rules.md) 를 따라 `_doc_work/capture/` 하위. ig-maker `_org/` 투입은 복사로 처리
    - 슬라이드 번호 ↔ ig-maker `{장표번호}` 매핑 규칙 확정 필요 — m2slide 는 `chap/slide` 2축, ig-maker 는 단일 장표번호
* 구현 명세:
    - `lib/ppt-integration/capture-for-ig.sh` (또는 python) — 입력 `<Project> <chap> <slide>`, 출력 `_doc_work/capture/ig/<Project>-<chap>_<slide>.png` + `_org/` 복사
    - dev-server 미기동 시 자동 `--serve start` (idempotent)
    - 실패는 fail-loud — 캡처 실패를 무시하고 빈 이미지로 진행 금지

## Issue310: 프로젝트별 `.claude/pptx.yml` 경로 규약 도입 (등록: 2026-08-11, 해결: 2026-08-11, commit: fb49bbe) ✅
* 목적: ig-maker 4키(`asset_root`·`ppt_root`·`out_root`·`publish`)를 m2slide 프로젝트 구조에 착지시켜, 어느 덱에서 실행해도 산출물이 그 덱의 `img/` 로 발행되게 한다.
* depends: Issue309
* 상세:
    - ig-maker `igpath.py` 는 `.claude/pptx.yml` 을 **상향 탐색 8단계·가장 가까운 하나만** 채택(병합 안 함). 상대경로 기준은 `.claude/` 의 부모
    - m2slide 는 `Projects/<Name>/` 이 덱 단위이므로 `Projects/<Name>/.claude/pptx.yml` 이 자연스러운 자리 — repo 루트 `.claude/` 와 충돌하지 않는지 실측 필요(루트에 pptx.yml 을 두면 모든 덱이 같은 ppt_root 를 물어 사고)
* 구현 명세:
    - 템플릿 `data/ppt-integration/pptx.yml.template` 신설 (`ppt_root: ppt/{ppt명}` · `publish: img/`)
    - 파일럿 1개 프로젝트에만 실배치(`Projects/m2Slide_chapter_mode/`) — 전 프로젝트 롤아웃은 검증 후 별도
    - `python3 ~/.claude/skills/ig-maker/scripts/igpath.py resolve --start Projects/<Name> --json` 이 의도한 4키를 내는지 실측 로그를 이슈에 첨부
    - `ppt/` 작업 폴더는 중간 산출물(`_source/`·`_org/`)을 담으므로 `.gitignore` 판정 필요 — [`repo-tracking-rules`](.claude/rules/repo-tracking-rules.md) 절차 적용

## Issue309: ig-maker·ppt-maker 통합 설계 SSOT 작성 (등록: 2026-08-11, 해결: 2026-08-11, commit: fea7dbc) ✅
* 목적: 글로벌 SCAR 로 완성된 `ig-maker`(인포그래픽)·`ppt-maker`(덱) 계열을 m2slide 의 **인포그래픽 생성기**·**PPT 생성 옵션** 자리에 붙이기 위한 경계·계약·순환 위험을 하나의 설계 문서로 확정. 후속 이슈 전부가 이 문서를 근거로 움직인다.
* 상세:
    - 사전 분석 결과 3건이 이 문서의 출발점:
        1. **PPTX 경로 결함** — 현재 [`m2slide.sh`](m2slide.sh) `--pptx` 는 `pandoc <md...> -o x.pptx` 직접 호출이라 `--reference-doc` 이 없다. 테마·layout·htmlart 가 전부 소실되고 Calibri 기본 서식으로 나온다. 글로벌 `ppt-deck` lane A(`--adapt` + `--reference`)가 정확히 이 결함을 메우는 도구다
        2. **순환 위험(크리티컬)** — `ppt-deck` 의 폴백 ①은 *"프로젝트에 m2slide 가 있으면 `m2slide.sh` 에 위임"* 이다(`deck.py:66-79`). m2slide 가 무조건 `ppt-deck` 를 부르면 **상호 재귀**가 된다. 반드시 `--force-lane a` 로 ①을 봉인해야 한다
        3. **인포그래픽 handler 공백** — [`data/media-creater/tools.yml`](data/media-creater/tools.yml) 의 `design_html` 은 `handler: design-html` / `delegate_skill: design-html` 을 가리키는데 **그 스킬이 글로벌·로컬 어디에도 없다**(실측 2026-08-11). `type: infographic` 도구 중 실동작하는 것은 `d3_inline` 뿐이고, 나머지 인포그래픽 요구는 htmlart·mermaid 로 흘러간다 — "인포그래픽 품질이 나쁘다"는 사용자 관측의 구조적 원인
    - ig-maker 는 **m2slide host 규약을 이미 문서화하고 있다** — `Projects/{name}/.claude/pptx.yml` 에 `ppt_root`·`publish: img/` 를 적으면 `_source/{장표번호}/7.svg` → `img/{ppt명}-{장표번호}.svg` 로 발행된다. 즉 m2slide 쪽은 **소비 배선만** 만들면 된다(글로벌 SCAR 수정 불필요)
    - 입력 계약 불일치가 유일한 실질 간극: ig-maker 입력은 **이미지 1장 또는 pptx/pdf 페이지**인데 m2slide 원본은 md 다 → 캡처 브리지가 필요(Issue311)
    - **선행 실측 자산 발견 (2026-08-11)** — `~/.claude/playground/` 에 테스트 6종(`0.zero_base`~`5.doc_to_ppt`)이 정의·실행되고 있고, 그중 **1번(m2slide 인포그래픽 업그레이드)·2번(m2slide 원고→덱)** 이 본 통합의 두 목표와 동일하다. 각 케이스의 `run.sh` 가 곧 참조 구현이며 `test_task_define.md` 가 통과 기준·회귀 모드를 정의한다. 설계 SSOT 는 이것을 **재발명하지 말고 인용**한다
    - 그 결과 이미 구현된 것이 3종 확인됨 — `ppt-deck/scripts/md2pptx.py --m2slide <프로젝트> --pages 1-3`(m2slide 전용 진입점, `deck.py` 순환 우회) · `ppt-spec/scripts/theme-from-css.py <m2slide루트> --theme --palette`(theme CSS·palette 실측 → theme.yml, `slide/css/custom.css` 폴백 포함) · `ppt-deck/scripts/theme2reference.py`(theme.yml → reference.pptx). Issue315·316 은 **신규 개발이 아니라 배선**으로 축소됐다
* 구현 명세:
    - `_doc_arch/ig-ppt-integration.md` 신설 — 경계표(무엇을 글로벌이 갖고 무엇을 m2slide 가 갖나) · 순환 방지 규약 · 4키 경로 매핑 · 비용 게이트 소유권 · 산출물 배포 규약
    - 글로벌 SCAR(`~/.claude/skills/ig-*`·`ppt-*`)는 **읽기만** 한다. 수정 필요가 발견되면 `~/.claude/Issue.md` 에 이슈 등록 후 별도 세션(global-scar-change-rules)
    - 기존 문서와의 관계 명시: [`_doc_arch/authoring-pipeline.md`](_doc_arch/authoring-pipeline.md) 단계 5(media-creater) · [`_doc_arch/component-slide.md`](_doc_arch/component-slide.md) · `data/htmlart/`

## Issue308: 호문쿨루스 학습 결과를 policy 로 받는 파일럿 (등록: 2026-08-03, 해결: 2026-08-03, commit: 46966f4) ✅
* 목적: prj3(`~/.claude`) 가 학습(instinct) → policy yml **제안** 컴파일러를 완성했다(Issue334 P4-2). 본 프로젝트는 그 첫 소비처다. *"쓰다 보면 policy 가 생기는"* 파이프라인이 실제로 도는지 note-writer **1개 stage 로 검증**.
* depends: prj3#Issue334
* trigger: prj3#Issue334 P4-2 ✅ 완료 (commit e9c4324) → **충족** — `hooks/policy-compile.py` 실존 확인 후 진행
* 완료 범위:
    - `.claude/policy-map.yml` 신규 — note-writer stage → `data/note-writer/patterns.yml`의 `tone_presets` 컬렉션 매핑. 필드 `id`(copy) · `trigger`(keywords, 사람이 채움) · `confidence`(enum high≥0.8/medium≥0.6/low) · `action`(text, instinct `## Action` 절 추출 → `style`). `sink`는 파일럿 검증용 고정 프로젝트 `Projects/m2Slide_chapter_mode/_pipeline/policy`로 명시 — m2slide가 `Projects/<N>` 다건 저장소라 매핑 하나로 "실 배포 시 어느 프로젝트에 착지시킬지"까지는 못 정한다는 한계를 주석으로 남김(후속 과제)
    - `_doc_arch/pipeline-policy-cascade.md` "병합 알고리즘" 절에 캐비앗 추가 — 리스트 컬렉션에 delta-only 제안을 그대로 L2 적용하면 deep-merge의 "리스트 전치환" 시맨틱 때문에 L1 기존 항목이 전멸함을 실측 근거로 명문화(아래 검증 참조)
* 검증 (2026-08-03):
    - **① 매핑 문법**: `python3 ~/.claude/hooks/policy-compile.py --project . --list` → 매핑 파싱 성공, "instinct 없음"(m2slide 실 instinct 0건, 선행 조건대로) 정상 보고 — rc1(엔진 사양대로 정상 종료 코드)
    - **② 드라이런**(선행 조건이 명시한 "타 프로젝트 instinct로 드라이런" 경로): `--project ~/work/AgenticCoding-lec --map .claude/policy-map.yml`로 workflow 도메인 instinct 1건(`diagram-asset-generation`, confidence 0.85) 컴파일 → `trigger: [] # __NEEDS_HUMAN__`(키워드 미채움 정상) · `confidence: high`(0.85→high 임계 정확) · `style`에 `## Action` 본문 정확 추출. keywords/enum/text 3핸들러 전부 정상 동작
    - **③ L2 착지 스모크테스트**: `__NEEDS_HUMAN__`를 사람이 채운 뒤 `Projects/m2Slide_chapter_mode/_pipeline/policy/note-writer.yml`에 임시 착지 → `./m2slide.sh --lint-data` rc0(스키마 위반 0건). 검증 직후 원복 — 해당 instinct는 m2slide 소유가 아니고 내용도 "노트 톤"이 아닌 "다이어그램 생성 워크플로"라 실 채택 대상이 아님(파이프라인 동작 검증 목적 한정, 실제 채택 여부는 사람이 판단해 기각한 사례로 기록)
    - **발견**: `tone_presets` 같은 리스트 컬렉션은 deep-merge가 "치환"이므로 delta-only L2를 그대로 적용하면 L1 프리셋(`casual_lecture`·`formal_conference`·`workshop_handson`·`default`) 이 전멸 — `pipeline-policy-cascade.md`에 경고 반영. note-writer 뿐 아니라 리스트 형태 primary yml을 쓰는 모든 stage에 해당하는 일반 위험
    - `data-access-rules.md` 격리 위반 없음 — 본 작업은 note-writer stage 범위만 다뤘고 타 stage `data/` 접근 없음
* 범위 밖(후속 과제로 이월): 엔진 수정(prj3 소관) · 다른 stage 확대 · 자동 apply 배선 · m2slide 실 instinct 축적 후 재검증 · sink 프로젝트별 파라미터화(현재 매핑 1개 = 고정 sink 1개 한계)

## Issue305: 이미지 정밀 편집(색만·글자만 교체) 지원 (등록: 2026-07-23, 해결: 2026-07-29, commit: 59405d7, cb52c5b, 958f816, 2c8a653) ✅
* 목적: schnell img2img 로는 부분 정밀 편집 불가(strength 0.3↑ 원본 복제 / 0.1 재해석 드리프트, 2026-07-13 실측). edit 전용 모델 기반 img-add `--edit` 모드를 media-creater 가 소비하여 슬라이드 이미지의 색·글자만 정밀 교체. Issue293 스타일 통일과 별개 기능.
* depends: prj3#Issue277
* trigger: prj3#Issue277 ✅ 완료 (img-add `--edit` 가용) + commit hash 기록 → **충족** (2026-07-29, commit a6f1b8b). 등록 시 차단 사유였던 fg1 모델 부재도 해소 — Kontext 는 `~/apps/flux/hf-cache/hub/models--black-forest-labs--FLUX.1-Kontext-dev` 에 설치됨(구 표기 `~/apps/flux/models/` 는 실경로 아님)
* 완료 범위:
    - `data/media-creater/tools.yml` — `tools.image_edit` 신설(handler img-add edit 모드, fg1 고정, when_to_use·invocation·limits·guard) + `processing_policy.precise_edit`(enabled_when 3조건·edit_type_map·instruction_format·output_naming `_edit` 접미·on_failure keep_original). `image_restyle` 과 배타이며 동시 매칭 시 precise_edit 우선
    - `.claude/agents/media-creater.md` — §3 "이미지 정밀 편집" 절 신설(진입 판정·명세 "편집 지시" 절 양식·img-add 호출 형태·편집 종류별 신뢰도 표), §7 체크포인트에 원본↔편집본 쌍·edit_type·지시문 보고 의무
    - 강등 금지 fail-loud 명문화 — edit 실패 시 img2img·jm4 로 조용히 대체 금지, 원본 유지 후 사유 보고
* 검증 (2026-07-29 fg1 FLUX Kontext 실측 2건):
    - **color ✅** — `Projects/MediaBackendTest/img/ramen-art.png` 그릇 금색→청색 교체. 면·젓가락·배경·나무 테이블·구도 전부 보존 (1024², steps 28, guidance 2.5, ~7분)
    - **text ⚠️ 조건부** — `Projects/AgenticCoding/img/s22_i1.png`(1793×843, 카드 4개) `(File Ops)`→`(File Work)`. 지시 대상 헤딩은 교체됐고 상단 2카드는 보존됐으나 **하단 2카드의 코드·한글이 gibberish 로 재생성**, 닫는 괄호도 유실. 증거: `_doc_work/capture/issue305-text-edit-evidence.png`(gitignore — 로컬 보존)
    - 위 실측을 `limits`·`edit_type_map`·`text_edit_gate`(라틴 문자 한정 · 텍스트 밀도 낮을 것 · 육안 확인 필수)에 박제. `region` 은 미검증으로 표기
    - `--lint-data` 통과 · 정책 yml 단독 커밋 + backup 선행(20260729-153832, 20260729-160352) 준수
## Issue307: 런타임 relax 게이팅 소비 — enforce 스캐너가 덱 purpose 로 룰 완화 (등록: 2026-07-23, 해결: 2026-07-29, commit: 6d22698, 700bcb3) ✅
* 목적: Issue295 가 정의한 축 2 필드(룰 `applies_to_purpose`/`relax_when` + Info.md `purpose`)를 enforce 스캐너(`lib/lint-policy-artifacts.py`)가 런타임 소비 — 대상 덱 `purpose.primary` 를 읽어 `relax_when` 매치 목적의 덱에서 위반 skip(광고·아카이브 덱 통짜 래스터 정당 허용).
* depends: Issue295
* 승격 (2026-07-29, `(!)` 제거): 소비 설계 `_doc_arch/policy-goal-schema.md` "런타임 소비 게이팅" 절 확정 (commit 6d22698).
* 완료 범위 (구현 700bcb3):
    - `deck_purpose(proj)` — `Projects/<Name>/Info.md` frontmatter `purpose.primary`(yaml 블록 파싱, lint-policy-schema `_read_frontmatter` 동일 로직). 미기재/부재/무효 → lecture(안전 기본). `secondary` 무관.
    - `purpose_gates_out(rule, purpose)` — ① `applies_to_purpose` 존재 & purpose ∉ → skip · ② purpose ∈ `relax_when` → skip · ③ 그 외 정상. confidence 강도 판정 **앞단**, 두 축 직교.
    - 배선: 검사1(drop_redundant, machine_readable) + `_run_gated`(검사3~6). 검사2(hygiene)는 purpose-불변(내부표기 노출은 어느 덱이든 결함)이라 의도적 미게이팅. 완화 skip 카운트 로그 보고.
    - 골든 픽스처 `z_test/run-purpose-gate-fixture.sh` + `z_test/fixtures/policy/purpose-gate/` — 동일 위반이 promo 덱(relax_when:[promo]) skip / lecture 덱 검출 대조 고정.
* 검증: 신규 게이팅 픽스처 rc0(4단언) · `run-policy-fixture.sh`·`run-purpose-fixture.sh` 회귀 통과 · 실 repo `--lint-data` 통과(실 룰 relax_when 미보유 → 게이트 무발화, 회귀 0).

## Issue295: 덱 목적(purpose) enum 도입 — 정책 적용 강도의 덱 용도 스코프 (등록: 2026-07-20, 해결: 2026-07-23, commit: 7263d61, 795fde7) ✅
* 목적: 정책 룰이 모든 덱에 무차별 전역 강제되는 구조를 해소한다. 강의 덱에서 결함인 것(통짜 래스터·텍스트 미추출)이 광고 덱에서는 의도된 선택일 수 있으므로, 덱의 용도를 1급 메타로 두고 정책 적용 강도를 그 축으로 스코프한다.
* 스코프 결정 (2026-07-23 사용자 A 선택): 본 이슈 = **스키마·필드·수집·lint 검증까지**. 런타임 완화 게이팅 소비는 enforce 스캐너 부재(현 2종만)로 검증 불가 → Issue307 로 분리.
* 완료 범위:
    - 설계 SSOT `_doc_arch/policy-goal-schema.md`(로컬-전용, gitignore) "축 2 — 덱 목적(purpose)" 절 신설 — `purpose` enum 5종(lecture/info/promo/handout/archive) + `{primary,secondary}` 구조 + 룰 소비 필드 `applies_to_purpose`/`relax_when` + `confidence`×`purpose` 2차원 매트릭스. line32 `🚧 TODO` 해소.
    - 수집(7263d61): `data/info-filler/questions.yml` purpose 질문 1건(default lecture) + `data/Info.template.md` frontmatter `purpose` (canonical 위치).
    - lint(795fde7): `lib/lint-policy-schema.py` VALID_PURPOSE + 검사 10(룰 `applies_to_purpose`/`relax_when` 값 유효성) + 검사 11(Info.md `purpose` frontmatter enum·구조) + L2 override 반영. `--lint-data` 통과·purpose 미기재 aggregate info line(13개→lecture).
    - 골든 픽스처(795fde7): `z_test/run-purpose-fixture.sh` + `z_test/fixtures/policy/purpose/` negative — 검사 10·11 fail-loud 4건 회귀 고정.
    - 마이그레이션: `purpose` 미기재 = `lecture` 간주 — 기존 동작 회귀 0.
* 파급 지점 판정: `data/md-builder/styles.yml`·`data/slide-tuner/patterns.yml` 은 런타임 *소비* 지점이라 Issue307(스캐너 확장)에서 처리 — 본 이슈 미변경(회귀 0). 원 명세의 "--lint-data purpose 경고"는 aggregate info line 으로 구현(미기재 = 정상 fallback 이라 per-deck 경고는 노이즈).
* 검증: `./m2slide.sh --lint-data` 통과(goal 9룰 + 검사 10·11) · `z_test/run-purpose-fixture.sh` rc0 · `z_test/run-policy-fixture.sh` 회귀 통과. questions.yml backup 선행 + 정책/코드 커밋 분리.
* 근거 문서: `_doc_work/htm/hub_htm_20260720_192649_a_goal-taxonomy.htm`, plan `_doc_work/z_done/plan/purpose-enum_plan.md`

## Issue306: Issue304 goal 룰 5건 enforce 스캐너 + 골든 픽스처 (등록: 2026-07-23, 해결: 2026-07-23, commit: d7d514c) ✅
* 목적: Issue304 가 goal 스키마로 전환한 5룰의 `goal_check` 술어에 실제 산출물 판정 코드가 미구현이라 enforce 불가. 각 술어별 스캐너 + 골든 픽스처로 enforce 승격 기반 마련.
* depends: Issue304
* 완료 범위 — `lib/lint-policy-artifacts.py` 검사 3~6 신설 (파일명 아닌 속성 판정):
    - 검사 3 `h1_not_duplicate_title` (agenda 2룰): 첫 본문 H1 ↔ frontmatter.title·AGENDA 상위 제목 정규화 대조(선두 번호·강조 제거)
    - 검사 4 `note_not_echo_body` (note-writer): 노트 블록 ↔ `#id-` 대응 슬라이드 bullet `SequenceMatcher` 유사도 ≥0.9
    - 검사 5 `require_source_url` (media-creater): CREDITS.md(외부 CC 권위 목록) 항목 URL 존재 + 등재 이미지 사용 슬라이드 `::: source` 존재. CREDITS.md 보유 프로젝트 옵트인
    - 검사 6 `text_pattern_absent: \bSmartArt\b` (ppt2m2slide): `_pipeline` 옵트인 역변환 산출물 상표어 스캔(코드펜스 예외)
* confidence 게이팅: low=미적용(픽스처 검증만)·medium=warn·high=enforce. 5룰 전부 low → 실 프로젝트 무영향(회귀 0). evidence 축적 시 승격.
* 골든 픽스처 4종 (`z_test/fixtures/policy/{h1-dup-title,note-echo,source-attribution,smartart-hygiene}/`): 룰마다 위반 검출 + 오검출 방지 케이스. importlib 로 `check_*` 직접 호출(confidence 무관) — 파일명 의존 회귀 차단.
* 검증: `run-policy-fixture.sh` 회귀 통과(신규 11개 assert) + `./m2slide.sh --lint-data` rc0 + schema lint rc0. 정책 yml 미수정 → 커밋 규율 무관.
* 설계 SSOT: `_doc_arch/policy-goal-schema.md` "산출물 enforce 스캐너 (검사 9)" 절 추가.

## Issue304: Issue296 잔여 — 정책 goal 룰 5건 전환 (등록: 2026-07-23, 해결: 2026-07-23, commit: cc7c3bb, aa02a9b, 67e47aa, fa364e8, c8f5d92) ✅
* 목적: Issue296 파일럿(md-builder 3룰)에서 남긴 잔여 goal 전환 대상 5건. 각 룰이 목적 없는 플래그·주석 상태라 사례 A 형(파일명 의존 무력화)에 노출됨.
* 완료 범위 — 5룰 **goal-oriented 스키마 전환** (goal_type/goal/goal_check 속성 spec + detect_hints 로 기존 정규식·자연어 조건 이관, confidence: low):
    - agenda-designer 2건: `chapter_no_redundant_title_slide`·`h1_no_duplicate_with_title` → hygiene / `h1_not_duplicate_title` (cc7c3bb)
    - note-writer 1건: `no_verbatim_echo` → hygiene / `note_not_echo_body` (67e47aa)
    - media-creater 1건: `external_cc_source_attribution` 신설 → attribution / `require_source_url` (fa364e8)
    - SmartArt 상표어 1건: `smartart_trademark_hygiene` 신설(ppt2m2slide) → hygiene / `text_pattern_absent(\bSmartArt\b)` (c8f5d92)
* 판정 이탈 기록: SmartArt 룰은 이슈 상세가 "(consistency)" 라벨했으나 consistency 계열에 상표어 부재 술어가 없고 hygiene/`text_pattern_absent` 가 정확한 의미 → **hygiene 확정**(라벨보다 술어 정합성 우선, 룰 주석에 근거 기재).
* 인프라: `data/*` gitignore 화이트리스트에 note-writer·media-creater stage 누락분 추가 (aa02a9b) — 두 stage 정책 yml 추적 가능화.
* 검증: `./m2slide.sh --lint-data` 통과(goal 룰 9개 검사 4~8) + `z_test/run-policy-fixture.sh` 회귀 통과(산출물 위반 0·L2 override·텍스트 위생). 4개 yml 수정 전 backup 선행 + 정책 yml 단독 커밋 규율 준수.
* 후속: enforce **판정 코드(스캐너)·골든 픽스처**는 Issue306 으로 분리 (Issue304 자체가 "판정 코드는 룰별 후속"으로 프레임 — 현 스캐너는 text_pattern_absent·sole_image 2종만 구현). 스캐너 정착 후 confidence medium/high 승격.
* 근거 문서: `_doc_work/htm/hub_htm_20260721_215009_a_yml-audit.htm`

## Issue300: 슬라이드 부제목 표시 정책 결정 (등록: 2026-07-21, 해결: 2026-07-23, commit: d094fda) ✅
* 목적: 상위 프로젝트 videoMaker(prj41) Issue19에서 위임. videoMaker Issue9(2026-04-13, commit 8fddb16)로 frontmatter `subtitle` 렌더링 자체는 구현됐으나, "그대로 노출 / 제거 / 상위 주제 값으로 대체" 중 어느 정책을 취할지 미결정 상태였음.
* 결정: **(c) 현행 유지 확정** — frontmatter `subtitle` 값을 `_cover` layout `{{subtitle}}` slot 에 그대로 노출하는 현행 동작을 정책으로 확정. 코드 변경 없음.
* 근거:
    - subtitle 렌더 지점은 `_cover` layout 1곳뿐 (title-card 는 미표시) — 임시 상태가 아니라 이미 국소화된 명확한 동작.
    - `subtitle:` frontmatter 사용 프로젝트 21개 — (a) 제거·(b) 상위 주제 대체는 21개 데크 표시를 일괄 변경하는 회귀 리스크. (c) 는 회귀 0.
    - 저자가 frontmatter 에 subtitle 을 명시하는 것은 명시적 의도 — 자동 제거·대체보다 저자 입력 존중이 KISS.
* 정책 결정 폼: `_doc_work/htm/hub_htm_20260723_182841_b_subtitle-policy.htm` (사용자 (c) 선택)
* 후속: 상위 videoMaker(prj41) Issue19 에 "정책=현행 유지 확정" 결과 반영 필요 (본 repo 범위 밖).

## Issue303: data/htmlart/types.yml type_count drift 교정 (등록: 2026-07-23, 해결: 2026-07-23, commit: bc3e77d) ✅
* 목적: `data/htmlart/types.yml` `type_count: 26` 선언이 실제 타입 수(코드 `HTMLART_TYPES` Set 27 · yml 타입 키 27 · `_doc_arch` 문서 27종)와 어긋난 SSOT drift. Issue299 감사 중 발견(out-of-scope 로 이관됐던 건).
* 근본 원인: v6 serpentine `bend_process`(Issue218, Bending Process 흡수)가 타입 헤더 주석 열거에서 누락 → 열거 합계가 26 으로 고정. 코드·yml 키·설계문서는 27 로 정상이었음.
* 구현: `type_count: 26`→`27`, 헤더 주석 `26종`→`27종` + `v6 워크플로 1`→`v6 워크플로·serpentine 2`, `bend_process` 열거 행 추가.
* 검증: type_count 27 == yml 키 27 == 코드 Set 27 정합. `./m2slide.sh --lint-data` 통과. backup 선행(`data/htmlart/_backup/20260723-182041-types.yml`).

## Issue301: 챕터 경계에서 ←/→ 화살표 회색 노출 + 클릭 위임 (등록: 2026-07-21, 해결: 2026-07-23, commit: 3d44c4d) ✅
* 목적: 마우스/터치 클릭으로 다음/이전 페이지 이동 가능하게 함. reveal.js 기본 동작은 챕터 첫/마지막 슬라이드에서 ←/→ 컨트롤을 숨겨(`.enabled` 제거 + `disabled` 속성) 클릭 불가. m2slide는 챕터 경계에서 →가 다음 챕터, ←가 이전 챕터로 이어지므로 화살표를 숨기면 안 됨.
* 방향 전환 경위:
    - 최초(2026-07-21): 별도 원형 `m2-nav-arrows` 버튼을 8개 layout에 추가 → 사용자가 스크린샷으로 지적한 대상은 기존 reveal.js **다이아몬드 컨트롤**(우하단 마름모)이었음. 원형 버튼은 다이아몬드와 중복되는 오해석 → 전량 revert
    - 확정(2026-07-23): 기존 다이아몬드 nav의 ←/→를 ↑/↓와 동일하게 "항상 회색 노출 + 클릭 위임"으로 처리
* 구현 완료:
    - ✅ 원형 `m2-nav-arrows` 전량 제거: 8개 layout HTML(`theme/default/layouts/*.html` 7종 + `theme/default_lec/layouts/_contents.html`) + base.css CSS 블록 + html-builder.js `setupMobileNavigation` 함수
    - ✅ CSS(html-builder.js): `.navigate-left/-right`를 ↑/↓처럼 항상 `visibility:visible` + `opacity:0.25`(회색), reveal의 `.enabled` 있으면 `opacity:1`, hover 0.7. `body[data-nav-indicator="page"]` 숨김 규칙은 specificity로 여전히 우선(회귀 0)
    - ✅ JS(html-builder.js): `m2UpdateNavControls`에서 매 slidechanged마다 ←/→의 `disabled` 속성 제거(disabled 버튼은 click 미발화) + `Reveal.on('ready')`에서 ←/→ 클릭을 `ArrowLeft/ArrowRight` 키로 위임 → 기존 키 네비게이션 매트릭스(마지막→다음챕터, 첫→이전챕터) 재사용
    - ✅ 검증(m2Slide 프로젝트, Playwright): 챕터1 마지막(3/3) → navigate-right `disabled:false` `opacity:0.25` / 1클릭 → 안내 메시지 / 2클릭 → 챕터2(2/1) 이동 / 중간 슬라이드 단일 클릭 1칸 전진(메시지 없음) / `--lint-deployment` 통과
* 근본 원인: reveal.js가 끝단 슬라이드에서 nav 버튼에 `disabled="disabled"` 부여 → disabled 버튼은 click 이벤트 미발화(CSS `pointer-events`로 못 뚫음). slidechanged마다 `removeAttribute('disabled')`로 해소
* 후속(2026-07-23): 마지막 슬라이드에서 → 가 우측으로 삐져나오는 위치 버그 — reveal 기본이 비활성 ←/→에 `transform:translateX(±10px)`를 남기고 `.enabled`일 때만 `transform:none`으로 제자리 복귀시킴. 회색(비활성) 상태에도 항상 노출하므로 `.navigate-left/-right`에 `transform:none !important` 강제 → 활성/비활성 무관 마름모 정위치 유지. 검증: 마지막 슬라이드 → x=1663(뷰포트 1707 내), transform:none
* 캡처: `_doc_work/capture/issue301-last-slide-gray-arrow.png`, `_doc_work/capture/issue301-last-slide-arrow-fixed.png`

## Issue302: agenda markmap 챕터 노드 확장 미작동 — 평면 AGENDA 챕터에 슬라이드 children 부재 (등록: 2026-07-21, 해결: 2026-07-21, commit: e6897c7) ✅
* 목적: 서브챕터(`### [..]`) 없는 평면 챕터 데크는 agenda 목차 markmap 의 각 챕터 노드 `children` 이 빈 배열이라 펼침 원이 그려지지 않아, 노드를 클릭해도 확장이 일어나지 않았다. `parseAgenda` 가 AGENDA.md 의 서브챕터 엔트리에서만 children 을 만드는 구조적 한계.
* 상세:
    - 재현: 평면 5챕터 데크(fWarrangeCliIntro·fSnippetCliIntro·m2slide_info 등) 목차에서 챕터 노드 클릭 시 무반응. `tocData` 각 챕터 `children:[]` 확인.
    - 대조: fPmIntro 는 `### [1.1 ..]` 서브챕터 보유 → 정상 확장. 즉 빌드 회귀 아닌 콘텐츠 구조 한계.
* 구현 명세:
    - 수정: [`lib/generate-slides.js`](lib/generate-slides.js) — `parseAgenda` 직후 보강. children 이 빈 챕터 노드에 한해 이미 생성된 챕터 HTML 의 실제 slide `<section>` 순서를 harvest → 각 슬라이드를 `chapter.html#/N` cross-page 앵커 children 으로 채움.
    - 앵커 정확성: 마크다운 소스 기반 `#/N`(generateTOCFromFile)은 prepend 되는 toc-placeholder Map Slide 를 반영 못 해 off-by-one 발생 → 산출 HTML DOM 순서를 신뢰(ground truth).
    - 회귀 방지: children 이 이미 있는 노드(서브챕터 보유)는 미변경. fPmIntro 서브챕터 노드(1·2·5장) 보존 + 서브챕터 없던 3·4·6장만 슬라이드 보강 확인. lint rc=0(fWarrangeCliIntro·fSnippetCliIntro). 대표 빌드(m2slide_info·chapter_mode·single_mode·fPmIntro) 정상.
    - 적용 범위: chapter mode 전 데크(평면 목차 데크 포함) — 순수 추가라 회귀 없음. 초기 펼침 단계 축소·옵트인 플래그화는 후속 필요 시.

## Issue298: 정책 yml 혼재 커밋 pre-commit 경고 훅 (등록: 2026-07-21) — 해결: 2026-07-21 (commit: 50de0fb) ✅
* 목적: Issue265 Phase 4 에서 커밋 규율을 문서화했으나 강제 수단이 없어, 사례 B(정책 yml + 코드 + 산출물 혼합 커밋으로 회귀 원인 격리 불가)가 사람 주의력에만 의존한다. 문서 규율을 기계 경고로 보강한다.
* depends: Issue265
* trigger: Issue265 ✅ 완료 (commit 1fc4c24, 70fca45) — 규율 문서(`data-access-rules.md` "정책 yml 커밋 규율") 확정됨
* 상세:
    - 규율 SSOT: `.claude/rules/data-access-rules.md` "정책 yml 커밋 규율" 절
    - Issue265 task 에서 선택 항목으로 취소(`- [x]`)했던 항목 — 규율 자체는 문서로 성립하나 위반 검출이 없음
    - `.git/hooks/` 는 git 추적 대상이 아니므로 repo 마다 개별 설치 필요 (graphify post-commit 훅과 동일 제약)
* 구현 명세:
    - staged 파일에 `data/<stage>/*.yml` 이 포함되고 동시에 그 외 파일(정책 문서·정책 lint 구현 제외)이 있으면 경고 출력
    - 차단이 아니라 경고 + 확인 프롬프트 — 정당한 동반 변경(설계 문서·lint 구현)이 존재하므로 hard fail 은 과함
    - 설치 스크립트 제공 (`z_test/` 또는 `lib/` 하위) + README 안내. `graphify hook install` 이 훅을 덮는 선례가 있으므로 재설치 시 패치 유실 주의 문구 포함
    - `_backup/` 하위 yml 은 판정에서 제외
* 결과: `lib/hooks/check-policy-commit.sh`(staged 정책 yml + 무관 파일 혼재 경고) + `install-hooks.sh`(pre-commit 설치, 기존 훅 chain append). bash 3.2 호환
* 동반 허용: 설계 문서·lint 구현·정책 픽스처. 차단 아닌 경고. `_backup` 제외
* 검증: 혼재(경고)·단독(무출력)·동반허용(무출력) 3케이스

## Issue297: L2 프로젝트 override 병합 결과의 goal_check 정합성 검사 (등록: 2026-07-21) — 해결: 2026-07-21 (commit: 3e350bb) ✅
* 목적: `--lint-data` 검사 4~6 이 L1(`data/<stage>/*.yml`) 정의만 검사하므로, 프로젝트 override(`Projects/<N>/_pipeline/policy/<stage>.yml`)가 `goal_check` 를 덮어써 판정을 무력화해도 lint 가 통과한다. 정책 cascade 와 goal 스키마가 각각은 검증되지만 **병합 결과는 아무도 검증하지 않는** 사각지대다.
* depends: Issue265
* trigger: Issue265 ✅ 완료 (commit 1fc4c24, 70fca45)
* 상세:
    - cascade 설계: `_doc_arch/pipeline-policy-cascade.md` (L1 글로벌 ↔ L2 프로젝트 deep-merge)
    - goal 스키마: `_doc_arch/policy-goal-schema.md` (룰의 목적·판정)
    - 두 축은 직교하나 병합 후 값이 스키마 규율을 지키는지는 미검사 — 동 문서 "룰 내부 스키마와의 경계" 절에 🚧 TODO 마커 부착됨
    - 위험 시나리오: L2 가 `goal_check` 를 빈 매핑으로 덮어 enforce 룰을 사실상 무력화, 또는 `goal_type` 계열 밖 술어를 주입
* 구현 명세:
    - `lib/lint-policy-schema.py` 에 병합 모드 추가 — 프로젝트별로 L1+L2 deep-merge 결과를 구성해 검사 4~8 재적용
    - L2 가 `goal_type` 자체를 바꾸는 것은 금지(룰의 정체성 변경) — 발견 시 실패
    - L2 가 `goal_check` 를 **완화**하는 경우 경고, **삭제**하는 경우 실패로 분리
    - 검사 대상 프로젝트가 늘면 비용 증가 → `_pipeline/policy/` 존재 프로젝트만 스캔
* 결과: `lib/lint-policy-schema.py lint_l2_overrides` — L1(data/<stage>/*.yml deep-merge)+L2 병합 결과에 검사 4·6 재적용. L2의 goal_type 변경·goal_check null 교체·계열밖 술어·룰 소멸 검출. `--lint-data` 검사 4 자동 포함
* deep-merge 시맨틱상 키 제거 불가 → 완화는 null 교체 형태로만 나타남을 반영
* 현재 실 override(feedback·note-writer)는 goal 룰 무관 0쌍, 픽스처 `z_test/fixtures/policy/l2-override/` 5쌍(P1~P5·OK)으로 검증

## Issue296: 나머지 정책 yml 9종 goal-oriented 전환 (등록: 2026-07-21) — 해결: 2026-07-21 (commit: 1e03c52, c63df03) ✅
* 목적: Issue265 가 파일럿 1종(`heuristics.yml`)만 전환했으므로, 남은 정책 yml 이 여전히 목적 없는 플래그·정규식 상태로 남아 사례 A 형 무력화에 노출되어 있다. `--lint-data` 검사 4가 매 실행 시 미전환 플래그 후보 43개를 보고하는 것이 그 가시화다.
* depends: Issue265
* trigger: Issue265 ✅ 완료 (commit 1fc4c24, 70fca45) — 스키마·lint 정착 확인됨
* 상세:
    - 대상 9종: `mappings.yml`(ppt2m2slide) · `patterns.yml`(slide-tuner·slot-designer·agenda-designer·note-writer) · `styles.yml`(md-builder) · `rules.yml`(layout-selector) · `tools.yml`(media-creater) · `questions.yml`(info-filler) · `channels.yml`(refs-collector)
    - `heuristics.yml` 내부에도 미전환 플래그 43개 잔존 — 파일 단위가 아니라 룰 단위 전환이므로 같은 파일을 여러 번 손대게 됨
    - 전환 판단 기준: 그 룰이 **위반을 검출해야 하는 룰인가**. 단순 설정값(임계치·목록·템플릿)은 goal 이 없으므로 전환 대상 아님
* 구현 명세:
    - 룰별로 `goal_type`(7종 enum) 선택 → `goal` 서술 → `goal_check` 판정식 작성. 기존 정규식·자연어 조건은 `detect_hints`·기계 판정 필드로 이관
    - `goal_check` 술어가 기존 7계열에 없으면 `_doc_arch/policy-goal-schema.md` 를 먼저 갱신하고 `lib/lint-policy-schema.py GOAL_CHECK_FAMILIES` 동기화
    - 각 yml 수정 전 `./lib/tuner/backup-data-yml.sh` 선행 + 정책 yml 단독 커밋 규율 준수
    - 전환 룰마다 골든 픽스처 1건 추가 권장 (`z_test/fixtures/policy/`)
    - 단계 분할 권장: 파급 큰 `styles.yml`·`rules.yml` 을 뒤로, 독립성 높은 `channels.yml`·`tools.yml` 을 앞으로
* status: **파일럿 완료** — md-builder styles.yml 3룰 전환 + hygiene 산출물 판정. 9종 전면 전환은 감사로 범위 재정의됨(아래)
* 감사 결과 (subagent 13파일 전수): 실제 goal 전환 대상은 **4파일 8건**, 나머지 9파일은 설정값 전용(룩업·분류·질문·채널 — goal 개념 없음). "43개 미전환 플래그"의 대부분이 설정 boolean 이었음
* 완료분: `slide_text_hygiene_policy`(hygiene, 제목 내부표기 노출 금지) · `inline_syntax_preservation`(fidelity, 문법 토큰 wrap) · `backtick_marker_conflict_policy`(legibility, 빈 li 방지)
* 핵심 개선: lint 검사 게이트를 `schema_version:2` → **`goal_type` 룰 존재**로 변경 — `version:` 파일도 goal 룰 넣는 즉시 검사됨 (감사가 짚은 버전 필드 네이밍 불일치 우회)
* hygiene enforce_scope=headings: 본문 bullet·단락의 이슈번호는 덱 콘텐츠(도구 데모)일 수 있어 제목만 기계 판정. 실 프로젝트 23개 위반 0건
* 잔여 5건은 🌱 이슈후보에 기록(개별 goal_check 판정 코드가 독립 작업이라 건별 후속 분리)
* 근거 문서: `_doc_work/htm/hub_htm_20260721_215009_a_yml-audit.htm`

## Issue299: _doc_arch ↔ 소스코드 정합성 감사 (등록: 2026-07-21, 해결: 2026-07-21, commit: 없음—gitignore) ✅
* 목적: `_doc_arch/` 영속 설계 문서가 참조하는 파일 경로·스크립트명·함수명·CLI 플래그·동작 서술이 현재 소스코드와 어긋난 곳(stale)을 전수 검토하여 교정.
* plan: `_doc_work/z_done/plan/doc-arch-audit_plan.md`
* task: `_doc_work/z_done/tasks/doc-arch-audit_task.md`
* 결과: 문서 42개 7-subagent fan-out 감사 → **42건 발견, 39건 교정, 3건 false-positive 기각**(htmlArt PANDOC_LAYOUT_RESERVED 실존 확인 slide-parser.js:282). CLEAN 15개.
    - HIGH 2건: dev-server.md `/n/` 네임스페이스 미구현 오기(실제 구현 완료) · theme_layout_lec.md underscore class 서술 stale(실제 `layout-_*`)
    - 주요 교정: nowage 테마 폐기 잔존→default_lec 정정(theme/css/theme_layout_default/video-player) · keynote 자산 `_doc_base/background/` 이동 경로 · Issue257 파이프라인 재번호(stage9=note-writer, info/cost-manager/authoring-pipeline) · 함수·라인번호 drift(brittle 라인번호는 심볼 참조로 대체) · _README 인덱스 32→41 문서 · htmlArt 19종→27종 · 테스트 30→63 · `--lint-palette`/`--lint-config` 실존 확인
    - 재-grep 검증 통과: keynote 경로·opus-4-8·_README 41/41 링크·`_applyDirectiveAttrs` 실존
* 미해결 마커: color-palette.md `--lint-palette` 🚧 [TODO] 2곳 (전용 lint 미구현, 현행 warn+fallback)
* **커밋 없음 사유**: `_doc_arch`·`Issue.md`·`_doc_work` 가 `.gitignore` 대상(L4-6)이라 commit hash 생성 불가. `-f` 강제 추적·gitignore 수정 금지 지침 준수 — hash 없이 종결. (public remote 존재, 내부 설계문서 강제 추가 금지)
* 방법론 원본: prj1#Issue306, fan-out: prj1#Issue307

## Issue265: policy 데이터 yml 목적 지향(goal-oriented) 스키마 + confidence 가중치 도입 — 정책 무력화·오변경 예방 (등록: 2026-07-06, 보류: 2026-07-11, 보류해제: 2026-07-20, 해결: 2026-07-21, commit: 1fc4c24, 70fca45) ✅
* branch따서 작업할 것. 
* status: 완료 — 브랜치 `fix/issue265-policy-goal-schema` (main 병합 미수행, 사용자 검토 대기)
* 범위 확정 (2026-07-20 사용자 결정): 축 1(룰 목적)만. 축 2(덱 목적 purpose enum)는 Issue295 로 분리. `goal_type` enum 7종 전량 채택
* 후행: Issue295 (덱 목적 purpose enum) — **trigger 충족, 착수 가능** / Issue296·297·298 (미해결 항목 이관)
* 목적: `data/<stage>/*.yml` 정책이 (A) 파일명 정규식 하드코딩으로 조용히 무력화되고(`drop_redundant_page_screenshot`가 `pdf-p\d+`만 검출 → AgenticCoding `sNN_i1.png` bleed 8건 미검출), (B) 일괄 커밋(chore bulk)에 섞여 회귀 원인 격리가 불가하며, (C) 학습 사례 1건이 즉시 전역 enforce로 승격되어 과소/과대 일반화 위험을 안는 구조적 약점을 차단.
* plan: `_doc_work/z_done/plan/policy-goal-schema_plan.md`
* task: `_doc_work/z_done/tasks/policy-goal-schema_task.md`
* 분석 문서: http://jm4.local:9876/htm-doc?path=/Users/nowage/_git/__all/videoMaker/lib/m2slide/_doc_work/z_htm/hub_htm_20260706_210035_a_policy-history.htm (git history 사례 A/B/C + 예방책 ①~⑤ 상세)
* 목적 2축 분리 근거: `_doc_work/htm/hub_htm_20260720_192649_a_goal-taxonomy.htm` (goal_type enum 7종 도출 + 축 2 분리 판단)
* 상세:
    - 사례 A (목적·수단 불일치): commit `4b38619` 정책의 goal은 "재구성 성공 슬라이드에 통짜 래스터 0건"이나 구현은 특정 파일명 패턴 — 다른 추출 네이밍(sNN_iM)에서 무력화. 2026-07-06 AgenticCoding 튜닝에서 실증
    - 사례 B (일괄 커밋): `01ad51a`·`80cd65b`·`b580e13` — 정책 yml+코드+산출물 혼합 커밋. theme fallback 회귀 원인 코드가 `01ad51a`에 숨어 있었음 (기존 Issue 기록)
    - 사례 C (단일 사례 즉시 enforce): 7/3 백업 diff 기준 하루 3룰 추가 전부 사례 1건 근거 + 예외조건(`keep_screenshot_when`)이 자연어라 기계 판정 불가
* 구현 명세 (분석 문서 ①~⑤ — 대규모 변경이라 등록만, 착수 시 plan 필수):
    - ① goal-oriented 스키마 (3필드 하이브리드): `goal_type:`(객관식 enum 7종 — `fidelity`·`machine_readable`·`intent_guard`·`consistency`·`legibility`·`attribution`·`hygiene`) + `goal:`(주관식 서술 — 검증 가능 목표) + `goal_check:`(판정식 — 면적·종횡비·빈 alt 등 속성 기반) + `detect_hints:`(파일명 정규식은 힌트로 강등)
    - ② confidence 가중치: `evidence:` 구조화 필드 기반 low(=proposal)/medium(=warn+apply)/high(=enforce) 3단계 적용 강도. promote-to-data.py 연동
    - ③ 정책 yml 단독 커밋 규율 (bulk commit에 data/*.yml 혼입 금지)
    - ④ `--lint-data` 확장: enforce 룰이 goal_check 없이 정규식만 가지면 경고 + `goal_type`↔`goal_check` 계열 정합성 검사 + 산출물 검사(정책 on인데 위반 잔존 시 fail-loud)
    - ⑤ 학습 사례 골든 픽스처화: rationale 사례 슬라이드 재변환 회귀 테스트
    - 우선순위: ①+④ (사례 A 직접 차단) → ② (사례 C 구조 개선) → ③⑤
    - triage: 복잡 (heuristics.yml 스키마 개편 + promote-to-data.py + lint 확장 — 설계 결정이 후속 이슈에 영향)
* report: `_doc_work/z_done/report/policy-goal-schema_issue265_report.md`
* 설계 SSOT: `_doc_arch/policy-goal-schema.md` (신규)
* 결과:
    - 목적 3필드 하이브리드 도입 — `goal_type`(enum 7종) + `goal`(서술) + `goal_check`(판정식). 파일명 정규식은 `detect_hints` 로 강등되어 판정 권한 상실
    - 파일럿 `heuristics.yml drop_redundant_page_screenshot` 전환 (`schema_version: 2`). 자연어 `keep_screenshot_when` → 기계 판정 `keep_when` 으로 대체
    - 전환 단위를 파일이 아닌 **룰** 로 재정의 — `goal_type` 선언 룰만 v2 규율. 미전환 룰은 lint 가 정보 라인 보고(실패 아님), 전환 도중에도 lint 사용 가능
    - lint 2종 신설: `lib/lint-policy-schema.py`(enum·계열 정합성·evidence) + `lib/lint-policy-artifacts.py`(산출물 속성 판정, `_pipeline` 보유 프로젝트 옵트인) → `--lint-data` 검사 4·5
    - `promote-to-data.py` confidence 제안 — `high`(enforce)는 자동 제안하지 않음 (사례 C 차단)
    - 골든 픽스처 + 러너(`z_test/`) — 힌트 미등록 네이밍(`Deck_v10_12.png`)까지 검출해야 통과
    - 정책 yml 단독 커밋 규율 문서화 (`data-access-rules.md`, 사례 B)
* 설계 교정 1건: 초안 `image_area_ratio_max`(픽셀 수 → 면적비 프록시)가 저해상도 페이지 캡처(1440x810·1600x900)를 놓쳐 픽스처 3건 중 1건만 검출. md 소스로는 렌더 면적 판정이 원리적으로 불가하므로 폐기하고 `sole_image_in_slide` + `min_pixel_width` 로 교체 — 판정 불가능한 값을 그럴듯하게 적어두는 것이 본 이슈가 막으려는 실패 모드
* 검증: `--lint-data` rc0(검사 1~5) · `z_test/run-policy-fixture.sh` rc0(위반 3건 검출·오검출 0) · 실 프로젝트 11개 잔재 0건 · `m2Slide_single_mode` 빌드 rc0

## Issue294: m2slide.sh 프로젝트 이름 해석이 Projects_deck 덱을 못 찾음 (등록: 2026-07-20, 해결: 2026-07-20, commit: 49f64fe) ✅
* 목적: `./m2slide.sh <덱이름>` 이 `Projects/` 하위만 조회하여 `Projects_deck/decks/<cat>/<deck>` 덱을 "존재하지 않음"으로 처리하는 비대칭을 해소한다. dev-server(`_project_root`, Issue290)는 이미 덱을 해석하므로 브라우저에서는 열리는 덱이 빌드에서는 안 잡히며, 이 때문에 Issue292 라이선스 뱃지 소급 재빌드가 덱 저장소 전체를 조용히 건너뛰었다.
* 상세:
    - 재현: `./m2slide.sh RamyeonCooking` → `❌ Error: Project directory does not exist: RamyeonCooking`. 같은 덱이 dev-server 에서는 `/p/RamyeonCooking/n/1/1` 로 정상 서빙됨
    - 원인: `m2slide.sh` 이름 해석이 `$SCRIPT_DIR/Projects/<name>` 단일 경로만 조립 (`Projects_deck` 문자열 자체가 파일에 없음)
    - 파급: `--lint-deployment <project>` 도 동일 한계. 전역 기능 롤아웃 시 덱 저장소 누락이 반복될 구조
    - 실측 근거(수정 전): `Projects/*/slide/index.html` 은 라이선스 뱃지 1~2개, `Projects_deck/decks/misc/RamyeonCooking/slide/*.html` 은 0개
* 구현 명세:
    - `m2slide.sh` 상단에 `_resolve_project_dir()` 헬퍼 신설 — `Projects/<name>` 우선, 없으면 `Projects_deck/decks/*/<name>` 탐색. 다중 매칭 시 stderr 경고 후 사전순 첫 매칭 사용 (dev-server `_project_root` 와 동일 규약)
    - 빌드 경로(파라미터 이름 해석)와 `--lint-deployment` 대상 해석 양쪽에 적용
* 검증 결과:
    - `bash -n m2slide.sh` 통과
    - `./m2slide.sh RamyeonCooking` — 덱 경로 자동 해석 후 빌드 성공, `©️ Injecting license attribution badge` 로그 확인
    - `grep -c m2-license-badge .../RamyeonCooking/slide/index.html` → 2 (첫·마지막 슬라이드)
    - `./m2slide.sh --lint-deployment RamyeonCooking` → 덱 경로 해석 성공 + `✅ No deployment violations`
    - `./m2slide.sh --lint-license` → 전 테마 통과
    - `Projects_deck/decks/*/*` 전수 스캔 — 덱 1건(RamyeonCooking) 전부 뱃지 보유, 소급 누락 잔존 0
* 후속 관찰(이슈 아님): `agenda.html` 은 전 프로젝트 공통으로 뱃지 0 — RamyeonCooking 고유 회귀가 아니라 현행 삽입 대상 목록의 특성. 필요 시 별도 이슈로 판단.

## Issue293: 공개 이미지 스타일 통일 (free_image → img2img) + 이미지 백엔드 img-add 전환 (등록: 2026-07-19, 해결: 2026-07-19, commit: c28d94f) ✅
* 목적: free_image(Openverse CC)로 받은 사진이 덱의 톤·스타일과 따로 노는 문제를 img2img 재해석으로 해소하고, 2026-07-13 이후 신설된 글로벌 스킬 `img-add`(fg1 주력·jm4 폴백 자동 라우팅)로 이미지 생성 호출 경로를 통일한다.
* 설계: `_doc_arch/media-creater-image-backend.md`
* 상세:
    - 현재 `data/media-creater/tools.yml` 의 `local_image_gen` 은 `mflux-enqueue` 를 직접 호출 — jm4 고정 경로라 fg1(NVIDIA) 자원을 못 쓰고, 글로벌 `img-add` 의 백엔드 판정·반응형 강등을 우회한다
    - img2img 자체는 두 하위 스킬(flux-fg1·flux-jm4)이 `--image-path`·`--image-strength` 로 이미 지원 — m2slide 쪽 카탈로그에 소비 경로가 없어 미사용 상태
    - **스코프 = 스타일 통일 한정**. 정밀 편집(색만·글자만 교체)은 schnell 구조상 불가(실측)이라 본 이슈에서 제외 — 이슈후보1로 분리
    - 파생물 저작권: CC 사진을 img2img 로 변형해도 2차적저작물이므로 원본 출처 표기 의무는 유지되어야 함
* 구현 명세:
    - `data/media-creater/tools.yml` (수정 전 `./lib/tuner/backup-data-yml.sh` 의무)
        - `local_image_gen`: handler `mflux` → `img-add`, invocation 을 img-add 스킬 위임으로 교체. 직접 `mflux-*`·`flux-fg1`·`flux-jm4` 호출 금지 가드 유지
        - 신규 도구 `image_restyle` 등재: `--image-path`(free_image 산출물) + `--image-strength 0.5~0.7` 로 스타일 재해석. `source_attribution: inherit_from_source` (원본이 CC면 출처 표기 승계)
        - `processing_policy.style_unification`: Info.md `image_style` 지정 + free_image 산출물 사용 시에만 opt-in 적용, 실패 시 원본 사진 그대로 유지(강등)
    - `_doc_arch/media-creater-image-backend.md`: 백엔드 호출 경로(img-add) 갱신 + 스타일 통일 절 신설 + 정밀 편집 한계 명시
    - 검증: `./m2slide.sh --lint-data` 통과
* 결과 (2026-07-19):
    - `local_image_gen` handler `mflux` → `img-add`. invocation 을 스킬 위임 규약으로 교체, `mflux-*` 직접 실행 + `flux-fg1`·`flux-jm4` 하위 스킬 직접 호출 전면 금지 가드 유지
    - `image_restyle` 신설 (type `photo_restyle`) — img2img `--image-path`·`--image-strength 0.6` 기본. 후처리 전용이라 `image_fallback_chain` 미포함, 실패 시 `keep_original`
    - `processing_policy.style_unification` 신설 — Info.md `image_style` 명시 + free_image 산출물 + 비인물 3조건 AND opt-in
    - 출처 승계: `source_attribution: inherit_from_source` + CREDITS.md "변형함(adapted)" 명시 + 원본 파일 보존
    - 인자명 대조 검증: `img-add` SKILL.md 116행에 `--prompt`·`--output`·`--project`·`--image-path`·`--image-strength` 동일 이름 패스스루 확인
    - `./m2slide.sh --lint-data` 통과 (파싱·categories↔priority·promotion status 3종 전부 ✅)
    - 미해결 이관: 정밀 편집(색만·글자만)은 edit 전용 모델(prj55 소관) 대기 → 이슈후보1. `image_restyle` 실사용 검증은 `_doc_arch` 🚧 TODO

## Issue292: 라이선스 표기 자동 삽입 — 첫 장·마지막 장 뱃지 + 대비 규칙 (등록: 2026-07-14, 해결: 2026-07-14, commit: 659f9f1) ✅
* 목적: LICENSE.md 이중 라이선스 정책("모든 산출물의 첫 장·마지막 장에 'Powered by finfra.kr, Made by m2slide' 표기 유지 의무", CC BY 4.0 근거)을 실제 빌드 산출물에 강제 반영.
* plan: `_doc_work/z_done/plan/license-attribution_plan.md`
* task: `_doc_work/z_done/tasks/license-attribution_task.md`
* 설계: `_doc_arch/license-attribution.md`
* 최종 확정 사양 (2026-07-14 사용자 시각 컨펌 2회):
    1. 위치: 하단 중앙 (`left:50%; transform:translateX(-50%);`) — 초안(우하단)에서 사용자 피드백으로 변경
    2. 자동 보정: 빌드마다 첫/마지막 top-level section(agenda.html 등 standalone 페이지 포함)에 자동 삽입, 삽입 후 자체 검증(`console.error` fail-loud)
    3. 크기: 하한 `--m2-license-fs-min: 0.55em` / 기본 `--m2-license-fs: 0.65em`, `max()`로 축소 무력화
    4. 색상: 전용 변수 `--m2-license-fg`(진한회색 — light `#5a5a5a` / dark `#9fa1b2`) — 순수 `--kn-text` 재사용안에서 "너무 진하지 않게" 피드백으로 분리. `--kn-accent` 저알파 `text-shadow`로 은은한 노랑 그림자 추가
    5. 대비: WCAG 2.1 contrast ratio(≥4.5:1) 채택 — 사용자 초안(채도/명도/색상差 규칙)보다 표준적인 방법으로 대체 승인받음. `--lint-license` subcommand 신설, 전 테마(default/default_lec/default_dark) 6.7~6.9:1로 통과
    6. `license_attribution: false` 시 빌드 로그에 위법 소지 경고 (하드 차단 아닌 warn)
* 구현 명세:
    - `lib/config.js`: `licenseAttribution` 파싱 + false 시 경고 로그
    - `lib/generate-slides.js`: 첫/마지막 section 판정(chapter/single 분기) + `injectLicenseBadge`/`verifyLicenseBadge` (reveal 덱 + standalone 페이지 양쪽 대응)
    - `theme/_shared/components.css`: `.m2-license-badge` 스타일, `theme/default_dark/slide.css`: `--m2-license-fg` override
    - `lib/lint-license.js` + `m2slide.sh --lint-license`: 테마별 WCAG 대비 자동 검증
    - `_config.org.yml`·`lib/dev-server/server.py`·`_doc_arch/config-gui.md`: `license_attribution` 키 4곳 동기화
    - 19개 활성 프로젝트(`Projects/*`, `_*`/`z_*` 제외) 전체 재빌드 — `--lint-deployment`·`--lint-license` 통과 확인
* 검증: 대표 샘플(default/default_lec/default_dark × single/chapter) iframe 실시간 검토 페이지로 사용자 2회 시각 컨펌(위치·크기·색 조정 1회 반영 후 최종 승인) → 전체 소급 적용

# ⏸️ 보류

## Issue383: `check-assembly --baseline` — **원본 pptx 대비** 판정 (등록: 2026-09-20, 보류: 2026-09-20)
* 목적: 절대 건수로 재면 원본이 원래 갖고 있던 특성을 **새 결함으로 오판**한다(prj61 실측: 산출 120건인데 원본이 156건). 그 함정을 m2slide 역변환 경로에 대비해 둔다.
* 카테고리: Build
* depends: Issue382
* 보류 사유: **지금 잴 대상이 0건이다.**
    - 정방향(원고 → pptx)의 기준선은 **HTML 덱**이고 m2slide 는 이미 그것을 쓴다 — [`3.parity.sh`](z_test/ig-ppt/3.parity.sh) 머리주석이 *"판정 기준은 원본 HTML 이다 — 그쪽이 정본"* 을 설계 원칙으로 못박고 ①③ 이 장수·제목을 그 기준으로 잰다. 즉 A1 의 **취지는 이미 구현돼 있고**, 원고 우선 도구에는 HTML 이 더 올바른 기준선이다
    - pptx 기준선이 의미를 갖는 것은 **역변환 경로**(원본 pptx → 원고 → 재산출 pptx)뿐인데, 실측(2026-09-20) 원본을 보유한 프로젝트(`Projects/_ppt/` — BasicKnowledgeForAI_small·AgenticCoding·GenContentProd)는 **pptx 를 재산출하지 않는다**. 인자로 넘길 짝이 없다
    - 구현 부담은 0 이다 — Issue382 가 같은 스크립트를 배선하므로 플래그가 따라온다. 그래서 *"만들 것인가"* 가 아니라 *"언제 쓸 것인가"* 의 문제이고, 쓸 자리가 생기기 전에 켜면 SKIP 3 줄만 는다
* 재개 조건:
    - 역변환 프로젝트(`Projects/_ppt/` 에 원본이 남은 것)를 **pptx 로 재산출**하는 작업이 생길 때
    - 또는 ppt2m2slide 의 round-trip 검증에 **구조 축**을 더할 때 — 현재 그 단계는 `slide-compare`(캡처 기반 **시각** 대조)뿐이라 part·rel 층을 보지 않는다
* 구현 명세 (재개 시):
    - `check-assembly.py <재산출.pptx> --baseline Projects/_ppt/<원본>.pptx`
    - 켜지는 3규칙: `every_source_title_present_in_output` · `slide_count_equals_declared_arithmetic` · `metric_compared_to_source_deck`
    - ⚠️ 원본 pptx 가 **`Projects/_ppt/` 에 남아 있어야** 한다. [`repo-tracking-rules`](.claude/rules/repo-tracking-rules.md) 상 pptx 는 git 추적 대상이 아니므로, 재개 시점에 원본 존재부터 확인한다


## Issue145: Fragment 단계별 등장 + 색 강조 동시 적용 syntax 부재 (등록: 2026-05-10, 보류: 2026-05-10)
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

## Issue42: `slide_ratio` 옵션 완전 제거 (보류: 2026-05-01)
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

## Issue25: 배경 이미지 설정 기능 (보류: 2026-05-01)
* 마크다운 메타데이터(YAML frontmatter)를 통해 전체 슬라이드의 배경 이미지를 지정하는 기능 구현
* `background` 속성으로 이미지 경로 혹은 color 지정 지원
* **보류 사유**: theme/{name}/slide.css 시스템(Issue36/38)으로 동일 목적 달성 가능 (ex: `.reveal { background: url('img/bg.png') center/cover; }`). 비기술 사용자가 마크다운만으로 슬라이드별 배경을 자주 바꾸는 use-case가 누적되면 재검토.

