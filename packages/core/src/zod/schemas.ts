// ─── Zod schemas for runtime type validation ────────────────────
// Used for validating network data (API responses, sync payloads).
// Import from '@egoless-do/core' or '@egoless-do/core/zod'.

import { z } from 'zod';

// ── Auth response schemas ──────────────────────────────────────

export const AuthUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  avatar: z.string().nullable().optional(),
  created: z.string().optional(),
  updated: z.string().optional(),
});

export const AuthResponseSchema = z.object({
  token: z.string(),
  refreshToken: z.string(),
  expiresAt: z.number(),
  user: AuthUserSchema,
});

export const TokenResponseSchema = z.object({
  token: z.string(),
  refreshToken: z.string(),
  expiresAt: z.number(),
});

// ── Entity schemas (SQLite query results) ──────────────────────

export const SyncableSchema = z.object({
  id: z.string(),
  updatedAt: z.number(),
  deleted: z.boolean().optional(),
});

export const CheckinEntrySchema = SyncableSchema.extend({
  date: z.string(),
  done: z.boolean(),
  note: z.string().optional(),
  weight: z.number().optional(),
  grace: z.boolean().optional(),
});

export const HabitSchema = SyncableSchema.extend({
  name: z.string(),
  icon: z.string().optional(),
  color: z.string().optional(),
  checkedDates: z.array(z.string()).optional(),
});

export const ReflectionSchema = SyncableSchema.extend({
  content: z.string(),
  tags: z.array(z.string()).optional(),
  moods: z.array(z.string()).optional(),
  thoughtTrailIds: z.array(z.string()).optional(),
  createdAt: z.number().optional(),
});

export const FastingSessionSchema = SyncableSchema.extend({
  startTime: z.number(),
  endTime: z.number().optional(),
  targetHours: z.number(),
  note: z.string().optional(),
});

export const FoodEntrySchema = SyncableSchema.extend({
  name: z.string(),
  calories: z.number().optional(),
  meal: z.string().optional(),
  timestamp: z.number(),
});

export const ExerciseEntrySchema = SyncableSchema.extend({
  name: z.string(),
  duration: z.number().optional(),
  calories: z.number().optional(),
  timestamp: z.number(),
});

export const PlanSchema = SyncableSchema.extend({
  name: z.string(),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.string(),
});

export const SleepEntrySchema = SyncableSchema.extend({
  date: z.string(),
  startTime: z.number().optional(),
  endTime: z.number().optional(),
  quality: z.number().optional(),
  note: z.string().optional(),
});

export const ThoughtTrailSchema = SyncableSchema.extend({
  title: z.string(),
  reflectionIds: z.array(z.string()).optional(),
  createdAt: z.number().optional(),
});

export const UserProfileSchema = SyncableSchema.extend({
  nickname: z.string().optional(),
  avatar: z.string().optional(),
  waterMl: z.number().optional(),
  waterGoal: z.number().optional(),
});

export const RecycleBinItemSchema = z.object({
  id: z.string(),
  entityType: z.string(),
  data: z.unknown(),
  deletedAt: z.number(),
  reason: z.string().optional(),
});

// ── Sync data schema ────────────────────────────────────────────

export const SyncPullDataSchema = z.record(z.string(), z.array(z.unknown()));

// ── Settings schemas ────────────────────────────────────────────

export const AuthSettingsSchema = z.object({
  isSignedIn: z.boolean(),
  user: AuthUserSchema.nullable(),
  isGuest: z.boolean().optional(),
});

export const AppSettingsSchema = z.object({
  theme: z.string().optional(),
  language: z.string().optional(),
  streak: z.number().optional(),
  waterMl: z.number().optional(),
  waterGoal: z.number().optional(),
  calGoal: z.number().optional(),
  remindEnabled: z.boolean().optional(),
  remindTime: z.string().optional(),
  weightUnit: z.string().optional(),
});

// ── Type exports ────────────────────────────────────────────────

export type AuthUser = z.infer<typeof AuthUserSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type TokenResponse = z.infer<typeof TokenResponseSchema>;

// ── Validation helpers ──────────────────────────────────────────

/** Validate data against a Zod schema, return null if invalid. */
export function safeParse<T extends z.ZodType>(
  schema: T,
  data: unknown,
): z.infer<T> | null {
  const result = schema.safeParse(data);
  return result.success ? result.data : null;
}

/** Validate data, throw on invalid. Use for trusted sources. */
export function validate<T extends z.ZodType>(
  schema: T,
  data: unknown,
): z.infer<T> {
  return schema.parse(data);
}

/** Validate and filter an array of SQLite rows. Invalid rows are silently dropped. */
export function validateRows<T extends z.ZodType>(
  schema: T,
  rows: unknown[],
): z.infer<T>[] {
  return rows
    .map(row => schema.safeParse(row))
    .filter((result): result is { success: true; data: z.infer<T> } => result.success)
    .map(result => result.data);
}
