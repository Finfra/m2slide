#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');
let TOP_ALIGN = false; // optional hard top-align mode
let SLIDE_CSS_REL = null; // project-relative CSS path (e.g., resource/slide.css)
const ROOT_DIR = path.resolve(__dirname, '..');

// Read minimal config (YAML subset) from config.yml (repo root)
function loadConfig() {
  try {
    let cfgPath = path.join(__dirname, 'config.yml');
    if (!fs.existsSync(cfgPath)) {
      cfgPath = path.join(ROOT_DIR, 'config.yml');
    }
    if (!fs.existsSync(cfgPath)) return;
    const raw = fs.readFileSync(cfgPath, 'utf-8');
    const m = raw.match(/^top_align:\s*(.+)$/m);
    if (m) {
      const val = m[1].trim().toLowerCase();
      TOP_ALIGN = (val === 'true' || val === 'yes' || val === '1');
    }
    const c = raw.match(/^slide_css:\s*(.+)$/m);
    if (c) {
      SLIDE_CSS_REL = c[1].trim();
    }
  } catch (_) {}
}

// Markdown to HTML converter
function convertMarkdownToHTML(markdown) {
  let lines = markdown.split('\n');
  let html = [];
  let inList = false;
  let inOrderedList = false;
  let inBlockquote = false;
  let blockquoteLines = [];
  let listLevel = 0;

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

    // Unordered list (supports - and *, with nesting)
    const bulletMatch = line.match(/^(\s*)([-*])\s+(.*)$/);
    if (bulletMatch) {
      const indent = bulletMatch[1].length;
      const bulletChar = bulletMatch[2];
      const content = bulletMatch[3];
      const level = Math.floor(indent / 2); // 2 spaces = 1 level

      if (!inList) {
        html.push('<ul>');
        inList = true;
        listLevel = 0;
      }

      // Handle nesting
      while (listLevel < level) {
        html.push('<ul>');
        listLevel++;
      }
      while (listLevel > level) {
        html.push('</ul>');
        listLevel--;
      }

      // Apply different class based on bullet character
      const bulletClass = bulletChar === '*' ? ' class="bullet-dot"' : '';
      html.push(`<li${bulletClass}>${processInline(content)}</li>`);
      continue;
    } else if (inList && !line.match(/^\s*[-*]\s/)) {
      // Close all nested lists
      while (listLevel > 0) {
        html.push('</ul>');
        listLevel--;
      }
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
      }
      // Special handling for Kroki diagrams
      else if (['blockdiag', 'seqdiag', 'actdiag', 'nwdiag', 'packetdiag', 'rackdiag',
                'ditaa', 'dot', 'graphviz', 'vega', 'vegalite', 'plantuml'].includes(lang)) {
        const source = codeLines.join('\n');
        try {
          const deflated = zlib.deflateSync(Buffer.from(source, 'utf-8'));
          const b64 = deflated.toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/g, '');
          const url = `https://kroki.io/${lang}/svg/${b64}`;
          html.push('<div class="kroki">');
          html.push(`<div class="graph-scroll"><img src="${url}" alt="${lang} diagram"/></div>`);
          html.push('</div>');
        } catch (e) {
          // Fallback to runtime rendering container if deflate fails
          html.push(`<div class=\"kroki\" data-type=\"${lang}\">`);
          html.push(source);
          html.push('</div>');
        }
      }
      else {
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
  // Close any remaining nested lists
  if (inList) {
    while (listLevel > 0) {
      html.push('</ul>');
      listLevel--;
    }
    html.push('</ul>');
  }
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
  // Images FIRST (before links, because images also use [] syntax)
  // Images - keep relative path from markdown file
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

  // Links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

  return text;
}

// Check if content is a table (excluding pipes inside code blocks)
function isTable(content) {
  // Remove code blocks first
  const withoutCodeBlocks = content.replace(/```[\s\S]*?```/g, '');

  // Check if there are pipes outside code blocks
  if (!withoutCodeBlocks.includes('|')) {
    return false;
  }

  // Check for markdown table structure (pipes + header separator)
  const lines = withoutCodeBlocks.split('\n');
  for (let i = 0; i < lines.length; i++) {
    // Table header separator line: |---|---|
    if (lines[i].match(/^\s*\|?[\s\-:|]+\|\s*$/)) {
      return true;
    }
  }

  return false;
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

// Get the next chapter file from AGENDA.md
function getNextChapter(fileName, agendaPath) {
  try {
    if (!agendaPath || !fs.existsSync(agendaPath)) {
      return 'index.html';
    }
    const content = fs.readFileSync(agendaPath, 'utf-8');
    const lines = content.split('\n');

    // Collect all chapter files in order
    const chapters = [];
    for (const line of lines) {
      const mainMatch = line.match(/^## \[(.+?)\]\((.+?)\)$/);
      if (mainMatch) {
        const mdPath = mainMatch[2];
        chapters.push(path.basename(mdPath, '.md') + '.html');
        continue;
      }
      const subMatch = line.match(/^### \[(.+?)\]\((.+?)\)$/);
      if (subMatch) {
        const mdPath = subMatch[2];
        chapters.push(path.basename(mdPath, '.md') + '.html');
      }
    }

    // Find current file and return next
    const currentHtml = path.basename(fileName, '.md') + '.html';
    const currentIndex = chapters.indexOf(currentHtml);
    if (currentIndex !== -1 && currentIndex < chapters.length - 1) {
      return chapters[currentIndex + 1];
    }

    // If last chapter or not found, return index.html
    return 'index.html';
  } catch (err) {
    return 'index.html';
  }
}

// Generate table of contents data for markmap (root → H1 → H2)
function generateTOCFromFile(filePath, agendaPath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const sections = [];
  let currentSection = null;
  let inCode = false;
  let slideIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Toggle code fence state
    if (line.trim().startsWith('```')) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;

    // Count slide separators to map headings → slide index
    if (/^---\s*$/.test(line)) {
      slideIndex += 1;
      continue;
    }

    // H1 becomes a branch
    const h1 = line.match(/^# (.+)$/);
    if (h1) {
      currentSection = { content: h1[1], children: [] };
      sections.push(currentSection);
      continue;
    }

    // H2 becomes a child pointing to that slide
    const h2 = line.match(/^## (.+)$/);
    if (h2) {
      if (!currentSection) {
        currentSection = { content: '', children: [] };
        sections.push(currentSection);
      }
      const title = h2[1];
      currentSection.children.push({
        content: `<a href="#/${slideIndex}">${title}</a>`,
        children: []
      });
      continue;
    }
  }

  // Include subsections from AGENDA (if any)
  const fileName = path.basename(filePath);
  const subsections = getSubsections(fileName, agendaPath);
  if (subsections.length > 0) {
    sections.push({
      content: '하위 챕터',
      children: subsections.map(sub => ({ content: `<a href="${sub.htmlFile}">${sub.title}</a>`, children: [] }))
    });
  }

  return { content: '', children: sections };
}

// Generate HTML slide from parsed slide
function generateSlideHTML(slide) {
  // Title slide - empty placeholder (markmap is outside Reveal.js)
  if (slide.isTitle) {
    return `      <section id="toc-placeholder"></section>`;
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
  const tocData = generateTOCFromFile(filePath, agendaPath);

  // Check if AGENDA.md exists
  const hasAgenda = agendaPath && fs.existsSync(agendaPath);
  const parentPage = hasAgenda ? getParentPage(fileName, agendaPath) : '';
  const nextChapter = hasAgenda ? getNextChapter(fileName, agendaPath) : '';
  const title = slides[0].title || path.basename(filePath, '.md');

  const slidesHTML = slides.map(generateSlideHTML).join('\n\n');

  // Resolve project directory and optional CSS link
  const projectDirGuess = path.dirname(path.dirname(filePath));
  let slideCssLink = '';
  if (SLIDE_CSS_REL) {
    const cssPath = path.join(projectDirGuess, SLIDE_CSS_REL);
    if (fs.existsSync(cssPath)) {
      const href = path.join('..', path.relative(path.join(projectDirGuess, 'slide'), cssPath)).replace(/\\/g, '/');
      slideCssLink = `\n  <link rel="stylesheet" href="${href}">`;
    }
  }

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" href="data:,">
  <title>${title}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/dist/reset.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/dist/reveal.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/dist/theme/sky.css">${slideCssLink}
  <style>
    /* Markmap SVG baseline (allow container to control size) */
    #toc-mindmap {
      width: 100%;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
      overflow: hidden;
      display: block;
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
    /* Minimal elements left inline to avoid FOUC */
    /* TOC container outside Reveal.js for Safari compatibility */
    #toc-container {
      display: block;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(#f7fbfc, #add9e4);
      z-index: 100;
      box-sizing: border-box;
    }
    #toc-container h1 {
      text-align: center;
      color: #333;
      font-size: 80px;
      margin: 0;
      padding-top: 60px;
    }
    #toc-container #toc-mindmap {
      width: 100%;
      height: calc(100% - 120px); /* fill under the title */
    }
    #toc-container a {
      text-decoration: none;
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
    /* Last slide message */
    #last-slide-message {
      display: none;
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 15px 25px;
      border-radius: 8px;
      font-size: 16px;
      z-index: 1000;
      text-align: center;
    }
  </style>
</head>
<body${TOP_ALIGN ? ' class="top-align-mode"' : ''}>
  ${parentPage ? `<a href="${parentPage}" class="nav-up-btn" title="상위 페이지" id="nav-up-link">
    <svg viewBox="0 0 24 24">
      <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
    </svg>
    <span>상위</span>
  </a>` : ''}

  <!-- TOC container outside Reveal.js for Safari compatibility -->
  <div id="toc-container">
    <h1>${title}</h1>
    <svg id="toc-mindmap"></svg>
  </div>

  <div id="last-slide-message">마지막 페이지입니다. 다음 챕터로 이동하려면 다시 →를 누르세요.</div>

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
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <script>
    // Allow URL toggle: ?top=1 to enable top-align-mode regardless of config
    try {
      var qs = new URLSearchParams(window.location.search);
      if (qs.get('top') === '1') document.body.classList.add('top-align-mode');
    } catch (e) {}

    Reveal.initialize({
      hash: true,
      plugins: [ RevealMarkdown, RevealHighlight, RevealNotes ],
      width: 1280,
      height: 720,
      margin: 0.05,
      center: false,
      slideNumber: 'c/t',
      transition: 'slide',
      backgroundTransition: 'fade'
    });

    // Initialize mermaid for diagrams (manual rendering)
    mermaid.initialize({
      startOnLoad: false,  // Disable auto-render, we'll render manually
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

    // Render all Mermaid diagrams when Reveal.js is ready
    Reveal.on('ready', function() {
      // Find all mermaid elements in all slides
      const allMermaidElements = document.querySelectorAll('.mermaid');

      if (allMermaidElements && allMermaidElements.length > 0) {
        allMermaidElements.forEach(function(element, index) {
          // Skip if already rendered
          if (element.querySelector('svg')) {
            return;
          }

          const graphDefinition = element.textContent;
          if (!graphDefinition || !graphDefinition.trim()) {
            return;
          }

          const graphId = 'mermaid-diagram-' + index;

          try {
            mermaid.render(graphId, graphDefinition).then(function(result) {
              if (result && result.svg) {
                element.innerHTML = '<div class="graph-scroll">' + result.svg + '</div>';
              }
            }).catch(function(error) {
              console.error('Mermaid rendering error for diagram ' + index + ':', error);
            });
          } catch (e) {
            console.error('Mermaid rendering error for diagram ' + index + ':', e);
          }
        });
      }

      // Render all Kroki diagrams
      const allKrokiElements = document.querySelectorAll('.kroki');
      if (allKrokiElements && allKrokiElements.length > 0) {
        allKrokiElements.forEach(function(element, index) {
          // Skip if already rendered
          if (element.querySelector('svg') || element.querySelector('img')) {
            return;
          }

          const diagramType = element.getAttribute('data-type');
          const diagramSource = element.textContent.trim();

          if (!diagramType || !diagramSource) {
            return;
          }

          // Prefer GET image to avoid CORS issues on file:// origins
          try {
            const imgUrl = 'https://kroki.io/' + diagramType + '/svg?source=' + encodeURIComponent(diagramSource);
            element.innerHTML = '<div class="graph-scroll"><img alt="' + diagramType + ' diagram" src="' + imgUrl + '"/></div>';
          } catch (error) {
            console.error('Kroki rendering setup error for ' + diagramType + ' diagram ' + index + ':', error);
            element.innerHTML = '<p style="color: red;">Failed to prepare ' + diagramType + ' diagram.</p>';
          }
        });
      }
    });

    // Initialize markmap for table of contents (outside Reveal.js for Safari compatibility)
    var tocContainer = document.getElementById('toc-container');
    var tocData = ${JSON.stringify(tocData, null, 6)};
    var markmapInitialized = false;
    var markmapInstance = null;

    // Function to toggle TOC visibility based on current slide
    function updateTocVisibility() {
      var currentSlide = Reveal.getIndices();
      if (currentSlide.h === 0 && currentSlide.v === 0) {
        // First slide: show TOC container
        tocContainer.style.display = 'block';

        // Initialize markmap on first show
        if (!markmapInitialized && window.markmap && tocContainer) {
          // Create with layout options so the tree breathes horizontally
          markmapInstance = window.markmap.Markmap.create('#toc-mindmap', {
            autoFit: true,
            fitRatio: 1,
            spacingHorizontal: 160,
            spacingVertical: 12,
            paddingX: 80,
            initialExpandLevel: 3
          }, tocData);
          markmapInitialized = true;
          // Ensure fit after layout settles
          requestAnimationFrame(function () {
            if (markmapInstance && markmapInstance.fit) markmapInstance.fit();
          });
          setTimeout(function(){ if (markmapInstance && markmapInstance.fit) markmapInstance.fit(); }, 50);
        } else if (markmapInitialized && markmapInstance && markmapInstance.fit) {
          // Re-fit when returning to the first slide
          requestAnimationFrame(function () { markmapInstance.fit(); });
        }
      } else {
        // Other slides: hide TOC container
        tocContainer.style.display = 'none';
      }
    }

    // Initial state check
    Reveal.on('ready', function() {
      updateTocVisibility();
    });

    // Update on slide change
    Reveal.on('slidechanged', function() {
      updateTocVisibility();
    });

    // Keep Markmap fitted on window resize
    window.addEventListener('resize', function(){
      if (markmapInstance && markmapInstance.fit) markmapInstance.fit();
    });

    // Adjust scroll height for tall diagrams based on Reveal scale
    function adjustGraphScrollHeights() {
      // Use Reveal's logical slide height, not viewport, to avoid mis-scaling
      var cfg = (typeof Reveal.getConfig === 'function') ? Reveal.getConfig() : { height: 720 };
      var base = cfg && cfg.height ? cfg.height : 720;
      var available = base - 160; // reserve space for title/margins
      if (available < 200) available = 200;
      document.querySelectorAll('.graph-scroll').forEach(function(el){
        el.style.maxHeight = available + 'px';
        el.style.overflowY = 'auto';
      });
    }

    // Enlarge small diagrams up to slide width, capping height to 3:2
    function fitSmallDiagrams() {
      var cfg = (typeof Reveal.getConfig === 'function') ? Reveal.getConfig() : { width: 1280, height: 720 };
      var contentW = (cfg && cfg.width ? cfg.width : 1280) - 120; // padding (60px each side)
      if (contentW < 320) contentW = 320;
      var capH = Math.floor(contentW * 2 / 3);

      document.querySelectorAll('.graph-scroll > svg, .graph-scroll > img').forEach(function(el){
        var rect = el.getBoundingClientRect();
        var curW = rect && rect.width ? rect.width : 0;
        // Only upscale when clearly smaller than container
        if (curW > 0 && curW < contentW * 0.7) {
          el.style.width = contentW + 'px';
          el.style.maxHeight = capH + 'px';
          el.style.height = 'auto';
        } else {
          // Do not force width for already large diagrams
          el.style.removeProperty('width');
          el.style.removeProperty('max-height');
        }
      });
    }

    Reveal.on('ready', function(){
      // Enforce top alignment in case theme defaults differ
      if (typeof Reveal.configure === 'function') { Reveal.configure({ center: false }); }
      if (document.body.classList.contains('top-align-mode')) {
        // Remove extra top padding on current slide to keep content tight to top
        var cur = Reveal.getCurrentSlide();
        if (cur) cur.style.paddingTop = '10px';
      }
      adjustGraphScrollHeights();
      fitSmallDiagrams();
    });
    Reveal.on('slidechanged', function(){ adjustGraphScrollHeights(); fitSmallDiagrams(); });
    window.addEventListener('resize', function(){ adjustGraphScrollHeights(); fitSmallDiagrams(); });

    // Last slide message state
    var lastSlideMessageShown = false;
    var lastSlideMessage = document.getElementById('last-slide-message');

    // Connect keyboard navigation
    document.addEventListener('keydown', function(event) {
      // Check if up arrow key is pressed
      if (event.key === 'ArrowUp' || event.keyCode === 38) {
        var currentSlide = Reveal.getIndices();
        // Only navigate to parent if there are no vertical slides and parent exists
        if (currentSlide.v === 0) {
          var navLink = document.getElementById('nav-up-link');
          if (navLink) {
            event.preventDefault();
            window.location.href = navLink.href;
          }
        }
      }

      // Check if right arrow key is pressed
      if (event.key === 'ArrowRight' || event.keyCode === 39) {
        var totalSlides = Reveal.getTotalSlides();
        var currentSlide = Reveal.getIndices();
        var currentSlideNumber = Reveal.getSlidePastCount() + 1;
        var hasNextChapter = '${nextChapter}' !== '';

        // Check if on last slide
        if (currentSlideNumber >= totalSlides) {
          if (hasNextChapter) {
            if (lastSlideMessageShown) {
              // Second press: navigate to next chapter
              lastSlideMessage.style.display = 'none';
              lastSlideMessageShown = false;
              window.location.href = '${nextChapter}';
            } else {
              // First press: show message
              event.preventDefault();
              lastSlideMessage.style.display = 'block';
              lastSlideMessageShown = true;
            }
          } else {
            // No next chapter - do nothing or show different message
            event.preventDefault();
          }
        }
      }
    });

    // Hide message when slide changes
    Reveal.on('slidechanged', function() {
      lastSlideMessage.style.display = 'none';
      lastSlideMessageShown = false;
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
function generateIndexHTML(agendaPath, projectDir) {
  const markmapData = parseAgenda(agendaPath);

  // Read title from AGENDA.md
  const content = fs.readFileSync(agendaPath, 'utf-8');
  const titleMatch = content.match(/^# (.+)$/m);
  const title = titleMatch ? titleMatch[1] : 'LLM 툴 진화와 바이브 코딩 세대 구분';

  // Check if EPUB file exists
  const projectName = path.basename(projectDir);
  const epubFileName = `${projectName}.epub`;
  const epubPath = path.join(projectDir, 'slide', epubFileName);
  const hasEpub = fs.existsSync(epubPath);

  const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="ie=edge" />
<link rel="icon" href="data:,">
<title>${title}</title>
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
  position: relative;
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
  ${hasEpub ? `<p style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%);"><a href="${epubFileName}" download style="color: white; background: rgba(255,255,255,0.2); padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block; font-size: 14px;">📚 EPUB 다운로드</a></p>` : ''}
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
<script>
// Keyboard navigation: right arrow to first chapter
document.addEventListener('keydown', function(event) {
  if (event.key === 'ArrowRight' || event.keyCode === 39) {
    // Navigate to first chapter
    window.location.href = '${markmapData.children && markmapData.children.length > 0 ? markmapData.children[0].content.match(/href="([^"]+)"/)?.[1] || '01-opening.html' : '01-opening.html'}';
  }
});
</script>
</body>
</html>
`;

  return html;
}

// Main execution
function main() {
  // Load optional config
  loadConfig();
  const args = process.argv.slice(2);

  // Parse arguments
  let inputDir, outputDir, projectDir;

  if (args.length === 0) {
    // Default: Projects/LlmAndVibeCoding relative to repository root
    projectDir = path.join(ROOT_DIR, 'Projects', 'LlmAndVibeCoding');
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
    const indexHTML = generateIndexHTML(agendaPath, projectDir);
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
