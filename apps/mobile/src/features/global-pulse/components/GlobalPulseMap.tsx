import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import { formatDisplayName } from '../services/globalPulseApi';
import MapView, { UrlTile, Marker, Callout } from 'react-native-maps';
import { useTheme, useT } from '../../../components/UI';
import { GlobalCheckin, LeaderboardEntry } from '../types/globalPulse';
import { useGlobalPulse } from '../hooks/useGlobalPulse';
import { aggregateMarkers } from '../services/markerAggregation';
import { PulseMarker } from './PulseMarker';
import { MarkerDetail } from './MarkerDetail';
import { OfflineBanner } from './OfflineBanner';
import { Leaderboard } from './Leaderboard';

const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const DEFAULT_REGION = {
  latitude: 35,
  longitude: 110,
  latitudeDelta: 30,
  longitudeDelta: 30,
};

interface GlobalPulseMapProps {
  onClose?: () => void;
  type?: 'exercise' | 'fasting' | 'meditation';
  title?: string;
  showInlineLeaderboard?: boolean;
}

export const GlobalPulseMap: React.FC<GlobalPulseMapProps> = ({
  onClose,
  type,
  title,
  showInlineLeaderboard = false
}) => {
  const theme = useTheme();
  const t = useT();
  const mapRef = useRef<MapView>(null);

  const {
    checkins,
    stats,
    isLoading,
    isRefreshing,
    isOffline,
    error,
    refresh
  } = useGlobalPulse({ type, autoRefresh: true });

  const [selectedCheckin, setSelectedCheckin] = useState<GlobalCheckin | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(2);

  const handleRegionChange = useCallback((region: any) => {
    const zoom = Math.round(Math.log2(360 / region.latitudeDelta));
    setCurrentZoom(Math.max(1, Math.min(20, zoom)));
  }, []);

  const handleMarkerPress = useCallback((checkin: GlobalCheckin) => {
    setSelectedCheckin(checkin);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedCheckin(null);
  }, []);

  const handleUserPress = useCallback((entry: LeaderboardEntry) => {
    setSelectedUserId(entry.user_hash);
    mapRef.current?.animateToRegion({
      latitude: entry.lat,
      longitude: entry.lng,
      latitudeDelta: 5,
      longitudeDelta: 5,
    }, 500);
  }, []);

  const clusters = useMemo(
    () => aggregateMarkers(checkins, currentZoom),
    [checkins, currentZoom]
  );

  const markers = useMemo(() => {
    return clusters.map((cluster) => {
      if (cluster.count === 1) {
        const checkin = cluster.checkins[0];
        const isSelected = selectedUserId === checkin.user_hash;
        const markerTitle = formatDisplayName(checkin.nickname, checkin.user_hash);

        return (
          <Marker
            key={checkin.checkin_id}
            coordinate={{
              latitude: checkin.lat,
              longitude: checkin.lng
            }}
            onPress={() => handleMarkerPress(checkin)}
            opacity={isSelected ? 1 : 0.9}
          >
            <PulseMarker type={checkin.type} />
            <Callout tooltip>
              <View style={[styles.calloutContainer, { backgroundColor: theme.card }]}>
                <Text style={[styles.calloutTitle, { color: theme.text }]}>
                  {markerTitle}
                </Text>
                <Text style={[styles.calloutDesc, { color: theme.sub }]}>
                  🔥{checkin.streak}天  📅{checkin.total_days}天
                </Text>
              </View>
            </Callout>
          </Marker>
        );
      }

      return (
        <Marker
          key={cluster.id}
          coordinate={{
            latitude: cluster.lat,
            longitude: cluster.lng
          }}
          onPress={() => {
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
            initialRegion={DEFAULT_REGION}
            onRegionChangeComplete={handleRegionChange}
            mapType="none"
            showsUserLocation={false}
            showsMyLocationButton={false}
            showsCompass={true}
            showsScale={true}
          >
            <UrlTile
              urlTemplate={OSM_TILE_URL}
              maximumZ={19}
              tileSize={256}
            />
            {markers}
          </MapView>

          {stats && (
            <View style={styles.statsBar}>
              <Text style={styles.statsItem}>
                👥 {stats.total_users} {t('globalPulse.totalUsers')}
              </Text>
              <Text style={styles.statsDot}>·</Text>
              <Text style={styles.statsItem}>
                🔥 {stats.active_today} {t('globalPulse.activeToday')}
              </Text>
            </View>
          )}

          <View style={styles.attribution}>
            <Text style={styles.attributionText}>
              © OpenStreetMap contributors
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
            <View style={[styles.inlineLeaderboard, { backgroundColor: theme.bg }]}>
              <View style={styles.leaderboardHeader}>
                <Text style={[styles.leaderboardTitle, { color: theme.text }]}>
                  🏆 {t('globalPulse.leaderboard')}
                </Text>
                <TouchableOpacity
                  style={[styles.refreshSmall, { backgroundColor: `${theme.primary}15` }]}
                  onPress={refresh}
                  disabled={isRefreshing}
                >
                  <Text style={[styles.refreshSmallText, { color: theme.primary }]}>
                    {isRefreshing ? '◌' : '↻'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Leaderboard
                checkins={checkins}
                type={type}
                compact={true}
                onUserPress={handleUserPress}
                selectedUserId={selectedUserId}
              />
            </View>
          )}
        </>
      )}

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
    fontSize: 22,
  },
  headerTitle: {
    fontSize: 18,
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
    fontSize: 16,
    fontWeight: '600',
  },
  refreshSmall: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  refreshSmallText: {
    fontSize: 16,
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
    fontSize: 11,
    color: '#fff',
    fontWeight: '500',
  },
  statsDot: {
    fontSize: 11,
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
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  toolbarButtonText: {
    fontSize: 20,
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
    fontSize: 15,
    fontWeight: 'bold',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: '600',
  },
  calloutContainer: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  calloutDesc: {
    fontSize: 12,
  },
});

export default GlobalPulseMap;
