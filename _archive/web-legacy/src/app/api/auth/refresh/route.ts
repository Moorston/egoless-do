import { NextRequest, NextResponse } from 'next/server';
import { jwtPayload, isBlacklisted } from '../../_auth';
import { getPb } from '../../_pb';
import { TOKEN_EXPIRES_IN } from '../../constants';
import { getClientIp, createRateLimiter } from '../../_rateLimit';

const refreshRateLimit = createRateLimiter(20, 60_000); // 20 req/min

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!refreshRateLimit(ip)) {
    return NextResponse.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 });
  }
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  const token = auth.slice(7);

  // Fast local checks (no network)
  const payload = jwtPayload(token);
  if (!payload?.id) return NextResponse.json({ error: 'Token 无效' }, { status: 401 });

  // Check blacklist (local SQLite)
  if (isBlacklisted(token)) {
    return NextResponse.json({ error: 'Token 已登出' }, { status: 401 });
  }

  try {
    // Single PocketBase call — validates signature + returns new token
    const pb = getPb();
    pb.authStore.save(token, null);
    const authData = await pb.collection('users').authRefresh();

    // Note: refreshToken === token is a PocketBase limitation (no separate refresh token mechanism).
    return NextResponse.json({
      token: authData.token,
      refreshToken: authData.token,
      expiresAt: Date.now() + TOKEN_EXPIRES_IN,
    });
  } catch {
    return NextResponse.json({ error: 'Token 已过期，请重新登录' }, { status: 401 });
  }
}
