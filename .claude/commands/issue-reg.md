---
name: issue-reg
description: m2slide 이슈 등록 (분석 → ID 발급 → Issue.md 업데이트)
date: 2026-05-01
---

# /issue-reg - m2slide 이슈 등록

> **위임**: `/issue-reg-w` (웹 프로젝트 공통) → `/issue-reg-g` (글로벌 공통 절차)
>
> **스킬 참조**: `~/.claude/skills/issue-w/SKILL.md` → `~/.claude/skills/issue-g/SKILL.md`
>
> **로컬 규칙**: [`.claude/rules/issue-rules.md`](../rules/issue-rules.md)

> [!IMPORTANT]
> **등록 및 계획 전담 원칙**: 이 워크플로우는 이슈를 정식 ID로 등록하고 **계획(Planning)** 을 수립하는 작업까지만 수행함.
> 사용자가 명시적으로 해결(Fix)을 요청하기 전까지는 **절대로 구현으로 진입하지 않음**.

## m2slide 고유 사항

### 카테고리 분류

m2slide 이슈는 다음 카테고리로 분류:

| 카테고리   | 범위                                                       |
| :--------- | :--------------------------------------------------------- |
| Frontend   | Reveal.js 슬라이드, Markmap 목차, 인터랙션, 키보드 단축키  |
| Generator  | `generate-slides.js`, `generate-epub.js` 마크다운 파서     |
| Theme      | `theme/{name}/slide.css`, layouts/, 슬라이드 레이아웃 시스템 |
| Build      | `m2slide.sh`, `_config.yml`, EPUB 생성 파이프라인          |
| Asset      | 이미지 복사, Mermaid 변환, 외부 의존성                     |
| Project    | `Projects/{Name}/` 구조, AGENDA.md 규칙                    |

### CSS 관련 이슈 등록 시

⚠️ `CLAUDE.md`의 "CSS 수정 시 주의사항" 절을 참조하여
**금지 속성**(`display: flex`, `height: 100%`, `position` 등)을 변경하는 계획은 등록 금지.

### 등록 후

> 🚨 **등록 완료 후 즉시 작업 종료** — `/issue-fix`로 자동 진행 금지.

---

# Opus 4.7 실행 제약

공통 제약은 [`~/.claude/rules/opus-4-7-execution-rules.md`](../../../../../.claude/rules/opus-4-7-execution-rules.md) 참조.
