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
