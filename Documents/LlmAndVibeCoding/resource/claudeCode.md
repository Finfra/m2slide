# Claude Code
## {inbox}
* "#" : 입력하면 Memory에 저장됨. 단, CLAUDE.md와는 별개임. 
* "/" : command
* "@" : path
* "!" : shell
## Info
* Home : https://docs.anthropic.com/en/docs/claude-code
* 클로드 코드 설치 5분 컷! | VS 코드, 커서 AI 통합 사용법 : https://www.youtube.com/watch?v=J0IWxZXczxs&t=241s
## 개요
* Anthropic에서 개발한 아젠틱 명령줄 도구
* 터미널에서 직접 Claude AI에게 코딩 작업 위임 가능
* Research Preview 단계
## 장점
* 병렬작업 활용
* 서버에서 작업 : 터미널 워크플로우에 자연스럽게 통합
* VS Code 확장 없이도 AI 코딩 가능
* 프로젝트 전체 컨텍스트 활용

## 주요 기능
* **터미널 기반 AI 코딩**: 명령줄에서 직접 코드 생성/수정 요청
* **파일 시스템 접근**: 프로젝트 파일 직접 읽기/쓰기 가능
* **컨텍스트 인식**: 전체 프로젝트 구조 이해
* **실시간 협업**: 개발자와 Claude가 실시간으로 코드 작업

## 주요 요소
* [Agents](claude-code_agent.md)      - 다양한 개발 작업을 위한 AI 에이전트
* Commands    - 프레임워크별 최적화된 명령어
* MCPs        - Model Context Protocol 서버
* Templates   - Agents+Commands+MCPs)

## Install
```
sudo npm install -g @anthropic-ai/claude-code
```
### npm install -g 실행 시 권한 오류가 나면,
1. mkdir -p ~/.npm-global
2. npm config set prefix '~/.npm-global'
3. export PATH=~/.npm-global/bin:$PATH 
4. 터미널 재시작 후 다시 설치
### ubuntu24.04 Claude Code install
```
#node install
sudo apt remove -y nodejs libnode-dev npm
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -

sudo apt remove -y nodejs npm node
sudo apt remove -y libnode-dev
sudo apt autoremove -y
sudo apt autoclean

# 잔여 설정 제거
sudo rm -rf /usr/local/lib/node_modules
sudo rm -rf /usr/local/bin/npm
sudo rm -rf /usr/local/bin/node

sudo apt update -y
sudo apt autoremove -y
sudo apt clean
sudo apt install -y nodejs
node -v
npm -v

#claudeCode install
sudo npm install -g @anthropic-ai/claude-code
#superClaude install
sudo pip install --break-system-packages SuperClaude
SuperClaude install 
```

# Usage

## 기본 명령어

- `claude-code` - 현재 디렉토리에서 Claude Code 실행
- `claude-code --help` - 도움말 확인
## 활용 
- `claude "xx"` - Interactive Mode (Default)
- `claude -p "xx"` - Print mode (Headless)
- `claude -p --output-format json "hi"` - Print mode (Headless) with JSON output
- `claude -p "/exit" --dangerously-skip-permissions` - Yolo Mode (권한 확인 건너뛰기)
- `cat x.json | claude "xxx"` - 파이프 입력 처리
    - ex) echo "Hello World" | claude -p "한국어로 번역해줘(번역문만)"
- `claude --continue` - 이전 대화 이어가기
- `claude --resume` - 중단된 작업 재개
- `claude --model sonnet` - 특정 모델 지정 실행


# Memory
* CLAUDE.md 하위 폴더에서도 지정 가능. 
* ./CLAUDE.local.md : github ignore전용 
* `claude-code --version` - 버전 확인
# Commands
* `/init` - 코드베이스 문서용 `CLAUDE.md` 초기화
* `/help` - 도움말 및 사용 가능한 명령어 보기
* `/clear` - 대화 기록 삭제 및 컨텍스트 초기화
* `/compact` - 대화 기록 정리하고 요약만 유지 (옵션: `/compact [요약 지시문]`)
* `/memory` - Claude 메모리 파일 편집("#으로 직접추가 가능")
* `/output-style` - 출력 스타일을 직접 설정하거나 선택 메뉴에서 설정
    * 기본
        * Default
        * Explanatory : 중간 중간 Insight넣어줌 
        * Learning : 나의 역할과 claude역할 분리해서 배울 수 있는 기회를 줌. 
    * 추가 가능 : /output-style:new Markdown 스타일
* `/statusline` - colorful emoji with current folder  # zsh필요
* `/config` - 설정 패널 열기
* `/status` - 버전, 모델, 계정, API 연결, 도구 상태 포함한 전체 상태 보기
* `/permissions` - 도구 권한 허용/차단 규칙 관리
* `/review` - Pull Request 리뷰 수행
* `/pr-comments` - GitHub Pull Request의 코멘트 가져오기
* `/mcp` - MCP 서버 관리
* `/agents` - Subagent 관리
* `/bashes` - 백그라운드에서 실행 중인 bash 셸 나열 및 관리
* `/doctor` - Claude Code 설치 상태 점검

* `/add-dir` - 새 작업 디렉터리 추가
* `/bug` - Claude Code 관련 피드백 제출
* `/cost` - 현재 세션의 총 비용 및 시간 확인
* `/exit` - REPL 종료
* `/hooks` - 도구 이벤트에 대한 훅 구성 관리
* `/ide` - IDE 연동 관리 및 상태 보기
* `/install-github-app` - Claude GitHub Actions를 레포지토리에 설치
* `/login` - Anthropic 계정으로 로그인
* `/logout` - Anthropic 계정에서 로그아웃
* `/migrate-installer` - 글로벌 npm 설치에서 로컬 설치로 마이그레이션
* `/model` - Claude Code의 AI 모델 설정
* `/release-notes` - 릴리스 노트 보기
* `/resume` - 이전 대화 이어서 진행
* `/terminal-setup` - `Shift+Enter`를 줄바꿈으로 설정
* `/upgrade` - Max 요금제로 업그레이드 (Opus 모델 등 사용 가능)
* `/vim` - Vim 모드와 일반 모드 전환
## Custom Command 
* ~/.claude/commands에 md파일로 저장.
* $ARGUMENT 가능
* Scope조절 가능(User,Project)

* 설정 예
```
  ~ $ cat ~/.claude/commands/docker-ps.md
docker ps명령으로 실행 중인 컨테이너 목록을 확인
```

* 결과 예
```
> /docker-ps
⏺ I'll help you with Docker commands. Let me run docker ps to
  show currently running containers.
⏺ Bash(docker ps)
  ⎿ CONTAINER ID   IMAGE              COMMAND                   C
    REATED        STATUS         PORTS
                  NAMES
    … +6 lines (ctrl+r to expand)
⏺ You have 2 running containers:
  - wp1: WordPress container on ports 8080 (HTTP) and 8443
  (HTTPS)
  - wpDb1: MariaDB database container on port 3307
```
## search-web

웹 검색 관련 명령어 및 도구들
## hooks
* example code : ~/.bin/claude_hook_noti.sh
### Hook Event 타입별 상세 설명

#### 1. PreToolUse - Before tool execution
도구 실행 직전에 트리거되는 훅
* **실행 시점**
    - MCP 서버의 도구 함수 호출 직전
    - 매개변수 검증 및 전처리 가능
    - 권한 확인 및 로깅 수행
* **활용 사례**
    - 보안 검증 (파일 접근 권한 체크)
    - 입력값 유효성 검사
    - 사용량 추적 및 제한
    - 디버깅 로그 기록
    
#### 2. PostToolUse - After tool execution
도구 실행 완료 후 트리거되는 훅
* **실행 시점**
    - 도구 함수 실행 완료 후
    - 결과값 후처리 가능
    - 성공/실패 상태 기록
* **활용 사례**
    - 실행 결과 로깅
    - 성능 메트릭 수집
    - 캐시 업데이트
    - 알림 전송 트리거


#### 3. Notification - When notifications are sent
알림 전송 시 트리거되는 훅
* **실행 시점**
    - 시스템에서 알림을 보낼 때
    - 사용자 정의 알림 채널 추가 가능
    - 알림 내용 필터링/변환
* **활용 사례**
    - Slack/Discord 봇 연동
    - 이메일 알림 전송
    - 모바일 푸시 알림
    - 로그 파일 기록


#### 4. Stop - Right before Claude concludes its response
Claude 응답 완료 직전에 트리거되는 훅
* **실행 시점**
    - 모든 처리 완료 후
    - 최종 응답 생성 직전
    - 세션 정리 작업 수행
* **활용 사례**
    - 세션 데이터 저장
    - 리소스 정리
    - 응답 품질 검증
    - 사용 통계 업데이트


#### 5. SubagentStop - Right before a subagent concludes its response
서브에이전트(Task 도구 호출) 응답 완료 직전에 트리거되는 훅
* **실행 시점**
    - Task 도구를 통한 서브에이전트 작업 완료 후
    - 다중 에이전트 워크플로우에서 활용
    - 계층적 작업 추적
* **활용 사례**
    - 서브태스크 완료 알림
    - 워크플로우 상태 추적
    - 에이전트 간 데이터 전달
    - 병렬 작업 동기화

### Hook 설정 및 관리
#### MCP 서버 설정
* **hook 등록 방법**
    - `claude_desktop_config.json`에서 hook 설정
    - 각 MCP 서버별 개별 hook 구성
    - 전역 hook vs 서버별 hook
#### Hook 체인
* **다중 hook 실행**
    - 우선순위 기반 실행
    - 조건부 hook 활성화
    - hook 간 데이터 전달
#### 디버깅 및 모니터링

* **Hook 로깅**
    - 실행 시간 측정
    - 에러 추적 및 복구
    - 성능 병목 지점 분석

# MCP
* https://docs.anthropic.com/en/docs/claude-code/mcp
## Add from Desktop
* 해당 폴더에서 진행
```
claude mcp add-from-claude-desktop 
```
## Add from json string

* claude mep add-json mcp명칭 '제이슨구문'
* example 
```
  ~/tmp/test $ claude mcp add-json context7 '{
      "command": "npx",
      "args": [
        "-y",
        "@upstash/context7-mcp"
      ]
    }'
Added stdio MCP server context7 to local config
```

## `claude mcp remove`
    - **Claude MCP 구성 요소 제거**: Claude MCP 관련 모든 설정 및 파일을 삭제.

# Subagents

## 에이전트 타입
* **Personal Agents**: `~/.claude/agents/` (전역 사용)
* **Project Agents**: `.claude/agents/` (프로젝트 전용)
* **Built-in Agents**: 기본 제공 (general-purpose, statusline-setup)

## 에이전트 파일 구조
```yaml
---
name: agent-name
description: 설명
model: sonnet    # haiku, opus
color: purple
---
에이전트 역할 설명
```

## 주요 명령어
```bash
# 에이전트 목록 확인
> /agents

# 에이전트 호출
> @agent-bash-developer 스크립트 작성해줘
```

## 생성예 
### 생성 
1. /agents
2. ❯ Create new agent
3. Step 1: 1. Project (.claude/agents/)
4. Step 2: 1. Generate with Claude (recommended)
5. Step 3: Describe what~ 
```
name: vaca-oper
description:
   파일 읽어서 해당 파일에 대한 json파일 생성. 단, 각 단어는 아래 5개
  컬럼으로 구성, 코드없이. 최대한 빨리:
  - 단어
  - 한국어 뜻
  - 발음
  - 예문
  - 어원(암기용)
```
6. Step 4: [ Continue ]
7. Step 5: 1.Sonet
8. Step 6: Choose background color




## 실전 활용
### 병렬실행 
* claude-flow init하고 구현해면 swarm모드로 작동됨. 
```
word라는 폴더에 a.txt부터 z.txt까지 자주 쓰는 단어 만들어줘. 

@agent-vaca-oper word/a.txt 읽어서 result/a.json으로 만들어줘.

방금 했던 작업을 병렬 진행으로 word폴더의 모든 txt파일에대해 적용할 수 있을까? subagent는 10개 까지 spawn.

result폴더의 a.json부터 z.json까지 all.json만들고 이를 기준으로 all.csv만들어줘. 단, 이때는 합치고 변환하는 스크립트를 만들어서 해결해줘. node.js사용

```

### Personal Agent 생성
```bash
mkdir -p ~/.claude/agents/
vi ~/.claude/agents/python-developer.md
```

### Project Agent 생성
```bash
mkdir -p .claude/agents/
vi .claude/agents/project-worker.md
```

### Agnet 생성 구문
#### Example : mgr 
* 아직은 불안함 아래 프롬프트가 더 잘 작동함. 
    "서브 에이전트 md2ppt-oper로 현재 폴더 모든 파일 변환해줘. 병렬진행."
```
/Users/nowage/.claude/agents/md2ppt-oper.md 양식 참고해서 아래와 같는 서브에이전트 만들어줘.
* name: md2ppt-mgr
* what: @agent-md2ppt-oper를 실행하는 Manager agent임
* process: 
  **1단계**: Glob 도구로 대상 디렉터리 내 "*.md" 모든 마크다운 파일 검색  
  **2단계**: 발견된 각 마크다운 파일마다 즉시 Task 도구 호출을 생성합니다:  
    - subagent_type: "md2ppt-oper"  
    - description: "[파일명]을(를) PPT로 변환"  
    - prompt: "[파일 경로] 변환"
  **3단계**: 모든 하위 에이전트 작업 완료 및 결과 보고 대기
* rule:
  - md2ppt-oper는 claude code subagent임.
  - md2ppt-oper가 없으면 작동안함. 
  - 병렬진행(Max spawn:20)
  - 파일의 contents는 직접 읽지 않음.
```
### 자주 쓰는 프롬프트
```bash
# CLAUDE.md 기반 에이전트 생성
> CLAUDE.md 파일 확인해서 .claude/agents/{에이전트명}.md 만들어줘

# 프로젝트 에이전트 세트 생성
> 이 프로젝트에 필요한 에이전트들 .claude/agents/에 만들어줘

# 멀티 에이전트 협업
> @agent-architect 시스템 설계해줘
> @agent-python-developer 설계대로 구현해줘
```

## 모델 선택
| 모델     | 용도             |
| ------ | -------------- |
| sonnet | 균형잡힌 일반 개발     |
| haiku  | 간단한 작업, 빠른 응답  |
| opus   | 복잡한 로직, 대규모 작업 |

## 베스트 프랙티스
* 네이밍: `kebab-case` (ex: python-developer)
* 프로젝트별 독립 에이전트로 관리
* CLAUDE.md와 연동하여 프로젝트 규칙 반영
* 작업 흐름별 에이전트 체인 활용
# References 
## claude --help
```
Usage: claude [options] [command] [prompt]

Claude Code - starts an interactive session by default, use -p/--print for non-interactive output

Arguments:
  prompt
Options:
  -d, --debug [filter]                              디버그 모드 활성화 (옵션으로 카테고리 필터 지정 가능, 예: "api,hooks" 또는 "!statsig,!file")
  --verbose                                         설정 파일의 상세 모드 설정을 무시하고 상세 모드 활성화
  -p, --print                                       응답을 출력하고 종료 (파이프 사용 시 유용)
  --output-format <format>                          출력 형식 지정 (--print와 함께만 작동): "text"(기본값), "json"(단일 결과), 또는 "stream-json"(실시간 스트리밍) (선택 가능: "text", "json", "stream-json")
  --input-format <format>                           입력 형식 지정 (--print와 함께만 작동): "text"(기본값), 또는 "stream-json"(실시간 스트리밍 입력) (선택 가능: "text", "stream-json")
  --mcp-debug                                       [더 이상 사용되지 않음. 대신 --debug 사용] MCP 디버그 모드 활성화 (MCP 서버 오류 표시)
  --dangerously-skip-permissions                    모든 권한 검사를 우회. 인터넷 접속이 없는 샌드박스 환경에서만 권장.
  --replay-user-messages                            표준 입력으로 받은 사용자 메시지를 다시 표준 출력으로 출력하여 확인 (오직 --input-format=stream-json 및 --output-format=stream-json 옵션과 함께 사용 가능)
  --allowedTools, --allowed-tools <tools...>        허용할 도구 이름의 쉼표 또는 공백 구분 목록 (예: "Bash(git:*) Edit")
  --disallowedTools, --disallowed-tools <tools...>  거부할 도구 이름의 쉼표 또는 공백 구분 목록 (예: "Bash(git:*) Edit")
  --mcp-config <configs...>                         JSON 파일 또는 문자열로부터 MCP 서버 구성 로드 (공백 구분)
  --append-system-prompt <prompt>                   기본 시스템 프롬프트에 추가 시스템 프롬프트 덧붙이기
  --permission-mode <mode>                          세션에 사용할 권한 모드 지정 (선택 가능: "acceptEdits", "bypassPermissions", "default", "plan")
  -c, --continue                                    가장 최근 대화 이어서 계속하기
  -r, --resume [sessionId]                          대화 이어서 하기 - 세션 ID 제공 또는 대화 목록에서 대화 선택 가능
  --model <model>                                   현재 세션에 사용할 모델 지정. 최신 모델 별칭(예: 'sonnet' 또는 'opus') 또는 모델 전체 이름(예: 'claude-sonnet-4-20250514') 사용 가능.
  --fallback-model <model>                          기본 모델이 과부하일 때 자동으로 지정한 모델로 대체 활성화 (--print와 함께만 작동)
  --settings <file-or-json>                         추가 설정을 불러올 설정 JSON 파일 경로나 JSON 문자열
  --add-dir <directories...>                        도구 접근이 허용된 추가 디렉터리 목록
  --ide                                             시작 시 정확히 하나의 유효한 IDE가 있으면 자동으로 IDE에 연결
  --strict-mcp-config                               --mcp-config로 지정한 MCP 서버만 사용하고 다른 MCP 설정 무시
  --session-id <uuid>                               대화에 특정 세션 ID 사용 (유효한 UUID여야 함)
  -v, --version                                     버전 번호 출력
  -h, --help                                        명령어 도움말 표시

Commands:
  config                                            설정 관리 (예: claude config set -g theme dark)
  mcp                                               MCP 서버 구성 및 관리
  migrate-installer                                 전역 npm 설치에서 로컬 설치로 이전
  setup-token                                       장기 인증 토큰 설정 (Claude 구독 필요)
  doctor                                            Claude Code 자동 업데이트 상태 점검
  update                                            업데이트 확인 및 가능 시 설치
  install [options] [target]                        Claude Code 네이티브 빌드 설치. [target]으로 버전 지정 가능 (stable, latest, 특정 버전)
```
# Tip
## VS Code 통합 사용법

### 기본 단축키
* `Shift + Tab` - Claude Code 패널 토글
* `/` - 명령어 입력 시작
* `#` - 파일 참조
* `esc` 
    - Interrupt(resume=keep going)
    - 실행중이 아닐때 두번 누르면 History 선택
* Windows에서는 WSL extension 설치해서 사용
* git tree기능 연동 가능.
* cmd+opt+k : 현재 파일 참조(/ide command로 연결 필요)
## mgr세션 활용
* tmux 세션으로 시작된 claude code에 명령을 전달하는 tmux claude code 세션 활용하면 좋음. 
* 단, mgr세션에서는 agent사용하면 않됨.
![](../../../../data/img/ClaudeCode-2025.08.13.15.08.55.png)
