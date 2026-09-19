#!/usr/bin/env python3
"""lane G — htmlArt 를 **SmartArt** 로 (Issue357).

lane B 가 정형 블록을 ppt-info 도형으로 근사한다면, lane G 는 htmlArt 를 **그 원형인
SmartArt** 로 되돌린다. 대상은 build-source ⑫ 가 `_pipeline/pptx/lane-b.json` 에
`lane: "g"` 로 적어 둔 블록이고, 무엇을 어느 레이아웃으로 그릴지는 transform.yml
`smartart.catalog` 가 정한다.

    사용: lane-g.py <project_dir> <out.pptx>

* PowerPoint 앱 자원(레이아웃·색·스타일 정의)이 없는 기계에서는 그 대상을 lane B 로
  되돌린다(`lane: "b"`, kind = 카탈로그의 `fallback`) — 그래서 **lane B 보다 먼저** 돈다
* 본문 문단 대조·제거는 lane B 와 같은 규칙(`trim_body`)이다 — 사이드카의 문단 목록이
  pptx 본문의 **끝**과 일치할 때만 지운다
* 실패해도 빌드를 죽이지 않는다 — 그 장은 평문 불릿으로 남고 stderr 로 알린다
"""
import argparse
import importlib.util
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def _load(name, fn):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, fn))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


laneb = _load("laneb", "lane-b.py")
smartart = _load("smartart", "smartart.py")


def warn(msg):
    print("  ⚠️ lane G — %s" % msg, file=sys.stderr)


def policy():
    import yaml
    p = os.path.join(HERE, "..", "..", "data", "m2slide2ppt", "transform.yml")
    d = yaml.safe_load(open(p, encoding="utf-8")) or {}
    return d.get("smartart") or {}, d.get("theme_geometry") or {}


def main():
    ap = argparse.ArgumentParser(description="lane G — htmlArt 를 SmartArt 로")
    ap.add_argument("project_dir")
    ap.add_argument("out_pptx")
    ap.add_argument("--canvas-px", default="1920x1280")
    a = ap.parse_args()

    proj = os.path.abspath(a.project_dir)
    work = os.path.join(proj, "_pipeline", "pptx")
    sidecar = os.path.join(work, "lane-b.json")
    if not os.path.isfile(sidecar):
        return 0
    with open(sidecar, encoding="utf-8") as f:
        side = json.load(f)
    targets = [t for t in side.get("targets", []) if t.get("lane") == "g"]
    if not targets:
        return 0

    pol, geo = policy()
    catalog = pol.get("catalog") or {}
    res_dir = pol.get("resources") or ""

    def fall_back(reason):
        #   자원이 없으면 lane B 가 이어받는다 — 사이드카를 고쳐 두면 lane B 가 그대로 읽는다
        for t in targets:
            spec = catalog.get(t.get("raw"), {})
            t["lane"] = "b"
            t["kind"] = spec.get("fallback", "process")
        with open(sidecar, "w", encoding="utf-8") as f:
            json.dump(side, f, ensure_ascii=False, indent=2)
        warn("%s — %d장을 lane B 로 되돌린다" % (reason, len(targets)))
        return 0

    if not os.path.isdir(res_dir):
        return fall_back("SmartArt 정의 자원이 없다(%s)" % res_dir)
    try:
        from pptx import Presentation
    except ImportError:
        return fall_back("python-pptx 가 없다")

    prs = Presentation(a.out_pptx)
    cw = int(a.canvas_px.lower().split("x")[0])
    px2emu = prs.slide_width / float(cw)
    slides = list(prs.slides)
    index = {}
    for i, s in enumerate(slides):
        index.setdefault(laneb.slide_title(s) or "", []).append(i)

    done, skipped, demoted = 0, [], 0

    def demote(t, spec, why):
        """이 대상만 lane B 로 되돌린다 — 뒤에 도는 lane B 가 사이드카를 그대로 읽는다."""
        nonlocal demoted
        t["lane"] = "b"
        t["kind"] = (spec or {}).get("fallback", "process")
        demoted += 1
        skipped.append(why)

    for t in targets:
        title, label = laneb.norm(t["title"]), "%s / %s" % (t.get("src", "?"), t["title"][:28])
        spec = catalog.get(t.get("raw"))
        if not spec:
            skipped.append("%s — 카탈로그에 없다(%r)" % (label, t.get("raw")))
            continue
        #   ⚠️ 하위 항목이 있으면 레이아웃 갈래가 달라지는 종류가 있다(chevron1 의
        #      `composite`+`desTx`). 검증되지 않은 갈래를 **근사하지 않고** 되돌린다
        if spec.get("needs_flat") and any(it.get("subs") for it in t["items"]):
            demote(t, spec, "%s — 하위 항목이 있어 lane B 로 (레이아웃 갈래 미지원)" % label)
            continue
        cand = index.get(title, [])
        if t["ord"] >= len(cand):
            skipped.append("%s — 제목 대조 실패(후보 %d)" % (label, len(cand)))
            continue
        slide = slides[cand[t["ord"]]]
        ph = laneb.body_ph(slide)
        if ph is None:
            skipped.append("%s — 본문 placeholder 없음" % label)
            continue
        keep = laneb.trim_body(ph, t["flat"])
        if keep is None:
            skipped.append("%s — 본문 문단이 사이드카와 다르다(원고 변경?)" % label)
            continue
        G = pol.get(spec.get("geometry") or "process_geometry") or {}
        art = dict(G.get("art") or {"l": 56, "t": 245, "w": 1808, "h": 939})
        if keep:
            #   앞 문단이 남으면 그 아래부터 — 줄 높이는 본문 글자(45.4px) 어림
            lead = len(keep) * 61 + 40
            ph.left, ph.width = int(art["l"] * px2emu), int(art["w"] * px2emu)
            ph.top, ph.height = int(art["t"] * px2emu), int(len(keep) * 61 * px2emu)
            art["t"] += lead
            art["h"] -= lead
        else:
            ph._element.getparent().remove(ph._element)
        frame = smartart.insert_process(slide, prs, t["items"], spec, G, art, px2emu, res_dir)
        if frame is None:
            demote(t, spec, "%s — 자원 부재 또는 미지원 레이아웃(%s)" % (label, spec.get("layout")))
            continue
        done += 1

    prs.save(a.out_pptx)
    if demoted:
        #   개별 강등분을 사이드카에 되적는다 — lane B 가 이어받아 그린다
        with open(sidecar, "w", encoding="utf-8") as f:
            json.dump(side, f, ensure_ascii=False, indent=2)
    print("  lane G SmartArt — %d/%d장%s (%s)"
          % (done, len(targets), (" · lane B 로 %d" % demoted) if demoted else "",
             " · ".join(sorted({t.get("raw", "?") for t in targets}))))
    for s in skipped:
        warn(s)
    return 0


if __name__ == "__main__":
    sys.exit(main())
