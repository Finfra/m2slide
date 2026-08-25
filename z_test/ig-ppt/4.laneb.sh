#!/usr/bin/env bash
# 4.laneb — lane B(정형 블록 → 네이티브 도형) 회귀 러너 (Issue331)
#
#   왜 별도 러너인가: [`3.parity.sh`](3.parity.sh) 는 **원본 HTML 대비 구조**를 재는
#   자리이고 단언 7종이 그 계약이다. 거기에 표현 축을 끼워 넣으면 "7/7" 이라는 기존
#   판정 문장이 바뀌어, 과거 기록과 대조가 안 된다. lane B 는 다른 축이므로 다른 러너다.
#
#   판정 축 — lane B 가 한 일이 **실제로 pptx 에 남았는가**
#     ① sidecar        build-source 가 대상을 적었는가 (`lane-b.json`)
#     ② shapes         대상 장마다 **글자 있는 네이티브 도형**이 있는가
#     ③ no-picture     그 장에 그림이 늘지 않았는가 (도형이어야 편집이 산다)
#     ④ bullets-gone   평문 불릿이 **치워졌는가** (도형 옆에 같은 글이 남으면 이중 표시다)
#     ⑤ lane-c-intact  카탈로그 밖 htmlart 는 **손대지 않았는가** (근사 금지)
#     ⑥ conform        `check-conform --lane a` FAIL 0
#
#   ⚠️ 대상이 0장인 덱은 **skip(rc0)** 이다 — cards 를 안 쓰는 덱이 이 러너 때문에
#      실패하면 러너가 덱 작성 방식을 강제하는 셈이 된다.
#
#   사용:  4.laneb.sh [프로젝트명] [--no-build]
set -euo pipefail
cd "$(dirname "$0")/../.."          # → m2slide 루트

PROJ=aTest                          # 기본 픽스처 — cards·process·compare·lane C 가 모두 있다
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

echo "── 검증: $PPTX ↔ $PDIR/_pipeline/pptx/lane-b.json"
python3 - "$PDIR" "$PPTX" <<'PY'
import json
import os
import re
import subprocess
import sys
import unicodedata

from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE, PP_PLACEHOLDER

PDIR, PPTX = sys.argv[1], sys.argv[2]
CONFORM = os.path.expanduser("~/.claude/skills/ppt-check/scripts/check-conform.py")

fails = []
def ok(tag, msg): print("  ✅ %s %s" % (tag, msg))
def no(tag, name, msg):
    print("  ❌ %s %s" % (tag, msg)); fails.append(name)

def norm(s):
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", s or "")).strip()

side = os.path.join(PDIR, "_pipeline", "pptx", "lane-b.json")
if not os.path.exists(side):
    no("①", "sidecar", "사이드카 없음: %s — build-source ⑫ 가 돌지 않았다" % side)
    sys.exit(1)
with open(side, encoding="utf-8") as f:
    targets = json.load(f).get("targets", [])
b = [t for t in targets if t.get("lane") == "b"]
c = [t for t in targets if t.get("lane") != "b"]
ok("①", "사이드카 — lane B %d장 · lane C 이월 %d건" % (len(b), len(c)))
if not b:
    print("\n[4.laneb] skip — lane B 대상이 없는 덱이다 (%s)" % PPTX)
    sys.exit(0)

prs = Presentation(PPTX)
slides = list(prs.slides)

def title_of(s):
    for sh in s.shapes:
        if not sh.is_placeholder or not sh.has_text_frame:
            continue
        pf = sh.placeholder_format
        if pf.idx == 0 or pf.type in (PP_PLACEHOLDER.TITLE, PP_PLACEHOLDER.CENTER_TITLE):
            return norm(sh.text_frame.text)
    return ""

index = {}
for i, s in enumerate(slides):
    index.setdefault(title_of(s), []).append(i)

def find(t):
    cand = index.get(norm(t["title"]), [])
    return slides[cand[t["ord"]]] if t["ord"] < len(cand) else None

# ── ② shapes · ③ no-picture · ④ bullets-gone
bad_shape, bad_pic, bad_leftover = [], [], []
for t in b:
    s = find(t)
    if s is None:
        bad_shape.append("%s (장을 못 찾음)" % t["title"][:24]); continue
    drawn = [sh for sh in s.shapes
             if sh.shape_type == MSO_SHAPE_TYPE.AUTO_SHAPE
             and sh.has_text_frame and sh.text_frame.text.strip()]
    if not drawn:
        bad_shape.append("%s (글자 있는 도형 0)" % t["title"][:24])
    if any(sh.shape_type == MSO_SHAPE_TYPE.PICTURE for sh in s.shapes):
        bad_pic.append(t["title"][:24])
    # 평문 불릿 잔존 — placeholder 안에 블록 문구가 그대로 있으면 이중 표시다
    ph_text = ""
    for sh in s.shapes:
        if sh.is_placeholder and sh.has_text_frame:
            pf = sh.placeholder_format
            if pf.idx != 0 and pf.type not in (PP_PLACEHOLDER.TITLE, PP_PLACEHOLDER.CENTER_TITLE):
                ph_text += "\n" + sh.text_frame.text
    left = [x for x in t["flat"] if x and norm(x) in norm(ph_text)]
    if left:
        bad_leftover.append("%s (%s…)" % (t["title"][:20], left[0][:18]))

if bad_shape:
    no("②", "shapes", "네이티브 도형 없음 %d장 — %s" % (len(bad_shape), " / ".join(bad_shape[:3])))
else:
    ok("②", "대상 %d장 전부 글자 있는 네이티브 도형 보유" % len(b))

if bad_pic:
    no("③", "no-picture", "lane B 장에 그림이 있다 — %s" % " / ".join(bad_pic[:3]))
else:
    ok("③", "lane B 장 그림 0 (편집 가능한 도형만)")

if bad_leftover:
    no("④", "bullets-gone", "평문 불릿 잔존 %d장 — %s" % (len(bad_leftover), " / ".join(bad_leftover[:3])))
else:
    ok("④", "평문 불릿 치워짐 (이중 표시 없음)")

# ── ⑤ lane-c-intact — 카탈로그 밖은 손대지 않는다
bad_c = []
for t in c:
    s = find(t)
    if s is None:
        continue
    if any(sh.shape_type == MSO_SHAPE_TYPE.AUTO_SHAPE and sh.has_text_frame
           and sh.text_frame.text.strip() for sh in s.shapes):
        bad_c.append("%s (%s)" % (t["title"][:20], t.get("raw", "?")))
if bad_c:
    no("⑤", "lane-c-intact",
       "카탈로그 밖 블록을 도형으로 근사했다 — %s" % " / ".join(bad_c[:3]))
else:
    ok("⑤", "lane C 이월 %d건 미개입 (근사 없음)" % len(c))

# ── ⑥ conform
if not os.path.exists(CONFORM):
    no("⑥", "conform", "check-conform 없음: %s" % CONFORM)
else:
    r = subprocess.run([sys.executable, CONFORM, PPTX, "--lane", "a"],
                       capture_output=True, text=True)
    if r.returncode == 0:
        ok("⑥", "check-conform --lane a FAIL 0")
    else:
        tail = [l for l in (r.stdout + r.stderr).splitlines() if "FAIL" in l][:3]
        no("⑥", "conform", "rc=%d — %s" % (r.returncode, " / ".join(tail) or "출력 없음"))

print()
if fails:
    print("[4.laneb] 실패 %d/6 — %s" % (len(fails), ", ".join(fails)))
    sys.exit(1)
print("[4.laneb] 통과 6/6 — %s" % PPTX)
PY
