#!/usr/bin/env python3
"""aggregate-feedback.py — slide-tuner round 결과를 집계하여 promotion 후보 생성.

Issue245 Phase A. 단일 round-N.md를 입력으로 받아 카드별 카테고리를 카운트하고,
data/slide-tuner/patterns.yml의 promotion.thresholds를 초과하는 카테고리에 대해
data/_proposals/promotion-<ts>-<category>.md 후보 파일을 생성한다.

사용자가 후보 파일을 Phase B(promotion 폼)에서 검토하여 해당 data/<stage>/*.yml
에 머지 여부를 결정한다.

Usage:
    aggregate-feedback.py <round_md_path>
    aggregate-feedback.py _doc_work/tuner/<ts>/round-1.md
    aggregate-feedback.py --tuner-dir _doc_work/tuner/<ts>     # 폴더 내 모든 round md 합산

Exit codes:
    0 — 후보 1건 이상 작성됨
    1 — 후보 없음 (모든 카테고리가 임계치 미만)
    2 — 입력 파일 누락·파싱 실패
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional


REPO_ROOT_MARKER = "m2slide.sh"


def find_repo_root(start: Path) -> Path:
    """현재 디렉토리부터 위로 올라가며 m2slide repo 루트 탐색."""
    cur = start.resolve()
    for _ in range(10):
        if (cur / REPO_ROOT_MARKER).exists():
            return cur
        if cur.parent == cur:
            break
        cur = cur.parent
    return start.resolve()


def load_patterns_yml(repo_root: Path) -> dict:
    """patterns.yml 로드. PyYAML 없으면 fallback default."""
    path = repo_root / "data" / "slide-tuner" / "patterns.yml"
    if not path.exists():
        return {}
    try:
        import yaml  # type: ignore
        with path.open() as f:
            return yaml.safe_load(f) or {}
    except ImportError:
        return {}


def default_promotion_config() -> dict:
    """patterns.yml 로드 실패 시 사용할 기본 정책."""
    return {
        "enabled": True,
        "thresholds": {
            "novel": 1,
            "text_diff": 3,
            "md_literal_needed": 3,
            "ok_checked": -1,
        },
        "target_yml": {
            "novel": "data/slide-tuner/patterns.yml (신규 카테고리 추가)",
            "text_diff": "data/md-builder/styles.yml",
            "md_literal_needed": "data/md-builder/styles.yml",
        },
        "output": {
            "path_pattern": "data/_proposals/promotion-{ts}-{category}.md",
        },
    }


@dataclass
class RoundCard:
    """round-N.md 카드별 처리 표의 한 행."""
    slide_id: str
    category: str
    action: str


@dataclass
class RoundData:
    """단일 round 파싱 결과."""
    round_md_path: Path
    ts: str                            # 폴더명에서 추출 (1779801709 등)
    round_n: Optional[int] = None      # round-1.md → 1
    cards: List[RoundCard] = field(default_factory=list)


_CARDS_HEADER_RE = re.compile(r"^#{1,3}\s*카드별\s*처리\s*$", re.MULTILINE)
_TABLE_ROW_RE = re.compile(r"^\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$")
_SEP_RE = re.compile(r"^\|[\s:|-]+\|$")
_BOLD_RE = re.compile(r"\*\*(.+?)\*\*")
_CATEGORY_KNOWN = {"ok_checked", "md_literal_needed", "text_diff", "novel"}


def _strip_bold(s: str) -> str:
    return _BOLD_RE.sub(r"\1", s).strip()


def _extract_category(raw: str) -> str:
    """'novel → 사용자 옵션 A 채택' 같은 셀에서 카테고리 추출."""
    s = _strip_bold(raw)
    # 첫 화살표/슬래시/공백 토큰만
    tok = re.split(r"[→/\s]", s, maxsplit=1)[0].strip()
    if tok in _CATEGORY_KNOWN:
        return tok
    # known set 매칭 실패 — 전체 문자열에 known 키워드가 있는지
    for known in _CATEGORY_KNOWN:
        if known in s:
            return known
    return "unknown"


def parse_round_md(md_path: Path) -> RoundData:
    """round-N.md 파싱. # 카드별 처리 섹션의 표에서 슬라이드+카테고리 추출."""
    text = md_path.read_text(encoding="utf-8")
    ts = md_path.parent.name
    m = re.match(r"round-(\d+)", md_path.stem)
    round_n = int(m.group(1)) if m else None

    data = RoundData(round_md_path=md_path, ts=ts, round_n=round_n)

    header_match = _CARDS_HEADER_RE.search(text)
    if not header_match:
        return data

    after_header = text[header_match.end():]
    lines = after_header.splitlines()
    in_table = False
    seen_header = False
    for line in lines:
        line = line.strip()
        if not in_table:
            if line.startswith("|"):
                in_table = True
                seen_header = False
            else:
                continue
        if not line.startswith("|"):
            break
        if _SEP_RE.match(line):
            seen_header = True
            continue
        row = _TABLE_ROW_RE.match(line)
        if not row:
            continue
        if not seen_header:
            # header row — skip
            continue
        slide_id, cat_raw, action = row.group(1), row.group(2), row.group(3)
        data.cards.append(RoundCard(
            slide_id=_strip_bold(slide_id),
            category=_extract_category(cat_raw),
            action=_strip_bold(action),
        ))

    return data


def collect_round_files(target: Path) -> List[Path]:
    if target.is_file():
        return [target]
    if target.is_dir():
        return sorted(target.glob("round-*.md"))
    return []


def aggregate(rounds: List[RoundData]) -> Dict[str, List[RoundCard]]:
    """카테고리별 카드 누적."""
    by_category: Dict[str, List[RoundCard]] = {}
    for rd in rounds:
        for c in rd.cards:
            by_category.setdefault(c.category, []).append(c)
    return by_category


def write_promotion_md(
    repo_root: Path,
    category: str,
    cards: List[RoundCard],
    threshold: int,
    target_yml: str,
    ts: str,
    round_md_paths: List[Path],
) -> Path:
    proposals_dir = repo_root / "data" / "_proposals"
    proposals_dir.mkdir(parents=True, exist_ok=True)
    out = proposals_dir / f"promotion-{ts}-{category}.md"

    now = datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d")
    slide_ids = sorted({c.slide_id for c in cards})
    sources = "\n".join(f"    - `{p.resolve().relative_to(repo_root)}`" for p in round_md_paths)

    lines = [
        "---",
        f"name: {out.stem}",
        f"description: slide-tuner round 결과 promotion 후보 — category={category}",
        f"date: {now}",
        f"issue: Issue245",
        f"category: {category}",
        f"round_ts: {ts}",
        f"count: {len(cards)}",
        f"threshold: {threshold}",
        f"status: pending",
        "---",
        "",
        f"# Promotion 후보 — {category}",
        "",
        f"slide-tuner round 결과 `{category}` 카테고리가 임계치(`{threshold}`)를 충족.",
        "Phase B promotion 폼에서 사용자 컨펌 후 아래 yml에 머지하거나 기각한다.",
        "",
        "# 발생 슬라이드",
        "",
    ]
    for sid in slide_ids:
        actions = sorted({c.action for c in cards if c.slide_id == sid})
        lines.append(f"* `{sid}` — action: {' / '.join(actions) if actions else '(없음)'}")

    lines += [
        "",
        "# 추정 적용 대상 yml",
        "",
        f"* `{target_yml}`",
        "",
        "# 머지 검토 가이드",
        "",
    ]
    if category == "novel":
        lines += [
            "* `_proposals/tuner-*-novel-*.md` 파일을 함께 검토하여 공통 패턴 추출",
            "* 공통 패턴이면 `data/slide-tuner/patterns.yml`에 신규 카테고리 추가",
            "* 키워드·trigger·action·target_pattern 명세 후 다음 라운드에 활용",
        ]
    elif category == "text_diff":
        lines += [
            "* 같은 종류 텍스트 차이가 반복되면 `data/md-builder/styles.yml`에 패턴 룰 추가",
            "* (예: 영문 단어 사이 공백 누락, 특정 약어 한글 풀이 등)",
            "* 머지 전 해당 슬라이드 원본 PDF + md 텍스트 diff 비교",
        ]
    elif category == "md_literal_needed":
        lines += [
            "* 같은 종류 인라인 syntax가 반복 literal 처리되면 `data/md-builder/styles.yml`에 자동 백틱 wrap 룰 추가",
            "* candidates 후보 패턴(`[$alt]($url)` 등)을 styles.yml에 정책으로 승격",
        ]
    else:
        lines += [
            f"* 카테고리 `{category}` 패턴을 검토하여 적절한 stage data yml에 머지",
        ]

    lines += [
        "",
        "# 입력 round 파일",
        "",
        sources,
        "",
    ]

    out.write_text("\n".join(lines), encoding="utf-8")
    return out


def main(argv: List[str]) -> int:
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("target", nargs="?", help="round-N.md 또는 _doc_work/tuner/<ts>/ 폴더")
    p.add_argument("--tuner-dir", dest="tuner_dir", help="대안 폴더 입력")
    p.add_argument("--repo-root", help="m2slide repo 루트 override")
    args = p.parse_args(argv)

    target_str = args.target or args.tuner_dir
    if not target_str:
        print("error: round md 경로 또는 --tuner-dir 필요", file=sys.stderr)
        return 2
    target = Path(target_str)
    if not target.exists():
        print(f"error: 경로 없음 — {target}", file=sys.stderr)
        return 2

    repo_root = Path(args.repo_root).resolve() if args.repo_root else find_repo_root(target.parent)

    cfg_root = load_patterns_yml(repo_root)
    promotion_cfg = cfg_root.get("promotion") if cfg_root else None
    if not promotion_cfg:
        promotion_cfg = default_promotion_config()
    if not promotion_cfg.get("enabled", True):
        print("promotion.enabled=false — 후보 생성 비활성", file=sys.stderr)
        return 1

    round_files = collect_round_files(target)
    if not round_files:
        print(f"error: round md 없음 — {target}", file=sys.stderr)
        return 2

    rounds = [parse_round_md(p) for p in round_files]
    by_cat = aggregate(rounds)

    if not by_cat:
        print("warning: 카드별 처리 표 파싱 결과 없음", file=sys.stderr)
        return 1

    thresholds = promotion_cfg.get("thresholds", {})
    target_yml_map = promotion_cfg.get("target_yml", {})

    ts = rounds[0].ts
    created: List[Path] = []
    summary_lines = []

    for category, cards in by_cat.items():
        thr = thresholds.get(category)
        if thr is None or thr < 0:
            summary_lines.append(f"  - {category}: {len(cards)}건 (임계치 비활성)")
            continue
        if len(cards) < thr:
            summary_lines.append(f"  - {category}: {len(cards)}건 / 임계치 {thr} → skip")
            continue
        target_yml = target_yml_map.get(category, "(미정)")
        out = write_promotion_md(
            repo_root=repo_root,
            category=category,
            cards=cards,
            threshold=thr,
            target_yml=target_yml,
            ts=ts,
            round_md_paths=round_files,
        )
        created.append(out)
        summary_lines.append(f"  - {category}: {len(cards)}건 → {out.relative_to(repo_root)}")

    print(f"aggregate-feedback: ts={ts}, rounds={len(round_files)}, cards_total={sum(len(c) for c in by_cat.values())}")
    print("카테고리별 결과:")
    for line in summary_lines:
        print(line)

    if not created:
        print("후보 없음 (모든 카테고리가 임계치 미만 또는 비활성)")
        return 1

    print(f"\npromotion 후보 {len(created)}건 생성:")
    for p in created:
        print(f"  - {p.relative_to(repo_root)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
