---
name: issue-fix
description: m2slide 이슈 해결 (Fix → Verify → Doc → Close)
date: 2026-05-01
---

# /issue-fix - m2slide 이슈 해결

> **위임**: `/issue-fix-w` (웹 프로젝트 공통) → `/issue-fix-g` (글로벌 공통 절차)
>
> **스킬 참조**: `~/.claude/skills/issue-w/SKILL.md` → `~/.claude/skills/issue-g/SKILL.md`

## m2slide 고유 사항

### 문제 분석

- 이슈가 generator/theme/Reveal.js 어느 레이어인지 식별
- CSS 이슈인 경우: `CLAUDE.md`의 "CSS 수정 시 주의사항" 재확인
- 마크다운 파서 이슈: `generate-slides.js`의 `convertMarkdownToHTML()`, `parseMarkdownFile()` 함수 추적

### 구현

- 커밋 메시지 규칙: `Fix: Issue[번호] [제목]` (Issue.md 헤더 형식과 일치)
- 변경 파일은 가급적 작게 분할 (generator vs theme vs project asset)

### 검증

#### 문법 검증

```bash
node -c generate-slides.js
node -c generate-epub.js
```

#### 빌드 검증

```bash
# 영향 받는 프로젝트로 빌드
./m2slide.sh <AffectedProject>

# 변경 사항이 EPUB 관련이면
./m2slide.sh <AffectedProject> --epub
```

#### 브라우저 검증 (UI 변경 필수)

```bash
/run <AffectedProject>
```

체크 항목:
- [ ] 첫 슬라이드(`#/0`) 제목 표시
- [ ] 다음 슬라이드(`#/1`, `#/2`) 제목 표시
- [ ] index.html Markmap 목차 클릭 동작
- [ ] 키보드 단축키(←/→/↑/ESC/S) 동작
- [ ] 이미지(`img/`) 정상 로드
- [ ] 모바일/데스크탑 반응형 (필요 시)

#### EPUB 변경 시

```bash
# Mermaid 변환 확인
which mmdc

# EPUB 파일 무결성
unzip -t Projects/<Name>/<Name>.epub
```

### 문서화

- CSS 변경 시 `CLAUDE.md`의 안전/위험 패턴 절 갱신 검토
- 새 layout 추가 시 `theme/default/slide.css` 또는 README 업데이트 검토

### 이슈 종결

```bash
/issue-closer
```

---

# Opus 4.7 실행 제약

공통 제약은 [`~/.claude/rules/opus-4-7-execution-rules.md`](../../../../../.claude/rules/opus-4-7-execution-rules.md) 참조.
