import { NextRequest, NextResponse } from 'next/server';
import { getPb } from '../../_pb';
import { TOKEN_EXPIRES_IN } from '../../constants';

// ── In-memory rate limiter (per IP) ───────────────────────────────
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  // Periodic cleanup to prevent memory leak
  if (loginAttempts.size > 1000) {
    for (const [key, entry] of loginAttempts) {
      if (now > entry.resetAt) loginAttempts.delete(key);
    }
  }
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count++;
  return true;
}

/** Extract client IP from request headers. */
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
    return NextResponse.json({ error: '登录尝试过于频繁，请稍后再试' }, { status: 429 });
  }

  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: '请输入邮箱和密码' }, { status: 400 });
    }

    const pb = getPb();
    const authData = await pb.collection('users').authWithPassword(email, password);

    // Note: refreshToken === token is a PocketBase limitation (no separate refresh token mechanism).
    // TOKEN_EXPIRES_IN is set to 2 hours; client should use /auth/refresh before expiry.
    return NextResponse.json({
      user: { id: authData.record.id, email: authData.record.email, name: authData.record.name },
      token: authData.token,
      refreshToken: authData.token,
      expiresAt: Date.now() + TOKEN_EXPIRES_IN,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 });
  }
}
