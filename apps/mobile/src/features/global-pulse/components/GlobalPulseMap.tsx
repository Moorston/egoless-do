/**
 * 全球脉动地图组件
 * 使用 OpenStreetMap 显示全球修行者分布
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  PanResponder,
  Animated,
} from 'react-native';
import MapView, { UrlTile, Marker, Callout } from 'react-native-maps';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { GlobalCheckin, ClusterMarker as ClusterMarkerType } from '../types/globalPulse';
import { aggregateMarkers } from '../services/markerAggregation';
import { getCheckins, getGlobalStats } from '../services/globalPulseApi';
import { getCachedCheckins, cacheCheckins } from '../services/offlineCache';
import { PulseMarker } from './PulseMarker';
import { MarkerDetail } from './MarkerDetail';
import { OfflineBanner } from './OfflineBanner';
import { Leaderboard } from './Leaderboard';

// OpenStreetMap 瓦片服务器
const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

// 默认地图中心（全球视野）
const DEFAULT_REGION = {
  latitude: 20,
  longitude: 105,
  latitudeDelta: 100,
  longitudeDelta: 100,
};

interface GlobalPulseMapProps {
  onClose?: () => void;
  type?: 'exercise' | 'fasting' | 'meditation';
}

export const GlobalPulseMap: React.FC<GlobalPulseMapProps> = ({
  onClose,
  type
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const mapRef = useRef<MapView>(null);

  const [checkins, setCheckins] = useState<GlobalCheckin[]>([]);
  const [clusters, setClusters] = useState<ClusterMarkerType[]>([]);
  const [selectedCheckin, setSelectedCheckin] = useState<GlobalCheckin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(2);

  // 下拉刷新动画值
  const pullDistance = useRef(new Animated.Value(0)).current;
  const pullThreshold = 80;

  // 下拉刷新手势
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // 只在向下拉且垂直移动大于水平移动时响应
        return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && !isRefreshing;
      },
      onPanResponderGrant: () => {},
      onPanResponderMove: (_, gestureState) => {
        // 限制最大拉动距离
        const distance = Math.max(0, Math.min(gestureState.dy, pullThreshold * 1.5));
        pullDistance.setValue(distance);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy >= pullThreshold && !isRefreshing) {
          // 触发刷新
          handleRefresh();
        }
        // 回弹
        Animated.spring(pullDistance, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  // 加载打卡数据
  const loadCheckins = useCallback(async (showLoading: boolean = true) => {
    if (showLoading) setIsLoading(true);

    try {
      const response = await getCheckins({ type, limit: 1000 });

      if (response.success && response.data) {
        setCheckins(response.data.checkins);
        setIsOffline(false);

        // 缓存数据
        await cacheCheckins(response.data.checkins);
      } else {
        // 尝试从缓存加载
        const cached = await getCachedCheckins();
        if (cached.length > 0) {
          setCheckins(cached);
          setIsOffline(true);
        }
      }
    } catch (error) {
      // 离线模式，从缓存加载
      const cached = await getCachedCheckins();
      if (cached.length > 0) {
        setCheckins(cached);
        setIsOffline(true);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [type]);

  // 初始加载
  useEffect(() => {
    loadCheckins();
  }, [loadCheckins]);

  // 更新聚合标记
  useEffect(() => {
    const newClusters = aggregateMarkers(checkins, currentZoom);
    setClusters(newClusters);
  }, [checkins, currentZoom]);

  // 下拉刷新
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadCheckins(false);
  }, [loadCheckins]);

  // 处理地图区域变化
  const handleRegionChange = useCallback((region: any) => {
    // 根据 latitudeDelta 估算缩放级别
    const zoom = Math.round(Math.log2(360 / region.latitudeDelta));
    setCurrentZoom(Math.max(1, Math.min(20, zoom)));
  }, []);

  // 处理标记点击
  const handleMarkerPress = useCallback((checkin: GlobalCheckin) => {
    setSelectedCheckin(checkin);
  }, []);

  // 关闭详情
  const handleCloseDetail = useCallback(() => {
    setSelectedCheckin(null);
  }, []);

  // 渲染标记
  const renderMarkers = () => {
    return clusters.map((cluster) => {
      if (cluster.count === 1) {
        const checkin = cluster.checkins[0];
        return (
          <Marker
            key={checkin.checkin_id}
            coordinate={{
              latitude: checkin.lat,
              longitude: checkin.lng
            }}
            onPress={() => handleMarkerPress(checkin)}
          >
            <PulseMarker type={checkin.type} />
          </Marker>
        );
      }

      // 聚合标记
      return (
        <Marker
          key={cluster.id}
          coordinate={{
            latitude: cluster.lat,
            longitude: cluster.lng
          }}
          onPress={() => {
            // 放大到该区域
            mapRef.current?.animateToRegion({
              latitude: cluster.lat,
              longitude: cluster.lng,
              latitudeDelta: 10,
              longitudeDelta: 10,
            }, 300);
          }}
        >
          <View style={styles.clusterContainer}>
            <Text style={styles.clusterText}>{cluster.count}</Text>
          </View>
        </Marker>
      );
    });
  };

  // 加载中状态
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>
          {t('loading')}
        </Text>
      </View>
    );
  }

  // 排行榜页面
  if (showLeaderboard) {
    return (
      <Leaderboard
        type={type}
        onBack={() => setShowLeaderboard(false)}
      />
    );
  }

  // 下拉刷新指示器样式
  const pullIndicatorStyle = {
    transform: [{
      translateY: pullDistance.interpolate({
        inputRange: [0, pullThreshold * 1.5],
        outputRange: [-60, 20],
        extrapolate: 'clamp',
      }),
    }],
    opacity: pullDistance.interpolate({
      inputRange: [0, pullThreshold * 0.5, pullThreshold],
      outputRange: [0, 0.5, 1],
      extrapolate: 'clamp',
    }),
  };

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* 离线提示 */}
      {isOffline && <OfflineBanner />}

      {/* 下拉刷新指示器 */}
      <Animated.View style={[styles.pullIndicator, pullIndicatorStyle]}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={[styles.pullText, { color: theme.colors.text }]}>
          {isRefreshing ? t('refreshing') : t('pullToRefresh')}
        </Text>
      </Animated.View>

      {/* 地图 */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={DEFAULT_REGION}
        onRegionChangeComplete={handleRegionChange}
        mapType="none"
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
      >
        {/* OpenStreetMap 瓦片 */}
        <UrlTile
          urlTemplate={OSM_TILE_URL}
          maximumZ={19}
          tileSize={256}
        />

        {/* 打卡标记 */}
        {renderMarkers()}
      </MapView>

      {/* 归属信息 */}
      <View style={styles.attribution}>
        <Text style={styles.attributionText}>
          © OpenStreetMap contributors
        </Text>
      </View>

      {/* 工具栏 */}
      <View style={styles.toolbar}>
        {/* 关闭按钮 */}
        <TouchableOpacity
          style={[styles.toolbarButton, { backgroundColor: theme.colors.card }]}
          onPress={onClose}
        >
          <Text style={[styles.toolbarButtonText, { color: theme.colors.text }]}>
            ✕
          </Text>
        </TouchableOpacity>

        {/* 排行榜按钮 */}
        <TouchableOpacity
          style={[styles.toolbarButton, { backgroundColor: theme.colors.card }]}
          onPress={() => setShowLeaderboard(true)}
        >
          <Text style={[styles.toolbarButtonText, { color: theme.colors.text }]}>
            🏆
          </Text>
        </TouchableOpacity>

        {/* 刷新按钮 */}
        <TouchableOpacity
          style={[styles.toolbarButton, { backgroundColor: theme.colors.card }]}
          onPress={handleRefresh}
          disabled={isRefreshing}
        >
          <Text style={[styles.toolbarButtonText, { color: theme.colors.text }]}>
            {isRefreshing ? '⏳' : '🔄'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 标记详情 */}
      {selectedCheckin && (
        <MarkerDetail
          checkin={selectedCheckin}
          onClose={handleCloseDetail}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    flex: 1,
  },
  attribution: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  attributionText: {
    fontSize: 10,
    color: '#666',
  },
  toolbar: {
    position: 'absolute',
    top: 16,
    right: 16,
    gap: 8,
  },
  toolbarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  toolbarButtonText: {
    fontSize: 20,
  },
  clusterContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  clusterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  pullIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 10,
    gap: 8,
  },
  pullText: {
    fontSize: 14,
  },
});

export default GlobalPulseMap;
