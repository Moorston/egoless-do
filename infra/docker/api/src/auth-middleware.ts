// ─── Auth middleware (JWT + blacklist) ────────────────────────────
import { isTokenBlacklisted } from './token-blacklist.js';

function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  return Buffer.from(padded, 'base64').toString('utf-8');
}

export function jwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) return null;
    return JSON.parse(base64UrlDecode(parts[1]));
  } catch {
    return null;
  }
}

export function jwtExp(token: string): number | null {
  const payload = jwtPayload(token);
  return typeof payload?.exp === 'number' ? payload.exp : null;
}

/**
 * 检查 Token 是否在黑名单中（异步版本，使用 PocketBase 持久化）
 */
export async function isBlacklisted(token: string): Promise<boolean> {
  return isTokenBlacklisted(token);
}

/**
 * Verify a Bearer token: format check → blacklist check → PocketBase signature verification.
 * Uses PocketBase authRefresh() which validates the JWT signature server-side.
 *
 * SECURITY: userId is extracted from the authRefresh response (verified), NOT from
 * the decoded JWT payload (unverified). This prevents using a tampered payload to
 * query another user's password_changed_at or login_epoch before signature verification.
 */
export async function verifyAuth(authHeader: string | null): Promise<{ userId: string } | null> {
  if (!authHeader?.startsWith('Bearer ')) { console.warn('[verifyAuth] Missing or invalid auth header'); return null; }
  const token = authHeader.slice(7);

  // Fast local checks (format only — payload is NOT trusted yet)
  const payload = jwtPayload(token);
  if (!payload) { console.warn('[verifyAuth] Invalid JWT payload'); return null; }

  // Check blacklist (for logged-out tokens)
  if (await isBlacklisted(token)) { console.warn('[verifyAuth] Token is blacklisted'); return null; }

  try {
    // Verify signature via PocketBase — this is the actual security gate
    const { getPb } = await import('./pb.js');
    const pb = getPb();
    pb.authStore.save(token, null);
    let verifiedUserId: string;
    try {
      await pb.collection('users').authRefresh();
      const recordId = (pb.authStore as unknown as { record: { id: string } | null }).record?.id;
      if (!recordId) { console.warn('[verifyAuth] authRefresh returned no recordId'); return null; }
      verifiedUserId = recordId;
    } catch (refreshErr: unknown) {
      console.warn('[verifyAuth] authRefresh failed:', (refreshErr as Error)?.message ?? 'unknown');
      return null;
    }

    // Get admin PB for additional checks
    // If admin auth fails, skip admin-dependent checks — token signature already verified by authRefresh
    let adminPb: any = null;
    try {
      const { getAdminPb } = await import('./pb.js');
      adminPb = await getAdminPb();
    } catch (adminErr) {
      console.warn('[verifyAuth] Admin PB unavailable, skipping password_changed_at and login_epoch checks:', (adminErr as Error)?.message ?? 'unknown');
    }

    // Check password_changed_at (uses VERIFIED userId)
    if (adminPb) {
      const iat = typeof payload.iat === 'number' ? payload.iat * 1000 : 0;
      if (iat > 0) {
        try {
          const user = await adminPb.collection('users').getOne(verifiedUserId, { fields: 'password_changed_at' });
          const pwdChangedAt = (user as Record<string, unknown>).password_changed_at as number | undefined;
          if (pwdChangedAt && iat < pwdChangedAt) return null;
        } catch (pwdErr) {
          // Token already verified by authRefresh(); admin query failure shouldn't reject valid requests.
          // Log the error and continue — the authRefresh() call is the primary security gate.
          console.warn('[verifyAuth] password_changed_at check failed, allowing request:', (pwdErr as Error)?.message ?? 'unknown');
        }
      }
    }

    // Check login_epoch — guards against token reuse after re-login
    // Only enforce if the token ACTUALLY has an epoch claim
    // (tokens issued before the epoch system don't have this claim)
    if (adminPb) {
      const tokenEpoch = (payload as Record<string, unknown>).epoch;
      if (typeof tokenEpoch === 'number' && tokenEpoch > 0) {
        try {
          const userProfile = await adminPb.collection('user_profiles').getFirstListItem(`user_id="${verifiedUserId}"`, { fields: 'data' });
          const profileData = (userProfile as Record<string, unknown>).data;
          if (profileData) {
            const data = typeof profileData === 'string' ? JSON.parse(profileData) : profileData;
            const expectedEpoch = ((data as Record<string, unknown>).login_epoch as number) || 0;
            if (tokenEpoch < expectedEpoch) return null;
          }
        } catch (epochErr: unknown) {
          const status = (epochErr as Record<string, unknown>)?.status;
          // 404 is expected for new users who haven't set up a user_profiles record yet.
          // In this case the token has no stored epoch to compare against, so we allow
          // the request through. Any other error (500, network, etc.) is treated as a
          // transient failure — fail-open like blacklist, since a verified JWT is the
          // primary security gate and epoch is a secondary check.
          if (status !== 404) {
            console.warn('[verifyAuth] login_epoch check failed, allowing request (fail-open):', (epochErr as Error)?.message ?? 'unknown');
          }
        }
      }
    }

    return { userId: verifiedUserId };
  } catch {
    return null;
  }
}

/** Sanitize error messages for client responses. */
export function sanitizeError(err: unknown, fallback: string): string {
  if (process.env.NODE_ENV === 'development') {
    return err instanceof Error ? err.message : fallback;
  }
  return fallback;
}

const COMMON_PASSWORDS = [
  'password', '12345678', 'qwerty123', 'password1', 'admin123',
  'password123', '123456789', 'iloveyou', 'abc123456', 'monkey123',
  'dragon123', 'letmein123', 'trustno1', 'sunshine1', 'princess1',
  'football1', 'shadow123', 'master123', 'hello1234', 'charlie1',
  'donald123', 'qwerty12', 'login123', 'welcome1', 'passw0rd',
  'michael1', 'ninja123', 'mustang1', 'jessica1', 'hunter12',
  'summer12', 'qwerty1234', 'zaq12wsx', 'asdfghjk', '1qaz2wsx',
  'qwertyui', '1q2w3e4r', '00000000', '11111111', '1234567890',
];

/**
 * Validate password strength — MUST match packages/core/src/auth.ts validatePassword() exactly.
 * Both client-side and server-side validation must produce identical error messages.
 */
export function validatePassword(pwd: string): string | null {
  if (pwd.length < 10) return '密码长度至少10位';
  if (pwd.length > 128) return '密码长度不能超过128位';
  if (!/[a-zA-Z]/.test(pwd)) return '密码需包含字母';
  if (!/[0-9]/.test(pwd)) return '密码需包含数字';
  if (!/[^a-zA-Z0-9]/.test(pwd)) return '密码需包含特殊符号';
  if (COMMON_PASSWORDS.some(p => pwd.toLowerCase().includes(p))) return '密码不能包含常见词汇';
  return null;
}
