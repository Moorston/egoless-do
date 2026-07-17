const fs = require('fs');
const path = require('path');
const idx = process.argv[2];
const batches = JSON.parse(fs.readFileSync('.ua/intermediate/batches.json', 'utf8'));
const b = batches.batches.find(x => x.batchIndex === parseInt(idx));
const extract = JSON.parse(fs.readFileSync(`.ua/tmp/ua-file-extract-results-${idx}.json`, 'utf8'));

// build a set of actual files (handle scanner path variants by basename)
const actualFiles = new Set();
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else actualFiles.add(p);
  }
}
walk('backend'); walk('infra'); walk('packages'); walk('scripts'); walk('openspec'); walk('patches');
walk('apps'); walk('docs');
const rootFiles = fs.readdirSync('.').filter(f => fs.statSync(f).isFile());

function resolve(rel) {
  // try as-is (POSIX separators use /)
  const norm = rel.replace(/\//g, path.sep);
  if (fs.existsSync(norm)) return norm;
  // fallback: match by basename
  const base = path.basename(norm);
  // search actualFiles
  for (const af of actualFiles) {
    if (path.basename(af) === base) return af;
  }
  return null;
}

const byPath = {};
for (const r of extract.results) byPath[r.path] = r;

const out = [];
for (const f of b.files) {
  const ext = byPath[f.path] || null;
  let content = '';
  let headerComments = [];
  let resolved = resolve(f.path);
  if (resolved) {
    try {
      const lines = fs.readFileSync(resolved, 'utf8').split('\n').slice(0, 40);
      // capture leading comment block (// or /* */)
      let collecting = true;
      for (const ln of lines) {
        const t = ln.trim();
        if (collecting && (t.startsWith('//') || t.startsWith('/*') || t.startsWith('*'))) {
          headerComments.push(t.replace(/^\/\/\s?/, '').replace(/^\/\*\s?/, '').replace(/^\*\s?/, ''));
        } else if (collecting && t === '') {
          continue;
        } else {
          collecting = false;
        }
      }
      content = lines.slice(0, 6).join('\n');
    } catch (e) {}
  }
  out.push({
    path: f.path,
    resolved,
    language: f.language,
    fileCategory: f.fileCategory,
    sizeLines: f.sizeLines,
    totalLines: ext ? ext.totalLines : null,
    nonEmpty: ext ? ext.nonEmptyLines : null,
    funcs: ext ? (ext.functions || []).map(x => ({ name: x.name, params: x.params, start: x.startLine, end: x.endLine })) : [],
    classes: ext ? (ext.classes || []).map(x => ({ name: x.name, methods: x.methods })) : [],
    exports: ext ? (ext.exports || []).map(x => x.name) : [],
    callGraph: ext ? (ext.callGraph || []).map(x => `${x.caller}->${x.callee}@${x.lineNumber}`) : [],
    imports: b.batchImportData[f.path] || [],
    headerComments: headerComments.slice(0, 12),
    firstLines: content,
  });
}
fs.writeFileSync(`.ua/tmp/batch-dump-${idx}.json`, JSON.stringify(out, null, 2));
console.log('Dumped batch', idx, 'files:', out.length, 'resolved:', out.filter(o => o.resolved).length);
