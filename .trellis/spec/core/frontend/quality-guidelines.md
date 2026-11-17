# Quality Guidelines

> Code quality standards for `@egoless-do/core`.

---

## Overview

Core is the foundation — quality here ripples across all apps. Emphasis on **purity**, **testability**, and **zero platform coupling**.

---

## Forbidden Patterns

### Platform Coupling
- ❌ `import ... from 'react'` — no hooks, components, JSX
- ❌ `import ... from 'react-native'` / `expo-*` — no platform APIs
- ❌ `window`, `document` — no DOM
- ❌ `import ... from 'apps/...'` — core is leaf of dependency graph

### Impurity
- ❌ `Date.now()` / `Math.random()` in reusable pure functions (pass timestamp as param)
- ❌ Mutating function arguments (arrays, objects) — always return new copies
- ❌ Module-level singletons with mutable state
- ❌ Calling `adapter.*` or `fetch` from pure business functions

### Type Safety
- ❌ `any` — use `unknown` + narrowing
- ❌ `@ts-ignore` without a comment explaining why
- ❌ Type assertions (`as X`) for runtime data — use Zod schema.parse

---

## Required Patterns

### Pure Functions (business/)

```ts
// business/breathing.ts — deterministic, no deps, no side effects
export function phaseLabelKey(type: BreathPhaseType): string {
  switch (type) {
    case 'inhale': return 'breathInhale';
    case 'hold': return 'breathHold';
    case 'exhale': return 'breathExhale';
  }
}
```

Rules:
- Same input → same output
- No I/O, no `Date.now()`, no random
- Have `*.test.ts` for non-trivial logic

### Slice Factories (store/)

- Accept `StorageAdapter` adapter param
- Delegate all business logic to `business/`
- Always call `adapter.persistChange` after mutation
- Always trigger sync callback
- Catch and log all errors

### Type Exports

Every public type must be exported from `index.ts` or a `types/*` file:

```ts
// Re-export pattern
export type { Habit } from './types/habit';
export type { HabitSlice } from './store/types';
```

---

## Testing

Co-located `*.test.ts` in `business/` and `sync/`:

```ts
// business/breathing.test.ts (or co-located .test.ts)
describe('cycleDuration', () => {
  it('sums phase durations', () => {
    expect(cycleDuration(PRESET)).toBe(16);
  });
});
```

Focus testing on:
- Branching logic in pure functions
- Conflict resolution determinism
- Slice state transitions (complex ones)

### Slice unit tests — use the typed harness

Slice tests (`store/*.test.ts`) MUST use the shared typed test harness (`store/test-utils/storeHarness.ts`): `createTestStore<Slice>` + `createMockStorageAdapter` + `bindSlice`. Never hand-roll `makeTestStore` / `mockAdapter as any` — that pattern was the source of ~246 `no-explicit-any` warnings and their `no-unsafe-*` cascade. See `state-management.md` → "Slice Unit Testing" for the `bindSlice` vs FullStore-direct decision rule and forbidden patterns.

### Lint ratchet

`packages/core/package.json` lint script enforces `--max-warnings 5` (ratcheted down: 530 → 23 on 2026-11-16 via the typed test harness migration; 23 → 5 on 2026-11-17 via non-store test `any` cleanup + 2 production signature widenings). The threshold equals the measured warning count — any new warning fails CI. Do not raise it without a recorded reason; lower it when warnings are eliminated. Residual 5 = 4 vitest `expect.objectContaining`/`expect.any`/`expect.arrayContaining` nested-match artifacts (auth/fetch/createFastingSlice/createHabitSlice) + 1 sealed harness boundary cast (`storeHarness.ts`) — all uncleanable without restructuring test assertions (low value, high risk).

---

## Code Review Checklist

- [ ] No platform imports (react/react-native/expo/DOM)
- [ ] All mutations immutable (return new copies)
- [ ] All Date.now() / Math.random() are params, not calls inside pure functions
- [ ] Slice factories inject adapter via parameter
- [ ] All async errors caught and logged
- [ ] No `any`, uses `unknown` + narrowing
- [ ] New types exported from barrel (index.ts)
- [ ] Tests added for non-trivial pure logic

---

## Examples

- `business/breathing.ts` — pure constants + reducer
- `sync/conflict.ts` — pure conflict resolution + test
- `store/createHabitSlice.ts` — slice factory with persistChange wiring
