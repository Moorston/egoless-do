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

## Forbidden Patterns

- ❌ Importing `expo-*` or `react-native` — slices must be platform-agnostic
- ❌ Direct `fetch` or API calls — sync is platform-managed
- ❌ Date.now() or Math.random() in pure logic (pass as param)
- ❌ Throwing exceptions — catch and log
- ❌ Mutating state without calling `adapter.persistChange`

---

## Examples

- `store/createHabitSlice.ts` — slice factory with persistChange wiring
- `store/sliceHelper.ts` — `SliceCreator<Slice>` type alias
- `store/storageAdapter.ts` — `StorageAdapter` interface
- `store/createFastingSlice.ts` — another slice factory example
