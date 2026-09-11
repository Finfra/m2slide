"""pptx 스크립트들이 함께 쓰는 아주 작은 헬퍼 (Issue354).

왜 따로 있나
------------
**PowerPoint 로 열어 저장한 파일**은 수식(OMML)이 든 본문 도형을
`mc:AlternateContent/mc:Choice` 로 감싼다. python-pptx 의 `slide.shapes` 는 그 안을
보지 않으므로, 우리가 만든 pptx 를 사람이 한 번 저장하고 나면 **그 장의 본문이
없는 것처럼** 읽힌다(실측 2026-09-11, aTest p4 — 사용자 편집본에서 본문 shape 0개).
왕복·전수 대조·시각 축이 전부 `slide.shapes` 를 쓰고 있었으므로 한 곳에서 고친다.

`m2slide:ornament` 표식 규약도 여기가 정본이다 — lane T 가 심고, 역변환·대조기가 거른다.
"""
from pptx.oxml.ns import qn

ORNAMENT_TAG = "m2slide:ornament"
_MC = "http://schemas.openxmlformats.org/markup-compatibility/2006"
_P = "http://schemas.openxmlformats.org/presentationml/2006/main"


def iter_shapes(slide):
    """`slide.shapes` + `mc:AlternateContent/mc:Choice` 안의 도형까지 문서 순서대로."""
    from pptx.shapes.shapetree import SlideShapeFactory
    #   ⚠️ 중복 제거용 `seen = {id(child)}` 를 두면 안 된다 — lxml 프록시는 루프마다
    #      새로 만들어지고 `id()` 가 재사용되어 **엉뚱한 도형을 "본 것"으로 건너뛴다**
    #      (실측 2026-09-11: 가로선 17개 중 12개만 세었다). 자식은 원래 중복이 없다.
    tree = slide.shapes._spTree
    for child in tree.iterchildren():
        tag = child.tag
        if tag == "{%s}AlternateContent" % _MC:
            choice = child.find("{%s}Choice" % _MC)
            if choice is None:
                continue
            for sp in choice.iterchildren():
                if sp.tag in (qn("p:sp"), qn("p:pic"), qn("p:graphicFrame"),
                              qn("p:grpSp"), qn("p:cxnSp")):
                    yield SlideShapeFactory(sp, slide.shapes)
        elif tag in (qn("p:sp"), qn("p:pic"), qn("p:graphicFrame"),
                     qn("p:grpSp"), qn("p:cxnSp")):
            yield SlideShapeFactory(child, slide.shapes)


def descr(shape):
    el = shape._element.find(".//{%s}cNvPr" % _P)
    return (el.get("descr") or "") if el is not None else ""


def is_ornament(shape):
    return descr(shape).startswith(ORNAMENT_TAG)


def set_descr(shape, value):
    el = shape._element.find(".//{%s}cNvPr" % _P)
    if el is not None:
        el.set("descr", value)
