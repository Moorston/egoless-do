const fs = require('fs');
const os = require('os');
const tmp = os.tmpdir();
const d = JSON.parse(fs.readFileSync(tmp + '\\lint_errors.json', 'utf8'));
const errors = {};
for (const f of d) {
  for (const m of f.messages) {
    if (m.severity === 2) {
      const k = m.ruleId || 'null';
      if (!errors[k]) errors[k] = [];
      errors[k].push(f.filePath.replace(/.*egoless-do/, '') + ':' + m.line + ':' + m.column);
    }
  }
}
Object.entries(errors).forEach(([k, v]) => {
  console.log(k + ' (' + v.length + '):');
  v.forEach(s => console.log('  ' + s));
});
