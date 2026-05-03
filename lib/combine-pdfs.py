#!/usr/bin/env python3
"""
PDF 챕터 파일들을 하나로 병합 (macOS Quartz 사용).

Usage: combine-pdfs.py <output.pdf> <input1.pdf> [input2.pdf ...]
"""
import sys
from Quartz import PDFDocument
from Foundation import NSURL


def main():
    if len(sys.argv) < 3:
        print("Usage: combine-pdfs.py <output.pdf> <input1.pdf> [input2.pdf ...]", file=sys.stderr)
        sys.exit(1)

    output_path = sys.argv[1]
    input_paths = sys.argv[2:]

    output_doc = None
    for src in input_paths:
        url = NSURL.fileURLWithPath_(src)
        doc = PDFDocument.alloc().initWithURL_(url)
        if doc is None:
            print(f"  ⚠️  Failed to open: {src}", file=sys.stderr)
            continue
        if output_doc is None:
            output_doc = doc
            continue
        page_count = doc.pageCount()
        for i in range(page_count):
            page = doc.pageAtIndex_(i)
            output_doc.insertPage_atIndex_(page, output_doc.pageCount())

    if output_doc is None:
        print("❌ No input PDFs could be opened", file=sys.stderr)
        sys.exit(1)

    out_url = NSURL.fileURLWithPath_(output_path)
    ok = output_doc.writeToURL_(out_url)
    if not ok:
        print(f"❌ Failed to write: {output_path}", file=sys.stderr)
        sys.exit(1)
    print(f"  ✅ Combined PDF: {output_path}")


if __name__ == "__main__":
    main()
