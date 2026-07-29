// ─── rowMappers tests ───────────────────────────────────────────
import { describe, it, expect } from 'vitest';

import {
  rowToProfile,
  rowToFood,
  rowToExercise,
  rowToCheckin,
  rowToPlan,
  rowToHabit,
  rowToReflection,
  rowToThoughtTrail,
  rowToEntityMap,
} from './rowMappers';

// ── rowToProfile ─────────────────────────────────────────────────
// Profile uses customRowToEntity: parses `data` JSON blob + merges with updatedAt

describe('rowToProfile', () => {
  it('parses a complete profile row with JSON data blob', () => {
    const row = {
      profile_id: 'self',
      data: JSON.stringify({
        name: 'Alice',
        waterGoal: 2500,
        theme: 'dark',
        language: 'en',
        customTags: ['morning'],
        customMoods: ['calm'],
      }),
      updated_at: 1700000000,
      deleted: 0,
    };

    const result = rowToProfile(row);

    expect(result.name).toBe('Alice');
    expect(result.waterGoal).toBe(2500);
    expect(result.theme).toBe('dark');
    expect(result.language).toBe('en');
    expect(result.customTags).toEqual(['morning']);
    expect(result.customMoods).toEqual(['calm']);
    expect(result.updatedAt).toBe(1700000000);
  });

  it('falls back to empty object when data is empty or missing', () => {
    const row = {
      profile_id: 'self',
      data: '{}',
      updated_at: 1700000000,
      deleted: 0,
    };

    const result = rowToProfile(row);

    expect(result.updatedAt).toBe(1700000000);
    expect(result.name).toBeUndefined();
  });

  it('handles null data field gracefully', () => {
    const row = {
      profile_id: 'self',
      data: null,
      updated_at: 1700000000,
      deleted: 0,
    };

    const result = rowToProfile(row);

    // parseJson(null, {}) returns {} because null is not a string, not a byte array,
    // so it falls through to `v ?? fallback` which is `null ?? {}` = `{}`
    expect(result.updatedAt).toBe(1700000000);
  });

  it('uses data.updatedAt when updated_at is missing', () => {
    const row = {
      profile_id: 'self',
      data: JSON.stringify({ name: 'Bob', updatedAt: 1699999999 }),
      updated_at: undefined,
      deleted: 0,
    };

    const result = rowToProfile(row);

    expect(result.name).toBe('Bob');
    expect(result.updatedAt).toBe(1699999999);
  });

  it('prefers updated_at over data.updatedAt', () => {
    const row = {
      profile_id: 'self',
      data: JSON.stringify({ name: 'Charlie', updatedAt: 1699999999 }),
      updated_at: 1700000000,
      deleted: 0,
    };

    const result = rowToProfile(row);

    expect(result.updatedAt).toBe(1700000000);
  });
});

// ── rowToFood ────────────────────────────────────────────────────
// Food uses customRowToEntity: maps snake_case SQLite cols → camelCase entity

describe('rowToFood', () => {
  it('maps all required fields from a complete row', () => {
    const row = {
      id: 'food-1',
      name: 'Rice',
      cal: 350,
      note: 'lunch',
      ts: 1700000000,
      updated_at: 1700000001,
      deleted: 0,
    };

    const result = rowToFood(row);

    expect(result.id).toBe('food-1');
    expect(result.name).toBe('Rice');
    expect(result.calories).toBe(350);
    expect(result.note).toBe('lunch');
    expect(result.timestamp).toBe(1700000000);
    expect(result.updatedAt).toBe(1700000001);
    expect(result.deleted).toBe(false);
  });

  it('handles missing optional note', () => {
    const row = {
      id: 'food-2',
      name: 'Apple',
      cal: 95,
      note: undefined,
      ts: 1700000000,
      updated_at: 1700000000,
      deleted: 0,
    };

    const result = rowToFood(row);

    expect(result.note).toBe('');
  });

  it('converts deleted=1 to true', () => {
    const row = {
      id: 'food-3',
      name: 'Tofu',
      cal: 100,
      note: '',
      ts: 1700000000,
      updated_at: 1700000000,
      deleted: 1,
    };

    const result = rowToFood(row);

    expect(result.deleted).toBe(true);
  });

  it('converts deleted=true (boolean) to true', () => {
    const row = {
      id: 'food-4',
      name: 'Soup',
      cal: 200,
      note: '',
      ts: 1700000000,
      updated_at: 1700000000,
      deleted: true,
    };

    const result = rowToFood(row);

    expect(result.deleted).toBe(true);
  });

  it('handles missing numeric fields gracefully', () => {
    const row = {
      id: 'food-5',
      name: 'Water',
      cal: undefined,
      note: undefined,
      ts: undefined,
      updated_at: undefined,
      deleted: 0,
    };

    const result = rowToFood(row);

    expect(result.calories).toBeUndefined();
    expect(result.note).toBe('');
    expect(result.timestamp).toBeUndefined();
  });
});

// ── rowToExercise ────────────────────────────────────────────────
// Exercise uses customRowToEntity: maps sport_key → sportKey, parses track_points JSON

describe('rowToExercise', () => {
  it('maps all fields including sport key and GPS data', () => {
    const trackPoints = [
      { lat: 31.23, lng: 121.47, ts: 1700000000 },
      { lat: 31.24, lng: 121.48, ts: 1700000060 },
    ];
    const row = {
      id: 'ex-1',
      sport_key: 'running',
      sport_icon: 'runner',
      duration_sec: 1800,
      distance_km: 5.0,
      calories: 350,
      avg_pace: '6:00',
      track_points: JSON.stringify(trackPoints),
      is_gps_sport: 1,
      mode: 'outdoor',
      target: null,
      segment_paces: null,
      elevation_gain: 50,
      paused_duration: 0,
      reps: null,
      sets: null,
      met: 8.5,
      ts: 1700000000,
      health_synced: 1,
      updated_at: 1700000001,
      deleted: 0,
    };

    const result = rowToExercise(row);

    expect(result.id).toBe('ex-1');
    expect(result.sportKey).toBe('running');
    expect(result.sportIcon).toBe('runner');
    expect(result.durationSec).toBe(1800);
    expect(result.distanceKm).toBe(5.0);
    expect(result.calories).toBe(350);
    expect(result.avgPace).toBe('6:00');
    expect(result.trackPoints).toEqual(trackPoints);
    expect(result.isGpsSport).toBe(true);
    expect(result.mode).toBe('outdoor');
    expect(result.elevationGain).toBe(50);
    expect(result.met).toBe(8.5);
    expect(result.healthSynced).toBe(true);
    expect(result.deleted).toBe(false);
  });

  it('parses trackPoints from JSON string', () => {
    const points = [{ lat: 1, lng: 2, ts: 100 }];
    const row = {
      id: 'ex-2',
      sport_key: 'cycling',
      sport_icon: '',
      duration_sec: 3600,
      distance_km: 20,
      calories: 500,
      avg_pace: '',
      track_points: JSON.stringify(points),
      is_gps_sport: 1,
      mode: null,
      target: null,
      segment_paces: null,
      elevation_gain: null,
      paused_duration: null,
      reps: null,
      sets: null,
      met: null,
      ts: 1700000000,
      health_synced: 0,
      updated_at: 1700000000,
      deleted: 0,
    };

    const result = rowToExercise(row);

    expect(result.trackPoints).toEqual(points);
  });

  it('handles missing track_points (returns empty array)', () => {
    const row = {
      id: 'ex-3',
      sport_key: 'yoga',
      sport_icon: '',
      duration_sec: 600,
      distance_km: 0,
      calories: 50,
      avg_pace: '',
      track_points: null,
      is_gps_sport: 0,
      mode: null,
      target: null,
      segment_paces: null,
      elevation_gain: null,
      paused_duration: null,
      reps: null,
      sets: null,
      met: null,
      ts: 1700000000,
      health_synced: 0,
      updated_at: 1700000000,
      deleted: 0,
    };

    const result = rowToExercise(row);

    // parseJson(null, []) => null is not a string, not a byte array,
    // falls through to (null as T) ?? [] which is [] (null is falsy)
    expect(result.trackPoints).toEqual([]);
    expect(result.isGpsSport).toBe(false);
  });

  it('applies defaults for missing optional fields', () => {
    const row = {
      id: 'ex-4',
      sport_key: 'push_up',
      sport_icon: undefined,
      duration_sec: undefined,
      distance_km: undefined,
      calories: undefined,
      avg_pace: undefined,
      track_points: undefined,
      is_gps_sport: 0,
      mode: null,
      target: null,
      segment_paces: null,
      elevation_gain: null,
      paused_duration: null,
      reps: 20,
      sets: JSON.stringify([10, 10]),
      met: null,
      ts: 1700000000,
      health_synced: 0,
      updated_at: 1700000000,
      deleted: 0,
    };

    const result = rowToExercise(row);

    expect(result.sportIcon).toBe('');
    expect(result.distanceKm).toBe(0);
    expect(result.calories).toBe(0);
    expect(result.reps).toBe(20);
    expect(result.sets).toEqual([10, 10]);
  });

  it('parses target and segmentPaces from JSON', () => {
    const row = {
      id: 'ex-5',
      sport_key: 'running',
      sport_icon: '',
      duration_sec: 1200,
      distance_km: 3,
      calories: 200,
      avg_pace: '',
      track_points: '[]',
      is_gps_sport: 1,
      mode: 'interval',
      target: JSON.stringify({ type: 'distance', value: 5 }),
      segment_paces: JSON.stringify([{ km: 1, pace: '5:30' }]),
      elevation_gain: null,
      paused_duration: null,
      reps: null,
      sets: null,
      met: null,
      ts: 1700000000,
      health_synced: 0,
      updated_at: 1700000000,
      deleted: 0,
    };

    const result = rowToExercise(row);

    expect(result.target).toEqual({ type: 'distance', value: 5 });
    expect(result.segmentPaces).toEqual([{ km: 1, pace: '5:30' }]);
  });
});

// ── rowToCheckin ─────────────────────────────────────────────────
// Checkin uses default buildRowToEntity: maps snake_case cols via schema

describe('rowToCheckin', () => {
  it('maps all fields from a complete row', () => {
    const row = {
      date: '2026-07-10',
      done: 1,
      note: 'Feeling good',
      streak: 7,
      timestamp: 1700000000,
      weight: 65.5,
      grace: 0,
      total_days: 30,
      updated_at: 1700000001,
      deleted: 0,
    };

    const result = rowToCheckin(row);

    expect(result.date).toBe('2026-07-10');
    expect(result.done).toBe(true);
    expect(result.note).toBe('Feeling good');
    expect(result.streak).toBe(7);
    expect(result.timestamp).toBe(1700000000);
    expect(result.weight).toBe(65.5);
    expect(result.grace).toBe(false);
    expect(result.totalDays).toBe(30);
    expect(result.updatedAt).toBe(1700000001);
    expect(result.deleted).toBe(false);
  });

  it('handles missing optional fields with defaults', () => {
    const row = {
      date: '2026-07-09',
      done: 0,
      note: undefined,
      streak: undefined,
      timestamp: undefined,
      weight: undefined,
      grace: undefined,
      total_days: undefined,
      updated_at: undefined,
      deleted: 0,
    };

    const result = rowToCheckin(row);

    expect(result.date).toBe('2026-07-09');
    expect(result.done).toBe(false);
    expect(result.note).toBe('');
    expect(result.streak).toBe(0);
    expect(result.timestamp).toBeUndefined();
    expect(result.weight).toBeUndefined();
    expect(result.grace).toBe(false);
    expect(result.totalDays).toBeUndefined();
  });

  it('handles null date (fallback is null)', () => {
    const row = {
      date: null,
      done: 0,
      note: '',
      streak: 0,
      timestamp: null,
      weight: null,
      grace: 0,
      total_days: null,
      updated_at: 1700000000,
      deleted: 0,
    };

    const result = rowToCheckin(row);

    // buildRowToEntity: raw ?? f.fallback ?? undefined
    // null ?? null = null, then null ?? undefined = undefined
    expect(result.date).toBeUndefined();
    expect(result.timestamp).toBeUndefined();
    expect(result.weight).toBeUndefined();
  });

  it('converts done=1 and grace=1 to true', () => {
    const row = {
      date: '2026-07-08',
      done: 1,
      note: '',
      streak: 5,
      timestamp: 1700000000,
      weight: null,
      grace: 1,
      total_days: null,
      updated_at: 1700000000,
      deleted: 0,
    };

    const result = rowToCheckin(row);

    expect(result.done).toBe(true);
    expect(result.grace).toBe(true);
  });
});

// ── rowToPlan ────────────────────────────────────────────────────
// Plan uses default buildRowToEntity with schema fields

describe('rowToPlan', () => {
  it('maps all fields from a complete row', () => {
    const row = {
      id: 'plan-1',
      name: '30-Day Meditation',
      goal: 'Daily meditation',
      slogan: 'Peace within',
      start_date: '2026-07-01',
      end_date: '2026-07-31',
      status: 'in_progress',
      progress: 33,
      complete_reason: null,
      last_delayed_notify_at: null,
      vision_id: 'vision-1',
      updated_at: 1700000000,
      deleted: 0,
    };

    const result = rowToPlan(row);

    expect(result.id).toBe('plan-1');
    expect(result.name).toBe('30-Day Meditation');
    expect(result.goal).toBe('Daily meditation');
    expect(result.slogan).toBe('Peace within');
    expect(result.startDate).toBe('2026-07-01');
    expect(result.endDate).toBe('2026-07-31');
    expect(result.status).toBe('in_progress');
    expect(result.progress).toBe(33);
    expect(result.completeReason).toBeUndefined();
    expect(result.visionId).toBe('vision-1');
    expect(result.deleted).toBe(false);
  });

  it('applies default values for missing fields', () => {
    const row = {
      id: undefined,
      name: undefined,
      goal: undefined,
      slogan: undefined,
      start_date: undefined,
      end_date: undefined,
      status: undefined,
      progress: undefined,
      complete_reason: undefined,
      last_delayed_notify_at: undefined,
      vision_id: undefined,
      updated_at: undefined,
      deleted: 0,
    };

    const result = rowToPlan(row);

    // null fallback + undefined raw → undefined (null ?? null ?? undefined)
    expect(result.id).toBeUndefined();
    expect(result.name).toBe('');
    expect(result.goal).toBe('');
    expect(result.slogan).toBe('');
    expect(result.startDate).toBe('');
    expect(result.endDate).toBe('');
    expect(result.status).toBe('not_started');
    expect(result.progress).toBe(0);
    expect(result.completeReason).toBeUndefined();
    expect(result.visionId).toBe('');
  });

  it('converts deleted=1 to true', () => {
    const row = {
      id: 'plan-3',
      name: 'Old Plan',
      goal: '',
      slogan: '',
      start_date: '2026-01-01',
      end_date: '2026-01-31',
      status: 'completed',
      progress: 100,
      complete_reason: 'Finished',
      last_delayed_notify_at: null,
      vision_id: '',
      updated_at: 1700000000,
      deleted: 1,
    };

    const result = rowToPlan(row);

    expect(result.deleted).toBe(true);
    expect(result.completeReason).toBe('Finished');
    expect(result.status).toBe('completed');
  });
});

// ── rowToHabit ───────────────────────────────────────────────────
// Habit uses default buildRowToEntity: checked_dates is JSON type

describe('rowToHabit', () => {
  it('maps all fields from a complete row', () => {
    const checkedDates = ['2026-07-01', '2026-07-02', '2026-07-03'];
    const row = {
      id: 'habit-1',
      name: 'Meditate',
      start_date: '2026-07-01',
      target_days: 30,
      goal: 'Inner peace',
      insight: 'Consistency helps',
      create_tag: 1,
      done_days: 3,
      streak: 3,
      interrupted: 0,
      status: 'in_progress',
      checked_dates: JSON.stringify(checkedDates),
      pause_reason: '',
      abandon_reason: '',
      alarm_enabled: 1,
      alarm_hour: 7,
      alarm_minute: 30,
      updated_at: 1700000000,
      link: 'none',
      link_config: null,
      deleted: 0,
    };

    const result = rowToHabit(row);

    expect(result.id).toBe('habit-1');
    expect(result.name).toBe('Meditate');
    expect(result.startDate).toBe('2026-07-01');
    expect(result.targetDays).toBe(30);
    expect(result.goal).toBe('Inner peace');
    expect(result.insight).toBe('Consistency helps');
    expect(result.createTag).toBe(true);
    expect(result.doneDays).toBe(3);
    expect(result.streak).toBe(3);
    expect(result.interrupted).toBe(0);
    expect(result.status).toBe('in_progress');
    expect(result.checkedDates).toEqual(checkedDates);
    expect(result.pauseReason).toBe('');
    expect(result.abandonReason).toBe('');
    expect(result.alarmEnabled).toBe(true);
    expect(result.alarmHour).toBe(7);
    expect(result.alarmMinute).toBe(30);
    expect(result.updatedAt).toBe(1700000000);
    expect(result.link).toBe('none');
    // JSON type: parseJson(null, null ?? []) = parseJson(null, []) = []
    expect(result.linkConfig).toEqual([]);
    expect(result.deleted).toBe(false);
  });

  it('parses checked_dates from JSON string', () => {
    const dates = ['2026-07-01', '2026-07-05'];
    const row = {
      id: 'habit-2',
      name: 'Exercise',
      start_date: '2026-07-01',
      target_days: 10,
      goal: '',
      insight: '',
      create_tag: 0,
      done_days: 2,
      streak: 1,
      interrupted: 0,
      status: 'in_progress',
      checked_dates: JSON.stringify(dates),
      pause_reason: '',
      abandon_reason: '',
      alarm_enabled: 0,
      alarm_hour: 8,
      alarm_minute: 0,
      updated_at: 1700000000,
      link: 'none',
      link_config: null,
      deleted: 0,
    };

    const result = rowToHabit(row);

    expect(result.checkedDates).toEqual(dates);
  });

  it('handles missing checked_dates (returns empty array fallback)', () => {
    const row = {
      id: 'habit-3',
      name: 'Read',
      start_date: '2026-07-01',
      target_days: 7,
      goal: '',
      insight: '',
      create_tag: 0,
      done_days: 0,
      streak: 0,
      interrupted: 0,
      status: 'notStarted',
      checked_dates: undefined,
      pause_reason: '',
      abandon_reason: '',
      alarm_enabled: 0,
      alarm_hour: 8,
      alarm_minute: 0,
      updated_at: 1700000000,
      link: 'none',
      link_config: null,
      deleted: 0,
    };

    const result = rowToHabit(row);

    // parseJson(undefined, []) => undefined is not a string, not a byte array,
    // falls through to (undefined as T) ?? [] which is []
    expect(result.checkedDates).toEqual([]);
  });

  it('applies default values for missing optional fields', () => {
    const row = {
      id: 'habit-4',
      name: undefined,
      start_date: undefined,
      target_days: undefined,
      goal: undefined,
      insight: undefined,
      create_tag: undefined,
      done_days: undefined,
      streak: undefined,
      interrupted: undefined,
      status: undefined,
      checked_dates: undefined,
      pause_reason: undefined,
      abandon_reason: undefined,
      alarm_enabled: undefined,
      alarm_hour: undefined,
      alarm_minute: undefined,
      updated_at: undefined,
      link: undefined,
      link_config: undefined,
      deleted: 0,
    };

    const result = rowToHabit(row);

    expect(result.name).toBe('Untitled');
    expect(result.startDate).toBe('');
    expect(result.targetDays).toBe(0);
    expect(result.goal).toBe('');
    expect(result.insight).toBe('');
    expect(result.status).toBe('notStarted');
    expect(result.pauseReason).toBe('');
    expect(result.abandonReason).toBe('');
    expect(result.alarmHour).toBe(8);
    expect(result.alarmMinute).toBe(0);
    expect(result.link).toBe('none');
  });

  it('parses link_config from JSON string', () => {
    const config = { type: 'habit', targetId: 'h-1' };
    const row = {
      id: 'habit-5',
      name: 'Linked Habit',
      start_date: '2026-07-01',
      target_days: 10,
      goal: '',
      insight: '',
      create_tag: 0,
      done_days: 0,
      streak: 0,
      interrupted: 0,
      status: 'notStarted',
      checked_dates: undefined,
      pause_reason: '',
      abandon_reason: '',
      alarm_enabled: 0,
      alarm_hour: 8,
      alarm_minute: 0,
      updated_at: 1700000000,
      link: 'plan',
      link_config: JSON.stringify(config),
      deleted: 0,
    };

    const result = rowToHabit(row);

    expect(result.linkConfig).toEqual(config);
    expect(result.link).toBe('plan');
  });
});

// ── rowToReflection ──────────────────────────────────────────────
// Reflection uses default buildRowToEntity: tags/colors/thoughtTrailIds are JSON type

describe('rowToReflection', () => {
  it('maps all fields from a complete row', () => {
    const row = {
      id: 'ref-1',
      created_at: 1700000000,
      content: 'Today I felt at peace',
      tags: JSON.stringify(['morning', 'grateful']),
      mood: 'calm',
      card_theme: 'sunset',
      link: 'none',
      linked_habit_id: 'habit-1',
      linked_plan_id: null,
      is_pinned: 1,
      is_published: 0,
      colors: JSON.stringify({ bg: '#fff', fg: '#000' }),
      thought_trail_ids: JSON.stringify(['trail-1']),
      updated_at: 1700000001,
      deleted: 0,
    };

    const result = rowToReflection(row);

    expect(result.id).toBe('ref-1');
    expect(result.timestamp).toBe(1700000000);
    expect(result.content).toBe('Today I felt at peace');
    expect(result.tags).toEqual(['morning', 'grateful']);
    expect(result.mood).toBe('calm');
    expect(result.cardTheme).toBe('sunset');
    expect(result.link).toBe('none');
    expect(result.linkedHabitId).toBe('habit-1');
    expect(result.linkedPlanItemId).toBeUndefined();
    expect(result.isPinned).toBe(true);
    expect(result.isPublished).toBe(false);
    expect(result.colors).toEqual({ bg: '#fff', fg: '#000' });
    expect(result.thoughtTrailIds).toEqual(['trail-1']);
    expect(result.updatedAt).toBe(1700000001);
    expect(result.deleted).toBe(false);
  });

  it('handles missing tags (returns empty array)', () => {
    const row = {
      id: 'ref-2',
      created_at: 1700000000,
      content: 'Quick note',
      tags: undefined,
      mood: undefined,
      card_theme: undefined,
      link: undefined,
      linked_habit_id: undefined,
      linked_plan_id: undefined,
      is_pinned: 0,
      is_published: 0,
      colors: undefined,
      thought_trail_ids: undefined,
      updated_at: 1700000000,
      deleted: 0,
    };

    const result = rowToReflection(row);

    expect(result.tags).toEqual([]);
    expect(result.content).toBe('Quick note');
    expect(result.mood).toBeUndefined();
    expect(result.cardTheme).toBeUndefined();
    expect(result.isPinned).toBe(false);
  });

  it('parses tags from JSON string with multiple items', () => {
    const tags = ['insight', 'meditation', 'nature', 'peace'];
    const row = {
      id: 'ref-3',
      created_at: 1700000000,
      content: 'Deep reflection',
      tags: JSON.stringify(tags),
      mood: 'happy',
      card_theme: null,
      link: null,
      linked_habit_id: null,
      linked_plan_id: null,
      is_pinned: 0,
      is_published: 0,
      colors: null,
      thought_trail_ids: null,
      updated_at: 1700000000,
      deleted: 0,
    };

    const result = rowToReflection(row);

    expect(result.tags).toEqual(tags);
  });

  it('handles null content with empty string fallback', () => {
    const row = {
      id: 'ref-4',
      created_at: 1700000000,
      content: undefined,
      tags: undefined,
      mood: null,
      card_theme: null,
      link: null,
      linked_habit_id: null,
      linked_plan_id: null,
      is_pinned: 0,
      is_published: 0,
      colors: null,
      thought_trail_ids: null,
      updated_at: 1700000000,
      deleted: 0,
    };

    const result = rowToReflection(row);

    expect(result.content).toBe('');
  });
});

// ── rowToThoughtTrail ────────────────────────────────────────────
// ThoughtTrail uses default buildRowToEntity: reflectionIds/noteIds are JSON type

describe('rowToThoughtTrail', () => {
  it('maps all fields from a complete row', () => {
    const row = {
      id: 'trail-1',
      name: 'Morning Thoughts',
      description: 'Reflections from morning meditation',
      reflection_ids: JSON.stringify(['ref-1', 'ref-2']),
      note_ids: JSON.stringify(['note-1', 'note-2']),
      source: 'ai',
      insight_summary: 'Peace comes from within',
      insight_cache: JSON.stringify({ key: 'value' }),
      review_cache: JSON.stringify({ score: 0.8 }),
      linked_plan_item_ids: JSON.stringify(['pi-1']),
      created_at: 1700000000,
      updated_at: 1700000001,
      deleted: 0,
    };

    const result = rowToThoughtTrail(row);

    expect(result.id).toBe('trail-1');
    expect(result.name).toBe('Morning Thoughts');
    expect(result.description).toBe('Reflections from morning meditation');
    expect(result.reflectionIds).toEqual(['ref-1', 'ref-2']);
    expect(result.noteIds).toEqual(['note-1', 'note-2']);
    expect(result.source).toBe('ai');
    expect(result.insightSummary).toBe('Peace comes from within');
    expect(result.insightCache).toEqual({ key: 'value' });
    expect(result.reviewCache).toEqual({ score: 0.8 });
    expect(result.linkedPlanItemIds).toEqual(['pi-1']);
    expect(result.createdAt).toBe(1700000000);
    expect(result.updatedAt).toBe(1700000001);
    expect(result.deleted).toBe(false);
  });

  it('parses reflectionIds from JSON string', () => {
    const ids = ['ref-a', 'ref-b', 'ref-c'];
    const row = {
      id: 'trail-2',
      name: 'Evening Thoughts',
      description: '',
      reflection_ids: JSON.stringify(ids),
      note_ids: '[]',
      source: 'manual',
      insight_summary: null,
      insight_cache: null,
      review_cache: null,
      linked_plan_item_ids: null,
      created_at: 1700000000,
      updated_at: 1700000000,
      deleted: 0,
    };

    const result = rowToThoughtTrail(row);

    expect(result.reflectionIds).toEqual(ids);
    expect(result.noteIds).toEqual([]);
  });

  it('handles missing JSON fields with defaults', () => {
    const row = {
      id: 'trail-3',
      name: 'Empty Trail',
      description: undefined,
      reflection_ids: undefined,
      note_ids: undefined,
      source: undefined,
      insight_summary: undefined,
      insight_cache: undefined,
      review_cache: undefined,
      linked_plan_item_ids: undefined,
      created_at: undefined,
      updated_at: undefined,
      deleted: 0,
    };

    const result = rowToThoughtTrail(row);

    expect(result.name).toBe('Empty Trail');
    expect(result.description).toBe('');
    expect(result.reflectionIds).toEqual([]);
    expect(result.noteIds).toEqual([]);
    expect(result.source).toBe('manual');
    expect(result.insightSummary).toBeUndefined();
    // JSON type fields: parseJson(null, null ?? []) = parseJson(null, []) = []
    expect(result.insightCache).toEqual([]);
    expect(result.reviewCache).toEqual([]);
    expect(result.linkedPlanItemIds).toEqual([]);
  });

  it('converts deleted=1 to true', () => {
    const row = {
      id: 'trail-4',
      name: 'Deleted Trail',
      description: '',
      reflection_ids: '[]',
      note_ids: '[]',
      source: 'manual',
      insight_summary: null,
      insight_cache: null,
      review_cache: null,
      linked_plan_item_ids: null,
      created_at: 1700000000,
      updated_at: 1700000000,
      deleted: 1,
    };

    const result = rowToThoughtTrail(row);

    expect(result.deleted).toBe(true);
  });
});

// ── rowToEntityMap ───────────────────────────────────────────────
// The map export used by SyncEngine to resolve entity type → mapper

describe('rowToEntityMap', () => {
  it('contains all expected entity type keys', () => {
    const expectedKeys = [
      'habit', 'reflection', 'fasting', 'food', 'checkin', 'exercise',
      'meditation', 'profile', 'plan', 'planItem', 'planItemCheckin',
      'grace', 'dailyCustomTodo', 'dailyTodoHistory', 'thoughtTrail',
      'trailNote', 'reflectionLink', 'aiConfig', 'checkinReview',
      'bodyGoal', 'bodyPlan', 'weightRecord', 'bodyCheckin', 'sleep',
      'give', 'motivationEntry', 'customWuxing', 'vision', 'visionPractice',
      'dedication', 'fearEntry', 'courageEntry', 'fearAchievement',
      'mantraDef', 'mantraSession', 'sutraReading', 'breath', 'zhiguanSession',
    ];

    for (const key of expectedKeys) {
      expect(rowToEntityMap).toHaveProperty(key);
      expect(typeof rowToEntityMap[key]).toBe('function');
    }
  });

  it('habit mapper in map produces same result as rowToHabit', () => {
    const row = {
      id: 'h-1',
      name: 'Test',
      start_date: '2026-01-01',
      target_days: 10,
      goal: '',
      insight: '',
      create_tag: 0,
      done_days: 0,
      streak: 0,
      interrupted: 0,
      status: 'notStarted',
      checked_dates: '[]',
      pause_reason: '',
      abandon_reason: '',
      alarm_enabled: 0,
      alarm_hour: 8,
      alarm_minute: 0,
      updated_at: 1700000000,
      link: 'none',
      link_config: null,
      deleted: 0,
    };

    const fromMap = rowToEntityMap.habit(row);
    const direct = rowToHabit(row);

    expect(fromMap).toEqual(direct);
  });
});
