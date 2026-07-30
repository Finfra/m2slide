---
name: data-access-rules
description: 파이프라인 단계별 SCAR의 data/ 폴더 접근 범위 격리 정책 — 크로스-단계 읽기 금지
date: 2026-05-26
---

> ⚠️ **글로벌 SCAR 변경 가드** (Issue46)
>
> 본 룰은 모든 프로젝트가 공유. 즉흥 수정 금지.
>
> * cwd ≠ `~/.claude/` → 즉시 수정 금지, `~/.claude/Issue.md` 이슈 등록 후 별도 세션에서 처리
> * 영속 설계 SSOT: `_doc_arch/authoring-pipeline.md` "데이터 접근 범위 격리" 섹션
> * 절차: `~/.claude/rules/global-scar-change-rules.md`

# 목적

각 파이프라인 단계 SCAR(agent/skill)이 자신의 `data/<stage>/` 폴더만 읽도록 범위를 격리.

* **토큰 낭비 방지**: 불필요한 타 단계 데이터 로딩 차단 (heuristics.yml 등이 비대해질수록 중요)
* **단계 간 의존성 누출 방지**: 단계 N이 단계 M의 정책을 암묵적으로 가져오는 사고 차단
* **영향 범위 명확화**: `data/<stage>/` 수정이 해당 단계 SCAR에만 영향을 준다는 보장

# 적용 트리거

다음 동작 시 본 룰 발동:

* 단계별 SCAR(`agents/`, `skills/`, `commands/`)에서 `data/` 경로를 Read하거나 참조할 때
* 신규 SCAR 작성 시 data/ 읽기 로직 추가하려 할 때
* `data/<stage>/*.yml`을 수정하는 경우 — 의존 SCAR 범위 확인

# 단계별 접근 허용 테이블

| 단계 | SCAR                | 전용 data 폴더            | 비고                                       |
| :--- | :------------------ | :------------------------ | :----------------------------------------- |
| 1    | `info-filler`       | `data/info-filler/`       |                                            |
| 2    | `refs-collector`    | `data/refs-collector/`    |                                            |
| 3    | `agenda-designer`   | `data/agenda-designer/`   |                                            |
| 4    | `md-builder`        | `data/md-builder/`        |                                            |
| 5    | `media-creater`     | `data/media-creater/`     |                                            |
| 6    | `layout-selector`   | `data/layout-selector/`   |                                            |
| 7    | `slot-designer`     | `data/slot-designer/`     |                                            |
| 8    | `m2slide.sh`        | (없음 — 빌드 스크립트)    | data/ 접근 없음                            |
| 9    | `note-writer`       | `data/note-writer/`       | Issue257                                   |
| 10   | `md2tts-txt`        | (없음)                    | 글로벌 tts-pronunciation-rules.md만 허용   |
| rev  | `ppt2m2slide`       | `data/ppt2m2slide/`       | 역변환 파이프라인 전용                     |

## 공유 허용 파일 (data/ 루트 직속, 전 단계 허용)

다음 파일은 모든 단계에서 읽기 허용 — 단계 종속이 아닌 범용 카탈로그이기 때문:

* `data/component-libraries.yml` — 시각화 라이브러리 메타 SSOT
* `data/visual-elements.yml` — 시각 구성요소 인벤토리 SSOT (요소 존재·범주·문법·백엔드 라우팅)
* `data/symbol-usage.yml` — 심벌(Font Awesome) 상황별 사용 가이드
* `data/emoji-usage.yml` — 이모지 상황별 사용 가이드
* `data/Info.template.md` — Info.md 템플릿 (info-filler 외 안내용)

# 금지 패턴 (크로스-단계 읽기)

```
# ❌ 금지 — slot-designer agent가 md-builder 폴더 읽기
Read("data/md-builder/styles.yml")  ← slot-designer SCAR 내부에서

# ❌ 금지 — refs-collector agent가 agenda-designer 폴더 읽기
Read("data/agenda-designer/patterns.yml")  ← refs-collector SCAR 내부에서

# ✅ 허용 — slot-designer가 자신의 폴더 읽기
Read("data/slot-designer/patterns.yml")

# ✅ 허용 — 모든 단계에서 공유 파일 읽기
Read("data/component-libraries.yml")
```

필요한 타 단계 정책이 있다면 **자신의 data 파일에 복제·요약**하거나, 해당 정책을 공유 파일로 승격하는 이슈를 등록할 것.

# 예외

* **프로젝트 policy override**: `Projects/<N>/_pipeline/policy/<단계>.yml` — 해당 단계 SCAR만 읽음. 다른 단계의 override 파일은 읽지 않음.
* **단계 10 (`md2tts-txt`)**: `lib/tts/.claude/rules/tts-pronunciation-rules.md` 읽기 허용 — m2slide data/ 외부 룰이므로 예외. 단, `data/<other_stage>/` 접근은 금지. (경로 정정: 구 표기 `~/.claude/rules/...` 는 글로벌 SCAR 를 가리켜 실재하지 않았음. 실 소유는 videoMaker → **lib/tts** — Issue23 이관)
* **orchestrator (`authoring-pipeline` agent)**: 각 단계 위임·결과 검증용으로 state.yml·history.md만 읽음. `data/<stage>/` 직접 읽기 금지 (각 단계 SCAR에 위임).

# 실행 가드 (SCAR 본문 작성 시)

SCAR 본문에 data/ 경로를 하드코딩할 때 다음을 즉시 대조:

1. 해당 SCAR의 단계 번호 → 허용 테이블에서 전용 폴더 확인
2. 읽으려는 경로가 전용 폴더 또는 공유 허용 파일인지 검증
3. 위반이면 자신의 data 파일로 정책 이관 후 자신의 폴더 경로로 변경

# 위반 시 대응

* 위반 발견 즉시 사용자 보고 + 해당 정책을 올바른 data 폴더로 이관
* `~/.claude/learning_log.md` 한 줄 기록 (`* YYYY-MM-DD: data-access 위반 — <단계> → <타단계 경로>`)

# 배경

데이터-주도 SCAR 패턴(Issue170~174)으로 단계별 정책이 `data/<stage>/`에 외부화됨.
초기에는 암묵적 격리(각 SCAR이 우연히 자기 폴더만 읽음)였으나, 파일이 비대해지면
토큰 절약을 위해 타 단계 파일을 참조하려는 유혹이 생길 수 있음.
본 룰은 이를 명시적 금지로 고정.

# Promotion 머지 시 backup 의무 (Issue247 Phase D)

slide-tuner Step 10(promote-to-data.py `--action merge`) 또는 사용자가 직접 `data/<stage>/*.yml`을 편집하기 전에 **반드시 자동·수동 backup 실행**. 머지 회귀 시 되돌리기 가능성 확보 + 학습 루프의 신뢰성 보장.

## 대상 yml

다음 yml 수정 시 backup 의무:

* `data/slide-tuner/patterns.yml` (카테고리·임계치·promotion 정책)
* `data/md-builder/styles.yml` (md 생성 정책)
* `data/layout-selector/rules.yml` (layout 자동 선택 룰)
* `data/slot-designer/patterns.yml` (slot 매핑)
* `data/media-creater/tools.yml` (미디어 도구 선택)
* `data/ppt2m2slide/heuristics.yml`·`mappings.yml` (역변환 정책)
* `data/agenda-designer/patterns.yml` (목차 패턴)
* `data/info-filler/questions.yml` (인터뷰 질문)
* `data/refs-collector/channels.yml` (refs 채널)
* `data/note-writer/patterns.yml` (발표자 노트 톤·slug·길이 정책)

## 자동 backup (promote-to-data.py 경유)

`promote-to-data.py --action merge` 실행 시 patterns.yml의 `promotion.target_yml`에 매핑된 yml에 대해 `lib/tuner/backup-data-yml.sh`가 자동 호출됨. 결과:

```
data/<stage>/_backup/<YYYYMMDD-HHMMSS>-<원본명>.yml
```

* 보유 상한: 30개 (스크립트가 회전 — 오래된 backup 자동 삭제)
* mode·timestamp 보존(`cp -p`)

## 수동 backup (직접 편집 전)

agent·skill이 위 대상 yml을 Edit 도구로 직접 수정하는 경우 **수정 직전** 다음 호출:

```bash
./lib/tuner/backup-data-yml.sh data/<stage>/<file>.yml
```

* Edit 도구 호출 전에 본 스크립트가 선행되어야 함
* 수정 사유는 commit message 또는 Issue에 기록 (스크립트는 사유 기록 안 함)

## 위반 시 대응

* yml 수정 후 backup 누락 발견 시 즉시 사용자 보고 + 다음 수정 전 backup 보강
* `~/.claude/learning_log.md`에 한 줄 기록 (`* YYYY-MM-DD: m2slide data yml backup 누락 — <파일>`)

# 정책 yml 커밋 규율 (Issue265)

정책 `data/<stage>/*.yml` 변경은 **코드·산출물과 분리된 단독 커밋**으로 한다.

## 왜 (사례 B)

정책 yml + 코드 + 빌드 산출물이 한 커밋에 섞이면 회귀가 났을 때 원인을 격리할 수 없다. 실제로 `01ad51a`·`80cd65b`·`b580e13` 세 커밋이 이 형태였고, theme fallback 회귀를 일으킨 코드가 `01ad51a` 안에 정책 변경과 함께 묻혀 있어 추적이 지연됐다. 정책은 "무엇을 강제할지"를 바꾸므로 산출물 전체에 파급되는데, 그 변경이 무해한 파일들 사이에 섞이면 diff 를 봐도 위험도가 드러나지 않는다.

## 규칙

* `data/<stage>/*.yml` 을 수정한 커밋에는 **다른 종류의 파일을 함께 담지 않는다**. 정책 문서(`_doc_arch/*.md`)·정책 lint 구현은 같은 변경의 일부이므로 예외적으로 동반 허용하되, **빌드 산출물(`Projects/*/slide/`)·무관한 코드 변경은 금지**한다.
* 커밋 메시지에 **근거를 명시**한다 — 이슈 번호 또는 `evidence` 출처(프로젝트·날짜·관측 내용).
* backup 은 수정 **직전**에 뜬다: `./lib/tuner/backup-data-yml.sh data/<stage>/<file>.yml` (본 문서 "Promotion 머지 시 backup 의무" 절).

## 커밋 메시지 형태

```
Policy(Issue265): drop_redundant_page_screenshot 를 goal-oriented 로 전환

근거: AgenticCoding 2026-07-06 bleed 8건 — 구 정규식(pdf-p\d+)이 sNN_iM.png 를 미검출
```

## 위반 시

* 이미 섞어 커밋했다면 되돌리지 말고 **후속 커밋에서 분리 이력을 남긴다**(정책 변경분을 별도 커밋으로 재기술). 강제 히스토리 재작성은 협업자 재clone 을 요구하므로 하지 않는다.
* 반복되면 `~/.claude/learning_log.md` 에 한 줄 기록.

## pre-commit 경고 훅 (Issue298)

문서 규율만으로는 사람 주의력에 의존하므로 pre-commit 훅으로 보강한다. staged 에 `data/<stage>/*.yml` 이 포함되고 동시에 무관한 파일(설계 문서·정책 lint 구현·정책 픽스처는 동반 허용)이 섞이면 **경고**한다(차단 아님 — 정당한 동반 변경이 존재하므로 hard fail 은 과함).

* 검사 로직: [`lib/hooks/check-policy-commit.sh`](../../lib/hooks/check-policy-commit.sh)
* 설치: `./lib/hooks/install-hooks.sh` — `.git/hooks/pre-commit` 에 심는다. 기존 pre-commit 이 있으면 덮지 않고 chain 라인만 append
* ⚠️ `.git/hooks/` 는 git 추적 대상이 아니므로 **clone 마다 개별 설치**. `graphify hook install` 처럼 다른 도구가 pre-commit 을 덮으면 재실행 필요
* `_backup/` 하위 yml 은 판정에서 제외

# 데이터 schema lint (Issue247 Phase D-3 완료 / Issue265 확장)

`./m2slide.sh --lint-data` subcommand로 data yml schema 일관성 검증. 다음 5종 검사:

1. **`data/<stage>/*.yml` yaml 파싱 가능성** — 구조 깨짐 차단. `_backup/` 하위 제외
2. **`data/slide-tuner/patterns.yml` categories ↔ priority 매핑** — `categories[].id`가 `priority` 리스트에 모두 포함 + priority에 미정의 id 부재
3. **`data/_proposals/promotion-*.md` frontmatter status 유효성** — `pending|merged|rejected|held` 중 하나
4. **goal-oriented 룰 스키마** (`lib/lint-policy-schema.py`, Issue265) — `schema_version: 2` 파일에서 `goal_type` 을 선언한 룰만 대상. enum 유효성 · `goal` 서술 존재 · enforce 룰의 `goal_check` 필수 · `goal_type`↔`goal_check` 계열 정합성 · `detect_hints` 단독 판정 금지 · `confidence>=medium` 의 `evidence` 필수
5. **산출물 위반 잔존** (`lib/lint-policy-artifacts.py`, Issue265) — 정책이 enforce 인데 실제 md 에 위반이 남아 있으면 fail-loud. 판정은 파일명이 아니라 이미지 속성(슬라이드 유일 이미지 · 페이지 종횡비 근접 · 형제 텍스트 존재 · 빈 alt). 옵트인 범위 = `Projects/<Name>/_pipeline/` 보유 프로젝트(ppt2m2slide 역변환 산출물)

> 검사 4~5 의 스키마 정의 SSOT 는 [`_doc_arch/policy-goal-schema.md`](../../_doc_arch/policy-goal-schema.md). `goal_type` enum 확장·술어 추가는 그 문서를 먼저 고치고 `lib/lint-policy-schema.py` 의 `GOAL_CHECK_FAMILIES` 를 동기화한다.
>
> 검사 4 는 L1 정의뿐 아니라 **L1+L2(`Projects/*/_pipeline/policy/<stage>.yml`) deep-merge 결과**도 검사한다 (Issue297) — L2 가 `goal_type` 변경·`goal_check` 무력화·계열 밖 술어 주입으로 정책을 우회하는 것을 차단. cascade 경계는 [`_doc_arch/pipeline-policy-cascade.md`](../../_doc_arch/pipeline-policy-cascade.md) "룰 내부 스키마와의 경계".

사용 예:

```bash
./m2slide.sh --lint-data
# ✅ 모든 검사 통과 → exit 0
# ❌ 위반 발견 시 위반 항목 stderr 출력 + exit 1
```

권장 적용 시점:

* `data/<stage>/*.yml` 또는 `data/_proposals/promotion-*.md` 수정 commit 직전
* CI 도입 시 pre-commit hook으로 자동 실행
* `promote-to-data.py --action merge` 후 사용자 yml 편집 완료 직후

회귀 테스트:

```bash
./z_test/run-policy-fixture.sh
```

골든 픽스처(`z_test/fixtures/policy/redundant-page-screenshot/`)로 정책이 **파일명 의존 판정으로 회귀하지 않았는지** 검증한다. 픽스처는 네이밍 3종(`pdf-pNNN` · `sNN_iM` · `Deck_vNN_N`)을 담고 있으며, `detect_hints` 에 등록되지 않은 세 번째 네이밍까지 검출해야 통과한다.

확장 후보 (TODO):

* 🚧 [TODO] 나머지 정책 yml 9종의 goal-oriented 전환 (본 이슈 파일럿은 `heuristics.yml` 1종). 미전환 룰 수는 `--lint-data` 검사 4가 정보 라인으로 보고
* 🚧 [TODO] 덱 목적(`purpose`) 축 도입 시 `applies_to_purpose`·`relax_when` 검사 추가 — Issue295
* `data/md-builder/styles.yml` schema 검증 (스타일 룰 구조 정합성)
* `data/layout-selector/rules.yml` schema 검증
* `data/_proposals/promotion-*.md`에 `category`·`count`·`threshold` 필드 누락 검증

# 참조

* 영속 설계 SSOT: [`../../_doc_arch/authoring-pipeline.md`](../../_doc_arch/authoring-pipeline.md) "데이터 접근 범위 격리" 섹션
* 데이터-주도 SCAR 패턴: 동 SSOT "SCAR 본문 작성 규칙" 섹션
* 정책 cascade: [`../../_doc_arch/pipeline-policy-cascade.md`](../../_doc_arch/pipeline-policy-cascade.md)
* backup 스크립트: [`../../lib/tuner/backup-data-yml.sh`](../../lib/tuner/backup-data-yml.sh)
* promote-to-data: [`../../lib/tuner/promote-to-data.py`](../../lib/tuner/promote-to-data.py)
* 학습 루프 plan: [`../../_doc_work/z_done/plan/feedback-learning-loop_plan.md`](../../_doc_work/z_done/plan/feedback-learning-loop_plan.md)
