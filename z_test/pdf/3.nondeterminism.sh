#!/usr/bin/env bash
# 3.nondeterminism — 같은 원고를 N회 뽑아 **조판이 매번 같은지** (Issue413)
#
#   왜 이 러너가 필요한가 — Issue407 은 **같은 HTML·같은 명령에서 실행마다 결과가
#   갈렸다.** 배포본 p184 는 본문이 44px 로 커져 마지막 불릿이 잘렸는데, 같은 챕터를
#   재추출하니 38.7px 정상이 나왔다. 이런 결함은 **1회 통과로 판정할 수 없다** —
#   고치기 전에도 통과하는 실행이 있기 때문이다.
#
#   무엇을 재는가 — 페이지마다 그려진 글자들의 «크기 + 정규화 위치» 지문
#   ([lib/fingerprint.py](lib/fingerprint.py)). 회차 간 지문이 하나라도 다르면 실패다.
#   ⚠️ 텍스트 **내용**은 지문에 넣지 않는다. Issue399 에서 글리프가 치환돼도 텍스트
#      레이어는 멀쩡했다 — 내용을 보면 그 계열을 못 잡고, Issue407 은 내용이 같고
#      크기·위치만 달랐다. 조판 지문은 후자를 본다.
#
#   ⚠️ **작은 덱으로는 재현되지 않는다.** 446장 연속 인쇄 중에만 타이밍이 밀린다.
#      기본 대상을 큰 챕터로 두는 이유다.
#
#   N 기본값 3 — 2 는 «우연히 두 번 같음» 을 못 배제하고, 5(챕터당 ~90초 × 5)는
#   일상 실행을 막는다. 3 은 기본값이지 상한이 아니다.
#
#   사용:  3.nondeterminism.sh <프로젝트> [챕터.html] [N]
set -euo pipefail
cd "$(dirname "$0")/../.."          # → m2slide 루트

MODE=repeat; ARGS=()
for a in "$@"; do
  if [ "$a" = "--mechanism" ]; then MODE=mechanism; else ARGS+=("$a"); fi
done
set -- ${ARGS[@]+"${ARGS[@]}"}

P="${1:-1.design_rnd}"
SLIDE_DIR="Projects/$P/slide"
[ -d "$SLIDE_DIR" ] || { echo "❌ 프로젝트 없음: $P" >&2; exit 2; }

# 챕터 미지정이면 **가장 큰 챕터**를 고른다 — 재현 확률이 장수에 비례한다
CH="${2:-}"
if [ -z "$CH" ]; then
  CH=$(for f in "$SLIDE_DIR"/*.html; do
         b=$(basename "$f")
         case "$b" in index.html|agenda.html) continue ;; esac
         printf '%s\t%s\n' "$(grep -o '<section' "$f" | wc -l | tr -d ' ')" "$b"
       done | sort -rn | head -1 | cut -f2)
  [ -z "$CH" ] && CH="index.html"      # single mode
fi
N="${3:-3}"

DECK_SIZE=$(python3 - "$SLIDE_DIR/$CH" <<'PY'
import re, sys
src = open(sys.argv[1], errors="ignore").read()
m = re.search(r"Reveal\.initialize\((.*?)\n\s*\}\);", src, re.S)
w = re.search(r"width:\s*(\d+)", m.group(1)) if m else None
h = re.search(r"height:\s*(\d+)", m.group(1)) if m else None
print(f"{w.group(1)}x{h.group(1)}" if w and h else "")
PY
)
DW_M="${DECK_SIZE%x*}"; DH_M="${DECK_SIZE#*x}"
: "${DW_M:=1920}"; : "${DH_M:=1080}"

# ── --mechanism — **결정론적** 기전 검사 ─────────────────────────────────
#   왜 이 모드가 생겼나 — 비결정 결함은 **반복으로 증명되지 않는다.** Issue407 구
#   코드로 같은 챕터를 9회(3+6) 뽑았으나 한 번도 갈리지 않았다. 원 결함은 배포본
#   (6챕터 연속 빌드)에서 났고 그 조건을 러너로 재현하지 못했다. 확률을 더 쌓는
#   것은 답이 아니다 — 표본을 늘려도 «안 나왔다» 만 쌓인다.
#
#   그래서 결과 대신 **기전**을 잰다. 고친 내용이 «판정을 레이아웃이 멈춘 뒤에만
#   내린다» 이므로 그 조건 자체를 확인한다. CPU 를 8배 묶어 레이아웃이 천천히
#   굳게 만들면, 구 코드는 성급히 `data-htmlart-side-checked` 를 붙이고 현 코드는
#   측정 키(`data-htmlart-side-m`)만 남긴다.
#
#   ⚠️ 이것은 «비결정성 없음» 의 증명이 **아니다.** 「오판을 영구 고정하는 구조가
#      없음」의 증명이다 — 그 구조가 원인이었으므로 원인 제거는 증명된다.
if [ "$MODE" = mechanism ]; then
  SLIDE="${3:-20}"
  URL="file://$PWD/$SLIDE_DIR/$CH#/$SLIDE"
  echo "═══ $P / $CH #/$SLIDE · 기전 검사 (CPU 8배 감속) ═══"
  # ⚠️ ego 는 stdout 이 TTY 가 아니면 console.log 를 **stderr 로** 흘린다(실측).
  #    양쪽을 받아 JSON 줄만 뽑는다 — 한쪽만 보면 조용히 빈 값을 얻는다.
  RAW=$(mktemp)
  ego-browser nodejs <<EGOEOF >"$RAW" 2>&1
const task = await taskSpace("3.nondeterminism --mechanism");
const page = task.page("p1");
await page.goto("$URL");
await page.cdp("Emulation.setDeviceMetricsOverride",
  { width: $DW_M, height: $DH_M, deviceScaleFactor: 1, mobile: false });
await page.cdp("Emulation.setCPUThrottlingRate", { rate: 8 });
await page.goto("$URL");
await page.waitForLoadState();
await page.waitForTimeout(1200);
const snap = await page.evaluate(() => [...document.querySelectorAll(".contents-body")].map((b) => ({
  checked: b.hasAttribute("data-htmlart-side-checked"),
  measured: b.hasAttribute("data-htmlart-side-m"),
})));
const latched = snap.filter((x) => x.checked);
console.log(JSON.stringify({
  bodies: snap.length,
  latched: latched.length,
  latchedWithoutMeasure: latched.filter((x) => !x.measured).length,
}));
await task.finish({ keep: [] });
EGOEOF
  OUT=$(grep -o '{"bodies".*}' "$RAW" | tail -1)
  if [ -z "$OUT" ]; then echo "  ❌ ego 실행 실패:"; sed 's/^/     /' "$RAW" | tail -6; rm -f "$RAW"; exit 2; fi
  rm -f "$RAW"
  echo "  $OUT"
  python3 z_test/pdf/lib/mechanism_check.py "$OUT"
  exit $?
fi

TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

echo "═══ $P / $CH · ${N}회 추출 ═══"
[ -n "$DECK_SIZE" ] && echo "  크기 $DECK_SIZE (산출 HTML 의 Reveal.initialize)"
PDFS=()
for i in $(seq 1 "$N"); do
  printf '  [%d/%d] 추출 중…' "$i" "$N"
  # shellcheck disable=SC2086
  ./lib/pdf/decktape-run.sh ${DECK_SIZE:+--size $DECK_SIZE} reveal \
      "$SLIDE_DIR/$CH" "$TMP/run$i.pdf" >/dev/null 2>&1 \
    || { echo " ❌ 실패"; exit 1; }
  PDFS+=("$TMP/run$i.pdf")
  echo " ok"
done

python3 z_test/pdf/lib/fingerprint.py "${PDFS[@]}"
