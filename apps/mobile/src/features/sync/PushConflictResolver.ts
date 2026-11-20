// ─── Push Conflict Resolver ────────────────────────────────────────
// Server-wins auto-resolution for items the server rejected during push.
// Extracted from SyncEngine.executePush (sync-engine-complexity, 2026-11-19)
// so the conflict-resolution safety logic (resurrection invariant, SQL name
// validation, server-wins UPDATE→INSERT) is independently unit-testable.
//
// Moved code is byte-for-byte from SyncEngine — log strings, SQL statements and
// judgment order preserved. Zero behavior change.
import { createLogger } from '@egoless-do/core';
import type { SyncPushResult, SyncPushResponseItem } from '@egoless-do/core';

import { isValidSqlName } from '../../db/sqlHelper';
import type { SyncQueueItem } from '../../db/syncQueue';

import { SyncApplyService, ENTITY_CONFIG } from './SyncApplyService';

const log = createLogger('PushConflictResolver');

const MAX_RETRY_ATTEMPTS = 5;

/** Structural subset of the DB surface the resolver needs (keeps deps testable without RN imports). */
interface ResolverDatabase {
  runAsync(sql: string, params?: unknown): Promise<{ changes: number }>;
  getFirstAsync<T>(sql: string, params?: unknown): Promise<T | null>;
}

export interface PushConflictResolverDeps {
  applyService: Pick<SyncApplyService, 'serverPayloadToRow'>;
  openDatabase: () => Promise<ResolverDatabase>;
  withDbLock: <T>(fn: () => Promise<T>) => Promise<T>;
  markQueueItemConflict: (id: number, reason: string) => Promise<void>;
  markQueueItemFailed: (id: number, reason: string) => Promise<void>;
}

/** Per-item resolution outcome. */
type ResolveOutcome =
  | 'resolved' // server-wins applied → remove from queue
  | 'skipped' // locally-deleted → resurrection guard fired, already conflict-marked
  | 'unresolvable'; // invalid/absent server data → conflict + optional UI report

export class PushConflictResolver {
  constructor(private deps: PushConflictResolverDeps) {}

  /**
   * Auto-resolve (server-wins) every rejected push item. Returns the queue-item
   * ids that resolved cleanly (caller removes them from the queue).
   */
  async resolveRejected(rejectedItems: SyncQueueItem[], pushResult: SyncPushResult): Promise<number[]> {
    const autoResolvedIds: number[] = [];
    for (const item of rejectedItems) {
      const rejection = pushResult.rejected?.find(
        (r) => r?.entity === item.entity && r.entityId === item.entity_id,
      );
      if (rejection?.serverData) {
        try {
          const outcome = await this.resolveOne(item, rejection, rejection.serverData);
          if (outcome === 'resolved') {
            autoResolvedIds.push(item.id);
          } else if (outcome === 'unresolvable') {
            await this.reportUnresolvable(item, rejection);
          }
          // 'skipped' → nothing: locally-deleted already conflict-marked inside the lock
        } catch (resolveErr) {
          log.error(resolveErr, { entity: item.entity, id: item.entity_id, phase: 'auto-resolve' });
          await this.deps.markQueueItemConflict(item.id, 'Auto-resolve failed');
        }
      } else {
        await this.reportNoServerData(item, rejection);
      }
    }
    return autoResolvedIds;
  }

  /** Resolve a single item that carries serverData. Throws propagate to the caller's catch. */
  private async resolveOne(item: SyncQueueItem, rejection: SyncPushResponseItem, serverData: Record<string, unknown>): Promise<ResolveOutcome> {
    const config = ENTITY_CONFIG[item.entity];
    if (!config) return 'unresolvable';
    if (!isValidSqlName(config.table)) throw new Error(`Invalid table name: ${config.table}`);
    if (!isValidSqlName(config.pk)) throw new Error(`Invalid pk name: ${config.pk}`);
    // Server says record is deleted — mark local as deleted too
    if (rejection.error === 'deleted') {
      return await this.resolveServerDeleted(item, config);
    }
    return await this.resolveServerWins(item, config, serverData);
  }

  /** Server reports the record as deleted → soft-delete the local row. */
  private async resolveServerDeleted(
    item: SyncQueueItem,
    config: { table: string; pk: string },
  ): Promise<ResolveOutcome> {
    await this.deps.withDbLock(async () => {
      const db = await this.deps.openDatabase();
      await db.runAsync(
        `UPDATE ${config.table} SET deleted=1, synced=1 WHERE ${config.pk}=?`,
        [item.entity_id],
      );
    });
    log.debug(`[SyncEngine] Marked ${item.entity}:${item.entity_id} as deleted (server rejected)`);
    return 'resolved';
  }

  /**
   * Server-wins: apply the server row locally (UPDATE, falling back to INSERT
   * when no local row exists). Guards against resurrecting locally-deleted
   * records — the resurrection invariant.
   */
  private async resolveServerWins(
    item: SyncQueueItem,
    config: { table: string; pk: string },
    serverData: Record<string, unknown>,
  ): Promise<ResolveOutcome> {
    const row = this.deps.applyService.serverPayloadToRow(item.entity, serverData);
    if (!row) return 'unresolvable';
    const cols = Object.keys(row);
    const vals = Object.values(row) as (string | number | null)[];
    for (const col of cols) {
      if (!isValidSqlName(col)) throw new Error(`Invalid column name: ${col}`);
    }
    if (!cols.length) return 'unresolvable';

    const db = await this.deps.openDatabase();
    const skipReason = await this.deps.withDbLock<string | null>(async () => {
      // Don't resurrect locally-deleted records
      const local = await db.getFirstAsync<{ deleted: number }>(
        `SELECT deleted FROM ${config.table} WHERE ${config.pk}=?`, [item.entity_id],
      );
      if (local?.deleted === 1) {
        await this.deps.markQueueItemConflict(item.id, 'Locally deleted');
        return 'deleted';
      }
      const setClause = cols.map(c => `${c}=?`).join(',');
      const r2 = await db.runAsync(`UPDATE ${config.table} SET ${setClause},deleted=0,synced=1 WHERE ${config.pk}=?`, [...vals, item.entity_id]);
      if (r2.changes === 0) {
        await db.runAsync(`INSERT INTO ${config.table} (${cols.join(',')},synced) VALUES (${cols.map(() => '?').join(',')},1)`, vals);
      }
      return null;
    });
    if (skipReason === 'deleted') {
      log.debug(`[SyncEngine] Skipping auto-resolve for deleted ${item.entity}:${item.entity_id}`);
      return 'skipped';
    }
    return 'resolved';
  }

  /** Invalid serverData → conflict mark + optional conflict-UI report. */
  private async reportUnresolvable(item: SyncQueueItem, rejection: SyncPushResponseItem): Promise<void> {
    await this.deps.markQueueItemConflict(item.id, 'Invalid serverData');
    try {
      const { useSyncStore } = await import('../../store/syncStore');
      useSyncStore.getState().addConflict({
        id: item.id.toString(),
        entity: item.entity,
        entityId: item.entity_id,
        localData: item.payload,
        remoteData: rejection.serverData,
        timestamp: Date.now(),
      });
    } catch (e) { log.warn(e, { phase: 'addConflict' }); } // intentional: conflict UI is optional
  }

  /**
   * No serverData → cannot auto-resolve. If this item has been retried too
   * many times, mark as permanently failed to avoid infinite loop.
   */
  private async reportNoServerData(item: SyncQueueItem, rejection: SyncPushResponseItem | undefined): Promise<void> {
    if (item.retry_count + 1 >= MAX_RETRY_ATTEMPTS) {
      await this.deps.markQueueItemFailed(item.id, rejection?.error || 'Server rejected — max retries exceeded');
      log.warn(`[SyncEngine] Permanently failed: ${item.entity}:${item.entity_id} (${rejection?.error})`);
    } else {
      await this.deps.markQueueItemConflict(item.id, rejection?.error || 'Server rejected');
    }
  }
}
