---
name: feedback-process
description: "dev-server 개요 페이지에서 적재된 슬라이드 피드백(_pipeline/feedback/dev-feedback.jsonl)을 일괄 처리 — 소스 md 수정 + 재빌드 + 처리분 아카이브"
date: 2026-07-06
---

# /feedback-process — dev-server 피드백 일괄 처리

dev-server 개요 페이지(`/p/<P>`)의 [전송]으로 적재된 슬라이드 피드백을 소비하는 수동 처리 커맨드 (Issue264 — 세션 자동 생성 대신 사용자가 원할 때 실행).

## 사용법

```
/feedback-process <ProjectName>
```

* `<ProjectName>` 생략 시: `Projects/*/_pipeline/feedback/dev-feedback.jsonl` 중 비어있지 않은 파일을 Glob으로 찾아, 1개면 그 프로젝트로 진행, 복수면 사용자에게 선택 질의.

## 입력 파일

| 파일 | 역할 |
| :--- | :--- |
| `Projects/<P>/_pipeline/feedback/dev-feedback.jsonl` | 미처리 인박스 (1줄 = 1건) |
| `Projects/<P>/_pipeline/feedback/dev-feedback.done.jsonl` | 처리 완료 아카이브 (본 커맨드가 append) |

레코드 스키마: `{"ts", "chap", "slide", "title", "opinion", "kind"}` (Issue368 — 구 `policy` bool 은 `kind` 로 대체) — `chap`/`slide`는 dev-server short URL 좌표계(1-base), `title`은 렌더 시점 슬라이드 제목.

## 처리 절차 (순서 고정)

1. **읽기·중복 제거**: 인박스 jsonl 전체 Read. `(chap, slide, opinion)` 동일 항목은 1건으로 dedup (같은 의견 다중 클릭 대응). 파일 없음·0건이면 "처리할 피드백 없음" 보고 후 종료.
2. **슬라이드 특정** (각 항목):
    - 대상 섹션 확인: `curl 'http://127.0.0.1:9877/p/<P>/s/<chap>/<slide>?mode=text'` 로 빌드 산출물의 해당 슬라이드 본문 확보 (dev-server 미가동 시 `./m2slide.sh --serve start`).
    - 소스 md 매핑: `chap` = `slide/` 하위 챕터 html 정렬 순번 → 같은 stem의 `markdown/<stem>.md` (single mode면 `<P>.md`). 빌드 산출물에는 cover·toc가 주입되어 있어 `slide` 인덱스가 소스 슬라이드 순번과 1:1이 아님 — **`title` + 본문 텍스트를 앵커로 소스 슬라이드를 특정**하고, 인덱스는 보조로만 사용.
    - 특정 실패(제목 매칭 불가 등) 항목은 수정하지 않고 "미특정" 목록으로 분리.
3. **의견 반영 수정**: `opinion`을 지시로 해석하여 소스 md의 해당 슬라이드를 Edit. `.claude/rules/md-m2slide-rules.md` 준수 (layout 메타·slot·카드 문법 등). 의견이 모호하면 최소 침습 해석 — 확신 없으면 해당 항목을 "판단 보류"로 분리하고 사용자에게 질의.
4. **재빌드·검증**: `./m2slide.sh <P>` 빌드 후 `.claude/rules/apply-verify-rules.md` 절차(산출물 HTML 확인 + 결과 링크 보고). 수정 슬라이드의 deck deep-link 제시.
5. **아카이브**: 처리 성공 항목의 원본 줄을 `dev-feedback.done.jsonl`에 append(처리 시각 `done_ts` 필드 추가)한 뒤, 인박스 jsonl을 **미처리 항목(미특정·보류)만 남겨 재작성**. 전부 처리됐으면 빈 파일이 됨 — 개요 페이지 "미처리 N건" 카운트가 인박스 줄 수와 연동되므로 이 단계 생략 금지.
6. **보고**: 처리/미특정/보류 건수 + 항목별 수정 내용 1줄 + 결과 링크(`http://127.0.0.1:9877/p/<P>/n/<chap>/<slide>`).

## 도구 의견은 범위 밖 (Issue368)

`kind: "tool"` 로 보낸 의견은 이 인박스에 없다 — m2slide 자신의 `_doc_work/feedback/tool-inbox.jsonl` 로 가며, 렌더·테마 결함이므로 m2slide 이슈로 처리한다. 본 커맨드는 **원고 의견만** 소비한다.

⚠️ **실행 주체** — 이 커맨드는 *원고가 사는 프로젝트*의 세션에서 돈다. 마운트된 덱(`Projects/<P>` 가 심링크)이면 그 덱을 소유한 prj 세션이며, 개요 페이지가 실행 위치를 함께 표시한다. 글로벌 승격은 prj3#Issue637.

## 종료 조건·제약

* 인박스 1회 드레인으로 종료 — 처리 중 새로 들어온 항목은 다음 실행에서 처리 (재스캔 루프 금지).
* 빌드 실패 시 1회 원인 수정 후 재시도, 재실패 시 아카이브 없이 중단 + 사용자 보고 (인박스 보존).
* 소스 md 외 파일(테마 CSS·generator JS) 수정이 필요한 의견은 수정하지 않고 이슈 등록 제안으로 보고.

## 참조

* 설계 SSOT: [`_doc_arch/dev-server-feedback.md`](../../_doc_arch/dev-server-feedback.md)
* 빌드·검증: [`.claude/rules/apply-verify-rules.md`](../rules/apply-verify-rules.md)
* 슬라이드 md 규칙: [`.claude/rules/md-m2slide-rules.md`](../rules/md-m2slide-rules.md)
