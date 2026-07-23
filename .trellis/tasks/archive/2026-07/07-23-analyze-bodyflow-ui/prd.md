# 调身练习完成状态 UI 详细分析与设计方案

## 当前渲染逻辑（原始代码）

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

## 工作区已实现

- 统计横幅：总时长 / 动作数 / 消耗 kcal
- 优先级链：comboExercises > practiceExercises > planExercises（互斥）
- 视觉增强：FONT_BODY、分隔线、图标 20px
- SportPage 单运动写入 practiceExercises
- FlowState + BodySlice 新增 practiceExercises 字段

## 本次设计新增（2026-07-23 探索决定）

### 完成状态最终布局

#### 单运动模式

```
┌─ Card ─────────────────────────────────────────────┐
│  ✅ 已完成  📋 腿部训练              ← 同一行左对齐  │
│                                                      │
│  ┌── 统计横幅 ──────────────────────────────────┐   │
│  │  总时长: 15:30   动作: 3个   消耗: 180kcal    │   │
│  └───────────────────────────────────────────────┘   │
│                                                      │
│  ┌── 动作列表 ──────────────────────────────────┐   │
│  │  🦵 杠铃深蹲   4×10  80kg           ✓ 完成   │   │
│  │  🏋️ 硬拉       3×8   100kg          ✓ 完成   │   │
│  │  🦵 腿举       3×12  60kg           ✓ 完成   │   │
│  └───────────────────────────────────────────────┘   │
│                                                      │
│  [▶ 呼吸练习 →]                                      │
└──────────────────────────────────────────────────────┘
```

#### 组合模式

```
┌─ Card ─────────────────────────────────────────────┐
│  ✅ 已完成  🔥 腿+核心 + 肩+手臂（3 个动作）        │
│                                                      │
│  ┌── 统计横幅 ──────────────────────────────────┐   │
│  │  总时长: 15:30   动作: 3个   消耗: 180kcal    │   │
│  └───────────────────────────────────────────────┘   │
│                                                      │
│  ┌── 动作列表 ──────────────────────────────────┐   │
│  │  🦵 杠铃深蹲   3:00                ✓ 完成   │   │
│  │  🧱 平板支撑   1:00                ✓ 完成   │   │
│  │  🏋️ 哑铃推举   2:30                ✓ 完成   │   │
│  └───────────────────────────────────────────────┘   │
│                                                      │
│  [▶ 呼吸练习 →]                                      │
└──────────────────────────────────────────────────────┘
```

### 设计决定

| 决定 | 结论 |
|------|------|
| 重量显示 | 保留（与未完成状态一致） |
| ✓ 完成标记 | 必须添加，每行末尾 |
| 组合模式列表格式 | 用 duration（与单运动的 sets×reps 不同，不同格式不需要统一） |
| 组合标题 | 去重后的分类名，用 ` + ` 连接，追加 `（N 个动作）` |
| visualTitle | 持久化到 flowState.practiceTitle |
| 头部行 | ✅ 已完成 + 标题，同一行左对齐 |
| 组合标题文案 | `✓ 完成`（含文字） |

### practiceTitle 数据流

```
SportPage 完成时
  ├─ 单运动：practiceTitle = effectiveSportLabel
  │   (currentEx.nameZh → library.find → effectiveSportName)
  └─ 组合：  practiceTitle = computeComboTitle() + "（N 个动作）"
       ↓
setBodyFlowState({ practiceTitle, ... })
  → adapter.persistSettings('bodyFlowState', ...)
  → SQLite app_state 表（SETTINGS_KEYS 中已有 'bodyFlowState'）

BodyFlow 渲染时
  ├─ flowState?.practiceTitle 存在 → 直接使用
  └─ 不存在 → 防御性降级（从 store 推导）
```

### 持久化确认

`loadSettingsPatch()` 不做 Zod schema 验证，直接 JSON.parse 后放入 store。`practiceExercises` 和 `practiceTitle` 都会天然被持久化和恢复，**不需要额外改动**。

### 组合标题计算逻辑

```typescript
function computeComboTitle(exercises: ExerciseResult[], T: TFunction): string {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const ex of exercises) {
    const cat = ex.category || ex.sportKey;
    if (!cat || seen.has(cat)) continue;
    seen.add(cat);

    const category = EXERCISE_CATEGORIES.find(c => c.key === cat);
    if (category) {
      names.push(T(category.i18nKey)); // "腿+核心", "胸+三头"...
    } else {
      names.push(cat);
    }
  }

  return `${names.join(' + ')}（${exercises.length} ${T('bodyPlanUnitExercise')}）`;
}
```

### 改动清单

| # | 文件 | 改动 |
|---|------|------|
| 1 | `packages/core/src/store/createBodySlice.ts` | `BodyFlowPersistedState` 加 `practiceTitle?: string` |
| 2 | `apps/mobile/src/features/exercise/SportPage.tsx` | 单运动完成时写入 `practiceTitle`；组合模式写入 `computeComboTitle(...)` |
| 3 | `apps/mobile/src/features/practice/body/BodyFlow.tsx` | 完成状态渲染：头部行（✅ + 标题）、动作列表保留重量、每行末尾加 `✓ 完成` |
| — | `packages/core/src/i18n/*` | 无需改动（已是短名） |

### 验收标准

1. 单运动完成状态显示 ✅ 已完成 + 标题（同一行）
2. 单运动动作列表保留重量显示（80kg, 100kg...）
3. 每个动作末尾显示 ✓ 完成
4. 组合模式标题为去重分类名 + "（N 个动作）"
5. 组合模式动作列表显示 duration（非 sets×reps）
6. practiceTitle 持久化，关闭 app 后重新打开仍显示
7. 无 practiceTitle 时防御性降级，不崩溃