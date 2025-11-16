#!/bin/bash

# Markdown to Reveal.js HTML converter
# Usage: ./convert.sh [input_dir] [output_dir]
#   input_dir: Path to markdown files (default: ~/Documents/LlmAndVibeCoding)
#   output_dir: Path to output HTML files (default: input_dir + "_slide")

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Parse arguments
if [ $# -eq 0 ]; then
  # No arguments: use default directories in current project
  INPUT_DIR="$SCRIPT_DIR/Documents/LlmAndVibeCoding"
  OUTPUT_DIR="$SCRIPT_DIR/Documents/LlmAndVibeCoding_slide"
elif [ $# -eq 1 ]; then
  # One argument: input dir, auto-generate output dir
  INPUT_DIR="$1"
  OUTPUT_DIR="${1}_slide"
else
  # Two arguments: both specified
  INPUT_DIR="$1"
  OUTPUT_DIR="$2"
fi

echo "Input directory: $INPUT_DIR"
echo "Output directory: $OUTPUT_DIR"

# Check if input directory exists
if [ ! -d "$INPUT_DIR" ]; then
  echo "❌ Error: Input directory does not exist: $INPUT_DIR"
  exit 1
fi

# Remove existing HTML files if output directory exists
if [ -d "$OUTPUT_DIR" ]; then
  echo "Cleaning output directory..."
  rm -f "$OUTPUT_DIR"/*.html
fi

# Run the generator
node "$SCRIPT_DIR/generate-slides.js" "$INPUT_DIR" "$OUTPUT_DIR"
