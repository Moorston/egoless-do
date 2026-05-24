// ─── Push Notification Service ────────────────────────────────────
// Shared across all platforms for registering push tokens and sending notifications

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

const REQUEST_TIMEOUT = 15000;

let apiBase = '';

export function setPushApiBase(base: string) {
  apiBase = base.replace(/\/+$/, '');
}

function headers(token?: string): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function fetchWithTimeout(url: string, init: any): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT) as any;
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error('请求超时，请检查网络');
    throw new Error('网络连接失败');
  } finally {
    clearTimeout(timer);
  }
}

async function handleRes(res: Response) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? '请求失败');
  return data;
}

// ── Register push token ──────────────────────────────────────────

export async function apiRegisterPushToken(
  authToken: string,
  platform: PushPlatform,
  pushToken: string
): Promise<{ ok: boolean }> {
  const res = await fetchWithTimeout(`${apiBase}/api/push`, {
    method: 'POST',
    headers: headers(authToken),
    body: JSON.stringify({ platform, token: pushToken }),
  });
  return handleRes(res);
}

// ── Send push notification ───────────────────────────────────────

export async function apiSendPushNotification(
  authToken: string,
  targetUserId: string,
  payload: PushPayload
): Promise<{ ok: boolean; sent: number; failed: number }> {
  const res = await fetchWithTimeout(`${apiBase}/api/push`, {
    method: 'PUT',
    headers: headers(authToken),
    body: JSON.stringify({ targetUserId, payload }),
  });
  return handleRes(res);
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
