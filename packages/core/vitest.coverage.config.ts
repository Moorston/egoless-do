// ── 分包 coverage 配置（coverage-ratchet-gate）───────────────────────
// 与主 vitest.config.ts 分离：全量测试跑法（root config，2097 基线）零影响，
// 本配置只服务分包覆盖率门禁：
//   pnpm exec vitest run --coverage --config packages/core/vitest.coverage.config.ts
// root: __dirname 锁定解析基准（vitest --config 从任意 cwd 跑）；
// setupFiles 用绝对路径（--root 跑法的相对解析坑，见任务 11-20-coverage-ratchet-gate design）。
// 分母契约：src 源码，排除测试/d.ts/dist/node_modules；scripts 噪声天然不进分母。
// thresholds = 2026-11-20 分包实测（等值起步，只升不降——与 lint ratchet 方向相反）。
// 只锁 statements/lines：v8 provider all-mode 对未加载文件只有 statements 计数，
// branches/functions 分母随测试加载面漂移（新增测试 import 新文件 → 分母突增 → 误报降级），
// 锁它们会惩罚良性的测试覆盖扩张；branches/functions 仍进报告（text/summary）只是不设门禁。
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    root: __dirname,
    include: ['src/**/*.test.ts'],
    globals: true,
    setupFiles: [path.resolve(__dirname, '../../setup.ts')],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.ts', '**/*.d.ts', 'dist/**', 'node_modules/**'],
      reporter: ['text', 'text-summary'],
      thresholds: {
        // 实测（2026-11-20 分包，826 测试全绿）：Statements 63.69% / Lines 63.69%
        statements: 63.69,
        lines: 63.69,
      },
    },
  },
});
