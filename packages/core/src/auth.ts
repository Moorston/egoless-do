// ─── Auth API client (shared across all platforms) ─────────────────
import type { AuthUser } from './types';
import type { SyncPushResult, SyncCheckResult, SyncPullPostBody } from './sync/types';
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
let syncBase = '';

export function setApiBase(base: string) {
  apiBase = base.replace(/\/+$/, '');
}

export function setSyncApiBase(base: string) {
  syncBase = base.replace(/\/+$/, '');
}

function getSyncBase(): string {
  return syncBase || apiBase;
}

export function getSyncUrl(): string {
  return getSyncBase();
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

// ── Sync: push local changes (pure push, no pull data) ──────────
export async function apiSyncPush(token: string, _lastSyncAt: number, changes: any[], userId?: string): Promise<SyncPushResult> {
  const res = await fetchWithTimeout(`${getSyncBase()}/api/sync/push`, {
    method: 'POST',
    headers: { ...buildHeaders(token), ...(userId ? { 'X-User-Id': userId } : {}) },
    body: JSON.stringify({ changes }),
  });
  return handleJsonResponse<SyncPushResult>(res);
}

// ── Sync: pull user data via POST (entity-filtered) ──────────
export async function apiSyncPullPost(token: string, body: SyncPullPostBody, userId?: string): Promise<{ data: Record<string, any[]>; serverTime: number }> {
  const res = await fetchWithTimeout(`${getSyncBase()}/api/sync/pull`, {
    method: 'POST',
    headers: { ...buildHeaders(token), ...(userId ? { 'X-User-Id': userId } : {}) },
    body: JSON.stringify(body),
  });
  return handleJsonResponse<{ data: Record<string, any[]>; serverTime: number }>(res);
}

// ── Sync: pull user data via GET (full or incremental, backward compat) ──
export async function apiSyncPull(token: string, userId?: string, since?: number): Promise<{ data: Record<string, any[]>; serverTime: number }> {
  const sinceParam = since ? `?since=${since}` : '';
  const res = await fetchWithTimeout(`${getSyncBase()}/api/sync${sinceParam}`, {
    method: 'GET',
    headers: { ...buildHeaders(token), ...(userId ? { 'X-User-Id': userId } : {}) },
  });
  return handleJsonResponse<{ data: Record<string, any[]>; serverTime: number }>(res);
}

// ── Sync: lightweight check (returns per-entity change map) ────
export async function apiSyncCheck(token: string, since: number, userId?: string): Promise<SyncCheckResult> {
  const res = await fetchWithTimeout(`${getSyncBase()}/api/sync/check?since=${since}`, {
    method: 'GET',
    headers: { ...buildHeaders(token), ...(userId ? { 'X-User-Id': userId } : {}) },
  });
  return handleJsonResponse<SyncCheckResult>(res);
}

// ── Sync: per-entity paginated pull (for phased initial sync) ────
export interface SyncPullEntityResult {
  data: unknown[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  serverTime: number;
}

export async function apiSyncPullEntity(token: string, entity: string, page: number, pageSize: number, userId?: string): Promise<SyncPullEntityResult> {
  const res = await fetchWithTimeout(`${getSyncBase()}/api/sync/pull/${entity}?page=${page}&pageSize=${pageSize}`, {
    method: 'GET',
    headers: { ...buildHeaders(token), ...(userId ? { 'X-User-Id': userId } : {}) },
  });
  return handleJsonResponse<SyncPullEntityResult>(res);
}
