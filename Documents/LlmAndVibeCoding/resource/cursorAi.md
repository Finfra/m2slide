# Cursor AI

## link

* Cursor AI 고급 활용 가이드 (macOS) : https://finfra.kr/jg/2025/04/29/cursor-ai-코드-에디터-고급-활용-가이드-macos/
* MCP + Cursor AI 소개 : https://www.youtube.com/watch?v=t5Tj5_2uyTs
* 이거 하나면 Cursor AI가 완전히 달라진다고?! (개발자 필수) | Project Rules : https://www.youtube.com/watch?v=jdrloBg0Sbk

# Tip And trick

## AutoRun

* cmd+shift+del로 끊을 수도 있고, 중간에 쳇팅으로 진행 내역 수정하면서 병렬진행 가능.
* 

![[Pasted image 20250430235421.png]]

## AutoRun잘되기 위한 방법

1. docs를 잘 설정한다.
2. chatgpt를 통해서 개요 문서를 만들어서 붙여 놓고 시작한다.
3. Activate+CursorAI → ⌘Y → ⌘⏎ (메크로로 등록하면 좋음.)
4. ⌥⌘j(Terminal)은 가급적 안쓴다. (Context 유지를 위해 채팅창 사용 권장)
5. Rule을 잘 결정한다. 

# Cursor AI 무료 사용 기간 및 내용

## 무료 플랜(Hobby)

* **14일 Pro 체험 제공**
    - GPT-4/Claude 등의 프리미엄 모델 사용 가능
    - 체험 기간은 가입 후 자동 시작 (로그인 여부 무관)

## 포함된 무료 사용량

| 항목                       | 사용량 제한                          |
|----------------------------|--------------------------------------|
| 코드 자동완성 completions  | 2,000회                              |
| 느린 프리미엄 요청         | 50회 (slow premium requests)        |
| cursor-small 모델 요청     | 200회                                |
| 빠른 프리미엄 요청         | 250회 (fast premium requests, 14일간)|

## 기타 사항

* **요청 한도 초과 시**: 프리미엄 기능 제한 → Pro 플랜 전환 필요
* **사용량 초기화**: 매월 계정 생성일 기준으로 리셋됨
* **프리미엄 요청 종류**
    - Fast: 빠른 응답, 사용량 제한 큼
    - Slow: 느리지만 무료 사용량 다름

## 📊 무료 플랜 요약

🆓 **무료 플랜(Hobby) 구성**
* Pro 기능 14일 체험 제공
* 2000 코드 자동완성(completions)
* 50회 느린 프리미엄 요청(slow premium requests)
* 200회 cursor-small 모델 요청

14일 체험 기간은 계정 생성 시점부터 실시간으로 계산되며, 로그인하지 않아도 시간이 경과함.

⚠️ **사용량 제한 및 주의사항**
* 빠른 프리미엄 요청(fast premium requests): 14일 체험 기간 동안 250회로 제한됨.
* 요청 한도 초과 시: 프리미엄 모델 사용이 제한되며, Pro 플랜으로 업그레이드해야 계속 사용 가능함.
* 월간 사용량 초기화: 무료 플랜의 사용량은 매월 계정 생성일을 기준으로 초기화됨.

💡 **참고사항**
* 프리미엄 모델 예시: GPT-4, Claude 3.5 등.
* 빠른 요청(fast requests): 우선 처리되며, 빠른 응답을 제공함.
* 느린 요청(slow requests): 처리 속도가 느리지만, 사용량 제한이 다름.

## 참고 링크

* [공식 가격 페이지](https://www.cursor.com/pricing)
* [Pro 체험 안내](https://forum.cursor.com/t/pro-two-week-trial/5614)
* [요청 한도 초과 안내](https://forum.cursor.com/t/youve-reached-your-trial-request-limit/34473)
* [월간 리셋 정책](https://forum.cursor.com/t/what-happens-after-using-my-200-free-queries/15295)
# docs

## ✅ 예시: Docker Compose 문서 등록

| 필드                 | 값                                                |
| -------------------- | ------------------------------------------------- |
| **Prefix**     | `https://docs.docker.com/compose/`              |
| **Entrypoint** | `https://docs.docker.com/compose/compose-file/` |

## 📚 추천 링크 모음

### Docker

| 용도            | Prefix                                                    | Entrypoint                                                       |
| --------------- | --------------------------------------------------------- | ---------------------------------------------------------------- |
| Docker CLI      | `https://docs.docker.com/engine/reference/commandline/` | `https://docs.docker.com/engine/reference/commandline/docker/` |
| Dockerfile 문법 | `https://docs.docker.com/engine/reference/builder/`     | `https://docs.docker.com/engine/reference/builder/`            |
| Docker Compose  | `https://docs.docker.com/compose/`                      | `https://docs.docker.com/compose/compose-file/`                |

### Bash

| 용도        | Prefix                                        | Entrypoint                                             |
| ----------- | --------------------------------------------- | ------------------------------------------------------ |
| Bash 매뉴얼 | `https://www.gnu.org/software/bash/manual/` | `https://www.gnu.org/software/bash/manual/bash.html` |
| 명령어 참조 | `https://ss64.com/bash/`                    | `https://ss64.com/bash/`                             |

### Python

| 용도                 | Prefix                                   | Entrypoint                                         |
| -------------------- | ---------------------------------------- | -------------------------------------------------- |
| 표준 라이브러리      | `https://docs.python.org/3/library/`   | `https://docs.python.org/3/library/index.html`   |
| 문법 레퍼런스        | `https://docs.python.org/3/reference/` | `https://docs.python.org/3/reference/index.html` |
| Real Python 튜토리얼 | `https://realpython.com/`              | `https://realpython.com/`                        |
