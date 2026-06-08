import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../_auth';
import { getPb, escapeFilter } from '../../_pb';
import { getClientIp, createRateLimiter } from '../../_rateLimit';
import { ENTITY_COLLECTION } from '@egoless-do/core';

const checkRateLimit = createRateLimiter(30, 60_000); // 30 req/min

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: '请求过于频繁' }, { status: 429 });
  }

  const authHeader = req.headers.get('authorization');
  const auth = await verifyAuth(authHeader);
  if (!auth) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const since = req.nextUrl.searchParams.get('since');
  const ts = Number(since);
  if (!since || !Number.isFinite(ts)) {
    return NextResponse.json({ error: '缺少或无效的 since 参数' }, { status: 400 });
  }

  const sinceDate = new Date(ts).toISOString();
  const userId = auth.userId;
  const pb = getPb();
  const token = authHeader?.slice(7);
  if (token) pb.authStore.save(token, null);

  // Query all collections in parallel for minimum latency
  const results = await Promise.allSettled(
    Object.values(ENTITY_COLLECTION).map(collection =>
      pb.collection(collection).getList(1, 1, {
        filter: `user_id = "${escapeFilter(userId)}" && updated >= "${sinceDate}"`,
      })
    ),
  );

  let count = 0;
  for (const result of results) {
    if (result.status === 'fulfilled') {
      count += result.value.totalItems;
    }
  }

  return NextResponse.json({ hasChanges: count > 0, count });
}
