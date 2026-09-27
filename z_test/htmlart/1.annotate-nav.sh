#!/usr/bin/env bash
# 1.annotate-nav — htmlArt annotate 가 **순차 이동으로 진입한 장**에서도 캔버스 안에 그려지는가 (Issue418 P3)
#
#   결함: render() 는 Reveal ready 때 비현재 장까지 한꺼번에 그리는데, 그 장은 전환 중인
#   3D transform(convex rotateY 90°) 상태라 `getBoundingClientRect` 가 찌그러진 박스를 준다.
#   한 번 재고 끝났으므로 «#/2 로드 → #/1 로 이동» 하면 강조선이 viewBox(H=620) 밖으로 빠지고
#   곡선이 섹션 아래로 샜다. **직접 로드하면 통과한다** — 그래서 이 러너는 순차 이동으로 잰다.
#
#   단언 (장마다) — 강조선 3 (픽스처 주석 수) · 선 y ∈ [0, 620] · 섹션 밖 요소 0 · `.component-error` 0
#   픽스처: z_test/fixtures/htmlart-annotate/annot16 (#/1 한글 3줄 target · #/2 영문)
#
#   사용:  1.annotate-nav.sh [--html <빌드된 index.html>]   (--html 은 빌드 생략 — red 재현용)
set -uo pipefail
cd "$(dirname "$0")/../.."
HTML=""
[ "${1:-}" = "--html" ] && HTML="${2:?}"
if [ -z "$HTML" ]; then
  WORK="$(mktemp -d /tmp/m2slide-annot.XXXXXX)"; trap 'rm -rf "$WORK"' EXIT
  cp -R z_test/fixtures/htmlart-annotate/annot16 "$WORK/annot16"
  ./m2slide.sh "$WORK/annot16" --no-serve > "$WORK/build.log" 2>&1 || { echo "❌ 빌드 실패"; tail -5 "$WORK/build.log"; exit 1; }
  HTML="$WORK/annot16/slide/index.html"
fi
command -v ego-browser >/dev/null 2>&1 || { echo "⏭️  ego-browser 없음 — 생략(통과 아님)"; exit 3; }

OUT="$(ego-browser nodejs 2>&1 <<EOF
const task = await taskSpace("annotate-nav 회귀");
const page = task.page("p1");
await page.cdp("Emulation.setDeviceMetricsOverride", {width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false});
const probe = () => {
  const s = document.querySelector('section.present');
  const sr = s.getBoundingClientRect();
  const svg = s.querySelector('svg.ha-annotate-svg');
  const ys = [...(svg ? svg.querySelectorAll('line') : [])].map(l => +l.getAttribute('y1'));
  const over = [...s.querySelectorAll('*')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.bottom > sr.bottom + 2 || b.top < sr.top - 2); }).length;
  return {lines: ys.length, yMin: Math.min(...ys), yMax: Math.max(...ys), over, errs: s.querySelectorAll('.component-error').length};
};
for (const [load, move] of [["2", "prev"], ["1", "next"]]) {
  await page.goto("file://${HTML}#/" + load);
  await page.waitForLoadState();
  await new Promise(r => setTimeout(r, 1800));
  await page.evaluate(m => Reveal[m](), move);
  await new Promise(r => setTimeout(r, 1800));
  console.log("RESULT " + load + "→" + move + " " + JSON.stringify(await page.evaluate(probe)));
}
await task.finish({ keep: [] });
EOF
)"
fails=0
while IFS= read -r ln; do
  case "$ln" in RESULT*) ;; *) continue ;; esac
  j="${ln#RESULT * }"; tag="$(echo "$ln" | cut -d' ' -f2)"
  if python3 -c 'import json,sys; d=json.loads(sys.argv[1]); sys.exit(0 if d["lines"]==3 and 0<=d["yMin"] and d["yMax"]<=620 and d["over"]==0 and d["errs"]==0 else 1)' "$j"; then
    echo "  ✅ $tag $j"
  else
    echo "  ❌ $tag $j"; fails=$((fails+1))
  fi
done <<< "$OUT"
n="$(grep -c '^RESULT' <<< "$OUT")"
[ "$n" -eq 2 ] || { echo "❌ 계측 결과 $n/2 — ego 출력:"; echo "$OUT" | tail -5; exit 1; }
[ "$fails" -eq 0 ] && echo "✅ 1.annotate-nav — 순차 이동 진입 2경로 통과" || { echo "❌ 1.annotate-nav — 실패 $fails"; exit 1; }
