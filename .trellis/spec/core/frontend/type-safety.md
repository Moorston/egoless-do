# Type Safety

> Type patterns in `@egoless-do/core`.

---

## Overview

Core is the **sole source of truth** for business types. All apps (mobile, web) import types from here. One rule: **no type duplication across packages**.

---

## Type Export Structure

```ts
// packages/core/src/types.ts — barrel re-exports
export type { Habit, HabitLog } from './types/habit';
export type { Reflection } from './types/reflection';
export type { FastingSession } from './types/fasting';
export type { StorageAdapter, SyncEntity, SyncDelta } from './store/types';
```

Every domain entity has its own file in `types/`:

```
types/
├── auth.ts          # AuthResponse, RefreshResponse, etc.
├── habit.ts         # Habit, HabitModuleState, CreateHabitForm
├── reflection.ts    # Reflection, etc.
├── fasting.ts       # FastingSession, StopFastingOpts
├── sleep.ts, food.ts, exercise.ts, ...
├── music.ts         # MusicCategoryMeta
└── ...
```

---

## Type Location Rules

| Used by | Lives in |
|---------|----------|
| Multiple packages (mobile, web, core) | `packages/core/src/types/` |
| Mobile-only | `apps/mobile/src/navigation/types.ts` |
| Web-only | `apps/web/...` (deprecated) |

**Rule**: If the same shape exists in two places, it should be lifted to core.

---

## Discriminated Unions

Prefer union types with a discriminant:

```ts
// business/breathing.ts
export type BreathPhaseType = 'inhale' | 'hold' | 'exhale';
export type GuideStyle = 'scientific' | 'spiritual';

export interface BreathPhase {
  type: BreathPhaseType;
  durationSec: number;
}
```

Use exhaustive `switch`:
```ts
export function phaseLabelKey(type: BreathPhaseType): string {
  switch (type) {
    case 'inhale': return 'breathInhale';
    case 'hold': return 'breathHold';
    case 'exhale': return 'breathExhale';
  }
}
```

---

## Slice Types

Every slice has an interface exported from `store/types.ts`:

```ts
export interface HabitSlice {
  habits: Habit[];
  addHabit(form: CreateHabitForm): void;
  updateHabit(id: string, patch: Partial<Habit>): void;
  // ...
}
```

**Rule**: The slice interface must enumerate all state fields and action signatures. This enables TypeScript to validate slice composition at the call site.

---

## Zod Validation at Sync Boundary

Core exports Zod schemas in `sync/entitySchemas.ts`:

```ts
export const HabitSchema = z.object({
  id: z.string(),
  name: z.string(),
  // ...
});
```

**Rule**: Validate external data (from SQLite, PocketBase, API) with `.parse()` or `.safeParse()` before use. Never trust runtime data as typed.

---

## Forbidden Patterns

- ❌ `any` — use `unknown` + narrowing (Zod for runtime, type guards for compile-time)
- ❌ `as X` casts on runtime data
- ❌ `@ts-ignore` without comment
- ❌ Redeclaring core types in app files (always import from core)
- ❌ Optional chaining abuse for data that should be required (`a?.b?.c?.d`)

---

## Examples

- `types/habit.ts` — entity type + form type co-located
- `i18n/types.ts` — exhaustive I18nKey type (1053 entries)
- `business/breathing.ts` — discriminated unions
- `sync/entitySchemas.ts` — Zod boundary validation
- `store/types.ts` — slice interface full enumeration
