#!/usr/bin/env python3
"""promote-to-data.py — promotion 후보 처리 도구 (Issue245 Phase B v1).

aggregate-feedback.py가 생성한 `data/_proposals/promotion-<ts>-<category>.md`
후보 파일을 스캔·조회·상태 갱신하는 CLI. 자동 yml 머지는 v2로 분리 — v1은
사용자 결정(merge/reject/hold)을 frontmatter status에 기록하고 머지 가이드를
출력하는 책임만 가짐.

Usage:
    promote-to-data.py --list                            # pending 후보 목록
    promote-to-data.py --list --status all               # 모든 상태
    promote-to-data.py --show <proposal_md>              # 후보 1건 요약
    promote-to-data.py --action merge <proposal_md>      # status: merged + 가이드
    promote-to-data.py --action reject <proposal_md> [--reason "사유"]
    promote-to-data.py --action hold <proposal_md>       # status: held

Exit codes:
    0 — 정상 처리
    1 — 매칭 후보 없음 / 후보 0건
    2 — 입력 누락·파싱 실패
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional


REPO_ROOT_MARKER = "m2slide.sh"
VALID_ACTIONS = {"merge", "reject", "hold"}
VALID_STATUSES = {"pending", "merged", "rejected", "held"}


def find_repo_root(start: Path) -> Path:
    cur = start.resolve()
    for _ in range(10):
        if (cur / REPO_ROOT_MARKER).exists():
            return cur
        if cur.parent == cur:
            break
        cur = cur.parent
    return start.resolve()


@dataclass
class Proposal:
    path: Path
    frontmatter: dict
    body: str

    @property
    def status(self) -> str:
        return str(self.frontmatter.get("status", "pending"))

    @property
    def category(self) -> str:
        return str(self.frontmatter.get("category", "unknown"))

    @property
    def round_ts(self) -> str:
        return str(self.frontmatter.get("round_ts", ""))

    @property
    def count(self) -> int:
        try:
            return int(self.frontmatter.get("count", 0))
        except (TypeError, ValueError):
            return 0


_FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n(.*)$", re.DOTALL)
_FM_LINE_RE = re.compile(r"^([A-Za-z_][\w-]*)\s*:\s*(.*)$")


def parse_proposal(path: Path) -> Optional[Proposal]:
    text = path.read_text(encoding="utf-8")
    m = _FRONTMATTER_RE.match(text)
    if not m:
        return None
    fm_block, body = m.group(1), m.group(2)
    fm = {}
    for line in fm_block.splitlines():
        mm = _FM_LINE_RE.match(line)
        if mm:
            key, val = mm.group(1), mm.group(2).strip()
            # quote 제거
            if (val.startswith('"') and val.endswith('"')) or \
               (val.startswith("'") and val.endswith("'")):
                val = val[1:-1]
            fm[key] = val
    return Proposal(path=path, frontmatter=fm, body=body)


def list_proposals(repo_root: Path, status_filter: str) -> List[Proposal]:
    """`promotion-*.md` (slide-tuner Phase A·B) + `post-convert-*.md` (ppt2m2slide Phase C) 모두 스캔."""
    proposals_dir = repo_root / "data" / "_proposals"
    if not proposals_dir.exists():
        return []
    out: List[Proposal] = []
    patterns = ("promotion-*.md", "post-convert-*.md")
    files: List[Path] = []
    for pat in patterns:
        files.extend(proposals_dir.glob(pat))
    for p in sorted(set(files)):
        prop = parse_proposal(p)
        if not prop:
            continue
        if status_filter != "all" and prop.status != status_filter:
            continue
        out.append(prop)
    return out


def update_status(prop: Proposal, new_status: str, reason: Optional[str] = None) -> None:
    """frontmatter의 status 필드를 갱신. action history도 함께 append."""
    text = prop.path.read_text(encoding="utf-8")
    m = _FRONTMATTER_RE.match(text)
    if not m:
        raise ValueError(f"frontmatter 파싱 실패: {prop.path}")
    fm_block, body = m.group(1), m.group(2)
    lines = fm_block.splitlines()

    now = datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M:%S%z")
    new_lines: List[str] = []
    status_replaced = False
    for line in lines:
        mm = _FM_LINE_RE.match(line)
        if mm and mm.group(1) == "status":
            new_lines.append(f"status: {new_status}")
            status_replaced = True
        else:
            new_lines.append(line)
    if not status_replaced:
        new_lines.append(f"status: {new_status}")
    # action 메타 append
    new_lines.append(f"action_at: {now}")
    if reason:
        new_lines.append(f"action_reason: {reason}")

    rebuilt = "---\n" + "\n".join(new_lines) + "\n---\n" + body
    prop.path.write_text(rebuilt, encoding="utf-8")


def _category_merge_guide(category: str, target_yml: str) -> str:
    if category == "novel":
        return f"""머지 절차 (novel — {target_yml}):
  1. 본 후보의 '발생 슬라이드' + 관련 `data/_proposals/tuner-*-novel-*.md` 검토
  2. 공통 패턴 식별 후 신규 카테고리 명세 작성:
     - id, description, trigger.keywords, action, target_pattern (필요 시)
  3. `data/slide-tuner/patterns.yml`의 `categories` 리스트에 추가
  4. `priority` 리스트에도 신규 id 삽입 (novel fallback 위)
  5. 신규 카테고리에 해당하는 _proposals/tuner-*-novel-*.md를 다시 분류해보고 동작 확인"""
    if category == "text_diff":
        return f"""머지 절차 (text_diff — {target_yml}):
  1. 본 후보의 발생 슬라이드 텍스트 + PDF 텍스트 diff 비교
  2. 반복 패턴 추출 (예: 영문 단어 사이 공백 누락, 약어 한글 풀이 등)
  3. `data/md-builder/styles.yml`에 패턴 룰 추가 (실제 룰 schema는 styles.yml 구조 참조)
  4. 다음 라운드에서 md 생성·검증 시 자동 적용 확인"""
    if category == "md_literal_needed":
        return f"""머지 절차 (md_literal_needed — {target_yml}):
  1. 본 후보의 발생 슬라이드에서 literal 처리 필요한 syntax 패턴 식별
  2. `data/md-builder/styles.yml`에 자동 백틱 wrap 룰 추가
  3. patterns.yml의 candidates 외 신규 패턴(예: 특정 도메인 URL)을 styles.yml로 승격
  4. 다음 md 생성 라운드에서 검증"""
    return f"머지 가이드 미정 — {target_yml} 직접 검토"


def cmd_list(repo_root: Path, status: str) -> int:
    props = list_proposals(repo_root, status)
    if not props:
        print(f"후보 0건 (status filter: {status})")
        return 1
    print(f"promotion 후보 — {len(props)}건 (status filter: {status})")
    print()
    for p in props:
        rel = p.path.resolve().relative_to(repo_root)
        print(f"  [{p.status}] {p.category}  count={p.count}  round_ts={p.round_ts}")
        print(f"        {rel}")
    return 0


def cmd_show(repo_root: Path, proposal_path: Path) -> int:
    prop = parse_proposal(proposal_path)
    if not prop:
        print(f"error: frontmatter 파싱 실패 — {proposal_path}", file=sys.stderr)
        return 2
    rel = prop.path.resolve().relative_to(repo_root)
    print(f"파일: {rel}")
    print(f"카테고리: {prop.category}")
    print(f"상태: {prop.status}")
    print(f"count / threshold: {prop.count} / {prop.frontmatter.get('threshold', '?')}")
    print(f"round_ts: {prop.round_ts}")
    print()
    print("--- 본문 ---")
    print(prop.body)
    return 0


def cmd_action(repo_root: Path, action: str, proposal_path: Path, reason: Optional[str]) -> int:
    if action not in VALID_ACTIONS:
        print(f"error: action은 {sorted(VALID_ACTIONS)} 중 하나 — got {action}", file=sys.stderr)
        return 2
    prop = parse_proposal(proposal_path)
    if not prop:
        print(f"error: frontmatter 파싱 실패 — {proposal_path}", file=sys.stderr)
        return 2

    status_map = {"merge": "merged", "reject": "rejected", "hold": "held"}
    new_status = status_map[action]
    if prop.status == new_status:
        print(f"warning: 이미 status={new_status} — 변경 없음")
        return 0

    update_status(prop, new_status, reason)
    rel = prop.path.resolve().relative_to(repo_root)
    print(f"✅ {rel}")
    print(f"   status: {prop.status} → {new_status}")
    if reason:
        print(f"   사유: {reason}")

    if action == "merge":
        # target_yml 찾기 — patterns.yml의 target_yml 매핑 참조
        target_yml = "(미정)"
        try:
            import yaml  # type: ignore
            patterns_path = repo_root / "data" / "slide-tuner" / "patterns.yml"
            if patterns_path.exists():
                with patterns_path.open() as f:
                    cfg = yaml.safe_load(f) or {}
                target_yml = (
                    cfg.get("promotion", {}).get("target_yml", {}).get(prop.category)
                    or target_yml
                )
        except ImportError:
            pass
        # Issue247 Phase D — backup 자동 호출
        _maybe_backup_target_yml(repo_root, target_yml)
        print()
        print(_category_merge_guide(prop.category, target_yml))
        print()
        print(_confidence_scaffold(prop))
        print()
        print("⚠️ 본 도구는 status만 갱신함. 실제 yml 머지는 사용자가 직접 Edit 후 commit.")
        print("⚠️ 정책 yml 은 코드·산출물과 분리된 단독 커밋으로 (Issue265 사례 B).")
    return 0


def _suggest_confidence(count: int, threshold: int) -> str:
    """근거 축적 정도 → 적용 강도 제안 (Issue265 사례 C 차단).

    사례 1건이 곧바로 enforce 로 승격되는 경로를 막는 것이 목적이다.
    high(enforce)는 도구가 자동 제안하지 않는다 — 다수 사례 + 기간 검증을
    사람이 확인한 뒤에만 올린다.
    """
    if count <= 1:
        return "low"
    if count >= max(threshold, 2):
        return "medium"
    return "low"


def _confidence_scaffold(prop: "Proposal") -> str:
    """머지 시 yml 에 붙여넣을 confidence/evidence 스캐폴드 출력.

    goal-oriented 스키마(schema_version 2) 대상 yml 에만 해당한다.
    스키마 정의 SSOT: _doc_arch/policy-goal-schema.md
    """
    try:
        threshold = int(prop.frontmatter.get("threshold") or 2)
    except (TypeError, ValueError):
        threshold = 2
    count = prop.count
    confidence = _suggest_confidence(count, threshold)

    effect = {
        "low": "적용 안 함 — _proposals/ 기록만 (사례 1건으로 enforce 직행 금지)",
        "medium": "적용하되 위반을 경고 로그로 남김",
    }[confidence]

    lines = [
        "confidence 제안 (Issue265 — goal-oriented 스키마 대상 yml 한정):",
        f"  근거 {count}건 / 임계 {threshold} → confidence: {confidence}",
        f"  효과: {effect}",
        "",
        "  머지할 룰이 schema_version 2 파일이면 아래를 함께 기입:",
        "",
        f"    confidence: {confidence}",
        "    evidence:",
        f"      - {{ project: <프로젝트>, date: {prop.round_ts[:10] or '<YYYY-MM-DD>'}, "
        f"count: {count}, note: \"<무엇이 관측됐는가>\" }}",
        "",
        "  high(enforce)로 올리려면 서로 다른 프로젝트의 사례 + 기간 검증이 필요하며,",
        "  goal_type·goal·goal_check 를 반드시 함께 채워야 --lint-data 를 통과함.",
    ]
    return "\n".join(lines)


def _maybe_backup_target_yml(repo_root: Path, target_yml_text: str) -> None:
    """target_yml 문자열에서 yml 경로 토큰 추출 후 backup-data-yml.sh 호출.

    Issue247 Phase D — 사용자가 yml 직접 편집하기 전에 자동 백업 떠둠.
    target_yml_text 예시:
      "data/slide-tuner/patterns.yml (신규 카테고리 추가)"  → yml 추출 성공
      "data/md-builder/styles.yml"                          → yml 추출 성공
      "(미정)"                                              → skip
    """
    import shlex
    import subprocess

    # 첫 공백 전까지의 토큰을 yml 경로로 가정
    token = target_yml_text.strip().split()[0] if target_yml_text.strip() else ""
    if not token or not token.endswith(".yml"):
        return
    yml_path = repo_root / token
    if not yml_path.exists():
        print(f"ℹ️ backup skip — yml 파일 없음: {token}", file=sys.stderr)
        return
    script = repo_root / "lib" / "tuner" / "backup-data-yml.sh"
    if not script.exists():
        print(f"ℹ️ backup skip — script 없음: {script}", file=sys.stderr)
        return
    try:
        result = subprocess.run(
            [str(script), str(yml_path)],
            cwd=str(repo_root),
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.stdout:
            print(result.stdout.rstrip())
        if result.returncode != 0:
            print(f"⚠️ backup 실패 (exit={result.returncode}): {result.stderr.rstrip()}", file=sys.stderr)
    except (subprocess.TimeoutExpired, OSError) as e:
        print(f"⚠️ backup 호출 실패: {e}", file=sys.stderr)


def main(argv: List[str]) -> int:
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--list", action="store_true", help="promotion 후보 목록 조회")
    p.add_argument("--show", metavar="PROPOSAL_MD", help="후보 1건 요약")
    p.add_argument("--action", choices=sorted(VALID_ACTIONS), help="후보 status 갱신")
    p.add_argument("proposal", nargs="?", help="--action 대상 proposal md 경로")
    p.add_argument("--status", default="pending", help="--list 시 필터 (pending|merged|rejected|held|all)")
    p.add_argument("--reason", help="--action reject 시 사유 메모")
    p.add_argument("--repo-root", help="repo 루트 override")
    args = p.parse_args(argv)

    cwd = Path.cwd()
    repo_root = Path(args.repo_root).resolve() if args.repo_root else find_repo_root(cwd)

    if args.list:
        return cmd_list(repo_root, args.status)
    if args.show:
        return cmd_show(repo_root, Path(args.show))
    if args.action:
        if not args.proposal:
            print("error: --action 사용 시 proposal md 경로 인자 필요", file=sys.stderr)
            return 2
        return cmd_action(repo_root, args.action, Path(args.proposal), args.reason)

    p.print_help()
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
