#!/usr/bin/env python3
"""build-source.py — m2slide 원고 → **pptx 전용 중간 원고** (Issue327·328·329)

왜 이 단계가 있나
-----------------
pptx 변환기(`ppt-deck/md2pptx.py`)는 **마크다운만** 본다. 그런데 m2slide 덱의 상당
부분은 마크다운에 없다 — cover·agenda·챕터 TOC 는 `_config.yml`·`AGENDA.md` 를 보고
**빌드가 주입**하고, `{.fragment}`·`#id-*` 같은 지시자는 HTML 파서가 소비한다.
즉 *"m2slide 만 아는 것"* 을 변환기에 전달할 통로가 없다.

그 통로가 이 스크립트다. m2slide 가 자기가 아는 것을 **중간 원고로 적어서** 넘긴다.
글로벌 변환기를 m2slide 전용으로 고치지 않고(그러면 범용 도구가 오염된다) 같은 결과를
얻는다. 설계 SSOT: `_doc_arch/pptx-parity-design.md` "아키텍처 결정".

역할 경계 — **md2pptx 가 이미 하는 일은 하지 않는다**
----------------------------------------------------
같은 판정을 두 곳에서 하면 갈린다(Issue323 에서 실제로 겪었다). 아래는 저쪽 소관이므로
여기서 건드리지 않는다:

    #layout-* 제거 · 비표준 fenced div 껍데기 제거 · mermaid 렌더 · raw HTML 줄 제거
    · `---` 중복 구분자 정리 · frontmatter 제거

여기서만 하는 일:

    ① pandoc attribute 제거     {.fragment} 류. ⚠️ {.column width=…} 는 pandoc 어휘라 **보존**
    ② reveal.js 주석 제거       <!-- .element: … --> · <!-- .slide: … -->
    ③ 노트 식별자 제거          #id-slug  (발표자 노트 병합용 — 본문이 아니다)
    ④ 애니메이션 디렉티브 제거  #transition-* · #background-* · #auto-animate · #autoslide-*
    ⑤ 슬롯 구분자 제거          ::right::  (좌우 분할 신호. 내용은 남긴다)
    ⑥ 심벌 마커 제거            :fa-rocket:  (pptx 에 Font Awesome 이 없다)
    ⑦ 이미지 경로 절대화        ★ 필수 — 아래 참조
    ⑧ 챕터 진입부 정규화        H1 단독 + 챕터 TOC 분리     (Issue329)
    ⑨ 구조 슬라이드 주입        표지(메타) · 목차           (Issue328)
    ⑩ 무거운 블록 후치          표·이미지를 장 끝으로       (Issue329)
    ⑪ 컴포넌트 펜스 평탄화      ```wordart → 평문, ```chart 류 → 제거
    ⑫ lane B 대상 표시          cards·정형 htmlart 를 사이드카에 적는다  (Issue331)

⑦이 필수인 이유
---------------
`md2pptx.fix_images()` 는 이미지 상대경로를 **그 원고 파일이 있는 디렉토리** 기준으로
푼다. 중간 원고는 `_pipeline/pptx/source/` 에 놓이므로 `./img/x.png` 가 거기서 풀려
전부 "파일없음" 이 된다. 절대경로면 `fix_images` 가 그대로 통과시킨다(실측 확인).

⑧⑩ 이 필요한 이유 — **pandoc 은 남는 블록을 제목 없는 장으로 흘린다**
---------------------------------------------------------------------
실측(2026-08-19, `igTest`):

* `# H1` 뒤에 본문(`::: part` 의 "Chapter 1.")이 있으면 pandoc 은 `Section Header`
  한 장을 만들고 **그 본문을 제목 없는 다음 장으로** 흘린다. 챕터 5개 × 1장 = 무제목 5장
* `Content with Caption` 은 [텍스트…] + [표·그림 **하나**] 까지만 담는다. 표 **뒤에**
  글이 더 있으면 그 글이 **제목 없는 장**이 된다 (강점 1 장에서 실제 발생)

둘 다 pandoc 의 정상 동작이다. 고칠 곳은 변환기가 아니라 **원고의 모양**이다.

⚠️ 내용을 새로 쓰지 않는다
--------------------------
문구는 원본 그대로 옮기고 **구조만** 만든다. 넘으면 HTML 덱과 pptx 가 서로 다른 말을
하기 시작한다. ⑧⑨⑩ 도 이 선을 지킨다 — 순서를 바꾸고 자리를 옮길 뿐, 문장을 짓지
않는다(유일한 예외가 목차 장의 라벨 "목차" 이며, 그것은 제목이 아니라 구조 표식이다).

사용
----
    build-source.py <project_dir> [--out DIR] [--quiet]

    stdout : 생성한 원고 경로 (한 줄에 하나, 순서 = 변환 순서)
    stderr : 처리 통계
"""
import argparse
import glob
import json
import os
import re
import sys

# ── ① pandoc attribute. `.column`·`.columns` 는 pandoc 이 아는 어휘라 건드리지 않는다.
#    (m2slide 멀티컬럼이 그 문법을 쓰고, md2pptx 도 PANDOC_DIV 로 통과시킨다)
ATTR = re.compile(r"\s*\{\.(?!column\b|columns\b)[a-zA-Z][\w .:=\"'-]*\}")
# ⚠️ fenced div 를 **여는 줄**의 attribute 는 인라인 장식이 아니라 **구조**다 (Issue329).
#    ① 의 취지는 `{.fragment}` 처럼 문장에 붙은 장식을 지우는 것인데, 같은 정규식이
#    `::::::: {.row .card}` 에도 물리면 그 줄이 맨 `:::::::` 가 된다. 그 순간
#    `md2pptx.FENCE_OPEN` 이 정보 없는 `:::` 를 **닫는 줄**로 읽어(`info == ""` → stack.pop)
#    여닫이가 어긋나고, 짝을 잃은 `:::: {.column}` 이 본문에 글자 그대로 새어 나온다
#    (실측 2026-08-25, aTest 2×2 장: 9번 슬라이드에 `:::: {.column}` · `:::::::` 리터럴).
#    따라서 fence 줄에서는 ① 을 건너뛴다 — 껍데기 처리는 md2pptx 소관이다.
FENCE_LINE = re.compile(r"^[ \t]*:::")
ELEMENT_COMMENT = re.compile(r"\s*<!--\s*\.(element|slide):.*?-->", re.S)
ID_LINE = re.compile(r"^[ \t]*#id-[a-z][a-z0-9-]*[ \t]*$", re.M)
ANIM_LINE = re.compile(
    r"^[ \t]*#(?:transition-[\w-]+|background-[\w.#-]+|background-(?:image|size|transition)-\S+"
    r"|auto-animate|autoslide-\d+)[ \t]*$", re.M)
SLOT_RIGHT = re.compile(r"^[ \t]*::right::[ \t]*$", re.M)
SYMBOL = re.compile(r":fa-[\w-]+:")
IMG = re.compile(r"(!\[[^\]]*\]\()([^)\s]+)(\s+\"[^\"]*\")?(\))")
FENCE = re.compile(r"^[ \t]*```")
HR = re.compile(r"^[ \t]*-{3,}[ \t]*$")
H1 = re.compile(r"^#[ \t]+(.+?)[ \t]*$")
H2 = re.compile(r"^##[ \t]+(.+?)[ \t]*$")
LAYOUT_LINE = re.compile(r"^[ \t]*#_?[a-z][a-z0-9-]*[ \t]*$")

# ⑪ 컴포넌트 펜스 — HTML 에서만 살아 있는 것들.
#    wordart 는 **글자가 내용**이라 태그만 벗겨 남기고, 나머지는 설정·코드라 지운다.
#    (남기면 JSON·JS 원문이 슬라이드에 그대로 찍힌다 — 실측: 45번 장에 `<h1 class=…>` 노출)
FENCE_UNWRAP = {"wordart"}
FENCE_DROP = {"chart", "d3", "p5", "map", "model3d", "react"}
TAG = re.compile(r"<[^>]+>")


def split_code(text):
    """(줄, 코드안인가) 쌍을 순서대로 낸다.

    코드펜스 안의 `{.foo}`·`:fa-x:` 는 **본문 예시**일 수 있으므로 건드리면 안 된다.
    md-m2slide-rules 가 그 보호를 명시한다(인라인 attribute 절).
    """
    out, in_code = [], False
    for line in text.split("\n"):
        if FENCE.match(line):
            in_code = not in_code
            out.append((line, True))          # 펜스 줄 자체도 보호 대상
            continue
        out.append((line, in_code))
    return out


def strip_frontmatter(text):
    """맨 앞 YAML 블록 제거 — 슬라이드 분할 전에 걷어내야 `---` 가 경계로 오인되지 않는다."""
    if not text.startswith("---\n"):
        return text
    end = text.find("\n---", 3)
    if end == -1:
        return text
    nl = text.find("\n", end + 1)
    return text[nl + 1:] if nl != -1 else ""


def split_slides(text):
    """`---` 단독 줄(코드펜스 밖)로 슬라이드 블록을 가른다. m2slide 파서와 같은 규칙."""
    blocks, cur = [], []
    for line, in_code in split_code(text):
        if not in_code and HR.match(line):
            blocks.append("\n".join(cur))
            cur = []
            continue
        cur.append(line)
    blocks.append("\n".join(cur))
    return blocks


def resolve_image(path, srcdir, proj, stat):
    """m2slide 이미지 탐색 규칙대로 실물을 찾아 절대경로로 준다.

    ⚠️ **원고 디렉토리 기준만으로는 못 찾는다.** chapter mode 의 이미지는 두 곳에
    나뉘어 살고(`markdown/img/` 와 프로젝트 루트 `img/`) 빌드가 그 둘을 `slide/img/`
    로 **병합 복사**한다(CLAUDE.md 규약). 그래서 원고의 `./img/x.svg` 는 HTML 에서는
    보이지만 원고 디렉토리 기준으로는 없을 수 있다.

    🔑 실측(2026-08-18): 그 상태가 이미 벌어져 있었다 — ig-maker 가 만든
    `img/strengths-1.svg`(장당 33만 토큰) 가 pptx 변환에서 `✕ 없음` 으로
    **조용히 빠지고** 있었다. 원고는 `markdown/` 에 있고 실물은 프로젝트 루트
    `img/` 에 있었기 때문이다(igpublish 발행 위치 = `publish: img/`).
    """
    near = os.path.join(srcdir, path)           # ① 원고 옆
    if os.path.isfile(near):
        return os.path.normpath(near)
    root = os.path.join(proj, path)             # ② 프로젝트 루트 (병합 복사되는 쪽)
    if os.path.isfile(root):
        stat["img_proj"] += 1
        return os.path.normpath(root)
    # 어느 쪽에도 없으면 ①대로 둔다 — md2pptx 가 "파일없음" 으로 **보고**한다.
    # 여기서 조용히 지우면 그 보고가 사라진다.
    stat["img_missing"] += 1
    return os.path.normpath(near)


def flatten_fences(text, stat):
    """⑪ 컴포넌트 펜스 처리 — wordart 는 평문화, 설정·코드 계열은 제거."""
    lines = text.split("\n")
    out, i = [], 0
    while i < len(lines):
        m = re.match(r"^[ \t]*```([a-zA-Z][\w-]*)[ \t]*$", lines[i])
        kind = m.group(1).lower() if m else None
        if kind not in FENCE_UNWRAP and kind not in FENCE_DROP:
            out.append(lines[i])
            i += 1
            continue
        j, body = i + 1, []
        while j < len(lines) and not FENCE.match(lines[j]):
            body.append(lines[j])
            j += 1
        if kind in FENCE_UNWRAP:
            # 태그만 벗기고 글자는 남긴다 — 이 블록은 **글자가 내용**이다
            for b in body:
                t = TAG.sub("", b).strip()
                if t:
                    out.append(t)
                    out.append("")
            stat["fence_flat"] += 1
        else:
            stat["fence_drop"] += 1             # 설정·코드 — 슬라이드 내용이 아니다
        i = j + 1
    return "\n".join(out)


def _groups(body_lines):
    """블록 그룹으로 자른다. (그룹, 무거운가) — 무거움 = 표 · 단독 이미지 · mermaid.

    ⚠️ mermaid 펜스는 **그림이 된다**(md2pptx 가 렌더해 `![](…)` 로 바꾼다). 코드로 보고
    지나치면 그 뒤의 글이 제목 없는 장으로 흘러 나간다 — 실측(aTest 26번 장)에서 그랬다.
    일반 코드펜스는 텍스트 취급이라 그대로 둔다.
    """
    groups, cur = [], []

    def flush():
        if cur:
            groups.append((list(cur), None))
            cur.clear()

    i = 0
    while i < len(body_lines):
        ln = body_lines[i]
        m = re.match(r"^[ \t]*```([a-zA-Z][\w-]*)?[ \t]*$", ln)
        if m:                                   # 펜스는 통째로 한 그룹
            flush()
            j, blk = i + 1, [ln]
            while j < len(body_lines) and not FENCE.match(body_lines[j]):
                blk.append(body_lines[j])
                j += 1
            if j < len(body_lines):
                blk.append(body_lines[j])
            groups.append((blk, (m.group(1) or "").lower() == "mermaid"))
            i = j + 1
            continue
        if ln.strip():
            cur.append(ln)
        else:
            flush()
        i += 1
    flush()

    out = []
    for g, forced in groups:
        if forced is not None:
            out.append((g, forced))
            continue
        heavy = all(l.lstrip().startswith("|") for l in g) or (
            len(g) == 1 and re.match(r"^!\[[^\]]*\]\([^)]*\)\s*$", g[0].strip()) is not None)
        out.append((g, heavy))
    return out


def defer_heavy(block, stat):
    """⑩ 표·그림이 장 중간에 있고 뒤에 글이 남으면 그 표·그림을 **맨 끝**으로 옮긴다.

    pandoc 의 `Content with Caption` 은 [텍스트…] + [표·그림 하나] 까지만 담는다.
    뒤에 남은 글은 **제목 없는 다음 장**이 된다(실측). 순서만 바꾸면 한 장에 수렴한다.
    """
    lines = block.split("\n")
    head = 0
    while head < len(lines) and not lines[head].strip():
        head += 1
    if head >= len(lines) or not lines[head].lstrip().startswith("#"):
        return block
    title, body = lines[:head + 1], lines[head + 1:]
    gs = _groups(body)
    idx = [i for i, (_, h) in enumerate(gs) if h]
    if len(idx) != 1 or idx[0] == len(gs) - 1:  # 무거운 게 없거나·둘 이상·이미 끝이면 그대로
        return block
    heavy = gs.pop(idx[0])
    gs.append(heavy)
    stat["defer"] += 1
    rebuilt = []
    for g, _ in gs:
        rebuilt += g + [""]
    return "\n".join(title + [""] + rebuilt).rstrip() + "\n"


def bullet_text(t):
    """번호로 시작하는 제목을 불릿에 넣을 때 마침표를 이스케이프한다.

    ⚠️ `* 01. m2slide란?` 는 **중첩 순서 목록**으로 파싱된다 — 항목 본문이 `01.` 로
    시작하기 때문이다(마크다운 규격). 실측: 목차 장이 `1. 2. 3.` 자동번호로 렌더되고
    원래의 `01.`·`02.` 가 사라졌다. `\\.` 로 막으면 글자 그대로 남는다.
    """
    return re.sub(r"^(\d+)([.)])", r"\1\\\2", t)


def normalize_chapter(blocks, chapter_title, stat):
    """⑧ 챕터 진입부를 **H1 단독 + 챕터 TOC** 두 장으로 정규화한다.

    원본(HTML)에서 챕터 진입 장 하나가 담던 것 — 큰 제목(H1)·part 라벨·부제(H2) — 을
    pandoc 이 소화할 수 있는 모양으로 옮긴다:

        # 01. m2slide란?          → Section Header (제목만)
        ## 정체성 한 줄 정의      → Title and Content (부제 + 그 챕터 H2 목록)
                                    = HTML 의 챕터 TOC 장에 대응

    part 라벨("Chapter 1.")은 **버린다** — 제목의 번호("01.")와 같은 말이고, 남기면
    pandoc 이 제목 없는 장으로 흘린다(무제목 5장의 정체가 이것이었다).
    """
    if not blocks:
        return blocks
    first = blocks[0]
    h1 = None
    for ln in first.split("\n"):
        m = H1.match(ln)
        if m:
            h1 = m.group(1)
            break
    if h1 is None:
        return blocks

    # 진입 블록에서 부제 H2 를 찾는다 (없으면 AGENDA 의 챕터명으로 대신한다)
    subtitle = None
    for ln in first.split("\n"):
        m = H2.match(ln)
        if m:
            subtitle = m.group(1)
            break
    if subtitle is None:
        subtitle = chapter_title or h1

    # 챕터 TOC — 나머지 블록의 H2 목록 (본문 장들이 곧 목차 항목이다)
    toc = []
    for b in blocks[1:]:
        for ln in b.split("\n"):
            m = H2.match(ln)
            if m:
                toc.append(m.group(1))
                break

    stat["chapter"] += 1
    entry = "# %s\n" % h1
    tocslide = "## %s\n\n" % subtitle + "".join("* %s\n" % bullet_text(t) for t in toc)
    return [entry, tocslide] + list(blocks[1:])


# ── ⑫ lane B 표시 — 정형 블록을 **네이티브 도형**으로 다시 그릴 장을 골라 적는다 (Issue331)
#
#   여기서 하는 일은 *"이 장의 이 블록은 도형으로 그릴 수 있다"* 를 사이드카
#   (`_pipeline/pptx/lane-b.json`)에 적는 것뿐이다. **원고는 바꾸지 않는다** — 렌더는
#   글로벌 `ppt-info` 가 하고([`lane-b.py`](lane-b.py) 가 호출·병합을 맡는다), 원고는
#   지금처럼 평탄화된 채로 pandoc 에 간다.
#
#   원고를 바꾸지 않는 이유는 **lane A 가 먼저**이기 때문이다. lane B 가 어떤 이유로
#   빠져도(자산 부재·렌더 실패·본문 대조 불일치) 제목·순서·문구는 평문 불릿으로 그대로
#   남는다. 원고에서 블록을 들어내 버리면 그 안전망이 사라진다.
#
#   ⚠️ **lane B 와 lane C 의 경계는 "패턴 카탈로그에 있는가" 하나다**(설계 3레인 표).
#      카탈로그에 없는 htmlart(pie·matrix·venn…)는 도형 배치 자체가 판단이고, 그 판단은
#      장당 33만 토큰짜리 `ig-maker`(lane C) 소관이다. 여기서 비슷한 블록으로
#      **근사하지 않는다** — 근사하면 원본과 다른 도해가 조용히 나간다.
LANE_B_CATALOG = {
    "cards":            "cards",     # 카드 그리드      → ppt-info `cards`
    "htmlart numbered": "cards",     # 번호 카드        → 같은 블록(번호는 우리가 매긴다)
    "htmlart process":  "process",   # 순차 단계        → `cards` + `flow_arrow` 네이티브 커넥터
    "htmlart compare":  "compare",   # 좌우 동등 비교   → `compare` (1:1 대응)
}
FENCE_DIV_OPEN = re.compile(r"^[ \t]*:::+[ \t]*(cards|htmlart[ \t]+[a-z][a-z0-9-]*)"
                            r"(?:[ \t]+\{[^}]*\})?[ \t]*$")
FENCE_DIV_CLOSE = re.compile(r"^[ \t]*:::+[ \t]*$")

# 인라인 마크다운 → pandoc 이 실제로 렌더할 글자. 병합 단계의 본문 대조가 이 문자열을 쓴다
INLINE_MD = (
    (re.compile(r"!\[[^\]]*\]\([^)]*\)"), ""),
    (re.compile(r"\[([^\]]*)\]\([^)]*\)"), r"\1"),
    (re.compile(r"\*\*(.+?)\*\*"), r"\1"),
    (re.compile(r"(?<!\*)\*([^*\n]+)\*(?!\*)"), r"\1"),
    (re.compile(r"`([^`]+)`"), r"\1"),
)


def strip_inline(s):
    """인라인 마크다운을 벗겨 **pandoc 이 렌더할 글자**만 남긴다.

    병합 단계는 이 문자열로 pptx 본문 문단의 끝을 대조하고, 일치할 때만 지운다.
    그래서 여기 규칙은 *"보기 좋게"* 가 아니라 ***"pandoc 과 같게"*** 다.
    """
    for pat, rep in INLINE_MD:
        s = pat.sub(rep, s)
    return re.sub(r"\s+", " ", s).strip()


def parse_div_items(lines):
    """fenced div 본문의 리스트를 `{title, subs[]}` 로 읽는다.

    ⚠️ 들여쓰기 단위는 **2칸 = 1레벨**이다 — m2slide 파서 규약(md-m2slide-rules 카드 절).
       4칸으로 재면 카드 본문이 최상위 항목으로 올라와 **카드 수가 부풀어 오른다.**
    """
    items = []
    for ln in lines:
        m = re.match(r"^([ \t]*)[*+-][ \t]+(.*)$", ln)
        if not m:
            continue
        indent = len(m.group(1).replace("\t", "    "))
        text = m.group(2).strip()
        if indent < 2:
            items.append({"title": text, "subs": []})
        elif items:
            items[-1]["subs"].append(text)
    return items


def scan_lane_b(blocks, src_label, seen, out, stat):
    """정리가 끝난 슬라이드 블록에서 lane B 대상을 골라 `out` 에 적는다.

    적는 것은 넷이다:
        어느 장인가      제목 + **동명 장 안에서의 순번**(pandoc 장 번호는 여기서 알 수 없다)
        무엇을 그리나    카탈로그 종류 + 항목
        어디를 대체하나  블록이 만들어 낼 **문단 문자열 목록**
        어디부터 그리나  블록 앞 본문 줄 수(대략치 — 실제 자리는 병합 단계가 실측한다)

    셋째가 병합의 안전장치다. 실제 pptx 본문의 **끝**이 그 문자열들과 일치할 때만 지운다 —
    위치를 셈으로 맞히면 원고가 조금만 달라져도 엉뚱한 문단이 사라진다.

    ⚠️ **블록 뒤에 본문이 더 있으면 대상에서 뺀다.** 그 경우 지울 자리가 문단 목록의
       끝이 아니라 중간이 되고, 도형을 어디에 놓아야 하는지도 정해지지 않는다.
       흔한 모양이 아니므로(실측 8건 전부 블록이 장 끝) 근사하지 않고 lane C 로 넘긴다.
    """
    for blk in blocks:
        lines = blk.split("\n")
        title = None
        for ln in lines:
            m = H2.match(ln)
            if m:
                title = strip_inline(m.group(1))
                break
        if title is None:
            continue
        ordinal = seen.get(title, 0)
        seen[title] = ordinal + 1

        oi = next((i for i, ln in enumerate(lines) if FENCE_DIV_OPEN.match(ln)), None)
        if oi is None:
            continue
        raw = re.sub(r"[ \t]+", " ", FENCE_DIV_OPEN.match(lines[oi]).group(1)).strip()
        ci = next((j for j in range(oi + 1, len(lines)) if FENCE_DIV_CLOSE.match(lines[j])), None)
        rec = {"src": src_label, "title": title, "ord": ordinal, "raw": raw}

        kind = LANE_B_CATALOG.get(raw)
        if kind is None:
            rec["lane"] = "c"
            rec["reason"] = "패턴 카탈로그 미등재"
            out.append(rec)
            stat["laneb_defer"] += 1
            continue
        if ci is None:
            rec["lane"] = "c"
            rec["reason"] = "fenced div 가 닫히지 않았다"
            out.append(rec)
            stat["laneb_defer"] += 1
            continue
        if any(l.strip() for l in lines[ci + 1:]):
            rec["lane"] = "c"
            rec["reason"] = "블록 뒤에 본문이 더 있다 — 대체 자리가 문단 끝이 아니다"
            out.append(rec)
            stat["laneb_defer"] += 1
            continue

        items = parse_div_items(lines[oi + 1:ci])
        if not items:
            rec["lane"] = "c"
            rec["reason"] = "항목을 읽지 못했다"
            out.append(rec)
            stat["laneb_defer"] += 1
            continue
        if kind == "compare" and len(items) != 2:
            rec["lane"] = "c"
            rec["reason"] = "compare 는 최상위 항목이 정확히 2개여야 한다 (지금 %d)" % len(items)
            out.append(rec)
            stat["laneb_defer"] += 1
            continue

        flat = []
        clean_items = []
        for it in items:
            t = strip_inline(it["title"])
            subs = [strip_inline(s) for s in it["subs"]]
            flat.append(t)
            flat += subs
            clean_items.append({"title": t, "subs": subs})
        rec.update({"lane": "b", "kind": kind, "items": clean_items, "flat": flat,
                    "lead": sum(1 for l in lines[:oi] if l.strip() and not H2.match(l))})
        out.append(rec)
        stat["laneb"] += 1


def clean(text, srcdir, proj, stat, chapter_title=None,
          lane_b=None, lane_b_seen=None, src_label=""):
    text = strip_frontmatter(text)

    # 줄 단위 제거 — 코드 안에 이 형태가 올 일은 없다(줄 전체가 지시자여야 매칭)
    for pat, key in ((ID_LINE, "id"), (ANIM_LINE, "anim"), (SLOT_RIGHT, "slot")):
        text, n = pat.subn("", text)
        stat[key] += n

    # 인라인 제거 — 코드펜스 밖에서만
    rebuilt = []
    for line, protected in split_code(text):
        if protected:
            rebuilt.append(line)
            continue
        line, n1 = ELEMENT_COMMENT.subn("", line)
        # fence 여는 줄의 `{.row .card}` 는 구조다 — 벗기면 닫는 줄로 오독된다(위 FENCE_LINE 주석)
        n2 = 0
        if not FENCE_LINE.match(line):
            line, n2 = ATTR.subn("", line)
        line, n3 = SYMBOL.subn("", line)
        stat["element"] += n1
        stat["attr"] += n2
        stat["symbol"] += n3
        if n3:                                  # 심벌 자리에 남은 이중 공백 정리
            # ⚠️ **선두 들여쓰기는 건드리지 않는다** (Issue331). 줄 전체에 `[ \t]{2,}` 를
            #    걸면 `  - :fa-check: 완료` 의 2칸 들여쓰기가 1칸으로 줄어 **중첩 레벨이
            #    통째로 사라진다**(실측: aTest 심벌 카드 2장이 최상위 10항목으로 펴졌다).
            #    m2slide 파서는 2칸 = 1레벨이라 1칸은 레벨 0 이다.
            head = re.match(r"^[ \t]*", line).group(0)
            body = re.sub(r"[ \t]{2,}", " ", line[len(head):])
            body = re.sub(r"^([*\-+] )[ \t]+", r"\1", body)
            line = head + body
        rebuilt.append(line)
    text = "\n".join(rebuilt)

    text = flatten_fences(text, stat)

    # ⑦ 이미지 절대경로화 — 원고 위치가 바뀌므로 필수
    def abspath(m):
        head, path, title, tail = m.groups()
        if path.startswith(("http://", "https://", "data:", "/")):
            return m.group(0)
        stat["img_abs"] += 1
        return head + resolve_image(path, srcdir, proj, stat) + (title or "") + tail

    text = IMG.sub(abspath, text)

    # ⑧⑩ 구조 정리 — 슬라이드 블록 단위
    blocks = split_slides(text)
    blocks = normalize_chapter(blocks, chapter_title, stat)
    blocks = [defer_heavy(b, stat) for b in blocks]

    # ⑫ lane B 표시 — **원고를 바꾸지 않고** 사이드카에만 적는다
    if lane_b is not None:
        scan_lane_b(blocks, src_label, lane_b_seen, lane_b, stat)

    text = "\n\n---\n\n".join(b.strip() for b in blocks if b.strip())
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def sources(project_dir):
    """m2slide 원고 목록 — `md2pptx.m2slide_sources()` 와 같은 규칙(순서 포함)."""
    mdd = os.path.join(project_dir, "markdown")
    if os.path.isdir(mdd):
        files = sorted(f for f in glob.glob(os.path.join(mdd, "*.md"))
                       if os.path.basename(f) != "AGENDA.md")
        if files:
            return files
    name = os.path.basename(os.path.normpath(project_dir))
    cand = os.path.join(project_dir, name + ".md")
    if os.path.isfile(cand):
        return [cand]
    return sorted(f for f in glob.glob(os.path.join(project_dir, "*.md"))
                  if os.path.basename(f) != "AGENDA.md")


def read_frontmatter(path):
    """맨 앞 YAML 블록을 **얕게** 읽는다 — pyyaml 의존을 만들지 않기 위해 1단 키만."""
    out = {}
    if not os.path.isfile(path):
        return out
    text = open(path, encoding="utf-8").read()
    if not text.startswith("---\n"):
        return out
    end = text.find("\n---", 3)
    if end == -1:
        return out
    for line in text[4:end].split("\n"):
        m = re.match(r"^([a-zA-Z_][\w-]*):\s*(.*)$", line)
        if m and m.group(2).strip():
            out[m.group(1)] = m.group(2).strip().strip("\"'")
    return out


def agenda_chapters(path):
    """AGENDA.md 의 `## [제목](./파일.md)` 목록 → [(제목, 파일basename)]."""
    out = []
    if not os.path.isfile(path):
        return out
    for line in open(path, encoding="utf-8"):
        m = re.match(r"^##[ \t]+\[(.+?)\]\((?:\./)?([^)]+)\)", line)
        if m:
            out.append((m.group(1), os.path.basename(m.group(2))))
    return out


def config_flag(project_dir, key):
    """프로젝트 `_config.yml` 의 1단 키를 읽는다 (없으면 None)."""
    p = os.path.join(project_dir, "_config.yml")
    if not os.path.isfile(p):
        return None
    for line in open(p, encoding="utf-8"):
        m = re.match(r"^%s:\s*(.*)$" % re.escape(key), line)
        if m:
            return re.sub(r"\s+#.*$", "", m.group(1)).strip().strip("\"'")
    return None


def cover_source(project_dir, meta, chapters):
    """⑨ 표지·목차 원고.

    표지는 **pandoc 메타데이터**로 적는다 — pandoc 은 그때만 `Title Slide` 레이아웃을
    쓴다(실측). 맨 앞 빈 줄이 필요하다: `md2pptx.strip_frontmatter()` 가 파일이
    `---` 로 *시작할 때만* 걷어내므로, 한 줄 밀어두면 병합 원고 최상단에 살아 남는다.
    """
    title = meta.get("title") or os.path.basename(os.path.normpath(project_dir))
    sub = TAG.sub("", meta.get("subtitle", "")).strip()
    parts = ["\n---",
             'title: "%s"' % title.replace('"', "'")]
    if sub:
        parts.append('subtitle: "%s"' % sub.replace('"', "'"))
    parts.append("---\n")
    body = "\n".join(parts)
    if len(chapters) >= 2:
        body += "\n## 목차\n\n" + "".join("* %s\n" % bullet_text(t) for t, _ in chapters)
    return body


def main():
    ap = argparse.ArgumentParser(description="m2slide 원고 → pptx 전용 중간 원고")
    ap.add_argument("project_dir")
    ap.add_argument("--out", help="기본 <project_dir>/_pipeline/pptx/source")
    ap.add_argument("--quiet", action="store_true")
    a = ap.parse_args()

    proj = os.path.abspath(a.project_dir)
    if not os.path.isdir(proj):
        sys.exit("[build-source] 프로젝트 폴더 없음: %s" % proj)

    srcs = sources(proj)
    if not srcs:
        # 조용히 0건을 내면 호출자가 "원고가 없는 덱"으로 오해한다 — fail-loud
        sys.exit("[build-source] 원고를 찾지 못했다: %s" % proj)

    outdir = os.path.abspath(a.out or os.path.join(proj, "_pipeline", "pptx", "source"))
    os.makedirs(outdir, exist_ok=True)
    for stale in glob.glob(os.path.join(outdir, "*.md")):
        os.remove(stale)                        # 지난 실행의 잔재가 섞이면 순서가 깨진다

    agenda_path = os.path.join(proj, "markdown", "AGENDA.md")
    meta = read_frontmatter(agenda_path)
    chapters = agenda_chapters(agenda_path)
    chapter_of = {f: t for t, f in chapters}

    stat = {k: 0 for k in ("attr", "element", "id", "anim", "slot", "symbol",
                           "img_abs", "img_proj", "img_missing",
                           "chapter", "defer", "fence_flat", "fence_drop",
                           "laneb", "laneb_defer")}
    made = []
    #   제목 순번은 **덱 전체** 기준이다 — 병합은 pptx 한 벌에서 장을 찾으므로,
    #   파일마다 0 부터 세면 동명 제목이 두 원고에 있을 때 서로를 가리킨다
    lane_b, lane_b_seen = [], {}

    # ⑨ 표지 — `cover_enabled: false` 면 주입하지 않는다 (설정을 존중)
    cover_on = (config_flag(proj, "cover_enabled") or "").lower() not in ("false", "no", "0")
    if cover_on:
        dst = os.path.join(outdir, "00-cover.md")
        with open(dst, "w", encoding="utf-8") as fp:
            fp.write(cover_source(proj, meta, chapters))
        made.append(dst)

    for i, f in enumerate(srcs, 1):
        text = open(f, encoding="utf-8").read()
        text = clean(text, os.path.dirname(os.path.abspath(f)), proj, stat,
                     chapter_title=chapter_of.get(os.path.basename(f)),
                     lane_b=lane_b, lane_b_seen=lane_b_seen,
                     src_label=os.path.basename(f))
        dst = os.path.join(outdir, "%02d-%s" % (i, os.path.basename(f)))
        with open(dst, "w", encoding="utf-8") as fp:
            fp.write(text)
        made.append(dst)

    # ⑫ lane B 사이드카 — 원고 폴더 **옆**에 둔다(`_pipeline/pptx/lane-b.json`).
    #   원고 폴더 안에 두면 `md2pptx` 가 `*.md` 를 긁을 때 섞일 위험이 있고, 이 파일은
    #   원고가 아니라 **원고에 대한 메모**다. 대상이 0건이어도 쓴다 — 파일 부재와
    #   "대상 없음" 은 다른 사실이고, 뒷단이 둘을 구분할 수 있어야 한다.
    sidecar = os.path.join(os.path.dirname(outdir), "lane-b.json")
    with open(sidecar, "w", encoding="utf-8") as fp:
        json.dump({"project": os.path.basename(proj), "targets": lane_b}, fp,
                  ensure_ascii=False, indent=2)

    if not a.quiet:
        print("  원고 %d편 → %s" % (len(made), os.path.relpath(outdir, os.getcwd())),
              file=sys.stderr)
        print("  정리 — attr %d · element주석 %d · #id %d · 애니 %d · ::right:: %d "
              "· 심벌 %d · 이미지절대화 %d(루트에서 %d)"
              % (stat["attr"], stat["element"], stat["id"], stat["anim"],
                 stat["slot"], stat["symbol"], stat["img_abs"], stat["img_proj"]),
              file=sys.stderr)
        print("  구조 — 표지 %s · 목차 %d항목 · 챕터 진입 정규화 %d · 무거운 블록 후치 %d "
              "· 펜스 평문화 %d · 펜스 제거 %d"
              % ("주입" if cover_on else "생략", len(chapters), stat["chapter"],
                 stat["defer"], stat["fence_flat"], stat["fence_drop"]),
              file=sys.stderr)
        print("  lane B 표시 — 대상 %d장 · lane C 이월 %d건 (%s)"
              % (stat["laneb"], stat["laneb_defer"],
                 os.path.relpath(sidecar, os.getcwd())), file=sys.stderr)
        if stat["img_missing"]:
            # 조용히 넘기지 않는다 — 그림이 빠진 채로 "성공" 하는 것이 이 파이프의 고질이다
            print("  ⚠️ 실물을 못 찾은 이미지 %d건 — md2pptx 가 '파일없음' 으로 다시 보고한다"
                  % stat["img_missing"], file=sys.stderr)

    for m in made:
        print(m)


if __name__ == "__main__":
    main()
