#!/usr/bin/env bash
# 1.infographic — 슬라이드 1장을 ig-maker SVG 로 교체 (playground 정의표 1번의 m2slide 이식, Issue319)
#
#   ⚠️ m2slide 에서 ig-maker 의 **소비 산출물은 pptx 가 아니라 SVG** 다. 슬라이드가
#      `![](img/<ppt명>-<장표번호>.svg)` 로 참조하므로 pptx 는 부산물이다.
#
#   본 러너는 **검증만** 한다 — ig-maker 팬아웃(장당 33만 토큰)은 돌리지 않는다.
#   산출물이 없으면 어떻게 만드는지 안내하고 종료한다. 회귀 검사에서 조용히 비용을
#   태우지 않기 위함이다(ig-selector 승인 게이트를 우회하는 셈이 된다).
#
#   기대: SVG 1장 · 외부 참조 0 · viewBox 존재 · 원문 문구 보존 · 슬라이드가 실제로 참조
set -euo pipefail
cd "$(dirname "$0")/../.."             # → m2slide 루트

PROJ=igTest
DECK=strengths
PAGE=1
SVG="Projects/$PROJ/img/${DECK}-${PAGE}.svg"
SRC="Projects/$PROJ/ppt/$DECK/_source/$PAGE/7.svg"
MD="Projects/$PROJ/markdown/04-strengths.md"

if [ ! -f "$SVG" ]; then
  cat >&2 <<EOF
  ⏭  산출물 없음: $SVG — 검증 생략
     만들려면 (비용: 1장 = 약 33만 토큰 · 25~30분):
       ./lib/ig/capture-for-ig.sh $PROJ 4 3 --deck $DECK
       Agent(subagent_type="ig-maker") 로 page $PAGE 팬아웃
EOF
  exit 0
fi

fail=0
echo "── 검증: $SVG"

grep -q 'viewBox="0 0 [0-9]* [0-9]*"' "$SVG" \
  && echo "  ✅ viewBox 존재" || { echo "  ❌ viewBox 없음 — 반응형 스케일 불가"; fail=1; }

# file:// 단일 파일 배포 규약 — 같은 파일 안 참조(url(#id))는 허용, 바깥으로 나가는 것만 위반
# ⚠️ XML 주석을 먼저 걷어낸다 — ig-maker 가 헤더 주석에 "@import 0" 처럼 규약을 적어 두므로
#    날것으로 grep 하면 그 문장이 위반으로 잡힌다(실측 오탐 1건).
ext="$(python3 - "$SVG" <<'PY'
import re, sys
s = re.sub(r"<!--.*?-->", "", open(sys.argv[1], encoding="utf-8").read(), flags=re.S)
print(len(re.findall(r'(?:xlink:)?href="[^"#][^"]*"|<image|@import|@font-face|url\(https?:|<script', s)))
PY
)"
[ "$ext" = "0" ] && echo "  ✅ 외부 참조 0" || { echo "  ❌ 외부 참조 ${ext}건 — file-deployment-rules 위반"; fail=1; }

# 슬라이드 크롬 복제 금지 — 헤더·페이지번호는 m2slide 가 렌더한다
# ⚠️ 여기서도 주석을 먼저 걷어낸다 — ig-maker 가 "제거했다"는 사실을 주석에 적으면서
#    제거 대상 문자열을 그대로 인용하기 때문이다(실측 오탐 1건).
chrome="$(python3 - "$SVG" <<'PY'
import re, sys
s = re.sub(r"<!--.*?-->", "", open(sys.argv[1], encoding="utf-8").read(), flags=re.S)
# 렌더되는 것만 본다 — <text>/<tspan> 안의 "4 › 23 / 39" 꼴
body = " ".join(re.findall(r"<t(?:ext|span)[^>]*>(.*?)</t(?:ext|span)>", s, flags=re.S))
print(len(re.findall(r"[0-9]+\s*[›>]\s*[0-9]+\s*/\s*[0-9]+", body)))
PY
)"
[ "$chrome" = "0" ] && echo "  ✅ 페이지 번호 복제 없음" \
  || { echo "  ❌ 페이지 번호가 SVG 에 박혔다 — 재빌드 시 실제 번호와 어긋난다"; fail=1; }

# 원문 문구 보존 — 7개 항목 제목이 전부 살아 있어야 한다
missing=""
while IFS= read -r term; do
  grep -qF "$term" "$SVG" || missing="$missing $term"
done <<'TERMS'
패턴을 고치면 덱 전체가 바뀜
내장 컴포넌트
멀티포맷 동시 산출
코드처럼 리뷰
PPT 양방향 변환
어디서든 열리는 배포
AI 저작 파이프라인
TERMS
[ -z "$missing" ] && echo "  ✅ 원문 7개 항목 전부 보존" || { echo "  ❌ 누락:$missing"; fail=1; }

# 발행본과 원본이 같은 내용인가 (igpublish 는 복사다)
if [ -f "$SRC" ]; then
  cmp -s "$SRC" "$SVG" && echo "  ✅ 발행본 = _source 원본" \
    || { echo "  ⚠️  발행본이 _source/$PAGE/7.svg 와 다르다 — igpublish 재실행 필요"; fail=1; }
fi

# 슬라이드가 실제로 참조하는가
if grep -q "${DECK}-${PAGE}.svg" "$MD"; then
  echo "  ✅ 슬라이드가 SVG 를 참조"
  ./m2slide.sh "$PROJ" >/dev/null
  [ -f "Projects/$PROJ/slide/img/${DECK}-${PAGE}.svg" ] \
    && echo "  ✅ 빌드 산출 slide/img/ 로 복사됨" \
    || { echo "  ❌ slide/img/ 에 복사 안 됨"; fail=1; }
  ./m2slide.sh --lint-deployment "$PROJ" >/dev/null \
    && echo "  ✅ lint-deployment 통과" || { echo "  ❌ lint-deployment 위반"; fail=1; }
else
  echo "  ⚠️  $MD 가 아직 SVG 를 참조하지 않는다 (교체 전)"
fi

[ "$fail" = "0" ] && echo "[1.infographic] 통과" || { echo "[1.infographic] 실패"; exit 1; }
