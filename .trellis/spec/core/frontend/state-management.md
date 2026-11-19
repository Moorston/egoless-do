# State Management

> Core's slice factory pattern for shared state management.

---

## Overview

`packages/core/src/store/` contains **Zustand slice factories** — functions that return a `SliceCreator<Slice>` for composition into a store. Both mobile and web compose these slices into their own stores.

Mobile example (in `useAppStore.ts`):
```ts
import { createHabitSlice, createAuthSlice, ... } from '@egoless-do/core';

useAppStore = create(persist((...a) => ({
  ...createHabitSlice(adapter, triggerAutoSync)(...a),
  ...createAuthSlice(...)(<REDACTED>
  ...
})));
```

---

## Slice Factory Pattern

```ts
// packages/core/src/store/createHabitSlice.ts
import type { SliceCreator } from './sliceHelper';
import type { HabitSlice, StorageAdapter } from './types';

export function createHabitSlice(
  adapter: StorageAdapter,    // injected persistence adapter
  onSync?: () => void,        // injected sync trigger
): SliceCreator<HabitSlice> {
  return (set, get) => ({
    habits: [],

    addHabit(form) {
      const newHabit = createHabitFromForm(form);       // delegate to business
      set(s => ({ habits: [...s.habits, newHabit] }));   // immutable update
      adapter.persistChange('habit', newHabit.id, newHabit).catch(e => log.error(e));
      onSync?.();                                        // trigger sync
    },
  });
}
```

### Rules:
- **SliceCreator<Slice>** type from `sliceHelper.ts` ensures slices compose into the full store
- Accept `StorageAdapter` as parameter — slices are storage-agnostic
- Accept callback for sync triggering (`onSync`) — slices don't import SyncService
- Delegate business logic to `business/*` — no calculations in slice bodies
- Mutations must call `adapter.persistChange` — this is how data lands in SQLite/IndexedDB
- Never call `set` with the full store object — only patch changed fields
- Always log errors via `log.error`, never throw

---

## Slice Contract (Types)

Each slice type is exported from `store/types.ts`:

```ts
export interface HabitSlice {
  habits: Habit[];
  addHabit(form: CreateHabitForm): void;
  updateHabit(id: string, patch: Partial<Habit>): void;
  deleteHabit(id: string): void;
  checkinHabit(id: string, date: string): void;
  // ...
}
```

**Rule**: Every slice interface must list **all state fields and actions** it provides. This allows TypeScript to catch missing slices at compose time.

---

## Entity Sync Flow (Slice → Adapter)

```
Slice action → adapter.persistChange(entity, id, data)
                    ↓
              Platform storage (SQLite / IndexedDB)
                    ↓
              Sync push → PocketBase
```

**Rule**: Slices must **never** import or call sync logic directly — only `adapter.*` and `onSync()` callback.

---

## Daily Reset Trigger Architecture

The daily reset (previous-day history archival + recurring todo copy) has exactly ONE primary trigger and one fallback:

| Layer | Component | Role |
|-------|-----------|------|
| Trigger | `core/src/dailyReset.ts` `DailyResetManager` | on `needsReset`, fires `onPlanDailyReset(lastReset)` **once** |
| Multi-day semantics | `store/createPlanSlice.ts` `performDailyReset` | dayCount loop covers every missed day from `previousDate` → today |
| Fallback | `apps/mobile/src/features/plan/PlanDetailContent.tsx` date detector | covers single-day gaps when the Manager hasn't run (e.g. initApp failure) — idempotent, safe to double-fire |

Rules (each violation caused a real bug — daily-reset-consolidation, 2026-11-19):

- **Manager fires ONE callback carrying `lastReset` — never a per-day burst.** A burst is O(N²): every callback re-runs the store's full dayCount loop (5-day gap = 5+4+3+2+1 = 15 business calls; the single-callback design needs exactly 5).
- **The store owns multi-day semantics.** `performDailyReset(previousDate)` chains business results day by day. Never move that loop back to the Manager.
- **Invalid `lastReset` (corrupted storage) fires nothing** — the NaN/`daysDiff < 0` guard in `backfillFromLastReset` runs BEFORE the plan callback.
- **`lastReset === null` (first run) fires nothing** — no history exists to save.
- **Reviews backfill per-day** (`backfillReviews`) — reviews have NO store-side loop; do not merge them into the single plan callback.

### Delayed-plan notification dedup (two layers)

`notifyPlanDelayed` prevents duplicate email bursts with two mechanisms:

1. `plan.lastDelayedNotifyAt` (persisted) — after a **successful** send, never retry
2. `delayedNotifInFlight` (factory-closure `Set`) — while a send is in flight. The persisted flag is only written AFTER `await notifyDelayedPlan(...)` resolves, so a synchronous burst of fire-and-forget calls all pass check 1 without check 2. The Set is `finally`-cleared: a **failed** send stays retryable on the next trigger.

`checkAutoStatus`'s delayed branch intentionally does NOT pre-write `lastDelayedNotifyAt` — pre-writing would make a failed send never retry.

---

## Forbidden Patterns

- ❌ Importing `expo-*` or `react-native` — slices must be platform-agnostic
- ❌ Direct `fetch` or API calls — sync is platform-managed
- ❌ Date.now() or Math.random() in pure logic (pass as param)
- ❌ Throwing exceptions — catch and log
- ❌ Mutating state without calling `adapter.persistChange`

> ⚠️ **`flushWrites()` trap** — Mutating store state directly via `setState` without `persistChange`, then calling `flushWrites()`, does NOT persist. `flushWrites()` only drains the batcher's pending `persistChange` queue; a `setState` with no `persistChange` leaves the batcher empty, so data exists only in memory and is lost on restart. Screens must route every entity mutation through a slice action. See mobile spec → "Persistence Anti-patterns — the `flushWrites()` trap" for the full template.

---

## Slice Unit Testing (typed test harness)

Slice unit tests live in co-located `*.test.ts` files next to each slice factory. They MUST use the shared typed test harness — **never** hand-roll `makeTestStore` + `mockAdapter as any`. The FullStore type friction (`SliceCreator<Slice>` = `StateCreator<FullStore, [], [], Slice>`, binding the full store union) is sealed inside the harness so callers write zero `as any`.

**Harness location**: `packages/core/src/store/test-utils/storeHarness.ts`

Exports:
- `createTestStore<Slice>(initial: Partial<Slice>)` → `{ state, set, get, api }` matching the `(set, get, api)` triple every slice factory expects
- `createMockStorageAdapter()` → full `StorageAdapter` mock (all 9 methods, typed `vi.fn()`)
- `bindSlice<F>(factory)` → boundary cast narrowing a slice factory from `SliceCreator<Slice>` (binds FullStore) down to `StateCreator<Slice, [], [], Slice>`, preserving the factory's parameter tuple

### bindSlice vs FullStore-direct — the decision rule

The choice depends on **whether the tested code path reads cross-slice state**:

- **`bindSlice(createXxxSlice)` + `createTestStore<XxxSlice>`** — use when the tested methods only access the slice's own fields via `get().<own-field>`. Gives the narrowest type isolation.
- **`createTestStore<FullStore>` + factory direct call** (no `bindSlice`) — use when the tested methods read `get().<other-slice-field>` (e.g. `recycleBin`, `planItems`, `notifyPlanDelayed`). The factory already expects FullStore-typed `set/get/api`, so `createTestStore<FullStore>` matches with zero cast.

> Boundary case: `createTrailNoteSlice.test.ts` tests `createThoughtTrailSlice` (which overall is cross-slice), but the 4 tested trail-note methods only touch `thoughtTrails`/`trailNotes`, so `bindSlice` is correct. Judge by the **tested path**, not the slice as a whole.

### Object.assign order trap (FullStore-direct + cross-slice method calls)

When the tested method calls another slice method via `get()` (e.g. `performDailyReset` → `get().notifyPlanDelayed`), slice methods must be attached to state — and `initial` must be re-applied LAST:

```ts
const slice = createPlanSlice(adapter)(store.set, store.get, store.api);
Object.assign(store.api.getState(), slice, initial); // initial LAST — never just (state, slice)
```

The factory's returned object carries factory-initial data fields (`plans: []`, `planItems: []`, …). Assigning the whole slice clobbers the seeded fixture with empty arrays — the business function then receives empty state, returns `hasChanges: false`, the persist block never runs, and every persist assertion fails **green** (assertions on "0 calls" pass vacuously). Reference implementation: `store/createPlanSlice.dailyReset.test.ts` → `makeSlice`.

### Mocking module-level dependencies in slice tests

- Mock the notification API module (`vi.mock('../services/notification', …)`) — `notifyPlanDelayed` fire-and-forgets a real HTTP request otherwise.
- For a business-function spy that keeps real behavior, wrap `vi.fn(actual.performDailyReset)` inside `vi.mock('<module>', async (importOriginal) => …)`, then re-type the import with `vi.mocked(performDailyReset)` at the call site — a raw import stays typed as the original function, so `.mock.calls` access trips every `no-unsafe-*` rule.

### Per-slice adapter pattern

Tests keep a thin typed `makeTestStore(overrides)` wrapper that seeds the slice's default state — this is per-slice adaptation (each slice has different initial state), NOT the old `as any` pattern. The wrapper is one typed line:

```ts
function makeTestStore(overrides: Partial<AuthSlice> = {}) {
  return createTestStore<AuthSlice>({ auth: defaultAuthState, ...overrides });
}
```

### Forbidden in slice tests

- ❌ `as any` (including mock fixture casts) — use typed casts or let the harness seal the boundary
- ❌ Hand-rolled `mockAdapter = { persistChange: vi.fn()... }` — use `createMockStorageAdapter()`
- ❌ `@ts-expect-error` for `__DEV__` — it is globally declared via `src/logger.ts`; set `globalThis.__DEV__ = false` with a comment
- ❌ `makeTestStore` returning a hand-built `{ state, set, get, api } as any` — delegate to `createTestStore`

> Acceptable residual noise: `expect.any(Number)` / `expect.arrayContaining` nested inside `expect.objectContaining` trips `no-unsafe-assignment` because the matcher return type widens to `any`. This is a vitest type-definition artifact, not a real `any` leak — leave it.

---

## Examples

- `store/createHabitSlice.ts` — slice factory with persistChange wiring
- `store/sliceHelper.ts` — `SliceCreator<Slice>` type alias
- `store/storageAdapter.ts` — `StorageAdapter` interface
- `store/createFastingSlice.ts` — another slice factory example
- `store/test-utils/storeHarness.ts` — typed test harness (createTestStore + createMockStorageAdapter + bindSlice)
- `store/createAuthSlice.test.ts` — `bindSlice` test template (own-state-only slice)
- `store/createRecycleBinSlice.test.ts` — `createTestStore<FullStore>` test template (cross-slice slice)
