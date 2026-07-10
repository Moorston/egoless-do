// ─── POST /api/auth/refresh ──────────────────────────────────────
import { Hono } from 'hono';
import { getClientIp, refreshRateLimit } from '../rate-limit.js';
import { generateRefreshToken, createRefreshToken, validateRefreshToken, revokeRefreshToken } from '../token-refresh-rotation.js';
import { getInternalSecret } from '../config.js';

const TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60 * 1000; // 7 days
const REFRESH_TOKEN_EXPIRES_IN = 30 * 24 * 60 * 60 * 1000; // 30 days

const PB_URL = process.env.PB_URL ?? 'http://localhost:8090';

const app = new Hono();

app.post('/refresh', async (c) => {
  const ip = getClientIp(c);
  if (!refreshRateLimit(ip)) {
    return c.json({ error: '请求过于频繁，请稍后再试' }, 429);
  }

  try {
    const { refreshToken } = await c.req.json();
    if (!refreshToken || typeof refreshToken !== 'string') {
      return c.json({ error: '缺少 refreshToken' }, 400);
    }

    // 1. 验证 refresh token
    const validation = await validateRefreshToken(refreshToken);
    if (!validation.valid || !validation.userId) {
      return c.json({ error: 'Refresh token 无效或已过期，请重新登录' }, 401);
    }

    // 2. 撤销旧的 refresh token（轮换）
    await revokeRefreshToken(refreshToken);

    // 3. 通过 PB hook 签发用户 scoped token（而非 admin token）
    let userToken: string;
    try {
      const resp = await fetch(`${PB_URL}/api/auth/user-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': getInternalSecret(),
        },
        body: JSON.stringify({ userId: validation.userId }),
      });
      if (!resp.ok) {
        throw new Error(`PB user-token endpoint returned ${resp.status}`);
      }
      const data = await resp.json() as { token: string };
      userToken = data.token;
    } catch (tokenErr) {
      // Sanitize: log only error code, not message (may contain tokens)
      console.error('Failed to get user token from PB:', (tokenErr as Record<string, unknown>).code ?? (tokenErr instanceof Error ? tokenErr.name : 'unknown'));
      return c.json({ error: 'Token 签发失败，请重新登录' }, 500);
    }

    // 4. 生成新的 refresh token
    const newRefreshToken = generateRefreshToken();
    const refreshTokenExpiresAt = Date.now() + REFRESH_TOKEN_EXPIRES_IN;
    await createRefreshToken(validation.userId, newRefreshToken, refreshTokenExpiresAt);

    return c.json({
      token: userToken,
      refreshToken: newRefreshToken,
      expiresAt: Date.now() + TOKEN_EXPIRES_IN,
    });
  } catch (err: unknown) {
    // Sanitize: log only error code, not message (may contain tokens)
    console.error('Token refresh failed:', (err as Record<string, unknown>).code ?? (err instanceof Error ? err.name : 'unknown'));
    return c.json({ error: 'Token 刷新失败，请重新登录' }, 401);
  }
});

export default app;
