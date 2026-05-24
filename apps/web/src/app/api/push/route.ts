import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../_auth';
import { getPb } from '../_pb';

// ── Push notification service ────────────────────────────────────
// Supports FCM (Android), APNs (iOS), and Web Push

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

// ── Register push token ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req.headers.get('authorization'));
  if (!auth) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const { platform, token } = await req.json();

    if (!platform || !token) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    const pb = getPb();

    // Check if token already exists
    try {
      const existing = await pb.collection('push_tokens').getFirstListItem(
        `user_id = "${auth.userId}" && token = "${token}"`
      );
      // Update existing token
      await pb.collection('push_tokens').update(existing.id, {
        platform,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // Create new token
      await pb.collection('push_tokens').create({
        user_id: auth.userId,
        platform,
        token,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '注册推送令牌失败' }, { status: 500 });
  }
}

// ── Send push notification ───────────────────────────────────────
export async function PUT(req: NextRequest) {
  const auth = await verifyAuth(req.headers.get('authorization'));
  if (!auth) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const { targetUserId, payload } = await req.json();

    if (!targetUserId || !payload) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    const pb = getPb();

    // Get all push tokens for target user
    const tokens = await pb.collection('push_tokens').getFullList({
      filter: `user_id = "${targetUserId}"`,
    });

    if (tokens.length === 0) {
      return NextResponse.json({ ok: true, message: '用户没有注册推送令牌' });
    }

    // Send push notifications based on platform
    const results = await Promise.allSettled(
      tokens.map(async (tokenRecord) => {
        const { platform, token } = tokenRecord as unknown as PushToken;

        switch (platform) {
          case 'android':
            return sendFCM(token, payload);
          case 'ios':
            return sendAPNs(token, payload);
          case 'web':
            return sendWebPush(token, payload);
          default:
            throw new Error(`Unsupported platform: ${platform}`);
        }
      })
    );

    // Clean up failed tokens
    const failedTokens = tokens.filter((_, i) => results[i].status === 'rejected');
    if (failedTokens.length > 0) {
      await Promise.all(
        failedTokens.map((token) =>
          pb.collection('push_tokens').delete(token.id).catch(() => {})
        )
      );
    }

    return NextResponse.json({
      ok: true,
      sent: tokens.length - failedTokens.length,
      failed: failedTokens.length,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '发送推送通知失败' }, { status: 500 });
  }
}

// ── Platform-specific push implementations ───────────────────────

async function sendFCM(token: string, payload: PushPayload): Promise<void> {
  const fcmServerKey = process.env.FCM_SERVER_KEY;
  if (!fcmServerKey) {
    throw new Error('FCM_SERVER_KEY not configured');
  }

  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `key=${fcmServerKey}`,
    },
    body: JSON.stringify({
      to: token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
    }),
  });

  if (!response.ok) {
    throw new Error(`FCM request failed: ${response.status}`);
  }
}

async function sendAPNs(token: string, payload: PushPayload): Promise<void> {
  // APNs implementation would go here
  // This requires a proper APNs client library like 'apn' or 'node-apn'
  // For now, we'll just log it
  console.log('[APNs] Would send to:', token, payload);
  throw new Error('APNs not implemented yet');
}

async function sendWebPush(token: string, payload: PushPayload): Promise<void> {
  // Web Push implementation would go here
  // This requires a proper Web Push library like 'web-push'
  // For now, we'll just log it
  console.log('[WebPush] Would send to:', token, payload);
  throw new Error('WebPush not implemented yet');
}
