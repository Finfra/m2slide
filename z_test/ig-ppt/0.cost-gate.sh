#!/usr/bin/env bash
# 0.cost-gate — ig-selector 비용 게이트가 m2slide 경로에서 실제로 끊는지 (Issue313)
#
#   왜 있나: `igselect.py cost` 의 **exit 4** 가 "승인 없이 팬아웃 금지" 계약의
#   전부다. 이 코드가 어디선가 rc0 으로 뭉개지면 게이트는 있으나 마나가 된다.
#   문서로 "삼키지 말 것"이라고 적는 것만으로는 아무것도 막지 못하므로 재는다.
#
#   비용 0 — ig-maker 를 돌리지 않는다. 장수만 세는 계측이다.
#
#   ⚠️ 실측한 삼킴 경로: **파이프**. `igselect cost ... | tail` 의 rc 는 마지막
#      명령의 것이라 4 가 0 으로 바뀐다. `set -o pipefail` 없이 파이프에 물리지 말 것.
set -euo pipefail
cd "$(dirname "$0")/../.."             # → m2slide 루트

IG="$HOME/.claude/skills/ig-selector/scripts/igselect.py"
PROJ=igTest
DECK="Projects/$PROJ/slide/$PROJ.pptx"
fail=0

if [ ! -f "$IG" ]; then
  echo "⏭  ig-selector 미설치: $IG — 검증 생략" >&2
  exit 0
fi

# rc 를 그대로 받는다. 파이프·tee 를 끼우지 않는 것이 이 러너의 요점이다.
# ⚠️ `set -e` 아래서는 함수의 non-zero 반환이 스크립트를 죽인다 — rc 를 **전역에
#    담고 함수는 항상 0** 으로 끝낸다. `rc_of ...; [ "$?" = 4 ]` 로 적으면 게이트가
#    정상 동작하는 순간(4) 러너 자신이 4 로 죽는다(실측).
RC=0
rc_of() { RC=0; python3 "$IG" cost "$@" >/dev/null 2>&1 || RC=$?; }

BASE="$HOME/.claude/skills/ig-selector/policy.yml"

echo "── 검증: 비용 게이트 exit 4"

# ① 계약 자체 — 원본 없이 장수만으로. 픽스처 유무와 무관하게 항상 돈다.
rc_of --pages 1,2,3,4,5,6,7,8,9,10 --policy "$BASE"
[ "$RC" = "4" ] && echo "  ✅ 기본 임계(hard 10) 도달 시 exit 4" \
  || { echo "  ❌ 10장인데 rc=$RC — 게이트 무력"; fail=1; }

rc_of --pages 1,2,3,4,5,6,7,8,9 --policy "$BASE"
[ "$RC" = "0" ] && echo "  ✅ 임계 직하(9장)는 exit 0" \
  || { echo "  ❌ 9장에서 rc=$RC — 임계가 어긋났다"; fail=1; }

# ② 삼킴 경로 — 게이트를 무력화하는 **구체적 실수**를 고정한다.
#    pipefail 이 없는 셸에서 파이프에 물리면 rc 는 마지막 명령(tail)의 것이 되어
#    4 가 0 으로 바뀐다. 호출부가 `| tee log` 하나만 붙여도 게이트가 사라진다.
nopf=0
bash -c "python3 '$IG' cost --pages 1,2,3,4,5,6,7,8,9,10 --policy '$BASE' \
  2>/dev/null | tail -1 >/dev/null" || nopf=$?
[ "$nopf" = "0" ] \
  && echo "  ✅ pipefail 없는 파이프는 rc 를 삼킨다(재현) — 호출부 금지 패턴" \
  || { echo "  ❌ 재현 실패(rc=$nopf) — 셸 동작이 바뀌었으니 러너를 재검토"; fail=1; }

withpf=0
bash -c "set -o pipefail; python3 '$IG' cost --pages 1,2,3,4,5,6,7,8,9,10 \
  --policy '$BASE' 2>/dev/null | tail -1 >/dev/null" || withpf=$?
[ "$withpf" = "4" ] \
  && echo "  ✅ pipefail 이 있으면 exit 4 보존 — 파이프가 필요하면 이 형태로" \
  || { echo "  ❌ pipefail 인데 rc=$withpf — 게이트 전파 실패"; fail=1; }

# ③ 실덱 — 프로젝트 재정의가 실제 후보 수에 대해 끊는가
if [ -f "$DECK" ]; then
  rc_of "$DECK" --start "Projects/$PROJ"
  if [ -f "Projects/$PROJ/.claude/ig-selector.yml" ]; then
    [ "$RC" = "4" ] && echo "  ✅ 실덱($PROJ) 후보가 프로젝트 임계를 넘어 exit 4" \
      || { echo "  ❌ 재정의를 뒀는데 실덱이 통과했다(rc=$RC) — 임계가 무의미"; fail=1; }
  else
    echo "  ℹ️  $PROJ 에 .claude/ig-selector.yml 없음 — 기본 임계 rc=$RC"
  fi
else
  echo "  ⏭  픽스처 pptx 없음: $DECK — 실덱 검증 생략 (./m2slide.sh $PROJ --pptx 로 생성)"
fi

[ "$fail" = "0" ] && echo "[0.cost-gate] 통과" || { echo "[0.cost-gate] 실패"; exit 1; }
