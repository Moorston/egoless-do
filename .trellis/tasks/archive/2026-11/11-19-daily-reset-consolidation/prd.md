# 每日重置归一：补账语义 + 触发架构 + 通知竞态 + persist diff 引擎

> OpenSpec change: `daily-reset-consolidation`（proposal 已有，本任务实施）
> 复杂任务（三件套齐全）

## 背景

2026-11-19 探索发现 + planning 推演确认的四个问题，病灶集中在零测试的 store 层：

1. **双重补账 O(N²) 空转**：`DailyResetManager._doCheck` 的 backfill 循环逐天回调 `onPlanDailyReset(D_0..D_{N-1})`（i 从 0 起，首回调即 lastReset 本身），store 版 `performDailyReset` 收到后由自己的 dayCount 循环**完整覆盖**全部日期——正确性无丢失（**planning 期"传参错误/D_0 历史丢"判断经代码复核+characterization 证伪，2026-11-19 修正**），但 N 次回调 × 每次内部递减 dayCount 循环 = business 调用 O(N²)（5 天 gap → 15 次，需要 5 次），全部幂等空转。
2. **触发点职责分裂**：单日 plan 重置的唯一触发点是 `PlanDetailContent` UI 挂载的日期探测器——用户不开计划页 → 当日循环 todo 不复制、昨日历史不存档。waterMl 归 Manager，plan 归 UI 页面。
3. **通知竞态**：`checkAutoStatus:431` 只 push 不写 `lastDelayedNotifyAt`；`notifyPlanDelayed:633` 防重写在 `await notifyDelayedPlan()` 之后——同步连发 N 次 fire-and-forget 全部通过检查 → 同一延迟计划最多 N 封重复邮件（N = O(gap²)）。
4. **复杂度**：store 方法 30 比重 = 包装层内藏三职责（多日编排 + persist diff 引擎 ~14 分支 + 通知）。

## 需求

1. **补账语义归一 + 传参修复**：store 的 dayCount 循环持有逐日语义（实现正确）；Manager 对 plan 重置改为 needsReset 时**单次回调 `onPlanDailyReset(lastReset)`**。review 生成的逐天 backfill 保留（它无对应循环）。
2. **触发点归一**：Manager `_doCheck` needsReset 时必触发 `onPlanDailyReset`（不分 daysDiff）；UI detector 降级为兜底（**保留不删**——保守方案，幂等保护兜住重复触发）。
3. **通知竞态修复**：`notifyPlanDelayed` 加 in-flight 去重（启动前标记、finally 清除）+ 保留 `lastDelayedNotifyAt` 持久防重；`checkAutoStatus:431` **不补写**（提前写 = 通知失败永不重试，保持只读语义）。
4. **persist diff 引擎抽出**：store 方法内 482-508 段（4 个 origMap + 4 重 for diff 策略）抽成模块级纯函数。
5. **store 层测试（先行）**：characterization 锁现状 → 改动 → 新行为断言。

## 验收标准

- [ ] characterization 测试先行且改动前跑绿（锁住现状理解：多日 gap、幂等防重、dayCount 循环覆盖语义）
- [ ] **gap 历史完整覆盖**：daysDiff=3（lastReset=D_0）→ business 调用序列恰为 (D_0,D_1),(D_1,D_2),(D_2,D_3)——store dayCount 循环的逐日覆盖语义在归一后保持（A1 characterization 已锁）
- [ ] **business 调用次数 = N**：N 天 gap → 恰 N 次调用（不再 O(N²)）
- [ ] **单日必触发**：daysDiff=1 时 Manager 触发 `onPlanDailyReset('D_0')`（测试断言，此前不触发）
- [ ] **通知恰 1 次**：同步连发多次 `notifyPlanDelayed` 场景下 `notifyDelayedPlan` API 恰调用 1 次（去重断言）
- [ ] persist diff 引擎为模块级纯函数，characterization 断言 persist 调用序列等价
- [ ] 既有测试全绿（core + mobile 全量）；Manager 现有 dailyReset.test.ts 相应更新（触发语义变化）
- [ ] store `performDailyReset` 复杂度 ~16（≤15 边缘，≤40 硬上限）
- [ ] UI detector 保留兜底，行为兼容（重复触发幂等）

## Out of scope

- Manager 的 waterMl / review 生成逻辑（工作正常，backfill 循环对 review 保留）
- `checkAutoStatus` 的 auto-start 状态机（不动）
- business `performDailyReset`(22) 复杂度（数据管道固有密度，幂等正确性依赖它）
- persist diff 引擎向其他 slice 推广（本任务只抽这一处，模式验证后另行评估）
- UI detector 删除（保留兜底；删除留待触发归一稳定后评估）
