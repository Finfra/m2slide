#!/bin/bash
# 정책 yml 혼재 커밋 경고 (Issue298 / Issue265 사례 B 보강)
#
# staged 변경에 정책 yml 이 포함되고 동시에 그와 무관한 파일이 섞여 있으면
# 경고한다. 정책 변경은 "무엇을 강제할지"를 바꿔 산출물 전체에 파급되므로,
# 무해한 파일들 사이에 묻히면 회귀 원인을 격리할 수 없다.
#
# ⚠️ 정책 판정은 **경로가 아니라 파일 첫 줄의 `# kind:` 선언**이다 (Issue340).
#    구 판정은 `data/*/*.yml` glob 이라 하위 폴더의 카탈로그(htmlart/·palettes/)를
#    정책으로 오분류하고, 루트 직속 카탈로그(component-libraries 등)는 "그 외"로
#    보냈다 — 같은 catalog 13개가 위치 때문에 두 그룹으로 갈렸다(실측 2026-09-09).
#    경로 기반 판정이 어긋난다는 것이 Issue340 의 출발점이었으므로 여기도 같이 고친다.
#
# 차단이 아니라 경고 — 설계 문서·lint 구현 등 정당한 동반 변경이 존재하므로
# hard fail 은 과하다. 규율 SSOT: .claude/rules/data-access-rules.md "정책 yml 커밋 규율".
#
# 이 스크립트는 pre-commit 훅으로 심어져 실행된다 (install-hooks.sh 참조).
# repo 마다 개별 설치 필요 (.git/hooks/ 는 git 추적 대상이 아님).

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# staged (added/copied/modified/renamed) 파일 목록. 삭제(D)는 제외.
# macOS 기본 bash 3.2 에 mapfile 이 없으므로 while-read 로 수집.
policy_yml=()   # 정책 yml
other=()        # 그 외 (혼재 경고 대상). 동반 허용·_backup 은 어느 쪽에도 안 넣음

while IFS= read -r f; do
  [ -n "$f" ] || continue
  case "$f" in
    # _backup/ 하위는 판정 제외
    data/*/_backup/*) ;;
    # data/ 하위 yml — **staged 내용의 첫 줄 kind 선언**으로 가른다.
    #   `policy/*` 면 정책, `catalog` 면 정책이 아니다. 선언이 없으면(구 파일·신규)
    #   안전측으로 정책 취급한다 — 경고를 덜 내는 쪽으로 기울면 규율이 무의미해진다.
    data/*.yml|data/*/*.yml|data/*/*/*.yml)
      #   ⚠️ `git show … | head -1` 을 쓰지 말 것. head 가 먼저 닫으면 git 이 SIGPIPE 로
      #      죽고, `set -o pipefail` 때문에 훅 전체가 rc 141 로 조용히 끝난다 — 큰 정책
      #      yml 에서만 재현되어 정작 경고가 필요한 커밋에서 경고가 사라진다(실측).
      #      sed 가 입력을 끝까지 읽고 첫 줄만 내보내므로 파이프가 끊기지 않는다.
      kind="$({ git show ":$f" 2>/dev/null || true; } \
              | sed -n '1s/^#[[:space:]]*kind:[[:space:]]*\([a-z/]*\).*/\1/p')"
      case "$kind" in
        catalog) ;;                       # 카탈로그는 어휘 목록이라 파급이 다르다
        *)       policy_yml+=("$f") ;;
      esac
      ;;
    # 동반 허용 (정책 변경의 일부) — other 로 분류하지 않음 (무시)
    _doc_arch/*.md) ;;
    .claude/rules/data-access-rules.md) ;;
    lib/lint-policy-*.py) ;;
    lib/hooks/check-policy-commit.sh) ;;
    z_test/fixtures/policy/*) ;;
    z_test/run-policy-fixture.sh) ;;
    # 그 외 전부 — 혼재 경고 대상
    *)                other+=("$f") ;;
  esac
done < <(git diff --cached --name-only --diff-filter=ACMR)

# 정책 yml 이 없으면 이 훅과 무관
[ "${#policy_yml[@]}" -eq 0 ] && exit 0
# 정책 yml + 동반 허용만 있으면 정상 (단독 커밋 규율 충족)
[ "${#other[@]}" -eq 0 ] && exit 0

# 혼재 감지 — 경고 (차단 아님)
{
  echo ""
  echo "⚠️  정책 yml 혼재 커밋 감지 (Issue298 / 사례 B)"
  echo "   정책 yml(kind: policy/*)이 무관한 파일과 같은 커밋에 섞여 있습니다."
  echo "   정책은 산출물 전체에 파급되므로 단독 커밋을 권장합니다."
  echo ""
  echo "   정책 yml (${#policy_yml[@]}):"
  printf '     + %s\n' "${policy_yml[@]}"
  echo "   혼재된 그 외 파일 (${#other[@]}):"
  printf '     - %s\n' "${other[@]}"
  echo ""
  echo "   규율: .claude/rules/data-access-rules.md \"정책 yml 커밋 규율\""
  echo "   분리하려면:  git reset  후  정책 yml 만 add 하여 별도 커밋"
  echo ""
} >&2

# 경고만 — 커밋은 진행. 강제 차단이 필요하면 아래 주석 해제.
# exit 1
exit 0
