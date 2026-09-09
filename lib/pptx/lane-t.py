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
import sys

try:
    from pptx import Presentation
    from pptx.util import Emu
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


G = load_geometry()
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


def add_rule(shapes, img, left, top, width, height):
    """가로선 한 줄. **장식임을 alt-text 에 적는다.**

    적지 않으면 왕복 역변환이 이것을 **본문 이미지로 읽는다** — 실측(2026-09-10):
    10장 덱에 원고에 없던 이미지 21개가 왕복본에 생겼다. 표식은 lane S 가 쓰는
    것과 같은 자리(`p:cNvPr/@descr`)이고, 화면에 보이지 않는다.
    """
    pic = shapes.add_picture(img, Emu(left), Emu(top), Emu(width), Emu(height))
    try:
        pic._element._nvXxPr.cNvPr.set("descr", ORNAMENT_TAG)
    except Exception:
        pass
    return pic


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
    log = {"ph": 0, "rule": 0, "layout": 0}

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

    #   ── ornament — 장마다 가로선 둘과 제목 밑줄 하나
    for slide in prs.slides:
        add_rule(slide.shapes, hr, L, int(PX["line_top"] * px2emu), W, lh)
        add_rule(slide.shapes, hr, L, int(PX["line_bottom"] * px2emu), W, lh)
        log["rule"] += 2
        #   제목 밑줄은 **그 장의 제목 상자 맨 아래**다(CSS `::after { bottom: 0 }`).
        #   표지·섹션 진입은 제목이 세로 가운데라 밑줄이 글자 한복판을 지나므로 뺀다.
        if slide.slide_layout.name in BODY_LAYOUTS:
            ttl = next((sh for sh in slide.shapes
                        if sh.has_text_frame and sh.name.startswith("Title")), None)
            if ttl is not None and ttl.text_frame.text.strip():
                add_rule(slide.shapes, hr, ttl.left,
                         ttl.top + ttl.height - lh, ttl.width, lh)
                log["rule"] += 1
    prs.save(a.pptx)
    print("  lane T 장식 — 가로선·밑줄 %d개 (장 %d)"
          % (log["rule"], len(prs.slides._sldIdLst)), file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
