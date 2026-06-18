import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getPb } from '../../_pb';
import db from '../../_db';
import { TOKEN_EXPIRES_IN } from '../../constants';
import { sanitizeError } from '../../_errors';
import { getClientIp, createRateLimiter } from '../../_rateLimit';

const registerRateLimit = createRateLimiter(5, 60_000); // 5 req/min

function validatePassword(pwd: string): string | null {
  if (pwd.length < 8) return '密码需至少8位';
  if (!/[a-zA-Z]/.test(pwd)) return '密码需包含字母';
  if (!/[0-9]/.test(pwd)) return '密码需包含数字';
  if (/^[a-zA-Z0-9]+$/.test(pwd)) return '密码需包含特殊符号';
  return null;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!registerRateLimit(ip)) {
    return NextResponse.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 });
  }

  try {
    const { email, password, name, code } = await req.json();
    if (!email || !password || !name || !code) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }
    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: '昵称不能为空' }, { status: 400 });
    }
    if (name.length > 50) {
      return NextResponse.json({ error: '昵称不能超过50个字符' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 });
    }

    const pwdError = validatePassword(password);
    if (pwdError) return NextResponse.json({ error: pwdError }, { status: 400 });

    const record = db.prepare(
      'SELECT code, expires_at FROM verification_codes WHERE email = ? ORDER BY created_at DESC LIMIT 1'
    ).get(email) as { code: string; expires_at: number } | undefined;

    if (!record) return NextResponse.json({ error: '请先获取验证码' }, { status: 400 });
    // Constant-time comparison to prevent timing attacks
    if (record.code.length !== code.length || !crypto.timingSafeEqual(Buffer.from(record.code), Buffer.from(code))) {
      return NextResponse.json({ error: '验证码错误' }, { status: 400 });
    }
    if (Date.now() > record.expires_at) return NextResponse.json({ error: '验证码已过期' }, { status: 400 });

    // Delete used verification code to prevent reuse
    db.prepare('DELETE FROM verification_codes WHERE email = ?').run(email);

    const pb = getPb();
    const user = await pb.collection('users').create({
      email, password, passwordConfirm: password, name,
    });

    const authData = await pb.collection('users').authWithPassword(email, password);

    // Note: refreshToken === token is a PocketBase limitation (no separate refresh token mechanism).
    // TOKEN_EXPIRES_IN is set to 7 days; client should use /auth/refresh before expiry.
    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
      token: authData.token,
      refreshToken: authData.token,
      expiresAt: Date.now() + TOKEN_EXPIRES_IN,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    const pbStatus = (err as any)?.status;
    const isServerError = pbStatus >= 500 || msg.includes('ECONNREFUSED') || msg.includes('fetch failed') || msg.includes('timeout');
    return NextResponse.json({ error: sanitizeError(err, '注册失败') }, { status: isServerError ? 500 : 400 });
  }
}
