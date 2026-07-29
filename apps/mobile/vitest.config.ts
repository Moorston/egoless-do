import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    root: __dirname,
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.expo'],
    setupFiles: [path.resolve(__dirname, '../../setup.ts')],
  },
  resolve: {
    alias: [
      {
        find: '@egoless-do/core',
        replacement: path.resolve(__dirname, '../../packages/core/src'),
      },
      {
        // react-native 0.81 入口是 Flow 源码，Vite/Rollup 的 SSR transform 不支持 Flow。
        // 测试环境用预编译 CommonJS shim 替代，避免 transform 阶段 Parse failure。
        // 参见 openspec/changes/tech-debt-cleanup-batch-1/design.md § 设计假设漂移记录
        find: /^react-native$/,
        replacement: path.resolve(__dirname, 'test/react-native-shim.cjs'),
      },
    ],
  },
});
