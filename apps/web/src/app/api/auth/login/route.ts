import { NextRequest, NextResponse } from 'next/server';
import { getPb } from '../../_pb';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: '请输入邮箱和密码' }, { status: 400 });
    }

    const pb = getPb();
    const authData = await pb.collection('users').authWithPassword(email, password);

    return NextResponse.json({
      user: { id: authData.record.id, email: authData.record.email, name: authData.record.name },
      token: authData.token,
      refreshToken: authData.token,
      expiresAt: Date.now() + 86400000,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 });
  }
}
