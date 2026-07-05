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
let _adminAuthPromise: Promise<string> | null = null;
const ADMIN_AUTH_TTL = 5 * 60 * 1000; // Re-auth every 5 min

async function authenticateAdmin(): Promise<string> {
  const pb = getPb();
  const adminEmail = process.env.PB_ADMIN_EMAIL;
  const adminPass = process.env.PB_ADMIN_PASSWORD;

  if (!adminEmail || !adminPass) {
    throw new Error('PB_ADMIN_EMAIL or PB_ADMIN_PASSWORD not configured');
  }

  const authData = await pb.collection('_superusers').authWithPassword(adminEmail, adminPass);
  return authData.token;
}

export async function getAdminPb(): Promise<PocketBase> {
  const now = Date.now();
  if (_adminToken && now - _adminAuthAt < ADMIN_AUTH_TTL) {
    const pb = getPb();
    pb.authStore.save(_adminToken, null);
    return pb;
  }

  // Serialize concurrent auth requests — atomically update all state on settle
  if (!_adminAuthPromise) {
    _adminAuthPromise = authenticateAdmin().then(
      (token) => { _adminToken = token; _adminAuthAt = Date.now(); _adminAuthPromise = null; return token; },
      (err) => { _adminToken = null; _adminAuthAt = 0; _adminAuthPromise = null; throw err; },
    );
  }
  try {
    _adminToken = await _adminAuthPromise;
    // _adminAuthAt already set by the .then() callback above
  } catch (e) {
    _adminToken = null;
    _adminAuthAt = 0;
    throw e;
  }

  const adminPb = getPb();
  adminPb.authStore.save(_adminToken, null);
  return adminPb;
}

/** Escape special characters for PocketBase filter strings. */
export function escapeFilter(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\0/g, '');
}

export { PocketBase };
