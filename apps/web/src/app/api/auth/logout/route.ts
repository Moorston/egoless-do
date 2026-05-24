import { NextRequest, NextResponse } from 'next/server';
import { jwtExp } from '../../_auth';
import db from '../../_db';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
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
