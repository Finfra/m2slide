#!/bin/bash
# Issue155: layout-selector agent CLI wrapper
#
# Usage:
#   bin/m2slide-layout-selector.sh <input> [--force | --skip] [--dry-run]
#     <input>: Projects/<Name>/<Name>.md (single mode) 또는 Projects/<Name>/markdown/ (chapter mode)
#     --force: 사용자 수동 #layout-* 슬라이드도 덮어쓰기
#     --skip:  기존 .ppt.md 있으면 즉시 종료 (CI용)
#     --dry-run: 파일 쓰기 없이 JSON만 출력
#
# 동작:
#   1. 입력에서 프로젝트 루트·theme 파악
#   2. agent 호출 안내 출력 (실제 실행은 Claude Code 세션에서 @layout-selector로)
#   3. agent JSON 출력을 lib/layout-selector-applier로 적용하여 .ppt.md 생성
#
# 본 wrapper는 CI·스크립트 통합용 진입점. Claude Code 세션에서는
# @layout-selector 직접 호출이 더 자연스러움.

set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)" || exit 1

if [ $# -lt 1 ]; then
    cat <<EOF
Usage: $0 <input> [--force | --skip] [--dry-run]

본 wrapper는 layout-selector agent 호출 가이드입니다.
Claude Code 세션에서 다음으로 직접 호출하는 것이 권장됩니다:

  @layout-selector <input> [flags]

또는 Task tool로:

  Task(subagent_type="layout-selector", prompt="<input> [flags]")
EOF
    exit 1
fi

input="$1"
shift

flags=()
while [ $# -gt 0 ]; do
    case "$1" in
        --force|--skip|--dry-run)
            flags+=("$1")
            shift
            ;;
        *)
            echo "❌ Unknown flag: $1" >&2
            exit 1
            ;;
    esac
done

echo "📍 layout-selector agent 호출 가이드"
echo ""
echo "입력: $input"
echo "플래그: ${flags[*]:-(none)}"
echo ""
echo "Claude Code 세션에서 다음 명령으로 실행:"
echo ""
echo "  @layout-selector $input ${flags[*]:-}"
echo ""
echo "Agent 호출 후 .ppt.md 생성됨. 빌드 검증:"
echo ""
echo "  ./m2slide.sh \$(basename \"\$(dirname \"$input\")\")"
echo ""
