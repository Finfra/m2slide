#!/usr/bin/env python3
"""lane S — 복원 신호를 pptx **안에** 심는다 (Issue342).

왜
--
`::: htmlart pie`·`#id-*`·`{.fragment}`·frontmatter 는 pptx 에 대응 어휘가 없어
변환 중에 사라진다. 실측(aTest, 2026-09-09) 왕복에서 종류 없는 평문 불릿과
빈 frontmatter 로 돌아왔고, 검증 3종은 그것을 보지 않았다.

심는 자리 — 둘 다 pptx **표준 필드**다
--------------------------------------
    도형 alt-text (`p:cNvPr/@descr`)   슬라이드 단위 신호
    docProps/custom.xml                문서 단위 신호 (frontmatter)

* **화면에 보이지 않는다.** 슬라이드쇼·인쇄·발표자 보기 어디에도 나오지 않는다
* **편집에 살아남는다.** PowerPoint 로 열어 고치고 저장해도 유지된다
* **도형과 함께 이동한다.** 장을 재정렬해도 표식이 따라간다

발표자 노트를 쓰지 않은 이유는 그 자리가 **사람의 글**이기 때문이다 — m2slide 는
노트를 실제 콘텐츠(`_note.md`)로 쓰고, 기계 표식을 섞으면 발표 중에 보인다.

⚠️ 원고를 통째로 심지 않는다. 심는 것은 **구조 표식**뿐이다 — 문장·수치·이미지는
   pptx 본문이 이미 갖고 있고, 원본을 복사해 두면 그것을 꺼내는 것은 복원이 아니라
   추출이 된다. 왕복이 얼마나 충실한지를 재려면 신호가 **최소**여야 한다.

사용
----
    lane-s.py <pptx> <lane-s.json>
"""
import json
import os
import re
import shutil
import sys
import zipfile

from lxml import etree

P = "http://schemas.openxmlformats.org/presentationml/2006/main"
A = "http://schemas.openxmlformats.org/drawingml/2006/main"
CP = "http://schemas.openxmlformats.org/officeDocument/2006/custom-properties"
VT = "http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"
CT = "http://schemas.openxmlformats.org/package/2006/content-types"
REL = "http://schemas.openxmlformats.org/package/2006/relationships"
FMTID = "{D5CDD505-2E9C-101B-9397-08002B2CF9AE}"
PREFIX = "m2slide:"
CHUNK = 200          # lpwstr 한 개에 담을 길이 — PowerPoint UI 편집 시 잘리지 않게


def norm(s):
    s = re.sub(r"\*\*|__|`", "", s or "")
    return re.sub(r"\s+", " ", s).strip()


def stamp_slides(prs, slides_sig, stat):
    """제목이 같은 장을 순번으로 갈라 신호를 제목 도형 alt-text 에 적는다.

    lane B 병합과 **같은 매칭 규칙**(제목 + 동명 순번)이다 — 규칙이 갈리면
    같은 원고를 두 단계가 서로 다른 장으로 읽는다.
    """
    by_key = {}
    for sig in slides_sig:
        by_key[(norm(sig["title"]), sig.get("ord", 0))] = sig
    seen = {}
    for slide in prs.slides:
        title = None
        title_el = None
        for sh in slide.shapes:
            if sh.has_text_frame and sh.name.startswith("Title"):
                title = norm(sh.text_frame.text)
                title_el = sh
                break
        if not title:
            continue
        o = seen.get(title, 0)
        seen[title] = o + 1
        sig = by_key.get((title, o))
        if not sig:
            continue
        payload = {k: v for k, v in sig.items()
                   if k not in ("src", "title", "ord")}
        if not payload:
            continue
        cNvPr = title_el._element.find(".//{%s}cNvPr" % P)
        if cNvPr is None:
            continue
        cNvPr.set("descr", PREFIX + json.dumps(payload, ensure_ascii=False,
                                               separators=(",", ":")))
        stat["slides"] += 1
        stat["signals"] += sum(len(v) for v in payload.values() if isinstance(v, list))


def custom_xml(props):
    root = etree.Element("{%s}Properties" % CP, nsmap={None: CP, "vt": VT})
    pid = 2
    for name, value in props:
        p = etree.SubElement(root, "{%s}property" % CP)
        p.set("fmtid", FMTID)
        p.set("pid", str(pid))
        p.set("name", name)
        t = etree.SubElement(p, "{%s}lpwstr" % VT)
        t.text = value
        pid += 1
    return etree.tostring(root, xml_declaration=True, encoding="UTF-8",
                          standalone=True)


def stamp_document(path, frontmatter, stat):
    """frontmatter 를 `docProps/custom.xml` 에 넣는다 — pptx 를 다시 묶는다.

    python-pptx 는 core 속성만 다루므로 패키지를 직접 손본다. 길이가 긴 값은
    `name.0`·`name.1` 로 쪼갠다 — 한 property 에 몰아 넣으면 PowerPoint UI 에서
    편집할 때 잘리는 사례가 있다.
    """
    if not frontmatter:
        return
    blob = json.dumps(frontmatter, ensure_ascii=False, separators=(",", ":"))
    chunks = [blob[i:i + CHUNK] for i in range(0, len(blob), CHUNK)]
    props = [("%sfrontmatter.%d" % (PREFIX, i), c) for i, c in enumerate(chunks)]
    props.append(("%sfrontmatter.n" % PREFIX, str(len(chunks))))

    tmp = path + ".tmp"
    with zipfile.ZipFile(path) as zin, \
            zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == "[Content_Types].xml":
                root = etree.fromstring(data)
                if not any(o.get("PartName") == "/docProps/custom.xml"
                           for o in root.findall("{%s}Override" % CT)):
                    o = etree.SubElement(root, "{%s}Override" % CT)
                    o.set("PartName", "/docProps/custom.xml")
                    o.set("ContentType", "application/vnd.openxmlformats-"
                                         "officedocument.custom-properties+xml")
                data = etree.tostring(root, xml_declaration=True,
                                      encoding="UTF-8", standalone=True)
            elif item.filename == "_rels/.rels":
                root = etree.fromstring(data)
                if not any(r.get("Target") == "docProps/custom.xml"
                           for r in root.findall("{%s}Relationship" % REL)):
                    ids = [r.get("Id") for r in root]
                    n = 1
                    while ("rId%d" % n) in ids:
                        n += 1
                    r = etree.SubElement(root, "{%s}Relationship" % REL)
                    r.set("Id", "rId%d" % n)
                    r.set("Type", "http://schemas.openxmlformats.org/officeDocument"
                                  "/2006/relationships/custom-properties")
                    r.set("Target", "docProps/custom.xml")
                data = etree.tostring(root, xml_declaration=True,
                                      encoding="UTF-8", standalone=True)
            elif item.filename == "docProps/custom.xml":
                continue                       # 지난 실행의 것은 새로 쓴다
            zout.writestr(item, data)
        zout.writestr("docProps/custom.xml", custom_xml(props))
    shutil.move(tmp, path)
    stat["fm"] = len(frontmatter)


def main():
    if len(sys.argv) < 3:
        sys.exit("사용: lane-s.py <pptx> <lane-s.json>")
    pptx, sidecar = sys.argv[1], sys.argv[2]
    if not os.path.isfile(pptx):
        sys.exit("[lane-s] pptx 없음: %s" % pptx)
    if not os.path.isfile(sidecar):
        print("  ℹ️ lane S 사이드카 없음 — 신호 미기입", file=sys.stderr)
        return 0

    data = json.load(open(sidecar, encoding="utf-8"))
    stat = {"slides": 0, "signals": 0, "fm": 0}

    try:
        from pptx import Presentation
        prs = Presentation(pptx)
        stamp_slides(prs, data.get("slides") or [], stat)
        prs.save(pptx)
        stamp_document(pptx, data.get("frontmatter") or {}, stat)
    except Exception as exc:
        # 신호는 **덧칠**이다 — 실패해도 덱은 그대로다. 다만 조용히 넘기지 않는다
        print("  ⚠️ lane S 실패 — 왕복 복원 신호 없이 진행 (%s)" % exc, file=sys.stderr)
        return 0

    print("  lane S 신호 기입 — 장 %d · 표식 %d · frontmatter %d 필드"
          % (stat["slides"], stat["signals"], stat["fm"]), file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
