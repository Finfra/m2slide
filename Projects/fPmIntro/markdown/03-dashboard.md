---
title: "3. 실시간 대시보드"
type: ppt
release_date: 2026-07-02
---

# 실시간 대시보드 — ..board & SSE 모니터링

* **이게 없으면 겪는 불편**: 장시간 작업은 끝날 때까지 깜깜이이고, 진행률을 알 수 없으며, 여러 작업을 동시에 추적하기 어려움
* `..board`는 작업 진행을 **실시간 대시보드**로 밀어줌
* 터미널을 지켜보지 않아도 브라우저 카드가 스스로 갱신됨

::: htmlart process
* ..board 실행
  - tmux window에 runner 기동
* SSE push
  - 서버가 진행 상태 실시간 전송
* 카드 갱신
  - 브라우저가 스스로 갱신
* 완료 알림
  - 소요시간·결과·산출물 자동
:::

---

# ..board — tmux runner + 실시간 push

::: columns
:::: {.column width="40%"}
* `..board <주제>`로 백그라운드 runner를 tmux window에 띄움
* 서버가 **SSE**(Server-Sent Events)로 진행 상태를 브라우저에 실시간 push함
* 유한 작업은 완료 시 소요시간·결과·산출물을 자동 알림함
* 카드에서 `Open ↗`으로 상세, `stop pid=…`로 즉시 중단
::::
:::: {.column width="60%"}
![..board 실행 — 대시보드에 running 카드 + Open/stop pid 버튼, 우측 runner·worker 로그 경로](./img/screenshots/03-board-running.png)
::::
:::

---

# 진행률·경과·체크리스트

::: columns
:::: {.column width="40%"}
* 상세 화면은 status·pid·경로·mtime을 표로 보여주고, 아래에 진행 지표 카드를 나열함
* **진행률**(생성 폴더/1000) · **최신 104/1000** · **경과 01:45**를 한 화면에서 확인
* 완료 조건 체크리스트(✅ 100 → 500 → 1000)로 남은 작업을 가늠함
::::
:::: {.column width="60%"}
![대시보드 상세 — 진행률 10%·폴더 104/1000·01:45 경과 + 완료 조건 체크리스트](./img/screenshots/03-board-dashboard.png)
::::
:::

---

# hub vs ..board — 언제 무엇을

::: htmlart compare
* **..show (hub)** / 1회성 결과·문서
  - 렌더 시점 고정
  - 완료 알림 없음
  - 폴더 목록·리포트
* **..board (대시보드)** / 장시간·반복 진행
  - SSE 실시간 push
  - 소요시간·결과 자동 알림
  - 1000개 생성·대량 마이그레이션
:::

* 짧은 결과는 `..show`, 오래 도는 작업은 `..board` — 상황에 맞게 골라 씀

> Before → After: "끝날 때까지 기다림"에서 "지금 어디까지 됐는지 실시간으로 봄"으로 바뀜
