# Design: 调身页组合锻炼优化

## Architecture

### 数据流

```
BodyScreen
  ├─ handleGoToSport(sportKey)
  │    └─ 检测 todayExercises 长度
  │         ├─ > 1: nav.navigate('Sport', { exercises, comboPlanId, ... })
  │         └─ ≤ 1: nav.navigate('Sport', { key, icon, ... })  // 向后兼容
  │
  └─ useFocusEffect 监听 sportResult (不变)
       └─ 聚合结果格式与单运动一致，兼容现有 BodyFlow 逻辑

SportPage (combo mode)
  ├─ 路由参数: { exercises: ExerciseDef[], comboPlanId?: string, ... }
  ├─ comboState ref: { exercises, currentIndex, results[], totalDurationSec, totalCalories }
  ├─ ComboProgressHeader (顶部固定进度条 + 可展开动作列表)
  │    ├─ 简约模式: "2/5 卧推"
  │    └─ 展开模式: 完整动作列表 (已完成✅ / 当前▶ / 未开始○)
  ├─ 当前动作执行 (复用现有 prep/active/paused/report 页面)
  │    ├─ 活动页: 计时器 + 组数 + 呼吸引导 + 暂停
  │    └─ 报告页: 当前动作摘要 + 进入下一动作
  ├─ TransitionScreen (动作间过渡)
  │    ├─ 休息倒计时 (力量60s/传统15s/有氧30s)
  │    ├─ 当前动作完成摘要
  │    └─ 下一动作预览
  └─ handleSaveAll(): 全部完成 → 返回聚合结果到 Body
```

### 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `apps/mobile/src/navigation/types.ts` | 修改 | Sport 路由参数增加 `exercises` / `comboPlanId` |
| `apps/mobile/src/features/exercise/SportPage.tsx` | 修改 | 核心改动：组合模式 |
| `apps/mobile/src/features/exercise/hooks/useExerciseTimer.ts` | 修改 | 暴露 `reset()` 方法 |
| `apps/mobile/src/features/exercise/hooks/useExerciseSets.ts` | 修改 | 暴露 `reset(newExercise)` 方法 |
| `apps/mobile/src/features/practice/body/BodyFlow.tsx` | 修改 | 传递 exercises 替代单 key |
| `apps/mobile/src/features/practice/BodyScreen.tsx` | 修改 | handleGoToSport 检测组合模式 |
| `apps/mobile/src/features/exercise/components/ComboProgressHeader.tsx` | 新建 | 顶部进度条 + 展开列表 |
| `apps/mobile/src/features/exercise/components/TransitionScreen.tsx` | 新建 | 动作间过渡页 |

## 组件设计

### ComboProgressHeader

```
┌──────────────────────────────────────┐
│  [⬤─────○─────○]  2/5  │ 卧推  │ ▼ │
├──────────────────────────────────────┤
│  (展开时)                             │
│  ✅ 1. 八段锦             3:20      │
│  ▶ 2. 卧推                          │
│  ○ 3. 深蹲                跳转 →    │
│  ○ 4. 拉伸                跳转 →    │
└──────────────────────────────────────┘
```

**Props**:
- `exercises: ExerciseDef[]` — 所有动作
- `currentIndex: number` — 当前动作索引
- `results: ExerciseResult[]` — 已完成动作结果
- `onJumpTo: (index: number) => void` — 跳转到指定动作
- `TH, T`

**状态**:
- `expanded: boolean` — 是否展开列表

### TransitionScreen

```
┌──────────────────────────────────────┐
│         🎉 动作完成！                │
│                                      │
│  ✅ 八段锦            3:20          │
│                                      │
│  ───── 休息中 ─────                  │
│         45s                          │
│       [跳过休息]                     │
│                                      │
│  ⏭ 下一动作: 卧推                   │
│          4组 × 12次                  │
│                                      │
│  [ 开始下一个 ]                      │
└──────────────────────────────────────┘
```

**Props**:
- `currentExercise: ExerciseDef` — 刚刚完成的动作
- `nextExercise: ExerciseDef | null` — 下一个动作（null 表示全部完成）
- `duration: number` — 当前动作用时
- `restSec: number` — 建议休息时间
- `onSkipRest: () => void` — 跳过休息
- `onNext: () => void` — 开始下一个
- `onFinishAll: () => void` — 全部完成
- `TH, T`

## 核心逻辑

### comboState 结构

```typescript
interface ComboState {
  exercises: ExerciseDef[];
  currentIndex: number;
  results: {
    sportKey: string;
    icon: string;
    durationSec: number;
    calories: number;
    reps: number;
    sets: { reps: number; weight?: number }[];
    timestamp: number;
  }[];
  totalDurationSec: number;
  totalCalories: number;
}
```

### 动作切换流程

```
goToNextExercise()
  ├─ 保存当前动作到 comboState.results
  │    ├─ addExercise(entry)  // 立即保存到 store
  │    ├─ totalDurationSec += durationSec
  │    └─ totalCalories += calories
  ├─ currentIndex++
  ├─ 检查是否还有下一动作?
  │    ├─ 是: 重置 hooks → 进入下一动作 prep 页
  │    │    ├─ timer.reset()
  │    │    ├─ sets.reset(nextExercise)
  │    │    ├─ rest.reset()
  │    │    ├─ stopGpsTracking() / startGpsTracking() (按需)
  │    │    └─ setPage('prep')
  │    └─ 否: handleSaveAll()
  │         ├─ 计算聚合结果
  │         └─ nav.navigate('Body', { sportResult })
  └─ setPage('transition')  // 显示过渡页
```

### 休息时间计算

```typescript
function getRestSec(exercise: ExerciseDef): number {
  // 力量训练: 60s
  if (exercise.type === 'strength') return 60;
  // 有氧: 30s
  if (exercise.type === 'cardio') return 30;
  // 传统功法/柔韧: 15s
  if (exercise.type === 'traditional' || exercise.type === 'flexibility') return 15;
  // 默认: 30s
  return 30;
}
```

### 聚合结果格式

```typescript
// 与现有 sportResult 兼容，增加组合明细
const sportResult = {
  completed: true,
  durationSec: comboState.totalDurationSec,
  calories: comboState.totalCalories,
  reps: comboState.results.reduce((s, r) => s + r.reps, 0),
  sportKey: 'combo',  // 标识为组合训练
  isCombo: true,
  exercises: comboState.results,  // 每个动作的明细
};
```

## 边界情况

1. **单动作组合**：`exercises.length === 1` 时，按组合模式处理但隐去进度条，行为与单运动一致
2. **GPS 混合**：动作切换时检测新动作 `isGpsSport`，按需启停
3. **中途退出**：Alert 确认对话框，已完成的动作已保存到 store，不丢失
4. **全部跳过**：所有动作都跳过 → 返回空结果到 BodyFlow
5. **向后兼容**：无 `exercises` 参数时走原有单运动全流程

## 兼容性

- **导航**: 现有 `nav.navigate('Sport', { key, icon, color })` 不受影响
- **BodyFlow**: 现有单运动流程代码不变，仅新增 `exercises` 传递分支
- **BodyScreen**: 现有 `sportResult` 处理逻辑兼容聚合结果
- **ExerciseLog**: 每个动作的 `planId` 和 `planTaskWeekday` 均正确写入