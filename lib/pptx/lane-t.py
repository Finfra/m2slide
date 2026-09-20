#!/usr/bin/env python3
"""lane T — m2slide 테마의 **꼴**을 reference.pptx 에 입힌다 (Issue345).

무엇을 고치나
-------------
글로벌 `theme-from-css.py` 는 스스로 적어 둔 대로 **색·서체만** 옮긴다. 그래서
pptx 는 팔레트만 같고 *생김새*는 pandoc 기본 그대로였다. 실측(2026-09-10, aTest)
에서 그것이 두 가지로 드러났다:

1. **placeholder 가 슬라이드 폭을 안 채운다** — `theme2reference --adapt` 는 슬라이드
   크기만 theme.yml canvas 로 키우고 placeholder 좌표는 **4:3 기본값(10×7.5in)**
   그대로 둔다. 13.33in 슬라이드에 9.5in 짜리 상자가 앉아 우측 3.8in 가 빈다
2. **테마 장식이 없다** — m2slide 는 상·하단 노랑 가로선과 제목 밑줄(`hr.png`)로
   판을 짜는데 pptx 에는 그 어휘가 없어 민 흰 바탕이 된다

무엇을 하지 않나
----------------
* **도형으로 근사하지 않는다.** `hr.png` 는 손으로 그은 듯한 붓 자국이라 직사각형으로
  바꾸면 다른 물건이 된다. 원본 이미지를 그대로 넣는다
* **글로벌 스킬을 고치지 않는다.** 산출된 reference 를 뒤에서 손본다 — 판형·먹색
  교정(build-pptx ①-c)과 같은 방침이다

좌표는 어디서 오나
------------------
HTML 덱을 실제로 렌더해 잰 값이다(캔버스 1920×1280 px 기준). CSS 를 읽어 계산하지
않은 이유는 flex 레이아웃의 최종 위치가 선언만으로 정해지지 않기 때문이다.

    상단선   left 56 · top 22 · w 1808 · h 10
    하단선   left 56 · top 1248 · w 1808 · h 10
    제목     left 56 · top 80 · w 1808 · h 96   (밑줄은 그 박스 맨 아래 10px)
    본문     left 56 · top 205 · w 1808 · h 1019

두 걸음인 이유
--------------
python-pptx 는 **마스터·레이아웃에 그림을 넣지 못한다**(`MasterShapes` 에
`add_picture` 가 없다). 그래서 배치와 장식을 나눈다:

    --mode layout     reference 의 placeholder 재배치 (속성 변경만 — 마스터에서 가능)
    --mode ornament   **최종 pptx** 의 각 장에 가로선·제목 밑줄 삽입

장식을 장마다 넣어도 이미지 자체는 패키지에서 공유되므로 파일이 장 수만큼 커지지
않는다(관계만 늘어난다).

사용
----
    lane-t.py <pptx> <theme-img 디렉터리> --mode layout|ornament [--canvas-px 1920x1280]
"""
import argparse
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from pptx import Presentation
    from pptx.util import Emu, Pt
    from pptx.enum.text import PP_ALIGN, MSO_ANCHOR, MSO_AUTO_SIZE
    from pptxutil import iter_shapes, set_descr, descr as shape_descr, ORNAMENT_TAG as _OT
except ImportError:
    print("python-pptx 필요", file=sys.stderr)
    sys.exit(2)

#   pandoc/theme2reference 가 남기는 기본 콘텐츠 박스 (10×7.5in 시절 좌표)
OLD_W, OLD_H = 9144000, 6858000
OLD_BOX_L, OLD_BOX_W = 457200, 8229600

#   HTML 실측 좌표는 **정책이 소유한다** — `check-visual.py` 도 같은 값을 읽는다.
#   두 곳에 따로 적으면 어긋난 채로 서로를 통과시킨다.
_POLICY = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "..", "..", "data", "m2slide2ppt", "transform.yml")
_FALLBACK = {"margin": 56, "rule_top": 22, "rule_h": 10, "rule_bottom": 1248,
             "title_top": 80, "title_h": 96, "body_top": 205, "body_h": 1019,
             "asset": "hr.png", "canvas_w": 1920}


def load_geometry():
    try:
        import yaml
        with open(_POLICY, encoding="utf-8") as fp:
            g = (yaml.safe_load(fp) or {}).get("theme_geometry") or {}
        return {**_FALLBACK, **g}
    except Exception as exc:
        print("  ⚠️ transform.yml theme_geometry 미적용 — 기본값 (%s)" % exc,
              file=sys.stderr)
        return dict(_FALLBACK)


def load_section(key):
    try:
        import yaml
        with open(_POLICY, encoding="utf-8") as fp:
            return (yaml.safe_load(fp) or {}).get(key) or {}
    except Exception:
        return {}


G = load_geometry()
COVER = load_section("cover_geometry")
HEAD = load_section("head_geometry")
MASCOT = load_section("contents_mascot")
CHAPTER_MASCOT = load_section("chapter_mascot")   # Issue379 — 진입 장 배경
CHAPTER_PART = load_section("chapter_part")       # Issue389 — 진입 장 part 라벨
CARD = load_section("card_geometry")
FONT = load_section("font")
AGENDA = load_section("agenda_geometry")
CODE = load_section("code_geometry")
PIE = load_section("pie_geometry")
NATIVE = load_section("native_charts")
SPLIT = load_section("split_geometry")
TABLE = load_section("table_geometry")

#   표지·머리말 글자는 **빌드된 HTML 이 정본**이다. frontmatter·config 를 다시 조합하면
#   HTML 과 어긋날 수 있고, 대조기(check-parity.py)도 HTML 을 보므로 출처를 하나로 둔다.
COVER_SEL = {
    "title": r'class="cover-title"[^>]*>(.*?)</',
    "subtitle": r'class="cover-subtitle"[^>]*>(.*?)</',
    "iname": r'class="cover-instructor-name"[^>]*>(.*?)</',
    "icontact": r'class="cover-instructor-contact"[^>]*>(.*?)</',
    "corner_tl": r'class="cover-corner cover-tl"[^>]*>(.*?)</',
    "corner_br": r'class="cover-corner cover-br"[^>]*>(.*?)</',
    #   Issue386: 우상단 코너(`cover-tr` = `version_badge`)가 빠져 있었다. 그 결과 우상단
    #     좌표(`cover_geometry.version`)를 **중앙 메타의 `version`** 이 차지했고,
    #     HTML 이 실제로 우상단에 보여주는 `version_badge` 는 pptx 에서 사라졌다
    #     (실측 2026-09-20 igTest: pptx 우상단 `1.0` ↔ HTML 우상단 `v0.8.0`).
    "corner_tr": r'class="cover-corner cover-tr"[^>]*>(.*?)</',
    "version": r'class="cover-meta"[^>]*>(.*?)</',
    "license": r'class="m2-license-badge"[^>]*>(.*?)</',
}


def strip_tags(x):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", x or "")).strip()


def read_cover(project_dir):
    """빌드 산출 HTML 에서 표지 슬롯 글자를 읽는다."""
    import glob as _g
    files = sorted(_g.glob(os.path.join(project_dir, "slide", "*.html")))
    idx = [f for f in files if os.path.basename(f) == "index.html"] or files
    if not idx:
        return {}
    h = open(idx[0], encoding="utf-8").read()
    out = {}
    for k, pat in COVER_SEL.items():
        m = re.search(pat, h, re.S)
        if m and strip_tags(m.group(1)):
            out[k] = strip_tags(m.group(1))
    return out


def read_parts(project_dir):
    """챕터 진입 장의 part 라벨 — 제목을 열쇠로 삼는다 (Issue389).

    ⚠️ **테마가 이 글자의 생사를 정한다.** `{{part}}` 슬롯은 `default_lec` 의
       `4.2.chapter.html` 에만 있고 `default` 의 `_chapter.html` 에는 없다. 슬롯이
       없으면 **HTML 도 이 글자를 렌더하지 않으므로**(실측 2026-09-20: aTest-all
       `Chapter N.` 0회 · igTest 5회) 원고에 `::: part` 가 있다는 사실만 보고 그리면
       pptx 만 더 보여주는 **새 불일치**가 된다.

       그래서 원고가 아니라 **빌드 산출 HTML** 을 읽는다 — 테마 조건이 자동으로
       지켜지고, 판정을 여기 복제하지 않는다(HTML 이 정본이다).
    """
    import glob as _g
    files = sorted(_g.glob(os.path.join(project_dir, "slide", "*.html")))
    use = [f for f in files
           if os.path.basename(f) not in ("index.html", "agenda.html")] or \
          [f for f in files if os.path.basename(f) == "index.html"]
    out = {}
    for f in use:
        h = open(f, encoding="utf-8").read()
        for sec in re.findall(r"<section[^>]*>.*?(?=<section|\Z)", h, re.S):
            t = re.search(r'class="chapter-title"[^>]*>(.*?)</', sec, re.S)
            q = re.search(r'class="chapter-part"[^>]*>(.*?)</div>', sec, re.S)
            if t and q and strip_tags(q.group(1)):
                out[strip_tags(t.group(1))] = strip_tags(q.group(1))
    return out


def read_heads(project_dir):
    """장별 머리말 좌·우 — 제목을 열쇠로 삼는다(pptx 장 수가 더 많다)."""
    import glob as _g
    files = sorted(_g.glob(os.path.join(project_dir, "slide", "*.html")))
    use = [f for f in files
           if os.path.basename(f) not in ("index.html", "agenda.html")] or \
          [f for f in files if os.path.basename(f) == "index.html"]
    out = {}
    for f in use:
        h = open(f, encoding="utf-8").read()
        for sec in re.findall(r"<section[^>]*>.*?(?=<section|\Z)", h, re.S):
            t = re.search(r'class="(?:contents-)?title"[^>]*>(.*?)</', sec, re.S)
            if not t:
                continue
            l = re.search(r'class="contents-head-left"[^>]*>(.*?)</div>', sec, re.S)
            r = re.search(r'class="contents-head-right"[^>]*>(.*?)</div>', sec, re.S)
            out[strip_tags(t.group(1))] = (strip_tags(l.group(1)) if l else "",
                                           strip_tags(r.group(1)) if r else "")
    return out
PX = {"margin": G["margin"], "line_top": G["rule_top"], "line_h": G["rule_h"],
      "line_bottom": G["rule_bottom"], "title_top": G["title_top"],
      "title_h": G["title_h"], "body_top": G["body_top"], "body_h": G["body_h"]}

#   본문 레이아웃 — 제목이 위에 붙고 아래가 본문인 것들. 세로까지 실측값으로 덮는다.
#   표지·섹션 진입은 세로 가운데 배치라 이 규칙을 쓰면 안 된다(비례 보정만 한다).
BODY_LAYOUTS = {"Title and Content", "Two Content", "Content with Caption",
                "Title Only", "Comparison", "Blank"}


def remap_x(v, L, W):
    """콘텐츠 박스 매핑 — 단순 비례가 아니다.

    비례로 늘리면 여백도 함께 늘어난다(0.5in → 0.67in). m2slide 여백은 56px 로
    고정이므로, **박스 안에서의 상대 위치**를 새 박스로 옮긴다.
    """
    return int(round(L + (v - OLD_BOX_L) / OLD_BOX_W * W))


def remap_w(v, W):
    return int(round(v / OLD_BOX_W * W))


def remap_y(v, T, H):
    return int(round(T + v / OLD_H * H))


def fix_placeholders(container, name, L, W, T, H, px2emu, log):
    """레이아웃/마스터 하나의 placeholder 를 새 판형에 맞춘다."""
    body = name in BODY_LAYOUTS
    for ph in container.placeholders:
        try:
            t = ph.name
        except Exception:
            continue
        ol, ow, ot, oh = ph.left, ph.width, ph.top, ph.height
        ph.left = remap_x(ol, L, W)
        ph.width = remap_w(ow, W)
        ph.top = remap_y(ot, T, H)
        ph.height = int(round(oh / OLD_H * H))
        if body and t.startswith("Title"):
            ph.left, ph.width = L, W
            ph.top = int(PX["title_top"] * px2emu)
            ph.height = int(PX["title_h"] * px2emu)
        elif body and (t.startswith("Content") or t.startswith("Text")):
            #   Two Content·Comparison 은 좌우로 갈리므로 가로는 건드리지 않는다
            if remap_w(ow, W) > W * 0.8:
                ph.left, ph.width = L, W
            ph.top = int(PX["body_top"] * px2emu)
            ph.height = int(PX["body_h"] * px2emu)
        log["ph"] += 1


ORNAMENT_TAG = _OT
CONTENT_TAG = "m2slide:content"


def add_rule(shapes, img, left, top, width, height, kind="rule"):
    """가로선 한 줄. **장식임을 alt-text 에 적는다.**

    적지 않으면 왕복 역변환이 이것을 **본문 이미지로 읽는다** — 실측(2026-09-10):
    10장 덱에 원고에 없던 이미지 21개가 왕복본에 생겼다. 표식은 lane S 가 쓰는
    것과 같은 자리(`p:cNvPr/@descr`)이고, 화면에 보이지 않는다.
    """
    pic = shapes.add_picture(img, Emu(left), Emu(top), Emu(width), Emu(height))
    try:
        #   종류를 붙인다 — 검증이 가로선과 제목 밑줄을 **따로 세야** 하기 때문이다.
        #   합쳐 세면 로고·마스코트가 늘어날 때마다 계산이 깨진다(실측 2026-09-10)
        pic._element._nvXxPr.cNvPr.set("descr", "%s/%s" % (ORNAMENT_TAG, kind))
    except Exception:
        pass
    return pic


def text_width_px(text, fs):
    """글자 폭 어림 — 표지 제목 밑줄이 **글자 폭**만큼이라 필요하다.

    HTML `.cover-title` 은 `display:inline-block` 이라 밑줄(`::after`)이 글자 너비를
    따른다. 본문 제목은 블록이라 전폭이므로 이 어림이 필요 없다.
    폰트 메트릭을 쓰지 않는 이유는 pptx 서체(`Malgun Gothic`)가 macOS 에 없어
    어차피 정확히 잴 수 없기 때문이다 — 전각/반각 구분으로 충분하다.
    """
    w = 0.0
    for ch in text or "":
        o = ord(ch)
        if 0xAC00 <= o <= 0xD7A3 or 0x3131 <= o <= 0x318E or 0x4E00 <= o <= 0x9FFF:
            w += 1.0
        elif ch == " ":
            w += 0.3
        else:
            w += 0.55
    return w * fs


def add_outline(shapes, spec, px2emu, accent="F5C518", width_px=1.5):
    """글자 없는 **틀**. 강사 상자·Agenda 프레임이 쓴다.

    명세에 `color`·`border_px`·`radius_px` 가 있으면 그것이 인자보다 앞선다 —
    HTML 실측(`border: 2px solid #FFD700; border-radius: 6px`)을 정책이 그대로 적는다.
    """
    from pptx.enum.shapes import MSO_SHAPE
    from pptx.dml.color import RGBColor
    radius = spec.get("radius_px")
    sh = shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE,
                          Emu(int(spec["l"] * px2emu)), Emu(int(spec["t"] * px2emu)),
                          Emu(int(spec["w"] * px2emu)), Emu(int(spec["h"] * px2emu)))
    sh.fill.background()
    sh.line.color.rgb = RGBColor.from_string(spec.get("color", accent))
    sh.line.width = Emu(int(spec.get("border_px", width_px) * px2emu))
    sh.shadow.inherit = False
    if radius:
        try:
            sh.adjustments[0] = radius / float(min(spec["w"], spec["h"]))
        except Exception:
            pass
    return sh


#   ⚠️ lane T 가 심는 **글자**에도 표식이 필요하다. 없으면 왕복 역변환이 머리말 바·
#      라이선스 뱃지를 **본문 불릿으로** 읽는다(실측 2026-09-10: 왕복본에 +7줄).
#      그림(add_rule)에 이미 같은 표식을 쓰고 있다.
def set_major_font(path, name, log, bold=None):
    """제목 서체를 **테마 majorFont + 마스터·레이아웃 제목 placeholder** 양쪽에 심는다.

    python-pptx 는 테마 서체를 노출하지 않으므로 패키지를 직접 손본다.

    ⚠️ majorFont 의 latin 하나만 바꾸면 **아무것도 안 바뀐다** (실측 2026-09-11, 두 겹):
      ① `theme2reference`·`retheme --font-only` 가 마스터/레이아웃 제목 placeholder 의
         lstStyle 에 `<a:latin typeface="NanumGothicCoding"/>` 를 **리터럴로** 적어 두어
         `+mj-lt` 참조가 끊겨 있다 → 참조(`+mj-lt`/`+mj-ea`/`+mj-cs`)로 되돌린다
      ② 한글 제목은 latin 이 아니라 **ea·`script="Hang"`** 항목의 서체로 그려진다 →
         majorFont 의 latin·ea·cs·script 전부를 같은 이름으로 맞춘다 (HTML 도 한글
         제목에 GmarketSansBold 하나를 쓴다)
    `bold` 가 주어지면 제목 placeholder 의 defRPr `b` 도 정책대로 맞춘다.
    """
    import re as _re
    import shutil as _sh
    import zipfile as _zip
    tmp = path + ".fnt"
    changed = 0

    def fix_theme(x):
        def repl(m):
            blk = m.group(0)
            blk, n1 = _re.subn(r'(<a:(?:latin|ea|cs) typeface=")[^"]*(")', r"\g<1>%s\g<2>" % name, blk)
            blk, n2 = _re.subn(r'(<a:font script="[^"]*" typeface=")[^"]*(")', r"\g<1>%s\g<2>" % name, blk)
            return blk
        return _re.subn(r"<a:majorFont>.*?</a:majorFont>", repl, x, count=1, flags=_re.S)

    def fix_title_ph(x):
        #   제목 placeholder(`type="title"`·`"ctrTitle"`) 의 리터럴 서체 → 테마 참조
        def repl(m):
            blk = m.group(0)
            if not _re.search(r'<p:ph[^>]*type="(?:title|ctrTitle)"', blk):
                return blk
            blk = _re.sub(r'<a:latin typeface="[^"+][^"]*"', '<a:latin typeface="+mj-lt"', blk)
            blk = _re.sub(r'<a:ea typeface="[^"+][^"]*"', '<a:ea typeface="+mj-ea"', blk)
            blk = _re.sub(r'<a:cs typeface="[^"+][^"]*"', '<a:cs typeface="+mj-cs"', blk)
            if bold is not None:
                blk = _re.sub(r'(<a:defRPr\b[^>]*?)\sb="\d"', r"\1", blk)
                blk = _re.sub(r"<a:defRPr\b", '<a:defRPr b="%d"' % (1 if bold else 0), blk)
            return blk
        return _re.subn(r"<p:sp>.*?</p:sp>", repl, x, flags=_re.S)

    with _zip.ZipFile(path) as zin, \
            _zip.ZipFile(tmp, "w", _zip.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            fn = item.filename
            if fn.startswith("ppt/theme/"):
                new, n = fix_theme(data.decode("utf-8"))
                if n:
                    data = new.encode("utf-8"); changed += n
            elif fn.startswith("ppt/slideMasters/") or fn.startswith("ppt/slideLayouts/"):
                new, n = fix_title_ph(data.decode("utf-8"))
                if new != data.decode("utf-8"):
                    data = new.encode("utf-8"); changed += 1
            zout.writestr(item, data)
    _sh.move(tmp, path)
    if changed:
        log["font"] = name
    return changed


def load_card_md(proj):
    """lane B 사이드카의 **카드 원문**을 «평문 → 원문» 으로 (Issue389).

    `redraw_cards` 는 lane B 가 그린 도형에서 **평문**을 읽는다. 그래서 원고의
    `` `_config.yml` `` 과 `[글자](URL)` 이 그 자리에서 이미 사라져 있다 — 링크는
    글자만 남고(`cards_hyperlink` −2) 코드는 서식이 없다(`inline_emphasis` −1).
    사이드카에 나란히 실어 둔 원문을 평문으로 되짚어 찾는다.

    ⚠️ 정방향이 자기 사이드카를 읽는 것은 커닝이 아니다 — 금지 대상은 **역변환**이
       사이드카를 보는 것이다(`6.roundtrip` ④). lane S 도 같은 방식으로 읽는다.
    """
    import json as _j
    p = os.path.join(proj, "_pipeline", "pptx", "lane-b.json")
    if not os.path.isfile(p):
        return {}
    out = {}
    try:
        d = _j.load(open(p, encoding="utf-8"))
    except Exception:
        return {}
    for t in (d.get("targets") or []):
        plain, raw = t.get("items") or [], t.get("items_md") or []
        if len(plain) != len(raw):
            continue                      # 짝이 안 맞으면 손대지 않는다
        for pi, ri in zip(plain, raw):
            if pi.get("title") and ri.get("title"):
                out.setdefault(pi["title"], ri["title"])
            for a_, b_ in zip(pi.get("subs") or [], ri.get("subs") or []):
                if a_ and b_:
                    out.setdefault(a_, b_)
    return out


#   인라인 마크다운 토큰 — 링크 · 코드 · 굵게. `strip_inline` 의 역방향이다
MD_TOKEN = re.compile(r"\[([^\]]+)\]\(([^)\s]+)\)|`([^`]+)`|\*\*([^*]+)\*\*")


def add_md_runs(para, raw, fs_pt, color, mono=None):
    """문단에 원문을 **run 으로 쪼개** 넣는다 — 링크·코드·굵게를 살린다 (Issue389).

    ⚠️ 하이퍼링크는 `run.hyperlink.address` 로 건다 — python-pptx 가 rel 을 함께
       만든다. 손으로 rel 을 넣으면 **고아 rel** 이 남는다(실측 2026-09-20: lane B 가
       원래 문단을 걷을 때 남긴 외부 rel 2건이 어느 run 에서도 참조되지 않았다).
    """
    pos, made = 0, 0
    for m in MD_TOKEN.finditer(raw):
        if m.start() > pos:
            _card_run(para, raw[pos:m.start()], fs_pt, color)
        txt, url = (m.group(1), m.group(2)) if m.group(1) else (
            m.group(3) or m.group(4), None)
        r = _card_run(para, txt, fs_pt, color)
        if url:
            r.hyperlink.address = url
        elif m.group(3) and mono:
            r.font.name = mono            # 코드 인라인 — 역변환이 서체로 되찾는다
        elif m.group(4):
            r.font.bold = True
        pos, made = m.end(), made + 1
    #   ⚠️ 남은 꼬리를 넣는 것으로 **토큰이 없는 경우까지 덮인다**(pos=0). 여기에
    #      "토큰이 없으면 전체를 넣는다" 를 더하면 글자가 두 번 들어간다 —
    #      실측 2026-09-20: `불릿·표·이미지불릿·표·이미지` (bullets −8/+8)
    if pos < len(raw):
        _card_run(para, raw[pos:], fs_pt, color)
    return made


def _card_run(para, text, fs_pt, color):
    from pptx.dml.color import RGBColor as _RGB
    r = para.add_run()
    r.text = text
    r.font.size = fs_pt
    r.font.color.rgb = _RGB.from_string(color)
    return r


def redraw_cards(slide, px2emu, L, W, md_map=None, mono=None):
    """lane B 가 그린 `cards` 를 **m2slide 카드**로 다시 그린다 (Issue349).

    lane B 는 글로벌 ppt-info 의 `cards`(좌측 액센트 바 + 회색 본문)를 쓴다.
    m2slide 카드는 **상단 노란 제목 밴드 + 본문**이라 다른 물건이고, 세로 위치도
    lane B 는 본문 영역 중앙에·HTML 은 상단에 놓는다(실측 2026-09-10: t 595 vs 253).

    ⚠️ `process` 는 건드리지 않는다 — 커넥터가 있는 순차 블록이고 HTML 쪽 디자인도
       달라 별도 판단이 필요하다. 여기서 **비슷하게 근사하지 않는다**.
    """
    from pptx.enum.shapes import MSO_SHAPE
    from pptx.dml.color import RGBColor
    if not CARD:
        return 0
    shapes = [sh for sh in slide.shapes
              if str(sh.shape_type or "").startswith("AUTO_SHAPE")]
    conns = [sh for sh in slide.shapes if str(sh.shape_type or "").startswith("LINE")]
    if not shapes or conns:
        return 0
    #   글자가 있는 도형이 카드다. 액센트 바(글자 없는 얇은 사각형)는 버린다
    cards = []
    for sh in sorted(shapes, key=lambda x: (x.top or 0, x.left or 0)):
        if not sh.has_text_frame:
            continue
        lines = [p.text.strip() for p in sh.text_frame.paragraphs if p.text.strip()]
        if lines:
            cards.append(lines)
    if not cards:
        return 0
    for sh in list(shapes):
        sh._element.getparent().remove(sh._element)

    n = len(cards)
    gap = CARD["gap"]
    cw = (W / px2emu - (n - 1) * gap) / n
    top = CARD["top"]
    body_max = max(len(c) - 1 for c in cards)
    ch = CARD["band_h"] + body_max * CARD["body_line_h"] + CARD["pad_bottom"]

    def emu(v):
        return Emu(int(v * px2emu))

    for i, lines in enumerate(cards):
        x = L / px2emu + i * (cw + gap)
        #   ① 카드 바탕 — 흰 바탕 위 옅은 회색 + 옅은 테두리
        base = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE,
                                      emu(x), emu(top), emu(cw), emu(ch))
        base.fill.solid()
        base.fill.fore_color.rgb = RGBColor.from_string(CARD["card_bg"])
        base.line.color.rgb = RGBColor.from_string(CARD["border"])
        base.line.width = Emu(int(1 * px2emu))
        base.shadow.inherit = False
        try:
            base.adjustments[0] = CARD.get("radius_pct", 8) / 100.0
        except Exception:
            pass
        base.text_frame.text = ""

        #   ② 제목 밴드 — 카드 상단 전체 폭, `--kn-accent`
        band = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE,
                                      emu(x + 1), emu(top + 1),
                                      emu(cw - 2), emu(CARD["band_h"]))
        band.fill.solid()
        band.fill.fore_color.rgb = RGBColor.from_string(CARD["band_bg"])
        band.line.fill.background()
        band.shadow.inherit = False
        tf = band.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
        try:
            tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        except Exception:
            pass
        p0 = tf.paragraphs[0]
        p0.alignment = PP_ALIGN.CENTER
        #   ⚠️ 제목 밴드는 **원문을 쓰지 않는다.** 역변환의 `render_div` 가 제목에
        #      `**` 를 다시 붙이므로(`* **제목**`) 여기서 굵게를 살리면 `****제목****`
        #      이 된다. 카드 제목에 링크·코드를 쓰는 원고도 실측 0건이라, 되입힐
        #      자리는 **본문 줄**로 좁힌다 (Issue389)
        r0 = p0.add_run()
        r0.text = lines[0]
        r0.font.bold = True
        r0.font.size = Pt(round(CARD["band_fs"] * px2emu / 12700, 1))
        r0.font.color.rgb = RGBColor.from_string(CARD["fg"])

        #   ③ 본문 — 밴드 아래, 좌측 정렬
        if len(lines) > 1:
            bx = slide.shapes.add_textbox(
                emu(x + CARD["body_pad_x"]), emu(top + CARD["band_h"] + 12),
                emu(cw - 2 * CARD["body_pad_x"]),
                emu(len(lines[1:]) * CARD["body_line_h"]))
            btf = bx.text_frame
            btf.word_wrap = True
            btf.margin_left = btf.margin_right = btf.margin_top = btf.margin_bottom = 0
            for j, t in enumerate(lines[1:]):
                para = btf.paragraphs[0] if j == 0 else btf.add_paragraph()
                para.alignment = PP_ALIGN.LEFT
                add_md_runs(para, (md_map or {}).get(t, t),
                            Pt(round(CARD["body_fs"] * px2emu / 12700, 1)),
                            CARD["fg"], mono)
    return n


def load_signals(proj):
    """lane S 사이드카를 **정방향에서** 읽는다 — 역방향의 커닝 금지와 무관하다.

    lane T ornament 는 lane S 가 alt-text 를 심기 **전**에 돌므로 pptx 안의 신호를
    읽을 수 없다. 어느 장이 `htmlart pie` 였는지는 여기서 안다.
    """
    import json as _j
    p = os.path.join(proj, "_pipeline", "pptx", "lane-s.json")
    if not os.path.isfile(p):
        return {}
    by = {}
    for sig in (_j.load(open(p, encoding="utf-8")).get("slides") or []):
        by.setdefault(norm_title(sig.get("title", "")), []).append(sig)
    return by


def norm_title(t):
    t = re.sub(r"\*\*|__|`", "", t or "")
    return re.sub(r"\s+", " ", t).strip()


def body_placeholder(slide):
    for sh in iter_shapes(slide):
        if sh.is_placeholder and sh.has_text_frame and not sh.name.startswith("Title"):
            return sh
    return None


def is_code_para(para):
    from pptx.oxml.ns import qn
    pPr = para._p.find(qn("a:pPr"))
    if pPr is None or pPr.find(qn("a:buNone")) is None:
        return False
    return any(r._r.find(qn("a:rPr")) is not None
               and r._r.find(qn("a:rPr")).find(qn("a:latin")) is not None
               for r in para.runs)


def send_to_back(slide, shape):
    tree = slide.shapes._spTree
    el = shape._element
    tree.remove(el)
    tree.insert(2, el)          # nvGrpSpPr · grpSpPr 다음 = 맨 뒤


def restyle_code(slide, px2emu, L, W, log):
    """코드 문단을 HTML `pre`(github.css) 꼴로 (Issue352).

    pandoc 은 코드를 본문 placeholder **안의 문단**으로 낸다(줄바꿈은 `<a:br>`). 그래서
    상자는 placeholder 뒤에 깐 도형이고, 글자는 그 문단의 run 을 고친다.
    첫 문단이 코드인 흔한 경우는 자리를 정확히 맞추고(placeholder 를 상자 안으로 옮긴다),
    코드가 중간에 오면 앞 문단 높이를 **어림**해 상자를 깐다.
    """
    from pptx.enum.shapes import MSO_SHAPE
    from pptx.dml.color import RGBColor
    from pptx.oxml.ns import qn
    ph = body_placeholder(slide)
    if ph is None or not CODE:
        return 0
    paras = list(ph.text_frame.paragraphs)
    idx = [i for i, p_ in enumerate(paras) if is_code_para(p_)]
    if not idx:
        return 0

    def lines_of(p_):
        return 1 + len(p_._p.findall(qn("a:br")))

    def emu(v):
        return Emu(int(v * px2emu))

    fs_pt = round(CODE["fs"] * px2emu / 12700, 1)
    # 문단을 연속 코드 구간으로 묶는다
    groups, cur = [], []
    for i in idx:
        if cur and i == cur[-1] + 1:
            cur.append(i)
        else:
            if cur:
                groups.append(cur)
            cur = [i]
    groups.append(cur)

    body_top = PX["body_top"]
    y = body_top + CODE["top_gap"]
    # placeholder 를 첫 상자 글자 자리로 옮긴다 (첫 문단이 코드일 때만 정확하다)
    first_is_code = groups[0][0] == 0
    tIns = 45720 / px2emu                     # python-pptx 기본 tIns (EMU) → px
    if first_is_code:
        ph.top = emu(y + CODE["pad_y"] - tIns)
        ph.left = emu(L / px2emu)
        ph.width = emu(W / px2emu)
        #   ⚠️ 높이를 **반드시** 준다 — placeholder 는 자리를 레이아웃에서 물려받는데
        #      `top` 만 쓰면 python-pptx 가 ext 0×0 의 xfrm 을 만들어 높이가 0 이 되고,
        #      뷰어의 `normAutofit` 이 글자를 0 높이에 맞춰 **점처럼** 줄인다
        #      (실측 2026-09-11: LibreOffice 렌더에서 코드가 5px 로 보였다)
        ph.height = emu(PX["body_top"] + PX["body_h"] - (y + CODE["pad_y"] - tIns))
        ph.text_frame.auto_size = MSO_AUTO_SIZE.NONE
        ph.text_frame.margin_left = emu(CODE["pad_x"])
        ph.text_frame.margin_right = emu(CODE["pad_x"])
    boxes = 0
    est_y = y
    for g in groups:
        if not (first_is_code and g is groups[0]):
            # 앞 문단 높이 어림 — 정확하지 않다. 코드가 중간에 오는 원고는 드물다
            for j in range(0, g[0]):
                if j in idx:
                    continue
                sz = next((r.font.size.pt for r in paras[j].runs if r.font.size), 20)
                est_y += lines_of(paras[j]) * sz * (12700 / px2emu) * 1.4 + 6
        n_lines = sum(lines_of(paras[i]) for i in g)
        h = 2 * CODE["pad_y"] + n_lines * CODE["line_h"]
        box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE,
                                     emu(L / px2emu), emu(est_y), emu(W / px2emu), emu(h))
        box.fill.solid()
        box.fill.fore_color.rgb = RGBColor.from_string(CODE["bg"])
        box.line.fill.background()
        box.shadow.inherit = False
        try:
            box.adjustments[0] = CODE.get("radius_px", 6) / float(h)
        except Exception:
            pass
        set_descr(box, ORNAMENT_TAG + "/codebox")
        send_to_back(slide, box)
        boxes += 1
        for i in g:
            p_ = paras[i]
            p_.line_spacing = CODE["line_h"] / CODE["fs"]
            for r in p_.runs:
                #   폴백도 **템플릿 서체**여야 한다 — 하드코딩 "Menlo" 는 정책이 비면
                #   테마 밖 서체를 조용히 심어 `font_outside_theme` 축을 깨뜨린다 (Issue358)
                r.font.name = FONT.get("code") or FONT.get("body") or "NanumGothicCoding"
                r.font.size = Pt(fs_pt)
                r.font.color.rgb = RGBColor.from_string(
                    CODE["keyword"] if r.font.bold else CODE["fg"])
                r.font.bold = False
        # 상자 아래 여백 — 다음 요소가 HTML 처럼 gap_after 만큼 떨어지게
        paras[g[-1]].space_after = Pt(round((CODE["pad_y"] + CODE["gap_after"]) * px2emu / 12700, 1))
        est_y += h + CODE["gap_after"]
    log["code"] = log.get("code", 0) + boxes
    return boxes


def render_pie(slide, px2emu, log):
    """`htmlart pie` 를 **네이티브 파이 차트**로 (Issue353).

    lane C 원칙("근사하지 않는다")은 도형 배치가 판단인 것에 대한 것이다. 파이는 pptx 가
    자기 어휘로 가진 차트라 근사가 아니다. 값은 HTML 렌더러와 같은 규칙 — 라벨 끝
    `N%`(또는 ` N`)을 비율로, 아무 항목에도 값이 없으면 균등 — 으로 읽는다.
    범례·조각 라벨·색·자리는 HTML 실측(pie_geometry)이다.
    """
    from pptx.chart.data import CategoryChartData
    from pptx.enum.chart import XL_CHART_TYPE, XL_LABEL_POSITION
    from pptx.dml.color import RGBColor
    from pptx.oxml import parse_xml
    from pptx.oxml.ns import nsdecls, qn
    ph = body_placeholder(slide)
    if ph is None or not PIE:
        return 0
    items = []
    for p_ in ph.text_frame.paragraphs:
        t = p_.text.strip()
        if not t or is_code_para(p_):
            continue
        if p_.level == 0:
            items.append({"label": t, "subs": []})
        elif items:
            items[-1]["subs"].append(t)
    if len(items) < 2:
        return 0
    vals, names = [], []
    for it in items:
        m = re.match(r"^(.*?)\s+([0-9]+(?:\.[0-9]+)?)%?\s*$", it["label"])
        vals.append(float(m.group(2)) if m else None)
        names.append(m.group(1).strip() if m else it["label"])
    if not any(v is not None for v in vals):
        vals = [1.0] * len(items)
    else:
        vals = [v if v is not None else 0.0 for v in vals]

    def emu(v):
        return Emu(int(v * px2emu))
    c = PIE["container"]
    cd = CategoryChartData()
    cd.categories = [it["label"] for it in items]
    cd.add_series("share", vals)
    gf = slide.shapes.add_chart(XL_CHART_TYPE.PIE, emu(c["l"]), emu(c["t"]),
                                emu(c["w"]), emu(c["h"]), cd)
    set_descr(gf, CONTENT_TAG + "/pie")
    ch = gf.chart
    ch.has_title = False
    #   범례는 차트 내장이 아니라 **도형**으로 그린다(아래). 내장 범례의 manualLayout 은
    #   뷰어마다 다르게 풀리고(실측 2026-09-11: LibreOffice 는 한 줄로 눕힌다), HTML 의
    #   라벨 꼴 `이름 (N%)`·서브라벨·색 칩 모서리도 담을 수 없다
    ch.has_legend = False
    plot = ch.plots[0]
    plot.has_data_labels = True
    dl = plot.data_labels
    dl.show_percentage = True
    dl.show_value = False
    dl.show_category_name = False
    dl.number_format = "0%"
    dl.number_format_is_linked = False
    dl.position = XL_LABEL_POSITION.CENTER
    dl.font.size = Pt(round(PIE["pct_fs"] * px2emu / 12700, 1))
    dl.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
    cols = PIE["colors"]
    for i, pt in enumerate(plot.series[0].points):
        pt.format.fill.solid()
        pt.format.fill.fore_color.rgb = RGBColor.from_string(cols[i % len(cols)])
        pt.format.line.fill.background()
    # 수동 배치 — 파이와 범례 자리를 HTML 실측대로
    pa = PIE["plot"]; lg = PIE["legend"]
    def frac(v, base, size):
        return (v - base) / float(size)
    plot_layout = parse_xml(
        '<c:layout %s><c:manualLayout><c:layoutTarget val="inner"/>'
        '<c:xMode val="edge"/><c:yMode val="edge"/>'
        '<c:x val="%.4f"/><c:y val="%.4f"/><c:w val="%.4f"/><c:h val="%.4f"/>'
        '</c:manualLayout></c:layout>' % (nsdecls("c"),
            frac(pa["l"], c["l"], c["w"]), frac(pa["t"], c["t"], c["h"]),
            pa["w"] / float(c["w"]), pa["h"] / float(c["h"])))
    plotArea = ch._chartSpace.chart.plotArea
    old = plotArea.find(qn("c:layout"))
    if old is not None:
        plotArea.remove(old)
    plotArea.insert(0, plot_layout)
    # ── 범례 — 색 칩 + `이름 (N%)` + 서브라벨, 좌표·서체는 HTML 실측(1920×1280 뷰포트).
    #    HTML 은 svg viewBox(964×600) 안 foreignObject 라 글자 크기가 viewBox 단위다 —
    #    캔버스 축척 1.565 를 곱한 값이 정책의 label_fs·sub_fs 다.
    #    역변환이 되감을 수 있게 전부 **내용 표식**(CONTENT_TAG)을 단다 — 차트 범주가
    #    원고 라벨을 이미 지니므로 범례 글자는 역변환에서 **걷어내는** 쪽이다.
    from pptx.enum.shapes import MSO_SHAPE
    total = sum(vals) or 1.0
    lab_l = lg["l"] + lg["swatch"] + 18
    lab_w = lg["w"] - lg["swatch"] - 18
    for i, it in enumerate(items):
        row_t = lg["t"] + i * lg["row_h"]
        sw = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE,
                                    emu(lg["l"]), emu(row_t + lg.get("swatch_dy", 36)),
                                    emu(lg["swatch"]), emu(lg["swatch"]))
        sw.fill.solid()
        sw.fill.fore_color.rgb = RGBColor.from_string(cols[i % len(cols)])
        sw.line.fill.background()
        sw.shadow.inherit = False
        try:
            sw.adjustments[0] = lg.get("swatch_radius", 8) / float(lg["swatch"])
        except Exception:
            pass
        set_descr(sw, "%s/pie-swatch/%d" % (CONTENT_TAG, i))
        #   HTML 렌더러와 같은 서식 — `이름 (N%)`, 값 0 이면 이름만 (renderPie 의 lbl)
        pct = round(vals[i] / total * 1000) / 10.0
        pct_s = ("%d" % pct) if pct == int(pct) else ("%.1f" % pct)
        lbl = names[i] + ((" (%s%%)" % pct_s) if vals[i] > 0 else "")
        has_sub = bool(it["subs"])
        lspec = {"l": lab_l, "w": lab_w, "h": lg.get("label_h", 38),
                 "t": row_t + (lg["label_dy"] if has_sub else lg.get("label_dy_nosub", lg["label_dy"])),
                 "fs": PIE["label_fs"], "align": "center", "bold": True}
        add_text(slide.shapes, lspec, lbl, px2emu, tag="%s/pie-legend/%d" % (CONTENT_TAG, i))
        for j, sub in enumerate(it["subs"]):
            spec = {"l": lab_l, "w": lab_w, "h": lg.get("sub_h", 23),
                    "t": row_t + lg["sub_dy"] + j * lg.get("sub_h", 23),
                    "fs": PIE["sub_fs"], "align": "center"}
            add_text(slide.shapes, spec, sub, px2emu, tag="%s/pie-sub/%d" % (CONTENT_TAG, i))
    ph._element.getparent().remove(ph._element)
    log["pie"] = log.get("pie", 0) + 1
    return 1


def _tw(text, fs):
    """모노스페이스(NanumGothicCoding) 폭 어림 — 한글 1em · 그 외 0.5em."""
    w = 0.0
    for ch in text or "":
        o = ord(ch)
        w += 1.0 if (0xAC00 <= o <= 0xD7A3 or 0x3131 <= o <= 0x318E or 0x4E00 <= o <= 0x9FFF
                     or 0x3000 <= o <= 0x303F or 0xFF00 <= o <= 0xFFEF) else 0.5
    return w * fs


def has_bullets(ph):
    """placeholder 에 불릿 문단이 있는가 — pandoc 은 평문 문단에만 `<a:buNone/>` 을 적는다."""
    from pptx.oxml.ns import qn
    if ph is None:
        return False
    for p_ in ph.text_frame.paragraphs:
        if not p_.text.strip():
            continue
        pPr = p_._p.find(qn("a:pPr"))
        if pPr is None or pPr.find(qn("a:buNone")) is None:
            return True
    return False


def apply_table_style(tbl, T, px2emu, body_w, top_px=None, left_px=0):
    """표 하나에 HTML 과 같은 꼴을 입힌다 — 열 폭·글자·머리행·밑선·여백 (Issue358).

    두 경로가 공유한다:
      · `Content with Caption` 장 — `relayout_caption` 이 문단 아래로 재배치하며 부른다
      · 그 밖의 본문 장 — pandoc 이 놓은 자리를 지키고 서식만 입힌다(`top_px=None`)

    왜 함수로 뽑았나 — 서식이 `relayout_caption` 안에만 있어서 **일반 `Title and Content`
    장의 표는 pandoc 기본 그대로 남았다**. 실측(m2Slide_chapter_mode p32, 2026-09-19):
    글자 8.5pt · 열 602px 균등 — 같은 덱 p33(재배치 경로)은 20pt·904px 이라 한 덱 안에서
    표 두 개가 서로 다른 꼴이었다.

    `top_px` 가 None 이면 세로 위치를 건드리지 않는다. 가로는 폭이 바뀌므로 항상 가운데로
    다시 맞춘다 — 안 맞추면 폭 교정이 곧 좌측 쏠림이 된다.
    """
    from pptx.oxml.ns import qn, nsdecls
    from pptx.oxml import parse_xml
    from pptx.dml.color import RGBColor

    def emu(v):
        return Emu(int(v * px2emu))

    t = tbl.table
    fs = T["fs"]
    ncol, nrow = len(t.columns), len(t.rows)
    col_w = []
    for c in range(ncol):
        col_w.append(max(_tw(t.cell(r, c).text, fs) for r in range(nrow)) + 2 * T["pad_x"])

    #   표 폭 — HTML 의 `table-layout: auto` + `min-width: 50%` · `max-width: 90%` 를
    #   그대로 옮긴다 (Issue358). 콘텐츠 합만 쓰면 **여유가 0 이라 셀이 줄바꿈된다** —
    #   실측: 'lane A' 68.1pt vs 가용 68.0pt, 0.1pt 초과로 두 줄이 됐다.
    #   HTML 은 min-width 가 콘텐츠보다 커서 남는 폭을 열에 비례 배분하고, 그 여유가
    #   곧 잘림 방지다. 안전 계수를 지어내지 않고 CSS 규칙을 옮기는 이유가 그것이다.
    content_w = sum(col_w)
    tw = content_w
    if T.get("min_w_ratio"):
        tw = max(tw, body_w * float(T["min_w_ratio"]))
    tw = min(tw, body_w * float(T.get("max_w_ratio", 1.0)), body_w)
    if content_w > 0 and tw > content_w:
        k = tw / content_w                      # auto 레이아웃의 비례 배분
        col_w = [w * k for w in col_w]
    elif content_w > tw:
        k = tw / content_w                      # max-width 상한에 걸린 경우
        col_w = [w * k for w in col_w]
    tbl.left = emu(left_px + (body_w - tw) / 2.0)
    if top_px is not None:
        tbl.top = emu(top_px)
    tbl.width = emu(tw)
    tbl.height = emu(nrow * T["row_h"])
    for c in range(ncol):
        t.columns[c].width = emu(col_w[c])
    for r in range(nrow):
        t.rows[r].height = emu(T["row_h"])
    #   pandoc 의 표 스타일(테마 강조색 머리행·줄무늬)을 끈다 — HTML 표는 회색 머리행 + 밑선뿐
    tblPr = t._tbl.tblPr
    tblPr.set("firstRow", "0"); tblPr.set("bandRow", "0")
    sid = tblPr.find(qn("a:tableStyleId"))
    if sid is not None:
        tblPr.remove(sid)
    fs_pt = Pt(round(fs * px2emu / 12700, 1))
    for r in range(nrow):
        for c in range(ncol):
            cell = t.cell(r, c)
            cell.margin_left = cell.margin_right = emu(T["pad_x"])
            cell.margin_top = cell.margin_bottom = emu(T["pad_y"])
            cell.vertical_anchor = MSO_ANCHOR.MIDDLE
            for p_ in cell.text_frame.paragraphs:
                for r_ in p_.runs:
                    r_.font.size = fs_pt
                    r_.font.bold = bool(r == 0 and T.get("head_bold"))
                    r_.font.color.rgb = RGBColor.from_string(T["fg"])
            if r == 0:
                cell.fill.solid(); cell.fill.fore_color.rgb = RGBColor.from_string(T["head_bg"])
            else:
                cell.fill.background()
            tcPr = cell._tc.get_or_add_tcPr()
            for tag in ("a:lnL", "a:lnR", "a:lnT", "a:lnB"):
                old = tcPr.find(qn(tag))
                if old is not None:
                    tcPr.remove(old)
            lns = [parse_xml('<%s %s w="0"><a:noFill/></%s>' % (tag, nsdecls("a"), tag))
                   for tag in ("a:lnL", "a:lnR", "a:lnT")]
            lns.append(parse_xml('<a:lnB %s w="%d"><a:solidFill><a:srgbClr val="%s"/></a:solidFill></a:lnB>'
                                 % (nsdecls("a"), int(T["border_px"] * px2emu), T["border"])))
            for i, ln in enumerate(lns):
                tcPr.insert(i, ln)
    return 1


def relayout_caption(slide, px2emu, L, W, log):
    """pandoc `Content with Caption` 장(글 + 표/그림)을 HTML 규칙대로 다시 놓는다 (Issue355).

    pandoc 은 글을 좁은 좌측 placeholder 에, 표/그림을 우측에 두고 그림 alt 를 캡션으로
    낸다. HTML 은 다르다 — **리스트+이미지만** 좌우 2분할(`.m2-cols`), 문단+표는 위아래로
    쌓고 표는 내용 폭으로 가운데. 캡션은 없다(alt 는 `img[alt]` 로만 남는다).
    """
    from pptx.oxml.ns import qn
    from pptx.oxml import parse_xml
    from pptx.oxml.ns import nsdecls
    from pptx.dml.color import RGBColor
    if slide.slide_layout.name != "Content with Caption" or not (SPLIT and TABLE):
        return 0
    shapes = list(iter_shapes(slide))
    text_ph = next((sh for sh in shapes if sh.has_text_frame and sh.name.startswith("Text")
                    and not sh.name.startswith("TextBox")), None)
    tbl = next((sh for sh in shapes if sh.has_table), None)
    pic = next((sh for sh in shapes if str(sh.shape_type).startswith("PICTURE")
                and not shape_descr(sh).startswith(ORNAMENT_TAG)), None)
    cap = next((sh for sh in shapes if sh.has_text_frame and sh.name.startswith("TextBox")
                and sh.is_placeholder), None)

    def emu(v):
        return Emu(int(v * px2emu))

    if tbl is not None:
        T = TABLE
        fs = T["fs"]
        n_para = len([p_ for p_ in text_ph.text_frame.paragraphs if p_.text.strip()]) if text_ph else 0
        text_h = max(n_para, 1) * T["para_line_h"]
        if text_ph is not None:
            text_ph.left, text_ph.width = L, W
            text_ph.top = emu(SPLIT["top"])
            text_ph.height = emu(text_h)
            text_ph.text_frame.auto_size = MSO_AUTO_SIZE.NONE
            for p_ in text_ph.text_frame.paragraphs:
                p_.alignment = PP_ALIGN.CENTER
        t = tbl.table
        ncol, nrow = len(t.columns), len(t.rows)
        apply_table_style(tbl, TABLE, px2emu, W / px2emu,
                          top_px=SPLIT["top"] + text_h + T["gap_before"],
                          left_px=L / px2emu)
        log["table"] = log.get("table", 0) + 1
        return 1

    if pic is not None:
        #   캡션(= alt) 은 화면에 없다 — 그림의 alt-text(`descr`)로 옮기고 상자는 없앤다
        if cap is not None:
            alt = cap.text_frame.text.strip()
            if alt:
                set_descr(pic, alt)
            cap._element.getparent().remove(cap._element)
        #   좌우 2분할은 HTML 휴리스틱 그대로 **리스트+이미지** 일 때만이다. 문단+이미지·
        #   이미지 단독 장의 HTML 배치는 다른 규칙(세로 흐름·`_blank`)이라 여기서 근사하지
        #   않는다 — 그 장들은 pandoc 자리 그대로 두고 Issue343 에서 다룬다
        if not has_bullets(text_ph):
            log["caption_alt"] = log.get("caption_alt", 0) + 1
            return 1
        if text_ph is not None:
            text_ph.left, text_ph.width = L, emu(SPLIT["col_w"])
            text_ph.top, text_ph.height = emu(SPLIT["top"]), emu(SPLIT["h"])
        bx_l = L / px2emu + SPLIT["col_w"] + SPLIT["gap"]
        iw, ih = pic.width, pic.height
        sc = min(SPLIT["col_w"] * px2emu / float(iw), SPLIT["h"] * px2emu / float(ih))
        w, h = int(iw * sc), int(ih * sc)
        pic.width, pic.height = w, h
        pic.left = int(bx_l * px2emu + (SPLIT["col_w"] * px2emu - w) / 2)
        pic.top = int(SPLIT["top"] * px2emu + (SPLIT["h"] * px2emu - h) / 2)
        log["split"] = log.get("split", 0) + 1
        return 1
    return 0


def add_picture_fit(shapes, img, spec, px2emu, kind="mascot"):
    """`background-size: contain` 흉내 — 상자 안에 비율 유지, 우상단 정렬."""
    from PIL import Image
    iw, ih = Image.open(img).size
    bw, bh = spec["w"], spec["h"]
    sc = min(bw / iw, bh / ih)
    w, h = iw * sc, ih * sc
    l = spec["l"] + (bw - w) if "right" in spec.get("anchor", "") else spec["l"]
    t = spec["t"]
    return add_rule(shapes, img, int(l * px2emu), int(t * px2emu),
                    int(w * px2emu), int(h * px2emu), kind=kind)


ALIGN = {"left": PP_ALIGN.LEFT, "center": PP_ALIGN.CENTER, "right": PP_ALIGN.RIGHT}


def add_text(shapes, spec, text, px2emu, tag=ORNAMENT_TAG + "/text"):
    """좌표 명세(px)대로 텍스트 상자 하나. 값은 HTML 에서 온 글자 그대로 넣는다."""
    if not text or not spec:
        return None
    box = shapes.add_textbox(Emu(int(spec["l"] * px2emu)), Emu(int(spec["t"] * px2emu)),
                             Emu(int(spec["w"] * px2emu)), Emu(int(spec["h"] * px2emu)))
    tf = box.text_frame
    #   ⚠️ **접지 않는다.** HTML 이 한 줄로 그리는 것을 pptx 가 폭 때문에 접으면
    #      `남중구 ( 핀프 라 )` 처럼 갈라진다(실측 2026-09-10). 상자를 넘겨도
    #      글자는 그대로 보이는 편이 원본에 가깝다
    tf.word_wrap = False
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    try:
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    except Exception:
        pass
    p = tf.paragraphs[0]
    p.alignment = ALIGN.get(spec.get("align", "left"), PP_ALIGN.LEFT)
    run = p.add_run()
    run.text = text
    #   글자 크기는 HTML 실측 px 을 그대로 pt 로 쓰지 않는다 — 캔버스 1920px 이
    #   슬라이드 폭이므로 **px 을 EMU 로 환산한 뒤 pt 로** 바꿔야 화면 비율이 맞는다
    run.font.size = Pt(round(spec.get("fs", 14) * px2emu / 12700, 1))
    if spec.get("bold"):
        run.font.bold = True
    if spec.get("color"):
        from pptx.dml.color import RGBColor as _RGB
        run.font.color.rgb = _RGB.from_string(spec["color"])
    if tag:
        set_descr(box, tag)
    return box


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pptx")
    ap.add_argument("themeimg")
    ap.add_argument("--canvas-px", default="1920x1280")
    ap.add_argument("--mode", choices=("layout", "ornament"), default="layout")
    a = ap.parse_args()

    hr = os.path.join(a.themeimg, G["asset"])
    if not os.path.isfile(hr):
        print("  ℹ️ lane T 생략 — %s 없음 (%s)" % (G["asset"], a.themeimg), file=sys.stderr)
        return 0

    cw, ch = (int(x) for x in a.canvas_px.lower().split("x"))
    prs = Presentation(a.pptx)
    px2emu = prs.slide_width / cw
    #   세로도 같은 축척이어야 한다 — 판형이 맞으면 두 값이 같다
    if abs(prs.slide_height / ch - px2emu) > 1:
        print("  ⚠️ lane T — 캔버스 비율(%dx%d)이 pptx 판형과 어긋난다. 생략"
              % (cw, ch), file=sys.stderr)
        return 0

    L = int(PX["margin"] * px2emu)
    W = prs.slide_width - 2 * L
    T = int((PX["line_top"] + PX["line_h"]) * px2emu)
    H = int((PX["line_bottom"] - PX["line_top"] - PX["line_h"]) * px2emu)
    log = {"ph": 0, "rule": 0, "layout": 0, "cover": 0, "head": 0, "card": 0, "font": ""}

    lh = int(PX["line_h"] * px2emu)

    if a.mode == "layout":
        fix_placeholders(prs.slide_master, "", L, W, T, H, px2emu, log)
        for lay in prs.slide_master.slide_layouts:
            fix_placeholders(lay, lay.name, L, W, T, H, px2emu, log)
            log["layout"] += 1
        prs.save(a.pptx)
        #   ⚠️ **저장 뒤에** 고친다 — 패키지를 직접 손보는 작업이라 먼저 하면
        #      `prs.save()` 가 메모리의 예전 내용으로 덮어쓴다(실측 2026-09-11).
        #   제목 서체: theme.yml 에는 서체가 하나뿐이라 `theme2reference` 가
        #   major/minor 를 같은 값으로 넣는다. HTML 은 제목만 다른 서체를 쓴다
        #   (`--title-font-family: GmarketSansBold`).
        if FONT.get("title"):
            set_major_font(a.pptx, FONT["title"], log, bold=bool(FONT.get("title_bold")))
        print("  lane T 배치 — placeholder %d개 재배치 · 레이아웃 %d%s"
              % (log["ph"], log["layout"],
                 (" · 제목 서체 %s" % log["font"]) if log.get("font") else ""),
              file=sys.stderr)
        return 0

    #   ── ornament — 가로선·제목 밑줄 + **표지 구성·머리말 바·라이선스 뱃지**
    #
    #   표지를 lane T 가 짓는 이유: pandoc 의 `Title Slide` 는 title·subtitle·author·
    #   date 넷밖에 모른다. 로고·강사 박스·코너 배지·버전은 **표현할 어휘가 없어**
    #   lane A 로는 원리적으로 넘길 수 없다(실측 2026-09-10: HTML 슬롯 12개 중 pptx 에
    #   도달한 것이 제목 하나뿐이었다).
    proj = os.path.dirname(os.path.dirname(os.path.abspath(a.pptx)))
    cover = read_cover(proj)
    heads = read_heads(proj)
    parts = read_parts(proj)
    slides = list(prs.slides)
    logo_path = os.path.join(a.themeimg, (COVER.get("logo") or {}).get("asset", ""))

    signals = load_signals(proj)
    card_md = load_card_md(proj)
    seen_titles = {}
    for i, slide in enumerate(slides):
        lay = slide.slide_layout.name
        ttl0 = next((sh for sh in iter_shapes(slide)
                     if sh.has_text_frame and sh.name.startswith("Title")), None)
        title_txt = norm_title(ttl0.text_frame.text) if ttl0 is not None else ""
        is_agenda = bool(AGENDA) and title_txt.lower() == "agenda"
        #   상단선 — 표지 22 · Agenda 는 자기 자리 · 본문 장 66 (머리말 바 아래, 픽셀 실측)
        if is_agenda and AGENDA.get("rule"):
            r_ = AGENDA["rule"]
            add_rule(slide.shapes, hr, int(r_["l"] * px2emu), int(r_["t"] * px2emu),
                     int(r_["w"] * px2emu), lh)
            log["rule"] += 1
        else:
            top = PX["line_top"] if lay == "Title Slide" else G.get("rule_top_content", PX["line_top"])
            add_rule(slide.shapes, hr, L, int(top * px2emu), W, lh)
            log["rule"] += 1
        if not (is_agenda and AGENDA.get("bottom_rule") is False):
            add_rule(slide.shapes, hr, L, int(PX["line_bottom"] * px2emu), W, lh)
            log["rule"] += 1
        #   제목 서체 — HTML 제목은 900 굵기. pptx 는 family + b=1 로 face 를 고른다
        #   레이아웃이 b=1 을 물려주므로 False 도 run 에 b=0 으로 **적어야** face 굵기에
        #   가짜 굵기가 겹치지 않는다(Gmarket Sans Bold 는 face 자체가 Bold 다)
        if ttl0 is not None:
            for p_ in ttl0.text_frame.paragraphs:
                for r_ in p_.runs:
                    r_.font.bold = bool(FONT.get("title_bold"))
        #   이 장의 lane S 신호 (제목 + 동명 순번)
        o_ = seen_titles.get(title_txt, 0); seen_titles[title_txt] = o_ + 1
        cands = signals.get(title_txt, [])
        sig = cands[o_] if o_ < len(cands) else {}
        blocks = sig.get("block") or []

        #   글+표/그림 장(`Content with Caption`) 재배치 — 제목이 없는 장도 해당한다
        #   (실측 2026-09-11 m2Slide_chapter_mode p18·p19·p22: 무제 이미지 장이 빠졌다)
        if lay in BODY_LAYOUTS and not is_agenda:
            did = relayout_caption(slide, px2emu, L, W, log)
            #   재배치 경로가 손대지 않은 표에도 같은 꼴을 입힌다 (Issue358).
            #   서식이 `relayout_caption`(= `Content with Caption` 전용) 안에만 있던 탓에
            #   일반 `Title and Content` 장의 표는 pandoc 기본 그대로였다 — 실측
            #   m2Slide_chapter_mode p32 글자 8.5pt·열 602px 균등 vs 같은 덱 p33 20pt·904px.
            #   한 덱 안에서 표 두 개가 서로 다른 꼴인 것은 어느 쪽이 맞든 결함이다.
            #   ⚠️ 세로 위치는 건드리지 않는다(`top_px=None`) — 일반 장 표의 HTML 배치
            #      규칙은 아직 실측하지 않았다. 여기서 옮기면 근거 없는 이동이 된다.
            if not did and TABLE:
                for sh_ in iter_shapes(slide):
                    if sh_.has_table:
                        apply_table_style(sh_, TABLE, px2emu, W / px2emu,
                                          top_px=None, left_px=L / px2emu)
                        log["table"] = log.get("table", 0) + 1
        #   제목 밑줄은 **그 장의 제목 상자 맨 아래**다(CSS `::after { bottom: 0 }`).
        #   섹션 진입은 제목이 세로 가운데라 밑줄이 글자 한복판을 지나므로 뺀다.
        ttl = next((sh for sh in slide.shapes
                    if sh.has_text_frame and sh.name.startswith("Title")), None)
        if (lay in BODY_LAYOUTS and ttl is not None and ttl.text_frame.text.strip()
                and not is_agenda):
            add_rule(slide.shapes, hr, ttl.left,
                     ttl.top + ttl.height - lh + int(G.get("underline_dy", 0) * px2emu),
                     ttl.width, lh, kind="underline")
            log["rule"] += 1

        if lay == "Title Slide" and cover:
            #   pandoc 이 만든 제목 상자를 **HTML 이 재어 준 자리로 옮긴다**.
            #   지우고 새로 만들지 않는 것은 그 상자가 테마 서식을 이미 지녔기 때문이다
            spec = COVER.get("title") or {}
            if ttl is not None and spec:
                ttl.left = int(spec["l"] * px2emu); ttl.top = int(spec["t"] * px2emu)
                ttl.width = int(spec["w"] * px2emu); ttl.height = int(spec["h"] * px2emu)
                for p_ in ttl.text_frame.paragraphs:
                    p_.alignment = ALIGN.get(spec.get("align", "center"))
                    for r_ in p_.runs:
                        r_.font.size = Pt(round(spec["fs"] * px2emu / 12700, 1))
                        r_.font.bold = bool(FONT.get("title_bold"))
                #   ⚠️ 자동 맞춤을 끈다 — 상자 높이가 글자 높이와 같아(HTML 실측) 뷰어가
                #      `normAutofit` 을 다시 계산하면 제목이 줄어든다(LibreOffice 즉시·
                #      PowerPoint 는 편집 시). 크기는 우리가 실측으로 정한 값이다
                ttl.text_frame.auto_size = MSO_AUTO_SIZE.NONE
                ttl.text_frame.word_wrap = False
            #   부제 placeholder 는 pandoc 이 비워 둔 채 남긴다 — 우리 상자와 겹치므로 없앤다
            for sh in list(slide.shapes):
                if (sh.has_text_frame and sh.name.startswith("Subtitle")
                        and not sh.text_frame.text.strip()):
                    sh._element.getparent().remove(sh._element)
            #   표지 제목 밑줄 — 글자 폭만큼, 제목 상자 맨 아래
            if spec and ttl is not None and ttl.text_frame.text.strip():
                tw = min(spec["w"], text_width_px(ttl.text_frame.text.strip(), spec["fs"]))
                add_rule(slide.shapes, hr,
                         int((spec["l"] + (spec["w"] - tw) / 2) * px2emu),
                         int((spec["t"] + spec["h"] - G["rule_h"]) * px2emu),
                         int(tw * px2emu), lh, kind="underline")
                log["cover"] += 1
            if os.path.isfile(logo_path):
                g = COVER["logo"]
                add_rule(slide.shapes, logo_path, int(g["l"] * px2emu),
                         int(g["t"] * px2emu), int(g["w"] * px2emu),
                         int(g["h"] * px2emu), kind="logo")
                log["cover"] += 1
            #   강사 상자는 테두리(도형) + 이름 + 연락처 **셋**이다. 합치면 HTML 의 두
            #   요소가 pptx 에서 한 덩어리가 되어 대조가 어긋난다(실측 2026-09-10)
            bx = COVER.get("instructor_box")
            if bx and (cover.get("iname") or cover.get("icontact")):
                add_outline(slide.shapes, bx, px2emu, accent=CARD.get("band_bg", "F5C518"))
                log["cover"] += 1
            for text, spec_key in ((cover.get("subtitle"), "subtitle"),
                                   (cover.get("iname"), "instructor_name"),
                                   (cover.get("icontact"), "instructor_contact"),
                                   (cover.get("corner_tl"), "corner_tl"),
                                   (cover.get("corner_br"), "corner_br"),
                                   #   우상단 한 자리에 **둘 중 하나**가 온다. 테마가 이미
                                   #     그렇게 정했다 — slide.css 의
                                   #     `:has(.cover-tr:not(:empty)) … .cover-version { display:none }`
                                   #     즉 `version_badge` 가 있으면 `version` 은 **중복이라 숨긴다.**
                                   #     그 판정을 그대로 옮긴다(HTML 이 정본이므로 pptx 도 같아야 한다).
                                   (cover.get("corner_tr") or cover.get("version"), "version")):
                if add_text(slide.shapes, COVER.get(spec_key), text, px2emu):
                    log["cover"] += 1

        elif (lay in BODY_LAYOUTS and ttl is not None
              and ttl.text_frame.text.strip().lower() == "agenda" and AGENDA):
            #   Agenda 장 — HTML `layout-_agenda` 는 **노란 테두리 박스 + 고양이**다.
            #   제목도 가운데가 아니라 **좌측**이고 밑줄이 없다.
            spec = AGENDA.get("title") or {}
            if spec:
                ttl.left = int(spec["l"] * px2emu); ttl.top = int(spec["t"] * px2emu)
                ttl.width = int(spec["w"] * px2emu); ttl.height = int(spec["h"] * px2emu)
                for p_ in ttl.text_frame.paragraphs:
                    p_.alignment = ALIGN.get(spec.get("align", "left"))
                    for r_ in p_.runs:
                        r_.font.size = Pt(round(spec["fs"] * px2emu / 12700, 1))
                        r_.font.bold = bool(FONT.get("title_bold"))
                ttl.text_frame.auto_size = MSO_AUTO_SIZE.NONE
                ttl.text_frame.word_wrap = False
            fr = AGENDA.get("frame")
            if fr:
                ol = add_outline(slide.shapes, fr, px2emu,
                                 accent=CARD.get("band_bg", "F5C518"),
                                 width_px=fr.get("border_px", 2))
                try:
                    from pptx.enum.shapes import MSO_SHAPE as _MS
                    ol._element.spPr.prstGeom.set("prst", "roundRect")
                    ol.adjustments[0] = fr.get("radius_px", 8) / float(fr["h"])
                except Exception:
                    pass
                log["cover"] += 1
                #   항목은 **박스 안**에 있어야 한다 — 본문 placeholder 를 옮긴다
                body = body_placeholder(slide)
                if body is not None:
                    pad = AGENDA.get("body_pad", 40)
                    body.left = int((fr["l"] + pad) * px2emu)
                    body.top = int((fr["t"] + pad) * px2emu)
                    body.width = int((fr["w"] - 2 * pad) * px2emu)
                    body.height = int((fr["h"] - 2 * pad) * px2emu)
            mc = AGENDA.get("mascot") or {}
            mp2 = os.path.join(a.themeimg, mc.get("asset", ""))
            if mc and os.path.isfile(mp2):
                add_picture_fit(slide.shapes, mp2, mc, px2emu, kind="mascot")
                log["cover"] += 1

        elif lay in BODY_LAYOUTS and ttl is not None:
            #   네이티브 차트 — 정책 `native_charts` 에 있는 블록만
            if any(NATIVE.get(b) == "pie" for b in blocks):
                render_pie(slide, px2emu, log)
            #   코드 상자 — github.css 꼴
            restyle_code(slide, px2emu, L, W, log)
            #   lane B 가 그린 cards 를 m2slide 카드로 다시 그린다.
            #   신호를 읽지 않아도 된다 — `redraw_cards` 가 **커넥터 유무**로 가른다
            #   (커넥터가 있으면 순차 블록이라 손대지 않는다)
            log["card"] += redraw_cards(slide, px2emu, L, W, card_md,
                                        (FONT or {}).get("code"))
            #   제목 옆 마스코트 — `.layout-_contents > .title` 의 배경이라
            #   `<img>` 로는 보이지 않는다(전수 대조가 자산 해시로 잡아냈다)
            #   Issue379: 챕터 진입 장은 **다른 마스코트**를 쓴다 — HTML `.layout-chapter`
            #     는 `finfraPuffer2.png` 를 배경으로 깔고, 본문 장은
            #     `.layout-_contents > .title` 배경으로 `finfraPuffer2s.png` 를 제목 옆에
            #     둔다. 진입 장이 pptx 에서 본문 장과 **같은 layout**(`Title and Content`)
            #     으로 나오는 탓에 여기서 가를 근거가 없어 그 자산만 pptx 에 실리지
            #     않았다(check-parity 의 자산 해시 대조가 잡아냈다). 판정은 lane S 표식.
            _ms = CHAPTER_MASCOT if ("chapter" in (sig.get("layout") or []) and CHAPTER_MASCOT) else MASCOT
            mp = os.path.join(a.themeimg, _ms.get("asset", ""))
            if _ms and os.path.isfile(mp) and ttl.text_frame.text.strip():
                add_rule(slide.shapes, mp, int(_ms["l"] * px2emu),
                         int(_ms["t"] * px2emu), int(_ms["w"] * px2emu),
                         int(_ms["h"] * px2emu), kind="mascot")
                log["cover"] += 1
            #   part 라벨 — 진입 장에만, **HTML 이 실제로 렌더한 덱에만** (Issue389)
            if "chapter" in (sig.get("layout") or []):
                if add_text(slide.shapes, CHAPTER_PART,
                            parts.get(ttl.text_frame.text.strip(), ""), px2emu,
                            tag=CONTENT_TAG + "/part"):
                    log["cover"] += 1
            #   머리말 바 — 그 장의 제목을 열쇠로 HTML 에서 찾는다
            hl, hrr = heads.get(ttl.text_frame.text.strip(), ("", ""))
            if add_text(slide.shapes, HEAD.get("left"), hl, px2emu):
                log["head"] += 1
            if add_text(slide.shapes, HEAD.get("right"), hrr, px2emu):
                log["head"] += 1

        #   라이선스 뱃지 — HTML 은 **첫 장과 마지막 장**에만 둔다(실측)
        if cover.get("license") and i in (0, len(slides) - 1):
            if add_text(slide.shapes, COVER.get("license"), cover["license"], px2emu):
                log["cover"] += 1

    prs.save(a.pptx)
    #   ⚠️ **제목 서체를 여기서 다시 잡는다.** ③-c `retheme.py --font-only` 가
    #      theme.yml 의 서체(본문)로 pptx 전체를 덮어, layout 모드에서 고친
    #      majorFont 가 되돌려진다(실측 2026-09-11: reference 는 GmarketSansBold 인데
    #      최종 pptx 는 Nanum Gothic Coding). ornament 는 retheme 뒤 단계다.
    if FONT.get("title"):
        set_major_font(a.pptx, FONT["title"], log, bold=bool(FONT.get("title_bold")))
    print("  lane T 장식 — 가로선·밑줄 %d · 표지 %d · 머리말 %d · 카드 %d · 코드 %d · 파이 %d · 표 %d · 2분할 %d · 캡션→alt %d (장 %d)%s"
          % (log["rule"], log["cover"], log["head"], log["card"], log.get("code", 0),
             log.get("pie", 0), log.get("table", 0), log.get("split", 0), log.get("caption_alt", 0),
             len(slides),
             (" · 제목 서체 %s" % log["font"]) if log.get("font") else ""),
          file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
