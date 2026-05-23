// ─── Auth helpers using PocketBase ────────────────────────────────
import { getPb } from './_pb';

function jwtPayload(token: string): Record<string, unknown> | null {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

export function verifyAuth(authHeader: string | null): { userId: string } | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const pb = getPb();
    pb.authStore.save(token, null);
    if (!pb.authStore.isValid) return null;
    const payload = jwtPayload(token);
    const userId = payload?.id as string | undefined;
    if (!userId) return null;
    return { userId };
  } catch {
    return null;
  }
}
