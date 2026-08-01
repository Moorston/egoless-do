// ─── Sync API (replaces PB hooks that aren't loading in v0.38.x) ───
// POST /api/sync - Combined push + pull
// POST /api/sync/pull - Pull only
// POST /api/sync/push - Push only
// GET  /api/sync/check - Lightweight change detection
import { Hono } from 'hono';
import { verifyAuth } from './auth-middleware.js';
import { getPb, getAdminPb, escapeFilter } from './pb.js';
import { errStatus } from './errors.js';

const app = new Hono();

// Entity config
const ENTITY_COLL_MAP: Record<string, string> = {
  habit: 'habits', reflection: 'reflections', fasting: 'fasting_sessions',
  food: 'food_entries', checkin: 'checkin_records', meditation: 'meditation_history',
  profile: 'user_profiles', exercise: 'exercise_entries', plan: 'plans',
  planItem: 'plan_items', planItemCheckin: 'plan_item_checkins',
  dailyCustomTodo: 'daily_custom_todos', dailyTodoHistory: 'daily_todo_history',
  grace: 'grace_history', thoughtTrail: 'thought_trails', trailNote: 'trail_notes',
  reflectionLink: 'reflection_links', aiConfig: 'ai_configs',
  checkinReview: 'checkin_reviews', motivationEntry: 'eating_motivations',
  customWuxing: 'custom_wuxing_maps', foodPreset: 'custom_food_presets',
  fearEntry: 'fear_entries', courageEntry: 'courage_entries',
  fearAchievement: 'fear_achievements', sutraReading: 'sutra_reading_sessions',
  sleep: 'sleep_records', give: 'give_entries', bodyGoal: 'body_goals',
  bodyPlan: 'body_plans', bodyTrainingPlan: 'body_plans',
  weightRecord: 'weight_records', bodyCheckin: 'body_checkins',
  vision: 'visions', visionPractice: 'vision_practices',
  dedication: 'dedications', mantraDef: 'mantra_defs',
  mantraSession: 'mantra_sessions', zhiguanSession: 'zhiguan_sessions',
  breath: 'breath_records',
};

const ENTITY_ID_FIELD_MAP: Record<string, string> = {
  habit: 'habit_id', reflection: 'reflection_id', fasting: 'session_id',
  food: 'food_id', checkin: 'date', meditation: 'date', profile: 'profile_id',
  exercise: 'exercise_id', plan: 'plan_id', planItem: 'plan_item_id',
  planItemCheckin: 'checkin_id', dailyCustomTodo: 'todo_id',
  dailyTodoHistory: 'history_id', grace: 'date', thoughtTrail: 'trail_id',
  trailNote: 'note_id', reflectionLink: 'link_id', aiConfig: 'config_id',
  checkinReview: 'review_id', motivationEntry: 'motivation_id',
  customWuxing: 'wuxing_id', foodPreset: 'preset_id', fearEntry: 'fear_id',
  courageEntry: 'courage_id', fearAchievement: 'achievement_id',
  sutraReading: 'reading_id', sleep: 'sleep_id', give: 'give_id',
  bodyGoal: 'goal_id', bodyPlan: 'plan_id', bodyTrainingPlan: 'plan_id',
  weightRecord: 'weight_id', bodyCheckin: 'checkin_id', vision: 'vision_id',
  visionPractice: 'practice_id', dedication: 'dedication_id',
  mantraDef: 'mantra_id', mantraSession: 'session_id',
  zhiguanSession: 'zhiguan_id', breath: 'breath_id',
};

const ENTITY_LIST = Object.keys(ENTITY_COLL_MAP);
const ENTITY_TYPE_MAP: Record<string, string> = {
  bodyPlan: 'weekly', bodyTrainingPlan: 'training',
};

/** Parse the `data` JSON field from a PB record */
function parseDataField(d: unknown): Record<string, unknown> | null {
  if (d && typeof d === 'object' && !Array.isArray(d)) return d as Record<string, unknown>;
  if (typeof d === 'string') { try { return JSON.parse(d); } catch { return null; } }
  return null;
}

/** Build a user-scoped filter string */
function buildUserFilter(userId: string, sinceDate?: string): string {
  // Note: updated_at filter removed due to PB date filter 400 errors
  return `user_id = '${escapeFilter(userId)}'`;
}

/** Export a PB record to the client format (merge data JSON into top-level) */
function exportRecord(rec: Record<string, unknown>): Record<string, unknown> {
  const exported: Record<string, unknown> = { ...rec };
  const dd = parseDataField(rec.data);
  if (dd && typeof dd === 'object') {
    for (const [k, v] of Object.entries(dd)) {
      if (!['id', 'created', 'updated', 'user_id'].includes(k)) {
        exported[k] = v;
      }
    }
    if (dd.id !== undefined) exported.id = dd.id;
    if (dd.updatedAt !== undefined) exported.updatedAt = dd.updatedAt;
    exported.deleted = !!dd.deleted;
  } else {
    exported.deleted = false;
  }
  // Only use server updated_at if data.updatedAt is not set (preserve client time)
  if (exported.updated_at && exported.updatedAt === undefined) {
    exported.updatedAt = new Date(exported.updated_at as string).getTime();
  }
  // Remove server-side updated_at to avoid confusion
  delete exported.updated_at;
  delete exported.data;
  // Remove function fields
  for (const k of Object.keys(exported)) {
    if (typeof exported[k] === 'function') delete exported[k];
  }
  return exported;
}

// ── POST /api/sync/push ──────────────────────────────────────────
app.post('/sync/push', async (c) => {
  try {
    const authHeader = c.req.header('authorization') || null;
    const auth = await verifyAuth(authHeader);
    if (!auth) return c.json({ code: 'UNAUTHORIZED', message: 'Unauthorized' }, 401);
    const userId = auth.userId;
    const body: { changes?: Array<{ entity: string; entityId: string; operation: string; payload?: Record<string, unknown>; _changedFields?: string[] }> } = await c.req.json();
    const changes = body.changes || [];
    const pb = await getAdminPb();
    const applied: Array<{ entity: string; entityId: string; operation: string }> = [];
    const rejected: Array<{ entity: string; entityId: string; error: string; serverData?: Record<string, unknown> }> = [];

    for (const change of changes) {
      const { entity, entityId, operation } = change;
      const coll = ENTITY_COLL_MAP[entity];
      const idField = ENTITY_ID_FIELD_MAP[entity];
      if (!coll || !idField) { rejected.push({ entity, entityId, error: 'Unknown entity' }); continue; }
      if (!entityId || typeof entityId !== 'string') { rejected.push({ entity, entityId, error: 'Invalid entityId' }); continue; }

      try {
        // Build filter
        const filter = `${idField} = '${escapeFilter(entityId)}' && user_id = '${escapeFilter(userId)}'`;
        const records = await pb.collection(coll).getList(1, 1, { filter });

        if (operation === 'delete') {
          if (records.items.length > 0) {
            for (const rec of records.items) {
              const curObj = parseDataField(rec.data) || {};
              curObj.deleted = true;
              curObj.updatedAt = Date.now();
              await pb.collection(coll).update(rec.id, { data: JSON.stringify(curObj), deleted: true });
            }
          }
          applied.push({ entity, entityId, operation: 'delete' });
        } else {
          // Upsert: always search by user_id first (handles unique constraints)
          let rec = records.items[0];
          const userRecords = await pb.collection(coll).getList(1, 5, { filter: `user_id = '${escapeFilter(userId)}'` });
          if (!rec && userRecords.items.length > 0) {
            rec = userRecords.items.find(r => (r as Record<string, unknown>)[idField] === entityId) || userRecords.items[0];
          }
          if (rec) {
            const existD = parseDataField(rec.data) || {};
            if (existD.deleted === true && !(change.payload?.deleted === true)) {
              rejected.push({ entity, entityId, error: 'deleted', serverData: existD as Record<string, unknown> });
              continue;
            }
            // Conflict check
            if (change.payload?.updatedAt && (existD.updatedAt as number || 0) > (change.payload.updatedAt as number)) {
              rejected.push({ entity, entityId, error: 'conflict', serverData: existD as Record<string, unknown> });
              continue;
            }
          }

          // Build the merged data
          const existObj: Record<string, unknown> = {};
          if (rec) {
            const rawE = rec.data;
            const parsed = parseDataField(rawE);
            if (parsed) Object.assign(existObj, parsed);
          }

          if (Object.keys(existObj).length > 500) {
            console.warn(`[sync-push] Truncating large object for ${entity} ${entityId}`);
            for (const k of Object.keys(existObj)) delete existObj[k];
          }

          const payload = change.payload || {};
          const changedFields = change._changedFields;

          if (Array.isArray(changedFields) && changedFields.length > 0) {
            for (const cf of changedFields) {
              if (cf !== 'id' && cf !== 'user_id' && payload[cf] !== undefined) {
                existObj[cf] = payload[cf];
              }
            }
          } else {
            for (const [k, v] of Object.entries(payload)) {
              if (k !== 'id' && k !== 'user_id') existObj[k] = v;
            }
          }
          // P1 FIX: Preserve client's updatedAt if provided, else use server time
          existObj.updatedAt = payload.updatedAt || existObj.updatedAt || Date.now();
          // P0 FIX: For shared collections (body_plans), set type discriminator
          if (entity === 'bodyPlan') existObj.type = 'weekly';
          if (entity === 'bodyTrainingPlan') existObj.type = 'training';

          const data = {
            user_id: userId,
            data: JSON.stringify(existObj),
            updated_at: new Date().toISOString(),
            deleted: existObj.deleted === true ? true : false,
          };
          // Set idField
          (data as Record<string, unknown>)[idField] = entityId;

          // Set top-level fields for specific collections
          if (entity === 'checkinReview') {
            (data as Record<string, unknown>).period = (existObj.period || 'week') as string;
            (data as Record<string, unknown>).start_date = (existObj.startDate || existObj.start_date || '') as string;
            (data as Record<string, unknown>).end_date = (existObj.endDate || existObj.end_date || '') as string;
          }
          if (entity === 'trailNote') {
            (data as Record<string, unknown>).trail_id = (existObj.trailId || existObj.trail_id || '') as string;
            (data as Record<string, unknown>).content = (existObj.content || '') as string;
            (data as Record<string, unknown>).source = (existObj.source || 'free') as string;
            (data as Record<string, unknown>).created_at = (existObj.createdAt || existObj.created_at || Date.now()) as number;
          }

          if (rec) {
            await pb.collection(coll).update(rec.id, data);
          } else {
            await pb.collection(coll).create(data);
          }
          applied.push({ entity, entityId, operation: 'upsert' });
        }
      } catch (recErr) {
        console.error(`[sync-push] Error for ${entity}:${entityId}:`, recErr);
        rejected.push({ entity, entityId, error: 'Server error processing record' });
      }
    }

    return c.json({ changes: applied, rejected, serverTime: Date.now() });
  } catch (err) {
    console.error('[sync-push] Error:', err);
    return c.json({ code: 'INTERNAL_ERROR', message: 'Internal error' }, 500);
  }
});

// ── POST /api/sync/pull ──────────────────────────────────────────
app.post('/sync/pull', async (c) => {
  try {
    const authHeader = c.req.header('authorization') || null;
    const auth = await verifyAuth(authHeader);
    if (!auth) return c.json({ code: 'UNAUTHORIZED', message: 'Unauthorized' }, 401);
    const userId = auth.userId;
    const body: { entities?: string[]; since?: number; page?: number; pageSize?: number } = await c.req.json();
    const entities = body.entities || ENTITY_LIST;
    const since = body.since || 0;
    const sinceDate = since > 0 ? new Date(since).toISOString() : '1970-01-01T00:00:00.000Z';
    const page = body.page || 0;
    const pageSize = body.pageSize || 0;
    const pb = await getAdminPb();
    const data: Record<string, unknown[]> = {};
    const meta: Record<string, { total: number }> = {};

    for (const ent of entities) {
      try {
        const coll = ENTITY_COLL_MAP[ent];
        if (!coll) continue;
        const filterStr = buildUserFilter(userId, since > 0 ? sinceDate : undefined);
        let allRecs: Array<Record<string, unknown>> = [];
        let totalCount = 0;

        if (page > 0 && pageSize > 0) {
          // Paginated
          const result = await pb.collection(coll).getList(page, pageSize, { filter: filterStr });
          totalCount = result.totalItems;
          allRecs = result.items as Array<Record<string, unknown>>;
        } else {
          // Full pull
          const result = await pb.collection(coll).getList(1, 5000, { filter: filterStr });
          allRecs = result.items as Array<Record<string, unknown>>;
          totalCount = result.totalItems;
        }

        const payloads: Array<Record<string, unknown>> = [];
        const expectedType = ENTITY_TYPE_MAP[ent];

        for (const rec of allRecs) {
          try {
            const exported = exportRecord(rec);
            // Type filter for shared collections
            if (expectedType) {
              let recType = exported.type as string | undefined;
              if (recType === undefined || recType === null) {
                recType = (exported.weekday !== undefined || exported.part !== undefined)
                  ? 'weekly' : 'training';
              }
              if (recType !== expectedType) continue;
            }
            // Client-side updatedAt filter
            if (since > 0 && exported.updatedAt && (exported.updatedAt as number) <= since) {
              continue;
            }
            const idF = ENTITY_ID_FIELD_MAP[ent];
            if (exported.id || exported[idF] || exported.date || exported.name) {
              payloads.push(exported);
            }
          } catch (recErr) {
            console.warn(`[sync-pull] Record error for ${ent}:`, recErr);
          }
        }
        if (payloads.length > 0) data[ent] = payloads;
        if (page > 0 && pageSize > 0) {
          meta[ent] = { total: totalCount };
        }
      } catch (qErr) {
        console.error(`[sync-pull] Entity error for ${ent}:`, qErr);
      }
    }

    const result: Record<string, unknown> = { data, serverTime: Date.now() };
    if (Object.keys(meta).length > 0) {
      (result as Record<string, unknown>)._meta = meta;
    }
    return c.json(result);
  } catch (err) {
    console.error('[sync-pull] Error:', err);
    return c.json({ code: 'INTERNAL_ERROR', message: 'Internal error' }, 500);
  }
});

// ── POST /api/sync (combined push + pull) ────────────────────────
app.post('/sync', async (c) => {
  try {
    const authHeader = c.req.header('authorization') || null;
    const auth = await verifyAuth(authHeader);
    if (!auth) return c.json({ code: 'UNAUTHORIZED', message: 'Unauthorized' }, 401);
    const userId = auth.userId;
    const body = await c.req.json();
    const changes = body.changes || [];
    const skipPull = !!body.skipPull;
    const pullEntities = Array.isArray(body.entities) && body.entities.length > 0 ? body.entities : null;
    const lastSyncAt = body.lastSyncAt || 0;
    const pb = await getAdminPb();
    const applied: Array<{ entity: string; entityId: string; operation: string }> = [];
    const rejected: Array<{ entity: string; entityId: string; error: string }> = [];

    // ── Push phase ──
    for (const change of changes) {
      const { entity, entityId, operation, payload } = change;
      const coll = ENTITY_COLL_MAP[entity];
      const idField = ENTITY_ID_FIELD_MAP[entity];
      if (!coll || !idField) { rejected.push({ entity, entityId, error: 'Unknown entity' }); continue; }
      if (!entityId || typeof entityId !== 'string') { rejected.push({ entity, entityId, error: 'Invalid entityId' }); continue; }

      try {
        const filter = `${idField} = '${escapeFilter(entityId)}' && user_id = '${escapeFilter(userId)}'`;
        const records = await pb.collection(coll).getList(1, 1, { filter });

        if (operation === 'delete') {
          if (records.items.length > 0) {
            for (const rec of records.items) {
              const curObj = parseDataField(rec.data) || {};
              curObj.deleted = true;
              curObj.updatedAt = Date.now();
              await pb.collection(coll).update(rec.id, { data: JSON.stringify(curObj), deleted: true });
            }
          }
          applied.push({ entity, entityId, operation: 'delete' });
        } else {
          // Upsert: always search by user_id first (handles unique constraints)
          let rec = records.items[0];
          const userRecords = await pb.collection(coll).getList(1, 5, { filter: `user_id = '${escapeFilter(userId)}'` });
          if (!rec && userRecords.items.length > 0) {
            // Find the one with matching idField, or use first
            rec = userRecords.items.find(r => (r as Record<string, unknown>)[idField] === entityId) || userRecords.items[0];
          }
          if (rec && payload?.updatedAt) {
            const existD = parseDataField(rec.data) || {};
            if ((existD.updatedAt as number || 0) > (payload.updatedAt as number)) {
              rejected.push({ entity, entityId, error: 'conflict' });
              continue;
            }
          }
          const mergedData = { ...(rec ? (parseDataField(rec.data) || {}) : {}), ...payload, updatedAt: Date.now() };
          const data: Record<string, unknown> = {
            user_id: userId,
            data: JSON.stringify(mergedData),
            updated_at: new Date().toISOString(),
            deleted: ((payload as Record<string, unknown>)?.deleted === true),
            [idField]: entityId,
          };
          if (rec) {
            await pb.collection(coll).update(rec.id, data);
          } else {
            // Final check: search by user_id to avoid unique constraint violations
            try {
              const existingForUser = await pb.collection(coll).getList(1, 5, { filter: `user_id = '${escapeFilter(userId)}'` });
              if (existingForUser.items.length > 0) {
                // Update the first matching record
                const existing = existingForUser.items.find(r => (r as Record<string, unknown>)[idField] === entityId) || existingForUser.items[0];
                await pb.collection(coll).update(existing.id as string, data);
              } else {
                await pb.collection(coll).create(data);
              }
            } catch {
              // If all else fails, skip this record rather than crash
              console.warn(`[sync] Skipping ${entity}:${entityId} due to create/update failure`);
              rejected.push({ entity, entityId, error: 'Create/update failed' });
            }
          }
          applied.push({ entity, entityId, operation: 'upsert' });
        }
      } catch (recErr) {
        console.error(`[sync] Record error for ${entity}:${entityId}:`, recErr);
        rejected.push({ entity, entityId, error: 'Operation failed' });
      }
    }

    // ── Pull phase ──
    const serverData: Record<string, unknown[]> = {};
    if (!skipPull) {
      const entitiesToPull = pullEntities || ENTITY_LIST;
      for (const ent of entitiesToPull) {
        try {
          const coll = ENTITY_COLL_MAP[ent];
          if (!coll) continue;
          const filterStr = buildUserFilter(userId, lastSyncAt > 0 ? new Date(lastSyncAt).toISOString() : undefined);
          const result = await pb.collection(coll).getList(1, 5000, { filter: filterStr });
          const payloads: Array<Record<string, unknown>> = [];
          const expectedType = ENTITY_TYPE_MAP[ent];

          for (const rec of result.items) {
            try {
              const exported = exportRecord(rec as Record<string, unknown>);
              if (expectedType) {
                let recType = exported.type as string | undefined;
                if (recType === undefined || recType === null) {
                  recType = (exported.weekday !== undefined || exported.part !== undefined)
                    ? 'weekly' : 'training';
                }
                if (recType !== expectedType) continue;
              }
              const idF = ENTITY_ID_FIELD_MAP[ent];
              if (exported.id || exported[idF] || exported.date || exported.name) {
                payloads.push(exported);
              }
            } catch (recErr) {
              console.warn(`[sync] Record export error for ${ent}:`, recErr);
            }
          }
          if (payloads.length > 0) serverData[ent] = payloads;
        } catch (qErr) {
          console.error(`[sync] Pull error for ${ent}:`, qErr);
        }
      }
    }

    return c.json({ changes: applied, rejected, data: serverData, serverTime: Date.now() });
  } catch (err) {
    console.error('[sync] Error:', err);
    return c.json({ code: 'INTERNAL_ERROR', message: 'Internal error' }, 500);
  }
});

// ── GET /api/sync (incremental pull, backward compat) ────────────
app.get('/sync', async (c) => {
  try {
    const authHeader = c.req.header('authorization') || null;
    const auth = await verifyAuth(authHeader);
    if (!auth) return c.json({ code: 'UNAUTHORIZED', message: 'Unauthorized' }, 401);
    const userId = auth.userId;
    const since = parseInt(c.req.query('since') || '0', 10);
    const sinceDate = since > 0 ? new Date(since).toISOString() : '1970-01-01T00:00:00.000Z';
    const pb = await getAdminPb();
    const data: Record<string, unknown[]> = {};

    for (const ent of ENTITY_LIST) {
      try {
        const coll = ENTITY_COLL_MAP[ent];
        if (!coll) continue;
        const filterStr = buildUserFilter(userId, since > 0 ? sinceDate : undefined);
        const result = await pb.collection(coll).getList(1, 5000, { filter: filterStr });
        const payloads: Array<Record<string, unknown>> = [];
        const expectedType = ENTITY_TYPE_MAP[ent];

        for (const rec of result.items) {
          try {
            const exported = exportRecord(rec as Record<string, unknown>);
            if (expectedType) {
              let recType = exported.type as string | undefined;
              if (recType === undefined || recType === null) {
                recType = (exported.weekday !== undefined || exported.part !== undefined) ? 'weekly' : 'training';
              }
              if (recType !== expectedType) continue;
            }
            if (since > 0 && exported.updatedAt && (exported.updatedAt as number) <= since) continue;
            const idF = ENTITY_ID_FIELD_MAP[ent];
            if (exported.id || exported[idF] || exported.date || exported.name) {
              payloads.push(exported);
            }
          } catch (recErr) { console.warn(`[sync-get] Record error for ${ent}:`, recErr); }
        }
        if (payloads.length > 0) data[ent] = payloads;
      } catch (qErr) { console.error(`[sync-get] Entity error for ${ent}:`, qErr); }
    }

    return c.json({ data, serverTime: Date.now() });
  } catch (err) {
    console.error('[sync-get] Error:', err);
    return c.json({ code: 'INTERNAL_ERROR', message: 'Internal error' }, 500);
  }
});

// ── GET /api/sync/check ──────────────────────────────────────────
app.get('/sync/check', async (c) => {
  try {
    const authHeader = c.req.header('authorization') || null;
    const auth = await verifyAuth(authHeader);
    if (!auth) return c.json({ code: 'UNAUTHORIZED', message: 'Unauthorized' }, 401);
    const userId = auth.userId;
    const since = parseInt(c.req.query('since') || '0', 10);
    const sinceDate = since > 0 ? new Date(since).toISOString() : '1970-01-01T00:00:00.000Z';
    const pb = await getAdminPb();
    const changed: Record<string, number> = {};
    let totalChanges = 0;

    for (const ent of ENTITY_LIST) {
      try {
        const coll = ENTITY_COLL_MAP[ent];
        if (!coll) continue;
        // Note: updated_at filter removed due to PB date filter issues
        const filterStr = `user_id = '${escapeFilter(userId)}'`;
        const result = await pb.collection(coll).getList(1, 1, { filter: filterStr, perPage: 1 });
        if (result.items.length > 0) {
          changed[ent] = result.totalItems;
          totalChanges++;
        }
      } catch {
        // Skip entities that fail (e.g., schema mismatch)
        continue;
      }
    }

    return c.json({ hasChanges: totalChanges > 0, changed, count: totalChanges, serverTime: Date.now() });
  } catch (err) {
    console.error('[sync-check] Error:', err);
    return c.json({ code: 'INTERNAL_ERROR', message: 'Internal error' }, 500);
  }
});

export default app;