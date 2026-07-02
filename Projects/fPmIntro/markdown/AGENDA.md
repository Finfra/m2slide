---
title: "fPM 소개: Claude Code 다중 프로젝트 자동화 프레임워크"
subtitle: "왜 fPM인가 — 일반 Claude Code의 한계에서 출발하는 hub·<strong>웹 대시보드·VSCode 연동</strong>·cdf 패밀리(cdfn 이름검색·frecency)·sshf 원격 서버·원라인 설치·멀티 프로젝트 관리"
date: 2026-06-30
type: ppt
theme: default
theme_default_layout: contents
cover_enabled: true
cover_layout: _cover
version_badge: "v0.10.8"
github_url: "github.com/Finfra/fpm"
homepage: "finfra.kr"
markmap_depth: 2
---

## [1. 왜 fPM인가 — 일반 Claude Code의 한계](./01-what-is-fpm.md)

### [1.1 Claude Code 단독의 고충 → fPM이 해결하는 방식](./01.1-fpm-vs-plain-claude.md)

## [2. hub 모드 — HTML 렌더 & Q&A 폼](./02-hub-mode.md)

### [2.1 ..show / ..ask 실시간 데모](./02.1-hub-demo.md)

## [3. 실시간 대시보드 — ..board & SSE 모니터링](./03-dashboard.md)

## [4. VSCode ↔ 대시보드 연동](./04-vscode-integration.md)

## [5. 다중 프로젝트 관리 — cdf 패밀리](./05-multi-project.md)

### [5.1 pm-do: 크로스 프로젝트 위임 & depends 의존성](./05.1-pm-do.md)

### [5.2 sshf & 원격 서버 — 로컬과 동일한 워크플로우](./05.2-sshf-remote.md)

## [6. fPM 도입하기 & 다음 단계](./06-getting-started.md)

---
<!-- AGENDA 메모 — 단계 4(md-builder) · 5(media-creater) 참조용
=================================================================

★ 전체 서사 원칙 — 필요성(왜) 우선 (사용자 강조)
-------------------------------------------------
- 데크 전반을 "기능 나열"이 아니라 "문제 → 필요성 → fPM의 해결" 서사로 구성.
- 모든 데모 챕터(02·03·04·05)는 첫 슬라이드를 "이게 없으면 겪는 불편(Pain)" 1장으로 시작 → 그 다음 fPM 기능 데모로 연결. (= Pain-first hook)
- cover 다음, 챕터 1을 "왜 fPM인가"로 강하게 동기부여. 청중(Claude 사용자)이 "맞아, 나도 이거 불편했어"를 먼저 느끼게 함.
- 각 챕터 마지막에 "그래서 무엇이 좋아졌나(Before→After)" 1줄 정리.

챕터별 데모 유형 및 미디어 우선순위
-------------------------------------

[01] 왜 fPM인가 — 일반 Claude Code의 한계
  - 데모: 텍스트 + Mermaid 다이어그램 (Pain 목록 → fPM 해결 매핑, 번호→경로 레지스트리 개요)
  - 미디어: 다이어그램 필수, 스크린샷 선택
  - 핵심 슬라이드:
      (1) Claude Code 단독으로 다중 프로젝트·장시간 작업·결과 확인 시 겪는 구체적 Pain 3~4개
      (2) 각 Pain → fPM 기능 1:1 매핑 (필요성 → 해결책 연결도)
      (3) SCAR 3-tier 개념도 (1~2슬라이드, 별도 챕터 아님)

[01.1] Claude Code 단독의 고충 → fPM 해결
  - 데모: 비교표 (텍스트)
  - 미디어: 없음 (텍스트 집중)
  - 핵심 슬라이드: "Claude Code만 쓸 때 겪는 불편(채팅 휘발·결과 추적·프로젝트 전환 비용)" → "fPM이 해결하는 방식" 2-slide 대비. 데크의 필요성 훅(hook) 핵심 슬라이드

[02] hub 모드 — HTML 렌더 & Q&A 폼
  - 필요성 훅(첫 슬라이드): 채팅 응답은 휘발·재탐색 어려움·표/구조 표현 빈약 → "결과를 문서로 보고 싶다"
  - 데모: ★★★ 영상 중심 (사용자 촬영 필수)
  - 미디어: 시연 영상 1개(..show 사용 전·후 채팅 vs HTML 렌더 비교) + 스크린샷 2~3장
  - 핵심 슬라이드: ..show 트리거 → Firefox HTML 렌더 결과 전/후, Q&A 폼 제시 화면
  - 촬영 포인트: Claude Code 채팅창 → "..show" 입력 → Firefox가 열리며 HTML 응답 표시
  - 확장(선택 1슬라이드): 모바일·원격 hub 접속 — hub `/qr` 반응형 페이지 + QR 스캔으로 같은 Wi-Fi 휴대폰에서 열람 (LAN IP bind, 오프라인 vendored qrcode)

[02.1] ..show / ..ask 실시간 데모
  - 데모: ★★★ 영상 중심
  - 미디어: 시연 영상 1개(..ask 폼 회수 흐름) + 스크린샷 1~2장
  - 핵심 슬라이드: AskUserQuestion → HTML 폼 → 사용자 응답 → Claude 자동 수신 흐름도
  - 촬영 포인트: "..ask 어떤 DB 를 쓸까" 입력 → 브라우저 폼 → 선택 → 응답 수신까지

[03] 실시간 대시보드 — ..board & SSE 모니터링
  - 필요성 훅(첫 슬라이드): 장시간 작업은 끝날 때까지 깜깜이·진행률 모름·여러 작업 동시 추적 불가
  - 데모: ★★★ 영상 중심 (사용자 촬영 필수)
  - 미디어: 시연 영상 1개(..board 실시간 갱신) + 스크린샷 2~3장(tmux + Firefox 대시보드 병렬)
  - 핵심 슬라이드: tmux runner + 브라우저 대시보드 동시 화면, 장시간 작업 vs hub 차이
  - 촬영 포인트: "..board 빌드 현황" 입력 → tmux window 생성 → Firefox 대시보드 실시간 갱신

[04] VSCode ↔ 대시보드 연동
  - 필요성 훅(첫 슬라이드): 브라우저·터미널·에디터 창 전환 피로 → 한 화면(IDE) 안에서 작업+결과 확인 욕구
  - 데모: ★★★ 영상 + 스크린샷 (사용자 지정 강조 챕터)
  - 미디어: 시연 영상 1개(Simple Browser 패널에서 대시보드 확인) + 스크린샷 3~4장
  - 핵심 슬라이드: VSCode 레이아웃(편집기+터미널+Simple Browser), 세션 포커스, 프로젝트 열기
  - 촬영 포인트: VSCode 분할 레이아웃 → Simple Browser에 대시보드 URL → 실시간 갱신 확인

[05] 다중 프로젝트 관리 — cdf 패밀리
  - 필요성 훅(첫 슬라이드): 프로젝트 수십 개 경로 암기·전환 비용·프로젝트 간 의존 작업 수동 처리의 한계
  - 데모: 스크린샷 + 영상 + Mermaid 다이어그램 (번호→경로 레지스트리, depends 그래프)
  - 미디어: 시연 영상 1개(cdf 번호 입력 → 디렉토리 즉시 이동, iTerm2 분할) + 스크린샷 2~3장 + 다이어그램 1~2개
  - 핵심 슬라이드:
      (1) projects/ 번호→경로 레지스트리 구조
      (2) cdf 패밀리 표 — cdf(이동·iTerm2 분할) / cdff(Finder) / cdfc(클립보드) / cdfv(VS Code) / cdft(tmux window·pane 관리). `cdf 11 12 13` 다중 인덱스 동시 이동
      (3) 번호 대신 이름·한글 검색 — cdfn / cdfvn (부분일치, `cdfn common`·`cdfn 커먼`·`cdfvn snippet`)
      (4) frecency 스마트 점프 — 비번호 인자 시 최근 방문·fzf fuzzy picker fallback (번호 결정론성은 유지, fuzzy 는 보조 레이어)
      (5) 크로스 프로젝트 depends 표기
  - 촬영 포인트: 터미널에서 `cdf` (전체 목록) → `cdf 11` (즉시 이동) → `cdf 11 12 13` (iTerm2 분할) → `cdfv 0 1 2` (VS Code 다중 열기) → `cdfn snippet` (이름 점프) → `cdf fBan` (fzf fuzzy)

[05.2] sshf & 원격 서버 — 로컬과 동일한 워크플로우 (사용자 강조)
  - 필요성 훅(첫 슬라이드): 서버 IP·접속 정보 암기, 로컬과 원격에서 작업 방식이 달라지는 불편
  - 데모: ★★ 영상 + 스크린샷 (사용자 촬영)
  - 미디어: 시연 영상 1개(sshf 번호/이름으로 서버 접속 → 원격에서 동일 fPM 워크플로우) + 스크린샷 1~2장
  - 핵심 슬라이드:
      (1) sshf 서버 매핑 표 — `sshf`(서버 목록) / `sshf 3`(id 접속) / `sshf gpu1`(이름 접속)
      (2) 원격 서버에서도 fPM이 그대로 동작 (cdf 네비게이션·hub·작업 흐름이 로컬과 동일) — "한 번 익히면 어디서나"
      (3) 로컬 macOS = iTerm2 분할/Finder/클립보드 풍부, 원격 Linux = 기본 cd/ssh 로 graceful degrade
  - 촬영 포인트: `sshf` (서버 목록) → `sshf gpu1` (원격 접속) → 원격에서 cdf·작업 시연

[05.1] pm-do 크로스 프로젝트 위임
  - 데모: 스크린샷 (pm-do 실행 로그) + Mermaid 위임 흐름도
  - 미디어: 스크린샷 1~2장 + 다이어그램 1개
  - 핵심 슬라이드: pm-do 명령 예시, depends 의존성 체인, 병렬 fan-out 오케스트레이션

[06] fPM 도입하기 & 다음 단계
  - 데모: 텍스트 + 스크린샷 (설치 화면)
  - 미디어: 스크린샷 1~2장
  - 핵심 슬라이드:
      (1) 원라인 설치 — `curl -fsSL <raw>/sh/bootstrap.sh | sh` (공개) / `gh api raw ... | sh` (비공개). git-clone 선행 불요
      (2) 셀프업데이트 셸 커맨드 — `fpm update`(git pull + 재설치 + plugin update) / `fpm upgrade`(최신 태그) / `fpm version` / `fpm uninstall`
      (3) 첫 hub 실행 체크리스트, 참고 링크
  - 확장(선택 1슬라이드): SCAR 크로스툴 export — `scar-export` 로 Cursor(.cursor/rules)·Codex(AGENTS.md)·Gemini(GEMINI.md) 포맷 이식, 락인 완화. Issue.md ↔ GitHub Issues 옵트인 브리지(`gh-sync`)

총 파일 수: AGENDA.md(1) + 챕터 파일(9) = 10개
예상 슬라이드: cover(1) + 챕터별 toc 자동(9) + 본문(약 31) = 약 41장
주의: 30분 기준 분량 초과 위험 → 단계 4에서 챕터당 본문 절제(특히 cdf/sshf 표는 1장에 압축) 권고
-->
