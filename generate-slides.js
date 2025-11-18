#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

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
      // Extract language from code block (e.g., ```javascript, ```mermaid)
      const langMatch = line.match(/^```(\w+)/);
      const lang = langMatch ? langMatch[1] : '';

      let codeLines = [];
      i++; // Skip opening ```
      while (i < lines.length && !lines[i].match(/^```/)) {
        codeLines.push(lines[i]);
        i++;
      }

      // Special handling for mermaid diagrams
      if (lang === 'mermaid') {
        html.push('<div class="mermaid">');
        html.push(codeLines.join('\n'));
        html.push('</div>');
      } else {
        // Regular code block
        const langClass = lang ? ` class="language-${lang}"` : '';
        html.push(`<pre><code${langClass}>` + codeLines.join('\n') + '</code></pre>');
      }
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
  // Images - keep relative path from markdown file
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

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
function getSubsections(fileName, agendaPath) {
  try {
    if (!agendaPath || !fs.existsSync(agendaPath)) {
      return [];
    }
    const content = fs.readFileSync(agendaPath, 'utf-8');
    const lines = content.split('\n');

    // Find the main section for this file (supports ./ relative paths)
    const mainPattern = new RegExp(`## \\[(.+?)\\]\\(\\.\/${fileName}\\)`);
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
          const htmlFile = path.basename(mdPath, '.md') + '.html';
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
function getParentPage(fileName, agendaPath) {
  try {
    if (!agendaPath || !fs.existsSync(agendaPath)) {
      return 'index.html';
    }
    const content = fs.readFileSync(agendaPath, 'utf-8');
    const lines = content.split('\n');

    // Check if this is a subsection (### pattern with ./ relative path)
    const subPattern = new RegExp(`### \\[(.+?)\\]\\(\\.\/${fileName}\\)`);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (subPattern.test(line)) {
        // This is a subsection, find the parent main section
        for (let j = i - 1; j >= 0; j--) {
          const parentMatch = lines[j].match(/^## \[(.+?)\]\((.+?)\)$/);
          if (parentMatch) {
            const mdPath = parentMatch[2];
            return path.basename(mdPath, '.md') + '.html';
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
function generateTOC(slides, fileName, agendaPath) {
  const tocItems = slides.slice(1)
    .map((slide, index) => {
      const slideNum = index + 1;
      let label = `슬라이드 ${slideNum}`;

      // Extract header from slide
      const headerMatch = slide.content.match(/^## (.+)$/m);
      if (headerMatch) {
        const originalLabel = headerMatch[1];

        // Skip slides with "(계속)", "(예속)" etc. in their titles
        if (/\([^)]*계속[^)]*\)|\([^)]*예속[^)]*\)/.test(originalLabel)) {
          return null;
        }

        label = originalLabel;
      }

      return {
        content: `<a href="#/${slideNum}">${label}</a>`,
        children: []
      };
    })
    .filter(item => item !== null); // Remove null items

  // Add subsections if they exist
  const subsections = getSubsections(fileName, agendaPath);
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
function generateHTML(filePath, agendaPath) {
  const slides = parseMarkdownFile(filePath);
  const fileName = path.basename(filePath);
  const tocData = generateTOC(slides, fileName, agendaPath);
  const parentPage = getParentPage(fileName, agendaPath);
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
    * {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif;
    }
    .reveal h1 { font-size: 2.5em; }
    .reveal h2 { font-size: 1.8em; }
    .reveal h3 { font-size: 1.4em; }
    .reveal { font-size: 32px; }
    .reveal table {
      font-size: 0.7em;
      width: 100% !important;
    }
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
      padding-left: 40px;
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
      min-height: 200px;
      margin: 0.5em 0;
      display: block;
    }
    /* 슬라이드 스크롤 기능 추가 */
    .reveal .slides section,
    .reveal .slides section.present,
    .reveal .slides section.past,
    .reveal .slides section.future {
      overflow-y: auto !important;
      max-height: 100vh !important;
      padding: 20px 60px 200px 60px !important;
      box-sizing: border-box !important;
    }
    .reveal .slides section::-webkit-scrollbar {
      width: 8px;
    }
    .reveal .slides section::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.1);
      border-radius: 4px;
    }
    .reveal .slides section::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.3);
      border-radius: 4px;
    }
    .reveal .slides section::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 0, 0, 0.5);
    }
    #toc-mindmap a {
      text-decoration: none;
      color: inherit;
    }
    #toc-mindmap text {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif !important;
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
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10.9.0/dist/mermaid.min.js"></script>
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

    // Initialize mermaid for diagrams
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose',
      themeVariables: {
        fontFamily: '"Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif'
      },
      flowchart: {
        htmlLabels: true,
        curve: 'basis',
        useMaxWidth: true
      },
      sequence: {
        diagramMarginX: 50,
        diagramMarginY: 10,
        actorMargin: 50,
        width: 150,
        height: 65,
        boxMargin: 10,
        boxTextMargin: 5,
        noteMargin: 10,
        messageMargin: 35,
        mirrorActors: true,
        useMaxWidth: true
      },
      timeline: {
        useMaxWidth: true
      }
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
      const htmlPath = path.basename(mdPath, '.md') + '.html';

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
      const htmlPath = path.basename(mdPath, '.md') + '.html';

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
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
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
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif !important;
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

  // Parse arguments
  let inputDir, outputDir, projectDir;

  if (args.length === 0) {
    // Default: Projects/LlmAndVibeCoding relative to script location
    projectDir = path.join(__dirname, 'Projects', 'LlmAndVibeCoding');
    inputDir = path.join(projectDir, 'markdown');
    outputDir = path.join(projectDir, 'slide');
  } else if (args.length === 1) {
    // Check if the path ends with 'markdown' or 'slide'
    const argPath = path.resolve(args[0]);
    const baseName = path.basename(argPath);

    if (baseName === 'markdown' || baseName === 'slide') {
      // User provided markdown/slide folder directly
      projectDir = path.dirname(argPath);
      inputDir = baseName === 'markdown' ? argPath : path.join(projectDir, 'markdown');
      outputDir = path.join(projectDir, 'slide');
    } else {
      // User provided project folder
      projectDir = argPath;
      inputDir = path.join(projectDir, 'markdown');
      outputDir = path.join(projectDir, 'slide');
    }
  } else {
    // Both parameters provided (backward compatibility)
    inputDir = path.resolve(args[0]);
    outputDir = path.resolve(args[1]);
    projectDir = path.dirname(inputDir);
  }

  console.log(`Project directory: ${projectDir || path.dirname(inputDir)}`);
  console.log(`Input directory: ${inputDir}`);
  console.log(`Output directory: ${outputDir}`);

  // Check if input directory exists
  if (!fs.existsSync(inputDir)) {
    console.error(`❌ Error: Input directory does not exist: ${inputDir}`);
    process.exit(1);
  }

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    console.log(`Creating output directory: ${outputDir}`);
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Copy img folder if it exists
  const imgInputDir = path.join(inputDir, 'img');
  const imgOutputDir = path.join(outputDir, 'img');
  if (fs.existsSync(imgInputDir)) {
    console.log(`\nCopying images from ${imgInputDir} to ${imgOutputDir}`);
    // Remove existing img folder in output if exists
    if (fs.existsSync(imgOutputDir)) {
      fs.rmSync(imgOutputDir, { recursive: true, force: true });
    }
    // Copy img folder
    fs.cpSync(imgInputDir, imgOutputDir, { recursive: true });
    console.log('✅ Images copied successfully');
  }

  // Process all .md files (excluding AGENDA.md, will process it separately)
  const files = fs.readdirSync(inputDir)
    .filter(f => f.endsWith('.md') && f !== 'AGENDA.md')
    .sort();

  console.log(`\nFound ${files.length} markdown files`);

  // Get AGENDA.md path (will be used by all file processing)
  const agendaPath = path.join(inputDir, 'AGENDA.md');

  files.forEach(file => {
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(outputDir, file.replace('.md', '.html'));

    console.log(`Processing: ${file}`);
    const html = generateHTML(inputPath, agendaPath);
    fs.writeFileSync(outputPath, html, 'utf-8');
    console.log(`  → Generated: ${outputPath}`);
  });

  // Generate index.html from AGENDA.md
  console.log('\nGenerating index.html...');
  if (fs.existsSync(agendaPath)) {
    const indexHTML = generateIndexHTML(agendaPath);
    const indexPath = path.join(outputDir, 'index.html');
    fs.writeFileSync(indexPath, indexHTML, 'utf-8');
    console.log(`✅ Generated: ${indexPath}`);
  } else {
    console.log(`⚠️  AGENDA.md not found in ${inputDir}, skipping index.html generation`);
  }

  console.log('\n✅ All files processed!');
  console.log(`\nOpen ${path.join(outputDir, 'index.html')} in your browser to view the presentation.`);
}

main();
