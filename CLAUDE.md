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

## 🛑 base.css 수정 가드 (필독)

`lib/css/base.css`는 모든 theme·layout이 공유하는 **최하단 기반 스타일 SSOT**임. 변경 시 모든 프로젝트에 동시에 영향을 주므로 다음 룰을 엄격히 준수.

### 필수 룰

1. **수정 전 사용자 컨펌 필수**
    - `lib/css/base.css` 수정 요청·필요 발생 시 **수정 전에 반드시 사용자에게 컨펌 받을 것**
    - 컨펌 없이 즉시 수정 금지 (theme의 `slide.css` 또는 layout 단위 CSS로 우회 가능한지 먼저 검토)
    - 컨펌 시 변경 사유·범위·대안 검토 결과를 함께 제시

2. **최소 수정 원칙**
    - base.css는 **최대한 수정하지 않음**
    - 우선순위: theme의 `slide.css` > layout 단위 CSS > base.css
    - 특정 theme/layout에서만 필요한 스타일은 절대 base.css에 추가 금지
    - 진짜 모든 프로젝트 공통 기반 스타일에만 한정 (Reveal.js 핵심 레이아웃 보정 등)

3. **수정 후 Project 테스트 필수**
    - base.css 변경 후에는 반드시 다음 대표 프로젝트들을 빌드·확인:
        - `Projects/m2Slide_single_mode` (단일 페이지 기본)
        - `Projects/m2Slide_chapter_mode` (다중 챕터 + AGENDA.md)
        - `Projects/layoutTest` (모든 layout 시각 검증)
    - 빌드 명령: `./m2slide.sh {ProjectName}`
    - "테스트 필수 항목"(위 섹션) 4가지 체크리스트도 함께 적용
    - 회귀 발견 시 즉시 원복

### 적용 트리거

* 사용자가 `lib/css/base.css` 수정 요청
* 다른 작업 중 base.css 수정 필요성 발견
* Issue·plan에 base.css 변경이 포함된 경우

위 셋 중 하나라도 해당하면 본 룰 발동.

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

#### HTML 프레젠테이션 생성

1. **입력**: `Projects/[Project]/markdown/*.md` → 각 파일에 `---` 슬라이드 구분자 사용
2. **변환**: `./m2slide.sh [Project]` 또는 `node generate-slides.js Projects/[Project]`
3. **출력**: `Projects/[Project]/slide/*.html` → Reveal.js 프레젠테이션

**핵심 메커니즘**:
- `generate-slides.js`: 마크다운 파싱, HTML 변환, Markmap 생성
  - 완전한 마크다운 파서 구현 (헤더, 리스트, 테이블, 코드 블록, blockquote, 이미지, bold, 인라인 코드 지원)
  - `---` 구분자로 슬라이드 자동 분리
- AGENDA.md 파싱으로 계층 구조 파악 (메인/하위 챕터, 상위 페이지 링크)
  - 각 HTML 페이지의 첫 슬라이드에 해당 챕터 목차를 Markmap으로 렌더링
  - 하위 챕터가 있으면 자동으로 목차에 링크 추가
- 이미지 자동 복사 (`markdown/img/` → `slide/img/`, chapter mode는 `Projects/<Name>/img/` → `slide/img/`도 병합 복사 — ppt2m2slide 산출물 호환)

#### EPUB 전자책 생성

1. **입력**: `Projects/[Project]/markdown/*.md`
2. **변환**: `./m2slide.sh [Project] --epub` 또는 `node generate-epub.js Projects/[Project]`
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

### Theme & Layout 시스템

`_config.yml`에서 theme + layout 지정 (자세한 사용법은 `README.md` 참조).

```yaml
theme: default_lec              # theme/{name}/slide.css
theme_default_layout: contents  # 슬라이드 기본 layout
```

폴더 구조:

```
theme/
├── default/                # 기본 theme (git 추적, 범용)
│   ├── slide.css           # 전역 + 모든 .layout-* selector
│   └── layouts/
│       └── _toc.html       # 시스템 layout (TOC 자동 적용)
├── default_lec/            # 강의용 공식 테마 (git 추적)
│   ├── slide.css
│   └── layouts/            # HTML 템플릿만 (CSS는 slide.css에 통합)
│       ├── _toc.html
│       ├── _cover.html
│       └── ...
└── (그 외 사용자 커스터마이징은 gitignored)
```

- `theme:` 미설정 시 `default` 자동 적용
- 슬라이드별 override: 마크다운 슬라이드 첫 줄 `#layout-name` (출력에서 제거)
- 슬롯: `::: slotName ... :::` (fenced div) → 템플릿 `{{slotName}}` 치환
- 시스템 변수: `{{markmap}}` (`_toc` layout 전용)
- 단일 CSS 정책: layout별 별도 CSS 없음. 모든 `.layout-*` selector는 theme의 `slide.css`에 작성
- `slide_css:` 키는 하위 호환 유지


## 주요 작업 명령어

### HTML 프레젠테이션 생성 (권장)

```bash
# 도움말 (인자 없이 실행하면 동일하게 출력됨)
./m2slide.sh --help

# 특정 프로젝트 (Projects/ 하위 이름 또는 경로)
./m2slide.sh MarkdownGraph
./m2slide.sh Projects/[ProjectName]

# Node.js 직접 실행
node generate-slides.js Projects/[ProjectName]
```

> `_config.org.yml`의 `current_project`는 주석 처리되어 있으므로 인자 없이
> 실행하면 사용법이 출력됩니다. 기본 프로젝트를 두려면 루트 `_config.yml`을
> 만들어 `current_project: <name>` 을 지정하세요.

**출력물**:
- `slide/*.html`: 각 챕터별 Reveal.js 프레젠테이션
- `slide/index.html`: Markmap 기반 전체 목차 (클릭 가능한 마인드맵)
  - EPUB 파일이 있으면 다운로드 링크 자동 표시
- `slide/*.epub`: EPUB 파일 (존재하는 경우 자동 복사)
- 계층적 네비게이션 (↑ 키 또는 우측 하단 버튼으로 상위 페이지 이동)

### EPUB 전자책 생성

```bash
# 특정 프로젝트 (HTML + EPUB 동시 생성)
./m2slide.sh [ProjectName] --epub
./m2slide.sh Projects/[ProjectName] --epub

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
./m2slide.sh Projects/NewProject
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
# 프로젝트 이름 또는 경로 지정 필수
./m2slide.sh LlmAndVibeCoding
./m2slide.sh Projects/OtherProject
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
- `generateIndexHTML()`: 전체 프레젠테이션 목차 페이지 생성
- `getSubsections()`: AGENDA.md에서 하위 챕터 목록 추출
- `getParentPage()`: AGENDA.md에서 상위 페이지 파일명 추출

**특수 처리**:
- 테이블 슬라이드도 `convertMarkdownToHTML`이 직접 `<table>` HTML을 생성하고 layout 경로를 통과시켜 `theme_default_layout` 적용을 보장 (Issue94. 과거 `data-markdown`으로 reveal.js markdown 플러그인에 위임하던 우회는 폐기됨)
- 첫 슬라이드는 제목 슬라이드로 자동 인식하고 Markmap 목차 포함
- 이미지는 상대 경로 유지 (`img/` 폴더 자동 복사로 해결)
- 모든 HTML 파일에 상위 페이지 버튼 자동 추가 (우측 하단 "↑ 상위")

### 네비게이션 시스템

**3단계 계층 구조**:
1. `index.html`: 전체 프레젠테이션 Markmap 목차
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
- 독립적인 프레젠테이션으로 동작
## Claude Code 규칙 (`.claude/rules/`)

| 규칙                  | 설명                                                                       |
| :-------------------- | :------------------------------------------------------------------------- |
| `issue-rules`         | m2slide 이슈 관리 규칙 (issue-g 기반)                                      |
| `md-m2slide-rules`    | m2slide 마크다운 작성 규칙. 글로벌 `md-slide-rules` 기반 + 고유 확장     |
| `apply-verify-rules`  | 코드·템플릿·CSS·콘텐츠 수정 후 빌드 → HTML 직접 검증 → 브라우저 표시 절차 |
| `release-date-rules`  | 슬라이드 소스 `.md` 수정 시 frontmatter `release_date`를 오늘 날짜로 자동 갱신 |
| `identifier-meta-rules` | instructor_name 등 식별자 메타 필드 자동 채움 금지 + grep 우선 절차. 로마자→한글 역변환 금지 |
| `capture-output-rules`| 캡처·스크린샷 출력 경로 의무(`_doc_work/capture/`) 및 루트 오염 차단 절차       |
| `project-version-rules` | 프로젝트 폴더 무버전 + `Projects/<Name>/VERSION` 파일 SSOT. z_done 이동 시 `<Name>_v<VERSION>` 버전 복원 |
| `repo-tracking-rules`  | git push 용량 초과 재방지 — 배포 불필요 자산(`_pipeline/`·`refs/`·pdf·미발행 epub·`_doc_arch`·`_doc_work`) gitignore 정책 + 신규 자산 추가 시 추적 여부 판정 절차 |
| `config-sync-rules`   | `_config.yml` 설정 키 추가·제거·변경 시 4곳(`lib/config.js` 파서·`_config.org.yml` 문서·설정 GUI `_CONFIG_SCHEMA`·`_doc_arch/config-gui.md`) 동기화 강제 |

**슬라이드 마크다운 작성 시 의무 참조 순서**:
1. `~/.claude/rules/md-rules.md` (일반 마크다운 기본)
2. `~/.claude/rules/md-slide-rules.md` (슬라이드 도구 공통)
3. `.claude/rules/md-m2slide-rules.md` (m2slide 특화)

## graphify

This project has a graphify knowledge graph at `graphify-out/`.

* **토큰 절감 룰 우선**: `.claude/rules/graphify-rules.md` (글로벌 `~/.claude/rules/graphify-rules.md` 위임)
* **진입점**: `graphify-out/GRAPH_REPORT.brief.md` (없으면 `/graphify-prune`)
* **금지**: `GRAPH_REPORT.md` / `graph.json` / `graph.html` 직접 Read
* **CLI 우선**: 코드/아키텍처 질문은 `graphify query "<질문>"` · `graphify path "<A>" "<B>"` · `graphify explain "<개념>"`
* **유지**: 파일 수정 후 `graphify update .` (post-commit hook 있으면 자동)
* **보조**: `/graphify-prune` (brief 재생성), `/gq <질문>` (query 래퍼)
* **적용 SSOT**: `~/_git/___pm/_doc_arch/graphify-priority-setup.md`
