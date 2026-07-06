---
name: Info
description: m2slide_info_en project planning meta
date: 2026-07-06
---

# Topic

An introduction to the m2slide tool itself (explanatory) — presenting the identity, project structure, core features, and workflow of the Markdown → Reveal.js slide authoring tool m2slide as a standalone, self-readable reference. English edition of `m2slide_info`.

# Audience

Potential m2slide users — developers, technical presenters, educators. Comfortable with basic Markdown syntax. Prior experience with Reveal.js or PPT tools helps but is not required.

# Length

5 chapters (about 15 minutes to read)

# Style

Explanatory material — written prose, objective narration. Avoids talk-style phrasing (you-all, today, hands-on). A reference document meant to read independently after distribution.

# Learning Goals

* Explain what m2slide is in one line
* Understand **why** m2slide is needed versus PPT and plain Reveal.js
* Judge **where** to use it — lectures, talks, internal docs, PPT migration, and more
* Grasp m2slide's **strengths** — built-in components, multi-format output, file:// deployment, two-way PPT conversion, AI authoring pipeline
* Usage (install, build commands, Markdown syntax) is out of scope — pointed to README and authoring pipeline docs

# Reference Candidates

* m2slide GitHub / README
* Reveal.js official docs
* m2slide CLAUDE.md and _doc_arch design docs
* Example projects under Projects/ (AgenticCoding, m2Slide, etc.)

# Deadline

2026-07-31

# Build Options

* mode: chapter              # chapter mode (AGENDA.md + per-chapter HTML)
* theme: default_lec         # official lecture theme
* theme_default_layout: contents
* cover_enabled: true        # auto-inject cover as first slide
* cover_layout: _cover
* markmap_depth: 2           # TOC mind-map initial expand depth

# Media Plan

* media_mermaid: true        # pipeline flow and structure diagrams
* media_excalidraw: false
* media_infographic: true    # htmlArt/cards/d3 live-render examples (dogfooding the tool's features)
* media_demo_video: false    # dropped (concept switched to explanatory)
* design_mood: dark technical theme, code/terminal feel, slate background with bright accent
* image_style: minimal tech illustration, dark background, cyan/teal accent

# Output Plan

* output_html: true          # Reveal.js HTML slides — required
* output_epub: true          # EPUB e-book alongside — also demoing m2slide's own feature
* output_subs_txt: false     # no subtitle .txt
* output_tts_txt: false      # no TTS synthesis

# TTS Text Rules

Not applied (output_tts_txt: false).

# Chapter Layout

Chapter mode. Excludes how-to (full syntax/config keys); centers on why/where/strengths plus minimal install and demo links as proof.

```
00. Cover (auto-injected)
01. What is m2slide? — one-line identity, three questions, 2-line install + GitHub/online demo links
02. Why It Matters — limits of PPT and plain Reveal.js, the gap m2slide fills
03. Where to Use It — lectures, talks, internal docs, PPT migration scenarios
04. Strengths of m2slide — built-in components, multi-format output, file:// deploy, two-way PPT conversion, AI authoring pipeline
05. Wrap-up — key takeaways, next steps, link to the fuller overview (m2Slide brochure)
```

# Notes

1. **English edition**: Translated from the Korean `m2slide_info` project. Content parity maintained; code-block labels (mermaid graph nodes, chart.js labels/dataset) translated to English.
2. **Concept lineage** (inherited from source): Originally a demo-centric showcase (recorded video + screenshots), later switched to an explanatory intro of the tool itself. Recording scenarios, video embeds, and screenshot placeholders were all removed.
3. **Dogfooding kept minimal**: Chapter 04 (Strengths) keeps a single chart.js example to show "built-in components actually work," without a full component catalog.
4. **Role separation**: The brochure-style `m2Slide` and explanatory `m2slide_info` keep separate roles; this English edition mirrors the explanatory one.
5. **No inserted images**: Source project left images out by user decision; this edition follows suit (empty img/).
