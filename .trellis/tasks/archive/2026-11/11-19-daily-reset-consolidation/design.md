# Design — 每日重置归一

## 现状架构（问题标注）

```
触发层
  UI: PlanDetailContent detector（挂载+60s+AppState）──单日跨天──▶ store.performDailyReset(prev)
  Manager: DailyResetManager._doCheck（启动+可见性+午夜）
    ├ waterMl 重置（自己做）✓
    ├ needsReset && daysDiff>1 → backfillDay(D_0..D_{N-1})
    │    ├ onPlanDailyReset(D_i) ──✗ N 次回调──▶ store.performDailyReset(D_i)
    │    │                                        store 内 dayCount 循环完整覆盖（i=0 起，首回调即 lastReset，
    │    │                                        正确性无丢失——planning"传参错误"判断证伪，2026-11-19 修正）
    │    │                                        但 N 次回调 × 递减 dayCount 循环 → business O(N²) 幂等空转
    │    └ onReviewDailyReset(D_i)（无对应循环，逐天正确 ✓）
    └ needsReset && daysDiff==1 → plan 重置不触发 ✗（留给 UI）

store 层（零测试）
  performDailyReset(previousDate)  [30]
    ├ dayCount 计算 + 守卫 + 多日循环（链式 result）✓ 实现正确
    ├ persist diff 引擎（4 origMap + 4 重 for）← 独立职责，抽出
    └ notifyPlanDelayed(result.delayedPlans)  ← async 竞态

business 层（有测试 ✓）
  performDailyReset(plans, items, checkins, todos, history, previousDate, today)  [22]
    语义：存 previousDate 的历史 + 建 today 的循环 todo（幂等：historyKeySet/todayNameSet）
```

## 改动方案

### 1. `packages/core/src/dailyReset.ts` — Manager 触发归一

`_doCheck` 的 needsReset 分支重构：

```
needsReset:
  ① onPlanDailyReset?.(lastReset)          ← 单次、传 lastReset（消除 N 次回调空转）
     lastReset 为 null（首次）时不触发（无历史可补，语义与现状一致）
  ② review 逐天 backfill 保留（backfillDay 拆分：plan 分支移出，review 分支留下）
  ③ waterMl patch + setLastReset（现状不动）
```

- `backfillDay(backfillDate)` → `backfillReviews(backfillDate)`（改名以反映剩余职责）
- backfill 循环只服务 review；plan 重置走 ① 的单次回调
- **效果**：daysDiff=1 也触发（修复职责分裂）；单次回调传 lastReset（消除 N 次回调空转）；business 恰 N 次（消除 O(N²)）

### 2. `packages/core/src/store/createPlanSlice.ts` — 竞态修复 + 引擎抽出

**2a. notifyPlanDelayed in-flight 去重**：

```ts
// slice 工厂闭包内（随 store 实例，不跨实例泄漏）
const delayedNotifInFlight = new Set<string>();

async notifyPlanDelayed(delayedPlans) {
  for (const plan of delayedPlans) {
    if (plan.lastDelayedNotifyAt) continue;        // 持久防重（现状）
    if (delayedNotifInFlight.has(plan.id)) continue; // in-flight 去重（新增）
    delayedNotifInFlight.add(plan.id);
    try {
      await notifyDelayedPlan({...});
      // …写回 lastDelayedNotifyAt（现状逻辑）
    } catch { /* 现状 */ } finally {
      delayedNotifInFlight.delete(plan.id);        // 失败可重试
    }
  }
}
```

**2b. persist diff 引擎抽出（模块级纯函数）**：

```ts
// 模块级：输入 result + 原状态 + adapter，输出 persist 调用（无返回值，副作用仅 persistChange）
function persistDailyResetChanges(
  result: ReturnType<typeof performDailyResetBiz>,
  orig: { plans: Plan[]; planItems: PlanItem[]; dailyCustomTodos: DailyCustomTodo[]; dailyTodoHistory: DailyTodoHistory[] },
  adapter: { persistChange: typeof adapter.persistChange },
): void
```

- 4 段 diff 策略（plans/items 按 updatedAt 变、todos 按新增、history 按新增或变更）原样迁移，零行为变更
- store 方法剩：dayCount 计算 + 守卫 + 循环 + set + 引擎调用 + 通知——预计 ~16

### 3. 测试设计

**store 层 characterization（新增 `packages/core/src/store/createPlanSlice.dailyReset.test.ts`）**：
- harness：`createTestStore<FullStore>` + 工厂直调（方法访问 `get()` 多 slice 字段 + `get().notifyPlanDelayed`，changelog 11-16 判定规则）
- 断言（修复后语义）：
  - 单日：previousDate=D_4 → business 恰 1 次 (D_4,D_5)；循环 todo 建立
  - 多日：previousDate=D_0（today=D_3）→ business 恰 3 次 (D_0,D_1)(D_1,D_2)(D_2,D_3)——**D_0 历史断言**
  - 幂等：重复调用同一 previousDate → persist 无重复（diff 引擎断言）
  - business mock：`vi.mock('../business/plan', ...)` 或 spy `performDailyReset` 导出——倾向 spy（保持真实 business 行为，断言调用序列）
- 通知去重：mock `notifyDelayedPlan`（api 模块），同步循环触发多次 → API 恰 1 次

**Manager 层更新（`packages/core/src/dailyReset.test.ts`）**：
- needsReset（daysDiff=1）→ `onPlanDailyReset` 恰 1 次且参数 = lastReset（**行为变化**：此前不触发）
- daysDiff≥2 → `onPlanDailyReset` 仍恰 1 次（参数 lastReset）；`onReviewDailyReset` 仍逐天
- review backfill 边界（周日/月末）断言保持

## 权衡记录

| 决策 | 选择 | 理由 |
|------|------|------|
| UI detector 去留 | 保留兜底 | 保守：Manager 触发依赖 initApp 成功 + lastReset 状态，detector 幂等无害；删除留待稳定后评估 |
| checkAutoStatus:431 补写 lastDelayedNotifyAt | 不补 | 提前写 = 通知失败永不重试；in-flight Set 已解竞态，保持只读 |
| in-flight Set 位置 | slice 工厂闭包 | 模块级会跨 store 实例泄漏（测试多 store 场景）；闭包随实例生命周期 |
| Manager 单次回调的 null lastReset | 不触发 | 无历史可补；与现状 daysDiff 计算 guard（NaN/负值跳过）语义一致 |
| persist 引擎形态 | 模块级纯函数 | 同文件模块级（策略 C），不引入新文件/类；输入输出明确可单测 |

## 回滚形状

- 单 commit 序列，每步独立可 revert
- persist 引擎抽出 = 纯函数抽取，零行为，可单独回退
- Manager 触发改动 + store 竞态修复 = 两个独立 commit，语义上可分别回退（竞态修复不依赖触发归一）

## 风险

- **触发归一的"两头不补"**：Manager 不再逐天后，store dayCount 循环完全依赖 lastReset 正确性——保留现状 NaN/负值 guard + 测试覆盖损坏场景（lastReset 损坏字符串）
- **Manager 测试行为变化**：daysDiff=1 断言从"不触发"翻转为"触发"——这是修复，非回归；characterization 先行确保翻转是显式的
- **闭包 Set 在通知失败后的语义**：finally 清除 = 失败可重试（下轮触发再试）；与 lastDelayedNotifyAt（成功后永不重试）双层语义写进测试注释
