# Implement — core 测试 store harness

## 执行顺序

### Step 1 — Spike: 建 harness + 迁移 createAuthSlice.test.ts（Gate 决定后续）✅

**Gate 结果（2026-11-12）：**
- warnings: 38 → 0（根 any 23→0 = 100%消除 ≥80% ✅；级联 14→0 = 100%消除 ≥70% ✅）
- 14/14 测试绿，0 类型错误
- 关键修正：① bindSlice 用条件类型 `RebindToSlice<F>` 推断 param tuple+Slice（`Args extends unknown[]` 在可选参数上失败）；② createTestStore 约束放宽到 `Slice extends object`，initial 用 `Partial<Slice>`，set 用完整 `StoreApi['setState']` 签名（含 replace）；③ mock fixture `as any` → typed cast（AuthResponse/MFARequiredResponse/RefreshResponse）；④ 迁移暴露并修复 1 个真实缺陷（`user: {id:'u1'}` 缺必填 name，之前被 as any 掩盖）；⑤ 移除多余 `@ts-expect-error`（__DEV__ 已在 logger.ts 全局声明）
- 跨 slice 结论：createAuthSlice 仅访问 `get().auth` 及自身方法，无跨 slice 状态——19 字段默认是 cargo-cult，瘦身到只 seed auth

#### 1a. 建 harness 骨架 ✅
- [x] 新建 `packages/core/src/store/test-utils/storeHarness.ts`
- [x] 实现 `createTestStore<Slice>(initial)`（见 design.md）
- [x] 实现 `createMockStorageAdapter(): StorageAdapter`（9 方法）
- [x] 实现 `bindSlice<F>(factory)`（条件类型边界 cast）
- [x] `pnpm run type-check`（core）确认 harness 自身类型正确

#### 1b. 迁移 createAuthSlice.test.ts ✅
- [x] 删手写 `makeTestStore` + `mockAdapter`，改 import harness
- [x] 用 `createTestStore<AuthSlice>` 替代，`createMockStorageAdapter` 替代 mockAdapter
- [x] 用 `bindSlice(createAuthSlice)` 包裹工厂调用
- [x] 保留 per-test callbacks（onLogout/onPullServerData/onClearData）
- [x] 移除所有 `as any`（含 mock fixture）

#### 1c. Spike 验证（Gate）✅
- [x] `npx vitest run src/store/createAuthSlice.test.ts` 全绿（行为不变）
- [x] eslint warning 数：38 → 0
- [x] **Gate 条件达标**：根 any 消除 100% ≥ 80%，级联消除 100% ≥ 70% → 继续 Step 2

### Step 2 — 迁移重 mock 文件（payoff 最大）
按 warning 数降序：
- [x] createRecycleBinSlice.test.ts (24) — 24→0（100% 消除），22 测试绿；cross-slice slice 用 `createTestStore<FullStore>` + 工厂直调（不需 bindSlice）
- [x] createFastingSlice.test.ts (26) — 26→1（96% 消除），17 测试绿；残留 1 warning 为 pre-existing 噪声（`expect.any(Number)` 嵌套 objectContaining 致对象退化为 any，迁移前后均存在）
- [x] planSlice.test.ts (21) — 21→0（100% 消除），5 测试绿；@deprecated 文件，plan fixture 用 `as FullStore['plans'][number]` typed cast
- [x] createFoodSlice.test.ts (18) — 18→0（100% 消除），16 测试绿；stale food 模型（cal/unit/date vs calories/timestamp）保留原行为，makeFood 推断类型经 harness 内部 cast 入 FullStore
- [x] habitSlice.test.ts (15) — 15→0（100% 消除），4 测试绿；@deprecated 文件
- [x] createHabitSlice.test.ts (14) — 14→1（93% 消除），12 测试绿；残留 1 warning 为 pre-existing 噪声（`expect.arrayContaining` 嵌套 objectContaining 致 unsafe-assignment，迁移前后均存在）
- 每个文件：删 makeTestStore/mockAdapter → import harness → bindSlice → 移除 as any
- 每个文件迁移后跑该文件测试确认绿

### Step 3 — 迁移轻 mock 文件 ✅
- [x] createPlanSlice.test.ts (11) — 11→0，7 测试绿；FullStore 直调（cross-slice: recycleBin/reflections/reflectionLinks）
- [x] createCheckinSlice.test.ts (11) — 11→0，9 测试绿；bindSlice（仅访问 checkinHistory/graceHistory）
- [x] createMeditationSlice.test.ts (10) — 10→0，6 测试绿；bindSlice（仅访问 medHistory/totalMedMinutes）
- [x] createThoughtTrailSlice.test.ts (9) — 9→0，9 测试绿；FullStore 直调（cross-slice: reflections/planItems）
- [x] createSleepSlice.test.ts (9) — 9→0，5 测试绿；bindSlice（仅访问 sleepHistory/sleepGoal）
- [x] createMindSlice.test.ts (8) — 8→0，4 测试绿；bindSlice（仅访问 fearEntries/courageEntries/achievements；保留 per-test `store.api.getState().checkAchievements = () => {}` 同 slice 方法挂载）
- [x] createMantraSlice.test.ts (8) — 8→0，5 测试绿；bindSlice（仅访问 mantraDefs/mantraSessions/readingSessions）
- [x] createExerciseSlice.test.ts (8) — 8→0，6 测试绿；FullStore 直调（cross-slice: recycleBin）
- [x] createDietSlice.test.ts — 3→0，6 测试绿；FullStore 直调（cross-slice: recycleBin）
- [x] createTrailNoteSlice.test.ts — 3→0，5 测试绿；bindSlice（tested 路径 addTrailNote/updateTrailNote/deleteTrailNote/getNotesByTrail 仅访问 thoughtTrails/trailNotes）
- [x] createCheckinSlice.optimistic.test.ts — 5→0，3 测试绿；bindSlice；createMockAdapter(shouldFail) → createMockStorageAdapter() + `vi.mocked(adapter.persistChange).mockRejectedValue(...)` per-test 覆盖

> **Step 3 验证结果（2026-11-16）**：11 文件全部迁移，全部 0 warning，测试全绿（单文件合计 88→0 warning 消除）。bindSlice vs FullStore 直调判定依据：tested 代码路径是否访问 `get().<其他 slice 属性>`。createTrailNoteSlice.test.ts 虽测 createThoughtTrailSlice（整体 cross-slice），但 tested 的 trail-note 方法仅访问自身，故用 bindSlice。
> **core 全量 lint**：23 warning（0 error），其中 Step 3 范围内 0 warning；剩余 23 分布：非 store 测试（ai/auth/business/dailyReset/fetch/selectors 共 20）+ Step 2 残留（createFastingSlice/createHabitSlice 各 1，expect.any/arrayContaining 噪声）+ storeHarness.ts 内部边界 cast 1。

### Step 4 — 全量验证 ✅
- [x] `pnpm run test`（core）全绿，812 测试不退化（子代理 Step 3 收尾跑全量）
- [x] `pnpm run lint`（core）最终 warning 数 = 23（0 error）
- [x] `pnpm run type-check`（core）0 error

> **Step 2 验证结果（2026-11-16）**：全量测试 2055 绿（159 文件），type-check 0 error。Step 2 五文件合计 92→1 warning（91 消除，残留为 createHabitSlice 的 expect.arrayContaining pre-existing 噪声）。
> **遗留阻塞已修复（2026-11-16）**：`storeHarness.ts` 第 11-12 行 `import/no-duplicates` error——主会话合并为单行 `import type { FullStore, StorageAdapter } from '../types';`，lint exit 0。

### Step 5 — ratchet 下调 ✅
- [x] 实测 core warning 总数 = 23（预期 20-40，达标）
- [x] 改 `packages/core/package.json` lint 脚本 `--max-warnings 530` → `23`
- [x] 验证 `pnpm run lint` exit 0（23 warning ≤ 23 阈值，Gate C 达标）

### Step 6 — 提交 + archive
- [ ] 提交策略：建议分 commit——harness 骨架 / 重 mock 批 / 轻 mock 批 / ratchet 下调（便于回滚定位）
- [ ] 或单 commit（若全部顺利）
- [ ] `openspec archive core-typed-test-harness -y`（workflow 3.4.5）
- [ ] 更新 changelog.md
- [ ] `/trellis:finish-work`

## Validation Commands

```bash
cd packages/core
npx vitest run src/store/createAuthSlice.test.ts   # spike 单文件
pnpm run test                                       # 全量
pnpm run lint                                       # ratchet 检查
pnpm run type-check                                 # 类型
# scoped warning 计数（迁移前后对比）：
npx eslint src/store/createAuthSlice.test.ts --ext .ts 2>&1 | grep -c warning
```

## Rollback Points

- Step 1c Gate 失败 → 停在 spike，不推广。harness 文件可保留待 replan 或删
- Step 2/3 某文件迁移后测试红 → revert 该文件，其余继续
- Step 5 ratchet 下调过度 → 调回（只要 ≥ 实测即可）

## Review Gates

- **Gate A（Step 1c）**：spike 级联消除比达标（R1）——决定全任务 go/no-go
- **Gate B（Step 4）**：全量测试绿 + warning 显著下降
- **Gate C（Step 5）**：ratchet 阈值 = 实测，lint exit 0
