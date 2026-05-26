import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../_auth';
import { getPb, escapeFilter } from '../_pb';
import { resolveConflict } from './conflict';

// ── Entity → PocketBase collection mapping ───────────────────────
const ENTITY_COLLECTION: Record<string, string> = {
  habit:      'habits',
  reflection: 'reflections',
  fasting:    'fasting_sessions',
  food:       'food_entries',
  checkin:    'checkin_records',
  meditation: 'meditation_history',
  profile:    'user_profiles',
  exercise:   'exercise_entries',
};

const ENTITY_ID_FIELD: Record<string, string> = {
  habit:      'habit_id',
  reflection: 'reflection_id',
  fasting:    'session_id',
  food:       'food_id',
  checkin:    'date',
  meditation: 'date',
  profile:    'profile_id',
  exercise:   'exercise_id',
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
  const token = req.headers.get('authorization')?.slice(7);
  const auth = await verifyAuth(req.headers.get('authorization'));
  if (!auth) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const pb = getPb();
    pb.authStore.save(token!, null);
    const userId = auth.userId;
    const body = await req.json();
    const { lastSyncAt, changes } = body;

    console.log(`[Sync POST] userId=${userId}, changes=${changes?.length ?? 0}, lastSyncAt=${lastSyncAt}`);

    // Verify PocketBase connection
    try {
      await pb.health.check();
    } catch {
      console.error('[Sync POST] PocketBase is not reachable');
      return NextResponse.json({ error: '数据库服务不可用，请检查 PocketBase 是否运行' }, { status: 503 });
    }

    // Apply client changes to PocketBase
    const rejected: Array<{ entity: string; entityId: string; payload: Record<string, unknown>; deleted?: boolean }> = [];

    for (const change of changes ?? []) {
      const collection = ENTITY_COLLECTION[change.entity];
      const idField = ENTITY_ID_FIELD[change.entity];
      if (!collection || !idField) {
        console.warn(`[Sync POST] Unknown entity: ${change.entity}`);
        continue;
      }

      const clientPayload = change.payload ?? {};
      const clientUpdated = Number(clientPayload.updatedAt ?? 0);

      // Always stamp with server time for the actual write
      const serverTimestamp = Date.now();

      try {
        if (change.op === 'delete') {
          try {
            const existing = await pb.collection(collection).getFirstListItem(
              `${idField} = "${escapeFilter(change.entityId)}" && user_id = "${escapeFilter(userId)}"`
            );
            const existingPayload = getPayload(existing);
            const serverUpdated = Number(existingPayload.updatedAt ?? 0);
            const { winner } = resolveConflict({ clientUpdated, serverUpdated });
            if (winner === 'client') {
              await pb.collection(collection).update(existing.id, {
                data: { ...existingPayload, deleted: true, updatedAt: serverTimestamp },
              });
            } else {
              rejected.push({ entity: change.entity, entityId: change.entityId, payload: existingPayload, deleted: existingPayload.deleted === true });
            }
          } catch {
            await pb.collection(collection).create({
              user_id: userId,
              [idField]: change.entityId,
              data: { deleted: true, updatedAt: serverTimestamp },
            });
          }
        } else {
          try {
            const existing = await pb.collection(collection).getFirstListItem(
              `${idField} = "${escapeFilter(change.entityId)}" && user_id = "${escapeFilter(userId)}"`
            );
            const existingPayload = getPayload(existing);
            const serverUpdated = Number(existingPayload.updatedAt ?? 0);
            const { winner } = resolveConflict({ clientUpdated, serverUpdated });
            if (winner === 'client') {
              await pb.collection(collection).update(existing.id, {
                data: { ...clientPayload, updatedAt: serverTimestamp },
              });
            } else {
              rejected.push({ entity: change.entity, entityId: change.entityId, payload: existingPayload });
            }
          } catch {
            await pb.collection(collection).create({
              user_id: userId,
              [idField]: change.entityId,
              data: { ...clientPayload, updatedAt: serverTimestamp },
            });
          }
        }
      } catch (err) {
        console.error(`[Sync POST] Error processing ${change.entity}/${change.entityId}:`, err);
        // Continue processing other changes instead of failing the entire sync
      }
    }

    // Pull server changes since lastSyncAt
    const serverChanges: unknown[] = [];
    const syncTimestamp = lastSyncAt ?? 0;

    for (const [entity, collection] of Object.entries(ENTITY_COLLECTION)) {
      try {
        const records = await pb.collection(collection).getFullList({
          filter: `user_id = "${escapeFilter(userId)}" && updated >= "${new Date(syncTimestamp).toISOString()}"`,
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
      rejected,
      serverTime: Date.now(),
    });
  } catch (err: unknown) {
    console.error('[Sync POST] Error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : '同步失败' }, { status: 500 });
  }
}

// ── GET: full pull (all user data, after login) ──────────────────
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.slice(7);
  const auth = await verifyAuth(req.headers.get('authorization'));
  if (!auth) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const pb = getPb();
    pb.authStore.save(token!, null);
    const userId = auth.userId;
    const data: Record<string, unknown[]> = {};

    console.log('[Sync GET] Pulling data for user:', userId);

    const PAGE_SIZE = 500;
    for (const [entity, collection] of Object.entries(ENTITY_COLLECTION)) {
      try {
        const allRecords: any[] = [];
        let page = 1;
        while (true) {
          const result = await pb.collection(collection).getList(page, PAGE_SIZE, {
            filter: `user_id = "${escapeFilter(userId)}"`,
          });
          allRecords.push(...result.items);
          if (result.items.length < PAGE_SIZE || page * PAGE_SIZE >= result.totalItems) break;
          page++;
        }
        data[entity] = allRecords
          .map(r => getPayload(r))
          .filter(d => d && d.deleted !== true);
        
        console.log(`[Sync GET] ${entity}: ${data[entity].length} records`);
      } catch (err: any) {
        if (err?.status === 404) {
          console.warn(`[Sync GET] Collection not found for ${entity} (${collection}), skipping`);
        } else {
          console.error(`[Sync GET] Error fetching ${entity}:`, err);
        }
        data[entity] = [];
      }
    }

    return NextResponse.json({ data, serverTime: Date.now() });
  } catch (err: unknown) {
    console.error('[Sync GET] Error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : '拉取失败' }, { status: 500 });
  }
}
