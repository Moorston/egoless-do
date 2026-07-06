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
        const pwdChangedAt = (user as any).password_changed_at;
        if (pwdChangedAt && iat < pwdChangedAt) return null;
      } catch {
        // If user lookup fails, continue (signature already verified)
      }
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

/** Validate password strength */
export function validatePassword(pwd: string): string | null {
  if (pwd.length < 8) return '密码需至少8位';
  if (!/[a-zA-Z]/.test(pwd)) return '密码需包含字母';
  if (!/[0-9]/.test(pwd)) return '密码需包含数字';
  if (/^[a-zA-Z0-9]+$/.test(pwd)) return '密码需包含特殊符号';
  return null;
}
