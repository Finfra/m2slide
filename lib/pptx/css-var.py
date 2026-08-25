#!/usr/bin/env python3
"""css-var.py — 빌드 산출 CSS 에서 **실제 적용되는** 커스텀 속성 값을 읽는다.

왜 필요한가
-----------
pptx 산출에서 제목색·강조색을 정하려면 *"이 덱이 실제로 무슨 색을 쓰는가"* 를 알아야
한다. 그런데 그 값은 한 파일에 있지 않다 — 기본값은 [`lib/css/base.css`](../css/base.css)
의 `:root` 에 있고, theme 이 같은 이름을 덮어쓴 것이 빌드 산출 `slide/css/custom.css`
에 들어간다. 한쪽만 보면 틀린다:

    --m2-accent-5  base.css `:root` = #2ECC71   custom.css 에는 **팔레트 스코프에만** 존재
    --kn-text      base.css 는 `var(--m2-text)` 로 넘김   custom.css theme `:root` = #111111

그래서 **두 파일을 순서대로 겹쳐 읽고 마지막 hex 정의를 취한다.** CSS 캐스케이드를
전부 흉내내지는 않는다 — `:root` 블록의 hex 리터럴만 본다. 그 밖의 selector(팔레트
블록 스코프 `.m2-htmlart[data-palette=…]` 등)는 덱 전역 색이 아니므로 일부러 뺀다.

사용
----
    css-var.py <project_dir> <--var> [<--var-대안> …]

    첫 번째로 값이 잡히는 변수의 hex 를 stdout 에 낸다(`#` 없이 대문자).
    하나도 못 잡으면 아무것도 내지 않고 rc 1 — 호출자가 교정을 건너뛰면 된다.
"""
import os
import re
import sys

#   ⚠️ `^` 는 **줄 시작**이어야 한다(`re.M`). 문자열 시작으로만 잡으면 `:root` 앞이
#      주석(`*/`)인 실제 파일에서 한 건도 안 걸린다 — 첫 구현이 그래서 빈 값을 냈다.
ROOT_BLOCK = re.compile(r"^[ \t]*:root\s*\{(.*?)\}", re.S | re.M)
#   ⚠️ 주석을 먼저 지운다. base.css 의 `:root` 첫 주석에 `theme/{name}/palettes/{palette}.css`
#      가 적혀 있어 그 `}` 가 블록의 끝으로 읽힌다 — 실제로 그래서 accent 를 놓쳤다.
COMMENT = re.compile(r"/\*.*?\*/", re.S)


def resolve(var, files):
    val = None
    for path in files:
        if not os.path.isfile(path):
            continue
        text = COMMENT.sub("", open(path, encoding="utf-8").read())
        for m in ROOT_BLOCK.finditer(text):
            hits = re.findall(r"%s:\s*(#[0-9A-Fa-f]{6})" % re.escape(var), m.group(1))
            if hits:
                val = hits[-1]                  # 같은 블록 안에서도 뒤가 이긴다
    return val


def main():
    if len(sys.argv) < 3:
        sys.exit("사용: css-var.py <project_dir> <--var> [대안…]")
    proj = os.path.abspath(sys.argv[1])
    here = os.path.dirname(os.path.abspath(__file__))
    files = [os.path.join(here, "..", "css", "base.css"),      # 기본값
             os.path.join(proj, "slide", "css", "custom.css")]  # theme override (뒤가 이긴다)
    for var in sys.argv[2:]:
        v = resolve(var, files)
        if v:
            print(v.lstrip("#").upper())
            return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())
