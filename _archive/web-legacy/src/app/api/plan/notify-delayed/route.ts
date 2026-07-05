import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createLogger } from '@egoless-do/core';
import { getAdminPb } from '../../_pb';
import { verifyAuth } from '../../_auth';
import { getClientIp, createRateLimiter } from '../../_rateLimit';

const log = createLogger('Plan');

const notifyRateLimit = createRateLimiter(10, 60_000); // 10 req/min

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

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!notifyRateLimit(ip)) {
    return NextResponse.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 });
  }

  try {
    // Authenticate
    const auth = await verifyAuth(req.headers.get('authorization'));
    if (!auth) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const { planId, planName, endDate, userId } = await req.json();

    if (!planId || !planName || !endDate || !userId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }
    if (typeof planId !== 'string' || typeof planName !== 'string' || typeof endDate !== 'string') {
      return NextResponse.json({ error: '参数类型错误' }, { status: 400 });
    }

    // Only allow sending notifications to self
    if (userId !== auth.userId) {
      return NextResponse.json({ error: '无权操作' }, { status: 403 });
    }

    // 获取用户邮箱
    const pb = await getAdminPb();
    let user;
    try {
      user = await pb.collection('users').getOne(userId);
    } catch (e: any) {
      const status = e?.status ?? e?.response?.status;
      if (status === 404) return NextResponse.json({ error: '用户不存在' }, { status: 404 });
      return NextResponse.json({ error: '服务器错误' }, { status: 500 });
    }

    if (!user.email) {
      return NextResponse.json({ ok: true, message: '用户未配置邮箱，跳过提醒' });
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

    return NextResponse.json({ ok: true, message: '延期提醒已发送' });
  } catch (err: unknown) {
    log.error('Send delayed plan notification error:', err);
    return NextResponse.json({ error: '发送延期提醒失败' }, { status: 500 });
  }
}
