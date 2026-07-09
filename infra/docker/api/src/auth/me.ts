// ─── GET /api/auth/me ────────────────────────────────────────────
import { Hono } from 'hono';
import { verifyAuth } from '../auth-middleware.js';
import { getPb } from '../pb.js';
import { errStatus } from '../errors.js';
import { getClientIp } from '../rate-limit.js';

// NOTE: Uses standalone Map-based rate limiter (not the shared createRateLimiter from rate-limit.ts).
// For multi-instance support, migrate to the shared factory.
const meRateLimit = (() => {
  const attempts = new Map<string, { count: number; resetAt: number }>();
  let lastCleanup = 0;
  return (ip: string): boolean => {
    const now = Date.now();
    if (attempts.size > 10_000 || (attempts.size > 0 && now > lastCleanup + 60_000)) {
      for (const [key, entry] of attempts) {
        if (now > entry.resetAt) attempts.delete(key);
      }
      lastCleanup = now;
    }
    const entry = attempts.get(ip);
    if (!entry || now > entry.resetAt) {
      attempts.set(ip, { count: 1, resetAt: now + 60_000 });
      return true;
    }
    if (entry.count >= 30) return false; // 30 req/min
    entry.count++;
    return true;
  };
})();

const app = new Hono();

app.get('/me', async (c) => {
  const ip = getClientIp(c);
  if (!meRateLimit(ip)) {
    return c.json({ error: '请求过于频繁，请稍后再试' }, 429);
  }
  const token = c.req.header('authorization')?.slice(7);
  const auth = await verifyAuth(c.req.header('authorization') ?? null);
  if (!auth) return c.json({ error: '未登录' }, 401);

  try {
    const pb = getPb();
    if (token) pb.authStore.save(token, null);
    const user = await pb.collection('users').getOne(auth.userId);
    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        createdAt: user.created ? new Date(user.created).getTime() : Date.now(),
      },
    });
  } catch (e: unknown) {
    const status = errStatus(e);
    if (status === 404) return c.json({ error: '用户不存在' }, 404);
    return c.json({ error: '服务器错误' }, 500);
  }
});

export default app;
