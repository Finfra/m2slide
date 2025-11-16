# Cline

## 개요
* VS Code 확장으로 제공되는 AI 코딩 어시스턴트
* 다양한 LLM 모델 지원 (Claude, GPT, Gemini 등)
* 자율적 코딩 에이전트 기능

## 주요 기능
* **멀티 LLM 지원**: Claude, GPT-4, Gemini, Ollama 등 다양한 모델 선택
* **자율 코딩**: 전체 프로젝트 이해하고 독립적으로 코드 작성
* **파일 편집**: 여러 파일을 동시에 수정/생성
* **터미널 실행**: 명령어 실행 및 결과 확인
* **브라우저 제어**: 웹 애플리케이션 테스트 가능

## 설치 및 설정
```bash
# VS Code 확장 마켓플레이스에서 "Cline" 검색 후 설치
# 또는 CLI로 설치
code --install-extension saoudrizwan.claude-dev
```

## 사용법
* **시작**: `Cmd+Shift+P` → "Cline: Start New Task"
* **API 키 설정**: 각 LLM 제공업체 API 키 입력 필요
* **작업 요청**: 자연어로 개발 작업 설명

## 장점
* VS Code 통합으로 익숙한 환경에서 사용
* 다양한 LLM 모델 선택권
* 복잡한 멀티파일 프로젝트 처리 가능
* 실시간 피드백 및 승인 시스템

## Rules 
* Example
```
# Basic Rules

* 전문용어나 필수적인 상황이 아니라면 한국어 사용.

* .prd.md파일 기준으로 작업진행.

# Tasks

```

* Tasks는 prd.md에 지정되어 있음.

* Tasks는 번호가 매겨져 있음.

* 해당 테스크가 완료되면 완료 표시. ex) * [ ] 1. ~ → * [x] 1. ~

```
```

## 링크
* **VS Code 마켓플레이스**: https://marketplace.visualstudio.com/items?itemName=saoudrizwan.claude-dev
* **GitHub**: https://github.com/saoudrizwan/claude-dev
* **문서**: https://github.com/saoudrizwan/claude-dev/blob/main/README.md
* **Discord 커뮤니티**: https://discord.gg/cline-dev
