const fs = require('fs');
const os = require('os');
const tmp = os.tmpdir();
const d = JSON.parse(fs.readFileSync(tmp + '\\lint_final.json', 'utf8'));
const cats = {};
for (const f of d) {
  for (const m of f.messages) {
    const k = m.ruleId || 'unknown';
    cats[k] = (cats[k] || 0) + 1;
  }
}
Object.entries(cats).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
  console.log(String(v).padStart(5) + ' ' + k);
});
console.log('---TOTAL:', Object.values(cats).reduce((a, b) => a + b, 0));
