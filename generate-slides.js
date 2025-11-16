#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Markdown to HTML converter
function convertMarkdownToHTML(markdown) {
  let lines = markdown.split('\n');
  let html = [];
  let inList = false;
  let inOrderedList = false;
  let inBlockquote = false;
  let blockquoteLines = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Headers
    if (line.match(/^### /)) {
      html.push(line.replace(/^### (.+)$/, '<h3>$1</h3>'));
      continue;
    }
    if (line.match(/^## /)) {
      html.push(line.replace(/^## (.+)$/, '<h2>$1</h2>'));
      continue;
    }
    if (line.match(/^# /)) {
      html.push(line.replace(/^# (.+)$/, '<h1>$1</h1>'));
      continue;
    }

    // Blockquote start
    if (line.match(/^>/)) {
      if (!inBlockquote) {
        inBlockquote = true;
        blockquoteLines = [];
      }
      blockquoteLines.push(line.replace(/^> ?/, ''));
      continue;
    } else if (inBlockquote) {
      // End blockquote
      html.push('<blockquote>');
      html.push(blockquoteLines.map(l => processInline(l)).join('<br>\n'));
      html.push('</blockquote>');
      inBlockquote = false;
      blockquoteLines = [];
    }

    // Unordered list
    if (line.match(/^- /)) {
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${processInline(line.replace(/^- /, ''))}</li>`);
      continue;
    } else if (inList && !line.match(/^- /)) {
      html.push('</ul>');
      inList = false;
    }

    // Ordered list
    if (line.match(/^\d+\. /)) {
      if (!inOrderedList) {
        html.push('<ol>');
        inOrderedList = true;
      }
      html.push(`<li>${processInline(line.replace(/^\d+\. /, ''))}</li>`);
      continue;
    } else if (inOrderedList && !line.match(/^\d+\. /)) {
      html.push('</ol>');
      inOrderedList = false;
    }

    // Code blocks
    if (line.match(/^```/)) {
      let codeLines = [];
      i++; // Skip opening ```
      while (i < lines.length && !lines[i].match(/^```/)) {
        codeLines.push(lines[i]);
        i++;
      }
      html.push('<pre><code>' + codeLines.join('\n') + '</code></pre>');
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      html.push('');
      continue;
    }

    // Tables
    if (line.match(/^\|/)) {
      html.push(line);
      continue;
    }

    // Regular paragraph
    html.push(`<p>${processInline(line)}</p>`);
  }

  // Close any open lists or blockquotes
  if (inList) html.push('</ul>');
  if (inOrderedList) html.push('</ol>');
  if (inBlockquote) {
    html.push('<blockquote>');
    html.push(blockquoteLines.map(l => processInline(l)).join('<br>\n'));
    html.push('</blockquote>');
  }

  return html.join('\n');
}

// Process inline elements (bold, images, code, etc.)
function processInline(text) {
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Images
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="../LlmAndVibeCoding/$2" alt="$1">');

  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

  return text;
}

// Check if content is a table
function isTable(content) {
  return content.includes('|') && content.includes('---');
}

// Parse markdown file into slides
function parseMarkdownFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const slides = content.split(/\n---\n/).map(slide => slide.trim());

  return slides.map((slide, index) => {
    // First slide gets title
    if (index === 0) {
      const titleMatch = slide.match(/^# (.+)$/m);
      const title = titleMatch ? titleMatch[1] : 'Slide';
      return { title, content: slide, isTitle: true };
    }

    // Check if this slide has a table
    if (isTable(slide)) {
      return { content: slide, isTable: true };
    }

    return { content: slide };
  });
}

// Get subsections from AGENDA.md for a given file
function getSubsections(fileName) {
  try {
    const agendaPath = path.join(__dirname, 'LlmAndVibeCoding/AGENDA.md');
    const content = fs.readFileSync(agendaPath, 'utf-8');
    const lines = content.split('\n');

    // Find the main section for this file
    const mainPattern = new RegExp(`## \\[(.+?)\\]\\(LlmAndVibeCoding/${fileName}\\)`);
    let foundMainSection = false;
    const subsections = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if this is the main section
      if (mainPattern.test(line)) {
        foundMainSection = true;
        continue;
      }

      // If we found the main section, collect subsections
      if (foundMainSection) {
        // Stop when we hit another main section
        if (line.match(/^## \[/)) {
          break;
        }

        // Collect subsection
        const subMatch = line.match(/^### \[(.+?)\]\((.+?)\)$/);
        if (subMatch) {
          const title = subMatch[1];
          const mdPath = subMatch[2];
          const htmlFile = mdPath.replace('LlmAndVibeCoding/', '').replace('.md', '.html');
          subsections.push({ title, htmlFile });
        }
      }
    }

    return subsections;
  } catch (err) {
    return [];
  }
}

// Get parent page from AGENDA.md for a given file
function getParentPage(fileName) {
  try {
    const agendaPath = path.join(__dirname, 'LlmAndVibeCoding/AGENDA.md');
    const content = fs.readFileSync(agendaPath, 'utf-8');
    const lines = content.split('\n');

    // Check if this is a subsection (### pattern)
    const subPattern = new RegExp(`### \\[(.+?)\\]\\(LlmAndVibeCoding/${fileName}\\)`);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (subPattern.test(line)) {
        // This is a subsection, find the parent main section
        for (let j = i - 1; j >= 0; j--) {
          const parentMatch = lines[j].match(/^## \[(.+?)\]\((.+?)\)$/);
          if (parentMatch) {
            const mdPath = parentMatch[2];
            return mdPath.replace('LlmAndVibeCoding/', '').replace('.md', '.html');
          }
        }
      }
    }

    // If not a subsection, parent is index.html
    return 'index.html';
  } catch (err) {
    return 'index.html';
  }
}

// Generate table of contents data for markmap
function generateTOC(slides, fileName) {
  const tocItems = slides.slice(1).map((slide, index) => {
    const slideNum = index + 1;
    let label = `슬라이드 ${slideNum}`;

    // Extract header from slide
    const headerMatch = slide.content.match(/^## (.+)$/m);
    if (headerMatch) {
      label = headerMatch[1];
    }

    return {
      content: `<a href="#/${slideNum}">${label}</a>`,
      children: []
    };
  });

  // Add subsections if they exist
  const subsections = getSubsections(fileName);
  if (subsections.length > 0) {
    const subsectionNodes = subsections.map(sub => ({
      content: `<a href="${sub.htmlFile}">${sub.title}</a>`,
      children: []
    }));

    tocItems.push({
      content: "하위 챕터",
      children: subsectionNodes
    });
  }

  return {
    content: "",
    children: tocItems
  };
}

// Generate HTML slide from parsed slide
function generateSlideHTML(slide) {
  // Title slide with markmap
  if (slide.isTitle) {
    const titleMatch = slide.content.match(/^# (.+)$/m);
    const title = titleMatch ? titleMatch[1] : 'Presentation';

    return `      <section>
        <h1>${title}</h1>
        <svg id="toc-mindmap" style="width: 100%; height: 500px;"></svg>
      </section>`;
  }

  // Table slide - keep markdown for Reveal.js to parse
  if (slide.isTable) {
    return `      <section data-markdown>
        <textarea data-template>
${slide.content}
</textarea>
      </section>`;
  }

  // Regular slide - convert to HTML
  const html = convertMarkdownToHTML(slide.content);
  return `      <section>
${html}
      </section>`;
}

// Generate complete HTML file
function generateHTML(filePath) {
  const slides = parseMarkdownFile(filePath);
  const fileName = path.basename(filePath);
  const tocData = generateTOC(slides, fileName);
  const parentPage = getParentPage(fileName);
  const title = slides[0].title || path.basename(filePath, '.md');

  const slidesHTML = slides.map(generateSlideHTML).join('\n\n');

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/dist/reset.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/dist/reveal.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/dist/theme/sky.css">
  <style>
    .reveal h1 { font-size: 2.5em; }
    .reveal h2 { font-size: 1.8em; }
    .reveal h3 { font-size: 1.4em; }
    .reveal { font-size: 32px; }
    .reveal table { font-size: 0.7em; }
    .reveal pre { font-size: 0.6em; }
    .reveal code { font-size: 0.9em; }
    .reveal blockquote {
      font-size: 1.1em;
      font-style: italic;
      background: rgba(255,255,255,0.1);
      padding: 20px;
      border-left: 5px solid #42affa;
    }
    .reveal p {
      font-size: 1em;
      line-height: 1.6;
      margin: 0.5em 0;
      color: #333;
    }
    .reveal ul, .reveal ol {
      display: block;
      text-align: left;
      margin: 1em 0;
    }
    .reveal li {
      font-size: 0.9em;
      line-height: 1.6;
      margin: 0.3em 0;
      color: #333;
    }
    .reveal strong {
      color: #222;
      font-weight: bold;
    }
    .reveal img {
      max-width: 400px;
      max-height: 300px;
      margin: 0.5em 0;
    }
    #toc-mindmap a {
      text-decoration: none;
      color: inherit;
    }
    #toc-mindmap text {
      font-size: 16px !important;
      font-weight: 500;
    }
    .nav-up-btn {
      position: fixed;
      bottom: 14px;
      right: 70px;
      z-index: 31;
      background-color: transparent;
      border: none;
      padding: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      font-size: 14px;
      color: rgba(0, 0, 0, 0.5);
      transition: color 0.2s;
      cursor: pointer;
    }
    .nav-up-btn:hover {
      color: rgba(0, 0, 0, 0.8);
    }
    .nav-up-btn svg {
      width: 16px;
      height: 16px;
      fill: currentColor;
    }
    .nav-up-btn span {
      font-family: inherit;
    }
  </style>
</head>
<body>
  <a href="${parentPage}" class="nav-up-btn" title="상위 페이지" id="nav-up-link">
    <svg viewBox="0 0 24 24">
      <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
    </svg>
    <span>상위</span>
  </a>
  <div class="reveal">
    <div class="slides">

${slidesHTML}

    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/markmap-view@0.18.12/dist/browser/index.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/dist/reveal.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/plugin/markdown/markdown.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/plugin/highlight/highlight.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/plugin/notes/notes.js"></script>
  <script>
    Reveal.initialize({
      hash: true,
      plugins: [ RevealMarkdown, RevealHighlight, RevealNotes ],
      width: 1280,
      height: 720,
      margin: 0.1,
      slideNumber: 'c/t',
      transition: 'slide',
      backgroundTransition: 'fade'
    });

    // Initialize markmap for table of contents
    setTimeout(() => {
      const { markmap } = window;
      const tocData = ${JSON.stringify(tocData, null, 6)};

      markmap.Markmap.create('#toc-mindmap', {}, tocData);
    }, 100);

    // Connect up arrow key to parent page navigation
    document.addEventListener('keydown', function(event) {
      // Check if up arrow key is pressed
      if (event.key === 'ArrowUp' || event.keyCode === 38) {
        const currentSlide = Reveal.getIndices();
        // Only navigate to parent if there are no vertical slides
        if (currentSlide.v === 0) {
          event.preventDefault();
          // Navigate to parent page
          const navLink = document.getElementById('nav-up-link');
          if (navLink) {
            window.location.href = navLink.href;
          }
        }
      }
    });
  </script>
</body>
</html>
`;

  return html;
}

// Parse AGENDA.md to generate markmap structure
function parseAgenda(agendaPath) {
  const content = fs.readFileSync(agendaPath, 'utf-8');
  const lines = content.split('\n');

  const root = {
    content: "",
    children: []
  };

  let currentSection = null;

  for (const line of lines) {
    // Main section: ## [Title](path)
    const mainMatch = line.match(/^## \[(.+?)\]\((.+?)\)$/);
    if (mainMatch) {
      const title = mainMatch[1];
      const mdPath = mainMatch[2];
      const htmlPath = mdPath.replace('LlmAndVibeCoding/', '').replace('.md', '.html');

      currentSection = {
        content: `<a href="${htmlPath}">${title}</a>`,
        children: []
      };
      root.children.push(currentSection);
      continue;
    }

    // Subsection: ### [Title](path)
    const subMatch = line.match(/^### \[(.+?)\]\((.+?)\)$/);
    if (subMatch && currentSection) {
      const title = subMatch[1];
      const mdPath = subMatch[2];
      const htmlPath = mdPath.replace('LlmAndVibeCoding/', '').replace('.md', '.html');

      currentSection.children.push({
        content: `<a href="${htmlPath}">${title}</a>`,
        children: []
      });
    }
  }

  return root;
}

// Generate index.html with markmap navigation
function generateIndexHTML(agendaPath) {
  const markmapData = parseAgenda(agendaPath);

  // Read title from AGENDA.md
  const content = fs.readFileSync(agendaPath, 'utf-8');
  const titleMatch = content.match(/^# (.+)$/m);
  const title = titleMatch ? titleMatch[1] : 'LLM 툴 진화와 바이브 코딩 세대 구분';

  const html = `<!doctype html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="ie=edge" />
<title>Markmap</title>
<style>
* {
  margin: 0;
  padding: 0;
}
html {
  font-family: ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji',
    'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
}
.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 30px 20px;
  text-align: center;
}
.header h1 {
  margin: 0;
  font-size: 48px;
  margin-bottom: 10px;
  font-weight: 700;
}
.header p {
  margin: 0;
  font-size: 16px;
  opacity: 0.9;
}
#mindmap {
  display: block;
  width: 100vw;
  height: calc(100vh - 140px);
}
.markmap-dark {
  background: #27272a;
  color: white;
}
a {
  text-decoration: none;
}
svg text {
  font-size: 18px !important;
  font-weight: 500;
}
</style>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/markmap-toolbar@0.18.12/dist/style.css">
</head>
<body>
<div class="header">
  <h1>${title}</h1>
  <p>각 노드를 클릭하면 상세 페이지로 이동합니다</p>
</div>
<svg id="mindmap"></svg>
<script src="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js"></script><script src="https://cdn.jsdelivr.net/npm/markmap-view@0.18.12/dist/browser/index.js"></script><script src="https://cdn.jsdelivr.net/npm/markmap-toolbar@0.18.12/dist/index.js"></script><script>((r) => {
          setTimeout(r);
        })(() => {
  const { markmap, mm } = window;
  const toolbar = new markmap.Toolbar();
  toolbar.attach(mm);
  const el = toolbar.render();
  el.setAttribute("style", "position:absolute;bottom:20px;right:20px");
  document.body.append(el);
})</script><script>((getMarkmap, getOptions, root2, jsonOptions) => {
              const markmap = getMarkmap();
              window.mm = markmap.Markmap.create(
                "svg#mindmap",
                (getOptions || markmap.deriveOptions)(jsonOptions),
                root2
              );
              if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
                document.documentElement.classList.add("markmap-dark");
              }
            })(() => window.markmap,null,${JSON.stringify(markmapData)},null)</script>
</body>
</html>
`;

  return html;
}

// Main execution
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Process all .md files in md folder
    const mdDir = path.join(__dirname, 'LlmAndVibeCoding');
    const files = fs.readdirSync(mdDir)
      .filter(f => f.endsWith('.md'))
      .sort();

    console.log(`Found ${files.length} markdown files`);

    files.forEach(file => {
      const inputPath = path.join(mdDir, file);
      const outputPath = path.join(__dirname, 'LlmAndVibeCoding_slide', file.replace('.md', '.html'));

      console.log(`Processing: ${file}`);
      const html = generateHTML(inputPath);
      fs.writeFileSync(outputPath, html, 'utf-8');
      console.log(`  → Generated: ${outputPath}`);
    });

    // Generate index.html
    console.log('\nGenerating index.html...');
    const agendaPath = path.join(__dirname, 'LlmAndVibeCoding/AGENDA.md');
    const indexHTML = generateIndexHTML(agendaPath);
    const indexPath = path.join(__dirname, 'LlmAndVibeCoding_slide', 'index.html');
    fs.writeFileSync(indexPath, indexHTML, 'utf-8');
    console.log(`✅ Generated: ${indexPath}`);

    console.log('\n✅ All files processed!');
  } else {
    // Process single file
    const inputPath = args[0];
    const baseName = path.basename(inputPath, '.md');
    const outputPath = path.join(__dirname, 'LlmAndVibeCoding_slide', `${baseName}.html`);

    console.log(`Processing: ${inputPath}`);
    const html = generateHTML(inputPath);
    fs.writeFileSync(outputPath, html, 'utf-8');
    console.log(`✅ Generated: ${outputPath}`);
  }
}

main();
