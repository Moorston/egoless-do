# 调身练习完成状态 UI 改进 — 实现计划

## 概述

基于 PRD 分析和工作区已有改动，新增：practiceTitle 字段、组合标题计算、完成状态视觉统一（头部行 + 重量 + ✓ 标记）。

## 执行步骤

### Step 1: BodySlice 新增 practiceTitle 字段

**文件：** `packages/core/src/store/createBodySlice.ts`

在 `BodyFlowPersistedState` 接口中新增：

```typescript
export interface BodyFlowPersistedState {
  // ... 现有字段
  practiceTitle?: string;  // 新增：练习标题（持久化）
  practiceExercises?: { ... };
  // ...
}
```

**注意：** `loadSettingsPatch()` 不做 schema 验证，新增字段自动持久化/恢复，无需其他改动。

---

### Step 2: SportPage 写入 practiceTitle（单运动模式）

**文件：** `apps/mobile/src/features/exercise/SportPage.tsx`

在单运动完成回调（`handleSaveAll` 约第 532 行）中，`setBodyFlowState` 调用增加 `practiceTitle`：

```typescript
setBodyFlowState({
  // ... 现有字段
  practiceTitle: effectiveSportLabel,  // 新增
  practiceExercises: [{
    sportKey: sportName,
    icon: icon,
    nameZh: effectiveSportLabel,
    // ...
  }],
});
```

`effectiveSportLabel` 已在作用域中（`currentEx?.nameZh || library.find(...)?.nameZh || effectiveSportName`）。

---

### Step 3: SportPage 写入 practiceTitle（组合模式）

**文件：** `apps/mobile/src/features/exercise/SportPage.tsx`

在 `handleSaveAll` 的组合模式分支（约第 462 行），增加 `practiceTitle` 计算：

```typescript
// 组合标题计算
function computeComboTitle(exercises: ExerciseResult[], T: TFunction): string {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const ex of exercises) {
    const cat = ex.category || ex.sportKey;
    if (!cat || seen.has(cat)) continue;
    seen.add(cat);
    const category = EXERCISE_CATEGORIES.find(c => c.key === cat);
    names.push(category ? T(category.i18nKey) : cat);
  }
  return `${names.join(' + ')}（${exercises.length} ${T('bodyPlanUnitExercise')}）`;
}

setBodyFlowState({
  // ... 现有字段
  practiceTitle: computeComboTitle(comboState.current.results, T),
  comboExercises: comboState.current.results,
});
```

**注意**：需要确保 `EXERCISE_CATEGORIES` 和 `T` 在作用域内。`T` 已在 `SportPage` 顶部通过 `useT()` 获取。

---

### Step 4: BodyFlow 完成状态渲染

**文件：** `apps/mobile/src/features/practice/body/BodyFlow.tsx`

#### 4a. 头部行（✅ + 标题）

替换当前只有 `✅ 运动已完成` 的区块（约第 269-271 行）：

```tsx
{/* 头部行：✅ 已完成 + 标题 */}
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 }}>
  <CheckCircle2 size={24} color="#10b981" />
  <Text style={{ fontSize: FONT_BODY(), fontWeight: '600', color: '#10b981' }}>
    {T('bodyFlowPracticeDone')}
  </Text>
  <Text style={{ fontSize: FONT_BODY(), color: TH.text, flex: 1 }} numberOfLines={1}>
    {flowState?.practiceTitle ?? currentPlan?.name ?? ''}
  </Text>
</View>
```

#### 4b. 动作列表保留重量显示

在 `planExercises` 渲染分支（约第 319-330 行），增加重量显示：

```tsx
{ex.defaultSets && ex.defaultReps && (
  <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>
    {ex.defaultSets}×{ex.defaultReps}
  </Text>
)}
{ex.defaultWeight && (
  <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>
    {ex.defaultWeight}kg
  </Text>
)}
```

#### 4c. 每行末尾加 ✓ 完成

```tsx
<Text style={{ fontSize: FONT_SMALL(), color: '#10b981' }}>
  ✓ {T('bodyCompleted') ?? '完成'}
</Text>
```

**注意：** 如果 `bodyCompleted` i18n key 不存在，需新增或使用内联文字 `✓ 完成`。

---

### Step 5: i18n 补全（如需要）

**文件：** `packages/core/src/i18n/zh.ts`, `en.ts`, `zh-Hant.ts`, `types.ts`

如果 `bodyCompleted` key 不存在，新增：

```typescript
// types.ts
bodyCompleted: string;

// zh.ts
bodyCompleted: '完成';

// en.ts
bodyCompleted: 'Done';

// zh-Hant.ts
bodyCompleted: '完成';
```

---

## 验证命令

```bash
# TypeScript 类型检查
pnpm run type-check

# 单元测试
pnpm run test -- --filter="packages/core"

# 如果测试文件受影响
pnpm run test
```

## 回滚点

- Step 1 后：`git diff packages/core/src/store/createBodySlice.ts`
- Step 3 后：`git diff apps/mobile/src/features/exercise/SportPage.tsx`
- Step 4 后：`git diff apps/mobile/src/features/practice/body/BodyFlow.tsx`

## 质量门禁

| 检查项 | 通过标准 |
|--------|---------|
| 类型检查 | `pnpm run type-check` 无错误 |
| 单运动完成状态 | 显示 ✅ 已完成 + 标题 + 统计 + 重量 + ✓ 完成 |
| 组合模式完成状态 | 显示 ✅ 已完成 + 分类组合标题 + 统计 + ✓ 完成 |
| 持久化 | 关闭 app 重开，完成状态仍显示标题 |
| 防御性降级 | 无 `practiceTitle` 时不崩溃，fallback 到计划名称 |
| 组合标题去重 | 3 个动作都属同一分类时，标题不重复显示分类名 |