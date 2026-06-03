// ─── Shared fetch utilities ───────────────────────────────────────

const REQUEST_TIMEOUT = 15_000;

export function buildHeaders(token?: string): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

export async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('请求超时，请检查网络');
    }
    throw new Error('网络连接失败');
  } finally {
    clearTimeout(timer);
  }
}

export async function handleJsonResponse<T = unknown>(res: Response): Promise<T> {
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`服务器返回了非 JSON 响应 (${res.status})`);
  }
  if (!res.ok) throw new Error(data.error ?? '请求失败');
  return data as T;
}
