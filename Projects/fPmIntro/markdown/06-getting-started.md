---
title: "6. fPM 도입하기"
type: ppt
release_date: 2026-07-02
---

# fPM 도입하기 & 다음 단계

* 앞서 본 hub·대시보드·VSCode 연동·cdf·pm-do·sshf를 **내 환경에 얹는 첫 단계**를 정리함

::: htmlart process
* 설치
  - 원라인 부트스트랩
* 유지
  - fpm update / upgrade
* 조정
  - hub Settings
* 실습
  - 오늘 바로 해볼 것
:::

---

# 원라인 설치

* GitHub 저장소: **`github.com/Finfra/fpm`**

```sh
# 공개 저장소 (raw URL 직접)
curl -fsSL https://raw.githubusercontent.com/Finfra/fpm/main/sh/bootstrap.sh | sh

# 비공개 저장소 (gh CLI 인증)
gh api -H "Accept: application/vnd.github.raw" \
  repos/Finfra/fpm/contents/sh/bootstrap.sh | sh
```

* git clone 선행이 필요 없음 — 부트스트랩이 클론·설정·플러그인 설치를 한 번에 처리함
* 공개는 raw URL 한 줄, 비공개는 `gh` 인증으로 동일하게 한 줄

---

# 셀프업데이트 커맨드

::: cards
* **fpm update**
  - git pull + 재설치 + plugin update
* **fpm upgrade**
  - 최신 태그로 업그레이드
* **fpm version**
  - 현재 버전 확인
* **fpm uninstall**
  - 제거
:::

* 설치 이후의 유지·보수를 셸 커맨드 한 줄로 처리함
* 롤백이 필요하면 `fpm version`으로 확인 후 특정 태그로 `upgrade` 함

---

# hub 설정 — 기본(Basic)

::: columns
:::: {.column width="40%"}
* hub Settings의 **Basic** 탭에서 브라우저·언어 등 기본 동작을 조정함
* **default browser** · **browser open**(자동 열기) · **browser tab reuse**(탭 재사용) · **language**
* 권장: 일반 작업은 Chrome, hub·대시보드는 Firefox로 분리하면 탭이 뒤섞이지 않음
::::
:::: {.column width="60%"}
![hub Settings Basic — default browser·browser open·browser tab reuse·language 설정](./img/screenshots/06-settings-basic.png)
::::
:::

---

# hub 설정 — 세션·피드(Sessions)

::: columns
:::: {.column width="40%"}
* **Sessions** 탭에서 세션 보드와 ActivityFeed의 표시량·갱신 주기를 조정함
* **live session limit / order** · **card·search limit** · **feed limit / poll interval**(초)
* 프로젝트가 많으면 limit·feed poll interval을 올려 한 화면에 더 담거나 더 자주 갱신함
::::
:::: {.column width="60%"}
![hub Settings Sessions — live session limit·card/search limit·feed limit·poll interval 조정](./img/screenshots/06-settings-sessions.png)
::::
:::

---

# 다음 단계 — SCAR 배포 & 연동

* **SCAR = Claude Code 플러그인 `fpm-core`** — 마켓플레이스 저장소 **`github.com/Finfra/f-claude-plugins`**

```sh
# Claude Code 마켓플레이스에서 SCAR 번들 설치
/plugin marketplace add Finfra/f-claude-plugins
/plugin install fpm-core
```

* **SCAR 크로스툴 export**: `scar-export`로 Cursor(`.cursor/rules`)·Codex(`AGENTS.md`)·Gemini(`GEMINI.md`) 포맷 이식 → 도구 락인 완화
* **적용 예시(prj4 social)**: SCAR export 산출물(`CLAUDE.md`·`GEMINI.md`·`Harness.md`)을 실제로 얹어 굴리는 프로젝트
* **GitHub 브리지**: `gh-sync`로 `Issue.md` ↔ GitHub Issues 옵트인 동기화

---

# 첫 실습 — 지금 해보기

::: htmlart step
* 설치
  - 원라인 부트스트랩 실행
* 첫 hub 렌더
  - 프로젝트 폴더에서 ..show
* 프로젝트 이동
  - cdf 목록 확인 → 번호 이동
* 장시간 작업
  - ..board로 진행 지켜보기
* 원격 확장
  - sshf로 서버 접속
:::

> 오늘 본 것 중 하나만 골라 바로 적용해보는 것이 가장 빠른 학습임

---

# 함께 시작하세요

```wordart
<h1 class="wordart-gradient" style="font-size:3em;margin:0.1em 0;">fPM</h1>
<p class="wordart-shadow" style="font-size:1.15em;color:#666;margin:0;">연결은 fPm이 하고, 나는 통찰에 집중</p>
```

::: cards
* **GitHub**
  - github.com/Finfra/fpm
* **기술 문의**
  - finfra@gmail.com
:::
