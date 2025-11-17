#!/usr/bin/env python3
"""
markmap HTML 생성 스크립트
md 폴더의 마크다운 파일을 markmap HTML로 변환
"""

import os
from pathlib import Path

# 경로 설정
MD_DIR = Path("/Users/nowage/Desktop/LlmAndVibeCodingGen/md")
OUTPUT_DIR = Path("/Users/nowage/Desktop/LlmAndVibeCodingGen/markmap")

# HTML 템플릿
HTML_TEMPLATE = '''<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title} - Markmap</title>
  <style>
    body {{
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }}
    .header {{
      background: #2c3e50;
      color: white;
      padding: 1rem 2rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }}
    .header h1 {{
      margin: 0;
      font-size: 1.5rem;
    }}
    .header a {{
      color: #3498db;
      text-decoration: none;
      font-size: 0.9rem;
    }}
    .header a:hover {{
      text-decoration: underline;
    }}
    .markmap {{
      position: relative;
      width: 100%;
      height: calc(100vh - 80px);
    }}
    .markmap > svg {{
      width: 100%;
      height: 100%;
    }}
  </style>
</head>
<body>
  <div class="header">
    <h1>{title}</h1>
    <a href="index.html">← 목차로 돌아가기</a>
  </div>

  <div class="markmap">
    <script type="text/template">
{content}
    </script>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/markmap-autoloader@latest"></script>
</body>
</html>
'''

def generate_markmap_files():
    """md 파일들을 markmap HTML로 변환"""

    # md 파일 목록
    md_files = sorted(MD_DIR.glob("*.md"))

    files_info = []

    for md_file in md_files:
        # md 파일 읽기
        with open(md_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # 제목 추출 (첫 번째 줄에서)
        title = content.split('\n')[0].replace('# ', '')

        # HTML 파일명
        html_filename = md_file.stem + '.html'
        output_path = OUTPUT_DIR / html_filename

        # HTML 생성
        html_content = HTML_TEMPLATE.format(
            title=title,
            content=content
        )

        # HTML 파일 저장
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)

        print(f"Created: {html_filename}")

        # 인덱스용 정보 저장
        files_info.append({
            'filename': html_filename,
            'title': title
        })

    return files_info

def generate_index(files_info):
    """index.html 생성"""

    index_html = '''<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LLM 툴 진화와 바이브 코딩 세대 분류 - Markmap 목차</title>
  <style>
    body {{
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #f5f6fa;
    }}
    .container {{
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
    }}
    .header {{
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 3rem 2rem;
      border-radius: 10px;
      margin-bottom: 2rem;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }}
    .header h1 {{
      margin: 0 0 0.5rem 0;
      font-size: 2rem;
    }}
    .header p {{
      margin: 0;
      opacity: 0.9;
      font-size: 1.1rem;
    }}
    .toc {{
      background: white;
      border-radius: 10px;
      padding: 2rem;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    }}
    .toc h2 {{
      margin-top: 0;
      color: #2c3e50;
      font-size: 1.5rem;
      border-bottom: 2px solid #667eea;
      padding-bottom: 0.5rem;
    }}
    .toc-list {{
      list-style: none;
      padding: 0;
      margin: 1rem 0 0 0;
    }}
    .toc-item {{
      margin-bottom: 0.5rem;
    }}
    .toc-link {{
      display: block;
      padding: 1rem 1.5rem;
      background: #f8f9fa;
      border-radius: 8px;
      text-decoration: none;
      color: #2c3e50;
      transition: all 0.3s ease;
      border-left: 4px solid transparent;
    }}
    .toc-link:hover {{
      background: #667eea;
      color: white;
      border-left-color: #764ba2;
      transform: translateX(5px);
    }}
    .footer {{
      text-align: center;
      margin-top: 2rem;
      color: #7f8c8d;
      font-size: 0.9rem;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🗺️ LLM 툴 진화와 바이브 코딩 세대 분류</h1>
      <p>Markmap 시각화로 보는 AI 코딩 도구의 진화 과정</p>
    </div>

    <div class="toc">
      <h2>📚 목차</h2>
      <ul class="toc-list">
{toc_items}
      </ul>
    </div>

    <div class="footer">
      <p>Markmap을 사용하여 마크다운을 마인드맵으로 시각화했습니다.</p>
    </div>
  </div>
</body>
</html>
'''

    # TOC 아이템 생성
    toc_items = []
    for info in files_info:
        toc_items.append(f'''        <li class="toc-item">
          <a href="{info['filename']}" class="toc-link">{info['title']}</a>
        </li>''')

    toc_html = '\n'.join(toc_items)

    # index.html 생성
    final_html = index_html.format(toc_items=toc_html)

    index_path = OUTPUT_DIR / 'index.html'
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(final_html)

    print(f"\nCreated: index.html")

if __name__ == '__main__':
    print("Generating markmap HTML files...\n")
    files_info = generate_markmap_files()
    generate_index(files_info)
    print(f"\n✅ All done! {len(files_info)} markmap files created.")
    print(f"📂 Output directory: {OUTPUT_DIR}")
    print(f"🌐 Open: {OUTPUT_DIR / 'index.html'}")
