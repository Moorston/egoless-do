# Error Handling

> Error patterns in the platform-agnostic core package.

---

## Overview

Core has **no custom error classes**. Errors are handled by:
1. Returning `null` / empty arrays for "not found" (not exceptions)
2. Logging with `createLogger`
3. Propagating errors up to platform-specific handlers (UI, toast, alert)

Because core must stay platform-agnostic, it **never** shows user-facing error UI — that's the app's responsibility.

---

## Error Handling Patterns

### 1. Default to null for missing data

```ts
// packages/core/src/business/checkin.ts
export function findHabitById(habits: Habit[], id: string): Habit | null {
  return habits.find(h => h.id === id && !h.deleted) ?? null;
}
```

### 2. Log + rethrow at boundaries

```ts
// packages/core/src/store/createXxxSlice.ts
try {
  await fetchRemote();
} catch (e) {
  log.error(e, { message: 'sync fetch failed' });
  throw e;  // let the UI layer decide how to display
}
```

### 3. Validate at sync boundary

```ts
// packages/core/src/sync/entitySchemas.ts
const result = EntitySchema.safeParse(rawData);
if (!result.success) {
  log.warn('Invalid entity skipped', result.error);
  return null;
}
```

---

## Error Levels

| Level | When | Example |
|-------|------|---------|
| `debug` | Verbose diagnostics | "rehydrateFromDb: loaded 42 habits" |
| `info` | Normal operations | "sync pull completed" |
| `warn` | Recoverable issues | "audio mode failed", "invalid entity skipped" |
| `error` | Unrecoverable failures | "sqlite entity load error", "database open error" |

---

## Forbidden Patterns

- ❌ `Alert.alert()` / `ToastAndroid` — core has no UI
- ❌ `console.error` directly — use `log.error` from `createLogger`
- ❌ `try { } catch { /* silent */ }` — always log or rethrow
- ❌ Throwing typed custom errors (no error class hierarchy in this project)

---

## Examples

- `store/createHabitSlice.ts` — `adapter.persistChange(...).catch(e => log.error(e))`
- `sync/conflict.ts` — pure validation, no exceptions
- `logger.ts` — structured console logging via `createLogger`
