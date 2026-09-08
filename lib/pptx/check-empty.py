#!/usr/bin/env python3
"""본문 0 장 검출 — **성공으로 위장한 손실**을 드러낸다 (Issue339).

왜 별도 검사인가
----------------
`check-conform --lane a` 는 규격 위반(PowerPoint 가 거부하거나 깨져 보이는 것)을 잰다.
그런데 m2slide → pptx 에서 가장 흔한 손실은 규격 위반이 아니라 **내용이 없는 장**이다 —
수식이 본문을 데려가거나(lane M 이전) 컴포넌트 펜스가 자리를 비워 두면, 제목만 남은 장이
FAIL 0 · rc0 으로 통과해 다운로드 버튼까지 달린다(실측 2026-09-09, aTest p05·p18·p19).

무엇을 정상으로 보나
--------------------
* **챕터 진입 장** — H1 단독. 제목만 있는 것이 그 장의 목적이다
* **표지** — 첫 장
표지·챕터 장을 빼고도 제목만 남은 장이 있으면 그것은 손실이다.

판정
----
    빈 장 0            rc 0
    빈 장 1개 이상     rc 1 + 장 번호·제목 (호출자가 차단 여부를 정한다)
"""
import argparse
import sys

from pptx import Presentation

#   제목만 있는 것이 정상인 layout — pandoc 이 H1 단독 장에 쓰는 것과 표지
EXEMPT_LAYOUTS = {"Section Header", "Title Slide"}


def body_units(slide):
    """제목 밖의 '내용' 개수 — 글자 있는 도형 · 그림 · 표 · 차트."""
    n = 0
    for sh in slide.shapes:
        if sh.is_placeholder and sh.placeholder_format.idx == 0:
            continue                            # 제목 placeholder
        if sh.has_table or sh.has_chart:
            n += 1
            continue
        if sh.shape_type is not None and "PICTURE" in str(sh.shape_type):
            n += 1
            continue
        if sh.has_text_frame and sh.text_frame.text.strip():
            n += 1
            continue
        #   lane B 도형·lane M 수식은 위 어디에도 안 걸릴 수 있다 — XML 로 확인
        xml = sh._element.xml
        if "oMath" in xml or "<a:t>" in xml:
            n += 1
    return n


def main():
    ap = argparse.ArgumentParser(description="본문 0 장 검출")
    ap.add_argument("pptx")
    ap.add_argument("--quiet", action="store_true")
    a = ap.parse_args()

    prs = Presentation(a.pptx)
    empties = []
    for i, s in enumerate(prs.slides, 1):
        title = ""
        for sh in s.shapes:
            if sh.is_placeholder and sh.placeholder_format.idx == 0 \
                    and sh.has_text_frame:
                title = sh.text_frame.text.strip()
                break
        if i == 1:
            continue                            # 표지
        if body_units(s) > 0:
            continue
        #   챕터 진입 장·표지는 제목만인 것이 정상이다. 판정은 **정확한 layout 이름**으로
        #   한다 — `"title" in layout` 같은 부분일치를 쓰면 본문 layout 인
        #   `Title and Content` 까지 면제되어 검사가 통째로 무력해진다(실측: 백지 3장 미검출).
        if (s.slide_layout.name or "") in EXEMPT_LAYOUTS:
            continue
        empties.append((i, title or "(제목 없음)"))

    if not empties:
        if not a.quiet:
            print("  본문 0 장 — 없음")
        return 0
    print("  ❌ 본문이 사라진 장 %d개 — 제목만 남았다:" % len(empties))
    for i, t in empties:
        print("     p%-3d %s" % (i, t))
    return 1


if __name__ == "__main__":
    sys.exit(main())
