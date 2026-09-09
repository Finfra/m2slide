#!/usr/bin/env python3
"""m2slide → pptx → m2slide 왕복 충실도 검사 (Issue342).

무엇을 재나
-----------
`check-conform`·`check-xml-order`·`check-empty` 는 **pptx 내부 규격**을 잰다 —
PowerPoint 가 열 수 있는가, 장이 비지 않았는가. 그러나 *"원고가 제대로 옮겨졌는가"*
는 아무도 보지 않았다. 실측(aTest, 2026-09-09) 에서 그 셋이 전부 통과한 pptx 가
frontmatter·디렉티브·컴포넌트·htmlart 종류를 잃고 있었다.

이 검사는 **원본 md 와 왕복 후 md 를 요소 단위로 대조**하고, 그 차이를
[fidelity.yml](../../data/m2slide2ppt/fidelity.yml) 의 선언과 맞춘다.

판정
----
    선언된 손실(declared_drop)      통과 — 그것을 선언해 둔 것이 계약의 목적이다
    선언된 변형(lossy)              내용(문구·개수)이 남아 있으면 통과
    무손실 선언(lossless)           다르면 FAIL
    선언된 생성물(synthesized)      역변환이 지웠어야 한다 — 남아 있으면 FAIL
    **선언에 없는 차이**            FAIL — 계약이 현실을 못 따라간 것이다

마지막 줄이 이 도구의 존재 이유다. 손실을 없애는 것이 아니라 **모르는 손실을 없애는**
것이 목표이므로, 새 손실이 생기면 계약을 고치거나 변환을 고치거나 둘 중 하나를 강제한다.

사용
----
    check-roundtrip.py <원본 프로젝트> <왕복 프로젝트> [--contract PATH] [--json PATH]

    rc 0  계약대로 (undeclared 0 · grade 위반 0)
    rc 1  계약 밖 차이 있음
    rc 2  입력 문제 (프로젝트·원고 없음)
"""
import argparse
import collections
import glob
import json
import os
import re
import sys

try:
    import yaml
except ImportError:
    print("PyYAML 필요: pip install pyyaml", file=sys.stderr)
    sys.exit(2)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE)) if False else os.path.dirname(HERE)
DEFAULT_CONTRACT = os.path.join(os.path.dirname(HERE), "..", "data", "m2slide2ppt", "fidelity.yml")

# build-source.py 와 같은 어휘 — 어긋나면 판정이 갈리므로 여기서 한 번에 본다
COMPONENT_FENCES = {"chart", "d3", "p5", "map", "model3d", "react"}
WORDART_FENCES = {"wordart"}
LANE_B_DIVS = {
    "cards", "htmlart numbered", "htmlart process", "htmlart compare",
    "htmlart timeline", "htmlart chevron", "htmlart step", "htmlart funnel",
}

RE_FM = re.compile(r"\A\s*---\n(.*?)\n---\n", re.S)
RE_H1 = re.compile(r"^#[ \t]+(.+?)[ \t]*$")
RE_H2 = re.compile(r"^##[ \t]+(.+?)[ \t]*$")
RE_ID = re.compile(r"^[ \t]*#id-([a-z][a-z0-9-]*)[ \t]*$")
RE_ANIM = re.compile(
    r"^[ \t]*#((?:transition|background|autoslide)-[\w.#-]+|auto-animate)[ \t]*$")
RE_LAYOUT = re.compile(r"^[ \t]*#(?:layout-)?(_?[a-z][a-z0-9-]*)[ \t]*$")
RE_FENCE = re.compile(r"^[ \t]*```([\w-]*)[ \t]*$")
RE_DIV_OPEN = re.compile(r"^[ \t]*:::+[ \t]*([^:{]+?)[ \t]*(?:\{[^}]*\})?[ \t]*$")
RE_DIV_CLOSE = re.compile(r"^[ \t]*:::+[ \t]*$")
RE_IMG = re.compile(r"!\[([^\]]*)\]\(([^)\s]+)")
RE_BULLET = re.compile(r"^([ \t]*)[*+-][ \t]+(.+?)[ \t]*$")
RE_TABLE = re.compile(r"^[ \t]*\|.*\|[ \t]*$")
RE_ATTR = re.compile(r"\{\.[a-zA-Z][\w .-]*\}")
RE_SYMBOL = re.compile(r":fa-[\w-]+:")
RE_SLOT_RIGHT = re.compile(r"^[ \t]*::right::[ \t]*$")
RE_MATH_D = re.compile(r"\$\$(.+?)\$\$|\\\[(.+?)\\\]", re.S)
RE_MATH_I = re.compile(r"\\\((.+?)\\\)", re.S)
RE_DROP_NOTE = re.compile(r"^[ \t]*·\s*(.+?)\s*—\s*웹 슬라이드에서 동작하는 요소입니다")


def norm(s):
    """비교용 정규화 — 문장부호·공백 요동으로 갈리지 않게 한다."""
    s = re.sub(r"\*\*|__|`", "", s)          # 강조·인라인코드 마크업
    s = re.sub(r"\\([.)])", r"\1", s)        # bullet_text 가 넣은 이스케이프
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def sources(project_dir):
    """원고 목록 — build-source.sources() 와 같은 규칙."""
    mdd = os.path.join(project_dir, "markdown")
    if os.path.isdir(mdd):
        out = [p for p in sorted(glob.glob(os.path.join(mdd, "*.md")))
               if os.path.basename(p) != "AGENDA.md"
               and not os.path.basename(p).endswith("_note.md")]
        if out:
            return out
    out = [p for p in sorted(glob.glob(os.path.join(project_dir, "*.md")))
           if not os.path.basename(p).endswith("_note.md")
           and os.path.basename(p) not in ("README.md", "Info.md")]
    return out


def parse(path):
    """원고 하나를 슬라이드 목록으로. 각 슬라이드는 요소 카테고리 → 값 목록."""
    text = open(path, encoding="utf-8").read()
    fm = {}
    m = RE_FM.match(text)
    if m:
        try:
            fm = yaml.safe_load(m.group(1)) or {}
        except Exception:
            fm = {}
        text = text[m.end():]

    slides, cur = [], []
    for ln in text.split("\n"):
        if re.match(r"^[ \t]*-{3,}[ \t]*$", ln):
            slides.append(cur)
            cur = []
        else:
            cur.append(ln)
    slides.append(cur)

    out = []
    for lines in slides:
        if not any(l.strip() for l in lines):
            continue
        out.append(scan(lines))
    return fm, out


def scan(lines):
    """슬라이드 한 장의 요소 추출."""
    e = collections.defaultdict(list)
    in_fence, fence_lang, fence_buf = False, None, []
    div_stack = []

    for ln in lines:
        mf = RE_FENCE.match(ln)
        if mf and not in_fence:
            in_fence, fence_lang, fence_buf = True, mf.group(1) or "", []
            continue
        if in_fence:
            if RE_FENCE.match(ln):
                body = norm(" ".join(x.strip() for x in fence_buf if x.strip()))
                if fence_lang in COMPONENT_FENCES:
                    e["component_fence"].append(fence_lang)
                elif fence_lang in WORDART_FENCES:
                    e["wordart_fence"].append(body[:80])
                else:
                    e["code_block"].append(body[:120])
                in_fence, fence_lang = False, None
            else:
                fence_buf.append(ln)
            continue

        if RE_DIV_CLOSE.match(ln) and div_stack:
            div_stack.pop()
            continue
        md = RE_DIV_OPEN.match(ln)
        if md:
            raw = re.sub(r"[ \t]+", " ", md.group(1)).strip()
            div_stack.append(raw)
            if raw == "cards":
                e["cards"].append(raw)
            elif raw in LANE_B_DIVS:
                e["htmlart_lane_b"].append(raw)
            elif raw.startswith("htmlart"):
                e["htmlart_lane_c"].append(raw)
            else:
                e["div_other"].append(raw)
            continue

        if RE_SLOT_RIGHT.match(ln):
            e["slot_right"].append("::right::")
            continue
        m = RE_ID.match(ln)
        if m:
            e["directive_id"].append(m.group(1))
            continue
        m = RE_ANIM.match(ln)
        if m:
            e["directive_animation"].append(m.group(1))
            continue
        m = RE_H1.match(ln)
        if m:
            e["h1_chapter"].append(norm(m.group(1)))
            continue
        m = RE_H2.match(ln)
        if m:
            e["h2_slide_title"].append(norm(m.group(1)))
            continue
        if ln.startswith("#") and RE_LAYOUT.match(ln):
            e["directive_layout"].append(RE_LAYOUT.match(ln).group(1))
            continue

        if RE_TABLE.match(ln):
            cells = [norm(c) for c in ln.strip().strip("|").split("|")]
            if not all(re.fullmatch(r":?-{2,}:?", c.replace(" ", "")) for c in cells if c):
                e["table"].append(" | ".join(cells))
            continue

        for mm in RE_IMG.finditer(ln):
            e["image"].append(norm(mm.group(1)) or os.path.basename(mm.group(2)))
        for mm in RE_MATH_D.finditer(ln):
            e["math_display"].append(norm(mm.group(1) or mm.group(2)))
        for mm in RE_MATH_I.finditer(ln):
            e["math_inline"].append(norm(mm.group(1)))
        for mm in RE_ATTR.finditer(ln):
            e["inline_fragment"].append(mm.group(0))
        for mm in RE_SYMBOL.finditer(ln):
            e["inline_symbol"].append(mm.group(0))

        mdrop = RE_DROP_NOTE.match(ln)
        if mdrop:
            e["component_drop_note"].append(norm(mdrop.group(1)))
            continue

        mb = RE_BULLET.match(ln)
        if mb:
            body = RE_ATTR.sub("", mb.group(2))
            body = RE_SYMBOL.sub("", body)
            lvl = len(mb.group(1).replace("\t", "  ")) // 2
            e["bullets"].append("%d:%s" % (lvl, norm(body)))
            continue

        if ln.strip() and not ln.strip().startswith("!["):
            body = RE_ATTR.sub("", ln)
            body = RE_SYMBOL.sub("", body)
            body = RE_MATH_D.sub("", body)
            body = RE_MATH_I.sub("", body)
            body = RE_IMG.sub("", body)
            if norm(body):
                e["paragraph"].append(norm(body))
    return dict(e)


def collect(project_dir):
    """프로젝트 전체를 하나의 요소 집합으로."""
    srcs = sources(project_dir)
    if not srcs:
        return None, None, []
    fm_all, slides = {}, []
    for p in srcs:
        fm, sl = parse(p)
        if fm and not fm_all:
            fm_all = fm
        slides += sl
    synth = set(toc_slides(slides))
    agg = collections.defaultdict(list)
    for i, s in enumerate(slides):
        if i in synth:
            continue          # 자동 목차 장은 synthesized — 본문 요소로 세지 않는다
        for k, v in s.items():
            agg[k] += v
    return fm_all, dict(agg), slides


def toc_slides(slides):
    """자동 생성된 챕터 TOC 장을 찾는다 (build-source ⑧ `normalize_chapter`).

    조건 둘을 **함께** 본다:
        ① 직전 장이 `# H1` 만 있는 장 — pandoc 이 Section Header 로 내는 진입 장
        ② 이 장의 최상위 불릿이 **이후 장들의 제목 집합에 포함**된다

    ② 만으로는 사람이 직접 쓴 목차 슬라이드까지 걸린다. 그것은 원고의 일부라
    지워서는 안 되므로, 자동 생성의 표식인 ① 을 반드시 함께 요구한다.
    """
    titles = [s.get("h2_slide_title", [""])[0] for s in slides]
    hits = []
    for i, s in enumerate(slides):
        if i == 0:
            continue
        prev = slides[i - 1]
        if not prev.get("h1_chapter") or prev.get("h2_slide_title"):
            continue                              # ① 진입 장 직후가 아니다
        b = [x.split(":", 1)[1] for x in s.get("bullets", []) if x.startswith("0:")]
        if len(b) < 2:
            continue
        later = set(t for t in titles[i + 1:] if t)
        if later and set(b) <= later:
            hits.append(i)
    return hits


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("origin")
    ap.add_argument("roundtrip")
    ap.add_argument("--contract", default=os.path.normpath(DEFAULT_CONTRACT))
    ap.add_argument("--json")
    a = ap.parse_args()

    for d in (a.origin, a.roundtrip):
        if not os.path.isdir(d):
            print("❌ 프로젝트 없음: %s" % d, file=sys.stderr)
            return 2

    contract = yaml.safe_load(open(a.contract, encoding="utf-8"))
    decl = {e["id"]: e for e in contract["elements"]}

    o_fm, o_agg, o_slides = collect(a.origin)
    r_fm, r_agg, r_slides = collect(a.roundtrip)
    if o_agg is None or r_agg is None:
        print("❌ 원고를 찾지 못했다", file=sys.stderr)
        return 2

    # frontmatter 는 요소 집합 밖이라 따로 센다
    o_fm = o_fm or {}
    r_fm = r_fm or {}
    o_agg = dict(o_agg)
    r_agg = dict(r_agg)
    if o_fm.get("title"):
        o_agg["frontmatter_title"] = [norm(str(o_fm["title"]))]
    if r_fm.get("title"):
        r_agg["frontmatter_title"] = [norm(str(r_fm["title"]))]
    o_agg["frontmatter_meta"] = sorted(k for k in o_fm if k != "title")
    r_agg["frontmatter_meta"] = sorted(k for k in r_fm if k != "title")

    keys = sorted(set(o_agg) | set(r_agg))
    rows, fails, undeclared = [], [], []

    for k in keys:
        oc = collections.Counter(o_agg.get(k, []))
        rc_ = collections.Counter(r_agg.get(k, []))
        lost = oc - rc_
        gained = rc_ - oc
        if not lost and not gained:
            status, note = "OK", ""
            rows.append((k, len(list(oc.elements())), len(list(rc_.elements())),
                         decl.get(k, {}).get("grade", "—"), status, note))
            continue

        d = decl.get(k)
        grade = d["grade"] if d else None
        nl, ng = len(list(lost.elements())), len(list(gained.elements()))
        sample = ", ".join(list(lost)[:2] + ["+" + x for x in list(gained)[:2]])[:70]

        if grade is None:
            status, note = "FAIL", "계약 미선언 — %s" % sample
            undeclared.append(k)
            fails.append((k, note))
        elif grade == "lossless":
            status, note = "FAIL", "무손실 선언인데 −%d/+%d — %s" % (nl, ng, sample)
            fails.append((k, note))
        elif grade == "lossy":
            if nl and not rc_:
                status, note = "FAIL", "내용이 통째로 사라짐 (−%d)" % nl
                fails.append((k, note))
            else:
                status, note = "ok(lossy)", "−%d/+%d %s" % (nl, ng, sample)
        elif grade == "declared_drop":
            if ng:
                status, note = "FAIL", "드롭 선언인데 생성됨 (+%d) — %s" % (ng, sample)
                fails.append((k, note))
            else:
                status, note = "ok(drop)", "−%d 선언대로" % nl
        elif grade == "synthesized":
            status, note = "ok(synth)", "+%d" % ng
        else:
            status, note = "FAIL", "알 수 없는 등급 %s" % grade
            fails.append((k, note))

        rows.append((k, len(list(oc.elements())), len(list(rc_.elements())),
                     grade or "—", status, note))

    # synthesized 장이 왕복본에 남아 있는가
    synth = toc_slides(r_slides)
    synth_o = toc_slides(o_slides)
    extra_synth = len(synth) - len(synth_o)
    if extra_synth > 0:
        fails.append(("chapter_toc_slide",
                      "왕복본에 자동 목차 장이 %d 개 남아 있다 — 역변환이 지워야 한다" % extra_synth))

    w = max(len(r[0]) for r in rows) + 2
    print("=" * 78)
    print("라운드트립 충실도 — %s ↔ %s" % (a.origin, a.roundtrip))
    print("=" * 78)
    print("%-*s %5s %5s  %-14s %-10s %s" % (w, "요소", "원본", "왕복", "등급", "판정", "비고"))
    print("-" * 78)
    for k, n1, n2, g, st, note in rows:
        print("%-*s %5d %5d  %-14s %-10s %s" % (w, k, n1, n2, g, st, note))
    print("-" * 78)
    print("슬라이드 — 원본 %d 장 · 왕복 %d 장" % (len(o_slides), len(r_slides)))
    if undeclared:
        print("⚠️  계약에 없는 요소 %d 종: %s" % (len(undeclared), ", ".join(undeclared)))
    if fails:
        print("❌ 계약 밖 차이 %d 건" % len(fails))
        for k, note in fails:
            print("   · %-24s %s" % (k, note))
    else:
        print("✅ 계약대로 — 선언되지 않은 손실 0")

    if a.json:
        json.dump({"rows": rows, "fails": fails, "undeclared": undeclared},
                  open(a.json, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
