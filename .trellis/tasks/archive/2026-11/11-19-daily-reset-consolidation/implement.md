# Implement — 每日重置归一

> 顺序执行；步骤 1（characterization）是步骤 3-4 的硬前置
> 每步后跑对应验证；失败先修再前进

## 阶段 A：测试先行

- [x] A1. 新建 `packages/core/src/store/createPlanSlice.dailyReset.test.ts`：
  - harness = `createTestStore<FullStore>` + 工厂直调（`createPlanSlice` + 相邻 slice 按需）
  - characterization 断言（**改动前**跑绿）：单日 (D_4,D_5) 恰 1 次、多日 previousDate=D_0 恰 3 次 (D_0,D_1)(D_1,D_2)(D_2,D_3)、幂等（重复调用无重复 persist）、守卫（NaN/同日早退）
  - business spy：保持真实 business 执行，spy 调用序列（`vi.spyOn(business, 'performDailyReset')`）
  - 验证：`pnpm --filter @egoless-do/core test -- createPlanSlice.dailyReset` 绿
- [x] A2. Manager characterization（`dailyReset.test.ts` 增补，**改动前**跑绿）：
  - 现状断言：daysDiff=1 不触发 onPlanDailyReset（翻转前基线）；daysDiff≥2 逐天触发（基线）
  - 验证：`pnpm --filter @egoless-do/core test -- dailyReset` 绿
- [x] A3. 通知竞态复现测试（先行写红）：同步循环多次触发 `notifyPlanDelayed` → mock `notifyDelayedPlan` 断言调用 1 次——**此步预期红**（竞态存在，实测 3 次），作为步骤 4 的修复验收

## 阶段 B：store 层（独立可回退）

- [x] B1. `notifyPlanDelayed` 加 in-flight 去重（design 2a：闭包 Set + finally 清除）→ A3 测试转绿
- [x] B2. 抽 `persistDailyResetChanges` 模块级纯函数（design 2b，零行为迁移）→ A1 全部保持绿；store 方法复杂度实测（`--rule complexity` 显式检查目标 ~16）
- [x] 验证：`pnpm --filter @egoless-do/core test`（全量）+ `pnpm run type-check`（实测根 vitest workspace：2079 全绿 + type-check 0 error；thought-trail daySpan 偶发 flaky 与改动无关）

## 阶段 C：Manager 触发归一（独立可回退）

- [x] C1. `dailyReset.ts`：`_doCheck` needsReset 分支加单次 `onPlanDailyReset?.(lastReset)`（null 不触发）；`backfillDay` → `backfillReviews`（plan 分支移出，review 逐天保留）
- [x] C2. 更新 `dailyReset.test.ts`：daysDiff=1 断言翻转为"触发且参数 = lastReset"；daysDiff≥2 断言"恰 1 次参数 lastReset"；review 逐天断言保持
- [x] 验证：全量 2081 绿（23/23 dailyReset 相关）+ C1 期间发现并修复 2 个问题（见后记）

## 阶段 D：新行为验收

- [x] D1. store 测试补最终断言：Manager 语义下 5 天 gap → business 恰 5 次（端到端调用数断言，替代 O(N²)）
- [x] D2. 全量验证：
  ```
  pnpm run test          # core + mobile 全绿 → 2083/2083（161 文件）
  pnpm run type-check    # 0 error（core + mobile 2 successful）
  pnpm run lint          # exit 0，core 5 warnings = ratchet 阈值（新文件 0 新增）
  ```
- [x] D3. 复杂度复测：`performDailyReset` 与 `_doCheck` **均退出超标列表**（≤15，超额完成 ~16 目标）；剩余 toggleCheckin 19 / autoSyncPlanItems 16 为 pre-existing 不在本任务范围

## 阶段 E：收尾

- [ ] E1. spec 更新（trellis-update-spec 判断）：
  - `quality-guidelines.md` Complexity Thresholds 若 store 方法仍 >15 → risk-tier 豁免记录（数据安全路径先例）
  - 触发契约（Manager 持有全部触发 + 单次回调语义）若判断需要 → governance 或 core spec
- [ ] E2. 提交（3 个 commit：B 竞态+引擎 / C 触发归一 / A+D 测试随对应 commit）
- [ ] E3. openspec `daily-reset-consolidation` archive（实施完成 + AC 全勾）
- [ ] E4. finish-work：task archive + journal

## 回滚点

- B、C 各自独立 commit；C 回滚不破坏 B（竞态修复独立于触发归一）
- A 阶段测试在任何回滚后保持有效（characterization 断言的是修复后语义——若 C 回滚，A2 断言需同步回翻）

## 执行后记（完成后填写）

- [x] 实测复杂度 / business 调用次数 / 遇到的问题记录于此

### 实测数据

- **business 调用次数**：5 天 gap 从旧 15 次（5+4+3+2+1，O(N²)）→ 新恰 5 次（Manager 单次回调 + store dayCount 循环）；store 直调测试锁定链式序列 (D_0,D_1)(D_1,D_2)(D_2,D_3)
- **复杂度**：`performDailyReset` 30 → ≤15（抽 `runDailyResetChain` + `persistDailyResetChanges` 两个模块级纯函数后退出超标列表，超额完成 ~16 目标）；`_doCheck` 18 → ≤15（抽 `backfillFromLastReset`）；`notifyPlanDelayed` 竞态修复未增加超标
- **通知竞态**：三连发 fire-and-forget 实测 API 3 次（红）→ in-flight Set 后恰 1 次（绿）

### planning 误判修正（Execute 期发现，回 Plan 修正 prd/design）

- **"Manager 传参错误 → D_0 历史丢"证伪**：backfill 循环 `i` 从 0 起，首回调即 `lastReset` 本身，store dayCount 循环完整覆盖——正确性无丢失。真病灶是 O(N²) 幂等空转 + `daysDiff=1`/`lastReset=null` 不触发。已修正 prd.md 背景 1 与 design.md 现状架构图（显式标注"planning 判断证伪，2026-11-19 修正"）

### 遇到的问题与修复

1. **`Object.assign(state, slice)` clobber fixture**：slice 工厂的初始数据字段（`plans: []` 等）会覆盖测试 initial → business 收到空 plans → `hasChanges=false` 全部 persist 断言假绿（diff-engine/guards 测试因断言 0 而假绿）。修复：`Object.assign(state, slice, initial)`（initial 最后恢复）
2. **C1 首版把 plan 回调放在 NaN 守卫之前**：`'garbage'` truthy 字符串触发回调（invalid lastReset 应不触发）。被 invalid 测试抓住后重构进 `backfillFromLastReset`（守卫先行）
3. **mockDeps 缺 `onReviewDailyReset`**：周日 review backfill 断言无从触发（deps 可选字段未 mock）。补 `vi.fn<(period: 'week' | 'month') => void>()`
4. **vitest 模块 spy 的类型 artifact**：`vi.mock` + import 的 spy 类型是原函数签名（`.mock` 访问 = error type → ~27 个 no-unsafe warning 超 ratchet）。正解 `vi.mocked(performDailyReset)`（保持类型化 mock 访问）；`mock.results[0].value` 泛型退化为 any → 边界 cast 到 `ReturnType<typeof performDailyReset>`
5. **`max-depth` 5 层**（C1 嵌套加深）→ 抽 `backfillFromLastReset` 私有方法压平
6. **环境发现**：`packages/core/node_modules/vitest` bin 链接损坏（`pnpm --filter @egoless-do/core test` 不可用）——全量测试实际靠根目录 vitest workspace（`pnpm exec vitest run`，mobile symlink 副本也跑 = 双份计数 2083）；`thought-trail.test.ts` daySpan 测试偶发 flaky（`Date.now() + 5*DAY` 跨日历日界 + 全量并发时序），与本次改动无关
