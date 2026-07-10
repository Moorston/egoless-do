// ─── Token 黑名单服务 (PocketBase 持久化) ───────────────────────
// 将 Token 黑名单从本地 SQLite 迁移到 PocketBase 集合，确保服务重启后数据不丢失。

import { getPb, getAdminPb, escapeFilter } from './pb.js';
import { errMessage, errStatus } from './errors.js';

const COLLECTION_NAME = 'token_blacklist';

/**
 * 检查 Token 是否在黑名单中
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  try {
    const pb = await getAdminPb();
    await pb.collection(COLLECTION_NAME).getFirstListItem(
      `token = "${escapeFilter(token)}" && expires_at > ${Date.now()}`
    );
    return true;
  } catch (err: unknown) {
    if (errStatus(err) === 404) return false;
    // Fail-closed: if blacklist check fails (PB down, network error), deny access
    // Better to reject a valid token temporarily than to accept a revoked one
    console.warn('Token blacklist check failed, denying access (fail-closed):', errMessage(err));
    return true;
  }
}

/**
 * 将 Token 添加到黑名单
 */
export async function blacklistToken(token: string, expiresAt: number): Promise<void> {
  try {
    const pb = await getAdminPb();
    await pb.collection(COLLECTION_NAME).create({
      token,
      expires_at: expiresAt,
      created_at: Date.now(),
    });
  } catch (err: unknown) {
    console.error('Failed to blacklist token:', errMessage(err));
    // 如果集合不存在，静默失败（不影响主流程）
  }
}

/**
 * 清理过期的黑名单 Token — 使用批量删除优化
 */
export async function cleanupExpiredTokens(): Promise<number> {
  try {
    const pb = await getAdminPb();
    const expired = await pb.collection(COLLECTION_NAME).getFullList({
      filter: `expires_at < ${Date.now()}`,
    });

    if (expired.length === 0) return 0;

    // PocketBase doesn't support bulk delete, but we can batch in pages
    let deleted = 0;
    for (const record of expired) {
      try {
        await pb.collection(COLLECTION_NAME).delete(record.id);
        deleted++;
      } catch (err) {
        console.warn('[TokenBlacklist] Skipping single record deletion:', errMessage(err));
      }
    }
    return deleted;
  } catch (err: unknown) {
    console.warn('Token blacklist cleanup failed:', errMessage(err));
    return 0;
  }
}

/**
 * 初始化 Token 黑名单集合
 * 如果集合不存在，尝试创建
 */
export async function initTokenBlacklistCollection(): Promise<void> {
  try {
    const pb = await getAdminPb();
    await pb.collections.getOne(COLLECTION_NAME);
    console.info(`[TokenBlacklist] Collection '${COLLECTION_NAME}' exists`);
  } catch (err: unknown) {
    if (errStatus(err) === 404) {
      console.info(`[TokenBlacklist] Collection '${COLLECTION_NAME}' not found, creating...`);
      try {
        const pb = await getAdminPb();
        await pb.collections.create({
          name: COLLECTION_NAME,
          type: 'base',
          fields: [
            { name: 'token', type: 'text', required: true },
            { name: 'expires_at', type: 'number', required: true },
            { name: 'created_at', type: 'number', required: true },
          ],
          listRule: null,  // 禁止公开列出
          viewRule: null,  // 禁止公开查看（API内部使用管理员权限验证）
          createRule: null,  // 仅系统可创建（API内部使用管理员权限）
          updateRule: null,
          deleteRule: null,
        });
        console.info(`[TokenBlacklist] Collection '${COLLECTION_NAME}' created`);
      } catch (createErr: unknown) {
        console.error(`[TokenBlacklist] Failed to create collection: ${errMessage(createErr)}`);
      }
    } else {
      console.error(`[TokenBlacklist] Failed to check collection: ${errMessage(err)}`);
    }
  }
}
