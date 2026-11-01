# 拆分 HomeScreen — 执行计划

## 验证命令

```bash
npx eslint apps/mobile/src/features/home/screens/HomeScreen.tsx --rule '{"complexity": ["error", 15]}' --no-eslintrc
pnpm run lint && pnpm run type-check && pnpm run test
```

## 执行步骤

### Step 1: 提取 WeightCard
- [ ] 在 `apps/mobile/src/features/home/components/` 创建 `WeightCard.tsx`
- [ ] 将 WeightCard 内联 JSX 移入，定义 `WeightCardProps`
- [ ] **回调通过 props 传入，不移动 saveField/setTimeout 调用**
- [ ] 在 HomeScreen 中替换为 `<WeightCard {...} />`
- [ ] 验证：`pnpm run type-check` 通过

### Step 2: 提取 WaterCard
- [ ] 创建 `WaterCard.tsx`，同样模式
- [ ] 验证：`pnpm run type-check` 通过

### Step 3: 检查模态框
- [ ] 检查 `ReasonModal` / `WaterGoalModal` 是否已独立
- [ ] 若未独立，提取为包装组件
- [ ] 验证：`pnpm run type-check` 通过

### Step 4: 危险区 diff 审查
- [ ] `git diff` 确认以下函数/调用**完全未改**：
  - `buildNote` (第 231 行附近)
  - `saveField` (第 267 行附近)
  - 所有 `setTimeout(() => saveField(), 0)` 调用
  - `toggleHabit` / `addWaterCb` / `handleFoodChanged` / `togglePlanItem` / `toggleCustomTodo` 中的 setTimeout 调用
- [ ] 这些函数体应该零变更——只有它们调用的回调签名可能因子组件提取而微调，但**执行逻辑不变**

### Step 5: 验证
- [ ] ESLint complexity ≤ 15
- [ ] `pnpm run lint` 0 error 0 warning
- [ ] `pnpm run type-check` 0 错误
- [ ] `pnpm run test` ≥1967 通过
- [ ] 消费方 diff：`git diff master -- apps/mobile/src/features/home/navigation/index.tsx` 为空
- [ ] 危险区 diff 为空（Step 4 确认）

## 回滚点

- Step 1/2/3 各一个 commit
- 出问题 `git revert <commit>`
- **特别注意**：如果 Step 4 发现 saveField/buildNote 被改动，立即 revert 并重做该 step
