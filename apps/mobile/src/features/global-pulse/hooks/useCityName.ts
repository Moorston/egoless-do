/**
 * 城市名称 Hook
 * 封装反向地理编码服务为 React Hook
 */

import { getCityInfo, CityInfo, createLogger } from '@egoless-do/core';
import { useState, useEffect, useRef, useMemo } from 'react';

// 全局缓存，避免重复请求
const cityCache = new Map<string, CityInfo | null>();

const log = createLogger('GlobalPulse');

interface UseCityNameResult {
  city: string | null;
  country: string | null;
  displayName: string | null;
  loading: boolean;
}

/**
 * 获取城市名称的 Hook
 * @param lat 纬度
 * @param lng 经度
 * @param existingCity 已有的城市名（来自 PocketBase）
 * @returns 城市信息
 */
export function useCityName(lat: number | undefined, lng: number | undefined, existingCity?: string): UseCityNameResult {
  const [result, setResult] = useState<UseCityNameResult>({
    city: existingCity || null,
    country: null,
    displayName: existingCity || null,
    loading: false,
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // 如果已有城市名，直接使用，无需请求
    if (existingCity) {
      setResult({ city: existingCity, country: null, displayName: existingCity, loading: false });
      return;
    }

    if (lat === undefined || lng === undefined) {
      setResult({ city: null, country: null, displayName: null, loading: false });
      return;
    }

    // 生成缓存 key（保留2位小数）
    const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;

    // 检查缓存
    const cached = cityCache.get(cacheKey);
    if (cached !== undefined) {
      setResult({
        city: cached?.city || null,
        country: cached?.country || null,
        displayName: cached?.displayName || null,
        loading: false,
      });
      return;
    }

    // 开始加载
    setResult(prev => ({ ...prev, loading: true }));

    getCityInfo(lat, lng).then((info) => {
      // 更新缓存
      cityCache.set(cacheKey, info);

      // 更新状态（检查组件是否仍然挂载）
      if (mountedRef.current) {
        setResult({
          city: info?.city || null,
          country: info?.country || null,
          displayName: info?.displayName || null,
          loading: false,
        });
      }
    }).catch(() => {
      if (mountedRef.current) {
        setResult({ city: null, country: null, displayName: null, loading: false });
      }
    });
  }, [lat, lng, existingCity]);

  return result;
}

/**
 * 批量获取城市名称的 Hook
 * @param coordinates 坐标数组
 * @returns 城市信息 Map
 */
export function useCityNameBatch(
  coordinates: Array<{ lat: number; lng: number }>
): Map<string, UseCityNameResult> {
  const [results, setResults] = useState<Map<string, UseCityNameResult>>(new Map());
  const coordKey = useMemo(
    () => coordinates.map(c => `${c.lat.toFixed(3)},${c.lng.toFixed(3)}`).join('|'),
    [coordinates]
  );
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (coordinates.length === 0) {
      setResults(new Map());
      return;
    }

    const loadCities = async () => {
      const newResults = new Map<string, UseCityNameResult>();

      for (const { lat, lng } of coordinates) {
        const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;

        // 检查缓存
        const cached = cityCache.get(cacheKey);
        if (cached !== undefined) {
          newResults.set(cacheKey, {
            city: cached?.city || null,
            country: cached?.country || null,
            displayName: cached?.displayName || null,
            loading: false,
          });
          continue;
        }

        // 标记为加载中
        newResults.set(cacheKey, {
          city: null,
          country: null,
          displayName: null,
          loading: true,
        });

        // 异步获取
        getCityInfo(lat, lng).then((info) => {
          cityCache.set(cacheKey, info);

          if (mountedRef.current) {
            setResults(prev => {
              const updated = new Map(prev);
              updated.set(cacheKey, {
                city: info?.city || null,
                country: info?.country || null,
                displayName: info?.displayName || null,
                loading: false,
              });
              return updated;
            });
          }
        }).catch(() => {
          if (mountedRef.current) {
            setResults(prev => {
              const updated = new Map(prev);
              updated.set(cacheKey, { city: null, country: null, displayName: null, loading: false });
              return updated;
            });
          }
        });
      }

      if (mountedRef.current) {
        setResults(newResults);
      }
    };

    loadCities().catch(err => log.error(err, { message: 'loadCities' }));
  }, [coordKey]);

  return results;
}

/**
 * 清除城市缓存
 */
export function clearCityCache(): void {
  cityCache.clear();
}
