#!/usr/bin/env bash
# build-pptx.sh — m2slide 프로젝트 → 테마 반영 pptx (Issue315·316)
#
#   기존 경로: `pandoc <md...> -o x.pptx` 직접 호출 → --reference-doc 이 없어
#   테마·팔레트가 전부 소실되고 `#layout-*` 지시자까지 본문에 누출됐다.
#
#   현재 경로: 글로벌 ppt-* SCAR 3종을 순서대로 잇는다.
#     ① ppt-spec/theme-from-css.py  — 빌드 산출 CSS 실측 → theme.yml
#     ② ppt-deck/theme2reference.py — theme.yml → pandoc reference-doc
#     ③ ppt-deck/md2pptx.py         — --m2slide 진입점으로 원고 → pptx
#
#   ⚠️ ppt-deck 의 deck.py 는 쓰지 않는다. 그쪽 폴백 ①이 m2slide.sh 로 되위임하므로
#      m2slide.sh → deck.py → m2slide.sh 무한 재귀가 된다. md2pptx.py 직접 호출은
#      그 재귀가 성립하지 않는다.
#
# 사용: build-pptx.sh <project_dir> <out_pptx> [--pages 1-3]
set -euo pipefail

PROJECT_DIR="${1:?project_dir 필요}"
OUT="${2:?out_pptx 필요}"
shift 2 || true

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
K="${M2SLIDE_PPT_SCAR:-$HOME/.claude/skills}"

SPEC="$K/ppt-spec/scripts/theme-from-css.py"
T2R="$K/ppt-deck/scripts/theme2reference.py"
MD2P="$K/ppt-deck/scripts/md2pptx.py"

for f in "$SPEC" "$T2R" "$MD2P"; do
  if [ ! -f "$f" ]; then
    echo "  ❌ ppt-* 글로벌 SCAR 없음: $f" >&2
    echo "     PPTX 산출은 이 3종에 의존한다. 구 pandoc 직접 경로로 폴백하지 않는다" >&2
    echo "     (테마가 통째로 빠진 산출물이 조용히 나오는 품질 회귀를 막기 위함)" >&2
    exit 1
  fi
done

# ── 설정 해소 — lib/config.js 와 같은 우선순위 (프로젝트 > 루트 > org)
cfg_get() {
  python3 - "$1" "$PROJECT_DIR/_config.yml" "$ROOT_DIR/_config.yml" "$ROOT_DIR/_config.org.yml" <<'PY'
import os, re, sys
key = sys.argv[1]
for path in sys.argv[2:]:
    if not os.path.isfile(path):
        continue
    for line in open(path, encoding="utf-8"):
        m = re.match(r"^%s:\s*(.*)$" % re.escape(key), line)
        if not m:
            continue
        v = re.sub(r"\s+#.*$", "", m.group(1)).strip().strip("\"'")
        if v:
            print(v)
            sys.exit(0)
        break
PY
}

THEME="$(cfg_get theme)"; THEME="${THEME:-default}"
PALETTE="$(cfg_get palette)"

WORK="$PROJECT_DIR/_pipeline/pptx"
mkdir -p "$WORK"
THEME_YML="$WORK/theme.yml"
REF="$WORK/reference.pptx"

echo "  theme=$THEME palette=${PALETTE:-(none)}"

# ── ① CSS 실측 → theme.yml
SPEC_ARGS=(--theme "$THEME" --name m2slide --out "$THEME_YML")
[ -n "$PALETTE" ] && SPEC_ARGS+=(--palette "$PALETTE")
python3 "$SPEC" "$PROJECT_DIR" "${SPEC_ARGS[@]}" >/dev/null

# ── ①-b accent 는 글로벌이 판정한다 (Issue323 종결, 2026-08-18)
#   한때 여기에 교정 블록이 있었다 — `theme-from-css` 가 `--m2-accent-N`(palette 스코프
#   전용)만 보아 palette 미지정 덱에서 첫 스코프(warm)를 물던 오탐 때문이다.
#   **prj3#Issue434(commit cc01ad8)가 `:root --kn-accent` 폴백을 글로벌에 넣어 해소**됐고,
#   같은 일을 두 곳에서 하면 판정이 갈리므로 로컬 사본을 걷어냈다.
#   실측(2026-08-18): 글로벌 단독 산출이 구 교정본과 accent 4색 전부 일치
#   (#F5C518 #FFE15A #C49D13 #977A0E — 실렌더 `--kn-accent` 와 같다).

# ── ② theme.yml → reference.pptx
python3 "$T2R" "$THEME_YML" --out "$REF" --adapt >/dev/null

# ── ③ 원고 → pptx (+ 산출 직후 검증 — md2pptx 가 check-conform 을 내장 호출한다)
#
#   ⚠️ check-conform 은 **`--lane a` 가 필수**다. 기본값은 `b`(인포그래픽)라서
#      lane A 덱을 그 기본값으로 재면 mermaid 렌더 이미지를 "본문 이미지화"로 보고
#      FAIL 한다 — 실측: 같은 pptx 가 lane a rc0 / lane b rc1 (Issue317).
#      md2pptx 가 이미 `--lane a` 로 부르므로 여기서 따로 부르지 않는다.
#      손으로 재검할 때만 주의하면 된다.
#
#   md2pptx 의 rc 는 **생성 실패와 검증 실패가 둘 다 1** 이라 구분되지 않는다.
#   호출자에게 둘은 전혀 다른 사건이므로(전자는 산출물이 없고, 후자는 있는데
#   못 쓴다) 산출 파일이 이번 실행에서 갱신됐는지로 가른다.
BEFORE_MTIME=""
[ -f "$OUT" ] && BEFORE_MTIME="$(stat -f %m "$OUT" 2>/dev/null || stat -c %Y "$OUT" 2>/dev/null || echo "")"

#   ⚠️ `--slide-level 2` 는 **m2slide 규약에서 나온다** (Issue326). m2slide 는
#      **H2 가 슬라이드 제목**이고(md-m2slide-rules) H1 은 챕터 그룹이다. 기본값 `1`
#      로 두면 H2 가 본문 첫 줄로 강등돼 **제목 placeholder 가 통째로 비고**, 개요
#      보기·목차·접근성이 함께 죽는다. 실측(2026-08-18) — 같은 원고에서 레벨만 바꿈:
#        igTest(chapter) 35장 Title  5(14%) → 45장 Title 39(87%)   ※ 원본 슬라이드 39장
#        aTest (single)  41장 Title  8(20%) → 42장 Title 38(90%)
#      두 모드 다 개선된다 — single 도 H2 가 슬라이드 제목이라 규약이 같기 때문이다.
#      사용자가 `--slide-level` 을 직접 주면 그쪽이 이긴다(뒤에 오는 "$@" 가 덮는다).
#   ⚠️ `--m2slide <폴더>`(자동 수집) 대신 **중간 원고**를 넘긴다 (Issue327).
#      m2slide 만 아는 것(빌드 지식·고유 지시자·이미지가 사는 두 자리)을 전달할 통로가
#      달리 없기 때문이다. 글로벌 변환기를 m2slide 전용으로 고치지 않는 대신,
#      m2slide 가 자기가 아는 것을 원고로 적어서 준다.
#      설계: _doc_arch/pptx-parity-design.md "아키텍처 결정"
BUILD_SRC="$SCRIPT_DIR/build-source.py"
[ -f "$BUILD_SRC" ] || { echo "  ❌ 원고 생성기 없음: $BUILD_SRC" >&2; exit 1; }

SRC_FILES=()
while IFS= read -r line; do [ -n "$line" ] && SRC_FILES+=("$line"); done \
  < <(python3 "$BUILD_SRC" "$PROJECT_DIR")
# 생성 0건은 조용히 넘기지 않는다 — 빈 덱이 "성공" 으로 나오는 실패 모양을 막는다
[ "${#SRC_FILES[@]}" -gt 0 ] || { echo "  ❌ 중간 원고 생성 0건" >&2; exit 1; }

rc=0
python3 "$MD2P" "${SRC_FILES[@]}" --reference "$REF" -o "$OUT" --slide-level 2 "$@" || rc=$?
[ "$rc" = "0" ] && exit 0

AFTER_MTIME=""
[ -f "$OUT" ] && AFTER_MTIME="$(stat -f %m "$OUT" 2>/dev/null || stat -c %Y "$OUT" 2>/dev/null || echo "")"

if [ -n "$AFTER_MTIME" ] && [ "$AFTER_MTIME" != "$BEFORE_MTIME" ]; then
  echo "  ❌ 검증 실패 — pptx 는 만들어졌지만 규격 위반이 남아 있다 (rc=$rc)" >&2
  echo "     위 check-conform·check-xml-order 판정의 FAIL 항목을 보라." >&2
  echo "     FAIL 은 PowerPoint 가 거부하거나 깨져 보이는 위반이다 — 배포 대상이 아니다." >&2
  echo "     WARN 은 여기서 막지 않는다(판정은 check-conform 이 가른다)." >&2
  exit 2      # 2 = 검증 실패 (산출물은 존재)
fi
echo "  ❌ 생성 실패 — pptx 가 만들어지지 않았다 (rc=$rc)" >&2
exit 1        # 1 = 생성 실패 (산출물 없음)
