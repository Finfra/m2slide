#!/usr/bin/env python3
"""build-pairing.py — pair slides ↔ PDF pages for slide-tuner agent.

Reads Projects/<P>/markdown/AGENDA.md + _config.yml, computes the offset
between slide indices and PDF page numbers (accounting for cover/agenda
pre-pended pages), and emits pairing.yml describing the 1:1 mapping.

Usage:
    build-pairing.py <project_dir> <capture_dir>

Outputs:
    <capture_dir>/pairing.yml

Exit codes:
    0 — success
    1 — input invalid or mapping mismatch
"""
import argparse
import re
import sys
from pathlib import Path


def parse_config(config_path: Path) -> dict:
    """Minimal yaml read — depends on PyYAML if available, else manual line scan."""
    cfg: dict = {}
    if not config_path.is_file():
        return cfg
    try:
        import yaml  # type: ignore
        with config_path.open() as f:
            data = yaml.safe_load(f) or {}
        if isinstance(data, dict):
            cfg.update(data)
        return cfg
    except ImportError:
        pass
    # fallback: scan key: value lines (top-level only)
    pattern = re.compile(r"^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.+?)\s*(?:#.*)?$")
    with config_path.open() as f:
        for line in f:
            m = pattern.match(line)
            if not m:
                continue
            key, val = m.group(1), m.group(2).strip().strip('"').strip("'")
            if val.lower() in ("true", "false"):
                cfg[key] = val.lower() == "true"
            else:
                cfg[key] = val
    return cfg


def parse_agenda(agenda_path: Path) -> list[tuple[str, str]]:
    """Returns [(title, filename), ...] for H2 inline links."""
    chapters = []
    if not agenda_path.is_file():
        return chapters
    pat = re.compile(r"^##\s+\[([^\]]+)\]\(\./([^)]+\.md)\)")
    for line in agenda_path.read_text().splitlines():
        m = pat.match(line.strip())
        if m:
            chapters.append((m.group(1), m.group(2)))
    return chapters


def count_h1_slides(md_path: Path) -> int:
    """Count `^# ` headers as slide units (m2slide convention)."""
    if not md_path.is_file():
        return 0
    n = 0
    in_frontmatter = False
    in_code = False
    for i, line in enumerate(md_path.read_text().splitlines()):
        s = line.rstrip()
        if i == 0 and s == "---":
            in_frontmatter = True
            continue
        if in_frontmatter:
            if s == "---":
                in_frontmatter = False
            continue
        if s.startswith("```"):
            in_code = not in_code
            continue
        if in_code:
            continue
        if re.match(r"^# [^#]", s):
            n += 1
    return n


def query_devserver_slide_count(project_name: str, chap_idx: int, port: int = 9877) -> int | None:
    """Query dev-server text-mode for actual slide count.

    Returns slide count from "slide N/M" in nav, or None on failure.
    """
    import urllib.request
    import urllib.error
    try:
        url = f"http://localhost:{port}/p/{project_name}/s/{chap_idx}/1?mode=text"
        with urllib.request.urlopen(url, timeout=2) as r:
            body = r.read().decode("utf-8", errors="replace")
        m = re.search(r"slide <b>\d+</b>/(\d+)", body)
        return int(m.group(1)) if m else None
    except (urllib.error.URLError, OSError, ValueError):
        return None


def main() -> int:
    p = argparse.ArgumentParser(description="Build slide ↔ PDF page pairing.")
    p.add_argument("project_dir", help="Projects/<Name> path")
    p.add_argument("capture_dir", help="Directory containing pdf-NN.png and slide-cN-sM.png")
    p.add_argument("--pdf-prefix", default="pdf", help="PDF page filename prefix")
    p.add_argument("--pdf-offset", type=int, default=0, help="PDF page offset (skip N pages at start)")
    args = p.parse_args()

    proj = Path(args.project_dir).resolve()
    cap = Path(args.capture_dir).resolve()
    if not proj.is_dir():
        print(f"error: project dir not found: {proj}", file=sys.stderr)
        return 1
    if not cap.is_dir():
        print(f"error: capture dir not found: {cap}", file=sys.stderr)
        return 1

    project_name = proj.name
    config_path = proj / "_config.yml"
    cfg = parse_config(config_path)
    cover_enabled = bool(cfg.get("cover_enabled", False))

    agenda_path = proj / "markdown" / "AGENDA.md"
    chapters = parse_agenda(agenda_path)

    # chapter mode (AGENDA exists with H2 links) vs single mode
    chapter_info = []
    if chapters:
        for ci, (title, fname) in enumerate(chapters, start=1):
            n_h1 = count_h1_slides(proj / "markdown" / fname)
            # Prefer dev-server actual count (handles cover/agenda/toc prepends accurately)
            n_live = query_devserver_slide_count(project_name, ci)
            n = n_live if n_live is not None else n_h1
            chapter_info.append({
                "title": title,
                "file": fname,
                "h1_count": n_h1,
                "actual_count": n,
                "source": "dev-server" if n_live is not None else "h1-fallback",
            })
    else:
        # single mode — find first .md in project root that isn't AGENDA
        single_md = next((p for p in proj.glob("*.md") if p.name not in ("README.md", "AGENDA.md")), None)
        if single_md:
            n_h1 = count_h1_slides(single_md)
            n_live = query_devserver_slide_count(project_name, 1)
            n = n_live if n_live is not None else (n_h1 + (1 if cover_enabled else 0))
            chapter_info.append({
                "title": project_name,
                "file": single_md.name,
                "h1_count": n_h1,
                "actual_count": n,
                "source": "dev-server" if n_live is not None else "h1-fallback",
            })

    total_slides = sum(c["actual_count"] for c in chapter_info)

    # Count PDF pages from capture_dir
    pdf_pages = sorted(cap.glob(f"{args.pdf_prefix}-*.png"))
    total_pdf_pages = len(pdf_pages)

    # offset heuristic: PDF page 1 = cover (if cover_enabled), so chapter1 starts at PDF p2
    # For chapter mode with cover, PDF p1=cover for chapter1, p2..p(1+h1_count_chap1-1)=chapter1 body
    # Actually m2slide cover prepends to first chapter's first slide → that's 1 slide.
    offset_rationale_parts = []
    chap_pdf_starts = []
    pdf_cursor = 1 + args.pdf_offset  # 1-based PDF page, skip global cover/intro pages
    for idx, c in enumerate(chapter_info):
        chap_pdf_starts.append(pdf_cursor)
        pdf_cursor += c["actual_count"]

    # build mapping
    mapping = []
    for ci, c in enumerate(chapter_info, start=1):
        pdf_start = chap_pdf_starts[ci - 1]
        for si in range(1, c["actual_count"] + 1):
            slide_capture = f"slide-c{ci}-s{si}.png"
            pdf_name = f"{args.pdf_prefix}-{pdf_start + si - 1:02d}.png"
            mapping.append({
                "chap": ci,
                "slide": si,
                "title": c["title"] if si == 1 else "",
                "capture": slide_capture,
                "pdf": pdf_name,
            })

    # YAML emit (manual — no PyYAML dependency)
    lines = []
    lines.append(f"project: {project_name}")
    lines.append(f"total_slides: {total_slides}")
    lines.append(f"total_pdf_pages: {total_pdf_pages}")
    lines.append(f"cover_enabled: {str(cover_enabled).lower()}")
    lines.append(f"pdf_offset: {args.pdf_offset}")
    lines.append("chapters:")
    for ci, c in enumerate(chapter_info, start=1):
        lines.append(f"  - chap: {ci}")
        lines.append(f"    title: {c['title']!r}")
        lines.append(f"    file: {c['file']}")
        lines.append(f"    h1_count: {c['h1_count']}")
        lines.append(f"    actual_count: {c['actual_count']}")
        lines.append(f"    count_source: {c['source']}")
        lines.append(f"    pdf_start: {chap_pdf_starts[ci - 1]}")
    lines.append("mapping:")
    for m in mapping:
        lines.append(f"  - chap: {m['chap']}")
        lines.append(f"    slide: {m['slide']}")
        if m["title"]:
            lines.append(f"    title: {m['title']!r}")
        lines.append(f"    capture: {m['capture']}")
        lines.append(f"    pdf: {m['pdf']}")

    out_yml = cap / "pairing.yml"
    out_yml.write_text("\n".join(lines) + "\n")

    print(f"pairing → {out_yml}")
    print(f"  total_slides={total_slides}  total_pdf_pages={total_pdf_pages}  chapters={len(chapter_info)}")
    if total_slides > total_pdf_pages:
        print(f"warn: slides ({total_slides}) > pdf_pages ({total_pdf_pages})", file=sys.stderr)
    elif total_slides < total_pdf_pages:
        diff = total_pdf_pages - total_slides
        print(f"info: pdf has {diff} extra page(s) beyond slides — may include agenda/toc pages", file=sys.stderr)

    return 0


if __name__ == "__main__":
    sys.exit(main())
