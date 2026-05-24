---
name: graphify-rules
description: graphify 활용 룰 — 글로벌 위임 + m2slide 자동 발동 트리거
date: 2026-05-25
---

> 본 룰은 글로벌 `~/.claude/rules/graphify-rules.md`에 위임. 본 파일은 진입점·표지 역할 + m2slide 고유 자동 트리거 정책.

# 핵심

* **진입점**: `graphify-out/GRAPH_REPORT.brief.md` 최우선 (≤100줄). 없으면 `/graphify-prune` 1회 실행 후 사용
* **금지**: `GRAPH_REPORT.md` / `graph.json` / `graph.html` / `cache/*` 직접 Read
* **CLI 우선**: 코드/아키텍처 질문은 `graphify query "<질문>"` · `graphify path "<A>" "<B>"` · `graphify explain "<개념>"`. 일반 grep/Read fallback 금지
* **유지**: 파일 수정 후 `graphify update .` (post-commit hook 있으면 자동)
* **부분 발췌**: `GRAPH_REPORT.md`가 필요하면 `sed -n '/^## 섹션명/,/^## /p' graphify-out/GRAPH_REPORT.md` 로 bash 발췌만 허용

# 자동 발동 트리거 (Issue231)

다음 패턴 감지 시 **즉시 `graphify query/path/explain`을 grep보다 먼저** 실행. 사용자 명시 `--no-graphify` 또는 단일 파일 명백한 위치(파일·라인 모두 알려진 상태)면 예외.

## 사용자 표현 트리거

* "왜 X가 Y에서 안 보임?", "왜 X가 누락됨?", "왜 안 나옴?" (원인 추적)
* "어디서 Z 호출됨?", "Z 어디 쓰여?" (참조 추적)
* "A → B 추적", "A에서 B까지 흐름" (경로 탐색)
* "X와 Y 관계", "X가 Y에 영향?" (인과 분석)
* "M개 파일 걸친 동작 분석", "이 기능 전체 흐름" (다중 파일 traversal)

## 사용 패턴 트리거

* `grep` 검색 결과 **3개 이상 파일**이 걸리면 즉시 `graphify query` 전환
* `Read`로 동일 디렉토리 **3개 이상 파일** 연속 읽으면 즉시 `graphify path` 또는 `explain` 전환
* slide-parser / html-builder / agenda / config / markdown 다중 모듈 추적은 항상 graphify 우선

## 명령어 매핑

| 사용자 표현                       | 우선 명령어                                  |
| :------------------------------- | :------------------------------------------ |
| "왜 X가 안 보임?"                | `graphify query "X 누락 원인"`               |
| "어디서 Z 호출됨?"               | `graphify query "Z 호출 위치"`              |
| "A → B 추적"                     | `graphify path "A" "B"`                      |
| "X 개념 설명"                    | `graphify explain "X"`                       |
| 인과·관계·흐름 일반              | `graphify query "<질문 그대로>"`             |

# 위반 시 대응 (Issue231)

* 룰 위반(graphify 미사용)을 사용자가 지적하면 즉시:
    1. 해당 세션의 누락 부분에 대해 `graphify query` 재실행하여 보완
    2. `~/.claude/learning_log.md`에 한 줄 기록 (`* YYYY-MM-DD: m2slide graphify 우회 회귀 — <상황>`)
    3. memory `feedback_graphify_first` 강화 (재발 시 ranking 상향)
* `grep` 4회 이상 누적 + 다중 파일 추적 중이면 self-trigger — 사용자 지적 없이도 즉시 graphify 전환

# 보조 커맨드

* `/graphify-prune` — `GRAPH_REPORT.brief.md` 재생성
* `/gq <질문>` — `graphify query` 래퍼 (상위 결과만 반환)

# 적용 SSOT

* 본 프로젝트 표준 설정 근거: `~/_git/___pm/_doc_arch/graphify-priority-setup.md`
* 글로벌 룰 전문: `~/.claude/rules/graphify-rules.md`
* 등록 이슈: `Issue.md` Issue231
