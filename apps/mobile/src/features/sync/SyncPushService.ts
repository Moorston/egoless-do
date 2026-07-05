// ─── SyncPushService ───────────────────────────────────────────────────
// Extracted from SyncEngine.ts (PR-4 of AR-01 refactoring)
// Handles the push phase of runSync(): drain queue → API push → conflict resolve → mark synced.

import { openDatabase } from '../../db/schema';
import {
  drainQueue, removeQueueItems, getQueueCount, markQueueItemFailed,
  markQueueItemConflict, markQueueItemRetry, resetAllPendingForRetry,
  type SyncQueueItem,
} from '../../db/syncQueue';
import { apiSyncPush, apiSyncPullPost, createLogger, KickedOutError } from '@egoless-do/core';
import type { SyncEntity, SyncPushResult } from '@egoless-do/core';
import { ENTITY_CONFIG } from './SyncApplyService';
import { SyncApplyService } from './SyncApplyService';

const log = createLogger('SyncPush');
const MAX_RETRY_ATTEMPTS = 5;
const PUSH_PULL_SEPARATE_THRESHOLD = 20;

export interface PushContext {
  pushedAnything: boolean;
  pushedItemCount: number;
  pushApplySucceeded: boolean;
  lastPushResult: SyncPushResult | null;
}

export class SyncPushService {
  async executePush(
    token: string,
    userId: string | undefined,
    freshToken: () => string,
    lastSyncAt: number,
    signal: AbortSignal,
    applyService: SyncApplyService,
    onChanges: ((patch: Record<string, unknown>) => void) | null,
    isKickedOutError: (err: unknown) => boolean,
    handleKickedOut: () => void,
    onAfterBatch: (serverTime: number) => void,
    deletedIdsProvider: () => Set<string>,
  ): Promise<PushContext> {
    let pushedAnything = false;
    let pushedItemCount = 0;
    let pushApplySucceeded = false;
    let lastPushResult: SyncPushResult | null = null;
    let pushResult: SyncPushResult | null = null;

    for (let batch = 0; batch < 10; batch++) {
      const items = await drainQueue(50).catch(e => { log.error(e, { phase: 'drain' }); return [] as SyncQueueItem[]; });
      log.debug(`drainQueue batch ${batch + 1}: ${items.length} items`);
      if (!items.length) break;
      pushedAnything = true;
      pushedItemCount += items.length;

      const changes: Array<{ entity: string; entityId: string; payload: Record<string, unknown>; operation: string; changedFields?: string[] }> = [];
      for (const item of items) {
        try {
          const parsed = JSON.parse(item.payload);
          const changedFields = parsed._changedFields;
          if (changedFields) delete parsed._changedFields;
          changes.push({ entity: item.entity, entityId: item.entity_id, payload: parsed, operation: item.operation === 'delete' ? 'delete' : 'upsert', changedFields });
        } catch {
          await markQueueItemFailed(item.id, 'Corrupt payload');
        }
      }
      if (!changes.length) continue;

      try {
        pushResult = await apiSyncPush(freshToken(), lastSyncAt, changes, userId);
        log.info(`Push OK: ${changes.length} changes, serverTime=${pushResult.serverTime}, rejected=${pushResult.rejected?.length ?? 0}`);
      } catch (pushErr: unknown) {
        if (isKickedOutError(pushErr)) { handleKickedOut(); return { pushedAnything, pushedItemCount, pushApplySucceeded, lastPushResult: null }; }
        log.error(pushErr, { phase: 'push' });
        for (const item of items) {
          const na = item.retry_count + 1;
          if (na >= MAX_RETRY_ATTEMPTS) await markQueueItemFailed(item.id, (pushErr instanceof Error ? pushErr.message : null) || 'Push failed');
          else await markQueueItemRetry(item.id, na, Date.now() + Math.min(Math.pow(2, na) * 1000, 60000));
        }
        break;
      }
      lastPushResult = pushResult;

      const rejectedSet = new Set<string>();
      if (Array.isArray(pushResult.rejected)) {
        for (const r of pushResult.rejected) {
          if (r) rejectedSet.add(`${r.entity}:${r.entityId}`);
        }
      }
      const acceptedItems = items.filter(i => !rejectedSet.has(`${i.entity}:${i.entity_id}`));
      const rejectedItems = items.filter(i => rejectedSet.has(`${i.entity}:${i.entity_id}`));

      // Auto-resolve conflicts
      const autoResolvedIds: number[] = [];
      for (const item of rejectedItems) {
        const rejection = pushResult.rejected?.find(
          (r) => r?.entity === item.entity && r?.entityId === item.entity_id,
        );
        if (rejection?.serverData) {
          try {
            const config = ENTITY_CONFIG[item.entity];
            let resolved = false;
            if (config) {
              const row = applyService.serverPayloadToRow(item.entity, rejection.serverData);
              if (row) {
                const cols = Object.keys(row);
                const vals = Object.values(row) as (string | number | null)[];
                if (cols.length) {
                  const db = await openDatabase();
                  const setClause = cols.map(c => `${c}=?`).join(',');
                  const r2 = await db.runAsync(`UPDATE ${config.table} SET ${setClause},deleted=0,synced=1 WHERE ${config.pk}=?`, [...vals, item.entity_id]);
                  if (r2.changes === 0) {
                    await db.runAsync(`INSERT INTO ${config.table} (${cols.join(',')},synced) VALUES (${cols.map(() => '?').join(',')},1)`, vals);
                  }
                  resolved = true;
                }
              }
            }
            if (resolved) {
              autoResolvedIds.push(item.id);
            } else {
              await markQueueItemConflict(item.id, 'Invalid serverData');
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
              } catch {} // intentional: conflict UI is optional
            }
          } catch (resolveErr) {
            log.error(resolveErr, { entity: item.entity, id: item.entity_id, phase: 'auto-resolve' });
            await markQueueItemConflict(item.id, 'Auto-resolve failed');
          }
        } else {
          await markQueueItemConflict(item.id, 'Server rejected');
        }
      }
      if (autoResolvedIds.length) await removeQueueItems(autoResolvedIds);

      // Mark synced
      try {
        const upserted: Record<string, string[]> = {};
        const deletedMap: Record<string, string[]> = {};
        for (const item of acceptedItems) {
          (item.operation === 'delete' ? deletedMap : upserted)[item.entity] ??= [];
          (item.operation === 'delete' ? deletedMap : upserted)[item.entity].push(item.entity_id);
        }
        await applyService.markSyncedAndRemove(upserted, deletedMap, acceptedItems.map(i => i.id));
      } catch (markErr) {
        log.error(markErr, { phase: 'markSyncedAndRemove' });
      }

      // Post-push pull for small batches
      if (lastPushResult?.serverTime && pushedItemCount <= PUSH_PULL_SEPARATE_THRESHOLD) {
        try {
          const affectedEntities = [...new Set(items.map(i => i.entity))];
          const pullResult = await apiSyncPullPost(freshToken(), { entities: affectedEntities, since: lastSyncAt > 0 ? lastSyncAt : undefined });
          if (pullResult?.data) {
            const patch = await applyService.applyServerChanges(pullResult.data, deletedIdsProvider(), signal);
            if (patch && Object.keys(patch).length) onChanges?.(patch);
            pushApplySucceeded = true;
          }
        } catch (pushPullErr) {
          log.warn(pushPullErr, { phase: 'post-push pull' });
        }
      }

      // Forward serverTime update to coordinator
      if (pushResult.serverTime) {
        onAfterBatch(pushResult.serverTime);
      }
    }

    return { pushedAnything, pushedItemCount, pushApplySucceeded, lastPushResult };
  }
}