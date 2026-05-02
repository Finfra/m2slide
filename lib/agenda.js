'use strict';

const fs = require('fs');
const path = require('path');

function getSubsections(fileName, agendaPath) {
  try {
    if (!agendaPath || !fs.existsSync(agendaPath)) return [];
    const content = fs.readFileSync(agendaPath, 'utf-8');
    const lines = content.split('\n');
    // Issue50: !? allows both ## [title](path) and ## ![title](path) patterns
    const mainPattern = new RegExp(`## !?\\[(.+?)\\]\\(\\.\/${fileName}\\)`);
    let foundMainSection = false;
    const subsections = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (mainPattern.test(line)) { foundMainSection = true; continue; }
      if (foundMainSection) {
        if (line.match(/^## !?\[/)) break;
        const subMatch = line.match(/^### \[(.+?)\]\((.+?)\)$/);
        if (subMatch) {
          subsections.push({ title: subMatch[1], htmlFile: path.basename(subMatch[2], '.md') + '.html' });
        }
      }
    }
    return subsections;
  } catch (_) { return []; }
}

function getParentPage(fileName, agendaPath) {
  try {
    if (!agendaPath || !fs.existsSync(agendaPath)) return 'index.html';
    const content = fs.readFileSync(agendaPath, 'utf-8');
    const lines = content.split('\n');
    const subPattern = new RegExp(`### \\[(.+?)\\]\\(\\.\/${fileName}\\)`);

    for (let i = 0; i < lines.length; i++) {
      if (subPattern.test(lines[i])) {
        for (let j = i - 1; j >= 0; j--) {
          // Issue50: also match hidden parent ## ![title](path)
          const parentMatch = lines[j].match(/^## !?\[(.+?)\]\((.+?)\)$/);
          if (parentMatch) return path.basename(parentMatch[2], '.md') + '.html';
        }
      }
    }
    return 'index.html';
  } catch (_) { return 'index.html'; }
}

function getNextChapter(fileName, agendaPath) {
  try {
    if (!agendaPath || !fs.existsSync(agendaPath)) return 'index.html';
    const content = fs.readFileSync(agendaPath, 'utf-8');
    const lines = content.split('\n');
    const chapters = [];
    for (const line of lines) {
      // Issue50: !? matches both visible and hidden entries for navigation
      const mainMatch = line.match(/^## !?\[(.+?)\]\((.+?)\)$/);
      if (mainMatch) { chapters.push(path.basename(mainMatch[2], '.md') + '.html'); continue; }
      const subMatch = line.match(/^### !?\[(.+?)\]\((.+?)\)$/);
      if (subMatch) chapters.push(path.basename(subMatch[2], '.md') + '.html');
    }
    const currentHtml = path.basename(fileName, '.md') + '.html';
    const idx = chapters.indexOf(currentHtml);
    return (idx !== -1 && idx < chapters.length - 1) ? chapters[idx + 1] : 'index.html';
  } catch (_) { return 'index.html'; }
}

// Parse AGENDA.md to generate markmap structure
function parseAgenda(agendaPath) {
  const content = fs.readFileSync(agendaPath, 'utf-8');
  const lines = content.split('\n');
  const root = { content: '', children: [] };
  let currentSection = null;

  for (const line of lines) {
    // Issue50: ## ![Title](path) — build but EXCLUDE from TOC markmap
    if (line.match(/^## !\[(.+?)\]\((.+?)\)$/)) { currentSection = null; continue; }

    const mainMatch = line.match(/^## \[(.+?)\]\((.+?)\)$/);
    if (mainMatch) {
      currentSection = {
        content: `<a href="${path.basename(mainMatch[2], '.md') + '.html'}">${mainMatch[1]}</a>`,
        children: []
      };
      root.children.push(currentSection);
      continue;
    }

    // Issue50: hidden subsection — skip TOC
    if (line.match(/^### !\[(.+?)\]\((.+?)\)$/)) continue;

    const subMatch = line.match(/^### \[(.+?)\]\((.+?)\)$/);
    if (subMatch && currentSection) {
      currentSection.children.push({
        content: `<a href="${path.basename(subMatch[2], '.md') + '.html'}">${subMatch[1]}</a>`,
        children: []
      });
    }
  }
  return root;
}

module.exports = { parseAgenda, getSubsections, getParentPage, getNextChapter };
