# 调身页组合训练分析与优化 — 实施计划

## 实施顺序

依赖关系：R5(异常处理) → R1(路由优化) → R2(i18n) → R4(数据聚合) → R3(汇总报告页)

## 步骤清单

### Step 1: i18n key 补充

**文件**：`packages/core/src/i18n/types.ts`、`zh.ts`、`zh-Hant.ts`、`en.ts`

新增以下 key：

| Key | en | zh | zh-Hant |
|-----|----|----|---------|
| `bodyComboJumpTo` | `Jump to {name}?` | `跳转到 {name}？` | `跳轉到 {name}？` |
| `bodyComboJumpConfirm` | `Current exercise progress will be lost.` | `当前训练进度将丢失` | `當前訓練進度將丟失` |
| `bodyComboJump` | `Jump` | `跳转` | `跳轉` |
| `bodyComboSetsReps` | `{sets} sets × {reps} reps` | `{sets}组 × {reps}次` | `{sets}組 × {reps}次` |
| `bodyComboMinutes` | `{min} min` | `{min}分钟` | `{min}分鐘` |
| `bodyComboReport` | `Combo Workout Report` | `组合训练报告` | `組合訓練報告` |
| `bodyComboTotalDuration` | `Total Duration` | `总时长` | `總時長` |
| `bodyComboTotalCalories` | `Total Calories` | `总消耗` | `總消耗` |
| `bodyComboExercises` | `Exercises` | `动作列表` | `動作列表` |
| `bodyComboReturn` | `Return` | `返回` | `返回` |

**验证**：`pnpm run type-check` 通过

### Step 2: ComboProgressHeader i18n 替换

**文件**：`apps/mobile/src/features/exercise/components/ComboProgressHeader.tsx`

替换以下硬编码字符串：
- `Jump to #${index + 1}?` → `T('bodyComboJumpTo').replace('{name}', '#${index + 1}')`
- `Current progress will be lost.` → `T('bodyComboJumpConfirm')`
- `'Cancel'` → `T('commonCancel')`
- `'Jump'` → `T('bodyComboJump')`

**验证**：无 TypeScript 错误

### Step 3: TransitionScreen i18n + safe area

**文件**：`apps/mobile/src/features/exercise/components/TransitionScreen.tsx`

- 导入 `useSafeAreaInsets` from `react-native-safe-area-context`
- 替换 `{sets}组 × {reps}次` → `T('bodyComboSetsReps', {sets, reps})`
- 替换 `{min}分钟` → `T('bodyComboMinutes', {min})`
- 替换 `{min}分钟`（另一处）→ `T('bodyComboMinutes', {min})`
- 添加 `const insets = useSafeAreaInsets();` 和 `paddingBottom: insets.bottom`

**验证**：无 TypeScript 错误

### Step 4: SportPage 异常处理

**文件**：`apps/mobile/src/features/exercise/SportPage.tsx`

- 修改 `handleSaveAll`：包裹 try-catch，setTimeout 延迟导航，失败时清理 flowState
- 修改 `handleSave` 单运动模式：同样检查异常处理
- 确保 `resetComboSession` 在 finally 中调用

**验证**：`pnpm run type-check` 通过

### Step 5: SportPage 新增 ComboReportPage 路由

**文件**：`apps/mobile/src/features/exercise/SportPage.tsx`

- 在 `page` 类型中加入 `'combo_report'`
- 在 `handleSaveAll` 中不直接导航，改为 `setPage('combo_report')`
- 新增 `page === 'combo_report'` 渲染分支 → `<ComboReportPage>`
- 导入 ComboReportPage 组件

**验证**：`pnpm run type-check` 通过

### Step 6: 新增 ComboReportPage 组件

**文件**：`apps/mobile/src/features/exercise/components/ComboReportPage.tsx`（新建）

按设计文档实现：
- Props 接口：`ComboReportProps`
- 总览卡片（总时长、总卡路里、动作数）
- 每个动作完成列表（icon + 名称 + 时长 + 卡路里）
- 底部"返回"按钮
- safe area 边距

**验证**：`pnpm run type-check` 通过

### Step 7: 数据聚合记录

**文件**：`apps/mobile/src/features/exercise/SportPage.tsx`

在 `handleSaveAll` 中，保存所有单个动作后，新增一条聚合 `combo_workout` 记录：
```typescript
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

**验证**：`pnpm run type-check` 通过

### Step 8: flowState 路由优化

**文件**：`apps/mobile/src/features/exercise/SportPage.tsx`

- 确保 `setBodyFlowState` 在导航前调用，包含所有组合字段
- 添加 `startedAt` 和 `updatedAt` 字段

**验证**：`pnpm run type-check` 通过

## 验证命令

```bash
# 类型检查
pnpm run type-check

# 运行测试
pnpm run test

# 清理
pnpm run lint
```

## 风险点与回滚

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| ComboReportPage 新组件渲染异常 | 用户无法查看汇总报告 | 可注释掉 `setPage('combo_report')`，恢复为直接 `handleSaveAll` |
| i18n key 缺失 | 显示后备空字符串 | 保留英文后备文案 |
| 导航延迟导致闪烁 | 短暂白屏 | 100ms 延迟，可进一步调优或移除 |
| 聚合记录字段不兼容 | 旧版 exerciseLog 消费失败 | 确保 `comboExercises` 为可选字段 |

## 审查门禁

1. Step 1 完成后：运行 `pnpm run type-check` 确认 i18n 类型无错误
2. Step 4 完成后：抽查 `handleSaveAll` 的 try-catch 覆盖
3. Step 6 完成后：检查 ComboReportPage 渲染
4. 全部完成后：运行 `pnpm run test` 确保现有测试不中断