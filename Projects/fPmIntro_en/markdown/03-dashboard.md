---
title: "3. Live Dashboard"
type: ppt
release_date: 2026-07-06
---

# Live Dashboard — ..board & SSE Monitoring

* **The pain without it**: long tasks stay dark until they finish, progress is invisible, and tracking several tasks at once is hard
* `..board` pushes task progress to a **live dashboard**
* Browser cards refresh themselves without you watching the terminal

::: htmlart process
* Run ..board
  - Start a runner in a tmux window
* SSE push
  - Server streams progress in real time
* Card refresh
  - The browser updates itself
* Completion alert
  - Auto elapsed time, result, artifacts
:::

---

# ..board — tmux Runner + Live Push

::: columns
:::: {.column width="40%"}
* `..board <topic>` launches a background runner in a tmux window
* The server pushes progress to the browser in real time via **SSE** (Server-Sent Events)
* Finite tasks auto-notify elapsed time, result, and artifacts on completion
* From a card, `Open ↗` for detail, `stop pid=…` to halt immediately
::::
:::: {.column width="60%"}
![..board run — a running card on the dashboard with Open/stop-pid buttons, plus runner/worker log paths on the right](./img/screenshots/03-board-running.png)
::::
:::

---

# Progress, Elapsed Time, Checklist

::: columns
:::: {.column width="40%"}
* The detail view shows status, pid, path, and mtime in a table, with progress cards listed below
* See **progress** (folders created/1000) · **latest 104/1000** · **elapsed 01:45** on one screen
* A completion checklist (✅ 100 → 500 → 1000) gauges the work remaining
::::
:::: {.column width="60%"}
![Dashboard detail — 10% progress, 104/1000 folders, 01:45 elapsed, plus a completion-criteria checklist](./img/screenshots/03-board-dashboard.png)
::::
:::

---

# hub vs ..board — When to Use Which

::: htmlart compare
* **..show (hub)** / One-off result, doc
  - Fixed at render time
  - No completion alert
  - Folder lists, reports
* **..board (dashboard)** / Long, repeated progress
  - SSE real-time push
  - Auto alert of time & result
  - 1000-item generation, big migrations
:::

* Short results → `..show`, long-running work → `..board` — pick by the situation

> Before → After: from "wait until it finishes" to "see in real time how far it's gotten"
