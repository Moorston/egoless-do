import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, jwtExp } from '../../_auth';
import db from '../../_db';
import { getClientIp, createRateLimiter } from '../../_rateLimit';

const logoutRateLimit = createRateLimiter(10, 60_000); // 10 req/min

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!logoutRateLimit(ip)) {
    return NextResponse.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 });
  }
  const auth = req.headers.get('authorization');
  const authResult = await verifyAuth(auth);
  if (!authResult) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7);
    const exp = jwtExp(token);
    if (exp === null) {
      return NextResponse.json({ error: '无效 token' }, { status: 400 });
    }
    const expiresAt = exp * 1000;
    db.prepare('INSERT OR IGNORE INTO token_blacklist(token, expires_at) VALUES(?, ?)').run(token, expiresAt);
    // Prune expired entries to keep the table small
    db.prepare('DELETE FROM token_blacklist WHERE expires_at < ?').run(Date.now());
  }
  return NextResponse.json({ ok: true });
}
