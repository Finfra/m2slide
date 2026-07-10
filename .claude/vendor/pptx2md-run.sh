#!/usr/bin/env bash
# pptx2md 한글 친화 래퍼
# - 입력 파일명이 한글이면 임시 ASCII 사본으로 변환 → 이미지 파일명 깨짐 방지
# - --disable-escaping 기본 적용 (마크다운 이스케이프 노이즈 제거)
# - URL 인코딩된 이미지 링크 자동 디코딩
# - Frontmatter 자동 삽입 (`type: ppt`로 H1 다수 허용)
#
# Usage:
#   pptx2md-run.sh <input.pptx> [-o out_dir] [-n basename] [--keep-escape] [--no-frontmatter] [--keep-encoded]

set -eo pipefail

INPUT=""
OUTDIR=""
NAME=""
KEEP_ESCAPE=0
NO_FM=0
KEEP_ENCODED=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        -o|--output) OUTDIR="$2"; shift 2 ;;
        -n|--name) NAME="$2"; shift 2 ;;
        --keep-escape) KEEP_ESCAPE=1; shift ;;
        --no-frontmatter) NO_FM=1; shift ;;
        --keep-encoded) KEEP_ENCODED=1; shift ;;
        -h|--help)
            sed -n '2,12p' "$0"; exit 0 ;;
        *) INPUT="$1"; shift ;;
    esac
done

if [[ -z "$INPUT" || ! -f "$INPUT" ]]; then
    echo "❌ 입력 PPTX 파일이 필요함: $INPUT" >&2
    echo "   Usage: $0 <input.pptx> [-o out_dir] [-n basename]" >&2
    exit 1
fi

# pptx2md 설치 확인
if ! command -v pptx2md >/dev/null 2>&1; then
    echo "❌ pptx2md 미설치. 다음 중 하나로 설치:" >&2
    echo "   uv tool install pptx2md" >&2
    echo "   pip install pptx2md" >&2
    exit 1
fi

ORIG_BASE="$(basename "$INPUT" .pptx)"

# Python으로 ASCII 여부·안전 이름 동시 산출 (macOS bash 3.2의 [:ascii:] 한계 회피)
SAFE_INFO="$(python3 -c "
import re, sys
name = sys.argv[1]
is_ascii = '1' if name.isascii() else '0'
safe = re.sub(r'[^A-Za-z0-9_-]', '', name)
if not safe:
    safe = 'presentation'
print(f'{is_ascii}|{safe}')
" "$ORIG_BASE")"

IS_ASCII="${SAFE_INFO%%|*}"
ASCII_SAFE="${SAFE_INFO##*|}"

# 출력 디렉토리·이름 기본값
if [[ -z "$OUTDIR" ]]; then
    OUTDIR="$(dirname "$INPUT")/${ORIG_BASE}_out"
fi

if [[ -z "$NAME" ]]; then
    if [[ "$IS_ASCII" = "0" ]]; then
        NAME="$ASCII_SAFE"
        echo "ℹ️  한글 입력명 감지 → ASCII 안전명으로 변환: '${ORIG_BASE}' → '${NAME}'"
    else
        NAME="$ORIG_BASE"
    fi
fi

mkdir -p "${OUTDIR}/img"

# 한글 파일명이면 임시 사본 사용 (pptx2md가 입력 basename을 이미지 prefix로 씀)
WORK_INPUT="$INPUT"
TMP_DIR=""
if [[ "$IS_ASCII" = "0" ]]; then
    TMP_DIR="$(mktemp -d)"
    cp "$INPUT" "${TMP_DIR}/${NAME}.pptx"
    WORK_INPUT="${TMP_DIR}/${NAME}.pptx"
    trap 'rm -rf "${TMP_DIR}"' EXIT
fi

# 변환 옵션 구성
FLAGS=()
if [[ $KEEP_ESCAPE -eq 0 ]]; then
    FLAGS+=(--disable-escaping)
fi

echo "🔄 변환: ${INPUT} → ${OUTDIR}/${NAME}.md"
pptx2md "$WORK_INPUT" -o "${OUTDIR}/${NAME}.md" -i "${OUTDIR}/img" "${FLAGS[@]}" 2>&1 | grep -vE 'Converting slides:|WARNING.*Failed to process picture' || true

# 후처리: URL 디코딩 + 빈 alt 보강 + Frontmatter
python3 - "${OUTDIR}/${NAME}.md" "$NAME" "$KEEP_ENCODED" "$NO_FM" <<'PYEOF'
import sys, re, urllib.parse, pathlib, datetime

md_path = pathlib.Path(sys.argv[1])
title = sys.argv[2]
keep_encoded = sys.argv[3] == "1"
no_fm = sys.argv[4] == "1"

content = md_path.read_text(encoding="utf-8")

# 1. 이미지 링크 URL 디코딩 (한글 파일명 가독성 회복)
if not keep_encoded:
    def decode_link(m):
        alt = m.group(1)
        url = urllib.parse.unquote(m.group(2))
        return f"![{alt}]({url})"
    content = re.sub(r"!\[([^\]]*)\]\(([^)]+)\)", decode_link, content)

# 2. 빈 alt 텍스트에 직전 헤딩 자동 삽입
lines = content.split("\n")
last_heading = ""
out_lines = []
for line in lines:
    h = re.match(r"^#{1,3}\s+(.+)$", line)
    if h:
        last_heading = h.group(1).strip()
    if last_heading:
        line = re.sub(r"!\[\]\(", f"![{last_heading}](", line)
    out_lines.append(line)
content = "\n".join(out_lines)

# 3. Frontmatter 자동 삽입 (type: ppt → md-rules H1 다수 허용)
if not no_fm and not content.lstrip().startswith("---"):
    today = datetime.date.today().isoformat()
    fm = (
        "---\n"
        f"title: {title}\n"
        "description: pptx2md 변환 산출물 (PowerPoint → Markdown)\n"
        f"date: {today}\n"
        "type: ppt\n"
        "---\n\n"
    )
    content = fm + content

md_path.write_text(content, encoding="utf-8")
PYEOF

# 결과 통계
IMG_COUNT="$(find "${OUTDIR}/img" -type f 2>/dev/null | wc -l | tr -d ' ')"
HEADING_COUNT="$(grep -cE '^#{1,3} ' "${OUTDIR}/${NAME}.md" 2>/dev/null || echo 0)"
SIZE="$(du -sh "${OUTDIR}" 2>/dev/null | cut -f1)"

# 후처리 적용 여부 메시지
if [[ $KEEP_ESCAPE -eq 0 ]]; then
    MSG_ESCAPE="✓ --disable-escaping (마크다운 이스케이프 제거)"
else
    MSG_ESCAPE="- 이스케이프 유지"
fi
if [[ $KEEP_ENCODED -eq 0 ]]; then
    MSG_ENCODE="✓ URL 인코딩 디코딩 (한글 파일명 복원)"
else
    MSG_ENCODE="- URL 인코딩 유지"
fi
if [[ $NO_FM -eq 0 ]]; then
    MSG_FM="✓ Frontmatter 자동 삽입 (type: ppt)"
else
    MSG_FM="- Frontmatter 미삽입"
fi

echo ""
echo "✅ 변환 완료"
echo "  마크다운  : ${OUTDIR}/${NAME}.md"
echo "  이미지    : ${OUTDIR}/img/ (${IMG_COUNT}개)"
echo "  헤딩 수   : ${HEADING_COUNT}"
echo "  총 크기   : ${SIZE}"
echo ""
echo "후처리 적용:"
echo "  ${MSG_ESCAPE}"
echo "  ${MSG_ENCODE}"
echo "  ✓ 빈 alt 텍스트에 직전 헤딩 자동 삽입"
echo "  ${MSG_FM}"
