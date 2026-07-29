#!/bin/bash
# 축 2 런타임 게이팅 골든 픽스처 회귀 테스트 (Issue307)
#
# 목적: enforce 스캐너(lint-policy-artifacts.py)가 덱 purpose 로 룰 위반을 게이팅하는지
#       검증. 동일 위반이 promo 덱(relax_when 매치)에서는 skip, lecture 덱에서는 검출
#       되어야 통과. "게이트가 purpose 로만 갈린다"를 고정 — relax 로직이 조용히
#       무력화(전 덱 완화/전 덱 강제)되면 이 테스트가 잡는다.
#
# 설계 SSOT: _doc_arch/policy-goal-schema.md "런타임 소비 게이팅"
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FIXTURE="$ROOT/z_test/fixtures/policy/purpose-gate"
LINT="$ROOT/lib/lint-policy-artifacts.py"

fail=0
pass() { echo "✅ $1"; }
bad()  { echo "❌ $1" >&2; fail=1; }

echo "🔍 purpose 런타임 게이팅 픽스처 회귀 테스트"
echo ""

[ -d "$FIXTURE" ] || { echo "❌ 픽스처 없음: $FIXTURE" >&2; exit 1; }

# 픽스처는 자기 data/ 룰(relax_when:[promo])을 쓰도록 FIXTURE 를 root 로 스캔
OUT="$(python3 "$LINT" "$FIXTURE" 2>&1 || true)"
RC=0
python3 "$LINT" "$FIXTURE" >/dev/null 2>&1 || RC=$?

# LectureDeck 위반은 검출되어야 하므로 rc=1
if [ "$RC" -ne 1 ]; then
  bad "rc=$RC (기대 1) — lecture 덱 위반이 검출되지 않음 = 게이트가 전 덱 완화로 무력화"
else
  pass "rc=1 (lecture 위반 검출됨)"
fi

printf '%s' "$OUT" | grep -q "LectureDeck/markdown/01.md" \
  && pass "lecture 덱 위반 검출 (게이트 무통과 = 정상 판정)" \
  || bad "lecture 덱 위반 미검출 — 게이트가 잘못 완화"

if printf '%s' "$OUT" | grep -q "PromoDeck"; then
  bad "promo 덱이 검출됨 — relax_when:[promo] 완화가 작동 안 함"
else
  pass "promo 덱 skip (relax_when:[promo] 완화 작동)"
fi

printf '%s' "$OUT" | grep -q "purpose 완화 skip 1개" \
  && pass "완화 카운트 보고 정상 (skip 1개)" \
  || bad "완화 카운트 미보고 — 게이트 로그 이상"

echo ""
[ "$fail" -eq 0 ] && echo "✅ purpose 게이팅 픽스처 회귀 통과" || { echo "❌ purpose 게이팅 픽스처 회귀 실패" >&2; exit 1; }
