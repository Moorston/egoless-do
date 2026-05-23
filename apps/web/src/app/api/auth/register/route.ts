import { NextRequest, NextResponse } from 'next/server';
import { getPb } from '../../_pb';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, code } = await req.json();
    if (!email || !password || !name || !code) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: '密码需至少8位' }, { status: 400 });
    }

    const Database = (await import('better-sqlite3')).default;
    const path = await import('path');
    const fs = await import('fs');
    const DATA_DIR = path.join(process.cwd(), 'data');
    const db = new Database(path.join(DATA_DIR, 'egoless-auth.db'));
    const record = db.prepare(
      'SELECT code, expires_at FROM verification_codes WHERE email = ? ORDER BY created_at DESC LIMIT 1'
    ).get(email) as { code: string; expires_at: number } | undefined;
    db.close();

    if (!record) return NextResponse.json({ error: '请先获取验证码' }, { status: 400 });
    if (record.code !== code) return NextResponse.json({ error: '验证码错误' }, { status: 400 });
    if (Date.now() > record.expires_at) return NextResponse.json({ error: '验证码已过期' }, { status: 400 });

    const pb = getPb();
    const user = await pb.collection('users').create({
      email, password, passwordConfirm: password, name,
    });

    const authData = await pb.collection('users').authWithPassword(email, password);

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
      token: authData.token,
      refreshToken: authData.token,
      expiresAt: Date.now() + 86400000,
    });
  } catch (err: unknown) {
    const e = err as { response?: { message?: string }; data?: { message?: string }; message?: string };
    const msg = e?.response?.message || e?.data?.message || e?.message || '注册失败';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
