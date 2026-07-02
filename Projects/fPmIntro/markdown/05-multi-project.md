---
title: "5. 다중 프로젝트 관리"
type: ppt
release_date: 2026-07-02
---

# 다중 프로젝트 관리 — cdf 패밀리

* **이게 없으면 겪는 불편**: 프로젝트 수십 개의 경로를 외우고, 전환마다 `cd`로 오가며, 프로젝트 간 의존 작업을 수동으로 챙김
* fPM은 **번호 → 경로 레지스트리**와 `cdf` 패밀리로 이 비용을 없앰

::: htmlart process
* 번호 등록
  - projects/{번호} = 경로 SSOT
* cdf 번호
  - 즉시 이동 (결정론적)
* 다중·분할
  - iTerm2 pane · VSCode
* 이름·frecency
  - 번호 잊어도 검색
:::

---

# 번호 → 경로 레지스트리

::: columns
:::: {.column width="40%"}
* 모든 프로젝트를 **번호**로 등록함 (`projects/{번호}` = 경로 SSOT)
* 경로를 외울 필요 없이 번호 하나로 프로젝트를 지목함
* hub Project List는 번호·도메인(`-g`/`-m`/`-w`)·경로·설명을 표로 보여주고, 행을 더블클릭하면 VSCode로 엶
::::
:::: {.column width="60%"}
![Project List — No.·Project·Domain·Path·Description 표 + Open in VSCode 버튼](./img/screenshots/05-project-list.png)
::::
:::

---

# cdf — 번호로 즉시 이동

::: columns
:::: {.column width="40%"}
* 터미널에서 `cdf <번호>` 한 줄이면 해당 프로젝트 디렉토리로 **즉시 이동**함
* `cdf 15` → 15번(fSnippet, `~/_git/__all/fSnippet`)으로 프롬프트가 바로 바뀜
* 번호는 항상 같은 경로를 가리키므로 **결정론적**임 — 손이 기억하게 됨
::::
:::: {.column width="60%"}
![cdf 15 입력 → 프롬프트가 ~/_git/__all/fSnippet 으로 즉시 이동](./img/screenshots/05-cdf-demo.png)
::::
:::

---

# cdf 다중 인덱스 → iTerm2 분할

::: columns
:::: {.column width="40%"}
* `cdf 15 16`처럼 번호를 여러 개 주면 **iTerm2 분할 pane**로 각각 열림
* 여러 프로젝트를 나란히 놓고 동시에 작업함 — 창을 하나씩 여는 수고가 없음
* 로컬 macOS에서는 iTerm2 분할이 자동 적용됨 (원격 Linux는 다음 챕터 graceful degrade 참조)
::::
:::: {.column width="60%"}
![cdf 15 16 → iTerm2 상·하 분할 pane가 각각 다른 프로젝트로 이동](./img/screenshots/05-cdf-split.png)
::::
:::

---

# cdfv — VSCode로 열기

::: columns
:::: {.column width="40%"}
* `cdfv <번호>`는 해당 프로젝트를 **VSCode로 열기**함 (`cdf`의 에디터 버전)
* `cdfv 16` → 16번(fWarrange)을 VSCode 창으로 엶
* `cdfv 0 1 2`처럼 여러 번호를 주면 여러 프로젝트를 한 번에 엶
::::
:::: {.column width="60%"}
![cdfv 16 → 'Opening fWarrange' 후 VSCode가 16번 프로젝트를 엶](./img/screenshots/05-cdfv-demo.png)
::::
:::

---

# cdf 패밀리 & 이름·frecency

::: cards
* **cdf / cdf 11**
  - 목록 표시 / 번호로 이동
* **cdff / cdfc**
  - Finder 열기 / 경로 클립보드 복사
* **cdfv / cdft**
  - VSCode 열기 / tmux window·pane 관리
* **cdfn / cdfvn**
  - 이름·한글 검색 이동 / 검색 후 VSCode
:::

* **이름 검색**: `cdfn snippet`·`cdfn 커먼`·`cdfvn snippet` (부분일치, 한글 가능)
* **frecency 스마트 점프**: 비번호 인자는 최근 방문 우선 + fzf fuzzy picker fallback

> Before → After: "경로 암기 + cd"에서 "번호·이름 한 단어로 어디든 즉시 이동"으로 바뀜
