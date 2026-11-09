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
| `sync/conflict.ts` | Pure conflict resolution (`resolveConflict` — server authority, last-write-wins with tie to server). **Status: orphaned** — sole consumer (`mergeById`) was removed; mobile apply path uses inline timestamp comparison. Kept as exported pure utility pending a reuse decision. |
| `sync/entitySchemas.ts` | Zod schemas for entity validation at boundaries |
| `sync/types.ts` | SyncEntity enum, SyncDelta, SyncResult types |

**Rules**:
- Conflict resolution must remain **pure** (testable, no side effects)
- Entity validation happens at the sync boundary (before applying server delta)
- `createAuthSlice.pullServerData` is **delegate-only**. The legacy web merge path (`buildMergePatch`/`ENTITY_MERGE_MAP` in `store/mergeEngine.ts`) was removed — web is archived and every consumer injects `onPullServerData`. With no delegate, `pullServerData` is a no-op (do not re-add a fallback merge that silently drops unmapped entities).

> **Invariant: local soft-deletes are sticky (no resurrection)**
>
> In `mergeById`, a locally soft-deleted record (`deleted=true`) must **never** be resurrected by an incoming non-deleted server record, even when `serverUpdated > clientUpdated`. The pending delete is still queued for push and will win on the server side eventually; letting a newer server version overwrite the tombstone would resurrect the row. Implementation: a guard `if (existing.deleted && !item.deleted) continue;` short-circuits **before** `resolveConflict` is called, because `resolveConflict` is purely timestamp-driven and would otherwise hand the win to a newer server record.
>
> This is a **policy decision at the merge layer**, not a `resolveConflict` rule — `resolveConflict` stays pure-timestamp by design. Other paths are unaffected: a server-side delete still propagates onto a live local record (`existing` not deleted → guard skipped → `resolveConflict` applies).

> **Resurrection guards on the apply path (mobile) — keys MUST be entity-qualified**
>
> `SyncApplyService.applyEntityToTable` has two resurrection guards, both keyed `${entity}:${id}`:
> - `_locallyDeleted` — in-memory `Set<string>`, 60s window after a local delete (lost on app restart; orphan recovery backstops).
> - `deletedIds` — `Set<string>` from `useSync`'s `deletedIdsProvider`, built from `recycleBin` as `${r.entityType}:${r.id}`. Persistent across sessions (7-day bin).
>
> **Why entity-qualified:** `checkin` / `meditation` / `grace` all use `date` as their SQLite pk, so a flat id-only set would cross-skip unrelated entities sharing the same date (deleting a checkin would drop an incoming meditation/grace for that date). Both guards use the same `${entity}:${id}` composite-key convention.
>
> `RecycleBinEntityType` values (`habit`/`reflection`/`food`/`exercise`/`plan`/`breath`/`planItem`) are a subset of `SyncEntity` and name-identical, so `entityType` is used directly as the key prefix without a mapping table.

---

## Entity Registry

`data/entityRegistry.ts` declares metadata for every syncable entity: table name, sync priority, change detection rules. Slices reference this; the sync engine uses it to know which tables to pull/push.

---

## Migrations

Database schema migrations live where the DB lives:
- **SQLite**: `apps/mobile/src/db/schema.ts` + version migrations
- **PocketBase**: `backend/pb_migrations/`

Core does **not** manage migrations.

> **`migrateDatabase` 结构（2026-11-01 表驱动重构后）**
>
> `apps/mobile/src/db/schema.ts` 的 `migrateDatabase` 采用表驱动结构：主函数体仅 `try { for (step of MIGRATION_STEPS) await runMigrationStep(db, step, checks) } catch { log.error }`，cyclomatic complexity ≤15（重构前 38）。所有迁移逻辑声明为有序 `MIGRATION_STEPS: MigrationStep[]` 数组，由 `runMigrationStep` switch 分发（内分支体抽到 `handleEnsureTable` / `handleEnsureTablesChecked` / `handleForAddCol` / `handleCreateIndex` 独立函数以控复杂度）。
>
> **MigrationStep 八种 kind**：`checkTable`（提前探测表存在性存入 checks map，供后续 `ensureTablesChecked` 延后使用——保留原代码 early-fetch-late-use 顺序）、`ensureTable`（不存在则 CREATE + indexes，存在则 elseAction；可选 afterAction 总执行）、`ensureTablesChecked`（基于已存 checks 创建多表）、`addCol`（tryAddCol 幂等加列）、`ensureColumn`（PRAGMA table_info 探测后加列）、`migrate`（调用命名迁移函数）、`forAddCol`（批量加列，保留 try-catch-ALTER）、`createIndex`、`cleanupPresets`。
>
> **模块级 helpers**：`tableExists`（sqlite_master 探测）、`tryAddCol`（pragma_table_info 探测 + ALTER）、`ensureColumn`（PRAGMA table_info 探测 + ALTER）、`cleanupPresetMantras`（PRESET 清理块，含内部 try-catch）。
>
> 6 个命名迁移函数保留（事务边界 `BEGIN TRANSACTION...COMMIT` + `ROLLBACK` try-catch 封装在各自函数体内），作为 `ensureTable.elseAction` / `migrate.fn` 引用：
>
> | 函数 | 迁移内容 | 引用方式 |
> |------|----------|----------|
> | `migrateSyncQueueColumns` | sync_queue 多列迁移 + UNIQUE 索引 + 去重 | sync_queue ensureTable.elseAction |
> | `migrateMeditationHistory` | dur→dur_min 转换 + 列增删 | meditation_history ensureTable.elseAction |
> | `migrateDailyCustomTodosNullable` | plan_id 放宽为 nullable（表重建） | daily_custom_todos ensureTable.afterAction |
> | `migrateDailyTodoHistoryNullable` | plan_id 放宽为 nullable（表重建） | daily_todo_history ensureTable.afterAction |
> | `migrateFastingSessionsCheck` | 移除 CHECK 约束（表重建） | migrate step |
> | `migrateCheckinReviewsUniqueIndex` | 去重 + UNIQUE 索引 | migrate step |
>
> **约束**：
> - MIGRATION_STEPS 数组顺序不可变——表重建迁移（DROP+RENAME）与 tryAddCol/CREATE 块交错排列，顺序错误会导致永久性数据丢失；emitted SQL 序列由 `schemaMigrate.test.ts` 双快照（S1 fresh / S2 upgrade）锁定，重构或新增迁移不得改变现有序列（byte-identical）
> - `forAddCol` 必须保留 try-catch-ALTER 模式，**不得换 tryAddCol**——会引入额外 PRAGMA 查询、破坏 byte-identical
> - 新增迁移应作为新的 `MigrationStep` 加入 `MIGRATION_STEPS` 数组相应位置，不得内联回主函数；新增命名迁移函数仍可按需提取，作为 step 的 elseAction/afterAction/fn 引用

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
