# Implement — core 非 store 测试 any 清理

## 执行顺序

### Step 1 — mock 对象 cast 清理（payoff 最大，9 warning）

#### 1a. dailyReset.test.ts（7→0，最重）— ✅ Gate A 通过
- [x] 找到 `DailyResetManager` 构造参数的 deps 接口类型 → `DailyResetDeps`（已 export 于 dailyReset.ts:46）
- [x] （无需加 export，接口已导出）
- [x] `let mockDeps: any` → 用 `const mockDeps = { ... } satisfies DailyResetDeps`（保留各 `vi.fn<Procedure>()` 的 Mock 类型，断言可直接访问 `.mockResolvedValue`/`.toHaveBeenCalled`）
- [x] 各 `vi.fn()` 配正确返回类型（`vi.fn<() => Promise<string | null>>()` 等）
- [x] 跑该文件测试确认绿（10 passed）
- [x] eslint 确认 0 warning

#### 1b. performance.test.ts + hybrid-engine.test.ts（2→0）— ✅
- [x] 找到 `HybridEngine` 构造参数的 CloudEngine 接口类型 → `CloudAIEngine`（ai/local-engine/types.ts:11）
- [x] `mockCloud as any` / `mockCloudEngine as any` → `satisfies CloudAIEngine`（模式推广自 1a）
- [x] 跑两文件测试确认绿（7 passed）
- [x] eslint 确认 0 warning

### Step 2 — planTodo.test.ts any[] + link cast（6→0）— ✅
- [x] `planItems: any[]` → `DailyTodoHistory['planItems']`，`customTodos: any[]` → `DailyTodoHistory['customTodos']`（比 `PlanItem[]` 更精确——history 字段是子集类型）
- [x] line 17 `link as any` → makeItem 签名 `link: string` 改为 `link: PlanItemLink = 'manual'`，直接赋值无需 cast
- [x] computeHistorySummary 测试用例补全字面量缺失字段（id/name/link）以匹配严格类型
- [x] 跑该文件测试确认绿（12 passed）
- [x] eslint 确认 0 warning

### Step 3 — null-as-any 边界测试 + 生产签名放宽（3→0）— ✅
- [x] `utils.ts:133` `calculateStreakFromCheckins(checkins: Array<{...}>)` → `Array<{...}> | null | undefined`
- [x] `business/grace.ts:5` `getMonthGraceCount(graceHistory: GraceHistoryEntry[], ...)` → `GraceHistoryEntry[] | null | undefined`
- [x] `selectors.test.ts:51-52` `null as any` / `undefined as any` → `null` / `undefined`
- [x] `grace.test.ts:35` `null as any` → `null`
- [x] 跑 selectors/grace 测试确认绿（18 passed）
- [x] eslint 确认 0 warning

### Step 4 — 全量验证 — ✅ Gate B 通过
- [x] `pnpm run test`（core）全绿（812 passed，63 files）
- [x] `pnpm run lint`（core）实测 warning 数 = 5（auth/fetch/createFastingSlice/createHabitSlice/storeHarness 各 1）
- [x] `pnpm run type-check`（core）0 error（签名放宽无调用方破坏）

### Step 5 — ratchet 下调 — ✅ Gate C 通过
- [x] 改 `packages/core/package.json` lint 脚本 `--max-warnings 23` → `5`
- [x] 验证 `pnpm run lint` exit 0（5 problems, 0 errors, 5 warnings, exit 0）

### Step 6 — 文档 + 提交 + archive
- [x] 更新 `.trellis/spec/core/frontend/quality-guidelines.md` ratchet 阈值记录（23→5，残留构成说明）
- [x] 更新 `.trellis/spec/governance/GLOBAL-CODE-STANDARDS.md`（core=530→5 stale 修正）
- [x] 更新 `.claude/rules/changelog.md`
- [ ] 提交（主 session Phase 3.4）
- [ ] `/trellis:finish-work`

## Validation Commands

```bash
cd D:/MyProject/2026/egoless-do
# 单文件测试（从 root 跑，packages/core vitest 二进制链接断）：
./node_modules/.bin/vitest run packages/core/src/<文件>.test.ts
# core 全量：
./node_modules/.bin/vitest run packages/core
# lint + warning 计数：
cd packages/core && npx eslint src --ext .ts,.tsx --max-warnings 999 2>&1 | grep -c warning
# type-check：
pnpm --filter core run type-check
```

## Rollback Points

- Step 1a mockDeps typing 失败（接口未导出且无法加 export）→ 停，报告
- Step 3 签名放宽引入 type-check error（调用方不兼容）→ revert 签名，测试改用 `null as unknown as Type` cast（仍消除 no-explicit-any，保留 unsafe 但可接受）
- Step 5 ratchet 过度 → 调回（≥ 实测即可）

## Review Gates

- **Gate A（Step 1a）**：dailyReset mockDeps typing 成功 → 决定 1b/2 模式可推广
- **Gate B（Step 4）**：全量测试绿 + warning 23→5 + type-check 0 error
- **Gate C（Step 5）**：ratchet 阈值 = 实测，lint exit 0
