#!/usr/bin/env node
const fs = require('fs');
const idx = parseInt(process.argv[2]);
const batches = JSON.parse(fs.readFileSync('.ua/intermediate/batches.json', 'utf8'));
const b = batches.batches.find(x => x.batchIndex === idx);
const dump = JSON.parse(fs.readFileSync(`.ua/tmp/batch-dump-${idx}.json`, 'utf8'));
const byPath = {};
for (const f of dump) byPath[f.path] = f;
const K = require(`./knowledge-${idx}.json`);

function nodeType(f) {
  if (f.fileCategory === 'config') return 'config';
  if (f.fileCategory === 'docs') return 'document';
  if (f.fileCategory === 'infra') return 'service';
  if (f.fileCategory === 'data') return 'table';
  if (f.fileCategory === 'script') return 'file';
  return 'file';
}

const nodes = [];
const edges = [];
const fileIds = {};

for (const f of b.files) {
  const k = K[f.path] || { summary: f.path, tags: ['auto'], complexity: 'simple' };
  const type = nodeType(f);
  const id = type + ':' + f.path;
  fileIds[f.path] = id;
  nodes.push({ id, type, name: f.path.split('/').pop(), filePath: f.path, summary: k.summary, tags: k.tags, complexity: k.complexity });
}

const funcNodeId = {};
function fnTags(k, comp) {
  // derive 3-5 meaningful tags from parent file tags + role
  const role = 'function';
  const base = (k.tags || []).filter(t => t !== 'function' && t !== 'class').slice(0, 4);
  const tags = [...base];
  if (!tags.includes(role)) tags.push(role);
  if (comp === 'complex' && !tags.includes('complex-logic')) tags.push('complex-logic');
  while (tags.length < 3) tags.push('logic');
  return tags.slice(0, 5);
}
for (const f of b.files) {
  const ext = byPath[f.path];
  if (!ext) continue;
  const exportedSet = new Set(ext.exports || []);
  const k = K[f.path] || { summary: f.path, tags: ['auto'], complexity: 'simple' };
  for (const fn of ext.funcs || []) {
    const lines = fn.end - fn.start + 1;
    const sig = lines >= 10 || (exportedSet.has(fn.name) && lines >= 3);
    if (!sig) continue;
    const nid = `function:${f.path}:${fn.name}`;
    funcNodeId[nid] = true;
    const fsummary = (K._funcs && K._funcs[`${f.path}:${fn.name}`]) || `函数 ${fn.name}(${(fn.params||[]).join(',')})`;
    const comp = lines>=40?'complex':lines>=15?'moderate':'simple';
    nodes.push({ id: nid, type: 'function', name: fn.name, filePath: f.path, lineRange: [fn.start, fn.end], summary: fsummary, tags: fnTags(k, comp), complexity: comp });
    edges.push({ source: fileIds[f.path], target: nid, type: 'contains', direction: 'forward', weight: 1.0 });
    if (exportedSet.has(fn.name)) edges.push({ source: fileIds[f.path], target: nid, type: 'exports', direction: 'forward', weight: 0.8 });
  }
  for (const cl of ext.classes || []) {
    const meths = cl.methods || [];
    if (meths.length >= 2 || exportedSet.has(cl.name)) {
      const nid = `class:${f.path}:${cl.name}`;
      funcNodeId[nid] = true;
      const csummary = (K._classes && K._classes[`${f.path}:${cl.name}`]) || `类 ${cl.name}，含 ${meths.length} 个方法`;
      const ctags = (k.tags||[]).filter(t=>t!=='class').slice(0,4);
      if(!ctags.includes('class')) ctags.push('class');
      while(ctags.length<3) ctags.push('logic');
      nodes.push({ id: nid, type: 'class', name: cl.name, filePath: f.path, lineRange: [0,0], summary: csummary, tags: ctags.slice(0,5), complexity: 'moderate' });
      edges.push({ source: fileIds[f.path], target: nid, type: 'contains', direction: 'forward', weight: 1.0 });
      if (exportedSet.has(cl.name)) edges.push({ source: fileIds[f.path], target: nid, type: 'exports', direction: 'forward', weight: 0.8 });
    }
  }
}

// import edges 1:1 + tested_by for test->prod
for (const f of b.files) {
  const imps = b.batchImportData[f.path] || [];
  for (const t of imps) {
    const tgt = fileIds[t];
    if (!tgt) continue;
    edges.push({ source: fileIds[f.path], target: tgt, type: 'imports', direction: 'forward', weight: 0.7 });
    if (/\.test\.|\.spec\.|__tests__/.test(f.path)) {
      const fbase = f.path.split('/').pop().replace(/\.test\.ts$/,'');
      const tbase = t.split('/').pop().replace(/\.ts$/,'');
      if (tbase === fbase) {
        edges.push({ source: tgt, target: fileIds[f.path], type: 'tested_by', direction: 'forward', weight: 0.5 });
      }
    }
  }
}

// calls edges intra-file (caller->callee when both are created nodes)
const extract = JSON.parse(fs.readFileSync(`.ua/tmp/ua-file-extract-results-${idx}.json`, 'utf8'));
for (const ef of extract.results) {
  if (!ef.callGraph) continue;
  for (const cg of ef.callGraph) {
    if (!cg.caller || !cg.callee) continue;
    const calleeName = cg.callee.split('.')[0];
    const srcId = `function:${ef.path}:${cg.caller}`;
    const tgtId = `function:${ef.path}:${calleeName}`;
    if (funcNodeId[srcId] && funcNodeId[tgtId] && srcId !== tgtId) {
      edges.push({ source: srcId, target: tgtId, type: 'calls', direction: 'forward', weight: 0.8 });
    }
  }
}

// split logic
const nodeCount = nodes.length, edgeCount = edges.length;
const partBase = `.ua/intermediate/batch-${idx}`;
if (nodeCount <= 60 && edgeCount <= 120) {
  fs.writeFileSync(`${partBase}.json`, JSON.stringify({ nodes, edges }, null, 2));
  console.log(`Batch ${idx}: 1 part, ${nodeCount} nodes, ${edgeCount} edges`);
} else {
  const parts = Math.ceil(Math.max(nodeCount/60, edgeCount/120));
  const sortedFiles = [...b.files].sort((a,b)=>a.path.localeCompare(b.path));
  const chunk = Math.ceil(sortedFiles.length / parts);
  const groups = [];
  for (let i=0;i<sortedFiles.length;i+=chunk) groups.push(sortedFiles.slice(i,i+chunk).map(f=>f.path));
  for (let pi=0; pi<groups.length; pi++){
    const g = groups[pi];
    const fileSet = new Set(g);
    const gNodes = nodes.filter(n=>!n.filePath||fileSet.has(n.filePath));
    const gNodeIds = new Set(gNodes.map(n=>n.id));
    const gEdges = edges.filter(e=>gNodeIds.has(e.source)||gNodeIds.has(e.target));
    fs.writeFileSync(`${partBase}-part-${pi+1}.json`, JSON.stringify({ nodes: gNodes, edges: gEdges }, null, 2));
    console.log(`Batch ${idx} part ${pi+1}: ${gNodes.length} nodes, ${gEdges.length} edges`);
  }
}
