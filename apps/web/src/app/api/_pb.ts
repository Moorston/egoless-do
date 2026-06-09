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
let _adminPb: PocketBase | null = null;
let _adminAuthAt = 0;
const ADMIN_AUTH_TTL = 5 * 60 * 1000; // Re-auth every 5 min

export async function getAdminPb(): Promise<PocketBase> {
  const now = Date.now();
  if (_adminPb && now - _adminAuthAt < ADMIN_AUTH_TTL) {
    return _adminPb;
  }

  const pb = getPb();
  const adminEmail = process.env.PB_ADMIN_EMAIL;
  const adminPass = process.env.PB_ADMIN_PASSWORD;

  if (!adminEmail || !adminPass) {
    throw new Error('PB_ADMIN_EMAIL or PB_ADMIN_PASSWORD not configured');
  }

  await pb.collection('_superusers').authWithPassword(adminEmail, adminPass);
  _adminPb = pb;
  _adminAuthAt = now;
  return pb;
}

/** Escape special characters for PocketBase filter strings. */
export function escapeFilter(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export { PocketBase };
