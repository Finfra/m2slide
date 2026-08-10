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

# ── ①-b accent 교정
#   theme-from-css 는 --m2-accent-N 만 본다. 그 변수는 palette 스코프에서만 정의되므로
#   palette 미지정 덱은 첫 스코프(warm)로 오탐한다 — 실제 렌더는 테마의 --kn-accent 다.
#   palette 를 명시하지 않은 경우에 한해 kn-accent 로 덮는다.
if [ -z "$PALETTE" ]; then
  python3 - "$THEME_YML" "$PROJECT_DIR/slide/css/custom.css" <<'PY'
import pathlib, re, sys
theme_yml, css = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
if not css.exists():
    sys.exit(0)
m = re.search(r"--kn-accent\s*:\s*(#[0-9A-Fa-f]{3,8})", css.read_text())
if not m:
    sys.exit(0)
base = m.group(1).upper()
soft = re.search(r"--kn-accent-soft\s*:\s*(#[0-9A-Fa-f]{3,8})", css.read_text())
soft = soft.group(1).upper() if soft else base


def shade(hex_color, factor):
    r, g, b = (int(hex_color[i:i + 2], 16) for i in (1, 3, 5))
    return "#%02X%02X%02X" % tuple(max(0, min(255, int(c * factor))) for c in (r, g, b))


dark, darker = shade(base, 0.80), shade(base, 0.62)
s = theme_yml.read_text()
s = re.sub(r'(\n  primary:\s*)"[^"]*"', r'\1"%s"' % base, s, count=1)
s = re.sub(r'(\n  steps:\s*)\[[^\]]*\]',
           r'\1["%s", "%s", "%s", "%s"]' % (base, soft, dark, darker), s, count=1)
for key, val in (("navy", base), ("green", soft), ("orange", dark),
                 ("purple", darker), ("band", base)):
    s = re.sub(r'(\n    %s:\s*)"[^"]*"' % key, r'\1"%s"' % val, s, count=1)
theme_yml.write_text(s)
print("  accent ← --kn-accent %s (palette 미지정 덱 — warm 오탐 교정)" % base)
PY
fi

# ── ② theme.yml → reference.pptx
python3 "$T2R" "$THEME_YML" --out "$REF" --adapt >/dev/null

# ── ③ 원고 → pptx
python3 "$MD2P" --m2slide "$PROJECT_DIR" --reference "$REF" -o "$OUT" "$@"
