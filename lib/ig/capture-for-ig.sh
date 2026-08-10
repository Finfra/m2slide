#!/usr/bin/env bash
# capture-for-ig.sh — m2slide 슬라이드 → PNG (ig-maker 입력 브리지, Issue311)
#
#   ig-maker 의 입력 계약은 **이미지 1장**이고 m2slide 원본은 마크다운이다. 그 간극을
#   메우는 유일한 경로가 이 스크립트다. 렌더는 dev-server 의 solo view 를 그대로 쓴다 —
#   슬라이드 1장만 담긴 뷰라 잘라낼 것이 없다.
#
#   ⚠️ 새 캡처기를 만들지 않는다. 헤드리스 Chrome 의 --screenshot 만 쓰므로 node·puppeteer
#      의존이 없다(Chrome 은 mermaid 렌더에 이미 필요). 실패는 조용히 넘기지 않는다.
#
# 사용:
#   capture-for-ig.sh <Project> <chap> <slide> [--deck <덱이름>] [--width N] [--height N]
#
#   --deck 을 주면 Projects/<Project>/ppt/<덱이름>/_org/ 로도 복사한다 (ppt-init 투입구).
set -euo pipefail

usage() { sed -n '2,18p' "$0"; exit "${1:-2}"; }

[ $# -ge 3 ] || usage
PROJECT="$1"; CHAP="$2"; SLIDE="$3"; shift 3
DECK=""; W=1600; H=900
while [ $# -gt 0 ]; do
  case "$1" in
    --deck)   DECK="${2:?}"; shift 2 ;;
    --width)  W="${2:?}";    shift 2 ;;
    --height) H="${2:?}";    shift 2 ;;
    -h|--help) usage 0 ;;
    *) echo "  ❌ 알 수 없는 인자: $1" >&2; usage ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT_DIR"

CHROME="${M2SLIDE_CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
if [ ! -x "$CHROME" ]; then
  echo "  ❌ Chrome 없음: $CHROME" >&2
  echo "     M2SLIDE_CHROME 로 경로를 지정하거나 Google Chrome 을 설치할 것" >&2
  exit 1
fi

# dev-server 는 idempotent — 이미 떠 있으면 그대로 쓴다
./m2slide.sh --serve start >/dev/null 2>&1 || true

PORT="${M2SLIDE_DEV_PORT:-9877}"
URL="http://127.0.0.1:${PORT}/p/${PROJECT}/s/${CHAP}/${SLIDE}"

# 대상이 실재하는지 먼저 확인 — 없는 슬라이드를 빈 이미지로 남기지 않는다
CODE="$(curl -s -o /dev/null -w '%{http_code}' "$URL" || echo 000)"
if [ "$CODE" != "200" ]; then
  echo "  ❌ 슬라이드 없음 또는 dev-server 미응답 (HTTP $CODE): $URL" >&2
  exit 1
fi

OUT_DIR="_doc_work/capture/ig"
mkdir -p "$OUT_DIR"
OUT="$OUT_DIR/${PROJECT}-c${CHAP}s${SLIDE}.png"
rm -f "$OUT"

"$CHROME" --headless --disable-gpu --hide-scrollbars \
          --window-size="${W},${H}" --virtual-time-budget=4000 \
          --screenshot="$OUT" "$URL" >/dev/null 2>&1 || true

if [ ! -s "$OUT" ]; then
  echo "  ❌ 캡처 실패 — 산출 파일이 비었다: $OUT" >&2
  exit 1
fi

echo "  ✅ 캡처: $OUT  ($URL)"

if [ -n "$DECK" ]; then
  ORG="Projects/${PROJECT}/ppt/${DECK}/_org"
  if [ ! -d "$ORG" ]; then
    echo "  ❌ 덱 투입구 없음: $ORG" >&2
    echo "     먼저: python3 ~/.claude/skills/ppt-init/scripts/init.py ${DECK} --lane b --root Projects/${PROJECT}/ppt --source ${OUT}" >&2
    exit 1
  fi
  cp "$OUT" "$ORG/"
  echo "  ✅ 투입: $ORG/$(basename "$OUT")"
fi
