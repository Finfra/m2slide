---
name: open
description: "m2slide 프로젝트 슬라이드를 빌드 없이 브라우저로 연다 (.claude/skills/open-project.sh 래퍼). 인자로 프로젝트명 지정 가능, 생략 시 IDE 컨텍스트에서 자동 감지. cmd+r 키바인딩과 동일 동작."
date: 2026-07-12
---

# 역할

`Projects/<Name>/` 프로젝트의 빌드 산출물(`slide/`)을 **재빌드 없이** Google Chrome으로 여는 프로젝트 로컬 커맨드. `slide/` 가 없으면 최초 1회만 빌드한다. 재빌드 + 열기는 [`/run`](run.md) 담당 — 역할 분리:

| 커맨드 | 빌드              | 열기 |
| :----- | :---------------- | :--- |
| `/run` | 항상 (clean 재빌드) | ✅   |
| `/open`| `slide/` 없을 때만 | ✅   |

prj46(unity_base) `/open` 패턴 이식 — 커맨드 = 쉘 스크립트 래퍼.

# 사용법

```
/open [프로젝트명]
```

# 프로젝트명 결정 우선순위

| 순위 | 소스         | 조건                                                                     |
| :--- | :----------- | :------------------------------------------------------------------------ |
| 1    | `$ARGUMENTS` | 사용자가 `/open xxx` 명시                                                  |
| 2    | IDE 컨텍스트 | `<ide_opened_file>` / `<ide_selection>` 경로에서 `Projects/([^/]+)/` 캡처 |
| 3    | 실패         | 프로젝트 목록 표시 후 종료 (default 없음 — 의도치 않은 프로젝트 열림 방지) |

# 실행

```bash
bash .claude/skills/open-project.sh "${프로젝트명 또는 IDE 파일 절대경로}"
```

* 스크립트가 파일 경로를 받으면 `Projects/<name>/` 캡처로 자체 해석 — IDE 컨텍스트 경로를 그대로 넘겨도 됨
* 결정 근거 1줄 보고 (ex: "IDE 컨텍스트에서 `AgenticCoding` 감지")
* 실행 결과(stdout/stderr) 사용자에게 전달 후 종료 — 브라우저 실행은 스크립트가 처리 (AppleScript Chrome 새 탭 + activate, shell `open -a` 미사용)

# cmd+r 키바인딩 (VSCode)

같은 스크립트를 VSCode에서 **cmd+r** 로 직접 실행 가능 (Claude 미경유):

* `.vscode/tasks.json` — task `open-current-project` 가 `${file}` 을 스크립트에 전달
* 유저 `keybindings.json` — `cmd+r` → `workbench.action.tasks.runTask` (`when: resourcePath =~ /m2slide\/Projects/`)
* prj45(CSharp_base) `run-current-example` (cmd+r → `dotnet run`) 과 동일 패턴

# 사용 예

```
/open                    # IDE에서 열린 파일의 프로젝트
/open AgenticCoding      # 명시 지정
/open layoutTest --dry-run 는 없음 — dry-run은 스크립트 직접 호출 시만
```
