import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../_auth';
import { getPb, escapeFilter } from '../_pb';
import { getClientIp, createRateLimiter } from '../_rateLimit';
import { sanitizeError } from '../_errors';
import { resolveConflict, ENTITY_COLLECTION, ENTITY_ID_FIELD, type SyncEntity } from '@egoless-do/core';

const syncPostRateLimit = createRateLimiter(60, 60_000); // 60 req/min
const syncGetRateLimit = createRateLimiter(30, 60_000);  // 30 req/min
const MAX_CHANGES_PER_SYNC = 500;

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
  const ip = getClientIp(req);
  if (!syncPostRateLimit(ip)) {
    return NextResponse.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 });
  }

  const token = req.headers.get('authorization')?.slice(7);
  const auth = await verifyAuth(req.headers.get('authorization'));
  if (!auth || !token) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const pb = getPb();
    pb.authStore.save(token, null);
    const userId = auth.userId;
    const body = await req.json();
    const { lastSyncAt, changes } = body;

    if (!Array.isArray(changes) || changes.length > MAX_CHANGES_PER_SYNC) {
      return NextResponse.json({ error: '无效的同步数据' }, { status: 400 });
    }
    if (lastSyncAt != null && (typeof lastSyncAt !== 'number' || !Number.isFinite(lastSyncAt))) {
      return NextResponse.json({ error: 'lastSyncAt must be a finite number' }, { status: 400 });
    }

    // Verify PocketBase connection
    try {
      await pb.health.check();
    } catch {
      console.error('[Sync POST] PocketBase is not reachable');
      return NextResponse.json({ error: '数据库服务不可用，请检查 PocketBase 是否运行' }, { status: 503 });
    }

    // Apply client changes to PocketBase
    const rejected: Array<{ entity: string; entityId: string; op: 'upsert' | 'delete'; payload: Record<string, unknown>; deleted?: boolean }> = [];

    for (const change of changes ?? []) {
      if (!change || typeof change !== 'object') continue;
      const entity = change.entity as SyncEntity;
      const collection = ENTITY_COLLECTION[entity];
      const idField = ENTITY_ID_FIELD[entity];
      if (!collection || !idField) {
        console.warn(`[Sync POST] Unknown entity: ${change.entity}`);
        continue;
      }
      if (typeof change.entityId !== 'string' || !change.entityId) continue;
      if (change.op !== 'upsert' && change.op !== 'delete') continue;
      if (change.payload != null && (typeof change.payload !== 'object' || Array.isArray(change.payload))) continue;

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
              // Stamp with server time so client's isLocalNewer recognizes server wins
              rejected.push({ entity: change.entity, entityId: change.entityId, op: 'delete', payload: { ...existingPayload, updatedAt: serverTimestamp }, deleted: existingPayload.deleted === true });
            }
          } catch (e: any) {
            if (e?.status === 404 || e?.message?.includes('Not found')) {
              await pb.collection(collection).create({
                user_id: userId,
                [idField]: change.entityId,
                data: { deleted: true, updatedAt: serverTimestamp },
              });
            } else {
              throw e;
            }
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
              // Stamp with server time so client's isLocalNewer recognizes server wins
              rejected.push({ entity: change.entity, entityId: change.entityId, op: 'upsert', payload: { ...existingPayload, updatedAt: serverTimestamp } });
            }
          } catch (e: any) {
            if (e?.status === 404 || e?.message?.includes('Not found')) {
              await pb.collection(collection).create({
                user_id: userId,
                [idField]: change.entityId,
                data: { ...clientPayload, updatedAt: serverTimestamp },
              });
            } else {
              throw e;
            }
          }
        }
      } catch (err) {
        console.error(`[Sync POST] Error processing ${change.entity}/${change.entityId}:`, err);
        rejected.push({ entity: change.entity, entityId: change.entityId, op: change.op, payload: change.payload });
      }
    }

    // Pull server changes since lastSyncAt
    const serverChanges: unknown[] = [];
    const syncTimestamp = lastSyncAt ?? 0;

    for (const [entityKey, collection] of Object.entries(ENTITY_COLLECTION)) {
      const entity = entityKey as SyncEntity;
      try {
        const records = await pb.collection(collection).getFullList({
          filter: `user_id = "${escapeFilter(userId)}" && updated >= "${new Date(syncTimestamp).toISOString()}"`,
        });
        for (const record of records) {
          const payload = getPayload(record);
          serverChanges.push({
            entity,
            entityId: getEntityId(record, ENTITY_ID_FIELD[entity]),
            op: payload.deleted === true ? 'delete' as const : 'upsert' as const,
            payload,
            deleted: payload.deleted === true,
          });
        }
      } catch (pullErr: any) {
        if (pullErr?.status !== 404) {
          console.error(`[Sync POST] Error pulling ${entity} (${collection}):`, pullErr);
        }
      }
    }

    return NextResponse.json({
      changes: serverChanges,
      rejected,
      serverTime: Date.now(),
    });
  } catch (err: unknown) {
    console.error('[Sync POST] Error:', err);
    return NextResponse.json({ error: sanitizeError(err, '同步失败') }, { status: 500 });
  }
}

// ── GET: full pull (all user data, after login) ──────────────────
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  if (!syncGetRateLimit(ip)) {
    return NextResponse.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 });
  }

  const token = req.headers.get('authorization')?.slice(7);
  const auth = await verifyAuth(req.headers.get('authorization'));
  if (!auth || !token) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const pb = getPb();
    pb.authStore.save(token, null);
    const userId = auth.userId;
    const data: Record<string, unknown[]> = {};

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
          .filter(d => d != null);
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
    return NextResponse.json({ error: sanitizeError(err, '拉取失败') }, { status: 500 });
  }
}
