#!/bin/bash

# Markdown to Reveal.js HTML converter
# Usage: ./convert.sh [project_dir]
#   project_dir: Path to project folder (default: ~/Documents/LlmAndVibeCoding)
#                Expects project_dir/markdown/ and generates project_dir/slide/

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Parse arguments
if [ $# -eq 0 ]; then
  # No arguments: use default project in Documents
  PROJECT_DIR="$HOME/Documents/LlmAndVibeCoding"
else
  # One argument: project directory
  PROJECT_DIR="$1"
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

# Run the generator
node "$SCRIPT_DIR/generate-slides.js" "$PROJECT_DIR"
