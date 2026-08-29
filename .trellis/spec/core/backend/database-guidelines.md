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

> **`migrateDatabase` 结构（2026-08-30 重构后）**
>
> `apps/mobile/src/db/schema.ts` 的 `migrateDatabase` 已拆分为 6 个命名迁移函数，在主函数体中按固定顺序调用。每个迁移函数独立处理一张/一组表的迁移，事务边界（`BEGIN TRANSACTION...COMMIT` + `ROLLBACK` try-catch）封装在各自函数体内。
>
> | 调用顺序 | 函数 | 迁移内容 |
> |----------|------|----------|
> | 1 | `migrateSyncQueueColumns` | sync_queue 多列迁移 + UNIQUE 索引 + 去重（else 分支） |
> | 2 | `migrateMeditationHistory` | dur→dur_min 转换 + 列增删（else 分支） |
> | 3 | `migrateDailyCustomTodosNullable` | plan_id 放宽为 nullable（表重建） |
> | 4 | `migrateDailyTodoHistoryNullable` | plan_id 放宽为 nullable（表重建） |
> | 5 | `migrateFastingSessionsCheck` | 移除 CHECK 约束（表重建） |
> | 6 | `migrateCheckinReviewsUniqueIndex` | 去重 + UNIQUE 索引 |
>
> **约束**：
> - 迁移调用顺序不可变——表重建迁移（DROP+RENAME）顺序错误会导致永久性数据丢失
> - `tryAddCol` 辅助调用、`CREATE TABLE IF NOT EXISTS` 块、`for` 循环（updated_at/deleted 批量添加）留在主函数体
> - 新增迁移应添加为新的命名函数并在主函数体相应位置调用，不得内联回主函数

> **Gotcha: `ensureCollection()` skips existing collections**
>
> PocketBase migration helper pattern `ensureCollection()` (used in `1782500000_create_all_sync_collections.js`) checks if a collection exists and **returns immediately** if found. Subsequent additions to `syncFields()` (e.g., adding `created`, `deleted`, `updated_at`) are **never applied** to collections created by earlier migrations.
>
> Always add schema changes as **separate fix migrations** (`013`, `014`, `015`) rather than relying on `ensureCollection()` to retroactively add fields. A fix migration iterates over all affected collections, checks field existence by name, and adds missing fields individually.

---

## Common Mistakes

- ❌ Putting SQLite/PocketBase SQL in core — belongs in mobile/backend
- ❌ Adding `expo-*` imports to core — breaks web builds
- ❌ Executing side effects in `resolveConflict` — must stay pure
- ❌ Slices bypassing `adapter.persistChange` — breaks sync and persistence
- ❌ Assuming PocketBase system fields (`created`, `updated`) exist on all collections — sync collections created by early migrations (pre-`1782500000`) may lack `autodate` fields. Always verify field presence before using `-created` sorts in pb_hooks.

---

## Examples

- `sync/conflict.ts` — pure conflict resolution with exported test
- `store/createHabitSlice.ts` — slice calling `adapter.persistChange`
- `data/DataGateway.ts` — abstract interface (no implementation)
