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
} from '../types/globalPulse';

// PocketBase API 基础 URL
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8090';

// PocketBase 集合名称
const CHECKINS_COLLECTION = 'global_checkins';
const STATS_COLLECTION = 'global_stats';

const REQUEST_TIMEOUT = 10000;

/**
 * 通用 PocketBase 请求方法
 */
async function pbRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
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
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error?.name === 'AbortError') {
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

/**
 * 提交打卡记录
 */
export async function submitCheckin(
  checkin: CheckinRequest
): Promise<ApiResponse<GlobalCheckin>> {
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
    filters.push(`type = "${params.type}"`);
  }

  if (params?.since) {
    filters.push(`created_at >= "${params.since}"`);
  }

  // 排除已退出的用户
  filters.push('opted_out != true');

  const queryParams = new URLSearchParams();
  if (filters.length > 0) {
    queryParams.set('filter', filters.join(' && '));
  }
  if (params?.limit) {
    queryParams.set('perPage', params.limit.toString());
  }
  if (params?.offset) {
    const page = Math.floor((params.offset || 0) / (params.limit || 20)) + 1;
    queryParams.set('page', page.toString());
  }

  // 按创建时间倒序
  queryParams.set('sort', '-created_at');

  const query = queryParams.toString();
  const result = await pbRequest<any>(
    `/api/collections/${CHECKINS_COLLECTION}/records${query ? `?${query}` : ''}`
  );

  if (result.success && result.data) {
    // 转换 PocketBase 响应格式，确保数值字段为数字类型
    const checkins = (result.data.items || []).map((item: any) => ({
      ...item,
      checkin_id: item.id || item.checkin_id,
      nickname: item.nickname || '',
      lat: Number(item.lat),
      lng: Number(item.lng),
      streak: Number(item.streak),
      total_days: Number(item.total_days),
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

  return result as any;
}

/**
 * 获取全球统计
 */
export async function getGlobalStats(): Promise<ApiResponse<GlobalStats>> {
  const result = await pbRequest<any>(
    `/api/collections/${STATS_COLLECTION}/records?perPage=1`
  );

  if (result.success && result.data?.items?.length > 0) {
    return {
      success: true,
      data: result.data.items[0]
    };
  }

  return {
    success: false,
    error: { code: 'NOT_FOUND', message: '统计数据不存在' }
  };
}

/**
 * 获取排行榜
 */
export async function getLeaderboard(params?: {
  sort?: LeaderboardSort;
  limit?: number;
  type?: string;
}): Promise<ApiResponse<{ leaderboard: LeaderboardEntry[]; user_rank?: number }>> {
  // PocketBase 不直接支持 GROUP BY，需要获取所有记录后在客户端排序
  const sortField = params?.sort === 'total_days' ? 'total_days' : 'streak';
  const limit = params?.limit || 100;

  const filters: string[] = ['opted_out != true'];
  if (params?.type) {
    filters.push(`type = "${params.type}"`);
  }

  const queryParams = new URLSearchParams();
  queryParams.set('sort', `-${sortField}`);
  queryParams.set('perPage', limit.toString());
  queryParams.set('filter', filters.join(' && '));

  const result = await pbRequest<any>(
    `/api/collections/${CHECKINS_COLLECTION}/records?${queryParams.toString()}`
  );

  if (result.success && result.data) {
    // 按 user_hash 去重，保留最新的记录
    const seen = new Set<string>();
    const uniqueCheckins: any[] = [];

    for (const item of result.data.items || []) {
      if (!seen.has(item.user_hash)) {
        seen.add(item.user_hash);
        uniqueCheckins.push(item);
      }
    }

    const leaderboard: LeaderboardEntry[] = uniqueCheckins.map((item: any, index: number) => ({
      rank: index + 1,
      user_hash: item.user_hash,
      lat: Number(item.lat),
      lng: Number(item.lng),
      streak: Number(item.streak),
      total_days: Number(item.total_days),
      type: item.type,
      created_at: item.created_at
    }));

    return {
      success: true,
      data: { leaderboard }
    };
  }

  return result as any;
}

/**
 * 退出全球地图
 */
export async function optOut(userHash: string): Promise<ApiResponse<{ message: string }>> {
  try {
    // 获取用户的所有记录
    const filter = encodeURIComponent(`user_hash = "${userHash}"`);
    const listResult = await pbRequest<any>(
      `/api/collections/${CHECKINS_COLLECTION}/records?filter=${filter}&perPage=500`
    );

    if (!listResult.success || !listResult.data?.items) {
      return { success: false, error: { code: 'FETCH_FAILED', message: '获取记录失败' } };
    }

    // 批量更新 opted_out 字段
    const updatePromises = listResult.data.items.map((item: any) =>
      pbRequest(`/api/collections/${CHECKINS_COLLECTION}/records/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ opted_out: true }),
      })
    );

    await Promise.all(updatePromises);

    return { success: true, data: { message: '已退出全球地图' } };
  } catch (error) {
    return { success: false, error: { code: 'OPT_OUT_FAILED', message: '退出失败' } };
  }
}

/**
 * 重新加入全球地图
 */
export async function optIn(userHash: string): Promise<ApiResponse<{ message: string }>> {
  try {
    // 获取用户的所有记录
    const filter = encodeURIComponent(`user_hash = "${userHash}"`);
    const listResult = await pbRequest<any>(
      `/api/collections/${CHECKINS_COLLECTION}/records?filter=${filter}&perPage=500`
    );

    if (!listResult.success || !listResult.data?.items) {
      return { success: false, error: { code: 'FETCH_FAILED', message: '获取记录失败' } };
    }

    // 批量更新 opted_out 字段
    const updatePromises = listResult.data.items.map((item: any) =>
      pbRequest(`/api/collections/${CHECKINS_COLLECTION}/records/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ opted_out: false }),
      })
    );

    await Promise.all(updatePromises);

    return { success: true, data: { message: '已重新加入全球地图' } };
  } catch (error) {
    return { success: false, error: { code: 'OPT_IN_FAILED', message: '重新加入失败' } };
  }
}

/**
 * 删除全球数据
 */
export async function deleteGlobalData(userHash: string): Promise<ApiResponse<{ message: string }>> {
  try {
    // 获取用户的所有记录
    const filter = encodeURIComponent(`user_hash = "${userHash}"`);
    const listResult = await pbRequest<any>(
      `/api/collections/${CHECKINS_COLLECTION}/records?filter=${filter}&perPage=500`
    );

    if (!listResult.success || !listResult.data?.items) {
      return { success: false, error: { code: 'FETCH_FAILED', message: '获取记录失败' } };
    }

    // 批量删除记录
    const deletePromises = listResult.data.items.map((item: any) =>
      pbRequest(`/api/collections/${CHECKINS_COLLECTION}/records/${item.id}`, {
        method: 'DELETE',
      })
    );

    await Promise.all(deletePromises);

    return { success: true, data: { message: '已删除全球数据' } };
  } catch (error) {
    return { success: false, error: { code: 'DELETE_FAILED', message: '删除失败' } };
  }
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
 * 有昵称显示昵称（超过4字截断），无昵称显示匿名标识
 */
export function formatDisplayName(nickname?: string, userHash?: string): string {
  if (nickname) {
    return nickname.length > 4 ? nickname.slice(0, 4) + '...' : nickname;
  }
  return generateAnonymousId(userHash || '');
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
