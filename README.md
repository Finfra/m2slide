# LLM 툴 진화와 바이브 코딩 세대 구분

AI 코딩 도구의 발전 과정과 바이브 코딩(VibeCoding) 개념을 소개하는 30분 강연 자료

**🌐 온라인 프레젠테이션**: https://finfra.github.io/m2slide/

> GitHub Pages를 통해 웹브라우저에서 바로 프레젠테이션을 볼 수 있습니다.

## 프로젝트 구조

```
m2slide/
├── Projects/
│   └── LlmAndVibeCoding/           # 프로젝트 폴더
│       ├── markdown/               # 마크다운 소스 (16개)
│       │   ├── AGENDA.md
│       │   ├── 01-opening.md
│       │   ├── 02-llm-tool-evolution.md
│       │   └── ...
│       ├── slide/                  # Reveal.js 프레젠테이션 (자동 생성)
│       │   ├── index.html
│       │   ├── 01-opening.html
│       │   └── ...
│       ├── resource/               # 참고 자료
│       └── try0/                   # 초기 시도본
├── config.yml                      # 현재 프로젝트 설정
├── generate-slides.js              # 자동 변환 스크립트
├── convert.sh                      # 원클릭 변환 스크립트
├── deploy.sh                       # GitHub Pages 배포 스크립트
├── CLAUDE.md                       # 프로젝트 가이드
└── README.md                       # 사용 설명서
```

## 사용법

### 1. Reveal.js 프레젠테이션 생성

**간편한 방법 (권장)**:
```bash
# config.yml의 현재 프로젝트 사용
./convert.sh

# 다른 프로젝트 지정 (config.yml 무시)
./convert.sh Projects/AnotherProject
```

**현재 프로젝트 설정** (`config.yml`):
```yaml
# 기본 프로젝트 변경
current_project: LlmAndVibeCoding
```
`./convert.sh`와 `./deploy.sh`는 이 설정을 자동으로 읽습니다.

**상세 제어 (Node.js 직접 실행)**:
```bash
# 기본 프로젝트 사용
node generate-slides.js

# 프로젝트 폴더 지정 (자동으로 markdown/과 slide/ 사용)
node generate-slides.js Projects/LlmAndVibeCoding

# markdown 폴더 직접 지정 (자동으로 ../slide/ 생성)
node generate-slides.js Projects/LlmAndVibeCoding/markdown

# 입력/출력 폴더 직접 지정 (고급 사용)
node generate-slides.js Projects/LlmAndVibeCoding/markdown Projects/LlmAndVibeCoding/slide
```

**프로젝트 구조**:
각 프로젝트는 다음 구조를 가져야 합니다:
```
ProjectFolder/
├── markdown/       # 마크다운 소스 (AGENDA.md 포함)
└── slide/          # HTML 출력 (자동 생성)
```

### 2. 프레젠테이션 보기

```bash
# 브라우저에서 열기
open Projects/LlmAndVibeCoding/slide/index.html      # 마인드맵 네비게이션
open Projects/LlmAndVibeCoding/slide/01-opening.html # 개별 섹션
```

**네비게이션**:
- **← / →**: 이전/다음 슬라이드 이동
- **↑**: 상위 페이지로 이동 (하위 챕터 → 메인 챕터 → 목차)
- **ESC**: 슬라이드 전체 보기
- **우측 하단 버튼**: ↑ 상위 버튼 클릭으로 상위 페이지 이동
- **첫 슬라이드**: 클릭 가능한 Markmap 목차 (하위 챕터 링크 포함)

### 3. PowerPoint 변환

```bash
# 개별 파일 변환
pandoc Projects/LlmAndVibeCoding/markdown/01-opening.md -o presentation.pptx

# 전체 자료 통합
pandoc Projects/LlmAndVibeCoding/markdown/*.md -o complete.pptx
```

### 4. 새 프로젝트 추가

다른 프로젝트를 추가하려면:

1. Documents 폴더에 새 프로젝트 폴더 생성:
```bash
mkdir -p Projects/AnotherProject/markdown
```

2. markdown 폴더에 AGENDA.md와 마크다운 파일 추가

3. Projects/.gitignore에 프로젝트 추가 (Git 추적용):
```gitignore
!/AnotherProject/
```

4. 프레젠테이션 생성:
```bash
./convert.sh Projects/AnotherProject
```

## 주요 특징

### Reveal.js 프레젠테이션
- **Markmap 목차**: 첫 슬라이드에 클릭 가능한 마인드맵
- **계층적 네비게이션**:
  - 메인 챕터 목차에 하위 챕터 링크 자동 표시
  - 상위 페이지 버튼 (우측 하단 "↑ 상위")
  - 키보드 ↑ 키로 상위 페이지 이동
- **자동 index.html 생성**: AGENDA.md 구조 기반 마인드맵 네비게이션
- **반응형 디자인**: 데스크톱/모바일 최적화
- **슬라이드 번호**: 현재/전체 표시

### 자동 변환 스크립트
- **원클릭 변환**: `./convert.sh` 스크립트로 간편 실행
- **완전한 마크다운 지원**:
  - `---` 구분자로 슬라이드 자동 분리
  - Bold, 리스트, 이미지, 테이블, 코드 블록
  - Blockquote, Ordered/Unordered List
- **이미지 최적화**: 자동 크기 제한 (400x300px)
- **상위 페이지 자동 감지**: AGENDA.md 기반 계층 구조 파악

## 컨텐츠 구성

1. **오프닝**: AI 코딩의 패러다임 전환
2. **LLM 툴 진화**: 채팅 → IDE → CLI 발전 과정
3. **바이브 코딩**: 개념과 철학
4. **세대 구분**: IDE vs CLI 기반
5. **세대별 비교**: 선택 가이드
6. **실전 사례**: 활용법
7. **도입 로드맵**: 실천 전략
8. **Q&A 및 클로징**

## 수정 워크플로우

1. `Projects/LlmAndVibeCoding/markdown/` 폴더의 마크다운 파일 수정
2. `./convert.sh` 실행 (또는 `node generate-slides.js`)
3. 브라우저에서 `Projects/LlmAndVibeCoding/slide/` HTML 파일 확인

**자동 생성되는 파일**:
- `slide/*.html` - 모든 챕터별 Reveal.js 프레젠테이션
- `slide/index.html` - AGENDA.md 기반 마인드맵 네비게이션

## GitHub Pages 배포

### 웹 배포 워크플로우

**간편한 방법 (권장)**:
```bash
# config.yml의 현재 프로젝트를 자동으로 배포
./deploy.sh

# 커스텀 커밋 메시지 사용
./deploy.sh "Add new slides about AI coding"
```

**수동 배포**:
```bash
# 1. HTML 재생성
./convert.sh

# 2. docs 폴더에 복사
cp -r Projects/LlmAndVibeCoding/slide/* docs/

# 3. Git 커밋 및 푸시
git add docs
git commit -m "Update slides"
git push
```

약 1-2분 후 https://finfra.github.io/m2slide/ 에서 업데이트된 내용 확인 가능

**deploy.sh 스크립트 기능**:
- config.yml에서 현재 프로젝트 자동 읽기
- slide 폴더를 docs 폴더로 자동 복사
- Git add, commit, push 자동 실행
- 변경사항이 없으면 자동으로 종료

### GitHub Pages 설정 (최초 1회)

1. https://github.com/Finfra/m2slide 접속
2. **Settings** → **Pages** 메뉴
3. **Source**: Branch `main`, Folder `/docs` 선택
4. **Save** 버튼 클릭

## 기술 스택

- **Reveal.js 5.0.4**: 프레젠테이션 프레임워크
- **Markmap.js**: 마인드맵 시각화 (목차)
- **Mermaid.js 10.9.0**: 다이어그램 렌더링
- **D3.js**: 데이터 시각화
- **Node.js**: 자동 변환 스크립트
- **Pandoc**: PowerPoint 변환 (선택)
- **GitHub Pages**: 웹 호스팅

## 라이선스

MIT License
