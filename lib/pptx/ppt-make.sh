#!/usr/bin/env bash
# ppt-make.sh — 원본 하나로 완성 덱까지 (Issue332)
#
#   글로벌 `ppt-maker` 는 *원본 → init·(trace·spec)·deck·check* 를 잇는 오케스트레이터다.
#   단계 SCAR 는 전부 있었는데 **그것들을 잇는 주체**가 없어 사람이 그 자리를 메우고 있었다.
#   m2slide 쪽에서 그 자리를 채우는 것이 이 스크립트이며, 하는 일은 **호출과 결과 회수**뿐이다.
#   판정 표(lane)·비용 게이트·팬아웃 같은 오케스트레이션 로직은 **복제하지 않는다**.
#
# ⚠️ 재귀 — `make.py` 와 `deck.py` 는 부르지 않는다 (설계: ig-ppt-integration "순환")
#
#   되위임 폴백이 사는 지점은 글로벌에 정확히 둘이다:
#       deck.py  폴백 ①      → "프로젝트에 m2slide 가 있으면 m2slide.sh --pptx 에 위임"
#       make.py  lane A      → deck.py 를 부른다 (그래서 같은 폴백을 물려받는다)
#   m2slide 가 이 둘 중 하나라도 부르면 m2slide.sh → deck.py → m2slide.sh … 무한 재귀다.
#
#   그래서 이 스크립트는 **되위임 폴백이 없는 하위 스크립트만** 직접 부른다:
#       ppt-init/scripts/init.py        · ppt-check/scripts/check.py
#       ig-selector/scripts/igselect.py · ig-maker/scripts/igpath.py (경로 해소)
#   lane A 는 기존 `build-pptx.sh` 가 `md2pptx.py` 를 직접 호출한다(Issue315 이래의 원칙).
#   호출 방향이 **m2slide → 글로벌 단방향**임이 이것으로 성립한다.
#
#   그 위에 `m2slide.sh` 가 `M2SLIDE_PPTX_DEPTH` **재진입 가드**를 건다. 글로벌이 앞으로
#   어떤 경로로든 되불러도 루프가 되지 않고 **즉시 실패**한다 — 정적 원칙(위)과 동적 차단
#   (가드)을 둘 다 두는 이유는, 원칙은 사람이 어기고 가드는 어겨지지 않기 때문이다.
#
# ⚠️ lane 을 자동으로 고르지 않는다
#   m2slide 의 원본은 언제나 마크다운이므로 **lane A 고정**이다. lane B(도형)·C(ig-maker)는
#   옵트인이고, C 는 장당 33만 토큰이라 `ig-selector` 승인 게이트가 존재 이유다.
#   여기서는 그 게이트를 **호출해 결과를 보여줄 뿐** 팬아웃하지 않는다.
#
# 사용:
#   ppt-make.sh <project_dir> <out_pptx> [--ig] [--ig-pages 3,7] [build-pptx 인자…]
#
# 종료 코드
#   0 덱 완주(검증 통과) · 1 생성 실패 · 2 검증 실패 · 4 덱은 나왔고 인포그래픽 **승인 대기**
set -euo pipefail

PROJECT_DIR="${1:?project_dir 필요}"
OUT="${2:?out_pptx 필요}"
shift 2 || true

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
K="${M2SLIDE_PPT_SCAR:-$HOME/.claude/skills}"

INIT="$K/ppt-init/scripts/init.py"
CHECK="$K/ppt-check/scripts/check.py"
IGSELECT="$K/ig-selector/scripts/igselect.py"
IGPATH="$K/ig-maker/scripts/igpath.py"
BUILD="$SCRIPT_DIR/build-pptx.sh"

# ── 인자 분리 — 내 것만 떼고 나머지는 build-pptx.sh 로 흘린다
WANT_IG=0
IG_PAGES=""
PASS=()
while [ "$#" -gt 0 ]; do
  case "$1" in
    --ig)        WANT_IG=1 ;;
    --ig-pages)  WANT_IG=1; IG_PAGES="${2:?--ig-pages 값 필요}"; shift ;;
    --ig-pages=*) WANT_IG=1; IG_PAGES="${1#*=}" ;;
    *)           PASS+=("$1") ;;
  esac
  shift
done

PROJECT_NAME="$(basename "$PROJECT_DIR")"
STAGES=()          # "상태|단계|비고" — 마지막 보고 표

note() { STAGES+=("$1|$2|$3"); }

echo ""
echo "🎼 ppt-maker 오케스트레이션 — $PROJECT_NAME"

# ── 1. 입력 판정 — **자동으로 고르지 않는다**
#   m2slide 의 원본은 `markdown/*.md`(또는 single mode 의 `<N>.md`) 뿐이라 lane 은 A 로
#   결정돼 있다. 확장자 표를 여기에 다시 적으면 글로벌 판정의 사본이 되고, 사본은 갈린다.
echo "  ① 입력 판정 — 원본=마크다운 → lane A 고정 (lane B/C 는 옵트인·게이트 뒤)"
note "✅" "① 입력 판정" "lane A (자동 선택 없음)"

# ── 2. 앞단 `ppt-init` — 덱 폴더·자산 확보 (멱등)
#
#   ⚠️ **옵트인일 때만 돈다.** `pptx.yml` 을 전 프로젝트에 롤아웃하지 않는다는 판정이
#      이미 서 있다(ig-ppt-integration "알려진 편차·미해결"). 설정이 없는 프로젝트에서
#      돌리면 `ppt/` 골격이 조용히 생겨 그 판정을 뒤집는다.
#   경로는 내가 계산하지 않고 **글로벌 `igpath resolve`** 에 묻는다 — 4키 해소 규칙이
#   그쪽 소유이므로 여기에 사본을 두면 두 벌이 갈린다.
PPT_ROOT=""
if [ -f "$PROJECT_DIR/.claude/pptx.yml" ] && [ -f "$IGPATH" ]; then
  PPT_ROOT="$(python3 "$IGPATH" resolve --start "$PROJECT_DIR" --json 2>/dev/null \
    | python3 -c 'import json,sys; print(json.load(sys.stdin).get("ppt_root",""))' 2>/dev/null || true)"
fi

if [ -z "$PPT_ROOT" ]; then
  echo "  ② 앞단 ppt-init — 건너뜀 (이 프로젝트는 ppt 자산 옵트인이 아니다)"
  echo "     옵트인하려면: cp data/ppt-integration/pptx.yml.template $PROJECT_DIR/.claude/pptx.yml"
  note "–" "② 앞단 ppt-init" "옵트인 아님 — 건너뜀"
elif [ ! -f "$INIT" ]; then
  echo "  ⚠️ ② 앞단 ppt-init — 스크립트 없음: $INIT" >&2
  note "⚠️" "② 앞단 ppt-init" "글로벌 SCAR 없음"
else
  DECK_SCOPE="$(basename "$PPT_ROOT")"
  DECK_ROOT="$(dirname "$PPT_ROOT")"
  echo "  ② 앞단 ppt-init — 덱=$DECK_SCOPE  루트=$DECK_ROOT (멱등)"
  if python3 "$INIT" "$DECK_SCOPE" --root "$DECK_ROOT" --lane a >/dev/null 2>&1; then
    note "✅" "② 앞단 ppt-init" "$DECK_SCOPE (멱등)"
  else
    echo "     ⚠️ ppt-init 실패 — lane A 는 이 자산에 의존하지 않으므로 계속 진행한다" >&2
    note "⚠️" "② 앞단 ppt-init" "실패 (lane A 무관)"
  fi
fi

# ── 3. lane A — 원고 → 덱. **기존 경로 그대로**다(재귀 없는 md2pptx.py 직접 호출)
echo "  ③ lane A — build-pptx.sh (md2pptx.py 직접 · deck.py 우회)"
RC=0
"$BUILD" "$PROJECT_DIR" "$OUT" ${PASS[@]+"${PASS[@]}"} || RC=$?
case "$RC" in
  0) note "✅" "③ lane A" "$(basename "$OUT")" ;;
  2) note "❌" "③ lane A" "검증 실패 (산출물은 존재)" ;;
  *) note "❌" "③ lane A" "생성 실패 (rc=$RC)" ;;
esac
[ "$RC" = "0" ] || { printf '\n%s\n' "🎼 중단 — lane A 가 끝나지 않았다 (rc=$RC)"; exit "$RC"; }

# ── 4. 뒷단 `ppt-check` — 검증 5종 일괄 (읽기 전용). **보고하되 차단하지 않는다**
#
#   ⚠️ 차단 지점은 ③ 이다(Issue317). 뒷단이 두 번째 게이트가 되면 판정 지점이 둘로 갈린다.
#      ppt-maker 의 7단계는 *"통과하지 못하면 완료가 아니다"* 인데, m2slide 에서 그 역할은
#      ③ 이 이미 한다 — `build-pptx.sh` 가 `check-conform`·`check-xml-order` 를 돌려 FAIL 이면
#      rc2 로 끊는다. 즉 **PowerPoint 가 거부하는 위반은 여기 오기 전에 이미 걸러졌다.**
#      뒷단이 더하는 것은 폭(legible·analyze·팔레트)이지 두 번째 차단이 아니다.
#
#   ⚠️ 그리고 그 폭에는 **오탐이 성립한다.** 실측(2026-08-25, aTest p24): `check-legible` 이
#      *"mermaid 원문 노출 — 'flowchart TD'"* 로 FAIL 했지만 실제 문장은 문법 소개 덱의 산문
#      `flowchart TD 위→아래 흐름` 이었다. 글로벌 휴리스틱의 오탐으로 배포를 막으면, m2slide 가
#      고칠 수 없는 판정이 빌드를 죽인다(그리고 그 회피 수단은 검증을 끄는 것뿐이 된다).
#      그래서 **보고는 크게, 차단은 ③ 에** 둔다.
#
#   ⚠️ `--theme` 는 주지 않는다. 팔레트 대조는 theme.yml 을 정본으로 보는데, m2slide 는
#      제목색·강조색을 **CSS 실측으로 의도적으로 덮는다**(pptx-parity-design "색 판정").
#      그 상태로 대조하면 설계대로 동작한 결과가 FAIL 로 나온다 — 판정이 뒤집힌다.
#      대신 팔레트는 아래에서 의도적 이탈만 허용한 **비차단 정보**로 따로 찍는다.
WORK="$PROJECT_DIR/_pipeline/pptx"
REF="$WORK/reference.pptx"

SKIP_VERIFY=0
for p in ${PASS[@]+"${PASS[@]}"}; do
  [ "$p" = "--no-verify" ] && SKIP_VERIFY=1
done

if [ "$SKIP_VERIFY" = "1" ]; then
  echo "  ④ 뒷단 ppt-check — 건너뜀 (--pptx-no-verify 로 검증을 명시 포기했다)"
  note "–" "④ 뒷단 ppt-check" "검증 생략 지시"
elif [ ! -f "$CHECK" ]; then
  echo "  ⚠️ ④ 뒷단 ppt-check — 스크립트 없음: $CHECK" >&2
  note "⚠️" "④ 뒷단 ppt-check" "글로벌 SCAR 없음"
else
  echo "  ④ 뒷단 ppt-check — 검증 5종 일괄 (--lane a · 보고 전용, 차단은 ③ 소관)"
  CK_ARGS=(--lane a)
  [ -f "$REF" ] && CK_ARGS+=(--template "$REF")
  CK_RC=0
  python3 "$CHECK" "$OUT" "${CK_ARGS[@]}" 2>&1 | sed 's/^/     /' || CK_RC=${PIPESTATUS[0]}
  if [ "$CK_RC" = "0" ]; then
    note "✅" "④ 뒷단 ppt-check" "FAIL 0"
  else
    echo "     ⚠️ 뒷단에 FAIL 이 있다(rc=$CK_RC). ③ 의 규격 검증은 이미 통과했으므로 빌드는" >&2
    echo "        막지 않는다 — 위 판정 줄을 읽고 실재 결함인지 휴리스틱 오탐인지 가른다." >&2
    note "⚠️" "④ 뒷단 ppt-check" "FAIL 있음 (rc=$CK_RC) — 보고만"
  fi
fi

# ── 4-b. 팔레트 이탈 — **비차단 정보**. 조용히 묻지 않는다
#   m2slide 가 의도적으로 넣는 강조색은 허용하고(그것은 설계다), 그래도 남는 이탈만 센다.
#   남는 것이 있으면 그것은 pandoc 이 박은 값이다(`Courier` 와 같은 계열의 결함).
MEASURED="$WORK/measured.env"
PAL="$K/ppt-check/scripts/check-palette.py"
if [ "$SKIP_VERIFY" = "0" ] && [ -f "$PAL" ] && [ -f "$WORK/theme.yml" ]; then
  ALLOW=()
  if [ -f "$MEASURED" ]; then
    # shellcheck disable=SC1090
    while IFS='=' read -r k v; do
      case "$k" in
        TITLE_COLOR|STRONG_COLOR) [ -n "$v" ] && ALLOW+=(--allow "$v") ;;
      esac
    done < "$MEASURED"
  fi
  PAL_OUT="$(python3 "$PAL" "$OUT" --theme "$WORK/theme.yml" ${ALLOW[@]+"${ALLOW[@]}"} 2>/dev/null | tail -1 || true)"
  [ -n "$PAL_OUT" ] && echo "     [정보] 팔레트 $PAL_OUT"
fi

# ── 5. 인포그래픽 — `ig-selector` 게이트. **팬아웃하지 않는다**
#
#   여기서 대신 팬아웃하면 비용 승인 게이트(장당 33만 토큰)와 실행이 갈린다.
#   선별·승인·팬아웃·조합·발행은 전부 ig-selector 소유다 — 나는 호출하고 결과를 받는다.
#   입력은 방금 만든 덱이다. lane A 를 건너뛰고 C 로 가지 않는다는 원칙과도 맞는다.
if [ "$WANT_IG" = "0" ]; then
  echo "  ⑤ 인포그래픽 — 건너뜀 (옵트인 아님)"
  echo "     후보를 보려면: ./m2slide.sh $PROJECT_NAME --ppt-make --ig"
  note "–" "⑤ 인포그래픽" "옵트인 아님 — 건너뜀"
  IG_RC=0
elif [ ! -f "$IGSELECT" ]; then
  echo "  ⚠️ ⑤ 인포그래픽 — 스크립트 없음: $IGSELECT" >&2
  note "⚠️" "⑤ 인포그래픽" "글로벌 SCAR 없음"
  IG_RC=0
else
  echo "  ⑤ 인포그래픽 — ig-selector 선별·비용 게이트 (팬아웃 없음)"
  python3 "$IGSELECT" scan "$OUT" --start "$PROJECT_DIR" 2>&1 | sed 's/^/     /' || true
  IG_RC=0
  COST=(cost "$OUT" --start "$PROJECT_DIR")
  [ -n "$IG_PAGES" ] && COST+=(--pages "$IG_PAGES")
  python3 "$IGSELECT" "${COST[@]}" >/dev/null 2>&1 || IG_RC=$?
  #   ig-selector 의 인자는 **덱 이름**이다(프로젝트 이름이 아니다) — 해소된 ppt_root 가
  #   있으면 그 basename 을 쓰고, 없으면 프로젝트 이름으로 안내한다
  IG_SCOPE="${PPT_ROOT:+$(basename "$PPT_ROOT")}"
  IG_SCOPE="${IG_SCOPE:-$PROJECT_NAME}"
  if [ "$IG_RC" = "4" ]; then
    echo "     ⏸ 팬아웃은 여기서 하지 않는다. 승인·실행은 ig-selector 소유다:"
    echo "        /ppt select $IG_SCOPE${IG_PAGES:+ --pages $IG_PAGES}"
    note "⏸" "⑤ 인포그래픽" "승인 대기 (비용 게이트 exit 4)"
  else
    echo "     승인 게이트 통과 — 실행은 ig-selector 가 한다: /ppt select $IG_SCOPE"
    note "✅" "⑤ 인포그래픽" "게이트 통과 (팬아웃은 별도)"
  fi
fi

# ── 6. 보고 — 어느 단계가 돌았고 무엇이 나왔는지 한 화면에
echo ""
echo "🎼 ppt-maker 요약 — $PROJECT_NAME"
for s in "${STAGES[@]}"; do
  IFS='|' read -r st name memo <<<"$s"
  #   한글은 바이트폭과 표시폭이 달라 printf 의 `%-Ns` 정렬이 어긋난다 — 구분자로 맞춘다
  printf '   %s %s — %s\n' "$st" "$name" "$memo"
done
echo "   산출물  $OUT"

if [ "${IG_RC:-0}" = "4" ]; then
  echo "   ⏸ 덱은 완주했다. 인포그래픽만 승인 대기다(비용 게이트)."
  exit 4
fi
echo "   ✅ 완주"
exit 0
