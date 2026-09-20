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

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from pptx import Presentation
    from pptx.util import Emu
    from pptxutil import iter_shapes, descr as shape_descr, ORNAMENT_TAG as _OT
    import smartart
except ImportError:
    print("python-pptx 필요", file=sys.stderr)
    sys.exit(2)

MC = "http://schemas.openxmlformats.org/markup-compatibility/2006"
REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
P = "http://schemas.openxmlformats.org/presentationml/2006/main"
SIG_PREFIX = "m2slide:"
ORNAMENT_TAG = _OT
CONTENT_TAG = "m2slide:content"
def _smartart_catalog():
    try:
        import yaml
        pth = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "data", "m2slide2ppt", "transform.yml")
        return dict(((yaml.safe_load(open(pth, encoding="utf-8")) or {}).get("smartart") or {}).get("catalog") or {})
    except Exception:
        return {}


SMARTART_CATALOG = _smartart_catalog()
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


def run_markup(child, emphasis, links=None):
    """run 하나를 글자로. `b`/`i`/코드 서체를 마크다운 강조로 되돌린다.

    ⚠️ **코드블록에서는 하지 않는다.** 문법 하이라이트가 키워드를 bold 로 칠하므로
       그대로 옮기면 코드 안에 `**def**` 가 박힌다(실측: pandoc skylighting 이
       `def`·`return` 을 bold+색으로 낸다).

    하이퍼링크(`a:hlinkClick`)는 `[글자](URL)` 로 되돌린다 — **URL 은 pptx 에 살아
    있었다**. 실측(aTest-all 2026-09-19): 링크 5개가 pptx 에 온전한데 역변환이 읽지
    않아 `[m2slide 소개 자료](https://…)` 가 글자만 남았고, `bullets`·`table`·
    `blockquote` 가 한꺼번에 계약 밖 차이로 잡혔다.
    """
    t = "".join(x.text or "" for x in child.iter("{%s}t" % A))
    if not t.strip():
        return t
    pr = child.find("{%s}rPr" % A)
    #   ⚠️ 링크는 **강조를 안 살리는 자리에서도** 살린다 — 표 셀이 그렇다.
    #      강조는 `norm()` 이 비교 전에 벗기지만 링크는 안 벗기므로, 한쪽만 갖고
    #      있으면 그대로 계약 밖 차이가 된다(실측 aTest-all: `table` −4/+4)
    url = None
    if links is not None and pr is not None:
        hl = pr.find("{%s}hlinkClick" % A)
        if hl is not None:
            url = links.get(hl.get("{%s}id" % REL))
    if not emphasis and url is None:
        return t
    lead = t[:len(t) - len(t.lstrip())]
    tail = t[len(t.rstrip()):]
    core = t.strip()
    if emphasis and pr is not None:
        #   코드 인라인 — **run 에 서체가 명시돼 있는 것**이 신호다 (Issue388). 코드 폰트
        #   교정이 그 run 에만 `latin` 을 박으므로, 서체 이름이 본문 서체와 같아도
        #   (`NanumGothicCoding` 처럼) **명시 여부**로 갈린다. `para_kind()` 가 코드
        #   **블록**을 가르는 데 이미 쓰는 기제와 같다.
        #   전수 실측(2026-09-20 aTest·aTest-all): 제목·코드문단을 뺀 본문 run 중 `latin`
        #   명시는 6개이고 **전부 코드 인라인**, 일반 불릿 268 run 은 0 — 오탐 0.
        #   ⚠️ 코드블록에서는 발동하지 않는다 — 호출부가 `emphasis=(kind0 != "code")`
        #      로 끊는다. 켜면 하이라이트가 박은 서체 때문에 코드 안에 백틱이 박힌다.
        lat = pr.find("{%s}latin" % A)
        if lat is not None and lat.get("typeface"):
            #   ⚠️ **굵게보다 먼저** 감싼다 — 원고 표기가 `**`x`**` 이므로 순서를 뒤집으면
            #      같은 글자가 `` `**x**` `` 라는 다른 마크업으로 돌아온다
            core = "`%s`" % core
        b, i = pr.get("b") == "1", pr.get("i") == "1"
        if b and i:
            core = "***%s***" % core
        elif b:
            core = "**%s**" % core
        elif i:
            core = "*%s*" % core
    if url:
        core = "[%s](%s)" % (core, url)
    return lead + core + tail


def rel_urls(sh):
    """그 도형이 속한 슬라이드의 **외부 링크** rId → URL."""
    try:
        return {rid: r.target_ref for rid, r in sh.part.rels.items() if r.is_external}
    except Exception:
        return {}


def text_with_math(para, emphasis=False, links=None):
    """문단 텍스트를 수식 자리 표시와 함께 되살린다.

    python-pptx 의 `para.text` 는 AlternateContent 를 건너뛰므로 수식이 **사라진
    자리에 공백만** 남는다(실측: '에너지 등가식은  이다.'). 자리를 그대로 쓰면
    원본의 어순이 깨지므로, XML 순회로 run 과 수식을 **문서 순서대로** 잇는다.
    """
    parts = []
    for child in para._p:
        tag = child.tag.split("}")[-1]
        if tag == "r":
            parts.append(("t", run_markup(child, emphasis, links)))
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
    """비교용 정규화 — 강조 마크업·링크·공백 요동으로 갈리지 않게 한다.

    ⚠️ **링크를 벗기지 않으면 lane S 신호가 어긋난다.** 신호는 원고 글자로 적히는데
       역변환은 하이퍼링크를 `[글자](URL)` 로 되살리므로, 그 문단만 매칭에 실패해
       인용 표식이 안 붙었다(실측 aTest-all: `blockquote` −1 · 2026-09-19).
    """
    s = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", s or "")
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
    for sh in iter_shapes(slide):
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


def cell_text(c, links=None):
    """표 셀 → 글자. 링크는 되살린다(강조는 `norm()` 이 벗기므로 평문으로 둔다)."""
    out = []
    for para in c.text_frame.paragraphs:
        t = "".join(run_markup(r, False, links)
                    for r in para._p.findall("{%s}r" % A)).strip()
        if t:
            out.append(t)
    return " ".join(out)


def md_table(tbl, links=None):
    rows = []
    for r in tbl.rows:
        rows.append([cell_text(c, links) for c in r.cells])
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
    links = rel_urls(sh)
    for para in sh.text_frame.paragraphs:
        kind0 = para_kind(para)
        text, m = text_with_math(para, emphasis=(kind0 != "code"), links=links)
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


def para_md(para, links=None):
    """문단을 **마크업 살린 글자**로 — 카드 본문 복원용 (Issue389).

    `p.text` 는 run 을 이어 붙이기만 해서 링크·코드가 평문이 된다. 카드 본문에는
    원고의 `[글자](URL)` 과 `` `코드` `` 가 들어 있으므로 run 단위로 되돌린다.
    """
    out = []
    for ch in para._p:
        tag = ch.tag.split("}")[-1]
        if tag == "r":
            out.append(run_markup(ch, True, links))
        elif tag == "br":
            out.append(" ")
    return re.sub(r"\s+", " ", "".join(out)).strip()


def _center_in(sh, frame):
    """도형의 **중심**이 테두리 도형 안에 있는가 — 카드 짝짓기 판정 (Issue388)."""
    fl, ft = frame.left or 0, frame.top or 0
    fr, fb = fl + (frame.width or 0), ft + (frame.height or 0)
    cx = (sh.left or 0) + (sh.width or 0) / 2
    cy = (sh.top or 0) + (sh.height or 0) / 2
    return fl <= cx <= fr and ft <= cy <= fb


def group_boxes(shapes, textboxes=()):
    """AUTO_SHAPE 묶음을 카드 항목으로 — 액센트 바(가느다란 사각형)는 버린다.

    카드 한 장은 **제목 문단 + 본문 문단들**이다. 그런데 lane B 가 그 둘을 담는
    방식이 블록마다 다르다:

        htmlart 계열   도형 **하나**에 제목·본문 문단이 함께 있다
        `cards`        **세 도형** — 테두리 `Rounded Rectangle`(글자 없음) ·
                       제목 띠 `Rectangle`(AUTO_SHAPE) · 본문 `TextBox`(TEXT_BOX)

    후자에서 본문은 TEXT_BOX 라 AUTO_SHAPE 만 보면 **놓친다**. 놓친 본문은 일반
    텍스트 경로로 흘러 블록 **뒤에 상위 불릿**으로 붙었다 — 원고에서는 카드 안의
    `  - 본문` 이므로 중첩 깊이가 1→0 으로 어긋났다(실측 2026-09-20: aTest 3건 ·
    aTest-all 11건). 그래서 테두리 도형의 기하로 본문을 제 카드에 되돌린다.

    ⚠️ 짝지을 테두리가 없으면 **종전 동작 그대로**다 — htmlart 계열이 그 경우이고,
       거기서 본문을 억지로 끌어오면 남의 글자를 카드에 집어넣는다.

    반환: (항목 목록, 소비한 TEXT_BOX 의 id 집합)
    """
    frames = [sh for sh in shapes
              if not (sh.has_text_frame and sh.text_frame.text.strip())]
    boxes, consumed = [], set()
    for sh in shapes:
        if not sh.has_text_frame:
            continue
        txts = [p.text.strip() for p in sh.text_frame.paragraphs if p.text.strip()]
        if not txts:
            continue                          # 액센트 바 — 글자가 없다
        own = next((fr for fr in frames if _center_in(sh, fr)), None)
        if own is not None:
            for tb in sorted((t for t in textboxes if _center_in(t, own)),
                             key=lambda x: (x.top or 0, x.left or 0)):
                consumed.add(id(tb))
                lk = rel_urls(tb)
                txts += [x for x in (para_md(q, lk) for q in tb.text_frame.paragraphs)
                         if x]
        boxes.append((sh.top or 0, sh.left or 0, txts))
    boxes.sort(key=lambda b: (b[0], b[1]))
    return [b[2] for b in boxes], consumed


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
        shapes_all = list(iter_shapes(slide))
        for sh in shapes_all:
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
        #   테마 장식(ornament) 은 AUTO_SHAPE 판정에서 뺀다 — 코드 상자·Agenda 테두리
        autoshapes = [sh for sh in shapes_all if sh.shape_type is not None
                      and str(sh.shape_type).startswith("AUTO_SHAPE")
                      and not shape_descr(sh).startswith(ORNAMENT_TAG)
                      and not shape_descr(sh).startswith(CONTENT_TAG)]   # 파이 범례 색 칩
        connectors = [sh for sh in shapes_all if str(sh.shape_type).startswith("LINE")]
        #   네이티브 차트 → `::: htmlart pie` (Issue353). 서브라벨은 내용 표식으로 되찾는다
        pie_subs = {}
        for sh in shapes_all:
            d = shape_descr(sh)
            if d.startswith(CONTENT_TAG + "/pie-sub/") and sh.has_text_frame:
                pie_subs.setdefault(int(d.rsplit("/", 1)[1]), []).append(sh.text_frame.text.strip())
        #   `::: part` 라벨 — lane T 가 내용 표식으로 심는다 (Issue389). 일반 텍스트
        #   경로는 CONTENT_TAG 를 통째로 건너뛰므로 여기서 먼저 집는다
        part_txt = ""
        for sh in shapes_all:
            if shape_descr(sh).startswith(CONTENT_TAG + "/part") and sh.has_text_frame:
                part_txt = sh.text_frame.text.strip()
                break
        #   SmartArt → `::: htmlart <종류>` (Issue357). 데이터 모델의 parOf 가 항목·하위·순서다
        for sh in shapes_all:
            dia = smartart.read_diagram(sh, slide) if str(sh._element.tag).endswith("}graphicFrame") else None
            if dia is None:
                continue
            layout, items_ = dia
            sig0 = read_slide_signals(slide)
            kind = next((b for b in (sig0.get("block") or []) if b.startswith("htmlart")), None)
            if kind is None:
                kind = next((k for k, v in SMARTART_CATALOG.items() if v.get("layout") == layout), "htmlart process")
            out_ = ["::: %s" % kind]
            for it in items_:
                out_.append("* %s" % it["title"])
                for sub in it["subs"]:
                    out_.append("  - %s" % sub)
            out_.append(":::")
            body += out_
        for sh in shapes_all:
            if getattr(sh, "has_chart", False) and sh.has_chart:
                sig0 = read_slide_signals(slide)
                kind = next((b for b in (sig0.get("block") or []) if b.startswith("htmlart")), "htmlart pie")
                cats = list(sh.chart.plots[0].categories)
                out_ = ["::: %s" % kind]
                for ci, cat in enumerate(cats):
                    out_.append("* %s" % cat)
                    for sub in pie_subs.get(ci, []):
                        out_.append("  - %s" % sub)
                out_.append(":::")
                body += out_

        card_used = set()
        if autoshapes:
            #   카드 본문 TEXT_BOX 후보 — 테마 장식·차트 서브라벨은 원고가 아니다
            tb_cand = [sh for sh in shapes_all
                       if str(sh.shape_type or "").startswith("TEXT_BOX")
                       and sh.has_text_frame and sh.text_frame.text.strip()
                       and not shape_descr(sh).startswith(ORNAMENT_TAG)
                       and not shape_descr(sh).startswith(CONTENT_TAG)]
            items, card_used = group_boxes(autoshapes, tb_cand)
            # 커넥터가 카드 사이를 잇고 있으면 순차 블록이다 — 도형만 보면 이것이
            # 유일한 구분 신호이고, `cards` 와 `htmlart numbered` 는 같은 블록으로
            # 렌더되므로 **원리적으로 갈리지 않는다**. lane S 신호가 있으면 그것이 답이다.
            sig0 = read_slide_signals(slide)
            blocks_sig = list(sig0.get("block", []))
            kind = blocks_sig.pop(0) if blocks_sig else (
                "htmlart process" if connectors else "cards")
            body += render_div(kind, items)

        for sh in shapes_all:
            st = str(sh.shape_type or "")
            if st.startswith("AUTO_SHAPE") or st.startswith("LINE"):
                continue
            if id(sh) in card_used:
                continue                      # 카드 본문으로 이미 썼다 (Issue388)
            if getattr(sh, "has_chart", False) and sh.has_chart:
                continue
            if shape_descr(sh).startswith(CONTENT_TAG):
                continue                              # 차트 서브라벨 — 위에서 이미 썼다
            if sh.name.startswith("Title"):
                continue
            if sh.has_table:
                body += [""] + md_table(sh.table, rel_urls(sh))
                continue
            if st.startswith("PICTURE"):
                #   테마 장식(가로선·제목 밑줄)은 원고의 일부가 아니다 — lane T 가
                #   alt-text 에 표식을 달아 둔다. 거르지 않으면 왕복본에 원고에 없던
                #   이미지가 장마다 셋씩 생긴다(실측 2026-09-10: 10장에 21개).
                el = sh._element.find(".//{%s}cNvPr" % P)
                if (el.get("descr") or "").startswith(ORNAMENT_TAG) if el is not None else False:
                    continue
                body.append(("__PIC__", sh))
                continue
            if sh.has_text_frame:
                #   lane T 가 심은 테마 글자(머리말 바·라이선스 뱃지·표지 슬롯)는
                #   원고가 아니다 — 표식으로 거른다
                el = sh._element.find(".//{%s}cNvPr" % P)
                if (el.get("descr") or "").startswith(ORNAMENT_TAG) if el is not None else False:
                    continue
                if sh.name.startswith("TextBox") and any(
                        isinstance(x, tuple) and x[0] == "__PIC__" for x in body):
                    cap = sh.text_frame.text.strip()
                    if cap:
                        captions.append(cap)     # 그림 캡션 — alt 로 환원한다
                        continue
                lines, m = shape_lines(sh)
                maths += m
                body.append(("__TXT__", lines))
        sig_ = read_slide_signals(slide)
        if part_txt:
            sig_ = dict(sig_)
            sig_["_part"] = part_txt
        raw.append(("slide", (title, body, captions, sig_)))

    # ── 자동 생성 장 제거 (Issue358)
    #
    #   정방향이 만든 장 — 덱 전체 목차 · Agenda · 챕터 TOC — 은 원고에 없다.
    #   fidelity.yml 이 `synthesized` 로 선언한 것들이며 여기서 지워야 원고에 수렴한다.
    #
    #   판정은 **정방향이 심은 표식**(lane S `synth`)이 1순위다. 구 판정은 위치
    #   휴리스틱뿐이었는데 그 전제가 산출물과 어긋나 **한 장도 걸러지지 않았다**
    #   (실측 m2Slide_chapter_mode 2026-09-19: 36장 중 자동 생성물 0장 제거 →
    #   h2 +9 · 불릿 +39 로 계약 밖 차이). 표식이 없는 pptx(사람이 PowerPoint 에서
    #   만든 장 등)를 위해 휴리스틱은 **폴백으로 남긴다**.
    def top_bullets(p):
        bl = []
        for item in p[1]:
            if isinstance(item, tuple) and item[0] == "__TXT__":
                bl += [t for kind, t, lvl in item[1] if kind == "bullet" and lvl == 0]
        return bl

    drop = set()
    #   ① 표식 — 정방향이 직접 적은 것이라 추측이 필요 없다
    for i, (k, p) in enumerate(raw):
        if k != "slide":
            continue
        if (p[3] or {}).get("synth"):
            drop.add(i)

    #   ② 폴백 — 표식이 하나도 없을 때만. 표식이 있는데 일부만 걸린 pptx 에
    #      휴리스틱을 덧대면 사람이 뒤에 붙인 목차 장까지 조용히 지운다
    if not drop:
        for i, (k, p) in enumerate(raw):
            if k != "slide" or i == 0:
                continue
            prev_ok = raw[i - 1][0] in ("cover", "chapter") or (i - 1) in drop
            if not prev_ok:
                continue
            bl = top_bullets(p)
            later = set(q[0] for kk, q in raw[i + 1:] if kk == "slide")
            if norm_txt(p[0]).lower() == "agenda":
                drop.add(i)
            elif len(bl) >= 2 and later and set(bl) <= later:
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
    #   챕터 H1 되찾기 (Issue388) — **챕터 TOC 장의 제목이 원고의 H1** 이다
    #
    #   정방향은 챕터 머리의 H1 을 걷고 그 자리에 챕터 TOC 장을 만든다. 그 TOC 장은
    #   `synthesized` 라 위에서 지워지는데, 지우면서 제목까지 버리면 `h1_chapter` 가
    #   통째로 사라진다(실측 2026-09-20: aTest-all 6→0 · aTest 1→0).
    #
    #   ⚠️ 위 `if lay == "Section Header"` 분기로는 못 잡는다 — 두 덱의 layout 분포에
    #      `Section Header` 가 **0회**다(Issue374·379 가 `3.parity`·lane T 에서 걷어낸
    #      것과 같은 낡은 전제). 그 분기는 사람이 PowerPoint 에서 만든 pptx 를 위해
    #      폴백으로 남기고, m2slide 산출물은 lane S 표식으로 판정한다.
    #
    #   ⚠️ **자리가 둘이다.** 원고가 H1 을 어떻게 적었는지에 따라 정방향의 결과가 갈린다:
    #
    #     ⓐ `# H1` 만 있는 장          그 장 자체가 챕터 TOC 로 **바뀐다**
    #                                  → 제 자리에서 `# H1` 블록으로 되돌린다
    #     ⓑ `# H1` + `## H2` 한 장      진입 장(H2·`#layout-chapter`)은 그대로 두고
    #                                  **그 뒤에** TOC 를 덧붙인다
    #                                  → H1 은 **앞** 진입 장의 것이다
    #
    #   실측 aTest-all: ⓐ 는 챕터 01(p04), ⓑ 는 챕터 02~06(p13←p14 · p20←p21 …).
    #   ⓑ 를 «TOC 다음 장» 에 붙이면 무관한 본문 장이 H1 을 얻어 `collect()` 가 그 장을
    #   진입 장으로 오인해 통째로 셈에서 뺀다(실측: `h2_slide_title` −6 · `bullets` −21).
    h1_attach, h1_solo = {}, {}
    for i, (k, p) in enumerate(raw):
        if k != "slide" or i not in drop:
            continue
        if "chapter_toc" not in ((p[3] or {}).get("synth") or []):
            continue
        t = (p[0] or "").strip()
        if not t:
            continue
        j = i - 1
        prev_sig = raw[j][1][3] if (j >= 0 and raw[j][0] == "slide") else {}
        if j >= 0 and j not in drop and "chapter" in ((prev_sig or {}).get("layout") or []):
            h1_attach[j] = t                 # ⓑ 앞 진입 장의 H1
        else:
            h1_solo[i] = t                   # ⓐ H1 만 있던 장

    blocks = []
    for i, (k, p) in enumerate(raw):
        if k == "cover":
            continue
        if i in drop:
            if i in h1_solo:
                blocks.append("# %s" % h1_solo[i])
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
        #   제목이 없는 장은 `## ` 를 짓지 않는다 (Issue358). pandoc 은 `--slide-level=2`
        #   라 `### H3` 로만 시작하는 슬라이드를 **제목 없는 장**으로 낸다(계약
        #   `subheading` 의 caveat 이 적은 그 4건). 빈 제목을 `## ` 로 되돌리면
        #   원고에 없던 H2 가 생겨 `h2_slide_title` 이 lossless 인데 늘어난다.
        dirs = ["#" + d for d in sig.get("id", []) + sig.get("anim", []) +
                ["layout-" + x for x in sig.get("layout", [])]]
        out = []
        if i in h1_attach:
            #   원고는 `# H1` **바로 아래**에 디렉티브를 둔다. 순서를 지키지 않으면
            #   재빌드 때 디렉티브 영역이 H2 에 막혀 `#layout-chapter` 가 죽는다
            #   (md-m2slide-rules 「슬라이드 단위 애니메이션 디렉티브」 — 첫 헤더
            #   다음의 연속 구간만 디렉티브로 읽는다)
            out += ["# %s" % h1_attach[i]] + dirs + [""]
            dirs = []
        if sig.get("_part"):
            #   원고 순서는 `# H1` · 디렉티브 · `::: part` · `## H2` 다 (Issue389)
            out += ["::: part", sig["_part"], ":::", ""]
        if title:
            #   정방향이 장 제목을 H2 로 올렸으면(Issue403) 그 원래 깊이로 되돌린다.
            #   신호가 없으면 H2 다 — 승격이 없었다는 뜻이다
            out.append("%s %s" % ("#" * int(sig.get("hlvl", 2) or 2), title))
        out += dirs
        out.append("")
        for item in body:
            if isinstance(item, tuple) and item[0] == "__PIC__":
                sh = item[1]
                #   alt 는 그림의 alt-text(`descr`)가 정본이다 — lane T 가 캡션을 거기로
                #   옮긴다. pandoc 원형(descr = 파일 경로)이면 캡션 → 제목 순으로 되돌린다
                d_ = shape_descr(sh)
                if d_ and not d_.startswith("m2slide:") and not d_.startswith("/") and "\\" not in d_:
                    alt = d_
                else:
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
                        elif norm_txt(t) in quotes:
                            #   ⚠️ **불릿 없는 인용**(`> …`)도 여기로 온다. 전에는 이
                            #      분기에 quotes 조회가 없어 복원 경로가 아예 없었다 —
                            #      기존 덱이 전부 `* > …`(불릿 안 인용)라 드러나지 않았다
                            #      (실측 aTest-all: `blockquote` −1 · 2026-09-19)
                            out += ["", ("* > %s" if quotes[norm_txt(t)] == "b" else "> %s") % t]
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
