import { NextRequest, NextResponse } from 'next/server';
import { getPb } from '../../_pb';
import { TOKEN_EXPIRES_IN } from '../../constants';
import { getClientIp, loginRateLimit } from '../../_rateLimit';

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

    const pb = getPb();
    const authData = await pb.collection('users').authWithPassword(email, password);

    // Note: refreshToken === token is a PocketBase limitation (no separate refresh token mechanism).
    // TOKEN_EXPIRES_IN is set to 2 hours; client should use /auth/refresh before expiry.
    return NextResponse.json({
      user: { id: authData.record.id, email: authData.record.email, name: authData.record.name },
      token: authData.token,
      refreshToken: authData.token,
      expiresAt: Date.now() + TOKEN_EXPIRES_IN,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 });
  }
}
