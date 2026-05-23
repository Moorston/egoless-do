import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getPb } from '../../_pb';
import db from '../../_db';

const CODE_EXPIRES_MS = 5 * 60 * 1000;
const CODE_LENGTH = 6;

function generateCode(): string {
  return String(Math.floor(Math.random() * 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0');
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

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: '请输入有效的邮箱地址' }, { status: 400 });
    }

    // Check if email already registered via PocketBase
    const pb = getPb();
    try {
      await pb.collection('users').getFirstListItem(`email = "${email}"`);
      return NextResponse.json({ error: '该邮箱已注册' }, { status: 409 });
    } catch {
      // Email not found — proceed
    }

    // Rate limit: max 1 code per 60 seconds
    const recent = db.prepare(
      'SELECT created_at FROM verification_codes WHERE email = ? ORDER BY created_at DESC LIMIT 1'
    ).get(email) as { created_at: number } | undefined;

    if (recent && Date.now() - recent.created_at < 60 * 1000) {
      return NextResponse.json({ error: '请60秒后再试' }, { status: 429 });
    }

    const code = generateCode();
    const expiresAt = Date.now() + CODE_EXPIRES_MS;

    db.prepare('DELETE FROM verification_codes WHERE email = ?').run(email);
    db.prepare(
      'INSERT INTO verification_codes(email, code, expires_at) VALUES(?,?,?)'
    ).run(email, code, expiresAt);

    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"心流纪 Egoless Do" <${process.env.SMTP_USER}>`,
      to: email,
      subject: '【心流纪】邮箱验证码',
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:420px;margin:0 auto;padding:32px;background:#0F0A1E;border-radius:16px;color:#fff;">
          <h2 style="text-align:center;margin-bottom:8px;">心流纪</h2>
          <p style="text-align:center;color:#818cf8;font-size:13px;margin-bottom:24px;">Egoless Do</p>
          <p style="font-size:15px;margin-bottom:16px;">你的注册验证码为：</p>
          <div style="text-align:center;font-size:32px;font-weight:800;letter-spacing:8px;color:#818cf8;padding:16px;background:rgba(129,140,248,.1);border-radius:12px;margin-bottom:24px;">
            ${code}
          </div>
          <p style="font-size:13px;color:#888;">验证码 5 分钟内有效，请勿泄露给他人。</p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true, message: '验证码已发送' });
  } catch (err: unknown) {
    console.error('Send code error:', err);
    return NextResponse.json({ error: '发送验证码失败，请稍后重试' }, { status: 500 });
  }
}
