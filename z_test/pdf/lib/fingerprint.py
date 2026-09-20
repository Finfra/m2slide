#!/usr/bin/env python3
"""PDF 조판 지문 (Issue413).

**무엇을 지문으로 삼는가** — 페이지마다 그려진 글자들의 «크기 + 정규화 x 위치».
좌표를 페이지 크기로 나누므로 용지 규격이 달라도 비교되고, 레이아웃이 한 번이라도
달리 잡히면(폰트가 커지거나 열이 좁아지면) 값이 바뀐다.

⚠️ **텍스트 내용은 지문에 넣지 않는다.** Issue399 의 교훈이다 — 글리프가 치환돼도
   텍스트 레이어는 그대로였다. 내용을 보면 그런 결함을 못 잡는다. 반대로 Issue407 은
   내용은 같고 **크기·위치**만 달랐다. 조판 지문은 후자를 본다.

용도: `3.nondeterminism` 이 같은 챕터를 N회 뽑아 지문이 매번 같은지 본다.
"""
import hashlib
import sys


def page_prints(path):
    """[(페이지번호, 지문, 스팬수), …]"""
    import fitz
    doc = fitz.open(path)
    out = []
    for i, p in enumerate(doc):
        W, H = p.rect.width, p.rect.height
        items = []
        for b in p.get_text("dict")["blocks"]:
            for l in b.get("lines", []):
                for s in l["spans"]:
                    if not s["text"].strip():
                        continue
                    x0, y0 = s["bbox"][0] / W, s["bbox"][1] / H
                    items.append(f"{s['size']:.1f}|{x0:.3f}|{y0:.3f}")
        items.sort()
        h = hashlib.sha1("\n".join(items).encode()).hexdigest()[:12]
        out.append((i + 1, h, len(items)))
    return out


def main(argv):
    if len(argv) < 2:
        print("usage: fingerprint.py <a.pdf> <b.pdf> [...]", file=sys.stderr)
        return 2
    try:
        import fitz  # noqa: F401
    except ImportError:
        print("  ⏭️  SKIP — PyMuPDF 미설치")
        return 0

    runs = [page_prints(p) for p in argv]
    n = {len(r) for r in runs}
    if len(n) != 1:
        print(f"  ❌ 회차마다 페이지 수가 다릅니다: {[len(r) for r in runs]}", file=sys.stderr)
        return 1

    diffs = []
    for idx in range(len(runs[0])):
        seen = {r[idx][1] for r in runs}
        if len(seen) > 1:
            diffs.append((runs[0][idx][0], [ (r[idx][1], r[idx][2]) for r in runs ]))

    total = len(runs[0])
    if not diffs:
        # ⚠️ 통과는 «비결정성이 없다» 가 아니라 «이번 N회에서는 안 나왔다» 이다.
        #    사건률이 p 면 놓칠 확률이 (1-p)^N 이므로 N 을 함께 보고한다.
        print(f"  ✅ {len(runs)}회 전부 동일한 조판 ({total}p)")
        print(f"     ⚠️ 이것은 «비결정성 없음» 의 증명이 아니다 — N={len(runs)} 에서 안 나왔을 뿐이다."
              f" 사건률 p 면 놓칠 확률이 (1-p)^{len(runs)} 다")
        return 0
    print(f"  ❌ {len(diffs)}/{total}p 가 회차마다 다르게 조판됐습니다 — **비결정적**", file=sys.stderr)
    for pno, sigs in diffs[:8]:
        detail = " / ".join(f"{h}({c}스팬)" for h, c in sigs)
        print(f"     p{pno}: {detail}", file=sys.stderr)
    if len(diffs) > 8:
        print(f"     … 외 {len(diffs)-8}p", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
