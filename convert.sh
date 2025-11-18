#!/bin/bash

# Markdown to Reveal.js HTML converter
# Usage: ./convert.sh [project_dir] [--epub]
#   project_dir: Path to project folder (default: from config.yml)
#                Expects project_dir/markdown/ and generates project_dir/slide/
#   --epub: Also generate EPUB file

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Parse options
GENERATE_EPUB=false
PROJECT_DIR=""

for arg in "$@"; do
  if [ "$arg" = "--epub" ]; then
    GENERATE_EPUB=true
  else
    PROJECT_DIR="$arg"
  fi
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
if [ ! -d "$INPUT_DIR" ]; then
  echo "❌ Error: Markdown directory does not exist: $INPUT_DIR"
  echo "Expected structure: $PROJECT_DIR/markdown/"
  exit 1
fi

# Remove existing HTML files if output directory exists
if [ -d "$OUTPUT_DIR" ]; then
  echo "Cleaning output directory..."
  rm -f "$OUTPUT_DIR"/*.html
fi

# Run the HTML generator
node "$SCRIPT_DIR/generate-slides.js" "$PROJECT_DIR"

# Generate EPUB if requested
if [ "$GENERATE_EPUB" = true ]; then
  echo ""
  node "$SCRIPT_DIR/generate-epub.js" "$PROJECT_DIR"
fi

# Copy EPUB file to slide directory if it exists
PROJECT_NAME=$(basename "$PROJECT_DIR")
EPUB_FILE="$PROJECT_DIR/$PROJECT_NAME.epub"

if [ -f "$EPUB_FILE" ]; then
  echo ""
  echo "📚 Copying EPUB file to slide directory..."
  cp "$EPUB_FILE" "$OUTPUT_DIR/"
  echo "  ✅ Copied: $PROJECT_NAME.epub → slide/"
fi
