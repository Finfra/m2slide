#!/usr/bin/env python3
"""`3.nondeterminism --mechanism` 의 판정부 (Issue413).

ego 가 낸 JSON 한 줄을 받아 «오판이 영구 고정되는 구조가 남아 있는가» 를 판정한다.
"""
import json
import sys


def main(raw: str) -> int:
    try:
        d = json.loads(raw)
    except Exception:                                  # noqa: BLE001
        print("  ❌ 측정 실패 — ego 출력이 JSON 이 아닙니다:", raw[:120], file=sys.stderr)
        return 2
    if d.get("bodies", 0) == 0:
        print("  ⏭️  SKIP — 이 슬라이드에 .contents-body 가 없습니다")
        return 0
    if d.get("latched", 0) == 0:
        print("  ⏭️  SKIP — 아직 아무 body 도 판정하지 않았습니다(대기 시간 부족)")
        return 0
    # 판별자 — latch 된 body 는 **측정 키를 반드시 갖고 있어야** 한다.
    #   현 코드는 연속 두 번 같은 측정일 때만 latch 하므로 `-m` 이 먼저 남는다.
    #   구 코드는 첫 측정에 바로 latch 하므로 `-m` 이 **아예 없다**.
    bad = d.get("latchedWithoutMeasure", 0)
    if bad:
        print(f"  ❌ latch 된 {d['latched']}개 중 **{bad}개가 측정 키 없이** 고정됐습니다"
              " — 첫 측정에 바로 판정하는 구조입니다 (Issue407 구 코드의 형태)", file=sys.stderr)
        return 1
    print(f"  ✅ latch {d['latched']}개 전부 측정 키를 거쳐 고정됐습니다 — 조기 판정 0")
    print("     ⚠️ 이것은 «비결정성 없음» 이 아니라 **«오판을 영구 고정하는 구조가 없음»** 의 증명입니다")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else ""))
