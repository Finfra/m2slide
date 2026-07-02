---
title: "1. 왜 fPM인가"
type: ppt
release_date: 2026-07-02
---

# 왜 fPM인가 — 일반 Claude Code의 한계

* fPM(finfra Project Manager)은 Claude Code 위에 얹는 **다중 프로젝트 자동화 프레임워크**임
* 이 챕터는 기능을 나열하기 전에, 먼저 **"Claude Code 단독으로 쓰면 무엇이 불편한가"**를 짚음
* 그 불편(Pain)마다 fPM이 어떤 방식으로 해결하는지 1:1로 연결해봄
* 남은 챕터는 여기서 짚은 불편을 하나씩 실제 화면으로 증명하는 순서임

---

# fPM 전체 지도 — 한눈에

![fPM 전체 지도 — Claude Code 위에 hub·대시보드·VSCode 연동·cdf·pm-do·sshf 6개 자동화 레이어가 얹히고 SCAR가 토대를 이룸](./img/diagrams/fpm-system-map.svg)

---

# 30초 미리보기 — fPM 종합 데모

<div style="max-width:80%;margin:0.3rem auto 0;">
  <p style="text-align:center;font-size:0.6em;line-height:1.5;color:#555;margin:0 0 0.5rem;">
    <strong>hub 렌더 → 실시간 대시보드 → 다중 프로젝트 이동</strong>까지 전체 흐름을 압축한 종합 데모 · 지금은 "이런 게 가능하구나" 정도만 봐두면 됨 (각 장면은 뒤에서 자세히)
  </p>
  <video controls src="https://finfra.kr/mp4/00-fpm-overview.mp4" style="width:100%;display:block;border-radius:14px;box-shadow:0 6px 24px rgba(0,0,0,0.18);"></video>
</div>

---

# Claude Code 단독으로 겪는 불편

::: htmlart block
* 결과가 휘발됨
  - 표·구조 섞인 답변을 다시 찾거나 공유하기 어려움
* 장시간 깜깜이
  - 빌드·마이그레이션 끝날 때까지 진행률을 모름
* 프로젝트 전환 비용
  - 수십 개 경로를 외우고 `cd`로 오감
* 의존 작업 수동
  - A를 끝내야 B를 시작하는 순서를 매번 챙김
* 창 전환 피로
  - 터미널·브라우저·에디터를 오가며 맥락이 끊김
* 원격 서버
  - 서버마다 접속 정보를 외우고 방식이 달라짐
:::

> 이 6가지는 "가끔 겪는 불편"이 아니라 **매일 반복되는 비용**임

---

# 각 Pain → fPM 기능 매핑

::: htmlart block
* 결과 휘발 → hub 렌더
  - ..show 로 응답을 HTML 문서화
* 장시간 깜깜이 → ..board
  - SSE 실시간 진행률 push
* 창 전환 피로 → VSCode 연동
  - 탭·세션 점프 · /fpm-*
* 프로젝트 전환 → cdf 패밀리
  - 번호·이름 한 단어로 이동
* 의존 작업 수동 → pm-do · depends
  - 선행 위임·순서 자동
* 원격 서버 → sshf
  - 번호·이름으로 접속
:::

* 불편이 곧 fPM 기능의 **존재 이유**임 — "있으면 좋은 기능"이 아니라 "없으면 겪는 문제의 해결책"
* 다음 챕터부터 각 기능을 실제 화면으로 확인해봄

---

# fPM의 뼈대 — SCAR 3-tier

* fPM은 모든 자동화를 **SCAR**(Skill / Command / Agent / Rule) 단위로 관리하고, 도메인 접미사로 3계층 재사용함 — 한 번 정의한 규칙이 **전 프로젝트에 전파**됨

::: htmlart pyramid
* 공통 SSOT (-g)
  - 전 프로젝트 공유
* macOS 도메인 (-m)
  - 앱 빌드·배포
* web 도메인 (-w)
  - 웹 개발 사이클
:::

* hub·cdf·pm-do도 모두 이 SCAR 체계 위에서 동작함

---

# 이 데크에서 볼 것

::: htmlart chevron
* 2. hub 렌더 / Q&A
* 3. 실시간 대시보드
* 4. VSCode 연동
* 5. 다중 프로젝트
* 6. 도입하기
:::

* 각 챕터는 **"이게 없으면 겪는 불편 → fPM의 해결 → Before/After"** 순서로 진행함
* 하나의 프레임워크가 여섯 가지 불편을 어떻게 한 흐름으로 엮는지에 주목하면 됨
