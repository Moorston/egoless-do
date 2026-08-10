#!/usr/bin/env node
// Fix no-raw-number-in-text warnings by wrapping numeric expressions with String()
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

// Get all files with no-raw-number warnings
const lintOutput = execSync('pnpm run lint 2>&1', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });

// Parse warnings
const warnings = [];
const lines = lintOutput.split('\n');
let currentFile = '';

for (const line of lines) {
  // Check for file path
  const fileMatch = line.match(/^mobile:lint: (D:\\[^\s]+)/);
  if (fileMatch) {
    currentFile = fileMatch[1];
    continue;
  }

  // Check for no-raw-number warning
  const warningMatch = line.match(/(\d+):(\d+)\s+warning\s+Raw numeric expression (.+?) used as <Text> child/);
  if (warningMatch && currentFile) {
    warnings.push({
      file: currentFile,
      line: parseInt(warningMatch[1]),
      col: parseInt(warningMatch[2]),
      expression: warningMatch[3],
    });
  }
}

console.log(`Found ${warnings.length} no-raw-number warnings`);

// Group by file
const fileWarnings = new Map();
for (const w of warnings) {
  if (!fileWarnings.has(w.file)) {
    fileWarnings.set(w.file, []);
  }
  fileWarnings.get(w.file).push(w);
}

// Fix each file
for (const [file, fileWarns] of fileWarnings) {
  try {
    let content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    // Process warnings in reverse order to avoid line number shifts
    const sortedWarns = fileWarns.sort((a, b) => b.line - a.line);

    for (const warn of sortedWarns) {
      const lineIdx = warn.line - 1;
      const line = lines[lineIdx];

      if (!line) continue;

      // Try to find and wrap the numeric expression
      // This is a heuristic approach - we look for the expression pattern
      const expr = warn.expression;

      // Common patterns to fix:
      // 1. Simple variable: {someVar} -> {String(someVar)}
      // 2. Math expression: {Math.round(x)} -> {String(Math.round(x))}
      // 3. Property access: {item.count} -> {String(item.count)}
      // 4. Binary expression: {a + b} -> {String(a + b)}
      // 5. Nullish coalescing: {x ?? 0} -> {String(x ?? 0)}

      // Try to find the expression in the line and wrap it
      // We need to be careful about JSX context

      // Pattern: expression inside JSX curly braces
      const patterns = [
        // {expression}
        { regex: new RegExp(`\\{\\s*${escapeRegex(expr)}\\s*\\}`), replacement: `{String(${expr})}` },
        // {expression, more}
        { regex: new RegExp(`\\{\\s*${escapeRegex(expr)}\\s*,`), replacement: `{String(${expr}),` },
      ];

      let fixed = false;
      for (const pattern of patterns) {
        if (pattern.regex.test(line)) {
          lines[lineIdx] = line.replace(pattern.regex, pattern.replacement);
          fixed = true;
          break;
        }
      }

      if (!fixed) {
        console.log(`  Could not auto-fix: ${file}:${warn.line} - ${expr}`);
      }
    }

    content = lines.join('\n');
    writeFileSync(file, content, 'utf-8');
    console.log(`Fixed ${fileWarns.length} warnings in ${file}`);
  } catch (err) {
    console.error(`Error processing ${file}:`, err.message);
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
