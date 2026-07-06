---
title: "5. Multi-Project Management"
type: ppt
release_date: 2026-07-06
---

# Multi-Project Management — the cdf Family

* **The pain without it**: memorize dozens of project paths, `cd` around on every switch, and handle cross-project dependencies by hand
* fPM removes this cost with a **number → path registry** and the `cdf` family

::: htmlart process
* Register a number
  - projects/{number} = path SSOT
* cdf number
  - Instant jump (deterministic)
* Multi / split
  - iTerm2 panes · VSCode
* Name / frecency
  - Search even if you forget the number
:::

---

# Number → Path Registry

::: columns
:::: {.column width="40%"}
* Every project is registered by **number** (`projects/{number}` = path SSOT)
* Point to a project by a single number, no need to memorize paths
* The hub Project List shows number, domain (`-g`/`-m`/`-w`), path, and description in a table; double-click a row to open in VSCode
::::
:::: {.column width="60%"}
![Project List — a No./Project/Domain/Path/Description table plus an Open in VSCode button](./img/screenshots/05-project-list.png)
::::
:::

---

# cdf — Jump Instantly by Number

::: columns
:::: {.column width="40%"}
* In the terminal, one line `cdf <number>` **jumps instantly** to that project's directory
* `cdf 15` → the prompt switches straight to No. 15 (fSnippet, `~/_git/__all/fSnippet`)
* A number always points to the same path, so it's **deterministic** — your hands remember it
::::
:::: {.column width="60%"}
![Enter cdf 15 → the prompt jumps instantly to ~/_git/__all/fSnippet](./img/screenshots/05-cdf-demo.png)
::::
:::

---

# cdf Multiple Indices → iTerm2 Split

::: columns
:::: {.column width="40%"}
* Give several numbers like `cdf 15 16` and each opens in a **split iTerm2 pane**
* Place several projects side by side and work at once — no opening windows one by one
* On local macOS, iTerm2 splitting applies automatically (remote Linux: see the graceful-degrade in the next chapter)
::::
:::: {.column width="60%"}
![cdf 15 16 → top/bottom split iTerm2 panes each move to a different project](./img/screenshots/05-cdf-split.png)
::::
:::

---

# cdfv — Open in VSCode

::: columns
:::: {.column width="40%"}
* `cdfv <number>` **opens that project in VSCode** (the editor version of `cdf`)
* `cdfv 16` → opens No. 16 (fWarrange) in a VSCode window
* Give several numbers like `cdfv 0 1 2` to open multiple projects at once
::::
:::: {.column width="60%"}
![cdfv 16 → after 'Opening fWarrange', VSCode opens project No. 16](./img/screenshots/05-cdfv-demo.png)
::::
:::

---

# The cdf Family & Name / frecency

::: cards
* **cdf / cdf 11**
  - Show list / jump by number
* **cdff / cdfc**
  - Open Finder / copy path to clipboard
* **cdfv / cdft**
  - Open VSCode / manage tmux window·pane
* **cdfn / cdfvn**
  - Jump by name search / search then VSCode
:::

* **Name search**: `cdfn snippet` · `cdfn common` · `cdfvn snippet` (partial match, Korean supported)
* **frecency smart jump**: non-number args prefer recent visits + an fzf fuzzy-picker fallback

> Before → After: from "memorize path + cd" to "jump anywhere with one number or name"
