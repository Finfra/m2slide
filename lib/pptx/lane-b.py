#!/usr/bin/env python3
"""lane-b.py — cards·정형 htmlart 를 **네이티브 도형**으로 다시 그린다 (Issue331)

무엇을 하나
-----------
lane A(`build-source.py` → `md2pptx`)가 만든 pptx 는 `::: cards` 와 정형 htmlart 를
**평문 불릿**으로 눕힌다. pptx 에 "카드 그리드"라는 어휘가 없기 때문이다(설계 O3).
이 스크립트가 그 자리를 도형으로 바꾼다 — 그림이 아니라 **편집 가능한 도형 텍스트**로.

    _pipeline/pptx/lane-b.json   ← build-source.py 가 적은 대상 목록(⑫)
              │
              ├─ ppt-info/scripts/info-build.py   (글로벌 · 무수정 호출)
              │        └ `pptx-info` 펜스 → blocks.py 렌더 → 한 장짜리 pptx
              │
              └─ 이 스크립트가 그 장의 도형을 **본문 자리에 끼워 넣는다**

⚠️ 사본을 두지 않는다
---------------------
도형을 그리는 것은 전부 글로벌 `ppt-info` 다(`blocks.py`·`ppt_kit.py` — prj82
`lib/blocks.py` 의 졸업본). m2slide 가 갖는 것은 **배선과 판정**뿐이다. 렌더러를
이쪽에 복제하면 두 벌이 갈리고, 갈린 날 어느 쪽이 정본인지 아무도 모른다.

자산(`_asset_ppt/lib`)의 씨딩도 우리가 하지 않는다 — 글로벌 `igpath.ensure_asset()`
이 단일 주체다(ppt-info inputs.md §1). 우리는 그 함수를 부르고, 그것이 심은 골격 위에
**우리가 실측한 theme.yml** 을 얹는다.

⚠️ lane A 를 절대 깨지 않는다
-----------------------------
lane B 는 **덧칠**이다. 어느 단계에서 실패해도(자산 부재·pyyaml 부재·렌더 실패·본문
대조 불일치) 그 장은 손대지 않고 넘어가며, 남는 것은 lane A 의 평문 불릿이다.
그래서 이 스크립트는 **rc0 으로 끝나는 것이 기본**이고, 실패는 stderr 로 크게 알린다.
*"구조가 먼저다"* 라는 순서(설계 3레인 표)를 배선으로 굳힌 것이다.

⚠️ 본문 대조가 안전장치다
-------------------------
어느 문단을 지울지를 **셈으로 맞히지 않는다.** 사이드카가 적어 둔 `flat`(블록이 만들어
낼 문단 문자열)이 실제 본문 문단의 **끝과 정확히 일치할 때만** 지운다. 원고가 조금만
달라져도(펜스 위치·평탄화 규칙 변경) 대조가 깨지고, 그때는 지우지 않고 건너뛴다.

사용
----
    lane-b.py <project_dir> <out_pptx> --theme-yml <theme.yml> [--quiet]

    rc 0  정상(대상 0건·부분 적용 포함)   rc 1  인자·경로 오류
"""
import argparse
import copy
import json
import math
import os
import re
import subprocess
import sys
import tempfile
import unicodedata

SKILLS = os.environ.get("M2SLIDE_PPT_SCAR", os.path.expanduser("~/.claude/skills"))
INFO_BUILD = os.path.join(SKILLS, "ppt-info", "scripts", "info-build.py")
IGPATH_DIR = os.path.join(SKILLS, "ig-maker", "scripts")

EMU_MM = 36000.0
NS_R = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
# `spTree` 자신의 속성 — 대상 장에 이미 있으므로 옮기면 중복돼 스키마 위반이 된다
SKIP_TAGS = ("nvGrpSpPr", "grpSpPr")

# 도형 안 글자 크기. 본문 불릿(CSS 실측 20pt)을 그대로 쓰면 카드 폭 100mm 에 한글 14자라
# 두 줄짜리 설명이 카드를 넘긴다 — 카드는 **밀집 표현**이라 본문보다 작은 것이 정상이다.
BLOCK_PT = (13.0, 12.0, 11.0, 10.0, 9.0)
GAP_MM = 4.0                      # 본문 불릿 ↔ 도형 사이


def warn(msg):
    sys.stdout.flush()
    sys.stderr.write("  ⚠️ lane B — %s\n" % msg)
    sys.stderr.flush()


# ── 글자 폭 추정 ──────────────────────────────────────────────────────────
def em_width(s):
    """문자열의 폭을 **em 단위**로 어림한다. 한글·한자·가나는 1, 나머지는 0.55.

    정확한 조판은 렌더러만 안다. 여기서는 *"몇 줄이 되나"* 만 알면 되고, 과대추정이
    안전한 방향이다(박스가 커지는 쪽으로 틀린다 — 글자가 잘리는 쪽이 아니라).
    """
    return sum(1.0 if unicodedata.east_asian_width(c) in ("W", "F") else 0.55 for c in s)


def wrapped(text, box_mm, pt):
    """`box_mm` 폭 상자에 `pt` 크기로 넣었을 때의 줄 수(≥1)."""
    per = max(box_mm / (pt * 0.3528), 1.0)     # 1pt = 0.3528mm
    return max(1, int(math.ceil(em_width(text) / per)))


def line_mm(pt):
    return pt * 0.3528 * 1.25


# ── 사이드카 · 자산 ───────────────────────────────────────────────────────
def load_targets(work):
    p = os.path.join(work, "lane-b.json")
    if not os.path.isfile(p):
        warn("사이드카가 없다 — %s (build-source 가 ⑫ 를 돌지 않았다)" % p)
        return [], []
    with open(p, encoding="utf-8") as f:
        d = json.load(f)
    t = d.get("targets", [])
    return [x for x in t if x.get("lane") == "b"], [x for x in t if x.get("lane") != "b"]


def ensure_asset(work, theme_name):
    """글로벌 `igpath.ensure_asset()` 로 `_asset_ppt` 골격을 확보한다.

    ⚠️ 씨딩 주체를 우리가 대신하지 않는다(ppt-info inputs.md §1 — *"단일 주체"*).
       그 함수가 심는 것은 `lib/{theme,ppt_kit,blocks}.py` 와 빈 theme.yml 이고,
       우리는 그 위에 **실측 theme.yml** 을 덮는다.
    """
    sys.path.insert(0, IGPATH_DIR)
    try:
        import igpath
    except ImportError:
        warn("igpath 를 못 찾았다 — %s. lane B 를 건너뛴다" % IGPATH_DIR)
        return None
    asset = os.path.join(work, "_asset_ppt")
    try:
        igpath.ensure_asset(asset, name=theme_name)
    except SystemExit as e:
        warn("자산 씨딩 실패(rc=%s) — lane B 를 건너뛴다" % e.code)
        return None
    lib = os.path.join(asset, "lib")
    if not os.path.isdir(lib):
        warn("자산 lib 이 없다 — %s. lane B 를 건너뛴다" % lib)
        return None
    return asset


def write_theme(asset, theme_name, base_yml, left, width, y0, pt):
    """실측 theme.yml 을 **lane B 판형**으로 고쳐 자산 테마 자리에 쓴다.

    고치는 것은 둘뿐이다:
      margin  → 대상 장의 **본문 placeholder 기하**. 테마 기본값(전폭)으로 그리면
                도형이 제목보다 넓어져 같은 장 안에서 좌우가 어긋난다(실측: 제목
                12.7~241.3mm vs 전폭 10.2~328.5mm)
      font    → 도형 안 글자. 위 BLOCK_PT 주석 참조

    나머지(색·캔버스)는 **손대지 않는다** — 그것이 CSS 실측으로 얻은 값이고,
    lane A 와 같은 팔레트를 쓰는 것이 이 배선의 목적이기 때문이다.
    """
    with open(base_yml, encoding="utf-8") as f:
        src = f.read()
    src = re.sub(r"^(\s*name:\s*).*$", r"\g<1>%s" % theme_name, src, count=1, flags=re.M)
    src = re.sub(r"(^margin:\n)(?:[ \t]+\S.*\n)*", 
                 "margin:\n  l: %.2f\n  w: %.2f\n  split: 0.5\n" % (left, width),
                 src, count=1, flags=re.M)
    src = re.sub(r"^(\s*body:\s*)[\d.]+", r"\g<1>%.1f" % pt, src, count=1, flags=re.M)
    src = re.sub(r"^(\s*y0:\s*)[\d.]+", r"\g<1>%.2f" % y0, src, count=1, flags=re.M)
    d = os.path.join(asset, "theme", theme_name)
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "theme.yml"), "w", encoding="utf-8") as f:
        f.write(src)


# ── 블록 데이터 ───────────────────────────────────────────────────────────
def join_subs(subs):
    """카드 본문 — 하위 불릿을 한 줄로 잇는다.

    `cards` 블록의 `desc` 는 문자열 하나다. 여러 줄을 넣을 자리가 없으므로 가운뎃점으로
    잇는다 — HTML 카드가 여러 줄일 때 쓰는 마커와 같다(md-m2slide-rules 카드 절).
    """
    return " · ".join(s for s in subs if s)


def _fill(need, avail):
    """필요 높이를 **남은 자리에 맞춰 키운다**(넘지는 않는다).

    글자에 딱 맞는 높이만 주면 카드가 얇은 띠가 되고 아래가 통째로 빈다(실측: 본문 아래
    71mm 가 남는데 카드는 20mm). 반대로 남은 자리를 다 먹이면 두 줄짜리 카드가 화면
    절반을 차지한다. 그래서 **필요치 이상 · 남은 자리의 45% 이내 · 42mm 상한**으로 잡는다.
    """
    return round(min(avail, max(need, min(avail * 0.45, 42.0))), 1)


def build_page(t, cw_mm, pt, avail):
    """사이드카 항목 → `pptx-info` 블록 리스트 + 필요한 높이.

    ⚠️ 높이를 데이터로 **명시**한다. 블록 기본값(cards 26mm)은 9.5pt 본문을 전제한
       값이라, 크기를 바꾸면 글자가 상자를 넘긴다. 넘치는지는 렌더러가 알려주지
       않으므로(그림이 이상해질 뿐이다) 여기서 재서 준다.
    """
    kind, items = t["kind"], t["items"]
    if kind in ("cards", "process"):
        n = max(len(items), 1)
        inner = max((cw_mm - 3.5 * (n - 1)) / n - 2.4, 10.0)
        rows = 0
        for it in items:
            rows += wrapped(it["title"], inner, pt)
            d = join_subs(it["subs"])
            if d:
                rows += wrapped(d, inner, pt)
        rows = max(rows / n, 2)                       # 카드 하나가 감당할 줄 수
        h = _fill(rows * line_mm(pt) + 8.0, avail)
        data = []
        for i, it in enumerate(items, 1):
            e = {"title": it["title"], "desc": join_subs(it["subs"])}
            if kind == "process":
                e["no"] = "%02d." % i
                e["id"] = "st%d" % i
            data.append(e)
        blocks = [{"kind": "cards", "h": round(h, 1), "accent": "bar", "items": data}]
        if kind == "process" and len(items) >= 2:
            # 순차 단계는 **연결이 내용**이다. `p:cxnSp` 는 도형에 붙으므로 사용자가
            # PowerPoint 에서 카드를 옮겨도 화살표가 따라온다(ppt-info flow_arrow docstring)
            for i in range(1, len(items)):
                blocks.append({"kind": "flow_arrow", "from": "st%d" % i, "to": "st%d" % (i + 1)})
        return blocks, h

    if kind == "compare":
        inner = max(cw_mm / 2 - 6.0, 10.0)
        rows = 0
        for it in items:
            rows = max(rows, wrapped(it["title"], inner, pt)
                       + sum(wrapped(s, inner, pt) for s in it["subs"]))
        h = _fill(rows * line_mm(pt) + 10.0, avail)
        side = [{"title": it["title"], "items": list(it["subs"])} for it in items]
        return [{"kind": "compare", "h": round(h, 1),
                 "left": side[0], "right": side[1]}], h

    return None, 0.0


# ── pptx 조작 ─────────────────────────────────────────────────────────────
def norm(s):
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", s or "")).strip()


def body_ph(slide):
    """제목이 아닌 **첫 본문 placeholder**. 없으면 None."""
    from pptx.enum.shapes import PP_PLACEHOLDER
    for sh in slide.shapes:
        if not sh.is_placeholder or not sh.has_text_frame:
            continue
        pf = sh.placeholder_format
        if pf.idx == 0 or pf.type in (PP_PLACEHOLDER.TITLE, PP_PLACEHOLDER.CENTER_TITLE):
            continue
        return sh
    return None


def slide_title(slide):
    from pptx.enum.shapes import PP_PLACEHOLDER
    for sh in slide.shapes:
        if not sh.is_placeholder or not sh.has_text_frame:
            continue
        pf = sh.placeholder_format
        if pf.idx == 0 or pf.type in (PP_PLACEHOLDER.TITLE, PP_PLACEHOLDER.CENTER_TITLE):
            return norm(sh.text_frame.text)
    return None


def geometry(shape, slide):
    """placeholder 기하(mm). 슬라이드에 없으면 **레이아웃에서 상속**한 값을 쓴다."""
    def pick(attr):
        v = getattr(shape, attr)
        if v is not None:
            return v
        for ph in slide.slide_layout.placeholders:
            if ph.placeholder_format.idx == shape.placeholder_format.idx:
                return getattr(ph, attr)
        return None
    vals = [pick(a) for a in ("left", "top", "width", "height")]
    if any(v is None for v in vals):
        return None
    return tuple(v / EMU_MM for v in vals)


def has_rel(el):
    """복사할 XML 에 관계 참조(`r:*`)가 있는지. 있으면 병합하지 않는다.

    rId 는 파트마다 독립이라 재매핑 없이 옮기면 그림·링크가 **조용히 깨진다**
    (PowerPoint 가 "복구가 필요합니다" 를 띄운다). 지금 lane B 블록은 도형·글자뿐이라
    이 경우가 없어야 정상이고, 생겼다면 재매핑을 붙이기 전까지는 넘기지 않는 편이 맞다.
    """
    for node in el.iter():
        if any(a.startswith(NS_R) for a in node.attrib):
            return True
    return False


def merge_shapes(src_slide, dst_slide):
    """렌더된 한 장의 도형을 대상 장으로 옮긴다. 옮긴 개수를 돌려준다."""
    tree = dst_slide.shapes._spTree
    n = 0
    for el in src_slide.shapes._spTree:
        if el.tag.split("}")[-1] in SKIP_TAGS:
            continue
        new_el = copy.deepcopy(el)
        if has_rel(new_el):
            return -1
        tree.append(new_el)                 # nvGrpSpPr·grpSpPr 뒤 = 스키마상 올바른 자리
        n += 1
    return n


def trim_body(ph, flat):
    """본문 문단의 **끝**이 `flat` 과 일치하면 그만큼 지운다. 남은 문단 텍스트를 돌려준다.

    일치하지 않으면 `None` — 그 장은 손대지 않는다.
    """
    paras = list(ph.text_frame.paragraphs)
    texts = [norm("".join(r.text for r in p.runs)) for p in paras]
    want = [norm(x) for x in flat]
    if len(want) > len(texts) or texts[len(texts) - len(want):] != want:
        return None
    keep = texts[:len(texts) - len(want)]
    for p in paras[len(keep):]:
        p._p.getparent().remove(p._p)
    return keep


def main():
    ap = argparse.ArgumentParser(description="lane B — cards·정형 htmlart 를 네이티브 도형으로")
    ap.add_argument("project_dir")
    ap.add_argument("out_pptx")
    ap.add_argument("--theme-yml", required=True)
    ap.add_argument("--quiet", action="store_true")
    a = ap.parse_args()

    proj = os.path.abspath(a.project_dir)
    work = os.path.join(proj, "_pipeline", "pptx")
    if not os.path.isfile(a.out_pptx):
        warn("산출 pptx 가 없다 — %s" % a.out_pptx)
        return 1
    if not os.path.isfile(INFO_BUILD):
        warn("글로벌 ppt-info 가 없다 — %s. lane B 를 건너뛴다" % INFO_BUILD)
        return 0

    targets, deferred = load_targets(work)
    if deferred and not a.quiet:
        by = {}
        for d in deferred:
            by.setdefault(d.get("raw", "?"), []).append(d.get("title", ""))
        print("  lane C 이월 %d건 — %s"
              % (len(deferred), " · ".join("%s ×%d" % (k, len(v)) for k, v in sorted(by.items()))))
    if not targets:
        if not a.quiet:
            print("  lane B 대상 0장 — 건너뜀")
        return 0

    try:
        from pptx import Presentation
        from pptx.util import Mm
    except ImportError:
        warn("python-pptx 가 없다 — lane B 를 건너뛴다")
        return 0

    theme_name = "m2slide-laneb"
    asset = ensure_asset(work, theme_name)
    if asset is None:
        return 0
    lib = os.path.join(asset, "lib")

    prs = Presentation(a.out_pptx)
    slides = list(prs.slides)
    index = {}
    for i, s in enumerate(slides):
        index.setdefault(slide_title(s) or "", []).append(i)

    done, skipped = 0, []
    tmpdir = tempfile.mkdtemp(prefix="m2slide_laneb_")
    for ti, t in enumerate(targets, 1):
        title, label = norm(t["title"]), "%s / %s" % (t.get("src", "?"), t["title"][:28])
        cand = index.get(title, [])
        if t["ord"] >= len(cand):
            skipped.append("%s — 제목 대조 실패(후보 %d)" % (label, len(cand)))
            continue
        slide = slides[cand[t["ord"]]]
        ph = body_ph(slide)
        if ph is None:
            skipped.append("%s — 본문 placeholder 없음" % label)
            continue
        geo = geometry(ph, slide)
        if geo is None:
            skipped.append("%s — 본문 기하를 못 읽었다" % label)
            continue
        left, top, width, height = geo

        keep = trim_body(ph, t["flat"])
        if keep is None:
            skipped.append("%s — 본문 문단이 사이드카와 다르다(원고 변경?)" % label)
            continue

        # 남은 본문 높이 → 도형 시작 y. 남은 것이 없으면 placeholder 를 통째로 걷어낸다
        if keep:
            body_pt = 20.0
            m = re.search(r"^\s*body:\s*([\d.]+)", open(a.theme_yml, encoding="utf-8").read(), re.M)
            if m:
                body_pt = float(m.group(1))
            rows = sum(wrapped(x, width - 4.0, body_pt) for x in keep)
            lead_h = min(rows * line_mm(body_pt) + 6.0, height - 24.0)
            # ⚠️ **네 값을 전부 적는다.** pandoc 이 만든 본문 placeholder 는 기하를
            #    슬라이드에 적지 않고 **레이아웃에서 상속**한다. 그 상태에서 height 만
            #    쓰면 python-pptx 가 `a:ext` 를 새로 만들며 `cx` 를 0 으로 두어
            #    **본문이 폭 0 으로 사라진다**(실측 2026-08-25: 13,44 0x50mm).
            ph.left, ph.top, ph.width, ph.height = (
                int(Mm(left)), int(Mm(top)), int(Mm(width)), int(Mm(lead_h)))
            y0 = top + lead_h + GAP_MM
        else:
            ph._element.getparent().remove(ph._element)
            y0 = top
        avail = max(top + height - y0, 12.0)

        blocks = pt = None
        need = 0.0
        for cand_pt in BLOCK_PT:
            blocks, need = build_page(t, width, cand_pt, avail)
            pt = cand_pt
            if blocks is None or need <= avail:
                break
        if blocks is None:
            skipped.append("%s — 카탈로그 종류 %r 를 그릴 줄 모른다" % (label, t.get("kind")))
            continue
        # 본문 글이 없는 장은 도형을 **본문 영역 가운데**에 놓는다. 위에 붙이면 아래가
        # 통째로 비어 장이 미완성으로 보인다(실측: 카드 42mm 아래로 84mm 공백).
        # 글이 있는 장은 그대로 글 바로 아래 — 읽는 순서가 위에서 아래이기 때문이다.
        if not keep and need < avail:
            y0 = top + (avail - need) / 2.0

        write_theme(asset, theme_name, a.theme_yml, left, width, y0, pt)
        stem = os.path.join(tmpdir, "p%02d" % ti)
        with open(stem + ".md", "w", encoding="utf-8") as f:
            for b in blocks:
                f.write("```pptx-info\n%s\n```\n\n" % json.dumps(b, ensure_ascii=False))
        r = subprocess.run([sys.executable, INFO_BUILD, stem + ".md", "--out", stem + ".pptx",
                            "--theme", theme_name, "--lib", lib, "--y0", "%.2f" % y0],
                           capture_output=True, text=True)
        if r.returncode != 0 or not os.path.isfile(stem + ".pptx"):
            skipped.append("%s — 렌더 실패: %s"
                           % (label, (r.stdout + r.stderr).strip().splitlines()[-1:] or ["?"]))
            continue
        moved = merge_shapes(list(Presentation(stem + ".pptx").slides)[0], slide)
        if moved < 0:
            skipped.append("%s — 도형에 관계 참조가 있어 병합하지 않았다" % label)
            continue
        done += 1

    prs.save(a.out_pptx)
    if not a.quiet:
        print("  lane B 도형 렌더 — %d/%d장 (%s)"
              % (done, len(targets), ", ".join(sorted({t["kind"] for t in targets}))))
    for s in skipped:
        warn(s)
    return 0


if __name__ == "__main__":
    sys.exit(main())
