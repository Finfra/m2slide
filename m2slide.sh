#!/bin/bash

# Markdown to Reveal.js HTML converter
# Usage: ./convert.sh [project_dir] [--epub] [--pdf]
#   project_dir: Path to project folder (default: from config.yml)
#                Expects project_dir/markdown/ and generates project_dir/slide/
#   --epub: Also generate EPUB file
#   --pdf: Also generate PDF files (uses decktape)

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Parse options
GENERATE_EPUB=false
GENERATE_PDF=false
GENERATE_PPTX=false
PROJECT_DIR=""

for arg in "$@"; do
  case $arg in
    --epub)
      GENERATE_EPUB=true
      ;;
    --pdf)
      GENERATE_PDF=true
      ;;
    --pptx)
      GENERATE_PPTX=true
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
#   3. Root _config.yml → read current_project
#   4. Root _config.org.yml → read current_project (fallback)

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
  if [ -z "$CURRENT_PROJECT" ] && [ -f "$SCRIPT_DIR/_config.org.yml" ]; then
    CURRENT_PROJECT=$(_read_current_project "$SCRIPT_DIR/_config.org.yml")
    [ -n "$CURRENT_PROJECT" ] && echo "Using project from _config.org.yml: $CURRENT_PROJECT"
  fi
  if [ -z "$CURRENT_PROJECT" ]; then
    echo "❌ Error: Could not determine project. Pass a project path or set current_project in _config.yml"
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

# Run the HTML generator
node "$SCRIPT_DIR/lib/generate-slides.js" "$PROJECT_DIR"

# Generate EPUB if requested
if [ "$GENERATE_EPUB" = true ]; then
  echo ""
  node "$SCRIPT_DIR/lib/generate-epub.js" "$PROJECT_DIR"
fi

# Define Project Name
PROJECT_NAME=$(basename "$PROJECT_DIR")

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
    for file in "$OUTPUT_DIR"/*.html; do
      filename=$(basename "$file")
      
      # Skip index.html (Markmap)
      if [ "$filename" == "index.html" ]; then
        continue
      fi
      
      name="${filename%.*}"
      echo "  Processing $filename..."
      
      # Run decktape and filter out known non-critical SVG errors
      # shellcheck disable=SC2086
      $DECKTAPE_CMD reveal "$file" "$PROJECT_DIR/$name.pdf" 2>&1 | grep -vE "Error: <g> attribute transform|translate\(NaN,NaN\)"

      # Check exit code of the first command in the pipe (decktape)
      if [ "${PIPESTATUS[0]}" -eq 0 ]; then
          echo "  ✅ Generated: $name.pdf"
      else
          echo "  ❌ Failed to generate PDF for $name"
      fi
    done
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

  PPTX_OUTPUT="$PROJECT_DIR/$PROJECT_NAME.pptx"
  
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
