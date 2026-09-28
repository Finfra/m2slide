#!/usr/bin/env bash
# 10.lanet-frame — lane T 가 reference 의 **원본 프레임을 읽고** placeholder 를 옮기는지 (Issue427)
#
#   왜: 글로벌 `theme2reference.py --adapt` 는 prj3 f75dc1af 부터 캔버스를 넓히면서 마스터·레이아웃
#   xfrm 도 **같은 비율로 옮겨 둔다**. lane-t 가 그것을 여전히 4:3 좌표(10×7.5in)라고 가정해 다시
#   늘리면 표지·섹션 placeholder 가 캔버스 밖으로 밀린다(check-conform `캔버스 이탈` → 빌드 rc1).
#
#   단언 (전부 통과해야 rc0)
#     ① adapted-in-canvas  현행 글로벌 reference → lane-t layout 뒤 모든 마스터·레이아웃 placeholder 가 판형 안
#     ② legacy-in-canvas   옛 계약(슬라이드만 키우고 xfrm 은 4:3) reference → lane-t 뒤 판형 안
#     ③ same-result        ①②의 placeholder 좌표가 같다 — 두 계약이 같은 꼴로 수렴한다
#
#   ⚠️ ②③ 은 **원본에 자기 xfrm 이 있는** placeholder 만 잰다. 마스터에서 xfrm 을 상속하는 것
#      (Date·Footer·Slide Number 등)은 lane-t 가 마스터를 고친 **뒤에** 상속값을 읽어 한 번 더
#      보정하는 별개 결함이 있다(이슈후보 — Issue427 범위 밖). 현행 계약(①)에서는 그래도 판형
#      안이라 ① 은 전부를 잰다.
#
#   사용:  10.lanet-frame.sh [프로젝트]      (기본 igTest — theme.yml·theme-img 가 있어야 한다)
set -uo pipefail
cd "$(dirname "$0")/../.."          # → m2slide 루트
ROOT="$PWD"
P="${1:-igTest}"
PD="$ROOT/Projects/$P"
THEME_YML="$PD/_pipeline/pptx/theme.yml"
THEMEIMG="$PD/slide/theme-img"
T2R="${M2SLIDE_PPT_SCAR:-$HOME/.claude/skills}/ppt-deck/scripts/theme2reference.py"
for f in "$THEME_YML" "$THEMEIMG" "$T2R"; do
  [ -e "$f" ] || { echo "⏭  SKIP — 없음: $f (도구·자산 부재는 통과가 아니다)" >&2; exit 3; }
done

WORK="$(mktemp -d /tmp/m2slide-10lanet.XXXXXX)"
trap 'rm -rf "$WORK"' EXIT
A="$WORK/adapted.pptx"; L="$WORK/legacy.pptx"

python3 "$T2R" "$THEME_YML" --out "$A" --adapt >/dev/null || { echo "❌ reference 생성 실패" >&2; exit 2; }

# 옛 계약 재현 — 슬라이드 크기는 그대로 두고 placeholder xfrm 만 4:3(9144000×6858000) 좌표로 되돌린다
python3 - "$A" "$L" <<'PY' || { echo "❌ legacy reference 재현 실패" >&2; exit 2; }
import sys
from pptx import Presentation
from pptx.oxml.ns import qn
src, dst = sys.argv[1], sys.argv[2]
prs = Presentation(src)
sx, sy = prs.slide_width / 9144000, prs.slide_height / 6858000
for h in [prs.slide_master] + list(prs.slide_master.slide_layouts):
    for ph in h.placeholders:
        #   xfrm 을 마스터에서 상속하는 placeholder 는 건드리지 않는다 — 읽으면 상속값이 나오고
        #   쓰면 ext 없는 xfrm 이 새로 생겨 옛 계약이 아닌 다른 것을 만든다
        if ph._element.spPr.find(qn("a:xfrm")) is None:
            continue
        ph.left, ph.width = int(round(ph.left / sx)), int(round(ph.width / sx))
        ph.top, ph.height = int(round(ph.top / sy)), int(round(ph.height / sy))
prs.save(dst)
PY

CANVAS="$(python3 - "$A" <<'PY'
import sys
from pptx import Presentation
p = Presentation(sys.argv[1])
print("1920x%d" % round(1920 * p.slide_height / p.slide_width))
PY
)"

# 원본에 자기 xfrm 이 있는 placeholder 목록 — lane-t 뒤에는 전부 xfrm 을 갖게 되므로 먼저 적는다
OWN="$WORK/own.txt"
python3 - "$A" > "$OWN" <<'PY'
import sys
from pptx import Presentation
from pptx.oxml.ns import qn
prs = Presentation(sys.argv[1])
for h in [prs.slide_master] + list(prs.slide_master.slide_layouts):
    for ph in h.placeholders:
        if ph._element.spPr.find(qn("a:xfrm")) is not None:
            print("%s\t%s" % (getattr(h, "name", "") or "(master)", ph.name))
PY

for f in "$A" "$L"; do
  python3 lib/pptx/lane-t.py "$f" "$THEMEIMG" --mode layout --canvas-px "$CANVAS" 2>/dev/null \
    || { echo "❌ lane-t 실행 실패: $f" >&2; exit 2; }
done

python3 - "$A" "$L" "$OWN" <<'PY'
import sys
from pptx import Presentation

OWN = {tuple(x.split("\t")) for x in open(sys.argv[3]).read().splitlines() if x}

def boxes(path):
    prs = Presentation(path)
    W, H = prs.slide_width, prs.slide_height
    out = {}
    for h in [prs.slide_master] + list(prs.slide_master.slide_layouts):
        name = getattr(h, "name", "") or "(master)"
        for ph in h.placeholders:
            out[(name, ph.name)] = (ph.left, ph.top, ph.width, ph.height)
    return W, H, out

def outside(W, H, bx):
    bad = []
    for k, (l, t, w, h) in bx.items():
        if l < 0 or t < 0 or l + w > W or t + h > H:
            bad.append("%s/%s [%.0f,%.0f %.0f×%.0f]mm (판형 %.0f×%.0fmm)" % (
                k[0], k[1], l / 36000, t / 36000, w / 36000, h / 36000, W / 36000, H / 36000))
    return bad

fail = 0
res = {}
for tag, path in (("adapted", sys.argv[1]), ("legacy", sys.argv[2])):
    W, H, bx = boxes(path)
    if tag == "legacy":
        bx = {k: v for k, v in bx.items() if k in OWN}
    res[tag] = bx
    bad = outside(W, H, bx)
    n = "①" if tag == "adapted" else "②"
    if bad:
        fail += 1
        print("❌ %s %s-in-canvas — 판형 이탈 %d개" % (n, tag, len(bad)))
        for b in bad[:8]:
            print("     " + b)
    else:
        print("✅ %s %s-in-canvas — placeholder %d개 전부 판형 안" % (n, tag, len(bx)))

a, l = res["adapted"], res["legacy"]
diff = [k for k in a if k in OWN and (k not in l or
         max(abs(x - y) for x, y in zip(a[k], l[k])) > 2 * 36000)]
if diff:
    fail += 1
    print("❌ ③ same-result — 좌표가 2mm 넘게 다른 placeholder %d개" % len(diff))
    for k in diff[:8]:
        print("     %s/%s adapted=%s legacy=%s" % (k[0], k[1], a[k], l.get(k)))
else:
    print("✅ ③ same-result — 두 계약이 같은 좌표로 수렴 (%d개)" % len(OWN))
sys.exit(1 if fail else 0)
PY
