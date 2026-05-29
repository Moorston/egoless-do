import { NextRequest } from 'next/server';
import { verifyAuth } from '../../_auth';
import { getPb } from '../../_pb';
import { ENTITY_COLLECTION, ENTITY_ID_FIELD, type SyncEntity } from '@egoless-do/core';

/** Safely read the JSON `data` field from a PocketBase record. */
function getPayload(record: any): Record<string, unknown> {
  return record?.get?.('data') ?? record?.data ?? {};
}

/** Read an entity ID field from a PocketBase record. */
function getEntityId(record: any, field: string): string {
  return record?.get?.(field) ?? record?.[field] ?? '';
}

// ── SSE endpoint with polling (no EventSource dependency) ────────
export async function GET(req: NextRequest) {
  // Support both Authorization header and ?token= query param
  const headerAuth = req.headers.get('authorization');
  const queryToken = req.nextUrl.searchParams.get('token');
  const authHeader = headerAuth ?? (queryToken ? `Bearer ${queryToken}` : null);
  const auth = await verifyAuth(authHeader);
  if (!auth) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = auth.userId;
  const pb = getPb();
  let lastPollTime = new Date().toISOString();

  // Create SSE stream with polling
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Send initial connection message
      send({ type: 'connected', userId, timestamp: Date.now() });

      // Poll for changes every 5 seconds
      const pollInterval = setInterval(async () => {
        try {
          const changes: any[] = [];

          for (const [entityKey, collection] of Object.entries(ENTITY_COLLECTION)) {
            const entity = entityKey as SyncEntity;
            try {
              const records = await pb.collection(collection).getFullList({
                filter: `user_id = "${userId}" && updated >= "${lastPollTime}"`,
              });

              for (const record of records) {
                const idField = ENTITY_ID_FIELD[entity];
                if (!idField) continue;

                changes.push({
                  action: 'update',
                  entity,
                  entityId: getEntityId(record, idField),
                  payload: getPayload(record),
                  deleted: getPayload(record).deleted === true,
                  timestamp: Date.now(),
                });
              }
            } catch {
              // Collection might not exist yet
            }
          }

          if (changes.length > 0) {
            for (const change of changes) {
              send(change);
            }
          }

          lastPollTime = new Date().toISOString();
        } catch (err) {
          console.error('[Realtime] Poll error:', err);
        }
      }, 5000);

      // Keep connection alive with heartbeat
      const heartbeat = setInterval(() => {
        try {
          send({ type: 'heartbeat', timestamp: Date.now() });
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Cleanup on close
      req.signal.addEventListener('abort', () => {
        clearInterval(pollInterval);
        clearInterval(heartbeat);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
