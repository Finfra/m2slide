#!/usr/bin/env python3
"""ppt-post-diff.py — ppt2m2slide 변환본 vs 사용자 수정본 차이 자동 추출 (Issue246 Phase C).

ppt2m2slide가 변환 종료 시점에 `Projects/<N>/_pipeline/post-convert/markdown/`로
저장한 스냅샷과, 현재 `Projects/<N>/markdown/`의 사용자 수정본을 비교하여 의미
있는 차이를 카테고리화하고 `data/_proposals/post-convert-<ts>.md` 후보를 생성.

Usage:
    ppt-post-diff.py <project_name>
    ppt-post-diff.py Projects/<Name>
    ppt-post-diff.py --snapshot <snapshot_dir> --current <current_dir>

Exit codes:
    0 — 후보 1건 이상 생성
    1 — 차이 없음 또는 모든 카테고리 임계치 미만
    2 — 스냅샷 폴더 없음 / 입력 누락 (ppt2m2slide가 스냅샷 저장 hook 실행 안 한 경우)
"""

from __future__ import annotations

import argparse
import difflib
import re
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional


REPO_ROOT_MARKER = "m2slide.sh"


def find_repo_root(start: Path) -> Path:
    cur = start.resolve()
    for _ in range(10):
        if (cur / REPO_ROOT_MARKER).exists():
            return cur
        if cur.parent == cur:
            break
        cur = cur.parent
    return start.resolve()


def load_rules_yml(repo_root: Path) -> dict:
    path = repo_root / "data" / "ppt2m2slide" / "post-diff-rules.yml"
    if not path.exists():
        return {}
    try:
        import yaml  # type: ignore
        with path.open() as f:
            return yaml.safe_load(f) or {}
    except ImportError:
        return {}


@dataclass
class DiffEvent:
    """카테고리화된 한 건의 차이."""
    category: str
    slide_file: str       # markdown 파일명 (예: 02-linux.md)
    removed: List[str]    # 변환본에 있었으나 사용자가 제거
    added: List[str]      # 사용자가 추가
    context: str = ""     # 주변 컨텍스트 (선택)


def _file_diff(snapshot_path: Path, current_path: Path) -> List[tuple]:
    """unified diff 결과를 [(op, line)] 리스트로 반환. op = '-' | '+' | ' '"""
    a = snapshot_path.read_text(encoding="utf-8").splitlines()
    b = current_path.read_text(encoding="utf-8").splitlines()
    diff = list(difflib.unified_diff(a, b, lineterm="", n=0))
    out: List[tuple] = []
    for line in diff:
        if line.startswith("---") or line.startswith("+++") or line.startswith("@@"):
            continue
        if line.startswith("-"):
            out.append(("-", line[1:]))
        elif line.startswith("+"):
            out.append(("+", line[1:]))
    return out


def _in_frontmatter(snapshot_text: str, line: str) -> bool:
    """라인이 frontmatter 영역(--- ... ---)에 속하는지 단순 추정."""
    if not snapshot_text.startswith("---"):
        return False
    end = snapshot_text.find("\n---", 4)
    if end < 0:
        return False
    fm = snapshot_text[:end]
    return line in fm.splitlines()


def _split_fm_body(snapshot_text: str, removed: List[str], added: List[str]) -> tuple:
    """변경 라인을 frontmatter / body 로 분리. (rm_fm, ad_fm, rm_body, ad_body)"""
    rm_fm, ad_fm, rm_body, ad_body = [], [], [], []
    for l in removed:
        (rm_fm if _in_frontmatter(snapshot_text, l) else rm_body).append(l)
    for l in added:
        (ad_fm if _in_frontmatter(snapshot_text, l) else ad_body).append(l)
    return rm_fm, ad_fm, rm_body, ad_body


def classify_body(
    rules: dict,
    removed_lines: List[str],
    added_lines: List[str],
) -> List[str]:
    """body 변경 라인을 카테고리 priority 순서로 매칭 가능한 모든 카테고리 반환.

    한 파일에서 layout_changed + slot_added + mapping_missing이 동시에 발생할 수
    있으므로 first-match가 아니라 all-match. text_corrected는 다른 카테고리가
    매칭됐을 때 fallback 처리하지 않음 (의미 중복 회피).
    """
    categories = {c["id"]: c for c in rules.get("categories", []) if c.get("id")}
    priority = rules.get("priority", list(categories.keys()))
    matched: List[str] = []

    for cat_id in priority:
        if cat_id in {"frontmatter_changed", "text_corrected"}:
            continue
        cat = categories.get(cat_id, {})
        trig = cat.get("trigger", {})

        removed_re = trig.get("removed_regex")
        added_re = trig.get("added_regex")

        hit = False
        if removed_re:
            for line in removed_lines:
                if re.search(removed_re, line):
                    hit = True
                    break
        if not hit and added_re:
            for line in added_lines:
                if re.search(added_re, line):
                    hit = True
                    break
        if hit:
            matched.append(cat_id)

    if not matched and (removed_lines or added_lines):
        matched.append("text_corrected")
    return matched


def diff_files(rules: dict, snapshot_dir: Path, current_dir: Path) -> List[DiffEvent]:
    events: List[DiffEvent] = []
    max_slides = rules.get("limits", {}).get("max_slides_per_diff", 500)

    snapshot_files = sorted(snapshot_dir.glob("*.md"))[:max_slides]
    for snap in snapshot_files:
        cur = current_dir / snap.name
        if not cur.exists():
            # 사용자가 삭제 — text_corrected 또는 별도 카테고리
            events.append(DiffEvent(
                category="text_corrected",
                slide_file=snap.name,
                removed=["(파일 전체 삭제)"],
                added=[],
            ))
            continue
        ops = _file_diff(snap, cur)
        if not ops:
            continue
        # 같은 파일 내 모든 변경을 한 묶음으로 처리
        removed = [l for op, l in ops if op == "-" and l.strip()]
        added = [l for op, l in ops if op == "+" and l.strip()]
        if not removed and not added:
            continue
        snap_text = snap.read_text(encoding="utf-8")
        rm_fm, ad_fm, rm_body, ad_body = _split_fm_body(snap_text, removed, added)
        # frontmatter 변경 별도 event
        if rm_fm or ad_fm:
            events.append(DiffEvent(
                category="frontmatter_changed",
                slide_file=snap.name,
                removed=rm_fm[:5],
                added=ad_fm[:5],
            ))
        # body 변경 — all-match로 여러 카테고리 분류
        if rm_body or ad_body:
            cats = classify_body(rules, rm_body, ad_body)
            for cat in cats:
                events.append(DiffEvent(
                    category=cat,
                    slide_file=snap.name,
                    removed=rm_body[:5],
                    added=ad_body[:5],
                ))
    # 신규 파일(사용자가 추가)도 감지
    cur_files = {f.name for f in current_dir.glob("*.md")}
    snap_names = {f.name for f in snapshot_files}
    for new_name in sorted(cur_files - snap_names):
        events.append(DiffEvent(
            category="text_corrected",
            slide_file=new_name,
            removed=[],
            added=["(파일 전체 신규 추가)"],
        ))
    return events


def aggregate(events: List[DiffEvent]) -> Dict[str, List[DiffEvent]]:
    by_cat: Dict[str, List[DiffEvent]] = {}
    for ev in events:
        by_cat.setdefault(ev.category, []).append(ev)
    return by_cat


def write_proposal_md(
    repo_root: Path,
    by_category: Dict[str, List[DiffEvent]],
    ts: str,
    project: str,
    rules: dict,
) -> List[Path]:
    proposals_dir = repo_root / "data" / "_proposals"
    proposals_dir.mkdir(parents=True, exist_ok=True)
    thresholds = rules.get("promotion", {}).get("thresholds", {})
    cats_map = {c["id"]: c for c in rules.get("categories", []) if c.get("id")}

    created: List[Path] = []
    now = datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d")

    for cat_id, events in by_category.items():
        thr = thresholds.get(cat_id, 1)
        if thr is None or thr < 0:
            continue
        if len(events) < thr:
            continue
        target_yml = cats_map.get(cat_id, {}).get("target_yml", "(미정)")
        out = proposals_dir / f"post-convert-{ts}-{cat_id}.md"

        lines = [
            "---",
            f"name: {out.stem}",
            f"description: ppt2m2slide 사후 diff 학습 후보 — category={cat_id}",
            f"date: {now}",
            f"issue: Issue246",
            f"category: {cat_id}",
            f"project: {project}",
            f"convert_ts: {ts}",
            f"count: {len(events)}",
            f"threshold: {thr}",
            "status: pending",
            "---",
            "",
            f"# Post-convert 후보 — {cat_id}",
            "",
            f"ppt2m2slide 변환본과 사용자 수정본 차이 분석 결과 `{cat_id}` 카테고리가 임계치(`{thr}`)를 충족.",
            "promote-to-data.py 워크플로우로 머지·기각·보류 결정한다.",
            "",
            "# 추정 적용 대상 yml",
            "",
            f"* `{target_yml}`",
            "",
            f"# 발생 슬라이드 ({len(events)}건)",
            "",
        ]
        for ev in events[:50]:
            lines.append(f"## {ev.slide_file}")
            lines.append("")
            if ev.removed:
                lines.append("**변환본에서 제거:**")
                lines.append("")
                lines.append("```")
                for l in ev.removed:
                    lines.append(l)
                lines.append("```")
                lines.append("")
            if ev.added:
                lines.append("**사용자가 추가:**")
                lines.append("")
                lines.append("```")
                for l in ev.added:
                    lines.append(l)
                lines.append("```")
                lines.append("")
        if len(events) > 50:
            lines.append(f"... 외 {len(events) - 50}건")
            lines.append("")

        lines.append("")
        lines.append("# 머지 검토 가이드")
        lines.append("")
        notes = cats_map.get(cat_id, {}).get("notes", "")
        if notes:
            lines.append(notes)
        lines.append("")
        lines.append("`promote-to-data.py --action merge` 시 본 카테고리에 매핑된 yml에 patterns/rules 추가 후 commit.")
        lines.append("")

        out.write_text("\n".join(lines), encoding="utf-8")
        created.append(out)
    return created


def main(argv: List[str]) -> int:
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("project", nargs="?", help="프로젝트 이름 또는 Projects/<Name> 경로")
    p.add_argument("--snapshot", help="변환 직후 스냅샷 markdown 폴더 명시")
    p.add_argument("--current", help="현재 사용자 수정본 markdown 폴더 명시")
    p.add_argument("--repo-root", help="m2slide repo 루트 override")
    args = p.parse_args(argv)

    cwd = Path.cwd()
    repo_root = Path(args.repo_root).resolve() if args.repo_root else find_repo_root(cwd)

    if args.snapshot and args.current:
        snapshot_dir = Path(args.snapshot)
        current_dir = Path(args.current)
        project = args.project or current_dir.parent.name
    elif args.project:
        proj = args.project
        if proj.startswith("Projects/"):
            proj_dir = repo_root / proj
        else:
            proj_dir = repo_root / "Projects" / proj
        if not proj_dir.is_dir():
            print(f"error: 프로젝트 폴더 없음 — {proj_dir}", file=sys.stderr)
            return 2
        snapshot_dir = proj_dir / "_pipeline" / "post-convert" / "markdown"
        current_dir = proj_dir / "markdown"
        project = proj_dir.name
    else:
        print("error: project 인자 또는 --snapshot/--current 필요", file=sys.stderr)
        return 2

    if not snapshot_dir.exists():
        print(f"error: 스냅샷 폴더 없음 — {snapshot_dir}", file=sys.stderr)
        print("  hint: ppt2m2slide agent가 변환 종료 시 스냅샷 저장 hook을 실행했는지 확인", file=sys.stderr)
        print(f"  fallback: cp -r {current_dir} {snapshot_dir} 후 사용자 수정 → 재실행", file=sys.stderr)
        return 2
    if not current_dir.exists():
        print(f"error: 현재 markdown 폴더 없음 — {current_dir}", file=sys.stderr)
        return 2

    rules = load_rules_yml(repo_root)
    if not rules:
        print("warning: post-diff-rules.yml 로드 실패 — 기본 규칙으로 진행", file=sys.stderr)
        rules = {
            "categories": [{"id": "text_corrected", "trigger": {"fallback": True}}],
            "priority": ["text_corrected"],
            "promotion": {"thresholds": {"text_corrected": 1}},
        }

    events = diff_files(rules, snapshot_dir, current_dir)
    if not events:
        print(f"no changes: {snapshot_dir} ↔ {current_dir}")
        return 1

    by_cat = aggregate(events)
    print(f"ppt-post-diff: project={project}, events={len(events)}")
    print("카테고리별 결과:")
    for cat_id, evs in by_cat.items():
        thr = rules.get("promotion", {}).get("thresholds", {}).get(cat_id)
        flag = "(임계치 비활성)" if thr is None or thr < 0 else f"/ 임계치 {thr}"
        print(f"  - {cat_id}: {len(evs)}건 {flag}")

    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    created = write_proposal_md(repo_root, by_cat, ts, project, rules)

    if not created:
        print("후보 없음 (모든 카테고리 임계치 미만)")
        return 1

    print(f"\npromotion 후보 {len(created)}건 생성:")
    for p in created:
        print(f"  - {p.resolve().relative_to(repo_root)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
