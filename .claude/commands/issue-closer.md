---
name: issue-closer
description: m2slide 이슈 종결 (Hash 확보 → 완료 이동 → Doc 커밋)
date: 2026-05-01
---

# /issue-closer - m2slide 이슈 종결

> **위임**: `/issue-closer-w` (웹 프로젝트 공통) → `/issue-closer-g` (글로벌 공통 절차)
>
> **스킬 참조**: `~/.claude/skills/issue-w/SKILL.md` → `~/.claude/skills/issue-g/SKILL.md`
>
> **로컬 규칙**: [`.claude/rules/issue-rules.md`](../rules/issue-rules.md)

## m2slide 고유 사항

### 완료 섹션

- 완료 섹션명: `🏁 완료-해결순` (videoMaker 상위 프로젝트와 일치, 글로벌 `✅ 완료` 오버라이드)
- Issue HWM 표기: `Issue HWM: NN`

### 이슈 헤더 형식 (완료 시)

```markdown
## IssueNN: [제목] (등록: YYYY-MM-DD, 해결: YYYY-MM-DD, commit: <hash>) ✅
```

### GitHub Issue 연동

`Issue.md` 상단에 명시된 규칙(`Issue.md:5-9`):

- GitHub Issue 등록 시 `IssueNN: ` 접두사 제거
- 등록 후 완료 시 `gh issue close {IssueNum}`

해당 이슈가 GitHub에도 등록되어 있다면 종결과 함께 닫기:

```bash
# Issue.md의 IssueNN과 GitHub Issue 번호는 다를 수 있음
gh issue list --search "<제목 키워드>" --state open
gh issue close <github_issue_num>
```

### 사전 준비

```bash
source ~/.bin/issue-helper.sh
```

### 워크플로우

`/issue-closer-g` 공통 절차 따름:

1. 자동 이슈 탐지 (파라미터 없을 시 진행중 섹션 또는 git diff 분석)
2. 기능 구현 커밋 (`Fix: IssueNN [제목]`)
3. 커밋 해시 확보
4. Issue.md 헤더 갱신 + `🏁 완료-해결순` 섹션으로 이동
5. 문서 커밋 (`Docs: Close IssueNN (Hash: <hash>)`)
6. 완료 알림 (`say 'Complished'`)

---

# Opus 4.7 실행 제약

공통 제약은 [`~/.claude/rules/opus-4-7-execution-rules.md`](../../../../../.claude/rules/opus-4-7-execution-rules.md) 참조.
