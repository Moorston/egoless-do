// ─── 集中式环境变量配置 ──────────────────────────────────────────
// 所有模块从此文件读取配置，而不是直接访问 process.env。
// 优势：
//   - 启动时一次性校验所有关键 env（fail-fast）
//   - 统一的默认值处理
//   - 路径基于 import.meta.url 固定，不依赖 CWD
//   - 测试时可通过 mock 此文件完成
// ──────────────────────────────────────────────────────────────────
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnvPath = path.resolve(__dirname, '../../../../.env');
config({ path: rootEnvPath });

/* ── 种子函数 ────────────────────────────────────────────────── */
function env(key: string, fallback?: string): string | undefined {
  return process.env[key] ?? fallback;
}

function envRequired(key: string): string {
  const val = env(key);
  if (!val) {
    throw new Error(`[Config] MISSING REQUIRED ENV: ${key}`);
  }
  return val;
}

/* ── 配置定义 ──────────────────────────────────────────────────── */
export const cfg = {
  /** 服务端口 */
  port: Number(env('PORT', '3000')),

  /** PocketBase 服务地址 */
  pbUrl: env('PB_URL', 'http://localhost:8090'),

  /** 内部服务间认证密钥（与 PB_ENCRYPTION_KEY 用途不同，必须单独设置） */
  internalSecret: env('INTERNAL_SECRET'),

  /** 数据加密密钥（AES-256，32 字符） */
  pbEncryptionKey: env('PB_ENCRYPTION_KEY'),

  /** PocketBase 管理员账号 */
  pbAdminEmail: envRequired('PB_ADMIN_EMAIL'),
  pbAdminPassword: envRequired('PB_ADMIN_PASSWORD'),

  /** SMTP 邮件配置（可选，仅在发邮件时才需要） */
  smtp: {
    host: env('SMTP_HOST', 'smtp.qq.com'),
    port: Number(env('SMTP_PORT', '465')),
    user: env('SMTP_USER'),
    pass: env('SMTP_PASS'),
  },

  /** CORS 允许的来源 */
  corsOrigin: env('CORS_ORIGIN'),

  /** 速率限制 */
  rateLimitWindowMs: Number(env('RATE_LIMIT_WINDOW_MS', '60000')),
  rateLimitFile: env('RATE_LIMIT_FILE', '/tmp/rate-limit-state.json'),

  /** 微信登录 */
  wechatAppId: env('WECHAT_APPID'),
  wechatSecret: env('WECHAT_SECRET'),

  /** Setup */
  setupSecret: env('SETUP_SECRET'),
  setupHmacKey: env('SETUP_HMAC_KEY'),

  /** Expo Push */
  expoAccessToken: env('EXPO_ACCESS_TOKEN'),

  /** 运行时环境 */
  nodeEnv: env('NODE_ENV', 'development'),

  /** 数据库 */
  dbDataDir: env('DB_DATA_DIR'),
} as const;

export type AppConfig = typeof cfg;

/** 获取 INTERNAL_SECRET，支持向后兼容的 PB_ENCRYPTION_KEY fallback（带警告）。 */
export function getInternalSecret(): string {
  if (cfg.internalSecret) return cfg.internalSecret;
  if (cfg.pbEncryptionKey) {
    console.warn('[Config] INTERNAL_SECRET not set, falling back to PB_ENCRYPTION_KEY — set INTERNAL_SECRET separately for production');
    return cfg.pbEncryptionKey;
  }
  throw new Error('[Config] INTERNAL_SECRET must be set');
}