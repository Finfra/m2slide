---
name: identifier-meta-rules
description: m2slide 프로젝트의 식별자성 메타 필드(instructor_name 등) 자동 채움 금지 + grep 우선 절차
date: 2026-05-24
---

> 오표기 계열이라 **상시 로드**를 유지한다(Issue429 — 위반 시점을 예측할 수 없음). 메타 SSOT: [`_doc_arch/meta-yml.md`](../../_doc_arch/meta-yml.md)

# 적용 대상

m2slide 프로젝트의 모든 마크다운·YAML frontmatter(`AGENDA.md` · single mode `<Name>.md` · `_config.yml` 등)에서 **식별자성 필드**를 추가·수정할 때: `instructor_name` · `instructor_contact` · `author` · `presenter` · `email` · `affiliation` · `organization` · `instructor_organization`.

# 핵심 규칙

1. **사용자 명시 없는 자동 채움 절대 금지** — 본 세션에서 사용자가 값을 제공한 경우에만 쓴다. *"비어 있으니 보강"*·*"다른 프로젝트 패턴"* 같은 자체 판단 금지. `cover_enabled: true` 등 렌더 토글만 요청받았으면 식별자 필드는 **건드리지 않는다**(빈 값으로 렌더돼도 사용자가 후속 입력)
2. **로마자 → 한글 역변환 금지** — git config 의 `Steve J. South(NamJungGu)` 같은 로마자를 한글로 추측하지 않는다. 한글 본명을 직접 확보하지 못하면 빈 값 유지 또는 `AskUserQuestion`

    | 로마자 음절 | 가능 한글   | 비고                                            |
    | :---------- | :---------- | :---------------------------------------------- |
    | Jung        | 중·정·종·준 | 가운데 음절을 "정"으로 추측한 오표기 발생 (2026-05-24) |
    | Ho          | 호·효·후    |                                                 |
    | Woo / Wu    | 우·오·유    |                                                 |
    | Eun         | 은·연       |                                                 |
    | Young       | 영·용·욘    |                                                 |

3. **같은 레포 grep 우선 (신조 금지)** — 사용자가 *"다른 프로젝트와 동일하게"* 처럼 명시했을 때만:

    ```bash
    grep -rh "^instructor_name:" Projects/*/markdown/AGENDA.md Projects/*/*.md 2>/dev/null | sort -u
    grep -rh "^instructor_contact:\|^author:" Projects/*/markdown/AGENDA.md Projects/*/*.md 2>/dev/null | sort -u
    ```

    기존 표기가 하나면 차용 · 여럿이면 사용자에게 선택 질의 · 없으면 질의(신조 포맷 금지)

# 위반 시 대응

즉시 사용자 보고 + 해당 필드 비움 또는 사용자가 명시한 값으로 정정. 재발 시 `~/.claude/learning_log.md` 한 줄.

# 배경

2026-05-24 *"커버 페이지도 없음"* 요청에 cover 활성화와 함께 메타를 자동 보강하면서 로마자를 역변환해 가운데 음절을 `정` 으로 잘못 썼다. 같은 레포 4개 프로젝트에 정답 `남중구 (핀프라)` 가 있었는데 grep 을 생략했다. 향후 단일 식별자 SSOT(`data/identity.yml` 류)를 도입하면 frontmatter 미정의 시 fallback 으로만 쓴다(도입 전까지는 위 grep 절차).
