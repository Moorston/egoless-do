import { readFileSync, writeFileSync } from 'fs';

const module = await import('./meta-all.mjs');
const M = module.META;
M['apps/mobile/android/app/src/main/java/com/egolessdo/app/MainActivity.kt'] = {s:'Android 主 Activity（Kotlin，约 61 行）：配置主题、组件名、React delegate 与返回按钮行为。',t:['entry-point','android','kotlin','react'],c:'moderate'};
M['apps/mobile/android/app/src/main/java/com/egolessdo/app/MainApplication.kt'] = {s:'Android Application（Kotlin，约 56 行）：配置 React 宿主包、JS 入口与生命周期分发。',t:['entry-point','android','kotlin','react'],c:'moderate'};
console.log('total entries:', Object.keys(M).length);

// Rewrite file deterministically from the M object to avoid encoding issues
let out = '// Shared metadata definitions for all batches\nexport const META = {};\nconst m = META;\n';
for (const [k, v] of Object.entries(M)) {
  const escK = k.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const escS = v.s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  out += `m['${escK}']={s:'${escS}',t:${JSON.stringify(v.t)},c:'${v.c}'};\n`;
}
writeFileSync('./meta-all.mjs', out);
console.log('rewrote meta-all.mjs');
