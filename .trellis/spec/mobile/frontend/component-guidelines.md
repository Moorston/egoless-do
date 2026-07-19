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
