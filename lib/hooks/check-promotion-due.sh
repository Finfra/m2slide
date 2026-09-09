#!/bin/bash
# 승격 심사 환기 (Issue341_1)
#
# 학습 루프의 승격은 4단계다 — 관측 → aggregate-feedback → _proposals/*.md →
# **사람이 읽고 판단**. 그 마지막이 사람 기억에 의존했다. 실측(2026-09-09):
# pending 3건이 커밋 4회 동안 한 번도 환기되지 않았고, 그중 하나는
# count 7 · threshold 3 으로 이미 medium 제안 대상이었다.
#
# ⚠️ 자동 승격은 하지 않는다. 승격이 사람 승인인 것은 설계의 핵심이다 —
#    프로젝트 하나의 사정이 전 프로젝트 기본값을 조용히 바꾸면 안 된다.
#    이 훅은 "지금 심사할 것이 있다" 만 알리고 **차단하지 않는다**.
#
# 판정 규칙은 promote-to-data.py --review 가 소유한다(= _suggest_confidence).
# 훅이 자기 규칙을 따로 두면 두 벌이 갈라지고, 갈라진 규칙은 어느 쪽이 정답인지
# 아무도 모르게 된다. 그래서 여기서는 그 명령을 부르기만 한다.
#
# 정책 yml 유무와 무관하게 매 커밋 동작한다 — 승격 심사는 그것과 다른 축이다.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

PROMOTE="lib/tuner/promote-to-data.py"
[ -f "$PROMOTE" ] || exit 0
[ -d "data/_proposals" ] || exit 0

#   rc 1 = 심사 대상 있음. 출력을 그대로 보여 준다.
if out="$(python3 "$PROMOTE" --review 2>/dev/null)"; then
  #   rc 0 — 대상 없음. low 안내 한 줄만 있으면 조용히 넘긴다(소음 방지).
  exit 0
fi

{
  echo ""
  echo "$out"
  echo ""
} >&2

exit 0   # 알리기만 한다 — 차단 금지
