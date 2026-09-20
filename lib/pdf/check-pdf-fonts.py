#!/usr/bin/env python3
"""decktape 산출 PDF 의 폰트 격리 검사 (Issue399).

**무엇을 재는가** — 하나의 `FontFile2` 스트림을 둘 이상의 페이지가 공유하는지.

decktape 는 슬라이드마다 Chrome 으로 따로 인쇄하므로, 폰트 프로그램은 **페이지마다
자기 것**이 정상이다. 여러 페이지가 한 스트림을 가리킨다면 그것은 decktape 의
`parseFont` 통합이 돌았다는 뜻이고, 그 통합은 `CIDToGIDMap` 을 함께 고치지 않으므로
**글리프가 다른 글자로 치환된다**.

⚠️ 이 결함은 텍스트 추출로 잡히지 않는다 — ToUnicode 는 멀쩡하고 그려지는 글자만
   어긋난다. 사람이 PDF 를 눈으로 넘겨보기 전까지 «성공» 으로 보인다. 그래서 잰다.

rc 0 = 통과 또는 SKIP · rc 1 = 위반 · rc 2 = 파일을 열지 못함
"""
import collections
import re
import sys

USAGE = "usage: check-pdf-fonts.py <file.pdf> [...]"


def ref(src, key):
    m = re.search(r'/%s\s+(\d+)\s+\d+\s+R' % key, src)
    if m:
        return int(m.group(1))
    m = re.search(r'/%s\s*\[\s*(\d+)\s+\d+\s+R' % key, src)
    return int(m.group(1)) if m else None


def check(path, fitz):
    try:
        doc = fitz.open(path)
    except Exception as e:                       # noqa: BLE001
        print(f"  ❌ {path}: 열지 못함 — {e}", file=sys.stderr)
        return 2

    owners = collections.defaultdict(set)
    for i, page in enumerate(doc):
        for f in page.get_fonts(full=True):
            xref, ftype = f[0], f[2]
            if ftype != 'Type0':
                continue
            desc = ref(doc.xref_object(xref), 'DescendantFonts')
            if desc is None:
                continue
            fd = ref(doc.xref_object(desc), 'FontDescriptor')
            if fd is None:
                continue
            ff = ref(doc.xref_object(fd), 'FontFile2')
            if ff is not None:
                owners[ff].add(i)

    shared = {ff: p for ff, p in owners.items() if len(p) > 1}
    if not shared:
        print(f"  ✅ 폰트 격리 OK: {doc.page_count}p · FontFile2 {len(owners)}개, 페이지당 전용")
        return 0

    worst = max(shared.values(), key=len)
    print(f"  ❌ {path}: 폰트 통합이 돌았습니다 — 글리프가 치환된 PDF 입니다", file=sys.stderr)
    print(f"     FontFile2 {len(owners)}개 중 {len(shared)}개를 여러 페이지가 공유"
          f" (최대 {len(worst)} 페이지)", file=sys.stderr)
    print("     텍스트 추출로는 멀쩡해 보입니다 — 실제로 렌더해서 보십시오.", file=sys.stderr)
    print("     원인·처방: lib/pdf/decktape-run.sh (Issue399)", file=sys.stderr)
    return 1


def main(argv):
    if not argv:
        print(USAGE, file=sys.stderr)
        return 2
    try:
        import fitz                              # PyMuPDF
    except ImportError:
        # 도구 부재와 «검사 통과» 는 다른 사실이다 — 조용히 넘기지 않는다
        print("  ⏭️  폰트 격리 검사 SKIP — PyMuPDF 미설치 (pip install pymupdf)")
        return 0
    rc = 0
    for path in argv:
        rc = max(rc, check(path, fitz))
    return rc


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
