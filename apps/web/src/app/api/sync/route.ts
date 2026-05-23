import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../_auth';
import { getPb } from '../_pb';

// ── Entity → PocketBase collection mapping ───────────────────────
const ENTITY_COLLECTION: Record<string, string> = {
  habit:      'habits',
  reflection: 'reflections',
  fasting:    'fasting_sessions',
  food:       'food_entries',
  checkin:    'checkin_records',
  meditation: 'meditation_history',
  profile:    'user_profiles',
};

const ENTITY_ID_FIELD: Record<string, string> = {
  habit:      'habit_id',
  reflection: 'reflection_id',
  fasting:    'session_id',
  food:       'food_id',
  checkin:    'date',
  meditation: 'date',
  profile:    'profile_id',
};

/** Safely read the JSON `data` field from a PocketBase record.
 *  Use `record.get('data')` instead of `record.data` because
 *  PocketBase's BaseModel.data shadows the user-defined `data` field. */
function getPayload(record: any): Record<string, unknown> {
  return record?.get?.('data') ?? record?.data ?? {};
}

/** Read an entity ID field from a PocketBase record. */
function getEntityId(record: any, field: string): string {
  return record?.get?.(field) ?? record?.[field] ?? '';
}

// ── POST: incremental sync (push + pull) ─────────────────────────
export async function POST(req: NextRequest) {
  const auth = verifyAuth(req.headers.get('authorization'));
  if (!auth) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const pb = getPb();
    const userId = auth.userId;
    const { lastSyncAt, changes } = await req.json();

    // Apply client changes to PocketBase
    for (const change of changes ?? []) {
      const collection = ENTITY_COLLECTION[change.entity];
      const idField = ENTITY_ID_FIELD[change.entity];
      if (!collection || !idField) continue;

      const clientPayload = change.payload ?? {};
      const clientUpdated = clientPayload.updatedAt ?? 0;

      if (change.op === 'delete') {
        try {
          const existing = await pb.collection(collection).getFirstListItem(
            `${idField} = "${change.entityId}" && user_id = "${userId}"`
          );
          const existingPayload = getPayload(existing);
          const serverUpdated = existingPayload.updatedAt ?? 0;
          if (clientUpdated >= serverUpdated) {
            await pb.collection(collection).update(existing.id, {
              data: { ...existingPayload, deleted: true, updatedAt: clientUpdated || Date.now() },
            });
          }
        } catch {
          await pb.collection(collection).create({
            user_id: userId,
            [idField]: change.entityId,
            data: { deleted: true, updatedAt: clientUpdated || Date.now() },
          });
        }
      } else {
        try {
          const existing = await pb.collection(collection).getFirstListItem(
            `${idField} = "${change.entityId}" && user_id = "${userId}"`
          );
          const existingPayload = getPayload(existing);
          const serverUpdated = existingPayload.updatedAt ?? 0;
          if (clientUpdated >= serverUpdated) {
            await pb.collection(collection).update(existing.id, { data: clientPayload });
          }
        } catch {
          await pb.collection(collection).create({
            user_id: userId,
            [idField]: change.entityId,
            data: clientPayload,
          });
        }
      }
    }

    // Pull server changes since lastSyncAt
    const serverChanges: unknown[] = [];
    const syncTimestamp = lastSyncAt ?? 0;

    for (const [entity, collection] of Object.entries(ENTITY_COLLECTION)) {
      try {
        const records = await pb.collection(collection).getFullList({
          filter: `user_id = "${userId}" && updated >= "${new Date(syncTimestamp).toISOString()}"`,
        });
        for (const record of records) {
          serverChanges.push({
            entity,
            entityId: getEntityId(record, ENTITY_ID_FIELD[entity]),
            payload: getPayload(record),
            deleted: getPayload(record).deleted === true,
          });
        }
      } catch {
        // Collection might not exist yet
      }
    }

    return NextResponse.json({
      changes: serverChanges,
      serverTime: Date.now(),
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '同步失败' }, { status: 500 });
  }
}

// ── GET: full pull (all user data, after login) ──────────────────
export async function GET(req: NextRequest) {
  const auth = verifyAuth(req.headers.get('authorization'));
  if (!auth) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const pb = getPb();
    const userId = auth.userId;
    const data: Record<string, unknown[]> = {};

    for (const [entity, collection] of Object.entries(ENTITY_COLLECTION)) {
      try {
        const records = await pb.collection(collection).getFullList({
          filter: `user_id = "${userId}"`,
        });
        data[entity] = records
          .map(r => getPayload(r))
          .filter(d => d && d.deleted !== true);
      } catch {
        data[entity] = [];
      }
    }

    return NextResponse.json({ data, serverTime: Date.now() });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '拉取失败' }, { status: 500 });
  }
}
