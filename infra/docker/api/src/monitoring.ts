// ─── POST /api/monitoring ────────────────────────────────────────
// Sentry tunnel — 代理 Sentry 事件到上游，绕过广告拦截器
import { Hono } from 'hono';

const app = new Hono();

app.post('/monitoring', async (c) => {
  try {
    const envelope = await c.req.text();
    const piece = envelope.split('\n')[0];
    const header = JSON.parse(piece);
    const dsn = header.dsn;

    if (!dsn) {
      return c.json({ error: 'missing dsn' }, 400);
    }

    const dsnUrl = new URL(dsn);
    const projectId = dsnUrl.pathname.replace('/', '');
    const sentryHost = dsnUrl.host;

    // SSRF protection: only allow legitimate Sentry hosts
    const allowedPattern = /^[a-z0-9]+\.ingest\.(us\.)?sentry\.io$/;
    if (!allowedPattern.test(sentryHost) && sentryHost !== 'sentry.io') {
      return c.json({ error: 'invalid dsn host' }, 400);
    }

    const upstreamUrl = `https://${sentryHost}/api/${projectId}/envelope/`;
    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      body: envelope,
      headers: { 'Content-Type': 'application/x-sentry-envelope' },
    });

    // 返回通用响应，不泄露 Sentry 内部错误详情
    if (upstreamResponse.ok) {
      return c.json({ ok: true });
    } else {
      return c.json({ ok: false }, 502);
    }
  } catch {
    return c.json({ error: 'bad request' }, 400);
  }
});

export default app;
