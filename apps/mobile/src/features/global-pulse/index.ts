/**
 * 全球脉动地图功能入口
 */

// 类型导出
export * from './types/globalPulse';

// 组件导出
export { GlobalPulseMap } from './components/GlobalPulseMap';
export { PulseMarker } from './components/PulseMarker';
export { MarkerDetail } from './components/MarkerDetail';
export { Leaderboard } from './components/Leaderboard';
export { PrivacyControl } from './components/PrivacyControl';
export { PrivacyIntroModal } from './components/PrivacyIntroModal';
export { OfflineBanner } from './components/OfflineBanner';
export { ClusterMarker } from './components/ClusterMarker';
export { LoadingOverlay } from './components/LoadingOverlay';
export { ErrorBoundary } from './components/ErrorBoundary';

// Hook 导出
export { useGlobalPulse } from './hooks/useGlobalPulse';
export { usePrivacy } from './hooks/usePrivacy';
export { useNetworkStatus } from './hooks/useNetworkStatus';
export { useCheckinSync } from './hooks/useCheckinSync';

// 服务导出
export { submitCheckin, getCheckins, getGlobalStats, getLeaderboard, optOut, optIn, deleteGlobalData, generateAnonymousId, getCheckinTypeIcon, getCheckinTypeColor } from './services/globalPulseApi';
export { fuzzCoordinate, isValidCoordinate, calculateDistance } from './services/coordinateFuzzing';
export { aggregateMarkers, shouldCluster, getClusterStyle } from './services/markerAggregation';
export { initDatabase, cacheTile, getCachedTile, cacheCheckins, getCachedCheckins, cacheStats, getCachedStats, clearAllCache, getCacheSize } from './services/offlineCache';
