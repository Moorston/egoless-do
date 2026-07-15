// ─── SyncApplyService ──────────────────────────────────────────────
// Extracted from SyncEngine.ts (PR-1 of AR-01 refactoring)
// Handles applying server changes to local SQLite and generating store patches.

import type { SyncEntity } from '@egoless-do/core';
import { SCHEMAS, buildServerPayloadToRow, pbField, createLogger } from '@egoless-do/core';

import { openDatabase, withDbLock } from '../../db/schema';
import { isValidSqlName } from '../../db/sqlHelper';
import {
  rowToHabit, rowToReflection, rowToFasting, rowToFood, rowToCheckin,
  rowToExercise, rowToMeditation, rowToProfile, rowToPlan, rowToPlanItem,
  rowToPlanItemCheckin, rowToGrace, rowToDailyCustomTodo, rowToDailyTodoHistory,
  rowToThoughtTrail, rowToTrailNote, rowToReflectionLink, rowToAIConfig, rowToCheckinReview,
  rowToBodyGoal, rowToBodyPlan, rowToWeightRecord, rowToBodyCheckin, rowToSleep, rowToGive,
  rowToMotivationEntry, rowToCustomWuxing,
  rowToVision, rowToVisionPractice, rowToDedication, rowToMantraDef, rowToMantraSession,
  rowToFearEntry, rowToCourageEntry, rowToFearAchievement,
  rowToSutraReading,
  rowToBreath, rowToZhiguanSession, rowToFoodPreset,
} from '../../store/rowMappers';

import type { RowMapper } from './orphanRecovery';

const log = createLogger('SyncApply');

// ── Constants: Entity → Table/PK mapping ────────────────────────────
export const ENTITY_CONFIG: Record<string, { table: string; pk: string }> = Object.fromEntries(
  (Object.keys(SCHEMAS) as SyncEntity[]).map(k => [k, { table: SCHEMAS[k].sqlite.table, pk: SCHEMAS[k].sqlite.pk }])
);

// ── Constants: Entity → Store key mapping ───────────────────────────
export const ENTITY_STORE_KEY: Record<string, string> = {
  habit: 'habits', reflection: 'reflections', fasting: 'fastingHistory',
  food: 'foodLog', checkin: 'checkinHistory', exercise: 'exerciseLog',
  meditation: 'medHistory', profile: 'userProfile',
  plan: 'plans', planItem: 'planItems', planItemCheckin: 'planItemCheckins',
  grace: 'graceHistory', dailyCustomTodo: 'dailyCustomTodos', dailyTodoHistory: 'dailyTodoHistory',
  thoughtTrail: 'thoughtTrails', trailNote: 'trailNotes',
  reflectionLink: 'reflectionLinks', checkinReview: 'checkinReviews',
  bodyGoal: 'bodyGoals', bodyPlan: 'bodyPlans', bodyTrainingPlan: 'bodyTrainingPlans',
  weightRecord: 'weightRecords', bodyCheckin: 'bodyCheckins',
  sleep: 'sleepHistory',
  give: 'giveHistory',
  motivationEntry: 'motivationLog', customWuxing: 'customWuxingMaps',
  vision: 'visions', visionPractice: 'visionPractices', dedication: 'dedications',
  mantraDef: 'mantraDefs', mantraSession: 'mantraSessions',
  sutraReading: 'readingSessions',
  fearEntry: 'fearEntries', courageEntry: 'courageEntries', fearAchievement: 'achievements',
  breath: 'breathHistory', zhiguanSession: 'sessions',
  foodPreset: 'customFoodPresets',
};

// Entities that intentionally have no store key (handled via special logic in applyEntityToTable)
const _specialEntities = new Set(['aiConfig']);

// DEV-only validation: ensure all SCHEMAS entities have a store key mapping
if (__DEV__) {
  const registeredEntities = new Set(Object.keys(SCHEMAS));
  const mappedEntities = new Set(Object.keys(ENTITY_STORE_KEY));
  for (const entity of registeredEntities) {
    if (!mappedEntities.has(entity) && !_specialEntities.has(entity)) {
      console.warn(`[SyncApply] Entity "${entity}" found in SCHEMAS but missing from ENTITY_STORE_KEY`);
    }
  }
}

// ── Constants: Collection name → Entity mapping ─────────────────────
// Derive from SCHEMAS — the sqlite.table field is the canonical source for collection names
const SCHEMA_COLLECTION_MAP: Record<string, string> = Object.fromEntries(
  (Object.keys(SCHEMAS) as SyncEntity[]).map(k => [SCHEMAS[k].sqlite.table, k])
);
export const ENTITY_COLL_MAP: Record<string, string> = { ...SCHEMA_COLLECTION_MAP };

// Add aliases for entities whose collection name differs between PocketBase and SQLite
// (e.g., AI configs have a different collection name on the PB side)
// Override any entries that differ from the auto-derived mapping
const PB_COLLECTION_OVERRIDES: Record<string, string> = {
  ai_configs: 'aiConfig',
  // Add other PB-specific overrides here if needed
};
for (const [pbColl, entity] of Object.entries(PB_COLLECTION_OVERRIDES)) {
  ENTITY_COLL_MAP[pbColl] = entity;
}

// ── Row mappers: Entity → Mapper function ───────────────────────────
const _rowToEntityMap: Record<string, (row: Record<string, unknown>) => unknown> = {
  habit: rowToHabit, reflection: rowToReflection, fasting: rowToFasting,
  food: rowToFood, checkin: rowToCheckin, exercise: rowToExercise,
  meditation: rowToMeditation, profile: rowToProfile, plan: rowToPlan,
  planItem: rowToPlanItem, planItemCheckin: rowToPlanItemCheckin,
  grace: rowToGrace, dailyCustomTodo: rowToDailyCustomTodo,
  dailyTodoHistory: rowToDailyTodoHistory, thoughtTrail: rowToThoughtTrail,
  trailNote: rowToTrailNote, reflectionLink: rowToReflectionLink,
  aiConfig: rowToAIConfig, checkinReview: rowToCheckinReview,
  bodyGoal: rowToBodyGoal, bodyPlan: rowToBodyPlan,
  weightRecord: rowToWeightRecord, bodyCheckin: rowToBodyCheckin,
  sleep: rowToSleep,
  give: rowToGive,
  motivationEntry: rowToMotivationEntry, customWuxing: rowToCustomWuxing,
  vision: rowToVision, visionPractice: rowToVisionPractice, dedication: rowToDedication,
  mantraDef: rowToMantraDef, mantraSession: rowToMantraSession,
  sutraReading: rowToSutraReading,
  fearEntry: rowToFearEntry, courageEntry: rowToCourageEntry, fearAchievement: rowToFearAchievement,
  breath: rowToBreath, zhiguanSession: rowToZhiguanSession,
  foodPreset: rowToFoodPreset,
};

// ── Server payload → Row converters ─────────────────────────────────
const _serverPayloadToRowFns = Object.fromEntries(
  (Object.keys(SCHEMAS) as SyncEntity[]).map(k => [k, buildServerPayloadToRow(SCHEMAS[k])])
) as Record<string, (r: Record<string, unknown>) => Record<string, unknown> | null>;

// Validate all SCHEMAS entities are covered (dev-only check)
if (__DEV__) {
  for (const key of Object.keys(SCHEMAS) as SyncEntity[]) {
    if (!ENTITY_STORE_KEY[key] && !_specialEntities.has(key)) {
      log.warn(`[SyncApplyService] Entity "${key}" missing from ENTITY_STORE_KEY`);
    }
    if (!ENTITY_COLL_MAP[SCHEMAS[key].sqlite.table]) {
      log.warn(`[SyncApplyService] Entity "${key}" table "${SCHEMAS[key].sqlite.table}" missing from ENTITY_COLL_MAP`);
    }
  }
}

// ── DOMException polyfill ───────────────────────────────────────────
const DOMException = (globalThis as Record<string, unknown>).DOMException as typeof Error | undefined
  ?? class DOMException extends Error {
    constructor(message?: string, name?: string) {
      super(message);
      this.name = name ?? 'DOMException';
    }
  };

/** Result from applyServerChanges, extends the store patch with metadata. */
export interface ApplyResult extends Record<string, unknown> {
  _failedEntities?: string[];
}

export class SyncApplyService {
  /**
   * In-memory set of recently deleted entity IDs (entity:id format) — prevents sync resurrection.
   *
   * Limitation: The 60-second window is lost on app restart. If the app is killed and
   * restarted within 60 seconds of a delete, the server delete may be applied back to
   * local state before the local delete re-propagates. This is acceptable because the
   * orphan recovery mechanism in SyncEngine handles cross-session consistency by detecting
   * and re-deleting items that were locally deleted but not yet synced.
   */
  private _locallyDeleted = new Set<string>();
  private _locallyDeletedTimers = new Map<string, ReturnType<typeof setTimeout>>();

  /** Register a locally deleted entity so sync won't resurrect it */
  registerLocalDelete(entity: string, id: string) {
    const key = `${entity}:${id}`;
    // Clear existing timer to avoid accumulation on rapid re-deletes
    const existing = this._locallyDeletedTimers.get(key);
    if (existing) clearTimeout(existing);
    this._locallyDeleted.add(key);
    this._locallyDeletedTimers.set(key, setTimeout(() => {
      this._locallyDeleted.delete(key);
      this._locallyDeletedTimers.delete(key);
    }, 60_000));
  }

  /** Convert server payload to SQLite row format */
  serverPayloadToRow(entity: string, r: Record<string, unknown>): Record<string, unknown> | null {
    return _serverPayloadToRowFns[entity]?.(r) ?? null;
  }

  /** Resolve entity ID from payload using PK or fallbacks (supports nested data) */
  resolveEntityId(r: Record<string, unknown>, pk: string, fallback?: string): string | undefined {
    return (pbField(r, pk) ?? pbField(r, 'id') ?? pbField(r, 'date')) as string | undefined ?? fallback;
  }

  /** Apply server changes to SQLite and generate store patch */
  async applyServerChanges(
    data: Record<string, unknown[]>,
    deletedIds?: Set<string>,
    signal?: AbortSignal,
    clockOffset = 0,
  ): Promise<ApplyResult> {
    const db = await openDatabase();
    const patch: ApplyResult = {};
    const failedEntities: string[] = [];
    if (!data || typeof data !== 'object') return patch;
    const entries = Object.entries(data);
    log.debug(`[applyServerChanges] Processing ${entries.length} entities: ${entries.map(([k, v]) => `${k}(${v.length})`).join(', ')}`);

    return withDbLock(async () => {
      for (const [entity, records] of entries) {
        if (!Array.isArray(records) || records.length === 0) continue;
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        try {
          log.debug(`[applyServerChanges] Processing ${entity}: ${records.length} records`);
          const { storeMapped } = await this.applyEntityToTable(db, entity, records as Record<string, unknown>[], deletedIds, signal, clockOffset);
          log.debug(`[applyServerChanges] ${entity}: applied ${storeMapped.length} records to store`);

          // Special handling for meditation (total minutes calculation)
          if (entity === 'meditation') {
            const allMed = await db.getAllAsync<{ dur_min: number }>('SELECT dur_min FROM meditation_history WHERE deleted = 0');
            patch.totalMedMinutes = allMed.reduce((sum, e) => sum + (e.dur_min || 0), 0);
          }
          // Special handling for aiConfig
          if (entity === 'aiConfig' && storeMapped.length > 0) {
            const latest = storeMapped[storeMapped.length - 1] as Record<string, unknown>;
            if (latest.mode) patch.aiMode = latest.mode;
            if (latest.models) patch.aiModels = latest.models;
          }

          const storeKey = ENTITY_STORE_KEY[entity];
          if (storeKey && storeMapped.length > 0) patch[storeKey] = storeMapped;
        } catch (e) {
          failedEntities.push(entity);
          log.warn(`[applyServerChanges] Failed to apply entity "${entity}": ${e instanceof Error ? e.message : e}`);
          log.error(e, { entity, phase: 'applyEntity' });
        }
      }

      if (failedEntities.length > 0) {
        patch._failedEntities = failedEntities;
        log.warn(`[applyServerChanges] ${failedEntities.length} entity/entities failed to apply: ${failedEntities.join(', ')}`);
      }
      log.debug(`[applyServerChanges] Final patch keys: ${Object.keys(patch).join(', ')}`);
      return patch;
    });
  }

  /** Apply a single entity's records to its SQLite table */
  private async applyEntityToTable(
    db: Awaited<ReturnType<typeof openDatabase>>,
    entity: string,
    records: Record<string, unknown>[],
    deletedIds?: Set<string>,
    signal?: AbortSignal,
    clockOffset = 0,
  ): Promise<{ applied: unknown[]; storeMapped: unknown[] }> {
    const config = ENTITY_CONFIG[entity];
    if (!config) return { applied: [], storeMapped: [] };
    const { table, pk } = config;
    if (!isValidSqlName(table)) throw new Error(`Invalid table name: ${table}`);
    if (!isValidSqlName(pk)) throw new Error(`Invalid pk name: ${pk}`);

    const alive = records.filter(r => r && !r.deleted);
    const dead = records.filter(r => r && r.deleted);
    const applied: unknown[] = [];
    const storeMapped: unknown[] = [];
    const mapper = _rowToEntityMap[entity];

    // Build local metadata lookup for alive records
    const allIds = [...alive, ...dead].map(r => this.resolveEntityId(r, pk, entity === 'profile' ? 'self' : undefined)).filter((id): id is string => id !== undefined && id !== '') as string[];
    const localMeta = new Map<string, { updated_at: number; deleted: number }>();
    if (allIds.length > 0) {
      try {
        const ph = allIds.map(() => '?').join(',');
        const localRows = await db.getAllAsync<{ id: string; updated_at: number; deleted: number }>(
          `SELECT ${pk} as id, updated_at, deleted FROM ${table} WHERE ${pk} IN (${ph})`, allIds
        );
        for (const row of localRows) localMeta.set(row.id, row);
      } catch (e) {
        log.error(e, { entity, phase: 'localMeta' });
      }
    }

    // ── Phase 1: Prepare all upsertable rows (sync filtering + conflict check) ──
    type PreparedRow = { id: string; cols: string[]; vals: (string | number | null)[]; original: Record<string, unknown> };
    const toUpsert: PreparedRow[] = [];
    for (const r of alive) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const id = this.resolveEntityId(r, pk, entity === 'profile' ? 'self' : undefined);
      if (!id) continue;
      if (deletedIds?.has(id)) continue;
      if (this._locallyDeleted.has(`${entity}:${id}`)) continue;

      const row = this.serverPayloadToRow(entity, r);
      if (!row) continue;

      const local = localMeta.get(id);
      const serverUpdated = (pbField(r, 'updated_at') ?? pbField(r, 'updatedAt') ?? 0) as number;
      const adjustedLocalUpdated = local ? local.updated_at - clockOffset : 0;
      if (local && (local.deleted === 1 || adjustedLocalUpdated > serverUpdated)) continue;

      const cols = Object.keys(row);
      const vals = Object.values(row) as (string | number | null)[];
      for (const col of cols) { if (!isValidSqlName(col)) throw new Error(`Invalid column name: ${col}`); }
      if (cols.length === 0) continue;
      toUpsert.push({ id, cols, vals, original: row });
    }

    // ── Phase 2: Batch UPDATE (concurrent via Promise.all) ──
    if (toUpsert.length > 0) {
      // Group by column structure (all rows of same entity share the same columns)
      const sampleCols = toUpsert[0].cols;
      const setClause = sampleCols.map(c => `${c}=?`).join(',');
      const updateResults = await Promise.all(
        toUpsert.map(({ id, vals }) =>
          db.runAsync(`UPDATE ${table} SET ${setClause},deleted=0,synced=1 WHERE ${pk}=?`, [...vals, id])
            .catch((e) => { log.error(e, { entity, id, phase: 'batch-update' }); return { changes: 0 }; })
        )
      );

      // ── Phase 3: INSERT fallback for rows that didn't exist ──
      const insertCols = sampleCols;
      const insertPh = insertCols.map(() => '?').join(',');
      for (let i = 0; i < toUpsert.length; i++) {
        if (updateResults[i].changes === 0) {
          try {
            await db.runAsync(
              `INSERT INTO ${table} (${insertCols.join(',')},deleted,synced) VALUES (${insertPh},0,1)`,
              toUpsert[i].vals
            );
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (msg.includes('UNIQUE constraint')) {
              // Race condition: row appeared between UPDATE and INSERT — retry UPDATE
              try {
                await db.runAsync(
                  `UPDATE ${table} SET ${setClause},deleted=0,synced=1 WHERE ${pk}=?`,
                  [...toUpsert[i].vals, toUpsert[i].id]
                );
              } catch (retryErr) {
                log.warn(`Retry UPDATE after UNIQUE failed for ${entity}:${toUpsert[i].id}`);
              }
            } else {
              log.error(e, { entity, id: toUpsert[i].id, phase: 'batch-insert-fallback' });
            }
          }
        }
        applied.push(toUpsert[i].original);
        if (mapper) storeMapped.push(mapper(toUpsert[i].original));
      }
    }

    // Process dead records (mark deleted)
    for (const r of dead) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const id = this.resolveEntityId(r, pk);
      if (!id) continue;

      try {
        await db.runAsync(`UPDATE ${table} SET deleted=1,synced=1 WHERE ${pk}=?`, [id]);
        applied.push({ ...r, deleted: true });

        // Cascade delete for plan entity
        if (entity === 'plan') {
          await db.runAsync('UPDATE plan_items SET deleted=1,synced=0 WHERE plan_id=?', [id]);
          await db.runAsync('UPDATE plan_item_checkins SET deleted=1,synced=0 WHERE plan_item_id IN (SELECT id FROM plan_items WHERE plan_id=?)', [id]);
          await db.runAsync('UPDATE daily_custom_todos SET deleted=1,synced=0 WHERE plan_id=?', [id]);
          await db.runAsync('UPDATE daily_todo_history SET deleted=1,synced=0 WHERE plan_id=?', [id]);
          await db.runAsync('UPDATE mind_reflections SET linked_plan_item_id=NULL,updated_at=? WHERE linked_plan_item_id IN (SELECT id FROM plan_items WHERE plan_id=?)', [Date.now(), id]);
          await db.runAsync('UPDATE thought_trails SET linked_plan_item_ids=NULL,updated_at=? WHERE linked_plan_item_ids LIKE ?', [Date.now(), `%"${id}"%`]);
        }
      } catch (e) {
        log.error(e, { entity, phase: 'applyEntity-dead' });
      }
    }

    return { applied, storeMapped };
  }

  /** Mark records as synced and remove from sync queue */
  async markSyncedAndRemove(
    upserted: Record<string, string[]>,
    deleted: Record<string, string[]>,
    queueIds: number[],
    onHasSyncedDeletes?: () => void,
  ): Promise<void> {
    const db = await openDatabase();
    try {
      await withDbLock(async () => {
        for (const entity in upserted) {
          const ids = upserted[entity];
          if (!ids?.length) continue;
          const config = ENTITY_CONFIG[entity];
          if (!config) continue;
          if (!isValidSqlName(config.table)) throw new Error(`Invalid table name: ${config.table}`);
          if (!isValidSqlName(config.pk)) throw new Error(`Invalid pk name: ${config.pk}`);
          const ph = ids.map(() => '?').join(',');
          await db.runAsync(`UPDATE ${config.table} SET synced=1 WHERE ${config.pk} IN (${ph})`, ids);
        }
        for (const entity in deleted) {
          const ids = deleted[entity];
          if (!ids?.length) continue;
          const config = ENTITY_CONFIG[entity];
          if (!config) continue;
          if (!isValidSqlName(config.table)) throw new Error(`Invalid table name: ${config.table}`);
          if (!isValidSqlName(config.pk)) throw new Error(`Invalid pk name: ${config.pk}`);
          const ph = ids.map(() => '?').join(',');
          await db.runAsync(`UPDATE ${config.table} SET synced=1 WHERE ${config.pk} IN (${ph}) AND deleted=1`, ids);
        }
        if (queueIds.length) {
          const ph = queueIds.map(() => '?').join(',');
          await db.runAsync(`DELETE FROM sync_queue WHERE id IN (${ph})`, queueIds);
        }
      });
      if (Object.keys(deleted).length > 0 && onHasSyncedDeletes) {
        onHasSyncedDeletes();
      }
    } catch (err) {
      log.error(err, { phase: 'markSyncedAndRemove' });
      throw err;
    }
  }

  /** Get row mapper for an entity */
  getRowMapper(entity: string): RowMapper | undefined {
    return _rowToEntityMap[entity] as RowMapper | undefined;
  }
}