import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  buildHeaders,
  fetchWithTimeout,
  handleJsonResponse,
  NetworkError,
  ServerError,
  ValidationError,
  AuthError,
  KickedOutError,
  ConflictError,
  ApiError,
  SYNC_REQUEST_TIMEOUT,
} from './fetch';

// ── helpers ──────────────────────────────────────────────────────

function mockResponse(
  body: string | null,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  const { status = 200, headers = {} } = init;
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    text: () => Promise.resolve(body ?? ''),
    json: () => Promise.resolve(body ? JSON.parse(body) : undefined),
  } as unknown as Response;
}

// ── buildHeaders ─────────────────────────────────────────────────

describe('buildHeaders', () => {
  it('returns Content-Type by default', () => {
    const h = buildHeaders();
    expect(h['Content-Type']).toBe('application/json');
    expect(h['Authorization']).toBeUndefined();
  });

  it('includes Authorization when token is provided', () => {
    const h = buildHeaders('abc123');
    expect(h['Authorization']).toBe('Bearer abc123');
  });

  it('does not include Authorization for empty string', () => {
    const h = buildHeaders('');
    expect(h['Authorization']).toBeUndefined();
  });
});

// ── fetchWithTimeout ─────────────────────────────────────────────

describe('fetchWithTimeout', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('calls global fetch with merged signal', async () => {
    const mockFn = vi.fn().mockResolvedValue(mockResponse('ok'));
    globalThis.fetch = mockFn;

    const result = await fetchWithTimeout('https://api.test/x', { method: 'GET' });

    expect(mockFn).toHaveBeenCalledOnce();
    expect(result).toBeDefined();
  });

  it('throws NetworkError on timeout', async () => {
    // Mock fetch that never resolves and respects abort signal
    globalThis.fetch = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        }, { once: true });
      });
    });

    const promise = fetchWithTimeout('https://api.test/x', {}, 50);

    await expect(promise).rejects.toThrow(NetworkError);
    await expect(promise).rejects.toMatchObject({ message: '请求超时，请检查网络' });
  }, 5000);

  it('throws NetworkError when caller signal is already aborted', async () => {
    // Mock fetch that respects abort signal (would reject on abort)
    globalThis.fetch = vi.fn((_url: string, init?: RequestInit) => {
      if (init?.signal?.aborted) {
        return Promise.reject(new DOMException('The operation was aborted.', 'AbortError'));
      }
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        }, { once: true });
      });
    });
    const controller = new AbortController();
    controller.abort();

    await expect(
      fetchWithTimeout('https://api.test/x', { signal: controller.signal }),
    ).rejects.toThrow(NetworkError);
    await expect(
      fetchWithTimeout('https://api.test/x', { signal: controller.signal }),
    ).rejects.toMatchObject({ message: '请求被取消' });
  });

  it('throws NetworkError on non-abort fetch error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(
      fetchWithTimeout('https://api.test/x', {}),
    ).rejects.toThrow(NetworkError);
    await expect(
      fetchWithTimeout('https://api.test/x', {}),
    ).rejects.toMatchObject({ message: '网络连接失败' });
  });

  it('uses custom timeout when provided', async () => {
    // Mock fetch that respects abort signal
    globalThis.fetch = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        }, { once: true });
      });
    });

    const promise = fetchWithTimeout('https://api.test/x', {}, 50);

    await expect(promise).rejects.toThrow(NetworkError);
  }, 5000);

  it('propagates caller signal abort as NetworkError with cancel message', async () => {
    // Mock fetch that respects abort signal
    globalThis.fetch = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        }, { once: true });
      });
    });

    const controller = new AbortController();
    const promise = fetchWithTimeout('https://api.test/x', { signal: controller.signal }, 10_000);

    // Abort after a short delay
    setTimeout(() => controller.abort(), 20);

    await expect(promise).rejects.toThrow(NetworkError);
    await expect(promise).rejects.toMatchObject({ message: '请求被取消' });
  }, 5000);
});

// ── handleJsonResponse ───────────────────────────────────────────

describe('handleJsonResponse', () => {
  it('parses successful JSON response', async () => {
    const res = mockResponse(JSON.stringify({ id: 1, name: 'test' }));
    const data = await handleJsonResponse(res);
    expect(data).toEqual({ id: 1, name: 'test' });
  });

  it('returns empty object for 204 No Content', async () => {
    const res = mockResponse('', { status: 204 });
    const data = await handleJsonResponse(res);
    expect(data).toEqual({});
  });

  it('returns empty object for 200 with empty body', async () => {
    const res = mockResponse('', { status: 200 });
    const data = await handleJsonResponse(res);
    expect(data).toEqual({});
  });

  it('throws NetworkError for non-JSON response', async () => {
    const res = mockResponse('<html>error</html>', { status: 200 });
    await expect(handleJsonResponse(res)).rejects.toThrow(NetworkError);
    await expect(handleJsonResponse(res)).rejects.toMatchObject({
      message: expect.stringContaining('非 JSON 响应'),
    });
  });

  it('throws ApiError for empty body on non-ok status (non-204)', async () => {
    const res = mockResponse('', { status: 400 });
    await expect(handleJsonResponse(res)).rejects.toThrow(ApiError);
  });

  it('generic ok status with empty body returns empty object', async () => {
    const res = mockResponse('', { status: 201 });
    const data = await handleJsonResponse(res);
    expect(data).toEqual({});
  });
});

// ── classifyError via handleJsonResponse ─────────────────────────

describe('error classification', () => {
  it('throws KickedOutError for 401 with KICKED_OUT code', async () => {
    const body = JSON.stringify({ code: 'KICKED_OUT', message: 'kicked' });
    const res = mockResponse(body, { status: 401 });
    await expect(handleJsonResponse(res)).rejects.toBeInstanceOf(KickedOutError);
  });

  it('throws AuthError for generic 401', async () => {
    const body = JSON.stringify({ code: 'UNAUTHORIZED', message: 'bad token' });
    const res = mockResponse(body, { status: 401 });
    const err = await handleJsonResponse(res).catch((e) => e);
    expect(err).toBeInstanceOf(AuthError);
    expect(err.status).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('throws ValidationError for 4xx (400, 403, 404, 422)', async () => {
    for (const status of [400, 403, 404, 422]) {
      const body = JSON.stringify({ code: 'BAD', message: 'invalid' });
      const res = mockResponse(body, { status });
      const err = await handleJsonResponse(res).catch((e) => e);
      expect(err).toBeInstanceOf(ValidationError);
      expect(err.status).toBe(status);
    }
  });

  it('throws ServerError for 5xx', async () => {
    const body = JSON.stringify({ message: 'internal error' });
    const res = mockResponse(body, { status: 500 });
    const err = await handleJsonResponse(res).catch((e) => e);
    expect(err).toBeInstanceOf(ServerError);
    expect(err.status).toBe(500);
  });

  it('throws ServerError for 502, 503', async () => {
    for (const status of [502, 503]) {
      const body = JSON.stringify({ error: 'down' });
      const res = mockResponse(body, { status });
      const err = await handleJsonResponse(res).catch((e) => e);
      expect(err).toBeInstanceOf(ServerError);
      expect(err.status).toBe(status);
    }
  });

  it('uses error field as fallback message', async () => {
    const body = JSON.stringify({ error: 'something went wrong' });
    const res = mockResponse(body, { status: 500 });
    const err = await handleJsonResponse(res).catch((e) => e);
    expect(err.message).toBe('something went wrong');
  });

  it('defaults message to 请求失败 when no message or error field', async () => {
    const body = JSON.stringify({ code: 'X' });
    const res = mockResponse(body, { status: 400 });
    const err = await handleJsonResponse(res).catch((e) => e);
    expect(err.message).toBe('请求失败');
  });

  it('throws ApiError for other non-ok statuses (e.g. 3xx redirect treated as error)', async () => {
    const body = JSON.stringify({ code: 'REDIRECT', message: 'moved' });
    const res = mockResponse(body, { status: 301 });
    const err = await handleJsonResponse(res).catch((e) => e);
    // 301 is not ok, not 4xx, not 5xx → falls through to ApiError
    expect(err).toBeInstanceOf(ApiError);
  });
});

// ── Error classes ────────────────────────────────────────────────

describe('error classes', () => {
  it('NetworkError has correct name', () => {
    const e = new NetworkError('fail');
    expect(e.name).toBe('NetworkError');
    expect(e.message).toBe('fail');
  });

  it('ServerError stores status', () => {
    const e = new ServerError(503, 'down');
    expect(e.name).toBe('ServerError');
    expect(e.status).toBe(503);
  });

  it('ValidationError stores status and code', () => {
    const e = new ValidationError(422, 'INVALID', 'bad input');
    expect(e.name).toBe('ValidationError');
    expect(e.status).toBe(422);
    expect(e.code).toBe('INVALID');
  });

  it('AuthError stores status and code', () => {
    const e = new AuthError(401, 'TOKEN_EXPIRED', 'expired');
    expect(e.name).toBe('AuthError');
    expect(e.status).toBe(401);
    expect(e.code).toBe('TOKEN_EXPIRED');
  });

  it('KickedOutError is an AuthError with correct fields', () => {
    const e = new KickedOutError();
    expect(e).toBeInstanceOf(AuthError);
    expect(e.name).toBe('KickedOutError');
    expect(e.status).toBe(401);
    expect(e.code).toBe('KICKED_OUT');
    expect(e.message).toBe('您的账号已在其他设备登录');
  });

  it('ConflictError stores message', () => {
    const e = new ConflictError('version conflict');
    expect(e.name).toBe('ConflictError');
    expect(e.message).toBe('version conflict');
  });

  it('ApiError stores status, code, message', () => {
    const e = new ApiError(418, 'TEAPOT', 'I am a teapot');
    expect(e.name).toBe('ApiError');
    expect(e.status).toBe(418);
    expect(e.code).toBe('TEAPOT');
    expect(e.message).toBe('I am a teapot');
  });
});

// ── SYNC_REQUEST_TIMEOUT constant ────────────────────────────────

describe('SYNC_REQUEST_TIMEOUT', () => {
  it('is 60 seconds', () => {
    expect(SYNC_REQUEST_TIMEOUT).toBe(60_000);
  });
});
