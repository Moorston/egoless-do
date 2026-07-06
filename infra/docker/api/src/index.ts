// ─── Auth API 服务入口 (Hono) ────────────────────────────────────
// 独立的认证代理服务，从 web-legacy Next.js API 路由迁移而来。
// 提供用户认证、邮箱验证码、微信登录等功能。
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { config } from 'dotenv';
import path from 'path';

// 加载项目根目录的 .env 文件
// infra/docker/api/src/index.ts → 向上 4 级到项目根目录
const rootEnvPath = path.resolve(process.cwd(), '../../../.env');
config({ path: rootEnvPath });

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

// Health check
app.get('/healthz', (c) => c.json({ status: 'ok', service: 'egoless-auth-api' }));

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

const port = Number(process.env.PORT ?? 3000);

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
  console.log('[AuthAPI] PocketBase collections initialized');
}).catch((err) => {
  console.error('[AuthAPI] Failed to initialize collections:', err);
});

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`🟢 Auth API running on http://localhost:${info.port}`);
});
