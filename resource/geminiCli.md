# [Gemini](../Services/Gemini/Gemini.md) CLI 사용 가이드

## 개요
* **Google Gemini AI**를 터미널에서 사용하는 명령줄 도구
* **코딩**, **문서 요약**, **이미지 분석**, **질문 답변** 등 다양한 작업을 CLI 환경에서 실행 가능
* GitHub: [google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli)

## 주요 기능
* **터미널 통합**: 명령줄에서 Gemini 직접 호출
* **파일 처리**: 텍스트, 이미지, 코드 파일까지 분석
* **스트리밍 응답**: 실시간 답변 확인 가능
* **대화 유지**: 세션 히스토리 관리 가능
* **Batch 작업**: 여러 파일을 일괄로 처리 가능
* **멀티모달 지원**: 텍스트 + 이미지 입력 가능

## 설치 및 실행
### 일반 설치
```bash
npm install -g @google/gemini-cli
gemini  # 최초 실행 시 브라우저 로그인 필요
````

### 임시 실행

```bash
npx https://github.com/google-gemini/gemini-cli
```

### 서버 환경 (브라우저 없이)
* https://aistudio.google.com/ 에서 키 생성

```bash
export GEMINI_API_KEY="$(cat ~/.ssh/_token/googleAIStudio.token)"
npm install -g @google/gemini-cli
gemini  # 토큰 기반 인증
```

## 주요 명령어

| 명령어     | 설명        |
| ------- | --------- |
| `/help` | 명령어 목록 출력 |
| `/quit` | 대화 종료     |

## 설정 및 컨텍스트 구성

### 설정 계층 구조

| 수준    | 위치                             | 설명                 |
| ----- | ------------------------------ | ------------------ |
| 전역 설정 | `~/.gemini/GEMINI.md`          | 모든 프로젝트에 공통 적용     |
| 프로젝트별 | `./GEMINI.md`                  | 개별 프로젝트 설명 및 규칙 제공 |
| 디렉토리별 | `./src/components/GEMINI.md` 등 | 특정 모듈 전용 설정        |
### 정보(`GEMINI.md`)
* 코드, 명령어, 텍스트 생성 등 **반복적이고 범용적인 AI 활용 패턴**을 기록하는 나만의 'AI 명령어 사전'이라고 보면 됨.
* 예시
```
# Basic info
## Persona
* 나는 Computer Vision 연구자이며,  컴퓨터 사이언스 관련 강의와 컨설팅 일을 함.
* 강의 자료와 데이터 재처리 목적으로 사용함
* 프로그래밍, AI, LLM Fine Tuning, DevOps 관련 일을 함.
* AGI만드는 것이 최종 목표임.

## System Info
* OS : Mac OS or Docker
* python :Python 3.10.18
* node :v24.1.0
* npm :11.3.0
* npx :11.3.0
```
### Style Guide (`styleguide.md`)

- **생성 위치**: `.gemini/styleguide.md`
    
- **역할**: 코드 작성 스타일, 명명 규칙 정의
    
- **예시**:
   ```markdown
# Coding Guide 
* prd.md : PRD파일임
* rules.md : 코딩 Rule임.
* tasks.md : 각 작업후 tasks.md에 완료 표시 후 다음 테스크 진행

# Python Style Guide
* 변수명: `snake_case` ex) `user_name`
* 함수명: `snake_case` ex) `get_user_info`
* 클래스명: `PascalCase` ex) `UserModel`
* Docstring: Google 스타일 사용
```

### 구성 파일 (`config.yaml`)

- **ignore_patterns** 등으로 Gemini가 무시해야 할 파일 정의 가능
    
- **예시**:
```yaml
ignore_patterns:
  - "**/tests/**"
  - "**/build/**"
```

- `.aiexclude` 파일도 `.gitignore`처럼 사용 가능
    

## 예시: 프로젝트 세팅 흐름

```bash
#프로젝트 디렉토리 생성
mkdir my-app && cd my-app

#GEMINI.md 생성
vi GEMINI.md
#→ 프로젝트 개요, 목표 등 작성

#.gemini 디렉토리 생성
mkdir .gemini

#스타일 가이드 작성
vi .gemini/styleguide.md

#필요 시 구성 파일 작성
vi .gemini/config.yaml
```

## 여러 프로젝트 동시 실행 가능성

- `~/.gemini/`는 전역 설정 디렉토리로, **기본값 역할**
- 각 프로젝트 디렉토리에 `GEMINI.md`가 존재하면 해당 내용이 **우선 적용**
- 덕분에 **여러 프로젝트를 동시에 실행해도 각 프로젝트별 컨텍스트 유지 가능**
    

---
# vsCode에서 사용
## TERMINAL
* 터미널 모드에서 "gemini"라고 입력. 
* 한글 타이핑에 문제가 있어서 터미널 모드로 실행 권장. 
## Extension
* Gemini Code Assist설치 후 쳇팅 창에서 "Agent 모드 활성화."라고 하면 작동하나 아직 불안함.(2025.06.30)
# MCP 설정
* ~/.gemini/settings.json 에서 설정
* Example
```
{
  "theme": "Default",
  "selectedAuthType": "oauth-personal",
  "mcpServers": {
    "sequential-thinking": {
      "command": "/opt/homebrew/bin/npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-sequential-thinking",
        "start"
      ]
    }
  }
}
```

# 활용 분야
## 스크린샷 분석
* 강의 후 스크린샷에 대한 분석을 요청한다. 
* Simple버전
```
Day1폴더의 이미지들을 하나씩 하나씩 분석해서 설명을 day1.md에 추가해줘.

@day2.md에서 마지막 언급된 다음 파일부터 Day2에서 하나씩 하나씩 분석해서 설명을 day2.md에 추가해줘. (to Test when fail)
```
* Complex버전: 오히려 않됨. file에서 읽은 path는 이미지 분석 않되는 듯(2025.06.30)
```
imgs.yaml파일이 없으면, Day1폴더의 이미지들의 절대 path들을 imgs.yaml에 저장하고, imgs.yaml의 path 값을 하나 하나씩 읽어서 해당 파일명.md파일이 md/폴더에 있는지 확인하고 없으면, path의 이미지를 읽어서 무슨 내용인지 분석하여 설명을 md폴더에 같은 이름의 md파일로 저장해줘.
```
## 크롤링
* PlayWright가 되면 대량의 크롤링도 가능
### Prompt
* 1. 어떻게든 gemini cli로 크롤링. playWright 활용
* 2. GEMINI.md파일 생성
```
지금까지의 크롤링한 과정에 대한 정보를 현재 폴더의 GEMINI.md에 저장.
```
* 2. prd파일 생성
```
잘되는 군. 
지금까지 크롤링한 절차를 node.js로 구현하게 코딩을 할꺼야. prd.md와 tasks.md와 rules.md를 만들어줘. curl이나 웹드라이브는 쓰지 않고, playwright 페키지 사용.
크롤링할 페이지는 target.txt에 저장되어 있고 한줄 한줄 url임. 그리고 현재는 모든 "육아 일기"를 가져왔지만, 모든 카테고리를 가져오도록 하고, 폴더 구조도 posts폴더 아래에 블로그 영문명이 들어오고 그 아래에 category들이 들어오고, category폴더 밑에 각 포스트에 해당하는 md파일이 저장되는 파일앞에는 끝에는 날짜도 들어가게 해줘. 
```

## 활용 테스트
* gemini cli Test : 현재 너무 많이 사용해서 Block당함(60%대였음. )
     - /Users/nowage/Desktop/pwCrawling_geminiCli
     - /Users/nowage/Desktop/imgsToMd
     - fg1:/home/nowage/imgsToMd

# Tip
## tmux가 된다!
* 서버에서도 동작하고 tmux가 된다. 아주 긴 명령도 가능하다.
## GEMINI.md 활용
* 중간 중간에 프로젝트폴더 혹은 ~/.gemini/있는 파일을 업데이트 해달라고 하면 프로젝트 종료 후에 프로젝트 경험을 남겨서 활용할 수 있음. 
## Prompt
* Project시작. 
```
현재 폴더에 ~을 만들기 위한 prd.md파일과 tasks.md와 rules.md 파일 만들어줘. 단, rules.md파일은 앱의 작동 rule이 아닌 현재 툴이 코딩을 어떻게 적용할지에 관한 rule이다. 예를 들면, rules.md에는 "*[ ]  코드 생성 후에는 코드가 제대로 작동하는지 테스트"같은 문장이 들어와야 함.
```

* GEMINI.md 업데이트
```
현재 폴더에 GEMINI.md 파일 만들어서 현재 까지 작업 했던 내용중에 자주 쓰일 것 같은 것은 정리해서 저장해줘.

```


## Ubuntu22.04버전 설치

### 1. 키 받기
* https://aistudio.google.com/
### 2. node 설치
* node버전 낮음 주의
```
sudo apt remove -y nodejs libnode-dev npm
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -

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

```
### 3. gemini설치
```
sudo npm install -g @google/gemini-cli
```

### 4. 키 설정
```
export GEMINI_API_KEY="ㄱㄱㄱㄱ"
```

### 5. gemini실행
```
gemini
```

# 링크 모음

- [Google AI Studio](https://aistudio.google.com/)
- [Gemini API 문서](https://ai.google.dev/gemini-api/docs)    
- [Gemini CLI GitHub](https://github.com/google/generative-ai-cli)
    

