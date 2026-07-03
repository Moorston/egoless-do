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
