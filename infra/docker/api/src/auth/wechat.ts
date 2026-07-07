// ─── POST /api/auth/wechat ───────────────────────────────────────
import { Hono } from 'hono';
import crypto from 'crypto';
import { getPb, getAdminPb, escapeFilter } from '../pb.js';
import { errMessage, errStatus } from '../errors.js';
import { getClientIp, wechatRateLimit } from '../rate-limit.js';
import { sanitizeError } from '../auth-middleware.js';
import { generateRefreshToken, createRefreshToken } from '../token-refresh-rotation.js';

const TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60 * 1000; // 7 days
const REFRESH_TOKEN_EXPIRES_IN = 30 * 24 * 60 * 60 * 1000; // 30 days

function wechatPassword(openid: string) {
  const salt = process.env.WECHAT_SECRET;
  if (!salt) throw new Error('WECHAT_SECRET 未配置');
  return crypto.createHash('sha256').update(openid + salt).digest('hex').slice(0, 32);
}

const app = new Hono();

app.post('/wechat', async (c) => {
  const ip = getClientIp(c);
  if (!wechatRateLimit(ip)) {
    return c.json({ error: '请求过于频繁，请稍后再试' }, 429);
  }

  try {
    const { code } = await c.req.json();
    if (!code) return c.json({ error: '缺少 code' }, 400);
    if (typeof code !== 'string' || code.length > 512) {
      return c.json({ error: '无效的 code 参数' }, 400);
    }

    const appid = process.env.WECHAT_APPID;
    const secret = process.env.WECHAT_SECRET;
    if (!appid || !secret) return c.json({ error: '微信登录未配置' }, 500);

    const wxRes = await fetch(
      `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`
    );
    const wxData = await wxRes.json();
    if (wxData.errcode) return c.json({ error: '微信登录失败' }, 401);

    const { openid } = wxData;
    if (!openid) return c.json({ error: '微信登录失败：无效响应' }, 401);
    const pb = getPb();
    const password = wechatPassword(openid);

    let user;
    try {
      // Use admin client to bypass default viewRule on users collection
      const adminPb = await getAdminPb();
      user = await adminPb.collection('users').getFirstListItem(`wechat_openid = "${escapeFilter(openid)}"`);
    } catch (lookupErr: unknown) {
      if (errStatus(lookupErr) !== 404) throw lookupErr;
      try {
        const adminPbForCreate = await getAdminPb();
        user = await adminPbForCreate.collection('users').create({
          email: `wechat_${openid}@egoless.do`,
          password, passwordConfirm: password,
          name: `微信用户${openid.slice(-4)}`,
          wechat_openid: openid,
        });
      } catch (createErr: unknown) {
        // Race condition: concurrent request created the user — retry lookup
        if (errStatus(createErr) === 400 && errMessage(createErr).includes('already exists')) {
          const adminPb = await getAdminPb();
          user = await adminPb.collection('users').getFirstListItem(`wechat_openid = "${escapeFilter(openid)}"`);
        } else {
          throw createErr;
        }
      }
    }

    const authData = await pb.collection('users').authWithPassword(user.email, password);

    // 生成独立的 refresh token
    const refreshToken = generateRefreshToken();
    const refreshTokenExpiresAt = Date.now() + REFRESH_TOKEN_EXPIRES_IN;
    await createRefreshToken(user.id, refreshToken, refreshTokenExpiresAt);

    return c.json({
      user: { id: user.id, name: user.name, avatar: user.avatar, createdAt: user.created ? new Date(user.created).getTime() : Date.now() },
      token: authData.token,
      refreshToken: refreshToken,
      expiresAt: Date.now() + TOKEN_EXPIRES_IN,
    });
  } catch (err: unknown) {
    return c.json({ error: sanitizeError(err, '微信登录失败') }, 500);
  }
});

export default app;
