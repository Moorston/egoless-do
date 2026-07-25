// ─── Auth API 服务入口 (Hono) ────────────────────────────────────
// 独立的认证代理服务，从 web-legacy Next.js API 路由迁移而来。
// 提供用户认证、邮箱验证码、微信登录等功能。

// ── 所有 static import 放最前（ESM 规范：import 总是先于 body code 执行）──
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { cfg } from './config.js';

// PocketBase 持久化服务初始化
import { initTokenBlacklistCollection } from './token-blacklist.js';
import { initVerificationCodeCollection } from './verification-code.js';
import { initRefreshTokenCollection } from './token-refresh-rotation.js';
import { initAccountLockoutCollection } from './account-lockout.js';
import { initAuditLogCollection } from './audit-log.js';
import { initMFACollection } from './mfa.js';
import { initRBACCollection } from './rbac.js';

// Auth 路由
import loginApp from './auth/login.js';
import registerApp from './auth/register.js';
import refreshApp from './auth/refresh.js';
import logoutApp from './auth/logout.js';
import meApp from './auth/me.js';
import sendCodeApp from './auth/send-code.js';
import checkEmailApp from './auth/check-email.js';
import resetPasswordApp from './auth/reset-password.js';
import changePasswordApp from './auth/change-password.js';
import wechatApp from './auth/wechat.js';
import mfaApp from './auth/mfa.js';
import rbacApp from './auth/rbac.js';

// 非 auth 路由
import pushApp from './push.js';
import planApp from './plan.js';
import monitoringApp from './monitoring.js';
import setupApp from './setup.js';

// PocketBase 反向代理（将未匹配的 /api/* 请求转发到内部 PocketBase）
import { proxyToPocketBase } from './pb-proxy.js';

// ── 所有 body code 在 import 之后 ────────────────────────────────

const app = new Hono();

// ── 安全中间件 ──────────────────────────────────────────────────
app.use('*', cors({
  origin: cfg.corsOrigin ? [cfg.corsOrigin] : ['http://localhost:3000', 'http://localhost:8081'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (cfg.nodeEnv === 'production') {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
});

// ── Readiness probe：初始化完成前返回 503 ──────────────────────
let _ready = false;

// Health endpoint with diagnostics
import { failOpenMetrics } from './token-blacklist.js';

app.get('/healthz', (c) => {
  if (!_ready) return c.json({ status: 'starting', service: 'egoless-auth-api' }, 503);
  return c.json({
    status: 'ok',
    service: 'egoless-auth-api',
    blacklist: {
      failOpenCount: failOpenMetrics.count,
      lastFailAt: failOpenMetrics.lastFailAt || null,
    },
  });
});

// Auth 路由挂载
app.route('/api/auth', loginApp);
app.route('/api/auth', registerApp);
app.route('/api/auth', refreshApp);
app.route('/api/auth', logoutApp);
app.route('/api/auth', meApp);
app.route('/api/auth', sendCodeApp);
app.route('/api/auth', checkEmailApp);
app.route('/api/auth', resetPasswordApp);
app.route('/api/auth', changePasswordApp);
app.route('/api/auth', wechatApp);
app.route('/api/auth/mfa', mfaApp);
app.route('/api/auth/rbac', rbacApp);

// 非 auth 路由挂载
app.route('/api', pushApp);
app.route('/api/plan', planApp);
app.route('/api', monitoringApp);
app.route('/api', setupApp);

// 404 兜底 — 未匹配的 /api/* 请求转发到 PocketBase（内部代理）
app.all('/api/*', async (c) => {
  // 如果请求已经匹配到前面的路由，不会到达这里
  // 只有未匹配的 /api/* 路径才会进入此代理
  const url = new URL(c.req.url);
  return proxyToPocketBase(c.req.raw, url.pathname, url.search);
});

app.notFound((c) => c.json({ error: 'Not Found' }, 404));

// 全局错误处理
app.onError((err, c) => {
  console.error('[AuthAPI] Unhandled error:', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

// ── 异步初始化 PocketBase 集合，完成后标记 _ready ───────────────
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
  // 初始化失败：healthz 持续返回 503，K8s 不会把流量导进来
});

serve({ fetch: app.fetch, port: cfg.port }, (info) => {
  console.info(`🟢 Auth API running on http://localhost:${info.port}`);
});
