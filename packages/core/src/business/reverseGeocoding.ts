/**
 * 反向地理编码服务
 * 使用 OpenStreetMap Nominatim API 获取城市名
 */

import { createLogger } from '../logger';

const log = createLogger('GlobalPulse');

// 缓存：key 为 "lat,lng"（保留2位小数）
const cache = new Map<string, CityInfo>();

// 请求队列
const requestQueue: Array<{
  key: string;
  lat: number;
  lng: number;
  resolve: (value: CityInfo | null) => void;
}> = [];

let isProcessing = false;

export interface CityInfo {
  city: string;
  country: string;
  displayName: string;
}

/**
 * 将坐标转换为缓存 key（保留2位小数）
 */
function getCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

/**
 * 从 Nominatim 响应中提取城市名
 */
function extractCityName(data: unknown): CityInfo | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  const address = obj.address as Record<string, string> | undefined;
  if (!address) return null;

  // 优先级：city > town > village > county > state
  const city = address.city || address.town || address.village || address.county || address.state || '';
  const country = address.country || '';

  if (!city && !country) return null;

  return {
    city: city,
    country: country,
    displayName: city ? `${city}, ${country}` : country,
  };
}

/**
 * 处理请求队列
 */
async function processQueue() {
  if (isProcessing || requestQueue.length === 0) return;

  isProcessing = true;

  try {
    while (requestQueue.length > 0) {
      const request = requestQueue.shift()!;
      const cached = cache.get(request.key);

      if (cached) {
        request.resolve(cached);
        continue;
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const url = `https://nominatim.openstreetmap.org/reverse?lat=${request.lat}&lon=${request.lng}&format=json&accept-language=zh&zoom=10`;
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'EgolessDo/1.0 (Global Pulse Feature)',
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) {
          request.resolve(null);
          continue;
        }

        const data = await response.json();
        const cityInfo = extractCityName(data);

        if (cityInfo) {
          cache.set(request.key, cityInfo);
        }

        request.resolve(cityInfo);
      } catch (error: unknown) {
        if (!(error instanceof Error) || error.name !== 'AbortError') {
          log.warn('Reverse geocoding failed:', error instanceof Error ? error.message : error);
        }
        request.resolve(null);
      }

      if (requestQueue.length > 0) {
        await new Promise<void>(resolve => setTimeout(resolve, 1000));
      }
    }
  } finally {
    isProcessing = false;
  }
}

/**
 * 获取城市信息
 * @param lat 纬度
 * @param lng 经度
 * @returns 城市信息或 null
 */
export async function getCityInfo(lat: number, lng: number): Promise<CityInfo | null> {
  const key = getCacheKey(lat, lng);

  // 检查缓存
  const cached = cache.get(key);
  if (cached) return cached;

  // 添加到队列
  return new Promise((resolve) => {
    requestQueue.push({ key, lat, lng, resolve });
    processQueue();
  });
}

/**
 * 批量获取城市信息
 * @param coordinates 坐标数组
 * @returns 城市信息 Map
 */
export async function getCityInfoBatch(
  coordinates: Array<{ lat: number; lng: number }>
): Promise<Map<string, CityInfo | null>> {
  const results = new Map<string, CityInfo | null>();

  // 并发请求（但有节流控制）
  const promises = coordinates.map(async ({ lat, lng }) => {
    const key = getCacheKey(lat, lng);
    const info = await getCityInfo(lat, lng);
    results.set(key, info);
  });

  await Promise.all(promises);
  return results;
}

/**
 * 清除缓存
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * 获取缓存大小
 */
export function getCacheSize(): number {
  return cache.size;
}
