/**
 * 网络状态检测 Hook
 */

import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { NetworkStatus } from '../types/globalPulse';

interface UseNetworkStatusReturn {
  networkStatus: NetworkStatus;
  isOnline: boolean;
  isOffline: boolean;
  connectionType: string;
  checkConnection: () => Promise<boolean>;
}

export function useNetworkStatus(): UseNetworkStatusReturn {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    is_online: true,
    connection_type: 'unknown'
  });

  // 监听网络状态变化
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setNetworkStatus({
        is_online: state.isConnected ?? false,
        connection_type: state.type
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // 手动检查连接
  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      const state = await NetInfo.fetch();
      const isOnline = state.isConnected ?? false;

      setNetworkStatus({
        is_online: isOnline,
        connection_type: state.type
      });

      return isOnline;
    } catch (error) {
      console.error('Failed to check connection:', error);
      return false;
    }
  }, []);

  return {
    networkStatus,
    isOnline: networkStatus.is_online,
    isOffline: !networkStatus.is_online,
    connectionType: networkStatus.connection_type,
    checkConnection
  };
}

export default useNetworkStatus;
