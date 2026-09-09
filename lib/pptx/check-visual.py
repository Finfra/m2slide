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
TRANSFORM = os.path.join(HERE, "..", "..", "data", "m2slide2ppt", "transform.yml")
P = "http://schemas.openxmlformats.org/presentationml/2006/main"
ORNAMENT_TAG = "m2slide:ornament"


def geometry():
    """테마 꼴 좌표 — `lane-t.py` 가 이식에 쓰는 **같은 값**을 검증에도 쓴다."""
    try:
        with open(os.path.normpath(TRANSFORM), encoding="utf-8") as fp:
            return (yaml.safe_load(fp) or {}).get("theme_geometry") or {}
    except Exception:
        return {}


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
    """본문 서체 체인의 첫 항목.

    ⚠️ 함정 둘을 피해야 한다 (실측 2026-09-10, 첫 판이 둘 다 밟았다):

        `@font-face { font-family: 'GmarketSansBold' }`
            이것은 **폰트 자원의 이름**이지 본문 서체가 아니다. 블록째 걷어낸다.
        `font-family: var(--global-font-family, …)`
            `var(` 를 건너뛰면 진짜 본문 체인에 **영원히 도달하지 못한다**.
            변수 정의를 역참조하고, 없으면 그 자리의 fallback 을 쓴다.

    이 결함이 러너에 안 잡힌 이유가 중요하다 — `body_font` 는 `known_gap` 이라
    **구조적으로 빨간불이 될 수 없는 축**이라서, 재는 값이 틀려도 rc0 이 유지된다.
    """
    root = os.path.dirname(os.path.dirname(os.path.abspath(project_dir)))
    texts = [css]
    base = os.path.join(root, "lib", "css", "base.css")
    if os.path.isfile(base):
        texts.append(open(base, encoding="utf-8").read())
    def first_of(chain, scope):
        chain = chain.strip()
        mv = re.match(r"var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)\s*$", chain, re.S)
        if mv:
            dm = re.search(r"%s:\s*([^;]+);" % re.escape(mv.group(1)), scope)
            chain = (dm.group(1) if dm else (mv.group(2) or "")).strip()
        if not chain or re.search(r"mono|coding|inherit", chain, re.I):
            return None
        f = chain.split(",")[0].strip().strip("'\"")
        return f or None

    for t in texts:
        scope = re.sub(r"@font-face\s*\{[^}]*\}", "", t, flags=re.S)
        #   ⚠️ **첫 매치를 쓰면 안 된다.** custom.css 는 제목 서체
        #      (`--main-title-font-family: 'GmarketSansBold'`)를 먼저 선언하고,
        #      그것이 본문으로 보고된다(실측: 두 번째 판이 이 함정을 밟았다).
        #      본문은 **선택자로 특정**해야 한다.
        m = re.search(r"--global-font-family:\s*([^;]+);", scope)
        if m:
            f = first_of(m.group(1), scope)
            if f:
                return f
        for sel in (r"\.reveal\s*\{", r"\bbody\s*\{"):
            for mb in re.finditer(sel + r"([^}]*)\}", scope, re.S):
                mf = re.search(r"font-family:\s*([^;!}]+)", mb.group(1))
                if mf:
                    f = first_of(mf.group(1), scope)
                    if f:
                        return f
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
    out = {"ratio": prs.slide_width / prs.slide_height,
           "slide_w": prs.slide_width, "prs": prs}
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

    # ⑥ 콘텐츠 박스 — placeholder 가 HTML 콘텐츠 폭을 채우는가
    g = geometry()
    prs = pf["prs"]
    px = pf["slide_w"] / float(g.get("canvas_w") or 1920)
    want_l, want_w = g.get("margin", 56), (g.get("canvas_w", 1920) - 2 * g.get("margin", 56))
    lay = next((l for l in prs.slide_master.slide_layouts
                if l.name == "Title and Content"), None)
    ttl = next((p for p in lay.placeholders if p.name.startswith("Title")), None) if lay else None
    if ttl is None:
        add("content_box", "%d..%dpx" % (want_l, want_l + want_w), "(레이아웃 없음)", False)
    else:
        got_l, got_w = round(ttl.left / px), round(ttl.width / px)
        add("content_box", "left %d · w %d" % (want_l, want_w),
            "left %d · w %d" % (got_l, got_w),
            abs(got_l - want_l) <= 2 and abs(got_w - want_w) <= 4)

    # ⑦⑧ 테마 장식 — 가로선과 제목 밑줄이 실제로 들어갔는가
    rules = 0
    slides = list(prs.slides)
    for sl in slides:
        for sh in sl.shapes:
            el = sh._element.find(".//{%s}cNvPr" % P)
            if el is not None and (el.get("descr") or "") == ORNAMENT_TAG:
                rules += 1
    n = len(slides) or 1
    add("theme_rule", "장마다 상·하단 2줄", "%d개 / %d장" % (rules, n), rules >= 2 * n)
    #   ⚠️ **제목이 빈 장은 세지 않는다.** HTML 도 제목 요소가 없으면 `::after` 가
    #      없고, lane T 도 그 장은 건너뛴다. 레이아웃만 보고 세면 그 장들이
    #      "밑줄 누락" 으로 잡힌다(실측: m2Slide_chapter_mode 33 vs 29).
    BODY = ("Title and Content", "Two Content", "Content with Caption",
            "Title Only", "Comparison", "Blank")
    body_n = 0
    for sl in slides:
        if sl.slide_layout.name not in BODY:
            continue
        t = next((sh for sh in sl.shapes
                  if sh.has_text_frame and sh.name.startswith("Title")), None)
        if t is not None and t.text_frame.text.strip():
            body_n += 1
    add("title_underline", "제목 있는 본문 장 %d개" % body_n,
        "%d개" % max(0, rules - 2 * n), rules - 2 * n == body_n)

    # ⑨ 남은 꼴 — 카드 밴드·자간 등 기계로 잴 수 없는 것
    add("layout_ornament", "theme CSS 의 세부 꼴", "(부분 이식)", False)

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
