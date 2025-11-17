#!/bin/bash

# Deploy slides to GitHub Pages
# Copies current project's slide files to docs/ folder, commits, and pushes to GitHub
# Usage: ./deploy.sh [commit_message]

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Read current project from config.yml
CONFIG_FILE="$SCRIPT_DIR/config.yml"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "❌ Error: config.yml not found"
  exit 1
fi

# Read current_project from config.yml
CURRENT_PROJECT=$(grep "^current_project:" "$CONFIG_FILE" | sed 's/current_project:[[:space:]]*//')

if [ -z "$CURRENT_PROJECT" ]; then
  echo "❌ Error: current_project not found in config.yml"
  exit 1
fi

echo "📦 Deploying project: $CURRENT_PROJECT"
echo ""

# Define paths
PROJECT_DIR="$SCRIPT_DIR/Projects/$CURRENT_PROJECT"
SLIDE_DIR="$PROJECT_DIR/slide"
DOCS_DIR="$SCRIPT_DIR/docs"

# Check if slide directory exists
if [ ! -d "$SLIDE_DIR" ]; then
  echo "❌ Error: Slide directory does not exist: $SLIDE_DIR"
  echo "Run ./convert.sh first to generate slides"
  exit 1
fi

# Check if there are any HTML files in slide directory
if ! ls "$SLIDE_DIR"/*.html 1> /dev/null 2>&1; then
  echo "❌ Error: No HTML files found in $SLIDE_DIR"
  echo "Run ./convert.sh first to generate slides"
  exit 1
fi

# Copy slide files to docs
echo "📂 Copying slides to docs folder..."
echo "   From: $SLIDE_DIR"
echo "   To: $DOCS_DIR"
echo ""

# Remove existing docs folder and create new one
if [ -d "$DOCS_DIR" ]; then
  rm -rf "$DOCS_DIR"
fi

# Copy all files from slide to docs
cp -r "$SLIDE_DIR" "$DOCS_DIR"

# Count copied files
HTML_COUNT=$(ls "$DOCS_DIR"/*.html 2>/dev/null | wc -l)
echo "✅ Copied $HTML_COUNT HTML files"

# Check if img folder exists and report
if [ -d "$DOCS_DIR/img" ]; then
  IMG_COUNT=$(ls "$DOCS_DIR/img" 2>/dev/null | wc -l)
  echo "✅ Copied $IMG_COUNT image files"
fi

echo ""

# Git operations
echo "🔄 Git operations..."
echo ""

# Add docs folder
git add docs

# Check if there are changes to commit
if git diff --cached --quiet; then
  echo "ℹ️  No changes to commit"
  exit 0
fi

# Show what will be committed
echo "📝 Changes to be committed:"
git diff --cached --stat
echo ""

# Get commit message from argument or use default
if [ $# -eq 0 ]; then
  COMMIT_MESSAGE="Update slides: $CURRENT_PROJECT"
else
  COMMIT_MESSAGE="$1"
fi

# Commit
echo "💾 Committing changes..."
git commit -m "$COMMIT_MESSAGE"

# Push
echo "🚀 Pushing to GitHub..."
git push

echo ""
echo "✅ Deployment complete!"
echo "🌐 View at: https://finfra.github.io/m2slide/"
echo "⏳ GitHub Pages will update in 1-2 minutes"
