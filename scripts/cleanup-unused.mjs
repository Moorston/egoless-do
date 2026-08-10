#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

// Run lint and capture output
const lintOut = execSync('pnpm run lint 2>&1', { encoding: 'utf8', cwd: 'D:/MyProject/2026/egoless-do' });

// Parse unused vars by file
const lines = lintOut.split('\n');
let currentFile = '';
const fileWarnings = {};

for (const line of lines) {
  if (line.includes('mobile:lint: D:') && line.includes('src')) {
    const idx = line.indexOf('apps');
    if (idx !== -1) {
      currentFile = line.substring(idx).split(/\s{2,}/)[0].trim();
    }
  }
  if (line.includes('no-unused-vars') && currentFile) {
    const m = line.match(/'([^']+)'\s+is\s+(defined|assigned)/);
    if (m) {
      if (!fileWarnings[currentFile]) fileWarnings[currentFile] = [];
      fileWarnings[currentFile].push(m[1]);
    }
  }
}

// Process each file
let totalRemoved = 0;
const filesModified = [];
const errors = [];

for (const [file, unusedNames] of Object.entries(fileWarnings)) {
  const filePath = `D:/MyProject/2026/egoless-do/${file}`;
  let content;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch { continue; }

  const originalContent = content;
  let modified = content;

  for (const name of unusedNames) {
    // Strategy: Find import lines that contain this name, then rebuild the import

    // Split into lines and process each
    const fileLines = modified.split('\n');
    const newLines = [];

    for (let i = 0; i < fileLines.length; i++) {
      const line = fileLines[i];

      // Check if this line is an import that contains our unused name
      const importMatch = line.match(/^(\s*import\s*\{)([^}]+)(\}\s*from\s*['"].*['"];?\s*)$/);
      if (importMatch && importMatch[2].includes(name)) {
        const prefix = importMatch[1]; // "import {"
        const imports = importMatch[2]; // "name1, name2, name3"
        const suffix = importMatch[3]; // "} from '...'"

        // Split imports, trim, filter out the unused name
        const importList = imports.split(',').map(s => s.trim()).filter(Boolean);
        const filtered = importList.filter(imp => {
          // Handle "type Foo" imports
          const cleanName = imp.replace(/^type\s+/, '').trim();
          return cleanName !== name;
        });

        if (filtered.length === 0) {
          // All imports removed - skip this line entirely
          continue;
        }

        // Rebuild the import line
        const newLine = `${prefix}${filtered.join(', ')}${suffix}`;
        newLines.push(newLine);
      } else {
        newLines.push(line);
      }
    }

    modified = newLines.join('\n');
  }

  // Clean up empty import lines and excessive blank lines
  modified = modified.replace(/^\s*import\s*\{\s*\}\s*from\s*['"].*['"];?\s*\n/gm, '');
  modified = modified.replace(/\n{3,}/g, '\n\n');

  if (modified !== originalContent) {
    writeFileSync(filePath, modified, 'utf8');
    totalRemoved++;
    filesModified.push(file);
  }
}

console.log(`\nModified ${totalRemoved} files:`);
filesModified.forEach(f => console.log(`  ${f}`));
console.log(`\nTotal warnings processed: ${Object.values(fileWarnings).flat().length}`);
if (errors.length) {
  console.log('\nErrors:');
  errors.forEach(e => console.log(`  ${e}`));
}
