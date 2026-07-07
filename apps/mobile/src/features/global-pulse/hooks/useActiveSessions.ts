/**
 * 活跃会话列表 Hook
 * 初始加载 + PocketBase SSE 订阅 + 客户端超时过滤
 */

import { ActiveSession, CheckinType } from '@egoless-do/core';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

import { useAppStore, useShallowStore } from '../../../store/useAppStore';
import {
  getActiveSessions,
  subscribeSessions,
  getConnectionState,
  onConnectionStateChange,
  type ConnectionState,
} from '../services/activeSessionApi';

const HEARTBEAT_TIMEOUT_MS = 60000; // 60s 超时

interface OnlineCount {
  exercise: number;
  meditation: number;
  fasting: number;
  total: number;
}

interface UseActiveSessionsResult {
  sessions: ActiveSession[];
  onlineCount: OnlineCount;
  isLoading: boolean;
  connectionState: ConnectionState;
  refresh: () => void;
}

export function useActiveSessions(type?: CheckinType): UseActiveSessionsResult {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionState, setConnectionState] = useState<ConnectionState>(getConnectionState());
  const currentUserHash = useAppStore(s => s.auth.user?.id || '');
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    const result = await getActiveSessions(type);
    if (result.success && result.data && mountedRef.current) {
      setSessions(result.data);
    }
    if (mountedRef.current) {
      setIsLoading(false);
    }
  }, [type]);

  // 初始加载 + SSE 订阅
  useEffect(() => {
    mountedRef.current = true;
    setIsLoading(true);
    refresh();

    const unsubscribe = subscribeSessions({
      onCreate: (session) => {
        if (!mountedRef.current) return;
        if (type && session.type !== type) return;
        setSessions(prev => {
          if (prev.some(s => s.session_id === session.session_id)) return prev;
          return [session, ...prev];
        });
      },
      onUpdate: (session) => {
        if (!mountedRef.current) return;
        setSessions(prev =>
          prev.map(s => (s.session_id === session.session_id ? session : s))
        );
      },
      onDelete: (sessionId) => {
        if (!mountedRef.current) return;
        setSessions(prev => prev.filter(s => s.session_id !== sessionId));
      },
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [type, refresh]);

  // 监听连接状态变化
  useEffect(() => {
    const unsub = onConnectionStateChange(state => {
      if (mountedRef.current) {
        setConnectionState(state);
      }
    });
    return unsub;
  }, []);

  // 客户端超时过滤（每 5s 检查一次）
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setSessions(prev =>
        prev.filter(s => {
          // 禁食不受超时影响
          if (s.type === 'fasting') return true;
          const lastHeartbeat = new Date(s.last_heartbeat).getTime();
          return now - lastHeartbeat < HEARTBEAT_TIMEOUT_MS;
        })
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // 计算在线人数
  const onlineCount: OnlineCount = useMemo(() => {
    const count = { exercise: 0, meditation: 0, fasting: 0, total: 0 };
    for (const s of sessions) {
      count[s.type]++;
      count.total++;
    }
    return count;
  }, [sessions]);

  // 排序：当前用户置顶，然后按 started_at 倒序
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      if (a.user_hash === currentUserHash && b.user_hash !== currentUserHash) return -1;
      if (b.user_hash === currentUserHash && a.user_hash !== currentUserHash) return 1;
      return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
    });
  }, [sessions, currentUserHash]);

  return {
    sessions: sortedSessions,
    onlineCount,
    isLoading,
    connectionState,
    refresh,
  };
}
