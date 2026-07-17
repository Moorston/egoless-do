import { readFileSync, writeFileSync } from 'fs';

function appendEntries(batch, entries) {
  const path = `.ua/tmp/meta-batch${batch}.json`;
  const text = readFileSync(path, 'utf8');
  // Strip trailing whitespace/newline then closing }
  const trimmed = text.trim();
  if (!trimmed.endsWith('}')) throw new Error('bad json ending for batch ' + batch);
  const inner = trimmed.slice(0, -1); // remove final }
  // ensure trailing comma if there are existing entries
  let base = inner.trimEnd();
  if (!base.endsWith(',')) base += ',';
  const newLines = Object.entries(entries).map(([k, v]) => {
    return `\n  ${JSON.stringify(k)}: ${JSON.stringify(v)}`;
  }).join(',');
  writeFileSync(path, base + newLines + '\n}\n');
  console.log(`batch ${batch}: appended ${Object.keys(entries).length} entries`);
}

// Batch 63: Kotlin files
appendEntries(63, {
  'apps/mobile/android/app/src/main/java/com/egolessdo/app/MainActivity.kt': {'s':'Android 主 Activity（Kotlin，约 61 行）：配置主题、组件名、React delegate 与返回按钮行为。','t':['entry-point','android','kotlin','react'],'c':'moderate'},
  'apps/mobile/android/app/src/main/java/com/egolessdo/app/MainApplication.kt': {'s':'Android Application（Kotlin，约 56 行）：配置 React 宿主包、JS 入口与生命周期分发。','t':['entry-point','android','kotlin','react'],'c':'moderate'}
});

// Batch 64: AppDelegate.swift + tests
appendEntries(64, {
  'apps/mobile/ios/app/AppDelegate.swift': {'s':'iOS 应用委托（约 70 行）：配置 Expo/React Native 启动、URL 链接与 Universal Links 处理，含 ReactNativeDelegate 类。','t':['entry-point','ios','expo','swift'],'c':'moderate'},
  'apps/mobile/src/__tests__/helpers/syncMocks.ts': {'s':'同步测试共享 mock 工厂（约 136 行）：提供 createMockDb、createMockRowMappers 等可复用测试桩。','t':['test','sync','mock','helper'],'c':'complex'},
  'apps/mobile/src/__tests__/integration.test.ts': {'s':'应用集成测试文件（约 180 行）：mock 全局依赖后验证核心模块协作行为。','t':['test','integration','unit-test'],'c':'moderate'},
  'apps/mobile/src/__tests__/performance.test.ts': {'s':'性能回归测试文件（约 86 行）：验证关键操作耗时与资源占用符合基准。','t':['test','performance','unit-test'],'c':'simple'}
});
