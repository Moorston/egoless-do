# Design: 开始今日训练流程重构

## Architecture

### 新架构

```
BodyScreen
  └── BodyDashboard (orchestrator)
        ├── Banner Progress Bar (运动 ✅ / 调息 ⏭️ / 觉知 ○)
        ├── Step 1: 运动 → SportPage (combo mode) → return → save records
        ├── Step 2: 调息 → Breathing page → return → update flowState
        ├── Step 3: 觉知 → inline Checkin card → update flowState
        └── Completion: ✅ 今日完成 + 查看总结
```

### 数据流

```
┌──────────────────────────────────────────────────────────────┐
│  BodyDashboard                                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ useTodayPlan() → todayExercises, activeTrainingPlan    │  │
│  │ flowState → exerciseCompleted/breathingCompleted/      │  │
│  │           → awarenessCompleted                         │  │
│  └────────────────────────────────────────────────────────┘  │
│                          │                                    │
│  ┌───────────────────────┼───────────────────────────────┐   │
│  │ 运动步骤               │                               │   │
│  │ handleStartExercise()  │                               │   │
│  │ → nav.navigate('Sport', { exercises, comboPlanId })   │   │
│  │ → SportPage executes → handleSaveAll()                │   │
│  │ → nav.navigate('MainTabs', { screen: 'Body' })        │   │
│  │ → BodyDashboard detects return, updates progress      │   │
│  └───────────────────────┼───────────────────────────────┘   │
│                          │                                    │
│  ┌───────────────────────┼───────────────────────────────┐   │
│  │ 调息步骤               │                               │   │
│  │ handleStartBreathing() │                               │   │
│  │ → nav.navigate('Breathing')                           │   │
│  │ → Breathing executes → nav.navigate('MainTabs/Body')  │   │
│  │ → BodyDashboard detects return, updates progress      │   │
│  └───────────────────────┼───────────────────────────────┘   │
│                          │                                    │
│  ┌───────────────────────┼───────────────────────────────┐   │
│  │ 觉知步骤               │                               │   │
│  │ handleStartCheckin()   │                               │   │
│  │ → showCheckin state = true                            │   │
│  │ → Checkin card rendered inline                        │   │
│  │ → onComplete → flowState.awarenessCompleted = true    │   │
│  └───────────────────────┼───────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### 状态管理

```typescript
// flowState 扩展
interface FlowState {
  // 现有字段
  step: 'practice' | 'breathing' | 'checkin' | 'success' | null;
  practiceCompleted: boolean;
  breathingCompleted: boolean;
  awarenessData: BodyCheckin | null;

  // 新增字段
  exerciseCompleted: boolean;    // 运动步骤完成
  awarenessCompleted: boolean;   // 觉知步骤完成
  skippedSteps: string[];        // 已跳过的步骤 ['breathing', 'awareness']
  totalDurationSec: number;      // 总运动时长
  totalCalories: number;         // 总热量
  isCombo: boolean;              // 是否为组合模式
  comboExercises?: ExerciseResult[];  // 组合运动结果
}
```

### 关键合约

**SportPage 路由参数**:
```typescript
Sport: {
  exercises: ExerciseDef[];      // 组合动作列表
  comboPlanId?: string;          // 所属计划 ID
  // 移除单运动的 key/icon/color，组合模式下由 SportPage 内部推导
}
```

**返回机制**:
```typescript
// SportPage handleSaveAll → 返回聚合结果
nav.navigate('MainTabs', { screen: 'Body' });

// BodyScreen useFocusEffect → 检测 flowState 更新
// 不再依赖 returnTick，直接读取 flowState
```

## Migration Notes

### 废弃 BodyFlow 向导模式
- `BodyFlow.tsx` 不再作为主流程容器
- 保留 `StepIndicator` 组件供 Banner 使用
- 保留 `CheckinSuccessCard` 组件供完成总结使用

### 扩展 flowState
- 新增字段向后兼容（可选字段）
- 现有 `practiceCompleted`/`breathingCompleted` 逻辑保留
- 新增 `exerciseCompleted`/`awarenessCompleted` 与现有字段并存

### 导航变更
- `handleGoToSport` → 传递 `exercises` 数组
- `handleGoToBreathing` → 保持不变
- 觉知步骤 → 不再跳转，内嵌 Banner

## Trade-offs

| 决策 | 优势 | 劣势 |
|------|------|------|
| 取消 BodyFlow | 流程灵活，可跳过步骤 | 需要重构现有代码 |
| 觉知内嵌 Banner | 减少页面跳转，体验流畅 | Banner 区域空间有限 |
| 调息独立页面 | 呼吸动画需要全屏 | 需要页面跳转 |
| flowState 持久化 | 支持跨会话恢复 | 需要处理 22h 过期 |

## Rollback Plan

1. **保留 BodyFlow 代码** — 不删除，仅不使用
2. **feature flag** — 可通过配置切换新旧流程
3. **渐进式迁移** — 先支持单运动，再启用组合模式