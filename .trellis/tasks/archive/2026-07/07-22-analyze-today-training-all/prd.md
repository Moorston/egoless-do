# 调身页「今日训练」全部页面分析

## Goal
完整分析调身页「今日训练」功能涉及的所有页面、组件、数据流，包括入口、BodyFlow 三步流程、运动执行、调息执行、觉知记录、完成总结，以及仪表盘状态展示。

## 页面导航图

```
BodyDashboard ─────────────────────────────────────────────────────┐
  │  Banner 轮播（今日方案 / 体重 / 建议 / 周计划）                │
  │  今日方案 banner 内嵌 flow 进度指示器（运动/调息/觉知）        │
  │  点击「开始今日训练」/「继续」                                    │
  ▼                                                                │
BodyScreen ─── 中转层 ────────────────────────────────────────────┐│
  │  page: 'dashboard' → BodyDashboard                            ││
  │  page: 'flow' → BodyFlow                                      ││
  │  transitionTo('flow') 切换页面                                ││
  │  handleGoToSport() → navigate('Sport')                        ││
  │  handleGoToBreathing() → navigate('Breathing')                ││
  ▼                                                                ▼▼
BodyFlow ─── 核心 4 步状态机 ──────────────────────────────────────┘
  Step 1: practice（调身练习）
    │ 有训练计划 → 显示计划名称 + 动作列表
    │ 无训练计划 → 从动作库按分类查找并显示
    │ 已完成 → 显示 ✅ + 已完成动作列表
    │ 点击「开始运动」→ onGoToSport() → BodyScreen → SportPage
    │ 完成后 flowState.practiceCompleted = true
    │ 点击「进入调息」→ transitionTo('breathing')
    │
  Step 2: breathing（调息安神）
    │ 显示调息说明
    │ 点击「开始调息」→ onGoToBreathing() → BodyScreen → BreathingScreen
    │ 完成后 flowState.breathingCompleted = true
    │ 点击「进入觉知」→ transitionTo('checkin')
    │
  Step 3: checkin（记录今日身体感受）
    │ BodyCheckinInline 表单（能量/疼痛/舒适/睡眠/标签/备注）
    │ 显示训练时长（practiceDurationSec）
    │ 保存 → upsertBodyCheckin + saveAwareness → transitionTo('success')
    │ 跳过 → saveAwareness(null) → transitionTo('success')
    │
  Step 4: success（今日总结）
    │ CheckinSuccessCard
    │ 总耗时、各步骤完成状态、鼓励语、觉知数据
    │ 点击「完成」→ resetFlow() + onExit() → BodyScreen dashboard

SportPage ─── 运动执行（单运动 / 组合模式）
  ├── PrepPage         准备页（选择目标/模式/音乐）
  ├── CountdownPage    倒计时
  ├── ActivePage       运动进行中
  │   ├── EnduranceActive   耐力布局
  │   ├── GpsActive         GPS 布局
  │   ├── MeditativeActive  冥想布局
  │   └── StrengthActive    力量布局
  ├── PausedPage       暂停
  ├── ReportPage       单运动报告
  ├── TransitionScreen 组合模式动作间过渡（休息倒计时）
  └── ComboReportPage  组合模式汇总报告（新增）

BreathingScreen ─── 调息执行
  ├── BreathingEngine  调息引擎
  └── 完成后 goBack() 回到 BodyScreen
```

## 全部文件清单

### 核心流程（7 个文件）

| 文件 | 行数 | 角色 |
|------|------|------|
| `BodyScreen.tsx` | 135 | 中转层：管理 dashboard/flow 页面切换，中转 navigation |
| `BodyDashboard.tsx` | ~1050 | 仪表盘：今日方案 banner、flow 进度、目标、周计划、最近运动 |
| `BodyFlow.tsx` | ~458 | 核心 4 步状态机：practice→breathing→checkin→success |
| `BodyCheckinInline.tsx` | 103 | 觉知表单：4 滑块 + 标签 + 备注 |
| `CheckinSuccessCard.tsx` | 136 | 完成总结页：总耗时、步骤状态、鼓励语、觉知数据 |
| `ExerciseProgressBanner.tsx` | 149 | 通用步骤进度条（readOnly 模式） |
| `useBodyFlowState.ts` | 94 | 状态管理：持久化 flowState 到 store |

### 运动执行（12+ 个文件）

| 文件 | 行数 | 角色 |
|------|------|------|
| `SportPage.tsx` | 777 | 运动执行主页面（单运动 + 组合模式） |
| `PrepPage.tsx` | — | 运动准备页 |
| `CountdownPage.tsx` | — | 倒计时页 |
| `PausedPage.tsx` | — | 暂停页 |
| `ReportPage.tsx` | — | 单运动报告页 |
| `EnduranceActive.tsx` | — | 耐力运动布局 |
| `GpsActive.tsx` | — | GPS 运动布局 |
| `MeditativeActive.tsx` | — | 冥想运动布局 |
| `StrengthActive.tsx` | — | 力量训练布局 |
| `ComboProgressHeader.tsx` | 165 | 组合模式底部进度条 |
| `TransitionScreen.tsx` | 286 | 动作间过渡页（休息倒计时） |
| `ComboReportPage.tsx` | 210 | 组合模式汇总报告页 |

### 调息执行（1 个文件）

| 文件 | 行数 | 角色 |
|------|------|------|
| `BreathingScreen.tsx` | — | 调息执行页面 |

### 钩子与工具（6 个文件）

| 文件 | 角色 |
|------|------|
| `hooks/useTodayPlan.ts` | 计算今日计划、动作列表、override 状态 |
| `hooks/useBodyFlowState.ts` | flowState 持久化管理 |
| `hooks/useExerciseTimer.ts` | 运动计时器 + 状态机 |
| `hooks/useExerciseAudio.ts` | 运动音效 |
| `hooks/useExerciseGps.ts` | GPS 定位 |
| `hooks/useExerciseRest.ts` | 休息计时器 |

### 数据模型（3 个文件）

| 文件 | 角色 |
|------|------|
| `packages/core/src/types/body.ts` | BodyPlan, BodyTrainingPlan, ExerciseDef, BodyCheckin, DayOverride |
| `packages/core/src/types/exercise.ts` | ExerciseEntry |
| `packages/core/src/constants.ts` | SPORT_GROUPS, EXERCISE_CATEGORIES, buildExerciseLibrary |

### 状态管理（1 个文件）

| 文件 | 角色 |
|------|------|
| `packages/core/src/store/createBodySlice.ts` | BodySlice: bodyFlowState, bodyGoals, bodyTrainingPlans, bodyCheckins |

## 数据流

### 写入路径
```
BodyFlow.markPracticeDone() → setBodyFlowState({ practiceCompleted, practiceDurationSec })
  → adapter.persistSettings('bodyFlowState', state) → SQLite app_state

SportPage.handleSave() → addExercise() → adapter.persistChange('exercise', ...) → SQLite
  → setBodyFlowState({ exerciseCompleted, practiceCompleted, ... })

BodyFlow.handleSaveCheckin() → store.upsertBodyCheckin() → adapter.persistChange('bodyCheckin', ...)
  → saveAwareness() → setBodyFlowState({ awarenessData, step: 'success' })
```

### 读取路径
```
启动 → initApp() → loadSettingsPatch() → SETTINGS_KEYS 包含 'bodyFlowState'
  → store.bodyFlowState 恢复
  → useBodyFlowState() → BodyDashboard WorkoutFlowBanner / BodyFlow
```

## 已发现的问题（从上两个会话延续）

1. **BodyFlow 退出机制已修复**：退出不重置 flowState，保留已完成记录
2. **Banner 进度集成已修复**：flow 进度显示在今日方案 banner 内
3. **动作显示已修复**：完成状态显示具体动作而非分类名
4. **非训练计划模式已修复**：从动作库按分类查找并显示动作
5. **combo_workout 硬编码已修复**：抽取为常量，各页面显示「组合训练」

## 待确认问题

1. **BreathingScreen 不写 flowState**：调息完成后 BreathingScreen 只调用 goBack()，不写 flowState.breathingCompleted。BodyFlow 无法检测调息完成状态，步骤 2 永远无法进入步骤 3。
2. **SportPage 单运动返回路径**：单运动完成后通过 setBodyFlowState + navigate 返回，BodyFlow 从 flowState 读取状态。
3. **BodyFlow 步骤切换动画**：transitionTo 与 setStep 之间存在时序问题
4. **SportPage 818 行**：文件过大，需要拆分为更小的组件

## 后续优化方向

1. 运动步骤完成后自动过渡到调息步骤（无需手动点击）
2. 调息步骤完成后自动过渡到觉知步骤
3. 觉知数据预填充（基于运动时长、强度）
4. BodyFlow 支持横向滑动切换步骤
5. SportPage 重构拆分（777 行 → 多个 hooks + 页面组件）