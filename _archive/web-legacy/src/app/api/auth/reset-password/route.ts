import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createLogger } from '@egoless-do/core';
import { getAdminPb, escapeFilter } from '../../_pb';
import db from '../../_db';
import { sanitizeError } from '../../_errors';
import { getClientIp, createRateLimiter } from '../../_rateLimit';
import { validatePassword } from '../../_validation';

const log = createLogger('Auth');

const resetRateLimit = createRateLimiter(5, 60_000); // 5 req/min

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!resetRateLimit(ip)) {
    return NextResponse.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 });
  }

  try {
    const { email, code, password } = await req.json();
    if (!email || !code || !password) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 });
    }

    const record = db.prepare(
      'SELECT code, expires_at FROM verification_codes WHERE email = ? ORDER BY created_at DESC LIMIT 1'
    ).get(email) as { code: string; expires_at: number } | undefined;

    if (!record) return NextResponse.json({ error: '请先获取验证码' }, { status: 400 });
    const codeBuf = Buffer.from(code.padEnd(64, '\0'));
    const recordBuf = Buffer.from(record.code.padEnd(64, '\0'));
    if (!crypto.timingSafeEqual(codeBuf, recordBuf) || code.length !== record.code.length) {
      return NextResponse.json({ error: '验证码错误' }, { status: 400 });
    }
    if (Date.now() > record.expires_at) return NextResponse.json({ error: '验证码已过期' }, { status: 400 });

    // Consume the code immediately after verification to prevent reuse
    db.prepare('DELETE FROM verification_codes WHERE email = ?').run(email);

    const pwdError = validatePassword(password);
    if (pwdError) return NextResponse.json({ error: pwdError }, { status: 400 });

    // Find user by email and update password
    const pb = await getAdminPb();
    const user = await pb.collection('users').getFirstListItem(`email = "${escapeFilter(email)}"`);
    await pb.collection('users').update(user.id, {
      password,
      passwordConfirm: password,
      password_changed_at: Date.now(),
    });

    // Invalidate the current token by blacklisting it
    try {
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const parts = token.split('.');
        if (parts.length === 3 && parts[1]) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
          const expiresAt = payload.exp ? payload.exp * 1000 : Date.now() + 7 * 24 * 3600 * 1000;
          db.prepare('INSERT OR IGNORE INTO token_blacklist (token, expires_at) VALUES (?, ?)').run(token, expiresAt);
        }
      }
    } catch (e) {
      log.error('Failed to blacklist token:', e);
    }

    return NextResponse.json({ ok: true, message: '密码重置成功，请重新登录' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    const pbStatus = (err as any)?.status;
    const isServerError = pbStatus >= 500 || msg.includes('ECONNREFUSED') || msg.includes('fetch failed') || msg.includes('timeout');
    return NextResponse.json({ error: sanitizeError(err, '密码重置失败') }, { status: isServerError ? 500 : 400 });
  }
}
