import { NextRequest, NextResponse } from 'next/server';
import { getPb } from '../../_pb';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ available: false, error: '请输入有效的邮箱地址' });
    }

    const pb = getPb();
    try {
      await pb.collection('users').getFirstListItem(`email = "${email}"`);
      return NextResponse.json({ available: false, error: '该邮箱已注册' });
    } catch {
      return NextResponse.json({ available: true });
    }
  } catch {
    return NextResponse.json({ available: false, error: '检查失败' });
  }
}
