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
 */
export async function verifyAuth(authHeader: string | null): Promise<{ userId: string } | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);

  // Fast local checks first
  const payload = jwtPayload(token);
  const userId = typeof payload?.id === 'string' ? payload.id : undefined;
  if (!userId || !payload) return null;

  // Check blacklist (for logged-out tokens)
  if (await isBlacklisted(token)) return null;

  try {
    // Verify signature via PocketBase — authRefresh() will throw if the signature is invalid.
    const { getPb } = await import('./pb.js');
    const pb = getPb();
    pb.authStore.save(token, null);
    await pb.collection('users').authRefresh();

    // Check if token was issued before the last password reset
    const iat = typeof payload.iat === 'number' ? payload.iat * 1000 : 0;
    if (iat > 0) {
      try {
        const { getAdminPb } = await import('./pb.js');
        const adminPb = await getAdminPb();
        const user = await adminPb.collection('users').getOne(userId);
        const pwdChangedAt = (user as Record<string, unknown>).password_changed_at;
        if (pwdChangedAt && iat < pwdChangedAt) return null;
      } catch {
        // If user lookup fails, continue (signature already verified)
      }
    }

    // Verify login_epoch — guards against token reuse after re-login
    try {
      const { getAdminPb } = await import('./pb.js');
      const adminPb = await getAdminPb();
      const userProfile = await adminPb.collection('user_profiles').getFirstListItem(`user_id="${userId}"`);
      const profileData = (userProfile as Record<string, unknown>).data;
      if (profileData) {
        const data = typeof profileData === 'string' ? JSON.parse(profileData) : profileData;
        const expectedEpoch = (data as Record<string, unknown>).login_epoch || 0;
        const tokenEpoch = (payload as Record<string, unknown>).epoch || 0;
        if (tokenEpoch < expectedEpoch) {
          return null; // Token was issued before a newer login — reject it
        }
      }
    } catch {
      // Profile not found — allow (fresh accounts may not have profile yet)
    }

    return { userId };
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

/** Validate password strength — must match packages/core/src/auth.ts */
export function validatePassword(pwd: string): string | null {
  if (pwd.length < 10) return '密码需至少10位';
  if (pwd.length > 128) return '密码不能超过128位';
  if (!/[a-zA-Z]/.test(pwd)) return '密码需包含字母';
  if (!/[0-9]/.test(pwd)) return '密码需包含数字';
  if (/^[a-zA-Z0-9]+$/.test(pwd)) return '密码需包含特殊符号';
  if (COMMON_PASSWORDS.some(p => pwd.toLowerCase().includes(p))) return '密码不能包含常见词汇';
  return null;
}
