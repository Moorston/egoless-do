import { NextRequest, NextResponse } from 'next/server';
import { getPb } from '../../_pb';
import { TOKEN_EXPIRES_IN } from '../../constants';
import { getClientIp, createRateLimiter } from '../../_rateLimit';

const loginRateLimit = createRateLimiter(5, 60_000);    // 5 req/min per IP
const emailRateLimit = createRateLimiter(10, 300_000);   // 10 req/min per email

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!loginRateLimit(ip)) {
    return NextResponse.json({ error: '登录尝试过于频繁，请稍后再试' }, { status: 429 });
  }

  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: '请输入邮箱和密码' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 });
    }

    // Per-account rate limiting to prevent brute-force on specific accounts
    if (!emailRateLimit(email.toLowerCase())) {
      return NextResponse.json({ error: '该账户登录尝试过于频繁，请稍后再试' }, { status: 429 });
    }

    const pb = getPb();
    const authData = await pb.collection('users').authWithPassword(email, password);

    // Note: refreshToken === token is a PocketBase limitation (no separate refresh token mechanism).
    // TOKEN_EXPIRES_IN is set to 7 days; client should use /auth/refresh before expiry.
    return NextResponse.json({
      user: { id: authData.record.id, email: authData.record.email, name: authData.record.name, createdAt: authData.record.created ? new Date(authData.record.created).getTime() : Date.now() },
      token: authData.token,
      refreshToken: authData.token,
      expiresAt: Date.now() + TOKEN_EXPIRES_IN,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed') || msg.includes('timeout')) {
      return NextResponse.json({ error: '服务暂时不可用，请稍后再试' }, { status: 503 });
    }
    return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 });
  }
}
