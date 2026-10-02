#!/bin/bash
# webkit-mobile/run.sh — m2slide 덱을 Playwright WebKit 아이폰 에뮬로 자동 테스트 (prj3#Issue848 · ego-mobile 의 WebKit 판)
#
# 사용: z_test/webkit-mobile/run.sh [--host local|jma] [덱 ...]     기본: aTest aTest-all
#   공용 러너 ~/.claude/skills/mobile-test 에 m2slide-check.mjs(M1~M6·L1)를 --check 로 넘긴다.
#   산출: _doc_work/report/webkit-mobile_{STAMP}/ (덱별 캡처·result.json) + 같은 이름 .md 요약
#   전제: dev-server(9877) 기동 — 없으면 `./m2slide.sh --serve start`
#         --host jma 는 9877 이 `tailscale serve` 로 tailnet 에 열려 있어야 한다(_doc_arch/dev-server.md)
# 종료 코드: 0 전 항목 PASS · 1 FAIL 있음 · 2 환경 오류
# ego-mobile/ 과의 관계: 엔진만 다르고 항목은 같다 — 아이폰 판정은 이쪽(WebKit = 아이폰 렌더러), ego 는 Blink 참고용

set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
RUNNER="$HOME/.claude/skills/mobile-test/scripts/mobile-test.sh"
BASE="${M2_MOBILE_BASE:-http://127.0.0.1:9877}"
HOST=local
[ "${1:-}" = --host ] && { HOST="$2"; shift 2; }
DECKS=("$@"); [ ${#DECKS[@]} -eq 0 ] && DECKS=(aTest aTest-all)
STAMP="$(date +%Y%m%d_%H%M%S)"

[ -x "$RUNNER" ] || { echo "❌ 공용 러너 없음: $RUNNER" >&2; exit 2; }
curl -s -o /dev/null --max-time 3 "$BASE/" || { echo "❌ dev-server 응답 없음: $BASE — ./m2slide.sh --serve start" >&2; exit 2; }

URLS=()
for deck in "${DECKS[@]}"; do URLS+=("$deck=$BASE/p/$deck/n/1/1?t=$STAMP"); done
cd "$ROOT" && exec "$RUNNER" --host "$HOST" --check "$ROOT/z_test/webkit-mobile/m2slide-check.mjs" \
  --out "$ROOT/_doc_work/report/webkit-mobile_${STAMP}" "${URLS[@]}"
