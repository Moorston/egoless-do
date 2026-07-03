# Database Guidelines

> Data persistence and sync patterns for this project.

---

## Overview

There is **no direct database in `@egoless-do/core`**. Persistence is abstracted behind the `StorageAdapter` interface. The actual database lives in:

| Layer | Where | Purpose |
|-------|-------|---------|
| **SQLite (local)** | `apps/mobile/src/db/` | Mobile persistent storage |
| **PocketBase (remote)** | `backend/` | Source of truth, cross-device sync |

Core only defines the `StorageAdapter` interface that platforms implement.

---

## StorageAdapter Interface

```ts
// packages/core/src/store/types.ts
export interface StorageAdapter {
  persistChange(entity: SyncEntity, id: string, data: Record<string, unknown>): Promise<void>;
  markDeleted(entity: SyncEntity, id: string): Promise<void>;
  batchDelete(operations: Array<{ entity: SyncEntity; id: string }>): Promise<void>;
}
```

**Rule**: Slices call `adapter.persistChange(...)` after every entity mutation. The platform handles the actual write (SQLite, IndexedDB, etc.).

---

## Sync Protocol (core side)

Core owns the sync protocol logic:

| Module | Responsibility |
|--------|---------------|
| `sync/conflict.ts` | Pure conflict resolution (`resolveConflict` — server authority, last-write-wins with tie to server) |
| `sync/merge.ts` | Three-way merge logic |
| `sync/entitySchemas.ts` | Zod schemas for entity validation at boundaries |
| `sync/types.ts` | SyncEntity enum, SyncDelta, SyncResult types |

**Rules**:
- Conflict resolution must remain **pure** (testable, no side effects)
- Entity validation happens at the sync boundary (before applying server delta)

---

## Entity Registry

`data/entityRegistry.ts` declares metadata for every syncable entity: table name, sync priority, change detection rules. Slices reference this; the sync engine uses it to know which tables to pull/push.

---

## Migrations

Database schema migrations live where the DB lives:
- **SQLite**: `apps/mobile/src/db/schema.ts` + version migrations
- **PocketBase**: `backend/pb_migrations/`

Core does **not** manage migrations.

---

## Common Mistakes

- ❌ Putting SQLite/PocketBase SQL in core — belongs in mobile/backend
- ❌ Adding `expo-*` imports to core — breaks web builds
- ❌ Executing side effects in `resolveConflict` — must stay pure
- ❌ Slices bypassing `adapter.persistChange` — breaks sync and persistence

---

## Examples

- `sync/conflict.ts` — pure conflict resolution with exported test
- `store/createHabitSlice.ts` — slice calling `adapter.persistChange`
- `data/DataGateway.ts` — abstract interface (no implementation)
