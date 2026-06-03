// ─── Merge utilities for sync ──────────────────────────────────

/** Merge server + local arrays, dedup by idKey, keep newest updatedAt.
 *  Preserves local soft-deletions: if a local record has deleted=true,
 *  server data cannot resurrect it. */
export function mergeById<T extends Record<string, any>>(
  server: T[], local: T[], idKey: string
): T[] {
  if (!server.length) return local;
  if (!local.length) return server;
  const map = new Map<string, T>();
  for (const item of local) map.set(item[idKey], item);
  for (const item of server) {
    const key = item[idKey];
    const existing = map.get(key);
    if (!existing) {
      // New from server
      map.set(key, item);
    } else if (existing.deleted) {
      // Local is deleted — preserve deletion, only update if server also deleted with newer timestamp
      if (item.deleted && (item.updatedAt ?? 0) > (existing.updatedAt ?? 0)) {
        map.set(key, item);
      }
      // Otherwise keep local deleted version
    } else if (item.deleted) {
      // Server says deleted, local is not — apply deletion if server is newer
      if ((item.updatedAt ?? 0) >= (existing.updatedAt ?? 0)) {
        map.set(key, item);
      }
    } else {
      // Neither deleted — keep newest
      if ((item.updatedAt ?? 0) >= (existing.updatedAt ?? 0)) {
        map.set(key, item);
      }
    }
  }
  return Array.from(map.values());
}
