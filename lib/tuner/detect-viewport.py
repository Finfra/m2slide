#!/usr/bin/env python3
"""detect-viewport.py — choose Playwright viewport size from project slide_ratio.

Reads Projects/<Name>/_config.yml `slide_ratio` (default 16:9) and emits
JSON {width, height, ratio} for Playwright screenshot calls.

Usage:
    detect-viewport.py <project_dir>

Mapping:
    3:2  → 1920x1280
    16:9 → 1920x1080
    16:10 → 1920x1200
    4:3  → 1920x1440
    (else) → 1920x1080

Exit codes:
    0 — success
    1 — project dir invalid
"""
import argparse
import json
import re
import sys
from pathlib import Path

RATIO_MAP = {
    "3:2": (1920, 1280),
    "16:9": (1920, 1080),
    "16:10": (1920, 1200),
    "4:3": (1920, 1440),
}
DEFAULT = (1920, 1080)


def read_ratio(config_path: Path) -> str:
    if not config_path.is_file():
        return "16:9"
    pat = re.compile(r"^slide_ratio\s*:\s*[\"']?([0-9]+:[0-9]+)[\"']?")
    for line in config_path.read_text().splitlines():
        m = pat.match(line.strip())
        if m:
            return m.group(1)
    return "16:9"


def main() -> int:
    p = argparse.ArgumentParser(description="Detect Playwright viewport from slide_ratio.")
    p.add_argument("project_dir", help="Projects/<Name> path")
    args = p.parse_args()

    proj = Path(args.project_dir).resolve()
    if not proj.is_dir():
        print(f"error: project dir not found: {proj}", file=sys.stderr)
        return 1

    ratio = read_ratio(proj / "_config.yml")
    width, height = RATIO_MAP.get(ratio, DEFAULT)
    out = {"width": width, "height": height, "ratio": ratio}
    print(json.dumps(out, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
