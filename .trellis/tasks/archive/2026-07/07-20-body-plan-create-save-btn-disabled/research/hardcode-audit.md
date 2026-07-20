# 调身模块硬编码字符串全面审查报告

> 审查范围：`apps/mobile/src/features/practice/body/`（31 个 .tsx/.ts 文件，排除 *.test.ts）
> 审查日期：2026-07-20
> i18n 规范：所有用户可见文案必须通过 `T('i18nKey')` 引用，key 必须声明于 `packages/core/src/i18n/types.ts` + `zh.ts`

---

## 🔴 严重：完全没有 T() 包裹的硬编码用户可见文案

| # | 文件路径:行号 | 问题代码片段 | 说明 |
|---|-------------|------------|------|
| 1 | `BodyDashboard.tsx:712` | `← 左右滑动查看更多 →` | Banner 引导文案完全硬编码 |
| 2 | `BodyDashboard.tsx:870` | `{String(Math.floor(e.durationSec / 60))}分钟` | 时间单位硬编码 |
| 3 | `CheckinSuccessCard.tsx:24-34` | `ENCOURAGEMENTS = ['身体是灵魂的殿堂…', …]` (10条) | 鼓励语数组完全硬编码中文 |
| 4 | `WeightTrendChart.tsx:192` | `{diff.toFixed(1)}kg` | 单位 kg 硬编码 |
| 5 | `WeightTrendChart.tsx:200` | `<Text>kg</Text>` | 单位 kg 硬编码 |
| 6 | `BodyPlanEditorScreen.tsx:273` | `name: 'Editing Plan'` | 调试用名称硬编码英文 |
| 7 | `BodyPlanEditorScreen.tsx:358` | `` {`约 ${durationWeeks} 周`} `` | 周期文案硬编码 |
| 8 | `ExerciseCard.tsx:115` | `placeholder="3"` | 输入框占位符硬编码 |
| 9 | `ExerciseCard.tsx:129` | `placeholder="10"` | 同上 |
| 10 | `ExerciseCard.tsx:142` | `placeholder="0"` | 同上 |
| 11 | `ExercisePickerGrid.tsx:71` | `` accessibilityLabel={`${item.nameZh}${isAdded ? ' 已添加' : ''}`} `` | a11y 标签硬编码 |
| 12 | `ExercisePickerGrid.tsx:262` | `{String(selectedExIds.size)} 个动作` | 量词"个动作"硬编码 |
| 13 | `UnifiedExercisePool.tsx:128` | `` ` (${T('bodyPlanAlreadyExists') || '已存在'} …` `` | 部分硬编码 |
| 14 | `UnifiedExercisePool.tsx:262` | `{String(selectedExIds.size)} 个动作` | 量词硬编码 |
| 15 | `UnifiedExercisePool.tsx:339` | `({String(selectedDays.size)}天)` | 量词"天"硬编码 |
| 16 | `TemplatePickerModal.tsx:47` | `{template.durationDays}天` | 量词"天"硬编码 |
| 17 | `TemplatePickerModal.tsx:49` | `{String(…)}练/周` | "练/周"硬编码 |
| 18 | `WeightRecordModal.tsx:49` | `{T('bodyWeight')} (kg)` | 单位 kg 硬编码 |
| 19 | `WeightRecordModal.tsx:55` | `placeholder={… : '0.0'}` | 占位符硬编码 |
| 20 | `WeightRecordModal.tsx:60` | `{T('bodyBodyFat')} (%)` | 单位 % 硬编码 |
| 21 | `GoalEditLightModal.tsx:73` | `placeholder="如: 70"` | 中文占位符硬编码 |
| 22 | `GoalEditLightModal.tsx:84` | `placeholder="如: 15"` | 同上 |
| 23 | `GoalEditModal.tsx:39` | `placeholder="2026-09-30"` | 日期格式硬编码 |
| 24 | `CelebrationOverlay.tsx:143` | `{data.weightChange.toFixed(1)}kg` | 单位 kg 硬编码 |
| 25 | `CelebrationOverlay.tsx:147` | `{data.bodyFatChange.toFixed(1)}%` | 单位 % 硬编码 |
| 26 | `PlanManagementScreen.tsx:143` | `` {`${weeks}周 · ${activeDays}天/周`} `` | 周期/频率硬编码 |
| 27 | `BodyFlow.tsx:357` | `${T('bodyMin') || '分钟'}` | key 不存在，回退始终生效 |

---

## 🟡 中等：T('key') || 'fallback' 中 key 在 i18n 里不存在

以下 key 在 `types.ts` 和 `zh.ts` 中**均未声明**，`T()` 永远返回空字符串，中文回退文案始终显示。

### 撤销操作
| # | 文件路径:行号 | 假 i18n key | 显示的中文回退 |
|---|-------------|------------|--------------|
| 1 | `BodyDashboard.tsx:348` | `bodyUndo` | '撤销' |
| 2 | `SnackbarHost.tsx:41` | `bodyUndo` | '撤回' |
| 3 | `SnackbarHost.tsx:43` | `bodyUndo` | '撤回' |

### 状态覆盖
| # | 文件路径:行号 | 假 i18n key | 显示的中文回退 |
|---|-------------|------------|--------------|
| 4 | `BodyDashboard.tsx:342` | `bodyOverrideSkip` | '已标记跳过' |
| 5 | `BodyDashboard.tsx:343` | `bodyOverrideSwap` | '已换动作' |
| 6 | `BodyDashboard.tsx:344` | `bodyOverrideAdjust` | '已调整组数' |
| 7 | `BodyDashboard.tsx:345` | `bodyOverrideCustom` | '已自定义' |

### 训练动作编辑
| # | 文件路径:行号 | 假 i18n key | 显示的中文回退 |
|---|-------------|------------|--------------|
| 8 | `DayPlanCard.tsx:87` | `bodyPlanRemoved` | '已移除' |
| 9 | `DayPlanCard.tsx:123` | `bodyPlanRestDayHint` | '今天是休息日，好好恢复身体吧' |
| 10 | `DayPlanCard.tsx:152` | `bodyPlanUnitExercise` | '个动作' |
| 11 | `DayPlanCard.tsx:169` | `bodyPlanAddedExercises` | '当天动作' |
| 12 | `DayPlanCard.tsx:200` | `bodyStartTraining` | '开始训练' |
| 13 | `DayPlanCard.tsx:203` | `bodyStartTraining` | '开始训练' |
| 14 | `BodyPlanEditorScreen.tsx:438` | `bodyStartTraining` | '开始训练' |
| 15 | `BodyPlanEditorScreen.tsx:441` | `bodyStartTraining` | '开始训练' |
| 16 | `ExerciseCard.tsx:95` | `bodyAdjust` | '调整' |
| 17 | `ExerciseCard.tsx:96` | `bodyAdjust` | '调整' |
| 18 | `ExerciseCard.tsx:98` | `bodyRemove` | '移除' |
| 19 | `ExerciseCard.tsx:110` | `bodySets` | '组' |
| 20 | `ExerciseCard.tsx:124` | `bodyReps` | '次' |
| 21 | `ExerciseCard.tsx:137` | `bodyWeightUnit` | 'kg' |

### 搜索/过滤/清除
| # | 文件路径:行号 | 假 i18n key | 显示的中文回退 |
|---|-------------|------------|--------------|
| 22 | `ExercisePickerGrid.tsx:141` | `bodySearchExercise` | '搜索动作' |
| 23 | `ExercisePickerGrid.tsx:144` | `bodySearchExercise` | '搜索动作' |
| 24 | `ExercisePickerGrid.tsx:147` | `bodyClear` | '清除' |
| 25 | `ExercisePickerGrid.tsx:161` | `bodyAll` | '全部' |
| 26 | `UnifiedExercisePool.tsx:200` | `bodySearchExercise` | '搜索动作' |
| 27 | `UnifiedExercisePool.tsx:203` | `bodySearchExercise` | '搜索动作' |
| 28 | `UnifiedExercisePool.tsx:206` | `bodyClear` | '清除' |
| 29 | `UnifiedExercisePool.tsx:221` | `bodyAll` | '全部' |
| 30 | `UnifiedExercisePool.tsx:270` | `bodyClear` | '清除' |
| 31 | `QuickSwapModal.tsx:99` | `bodySearchExercise` | '搜索动作...' |
| 32 | `MiniWeekCalendar.tsx:62` | `bodyWeekDay` | (空，用于 a11y) |

### 时间单位
| # | 文件路径:行号 | 假 i18n key | 显示的中文回退 |
|---|-------------|------------|--------------|
| 33 | `BodyFlow.tsx:357` | `bodyMin` | '分钟' |
| 34 | `CheckinSuccessCard.tsx:102` | `bodyMin` | '分钟' |
| 35 | `CelebrationOverlay.tsx:125` | `bodyMin` | '分钟' |

### 调整模态框
| # | 文件路径:行号 | 假 i18n key | 显示的中文回退 |
|---|-------------|------------|--------------|
| 36 | `AdjustExerciseModal.tsx:52` | `bodyAdjustExercise` | '调整组数/次数' |
| 37 | `AdjustExerciseModal.tsx:73` | `bodySets` | '组数' |
| 38 | `AdjustExerciseModal.tsx:87` | `bodyReps` | '次数' |
| 39 | `AdjustExerciseModal.tsx:102` | `bodyDuration` | '时长(秒)' |
| 40 | `AdjustExerciseModal.tsx:122` | `bodyConfirm` | '确认调整' |

### DayActionSheet 操作
| # | 文件路径:行号 | 假 i18n key | 显示的中文回退 |
|---|-------------|------------|--------------|
| 41 | `DayActionSheet.tsx:24` | `bodySwapExercise` | '换运动类型' |
| 42 | `DayActionSheet.tsx:30` | `bodyRestoreDay` | '恢复训练' |
| 43 | `DayActionSheet.tsx:31` | `bodyMarkRest` | '标记为休息' |
| 44 | `DayActionSheet.tsx:36` | `bodySwapDays` | '与另一天互换' |
| 45 | `DayActionSheet.tsx:42` | `bodyEditDayExercises` | '编辑该天动作' |
| 46 | `DayActionSheet.tsx:64` | `bodyHasOverride` | '该天有临时调整' |

### QuickSwapModal
| # | 文件路径:行号 | 假 i18n key | 显示的中文回退 |
|---|-------------|------------|--------------|
| 47 | `QuickSwapModal.tsx:57` | `bodySwapExercise` | '换动作' |
| 48 | `QuickSwapModal.tsx:68` | `bodyQuickSelect` | '快速选择' |
| 49 | `QuickSwapModal.tsx:88` | `bodyFromLibrary` | '从动作库选择' |
| 50 | `QuickSwapModal.tsx:127` | `bodyBack` | '返回' |

### QuickSwapModal — 不存在的 i18nKey 常量（直接传给 T()）
| # | 文件路径:行号 | 假 i18n key 常量 | 说明 |
|---|-------------|-----------------|------|
| 51 | `QuickSwapModal.tsx:16` | `bodyPartUpperBody` | 用于 T(opt.i18nKey) |
| 52 | `QuickSwapModal.tsx:17` | `bodyPartLowerBody` | 同上 |
| 53 | `QuickSwapModal.tsx:18` | `bodyPartCore` | 同上 |
| 54 | `QuickSwapModal.tsx:19` | `bodyPartFlexibility` | 同上 |
| 55 | `QuickSwapModal.tsx:20` | `bodyDayRest` | 同上 |

### GoalEditLightModal
| # | 文件路径:行号 | 假 i18n key | 显示的中文回退 |
|---|-------------|------------|--------------|
| 56 | `GoalEditLightModal.tsx:45` | `bodyEditGoal` | '编辑目标' |
| 57 | `GoalEditLightModal.tsx:53` | `bodyGoalStrategy` | '策略' |
| 58 | `GoalEditLightModal.tsx:91` | `bodyGoalNote` | '备注' |
| 59 | `GoalEditLightModal.tsx:105` | `bodySaveGoal` | '保存目标' |

### CelebrationOverlay
| # | 文件路径:行号 | 假 i18n key | 显示的中文回退 |
|---|-------------|------------|--------------|
| 60 | `CelebrationOverlay.tsx:114` | `bodyPlanComplete` | '🎉 训练计划完成！' |
| 61 | `CelebrationOverlay.tsx:121` | `bodyCompletionRate` | '完成率' |
| 62 | `CelebrationOverlay.tsx:155` | `bodyTapToDismiss` | '点击任意位置关闭' |

### BodyCheckinInline
| # | 文件路径:行号 | 假 i18n key | 显示的中文回退 |
|---|-------------|------------|--------------|
| 63 | `BodyCheckinInline.tsx:84` | `bodyCheckinNotePlaceholder` | '补充说明...' |

---

## 🟢 提示：可改进但不影响功能

| # | 文件路径:行号 | 问题 | 说明 |
|---|-------------|------|------|
| 1 | `BodyDashboard.tsx:328` | emoji `📋` 用于 Banner 图标 | 建议统一用 icon 常量 |
| 2 | `BodyDashboard.tsx:380` | emoji `😴` 硬编码 | 同上 |
| 3 | `BodyDashboard.tsx:429` | emoji `📋` 硬编码 | 同上 |
| 4 | `BodyDashboard.tsx:453` | `🗣️` emoji 硬编码 | 同上 |
| 5 | `BodyDashboard.tsx:485` | emoji `🧘` 硬编码 | 同上 |
| 6 | `BodyDashboard.tsx:525` | `📝` emoji 硬编码 | 同上 |
| 7 | `BodyDashboard.tsx:552` | emoji `⚖️` 硬编码 | 同上 |
| 8 | `BodyDashboard.tsx:680` | emoji `📊` 硬编码 | 同上 |
| 9 | `BodyCheckinHistoryScreen.tsx:45` | emoji `🧘` 硬编码 | 同上 |
| 10 | `BodyCheckinHistoryScreen.tsx:82` | `📝` emoji 硬编码 | 同上 |
| 11 | `BodyPlanEditorScreen.tsx:337` | `'*'` 必填标记硬编码 | 可接受，但建议用 T('required') |
| 12 | `PlanManagementScreen.tsx:89` | emoji `📋` 硬编码 | 同上 |
| 13 | `CelebrationOverlay.tsx:114` | `🎉` emoji 在回退文案中 | 同上 |
| 14 | `BodyFlow.tsx:397` | emoji `🧠` 硬编码 | 同上 |
| 15 | `BodyFlow.tsx:34-38` | `STEP_ICONS` 使用 emoji | 同上 |
| 16 | `DayPlanCard.tsx:35` | emoji `😴` 硬编码 | 同上 |
| 17 | `DayPlanCard.tsx:113` | emoji `😴` 硬编码 | 同上 |
| 18 | `MiniWeekCalendar.tsx:77` | emoji `😴` / `🏋️` / `·` 硬编码 | 同上 |
| 19 | `BodyDashboard.tsx:391-395` | emoji `🧘` / `🧘‍♀️` / `🌬️` 硬编码 | 同上 |
| 20 | `BodyDashboard.tsx:409-418` | `String(item.value)` 直接显示数字 | 觉知值建议未来可映射为文字描述 |

---

## 汇总表（文件 → 问题数）

| 文件 | 🔴 严重 | 🟡 中等 | 🟢 提示 | 合计 |
|------|--------|--------|--------|------|
| BodyDashboard.tsx | 2 | 5 | 10 | 17 |
| CheckinSuccessCard.tsx | 1 | 1 | 0 | 2 |
| WeightTrendChart.tsx | 2 | 0 | 0 | 2 |
| BodyPlanEditorScreen.tsx | 2 | 2 | 1 | 5 |
| ExerciseCard.tsx | 3 | 5 | 0 | 8 |
| ExercisePickerGrid.tsx | 2 | 4 | 0 | 6 |
| UnifiedExercisePool.tsx | 3 | 6 | 0 | 9 |
| TemplatePickerModal.tsx | 2 | 0 | 0 | 2 |
| WeightRecordModal.tsx | 3 | 0 | 0 | 3 |
| GoalEditLightModal.tsx | 2 | 4 | 0 | 6 |
| GoalEditModal.tsx | 1 | 0 | 0 | 1 |
| CelebrationOverlay.tsx | 2 | 3 | 1 | 6 |
| PlanManagementScreen.tsx | 1 | 0 | 1 | 2 |
| BodyFlow.tsx | 1 | 1 | 2 | 4 |
| DayPlanCard.tsx | 0 | 5 | 2 | 7 |
| DayActionSheet.tsx | 0 | 6 | 0 | 6 |
| AdjustExerciseModal.tsx | 0 | 5 | 0 | 5 |
| QuickSwapModal.tsx | 0 | 10 | 0 | 10 |
| MiniWeekCalendar.tsx | 0 | 1 | 1 | 2 |
| SnackbarHost.tsx | 0 | 2 | 0 | 2 |
| BodyCheckinInline.tsx | 0 | 1 | 0 | 1 |
| BodyCheckinHistoryScreen.tsx | 0 | 0 | 2 | 2 |
| **合计** | **27** | **63** | **20** | **110** |

---

## 修复优先级建议

### P0 — 需立即修复（影响多语言用户可见文案）
1. **补充缺失的 i18n key**：以下 30+ 个 key 需添加到 `types.ts` + `zh.ts` + `en.ts` + `zh-Hant.ts`：
   `bodyUndo`, `bodyOverrideSkip`, `bodyOverrideSwap`, `bodyOverrideAdjust`, `bodyOverrideCustom`,
   `bodyPlanRemoved`, `bodyPlanRestDayHint`, `bodyPlanUnitExercise`, `bodyPlanAddedExercises`,
   `bodyStartTraining`, `bodyAdjust`, `bodyRemove`, `bodySets`, `bodyReps`, `bodyWeightUnit`,
   `bodySearchExercise`, `bodyClear`, `bodyAll`, `bodyWeekDay`, `bodyMin`,
   `bodyAdjustExercise`, `bodyDuration`, `bodyConfirm`,
   `bodySwapExercise`, `bodyRestoreDay`, `bodyMarkRest`, `bodySwapDays`, `bodyEditDayExercises`, `bodyHasOverride`,
   `bodyQuickSelect`, `bodyFromLibrary`, `bodyBack`,
   `bodyPartUpperBody`, `bodyPartLowerBody`, `bodyPartCore`, `bodyPartFlexibility`, `bodyDayRest`,
   `bodyEditGoal`, `bodyGoalStrategy`, `bodyGoalNote`, `bodySaveGoal`,
   `bodyPlanComplete`, `bodyCompletionRate`, `bodyTapToDismiss`,
   `bodyCheckinNotePlaceholder`

2. **CheckinSuccessCard.tsx 鼓励语数组**：10 条中文鼓励语需提取为 i18n key。

3. **BodyDashboard.tsx:712 引导文案**：`← 左右滑动查看更多 →` 需包裹 T()。

### P1 — 建议尽快修复（一致性/可访问性）
- 所有硬编码单位（`kg`、`%`、`天`、`分钟`、`练/周`）应使用 i18n key 或至少使用已存在的 `exerciseMin`/`weightUnitKg` 等
- `accessibilityLabel` 中的硬编码中文（`已添加`）需国际化
- 输入框占位符（`如: 70`、`如: 15`、`2026-09-30`、`3`、`10`、`0`）需国际化

### P2 — 可后续优化
- emoji 图标统一用 icon 常量或 SVG
- 数字值到文字描述的映射（觉知评分 1-5 → 很差/差/一般/好/很好）
