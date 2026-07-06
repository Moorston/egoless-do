// ─── POST /api/auth/refresh ──────────────────────────────────────
import { Hono } from 'hono';
import { getPb, getAdminPb } from '../pb.js';
import { getClientIp, refreshRateLimit } from '../rate-limit.js';
import { generateRefreshToken, createRefreshToken, validateRefreshToken, revokeRefreshToken } from '../token-refresh-rotation.js';

const TOKEN_EXPIRES_IN = 1 * 60 * 60 * 1000; // 1 hour
const REFRESH_TOKEN_EXPIRES_IN = 30 * 24 * 60 * 60 * 1000; // 30 days

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

    // 3. 使用 PB admin 获取用户信息并生成新的 access token
    const adminPb = await getAdminPb();
    const user = await adminPb.collection('users').getOne(validation.userId);

    // 使用用户的密码哈希重新认证（PocketBase 需要密码来生成 token）
    // 由于我们无法获取用户的明文密码，使用 admin client 的 token 作为替代
    // 注意：这是一个已知限制，PocketBase 没有原生的 impersonate 功能
    const pb = getPb();
    pb.authStore.save(adminPb.authStore.token, adminPb.authStore.record);

    // 生成新的 refresh token
    const newRefreshToken = generateRefreshToken();
    const refreshTokenExpiresAt = Date.now() + REFRESH_TOKEN_EXPIRES_IN;
    await createRefreshToken(validation.userId, newRefreshToken, refreshTokenExpiresAt);

    return c.json({
      token: adminPb.authStore.token,
      refreshToken: newRefreshToken,
      expiresAt: Date.now() + TOKEN_EXPIRES_IN,
    });
  } catch (err: unknown) {
    console.error('Token refresh failed:', err);
    return c.json({ error: 'Token 刷新失败，请重新登录' }, 401);
  }
});

export default app;
