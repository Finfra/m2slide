#!/usr/bin/env python3
"""커버리지 감사 — **아무 덱에도 없는 축**을 센다 (Issue369).

왜 이 도구가 있나
-----------------
왕복 러너(`6.roundtrip`)는 *"이 덱이 계약대로 돌았는가"* 를 잰다. 그런데 계약이
선언한 요소를 **그 덱이 담고 있지 않으면** 그 축은 초록불도 빨간불도 아닌 **무측정**이
된다. 덱이 여럿으로 갈려 있으면 각자 통과해도 *"어느 축이 아무 덱에도 없는지"* 는
아무도 세지 않는다.

그 사각지대에서 실제로 일이 났다(Issue358 실측):

    표 정렬        `lossy`("소실된다")로 선언 → 재보니 **보존**된다.
                   근거 덱의 표가 전부 좌측 정렬이라 차이가 드러날 수 없었다
    비표준 불릿    "HTML 과 pptx 가 다르게 렌더된다" → 재보니 **같다**
    테마 밖 폰트   주 러너를 옮기며 축 자체가 **조용히 사라졌다**

셋 다 같은 형태다 — **"차이 없음" 과 "차이를 못 봄" 이 구분되지 않았다.**
이 도구는 그 둘을 가른다.

무엇을 재나
-----------
계약([fidelity.yml](../../data/m2slide2ppt/fidelity.yml))의 `elements` 를 축으로 삼고,
각 덱의 **원고**가 그 요소를 담았는지 센다. 판정은 셋이다:

    ✅ 측정됨      한 덱 이상이 담았다
    ⚠️ 한 덱뿐     그 덱을 고치면 축이 사라진다 — 근거가 얇다
    ❌ 무측정      아무 덱에도 없다. 계약은 선언했는데 **아무도 재지 않는다**

⚠️ `synthesized` 등급은 **원고에 없는 것이 정상**이라(정방향이 만드는 장) 이 셈에서
   뺀다. 그것을 재는 것은 왕복 러너 쪽 일이다.

    사용: check-coverage.py [프로젝트…]     (생략하면 Projects/ 전체에서 찾는다)
"""
import argparse
import glob
import importlib.util
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))


def _load(name, fn):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, fn))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


rt = _load("rt", "check-roundtrip.py")


def contract():
    """계약의 요소 — (id, grade, 한 줄 설명)."""
    import yaml
    p = os.path.join(ROOT, "data", "m2slide2ppt", "fidelity.yml")
    d = yaml.safe_load(open(p, encoding="utf-8")) or {}
    out = []
    for e in d.get("elements") or []:
        out.append((e["id"], e.get("grade", "?"), (e.get("m2slide") or "")[:38]))
    return out


def scanner_knows():
    """검사기가 **만들 수 있는** 요소 id — `scan()` 이 `e["<id>"]` 로 채우는 것들.

    ⚠️ 이 구분이 이 도구의 핵심이다. 무측정에는 두 종류가 있고 고칠 곳이 다르다:

        검사기가 안 잰다   계약은 선언했는데 `scan()` 에 그 요소를 만드는 코드가
                           **없다**. 원고에 아무리 많아도 0 이다 — Issue358 의
                           `font_outside_theme` 이 그랬다. **코드**를 고쳐야 한다
        픽스처에 없다      검사기는 잴 줄 아는데 어느 원고에도 그 요소가 없다.
                           **원고**를 더하면 된다

    소스를 정적으로 훑는다 — 실행해서 알 수 있는 것이 아니다(그 요소가 없는 덱만
    돌리면 똑같이 0 이라 구분이 안 된다).
    """
    src = open(os.path.join(HERE, "check-roundtrip.py"), encoding="utf-8").read()
    ids = set()
    for m in re.finditer(r'e\[\s*"([a-z_0-9]+)"\s*\]', src):
        ids.add(m.group(1))
    for m in re.finditer(r'_agg\[\s*"([a-z_0-9]+)"\s*\]', src):
        ids.add(m.group(1))
    return ids


def deck_elements(project_dir):
    """그 덱의 **원고**가 담은 요소 → {id: 개수}."""
    fm, agg, _ = rt.collect(project_dir)
    if agg is None:
        return None
    n = {k: len(v) for k, v in agg.items() if v}
    #   frontmatter 는 `collect` 가 따로 돌려준다 — 비교부와 같은 규칙으로 채운다
    if fm:
        if fm.get("title"):
            n["frontmatter_title"] = 1
        meta = [k for k, v in fm.items() if k != "title" and str(v).strip()]
        if meta:
            n["frontmatter_meta"] = len(meta)
    return n


def find_projects():
    out = []
    for d in sorted(glob.glob(os.path.join(ROOT, "Projects", "*"))):
        if not os.path.isdir(d) or os.path.basename(d).startswith(("z_", ".")):
            continue
        if rt.sources(d):
            out.append(d)
    return out


def main():
    ap = argparse.ArgumentParser(description="커버리지 감사 — 아무 덱에도 없는 축")
    ap.add_argument("projects", nargs="*")
    ap.add_argument("--all", action="store_true", help="Projects/ 전체")
    a = ap.parse_args()

    if a.all or not a.projects:
        projs = find_projects()
    else:
        projs = [p if os.path.isdir(p) else os.path.join(ROOT, "Projects", p)
                 for p in a.projects]
    projs = [p for p in projs if os.path.isdir(p)]
    if not projs:
        print("❌ 잴 덱이 없다", file=sys.stderr)
        return 2

    counts, names = {}, []
    for p in projs:
        n = deck_elements(p)
        if n is None:
            continue
        nm = os.path.basename(p.rstrip("/"))
        names.append(nm)
        counts[nm] = n

    els = contract()
    measurable = [(i, g, d) for i, g, d in els if g != "synthesized"]

    w = max([len(i) for i, _, _ in measurable] + [10])
    cw = max([len(n) for n in names] + [6])
    print("=" * 78)
    print("커버리지 감사 — 계약 요소 %d종(측정 대상 %d) × 덱 %d"
          % (len(els), len(measurable), len(names)))
    print("=" * 78)
    print("%-*s %s  판정" % (w, "요소", " ".join("%-*s" % (cw, n[:cw]) for n in names)))
    print("-" * 78)

    known = scanner_knows()
    none_, thin, blind = [], [], []
    for eid, grade, desc in measurable:
        cells, have = [], 0
        for nm in names:
            c = counts[nm].get(eid, 0)
            cells.append("%-*s" % (cw, c if c else "·"))
            if c:
                have += 1
        if have == 0 and eid not in known:
            mark, blind = "🔴 검사기가 안 잼", blind + [(eid, grade, desc)]
        elif have == 0:
            mark, none_ = "❌ 픽스처에 없음", none_ + [(eid, grade, desc)]
        elif have == 1:
            mark, thin = "⚠️ 한 덱뿐", thin + [eid]
        else:
            mark = "✅"
        print("%-*s %s  %s" % (w, eid, " ".join(cells), mark))

    print("-" * 78)
    if blind:
        print("🔴 **검사기가 아예 안 재는 축 %d종** — 계약은 선언했는데 `scan()` 이"
              % len(blind))
        print("   그 요소를 만들지 않는다. 원고에 아무리 많아도 0 이다(코드를 고쳐야 한다)")
        for eid, grade, desc in blind:
            print("   · %-22s %-14s %s" % (eid, grade, desc))
    if none_:
        print("❌ 픽스처에 없는 축 %d종 — 검사기는 잴 줄 아는데 어느 원고에도 없다"
              % len(none_))
        for eid, grade, desc in none_:
            print("   · %-22s %-14s %s" % (eid, grade, desc))
        print("   그 요소를 쓰는 원고를 픽스처에 더하거나, 계약에서 거둔다.")
    if not blind and not none_:
        print("✅ 계약이 선언한 측정 대상 축을 **전부 어느 덱인가는 담고 있다**")
    if thin:
        print("⚠️ 한 덱에만 있는 축 %d종 — 그 덱을 고치면 축이 사라진다: %s"
              % (len(thin), ", ".join(thin[:8]) + (" …" if len(thin) > 8 else "")))
    print("ℹ️  `synthesized` %d종은 원고에 없는 것이 정상이라 이 셈에서 뺐다"
          % (len(els) - len(measurable)))
    return 1 if (blind or none_) else 0


if __name__ == "__main__":
    sys.exit(main())
