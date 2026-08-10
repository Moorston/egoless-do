import { readFileSync } from 'fs';

const input = readFileSync(0, 'utf8');
const lines = input.split('\n');

let currentFile = '';
const counts = {};

for (const line of lines) {
  if (line.includes('mobile:lint: D:') && line.includes('src')) {
    const idx = line.indexOf('apps');
    if (idx !== -1) {
      currentFile = line.substring(idx).split(/\s{2,}/)[0].trim();
    }
  }
  if (line.includes('no-unused-vars') && currentFile) {
    counts[currentFile] = (counts[currentFile] || 0) + 1;
  }
}

const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
console.log('Count\tFile');
for (const [file, count] of sorted) {
  console.log(`${count}\t${file}`);
}
console.log(`\nTotal: ${sorted.reduce((s, [, c]) => s + c, 0)}`);
