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
  markmap_depth: 3, // default
  style: {
    global: { fontFamily: 'Pretendard, sans-serif', fontImport: [] },
    title: { font_size: '1em', font_color: '#000000', align: 'center', outer_padding: '1%', font_family: '', font_weight: '700' },
    main_title: { font_size: '80px', font_color: '#333333', align: 'center', outer_padding: '40px 0 20px 0', font_family: '', font_weight: '700' },
    outline_title: { font_size: '2.5em', font_color: '#000000', align: 'center', outer_padding: '0', font_family: '', font_weight: '700' },
    outline_title_sub: { font_size: '1em', font_color: '#666666', align: 'right', outer_padding: '5px', font_family: '', font_weight: '500' },
    theContents: {
      font_size: '1em', font_color: '#000000', align: 'left', outer_padding: '5px', font_family: '',
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
    const md = raw.match(/^markmap_depth:\s*(.+)$/m);
    if (md) {
      STYLE_CONFIG.markmap_depth = parseInt(md[1].split('#')[0].trim(), 10);
    }
    const cmd = raw.match(/^chapter_markmap_depth:\s*(.+)$/m);
    if (cmd) {
      STYLE_CONFIG.chapter_markmap_depth = parseInt(cmd[1].split('#')[0].trim(), 10);
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
        } else if (indent === 6 && content.startsWith('- ') && currentSection === 'global') {
          // Handle list items for global section (font_import)
          // We assume the previous line was "font_import:"
          // But we don't track previous line key easily here.
          // Let's just assume if we are in global and see a list item, it's for font_import
          // A better way is to check if lines[index-1] was "font_import:" or another list item
          // For simplicity, let's just add to fontImport if we are in global section
          let val = content.slice(2).trim();
          if (val && (val.startsWith("'") || val.startsWith('"')) && val.endsWith(val[0])) {
            val = val.slice(1, -1);
          }
          STYLE_CONFIG.style.global.fontImport.push(val);
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
              if (currentSection === 'global') {
                if (key === 'font_family') STYLE_CONFIG.style.global.fontFamily = val;
                if (key === 'font_import') {
                  // Handle list of imports
                  // Since we are parsing line by line, we need to accumulate list items
                  // But the current simple parser expects key: value on one line or indented block
                  // Let's assume the simple parser handles indented list items if we modify it slightly
                  // OR, for now, let's just handle single line array syntax or multiple lines if possible
                  // Actually, the current parser structure (lines.forEach) makes it hard to handle multi-line lists without state
                  // Let's hack it: if we see a line starting with "- ", add it to the current list key if applicable
                }
              } else if (currentSection === 'title') {
                if (key === 'font_size') STYLE_CONFIG.style.title.font_size = val;
                if (key === 'font_color') STYLE_CONFIG.style.title.font_color = val;
                if (key === 'align') STYLE_CONFIG.style.title.align = val;
                if (key === 'outer_padding') STYLE_CONFIG.style.title.outer_padding = val;
                if (key === 'font_family') STYLE_CONFIG.style.title.font_family = val;
                if (key === 'font_weight') STYLE_CONFIG.style.title.font_weight = val;
              } else if (currentSection === 'main_title') {
                if (key === 'font_size') STYLE_CONFIG.style.main_title.font_size = val;
                if (key === 'font_color') STYLE_CONFIG.style.main_title.font_color = val;
                if (key === 'align') STYLE_CONFIG.style.main_title.align = val;
                if (key === 'outer_padding') STYLE_CONFIG.style.main_title.outer_padding = val;
                if (key === 'font_family') STYLE_CONFIG.style.main_title.fontFamily = val;
                if (key === 'font_weight') STYLE_CONFIG.style.main_title.font_weight = val;
              } else if (currentSection === 'outline_title') {
                if (key === 'font_size') STYLE_CONFIG.style.outline_title.font_size = val;
                if (key === 'font_color') STYLE_CONFIG.style.outline_title.font_color = val;
                if (key === 'align') STYLE_CONFIG.style.outline_title.align = val;
                if (key === 'outer_padding') STYLE_CONFIG.style.outline_title.outer_padding = val;
                if (key === 'font_family') STYLE_CONFIG.style.outline_title.font_family = val;
                if (key === 'font_weight') STYLE_CONFIG.style.outline_title.font_weight = val;
              } else if (currentSection === 'outline_title_sub') {
                if (key === 'font_size') STYLE_CONFIG.style.outline_title_sub.font_size = val;
                if (key === 'font_color') STYLE_CONFIG.style.outline_title_sub.font_color = val;
                if (key === 'align') STYLE_CONFIG.style.outline_title_sub.align = val;
                if (key === 'outer_padding') STYLE_CONFIG.style.outline_title_sub.outer_padding = val;
                if (key === 'font_family') STYLE_CONFIG.style.outline_title_sub.font_family = val;
                if (key === 'font_weight') STYLE_CONFIG.style.outline_title_sub.font_weight = val;
              } else if (currentSection === 'theContents') {
                if (key === 'font_size') STYLE_CONFIG.style.theContents.font_size = val;
                if (key === 'font_color') STYLE_CONFIG.style.theContents.font_color = val;
                if (key === 'align') STYLE_CONFIG.style.theContents.align = val;
                if (key === 'outer_padding') STYLE_CONFIG.style.theContents.outer_padding = val;
                if (key === 'font_family') STYLE_CONFIG.style.theContents.fontFamily = val;
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
  let olLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Headers
    if (line.match(/^### /)) {
      html.push(line.replace(/^### (.+)$/, '<h3>$1</h3>'));
      continue;
    }
    if (line.match(/^## /)) {
      html.push(line.replace(/^## (.+)$/, '<h2 class="title">$1</h2>'));
      continue;
    }
    if (line.match(/^# /)) {
      html.push(line.replace(/^# (.+)$/, '<h1 class="outline-title">$1</h1>'));
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
      // Normalize indentation: replace tabs with 2 spaces
      const indent = bulletMatch[1].replace(/\t/g, '  ').length;
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
      let bulletClass = '';
      if (bulletChar === '*') {
        bulletClass = ' class="bullet-dot"';
      } else if (bulletChar === '-') {
        bulletClass = ' class="bullet-dash"';
      }
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
    // Ordered list
    const olMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (olMatch) {
      // Normalize indentation: replace tabs with 2 spaces
      const indent = olMatch[1].replace(/\t/g, '  ').length;
      const content = olMatch[3];
      const level = Math.floor(indent / 2); // 2 spaces = 1 level

      if (!inOrderedList) {
        html.push('<ol>');
        inOrderedList = true;
        olLevel = 0;
      }

      // Handle nesting
      if (level > olLevel) {
        // Start new nested list
        while (olLevel < level) {
          // Remove closing </li> from previous item if it exists, to nest <ol> inside it
          if (html.length > 0 && html[html.length - 1].endsWith('</li>')) {
            html[html.length - 1] = html[html.length - 1].slice(0, -5);
            html.push('<ol>');
          } else {
            // Fallback
            html.push('<ol>');
          }
          olLevel++;
        }
      } else if (level < olLevel) {
        // Close nested lists
        while (olLevel > level) {
          html.push('</ol>');
          html.push('</li>'); // Close the parent li
          olLevel--;
        }
      }

      html.push(`<li>${processInline(content)}</li>`);
      continue;
    } else if (inOrderedList && !line.match(/^\s*\d+\.\s/)) {
      // Check if it's a continuation (indented text)
      if (line.trim() !== '' && line.match(/^\s+/)) {
        const indent = line.match(/^(\s*)/)[1].length;

        // Close nested lists if indent is insufficient for current level
        while (olLevel > 0 && indent < (olLevel * 2) + 2) {
          html.push('</ol>');
          html.push('</li>');
          olLevel--;
        }

        if (html.length > 0 && html[html.length - 1].endsWith('</li>')) {
          // Append text to the last li (line break)
          html[html.length - 1] = html[html.length - 1].slice(0, -5) + '<br>' + processInline(line.trim()) + '</li>';
          continue;
        }
      }

      // Close all nested lists
      while (olLevel > 0) {
        html.push('</ol>');
        html.push('</li>');
        olLevel--;
      }
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
  if (inOrderedList) {
    while (olLevel > 0) {
      html.push('</ol>');
      html.push('</li>');
      olLevel--;
    }
    html.push('</ol>');
  }
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
// Helper to check if markdown has significant text content (paragraphs, lists, tables)
// excluding headers and images
function hasTextContent(markdown) {
  // Remove diagram code blocks first
  const diagramLangs = [
    'mermaid', 'blockdiag', 'seqdiag', 'actdiag', 'nwdiag', 'packetdiag', 'rackdiag',
    'ditaa', 'dot', 'graphviz', 'vega', 'vegalite', 'plantuml'
  ];

  let cleanedMarkdown = markdown;

  // Remove code blocks for diagrams
  // Regex matches ```lang ... ```
  // We use a simplified regex that handles most cases
  cleanedMarkdown = cleanedMarkdown.replace(/```(\w+)?[\s\S]*?```/g, (match, lang) => {
    if (lang && diagramLangs.includes(lang.toLowerCase())) {
      return ''; // Remove diagram block
    }
    return match; // Keep other code blocks (they count as text)
  });

  const lines = cleanedMarkdown.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Ignore headers
    if (trimmed.startsWith('#')) continue;
    // Ignore images
    if (trimmed.match(/^!\[.*\]\(.*\)$/)) continue;
    // Ignore HTML comments
    if (trimmed.startsWith('<!--')) continue;

    // If we find anything else (list, text, code fence, table row), it has text
    return true;
  }
  return false;
}

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

    return { content: slide, chapterTitle: currentChapterTitle, hasText: hasTextContent(slide) };
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

  // Wrap content in div.theContents to enable styling and auto-sizing
  // Priority: Split after H2, then after H1, otherwise wrap everything
  let splitIndex = -1;

  const h2Start = html.indexOf('<h2');
  if (h2Start !== -1) {
    const h2Close = html.indexOf('</h2>', h2Start);
    if (h2Close !== -1) {
      splitIndex = h2Close + 5;
    }
  } else {
    const h1Start = html.indexOf('<h1');
    if (h1Start !== -1) {
      const h1Close = html.indexOf('</h1>', h1Start);
      if (h1Close !== -1) {
        splitIndex = h1Close + 5;
      }
    }
  }

  if (splitIndex !== -1) {
    const head = html.slice(0, splitIndex);
    const rest = html.slice(splitIndex).trim();

    if (rest.length === 0) {
      // Header with empty content -> Title Only
      isTitleOnly = true;
      html = head;
    } else {
      html = `${head}\n<div class="theContents">\n${rest}\n</div>`;
    }
  } else {
    // No header, wrap everything if there is content
    if (html.trim().length > 0) {
      html = `<div class="theContents">\n${html}\n</div>`;
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

  const sectionClass = (isTitleOnly ? ' class="title-slide"' : '') + (slide.hasText ? ' class="has-text"' : '');
  const chapterAttr = slide.chapterTitle ? ` data-chapter-title="${slide.chapterTitle.replace(/"/g, '&quot;')}"` : '';

  return `      <section${sectionClass}${chapterAttr}>
${html}
      </section>`;
}

// Generate complete HTML file
function generateHTML(filePath, agendaPath, outputDir) {
  const slides = parseMarkdownFile(filePath);
  const fileName = path.basename(filePath);
  const tocData = generateTOCFromFile(filePath, agendaPath);

  // Check if we found an agenda file (hasAgenda logic moved inside or passed down)
  // Actually, hasAgenda logic was checking if agendaPath exists.
  // We can just check agendaPath argument validity.
  const hasAgenda = agendaPath && fs.existsSync(agendaPath);

  const parentPage = hasAgenda ? getParentPage(fileName, agendaPath) : '';
  const nextChapter = hasAgenda ? getNextChapter(fileName, agendaPath) : '';
  const title = slides[0].title || path.basename(filePath, '.md');

  const slidesHTML = slides.map(generateSlideHTML).join('\n\n');

  // Generate CSS link using outputDir
  let slideCssLink = '';
  if (SLIDE_CSS_REL) {
    const cssAbsPath = path.isAbsolute(SLIDE_CSS_REL)
      ? SLIDE_CSS_REL
      : path.join(ROOT_DIR, SLIDE_CSS_REL);

    // Always use outputDir relative to cssAbsPath
    // outputDir is absolute (resolved in main)
    const relHref = path.relative(outputDir, cssAbsPath);
    slideCssLink = `\n  <link rel="stylesheet" href="${relHref}?v=${Date.now()}">`;
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
  const fontImports = STYLE_CONFIG.style.global.fontImport.map(url => `\n  <link rel="stylesheet" href="${url}"/>`).join('');

  // Determine markmap depth
  // If we have an agenda (multi-page project chapter), prioritize chapter_markmap_depth
  // Otherwise (single page project), use standard markmap_depth
  const markmapDepth = hasAgenda
    ? (STYLE_CONFIG.chapter_markmap_depth || STYLE_CONFIG.markmap_depth || 1)
    : (STYLE_CONFIG.markmap_depth || 1);

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${title}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/dist/reset.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/dist/reveal.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/dist/theme/sky.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github.css">${openPropsLink}${fontImports}${slideCssLink}
  <script>
    // Suppress specific SVG errors from Markmap/D3 to avoid noise in PDF generation
    (function() {
      const originalConsoleError = console.error;
      console.error = function(...args) {
        if (args.length > 0 && typeof args[0] === 'string' && 
            (args[0].includes('attribute transform') || args[0].includes('translate(NaN'))) {
          return;
        }
        originalConsoleError.apply(console, args);
      };

      // Monkey patch D3 if available to prevent NaN attributes
      window.addEventListener('load', function() {
        if (window.d3 && window.d3.selection) {
          const originalAttr = window.d3.selection.prototype.attr;
          window.d3.selection.prototype.attr = function(name, value) {
            if (name === 'transform' && typeof value === 'string' && (value.includes('NaN') || value.includes('undefined'))) {
              return this;
            }
            return originalAttr.apply(this, arguments);
          };
        }
      });
    })();
  </script>
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
      font-weight: 700;
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
    #toc-container h1.main-title {
      font-family: var(--main-title-font-family, var(--global-font-family, inherit));
      text-align: var(--main-title-align, center);
      color: var(--main-title-color, #333);
      font-size: var(--main-title-font-size, 80px);
      margin: 0;
      padding: var(--main-title-padding, 40px 0 20px 0);
      flex-shrink: 0; /* Title should not shrink */
      text-transform: none;
      font-weight: var(--main-title-font-weight, 700);
      text-shadow: -1px 0 #000, 1px 0 #000, 0 -1px #000, 0 1px #000;
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
  --global-font-family: ${STYLE_CONFIG.style.global.fontFamily};
  --title-font-family: ${STYLE_CONFIG.style.title.font_family || 'inherit'};
  --title-font-weight: ${STYLE_CONFIG.style.title.font_weight || '700'};
  --title-font-size: ${STYLE_CONFIG.style.title.font_size};
  --title-color: ${STYLE_CONFIG.style.title.font_color};
  --title-align: ${STYLE_CONFIG.style.title.align};
  --title-padding: ${STYLE_CONFIG.style.title.outer_padding};
  --main-title-font-family: ${STYLE_CONFIG.style.main_title.fontFamily || 'inherit'};
  --main-title-font-weight: ${STYLE_CONFIG.style.main_title.font_weight || '700'};
  --main-title-font-size: ${STYLE_CONFIG.style.main_title.font_size};
  --main-title-color: ${STYLE_CONFIG.style.main_title.font_color};
  --main-title-align: ${STYLE_CONFIG.style.main_title.align};
  --main-title-padding: ${STYLE_CONFIG.style.main_title.outer_padding};
  --outline-title-font-family: ${STYLE_CONFIG.style.outline_title.font_family || 'inherit'};
  --outline-title-font-weight: ${STYLE_CONFIG.style.outline_title.font_weight || '700'};
  --outline-title-font-size: ${STYLE_CONFIG.style.outline_title.font_size};
  --outline-title-color: ${STYLE_CONFIG.style.outline_title.font_color};
  --outline-title-align: ${STYLE_CONFIG.style.outline_title.align};
  --outline-title-padding: ${STYLE_CONFIG.style.outline_title.outer_padding};
  --outline-title-sub-font-family: ${STYLE_CONFIG.style.outline_title_sub.font_family || 'inherit'};
  --outline-title-sub-font-weight: ${STYLE_CONFIG.style.outline_title_sub.font_weight || '500'};
  --outline-title-sub-font-size: ${STYLE_CONFIG.style.outline_title_sub.font_size};
  --outline-title-sub-color: ${STYLE_CONFIG.style.outline_title_sub.font_color};
  --outline-title-sub-align: ${STYLE_CONFIG.style.outline_title_sub.align};
  --outline-title-sub-padding: ${STYLE_CONFIG.style.outline_title_sub.outer_padding};
  --content-font-family: ${STYLE_CONFIG.style.theContents.fontFamily || 'inherit'};
  --content-font-size: ${STYLE_CONFIG.style.theContents.font_size};
  --content-color: ${STYLE_CONFIG.style.theContents.font_color};
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
    <h1 class="main-title">Examples for MarkdownGraph</h1>
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

    var isPrintMode = /print-pdf/gi.test(window.location.search);

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
    let observer; // Define observer at top level

    function applyDynamicStyles() {
      const config = window.slideConfig;
      if (!config) return;

      // 1. Apply Title Styles - REMOVED (Migrated to CSS)
      
      const allSlides = document.querySelectorAll('.reveal .slides section');
      // No dynamic title styling anymore

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
        const titleEl = currentSlide.querySelector('h1, h2');
        if (titleEl) {
          titleSizePx = parseFloat(window.getComputedStyle(titleEl).fontSize);
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

        // Check if it fits at max
        // We compare slide scrollHeight with slide clientHeight to detect overflow
        if (currentSlide.scrollHeight <= currentSlide.clientHeight) {
           bestFit = maxFontSize;
        } else {
           // Binary search
           for (let i = 0; i < 10; i++) { // 10 iterations is enough precision
              const mid = (low + high) / 2;
              content.style.fontSize = mid + 'px';
              // Check if slide overflows
              if (currentSlide.scrollHeight <= currentSlide.clientHeight) {
                 bestFit = mid;
                 low = mid;
              } else {
                 high = mid;
              }
           }
        }

        // Unobserve to prevent infinite loop (style change -> resize -> observer -> style change)
        if (observer) observer.unobserve(content);

        // Apply best fit
        content.style.fontSize = bestFit + 'px';
        
        // If even at min size it overflows, enable scroll (already auto in CSS)
        if (bestFit <= minFontSize + 1) {
           content.style.fontSize = minFontSize + 'px';
        }

        // Re-observe after a delay to skip the immediate resize caused by our change
        if (observer) {
          requestAnimationFrame(() => {
            observer.observe(content);
          });
        }
      });
    }

    Reveal.on('ready', () => {
      applyDynamicStyles();
      
      // Use ResizeObserver to handle dynamic content changes (images loading, etc.)
      observer = new ResizeObserver(entries => {
        // Debounce or throttle could be added if needed, but for now direct call
        // Check if the resized element is the current slide
        const currentSlide = Reveal.getCurrentSlide();
        if (currentSlide && entries.some(entry => entry.target === currentSlide || currentSlide.contains(entry.target))) {
           applyDynamicStyles();
        }
      });

      // Observe all content containers to detect changes (e.g. images/diagrams loading)
      document.querySelectorAll('.reveal .slides section .theContents').forEach(content => {
        observer.observe(content);
      });
    });
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
          try {
            markmapInstance = window.markmap.Markmap.create('#toc-mindmap', {
              autoFit: true,
              fitRatio: 0.95,
              spacingHorizontal: 80,
              spacingVertical: 12,
              paddingX: 40,
              initialExpandLevel: ${markmapDepth}
            }, tocData);
            markmapInitialized = true;
            
            // Ensure fit after layout settles
            if (!isPrintMode) {
                requestAnimationFrame(function () {
                  if (markmapInstance && markmapInstance.fit) {
                    try { markmapInstance.fit(); } catch(e) {}
                  }
                });
                setTimeout(function(){ 
                  if (markmapInstance && markmapInstance.fit) {
                    try { markmapInstance.fit(); } catch(e) {}
                  }
                }, 50);
            } else {
                // In print mode, wait longer and fit once
                setTimeout(function(){ 
                   if (markmapInstance && markmapInstance.fit) {
                      try { markmapInstance.fit(); } catch(e) {}
                   }
                }, 1000);
            }
          } catch(e) {
            console.warn('Markmap initialization failed:', e);
          }
        } else if (markmapInitialized && markmapInstance && markmapInstance.fit) {
          // Re-fit when returning to the first slide
          if (!isPrintMode) {
              requestAnimationFrame(function () { 
                try { markmapInstance.fit(); } catch(e) {} 
              });
          }
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
      if (isPrintMode) return; // Skip resize logic in print mode

      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function() {
        if (markmapInstance && markmapInstance.fit) {
          try { markmapInstance.fit(); } catch(e) {}
        }
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
  font-weight: 700;
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
            })(() => window.markmap,null,${JSON.stringify(markmapData)},{ initialExpandLevel: ${STYLE_CONFIG.markmap_depth || 1} })</script>
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
// Main execution
function main() {
  loadConfig();
  const args = process.argv.slice(2);

  // Parse arguments
  let inputDir, outputDir, projectDir;

  if (args.length === 0) {
    // Default: Projects/LlmAndVibeCoding relative to repository root
    // We try to read config.yml manually here for project name default?
    // For simplicity, fallback to 'LlmAndVibeCoding' as before, but check structure.
    projectDir = path.join(ROOT_DIR, 'Projects', 'LlmAndVibeCoding');
  } else if (args.length === 1) {
    const argPath = path.resolve(args[0]);
    const baseName = path.basename(argPath);

    if (baseName === 'markdown' || baseName === 'slide') {
      projectDir = path.dirname(argPath);
    } else {
      projectDir = argPath;
    }
  } else {
    // inputDir/outputDir explicit mode
    inputDir = path.resolve(args[0]);
    outputDir = path.resolve(args[1]);
    projectDir = path.dirname(inputDir);
  }

  // Determine inputDir if not set explicitly
  if (!inputDir) {
    const markdownDir = path.join(projectDir, 'markdown');
    if (fs.existsSync(markdownDir)) {
      inputDir = markdownDir;
    } else {
      inputDir = projectDir;
    }
  }

  // Determine outputDir if not set explicitly
  if (!outputDir) {
    outputDir = path.join(projectDir, 'slide');
  }

  console.log(`Project directory: ${projectDir}`);
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
    if (fs.existsSync(imgOutputDir)) {
      fs.rmSync(imgOutputDir, { recursive: true, force: true });
    }
    fs.cpSync(imgInputDir, imgOutputDir, { recursive: true });
    console.log('✅ Images copied successfully');
  }

  // Copy Custom CSS if defined
  if (SLIDE_CSS_REL) {
    const cssAbsPath = path.isAbsolute(SLIDE_CSS_REL) ? SLIDE_CSS_REL : path.join(ROOT_DIR, SLIDE_CSS_REL);
    if (fs.existsSync(cssAbsPath)) {
      const cssOutputDir = path.join(outputDir, 'css');
      if (!fs.existsSync(cssOutputDir)) fs.mkdirSync(cssOutputDir, { recursive: true });

      const cssDestPath = path.join(cssOutputDir, 'custom.css');
      fs.copyFileSync(cssAbsPath, cssDestPath);
      console.log(`✅ Copied custom CSS to ${cssDestPath}`);

      // Update SLIDE_CSS_REL to point to the new location (Absolute path so generateHTML calculates relative path correctly)
      SLIDE_CSS_REL = cssDestPath;
    } else {
      console.warn(`⚠️ Warning: Custom CSS file not found: ${cssAbsPath}`);
    }
  }

  // Copy Local Fonts if defined in fontImport
  if (STYLE_CONFIG.style.global.fontImport && STYLE_CONFIG.style.global.fontImport.length > 0) {
    const newImports = [];
    const cssOutputDir = path.join(outputDir, 'css');
    let cssDirCreated = fs.existsSync(cssOutputDir);

    STYLE_CONFIG.style.global.fontImport.forEach(importPath => {
      if (importPath.match(/^https?:/i) || importPath.startsWith('//')) {
        newImports.push(importPath);
      } else {
        // Treat as local file relative to ROOT_DIR
        const fontAbsPath = path.resolve(ROOT_DIR, importPath);
        if (fs.existsSync(fontAbsPath)) {
          if (!cssDirCreated) {
            fs.mkdirSync(cssOutputDir, { recursive: true });
            cssDirCreated = true;
          }
          const fontFileName = path.basename(fontAbsPath);
          const fontDestPath = path.join(cssOutputDir, fontFileName);

          fs.copyFileSync(fontAbsPath, fontDestPath);
          console.log(`✅ Copied local font/css to ${fontDestPath}`);

          // Update import to be relative to the HTML file (css/filename)
          newImports.push(`css/${fontFileName}`);
        } else {
          console.warn(`⚠️ Warning: Local font file not found: ${fontAbsPath}`);
          newImports.push(importPath);
        }
      }
    });
    STYLE_CONFIG.style.global.fontImport = newImports;
  }

  // Check for AGENDA.md to determine mode (Chapter vs Single Page)
  const agendaPath = path.join(inputDir, 'AGENDA.md');
  const hasAgenda = fs.existsSync(agendaPath);

  let filesToProcess = [];

  if (hasAgenda) {
    // --- Chapter Mode ---
    console.log('\n📖 Chapter Mode detected (AGENDA.md found)');
    const files = fs.readdirSync(inputDir)
      .filter(f => f.endsWith('.md') && f !== 'AGENDA.md')
      .sort();
    filesToProcess = files;
  } else {
    // --- Single Page Mode ---
    console.log('\n📄 Single Page Mode detected (No AGENDA.md)');
    const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.md'));

    // Priority Logic
    let targetFile = null;
    const projectName = path.basename(projectDir);

    // 1. Same name as Project folder
    const projectFile = files.find(f => f.toLowerCase() === (projectName + '.md').toLowerCase());

    // 2. README.md
    const readmeFile = files.find(f => f.toLowerCase() === 'readme.md');

    // 4. Non-special char selection (candidates)
    const normalFiles = files.filter(f => /^[a-zA-Z0-9가-힣]/.test(f));

    if (projectFile) {
      console.log(`Selected by Priority 1 (Project Name): ${projectFile}`);
      targetFile = projectFile;
    } else if (readmeFile) {
      console.log(`Selected by Priority 2 (README.md): ${readmeFile}`);
      targetFile = readmeFile;
    } else if (files.length === 1) {
      // 3. Only one file
      console.log(`Selected by Priority 3 (Single File): ${files[0]}`);
      targetFile = files[0];
    } else if (normalFiles.length >= 1) {
      // 4. Filter out special chars
      if (normalFiles.length === 1) {
        console.log(`Selected by Priority 4 (Single Normal File): ${normalFiles[0]}`);
        targetFile = normalFiles[0];
      } else {
        console.error(`❌ Error: Multiple candidate files found: ${normalFiles.join(', ')}`);
        console.error(`Please rename one to ${projectName}.md or leave only one main file.`);
        process.exit(1);
      }
    } else {
      console.error(`❌ Error: No suitable markdown file found in ${inputDir}`);
      process.exit(1);
    }

    filesToProcess = [targetFile];
  }

  console.log(`\nFound ${filesToProcess.length} markdown file(s) to process`);

  filesToProcess.forEach(file => {
    const inputPath = path.join(inputDir, file);
    // For single page mode, we might want to name it index.html or preserve name?
    // Current logic: preserve name.
    const outputPath = path.join(outputDir, file.replace('.md', '.html'));

    console.log(`Processing: ${file}`);
    const html = generateHTML(inputPath, hasAgenda ? agendaPath : null, outputDir);
    fs.writeFileSync(outputPath, html, 'utf-8');
    console.log(`  → Generated: ${outputPath}`);
  });

  if (hasAgenda) {
    console.log('\nGenerating index.html...');
    const indexHTML = generateIndexHTML(agendaPath, projectDir);
    const indexPath = path.join(outputDir, 'index.html');
    fs.writeFileSync(indexPath, indexHTML, 'utf-8');
    console.log(`✅ Generated: ${indexPath}`);
  } else {
    console.log('\nSkipping index.html generation (Single Page Mode)');
    // If we want the single page to be accessible as index.html?
    // Maybe copy the generated html to index.html as well for convenience?
    // Not explicitly requested, but good for "Single Page" experience.
    // However, user just asked to "recognize" and "work". Let's stick to generating the file.
    // But wait, if I open "slide/", I expect an index.html.
    // If I generated MarkdownGraph.html, opening slide/ shows directory listing or nothing.
    // Let's helpfuly copy it to index.html if it's Single Page Mode and only 1 file.
    /*
    if (filesToProcess.length === 1) {
        const src = path.join(outputDir, filesToProcess[0].replace('.md', '.html'));
        const dest = path.join(outputDir, 'index.html');
        fs.copyFileSync(src, dest);
        console.log(`  → Also copied to: ${dest}`);
    }
    */
    // I will disable auto-copy for now to stick strictly to requirements unless user complains.
  }

  console.log('\n✅ All files processed!');
}

main();
