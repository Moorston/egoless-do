// ─── 账户锁定服务 ─────────────────────────────────────────────────
// 实现账户锁定机制，防止暴力破解攻击。
// 连续登录失败超过阈值后，账户会被锁定一段时间。

import { getAdminPb, escapeFilter } from './pb.js';
import { errMessage, errStatus } from './errors.js';

const COLLECTION_NAME = 'account_lockouts';

// 配置
const MAX_LOGIN_ATTEMPTS = 5;  // 最大登录尝试次数
const LOCKOUT_DURATION = 15 * 60 * 1000;  // 锁定时长：15 分钟
const ATTEMPT_WINDOW = 5 * 60 * 1000;  // 尝计数窗口：5 分钟

// 内存锁：防止同一邮箱的并发登录尝试绕过计数
const emailLocks = new Map<string, Promise<void>>();
async function withEmailLock<T>(email: string, fn: () => Promise<T>): Promise<T> {
  const prev = emailLocks.get(email) ?? Promise.resolve();
  const { promise, resolve } = Promise.withResolvers<void>();
  const chained = prev.then(() => promise);
  emailLocks.set(email, chained);
  try {
    await prev;
    return await fn();
  } finally {
    resolve();
    // Only delete if this is still the latest lock in the chain
    if (emailLocks.get(email) === chained) {
      emailLocks.delete(email);
    }
  }
}

export interface AccountLockout {
  id?: string;
  email: string;
  login_attempts: number;
  last_attempt_at: number;
  lockout_until: number | null;
  created_at: number;
  updated_at: number;
}

/**
 * 检查账户是否被锁定
 */
export async function isAccountLocked(email: string): Promise<{ locked: boolean; lockoutUntil?: number }> {
  try {
    const pb = await getAdminPb();
    const record = await pb.collection(COLLECTION_NAME).getFirstListItem(
      `email = "${escapeFilter(email)}"`
    );

    // 检查是否在锁定期内
    if (record.lockout_until && record.lockout_until > Date.now()) {
      return { locked: true, lockoutUntil: record.lockout_until };
    }

    // 检查是否在尝试窗口内
    const timeSinceLastAttempt = Date.now() - record.last_attempt_at;
    if (timeSinceLastAttempt > ATTEMPT_WINDOW) {
      // 超过窗口期，重置计数
      await pb.collection(COLLECTION_NAME).update(record.id, {
        login_attempts: 0,
        lockout_until: null,
        updated_at: Date.now(),
      });
      return { locked: false };
    }

    return { locked: false };
  } catch (err: unknown) {
    if (errStatus(err) === 404) return { locked: false };
    console.warn('Failed to check account lockout:', errMessage(err));
    return { locked: false };
  }
}

/**
 * 记录登录尝试
 */
export async function recordLoginAttempt(email: string, success: boolean): Promise<{ locked: boolean; lockoutUntil?: number }> {
  return withEmailLock(email, () => recordLoginAttemptLocked(email, success));
}

async function recordLoginAttemptLocked(email: string, success: boolean): Promise<{ locked: boolean; lockoutUntil?: number }> {
  try {
    const pb = await getAdminPb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PB record type
    let record: any;

    try {
      record = await pb.collection(COLLECTION_NAME).getFirstListItem(
        `email = "${escapeFilter(email)}"`
      );
    } catch (err: unknown) {
      if (errStatus(err) === 404) {
        // 创建新记录
        record = await pb.collection(COLLECTION_NAME).create({
          email,
          login_attempts: 0,
          last_attempt_at: Date.now(),
          lockout_until: null,
          created_at: Date.now(),
          updated_at: Date.now(),
        });
      } else {
        throw err;
      }
    }

    if (success) {
      // 登录成功，重置计数
      await pb.collection(COLLECTION_NAME).update(record.id, {
        login_attempts: 0,
        lockout_until: null,
        last_attempt_at: Date.now(),
        updated_at: Date.now(),
      });
      return { locked: false };
    }

    // 登录失败，增加计数
    const timeSinceLastAttempt = Date.now() - record.last_attempt_at;
    let attempts = record.login_attempts || 0;

    // 如果超过窗口期，重置计数
    if (timeSinceLastAttempt > ATTEMPT_WINDOW) {
      attempts = 0;
    }

    attempts++;

    // 检查是否需要锁定
    let lockoutUntil = record.lockout_until;
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      lockoutUntil = Date.now() + LOCKOUT_DURATION;
    }

    await pb.collection(COLLECTION_NAME).update(record.id, {
      login_attempts: attempts,
      last_attempt_at: Date.now(),
      lockout_until: lockoutUntil,
      updated_at: Date.now(),
    });

    return {
      locked: attempts >= MAX_LOGIN_ATTEMPTS,
      lockoutUntil: attempts >= MAX_LOGIN_ATTEMPTS ? lockoutUntil : undefined,
    };
  } catch (err: unknown) {
    console.warn('Failed to record login attempt:', errMessage(err));
    return { locked: false };
  }
}

/**
 * 清理过期的锁定记录
 */
export async function cleanupExpiredLockouts(): Promise<number> {
  try {
    const pb = await getAdminPb();
    // Use `> 0` filter instead of `!= null` — the `!= null` syntax may not work
    // across all PocketBase versions. Since lockout_until is a positive epoch ms
    // value when set, `> 0` reliably selects locked-out records.
    // Wrapped in try/catch because `getFullList` can fail on PB version mismatches.
    let expired: Array<{ id: string }>;
    try {
      expired = await pb.collection(COLLECTION_NAME).getFullList({
        filter: `lockout_until < ${Date.now()} && lockout_until > 0`,
      });
    } catch (filterErr) {
      // Fallback: if the filter syntax is still unsupported, log and bail
      console.warn('[AccountLockout] Lockout cleanup filter failed, skipping:', errMessage(filterErr));
      return 0;
    }

    let cleaned = 0;
    for (const record of expired) {
      try {
        await pb.collection(COLLECTION_NAME).update(record.id, {
          login_attempts: 0,
          lockout_until: null,
          updated_at: Date.now(),
        });
        cleaned++;
      } catch (err) {
        console.warn('[AccountLockout] Skipping single record update:', errMessage(err));
      }
    }
    return cleaned;
  } catch (err: unknown) {
    console.warn('Lockout cleanup failed:', errMessage(err));
    return 0;
  }
}

/**
 * 初始化账户锁定集合
 */
export async function initAccountLockoutCollection(): Promise<void> {
  try {
    const pb = await getAdminPb();
    await pb.collections.getOne(COLLECTION_NAME);
    console.info(`[AccountLockout] Collection '${COLLECTION_NAME}' exists`);
  } catch (err: unknown) {
    if (errStatus(err) === 404) {
      console.info(`[AccountLockout] Collection '${COLLECTION_NAME}' not found, creating...`);
      try {
        const pb = await getAdminPb();
        await pb.collections.create({
          name: COLLECTION_NAME,
          type: 'base',
          fields: [
            { name: 'email', type: 'text', required: true },
            { name: 'login_attempts', type: 'number', required: true },
            { name: 'last_attempt_at', type: 'number', required: true },
            { name: 'lockout_until', type: 'number' },
            { name: 'created_at', type: 'number', required: true },
            { name: 'updated_at', type: 'number', required: true },
          ],
          listRule: null,  // 禁止公开列出
          viewRule: null,  // 禁止公开查看
          createRule: null,  // 仅系统可创建
          updateRule: null,  // 仅系统可更新
          deleteRule: null,
        });
        console.info(`[AccountLockout] Collection '${COLLECTION_NAME}' created`);
      } catch (createErr: unknown) {
        console.error(`[AccountLockout] Failed to create collection: ${errMessage(createErr)}`);
      }
    } else {
      console.error(`[AccountLockout] Failed to check collection: ${errMessage(err)}`);
    }
  }
}

/**
 * 获取剩余锁定时间（秒）
 */
export function getRemainingLockoutTime(lockoutUntil: number): number {
  const remaining = lockoutUntil - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}
