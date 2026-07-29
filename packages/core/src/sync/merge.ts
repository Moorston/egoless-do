// ── Merge utilities for sync ──────────────────────────────────
import { resolveConflict } from './conflict';

/** Merge server + local arrays, dedup by idKey, keep newest updatedAt.
 *  Preserves local soft-deletions: if a local record has deleted=true,
 *  server data cannot resurrect it.
 *  Uses unified resolveConflict() for all timestamp comparisons. */
// any: generic requires index-signature access via string key (item[idKey]); typed interfaces lack index signatures
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mergeById<T extends Record<string, any>>(
  server: T[], local: T[], idKey: string
): T[] {
  if (!server.length) return local;
  if (!local.length) return server.filter(item => !item.deleted);
  const map = new Map<string, T>();
  for (const item of local) map.set(item[idKey] as string, item);
  for (const item of server) {
    const key = item[idKey] as string;
    const existing = map.get(key);
    if (!existing) {
      // New from server — skip soft-deleted
      if (!item.deleted) map.set(key, item);
    } else {
      const result = resolveConflict({
        clientUpdated: (existing.updatedAt as number) ?? 0,
        serverUpdated: (item.updatedAt as number) ?? 0,
        clientDeleted: !!existing.deleted,
        serverDeleted: !!item.deleted,
      });
      if (result.winner === 'server') {
        map.set(key, item);
      }
    }
  }
  return Array.from(map.values()).filter(item => !item.deleted);
}
