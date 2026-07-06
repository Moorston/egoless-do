// ─── 验证码服务 (PocketBase 持久化) ─────────────────────────────
// 将验证码从本地 SQLite 迁移到 PocketBase 集合，确保服务重启后数据不丢失。

import { getAdminPb, escapeFilter } from './pb.js';
import { errMessage, errStatus } from './errors.js';

const COLLECTION_NAME = 'verification_codes';

interface VerificationCode {
  id?: string;
  email: string;
  code: string;
  expires_at: number;
  created_at: number;
}

/**
 * 保存验证码
 */
export async function saveVerificationCode(email: string, code: string, expiresAt: number): Promise<void> {
  const pb = await getAdminPb();

  // 删除旧验证码
  try {
    const existing = await pb.collection(COLLECTION_NAME).getFirstListItem(
      `email = "${escapeFilter(email)}"`
    );
    await pb.collection(COLLECTION_NAME).delete(existing.id);
  } catch (err: unknown) {
    if (errStatus(err) !== 404) {
      console.warn('Failed to delete old verification code:', errMessage(err));
    }
  }

  // 创建新验证码
  await pb.collection(COLLECTION_NAME).create({
    email,
    code,
    expires_at: expiresAt,
    created_at: Date.now(),
  });
}

/**
 * 获取验证码
 */
export async function getVerificationCode(email: string): Promise<VerificationCode | null> {
  try {
    const pb = await getAdminPb();
    const record = await pb.collection(COLLECTION_NAME).getFirstListItem(
      `email = "${escapeFilter(email)}"`
    );
    return {
      id: record.id,
      email: record.email,
      code: record.code,
      expires_at: record.expires_at,
      created_at: record.created_at,
    };
  } catch (err: unknown) {
    if (errStatus(err) === 404) return null;
    console.warn('Failed to get verification code:', errMessage(err));
    return null;
  }
}

/**
 * 删除验证码
 */
export async function deleteVerificationCode(email: string): Promise<void> {
  try {
    const pb = await getAdminPb();
    const existing = await pb.collection(COLLECTION_NAME).getFirstListItem(
      `email = "${escapeFilter(email)}"`
    );
    await pb.collection(COLLECTION_NAME).delete(existing.id);
  } catch (err: unknown) {
    if (errStatus(err) !== 404) {
      console.warn('Failed to delete verification code:', errMessage(err));
    }
  }
}

/**
 * 清理过期验证码
 */
export async function cleanupExpiredCodes(): Promise<number> {
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
    console.warn('Verification code cleanup failed:', errMessage(err));
    return 0;
  }
}

/**
 * 检查是否可以发送验证码（60秒内只能发送一次）
 */
export async function canSendCode(email: string): Promise<boolean> {
  try {
    const pb = await getAdminPb();
    const record = await pb.collection(COLLECTION_NAME).getFirstListItem(
      `email = "${escapeFilter(email)}"`
    );
    // 检查是否在 60 秒内
    return Date.now() - record.created_at >= 60 * 1000;
  } catch (err: unknown) {
    if (errStatus(err) === 404) return true; // 没有记录，可以发送
    console.warn('Failed to check send code rate:', errMessage(err));
    return true; // 出错时允许发送
  }
}

/**
 * 初始化验证码集合
 * 如果集合不存在，尝试创建
 */
export async function initVerificationCodeCollection(): Promise<void> {
  try {
    const pb = await getAdminPb();
    await pb.collections.getOne(COLLECTION_NAME);
    console.log(`[VerificationCode] Collection '${COLLECTION_NAME}' exists`);
  } catch (err: unknown) {
    if (errStatus(err) === 404) {
      console.log(`[VerificationCode] Collection '${COLLECTION_NAME}' not found, creating...`);
      try {
        const pb = await getAdminPb();
        await pb.collections.create({
          name: COLLECTION_NAME,
          type: 'base',
          fields: [
            { name: 'email', type: 'text', required: true },
            { name: 'code', type: 'text', required: true },
            { name: 'expires_at', type: 'number', required: true },
            { name: 'created_at', type: 'number', required: true },
          ],
          listRule: null,  // 禁止公开列出
          viewRule: null,  // 禁止公开查看（API内部使用管理员权限）
          createRule: null,  // 仅系统可创建（API内部使用管理员权限）
          updateRule: null,
          deleteRule: null,
        });
        console.log(`[VerificationCode] Collection '${COLLECTION_NAME}' created`);
      } catch (createErr: unknown) {
        console.error(`[VerificationCode] Failed to create collection: ${errMessage(createErr)}`);
      }
    } else {
      console.error(`[VerificationCode] Failed to check collection: ${errMessage(err)}`);
    }
  }
}
