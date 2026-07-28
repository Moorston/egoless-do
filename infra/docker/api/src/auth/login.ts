// ─── POST /api/auth/login ────────────────────────────────────────
import { Hono } from 'hono';
import { getPb } from '../pb.js';
import { getClientIp, loginRateLimit, emailRateLimit } from '../rate-limit.js';
import { isAccountLocked, recordLoginAttempt, getRemainingLockoutTime } from '../account-lockout.js';
import { logAuditEvent, AuditEvent, extractClientInfo } from '../audit-log.js';
import { generateRefreshToken, createRefreshToken } from '../token-refresh-rotation.js';
import { isMFAEnabled } from '../mfa.js';
import { createMFAChallenge } from '../mfaChallenge.js';

const TOKEN_EXPIRES_IN = 15 * 24 * 60 * 60 * 1000; // 15 days
const REFRESH_TOKEN_EXPIRES_IN = 30 * 24 * 60 * 60 * 1000; // 30 days

const app = new Hono();

app.post('/login', async (c) => {
  const ip = getClientIp(c);
  const clientInfo = extractClientInfo(c);

  if (!loginRateLimit(ip)) {
    // 记录限流事件
    await logAuditEvent({
      event: AuditEvent.RATE_LIMIT_EXCEEDED,
      ip: clientInfo.ip,
      user_agent: clientInfo.userAgent,
      success: false,
      details: { endpoint: 'login' },
    });
    return c.json({ error: '登录尝试过于频繁，请稍后再试' }, 429);
  }

  const { email, password } = await c.req.json();
  if (!email || !password) {
    return c.json({ error: '请输入邮箱和密码' }, 400);
  }
  if (typeof email !== 'string' || typeof password !== 'string') {
    return c.json({ error: '参数类型错误' }, 400);
  }
  if (email.length > 254 || password.length > 128) {
    return c.json({ error: '输入长度超出限制' }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json({ error: '邮箱格式不正确' }, 400);
  }

  // Per-account rate limiting to prevent brute-force on specific accounts
  if (!emailRateLimit(email.toLowerCase())) {
    return c.json({ error: '该账户登录尝试过于频繁，请稍后再试' }, 429);
  }

  // 检查账户是否被锁定
  const lockStatus = await isAccountLocked(email.toLowerCase());
  if (lockStatus.locked) {
    const remainingSeconds = getRemainingLockoutTime(lockStatus.lockoutUntil!);
    // 记录锁定事件
    await logAuditEvent({
      event: AuditEvent.LOGIN_LOCKED,
      email: email.toLowerCase(),
      ip: clientInfo.ip,
      user_agent: clientInfo.userAgent,
      success: false,
      details: { lockoutUntil: lockStatus.lockoutUntil },
    });
    return c.json({
      error: `账户已被锁定，请 ${Math.ceil(remainingSeconds / 60)} 分钟后再试`,
      lockoutUntil: lockStatus.lockoutUntil,
    }, 429);
  }

  try {
    const pb = getPb();
    const authData = await pb.collection('users').authWithPassword(email, password);

    // 登录成功，记录成功尝试
    await recordLoginAttempt(email.toLowerCase(), true);

    // 记录成功登录事件
    await logAuditEvent({
      event: AuditEvent.LOGIN_SUCCESS,
      user_id: authData.record.id,
      email: email.toLowerCase(),
      ip: clientInfo.ip,
      user_agent: clientInfo.userAgent,
      success: true,
    });

    // ── MFA step-up: 如果用户启用了 MFA，不直接返回 access token ──
    // 改为签发短时效挑战令牌，客户端需调用 /api/auth/mfa/verify-login
    // 完成 TOTP/备用码验证后才能换取 access token。防止密码登录绕过 MFA。
    const mfaEnabled = await isMFAEnabled(authData.record.id);
    if (mfaEnabled) {
      const user = {
        id: authData.record.id,
        email: authData.record.email,
        name: authData.record.name,
        createdAt: authData.record.created ? new Date(authData.record.created).getTime() : Date.now(),
      };
      const challenge = createMFAChallenge(authData.record.id, authData.token, user);
      await logAuditEvent({
        event: AuditEvent.LOGIN_SUCCESS,
        user_id: authData.record.id,
        email: email.toLowerCase(),
        ip: clientInfo.ip,
        user_agent: clientInfo.userAgent,
        success: true,
        details: { action: 'mfa_challenge_issued' },
      });
      return c.json({
        mfaRequired: true,
        mfaToken: challenge.mfaToken,
        expiresAt: challenge.expiresAt,
      });
    }

    // 生成独立的 refresh token
    const refreshToken = generateRefreshToken();
    const refreshTokenExpiresAt = Date.now() + REFRESH_TOKEN_EXPIRES_IN;
    await createRefreshToken(authData.record.id, refreshToken, refreshTokenExpiresAt);

    return c.json({
      user: {
        id: authData.record.id,
        email: authData.record.email,
        name: authData.record.name,
        createdAt: authData.record.created ? new Date(authData.record.created).getTime() : Date.now(),
      },
      token: authData.token,
      refreshToken: refreshToken,
      expiresAt: Date.now() + TOKEN_EXPIRES_IN,
    });
  } catch (err: unknown) {
    // 登录失败，记录失败尝试
    const lockResult = await recordLoginAttempt(email.toLowerCase(), false);

    // 记录失败登录事件 (sanitize error to avoid leaking passwords/tokens in audit log)
    const errCode = (err instanceof Error && 'status' in err) ? (err as Record<string, unknown>).status : 'unknown';
    await logAuditEvent({
      event: AuditEvent.LOGIN_FAILURE,
      email: email.toLowerCase(),
      ip: clientInfo.ip,
      user_agent: clientInfo.userAgent,
      success: false,
      details: {
        error: `auth_failed_${errCode}`,
        locked: lockResult.locked,
      },
    });

    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed') || msg.includes('timeout')) {
      return c.json({ error: '服务暂时不可用，请稍后再试' }, 503);
    }

    // 如果账户被锁定，返回锁定信息
    if (lockResult.locked) {
      const remainingSeconds = getRemainingLockoutTime(lockResult.lockoutUntil!);
      // 记录锁定事件
      await logAuditEvent({
        event: AuditEvent.LOGIN_LOCKED,
        email: email.toLowerCase(),
        ip: clientInfo.ip,
        user_agent: clientInfo.userAgent,
        success: false,
        details: { lockoutUntil: lockResult.lockoutUntil },
      });
      return c.json({
        error: `登录失败次数过多，账户已被锁定 ${Math.ceil(remainingSeconds / 60)} 分钟`,
        lockoutUntil: lockResult.lockoutUntil,
      }, 429);
    }

    return c.json({ error: '邮箱或密码错误' }, 401);
  }
});

export default app;
