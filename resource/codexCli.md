# Codex cli
## Codex CLI 개요

* CLI 기반 AI 코딩 에이전트 (터미널/로컬 환경 중심)
  * 코드 읽기·수정·실행 지원, 테스트 & 명령어 수행 가능 ([developers.openai.com][1])
* 설치 방법
  * npm: `npm install -g @openai/codex` ([npmjs.com][2])
  * macOS (대안): `brew install codex` ([npmjs.com][3])
* 작동 방식
  * 터미널 인터랙티브(REPL) 또는 커맨드라인 프롬프트 실행 가능
    * 예: `codex` 또는 `codex "explain this codebase to me"` ([npmjs.com][4])
  * 제안 후 승인 방식 또는 자동 실행 옵션 제공 ([npmjs.com][4])

## 승인 모드 (`--approval-mode`)

* **Suggest (기본)**: 파일 읽기 가능, 다른 작업(수정/실행)은 사용자 승인 필요
* **Auto-edit**: 파일 읽기·쓰기 자동 허용, 쉘 명령은 승인 필요
* **Full-auto (YOLO 모드)**: 파일 읽기·쓰기, 명령 실행 모두 자동 허용

  * 단, 네트워크 접근은 기본적으로 비활성화된 샌드박스 환경에서 실행됨 ([Medium][5], [Medium][6])
* 명령어 예시:

  ```bash
  codex --approval-mode full-auto "create the fanciest todo-list app"
  ```

  또는 축약형으로 `--yolo` 표현 가능 (비공식 표현) ([GitHub][7])

## 기능 요약

* **코드 기반 커밋/수정/테스트 실행**: 디펜던시 설치, 코드 실행 및 결과 반영까지 프로세스 자동화 ([npmjs.com][4], [apidog][8], [Medium][6], [Reddit][9])
* **멀티모달 입력 지원**: 스크린샷, 다이어그램 등 입력 가능 ([Medium][6], [apidog][8])
* **버전 관리 연동**: 기존 작업 디렉토리 내에서 git 기반 작업 + 변경사항 확인 ([Medium][6], [Reddit][9])
* **안전 모델**: sandbox·네트워크 비활성화로 시스템 노출 최소화 ([Medium][5], [apidog][8])

## OpenAI Codex 전체 생태계 내 위치

* **Codex CLI**는 로컬 터미널 중심 에이전트
* **Codex IDE 확장**: VSCode, Cursor, Windsurf 등 지원
* **Codex Cloud (웹 기반)**: GitHub PR, ChatGPT 내 프롬프트 기반 코드 작업 가능 ([OpenAI][10], [developers.openai.com][11])
* 배경 모델: GPT-5 추천 (CLI 기본), `codex-mini-latest` 같은 특화 모델 존재 ([Wikipedia][12], [developers.openai.com][1], [OpenAI][10])

---

## 요약 테이블

| 항목    | 설명                                                          |
| ----- | ----------------------------------------------------------- |
| 설치    | `npm install -g @openai/codex`, macOS는 `brew install codex` |
| 실행 방식 | `codex` (인터랙티브), `codex "프롬프트"` (일회성)                       |
| 승인 모드 | `suggest` (기본), `auto-edit`, `full-auto (--yolo)`           |
| 핵심 기능 | 코드 수정·실행 자동화, 디펜던시 설치, 테스트, VCS 통합                          |
| 안전 구조 | sandbox, 네트워크 차단 기본                                         |
| 확장 환경 | IDE 확장, Cloud 옵션 지원 (GitHub/ChatGPT 연동)                     |



[1]: https://developers.openai.com/codex/cli/?utm_source=chatgpt.com "Codex CLI"
[2]: https://www.npmjs.com/package/%40openai/codex?utm_source=chatgpt.com "OpenAI Codex CLI"
[3]: https://www.npmjs.com/package/%40openai/codex/v/0.1.2505172129?utm_source=chatgpt.com "OpenAI Codex CLI"
[4]: https://www.npmjs.com/package/%40openai/codex/v/0.1.2504172304?utm_source=chatgpt.com "OpenAI Codex CLI"
[5]: https://medium.com/%40Tensorboy/codex-double-your-dev-superpowers-with-openais-code-agents-74102f4f0199?utm_source=chatgpt.com "Openai Codex: The AI That Makes Cursor Obsolete"
[6]: https://houseofcoder.medium.com/codex-cli-coding-agent-by-openai-5fc7f2e2279b?utm_source=chatgpt.com "Codex CLI — A Coding Agent by OpenAI | by HouseOfCoder"
[7]: https://github.com/kky42/codex-as-mcp?utm_source=chatgpt.com "kky42/codex-as-mcp"
[8]: https://apidog.com/blog/openai-codex-cli/?utm_source=chatgpt.com "OpenAI Codex CLI: an Open Source Coding Agent in the ..."
[9]: https://www.reddit.com/r/singularity/comments/1k0qc67/openai_releases_codex_cli_an_ai_coding_assistant/?utm_source=chatgpt.com "OpenAI releases Codex CLI, an AI coding assistant built ..."
[10]: https://openai.com/codex/?utm_source=chatgpt.com "Codex"
[11]: https://developers.openai.com/codex/cloud/?utm_source=chatgpt.com "Codex cloud"
[12]: https://en.wikipedia.org/wiki/OpenAI_Codex?utm_source=chatgpt.com "OpenAI Codex"
