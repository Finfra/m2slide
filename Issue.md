# Issue Management
* https://github.com/Finfra/m2slide/issues
* Issue HWM: 175
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

# 🚧 진행중

## Issue175. Info.md `design_mood` 필드 추가 — 그래픽 디자인 톤 SSOT (등록: 2026-05-19)
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
    - SCAR 본문 하드코딩 없음 (info-filler agent는 yml만 Read하므로 agent.md 변경 불필요)

# 📕 중요

# 📙 일반

# 📗 선택

# ✅ 완료

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

## Issue171. md-updater 데이터-주도 SCAR 전환 (등록: 2026-05-19, 해결: 2026-05-19) ✅
* 목적: Issue169 info-filler 패턴을 md-updater skill에 적용. `data/md-updater/styles.yml`을 SSOT로 하는 데이터-주도 SCAR로 전환.
* 카테고리: Build (파이프라인 SCAR)
* depends: Issue170 ✅
* 산출물:
    - `.claude/skills/md-updater/SKILL.md` — 3개 신규 절(데이터 로드 / 적용 알고리즘 / 확장 지점) 추가 + 본문 하드코딩(슬라이드 유형별 본문 패턴 표·검증 체크리스트·체크포인트 메시지) 제거 → yml 참조로 대체
    - `data/md-updater/styles.yml` v2 — 11개 최상위 키 (`styles[]`/`style_selection_rules[]`/`slide_patterns[]`/`content_limits`/`md_rules_compliance[]`/`checkpoint`/`validation_rules`/`header_preservation`/`layout_meta_policy`/`report_template`)
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
* 후속: Issue171~174 (md-updater/media-creater/layout-selector/slot-designer)

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
    - Issue165 umbrella 남은 5개 SCAR 전환 (agenda-designer, md-updater, media-creater, layout-selector, slot-designer)

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
    - 6개 SCAR(info-filler, agenda-designer, md-updater, media-creater, layout-selector, slot-designer) v2 패턴 전환 후속 이슈 (각 단계별)
    - 본 umbrella는 후속 이슈 종결 시마다 v2 전환 추적 표 ⏳ → ✅ 갱신 의무

## Issue166. authoring-pipeline v2 구현 — 데이터-주도 SCAR + /pm 무중단 History/Artifacts (등록: 2026-05-18, 해결: 2026-05-18, commit: dac9db9) ✅
* 목적: [v2 SSOT](_doc_arch/authoring-pipeline.md) 3가지 핵심 변경(데이터-주도 SCAR / Info.md=사용자 요청 SSOT / `/pm` 무중단 History·Artifacts) 통합.
* 카테고리: Build (파이프라인 인프라)
* 산출물:
    - `_doc_arch/authoring-pipeline.md` — v2 SSOT 설계
    - `data/{info-filler,refs-collector,agenda-designer,md-updater,media-creater,layout-selector,slot-designer}/` — 단계별 시드 yml 7종
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
    - 단계 1~5·7의 개별 agent/skill 구현 (info-filler, refs-collector, agenda-designer, md-updater, media-creater, slot-designer)
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

## Issue161. authoring-pipeline 단계 4 — md-updater skill 신설 (등록: 2026-05-17, 해결: 2026-05-17, commit: acb4816) ✅
* 산출: `.claude/skills/md-updater/SKILL.md` — AGENDA 골격 + refs/ 기반 슬라이드 본문 자동 작성. 사람 검토 체크포인트, 빌드 lint 실패 시 1회 자동 수정.
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

