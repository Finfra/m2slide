---
name: data-access-rules
description: 파이프라인 단계별 SCAR의 data/ 폴더 접근 범위 격리 정책 — 크로스-단계 읽기 금지
date: 2026-05-26
---

> 영속 설계 SSOT: `_doc_arch/authoring-pipeline.md` "데이터 접근 범위 격리" 섹션 · 📖 **상세 조건부**(Issue429): 목적·금지 패턴 예시·실행 가드·배경·**`data/<stage>/*.yml` 수정 전 backup 의무**·**정책 yml 단독 커밋 규율**·pre-commit 훅·schema lint(`--lint-data`) 는 [data-access-detail.md](../rules-ondemand/data-access-detail.md) — `data/` 하위 yml 을 **고치거나 커밋하기 전에 Read**

각 파이프라인 단계 SCAR(agent/skill)은 **자기 `data/<stage>/` 폴더만** 읽는다. 타 단계 정책이 필요하면 자기 data 파일로 복제·요약하거나 공유 파일 승격 이슈를 등록한다.

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
| fwd  | `m2slide2ppt`       | `data/m2slide2ppt/`       | 정방향(원고 → pptx) 판정·왕복 계약 전용     |

## 공유 허용 — **파일의 `kind` 선언으로 판정한다** (Issue340)

> **`kind: catalog` 인 파일은 모든 단계에서 읽을 수 있다.**

`data/` 하위 모든 yml 은 첫 줄에 범주를 스스로 선언한다. 판정 근거는 **위치가 아니라 그 선언**이다.

| `kind` | 무엇 | 읽기 |
| :--- | :--- | :--- |
| `policy/stage` | 파이프라인 단계 정책 (`data/<stage>/`) | **그 단계 SCAR 만** |
| `policy/upstream` | 글로벌 SCAR 정책에 얹는 m2slide 측 local override (`img-cartoon` 류) | 그 벤더 경로만 |
| `catalog` | 단계 종속이 아닌 공유 어휘·인벤토리 | **전 단계 허용** |

* 파일을 열면 첫 줄에 있으므로 **판정이 필요한 순간에 보인다**. 목록을 찾아 대조할 필요가 없다
* 집행: `./m2slide.sh --lint-data` 검사 6번([lint-policy-kind.py](../../lib/lint-policy-kind.py)) — 선언 누락·오값·위치 불일치를 차단
* `data/Info.template.md` 는 yml 이 아니지만 같은 취지의 공유 자산이라 전 단계 읽기를 허용한다


# 예외

* **프로젝트 policy override**: `Projects/<N>/_pipeline/policy/<단계>.yml` — 해당 단계 SCAR만 읽음. 다른 단계의 override 파일은 읽지 않음.
* **단계 10 (`md2tts-txt`)**: `lib/tts/.claude/rules/tts-pronunciation-rules.md` 읽기 허용 — m2slide data/ 외부 룰이므로 예외. 단, `data/<other_stage>/` 접근은 금지. (경로 정정: 구 표기 `~/.claude/rules/...` 는 글로벌 SCAR 를 가리켜 실재하지 않았음. 실 소유는 videoMaker → **lib/tts** — Issue23 이관)
* **orchestrator (`authoring-pipeline` agent)**: 각 단계 위임·결과 검증용으로 state.yml·history.md만 읽음. `data/<stage>/` 직접 읽기 금지 (각 단계 SCAR에 위임).
