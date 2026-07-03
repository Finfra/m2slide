---
name: identifier-meta-rules
description: m2slide 프로젝트의 식별자성 메타 필드(instructor_name 등) 자동 채움 금지 + grep 우선 절차
date: 2026-05-24
---

# 적용 트리거

다음 파일의 frontmatter에 식별자성 필드를 추가·수정하려는 시점에 발동:

* `Projects/{Name}/markdown/AGENDA.md`
* `Projects/{Name}/{Name}.md` (single mode 슬라이드 소스)
* `Projects/{Name}/_config.yml`
* `Projects/{Name}/_meta.yml` (legacy, 사용 안 함)
* 그 외 m2slide 프로젝트 내 모든 마크다운·YAML frontmatter

# 적용 대상 필드 (식별자성 메타)

다음 필드는 모두 식별자성 메타로 분류함. 인적·연락처·소속 정보 일체:

| 필드                  | 종류             | 위험도               |
| :-------------------- | :--------------- | :------------------- |
| `instructor_name`     | 강사 한글·로마자 본명 | 매우 높음 (오타 = 신뢰성 손상) |
| `instructor_contact`  | 강사 연락처·URL  | 높음                 |
| `author`              | 일반 저자명      | 높음                 |
| `presenter`           | 발표자명         | 높음                 |
| `email`               | 이메일 주소      | 높음                 |
| `affiliation`         | 소속·회사명      | 중간                 |
| `organization`        | 조직명           | 중간                 |
| `instructor_organization` | 강사 소속    | 중간                 |

# 핵심 규칙

## 1. 사용자 명시 확인 없는 자동 채움 절대 금지

* 위 필드를 **사용자가 본 세션에서 명시적으로 값을 제공한 경우에만** 작성
* "메타가 비어 있으니 보강해야 한다", "다른 프로젝트에 있는 패턴이니 채워 넣겠다" 등의 자체 판단으로 신규 작성 금지
* 사용자가 `cover_enabled: true` 등 렌더링 토글만 요청한 경우, 식별자 필드는 **건드리지 않음**. 렌더 시 빈 값으로 노출되어도 사용자가 후속 입력하도록 둠

## 2. 로마자 → 한글 역변환 금지

* git config·시스템 컨텍스트의 로마자 표기(`Steve J. South(NamJungGu)` 등)를 한글로 추측 변환하지 않음
* 한국어 로마자는 다수 모호 매핑 존재 — 변환 시도 자체가 hallucination 위험:

| 로마자 음절 | 가능 한글 | 비고                |
| :---------- | :-------- | :------------------ |
| Jung        | 중·정·종·준 | "정"으로 추측되어 남정구 오타 발생 (2026-05-24) |
| Ho          | 호·효·후  |                     |
| Woo / Wu    | 우·오·유  |                     |
| Eun         | 은·연     |                     |
| Young       | 영·용·욘  |                     |

* 한글 본명을 한글로 직접 확보하지 못하면 **빈 값 유지** 또는 사용자에게 `AskUserQuestion` 질의

## 3. 같은 레포 grep 우선 (신조 금지)

식별자 메타가 정말 필요한 상황(예: 사용자가 "다른 프로젝트와 동일하게 채워" 명시)이라면 반드시 다음 절차:

```bash
## 같은 필드의 기존 값 grep
grep -rh "^instructor_name:" Projects/*/markdown/AGENDA.md Projects/*/*.md 2>/dev/null | sort -u
grep -rh "^instructor_contact:" Projects/*/markdown/AGENDA.md Projects/*/*.md 2>/dev/null | sort -u
grep -rh "^author:" Projects/*/markdown/AGENDA.md Projects/*/*.md 2>/dev/null | sort -u
```

* 기존 표기가 **하나만** 발견되면 그대로 차용
* 기존 표기가 **여러 개** 있으면 사용자에게 어느 표기를 사용할지 질의
* **하나도 발견되지 않으면** 사용자 질의 — 신조 포맷 작성 금지

## 4. SSOT 도입 (선택 — 후속 작업)

향후 `lib/m2slide/data/identity.yml` 등 단일 식별자 SSOT 도입 시:

```yaml
## data/identity.yml (예시 — 도입 시 사용자가 직접 작성)
instructor_name: "Steve J. South (남중구)"
instructor_contact: "https://finfra.kr/nowage"
author: "남중구 (핀프라)"
```

* 빌드 시 frontmatter 미정의면 SSOT 참조 (fallback only)
* SSOT 도입 전까지는 본 룰의 grep 절차로 일관성 확보

# 위반 시 대응

* 본 룰 위반하여 자동 채움한 사실 발견 즉시 사용자 보고 + 해당 필드 비움 또는 사용자가 명시한 값으로 정정
* 동일 회귀 발견 시 `~/.claude/learning_log.md`에 한 줄 기록

# 배경 사례

2026-05-24 이전 세션에서 사용자가 "BasicKnowledgeForAI에 커버 페이지도 없음"이라고만 요청. Claude(opus-4-7)가 cover 활성화 + frontmatter 메타 자동 보강을 결정하면서 git config `Steve J. South(NamJungGu)`의 로마자를 한글로 역변환 추측하여 `instructor_name: Steve J. South (남정구)`로 작성. 같은 레포의 4개 프로젝트(aTest, aTest_v1, AgenticCoding_v1.1, m2Slide) AGENDA.md에 정답 `남중구 (핀프라)`가 있었음에도 grep 생략. 결과적으로 cover 슬라이드에 잘못된 이름 노출 → 신뢰성 손상. 본 룰은 동일 회귀 차단용.

# 참조

* 글로벌 SCAR 변경 룰: [`~/.claude/rules/global-scar-change-rules.md`](../../../../../.claude/rules/global-scar-change-rules.md)
* m2slide 메타 SSOT: [`_doc_arch/meta-yml.md`](../../_doc_arch/meta-yml.md)
* 마크다운 슬라이드 규칙: [`md-m2slide-rules.md`](md-m2slide-rules.md)
