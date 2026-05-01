#!/bin/bash

# Deploy slides to GitHub Pages
# Copies current project's slide files to docs/{project}/ folder,
# updates docs/index.html with a project card, commits, and pushes.
# Usage: ./lib/deploy.sh [-p|--project ProjectName] [commit_message]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Parse arguments
PROJECT_ARG=""
COMMIT_ARG=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--project)
      PROJECT_ARG="$2"
      shift 2
      ;;
    *)
      COMMIT_ARG="$1"
      shift
      ;;
  esac
done

CONFIG_FILE="$ROOT_DIR/_config.yml"
if [ ! -f "$CONFIG_FILE" ]; then
  echo "❌ Error: _config.yml not found"
  exit 1
fi

if [ -n "$PROJECT_ARG" ]; then
  CURRENT_PROJECT="$PROJECT_ARG"
else
  CURRENT_PROJECT=$(grep "^current_project:" "$CONFIG_FILE" | sed 's/current_project:[[:space:]]*//')
fi

if [ -z "$CURRENT_PROJECT" ]; then
  echo "❌ Error: project not specified (use -p ProjectName or set current_project in _config.yml)"
  exit 1
fi

echo "📦 Deploying project: $CURRENT_PROJECT"
echo ""

PROJECT_DIR="$ROOT_DIR/Projects/$CURRENT_PROJECT"
SLIDE_DIR="$PROJECT_DIR/slide"
DOCS_DIR="$ROOT_DIR/docs"
PROJECT_DOCS_DIR="$DOCS_DIR/$CURRENT_PROJECT"

if [ ! -d "$SLIDE_DIR" ]; then
  echo "❌ Error: Slide directory does not exist: $SLIDE_DIR"
  echo "Run ./m2slide.sh first to generate slides"
  exit 1
fi

if ! ls "$SLIDE_DIR"/*.html 1>/dev/null 2>&1; then
  echo "❌ Error: No HTML files found in $SLIDE_DIR"
  echo "Run ./m2slide.sh first to generate slides"
  exit 1
fi

# Extract title from AGENDA.md first # heading, fallback to project folder name
AGENDA_FILE="$PROJECT_DIR/markdown/AGENDA.md"
PROJECT_TITLE="$CURRENT_PROJECT"
if [ -f "$AGENDA_FILE" ]; then
  AGENDA_TITLE=$(grep "^# " "$AGENDA_FILE" | head -1 | sed 's/^# //')
  if [ -n "$AGENDA_TITLE" ]; then
    PROJECT_TITLE="$AGENDA_TITLE"
  fi
fi

echo "📝 Project title: $PROJECT_TITLE"
echo ""

# Copy slides to docs/{project}/
echo "📂 Copying slides..."
echo "   From: $SLIDE_DIR"
echo "   To:   $PROJECT_DOCS_DIR"
echo ""

if [ -d "$PROJECT_DOCS_DIR" ]; then
  rm -rf "$PROJECT_DOCS_DIR"
fi
cp -r "$SLIDE_DIR" "$PROJECT_DOCS_DIR"

# Copy EPUB if exists
EPUB_FILE="$PROJECT_DIR/$CURRENT_PROJECT.epub"
if [ -f "$EPUB_FILE" ]; then
  cp "$EPUB_FILE" "$PROJECT_DOCS_DIR/"
  echo "✅ Copied EPUB: $CURRENT_PROJECT.epub"
fi

HTML_COUNT=$(find "$PROJECT_DOCS_DIR" -maxdepth 1 -name "*.html" | wc -l | tr -d ' ')
echo "✅ Copied $HTML_COUNT HTML files"
if [ -d "$PROJECT_DOCS_DIR/img" ]; then
  IMG_COUNT=$(find "$PROJECT_DOCS_DIR/img" -maxdepth 1 -type f | wc -l | tr -d ' ')
  echo "✅ Copied $IMG_COUNT image files"
fi
echo ""

# Update docs/index.html — add or replace project card
INDEX_FILE="$DOCS_DIR/index.html"
if [ ! -f "$INDEX_FILE" ]; then
  echo "❌ Error: docs/index.html not found"
  exit 1
fi

echo "🔗 Updating docs/index.html..."
python3 - "$INDEX_FILE" "$CURRENT_PROJECT" "$PROJECT_TITLE" << 'PYEOF'
import re, sys

index_path, project_id, project_title = sys.argv[1], sys.argv[2], sys.argv[3]

with open(index_path, "r", encoding="utf-8") as f:
    content = f.read()

new_card = (
    f'    <a class="card" href="{project_id}/index.html" data-project="{project_id}">\n'
    f'      <h2>{project_title}</h2>\n'
    f'      <div class="project-id">{project_id}</div>\n'
    f'      <span class="badge">프레젠테이션</span>\n'
    f'    </a>'
)

pattern = r'    <a class="card"[^>]*data-project="' + re.escape(project_id) + r'"[^>]*>.*?</a>'
if re.search(pattern, content, re.DOTALL):
    new_content = re.sub(pattern, new_card, content, flags=re.DOTALL)
    print(f"  ✅ Updated existing entry for {project_id}")
else:
    marker = "    <!-- PROJECT_ENTRIES_END -->"
    if marker in content:
        new_content = content.replace(marker, new_card + "\n" + marker)
        print(f"  ✅ Added new entry for {project_id}")
    else:
        print("  ⚠️  PROJECT_ENTRIES_END marker not found — index.html not updated")
        sys.exit(0)

with open(index_path, "w", encoding="utf-8") as f:
    f.write(new_content)
PYEOF

echo ""

# Git operations
echo "🔄 Git operations..."
echo ""
git -C "$ROOT_DIR" add docs

if git -C "$ROOT_DIR" diff --cached --quiet; then
  echo "ℹ️  No changes to commit"
  exit 0
fi

echo "📝 Changes to be committed:"
git -C "$ROOT_DIR" diff --cached --stat
echo ""

if [ -n "$COMMIT_ARG" ]; then
  COMMIT_MESSAGE="$COMMIT_ARG"
else
  COMMIT_MESSAGE="deploy: $CURRENT_PROJECT slides"
fi

echo "💾 Committing..."
git -C "$ROOT_DIR" commit -m "$COMMIT_MESSAGE"

echo "🚀 Pushing to GitHub..."
git -C "$ROOT_DIR" push

echo ""
echo "✅ Deployment complete!"
echo "🌐 View at: https://finfra.github.io/m2slide/"
echo "⏳ GitHub Pages will update in 1-2 minutes"
