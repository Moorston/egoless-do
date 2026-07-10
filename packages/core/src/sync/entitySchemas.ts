// ─── Unified Entity Schema Registry ─────────────────────────────
// Single source of truth for all entity mappings.
// Generates toRow, serverPayloadToRow, and rowToEntity from one definition.

import type { SyncEntity } from './entities';
import type { EntityMeta } from '../data/entityRegistry';

// ── Types ───────────────────────────────────────────────────────

export type FieldType = 'bool' | 'json' | 'num' | 'string';

export interface FieldMapping {
  /** Entity property name (camelCase) — used in toRow reads and rowToEntity writes */
  entity: string;
  /** SQLite column name (snake_case) — used in all DB operations */
  col: string;
  /** Server-side field name (camelCase) — defaults to `entity` if omitted */
  server?: string;
  /** Type conversion for SQLite storage */
  type?: FieldType;
  /** Default value when source is null/undefined */
  fallback?: unknown;
  /** If true, serverPayloadToRow skips the entire record when this field is missing */
  required?: boolean;
  /** If true, only include in toRow when the source value is not undefined */
  optional?: boolean;
  /** If true, exclude from toRow (local write) — used for columns that exist in SQLite but should not be written */
  readOnly?: boolean;
}

export interface EntitySchema {
  sqlite: { table: string; pk: string };
  pocketbase: { collection: string; serverIdField: string };
  /** Optional override for Zustand store key (defaults to `${entity}s`) */
  storeKey?: string;
  fields: FieldMapping[];
  /** Custom toRow override — takes precedence over generated version */
  customToRow?: (data: Record<string, unknown>) => Record<string, unknown>;
  /** Custom serverPayloadToRow override */
  customServerPayloadToRow?: (r: Record<string, unknown>) => Record<string, unknown> | null;
  /** Custom rowToEntity override */
  customRowToEntity?: (row: Record<string, unknown>) => Record<string, unknown>;
}

// ── Helpers ─────────────────────────────────────────────────────

function bool(v: unknown): number { return v ? 1 : 0; }
/** Parse byte array (char codes from PocketBase) to string */
function parseBytes(v: unknown): string | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  // Only treat as byte array if ALL elements are numbers (char codes)
  // This prevents misidentifying JSON arrays like ["2026-01-01"] as byte arrays
  if (!v.every(e => typeof e === 'number' && e >= 0 && e <= 65535)) return null;
  try {
    // Use loop to avoid stack overflow with large arrays (>65000 elements)
    let result = '';
    for (let i = 0; i < v.length; i++) {
      result += String.fromCharCode(v[i] as number);
    }
    return result;
  } catch { return null; }
}
/** Normalize value that may be object, JSON string, or byte array */
function parseDataField(v: unknown): unknown {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v;
  if (typeof v === 'string') { try { return JSON.parse(v); } catch { return null; } }
  const s = parseBytes(v);
  if (s !== null) { try { return JSON.parse(s); } catch { return null; } }
  return null;
}
function json(v: unknown): string {
  if (typeof v === 'string') return v;
  const s = parseBytes(v);
  if (s !== null) return s;
  return JSON.stringify(v ?? []);
}
function num(v: unknown, d = 0): number { return typeof v === 'number' ? v : d; }
function localDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function boolRead(v: unknown): boolean { return v === 1 || v === true; }
function parseJson<T>(v: unknown, fallback: T): T {
  if (typeof v === 'string') { try { return JSON.parse(v); } catch { return fallback; } }
  const s = parseBytes(v);
  if (s !== null) { try { return JSON.parse(s); } catch { return fallback; } }
  return (v as T) ?? fallback;
}

function applyType(value: unknown, type?: FieldType): unknown {
  switch (type) {
    case 'bool': return bool(value);
    case 'json': return json(value);
    case 'num': return num(value);
    default: return value;
  }
}

function applyReadType(value: unknown, type?: FieldType): unknown {
  switch (type) {
    case 'bool': return boolRead(value);
    case 'json': {
      if (typeof value === 'string') return value;
      const s = parseBytes(value);
      if (s !== null) return s;
      return JSON.stringify(value ?? []);
    }
    default: return value;
  }
}

/**
 * Resolve a field value from a PB record, supporting nested `data` format.
 * PB hook returns { id, habit_id, user_id, data: { name, startDate, ... } }.
 * Tries: r[key] → r.data[key] → undefined
 *
 * NOTE: If the top-level field is explicitly `null`, pbField falls through to nested data.
 * This is intentional — PB hook stores entity data in `data` JSON and may set top-level
 * fields to null when they're not applicable. The nested `data` is always the source of truth.
 */
export function pbField(r: Record<string, unknown>, key: string): unknown {
  const val = r[key];
  if (val !== undefined && val !== null) return val;
  const nested = r.data;
  if (nested && typeof nested === 'object') return (nested as Record<string, unknown>)[key];
  return undefined;
}

function resolveFallback(field: FieldMapping, value: unknown): unknown {
  if (value !== undefined && value !== null) return value;
  if (field.fallback !== undefined) {
    return typeof field.fallback === 'function' ? (field.fallback as () => unknown)() : field.fallback;
  }
  return undefined;
}

// ── Builder functions ───────────────────────────────────────────

/** Build a toRow function from schema (entity → SQLite row, for local writes) */
export function buildToRow(schema: EntitySchema): (data: Record<string, unknown>) => Record<string, unknown> {
  if (schema.customToRow) return schema.customToRow;
  return (data: Record<string, unknown>) => {
    const row: Record<string, unknown> = {};
    for (const f of schema.fields) {
      if (f.readOnly) continue;
      const raw = data[f.entity];
      if (f.optional && raw === undefined) continue;
      const value = resolveFallback(f, raw);
      row[f.col] = applyType(value, f.type);
    }
    return row;
  };
}

/** Build a serverPayloadToRow function from schema (server payload → SQLite row, for pull) */
export function buildServerPayloadToRow(schema: EntitySchema): (r: Record<string, unknown>) => Record<string, unknown> | null {
  if (schema.customServerPayloadToRow) return schema.customServerPayloadToRow;
  return (r: Record<string, unknown>) => {
    const row: Record<string, unknown> = {};
    for (const f of schema.fields) {
      if (f.readOnly) continue;
      // Skip deleted field — always force to 0 for server payloads
      if (f.entity === 'deleted') { row[f.col] = 0; continue; }
      // Resolve from PB record (supports nested data)
      const serverName = f.server ?? f.entity;
      let raw = pbField(r, serverName);
      if (raw === undefined || raw === null) raw = pbField(r, f.col);
      // Check required — only reject truly missing values (undefined/null), not empty strings.
      // Empty string is a valid value; non-emptiness is a business logic concern, not a sync concern.
      if (f.required && (raw === undefined || raw === null)) return null;
      const value = resolveFallback(f, raw);
      row[f.col] = applyType(value, f.type);
    }
    return row;
  };
}

/** Build a rowToEntity function from schema (SQLite row → entity, for reads) */
export function buildRowToEntity<T = Record<string, unknown>>(schema: EntitySchema): (row: Record<string, unknown>) => T {
  if (schema.customRowToEntity) return schema.customRowToEntity as (row: Record<string, unknown>) => T;
  return (row: Record<string, unknown>): T => {
    const entity: Record<string, unknown> = {};
    for (const f of schema.fields) {
      const raw = row[f.col];
      switch (f.type) {
        case 'bool':
          entity[f.entity] = boolRead(raw);
          break;
        case 'json':
          entity[f.entity] = parseJson(raw, f.fallback ?? []);
          break;
        case 'num':
          entity[f.entity] = raw ?? (f.fallback !== undefined ? f.fallback : 0);
          break;
        default:
          entity[f.entity] = raw ?? f.fallback ?? undefined;
          break;
      }
    }
    return entity as T;
  };
}

/** Get EntityMeta (table, pk, collection) from schema for ENTITY_REGISTRY */
export function schemaToEntityMeta(schema: EntitySchema): EntityMeta {
  return {
    collection: schema.pocketbase.collection,
    localPk: schema.sqlite.pk,
    remotePk: schema.pocketbase.serverIdField,
    softDelete: true,
  };
}

// ── SCHEMAS: The single source of truth ─────────────────────────

export const SCHEMAS: Record<SyncEntity, EntitySchema> = {
  habit: {
    sqlite: { table: 'habits', pk: 'id' },
    pocketbase: { collection: 'habits', serverIdField: 'habit_id' },
    fields: [
      { entity: 'id',            col: 'id',             server: 'id',          fallback: null },
      { entity: 'name',          col: 'name',           server: 'name',        fallback: 'Untitled', required: true },
      { entity: 'startDate',     col: 'start_date',     server: 'startDate',   fallback: '', required: true },
      { entity: 'targetDays',    col: 'target_days',    server: 'targetDays',  type: 'num', fallback: 0 },
      { entity: 'goal',          col: 'goal',           server: 'goal',        fallback: '' },
      { entity: 'insight',       col: 'insight',        server: 'insight',     fallback: '' },
      { entity: 'createTag',     col: 'create_tag',     server: 'createTag',   type: 'bool' },
      { entity: 'doneDays',      col: 'done_days',      server: 'doneDays',    type: 'num', fallback: 0 },
      { entity: 'streak',        col: 'streak',         server: 'streak',      type: 'num', fallback: 0 },
      { entity: 'interrupted',   col: 'interrupted',    server: 'interrupted', type: 'num', fallback: 0 },
      { entity: 'status',        col: 'status',         server: 'status',      fallback: 'notStarted' },
      { entity: 'checkedDates',  col: 'checked_dates',  server: 'checkedDates', type: 'json' },
      { entity: 'pauseReason',   col: 'pause_reason',   server: 'pauseReason', fallback: '' },
      { entity: 'abandonReason', col: 'abandon_reason',  server: 'abandonReason', fallback: '' },
      { entity: 'alarmEnabled',  col: 'alarm_enabled',  server: 'alarmEnabled', type: 'bool' },
      { entity: 'alarmHour',     col: 'alarm_hour',     server: 'alarmHour',   type: 'num', fallback: 8 },
      { entity: 'alarmMinute',   col: 'alarm_minute',   server: 'alarmMinute', type: 'num', fallback: 0 },
      { entity: 'updatedAt',     col: 'updated_at',     server: 'updatedAt',   fallback: () => Date.now() },
      { entity: 'link',          col: 'link',           server: 'link',        fallback: 'none' },
      { entity: 'linkConfig',    col: 'link_config',    server: 'linkConfig',  type: 'json', fallback: null },
      { entity: 'deleted',       col: 'deleted',        type: 'bool' },
    ],
  },

  reflection: {
    sqlite: { table: 'mind_reflections', pk: 'id' },
    pocketbase: { collection: 'reflections', serverIdField: 'reflection_id' },
    fields: [
      { entity: 'id',              col: 'id',              server: 'id',            fallback: null },
      { entity: 'timestamp',       col: 'created_at',      server: 'timestamp',     fallback: () => Date.now() },
      { entity: 'content',         col: 'content',         server: 'content',       fallback: '' },
      { entity: 'tags',            col: 'tags',            server: 'tags',          type: 'json' },
      { entity: 'mood',            col: 'mood',            server: 'mood',          fallback: null },
      { entity: 'cardTheme',       col: 'card_theme',      server: 'cardTheme',     fallback: null },
      { entity: 'link',            col: 'link',            server: 'link',          fallback: null },
      { entity: 'linkedHabitId',   col: 'linked_habit_id', server: 'linkedHabitId', fallback: null, optional: true },
      { entity: 'linkedPlanItemId', col: 'linked_plan_id', server: 'linkedPlanItemId', fallback: null },
      { entity: 'isPinned',        col: 'is_pinned',       server: 'isPinned',      type: 'bool' },
      { entity: 'isPublished',     col: 'is_published',    server: 'isPublished',   type: 'bool' },
      { entity: 'colors',          col: 'colors',          server: 'colors',        type: 'json', fallback: null },
      { entity: 'thoughtTrailIds', col: 'thought_trail_ids', server: 'thoughtTrailIds', type: 'json', fallback: null },
      { entity: 'updatedAt',       col: 'updated_at',      server: 'updatedAt',     fallback: () => Date.now() },
      { entity: 'deleted',         col: 'deleted',         type: 'bool' },
    ],
  },

  fasting: {
    sqlite: { table: 'fasting_sessions', pk: 'id' },
    pocketbase: { collection: 'fasting_sessions', serverIdField: 'session_id' },
    fields: [
      { entity: 'id',            col: 'id',             server: 'id',          fallback: null },
      { entity: 'targetHours',   col: 'target_hours',   server: 'targetHours', type: 'num' },
      { entity: 'startedAt',     col: 'started_at',     server: 'startedAt', type: 'num', fallback: 0 },
      { entity: 'endedAt',       col: 'ended_at',       server: 'endedAt',     fallback: null },
      { entity: 'estimatedKcal', col: 'estimated_kcal', server: 'estimatedKcal', fallback: null },
      { entity: 'insight',       col: 'insight',        server: 'insight',     fallback: null },
      { entity: 'note',          col: 'note',           server: 'note',        fallback: '', optional: true },
      { entity: 'updatedAt',     col: 'updated_at',     server: 'updatedAt',   fallback: () => Date.now() },
      { entity: 'deleted',       col: 'deleted',        type: 'bool' },
    ],
  },

  food: {
    sqlite: { table: 'food_entries', pk: 'id' },
    pocketbase: { collection: 'food_entries', serverIdField: 'food_id' },
    customToRow: (d) => ({
      id: d.id, name: d.name, cal: num(d.calories), note: d.note ?? '',
      entry_date: d.timestamp ? localDate(d.timestamp as number) : '', ts: d.timestamp,
      updated_at: d.updatedAt ?? Date.now(), deleted: bool(d.deleted),
    }),
    customServerPayloadToRow: (r) => {
      // Parse data field (may be object, JSON string, or byte array from PocketBase)
      const parsed = parseDataField(r.data);
      const src = parsed && typeof parsed === 'object' ? { ...parsed, ...r } : r;
      const ts = src.timestamp ?? src.ts ?? Date.now();
      const entryDate = src.entry_date || src.entryDate || (ts ? (() => {
        const d = new Date(Number(ts));
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })() : '');
      return {
        id: src.id, name: src.name ?? '', cal: src.calories ?? src.cal ?? 0, note: src.note ?? '',
        entry_date: entryDate, ts,
        updated_at: src.updatedAt ?? Date.now(), deleted: 0,
      };
    },
    customRowToEntity: (r) => ({
      id: r.id, name: r.name, calories: r.cal, note: r.note ?? '', timestamp: r.ts,
      updatedAt: r.updated_at, deleted: boolRead(r.deleted),
    }),
    fields: [
      { entity: 'id',        col: 'id',         server: 'id',     fallback: null },
      { entity: 'name',      col: 'name',       server: 'name',   fallback: '' },
      { entity: 'calories',  col: 'cal',        server: 'calories', type: 'num' },
      { entity: 'note',      col: 'note',       server: 'note',   fallback: '' },
      { entity: 'timestamp', col: 'ts',         server: 'timestamp' },
      { entity: 'updatedAt', col: 'updated_at', server: 'updatedAt', fallback: () => Date.now() },
      { entity: 'deleted',   col: 'deleted',    type: 'bool' },
    ],
  },

  checkin: {
    sqlite: { table: 'checkin_records', pk: 'date' },
    pocketbase: { collection: 'checkin_records', serverIdField: 'date' },
    fields: [
      { entity: 'date',      col: 'date',       server: 'date',     fallback: null },
      { entity: 'done',      col: 'done',       server: 'done',     type: 'bool' },
      { entity: 'note',      col: 'note',       server: 'note',     fallback: '' },
      { entity: 'streak',    col: 'streak',     server: 'streak',   type: 'num' },
      { entity: 'timestamp', col: 'timestamp',  server: 'timestamp', fallback: null },
      { entity: 'weight',    col: 'weight',     server: 'weight',   fallback: null },
      { entity: 'grace',     col: 'grace',      server: 'grace',    type: 'bool' },
      { entity: 'totalDays', col: 'total_days', server: 'totalDays', fallback: null },
      { entity: 'updatedAt', col: 'updated_at', server: 'updatedAt', fallback: () => Date.now() },
      { entity: 'deleted',   col: 'deleted',    type: 'bool' },
    ],
  },

  exercise: {
    sqlite: { table: 'exercise_entries', pk: 'id' },
    pocketbase: { collection: 'exercise_entries', serverIdField: 'exercise_id' },
    customToRow: (d) => ({
      id: d.id, sport_key: d.sportKey ?? '', sport_icon: d.sportIcon ?? '',
      duration_sec: num(d.durationSec), distance_km: d.distanceKm ?? 0,
      calories: d.calories ?? 0, avg_pace: d.avgPace ?? 0,
      track_points: json(d.trackPoints), is_gps_sport: bool(d.isGpsSport),
      mode: d.mode ?? null, target: d.target ? json(d.target) : null,
      segment_paces: d.segmentPaces ? json(d.segmentPaces) : null,
      elevation_gain: d.elevationGain ?? null, paused_duration: d.pausedDuration ?? null,
      reps: d.reps ?? null, sets: d.sets ? json(d.sets) : null, met: d.met ?? null,
      health_synced: bool(d.healthSynced),
      ts: d.timestamp,
      updated_at: d.updatedAt ?? Date.now(), deleted: bool(d.deleted),
    }),
    customServerPayloadToRow: (r) => ({
      id: r.id, sport_key: (r.sportKey ?? r.sport_key) ?? '', sport_icon: r.sportIcon ?? r.sport_icon ?? '',
      duration_sec: r.durationSec ?? r.duration_sec ?? 0, distance_km: r.distanceKm ?? r.distance_km ?? 0,
      calories: r.calories ?? 0, avg_pace: r.avgPace ?? r.avg_pace ?? 0,
      track_points: typeof r.trackPoints === 'string' ? r.trackPoints : JSON.stringify(r.trackPoints ?? []),
      is_gps_sport: r.isGpsSport ? 1 : 0,
      mode: r.mode ?? null, target: r.target ? JSON.stringify(r.target) : null,
      segment_paces: r.segmentPaces ? JSON.stringify(r.segmentPaces) : null,
      elevation_gain: r.elevationGain ?? null, paused_duration: r.pausedDuration ?? null,
      reps: r.reps ?? null, sets: r.sets ? JSON.stringify(r.sets) : null, met: r.met ?? null,
      health_synced: r.healthSynced ? 1 : 0,
      ts: r.timestamp ?? r.ts ?? 0,
      updated_at: r.updatedAt ?? Date.now(), deleted: 0,
    }),
    customRowToEntity: (r) => ({
      id: r.id, sportKey: r.sport_key, sportIcon: r.sport_icon ?? '', durationSec: r.duration_sec,
      distanceKm: r.distance_km ?? 0, calories: r.calories ?? 0, avgPace: r.avg_pace ?? 0,
      trackPoints: parseJson(r.track_points, []), isGpsSport: boolRead(r.is_gps_sport),
      mode: r.mode ?? null, target: r.target ? parseJson(r.target, undefined) : undefined,
      segmentPaces: r.segment_paces ? parseJson(r.segment_paces, undefined) : undefined,
      elevationGain: r.elevation_gain ?? null, pausedDuration: r.paused_duration ?? null,
      reps: r.reps ?? null, sets: r.sets ? parseJson(r.sets, undefined) : undefined,
      met: r.met ?? null, timestamp: r.ts,
      healthSynced: boolRead(r.health_synced),
      updatedAt: r.updated_at, deleted: boolRead(r.deleted),
    }),
    fields: [],
  },

  meditation: {
    sqlite: { table: 'meditation_history', pk: 'date' },
    pocketbase: { collection: 'meditation_history', serverIdField: 'date' },
    fields: [
      { entity: 'date',      col: 'date',       server: 'date',     fallback: null },
      { entity: 'durMin',    col: 'dur_min',    server: 'durMin',   type: 'num', fallback: 0 },
      { entity: 'trackId',   col: 'track_id',   server: 'trackId',  fallback: '', optional: true },
      { entity: 'note',      col: 'note',       server: 'note',     fallback: '', optional: true },
      { entity: 'updatedAt', col: 'updated_at', server: 'updatedAt', fallback: () => Date.now() },
      { entity: 'deleted',   col: 'deleted',    type: 'bool' },
    ],
  },

  profile: {
    sqlite: { table: 'user_profiles', pk: 'profile_id' },
    pocketbase: { collection: 'user_profiles', serverIdField: 'profile_id' },
    customToRow: (d) => {
      const { profileId, data, ...rest } = d as Record<string, unknown>;
      return {
        profile_id: profileId ?? 'self',
        data: typeof data === 'string' ? data : JSON.stringify(rest),
        updated_at: d.updatedAt ?? Date.now(),
        deleted: bool(d.deleted),
      };
    },
    customServerPayloadToRow: (r) => {
      // Parse data field (may be object, JSON string, or byte array from PocketBase)
      const parsed = parseDataField(r.data);
      const src = parsed && typeof parsed === 'object' ? { ...parsed, ...r } : r;
      // Filter out PocketBase system fields when constructing the data blob
      const PB_FIELDS = new Set(['id', 'created', 'updated', 'user_id', 'profile_id', 'profileId', 'deleted', 'updatedAt']);
      const profileData: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(src)) {
        if (!PB_FIELDS.has(k)) profileData[k] = v;
      }
      return {
        profile_id: r.profileId ?? r.profile_id ?? 'self',
        data: JSON.stringify(Object.keys(profileData).length ? profileData : {}),
        updated_at: r.updatedAt ?? Date.now(), deleted: 0,
      };
    },
    customRowToEntity: (r) => {
      const data = parseJson<Record<string, unknown>>(r.data, {});
      return { ...data, updatedAt: (r.updated_at as number) ?? (data.updatedAt as number) };
    },
    fields: [],
  },

  plan: {
    sqlite: { table: 'plans', pk: 'id' },
    pocketbase: { collection: 'plans', serverIdField: 'plan_id' },
    fields: [
      { entity: 'id',                col: 'id',                    server: 'id',                fallback: null },
      { entity: 'name',              col: 'name',                  server: 'name',              fallback: '' },
      { entity: 'goal',              col: 'goal',                  server: 'goal',              fallback: '' },
      { entity: 'slogan',            col: 'slogan',                server: 'slogan',            fallback: '' },
      { entity: 'startDate',         col: 'start_date',            server: 'startDate',         fallback: '' },
      { entity: 'endDate',           col: 'end_date',              server: 'endDate',           fallback: '' },
      { entity: 'status',            col: 'status',                server: 'status',            fallback: 'not_started' },
      { entity: 'progress',          col: 'progress',              server: 'progress',          type: 'num', fallback: 0 },
      { entity: 'completeReason',    col: 'complete_reason',       server: 'completeReason',    fallback: null },
      { entity: 'lastDelayedNotifyAt', col: 'last_delayed_notify_at', server: 'lastDelayedNotifyAt', fallback: null },
      { entity: 'visionId',        col: 'vision_id',            server: 'visionId',        fallback: '', optional: true },
      { entity: 'updatedAt',       col: 'updated_at',            server: 'updatedAt',       fallback: () => Date.now() },
      { entity: 'deleted',         col: 'deleted',               type: 'bool' },
    ],
  },

  planItem: {
    sqlite: { table: 'plan_items', pk: 'id' },
    pocketbase: { collection: 'plan_items', serverIdField: 'plan_item_id' },
    customToRow: (d) => {
      const row: Record<string, unknown> = {
        id: d.id, plan_id: d.planId, name: d.name, description: d.description ?? '',
        start_date: d.startDate, end_date: d.endDate, content_url: d.contentUrl ?? '',
        total_checkin_days: num(d.totalCheckinDays), status: d.status ?? 'not_started',
        progress: num(d.progress), link: d.link ?? 'manual',
        priority: d.priority ?? 'medium',
        target_metric: d.targetMetric ?? '',
        link_config: json(d.linkConfig), item_order: num(d.order),
        updated_at: d.updatedAt ?? Date.now(), deleted: bool(d.deleted),
      };
      if (d.reflectionId !== undefined) row.reflection_id = d.reflectionId;
      if (d.trailId !== undefined) row.trail_id = d.trailId;
      row.frequency = d.frequency ? JSON.stringify(d.frequency) : null;
      row.tags = d.tags ? JSON.stringify(d.tags) : null;
      return row;
    },
    customServerPayloadToRow: (r) => {
      const row: Record<string, unknown> = {
        id: r.id, plan_id: r.planId ?? '', name: r.name ?? '', description: r.description ?? '',
        start_date: r.startDate ?? '', end_date: r.endDate ?? '', content_url: r.contentUrl ?? '',
        total_checkin_days: r.totalCheckinDays ?? 0, status: r.status ?? 'not_started',
        progress: r.progress ?? 0, link: r.link ?? 'manual',
        priority: r.priority ?? 'medium',
        target_metric: r.targetMetric ?? '',
        link_config: typeof r.linkConfig === 'string' ? r.linkConfig : JSON.stringify(r.linkConfig ?? {}),
        item_order: r.order ?? 0,
        updated_at: r.updatedAt ?? Date.now(), deleted: 0,
      };
      if (r.reflectionId !== undefined) row.reflection_id = r.reflectionId;
      if (r.trailId !== undefined) row.trail_id = r.trailId;
      row.frequency = r.frequency ? (typeof r.frequency === 'string' ? r.frequency : JSON.stringify(r.frequency)) : null;
      row.tags = r.tags ? (typeof r.tags === 'string' ? r.tags : JSON.stringify(r.tags)) : null;
      return row;
    },
    customRowToEntity: (r) => ({
      id: r.id, planId: r.plan_id, name: r.name, description: r.description ?? '',
      startDate: r.start_date, endDate: r.end_date, contentUrl: r.content_url ?? '',
      totalCheckinDays: r.total_checkin_days ?? 0,
      status: r.status ?? 'not_started', progress: r.progress ?? 0,
      link: r.link ?? 'manual', linkConfig: parseJson(r.link_config, {}),
      order: r.item_order ?? 0, priority: r.priority ?? 'medium',
      targetMetric: r.target_metric ?? '',
      reflectionId: r.reflection_id ?? undefined,
      trailId: r.trail_id ?? undefined,
      frequency: r.frequency ? parseJson(r.frequency, undefined) : undefined,
      tags: r.tags ? parseJson(r.tags, undefined) : undefined,
      updatedAt: r.updated_at, deleted: boolRead(r.deleted),
    }),
    fields: [],
  },

  planItemCheckin: {
    sqlite: { table: 'plan_item_checkins', pk: 'id' },
    pocketbase: { collection: 'plan_item_checkins', serverIdField: 'checkin_id' },
    fields: [
      { entity: 'id',           col: 'id',            server: 'id',          fallback: null },
      { entity: 'planItemId',   col: 'plan_item_id',  server: 'planItemId',  fallback: '' },
      { entity: 'date',         col: 'date',          server: 'date',          required: true },
      { entity: 'done',         col: 'done',          server: 'done',        type: 'bool' },
      { entity: 'note',         col: 'note',          server: 'note',        fallback: null },
      { entity: 'linkedModule', col: 'linked_module',  server: 'linkedModule', fallback: null },
      { entity: 'updatedAt',    col: 'updated_at',    server: 'updatedAt',   fallback: () => Date.now() },
      { entity: 'deleted',      col: 'deleted',       type: 'bool' },
    ],
  },

  grace: {
    sqlite: { table: 'grace_history', pk: 'date' },
    pocketbase: { collection: 'grace_history', serverIdField: 'date' },
    fields: [
      { entity: 'date',       col: 'date',        server: 'date',       fallback: null },
      { entity: 'restoredAt', col: 'restored_at', server: 'restoredAt', fallback: () => Date.now() },
      { entity: 'updatedAt',  col: 'updated_at',  server: 'updatedAt',  fallback: () => Date.now() },
      { entity: 'deleted',    col: 'deleted',     type: 'bool' },
    ],
  },

  dailyCustomTodo: {
    sqlite: { table: 'daily_custom_todos', pk: 'id' },
    pocketbase: { collection: 'daily_custom_todos', serverIdField: 'todo_id' },
    fields: [
      { entity: 'id',        col: 'id',         server: 'id',        fallback: null },
      { entity: 'planId',    col: 'plan_id',    server: 'planId' },
      { entity: 'date',      col: 'date',       server: 'date',      required: true },
      { entity: 'name',      col: 'name',       server: 'name',      required: true },
      { entity: 'done',      col: 'done',       server: 'done',      type: 'bool' },
      { entity: 'order',     col: 'todo_order', server: 'order',     type: 'num', fallback: 0 },
      { entity: 'recurring', col: 'recurring',  server: 'recurring', type: 'bool' },
      { entity: 'updatedAt', col: 'updated_at', server: 'updatedAt', fallback: () => Date.now() },
      { entity: 'deleted',   col: 'deleted',    type: 'bool' },
    ],
  },

  dailyTodoHistory: {
    sqlite: { table: 'daily_todo_history', pk: 'id' },
    pocketbase: { collection: 'daily_todo_history', serverIdField: 'history_id' },
    fields: [
      { entity: 'id',          col: 'id',            server: 'id',          fallback: null },
      { entity: 'planId',      col: 'plan_id',       server: 'planId',      fallback: '' },
      { entity: 'date',        col: 'date',          server: 'date',          required: true },
      { entity: 'planItems',   col: 'plan_items',    server: 'planItems',   type: 'json' },
      { entity: 'customTodos', col: 'custom_todos',  server: 'customTodos', type: 'json' },
      { entity: 'updatedAt',   col: 'updated_at',    server: 'updatedAt',   fallback: () => Date.now() },
      { entity: 'deleted',     col: 'deleted',       type: 'bool' },
    ],
  },

  thoughtTrail: {
    sqlite: { table: 'thought_trails', pk: 'id' },
    pocketbase: { collection: 'thought_trails', serverIdField: 'trail_id' },
    fields: [
      { entity: 'id',                col: 'id',                    server: 'id',                fallback: null },
      { entity: 'name',              col: 'name',                  server: 'name',                required: true },
      { entity: 'description',       col: 'description',           server: 'description',       fallback: '' },
      { entity: 'reflectionIds',     col: 'reflection_ids',        server: 'reflectionIds',     type: 'json' },
      { entity: 'noteIds',           col: 'note_ids',              server: 'noteIds',           type: 'json', fallback: [] },
      // NOTE: thoughtTrail.source defaults to 'manual' (how the trail was created)
      //       trailNote.source defaults to 'free' (note type: 'free' writing vs 'guided' prompt)
      //       These are intentionally different — do NOT unify without understanding the distinction.
      { entity: 'source',            col: 'source',                server: 'source',            fallback: 'manual' },
      { entity: 'insightSummary',    col: 'insight_summary',       server: 'insightSummary',    fallback: null },
      { entity: 'insightCache',      col: 'insight_cache',         server: 'insightCache',      type: 'json', fallback: null },
      { entity: 'reviewCache',       col: 'review_cache',          server: 'reviewCache',       type: 'json', fallback: null },
      { entity: 'linkedPlanItemIds', col: 'linked_plan_item_ids',  server: 'linkedPlanItemIds', type: 'json', fallback: null },
      { entity: 'createdAt',         col: 'created_at',            server: 'createdAt',         fallback: () => Date.now() },
      { entity: 'updatedAt',         col: 'updated_at',            server: 'updatedAt',         fallback: () => Date.now() },
      { entity: 'deleted',           col: 'deleted',               type: 'bool' },
    ],
  },

  trailNote: {
    sqlite: { table: 'trail_notes', pk: 'id' },
    pocketbase: { collection: 'trail_notes', serverIdField: 'note_id' },
    fields: [
      { entity: 'id',              col: 'id',               server: 'id',              fallback: null },
      { entity: 'trailId',         col: 'trail_id',         server: 'trailId' },
      { entity: 'content',         col: 'content',          server: 'content',         fallback: '' },
      { entity: 'tags',            col: 'tags',             server: 'tags',            type: 'json' },
      { entity: 'mood',            col: 'mood',             server: 'mood',            fallback: null },
      { entity: 'source',          col: 'source',           server: 'source',          fallback: 'free' },
      { entity: 'guidedQuestion',  col: 'guided_question',  server: 'guidedQuestion',  fallback: null },
      { entity: 'order',           col: 'note_order',       server: 'order',           type: 'num', fallback: 0 },
      { entity: 'createdAt',       col: 'created_at',       server: 'createdAt',       fallback: () => Date.now() },
      { entity: 'updatedAt',       col: 'updated_at',       server: 'updatedAt',       fallback: () => Date.now() },
      { entity: 'deleted',         col: 'deleted',          type: 'bool' },
    ],
  },

  reflectionLink: {
    sqlite: { table: 'reflection_links', pk: 'link_id' },
    pocketbase: { collection: 'reflection_links', serverIdField: 'link_id' },
    customToRow: (d) => ({
      link_id: d.id, from_id: d.fromId, to_id: d.toId,
      link_type: d.type, note: d.note ?? null,
      created_at: d.createdAt ?? Date.now(),
      updated_at: d.updatedAt ?? Date.now(), deleted: bool(d.deleted),
    }),
    customServerPayloadToRow: (r) => ({
      link_id: r.linkId ?? r.link_id ?? r.id, from_id: r.fromId ?? '', to_id: r.toId ?? '',
      link_type: r.type ?? '', note: r.note ?? null,
      created_at: r.createdAt ?? Date.now(),
      updated_at: r.updatedAt ?? Date.now(), deleted: 0,
    }),
    customRowToEntity: (r) => ({
      id: r.link_id, fromId: r.from_id, toId: r.to_id,
      type: r.link_type, note: r.note ?? undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at, deleted: boolRead(r.deleted),
    }),
    fields: [],
  },

  aiConfig: {
    sqlite: { table: 'ai_configs', pk: 'config_id' },
    pocketbase: { collection: 'ai_configs', serverIdField: 'config_id' },
    customToRow: (d) => ({
      config_id: d.config_id ?? 'self',
      mode: d.mode ?? 'hybrid',
      models: json(d.models),
      local_engine_enabled: bool(d.localEngineEnabled ?? true),
      updated_at: d.updatedAt ?? Date.now(), deleted: bool(d.deleted),
    }),
    customServerPayloadToRow: (r) => ({
      config_id: r.configId ?? r.config_id ?? r.id ?? 'self',
      mode: r.mode ?? 'hybrid',
      models: typeof r.models === 'string' ? r.models : JSON.stringify(r.models ?? []),
      local_engine_enabled: bool(r.localEngineEnabled ?? true),
      updated_at: r.updatedAt ?? Date.now(), deleted: 0,
    }),
    customRowToEntity: (r) => ({
      config_id: r.config_id || 'self',
      mode: r.mode || 'hybrid',
      models: parseJson(r.models, []),
      localEngineEnabled: boolRead(r.local_engine_enabled ?? 1),
      updatedAt: r.updated_at, deleted: boolRead(r.deleted),
    }),
    fields: [],
  },

  checkinReview: {
    sqlite: { table: 'checkin_reviews', pk: 'id' },
    pocketbase: { collection: 'checkin_reviews', serverIdField: 'review_id' },
    customToRow: (d) => ({
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
        aiModel: d.aiModel,
        lastAutoUpdateAt: d.lastAutoUpdateAt,
      }),
      updated_at: d.updatedAt ?? Date.now(), deleted: bool(d.deleted),
    }),
    customServerPayloadToRow: (r) => ({
      id: r.id, review_id: r.reviewId ?? r.id,
      user_id: r.userId ?? 'self',
      period: r.period ?? 'week',
      start_date: r.startDate ?? '', end_date: r.endDate ?? '',
      review_data: typeof r.reviewData === 'string' ? r.reviewData : JSON.stringify(r.reviewData ?? {}),
      updated_at: r.updatedAt ?? Date.now(), deleted: 0,
    }),
    customRowToEntity: (r) => {
      const rd = parseJson<Record<string, unknown>>(r.review_data, {});
      return {
        id: r.id,
        userId: r.user_id ?? 'self',
        period: r.period ?? 'week',
        startDate: r.start_date,
        endDate: r.end_date,
        completionRate: rd.completionRate,
        doneDays: rd.doneDays,
        totalDays: rd.totalDays,
        streakDays: rd.streakDays,
        longestStreak: rd.longestStreak,
        incompleteReasons: rd.incompleteReasons,
        incompleteItems: rd.incompleteItems,
        habitProgress: rd.habitProgress,
        planProgress: rd.planProgress,
        metrics: rd.metrics,
        comparison: rd.comparison,
        aiSummary: rd.aiSummary,
        highlights: rd.highlights,
        improvements: rd.improvements,
        generatedAt: rd.generatedAt,
        aiModel: rd.aiModel,
        lastAutoUpdateAt: rd.lastAutoUpdateAt,
        updatedAt: r.updated_at, deleted: boolRead(r.deleted),
      };
    },
    fields: [],
  },

  bodyGoal: {
    sqlite: { table: 'body_goals', pk: 'id' },
    pocketbase: { collection: 'body_goals', serverIdField: 'goal_id' },
    fields: [
      { entity: 'id',           col: 'id',            server: 'id',           fallback: null },
      { entity: 'targetWeight', col: 'target_weight',  server: 'targetWeight', type: 'num', optional: true },
      { entity: 'targetBodyFat',col: 'target_body_fat',server: 'targetBodyFat',type: 'num', optional: true },
      { entity: 'targetDate',   col: 'target_date',    server: 'targetDate',   fallback: '', optional: true },
      { entity: 'strategy',     col: 'strategy',       server: 'strategy',     fallback: '', optional: true },
      { entity: 'note',         col: 'note',           server: 'note',         fallback: '', optional: true },
      { entity: 'updatedAt',    col: 'updated_at',     server: 'updatedAt',    fallback: () => Date.now() },
      { entity: 'deleted',      col: 'deleted',        type: 'bool' },
    ],
  },

  bodyPlan: {
    sqlite: { table: 'body_plans', pk: 'id' },
    pocketbase: { collection: 'body_plans', serverIdField: 'plan_id' },
    fields: [
      { entity: 'id',        col: 'id',         server: 'id',        fallback: null },
      { entity: 'goalId',    col: 'goal_id',    server: 'goalId',    fallback: '', optional: true },
      { entity: 'weekday',   col: 'weekday',    server: 'weekday',   type: 'num' },
      { entity: 'part',      col: 'part',       server: 'part',      fallback: '' },
      { entity: 'sportKey',  col: 'sport_key',  server: 'sportKey',  fallback: '', optional: true },
      { entity: 'note',      col: 'note',       server: 'note',      fallback: '', optional: true },
      { entity: 'updatedAt', col: 'updated_at', server: 'updatedAt', fallback: () => Date.now() },
      { entity: 'deleted',   col: 'deleted',    type: 'bool' },
    ],
  },

  weightRecord: {
    sqlite: { table: 'body_weight_records', pk: 'id' },
    pocketbase: { collection: 'weight_records', serverIdField: 'weight_id' },
    fields: [
      { entity: 'id',        col: 'id',         server: 'id',        fallback: null },
      { entity: 'date',      col: 'date',       server: 'date',      fallback: '' },
      { entity: 'weight',    col: 'weight',     server: 'weight',    type: 'num' },
      { entity: 'bodyFat',   col: 'body_fat',   server: 'bodyFat',   type: 'num', optional: true },
      { entity: 'updatedAt', col: 'updated_at', server: 'updatedAt', fallback: () => Date.now() },
      { entity: 'deleted',   col: 'deleted',    type: 'bool' },
    ],
  },

  bodyCheckin: {
    sqlite: { table: 'body_checkins', pk: 'id' },
    pocketbase: { collection: 'body_checkins', serverIdField: 'checkin_id' },
    fields: [
      { entity: 'id',        col: 'id',         server: 'id',        fallback: null },
      { entity: 'date',      col: 'date',       server: 'date',      fallback: '' },
      { entity: 'energy',    col: 'energy',     server: 'energy',    type: 'num' },
      { entity: 'pain',      col: 'pain',       server: 'pain',      type: 'num' },
      { entity: 'comfort',   col: 'comfort',    server: 'comfort',   type: 'num' },
      { entity: 'sleep',     col: 'sleep',      server: 'sleep',     type: 'num' },
      { entity: 'tags',      col: 'tags',       server: 'tags',      type: 'json' },
      { entity: 'note',      col: 'note',       server: 'note',      fallback: '' },
      { entity: 'updatedAt', col: 'updated_at', server: 'updatedAt', fallback: () => Date.now() },
      { entity: 'deleted',   col: 'deleted',    type: 'bool' },
    ],
  },


  breath: {
    sqlite: { table: 'breath_records', pk: 'id' },
    pocketbase: { collection: 'breath_records', serverIdField: 'breath_id' },
    fields: [
      { entity: 'id',           col: 'id',             server: 'id',           fallback: null },
      { entity: 'date',         col: 'date',           server: 'date',         fallback: '' },
      { entity: 'presetKey',    col: 'preset_key',     server: 'presetKey',    fallback: '' },
      { entity: 'durationSec',  col: 'duration_sec',   server: 'durationSec',  type: 'num' },
      { entity: 'cycles',       col: 'cycles',         server: 'cycles',       type: 'num' },
      { entity: 'preDistress',  col: 'pre_distress',   server: 'preDistress',  type: 'num' },
      { entity: 'postDistress', col: 'post_distress',  server: 'postDistress', type: 'num' },
      { entity: 'reflection',   col: 'reflection',     server: 'reflection',   fallback: '' },
      { entity: 'guideStyle',   col: 'guide_style',    server: 'guideStyle',   fallback: 'scientific' },
      { entity: 'updatedAt',    col: 'updated_at',     server: 'updatedAt',    fallback: () => Date.now() },
      { entity: 'deleted',      col: 'deleted',        type: 'bool' },
    ],
  },


  sleep: {
    sqlite: { table: 'sleep_records', pk: 'id' },
    pocketbase: { collection: 'sleep_records', serverIdField: 'sleep_id' },
    customToRow: (d) => ({
      id: d.id,
      date: d.date ?? '',
      bedtime_at: d.bedtimeAt ?? null,
      wake_at: d.wakeAt ?? null,
      duration_min: d.durationMin ?? null,
      quality: d.quality ?? null,
      barrier_done: d.barrierDone ? 1 : 0,
      barrier_min: d.barrierMin ?? null,
      away_min: d.awayMin ?? null,
      practice: json(d.practice),
      work_state: d.workState ?? null,
      body_state: json(d.bodyState),
      mind_state: json(d.mindState),
      gratitude: json(d.gratitude),
      note: d.note ?? null,
      updated_at: d.updatedAt ?? Date.now(),
      deleted: bool(d.deleted),
    }),
    customServerPayloadToRow: (r) => ({
      id: r.id,
      date: r.date ?? '',
      bedtime_at: r.bedtimeAt ?? null,
      wake_at: r.wakeAt ?? null,
      duration_min: r.durationMin ?? null,
      quality: r.quality ?? null,
      barrier_done: r.barrierDone ? 1 : 0,
      barrier_min: r.barrierMin ?? null,
      away_min: r.awayMin ?? null,
      practice: typeof r.practice === 'string' ? r.practice : JSON.stringify(r.practice ?? []),
      work_state: r.workState ?? null,
      body_state: typeof r.bodyState === 'string' ? r.bodyState : JSON.stringify(r.bodyState ?? []),
      mind_state: typeof r.mindState === 'string' ? r.mindState : JSON.stringify(r.mindState ?? []),
      gratitude: typeof r.gratitude === 'string' ? r.gratitude : JSON.stringify(r.gratitude ?? []),
      note: r.note ?? null,
      updated_at: r.updatedAt ?? Date.now(),
      deleted: 0,
    }),
    customRowToEntity: (r) => ({
      id: r.id,
      date: r.date,
      bedtimeAt: r.bedtime_at,
      wakeAt: r.wake_at,
      durationMin: r.duration_min,
      quality: r.quality,
      barrierDone: boolRead(r.barrier_done),
      barrierMin: r.barrier_min,
      awayMin: r.away_min,
      practice: parseJson(r.practice, []),
      workState: r.work_state,
      bodyState: parseJson(r.body_state, []),
      mindState: parseJson(r.mind_state, []),
      gratitude: parseJson(r.gratitude, []),
      note: r.note,
      updatedAt: r.updated_at,
      deleted: boolRead(r.deleted),
    }),
    fields: [],
  },

  give: {
    sqlite: { table: 'give_entries', pk: 'id' },
    pocketbase: { collection: 'give_entries', serverIdField: 'give_id' },
    customToRow: (d) => ({
      id: d.id,
      ts: d.timestamp ?? Date.now(),
      give_type: d.type ?? 'material',
      content: d.content ?? '',
      motivation: d.motivation ?? null,
      anonymous: d.anonymous ? 1 : 0,
      amount: d.amount ?? null,
      reflection_id: d.reflectionId ?? null,
      updated_at: d.updatedAt ?? Date.now(),
      deleted: bool(d.deleted),
    }),
    customServerPayloadToRow: (r) => ({
      id: r.id,
      ts: r.timestamp ?? Date.now(),
      give_type: r.type ?? 'material',
      content: r.content ?? '',
      motivation: r.motivation ?? null,
      anonymous: r.anonymous ? 1 : 0,
      amount: r.amount ?? null,
      reflection_id: r.reflectionId ?? null,
      updated_at: r.updatedAt ?? Date.now(),
      deleted: 0,
    }),
    customRowToEntity: (r) => ({
      id: r.id,
      timestamp: r.ts,
      type: r.give_type,
      content: r.content,
      motivation: r.motivation,
      anonymous: boolRead(r.anonymous),
      amount: r.amount,
      reflectionId: r.reflection_id,
      updatedAt: r.updated_at,
      deleted: boolRead(r.deleted),
    }),
    fields: [],
  },

  motivationEntry: {
    sqlite: { table: 'eating_motivations', pk: 'id' },
    pocketbase: { collection: 'eating_motivations', serverIdField: 'motivation_id' },
    fields: [
      { entity: 'id',           col: 'id',            server: 'id',           fallback: null },
      { entity: 'foodId',       col: 'food_id',       server: 'foodId',       fallback: '' },
      { entity: 'date',         col: 'date',          server: 'date',         fallback: '' },
      { entity: 'motivation',   col: 'motivation',    server: 'motivation',   fallback: 'hunger' },
      { entity: 'hungerLevel',  col: 'hunger_level',  server: 'hungerLevel',  type: 'num', optional: true },
      { entity: 'updatedAt',    col: 'updated_at',    server: 'updatedAt',    fallback: () => Date.now() },
      { entity: 'deleted',      col: 'deleted',       type: 'bool' },
    ],
  },

  customWuxing: {
    sqlite: { table: 'custom_wuxing_maps', pk: 'id' },
    pocketbase: { collection: 'custom_wuxing_maps', serverIdField: 'wuxing_id' },
    fields: [
      { entity: 'id',        col: 'id',         server: 'id',        fallback: null },
      { entity: 'foodName',  col: 'food_name',  server: 'foodName',  fallback: '' },
      { entity: 'flavor',    col: 'flavor',     server: 'flavor',    fallback: 'sweet' },
      { entity: 'element',   col: 'element',    server: 'element',   fallback: 'earth' },
      { entity: 'updatedAt', col: 'updated_at', server: 'updatedAt', fallback: () => Date.now() },
      { entity: 'deleted',   col: 'deleted',    type: 'bool' },
    ],
  },

  vision: {
    sqlite: { table: 'visions', pk: 'id' },
    pocketbase: { collection: 'visions', serverIdField: 'vision_id' },
    fields: [
      { entity: 'id',         col: 'id',          server: 'id',         fallback: null },
      { entity: 'type',       col: 'type',        server: 'type',       fallback: '' },
      { entity: 'text',       col: 'text',        server: 'text',       fallback: '' },
      { entity: 'startDate',   col: 'start_date',   server: 'startDate',   fallback: '', optional: true },
      { entity: 'timeFrame',  col: 'time_frame',  server: 'timeFrame',  fallback: '', optional: true },
      { entity: 'deadline',   col: 'deadline',     server: 'deadline',   fallback: '', optional: true },
      { entity: 'status',     col: 'status',       server: 'status',     fallback: 'active' },
      { entity: 'achievedAt', col: 'achieved_at',  server: 'achievedAt', type: 'num', optional: true },
      { entity: 'sortOrder',  col: 'sort_order',   server: 'sortOrder',  type: 'num' },
      { entity: 'updatedAt',  col: 'updated_at',   server: 'updatedAt',  fallback: () => Date.now() },
      { entity: 'deleted',    col: 'deleted',      type: 'bool' },
    ],
  },

  visionPractice: {
    sqlite: { table: 'vision_practices', pk: 'id' },
    pocketbase: { collection: 'vision_practices', serverIdField: 'practice_id' },
    fields: [
      { entity: 'id',        col: 'id',         server: 'id',        fallback: null },
      { entity: 'visionId',  col: 'vision_id',  server: 'visionId',  fallback: '' },
      { entity: 'refType',   col: 'ref_type',   server: 'refType',   fallback: '' },
      { entity: 'refId',     col: 'ref_id',     server: 'refId',     fallback: '' },
      { entity: 'updatedAt', col: 'updated_at', server: 'updatedAt', fallback: () => Date.now() },
      { entity: 'deleted',   col: 'deleted',    type: 'bool' },
    ],
  },

  dedication: {
    sqlite: { table: 'dedications', pk: 'id' },
    pocketbase: { collection: 'dedications', serverIdField: 'dedication_id' },
    fields: [
      { entity: 'id',             col: 'id',              server: 'id',             fallback: null },
      { entity: 'date',           col: 'date',            server: 'date',           fallback: '' },
      { entity: 'periodLabel',    col: 'period_label',    server: 'periodLabel',    fallback: '' },
      { entity: 'type',           col: 'type',            server: 'type',           fallback: 'weekly' },
      { entity: 'practiceDays',   col: 'practice_days',   server: 'practiceDays',   type: 'num' },
      { entity: 'totalDays',      col: 'total_days',      server: 'totalDays',      type: 'num' },
      { entity: 'habitStats',     col: 'habit_stats',     server: 'habitStats',     type: 'json' },
      { entity: 'planProgress',   col: 'plan_progress',   server: 'planProgress',   type: 'json', optional: true },
      { entity: 'visionProgress', col: 'vision_progress',  server: 'visionProgress', type: 'json', optional: true },
      { entity: 'insight',        col: 'insight',         server: 'insight',        fallback: '', optional: true },
      { entity: 'adjustment',     col: 'adjustment',      server: 'adjustment',     fallback: '', optional: true },
      { entity: 'updatedAt',      col: 'updated_at',      server: 'updatedAt',      fallback: () => Date.now() },
      { entity: 'deleted',        col: 'deleted',         type: 'bool' },
    ],
  },

  fearEntry: {
    sqlite: { table: 'fear_entries', pk: 'id' },
    pocketbase: { collection: 'fear_entries', serverIdField: 'fear_id' },
    customToRow: (d) => ({
      id: d.id, date: d.date ?? '', timestamp: d.timestamp ?? 0,
      content: d.content ?? '', trigger_context: d.trigger ?? '', category: d.category ?? 'unknown',
      classification: d.classification ?? 'mixed',
      classification_answers: typeof d.classificationAnswers === 'string' ? d.classificationAnswers : JSON.stringify(d.classificationAnswers ?? {}),
      worst_outcome: d.worstOutcome ?? '', probability: d.probability ?? null,
      coping_ability: d.copingAbility ?? null, fear_index: d.fearIndex ?? null,
      body_locations: typeof d.bodyLocations === 'string' ? d.bodyLocations : JSON.stringify(d.bodyLocations ?? []),
      occurrence_count: d.occurrenceCount ?? 1,
      updated_at: d.updatedAt ?? Date.now(), deleted: d.deleted ? 1 : 0,
    }),
    customServerPayloadToRow: (r) => ({
      id: r.id, date: r.date ?? '', timestamp: r.timestamp ?? 0,
      content: r.content ?? '', trigger_context: r.trigger ?? '', category: r.category ?? 'unknown',
      classification: r.classification ?? 'mixed',
      classification_answers: typeof r.classificationAnswers === 'string' ? r.classificationAnswers : JSON.stringify(r.classificationAnswers ?? {}),
      worst_outcome: r.worstOutcome ?? '', probability: r.probability ?? null,
      coping_ability: r.copingAbility ?? null, fear_index: r.fearIndex ?? null,
      body_locations: typeof r.bodyLocations === 'string' ? r.bodyLocations : JSON.stringify(r.bodyLocations ?? []),
      occurrence_count: r.occurrenceCount ?? 1,
      updated_at: r.updatedAt ?? Date.now(), deleted: 0,
    }),
    customRowToEntity: (r) => ({
      id: r.id, date: r.date, timestamp: r.timestamp, content: r.content,
      trigger: r.trigger_context, category: r.category, classification: r.classification,
      classificationAnswers: parseJson(r.classification_answers, {}),
      worstOutcome: r.worst_outcome, probability: r.probability, copingAbility: r.coping_ability,
      fearIndex: r.fear_index,
      bodyLocations: parseJson(r.body_locations, []),
      occurrenceCount: r.occurrence_count ?? 1,
      updatedAt: r.updated_at, deleted: boolRead(r.deleted),
    }),
    fields: [],
  },

  courageEntry: {
    sqlite: { table: 'courage_entries', pk: 'id' },
    pocketbase: { collection: 'courage_entries', serverIdField: 'courage_id' },
    customToRow: (d) => ({
      id: d.id, date: d.date ?? '', timestamp: d.timestamp ?? 0,
      fear_id: d.fearId ?? '', action: d.action ?? '',
      fear_before: d.fearBefore ?? 0, feeling: d.feeling ?? '',
      feeling_tags: typeof d.feelingTags === 'string' ? d.feelingTags : JSON.stringify(d.feelingTags ?? []),
      streak: d.streak ?? 0,
      updated_at: d.updatedAt ?? Date.now(), deleted: d.deleted ? 1 : 0,
    }),
    customServerPayloadToRow: (r) => ({
      id: r.id, date: r.date ?? '', timestamp: r.timestamp ?? 0,
      fear_id: r.fearId ?? '', action: r.action ?? '',
      fear_before: r.fearBefore ?? 0, feeling: r.feeling ?? '',
      feeling_tags: typeof r.feelingTags === 'string' ? r.feelingTags : JSON.stringify(r.feelingTags ?? []),
      streak: r.streak ?? 0,
      updated_at: r.updatedAt ?? Date.now(), deleted: 0,
    }),
    customRowToEntity: (r) => ({
      id: r.id, date: r.date, timestamp: r.timestamp, fearId: r.fear_id || undefined,
      action: r.action, fearBefore: r.fear_before, feeling: r.feeling || undefined,
      feelingTags: parseJson(r.feeling_tags, []),
      streak: r.streak ?? 0,
      updatedAt: r.updated_at, deleted: boolRead(r.deleted),
    }),
    fields: [],
  },

  fearAchievement: {
    sqlite: { table: 'fear_achievements', pk: 'id' },
    pocketbase: { collection: 'fear_achievements', serverIdField: 'achievement_id' },
    fields: [
      { entity: 'id',         col: 'id',          server: 'id',         fallback: null },
      { entity: 'type',       col: 'type',        server: 'type',       fallback: 'brave' },
      { entity: 'unlockedAt', col: 'unlocked_at', server: 'unlockedAt', type: 'num' },
      { entity: 'updatedAt',  col: 'updated_at',  server: 'updatedAt',  fallback: () => Date.now() },
      { entity: 'deleted',    col: 'deleted',      type: 'bool' },
    ],
  },

  mantraDef: {
    sqlite: { table: 'mantra_defs', pk: 'id' },
    pocketbase: { collection: 'mantra_defs', serverIdField: 'mantra_id' },
    fields: [
      { entity: 'id',          col: 'id',          server: 'id',          fallback: null },
      { entity: 'name',        col: 'name',        server: 'name',        fallback: '' },
      { entity: 'subtitle',    col: 'subtitle',    server: 'subtitle',    fallback: '', optional: true },
      { entity: 'category',    col: 'category',    server: 'category',    fallback: 'custom' },
      { entity: 'sortOrder',   col: 'sort_order',  server: 'sortOrder',   type: 'num' },
      { entity: 'preset',      col: 'preset',      server: 'preset',      type: 'bool', optional: true },
      { entity: 'targetCount',    col: 'target_count',     server: 'targetCount',     type: 'num', optional: true },
      { entity: 'pronunciation',  col: 'pronunciation',    server: 'pronunciation',   fallback: '', optional: true },
      { entity: 'meaning',        col: 'meaning',          server: 'meaning',         fallback: '', optional: true },
      { entity: 'fullText',       col: 'full_text',        server: 'fullText',        fallback: '', optional: true },
      { entity: 'pageCount',      col: 'page_count',       server: 'pageCount',       type: 'num', optional: true },
      { entity: 'audioUrl',       col: 'audio_url',        server: 'audioUrl',        fallback: '', optional: true },
      { entity: 'audioAttribution', col: 'audio_attribution', server: 'audioAttribution', fallback: '', optional: true },
      { entity: 'updatedAt',      col: 'updated_at',       server: 'updatedAt',       fallback: () => Date.now() },
      { entity: 'deleted',     col: 'deleted',      type: 'bool' },
    ],
  },

  mantraSession: {
    sqlite: { table: 'mantra_sessions', pk: 'id' },
    pocketbase: { collection: 'mantra_sessions', serverIdField: 'session_id' },
    fields: [
      { entity: 'id',           col: 'id',           server: 'id',           fallback: null },
      { entity: 'mantraId',     col: 'mantra_id',    server: 'mantraId',     fallback: '' },
      { entity: 'date',         col: 'date',         server: 'date',         fallback: '' },
      { entity: 'count',        col: 'count',        server: 'count',        type: 'num' },
      { entity: 'rounds',       col: 'rounds',       server: 'rounds',       type: 'num' },
      { entity: 'durationSec',  col: 'duration_sec', server: 'durationSec',  type: 'num' },
      { entity: 'startedAt',    col: 'started_at',   server: 'startedAt',    type: 'num' },
      { entity: 'completedAt',  col: 'completed_at', server: 'completedAt',  type: 'num' },
      { entity: 'targetRounds', col: 'target_rounds', server: 'targetRounds', type: 'num', optional: true },
      { entity: 'dedication',   col: 'dedication',   server: 'dedication',   fallback: '', optional: true },
      { entity: 'updatedAt',    col: 'updated_at',   server: 'updatedAt',    fallback: () => Date.now() },
      { entity: 'deleted',      col: 'deleted',       type: 'bool' },
    ],
  },

  sutraReading: {
    sqlite: { table: 'sutra_reading_sessions', pk: 'id' },
    pocketbase: { collection: 'sutra_reading_sessions', serverIdField: 'reading_id' },
    fields: [
      { entity: 'id',          col: 'id',           server: 'id',          fallback: null },
      { entity: 'mantraId',    col: 'mantra_id',    server: 'mantraId',    fallback: '' },
      { entity: 'date',        col: 'date',         server: 'date',        fallback: '' },
      { entity: 'pagesRead',   col: 'pages_read',   server: 'pagesRead',   type: 'num' },
      { entity: 'durationSec', col: 'duration_sec', server: 'durationSec', type: 'num' },
      { entity: 'completed',   col: 'completed',    server: 'completed',   type: 'bool' },
      { entity: 'updatedAt',   col: 'updated_at',   server: 'updatedAt',   fallback: () => Date.now() },
      { entity: 'deleted',     col: 'deleted',       type: 'bool' },
    ],
  },

  zhiguanSession: {
    sqlite: { table: 'zhiguan_sessions', pk: 'id' },
    pocketbase: { collection: 'zhiguan_sessions', serverIdField: 'zhiguan_id' },
    fields: [
      { entity: 'id',              col: 'id',                server: 'id',              fallback: null },
      { entity: 'userId',          col: 'user_id',           server: 'userId',          fallback: '' },
      { entity: 'status',          col: 'status',            server: 'status',          fallback: 'completed' },
      { entity: 'startTs',         col: 'start_ts',          server: 'startTs',         type: 'num' },
      { entity: 'endTs',           col: 'end_ts',            server: 'endTs',           type: 'num' },
      { entity: 'sankalpa',        col: 'sankalpa',          server: 'sankalpa',        fallback: '' },
      { entity: 'preliminaryLevel', col: 'preliminary_level', server: 'preliminaryLevel', fallback: 'recommended' },
      { entity: 'chosenMethod',    col: 'chosen_method',     server: 'chosenMethod',    fallback: 'anapanasati' },
      { entity: 'samathaRatioAvg', col: 'samatha_ratio_avg', server: 'samathaRatioAvg', type: 'num' },
      { entity: 'vipassanaRatioAvg', col: 'vipassana_ratio_avg', server: 'vipassanaRatioAvg', type: 'num' },
      { entity: 'totalBreaths',    col: 'total_breaths',     server: 'totalBreaths',    type: 'num' },
      { entity: 'closingNotes',    col: 'closing_notes',      server: 'closingNotes',    fallback: '' },
      { entity: 'selfReportedStage', col: 'self_reported_stage', server: 'selfReportedStage', fallback: '' },
      { entity: 'selfReportedStageText', col: 'self_reported_stage_text', server: 'selfReportedStageText', fallback: '' },
      { entity: 'dedicationId',    col: 'dedication_id',      server: 'dedicationId',    fallback: '' },
      { entity: 'fiveHindrances',  col: 'five_hindrances',    server: 'fiveHindrances',  type: 'json', fallback: '{}', optional: true },
      { entity: 'eightTactile',    col: 'eight_tactile',      server: 'eightTactile',    type: 'json', fallback: '{}', optional: true },
      { entity: 'meta',            col: 'meta',               server: 'meta',            type: 'json', fallback: '{}', optional: true },
      { entity: 'updatedAt',       col: 'updated_at',         server: 'updatedAt',       fallback: () => Date.now() },
      { entity: 'deleted',         col: 'deleted',             type: 'bool' },
    ],
  },
};

// ── Derived exports (replace standalone declarations) ───────────

/** ENTITY_REGISTRY replacement — derived from SCHEMAS */
export const SCHEMA_REGISTRY: Record<SyncEntity, EntityMeta> = Object.fromEntries(
  (Object.keys(SCHEMAS) as SyncEntity[]).map(k => [k, schemaToEntityMeta(SCHEMAS[k])])
) as Record<SyncEntity, EntityMeta>;

/** ENTITY_COLLECTION replacement */
export const SCHEMA_COLLECTION: Record<SyncEntity, string> = Object.fromEntries(
  (Object.keys(SCHEMAS) as SyncEntity[]).map(k => [k, SCHEMAS[k].pocketbase.collection])
) as Record<SyncEntity, string>;

/** ENTITY_ID_FIELD replacement */
export const SCHEMA_ID_FIELD: Record<SyncEntity, string> = Object.fromEntries(
  (Object.keys(SCHEMAS) as SyncEntity[]).map(k => [k, SCHEMAS[k].pocketbase.serverIdField])
) as Record<SyncEntity, string>;

/** All SQLite entity table names — derived from SCHEMAS. Used by SyncEngine for purge/reset. */
export const ALL_ENTITY_TABLES: string[] = (Object.keys(SCHEMAS) as SyncEntity[]).map(k => SCHEMAS[k].sqlite.table);
