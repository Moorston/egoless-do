# 调身页「开始今日训练」流程分析

## Goal
完整分析调身页「开始今日训练」模块的全部页面和功能流程，包括入口、三步流程（运动→调息→觉知）和完成页，识别所有问题、断裂点和优化机会。

## 完整流程分析（已通过代码探索确认）

### 流程总览

```
BodyDashboard
  │ 检测 flowState 显示 WorkoutFlowBanner
  │ 点击"开始今日训练"按钮
  │
  ▼
BodyScreen
  │ transitionTo('flow') 切换到 BodyFlow 页面
  │ setActivePlanId(planId)
  │
  ▼
BodyFlow  ──── Step 1: practice（运动）
  │ 显示今日计划 + 动作列表
  │ 点击"开始运动" → navigateToSport(sportKey)
  │   → onGoToSport() → BodyScreen.handleGoToSport()
  │     → navigate('Sport', { ...params })
  │       → SportPage 执行运动
  │       → 完成后返回（returnTick 机制）
  │         → BodyFlow 检测 returnTick 变化
  │           → markPracticeDone(durationSec)
  │           → 显示 practiceCompleted 状态
  │ 点击"进入调息" → transitionTo('breathing')
  │
  ├── Step 2: breathing（调息）
  │   显示调息说明
  │   点击"开始调息" → navigateToBreathing()
  │     → onGoToBreathing() → BodyScreen.handleGoToBreathing()
  │       → navigate('Breathing')
  │         → BreathingScreen 执行调息
  │         → 完成后返回（returnTick 机制）
  │           → BodyFlow 检测 returnTick 变化
  │             → markBreathingDone(durationMs)
  │             → 显示 breathingCompleted 状态
  │   点击"进入觉知" → transitionTo('checkin')
  │
  ├── Step 3: checkin（觉知）
  │   显示 BodyCheckinInline（能量/疼痛/舒适/睡眠/标签/备注）
  │   保存 → handleSaveCheckin → upsertBodyCheckin + saveAwareness
  │     → transitionTo('success')
  │   跳过 → handleSkipCheckin → saveAwareness(null)
  │     → transitionTo('success')
  │
  └── Step 4: success（完成）
       CheckinSuccessCard
       显示总时长、各步骤完成状态、鼓励语、觉知数据
       点击"完成" → resetFlow() + onExit()
         → BodyScreen transitionTo('dashboard')
```

### 关键组件

| 组件 | 文件 | 职责 |
|------|------|------|
| BodyDashboard | `BodyDashboard.tsx:35` | 入口：检测 flowState，显示 WorkoutFlowBanner，提供"开始"按钮 |
| BodyScreen | `BodyScreen.tsx:21` | 中转层：管理 `dashboard`/`flow` 页面切换，中转 navigation |
| BodyFlow | `BodyFlow.tsx:103` | 核心流程控制器：4 步状态机（practice→breathing→checkin→success） |
| StepIndicator | `BodyFlow.tsx:44` | 步骤指示器（3 个圆点连线） |
| ExercisePicker | `BodyFlow.tsx:70` | 自由训练时选择运动类型 |
| BodyCheckinInline | `BodyCheckinInline.tsx:18` | 觉知表单：4 个滑块 + 标签 + 备注 |
| CheckinSuccessCard | `CheckinSuccessCard.tsx:46` | 完成总结页：时长、各步骤状态、鼓励语、觉知数据 |
| WorkoutFlowBanner | `WorkoutFlowBanner.tsx:31` | 仪表盘上的进度 banner（仅展示状态，无操作按钮） |
| ExerciseProgressBanner | `ExerciseProgressBanner.tsx:24` | 通用进度条（目前未在 BodyFlow 中使用） |
| useBodyFlowState | `hooks/useBodyFlowState.ts:25` | 状态管理：持久化 flowState 到 store |
| SportPage | `SportPage.tsx:56` | 运动执行页 |
| BreathingScreen | `BreathingScreen.tsx` | 调息执行页 |

### 数据流

```
写入路径：
  BodyFlow.markPracticeDone() → setBodyFlowState({ practiceCompleted, practiceDurationSec })
    → adapter.persistSettings('bodyFlowState', state)
  BodyFlow.markBreathingDone() → setBodyFlowState({ breathingCompleted, breathingDurationMs })
  BodyFlow.handleSaveCheckin() → store.upsertBodyCheckin() + saveAwareness()

读取路径：
  initApp() → loadSettingsPatch() → SETTINGS_KEYS 包含 'bodyFlowState'
    → store.bodyFlowState 恢复
  → useBodyFlowState() → flowState
  → BodyDashboard WorkoutFlowBanner 显示状态

状态字段：
  FlowState {
    step, selectedSportKey, practiceCompleted, practiceDurationSec,
    breathingCompleted, breathingDurationMs, awarenessData, activePlanId,
    startedAt, updatedAt, isCombo?, comboExercises?
  }
```

### 入口点列表

BodyDashboard 中有 3 个"开始今日训练"入口：

1. **WorkoutFlowBanner**（显示 flowState 时）→ `handleStartExercise` → 组合模式走 `nav.navigate('Sport')`，单运动走 `onFlowStartWithPlan`/`onFlowStart`
2. **今日方案卡片**（`BodyDashboard.tsx:503`）→ `onFlowStartWithPlan`/`onFlowStart`
3. **开始训练按钮**（`BodyDashboard.tsx:537`）→ `onFlowStartWithPlan`/`onFlowStart`

### 发现的问题

1. **practice 步骤完成后，从 SportPage 返回的 returnTick 机制不稳定**：returnTick 依赖 `useFocusEffect` 设置，但组合模式（combo）的 flowState 由 SportPage 直接设置，returnTick 不触发，导致 `practiceCompleted` 状态可能不同步。
2. **BodyFlow 关闭按钮（X）与返回按钮重复**：当前有 `handleExitPress` 的 X 按钮（右上角）和返回按钮（左上角），两者都调用 `handleExitPress` 弹出确认对话框。返回按钮可直接退出无需确认。
3. **BodyFlow 的 breathing 步骤导航到 BreathingScreen 后返回路径不完整**：BreathingScreen 完成后返回 BodyScreen，但 BodyFlow 需通过 `returnTick` 检测练习完成。如果 BreathingScreen 直接导航到其他页面，returnTick 不会触发。
4. **BodyCheckinInline 的 `plan` 参数仅用于显示训练部位标签**：实际并未将训练数据（如运动时长、消耗）传递给觉知页。
5. **CheckinSuccessCard 的鼓励语通过 i18n JSON 加载**：`T('bodyEncouragements')` 返回一个 JSON 字符串，解析失败则降级为空。这不是标准做法，可能导致空鼓励语。
6. **ExerciseProgressBanner 已定义但未在 BodyFlow 中使用**：该组件有完整的进度条 + 步骤操作功能，但 BodyFlow 内部使用自己的 StepIndicator（仅显示）和操作按钮。
7. **BodyFlow 的 `transitionTo` 动画与 `setStep` 可能竞争**：`transitionTo` 使用 `transitioningRef` 防止重复调用，但 `setStep`（来自 flowState）直接修改 store，如果 `transitionTo` 和 `setStep` 同时调用可能导致状态不一致。
8. **CheckinSuccessCard 中的 `formatElapsed` 使用 `totalMs`**：该值在 `startTimeRef.current` 基础上计算，如果用户长时间停留在 success 页面，时间会不断增加。

## 架构建议

### 状态机简化
当前 `BodyFlow` 使用局部状态（`practiceCompleted`, `breathingCompleted`, `awarenessData`）+ `flowState`（store 持久化）双重状态源。建议统一为单一状态源：

- `flowState` 作为唯一状态源，局部状态仅用于过渡动画
- 移除 `practiceCompleted`/`breathingCompleted`/`awarenessData` 的 `useState`，全部从 `flowState` 读取

### 返回按钮优化
- 返回按钮（左上角）直接执行 `onExit()` 回到 dashboard，不弹出确认对话框
- 关闭按钮（X，右上角）保留确认对话框（防止误操作丢失进度）
- 或：移除 X 按钮，仅保留返回按钮，长按/双击返回弹出确认

### ExerciseProgressBanner 复用
- BodyFlow 的 StepIndicator 替换为 ExerciseProgressBanner，统一进度展示组件
- WorkoutFlowBanner 与 ExerciseProgressBanner 合并差异

## 未来方向（未定）
- 运动步骤完成后，自动过渡到调息步骤（无需手动点击）
- 调息步骤完成后，自动过渡到觉知步骤
- 觉知数据预填充（基于运动时长、强度等）
- BodyFlow 支持横向滑动切换步骤