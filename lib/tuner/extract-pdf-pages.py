#!/usr/bin/env python3
"""extract-pdf-pages.py — pdftoppm wrapper for slide-tuner agent.

Extracts every page of a PDF as PNG using pdftoppm.

Usage:
    extract-pdf-pages.py <pdf_path> <out_dir> [--dpi 150] [--prefix pdf]

Outputs:
    <out_dir>/<prefix>-<NN>.png  (NN = zero-padded 1-based page index)

Exit codes:
    0 — success
    1 — input invalid or pdftoppm failed
"""
import argparse
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path


def main() -> int:
    p = argparse.ArgumentParser(description="Extract PDF pages as PNG via pdftoppm.")
    p.add_argument("pdf_path", help="Input PDF file path")
    p.add_argument("out_dir", help="Output directory (created if missing)")
    p.add_argument("--dpi", type=int, default=150, help="Render DPI (default: 150)")
    p.add_argument("--prefix", default="pdf", help="Output filename prefix (default: pdf)")
    args = p.parse_args()

    pdf = Path(args.pdf_path)
    out = Path(args.out_dir)

    if not pdf.is_file():
        print(f"error: pdf not found: {pdf}", file=sys.stderr)
        return 1
    if shutil.which("pdftoppm") is None:
        print("error: pdftoppm not installed", file=sys.stderr)
        return 1

    out.mkdir(parents=True, exist_ok=True)

    cmd = [
        "pdftoppm",
        "-r", str(args.dpi),
        "-png",
        str(pdf),
        str(out / args.prefix),
    ]
    rc = subprocess.run(cmd, capture_output=True, text=True)
    if rc.returncode != 0:
        print(f"error: pdftoppm rc={rc.returncode}", file=sys.stderr)
        print(rc.stderr, file=sys.stderr)
        return 1

    pages = sorted(out.glob(f"{args.prefix}-*.png"))
    if not pages:
        print("error: no pages produced", file=sys.stderr)
        return 1

    bad = [p for p in pages if p.stat().st_size < 1024]
    if bad:
        print(f"warn: {len(bad)} page(s) under 1KB (possibly empty)", file=sys.stderr)
        for b in bad:
            print(f"  {b.name} ({b.stat().st_size}B)", file=sys.stderr)

    print(f"extracted {len(pages)} pages → {out}/")
    for pg in pages:
        print(f"  {pg.name} ({pg.stat().st_size}B)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
