// ─── Entity-to-SQLite table mapping for generic persistence ────
import type { SyncEntity } from '@egoless-do/core';

interface EntityConfig {
  table: string;
  pk: string;
  toRow: (data: Record<string, unknown>) => Record<string, unknown>;
}

function bool(v: unknown): number { return v ? 1 : 0; }
function json(v: unknown): string { return typeof v === 'string' ? v : JSON.stringify(v ?? []); }
function num(v: unknown, d = 0): number { return typeof v === 'number' ? v : d; }

export const ENTITY_TABLE_MAP: Record<SyncEntity, EntityConfig> = {
  habit: {
    table: 'habits', pk: 'id',
    toRow: (d) => ({
      id: d.id, name: d.name, start_date: d.startDate, target_days: num(d.targetDays),
      goal: d.goal ?? '', insight: d.insight ?? '', create_tag: bool(d.createTag),
      done_days: num(d.doneDays), streak: num(d.streak), interrupted: num(d.interrupted),
      status: d.status ?? 'notStarted', checked_dates: json(d.checkedDates),
      pause_reason: d.pauseReason ?? '', abandon_reason: d.abandonReason ?? '',
      updated_at: d.updatedAt ?? Date.now(),
    }),
  },
  reflection: {
    table: 'mind_reflections', pk: 'id',
    toRow: (d) => ({
      id: d.id, created_at: d.timestamp, content: d.content, tags: json(d.tags),
      mood: d.mood ?? null, card_theme: d.cardTheme ?? null,
      linked_habit_id: d.linkedHabitId ?? null,
      is_pinned: bool(d.isPinned), is_published: bool(d.isPublished),
      updated_at: d.updatedAt ?? Date.now(),
    }),
  },
  fasting: {
    table: 'fasting_sessions', pk: 'id',
    toRow: (d) => ({
      id: d.id, target_hours: num(d.targetHours), started_at: d.startedAt,
      ended_at: d.endedAt ?? null, estimated_kcal: d.estimatedKcal ?? null,
      insight: d.insight ?? null,
      updated_at: d.updatedAt ?? Date.now(),
    }),
  },
  food: {
    table: 'food_entries', pk: 'id',
    toRow: (d) => ({
      id: d.id, name: d.name, cal: num(d.calories), note: d.note ?? '',
      entry_date: '', ts: d.timestamp,
      updated_at: d.updatedAt ?? Date.now(),
    }),
  },
  checkin: {
    table: 'checkin_records', pk: 'date',
    toRow: (d) => ({
      date: d.date, done: bool(d.done), note: d.note ?? '',
      streak: num(d.streak), timestamp: d.timestamp ?? null, weight: d.weight ?? null,
      updated_at: d.updatedAt ?? Date.now(),
    }),
  },
  exercise: {
    table: 'exercise_entries', pk: 'id',
    toRow: (d) => ({
      id: d.id, sport_key: d.sportKey, sport_icon: d.sportIcon ?? '',
      duration_sec: num(d.durationSec), distance_km: d.distanceKm ?? 0,
      calories: d.calories ?? 0, avg_pace: d.avgPace ?? 0,
      track_points: json(d.trackPoints), is_gps_sport: bool(d.isGpsSport),
      ts: d.timestamp,
      updated_at: d.updatedAt ?? Date.now(),
    }),
  },
  meditation: {
    table: 'meditation_history', pk: 'date',
    toRow: (d) => ({
      date: d.date, dur: d.dur ?? '0', mood: d.mood ?? '',
      updated_at: d.updatedAt ?? Date.now(),
    }),
  },
  profile: {
    table: 'user_profiles', pk: 'profile_id',
    toRow: (d) => {
      const { profileId, data, ...rest } = d as any;
      return {
        profile_id: profileId ?? 'self',
        data: typeof data === 'string' ? data : JSON.stringify(rest),
        updated_at: d.updatedAt ?? Date.now(),
      };
    },
  },
  plan: {
    table: 'plans', pk: 'id',
    toRow: (d) => ({
      id: d.id, name: d.name, goal: d.goal ?? '', slogan: d.slogan ?? '',
      start_date: d.startDate, end_date: d.endDate,
      status: d.status ?? 'not_started', progress: num(d.progress),
      updated_at: d.updatedAt ?? null, deleted: bool(d.deleted),
    }),
  },
  planItem: {
    table: 'plan_items', pk: 'id',
    toRow: (d) => ({
      id: d.id, plan_id: d.planId, name: d.name, description: d.description ?? '',
      start_date: d.startDate, end_date: d.endDate, content_url: d.contentUrl ?? '',
      total_checkin_days: num(d.totalCheckinDays), status: d.status ?? 'not_started',
      progress: num(d.progress), link: d.link ?? 'manual',
      link_config: json(d.linkConfig), item_order: num(d.order),
      updated_at: d.updatedAt ?? null, deleted: bool(d.deleted),
    }),
  },
  planItemCheckin: {
    table: 'plan_item_checkins', pk: 'id',
    toRow: (d) => ({
      id: d.id, plan_item_id: d.planItemId, date: d.date,
      done: bool(d.done), note: d.note ?? '', linked_module: d.linkedModule ?? '',
      updated_at: d.updatedAt ?? null, deleted: bool(d.deleted),
    }),
  },
};
