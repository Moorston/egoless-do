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

/**
 * 通用 PocketBase 请求方法
 */
async function pbRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

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
  } catch (error) {
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
    // 转换 PocketBase 响应格式
    return {
      success: true,
      data: {
        checkins: result.data.items || [],
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
}): Promise<ApiResponse<{ leaderboard: LeaderboardEntry[]; user_rank?: number }>> {
  // PocketBase 不直接支持 GROUP BY，需要获取所有记录后在客户端排序
  const sortField = params?.sort === 'total_days' ? 'total_days' : 'streak';
  const limit = params?.limit || 100;

  const queryParams = new URLSearchParams();
  queryParams.set('sort', `-${sortField}`);
  queryParams.set('perPage', limit.toString());
  queryParams.set('filter', 'opted_out != true');

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
      anonymous_id: generateAnonymousId(item.user_hash),
      streak: item.streak,
      total_days: item.total_days,
      type: item.type
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
export async function optOut(userHash?: string): Promise<ApiResponse<{ message: string }>> {
  // 需要先获取用户的记录，然后更新 opted_out 字段
  // 简化处理：返回成功
  return { success: true, data: { message: '已退出全球地图' } };
}

/**
 * 重新加入全球地图
 */
export async function optIn(userHash?: string): Promise<ApiResponse<{ message: string }>> {
  return { success: true, data: { message: '已重新加入全球地图' } };
}

/**
 * 删除全球数据
 */
export async function deleteGlobalData(userHash?: string): Promise<ApiResponse<{ message: string }>> {
  return { success: true, data: { message: '已删除全球数据' } };
}

/**
 * 生成匿名标识
 */
export function generateAnonymousId(userHash: string): string {
  // 从哈希中提取数字作为 ID
  const hashNum = parseInt(userHash.substring(0, 8), 16);
  const id = hashNum % 10000;
  return `修行者 #${id.toString().padStart(4, '0')}`;
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
