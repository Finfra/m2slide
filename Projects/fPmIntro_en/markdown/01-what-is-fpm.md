---
title: "1. Why fPM"
type: ppt
release_date: 2026-07-06
---

# Why fPM — the Limits of Plain Claude Code

* fPM (finfra Project Manager) is a **multi-project automation framework** layered on top of Claude Code
* Before listing features, this chapter first asks **"what's painful about using Claude Code alone?"**
* For each pain point, we map how fPM solves it, one to one
* The remaining chapters prove each pain with real screens, one at a time

---

# The fPM Map — at a Glance

![The fPM map — six automation layers (hub, dashboard, VSCode integration, cdf, pm-do, sshf) stacked on top of Claude Code, with SCAR as the foundation](./img/diagrams/fpm-system-map.svg)

---

# 30-Second Preview — Full fPM Demo

<div style="max-width:80%;margin:0.3rem auto 0;">
  <p style="text-align:center;font-size:0.6em;line-height:1.5;color:#555;margin:0 0 0.5rem;">
    A combined demo compressing the whole flow — <strong>hub render → live dashboard → jumping across projects</strong>. For now, just get a sense that "this is possible" (each scene is detailed later)
  </p>
  <video controls src="https://finfra.kr/mp4/00-fpm-overview.mp4" style="width:100%;display:block;border-radius:14px;box-shadow:0 6px 24px rgba(0,0,0,0.18);"></video>
</div>

---

# Pain of Using Claude Code Alone

::: htmlart block
* Results evaporate
  - Hard to re-find or share answers with tables and structure
* Long tasks go dark
  - No progress until a build or migration finishes
* Project-switching cost
  - Memorize dozens of paths and `cd` around
* Manual dependencies
  - Track "finish A before starting B" every time
* Window-switching fatigue
  - Context breaks jumping between terminal, browser, editor
* Remote servers
  - Memorize each server's login and adapt to a different way
:::

> These six are not "occasional annoyances" — they're **costs repeated every day**

---

# Mapping Each Pain → an fPM Feature

::: htmlart block
* Results evaporate → hub render
  - ..show turns an answer into an HTML doc
* Long tasks go dark → ..board
  - SSE pushes progress in real time
* Window fatigue → VSCode integration
  - Tab / session jump · /fpm-*
* Project switching → cdf family
  - Move with a single number or name
* Manual dependencies → pm-do · depends
  - Auto-delegate prerequisites and order
* Remote servers → sshf
  - Connect by number or name
:::

* Each pain is the very **reason a feature exists** — not "nice to have," but "the fix for a problem you'd otherwise face"
* From the next chapter, we verify each feature on a real screen

---

# The Backbone of fPM — SCAR 3-tier

* fPM manages all automation as **SCAR** units (Skill / Command / Agent / Rule), reused in three layers by domain suffix — a rule defined once **propagates to every project**

::: htmlart pyramid
* Shared SSOT (-g)
  - Shared by all projects
* macOS domain (-m)
  - App build & deploy
* web domain (-w)
  - Web dev cycle
:::

* hub, cdf, and pm-do all run on top of this SCAR system

---

# What You'll See in This Deck

::: htmlart chevron
* 2. Hub render / Q&A
* 3. Live dashboard
* 4. VSCode integration
* 5. Multi-project
* 6. Getting started
:::

* Each chapter runs **"the pain without it → fPM's fix → Before/After"**
* Watch how one framework weaves six pains into a single flow
