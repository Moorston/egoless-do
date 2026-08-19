// ─── Orphan Recovery Logic ──────────────────────────────────────────
// Extracted from SyncEngine to reduce God Class complexity.
// Finds records in SQLite that are not in sync_queue and re-enqueues them.

import { createLogger } from '@egoless-do/core';
import type { SyncEntity } from '@egoless-do/core';

import { openDatabase } from '../../db/schema';
import { enqueueChange } from '../../db/syncQueue';

const log = createLogger('OrphanRecovery');

/** Entity configuration for orphan recovery */
export interface EntityConfig {
  table: string;
  pk: string;
}

/** Row mapper function type */
export type RowMapper = (row: Record<string, unknown>) => Record<string, unknown>;

/** Function to get row mapper for an entity */
export type GetRowMapperFn = (entity: string) => RowMapper | undefined;

/** Result of orphan recovery scan */
export interface OrphanRecoveryResult {
  total: number;
  byEntity: Record<string, number>;
}

/** Scan for orphaned records and re-enqueue them for sync.
 *  Orphans are records with synced=0 or synced=2 that are not in sync_queue.
 *  Runs up to 5 rounds of 200 items per entity to handle large backlogs.
 */
export async function recoverOrphans(
  entityConfig: Record<string, EntityConfig>,
  getRowMapper: GetRowMapperFn,
  maxRounds = 5,
  batchSize = 200,
): Promise<OrphanRecoveryResult> {
  const db = await openDatabase();
  let total = 0;
  const byEntity: Record<string, number> = {};

  for (let round = 0; round < maxRounds; round++) {
    let roundTotal = 0;

    for (const [entity, config] of Object.entries(entityConfig)) {
      try {
        // Single query: fetch full rows directly (eliminates N+1 pattern)
        const orphans = await db.getAllAsync<Record<string, unknown>>(
          `SELECT * FROM ${config.table} WHERE (synced=0 OR synced=2) AND ${config.pk} NOT IN (SELECT entity_id FROM sync_queue WHERE entity=?) LIMIT ?`,
          [entity, batchSize],
        );

        for (const full of orphans) {
          const id = full[config.pk] as string;
          // eslint-disable-next-line max-depth -- warning-reduction: high-risk sync/store/migration data fn; depth refactor deferred to avoid data-corruption risk
          if (!id) continue;

          // eslint-disable-next-line max-depth -- warning-reduction: high-risk sync/store/migration data fn; depth refactor deferred to avoid data-corruption risk
          try {
            // Convert snake_case SQLite row to camelCase entity for consistent server data
            const mapper = getRowMapper(entity);
            const entityData = mapper ? mapper(full) : full;
            await enqueueChange(entity as SyncEntity, id, 'upsert', entityData as Record<string, unknown>);
          } catch (e) {
            log.error(e, { entity, id, phase: 'orphan-enqueue' });
          }
        }

        const count = orphans.length;
        roundTotal += count;
        if (count > 0) {
          byEntity[entity] = (byEntity[entity] || 0) + count;
        }
      } catch (e) {
        log.error(e, { entity, phase: 'orphan-scan' });
      }
    }

    total += roundTotal;
    if (roundTotal === 0) break;
  }

  return { total, byEntity };
}

/** Check if orphan recovery should run based on last scan time.
 *  Returns true if enough time has passed since last scan.
 */
export function shouldRunOrphanRecovery(lastScanAt: number, minIntervalMs = 30_000): boolean {
  return !lastScanAt || Date.now() - lastScanAt > minIntervalMs;
}
