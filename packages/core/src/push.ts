// ─── Push Notification Service ────────────────────────────────────
// Shared across all platforms for registering push tokens and sending notifications

import { buildHeaders, fetchWithTimeout, handleJsonResponse } from './fetch';

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
): Promise<void> {
  try {
    const pushToken = await getToken();
    if (pushToken) {
      await apiRegisterPushToken(authToken, platform, pushToken);
      console.log('[Push] Token registered for', platform);
    }
  } catch (err) {
    console.error('[Push] Failed to register token:', err);
  }
}
