# Issue Management
* https://github.com/Finfra/m2slide/issues
* Issue HWM: 298
* Checkpoints:
    - bf2efa7 (2026-07-13) 작업 트리 스냅샷
* 오래된 Issue는 `z_old/old_issue.md`에 저장
* Save Point :
    - **v0.8.0 (2026-07-13)** — release: 라이선스 이중화(CC BY 4.0 + 상업, LICENSE.md 신설) + dev-server 확장(/s/·/n/ semantic 분리, /pd/ 덱 목록, 설정 GUI, 피드백 루프) + default_dark 테마·palette 시스템 + authoring-pipeline 학습 루프(slide-tuner·ppt2m2slide·note-writer) + self-contained vendor 자산. 완료 이슈 159건 z_old 아카이브.
    - **v0.7.0 (2026-05-06)** — release: `/deploy-docs` 신규 커맨드 + `_config.yml: deploy_formats` 옵션 (EPUB/PDF/PPTX 자동 빌드·배포 + 메인 인덱스 카드 다운로드 배지) + agenda 다운로드 버튼 위치 변경(우상단 헤더 → `.layout-_agenda` 우하단 absolute, 마스코트 충돌 회피). v0.6.x 시리즈(Issue71-126 + Issue127-128) 누적 z_old 아카이브.
    - **v0.5.0 (2026-05-03)** — release: 71건 완료 이슈 z_old 아카이브, CHANGELOG.md 신규 (Issue70까지 포함)
    
# 🤔 결정사항
* _meta.yml파일 사용 안함 : AGENDA.md나 {프로젝트명}.md파일의 yaml front matter에 추가하기로 함. 
* 현재 프로젝트가 contents 생성에 치중함에 따라 m2slide모듈은 분리되어야하나 지금은 생성되는 컨텐츠와 slide생성이 밀접하고 scar부분에 한정되어 있어서 한동안 함께 진행 후 분리하고 push예정.
* 배포를 위해 가급적 scar는 프로젝트 폴더에 배치함. 
## img 폴더 이중 복사 유지
* 소스 `img/` + 빌드 `slide/img/` 이중 복사(`fs.cpSync`) 유지 — `slide/` 통째 재생성 빌드 패턴 대응. 영상 등 기타 리소스 동일.

## 개별 에니메이션 지원
* 로우·값 단위 개별 애니메이션 지원(VideoMaker 영상 플레이용). Issue149 완료 — reveal.js `<!-- .element: class="..." -->` + Pandoc `{.fragment}` 병존.

# 🌱 이슈후보
1. **이미지 정밀 편집(색만·글자만 교체) 지원** — schnell img2img 로는 불가(strength 0.3↑ 원본 복제 / 0.1 재해석 드리프트, 2026-07-13 실측). edit 전용 모델(Qwen-Image-Edit·FLUX Kontext, ~수십 GB) 설치가 선행 조건이며 설치·큐 연동은 prj55 소관. 모델 확보 통지 시 이슈 승격 (Issue293 스타일 통일과 구분되는 별개 기능)

# 🔥 진행 중

# 📕 중요

# 📙 일반

# 📗 선택

## Issue296. 나머지 정책 yml 9종 goal-oriented 전환 (등록: 2026-07-21)
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

## Issue297. L2 프로젝트 override 병합 결과의 goal_check 정합성 검사 (등록: 2026-07-21)
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

## Issue298. 정책 yml 혼재 커밋 pre-commit 경고 훅 (등록: 2026-07-21)
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

## Issue295. 덱 목적(purpose) enum 도입 — 정책 적용 강도의 덱 용도 스코프 (등록: 2026-07-20)
* 목적: 정책 룰이 모든 덱에 무차별 전역 강제되는 구조를 해소한다. 강의 덱에서 결함인 것(통짜 래스터·텍스트 미추출)이 광고 덱에서는 의도된 선택일 수 있으므로, 덱의 용도를 1급 메타로 두고 정책 적용 강도를 그 축으로 스코프한다. 목적 축이 없으면 예외가 자연어로 누적되어 다시 기계 판정 불가 상태로 되돌아간다(Issue265 사례 A 재발 경로).
* depends: Issue265
* trigger: Issue265 ✅ 완료 (schema_version 2 + goal_type/goal_check 정착) + commit hash 기록
* 상세:
    - 현재 `Info.md` 에는 자유 서술 `goals[]` 와 `tone` enum(강의·내레이션·대화·튜토리얼·발표·기타)만 존재 — 덱 *용도* 를 나타내는 객관식 필드 부재 (`data/info-filler/questions.yml` 확인)
    - `tone` 은 화법 축이라 정책 스코프로 쓸 수 없음 (같은 "강의" 톤으로 만든 홍보 덱이 존재 가능)
    - 결과: `drop_redundant_page_screenshot` 같은 룰이 전역 강제 → 광고·아카이브 덱에서 불편 → 자연어 예외(`keep_screenshot_when`) 추가 → 기계 판정 불가 회귀
* 구현 명세:
    - `purpose` enum 5종 신설: `lecture`(강의·교육, 가장 엄격) · `info`(정보 전달·브리핑) · `promo`(광고·홍보, 비주얼 우선) · `handout`(배포·인쇄물) · `archive`(원본 충실 보존, 재구성 강제 완화)
    - 복합 목적은 **동등 나열 금지** — `purpose: {primary: <1개>, secondary: [<N개>]}`. 정책 강도는 `primary` 가 단독 결정하며 `secondary` 는 그 자체로 완화 근거가 되지 못함
    - 룰 측 소비 필드: `applies_to_purpose: [...]`(적용 대상) + `relax_when: [...]`(완화 화이트리스트 — 명시된 조합만 완화. `intent_guard` 철학과 동일)
    - 적용 강도 = `confidence`(Issue265 증거 축적 축) × `purpose`(본 이슈 용도 축)의 2차원 함수. 설계 SSOT `_doc_arch/policy-goal-schema.md` 에 매트릭스 기재
    - 파급 지점: `data/info-filler/questions.yml`(질문 1건 추가) · `Projects/<Name>/Info.md` frontmatter · `data/md-builder/styles.yml` · `data/slide-tuner/patterns.yml` · `--lint-data`(purpose 미기재 덱 경고)
    - 마이그레이션: `purpose` 미기재 덱은 `lecture` 로 간주(가장 엄격) — 기존 동작 회귀 0
* 근거 문서: `_doc_work/htm/hub_htm_20260720_192649_a_goal-taxonomy.htm` (목적 2축 분리 + enum 후보 도출)

# ✅ 완료

## Issue265. policy 데이터 yml 목적 지향(goal-oriented) 스키마 + confidence 가중치 도입 — 정책 무력화·오변경 예방 (등록: 2026-07-06, 보류: 2026-07-11, 보류해제: 2026-07-20, 해결: 2026-07-21, commit: 1fc4c24, 70fca45) ✅
* branch따서 작업할 것. 
* status: 완료 — 브랜치 `fix/issue265-policy-goal-schema` (main 병합 미수행, 사용자 검토 대기)
* 범위 확정 (2026-07-20 사용자 결정): 축 1(룰 목적)만. 축 2(덱 목적 purpose enum)는 Issue295 로 분리. `goal_type` enum 7종 전량 채택
* 후행: Issue295 (덱 목적 purpose enum) — **trigger 충족, 착수 가능** / Issue296·297·298 (미해결 항목 이관)
* 목적: `data/<stage>/*.yml` 정책이 (A) 파일명 정규식 하드코딩으로 조용히 무력화되고(`drop_redundant_page_screenshot`가 `pdf-p\d+`만 검출 → AgenticCoding `sNN_i1.png` bleed 8건 미검출), (B) 일괄 커밋(chore bulk)에 섞여 회귀 원인 격리가 불가하며, (C) 학습 사례 1건이 즉시 전역 enforce로 승격되어 과소/과대 일반화 위험을 안는 구조적 약점을 차단.
* plan: `_doc_work/plan/policy-goal-schema_plan.md`
* task: `_doc_work/tasks/policy-goal-schema_task.md`
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
* report: `_doc_work/report/policy-goal-schema_issue265_report.md`
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

## Issue294. m2slide.sh 프로젝트 이름 해석이 Projects_deck 덱을 못 찾음 (등록: 2026-07-20, 해결: 2026-07-20, commit: 49f64fe) ✅
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

## Issue293. 공개 이미지 스타일 통일 (free_image → img2img) + 이미지 백엔드 img-add 전환 (등록: 2026-07-19, 해결: 2026-07-19, commit: c28d94f) ✅
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

## Issue292. 라이선스 표기 자동 삽입 — 첫 장·마지막 장 뱃지 + 대비 규칙 (등록: 2026-07-14, 해결: 2026-07-14, commit: 659f9f1) ✅
* 목적: LICENSE.md 이중 라이선스 정책("모든 산출물의 첫 장·마지막 장에 'Powered by finfra.kr, Made by m2slide' 표기 유지 의무", CC BY 4.0 근거)을 실제 빌드 산출물에 강제 반영.
* plan: `_doc_work/plan/license-attribution_plan.md`
* task: `_doc_work/tasks/license-attribution_task.md`
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

