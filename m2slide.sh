#!/bin/bash

# Markdown to Reveal.js HTML converter
# Usage: ./convert.sh [project_dir] [--epub] [--pdf]
#   project_dir: Path to project folder (default: from config.yml)
#                Expects project_dir/markdown/ and generates project_dir/slide/
#   --epub: Also generate EPUB file
#   --pdf: Also generate PDF files (uses decktape)

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source dev-server lifecycle (Issue235)
# shellcheck source=lib/dev-server/lifecycle.sh
. "$SCRIPT_DIR/lib/dev-server/lifecycle.sh"

# 프로젝트 이름 → 소스 폴더 절대경로 해석 (Issue294)
# Projects/<name> 우선, 없으면 Projects_deck/decks/*/<name> (덱 basename) 탐색.
# 다중 매칭 시 stderr 경고 후 사전순 첫 매칭 사용 — dev-server `_project_root`(Issue290)와 동일 규약.
# 어느 쪽에도 없으면 Projects/<name> 을 그대로 반환하여 호출부의 기존 not-found 처리를 유지.
_resolve_project_dir() {
  local name="$1"
  local direct="$SCRIPT_DIR/Projects/$name"
  if [ -d "$direct" ]; then
    echo "$direct"
    return 0
  fi
  local decks_root="$SCRIPT_DIR/Projects_deck/decks"
  if [ -d "$decks_root" ]; then
    local matches=()
    local cat
    for cat in "$decks_root"/*/; do
      [ -d "${cat}${name}" ] && matches+=("${cat}${name}")
    done
    if [ ${#matches[@]} -gt 0 ]; then
      if [ ${#matches[@]} -gt 1 ]; then
        echo "⚠️  ambiguous deck token '$name': ${#matches[@]} matches under Projects_deck/decks/*/, using ${matches[0]}" >&2
      fi
      echo "${matches[0]}"
      return 0
    fi
  fi
  echo "$direct"
}

usage() {
  cat <<EOF
Usage: $(basename "$0") [project_dir] [--epub] [--pdf] [--pptx|--ppt-make [--ig]] [-h|--help]

Markdown to Reveal.js HTML converter.

Arguments:
  project_dir       프로젝트 폴더 경로 또는 Projects/ 하위 이름
                    (생략 시 CWD의 _config.yml 또는 root _config.yml의
                    current_project 사용. 결정 실패 시 이 도움말 출력)
                    project_dir/markdown/ 입력, project_dir/slide/ 출력

Options:
  --epub            EPUB 파일도 함께 생성
  --pdf             PDF 파일도 함께 생성 (decktape 사용)
  --pptx            PowerPoint 파일도 함께 생성 (pandoc 사용)
                    산출 직후 check-conform 이 자동 검증하며, FAIL 이면 빌드 실패
  --pptx-no-verify  --pptx + 검증 생략. 차단을 의도적으로 넘길 때만 사용
  --pptx-no-lane-b  --pptx + lane B(cards·정형 htmlart 를 네이티브 도형으로) 생략.
                    기본은 켜져 있다 — 끄면 그 블록들이 평문 불릿으로 남는다
  --ppt-make        ppt-maker 오케스트레이션으로 완성 덱까지 (앞단·lane A·뒷단·보고)
                    --pptx 를 포함한다. lane 은 자동 선택하지 않는다(항상 lane A)
  --ig              --ppt-make 에 인포그래픽 게이트 추가 (ig-selector 선별·비용만.
                    팬아웃은 하지 않는다 — 장당 33만 토큰, 승인은 ig-selector 소유)
  --export-ir       덱 IR(JSON) export (m2unity 계약, stub — _doc_arch/m2unity-contract.md)
  --unity           IR export 후 m2unity 백엔드로 위임 (stub)
  -h, --help        이 도움말 출력 후 종료

Project detection priority:
  1. CLI parameter (project_dir)
  2. CWD에 _config.yml 존재 → CWD를 프로젝트로 사용
  3. Root _config.yml의 current_project (있을 때만)
  결정 실패 시 이 도움말을 출력하고 종료함.

Examples:
  ./m2slide.sh MarkdownGraph            # Projects/MarkdownGraph 변환
  ./m2slide.sh Projects/MyProj --epub   # HTML + EPUB 생성
  ./m2slide.sh MarkdownGraph --pdf      # HTML + PDF 생성
  cd Projects/MyProj && ../../m2slide.sh  # CWD가 프로젝트일 때
EOF

  # Projects/ 폴더 목록 출력
  local projects_dir="$SCRIPT_DIR/Projects"
  if [ -d "$projects_dir" ]; then
    echo ""
    echo "Available projects (Projects/):"
    local found=0
    while IFS= read -r d; do
      [ -z "$d" ] && continue
      local name
      name=$(basename "$d")
      case "$name" in
        .*|_*|z_*) continue ;;
      esac
      printf "  - %s\n" "$name"
      found=1
    done < <(find "$projects_dir" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | sort)
    [ "$found" -eq 0 ] && echo "  (없음)"
  fi
}

# Subcommand: --serve {start|stop|status|restart} (Issue235)
# Handled before main option parser so it can short-circuit without project resolution.
if [ "$1" = "--serve" ]; then
  case "$2" in
    start)    dev_server_start; exit $? ;;
    stop)     dev_server_stop;  exit $? ;;
    status)   dev_server_status; exit $? ;;
    restart)  dev_server_restart; exit $? ;;
    "")       echo "Usage: $(basename "$0") --serve {start|stop|status|restart}" >&2; exit 1 ;;
    *)        echo "❌ Error: Unknown --serve subcommand: $2" >&2; exit 1 ;;
  esac
fi

# Subcommand: --link / --unlink / --links (Issue365 — 외부 프로젝트 마운트)
# 다른 repo 에서 진행 중인 덱을 Projects/<토큰> 심링크로 올려 /p/ 에 등재한다.
# 경로 해소 단일 지점인 dev-server `_project_root()` 가 isdir 판정이라 심링크를 그대로 따라간다
# — 서버는 손대지 않는다. 여기서 더하는 것은 입구(등재·해제·목록)와 안전 가드뿐이다.
if [ "$1" = "--link" ] || [ "$1" = "--unlink" ] || [ "$1" = "--links" ]; then
  link_projects_dir="$SCRIPT_DIR/Projects"
  link_decks_dir="$SCRIPT_DIR/Projects_deck/decks"

  # prj 번호 역조회 — {FPM_BASE}/projects/{N} 최장 prefix 일치.
  # sh/fpm_function.sh cdf-num() 과 동일 정책이며, 번호는 런타임 산출이라 메타 파일을 만들지 않는다.
  m2s_prj_num() {
    local target="$1" base="${FPM_BASE:-$HOME/_git/___pm}/projects"
    [ -d "$base" ] || return 1
    target="$(cd "$target" 2>/dev/null && pwd -P)" || return 1
    local f p best_id="" best_len=-1
    for f in "$base"/[0-9]*; do
      [ -f "$f" ] || continue
      p="$(cat "$f" 2>/dev/null)"
      case "$p" in "~"*) p="$HOME${p#\~}" ;; esac
      p="${p%/}"
      [ -z "$p" ] && continue
      p="$(cd "$p" 2>/dev/null && pwd -P)" || continue
      if [ "$target" = "$p" ] || [ "${target#"$p"/}" != "$target" ]; then
        if [ "${#p}" -gt "$best_len" ]; then
          best_len="${#p}"
          best_id="$(basename "$f")"
        fi
      fi
    done
    [ -n "$best_id" ] || return 1
    echo "$best_id"
  }

  case "$1" in
    --links)
      # 한글은 한 글자가 두 칸이라 헤더 폭을 그만큼 줄여 데이터 열과 맞춘다.
      printf "%-26s %-10s %s\n" "토큰" "소유 prj" "실제 경로"
      printf "%-28s %-12s %s\n" "----------------------------" "------------" "------------------------------"
      link_found=0
      for entry in "$link_projects_dir"/*; do
        [ -L "$entry" ] || continue
        [ -d "$entry" ] || { printf "%-28s %-12s %s\n" "$(basename "$entry")" "-" "⚠️ 끊긴 링크 → $(readlink "$entry")"; link_found=1; continue; }
        link_real="$(cd "$entry" && pwd -P)"
        link_prj="$(m2s_prj_num "$link_real" 2>/dev/null || echo '-')"
        printf "%-28s %-12s %s\n" "$(basename "$entry")" "$link_prj" "$link_real"
        link_found=1
      done
      [ "$link_found" -eq 0 ] && echo "(마운트된 외부 프로젝트 없음)"
      exit 0
      ;;

    --link)
      link_src="$2"
      if [ -z "$link_src" ]; then
        echo "Usage: $(basename "$0") --link <외부경로> [토큰]" >&2
        exit 1
      fi
      case "$link_src" in "~"*) link_src="$HOME${link_src#\~}" ;; esac
      if [ ! -d "$link_src" ]; then
        echo "❌ Error: 디렉토리가 아니거나 존재하지 않음: $link_src" >&2
        exit 1
      fi
      link_real="$(cd "$link_src" && pwd -P)"
      link_tok="${3:-$(basename "$link_real")}"
      if ! [[ "$link_tok" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]]; then
        echo "❌ Error: 토큰 형식 위반 (^[A-Za-z0-9][A-Za-z0-9._-]*$): $link_tok" >&2
        exit 1
      fi
      link_dest="$link_projects_dir/$link_tok"
      if [ -L "$link_dest" ]; then
        link_cur="$(cd "$link_dest" 2>/dev/null && pwd -P || echo '')"
        if [ "$link_cur" = "$link_real" ]; then
          echo "ℹ️  이미 등재됨 (변경 없음): $link_tok → $link_real"
          exit 0
        fi
        echo "❌ Error: 토큰 '$link_tok' 이 다른 경로에 이미 마운트됨: ${link_cur:-$(readlink "$link_dest")}" >&2
        echo "   해제 후 다시 등재: $(basename "$0") --unlink $link_tok" >&2
        exit 1
      fi
      if [ -e "$link_dest" ]; then
        echo "❌ Error: Projects/$link_tok 가 이미 실디렉토리로 존재함 — 다른 토큰을 쓸 것" >&2
        exit 1
      fi
      # deck 토큰과 겹치면 Projects/ 가 우선 매칭되어 덱이 가려진다 — 거부하지 않고 알린다.
      if [ -d "$link_decks_dir" ]; then
        for cat_dir in "$link_decks_dir"/*; do
          [ -d "$cat_dir/$link_tok" ] || continue
          echo "⚠️  같은 토큰의 덱이 있음: $(basename "$cat_dir")/$link_tok — /p/$link_tok 은 이 마운트가 가립니다" >&2
        done
      fi
      ln -s "$link_real" "$link_dest"
      link_prj="$(m2s_prj_num "$link_real" 2>/dev/null || echo '-')"
      echo "✅ 마운트: $link_tok"
      echo "   실제 경로: $link_real"
      echo "   소유 prj:  $link_prj"
      echo "   다음: ./$(basename "$0") $link_tok   → http://127.0.0.1:9877/p/$link_tok"
      exit 0
      ;;

    --unlink)
      link_tok="$2"
      if [ -z "$link_tok" ]; then
        echo "Usage: $(basename "$0") --unlink <토큰>" >&2
        exit 1
      fi
      link_dest="$link_projects_dir/$link_tok"
      if [ ! -e "$link_dest" ] && [ ! -L "$link_dest" ]; then
        echo "❌ Error: Projects/$link_tok 없음" >&2
        exit 1
      fi
      # 오삭제 차단이 이 서브커맨드의 존재 이유 — 실디렉토리는 절대 건드리지 않는다.
      if [ ! -L "$link_dest" ]; then
        echo "❌ Error: Projects/$link_tok 는 실디렉토리입니다 — 본 커맨드는 마운트 해제 전용이라 거부합니다" >&2
        exit 1
      fi
      link_real="$(cd "$link_dest" 2>/dev/null && pwd -P || readlink "$link_dest")"
      rm "$link_dest"
      echo "✅ 마운트 해제: $link_tok (실제 경로는 그대로 남음 — $link_real)"
      exit 0
      ;;
  esac
fi

# Subcommand: --export-ir / --unity (Issue286 — m2unity 출력 백엔드 계약)
# 계약 정본: _doc_arch/m2unity-contract.md. 현재 인터페이스 정의 + stub 단계.
# exporter 실동 구현은 element-level 구조화 파서를 요하므로 계약 ① 확정 후 별도 이슈.
if [ "$1" = "--export-ir" ] || [ "$1" = "--unity" ]; then
  cat >&2 <<EOF
⚠️  $1 은 인터페이스 정의(stub) 단계입니다 (Issue286).

계약 정본:  _doc_arch/m2unity-contract.md
IR 스키마:  data/m2unity/deck-ir.schema.json
골든 덱:    data/m2unity/golden-deck/golden.md + golden.ir.json

실동 exporter 구현은 계약 ① 확정 후 별도 이슈로 진행합니다.
  --export-ir [project]        → Projects/<Name>/res/<Name>.ir.json (예정)
  --unity [project] [-- args]  → IR export 후 m2unity.sh --deck <ir> 위임 (예정)
EOF
  exit 2
fi

# Subcommand: --lint-data (Issue247 Phase D-3)
# data/<stage>/*.yml schema·일관성 검증 + data/_proposals/promotion-*.md status 유효성 검사
if [ "$1" = "--lint-data" ]; then
  echo "🔍 Lint data/ schema·일관성 (Issue247)"
  FAIL=0

  # 1. data/<stage>/*.yml yaml 파싱 검증
  echo ""
  echo "── 1. data/*.yml 파싱 검증 ──"
  for yml in "$SCRIPT_DIR"/data/*/*.yml; do
    [ -f "$yml" ] || continue
    # _backup/ 하위 제외
    case "$yml" in
      */_backup/*) continue ;;
    esac
    if ! python3 -c "
import sys
try:
    import yaml
    with open('$yml') as f:
        yaml.safe_load(f)
except ImportError:
    sys.exit(0)
except Exception as e:
    print('❌ ' + '$yml' + ': ' + str(e), file=sys.stderr)
    sys.exit(1)
" 2>&1; then
      FAIL=1
    fi
  done
  if [ "$FAIL" -eq 0 ]; then
    echo "✅ 모든 data/*.yml 파싱 OK"
  fi

  # 2. patterns.yml categories ↔ priority 매핑 검증
  echo ""
  echo "── 2. patterns.yml categories ↔ priority 일관성 ──"
  PATTERNS_YML="$SCRIPT_DIR/data/slide-tuner/patterns.yml"
  if [ -f "$PATTERNS_YML" ]; then
    python3 - "$PATTERNS_YML" <<'PY' 2>&1 || FAIL=1
import sys
try:
    import yaml
except ImportError:
    sys.exit(0)
path = sys.argv[1]
with open(path) as f:
    cfg = yaml.safe_load(f) or {}
cat_ids = {c.get("id") for c in cfg.get("categories", []) if c.get("id")}
priority = set(cfg.get("priority", []))
missing_in_priority = cat_ids - priority
extra_in_priority = priority - cat_ids
fail = False
if missing_in_priority:
    print(f"❌ {path}: categories에 있으나 priority 누락 — {sorted(missing_in_priority)}", file=sys.stderr)
    fail = True
if extra_in_priority:
    print(f"❌ {path}: priority에 있으나 categories 미정의 — {sorted(extra_in_priority)}", file=sys.stderr)
    fail = True
if not fail:
    print(f"✅ {path}: categories ↔ priority 매핑 OK")
sys.exit(1 if fail else 0)
PY
  else
    echo "ℹ️ $PATTERNS_YML 없음 — skip"
  fi

  # 3. promotion-*.md + post-convert-*.md frontmatter status 유효성
  echo ""
  echo "── 3. promotion-*·post-convert-*.md status 유효성 ──"
  VALID_STATUSES="pending merged rejected held"
  PROP_DIR="$SCRIPT_DIR/data/_proposals"
  PROP_FAIL=0
  if [ -d "$PROP_DIR" ]; then
    for md in "$PROP_DIR"/promotion-*.md "$PROP_DIR"/post-convert-*.md; do
      [ -f "$md" ] || continue
      STATUS=$(awk '/^---$/{f=!f;next} f && /^status:/{print $2; exit}' "$md")
      if [ -z "$STATUS" ]; then
        echo "❌ $md: frontmatter status 누락" >&2
        PROP_FAIL=1
        FAIL=1
        continue
      fi
      VALID=0
      for v in $VALID_STATUSES; do
        if [ "$STATUS" = "$v" ]; then VALID=1; break; fi
      done
      if [ "$VALID" -eq 0 ]; then
        echo "❌ $md: status=$STATUS (valid: $VALID_STATUSES)" >&2
        PROP_FAIL=1
        FAIL=1
      fi
    done
    if [ "$PROP_FAIL" -eq 0 ]; then
      echo "✅ 모든 promotion-*.md status 유효"
    fi
  else
    echo "ℹ️ $PROP_DIR 없음 — skip"
  fi

  # 4. goal-oriented 정책 룰 스키마 검증 (Issue265 — schema_version 2)
  echo ""
  echo "── 4. goal-oriented 룰 스키마 (goal_type·goal_check·evidence) ──"
  if [ -f "$SCRIPT_DIR/lib/lint-policy-schema.py" ]; then
    python3 "$SCRIPT_DIR/lib/lint-policy-schema.py" "$SCRIPT_DIR" || FAIL=1
  else
    echo "ℹ️ lib/lint-policy-schema.py 없음 — skip"
  fi

  # 5. 산출물 검사 — goal_check 를 실제 md 에 적용해 위반 잔존 검출 (Issue265)
  echo ""
  echo "── 5. 산출물 위반 잔존 (goal_check 속성 판정) ──"
  if [ -f "$SCRIPT_DIR/lib/lint-policy-artifacts.py" ]; then
    python3 "$SCRIPT_DIR/lib/lint-policy-artifacts.py" "$SCRIPT_DIR" || FAIL=1
  else
    echo "ℹ️ lib/lint-policy-artifacts.py 없음 — skip"
  fi

  # 6. 범주 선언 검사 — 접근 격리의 판정 근거가 빠짐없이 붙어 있는가 (Issue340)
  #    허용 목록을 사람이 손으로 유지하던 방식이 실제로 어긋났다(slot-designer 가
  #    읽는 slot_*.yml 4종이 목록 밖 → 그 agent 는 매 실행이 문서상 위반이었다).
  #    판정 근거를 위치에서 파일 자신의 `# kind:` 선언으로 옮기고 여기서 집행한다.
  echo ""
  echo "── 6. data/ 범주 선언 (kind: policy/stage · policy/upstream · catalog) ──"
  if [ -f "$SCRIPT_DIR/lib/lint-policy-kind.py" ]; then
    python3 "$SCRIPT_DIR/lib/lint-policy-kind.py" "$SCRIPT_DIR" || FAIL=1
  else
    echo "ℹ️ lib/lint-policy-kind.py 없음 — skip"
  fi

  echo ""
  if [ "$FAIL" -ne 0 ]; then
    echo "❌ lint-data 실패 — 위 위반 항목 수정 필요" >&2
    exit 1
  fi
  echo "✅ lint-data 통과"
  exit 0
fi

# Subcommand: --sync-projects [--check] (Issue253)
# Projects.md 활성/비활성 표를 Projects/<Name>/VERSION 기준으로 동기화.
if [ "$1" = "--sync-projects" ]; then
  node "$SCRIPT_DIR/lib/sync-projects-md.js" "$2"
  exit $?
fi

# Subcommand: --lint-deployment [project] (Issue235)
# Lint build artifacts for file-deployment-rules violations.
if [ "$1" = "--lint-deployment" ]; then
  LINT_TARGET="$2"
  LINT_BASE="$SCRIPT_DIR"
  if [ -n "$LINT_TARGET" ]; then
    if [ -d "$LINT_TARGET" ]; then
      LINT_BASE="$LINT_TARGET"
    else
      # 이름 형태 — Projects/ + Projects_deck/decks/*/ 양쪽 해석 (Issue294)
      LINT_BASE=$(_resolve_project_dir "$LINT_TARGET")
      if [ ! -d "$LINT_BASE" ]; then
        echo "❌ Error: project not found: $LINT_TARGET" >&2; exit 1
      fi
    fi
  fi
  echo "🔍 Lint deployment artifacts under: $LINT_BASE"
  # Patterns that break file:// deployment
  PATTERNS='localhost|127\.0\.0\.1|0\.0\.0\.0|/Users/|/home/[a-z]|file:///Users/|file:///home/'
  HITS=$(find "$LINT_BASE" -path '*/slide/*.html' -type f -print0 2>/dev/null \
    | xargs -0 grep -EHn "$PATTERNS" 2>/dev/null || true)
  if [ -n "$HITS" ]; then
    echo "❌ Deployment violations found (file:// 호환성 위반):" >&2
    echo "$HITS" >&2
    exit 1
  fi
  echo "✅ No deployment violations"
  exit 0
fi

# Subcommand: --lint-license (Issue292)
# Verify --kn-text vs .reveal background WCAG contrast per theme (license badge reuses --kn-text).
if [ "$1" = "--lint-license" ]; then
  node "$SCRIPT_DIR/lib/lint-license.js"
  exit $?
fi

# Parse options
GENERATE_EPUB=false
GENERATE_PDF=false
GENERATE_PPTX=false
PPTX_NO_VERIFY=false
PPTX_NO_LANE_B=false
PPT_ORCHESTRATE=false
PPT_IG=false
PPT_IG_PAGES=""
DEV_SERVE=true
PROJECT_DIR=""

for arg in "$@"; do
  case $arg in
    -h|--help)
      usage
      exit 0
      ;;
    --epub)
      GENERATE_EPUB=true
      ;;
    --pdf)
      GENERATE_PDF=true
      ;;
    --pptx)
      GENERATE_PPTX=true
      ;;
    --pptx-no-verify)
      # 검증 FAIL 이 빌드를 막는 것이 기본이다(Issue317). 이 플래그는 그 차단을
      # **의도적으로** 넘길 때만 쓴다 — 산출물이 규격을 지킨다는 뜻이 아니다.
      GENERATE_PPTX=true
      PPTX_NO_VERIFY=true
      ;;
    --pptx-no-lane-b)
      # Issue331 — 정형 블록(cards·process·compare)의 네이티브 도형 렌더를 끈다.
      #   기본은 켜져 있다. 이 플래그는 회귀를 가를 때("lane B 탓인가") 쓴다.
      GENERATE_PPTX=true
      PPTX_NO_LANE_B=true
      ;;
    --ppt-make)
      # Issue332 — 앞단(ppt-init) · lane A · 뒷단(ppt-check) · 보고를 한 호출로 잇는다.
      #   오케스트레이션 **로직**은 글로벌 소유다. 여기는 호출과 결과 회수만 한다.
      GENERATE_PPTX=true
      PPT_ORCHESTRATE=true
      ;;
    --ig)
      # 인포그래픽 게이트만 켠다. 팬아웃은 ig-selector 소유이고 여기서 하지 않는다.
      PPT_IG=true
      ;;
    --ig-pages=*)
      PPT_IG=true
      PPT_IG_PAGES="${arg#*=}"
      ;;
    --no-serve)
      DEV_SERVE=false
      ;;
    -*)
      echo "❌ Error: Unknown option: $arg" >&2
      echo "" >&2
      usage >&2
      exit 1
      ;;
    *)
      if [ -z "$PROJECT_DIR" ]; then
        PROJECT_DIR="$arg"
      fi
      ;;
  esac
done

# Project detection priority:
#   1. CLI parameter (already set as PROJECT_DIR)
#   2. CWD contains _config.yml → CWD is the project folder
#   3. Root _config.yml → read current_project (있을 때만)
#   결정 실패 시 usage 출력 후 종료
#
# Note: _config.org.yml은 기본값 SSOT로만 사용되며 current_project는
#       명시적으로 주석 처리되어 있음 (사용자가 활성화하지 않는 한 사용되지 않음).

_read_current_project() {
  local cfg="$1"
  grep "^current_project:" "$cfg" 2>/dev/null | sed 's/current_project:[[:space:]]*//'
}

if [ -n "$PROJECT_DIR" ]; then
  if [ -d "$PROJECT_DIR" ]; then
    PROJECT_DIR=$(cd "$PROJECT_DIR" && pwd)
  else
    # 이름 형태 — Projects/ + Projects_deck/decks/*/ 양쪽 해석 (Issue294)
    PROJECT_DIR=$(_resolve_project_dir "$PROJECT_DIR")
  fi
  echo "Using project from parameter: $(basename "$PROJECT_DIR")"
elif [ -f "$PWD/_config.yml" ]; then
  PROJECT_DIR="$PWD"
  echo "Using current directory as project: $PROJECT_DIR"
else
  CURRENT_PROJECT=""
  if [ -f "$SCRIPT_DIR/_config.yml" ]; then
    CURRENT_PROJECT=$(_read_current_project "$SCRIPT_DIR/_config.yml")
    [ -n "$CURRENT_PROJECT" ] && echo "Using project from _config.yml: $CURRENT_PROJECT"
  fi
  if [ -z "$CURRENT_PROJECT" ]; then
    echo "❌ Error: 프로젝트를 결정할 수 없습니다." >&2
    echo "" >&2
    usage >&2
    exit 1
  fi
  PROJECT_DIR="$SCRIPT_DIR/Projects/$CURRENT_PROJECT"
fi

echo "Project directory: $PROJECT_DIR"
INPUT_DIR="$PROJECT_DIR/markdown"
OUTPUT_DIR="$PROJECT_DIR/slide"

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
  echo "❌ Error: Project directory does not exist: $PROJECT_DIR"
  exit 1
fi

# Check if markdown directory exists
if [ -d "$INPUT_DIR" ]; then
  echo "Found markdown directory: $INPUT_DIR"
elif [ -d "$PROJECT_DIR" ]; then
  echo "Markdown directory not found, using project root as input (Single Page Mode)"
  INPUT_DIR="$PROJECT_DIR"
else
  echo "❌ Error: Project directory does not exist: $PROJECT_DIR"
  exit 1
fi

# Remove existing HTML files if output directory exists
if [ -d "$OUTPUT_DIR" ]; then
  echo "Cleaning output directory..."
  rm -f "$OUTPUT_DIR"/*.html
fi

# Define Project Name
PROJECT_NAME=$(basename "$PROJECT_DIR")

# Clean stale download artifacts at project root.
# generate-epub.js writes to PROJECT_DIR first (then m2slide.sh moves to slide/),
# but if filename derivation differs across versions, orphan EPUB/PDF/PPTX may
# accumulate at project root. These artifacts always belong in slide/.
for ext in epub pdf pptx; do
  find "$PROJECT_DIR" -maxdepth 1 -type f -name "*.$ext" -delete 2>/dev/null || true
done

# Run the HTML generator
node "$SCRIPT_DIR/lib/generate-slides.js" "$PROJECT_DIR"

# Generate EPUB if requested
if [ "$GENERATE_EPUB" = true ]; then
  echo ""
  node "$SCRIPT_DIR/lib/generate-epub.js" "$PROJECT_DIR"
  # Move EPUB into slide/ so index.html can link to it (avoid leaving artifact at project root)
  if [ -f "$PROJECT_DIR/$PROJECT_NAME.epub" ]; then
    mv "$PROJECT_DIR/$PROJECT_NAME.epub" "$OUTPUT_DIR/"
    echo "  ✅ Moved EPUB to slide/: $PROJECT_NAME.epub"
  fi
fi

# Generate PDF if requested
if [ "$GENERATE_PDF" = true ]; then
  echo ""
  echo "📄 Generating PDF files..."
  
  # Issue399: decktape 를 직접 부르지 않는다.
  #   decktape 는 슬라이드별 Chrome 폰트 서브셋을 «이름으로» 통합하면서 FontFile2 만
  #   갈아끼우고 각 페이지의 CIDToGIDMap·/W·콘텐츠 CID 는 그대로 둔다 → 한글이 **다른
  #   글자로 치환**된다. 텍스트 레이어는 원문 그대로라 추출 검사로는 안 잡힌다.
  #   래퍼가 통합을 끈 사본을 만들어 실행하고, 패치가 안 먹으면 거기서 죽는다.
  DECKTAPE_CMD="$SCRIPT_DIR/lib/pdf/decktape-run.sh"
  if [ ! -x "$DECKTAPE_CMD" ]; then
    echo "  ❌ lib/pdf/decktape-run.sh 가 없거나 실행 권한이 없습니다 (Issue399)" >&2
    exit 1
  fi

  if ls "$OUTPUT_DIR"/*.html 1> /dev/null 2>&1; then
    # Per-chapter PDFs are written to a temp dir under slide/ then combined
    PDF_TMP_DIR="$OUTPUT_DIR/.pdf-tmp"
    rm -rf "$PDF_TMP_DIR"
    mkdir -p "$PDF_TMP_DIR"
    PDF_EXPECT=0      # Issue398: decktape 가 찍었다고 보고한 장 수의 총합 (합본 기대치)
    PDF_LOSS=0        #           한 장이라도 어긋나면 1
    PDF_DECK_SIZE=""  # Issue402: agenda.html 은 Reveal 덱이 아니라 자기 크기를 모른다 —
                      #           형제 챕터가 알려준 값을 물려받는다

    # Detect single-page mode: in single mode index.html IS the slide deck;
    # in chapter mode index.html is the deck cover and agenda.html is the
    # Markmap landing — neither is a chapter, but **둘 다 PDF 에 들어가야 한다**(Issue402).
    SINGLE_PAGE_MODE=false
    if [ "$INPUT_DIR" = "$PROJECT_DIR" ]; then
      SINGLE_PAGE_MODE=true
    fi

    # 한 HTML → 한 PDF. 크기 산출·decktape 호출·손실 대조·폰트 격리 검사를 한 자리에 둔다.
    #   $1 입력 html · $2 출력 pdf · $3 크기 override("" 면 HTML 에서 읽음) · $4.. decktape 인자
    _pdf_export() {
      local _html="$1" _out="$2" _size_override="$3"; shift 3
      local _nm _size _rev _w _h _log _printed _inpdf
      _nm="$(basename "${_out%.pdf}")"

      # Issue396: 크기는 **산출 HTML 이 이미 답을 갖고 있다** — Reveal.initialize 의
      #   width/height 가 slide_ratio 해석의 최종 결과다. 여기에 매핑표를 두지 않는다.
      _size=""
      if [ -n "$_size_override" ]; then
        _size="$_size_override"
      else
        _rev=$(sed -n '/Reveal\.initialize(/,/^[[:space:]]*});/p' "$_html")
        _w=$(printf '%s\n' "$_rev" | sed -n 's/^[[:space:]]*width:[[:space:]]*\([0-9]\{1,\}\).*/\1/p' | head -1)
        _h=$(printf '%s\n' "$_rev" | sed -n 's/^[[:space:]]*height:[[:space:]]*\([0-9]\{1,\}\).*/\1/p' | head -1)
        if [ -n "$_w" ] && [ -n "$_h" ]; then
          _size="${_w}x${_h}"
          PDF_DECK_SIZE="$_size"
        else
          # 읽기 실패를 조용히 넘기지 않는다 — 기본값으로 떨어지면 비율이 어긋난 PDF 가
          # 성공처럼 나오는 것이 Issue396 의 증상 자체였다
          echo "  ⚠️  $(basename "$_html"): Reveal 크기를 못 읽음 — decktape 기본값(16:9), 비율 확인 필요"
        fi
      fi

      _log="$PDF_TMP_DIR/.$_nm.decktape.log"
      # Issue398: 출력을 tee 로 남겨 `Printed N slides` 를 회수한다 — 그 수가 이 장의
      #   기대 페이지 수다. 아래에서 산출 PDF 와 대조하고 총합을 합본 단계로 넘긴다.
      # shellcheck disable=SC2086
      "$DECKTAPE_CMD" ${_size:+--size $_size} "$@" "$_html" "$_out" 2>&1 \
        | tee "$_log" \
        | grep -vE "Error: <g> attribute transform|translate\(NaN,NaN\)"

      if [ "${PIPESTATUS[0]}" -ne 0 ]; then
        echo "  ❌ Failed to generate PDF for $_nm"
        PDF_LOSS=1
        return 1
      fi

      _printed=$(grep -oE "Printed [0-9]+ slides" "$_log" | tail -1 | grep -oE "[0-9]+")
      _inpdf=$(python3 -c "
from Quartz import PDFDocument
from Foundation import NSURL
import sys
d=PDFDocument.alloc().initWithURL_(NSURL.fileURLWithPath_(sys.argv[1]))
print(d.pageCount() if d is not None else -1)
" "$_out" 2>/dev/null)
      if [ -n "$_printed" ] && [ -n "$_inpdf" ] && [ "$_printed" != "$_inpdf" ]; then
        echo "  ❌ $_nm.pdf: decktape 는 ${_printed}장을 찍었다는데 파일엔 ${_inpdf}p 뿐이다 — 이 장에서 손실"
        PDF_LOSS=1
      else
        echo "  ✅ Generated: $_nm.pdf (${_inpdf:-?}p)"
      fi
      [ -n "$_printed" ] && PDF_EXPECT=$(( PDF_EXPECT + _printed ))

      # Issue399: 글리프 치환은 **텍스트 추출로 안 잡힌다**. 구조로 잰다 —
      #   FontFile2 를 여러 페이지가 공유하면 통합이 돈 것이고 곧 치환된 PDF 다.
      if ! python3 "$SCRIPT_DIR/lib/pdf/check-pdf-fonts.py" "$_out"; then
        PDF_LOSS=1
      fi
      return 0
    }

    # ── 챕터 본문 ─────────────────────────────────────────────────────────────
    for file in "$OUTPUT_DIR"/*.html; do
      filename=$(basename "$file")
      # index.html·agenda.html 은 챕터가 아니다 — 아래에서 따로 뽑는다
      [ "$filename" == "agenda.html" ] && continue
      if [ "$filename" == "index.html" ] && [ "$SINGLE_PAGE_MODE" != true ]; then
        continue
      fi
      echo "  Processing $filename..."
      _pdf_export "$file" "$PDF_TMP_DIR/${filename%.*}.pdf" "" reveal
    done

    # ── 표지·목차 (Issue402) ──────────────────────────────────────────────────
    #   chapter mode 에서 index.html(덱 표지)·agenda.html(전체 목차)이 통째로
    #   빠져 있었다. 챕터마다 자기 표지·자기 목차는 있어서 «있는 것처럼» 보이지만
    #   덱 제목과 전체 차례는 어디에도 없다 — 배포본으로는 결함이다.
    PDF_COVER=""
    PDF_AGENDA=""
    if [ "$SINGLE_PAGE_MODE" != true ]; then
      if [ -f "$OUTPUT_DIR/index.html" ]; then
        echo "  Processing index.html (덱 표지)..."
        _pdf_export "$OUTPUT_DIR/index.html" "$PDF_TMP_DIR/000-cover.pdf" "" reveal \
          && PDF_COVER="$PDF_TMP_DIR/000-cover.pdf"
      fi
      if [ -f "$OUTPUT_DIR/agenda.html" ]; then
        # agenda.html 은 Reveal 덱이 아니라 Markmap 랜딩이다 — generic 플러그인으로
        # 한 장만 찍는다. markmap 은 JS 렌더라 pause 를 넉넉히 주고, --media print 로
        # 웹 UI(다운로드 버튼)를 인쇄에서 뺀다.
        echo "  Processing agenda.html (전체 목차)..."
        _pdf_export "$OUTPUT_DIR/agenda.html" "$PDF_TMP_DIR/001-agenda.pdf" "$PDF_DECK_SIZE" \
          --pause 3000 generic --max-slides 1 --media print \
          && PDF_AGENDA="$PDF_TMP_DIR/001-agenda.pdf"
      fi
    fi

    # Combine per-chapter PDFs into a single PDF in slide/ for download button
    echo ""
    echo "  📚 Combining chapter PDFs..."
    COMBINED_PDF="$OUTPUT_DIR/$PROJECT_NAME.pdf"
    # 순서는 파일명 정렬에 맡기지 않는다 — 표지·목차가 먼저다
    PDF_LIST=()
    [ -n "$PDF_COVER" ] && PDF_LIST+=("$PDF_COVER")
    [ -n "$PDF_AGENDA" ] && PDF_LIST+=("$PDF_AGENDA")
    while IFS= read -r p; do
      case "$(basename "$p")" in 000-cover.pdf|001-agenda.pdf) continue ;; esac
      PDF_LIST+=("$p")
    done < <(find "$PDF_TMP_DIR" -maxdepth 1 -name "*.pdf" | sort)

    if [ "${#PDF_LIST[@]}" -gt 0 ]; then
      if python3 "$SCRIPT_DIR/lib/combine-pdfs.py" --expect "$PDF_EXPECT" "$COMBINED_PDF" "${PDF_LIST[@]}"; then
        echo "  ✅ Combined PDF saved to slide/: $PROJECT_NAME.pdf"
      else
        echo "  ❌ Failed to combine PDFs"
        PDF_LOSS=1
      fi
    else
      echo "  ⚠️  No chapter PDFs found to combine."
      PDF_LOSS=1
    fi

    # Clean up temp dir (per-chapter PDFs)
    rm -rf "$PDF_TMP_DIR"

    # Issue399/401: 여기까지 왔는데 PDF_LOSS 가 서 있으면 **성공으로 보고하지 않는다**.
    #   구 코드는 이 값을 세워 두고 아무 데서도 읽지 않아, 장 단위 손실을 알고도
    #   exit 0 으로 끝났다.
    if [ "$PDF_LOSS" -ne 0 ]; then
      echo ""
      echo "  ❌ PDF 생성에 결함이 있습니다 — 위 판정 줄을 읽고 배포 전에 확인하십시오." >&2
      exit 2
    fi
  else
    echo "  ⚠️  No HTML files found to convert."
  fi
fi

# Generate PPTX if requested
if [ "$GENERATE_PPTX" = true ]; then
  echo ""
  echo "📊 Generating PowerPoint (PPTX) file..."

  # ── 재진입 가드 (Issue332) — 상호 재귀를 **루프가 아니라 즉시 실패**로 만든다
  #
  #   글로벌 `ppt-deck/deck.py` 의 폴백 ①은 *"프로젝트에 m2slide 가 있으면 m2slide.sh
  #   --pptx 에 위임"* 이다(`ppt-maker/make.py` 의 lane A 도 deck.py 를 거치므로 같다).
  #   m2slide 가 그 둘을 부르지 않는 것이 1차 방어이고(설계 원칙 — build-pptx.sh 주석),
  #   이 가드가 2차 방어다: 원칙은 사람이 어길 수 있지만 가드는 어겨지지 않는다.
  #
  #   PPTX 경로에 들어오는 순간 깊이를 1로 올려 자식 프로세스 전체에 물려준다. 글로벌이
  #   어떤 경로로든 되불러 오면 그 재진입은 여기서 rc1 로 끊긴다 — 무한 루프도, 조용한
  #   중복 빌드도 성립하지 않는다.
  if [ "${M2SLIDE_PPTX_DEPTH:-0}" != "0" ]; then
    echo "  ❌ PPTX 재귀 감지 (M2SLIDE_PPTX_DEPTH=$M2SLIDE_PPTX_DEPTH)" >&2
    echo "     m2slide 의 pptx 경로가 자기 자신을 되부르고 있다." >&2
    echo "     원인은 거의 언제나 하나다 — 글로벌 ppt-deck/deck.py(또는 ppt-maker/make.py)를" >&2
    echo "     호출했고, 그쪽 폴백 ①이 m2slide.sh --pptx 로 되위임한 것이다." >&2
    echo "     해법: md2pptx.py 를 직접 부르는 lib/pptx/build-pptx.sh 경로만 쓴다." >&2
    exit 1
  fi
  export M2SLIDE_PPTX_DEPTH=1

  if ! command -v pandoc &> /dev/null; then
      echo "  ❌ Error: Pandoc is not installed. Please install it to use --pptx option."
      echo "  brew install pandoc"
      exit 1
  fi

  PPTX_OUTPUT="$OUTPUT_DIR/$PROJECT_NAME.pptx"

  # Issue315/316 — 테마 반영 경로. single/chapter 분기는 md2pptx.py 의 --m2slide 가 흡수한다.
  #   구 경로(`pandoc <md...>` 직접)는 --reference-doc 이 없어 테마·팔레트가 소실되고
  #   `#layout-*` 지시자가 본문에 누출됐다(igTest 실측 5건). 폴백을 두지 않는 이유는
  #   그 산출물이 "성공"으로 보이면서 조용히 품질을 되돌리기 때문이다.
  #
  # Issue317 — **검증 FAIL 은 빌드를 실패시킨다(차단).** 경고로 두지 않은 이유:
  #   check-conform 의 FAIL 은 "PowerPoint 가 거부하거나 깨져 보이는 위반"이다.
  #   그런 파일을 성공으로 통과시키면 index.html 에 다운로드 버튼까지 달려 배포된다 —
  #   바로 위 폴백을 없앤 것과 같은 이유다. 심각도 구분은 m2slide 가 하지 않는다:
  #   FAIL/WARN 은 check-conform 이 이미 가르며, WARN 은 rc0 이라 통과한다.
  #   --pptx 는 옵트인 경로라 기본 빌드(`./m2slide.sh <P>`)에는 영향이 없다.
  PPTX_ARGS=()
  [ "$PPTX_NO_VERIFY" = true ] && PPTX_ARGS+=(--no-verify)
  [ "$PPTX_NO_LANE_B" = true ] && PPTX_ARGS+=(--no-lane-b)

  # Issue332 — `--ppt-make` 면 오케스트레이터를 거친다. 그 안에서도 lane A 는 결국
  #   같은 build-pptx.sh 라, 산출물은 두 경로가 동일하다. 오케스트레이터가 더하는 것은
  #   **앞단(ppt-init)·뒷단(ppt-check)·인포그래픽 게이트·보고**뿐이다.
  PPTX_DRIVER="$SCRIPT_DIR/lib/pptx/build-pptx.sh"
  if [ "$PPT_ORCHESTRATE" = true ]; then
    PPTX_DRIVER="$SCRIPT_DIR/lib/pptx/ppt-make.sh"
    [ "$PPT_IG" = true ] && PPTX_ARGS+=(--ig)
    [ -n "$PPT_IG_PAGES" ] && PPTX_ARGS+=(--ig-pages "$PPT_IG_PAGES")
  elif [ "$PPT_IG" = true ]; then
    echo "  ⚠️  --ig 는 --ppt-make 와 함께 쓴다 (인포그래픽 게이트는 오케스트레이터 단계다). 무시함" >&2
  fi

  PPTX_RC=0
  "$PPTX_DRIVER" "$PROJECT_DIR" "$PPTX_OUTPUT" "${PPTX_ARGS[@]+"${PPTX_ARGS[@]}"}" || PPTX_RC=$?

  case "$PPTX_RC" in
    0)
      echo "  ✅ Generated: $PROJECT_NAME.pptx"
      [ "$PPTX_NO_VERIFY" = true ] && echo "  ⚠️  검증 생략됨 (--pptx-no-verify) — 규격 위반 여부는 확인되지 않았다"
      ;;
    4)
      # 덱은 완주했고 **인포그래픽만** 승인 대기다(ig-selector 비용 게이트 exit 4).
      # ppt-maker 규약과 같다 — 4는 실패가 아니라 개입 대기다. 덱 산출은 성공이므로
      # 빌드를 실패시키지 않되, 신호가 묻히지 않도록 한 줄로 남긴다.
      echo "  ✅ Generated: $PROJECT_NAME.pptx"
      echo "  ⏸  인포그래픽 승인 대기 — 팬아웃 명령은 위 ⑤ 단계가 출력했다(ig-selector 소유)"
      ;;
    2)
      echo "  ❌ PPTX 검증 실패 — 파일은 생성됐으나 규격 위반이 있다: $PPTX_OUTPUT"
      echo "  Note: 위 판정의 FAIL 항목을 고친 뒤 다시 돌린다. 이 파일은 배포하지 말 것."
      echo "        손으로 재검할 때는 --lane a 를 반드시 붙인다 (기본값 b 는 lane A 덱을 오판한다):"
      echo "          python3 ~/.claude/skills/ppt-check/scripts/check-conform.py \"$PPTX_OUTPUT\" --lane a"
      echo "        검증을 의도적으로 건너뛰려면: ./m2slide.sh $PROJECT_NAME --pptx --pptx-no-verify"
      exit 1
      ;;
    *)
      echo "  ❌ Failed to generate PPTX"
      echo "  Note: 원고에 pandoc 이 처리 못 하는 문법이 있는지, ppt-* 글로벌 SCAR 가 설치돼 있는지 확인."
      exit 1
      ;;
  esac

fi

# Refresh index.html so download buttons reflect newly generated artifacts in slide/
if [ "$GENERATE_EPUB" = true ] || [ "$GENERATE_PDF" = true ] || [ "$GENERATE_PPTX" = true ]; then
  echo ""
  echo "🔄 Refreshing index.html with download buttons..."
  node "$SCRIPT_DIR/lib/generate-slides.js" "$PROJECT_DIR" > /dev/null
  echo "  ✅ index.html refreshed"
fi

# Auto-start dev-server (Issue235) — opt-out via --no-serve or dev_server: false in _config.yml
if [ "$DEV_SERVE" = true ]; then
  # Honor _config.yml dev_server: false (project-level or root-level)
  DEV_SERVER_OPT_OUT=false
  for cfg in "$PROJECT_DIR/_config.yml" "$SCRIPT_DIR/_config.yml"; do
    if [ -f "$cfg" ] && grep -qE "^dev_server:[[:space:]]*false" "$cfg" 2>/dev/null; then
      DEV_SERVER_OPT_OUT=true
      break
    fi
  done

  if [ "$DEV_SERVER_OPT_OUT" = false ]; then
    echo ""
    echo "🌐 Starting dev-server (Issue235)..."
    dev_server_start || echo "  ⚠️  dev-server start failed — file:// still works"
    REL_PROJECT="${PROJECT_DIR#"$SCRIPT_DIR/"}"
    echo "  📂 http://${DEV_SERVER_BIND}:${DEV_SERVER_PORT}/${REL_PROJECT}/slide/index.html"
  fi
fi
