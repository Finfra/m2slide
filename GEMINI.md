# GEMINI.md

This file provides guidance to Gemini CLI when working with code in this repository.

## 사용자 설정 (User Preferences)

- **Language**: Korean (한국어) - 모든 대화와 주석, 커밋 메시지는 한국어로 진행합니다.

## 프로젝트 개요

마크다운 기반 프레젠테-이셔 자료 생성 도구. 프로젝트별 독립 폴더 구조로 여러 강연 자료를 관리하며, Reveal.js와 Markmap을 활용한 인터랙티브 HTML 프레젠테-이셔을 자동 생성합니다.

**현재 프로젝트**: LLM 툴 진화와 바이브 코딩 세대 구분 (30분 강연 자료)

## 기술 스택

- **Reveal.js 5.0.4**: HTML 프레젠테-이셔 프레임워크
- **Markmap**: 인터랙티브 마인드맵 목차 생성
- **Node.js**: 마크다운 → HTML 변환 스크립트 (`generate-slides.js`)
  - 순수 Node.js 표준 라이브러리만 사용 (외부 dependencies 없음)
- **Pandoc** (선택): PowerPoint 변환용

## ⚠️ CSS 수정 시 주의사항 (generate-slides.js)

### 제목이 날아가는 원인

Reveal.js는 복잡한 레이아웃 시스템을 사용하여 슬라이드를 중앙 정렬하고 표시합니다. 핵심 레이아웃 속성을 변경하면 **제목이 사라지거나 슬라이드가 깨집니다**.

### 절대 건드리면 안 되는 것

❌ **위험한 CSS 속성** (Reveal.js 레이아웃 파괴):
- `display: flex` 또는 다른 display 값 변경
- `height: 100%` 또는 고정 height 값
- `position` 관련 속성
- `transform`, `translate` 관련
- `justify-content`, `align-items` 등 flexbox/grid 레이아웃
- `.reveal .slides` 컨테이너 자체 수정

❌ **절대 금지 패턴**:
```css
/* 이런 코드는 제목을 날려버립니다! */
.reveal .slides {
  height: 100vh !important;  /* ❌ 슬라이드 컨테이너 건드림 */
}
.reveal .slides section {
  display: flex !important;       /* ❌ 레이아웃 파괴 */
  height: 100% !important;        /* ❌ 높이 강제 변경 */
  justify-content: flex-start !important;  /* ❌ 제목이 사라짐 */
}
```

### 안전하게 수정 가능한 것

✅ **안전한 CSS 속성**:
- `overflow`, `overflow-y`, `overflow-x`: 스크롤 제어
- `padding`, `margin`: 여백 조정
- `max-height`, `max-width`: 최대 크기 제한 (height, width는 금지!)
- `font-size`, `color`, `background`: 스타일링
- `border`, `box-shadow`: 장식

✅ **권장 패턴** (스크롤 추가 시):
```css
/* 이런 방식으로만 수정하세요 */
.reveal .slides section,
.reveal .slides section.present,
.reveal .slides section.past,
.reveal .slides section.future {
  overflow-y: auto !important;        /* ✅ 스크롤만 추가 */
  max-height: 100vh !important;       /* ✅ 최대 높이만 제한 */
  padding: 20px 60px !important;      /* ✅ 여백 조정 */
  box-sizing: border-box !important;  /* ✅ 박스 모델 */
}
```

### 테스트 필수 항목

CSS 수정 후 **반드시 확인**:
1. 첫 슬라이드(`#/0`) 제목이 정상 표시되는가?
2. 다음 슬라이드(`#/1`, `#/2`)도 제목이 보이는가?
3. 스크롤이 모든 슬라이드에서 작동하는가?
4. 브라우저 창 크기를 변경해도 레이아웃이 유지되는가?

문제 발생 시 즉시 원복하고 안전한 속성만 사용할 것!

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

#### HTML 프레젠테-이셔 생성

1. **입력**: `Projects/[Project]/markdown/*.md` → 각 파일에 `---` 슬라이드 구분자 사용
2. **변환**: `./convert.sh` 또는 `node generate-slides.js Projects/[Project]`
3. **출력**: `Projects/[Project]/slide/*.html` → Reveal.js 프레젠테-이셔

**핵심 메커니즘**:
- `generate-slides.js`: 마크다운 파싱, HTML 변환, Markmap 생성
  - 완전한 마크다운 파서 구현 (헤더, 리스트, 테이블, 코드 블록, blockquote, 이미지, bold, 인라인 코드 지원)
  - `---` 구분자로 슬라이드 자동 분리
- AGENDA.md 파싱으로 계층 구조 파악 (메인/하위 챕터, 상위 페이지 링크)
  - 각 HTML 페이지의 첫 슬라이드에 해당 챕터 목차를 Markmap으로 렌더링
  - 하위 챕터가 있으면 자동으로 목차에 링크 추가
- 이미지 자동 복사 (`markdown/img/` → `slide/img/`)

#### EPUB 전자책 생성

1. **입력**: `Projects/[Project]/markdown/*.md`
2. **변환**: `./convert.sh --epub` 또는 `node generate-epub.js Projects/[Project]`
3. **출력**: `Projects/[Project]/[ProjectName].epub` → EPUB 3.0 전자책

**핵심 메커니즘**:
- `generate-epub.js`: 마크다운을 EPUB 형식으로 변환
  - EPUB 3.0 표준 준수 (mimetype, META-INF/container.xml, OEBPS/content.opf, toc.ncx)
  - 각 마크다운 파일을 XHTML 챕터로 변환
  - AGENDA.md에서 책 제목 추출
  - 목차(TOC) 자동 생성
  - **Mermaid 다이어그램 자동 변환**:
    - Mermaid CLI가 설치되어 있으면 SVG 이미지로 자동 변환
    - 시스템 Chrome을 사용 (PUPPETEER_EXECUTABLE_PATH 환경변수)
    - 변환 실패 시 placeholder SVG 생성
  - 이미지 자동 복사 (`markdown/img/` → EPUB 내부)
  - 순수 Node.js 표준 라이브러리만 사용 (외부 dependencies 없음)
  - Mermaid 변환은 선택적 의존성 (mmdc 없어도 EPUB 생성 가능)

### 파일명 규칙

- **메인 섹션**: `XX-title.md` (예: `01-opening.md`)
- **하위 섹션**: `XX.Y-title.md` (예: `02.1-chat-based.md`)
- **AGENDA.md**: 인라인 링크 형식 (`## [제목](./파일명.md)`)
  - 메인 섹션: `## [제목](./파일.md)` 형식
  - 하위 섹션: `### [제목](./파일.md)` 형식 (메인 섹션 아래 들여쓰기)
  - 상위 페이지 자동 감지: 하위 섹션의 상위 페이지는 직전 메인 섹션, 메인 섹션의 상위는 index.html


## 주요 작업 명령어

### HTML 프레젠테-이셔 생성 (권장)

```bash
# 기본 프로젝트 (Projects/LlmAndVibeCoding)
./convert.sh

# 특정 프로젝트
./convert.sh Projects/[ProjectName]

# Node.js 직접 실행
node generate-slides.js Projects/[ProjectName]
```

**출력물**:
- `slide/*.html`: 각 챕터별 Reveal.js 프레젠테-이셔
- `slide/index.html`: Markmap 기반 전체 목차 (클릭 가능한 마인드맵)
  - EPUB 파일이 있으면 다운로드 링크 자동 표시
- `slide/*.epub`: EPUB 파일 (존재하는 경우 자동 복사)
- 계층적 네비게이션 (↑ 키 또는 우측 하단 버튼으로 상위 페이지 이동)

### EPUB 전자책 생성

```bash
# 기본 프로젝트 (HTML + EPUB 동시 생성)
./convert.sh --epub

# 특정 프로젝트
./convert.sh Projects/[ProjectName] --epub

# EPUB만 생성 (HTML 스킵)
node generate-epub.js Projects/[ProjectName]
```

**출력물**:
- `Projects/[ProjectName]/[ProjectName].epub`: EPUB 3.0 전자책 파일
- iBooks, Calibre, Google Play Books 등 모든 EPUB 리더에서 읽기 가능
- Mermaid 다이어그램은 SVG 이미지로 포함 (mmdc 설치 시)

**Mermaid 다이어그램 렌더링 요구사항**:
- **필수**: Mermaid CLI (`npm install -g @mermaid-js/mermaid-cli`)
- **필수**: 시스템에 Google Chrome 설치 (`/Applications/Google Chrome.app/`)
- mmdc가 없으면 placeholder SVG로 대체 (안내 메시지 표시)

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
  - AGENDA.md가 없는 단일 파일 프로젝트에서는 비활성화
- **→ (마지막 슬라이드)**: 다음 챕터로 이동
  - AGENDA.md가 없는 단일 파일 프로젝트에서는 비활성화
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
- `generateIndexHTML()`: 전체 프레젠테이셔 목차 페이지 생성
- `getSubsections()`: AGENDA.md에서 하위 챕터 목록 추출
- `getParentPage()`: AGENDA.md에서 상위 페이지 파일명 추출

**특수 처리**:
- 테이블 슬라이드는 Reveal.js의 markdown 플러그인에 위임 (`data-markdown` 사용)
- 첫 슬라이드는 제목 슬라이드로 자동 인식하고 Markmap 목차 포함
- 이미지는 상대 경로 유지 (`img/` 폴더 자동 복사로 해결)
- 모든 HTML 파일에 상위 페이지 버튼 자동 추가 (우측 하단 "↑ 상위")

### 네비게이션 시스템

**3단계 계층 구조**:
1. `index.html`: 전체 프레젠테이셔 Markmap 목차
2. 메인 챕터 HTML: 해당 챕터 슬라이드 + 하위 챕터 링크
3. 하위 챕터 HTML: 세부 내용 슬라이드

**상위 페이지 이동 로직** (generate-slides.js:817-828):
- ↑ 키 이벤트 감지: 수직 슬라이드가 없을 때만 상위 페이지로 이동
- 우측 하단 버튼: AGENDA.md 파싱 결과에 따라 동적 링크 생성
- AGENDA.md가 없으면 버튼과 이벤트 비활성화

**다음 챕터 이동 로직** (generate-slides.js:830-857):
- 마지막 슬라이드에서 → 키 두 번 클릭으로 다음 챕터 이동
- AGENDA.md가 없으면 이벤트 비활성화

**단일 파일 프로젝트** (AGENDA.md 없음):
- 상위 페이지 버튼 미표시
- ↑ 키와 → 키(마지막 슬라이드) 네비게이션 비활성화
- 독립적인 프레젠테이셔으로 동작

### generate-epub.js 아키텍처

**핵심 함수**:
- `generateEpub()`: EPUB 생성 메인 함수
- `createEpubStructure()`: EPUB 폴더 구조 생성
- `generateMimetype()`, `generateContainerXml()`, `generateContentOpf()`, `generateTocNcx()`: EPUB 표준 파일 생성
- `convertMarkdownToXHTML()`: 마크다운 → XHTML 변환
- `processMermaidDiagrams()`: Mermaid 코드 블록을 SVG로 변환
- `copyImages()`: 이미지 파일 복사
- `zipDirectory()`: EPUB 파일 압축

**Mermaid 처리**:
- `mmdc` 명령어 실행 (`child_process.exec`)
- 실패 시 placeholder SVG 생성 (에러 메시지 포함)
- `PUPPETEER_EXECUTABLE_PATH` 환경변수 설정 (Chrome 경로)

## 문제 해결 및 디버깅

### 제목이 사라지는 문제
- **원인**: `generate-slides.js`의 CSS 수정 시 Reveal.js 레이아웃 파괴
- **해결**: `GEMINI.md`의 CSS 가이드라인 준수, 안전한 속성만 사용

### Mermaid 변환 실패
- **원인**: Mermaid CLI 미설치 또는 Chrome 경로 문제
- **해결**: `npm install -g @mermaid-js/mermaid-cli` 실행, Chrome 설치 확인

### EPUB 파일이 깨지는 문제
- **원인**: XML 파싱 오류 또는 파일 경로 문제
- **해결**: `generate-epub.js`의 경로 처리 로직 확인, 생성된 XML 파일 유효성 검사

### 네비게이션이 작동하지 않는 문제
- **원인**: AGENDA.md 형식 오류 또는 `getParentPage()` 로직 문제
- **해결**: AGENDA.md 링크 형식이 `## [제목](./파일.md)`인지 확인, `getParentPage()` 디버깅
