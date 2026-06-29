// ─── Shared fetch utilities ───────────────────────────────────────

const REQUEST_TIMEOUT = 15_000;

export function buildHeaders(token?: string): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', 'Accept-Encoding': 'gzip' };
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

export async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new NetworkError('请求超时，请检查网络');
    }
    throw new NetworkError('网络连接失败');
  } finally {
    clearTimeout(timer);
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

function classifyError(res: Response, data: any): Error {
  const code = data.code ?? '';
  const msg = data.message ?? data.error ?? '请求失败';
  if (res.status === 401 && code === 'KICKED_OUT') return new KickedOutError();
  if (res.status === 401) return new AuthError(401, code, msg);
  if (res.status >= 400 && res.status < 500) return new ValidationError(res.status, code, msg);
  if (res.status >= 500) return new ServerError(res.status, msg);
  return new ApiError(res.status, code, msg);
}

export async function handleJsonResponse<T = unknown>(res: Response): Promise<T> {
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new NetworkError(`服务器返回了非 JSON 响应 (${res.status})`);
  }
  if (!res.ok) throw classifyError(res, data);
  return data as T;
}
