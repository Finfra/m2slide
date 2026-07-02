---
title: "4. VSCode 연동"
type: ppt
release_date: 2026-07-02
---

# VSCode ↔ 대시보드 연동

* **이게 없으면 겪는 불편**: 브라우저·터미널·에디터 창을 오가며 맥락이 끊김
* 한 화면(IDE) 안에서 **작업과 결과 확인을 동시에** 하고 싶은 욕구를 해결함

::: cards
* **↗ 명명 브라우저 탭**
  - 문서를 이름 붙은 탭으로 열기
* **VS 원본 세션**
  - 문서를 만든 세션으로 포커스
* **/fpm-* 슬래시 커맨드**
  - IDE 안에서 fPM 기능 호출
:::

---

# 카드에서 명명 브라우저 탭으로 점프

::: columns
:::: {.column width="40%"}
* hub 문서 카드의 **↗ 버튼**은 그 문서를 **이름이 붙은 브라우저 탭**으로 엶
* 탭 제목이 `fSnippet — Issue941 커밋`처럼 의미로 표기되어 여러 탭을 헷갈리지 않음
* 같은 문서를 다시 열면 새 탭을 만들지 않고 그 탭으로 포커스가 이동함
::::
:::: {.column width="60%"}
![hub 문서 카드의 ↗ 버튼 → 'fSnippet — Issue941 커밋' 명명 탭으로 점프](./img/screenshots/04-jump-tab.png)
::::
:::

---

# 문서를 만든 세션으로 되돌아가기

::: columns
:::: {.column width="40%"}
* hub 문서 카드의 **VS 버튼**은 그 문서를 만든 **원본 세션을 VSCode로 포커스**함
* "이 결과 누가 만들었더라"를 찾을 필요 없이 작업하던 자리로 즉시 복귀함
* 카드의 VS 버튼 → 해당 프로젝트(fSnippet)의 VSCode 창·설정 파일로 이동

> Before → After: "창 3개를 오가며 찾기"에서 "카드 버튼 한 번으로 탭·세션 점프"로 바뀜
::::
:::: {.column width="60%"}
![hub 문서 카드의 VS 버튼 → 원본 세션(fSnippet)을 VSCode로 포커스](./img/screenshots/04-jump-vscode.png)
::::
:::

---

# 슬래시 커맨드로 통합 조작

::: columns
:::: {.column width="40%"}
* VSCode Claude Code 패널에서 `/fpm` 입력 → fPM 기능이 **슬래시 커맨드 목록**으로 뜸
* `/fpm-board`·`/fpm-hub`·`/fpm-show`·`/fpm-pm-do` 등 앞서 본 기능을 IDE 안에서 바로 호출
* 프로젝트 열기·세션 포커스·문서 렌더가 모두 에디터를 떠나지 않고 이어짐
::::
:::: {.column width="60%"}
![Claude Code 패널에서 /fpm 입력 → fpm-board·hub·show·pm-do 등 슬래시 커맨드 목록](./img/screenshots/04-fpm-commands.png)
::::
:::
