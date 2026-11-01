# 拆分 BodyDashboard — 执行计划

## 验证命令

```bash
# 注意：不能用 --no-eslintrc（会导致 TS import 解析失败）
npx eslint apps/mobile/src/features/practice/body/BodyDashboard.tsx --rule '{"complexity": ["error", 15]}'
pnpm run lint && pnpm run type-check && pnpm run test
```

## 实际路径

- 主文件：`apps/mobile/src/features/practice/body/BodyDashboard.tsx`（1146 行，CC 85）
- 子组件目录：`apps/mobile/src/features/practice/body/banners/`（新建，与 hooks/ modals/ screens/ 并列）
- hook 目录：`apps/mobile/src/features/practice/body/hooks/`（已存在 useBodyFlowState.ts / useTodayPlan.ts）
- 唯一消费方：`apps/mobile/src/features/practice/BodyScreen.tsx`

## 执行步骤

### Step 1: 提取 useBodyDashboardData hook
- [ ] 在 `apps/mobile/src/features/practice/body/hooks/` 创建 `useBodyDashboardData.ts`
- [ ] **hook 内部用 `useShallowStore` 自行选择 store 数据 + 调 `useTodayPlan()`**（不接收 store 数据作参数——遵守架构约束）
- [ ] **逐个移动 12 个 useMemo + 4 个 selectedDay 派生**，每个 useMemo 的依赖数组保持原样不变
- [ ] 返回聚合对象：`{ activeGoal, activeTrainingPlan, expiredPlanIds, celebrationData, planProgress, recentExercises, latestCheckin, weightTrend, todayPlanDisplay, selectedDayTask, selectedDayIsRest, selectedDayDate, selectedDayOverride, todayPlan, todayOverride, hasOverride, todayExercises, todayDateStr, expiredPlanIdsEffect }`
- [ ] 在 BodyDashboard 中替换为 `const { activeGoal, ... } = useBodyDashboardData()`
- [ ] 验证：`pnpm run type-check` 通过
- [ ] **特别注意**：移动后逐个确认 useMemo 依赖项未遗漏——遗漏会导致派生数据不更新

### Step 2: 提取 useBodyOverrides hook
- [ ] 创建 `useBodyOverrides.ts`
- [ ] **hook 内部用 `useShallowStore` 自行选择 store actions**
- [ ] 将 8 个 override 处理器移入：setOverride, clearOverride, handleUndoOverride, handleSwapConfirm, handleAdjustConfirm, handleDaySkip, handleDaySwapConfirm, handleSaveGoalLight
- [ ] 接收 `useBodyDashboardData` 返回的 todayDateStr + activeTrainingPlan + selectedDay + selectedDayDate 作为入参（这些是派生值不是 store 裸数据）
- [ ] 验证：`pnpm run type-check` 通过

### Step 3: 提取 4 个 Banner 子组件
- [ ] 在 `features/practice/body/banners/` 创建 `TodayPlanBanner.tsx` / `BodyProfileBanner.tsx` / `BodyAwarenessBanner.tsx` / `WeightTrendBanner.tsx`
- [ ] **逐个将 Banner JSX 逐行搬入**（move-only，不改字符），定义 props 接口
- [ ] **Banner 1 (TodayPlanBanner) 是重点**：L351-562 的 override 状态条 + Flow progress 三层嵌套三元全搬入——这是主函数最大复杂度来源
- [ ] 在 BodyDashboard 中替换为 `<XxxBanner {...} />`
- [ ] 每提取一个验证一次 type-check + complexity

### Step 4: 验证
- [ ] ESLint complexity ≤ 15（`npx eslint ...BodyDashboard.tsx --rule '{"complexity": ["error", 15]}'`）
- [ ] `pnpm run lint` 0 error 0 warning
- [ ] `pnpm run type-check` 0 错误
- [ ] `pnpm run test` ≥1967 通过
- [ ] 消费方 diff：`git diff master -- apps/mobile/src/features/practice/BodyScreen.tsx` 为空
- [ ] 不触碰清单确认：useBodyFlowState / useTodayPlan / 模态框 / CelebrationOverlay / BodyDashboardStyles 未被修改

## 回滚点

- Step 1/2/3 各一个 commit
- 出问题 `git revert <commit>`
