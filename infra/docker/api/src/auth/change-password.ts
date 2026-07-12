// ─── POST /api/auth/change-password ───────────────────────────────
// 已登录用户修改密码：验证旧密码 → 设置新密码 → 注销所有令牌
import { Hono } from 'hono';
import { getClientIp, resetRateLimit } from '../rate-limit.js';
import { validatePassword, sanitizeError } from '../auth-middleware.js';
import { blacklistToken } from '../token-blacklist.js';
import { revokeAllUserRefreshTokens } from '../token-refresh-rotation.js';
import { getPb, getAdminPb } from '../pb.js';

const app = new Hono();

app.post('/change-password', async (c) => {
  const ip = getClientIp(c);
  if (!resetRateLimit(ip)) {
    return c.json({ error: '请求过于频繁，请稍后再试' }, 429);
  }

  try {
    // 1. 鉴权 — 直接使用 PocketBase authRefresh 验证 token
    const authHeader = c.req.header('authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return c.json({ error: '未授权访问' }, 401);
    }
    const token = authHeader.slice(7);

    let userId: string;
    try {
      const pb = getPb();
      pb.authStore.save(token, null);
      await pb.collection('users').authRefresh();
      if (!pb.authStore.model?.id) {
        return c.json({ error: '未授权访问' }, 401);
      }
      userId = pb.authStore.model.id;
    } catch (err) {
      console.error('[change-password] authRefresh failed:', (err as Error)?.message ?? 'unknown');
      return c.json({ error: '未授权访问' }, 401);
    }

    // 2. 解析请求体
    const { currentPassword, newPassword } = await c.req.json();
    if (!currentPassword || !newPassword) {
      return c.json({ error: '请输入当前密码和新密码' }, 400);
    }
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return c.json({ error: '参数类型错误' }, 400);
    }
    if (currentPassword.length > 128 || newPassword.length > 128) {
      return c.json({ error: '输入长度超出限制' }, 400);
    }

    // 3. 校验新密码强度
    const pwdError = validatePassword(newPassword);
    if (pwdError) return c.json({ error: pwdError }, 400);

    // 4. 获取用户邮箱，用 authWithPassword 验证旧密码
    const adminPb = await getAdminPb();
    const userRecord = await adminPb.collection('users').getOne(userId, { fields: 'email,id' });
    const email = (userRecord as Record<string, unknown>).email as string;

    const userPb = getPb();
    try {
      await userPb.collection('users').authWithPassword(email, currentPassword);
    } catch {
      return c.json({ error: '当前密码错误' }, 401);
    }

    // 5. 更新密码
    await adminPb.collection('users').update(userId, {
      password: newPassword,
      passwordConfirm: newPassword,
      password_changed_at: Date.now(),
    });

    // 6. 黑名单当前 token
    try {
      if (authHeader.startsWith('Bearer ')) {
        const parts = token.split('.');
        if (parts.length === 3 && parts[1]) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
          const rawExp = typeof payload.exp === 'number' ? payload.exp : null;
          const nowSec = Math.floor(Date.now() / 1000);
          const maxExp = nowSec + 30 * 24 * 3600;
          const expiresAt = (rawExp && rawExp > nowSec && rawExp <= maxExp)
            ? rawExp * 1000
            : Date.now() + 7 * 24 * 3600 * 1000;
          await blacklistToken(token, expiresAt);
        }
      }
    } catch (e) {
      console.error('Failed to blacklist token:', e);
    }

    // 7. 吊销所有 refresh token
    let revokeFailed = false;
    try {
      await revokeAllUserRefreshTokens(userId);
    } catch (e) {
      console.error('Failed to revoke refresh tokens:', e);
      revokeFailed = true;
    }

    return c.json({
      ok: true,
      message: revokeFailed
        ? '密码修改成功，但其他设备会话可能未被注销。建议登录后手动注销所有设备。'
        : '密码修改成功，请重新登录',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    const isServerError = msg.includes('ECONNREFUSED') || msg.includes('fetch failed') || msg.includes('timeout');
    return c.json({ error: sanitizeError(err, '密码修改失败') }, isServerError ? 500 : 400);
  }
});

export default app;