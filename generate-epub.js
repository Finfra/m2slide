#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Check if mermaid-cli is installed
function isMermaidCLIAvailable() {
  try {
    execSync('mmdc --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Create a simple placeholder PNG image (1x1 transparent pixel)
function createPlaceholderImage(outputPath) {
  // Base64 encoded 1x1 transparent PNG
  const base64PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const buffer = Buffer.from(base64PNG, 'base64');
  fs.writeFileSync(outputPath, buffer);
}

// Create a placeholder SVG for Mermaid diagrams
function createPlaceholderSVG(outputPath, diagramCode) {
  const preview = diagramCode.substring(0, 100).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="600" height="300" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f9f9f9" stroke="#ccc" stroke-width="2" stroke-dasharray="5,5"/>
  <text x="50%" y="40%" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#666">
    [다이어그램]
  </text>
  <text x="50%" y="55%" text-anchor="middle" font-family="monospace" font-size="12" fill="#999">
    Mermaid CLI가 필요합니다
  </text>
  <text x="50%" y="70%" text-anchor="middle" font-family="monospace" font-size="10" fill="#aaa">
    npm install -g @mermaid-js/mermaid-cli
  </text>
</svg>`;
  fs.writeFileSync(outputPath, svg, 'utf-8');
}

// Convert markdown to XHTML for EPUB
function markdownToXHTML(markdown, mermaidDiagrams) {
  let html = [];
  let lines = markdown.split('\n');
  let inList = false;
  let inOrderedList = false;
  let inCodeBlock = false;
  let inTable = false;
  let inBlockquote = false;
  let codeLines = [];
  let tableLines = [];
  let blockquoteLines = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Skip HTML div tags (they cause XHTML validation errors)
    if (line.match(/^<div/i) || line.match(/^<\/div>/i)) {
      continue;
    }

    // Process mermaid diagrams
    if (line.match(/^```mermaid/)) {
      inCodeBlock = true;
      const diagramLines = [];
      // Collect mermaid code
      while (i < lines.length && !lines[++i].match(/^```/)) {
        diagramLines.push(lines[i]);
      }
      inCodeBlock = false;

      // Store diagram for later conversion
      const diagramIndex = mermaidDiagrams.length;
      mermaidDiagrams.push(diagramLines.join('\n'));

      // Reference the image that will be generated (SVG format)
      html.push(`<p><img src="img/mermaid/diagram-${diagramIndex}.svg" alt="Mermaid Diagram ${diagramIndex}" style="max-width: 100%;"/></p>`);
      continue;
    }

    // Code blocks
    if (line.match(/^```/)) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLines = [];
        continue;
      } else {
        html.push('<pre><code>' + escapeHTML(codeLines.join('\n')) + '</code></pre>');
        inCodeBlock = false;
        continue;
      }
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Blockquote
    if (line.match(/^>/)) {
      if (!inBlockquote) {
        inBlockquote = true;
        blockquoteLines = [];
      }
      blockquoteLines.push(line.replace(/^> ?/, ''));
      continue;
    } else if (inBlockquote) {
      html.push('<blockquote>');
      html.push('<p>' + blockquoteLines.map(l => processInline(l)).join('<br/>') + '</p>');
      html.push('</blockquote>');
      inBlockquote = false;
      blockquoteLines = [];
    }

    // Tables
    if (line.match(/^\|/)) {
      if (!inTable) {
        inTable = true;
        tableLines = [];
      }
      tableLines.push(line);
      continue;
    } else if (inTable) {
      // Process accumulated table
      html.push(convertTableToHTML(tableLines));
      inTable = false;
      tableLines = [];
    }

    // Headers
    if (line.match(/^### /)) {
      html.push('<h3>' + processInline(line.replace(/^### /, '')) + '</h3>');
      continue;
    }
    if (line.match(/^## /)) {
      html.push('<h2>' + processInline(line.replace(/^## /, '')) + '</h2>');
      continue;
    }
    if (line.match(/^# /)) {
      html.push('<h1>' + processInline(line.replace(/^# /, '')) + '</h1>');
      continue;
    }

    // Unordered list
    if (line.match(/^- /)) {
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push('<li>' + processInline(line.replace(/^- /, '')) + '</li>');
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
      html.push('<li>' + processInline(line.replace(/^\d+\. /, '')) + '</li>');
      continue;
    } else if (inOrderedList && !line.match(/^\d+\. /)) {
      html.push('</ol>');
      inOrderedList = false;
    }

    // Empty line
    if (line.trim() === '') {
      html.push('');
      continue;
    }

    // Regular paragraph
    html.push('<p>' + processInline(line) + '</p>');
  }

  // Close any open elements
  if (inList) html.push('</ul>');
  if (inOrderedList) html.push('</ol>');
  if (inTable) html.push(convertTableToHTML(tableLines));
  if (inBlockquote) {
    html.push('<blockquote>');
    html.push('<p>' + blockquoteLines.map(l => processInline(l)).join('<br/>') + '</p>');
    html.push('</blockquote>');
  }

  return html.join('\n');
}

// Convert markdown table to HTML
function convertTableToHTML(tableLines) {
  if (tableLines.length < 2) return '';

  let html = ['<table>'];

  for (let i = 0; i < tableLines.length; i++) {
    const line = tableLines[i];

    // Skip separator line (e.g., |---|---|)
    if (line.match(/^\|[\s\-:|]+\|$/)) {
      continue;
    }

    // Split by | and remove empty first/last
    const cells = line.split('|').filter((cell, idx, arr) =>
      idx !== 0 && idx !== arr.length - 1
    ).map(cell => cell.trim());

    if (i === 0) {
      // Header row
      html.push('<thead><tr>');
      cells.forEach(cell => {
        html.push('<th>' + processInline(cell) + '</th>');
      });
      html.push('</tr></thead>');
      html.push('<tbody>');
    } else if (i > 1) {
      // Data rows (skip separator at index 1)
      html.push('<tr>');
      cells.forEach(cell => {
        html.push('<td>' + processInline(cell) + '</td>');
      });
      html.push('</tr>');
    }
  }

  html.push('</tbody></table>');
  return html.join('\n');
}

// Process inline elements
function processInline(text) {
  // Process images FIRST (before HTML escaping)
  // ![alt text](image-path)
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
    return `<img src="${src}" alt="${alt}" style="max-width: 100%;"/>`;
  });

  // Process links (after images, before HTML escaping)
  // [link text](url)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
    return `<a href="${url}">${linkText}</a>`;
  });

  // Escape HTML entities (but preserve our tags)
  const htmlPlaceholders = [];
  text = text.replace(/<(img|a)[^>]+>|<\/a>/g, (match) => {
    const placeholder = `___HTML_PLACEHOLDER_${htmlPlaceholders.length}___`;
    htmlPlaceholders.push(match);
    return placeholder;
  });

  text = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Restore HTML tags
  htmlPlaceholders.forEach((html, index) => {
    text = text.replace(`___HTML_PLACEHOLDER_${index}___`, html);
  });

  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

  return text;
}

// Escape HTML special characters
function escapeHTML(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Generate EPUB structure
function generateEPUB(projectDir) {
  const markdownDir = path.join(projectDir, 'markdown');
  const outputFile = path.join(projectDir, path.basename(projectDir) + '.epub');
  const tempDir = path.join(projectDir, '.epub-temp');

  console.log(`\nGenerating EPUB for ${path.basename(projectDir)}...`);

  // Create temp directory structure
  const metaInfDir = path.join(tempDir, 'META-INF');
  const oebpsDir = path.join(tempDir, 'OEBPS');

  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  fs.mkdirSync(tempDir, { recursive: true });
  fs.mkdirSync(metaInfDir, { recursive: true });
  fs.mkdirSync(oebpsDir, { recursive: true });

  // Copy images if they exist
  const imgInputDir = path.join(markdownDir, 'img');
  const imgOutputDir = path.join(oebpsDir, 'img');
  if (fs.existsSync(imgInputDir)) {
    console.log('Copying images...');
    fs.cpSync(imgInputDir, imgOutputDir, { recursive: true });
    console.log(`  Copied images from ${imgInputDir}`);
  }

  // Create mermaid images directory
  const mermaidImgDir = path.join(oebpsDir, 'img', 'mermaid');
  fs.mkdirSync(mermaidImgDir, { recursive: true });

  // Check if mermaid-cli is available
  const hasMermaidCLI = isMermaidCLIAvailable();
  if (hasMermaidCLI) {
    console.log('✓ Mermaid CLI detected - diagrams will be converted to images');
  } else {
    console.log('⚠️  Mermaid CLI not found - install with: npm install -g @mermaid-js/mermaid-cli');
  }

  // Read AGENDA.md for title
  const agendaPath = path.join(markdownDir, 'AGENDA.md');
  let bookTitle = path.basename(projectDir);
  if (fs.existsSync(agendaPath)) {
    const agendaContent = fs.readFileSync(agendaPath, 'utf-8');
    const titleMatch = agendaContent.match(/^# (.+)$/m);
    if (titleMatch) {
      bookTitle = titleMatch[1];
    }
  }

  // Read all markdown files
  const mdFiles = fs.readdirSync(markdownDir)
    .filter(f => f.endsWith('.md') && f !== 'AGENDA.md')
    .sort();

  console.log(`Found ${mdFiles.length} markdown files`);

  // Generate chapters
  const chapters = [];
  const allMermaidDiagrams = []; // Track all diagrams across chapters

  mdFiles.forEach((file, index) => {
    const filePath = path.join(markdownDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const chapterNum = index + 1;
    const chapterFileName = `chapter${chapterNum}.xhtml`;

    // Extract title
    const titleMatch = content.match(/^# (.+)$/m);
    const chapterTitle = titleMatch ? titleMatch[1] : `Chapter ${chapterNum}`;

    // Remove slide separator and convert to XHTML
    const cleanContent = content.replace(/\n---\n/g, '\n\n');
    const chapterMermaidDiagrams = [];
    const xhtml = markdownToXHTML(cleanContent, chapterMermaidDiagrams);

    // Add chapter diagrams to global list with offset
    const diagramOffset = allMermaidDiagrams.length;
    allMermaidDiagrams.push(...chapterMermaidDiagrams);

    // Generate XHTML file
    const xhtmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>${escapeHTML(chapterTitle)}</title>
  <meta charset="UTF-8"/>
  <style>
    body {
      font-family: 'Noto Serif CJK KR', 'Noto Serif KR', 'Batang', 'AppleMyungjo', serif;
      line-height: 1.8;
      margin: 1em;
      color: #333;
    }
    h1 { font-size: 2em; margin-top: 1em; font-weight: 700; }
    h2 { font-size: 1.5em; margin-top: 0.8em; font-weight: 700; }
    h3 { font-size: 1.2em; margin-top: 0.6em; font-weight: 700; }
    p { margin: 0.5em 0; }
    ul, ol { margin: 0.5em 0; padding-left: 2em; }
    li { margin: 0.3em 0; }
    code {
      font-family: 'Consolas', 'Monaco', monospace;
      background: #f4f4f4;
      padding: 0.2em 0.4em;
      border-radius: 3px;
    }
    pre {
      background: #f4f4f4;
      padding: 1em;
      overflow-x: auto;
      border-radius: 5px;
      line-height: 1.4;
    }
    pre code { background: none; padding: 0; }
    strong { font-weight: 700; }
    blockquote {
      margin: 1em 0;
      padding: 0.5em 1em;
      border-left: 4px solid #ccc;
      background: #f9f9f9;
      font-style: italic;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1em 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 0.5em;
      text-align: left;
    }
    th {
      background: #f4f4f4;
      font-weight: 700;
    }
    tr:nth-child(even) {
      background: #f9f9f9;
    }
    .diagram-placeholder {
      border: 2px dashed #ccc;
      padding: 1em;
      margin: 1em 0;
      background: #f9f9f9;
      text-align: center;
      color: #666;
    }
  </style>
</head>
<body>
${xhtml}
</body>
</html>`;

    fs.writeFileSync(path.join(oebpsDir, chapterFileName), xhtmlContent, 'utf-8');

    chapters.push({
      id: `chapter${chapterNum}`,
      fileName: chapterFileName,
      title: chapterTitle
    });

    console.log(`  Generated: ${chapterFileName} - ${chapterTitle}`);
  });

  // Convert Mermaid diagrams to images
  if (allMermaidDiagrams.length > 0) {
    console.log(`\nProcessing ${allMermaidDiagrams.length} Mermaid diagrams...`);

    if (hasMermaidCLI) {
      const tempMermaidDir = path.join(tempDir, 'mermaid-temp');
      fs.mkdirSync(tempMermaidDir, { recursive: true });

      allMermaidDiagrams.forEach((diagramCode, index) => {
        try {
          // Write mermaid code to temp file
          const mmdFile = path.join(tempMermaidDir, `diagram-${index}.mmd`);
          const svgFile = path.join(mermaidImgDir, `diagram-${index}.svg`);

          fs.writeFileSync(mmdFile, diagramCode, 'utf-8');

          // Convert to SVG using mermaid-cli with system Chrome
          execSync(`mmdc -i "${mmdFile}" -o "${svgFile}"`, {
            stdio: 'ignore',
            env: {
              ...process.env,
              PUPPETEER_EXECUTABLE_PATH: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
            }
          });

          console.log(`  ✓ Converted diagram ${index}`);
        } catch (error) {
          console.error(`  ✗ Failed to convert diagram ${index}:`, error.message);
          // Create placeholder SVG if conversion fails
          createPlaceholderSVG(path.join(mermaidImgDir, `diagram-${index}.svg`), diagramCode);
        }
      });

      // Cleanup temp mermaid files
      fs.rmSync(tempMermaidDir, { recursive: true, force: true });
    } else {
      console.log('  Creating placeholder SVG images (mermaid-cli not available)');
      allMermaidDiagrams.forEach((diagramCode, index) => {
        createPlaceholderSVG(path.join(mermaidImgDir, `diagram-${index}.svg`), diagramCode);
      });
    }
  }

  // Generate mimetype
  fs.writeFileSync(path.join(tempDir, 'mimetype'), 'application/epub+zip', 'utf-8');

  // Generate container.xml
  const containerXML = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  fs.writeFileSync(path.join(metaInfDir, 'container.xml'), containerXML, 'utf-8');

  // Collect all image files for manifest
  const imageFiles = [];
  const imgDir = path.join(oebpsDir, 'img');

  function collectImages(dir, baseDir = '') {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = baseDir ? `${baseDir}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        collectImages(fullPath, relativePath);
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        let mediaType = 'application/octet-stream';

        if (ext === '.png') mediaType = 'image/png';
        else if (ext === '.jpg' || ext === '.jpeg') mediaType = 'image/jpeg';
        else if (ext === '.gif') mediaType = 'image/gif';
        else if (ext === '.svg') mediaType = 'image/svg+xml';
        else if (ext === '.webp') mediaType = 'image/webp';

        imageFiles.push({
          id: `img-${relativePath.replace(/[\/\.]/g, '-')}`,
          href: `img/${relativePath}`,
          mediaType: mediaType
        });
      }
    }
  }

  collectImages(imgDir);

  // Generate content.opf
  const chapterItems = chapters.map(ch =>
    `    <item id="${ch.id}" href="${ch.fileName}" media-type="application/xhtml+xml"/>`
  ).join('\n');

  const imageItems = imageFiles.map(img =>
    `    <item id="${img.id}" href="${img.href}" media-type="${img.mediaType}"/>`
  ).join('\n');

  const manifestItems = [chapterItems, imageItems].filter(x => x).join('\n');

  const spineItems = chapters.map(ch =>
    `    <itemref idref="${ch.id}"/>`
  ).join('\n');

  const contentOPF = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapeHTML(bookTitle)}</dc:title>
    <dc:language>ko</dc:language>
    <dc:identifier id="bookid">urn:uuid:${Date.now()}</dc:identifier>
    <meta property="dcterms:modified">${new Date().toISOString().split('.')[0]}Z</meta>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
${manifestItems}
  </manifest>
  <spine toc="ncx">
${spineItems}
  </spine>
</package>`;
  fs.writeFileSync(path.join(oebpsDir, 'content.opf'), contentOPF, 'utf-8');

  // Generate toc.ncx
  const navPoints = chapters.map((ch, index) =>
    `    <navPoint id="${ch.id}" playOrder="${index + 1}">
      <navLabel><text>${escapeHTML(ch.title)}</text></navLabel>
      <content src="${ch.fileName}"/>
    </navPoint>`
  ).join('\n');

  const tocNCX = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${Date.now()}"/>
    <meta name="dtb:depth" content="1"/>
  </head>
  <docTitle>
    <text>${escapeHTML(bookTitle)}</text>
  </docTitle>
  <navMap>
${navPoints}
  </navMap>
</ncx>`;
  fs.writeFileSync(path.join(oebpsDir, 'toc.ncx'), tocNCX, 'utf-8');

  // Create EPUB (ZIP file with specific structure)
  console.log('\nCreating EPUB file...');

  // Remove existing EPUB if exists
  if (fs.existsSync(outputFile)) {
    fs.unlinkSync(outputFile);
  }

  try {
    // EPUB requires mimetype to be first and uncompressed
    process.chdir(tempDir);
    execSync('zip -0Xq ../temp.epub mimetype', { stdio: 'inherit' });
    execSync('zip -Xr9Dq ../temp.epub META-INF OEBPS', { stdio: 'inherit' });

    // Move to final location
    fs.renameSync(path.join(projectDir, 'temp.epub'), outputFile);

    console.log(`✅ EPUB created: ${outputFile}`);
  } catch (error) {
    console.error('❌ Error creating EPUB:', error.message);
    process.exit(1);
  } finally {
    // Cleanup temp directory
    process.chdir(projectDir);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// Main execution
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node generate-epub.js <project_dir>');
    process.exit(1);
  }

  const projectDir = path.resolve(args[0]);

  if (!fs.existsSync(projectDir)) {
    console.error(`❌ Error: Project directory does not exist: ${projectDir}`);
    process.exit(1);
  }

  const markdownDir = path.join(projectDir, 'markdown');
  if (!fs.existsSync(markdownDir)) {
    console.error(`❌ Error: Markdown directory does not exist: ${markdownDir}`);
    process.exit(1);
  }

  generateEPUB(projectDir);
}

main();
