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
let _adminToken: string | null = null;
let _adminAuthAt = 0;
const ADMIN_AUTH_TTL = 5 * 60 * 1000; // Re-auth every 5 min

export async function getAdminPb(): Promise<PocketBase> {
  const now = Date.now();
  if (_adminToken && now - _adminAuthAt < ADMIN_AUTH_TTL) {
    const pb = getPb();
    pb.authStore.save(_adminToken, null);
    return pb;
  }

  const pb = getPb();
  const adminEmail = process.env.PB_ADMIN_EMAIL;
  const adminPass = process.env.PB_ADMIN_PASSWORD;

  if (!adminEmail || !adminPass) {
    throw new Error('PB_ADMIN_EMAIL or PB_ADMIN_PASSWORD not configured');
  }

  // PocketBase v0.22 uses 'admins', v0.23+ uses '_superusers'
  try {
    const authData = await pb.collection('_superusers').authWithPassword(adminEmail, adminPass);
    _adminToken = authData.token;
  } catch {
    // Fallback: try /api/admins/auth-with-password (v0.22)
    const res = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: adminEmail, password: adminPass }),
    });
    if (!res.ok) throw new Error(`Admin auth failed: ${res.status}`);
    const data = await res.json();
    _adminToken = data.token;
  }
  _adminAuthAt = now;

  const adminPb = getPb();
  adminPb.authStore.save(_adminToken!, null);
  return adminPb;
}

/** Escape special characters for PocketBase filter strings. */
export function escapeFilter(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export { PocketBase };
