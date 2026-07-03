---
name: issue-rules
description: m2slide 이슈 관리 규칙 (issue-g 기반, 웹 프로젝트)
date: 2026-05-01
---

> 공통 규칙은 `~/.claude/rules/issue-g.md` 참조.
> 웹 프로젝트 규칙은 `~/.claude/skills/issue-w/SKILL.md` 참조.
> 아래는 m2slide 프로젝트 고유 규칙만 기재.

# 완료 섹션

* 완료 섹션명: `🏁 완료-해결순` (글로벌 `✅ 완료` 오버라이드, 상위 videoMaker와 일치)
* Issue HWM 표기: `Issue HWM: NN` (issue-g 표준 준수)

# 진행중 섹션 명칭

* m2slide `Issue.md`는 `🔥 진행 중`을 사용 (글로벌 `🚧 진행중` 오버라이드, 띄어쓰기 포함)
* 신규 이슈 진행 시 이 명칭 그대로 유지할 것

# 이슈 헤더 형식

```markdown
## IssueNN. [제목] (등록: YYYY-MM-DD)
* 목적: ...
* 상세:
    - ...
```

* 번호 표기는 `IssueNN.` (마침표 포함) — 상위 videoMaker의 `IssueNN:` 콜론 형식과 다르므로 혼동 주의
* 완료 시 `(등록: YYYY-MM-DD, 해결: YYYY-MM-DD, commit: <hash>) ✅` 추가

# GitHub Issue 연동

* GitHub: https://github.com/Finfra/m2slide/issues
* 등록 시 `IssueNN. ` 접두사 제거: `Issue21. 제목` → `제목`
* 명령어:
    ```bash
    gh issue create --title "제목" --body "내용"
    gh issue close <num>
    ```

# 카테고리 (m2slide 특화)

| 카테고리   | 설명                                                          |
| :--------- | :------------------------------------------------------------ |
| Frontend   | Reveal.js, Markmap, 키보드 네비게이션, 슬라이드 인터랙션      |
| Generator  | `generate-slides.js`, `generate-epub.js` 마크다운 파서·HTML 변환 |
| Theme      | `theme/{name}/slide.css`, layouts/, 슬라이드 레이아웃 시스템    |
| Build      | `m2slide.sh`, `_config.yml`, EPUB 파이프라인                  |
| Asset      | 이미지 복사, Mermaid 변환, 외부 의존성                        |
| Project    | `Projects/{Name}/` 구조, AGENDA.md 규칙                       |

# CSS 수정 가드

CSS 관련 이슈는 등록·수정 모두 [`CLAUDE.md`](../../CLAUDE.md)의 "CSS 수정 시 주의사항" 절을 우선 참조함.
**금지 속성** (`display: flex`, `height: 100%`, `position`, `transform` 등)을 건드리는 계획은 등록 단계에서 차단.
