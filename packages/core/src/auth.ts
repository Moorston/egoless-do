// ─── Auth API client (shared across all platforms) ─────────────────
import type { AuthUser } from './types';
import type { SyncPushResult, SyncCheckResult, SyncPullPostBody, SyncPullResult, SyncChange, SyncPushResponseItem } from './sync/types';
import { buildHeaders, fetchWithTimeout, handleJsonResponse, SYNC_REQUEST_TIMEOUT } from './fetch';
import { createLogger } from './logger';

const log = createLogger('Auth');

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
  if (pwd.length < 10) return '密码长度至少10位';
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
export async function apiRefreshToken(refreshToken: string, token?: string): Promise<RefreshResponse> {
  const res = await fetchWithTimeout(`${apiBase}/api/auth/refresh`, {
    method: 'POST',
    headers: buildHeaders(token),
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
  const res = await fetchWithTimeout(`${apiBase}/api/auth/logout`, {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    const text = await res.text();
    log.error(`Logout failed: ${res.status}`, text);
  }
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
export async function apiSyncPush(token: string, _lastSyncAt: number, changes: SyncChange[], userId?: string): Promise<SyncPushResult> {
  const res = await fetchWithTimeout(`${getSyncBase()}/api/sync`, {
    method: 'POST',
    headers: { ...buildHeaders(token), ...(userId ? { 'X-User-Id': userId } : {}) },
    body: JSON.stringify({ changes, skipPull: true }),
  }, SYNC_REQUEST_TIMEOUT);
  const result = await handleJsonResponse<{ changes: SyncPushResponseItem[]; rejected: SyncPushResponseItem[]; serverTime: number }>(res);
  return { applied: result.changes, rejected: result.rejected, serverTime: result.serverTime };
}

// ── Sync: pull user data via POST (entity-filtered) ──────────
export async function apiSyncPullPost(token: string, body: SyncPullPostBody, userId?: string): Promise<SyncPullResult> {
  const res = await fetchWithTimeout(`${getSyncBase()}/api/sync`, {
    method: 'POST',
    headers: { ...buildHeaders(token), ...(userId ? { 'X-User-Id': userId } : {}) },
    body: JSON.stringify({ changes: [], lastSyncAt: body.since || 0, entities: body.entities }),
  }, SYNC_REQUEST_TIMEOUT);
  const result = await handleJsonResponse<SyncPullResult>(res);
  return { data: result.data || {}, serverTime: result.serverTime };
}

// ── Sync: pull user data via GET (full or incremental, backward compat) ──
export async function apiSyncPull(token: string, userId?: string, since?: number): Promise<SyncPullResult> {
  const sinceParam = since ? `?since=${since}` : '';
  const res = await fetchWithTimeout(`${getSyncBase()}/api/sync${sinceParam}`, {
    method: 'GET',
    headers: { ...buildHeaders(token), ...(userId ? { 'X-User-Id': userId } : {}) },
  }, SYNC_REQUEST_TIMEOUT);
  return handleJsonResponse<SyncPullResult>(res);
}

// ── Sync: lightweight check (returns per-entity change map) ────
export async function apiSyncCheck(token: string, since: number, userId?: string): Promise<SyncCheckResult> {
  const res = await fetchWithTimeout(`${getSyncBase()}/api/sync/check?since=${since}`, {
    method: 'GET',
    headers: { ...buildHeaders(token), ...(userId ? { 'X-User-Id': userId } : {}) },
  }, SYNC_REQUEST_TIMEOUT);
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
  // Use the POST /api/sync/pull endpoint with entity filter
  const res = await fetchWithTimeout(`${getSyncBase()}/api/sync/pull`, {
    method: 'POST',
    headers: { ...buildHeaders(token), ...(userId ? { 'X-User-Id': userId } : {}) },
    body: JSON.stringify({ entities: [entity], page, pageSize }),
  }, SYNC_REQUEST_TIMEOUT);
  const result = await handleJsonResponse<{ data: Record<string, unknown[]> & { _meta?: Record<string, { total: number }> }; serverTime: number }>(res);
  const entityData = result.data?.[entity] || [];
  // Get total count from _meta if available, otherwise estimate
  const meta = result.data?._meta?.[entity];
  const total = meta?.total ?? entityData.length;
  // Calculate if there are more pages
  const offset = (page - 1) * pageSize;
  const hasMore = (offset + entityData.length) < total;
  log.debug(`apiSyncPullEntity ${entity}: page=${page}, pageSize=${pageSize}, returned=${entityData.length}, total=${total}, hasMore=${hasMore}`);
  return {
    data: entityData,
    total,
    page,
    pageSize,
    hasMore,
    serverTime: result.serverTime,
  };
}
