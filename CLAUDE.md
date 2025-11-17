# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

마크다운 기반 프레젠테이션 자료 생성 도구. 프로젝트별 독립 폴더 구조로 여러 강연 자료를 관리하며, Reveal.js와 Markmap을 활용한 인터랙티브 HTML 프레젠테이션을 자동 생성합니다.

**현재 프로젝트**: LLM 툴 진화와 바이브 코딩 세대 구분 (30분 강연 자료)

## 기술 스택

- **Reveal.js 5.0.4**: HTML 프레젠테이션 프레임워크
- **Markmap**: 인터랙티브 마인드맵 목차 생성
- **Node.js**: 마크다운 → HTML 변환 스크립트 (`generate-slides.js`)
  - 순수 Node.js 표준 라이브러리만 사용 (외부 dependencies 없음)
- **Pandoc** (선택): PowerPoint 변환용

## 핵심 아키텍처

### 프로젝트 폴더 구조

```
Projects/
├── LlmAndVibeCoding/         # 각 프로젝트는 독립적인 폴더
│   ├── markdown/             # 마크다운 소스 (AGENDA.md + 섹션 파일)
│   ├── slide/                # HTML 출력 (자동 생성)
│   ├── resource/             # 참고 자료
│   └── try0/                 # 초기 시도본
└── [다른 프로젝트]/
    ├── markdown/
    └── slide/
```

### 변환 프로세스

1. **입력**: `Projects/[Project]/markdown/*.md` → 각 파일에 `---` 슬라이드 구분자 사용
2. **변환**: `./convert.sh` 또는 `node generate-slides.js Projects/[Project]`
3. **출력**: `Projects/[Project]/slide/*.html` → Reveal.js 프레젠테이션

**핵심 메커니즘**:
- `generate-slides.js`: 마크다운 파싱, HTML 변환, Markmap 생성
  - 완전한 마크다운 파서 구현 (헤더, 리스트, 테이블, 코드 블록, blockquote, 이미지, bold, 인라인 코드 지원)
  - `---` 구분자로 슬라이드 자동 분리
- AGENDA.md 파싱으로 계층 구조 파악 (메인/하위 챕터, 상위 페이지 링크)
  - 각 HTML 페이지의 첫 슬라이드에 해당 챕터 목차를 Markmap으로 렌더링
  - 하위 챕터가 있으면 자동으로 목차에 링크 추가
- 이미지 자동 복사 (`markdown/img/` → `slide/img/`)

### 파일명 규칙

- **메인 섹션**: `XX-title.md` (예: `01-opening.md`)
- **하위 섹션**: `XX.Y-title.md` (예: `02.1-chat-based.md`)
- **AGENDA.md**: 인라인 링크 형식 (`## [제목](./파일명.md)`)
  - 메인 섹션: `## [제목](./파일.md)` 형식
  - 하위 섹션: `### [제목](./파일.md)` 형식 (메인 섹션 아래 들여쓰기)
  - 상위 페이지 자동 감지: 하위 섹션의 상위 페이지는 직전 메인 섹션, 메인 섹션의 상위는 index.html


## 주요 작업 명령어

### HTML 프레젠테이션 생성 (권장)

```bash
# 기본 프로젝트 (Projects/LlmAndVibeCoding)
./convert.sh

# 특정 프로젝트
./convert.sh Projects/[ProjectName]

# Node.js 직접 실행
node generate-slides.js Projects/[ProjectName]
```

**출력물**:
- `slide/*.html`: 각 챕터별 Reveal.js 프레젠테이션
- `slide/index.html`: Markmap 기반 전체 목차 (클릭 가능한 마인드맵)
- 계층적 네비게이션 (↑ 키 또는 우측 하단 버튼으로 상위 페이지 이동)

### PowerPoint 변환 (옵션)

```bash
# 단일 파일
pandoc Projects/LlmAndVibeCoding/markdown/01-opening.md -o output.pptx

# 전체 파일 통합
pandoc Projects/LlmAndVibeCoding/markdown/*.md -o complete.pptx
```

### 새 프로젝트 추가

```bash
# 1. 프로젝트 폴더 생성
mkdir -p Projects/NewProject/markdown

# 2. AGENDA.md와 마크다운 파일 작성
# 3. Git에서 추적하려면 Projects/.gitignore에 추가
echo "!/NewProject/" >> Projects/.gitignore

# 4. HTML 생성
./convert.sh Projects/NewProject
```

## 개발 워크플로우

### 1. 마크다운 파일 수정
```bash
# Projects/[Project]/markdown/ 폴더에서 작업
# - 각 파일에 `---` 슬라이드 구분자 사용
# - AGENDA.md에 인라인 링크 형식으로 연결: ## [제목](./파일명.md)
```

### 2. HTML 재생성
```bash
./convert.sh

# 또는 특정 프로젝트 지정
./convert.sh Projects/OtherProject
```

### 3. 브라우저에서 확인
```bash
open Projects/LlmAndVibeCoding/slide/index.html

# 개별 챕터 확인
open Projects/LlmAndVibeCoding/slide/01-opening.html
```

### 슬라이드 네비게이션 키보드 단축키
- **← / →**: 이전/다음 슬라이드
- **↑**: 상위 페이지로 이동 (하위 챕터 → 메인 챕터 → 목차)
- **ESC**: 슬라이드 전체 개요 보기
- **S**: 발표자 노트 모드

### AGENDA.md 링크 규칙

**올바른 형식** (인라인 링크):
```markdown
## [1. 오프닝](./01-opening.md)
### [2.1 채팅 기반](./02.1-chat-based.md)
```

**잘못된 형식** (제목과 링크 분리):
```markdown
## 1. 오프닝
[📄 파일](./01-opening.md)
```

## LlmAndVibeCoding 프로젝트 특화 개념

### 바이브 코딩 세대 구분 (중요)

세대 분류는 **사용자 인터페이스 방식**을 기준으로 함:

- **0세대**: 채팅 기반 (ChatGPT, Claude, Bard)
- **1세대**: IDE 기반 (Cursor, Cline, Windsurf, Continue)
- **2세대**: **CLI 기반** (Claude Code, Gemini CLI, Aider)

**주의**: "에이전트 기반"은 작동 특성일 뿐, 세대 분류 기준이 아님

### 마크다운 작성 시 주의사항

**청중 배포용 참고 자료** 작성 원칙:
- ❌ "여러분", "오늘", "Let's dive in!" 등 강연 표현 금지
- ❌ "학습 목표", "기대 효과" 등 강사용 메모 제거
- ✅ 독립적으로 읽을 수 있는 완결된 문서
- ✅ 문어체와 객관적 서술 사용

## 주요 구현 상세

### generate-slides.js 아키텍처

**핵심 함수**:
- `convertMarkdownToHTML()`: 마크다운 → HTML 변환 (인라인 요소 처리 포함)
- `parseMarkdownFile()`: 마크다운 파일을 슬라이드 배열로 파싱
- `generateHTML()`: 완전한 Reveal.js HTML 페이지 생성
- `parseAgenda()`: AGENDA.md를 Markmap 데이터 구조로 변환
- `generateIndexHTML()`: 전체 프레젠테이션 목차 페이지 생성
- `getSubsections()`: AGENDA.md에서 하위 챕터 목록 추출
- `getParentPage()`: AGENDA.md에서 상위 페이지 파일명 추출

**특수 처리**:
- 테이블 슬라이드는 Reveal.js의 markdown 플러그인에 위임 (`data-markdown` 사용)
- 첫 슬라이드는 제목 슬라이드로 자동 인식하고 Markmap 목차 포함
- 이미지는 상대 경로 유지 (`img/` 폴더 자동 복사로 해결)
- 모든 HTML 파일에 상위 페이지 버튼 자동 추가 (우측 하단 "↑ 상위")

### 네비게이션 시스템

**3단계 계층 구조**:
1. `index.html`: 전체 프레젠테이션 Markmap 목차
2. 메인 챕터 HTML: 해당 챕터 슬라이드 + 하위 챕터 링크
3. 하위 챕터 HTML: 세부 내용 슬라이드

**상위 페이지 이동 로직** (generate-slides.js:446-460):
- ↑ 키 이벤트 감지: 수직 슬라이드가 없을 때만 상위 페이지로 이동
- 우측 하단 버튼: AGENDA.md 파싱 결과에 따라 동적 링크 생성