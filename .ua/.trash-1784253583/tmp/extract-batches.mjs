import { readFileSync, writeFileSync } from 'fs';

const batches = JSON.parse(readFileSync('D:/MyProject/2026/egoless-do/.ua/intermediate/batches.json', 'utf8'));
const targets = [61, 62, 63, 64, 65];

for (const idx of targets) {
  const batch = batches.batches.find(b => b.batchIndex === idx);
  if (!batch) {
    console.error(`Batch ${idx} not found`);
    continue;
  }
  const input = {
    projectRoot: 'D:/MyProject/2026/egoless-do',
    batchFiles: batch.files,
    batchImportData: batch.batchImportData,
  };
  const outPath = `D:/MyProject/2026/egoless-do/.ua/tmp/ua-file-analyzer-input-${idx}.json`;
  writeFileSync(outPath, JSON.stringify(input, null, 2));
  console.log(`Wrote batch ${idx}: ${batch.files.length} files -> ${outPath}`);
}
