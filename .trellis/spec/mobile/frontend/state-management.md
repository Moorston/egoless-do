# State Management

> Zustand slices + SQLite persistence in the mobile app.

---

## Overview

The mobile app uses **Zustand** with a **slice composition** pattern. All business slice factories (`createXxxSlice`) live in `@egoless-do/core`. The mobile store composes them and adds mobile-specific concerns (SQLite adapter, SecureStore for tokens, AsyncStorage for UI prefs).

Three layers of state:

| Layer | Where | Purpose |
|-------|-------|---------|
| **Global store (client runtime)** | `useAppStore` | React state, UI flags, derived values |
| **SQLite (persistent local DB)** | `apps/mobile/src/db/` | Entity data synced with PocketBase |
| **Remote (PocketBase)** | Backend server | Source of truth, cross-device sync |

---

## Store Architecture

```
useAppStore (Zustand + persist)
├── AuthSlice          — auth state + token lifecycle
├── HabitSlice         — habits + streak calc
├── ReflectionSlice    — reflection CRUD
├── FastingSlice, MeditationSlice, SleepSlice, GiveSlice, BodySlice, ...
├── PlanSlice          — plans + daily auto-reset
├── FoodSlice, ExerciseSlice, WeightSlice, DietSlice, ...
├── RecycleBinSlice    — deleted items + recovery
├── AISlice            — AI config (mode, models)
├── SettingsSlice      — theme, language, notifications
└── MobileUiSlice      — mobile-only UI state
```

All slices are imported from `@egoless-do/core`. Mobile extends but **does not duplicate** slice logic — `@egoless-do/core` is the sole source of truth.

---

## Reading State (selector rules)

```tsx
// ❌ Bad: subscribes to entire store — rerenders on any change
const bad = useAppStore();

// ✅ Good: useShallow to select only needed fields
const { userProfile, theme } = useAppStore(useShallow(s => ({
  userProfile: s.userProfile,
  theme: s.theme,
})));

// ✅ Call action functions via slice
const { addBreathRecord } = useAppStore(useShallow(s => ({
  addBreathRecord: s.addBreathRecord,
})));
```

Rules:
- Always select with `useShallow` — prevents re-renders from unrelated state changes
- Never destructure an entire slice — pick only needed fields

---

## Side Effects (persistence + synchronization)

Slices persist via `adapter.persistChange(entity, id, data)` — a batched SQLite write adapter (`mobileStorageAdapter`). Reads happen on rehydration (`rehydrateFromDb`) which runs from SQLite on app start.

```tsx
// From storageAdapter.ts — batched writes with a 100ms debounce
export async function addBreathRecord(data) {
  // 1. Update client runtime
  set(state => ({ records: [...state.records, data] }));
  // 2. Persist via batched adapter
  await adapter.persistChange('breath_records', data.id, data);
  // 3. Sync push is triggered automatically by WriteBatcher flush
}
```

Rules:
- Every entity mutation must call `adapter.persistChange` → this is how data lands in SQLite → triggers sync push
- Never write to SQLite directly from a screen — route through the slice action
- Never side-effect in `render` — call actions inside `useEffect` or handlers

---

## Persistence Configuration

The Zustand `partialize` is selective — only settings/auth/UI survive restart. Entity data lives **solely** in SQLite (rehydrated on launch), never in JSON-storage:

```ts
partialize: s => ({
  auth: { ...s.auth, token: null, refreshToken: null }, // tokens → SecureStore
  theme: s.theme, language: s.language, streak: s.streak,
  waterMl: s.waterMl, // ui state only, see store/useAppStore.ts for full list
}),
```

**UI preferences** (guide style, voice toggle, hidden tags/moods) are stored in AsyncStorage. Use `safeAsyncStorage` wrapper (`store/safeAsyncStorage.ts`) for resilience in Expo Go where the native module may be unavailable.

**Auth tokens** are stored separately via `expo-secure-store` (not AsyncStorage, not SQLite). They are wired via `useAppStore.subscribe` — every token change writes to SecureStore.

---

## Offline / Sync Cycle

```
User action → slice.update → adapter.persistChange → WriteBatcher (100ms)
                                                     ↓
                                              SQLite write
                                                     ↓
                                         WriteBatcher.flush → triggerSync()
                                                     ↓
                                            SyncEngine pull/push
                                                     ↓
                                           PocketBase ←→ other devices
```

Rules:
- Never call sync functions directly from UI — let WriteBatcher handle it
- Network status-aware: `useNetInfo()` guards sync calls
- Sync conflicts resolved in `SyncService` / `SyncConflictPanel`

---

## Service Extraction (side-effect-heavy stores)

Stores with heavy I/O (audio, storage, timers) can delegate to dedicated service classes in `apps/mobile/src/<feature>/services/`. The service holds the side-effect logic; the store only orchestrates. This keeps the store readable and the services unit-testable.

Pattern (adopted by the music module, `apps/mobile/src/media/`):

```
useMusicStore (Zustand)
   ├──→ MusicPlaybackService   ← play/pause/queue/mode
   ├──→ MusicStorageService    ← persistence CRUD (File/Directory)
   └──→ MusicTimerService      ← sleep timer
```

Rules:
- **Service is instantiated at module level**, wired to the store via two callbacks: `updateState(partial)` and `getState()`. Services never `import` the store directly — they call the injected callbacks (`useMusicStore.setState` / `useMusicStore.getState`).
- **Decoupling direction**: service → callback → store. This avoids circular imports and keeps services framework-free and testable.
- **Side-effect services belong in `services/`**, not in `features/shared/` or `utils/`.
- **External API stays compatible**: re-export symbols the old store exposed (e.g. `setMusicSyncCallback`, `PlayMode` type) for backward compatibility.
- **Pure derived selectors** (e.g. `computeTracksByCategory`, `computeCategoryMeta`) stay as exported pure functions in the store module for memoization.

Example wire-up:

```ts
const playbackService = new MusicPlaybackService(
  (partial) => useMusicStore.setState(partial),   // updateState
  () => ({ /* slice of store state */ }),          // getState
);
```

When extracting, watch for orphaned module-level refs: if the old store had a module-level `let sleepTimerRef` and you move timer logic into a service, delete the old ref and delegate the store action to the service — otherwise you get `Cannot find name` TS errors.

---

## Forbidden Patterns

- ❌ Direct SQLite access outside `apps/mobile/src/db/` and slices
- ❌ Bypassing slices to mutate state via `setState` in a screen
- ❌ Storing entity data in AsyncStorage — all entities belong in SQLite
- ❌ Hardcoded token keys — all auth tokens flow through `secureAuth.ts`
- ❌ Services importing the store directly — use injected callbacks (avoids circular imports)
- ❌ Keeping side-effect logic inline in a large store — extract to `services/`

---

## Examples

- `store/useAppStore.ts` — slice composition + persistence + rehydration flow
- `store/secureAuth.ts` — SecureStore token lifecycle
- `features/sync/WriteBatcher.ts` — debounced SQLite writer
- `features/sync/SyncService.ts` — pull/push coordination
