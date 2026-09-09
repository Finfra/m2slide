#!/bin/bash
# git 훅 설치 (Issue298 · Issue341_1)
#
# 설치 대상 2종 — 정책 혼재 경고(check-policy-commit.sh)와 승격 심사 환기
# (check-promotion-due.sh). 둘 다 **경고이며 커밋을 막지 않는다**.
#
# .git/hooks/ 는 git 추적 대상이 아니므로 clone 마다 개별 설치가 필요하다.
# 이 스크립트는 lib/hooks/*.sh 의 정책 훅을 .git/hooks/ 에 심는다.
#
# ⚠️ graphify hook install 처럼 다른 도구가 .git/hooks/pre-commit 을 덮을 수
#    있다. 그런 도구를 재설치한 뒤에는 이 스크립트를 다시 돌려야 한다.
#    기존 pre-commit 이 있으면 덮지 않고 chain 라인만 append 한다.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOK_DIR="$REPO_ROOT/.git/hooks"
PRECOMMIT="$HOOK_DIR/pre-commit"
mkdir -p "$HOOK_DIR"

#   설치할 훅 — "상대경로|마커 문구" 쌍. 늘어나면 이 목록에만 더한다.
HOOKS=(
  "lib/hooks/check-policy-commit.sh|# >>> m2slide policy-commit check (Issue298)"
  "lib/hooks/check-promotion-due.sh|# >>> m2slide promotion-due check (Issue341_1)"
)

for entry in "${HOOKS[@]}"; do
  CHECK_REL="${entry%%|*}"
  MARKER="${entry##*|}"
  END_MARKER="# <<< ${MARKER#\# >>> }"

  if [ ! -f "$REPO_ROOT/$CHECK_REL" ]; then
    echo "⚠️ 스크립트 없음 — skip: $CHECK_REL" >&2
    continue
  fi
  chmod +x "$REPO_ROOT/$CHECK_REL"
  CHAIN_LINE="\"\$(git rev-parse --show-toplevel)\"/$CHECK_REL || exit \$?"

  if [ ! -f "$PRECOMMIT" ]; then
    cat > "$PRECOMMIT" <<EOF
#!/bin/bash
$MARKER
$CHAIN_LINE
$END_MARKER
EOF
    chmod +x "$PRECOMMIT"
    echo "✅ pre-commit 훅 생성 + $CHECK_REL"
  elif grep -qF "$MARKER" "$PRECOMMIT"; then
    echo "ℹ️ 이미 설치됨 — $CHECK_REL (marker 발견, skip)"
  else
    {
      echo ""
      echo "$MARKER"
      echo "$CHAIN_LINE"
      echo "$END_MARKER"
    } >> "$PRECOMMIT"
    chmod +x "$PRECOMMIT"
    echo "✅ 기존 pre-commit 에 chain 추가 — $CHECK_REL"
  fi
done

echo "   해제: .git/hooks/pre-commit 에서 marker 블록 제거"
