# 拆分 SportPage — 执行计划

## 验证命令

```bash
# SportPage 主函数 + handleSave 都需复测
npx eslint apps/mobile/src/features/exercise/SportPage.tsx --rule '{"complexity": ["error", 15]}' --no-eslintrc
pnpm run lint && pnpm run type-check && pnpm run test
```

## 执行步骤

### Step 1: 提取 useComboSession hook
- [ ] **前置确认 A**：找到 `ComboState` 类型定义位置。若为 SportPage 内 inline 类型，先 export 它（或移至 types.ts），确保 hook 文件可导入
- [ ] **前置确认 B**：grep `goToNextExercise` 在 SportPage 中的所有引用点，确认是否出现在任何 `useEffect` 的依赖数组中
  - 若在依赖数组中 → 提取后主组件 effect 依赖改为 `const { goToNextExercise } = useComboSession(...)` 的返回值
  - 若不在依赖数组中但被 effect 调用 → 保持现状，不新增到依赖数组
- [ ] 在 `apps/mobile/src/features/exercise/hooks/` 创建 `useComboSession.ts`
- [ ] 将 `comboState` ref + `currentComboExercise` / `effectiveSportName` / `effectiveIcon` 派生 + `goToNextExercise` 移入
- [ ] **ref 在 hook 内 `useRef` 创建，返回 ref 对象**
- [ ] 在 SportPage 中替换为 `const { comboState, ... } = useComboSession(...)`
- [ ] 验证：`pnpm run type-check` 通过

### Step 2: 拆分 handleSave
- [ ] 提取 `saveSingleSport` — 单运动模式保存逻辑（entry 构建 + addExercise + setBodyFlowState + Health 写入）
- [ ] 提取 `saveComboExercise` — 组合模式（委托 goToNextExercise）
- [ ] `handleSave` 变为：savingRef 防重入 + 组合/单运动分派
- [ ] **savingRef 留在 handleSave 主入口**
- [ ] 验证：`pnpm run type-check` 通过

### Step 3: 检查 breathing/gps hook
- [ ] 检查 `useAmapComponents` 是否已覆盖 GPS tracking 逻辑
- [ ] 若有独立的呼吸逻辑未提取，提取 `useExerciseBreathing`；否则跳过
- [ ] 验证：`pnpm run type-check` 通过

### Step 4: 危险区 diff 审查
- [ ] `git diff` 确认以下**完全未改**：
  - effect 链（timer.sec 触发的 3 个 effect）
  - `comboState.current` 的所有渲染期读取点（第 84/480-484/614 行附近）
  - 已有子页面调用（SportPrepPage/ActivePage/ReportPage 的 props 传递）
- [ ] effect 留在主组件，不提取到 hook

### Step 5: 验证
- [ ] SportPage ESLint complexity ≤ 15
- [ ] handleSave（拆分后）ESLint complexity ≤ 15
- [ ] `pnpm run lint` 0 error 0 warning
- [ ] `pnpm run type-check` 0 错误
- [ ] `pnpm run test` ≥1967 通过
- [ ] 消费方 diff：`git diff master -- apps/mobile/src/features/exercise/` 仅 SportPage + 新 hook 文件变更
- [ ] effect 链顺序不变（Step 4 确认）
- [ ] comboState ref 模式不变（Step 4 确认）

## 回滚点

- Step 1/2/3 各一个 commit
- 出问题 `git revert <commit>`
- **特别注意**：如果 Step 4 发现 effect 链或 comboState 读取被改动，立即 revert 并重做
