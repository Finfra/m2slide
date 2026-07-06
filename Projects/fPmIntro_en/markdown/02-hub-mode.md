---
title: "2. Hub Mode"
type: ppt
release_date: 2026-07-06
---

# Hub Mode — HTML Render & Q&A Form

* **The pain without it**: chat answers evaporate, structures like tables and diagrams are hard to express, and they're hard to find again later
* Hub mode answers the desire to "see the result as a document"
* Just add one trigger word to the prompt — no extra tool, no copy-paste

::: cards
* **..show**
  - Render the answer as a full HTML document
* **..ask**
  - Present choices as a Q&A form and auto-collect
* **..board**
  - Push progress to a live dashboard
:::

---

# ..show — Turn the Answer into an HTML Doc

::: columns
:::: {.column width="40%"}
* Add `..show` to a prompt and the answer renders as a **full HTML document**
* Tables, code blocks, and mermaid all show up cleanly
* It stays as a file/link to re-open or share later
* "What's in the Desktop folder? ..show" → renders in the Simple Browser panel
::::
:::: {.column width="60%"}
![A Desktop-folder question with ..show → the Simple Browser panel renders a table and folder list as HTML](./img/screenshots/02-show-demo.png)
::::
:::

---

# Hub Overview — Projects, Sessions, Docs at a Glance

::: columns
:::: {.column width="40%"}
* On the hub screen (`jm4.local:9876/hub-shell`), see per-project **active sessions**, the **ActivityFeed**, and **generated docs** together
* The top summary shows current state in one line, like `11 live session · 200 hub doc`
* The ActivityFeed on the right streams session-complete and commit events in real time
::::
:::: {.column width="60%"}
![Hub overview — a grid of per-project session cards plus a real-time ActivityFeed on the right](./img/screenshots/02-hub-overview.png)
::::
:::

---

# Active Sessions — Which Project Is Doing What

::: columns
:::: {.column width="40%"}
* The session grid lists the **title of the session running now** on each project card
* Per-project concurrent counts show as badges, like `___pm(4)` · `fBoard(2)` · `m2slide(2)`
* Grasp "which window was I doing what in?" on one screen, without window switching

> Before → After: "progress scattered across chats" gathers into "a per-project session board"
::::
:::: {.column width="60%"}
![Active sessions grid — each project's card shows the in-progress task title](./img/screenshots/02-hub-sessions.png)
::::
:::

---

# View from Mobile and Remote Too

::: htmlart process
* Generate QR
  - The hub `/qr` page provides a responsive QR
* Scan
  - Scan with a phone on the same Wi-Fi
* View
  - See the same result doc on the spot
* Share
  - One link/QR during a talk or review
:::

* Works with **no external service dependency** via LAN IP bind + offline vendored QR
