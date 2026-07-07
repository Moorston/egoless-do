// ─── 审计日志服务 ─────────────────────────────────────────────────
// 记录关键操作，用于安全审计和合规。

import { getAdminPb, escapeFilter } from './pb.js';
import { errMessage, errStatus } from './errors.js';

const COLLECTION_NAME = 'audit_logs';

// 审计事件类型
export enum AuditEvent {
  // 认证事件
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGIN_LOCKED = 'login_locked',
  LOGOUT = 'logout',
  REGISTER = 'register',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET = 'password_reset',
  TOKEN_REFRESH = 'token_refresh',

  // 安全事件
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  INVALID_TOKEN = 'invalid_token',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',

  // 系统事件
  SYSTEM_ERROR = 'system_error',
  COLLECTION_INIT = 'collection_init',
}

interface AuditLogEntry {
  id?: string;
  event: string;
  user_id?: string;
  email?: string;
  ip: string;
  user_agent: string;
  timestamp: number;
  details?: Record<string, unknown>;
  success: boolean;
}

/**
 * 记录审计事件
 */
export async function logAuditEvent(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
  try {
    const pb = await getAdminPb();
    await pb.collection(COLLECTION_NAME).create({
      event: entry.event,
      user_id: entry.user_id || null,
      email: entry.email || null,
      ip: entry.ip,
      user_agent: entry.user_agent,
      timestamp: Date.now(),
      details: entry.details ? JSON.stringify(entry.details) : null,
      success: entry.success,
    });
  } catch (err: unknown) {
    // 审计日志失败不应影响主流程
    console.warn('Failed to log audit event:', errMessage(err));
  }
}

/**
 * 获取用户最近的审计日志
 */
export async function getUserAuditLogs(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<AuditLogEntry[]> {
  try {
    const pb = await getAdminPb();
    const records = await pb.collection(COLLECTION_NAME).getList(offset, limit, {
      filter: `user_id = "${escapeFilter(userId)}"`,
      sort: '-timestamp',
    });

    return records.items.map(record => ({
      id: record.id,
      event: record.event,
      user_id: record.user_id,
      email: record.email,
      ip: record.ip,
      user_agent: record.user_agent,
      timestamp: record.timestamp,
      details: record.details ? JSON.parse(record.details) : undefined,
      success: record.success,
    }));
  } catch (err: unknown) {
    console.warn('Failed to get user audit logs:', errMessage(err));
    return [];
  }
}

/**
 * 获取最近的安全事件
 */
export async function getRecentSecurityEvents(
  limit: number = 100,
  hours: number = 24
): Promise<AuditLogEntry[]> {
  try {
    const pb = await getAdminPb();
    const since = Date.now() - hours * 60 * 60 * 1000;
    const records = await pb.collection(COLLECTION_NAME).getList(1, limit, {
      filter: `timestamp > ${since} && (event = "${AuditEvent.LOGIN_FAILURE}" || event = "${AuditEvent.LOGIN_LOCKED}" || event = "${AuditEvent.RATE_LIMIT_EXCEEDED}" || event = "${AuditEvent.SUSPICIOUS_ACTIVITY}")`,
      sort: '-timestamp',
    });

    return records.items.map(record => ({
      id: record.id,
      event: record.event,
      user_id: record.user_id,
      email: record.email,
      ip: record.ip,
      user_agent: record.user_agent,
      timestamp: record.timestamp,
      details: record.details ? JSON.parse(record.details) : undefined,
      success: record.success,
    }));
  } catch (err: unknown) {
    console.warn('Failed to get security events:', errMessage(err));
    return [];
  }
}

/**
 * 清理过期的审计日志（保留最近 90 天）
 */
export async function cleanupExpiredAuditLogs(): Promise<number> {
  try {
    const pb = await getAdminPb();
    const retentionDays = 90;
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

    const expired = await pb.collection(COLLECTION_NAME).getFullList({
      filter: `timestamp < ${cutoff}`,
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
    console.warn('Audit log cleanup failed:', errMessage(err));
    return 0;
  }
}

/**
 * 初始化审计日志集合
 */
export async function initAuditLogCollection(): Promise<void> {
  try {
    const pb = await getAdminPb();
    await pb.collections.getOne(COLLECTION_NAME);
    console.info(`[AuditLog] Collection '${COLLECTION_NAME}' exists`);
  } catch (err: unknown) {
    if (errStatus(err) === 404) {
      console.info(`[AuditLog] Collection '${COLLECTION_NAME}' not found, creating...`);
      try {
        const pb = await getAdminPb();
        await pb.collections.create({
          name: COLLECTION_NAME,
          type: 'base',
          fields: [
            { name: 'event', type: 'text', required: true },
            { name: 'user_id', type: 'text' },
            { name: 'email', type: 'text' },
            { name: 'ip', type: 'text', required: true },
            { name: 'user_agent', type: 'text', required: true },
            { name: 'timestamp', type: 'number', required: true },
            { name: 'details', type: 'text' },
            { name: 'success', type: 'bool', required: true },
          ],
          listRule: null,  // 禁止公开列出（仅管理员可通过API查询）
          viewRule: null,  // 禁止公开查看
          createRule: null,  // 仅系统可创建
          updateRule: null,  // 禁止更新
          deleteRule: null,
        });
        console.info(`[AuditLog] Collection '${COLLECTION_NAME}' created`);
      } catch (createErr: unknown) {
        console.error(`[AuditLog] Failed to create collection: ${errMessage(createErr)}`);
      }
    } else {
      console.error(`[AuditLog] Failed to check collection: ${errMessage(err)}`);
    }
  }
}

/**
 * 从请求中提取客户端信息
 */
export function extractClientInfo(c: { req: { header: (name: string) => string | undefined } }): { ip: string; userAgent: string } {
  const ip = c.req.header('x-real-ip') ??
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';
  const userAgent = c.req.header('user-agent') || 'unknown';
  return { ip, userAgent };
}
