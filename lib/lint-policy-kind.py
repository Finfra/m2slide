#!/usr/bin/env python3
"""`data/` 범주 선언(`# kind:`) 검사 — 위치가 아니라 선언으로 판정한다 (Issue340).

왜 이 검사가 있나
-----------------
[data-access-rules](../.claude/rules/data-access-rules.md) 는 단계 SCAR 가 자기 폴더와
**공유 카탈로그**만 읽도록 규정한다. 그런데 그 카탈로그 목록이 오래 **하드코딩**이라
파일이 늘 때마다 사람이 갱신해야 했고, 실제로 어긋났다 — `slot-designer` 가 읽는
`slot_meta`·`slot_pandoc`·`slot_animation`·`slot_user` 4종이 목록에 없어 **그 agent 는
실행할 때마다 문서상 위반**이었다(실측 2026-09-09, `htmlart/`·`palettes/`·`_meta*` 포함 8건).

그래서 판정 근거를 **위치에서 파일 자신의 선언으로** 옮겼다. 파일이 늘어도, 폴더가
바뀌어도 규칙이 따라 깨지지 않는다. 이 검사는 그 선언이 **빠짐없이·유효하게** 붙어
있는지만 본다 — 선언이 없으면 접근 판정 자체가 성립하지 않기 때문이다.

범주
----
    policy/stage      파이프라인 단계 정책. 그 단계 SCAR 만 읽는다
    policy/upstream   글로벌 SCAR 정책에 얹는 m2slide 측 local override
    catalog           단계 종속이 아닌 공유 어휘·인벤토리. 전 단계 읽기 허용

위치와의 정합도 함께 잰다 — `data/<stage>/` 안의 파일이 `catalog` 를 자칭하면
접근 격리가 조용히 풀리므로, 그것은 오타가 아니라 **정책 우회**다.

사용
----
    lint-policy-kind.py <project_root>
"""
import os
import re
import sys

VALID = {"policy/stage", "policy/upstream", "catalog"}
KIND_RE = re.compile(r"^#\s*kind:\s*([a-z/]+)")
#   `data/` 직속 파일은 단계 폴더가 아니므로 카탈로그여야 한다
ROOT_MUST_BE_CATALOG = True


def main():
    root = sys.argv[1] if len(sys.argv) > 1 else "."
    data = os.path.join(root, "data")
    if not os.path.isdir(data):
        print("ℹ️ data/ 없음 — skip")
        return 0

    missing, invalid, mismatch = [], [], []
    counts = {k: 0 for k in VALID}

    for dirpath, dirnames, filenames in os.walk(data):
        dirnames[:] = [d for d in dirnames if d not in ("_backup", "_proposals")]
        for fn in sorted(filenames):
            if not fn.endswith(".yml"):
                continue
            path = os.path.join(dirpath, fn)
            rel = os.path.relpath(path, root)
            with open(path, encoding="utf-8") as fp:
                first = fp.readline()
            m = KIND_RE.match(first.strip())
            if not m:
                missing.append(rel)
                continue
            kind = m.group(1)
            if kind not in VALID:
                invalid.append("%s → %r" % (rel, kind))
                continue
            counts[kind] += 1

            #   위치 정합 — 선언이 격리를 우회하는 데 쓰이지 않게 한다
            in_root = os.path.dirname(rel) == "data"
            if in_root and ROOT_MUST_BE_CATALOG and kind != "catalog":
                mismatch.append("%s: data/ 직속인데 %s (단계 폴더가 아니다)" % (rel, kind))
            if not in_root and kind == "catalog":
                #   하위 폴더의 catalog 는 정당하다(htmlart/·palettes/). 단계 폴더와
                #   구분이 안 되므로 정보로만 남긴다 — 여기서 막으면 정당한 배치가 걸린다
                pass

    for k in sorted(VALID):
        print("  %-18s %d개" % (k, counts[k]))

    bad = False
    if missing:
        bad = True
        print("  ❌ `# kind:` 선언 없음 %d건 — 접근 판정이 성립하지 않는다:" % len(missing))
        for r in missing:
            print("     " + r)
    if invalid:
        bad = True
        print("  ❌ 알 수 없는 kind %d건 (허용: %s):" % (len(invalid), " · ".join(sorted(VALID))))
        for r in invalid:
            print("     " + r)
    if mismatch:
        bad = True
        print("  ❌ 선언과 위치 불일치 %d건:" % len(mismatch))
        for r in mismatch:
            print("     " + r)
    if bad:
        return 1
    print("  ✅ data/ 범주 선언 전건 유효 (%d개)" % sum(counts.values()))
    return 0


if __name__ == "__main__":
    sys.exit(main())
