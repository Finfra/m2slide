#!/usr/bin/env python3
"""HTML 덱 ↔ pptx **내용 전수 대조** (Issue346).

왜 이 검사가 따로 있나
----------------------
[check-visual.py](check-visual.py) 는 축을 **열거**한다 — 판형·강조색·배경·제목색…
그래서 **열거하지 않은 것은 측정 자체가 되지 않고**, 측정되지 않은 것은 실패로
뜨지 않는다. 실측(2026-09-10): HTML 표지의 슬롯 12개 중 pptx 에 도달한 것이
제목 하나뿐인데도 *"must_match 7종 전건 일치"* 초록불이 났다. 코너 배지·버전·
푸터는 **모든 장**에 있어야 하는데 한 장도 없었다.

이 검사는 열거하지 않는다. 양쪽에서 **보이는 것을 전부 긁어** 맞춘다. 그래서
*"무엇을 잴지"* 를 사람이 정하지 않고, **아무도 모르던 빠짐도 잡힌다**.

픽셀 비교를 하지 않는 이유
--------------------------
서체 대체(macOS 에 Malgun Gothic 이 없다)·안티앨리어싱·자간 때문에 픽셀은 늘
다르다. 임계를 느슨하게 잡으면 표지가 통째로 빈 것도 통과하고, 조이면 전부
빨간불이 된다. **글자와 그림의 유무**를 재는 편이 판정이 분명하다.

무엇을 대조하나
---------------
    텍스트   HTML 장의 보이는 글자 ↔ pptx 장의 모든 텍스트 프레임
    그림     `<img>` ↔ PICTURE 도형 (테마 장식·markmap 은 제외)

⚠️ pptx 로 **옮길 수 없다고 선언된 것**(`fidelity.yml` declared_drop·known_gap)은
   빠져도 실패가 아니다. 그 선언을 여기서 다시 하지 않고 계약을 읽는다.

사용
----
    check-parity.py <프로젝트 dir> [--json PATH]
"""
import argparse
import collections
import glob
import html.parser
import json
import os
import re
import sys

try:
    import yaml
except ImportError:
    yaml = None

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from pptxutil import iter_shapes, descr as shape_descr   # noqa: E402
import smartart   # noqa: E402
CONTRACT = os.path.join(HERE, "..", "..", "data", "m2slide2ppt", "fidelity.yml")
P = "http://schemas.openxmlformats.org/presentationml/2006/main"
ORNAMENT_TAG = "m2slide:ornament"
SKIP_TAGS = {"script", "style", "svg", "noscript", "template"}
#   계약이 `component_fence: declared_drop` 으로 선언한 것들. 이 블록의 본문(JSON·JS)은
#   pptx 에 옮기지 않는 것이 **정책**이므로 빠짐으로 세면 안 된다
COMPONENT_KINDS = {"chart", "d3", "p5", "map", "model3d", "react"}
COMPONENT_LANG = re.compile(
    r"language-(chart|d3|p5|map|model3d|react)\b")


class SectionText(html.parser.HTMLParser):
    """reveal 덱에서 `<section>` 마다 보이는 글자와 그림을 모은다."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.sections = []
        self._depth = 0          # section 중첩 깊이
        self._skip = 0
        self._cur = None
        self._aside = 0          # 발표자 노트 — 화면에 보이지 않는다
        self._comp = None        # 컴포넌트 펜스 — 계약상 pptx 로 옮기지 않는다

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in SKIP_TAGS:
            self._skip += 1
            return
        if tag == "aside" and "notes" in (a.get("class") or ""):
            self._aside += 1
            return
        #   컴포넌트는 두 모양으로 나온다 — `<div data-component="chart">` 안에 설정
        #   원문이 그대로 있고(m2slide 렌더), 코드 펜스로 남는 경우도 있다
        #   mermaid 는 `<div class="media-container mermaid">` 안에 원문이 남고
        #   화면에는 렌더된 그림이 보인다. 계약이 `mermaid_fence: declared_drop`
        #   으로 선언했으므로 원문을 빠짐으로 세면 안 된다
        if tag == "div" and "mermaid" in (a.get("class") or "").split():
            self._skip += 1
            self._comp = tag
            return
        if (a.get("data-component") in COMPONENT_KINDS
                or (tag in ("code", "pre")
                    and COMPONENT_LANG.search(a.get("class") or ""))):
            self._skip += 1
            self._comp = tag
            return
        if tag == "section":
            if self._depth == 0:
                self._cur = {"text": [], "img": []}
                self.sections.append(self._cur)
            self._depth += 1
            return
        if tag == "img" and self._cur is not None and not self._skip and not self._aside:
            src = a.get("src") or ""
            #   테마 자산(로고·hr)은 원고의 그림이 아니지만 **표지 구성요소**이므로
            #   센다. 구분은 대조 단계에서 계약이 한다
            self._cur["img"].append(os.path.basename(src))
            #   `alt` 는 pptx 에서 **캡션 텍스트**가 된다(pandoc figure caption).
            #   빼면 그 캡션이 "pptx 에만 있는 글자" 로 잡힌다(실측: `Chart`)
            if (a.get("alt") or "").strip():
                self._cur["text"].append(a["alt"].strip())

    def handle_endtag(self, tag):
        if tag == getattr(self, "_comp", None):
            self._skip = max(0, self._skip - 1)
            self._comp = None
            return
        if tag in SKIP_TAGS:
            self._skip = max(0, self._skip - 1)
            return
        if tag == "aside":
            self._aside = max(0, self._aside - 1)
            return
        if tag == "section":
            self._depth = max(0, self._depth - 1)

    def handle_data(self, data):
        if self._cur is None or self._skip or self._aside:
            return
        t = data.strip()
        if t:
            self._cur["text"].append(t)


#   lane B 가 카드에 매기는 순번(`01. `)은 우리가 붙인 것이지 원고의 글자가 아니다
LANE_B_NUM = re.compile(r"^\d{2}\.\s+")
#   수식은 pptx 에서 OMML 이 되어 텍스트 프레임에 잡히지 않는다. 양쪽 표기가
#   원리적으로 다르므로 **토큰에서 걷어낸다** — 수식 자체의 왕복은
#   check-roundtrip.py 의 `math_display`·`math_inline` 이 따로 잰다
MATH = re.compile(r"\$\$.+?\$\$|\\\(.+?\\\)|\\\[.+?\\\]", re.S)


def norm(s):
    s = MATH.sub(" ", s or "")
    s = LANE_B_NUM.sub("", s)
    #   인라인 마크업·인용 접두를 벗긴다 (Issue358). 이 검사가 묻는 것은 *"글자가
    #   전달됐는가"* 이지 *"기호까지 같은가"* 가 아니다. 실측(m2Slide_chapter_mode):
    #   HTML 조각 `와 *이탤릭체*를 지원합니다.` 와 pptx 의 `…이탤릭체를 지원합니다.`,
    #   HTML `> 인용문…` 과 pptx `인용문…` 이 기호 하나로 갈려 모자람으로 잡혔다.
    s = re.sub(r"\*\*|__|`", "", s)
    #   ⚠️ 쌍을 **먼저** 푼다. 경계 단언(`(?!\w)`)만 쓰면 한글 뒤 `*` 가 남는다 —
    #      파이썬 `\w` 는 유니코드라 `를` 이 단어문자다(실측: `와 이탤릭체*를 …`)
    s = re.sub(r"\*([^*\n]+)\*", r"\1", s)
    s = re.sub(r"(?<!\w)[*_](?=\S)|(?<=\S)[*_](?!\w)", "", s)
    s = re.sub(r"^[ \t]*>[ \t]?", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def tokens(chunks):
    """비교 단위 — 줄 단위로 자르고 너무 짧은 것은 버린다.

    한두 글자(불릿 기호·숫자)는 어느 쪽에서든 흔해 대조를 흐린다.
    """
    out = []
    for c in chunks:
        for line in re.split(r"[\n\r\x0b]+", c):
            t = norm(line)
            #   원고 끝의 고아 `---` 는 슬라이드 구분자로 소비되지 못하고 HTML 에
            #   `<p>---</p>` 로 남는다. pptx 는 내지 않는 것이 맞다 — 콘텐츠가 아니다
            if re.fullmatch(r"[-*_]{3,}", t):
                continue
            if len(t) >= 2:
                out.append(t)
    return out


def untitled_head_texts(project_dir):
    """**제목 없는 장**의 머리말 글자 (Issue358).

    lane T 는 장의 제목을 열쇠로 HTML 에서 머리말을 찾고, 본문 장식 경로 전체가
    제목 placeholder 존재를 전제한다(`ttl is not None`). `### H3` 로만 시작하는
    슬라이드는 pandoc 이 제목 없는 장으로 내므로 **열쇠도 자리도 없다** — 그래서
    그 장만 머리말 글자가 비어 있다(실측 m2Slide_chapter_mode: `4.1. 이미지`·
    `4.2. 리스트` 각 2회 · 2026-09-19).

    계약은 같은 뿌리(`subheading` caveat)에서 이미 *"순번으로 세는 것도 불안정하니
    근사하지 않고 선언한다"* 고 정했다. 여기서도 근사하지 않고 면제하되 **개수를
    보고한다** — 숨기면 제목 있는 장의 머리말이 통째로 빠져도 조용히 지나간다.

    ⚠️ 그래서 면제는 **제목 없는 section 의 머리말**로만 한정한다.
    """
    import glob as _g
    from pptx import Presentation
    name = os.path.basename(project_dir.rstrip("/"))
    pptx_path = os.path.join(project_dir, "slide", "%s.pptx" % name)
    if not os.path.isfile(pptx_path):
        return set()
    #   ⚠️ **제목이 없는 쪽은 pptx 다.** HTML 은 `### H3` 도 슬라이드 제목으로
    #      렌더하지만(`class="title"`), pandoc 은 `--slide-level=2` 라 H3 장을
    #      제목 없는 장으로 낸다. 그래서 HTML 만 보고 "제목 없는 장" 을 고르면
    #      **한 장도 안 걸린다**. pptx 에서 고르고 그 글자로 HTML 을 찾는다.
    keys = set()
    for sl in Presentation(pptx_path).slides:
        has_title = any(sh.has_text_frame and sh.name.startswith("Title")
                        and sh.text_frame.text.strip() for sh in sl.shapes)
        if has_title:
            continue
        for sh in sl.shapes:
            if sh.has_text_frame and sh.text_frame.text.strip():
                keys.add(norm(sh.text_frame.text.strip().splitlines()[0]))
                break
    if not keys:
        return set()
    files = sorted(_g.glob(os.path.join(project_dir, "slide", "*.html")))
    use = [f for f in files
           if os.path.basename(f) not in ("index.html", "agenda.html")]
    out = set()
    for f in use:
        h = open(f, encoding="utf-8").read()
        for sec in re.findall(r"<section[^>]*>.*?(?=<section|\Z)", h, re.S):
            t = re.search(r'class="(?:contents-)?title"[^>]*>(.*?)</', sec, re.S)
            if not t or norm(re.sub(r"<[^>]+>", " ", t.group(1))) not in keys:
                continue
            for cls in ("contents-head-left", "contents-head-right"):
                m = re.search(r'class="%s"[^>]*>(.*?)</div>' % cls, sec, re.S)
                if m:
                    v = norm(re.sub(r"<[^>]+>", " ", m.group(1)))
                    if len(v) >= 2:
                        out.add(v)
    return out


def declared_drop_texts(project_dir):
    """계약이 **버리기로 선언한** 것들의 글자 (Issue358).

    `div_other`(raw HTML) · `mermaid_fence` · `component_fence` 는 fidelity.yml 이
    `declared_drop` 으로 선언한 요소다 — pptx 에 없는 것이 계약대로다. 그런데 이
    전수 대조는 HTML ↔ pptx 를 **직접** 비교하느라 계약을 보지 않아, 계약대로
    사라진 글자를 전부 실패로 들었다(실측 m2Slide_chapter_mode: raw HTML `<p>첫 번째
    카드의 내용입니다.</p>` 류 · 2026-09-19).

    ⚠️ **원고에서 모은다** — 중간 산출물(`_pipeline/`)을 읽으면 그때그때 달라지고,
    빌드를 안 돌린 상태에서 못 잰다.
    """
    import glob as _g
    srcs = sorted(_g.glob(os.path.join(project_dir, "markdown", "*.md")))
    if not srcs:
        srcs = [f for f in sorted(_g.glob(os.path.join(project_dir, "*.md")))
                if os.path.basename(f) != "AGENDA.md"]
    out = set()
    tag = re.compile(r"<[^>]+>")
    for f in srcs:
        in_fence, keep = False, False
        for ln in open(f, encoding="utf-8"):
            m = re.match(r"^[ \t]*```([\w-]*)", ln)
            if m:
                if not in_fence:
                    in_fence = True
                    #   pptx 로 옮겨지는 펜스(코드블록)는 면제 대상이 아니다
                    keep = (m.group(1) or "") in ("", "text")
                else:
                    in_fence = False
                continue
            if in_fence:
                if not keep:
                    t = norm(ln)
                    if len(t) >= 2:
                        out.add(t)
                continue
            if ln.lstrip().startswith("<"):
                t = norm(tag.sub(" ", ln))
                if len(t) >= 2:
                    out.add(t)
    return out


def html_sections(project_dir):
    files = sorted(glob.glob(os.path.join(project_dir, "slide", "*.html")))
    #   index.html 이 single mode 의 본체다. chapter mode 는 챕터 파일들이 본체이고
    #   index 는 markmap 목차라 내용이 겹친다 — 챕터 파일이 있으면 그쪽을 쓴다
    #   ⚠️ `agenda.html` 도 **배포물의 일부**다 (Issue351). 빼면 pptx 가 그 장을
    #      만들었을 때 "원고에 없는 장" 으로 오판한다.
    chapters = [f for f in files
                if os.path.basename(f) not in ("index.html", "agenda.html")]
    idx = [f for f in files if os.path.basename(f) == "index.html"]
    ag = [f for f in files if os.path.basename(f) == "agenda.html"]
    #   ⚠️ chapter mode 에서도 **표지는 `index.html` 에 있다** (Issue358). index 를
    #      통째로 빼면 그 표지까지 잃어 pptx 만 표지를 가진 것처럼 보인다(실측
    #      m2Slide_chapter_mode: HTML 31 · pptx 34 중 +1 이 이것 · 2026-09-19).
    #      index 의 나머지(markmap 목차)는 JS 가 그리므로 section 으로 세어지지 않아
    #      `deck_toc_slide` 예산과 겹치지 않는다.
    use = (chapters + idx) if chapters else idx
    use = use + ag
    out = []
    for f in use:
        p = SectionText()
        p.feed(open(f, encoding="utf-8").read())
        out += p.sections
    return out


def pptx_slides(path):
    from pptx import Presentation
    prs = Presentation(path)
    out = []
    for s in prs.slides:
        rec = {"text": [], "img": []}
        #   ⚠️ `slide.shapes` 가 아니라 iter_shapes — PowerPoint 로 저장한 파일은 수식이
        #      든 본문을 mc:AlternateContent 로 감싸 python-pptx 가 못 본다(실측 2026-09-11)
        for sh in iter_shapes(s):
            if str(sh._element.tag).endswith("}graphicFrame"):
                dia = smartart.read_diagram(sh, s)
                if dia is not None:
                    #   SmartArt 의 글자는 데이터 모델에 있다 — 항목·하위 전부
                    for it in dia[1]:
                        rec["text"].append(it["title"])
                        rec["text"] += it["subs"]
                    continue
            if getattr(sh, "has_chart", False) and sh.has_chart:
                #   네이티브 차트의 범주 라벨은 화면에 보이는 글자다
                try:
                    rec["text"] += [str(c) for c in sh.chart.plots[0].categories]
                except Exception:
                    pass
                continue
            if shape_descr(sh).startswith("m2slide:content/pie-legend"):
                continue        # 파이 범례 라벨 — 차트 범주(원고 라벨)의 파생물이라 세지 않는다
            if sh.has_text_frame:
                rec["text"].append(sh.text_frame.text)
            if sh.has_table:
                for r in sh.table.rows:
                    for c in r.cells:
                        rec["text"].append(c.text_frame.text)
            if str(sh.shape_type or "").startswith("PICTURE"):
                d_ = shape_descr(sh)
                if d_.startswith(ORNAMENT_TAG):
                    continue        # 테마 장식 — 그림 수에 넣지 않는다
                rec["img"].append("pic")
                if d_ and not d_.startswith("m2slide:") and not d_.startswith("/"):
                    rec["text"].append(d_)      # 그림 alt-text — HTML `img[alt]` 와 짝
        out.append(rec)
    return out


def css_theme_assets(project_dir):
    """빌드 CSS 가 실제로 참조하는 `theme-img/` 자산 → {파일명: 바이트해시}."""
    import hashlib
    css = os.path.join(project_dir, "slide", "css", "custom.css")
    tdir = os.path.join(project_dir, "slide", "theme-img")
    if not (os.path.isfile(css) and os.path.isdir(tdir)):
        return {}
    txt = re.sub(r"/\*.*?\*/", "", open(css, encoding="utf-8").read(), flags=re.S)

    #   ⚠️ **CSS 참조 전부를 요구하면 과하다.** theme 은 쓰지도 않는 layout
    #      (`_chapter`·`_toc`·`_closing`·`_exercise`)의 마스코트까지 선언해 둔다.
    #      이 덱이 **실제로 쓰는 layout** 의 배경만 대상이다 (실측 2026-09-10:
    #      aTest 는 `_cover`·`_contents` 둘뿐인데 자산 5종을 요구했다).
    #   ⚠️ HTML 전체에서 `layout-` 을 긁으면 안 된다 — 스크립트·markmap 데이터에도
    #      그 문자열이 있어 **쓰지 않는 layout 까지 "사용 중"** 이 된다(실측: aTest 가
    #      exercise·closing 을 쓴다고 나왔다). `<section class>` 만 본다.
    html = " ".join(open(f, encoding="utf-8").read()
                    for f in glob.glob(os.path.join(project_dir, "slide", "*.html")))
    used_layouts = set()
    for cls in re.findall(r"<section[^>]*\sclass=\"([^\"]*)\"", html):
        used_layouts |= set(re.findall(r"layout-(_?[a-z0-9-]+)", cls))

    out = {}
    for m in re.finditer(r"([^{}]+)\{([^{}]*)\}", txt):
        sel, body = m.group(1), m.group(2)
        names = re.findall(r"url\([\'\"]?\.\./theme-img/([^\'\")]+)", body)
        if not names:
            continue
        want = set(re.findall(r"layout-(_?[a-z0-9-]+)", sel))
        #   layout 을 특정하지 않은 규칙(전역 배경 등)은 늘 대상이다
        if want and not (want & used_layouts):
            continue
        for n in names:
            fp = os.path.join(tdir, n)
            if os.path.isfile(fp):
                out[n] = hashlib.md5(open(fp, "rb").read()).hexdigest()
    return out


def pptx_media_hashes(path):
    import hashlib, zipfile
    out = set()
    with zipfile.ZipFile(path) as z:
        for n in z.namelist():
            if n.startswith("ppt/media/"):
                out.add(hashlib.md5(z.read(n)).hexdigest())
    return out


def load_exempt():
    """계약이 *"pptx 로 못 옮긴다"* 고 선언한 것의 글자 패턴.

    선언을 여기서 다시 하지 않는다 — `fidelity.yml` 이 정본이고 이 함수는 그것을
    읽어 면제 목록을 만든다.
    """
    pats = []
    if yaml is None or not os.path.isfile(os.path.normpath(CONTRACT)):
        return pats
    d = yaml.safe_load(open(os.path.normpath(CONTRACT), encoding="utf-8")) or {}
    for e in (d.get("elements") or []):
        if e.get("grade") in ("declared_drop",):
            pats.append(e["id"])
    return pats


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("--json")
    ap.add_argument("--max-report", type=int, default=12)
    a = ap.parse_args()

    proj = a.project.rstrip("/")
    name = os.path.basename(proj)
    pptx = os.path.join(proj, "slide", "%s.pptx" % name)
    if not os.path.isfile(pptx):
        print("❌ pptx 없음: %s" % pptx, file=sys.stderr)
        return 2

    hs = html_sections(proj)
    ps = pptx_slides(pptx)
    if not hs:
        print("❌ HTML 산출물이 없다 — 먼저 빌드하라", file=sys.stderr)
        return 2

    #   ⚠️ **집합이 아니라 개수로 센다.** 집합 차집합은 *"위치가 다른 같은 글자"* 를
    #      놓친다 — 실측(2026-09-10): 머리말 바가 pptx 에 **0개**인데도 그 글자가
    #      본문 제목과 같아 차집합에서 사라졌다(HTML 7개 · pptx 0개).
    h_text = collections.Counter(tokens([t for s in hs for t in s["text"]]))
    p_text = collections.Counter(tokens([t for s in ps for t in s["text"]]))
    miss_c = h_text - p_text
    extra_c = p_text - h_text
    missing = sorted(set(miss_c.elements()), key=lambda x: (-len(x), x))
    #   ① 조각 경계가 다를 뿐인 것을 뺀다 (Issue358). 이 검사가 묻는 것은 *"글자가
    #      pptx 에 있는가"* 이지 *"줄 나눔이 같은가"* 가 아니다. 실측: HTML 이 네 줄로
    #      보여 주는 것을 pptx 는 한 문단에 공백으로 이어 담는다(CommonMark 느슨한
    #      이어짐) — 같은 글자인데 조각 단위가 달라 전부 모자람으로 잡혔다.
    p_blob = norm(" ".join(t for s_ in ps for t in s_["text"]))
    missing = [t for t in missing if t not in p_blob]
    #   ② 계약이 버리기로 선언한 것을 뺀다 — 없는 것이 계약대로다
    dropped = declared_drop_texts(proj)
    missing = [t for t in missing if t not in dropped]
    #   ③ 제목 없는 장의 머리말 — 계약 `head_bar_text`(known_gap). 면제하되 센다
    head_gap = untitled_head_texts(proj)
    head_gap = sorted(t for t in missing if t in head_gap)
    missing = [t for t in missing if t not in head_gap]
    extra = sorted(set(extra_c.elements()), key=lambda x: (-len(x), x))

    h_img = sum(len(s["img"]) for s in hs)
    p_img = sum(len(s["img"]) for s in ps)

    #   ⚠️ 테마 자산은 `<img>` 가 아니라 **CSS background-image** 로 그려진다.
    #      태그만 세면 로고가 통째로 빠져도 그림 수가 1:1 로 맞는다(실측 2026-09-10:
    #      복어 로고 `finfraPuffer*.png` 가 표지에서 빠졌는데 1:1 이었다).
    #      그래서 CSS 참조를 긁고, pptx 쪽은 **패키지에 실린 이미지 바이트**로 맞춘다.
    theme_used, theme_in_pptx = css_theme_assets(proj), pptx_media_hashes(pptx)
    asset_missing = [n for n, h in theme_used.items() if h not in theme_in_pptx]

    print("=" * 76)
    print("내용 전수 대조 — %s" % proj)
    print("=" * 76)
    #   ⚠️ **장 수 불일치는 실패다** (Issue348). 전에는 출력만 하고 세지 않아
    #      같은 원고가 HTML 8장 · pptx 10장인데도 초록불이었다 — `cards_placeholder`
    #      를 pptx 경로가 읽지 않아 H1 진입 장과 목차 장이 pptx 에만 생겼다.
    slide_gap = len(ps) - len(hs)
    print("장    HTML %d · pptx %d%s"
          % (len(hs), len(ps), ("  ⚠️ %+d" % slide_gap) if slide_gap else ""))
    print("글자  HTML %d종(%d개) · pptx %d종(%d개) · **모자란 것 %d종**"
          % (len(h_text), sum(h_text.values()),
             len(p_text), sum(p_text.values()), len(missing)))
    print("그림  HTML %d개 · pptx %d개" % (h_img, p_img))
    print("자산  CSS 참조 %d종 · pptx 미포함 %d종"
          % (len(theme_used), len(asset_missing)))
    print("-" * 76)
    if head_gap:
        print("ℹ️  제목 없는 장의 머리말 %d종은 계약이 선언한 차이다 (head_bar_text) — %s"
              % (len(head_gap), ", ".join(head_gap[:4])))
    if missing:
        print("❌ pptx 에 없는 글자 %d종 (긴 것부터 %d개)"
              % (len(missing), min(a.max_report, len(missing))))
        for t in missing[:a.max_report]:
            #   1개 부족도 개수를 적는다 — 안 적으면 "pptx 에 아예 없다" 로 오해한다
            #   (실측: 제목이 pptx 에 있는데 머리말 바 몫 1회가 모자란 경우)
            print("   · %-56s %d회 모자람 (HTML %d · pptx %d)"
                  % (t[:56], miss_c[t], h_text[t], p_text[t]))
    else:
        print("✅ HTML 의 글자가 pptx 에 전부 있다")
    if extra:
        print("ℹ️  pptx 에만 있는 글자 %d종 (구조 표식·자동 생성물일 수 있다)" % len(extra))
        for t in extra[:4]:
            print("   · %s" % t[:70])
    print("-" * 76)
    print("⚠️ 이 검사는 **열거하지 않는다** — 계약에 없는 빠짐도 여기서 드러난다.")
    print("   빠진 것이 의도된 것이라면 fidelity.yml 에 선언하고, 아니면 변환을 고쳐야 한다.")

    #   계약이 `synthesized` 로 선언하며 `slides:` 를 적은 만큼은 허용한다 —
    #   HTML 쪽이 JS 로 그려 정적 대조가 볼 수 없는 장(agenda)이 그것이다
    budget = 0
    try:
        _c = yaml.safe_load(open(os.path.normpath(CONTRACT), encoding="utf-8")) or {}
        budget = sum(e.get("slides", 0) for e in (_c.get("elements") or [])
                     if e.get("grade") == "synthesized")
    except Exception:
        budget = 0
    if 0 < slide_gap <= budget:
        print("ℹ️  장 수 차이 %+d 는 계약이 선언한 생성물 예산(%d) 안이다"
              % (slide_gap, budget))
        slide_gap = 0
    if slide_gap:
        print("❌ 장 수가 다르다 (%+d) — 같은 원고가 두 산출물에서 다른 장 수로 나온다"
              % slide_gap)
        print("   의도된 차이면 fidelity.yml 에 `synthesized` 로 선언하고, 아니면")
        print("   build-source 가 읽는 설정(cards_placeholder·toc_placeholder)을 보라")

    if asset_missing:
        print("❌ pptx 에 없는 테마 자산 %d종 — %s"
              % (len(asset_missing), ", ".join(sorted(asset_missing))))
        print("   (CSS background-image 로 그려지는 것들 — `<img>` 집계로는 보이지 않는다)")

    if a.json:
        json.dump({"missing": missing, "extra": extra,
                   "h_img": h_img, "p_img": p_img},
                  open(a.json, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    return 1 if (missing or asset_missing or slide_gap) else 0


if __name__ == "__main__":
    sys.exit(main())
