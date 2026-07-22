# Implementation: 开始今日训练流程重构

## Implementation Order

### Step 1: 扩展 flowState 类型

**文件**: `packages/core/src/store/createBodySlice.ts`

```typescript
// BodyFlowPersistedState 新增字段
export interface BodyFlowPersistedState {
  // ... 现有字段 ...
  exerciseCompleted: boolean;
  awarenessCompleted: boolean;
  skippedSteps: string[];
  totalDurationSec: number;
  totalCalories: number;
  isCombo: boolean;
  comboExercises?: { sportKey: string; icon: string; durationSec: number; calories: number; reps: number; timestamp: number }[];
}
```

**验证**: `pnpm run type-check` 通过

---

### Step 2: 重构 BodyDashboard Banner

**文件**: `apps/mobile/src/features/practice/body/BodyDashboard.tsx`

2.1 新增 Banner 进度条组件 `ExerciseProgressBanner`
- 显示进度：[运动 ✅] [调息 ⏭️] [觉知 ○]
- 每步有「开始」/「重新执行」按钮
- 已跳过的步骤显示「已跳过」标签

2.2 新增运动步骤处理
- `handleStartExercise()` → 检测组合模式 → 跳转 SportPage
- `handleStartBreathing()` → 跳转 Breathing 页面
- `handleStartCheckin()` → 显示 Checkin 卡片
- `handleSkipStep(step)` → 标记步骤为已跳过

2.3 新增完成总结组件 `ExerciseCompletionCard`
- 显示「✅ 今日完成」
- 各步状态 + 总时长
- 查看总结按钮

**验证**: `pnpm run type-check` 通过

---

### Step 3: 修改 BodyScreen 返回检测

**文件**: `apps/mobile/src/features/practice/BodyScreen.tsx`

3.1 移除 returnTick 机制
- 不再使用 `returnTick` 计数器
- 改为直接读取 `flowState`

3.2 修改 `handleGoToSport`
- 组合模式：传递 `exercises` 数组 + `comboPlanId`
- 单运动模式：保持现有逻辑

3.3 修改 `useFocusEffect`
- 检测 `flowState.exerciseCompleted` / `flowState.breathingCompleted`
- 更新 Banner 进度

**验证**: `pnpm run type-check` 通过

---

### Step 4: 修改 SportPage 组合模式返回

**文件**: `apps/mobile/src/features/exercise/SportPage.tsx`

4.1 修改 `handleSaveAll`
- 保存聚合结果到 `flowState`
- 导航回 `MainTabs/Body`

4.2 修改 TransitionScreen
- 新增「跳过下一动作」按钮
- 跳过后自动进入下一个动作

**验证**: `pnpm run type-check` 通过

---

### Step 5: 觉知步骤内嵌 Banner

**文件**: `apps/mobile/src/features/practice/body/BodyDashboard.tsx`

5.1 新增 Checkin 内嵌卡片
- 使用现有 `BodyCheckinInline` 组件
- 在 Banner 区域显示
- 完成后更新 `flowState.awarenessCompleted`

**验证**: `pnpm run type-check` 通过

---

### Step 6: 清理 BodyFlow

**文件**: `apps/mobile/src/features/practice/body/BodyFlow.tsx`

- 保留组件代码但不使用
- 或标记为 `@deprecated`

**验证**: `pnpm run type-check` 通过

---

## Validation

```bash
pnpm run type-check
pnpm run test
```

## Risky Files

| 文件 | 风险 | 缓解 |
|------|------|------|
| `BodyDashboard.tsx` | 大文件，功能集中 | 拆分为子组件 |
| `BodyScreen.tsx` | 导航逻辑复杂 | 充分测试返回机制 |
| `SportPage.tsx` | 组合模式改动 | 保持向后兼容 |
| `flowState` | 类型扩展 | 可选字段，向后兼容 |

## Follow-up Checks

- [ ] 单运动流程正常工作
- [ ] 组合运动流程正常工作
- [ ] 跳过/重新执行步骤正常工作
- [ ] 跨会话恢复正常工作
- [ ] Breathing 页面返回后正确更新进度