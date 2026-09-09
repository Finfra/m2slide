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

try:
    from pptx import Presentation
    from pptx.util import Emu, Pt
    from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
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

#   표지·머리말 글자는 **빌드된 HTML 이 정본**이다. frontmatter·config 를 다시 조합하면
#   HTML 과 어긋날 수 있고, 대조기(check-parity.py)도 HTML 을 보므로 출처를 하나로 둔다.
COVER_SEL = {
    "title": r'class="cover-title"[^>]*>(.*?)</',
    "subtitle": r'class="cover-subtitle"[^>]*>(.*?)</',
    "iname": r'class="cover-instructor-name"[^>]*>(.*?)</',
    "icontact": r'class="cover-instructor-contact"[^>]*>(.*?)</',
    "corner_tl": r'class="cover-corner cover-tl"[^>]*>(.*?)</',
    "corner_br": r'class="cover-corner cover-br"[^>]*>(.*?)</',
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


ORNAMENT_TAG = "m2slide:ornament"


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


def add_outline(shapes, spec, px2emu, accent="F5C518"):
    """강사 상자의 테두리 — 글자가 없는 **틀**이라 도형으로 그린다."""
    from pptx.enum.shapes import MSO_SHAPE
    from pptx.dml.color import RGBColor
    sh = shapes.add_shape(MSO_SHAPE.RECTANGLE,
                          Emu(int(spec["l"] * px2emu)), Emu(int(spec["t"] * px2emu)),
                          Emu(int(spec["w"] * px2emu)), Emu(int(spec["h"] * px2emu)))
    sh.fill.background()
    sh.line.color.rgb = RGBColor.from_string(accent)
    sh.line.width = Emu(int(1.5 * px2emu))
    sh.shadow.inherit = False
    return sh


#   ⚠️ lane T 가 심는 **글자**에도 표식이 필요하다. 없으면 왕복 역변환이 머리말 바·
#      라이선스 뱃지를 **본문 불릿으로** 읽는다(실측 2026-09-10: 왕복본에 +7줄).
#      그림(add_rule)에 이미 같은 표식을 쓰고 있다.
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
    if tag:
        try:
            box._element._nvXxPr.cNvPr.set("descr", tag)
        except Exception:
            pass
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
    log = {"ph": 0, "rule": 0, "layout": 0, "cover": 0, "head": 0}

    lh = int(PX["line_h"] * px2emu)

    if a.mode == "layout":
        fix_placeholders(prs.slide_master, "", L, W, T, H, px2emu, log)
        for lay in prs.slide_master.slide_layouts:
            fix_placeholders(lay, lay.name, L, W, T, H, px2emu, log)
            log["layout"] += 1
        prs.save(a.pptx)
        print("  lane T 배치 — placeholder %d개 재배치 · 레이아웃 %d"
              % (log["ph"], log["layout"]), file=sys.stderr)
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
    slides = list(prs.slides)
    logo_path = os.path.join(a.themeimg, (COVER.get("logo") or {}).get("asset", ""))

    for i, slide in enumerate(slides):
        add_rule(slide.shapes, hr, L, int(PX["line_top"] * px2emu), W, lh)
        add_rule(slide.shapes, hr, L, int(PX["line_bottom"] * px2emu), W, lh)
        log["rule"] += 2
        lay = slide.slide_layout.name

        #   제목 밑줄은 **그 장의 제목 상자 맨 아래**다(CSS `::after { bottom: 0 }`).
        #   섹션 진입은 제목이 세로 가운데라 밑줄이 글자 한복판을 지나므로 뺀다.
        ttl = next((sh for sh in slide.shapes
                    if sh.has_text_frame and sh.name.startswith("Title")), None)
        if lay in BODY_LAYOUTS and ttl is not None and ttl.text_frame.text.strip():
            add_rule(slide.shapes, hr, ttl.left, ttl.top + ttl.height - lh,
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
                        r_.font.bold = True
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
                add_outline(slide.shapes, bx, px2emu, accent="F5C518")
                log["cover"] += 1
            for text, spec_key in ((cover.get("subtitle"), "subtitle"),
                                   (cover.get("iname"), "instructor_name"),
                                   (cover.get("icontact"), "instructor_contact"),
                                   (cover.get("corner_tl"), "corner_tl"),
                                   (cover.get("corner_br"), "corner_br"),
                                   (cover.get("version"), "version")):
                if add_text(slide.shapes, COVER.get(spec_key), text, px2emu):
                    log["cover"] += 1

        elif lay in BODY_LAYOUTS and ttl is not None:
            #   제목 옆 마스코트 — `.layout-_contents > .title` 의 배경이라
            #   `<img>` 로는 보이지 않는다(전수 대조가 자산 해시로 잡아냈다)
            mp = os.path.join(a.themeimg, MASCOT.get("asset", ""))
            if MASCOT and os.path.isfile(mp) and ttl.text_frame.text.strip():
                add_rule(slide.shapes, mp, int(MASCOT["l"] * px2emu),
                         int(MASCOT["t"] * px2emu), int(MASCOT["w"] * px2emu),
                         int(MASCOT["h"] * px2emu), kind="mascot")
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
    print("  lane T 장식 — 가로선·밑줄 %d · 표지 %d · 머리말 %d (장 %d)"
          % (log["rule"], log["cover"], log["head"], len(slides)), file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
