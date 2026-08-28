# Component Guidelines

> Component patterns, theming, and composition rules for the mobile app.

---

## Overview

Components use:
- **React Native + Expo** — no HTML/DOM
- **Centralized theming** via `useTheme()` / `THEMES` from `@egoless-do/core`
- **i18n** via `useT()` / `t()`
- **Design tokens** (font sizes, colors) from `@egoless-do/core`
- **lucide-react-native** for icons

---

## Screen Component Pattern

Root-level screens registered with React Navigation:

```tsx
// features/breathing/BreathingScreen.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useT } from '../../components/UI';
import { useAppStore } from '../../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { createLogger } '@egoless-do/core';

const log = createLogger('Breathing');

export default function BreathingScreen() {
  const TH = useTheme();
  const T = useT();
  // ✅ Select minimal state via useShallow — prevents unnecessary re-renders
  const { addBreathRecord, addMedMinutes } = useAppStore(useShallow(s => ({
    addBreathRecord: s.addBreathRecord,
    addMedMinutes: s.addMedMinutes,
  })));
  // Animated values must be in useRef
  const animRef = useRef(new Animated.Value(0)).current;
  // ...
}
```

### Rules:
- Default export (no named export) for navigation registration
- Read theme/i18n via hooks at component top
- Read store **minimally via `useShallow`** — select only needed fields
- Use `useRef` for animation values, stable callbacks, and preserving render state
- Use `useCallback` for event handlers referenced in `useEffect` deps
- Use `useMemo` for expensive computed values

---

## Shared Component Pattern

Reusable components in `components/`:

```tsx
// components/ErrorBoundary.tsx — wraps children, catches render errors
export function ErrorBoundary(props: Props) {
  const T = useT();
  return <_ErrorBoundary {...props} t={T} />;
}
```

### Shared primitives from `components/UI.tsx`:
- `Card`, `PrimaryButton`, `SecondaryButton`, `OutlineButton`
- `Header`, `Fab`, `StatCard`
- `useTheme()`, `useT()`

Rules:
- Must accept `style?: ViewStyle` prop for customization
- Must consume `useTheme()` inline (return value is already stable)
- Props types match `ViewStyle` / `TextStyle` — do not invent wrapper prop types

---

## Forbidden Patterns

- ❌ `className`, `Tailwind`, `styled-components` — this is React Native
- ❌ `useContext` for global state — use `useAppStore` via slices
- ❌ `Animated.Value` outside `useRef` — causes stale refs
- ❌ Local state mirroring store state — derive via selector instead
- ❌ Side effects in render body — all side effects must be in `useEffect`/handlers

---

## Interaction Patterns

### Toggle-to-Add with Snackbar Undo

用于快速添加/移除操作（如动作选择），零确认步骤 + 撤销兜底：

```tsx
// ExercisePickerGrid: tap = toggle, no confirm step
const handleToggle = useCallback((exId: string) => {
  setSelected(prev => {
    const next = new Set(prev);
    const isAdding = !next.has(exId);
    if (isAdding) next.add(exId); else next.delete(exId);
    onShowSnackbar(isAdding ? 'added' : 'removed', exId);
    return next;
  });
}, [onShowSnackbar]);

// SnackbarHost: 5s auto-dismiss + undo button
// Usage: <SnackbarHost snackbar={snackbar} onUndo={handleUndo} />
```

**Rules:**
- Toggle 操作必须有即时视觉反馈（checkmark + 高亮/暗化）
- 必须有 Snackbar 撤销兜底（5s 内可撤回）
- 不可用两步确认（如"选 + 添加/确认"）

### Inline Editing (Avoid Modal)

简单数值编辑（组数/次数/重量）使用内联输入框，而非 Modal：

```tsx
// ExerciseCard: blur/enter save, no modal
{isEditing ? (
  <View style={styles.inlineRow}>
    <TextInput value={sets} onChangeText={setSets} keyboardType="numeric" />
    <Text>{T('bodySets')}</Text>
    <TextInput value={reps} onChangeText={setReps} keyboardType="numeric" />
    <Text>{T('bodyReps')}</Text>
  </View>
) : (
  <TouchableOpacity onPress={() => setIsEditing(true)}>
    <Text>{sets}×{reps}</Text>
  </TouchableOpacity>
)}
```

**Rules:**
- 仅用于 2-4 个数值字段的简单编辑
- blur 或 Enter 自动保存，无需确认按钮
- 超过 4 个字段或需要复杂选择 → 仍用 Modal

### Inline Editing (Stars / Chips — Explicit Save)

Star ratings and chip selections that need explicit confirmation (not blur-save):

```tsx
// SleepSummaryCard: star rating + work-state chips, explicit save
const [editing, setEditing] = useState(false);
const [draftQuality, setDraftQuality] = useState(0);
const [draftWorkState, setDraftWorkState] = useState<WorkState | null>(null);

const enterEditMode = useCallback(() => {
  setDraftQuality(todaySleep?.quality ?? 0);
  setDraftWorkState(todaySleep?.workState ?? null);
  setEditing(true);
// eslint-disable-next-line react-hooks/exhaustive-deps -- read fields inside setter
}, []);

const handleSave = useCallback(() => {
  if (draftQuality === 0) return; // quality required
  onSaveQuickDiary(draftQuality, draftWorkState ?? undefined);
  setEditing(false);
}, [draftQuality, draftWorkState, onSaveQuickDiary]);

// Empty-state stars: clicking enters edit mode (NOT direct rating)
<TouchableOpacity onPress={enterEditMode}>
  {renderStars(0, 28, false, enterEditMode)} // onStarPress handled per-star
</TouchableOpacity>

// Edit-state stars: clicking selects quality
{draftQuality > 0 ? renderStars(draftQuality, 24) : null} // read-only display
{renderStars(draftQuality, 32, true)}                     // interactive edit
```

**Rules:**
- Empty-state stars are affordances, NOT interactive inputs — clicking enters edit mode
- Edit-state stars are interactive — clicking sets the draft quality
- Always pair with an explicit "Save" button (quality=0 disables it)
- "Cancel" discards the draft — do NOT save on blur
- Pre-fill drafts from existing data when entering edit mode

**Reference:** `features/sleep/SleepSummaryCard.tsx` (inline editing for quality + work-state)

### Expand/Collapse Card with LayoutAnimation

卡片折叠/展开动画使用 `LayoutAnimation.configureNext`（不引入额外动画库）：

```tsx
import { LayoutAnimation } from 'react-native';

const handleToggle = useCallback(() => {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  setExpanded(prev => !prev);
}, []);
```

**Rules:**
- 使用 `LayoutAnimation.Presets.easeInEaseOut`（250ms）
- 无需手动 Animated.Value，LayoutAnimation 处理所有子元素动画
- 折叠态和展开态应有明显视觉区分（概要行 vs 完整内容）

### Mini Calendar / Heatmap Navigation

横向周历组件：色块表示训练状态，点击跳转：

```tsx
// MiniWeekCalendar: horizontal ScrollView + colored blocks
// Color mapping: rest=gray / empty=light border / has-intensity=primary gradient
// Auto-scroll to active day via scrollRef
```

**Rules:**
- 使用 `ScrollView` + `ref.scrollTo()` 实现自动滚动到选中日
- 色块颜色映射：`rest=gray` / `empty=lightBorder` / `withIntensity=primaryGradient`
- 高度 60-80px，紧凑布局

### Combo Workout (Multi-Exercise Session)

组合锻炼模式：SportPage 内部按顺序执行多个动作，每个动作独立计时/计数，完成后自动过渡到下一个。

**架构**：不新建页面，在 SportPage 内部通过 `comboState ref` 管理多动作切换。

```tsx
// 1. 路由参数扩展（navigation/types.ts）
Sport: { key: string; icon: string; color: string; gps?: boolean; planId?: string; planTaskWeekday?: number; exercises?: ExerciseDef[]; comboPlanId?: string };

// 2. 组合状态管理（SportPage.tsx）
const comboState = useRef({
  exercises: ExerciseDef[],
  currentIndex: number,
  results: ExerciseResult[],
  totalDurationSec: number,
  totalCalories: number,
});

// 3. 动作切换（goToNextExercise）
// - 保存当前动作结果到 store（addExercise）
// - 累加总时长/总热量
// - 重置 hooks（timer.reset(), sets.reset()）
// - 进入过渡页或全部完成
```

**组件**：
- `ComboProgressHeader` — 顶部进度条 + 可展开动作列表（已完成 ✅ / 当前 ▶ / 未开始 ○）
- `TransitionScreen` — 动作间过渡页（休息倒计时 + 当前摘要 + 下一动作预览）

**规则**：
- hooks 必须暴露 `reset()` 方法以支持动作间状态重置
- 每个动作完成时立即 `addExercise` 保存到 store，防止中途退出丢失数据
- 全部完成后一次性返回 BodyFlow 聚合结果（`sportKey: 'combo'`, `isCombo: true`, `exercises: [...]`）
- 单运动场景向后兼容（无 `exercises` 参数时走原有流程）
- 休息时间按动作类型自适应：strength=60s, traditional/flexibility=15s, cardio=30s

### Unified Exercise Pool with Multi-Day Assignment

屏幕级统一动作池，替代 per-day 的选择器，支持批量分配到多天：

```tsx
// UnifiedExercisePool: screen-level grid with day checkboxes
<UnifiedExercisePool
  TH={TH}
  T={T}
  exerciseLibrary={exerciseLibrary}
  dayTasks={dayTasks}          // Map<weekday, ExerciseDef[]>
  activeDay={activeDay}
  selectedDays={selectedDays}
  selectedEx={dayChooserEx}
  onDayChooserChange={setSelectedDays}
  onDayChooserSetEx={setDayChooserEx}
  onAddToDays={handleAddToDays}
/>
```

**Rules:**
- 统一池是唯一的添加动作入口，不在 per-day 视图内重复
- 天勾选列表使用紧凑的 7 天复选框（Mon Tue Wed ...），预勾选当前展开的天
- 冲突检测：使用 `nameZh`（库标识符）而非生成的 `id` 匹配，因为计划中的动作 ID 是动态生成的
- 批量分配后 500ms debounce 自动保存，无需确认步骤
- 已存在动作的天显示 dimmed checkbox + snackbar 提示跳过数量

### Splitting a monolithic screen component (complexity >15, >300 lines)

When a single screen/feature component exceeds ESLint `complexity` ≤15 or grows beyond ~300 lines, split it into **tab/section sub-components** via **move-only extraction**. The parent stays as a thin orchestration layer; sub-components receive pre-computed data via props and render JSX.

**Pattern** (see `features/plan/PlanDetailContent.tsx` → `components/DetailTabContent.tsx` + `TodoTabContent.tsx` + `PlanActionBar.tsx`):

```tsx
// Parent — orchestration only (hooks, memo, state, early return)
export default function BigScreen({ id, onClose }: Props) {
  const TH = useTheme();
  // 1. All hooks stay in parent (useState, useMemo, useEffect, custom hooks)
  const plan = useMemo(() => findPlan(...), [plans, id]);
  const items = useMemo(() => getPlanItems(...), [planItems, id]);
  const { todayItems, toggleItem, ... } = useDailyTodo(plan, today);
  // 2. Pre-compute everything sub-components need
  const sortedItems = useMemo(() => sortItems(items, getItemEffectiveStatus), [...]);
  // 3. Early return AFTER all hooks
  if (!plan) return <Card><Text>{T('notFound')}</Text></Card>;
  // 4. Render sub-components — pass pre-computed results as props
  return (
    <ScrollView>
      {tab === 'detail' ? (
        <DetailTabContent plan={plan} items={items} sortedItems={sortedItems}
          renderItemRow={renderItemRow} showHeatmap={showHeatmap} ... />
      ) : (
        <TodoTabContent todayItems={todayItems} toggleItem={toggleItem} ... />
      )}
      <PlanActionBar plan={plan} editable={editable} ... />
    </ScrollView>
  );
}

// Sub-component — presentational only, receives data via props
export function DetailTabContent({ plan, items, sortedItems, renderItemRow, ... }: DetailTabContentProps) {
  const TH = useTheme();
  const T = useT();
  // ✅ No hooks beyond useTheme/useT — no useState/useMemo for business logic
  // ✅ Derived values that depend only on props are fine:
  const totalDays = Math.round((new Date(plan.endDate).getTime() - new Date(plan.startDate).getTime()) / MS_PER_DAY) + 1;
  return (<>... JSX moved verbatim from parent ...</>);
}
```

**Move-only rules** (strict):
- **JSX 逐行搬移**：sub-component JSX is copied character-for-character from the parent — no rewrites, no "improvements"
- **计算留在父组件**：all `useMemo`/`useCallback`/custom hooks stay in the parent; results pass down as props
- **子组件不复制逻辑**：sub-components receive pre-computed data; they do NOT re-derive it from raw store state
- **Props 契约稳定**：sub-component props interface is typed explicitly (`export interface XxxTabContentProps`)
- **消费方零改动**：the parent's export signature and call sites are unchanged
- **共享样式提取**：`StyleSheet.create` definitions move to a shared `styles.ts`; all sub-components import from it

**Rules**:
- Sub-components go in a `components/` sub-directory within the feature (e.g. `features/plan/components/`)
- Parent function complexity must drop to ≤15 after extraction
- Sub-components MAY exceed complexity 15 (conditional rendering is inherent to presentational components) — annotate with `// eslint-disable-next-line max-lines-per-function` if also >300 lines
- `renderItemRow` and similar callback props pass through as-is — do not re-wrap
- Toggle/expand state (`showHeatmap`, `showRelated`) lives in parent; setter passed as prop
- Sub-component files import types from `@egoless-do/core` directly (not re-exported via parent)

**Extraction order** (when multiple sub-components): extract one at a time, verify (lint + tsc + tests) after each, commit as checkpoint. Extract from the bottom of the JSX tree upward so earlier line numbers don't shift.

### Module-level pure functions to shed residual complexity (after sub-component extraction)

When sub-component extraction is exhausted but the parent's main function **still** exceeds complexity ≤15, the residual cost is almost always **nested ternaries and logical expressions sitting directly in the function body or JSX** (`?:`, `?.`, `&&`, `||`). Each is a branch point ESLint counts against the enclosing function. Move these derivations into **module-level pure functions** outside the component — their internal branches count toward the helper's complexity, not the parent's.

**Pattern** (see `features/home/screens/HomeScreen.tsx` — complexity 49 → 15):

```tsx
// Module level, above the component — branches live here, not in HomeScreen
type CheckinStatus = 'draft' | 'done' | 'editing';

function computeCheckinStatus(record: CheckinEntry | undefined): CheckinStatus {
  return record ? (record.done ? 'done' : 'editing') : 'draft';   // 2 branches, counted here
}

function computeIsReadOnly(isToday: boolean, isLocked: boolean): boolean {
  return !isToday || isLocked;                                     // || counted here
}

function computeCardTitle(status: CheckinStatus, isReadOnly: boolean,
  isToday: boolean, viewDateLabel: string, T: (k: string) => string): string {
  if (isReadOnly) return isToday && status === 'done' ? '今日目标已达成 👍' : viewDateLabel;
  return isToday ? T('checkinDoneToday') : viewDateLabel;
}

export default function HomeScreen() {
  // ...hooks/memo/state stay...
  const status = computeCheckinStatus(todayRecord);       // was: inline nested ternary
  const isReadOnly = computeIsReadOnly(isToday, isLocked); // was: !isToday || isLocked
  const cardTitle = computeCardTitle(status, isReadOnly, isToday, viewDateLabel, T);
  // JSX now references cardTitle / bannerStatusText / bannerTimeText — no inline ?:
  return (<Text>{cardTitle}</Text> ...);
}
```

**Rules**:
- Helpers are **module-level `function`s** (not `useCallback`/`useMemo` — those wrap in the component body and their branches still count toward the parent). Pure functions at module scope have their own complexity budget.
- Move only the **derivation** — the inputs (`todayRecord`, `isToday`, `T`, …) stay computed in the component; the helper receives them as args. No store reads inside the helper.
- Optional chaining `a?.b` in JSX counts as a branch — wrap the whole expression in a helper (`computeBannerTimeText(record, language)` beats `record?.timestamp ? formatTime(...) : ''` inline).
- This is **complementary** to sub-component extraction, not a replacement: extract JSX into components first, then shed the residual ternary complexity with module-level functions. Each step verified independently.
- Helpers that the parent already had (`parseWeight`, `formatTime`) are reused — don't re-wrap them.

---

## Logging

Use `@egoless-do/core`'s `createLogger`:

```tsx
import { createLogger } from '@egoless-do/core';
const log = createLogger('Breathing');  // feature name as context
log.warn('audio mode failed', e);        // recoverable
log.error(err, { message: 'sqlite error' }); // unrecoverable
```

---

## Examples

- `components/ErrorBoundary.tsx` — class component wrapper with hooks i18n injection
- `components/UI.tsx` — shared primitives + theme/i18n hooks
- `features/breathing/BreathingScreen.tsx` — screen + rAF animation
- `features/breathing/useBreathAudio.ts` — audio hook pattern
- `features/plan/PlanDetailContent.tsx` — monolithic screen split into tab sub-components (move-only extraction)
- `features/plan/components/DetailTabContent.tsx` — presentational sub-component receiving pre-computed props
