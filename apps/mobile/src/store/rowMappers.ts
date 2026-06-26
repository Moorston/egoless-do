// ─── SQLite row → Zustand entity mappers ────────────────────────
// Reverse of entityTableMap.ts:toRow() — converts DB rows back to app entities.

import type {
  Habit, MindReflection, FastingSession, FoodEntry, CheckinEntry,
  ExerciseEntry, MedHistoryEntry, UserProfile, Plan, PlanItem,
  PlanItemCheckin, GraceHistoryEntry, DailyCustomTodo, DailyTodoHistory,
  ThoughtTrail, TrailNote, ReflectionLink, CheckinReview,
  AIMode, ModelConfig,
} from '@egoless-do/core';

function bool(v: unknown): boolean { return v === 1 || v === true; }
function parseJson<T>(v: unknown, fallback: T): T {
  if (typeof v === 'string') { try { return JSON.parse(v); } catch { return fallback; } }
  return (v as T) ?? fallback;
}

export function rowToHabit(r: Record<string, unknown>): Habit {
  return {
    id: r.id as string, name: r.name as string, startDate: r.start_date as string,
    targetDays: r.target_days as number, goal: (r.goal as string) ?? '',
    insight: (r.insight as string) ?? '', createTag: bool(r.create_tag),
    doneDays: r.done_days as number, streak: r.streak as number,
    interrupted: r.interrupted as number, status: (r.status as string) ?? 'notStarted',
    checkedDates: parseJson<string[]>(r.checked_dates, []),
    pauseReason: (r.pause_reason as string) ?? '', abandonReason: (r.abandon_reason as string) ?? '',
    alarmEnabled: bool(r.alarm_enabled), alarmHour: (r.alarm_hour as number) ?? 8,
    alarmMinute: (r.alarm_minute as number) ?? 0,
    updatedAt: r.updated_at as number, deleted: bool(r.deleted),
  };
}

export function rowToReflection(r: Record<string, unknown>): MindReflection {
  return {
    id: r.id as string, timestamp: r.created_at as number, content: r.content as string,
    tags: parseJson<string[]>(r.tags, []), mood: r.mood as string ?? '',
    cardTheme: r.card_theme as string | null ?? undefined,
    link: r.link as string | null ?? undefined,
    linkedPlanItemId: r.linked_plan_id as string | null ?? undefined,
    isPinned: bool(r.is_pinned), isPublished: bool(r.is_published),
    colors: r.colors ? parseJson(r.colors, ['#667eea', '#764ba2'] as const) : ['#667eea', '#764ba2'] as const,
    updatedAt: r.updated_at as number, deleted: bool(r.deleted),
  } as MindReflection;
}

export function rowToFasting(r: Record<string, unknown>): FastingSession {
  return {
    id: r.id as string, targetHours: r.target_hours as number,
    startedAt: r.started_at as number, endedAt: r.ended_at as number | null ?? undefined,
    estimatedKcal: r.estimated_kcal as number | null ?? undefined,
    insight: r.insight as string | null ?? undefined,
    updatedAt: r.updated_at as number, deleted: bool(r.deleted),
  };
}

export function rowToFood(r: Record<string, unknown>): FoodEntry {
  return {
    id: r.id as string, name: r.name as string, calories: r.cal as number,
    note: (r.note as string) ?? '', timestamp: r.ts as number,
    updatedAt: r.updated_at as number, deleted: bool(r.deleted),
  };
}

export function rowToCheckin(r: Record<string, unknown>): CheckinEntry {
  return {
    date: r.date as string, done: bool(r.done), note: (r.note as string) ?? '',
    streak: r.streak as number, timestamp: r.timestamp as number | null ?? undefined,
    weight: r.weight as number | null ?? undefined, grace: bool(r.grace),
    totalDays: r.total_days as number | null ?? undefined,
    updatedAt: r.updated_at as number, deleted: bool(r.deleted),
  };
}

export function rowToExercise(r: Record<string, unknown>): ExerciseEntry {
  return {
    id: r.id as string, sportKey: r.sport_key as string,
    sportIcon: (r.sport_icon as string) ?? '', durationSec: r.duration_sec as number,
    distanceKm: r.distance_km as number ?? 0, calories: r.calories as number ?? 0,
    avgPace: r.avg_pace as number ?? 0, trackPoints: parseJson(r.track_points, []),
    isGpsSport: bool(r.is_gps_sport), mode: r.mode as string | null ?? undefined,
    target: r.target ? parseJson(r.target, undefined) : undefined,
    segmentPaces: r.segment_paces ? parseJson(r.segment_paces, undefined) : undefined,
    elevationGain: r.elevation_gain as number | null ?? undefined,
    pausedDuration: r.paused_duration as number | null ?? undefined,
    reps: r.reps as number | null ?? undefined,
    sets: r.sets ? parseJson(r.sets, undefined) : undefined,
    met: r.met as number | null ?? undefined,
    timestamp: r.ts as number,
    updatedAt: r.updated_at as number, deleted: bool(r.deleted),
  };
}

export function rowToMeditation(r: Record<string, unknown>): MedHistoryEntry {
  return {
    date: r.date as string, dur: (r.dur as string) ?? '0', mood: (r.mood as string) ?? '',
    updatedAt: r.updated_at as number, deleted: bool(r.deleted),
  };
}

export function rowToProfile(r: Record<string, unknown>): UserProfile {
  const data = parseJson<Record<string, unknown>>(r.data, {});
  return {
    ...data,
    updatedAt: (r.updated_at as number) ?? (data.updatedAt as number),
  } as UserProfile;
}

export function rowToPlan(r: Record<string, unknown>): Plan {
  return {
    id: r.id as string, name: r.name as string, goal: (r.goal as string) ?? '',
    slogan: (r.slogan as string) ?? '', startDate: r.start_date as string,
    endDate: r.end_date as string, status: (r.status as string) ?? 'not_started',
    progress: r.progress as number ?? 0,
    lastDelayedNotifyAt: r.last_delayed_notify_at as number | null ?? undefined,
    updatedAt: r.updated_at as number, deleted: bool(r.deleted),
  };
}

export function rowToPlanItem(r: Record<string, unknown>): PlanItem {
  return {
    id: r.id as string, planId: r.plan_id as string, name: r.name as string,
    description: (r.description as string) ?? '', startDate: r.start_date as string,
    endDate: r.end_date as string, contentUrl: (r.content_url as string) ?? '',
    totalCheckinDays: r.total_checkin_days as number ?? 0,
    status: (r.status as string) ?? 'not_started', progress: r.progress as number ?? 0,
    link: (r.link as string) ?? 'manual', linkConfig: parseJson(r.link_config, {}),
    order: r.item_order as number ?? 0, priority: (r.priority as string) ?? 'medium',
    targetMetric: (r.target_metric as string) ?? '',
    reflectionId: r.reflection_id as string | null ?? undefined,
    trailId: r.trail_id as string | null ?? undefined,
    frequency: r.frequency ? parseJson(r.frequency, undefined) : undefined,
    tags: r.tags ? parseJson(r.tags, undefined) : undefined,
    updatedAt: r.updated_at as number, deleted: bool(r.deleted),
  };
}

export function rowToPlanItemCheckin(r: Record<string, unknown>): PlanItemCheckin {
  return {
    id: r.id as string, planItemId: r.plan_item_id as string, date: r.date as string,
    done: bool(r.done), note: (r.note as string) ?? '',
    linkedModule: (r.linked_module as string) ?? '',
    updatedAt: r.updated_at as number, deleted: bool(r.deleted),
  };
}

export function rowToGrace(r: Record<string, unknown>): GraceHistoryEntry {
  return {
    date: r.date as string, restoredAt: r.restored_at as number,
    updatedAt: r.updated_at as number, deleted: bool(r.deleted),
  };
}

export function rowToDailyCustomTodo(r: Record<string, unknown>): DailyCustomTodo {
  return {
    id: r.id as string, planId: r.plan_id as string, date: r.date as string,
    name: r.name as string, done: bool(r.done), order: r.todo_order as number ?? 0,
    recurring: bool(r.recurring),
    updatedAt: r.updated_at as number, deleted: bool(r.deleted),
  };
}

export function rowToDailyTodoHistory(r: Record<string, unknown>): DailyTodoHistory {
  return {
    id: r.id as string, planId: r.plan_id as string, date: r.date as string,
    planItems: parseJson(r.plan_items, []), customTodos: parseJson(r.custom_todos, []),
    updatedAt: r.updated_at as number, deleted: bool(r.deleted),
  };
}

export function rowToThoughtTrail(r: Record<string, unknown>): ThoughtTrail {
  return {
    id: r.id as string, name: r.name as string, description: (r.description as string) ?? '',
    reflectionIds: parseJson<string[]>(r.reflection_ids, []),
    noteIds: parseJson<string[]>(r.note_ids, []),
    source: (r.source as string) ?? 'manual',
    insightSummary: r.insight_summary as string | null ?? undefined,
    insightCache: r.insight_cache ? parseJson(r.insight_cache, undefined) : undefined,
    reviewCache: r.review_cache ? parseJson(r.review_cache, undefined) : undefined,
    linkedPlanItemIds: r.linked_plan_item_ids ? parseJson(r.linked_plan_item_ids, undefined) : undefined,
    createdAt: r.created_at as number,
    updatedAt: r.updated_at as number, deleted: bool(r.deleted),
  };
}

export function rowToTrailNote(r: Record<string, unknown>): TrailNote {
  return {
    id: r.id as string, trailId: r.trail_id as string, content: r.content as string,
    tags: parseJson<string[]>(r.tags, []), mood: r.mood as string ?? '',
    source: (r.source as string) ?? 'free',
    guidedQuestion: r.guided_question as string | null ?? undefined,
    order: r.note_order as number ?? 0,
    createdAt: r.created_at as number,
    updatedAt: r.updated_at as number, deleted: bool(r.deleted),
  };
}

export function rowToReflectionLink(r: Record<string, unknown>): ReflectionLink {
  return {
    id: r.link_id as string, fromId: r.from_id as string, toId: r.to_id as string,
    type: r.link_type as string, note: r.note as string | null ?? undefined,
    createdAt: r.created_at as number,
    updatedAt: r.updated_at as number, deleted: bool(r.deleted),
  };
}

export function rowToAIConfig(r: Record<string, unknown>): { mode: AIMode; models: ModelConfig[] } {
  return {
    mode: (r.mode as AIMode) ?? 'hybrid',
    models: parseJson<ModelConfig[]>(r.models, []),
  };
}

export function rowToCheckinReview(r: Record<string, unknown>): CheckinReview {
  const reviewData = parseJson<Record<string, unknown>>(r.review_data, {});
  return {
    id: r.id as string,
    userId: (r.user_id as string) ?? 'self',
    period: (r.period as string) ?? 'week',
    startDate: r.start_date as string, endDate: r.end_date as string,
    ...reviewData,
    updatedAt: r.updated_at as number, deleted: bool(r.deleted),
  } as CheckinReview;
}
