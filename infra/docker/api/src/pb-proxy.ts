// ─── PocketBase 反向代理 ────────────────────────────────────────
// 将未匹配的 /api/* 请求转发到内部 PocketBase 服务。
// 确保 PocketBase 不暴露在公网，所有流量通过 Auth API 中转。
// ────────────────────────────────────────────────────────────────

const PB_INTERNAL_URL = process.env.PB_URL ?? 'http://pocketbase:8090';

const PROXIED_HEADERS = new Set([
  'content-type', 'content-length', 'content-encoding',
  'etag', 'last-modified', 'cache-control', 'expires',
  'x-request-id', 'x-total-count',
]);

/** 判断是否为 SSE 请求（EventSource 建立连接时发送） */
function isSSERequest(accept: string | null): boolean {
  return accept !== null && accept.includes('text/event-stream');
}

/**
 * 将 Request 代理到 PocketBase 内部服务。
 * 支持普通 HTTP 和 SSE 流式响应。
 */
export async function proxyToPocketBase(
  request: Request,
  pathname: string,
  search: string,
): Promise<Response> {
  const targetUrl = `${PB_INTERNAL_URL}${pathname}${search}`;

  // 构建转发的 headers
  const forwardHeaders = new Headers();
  for (const [key, value] of request.headers.entries()) {
    const lower = key.toLowerCase();
    if (lower === 'host') continue; // 不转发 host
    forwardHeaders.set(key, value);
  }

  // 如果是 SSE 请求，设置正确的 Accept
  if (isSSERequest(request.headers.get('accept'))) {
    forwardHeaders.set('Accept', 'text/event-stream');
  }

  // 获取请求体（非 GET/HEAD 请求）
  let body: string | null = null;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.text();
  }

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: forwardHeaders,
      body: body ?? undefined,
    });

    // 构建响应 headers
    const responseHeaders = new Headers();
    for (const [key, value] of response.headers.entries()) {
      if (PROXIED_HEADERS.has(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    }
    // 透传 CORS headers（Auth API 已全局设置 CORS）
    for (const key of ['access-control-allow-origin', 'access-control-expose-headers']) {
      const val = response.headers.get(key);
      if (val) responseHeaders.set(key, val);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    // const log = createLogger('PBProxy');
    // log.error(err, { targetUrl, method: request.method });
    return new Response(
      JSON.stringify({ error: 'PocketBase proxy failed', details: (err instanceof Error ? err.message : 'unknown') }),
      { status: 502, headers: { 'content-type': 'application/json' } },
    );
  }
}