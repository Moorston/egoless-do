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

### Splitting a monolithic hook (>300 lines, complexity >15)

When a single hook grows too large, split it into a **composition root** + **single-responsibility sub-hooks**. The composition root stays thin (≤120 lines) and preserves the original return contract so consumers need zero changes.

**Pattern** (see `features/reflections/hooks/useQuickTrailSearch.ts`):

```tsx
// Composition root — orchestrates sub-hooks, preserves return contract
export function useBigHook(reflections, initialText, T, aiConfig?) {
  // 1. Hoist shared deps that would cause circular calls (e.g. useSearchHistory)
  const { searchHistory, addToHistory } = useSearchHistory();
  // 2. Layer sub-hooks in dependency order (state flows down, setters flow up)
  const f = useFilters(reflections, initialText);
  const r = useResults(f.candidates, f.searchQuery, addToHistory);
  const s = useSelection(f.reflectionsMap);           // before AI — setPage injected below
  const ai = useAIAnalysis(reflections, ..., { setPage: s.setPage, ... });
  // 3. Cross-layer coordination (handlers touching >1 layer)
  const handleClear = useCallback(() => { f.resetQuery(); r.reset(); ai.resetAI(); s.resetPage(); }, []);
  return { /* original fields, re-exported from sub-hooks */ };
}
```

**Rules**:
- Barrel (`hooks/index.ts`) exports only the composition root — sub-hooks stay internal
- Shared state that two sub-hooks both need → hoist to composition root, inject as arg
- Cross-layer setters → pack into an interface, inject into the sub-hook that drives them
- Sub-hook ordering matters when one injects setters into another — declare the provider before the consumer
- Each sub-hook ≤120 lines (exception: faithfully-ported complex pipelines like AI search may exceed)
- Preserve the full return contract even if some fields are unused by current consumers (forward compat)

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
- `features/reflections/hooks/useQuickTrailSearch.ts` — monolith split: 436→115-line composition root + 4 sub-hooks (filters/results/ai-analysis/selection)
