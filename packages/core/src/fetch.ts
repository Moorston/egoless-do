// ─── Shared fetch utilities ───────────────────────────────────────

const REQUEST_TIMEOUT = 15_000;
export const SYNC_REQUEST_TIMEOUT = 60_000;

export function buildHeaders(token?: string): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

export class NetworkError extends Error {
  constructor(message: string) { super(message); this.name = 'NetworkError'; }
}

export class ServerError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.name = 'ServerError'; this.status = status; }
}

export class ValidationError extends Error {
  status: number; code: string;
  constructor(status: number, code: string, message: string) { super(message); this.name = 'ValidationError'; this.status = status; this.code = code; }
}

export class AuthError extends Error {
  status: number; code: string;
  constructor(status: number, code: string, message: string) { super(message); this.name = 'AuthError'; this.status = status; this.code = code; }
}

export class KickedOutError extends AuthError {
  constructor() { super(401, 'KICKED_OUT', '您的账号已在其他设备登录'); this.name = 'KickedOutError'; }
}

export class ConflictError extends Error {
  constructor(message: string) { super(message); this.name = 'ConflictError'; }
}

export async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs?: number): Promise<Response> {
  const controller = new AbortController();
  // If caller provided a signal, abort our controller when caller's signal aborts
  const onParentAbort = () => controller.abort();
  if (init.signal) {
    if (init.signal.aborted) {
      // Signal already aborted — propagate immediately
      controller.abort();
    } else {
      init.signal.addEventListener('abort', onParentAbort, { once: true });
    }
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs ?? REQUEST_TIMEOUT);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      if (init.signal?.aborted) {
        throw new NetworkError('请求被取消');
      }
      throw new NetworkError('请求超时，请检查网络');
    }
    throw new NetworkError('网络连接失败');
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener('abort', onParentAbort);
  }
}

export class ApiError extends Error {
  status: number; code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

function classifyError(res: Response, data: unknown): Error {
  const obj = data as Record<string, unknown> | undefined;
  const code = obj?.code ?? '';
  const msg = obj?.message ?? obj?.error ?? '请求失败';
  if (res.status === 401 && code === 'KICKED_OUT') return new KickedOutError();
  if (res.status === 401) return new AuthError(401, code as string, msg as string);
  if (res.status >= 400 && res.status < 500) return new ValidationError(res.status, code as string, msg as string);
  if (res.status >= 500) return new ServerError(res.status, msg as string);
  return new ApiError(res.status, code as string, msg as string);
}

export async function handleJsonResponse<T = unknown>(res: Response): Promise<T> {
  const text = await res.text();
  if (text.trim().length === 0) {
    // HTTP 204 No Content is a valid success response (common for DELETE operations)
    if (res.status === 204) return {} as T;
    if (!res.ok) throw new ApiError(res.status, 'EMPTY_RESPONSE', `服务器返回了空的响应 (${res.status})`);
    // 200/201 with empty body — some APIs return void on success
    return {} as T;
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new NetworkError(`服务器返回了非 JSON 响应 (${res.status})`);
  }
  if (!res.ok) throw classifyError(res, data);
  return data as T;
}
