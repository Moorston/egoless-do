import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../_auth';
import { getClientIp, createRateLimiter } from '../../_rateLimit';

const meRateLimit = createRateLimiter(30, 60_000); // 30 req/min

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  if (!meRateLimit(ip)) {
    return NextResponse.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 });
  }
  const auth = await verifyAuth(req.headers.get('authorization'));
  if (!auth) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const { getPb } = await import('../../_pb');
    const pb = getPb();
    const user = await pb.collection('users').getOne(auth.userId);
    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar },
    });
  } catch {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  }
}
