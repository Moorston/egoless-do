import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getPb } from '../../_pb';
import db from '../../_db';
import { TOKEN_EXPIRES_IN } from '../../constants';
import { sanitizeError } from '../../_errors';

function validatePassword(pwd: string): string | null {
  if (pwd.length < 8) return '密码需至少8位';
  if (!/[a-zA-Z]/.test(pwd)) return '密码需包含字母';
  if (!/[0-9]/.test(pwd)) return '密码需包含数字';
  if (/^[a-zA-Z0-9]+$/.test(pwd)) return '密码需包含特殊符号';
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, code } = await req.json();
    if (!email || !password || !name || !code) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    const pwdError = validatePassword(password);
    if (pwdError) return NextResponse.json({ error: pwdError }, { status: 400 });

    const record = db.prepare(
      'SELECT code, expires_at FROM verification_codes WHERE email = ? ORDER BY created_at DESC LIMIT 1'
    ).get(email) as { code: string; expires_at: number } | undefined;

    if (!record) return NextResponse.json({ error: '请先获取验证码' }, { status: 400 });
    // Constant-time comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(Buffer.from(record.code), Buffer.from(code))) {
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
    // TOKEN_EXPIRES_IN is set to 2 hours; client should use /auth/refresh before expiry.
    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
      token: authData.token,
      refreshToken: authData.token,
      expiresAt: Date.now() + TOKEN_EXPIRES_IN,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: sanitizeError(err, '注册失败') }, { status: 400 });
  }
}
