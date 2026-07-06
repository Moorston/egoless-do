// ─── 多因素认证服务 (MFA) ─────────────────────────────────────────
// 实现基于时间的一次性密码 (TOTP) 多因素认证。

import { getAdminPb, escapeFilter } from './pb.js';
import { errMessage, errStatus } from './errors.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const COLLECTION_NAME = 'user_mfa';

interface MFAConfig {
  id?: string;
  user_id: string;
  secret: string;
  enabled: boolean;
  backup_codes: string[];  // 备用恢复代码
  created_at: number;
  updated_at: number;
}

/**
 * 生成 TOTP 密钥
 */
export function generateMFASecret(): string {
  return crypto.randomBytes(20).toString('base64');
}

/**
 * 生成 TOTP 代码
 */
export function generateTOTP(secret: string, timeStep: number = 30): string {
  const time = Math.floor(Date.now() / 1000 / timeStep);
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigInt64BE(BigInt(time));

  const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'base64'));
  hmac.update(timeBuffer);
  const hash = hmac.digest();

  const offset = hash[hash.length - 1] & 0x0f;
  const code = (
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff)
  ) % 1000000;

  return code.toString().padStart(6, '0');
}

/**
 * 验证 TOTP 代码
 */
export function verifyTOTP(secret: string, code: string): boolean {
  // 允许前后 30 秒的误差
  const timeStep = 30;
  const currentTime = Math.floor(Date.now() / 1000 / timeStep);

  for (let i = -1; i <= 1; i++) {
    const time = currentTime + i;
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigInt64BE(BigInt(time));

    const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'base64'));
    hmac.update(timeBuffer);
    const hash = hmac.digest();

    const offset = hash[hash.length - 1] & 0x0f;
    const expectedCode = (
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff)
    ) % 1000000;

    if (expectedCode.toString().padStart(6, '0') === code) {
      return true;
    }
  }

  return false;
}

/**
 * 生成备用恢复代码
 */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }
  return codes;
}

/**
 * 检查用户是否启用 MFA
 */
export async function isMFAEnabled(userId: string): Promise<boolean> {
  try {
    const pb = await getAdminPb();
    const record = await pb.collection(COLLECTION_NAME).getFirstListItem(
      `user_id = "${escapeFilter(userId)}" && enabled = true`
    );
    return !!record;
  } catch (err: unknown) {
    if (errStatus(err) === 404) return false;
    console.warn('Failed to check MFA status:', errMessage(err));
    return false;
  }
}

/**
 * 获取用户的 MFA 配置
 */
export async function getMFAConfig(userId: string): Promise<MFAConfig | null> {
  try {
    const pb = await getAdminPb();
    const record = await pb.collection(COLLECTION_NAME).getFirstListItem(
      `user_id = "${escapeFilter(userId)}"`
    );
    return {
      id: record.id,
      user_id: record.user_id,
      secret: record.secret,
      enabled: record.enabled,
      backup_codes: record.backup_codes || [],
      created_at: record.created_at,
      updated_at: record.updated_at,
    };
  } catch (err: unknown) {
    if (errStatus(err) === 404) return null;
    console.warn('Failed to get MFA config:', errMessage(err));
    return null;
  }
}

/**
 * 启用 MFA
 */
export async function enableMFA(userId: string): Promise<{ secret: string; backupCodes: string[] }> {
  const secret = generateMFASecret();
  const plainCodes = generateBackupCodes();
  // Hash backup codes before storage (bcrypt, 10 rounds)
  const hashedCodes = await Promise.all(plainCodes.map(c => bcrypt.hash(c, 10)));

  try {
    const pb = await getAdminPb();

    // 检查是否已有配置
    let existing: any;
    try {
      existing = await pb.collection(COLLECTION_NAME).getFirstListItem(
        `user_id = "${escapeFilter(userId)}"`
      );
    } catch (err: unknown) {
      if (errStatus(err) !== 404) throw err;
    }

    if (existing) {
      // 更新现有配置
      await pb.collection(COLLECTION_NAME).update(existing.id, {
        secret,
        enabled: true,
        backup_codes: hashedCodes,
        updated_at: Date.now(),
      });
    } else {
      // 创建新配置
      await pb.collection(COLLECTION_NAME).create({
        user_id: userId,
        secret,
        enabled: true,
        backup_codes: hashedCodes,
        created_at: Date.now(),
        updated_at: Date.now(),
      });
    }

    return { secret, backupCodes: plainCodes };
  } catch (err: unknown) {
    console.error('Failed to enable MFA:', errMessage(err));
    throw err;
  }
}

/**
 * 禁用 MFA
 */
export async function disableMFA(userId: string): Promise<void> {
  try {
    const pb = await getAdminPb();
    const record = await pb.collection(COLLECTION_NAME).getFirstListItem(
      `user_id = "${escapeFilter(userId)}"`
    );
    await pb.collection(COLLECTION_NAME).update(record.id, {
      enabled: false,
      updated_at: Date.now(),
    });
  } catch (err: unknown) {
    if (errStatus(err) !== 404) {
      console.error('Failed to disable MFA:', errMessage(err));
      throw err;
    }
  }
}

/**
 * 验证 MFA 代码
 */
export async function verifyMFACode(userId: string, code: string): Promise<boolean> {
  const config = await getMFAConfig(userId);
  if (!config || !config.enabled) return true; // MFA 未启用，直接通过

  // 先检查是否是备用代码（支持 bcrypt 哈希和 legacy 明文）
  const upperCode = code.toUpperCase();
  let matchedIndex = -1;
  for (let i = 0; i < config.backup_codes.length; i++) {
    const stored = config.backup_codes[i];
    if (stored.startsWith('$2')) {
      // bcrypt hash
      if (await bcrypt.compare(upperCode, stored)) { matchedIndex = i; break; }
    } else {
      // legacy plaintext (pre-migration)
      if (stored === upperCode) { matchedIndex = i; break; }
    }
  }
  if (matchedIndex >= 0) {
    // 使用备用代码后删除它
    const updatedCodes = config.backup_codes.filter((_, idx) => idx !== matchedIndex);
    try {
      const pb = await getAdminPb();
      await pb.collection(COLLECTION_NAME).update(config.id!, {
        backup_codes: updatedCodes,
        updated_at: Date.now(),
      });
    } catch (err) {
      console.warn('Failed to remove used backup code:', err);
    }
    return true;
  }

  // 验证 TOTP 代码
  return verifyTOTP(config.secret, code);
}

/**
 * 初始化 MFA 集合
 */
export async function initMFACollection(): Promise<void> {
  try {
    const pb = await getAdminPb();
    await pb.collections.getOne(COLLECTION_NAME);
    console.log(`[MFA] Collection '${COLLECTION_NAME}' exists`);
  } catch (err: unknown) {
    if (errStatus(err) === 404) {
      console.log(`[MFA] Collection '${COLLECTION_NAME}' not found, creating...`);
      try {
        const pb = await getAdminPb();
        await pb.collections.create({
          name: COLLECTION_NAME,
          type: 'base',
          fields: [
            { name: 'user_id', type: 'text', required: true },
            { name: 'secret', type: 'text', required: true },
            { name: 'enabled', type: 'bool', required: true },
            { name: 'backup_codes', type: 'json' },
            { name: 'created_at', type: 'number', required: true },
            { name: 'updated_at', type: 'number', required: true },
          ],
          listRule: '@request.auth.id != "" && user_id = @request.auth.id',  // 仅本人可读
          viewRule: '@request.auth.id != "" && user_id = @request.auth.id',
          createRule: '@request.auth.id != "" && user_id = @request.auth.id',  // 仅本人可创建
          updateRule: '@request.auth.id != "" && user_id = @request.auth.id',  // 仅本人可更新
          deleteRule: null,
        });
        console.log(`[MFA] Collection '${COLLECTION_NAME}' created`);
      } catch (createErr: unknown) {
        console.error(`[MFA] Failed to create collection: ${errMessage(createErr)}`);
      }
    } else {
      console.error(`[MFA] Failed to check collection: ${errMessage(err)}`);
    }
  }
}
