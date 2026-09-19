#!/usr/bin/env python3
"""SmartArt(DrawingML diagram) 쓰기 — htmlArt 를 **그 원형**으로 되돌린다 (Issue357).

htmlArt 는 애초에 PowerPoint SmartArt 를 본떠 만든 어휘다(`data/htmlart/smartart-catalog.yml`,
역방향 `data/ppt2m2slide/mappings.yml` 은 "Basic Process" → process 로 읽는다). 그러므로
정방향의 정본 대응은 도형 근사(lane B, ppt-info `cards`+`flow_arrow`)가 아니라 SmartArt
그 자체다 — PowerPoint 에서 **SmartArt 로 편집**되고, 역변환이 데이터 모델을 읽어 원고로
되돌린다.

pptx 의 SmartArt 는 파트 다섯이다:

    data      dgm:dataModel — 노드·연결(원고의 항목/하위) + 프레젠테이션 포인트
    layout    dgm:layoutDef — 레이아웃 알고리즘 (`process1` = Basic Process)
    quickStyle dgm:styleDef
    colors    dgm:colorsDef
    drawing   dsp:drawing   — **캐시**. PowerPoint 는 편집 전까지 이것을 그대로 보여 준다

layout·colors·style 정의는 PowerPoint 앱이 자원으로 갖고 있다(`SmartArt.framework`
`lo/*.glo`·`cs/*.gcs`·`qs/*.gqs` — SmartArt 를 담은 모든 pptx 에 같은 XML 이 그대로
들어간다). 캐시(drawing)는 우리가 **HTML 실측 기하로** 그린다 — 그래서 열자마자 HTML 과
같은 꼴이고, 사용자가 손대는 순간부터는 SmartArt 의 규칙(레이아웃 재계산)을 따른다.

python-pptx 는 다이어그램 API 가 없다. 파트는 `pptx.opc` 로 직접 만들어 관계를 맺는다.
"""
import os
import uuid
from xml.sax.saxutils import escape

from lxml import etree

NS = {
    "dgm": "http://schemas.openxmlformats.org/drawingml/2006/diagram",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "dsp": "http://schemas.microsoft.com/office/drawing/2008/diagram",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
}
URN = "urn:microsoft.com/office/officeart/2005/8/"
DIAGRAM_URI = "http://schemas.openxmlformats.org/drawingml/2006/diagram"
CT = {
    "data": "application/vnd.openxmlformats-officedocument.drawingml.diagramData+xml",
    "layout": "application/vnd.openxmlformats-officedocument.drawingml.diagramLayout+xml",
    "style": "application/vnd.openxmlformats-officedocument.drawingml.diagramStyle+xml",
    "colors": "application/vnd.openxmlformats-officedocument.drawingml.diagramColors+xml",
    "drawing": "application/vnd.ms-office.drawingml.diagramDrawing+xml",
}
_RT = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/"
RT = {
    "data": _RT + "diagramData",
    "layout": _RT + "diagramLayout",
    "style": _RT + "diagramQuickStyle",
    "colors": _RT + "diagramColors",
    "drawing": "http://schemas.microsoft.com/office/2007/relationships/diagramDrawing",
}
PARTNAME = {"data": "data", "layout": "layout", "style": "quickStyle",
            "colors": "colors", "drawing": "drawing"}
RES_SUB = {"layout": ("lo", ".glo"), "colors": ("cs", ".gcs"), "style": ("qs", ".gqs")}
CAT = {"layout": "process", "style": "simple", "colors": "accent1"}


def gid():
    return "{%s}" % str(uuid.uuid4()).upper()


def load_resource(res_dir, kind, name):
    """PowerPoint 자원(`.glo`·`.gcs`·`.gqs`)을 pptx 파트 XML 로. 없으면 None."""
    sub, ext = RES_SUB[kind]
    path = os.path.join(res_dir, sub, name + ext)
    if not os.path.isfile(path):
        return None
    parser = etree.XMLParser(remove_comments=True, remove_blank_text=True)
    root = etree.parse(path, parser).getroot()
    if kind == "layout":
        #   앱 자원의 루트 layoutNode 에는 이름이 없다. 프레젠테이션 포인트가 `presName`
        #   으로 이것을 가리키므로 PowerPoint 저장본과 같은 이름(`diagram`)을 준다
        ln = root.find("{%s}layoutNode" % NS["dgm"])
        if ln is not None and not ln.get("name"):
            ln.set("name", "diagram")
    return etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)


# ── HTML renderProcess 의 기하를 그대로 (viewBox 단위 → 캔버스 px) ───────────

def char_em(ch):
    """htmlart_dispatch.client.js `charEm` — 한중일 1em · 그 외 0.58em."""
    cp = ord(ch)
    if cp >= 0x1100 and (cp <= 0x115F or 0x2E80 <= cp <= 0xA4CF or 0xAC00 <= cp <= 0xD7A3
                         or 0xF900 <= cp <= 0xFAFF or 0xFE30 <= cp <= 0xFE4F
                         or 0xFF00 <= cp <= 0xFF60 or cp >= 0x1F000):
        return 1.0
    return 0.58


def longest_token_em(s):
    import re as _re
    toks = [t for t in _re.split(r"[\s·•\-_/|]+", s or "") if t]
    m = 0.58
    for t in toks:
        w = sum(char_em(ch) for ch in t)
        m = max(m, w)
    return m


def title_fs_for(title, w, h, fs_max):
    """`titleFsFor` — 박스 안에 들어가는 제목 글자 크기(viewBox px)."""
    import math
    inner_w = max(w - 32, 40)
    width_cap = math.floor(inner_w / longest_token_em(title))
    fs = min(round(h * 0.30), round(w * 0.21), fs_max, width_cap)
    return 10 if fs < 10 else fs


def process_layout(items, G):
    """renderProcess 와 같은 좌표(viewBox 단위). 반환: (W, H, boxes, arrows, title_fs)."""
    n = len(items)
    bw, bh, gap, pad = G["box_w"], G["box_h"], G["gap"], G["pad_y"]
    W = n * bw + (n - 1) * gap
    H = bh + pad * 2
    boxes = [(i * (bw + gap), pad, bw, bh) for i in range(n)]
    arrows = []
    ar = G["arrow"]
    for i in range(n - 1):
        gx = i * (bw + gap) + bw + gap / 2.0
        cy = pad + bh / 2.0
        arrows.append((gx + ar["dx1"], cy - ar["dy"], gx + ar["dx2"], cy + ar["dy"]))   # bbox
    tfs = min(title_fs_for(it["title"], bw, bh, G["title_fs_max"]) for it in items)
    return W, H, boxes, arrows, tfs


# ── 데이터 모델 ───────────────────────────────────────────────────────────────

def _t(text, lang="ko-KR"):
    if text:
        return ('<dgm:t><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="%s"/>'
                '<a:t>%s</a:t></a:r></a:p></dgm:t>' % (lang, escape(text)))
    return '<dgm:t><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="%s"/></a:p></dgm:t>' % lang


def build_process_model(items, spec, drawing_rid):
    """`process1` 의 데이터 모델. 반환: (xml bytes, ids) — ids 는 캐시가 쓸 pres modelId."""
    lo, qs, cs = spec["layout"], spec["style"], spec["colors"]
    pres_id = URN + "layout/" + lo
    n = len(items)
    DOC = gid()
    pts, cxns = [], []
    pts.append('<dgm:pt modelId="%s" type="doc"><dgm:prSet loTypeId="%s" loCatId="%s" '
               'qsTypeId="%s" qsCatId="%s" csTypeId="%s" csCatId="%s" phldr="0"/>'
               '<dgm:spPr/>%s</dgm:pt>'
               % (DOC, pres_id, CAT["layout"], URN + "quickstyle/" + qs, CAT["style"],
                  URN + "colors/" + cs, CAT["colors"], _t("")))
    node_ids, sib_ids, sub_ids = [], [], []

    def add_node(parent, ord_, text):
        nid, pt_, st_, c_ = gid(), gid(), gid(), gid()
        pts.append('<dgm:pt modelId="%s"><dgm:prSet phldrT="[텍스트]"/><dgm:spPr/>%s</dgm:pt>'
                   % (nid, _t(text)))
        pts.append('<dgm:pt modelId="%s" type="parTrans" cxnId="%s"><dgm:prSet/><dgm:spPr/>%s</dgm:pt>'
                   % (pt_, c_, _t("")))
        pts.append('<dgm:pt modelId="%s" type="sibTrans" cxnId="%s"><dgm:prSet/><dgm:spPr/>%s</dgm:pt>'
                   % (st_, c_, _t("")))
        cxns.append('<dgm:cxn modelId="%s" srcId="%s" destId="%s" srcOrd="%d" destOrd="0" '
                    'parTransId="%s" sibTransId="%s"/>' % (c_, parent, nid, ord_, pt_, st_))
        return nid, st_

    for i, it in enumerate(items):
        nid, st_ = add_node(DOC, i, it["title"])
        node_ids.append(nid)
        sib_ids.append(st_)
        subs = []
        for j, sub in enumerate(it.get("subs") or []):
            sid, _ = add_node(nid, j, sub)
            subs.append(sid)
        sub_ids.append(subs)

    # 프레젠테이션 포인트 — process1 의 layoutNode 트리(diagram → node · sibTrans → connectorText)
    P_DIAG = gid()
    pts.append('<dgm:pt modelId="%s" type="pres"><dgm:prSet presAssocID="%s" presName="diagram" '
               'presStyleCnt="0"><dgm:presLayoutVars><dgm:dir/><dgm:resizeHandles val="exact"/>'
               '</dgm:presLayoutVars></dgm:prSet><dgm:spPr/></dgm:pt>' % (P_DIAG, DOC))
    p_nodes, p_sibs, p_conns = [], [], []
    for i in range(n):
        pn = gid()
        p_nodes.append(pn)
        pts.append('<dgm:pt modelId="%s" type="pres"><dgm:prSet presAssocID="%s" presName="node" '
                   'presStyleLbl="node1" presStyleIdx="%d" presStyleCnt="%d"><dgm:presLayoutVars>'
                   '<dgm:bulletEnabled val="1"/></dgm:presLayoutVars></dgm:prSet><dgm:spPr/></dgm:pt>'
                   % (pn, node_ids[i], i, n))
        if i < n - 1:
            ps, pc = gid(), gid()
            p_sibs.append(ps)
            p_conns.append(pc)
            pts.append('<dgm:pt modelId="%s" type="pres"><dgm:prSet presAssocID="%s" presName="sibTrans" '
                       'presStyleLbl="sibTrans2D1" presStyleIdx="%d" presStyleCnt="%d"/><dgm:spPr/></dgm:pt>'
                       % (ps, sib_ids[i], i, n - 1))
            pts.append('<dgm:pt modelId="%s" type="pres"><dgm:prSet presAssocID="%s" presName="connectorText" '
                       'presStyleLbl="sibTrans2D1" presStyleIdx="%d" presStyleCnt="%d"/><dgm:spPr/></dgm:pt>'
                       % (pc, sib_ids[i], i, n - 1))
    # presOf — 원고 포인트 → 프레젠테이션 포인트
    for i in range(n):
        cxns.append('<dgm:cxn modelId="%s" type="presOf" srcId="%s" destId="%s" srcOrd="0" destOrd="0" '
                    'presId="%s"/>' % (gid(), node_ids[i], p_nodes[i], pres_id))
        for j, sid in enumerate(sub_ids[i]):
            cxns.append('<dgm:cxn modelId="%s" type="presOf" srcId="%s" destId="%s" srcOrd="0" destOrd="%d" '
                        'presId="%s"/>' % (gid(), sid, p_nodes[i], j + 1, pres_id))
        if i < n - 1:
            cxns.append('<dgm:cxn modelId="%s" type="presOf" srcId="%s" destId="%s" srcOrd="0" destOrd="0" '
                        'presId="%s"/>' % (gid(), sib_ids[i], p_sibs[i], pres_id))
            cxns.append('<dgm:cxn modelId="%s" type="presOf" srcId="%s" destId="%s" srcOrd="1" destOrd="0" '
                        'presId="%s"/>' % (gid(), sib_ids[i], p_conns[i], pres_id))
    # presParOf — 프레젠테이션 트리
    k = 0
    for i in range(n):
        cxns.append('<dgm:cxn modelId="%s" type="presParOf" srcId="%s" destId="%s" srcOrd="%d" destOrd="0" '
                    'presId="%s"/>' % (gid(), P_DIAG, p_nodes[i], k, pres_id))
        k += 1
        if i < n - 1:
            cxns.append('<dgm:cxn modelId="%s" type="presParOf" srcId="%s" destId="%s" srcOrd="%d" destOrd="0" '
                        'presId="%s"/>' % (gid(), P_DIAG, p_sibs[i], k, pres_id))
            k += 1
            cxns.append('<dgm:cxn modelId="%s" type="presParOf" srcId="%s" destId="%s" srcOrd="0" destOrd="0" '
                        'presId="%s"/>' % (gid(), p_sibs[i], p_conns[i], pres_id))

    xml = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
           '<dgm:dataModel xmlns:dgm="%s" xmlns:a="%s"><dgm:ptLst>%s</dgm:ptLst>'
           '<dgm:cxnLst>%s</dgm:cxnLst><dgm:bg/><dgm:whole/>'
           '<dgm:extLst><a:ext uri="http://schemas.microsoft.com/office/drawing/2008/diagram">'
           '<dsp:dataModelExt xmlns:dsp="%s" relId="%s" minVer="%s"/></a:ext></dgm:extLst>'
           '</dgm:dataModel>'
           % (NS["dgm"], NS["a"], "".join(pts), "".join(cxns), NS["dsp"], drawing_rid, DIAGRAM_URI))
    return xml.encode("utf-8"), {"nodes": p_nodes, "sibs": p_sibs}


# ── 캐시(drawing) — HTML 꼴 그대로 ───────────────────────────────────────────

_STYLE = ('<dsp:style><a:lnRef idx="2"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef>'
          '<a:fillRef idx="1"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef>'
          '<a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef>'
          '<a:fontRef idx="minor"><a:schemeClr val="tx1"/></a:fontRef></dsp:style>')


def build_process_drawing(items, ids, G, scale, px2emu):
    """dsp:drawing — 상자(roundRect·회색 면·강조색 테두리) + 삼각 화살표. 좌표는 프레임 기준."""
    W, H, boxes, arrows, tfs_vb = process_layout(items, G)
    e = lambda v: int(round(v * scale * px2emu))          # viewBox → EMU
    pt100 = lambda v: int(round(v * scale * px2emu / 12700 * 100))   # viewBox px → sz(1/100pt)
    sps = []
    sub_fs = round(tfs_vb * G["sub_ratio"])
    for i, (bx, by, bw, bh) in enumerate(boxes):
        it = items[i]
        paras = ['<a:p><a:pPr marL="0" lvl="0" indent="0" algn="ctr"><a:lnSpc><a:spcPct val="120000"/></a:lnSpc>'
                 '<a:spcBef><a:spcPct val="0"/></a:spcBef><a:spcAft><a:spcPct val="0"/></a:spcAft><a:buNone/></a:pPr>'
                 '<a:r><a:rPr lang="ko-KR" sz="%d" b="1" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill></a:rPr>'
                 '<a:t>%s</a:t></a:r></a:p>' % (pt100(tfs_vb), escape(it["title"]))]
        for sub in it.get("subs") or []:
            paras.append('<a:p><a:pPr marL="0" lvl="1" indent="0" algn="ctr"><a:lnSpc><a:spcPct val="130000"/></a:lnSpc>'
                         '<a:spcBef><a:spcPts val="%d"/></a:spcBef><a:spcAft><a:spcPct val="0"/></a:spcAft><a:buNone/></a:pPr>'
                         '<a:r><a:rPr lang="ko-KR" sz="%d" b="0" kern="1200"><a:solidFill><a:schemeClr val="tx1">'
                         '<a:alpha val="85000"/></a:schemeClr></a:solidFill></a:rPr><a:t>%s</a:t></a:r></a:p>'
                         % (int(round(3 * scale * px2emu / 12700 * 100)), pt100(sub_fs), escape(sub)))
        adj = int(round(G["radius_vb"] / float(min(bw, bh)) * 100000))
        sps.append(
            '<dsp:sp modelId="%s"><dsp:nvSpPr><dsp:cNvPr id="0" name=""/><dsp:cNvSpPr/></dsp:nvSpPr>'
            '<dsp:spPr><a:xfrm><a:off x="%d" y="%d"/><a:ext cx="%d" cy="%d"/></a:xfrm>'
            '<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val %d"/></a:avLst></a:prstGeom>'
            '<a:solidFill><a:srgbClr val="%s"/></a:solidFill>'
            '<a:ln w="%d" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="accent1"/></a:solidFill>'
            '<a:prstDash val="solid"/></a:ln><a:effectLst/></dsp:spPr>%s'
            '<dsp:txBody><a:bodyPr spcFirstLastPara="0" vert="horz" wrap="square" lIns="%d" tIns="%d" rIns="%d" bIns="%d" '
            'numCol="1" spcCol="1270" anchor="ctr" anchorCtr="0"><a:noAutofit/></a:bodyPr><a:lstStyle/>%s</dsp:txBody>'
            '<dsp:txXfrm><a:off x="%d" y="%d"/><a:ext cx="%d" cy="%d"/></dsp:txXfrm></dsp:sp>'
            % (ids["nodes"][i], e(bx), e(by), e(bw), e(bh), adj, G["fill"], e(G["border_vb"]), _STYLE,
               e(12), e(6), e(12), e(6), "".join(paras), e(bx), e(by), e(bw), e(bh)))
    for i, (x1, y1, x2, y2) in enumerate(arrows):
        #   삼각형 preset 은 꼭짓점이 위다 — 90° 돌려 오른쪽을 향하게 한다. 회전은 중심
        #   기준이므로 회전 전 상자(가로세로 바뀜)를 같은 중심에 놓는다
        w, h = x2 - x1, y2 - y1
        cx, cy = (x1 + x2) / 2.0, (y1 + y2) / 2.0
        sps.append(
            '<dsp:sp modelId="%s"><dsp:nvSpPr><dsp:cNvPr id="0" name=""/><dsp:cNvSpPr/></dsp:nvSpPr>'
            '<dsp:spPr><a:xfrm rot="5400000"><a:off x="%d" y="%d"/><a:ext cx="%d" cy="%d"/></a:xfrm>'
            '<a:prstGeom prst="triangle"><a:avLst/></a:prstGeom>'
            '<a:solidFill><a:srgbClr val="000000"><a:alpha val="%d"/></a:srgbClr></a:solidFill>'
            '<a:ln><a:noFill/></a:ln><a:effectLst/></dsp:spPr>%s</dsp:sp>'
            % (ids["sibs"][i], e(cx - h / 2.0), e(cy - w / 2.0), e(h), e(w), G["arrow"]["alpha"] * 1000, _STYLE))
    xml = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
           '<dsp:drawing xmlns:dsp="%s" xmlns:dgm="%s" xmlns:a="%s"><dsp:spTree>'
           '<dsp:nvGrpSpPr><dsp:cNvPr id="0" name=""/><dsp:cNvGrpSpPr/></dsp:nvGrpSpPr><dsp:grpSpPr/>%s'
           '</dsp:spTree></dsp:drawing>' % (NS["dsp"], NS["dgm"], NS["a"], "".join(sps)))
    return xml.encode("utf-8"), (W, H)


# ── chevron (Basic Chevron Process) ──────────────────────────────────────────
#
#   `renderChevron` 은 갈매기를 **tip 만큼 겹쳐 문다** — i 번째 왼쪽 패인 자리에 i-1
#   번째 화살촉이 들어간다. 그래서 전체 폭이 `N×chW` 가 아니라 `N×chW − (N−1)×tip` 이다.
#   맨 앞은 왼쪽이 평평하므로(`notch=0`) preset 도 다르다 — `homePlate` 대 `chevron`.

def chevron_layout(items, G):
    """renderChevron 과 같은 좌표(viewBox 단위). 반환: (W, H, boxes) · boxes=(x,y,w,h,notch)."""
    n = len(items)
    cw, chh = G["ch_w"], G["ch_h"]
    tip = chh * G["tip_ratio"]
    px, py = G["pad_x"], G["pad_y"]
    W = px * 2 + n * cw - (n - 1) * tip
    H = py * 2 + chh
    boxes = []
    for i in range(n):
        x = px + i * (cw - tip)
        boxes.append((x, py, cw, chh, 0.0 if i == 0 else tip))
    return W, H, boxes, tip


def build_chevron_model(items, spec, drawing_rid):
    """`chevron1` 의 데이터 모델 — **자식 없는 갈래**(`parTxOnly`·`parTxOnlySpace`).

    ⚠️ chevron1 은 `maxDepth val=2` 로 갈래가 갈린다. 자식이 있으면 `composite` 아래
       `parTx`(chevron)+`desTx`(rect) 두 도형이 되는데, HTML 은 갈매기 **하나 안에**
       제목·부제를 함께 넣는다(`centerLabel`). 캐시와 데이터 모델이 어긋나므로 그
       갈래는 만들지 않고 lane B 로 되돌린다(`needs_flat`).
    """
    lo, qs, cs = spec["layout"], spec["style"], spec["colors"]
    pres_id = URN + "layout/" + lo
    n = len(items)
    DOC = gid()
    pts, cxns = [], []
    pts.append('<dgm:pt modelId="%s" type="doc"><dgm:prSet loTypeId="%s" loCatId="%s" '
               'qsTypeId="%s" qsCatId="%s" csTypeId="%s" csCatId="%s" phldr="0"/>'
               '<dgm:spPr/>%s</dgm:pt>'
               % (DOC, pres_id, CAT["layout"], URN + "quickstyle/" + qs, CAT["style"],
                  URN + "colors/" + cs, CAT["colors"], _t("")))
    node_ids, sib_ids = [], []
    for i, it in enumerate(items):
        nid, pt_, st_, c_ = gid(), gid(), gid(), gid()
        pts.append('<dgm:pt modelId="%s"><dgm:prSet phldrT="[텍스트]"/><dgm:spPr/>%s</dgm:pt>'
                   % (nid, _t(it["title"])))
        pts.append('<dgm:pt modelId="%s" type="parTrans" cxnId="%s"><dgm:prSet/><dgm:spPr/>%s</dgm:pt>'
                   % (pt_, c_, _t("")))
        pts.append('<dgm:pt modelId="%s" type="sibTrans" cxnId="%s"><dgm:prSet/><dgm:spPr/>%s</dgm:pt>'
                   % (st_, c_, _t("")))
        cxns.append('<dgm:cxn modelId="%s" srcId="%s" destId="%s" srcOrd="%d" destOrd="0" '
                    'parTransId="%s" sibTransId="%s"/>' % (c_, DOC, nid, i, pt_, st_))
        node_ids.append(nid)
        sib_ids.append(st_)

    P_DIAG = gid()
    pts.append('<dgm:pt modelId="%s" type="pres"><dgm:prSet presAssocID="%s" presName="diagram" '
               'presStyleCnt="0"><dgm:presLayoutVars><dgm:dir/><dgm:resizeHandles val="exact"/>'
               '</dgm:presLayoutVars></dgm:prSet><dgm:spPr/></dgm:pt>' % (P_DIAG, DOC))
    p_nodes, p_spaces = [], []
    for i in range(n):
        pn = gid()
        p_nodes.append(pn)
        pts.append('<dgm:pt modelId="%s" type="pres"><dgm:prSet presAssocID="%s" presName="parTxOnly" '
                   'presStyleLbl="node1" presStyleIdx="%d" presStyleCnt="%d"><dgm:presLayoutVars>'
                   '<dgm:bulletEnabled val="1"/></dgm:presLayoutVars></dgm:prSet><dgm:spPr/></dgm:pt>'
                   % (pn, node_ids[i], i, n))
        if i < n - 1:
            ps = gid()
            p_spaces.append(ps)
            pts.append('<dgm:pt modelId="%s" type="pres"><dgm:prSet presAssocID="%s" '
                       'presName="parTxOnlySpace" presStyleCnt="0"/><dgm:spPr/></dgm:pt>'
                       % (ps, sib_ids[i]))
    for i in range(n):
        cxns.append('<dgm:cxn modelId="%s" type="presOf" srcId="%s" destId="%s" srcOrd="0" destOrd="0" '
                    'presId="%s"/>' % (gid(), node_ids[i], p_nodes[i], pres_id))
        if i < n - 1:
            cxns.append('<dgm:cxn modelId="%s" type="presOf" srcId="%s" destId="%s" srcOrd="0" destOrd="0" '
                        'presId="%s"/>' % (gid(), sib_ids[i], p_spaces[i], pres_id))
    k = 0
    for i in range(n):
        cxns.append('<dgm:cxn modelId="%s" type="presParOf" srcId="%s" destId="%s" srcOrd="%d" destOrd="0" '
                    'presId="%s"/>' % (gid(), P_DIAG, p_nodes[i], k, pres_id))
        k += 1
        if i < n - 1:
            cxns.append('<dgm:cxn modelId="%s" type="presParOf" srcId="%s" destId="%s" srcOrd="%d" destOrd="0" '
                        'presId="%s"/>' % (gid(), P_DIAG, p_spaces[i], k, pres_id))
            k += 1

    xml = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
           '<dgm:dataModel xmlns:dgm="%s" xmlns:a="%s"><dgm:ptLst>%s</dgm:ptLst>'
           '<dgm:cxnLst>%s</dgm:cxnLst><dgm:bg/><dgm:whole/>'
           '<dgm:extLst><a:ext uri="http://schemas.microsoft.com/office/drawing/2008/diagram">'
           '<dsp:dataModelExt xmlns:dsp="%s" relId="%s" minVer="%s"/></a:ext></dgm:extLst>'
           '</dgm:dataModel>'
           % (NS["dgm"], NS["a"], "".join(pts), "".join(cxns), NS["dsp"], drawing_rid, DIAGRAM_URI))
    return xml.encode("utf-8"), {"nodes": p_nodes, "sibs": p_spaces}


def build_chevron_drawing(items, ids, G, scale, px2emu):
    """dsp:drawing — 갈매기 preset. 맨 앞은 `homePlate`(왼쪽 평평), 나머지는 `chevron`."""
    W, H, boxes, tip = chevron_layout(items, G)
    n = len(items)
    e = lambda v: int(round(v * scale * px2emu))
    pt100 = lambda v: int(round(v * scale * px2emu / 12700 * 100))
    base = G.get("opacity_base", 0.6)
    sps = []
    for i, (bx, by, bw, bh, notch) in enumerate(boxes):
        it = items[i]
        alpha = base + (1.0 - base) * (i / float(max(n - 1, 1)))
        paras = ['<a:p><a:pPr marL="0" lvl="0" indent="0" algn="ctr"><a:lnSpc><a:spcPct val="120000"/></a:lnSpc>'
                 '<a:spcBef><a:spcPct val="0"/></a:spcBef><a:spcAft><a:spcPct val="0"/></a:spcAft><a:buNone/></a:pPr>'
                 '<a:r><a:rPr lang="ko-KR" sz="%d" b="1" kern="1200"><a:solidFill><a:srgbClr val="FFFFFF"/>'
                 '</a:solidFill></a:rPr><a:t>%s</a:t></a:r></a:p>'
                 % (pt100(G["title_fs"]), escape(it["title"]))]
        #   화살촉 깊이는 **짧은 변** 기준이다 — chevron/homePlate 의 adj 규약
        adj = int(round(tip / float(min(bw, bh)) * 100000))
        prst = "homePlate" if i == 0 else "chevron"
        #   글자는 갈매기의 **평행사변형 속살**에만 놓는다 (HTML centerLabel 과 같은 상자)
        tx, tw = bx + notch, bw - tip - notch
        sps.append(
            '<dsp:sp modelId="%s"><dsp:nvSpPr><dsp:cNvPr id="0" name=""/><dsp:cNvSpPr/></dsp:nvSpPr>'
            '<dsp:spPr><a:xfrm><a:off x="%d" y="%d"/><a:ext cx="%d" cy="%d"/></a:xfrm>'
            '<a:prstGeom prst="%s"><a:avLst><a:gd name="adj" fmla="val %d"/></a:avLst></a:prstGeom>'
            '<a:solidFill><a:schemeClr val="accent1"><a:alpha val="%d"/></a:schemeClr></a:solidFill>'
            '<a:ln w="%d" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>'
            '<a:prstDash val="solid"/></a:ln><a:effectLst/></dsp:spPr>%s'
            '<dsp:txBody><a:bodyPr spcFirstLastPara="0" vert="horz" wrap="square" lIns="%d" tIns="%d" '
            'rIns="%d" bIns="%d" numCol="1" spcCol="1270" anchor="ctr" anchorCtr="0"><a:noAutofit/></a:bodyPr>'
            '<a:lstStyle/>%s</dsp:txBody>'
            '<dsp:txXfrm><a:off x="%d" y="%d"/><a:ext cx="%d" cy="%d"/></dsp:txXfrm></dsp:sp>'
            % (ids["nodes"][i], e(bx), e(by), e(bw), e(bh), prst, adj, int(round(alpha * 100000)),
               e(2), _STYLE, e(6), e(6), e(6), e(6), "".join(paras),
               e(tx), e(by), e(max(tw, 20)), e(bh)))
    xml = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
           '<dsp:drawing xmlns:dsp="%s" xmlns:dgm="%s" xmlns:a="%s"><dsp:spTree>'
           '<dsp:nvGrpSpPr><dsp:cNvPr id="0" name=""/><dsp:cNvGrpSpPr/></dsp:nvGrpSpPr><dsp:grpSpPr/>%s'
           '</dsp:spTree></dsp:drawing>' % (NS["dsp"], NS["dgm"], NS["a"], "".join(sps)))
    return xml.encode("utf-8"), (W, H)


#   레이아웃 → (데이터 모델 빌더, 캐시 빌더). 새 종류는 여기 한 줄로 붙는다
BUILDERS = {
    "process1": (build_process_model, build_process_drawing),
    "chevron1": (build_chevron_model, build_chevron_drawing),
}


# ── 패키지에 심기 ─────────────────────────────────────────────────────────────

def _next_index(pkg):
    names = {str(p.partname) for p in pkg.iter_parts()}
    n = 1
    while any("/ppt/diagrams/%s%d.xml" % (PARTNAME[k], n) in names for k in PARTNAME):
        n += 1
    return n


def insert_process(slide, prs, items, spec, G, art, px2emu, res_dir, descr="m2slide:content/smartart"):
    """htmlArt 항목을 SmartArt 로 그 장에 심는다 — 레이아웃은 `spec["layout"]` 이 정한다.

    art  = {l, t, w, h} 캔버스 px — HTML 의 htmlArt 상자. svg 는 그 안에 `viewBox`
           비율을 지켜(letterbox) 가운데 놓이므로 프레임도 그렇게 잡는다.
    반환: 프레임(px) dict. 자원이 없거나 레이아웃을 모르면 None(호출자가 lane B 로 되돌린다).

    ⚠️ 이름은 `insert_process` 로 남겨 둔다 — lane-g 가 그 이름으로 부른다. 하는 일은
       레이아웃 디스패치다(`BUILDERS`).
    """
    from pptx.opc.package import Part
    from pptx.opc.packuri import PackURI
    blobs = {}
    for kind in ("layout", "colors", "style"):
        b = load_resource(res_dir, kind, spec[kind])
        if b is None:
            return None
        blobs[kind] = b
    builders = BUILDERS.get(spec["layout"])
    if builders is None:
        return None                      # 모르는 레이아웃 — 근사하지 않고 lane B 로 넘긴다
    build_model, build_drawing = builders
    if spec["layout"] == "chevron1":
        W, H, _, _ = chevron_layout(items, G)
    else:
        W, H, _, _, _ = process_layout(items, G)
    scale = min(art["w"] / float(W), art["h"] / float(H))
    fx = art["l"] + (art["w"] - W * scale) / 2.0
    fy = art["t"] + (art["h"] - H * scale) / 2.0

    pkg = prs.part.package
    n = _next_index(pkg)

    def mk(kind, blob):
        return Part(PackURI("/ppt/diagrams/%s%d.xml" % (PARTNAME[kind], n)), CT[kind], pkg, blob)

    data = mk("data", b"")
    drawing = mk("drawing", b"")
    #   ⚠️ 캐시(drawing) 관계는 **슬라이드 파트**에 둔다 — `dsp:dataModelExt@relId` 는 슬라이드
    #      rels 의 id 다(PowerPoint 저장본 실측: `ppt/diagrams/_rels/` 는 없고 slide rels 에
    #      `diagramDrawing` rId10). data 파트에 걸면 LibreOffice 가 캐시를 못 찾아 **빈 그룹**
    #      으로 들여온다(실측 2026-09-11 A/B — 관계 위치만 옮기자 그려졌다)
    rid_dr = slide.part.relate_to(drawing, RT["drawing"])
    data_xml, ids = build_model(items, spec, rid_dr)
    drawing_xml, _ = build_drawing(items, ids, G, scale, px2emu)
    data._blob = data_xml
    drawing._blob = drawing_xml
    parts = {"data": data, "layout": mk("layout", blobs["layout"]),
             "style": mk("style", blobs["style"]), "colors": mk("colors", blobs["colors"])}
    rids = {k: slide.part.relate_to(p, RT[k]) for k, p in parts.items()}

    sid = slide.shapes._next_shape_id
    gf = etree.fromstring(
        '<p:graphicFrame xmlns:p="%s" xmlns:a="%s" xmlns:r="%s" xmlns:dgm="%s">'
        '<p:nvGraphicFramePr><p:cNvPr id="%d" name="Diagram %d" descr="%s"/>'
        '<p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr>'
        '<p:xfrm><a:off x="%d" y="%d"/><a:ext cx="%d" cy="%d"/></p:xfrm>'
        '<a:graphic><a:graphicData uri="%s"><dgm:relIds r:dm="%s" r:lo="%s" r:qs="%s" r:cs="%s"/>'
        '</a:graphicData></a:graphic></p:graphicFrame>'
        % (NS["p"], NS["a"], NS["r"], NS["dgm"], sid, sid, escape(descr),
           int(fx * px2emu), int(fy * px2emu), int(W * scale * px2emu), int(H * scale * px2emu),
           DIAGRAM_URI, rids["data"], rids["layout"], rids["style"], rids["colors"]))
    slide.shapes._spTree.append(gf)
    return {"l": fx, "t": fy, "w": W * scale, "h": H * scale, "scale": scale}


# ── 읽기 — 역변환·대조기가 쓴다 ───────────────────────────────────────────────

def read_diagram(shape, slide):
    """graphicFrame 이 SmartArt 면 (layout 이름, [{title, subs}]) 를, 아니면 None."""
    gd = shape._element.find(".//{%s}graphicData" % NS["a"])
    if gd is None or gd.get("uri") != DIAGRAM_URI:
        return None
    rel = gd.find("{%s}relIds" % NS["dgm"])
    if rel is None:
        return None
    rid = rel.get("{%s}dm" % NS["r"])
    try:
        part = slide.part.related_part(rid)
    except Exception:
        return None
    root = etree.fromstring(part.blob)
    D, A = NS["dgm"], NS["a"]
    pts = {pt.get("modelId"): pt for pt in root.findall("{%s}ptLst/{%s}pt" % (D, D))}
    doc = next((k for k, v in pts.items() if v.get("type") == "doc"), None)
    if doc is None:
        return None
    pr = pts[doc].find("{%s}prSet" % D)
    layout = (pr.get("loTypeId") if pr is not None else "") or ""
    layout = layout.rsplit("/", 1)[-1]
    kids = {}
    for c in root.findall("{%s}cxnLst/{%s}cxn" % (D, D)):
        if c.get("type", "parOf") == "parOf":
            kids.setdefault(c.get("srcId"), []).append((int(c.get("srcOrd") or 0), c.get("destId")))

    def text(pid):
        pt = pts.get(pid)
        if pt is None:
            return ""
        return " ".join((t.text or "") for t in pt.findall(".//{%s}t" % A)).strip()

    items = []
    for _, nid in sorted(kids.get(doc, [])):
        items.append({"title": text(nid), "subs": [text(s) for _, s in sorted(kids.get(nid, []))]})
    return layout, items
