import { describe, it, expect } from 'vitest';
import { SCHEMAS, SCHEMA_REGISTRY, SCHEMA_COLLECTION, SCHEMA_ID_FIELD, buildToRow, buildServerPayloadToRow, buildRowToEntity } from './entitySchemas';
import { SYNC_ENTITIES } from './entities';

describe('entitySchemas', () => {
  const entities = Object.keys(SCHEMAS) as Array<keyof typeof SCHEMAS>;

  describe('schema completeness', () => {
    it('should define all 19 sync entities', () => {
      expect(entities).toHaveLength(19);
      for (const e of SYNC_ENTITIES) {
        expect(SCHEMAS[e]).toBeDefined();
      }
    });

    it('should have consistent table/pk in SCHEMA_REGISTRY', () => {
      for (const e of entities) {
        const s = SCHEMAS[e];
        const r = SCHEMA_REGISTRY[e];
        expect(r.collection).toBe(s.pocketbase.collection);
        expect(r.localPk).toBe(s.sqlite.pk);
      }
    });
  });

  describe('SCHEMA_COLLECTION matches original ENTITY_COLLECTION', () => {
    const original: Record<string, string> = {
      habit: 'habits', reflection: 'reflections', fasting: 'fasting_sessions',
      food: 'food_entries', checkin: 'checkin_records', meditation: 'meditation_history',
      profile: 'user_profiles', exercise: 'exercise_entries', plan: 'plans',
      planItem: 'plan_items', planItemCheckin: 'plan_item_checkins',
      dailyCustomTodo: 'daily_custom_todos', dailyTodoHistory: 'daily_todo_history',
      grace: 'grace_history', thoughtTrail: 'thought_trails', trailNote: 'trail_notes',
      reflectionLink: 'reflection_links', aiConfig: 'ai_configs', checkinReview: 'checkin_reviews',
    };

    for (const [entity, expected] of Object.entries(original)) {
      it(`${entity} → ${expected}`, () => {
        expect(SCHEMA_COLLECTION[entity as keyof typeof SCHEMA_COLLECTION]).toBe(expected);
      });
    }
  });

  describe('SCHEMA_ID_FIELD matches original ENTITY_ID_FIELD', () => {
    const original: Record<string, string> = {
      habit: 'habit_id', reflection: 'reflection_id', fasting: 'session_id',
      food: 'food_id', checkin: 'date', meditation: 'date',
      profile: 'profile_id', exercise: 'exercise_id', plan: 'plan_id',
      planItem: 'plan_item_id', planItemCheckin: 'checkin_id',
      dailyCustomTodo: 'todo_id', dailyTodoHistory: 'history_id',
      grace: 'date', thoughtTrail: 'trail_id', trailNote: 'note_id',
      reflectionLink: 'link_id', aiConfig: 'config_id', checkinReview: 'review_id',
    };

    for (const [entity, expected] of Object.entries(original)) {
      it(`${entity} → ${expected}`, () => {
        expect(SCHEMA_ID_FIELD[entity as keyof typeof SCHEMA_ID_FIELD]).toBe(expected);
      });
    }
  });

  describe('buildToRow', () => {
    it('habit: maps camelCase entity to snake_case row', () => {
      const toRow = buildToRow(SCHEMAS.habit);
      const result = toRow({
        id: 'h1', name: 'Exercise', startDate: '2026-01-01', targetDays: 30,
        goal: 'fitness', insight: '', createTag: true, doneDays: 5, streak: 3,
        interrupted: 0, status: 'inProgress', checkedDates: ['2026-01-01'],
        pauseReason: '', abandonReason: '', alarmEnabled: false,
        alarmHour: 8, alarmMinute: 0, link: 'none', updatedAt: 1000, deleted: false,
      });
      expect(result.id).toBe('h1');
      expect(result.name).toBe('Exercise');
      expect(result.start_date).toBe('2026-01-01');
      expect(result.target_days).toBe(30);
      expect(result.create_tag).toBe(1);
      expect(result.deleted).toBe(0);
      expect(result.checked_dates).toBe('["2026-01-01"]');
    });

    it('habit: uses fallbacks for missing fields', () => {
      const toRow = buildToRow(SCHEMAS.habit);
      const result = toRow({ id: 'h1' });
      expect(result.name).toBe('Untitled');
      expect(result.start_date).toBe('');
      expect(result.target_days).toBe(0);
      expect(result.goal).toBe('');
    });

    it('habit: skips records missing required fields (serverPayloadToRow)', () => {
      const serverToRow = buildServerPayloadToRow(SCHEMAS.habit);
      expect(serverToRow({ id: 'h1' })).toBeNull(); // missing name and startDate
      expect(serverToRow({ id: 'h1', name: 'Test' })).toBeNull(); // missing startDate
      expect(serverToRow({ id: 'h1', name: 'Test', startDate: '2026-01-01' })).not.toBeNull();
    });

    it('serverPayloadToRow: always sets deleted=0', () => {
      const serverToRow = buildServerPayloadToRow(SCHEMAS.habit);
      const result = serverToRow({ id: 'h1', name: 'Test', startDate: '2026-01-01', deleted: true });
      expect(result!.deleted).toBe(0);
    });

    it('serverPayloadToRow: tries camelCase then snake_case', () => {
      const serverToRow = buildServerPayloadToRow(SCHEMAS.fasting);
      // camelCase
      const r1 = serverToRow({ id: 'f1', targetHours: 16, startedAt: 1000 });
      expect(r1!.target_hours).toBe(16);
      // snake_case fallback
      const r2 = serverToRow({ id: 'f1', target_hours: 16, started_at: 1000 });
      expect(r2!.target_hours).toBe(16);
    });
  });

  describe('buildRowToEntity', () => {
    it('habit: converts snake_case row to camelCase entity', () => {
      const rowToEntity = buildRowToEntity(SCHEMAS.habit);
      const result = rowToEntity({
        id: 'h1', name: 'Exercise', start_date: '2026-01-01', target_days: 30,
        goal: 'fitness', insight: '', create_tag: 1, done_days: 5, streak: 3,
        interrupted: 0, status: 'inProgress', checked_dates: '["2026-01-01"]',
        pause_reason: '', abandon_reason: '', alarm_enabled: 0,
        alarm_hour: 8, alarm_minute: 0, link: 'none', updated_at: 1000, deleted: 0,
      });
      expect(result.id).toBe('h1');
      expect(result.startDate).toBe('2026-01-01');
      expect(result.targetDays).toBe(30);
      expect(result.createTag).toBe(true);
      expect(result.deleted).toBe(false);
      expect(result.checkedDates).toEqual(['2026-01-01']);
    });

    it('profile: custom override preserves data blob', () => {
      const rowToEntity = buildRowToEntity(SCHEMAS.profile);
      const result = rowToEntity({
        profile_id: 'self',
        data: '{"theme":"dark","language":"en"}',
        updated_at: 5000,
        deleted: 0,
      });
      expect(result.theme).toBe('dark');
      expect(result.language).toBe('en');
      expect(result.updatedAt).toBe(5000);
    });

    it('aiConfig: custom override preserves config_id', () => {
      const rowToEntity = buildRowToEntity(SCHEMAS.aiConfig);
      const result = rowToEntity({
        config_id: 'self', mode: 'hybrid', models: '[]', updated_at: 1000, deleted: 0,
      });
      expect(result.config_id).toBe('self');
      expect(result.mode).toBe('hybrid');
    });

    it('checkinReview: round-trip preserves reviewData fields', () => {
      const toRow = buildToRow(SCHEMAS.checkinReview);
      const rowToEntity = buildRowToEntity(SCHEMAS.checkinReview);
      const entity = {
        id: 'r1', userId: 'u1', period: 'week', startDate: '2026-01-01', endDate: '2026-01-07',
        completionRate: 0.8, doneDays: 5, totalDays: 7, streakDays: 3,
        updatedAt: 1000, deleted: false,
      };
      const row = toRow(entity);
      const restored = rowToEntity(row);
      expect(restored.completionRate).toBe(0.8);
      expect(restored.doneDays).toBe(5);
      expect(restored.streakDays).toBe(3);
      expect(restored.id).toBe('r1');
    });

    it('reflection: timestamp maps consistently via created_at', () => {
      const toRow = buildToRow(SCHEMAS.reflection);
      const rowToEntity = buildRowToEntity(SCHEMAS.reflection);
      const entity = { id: 'ref1', timestamp: 1000, content: 'test', updatedAt: 1000, deleted: false };
      const row = toRow(entity);
      expect(row.created_at).toBe(1000); // timestamp → created_at
      const restored = rowToEntity(row);
      expect(restored.timestamp).toBe(1000); // created_at → timestamp
    });

    it('reflectionLink: custom override maps id ↔ link_id', () => {
      const toRow = buildToRow(SCHEMAS.reflectionLink);
      const rowToEntity = buildRowToEntity(SCHEMAS.reflectionLink);
      const entity = { id: 'lnk1', fromId: 'a', toId: 'b', type: 'related', createdAt: 1000, updatedAt: 1000, deleted: false };
      const row = toRow(entity);
      expect(row.link_id).toBe('lnk1');
      const restored = rowToEntity(row);
      expect(restored.id).toBe('lnk1');
    });
  });
});
