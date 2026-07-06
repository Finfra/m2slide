---
title: "6. Adopting fPM"
type: ppt
release_date: 2026-07-06
---

# Adopting fPM & Next Steps

* Here's the **first step to layer** the hub, dashboard, VSCode integration, cdf, pm-do, and sshf you've seen onto your own setup

::: htmlart process
* Install
  - One-line bootstrap
* Maintain
  - fpm update / upgrade
* Tune
  - hub Settings
* Practice
  - What to try today
:::

---

# One-Line Install

* GitHub repository: **`github.com/Finfra/fpm`**

```sh
# Public repo (raw URL directly)
curl -fsSL https://raw.githubusercontent.com/Finfra/fpm/main/sh/bootstrap.sh | sh

# Private repo (gh CLI auth)
gh api -H "Accept: application/vnd.github.raw" \
  repos/Finfra/fpm/contents/sh/bootstrap.sh | sh
```

* No git clone needed first — the bootstrap handles clone, setup, and plugin install at once
* Public is one raw-URL line; private is the same one line via `gh` auth

---

# Self-Update Commands

::: cards
* **fpm update**
  - git pull + reinstall + plugin update
* **fpm upgrade**
  - Upgrade to the latest tag
* **fpm version**
  - Check the current version
* **fpm uninstall**
  - Remove
:::

* Handle post-install maintenance with a single shell command
* To roll back, check `fpm version` then `upgrade` to a specific tag

---

# hub Settings — Basic

::: columns
:::: {.column width="40%"}
* In the **Basic** tab of hub Settings, adjust default behavior like browser and language
* **default browser** · **browser open** (auto-open) · **browser tab reuse** · **language**
* Recommended: Chrome for general work, Firefox for hub/dashboard — keeps tabs from mixing
::::
:::: {.column width="60%"}
![hub Settings Basic — default browser, browser open, browser tab reuse, and language settings](./img/screenshots/06-settings-basic.png)
::::
:::

---

# hub Settings — Sessions & Feed

::: columns
:::: {.column width="40%"}
* In the **Sessions** tab, adjust the display volume and refresh cadence of the session board and ActivityFeed
* **live session limit / order** · **card·search limit** · **feed limit / poll interval** (seconds)
* With many projects, raise the limits and feed poll interval to fit more on one screen or refresh more often
::::
:::: {.column width="60%"}
![hub Settings Sessions — adjust live session limit, card/search limit, feed limit, and poll interval](./img/screenshots/06-settings-sessions.png)
::::
:::

---

# Next Steps — SCAR Distribution & Integration

* **SCAR = the Claude Code plugin `fpm-core`** — marketplace repo **`github.com/Finfra/f-claude-plugins`**

```sh
# Install the SCAR bundle from the Claude Code marketplace
/plugin marketplace add Finfra/f-claude-plugins
/plugin install fpm-core
```

* **SCAR cross-tool export**: `scar-export` ports to Cursor (`.cursor/rules`), Codex (`AGENTS.md`), and Gemini (`GEMINI.md`) formats → eases tool lock-in
* **Applied example (prj4 social)**: a project actually running with SCAR-export artifacts (`CLAUDE.md`, `GEMINI.md`, `Harness.md`) layered on
* **GitHub bridge**: `gh-sync` opt-in sync between `Issue.md` ↔ GitHub Issues

---

# First Hands-On — Try It Now

::: htmlart step
* Install
  - Run the one-line bootstrap
* First hub render
  - ..show in a project folder
* Jump projects
  - Check cdf list → jump by number
* Long task
  - Watch progress with ..board
* Remote reach
  - Connect to a server with sshf
:::

> Picking just one thing you saw today and applying it right away is the fastest way to learn

---

# Start Together

```wordart
<h1 class="wordart-gradient" style="font-size:3em;margin:0.1em 0;">fPM</h1>
<p class="wordart-shadow" style="font-size:1.15em;color:#666;margin:0;">fPm handles the connections; I focus on the insight</p>
```

::: cards
* **GitHub**
  - github.com/Finfra/fpm
* **Technical inquiries**
  - finfra@gmail.com
:::
