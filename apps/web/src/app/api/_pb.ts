// ─── PocketBase client (server-side only) ─────────────────────────
// Each call creates a fresh instance to prevent cross-request authStore leakage.
import PocketBase from 'pocketbase';

const PB_URL = process.env.POCKETBASE_URL ?? 'http://localhost:8090';

export function getPb(): PocketBase {
  const pb = new PocketBase(PB_URL);
  pb.autoCancellation(false);
  return pb;
}

/** Escape special characters for PocketBase filter strings. */
export function escapeFilter(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export { PocketBase };
