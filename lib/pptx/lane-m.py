#!/usr/bin/env python3
"""lane M — 마커 자리에 **네이티브 수식(OMML)** 을 되돌린다 (Issue339).

왜 이 단계가 있나
-----------------
pandoc 3.10 pptx writer 는 Math 인라인을 만나면 그 슬라이드의 콘텐츠 shape 을 **아예
만들지 않는다**. 경고도 rc 도 없다 — 수식 한 개가 같은 장의 불릿·코드까지 데리고
조용히 사라진다(실측 2026-09-09, aTest p05). 그래서 [build-source.py](build-source.py) ⑬
가 수식을 평문 마커로 바꿔 pandoc 을 통과시키고, 이 스크립트가 그 자리를 되메운다.

무엇으로 되메우나 — **그림이 아니라 도형**
-------------------------------------------
`pandoc -o x.docx` 는 같은 LaTeX 를 완전한 OMML(`<m:oMath>`)로 변환한다. 그것을 그대로
pptx 문단에 옮긴다. 추가 의존이 0 이고(pandoc 은 이미 필수), PowerPoint 수식 편집기로
**문구를 그대로 고칠 수 있다** — lane B 가 카드를 도형으로 되돌리는 것과 같은 철학이다.

`mc:AlternateContent` 로 감싸 `mc:Fallback` 에 평문 LaTeX 를 남긴다. 수식을 모르는
뷰어에서도 글자는 보인다 — 백지가 되는 것보다 낫다.

lane A 를 깨지 않는다
---------------------
자산 부재·pandoc 실패·마커 미발견 어느 쪽이든 **그 수식만** 평문 LaTeX 로 되돌리고
rc0 으로 끝난다. 실패는 stderr 로 크게 알린다. lane B 와 같은 계약이다.

사용
----
    lane-m.py <pptx> --sidecar <lane-m.json> [--quiet]
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile

from lxml import etree

A = "http://schemas.openxmlformats.org/drawingml/2006/main"
M = "http://schemas.openxmlformats.org/officeDocument/2006/math"
MC = "http://schemas.openxmlformats.org/markup-compatibility/2006"
A14 = "http://schemas.microsoft.com/office/drawing/2010/main"
W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NS = {"a": A, "m": M, "mc": MC, "a14": A14}

MARKER_RE = re.compile("⟦m2math:(\\d{4})⟧")


def omml_of(latex, display, cache):
    """LaTeX → OMML element. pandoc 의 docx writer 를 수식 변환기로 쓴다."""
    key = (latex, display)
    if key in cache:
        return cache[key]
    src = ("$$%s$$" % latex) if display else ("$%s$" % latex)
    tmp = tempfile.mkdtemp(prefix="lane_m_")
    try:
        md = os.path.join(tmp, "m.md")
        docx = os.path.join(tmp, "m.docx")
        with open(md, "w", encoding="utf-8") as fp:
            fp.write(src + "\n")
        subprocess.run(["pandoc", md, "-o", docx],
                       check=True, capture_output=True)
        with zipfile.ZipFile(docx) as z:
            doc = z.read("word/document.xml")
        root = etree.fromstring(doc)
        #   display 는 `m:oMathPara` 로 감싸 나온다. pptx 문단에서도 그 형태를 쓴다.
        node = root.find(".//m:oMathPara", NS)
        if node is None:
            node = root.find(".//m:oMath", NS)
        if node is None:
            raise ValueError("pandoc docx 에 OMML 이 없다")
        #   워드 전용 잔재(`w:` 서식)를 떼어 낸다 — pptx 스키마에는 없는 어휘다
        for bad in node.findall(".//{%s}rPr" % W):
            bad.getparent().remove(bad)
        cache[key] = node
        return node
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def alt_content(omml, latex):
    """`mc:AlternateContent` — Choice 에 수식, Fallback 에 평문."""
    alt = etree.Element("{%s}AlternateContent" % MC, nsmap={"mc": MC})
    choice = etree.SubElement(alt, "{%s}Choice" % MC,
                              nsmap={"a14": A14})
    choice.set("Requires", "a14")
    m = etree.SubElement(choice, "{%s}m" % A14)
    import copy
    m.append(copy.deepcopy(omml))
    fb = etree.SubElement(alt, "{%s}Fallback" % MC)
    r = etree.SubElement(fb, "{%s}r" % A)
    t = etree.SubElement(r, "{%s}t" % A)
    t.text = latex
    return alt


def patch_paragraph(para, runs_text, items, cache, stat):
    """문단 안의 마커 run 을 OMML 로 바꾼다. 한 문단에 여럿 있어도 순서대로 처리."""
    for run in list(para.findall("{%s}r" % A)):
        t = run.find("{%s}t" % A)
        if t is None or not t.text:
            continue
        if not MARKER_RE.search(t.text):
            continue
        parts = MARKER_RE.split(t.text)
        # parts = [앞, id, 사이, id, …, 뒤]
        idx_in_parent = list(para).index(run)
        rPr = run.find("{%s}rPr" % A)
        new_nodes = []
        import copy
        for k, chunk in enumerate(parts):
            if k % 2 == 0:
                if chunk:
                    r = etree.Element("{%s}r" % A)
                    if rPr is not None:
                        r.append(copy.deepcopy(rPr))
                    tt = etree.SubElement(r, "{%s}t" % A)
                    tt.text = chunk
                    new_nodes.append(r)
                continue
            mid = int(chunk)
            item = items.get(mid)
            if item is None:
                stat["orphan"] += 1
                continue
            try:
                omml = omml_of(item["latex"], item["display"], cache)
                new_nodes.append(alt_content(omml, item["latex"]))
                stat["ok"] += 1
            except Exception as e:                      # noqa: BLE001
                print("  ⚠️ lane M — 수식 %d 변환 실패(%s) → 평문 fallback: %s"
                      % (mid, e, item["latex"]), file=sys.stderr)
                r = etree.Element("{%s}r" % A)
                if rPr is not None:
                    r.append(copy.deepcopy(rPr))
                tt = etree.SubElement(r, "{%s}t" % A)
                tt.text = item["latex"]
                new_nodes.append(r)
                stat["fallback"] += 1
        para.remove(run)
        for off, node in enumerate(new_nodes):
            para.insert(idx_in_parent + off, node)


def main():
    ap = argparse.ArgumentParser(description="lane M — 마커 → 네이티브 OMML")
    ap.add_argument("pptx")
    ap.add_argument("--sidecar", required=True)
    ap.add_argument("--quiet", action="store_true")
    a = ap.parse_args()

    if not os.path.isfile(a.pptx):
        sys.exit("[lane-m] pptx 없음: %s" % a.pptx)
    if not os.path.isfile(a.sidecar):
        # 사이드카 부재는 "수식 없음" 과 다르다 — 앞단이 안 돌았다는 뜻이므로 알린다
        print("  ⚠️ lane M — 사이드카 없음, 건너뜀: %s" % a.sidecar, file=sys.stderr)
        return 0
    data = json.load(open(a.sidecar, encoding="utf-8"))
    items = {int(it["id"]): it for it in data.get("items", [])}
    if not items:
        if not a.quiet:
            print("  lane M — 수식 0건", file=sys.stderr)
        return 0

    stat = {"ok": 0, "fallback": 0, "orphan": 0, "slides": 0}
    cache = {}

    tmp = tempfile.mkdtemp(prefix="lane_m_pkg_")
    try:
        with zipfile.ZipFile(a.pptx) as z:
            names = z.namelist()
            z.extractall(tmp)
        slides = sorted(n for n in names
                        if re.match(r"ppt/slides/slide\d+\.xml$", n))
        for name in slides:
            path = os.path.join(tmp, name)
            raw = open(path, "rb").read()
            if b"m2math:" not in raw:
                continue
            root = etree.fromstring(raw)
            for para in root.findall(".//{%s}p" % A):
                patch_paragraph(para, None, items, cache, stat)
            open(path, "wb").write(
                etree.tostring(root, xml_declaration=True,
                               encoding="UTF-8", standalone=True))
            stat["slides"] += 1

        out = a.pptx + ".lanem"
        with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
            for name in names:                  # 원본 순서를 지킨다
                z.write(os.path.join(tmp, name), name)
        os.replace(out, a.pptx)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    if not a.quiet:
        print("  lane M 수식 복원 — OMML %d · 평문 fallback %d · 미매칭 %d (장 %d)"
              % (stat["ok"], stat["fallback"], stat["orphan"], stat["slides"]),
              file=sys.stderr)
    if stat["orphan"]:
        print("  ⚠️ lane M — 마커가 남았거나 사이드카와 어긋난 수식 %d건"
              % stat["orphan"], file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
