// ─── Auth API 服务入口 (Hono) ────────────────────────────────────
// 独立的认证代理服务，从 web-legacy Next.js API 路由迁移而来。
// 提供用户认证、邮箱验证码、微信登录等功能。
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { fileURLToPath } from 'url';

/* ── 加载集中式配置（在静态导入阶段执行 dotenv）────────────── */
import { cfg } from './config.js';

/* ── 启动时校验关键环境变量（fail-fast）───────────────────── */
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(`[AuthAPI] MISSING REQUIRED ENV: ${name} — server will not start without it`);
  }
  return val;
}
// 以下变量必须在启动时存在，缺一个就 crash
requireEnv('INTERNAL_SECRET');
requireEnv('PB_ADMIN_EMAIL');
requireEnv('PB_ADMIN_PASSWORD');

// 初始化持久化服务
import { initTokenBlacklistCollection } from './token-blacklist.js';
import { initVerificationCodeCollection } from './verification-code.js';
import { initRefreshTokenCollection } from './token-refresh-rotation.js';
import { initAccountLockoutCollection } from './account-lockout.js';
import { initAuditLogCollection } from './audit-log.js';
import { initMFACollection } from './mfa.js';
import { initRBACCollection } from './rbac.js';

// Auth routes
import loginApp from './auth/login.js';
import registerApp from './auth/register.js';
import refreshApp from './auth/refresh.js';
import logoutApp from './auth/logout.js';
import meApp from './auth/me.js';
import sendCodeApp from './auth/send-code.js';
import checkEmailApp from './auth/check-email.js';
import resetPasswordApp from './auth/reset-password.js';
import wechatApp from './auth/wechat.js';
import mfaApp from './auth/mfa.js';
import rbacApp from './auth/rbac.js';

// Non-auth routes
import pushApp from './push.js';
import planApp from './plan.js';
import monitoringApp from './monitoring.js';
import setupApp from './setup.js';

const app = new Hono();

// ─── 安全中间件 ─────────────────────────────────────────────────
// CORS - 限制允许的来源
app.use('*', cors({
  origin: process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : ['http://localhost:3000', 'http://localhost:8081'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// 安全头
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  // 如果部署在 HTTPS 后面，添加 HSTS
  if (process.env.NODE_ENV === 'production') {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
});

/* ── Ready flag: 初始化完成前返回 503 ─────────────────────────── */
let _ready = false;

// Health check
app.get('/healthz', (c) => {
  if (!_ready) return c.json({ status: 'starting', service: 'egoless-auth-api' }, 503);
  return c.json({ status: 'ok', service: 'egoless-auth-api' });
});

// Mount auth routes
app.route('/api/auth', loginApp);
app.route('/api/auth', registerApp);
app.route('/api/auth', refreshApp);
app.route('/api/auth', logoutApp);
app.route('/api/auth', meApp);
app.route('/api/auth', sendCodeApp);
app.route('/api/auth', checkEmailApp);
app.route('/api/auth', resetPasswordApp);
app.route('/api/auth', wechatApp);
app.route('/api/auth/mfa', mfaApp);
app.route('/api/auth/rbac', rbacApp);

// Mount non-auth routes
app.route('/api', pushApp);
app.route('/api/plan', planApp);
app.route('/api', monitoringApp);
app.route('/api', setupApp);

// 404 fallback
app.notFound((c) => c.json({ error: 'Not Found' }, 404));

// Error handler
app.onError((err, c) => {
  console.error('[AuthAPI] Unhandled error:', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

const port = cfg.port;

// 初始化 PocketBase 集合（异步，不阻塞启动）
Promise.all([
  initTokenBlacklistCollection(),
  initVerificationCodeCollection(),
  initRefreshTokenCollection(),
  initAccountLockoutCollection(),
  initAuditLogCollection(),
  initMFACollection(),
  initRBACCollection(),
]).then(() => {
  console.info('[AuthAPI] PocketBase collections initialized');
  _ready = true;
}).catch((err) => {
  console.error('[AuthAPI] Failed to initialize collections:', err);
  // 初始化失败不设 _ready，healthz 持续返回 503
});

serve({ fetch: app.fetch, port }, (info) => {
  console.info(`🟢 Auth API running on http://localhost:${info.port}`);
});
