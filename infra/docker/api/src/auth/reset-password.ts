// ─── POST /api/auth/reset-password ───────────────────────────────
import { Hono } from 'hono';
import crypto from 'crypto';
import { getAdminPb, escapeFilter } from '../pb.js';
import { getVerificationCode, deleteVerificationCode } from '../verification-code.js';
import { blacklistToken } from '../token-blacklist.js';
import { getClientIp, resetRateLimit } from '../rate-limit.js';
import { validatePassword, sanitizeError } from '../auth-middleware.js';

const app = new Hono();

app.post('/reset-password', async (c) => {
  const ip = getClientIp(c);
  if (!resetRateLimit(ip)) {
    return c.json({ error: '请求过于频繁，请稍后再试' }, 429);
  }

  try {
    const { email, code, password } = await c.req.json();
    if (!email || !code || !password) {
      return c.json({ error: '缺少必填字段' }, 400);
    }
    if (typeof email !== 'string' || typeof code !== 'string' || typeof password !== 'string') {
      return c.json({ error: '参数类型错误' }, 400);
    }
    if (email.length > 254 || code.length > 10 || password.length > 128) {
      return c.json({ error: '输入长度超出限制' }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return c.json({ error: '邮箱格式不正确' }, 400);
    }

    const pwdError = validatePassword(password);
    if (pwdError) return c.json({ error: pwdError }, 400);

    // 从 PocketBase 获取验证码（持久化存储）
    const record = await getVerificationCode(email);

    if (!record) return c.json({ error: '请先获取验证码' }, 400);
    const codeBuf = Buffer.from(code.padEnd(64, '\0'));
    const recordBuf = Buffer.from(record.code.padEnd(64, '\0'));
    if (!crypto.timingSafeEqual(codeBuf, recordBuf) || code.length !== record.code.length) {
      return c.json({ error: '验证码错误' }, 400);
    }
    if (Date.now() > record.expires_at) return c.json({ error: '验证码已过期' }, 400);

    // Delete used verification code
    await deleteVerificationCode(email);

    // Find user by email and update password
    const pb = await getAdminPb();
    const user = await pb.collection('users').getFirstListItem(`email = "${escapeFilter(email)}"`);
    await pb.collection('users').update(user.id, {
      password,
      passwordConfirm: password,
      password_changed_at: Date.now(),
    });

    // Invalidate the current token by blacklisting it (使用持久化存储)
    try {
      const authHeader = c.req.header('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const parts = token.split('.');
        if (parts.length === 3 && parts[1]) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
          const expiresAt = payload.exp ? payload.exp * 1000 : Date.now() + 7 * 24 * 3600 * 1000;
          await blacklistToken(token, expiresAt);
        }
      }
    } catch (e) {
      console.error('Failed to blacklist token:', e);
    }

    return c.json({ ok: true, message: '密码重置成功，请重新登录' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    const pbStatus = (err as any)?.status;
    const isServerError = pbStatus >= 500 || msg.includes('ECONNREFUSED') || msg.includes('fetch failed') || msg.includes('timeout');
    return c.json({ error: sanitizeError(err, '密码重置失败') }, isServerError ? 500 : 400);
  }
});

export default app;
