// ─── Token 刷新轮换服务 ─────────────────────────────────────────
// 实现 refresh token 轮换机制，提高 token 安全性。
// 每次使用 refresh token 时，旧的 token 会失效，新的 token 会发放。

import { randomBytes } from 'crypto';
import { getAdminPb, escapeFilter } from './pb.js';
import { errStatus } from './errors.js';

const COLLECTION_NAME = 'refresh_tokens';

/** Safely extract an error identifier without leaking token data in logs. */
function safeErrId(err: unknown): string {
  const status = errStatus(err);
  if (status) return `status_${status}`;
  if (err instanceof Error) return err.name;
  return 'unknown';
}

/**
 * 生成密码学安全的 refresh token
 * 使用 32 字节随机数，输出 64 字符的十六进制字符串
 */
export function generateRefreshToken(): string {
  return randomBytes(32).toString('hex');
}

export interface RefreshTokenRecord {
  id?: string;
  user_id: string;
  token: string;
  expires_at: number;
  created_at: number;
  used_at?: number;
  is_revoked: boolean;
}

/**
 * 创建新的 refresh token
 */
export async function createRefreshToken(userId: string, token: string, expiresAt: number): Promise<void> {
  try {
    const pb = await getAdminPb();
    await pb.collection(COLLECTION_NAME).create({
      user_id: userId,
      token,
      expires_at: expiresAt,
      created_at: Date.now(),
      is_revoked: false,
    });
  } catch (err: unknown) {
    console.error('Failed to create refresh token:', safeErrId(err));
    throw new Error('Failed to create refresh token'); // Re-throw so callers know it failed
  }
}

/**
 * 校验+撤销 refresh token（防并发竞态）
 * 策略：find → revoke → re-read 验证 used_at 是否匹配。
 * 如果两个并发请求都通过了 find，后到的 re-read 会发现 used_at 不匹配。
 * 注意：PocketBase 不支持原子 UPDATE...RETURNING，仍有微小竞态窗口，
 * 但 post-revoke 验证将窗口从"无限"缩小到"两个 PB 请求之间"。
 */
export async function validateAndRevokeRefreshToken(token: string): Promise<{ valid: boolean; userId?: string }> {
  try {
    const pb = await getAdminPb();
    // Step 1: Find token (must be valid and not revoked)
    const record = await pb.collection(COLLECTION_NAME).getFirstListItem(
      `token = "${escapeFilter(token)}" && is_revoked = false && expires_at > ${Date.now()}`
    );

    // Step 2: Revoke immediately, using a random nonce as used_at for race detection
    // (Date.now() would collide if two requests arrive in the same millisecond)
    const revokeNonce = Date.now() * 1000 + Math.floor(Math.random() * 1000);
    try {
      await pb.collection(COLLECTION_NAME).update(record.id, {
        is_revoked: true,
        used_at: revokeNonce,
      });
    } catch (revokeErr) {
      // Revoke failed — token may have been revoked by a concurrent request
      console.warn('Token found but revoke failed (possible race):', safeErrId(revokeErr));
      return { valid: false };
    }

    // Step 3: Post-revoke verification — re-read and check used_at matches
    // If another concurrent request also revoked this token, used_at will differ
    try {
      const updated = await pb.collection(COLLECTION_NAME).getOne(record.id);
      if (updated.used_at !== revokeNonce) {
        console.warn('Token revoke race detected — used_at mismatch, rejecting');
        return { valid: false };
      }
    } catch (verifyErr) {
      // If re-read fails, proceed cautiously — the revoke succeeded
      console.warn('Post-revoke verification failed, proceeding:', safeErrId(verifyErr));
    }

    return { valid: true, userId: record.user_id };
  } catch (err: unknown) {
    if (errStatus(err) === 404) return { valid: false };
    console.warn('Failed to validate+revoke refresh token:', safeErrId(err));
    return { valid: false };
  }
}

/**
 * 验证 refresh token 是否有效（只读，不撤销）
 * 注意：用于刷新时请使用 validateAndRevokeRefreshToken 以防止竞态
 */
export async function validateRefreshToken(token: string): Promise<{ valid: boolean; userId?: string }> {
  try {
    const pb = await getAdminPb();
    const record = await pb.collection(COLLECTION_NAME).getFirstListItem(
      `token = "${escapeFilter(token)}" && is_revoked = false && expires_at > ${Date.now()}`
    );
    return { valid: true, userId: record.user_id };
  } catch (err: unknown) {
    if (errStatus(err) === 404) return { valid: false };
    console.warn('Failed to validate refresh token:', safeErrId(err));
    return { valid: false };
  }
}

/**
 * 撤销 refresh token（使用后）
 */
export async function revokeRefreshToken(token: string): Promise<void> {
  try {
    const pb = await getAdminPb();
    const record = await pb.collection(COLLECTION_NAME).getFirstListItem(
      `token = "${escapeFilter(token)}"`
    );
    await pb.collection(COLLECTION_NAME).update(record.id, {
      is_revoked: true,
      used_at: Date.now(),
    });
  } catch (err: unknown) {
    if (errStatus(err) !== 404) {
      console.warn('Failed to revoke refresh token:', safeErrId(err));
    }
  }
}

/**
 * 撤销用户的所有 refresh token（用于登出或密码重置）
 * 如果没有任何 token 被成功撤销，抛出错误以便调用方感知。
 */
export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  let records: Array<{ id: string }> = [];
  try {
    const pb = await getAdminPb();
    records = await pb.collection(COLLECTION_NAME).getFullList({
      filter: `user_id = "${escapeFilter(userId)}" && is_revoked = false`,
    });
  } catch (err: unknown) {
    // 查询失败 — 无法撤销任何 token，必须报错
    throw new Error(`Failed to list refresh tokens for user: ${safeErrId(err)}`);
  }

  if (records.length === 0) return; // 没有活跃 token，正常

  let succeeded = 0;
  let lastError: unknown = null;
  for (const record of records) {
    try {
      const pb = await getAdminPb();
      await pb.collection(COLLECTION_NAME).update(record.id, {
        is_revoked: true,
        used_at: Date.now(),
      });
      succeeded++;
    } catch (err) {
      lastError = err;
      console.warn('[RefreshToken] Skipping single record update:', safeErrId(err));
    }
  }

  // 全部失败 — 报错以便调用方知道撤销没成功
  if (succeeded === 0 && records.length > 0) {
    throw new Error(`Failed to revoke any of ${records.length} refresh tokens: ${safeErrId(lastError)}`);
  }
  // 部分失败 — 日志警告但不抛出
  if (succeeded > 0 && succeeded < records.length) {
    console.warn(`[RefreshToken] Only revoked ${succeeded}/${records.length} tokens`);
  }
}

/**
 * 清理过期的 refresh token
 */
export async function cleanupExpiredRefreshTokens(): Promise<number> {
  try {
    const pb = await getAdminPb();
    const expired = await pb.collection(COLLECTION_NAME).getFullList({
      filter: `expires_at < ${Date.now()}`,
    });

    let deleted = 0;
    for (const record of expired) {
      try {
        await pb.collection(COLLECTION_NAME).delete(record.id);
        deleted++;
      } catch (err) {
        console.warn('[RefreshToken] Skipping single record deletion:', safeErrId(err));
      }
    }
    return deleted;
  } catch (err: unknown) {
    console.warn('Refresh token cleanup failed:', safeErrId(err));
    return 0;
  }
}

/**
 * 初始化 refresh token 集合
 */
export async function initRefreshTokenCollection(): Promise<void> {
  try {
    const pb = await getAdminPb();
    await pb.collections.getOne(COLLECTION_NAME);
    console.info(`[RefreshToken] Collection '${COLLECTION_NAME}' exists`);
  } catch (err: unknown) {
    if (errStatus(err) === 404) {
      console.info(`[RefreshToken] Collection '${COLLECTION_NAME}' not found, creating...`);
      try {
        const pb = await getAdminPb();
        await pb.collections.create({
          name: COLLECTION_NAME,
          type: 'base',
          fields: [
            { name: 'user_id', type: 'text', required: true },
            { name: 'token', type: 'text', required: true },
            { name: 'expires_at', type: 'number', required: true },
            { name: 'created_at', type: 'number', required: true },
            { name: 'used_at', type: 'number' },
            { name: 'is_revoked', type: 'bool', required: true },
          ],
          listRule: null,  // 禁止公开列出
          viewRule: '@request.auth.id != "" && user_id = @request.auth.id',  // 仅本人可读
          createRule: '@request.auth.id != ""',  // 认证用户可创建
          updateRule: '@request.auth.id != "" && user_id = @request.auth.id',  // 仅本人可更新
          deleteRule: null,
        });
        console.info(`[RefreshToken] Collection '${COLLECTION_NAME}' created`);
      } catch (createErr: unknown) {
        console.error(`[RefreshToken] Failed to create collection: ${safeErrId(createErr)}`);
      }
    } else {
      console.error(`[RefreshToken] Failed to check collection: ${safeErrId(err)}`);
    }
  }
}
