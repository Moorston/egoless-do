// ─── POST /api/auth/send-code ────────────────────────────────────
import { Hono } from 'hono';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { getAdminPb, escapeFilter } from '../pb.js';
import { errMessage, errStatus } from '../errors.js';
import { saveVerificationCode, canSendCode, cleanupExpiredCodes } from '../verification-code.js';
import { getClientIp, sendCodeRateLimit } from '../rate-limit.js';

const CODE_EXPIRES_MS = 5 * 60 * 1000;
const CODE_LENGTH = 6;

function generateCode(): string {
  return String(crypto.randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0');
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

const app = new Hono();

app.post('/send-code', async (c) => {
  const ip = getClientIp(c);
  if (!sendCodeRateLimit(ip)) {
    return c.json({ error: '请求过于频繁，请稍后再试' }, 429);
  }

  try {
    const { email, type } = await c.req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return c.json({ error: '请输入有效的邮箱地址' }, 400);
    }
    if (type !== undefined && type !== 'reset' && type !== 'register') {
      return c.json({ error: '无效的验证码类型' }, 400);
    }

    // Check email registration status based on type
    const pb = await getAdminPb();
    let emailExists = false;
    try {
      await pb.collection('users').getFirstListItem(`email = "${escapeFilter(email)}"`);
      emailExists = true;
    } catch (err: unknown) {
      if (errStatus(err) !== 404) {
        console.error('check email error:', { status: errStatus(err), message: errMessage(err) });
        throw err;
      }
    }

    // type='reset' requires email to be registered
    // type='register' (default) requires email NOT to be registered
    if (type === 'reset' && !emailExists) {
      return c.json({ error: '该邮箱未注册' }, 404);
    } else if (type !== 'reset' && emailExists) {
      return c.json({ error: '该邮箱已注册' }, 409);
    }

    // Rate limit: max 1 code per 60 seconds (使用持久化存储)
    const canSend = await canSendCode(email);
    if (!canSend) {
      return c.json({ error: '请60秒后再试' }, 429);
    }

    const code = generateCode();
    const expiresAt = Date.now() + CODE_EXPIRES_MS;

    // 保存验证码到 PocketBase（持久化）
    await saveVerificationCode(email, code, expiresAt);

    // 异步清理过期验证码（不阻塞主流程）
    cleanupExpiredCodes().catch(() => {});

    const transporter = getTransporter();
    const subject = type === 'reset' ? '【心流纪】密码重置验证码' : '【心流纪】邮箱验证码';
    const purpose = type === 'reset' ? '密码重置验证码' : '注册验证码';

    await transporter.sendMail({
      from: `"心流纪 Egoless Do" <${process.env.SMTP_USER}>`,
      to: email,
      subject,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:420px;margin:0 auto;padding:32px;background:#0F0A1E;border-radius:16px;color:#fff;">
          <h2 style="text-align:center;margin-bottom:8px;">心流纪</h2>
          <p style="text-align:center;color:#818cf8;font-size:13px;margin-bottom:24px;">Egoless Do</p>
          <p style="font-size:15px;margin-bottom:16px;">你的${purpose}为：</p>
          <div style="text-align:center;font-size:32px;font-weight:800;letter-spacing:8px;color:#818cf8;padding:16px;background:rgba(129,140,248,.1);border-radius:12px;margin-bottom:24px;">
            ${code}
          </div>
          <p style="font-size:13px;color:#888;">验证码 5 分钟内有效，请勿泄露给他人。</p>
        </div>
      `,
    });

    return c.json({ ok: true, message: '验证码已发送' });
  } catch (err: unknown) {
    console.error('Send code error:', err);
    return c.json({ error: '发送验证码失败，请稍后重试' }, 500);
  }
});

export default app;
