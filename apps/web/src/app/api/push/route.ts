import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../_auth';
import { getPb, escapeFilter } from '../_pb';
import { getClientIp, createRateLimiter } from '../_rateLimit';

const pushRateLimit = createRateLimiter(30, 60_000); // 30 req/min

// ── Push notification service (Expo Push API) ───────────────────
// All mobile tokens are Expo Push Tokens, so we use the Expo Push API
// https://docs.expo.dev/push-notifications/sending-notifications/

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

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_BATCH_SIZE = 100;

// ── Register push token ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!pushRateLimit(ip)) {
    return NextResponse.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 });
  }

  const authToken = req.headers.get('authorization')?.slice(7);
  const auth = await verifyAuth(req.headers.get('authorization'));
  if (!auth) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const { platform, token } = await req.json();

    if (!platform || !token) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }
    if (!['web', 'android', 'ios'].includes(platform)) {
      return NextResponse.json({ error: '不支持的平台类型' }, { status: 400 });
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
    } catch (lookupErr: any) {
      if (lookupErr?.status !== 404) throw lookupErr;
      await pb.collection('push_tokens').create({
        user_id: auth.userId,
        platform,
        token,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: '注册推送令牌失败' }, { status: 500 });
  }
}

// ── Send push notification ───────────────────────────────────────
export async function PUT(req: NextRequest) {
  const ip = getClientIp(req);
  if (!pushRateLimit(ip)) {
    return NextResponse.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 });
  }

  const authToken = req.headers.get('authorization')?.slice(7);
  const auth = await verifyAuth(req.headers.get('authorization'));
  if (!auth) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const { targetUserId, payload } = await req.json();

    if (!targetUserId || !payload) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }
    if (typeof payload.title !== 'string' || typeof payload.body !== 'string') {
      return NextResponse.json({ error: 'payload.title 和 payload.body 必须是字符串' }, { status: 400 });
    }

    // 只允许给自己发推送通知
    if (targetUserId !== auth.userId) {
      return NextResponse.json({ error: '无权给其他用户发送推送' }, { status: 403 });
    }

    const pb = getPb();
    if (authToken) pb.authStore.save(authToken, null);

    // Get all push tokens for target user
    const tokens = await pb.collection('push_tokens').getFullList({
      filter: `user_id = "${escapeFilter(targetUserId)}"`,
    });

    if (tokens.length === 0) {
      return NextResponse.json({ ok: true, message: '用户没有注册推送令牌' });
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
          pb.collection('push_tokens').delete(id).catch(console.error)
        )
      );
    }

    return NextResponse.json({
      ok: true,
      sent,
      failed: failedTokenIds.length,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: '发送推送通知失败' }, { status: 500 });
  }
}

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
      const errorText = await response.text().catch(() => '');
      console.error('[Push] Expo Push API error:', response.status, errorText);
      // All tokens in this batch count as failed
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
          console.warn('[Push] Expo push error for token:', errorCode, item.message);
        }
      }
    }
  }

  return { sent, failedTokenIds };
}
