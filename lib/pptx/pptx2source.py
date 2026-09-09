#!/usr/bin/env python3
"""pptx → m2slide 원고 역변환 — **왕복 검증 전용** (Issue342).

ppt2m2slide agent 와 무엇이 다른가
----------------------------------
저 agent 는 **남이 만든 임의의 pptx** 를 m2slide 로 옮기는 것이 일이다. 판단이 많고
느리고 비싸다(LLM). 이 스크립트는 목적이 하나다 — *"우리가 만든 pptx 를 원고로
되돌리면 원본이 나오는가"* 를 **매번 같은 값으로, 공짜로** 재는 것.

그래서 규칙이 하나 있다:

    ⚠️ **사이드카를 보지 않는다.** `lane-b.json`·`lane-m.json` 에는 원본이 그대로
       적혀 있어서 그것을 읽으면 늘 만점이 나온다. 그것은 커닝이지 검증이 아니다.
       이 스크립트는 **pptx 안에 실제로 남은 신호만** 본다 — 그 신호가 부족하다는
       사실이야말로 [fidelity.yml](../../data/m2slide2ppt/fidelity.yml) 이 잡아야 할 것이다.

pptx 에서 읽는 신호
-------------------
    Title Slide 레이아웃            frontmatter `title:`
    Section Header 레이아웃         `# H1`
    그 직후의 목차 장               자동 생성물(synthesized) — **버린다**
    Rounded Rectangle 묶음          `::: cards`  (커넥터 없음)
                                    `::: htmlart process` (커넥터 있음)
    표·그림·캡션                    마크다운 표 · `![캡션](img/…)`
    `mc:Fallback` 의 평문           수식 LaTeX (lane M 이 남겨 둔 것)
    `· … — 웹 슬라이드에서 …`       컴포넌트를 걷어낸 자리 표식 — **버린다**

사용
----
    pptx2source.py <pptx> <출력 프로젝트 dir> [--name NAME]
"""
import argparse
import collections
import json
import os
import re
import sys

try:
    from pptx import Presentation
    from pptx.util import Emu
except ImportError:
    print("python-pptx 필요", file=sys.stderr)
    sys.exit(2)

MC = "http://schemas.openxmlformats.org/markup-compatibility/2006"
P = "http://schemas.openxmlformats.org/presentationml/2006/main"
SIG_PREFIX = "m2slide:"
#   컴포넌트 펜스는 config 가 pptx 진입 전에 삭제되므로 종류만 알아도
#   되살릴 수 없다 — 코드블록 언어와 섞이지 않게 여기서 가른다
COMPONENT_FENCES = {"chart", "d3", "p5", "map", "model3d", "react"}
A = "http://schemas.openxmlformats.org/drawingml/2006/main"

DROP_NOTE = re.compile(r"^\s*·\s*.+?\s*—\s*웹 슬라이드에서 동작하는 요소입니다\s*$")
NUM_PREFIX = re.compile(r"^\s*\d{2}\.\s+")


def para_math(para):
    """문단에서 수식을 꺼낸다 — `mc:Fallback` 의 평문이 곧 원본 LaTeX 다.

    반환: [(순서, latex)] · 그리고 이 문단이 **수식 말고는 글이 없는가**(=display)
    """
    xml = para._p
    out = []
    for alt in xml.iter("{%s}AlternateContent" % MC):
        fb = alt.find("{%s}Fallback" % MC)
        if fb is None:
            continue
        t = "".join(x.text or "" for x in fb.iter("{%s}t" % A))
        if t.strip():
            out.append(t.strip())
    return out


def run_markup(child, emphasis):
    """run 하나를 글자로. `b`/`i` 속성을 마크다운 강조로 되돌린다.

    ⚠️ **코드블록에서는 하지 않는다.** 문법 하이라이트가 키워드를 bold 로 칠하므로
       그대로 옮기면 코드 안에 `**def**` 가 박힌다(실측: pandoc skylighting 이
       `def`·`return` 을 bold+색으로 낸다).
    """
    t = "".join(x.text or "" for x in child.iter("{%s}t" % A))
    if not emphasis or not t.strip():
        return t
    pr = child.find("{%s}rPr" % A)
    if pr is None:
        return t
    b, i = pr.get("b") == "1", pr.get("i") == "1"
    lead = t[:len(t) - len(t.lstrip())]
    tail = t[len(t.rstrip()):]
    core = t.strip()
    if b and i:
        core = "***%s***" % core
    elif b:
        core = "**%s**" % core
    elif i:
        core = "*%s*" % core
    return lead + core + tail


def text_with_math(para, emphasis=False):
    """문단 텍스트를 수식 자리 표시와 함께 되살린다.

    python-pptx 의 `para.text` 는 AlternateContent 를 건너뛰므로 수식이 **사라진
    자리에 공백만** 남는다(실측: '에너지 등가식은  이다.'). 자리를 그대로 쓰면
    원본의 어순이 깨지므로, XML 순회로 run 과 수식을 **문서 순서대로** 잇는다.
    """
    parts = []
    for child in para._p:
        tag = child.tag.split("}")[-1]
        if tag == "r":
            parts.append(("t", run_markup(child, emphasis)))
        elif tag == "br":
            parts.append(("t", "\n"))
        elif tag == "AlternateContent":
            fb = child.find("{%s}Fallback" % MC)
            if fb is not None:
                latex = "".join(x.text or "" for x in fb.iter("{%s}t" % A)).strip()
                if latex:
                    parts.append(("m", latex))
    text = "".join(p[1] for p in parts if p[0] == "t")
    maths = [p[1] for p in parts if p[0] == "m"]
    if not maths:
        return text, []
    if not text.strip():                      # 수식 말고 글이 없다 → display
        return "", [("display", m) for m in maths]
    # 문장 안 — 순서대로 인라인 표기로 되메운다
    buf = ""
    for kind, val in parts:
        buf += val if kind == "t" else "\\(%s\\)" % val
    return buf, [("inline", m) for m in maths]


def norm_txt(s):
    """비교용 정규화 — 강조 마크업·공백 요동으로 갈리지 않게 한다."""
    s = re.sub(r"\*\*\*|\*\*|__|`", "", s or "")
    s = re.sub(r"(?<!\w)[*_](?=\S)|(?<=\S)[*_](?!\w)", "", s)
    return re.sub(r"\s+", " ", s).strip()


def read_doc_signals(path):
    """`docProps/custom.xml` 에서 frontmatter 를 되찾는다 (lane S 가 심은 것).

    ⚠️ 이것은 커닝이 아니다 — **pptx 안에** 있는 표준 필드를 읽는 것이고,
       PowerPoint 로 편집·재저장한 파일에서도 똑같이 읽힌다. 사이드카
       (`lane-*.json`)와 다른 점이 그것이다.
    """
    import zipfile
    try:
        with zipfile.ZipFile(path) as z:
            if "docProps/custom.xml" not in z.namelist():
                return {}
            x = z.read("docProps/custom.xml").decode("utf-8")
    except Exception:
        return {}
    parts = re.findall(
        r'name="m2slide:frontmatter\.(\d+)"[^>]*>\s*<[^>]*lpwstr>(.*?)</',
        x, re.S)
    if not parts:
        return {}
    blob = "".join(v for _, v in sorted(parts, key=lambda t: int(t[0])))
    try:
        return json.loads(blob)
    except Exception:
        return {}


def read_slide_signals(slide):
    """제목 도형 alt-text 의 `m2slide:{…}` 를 읽는다."""
    for sh in slide.shapes:
        if not (sh.has_text_frame and sh.name.startswith("Title")):
            continue
        el = sh._element.find(".//{%s}cNvPr" % P)
        d = el.get("descr") if el is not None else None
        if d and d.startswith(SIG_PREFIX):
            try:
                return json.loads(d[len(SIG_PREFIX):])
            except Exception:
                return {}
    return {}


def para_kind(para):
    """문단이 불릿인가·산문인가·코드인가 — pptx 에 남은 신호로 가른다.

    실측(aTest, 2026-09-09):

        불릿      `bu*` 요소 없음           (pandoc 이 기본 불릿을 그대로 둔다)
        산문      `buNone`                  (`에너지 등가식은 … 이다.`)
        코드      `buNone` + `latin` 서체   (코드 폰트 교정이 서체를 박는다) + `br` 줄바꿈

    셋을 뭉뚱그리면 산문이 불릿으로, 코드가 한 줄짜리 불릿으로 되돌아온다 —
    실제로 첫 판에서 그렇게 나왔다.
    """
    xml = para._p
    tags = [c.tag.split("}")[-1] for c in xml.iter()]
    fonts = set(x.get("typeface") for x in xml.iter("{%s}latin" % A))
    fonts.discard(None)
    if "buNone" in tags:
        return "code" if fonts else "para"
    if "buAutoNum" in tags:
        return "ordered"          # pptx 가 자동 번호를 그대로 갖고 있다 — 신호가 불필요하다
    return "bullet"


def cell_text(c):
    return " ".join(p.text.strip() for p in c.text_frame.paragraphs if p.text.strip())


def md_table(tbl):
    rows = []
    for r in tbl.rows:
        rows.append([cell_text(c) for c in r.cells])
    if not rows:
        return []
    out = ["| " + " | ".join(rows[0]) + " |",
           "| " + " | ".join(":---" for _ in rows[0]) + " |"]
    for r in rows[1:]:
        out.append("| " + " | ".join(r) + " |")
    return out


def shape_lines(sh):
    """텍스트 도형 → (본문 줄, 수식 목록)."""
    lines, maths = [], []
    for para in sh.text_frame.paragraphs:
        kind0 = para_kind(para)
        text, m = text_with_math(para, emphasis=(kind0 != "code"))
        maths += m
        if m and m[0][0] == "display":
            lines.append(("math_display", m[0][1], 0))
            continue
        if not text.strip():
            continue
        if DROP_NOTE.match(text):
            lines.append(("dropnote", text.strip(), 0))
            continue
        lines.append((kind0, text.rstrip(), para.level))
    return lines, maths


def group_boxes(shapes):
    """AUTO_SHAPE 묶음을 카드 항목으로 — 액센트 바(가느다란 사각형)는 버린다.

    카드 한 장은 **제목 문단 + 본문 문단들**이다(도형 하나 안에 함께 있다).
    """
    boxes = []
    for sh in shapes:
        if not sh.has_text_frame:
            continue
        txts = [p.text.strip() for p in sh.text_frame.paragraphs if p.text.strip()]
        if not txts:
            continue                          # 액센트 바 — 글자가 없다
        boxes.append((sh.top or 0, sh.left or 0, txts))
    boxes.sort(key=lambda b: (b[0], b[1]))
    return [b[2] for b in boxes]


def render_div(kind, items):
    out = ["::: %s" % kind]
    for txts in items:
        head = NUM_PREFIX.sub("", txts[0]).strip()
        out.append("* **%s**" % head if kind == "cards" else "* %s" % head)
        for body in txts[1:]:
            out.append("  - %s" % body.strip())
    out.append(":::")
    return out


def convert(pptx_path, outdir, name):
    prs = Presentation(pptx_path)
    imgdir = os.path.join(outdir, "img")
    os.makedirs(imgdir, exist_ok=True)

    raw = []          # (kind, payload) — kind: cover|chapter|slide
    for slide in prs.slides:
        lay = slide.slide_layout.name
        title = ""
        for sh in slide.shapes:
            if sh.has_text_frame and sh.name.startswith("Title"):
                title = sh.text_frame.text.strip()
                break
        if lay == "Title Slide":
            raw.append(("cover", title))
            continue
        if lay == "Section Header":
            raw.append(("chapter", title))
            continue

        body, maths, captions = [], [], []
        autoshapes = [sh for sh in slide.shapes if sh.shape_type is not None
                      and str(sh.shape_type).startswith("AUTO_SHAPE")]
        connectors = [sh for sh in slide.shapes if str(sh.shape_type).startswith("LINE")]

        if autoshapes:
            items = group_boxes(autoshapes)
            # 커넥터가 카드 사이를 잇고 있으면 순차 블록이다 — 도형만 보면 이것이
            # 유일한 구분 신호이고, `cards` 와 `htmlart numbered` 는 같은 블록으로
            # 렌더되므로 **원리적으로 갈리지 않는다**. lane S 신호가 있으면 그것이 답이다.
            sig0 = read_slide_signals(slide)
            blocks_sig = list(sig0.get("block", []))
            kind = blocks_sig.pop(0) if blocks_sig else (
                "htmlart process" if connectors else "cards")
            body += render_div(kind, items)

        for sh in slide.shapes:
            st = str(sh.shape_type or "")
            if st.startswith("AUTO_SHAPE") or st.startswith("LINE"):
                continue
            if sh.name.startswith("Title"):
                continue
            if sh.has_table:
                body += [""] + md_table(sh.table)
                continue
            if st.startswith("PICTURE"):
                body.append(("__PIC__", sh))
                continue
            if sh.has_text_frame:
                if sh.name.startswith("TextBox") and any(
                        isinstance(x, tuple) and x[0] == "__PIC__" for x in body):
                    cap = sh.text_frame.text.strip()
                    if cap:
                        captions.append(cap)     # 그림 캡션 — alt 로 환원한다
                        continue
                lines, m = shape_lines(sh)
                maths += m
                body.append(("__TXT__", lines))
        raw.append(("slide", (title, body, captions, read_slide_signals(slide))))

    # ── 자동 목차 장 제거 — Section Header 직후 + 불릿이 이후 제목 집합에 포함
    drop = set()
    for i, (k, p) in enumerate(raw):
        if k != "slide" or i == 0 or raw[i - 1][0] != "chapter":
            continue
        bl = []
        for item in p[1]:
            if isinstance(item, tuple) and item[0] == "__TXT__":
                bl += [t for kind, t, lvl in item[1] if kind == "bullet" and lvl == 0]
        later = set(q[0] for kk, q in raw[i + 1:] if kk == "slide")
        if len(bl) >= 2 and later and set(bl) <= later:
            drop.add(i)

    # ── 원고 조립
    cover = next((p for k, p in raw if k == "cover"), name)
    fm = read_doc_signals(pptx_path)
    doc = ["---"]
    doc.append("title: %s" % (fm.get("title") or cover))
    for k, v in fm.items():
        if k == "title":
            continue
        doc.append("%s: %s" % (k, v))
    doc += ["---", ""]
    blocks = []
    for i, (k, p) in enumerate(raw):
        if k == "cover" or i in drop:
            continue
        if k == "chapter":
            blocks.append("# %s" % p)
            continue
        title, body, captions, sig = p
        cap_i = [0]
        bullet_n = [0]
        onum = {}
        quotes = {norm_txt(x.split("|", 1)[1]): x.split("|", 1)[0]
                  for x in sig.get("quote", []) if "|" in x}
        heads = {norm_txt(x.split(":", 1)[1]): int(x.split(":", 1)[0])
                 for x in sig.get("head", []) if ":" in x}
        out = ["## %s" % title]
        #   디렉티브 — lane S 가 심어 둔 것을 제목 바로 아래에 되돌린다
        for d in sig.get("id", []) + sig.get("anim", []) + \
                ["layout-" + x for x in sig.get("layout", [])]:
            out.append("#" + d)
        out.append("")
        for item in body:
            if isinstance(item, tuple) and item[0] == "__PIC__":
                sh = item[1]
                alt = captions[cap_i[0]] if cap_i[0] < len(captions) else title
                cap_i[0] += 1
                fn = "%s.%s" % (re.sub(r"\W+", "_", alt).strip("_").lower() or "img",
                                sh.image.ext)
                with open(os.path.join(imgdir, fn), "wb") as fp:
                    fp.write(sh.image.blob)
                out += ["", "![%s](./img/%s)" % (alt, fn)]
            elif isinstance(item, tuple) and item[0] == "__TXT__":
                for kind, t, lvl in item[1]:
                    if kind == "dropnote":
                        continue                 # 구조 표식 — 원고의 문장이 아니다
                    if kind == "math_display":
                        out += ["", "$$%s$$" % t]
                    elif kind == "code":
                        langs = [x for x in sig.get("fence", [])
                                 if x not in COMPONENT_FENCES]
                        out += ["", "```" + (langs[0] if langs else ""),
                                *t.split("\n"), "```"]
                    elif kind == "para":
                        if norm_txt(t) in heads:
                            out += ["", "%s %s" % ("#" * heads[norm_txt(t)], t)]
                        else:
                            out += ["", t]
                    elif kind == "ordered":
                        onum[lvl] = onum.get(lvl, 0) + 1
                        for deeper in [k for k in onum if k > lvl]:
                            onum[deeper] = 0
                        out.append("%s%d. %s" % ("  " * lvl, onum[lvl], t))
                    elif norm_txt(t) in heads:
                        out += ["", "%s %s" % ("#" * heads[norm_txt(t)], t)]
                    elif norm_txt(t) in quotes:
                        #   접두까지 되돌린다 — `* > …` 와 `> …` 는 다른 원고다
                        out.append(("* > %s" if quotes[norm_txt(t)] == "b" else "> %s") % t)
                    else:
                        mark = "*" if lvl == 0 else "-"
                        frag = [x.split(":", 1)[1] for x in sig.get("frag", [])
                                if x.split(":", 1)[0] == str(bullet_n[0])]
                        bullet_n[0] += 1
                        out.append("%s%s %s%s" % (
                            "  " * lvl, mark, t,
                            "".join(" {.%s}" % f for f in frag)))
            else:
                out.append(item)
        #   lane C 이월 — pptx 에는 평문 불릿만 남았지만 신호가 종류를 안다.
        #   도형이 없는 장에서만 한다(도형이 있으면 ④ 가 이미 처리했다).
        if sig.get("block") and not any(x.startswith("::: ") for x in out):
            kind = sig["block"][0]
            first = next((j for j, x in enumerate(out)
                          if re.match(r"^\s*[*-] ", x)), None)
            if first is not None:
                last = max(j for j, x in enumerate(out)
                           if re.match(r"^\s*[*-] ", x))
                out = out[:first] + ["::: %s" % kind] + out[first:last + 1] + \
                    [":::"] + out[last + 1:]
        blocks.append("\n".join(x for x in out).strip())

    doc.append("\n\n---\n\n".join(blocks))
    path = os.path.join(outdir, "%s.md" % name)
    with open(path, "w", encoding="utf-8") as fp:
        fp.write("\n".join(doc).rstrip() + "\n")
    return path, len(raw), len(drop)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pptx")
    ap.add_argument("outdir")
    ap.add_argument("--name")
    a = ap.parse_args()
    name = a.name or os.path.basename(a.outdir.rstrip("/"))
    os.makedirs(a.outdir, exist_ok=True)
    path, n, d = convert(a.pptx, a.outdir, name)
    print("✅ %s — pptx %d 장 · 자동 생성물 %d 장 제거" % (path, n, d))
    return 0


if __name__ == "__main__":
    sys.exit(main())
