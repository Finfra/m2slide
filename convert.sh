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

# If no project directory specified, read from config.yml
if [ -z "$PROJECT_DIR" ]; then
  CONFIG_FILE="$SCRIPT_DIR/config.yml"

  if [ -f "$CONFIG_FILE" ]; then
    # Read current_project from config.yml
    CURRENT_PROJECT=$(grep "^current_project:" "$CONFIG_FILE" | sed 's/current_project:[[:space:]]*//')

    if [ -z "$CURRENT_PROJECT" ]; then
      echo "⚠️  Warning: current_project not found in config.yml, using default"
      CURRENT_PROJECT="LlmAndVibeCoding"
    fi
  else
    echo "⚠️  Warning: config.yml not found, using default project"
    CURRENT_PROJECT="LlmAndVibeCoding"
  fi

  PROJECT_DIR="$SCRIPT_DIR/Projects/$CURRENT_PROJECT"
  echo "Using project from config.yml: $CURRENT_PROJECT"
else
  # Resolve to absolute path
  PROJECT_DIR=$(cd "$PROJECT_DIR" 2>/dev/null && pwd || echo "$PROJECT_DIR")
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
      $DECKTAPE_CMD reveal "$file" "$PROJECT_DIR/$name.pdf" 2>&1 | grep -vE "Error: <g> attribute transform|translate\(NaN,NaN\)"
      
      # Check exit code of the first command in the pipe (decktape)
      if [ ${PIPESTATUS[0]} -eq 0 ]; then
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
      pandoc "$MD_FILE" -o "$PPTX_OUTPUT" --resource-path="$PROJECT_DIR"
      if [ $? -eq 0 ]; then
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
    pandoc "$INPUT_DIR"/*.md -o "$PPTX_OUTPUT" --resource-path="$INPUT_DIR"
    
    if [ $? -eq 0 ]; then
        echo "  ✅ Generated: $PROJECT_NAME.pptx"
    else
        echo "  ❌ Failed to generate PPTX"
        echo "  Note: Ensure markdown files do not contain syntax incompatible with Pandoc."
    fi
  fi
fi
