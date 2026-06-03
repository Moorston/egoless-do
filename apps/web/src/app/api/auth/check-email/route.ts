import { NextRequest, NextResponse } from 'next/server';
import { getPb, escapeFilter } from '../../_pb';
import { getClientIp, checkEmailRateLimit } from '../../_rateLimit';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkEmailRateLimit(ip)) {
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
