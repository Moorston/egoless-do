import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, UrlTile, Callout } from 'react-native-maps';
import { useRootNavigation } from '../../navigation/hooks';
import { useTheme, useT } from '../../components/UI';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE } from '@egoless-do/core';
import { Globe, ChevronLeft, Trophy, RefreshCw } from 'lucide-react-native';

// API 配置
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8090';

// OpenStreetMap 瓦片服务器
const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

// 默认区域（亚洲）
const DEFAULT_REGION = {
  latitude: 35,
  longitude: 110,
  latitudeDelta: 30,
  longitudeDelta: 30,
};

interface GlobalUser {
  id: string;
  name: string;
  lat: number;
  lng: number;
  days: number;
  sport: string;
  streak: number;
  type: string;
  since: string;
}

// 生成匿名名称
function generateAnonymousId(userHash: string): string {
  const hashNum = parseInt(userHash.substring(0, 8), 16);
  const id = hashNum % 10000;
  return `修行者 #${id.toString().padStart(4, '0')}`;
}

// 获取运动类型显示
function getSportLabel(type: string): string {
  switch (type) {
    case 'exercise': return '运动';
    case 'fasting': return '禁食';
    case 'meditation': return '冥想';
    default: return '修行';
  }
}

// 获取类型颜色
function getTypeColor(type: string): string {
  switch (type) {
    case 'exercise': return '#3B82F6';
    case 'fasting': return '#F59E0B';
    case 'meditation': return '#8B5CF6';
    default: return '#6B7280';
  }
}

// 从 PocketBase 获取全球打卡数据
async function fetchGlobalCheckins(type?: string): Promise<GlobalUser[]> {
  // 构建过滤条件
  let filter = 'opted_out != true';
  if (type) {
    filter += ` && type = "${type}"`;
  }

  const url = `${API_BASE_URL}/api/collections/global_checkins/records?perPage=200&sort=-created_at&filter=${encodeURIComponent(filter)}`;
  console.log('Fetching:', url);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn('Fetch failed:', response.status);
      return [];
    }

    const data = await response.json();
    const items = data.items || [];
    console.log('Fetched:', items.length, 'items');

    // 按 user_hash 去重
    const seen = new Set<string>();
    const uniqueUsers: GlobalUser[] = [];

    for (const item of items) {
      if (!seen.has(item.user_hash)) {
        seen.add(item.user_hash);
        uniqueUsers.push({
          id: item.id,
          name: generateAnonymousId(item.user_hash),
          lat: item.lat,
          lng: item.lng,
          days: item.total_days,
          sport: getSportLabel(item.type),
          streak: item.streak,
          type: item.type,
          since: new Date(item.created_at).toISOString().slice(0, 7),
        });
      }
    }

    return uniqueUsers;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

export default function GlobalMapPage({ route }: { route?: { params?: { icon?: string; title?: string; type?: 'exercise' | 'fasting' | 'meditation' } } }) {
  const nav = useRootNavigation();
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const filterType = route?.params?.type;
  const pageTitle = route?.params?.title ?? T('globalPulse');

  const mapRef = useRef<MapView>(null);
  const [users, setUsers] = useState<GlobalUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // 加载数据
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchGlobalCheckins(filterType);
      setUsers(data);
      if (data.length === 0) {
        setError('暂无全球打卡数据');
      }
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setIsLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 点击排行榜用户，地图定位到该用户
  const handleUserPress = useCallback((user: GlobalUser) => {
    setSelectedUserId(user.id);
    mapRef.current?.animateToRegion({
      latitude: user.lat,
      longitude: user.lng,
      latitudeDelta: 5,
      longitudeDelta: 5,
    }, 500);
  }, []);

  // 渲染标记
  const renderMarkers = () => {
    return users.map((user) => {
      const color = getTypeColor(user.type);
      const isSelected = selectedUserId === user.id;
      return (
        <Marker
          key={user.id}
          coordinate={{
            latitude: user.lat,
            longitude: user.lng,
          }}
          onPress={() => setSelectedUserId(user.id)}
          opacity={isSelected ? 1 : 0.8}
        >
          <View style={[
            styles.markerContainer,
            { backgroundColor: color },
            isSelected && styles.markerSelected
          ]}>
            <Text style={styles.markerText}>{user.streak}</Text>
          </View>
          <Callout tooltip>
            <View style={[styles.callout, { backgroundColor: TH.card }]}>
              <Text style={[styles.calloutName, { color: TH.text }]}>{user.name}</Text>
              <Text style={[styles.calloutInfo, { color: TH.sub }]}>
                {user.sport} · 连续 {user.streak} 天
              </Text>
              <Text style={[styles.calloutInfo, { color: TH.sub }]}>
                累计 {user.days} 天 · {user.since}
              </Text>
            </View>
          </Callout>
        </Marker>
      );
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.backButton}>
            <ChevronLeft size={20} color="#fff" />
          </TouchableOpacity>
          <Globe size={20} color={P} />
          <Text style={styles.headerTitle}>{pageTitle}</Text>
        </View>
        <TouchableOpacity
          onPress={loadData}
          style={[styles.refreshButton, { backgroundColor: `${P}30` }]}
        >
          <RefreshCw size={16} color={P} />
          <Text style={[styles.refreshText, { color: P }]}>{users.length}</Text>
        </TouchableOpacity>
      </View>

      {/* Map */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={P} />
          <Text style={[styles.loadingText, { color: '#fff' }]}>{T('loading')}</Text>
        </View>
      ) : (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={DEFAULT_REGION}
            mapType="none"
            showsUserLocation={false}
            showsMyLocationButton={false}
            showsCompass={true}
            showsScale={true}
            zoomEnabled={true}
            scrollEnabled={true}
            pitchEnabled={true}
            rotateEnabled={true}
          >
            {/* OpenStreetMap 瓦片 */}
            <UrlTile
              urlTemplate={OSM_TILE_URL}
              maximumZ={19}
              tileSize={256}
            />

            {/* 标记 */}
            {renderMarkers()}
          </MapView>

          {/* 归属信息 */}
          <View style={styles.attribution}>
            <Text style={styles.attributionText}>© OpenStreetMap contributors</Text>
          </View>
        </View>
      )}

      {/* 错误提示 */}
      {error && !isLoading && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadData} style={[styles.retryButton, { backgroundColor: P }]}>
            <Text style={styles.retryText}>重新加载</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 排行榜 */}
      <View style={[styles.leaderboardSection, { backgroundColor: TH.bg }]}>
        <View style={styles.leaderboardHeader}>
          <Trophy size={16} color={TH.sub} />
          <Text style={[styles.leaderboardTitle, { color: TH.sub }]}>
            {filterType ? `${getSportLabel(filterType)}排行榜` : '打卡排行榜'}
          </Text>
        </View>
        {users.length === 0 ? (
          <Text style={[styles.emptyText, { color: TH.sub }]}>
            {filterType ? `暂无${getSportLabel(filterType)}数据` : '暂无数据'}
          </Text>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {[...users]
              .sort((a, b) => b.days - a.days)
              .slice(0, 10)
              .map((user, index) => (
                <TouchableOpacity
                  key={user.id}
                  style={[
                    styles.leaderboardItem,
                    { borderBottomColor: TH.border },
                    selectedUserId === user.id && { backgroundColor: `${TH.primary}15` }
                  ]}
                  onPress={() => handleUserPress(user)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.rankBadge,
                    { backgroundColor: index < 3 ? ['#FFD700', '#C0C0C0', '#CD7F32'][index] : `${TH.primary}30` }
                  ]}>
                    <Text style={[styles.rankText, { color: index < 3 ? '#000' : '#fff' }]}>
                      {index + 1}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: TH.text }]}>{user.name}</Text>
                    <Text style={[styles.userSport, { color: TH.sub }]}>
                      {user.sport} · 连续 {user.streak} 天
                    </Text>
                  </View>
                  <View style={styles.daysContainer}>
                    <Text style={[styles.userDays, { color: TH.primary }]}>{user.days}</Text>
                    <Text style={[styles.daysLabel, { color: TH.sub }]}>天</Text>
                  </View>
                </TouchableOpacity>
              ))}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FONT_BODY,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  refreshText: {
    fontSize: FONT_SUB,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: FONT_SUB,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  attribution: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  attributionText: {
    fontSize: 10,
    color: '#666',
  },
  markerContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerSelected: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  markerText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  callout: {
    padding: 12,
    borderRadius: 12,
    minWidth: 150,
  },
  calloutName: {
    fontWeight: '700',
    fontSize: FONT_BODY,
    marginBottom: 4,
  },
  calloutInfo: {
    fontSize: FONT_SUB,
    marginTop: 2,
  },
  errorContainer: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: FONT_BODY,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  leaderboardSection: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  leaderboardTitle: {
    fontSize: FONT_BODY,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: FONT_SUB,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontWeight: '800',
    fontSize: FONT_SUB,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontWeight: '600',
    fontSize: FONT_BODY,
  },
  userSport: {
    fontSize: FONT_SUB,
    marginTop: 2,
  },
  userDays: {
    fontWeight: '800',
    fontSize: FONT_TITLE,
  },
  daysContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  daysLabel: {
    fontSize: FONT_SUB,
  },
});
