# 调身练习完成状态 UI 详细分析

## 当前渲染逻辑

```
practiceCompleted = true
  │
  ├── ✅ CheckCircle2 (48px) + "运动已完成"
  │
  ├── planExercises.length > 0 ?      ← 训练计划中的动作列表
  │   └── 显示列表：icon + nameZh + sets×reps
  │
  └── flowState.isCombo && comboExercises.length > 0 ?   ← 组合模式实际完成的动作
      └── 显示列表：N 个动作 + icon + nameZh + duration
```

## 三种可能的状态

### 状态 A：单运动模式 + planExercises 有数据
```
✅ 运动已完成
┌─────────────────────┐
│ 🏋️ 杠铃卧推   4×10  │
│ 🏋️ 哑铃飞鸟   3×12  │
│ 🏋️ 绳索下压   3×15  │
└─────────────────────┘
```
**目前 OK**：显示动作列表，`nameZh` 有回退逻辑

### 状态 B：单运动模式 + planExercises 为空
```
✅ 运动已完成
```
**问题**：无动作列表，只有 ✅ 图标和文字，用户看不到任何练习记录

### 状态 C：组合模式
```
✅ 运动已完成
┌─────────────────────┐
│ 🏋️ 杠铃卧推   4×10  │  ← planExercises（可能为空）
└─────────────────────┘
┌─────────────────────┐
│ 3 个动作             │
│ 🦵 杠铃深蹲   3:00  │  ← comboExercises（实际完成的）
│ 🏋️ 杠铃卧推   2:30  │
│ 🧱 平板支撑   1:00  │
└─────────────────────┘
```
**问题 1**：`planExercises` 和 `comboExercises` 可能同时显示，内容重复
**问题 2**：组合模式总时长和总消耗仅显示在 `comboExercises` 列表中

## 数据来源分析

### planExercises 的来源
```
currentPlan?.exercises ?? []
  │
  ├── trainingPlanTask.task.exercises      ← 训练计划任务中的动作
  │     └── 可能为空（任务只定义了 sportKey，无具体动作）
  │
  └── buildExerciseLibrary().filter(category)  ← 从动作库按分类查找
        └── 可能为空（分类在库中无匹配动作）
```

### comboExercises 的来源
```
flowState.comboExercises
  │
  └── SportPage 的 goToNextExercise() 中创建
        └── ExerciseResult { sportKey, icon, nameZh, durationSec, calories, reps }
              └── nameZh 来自：currentEx.nameZh || library.find(category) || effectiveSportName
```

### 关键问题：planExercises 可能为空

当 `trainingPlanTask.task.exercises` 为空且 `buildExerciseLibrary()` 没有找到对应分类的动作时，`planExercises` 为 `[]`，完成状态只显示 ✅。

## 具体 UI 缺陷

### 1. 完成状态缺少标题
当前只有 "运动已完成" 文字，没有显示练习的分类名称（如"腿部训练"）。用户需要回想刚才做了什么。

### 2. 无统计数据
- 不显示总时长（`flowState.practiceDurationSec` 或 `flowState.totalDurationSec`）
- 不显示总消耗卡路里（`flowState.totalCalories`）
- 不显示动作数量

### 3. 动作列表视觉层次弱
- 使用 `FONT_SMALL()`（最小字号），可读性差
- 无背景色区分（`${TH.border}30` 透明度低）
- 行间距小（`paddingVertical: 3`），密集

### 4. 组合模式列表重复
- `planExercises` 显示的是"计划中的动作"
- `comboExercises` 显示的是"实际完成的动作"
- 两者都可能显示，造成重复

### 5. 完成状态与未完成状态的视觉差异
- 未完成状态：Card 有完整布局（计划名称 + 动作列表 + 按钮）
- 完成状态：Card 内容简化，只显示 ✅ + 列表
- 过渡突兀，用户可能感觉"少了什么"

## 数据流问题

### 单运动模式缺少"实际完成"记录
```
SportPage 完成单运动
  → setBodyFlowState({ exerciseCompleted: true, practiceCompleted: true, practiceDurationSec })
  → flowState 中没有记录"具体做了什么动作"
  → 完成状态只能从 planExercises 读取"计划中的动作"
  → 如果 planExercises 为空，则无动作可显示
```

### 组合模式 nameZh 传递链
```
BodyFlow 传递 exercises (ExerciseDef[])
  → SportPage 接收 route.params.exercises
  → goToNextExercise() 创建 ExerciseResult
  → ExerciseResult.nameZh 来自 currentComboExercise?.nameZh
  → 如果 nameZh 为空 → 回退到 library.find(category)?.nameZh
  → 如果仍为空 → 回退到 effectiveSportName (category key)
  → 存入 flowState.comboExercises
  → BodyFlow 完成状态读取 flowState.comboExercises
  → 显示 ex.nameZh || ex.sportKey
```

## 建议的 UI 改进

### 改进 1：增加统计横幅
```
✅ 运动已完成
┌─────────────────────────────┐
│   总时长     动作数    消耗   │
│   15:30      5个      180kcal │
└─────────────────────────────┘
```

### 改进 2：增加分类标题
```
✅ 运动已完成
📋 腿部训练（5 个动作）
┌─────────────────────┐
│ 🦵 杠铃深蹲   4×10  │
│ 🏋️ 硬拉      3×8   │
│ 🦵 腿举      3×12  │
└─────────────────────┘
```

### 改进 3：组合模式只显示 comboExercises
当 `flowState.isCombo` 为 true 时，隐藏 `planExercises` 列表，只显示 `comboExercises`。

### 改进 4：单运动模式增加 practiceExercises
在 `flowState` 中增加 `practiceExercises` 字段，记录本次练习的具体动作列表。

### 改进 5：视觉增强
- 增大字号（`FONT_BODY` 替代 `FONT_SMALL`）
- 增加背景色对比度
- 增加行间距

## 当前代码中的具体问题位置

| 行 | 问题 | 代码 |
|----|------|------|
| 275-288 | `planExercises.length > 0` 条件可能不满足 | `{planExercises.length > 0 && (...)}` |
| 290-305 | `comboExercises` 与 `planExercises` 可能同时显示 | 无互斥条件 |
| 281 | `nameZh` 回退链过长 | `ex.nameZh \|\| library.find(...)?.nameZh \|\| ex.sportKey` |
| 273 | 无统计数据 | 只有 `bodyFlowPracticeDone` 文字 |
| 280 | 字号过小 | `FONT_SMALL()` |
| 282 | 组数次数格式与未完成状态不一致 | 完成状态：`FONT_SMALL()`；未完成：内联文字 |