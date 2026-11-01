# 拆分 PlanDetailContent — 执行计划

## 验证命令

```bash
# complexity 复测
npx eslint apps/mobile/src/features/plan/PlanDetailContent.tsx --rule '{"complexity": ["error", 15]}' --no-eslintrc

# 全量验证
pnpm run lint && pnpm run type-check && pnpm run test
```

## 执行步骤

### Step 1: 提取 TodoTabContent
- [ ] 在 `apps/mobile/src/features/plan/components/` 创建 `TodoTabContent.tsx`
- [ ] 将 todo tab 的 JSX（~213 行）移入，定义 `TodoTabContentProps` 接口
- [ ] 在 PlanDetailContent 中替换为 `<TodoTabContent dailyTodo={...} plan={...} items={...} checkins={...} />`
- [ ] 验证：`pnpm run type-check` 通过

### Step 2: 提取 PlanActionBar
- [ ] 在 `apps/mobile/src/features/plan/components/` 创建 `PlanActionBar.tsx`
- [ ] 将 6 个操作处理器（handleDelete/Complete/Resume/Pause/Cancel + checkCanArchive）移入
- [ ] 定义 `PlanActionBarProps` 接口，回调通过 props 传入
- [ ] 在 PlanDetailContent 中替换为 `<PlanActionBar plan={...} canArchive={...} ... />`
- [ ] 验证：`pnpm run type-check` 通过

### Step 3: 验证
- [ ] ESLint complexity ≤ 15
- [ ] `pnpm run lint` 0 error 0 warning
- [ ] `pnpm run type-check` 0 错误
- [ ] `pnpm run test` ≥1967 通过
- [ ] 消费方 diff 为空：`git diff master -- apps/mobile/src/features/plan/PlanScreen.tsx apps/mobile/src/features/plan/` （仅 PlanDetailContent + 新组件变更）
- [ ] 不触碰清单逐项确认：createDateChangeDetector / AppState / useDailyTodo 未被修改

## 回滚点

- Step 1 后 + Step 2 后各一个 commit
- 出问题 `git revert <commit>`
