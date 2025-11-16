# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

**주제**: LLM 툴 진화와 바이브 코딩 세대 구분
**목적**: AI 코딩 도구의 발전 과정과 바이브 코딩(VibeCoding) 개념을 소개하는 30분 강연 자료 제작
**출력**: 마크다운 작성 → HTML 변환하여 청중에게 배포

## 프로젝트 구조

- `AGENDA.md`: 강연의 전체 목차 (인라인 링크 형식으로 각 md 파일 연결)
- `Documents/LlmAndVibeCoding/`: 15개 마크다운 파일 (청중 배포용 자료)
  - 주요 섹션: 01 ~ 08
  - 하위 섹션: 02.1, 02.2, 02.3, 03.1, 03.2, 04.1, 04.2
- `resource/`: 강연 준비 참고 자료 (/Users/nowage/_doc/3.Resource/_LLM에서 복사됨)
- `Documents/LlmAndVibeCoding_slide/`: 마크다운 시각화 (markmap.js 기반 인터랙티브 마인드맵)
- `markmap_try1/`: 초기 시각화 시도본

## 핵심 아키텍처

### Documents/LlmAndVibeCoding 폴더의 역할

**중요**: md 파일은 **청중 배포용 참고 자료**이며, 강사용 시나리오가 아닙니다.

- AGENDA.md 구조를 따라 8개 섹션으로 분리
- 각 파일은 독립적으로 읽을 수 있는 완결된 문서
- 강연 후 참석자가 복습하고 참고할 수 있도록 작성
- HTML로 변환하여 배포 예정

### 파일명 규칙

**명명 규칙**: `XX-title.md` (주요 섹션), `XX.Y.title.md` (하위 섹션)

**전체 15개 파일**:
- 01-opening.md
- 02-llm-tool-evolution.md → 02.1.chat-based.md, 02.2.ide-integration.md, 02.3.cli-based.md
- 03-vibecoding-concept.md → 03.1.chat-limitations.md, 03.2.vibecoding-start.md
- 04-vibecoding-generations.md → 04.1.ide-generation.md, 04.2.cli-generation.md
- 05-generation-comparison.md
- 06-practical-cases.md
- 07-adoption-roadmap.md
- 08-qa-closing.md

## 컨텐츠 작성 가이드라인

### 작성 원칙

md 파일 작성 시 반드시 준수해야 할 원칙:

1. **청중 배포용 자료**: 강사 시나리오가 아닌 참고 문서로 작성
   - ❌ "여러분", "오늘", "Let's dive in!" 등 강연 표현 사용 금지
   - ❌ "목표", "학습 목표", "기대 효과" 등 강사용 메모 제거
   - ✅ 독립적으로 읽을 수 있는 완결된 정보 제공
   - ✅ 문어체와 객관적 서술 사용

2. **마크다운 표준 준수** (HTML 변환 고려)
   - CommonMark 표준 문법 사용
   - 코드 블록에 언어 지정 (```javascript, ```bash)
   - 테이블은 정렬하여 가독성 확보

3. **내용 구성**
   - 명확성: 기술 용어를 쉽게 풀어서 설명
   - 실용성: 구체적 사례와 예시 포함
   - 객관성: 각 도구의 장단점 균형있게 제시
   - 시각화: 표, 비교 테이블 적극 활용

4. **청중 수준**: 중급 개발자 기준
5. **최신성**: 2024년 기준 최신 정보 반영

## 주요 작업 명령어

### PowerPoint 변환 (Pandoc)

모든 md 파일은 `---` 슬라이드 구분자를 포함하여 pandoc으로 PPT 생성 가능:

```bash
# 단일 파일 변환
pandoc Documents/LlmAndVibeCoding/01-opening.md -o output.pptx

# 전체 강연 자료 통합 (순서대로)
pandoc Documents/LlmAndVibeCoding/01-opening.md Documents/LlmAndVibeCoding/02-llm-tool-evolution.md \
       Documents/LlmAndVibeCoding/02.1.chat-based.md Documents/LlmAndVibeCoding/02.2.ide-integration.md Documents/LlmAndVibeCoding/02.3.cli-based.md \
       Documents/LlmAndVibeCoding/03-vibecoding-concept.md Documents/LlmAndVibeCoding/03.1.chat-limitations.md Documents/LlmAndVibeCoding/03.2.vibecoding-start.md \
       Documents/LlmAndVibeCoding/04-vibecoding-generations.md Documents/LlmAndVibeCoding/04.1.ide-generation.md Documents/LlmAndVibeCoding/04.2.cli-generation.md \
       Documents/LlmAndVibeCoding/05-generation-comparison.md Documents/LlmAndVibeCoding/06-practical-cases.md \
       Documents/LlmAndVibeCoding/07-adoption-roadmap.md Documents/LlmAndVibeCoding/08-qa-closing.md \
       -o presentation.pptx
```

### Reveal.js 프레젠테이션 생성

```bash
# 기본 사용 (프로젝트 내 Documents 폴더)
./convert.sh

# 사용자 지정 폴더
./convert.sh ~/Documents/LlmAndVibeCoding

# Node.js 직접 실행 (입력/출력 폴더 모두 지정)
node generate-slides.js ~/Documents/LlmAndVibeCoding ~/Documents/MyPresentation
```

**파라미터**:
- 첫 번째: 입력 폴더 (기본값: `~/Documents/LlmAndVibeCoding`)
- 두 번째: 출력 폴더 (기본값: 입력 폴더 + `_slide`)

### Markmap 시각화

Documents/LlmAndVibeCoding_slide 폴더에 HTML 파일로 인터랙티브 마인드맵 제공:
- markmap.js CDN 사용
- 각 챕터별 독립적인 HTML 파일
- index.html에 전체 목차 마인드맵

### Reveal.js 프레젠테이션 생성

마크다운 파일을 Reveal.js 기반 HTML 프레젠테이션으로 자동 변환:

```bash
# 현재 프로젝트 폴더 사용
./convert.sh

# 사용자 지정 폴더 (Node.js 직접)
node generate-slides.js ~/Documents/LlmAndVibeCoding
```

**생성되는 HTML 구조**:
- Reveal.js 5.0.4 사용
- Sky 테마 적용
- 첫 슬라이드에 markmap 기반 목차 포함
- `---` 구분자로 슬라이드 분리
- Bold, 리스트, 이미지, 테이블, 코드 블록 모두 HTML로 변환
- 이미지 크기 제한 (max-width: 400px, max-height: 300px)
- 슬라이드 번호 표시 (current/total)

**주요 특징**:
1. **Markmap 목차**: 첫 슬라이드에 클릭 가능한 마인드맵 목차
2. **완전한 HTML 변환**: 마크다운 파싱 문제 방지를 위해 모든 콘텐츠를 HTML로 변환
3. **반응형 스타일**: 폰트 크기, 여백, 색상 최적화
4. **네비게이션**: 키보드 화살표, 슬라이드 번호로 이동 가능

## 파일 수정 워크플로우

### md 파일 생성/분할 시

1. AGENDA.md 구조에 맞춰 파일 생성
2. 파일명 규칙 준수: `XX-title.md` 또는 `XX.Y.title.md`
3. 각 파일에 `---` 슬라이드 구분자 추가 (pandoc PPT 변환용)
4. AGENDA.md에 인라인 링크 형식으로 연결 추가

### AGENDA.md 링크 형식

**올바른 형식** (인라인 링크):
```markdown
## [1. 오프닝: AI 코딩의 패러다임 전환](Documents/LlmAndVibeCoding/01-opening.md)
### [2.1 초기: 채팅 기반 시대 (2022-2023)](Documents/LlmAndVibeCoding/02.1.chat-based.md)
```

**잘못된 형식** (별도 줄):
```markdown
## 1. 오프닝: AI 코딩의 패러다임 전환
[📄 01-opening.md](Documents/LlmAndVibeCoding/01-opening.md)
```

### 파일 네이밍 변경 시 주의

파일명 변경 시 `mv` 명령을 개별적으로 실행:
```bash
# 일괄 변경 시 permission denied 발생 가능
# 개별 실행 권장
mv Documents/LlmAndVibeCoding/02-1-chat-based.md Documents/LlmAndVibeCoding/02.1.chat-based.md
mv Documents/LlmAndVibeCoding/02-2-ide-integration.md Documents/LlmAndVibeCoding/02.2.ide-integration.md
```

## 핵심 용어 및 개념

### 바이브 코딩 세대 구분 (중요)

**올바른 정의**:
- **0세대**: 채팅 기반 (ChatGPT, Claude, Bard)
- **1세대**: IDE 기반 (Cursor, Cline, Windsurf, Continue)
- **2세대**: **CLI 기반** (Claude Code, Gemini CLI, Aider)

**주의**: 2세대는 **"CLI 기반"**이지 **"에이전트 기반"**이 아님
- "에이전트"는 작동 특성일 뿐, 세대 분류 기준이 아님
- 세대 분류는 **사용자 인터페이스 방식**을 기준으로 함

### 주요 개념

- **바이브 코딩(VibeCoding)**: 자연어로 의도를 전달하면 AI가 구현하는 개발 방식
- **Intent-First Programming**: 개발자는 "무엇을(what)" 지정, AI가 "어떻게(how)" 결정
- **Context-Aware Development**: AI가 프로젝트 전체 구조를 이해하고 작업
- **Human-in-the-Loop**: AI 생성 후 개발자가 검토/승인하는 협업 방식