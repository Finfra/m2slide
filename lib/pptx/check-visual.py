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
import collections
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
sys.path.insert(0, HERE)
from pptxutil import iter_shapes, descr as shape_descr   # noqa: E402
DEFAULT_CONTRACT = os.path.join(HERE, "..", "..", "data", "m2slide2ppt", "fidelity.yml")
TRANSFORM = os.path.join(HERE, "..", "..", "data", "m2slide2ppt", "transform.yml")
P = "http://schemas.openxmlformats.org/presentationml/2006/main"
ORNAMENT_TAG = "m2slide:ornament"


def policy_section(name):
    """transform.yml 의 한 절 — 없으면 {}."""
    try:
        import yaml
        here = os.path.dirname(os.path.abspath(__file__))
        pth = os.path.join(here, "..", "..", "data", "m2slide2ppt", "transform.yml")
        return (yaml.safe_load(open(pth, encoding="utf-8")) or {}).get(name) or {}
    except Exception:
        return {}


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
        #   ⚠️ `mono|coding` 을 걸러내면 안 된다 — default_lec 의 본문 서체가
        #      **'Nanum Gothic Coding'** 이라 그 휴리스틱이 본문을 버리고 base.css 의
        #      Pretendard 를 보고했다(실측 2026-09-11). 선택자로 이미 본문을 특정했다
        if not chain or re.search(r"\binherit\b", chain, re.I):
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


def prs_titles(prs):
    for sl in prs.slides:
        for sh in iter_shapes(sl):
            if sh.has_text_frame and sh.name.startswith("Title") and sh.text_frame.text.strip():
                yield sh


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
            m = re.search(r'<a:majorFont>\s*<a:latin typeface="([^"]*)"', x, re.S)
            if m:
                out["majorFont"] = m.group(1)
            #   한글 제목은 ea·script="Hang" 서체로 그려진다 — latin 만 맞아도 안 맞는다
            mj = re.search(r"<a:majorFont>.*?</a:majorFont>", x, re.S)
            if mj:
                others = set(re.findall(r'<a:(?:ea|font script="Hang") typeface="([^"]*)"', mj.group(0)))
                out["majorFont_ea"] = sorted(others)
            #   마스터·레이아웃의 제목 placeholder 가 서체를 **리터럴로** 적으면 테마
            #   majorFont 는 무시된다 (실측 2026-09-11: retheme 이 `NanumGothicCoding` 을
            #   적어 두어 제목 서체가 통째로 안 먹었다 — majorFont 만 보면 초록불이었다)
            lit = set()
            for n_ in z.namelist():
                if n_.startswith("ppt/slideMasters/") or n_.startswith("ppt/slideLayouts/"):
                    xx = z.read(n_).decode("utf-8")
                    for mm in re.finditer(r"<p:sp>.*?</p:sp>", xx, re.S):
                        b_ = mm.group(0)
                        if re.search(r'<p:ph[^>]*type="(?:title|ctrTitle)"', b_):
                            lit |= set(re.findall(r'<a:(?:latin|ea) typeface="([^"+][^"]*)"', b_))
            out["title_ph_literal"] = sorted(lit)
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

    # ⑤ 서체 — CSS 이름을 그대로 대조하면 안 된다. CSS 는 @font-face 별칭이고 OS family 는
    #    다르다(`GmarketSansBold`→`Gmarket Sans`·`Nanum Gothic Coding`→`NanumGothicCoding`).
    #    정책 `font.*` 가 OS 이름을 소유하므로 그것과 대조하고, CSS 이름은 참고로 보인다
    fpol = {}
    try:
        fpol = (yaml.safe_load(open(os.path.normpath(TRANSFORM), encoding="utf-8")) or {}).get("font") or {}
    except Exception:
        pass
    cf = css_body_font(proj, css)
    want_b = fpol.get("body") or cf
    add("body_font", "%s → %s" % (cf or "?", want_b), pf.get("minorFont", "?"),
        pf.get("minorFont") == want_b)
    ctf = None
    root = os.path.dirname(os.path.dirname(os.path.abspath(proj)))
    base = os.path.join(root, "lib", "css", "base.css")
    for t in (css, open(base, encoding="utf-8").read() if os.path.isfile(base) else ""):
        mt = re.search(r"--title-font-family:\s*'?([^',;]+)", t)
        if mt:
            ctf = mt.group(1).strip()
            break
    want_t = fpol.get("title") or ctf
    bold_ok = True
    if fpol.get("title_bold"):
        for sl in prs_titles(pf["prs"]):
            for p_ in sl.text_frame.paragraphs:
                for r_ in p_.runs:
                    if r_.font.bold is not True:
                        bold_ok = False
    ea_bad = [e for e in pf.get("majorFont_ea", []) if e != want_t]
    lit = pf.get("title_ph_literal", [])
    note_t = ""
    if ea_bad:
        note_t += " ea/Hang=%s" % ",".join(ea_bad)
    if lit:
        note_t += " placeholder 리터럴=%s" % ",".join(lit)
    add("title_font", "%s → %s%s" % (ctf or "?", want_t, " +bold" if fpol.get("title_bold") else ""),
        "%s%s" % (pf.get("majorFont", "?"), "" if bold_ok else " (bold 아님)"),
        pf.get("majorFont") == want_t and bold_ok and not ea_bad and not lit, note_t.strip())

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
    #   ⚠️ 종류별로 센다. 합쳐 세면 로고·마스코트·표지 밑줄이 늘 때마다 계산이 깨진다
    kinds = collections.Counter()
    slides = list(prs.slides)
    expect_rules = 0
    for sl in slides:
        ttl_txt = ""
        for sh in iter_shapes(sl):
            d = shape_descr(sh)
            if d.startswith(ORNAMENT_TAG):
                kinds[d.split("/", 1)[1] if "/" in d else "rule"] += 1
            if sh.has_text_frame and sh.name.startswith("Title"):
                ttl_txt = sh.text_frame.text.strip().lower()
        #   Agenda 는 HTML 에 하단선이 없다(픽셀 1250 의 노랑은 박스 테두리) → 1줄
        expect_rules += 1 if ttl_txt == "agenda" else 2
    rules = kinds["rule"]
    n = len(slides) or 1
    add("theme_rule", "장별 기대 %d줄" % expect_rules, "%d개 / %d장" % (rules, n),
        rules >= expect_rules)
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
    #   표지 제목에도 밑줄이 있다(HTML `.cover-title::after`) — 본문 장 + 표지
    add("title_underline", "제목 있는 본문 장 %d개(+표지)" % body_n,
        "%d개" % kinds["underline"], kinds["underline"] >= body_n)

    # ⑧-b `Content with Caption` 장 — HTML 규칙대로 놓였는가
    #   pandoc 은 글+표/그림을 좌우(글 좁게·내용 우측·캡션)로 내지만 HTML 은
    #   리스트+이미지만 2분할이고 문단+표는 위아래(표는 가운데·회색 머리행)다.
    #   캡션(alt)은 화면에 없다. lane T `relayout_caption` 이 옮긴 결과를 잰다
    sp = policy_section("split_geometry") or {}
    tg = policy_section("table_geometry") or {}
    cw = g.get("canvas_w", 1920)
    cap_n, cap_bad = 0, []
    for i_, sl in enumerate(slides, 1):
        if sl.slide_layout.name != "Content with Caption" or not (sp and tg):
            continue
        cap_n += 1
        shs = list(iter_shapes(sl))
        tbl = next((sh for sh in shs if sh.has_table), None)
        pic = next((sh for sh in shs if str(sh.shape_type).startswith("PICTURE")
                    and not shape_descr(sh).startswith(ORNAMENT_TAG)), None)
        cap = next((sh for sh in shs if sh.has_text_frame and sh.name.startswith("TextBox")
                    and sh.is_placeholder and sh.text_frame.text.strip()), None)
        why = []
        if tbl is not None:
            cx = (tbl.left + tbl.width / 2.0) / px
            if abs(cx - cw / 2.0) > 4:
                why.append("표 중심 %d≠%d" % (round(cx), cw // 2))
            try:
                rgb = str(tbl.table.cell(0, 0).fill.fore_color.rgb)
            except Exception:
                rgb = "?"
            if rgb.upper() != str(tg.get("head_bg", "")).upper():
                why.append("머리행 %s≠%s" % (rgb, tg.get("head_bg")))
        if pic is not None:
            #   2분할은 HTML 휴리스틱대로 **리스트+이미지** 장에만 요구한다. 문단+이미지·
            #   이미지 단독 장은 pandoc 자리 그대로 두는 것이 현 계약이다(Issue343 로 이월)
            from pptx.oxml.ns import qn as _qn
            tph = next((sh for sh in shs if sh.has_text_frame and sh.name.startswith("Text")
                        and not sh.name.startswith("TextBox")), None)
            bullets = False
            if tph is not None:
                for p_ in tph.text_frame.paragraphs:
                    if p_.text.strip():
                        pPr = p_._p.find(_qn("a:pPr"))
                        if pPr is None or pPr.find(_qn("a:buNone")) is None:
                            bullets = True
            l_ = g.get("margin", 56) + sp["col_w"] + sp["gap"]
            if bullets and (pic.left / px < l_ - 2 or (pic.left + pic.width) / px > l_ + sp["col_w"] + 2):
                why.append("그림이 우측 열(%d..%d) 밖" % (l_, l_ + sp["col_w"]))
            if cap is not None:
                why.append("캡션 상자 잔존 %r" % cap.text_frame.text.strip()[:12])
        if why:
            cap_bad.append("p%d %s" % (i_, "·".join(why)))
    add("caption_layout", "표: 가운데·회색 머리행 / 그림: 우측 열·캡션 없음",
        "%d장 · 위반 %d" % (cap_n, len(cap_bad)), not cap_bad, "; ".join(cap_bad))

    # ⑨ 남은 꼴 — 카드 밴드·자간 등 기계로 잴 수 없는 것
    # ⑫ 테마 밖 폰트 — 주 러너가 옮겨 오며 **잃었던 축** (Issue358 재실행에서 발각)
    #
    #   `3.parity.sh` ⑥ 이 igTest 에서 `Menlo ×5` 를 잡았는데, 같은 결함이 aTest 에도
    #   있는데도 이 러너는 통과시켰다 — `body_font`(서체 일치)는 있어도 **템플릿 밖 서체를
    #   세는 축이 없었기 때문**이다. 주 러너가 3.parity → 6.roundtrip 으로 옮겨 가며
    #   검출 축 하나가 조용히 사라졌고, 구 러너로 재지 않았다면 계속 안 보였을 것이다.
    #
    #   왜 중요한가 — 템플릿에 없는 서체는 **그 폰트가 없는 머신에서 조용히 대체된다**.
    #   배포본이 보는 사람마다 달라지므로 `check-conform` 도 이것을 센다.
    #   ⚠️ 화이트리스트로 덮지 말 것 — 덮는 순간 이 축의 존재 이유가 사라진다
    #      (3.parity.sh 머리말의 같은 경고. 실제로 Courier ×20 을 그렇게 잡아냈다).
    #      허용 서체를 늘려야 한다면 **정책(transform.yml `font`)에 적고 그 값을 읽는다**.
    #   허용 기준은 **pptx 템플릿이 실제로 들고 있는 서체**(테마 major/minor)다.
    #   ⚠️ 정책(`transform.yml font.*`)을 허용 근거로 삼지 않는다 — 그러면 정책에 적기만
    #      하면 통과하므로 "화이트리스트로 덮기" 와 실질이 같아지고, 이 축이 막으려던
    #      위험(뷰어 머신에 그 폰트가 없어 조용히 대체됨)은 그대로 남는다.
    #      첫 판이 정확히 그 함정을 밟아 `font.code: Menlo` 때문에 Menlo 를 통과시켰다.
    theme_fonts = {x for x in (pf.get("majorFont"), pf.get("minorFont")) if x}
    used = {}
    for sl in slides:
        for sh in iter_shapes(sl):
            if not sh.has_text_frame:
                continue
            for para in sh.text_frame.paragraphs:
                for r_ in para.runs:
                    nm = r_.font.name
                    if nm:
                        used[nm] = used.get(nm, 0) + 1
    outside = {f: c for f, c in used.items() if f not in theme_fonts}
    add("font_outside_theme",
        ("템플릿 서체 %s" % ", ".join(sorted(theme_fonts))) if theme_fonts else "(템플릿 서체 없음)",
        ("밖 %s" % ", ".join("%s ×%d" % kv for kv in sorted(outside.items()))) if outside
        else "밖 0",
        not outside)

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
