---
title: md-builder
description: authoring-pipeline 단계 4(md 생성) — AGENDA 골격 + refs/ 기반으로 슬라이드 본문(불릿·표·코드블록)을 자동 채우는 skill. 스타일·슬라이드 유형 패턴·콘텐츠 제한·검증 게이트·체크포인트는 data/md-builder/styles.yml에서 로드(v2 데이터-주도). md-rules + md-slide-rules + md-m2slide-rules 모두 준수. 빌드 lint 실패 시 1회 자동 수정.
date: 2026-05-19
---

# 목적

m2slide authoring-pipeline 단계 4를 담당하는 skill. 단계 3 agenda-designer가 만든 슬라이드 헤더 골격에 본문을 자동 채워 완성합니다. agent가 아닌 skill로 구현한 이유: 슬라이드 단위 partial update가 빈번하고 사용자 검토 루프가 잦기 때문.

# 트리거

* `/md-build <ProjectName>` 커맨드 또는 `md-builder` skill 직접 호출
* orchestrator agent의 단계 4 위임

# 데이터 로드 (v2 — Issue171)

본 skill은 `data/md-builder/styles.yml`을 SSOT로 사용합니다. 본 skill 본문은 **"본문을 어떻게 작성·검증·체크포인트하는가"**만 기술하고, 실제 정책(스타일·슬라이드 유형 패턴·콘텐츠 제한·검증 규칙·체크포인트 메시지)은 yml에서 로드합니다. 사용자가 yml을 수정하면 skill 본문 변경 없이 즉시 반영됩니다.

* SSOT yml: [`../../../data/md-builder/styles.yml`](../../../data/md-builder/styles.yml)
* yml 최상위 키:
    - `styles[]` — 분야별 본문 스타일 (formal_lecture/casual_tutorial/keynote_punchy/conversational)
    - `style_selection_rules[]` — Info.md tone → style 자동 매핑
    - `slide_patterns[]` — 슬라이드 유형별 본문 템플릿 (intro·concept·comparison·process·code·result·summary·qna_closing·exercise_closing·wrap_narration)
    - `closing_slide_policy` — Info.md tone별 마지막 슬라이드 자동 append 정책 (강의→Q&A, 튜토리얼→실습, 내레이션→마무리, 발표/대화→Q&A, 기타→none)
    - `content_limits` — 슬라이드당 콘텐츠 양 제한 (bullets/code_lines/table 등)
    - `md_rules_compliance[]` — 준수해야 할 3-tier 룰 파일 매핑
    - `checkpoint` — chapter/single mode별 체크포인트 메시지 + skip_flag
    - `validation_rules` — 빌드 lint + content checks
    - `header_preservation` — H1/H2 헤더 보존 정책 (closing_append 예외 포함)
    - `layout_meta_policy` — layout 메타 미주입 정책
    - `report_template` — 종료 보고 양식

* 보조 자산:
    - `data/md-builder/templates/` — 슬라이드 유형별 보조 템플릿 (선택, 현재 빈 폴더)

## 프로젝트 정책 cascade (L2)

본 단계는 글로벌 정책(L1) 위에 프로젝트 override(L2)를 deep-merge하여 사용함.

* L1: `data/md-builder/styles.yml` (위 SSOT yml)
* L2: `Projects/<Name>/_pipeline/policy/md-builder.yml` (존재할 때만)

병합 절차:

1. L1 yml Read
2. `Projects/<Name>/_pipeline/policy/md-builder.yml` 존재 시 Read
3. deep-merge — L2 키를 L1 위에 덮어씀 (scalar·매핑은 L2 값 우선, 리스트는 L2 값으로 치환)
4. L2 키가 L1 스키마에 없으면(orphan) 경고 출력 후 해당 키 무시
5. 병합 결과를 본 단계 동작 정책으로 사용

L2 부재 시 L1 그대로 사용 (하위호환). 설계 SSOT: [`../../../_doc_arch/pipeline-policy-cascade.md`](../../../_doc_arch/pipeline-policy-cascade.md)

# 핵심 원칙

1. **데이터-주도** — 스타일·패턴·제한·검증 모두 yml에서 Read. SCAR 본문 하드코딩 금지.
2. **헤더 보존** — `header_preservation` 정책 적용. agenda-designer가 작성한 H1/H2 절대 변경 금지. 본문 + H3 이하만 추가.
3. **3단계 규칙 준수** — `md_rules_compliance[]`에 명시된 글로벌 + 슬라이드 공통 + m2slide 특화 룰 모두 충족.
4. **사람 검토 루프** — `checkpoint.chapter_mode.per_chapter: true` 적용. orchestrator `--no-checkpoint` 시 일괄 진행.
5. **빌드 lint 재시도** — `validation_rules.build_lint` 실패 시 `retry_count: 1` 자동 수정, 2회 실패 시 사용자 보고.
6. **layout 메타 미주입** — `layout_meta_policy.inject_layout_directive: false`. `#layout-*` 메타는 단계 6 layout-selector 책임.
7. **마지막 closing 슬라이드 자동 append** — `closing_slide_policy.enabled: true`이면 Info.md `tone`별 매핑(tone_mapping)에 따라 마지막 H2 슬라이드 뒤에 closing 슬라이드 1개 append. `header_preservation.exceptions.closing_append` 예외로 H2 추가 허용. 마지막 H2가 이미 closing pattern triggers 매칭 시 skip (중복 방지).

# 적용 알고리즘 (styles.yml 활용)

1. **yml 로드** — `Read data/md-builder/styles.yml` → 전체 키 추출
2. **입력 분석** — `Read Info.md` → `topic`, `audience`, `tone`, `goals[]` 추출. `Read AGENDA.md` 또는 `<Name>.md` → 챕터·슬라이드 헤더 목록 추출. `Glob refs/*.md` → 키워드별 발췌 인덱싱
3. **mode 판정** — `markdown/AGENDA.md` 존재 → chapter, 단일 `<Name>.md` + frontmatter `type: ppt` → single
4. **스타일 선택** — `style_selection_rules[]` 순차 평가 → `styles[].id` 매칭. tone 없으면 `default: formal_lecture`
5. **슬라이드 분류** — 각 H2 슬라이드 제목의 키워드 매칭으로 `slide_patterns[].triggers`에서 적합한 패턴 선택. 미매칭 시 일반 불릿 본문
6. **본문 작성**:
    - 선택된 `slide_patterns[].body_template`에 변수 치환
    - `styles[].rules`·`forbidden` 적용 (어조·금지 표현)
    - `content_limits` 준수 (bullets_max·code_lines_max 등)
    - **심벌·이모지 삽입** — 본문에 심벌(`:fa-name:`)·이모지를 넣을 때 `data/symbol-usage.yml`·`data/emoji-usage.yml`의 `usages[].situation` 매핑을 참조. 매칭되는 situation이 없으면 삽입하지 않음(억지 금지). 개수·절제는 선택 tone과 `emoji-usage.yml.tone_guide`·`symbol-usage.yml.principles` 준수
7. **마지막 closing 슬라이드 append** — `closing_slide_policy.enabled: true`이고 Info.md `tone`이 `tone_mapping`에 매칭되면 마지막 H2 뒤에 매핑된 `append_pattern` body_template을 `---` 구분자와 함께 append. `chapter_mode_target: last_chapter_only` (chapter mode는 마지막 챕터 파일만). 마지막 H2 제목이 이미 해당 pattern의 triggers에 매칭 시 skip
8. **헤더 보존 검증** — `header_preservation`에 따라 H1/H2 변경 여부 확인. `exceptions.closing_append`는 허용. 그 외 변경 시 reject + 재작성
9. **md 규칙 검증** — `md_rules_compliance[]` 항목별 자동 검사
10. **체크포인트** — `checkpoint.chapter_mode.per_chapter: true`이면 챕터별, single mode는 전체 1회
11. **빌드 검증** — `validation_rules.build_lint` + `build_compile` 순차 실행
12. **종료 보고** — `report_template` 양식

# 확장 지점

사용자는 `data/md-builder/styles.yml`을 직접 수정하여 다음을 SCAR 변경 없이 적용:

* **신규 스타일 추가** — `styles[]`에 entry 추가 (id/label/tone/person/rules/forbidden)
* **tone 매핑 변경** — `style_selection_rules[]`에 if/use entry 추가·수정
* **closing 슬라이드 정책 변경** — `closing_slide_policy.tone_mapping[]`에서 tone→pattern 매핑 추가·삭제·변경. 비활성화는 `closing_slide_policy.enabled: false`. 신규 closing pattern은 `slide_patterns[]`에 추가 후 매핑
* **슬라이드 유형 패턴 추가** — `slide_patterns[]`에 entry 추가 (triggers + body_template)
* **콘텐츠 제한 조정** — `content_limits.bullets_max`·`code_lines_max` 등 변경
* **3-tier 룰 매핑 변경** — `md_rules_compliance[]` source 추가
* **체크포인트 메시지** — `checkpoint.chapter_mode.template` 또는 `single_mode.template` 변경
* **검증 게이트** — `validation_rules.content_checks[]` 항목 추가
* **헤더 보존 정책** — `header_preservation.modify_allowed` 변경 (예: H3까지 보존)
* **종료 보고 양식** — `report_template` 변경
* **보조 템플릿** — `data/md-builder/templates/<slide_type>.md` 추가 → `slide_patterns[].body_template_file: ...` 참조

본 skill 호출 시점에 yml을 매번 Read하므로, 수정 후 다음 호출부터 즉시 반영.

# 입력

* 필수: `Projects/<Name>/Info.md` (단계 1 산출 — `topic`/`audience`/`tone`/`goals[]`)
* 필수: `Projects/<Name>/markdown/AGENDA.md` (chapter mode) 또는 `<Name>.md` skeleton (single mode) (단계 3 산출)
* 필수: [`data/md-builder/styles.yml`](../../../data/md-builder/styles.yml) (스타일·패턴·검증 SSOT)
* 선택: [`data/symbol-usage.yml`](../../../data/symbol-usage.yml) · [`data/emoji-usage.yml`](../../../data/emoji-usage.yml) (본문 심벌·이모지 삽입 시 상황별 권장 SSOT)
* 선택: `Projects/<Name>/refs/*.md` (본문 작성 시 발췌 활용)
* 선택: orchestrator 인자 `--no-checkpoint`

# 산출물

* chapter mode: `Projects/<Name>/markdown/{nn}-{slug}.md` 본문 완성본 (H1/H2 보존, 본문 추가)
* single mode: `Projects/<Name>/<Name>.md` 본문 완성본

# 처리 흐름

## 1. 입력 검증

* `Projects/<Name>/Info.md` 존재 확인. 없으면 단계 1 위임 권고
* `markdown/AGENDA.md` 또는 `<Name>.md` skeleton 존재 확인. 없으면 단계 3 위임 권고
* yml [`data/md-builder/styles.yml`](../../../data/md-builder/styles.yml) 존재 확인. 없으면 작업 중단 (yml SSOT)

## 2. Info.md + AGENDA 파싱

```
Read Info.md → topic, audience, tone, goals[] 추출
Read AGENDA.md 또는 <Name>.md → 챕터·슬라이드 헤더 목록 추출
Glob refs/*.md → 키워드별 발췌 인덱싱
```

## 3. mode + 스타일 판정

* `markdown/AGENDA.md` 존재 → chapter mode
* 단일 `<Name>.md` + frontmatter `type: ppt` → single mode
* 모호 시 사용자 질의
* `style_selection_rules[]` 순차 평가 → 스타일 ID 결정

## 4. 슬라이드별 본문 작성

각 H2 슬라이드:

1. 제목 키워드를 `slide_patterns[].triggers`와 매칭 → 패턴 선택
2. `body_template`에 변수 치환 (refs 발췌, Info.md goals 등 활용)
3. `styles[].rules` 적용 (어조), `forbidden` 회피
4. `content_limits` 준수

## 5. 헤더 보존 + md 규칙 검증

* `header_preservation` 정책 검사: H1/H2 변경 여부 — 변경 시 reject + 재작성
* `md_rules_compliance[]` 항목별 자동 검사

## 6. 사용자 검토 체크포인트

* chapter mode: `checkpoint.chapter_mode.template` (챕터별 1회)
* single mode: `checkpoint.single_mode.template` (전체 1회)
* `--no-checkpoint` 시 일괄 진행
* 사용자 응답:
    - "승인" → 다음 챕터 또는 단계 5로
    - "수정" → `on_reject.action: ask_user_feedback` (`max_iterations: 3`)
    - 중단 → 작업 보류 (다음 호출 시 재개)

## 7. 빌드 검증

* `validation_rules.build_lint.command` (`./run.sh --lint-layouts`) 실행
    - 실패 시 `retry_count: 1` 자동 수정 시도
    - 2회 실패 시 사용자 보고 + 중단
* `validation_rules.build_compile.command` (`./m2slide.sh <Name>`) 실행
    - 실패 시 즉시 사용자 보고
* `content_checks[]` 자동 검사

## 8. 종료 보고

`report_template` 양식. 변수 치환:

* `{mode}` / `{chapter_count}` / `{slide_count}` / `{style_id}` / `{style_label}`
* `{filled_count}` — 본문 작성 완료 슬라이드 수
* `{lint_status}` / `{build_status}` / `{checkpoint_status}`

# 검증 체크리스트

- [ ] 모든 H2 슬라이드 본문 채워짐 (`content_checks.all_h2_slides_have_body`)
- [ ] frontmatter `release_date` 오늘 날짜 (`md_rules_compliance` release-date-rules)
- [ ] `./run.sh --lint-layouts` 통과 (`validation_rules.build_lint`)
- [ ] `./m2slide.sh <Name>` 빌드 성공 (`validation_rules.build_compile`)
- [ ] 슬라이드 구분자 `---` 일관성 (`content_checks.slide_separator_consistency`)
- [ ] 코드블록 언어 지정 (`content_checks.code_block_language_specified`)
- [ ] 이미지 alt 텍스트 (`content_checks.image_alt_text_required`)
- [ ] H1/H2 헤더 변경 없음 (`header_preservation`) — `closing_append` 예외 외
- [ ] tone 매칭 시 마지막 closing 슬라이드 1개 append됨 (`closing_slide_policy`), 중복 시 skip
- [ ] 사용자 검토 승인 (orchestrator `--no-checkpoint` 미지정 시)

# Out of scope

* H1/H2 헤더 변경 — 단계 3 agenda-designer 책임
* 다이어그램·이미지 생성 — 단계 5 media-creater 책임 (mermaid placeholder는 본문에 둘 수 있으나 실제 생성은 단계 5)
* layout 메타 주입 — 단계 6 layout-selector 책임 (`layout_meta_policy.inject_layout_directive: false`)
* slot 매핑 — 단계 7 slot-designer 책임

# 종료 조건

* 모든 슬라이드 본문 작성 + 빌드 검증 통과 + 사용자 승인
* 빌드 lint 2회 연속 실패 시 사용자 보고 + 중단
* `checkpoint.on_reject.max_iterations`(3회) 초과 시 중단

# 정책 변경 요청 처리

사용자가 본 단계 정책 변경을 요청하면:

1. **분류** — 글로벌(전 프로젝트) vs 프로젝트(이번 영상만)
    - "현재 프로젝트만"·"이번 영상" → 프로젝트 (L2)
    - "미관상"·"앞으로 늘"·범용 개선 → 글로벌 (L1)
    - 모호하면 사용자에게 질문
2. **키 확인** — `data/md-builder/styles.yml`에 해당 키 존재 여부
    - 있음 → 글로벌은 `data/md-builder/styles.yml` 값 수정 / 프로젝트는 `Projects/<Name>/_pipeline/policy/md-builder.yml`에 키:값 기록
    - 없음 → 스키마 자동 확장 (3)
3. **스키마 자동 확장** — 새 키를 `data/md-builder/styles.yml`에 보수적 기본값(기존 동작 불변)으로 추가. 글로벌 변경이므로 사용자 체크포인트 1회 확인 후 2의 "있음" 분기 진행
4. **로그** — `Projects/<Name>/_pipeline/history.md`에 정책 변경 entry append

상세: [`../../../_doc_arch/pipeline-policy-cascade.md`](../../../_doc_arch/pipeline-policy-cascade.md) `# 신규 요청 흐름`

# 참조

* SSOT yml: [`data/md-builder/styles.yml`](../../../data/md-builder/styles.yml) (스타일·패턴·검증)
* 글로벌 md 규칙: [`~/.claude/rules/md-rules.md`](../../../../../.claude/rules/md-rules.md)
* 슬라이드 공통 규칙: [`~/.claude/rules/md-slide-rules.md`](../../../../../.claude/rules/md-slide-rules.md)
* m2slide 마크다운 규칙: [`../../rules/md-m2slide-rules.md`](../../rules/md-m2slide-rules.md)
* release-date 규칙: [`../../rules/release-date-rules.md`](../../rules/release-date-rules.md)
* apply-verify 규칙: [`../../rules/apply-verify-rules.md`](../../rules/apply-verify-rules.md)
* 파이프라인: [`../../../_doc_arch/authoring-pipeline.md`](../../../_doc_arch/authoring-pipeline.md) 단계 4
* umbrella task: [`../../../_doc_work/tasks/authoring-pipeline_task.md`](../../../_doc_work/tasks/authoring-pipeline_task.md)
* v2 패턴 reference: [`../../agents/info-filler.md`](../../agents/info-filler.md) (Issue169), [`../../agents/agenda-designer.md`](../../agents/agenda-designer.md) (Issue170)
* 담당 이슈: Issue161 (운영) / Issue171 (v2 데이터-주도 전환)
