#!/usr/bin/env bash
# 6.roundtrip.sh — m2slide → pptx → m2slide 왕복 충실도 회귀 (Issue342)
#
# 무엇을 지키나
# -------------
# 앞의 러너들과 검증 3종은 **pptx 가 규격에 맞는가**를 본다. 이 러너는
# **원고가 pptx 를 건너 돌아오는가**를 본다. 실측(2026-09-09)에서 그 셋이 전부
# 통과한 pptx 가 frontmatter·디렉티브·컴포넌트·htmlart 종류를 잃고 있었다 —
# 규격 통과가 곧 충실을 뜻하지 않는다.
#
# 판정은 [fidelity.yml](../../data/m2slide2ppt/fidelity.yml) 이 소유한다.
# **선언된 손실은 통과**하고 **선언되지 않은 차이만 실패**한다. 그래서 이 러너가
# 빨간불이면 둘 중 하나다 — 변환이 나빠졌거나, 계약이 현실을 못 따라갔거나.
# 어느 쪽이든 사람이 봐야 한다.
#
#   사용: ./z_test/ig-ppt/6.roundtrip.sh [프로젝트=aTest] [--no-build]
set -euo pipefail

PROJ="${1:-aTest}"
[ "${1:-}" = "--no-build" ] && PROJ=aTest
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

NOBUILD=0
for a in "$@"; do [ "$a" = "--no-build" ] && NOBUILD=1; done

PPTX="Projects/$PROJ/slide/$PROJ.pptx"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

fail=0
say() { printf '%s\n' "$*"; }
ok()  { say "  ✅ $*"; }
bad() { say "  ❌ $*"; fail=$((fail+1)); }

say "════════════════════════════════════════════════════════════"
say " 왕복 충실도 — $PROJ"
say "════════════════════════════════════════════════════════════"

# ── ① 정방향 — 원고에서 pptx 를 짓는다
if [ "$NOBUILD" = "0" ]; then
  say "── ① m2slide → pptx"
  if ./m2slide.sh "$PROJ" --pptx > "$WORK/build.log" 2>&1; then
    ok "빌드 rc0 — $(grep -c . "$WORK/build.log") 줄"
  else
    bad "빌드 실패 (rc=$?) — $WORK/build.log"
    tail -20 "$WORK/build.log"
    exit 1
  fi
else
  say "── ① 빌드 건너뜀 (--no-build)"
fi

[ -f "$PPTX" ] || { bad "pptx 없음: $PPTX"; exit 1; }
ok "산출 $PPTX ($(du -h "$PPTX" | cut -f1))"

# ── ② 역방향 — pptx 만 보고 원고로 되돌린다 (사이드카를 읽지 않는다)
say "── ② pptx → m2slide"
if python3 lib/pptx/pptx2source.py "$PPTX" "$WORK/rt" --name "$PROJ" > "$WORK/rev.log" 2>&1; then
  ok "$(cat "$WORK/rev.log")"
else
  bad "역변환 실패"; cat "$WORK/rev.log"; exit 1
fi

# ── ③ 계약 대조 — 선언되지 않은 차이만 실패다
say "── ③ 계약 대조"
set +e
python3 lib/pptx/check-roundtrip.py "Projects/$PROJ" "$WORK/rt" --json "$WORK/rt.json"
rc=$?
set -e
[ "$rc" = "0" ] || fail=$((fail+1))

# ── ④ 사이드카 커닝 방지 — 역변환기가 원본을 훔쳐보지 않았는가
say "── ④ 커닝 검사"
# ⚠️ grep 으로는 못 잰다 — 역변환기의 **설명문**이 "사이드카를 보지 않는다" 고
#    적으면서 그 파일 이름을 쓴다(실측: 첫 판이 이걸로 오탐). 실행되는 문자열만 본다.
if python3 - <<'PYEOF'
import ast, re, sys
src = open("lib/pptx/pptx2source.py", encoding="utf-8").read()
tree = ast.parse(src)
doc = set()
for n in ast.walk(tree):
    if isinstance(n, (ast.Module, ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
        if ast.get_docstring(n, clean=False) is not None:
            doc.add(id(n.body[0].value))
pat = re.compile(r"lane-[bm]\.json|_pipeline")
hits = [n.value for n in ast.walk(tree)
        if isinstance(n, ast.Constant) and isinstance(n.value, str)
        and id(n) not in doc and pat.search(n.value)]
sys.exit(1 if hits else 0)
PYEOF
then
  ok "사이드카 미참조 — pptx 에 남은 신호만 본다"
else
  bad "역변환기가 사이드카를 참조한다 — 그것을 읽으면 늘 만점이 나온다"
fi

# ── ⑤ 시각 축 — 원고가 돌아와도 **보이는 것**이 다르면 같은 덱이 아니다 (Issue344)
#   ①~④ 는 원고 왕복만 잰다. 그 사이 `slide_ratio: "3:2"` 인 덱이 16:9 로 나가도
#   초록불이었다 — Issue342 가 지적한 것과 같은 종류의 사각지대다.
say "── ⑤ 시각 축"
set +e
python3 lib/pptx/check-visual.py "Projects/$PROJ"
vrc=$?
set -e
[ "$vrc" = "0" ] || fail=$((fail+1))

# ── ⑥ 내용 전수 대조 — **열거하지 않는 검사** (Issue346)
#   ③⑤ 는 축을 열거한다. 그래서 열거하지 않은 것은 측정 자체가 안 되고, 측정 안 된
#   것은 실패로 뜨지 않는다. 실측(2026-09-10): HTML 표지 슬롯 12개 중 pptx 에 도달한
#   것이 제목 하나뿐인데도 "must_match 전건 일치" 초록불이 났다.
#   이 검사는 양쪽에서 보이는 것을 **전부 긁어** 맞춘다 — 아무도 모르던 빠짐도 잡힌다.
say "── ⑥ 내용 전수 대조"
set +e
python3 lib/pptx/check-parity.py "Projects/$PROJ"
prc=$?
set -e
[ "$prc" = "0" ] || fail=$((fail+1))

say "════════════════════════════════════════════════════════════"
if [ "$fail" = "0" ]; then
  say " ✅ 왕복이 계약대로 돈다"
else
  say " ❌ 실패 $fail 건 — 변환을 고치거나 계약을 고쳐야 한다"
fi
exit $([ "$fail" = "0" ] && echo 0 || echo 1)
