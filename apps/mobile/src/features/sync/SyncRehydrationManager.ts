// ─── SyncRehydrationManager ────────────────────────────────────────────
// Extracted from SyncEngine.ts (PR-3 of AR-01 refactoring)
// Handles rehydration from SQLite and initial sync with phased pull.

import { createLogger, apiSyncPullEntity } from '@egoless-do/core';
import type { SyncEntity } from '@egoless-do/core';

import { dbGetAllFoodEntries } from '../../db/queries';
import { openDatabase, getState, setState } from '../../db/schema';
import { getSyncProgress, updateSyncProgress } from '../../db/syncQueue';
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

const log = createLogger('Rehydration');
const DEVICE_SYNCED_KEY = 'device_initial_synced';

export class SyncRehydrationManager {
  /** Check if device has been synced before */
  async isDeviceSyncedBefore(): Promise<boolean> {
    try {
      const db = await openDatabase();
      return (await getState(db, DEVICE_SYNCED_KEY)) === '1';
    } catch {
      return false;
    }
  }

  /** Query a single entity from SQLite (extracted for batched parallel rehydration) */
  private async queryEntity(
    db: Awaited<ReturnType<typeof openDatabase>>,
    entity: string,
    REHYDRATE_MAP: Record<string, { table: string; query: string; mapper: (r: Record<string, unknown>) => unknown; storeKey: string }>,
  ): Promise<{ entity: string; data?: unknown[]; rows?: Record<string, unknown>[]; config?: NonNullable<typeof REHYDRATE_MAP[string]>; storeKey?: string } | null> {
    try {
      if (entity === 'food') {
        const rows = await dbGetAllFoodEntries(db) as unknown as Record<string, unknown>[];
        const sorted = rows.length
          ? rows.sort((a, b) => ((b as Record<string, unknown>).timestamp as number) - ((a as Record<string, unknown>).timestamp as number))
          : [];
        return { entity, data: sorted, storeKey: 'foodLog' };
      }
      const config = REHYDRATE_MAP[entity];
      if (!config) return null;
      const rows = await db.getAllAsync<Record<string, unknown>>(config.query);
      return { entity, rows, config };
    } catch (e) {
      log.error(e, { phase: 'rehydrateFromDb', entity });
      return null;
    }
  }

  /** Rehydrate entities from SQLite into a store patch */
  async rehydrateFromDb(entities?: string[]): Promise<Record<string, unknown>> {
    const db = await openDatabase();
    const patch: Record<string, unknown> = {};
    const REHYDRATE_MAP: Record<string, { table: string; query: string; mapper: (r: Record<string, unknown>) => unknown; storeKey: string }> = {
      habit: { table: 'habits', query: 'SELECT * FROM habits WHERE deleted = 0', mapper: rowToHabit, storeKey: 'habits' },
      food: { table: 'food_entries', query: '', mapper: rowToFood, storeKey: 'foodLog' },
      reflection: { table: 'mind_reflections', query: 'SELECT * FROM mind_reflections WHERE deleted = 0', mapper: rowToReflection, storeKey: 'reflections' },
      fasting: { table: 'fasting_sessions', query: 'SELECT * FROM fasting_sessions WHERE deleted = 0', mapper: rowToFasting, storeKey: 'fastingHistory' },
      checkin: { table: 'checkin_records', query: 'SELECT * FROM checkin_records WHERE deleted = 0', mapper: rowToCheckin, storeKey: 'checkinHistory' },
      exercise: { table: 'exercise_entries', query: 'SELECT * FROM exercise_entries WHERE deleted = 0', mapper: rowToExercise, storeKey: 'exerciseLog' },
      meditation: { table: 'meditation_history', query: 'SELECT * FROM meditation_history WHERE deleted = 0', mapper: rowToMeditation, storeKey: 'medHistory' },
      profile: { table: 'user_profiles', query: 'SELECT * FROM user_profiles WHERE deleted = 0', mapper: rowToProfile, storeKey: 'userProfile' },
      plan: { table: 'plans', query: 'SELECT * FROM plans WHERE deleted = 0', mapper: rowToPlan, storeKey: 'plans' },
      planItem: { table: 'plan_items', query: 'SELECT * FROM plan_items WHERE deleted = 0', mapper: rowToPlanItem, storeKey: 'planItems' },
      planItemCheckin: { table: 'plan_item_checkins', query: 'SELECT * FROM plan_item_checkins WHERE deleted = 0', mapper: rowToPlanItemCheckin, storeKey: 'planItemCheckins' },
      grace: { table: 'grace_history', query: 'SELECT * FROM grace_history WHERE deleted = 0', mapper: rowToGrace, storeKey: 'graceHistory' },
      dailyCustomTodo: { table: 'daily_custom_todos', query: 'SELECT * FROM daily_custom_todos WHERE deleted = 0', mapper: rowToDailyCustomTodo, storeKey: 'dailyCustomTodos' },
      dailyTodoHistory: { table: 'daily_todo_history', query: 'SELECT * FROM daily_todo_history WHERE deleted = 0', mapper: rowToDailyTodoHistory, storeKey: 'dailyTodoHistory' },
      thoughtTrail: { table: 'thought_trails', query: 'SELECT * FROM thought_trails WHERE deleted = 0', mapper: rowToThoughtTrail, storeKey: 'thoughtTrails' },
      trailNote: { table: 'trail_notes', query: 'SELECT * FROM trail_notes WHERE deleted = 0', mapper: rowToTrailNote, storeKey: 'trailNotes' },
      reflectionLink: { table: 'reflection_links', query: 'SELECT * FROM reflection_links WHERE deleted = 0', mapper: rowToReflectionLink, storeKey: 'reflectionLinks' },
      aiConfig: { table: 'ai_configs', query: "SELECT * FROM ai_configs WHERE config_id='self' AND deleted=0", mapper: rowToAIConfig, storeKey: '_aiConfig' },
      checkinReview: { table: 'checkin_reviews', query: 'SELECT * FROM checkin_reviews WHERE deleted = 0', mapper: rowToCheckinReview, storeKey: 'checkinReviews' },
      bodyGoal: { table: 'body_goals', query: 'SELECT * FROM body_goals WHERE deleted = 0', mapper: rowToBodyGoal, storeKey: 'bodyGoals' },
      bodyPlan: { table: 'body_plans', query: 'SELECT * FROM body_plans WHERE deleted = 0', mapper: rowToBodyPlan, storeKey: 'bodyPlans' },
      weightRecord: { table: 'body_weight_records', query: 'SELECT * FROM body_weight_records WHERE deleted = 0', mapper: rowToWeightRecord, storeKey: 'weightRecords' },
      bodyCheckin: { table: 'body_checkins', query: 'SELECT * FROM body_checkins WHERE deleted = 0', mapper: rowToBodyCheckin, storeKey: 'bodyCheckins' },
      sleep: { table: 'sleep_records', query: 'SELECT * FROM sleep_records WHERE deleted = 0', mapper: rowToSleep, storeKey: 'sleepHistory' },
      give: { table: 'give_entries', query: 'SELECT * FROM give_entries WHERE deleted = 0', mapper: rowToGive, storeKey: 'giveHistory' },
      motivationEntry: { table: 'eating_motivations', query: 'SELECT * FROM eating_motivations WHERE deleted = 0', mapper: rowToMotivationEntry, storeKey: 'motivationLog' },
      customWuxing: { table: 'custom_wuxing_maps', query: 'SELECT * FROM custom_wuxing_maps WHERE deleted = 0', mapper: rowToCustomWuxing, storeKey: 'customWuxingMaps' },
      vision: { table: 'visions', query: 'SELECT * FROM visions WHERE deleted = 0', mapper: rowToVision, storeKey: 'visions' },
      visionPractice: { table: 'vision_practices', query: 'SELECT * FROM vision_practices WHERE deleted = 0', mapper: rowToVisionPractice, storeKey: 'visionPractices' },
      mantraDef: { table: 'mantra_defs', query: 'SELECT * FROM mantra_defs WHERE deleted = 0', mapper: rowToMantraDef, storeKey: 'mantraDefs' },
      mantraSession: { table: 'mantra_sessions', query: 'SELECT * FROM mantra_sessions WHERE deleted = 0', mapper: rowToMantraSession, storeKey: 'mantraSessions' },
      dedication: { table: 'dedications', query: 'SELECT * FROM dedications WHERE deleted = 0', mapper: rowToDedication, storeKey: 'dedications' },
      fearEntry: { table: 'fear_entries', query: 'SELECT * FROM fear_entries WHERE deleted = 0', mapper: rowToFearEntry, storeKey: 'fearEntries' },
      courageEntry: { table: 'courage_entries', query: 'SELECT * FROM courage_entries WHERE deleted = 0', mapper: rowToCourageEntry, storeKey: 'courageEntries' },
      fearAchievement: { table: 'fear_achievements', query: 'SELECT * FROM fear_achievements WHERE deleted = 0', mapper: rowToFearAchievement, storeKey: 'achievements' },
      sutraReading: { table: 'sutra_reading_sessions', query: 'SELECT * FROM sutra_reading_sessions WHERE deleted = 0', mapper: rowToSutraReading, storeKey: 'readingSessions' },
      breath: { table: 'breath_records', query: 'SELECT * FROM breath_records WHERE deleted = 0', mapper: rowToBreath, storeKey: 'breathHistory' },
      zhiguanSession: { table: 'zhiguan_sessions', query: 'SELECT * FROM zhiguan_sessions WHERE deleted = 0', mapper: rowToZhiguanSession, storeKey: 'sessions' },
    };

    const targets = entities ?? Object.keys(REHYDRATE_MAP);
    log.debug(`[rehydrateFromDb] Rehydrating ${targets.length} entities: ${targets.join(', ')}`);

    // Batched parallel rehydration — process in groups of 8 to reduce peak memory
    // and SQLite contention on low-end devices (39 entities → 5 batches of ~8)
    const BATCH_SIZE = 8;
    const results: Array<Awaited<ReturnType<typeof this.queryEntity>> | null> = [];
    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
      const batch = targets.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(batch.map((entity) => this.queryEntity(db, entity, REHYDRATE_MAP)));
      results.push(...batchResults);
    }

    // Merge results into patch
    for (const result of results) {
      if (!result) continue;
      if ('data' in result && result.data) {
        // food entity (pre-sorted)
        patch[result.storeKey] = result.data;
        continue;
      }
      const { rows, config } = result as { entity: string; rows: Record<string, unknown>[]; config: NonNullable<typeof REHYDRATE_MAP[string]> };
      if (!rows || !config) continue;
      if (config.storeKey === '_aiConfig') {
        if (rows.length) {
          const mapped = rows.map(config.mapper);
          const ai = mapped[0] as { mode: string; models: unknown[] };
          if (ai) { patch.aiMode = ai.mode; patch.aiModels = ai.models; }
        }
      } else if (config.storeKey === 'userProfile') {
        if (rows.length) {
          patch.userProfile = rows.map(config.mapper)[0];
        }
      } else {
        patch[config.storeKey] = rows.length ? rows.map(config.mapper) : [];
      }
    }

    log.debug(`[rehydrateFromDb] Final patch keys: ${Object.keys(patch).join(', ')}`);
    if (patch.plans) {
      try {
        const { computePlanProgress } = await import('@egoless-do/core');
        (patch.plans as Record<string, unknown>[]).forEach((p) => {
          if (!p.deleted) p.progress = computePlanProgress(p as unknown as Parameters<typeof computePlanProgress>[0]);
        });
      } catch { /* computePlanProgress is optional enhancement — ignore */ }
    }
    return patch;
  }

  /** Lazy-load a single entity from SQLite into the store. */
  async lazyRehydrate(entity: string, onChanges: ((patch: Record<string, unknown>) => void) | null): Promise<void> {
    if (!onChanges) return;
    const patch = await this.rehydrateFromDb([entity]);
    if (Object.keys(patch).length) onChanges(patch);
  }

  // ── Initial sync ─────────────────────────────────────────────────────

  /**
   * Phase 1 initial sync: pulls priority entities first, then all remaining.
   * Uses phasing to get critical data (profile, checkin, etc.) to the user ASAP.
   */
  async initialSync(
    token: string,
    userId: string | undefined,
    applyServerChanges: (data: Record<string, unknown[]>, deletedIds?: Set<string>) => Promise<Record<string, unknown>>,
    isKickedOut: (err: unknown) => boolean,
    onInitialSyncingChange?: (v: boolean) => void,
  ): Promise<'done' | 'partial'> {
    const db = await openDatabase();
    const doneState = await getState(db, 'initialSyncDone');
    if (doneState === 'true') return 'done';

    onInitialSyncingChange?.(true);
    try {
      const PHASE_1: SyncEntity[] = ['profile', 'checkin', 'habit', 'grace'];

      await this.pullEntitiesParallel(PHASE_1, 1, 1, token, userId, applyServerChanges, isKickedOut);
      await setState(db, 'initialSyncPhase', '2');
      await setState(db, DEVICE_SYNCED_KEY, '1');

      // Also pull remaining entities so rehydrateFromDb has all data
      const allEntities: SyncEntity[] = ['reflection', 'fasting', 'food', 'exercise', 'meditation', 'plan', 'planItem', 'planItemCheckin', 'dailyCustomTodo', 'dailyTodoHistory', 'thoughtTrail', 'trailNote', 'reflectionLink', 'aiConfig', 'checkinReview', 'bodyGoal', 'bodyPlan', 'weightRecord', 'bodyCheckin', 'sleep', 'give', 'motivationEntry', 'customWuxing', 'vision', 'visionPractice', 'dedication', 'mantraDef', 'mantraSession', 'sutraReading', 'fearEntry', 'courageEntry', 'fearAchievement', 'zhiguanSession', 'breath'];
      await this.pullEntitiesParallel(allEntities, 1, 2, token, userId, applyServerChanges, isKickedOut);
      await setState(db, 'initialSyncDone', 'true');
      await setState(db, 'initialSyncPhase', 'done');

      return 'done';
    } catch (err: unknown) {
      if (isKickedOut(err)) throw err;
      log.error(err, { phase: 'initialSync' });
      throw err;
    } finally {
      onInitialSyncingChange?.(false);
    }
  }

  /**
   * Resume interrupted initial sync. Checks progress for each entity
   * and continues pulling from where it left off.
   */
  async resumeInitialSync(
    token: string,
    userId: string | undefined,
    applyServerChanges: (data: Record<string, unknown[]>, deletedIds?: Set<string>) => Promise<Record<string, unknown>>,
    isKickedOut: (err: unknown) => boolean,
  ): Promise<void> {
    const db = await openDatabase();
    if ((await getState(db, 'initialSyncDone')) === 'true') return;
    const allEntities: SyncEntity[] = ['profile', 'checkin', 'habit', 'grace', 'reflection', 'fasting', 'food', 'exercise', 'meditation', 'plan', 'planItem', 'planItemCheckin', 'dailyCustomTodo', 'dailyTodoHistory', 'thoughtTrail', 'trailNote', 'reflectionLink', 'aiConfig', 'checkinReview', 'bodyGoal', 'bodyPlan', 'weightRecord', 'bodyCheckin', 'sleep', 'give', 'motivationEntry', 'customWuxing', 'vision', 'visionPractice', 'dedication', 'mantraDef', 'mantraSession', 'sutraReading', 'fearEntry', 'courageEntry', 'fearAchievement', 'zhiguanSession', 'breath'];

    for (const entity of allEntities) {
      const p = await getSyncProgress(entity);
      if (p?.status === 'done') continue;
      const phase = p?.phase ?? (['profile','checkin','habit','grace'].includes(entity) ? 1 : ['reflection','fasting','food','exercise','meditation'].includes(entity) ? 2 : 3);
      await this.pullEntityWithRetry(entity, phase, token, userId, applyServerChanges, isKickedOut);
    }
    await setState(db, 'initialSyncDone', 'true');
    await setState(db, 'initialSyncPhase', 'done');
    await setState(db, DEVICE_SYNCED_KEY, '1');
  }

  // ── Pull helpers ──────────────────────────────────────────────────────

  private async pullEntityWithRetry(
    entity: SyncEntity,
    phase: number,
    token: string,
    userId: string | undefined,
    applyServerChanges: (data: Record<string, unknown[]>, deletedIds?: Set<string>) => Promise<Record<string, unknown>>,
    isKickedOut: (err: unknown) => boolean,
  ): Promise<void> {
    const progress = await getSyncProgress(entity);
    let page = progress?.last_page || 1;
    await updateSyncProgress(entity, { phase, status: 'downloading' });

    const MAX_PAGES = 50; // Safety guard against infinite pagination
    while (page <= MAX_PAGES) {
      try {
        const result = await apiSyncPullEntity(token, entity, page, 200, userId);
        log.debug(`[pullEntityWithRetry] ${entity}: page=${page}, data.length=${result.data.length}, hasMore=${result.hasMore}, total=${result.total}`);
        if (result.data.length === 0) {
          await updateSyncProgress(entity, { status: 'done' });
          return;
        }
        await applyServerChanges({ [entity]: result.data });
        const pulled = (progress?.pulled_count ?? 0) + result.data.length;
        await updateSyncProgress(entity, { pulled_count: pulled, total_count: result.total, last_page: page, retry_count: 0, next_retry_at: 0, last_error: null });
        if (!result.hasMore) {
          await updateSyncProgress(entity, { status: 'done' });
          return;
        }
        page++;
      } catch (err: unknown) {
        if (isKickedOut(err)) throw err;
        const currentProgress = await getSyncProgress(entity);
        const attempt = (currentProgress?.retry_count ?? 0) + 1;
        if (phase === 1) {
          await updateSyncProgress(entity, { status: 'failed', last_error: (err as Error).message, retry_count: attempt });
          if (attempt >= 3) throw err;
          // For phase 1, retry up to 2 times with linear backoff before throwing
          await new Promise(r => setTimeout(r, 1000 * attempt));
          continue;
        }
        if (attempt >= 5) {
          await updateSyncProgress(entity, { status: 'failed', last_error: (err as Error).message, retry_count: attempt });
          return;
        }
        const delay = Math.min(Math.pow(2, attempt) * 1000, 60000);
        await updateSyncProgress(entity, { retry_count: attempt, next_retry_at: Date.now() + delay });
        await new Promise<void>(resolve => setTimeout(resolve, delay));
      }
    }
  }

  private async pullEntitiesParallel(
    entities: SyncEntity[],
    concurrency: number,
    phase: number,
    token: string,
    userId: string | undefined,
    applyServerChanges: (data: Record<string, unknown[]>, deletedIds?: Set<string>) => Promise<Record<string, unknown>>,
    isKickedOut: (err: unknown) => boolean,
  ): Promise<void> {
    const queue = [...entities];
    const workers: Promise<void>[] = [];
    for (let i = 0; i < concurrency; i++) {
      workers.push((async () => {
        while (queue.length > 0) {
          const entity = queue.shift();
          if (!entity) break;
          const existing = await getSyncProgress(entity);
          if (existing?.status === 'done') continue;
          await this.pullEntityWithRetry(entity, phase, token, userId, applyServerChanges, isKickedOut);
        }
      })());
    }
    await Promise.all(workers);
  }
}