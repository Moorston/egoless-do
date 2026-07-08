/**
 * 全球脉动 API 服务
 * 直接使用 PocketBase REST API
 */

import {
  GlobalCheckin,
  GlobalStats,
  LeaderboardEntry,
  CheckinRequest,
  ApiResponse,
  LeaderboardSort
} from '@egoless-do/core';

import { offlineAwareFetch } from '../../../net/offlineAware';

import { escapeFilter } from './pbFilterEscape';

// PocketBase API 基础 URL
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://egolessdo.freebytes.net';

// PocketBase 集合名称
const CHECKINS_COLLECTION = 'global_checkins';
const STATS_COLLECTION = 'global_stats';

const REQUEST_TIMEOUT = 10000;

/** PocketBase list response shape */
interface PbListResponse<T = Record<string, unknown>> {
  items: T[];
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

/** Generic success response for mutation endpoints */
interface PbMutationResponse {
  success?: boolean;
  [key: string]: unknown;
}

/**
 * 通用 PocketBase 请求方法（使用 offlineAwareFetch）
 */
async function pbRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await offlineAwareFetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: {
          code: data.code || 'UNKNOWN_ERROR',
          message: data.message || '请求失败'
        }
      };
    }

    return { success: true, data };
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: {
          code: 'TIMEOUT',
          message: '请求超时，请检查网络连接'
        }
      };
    }
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: '网络连接失败'
      }
    };
  }
}

let _lastSubmitAt = 0;
const SUBMIT_COOLDOWN_MS = 30_000;

/**
 * 提交打卡记录
 * Client-side rate limit: max 1 call per 30 seconds.
 *
 * NOTE: submitCheckin uses anonymous access by design — the global pulse
 * is a community feature where users submit check-ins via their user hash,
 * not via authenticated API calls. Rate limiting is handled server-side.
 */
export async function submitCheckin(
  checkin: CheckinRequest
): Promise<ApiResponse<GlobalCheckin>> {
  const now = Date.now();
  if (now - _lastSubmitAt < SUBMIT_COOLDOWN_MS) {
    return { success: false, error: { code: 'RATE_LIMITED', message: '操作过于频繁，请稍后再试' } };
  }
  _lastSubmitAt = now;

  const result = await pbRequest<GlobalCheckin>(
    `/api/collections/${CHECKINS_COLLECTION}/records`,
    {
      method: 'POST',
      body: JSON.stringify(checkin),
    }
  );
  return result;
}

/**
 * 获取打卡记录列表
 */
export async function getCheckins(params?: {
  type?: string;
  limit?: number;
  offset?: number;
  since?: string;
}): Promise<ApiResponse<{ checkins: GlobalCheckin[]; total: number; has_more: boolean }>> {
  // 构建 PocketBase 过滤条件
  const filters: string[] = [];

  if (params?.type) {
    filters.push(`type = "${escapeFilter(String(params.type))}"`);
  }

  if (params?.since) {
    filters.push(`created_at >= "${escapeFilter(String(params.since))}"`);
  }

  // 排除已退出的用户
  filters.push('opted_out != true');

  const queryParts: string[] = [];
  if (filters.length > 0) {
    queryParts.push(`filter=${encodeURIComponent(filters.join(' && '))}`);
  }
  if (params?.limit) {
    queryParts.push(`perPage=${params.limit}`);
  }
  if (params?.offset) {
    const page = Math.floor((params.offset || 0) / (params.limit || 20)) + 1;
    queryParts.push(`page=${page}`);
  }
  // 按创建时间倒序
  queryParts.push('sort=-created_at');
  const query = queryParts.join('&');

  const result = await pbRequest<PbListResponse<Record<string, unknown>>>(
    `/api/collections/${CHECKINS_COLLECTION}/records${query ? `?${query}` : ''}`
  );

  if (result.success && result.data) {
    // 转换 PocketBase 响应格式，确保数值字段为数字类型
    const checkins = (result.data.items || []).map((item: Record<string, unknown>) => ({
      ...item,
      checkin_id: item.id || item.checkin_id,
      nickname: item.nickname || '',
      lat: Number(item.lat) || 0,
      lng: Number(item.lng) || 0,
      streak: Number(item.streak) || 0,
      total_days: Number(item.total_days) || 0,
    }));
    return {
      success: true,
      data: {
        checkins,
        total: result.data.totalItems || 0,
        has_more: result.data.page < result.data.totalPages
      }
    };
  }

  return result as ApiResponse<{ checkins: GlobalCheckin[]; total: number; has_more: boolean }>;
}

/**
 * 获取全球统计
 */
export async function getGlobalStats(): Promise<ApiResponse<GlobalStats>> {
  const result = await pbRequest<PbListResponse<Record<string, unknown>>>(
    `/api/collections/${STATS_COLLECTION}/records?perPage=1`
  );

  if (result.success && result.data?.items?.length > 0) {
    return {
      success: true,
      data: result.data.items[0] as unknown as GlobalStats
    };
  }

  return {
    success: false,
    error: { code: 'NOT_FOUND', message: '统计数据不存在' }
  };
}

/**
 * 获取排行榜（从 leaderboard 集合，服务端维护）
 */
export async function getLeaderboard(params?: {
  sort?: LeaderboardSort;
  limit?: number;
  type?: string;
}): Promise<ApiResponse<{ leaderboard: LeaderboardEntry[]; user_rank?: number }>> {
  const sortField = params?.sort === 'total_days' ? 'total_days' : 'best_streak';
  const limit = params?.limit || 100;

  const query = `sort=-${sortField}&perPage=${limit}`;
  const result = await pbRequest<PbListResponse<LeaderboardEntry>>(
    `/api/collections/leaderboard/records?${query}`
  );

  if (result.success && result.data) {
    const leaderboard: LeaderboardEntry[] = (result.data.items || []).map((item: Record<string, unknown>, index: number) => ({
      rank: index + 1,
      user_hash: item.user_hash,
      lat: 0,
      lng: 0,
      streak: Number(item.best_streak),
      total_days: Number(item.total_days),
      type: '',
      created_at: item.last_active_at
    }));

    return {
      success: true,
      data: { leaderboard }
    };
  }

  return result as ApiResponse<{ leaderboard: LeaderboardEntry[]; user_rank?: number }>;
}

/**
 * 退出全球地图
 */
export async function optOut(userHash: string): Promise<ApiResponse<{ message: string }>> {
  const result = await pbRequest<PbMutationResponse>('/api/global-pulse/opt-out', {
    method: 'POST',
    body: JSON.stringify({ user_hash: userHash }),
  });

  if (result.success) {
    return { success: true, data: { message: '已退出全球地图' } };
  }
  return { success: false, error: { code: 'OPT_OUT_FAILED', message: '退出失败' } };
}

/**
 * 重新加入全球地图
 */
export async function optIn(userHash: string): Promise<ApiResponse<{ message: string }>> {
  const result = await pbRequest<PbMutationResponse>('/api/global-pulse/opt-in', {
    method: 'POST',
    body: JSON.stringify({ user_hash: userHash }),
  });

  if (result.success) {
    return { success: true, data: { message: '已重新加入全球地图' } };
  }
  return { success: false, error: { code: 'OPT_IN_FAILED', message: '重新加入失败' } };
}

/**
 * 删除全球数据
 */
export async function deleteGlobalData(userHash: string): Promise<ApiResponse<{ message: string }>> {
  const result = await pbRequest<PbMutationResponse>('/api/global-pulse/delete-data', {
    method: 'POST',
    body: JSON.stringify({ user_hash: userHash }),
  });

  if (result.success) {
    return { success: true, data: { message: '已删除全球数据' } };
  }
  return { success: false, error: { code: 'DELETE_FAILED', message: '删除失败' } };
}

/**
 * 生成匿名标识
 */
export function generateAnonymousId(userHash: string): string {
  if (!userHash || userHash.length < 2) return '修行者';
  const hashNum = parseInt(userHash.substring(0, 8), 16);
  if (isNaN(hashNum)) return '修行者';
  const id = hashNum % 10000;
  return `修行者 #${id.toString().padStart(4, '0')}`;
}

/**
 * 格式化显示名称
 * 始终显示序号，有昵称则昵称+序号，无昵称则"修行者"+序号
 */
export function formatDisplayName(nickname?: string, userHash?: string): string {
  const id = generateAnonymousId(userHash || '');
  const num = id.replace('修行者 ', ''); // "#1234"
  if (nickname) {
    const name = nickname.length > 4 ? nickname.slice(0, 4) + '...' : nickname;
    return `${name} ${num}`;
  }
  return id;
}

/**
 * 获取打卡类型图标
 */
export function getCheckinTypeIcon(type: string): string {
  switch (type) {
    case 'exercise': return '🏃';
    case 'fasting': return '🍽️';
    case 'meditation': return '🧘';
    default: return '✨';
  }
}

/**
 * 获取打卡类型颜色
 */
export function getCheckinTypeColor(type: string): string {
  switch (type) {
    case 'exercise': return '#3B82F6';  // 蓝色
    case 'fasting': return '#F59E0B';   // 橙色
    case 'meditation': return '#8B5CF6'; // 紫色
    default: return '#6B7280';          // 灰色
  }
}
