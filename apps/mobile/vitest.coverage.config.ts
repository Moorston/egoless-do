// ── 分包 coverage 配置（coverage-ratchet-gate）───────────────────────
// 与主 vitest.config.ts 分离：全量测试跑法（root config，2097 基线）零影响，
// 本配置只服务分包覆盖率门禁：
//   pnpm exec vitest run --coverage --config apps/mobile/vitest.coverage.config.ts
// root: __dirname 锁定解析基准；setupFiles 绝对路径；alias 逐字拷贝自主 config
// （react-native Flow 源码 transform 失败的 shim 替代 + core 源码直链）。
// 分母契约：src 源码，排除测试/d.ts/dist/node_modules。
// thresholds = 分包实测等值起步（mobile 为结构性基线 ~4.6%：RN 测试基础设施
// 限制——lucide transform 失败、@testing-library 不可用，见 quality-guidelines
// Known Test Environment Limitations；提升走测试基建任务，非 ratchet）。
// 只锁 statements/lines（分母稳定）：v8 provider all-mode 对未加载文件只有
// statements 计数，branches/functions 分母随测试加载面漂移（详见 core 同名 config 注释）。
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    root: __dirname,
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: [path.resolve(__dirname, '../../setup.ts')],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', '**/*.d.ts', 'dist/**', 'node_modules/**'],
      reporter: ['text', 'text-summary'],
      thresholds: {
        // 实测（2026-11-20 分包，445 测试全绿）：Statements 4.62% / Lines 4.62%
        statements: 4.62,
        lines: 4.62,
      },
    },
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
