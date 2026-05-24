// ─── Auth helpers using PocketBase ────────────────────────────────
import { getPb } from './_pb';
import db from './_db';

export function jwtPayload(token: string): Record<string, unknown> | null {
  try {
    return JSON.parse(atob(token.split('.')[1]));
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
  const userId = payload?.id as string | undefined;
  if (!userId) return null;

  // Check blacklist (for logged-out tokens)
  if (isBlacklisted(token)) return null;

  try {
    // Verify signature via PocketBase — authRefresh() will throw if the signature is invalid.
    const pb = getPb();
    pb.authStore.save(token, null);
    await pb.collection('users').authRefresh();
    return { userId };
  } catch {
    return null;
  }
}
