#!/usr/bin/env python3
"""PDF 에서 탐침 문자열을 찾아 **CSS px 환산 폰트 크기 + 정규화 x** 를 낸다 (Issue413).

3경로 대조(`2.tripath`)의 ②③ 측정부. ①(화면)은 ego 가 같은 좌표계로 잰다.

환산: PDF 페이지는 pt, 덱은 CSS px 이므로 `size_pt × (덱폭px / 페이지폭pt)`.
      1920px 덱이 1440pt 페이지로 나오면 계수는 1.333 (= 1/0.75).
"""
import json
import sys


def main(argv):
    if len(argv) < 3:
        print("usage: probe_pdf.py <pdf> <탐침문자열> <덱폭px> [페이지번호]", file=sys.stderr)
        return 2
    path, needle, deck_w = argv[0], argv[1], float(argv[2])
    only = int(argv[3]) if len(argv) > 3 else None
    try:
        import fitz
    except ImportError:
        print(json.dumps({"skip": "PyMuPDF 미설치"}))
        return 0
    doc = fitz.open(path)
    pages = [only - 1] if only else range(doc.page_count)
    for i in pages:
        p = doc[i]
        W, H = p.rect.width, p.rect.height
        k = deck_w / W                       # pt → CSS px
        for b in p.get_text("dict")["blocks"]:
            for l in b.get("lines", []):
                for s in l["spans"]:
                    if needle in s["text"]:
                        x0, y0 = s["bbox"][0], s["bbox"][1]
                        print(json.dumps({
                            "page": i + 1,
                            "fs": round(s["size"] * k, 2),
                            "x": round(x0 / W, 3),
                            "y": round(y0 / H, 3),
                        }, ensure_ascii=False))
                        return 0
    print(json.dumps({"miss": needle}, ensure_ascii=False))
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
