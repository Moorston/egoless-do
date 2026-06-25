/**
 * 全球脉动数据管理 Hook
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { GlobalCheckin, GlobalStats, SyncStatus, NetworkStatus } from '../types/globalPulse';
import { getCheckins, getGlobalStats } from '../services/globalPulseApi';
import {
  getCachedCheckins,
  cacheCheckins,
  getCachedStats,
  cacheStats,
  getSyncStatus,
  updateSyncStatus
} from '../services/offlineCache';

// 刷新间隔（5 分钟）
const REFRESH_INTERVAL = 5 * 60 * 1000;

interface UseGlobalPulseOptions {
  type?: 'exercise' | 'fasting' | 'meditation';
  autoRefresh?: boolean;
}

interface UseGlobalPulseReturn {
  checkins: GlobalCheckin[];
  stats: GlobalStats | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isOffline: boolean;
  lastSync: Date | null;
  error: string | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export function useGlobalPulse(options: UseGlobalPulseOptions = {}): UseGlobalPulseReturn {
  const { type, autoRefresh = true } = options;

  const [checkins, setCheckins] = useState<GlobalCheckin[]>([]);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const offsetRef = useRef(0);

  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 加载打卡数据
  const loadCheckins = useCallback(async (showLoading: boolean = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);

    try {
      const response = await getCheckins({
        type,
        limit: 1000,
        offset: 0
      });

      if (response.success && response.data) {
        setCheckins(response.data.checkins);
        setIsOffline(false);
        offsetRef.current = response.data.checkins.length;

        // 缓存数据
        await cacheCheckins(response.data.checkins);

        // 更新同步状态
        await updateSyncStatus(Date.now(), 0);
        setLastSync(new Date());
      } else {
        throw new Error(response.error?.message || '加载失败');
      }
    } catch (err) {
      // 离线模式，从缓存加载
      const cached = await getCachedCheckins();
      if (cached.length > 0) {
        setCheckins(cached);
        setIsOffline(true);
        setError(null);
      } else {
        setError('无法加载数据，请检查网络连接');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [type]);

  // 加载统计数据
  const loadStats = useCallback(async () => {
    try {
      const response = await getGlobalStats();

      if (response.success && response.data) {
        setStats(response.data);
        await cacheStats(response.data);
      }
    } catch (err) {
      // 从缓存加载
      const cached = await getCachedStats();
      if (cached) {
        setStats(cached);
      }
    }
  }, []);

  // 刷新数据
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([loadCheckins(false), loadStats()]);
  }, [loadCheckins, loadStats]);

  // 加载更多
  const loadMore = useCallback(async () => {
    try {
      const response = await getCheckins({
        type,
        limit: 1000,
        offset: offsetRef.current
      });

      if (response.success && response.data && response.data.checkins.length > 0) {
        const newCheckins = response.data.checkins;
        setCheckins(prev => {
          const updated = [...prev, ...newCheckins];
          offsetRef.current = updated.length;
          cacheCheckins(updated);
          return updated;
        });
      }
    } catch (err) {
      // 忽略加载更多错误
    }
  }, [type]);

  // 初始加载
  useEffect(() => {
    loadCheckins();
    loadStats();
  }, [loadCheckins, loadStats]);

  // 恢复连接时自动同步
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && isOffline) {
        // 恢复连接，自动刷新数据
        refresh();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOffline, refresh]);

  // 自动刷新
  useEffect(() => {
    if (autoRefresh) {
      refreshTimerRef.current = setInterval(() => {
        refresh();
      }, REFRESH_INTERVAL);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [autoRefresh, refresh]);

  // 恢复同步状态
  useEffect(() => {
    const restoreSyncStatus = async () => {
      const status = await getSyncStatus();
      if (status.lastSync > 0) {
        setLastSync(new Date(status.lastSync));
      }
    };

    restoreSyncStatus();
  }, []);

  return {
    checkins,
    stats,
    isLoading,
    isRefreshing,
    isOffline,
    lastSync,
    error,
    refresh,
    loadMore
  };
}

export default useGlobalPulse;
