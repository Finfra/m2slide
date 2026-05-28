---
title: "Agentic Coding — Part1"
subtitle: "도입·환경·하네스·SCAR·nPTiR"
type: ppt
release_date: 2026-05-27
---

# 강의 시작 — 인사·강사 소개



* 강사 남중구 (핀프라)
  * 보조강사 : 환경 구성 오류 1차 응답·실습 도우미 역할
* Q&A는 각 섹션 끝·쉬는 시간에 분산 운영
* 본 강의 자료는 계속 업데이트되는 다이나믹 자료 입니다
  * 현재 기준 : Claude Model Sonnet 4.6 or Opus 4.7

---

# 강의 목표·4시간 흐름 미리보기

목표1: 바이브 코딩 vs Agentic Coding 차이 이해

목표2: Claude Code 하네스 직접 셋업

목표3: 미니 프로젝트로 웹서비스 MVP 완성

흐름: Part1 이론·실습 1.5h → 휴식 → Part2 미니 프로젝트 2.5h

![강의 목표·4시간 흐름 미리보기](./img/AgenticCoding_v10_0.png)

---

#layout-_chapter

# Agentic Coding — Part1

도입·환경·하네스·SCAR·nPTiR

---

# 강의 범위·비포함

✅ 다룸: Agentic Coding · 하네스 · Claude Code · SCAR · nPTiR · 미니 프로젝트

❌ 다루지 않음: LLM 일반 이론 / 멀티미디어 생성 / HWP 자동화

사전 설치 가정: Node.js / VsCode / Docker / Git for Windows

---

# 바이브 코딩(Vibe Coding)이란?

![바이브 코딩(Vibe Coding)이란?](./img/AgenticCoding_v10_1.png)

정의: 자연어 대화 기반 즉흥 개발 — 즉각 결과·낮은 진입장벽

한계: 휘발성·재현 불가·맥락 단기 기억 — 1회용 코드에 적합

Andrej Karpathy의 “Vibe Coding” 개념 (2025) 인용

비유: “스케치하듯 즉흥적으로 그리는 코딩”

---

# 프롬프트 엔지니어링이란?

정의: 단발 LLM 요청을 정교화하는 기술 (역할·맥락·제약·예시 4요소)

페르소나(Persona)·6대 기본 요소: 지시·맥락·페르소나·제약·예시·출력형식

한계: 단발성·재사용 어려움 — Agentic 코딩의 일부일 뿐 전부가 아님

Agentic 맥락 재해석: 프롬프트는 SCAR의 Skill·Rule에 흡수되어 재사용 가능해짐

![프롬프트 엔지니어링이란?](./img/AgenticCoding_v10_2.png)

---

# 하네스(Harness)란?

정의: 반복·재현 가능한 Agentic 작업 환경 (도구 + 규칙 + 맥락 + 자동화 후크)

구성: SCAR (Skill/Command/Agent/Rule) + 설정파일(CLAUDE.md/settings.json) + Hook

비유: “신입 개발자에게 사규·매뉴얼·체크리스트를 갖춰주는 작업장”

실습에서 셋업할 하네스 = ~/.claude/ 글로벌 + 프로젝트별 .claude/

![하네스(Harness)란?](./img/AgenticCoding_v10_3.png)

---

# Agentic Engineering이란?

정의: ’Agentic 코드’의 휘발성을 극복하고 장기 유지보수·확장을 가능하게 하는 패러다임

핵심 원칙: 격리(Git·Docker)·재현성(설정파일)·검증(test·review)·문서화(PRD/tasks)

바이브 코딩 vs Agentic Engineering: 1회용 vs 지속 가능

이 강의의 방향성 — ‘도구 사용법’이 아니라 ’엔지니어링 사고’

---

# 4가지 개념 한눈에 비교표

![4가지 개념 한눈에 비교표](./img/AgenticCoding_v10_4.png)

4분면: 바이브 코딩 / 프롬프트 엔지니어링 / 하네스 / Agentic Engineering

비교축: 입력·출력·재현성·확장성·유지보수성

우리가 목표하는 위치: Agentic Engineering (4사분면 우상단)

“프롬프트 엔지니어링은 입문, Agentic Engineering은 졸업”

---

# Agentic Coding의 흐름

1턴 사이클: 사용자 의도 → Plan → Tool 실행(Bash·Edit·Read) → 검증

1턴 평균 시간: 5~30초 (모델·도구 따라 변동)

자율 반복 루프 vs 단발 프롬프트 차이

Part2 실습에서 직접 체험할 흐름

![Agentic Coding의 흐름](./img/AgenticCoding_v10_5.png)

---

# Agentic Engineering의 필요성

문제: ‘뚝딱 개발’ → 다음날 같은 작업 재현 불가, 다른 맥락에서 깨짐

해법: SCAR로 능력·규칙 외재화, Git/Docker로 격리, PRD/tasks로 의도 보존

비용: 초기 셋업 1~2일 vs 장기 유지보수 절감 N개월

도구 사용법이 아닌 엔지니어링 사고를 배우는 이유

---

# 사전 설치 환경 점검



* 점검 명령:
              * node -vcode --version docker --versiongit --version
* 모두 출력되면 통과. 오류 시 보조강사에게 손들기
* 권한 테스트: docker ps (Desktop 실행 여부 확인)
* VsCode 확장: Claude Code, GitLens (선택)
* 🖥️ 점검 시연

---

# VsCode기반 ClaudeCode환경 구축.

확장 설치: Ctrl+Shift+X → “Claude Code” 검색 → Install

로그인: 설치 후 사이드바 Claude 아이콘 클릭 → 브라우저 인증 (claude.ai 계정) 또는 API Key 입력

실행: 사이드바 채팅창 진입 or VsCode 터미널에서 claude 명령

확인: 채팅창에 “안녕” 입력 → 응답 수신 시 환경 구성 완료

터미널 병행: claude CLI와 VsCode 확장은 동일 설정 공유

![VsCode기반 ClaudeCode환경 구축.](./img/AgenticCoding_v10_6.png)

---

# Node·VsCode·Git·Docker 한눈에 보기

Node.js: Claude Code CLI 실행 런타임 (≥ 18.x)

VsCode: 편집기 + Claude Code 확장 진입점

Git: 변경 격리·롤백·기록 (Agentic 안전망)

Docker: 실행 격리·재현 환경 (Agentic 샌드박스)

![Node·VsCode·Git·Docker 한눈에 보기](./img/AgenticCoding_v10_7.png)

---

# Markdown이란?

John Gruber가 2005년 개발. 텍스트로 저장되어 용량이 적고 버전관리 용이함.

![Markdown이란?](./img/AgenticCoding_v10_8.png)

---

# Markdown Rendering

![Markdown Rendering](./img/AgenticCoding_v10_9.png)

---

# PRD, tasks, CLAUDE.md 작성 기반

이 강의에서 작성할 모든 문서: Markdown 기반   PRD.md / tasks.md / CLAUDE.md / Issue.md

핵심 문법 5종: Header(#) / List(*,-) / Code(```) / Link / Bold(**)

LLM이 Markdown을 좋아하는 이유: 구조화된 입력 → 정확한 파싱

도구: VsCode 미리보기 (Ctrl+Shift+V)

---

# Docker혁명: 무거운 가상머신(VM)을 넘어서다!

내 컴퓨터에서 되는 코드는, 전 세계 으느 서버에서도 똑같이 돌아간다.

![Docker혁명: 무거운 가상머신(VM)을 넘어서다!](./img/AgenticCoding_v10_10.png)

---

# Docker가 Agentic에 각광받는 이유

샌드박스: 컨테이너 안에서만 명령 실행 → 호스트 PC 안전

재현: Dockerfile 로 동일 환경 재구성 — 다른 PC에서도 작동

일회성: docker run --rm 으로 실행 후 삭제 — 흔적 없음

비유: “내 PC를 더럽히지 않는 임시 작업실”

![Docker가 Agentic에 각광받는 이유](./img/AgenticCoding_v10_11.png)

---

# Docker 핵식 라이프사이클

"claudeCode로 실행가능!"

![Docker 핵식 라이프사이클](./img/AgenticCoding_v10_12.png)

---

# 리눅스 명령어 빠르게 보기

docker run -it ubuntu bash

Claude Code는 Bash 도구로 OS 명령 실행 — 명령어 1줄 읽기 능력 필요

핵심 5종: ls / **cd** / cat / grep / find

절대경로 vs 상대경로 (/Users/... vs ./...)

Windows에서: Git Bash 또는 WSL 사용 (Git for Windows에 포함)

![리눅스 명령어 빠르게 보기](./img/AgenticCoding_v10_13.png)

---

# Git이 Agentic에 각광받는 이유

격리: git worktree 로 에이전트 작업을 별도 디렉토리에 분리

롤백: 자동 변경이 망가지면 git reset --hard 1초 복구

기록: 누가·언제·왜 바꿨는지 추적 (commit 메시지 + 해시)

협업: Pull Request 단위 코드 리뷰 — Agentic 산출물도 동일 흐름

![Git이 Agentic에 각광받는 이유](./img/AgenticCoding_v10_14.png)

---

# (시연) Claude Code로 Node 스크립트 1줄 실행



* hello.js 만들고 console.log 한 줄 추가해서 실행해줘
* Claude가 Edit 도구로 파일 생성 → Bash로 node hello.js 실행
    * 1턴에 파일 작성·실행·결과 확인까지 완료

---

# (시연) Claude Code로 Git 커밋·롤백



* 이 변경 커밋해줘
* 어 잘못했네, 직전 커밋으로 되돌려줘
* git add/git commit → git reset 자동 실행
  * Agentic 자율 실행에서도 망가지면 1초 복구

---

# (시연) Claude Code로 Docker 명령 안전 실행



    * node:22 컨테이너에서 hello.js 실행해줘
    * docker run --rm node:22 node -e "..." 자동 구성
* ( 호스트 PC에 흔적 없음 — 컨테이너 종료 시 삭제)
* 🖥️ 시연

---

# Claude Code란?

Anthropic 공식 CLI 기반 Agentic 코딩 도구 (Claude.ai/code)

위치: 터미널·VsCode·웹앱·IDE 확장 (이 강의에서는 VsCode 확장 사용)

모델: Opus 4.7 / Sonnet 4.6 / Haiku 4.5 선택 가능

Claude Code를 사용하는 이유: SCAR·하네스·nPTiR 친화도

---

# 다른 에이전트와의 차이 (Cursor·Copilot 비교)

GitHub Copilot: 자동완성 중심 — 1줄 보조

Cursor: 편집기 통합 채팅 — 파일 단위 편집

Claude Code: CLI + 멀티 도구 (Bash·Edit·WebFetch) — 전체 작업 자율

전체 작업 자율이 필요한 실무 시나리오에 최적

![다른 에이전트와의 차이 (Cursor·Copilot 비교)](./img/AgenticCoding_v10_15.png)

---

# Claude Code 환경설정 — ~/.claude/ 구조

글로벌 설정: ~/.claude/ (모든 프로젝트 공통)

프로젝트 설정: {프로젝트}/.claude/ (해당 프로젝트만)

우선순위: 프로젝트 > 글로벌 (덮어쓰기)

핵심 디렉토리: commands/ skills/ agents/ rules/ settings.json CLAUDE.md

---

# CLAUDE.md / settings.json 역할

CLAUDE.md: 프로젝트 컨텍스트·규칙 (LLM이 매 턴 자동 로드)

settings.json: 권한·모델·환경변수·hook (CLI 동작 제어)

작성 팁: CLAUDE.md는 200줄 이내 권장 (컨텍스트 절약)

Part2에서 /init 명령으로 자동 생성

---

# Claude CLI 모델 정책 (Opus / Sonnet / Haiku)

Opus 4.7: 설계·복잡 추론 (느림·비쌈) — Plan·아키텍처 단계

Sonnet 4.6: 구현·반복 (빠름·중간) — 일반 작업

Haiku 4.5: subagent·간단 작업 (매우 빠름·쌈) — 보조 호출

Blueprint(Opus)+Execute(Sonnet) 패턴 권장

![Claude CLI 모델 정책 (Opus / Sonnet / Haiku)](./img/AgenticCoding_v10_16.png)

---

# 슬래시 커맨드 자주 쓰는 5종

| 커맨드 | 역할 |
| :-: | :-: |
| /init | CLAUDE.md 신규 생성 |
| /clear | 컨텍스트 초기화 |
| /review | 코드 리뷰 |
| /cost | 사용량·요금 확인 |
| /help | 전체 커맨드 목록 |

---

# 하네스 정의·구성요소 (재정리)

정의 복습: 도구 + 규칙 + 맥락 + 자동화 후크

4계층 매핑: Tools(Bash/Edit) / Rules(rules/) / Memory(CLAUDE.md) / Hooks(settings.json)

이번 실습 셋업 목표: SCAR 1세트 + nPTiR 사이클 1회 동작

글로벌 하네스 예시: ~/.claude/ 200+ 파일 (참고용)

![하네스 정의·구성요소 (재정리)](./img/AgenticCoding_v10_17.png)

---

# 하네스 없이 vs 있을 때 비교

![하네스 없이 vs 있을 때 비교](./img/AgenticCoding_v10_18.png)

---

# (시연) 빈 디렉토리에서 Claude Code 시작

/init

디렉토리 구조 스캔 → 핵심 정보 추출 → CLAUDE.md 자동 작성

Part2 미니 프로젝트 시작 시 동일하게 사용

🖥️ 시연 (빈 디렉토리 → CLAUDE.md 생성 화면)

---

# SCAR 4요소 (Skill / Command / Agent / Rule)

S (Skill): 트리거 키워드 → 자동 호출되는 능력 단위. ex) /needs → plan 생성

C (Command): 사용자 진입점 — 슬래시 입력으로 트리거. ex) /init /review

A (Agent): 별도 컨텍스트의 subagent — 메인 컨텍스트 보호 + 병렬 실행. ex) code-reviewer

R (Rule): 모델 행동 제약 정책. ex) “한국어 답변” “1단계 *, 2단계 -”

4요소가 결합되어 하네스의 핵심 구성. 이 강의에서는 사용 위주 (처음부터 자작 X)

![SCAR 4요소 (Skill / Command / Agent / Rule)](./img/AgenticCoding_v10_19.png)

---

# PRD.md / tasks.md 소개



* PRD.md = Product Requirements Document — 무엇을·왜 (요구사항)
* tasks.md = 실행 체크리스트 — 어떻게·언제 (단계별 작업)
  * 두 문서가 Agentic 사이클의 입력 역할
  * 이 강의의 nPTiR 변형: PRD → Plan, tasks → Task (개념 동일)

---

# (실습) PRD·tasks 빈칸 채워보기

🙋 직접 따라 하세요

미니 시나리오: “방문자 카운터 표시하는 홈페이지”

PRD 3줄 + tasks 5단계 직접 작성 (3분)

작성 후: 옆 사람과 1분 비교 → 차이 발견

Part2 미니 프로젝트의 입력 자료가 됨

---

# nPTiR 5단계 흐름도

![nPTiR 5단계 흐름도](./img/AgenticCoding_v10_20.png)

n (needs): 무엇이 필요한가 — 신호 탐색

P (Plan): 어떻게 할까 — 계획서 (_doc_work/plan/)

T (Task): 단계별 체크리스트 (_doc_work/tasks/)

i (issue): 진행 추적 (Issue.md)

R (Report): 완료 회고 (_doc_work/report/)

Part2에서 1 사이클 직접 실습
