#!/usr/bin/env bash
# 9.single-parity — single mode 덱의 HTML ↔ pptx 장 파리티 + 빌드 게이트 회귀 러너 (Issue418)
#
#   왜 별도 러너인가: [`3.parity.sh`](3.parity.sh) 는 ①③ 을 **챕터 HTML 로** 잰다. single mode 는
#   본문이 `index.html` 하나라 두 축이 skip 되고, 그 사이로 HTML 16장 → pptx 28장 이 빠져나갔다
#   (prj7 점검 2026-09-27 · 빌드 rc=0). 이 러너는 single mode 를 **정본 그대로** 잰다.
#
#   픽스처: `z_test/fixtures/pptx-parity/gate16/` — 저장소에 추적된다. 임시 사본에서 빌드하므로
#   픽스처 폴더에 산출물이 생기지 않는다. `markdown/` 은 있으나 AGENDA.md 는 없다(= single mode).
#
#   단언 (전부 통과해야 rc0 · 실패한 것만 이름으로 보고한다)
#     ① build-green     `--pptx` 가 rc0 이고 최종 check-conform FAIL 0     (16:9 좌표 이탈 포함)
#     ② slide-count     pptx 장 = HTML 장 + agenda                           (챕터 3분할·덱 목차 장 0)
#     ③ title-seq       pptx 제목 순서 = HTML 장 제목 순서
#     ④ cover-meta      표지 제목 = frontmatter title · 부제 전문 · 엔티티 누출 0
#     ⑤ chapter-h1      HTML 챕터 진입 장 제목 = H1 · H2 부제는 본문에 남는다
#     ⑥ lane-c-log      평문으로 남은 블록을 **장 제목으로** 로그에 적는다 · 네이티브로 그린 pie 는 이월 아님
#     ⑦ gate-blocks     최종 check-conform 이 FAIL 이면 rc 2 + FAIL 항목 출력 · `--no-verify` 면 rc 0
#     ⑧ serve-url       dev-server 안내 URL — 저장소 프로젝트는 `/p/<이름>/n/c`, 외부 경로는 file://
#     ⑨ pdf-single      single mode `--pdf` 가 본문(index.html)을 뽑는다      (`--no-pdf` 로 생략)
#
#   사용:  9.single-parity.sh [--no-pdf] [--keep]
set -uo pipefail
cd "$(dirname "$0")/../.."          # → m2slide 루트
ROOT="$PWD"

PDF=1
KEEP=0
for a in "$@"; do
  case "$a" in
    --no-pdf) PDF=0 ;;
    --keep)   KEEP=1 ;;
    *)        echo "알 수 없는 인자: $a" >&2; exit 2 ;;
  esac
done

FIX="$ROOT/z_test/fixtures/pptx-parity/gate16"
[ -d "$FIX" ] || { echo "❌ 픽스처 없음: $FIX" >&2; exit 2; }
WORK="$(mktemp -d /tmp/m2slide-9parity.XXXXXX)"
P="$WORK/gate16"
cp -R "$FIX" "$P"
[ "$KEEP" = 1 ] && echo "── 작업 폴더 유지: $WORK" || trap 'rm -rf "$WORK"' EXIT

echo "── 빌드 (HTML + pptx, 게이트 켠 채로)"
./m2slide.sh "$P" --pptx --no-serve > "$WORK/build.log" 2>&1
RC_BUILD=$?

echo "── 게이트 단독 (최종 check-conform 을 FAIL 스텁으로 바꿔 끼운다)"
STUB="$WORK/stub-check"
mkdir -p "$STUB"
cat > "$STUB/check-conform.py" <<'PY'
import sys
print("=== 판정")
print("  ✕ FAIL  캔버스 이탈 1장 (stub-issue418)")
print("")
print("슬라이드 1장 · FAIL 1 · WARN 0")
sys.exit(1)
PY
cat > "$STUB/check-xml-order.py" <<'PY'
import sys
sys.exit(0)
PY
M2SLIDE_PPT_CHECK="$STUB" lib/pptx/build-pptx.sh "$P" "$WORK/gate.pptx" > "$WORK/gate.log" 2>&1
RC_GATE=$?
M2SLIDE_PPT_CHECK="$STUB" lib/pptx/build-pptx.sh "$P" "$WORK/gate-nv.pptx" --no-verify > "$WORK/gate-nv.log" 2>&1
RC_GATE_NV=$?

echo "── dev-server 안내 URL"
URL_EXT="$(bash -c '. lib/dev-server/lifecycle.sh && dev_server_project_url "$1" "$2"' _ "$P" "$ROOT" 2>&1 || true)"
URL_IN="$(bash -c '. lib/dev-server/lifecycle.sh && dev_server_project_url "$1" "$2"' _ "$ROOT/Projects/aTest" "$ROOT" 2>&1 || true)"

RC_PDF=skip
if [ "$PDF" = 1 ]; then
  echo "── PDF (single mode 본문 포함 여부)"
  ./m2slide.sh "$P" --pdf --no-serve > "$WORK/pdf.log" 2>&1
  RC_PDF=$?
fi

python3 - "$P" "$WORK" "$RC_BUILD" "$RC_GATE" "$RC_GATE_NV" "$URL_EXT" "$URL_IN" "$RC_PDF" <<'PY'
import html as H
import json
import os
import re
import subprocess
import sys
import unicodedata

from pptx import Presentation

P, WORK, RC_BUILD, RC_GATE, RC_GATE_NV, URL_EXT, URL_IN, RC_PDF = sys.argv[1:9]
NAME = os.path.basename(P)
SLIDE = os.path.join(P, "slide")
PPTX = os.path.join(SLIDE, NAME + ".pptx")
LOG = open(os.path.join(WORK, "build.log"), encoding="utf-8", errors="replace").read()

fails, skips = [], []
def ok(tag, msg):   print("  ✅ %s %s" % (tag, msg))
def no(tag, name, msg):
    print("  ❌ %s %s" % (tag, msg)); fails.append(name)
def skip(tag, msg):
    print("  ⏭️  %s %s" % (tag, msg)); skips.append(tag)

def norm(s):
    s = unicodedata.normalize("NFC", s or "")
    return re.sub(r"\s+", " ", s.replace(" ", " ")).strip()

def untag(s):
    return norm(H.unescape(re.sub(r"<[^>]+>", " ", s or "")))

# ── 원고 ──────────────────────────────────────────────────────────────────
src = open(os.path.join(P, "markdown", NAME + ".md"), encoding="utf-8").read()
fm = dict(re.findall(r"^(\w+):[ \t]*(.+)$", src.split("\n---\n", 1)[0], re.M))
H1S = re.findall(r"^#[ \t]+(.+)$", src, re.M)

# ── HTML (정본) ───────────────────────────────────────────────────────────
idx = open(os.path.join(SLIDE, "index.html"), encoding="utf-8").read() if os.path.isfile(os.path.join(SLIDE, "index.html")) else ""
secs = re.findall(r'(<section\b[^>]*data-slide-hash="[^"]*"[^>]*>)(.*?)(?=<section\b[^>]*data-slide-hash=|</div>\s*</div>\s*<script|\Z)', idx, re.S)
def sec_title(attrs, body):
    for pat in (r'class="chapter-title"[^>]*>(.*?)</h1>', r'<h[1-6][^>]*class="[^"]*\btitle\b[^"]*"[^>]*>(.*?)</h[1-6]>',
                r'class="contents-title"[^>]*>(.*?)</', r'class="cover-title"[^>]*>(.*?)</div>'):
        m = re.search(pat, body, re.S)
        if m:
            return untag(m.group(1))
    return ""
html_titles = [sec_title(a, b) for a, b in secs]
has_agenda = os.path.isfile(os.path.join(SLIDE, "agenda.html"))

# ── PPTX ──────────────────────────────────────────────────────────────────
slides, ptitles, ptexts = [], [], []
if os.path.isfile(PPTX):
    prs = Presentation(PPTX)
    slides = list(prs.slides)
    for s in slides:
        t, allt = "", []
        for sh in s.shapes:
            if not sh.has_text_frame:
                continue
            tx = norm(sh.text_frame.text)
            if tx:
                allt.append(tx)
            if not t and sh.is_placeholder and sh.name.startswith("Title"):
                t = tx
        ptitles.append(t)
        ptexts.append(allt)

# ① build-green
fin = re.search(r"최종 슬라이드 (\d+)장 · FAIL (\d+)", LOG)
if RC_BUILD != "0":
    no("①", "build-green", "빌드 rc=%s — %s" % (RC_BUILD, " / ".join(l.strip() for l in LOG.splitlines() if "❌" in l or "FAIL" in l)[:300]))
elif not fin or fin.group(2) != "0":
    no("①", "build-green", "최종 판정 %s — rc0 인데 FAIL 이 남았다" % (fin.group(0) if fin else "없음"))
else:
    ok("①", "빌드 rc0 · %s" % fin.group(0))

# ② slide-count
want = len(secs) + (1 if has_agenda else 0)
if not slides:
    no("②", "slide-count", "pptx 없음: %s" % PPTX)
elif len(slides) == want:
    ok("②", "pptx %d장 = HTML %d장 + agenda %d" % (len(slides), len(secs), 1 if has_agenda else 0))
else:
    no("②", "slide-count", "pptx %d장 ≠ HTML %d장 + agenda %d — pptx 제목: %s"
       % (len(slides), len(secs), 1 if has_agenda else 0, " | ".join(ptitles)))

# ③ title-seq — 표지(0)·agenda(1) 를 뺀 본문 순서
body_p = [t for i, t in enumerate(ptitles) if i >= (2 if has_agenda else 1)]
body_h = html_titles[1:]
if not slides:
    no("③", "title-seq", "pptx 없음")
elif body_p == body_h:
    ok("③", "제목 순서 일치 %d장" % len(body_h))
else:
    diff = [(i, h, p) for i, (h, p) in enumerate(zip(body_h + [""] * 99, body_p + [""] * 99)) if h != p][:4]
    no("③", "title-seq", "불일치 — " + " / ".join("#%d HTML «%s» ≠ pptx «%s»" % d for d in diff))

# ④ cover-meta
cov = ptexts[0] if ptexts else []
ents = [t for ts in ptexts for t in ts if re.search(r"&(?:lt|gt|amp|quot|#\d+);", t)]
prob = []
if not slides or ptitles[0] != norm(fm.get("title", "")):
    prob.append("표지 제목 «%s» ≠ frontmatter «%s»" % (ptitles[0] if slides else "", fm.get("title")))
if norm(fm.get("subtitle", "")) not in cov:
    prob.append("부제 전문 없음 — 표지 글자: %s" % " | ".join(cov)[:200])
if ents:
    prob.append("엔티티 누출 %d — %s" % (len(ents), ents[0][:80]))
if prob:
    no("④", "cover-meta", " / ".join(prob))
else:
    ok("④", "표지 제목·부제 = frontmatter · 엔티티 누출 0")

# ⑤ chapter-h1 — HTML 챕터 진입 장
chap = [(a, b) for a, b in secs if "layout-chapter" in a]
prob = []
if len(chap) != len(H1S):
    prob.append("챕터 진입 장 %d ≠ 원고 H1 %d" % (len(chap), len(H1S)))
for (a, b), h1 in zip(chap, H1S):
    t = sec_title(a, b)
    if t != norm(h1):
        prob.append("제목 «%s» ≠ H1 «%s»" % (t, h1))
for sub in ("반복되는 판단을 줄인다", "02. 먼저 무엇을, 그다음 무엇으로"):
    if sub not in untag(idx):
        prob.append("H2 부제 «%s» 가 HTML 에 없다" % sub)
    #   pptx 에서도 부제가 **글자 그대로** 남아야 한다 — `02.` 로 시작하는 부제를 문단으로
    #   옮기면 pandoc 이 번호 목록으로 읽어 `2.` 로 바꾼다(visual-gen-gate 렌더 실측)
    if slides and not any(sub in t for ts in ptexts for t in ts):
        prob.append("pptx 에 부제 «%s» 가 글자 그대로 없다" % sub)
if prob:
    no("⑤", "chapter-h1", " / ".join(prob))
else:
    ok("⑤", "챕터 진입 장 %d개 제목 = H1 · H2 부제 본문 잔존" % len(chap))

# ⑥ lane-c-log
side = os.path.join(P, "_pipeline", "pptx", "lane-b.json")
if not os.path.isfile(side):
    no("⑥", "lane-c-log", "사이드카 없음")
else:
    tg = json.load(open(side, encoding="utf-8")).get("targets", [])
    flat = [t for t in tg if t.get("lane") == "c" and t.get("raw") != "htmlart pie"]
    miss = [t["title"] for t in flat if t.get("title") and t["title"] not in LOG]
    summ = [l for l in LOG.splitlines() if "lane C 이월" in l and "—" in l]
    pie_listed = any("pie" in l for l in summ)
    if not flat:
        no("⑥", "lane-c-log", "픽스처에 평문 이월 대상이 없다 — 픽스처가 축을 잃었다")
    elif miss or pie_listed:
        no("⑥", "lane-c-log", "로그에 장 제목 없음 %s%s"
           % (miss, " · 네이티브 pie 가 이월로 집계됨" if pie_listed else ""))
    else:
        ok("⑥", "평문 이월 %d건 전부 장 제목으로 기록 · pie 는 이월 아님" % len(flat))

# ⑦ gate-blocks
glog = open(os.path.join(WORK, "gate.log"), encoding="utf-8", errors="replace").read()
if RC_GATE == "2" and "stub-issue418" in glog and RC_GATE_NV == "0":
    ok("⑦", "FAIL → rc2 + 항목 출력 · --no-verify → rc0")
else:
    no("⑦", "gate-blocks", "FAIL 스텁 rc=%s(기대 2) · 항목 출력 %s · --no-verify rc=%s(기대 0)"
       % (RC_GATE, "stub-issue418" in glog, RC_GATE_NV))

# ⑧ serve-url
exp_ext = "file://" + os.path.join(P, "slide", "index.html")
if URL_EXT == exp_ext and re.fullmatch(r"http://[\d.]+:\d+/p/aTest/n/c", URL_IN or ""):
    ok("⑧", "외부 → %s · 저장소 → %s" % ("file://…/slide/index.html", URL_IN))
else:
    no("⑧", "serve-url", "외부 «%s» (기대 %s) · 저장소 «%s» (기대 http://…/p/aTest/n/c)"
       % (URL_EXT[:120], exp_ext, URL_IN[:120]))

# ⑨ pdf-single
if RC_PDF == "skip":
    skip("⑨", "--no-pdf")
else:
    plog = open(os.path.join(WORK, "pdf.log"), encoding="utf-8", errors="replace").read()
    pdf = os.path.join(SLIDE, NAME + ".pdf")
    n = None
    if os.path.isfile(pdf):
        #   쪽 수는 m2slide.sh 의 `Printed N` 대조와 같은 수단(Quartz)으로 잰다 — pypdf 는 의존이 아니다
        r = subprocess.run(["python3", "-c",
                            "import sys\nfrom Quartz import PDFDocument\nfrom Foundation import NSURL\n"
                            "print(PDFDocument.alloc().initWithURL_(NSURL.fileURLWithPath_(sys.argv[1])).pageCount())",
                            pdf], capture_output=True, text=True)
        try:
            n = int(r.stdout.strip())
        except ValueError:
            n = None
    body = bool(re.search(r"Processing index\.html\.\.\.\s*$", plog, re.M))   # 챕터 모드의 «(덱 표지)» 와 구분
    if RC_PDF == "0" and n == len(secs) and body:
        ok("⑨", "PDF %dp = HTML %d장 (index.html 포함)" % (n, len(secs)))
    else:
        no("⑨", "pdf-single", "rc=%s · %sp (기대 %d) · index.html 처리 %s — %s"
           % (RC_PDF, n, len(secs), "index.html" in plog,
              " / ".join(l.strip() for l in plog.splitlines() if "❌" in l)[:200]))

print()
if fails:
    print("❌ 9.single-parity — 실패 %d: %s%s" % (len(fails), ", ".join(fails),
          (" · 생략 " + ",".join(skips)) if skips else ""))
    sys.exit(1)
print("✅ 9.single-parity — 전부 통과%s" % ((" · 생략 " + ",".join(skips)) if skips else ""))
PY
