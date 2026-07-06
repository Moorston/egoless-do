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

// ── Entity schemas ──────────────────────────────────────────────

export const CheckinEntrySchema = z.object({
  id: z.string(),
  date: z.string(),
  done: z.boolean(),
  note: z.string().optional(),
  weight: z.number().optional(),
  grace: z.boolean().optional(),
  deleted: z.boolean().optional(),
  updatedAt: z.number().optional(),
});

export const HabitSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().optional(),
  color: z.string().optional(),
  checkedDates: z.array(z.string()).optional(),
  deleted: z.boolean().optional(),
  updatedAt: z.number().optional(),
});

export const ReflectionSchema = z.object({
  id: z.string(),
  content: z.string(),
  tags: z.array(z.string()).optional(),
  moods: z.array(z.string()).optional(),
  thoughtTrailIds: z.array(z.string()).optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
  deleted: z.boolean().optional(),
});

// ── Sync data schema ────────────────────────────────────────────

export const SyncPullDataSchema = z.record(z.string(), z.array(z.unknown()));

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
