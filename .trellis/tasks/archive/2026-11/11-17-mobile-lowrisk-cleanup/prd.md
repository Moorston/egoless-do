# mobile 低风险清理 — sync 测试 helper + mkStyles + import/order

Parent: 11-17-mobile-complexity-cleanup

## Goal

清理 mobile 5 个低风险 warning（3 sync 测试 setup + 1 mkStyles StyleSheet + 1 import/order），把 mobile warning 从 13 降到 8，为 child 2（screen 重构）铺路。全部低风险/行为保持。

## Requirements

### R1 — sync 测试 setup 提取共享 helper（3 warning，3 文件）
- `SyncApplyService.test.ts`（526 行 arrow）/ `SyncEngine.test.ts`（455）/ `SyncRehydrationManager.test.ts`（353）的长 beforeEach/setup arrow
- 提取共享 mock 工厂 helper（类似 core 的 createMockStorageAdapter 模式）：把重复的 mockDb/mockStateStore/mockApplyService 等 hoisted mock 构造抽到 `test-utils/` 共享文件
- 保留各测试 per-test 的 mock 行为覆写
- 行为保持（test-only），3 文件测试全绿

### R2 — mkStyles StyleSheet 处理（1 warning，1 文件）
- `SleepHistoryPage.tsx` mkStyles(435 行)——扁平 StyleSheet 定义，非逻辑
- 选项（implement 时定）：① 拆分 StyleSheet 为按区块的多文件/多 const；② per-line `eslint-disable-next-line max-lines-per-function` 带理由（StyleSheet 扁平定义，拆分无收益）
- 优先 ②（carve-out 带理由）——StyleSheet 拆分是噪声，无可读性收益

### R3 — import/order 修复（1 warning，1 文件）
- `useBodyDashboardData.ts`：`eslint --fix` 一键解决

### R4 — 验证
- mobile warning 13→8（消除 5）
- `pnpm run test`（mobile）全绿
- `pnpm run type-check`（mobile）0 error

## Acceptance Criteria

- [x] 3 sync 测试 setup 提取共享 helper，各 arrow ≤300 行或合理拆分，0 warning
  - 诊断结果：违规 arrow 是顶层 `describe()` callback（非 hoisted mock 工厂、非 it() 体），含 `let`/`beforeEach` + 多个嵌套 `describe`
  - 拆分方式：移除外层 `describe()` wrapper，`let`/`beforeEach`/`afterEach` 提升到 module scope，嵌套 describe 平铺为 top-level（vitest 支持），各 describe arrow 均 <300 行
  - SyncApplyService.test.ts: 353→0 warning（34 tests 全绿）
  - SyncEngine.test.ts: 455→0 warning（40 tests 全绿）
  - SyncRehydrationManager.test.ts: 526→0 warning（42 tests 全绿）
- [x] mkStyles 处理（carve-out 或拆分），0 warning
  - SleepHistoryPage.tsx:498 mkStyles(435) → per-line `eslint-disable-next-line max-lines-per-function` + 理由注释，0 warning
- [x] useBodyDashboardData import/order 修复，0 warning
  - `eslint --fix` 自动修复（useTodayPlan import 分组），0 warning
- [x] mobile warning 13→8
- [x] mobile 测试全绿（96 files / 1243 tests），type-check 0 error

## Out of Scope

- 8 个 screen 组件重构（child 2）
- ratchet 下调（parent 收尾统一做）
