#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');
let TOP_ALIGN = false; // optional hard top-align mode
let GUID_LINE = false; // optional guide line mode for debugging layout
let SLIDE_RATIO = 'none'; // '16:9', '3:2', or 'none' (default)
let SLIDE_CSS_REL = null; // project-relative CSS path (e.g., resource/slide.css)
let USE_OPEN_PROPS = false; // Use Open Props CDN
let STYLE_CONFIG = {
  style: {
    title: { maxFontSize: '1em', maxFontColor: '#000000', align: 'center', outer_padding: '1%' },
    sub_title: { maxFontSize: '1em', maxFontColor: '#666666', align: 'right', outer_padding: '5px' },
    theContents: {
      maxFontSize: '1em', maxFontColor: '#000000', align: 'left', outer_padding: '5px',
      fontSizeMin: '20px', fontSizeMaxRatio: 0.66, font_size_auto: true, media_container_enlarge: 'original'
    }
  }
};
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
      const val = m[1].split('#')[0].trim().toLowerCase();
      TOP_ALIGN = (val === 'true' || val === 'yes' || val === '1');
    }
    const g = raw.match(/^guide_line:\s*(.+)$/m);
    if (g) {
      const val = g[1].split('#')[0].trim().toLowerCase();
      GUID_LINE = (val === 'true' || val === 'yes' || val === '1');
    }
    const r = raw.match(/^slide_ratio:\s*(.+)$/m);
    if (r) {
      SLIDE_RATIO = r[1].split('#')[0].trim().toLowerCase();
    }
    const c = raw.match(/^slide_css:\s*(.+)$/m);
    if (c) {
      SLIDE_CSS_REL = c[1].split('#')[0].trim();
    }
    const op = raw.match(/^use_open_props:\s*(.+)$/m);
    if (op) {
      const val = op[1].split('#')[0].trim().toLowerCase();
      USE_OPEN_PROPS = (val === 'true' || val === 'yes' || val === '1');
    }

    // Parse style section
    // Improved regex to capture indented block including blank lines/comments
    // Since style is the last section, we capture until EOF
    const styleSection = raw.match(/^style:\s*\n([\s\S]*)$/m);
    if (styleSection) {
      const lines = styleSection[1].split('\n');
      let currentSection = null;

      lines.forEach(line => {
        const indent = line.search(/\S/);
        const content = line.trim();
        if (!content) return;

        if (indent === 2 && content.endsWith(':')) {
          currentSection = content.slice(0, -1); // title or list
        } else if (indent === 4 && currentSection) {
          let parts = content.split(':');
          let key = parts[0].trim();
          let val = parts.slice(1).join(':').trim();

          // Strip inline comments (starting with " #")
          if (val) {
            val = val.split(' #')[0].trim();
          }

          if (val && (val.startsWith("'") || val.startsWith('"')) && val.endsWith(val[0])) {
            val = val.slice(1, -1);
          }
          if (key && val) {
            if (key && val) {
              if (currentSection === 'title') {
                if (key === 'max_font_size') STYLE_CONFIG.style.title.maxFontSize = val;
                if (key === 'max_font_color') STYLE_CONFIG.style.title.maxFontColor = val;
                if (key === 'align') STYLE_CONFIG.style.title.align = val;
                if (key === 'outer_padding') STYLE_CONFIG.style.title.outer_padding = val;
              } else if (currentSection === 'sub_title') {
                if (key === 'max_font_size') STYLE_CONFIG.style.sub_title.maxFontSize = val;
                if (key === 'max_font_color') STYLE_CONFIG.style.sub_title.maxFontColor = val;
                if (key === 'align') STYLE_CONFIG.style.sub_title.align = val;
                if (key === 'outer_padding') STYLE_CONFIG.style.sub_title.outer_padding = val;
              } else if (currentSection === 'theContents') {
                if (key === 'max_font_size') STYLE_CONFIG.style.theContents.maxFontSize = val;
                if (key === 'max_font_color') STYLE_CONFIG.style.theContents.maxFontColor = val;
                if (key === 'align') STYLE_CONFIG.style.theContents.align = val;
                if (key === 'outer_padding') STYLE_CONFIG.style.theContents.outer_padding = val;
                if (key === 'font_size_min') STYLE_CONFIG.style.theContents.fontSizeMin = val;
                if (key === 'font_size_max_ratio') STYLE_CONFIG.style.theContents.fontSizeMaxRatio = parseFloat(val);
                if (key === 'font_size_auto') {
                  const valLower = val.toLowerCase();
                  STYLE_CONFIG.style.theContents.font_size_auto = (valLower === 'true' || valLower === 'yes' || valLower === '1');
                }
                if (key === 'media_container_enlarge') {
                  STYLE_CONFIG.style.theContents.media_container_enlarge = val.toLowerCase();
                }
              }
            }
          }
        }
      });
    }
  } catch (_) { }
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
      if (level > listLevel) {
        // Start new nested list
        while (listLevel < level) {
          // Remove closing </li> from previous item if it exists, to nest <ul> inside it
          if (html.length > 0 && html[html.length - 1].endsWith('</li>')) {
            html[html.length - 1] = html[html.length - 1].slice(0, -5);
            html.push('<ul>');
          } else {
            // Fallback if no previous li (shouldn't happen in valid markdown usually)
            html.push('<ul>');
          }
          listLevel++;
        }
      } else if (level < listLevel) {
        // Close nested lists
        while (listLevel > level) {
          html.push('</ul>');
          html.push('</li>'); // Close the parent li
          listLevel--;
        }
      } else {
        // Same level, close previous item if needed
        // (Not strictly needed if we don't open <li> explicitly until content, but for simplicity)
      }

      // Apply different class based on bullet character
      const bulletClass = bulletChar === '*' ? ' class="bullet-dot"' : '';
      html.push(`<li${bulletClass}>${processInline(content)}</li>`);
      continue;
    } else if (inList && !line.match(/^\s*[-*]\s/)) {
      // Check if it's a continuation (indented text)
      if (line.trim() !== '' && line.match(/^\s+/)) {
        const indent = line.match(/^(\s*)/)[1].length;
        // Determine target level: indent should be >= (level * 2) + 2
        // e.g. Level 0 (0 indent) -> content at 2+. Level 1 (2 indent) -> content at 4+.
        // If indent is 2, it belongs to Level 0.

        // Close nested lists if indent is insufficient for current level
        while (listLevel > 0 && indent < (listLevel * 2) + 2) {
          html.push('</ul>');
          html.push('</li>');
          listLevel--;
        }

        if (html.length > 0 && html[html.length - 1].endsWith('</li>')) {
          // Append text to the last li (line break)
          html[html.length - 1] = html[html.length - 1].slice(0, -5) + '<br>' + processInline(line.trim()) + '</li>';
          continue;
        }
      }

      // Close all nested lists
      while (listLevel > 0) {
        html.push('</ul>');
        html.push('</li>');
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
        html.push('<div class="media-container mermaid">');
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
          html.push('<div class="media-container kroki">');
          html.push(`<div class="graph-scroll"><img src="${url}" alt="${lang} diagram"/></div>`);
          html.push('</div>');
        } catch (e) {
          // Fallback to runtime rendering container if deflate fails
          html.push(`<div class="media-container kroki" data-type="${lang}">`);
          html.push(source);
          html.push('</div>');
        }
      }
      else {
        // Regular code block
        const langClass = lang ? ` class="language-${lang}"` : '';
        html.push(`<pre class="code-wrapper"><code${langClass}>` + codeLines.join('\n') + '</code></pre>');
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

    // Standalone image (not inside text)
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    if (imgMatch) {
      html.push(`<div class="media-container"><img src="${imgMatch[2]}" alt="${imgMatch[1]}"></div>`);
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
      html.push('</li>');
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
  let content = fs.readFileSync(filePath, 'utf-8');
  let yamlTitle = null;

  // Extract YAML frontmatter
  if (content.startsWith('---')) {
    const end = content.indexOf('\n---', 3);
    if (end !== -1) {
      const yaml = content.slice(4, end);
      const m = yaml.match(/^title:\s*(.+)$/m);
      if (m) yamlTitle = m[1].trim();
      content = content.slice(end + 4).trim();
    }
  }

  const slides = content.split(/\n---\n/).map(slide => slide.trim());

  // If YAML title exists, prepend a placeholder slide for the Title/TOC
  // This ensures the actual first content slide is preserved as the second slide
  if (yamlTitle) {
    slides.unshift('');
  }

  let currentChapterTitle = '';

  // Pass 1: Create initial slide objects
  const slideObjects = slides.map((slide, index) => {
    // Check for H1 to update current chapter title
    const h1Match = slide.match(/^# (.+)$/m);
    if (h1Match) {
      currentChapterTitle = h1Match[1];
    }

    // First slide gets title
    if (index === 0) {
      let title = yamlTitle;
      if (!title) {
        title = currentChapterTitle || 'Slide';
      }
      return { title, content: slide, isTitle: true, chapterTitle: '' }; // No chapter header on TOC
    }

    // Check if this slide has a table
    if (isTable(slide)) {
      return { content: slide, isTable: true, chapterTitle: currentChapterTitle };
    }

    return { content: slide, chapterTitle: currentChapterTitle };
  });

  // Pass 2: Collect H2 children for H1 slides
  let currentH1 = null;
  slideObjects.forEach(s => {
    // Check if this slide is an H1 slide
    const h1Match = s.content.match(/^# (.+)$/m);
    if (h1Match) {
      currentH1 = s;
      currentH1.children = [];
    } else if (currentH1) {
      // Check for H2 in subsequent slides
      const h2Match = s.content.match(/^## (.+)$/m);
      if (h2Match) {
        currentH1.children.push({ title: h2Match[1], index: slideObjects.indexOf(s) });
      }
    }
  });

  return slideObjects;
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
  let content = fs.readFileSync(filePath, 'utf-8');
  let yamlTitle = '';

  // Extract YAML frontmatter
  if (content.startsWith('---')) {
    const end = content.indexOf('\n---', 3);
    if (end !== -1) {
      const yaml = content.slice(4, end);
      const m = yaml.match(/^title:\s*(.+)$/m);
      if (m) yamlTitle = m[1].trim();
      content = content.slice(end + 4).trim();
    }
  }

  const lines = content.split('\n');

  const sections = [];
  let currentSection = null;
  let inCode = false;
  let slideIndex = 0;

  // If we added a title slide in parseMarkdownFile (due to YAML), we need to offset the index
  if (yamlTitle) {
    slideIndex = 1;
  }

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
      currentSection = { content: `<a href="#/${slideIndex}">${h1[1]}</a>`, children: [] };
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

  return { content: yamlTitle, children: sections };
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
  let html = convertMarkdownToHTML(slide.content);
  let isTitleOnly = false;

  // Check if it's just a single H1 or H2 (ignoring whitespace)
  // This handles cases like "# Title" or "## Title" with no other content
  if (/^[\s\n]*<(h[12])(?: [^>]*)?>.*?<\/\1>[\s\n]*$/i.test(html)) {
    isTitleOnly = true;
  }

  // If the slide has an H2, wrap the following sibling content in a div.theContents
  // to ensure structure: section > h2 + div.theContents
  const h2Start = html.indexOf('<h2');
  if (h2Start !== -1) {
    const h2Close = html.indexOf('</h2>', h2Start);
    if (h2Close !== -1) {
      const head = html.slice(0, h2Close + 5);
      const rest = html.slice(h2Close + 5).trim();

      if (rest.length === 0) {
        // H2 with empty content -> Title Only
        isTitleOnly = true;
        html = head; // Remove empty rest
      } else {
        html = `${head}\n<div class="theContents">\n${rest}\n</div>`;
      }
    }
  }

  // If it's a title-only slide and has children (chapter overview), append the list
  if (isTitleOnly && slide.children && slide.children.length > 0) {
    const count = slide.children.length;
    // Limit columns to item count (max columns = count)
    // This works with column-width: 300px in CSS to be responsive but capped
    const listHtml = `<ul class="chapter-list" style="column-count: ${count}">\n` +
      slide.children.map(child => `<li><a href="#/${child.index}">${child.title}</a></li>`).join('\n') +
      '\n</ul>';
    html += '\n' + listHtml;
  }

  const sectionClass = isTitleOnly ? ' class="title-slide"' : '';
  const chapterAttr = slide.chapterTitle ? ` data-chapter-title="${slide.chapterTitle.replace(/"/g, '&quot;')}"` : '';

  return `      <section${sectionClass}${chapterAttr}>
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
    let cssPath;
    if (path.isAbsolute(SLIDE_CSS_REL)) {
      cssPath = SLIDE_CSS_REL;
    } else if (SLIDE_CSS_REL.startsWith('resource/')) {
      cssPath = path.join(ROOT_DIR, SLIDE_CSS_REL);
    } else {
      cssPath = path.join(projectDirGuess, SLIDE_CSS_REL);
    }
    if (fs.existsSync(cssPath)) {
      const href = path.relative(path.join(projectDirGuess, 'slide'), cssPath).replace(/\\/g, '/');
      slideCssLink = `\n  <link rel="stylesheet" href="${href}?v=${Date.now()}">`;
    }
  }

  // Determine Reveal.js config based on SLIDE_RATIO
  let revealWidth = '100%';
  let revealHeight = '100%';
  let ratioClass = 'ratio-none';

  if (SLIDE_RATIO === '16:9') {
    revealWidth = 1920;
    revealHeight = 1080;
    ratioClass = 'ratio-16-9';
  } else if (SLIDE_RATIO === '3:2') {
    revealWidth = 1920;
    revealHeight = 1280;
    ratioClass = 'ratio-3-2';
  }

  const openPropsLink = USE_OPEN_PROPS ? `\n  <link rel="stylesheet" href="https://unpkg.com/open-props"/>` : '';

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${title}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/dist/reset.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/dist/reveal.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/dist/theme/sky.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github.css">${openPropsLink}${slideCssLink}
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
      display: flex;
      flex-direction: column;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(#f7fbfc, #add9e4);
      z-index: 100;
      box-sizing: border-box;
      overflow: hidden; /* Prevent scrollbars if title is huge */
    }
    #toc-container h1 {
      text-align: var(--title-align, center);
      color: var(--title-color, #333);
      font-size: var(--title-max-font-size, 80px);
      margin: 0;
      padding: var(--title-padding, 40px 0 20px 0);
      flex-shrink: 0; /* Title should not shrink */
    }
    #toc-container #toc-mindmap {
      width: 100%;
      flex: 1; /* Grow to fill space, basis 0 */
      min-height: 0; /* Allow shrinking */
      display: block;
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
<body class="${TOP_ALIGN ? 'top-align-mode' : ''} ${GUID_LINE ? 'guide-line-mode' : ''} media-enlarge-${STYLE_CONFIG.style.theContents.media_container_enlarge || 'original'}" style="
  --title-max-font-size: ${STYLE_CONFIG.style.title.maxFontSize};
  --title-color: ${STYLE_CONFIG.style.title.maxFontColor};
  --title-align: ${STYLE_CONFIG.style.title.align};
  --title-padding: ${STYLE_CONFIG.style.title.outer_padding};
  --subtitle-max-font-size: ${STYLE_CONFIG.style.sub_title.maxFontSize};
  --subtitle-color: ${STYLE_CONFIG.style.sub_title.maxFontColor};
  --subtitle-align: ${STYLE_CONFIG.style.sub_title.align};
  --subtitle-padding: ${STYLE_CONFIG.style.sub_title.outer_padding};
  --content-max-font-size: ${STYLE_CONFIG.style.theContents.maxFontSize};
  --content-color: ${STYLE_CONFIG.style.theContents.maxFontColor};
  --content-align: ${STYLE_CONFIG.style.theContents.align};
  --content-padding: ${STYLE_CONFIG.style.theContents.outer_padding};
">
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

  <div class="reveal ${ratioClass}">
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
      width: '${revealWidth}',
      height: '${revealHeight}',
      margin: 0.0,
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
        useMaxWidth: false
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
        useMaxWidth: false
      },
      timeline: {
        useMaxWidth: false
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
    });

    // Render all Kroki diagrams (runtime fallback)
    Reveal.on('ready', function() {
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


    // Inject configuration
    window.slideConfig = ${JSON.stringify(STYLE_CONFIG)};

    // Dynamic Styling and Resizing Script
    function applyDynamicStyles() {
      const config = window.slideConfig;
      if (!config) return;

      // 1. Apply Title Styles - REMOVED (Migrated to CSS)
      
      const allSlides = document.querySelectorAll('.reveal .slides section');
      // No dynamic title styling anymore

      // 2. Resize Lists in current slide

      // 2. Resize Lists in current slide
      const currentSlide = Reveal.getCurrentSlide();
      if (!currentSlide) return;

      // 1. Fit lists (ul/ol)
      // Only target top-level lists to avoid double-sizing nested ones
      // 1. Fit content (theContents)
      // Target the container itself
      const contents = currentSlide.querySelectorAll('.theContents');
      if (contents.length === 0) return;
      
      contents.forEach(content => {
        // Check if auto font size is enabled
        if (config.style.theContents.font_size_auto === false) {
            return;
        }

        // Get title size for reference (from current slide or config)
        let titleSizePx = 60; // fallback
        const h1 = currentSlide.querySelector('h1');
        if (h1) {
          titleSizePx = parseFloat(window.getComputedStyle(h1).fontSize);
        }

        const maxFontSize = titleSizePx * (config.style.theContents.fontSizeMaxRatio || 0.66);
        const minFontSize = parseFloat(config.style.theContents.fontSizeMin || '20px');

        // Binary search or iterative approach to find best fit
        // Range: [minFontSize, maxFontSize]
        
        let low = minFontSize;
        let high = maxFontSize;
        let bestFit = minFontSize;

        // Reset styles for measurement
        content.style.fontSize = maxFontSize + 'px';
        content.style.lineHeight = '1.2'; // Tighter line height for large text
        // content.style.height = 'auto'; // Don't reset height, it's flex-grow
        // content.style.overflowY = 'visible'; // Keep it auto/scroll

        // Check if it fits at max
        // We compare scrollHeight (content size) with clientHeight (available visible size)
        if (content.scrollHeight <= content.clientHeight) {
           bestFit = maxFontSize;
        } else {
           // Binary search
           for (let i = 0; i < 10; i++) { // 10 iterations is enough precision
              const mid = (low + high) / 2;
              content.style.fontSize = mid + 'px';
              if (content.scrollHeight <= content.clientHeight) {
                 bestFit = mid;
                 low = mid;
              } else {
                 high = mid;
              }
           }
        }

        // Apply best fit
        content.style.fontSize = bestFit + 'px';
        
        // If even at min size it overflows, enable scroll (already auto in CSS)
        if (bestFit <= minFontSize + 1) {
           content.style.fontSize = minFontSize + 'px';
        }
      });
    }

    Reveal.on('ready', applyDynamicStyles);
    Reveal.on('slidechanged', applyDynamicStyles);
    // Also re-apply on resize
    window.addEventListener('resize', applyDynamicStyles);

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
        tocContainer.style.display = 'flex';

        // Initialize markmap on first show
        if (!markmapInitialized && window.markmap && tocContainer) {
          // Create with layout options so the tree breathes horizontally
          markmapInstance = window.markmap.Markmap.create('#toc-mindmap', {
            autoFit: true,
            fitRatio: 0.95,
            spacingHorizontal: 80,
            spacingVertical: 12,
            paddingX: 40,
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
    var resizeTimeout;
    window.addEventListener('resize', function(){
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function() {
        if (markmapInstance && markmapInstance.fit) markmapInstance.fit();
        adjustGraphScrollHeights();
        fitSmallDiagrams();
        topBiasCurrentSlide();
      }, 100);
    });

    // Adjust scroll height for tall diagrams based on Reveal scale
    function adjustGraphScrollHeights() {
      // Use Reveal logical size and subtract actual header height on current slide
      var cfg = (typeof Reveal.getConfig === 'function') ? Reveal.getConfig() : { width: 1280, height: 720 };
      var baseH = cfg && cfg.height ? cfg.height : 720;

      var cur = (typeof Reveal.getCurrentSlide === 'function') ? Reveal.getCurrentSlide() : null;
      var headerSpace = 0;
      if (cur) {
        // Sum heights of visible H1/H2 in current slide
        var heads = cur.querySelectorAll('h1, h2');
        heads.forEach(function(h){
          var cs = window.getComputedStyle(h);
          var mh = parseFloat(cs.marginTop) + parseFloat(cs.marginBottom);
          headerSpace += h.offsetHeight + mh;
        });
        // Add a small buffer below titles
        headerSpace += 40;
      }

      var available = baseH - headerSpace - 40; // smaller buffer to allow larger content
      if (available < 200) available = 200;

      // Only adjust graph-scroll inside current slide to avoid layout thrash
      var apply = function(scope){
        scope.querySelectorAll('.graph-scroll').forEach(function(el){
          el.style.maxHeight = available + 'px';
          el.style.overflowY = 'auto';
          // Prefer height-based fit for diagrams
          el.querySelectorAll('svg, img').forEach(function(di){
            di.style.maxHeight = available + 'px';
            di.style.height = 'auto';
            di.style.width = 'auto';
            di.style.maxWidth = '100%';
          });
        });
      };
      if (cur) apply(cur); else apply(document);
    }

    // Vertically bias content to top by reducing extra center spacing using margin
    var lastAdjustedSlide = null;
    function topBiasCurrentSlide() {
      if (typeof Reveal.getCurrentSlide !== 'function') return;
      var slide = Reveal.getCurrentSlide();
      if (!slide) return;
      // reset previous
      if (lastAdjustedSlide && lastAdjustedSlide !== slide) {
        lastAdjustedSlide.style.marginTop = '';
      }
      // compute extra space when content is short (Reveal may center it)
      var cfg = (typeof Reveal.getConfig === 'function') ? Reveal.getConfig() : { height: 720 };
      var logicalH = cfg && cfg.height ? cfg.height : 720;
      var contentH = slide.scrollHeight;
      var extra = (logicalH - contentH) / 2; // space added by vertical centering
      if (extra > 10) {
        // leave a small 10px top padding, pull the rest up via negative margin
        var offset = Math.min(extra - 10, logicalH * 0.25); // cap shift to 25% of slide height
        slide.style.marginTop = '-' + Math.round(offset) + 'px';
        lastAdjustedSlide = slide;
      } else {
        slide.style.marginTop = '';
      }
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
      topBiasCurrentSlide();
    });
    Reveal.on('slidechanged', function(){ adjustGraphScrollHeights(); fitSmallDiagrams(); topBiasCurrentSlide(); });
    window.addEventListener('resize', function(){ adjustGraphScrollHeights(); fitSmallDiagrams(); topBiasCurrentSlide(); });

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
          } else {
            // Single page mode: go to first slide
            event.preventDefault();
            Reveal.slide(0, 0);
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
