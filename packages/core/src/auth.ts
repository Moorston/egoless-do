// ─── Auth API client (shared across all platforms) ─────────────────
import type { AuthUser } from './types';
import type { SyncPushResult } from './sync/types';
import { buildHeaders, fetchWithTimeout, handleJsonResponse } from './fetch';

export interface AuthResponse {
  user: AuthUser;
  token: string;
  refreshToken: string;
  expiresAt: number;
}

export interface RefreshResponse {
  token: string;
  refreshToken: string;
  expiresAt: number;
}

let apiBase = '';

export function setApiBase(base: string) {
  apiBase = base.replace(/\/+$/, '');
}

export function validatePassword(pwd: string): string | null {
  if (pwd.length < 8) return '密码长度至少8位';
  if (!/[a-zA-Z]/.test(pwd)) return '密码需包含字母';
  if (!/[0-9]/.test(pwd)) return '密码需包含数字';
  if (!/[^a-zA-Z0-9]/.test(pwd)) return '密码需包含特殊符号';
  return null;
}

// ── Register ──────────────────────────────────────────────────────
export async function apiRegister(email: string, password: string, name: string, code: string): Promise<AuthResponse> {
  const res = await fetchWithTimeout(`${apiBase}/api/auth/register`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ email, password, name, code }),
  });
  return handleJsonResponse<AuthResponse>(res);
}

// ── Send verification code ────────────────────────────────────────
export async function apiSendCode(email: string, type?: 'register' | 'reset'): Promise<{ ok: boolean; message: string }> {
  const res = await fetchWithTimeout(`${apiBase}/api/auth/send-code`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ email, type }),
  });
  return handleJsonResponse<{ ok: boolean; message: string }>(res);
}

// ── Check email availability ──────────────────────────────────────
export async function apiCheckEmail(email: string): Promise<{ available: boolean; error?: string }> {
  const res = await fetchWithTimeout(`${apiBase}/api/auth/check-email`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ email }),
  });
  return handleJsonResponse<{ available: boolean; error?: string }>(res);
}

// ── Login ─────────────────────────────────────────────────────────
export async function apiLogin(email: string, password: string): Promise<AuthResponse> {
  const res = await fetchWithTimeout(`${apiBase}/api/auth/login`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ email, password }),
  });
  return handleJsonResponse<AuthResponse>(res);
}

// ── WeChat login ─────────────────────────────────────────────────
export async function apiWechatLogin(code: string): Promise<AuthResponse> {
  const res = await fetchWithTimeout(`${apiBase}/api/auth/wechat`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ code }),
  });
  return handleJsonResponse<AuthResponse>(res);
}

// ── Refresh token ─────────────────────────────────────────────────
export async function apiRefreshToken(refreshToken: string): Promise<RefreshResponse> {
  const res = await fetchWithTimeout(`${apiBase}/api/auth/refresh`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ refreshToken }),
  });
  return handleJsonResponse<RefreshResponse>(res);
}

// ── Get current user ──────────────────────────────────────────────
export async function apiGetMe(token: string): Promise<{ user: AuthUser }> {
  const res = await fetchWithTimeout(`${apiBase}/api/auth/me`, {
    headers: buildHeaders(token),
  });
  return handleJsonResponse<{ user: AuthUser }>(res);
}

// ── Logout ────────────────────────────────────────────────────────
export async function apiLogout(token: string, refreshToken: string): Promise<void> {
  await fetchWithTimeout(`${apiBase}/api/auth/logout`, {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify({ refreshToken }),
  });
}

// ── Reset password ──────────────────────────────────────────────
export async function apiResetPassword(email: string, code: string, password: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetchWithTimeout(`${apiBase}/api/auth/reset-password`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ email, code, password }),
  });
  return handleJsonResponse<{ ok: boolean; message: string }>(res);
}

// ── Sync: push local changes + pull server changes ───────────────
export async function apiSyncPush(token: string, lastSyncAt: number, changes: any[]): Promise<SyncPushResult> {
  const res = await fetchWithTimeout(`${apiBase}/api/sync`, {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify({ lastSyncAt, changes }),
  });
  return handleJsonResponse<SyncPushResult>(res);
}

// ── Sync: full pull (all user data, used after login) ────────────
export async function apiSyncPull(token: string): Promise<{ data: Record<string, any[]>; serverTime: number }> {
  const res = await fetchWithTimeout(`${apiBase}/api/sync`, {
    method: 'GET',
    headers: buildHeaders(token),
  });
  return handleJsonResponse<{ data: Record<string, any[]>; serverTime: number }>(res);
}

// ── Sync: lightweight check for server-side changes ──────────────
export async function apiSyncCheck(token: string, since: number): Promise<{ hasChanges: boolean; count: number }> {
  const res = await fetchWithTimeout(`${apiBase}/api/sync/check?since=${since}`, {
    method: 'GET',
    headers: buildHeaders(token),
  });
  return handleJsonResponse<{ hasChanges: boolean; count: number }>(res);
}
