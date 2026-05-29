// ─── Merge utilities for sync ──────────────────────────────────

/** Merge server + local arrays, dedup by idKey, keep newest updatedAt */
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
    if (!existing || (item.updatedAt ?? 0) >= (existing.updatedAt ?? 0)) {
      map.set(key, item);
    }
  }
  return Array.from(map.values());
}
