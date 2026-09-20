#!/usr/bin/env python3
"""scan-fixtures.py — 픽스처 덱이 **무엇을 커버하는가** 를 원고에서 센다 (Issue412)

왜 필요한가
-----------
`1.design_rnd`(520장) 에서 렌더 결함 7건이 한 번에 나왔는데 같은 시점 `aTest`·
`igTest` 는 전부 초록불이었다. 우연이 아니다 — 그 덱들은 장 제목이 전부 H2 이고
문제의 덱은 **H3 가 86%** 였다. pandoc 은 `--slide-level=2` 로 돌므로 H3 장은
제목을 잃는다(Issue403).

🔴 **결함보다 심각한 것은 「보이지 않았다」는 사실이다.** 픽스처에 H3 장이 몇 개인지
   **어디에도 선언돼 있지 않아** `7.coverage` 조차 그 구멍을 볼 수 없었다. 그 러너는
   «계약이 선언한 **요소**» 를 보고, «원고가 가질 수 있는 **특성**» 은 보지 않는다.

이 스크립트가 그 특성을 세고, `data/m2slide2ppt/fixtures.yml` 이 그것을 선언한다.

무엇을 세나 — **기계로 셀 수 있는 것만**
----------------------------------------
특성마다 «어느 이슈에서 나왔는가» 가 붙는다. 근거 없는 축은 넣지 않는다 —
셀 수 없는 「느낌」은 감사할 수 없기 때문이다.

⚠️ 수치를 러너 스크립트에 박지 않는다
-------------------------------------
`3.parity` ① 이 이미 그 실수를 했다 — 장 수 기대값을 스크립트에 박았다가 예산
정의와 갈렸고, 지금은 `lane-s.json` 에서 **세어 얻는다**. 같은 이유로 덱 특성도
`fixtures.yml` 에 적되 그 수치는 **이 스캐너가 채운다**(`--update`).

사용
----
    scan-fixtures.py <덱…>              특성 수치를 표로 낸다
    scan-fixtures.py --all               fixtures.yml 에 등재된 덱 전부
    scan-fixtures.py --all --update      센 수치로 fixtures.yml 을 갱신
    scan-fixtures.py <덱> --json         기계 판독용

    rc 0  정상   rc 1  인자·경로 오류
"""
import argparse
import glob
import json
import os
import re
import sys
import unicodedata

#   이 파일은 `lib/pptx/` 에 있다 — 저장소 루트는 **세 단계 위**다
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FIXTURES = os.path.join(ROOT, "data", "m2slide2ppt", "fixtures.yml")

#   lane B 가 네이티브 도형으로 그릴 줄 아는 htmlart. 여기 없는 것은 lane C 이월이다
#   (카탈로그 정본은 pptx-parity-design.md 「카탈로그」 절 · build-source.py ⑫)
LANE_B_KINDS = {"cards", "numbered", "process", "compare"}

#   표지 제목 상자의 수용 폭(em). `cover_geometry` 의 w 1808px ÷ fs 155px.
#   ⚠️ 이 값은 **고정 카탈로그에서 온 것**이라 덱별 실측이 아니다 — 그 한계는
#      pptx-parity-design.md 「표지 제목」 에 적혀 있다. 여기서는 «넘치는가» 만 본다
COVER_CAPACITY_EM = 1808.0 / 155.0

FENCE = re.compile(r"^[ \t]*```")
FENCE_LANG = re.compile(r"^[ \t]*```(\w[\w-]*)")
HEADING = re.compile(r"^(#{1,6})[ \t]+\S")
NESTED_BULLET = re.compile(r"^(?:[ \t]{2,})[*+-][ \t]+\S")
HTMLART_OPEN = re.compile(r"^:::+[ \t]*htmlart[ \t]+(\w+)")
CARDS_OPEN = re.compile(r"^:::+[ \t]*cards\b")
DIV_CLOSE = re.compile(r"^:::+[ \t]*$")


def em_width(s):
    """글자 폭을 em 으로 어림한다 — 동아시아 폭은 1, 나머지 0.58.

    ⚠️ 문장부호를 반각으로 세지 않는다. `·`·`—` 는 이 서체에서 **전각**이고,
       반각으로 세면 어림이 실제보다 좁아진다(Issue406 실발생).
    """
    w = 0.0
    for ch in s or "":
        o = ord(ch)
        if (unicodedata.east_asian_width(ch) in ("W", "F")
                or o in (0x00B7, 0x2013, 0x2014, 0x2018, 0x2019,
                         0x201C, 0x201D, 0x2026)):
            w += 1.0
        elif ch == " ":
            w += 0.3
        else:
            w += 0.58
    return w


def sources(deck):
    """덱의 원고 파일 목록 — chapter mode 면 `markdown/`, 아니면 프로젝트 직하."""
    base = os.path.join(ROOT, "Projects", deck)
    md = sorted(glob.glob(os.path.join(base, "markdown", "*.md")))
    if md:
        return [f for f in md
                if not f.endswith("_note.md")
                and os.path.basename(f) != "AGENDA.md"]
    return [f for f in sorted(glob.glob(os.path.join(base, "*.md")))
            if not f.endswith("_note.md")]


def frontmatter_title(deck):
    """표지 제목 — chapter mode 는 AGENDA.md, single 은 슬라이드 소스."""
    base = os.path.join(ROOT, "Projects", deck)
    cands = [os.path.join(base, "markdown", "AGENDA.md")] + sources(deck)
    for f in cands:
        if not os.path.isfile(f):
            continue
        head = open(f, encoding="utf-8", errors="ignore").read(2000)
        m = re.match(r"^---\n(.*?)\n---", head, re.S)
        if not m:
            continue
        t = re.search(r'^title:[ \t]*"?(.+?)"?[ \t]*$', m.group(1), re.M)
        if t:
            return t.group(1)
    return ""


def split_blocks(text):
    """`---` 구분자로 장을 나눈다. frontmatter 는 미리 걷는다."""
    text = re.sub(r"^---\n.*?\n---\n", "", text, count=1, flags=re.S)
    return re.split(r"^---[ \t]*$", text, flags=re.M)


def analyse(block):
    """한 장의 특성을 판정한다. 코드펜스 안은 세지 않는다."""
    lines = block.split("\n")
    in_fence = False
    top_level = None
    first_body_i = None       # 헤딩·디렉티브가 아닌 첫 내용 줄
    fence_i = None            # 첫 코드펜스 줄
    nested = False
    arts = set()
    cards_with_body = 0
    in_card_block = False
    card_has_sub = False

    for i, ln in enumerate(lines):
        if FENCE.match(ln):
            if not in_fence and fence_i is None and FENCE_LANG.match(ln):
                fence_i = i
            in_fence = not in_fence
            if first_body_i is None:
                first_body_i = i
            continue
        if in_fence:
            continue

        h = HEADING.match(ln)
        if h:
            if top_level is None:
                top_level = len(h.group(1))
            continue
        s = ln.strip()
        if not s or s.startswith("#"):        # `#layout-*`·`#id-*` 디렉티브
            continue

        if first_body_i is None:
            first_body_i = i
        if NESTED_BULLET.match(ln):
            nested = True

        a = HTMLART_OPEN.match(ln)
        if a:
            arts.add(a.group(1))
            in_card_block = a.group(1) in ("cards", "numbered")
            card_has_sub = False
            continue
        if CARDS_OPEN.match(ln):
            in_card_block, card_has_sub = True, False
            continue
        if in_card_block:
            if DIV_CLOSE.match(ln):
                if card_has_sub:
                    cards_with_body += 1
                in_card_block = False
            elif NESTED_BULLET.match(ln):
                card_has_sub = True

    return {
        "top_level": top_level,
        "h3_title": bool(top_level and top_level >= 3),
        "nested": nested,
        #   «첫 내용이 코드가 아닌» 장 — 그때만 상자 자리를 어림해야 한다(Issue405)
        "code_mid": bool(fence_i is not None and first_body_i is not None
                         and fence_i > first_body_i),
        "arts": arts,
        "cards_with_body": cards_with_body,
        "has_body": first_body_i is not None,
    }


def scan(deck):
    files = sources(deck)
    if not files:
        return None
    blocks = []
    for f in files:
        blocks += split_blocks(open(f, encoding="utf-8", errors="ignore").read())

    stats = [analyse(b) for b in blocks if b.strip()]
    arts = set()
    for s in stats:
        arts |= s["arts"]

    #   진입 장 — 뒤에 **한 단계 깊은** 헤딩 장이 따라오면서 자기도 본문을 가진 장
    #   (Issue401 이 되살린 그 장들이다)
    entry_with_body = 0
    levels = [s["top_level"] for s in stats]
    for i, s in enumerate(stats):
        L = s["top_level"]
        if L is None or not s["has_body"]:
            continue
        for j in range(i + 1, len(stats)):
            nl = levels[j]
            if nl is None:
                continue
            if nl <= L:
                break
            if nl == L + 1:
                entry_with_body += 1
                break

    title = frontmatter_title(deck)
    return {
        "slides": len(stats),
        "title_level_h3": sum(1 for s in stats if s["h3_title"]),
        "nested_bullet": sum(1 for s in stats if s["nested"]),
        "code_mid_slide": sum(1 for s in stats if s["code_mid"]),
        "cards_with_body": sum(s["cards_with_body"] for s in stats),
        "long_cover_title": int(em_width(title) > COVER_CAPACITY_EM),
        "entry_slide_with_body": entry_with_body,
        "htmlart_lane_c": len(arts - LANE_B_KINDS),
    }


AXES = ("slides", "title_level_h3", "nested_bullet", "code_mid_slide",
        "cards_with_body", "long_cover_title", "entry_slide_with_body",
        "htmlart_lane_c")


def listed_decks():
    if not os.path.isfile(FIXTURES):
        return []
    try:
        import yaml
    except ImportError:
        sys.stderr.write("  ⚠️ pyyaml 이 없다 — 덱을 인자로 지정하라\n")
        return []
    with open(FIXTURES, encoding="utf-8") as f:
        d = yaml.safe_load(f) or {}
    return list((d.get("decks") or {}).keys())


def update_fixtures(result):
    """`fixtures.yml` 의 수치만 갱신한다 — `why:` 등 사람이 쓴 것은 건드리지 않는다."""
    if not os.path.isfile(FIXTURES):
        sys.stderr.write("  ❌ %s 가 없다\n" % FIXTURES)
        return 1
    src = open(FIXTURES, encoding="utf-8").read()
    n = 0
    for deck, st in result.items():
        if st is None:
            continue
        #   `  <deck>:` 블록 안의 각 축만 바꾼다
        pat = re.compile(r"(^  %s:\n(?:    .*\n)*)" % re.escape(deck), re.M)
        m = pat.search(src)
        if not m:
            sys.stderr.write("  ⚠️ fixtures.yml 에 %s 항목이 없다 — 건너뜀\n" % deck)
            continue
        blk = m.group(1)
        for k in AXES:
            sub = re.compile(r"^(    %s:[ \t]*)-?\d+" % k, re.M)
            if sub.search(blk):
                blk = sub.sub(r"\g<1>%d" % st[k], blk, count=1)
                n += 1
        src = src[:m.start(1)] + blk + src[m.end(1):]
    open(FIXTURES, "w", encoding="utf-8").write(src)
    print("  fixtures.yml 갱신 — 수치 %d개" % n)
    return 0


def main():
    ap = argparse.ArgumentParser(description="픽스처 덱의 원고 특성을 센다 (Issue412)")
    ap.add_argument("decks", nargs="*")
    ap.add_argument("--all", action="store_true", help="fixtures.yml 등재 덱 전부")
    ap.add_argument("--update", action="store_true", help="센 수치로 fixtures.yml 갱신")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()

    decks = a.decks or (listed_decks() if a.all else [])
    if not decks:
        ap.error("덱을 지정하거나 --all 을 쓴다")

    result = {d: scan(d) for d in decks}
    missing = [d for d, v in result.items() if v is None]
    for d in missing:
        sys.stderr.write("  ⚠️ 원고를 못 찾았다 — Projects/%s\n" % d)

    if a.json:
        print(json.dumps({k: v for k, v in result.items() if v}, ensure_ascii=False, indent=1))
    else:
        head = ("덱", "장", "H3제목", "중첩", "중간코드", "카드본문", "긴표지", "진입본문", "laneC")
        print("%-22s%4s%7s%5s%9s%9s%7s%9s%6s" % head)
        for d in decks:
            st = result[d]
            if st is None:
                continue
            print("%-22s%4d%7d%5d%9d%9d%7d%9d%6d"
                  % (d, st["slides"], st["title_level_h3"], st["nested_bullet"],
                     st["code_mid_slide"], st["cards_with_body"],
                     st["long_cover_title"], st["entry_slide_with_body"],
                     st["htmlart_lane_c"]))

    if a.update:
        return update_fixtures(result)
    return 0 if not missing else 1


if __name__ == "__main__":
    sys.exit(main())
