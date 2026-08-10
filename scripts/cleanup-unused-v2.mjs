#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const lintOut = execSync('pnpm run lint 2>&1', { encoding: 'utf8', cwd: 'D:/MyProject/2026/egoless-do' });
const lines = lintOut.split('\n');
let currentFile = '';
const fileWarnings = {};

for (const line of lines) {
  if (line.includes('mobile:lint: D:') && line.includes('src')) {
    const idx = line.indexOf('apps');
    if (idx !== -1) currentFile = line.substring(idx).split(/\s{2,}/)[0].trim();
  }
  if (line.includes('no-unused-vars') && currentFile) {
    const m = line.match(/'([^']+)'\s+is\s+(defined|assigned)/);
    if (m) {
      if (!fileWarnings[currentFile]) fileWarnings[currentFile] = [];
      fileWarnings[currentFile].push(m[1]);
    }
  }
}

let totalRemoved = 0;
const filesModified = [];

for (const [file, unusedNames] of Object.entries(fileWarnings)) {
  const filePath = `D:/MyProject/2026/egoless-do/${file}`;
  let content;
  try { content = readFileSync(filePath, 'utf8'); } catch { continue; }
  const originalContent = content;
  let modified = content;

  for (const name of unusedNames) {
    // Strategy 1: Remove from multi-line or single-line named imports
    // Match: import { ... name ... } from '...'
    // Also match: import React, { ... name ... } from '...'
    const importRegex = /^(.*import\s+(?:React,\s*)?\{)([^}]+)(\}\s*from\s*['"][^'"]+['"];?)$/gm;

    modified = modified.replace(importRegex, (match, prefix, imports, suffix) => {
      // Split by comma, trim, filter
      const importList = imports.split(',').map(s => s.trim()).filter(Boolean);
      const filtered = importList.filter(imp => {
        // Handle "type Foo" and "type { Foo }" imports
        const cleanName = imp.replace(/^type\s+/, '').trim();
        return cleanName !== name;
      });

      if (filtered.length === importList.length) return match; // name not found
      if (filtered.length === 0) return ''; // entire import line removed
      return `${prefix}${filtered.join(', ')}${suffix}`;
    });

    // Strategy 2: Remove entire import line if it's a single default/namespace import
    // e.g., import name from '...'
    const defaultImportRegex = new RegExp(`^\\s*import\\s+${name}\\s+from\\s+['"][^'"]+['"];?\\s*$`, 'gm');
    modified = modified.replace(defaultImportRegex, '');

    // Strategy 3: Remove type-only imports
    // e.g., import type { name } from '...'
    const typeImportRegex = new RegExp(`^\\s*import\\s+type\\s+\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s+['"][^'"]+['"];?\\s*$`, 'gm');
    modified = modified.replace(typeImportRegex, (match) => {
      // Rebuild without the unused name
      const m2 = match.match(/^(.*import\s+type\s*\{)([^}]+)(\}.*$)/);
      if (!m2) return match;
      const importList = m2[2].split(',').map(s => s.trim()).filter(Boolean);
      const filtered = importList.filter(imp => {
        const cleanName = imp.replace(/^type\s+/, '').trim();
        return cleanName !== name;
      });
      if (filtered.length === importList.length) return match;
      if (filtered.length === 0) return '';
      return `${m2[1]}${filtered.join(', ')}${m2[3]}`;
    });
  }

  // Clean up excessive blank lines
  modified = modified.replace(/\n{3,}/g, '\n\n');

  if (modified !== originalContent) {
    writeFileSync(filePath, modified, 'utf8');
    totalRemoved++;
    filesModified.push(file);
  }
}

console.log(`Modified ${totalRemoved} files`);
filesModified.forEach(f => console.log(`  ${f}`));
