import { NextRequest, NextResponse } from 'next/server';
import { getPb, escapeFilter } from '../../_pb';

// ── In-memory rate limiter (per IP) ───────────────────────────────
const checkAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 60_000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  if (checkAttempts.size > 1000) {
    for (const [key, entry] of checkAttempts) {
      if (now > entry.resetAt) checkAttempts.delete(key);
    }
  }
  const entry = checkAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    checkAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count++;
  return true;
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ available: false, error: '请求过于频繁' }, { status: 429 });
  }

  try {
    const { email } = await req.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ available: false, error: '请输入有效的邮箱地址' });
    }

    const pb = getPb();
    try {
      await pb.collection('users').getFirstListItem(`email = "${escapeFilter(email)}"`);
      return NextResponse.json({ available: false });
    } catch {
      return NextResponse.json({ available: true });
    }
  } catch {
    return NextResponse.json({ available: false, error: '检查失败' });
  }
}
