# Hook Guidelines

> Custom hook patterns for the mobile app.

---

## Overview

Custom hooks in this codebase are thin wrappers around React hooks + Expo SDKs. They own no DOM — they return state + handlers that components bind to. All hooks must be import-safe in the React Native runtime (no DOM APIs).

---

## Naming & Location

- Files: `use<Something>.ts` — each file exports one hook
- Location: colocated with the feature that owns them
  - `features/breathing/useBreathAudio.ts` — audio hook for breathing
  - `navigation/hooks.ts` — navigation hooks (cross-feature)

---

## Core Patterns

### 1. Side-effect hook (Expo SDK wrapper)

```tsx
// features/breathing/useBreathAudio.ts
import { useEffect, useRef, useCallback } from 'react';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';

export interface BreathAudioOptions {
  cueEnabled: boolean;
  voiceEnabled: boolean;
}

export function useBreathAudio(opts: BreathAudioOptions) {
  const cuePlayer = useAudioPlayer(opts.cueEnabled ? BELL_FILE : undefined);
  const lastCountRef = useRef(-1);
  // Keep latest value in ref to avoid stale closures
  const voiceEnabledRef = useRef(opts.voiceEnabled);
  voiceEnabledRef.current = opts.voiceEnabled;

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true })
      .catch(e => log.warn('audio mode failed', e));
  }, []);

  const playPhaseSound = useCallback(() => {
    try { cuePlayer.seekTo(0); cuePlayer.play(); }
    catch (e) { log.warn('phase sound failed', e); }
  }, [cuePlayer]);

  useEffect(() => () => { Speech.stop(); }, []);  // cleanup

  return { playPhaseSound, speakCount, speakPhase, resetCount };
}
```

**Rules**:
- Return a flat object of primitives/stable callbacks — not React state
- Use `useRef` for values consumed in callbacks that must stay fresh (avoid stale closures)
- Wrap Expo SDK calls in `try/catch` — log via `log.warn`, not `log.error`
- Clean up timers, subscriptions, audio sessions in `useEffect` cleanup
- Keep `useEffect` dep arrays honest — eslint exhaustive-deps is on

### 2. Navigation hook

```tsx
// navigation/hooks.ts
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export function useRootNavigation() {
  return useNavigation<NavigationProp<RootStackParamList>>();
}
```

**Rules**: One hook per navigation level; keep types in `navigation/types.ts`.

---

## Hook Composition Rules

- Screens combine multiple feature hooks — don't chain deeply
- Feature hooks own their sub-deps (Expo SDK state) and expose only what the screen needs
- Never call a hook from `@egoless-do/core` that isn't part of the public core API surface

---

## Error Handling in Hooks

- Log via `createLogger('Feature')` from `@egoless-do/core`
- `log.warn` for recoverable (audio failure, missing data)
- `log.error` for unrecoverable (database corruption, invalid state)
- Never `throw` in hooks — callers don't expect exceptions

---

## Forbidden Patterns

- ❌ Calling hooks inside `useEffect` / callbacks (React rules of hooks)
- ❌ Returning promises from hooks for the component to await — expose state instead
- ❌ Reading `store.getState()` outside slices/actions
- ❌ Hardcoded user-facing strings — always use `t()`

---

## Examples

- `features/breathing/useBreathAudio.ts` — Expo SDK + refs + cleanup
- `navigation/hooks.ts` — typed navigation hook
- `store/useAppStore.ts` (persistence patterns — see `state-management.md`)
