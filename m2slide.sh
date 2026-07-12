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

usage() {
  cat <<EOF
Usage: $(basename "$0") [project_dir] [--epub] [--pdf] [--pptx] [-h|--help]

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
    elif [ -d "$SCRIPT_DIR/Projects/$LINT_TARGET" ]; then
      LINT_BASE="$SCRIPT_DIR/Projects/$LINT_TARGET"
    else
      echo "❌ Error: project not found: $LINT_TARGET" >&2; exit 1
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

# Parse options
GENERATE_EPUB=false
GENERATE_PDF=false
GENERATE_PPTX=false
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
  elif [ -d "$SCRIPT_DIR/Projects/$PROJECT_DIR" ]; then
    PROJECT_DIR="$SCRIPT_DIR/Projects/$PROJECT_DIR"
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
  
  if command -v decktape &> /dev/null; then
      DECKTAPE_CMD="decktape"
  else
      echo "  ⚠️  Decktape not found in PATH. Using npx..."
      DECKTAPE_CMD="npx -y decktape"
  fi

  if ls "$OUTPUT_DIR"/*.html 1> /dev/null 2>&1; then
    # Per-chapter PDFs are written to a temp dir under slide/ then combined
    PDF_TMP_DIR="$OUTPUT_DIR/.pdf-tmp"
    rm -rf "$PDF_TMP_DIR"
    mkdir -p "$PDF_TMP_DIR"

    # Detect single-page mode: in single mode index.html IS the slide deck;
    # in chapter mode index.html is a redirect/cover and agenda.html is the
    # Markmap landing — neither is a Reveal.js deck.
    SINGLE_PAGE_MODE=false
    if [ "$INPUT_DIR" = "$PROJECT_DIR" ]; then
      SINGLE_PAGE_MODE=true
    fi

    for file in "$OUTPUT_DIR"/*.html; do
      filename=$(basename "$file")

      # agenda.html is a Markmap landing page in both modes — never a Reveal deck
      if [ "$filename" == "agenda.html" ]; then
        continue
      fi

      # In chapter mode, index.html is redirect/cover (not a deck) — skip.
      # In single-page mode, index.html IS the deck — process it.
      if [ "$filename" == "index.html" ] && [ "$SINGLE_PAGE_MODE" != true ]; then
        continue
      fi

      name="${filename%.*}"
      echo "  Processing $filename..."

      # Run decktape and filter out known non-critical SVG errors
      # shellcheck disable=SC2086
      $DECKTAPE_CMD reveal "$file" "$PDF_TMP_DIR/$name.pdf" 2>&1 | grep -vE "Error: <g> attribute transform|translate\(NaN,NaN\)"

      # Check exit code of the first command in the pipe (decktape)
      if [ "${PIPESTATUS[0]}" -eq 0 ]; then
          echo "  ✅ Generated: $name.pdf"
      else
          echo "  ❌ Failed to generate PDF for $name"
      fi
    done

    # Combine per-chapter PDFs into a single PDF in slide/ for download button
    echo ""
    echo "  📚 Combining chapter PDFs..."
    COMBINED_PDF="$OUTPUT_DIR/$PROJECT_NAME.pdf"
    PDF_LIST=()
    while IFS= read -r p; do
      PDF_LIST+=("$p")
    done < <(find "$PDF_TMP_DIR" -maxdepth 1 -name "*.pdf" | sort)

    if [ "${#PDF_LIST[@]}" -gt 0 ]; then
      if python3 "$SCRIPT_DIR/lib/combine-pdfs.py" "$COMBINED_PDF" "${PDF_LIST[@]}"; then
        echo "  ✅ Combined PDF saved to slide/: $PROJECT_NAME.pdf"
      else
        echo "  ❌ Failed to combine PDFs"
      fi
    else
      echo "  ⚠️  No chapter PDFs found to combine."
    fi

    # Clean up temp dir (per-chapter PDFs)
    rm -rf "$PDF_TMP_DIR"
  else
    echo "  ⚠️  No HTML files found to convert."
  fi
fi

# Generate PPTX if requested
if [ "$GENERATE_PPTX" = true ]; then
  echo ""
  echo "📊 Generating PowerPoint (PPTX) file..."

  if ! command -v pandoc &> /dev/null; then
      echo "  ❌ Error: Pandoc is not installed. Please install it to use --pptx option."
      echo "  brew install pandoc"
      exit 1
  fi

  PPTX_OUTPUT="$OUTPUT_DIR/$PROJECT_NAME.pptx"
  
  # Check if we are in Single Page Mode
  if [ "$INPUT_DIR" = "$PROJECT_DIR" ]; then
    # Single mode: find the main markdown file
    # We re-use logic similar to generate-epub but simplified for shell
    MD_FILE=""
    if [ -f "$PROJECT_DIR/$PROJECT_NAME.md" ]; then
      MD_FILE="$PROJECT_DIR/$PROJECT_NAME.md"
    elif [ -f "$PROJECT_DIR/README.md" ]; then
       MD_FILE="$PROJECT_DIR/README.md"
    else
       # First .md file
       MD_FILE=$(find "$PROJECT_DIR" -maxdepth 1 -name "*.md" -not -name "AGENDA.md" | head -n 1)
    fi
    
    if [ -n "$MD_FILE" ]; then
      if pandoc "$MD_FILE" -o "$PPTX_OUTPUT" --resource-path="$PROJECT_DIR"; then
         echo "  ✅ Generated: $PROJECT_NAME.pptx"
      else
         echo "  ❌ Failed to generate PPTX"
      fi
    else
      echo "  ❌ No markdown file found for PPTX generation"
    fi
  else
    # Chapter Mode: Combine all markdown files
    # Only include .md files not AGENDA.md
    echo "  Combining markdown files from $INPUT_DIR..."
    
    # Use glob carefully
    if pandoc "$INPUT_DIR"/*.md -o "$PPTX_OUTPUT" --resource-path="$INPUT_DIR"; then
        echo "  ✅ Generated: $PROJECT_NAME.pptx"
    else
        echo "  ❌ Failed to generate PPTX"
        echo "  Note: Ensure markdown files do not contain syntax incompatible with Pandoc."
    fi
  fi

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
