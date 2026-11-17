# core 非 store 测试 any 清理 + ratchet 23→5

## Goal

清理 core 非 store 测试文件中的 18 个 `any` 相关 warning（mock 对象 cast / any[] 参数 / null-as-any 边界测试），把 core lint ratchet 从 `--max-warnings 23` 下调到 `5`（仅留 5 个不可清理的 vitest `expect.*` 嵌套 artifact）。

## Background

11-12 core-typed-test-harness 任务把 store 测试的 any 清理到 23 warning，剩余分布：
- 18 个在非 store 测试（dailyReset/planTodo/selectors/grace/performance/hybrid-engine/auth/fetch）—— 本任务目标
- 5 个为 vitest `expect.objectContaining`/`expect.stringContaining`/`expect.any`/`expect.arrayContaining` 嵌套导致的 `no-unsafe-assignment` 类型 artifact + 1 个 harness 内部边界 cast —— **不可清理**，不在范围

## Requirements

### R1 — mock 对象 cast 清理（9 warning，3 文件）
- `dailyReset.test.ts` (7)：`let mockDeps: any` + 9 mock 方法级联 5 unsafe-member-access + 1 unsafe-call + 1 explicit-any。修：给 mockDeps 正确类型（`DailyResetManager` 构造参数的 deps 接口），`vi.fn()` 配类型
- `ai/local-engine/performance.test.ts` (1)：`mockCloud as any`。修：给 mockCloud 正确类型（HybridEngine 构造参数的 CloudEngine 接口）
- `ai/local-engine/hybrid-engine.test.ts` (1)：`mockCloudEngine as any`。同上

### R2 — any[] 参数 + link cast 清理（6 warning，1 文件）
- `business/planTodo.test.ts` (6)：`planItems: any[], customTodos: any[]`（makeHistory 参数，级联 3 unsafe-assignment）+ `link as any`（line 17，PlanItemLink 字段 cast，级联 explicit-any）。修：用 `PlanItem[]`/`DailyCustomTodo[]` 替代 any[]；link 用合法 `PlanItemLink` 值（如 `{ type: 'module', moduleId: 'm1' }`）替代 cast

### R3 — null-as-any 边界测试清理（3 warning，2 文件，涉及 2 处生产签名放宽）
- `store/selectors.test.ts` (2)：`calculateStreakFromCheckins(null as any)` / `(undefined as any)`。修：放宽 `utils.ts:133` `calculateStreakFromCheckins` 签名为 `Array<{...}> | null | undefined`（运行时已 null-safe，委托给已接受 null 的 `calculateCheckinStreak`，零行为变化）
- `business/grace.test.ts` (1)：`getMonthGraceCount(null as any, ...)`。修：放宽 `business/grace.ts:5` `getMonthGraceCount` 签名为 `GraceHistoryEntry[] | null | undefined`（运行时已有 `graceHistory ?? []` 守卫，零行为变化）

> 两处生产签名放宽是安全的——函数运行时已处理 null，签名只是没声明。放宽后测试去掉 `as any`，无行为变化、无调用方影响（已有调用方传非 null 数组，放宽是协变兼容）。

### R4 — ratchet 下调 + 验证
- 实测迁移后 core warning 总数（预期 5）
- 改 `packages/core/package.json` lint 脚本 `--max-warnings 23` → `5`
- `pnpm run test`（core）全绿，行为不变
- `pnpm run lint`（core）0 error，warning ≤ 5

## Acceptance Criteria

- [ ] dailyReset.test.ts: mockDeps 正确 typing，0 warning（7→0）
- [ ] planTodo.test.ts: any[]/link cast 消除，0 warning（6→0）
- [ ] selectors.test.ts: null-as-any 消除，0 warning（2→0）
- [ ] grace.test.ts: null-as-any 消除，0 warning（1→0）
- [ ] performance.test.ts + hybrid-engine.test.ts: mock cast 消除，0 warning（2→0）
- [ ] utils.ts + grace.ts 签名放宽（`| null | undefined`），type-check 0 error
- [ ] core warning 总数 23→5（仅留 5 个 vitest expect.* artifact + harness cast）
- [ ] `pnpm run test`（core）全绿，行为不变
- [ ] `pnpm run lint`（core）0 error，warning ≤ 5，exit 0
- [ ] ratchet 阈值 23→5 写入 package.json

## Out of Scope

- 5 个 pre-existing vitest `expect.*` 嵌套 artifact（storeHarness/createFastingSlice/createHabitSlice/auth/fetch）——不可清理，除非重构测试断言结构（收益低、风险高）
- mobile 的 warning（不同源）
- 新增测试用例（纯清理，不改测试覆盖）

## Risks

- **生产签名放宽（低）**：R3 放宽 2 个函数签名。两函数运行时已 null-safe，放宽是协变兼容，现有调用方传非 null 不受影响。type-check 会验证。
- **mock 对象 typing（低）**：dailyReset mockDeps 需找到 DailyResetManager 的 deps 接口类型。若接口未导出，需加 export（允许）。
- **回滚**：6 测试文件 + 2 生产文件 + ratchet，可整体 revert。
