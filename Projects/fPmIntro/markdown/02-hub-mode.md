---
title: "2. hub 모드"
type: ppt
release_date: 2026-07-02
---

# hub 모드 — HTML 렌더 & Q&A 폼

* **이게 없으면 겪는 불편**: 채팅 응답은 휘발되고, 표·다이어그램 같은 구조를 표현하기 빈약하며, 나중에 다시 찾기 어려움
* "결과를 문서로 보고 싶다"는 욕구를 hub 모드가 해결함
* 프롬프트에 트리거 한 단어만 붙이면 됨 — 별도 도구·복사·붙여넣기가 없음

::: cards
* **..show**
  - 응답을 완전한 HTML 문서로 렌더
* **..ask**
  - 선택지를 Q&A 폼으로 제시·자동 회수
* **..board**
  - 진행 상황을 실시간 대시보드로 push
:::

---

# ..show — 응답을 HTML 문서로

::: columns
:::: {.column width="40%"}
* 프롬프트에 `..show`를 붙이면 응답이 **완전한 HTML 문서**로 렌더됨
* 표·코드블록·mermaid가 그대로 보기 좋게 표현됨
* 파일·링크로 남아 나중에 다시 열거나 공유함
* "바탕화면 폴더 내용은? ..show" → Simple Browser 패널에 렌더
::::
:::: {.column width="60%"}
![바탕화면 폴더 내용 질문에 ..show → Simple Browser 패널에 표·폴더 목록 HTML 렌더](./img/screenshots/02-show-demo.png)
::::
:::

---

# hub 개요 — 프로젝트·세션·문서 한눈에

::: columns
:::: {.column width="40%"}
* hub 화면(`jm4.local:9876/hub-shell`)에서 프로젝트별 **활성 세션**·**ActivityFeed**·**생성 문서**를 모아 봄
* 상단 요약은 `11 live session · 200 hub doc`처럼 현재 상태를 한 줄로 보여줌
* 우측 ActivityFeed는 세션 완료·커밋 이벤트를 실시간으로 흘려줌
::::
:::: {.column width="60%"}
![hub 개요 — 프로젝트별 세션 카드 그리드 + 우측 ActivityFeed 실시간 이벤트](./img/screenshots/02-hub-overview.png)
::::
:::

---

# Active sessions — 어느 프로젝트가 무슨 작업 중인지

::: columns
:::: {.column width="40%"}
* 세션 그리드는 프로젝트 카드마다 **지금 돌고 있는 세션 제목**을 나열함
* `___pm(4)`·`fBoard(2)`·`m2slide(2)`처럼 프로젝트별 동시 세션 수가 뱃지로 보임
* "어느 창에서 뭘 하고 있었지?"를 창 전환 없이 한 화면에서 파악함

> Before → After: "채팅으로 흩어지던 진행 상황"이 "프로젝트별 세션 보드"로 모임
::::
:::: {.column width="60%"}
![Active sessions 그리드 — 프로젝트별 세션 카드에 진행 중 작업 제목 표시](./img/screenshots/02-hub-sessions.png)
::::
:::

---

# 모바일·원격에서도 열람

::: htmlart process
* QR 생성
  - hub `/qr` 페이지가 반응형 QR 제공
* 스캔
  - 같은 Wi-Fi 휴대폰으로 스캔
* 열람
  - 동일 결과 문서를 그 자리에서 확인
* 공유
  - 발표·리뷰 중 링크·QR 하나로 즉시
:::

* LAN IP bind + 오프라인 vendored QR로 **외부 서비스 의존 없이** 동작함
