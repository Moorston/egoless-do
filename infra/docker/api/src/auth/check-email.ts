// ─── POST /api/auth/check-email ──────────────────────────────────
import { Hono } from 'hono';
import { getAdminPb, escapeFilter } from '../pb.js';
import { errMessage, errStatus } from '../errors.js';
import { getClientIp, checkEmailRateLimit } from '../rate-limit.js';

const app = new Hono();

/** Add a random delay (1-3 s) to slow down user-enumeration attacks */
function captchaDelay(): Promise<void> {
  const ms = 1000 + Math.random() * 2000;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

app.post('/check-email', async (c) => {
  const ip = getClientIp(c);
  if (!checkEmailRateLimit(ip)) {
    // Same delay even on rate-limit to avoid timing oracle
    await captchaDelay();
    return c.json({ available: false, error: '请求过于频繁' }, 429);
  }

  try {
    const { email } = await c.req.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return c.json({ available: false, error: '请输入有效的邮箱地址' }, 400);
    }

    const pb = await getAdminPb();
    try {
      await pb.collection('users').getFirstListItem(`email = "${escapeFilter(email)}"`);
      await captchaDelay();
      return c.json({ available: false });
    } catch (err: unknown) {
      if (errStatus(err) === 404) {
        await captchaDelay();
        return c.json({ available: true });
      }
      console.error('check email error:', { status: errStatus(err), message: errMessage(err) });
      await captchaDelay();
      return c.json({ available: false, error: '检查失败' }, 500);
    }
  } catch (err) {
    console.error('unexpected error:', err);
    await captchaDelay();
    return c.json({ available: false, error: '检查失败' }, 500);
  }
});

export default app;
