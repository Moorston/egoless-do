import { describe, it, expect } from 'vitest';
import {
  CheckinEntrySchema,
  HabitSchema,
  ReflectionSchema,
  FastingSessionSchema,
  FoodEntrySchema,
  PlanSchema,
  SleepEntrySchema,
  ThoughtTrailSchema,
  UserProfileSchema,
  RecycleBinItemSchema,
  AuthSettingsSchema,
  safeParse,
  validateRows,
} from './schemas';

describe('Zod schemas for SQLite query results', () => {
  describe('CheckinEntrySchema', () => {
    it('validates valid checkin entry', () => {
      const data = { id: '1', date: '2026-01-01', done: true, updatedAt: Date.now() };
      expect(CheckinEntrySchema.safeParse(data).success).toBe(true);
    });

    it('rejects invalid checkin entry', () => {
      const data = { id: '1', done: true }; // missing date
      expect(CheckinEntrySchema.safeParse(data).success).toBe(false);
    });
  });

  describe('HabitSchema', () => {
    it('validates valid habit', () => {
      const data = { id: '1', name: 'Exercise', updatedAt: Date.now() };
      expect(HabitSchema.safeParse(data).success).toBe(true);
    });

    it('rejects invalid habit', () => {
      const data = { id: '1' }; // missing name
      expect(HabitSchema.safeParse(data).success).toBe(false);
    });
  });

  describe('ReflectionSchema', () => {
    it('validates valid reflection', () => {
      const data = { id: '1', content: 'Feeling grateful', updatedAt: Date.now() };
      expect(ReflectionSchema.safeParse(data).success).toBe(true);
    });
  });

  describe('FastingSessionSchema', () => {
    it('validates valid fasting session', () => {
      const data = { id: '1', startTime: Date.now(), targetHours: 16, updatedAt: Date.now() };
      expect(FastingSessionSchema.safeParse(data).success).toBe(true);
    });
  });

  describe('FoodEntrySchema', () => {
    it('validates valid food entry', () => {
      const data = { id: '1', name: 'Apple', timestamp: Date.now(), updatedAt: Date.now() };
      expect(FoodEntrySchema.safeParse(data).success).toBe(true);
    });
  });

  describe('PlanSchema', () => {
    it('validates valid plan', () => {
      const data = { id: '1', name: 'Learn React', startDate: '2026-01-01', endDate: '2026-12-31', status: 'active', updatedAt: Date.now() };
      expect(PlanSchema.safeParse(data).success).toBe(true);
    });
  });

  describe('SleepEntrySchema', () => {
    it('validates valid sleep entry', () => {
      const data = { id: '1', date: '2026-01-01', updatedAt: Date.now() };
      expect(SleepEntrySchema.safeParse(data).success).toBe(true);
    });
  });

  describe('ThoughtTrailSchema', () => {
    it('validates valid thought trail', () => {
      const data = { id: '1', title: 'My Trail', updatedAt: Date.now() };
      expect(ThoughtTrailSchema.safeParse(data).success).toBe(true);
    });
  });

  describe('UserProfileSchema', () => {
    it('validates valid user profile', () => {
      const data = { id: '1', nickname: 'Test User', updatedAt: Date.now() };
      expect(UserProfileSchema.safeParse(data).success).toBe(true);
    });
  });

  describe('RecycleBinItemSchema', () => {
    it('validates valid recycle bin item', () => {
      const data = { id: '1', entityType: 'habit', data: { name: 'Exercise' }, deletedAt: Date.now() };
      expect(RecycleBinItemSchema.safeParse(data).success).toBe(true);
    });
  });

  describe('AuthSettingsSchema', () => {
    it('validates valid auth settings', () => {
      const data = { isSignedIn: true, user: null };
      expect(AuthSettingsSchema.safeParse(data).success).toBe(true);
    });

    it('validates with user', () => {
      const data = { isSignedIn: true, user: { id: '1', email: 'test@test.com', name: 'Test' } };
      expect(AuthSettingsSchema.safeParse(data).success).toBe(true);
    });
  });

  describe('safeParse helper', () => {
    it('returns parsed data on success', () => {
      const data = { id: '1', date: '2026-01-01', done: true, updatedAt: Date.now() };
      const result = safeParse(CheckinEntrySchema, data);
      expect(result).not.toBeNull();
      expect(result?.id).toBe('1');
    });

    it('returns null on failure', () => {
      const data = { id: '1' };
      const result = safeParse(CheckinEntrySchema, data);
      expect(result).toBeNull();
    });
  });

  describe('validateRows helper', () => {
    it('filters invalid rows', () => {
      const rows = [
        { id: '1', date: '2026-01-01', done: true, updatedAt: Date.now() },
        { id: '2', done: true }, // missing date
        { id: '3', date: '2026-01-02', done: false, updatedAt: Date.now() },
      ];
      const result = validateRows(CheckinEntrySchema, rows);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('3');
    });

    it('returns empty array for all invalid', () => {
      const rows = [{ id: '1' }, { id: '2' }];
      const result = validateRows(CheckinEntrySchema, rows);
      expect(result).toHaveLength(0);
    });
  });
});
