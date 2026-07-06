// ─── POST /api/auth/register ─────────────────────────────────────
import { Hono } from 'hono';
import crypto from 'crypto';
import { getPb } from '../pb.js';
import { errStatus } from '../errors.js';
import { getVerificationCode, deleteVerificationCode } from '../verification-code.js';
import { getClientIp, registerRateLimit } from '../rate-limit.js';
import { validatePassword, sanitizeError } from '../auth-middleware.js';
import { generateRefreshToken, createRefreshToken } from '../token-refresh-rotation.js';

const TOKEN_EXPIRES_IN = 1 * 60 * 60 * 1000; // 1 hour (short-lived access token)
const REFRESH_TOKEN_EXPIRES_IN = 30 * 24 * 60 * 60 * 1000; // 30 days

const app = new Hono();

app.post('/register', async (c) => {
  const ip = getClientIp(c);
  if (!registerRateLimit(ip)) {
    return c.json({ error: '请求过于频繁，请稍后再试' }, 429);
  }

  try {
    const { email, password, name, code } = await c.req.json();
    if (!email || !password || !name || !code) {
      return c.json({ error: '缺少必填字段' }, 400);
    }
    if (typeof email !== 'string' || typeof password !== 'string' || typeof name !== 'string' || typeof code !== 'string') {
      return c.json({ error: '参数类型错误' }, 400);
    }
    if (email.length > 254 || password.length > 128 || name.length > 50 || code.length > 10) {
      return c.json({ error: '输入长度超出限制' }, 400);
    }
    if (name.trim().length === 0) {
      return c.json({ error: '昵称不能为空' }, 400);
    }
    if (name.length > 50) {
      return c.json({ error: '昵称不能超过50个字符' }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return c.json({ error: '邮箱格式不正确' }, 400);
    }

    const pwdError = validatePassword(password);
    if (pwdError) return c.json({ error: pwdError }, 400);

    // 从 PocketBase 获取验证码（持久化存储）
    const record = await getVerificationCode(email);

    if (!record) return c.json({ error: '请先获取验证码' }, 400);
    if (Date.now() > record.expires_at) return c.json({ error: '验证码已过期' }, 400);
    // Constant-time comparison (pad to equal length to avoid timing leak on length)
    const codeBuf = Buffer.from(code.padEnd(64, '\0'));
    const recordBuf = Buffer.from(record.code.padEnd(64, '\0'));
    if (!crypto.timingSafeEqual(codeBuf, recordBuf) || code.length !== record.code.length) {
      return c.json({ error: '验证码错误' }, 400);
    }

    const pb = getPb();
    const user = await pb.collection('users').create({
      email, password, passwordConfirm: password, name,
    });

    const authData = await pb.collection('users').authWithPassword(email, password);

    // Delete used verification code AFTER successful registration
    await deleteVerificationCode(email);

    // 生成独立的 refresh token
    const refreshToken = generateRefreshToken();
    const refreshTokenExpiresAt = Date.now() + REFRESH_TOKEN_EXPIRES_IN;
    await createRefreshToken(user.id, refreshToken, refreshTokenExpiresAt);

    return c.json({
      user: { id: user.id, email: user.email, name: user.name, createdAt: user.created ? new Date(user.created).getTime() : Date.now() },
      token: authData.token,
      refreshToken: refreshToken,
      expiresAt: Date.now() + TOKEN_EXPIRES_IN,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    const pbStatus = errStatus(err);
    const isServerError = (pbStatus != null && pbStatus >= 500) || msg.includes('ECONNREFUSED') || msg.includes('fetch failed') || msg.includes('timeout');
    return c.json({ error: sanitizeError(err, '注册失败') }, isServerError ? 500 : 400);
  }
});

export default app;
