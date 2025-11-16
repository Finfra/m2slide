# LLM 툴 진화와 바이브 코딩 세대 구분

AI 코딩 도구의 발전 과정과 바이브 코딩(VibeCoding) 개념을 소개하는 30분 강연 자료

## 프로젝트 구조

```
LlmAndVibeCodingGen/
├── AGENDA.md                # 전체 목차 (인라인 링크 형식)
├── LlmAndVibeCoding/                      # 마크다운 소스 파일 (15개)
│   ├── 01-opening.md
│   ├── 02-llm-tool-evolution.md
│   ├── 02.1.chat-based.md
│   └── ...
├── LlmAndVibeCoding_slide/                 # Reveal.js 프레젠테이션 (자동 생성)
│   ├── index.html          # 마인드맵 네비게이션 (자동 생성)
│   ├── 01-opening.html
│   └── ...
├── generate-slides.js       # 자동 변환 스크립트
├── convert.sh              # 원클릭 변환 스크립트
├── CLAUDE.md               # 프로젝트 가이드
└── README.md               # 사용 설명서
```

## 사용법

### 1. Reveal.js 프레젠테이션 생성

**간편한 방법 (권장)**:
```bash
./convert.sh
```

**상세 제어**:
```bash
# 모든 md 파일을 HTML로 변환
node generate-slides.js

# 특정 파일만 변환
node generate-slides.js LlmAndVibeCoding/01-opening.md
```

### 2. 프레젠테이션 보기

```bash
# 브라우저에서 열기
open LlmAndVibeCoding_slide/index.html      # 마인드맵 네비게이션
open LlmAndVibeCoding_slide/01-opening.html # 개별 섹션
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
pandoc LlmAndVibeCoding/01-opening.md -o presentation.pptx

# 전체 자료 통합
pandoc LlmAndVibeCoding/*.md -o complete.pptx
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

1. `LlmAndVibeCoding/` 폴더의 마크다운 파일 수정
2. `./convert.sh` 실행 (또는 `node generate-slides.js`)
3. 브라우저에서 `LlmAndVibeCoding_slide/` HTML 파일 확인

**자동 생성되는 파일**:
- `LlmAndVibeCoding_slide/*.html` - 모든 챕터별 Reveal.js 프레젠테이션
- `LlmAndVibeCoding_slide/index.html` - AGENDA.md 기반 마인드맵 네비게이션

## 기술 스택

- **Reveal.js 5.0.4**: 프레젠테이션 프레임워크
- **Markmap.js**: 마인드맵 시각화
- **D3.js**: 데이터 시각화
- **Node.js**: 자동 변환 스크립트
- **Pandoc**: PowerPoint 변환 (선택)

## 라이선스

MIT License
