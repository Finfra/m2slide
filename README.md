# m2slide - 마크다운 프레젠테이션 & 전자책 생성 도구

마크다운 파일을 **Reveal.js 프레젠테이션**과 **EPUB 전자책**으로 자동 변환하는 도구입니다.
프로젝트별 독립 폴더 구조로 여러 강연 자료와 전자책을 체계적으로 관리할 수 있습니다.

**🌐 온라인 데모**: https://finfra.github.io/m2slide/
> 실제 생성된 프레젠테이션을 웹브라우저에서 바로 확인할 수 있습니다.

## 핵심 기능

### 1. Reveal.js HTML 프레젠테이션 생성
- **마크다운 → HTML 변환**: `---` 구분자로 슬라이드 자동 분리
- **Markmap 목차**: 클릭 가능한 인터랙티브 마인드맵
- **계층적 네비게이션**: 메인/하위 챕터 자동 연결, 상위 페이지 버튼
- **반응형 디자인**: 데스크톱/모바일 최적화
- **완전한 마크다운 지원**: 헤더, 리스트, 테이블, 코드 블록, 이미지, blockquote 등

### 2. EPUB 전자책 생성
- **EPUB 3.0 표준**: iBooks, Calibre, Google Play Books 등 모든 리더 지원
- **자동 목차 생성**: AGENDA.md 기반 계층 구조
- **Mermaid 다이어그램**: SVG 이미지로 자동 변환 (mmdc 설치 시)
- **이미지 자동 포함**: 마크다운 이미지를 EPUB 내부에 임베딩

### 3. 프로젝트별 독립 관리
- **독립 폴더 구조**: 각 프로젝트는 별도 폴더에서 관리
- **일관된 워크플로우**: 모든 프로젝트에 동일한 명령어 사용
- **Git 친화적**: 프로젝트별 선택적 버전 관리

## 프로젝트 구조

```
m2slide/
├── Projects/
│   ├── ProjectA/                  # 독립 프로젝트 1
│   │   ├── markdown/              # 마크다운 소스
│   │   │   ├── AGENDA.md
│   │   │   ├── 01-section.md
│   │   │   └── ...
│   │   ├── slide/                 # HTML 출력 (자동 생성)
│   │   └── ProjectA.epub          # EPUB 출력 (자동 생성)
│   ├── ProjectB/                  # 독립 프로젝트 2
│   │   ├── markdown/
│   │   ├── slide/
│   │   └── ProjectB.epub
│   └── LlmAndVibeCoding/          # 예시 프로젝트 (아래 참고)
├── config.yml                     # 현재 작업 프로젝트 설정
├── generate-slides.js             # HTML 변환 스크립트
├── generate-epub.js               # EPUB 변환 스크립트
├── convert.sh                     # 원클릭 변환 (HTML/EPUB)
├── deploy.sh                      # GitHub Pages 배포
└── README.md
```

## 사용법

### 1. HTML 프레젠테이션 생성

**간편한 방법 (권장)**:
```bash
# config.yml의 현재 프로젝트 사용
./convert.sh

# 특정 프로젝트 지정
./convert.sh Projects/ProjectA
```

**상세 제어 (Node.js 직접 실행)**:
```bash
# 기본 프로젝트 사용
node generate-slides.js

# 프로젝트 폴더 지정
node generate-slides.js Projects/ProjectA

# markdown 폴더 직접 지정 (자동으로 ../slide/ 생성)
node generate-slides.js Projects/ProjectA/markdown

# 입력/출력 폴더 직접 지정 (고급 사용)
node generate-slides.js Projects/ProjectA/markdown Projects/ProjectA/slide
```

**출력 결과**:
- `slide/*.html`: 각 챕터별 Reveal.js 프레젠테이션
- `slide/index.html`: Markmap 기반 전체 목차 (마인드맵)
- `slide/img/`: 이미지 자동 복사

### 2. EPUB 전자책 생성

**HTML + EPUB 동시 생성**:
```bash
# config.yml의 현재 프로젝트
./convert.sh --epub

# 특정 프로젝트
./convert.sh Projects/ProjectA --epub
```

**EPUB만 생성 (HTML 스킵)**:
```bash
node generate-epub.js Projects/ProjectA
```

**Mermaid 다이어그램 렌더링 (선택)**:
```bash
# Mermaid CLI 설치 (mmdc)
npm install -g @mermaid-js/mermaid-cli

# Google Chrome 필요 (자동 감지)
# - macOS: /Applications/Google Chrome.app/
# - Linux: /usr/bin/google-chrome
# - Windows: C:\Program Files\Google\Chrome\Application\chrome.exe

# mmdc가 없으면 placeholder SVG로 대체됨
```

**출력 결과**:
- `Projects/ProjectA/ProjectA.epub`: EPUB 3.0 전자책
- `slide/ProjectA.epub`: 프레젠테이션과 함께 자동 복사
- `index.html`: EPUB 다운로드 링크 자동 표시

### 3. 프레젠테이션 보기

```bash
# 브라우저에서 열기
open Projects/ProjectA/slide/index.html      # 마인드맵 네비게이션
open Projects/ProjectA/slide/01-section.html # 개별 섹션
```

**네비게이션**:
- **← / →**: 이전/다음 슬라이드 이동
- **↑**: 상위 페이지로 이동 (하위 챕터 → 메인 챕터 → 목차)
- **ESC**: 슬라이드 전체 보기
- **S**: 발표자 노트 모드
- **우측 하단 버튼**: ↑ 상위 버튼 클릭으로 상위 페이지 이동
- **첫 슬라이드**: 클릭 가능한 Markmap 목차 (하위 챕터 링크 포함)

### 4. 새 프로젝트 추가

```bash
# 1. 프로젝트 폴더 생성
mkdir -p Projects/NewProject/markdown

# 2. AGENDA.md와 마크다운 파일 작성
# markdown 폴더에 다음 형식으로 작성:
# - AGENDA.md: ## [제목](./파일명.md) 형식
# - XX-title.md: 메인 섹션 (예: 01-intro.md)
# - XX.Y-title.md: 하위 섹션 (예: 02.1-detail.md)
# - 각 파일에 --- 구분자로 슬라이드 분리

# 3. Git 추적 추가 (선택)
echo "!/NewProject/" >> Projects/.gitignore

# 4. HTML/EPUB 생성
./convert.sh Projects/NewProject --epub

# 5. 확인
open Projects/NewProject/slide/index.html
```

### 5. PowerPoint 변환 (옵션)

```bash
# Pandoc 설치 필요 (brew install pandoc)

# 개별 파일 변환
pandoc Projects/ProjectA/markdown/01-section.md -o presentation.pptx

# 전체 자료 통합
pandoc Projects/ProjectA/markdown/*.md -o complete.pptx
```

## 주요 특징

### Reveal.js 프레젠테이션 시스템
- **자동 슬라이드 분리**: `---` 구분자로 슬라이드 경계 자동 인식
- **Markmap 목차**: AGENDA.md 구조를 인터랙티브 마인드맵으로 시각화
- **계층적 네비게이션**:
  - 메인 챕터 목차에 하위 챕터 링크 자동 표시
  - 상위 페이지 버튼 (우측 하단 "↑ 상위")
  - 키보드 ↑ 키로 상위 페이지 이동
- **완전한 마크다운 파서**:
  - 헤더, Bold, Italic, 인라인 코드
  - Ordered/Unordered List, Nested List
  - 테이블, 코드 블록, Blockquote
  - 이미지 (자동 크기 제한 400x300px)
- **반응형 디자인**: 데스크톱/모바일 최적화
- **슬라이드 번호**: 현재/전체 표시
- **자동 index.html 생성**: AGENDA.md 구조 기반 마인드맵 네비게이션

### EPUB 전자책 시스템
- **EPUB 3.0 표준**: mimetype, META-INF/container.xml, OEBPS/content.opf, toc.ncx
- **자동 목차 생성**: AGENDA.md에서 책 제목과 챕터 구조 추출
- **Mermaid 다이어그램 변환**:
  - Mermaid CLI 설치 시 SVG 이미지로 자동 변환
  - 시스템 Chrome 사용 (PUPPETEER_EXECUTABLE_PATH)
  - 변환 실패 시 placeholder SVG 생성
- **이미지 임베딩**: markdown/img/ 폴더의 이미지를 EPUB 내부에 포함
- **순수 Node.js 구현**: 외부 dependencies 없음 (mmdc는 선택적)
- **범용 호환성**: iBooks, Calibre, Google Play Books 등 모든 EPUB 리더

### 자동 변환 스크립트
- **원클릭 변환**: `./convert.sh` 스크립트로 HTML/EPUB 동시 생성
- **config.yml 지원**: 현재 작업 프로젝트 자동 인식
- **이미지 자동 복사**: markdown/img/ → slide/img/, EPUB 내부
- **상위 페이지 자동 감지**: AGENDA.md 기반 계층 구조 파악
- **에러 복원력**: 변환 실패 시 placeholder 생성

## 마크다운 작성 규칙

### AGENDA.md 형식
```markdown
# 프로젝트 제목

## [메인 섹션 1](./01-section.md)
### [하위 섹션 1.1](./01.1-detail.md)
### [하위 섹션 1.2](./01.2-detail.md)

## [메인 섹션 2](./02-section.md)
```

**중요**:
- 인라인 링크 형식(`[제목](파일명)`)만 인식
- `##`: 메인 섹션, `###`: 하위 섹션
- 파일명 규칙: `XX-title.md` (메인), `XX.Y-title.md` (하위)

### 슬라이드 분리
```markdown
# 첫 번째 슬라이드

내용...

---

# 두 번째 슬라이드

내용...
```

## 수정 워크플로우

1. `Projects/[Project]/markdown/` 폴더의 마크다운 파일 수정
2. `./convert.sh --epub` 실행 (HTML + EPUB 동시 생성)
3. 브라우저에서 `Projects/[Project]/slide/index.html` 확인
4. EPUB 리더에서 `Projects/[Project]/[Project].epub` 확인

**자동 생성되는 파일**:
- `slide/*.html`: 모든 챕터별 Reveal.js 프레젠테이션
- `slide/index.html`: AGENDA.md 기반 마인드맵 네비게이션
- `[Project].epub`: EPUB 3.0 전자책
- `slide/[Project].epub`: 프레젠테이션과 함께 제공

## GitHub Pages 배포

### 웹 배포 워크플로우

**간편한 방법 (권장)**:
```bash
# config.yml의 현재 프로젝트를 자동으로 배포
./deploy.sh

# 커스텀 커밋 메시지 사용
./deploy.sh "Add new slides"
```

**수동 배포**:
```bash
# 1. HTML 재생성
./convert.sh --epub

# 2. docs 폴더에 복사
cp -r Projects/[Project]/slide/* docs/

# 3. Git 커밋 및 푸시
git add docs
git commit -m "Update slides"
git push
```

약 1-2분 후 GitHub Pages에서 업데이트된 내용 확인 가능

**deploy.sh 스크립트 기능**:
- config.yml에서 현재 프로젝트 자동 읽기
- slide 폴더를 docs 폴더로 자동 복사
- Git add, commit, push 자동 실행
- 변경사항이 없으면 자동으로 종료

### GitHub Pages 설정 (최초 1회)

1. GitHub 저장소 접속
2. **Settings** → **Pages** 메뉴
3. **Source**: Branch `main`, Folder `/docs` 선택
4. **Save** 버튼 클릭

## 기술 스택

### HTML 프레젠테이션
- **Reveal.js 5.0.4**: HTML 프레젠테이션 프레임워크
- **Markmap.js**: 마인드맵 시각화 (목차)
- **Mermaid.js 10.9.0**: 다이어그램 렌더링
- **D3.js**: 데이터 시각화
- **Node.js**: 마크다운 변환 스크립트 (순수 표준 라이브러리)

### EPUB 전자책
- **Node.js**: EPUB 3.0 생성 (순수 표준 라이브러리)
- **Mermaid CLI** (선택): 다이어그램 SVG 변환 (`@mermaid-js/mermaid-cli`)
- **Google Chrome** (선택): Mermaid 렌더링 엔진

### 기타
- **Pandoc** (선택): PowerPoint 변환
- **GitHub Pages**: 웹 호스팅

## 예시 프로젝트: LlmAndVibeCoding

**주제**: LLM 툴 진화와 바이브 코딩 세대 구분 (30분 강연 자료)

**온라인 데모**: https://finfra.github.io/m2slide/

**컨텐츠 개요**:
1. **오프닝**: AI 코딩의 패러다임 전환
2. **LLM 툴 진화**: 채팅 → IDE → CLI 발전 과정
3. **바이브 코딩**: 개념과 철학
4. **세대 구분**: 사용자 인터페이스 기준 (0세대: 채팅, 1세대: IDE, 2세대: CLI)
5. **세대별 비교**: 선택 가이드
6. **실전 사례**: 활용법
7. **도입 로드맵**: 실천 전략
8. **Q&A 및 클로징**

**파일 구조**:
- 마크다운 소스: `Projects/LlmAndVibeCoding/markdown/` (16개 파일)
- HTML 프레젠테이션: `Projects/LlmAndVibeCoding/slide/`
- EPUB 전자책: `Projects/LlmAndVibeCoding/LlmAndVibeCoding.epub`

**특징**:
- Markmap 기반 인터랙티브 네비게이션
- 계층적 챕터 구조 (메인 7개, 하위 9개)
- Mermaid 다이어그램 (LLM 툴 진화 타임라인 등)

이 프로젝트는 **m2slide의 모든 기능을 시연하는 참고용 예시**입니다.

## 현재 프로젝트 설정

`config.yml` 파일에서 기본 작업 프로젝트를 지정:

```yaml
# 현재 작업 중인 프로젝트
current_project: LlmAndVibeCoding
```

`./convert.sh`와 `./deploy.sh`는 이 설정을 자동으로 읽습니다.

## 라이선스

MIT License
