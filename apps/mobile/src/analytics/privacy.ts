// ─── 隐私工具：匿名化 + PII 过滤 + 同意管理 ─────────────────────
// 依据 PRIVACY_POLICY.md "我们不做的事" 制定红线。

import * as Crypto from 'expo-crypto';

// ── PII 敏感 key 黑名单 ──
// 任何含这些 key 的字段将被 sanitize() 删除，绝不发送至 PostHog
const PII_KEYS = new Set([
  // 感念/笔记内容
  'content', 'note', 'notes', 'insight', 'gratitude', 'mood', 'tags',
  // 禅修笔记
  'closing_notes', 'sankalpa', 'self_reported_stage', 'self_reported_stage_text',
  // 心理/恐惧/勇气记录
  'trigger_context', 'worst_outcome', 'action', 'feeling', 'feeling_tags',
  // 个人笔记
  'pause_reason', 'abandon_reason', 'reason',
  // 动机/反思
  'motivation', 'give_action',
  // PII
  'email', 'nickname', 'phone', 'token', 'password', 'secret',
  // 健康数据原始值
  'weight', 'body_fat', 'body_weight', 'bmi',
]);

// 长文本阈值：超过此长度的字符串视为可疑 PII
const MAX_STRING_LENGTH = 200;

/**
 * 过滤 props 中的 PII 字段。
 * - 删除黑名单 key
 * - 删除超长字符串（防泄露笔记内容）
 */
export function sanitize(props: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (PII_KEYS.has(key)) continue;
    if (typeof value === 'string') {
      if (value.length > MAX_STRING_LENGTH) continue; // 超长字符串视为可疑 PII
      safe[key] = value;
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // 递归过滤嵌套对象（但不深入数组）
      safe[key] = sanitize(value as Record<string, unknown>);
    } else {
      // 数字、布尔、数组直接保留
      safe[key] = value;
    }
  }
  return safe;
}

// ── 用户 ID 匿名化 ──
// 使用 SHA-256 加盐哈希，与 PB user.id 解耦
// 优先使用 expo-crypto（EAS Build/Dev Client），降级为 Web Crypto API（Expo Go 兼容）
export async function anonymizeUserId(pbUserId: string): Promise<string> {
  const salt = process.env.EXPO_PUBLIC_POSTHOG_SALT || 'change-me-in-production';
  const input = salt + pbUserId;

  try {
    // 方案 A：expo-crypto（原生模块，EAS Build/Dev Client）
    const Crypto = await import('expo-crypto');
    // expo-crypto 类型定义可能不完整，使用 eslint-disable
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      input,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    return hash.slice(0, 16);
  } catch {
    // 方案 B：Web Crypto API（Expo Go 兼容）
    if (typeof globalThis.crypto?.subtle?.digest === 'function') {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex.slice(0, 16);
    }
    // 方案 C：降级为简单哈希（最后兜底）
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }
}

// ── 用户同意管理 ──
export type AnalyticsConsent = 'anonymous' | 'necessary' | 'denied';

// SQLite app_state 表的 key
const CONSENT_KEY = 'analytics_consent';

/**
 * 从 SQLite 读取用户同意状态。
 * 默认 'necessary'（未询问前不追踪）。
 */
export async function getAnalyticsConsent(): Promise<AnalyticsConsent> {
  try {
    // 动态 import() 的模块命名空间解析为 any（TS 已知限制），schema 内 getState/setState 本身类型安全
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { getState } = await import('../../db/schema');
    const db = await openDatabase();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const value = await getState(db, CONSENT_KEY);
    return (value as AnalyticsConsent) || 'necessary';
  } catch {
    return 'necessary';
  }
}

/**
 * 写入用户同意状态到 SQLite。
 */
export async function setAnalyticsConsent(consent: AnalyticsConsent): Promise<void> {
  try {
    // 动态 import() 的模块命名空间解析为 any（TS 已知限制），schema 内 setState 本身类型安全
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { setState } = await import('../../db/schema');
    const db = await openDatabase();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await setState(db, CONSENT_KEY, consent);
  } catch (err) {
    console.warn('[Analytics] Failed to save consent:', err);
  }
}

// 避免循环导入：动态导入 openDatabase
async function openDatabase() {
  const { openDatabaseAsync } = await import('expo-sqlite');
  return openDatabaseAsync('egoless-do.db');
}
