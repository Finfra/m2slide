#!/usr/bin/env bash
# 2.tripath — **3경로 대조**로 결함 계열을 가른다 (Issue413)
#
#   왜 이 러너가 필요한가 — 2026-09-20 사용자가 *"변환이 잘못된 것"* 이라며 캡처
#   11장을 보냈는데, 전수 대조 결과 **한 계열은 변환과 무관**했다(venn 라벨 겹침 —
#   HTML 에서 픽셀 단위로 같은 증상). 신고 문면대로 변환기부터 팠다면 못 찾았다.
#   그래서 진단의 0단계는 언제나 «어느 경로부터 어긋나는가» 다.
#
#   세 경로에서 **같은 탐침 문자열의 폰트 크기·위치**를 잰다:
#     ① 화면       ego + file:// · 뷰포트는 덱 크기(Reveal.initialize)로 고정
#     ② 단독 추출  decktape --slides N
#     ③ 전체 추출  같은 챕터를 통째로
#
#   판정 (설계 문서 `pdf-parity.md` 「3경로 대조」와 같은 표):
#     ①=②=③   일치 — 이 축은 정상. ⚠️ **셋 다 «똑같이 잘못» 일 수 있다**(C4).
#                그건 기계가 못 가른다 — 화면을 사람이 봐야 한다
#     ①=② ≠ ③  **C3** 연속 인쇄 타이밍 의존 (Issue407 계열)
#     ① ≠ ②=③  **C1/C2** 계약 미전달·도구 내부 결함 (Issue396·399 계열)
#     셋 다 다름  복합 — 하나씩 가른다
#
#   ⚠️ ①의 뷰포트를 덱 크기로 고정하지 않으면 비교 자체가 성립하지 않는다.
#
#   사용:  2.tripath.sh <프로젝트> <챕터.html> <슬라이드번호> <탐침문자열>
set -euo pipefail
cd "$(dirname "$0")/../.."          # → m2slide 루트

P="${1:?프로젝트명}"; CH="${2:?챕터 html}"; SN="${3:?슬라이드 번호(1-base)}"; NEEDLE="${4:?탐침 문자열}"
HTML="$PWD/Projects/$P/slide/$CH"
[ -f "$HTML" ] || { echo "❌ 없음: $HTML" >&2; exit 2; }

read -r DW DH < <(python3 - "$HTML" <<'PY'
import re, sys
src = open(sys.argv[1], errors="ignore").read()
m = re.search(r"Reveal\.initialize\((.*?)\n\s*\}\);", src, re.S)
w = re.search(r"width:\s*(\d+)", m.group(1)) if m else None
h = re.search(r"height:\s*(\d+)", m.group(1)) if m else None
print(f"{w.group(1)} {h.group(1)}" if w and h else "1920 1080")
PY
)
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

echo "═══ 3경로 대조 · $P/$CH #/$SN ═══"
echo "  탐침 «${NEEDLE}» · 덱 ${DW}×${DH}"

# ── ① 화면 ──────────────────────────────────────────────────────────────
echo ""
echo "  ① 화면 (ego · file:// · ${DW}×${DH})"
# 탐침을 **JSON 리터럴로 직접 심는다** — ego 의 node 컨텍스트에는 환경변수가
# 전달되지 않고(실측: process.env 가 undefined → evaluate 인자 검증 실패),
# bash 의 @Q 는 여기 문자열을 JS 리터럴로 만들어 주지 않는다.
NEEDLE_JS=$(python3 -c 'import json,sys; print(json.dumps(sys.argv[1], ensure_ascii=False))' "$NEEDLE")
SCREEN_RAW=$(mktemp)
ego-browser nodejs <<EOF >"$SCREEN_RAW" 2>&1 || true
const task = await taskSpace("2.tripath 화면 측정");
const page = task.page("p1");
const U = "file://$HTML#/$SN";
await page.goto(U);
await page.cdp("Emulation.setDeviceMetricsOverride",
  { width: $DW, height: $DH, deviceScaleFactor: 1, mobile: false });
await page.goto(U);
await page.waitForLoadState(); await page.waitForTimeout(2500);
console.log(JSON.stringify(await page.evaluate((n) => {
  // ⚠️ 텍스트 노드 단위로 찾으면 실패한다 — 볼드·강조로 «robots.txt» 와 «는» 이
  //    다른 노드로 쪼개진다(실측). **가장 깊은 포함 요소**를 찾는다.
  const s = Reveal.getCurrentSlide();
  let best = null;
  for (const el of s.querySelectorAll("*")) {
    if (!el.textContent.includes(n)) continue;
    if (!best || best.contains(el)) best = el;
  }
  if (!best) return { miss: n };
  // 요소 상자를 쓰면 안 된다 — li 는 불릿 마커를 포함해 PDF 의 글자 스팬
  //    시작과 어긋난다(실측 0.382 vs 0.410). Range 로 **내용의 상자**를 잰다.
  const rg = document.createRange();
  rg.selectNodeContents(best);
  const r = rg.getBoundingClientRect();
  return { fs: parseFloat(getComputedStyle(best).fontSize),
           x: +(r.left / ${DW}).toFixed(3), y: +(r.top / ${DH}).toFixed(3) };
}, ${NEEDLE_JS})));
await task.finish({ keep: [] });
EOF
SCREEN=$(grep -o '{"[a-z]*":[^}]*}' "$SCREEN_RAW" | tail -1)
if [ -z "$SCREEN" ]; then
  echo "     ❌ ego 측정 실패:"; sed 's/^/        /' "$SCREEN_RAW" | tail -5; rm -f "$SCREEN_RAW"; exit 2
fi
rm -f "$SCREEN_RAW"
echo "     $SCREEN"

# ── ② 단독 추출 ─────────────────────────────────────────────────────────
echo "  ② 단독 추출 (--slides $SN)"
./lib/pdf/decktape-run.sh --size "${DW}x${DH}" --slides "$SN" reveal "$HTML" "$TMP/solo.pdf" >/dev/null 2>&1
SOLO=$(python3 z_test/pdf/lib/probe_pdf.py "$TMP/solo.pdf" "$NEEDLE" "$DW")
echo "     $SOLO"

# ── ③ 전체 추출 ─────────────────────────────────────────────────────────
echo "  ③ 전체 추출 (챕터 통째)"
./lib/pdf/decktape-run.sh --size "${DW}x${DH}" reveal "$HTML" "$TMP/full.pdf" >/dev/null 2>&1
FULL=$(python3 z_test/pdf/lib/probe_pdf.py "$TMP/full.pdf" "$NEEDLE" "$DW")
echo "     $FULL"

# ── 판정 ────────────────────────────────────────────────────────────────
echo ""
python3 z_test/pdf/lib/verdict.py "$SCREEN" "$SOLO" "$FULL"
