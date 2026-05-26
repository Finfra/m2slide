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
| 9    | `md2tts-txt`        | (없음)                    | 글로벌 tts-pronunciation-rules.md만 허용   |
| rev  | `ppt2m2slide`       | `data/ppt2m2slide/`       | 역변환 파이프라인 전용                     |

## 공유 허용 파일 (data/ 루트 직속, 전 단계 허용)

다음 파일은 모든 단계에서 읽기 허용 — 단계 종속이 아닌 범용 카탈로그이기 때문:

* `data/component-libraries.yml` — 시각화 라이브러리 메타 SSOT
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
* **단계 9 (`md2tts-txt`)**: 글로벌 `~/.claude/rules/tts-pronunciation-rules.md` 읽기 허용 — m2slide data/ 외부 글로벌 룰이므로 예외. 단, `data/<other_stage>/` 접근은 금지.
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

# 참조

* 영속 설계 SSOT: [`../../_doc_arch/authoring-pipeline.md`](../../_doc_arch/authoring-pipeline.md) "데이터 접근 범위 격리" 섹션
* 데이터-주도 SCAR 패턴: 동 SSOT "SCAR 본문 작성 규칙" 섹션
* 정책 cascade: [`../../_doc_arch/pipeline-policy-cascade.md`](../../_doc_arch/pipeline-policy-cascade.md)
