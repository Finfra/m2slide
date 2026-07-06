---
title: "4. VSCode Integration"
type: ppt
release_date: 2026-07-06
---

# VSCode ↔ Dashboard Integration

* **The pain without it**: context breaks jumping between browser, terminal, and editor windows
* Solves the desire to **work and check results together** inside one screen (the IDE)

::: cards
* **↗ Named browser tab**
  - Open a doc as a named tab
* **VS original session**
  - Focus the session that made the doc
* **/fpm-* slash commands**
  - Call fPM features inside the IDE
:::

---

# Jump from a Card to a Named Browser Tab

::: columns
:::: {.column width="40%"}
* The **↗ button** on a hub doc card opens that doc as a **named browser tab**
* The tab title reads meaningfully, like `fSnippet — Issue941 commit`, so many tabs don't confuse you
* Re-opening the same doc focuses that tab instead of making a new one
::::
:::: {.column width="60%"}
![The ↗ button on a hub doc card → jump to a tab named 'fSnippet — Issue941 commit'](./img/screenshots/04-jump-tab.png)
::::
:::

---

# Return to the Session That Made the Doc

::: columns
:::: {.column width="40%"}
* The **VS button** on a hub doc card **focuses the original session** that made it, in VSCode
* No need to hunt "who made this result" — jump straight back to where you were working
* The card's VS button → moves to that project's (fSnippet) VSCode window and config file

> Before → After: from "juggling three windows to find it" to "tab/session jump with one card button"
::::
:::: {.column width="60%"}
![The VS button on a hub doc card → focus the original session (fSnippet) in VSCode](./img/screenshots/04-jump-vscode.png)
::::
:::

---

# Unified Control via Slash Commands

::: columns
:::: {.column width="40%"}
* In the VSCode Claude Code panel, type `/fpm` → fPM features appear as a **slash-command list**
* Call features you've seen — `/fpm-board` · `/fpm-hub` · `/fpm-show` · `/fpm-pm-do` — right inside the IDE
* Opening projects, focusing sessions, and rendering docs all continue without leaving the editor
::::
:::: {.column width="60%"}
![Type /fpm in the Claude Code panel → a slash-command list of fpm-board, hub, show, pm-do, etc.](./img/screenshots/04-fpm-commands.png)
::::
:::
