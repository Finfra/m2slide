#!/usr/bin/env bash
# 1.integrity — PDF 산출물 **무결성** 회귀 가드 (Issue413)
#
#   왜 필요한가 — `--pdf` 경로의 결함 7건(Issue396·398·399·402·407·408·411)이 전부
#   **배포본에서야** 드러났다. 더 나쁜 것은 대부분이 `rc 0` + ✅ 로 성공 보고됐다는
#   점이다. 빌드 안에는 차단 검사가 있지만(`Printed N` 대조·`--expect`·폰트 격리),
#   그것들은 **그 빌드가 스스로를 보는 것**이라 «고친 것이 그대로인가» 를 나중에
#   다시 묻지 못한다. 이 러너가 그 자리를 덮는다.
#
#   판정 축 5종
#     ① 페이지 수    합본 = 챕터 HTML 의 section 합 + 표지 + 목차
#                    ⚠️ 챕터 PDF 는 빌드 끝에 지워지므로 **원고(HTML)** 로 되짚는다.
#                       decktape 는 `fragments:false` 가 기본이라 section 1개 = 1장이다.
#     ② 비율         전 페이지가 산출 HTML 의 `Reveal.initialize` 비율과 일치 (Issue396)
#     ③ 폰트 격리    하나의 FontFile2 를 둘 이상의 페이지가 공유하지 않는다 (Issue399)
#     ④ 백지 장      텍스트 0 페이지 **목록 보고** — 차단 아님
#     ⑤ 표지·목차    chapter mode 합본 앞 3p 의 출처가 표지→목차→첫 챕터 (Issue402)
#                    ⚠️ 쪽 수(①)만으로는 **제자리**를 모른다 — 쪽마다 원고를 되짚는다
#
#   ⚠️ ④를 차단으로 만들지 않는 이유: Markmap 장(표지 다음 목차·챕터 TOC)은 SVG 가
#      Type 3 로 나가 **정상적으로** 텍스트가 0이다. 차단하면 매번 오탐이다.
#   ⚠️ 이 러너는 **회귀 가드이지 차단 지점이 아니다.** 차단은 이미 빌드 안에 있고,
#      러너까지 차단이면 오탐 1건이 배포를 막는다(pptx `8.assembly.sh` 와 같은 판단).
#
#   사용:  1.integrity.sh [프로젝트명 …] [--build]
set -euo pipefail
cd "$(dirname "$0")/../.."          # → m2slide 루트

BUILD=0
PROJS=()
for a in "$@"; do
  case "$a" in
    --build) BUILD=1 ;;
    -*)      echo "알 수 없는 인자: $a" >&2; exit 2 ;;
    *)       PROJS+=("$a") ;;
  esac
done
# 기본 대상 — PDF 가 이미 있는 덱을 자동으로 고른다(빌드하지 않는 것이 기본이므로)
if [ ${#PROJS[@]} -eq 0 ]; then
  while IFS= read -r p; do PROJS+=("$p"); done < <(
    for d in Projects/*/; do
      n=$(basename "$d")
      [ -f "$d/slide/$n.pdf" ] && echo "$n"
    done)
fi
[ ${#PROJS[@]} -eq 0 ] && { echo "⏭️  PDF 가 있는 프로젝트가 없습니다 — 먼저 --pdf 로 빌드하십시오"; exit 0; }

RC=0; STALE=0; OK=0
for P in "${PROJS[@]}"; do
  echo ""
  echo "═══ $P ═══"
  if [ "$BUILD" = 1 ]; then ./m2slide.sh "$P" --pdf >/dev/null 2>&1 || { echo "  ❌ 빌드 실패"; RC=1; continue; }; fi
  set +e; python3 z_test/pdf/lib/integrity.py "$P"; r=$?; set -e
  case "$r" in
    0) OK=$((OK+1)) ;;
    3) STALE=$((STALE+1)) ;;   # 판정 불가 — 실패로 세지 않되 숨기지도 않는다
    *) RC=1 ;;
  esac
done

echo ""
# ⚠️ STALE 건수를 반드시 보고한다 — 숨기면 «통과» 와 «잴 수 없었음» 이 구분되지 않는다
#    (pptx 7.coverage·8.assembly 의 SKIP 보고와 같은 취지).
SUM="통과 ${OK}덱"; [ "$STALE" != 0 ] && SUM="$SUM · STALE ${STALE}덱(판정 불가)"
[ "$RC" = 0 ] && echo "✅ 1.integrity — $SUM" || echo "❌ 1.integrity 실패 — $SUM · 위 판정 줄 참조"
exit $RC
