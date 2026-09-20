#!/usr/bin/env python3
"""1.integrity 의 판정부 (Issue413).

셸은 대상 선정·집계만 하고 **재는 것은 전부 여기**다. 설계 근거는
`_doc_arch/pdf-parity-design.md` 「검사 장치」가 소유한다.

rc 0 = 통과(또는 SKIP) · rc 1 = 위반
"""
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[3]


def reveal_size(html: pathlib.Path):
    """산출 HTML 이 이미 답을 갖고 있다 — `Reveal.initialize` 의 width/height.

    ⚠️ 여기에 «비율 → 치수» 매핑표를 두지 않는다. 그 표가 곧 두 번째 판정
       지점이 되어 lib/config.js 의 해석과 갈린다 (Issue396 이 남긴 교훈).
    """
    src = html.read_text(errors="ignore")
    m = re.search(r"Reveal\.initialize\((.*?)\n\s*\}\);", src, re.S)
    if not m:
        return None
    w = re.search(r"width:\s*(\d+)", m.group(1))
    h = re.search(r"height:\s*(\d+)", m.group(1))
    return (int(w.group(1)), int(h.group(1))) if w and h else None


def section_count(html: pathlib.Path) -> int:
    """decktape 는 `fragments:false` 가 기본이라 section 1개 = 인쇄 1장이다."""
    return len(re.findall(r"<section\b", html.read_text(errors="ignore")))


def main(proj: str) -> int:
    slide = ROOT / "Projects" / proj / "slide"
    pdf = slide / f"{proj}.pdf"
    if not pdf.exists():
        print(f"  ⏭️  SKIP — 합본 PDF 없음: {pdf.relative_to(ROOT)}")
        return 0
    try:
        import fitz                                   # PyMuPDF
    except ImportError:
        # 도구 부재와 「무결성 통과」는 다른 사실이다 — 조용히 넘기지 않는다
        print("  ⏭️  SKIP — PyMuPDF 미설치 (pip install pymupdf)")
        return 0

    doc = fitz.open(pdf)
    rc = 0

    # ── ① 페이지 수 ─────────────────────────────────────────────────────
    chapters = sorted(p for p in slide.glob("*.html")
                      if p.name not in ("index.html", "agenda.html"))
    # single mode 판정 — **챕터 HTML 이 없으면** index.html 이 덱 자체다.
    #   ⚠️ `agenda.html` 유무로 가르면 안 된다. single mode 도 agenda 를 만든다
    #      (실측 aTest_rt: agenda.html + index.html 만 있고 index 가 10장짜리 덱).
    #      m2slide.sh 는 single mode 에서 표지·목차를 앞에 붙이지 **않는다** —
    #      index.html 이 덱 자체라 붙이면 중복이기 때문이다(Issue402).
    single = len(chapters) == 0
    extra = []
    if single:
        want = section_count(slide / "index.html")
    else:
        want = sum(section_count(c) for c in chapters)
        if (slide / "index.html").exists():  want += 1; extra.append("표지")
        if (slide / "agenda.html").exists(): want += 1; extra.append("목차")
    tag = f" (+{'·'.join(extra)})" if extra else ""
    # ②가 볼 덱 — single mode 면 index.html 이 덱 자체다
    decks = [slide / "index.html"] if single else chapters
    src = "index.html(single mode)" if single else f"챕터 {len(chapters)}개 section 합"

    # stale 판정 — 원고보다 오래된 산출물은 **잴 수 없다**.
    #   판정 불가를 «불일치» 로 보고하면 있지도 않은 손실을 쫓게 된다
    #   (실측 igTest: PDF 21:21 vs HTML 23:41 — Issue402 이전 산출물이었다).
    newest = max((h.stat().st_mtime for h in slide.glob("*.html")), default=0)
    if pdf.stat().st_mtime < newest - 1:
        print(f"  ⚠️  STALE — PDF 가 원고(HTML)보다 오래됐습니다. 판정을 건너뜁니다.")
        print(f"      PDF {pdf.stat().st_mtime:.0f} < HTML {newest:.0f} — `./m2slide.sh {proj} --pdf` 로 다시 뽑으십시오")
        return 3
    if doc.page_count == want:
        print(f"  ✅ ① 페이지 수 {doc.page_count}p = {src}{tag}")
    else:
        print(f"  ❌ ① 페이지 수 {doc.page_count}p ≠ 기대 {want}p "
              f"({src}{tag}) — 어딘가에서 잃었거나 더했다", file=sys.stderr)
        rc = 1

    # ── ② 비율 ──────────────────────────────────────────────────────────
    size = next((s for s in (reveal_size(c) for c in decks) if s), None)
    if size is None:
        print("  ⏭️  ② 비율 SKIP — Reveal.initialize 를 못 읽음")
    else:
        want_r = size[0] / size[1]
        bad = [i + 1 for i, p in enumerate(doc)
               if abs(p.rect.width / p.rect.height - want_r) > 0.01]
        if bad:
            print(f"  ❌ ② 비율 — 기대 {want_r:.3f}({size[0]}×{size[1]}) 인데 "
                  f"{len(bad)}p 가 어긋남: {bad[:8]}{' …' if len(bad) > 8 else ''}", file=sys.stderr)
            rc = 1
        else:
            print(f"  ✅ ② 비율 전 {doc.page_count}p 가 {want_r:.3f} ({size[0]}×{size[1]})")

    # ── ③ 폰트 격리 ─────────────────────────────────────────────────────
    r = subprocess.run([sys.executable, str(ROOT / "lib/pdf/check-pdf-fonts.py"), str(pdf)],
                       capture_output=True, text=True)
    print("  " + (r.stdout.strip() or r.stderr.strip()).replace("\n", "\n  "))
    if r.returncode != 0:
        rc = 1

    # ── ④ 백지 장 (보고만) ──────────────────────────────────────────────
    empty = [i + 1 for i, p in enumerate(doc) if not p.get_text().strip()]
    if empty:
        print(f"  ℹ️  ④ 텍스트 0 페이지 {len(empty)}개: {empty[:10]}{' …' if len(empty) > 10 else ''}")
        print("      (Markmap 장은 SVG 가 Type 3 로 나가 정상적으로 0이다 — 차단하지 않는다)")
    else:
        print("  ✅ ④ 텍스트 0 페이지 없음")
    return rc


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
