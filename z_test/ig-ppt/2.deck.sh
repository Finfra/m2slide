#!/usr/bin/env bash
# 2.deck — m2slide 원고 → 덱 (playground 정의표 2번의 m2slide 쪽 이식, Issue319)
#
#   기대: 앞 3 페이지 · m2slide accent 색 반영 · `#layout-*` 지시자 누출 0.
#   기준 원고는 소규모 픽스처 `Projects/igTest` 다 — 40장짜리 실덱으로 돌리면
#   회귀 원인 격리가 불가능해진다.
#
#   ⚠️ 회귀 모드가 `summary` 인 이유는 playground 정의표와 같다 — `--pages` 는 원고
#      블록 기준이고 pandoc 은 h1 기준이라 부분 변환에서 커버리지를 정렬할 수단이 없다.
#      이것은 알려진 편차다.
set -euo pipefail
cd "$(dirname "$0")/../.."          # → m2slide 루트

PROJ=igTest
OUT_DIR=_doc_work/z_test/ig-ppt
mkdir -p "$OUT_DIR"
OUT="$OUT_DIR/2.deck.pptx"

echo "── 빌드 (CSS 실측 대상이 필요하므로 슬라이드가 먼저 있어야 한다)"
./m2slide.sh "$PROJ" >/dev/null

echo "── 부분 변환 (앞 3 페이지)"
./lib/pptx/build-pptx.sh "Projects/$PROJ" "$OUT" --pages 1-3

echo "── 검증"
fail=0

n="$(python3 - "$OUT" <<'PY'
import sys, zipfile
with zipfile.ZipFile(sys.argv[1]) as z:
    print(sum(1 for n in z.namelist()
              if n.startswith("ppt/slides/slide") and n.endswith(".xml")))
PY
)"
# ⚠️ 기대값을 상수 3 에서 **하한 + 제목 비율**로 바꿨다 (Issue326, 2026-08-18).
#    구 단언은 `--slide-level 1` 시절 값이다. m2slide 규약대로 레벨 2 로 바꾸자
#    같은 원고 3블록이 5장이 됐는데, 이는 **회귀가 아니라 의도된 변경의 결과**다 —
#    원고 블록 안의 H2 가 각각 슬라이드가 되기 때문이고, 러너 머리말이 이미
#    "부분 변환에서 커버리지를 정렬할 수단이 없다(알려진 편차)" 라고 적어 둔 지점이다.
#    상수로 두면 개선할 때마다 러너가 막고, 그러다 기대값을 습관적으로 고치게 된다.
#    ⚠️ 5장 중 2장은 **챕터 진입 장이 쪼개진 결함**이다(H1 + "Chapter N." + 부제가
#       각각 슬라이드가 됨 — 실측). 그 매핑은 Issue329 가 고치고, 장수·제목의
#       정밀 판정은 Issue330 parity 러너로 이관한다. 여기서는 스모크만 본다.
tp="$(python3 - "$OUT" <<'PY'
import sys
from pptx import Presentation
p = Presentation(sys.argv[1])
t = sum(1 for s in p.slides
        if any(sh.is_placeholder and sh.placeholder_format.idx == 0 for sh in s.shapes))
print(t if len(p.slides) == 0 else round(t / len(p.slides) * 100))
PY
)"
[ "$n" -ge 3 ] && echo "  ✅ 슬라이드 ${n}장 (원고 3블록 ≤ 산출)" \
  || { echo "  ❌ 슬라이드 $n 장 — 원고 3블록보다 적다(장 누락)"; fail=1; }
[ "$tp" -ge 60 ] && echo "  ✅ 제목 보유 ${tp}%" \
  || { echo "  ❌ 제목 보유 ${tp}% — slide-level 회귀 의심(레벨 1 이면 20% 안팎)"; fail=1; }

hits="$(python3 - "$OUT" <<'PY'
import re, sys, zipfile
pat = re.compile(r"F5C518|FFE15A|E6A700|B98600")
with zipfile.ZipFile(sys.argv[1]) as z:
    print(sum(len(pat.findall(z.read(n).decode("utf-8", "ignore")))
              for n in z.namelist() if n.endswith(".xml")))
PY
)"
[ "$hits" -gt 0 ] && echo "  ✅ accent 검출 ${hits}회" || { echo "  ❌ accent 0회 — theme 반영 실패"; fail=1; }

leak="$(python3 - "$OUT" <<'PY'
import sys, zipfile
with zipfile.ZipFile(sys.argv[1]) as z:
    print(sum(z.read(n).decode("utf-8", "ignore").count("#layout-")
              for n in z.namelist() if n.startswith("ppt/slides/")))
PY
)"
[ "$leak" = "0" ] && echo "  ✅ #layout-* 누출 0" || { echo "  ❌ #layout-* 누출 ${leak}건"; fail=1; }

# ⚠️ `--lane a` 필수 — 이것이 없으면 mermaid 렌더 이미지를 "본문 이미지화"로 보고 FAIL 한다.
#    lane A 에서 다이어그램이 그림으로 들어가는 것은 정상 콘텐츠다(ppt-check 자신의 안내문).
python3 ~/.claude/skills/ppt-check/scripts/check-conform.py "$OUT" --lane a >/dev/null 2>&1 \
  && echo "  ✅ conform 통과 (lane a)" || { echo "  ❌ conform 실패"; fail=1; }

[ "$fail" = "0" ] && echo "[2.deck] 통과 — $OUT" || { echo "[2.deck] 실패"; exit 1; }
