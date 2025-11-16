# Info

## 개요
* 생성일: 2025-06-30 16:32:25
* 경로: `/Users/nowage/_doc/3.Resource/_LLM/_vibeCoding`
## Vibe Coding Tip
* 해결 못하면 다른 툴 쓰자. 
* commit은 중요하다. 

## Tool 목록
| use | Tool 이름           | 특징 및 기능 요약                                    | 장점                                    | 비고                     |
| --- | ----------------- | --------------------------------------------- | ------------------------------------- | ---------------------- |
| v   | **Cline**         | LLM 기반 CLI/코딩 인터페이스, GPT 연결된 터미널 환경           | 간결한 명령 기반 UI, 모델 전환 가능, Code-first UX | `.cline` 설정으로 모델 선택 가능 |
| v   | **Claude Code**   | Claude를 통한 코드 분석 및 생성 인터페이스                   | 문맥 길이 길고, 자연어 이해력 강함, 대화형 코딩 지원       | slack-like UX          |
| V   | **Gemini CLI**    | Google Gemini 기반 CLI 인터페이스, 터미널 기반 코드 생성 및 QA | 빠른 응답, Google 계정 기반 인증, 개발자 친화 프롬프트   | `gcloud` CLI 기반 가능성 있음 |
| v   | **Cursor AI**     | VSCode fork 기반 AI IDE, 프롬프트 없이 자동 코드 제안       | GPT-4 기반, inline 편집 강화, diff 모드 지원    | GPT API 키 필요           |
|     | **Windsurf**      | 코드 편집기 기반 LLM 어시스턴트, 전체 프로젝트 맥락 이해 가능         | context-aware 편집, 코드 생성·리팩토링 우수       | VSCode-like UI         |
|     | **Continue**      | VSCode 확장 기반 코드 어시스턴트                         | 실시간 코드 편집, 사이드바 prompt UI 지원          | local 모델 연동도 가능        |
|     | **Sweep**         | GitHub PR 자동화 및 issue 기반 코드 생성                | issue → PR 자동화, 팀 협업용                 | GitHub 연동 필요           |
|     | **Cody**          | Sourcegraph에서 만든 코드 검색 및 LLM 답변 기능            | 코드 탐색+QA, 문맥 기반 보완 우수                 | Sourcegraph 통합         |
|     | **CodeWhisperer** | AWS의 AI 코딩 지원 도구                              | Java, Python, JS 등 지원, 보안 점검 내장       | AWS 환경 최적화             |
![[../../../data/img/_vibeCoding-2025.08.21.12.08.94.png]]
# 특성
## [cline](cline.md)
## [claudeCode](claudeCode.md)
## [cursorAi](cursorAi.md)
## [geminiCli](geminiCli.md)


# 참고
* 

# Vibe Coding 기반 파일 구조
## 1. agent.md
- 역할: AI 에이전트(agent)의 정의와 설계 설명
- 예시 내용
    - 에이전트 목적 및 범위 (예: 코드 생성, 테스트, 커밋 등)
    - 에이전트가 사용하는 LLM, 모드 정보 (e.g., Copilot Agent Mode, Claude, o3-mini) ([Medium](https://medium.com/%40mitchell.carlson.pro/vibe-coding-my-solar-panels-into-home-assistant-b2c9ecba00b5?utm_source=chatgpt.com "Vibe Coding My Solar Panels into Home Assistant"))
    - 에이전트의 능동/수동 흐름 (human-in-loop vs agent-led)
        

## 2. prd.md (Product Requirements Document)
- 역할: ‘무엇을 만들 것인가’의 명세
- 예시 내용
    - 사용자 목표 / 기능 요구사항 (intent-based programming 강조) ([Wikipedia](https://en.wikipedia.org/wiki/Karpathy_Canon?utm_source=chatgpt.com "Karpathy Canon"))
    - 비기능 요구 (보안, 유지보수성, AI 출력 검증 흐름 등) ([Wikipedia](https://en.wikipedia.org/wiki/Vibe_coding?utm_source=chatgpt.com "Vibe coding"))
    - MVP 범위 정의 (prototype 구현에 집중)
## 3. tasks.md
- 역할: 세부 작업 항목 리스트
- 예시 항목 구조
    ```markdown
    * [ ] task-1: 에이전트 초기화 및 context 설정  
    * [ ] task-2: 코드 생성 요청 (natural language prompt)  
    * [ ] task-3: 생성된 코드 실행 테스트  
    * [ ] task-4: 결과 검증 및 피드백 루프  
    * [ ] task-5: 에이전트 수정하거나 프롬프트 조정  
    * [ ] task-6: 버전 관리 (rollback, commit)  
    * [ ] task-7: 보안 취약점 자동 스캔 및 리포트  
    ```
    - “vibe coding” 방식에서 AI가 생성한 코드에 대한 **인간 검증** 사이클을 강조 ([Wikipedia](https://en.wikipedia.org/wiki/Karpathy_Canon?utm_source=chatgpt.com "Karpathy Canon"))
        

- 역할: 작업 수행에 대한 규칙 및 가이드라인
- 예시 규칙
    - 에이전트가 생성한 코드 **절대 신뢰 금지**, 반드시 테스트 및 리뷰 필수
    - PRD와 명세에 부합하지 않는 경우, 반드시 prompt 개선해야 함
    - 대규모 코드 변경 시 “rollback 가능한 커밋” 필수 포함
    - 보안·품질·문서화 기준 충족 권고 (예: 코드 주석, log f-strings vs %-style 검토) ([Medium](https://medium.com/%40mitchell.carlson.pro/vibe-coding-my-solar-panels-into-home-assistant-b2c9ecba00b5?utm_source=chatgpt.com "Vibe Coding My Solar Panels into Home Assistant"))
        

---

## 요약 테이블

| 파일명          | 역할 요약                      | 핵심 포인트                    |
| ------------ | -------------------------- | ------------------------- |
| agent.md     | AI 에이전트 설계 및 동작 방식 설명      | 에이전트 모드, LLM 선택, 역할 정의 등  |
| prd.md       | 제품(프로젝트) 요구사항 문서화          | 사용자 요구, 기능/비기능 요구, MVP 범위 |
| tasks.md     | 작업 항목 리스트 (task checklist) | 프롬프트, 실행, 테스트, 리뷰, 커밋 등   |
| tasksRule.md | 작업 규칙 및 가이드라인              | 검증 루프, 보안, rollback, 표준 등 |

---

## 추가 팁: Karpathy의 vibe coding 통찰 적용

- **Intent-based programming** 강조: “무엇을 할지”(목표)만 명확히 하고, **어떻게 구현할지는 LLM에 위임**([Wikipedia](https://en.wikipedia.org/wiki/Karpathy_Canon?utm_source=chatgpt.com "Karpathy Canon"))
- **대화형 개발 과정**: 자연어 기반 prompt ↔ 생성된 코드 ↔ 테스트 ↔ 피드백 순환 구조 중심 ([Wikipedia](https://en.wikipedia.org/wiki/Karpathy_Canon?utm_source=chatgpt.com "Karpathy Canon"))
- **Verification 중심**: 생성된 코드는 인간이 테스트하고 이해한 후에만 다음 단계 진행 (trust & verification) ([Wikipedia](https://en.wikipedia.org/wiki/Karpathy_Canon?utm_source=chatgpt.com "Karpathy Canon"))
    

# Devops Vibe코딩이 힘든이유와 해결책.
* Term이 길고 해결 힘들다.
    → PRD.md : 설계 ( Text Wireframe )
    → rules.md : 규칙
    → tasks.md : 작업
    → GEMINI.md : 문서화
* Cli기반     → GeminiCli
* 대형사고 → 사고를 줄이기 위한 규칙
    → Git : 자주 Commit
    → GUI툴 활용 :
        → SourceTree, GitKraken, GitHub Desktop
        → VsCode : GitLens, Git Graph
## Tip
Window에서 VS코드 사용시 WSL을 잘 설치하면 만사형통.
