// Generate input JSON files for batches 31-35 from batches.json
const fs = require('fs');
const path = require('path');

const batchesPath = path.join(__dirname, '..', 'intermediate', 'batches.json');
const data = JSON.parse(fs.readFileSync(batchesPath, 'utf8'));
const targetIndices = [31, 32, 33, 34, 35];

const projectRoot = 'D:/MyProject/2026/egoless-do';
const tmpDir = path.join(projectRoot, '.ua', 'tmp');

for (const idx of targetIndices) {
  const batch = data.batches.find(b => b.batchIndex === idx);
  if (!batch) {
    console.error(`Batch ${idx} not found`);
    continue;
  }
  const input = {
    projectRoot,
    batchFiles: batch.files,
    batchImportData: batch.batchImportData,
  };
  const outPath = path.join(tmpDir, `ua-file-analyzer-input-${idx}.json`);
  fs.writeFileSync(outPath, JSON.stringify(input, null, 2));
  console.log(`Wrote ${outPath}`);
}
