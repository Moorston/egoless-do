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
    // 如果集合不存在，静默失败
  }
}

/**
 * 验证 refresh token 是否有效
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
 */
export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  try {
    const pb = await getAdminPb();
    const records = await pb.collection(COLLECTION_NAME).getFullList({
      filter: `user_id = "${escapeFilter(userId)}" && is_revoked = false`,
    });

    for (const record of records) {
      try {
        await pb.collection(COLLECTION_NAME).update(record.id, {
          is_revoked: true,
          used_at: Date.now(),
        });
      } catch (err) {
        // 忽略单个更新失败
      }
    }
  } catch (err: unknown) {
    console.warn('Failed to revoke user refresh tokens:', safeErrId(err));
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
        // 忽略单个删除失败
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
