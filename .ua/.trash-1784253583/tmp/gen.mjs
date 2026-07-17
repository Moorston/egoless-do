// Generator for batches 61-65: builds nodes + edges with hand-curated metadata.
import { readFileSync, writeFileSync } from 'fs';

const ROOT = 'D:/MyProject/2026/egoless-do';
const results = {};
const importData = {};
const META = {}; // META[path] = {s,t,c}
const batches = JSON.parse(readFileSync(`${ROOT}/.ua/intermediate/batches.json`,'utf8'));
for (const i of [61,62,63,64,65]) {
  results[i] = JSON.parse(readFileSync(`${ROOT}/.ua/tmp/ua-file-extract-results-${i}.json`,'utf8'));
  const b = batches.batches.find(b=>b.batchIndex===i);
  importData[i] = b.batchImportData;
  Object.assign(META, JSON.parse(readFileSync(`${ROOT}/.ua/tmp/meta-batch${i}.json`,'utf8')));
}

// Function/class metadata. Key = `${path}::${nodeName}` (Swift overloads use `application_<startLine>`).
const FMETA = {};
const reg = (path, name, meta) => FMETA[`${path}::${name}`] = meta;

// Batch 63 Kotlin MainActivity
reg('apps/mobile/android/app/src/main/java/com/egolessdo/app/MainActivity.kt','onCreate',{s:'设置 AppTheme 并在 super.onCreate 中确保闪屏背景色正确。',t:['android','lifecycle','setup'],c:'simple'});
reg('apps/mobile/android/app/src/main/java/com/egolessdo/app/MainActivity.kt','createReactActivityDelegate',{s:'创建支持 New Architecture 的 ReactActivityDelegateWrapper。',t:['android','react-native','delegate'],c:'simple'});
reg('apps/mobile/android/app/src/main/java/com/egolessdo/app/MainActivity.kt','invokeDefaultOnBackPressed',{s:'按 Android S 版本调整返回按钮行为（切后台而非关闭 Activity）。',t:['android','navigation','back'],c:'moderate'});
reg('apps/mobile/android/app/src/main/java/com/egolessdo/app/MainActivity.kt','MainActivity',{s:'Android 主 Activity：管理主题、组件名、delegate 与返回按钮行为。',t:['android','react-activity','entry-point'],c:'moderate',isClass:true});

// Batch 63 Kotlin MainApplication
reg('apps/mobile/android/app/src/main/java/com/egolessdo/app/MainApplication.kt','onCreate',{s:'加载 React Native、配置 New Architecture releaseLevel 并通知生命周期。',t:['android','lifecycle','setup'],c:'simple'});
reg('apps/mobile/android/app/src/main/java/com/egolessdo/app/MainApplication.kt','onConfigurationChanged',{s:'转发配置变更（暗色模式、语言）到 ApplicationLifecycleDispatcher。',t:['android','lifecycle','config'],c:'simple'});
reg('apps/mobile/android/app/src/main/java/com/egolessdo/app/MainApplication.kt','MainApplication',{s:'Android Application 类：配置 React 宿主包、JS 入口与生命周期分发。',t:['android','react-application','entry-point'],c:'moderate',isClass:true});

// Batch 64 Swift AppDelegate (overloads keyed by startLine)
reg('apps/mobile/ios/app/AppDelegate.swift','application',{s:'应用启动完成处理，初始化 React Native 工厂并启动 main 模块。',t:['ios','lifecycle','setup'],c:'moderate'});
reg('apps/mobile/ios/app/AppDelegate.swift','application_12',{s:'应用启动完成处理，初始化 React Native 工厂并启动 main 模块。',t:['ios','lifecycle','setup'],c:'moderate'});
reg('apps/mobile/ios/app/AppDelegate.swift','application_36',{s:'处理 URL Scheme 打开请求，委托给 RCTLinkingManager。',t:['ios','linking','url'],c:'simple'});
reg('apps/mobile/ios/app/AppDelegate.swift','application_45',{s:'处理 Universal Links 继续活动请求。',t:['ios','linking','universal-link'],c:'simple'});
reg('apps/mobile/ios/app/AppDelegate.swift','bundleURL',{s:'按 DEBUG/RELEASE 返回正确的 JS bundle 路径。',t:['ios','react-native','bundle'],c:'simple'});
reg('apps/mobile/ios/app/AppDelegate.swift','AppDelegate',{s:'iOS 应用委托：初始化 React Native 工厂，处理启动/URL/Universal Links。',t:['ios','app-delegate','entry-point'],c:'moderate',isClass:true});
reg('apps/mobile/ios/app/AppDelegate.swift','ReactNativeDelegate',{s:'React Native 工厂委托：配置 dev/prod 环境 sourceURL/bundleURL。',t:['ios','react-native','delegate'],c:'moderate',isClass:true});

// Batch 64 syncMocks
reg('apps/mobile/src/__tests__/helpers/syncMocks.ts','createMockDb',{s:'创建模拟数据库句柄（getAllAsync/runAsync 等），返回空结果。',t:['test','mock','database'],c:'simple'});
reg('apps/mobile/src/__tests__/helpers/syncMocks.ts','createMockRowMappers',{s:'创建 identity 行映射器集合，跳过真实 buildRowToEntity 流水线。',t:['test','mock','mapper'],c:'moderate'});
reg('apps/mobile/src/__tests__/helpers/syncMocks.ts','createMockSyncProgressStore',{s:'创建模拟同步进度 store，用于同步测试。',t:['test','mock','sync'],c:'simple'});
reg('apps/mobile/src/__tests__/helpers/syncMocks.ts','createMockStateStore',{s:'创建模拟状态 store，提供测试用状态读写。',t:['test','mock','store'],c:'simple'});
reg('apps/mobile/src/__tests__/helpers/syncMocks.ts','createMockApiSyncPullEntity',{s:'创建模拟 API 同步 pull 实体工厂。',t:['test','mock','sync'],c:'simple'});
reg('apps/mobile/src/__tests__/helpers/syncMocks.ts','createAllSyncMocks',{s:'聚合工厂，一次性生成全部同步相关 mock。',t:['test','mock','sync'],c:'simple'});

// Batch 65 useConversation hook
reg('apps/mobile/src/features/practice/hooks/useConversation.ts','useConversation',{s:'管理本地 AI 对话列表，提供 addMessage/getConversation/createConversation 操作。',t:['hook','practice','conversation'],c:'moderate'});

// Batch 65 renderHook test helper
reg('apps/mobile/src/features/reflections/hooks/useSearchHistory.test.ts','renderHook',{s:'最小 renderHook 实现：通过 react-test-renderer 暴露 result/unmount。',t:['test','helper','render-hook'],c:'moderate'});

// Batch 65 TickStore class (defined inside test)
reg('apps/mobile/src/features/global-pulse/hooks/useGlobalTick.test.ts','TickStore',{s:'测试用 TickStore 类：定时 tick 与 subscribe/getSnapshot 接口。',t:['test','global-pulse','tick'],c:'moderate',isClass:true});

function complexityFromLines(n){ if(n<50) return 'simple'; if(n<=200) return 'moderate'; return 'complex'; }
function nameFromPath(p){ return p.split('/').pop(); }
function fileType(cat){ if(cat==='docs') return 'document'; if(cat==='config') return 'config'; return 'file'; }

const allNodes = {61:[],62:[],63:[],64:[],65:[]};
const allEdges = {61:[],62:[],63:[],64:[],65:[]};
const addNode = (b,n)=>allNodes[b].push(n);
const addEdge = (b,e)=>allEdges[b].push(e);

const flen = (fn)=> fn.endLine - fn.startLine + 1;

// Track duplicated names within a file to disambiguate (e.g., Swift overloads)
for (const b of [61,62,63,64,65]) {
  const res = results[b].results;
  const impMap = importData[b];

  for (const file of res) {
    const path = file.path;
    const cat = file.fileCategory;
    const type = fileType(cat);
    const meta = META[path];
    if (!meta){ console.error(`MISSING META batch ${b}: ${path}`); continue; }
    const complexity = meta.c || complexityFromLines(file.nonEmptyLines||0);

    addNode(b, { id:`file:${path}`, type, name:nameFromPath(path), filePath:path, summary:meta.s, tags:meta.t, complexity });

    // Imports edges (1:1)
    const imps = impMap[path] || [];
    for (const target of imps){
      addEdge(b, { source:`file:${path}`, target:`file:${target}`, type:'imports', direction:'forward', weight:0.7 });
    }
    // tested_by: test file imports a production file
    const isTest = /\.test\.(ts|tsx|js)$/.test(path);
    if (isTest && imps.length){
      for (const target of imps){
        if (!/\.test\./.test(target)){
          addEdge(b, { source:`file:${path}`, target:`file:${target}`, type:'tested_by', direction:'forward', weight:0.5 });
        }
      }
    }

    // Function / class nodes
    const fns = file.functions || [];
    const cls = file.classes || [];
    const seenNames = {};
    for (const fn of fns){
      let nodeName = fn.name;
      if (seenNames[nodeName]) nodeName = `${fn.name}_${fn.startLine}`;
      seenNames[nodeName] = true;
      const significant = flen(fn) >= 10 || (file.exports||[]).some(e=>e.name===fn.name && e.line===fn.startLine);
      if (!significant) continue;
      const fmeta = FMETA[`${path}::${nodeName}`];
      if (!fmeta) continue;
      const id = `function:${path}:${nodeName}`;
      addNode(b, { id, type:'function', name:nodeName, filePath:path, lineRange:[fn.startLine, fn.endLine], summary:fmeta.s, tags:fmeta.t, complexity:fmeta.c });
      addEdge(b, { source:`file:${path}`, target:id, type:'contains', direction:'forward', weight:1.0 });
      if ((file.exports||[]).some(e=>e.name===fn.name)){
        addEdge(b, { source:`file:${path}`, target:id, type:'exports', direction:'forward', weight:0.8 });
      }
    }
    for (const cl of cls){
      const significant = (cl.methods && cl.methods.length >= 2) || (cl.endLine - cl.startLine + 1) >= 20;
      if (!significant) continue;
      const fmeta = FMETA[`${path}::${cl.name}`];
      if (!fmeta) continue;
      const id = `class:${path}:${cl.name}`;
      addNode(b, { id, type:'class', name:cl.name, filePath:path, lineRange:[cl.startLine, cl.endLine], summary:fmeta.s, tags:fmeta.t, complexity:fmeta.c });
      addEdge(b, { source:`file:${path}`, target:id, type:'contains', direction:'forward', weight:1.0 });
      if ((file.exports||[]).some(e=>e.name===cl.name)){
        addEdge(b, { source:`file:${path}`, target:id, type:'exports', direction:'forward', weight:0.8 });
      }
    }
  }
}

let totalN = 0, totalE = 0;
for (const b of [61,62,63,64,65]) {
  const nodes = allNodes[b];
  const edges = allEdges[b];
  totalN += nodes.length; totalE += edges.length;
  writeFileSync(`${ROOT}/.ua/intermediate/batch-${b}.json`, JSON.stringify({ nodes, edges }, null, 2));
  console.log(`Batch ${b}: ${nodes.length} nodes, ${edges.length} edges -> batch-${b}.json`);
}
console.log(`TOTAL: ${totalN} nodes, ${totalE} edges`);
