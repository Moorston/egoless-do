# Type Safety

> Type patterns in the mobile app.

---

## Overview

Types flow from `@egoless-do/core` (sole source of truth) into `apps/mobile`. Mobile screens rarely define their own business types — they consume:
- Slice types (`AuthSlice`, `HabitSlice`, ...) from `@egoless-do/core/store/*`
- Entity types from `@egoless-do/core/types/*`
- Constants from `@egoless-do/core/constants.ts`
- i18n key types from `@egoless-do/core/i18n/types.ts`

---

## Type Location Rules

| Type | Lives in | Imported by |
|------|----------|-------------|
| Business entities (Habit, Reflection, Plan, ...) | `packages/core/src/types/` | mobile + web + core |
| State shapes | `packages/core/src/store/*Slice.ts` | consumers of slices |
| API contracts | `packages/core/services/*` | mobile + web |
| i18n keys | `packages/core/i18n/types.ts` | all UI |
| Navigation | `apps/mobile/src/navigation/types.ts` | mobile only |

**Rule**: If a type is used in more than one place, it belongs in `@egoless-do/core`. Mobile-specific types (e.g., navigation params) stay in mobile.

---

## Type Imports

```tsx
// ✅ Do this
import type { BreathingPreset, BreathPhaseType } from '@egoless-do/core';
import type { RootStackParamList } from '../../navigation/types';

// ❌ Don't define these locally
interface LocalBreathPreset { ... }  // wrong location
```

Rules:
- Always use `import type` for types that are only used at compile time
- Never duplicate types from core into a screen file

---

## Type Discrimination

Union types use a discriminator:

```tsx
// packages/core/src/business/breathing.ts
export type BreathPhaseType = 'inhale' | 'hold' | 'exhale';
export type GuideStyle = 'scientific' | 'spiritual';
```

When branching on a discriminant, use `switch` with exhaustive checking.

---

## Type Narrowing

External data (from SQLite, API responses) must be narrowed before use:

```tsx
// ✅ Validate external data
const raw = await db.query(...);
const validated = EntitySchema.parse(raw);  // Zod at the boundary

// ❌ Blind trust
const habit = rawData as Habit;            // bad — no runtime validation
```

Rules:
- Use `Zod` schemas (`@egoless-do/core` provides them) for API/SQLite boundaries
- Never use `as` to force a type when data originates from a runtime source

---

## Generic Patterns

Generic utilities live in `@egoless-do/core`:

```tsx
// e.g., slice factory pattern
export function createXxxSlice(adapter: StorageAdapter, triggerSync: () => void) {
  return (set, get) => ({ /* slice */ });
}
```

Mobile composes these factories — it rarely defines its own generic utilities.

---

## Forbidden Patterns

- ❌ `any` — use `unknown` + narrowing, or move type to core
- ❌ `as X` cast when narrowing is possible
- ❌ `@ts-ignore` / `@ts-expect-error` without a documenting comment explaining why
- ❌ Redeclaring a type from `packages/core` in a screen file (violates single source of truth)
- ❌ Defining entity types in mobile — they belong in core

---

## Examples

- `packages/core/src/business/breathing.ts` — type discriminated unions
- `packages/core/src/i18n/types.ts` — exhaustive i18n key type
- `apps/mobile/src/navigation/types.ts`- — local navigation param list (mobile-only type)
