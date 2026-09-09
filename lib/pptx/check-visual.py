#!/usr/bin/env python3
"""HTML 덱 ↔ pptx **시각 축** 대조 (Issue344).

무엇을 재나
-----------
[check-roundtrip.py](check-roundtrip.py) 는 **원고 왕복**을 잰다 — pptx 를 거쳐
돌아온 md 가 원본과 같은가. 그것만으로는 *"pptx 가 HTML 덱처럼 보이는가"* 를
아무도 보지 않는다. 실제로 `slide_ratio: "3:2"` 인 덱이 16:9 pptx 로 나가는 동안
왕복 검사는 초록불이었다(실측 2026-09-10).

이 검사는 같은 프로젝트의 **HTML 산출물(CSS)과 pptx 를 나란히 놓고** 잰다.
판정 기준은 [fidelity.yml](../../data/m2slide2ppt/fidelity.yml) 의 `visual:` 절이다.

    must_match   다르면 FAIL
    known_gap    설계상 다르다 — 선언돼 있으므로 통과. 값은 보고한다

사용
----
    check-visual.py <프로젝트 dir> [--contract PATH]

    rc 0  must_match 전건 일치
    rc 1  불일치 있음
    rc 2  입력 문제
"""
import argparse
import os
import re
import sys
import zipfile

try:
    import yaml
except ImportError:
    print("PyYAML 필요", file=sys.stderr)
    sys.exit(2)

A = "http://schemas.openxmlformats.org/drawingml/2006/main"
HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_CONTRACT = os.path.join(HERE, "..", "..", "data", "m2slide2ppt", "fidelity.yml")


def cfg(project_dir, key):
    """`_config.yml` → 루트 `_config.yml` → `_config.org.yml` 순 (build-pptx 와 같은 순서)."""
    root = os.path.dirname(os.path.dirname(os.path.abspath(project_dir)))
    for p in (os.path.join(project_dir, "_config.yml"),
              os.path.join(root, "_config.yml"),
              os.path.join(root, "_config.org.yml")):
        if not os.path.isfile(p):
            continue
        for ln in open(p, encoding="utf-8"):
            m = re.match(r"^%s:\s*(.+?)\s*(?:#.*)?$" % re.escape(key), ln)
            if m:
                return m.group(1).strip().strip('"').strip("'")
    return None


def css_text(project_dir):
    p = os.path.join(project_dir, "slide", "css", "custom.css")
    return open(p, encoding="utf-8").read() if os.path.isfile(p) else ""


def css_var(css, name):
    m = re.search(r"--%s:\s*(#[0-9A-Fa-f]{3,8}|[^;]+);" % re.escape(name), css)
    return m.group(1).strip() if m else None


def css_bg(css):
    m = re.search(r"\.reveal\s*\{[^}]*?background:\s*([^;]+);", css, re.S)
    return m.group(1).strip() if m else None


def css_body_font(project_dir, css):
    """본문 서체 체인의 첫 항목. 코드용 monospace 는 제외한다."""
    root = os.path.dirname(os.path.dirname(os.path.abspath(project_dir)))
    texts = [css]
    base = os.path.join(root, "lib", "css", "base.css")
    if os.path.isfile(base):
        texts.append(open(base, encoding="utf-8").read())
    for t in texts:
        for m in re.finditer(r"font-family:\s*([^;!}]+)", t):
            chain = m.group(1)
            if re.search(r"mono|coding|inherit|var\(", chain, re.I):
                continue
            first = chain.split(",")[0].strip().strip("'\"")
            if first:
                return first
    return None


def hexnorm(v):
    if not v:
        return None
    m = re.search(r"#?([0-9A-Fa-f]{6})", v)
    if m:
        return m.group(1).upper()
    named = {"white": "FFFFFF", "black": "000000"}
    return named.get(v.strip().lower())


def de76(a, b):
    """대충의 색차 — 정확한 CIEDE 가 아니라 **sRGB 유클리드**다.

    임계를 넘는지만 보면 되고, 여기서 재는 값들은 대개 무채색 근처라
    이 근사로 갈리지 않는다. 정밀도가 필요해지면 그때 바꾼다.
    """
    if not a or not b:
        return None
    pa = [int(a[i:i + 2], 16) for i in (0, 2, 4)]
    pb = [int(b[i:i + 2], 16) for i in (0, 2, 4)]
    return sum((x - y) ** 2 for x, y in zip(pa, pb)) ** 0.5


def pptx_facts(path):
    from pptx import Presentation
    prs = Presentation(path)
    out = {"ratio": prs.slide_width / prs.slide_height}
    with zipfile.ZipFile(path) as z:
        th = [n for n in z.namelist() if n.startswith("ppt/theme/")]
        if th:
            x = z.read(th[0]).decode("utf-8")
            for k in ("dk1", "lt1", "accent1"):
                m = re.search(r'<a:%s>.*?val="([0-9A-Fa-f]{6})"' % k, x, re.S)
                if m:
                    out[k] = m.group(1).upper()
            m = re.search(r'<a:minorFont>\s*<a:latin typeface="([^"]*)"', x, re.S)
            if m:
                out["minorFont"] = m.group(1)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("--contract", default=os.path.normpath(DEFAULT_CONTRACT))
    a = ap.parse_args()

    proj = a.project.rstrip("/")
    name = os.path.basename(proj)
    pptx = os.path.join(proj, "slide", "%s.pptx" % name)
    if not os.path.isfile(pptx):
        print("❌ pptx 없음: %s" % pptx, file=sys.stderr)
        return 2

    contract = yaml.safe_load(open(a.contract, encoding="utf-8"))
    decl = {e["id"]: e for e in (contract.get("visual") or [])}
    if not decl:
        print("❌ 계약에 visual 절이 없다", file=sys.stderr)
        return 2

    css = css_text(proj)
    pf = pptx_facts(pptx)

    ratio_s = cfg(proj, "slide_ratio") or "16:9"
    m = re.match(r"^\s*(\d+(?:\.\d+)?)\s*[:x/]\s*(\d+(?:\.\d+)?)\s*$", ratio_s)
    want_ratio = float(m.group(1)) / float(m.group(2)) if m else None

    rows = []

    def add(eid, html_v, pptx_v, ok, note=""):
        rows.append((eid, html_v, pptx_v, decl.get(eid, {}).get("grade", "—"), ok, note))

    # ① 판형
    d = decl.get("canvas_ratio", {})
    tol = float(d.get("tolerance", 0.01))
    ok = want_ratio is not None and abs(pf["ratio"] - want_ratio) <= tol
    add("canvas_ratio", "%s (%.4f)" % (ratio_s, want_ratio or 0), "%.4f" % pf["ratio"], ok)

    # ② 강조색
    ca = hexnorm(css_var(css, "kn-accent"))
    add("accent_color", ca or "?", pf.get("accent1", "?"), ca == pf.get("accent1"))

    # ③ 배경
    cb = hexnorm(css_bg(css))
    add("background", cb or "?", pf.get("lt1", "?"), cb == pf.get("lt1"))

    # ④ 제목색 — run 이 테마 dk1 을 상속하므로 dk1 이 곧 화면의 제목색이다
    ct = hexnorm(css_var(css, "kn-text"))
    dt = pf.get("dk1")
    de = de76(ct, dt)
    tol_de = float(decl.get("title_color", {}).get("tolerance_de", 3.0))
    ok = de is not None and de <= tol_de
    add("title_color", ct or "?", dt or "?", ok,
        "ΔE(sRGB) %.1f / 허용 %.1f" % (de, tol_de) if de is not None else "")

    # ⑤ 본문 서체 — known_gap
    cf = css_body_font(proj, css)
    add("body_font", cf or "?", pf.get("minorFont", "?"), cf == pf.get("minorFont"))

    # ⑥ 레이아웃 꼴 — 기계로 잴 수 없다. 선언만 보고한다
    add("layout_ornament", "theme CSS 의 꼴", "(미이식)", False)

    w = max(len(r[0]) for r in rows) + 2
    print("=" * 76)
    print("시각 축 — %s" % proj)
    print("=" * 76)
    print("%-*s %-26s %-18s %-11s %s" % (w, "축", "HTML(CSS)", "pptx", "등급", "판정"))
    print("-" * 76)
    fails = []
    for eid, hv, pv, grade, ok, note in rows:
        if ok:
            verdict = "OK"
        elif grade == "known_gap":
            verdict = "ok(gap)"
        else:
            verdict = "FAIL"
            fails.append(eid)
        print("%-*s %-26s %-18s %-11s %-8s %s"
              % (w, eid, str(hv)[:26], str(pv)[:18], grade, verdict, note))
    print("-" * 76)
    if fails:
        print("❌ must_match 불일치 %d 건 — %s" % (len(fails), ", ".join(fails)))
    else:
        print("✅ 시각 축이 계약대로 — must_match 전건 일치")
        gaps = [r[0] for r in rows if r[3] == "known_gap"]
        if gaps:
            print("   (선언된 차이 %d 종: %s)" % (len(gaps), ", ".join(gaps)))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
