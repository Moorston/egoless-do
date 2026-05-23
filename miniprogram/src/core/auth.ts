// ─── Auth API client (miniprogram local) ───────────────────────────
import type { AuthUser } from './types';

export interface AuthResponse {
  user: AuthUser;
  token: string;
  refreshToken: string;
  expiresAt: number;
}

const REQUEST_TIMEOUT = 15000;

let apiBase = '';

export function setApiBase(base: string) {
  apiBase = base.replace(/\/+$/, '');
}

function headers(token?: string): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function fetchWithTimeout(url: string, init: any): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT) as any;
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error('请求超时，请检查网络');
    throw new Error('网络连接失败');
  } finally {
    clearTimeout(timer);
  }
}

async function handleRes(res: Response) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? '请求失败');
  return data;
}

export async function apiLogin(email: string, password: string): Promise<AuthResponse> {
  const res = await fetchWithTimeout(`${apiBase}/api/auth/login`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email, password }),
  });
  return handleRes(res);
}

export async function apiRegister(email: string, password: string, name: string, code: string): Promise<AuthResponse> {
  const res = await fetchWithTimeout(`${apiBase}/api/auth/register`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email, password, name, code }),
  });
  return handleRes(res);
}

export async function apiWechatLogin(code: string): Promise<AuthResponse> {
  const res = await fetchWithTimeout(`${apiBase}/api/auth/wechat`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ code }),
  });
  return handleRes(res);
}

export async function apiRefreshToken(refreshToken: string): Promise<AuthResponse> {
  const res = await fetchWithTimeout(`${apiBase}/api/auth/refresh`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ refreshToken }),
  });
  return handleRes(res);
}

export async function apiLogout(token: string, refreshToken: string): Promise<void> {
  await fetchWithTimeout(`${apiBase}/api/auth/logout`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ refreshToken }),
  });
}

export async function apiSyncPull(token: string): Promise<{ data: Record<string, any[]>; serverTime: number }> {
  const res = await fetchWithTimeout(`${apiBase}/api/sync`, {
    method: 'GET',
    headers: headers(token),
  });
  return handleRes(res);
}

export function validatePassword(pwd: string): string | null {
  if (pwd.length < 8) return '密码长度至少8位';
  if (!/[a-zA-Z]/.test(pwd)) return '密码需包含字母';
  if (!/[0-9]/.test(pwd)) return '密码需包含数字';
  if (/^[a-zA-Z0-9]+$/.test(pwd)) return '密码需包含特殊符号';
  return null;
}
