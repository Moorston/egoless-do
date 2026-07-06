// ─── POST /api/plan/notify-delayed ───────────────────────────────
// 计划延期提醒邮件通知
import { Hono } from 'hono';
import nodemailer from 'nodemailer';
import { verifyAuth } from './auth-middleware.js';
import { getAdminPb } from './pb.js';
import { getClientIp } from './rate-limit.js';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.qq.com',
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// Rate limiter
const notifyRateLimit = (() => {
  const attempts = new Map<string, { count: number; resetAt: number }>();
  let lastCleanup = 0;
  return (ip: string): boolean => {
    const now = Date.now();
    if (attempts.size > 10_000 || (attempts.size > 0 && now > lastCleanup + 60_000)) {
      for (const [key, entry] of attempts) {
        if (now > entry.resetAt) attempts.delete(key);
      }
      lastCleanup = now;
    }
    const entry = attempts.get(ip);
    if (!entry || now > entry.resetAt) {
      attempts.set(ip, { count: 1, resetAt: now + 60_000 });
      return true;
    }
    if (entry.count >= 10) return false; // 10 req/min
    entry.count++;
    return true;
  };
})();

const app = new Hono();

app.post('/notify-delayed', async (c) => {
  const ip = getClientIp(c);
  if (!notifyRateLimit(ip)) {
    return c.json({ error: '请求过于频繁，请稍后再试' }, 429);
  }

  try {
    // Authenticate
    const auth = await verifyAuth(c.req.header('authorization') ?? null);
    if (!auth) return c.json({ error: '未授权' }, 401);

    const { planId, planName, endDate, userId } = await c.req.json();

    if (!planId || !planName || !endDate || !userId) {
      return c.json({ error: '缺少必要参数' }, 400);
    }
    if (typeof planId !== 'string' || typeof planName !== 'string' || typeof endDate !== 'string') {
      return c.json({ error: '参数类型错误' }, 400);
    }

    // Only allow sending notifications to self
    if (userId !== auth.userId) {
      return c.json({ error: '无权操作' }, 403);
    }

    // 获取用户邮箱
    const pb = await getAdminPb();
    let user;
    try {
      user = await pb.collection('users').getOne(userId);
    } catch (e: any) {
      const status = e?.status ?? e?.response?.status;
      if (status === 404) return c.json({ error: '用户不存在' }, 404);
      return c.json({ error: '服务器错误' }, 500);
    }

    if (!user.email) {
      return c.json({ ok: true, message: '用户未配置邮箱，跳过提醒' });
    }

    // 发送邮件
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"心流纪 Egoless Do" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: '【心流纪】计划延期提醒',
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:420px;margin:0 auto;padding:32px;background:#0F0A1E;border-radius:16px;color:#fff;">
          <h2 style="text-align:center;margin-bottom:8px;">心流纪</h2>
          <p style="text-align:center;color:#818cf8;font-size:13px;margin-bottom:24px;">Egoless Do</p>
          <p style="font-size:15px;margin-bottom:16px;">您的计划已超期：</p>
          <div style="text-align:center;padding:16px;background:rgba(239,68,68,.1);border-radius:12px;margin-bottom:24px;border:1px solid rgba(239,68,68,.3);">
            <p style="font-size:18px;font-weight:700;color:#ef4444;margin:0 0 8px 0;">${escapeHtml(planName)}</p>
            <p style="font-size:14px;color:#888;margin:0;">原定结束日期：${escapeHtml(endDate)}</p>
          </div>
          <p style="font-size:13px;color:#888;">请及时处理您的计划。</p>
        </div>
      `,
    });

    return c.json({ ok: true, message: '延期提醒已发送' });
  } catch (err: unknown) {
    console.error('Send delayed plan notification error:', err);
    return c.json({ error: '发送延期提醒失败' }, 500);
  }
});

export default app;
