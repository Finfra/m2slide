#!/bin/bash
# ego-mobile/run.sh — ego-browser 로 m2slide 덱을 아이폰·터치 전용으로 자동 테스트 (prj42#Issue415)
#
# 사용: z_test/ego-mobile/run.sh [덱 ...]        기본: aTest aTest-all (1단계 → 2단계)
#   덱마다 _doc_work/report/ego-mobile_{STAMP}/{덱}/ 에 슬라이드별 캡처·result.json,
#   그 위에 요약 리포트 ego-mobile_{STAMP}.md 를 만든다.
#   전제: dev-server(9877) 기동 — 없으면 `./m2slide.sh --serve start`
# 종료 코드: 0 전 항목 PASS · 1 FAIL 있음 · 2 환경 오류

set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BASE="${M2_MOBILE_BASE:-http://127.0.0.1:9877}"
DECKS=("$@"); [ ${#DECKS[@]} -eq 0 ] && DECKS=(aTest aTest-all)
STAMP="$(date +%Y%m%d_%H%M%S)"
OUTROOT="$ROOT/_doc_work/report/ego-mobile_${STAMP}"
REPORT="$ROOT/_doc_work/report/ego-mobile_${STAMP}.md"

command -v ego-browser >/dev/null || { echo "❌ ego-browser 없음" >&2; exit 2; }
curl -s -o /dev/null --max-time 3 "$BASE/" || { echo "❌ dev-server 응답 없음: $BASE — ./m2slide.sh --serve start" >&2; exit 2; }

RC=0
{
  echo "---"; echo "name: ego-mobile_${STAMP}"
  echo "description: ego-browser 모바일(아이폰·터치 전용) 자동 테스트 리포트 — ${DECKS[*]}"
  echo "date: $(date +%Y.%m.%d)"; echo "---"; echo
  echo "# 개요"; echo
  echo "* 엔진: **ego-browser** · 세로 390×844 / 가로 844×390 · 배율 3 · 터치 에뮬 · iPhone UA · **키 입력 0회**"
  echo "* 대상: ${DECKS[*]} (단계 순서대로) · 기준 주소 \`$BASE\`"; echo
} > "$REPORT"

for deck in "${DECKS[@]}"; do
  out="$OUTROOT/$deck"
  echo "▶ $deck" >&2
  # 치환은 경로·URL 에 쓰이는 문자(/ : .)와 겹치지 않는 구분자 # 로
  sed -e "s#__URL__#$BASE/p/$deck/n/1/1?t=$STAMP#" -e "s#__DECK__#$deck#" -e "s#__OUT__#$out#" \
      "$ROOT/z_test/ego-mobile/mobile-check.js" | ego-browser nodejs > "$OUTROOT.$deck.log" 2>&1
  if [ ! -f "$out/result.json" ]; then
    echo "❌ $deck — result.json 없음 (로그: $OUTROOT.$deck.log)" >&2; RC=2
    printf '# %s\n\n❌ 실행 실패 — 로그 `%s`\n\n' "$deck" "$OUTROOT.$deck.log" >> "$REPORT"; continue
  fi
  python3 - "$out/result.json" "$deck" "$STAMP" >> "$REPORT" <<'PY'
import json, sys
r = json.load(open(sys.argv[1])); deck, stamp = sys.argv[2], sys.argv[3]
icon = {"PASS": "✅", "FAIL": "❌", "INFO": "ℹ️"}
print(f"# {deck}\n\n| # | 검사 | 결과 | 근거 |\n| :- | :--- | :--- | :--- |")
for t in sorted(r["tests"], key=lambda t: t["id"]):
    d = str(t["detail"]).replace("|", "\\|")
    print(f"| {t['id']} | {t['name']} | {icon.get(t['result'], '')} {t['result']} | {d} |")
shots = [s for s in r["shots"] if s.endswith(".png")]
print(f"\n* 캡처 {len(shots)}장: " + " · ".join(f"[{s}](_doc_work/report/ego-mobile_{stamp}/{deck}/{s})" for s in shots) + "\n")
PY
  grep -q '"result": "FAIL"' "$out/result.json" && [ $RC -eq 0 ] && RC=1
done

echo "📄 $REPORT"
exit $RC
