// ─── MFA 登录挑战令牌 (login challenge token) ─────────────────────
// 当用户已启用 MFA 时，login/wechat 不直接返回 PB access token，
// 而是签发一个短时效的挑战令牌 (mfaToken)，客户端凭此 + TOTP/备用码
// 调用 /api/auth/mfa/verify-login 完成二次验证后才换取 access token。
//
// 存储为进程内 Map + TTL（5 分钟）。重启进程会丢失未完成的挑战 ——
// 用户重新登录即可，可接受。挑战令牌为 256-bit 随机，单次消费。

import crypto from 'crypto';

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 分钟
const CLEANUP_INTERVAL_MS = 60 * 1000;

interface MFAChallenge {
  userId: string;
  pbToken: string;
  user: { id: string; email?: string; name?: string; avatar?: string; createdAt?: number };
  expiresAt: number;
}

const _challenges = new Map<string, MFAChallenge>();

// 周期性清理过期挑战，避免内存泄漏
let _cleanupTimer: ReturnType<typeof setInterval> | null = null;
function ensureCleanup() {
  if (_cleanupTimer) return;
  _cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of _challenges) {
      if (v.expiresAt <= now) _challenges.delete(k);
    }
  }, CLEANUP_INTERVAL_MS);
  // 不阻止进程退出
  if (_cleanupTimer && typeof _cleanupTimer.unref === 'function') _cleanupTimer.unref();
}

/**
 * 签发 MFA 挑战令牌：暂存 {userId, pbToken, user}，返回不透明令牌。
 * 调用方在确认 isMFAEnabled(userId) 为 true 后使用。
 */
export function createMFAChallenge(
  userId: string,
  pbToken: string,
  user: { id: string; email?: string; name?: string; avatar?: string; createdAt?: number },
): { mfaToken: string; expiresAt: number } {
  ensureCleanup();
  const mfaToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;
  _challenges.set(mfaToken, { userId, pbToken, user, expiresAt });
  return { mfaToken, expiresAt };
}

/**
 * 查看挑战（不消费）——用于 verify-login 在验证码错误时允许重试。
 * 返回 null 表示令牌不存在或已过期。
 */
export function getMFAChallenge(mfaToken: string): MFAChallenge | null {
  const entry = _challenges.get(mfaToken);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    _challenges.delete(mfaToken);
    return null;
  }
  return entry;
}

/**
 * 消费挑战（验证码正确后调用）：返回并删除条目。令牌单次使用。
 */
export function consumeMFAChallenge(mfaToken: string): MFAChallenge | null {
  const entry = getMFAChallenge(mfaToken);
  if (entry) _challenges.delete(mfaToken);
  return entry;
}
