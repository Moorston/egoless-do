# 调身页组合训练分析与优化 — 设计文档

## 架构概览

### 当前组合训练数据流

```
BodyDashboard (检测 todayExercises.length > 1)
  → BodyScreen.handleGoToSport()
    → SportPage (组合模式)
      → 逐动作：Prep → Countdown → Active → Report → Transition → 下一个
      → 每个动作 addExercise() 保存到 exerciseLog
      → 全部完成 → TransitionScreen.onFinishAll()
        → SportPage.handleSaveAll()
          → setBodyFlowState({ exerciseCompleted, isCombo, comboExercises, ... })
          → navigate('MainTabs', { screen: 'Body' })
    → BodyDashboard (从 flowState 恢复)
      → WorkoutFlowBanner 显示 exerciseCompleted = true
```

### 目标数据流（优化后）

```
BodyDashboard → BodyScreen → SportPage (组合模式)
  → 逐动作执行（保持不变）
  → 全部完成 → TransitionScreen.onFinishAll()
    → SportPage 进入 ComboReportPage（新增汇总报告页）
      → 用户查看报告 → 点击"返回"
        → handleSaveAll() 保存聚合记录 + 清理 + 导航回 Body
```

## 变更范围

### 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `SportPage.tsx` | 修改 | 插入 ComboReportPage 路由，修复 handleSaveAll 异常处理 |
| `ComboProgressHeader.tsx` | 修改 | i18n 替换硬编码英文 |
| `TransitionScreen.tsx` | 修改 | i18n 替换硬编码中文 + safe area 边距 |
| `ComboReportPage.tsx` | **新增** | 组合训练汇总报告页 |
| `BodyDashboard.tsx` | 修改 | 修复导航路由（确保 flowState 正确更新 WorkoutFlowBanner） |
| `useBodyFlowState.ts` | 修改 | 完善 flowState 持久化字段 |

### 不变的文件
- `BodyScreen.tsx` — 中转层逻辑正确，无需修改
- `BodyFlow.tsx` — 组合模式通过 onGoToSport 透传，逻辑正确
- `useTodayPlan.ts` — 不涉及

## 详细设计

### R1: 入口检测与路由优化

**问题**：`handleSaveAll` 导航路径 `MainTabs/Body` 可能导致白屏。

**方案**：
- 保留 `navigate('MainTabs', { screen: 'Body' })` 模式（与单运动一致）
- 在 `setBodyFlowState` 之后、导航之前添加短暂延迟（100ms），确保 store 写入完成
- 导航包裹 try-catch，失败时清理 flowState

**WorkoutFlowBanner 更新**：
- `handleSaveAll` 已设置 `exerciseCompleted: true, isCombo: true`
- BodyDashboard 的 `useEffect([flowState])` 检测到 `exerciseCompleted` 后设置 `workoutStep = 'breathing'`
- WorkoutFlowBanner 接收 `exerciseCompleted` 显示运动完成，用户可进入调息步骤

### R2: 组合训练执行体验 (i18n)

**ComboProgressHeader**：
- `Jump to #N?` → `T('bodyComboJumpTo')` （新 i18n key）
- `Current progress will be lost.` → `T('bodyComboJumpConfirm')` （新 i18n key）
- `Cancel` → `T('commonCancel')`
- `Jump` → `T('bodyComboJump')` （新 i18n key）

**TransitionScreen**：
- `N组 × N次` → `T('bodyComboSetsReps')` with `{sets}` `{reps}` params
- `N分钟` → `T('bodyComboMinutes')` with `{min}` param
- 添加 `useSafeAreaInsets()` → `paddingBottom: insets.bottom`

### R3: 汇总报告页 (ComboReportPage)

**位置**：`apps/mobile/src/features/exercise/components/ComboReportPage.tsx`

**Props 接口**：
```typescript
interface ComboReportProps {
  exercises: ExerciseResult[];     // 所有动作完成结果
  totalDurationSec: number;        // 总时长
  totalCalories: number;           // 总卡路里
  TH: Theme;
  T: (key: string) => string;
  onFinish: () => void;            // 点击"返回"回调 → handleSaveAll
}
```

**UI 设计**：
- 顶部：总览卡片（总时长、总卡路里、动作数）
- 中部：每个动作的完成列表（icon + 名称 + 时长 + 卡路里）
- 底部："返回"按钮（绿色渐变，类似 FinishAll 按钮）
- 使用 safe area 边距

**数据获取**：从 `comboState.current` 读取

**集成方式**：
- 在 SportPage 中新增 `page === 'combo_report'` 路由
- 最后一个 TransitionScreen 的 `onFinishAll` 改为进入 `combo_report` 页面
- ComboReportPage 的 `onFinish` 调用 `handleSaveAll`

### R4: 数据聚合

**在 `handleSaveAll` 中新增**：
```typescript
// 保存聚合记录
if (isComboMode && comboState.current.results.length > 0) {
  addExercise({
    sportKey: 'combo_workout',
    sportIcon: '🏋️',
    durationSec: comboState.current.totalDurationSec,
    timestamp: Date.now(),
    isGpsSport: false,
    calories: comboState.current.totalCalories,
    reps: comboState.current.results.reduce((s, r) => s + r.reps, 0),
    planId: comboPlanId || planId,
    planTaskWeekday,
    comboExercises: comboState.current.results,
  });
}
```

### R5: 异常处理

**`handleSaveAll` 异常处理**：
```typescript
const handleSaveAll = useCallback(() => {
  try {
    // ... 现有逻辑
    setBodyFlowState({ ... });
    setTimeout(() => {
      try {
        nav.navigate('MainTabs' as never, { screen: 'Body' } as never);
      } catch {
        log.error('Combo navigation failed');
        setBodyFlowState({ exerciseCompleted: false, isCombo: false });
      }
    }, 100);
  } catch (e) {
    log.error(e, { message: 'Combo save failed' });
    resetComboSession();
  }
}, [...]);
```

## 兼容性

- 所有变更向后兼容：现有单运动模式不受影响
- 组合训练聚合记录新增 `comboExercises` 字段，不破坏现有 exerciseLog 结构
- 新增 i18n key 需在 `zh.ts`、`zh-Hant.ts`、`en.ts` 和 `types.ts` 中添加

## 回滚方案

- 若 ComboReportPage 出现问题，可注释掉 `timer.setPage('combo_report')`，恢复为直接调用 `handleSaveAll`
- 若 i18n key 缺失，组件会 fallback 到英文/中文后备文案（现有习惯）