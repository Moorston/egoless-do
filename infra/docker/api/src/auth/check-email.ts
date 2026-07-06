// ─── POST /api/auth/check-email ──────────────────────────────────
import { Hono } from 'hono';
import { getAdminPb, escapeFilter } from '../pb.js';
import { errMessage, errStatus } from '../errors.js';
import { getClientIp, checkEmailRateLimit } from '../rate-limit.js';

const app = new Hono();

app.post('/check-email', async (c) => {
  const ip = getClientIp(c);
  if (!checkEmailRateLimit(ip)) {
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
      return c.json({ available: false });
    } catch (err: unknown) {
      if (errStatus(err) === 404) {
        return c.json({ available: true });
      }
      console.error('check email error:', { status: errStatus(err), message: errMessage(err) });
      return c.json({ available: false, error: '检查失败' }, 500);
    }
  } catch (err) {
    console.error('unexpected error:', err);
    return c.json({ available: false, error: '检查失败' }, 500);
  }
});

export default app;
