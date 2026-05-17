---
title: md-updater
description: authoring-pipeline 단계 4(md 생성) — AGENDA 골격 + refs/ 기반으로 슬라이드 본문(불릿·표·코드블록)을 자동 채우는 skill. 사용자 검토 체크포인트 필수. md-rules + md-slide-rules + md-m2slide-rules 모두 준수. 빌드 lint 실패 시 1회 자동 수정.
date: 2026-05-17
---

# 목적

m2slide authoring-pipeline 단계 4를 담당하는 skill. 단계 3 agenda-designer가 만든 슬라이드 헤더 골격에 본문을 자동 채워 완성합니다. agent가 아닌 skill로 구현한 이유: 슬라이드 단위 partial update가 빈번하고 사용자 검토 루프가 잦기 때문.

# 트리거

* `/md-update <ProjectName>` 커맨드 또는 `md-updater` skill 직접 호출
* Issue156 orchestrator agent의 단계 4 위임

# 핵심 원칙

1. **헤더 보존** — agenda-designer가 작성한 H1/H2 헤더는 절대 변경 금지. 본문만 추가.
2. **3단계 규칙 준수** — md-rules(일반) + md-slide-rules(슬라이드 공통) + md-m2slide-rules(m2slide 특화) 모두 충족.
3. **사람 검토 루프** — 챕터별 본문 작성 후 사용자 승인 대기. orchestrator `--no-checkpoint` 시 일괄 진행.
4. **빌드 lint 재시도** — `./run.sh --lint-layouts` 실패 시 1회 자동 수정 시도, 2회 실패 시 사용자 보고.
5. **layout 메타 미주입** — `#layout-*` 메타는 단계 6 layout-selector 책임. 본 skill은 본문 텍스트만.

# 입력

* 필수: `Projects/<Name>/Info.md`, `Projects/<Name>/markdown/AGENDA.md` 또는 `<Name>.md` skeleton
* 선택: `Projects/<Name>/refs/*.md` (본문 작성 시 발췌 활용)

# 산출물

* chapter mode: `Projects/<Name>/markdown/XX-title.md` 본문 완성본
* single mode: `Projects/<Name>/<Name>.md` 본문 완성본

# 처리 흐름

## 1. 입력 분석

```
Read Info.md → topic, audience, style, goals 추출
Read AGENDA.md 또는 <Name>.md → 챕터·슬라이드 헤더 목록 추출
Read refs/*.md → 키워드별 발췌 내용 인덱싱
```

## 2. mode 판정

* `markdown/AGENDA.md` 존재 → chapter mode
* 단일 `<Name>.md` + frontmatter `type: ppt` → single mode
* 모호 시 사용자 질의

## 3. 슬라이드별 본문 작성

각 H2 슬라이드에 대해 다음 순서로 본문 채움:

| 슬라이드 유형          | 본문 패턴                                                             |
| :--------------------- | :-------------------------------------------------------------------- |
| 도입·인사              | 환영 메시지 + 학습 목표 3~5개 불릿                                    |
| 개념 설명              | 정의 → 비유 → 예시 3단계 불릿                                         |
| 비교·대조              | 표 (3~5열, 5~7행)                                                     |
| 프로세스·흐름          | 순차 불릿 또는 mermaid placeholder (단계 5에서 변환)                  |
| 코드·명령              | 코드블록 (언어 지정 필수)                                             |
| 산출물·결과            | 스크린샷 placeholder + 설명 불릿                                      |
| 정리·다음 단계         | 핵심 요약 3~5개 + 후속 자료 링크                                      |

## 4. md 규칙 준수

* Frontmatter 보존 + `release_date` 자동 갱신 (m2slide release-date-rules)
* 불릿: 1단계 `*`, 2단계 `-`
* 표: border-collapse + 공백 패딩 정렬
* 슬라이드 한 장에 7±2 항목 이내 (md-slide-rules)
* 코드블록 언어 지정 필수
* 이미지 alt 텍스트 필수

## 5. 사용자 검토 체크포인트

chapter mode는 챕터별 1회 검토:

```
챕터 1 (01-intro.md) 본문 작성 완료. 검토 요청.

승인 → 다음 챕터
수정 요청 → 사용자 피드백 반영 후 재작성
중단 → 작업 보류 (다음 호출 시 재개)
```

single mode는 전체 1회 검토.

## 6. 빌드 검증

```bash
./run.sh --lint-layouts
./m2slide.sh <ProjectName>
```

* lint 실패 → 오류 메시지 분석 → 1회 자동 수정
* 빌드 실패 → 사용자 보고
* HTML 산출물 검증 (apply-verify-rules 준수)

# 검증 체크리스트

- [ ] 모든 H2 슬라이드 본문 채워짐
- [ ] frontmatter `release_date` 오늘 날짜
- [ ] `./run.sh --lint-layouts` 통과
- [ ] `./m2slide.sh <Name>` 빌드 성공
- [ ] 슬라이드 구분자 `---` 일관성
- [ ] 코드블록 언어 지정
- [ ] 이미지 alt 텍스트
- [ ] 사용자 검토 승인 (orchestrator `--no-checkpoint` 미지정 시)

# Out of scope

* H1/H2 헤더 변경 — agenda-designer 책임
* 다이어그램·이미지 생성 — Issue162 media-creater 책임
* layout 메타 주입 — 단계 6 layout-selector 책임
* slot 매핑 — 단계 7 slot-designer 책임

# 종료 조건

* 모든 슬라이드 본문 작성 + 빌드 검증 통과 + 사용자 승인
* 빌드 lint 2회 연속 실패 시 사용자 보고 + 중단

# 참조

* m2slide 마크다운 규칙: [`../../.claude/rules/md-m2slide-rules.md`](../../rules/md-m2slide-rules.md)
* release-date 규칙: [`../../.claude/rules/release-date-rules.md`](../../rules/release-date-rules.md)
* apply-verify 규칙: [`../../.claude/rules/apply-verify-rules.md`](../../rules/apply-verify-rules.md)
* 파이프라인: [`../../../_doc_arch/authoring-pipeline.md`](../../../_doc_arch/authoring-pipeline.md) 단계 4
* umbrella task: [`../../../_doc_work/tasks/authoring-pipeline_task.md`](../../../_doc_work/tasks/authoring-pipeline_task.md)
* 담당 이슈: Issue161 (depends: Issue160)
