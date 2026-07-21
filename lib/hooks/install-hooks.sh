#!/bin/bash
# git 훅 설치 (Issue298)
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
CHECK_REL="lib/hooks/check-policy-commit.sh"
CHAIN_LINE="\"\$(git rev-parse --show-toplevel)\"/$CHECK_REL || exit \$?"
MARKER="# >>> m2slide policy-commit check (Issue298)"

mkdir -p "$HOOK_DIR"
chmod +x "$REPO_ROOT/$CHECK_REL"

if [ ! -f "$PRECOMMIT" ]; then
  # 신규 pre-commit 생성
  cat > "$PRECOMMIT" <<EOF
#!/bin/bash
$MARKER
$CHAIN_LINE
# <<< m2slide policy-commit check
EOF
  chmod +x "$PRECOMMIT"
  echo "✅ pre-commit 훅 생성: $PRECOMMIT"
elif grep -qF "$MARKER" "$PRECOMMIT"; then
  echo "ℹ️ 이미 설치됨 — $PRECOMMIT (marker 발견, skip)"
else
  # 기존 pre-commit 에 chain 라인 append (덮지 않음)
  {
    echo ""
    echo "$MARKER"
    echo "$CHAIN_LINE"
    echo "# <<< m2slide policy-commit check"
  } >> "$PRECOMMIT"
  chmod +x "$PRECOMMIT"
  echo "✅ 기존 pre-commit 에 정책 검사 chain 추가: $PRECOMMIT"
fi

echo "   검사 스크립트: $CHECK_REL"
echo "   해제: .git/hooks/pre-commit 에서 marker 블록 제거"
