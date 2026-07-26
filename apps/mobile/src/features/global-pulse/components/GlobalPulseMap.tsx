import {GlobalCheckin, LeaderboardEntry, ActiveSession , aggregateMarkers , FONT_SUB, FONT_TITLE, FONT_BACK, FONT_STAT_CARD, FONT_BODY, FONT_SMALL, FONT_LABEL} from '@egoless-do/core';
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import { MapView, Marker, type CameraPosition, type LatLngBounds } from 'react-native-amap3d';
import type { NativeSyntheticEvent } from 'react-native';

import { useTheme, useT } from '../../../components/UI';
import { useActiveSessions } from '../hooks/useActiveSessions';
import { useGlobalPulse } from '../hooks/useGlobalPulse';
import { formatDisplayName } from '../services/globalPulseApi';
import { getUserHash } from '../services/userHash';

import { ActiveMarker } from './ActiveMarker';
import { BottomPanel } from './BottomPanel';
import { Leaderboard } from './Leaderboard';
import { MarkerDetail } from './MarkerDetail';
import { OfflineBanner } from './OfflineBanner';
import { PulseMarker } from './PulseMarker';


const DEFAULT_REGION = {
  latitude: 35,
  longitude: 110,
};

interface GlobalPulseMapProps {
  onClose?: () => void;
  type?: 'exercise' | 'fasting' | 'meditation';
  title?: string;
  showInlineLeaderboard?: boolean;
}

type MapViewHandle = React.ElementRef<typeof MapView>;

export const GlobalPulseMap: React.FC<GlobalPulseMapProps> = ({
  onClose,
  type,
  title,
  showInlineLeaderboard = false
}) => {
  const theme = useTheme();
  const t = useT();
  const mapRef = useRef<MapViewHandle>(null);

  const {
    checkins,
    stats,
    isLoading,
    isRefreshing,
    isOffline,
    error,
    refresh
  } = useGlobalPulse({ type, autoRefresh: true });

  const {
    sessions: activeSessions,
    onlineCount,
  } = useActiveSessions(type);

  const [selectedCheckin, setSelectedCheckin] = useState<GlobalCheckin | null>(null);
  const [selectedActiveSession, setSelectedActiveSession] = useState<ActiveSession | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(2);
  const [myHash, setMyHash] = useState<string>('');
  useEffect(() => {
    let alive = true;
    getUserHash().then(h => { if (alive) setMyHash(h); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const myCheckin = useMemo(() => {
    if (!myHash) return null;
    return checkins.find(c => c.user_hash === myHash) ?? null;
  }, [checkins, myHash]);

  const handleRegionChange = useCallback((zoom: number) => {
    setCurrentZoom(Math.max(1, Math.min(20, zoom)));
  }, []);

  const handleMarkerPress = useCallback((checkin: GlobalCheckin) => {
    setSelectedCheckin(checkin);
  }, []);

  const handleActiveMarkerPress = useCallback((session: ActiveSession) => {
    setSelectedActiveSession(session);
    // 查找匹配的历史打卡记录
    const matchingCheckin = checkins.find(c => c.user_hash === session.user_hash);
    if (matchingCheckin) {
      setSelectedCheckin(matchingCheckin);
    }
  }, [checkins]);

  const handleCloseDetail = useCallback(() => {
    setSelectedCheckin(null);
    setSelectedActiveSession(null);
  }, []);

  const handleUserPress = useCallback((entry: LeaderboardEntry) => {
    setSelectedUserId(entry.user_hash);
    mapRef.current?.moveCamera({
      target: { latitude: entry.lat, longitude: entry.lng },
      zoom: 6,
    }, 500);
  }, []);

  // 过滤掉自己的打卡，避免与专属标记重复
  const otherCheckins = useMemo(
    () => myHash ? checkins.filter(c => c.user_hash !== myHash) : checkins,
    [checkins, myHash],
  );

  const clusters = useMemo(
    () => aggregateMarkers(otherCheckins, currentZoom),
    [otherCheckins, currentZoom]
  );

  // 按 streak 排序计算排名
  const rankMap = useMemo(() => {
    const sorted = [...checkins].sort((a, b) => b.streak - a.streak);
    const map = new Map<string, number>();
    sorted.forEach((c, i) => {
      if (!map.has(c.user_hash)) {
        map.set(c.user_hash, i + 1);
      }
    });
    return map;
  }, [checkins]);

  const markers = useMemo(() => {
    return clusters.map((cluster) => {
      if (cluster.count === 1) {
        const checkin = cluster.checkins[0];
        const isSelected = selectedUserId === checkin.user_hash;
        const markerTitle = formatDisplayName(checkin.nickname, checkin.user_hash);
        const rank = rankMap.get(checkin.user_hash);

        return (
          <Marker
            key={checkin.checkin_id}
            position={{
              latitude: checkin.lat,
              longitude: checkin.lng
            }}
            onPress={() => handleMarkerPress(checkin)}
            opacity={isSelected ? 1 : 0.9}
          >
            <View style={styles.markerWrapper}>
              <PulseMarker type={checkin.type} rank={rank} />
              <Text style={styles.markerLabel}>{markerTitle}</Text>
            </View>
          </Marker>
        );
      }

      return (
        <Marker
          key={cluster.id}
          position={{
            latitude: cluster.lat,
            longitude: cluster.lng
          }}
          onPress={() => {
            mapRef.current?.moveCamera({
              target: { latitude: cluster.lat, longitude: cluster.lng },
              zoom: 5,
            }, 300);
          }}
        >
          <View style={styles.clusterContainer}>
            <Text style={styles.clusterText}>{cluster.count}</Text>
          </View>
        </Marker>
      );
    });
  }, [clusters, selectedUserId, handleMarkerPress]);

  if (showLeaderboard && !showInlineLeaderboard) {
    return (
      <Leaderboard
        checkins={checkins}
        type={type}
        onBack={() => setShowLeaderboard(false)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.headerBar, { backgroundColor: theme.bg }]}>
        <TouchableOpacity onPress={onClose} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: theme.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {title || t('globalPulse')}
        </Text>
        <TouchableOpacity
          onPress={refresh}
          style={styles.headerButton}
          disabled={isRefreshing}
        >
          <Text style={[styles.headerButtonText, { color: theme.primary }]}>
            {isRefreshing ? '◌' : '↻'}
          </Text>
        </TouchableOpacity>
      </View>

      {isOffline && <OfflineBanner />}

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            {t('loading')}
          </Text>
        </View>
      ) : error && checkins.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: theme.text }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={() => refresh()}
          >
            <Text style={styles.retryButtonText}>重新加载</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <MapView
            ref={mapRef}
            style={showInlineLeaderboard ? styles.inlineMap : styles.map}
            initialCameraPosition={{ target: DEFAULT_REGION, zoom: 4 }}
            onCameraIdle={(e: NativeSyntheticEvent<{ cameraPosition: CameraPosition; latLngBounds: LatLngBounds }>) => handleRegionChange(Math.round(e.nativeEvent.cameraPosition.zoom ?? 4))}
            myLocationEnabled={false}
            myLocationButtonEnabled={false}
            compassEnabled={true}
            scaleControlsEnabled={true}
          >
            {markers}

            {/* 实时活跃标记 */}
            {activeSessions.map(session => {
              if (!session.lat || !session.lng) return null;
              return (
                <Marker
                  key={`active-${session.session_id}`}
                  position={{
                    latitude: session.lat,
                    longitude: session.lng,
                  }}
                  onPress={() => handleActiveMarkerPress(session)}
                >
                  <ActiveMarker session={session} city={session.city} />
                </Marker>
              );
            })}

            {/* 自己的标记 */}
            {myCheckin && (
              <Marker
                key="my-marker"
                position={{ latitude: myCheckin.lat, longitude: myCheckin.lng }}
                onPress={() => handleMarkerPress(myCheckin)}
              >
                <View style={styles.myMarkerWrapper}>
                  <View style={[styles.myMarkerDot, { backgroundColor: theme.primary }]}>
                    <Text style={styles.myMarkerText}>{t('globalPulse.me')}</Text>
                  </View>
                </View>
              </Marker>
            )}
          </MapView>

          {stats && (
            <View style={styles.statsBar}>
              <Text style={styles.statsItem}>
                👥 {String(stats.total_users)} {t('globalPulse.totalUsers')}
              </Text>
              <Text style={styles.statsDot}>·</Text>
              <Text style={styles.statsItem}>
                🔥 {String(stats.active_today)} {t('globalPulse.activeToday')}
              </Text>
            </View>
          )}

          <View style={styles.attribution}>
            <Text style={styles.attributionText}>
              © Amap
            </Text>
          </View>

          {!showInlineLeaderboard && (
            <View style={styles.toolbar}>
              <TouchableOpacity
                style={[styles.toolbarButton, { backgroundColor: theme.card }]}
                onPress={onClose}
              >
                <Text style={[styles.toolbarButtonText, { color: theme.text }]}>✕</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toolbarButton, { backgroundColor: theme.card }]}
                onPress={() => setShowLeaderboard(true)}
              >
                <Text style={[styles.toolbarButtonText, { color: theme.text }]}>🏆</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toolbarButton, { backgroundColor: theme.card }]}
                onPress={refresh}
                disabled={isRefreshing}
              >
                <Text style={[styles.toolbarButtonText, { color: theme.text }]}>
                  {isRefreshing ? '⏳' : '🔄'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {showInlineLeaderboard && (
            <BottomPanel
              sessions={activeSessions}
              onlineCount={onlineCount}
              checkins={checkins}
              type={type}
              onUserPress={handleActiveMarkerPress}
              onLeaderboardUserPress={handleUserPress}
              selectedUserId={selectedUserId}
              onRefresh={refresh}
              isRefreshing={isRefreshing}
              myHash={myHash}
            />
          )}
        </>
      )}

      {(selectedCheckin || selectedActiveSession) && (
        <MarkerDetail
          checkin={selectedCheckin || undefined}
          activeSession={selectedActiveSession || undefined}
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
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonText: {
    fontSize: FONT_STAT_CARD(),
  },
  headerTitle: {
    fontSize: FONT_TITLE(),
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    flex: 1,
  },
  inlineMap: {
    height: 300,
  },
  inlineLeaderboard: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  leaderboardTitle: {
    fontSize: FONT_LABEL(),
    fontWeight: '600',
  },
  refreshSmall: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  refreshSmallText: {
    fontSize: FONT_LABEL(),
  },
  statsBar: {
    position: 'absolute',
    bottom: 32,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  statsItem: {
    fontSize: FONT_SMALL(),
    color: '#fff',
    fontWeight: '500',
  },
  statsDot: {
    fontSize: FONT_SMALL(),
    color: '#fff',
    opacity: 0.5,
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
    fontSize: FONT_SMALL(),
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
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  toolbarButtonText: {
    fontSize: FONT_BACK(),
  },
  clusterContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  clusterText: {
    color: '#fff',
    fontSize: FONT_BODY(),
    fontWeight: 'bold',
  },
  loadingText: {
    marginTop: 16,
    fontSize: FONT_LABEL(),
    fontWeight: '500',
  },
  errorText: {
    fontSize: FONT_LABEL(),
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
    lineHeight: 24,
  },
  retryButton: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: FONT_LABEL(),
    fontWeight: '600',
  },
  markerWrapper: {
    alignItems: 'center',
  },
  markerLabel: {
    fontSize: FONT_SMALL(),
    fontWeight: '600',
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 2,
  },
  myMarkerWrapper: {
    alignItems: 'center',
  },
  myMarkerDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 8,
  },
  myMarkerText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: FONT_SUB(),
  },
});

export default GlobalPulseMap;
