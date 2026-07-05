// ─── SyncPullService ───────────────────────────────────────────────────
// Extracted from SyncEngine.ts (PR-4 of AR-01 refactoring)
// Handles the pull phase of runSync(): check for changes → pull → apply.

import { apiSyncCheck, apiSyncPull, apiSyncPullPost, createLogger, KickedOutError } from '@egoless-do/core';
import type { SyncPushResult, SyncPullResult } from '@egoless-do/core';
import { getLastSyncTimestamp, setLastSyncTimestamp } from '../../db/syncQueue';
import { SyncApplyService } from './SyncApplyService';
import type { PushContext } from './SyncPushService';

const log = createLogger('SyncPull');

export class SyncPullService {
  async executePull(
    pushedAnything: boolean,
    pushedItemCount: number,
    lastPushResult: SyncPushResult | null,
    pushApplySucceeded: boolean,
    token: string,
    userId: string | undefined,
    freshToken: () => string,
    lastSyncAt: number,
    signal: AbortSignal,
    applyService: SyncApplyService,
    onChanges: ((patch: Record<string, unknown>) => void) | null,
    isKickedOutError: (err: unknown) => boolean,
    handleKickedOut: () => void,
    deletedIdsProvider: () => Set<string>,
    PUSH_PULL_SEPARATE_THRESHOLD: number,
  ): Promise<void> {
    // If push applied everything cleanly + no rejections, skip full pull
    const pushAllClean = pushedAnything && lastPushResult?.rejected?.length === 0;
    const wasLargePush = pushAllClean && pushedItemCount > PUSH_PULL_SEPARATE_THRESHOLD;
    if (!pushAllClean && !pushApplySucceeded) {
      let pullEntities: string[] | undefined;
      // If there were rejections, check only conflicted entities
      const rejected = lastPushResult?.rejected;
      if (rejected && rejected.length > 0) {
        const conflicted = new Set<string>();
        for (const r of rejected) {
          if (r?.entity) conflicted.add(r.entity);
        }
        if (conflicted.size > 0) pullEntities = [...conflicted];
      }

      let hasChanges = true;
      try {
        const cr = pullEntities
          ? { hasChanges: true, changed: Object.fromEntries(pullEntities.map(e => [e, 1])) }
          : await apiSyncCheck(freshToken(), lastSyncAt, userId);
        hasChanges = cr.hasChanges;
      } catch (checkErr) {
        if (isKickedOutError(checkErr)) { handleKickedOut(); return; }
        hasChanges = true;
      }

      if (hasChanges) {
        let pullResult: SyncPullResult | null = null;
        try {
          if (pullEntities) {
            pullResult = await apiSyncPullPost(freshToken(), { entities: pullEntities, since: lastSyncAt > 0 ? lastSyncAt : undefined });
          } else {
            pullResult = await apiSyncPull(freshToken(), userId, lastSyncAt > 0 ? lastSyncAt : undefined);
          }
        } catch (pullErr) {
          if (isKickedOutError(pullErr)) { handleKickedOut(); return; }
          log.error(pullErr, { phase: 'pull' });
        }

        if (pullResult?.data) {
          let patch: Record<string, unknown> = {};
          try {
            patch = await applyService.applyServerChanges(pullResult.data, deletedIdsProvider(), signal);
          } catch (applyErr) {
            log.error(applyErr, { phase: 'applyServerChanges' });
          }
          if (patch && Object.keys(patch).length) onChanges?.(patch);

          // Per-entity timestamps
          try {
            const st = pullResult.serverTime;
            const iso = st > 0 ? new Date(st).toISOString() : new Date().toISOString();
            for (const entity of Object.keys(pullResult.data)) {
              if (Array.isArray(pullResult.data[entity]) && pullResult.data[entity].length > 0) {
                await setLastSyncTimestamp(entity, iso);
              }
            }
          } catch (tsErr) {
            log.warn(tsErr, { phase: 'updateSyncTimestamps' });
          }
        }
      }
    }

    // Large-push safeguard: even when push was clean, check if server has new changes
    if (wasLargePush) {
      try {
        const cr = await apiSyncCheck(freshToken(), lastSyncAt, userId);
        if (cr.hasChanges) {
          const pullResult = await apiSyncPull(freshToken(), userId, lastSyncAt > 0 ? lastSyncAt : undefined);
          if (pullResult?.data) {
            const patch = await applyService.applyServerChanges(pullResult.data, deletedIdsProvider(), signal);
            if (patch && Object.keys(patch).length) onChanges?.(patch);
          }
        }
      } catch (checkErr) {
        if (isKickedOutError(checkErr)) { handleKickedOut(); return; }
        log.warn(checkErr, { phase: 'large-push check' });
      }
    }
  }
}