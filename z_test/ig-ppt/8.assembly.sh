#!/usr/bin/env bash
# 8.assembly — pptx **패키지 조립 무결성** 회귀 가드 (Issue382)
#
#   왜 별도 러너인가 — 기존 러너가 보는 층이 아니다. [`3.parity.sh`](3.parity.sh) 는
#   python-pptx 의 **렌더 텍스트**로 장 수·제목·순서를 재고(①③④),
#   [`6.roundtrip.sh`](6.roundtrip.sh) 는 원고 ↔ 산출의 **글자·요소**를 잰다. 둘 다
#   패키지가 열리고 파싱된 **뒤**를 본다. 그래서 zip 항목 중복·끊긴 rel·미선언 미디어
#   확장자 같은 **패키지 층**의 손상은 구조적으로 볼 수 없다.
#
#   무엇을 막는 러너인가 — lane B/G/M/S/T 가 pptx 의 XML part·rel 을 **손으로 끼운다.**
#   그 축의 실사고가 이미 있었다: lane G 의 `diagramDrawing` 관계를 슬라이드 rels 가
#   아니라 data 파트에 걸었을 때 LibreOffice 가 빈 그룹으로 들여왔다(실측 2026-09-11,
#   [`CLAUDE.md`](../../CLAUDE.md) "lane G" 절). **어떤 검사도 잡지 못했고 사람이 눈으로
#   찾았다.** 이 러너가 그 자리를 덮는다.
#
#   ⚠️ 이 러너는 **결함 수정이 아니라 회귀 가드**다. 신설 시점(2026-09-20)에 기존 산출물
#      3덱 모두 `FAIL 0` 이다 — 지금 깨끗하다는 뜻이고, 손으로 XML 을 끼우는 lane 이
#      늘수록 조용히 깨질 자리가 는다. 그래서 차단 지점(`build-pptx.sh` 내장)이 아니라
#      전용 러너에 둔다: 내장 검증은 FAIL 시 빌드를 죽이므로 오탐 1건이 배포를 막는다.
#
#   판정은 **글로벌 SCAR 가 한다** — `~/.claude/skills/ppt-check/scripts/check-assembly.py`.
#   ⚠️ `lib/pptx/` 에 복사하지 않는다. 복사하면 prj8 이 경고한 2원 갈라짐(문서와 실행체가
#      따로 자라는 것)이 그대로 재현된다. 여기는 **호출·집계·보고**만 한다.
#
#   판정 축 (baseline 불요 5규칙)
#     ① zip_entry_names_unique                 zip 항목 이름이 고유한가
#     ② dropped_slide_relationship_removed     지운 슬라이드의 rel 이 남지 않았는가
#     ③ reorder_key_is_stable_across_save      sldId 가 고유하고 저장 후에도 안정한가
#     ④ no_duplicate_or_missing_after_reorder  목록 장 수 = part 장 수
#     ⑤ declared_extensions_cover_all_media    미디어 확장자가 전부 선언됐는가
#
#   ⚠️ `--baseline` 이 필요한 3규칙은 **Issue383 소관**이라 여기서 SKIP 이다. 다만
#      **SKIP 건수를 보고한다** — 숨기면 *"통과"* 와 *"축이 사라짐"* 이 구분되지 않는다
#      ([`check-coverage.py`](../../lib/pptx/check-coverage.py)·`7.coverage.sh` 와 같은 취지).
#   ⚠️ 글로벌 도구가 없는 머신에서는 **SKIP 하고 그 사실을 크게 보고**한다. 조용한 통과
#      금지 — 도구 부재와 무결성 통과는 완전히 다른 사실이다.
#
#   사용:  8.assembly.sh [프로젝트명 …] [--no-build]
set -euo pipefail
cd "$(dirname "$0")/../.."          # → m2slide 루트

CHECK="$HOME/.claude/skills/ppt-check/scripts/check-assembly.py"
BUILD=1
PROJS=()
for a in "$@"; do
  case "$a" in
    --no-build) BUILD=0 ;;
    -*)         echo "알 수 없는 인자: $a" >&2; exit 2 ;;
    *)          PROJS+=("$a") ;;
  esac
done
#   기본 픽스처 3덱 — 손으로 끼우는 lane 이 골고루 걸린다:
#     aTest-all  lane B·G·M·S·T 전부 + 51장  ·  igTest  lane G(SmartArt)·진입 장 5
#     m2Slide_chapter_mode  chapter mode 표·이미지 장
[ ${#PROJS[@]} -eq 0 ] && PROJS=(aTest-all igTest m2Slide_chapter_mode)

if [ ! -f "$CHECK" ]; then
  echo "⏭️  글로벌 check-assembly 없음 — 판정을 건너뛴다"
  echo "    기대 경로: $CHECK"
  echo "    ⚠️ 도구 부재는 **무결성 통과가 아니다.** 이 축은 지금 재지 않았다."
  echo "[8.assembly] SKIP — 글로벌 도구 부재"
  exit 0
fi

fails=0; skips=0; decks=0
for PROJ in "${PROJS[@]}"; do
  PDIR="Projects/$PROJ"
  PPTX="$PDIR/slide/$PROJ.pptx"
  if [ ! -d "$PDIR" ]; then
    echo "⏭️  프로젝트 없음: $PDIR — 건너뜀"
    continue
  fi
  if [ "$BUILD" = 1 ]; then
    echo "── 빌드 $PROJ"
    ./m2slide.sh "$PROJ" --pptx --pptx-no-verify >/dev/null
  fi
  if [ ! -f "$PPTX" ]; then
    echo "❌ pptx 없음: $PPTX"
    fails=$((fails + 1)); continue
  fi

  echo "── 검증: $PPTX"
  #   글로벌 도구의 판정 줄을 그대로 흘린다 — 여기서 다시 쓰면 문구가 갈린다
  out="$(python3 "$CHECK" "$PPTX" 2>&1)" && rc=0 || rc=$?
  echo "$out" | sed 's/^/  /'

  #   요약 줄에서 건수를 얻는다 (`요약: FAIL 0 · SKIP 3 · 검사 8`)
  f=$(printf '%s\n' "$out" | sed -n 's/.*FAIL \([0-9]*\).*/\1/p' | tail -1)
  s=$(printf '%s\n' "$out" | sed -n 's/.*SKIP \([0-9]*\).*/\1/p' | tail -1)
  [ -n "${f:-}" ] || f=0
  [ -n "${s:-}" ] || s=0
  #   rc 와 FAIL 건수가 어긋나면 rc 를 믿는다 — 도구가 요약 형식을 바꿔도 놓치지 않는다
  if [ "$rc" != 0 ] && [ "$f" = 0 ]; then f=1; fi
  fails=$((fails + f)); skips=$((skips + s)); decks=$((decks + 1))
done

echo "════════════════════════════════════════════════════════════"
if [ "$decks" = 0 ]; then
  echo "[8.assembly] SKIP — 검증할 덱이 없다"
  exit 0
fi
#   SKIP 을 통과로 세지 않는다 — 3.parity 가 single mode 에서 겪은 것과 같은 취지
if [ "$fails" = 0 ]; then
  echo "[8.assembly] 통과 — 덱 $decks · FAIL 0 · SKIP $skips (--baseline 3규칙은 Issue383 소관)"
  exit 0
fi
echo "[8.assembly] 실패 $fails 건 — 덱 $decks · SKIP $skips"
echo "   패키지 층이 깨졌다. 손으로 part·rel 을 끼우는 lane(B/G/M/S/T)을 먼저 본다."
exit 1
