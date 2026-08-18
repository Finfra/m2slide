#!/usr/bin/env python3
"""build-source.py — m2slide 원고 → **pptx 전용 중간 원고** (Issue327)

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

⑦이 필수인 이유
---------------
`md2pptx.fix_images()` 는 이미지 상대경로를 **그 원고 파일이 있는 디렉토리** 기준으로
푼다. 중간 원고는 `_pipeline/pptx/source/` 에 놓이므로 `./img/x.png` 가 거기서 풀려
전부 "파일없음" 이 된다. 절대경로면 `fix_images` 가 그대로 통과시킨다(실측 확인).

⚠️ 내용을 새로 쓰지 않는다
--------------------------
문구는 원본 그대로 옮기고 **구조만** 만든다. 넘으면 HTML 덱과 pptx 가 서로 다른 말을
하기 시작한다. 구조 슬라이드 주입은 Issue328, layout 유도는 Issue329 로 분리돼 있다 —
한 커밋에 몰면 회귀가 났을 때 원인을 못 가른다.

사용
----
    build-source.py <project_dir> [--out DIR] [--quiet]

    stdout : 생성한 원고 경로 (한 줄에 하나, 순서 = 변환 순서)
    stderr : 처리 통계
"""
import argparse
import glob
import os
import re
import sys

# ── ① pandoc attribute. `.column`·`.columns` 는 pandoc 이 아는 어휘라 건드리지 않는다.
#    (m2slide 멀티컬럼이 그 문법을 쓰고, md2pptx 도 PANDOC_DIV 로 통과시킨다)
ATTR = re.compile(r"\s*\{\.(?!column\b|columns\b)[a-zA-Z][\w .:=\"'-]*\}")
ELEMENT_COMMENT = re.compile(r"\s*<!--\s*\.(element|slide):.*?-->", re.S)
ID_LINE = re.compile(r"^[ \t]*#id-[a-z][a-z0-9-]*[ \t]*$", re.M)
ANIM_LINE = re.compile(
    r"^[ \t]*#(?:transition-[\w-]+|background-[\w.#-]+|background-(?:image|size|transition)-\S+"
    r"|auto-animate|autoslide-\d+)[ \t]*$", re.M)
SLOT_RIGHT = re.compile(r"^[ \t]*::right::[ \t]*$", re.M)
SYMBOL = re.compile(r":fa-[\w-]+:")
IMG = re.compile(r"(!\[[^\]]*\]\()([^)\s]+)(\s+\"[^\"]*\")?(\))")
FENCE = re.compile(r"^[ \t]*```")


def split_code(text):
    """(코드밖, 코드안) 조각을 순서대로 내는 제너레이터.

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


def clean(text, srcdir, proj, stat):
    lines = []
    for line, protected in split_code(text):
        if protected:
            lines.append(line)
            continue
        lines.append(line)
    text = "\n".join(lines)

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
        line, n2 = ATTR.subn("", line)
        line, n3 = SYMBOL.subn("", line)
        stat["element"] += n1
        stat["attr"] += n2
        stat["symbol"] += n3
        if n3:                                  # 심벌 자리에 남은 이중 공백 정리
            line = re.sub(r"[ \t]{2,}", " ", line)
            line = re.sub(r"(^|[*\-+] )[ \t]+", r"\1", line)
        rebuilt.append(line)
    text = "\n".join(rebuilt)

    # ⑦ 이미지 절대경로화 — 원고 위치가 바뀌므로 필수
    def abspath(m):
        head, path, title, tail = m.groups()
        if path.startswith(("http://", "https://", "data:", "/")):
            return m.group(0)
        stat["img_abs"] += 1
        return head + resolve_image(path, srcdir, proj, stat) + (title or "") + tail

    text = IMG.sub(abspath, text)

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

    stat = {k: 0 for k in ("attr", "element", "id", "anim", "slot", "symbol",
                           "img_abs", "img_proj", "img_missing")}
    made = []
    for i, f in enumerate(srcs, 1):
        text = open(f, encoding="utf-8").read()
        text = clean(text, os.path.dirname(os.path.abspath(f)), proj, stat)
        dst = os.path.join(outdir, "%02d-%s" % (i, os.path.basename(f)))
        with open(dst, "w", encoding="utf-8") as fp:
            fp.write(text)
        made.append(dst)

    if not a.quiet:
        print("  원고 %d편 → %s" % (len(made), os.path.relpath(outdir, os.getcwd())),
              file=sys.stderr)
        print("  정리 — attr %d · element주석 %d · #id %d · 애니 %d · ::right:: %d "
              "· 심벌 %d · 이미지절대화 %d(루트에서 %d)"
              % (stat["attr"], stat["element"], stat["id"], stat["anim"],
                 stat["slot"], stat["symbol"], stat["img_abs"], stat["img_proj"]),
              file=sys.stderr)
        if stat["img_missing"]:
            # 조용히 넘기지 않는다 — 그림이 빠진 채로 "성공" 하는 것이 이 파이프의 고질이다
            print("  ⚠️ 실물을 못 찾은 이미지 %d건 — md2pptx 가 '파일없음' 으로 다시 보고한다"
                  % stat["img_missing"], file=sys.stderr)

    for m in made:
        print(m)


if __name__ == "__main__":
    main()
