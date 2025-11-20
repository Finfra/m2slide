# LLM 툴 진화와 바이브 코딩 세대 구분

AI 코딩 도구의 발전 과정과 바이브 코딩(VibeCoding) 개념을 소개하는 30분 강연 자료입니다.

**🌐 온라인 프레젠테이션**: https://finfra.github.io/m2slide/

**📚 추가 자료**: https://finfra.kr/go/vibe2025

> m2slide 도구로 생성된 Reveal.js 프레젠테이션입니다. 웹브라우저에서 바로 확인할 수 있습니다.

## 프로젝트 개요

**주제**: LLM 기반 코딩 도구의 진화와 바이브 코딩 세대 구분

**목적**: AI 코딩 도구의 발전 과정을 체계적으로 정리하고, 사용자 인터페이스 방식에 따른 세대 구분을 제안

**대상**: 개발자, 기술 리더, AI 도구 도입을 고려하는 조직

**형식**: 30분 강연 + Q&A

**특징**:
- Markmap 기반 인터랙티브 네비게이션
- 계층적 챕터 구조 (메인 7개, 하위 9개)
- Mermaid 다이어그램 (LLM 툴 진화 타임라인 등)
- 실전 활용 사례와 도입 로드맵 포함

## 컨텐츠 구성

### 1. 오프닝 - AI 코딩의 패러다임 전환 (01-opening.md)
- 2023년 이후 급격한 변화와 도구의 다양화
- 강연의 목표: 체계적 이해와 전략적 선택

### 2. LLM 툴 진화 - 3세대 발전 과정 (02-*.md)
- **2.1 0세대: 채팅 기반 도구** (2022-2023)
  - ChatGPT, Claude, Bard
  - 대화형 인터페이스, 컨텍스트 제한, 수동 복사
- **2.2 1세대: IDE 통합 도구** (2023-2024)
  - Cursor, Cline, Windsurf, Continue
  - 코드 편집기 통합, 파일 컨텍스트, 자동 적용
- **2.3 2세대: CLI 기반 도구** (2024~)
  - Claude Code, Gemini CLI, Aider
  - 터미널 통합, 시스템 권한, 자율 실행

### 3. 바이브 코딩 개념 (03-*.md)
- **3.1 채팅 기반의 한계**: 컨텍스트 제한, 수동 작업, 도구 부재
- **3.2 바이브 코딩의 시작**: AI가 직접 실행하는 새로운 패러다임

**바이브 코딩 정의**: AI가 요청을 이해하고 프로젝트 컨텍스트를 파악한 후 필요한 도구를 자율적으로 선택하여 실행하는 개발 방식

### 4. 바이브 코딩 세대 구분 (04-*.md)
**핵심 기준**: 사용자 인터페이스 방식 (UI)

- **4.1 1세대: IDE 기반** (Cursor, Cline, Windsurf, Continue)
  - GUI 중심, 파일 단위 작업
  - 프로젝트 초기 구축과 빠른 프로토타입 최적화

- **4.2 2세대: CLI 기반** (Claude Code, Gemini CLI, Aider)
  - 터미널 통합, 시스템 레벨 접근
  - 복잡한 디버깅, 대규모 리팩토링, 워크플로우 자동화

**중요**: "에이전트 기반"은 작동 특성일 뿐, 세대 분류 기준이 아님
- Cursor의 Composer: IDE 기반 + 에이전트 실행 → **1세대**
- Claude Code: CLI 기반 + 에이전트 실행 → **2세대**

### 5. 세대별 비교 및 선택 가이드 (05-generation-comparison.md)
- **장단점 비교**: 학습 곡선, 작업 범위, 통합성
- **선택 기준**: 프로젝트 규모, 팀 구성, 작업 유형
- **혼합 전략**: IDE와 CLI를 상황에 따라 활용

### 6. 실전 활용 사례 (06-practical-cases.md)
- 시나리오별 최적 도구 선택
- 실제 개발 워크플로우 예시
- 팁과 베스트 프랙티스

### 7. 도입 로드맵 (07-adoption-roadmap.md)
- 단계별 도입 전략
- 팀 교육 및 적응 방안
- 성과 측정 및 개선

### 8. Q&A 및 클로징 (08-qa-closing.md)
- 자주 묻는 질문
- 핵심 요약
- 추가 학습 자료

## 프로젝트 구조

```
LlmAndVibeCoding/
├── markdown/                 # 마크다운 소스 (16개 파일)
│   ├── AGENDA.md            # 전체 목차 (계층 구조)
│   ├── 01-opening.md
│   ├── 02-llm-tool-evolution.md
│   ├── 02.1-chat-based.md   # 하위 챕터
│   ├── 02.2-ide-integration.md
│   ├── 02.3-cli-based.md
│   ├── 03-vibecoding-concept.md
│   ├── 03.1-chat-limitations.md
│   ├── 03.2-vibecoding-start.md
│   ├── 04-vibecoding-generations.md
│   ├── 04.1-ide-generation.md
│   ├── 04.2-cli-generation.md
│   ├── 05-generation-comparison.md
│   ├── 06-practical-cases.md
│   ├── 07-adoption-roadmap.md
│   └── 08-qa-closing.md
├── slide/                   # HTML 프레젠테이션 (자동 생성)
│   ├── index.html          # Markmap 목차
│   ├── 01-opening.html
│   └── ...
├── resource/                # 참고 자료
│   ├── _vibeCoding.md       # 바이브 코딩 개념 정리
│   ├── claudeCode.md        # Claude Code 상세
│   ├── cursorAi.md
│   ├── cline.md
│   └── ...
├── LlmAndVibeCoding.epub    # EPUB 전자책 (자동 생성)
├── README.md                # 이 파일
└── CLAUDE.md                # 개발 가이드
```

## 사용법

### HTML 프레젠테이션 보기

```bash
# 브라우저에서 열기
open slide/index.html      # 마인드맵 네비게이션
open slide/01-opening.html # 개별 챕터
```

**네비게이션**:
- **← / →**: 이전/다음 슬라이드
- **↑**: 상위 페이지로 이동 (하위 챕터 → 메인 챕터 → 목차)
- **ESC**: 슬라이드 전체 보기
- **S**: 발표자 노트 모드

### 마크다운 수정 및 재생성

```bash
# 1. markdown 폴더의 파일 수정
vi markdown/02.1-chat-based.md

# 2. 상위 폴더로 이동
cd ../../

# 3. HTML + EPUB 재생성
./convert.sh Projects/LlmAndVibeCoding --epub

# 4. 확인
open Projects/LlmAndVibeCoding/slide/index.html
```

## 핵심 개념 정리

### 바이브 코딩 세대 구분 기준

**사용자 인터페이스 방식**으로 구분 (작동 방식이 아님):

| 세대 | UI 방식 | 대표 도구 | 최적 활용 |
|------|---------|-----------|-----------|
| **0세대** | 채팅 웹 | ChatGPT, Claude | 개념 학습, 코드 설명 |
| **1세대** | IDE 통합 | Cursor, Cline, Windsurf | 빠른 프로토타입, GUI 중심 |
| **2세대** | CLI 통합 | Claude Code, Gemini CLI | 디버깅, 리팩토링, 자동화 |

### 자주 하는 오해

❌ **틀린 이해**: "에이전트 기능이 있으면 2세대"
✅ **올바른 이해**: "CLI 인터페이스를 사용하면 2세대"

**예시**:
- Cursor Composer: IDE에서 에이전트 실행 → **1세대**
- Claude Code: CLI에서 에이전트 실행 → **2세대**

### 마크다운 작성 원칙

**청중 배포용 참고 자료** 작성:
- ❌ "여러분", "오늘", "Let's dive in!" 등 강연 표현 금지
- ❌ "학습 목표", "기대 효과" 등 강사용 메모 제거
- ✅ 독립적으로 읽을 수 있는 완결된 문서
- ✅ 문어체와 객관적 서술 사용

## 참고 자료

### resource 폴더
- **_vibeCoding.md**: 바이브 코딩 개념 정리
- **claudeCode.md**: Claude Code 상세 가이드
- **cursorAi.md, cline.md**: IDE 기반 도구 분석
- **geminiCli.md, codexCli.md**: CLI 기반 도구 분석
- **LLM_Services_List.md**: LLM 서비스 목록

### 외부 링크
- **온라인 프레젠테이션**: https://finfra.github.io/m2slide/
- **추가 자료**: https://finfra.kr/go/vibe2025

## 기술 스택

- **Reveal.js 5.0.4**: HTML 프레젠테이션 프레임워크
- **Markmap**: 인터랙티브 마인드맵 목차
- **Mermaid 10.9.0**: 다이어그램 렌더링
- **Node.js**: 마크다운 → HTML/EPUB 변환 스크립트
- **m2slide**: 상위 폴더의 변환 도구

## 라이선스

MIT License

---

**참고**: 이 프로젝트는 m2slide 도구의 모든 기능을 시연하는 예시 프로젝트입니다.
