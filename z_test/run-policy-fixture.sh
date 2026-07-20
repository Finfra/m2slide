#!/bin/bash
# 정책 goal_check 골든 픽스처 회귀 테스트 (Issue265 Phase 5)
#
# 목적: drop_redundant_page_screenshot 룰이 파일명이 아니라 속성으로 판정하는지
#       회귀 검증. 힌트에 등록되지 않은 네이밍(Deck_v10_12.png)도 잡아야 통과.
#
# 설계 SSOT: _doc_arch/policy-goal-schema.md
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FIXTURE="$ROOT/z_test/fixtures/policy/redundant-page-screenshot"
LINT="$ROOT/lib/lint-policy-artifacts.py"

fail=0
pass() { echo "✅ $1"; }
bad()  { echo "❌ $1" >&2; fail=1; }

echo "🔍 정책 골든 픽스처 회귀 테스트"
echo ""

if [ ! -d "$FIXTURE" ]; then
  echo "❌ 픽스처 없음: $FIXTURE" >&2
  exit 1
fi

# 픽스처는 위반 3건을 반드시 검출해야 함 (rc=1 이 정상)
OUT="$(python3 "$LINT" "$ROOT" "$FIXTURE" 2>&1 || true)"
RC=0
python3 "$LINT" "$ROOT" "$FIXTURE" >/dev/null 2>&1 || RC=$?

if [ "$RC" -ne 1 ]; then
  bad "픽스처에서 위반이 검출되지 않음 (rc=$RC, 기대 1) — 룰이 무력화된 상태"
else
  pass "픽스처 위반 검출됨 (rc=1)"
fi

# 케이스별 검출 여부 — 네이밍 3종 전부 잡혀야 함
for name in pdf-p003.png s07_i1.png Deck_v10_12.png; do
  if printf '%s' "$OUT" | grep -q "$name"; then
    pass "검출: $name"
  else
    bad "미검출: $name — 파일명 의존 판정으로 회귀했을 가능성"
  fi
done

# 오검출 방지 — 정상 요소 이미지와 보존 예외는 잡히면 안 됨
if printf '%s' "$OUT" | grep -q "diagram-flow.png"; then
  bad "오검출: diagram-flow.png (페이지 종횡비 아님 + alt 존재 → 정상 이미지)"
else
  pass "오검출 없음: diagram-flow.png"
fi

# 실 프로젝트는 위반 0건이어야 함 (현행 산출물 회귀 감시)
if python3 "$LINT" "$ROOT" >/dev/null 2>&1; then
  pass "실 프로젝트 위반 0건"
else
  bad "실 프로젝트에서 위반 검출 — ./m2slide.sh --lint-data 로 상세 확인"
fi

echo ""
if [ "$fail" -ne 0 ]; then
  echo "❌ 픽스처 회귀 테스트 실패" >&2
  exit 1
fi
echo "✅ 픽스처 회귀 테스트 통과"
