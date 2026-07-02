/**
 * 会话心跳 Hook
 * 管理 15s 心跳定时器 + AppState 前后台监听
 * 禁食类型不启动心跳
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { CheckinType } from '@egoless-do/core';
import { updateSession } from '../services/activeSessionApi';

const HEARTBEAT_INTERVAL = 15000; // 15s

export function useSessionHeartbeat(
  recordId: string | null,
  type: CheckinType | null
) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isActiveRef = useRef(false);

  const sendHeartbeat = useCallback(async () => {
    if (!recordId) return;
    await updateSession(recordId, {
      last_heartbeat: new Date().toISOString(),
    });
  }, [recordId]);

  const startHeartbeat = useCallback(() => {
    if (isActiveRef.current) return;
    isActiveRef.current = true;
    sendHeartbeat();
    timerRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
  }, [sendHeartbeat]);

  const stopHeartbeat = useCallback(() => {
    isActiveRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    // 禁食不使用心跳
    if (!recordId || type === 'fasting') {
      stopHeartbeat();
      return;
    }

    startHeartbeat();

    // 监听 AppState 变化
    const handleAppStateChange = (nextState: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      if (prev === 'active' && nextState !== 'active') {
        // 前台 → 后台: 暂停心跳
        stopHeartbeat();
      } else if (prev !== 'active' && nextState === 'active') {
        // 后台 → 前台: 恢复心跳
        startHeartbeat();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      stopHeartbeat();
      subscription.remove();
    };
  }, [recordId, type, startHeartbeat, stopHeartbeat]);
}
