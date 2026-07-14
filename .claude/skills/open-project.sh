#!/bin/bash
# m2slide open-project 스킬 구현
# 프로젝트를 빌드 없이 브라우저에서 열기 (slide/ 미존재 시에만 빌드)
# 인자: 프로젝트명 또는 프로젝트 내부 파일 절대경로 (VSCode task ${file})
# 옵션: --dry-run (URL 결정까지만, 브라우저 미실행)

set -euo pipefail

M2SLIDE_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

DRY_RUN=false
ARG=""
for a in "$@"; do
  case "$a" in
    --dry-run) DRY_RUN=true ;;
    *) ARG="$a" ;;
  esac
done

# 프로젝트명 결정: 파일 경로면 Projects/<name>/ 캡처, 아니면 프로젝트명으로 간주
PRJ_NAME=""
if [[ "$ARG" == *"/Projects/"* ]]; then
  PRJ_NAME="$(echo "$ARG" | sed -E 's|.*/Projects/([^/]+).*|\1|')"
elif [[ -n "$ARG" && -d "$M2SLIDE_PATH/Projects/$ARG" ]]; then
  PRJ_NAME="$ARG"
fi

if [[ -z "$PRJ_NAME" || ! -d "$M2SLIDE_PATH/Projects/$PRJ_NAME" ]]; then
  echo "❌ 프로젝트를 결정할 수 없습니다: '${ARG}'"
  echo ""
  echo "사용법: open-project.sh <프로젝트명 | Projects/<name>/ 내부 파일 경로> [--dry-run]"
  echo ""
  echo "사용 가능한 프로젝트:"
  ls -1 "$M2SLIDE_PATH/Projects/" 2>/dev/null | grep -v '^z_done$' | sed 's/^/  - /'
  exit 1
fi

PRJ_PATH="$M2SLIDE_PATH/Projects/$PRJ_NAME"

# slide/ 미존재 시에만 빌드 (재빌드+열기는 /run 담당)
if [[ ! -d "$PRJ_PATH/slide" ]]; then
  echo "📝 slide/ 없음 — 최초 빌드 실행: $PRJ_NAME"
  (cd "$M2SLIDE_PATH" && ./m2slide.sh "$PRJ_NAME")
fi

# 진입 HTML: index.html(챕터 모드) 우선, 없으면 첫 HTML(단일 모드)
if [[ -f "$PRJ_PATH/slide/index.html" ]]; then
  HTML_FILE="$PRJ_PATH/slide/index.html"
else
  HTML_FILE=$(ls -1 "$PRJ_PATH"/slide/*.html 2>/dev/null | head -1)
  if [[ -z "$HTML_FILE" || ! -f "$HTML_FILE" ]]; then
    echo "❌ 생성된 HTML 파일이 없습니다: $PRJ_PATH/slide/"
    exit 1
  fi
fi

URL="file://$HTML_FILE"
echo "📖 프로젝트: $PRJ_NAME"
echo "🔗 $URL"

if [[ "$DRY_RUN" == true ]]; then
  echo "(dry-run — 브라우저 미실행)"
  exit 0
fi

# AppleScript로 Chrome 새 탭 + activate (shell open -a 금지 — apply-verify-rules §4)
if [[ "$OSTYPE" == "darwin"* && -d "/Applications/Google Chrome.app" ]]; then
  osascript <<EOF
tell application "Google Chrome"
    activate
    if (count of windows) = 0 then
        make new window
    end if
    tell window 1
        make new tab with properties {URL:"$URL"}
    end tell
end tell
EOF
  echo "🌐 Google Chrome 새 탭으로 열림 (포커스 강제)"
else
  echo "⚠️  Google Chrome 미발견 — 시스템 기본 브라우저로 실행"
  open "$HTML_FILE" 2>/dev/null || xdg-open "$HTML_FILE" 2>/dev/null
fi

echo "✨ 완료!"
