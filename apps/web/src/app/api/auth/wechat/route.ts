import { NextRequest, NextResponse } from 'next/server';
import { getPb, getAdminPb, escapeFilter } from '../../_pb';
import crypto from 'crypto';
import { TOKEN_EXPIRES_IN } from '../../constants';
import { sanitizeError } from '../../_errors';
import { getClientIp, createRateLimiter } from '../../_rateLimit';

const wechatRateLimit = createRateLimiter(10, 60_000); // 10 req/min

function wechatPassword(openid: string) {
  const salt = process.env.WECHAT_SECRET;
  if (!salt) throw new Error('WECHAT_SECRET 未配置');
  return crypto.createHash('sha256').update(openid + salt).digest('hex').slice(0, 20);
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!wechatRateLimit(ip)) {
    return NextResponse.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 });
  }

  try {
    const { code } = await req.json();
    if (!code) return NextResponse.json({ error: '缺少 code' }, { status: 400 });

    const appid = process.env.WECHAT_APPID;
    const secret = process.env.WECHAT_SECRET;
    if (!appid || !secret) return NextResponse.json({ error: '微信登录未配置' }, { status: 500 });

    const wxRes = await fetch(
      `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`
    );
    const wxData = await wxRes.json();
    if (wxData.errcode) return NextResponse.json({ error: '微信登录失败' }, { status: 401 });

    const { openid } = wxData;
    if (!openid) return NextResponse.json({ error: '微信登录失败：无效响应' }, { status: 401 });
    const pb = getPb();
    const password = wechatPassword(openid);

    let user;
    try {
      // Use admin client to bypass default viewRule on users collection
      const adminPb = await getAdminPb();
      user = await adminPb.collection('users').getFirstListItem(`wechat_openid = "${escapeFilter(openid)}"`);
    } catch (lookupErr: any) {
      if (lookupErr?.status !== 404) throw lookupErr;
      try {
        const adminPbForCreate = await getAdminPb();
        user = await adminPbForCreate.collection('users').create({
          email: `wechat_${openid}@egoless.do`,
          password, passwordConfirm: password,
          name: `微信用户${openid.slice(-4)}`,
          wechat_openid: openid,
        });
      } catch (createErr: any) {
        // Race condition: concurrent request created the user — retry lookup
        if (createErr?.status === 400 && createErr?.message?.includes('already exists')) {
          const adminPb = await getAdminPb();
          user = await adminPb.collection('users').getFirstListItem(`wechat_openid = "${escapeFilter(openid)}"`);
        } else {
          throw createErr;
        }
      }
    }

    const authData = await pb.collection('users').authWithPassword(user.email, password);

    // Note: refreshToken === token is a PocketBase limitation (no separate refresh token mechanism).
    return NextResponse.json({
      user: { id: user.id, name: user.name, avatar: user.avatar, createdAt: user.created ? new Date(user.created).getTime() : Date.now() },
      token: authData.token,
      refreshToken: authData.token,
      expiresAt: Date.now() + TOKEN_EXPIRES_IN,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: sanitizeError(err, '微信登录失败') }, { status: 500 });
  }
}
