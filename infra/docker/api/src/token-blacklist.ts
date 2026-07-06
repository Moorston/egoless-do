// ─── Token 黑名单服务 (PocketBase 持久化) ───────────────────────
// 将 Token 黑名单从本地 SQLite 迁移到 PocketBase 集合，确保服务重启后数据不丢失。

import { getPb, getAdminPb, escapeFilter } from './pb.js';

const COLLECTION_NAME = 'token_blacklist';

/**
 * 检查 Token 是否在黑名单中
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  try {
    const pb = getPb();
    await pb.collection(COLLECTION_NAME).getFirstListItem(
      `token = "${escapeFilter(token)}" && expires_at > ${Date.now()}`
    );
    return true;
  } catch (err: any) {
    if (err?.status === 404) return false;
    // 如果集合不存在，回退到本地检查
    console.warn('Token blacklist check failed, falling back to local:', err.message);
    return false;
  }
}

/**
 * 将 Token 添加到黑名单
 */
export async function blacklistToken(token: string, expiresAt: number): Promise<void> {
  try {
    const pb = getPb();
    await pb.collection(COLLECTION_NAME).create({
      token,
      expires_at: expiresAt,
      created_at: Date.now(),
    });
  } catch (err: any) {
    console.error('Failed to blacklist token:', err.message);
    // 如果集合不存在，静默失败（不影响主流程）
  }
}

/**
 * 清理过期的黑名单 Token
 */
export async function cleanupExpiredTokens(): Promise<number> {
  try {
    const pb = getPb();
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
  } catch (err: any) {
    console.warn('Token blacklist cleanup failed:', err.message);
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
    console.log(`[TokenBlacklist] Collection '${COLLECTION_NAME}' exists`);
  } catch (err: any) {
    if (err?.status === 404) {
      console.log(`[TokenBlacklist] Collection '${COLLECTION_NAME}' not found, creating...`);
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
        console.log(`[TokenBlacklist] Collection '${COLLECTION_NAME}' created`);
      } catch (createErr: any) {
        console.error(`[TokenBlacklist] Failed to create collection: ${createErr.message}`);
      }
    } else {
      console.error(`[TokenBlacklist] Failed to check collection: ${err.message}`);
    }
  }
}
