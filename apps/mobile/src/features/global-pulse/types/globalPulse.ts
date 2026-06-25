/**
 * 全球脉动地图功能类型定义
 */

// 打卡类型
export type CheckinType = 'exercise' | 'fasting' | 'meditation';

// 全球打卡记录
export interface GlobalCheckin {
  checkin_id: string;       // UUID
  user_hash: string;        // SHA256 匿名哈希
  nickname?: string;        // 用户昵称
  lat: number;              // 模糊纬度（±500m）
  lng: number;              // 模糊经度（±500m）
  type: CheckinType;        // 打卡类型
  streak: number;           // 当前连续打卡天数
  total_days: number;       // 总打卡天数
  created_at: string;       // UTC 时间戳
  opted_out?: boolean;      // 是否退出全球地图
  city?: string;            // 城市名（客户端反向编码）
}

// 全球统计
export interface GlobalStats {
  total_users: number;      // 参与用户总数
  active_today: number;     // 今日活跃用户
  top_streak: number;       // 最长连续打卡记录
  countries: number;        // 覆盖国家数量
  updated_at: string;       // 更新时间
}

// 用户偏好
export interface UserPreferences {
  show_on_global_map: boolean;        // 是否显示在全球地图
  global_map_intro_shown: boolean;    // 是否已显示隐私提示
}

// 排行榜条目
export interface LeaderboardEntry {
  rank: number;             // 排名
  user_hash: string;        // 匿名用户哈希
  nickname?: string;        // 用户昵称
  lat: number;              // 纬度
  lng: number;              // 经度
  streak: number;           // 当前连续打卡天数
  total_days: number;       // 总打卡天数
  type: CheckinType;        // 打卡类型
  created_at: string;       // 开始日期
  city?: string;            // 城市名（客户端反向编码）
}

// 排行榜排序方式
export type LeaderboardSort = 'streak' | 'total_days';

// 聚合标记
export interface ClusterMarker {
  id: string;               // 聚合 ID
  lat: number;              // 中心纬度
  lng: number;              // 中心经度
  count: number;            // 聚合数量
  checkins: GlobalCheckin[]; // 聚合的打卡记录
}

// 地图边界
export interface MapBounds {
  northEast: { lat: number; lng: number };
  southWest: { lat: number; lng: number };
}

// API 响应
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// 打卡提交请求
export interface CheckinRequest {
  type: CheckinType;
  user_hash: string;
  nickname?: string;
  lat: number;
  lng: number;
  streak: number;
  total_days: number;
}

// 排行榜请求
export interface LeaderboardRequest {
  sort?: LeaderboardSort;
  limit?: number;
}

// 数据同步状态
export interface SyncStatus {
  last_sync: string;        // 最后同步时间
  is_syncing: boolean;      // 是否正在同步
  pending_count: number;    // 待同步数量
}

// 网络状态
export interface NetworkStatus {
  is_online: boolean;       // 是否在线
  connection_type: string;  // 连接类型
}
