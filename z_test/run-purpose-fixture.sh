#!/bin/bash
# 축 2 덱 목적(purpose) 스키마 검사 골든 픽스처 회귀 테스트 (Issue295)
#
# 목적: lint-policy-schema.py 검사 10(룰 applies_to_purpose·relax_when 값 유효성) +
#       검사 11(Info.md purpose frontmatter enum·구조)이 미등록 값·잘못된 구조를
#       fail-loud 로 잡는지 검증. enum 확장·필드 완화로 조용히 무력화되지 않게 고정.
#
# 설계 SSOT: _doc_arch/policy-goal-schema.md "축 2 — 덱 목적(purpose)"
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FIXTURE="$ROOT/z_test/fixtures/policy/purpose"
LINT="$ROOT/lib/lint-policy-schema.py"

fail=0
pass() { echo "✅ $1"; }
bad()  { echo "❌ $1" >&2; fail=1; }

echo "🔍 purpose(축 2) 스키마 픽스처 회귀 테스트"
echo ""

[ -d "$FIXTURE" ] || { echo "❌ 픽스처 없음: $FIXTURE" >&2; exit 1; }

OUT="$(python3 "$LINT" "$FIXTURE" 2>&1 || true)"
RC=0
python3 "$LINT" "$FIXTURE" >/dev/null 2>&1 || RC=$?

if [ "$RC" -ne 1 ]; then
  bad "픽스처에서 위반 미검출 (rc=$RC, 기대 1) — 검사 10/11 무력화 상태"
else
  pass "위반 검출됨 (rc=1)"
fi

# 검사 10 — 룰 축 2 필드
printf '%s' "$OUT" | grep -q "applies_to_purpose 에 미등록 purpose" \
  && pass "검사10: applies_to_purpose 미등록 값 검출" \
  || bad "검사10: applies_to_purpose 미등록 값 미검출"
printf '%s' "$OUT" | grep -q "relax_when 는 리스트여야 함" \
  && pass "검사10: relax_when 비-리스트 검출" \
  || bad "검사10: relax_when 비-리스트 미검출"

# 검사 11 — Info.md purpose frontmatter
printf '%s' "$OUT" | grep -q "purpose.primary='notreal' 미등록" \
  && pass "검사11: purpose.primary 미등록 값 검출" \
  || bad "검사11: purpose.primary 미등록 값 미검출"
printf '%s' "$OUT" | grep -q "purpose.secondary 에 미등록" \
  && pass "검사11: purpose.secondary 미등록 값 검출" \
  || bad "검사11: purpose.secondary 미등록 값 미검출"

echo ""
[ "$fail" -eq 0 ] && echo "✅ purpose 픽스처 회귀 통과" || { echo "❌ purpose 픽스처 회귀 실패" >&2; exit 1; }
