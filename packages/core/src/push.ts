// ─── Push Notification Service ────────────────────────────────────
// Shared across all platforms for registering push tokens and sending notifications

import { buildHeaders, fetchWithTimeout, handleJsonResponse } from './fetch';
import { createLogger } from './logger';

const log = createLogger('Push');

export type PushPlatform = 'web' | 'android' | 'ios';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface PushToken {
  id: string;
  user_id: string;
  platform: PushPlatform;
  token: string;
  created_at: string;
}

let apiBase = '';

export function setPushApiBase(base: string) {
  apiBase = base.replace(/\/+$/, '');
}

// ── Register push token ──────────────────────────────────────────

export async function apiRegisterPushToken(
  authToken: string,
  platform: PushPlatform,
  pushToken: string
): Promise<{ ok: boolean }> {
  const res = await fetchWithTimeout(`${apiBase}/api/push`, {
    method: 'POST',
    headers: buildHeaders(authToken),
    body: JSON.stringify({ platform, token: pushToken }),
  });
  return handleJsonResponse<{ ok: boolean }>(res);
}

// ── Send push notification ───────────────────────────────────────

export async function apiSendPushNotification(
  authToken: string,
  targetUserId: string,
  payload: PushPayload
): Promise<{ ok: boolean; sent: number; failed: number }> {
  const res = await fetchWithTimeout(`${apiBase}/api/push`, {
    method: 'PUT',
    headers: buildHeaders(authToken),
    body: JSON.stringify({ targetUserId, payload }),
  });
  return handleJsonResponse<{ ok: boolean; sent: number; failed: number }>(res);
}

// ── Helper: Register token for current platform ──────────────────

export async function registerPushToken(
  authToken: string,
  platform: PushPlatform,
  getToken: () => Promise<string | null>
): Promise<'ok' | 'auth_error' | 'skipped'> {
  try {
    const pushToken = await getToken();
    if (!pushToken) return 'skipped';
    await apiRegisterPushToken(authToken, platform, pushToken);
    log.info('Token registered for', platform);
    return 'ok';
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('未登录') || msg.includes('401') || msg.includes('auth')) {
      log.info('Push token registration deferred — auth not ready');
      throw err;
    }
    log.error(err, { message: 'Failed to register token' });
    throw err;
  }
}
