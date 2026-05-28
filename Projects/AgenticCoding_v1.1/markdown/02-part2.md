---
title: "Agentic Coding — Part2"
subtitle: "핸즈온 미니 프로젝트"
type: ppt
release_date: 2026-05-27
---

#layout-_chapter

# Agentic Coding — Part2

핸즈온 미니 프로젝트

---

# Part2 시작 — 미니 프로젝트 주제 안내

주제: “MD 파일 뷰어” — 2단계 구현

형식: 핸즈온 (시연 + 직접 실습)

보조강사 1명이 환경 오류 1차 응답

흐름: 셋팅 → 1단계 MVP → (선택) Superpowers → 2단계 기능 개선 (DB + Docker) → 코드 리뷰

환경: 1단계 — Windows 설치된 Node.js만 사용 / 2단계 — Docker로 MySQL 추가 (설치 불필요)

---

# 미니 프로젝트 목표·산출물

1단계 MVP 산출물: Node 서버 + MD 렌더러 + 파일 목록 UI (Node.js만 사용)

2단계 개선 산출물: 파일 조회수 추적 + 인기 문서 TOP 3 (MySQL via Docker)

핵심 흐름: MVP 단점 발견(재시작 시 데이터 소실) → DB 필요 → Docker로 MySQL 실행 → Node 연동

강의 후 가져갈 것: 작동하는 코드 + nPTiR 사이클 1회 + Docker 첫 체험

![미니 프로젝트 목표·산출물](./img/AgenticCoding_v10_21.png)

---

# 하네스 셋팅 절차 개요

1단계: 작업 디렉토리 + git init

2단계: Claude Code 시작 + /init 으로 CLAUDE.md 자동 생성

3단계: CLAUDE.md 손질 (강의 컨텍스트 추가)

4단계: 슬래시 커맨드 1개 실행으로 동작 확인

---

# (시연) 작업 디렉토리 생성 + git init

mkdir <span style="color:#000000"> md-viewer </span>  <span style="color:#007020">**&&**</span>  <span style="color:#000000"> </span>  <span style="color:#008000">**cd**</span>  <span style="color:#000000"> md-viewer </span>  <span style="color:#007020">**&&**</span>  <span style="color:#000000"> </span> git <span style="color:#000000"> init</span>

.git/ 디렉토리 생성·초기 브랜치 확인

직접 따라 하기 (오류 시 보조강사에게 손들기)

✅ 통과 조건: git status → On branch main / nothing to commit

🖥️ 시연 (터미널)

---

# (시연)Claude Code 시작 → /init → CLAUDE.md 자동 생성

![](./img/s45_i1.png)

---

# VsCode에서 Claude Code 패널 열기 <span style="color:#000000">/init</span>

디렉토리 스캔 → 핵심 컨텍스트 추출 → CLAUDE.md 작성

빈 디렉토리에서도 자동 생성됨

✅ 통과 조건: CLAUDE.md 파일 존재 + 자동 생성 본문 1쪽 분량

![VsCode에서 Claude Code 패널 열기 <span style="color:#000000">/init</span>](./img/AgenticCoding_v10_22.png)

---

# CLAUDE.md 손질

에이전트가 매 턴마다 자동으로 로드하는 최상위 규칙(Rule). 자연어 명령만으로 시스템 메타 컨텍스트를 갱신합니다.

CLAUDE.md에 다음 3가지 항목 추가해줘:

1. 한국어로 답변

2. Node 22 + Express + marked 사용

3. git 자동 커밋 금지

Claude가 직접 자기 컨텍스트 갱신 (메타 작업)

marked: MD → HTML 변환 라이브러리 — Docker 없이 npm으로 설치

![CLAUDE.md 손질](./img/AgenticCoding_v10_23.png)

---

# (체크포인트) 하네스 동작 확인

프로젝트 구조 알려줘

위 단계 완료 여부 확인 (손들기)

✅ 통과 조건: 응답에 “Node 18”, “Express”, “한국어” 키워드 포함

오류 시 보조강사에게 손들기

통과하면 자유 실험

🖥️ 시연 + 체크 시간

![](./img/s48_i1.png)

---

# MVP 개발 3단계 흐름

1단계: PRD.md — 무엇을·왜 (요구사항)

2단계: tasks.md — 어떻게·언제 (실행 체크리스트)

3단계: 코드 — Claude Code가 tasks 1번씩 자율 실행

평균 1턴 5~30초 — 60분 동안 15~10 task 처리 가능

![MVP 개발 3단계 흐름](./img/AgenticCoding_v10_24.png)

---

# 의도와 실행의 분리: PRD vs. Tasks

주의) 직접 작성않아도 됩니다. “우리는 검토만 의견 제시로 수정”

![의도와 실행의 분리: PRD vs. Tasks](./img/AgenticCoding_v10_25.png)

---

# PRD.md 작성 가이드

필수 섹션: 목표 / 기능 요구사항 / 비기능 요구사항 / 비포함

길이: 1페이지 (≤ 500자) — 길면 컨텍스트 낭비

작성 팁: 3인칭 동사 시작 (“사용자가 파일 링크를 클릭하면 HTML로 렌더링된 화면이 표시된다”)

![PRD.md 작성 가이드](./img/AgenticCoding_v10_26.png)

---

# (시연) PRD.md 작성 — 직접 작성 후 보강

3분: Part1 빈칸을 PRD.md 형식으로 정리

빠진 섹션 보강 시연:

PRD.md에 비기능 요구사항 1줄 추가해줘 (예: 응답 시간 200ms 이하)

결과: 정제된 PRD.md 1.0 완성

🖥️ 시연 (실시간 편집)

---

# (체크포인트) PRD.md 점검

PRD.md 1.0 완성 여부 확인 (손들기)

✅ 통과 조건: 목표 / 기능 요구사항 / 비기능 요구사항 / 비포함 4섹션 모두 채워짐

오류 시 보조강사에게 손들기

완성 후 옆 사람과 1분 비교 (시야 확장)

---

# tasks.md 작성 가이드

필수 형식: 체크박스 리스트 (- [ ] {액션})

단위: 1개 = 5~15분 작업 (너무 크면 분리, 작으면 묶기)

의존성 표시: “의존: 1번” (있으면)

PRD.md → tasks.md는 Claude에게 자동 변환 의뢰 가능

---

# (시연) tasks.md 자동 생성 — Claude Code에 위임



* PRD.md 기반으로 tasks.md 생성해줘. 5~7개 task로 쪼개줘.
    * 각 task는 5~15분 단위로, 의존성이 있으면 "의존: N번"으로 표기해줘.
* Claude가 PRD 분석 → 단계별 액션 도출 → 체크박스 리스트 작성
* 추가 다듬기:
* 3번 task가 너무 커. 2개로 나눠줘.
* 🖥️ 시연 (자동 생성 화면)

![](./img/s55_i1.png)

---

# nPTiR 진행 싸이클

![nPTiR 진행 싸이클](./img/AgenticCoding_v10_27.png)

---

# (실습) tasks.md 직접 검토·수정

🙋 직접 따라 하세요

3분: 자기 tasks.md 항목 1개를 자기 시각에서 다시 적기

비교: Claude 자동 생성 vs 직접 수정안

학습 포인트: “Claude 자동 생성도 검토 필요 — 100% 신뢰는 위험”

✅ 통과 조건: 자기 tasks.md에 1줄 이상 직접 수정 흔적

---

# 코드 생성 단계 — Claude Code 자율 실행 흐름

tasks.md 1번부터 차례로 실행해줘. 1번 끝나면 멈춰.

1턴 사이클: Plan → Bash·Edit·Read → 검증 → 결과 보고

매 task 후 검토·승인 필요 (자율 실행 ≠ 무인 실행)

안전망: git status 자주 확인 — 망가지면 git reset --hard

---

# (시연) tasks 1번부터 코드 작성 시작

tasks.md 1번부터 차례로 실행해줘. 1번 끝나면 멈춰.

1번 task 예시: “Express 서버 초기화 + docs/ 폴더 생성 + MD 파일 목록 API”

package.json 생성 → npm install (express + marked) → server.js 작성 → 실행 확인

🖥️ 시연 (8분 집중)

---

# (체크포인트) 1번 task 완료 확인

curl localhost:3000

✅ 통과 조건: 응답 200 OK + MD 파일 목록 HTML 포함

git status 확인 — 의도한 변경만 있는지

1번 task git commit (선택)

오류 시 보조강사에게 손들기

---

# (시연) tasks 2~3번 — 점진 구현

tasks.md 2번 실행 → 끝나면 git diff 보여줘 → 그 다음 3번 진행해줘.

2번 task 예시: “GET /view/:filename 라우트 + marked로 HTML 렌더링”

3번 task 예시: “파일 목록 페이지 디자인 + 뷰어 네비게이션 링크”

누적 변경에 따른 git diff 추적

시연: 의도적 실패 → 함께 디버깅

🖥️ 시연

---

# (체크포인트) MVP 동작 확인 — 브라우저 열기

node server.js

<span style="color:#60a0b0"> _# _ </span>  <span style="color:#60a0b0"> _브라우저에서 _ </span>  <span style="color:#60a0b0"> _http://localhost:3000 _ </span>  <span style="color:#60a0b0"> _열기_ </span>

✅ 통과 조건: 브라우저에서 MD 파일 목록 표시 + 파일 클릭 시 HTML 렌더링 확인

동작 화면 손들기 — 오류 시 보조강사에게

완료 후 옆 사람 돕기 (peer learning)

🖥️ 시연 + 체크

![](./img/s62_i1.png)

---

# 잘 안 되는 케이스 대응

![잘 안 되는 케이스 대응](./img/AgenticCoding_v10_28.png)

---

# PRD/tasks 기반 개발의 장점 정리

![PRD/tasks 기반 개발의 장점 정리](./img/AgenticCoding_v10_29.png)

---

# 휴식 안내 (5분)

Part2의 절반 통과 — 5분 휴식

다음 섹션: (선택) Superpowers plugin → nPTiR 사이클 → 코드 리뷰

자유 시간: 추가 질문 / 화장실 / 음료

![](./img/s65_i1.png)

---

# MVP의 한계 극복

![MVP의 한계 극복](./img/AgenticCoding_v10_30.png)

---

# Superpowers plugin이란?

정의: Claude Code 플러그인 — 14개 핵심 스킬 묶음

스킬 예: brainstorming · writing-plans · debugging · TDD

위치: ~/.claude/plugins/superpowers/

채택 이유: nPTiR과 친화적 (writing-plans·executing-plans 활용)

🖼️ Superpowers 14개 스킬 목록 스크린샷

---

# 14개 핵심 스킬 한눈에 보기

| 단계 | 스킬 |
| :-: | :-: |
| 탐색·계획 | brainstorming / writing-plans |
| 실행 | executing-plans / subagent-driven-development / TDD |
| 검증 | verification-before-completion / receiving-code-review |
| 메타 | writing-skills / using-git-worktrees / requesting-code-review |

---

# (시연) Superpowers 설치 — 1줄 명령

claude plugins install superpowers

~/.claude/plugins/superpowers/ 다운로드·등록

즉시 사용 가능: /needs /sp-plan /brainstorm 등 활성화

✅ 통과 조건: /needs 입력 시 자동완성 노출

🖥️ 시연 (설치 화면)

---

# (시연) /needs 또는 /brainstorm 동작

/needs 파일 조회수 추적 기능 추가

신호 판정 → 탐색 vs 직행 결정 → 계획서 자동 생성

결과: _doc_work/plan/{주제}_plan.md 자동 작성

Part2 후반 nPTiR 실습으로 이어짐

🖥️ 시연

---

# (선택) Superpowers 활용 정리

이 섹션 스킵해도 다음 섹션 진행 가능 (Sec3 전체 스킵 가능)

자기 학습 권장: 14개 스킬 docs를 1주일에 1개씩 읽기 🖥️ 시연 # SCAR 체계 구축

SCAR구현(프로젝트 폴더에서)

클로드 환경 구성이 되어 있지 않은데, https://finfra.kr/jg/2026/04/20/scar_define/ 기반 scar체계 구현해줘.

검토 프로젝트 폴더의 .claude폴더 확인!

글로벌 스킬로 이동. (위 2번 프로젝트 폴더에 구현)

글로벌 스킬로 이전해줘.

“뭐가 좋을까?”

---

# nPTiR 체계 구현

nPTiR 구현(프로젝트 폴더에서)

클로드 환경 구성이 되어 있지 않은데, https://finfra.kr/jg/2026/04/20/nptir_define/ 기반 nPTiR 체계 구현해줘.

검토 프로젝트 폴더의 .claude폴더 확인!

글로벌 스킬로 이동. (위 2번 프로젝트 폴더에 구현)

글로벌 스킬로 이전해줘.

![](./img/s72_i1.png)

---

# nPTiR 사이클 복습 + 이번 섹션 시나리오



* 복습: needs → Plan → Task → issue → Report 5단계 (Part1)
* 이번 섹션 목표: MVP 단점 발견 → 기능 개선 사이클 1회 직접 돌리기
* 시나리오: “파일 조회수 추적 + 인기 문서 TOP 3”
    * 단점 발견: MVP는 재시작 시 데이터 소실 (메모리 기반 한계)
    * 해결 방향: 영속 저장소(DB) 필요 → Windows에 직접 설치 대신 Docker로 MySQL 실행
* 학습 포인트: 단점 발견 → DB 필요성 → Docker 자연 도입 → nPTiR 사이클 완주


![nPTiR 사이클 복습 + 이번 섹션 시나리오](./img/AgenticCoding_v10_31.png)

---

# 시나리오 — MVP에 어떤 기능을 추가할 것인가

💡 후보1 권장 — Docker 도입 경험이 핵심, 후보3은 Docker 없이도 가능한 대안

| 후보 | 내용 | 난이도 |
| :-: | :-: | :-: |
| 후보1 (권장) | 파일 조회수 추적 + 인기 문서 TOP 3 (MySQL via Docker) | 적정 |
| 후보2 | 방문 기록 타임라인 (최근 열람 파일 목록 DB 저장) | 중간 |
| 후보3 | 즐겨찾기 기능 (로컬 JSON 파일 기반 — DB 불필요) | 쉬움 |

---

# needs 단계 — 신호 판정·이슈후보 등록

needs = 무엇이 필요한가 — 주제 탐색·신호 판정

Issue.md 🌱 이슈후보 섹션에 1줄 등록

신호 판정: 단순(plan X) / 중간(plan O) / 복잡(plan + task + report)

이 시나리오는 “복잡” 판정 (DB 스키마 설계·Docker 연동·Node 코드 변경 → plan + task 필수)

🖼️ Issue.md 이슈후보 섹션 스크린샷

---

# (시연·실습) needs 작성 → /needs 호출

🙋 직접 따라 하세요 — 2분: Issue.md 🌱 이슈후보에 시나리오 1줄 작성

/needs 파일 조회수 추적 기능 추가

Claude가 “복잡도 복잡 → plan + task 직행” 판정 (DB·Docker 연동 포함)

결과: _doc_work/plan/view-counter_plan.md 자동 생성

✅ 통과 조건: _doc_work/plan/ 하위 plan 파일 1개 신규 생성

🖥️ 시연 + 실습

---

# Plan 단계 — _doc_work/plan/ 생성

Plan = 어떻게 할까 — 구현 계획서

위치: _doc_work/plan/{주제}_plan.md

핵심 섹션: 배경·범위·구현 순서·완료 조건·리스크

자동 생성 후 직접 검토 필수 (자율 ≠ 무인)

---

# (시연) Plan 자동 생성 + 검토

view-counter_plan.md 다듬어줘. 구현 순서를 4단계로 정리하고

각 단계에 완료 조건 1줄씩 추가해줘.

Claude가 plan을 1차 작성 → 피드백 받아 2차 다듬기

plan 4단계 예시: ① docker-compose.yml 작성 / ② MySQL 스키마 + 초기화 / ③ Node mysql2 연동 / ④ 조회수 API + 인기 문서 라우트

메타 포인트: 이 강의 자료 자체가 이렇게 만들어진 것

🖥️ 시연

![](./img/s78_i1.png)

---

# Task 단계 — 실행 체크리스트 분리

Task = 단계별 체크리스트 (_doc_work/tasks/{주제}_task.md)

Plan의 “구현 순서”를 2~5분 단위 액션으로 분리

frontmatter에 plan: 경로 명시 (양방향 연결)

명시적 요청 없이 자동 생성 금지 (직접 결정)

![Task 단계 — 실행 체크리스트 분리](./img/AgenticCoding_v10_32.png)

---

# (시연) Task 생성 + 1단계 실행

view-counter_plan.md 기반으로 task 만들어줘.

Step 1 실행해줘. 끝나면 멈춰.

Step 1 내용: docker-compose.yml 작성 → docker compose up -d → MySQL 컨테이너 기동

Claude가 compose 파일 생성 → docker 명령 실행 → 연결 확인

✅ 통과 조건: docker compose ps → db 컨테이너 running 상태 확인

🖥️ 시연

---

# issue·Report 단계 — 진행 추적·완료 보고



* issue = Issue.md 통합 트래커 — 진행 상태 추적 (🚧 진행중 → ✅ 완료)
* Report = _doc_work/report/{주제}_issue{번호}_report.md — 완료 회고
  * Report는 단순 이슈는 생략 가능, 복잡 이슈만 필수
  * 이 시나리오는 “중간” → Report 선택

---

# (시연) Issue.md 갱신 + 간단 Report 생성

Issue.md에 view-counter 이슈 등록해줘.

방금 view-counter 작업 완료 표시해줘 (✅ 완료 섹션으로 이동).

view-counter report 만들어줘. 복잡도 "복잡" 기준으로.

Issue.md HWM 증가·항목 추가 → 완료 섹션 이동 → report 자동 작성

Docker 도입 배경·결정 사항이 report에 보존됨 — 1주일 후에도 재현 가능

🖥️ 시연

---

# nPTiR 사이클 1회 정리

한 사이클 통과 시간: 30~45분 (단순 시나리오)

산출물: plan + task + issue 항목 + (선택) report

핵심 효과: 의도·과정·결과가 한 폴더에 보존 → 1주일 후 와도 재현 가능

“이게 Agentic Engineering의 모습”

---

# 코드 리뷰 도구 개요

| 도구 | 특징 | 이 강의 |
| :-: | :-: | :-: |
| /review | Claude Code 내장, diff 분석·이슈 탐지 | ✅ 사용 |
| /codex review | OpenAI Codex CLI 연동, 다른 모델 시각 | (선택) |
| gemini-diff-reviewer | Gemini 모델 + report 저장 | 참고 |

---

# (시연) /review 실행 — diff 분석·이슈 탐지

/review

현재 브랜치 diff 분석 → 보안·성능·유지보수 이슈 보고

결과 형식: 이슈별 위치 (파일:라인) + 심각도 + 수정 제안

PR 만들기 전 매번 실행 권장

✅ 통과 조건: 리뷰 결과에 1건 이상 항목 표시 + 심각도 라벨 부착

![](./img/s85_i1.png)

---

# 강의 회고 — Agentic Engineering: 시스템의 완성

![강의 회고 — Agentic Engineering: 시스템의 완성](./img/AgenticCoding_v10_33.png)

---

# 다음 단계 — 자기 학습 로드맵

![다음 단계 — 자기 학습 로드맵](./img/AgenticCoding_v10_34.png)

---

# Q&A·마무리

![Q&A·마무리](./img/AgenticCoding_v10_35.png)
