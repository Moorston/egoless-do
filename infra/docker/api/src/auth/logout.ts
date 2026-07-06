// ─── POST /api/auth/logout ───────────────────────────────────────
import { Hono } from 'hono';
import { verifyAuth, jwtExp } from '../auth-middleware.js';
import { blacklistToken } from '../token-blacklist.js';
import { revokeAllUserRefreshTokens } from '../token-refresh-rotation.js';
import { getClientIp } from '../rate-limit.js';
import { logAuditEvent, AuditEvent, extractClientInfo } from '../audit-log.js';

const logoutRateLimit = (() => {
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
    if (entry.count >= 10) return false; // 10 req/min
    entry.count++;
    return true;
  };
})();

const app = new Hono();

app.post('/logout', async (c) => {
  const ip = getClientIp(c);
  const clientInfo = extractClientInfo(c);

  if (!logoutRateLimit(ip)) {
    return c.json({ error: '请求过于频繁，请稍后再试' }, 429);
  }
  const auth = c.req.header('authorization') ?? null;
  const authResult = await verifyAuth(auth);
  if (!authResult) {
    return c.json({ error: '未登录' }, 401);
  }
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7);
    const exp = jwtExp(token);
    if (exp === null) {
      return c.json({ error: '无效 token' }, 400);
    }
    const expiresAt = exp * 1000;
    // 将 Token 添加到黑名单（持久化存储）
    await blacklistToken(token, expiresAt);
    // 撤销用户的所有 refresh token
    if (authResult.userId) {
      await revokeAllUserRefreshTokens(authResult.userId);
    }

    // 记录登出事件
    await logAuditEvent({
      event: AuditEvent.LOGOUT,
      user_id: authResult.userId,
      ip: clientInfo.ip,
      user_agent: clientInfo.userAgent,
      success: true,
    });
  }
  return c.json({ ok: true });
});

export default app;
