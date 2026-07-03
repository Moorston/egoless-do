# Logging Guidelines

> Structured logging patterns via `createLogger`.

---

## Overview

Core exposes a single logger factory: `createLogger(tag: string)` → `Logger`. No third-party logging library — plain `console.*` with a tag prefix. Tagged, structured, level-aware.

---

## API

```ts
import { createLogger } from '@egoless-do/core';

const log = createLogger('Auth');  // tag for filtering

log.debug('token refresh', { userId });  // dev only
log.info('user signed in', { userId });
log.warn('token refresh failed', { statusCode });
log.error(err, { message: 'sign-in flow failed' });
```

---

## Log Levels

| Level | Visible | Use for |
|-------|---------|---------|
| `debug` | `__DEV__` only | Verbose diagnostics, timing, data dumps |
| `info` | Always | Normal flow milestones |
| `warn` | Always | Recoverable issues, degraded mode |
| `error` | Always | Failures, caught exceptions, invalid state |

---

## Tag Naming

Tag = context (feature / component / service):

- `'Store'` — slice operations
- `'Auth'` — authentication
- `'Breathing'` — breathing feature
- `'SyncEngine'` — sync service
- `'StorageAdapter'` — SQLite adapter

Keep tags stable — they become grep handles for debugging sessions.

---

## What to Log

- ✅ Every external call failure (API, DB, sync)
- ✅ Entity lifecycle: add/update/delete of habits, reflections, etc. (in dev)
- ✅ Recycle bin operations
- ✅ AI engine calls / errors

---

## What NOT to Log

- ❌ **Auth tokens** — never log full token values
- ❌ **PII** — no email, name, phone, location content
- ❌ **Secrets** — API keys, DB credentials
- ❌ **Full entity dumps to error** — use `log.debug` for verbose data

---

## Forbidden Patterns

- ❌ `console.log` / `console.error` directly — always use `createLogger`
- ❌ String interpolation with sensitive data — pass context as structured object
- ❌ Logging in hot loops without level gate (`if (__DEV__)` inside logger handles debug)

---

## Examples

- `logger.ts` — the `createLogger` implementation
- `store/createHabitSlice.ts` — `log.error(e)` pattern
- `store/useAppStore.ts` (mobile) — app-wide store operations logging
