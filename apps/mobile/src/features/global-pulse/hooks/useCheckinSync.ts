/**
 * 打卡同步 Hook
 * 在打卡时收集位置并提交到全球脉动
 */

import { createLogger , CheckinType , fuzzCoordinate } from '@egoless-do/core';
import * as Location from 'expo-location';
import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';

import {useAppStore, type MobileStore} from '../../../store/useAppStore';
import { submitCheckin } from '../services/globalPulseApi';
import { getUserHash, getFuzzSecret } from '../services/userHash';

import { useNetworkStatus } from './useNetworkStatus';
import { usePrivacy } from './usePrivacy';


const log = createLogger('GlobalPulse');

interface UseCheckinSyncReturn {
  syncCheckin: (type: CheckinType, streak: number, totalDays: number) => Promise<boolean>;
}

export function useCheckinSync(): UseCheckinSyncReturn {
  const { preferences } = usePrivacy();
  const { isOnline } = useNetworkStatus();
  const nickname = useAppStore(useShallow((s: MobileStore) => s.auth.user?.name || ''));

  const syncCheckin = useCallback(async (
    type: CheckinType,
    streak: number,
    totalDays: number
  ): Promise<boolean> => {
    if (!preferences.show_on_global_map) return false;
    if (!isOnline) return false;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return false;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });

      const userHash = await getUserHash();
      const fuzzSecret = await getFuzzSecret();
      const [fuzzedLat, fuzzedLng] = fuzzCoordinate(
        location.coords.latitude,
        location.coords.longitude,
        fuzzSecret
      );

      const response = await submitCheckin({
        type,
        user_hash: userHash,
        nickname: nickname || undefined,
        lat: fuzzedLat,
        lng: fuzzedLng,
        streak,
        total_days: totalDays
      });

      return response.success;
    } catch (error) {
      log.error(error, { message: 'Failed to sync checkin to global pulse' });
      return false;
    }
  }, [preferences.show_on_global_map, isOnline, nickname]);

  return { syncCheckin };
}

export default useCheckinSync;
