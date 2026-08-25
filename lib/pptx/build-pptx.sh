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

# ── ②-b 제목 색 교정 — **CSS 가 정본이다** (Issue329)
#   `theme2reference.title_color()` 는 accent 중 가장 어두운 것(L*≤65)을 제목색으로 고른다.
#   조직 템플릿이 없어 제목색을 *알 수 없을 때* 쓰는 합리적 추정이지만, m2slide 는 그것을
#   **실측할 수 있다** — 모든 theme 이 제목을 `var(--kn-text)` 로 칠한다(default·default_lec
#   양쪽 확인). 실측(2026-08-19): 추정값 #977A0E(어두운 금색) vs 실제 #111111(먹) — 같은
#   덱을 HTML 과 나란히 놓으면 제목만 색이 다르다.
#
#   ⚠️ Issue323 의 교훈("같은 판정을 두 곳에서 하지 마라")과 어긋나지 않는다. 저기서
#      걷어낸 것은 글로벌과 **같은 입력으로 같은 판정**을 반복한 사본이었다. 여기서는
#      글로벌이 갖지 못한 입력(빌드 산출 CSS)을 근거로 **덮어쓴다** — 알 수 없는 쪽의
#      추정보다 알 수 있는 쪽의 실측이 이긴다.
CSSVAR="$SCRIPT_DIR/css-var.py"
TITLE_COL="$(python3 "$CSSVAR" "$PROJECT_DIR" --kn-text --m2-text 2>/dev/null || true)"
if [ -z "$TITLE_COL" ]; then
  echo "  ⚠️ 제목 색 교정 생략 — 빌드 CSS 에서 --kn-text 를 못 찾음" >&2
else
python3 - "$TITLE_COL" "$REF" <<'PY' || echo "  ⚠️ 제목 색 교정 생략(계속 진행)" >&2
import sys
col, ref = sys.argv[1], sys.argv[2]

from pptx import Presentation
from pptx.oxml.ns import qn
from pptx.enum.shapes import PP_PLACEHOLDER
from pptx.enum.text import MSO_AUTO_SIZE
prs = Presentation(ref)
n = 0
for h in [prs.slide_master] + list(prs.slide_master.slide_layouts):
    for ph in h.placeholders:
        try:
            if ph.placeholder_format.type not in (PP_PLACEHOLDER.TITLE,
                                                  PP_PLACEHOLDER.CENTER_TITLE):
                continue
        except Exception:
            continue
        tx = ph._element.find(qn("p:txBody"))
        if tx is None:
            continue
        for lst in tx.findall(qn("a:lstStyle")):
            for clr in lst.iter(qn("a:srgbClr")):
                clr.set("val", col)
                n += 1
        # 제목 넘침 방지 — `Content with Caption` 의 제목칸은 8.4cm 밖에 안 된다(실측).
        # 27pt 한글 제목이 4줄이 되면 칸 밖으로 흘러 **위쪽이 잘린다**. 자동 축소를 켜
        # 잘림 대신 작아지게 한다(기하는 건드리지 않는다 — 그쪽은 글로벌 템플릿 소관).
        try:
            ph.text_frame.word_wrap = True
            ph.text_frame.auto_size = MSO_AUTO_SIZE.TEXT_TO_FIT_SHAPE
        except Exception:
            pass
prs.save(ref)
print("  제목 색 교정 — CSS 실측 #%s 로 placeholder %d개 갱신" % (col, n))
PY
fi

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

#   ⚠️ `--pages` 부분 변환에서는 **표지 파일을 뺀다** (Issue328).
#      표지는 pandoc 메타데이터(`---` 로 둘러싼 YAML)로 적어야 `Title Slide` 가 잡히는데,
#      `md2pptx.slice_pages()` 는 `---` 줄을 **슬라이드 경계로** 보고 자른다. 그 순간
#      YAML 의 여닫이가 경계가 되어 `title: "…"` 이 **본문 블록**으로 승격되고, 슬라이드에
#      글자 그대로 찍힌다 — 실측(2026-08-19): `--pages 1-3` 산출 1번 장 전체가
#      `title: "m2Slide란?" subtitle: "…"` 이었다. 리터럴 누출 0(Issue327)을 깨는 형태다.
#      부분 변환은 특정 장을 들여다보는 디버그 경로이므로 표지 없이도 성립한다.
for arg in "$@"; do
  case "$arg" in
    --pages|--pages=*)
      KEEP=()
      for f in "${SRC_FILES[@]}"; do
        [ "$(basename "$f")" = "00-cover.md" ] && continue
        KEEP+=("$f")
      done
      [ "${#KEEP[@]}" -gt 0 ] && SRC_FILES=("${KEEP[@]}")
      break
      ;;
  esac
done

rc=0
python3 "$MD2P" "${SRC_FILES[@]}" --reference "$REF" -o "$OUT" --slide-level 2 "$@" || rc=$?

# ── ③-b 강조(**bold**) 색 — reference 로는 전달할 수 없다 (Issue329)
#   m2slide 는 `strong` 을 accent 로 칠한다(`--m2-accent-5`, theme/*/slide.css). 그런데 그것은
#   **run 단위 색**이라 placeholder 기본 서식(reference-doc)으로는 표현할 방법이 없다 —
#   pandoc 은 굵게만 넣고 색은 넣지 않는다. 그래서 산출 뒤에 칠한다.
#   실측(2026-08-19): 본문 bold 52 run · 표 0 — 표 헤더에는 안 묻는다(HTML 도 th 는 strong 이 아니다)
#   ⚠️ 반드시 python-pptx API(`font.color.rgb`)로 넣는다. `a:rPr` 의 자식 순서가 스키마로
#      정해져 있어 XML 을 손으로 끼우면 `check-xml-order` 가 잡는 위반이 된다.
if [ "$rc" = "0" ]; then
  #   강조 변수 이름은 CSS 가 정한다 — `section strong { color: var(--…) }` 를 읽어 그 변수를 푼다
  STRONG_VAR="$(python3 - "$PROJECT_DIR/slide/css/custom.css" <<'PY' 2>/dev/null || true
import re, sys
try:
    t = open(sys.argv[1], encoding="utf-8").read()
except OSError:
    raise SystemExit(1)
m = re.search(r"section strong\s*\{[^}]*?color:\s*var\(\s*(--[\w-]+)", t, re.S)
print(m.group(1) if m else "", end="")
PY
)"
  STRONG_COL=""
  [ -n "$STRONG_VAR" ] && STRONG_COL="$(python3 "$SCRIPT_DIR/css-var.py" "$PROJECT_DIR" "$STRONG_VAR" 2>/dev/null || true)"
  if [ -z "$STRONG_COL" ]; then
    echo "  ⚠️ 강조 색 교정 생략 — CSS 에서 strong 색을 못 찾음" >&2
  else
  python3 - "$STRONG_COL" "$OUT" <<'PY' || echo "  ⚠️ 강조 색 교정 생략(계속 진행)" >&2
import sys
col, out = sys.argv[1], sys.argv[2]

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import PP_PLACEHOLDER
from pptx.enum.text import MSO_AUTO_SIZE
prs, n, fit = Presentation(out), 0, 0
for s in prs.slides:
    for sh in s.shapes:
        if not sh.has_text_frame:
            continue
        try:                                    # 제목은 제외 — 제목색은 ②-b 가 이미 정했다
            if sh.placeholder_format.type in (PP_PLACEHOLDER.TITLE,
                                              PP_PLACEHOLDER.CENTER_TITLE):
                # ⚠️ 자동 축소는 **장 쪽에도** 걸어야 한다. pandoc 이 슬라이드마다
                #    빈 `<a:bodyPr/>` 를 적어 넣어 레이아웃의 autofit 설정을 덮는다
                #    (실측: 레이아웃에만 걸었더니 긴 제목이 그대로 잘렸다).
                sh.text_frame.word_wrap = True
                sh.text_frame.auto_size = MSO_AUTO_SIZE.TEXT_TO_FIT_SHAPE
                fit += 1
                continue
        except Exception:
            pass
        for para in sh.text_frame.paragraphs:
            for run in para.runs:
                if run.font.bold:
                    run.font.color.rgb = RGBColor.from_string(col)
                    n += 1
prs.save(out)
print("  강조 색 교정 — CSS 실측 #%s 로 bold run %d개 갱신 · 제목 자동축소 %d장" % (col, n, fit))
PY
  fi
  #   교정 뒤 상태로 다시 잰다 — 검증이 최종 파일을 설명하지 못하면 fail-loud 가 무의미하다
  CK="${M2SLIDE_PPT_CHECK:-$HOME/.claude/skills/ppt-check/scripts}"
  if [ -f "$CK/check-xml-order.py" ]; then
    python3 "$CK/check-xml-order.py" "$OUT" >/dev/null || {
      echo "  ❌ 교정 후 XML 순서 위반 — 교정 로직을 의심하라" >&2; exit 2; }
  fi
  exit 0
fi

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
