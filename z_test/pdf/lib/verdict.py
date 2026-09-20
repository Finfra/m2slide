#!/usr/bin/env python3
"""3경로 측정값 → 결함 계열 판정 (Issue413).

판정표 SSOT 는 `_doc_arch/pdf-parity-design.md` 「3경로 대조」다. 여기는 그 표를
코드로 옮긴 것이고, 표가 바뀌면 **양쪽을 같이** 고친다.

rc 0 = 셋이 일치 · rc 1 = 어긋남(계열을 찍는다) · rc 2 = 측정 실패
"""
import json
import sys

TOL_FS = 0.5     # px — 반올림·힌팅 오차
TOL_X = 0.004    # 정규화 폭 — 0.4%


def same(a, b):
    return abs(a["fs"] - b["fs"]) <= TOL_FS and abs(a["x"] - b["x"]) <= TOL_X


def main(argv):
    names = ["① 화면", "② 단독", "③ 전체"]
    try:
        vals = [json.loads(x) for x in argv[:3]]
    except json.JSONDecodeError:
        print("  ❌ 측정값을 읽지 못했습니다 — 위 세 줄을 확인하십시오", file=sys.stderr)
        return 2
    for n, v in zip(names, vals):
        if "miss" in v or "skip" in v:
            print(f"  ❌ {n} 에서 탐침을 찾지 못했습니다 — 슬라이드 번호·문자열을 확인하십시오",
                  file=sys.stderr)
            return 2

    s, o, f = vals
    so, of, sf = same(s, o), same(o, f), same(s, f)
    fs = " / ".join(f"{n} {v['fs']}px@x{v['x']}" for n, v in zip(names, vals))
    print(f"  측정: {fs}")

    if so and of:
        print("  ✅ 셋이 일치 — 이 축은 변환 경로에서 어긋나지 않았습니다")
        print("     ⚠️ 다만 **셋 다 똑같이 잘못**일 수 있습니다(C4 — HTML 자체 결함).")
        print("        그건 기계가 못 가릅니다. 화면을 사람이 보고 판정하십시오")
        return 0
    if so and not of:
        print("  ❌ **C3** — ①②는 같은데 ③만 다릅니다. 연속 인쇄 중 타이밍 의존"
              " (Issue407 계열)", file=sys.stderr)
        print("     처방: 런타임 레이아웃 판정이 굳기 전에 내려지지 않는지 본다"
              " → lib/component-hooks/*.client.js", file=sys.stderr)
        return 1
    if of and not so:
        print("  ❌ **C1/C2** — ②③은 같은데 ①(화면)만 다릅니다. 변환 경로가 화면과"
              " 다른 것을 그립니다", file=sys.stderr)
        print("     처방: C1 계약 미전달(m2slide.sh 배선) 또는 C2 도구 내부 결함"
              "(decktape·병합기) — lib/pdf/ 를 본다", file=sys.stderr)
        return 1
    print("  ❌ **복합** — 셋이 서로 다릅니다. 한 축씩 가르십시오", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
