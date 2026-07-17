// Generator: produces batch-61..65.json with nodes + edges.
import { readFileSync, writeFileSync } from 'fs';

const ROOT = 'D:/MyProject/2026/egoless-do';
const results = {};
for (const i of [61,62,63,64,65]) {
  results[i] = JSON.parse(readFileSync(`${ROOT}/.ua/tmp/ua-file-extract-results-${i}.json`,'utf8'));
}
const batches = JSON.parse(readFileSync(`${ROOT}/.ua/intermediate/batches.json`,'utf8'));
const importData = {};
for (const i of [61,62,63,64,65]) {
  const b = batches.batches.find(b=>b.batchIndex===i);
  importData[i] = b.batchImportData;
}

let nodeCount = 0, edgeCount = 0;

// Hand-curated metadata per file path -> {summary, tags, complexityOverride}
const META = {};
const r61 = results[61].results;
for (const f of r61) {
  const p = f.path;
  if (p.includes('07-12-fix-profile-screen-crash')) {
    if (p.endsWith('prd.md')) META[p]={summary:'修复 ProfileScreen 因 expo-image-picker 导入 createPermissionHook 报错的 PRD：记录目标、根因（Expo SDK 54 移除 createPermissionHook）、补丁修复方案与验收标准。',tags:['documentation','bugfix','expo','prd'],complexity:'simple'};
    else if (p.endsWith('task.json')) META[p]={summary:'fix-profile-screen-crash 任务元数据，标记为已完成 P2 任务。',tags:['configuration','task','trellis'],complexity:'simple'};
    else META[p]={summary:'fix-profile-screen-crash 任务的工作记录文件（check/implement）。',tags:['documentation','task-record','trellis'],complexity:'simple'};
  } else if (p.includes('07-12-pb-create-food-preset')) {
    if (p.endsWith('implement.jsonl')) META[p]={summary:'pb-create-food-preset 任务实现记录（含 PB 集合创建脚本）。',tags:['documentation','task-record','trellis'],complexity:'simple'};
    else META[p]={summary:'pb-create-food-preset 任务工作记录文件。',tags:['documentation','task-record','trellis'],complexity:'simple'};
  } else if (p.includes('07-12-sync-goerror')) {
    META[p]={summary:'sync-goerror 任务工作记录（同步错误分析）。',tags:['documentation','task-record','trellis'],complexity:'simple'};
  } else if (p.includes('07-13-analyze-token-expiry')) {
    if (p.endsWith('prd.md')) META[p]={summary:'分析 token 过期问题的 PRD：记录 token 刷新机制、过期导致的同步失败场景与分析结论。',tags:['documentation','auth','token','prd'],complexity:'simple'};
    else if (p.endsWith('task.json')) META[p]={summary:'analyze-token-expiry 任务元数据。',tags:['configuration','task','trellis'],complexity:'simple'};
    else META[p]={summary:'analyze-token-expiry 任务工作记录文件。',tags:['documentation','task-record','trellis'],complexity:'simple'};
  } else if (p.includes('07-13-analyze-vow-layout')) {
    if (p.endsWith('prd.md')) META[p]={summary:'分析 vow（发愿）布局问题的 PRD，记录布局异常现象与建议方案。',tags:['documentation','ui','vow','prd'],complexity:'simple'};
    else if (p.endsWith('task.json')) META[p]={summary:'analyze-vow-layout 任务元数据。',tags:['configuration','task','trellis'],complexity:'simple'};
    else META[p]={summary:'analyze-vow-layout 任务工作记录文件。',tags:['documentation','task-record','trellis'],complexity:'simple'};
  } else if (p.includes('07-13-fix-auth-issues')) {
    if (p.endsWith('prd.md')) META[p]={summary:'修复认证相关问题的 PRD，记录 auth 流程中的缺陷与修复方案。',tags:['documentation','auth','bugfix','prd'],complexity:'simple'};
    else if (p.endsWith('task.json')) META[p]={summary:'fix-auth-issues 任务元数据。',tags:['configuration','task','trellis'],complexity:'simple'};
    else META[p]={summary:'fix-auth-issues 任务工作记录文件。',tags:['documentation','task-record','trellis'],complexity:'simple'};
  } else if (p.includes('07-13-optimize-vision-edit')) {
    if (p.endsWith('prd.md')) META[p]={summary:'优化 vision（愿景）编辑体验的 PRD，记录交互问题与改进方案。',tags:['documentation','vision','optimization','prd'],complexity:'simple'};
    else if (p.endsWith('task.json')) META[p]={summary:'optimize-vision-edit 任务元数据。',tags:['configuration','task','trellis'],complexity:'simple'};
    else META[p]={summary:'optimize-vision-edit 任务工作记录文件。',tags:['documentation','task-record','trellis'],complexity:'simple'};
  } else if (p.includes('07-13-optimize-vow-edit')) {
    if (p.endsWith('prd.md')) META[p]={summary:'优化 vow 编辑体验的 PRD，记录编辑流程问题与改进方案。',tags:['documentation','vow','optimization','prd'],complexity:'moderate'};
    else if (p.endsWith('task.json')) META[p]={summary:'optimize-vow-edit 任务元数据。',tags:['configuration','task','trellis'],complexity:'simple'};
    else META[p]={summary:'optimize-vow-edit 任务工作记录文件。',tags:['documentation','task-record','trellis'],complexity:'simple'};
  }
}

writeFileSync(`${ROOT}/.ua/tmp/meta-cache.json`, JSON.stringify(META,null,2));
console.log('Meta entries batch 61:', Object.keys(META).length);
