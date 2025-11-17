#!/bin/bash

# markmap HTML 파일 생성 스크립트

MD_DIR="/Users/nowage/Desktop/LlmAndVibeCodingGen/md"
OUTPUT_DIR="/Users/nowage/Desktop/LlmAndVibeCodingGen/markmap"

# 각 md 파일에 대해 HTML 생성
for md_file in "$MD_DIR"/*.md; do
    filename=$(basename "$md_file" .md)

    # HTML 파일 생성
    cat > "$OUTPUT_DIR/${filename}.html" << 'EOF'
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TITLE_PLACEHOLDER - Markmap</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    .header {
      background: #2c3e50;
      color: white;
      padding: 1rem 2rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header h1 {
      margin: 0;
      font-size: 1.5rem;
    }
    .header a {
      color: #3498db;
      text-decoration: none;
      font-size: 0.9rem;
    }
    .header a:hover {
      text-decoration: underline;
    }
    .markmap {
      position: relative;
      width: 100%;
      height: calc(100vh - 80px);
    }
    .markmap > svg {
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>TITLE_PLACEHOLDER</h1>
    <a href="index.html">← 목차로 돌아가기</a>
  </div>

  <div class="markmap">
    <script type="text/template">
MARKDOWN_CONTENT_PLACEHOLDER
    </script>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/markmap-autoloader@latest"></script>
</body>
</html>
EOF

    # md 파일 내용 읽어서 치환
    md_content=$(cat "$md_file")
    title=$(head -n 1 "$md_file" | sed 's/^# //')

    # TITLE_PLACEHOLDER 치환
    sed -i '' "s/TITLE_PLACEHOLDER/$title/g" "$OUTPUT_DIR/${filename}.html"

    # MARKDOWN_CONTENT_PLACEHOLDER를 md 내용으로 치환
    # 임시 파일 사용
    awk -v content="$md_content" '
        /MARKDOWN_CONTENT_PLACEHOLDER/ {
            print content
            next
        }
        {print}
    ' "$OUTPUT_DIR/${filename}.html" > "$OUTPUT_DIR/${filename}.html.tmp"

    mv "$OUTPUT_DIR/${filename}.html.tmp" "$OUTPUT_DIR/${filename}.html"

    echo "Created: ${filename}.html"
done

echo "All markmap files generated successfully!"
