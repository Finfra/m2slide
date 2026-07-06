---
name: Info
description: fPmIntro_en project planning meta — English edition of the fPM intro deck
date: 2026-07-06
---

# Topic

fPM (finfra Project Manager) — a multi-project management and automation framework built on Claude Code, presented to Claude users as a high-quality presentation. English edition of `fPmIntro`.

# Audience

Claude Code users. Assumption: comfortable with basic Claude Code usage (prompts, tool calls) but new to fPM-specific systems like SCAR (Skill/Command/Agent/Rule), hub, and multi-project orchestration. Interested in automation and productivity.

# Length

30 minutes

# Style

Tutorial (demo-centric — an introduction that shows real behavior via video and screenshots)

# Learning Goals

* Understand what fPM is and how it differs from plain Claude Code usage
* Feel the behavior and value of hub mode (HTML render, live dashboard, Q&A form, SSE monitoring)
* See the VSCode ↔ dashboard integration workflow (Simple Browser panel, session focus, opening projects)
* Understand multi-project management (registry, number→path SSOT, cross-project dependencies / pm-do delegation)
* Know the first step to adopt fPM in your own environment

# Reference Candidates

* fPM hub-mode architecture (hub-mode-arch / hub_htm)
* fPM dashboard agent (Mode C / board)
* VSCode finfra.fpm-simple-browser extension integration
* Multi-project registry + number→path SSOT
* pm-do cross-project delegation + depends dependencies
* SCAR 3-tier layering (-g/-m/-w)
* nPTiR dev cycle (needs→Plan→Task→issue→Report)

# Deadline

TBD

# Build Options

* mode: chapter             # 30 min + 5 goals → chapter mode
* theme: default
* theme_default_layout: contents
* cover_enabled: true
* cover_layout: _cover
* markmap_depth: 2

# Media Plan

* media_mermaid: true       # architecture/flow diagrams (hub request→render, pm-do delegation flow, etc.)
* media_excalidraw: false
* media_infographic: false
* media_demo_video: true    # demo videos — reused from the Korean edition (hosted at finfra.kr)
* media_screenshot: true    # many screenshots — real screens of hub render, dashboard, VSCode panel
* design_mood: light theme, clean and concise layout, feature/structure focused (minimal decoration)
* image_style: real screenshots first, supporting diagrams minimal and monochrome

# Output Plan

* output_html: true
* output_epub: false
* output_subs_txt: false
* output_tts_txt: false

# Media Notes (English edition)

This deck is media-centric, with **demo videos** and **screenshots** appearing more often than a typical slide deck.

* **Videos**: reused as-is from the Korean edition, hosted at `finfra.kr` (external URL). Not re-recorded.
* **Screenshots**: real screens of the **Korean fPM UI** — hub render results, live dashboard, VSCode Simple Browser panel, session focus, opening projects. These show actual product UI and could not be recaptured in English, so they are kept as-is; only the surrounding text and image alt captions are translated.
* **Diagram**: the SVG system map (`fpm-system-map.svg`) had its text labels translated to English.

# TTS Text Rules

Not applied (output_tts_txt: false). Narration policy inherited from the Korean edition if TTS is ever enabled.
