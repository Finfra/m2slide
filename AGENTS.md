# Repository Guidelines

## Project Structure & Module Organization
- `Projects/<Name>/markdown/`: Markdown sources (AGENDA.md + sections). Use `---` to split slides.
- `Projects/<Name>/slide/`: Generated HTML outputs (and copied EPUB if present).
- Scripts: `generate-slides.js` (HTML), `generate-epub.js` (EPUB), `convert.sh` (orchestrates both).
- Config: `config.yml` sets `current_project`. Docs and guides live at repo root (`README.md`, `CLAUDE.md`).

## Build, Test, and Development Commands
- `./convert.sh`: Build HTML for `config.yml`’s `current_project`.
- `./convert.sh Projects/LlmAndVibeCoding`: Build a specific project.
- `./convert.sh --epub` or `./convert.sh Projects/<Name> --epub`: Also generate EPUB and copy to `slide/`.
- `node generate-slides.js Projects/<Name>`: Direct HTML generation.
- `node generate-epub.js Projects/<Name>`: EPUB only. Mermaid support requires `@mermaid-js/mermaid-cli` and Chrome (`PUPPETEER_EXECUTABLE_PATH`).

## Coding Style & Naming Conventions
- Language: Node.js with standard library only (no external deps in generators).
- Indentation: 2 spaces; prefer descriptive names; avoid one-letter vars.
- Filenames: main `XX-title.md` (e.g., `01-opening.md`), sub `XX.Y-title.md` (e.g., `02.1-chat-based.md`).
- CSS: Do not change Reveal core layout (display/height/position/transform). Safe edits: overflow, padding, max-height, colors. See `CLAUDE.md` for examples.

## Testing Guidelines
- Build a project, then open `Projects/<Name>/slide/index.html` and the first chapter HTML.
- Verify: titles render on first slides, scrolling works, browser resize keeps layout, images copied to `slide/img/`.
- For EPUB: confirm `Projects/<Name>/<Name>.epub` exists and basic TOC renders.

## Commit & Pull Request Guidelines
- Commits: short, imperative summaries; optional scope prefix (e.g., `scripts:`, `slides:`). Keep changes focused.
- PRs: include description, linked issues, repro steps, and screenshots or sample HTML where UI changes. State which project was built for verification.
- Required checks: run `./convert.sh [--epub]`, open outputs, and ensure no Reveal layout regressions (per CSS rules).

## Security & Configuration Tips
- Edit `config.yml` to switch the active project. Avoid adding networked deps to generators. Mermaid is optional; without it, placeholder SVGs are produced.
