// ─── MFA API 路由 ─────────────────────────────────────────────────
// 提供 MFA 启用、禁用、验证等功能。

import { Hono } from 'hono';
import { verifyAuth } from '../auth-middleware.js';
import { isMFAEnabled, enableMFA, disableMFA, verifyMFACode, getMFAConfig } from '../mfa.js';
import { getMFAChallenge, consumeMFAChallenge } from '../mfaChallenge.js';
import { generateRefreshToken, createRefreshToken } from '../token-refresh-rotation.js';
import { logAuditEvent, AuditEvent, extractClientInfo } from '../audit-log.js';

const TOKEN_EXPIRES_IN = 15 * 24 * 60 * 60 * 1000; // 15 days
const REFRESH_TOKEN_EXPIRES_IN = 30 * 24 * 60 * 60 * 1000; // 30 days

const app = new Hono();

// 检查 MFA 状态
app.get('/status', async (c) => {
  const auth = await verifyAuth(c.req.header('authorization') ?? null);
  if (!auth) return c.json({ error: '未登录' }, 401);

  const enabled = await isMFAEnabled(auth.userId);
  return c.json({ enabled });
});

// 启用 MFA
app.post('/enable', async (c) => {
  const auth = await verifyAuth(c.req.header('authorization') ?? null);
  if (!auth) return c.json({ error: '未登录' }, 401);

  const clientInfo = extractClientInfo(c);

  try {
    const { secret, backupCodes } = await enableMFA(auth.userId);

    // 记录 MFA 启用事件
    await logAuditEvent({
      event: AuditEvent.LOGIN_SUCCESS, // 可以添加 MFA_ENABLED 事件
      user_id: auth.userId,
      ip: clientInfo.ip,
      user_agent: clientInfo.userAgent,
      success: true,
      details: { action: 'mfa_enabled' },
    });

    return c.json({
      secret,
      backupCodes,
      message: 'MFA 已启用，请保存备用恢复代码',
    });
  } catch (err) {
    return c.json({ error: '启用 MFA 失败' }, 500);
  }
});

// 禁用 MFA
app.post('/disable', async (c) => {
  const auth = await verifyAuth(c.req.header('authorization') ?? null);
  if (!auth) return c.json({ error: '未登录' }, 401);

  const clientInfo = extractClientInfo(c);
  const { code } = await c.req.json();

  if (!code) {
    return c.json({ error: '请输入 MFA 代码' }, 400);
  }

  // 验证 MFA 代码
  const isValid = await verifyMFACode(auth.userId, code);
  if (!isValid) {
    return c.json({ error: 'MFA 代码无效' }, 400);
  }

  try {
    await disableMFA(auth.userId);

    // 记录 MFA 禁用事件
    await logAuditEvent({
      event: AuditEvent.LOGIN_SUCCESS, // 可以添加 MFA_DISABLED 事件
      user_id: auth.userId,
      ip: clientInfo.ip,
      user_agent: clientInfo.userAgent,
      success: true,
      details: { action: 'mfa_disabled' },
    });

    return c.json({ message: 'MFA 已禁用' });
  } catch (err) {
    return c.json({ error: '禁用 MFA 失败' }, 500);
  }
});

// 验证 MFA 代码（用于登录时）
app.post('/verify', async (c) => {
  const auth = await verifyAuth(c.req.header('authorization') ?? null);
  if (!auth) return c.json({ error: '未登录' }, 401);

  const { code } = await c.req.json();

  if (!code) {
    return c.json({ error: '请输入 MFA 代码' }, 400);
  }

  const isValid = await verifyMFACode(auth.userId, code);
  return c.json({ valid: isValid });
});

// ── 登录二次验证：用 login/wechat 返回的 mfaToken + TOTP/备用码换取 access token ──
// 不要求 verifyAuth（调用方尚未登录）。挑战令牌单次消费，验证码错误时不消费
// （允许在 TTL 内重试）。
app.post('/verify-login', async (c) => {
  const clientInfo = extractClientInfo(c);
  const { mfaToken, code } = await c.req.json();

  if (!mfaToken || typeof mfaToken !== 'string' || !code || typeof code !== 'string') {
    return c.json({ error: '请提供 mfaToken 和 MFA 代码' }, 400);
  }

  const challenge = getMFAChallenge(mfaToken);
  if (!challenge) {
    return c.json({ error: 'MFA 会话已过期，请重新登录' }, 401);
  }

  const isValid = await verifyMFACode(challenge.userId, code);
  if (!isValid) {
    await logAuditEvent({
      event: AuditEvent.LOGIN_SUCCESS, // 复用事件，details 标记
      user_id: challenge.userId,
      ip: clientInfo.ip,
      user_agent: clientInfo.userAgent,
      success: false,
      details: { action: 'mfa_verify_failed' },
    });
    return c.json({ error: 'MFA 代码无效' }, 400);
  }

  // 验证通过 —— 消费挑战令牌（单次使用），签发 refresh token，返回 access token
  consumeMFAChallenge(mfaToken);
  const refreshToken = generateRefreshToken();
  const refreshTokenExpiresAt = Date.now() + REFRESH_TOKEN_EXPIRES_IN;
  await createRefreshToken(challenge.userId, refreshToken, refreshTokenExpiresAt);

  await logAuditEvent({
    event: AuditEvent.LOGIN_SUCCESS,
    user_id: challenge.userId,
    ip: clientInfo.ip,
    user_agent: clientInfo.userAgent,
    success: true,
    details: { action: 'mfa_verify_success' },
  });

  return c.json({
    user: challenge.user,
    token: challenge.pbToken,
    refreshToken,
    expiresAt: Date.now() + TOKEN_EXPIRES_IN,
  });
});

// 获取 MFA 配置（不包含密钥）
app.get('/config', async (c) => {
  const auth = await verifyAuth(c.req.header('authorization') ?? null);
  if (!auth) return c.json({ error: '未登录' }, 401);

  const config = await getMFAConfig(auth.userId);
  if (!config) {
    return c.json({ enabled: false });
  }

  return c.json({
    enabled: config.enabled,
    hasBackupCodes: config.backup_codes.length > 0,
  });
});

export default app;
