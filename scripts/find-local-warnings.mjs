import { execSync } from 'child_process';

const lintOut = execSync('pnpm run lint 2>&1', { encoding: 'utf8', cwd: 'D:/MyProject/2026/egoless-do' });
const lines = lintOut.split('\n');
let currentFile = '';
const results = [];

for (const line of lines) {
  if (line.includes('mobile:lint: D:') && line.includes('src')) {
    const idx = line.indexOf('apps');
    if (idx !== -1) currentFile = line.substring(idx).split(/\s{2,}/)[0].trim();
  }
  if (line.includes('no-unused-vars') && !line.includes('Allowed unused args') && currentFile) {
    const m = line.match(/(\d+):\d+.*'(\w+)'\s+is\s+(defined|assigned)/);
    if (m) results.push({ file: currentFile, line: parseInt(m[1]), name: m[2], kind: m[3] });
  }
}

for (const r of results) {
  console.log(`${r.file}:${r.line}  ${r.name} (${r.kind})`);
}
console.log(`\nTotal: ${results.length}`);
