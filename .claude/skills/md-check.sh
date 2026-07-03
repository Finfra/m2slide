#!/bin/bash
# m2slide md-check 스킬 wrapper
# 슬라이드 마크다운(.md)에서 default _contents layout 적용 시 title 추출 누락 문제 검출
# 실제 로직: md-check.js (Node.js)

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$SCRIPT_DIR/md-check.js" "$@"
