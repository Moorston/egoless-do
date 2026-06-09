// ─── PocketBase client (server-side only) ─────────────────────────
// Each call creates a fresh instance to prevent cross-request authStore leakage.
import PocketBase from 'pocketbase';

const PB_URL = process.env.POCKETBASE_URL ?? 'http://localhost:8090';

export function getPb(): PocketBase {
  const pb = new PocketBase(PB_URL);
  pb.autoCancellation(false);
  return pb;
}

/** Get a PocketBase instance authenticated as admin (for querying users collection). */
export async function getAdminPb(): Promise<PocketBase> {
  const pb = getPb();
  const adminEmail = process.env.PB_ADMIN_EMAIL;
  const adminPass = process.env.PB_ADMIN_PASSWORD;
  if (adminEmail && adminPass) {
    await pb.collection('_superusers').authWithPassword(adminEmail, adminPass);
  }
  return pb;
}

/** Escape special characters for PocketBase filter strings. */
export function escapeFilter(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export { PocketBase };
