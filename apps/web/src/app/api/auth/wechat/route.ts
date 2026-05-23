import { NextRequest, NextResponse } from 'next/server';
import { getPb } from '../../_pb';
import crypto from 'crypto';

function wechatPassword(openid: string) {
  const salt = process.env.WECHAT_SECRET ?? 'egoless-wechat';
  return crypto.createHash('sha256').update(openid + salt).digest('hex').slice(0, 20);
}

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();
    if (!code) return NextResponse.json({ error: '缺少 code' }, { status: 400 });

    const appid = process.env.WECHAT_APPID;
    const secret = process.env.WECHAT_SECRET;
    if (!appid || !secret) return NextResponse.json({ error: '微信登录未配置' }, { status: 500 });

    const wxRes = await fetch(
      `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`
    );
    const wxData = await wxRes.json();
    if (wxData.errcode) return NextResponse.json({ error: '微信登录失败' }, { status: 401 });

    const { openid } = wxData;
    const pb = getPb();
    const password = wechatPassword(openid);

    let user;
    try {
      user = await pb.collection('users').getFirstListItem(`wechat_openid = "${openid}"`);
    } catch {
      user = await pb.collection('users').create({
        email: `wechat_${openid}@egoless.do`,
        password, passwordConfirm: password,
        name: `微信用户${openid.slice(-4)}`,
        wechat_openid: openid,
      });
    }

    const authData = await pb.collection('users').authWithPassword(user.email, password);

    return NextResponse.json({
      user: { id: user.id, name: user.name, avatar: user.avatar },
      token: authData.token,
      refreshToken: authData.token,
      expiresAt: Date.now() + 86400000,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '微信登录失败' }, { status: 500 });
  }
}
