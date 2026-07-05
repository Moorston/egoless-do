// ─── SyncApplyService ──────────────────────────────────────────────
// Extracted from SyncEngine.ts (PR-1 of AR-01 refactoring)
// Handles applying server changes to local SQLite and generating store patches.

import { openDatabase, withDbLock } from '../../db/schema';
import type { SyncEntity } from '@egoless-do/core';
import { SCHEMAS, buildServerPayloadToRow, createLogger } from '@egoless-do/core';
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
  rowToBreath, rowToZhiguanSession,
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
  bodyGoal: 'bodyGoals', bodyPlan: 'bodyPlans',
  weightRecord: 'weightRecords', bodyCheckin: 'bodyCheckins',
  sleep: 'sleepHistory',
  give: 'giveHistory',
  motivationEntry: 'motivationLog', customWuxing: 'customWuxingMaps',
  vision: 'visions', visionPractice: 'visionPractices', dedication: 'dedications',
  mantraDef: 'mantraDefs', mantraSession: 'mantraSessions',
  sutraReading: 'readingSessions',
  fearEntry: 'fearEntries', courageEntry: 'courageEntries', fearAchievement: 'achievements',
  breath: 'breathHistory', zhiguanSession: 'sessions',
};

// ── Constants: Collection name → Entity mapping ─────────────────────
export const ENTITY_COLL_MAP: Record<string, string> = {
  habits: 'habit', mind_reflections: 'reflection', fasting_sessions: 'fasting',
  food_entries: 'food', checkin_records: 'checkin', meditation_history: 'meditation',
  user_profiles: 'profile', exercise_entries: 'exercise', plans: 'plan',
  plan_items: 'planItem', plan_item_checkins: 'planItemCheckin',
  daily_custom_todos: 'dailyCustomTodo', daily_todo_history: 'dailyTodoHistory',
  grace_history: 'grace', thought_trails: 'thoughtTrail', trail_notes: 'trailNote',
  reflection_links: 'reflectionLink', ai_configs: 'aiConfig', checkin_reviews: 'checkinReview',
  body_goals: 'bodyGoal', body_plans: 'bodyPlan',
  body_weight_records: 'weightRecord', body_checkins: 'bodyCheckin',
  sleep_records: 'sleep',
  give_entries: 'give',
  eating_motivations: 'motivationEntry', custom_wuxing_maps: 'customWuxing',
  visions: 'vision', vision_practices: 'visionPractice', dedications: 'dedication',
  mantra_defs: 'mantraDef', mantra_sessions: 'mantraSession',
  sutra_reading_sessions: 'sutraReading',
  fear_entries: 'fearEntry', courage_entries: 'courageEntry', fear_achievements: 'fearAchievement',
  breath_records: 'breath', zhiguan_sessions: 'zhiguanSession',
};

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
};

// ── Server payload → Row converters ─────────────────────────────────
const _serverPayloadToRowFns = Object.fromEntries(
  (Object.keys(SCHEMAS) as SyncEntity[]).map(k => [k, buildServerPayloadToRow(SCHEMAS[k])])
) as Record<string, (r: Record<string, unknown>) => Record<string, unknown> | null>;

// Validate all SCHEMAS entities are covered (dev-only check)
const _specialEntities = new Set(['aiConfig']);
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

export class SyncApplyService {
  /** Convert server payload to SQLite row format */
  serverPayloadToRow(entity: string, r: Record<string, unknown>): Record<string, unknown> | null {
    return _serverPayloadToRowFns[entity]?.(r) ?? null;
  }

  /** Resolve entity ID from payload using PK or fallbacks */
  resolveEntityId(r: Record<string, unknown>, pk: string, fallback?: string): string | undefined {
    return (r[pk] ?? r.id ?? r.date) as string | undefined ?? fallback;
  }

  /** Apply server changes to SQLite and generate store patch */
  async applyServerChanges(
    data: Record<string, unknown[]>,
    deletedIds?: Set<string>,
    signal?: AbortSignal,
  ): Promise<Record<string, unknown>> {
    const db = await openDatabase();
    const patch: Record<string, unknown> = {};
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
          const { storeMapped } = await this.applyEntityToTable(db, entity, records as Record<string, unknown>[], deletedIds, signal);
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
        (patch as any)._failedEntities = failedEntities;
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
  ): Promise<{ applied: unknown[]; storeMapped: unknown[] }> {
    const config = ENTITY_CONFIG[entity];
    if (!config) return { applied: [], storeMapped: [] };
    const { table, pk } = config;

    const alive = records.filter(r => r && !r.deleted);
    const dead = records.filter(r => r && r.deleted);
    const applied: unknown[] = [];
    const storeMapped: unknown[] = [];
    const mapper = _rowToEntityMap[entity];

    // Build local metadata lookup for alive records
    const allIds = [...alive, ...dead].map(r => this.resolveEntityId(r, pk, entity === 'profile' ? 'self' : undefined)).filter(Boolean) as string[];
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

    // Process alive records (upsert)
    for (const r of alive) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const id = this.resolveEntityId(r, pk, entity === 'profile' ? 'self' : undefined);
      if (!id) continue;

      // Skip if locally deleted (recycle bin)
      if (deletedIds?.has(id)) {
        log.debug(`[applyEntityToTable] Skipping ${entity}:${id} — in recycle bin`);
        continue;
      }

      const row = this.serverPayloadToRow(entity, r);
      if (!row) continue;

      const local = localMeta.get(id);
      const serverUpdated = (r.updated_at ?? r.updatedAt ?? 0) as number;

      // Conflict resolution: server wins if newer OR local not synced
      if (local && local.updated_at > serverUpdated && local.deleted === 0) {
        log.debug(`[applyEntityToTable] Skipping ${entity}:${id} — local newer (${local.updated_at} > ${serverUpdated})`);
        continue;
      }

      try {
        const cols = Object.keys(row);
        const vals = Object.values(row) as (string | number | null)[];
        if (cols.length === 0) continue;

        const setClause = cols.map(c => `${c}=?`).join(',');
        const result = await db.runAsync(
          `UPDATE ${table} SET ${setClause},deleted=0,synced=1 WHERE ${pk}=?`,
          [...vals, id]
        );
        if (result.changes === 0) {
          await db.runAsync(
            `INSERT INTO ${table} (${cols.join(',')},deleted,synced) VALUES (${cols.map(() => '?').join(',')},0,1)`,
            vals
          );
        }
        applied.push(row);
        if (mapper) storeMapped.push(mapper(row));
      } catch (e) {
        log.error(e, { entity, id, phase: 'applyEntity-alive' });
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
          const ph = ids.map(() => '?').join(',');
          await db.runAsync(`UPDATE ${config.table} SET synced=1 WHERE ${config.pk} IN (${ph})`, ids);
        }
        for (const entity in deleted) {
          const ids = deleted[entity];
          if (!ids?.length) continue;
          const config = ENTITY_CONFIG[entity];
          if (!config) continue;
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