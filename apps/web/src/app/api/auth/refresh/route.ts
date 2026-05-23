import { NextRequest, NextResponse } from 'next/server';
import { getPb } from '../../_pb';

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization');
    if (!auth?.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const pb = getPb();
    pb.authStore.save(auth.slice(7), null);

    const authData = await pb.collection('users').authRefresh();

    return NextResponse.json({
      token: authData.token,
      refreshToken: authData.token,
      expiresAt: Date.now() + 86400000,
    });
  } catch {
    return NextResponse.json({ error: 'Token 已过期，请重新登录' }, { status: 401 });
  }
}
