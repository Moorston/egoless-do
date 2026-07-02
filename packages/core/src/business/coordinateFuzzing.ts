/**
 * 坐标模糊算法
 * 在 ±500 米范围内随机偏移，保护用户隐私
 */

// 地球半径（米）
const EARTH_RADIUS = 6371000;

// 最大偏移距离（米）
const MAX_OFFSET_METERS = 500;

/**
 * 简单的字符串哈希函数（djb2）
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // 转换为 32 位整数
  }
  return Math.abs(hash);
}

/**
 * 基于种子的伪随机数生成器
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * 将米转换为纬度偏移
 */
function metersToLatOffset(meters: number): number {
  return meters / EARTH_RADIUS * (180 / Math.PI);
}

/**
 * 将米转换为经度偏移（考虑纬度）
 */
function metersToLngOffset(meters: number, lat: number): number {
  return meters / (EARTH_RADIUS * Math.cos(lat * Math.PI / 180)) * (180 / Math.PI);
}

/**
 * 模糊坐标
 * @param lat 原始纬度
 * @param lng 原始经度
 * @param userHash 用户哈希（用于确定性随机）
 * @returns [模糊纬度, 模糊经度]
 */
export function fuzzCoordinate(
  lat: number,
  lng: number,
  userHash: string
): [number, number] {
  // 使用用户哈希作为随机种子
  const seed = hashString(userHash + lat.toFixed(6) + lng.toFixed(6));
  const rng = seededRandom(seed);

  // 生成随机角度和距离
  const angle = rng() * 2 * Math.PI;
  const distance = rng() * MAX_OFFSET_METERS;

  // 计算偏移
  const latOffset = Math.cos(angle) * distance;
  const lngOffset = Math.sin(angle) * distance;

  // 转换为经纬度偏移
  const deltaLat = metersToLatOffset(latOffset);
  const deltaLng = metersToLngOffset(lngOffset, lat);

  // 应用偏移
  const fuzzedLat = lat + deltaLat;
  const fuzzedLng = lng + deltaLng;

  // 确保坐标在有效范围内
  return [
    Math.max(-90, Math.min(90, fuzzedLat)),
    Math.max(-180, Math.min(180, fuzzedLng))
  ];
}

/**
 * 验证坐标是否在有效范围内
 */
export function isValidCoordinate(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * 计算两个坐标之间的距离（米）
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS * c;
}
