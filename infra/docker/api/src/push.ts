// ─── Push Notification Service (Expo Push API) ───────────────────
// POST /api/push - 注册 Expo push token
// PUT /api/push - 发送推送通知
import { Hono } from 'hono';
import { verifyAuth } from './auth-middleware.js';
import { getPb, escapeFilter } from './pb.js';
import { errStatus } from './errors.js';
import { getClientIp } from './rate-limit.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_BATCH_SIZE = 100;

interface PushToken {
  id: string;
  user_id: string;
  platform: 'web' | 'android' | 'ios';
  token: string;
  created_at: string;
}

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: string;
}

interface ExpoPushResponse {
  data: Array<{
    status: 'ok' | 'error';
    id?: string;
    message?: string;
    details?: { error?: string };
  }>;
}

// Rate limiter for push endpoints
const pushRateLimit = (() => {
  const attempts = new Map<string, { count: number; resetAt: number }>();
  let lastCleanup = 0;
  return (ip: string): boolean => {
    const now = Date.now();
    if (attempts.size > 10_000 || (attempts.size > 0 && now > lastCleanup + 60_000)) {
      for (const [key, entry] of attempts) {
        if (now > entry.resetAt) attempts.delete(key);
      }
      lastCleanup = now;
    }
    const entry = attempts.get(ip);
    if (!entry || now > entry.resetAt) {
      attempts.set(ip, { count: 1, resetAt: now + 60_000 });
      return true;
    }
    if (entry.count >= 30) return false; // 30 req/min
    entry.count++;
    return true;
  };
})();

const app = new Hono();

// ── Register push token ──────────────────────────────────────────
app.post('/push', async (c) => {
  const ip = getClientIp(c);
  if (!pushRateLimit(ip)) {
    return c.json({ error: '请求过于频繁，请稍后再试' }, 429);
  }

  const authToken = c.req.header('authorization')?.slice(7);
  const auth = await verifyAuth(c.req.header('authorization') ?? null);
  if (!auth) return c.json({ error: '未登录' }, 401);

  try {
    const { platform, token } = await c.req.json();

    if (!platform || !token) {
      return c.json({ error: '缺少参数' }, 400);
    }
    if (!['web', 'android', 'ios'].includes(platform)) {
      return c.json({ error: '不支持的平台类型' }, 400);
    }

    const pb = getPb();
    if (authToken) pb.authStore.save(authToken, null);

    // Upsert: check if token already exists for this user
    try {
      const existing = await pb.collection('push_tokens').getFirstListItem(
        `user_id = "${escapeFilter(auth.userId)}" && token = "${escapeFilter(token)}"`
      );
      await pb.collection('push_tokens').update(existing.id, {
        platform,
        updated_at: new Date().toISOString(),
      });
    } catch (lookupErr: unknown) {
      if (errStatus(lookupErr) !== 404) throw lookupErr;
      await pb.collection('push_tokens').create({
        user_id: auth.userId,
        platform,
        token,
      });
    }

    return c.json({ ok: true });
  } catch (err: unknown) {
    return c.json({ error: '注册推送令牌失败' }, 500);
  }
});

// ── Send push notification ───────────────────────────────────────
app.put('/push', async (c) => {
  const ip = getClientIp(c);
  if (!pushRateLimit(ip)) {
    return c.json({ error: '请求过于频繁，请稍后再试' }, 429);
  }

  const authToken = c.req.header('authorization')?.slice(7);
  const auth = await verifyAuth(c.req.header('authorization') ?? null);
  if (!auth) return c.json({ error: '未登录' }, 401);

  try {
    const { targetUserId, payload } = await c.req.json();

    if (!targetUserId || !payload) {
      return c.json({ error: '缺少参数' }, 400);
    }
    if (typeof payload.title !== 'string' || typeof payload.body !== 'string') {
      return c.json({ error: 'payload.title 和 payload.body 必须是字符串' }, 400);
    }

    // 只允许给自己发推送通知
    if (targetUserId !== auth.userId) {
      return c.json({ error: '无权给其他用户发送推送' }, 403);
    }

    const pb = getPb();
    if (authToken) pb.authStore.save(authToken, null);

    // Get all push tokens for target user
    const tokens = await pb.collection('push_tokens').getFullList({
      filter: `user_id = "${escapeFilter(targetUserId)}"`,
    });

    if (tokens.length === 0) {
      return c.json({ ok: true, message: '用户没有注册推送令牌' });
    }

    // Send via Expo Push API (all tokens are Expo tokens)
    const { sent, failedTokenIds } = await sendExpoPush(
      tokens as unknown as PushToken[],
      payload,
    );

    // Clean up permanently invalid tokens
    if (failedTokenIds.length > 0) {
      await Promise.all(
        failedTokenIds.map((id) =>
          pb.collection('push_tokens').delete(id).catch((e: unknown) => {
            console.warn('[push] Failed to delete invalid token:', e instanceof Error ? e.message : e);
          })
        )
      );
    }

    return c.json({
      ok: true,
      sent,
      failed: failedTokenIds.length,
    });
  } catch (err: unknown) {
    return c.json({ error: '发送推送通知失败' }, 500);
  }
});

// ── Delete push token ────────────────────────────────────────────
app.delete('/push', async (c) => {
  const ip = getClientIp(c);
  if (!pushRateLimit(ip)) {
    return c.json({ error: '请求过于频繁，请稍后再试' }, 429);
  }

  const authToken = c.req.header('authorization')?.slice(7);
  const auth = await verifyAuth(c.req.header('authorization') ?? null);
  if (!auth) return c.json({ error: '未登录' }, 401);

  try {
    const pb = getPb();
    if (authToken) pb.authStore.save(authToken, null);

    // Delete all tokens for this user
    const tokens = await pb.collection('push_tokens').getFullList({
      filter: `user_id = "${escapeFilter(auth.userId)}"`,
    });

    for (const token of tokens) {
      await pb.collection('push_tokens').delete(token.id).catch((e: unknown) => {
      console.warn('[push] Delete token error:', e instanceof Error ? e.message : e);
    });
    }

    return c.json({ ok: true, deleted: tokens.length });
  } catch (err: unknown) {
    return c.json({ error: '删除推送令牌失败' }, 500);
  }
});

// ── Expo Push API sender ─────────────────────────────────────────
async function sendExpoPush(
  tokens: PushToken[],
  payload: PushPayload,
): Promise<{ sent: number; failedTokenIds: string[] }> {
  const messages: ExpoPushMessage[] = tokens.map((t) => ({
    to: t.token,
    title: payload.title,
    body: payload.body,
    data: payload.data,
    sound: 'default',
  }));

  const failedTokenIds: string[] = [];
  let sent = 0;

  // Batch in groups of EXPO_BATCH_SIZE
  for (let i = 0; i < messages.length; i += EXPO_BATCH_SIZE) {
    const batch = messages.slice(i, i + EXPO_BATCH_SIZE);
    const batchTokens = tokens.slice(i, i + EXPO_BATCH_SIZE);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // EXPO_ACCESS_TOKEN is optional but recommended for higher rate limits
    const accessToken = process.env.EXPO_ACCESS_TOKEN;
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(batch),
    });

    if (!response.ok) {
      console.error('Expo Push API error:', { status: response.status });
      continue;
    }

    const result: ExpoPushResponse = await response.json();

    for (let j = 0; j < result.data.length; j++) {
      const item = result.data[j];
      if (item.status === 'ok') {
        sent++;
      } else {
        // DeviceNotRegistered → delete token
        const errorCode = item.details?.error;
        if (errorCode === 'DeviceNotRegistered') {
          failedTokenIds.push(batchTokens[j].id);
        } else {
          console.warn('Expo push error for token:', errorCode, item.message);
        }
      }
    }
  }

  return { sent, failedTokenIds };
}

export default app;
