#!/usr/bin/env python3
"""
PDF 챕터 파일들을 하나로 병합 (macOS Quartz 사용).

Usage: combine-pdfs.py <output.pdf> <input1.pdf> [input2.pdf ...]
"""
import sys
from Quartz import PDFDocument
from Foundation import NSURL


def main():
    args = sys.argv[1:]
    # Issue398: `--expect N` — decktape 가 「찍었다」고 보고한 장 수의 총합. 입력 PDF 들의
    #   pageCount 합만 보면 **입력이 이미 손실된 경우를 못 잡는다**(그 합끼리는 일치하므로).
    #   상류의 기대치를 받아야 전 구간이 덮인다.
    expect_total = None
    if len(args) >= 2 and args[0] == "--expect":
        try:
            expect_total = int(args[1])
        except ValueError:
            expect_total = None
        args = args[2:]

    if len(args) < 2:
        print("Usage: combine-pdfs.py [--expect N] <output.pdf> <input1.pdf> [input2.pdf ...]",
              file=sys.stderr)
        sys.exit(1)

    output_path = args[0]
    input_paths = args[1:]

    # Issue398: 원본 PDFDocument 를 **루프 변수로만** 잡으면 다음 반복에서 재바인딩되며
    #   해제되고, 그때 이미 삽입한 PDFPage 가 함께 무효화된다(PyObjC 소유권). 작은 덱은
    #   GC 타이밍상 살아남아 드러나지 않았고, 446p·대용량에서 306p 가 조용히 사라졌다
    #   (실측 1.design_rnd: Printed 446 → 합본 140p, 그런데 rc 0 + "✅ Combined PDF").
    #   그래서 둘을 함께 건다 — 원본 문서를 끝까지 **살려 두고**, 페이지는 **복사**해 넣는다.
    srcs = []                                        # 원본 문서 참조 유지 (해제 방지)
    output_doc = None
    expected = 0
    for src in input_paths:
        url = NSURL.fileURLWithPath_(src)
        doc = PDFDocument.alloc().initWithURL_(url)
        if doc is None:
            print(f"  ⚠️  Failed to open: {src}", file=sys.stderr)
            continue
        srcs.append(doc)
        n = doc.pageCount()
        expected += n
        print(f"    · {src.split('/')[-1]}: {n}p")       # 어느 장에서 갈리는지 바로 보이게
        if output_doc is None:
            output_doc = doc
            continue
        for i in range(n):
            page = doc.pageAtIndex_(i)
            cp = page.copy()                         # 복사본을 넣는다 — 원본 수명에 얽히지 않게
            output_doc.insertPage_atIndex_(cp if cp is not None else page,
                                           output_doc.pageCount())

    if output_doc is None:
        print("❌ No input PDFs could be opened", file=sys.stderr)
        sys.exit(1)

    # ⚠️ 쓰기 **전에** 페이지 수를 대조한다. 이 검사가 없어서 306p 손실이 성공으로
    #    보고됐다 — 조용한 손실은 실패보다 나쁘다(다음 사람이 배포하고 나서 안다).
    got = output_doc.pageCount()
    if got != expected:
        print(f"❌ 페이지 수 불일치 — 입력 {expected}p · 병합 결과 {got}p "
              f"({expected - got}p 소실). 합본을 쓰지 않는다.", file=sys.stderr)
        sys.exit(2)

    # 상류 기대치와도 대조한다 — 입력 PDF 가 이미 덜 담고 있으면 위 검사는 통과한다
    if expect_total is not None and expect_total != expected:
        print(f"❌ 상류 기대치 불일치 — decktape 보고 {expect_total}장 · 입력 PDF 합 {expected}p "
              f"({expect_total - expected}p 가 PDF 생성 단계에서 이미 빠졌다). 합본을 쓰지 않는다.",
              file=sys.stderr)
        sys.exit(2)

    out_url = NSURL.fileURLWithPath_(output_path)
    ok = output_doc.writeToURL_(out_url)
    if not ok:
        print(f"❌ Failed to write: {output_path}", file=sys.stderr)
        sys.exit(1)

    # 쓰기 후 재확인 — writeToURL_ 이 true 여도 산출물이 온전한지는 별개다
    verify = PDFDocument.alloc().initWithURL_(out_url)
    vn = verify.pageCount() if verify is not None else -1
    if vn != expected:
        print(f"❌ 산출 검증 실패 — 기대 {expected}p · 파일 {vn}p", file=sys.stderr)
        sys.exit(2)

    print(f"  ✅ Combined PDF: {output_path} ({expected}p)")


if __name__ == "__main__":
    main()
