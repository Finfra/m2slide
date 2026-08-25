#!/usr/bin/env bash
# 3.parity — 원본 HTML ↔ 산출 pptx 충실도 회귀 러너 (Issue330)
#
#   왜 있나: 기존 `2.deck.sh` 는 *"3장 나오고 색이 있고 지시자가 안 샜다"* 만 본다.
#   그래서 **35장이 제목 없이 나와도 통과했고**, 그 결함이 배포까지 갔다(Issue326 실측).
#   충실도를 눈이 아니라 러너가 판정하게 하는 것이 본 러너의 존재 이유다.
#
#   판정 기준은 **원본 HTML** 이다 — 그쪽이 정본이고, 두 산출물을 같은 잣대로 재는
#   유일한 지점이다. pptx 안에서 자기완결적으로 재면 "무엇과 비교해 틀렸나"가 없다.
#
#   비용 0 — 팬아웃(ig-maker)을 돌리지 않는다. 빌드 + XML 계측뿐이라 매 빌드에 붙일 수 있다.
#
#   단언 7종 (전부 통과해야 rc0 · 실패한 것만 이름으로 보고한다)
#     ① slide-count        슬라이드 수 대응        HTML 본문 장 + 구조 장 = pptx 장
#     ② title-coverage     Title placeholder ≥95%  비어 있는 제목칸은 없는 것과 같다
#     ③ title-parity       제목 문자열·순서 일치   챕터 단위로 정렬해 비교
#     ④ structure-slides   구조 슬라이드 존재      표지 · 목차 · 챕터 진입(Section Header)
#     ⑤ markdown-leak      마크다운 누출 0         `:::`·`{.`·`#layout-*` 류가 청중에게 보임
#     ⑥ font-outside-theme 테마 밖 폰트 0          템플릿이 없는 머신에서 글자가 바뀐다
#     ⑦ conform-lane-a     check-conform FAIL 0    PowerPoint 가 거부하는 위반
#
#   ⚠️ 오탐 주의 — 선례 2건이 있다(1.infographic 의 XML 주석 인용 · `<tspan>` 분절).
#      그래서 ③⑤ 는 XML 날것이 아니라 **렌더 텍스트**(python-pptx `text_frame.text`)로
#      판정한다. run 이 쪼개져도 문단 단위로 다시 붙기 때문이다. ⑥ 만 XML 속성을
#      보는데, 폰트는 애초에 속성이라 분절 오탐이 성립하지 않는다.
#
#   ⚠️ `--lane a` 필수 — 기본값 `b`(인포그래픽)는 본문 이미지를 위반으로 본다.
#      m2slide 덱은 lane A 라 mermaid 렌더 이미지가 정상 콘텐츠다(같은 pptx 실측:
#      lane a rc0 / 미지정 rc1).
#
#
#   📌 현재 상태 (2026-08-25 실측, igTest): **7/7 통과**.
#      한때 ⑥ 만 실패했다(`Courier ×20`). 러너 오탐이 아니라 실재 결함이었고 —
#      reference.pptx 에도 ppt-deck 스크립트에도 Courier 가 없으니 **pandoc 이 코드 스팬에
#      하드코딩**한 것이다(reference-doc 유무와 무관하게 재현) — Issue329 가 `build-pptx.sh`
#      ③-c 에 `retheme.py --font-only` 를 배선해 걷어냈다.
#      ⚠️ 화이트리스트로 덮지 말 것 — 덮는 순간 이 러너의 존재 이유가 사라진다.
#
#   사용:  3.parity.sh [프로젝트명] [--no-build]
set -euo pipefail
cd "$(dirname "$0")/../.."          # → m2slide 루트

PROJ=igTest
BUILD=1
for a in "$@"; do
  case "$a" in
    --no-build) BUILD=0 ;;
    -*)         echo "알 수 없는 인자: $a" >&2; exit 2 ;;
    *)          PROJ="$a" ;;
  esac
done

PDIR="Projects/$PROJ"
PPTX="$PDIR/slide/$PROJ.pptx"
[ -d "$PDIR" ] || { echo "❌ 프로젝트 없음: $PDIR" >&2; exit 2; }

if [ "$BUILD" = 1 ]; then
  # ⚠️ `--pptx-no-verify` 로 짓는다. 빌드 내장 검증이 먼저 죽으면 나머지 6종이 측정되지
  #    않아 "무엇이 몇 개 틀렸나"를 한 번에 못 본다. 검증은 러너가 ⑦ 로 직접 한다 —
  #    건너뛰는 것이 아니라 **판정 지점을 여기로 모으는** 것이다.
  echo "── 빌드 (HTML·pptx 를 같은 소스 상태에서 함께 낸다)"
  ./m2slide.sh "$PROJ" --pptx --pptx-no-verify >/dev/null
else
  echo "── 빌드 생략 (--no-build) — 기존 산출물로 판정한다"
fi

[ -f "$PPTX" ] || { echo "❌ pptx 없음: $PPTX" >&2; exit 1; }

echo "── 검증: $PPTX ↔ $PDIR/slide/*.html"
python3 - "$PROJ" "$PDIR" "$PPTX" <<'PY'
import html as H
import os
import re
import subprocess
import sys
import unicodedata
import zipfile
from collections import Counter

from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE, PP_PLACEHOLDER

PROJ, PDIR, PPTX = sys.argv[1], sys.argv[2], sys.argv[3]
SLIDE_DIR = os.path.join(PDIR, "slide")
CONFORM = os.path.expanduser("~/.claude/skills/ppt-check/scripts/check-conform.py")

fails = []           # 실패한 단언의 이름만 모은다 — 전부 재고 나서 한 번에 보고한다
def ok(tag, msg):    print("  ✅ %s %s" % (tag, msg))
def no(tag, name, msg):
    print("  ❌ %s %s" % (tag, msg))
    fails.append(name)

# ── 정규화 ────────────────────────────────────────────────────────────────
def norm(s):
    s = unicodedata.normalize("NFC", s or "")
    s = s.replace(" ", " ").replace("​", "")
    return re.sub(r"\s+", " ", s).strip()

NUM = re.compile(r"^\d{1,2}(?:\.\d+)*\.?\s+")
def key(s):
    """비교용 키. 챕터 번호 접두를 떨군다 —
    HTML 챕터 TOC 는 `m2slide란?`, pptx Section Header 는 `01. m2slide란?` 로
    같은 것을 다르게 적는다(번호는 AGENDA 소유이고 layout 이 붙이고 뗀다)."""
    return NUM.sub("", norm(s))

def untag(s):
    s = re.sub(r"<br\s*/?>", " ", s or "")
    s = re.sub(r"<[^>]+>", " ", s)
    return norm(H.unescape(s))

# ── HTML(정본) 파싱 ───────────────────────────────────────────────────────
def top_sections(doc):
    """중첩 <section>(수직 슬라이드)을 삼키지 않도록 깊이를 센다."""
    out, depth, start = [], 0, None
    for m in re.finditer(r"<section\b[^>]*>|</section\s*>", doc):
        if m.group(0).startswith("</"):
            depth -= 1
            if depth == 0 and start is not None:
                out.append(doc[start:m.end()]); start = None
        else:
            if depth == 0: start = m.start()
            depth += 1
    return out

TITLE_H = re.compile(
    r'<h([1-3])\b[^>]*class="[^"]*\b(?:title|chapter-title|toc-page-title|cover-title)\b[^"]*"[^>]*>(.*?)</h\1\s*>',
    re.S)
ANY_H = re.compile(r"<h([1-3])\b[^>]*>(.*?)</h\1\s*>", re.S)
def sec_title(sec):
    m = TITLE_H.search(sec) or ANY_H.search(sec)
    return untag(m.group(2)) if m else ""

def read(p):
    with open(p, encoding="utf-8") as fp: return fp.read()

# 챕터 파일 순서는 AGENDA.md 가 정본 (파일명 정렬이 아니라 목차 순서가 덱 순서다)
agenda_md = os.path.join(PDIR, "markdown", "AGENDA.md")
chapters = []        # [(챕터명, html경로)]
if os.path.exists(agenda_md):
    for name, mdfile in re.findall(r"^#{2,3}\s*\[([^\]]+)\]\(\.?/?([^)]+\.md)\)", read(agenda_md), re.M):
        h = os.path.join(SLIDE_DIR, os.path.basename(mdfile)[:-3] + ".html")
        if os.path.exists(h): chapters.append((norm(name), h))
if not chapters:     # single mode 등 AGENDA 없는 덱
    for h in sorted(f for f in os.listdir(SLIDE_DIR) if f.endswith(".html")):
        if h not in ("index.html", "agenda.html"):
            chapters.append(("", os.path.join(SLIDE_DIR, h)))

html_chapters = [[sec_title(s) for s in top_sections(read(h))] for _, h in chapters]
html_body = sum(len(c) for c in html_chapters)

# 구조 장 — HTML 에서는 별도 *페이지*로 존재해 <section> 계수에 안 잡힌다
index_html = os.path.join(SLIDE_DIR, "index.html")
cover_title = ""
has_cover = False
if os.path.exists(index_html):
    for s in top_sections(read(index_html)):
        if "layout-_cover" in s[:300]:
            has_cover, cover_title = True, sec_title(s); break
has_agenda = os.path.exists(os.path.join(SLIDE_DIR, "agenda.html"))
n_prologue = (1 if has_cover else 0) + (1 if has_agenda else 0)

# ── PPTX 파싱 ─────────────────────────────────────────────────────────────
prs = Presentation(PPTX)
slides = list(prs.slides)

TITLE_PH = {PP_PLACEHOLDER.TITLE, PP_PLACEHOLDER.CENTER_TITLE}
def ptitle(s):
    """제목 placeholder 의 **렌더 텍스트**. 없으면 None, 있는데 비었으면 ''."""
    for sh in s.shapes:
        if not sh.is_placeholder: continue
        pf = sh.placeholder_format
        if pf.idx == 0 or pf.type in TITLE_PH:
            return norm(sh.text_frame.text) if sh.has_text_frame else ""
    return None

def texts(shapes):
    for sh in shapes:
        try:
            if sh.shape_type == MSO_SHAPE_TYPE.GROUP:
                for t in texts(sh.shapes): yield t
        except Exception:
            pass
        if sh.has_text_frame: yield sh.text_frame.text
        try:
            if sh.has_table:
                for row in sh.table.rows:
                    for cell in row.cells: yield cell.text
        except Exception:
            pass

ptitles = [ptitle(s) for s in slides]
players = [s.slide_layout.name for s in slides]

# ── ① slide-count ─────────────────────────────────────────────────────────
want = html_body + n_prologue
if len(slides) == want:
    ok("①", "슬라이드 %d장 = HTML 본문 %d + 구조 %d" % (len(slides), html_body, n_prologue))
else:
    no("①", "slide-count",
       "슬라이드 %d장 — HTML 기준 %d장(본문 %d + 구조 %d)과 어긋난다"
       % (len(slides), want, html_body, n_prologue))

# ── ② title-coverage ──────────────────────────────────────────────────────
# 제목칸이 있어도 비어 있으면 청중에게는 없는 것과 같다 — 둘 다 미보유로 센다.
held = sum(1 for t in ptitles if t)
pct = round(held / len(slides) * 100) if slides else 0
if pct >= 95:
    ok("②", "Title placeholder %d/%d (%d%%)" % (held, len(slides), pct))
else:
    miss = [i + 1 for i, t in enumerate(ptitles) if not t]
    no("②", "title-coverage",
       "Title placeholder %d%% (<95%%) — 무제목 장 %s" % (pct, miss[:12]))

# ── ③ title-parity ────────────────────────────────────────────────────────
# 챕터 진입 2장(Section Header + 챕터 TOC)은 HTML 과 **순서가 뒤집혀 있다**:
#   HTML  = [챕터 H1, 챕터 TOC]        pptx = [Section Header(챕터명), 챕터 TOC(H1)]
# 이는 Issue329 에서 의도해 수렴시킨 매핑이라 쌍 내부 순서는 집합으로 본다.
# 본문 장은 순서까지 정확히 일치해야 한다 — 거기서 어긋나면 장이 밀렸거나 사라진 것이다.
seg_start = [i for i, l in enumerate(players) if l == "Section Header"]
if len(seg_start) != len(chapters):
    no("③", "title-parity",
       "Section Header %d개 ≠ 챕터 %d개 — 챕터 경계가 무너져 제목 대조 불가"
       % (len(seg_start), len(chapters)))
else:
    bad = []
    bounds = seg_start + [len(slides)]
    for ci, (hsec, cname) in enumerate(zip(html_chapters, [c[0] for c in chapters])):
        seg = [t or "" for t in ptitles[bounds[ci]:bounds[ci + 1]]]
        hk, pk = [key(t) for t in hsec], [key(t) for t in seg]
        if len(hk) < 2 or len(pk) < 2:
            bad.append("%s: 진입 2장 미형성 (HTML %d · pptx %d)" % (cname, len(hk), len(pk))); continue
        if sorted(hk[:2]) != sorted(pk[:2]):
            bad.append("%s: 진입쌍 %s ≠ %s" % (cname, hk[:2], pk[:2]))
        if hk[2:] != pk[2:]:
            for j, (a, b) in enumerate(zip(hk[2:], pk[2:])):
                if a != b:
                    bad.append("%s: %d번째 본문 '%s' ≠ '%s'" % (cname, j + 1, a, b)); break
            else:
                bad.append("%s: 본문 장수 HTML %d ≠ pptx %d" % (cname, len(hk) - 2, len(pk) - 2))
    if bad:
        no("③", "title-parity", "제목 불일치 %d건 — %s" % (len(bad), " / ".join(bad[:3])))
    else:
        ok("③", "제목 문자열·순서 일치 (챕터 %d · 본문 %d장)" % (len(chapters), html_body - 2 * len(chapters)))

# ── ④ structure-slides ────────────────────────────────────────────────────
prob = []
if has_cover:
    if not ptitles or key(ptitles[0] or "") != key(cover_title):
        prob.append("표지 제목 '%s' ≠ HTML cover '%s'" % (ptitles[0] if ptitles else None, cover_title))
if has_agenda:
    # 목차 장은 제목이 아니라 **구조 표식**이다(build-source 가 유일하게 짓는 문자열).
    # 앞머리 구조 구간 안에서만 찾는다 — 본문에 같은 제목이 있어도 그건 목차 장이 아니다.
    agenda_i = next((i for i in range(min(n_prologue, len(slides)))
                     if key(ptitles[i] or "") == "목차"), None)
    if agenda_i is None:
        prob.append("목차 장 없음 (앞 %d장에 '목차' 제목 부재)" % n_prologue)
    else:
        lines = [key(x) for x in "\n".join(texts(slides[agenda_i].shapes)).split("\n")]
        missing = [c for c, _ in chapters if c and key(c) not in lines]
        if missing:
            prob.append("목차 장에 챕터 누락: %s" % missing[:3])
if len(seg_start) != len(chapters):
    prob.append("Section Header %d ≠ 챕터 %d" % (len(seg_start), len(chapters)))
if prob:
    no("④", "structure-slides", "구조 슬라이드 — " + " / ".join(prob))
else:
    ok("④", "구조 슬라이드 %d장 (표지 %d · 목차 %d · 챕터 진입 %d)"
       % (n_prologue + len(seg_start), int(has_cover), int(has_agenda), len(seg_start)))

# ── ⑤ markdown-leak ───────────────────────────────────────────────────────
# 렌더 텍스트에서만 찾는다. 패턴은 m2slide 고유 문법으로 좁혔다 — `-->` 처럼
# 산문에 자연히 나올 수 있는 토큰은 넣지 않는다(오탐이 러너를 무력화한다).
LEAK = [
    (re.compile(r"#layout-[a-z_]"),                          "#layout-* 지시자"),
    (re.compile(r"^\s*:::", re.M),                           "fenced div ':::'"),
    (re.compile(r"^\s*::right::\s*$", re.M),                 "슬롯 구분자 '::right::'"),
    (re.compile(r"#id-[a-z][a-z0-9-]*"),                     "노트 식별자 '#id-*'"),
    (re.compile(r"\{\.[a-zA-Z][\w .:=\"'-]*\}"),             "pandoc attribute '{.…}'"),
    (re.compile(r"<!--"),                                    "HTML 주석"),
    (re.compile(r"^\s*```", re.M),                           "코드 펜스 '```'"),
    (re.compile(r":fa-[a-z0-9-]+:"),                         "심벌 마커 ':fa-*:'"),
    (re.compile(r"^\s*#(?:transition-|background-|auto-animate|autoslide-)", re.M),
                                                             "애니메이션 디렉티브"),
]
hits = Counter()
where = {}
for i, s in enumerate(slides, 1):
    blob = "\n".join(texts(s.shapes))
    for pat, label in LEAK:
        n = len(pat.findall(blob))
        if n:
            hits[label] += n
            where.setdefault(label, []).append(i)
if hits:
    no("⑤", "markdown-leak",
       "마크다운 누출 %d건 — %s" % (sum(hits.values()),
       " / ".join("%s ×%d(장 %s)" % (k, v, where[k][:4]) for k, v in hits.items())))
else:
    ok("⑤", "마크다운 누출 0")

# ── ⑥ font-outside-theme ──────────────────────────────────────────────────
# 템플릿에 없는 폰트는 그 폰트가 없는 머신에서 조용히 대체된다 — 배포본이 달라진다.
TYPEFACE = re.compile(r'<a:(?:latin|ea|cs)\b[^>]*\btypeface="([^"]+)"')
with zipfile.ZipFile(PPTX) as z:
    theme = set()
    for n in z.namelist():
        if n.startswith("ppt/theme/") and n.endswith(".xml"):
            theme |= set(TYPEFACE.findall(z.read(n).decode("utf-8", "ignore")))
    used = Counter()
    for n in z.namelist():
        if n.startswith("ppt/slides/slide") and n.endswith(".xml"):
            for f in TYPEFACE.findall(z.read(n).decode("utf-8", "ignore")):
                if not f.startswith("+"):      # +mj-lt 류는 테마 참조 자체다
                    used[f] += 1
outside = {f: c for f, c in used.items() if f not in theme}
if outside:
    no("⑥", "font-outside-theme",
       "테마 밖 폰트 %s (테마: %s)"
       % (", ".join("%s ×%d" % kv for kv in sorted(outside.items())), ", ".join(sorted(theme))))
else:
    ok("⑥", "테마 밖 폰트 0 (테마: %s)" % ", ".join(sorted(theme)))

# ── ⑦ conform-lane-a ──────────────────────────────────────────────────────
if not os.path.exists(CONFORM):
    no("⑦", "conform-lane-a", "check-conform 없음: %s — 규격 미검증 상태다" % CONFORM)
else:
    r = subprocess.run([sys.executable, CONFORM, PPTX, "--lane", "a"],
                       capture_output=True, text=True)
    if r.returncode == 0:
        ok("⑦", "check-conform --lane a FAIL 0")
    else:
        tail = [l for l in (r.stdout + r.stderr).splitlines() if "FAIL" in l][:3]
        no("⑦", "conform-lane-a", "check-conform rc=%d — %s" % (r.returncode, " / ".join(tail) or "출력 없음"))

print()
if fails:
    print("[3.parity] 실패 %d/7 — %s" % (len(fails), ", ".join(fails)))
    sys.exit(1)
print("[3.parity] 통과 7/7 — %s" % PPTX)
PY
