/**
 * 打卡同步 Hook
 * 在打卡时收集位置并提交到全球脉动
 */

import { useCallback } from 'react';
import * as Location from 'expo-location';
import { CheckinType } from '../types/globalPulse';
import { fuzzCoordinate } from '../services/coordinateFuzzing';
import { submitCheckin } from '../services/globalPulseApi';
import { usePrivacy } from './usePrivacy';
import { useNetworkStatus } from './useNetworkStatus';

interface UseCheckinSyncReturn {
  syncCheckin: (type: CheckinType, streak: number, totalDays: number) => Promise<boolean>;
}

export function useCheckinSync(): UseCheckinSyncReturn {
  const { preferences } = usePrivacy();
  const { isOnline } = useNetworkStatus();

  const syncCheckin = useCallback(async (
    type: CheckinType,
    streak: number,
    totalDays: number
  ): Promise<boolean> => {
    // 检查是否启用全球地图
    if (!preferences.show_on_global_map) {
      return false;
    }

    // 检查网络状态
    if (!isOnline) {
      console.log('Offline, skipping global pulse sync');
      return false;
    }

    try {
      // 请求位置权限
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return false;
      }

      // 获取当前位置
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });

      // 坐标模糊处理
      const userHash = await generateUserHash();
      const [fuzzedLat, fuzzedLng] = fuzzCoordinate(
        location.coords.latitude,
        location.coords.longitude,
        userHash
      );

      // 提交到全球脉动
      const response = await submitCheckin({
        type,
        lat: fuzzedLat,
        lng: fuzzedLng,
        streak,
        total_days: totalDays
      });

      return response.success;
    } catch (error) {
      console.error('Failed to sync checkin to global pulse:', error);
      return false;
    }
  }, [preferences.show_on_global_map, isOnline]);

  return {
    syncCheckin
  };
}

/**
 * 生成用户哈希（匿名标识）
 */
async function generateUserHash(): Promise<string> {
  // 使用设备 ID 和时间戳生成唯一哈希
  // 实际实现中应该使用更安全的方法
  const deviceId = 'device_' + Date.now().toString(36);

  // 简单的哈希函数
  let hash = 0;
  for (let i = 0; i < deviceId.length; i++) {
    const char = deviceId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为 32 位整数
  }

  return Math.abs(hash).toString(16).padStart(8, '0');
}

export default useCheckinSync;
