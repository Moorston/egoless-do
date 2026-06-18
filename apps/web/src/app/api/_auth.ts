// ─── Auth helpers using PocketBase ────────────────────────────────
import { getPb } from './_pb';
import db from './_db';

function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  return atob(padded);
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

export function isBlacklisted(token: string): boolean {
  const row = db.prepare('SELECT 1 FROM token_blacklist WHERE token = ? LIMIT 1').get(token);
  return !!row;
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
  if (!userId) return null;

  // Check blacklist (for logged-out tokens)
  if (isBlacklisted(token)) return null;

  try {
    // Verify signature via PocketBase — authRefresh() will throw if the signature is invalid.
    const pb = getPb();
    pb.authStore.save(token, null);
    await pb.collection('users').authRefresh();

    // Check if token was issued before the last password reset
    const iat = typeof payload.iat === 'number' ? payload.iat * 1000 : 0;
    if (iat > 0) {
      try {
        const user = await pb.collection('users').getOne(userId);
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
