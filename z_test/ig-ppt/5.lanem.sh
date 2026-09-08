#!/usr/bin/env bash
# 5.lanem — lane M(수식 → 네이티브 OMML) + 백지 장 회귀 러너 (Issue339)
#
#   왜 별도 러너인가: [`4.laneb.sh`](4.laneb.sh) 는 정형 블록이 도형이 되었는지를 재고,
#   여기는 **수식이 살아남았는지**와 **본문이 사라진 장이 없는지**를 잰다. 축이 다르다.
#
#   무엇을 막는 러너인가 — pandoc 3.10 pptx writer 는 Math 를 만나면 그 장의 콘텐츠
#   shape 을 아예 만들지 않는다. 경고도 rc 도 없어서, 수식 한 개가 같은 장의 불릿·코드까지
#   데리고 **조용히** 사라진다(실측 2026-09-09, aTest p05). 이 러너가 그 조용함을 깨는 장치다.
#
#   판정 축
#     ① sidecar        build-source 가 수식을 적었는가 (`lane-m.json`)
#     ② marker-gone    pptx 에 마커(`m2math:NNNN`)가 **남아 있지 않은가**
#     ③ omml           수식이 있던 장마다 네이티브 OMML 이 있는가
#     ④ co-survivors   그 장의 **다른 본문**(불릿·코드)이 함께 살아남았는가 ← 회귀의 본체
#     ⑤ no-empty       제목만 남은 장이 0 인가 (표지·챕터 장 제외)
#     ⑥ code-dollar    코드펜스 안의 `$` 를 수식으로 오독하지 않았는가
#
#   ⚠️ 수식이 0건인 덱은 ①③④⑥ 를 **skip** 하고 ⑤ 만 잰다 — 수식을 안 쓰는 덱이
#      이 러너 때문에 실패하면 러너가 덱 작성 방식을 강제하는 셈이다.
#
#   사용:  5.lanem.sh [프로젝트명] [--no-build]
set -euo pipefail
cd "$(dirname "$0")/../.."          # → m2slide 루트

PROJ=aTest                          # 기본 픽스처 — 수식·코드 동거 장(p05)과 컴포넌트 장이 있다
BUILD=1
for a in "$@"; do
  case "$a" in
    --no-build) BUILD=0 ;;
    -*)         echo "알 수 없는 인자: $a" >&2; exit 2 ;;
    *)          PROJ="$a" ;;
  esac
done

PDIR="Projects/$PROJ"
PPTX="$PDIR/slide/$PROJ.pptx"
[ -d "$PDIR" ] || { echo "❌ 프로젝트 없음: $PDIR" >&2; exit 2; }

if [ "$BUILD" = 1 ]; then
  echo "── 빌드"
  ./m2slide.sh "$PROJ" --pptx --pptx-no-verify >/dev/null
else
  echo "── 빌드 생략 (--no-build)"
fi
[ -f "$PPTX" ] || { echo "❌ pptx 없음: $PPTX" >&2; exit 1; }

echo "── 검증: $PPTX ↔ $PDIR/_pipeline/pptx/lane-m.json"
python3 - "$PDIR" "$PPTX" <<'PY'
import json
import os
import re
import subprocess
import sys
import zipfile

from pptx import Presentation

pdir, pptx = sys.argv[1], sys.argv[2]
fails, skips = [], []

# ── ① sidecar
side = os.path.join(pdir, "_pipeline", "pptx", "lane-m.json")
if not os.path.isfile(side):
    fails.append("① sidecar — lane-m.json 이 없다 (build-source ⑬ 가 돌지 않았다)")
    items = []
else:
    items = json.load(open(side, encoding="utf-8")).get("items", [])
    print("  ① sidecar        수식 %d건" % len(items))

# ── ② marker-gone — 어느 장에도 마커가 남지 않아야 한다
with zipfile.ZipFile(pptx) as z:
    slide_xml = {n: z.read(n).decode("utf-8", "replace")
                 for n in z.namelist()
                 if re.match(r"ppt/slides/slide\d+\.xml$", n)}
left = [n for n, x in slide_xml.items() if "m2math" in x]
if left:
    fails.append("② marker-gone — 마커가 남았다: %s" % ", ".join(sorted(left)))
else:
    print("  ② marker-gone    잔존 0")

# ── ③ omml — 수식이 있으면 OMML 도 있어야 한다
n_omml = sum(x.count("<m:oMath>") for x in slide_xml.values())
if items:
    if n_omml < len(items):
        fails.append("③ omml — 수식 %d건인데 OMML %d개 (평문으로 떨어진 것이 있다)"
                     % (len(items), n_omml))
    else:
        print("  ③ omml           OMML %d개 ≥ 수식 %d건" % (n_omml, len(items)))
else:
    skips.append("③ omml (수식 0건)")

# ── ④ co-survivors — 수식이 든 장에 다른 본문이 함께 있는가
#    이것이 회귀의 본체다. pandoc 이 본문을 날렸다면 그 장은 제목 + 수식만 남는다.
prs = Presentation(pptx)
if items:
    bad = []
    for i, s in enumerate(prs.slides, 1):
        xml = "".join(sh._element.xml for sh in s.shapes)
        if "<m:oMath>" not in xml:
            continue
        others = 0
        for sh in s.shapes:
            if sh.is_placeholder and sh.placeholder_format.idx == 0:
                continue
            if sh.has_text_frame:
                #   수식 자체(Fallback 평문)를 뺀 글자가 있는가
                t = sh.text_frame.text.strip()
                if t:
                    others += 1
            elif sh.has_table or ("PICTURE" in str(sh.shape_type)):
                others += 1
        if others == 0:
            bad.append(i)
    #   수식만 있는 장은 원고가 그럴 수도 있다 — 그래서 **전 장이 그렇지 않은가**로 본다
    if bad and len(bad) == sum(1 for s in prs.slides
                               if "<m:oMath>" in "".join(sh._element.xml
                                                         for sh in s.shapes)):
        fails.append("④ co-survivors — 수식 장 전부(%s)에 다른 본문이 없다 — "
                     "pandoc 이 본문을 날린 회귀다" % ",".join("p%d" % i for i in bad))
    else:
        print("  ④ co-survivors   수식 장의 동거 본문 확인")
else:
    skips.append("④ co-survivors (수식 0건)")

# ── ⑤ no-empty
here = os.path.dirname(os.path.abspath(__file__)) if "__file__" in dir() else "."
chk = os.path.join("lib", "pptx", "check-empty.py")
if os.path.isfile(chk):
    r = subprocess.run(["python3", chk, pptx], capture_output=True, text=True)
    if r.returncode != 0:
        fails.append("⑤ no-empty — 제목만 남은 장이 있다\n" + r.stdout.rstrip())
    else:
        print("  ⑤ no-empty       본문 0 장 없음")
else:
    fails.append("⑤ no-empty — check-empty.py 가 없다")

# ── ⑥ code-dollar — 코드펜스 안의 `$` 를 수식으로 삼지 않았는가
#    원고에서 코드펜스 안 `$` 를 세고, 사이드카의 latex 가 그 조각을 담고 있으면 오탐이다.
src_dir = os.path.join(pdir, "_pipeline", "pptx", "source")
if items and os.path.isdir(src_dir):
    inside = []
    for f in sorted(os.listdir(src_dir)):
        if not f.endswith(".md"):
            continue
        code, cur = False, []
        for ln in open(os.path.join(src_dir, f), encoding="utf-8"):
            if ln.lstrip().startswith("```"):
                code = not code
                continue
            if code and "$" in ln:
                cur.append(ln.strip())
        inside += cur
    latexes = [it["latex"] for it in items]
    hit = [c for c in inside if any(c and c in lx for lx in latexes)]
    if hit:
        fails.append("⑥ code-dollar — 코드 안 `$` 를 수식으로 읽었다: %s" % hit[:3])
    else:
        print("  ⑥ code-dollar    코드펜스 안 `$` %d줄 — 오탐 0" % len(inside))
else:
    skips.append("⑥ code-dollar (수식 0건)")

print()
for s in skips:
    print("  ⏭  skip — %s" % s)
if fails:
    print("\n❌ lane M 회귀 %d건" % len(fails))
    for f in fails:
        print("   " + f)
    sys.exit(1)
print("\n✅ lane M 단언 통과 (skip %d)" % len(skips))
PY
