#!/usr/bin/env bash
# m2slide — decktape 실행 래퍼 (Issue399)
#
# decktape 3.16.1 은 슬라이드마다 Chrome `Page.printToPDF` 를 돌린 뒤, 같은 이름을 가진
# **슬라이드별 폰트 서브셋**을 하나로 통합한다(`printSlide()` 의 `parseFont`). 그런데
# 통합하면서 갈아끼우는 것은 `FontFile2` 하나뿐이고 각 페이지의 `CIDToGIDMap`·`/W`·
# 콘텐츠 스트림 CID 는 그대로 둔다. 게다가 마스터에 이미 윤곽선이 있는 인덱스면 들어온
# 글리프를 **조용히 버린다**. 결과는 «텍스트 레이어는 원문인데 그려지는 글자만 다른» PDF 다.
#
#   실측(2026-09-20 · 1.design_rnd 06-day6, 71장):
#     통합 on  — Type0 참조 1519건 : FontFile2 스트림 37개 (한 개를 69 페이지가 공유, 11KB)
#     통합 off — Type0 참조 1519건 : FontFile2 스트림 984개 (페이지당 1개)
#     같은 페이지의 텍스트 레이어는 양쪽이 **완전히 동일**한데 렌더만 갈렸다
#
# 슬라이드가 적으면 충돌이 적어 드러나지 않는다 — 2장 추출은 멀쩡하고 71장에서 깨진다.
# 그래서 작은 덱만 보고는 «괜찮다» 고 판정하게 된다.
#
# 고칠 곳이 upstream 이라 여기서는 **통합을 끈 사본**을 만들어 그것으로 실행한다.
# 원본은 건드리지 않는다 — 옆에 파일 하나를 더 쓸 뿐이다.
#
# ⚠️ 앵커를 못 찾으면 **죽는다**. 조용히 원본으로 떨어지면 글리프가 깨진 PDF 가
#    «성공» 으로 나오고, 그 손실은 텍스트 추출로는 잡히지 않는다(이 이슈의 증상 자체다).
set -euo pipefail

ANCHOR='  function parseFont([_, entry]) {'
GUARD='    return; // m2slide(Issue399): 슬라이드별 폰트 서브셋 통합 비활성 — 글리프 치환 방지'

# --- decktape 실체 경로 해소 -------------------------------------------------
if command -v decktape >/dev/null 2>&1; then
  _bin="$(command -v decktape)"
else
  _bin="$(npx -y -p decktape which decktape 2>/dev/null | tail -1)"
fi
if [ -z "${_bin:-}" ] || [ ! -e "$_bin" ]; then
  echo "❌ decktape 를 찾지 못했습니다 (PATH·npx 양쪽 실패)" >&2
  exit 127
fi
DT_JS="$(python3 -c 'import os,sys; print(os.path.realpath(sys.argv[1]))' "$_bin")"
if [ ! -f "$DT_JS" ]; then
  echo "❌ decktape 진입점을 해소하지 못했습니다: $_bin → $DT_JS" >&2
  exit 127
fi

# --- 통합을 끈 사본 생성 (매 실행 재생성 — decktape 버전이 바뀌어도 따라간다) ----
DT_PATCHED="$(dirname "$DT_JS")/decktape-m2slide.js"
python3 - "$DT_JS" "$DT_PATCHED" "$ANCHOR" "$GUARD" <<'PY'
import sys, pathlib
src_path, out_path, anchor, guard = sys.argv[1:5]
src = pathlib.Path(src_path).read_text()
if anchor not in src:
    sys.stderr.write(
        "\n❌ Issue399 패치 앵커를 찾지 못했습니다 — decktape 내부가 바뀐 것으로 보입니다.\n"
        f"   대상: {src_path}\n"
        f"   앵커: {anchor!r}\n"
        "   그대로 두면 한글 글리프가 치환된 PDF 가 «성공» 으로 나옵니다.\n"
        "   lib/pdf/decktape-run.sh 의 ANCHOR 를 현재 decktape 소스에 맞춰 갱신하십시오.\n\n")
    sys.exit(3)
out = pathlib.Path(out_path)
patched = src.replace(anchor, anchor + "\n" + guard, 1)
if not out.exists() or out.read_text() != patched:
    out.write_text(patched)
PY

# --- Chrome 해소 (Issue418) ---------------------------------------------------
#   npx 캐시의 decktape 는 puppeteer 가 내려받은 **전용 Chrome** 을 찾는다. `~/.cache/puppeteer`
#   가 비면 «Could not find Chrome (ver. 146…)» 로 전 장이 실패한다(debug_TECH 2026-09-27 —
#   코드 결함이 아니라 환경). 시스템 Chrome 이 있으면 그것을 쓴다 — 실측 33p·27p 정상.
#   ⚠️ 사용자가 PUPPETEER_EXECUTABLE_PATH 를 이미 줬으면 **건드리지 않는다**.
if [ -z "${PUPPETEER_EXECUTABLE_PATH:-}" ]; then
  _pcache="${PUPPETEER_CACHE_DIR:-$HOME/.cache/puppeteer}"
  _sys_chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  if ! ls "$_pcache"/chrome/*/ >/dev/null 2>&1 && [ -x "$_sys_chrome" ]; then
    export PUPPETEER_EXECUTABLE_PATH="$_sys_chrome"
    echo "  ℹ️  puppeteer Chrome 캐시 없음 → 시스템 Chrome 사용 ($_sys_chrome)" >&2
  fi
fi

exec node "$DT_PATCHED" "$@"
