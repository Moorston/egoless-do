// ─── One-time migration: move unsynced records into sync_queue ───
// After upgrading from the old scan-based sync to the queue-based sync,
// existing synced=0/2 records need to be enqueued so they get pushed.
import type { SyncEntity } from '@egoless-do/core';
import { createLogger } from '@egoless-do/core';

import { openDatabase } from '../../db/schema';

const log = createLogger('Sync');

const MIGRATION_KEY = 'sync_queue_migrated_v2';

/** Check if migration has already been completed. */
export async function isMigrationDone(): Promise<boolean> {
  const db = await openDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_state WHERE key = ?', [MIGRATION_KEY]
  );
  return row?.value === '1';
}

/** Run the one-time migration. Safe to call multiple times (idempotent). */
export async function migrateToSyncQueue(): Promise<number> {
  if (await isMigrationDone()) return 0;

  let count = 0;

  const migrations: Array<{
    entity: SyncEntity;
    table: string;
    pk: string;
    toPayload: (r: Record<string, unknown>) => Record<string, unknown>;
  }> = [
    {
      entity: 'habit', table: 'habits', pk: 'id',
      toPayload: (r) => ({
        id: r.id, name: r.name, startDate: r.start_date, targetDays: r.target_days,
        goal: r.goal, insight: r.insight, createTag: (r.create_tag as number) === 1,
        doneDays: r.done_days, streak: r.streak, interrupted: r.interrupted,
        status: r.status, checkedDates: safeJson(r.checked_dates),
        pauseReason: r.pause_reason, abandonReason: r.abandon_reason,
        updatedAt: r.updated_at, deleted: (r.deleted as number) === 1,
      }),
    },
    {
      entity: 'reflection', table: 'mind_reflections', pk: 'id',
      toPayload: (r) => ({
        id: r.id, timestamp: r.created_at, content: r.content,
        tags: safeJson(r.tags), mood: r.mood, cardTheme: r.card_theme,
        linkedPlanItemId: r.linked_plan_id,
        isPinned: (r.is_pinned as number) === 1,
        isPublished: (r.is_published as number) === 1,
        colors: safeParseColors(r.colors),
        updatedAt: r.updated_at, deleted: (r.deleted as number) === 1,
      }),
    },
    {
      entity: 'fasting', table: 'fasting_sessions', pk: 'id',
      toPayload: (r) => ({
        id: r.id, targetHours: r.target_hours, startedAt: r.started_at,
        endedAt: r.ended_at, estimatedKcal: r.estimated_kcal, insight: r.insight,
        note: r.note ?? '',
        updatedAt: r.updated_at, deleted: (r.deleted as number) === 1,
      }),
    },
    {
      entity: 'food', table: 'food_entries', pk: 'id',
      toPayload: (r) => ({
        id: r.id, name: r.name, calories: r.cal, note: r.note, timestamp: r.ts,
        entryDate: r.entry_date || (r.ts ? (() => { const d = new Date(Number(r.ts)); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })() : ''),
        updatedAt: r.updated_at, deleted: (r.deleted as number) === 1,
      }),
    },
    {
      entity: 'checkin', table: 'checkin_records', pk: 'date',
      toPayload: (r) => ({
        date: r.date, done: (r.done as number) === 1, note: r.note,
        streak: r.streak, timestamp: r.timestamp, weight: r.weight,
        grace: (r.grace as number) === 1,
        updatedAt: r.updated_at, deleted: (r.deleted as number) === 1,
      }),
    },
    {
      entity: 'exercise', table: 'exercise_entries', pk: 'id',
      toPayload: (r) => ({
        id: r.id, sportKey: r.sport_key, sportIcon: r.sport_icon,
        durationSec: r.duration_sec, distanceKm: r.distance_km,
        calories: r.calories, avgPace: r.avg_pace,
        trackPoints: safeJson(r.track_points),
        isGpsSport: (r.is_gps_sport as number) === 1,
        timestamp: r.ts,
        updatedAt: r.updated_at, deleted: (r.deleted as number) === 1,
      }),
    },
    {
      entity: 'meditation', table: 'meditation_history', pk: 'date',
      toPayload: (r) => ({
        date: r.date, durMin: r.dur_min ?? (typeof r.dur === 'string' ? parseInt(r.dur) || 0 : 0),
        trackId: r.track_id ?? '', note: r.note ?? '',
        updatedAt: r.updated_at, deleted: (r.deleted as number) === 1,
      }),
    },
    {
      entity: 'profile', table: 'user_profiles', pk: 'profile_id',
      toPayload: (r) => ({
        profileId: r.profile_id,
        data: safeJsonObj(r.data),
        updatedAt: r.updated_at, deleted: (r.deleted as number) === 1,
      }),
    },
    {
      entity: 'plan', table: 'plans', pk: 'id',
      toPayload: (r) => ({
        id: r.id, name: r.name, goal: r.goal, slogan: r.slogan,
        startDate: r.start_date, endDate: r.end_date,
        status: r.status, progress: r.progress,
        updatedAt: r.updated_at, deleted: (r.deleted as number) === 1,
      }),
    },
    {
      entity: 'planItem', table: 'plan_items', pk: 'id',
      toPayload: (r) => ({
        id: r.id, planId: r.plan_id, name: r.name, description: r.description,
        startDate: r.start_date, endDate: r.end_date, contentUrl: r.content_url,
        totalCheckinDays: r.total_checkin_days, status: r.status, progress: r.progress,
        link: r.link, linkConfig: safeJson(r.link_config),
        order: r.item_order, priority: r.priority, targetMetric: r.target_metric,
        reflectionId: r.reflection_id,
        frequency: r.frequency ? safeJson(r.frequency) : undefined,
        updatedAt: r.updated_at, deleted: (r.deleted as number) === 1,
      }),
    },
    {
      entity: 'planItemCheckin', table: 'plan_item_checkins', pk: 'id',
      toPayload: (r) => ({
        id: r.id, planItemId: r.plan_item_id, date: r.date,
        done: (r.done as number) === 1, note: r.note ?? '',
        linkedModule: r.linked_module ?? '',
        updatedAt: r.updated_at, deleted: (r.deleted as number) === 1,
      }),
    },
    {
      entity: 'grace', table: 'grace_history', pk: 'date',
      toPayload: (r) => ({
        date: r.date, restoredAt: r.restored_at,
        updatedAt: r.updated_at, deleted: (r.deleted as number) === 1,
      }),
    },
    {
      entity: 'dailyCustomTodo', table: 'daily_custom_todos', pk: 'id',
      toPayload: (r) => ({
        id: r.id, planId: r.plan_id, date: r.date, name: r.name,
        done: (r.done as number) === 1, order: r.todo_order,
        recurring: (r.recurring as number) === 1,
        updatedAt: r.updated_at, deleted: (r.deleted as number) === 1,
      }),
    },
    {
      entity: 'dailyTodoHistory', table: 'daily_todo_history', pk: 'id',
      toPayload: (r) => ({
        id: r.id, planId: r.plan_id, date: r.date,
        planItems: safeJson(r.plan_items), customTodos: safeJson(r.custom_todos),
        updatedAt: r.updated_at, deleted: (r.deleted as number) === 1,
      }),
    },
    {
      entity: 'thoughtTrail', table: 'thought_trails', pk: 'id',
      toPayload: (r) => ({
        id: r.id, name: r.name, description: r.description ?? '',
        reflectionIds: safeJson(r.reflection_ids),
        noteIds: safeJson(r.note_ids),
        linkedPlanItemIds: r.linked_plan_item_ids ? safeJson(r.linked_plan_item_ids) : undefined,
        createdAt: r.created_at, updatedAt: r.updated_at,
        deleted: (r.deleted as number) === 1,
      }),
    },
    {
      entity: 'trailNote', table: 'trail_notes', pk: 'id',
      toPayload: (r) => ({
        id: r.id, trailId: r.trail_id, content: r.content,
        tags: safeJson(r.tags), mood: r.mood, source: r.source,
        guidedQuestion: r.guided_question, noteOrder: r.note_order,
        createdAt: r.created_at, updatedAt: r.updated_at,
        deleted: (r.deleted as number) === 1,
      }),
    },
    {
      entity: 'reflectionLink', table: 'reflection_links', pk: 'link_id',
      toPayload: (r) => ({
        linkId: r.link_id, fromId: r.from_id, toId: r.to_id,
        linkType: r.link_type, note: r.note,
        createdAt: r.created_at, updatedAt: r.updated_at,
        deleted: (r.deleted as number) === 1,
      }),
    },
    {
      entity: 'aiConfig', table: 'ai_configs', pk: 'config_id',
      toPayload: (r) => ({
        configId: r.config_id, mode: r.mode,
        models: safeJson(r.models),
        updatedAt: r.updated_at, deleted: (r.deleted as number) === 1,
      }),
    },
    {
      entity: 'checkinReview', table: 'checkin_reviews', pk: 'id',
      toPayload: (r) => ({
        id: r.id, userId: r.user_id, reviewId: r.review_id,
        period: r.period, startDate: r.start_date, endDate: r.end_date,
        reviewData: safeJson(r.review_data),
        updatedAt: r.updated_at, deleted: (r.deleted as number) === 1,
      }),
    },
  ];

  const db = await openDatabase();

  for (const { entity, table, pk, toPayload } of migrations) {
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM ${table}`
    );
    if (rows.length === 0) continue;
    // Batch all inserts for this entity into a single lock acquisition
    const { withDbLock } = await import('../../db/schema');
    await withDbLock(async () => {
      for (const row of rows) {
        const id = row[pk] as string;
        if (!id) continue;
        const isDeleted = (row.deleted as number) === 1;
        const operation = isDeleted ? 'delete' : 'upsert';
        const payload = toPayload(row);
        if (isDeleted) payload.deleted = true;
        await db.runAsync(
          `INSERT INTO sync_queue (entity, entity_id, operation, payload, created_at, status)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(entity, entity_id) DO UPDATE SET
             operation = excluded.operation, payload = excluded.payload,
             created_at = excluded.created_at, status = 'pending',
             retry_count = 0, next_retry_at = 0, last_error = NULL`,
          [entity, id, operation, JSON.stringify(payload), Date.now(), 'pending'],
        );
        count++;
      }
    });
  }

  // Mark migration complete
  await db.runAsync(
    'INSERT OR REPLACE INTO app_state(key, value) VALUES(?, ?)',
    [MIGRATION_KEY, '1']
  );

  log.info('Migrated %d unsynced records to sync_queue', count);
  return count;
}

function safeJson(v: unknown): unknown {
  if (v == null) return [];
  if (typeof v === 'string') { try { return JSON.parse(v) as unknown; } catch { return []; } }
  return v;
}

function safeJsonObj(v: unknown): Record<string, unknown> {
  if (v == null) return {};
  if (typeof v === 'string') { try { const p = JSON.parse(v) as unknown; return (typeof p === 'object' && p !== null && !Array.isArray(p)) ? p as Record<string, unknown> : {}; } catch { return {}; } }
  return (typeof v === 'object' && v !== null && !Array.isArray(v)) ? v as Record<string, unknown> : {};
}

function safeParseColors(v: unknown): unknown {
  if (v == null) return null;
  if (typeof v === 'string') { try { return JSON.parse(v) as unknown; } catch { return null; } }
  return v;
}
