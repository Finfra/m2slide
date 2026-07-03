---
name: dev
description: m2slide 웹 개발 주기 실행 (dev-w 스킬 호출)
date: 2026-05-01
---

# /dev - m2slide 개발 주기

m2slide 프로젝트의 웹 개발 주기(빌드·검증·이슈 워크플로우)를 실행함.

> **기반**: `~/.claude/skills/dev-w/SKILL.md` (웹 개발 특화) → `~/.claude/skills/dev-g/SKILL.md` (공통)

## 호출

```
skill: "dev-w"
```

## m2slide 고유 사항

### 빌드/검증 단계

1. **Node.js 문법 검증**:
   ```bash
   node -c generate-slides.js
   node -c generate-epub.js
   ```

2. **빌드 확인** (특정 프로젝트):
   ```bash
   ./m2slide.sh <ProjectName>
   ```

3. **브라우저 검증**:
   ```bash
   /run <ProjectName>
   ```
   - 첫 슬라이드(`#/0`) 제목 정상 표시 확인
   - Markmap 목차(`index.html`) 정상 동작 확인
   - 키보드 네비게이션(←/→/↑) 동작 확인

### CSS 수정 시 추가 검증

> ⚠️ `CLAUDE.md`의 "CSS 수정 시 주의사항" 필독.

- 첫 슬라이드 제목 표시 확인
- 다음 슬라이드(`#/1`, `#/2`) 제목 표시 확인
- 모든 슬라이드 스크롤 동작 확인
- 브라우저 창 크기 변경 시 레이아웃 유지 확인

### 이슈 워크플로우

```
/issue-reg    → 이슈 등록 + 계획 수립
/issue-fix    → 구현 + 검증
/issue-closer → 종결 + 커밋 해시 기록
```

---

# Opus 4.7 실행 제약

공통 제약은 [`~/.claude/rules/opus-4-7-execution-rules.md`](../../../../../.claude/rules/opus-4-7-execution-rules.md) 참조.

요지:
* 단계별 종료 조건을 명시, 무한 루프 금지
* 외부 명령 실패 시 재시도 1회, 2회 실패 시 사용자 보고
* 파일 삭제·git push·외부 시스템 변경은 사용자 승인 후 수행
* 애매 표현 금지, 조건문으로 해석
