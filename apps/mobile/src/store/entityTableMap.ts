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
function localDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const ENTITY_TABLE_MAP: Record<SyncEntity, EntityConfig> = {
  habit: {
    table: 'habits', pk: 'id',
    toRow: (d) => ({
      id: d.id, name: d.name, start_date: d.startDate, target_days: num(d.targetDays),
      goal: d.goal ?? '', insight: d.insight ?? '', create_tag: bool(d.createTag),
      done_days: num(d.doneDays), streak: num(d.streak), interrupted: num(d.interrupted),
      status: d.status ?? 'notStarted', checked_dates: json(d.checkedDates),
      pause_reason: d.pauseReason ?? '', abandon_reason: d.abandonReason ?? '',
      updated_at: d.updatedAt ?? Date.now(), deleted: bool(d.deleted),
    }),
  },
  reflection: {
    table: 'mind_reflections', pk: 'id',
    toRow: (d) => ({
      id: d.id, created_at: d.timestamp, content: d.content, tags: json(d.tags),
      mood: d.mood ?? null, card_theme: d.cardTheme ?? null,
      link: d.link ?? null,
      linked_plan_id: d.linkedPlanItemId ?? null,
      is_pinned: bool(d.isPinned), is_published: bool(d.isPublished),
      colors: d.colors ? json(d.colors) : null,
      updated_at: d.updatedAt ?? Date.now(), deleted: bool(d.deleted),
    }),
  },
  fasting: {
    table: 'fasting_sessions', pk: 'id',
    toRow: (d) => ({
      id: d.id, target_hours: num(d.targetHours), started_at: d.startedAt,
      ended_at: d.endedAt ?? null, estimated_kcal: d.estimatedKcal ?? null,
      insight: d.insight ?? null,
      updated_at: d.updatedAt ?? Date.now(), deleted: bool(d.deleted),
    }),
  },
  food: {
    table: 'food_entries', pk: 'id',
    toRow: (d) => ({
      id: d.id, name: d.name, cal: num(d.calories), note: d.note ?? '',
      entry_date: d.timestamp ? localDate(d.timestamp as number) : '', ts: d.timestamp,
      updated_at: d.updatedAt ?? Date.now(), deleted: bool(d.deleted),
    }),
  },
  checkin: {
    table: 'checkin_records', pk: 'date',
    toRow: (d) => ({
      date: d.date, done: bool(d.done), note: d.note ?? '',
      streak: num(d.streak), timestamp: d.timestamp ?? null, weight: d.weight ?? null,
      grace: bool(d.grace),
      updated_at: d.updatedAt ?? Date.now(), deleted: bool(d.deleted),
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
      updated_at: d.updatedAt ?? Date.now(), deleted: bool(d.deleted),
    }),
  },
  meditation: {
    table: 'meditation_history', pk: 'date',
    toRow: (d) => ({
      date: d.date, dur: d.dur ?? '0', mood: d.mood ?? '',
      updated_at: d.updatedAt ?? Date.now(), deleted: bool(d.deleted),
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
        deleted: bool(d.deleted),
      };
    },
  },
  plan: {
    table: 'plans', pk: 'id',
    toRow: (d) => ({
      id: d.id, name: d.name, goal: d.goal ?? '', slogan: d.slogan ?? '',
      start_date: d.startDate, end_date: d.endDate,
      status: d.status ?? 'not_started', progress: num(d.progress),
      last_delayed_notify_at: d.lastDelayedNotifyAt ?? null,
      updated_at: d.updatedAt ?? null, deleted: bool(d.deleted),
    }),
  },
  planItem: {
    table: 'plan_items', pk: 'id',
    toRow: (d) => {
      const row: Record<string, unknown> = {
        id: d.id, plan_id: d.planId, name: d.name, description: d.description ?? '',
        start_date: d.startDate, end_date: d.endDate, content_url: d.contentUrl ?? '',
        total_checkin_days: num(d.totalCheckinDays), status: d.status ?? 'not_started',
        progress: num(d.progress), link: d.link ?? 'manual',
        priority: d.priority ?? 'medium',
        target_metric: d.targetMetric ?? '',
        link_config: json(d.linkConfig), item_order: num(d.order),
        updated_at: d.updatedAt ?? null, deleted: bool(d.deleted),
      };
      if (d.reflectionId !== undefined) row.reflection_id = d.reflectionId;
      if (d.trailId !== undefined) row.trail_id = d.trailId;
      row.frequency = d.frequency ? JSON.stringify(d.frequency) : null;
      row.tags = d.tags ? JSON.stringify(d.tags) : null;
      return row;
    },
  },
  planItemCheckin: {
    table: 'plan_item_checkins', pk: 'id',
    toRow: (d) => ({
      id: d.id, plan_item_id: d.planItemId, date: d.date,
      done: bool(d.done), note: d.note ?? '', linked_module: d.linkedModule ?? '',
      updated_at: d.updatedAt ?? null, deleted: bool(d.deleted),
    }),
  },
  grace: {
    table: 'grace_history', pk: 'date',
    toRow: (d) => ({
      date: d.date, restored_at: d.restoredAt ?? Date.now(),
      updated_at: d.updatedAt ?? Date.now(), deleted: bool(d.deleted),
    }),
  },
  dailyCustomTodo: {
    table: 'daily_custom_todos', pk: 'id',
    toRow: (d) => ({
      id: d.id, plan_id: d.planId, date: d.date, name: d.name,
      done: bool(d.done), todo_order: num(d.order), recurring: bool(d.recurring),
      updated_at: d.updatedAt ?? Date.now(), deleted: bool(d.deleted),
    }),
  },
  dailyTodoHistory: {
    table: 'daily_todo_history', pk: 'id',
    toRow: (d) => ({
      id: d.id, plan_id: d.planId, date: d.date,
      plan_items: json(d.planItems), custom_todos: json(d.customTodos),
      updated_at: d.updatedAt ?? Date.now(), deleted: bool(d.deleted),
    }),
  },
  thoughtTrail: {
    table: 'thought_trails', pk: 'id',
    toRow: (d) => ({
      id: d.id, name: d.name, description: d.description ?? '',
      reflection_ids: json(d.reflectionIds),
      source: d.source ?? 'manual',
      insight_summary: d.insightSummary ?? null,
      created_at: d.createdAt ?? Date.now(),
      updated_at: d.updatedAt ?? Date.now(), deleted: bool(d.deleted),
    }),
  },
  trailNote: {
    table: 'trail_notes', pk: 'id',
    toRow: (d) => ({
      id: d.id, trail_id: d.trailId, content: d.content ?? '',
      tags: json(d.tags), mood: d.mood ?? null,
      source: d.source ?? 'free',
      guided_question: d.guidedQuestion ?? null,
      note_order: num(d.order),
      created_at: d.createdAt ?? Date.now(),
      updated_at: d.updatedAt ?? Date.now(), deleted: bool(d.deleted),
    }),
  },
  reflectionLink: {
    table: 'reflection_links', pk: 'link_id',
    toRow: (d) => ({
      link_id: d.id, from_id: d.fromId, to_id: d.toId,
      link_type: d.type, note: d.note ?? null,
      created_at: d.createdAt ?? Date.now(),
      updated_at: d.updatedAt ?? Date.now(), deleted: bool(d.deleted),
    }),
  },
  aiConfig: {
    table: 'ai_configs', pk: 'config_id',
    toRow: (d) => ({
      config_id: d.config_id ?? 'self',
      mode: d.mode ?? 'hybrid',
      models: json(d.models),
      updated_at: d.updatedAt ?? Date.now(), deleted: bool(d.deleted),
    }),
  },
  checkinReview: {
    table: 'checkin_reviews', pk: 'id',
    toRow: (d) => ({
      id: d.id,
      user_id: d.userId ?? 'self',
      review_id: d.id,
      period: d.period ?? 'week',
      start_date: d.startDate ?? '',
      end_date: d.endDate ?? '',
      review_data: json({
        completionRate: d.completionRate,
        doneDays: d.doneDays,
        totalDays: d.totalDays,
        streakDays: d.streakDays,
        longestStreak: d.longestStreak,
        incompleteReasons: d.incompleteReasons,
        incompleteItems: d.incompleteItems,
        habitProgress: d.habitProgress,
        planProgress: d.planProgress,
        metrics: d.metrics,
        comparison: d.comparison,
        aiSummary: d.aiSummary,
        highlights: d.highlights,
        improvements: d.improvements,
        generatedAt: d.generatedAt,
        lastAutoUpdateAt: d.lastAutoUpdateAt,
      }),
      updated_at: d.updatedAt ?? Date.now(), deleted: bool(d.deleted),
    }),
  },
};
