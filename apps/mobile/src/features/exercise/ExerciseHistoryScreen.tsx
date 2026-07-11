import { COLORS, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE, FONT_STAT_CARD, FONT_STAT_SECTION, FONT_EMPTY, getSportType, formatPace } from '@egoless-do/core';
import type { ExerciseEntry, Theme } from '@egoless-do/core';
import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, useTheme, ScreenHeader, useT } from '../../components/UI';
import { useRootNavigation } from '../../navigation/hooks';
import { useAppStore, useShallowStore } from '../../store/useAppStore';

import { useAmapComponents } from './hooks/useAmapComponents';


function DetailCard({ e, TH, P, T, MapView, Polyline }: { e: ExerciseEntry; TH: Theme; P: string; T: (k: string) => string; MapView: React.ComponentType<Record<string, unknown>>; Polyline: React.ComponentType<Record<string, unknown>> }) {
  const trackCoords = (e.trackPoints ?? []).map(p => ({ latitude: p.lat, longitude: p.lng }));
  const center = trackCoords.length > 0 ? trackCoords[0] : { latitude: 39.9042, longitude: 116.4074 };
  const bestPace = (e.segmentPaces ?? []).length > 0 ? Math.min(...(e.segmentPaces ?? [])) : 0;
  const sportType = e.isGpsSport ? 'gps' as const : getSportType(e.sportKey, false);

  return (
    <View style={[styles.detailContainer, { borderTopColor: TH.border }]}>
      {trackCoords.length > 1 && MapView && Polyline && (
        <View style={styles.mapContainer}>
          <MapView style={styles.flex1} initialCameraPosition={{ target: center, zoom: 14 }} myLocationEnabled={false} zoomGesturesEnabled={false} scrollGesturesEnabled={false}>
            <Polyline points={trackCoords} color={P} width={4} />
          </MapView>
        </View>
      )}
      <View style={styles.statsGrid}>
        {sportType === 'gps' && e.distanceKm ? (
          <View style={[styles.statCardBase, { backgroundColor: `${P}15` }]}>
            <Text style={[styles.subFont, { color: TH.sub }]}>{T('exerciseDistance')}</Text>
            <Text style={[styles.statValue, { color: TH.text }]}>{e.distanceKm.toFixed(2)} km</Text>
          </View>
        ) : null}
        {sportType === 'repetition' && e.reps != null ? (
          <View style={[styles.statCardBase, { backgroundColor: `${P}15` }]}>
            <Text style={[styles.subFont, { color: TH.sub }]}>{T('exerciseTotalReps')}</Text>
            <Text style={[styles.statValue, { color: TH.text }]}>{e.reps}</Text>
          </View>
        ) : null}
        <View style={[styles.statCardBase, { backgroundColor: `${P}15` }]}>
          <Text style={[styles.subFont, { color: TH.sub }]}>{T('exerciseTime')}</Text>
          <Text style={[styles.statValue, { color: TH.text }]}>{Math.floor(e.durationSec / 60)}:{String(e.durationSec % 60).padStart(2, '0')}</Text>
        </View>
        {sportType === 'gps' && e.avgPace ? (
          <View style={[styles.statCardBase, { backgroundColor: `${P}15` }]}>
            <Text style={[styles.subFont, { color: TH.sub }]}>{T('exerciseAvgPace')}</Text>
            <Text style={[styles.statValue, { color: TH.text }]}>{formatPace(e.avgPace)}</Text>
          </View>
        ) : null}
        {e.calories ? (
          <View style={[styles.statCardBase, { backgroundColor: `${P}15` }]}>
            <Text style={[styles.subFont, { color: TH.sub }]}>{T('exerciseTotalCal')}</Text>
            <Text style={[styles.statValue, { color: TH.text }]}>{e.calories} kcal</Text>
          </View>
        ) : null}
      </View>
      {(e.sets ?? []).length > 0 && (
        <View style={styles.mt4}>
          <Text style={[styles.sectionTitle, { color: TH.text }]}>{T('exerciseSets')}</Text>
          <View style={[styles.setDataCard, { backgroundColor: `${P}10` }]}>
            {(e.sets ?? []).map((s, i) => (
              <View key={i} style={[styles.setRow, { borderBottomWidth: i < (e.sets ?? []).length - 1 ? 1 : 0, borderBottomColor: TH.border }]}>
                <Text style={[styles.subFont, { color: TH.text }]}>{T('exerciseSet').replace('{n}', String(i + 1))}</Text>
                <Text style={[styles.subBold, { color: TH.text }]}>{s.reps} {T('exerciseReps')}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      {(e.segmentPaces ?? []).length > 0 && (
        <View style={styles.mt4}>
          <Text style={[styles.sectionTitle, { color: TH.text }]}>{T('exerciseSegmentPace')}</Text>
          <View style={[styles.setDataCard, { backgroundColor: `${P}10` }]}>
            {(e.segmentPaces ?? []).map((p, i) => {
              const isBest = p === bestPace;
              const c = isBest ? COLORS.GREEN : p < 300 ? COLORS.BLUE : p < 360 ? COLORS.YELLOW : COLORS.RED;
              return (
                <View key={i} style={[styles.setRow, { borderBottomWidth: i < (e.segmentPaces ?? []).length - 1 ? 1 : 0, borderBottomColor: TH.border }]}>
                  <Text style={[styles.subFont, { color: TH.text }]}>{i + 1} km</Text>
                  <Text style={[styles.subBold, { color: c }]}>{formatPace(p)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

// ── Flattened data item ──
interface FlatItem {
  type: 'header' | 'statCards' | 'sportFilter' | 'monthlyBar' | 'emptyText' | 'monthHeader' | 'entry';
  key: string;
  monthKey?: string;
  items?: ExerciseEntry[];
  e?: ExerciseEntry;
  idx?: number;
  isLast?: boolean;
}

export default function ExerciseHistoryScreen() {
  const nav = useRootNavigation();
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const { exerciseLog } = useShallowStore(s => ({ exerciseLog: s.exerciseLog }));
  const { MapView, Polyline } = useAmapComponents();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedSport, setSelectedSport] = useState<string | null>(null);

  const sorted = useMemo(() =>
    [...(exerciseLog ?? [])].filter(e => !e.deleted && e.sportKey).sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)),
    [exerciseLog]
  );

  // Unique sport keys for filter
  const sportKeys = useMemo(() => {
    const map = new Map<string, { icon: string; count: number }>();
    for (const e of sorted) {
      const cur = map.get(e.sportKey);
      if (cur) cur.count++;
      else map.set(e.sportKey, { icon: e.sportIcon, count: 1 });
    }
    return Array.from(map.entries());
  }, [sorted]);

  // Filtered by sport
  const filtered = useMemo(() =>
    selectedSport ? sorted.filter(e => e.sportKey === selectedSport) : sorted,
    [sorted, selectedSport]
  );

  // Monthly stats (from filtered)
  const monthlyStats = useMemo(() => {
    const map = new Map<string, { min: number; count: number }>();
    for (const e of filtered) {
      const d = new Date(e.timestamp ?? 0);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const cur = map.get(key);
      if (cur) { cur.min += Math.round(e.durationSec / 60); cur.count++; }
      else map.set(key, { min: Math.round(e.durationSec / 60), count: 1 });
    }
    return Array.from(map.entries());
  }, [filtered]);

  // Grouped by month (from filtered)
  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const e of filtered) {
      const d = new Date(e.timestamp ?? 0);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const totalMin = Math.round(filtered.reduce((s, e) => s + e.durationSec, 0) / 60);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const formatMonth = (key: string) => {
    const [y, m] = key.split('-');
    return `${y}年${parseInt(m)}月`;
  };

  const formatDuration = (min: number) => {
    if (min < 60) return `${min}${T('exerciseMin')}`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const flatData = useMemo((): FlatItem[] => {
    const items: FlatItem[] = [
      { type: 'statCards', key: 'statCards' },
      { type: 'sportFilter', key: 'sportFilter' },
    ];
    if (monthlyStats.length > 1) {
      items.push({ type: 'monthlyBar', key: 'monthlyBar' });
    }
    if (filtered.length === 0) {
      items.push({ type: 'emptyText', key: 'emptyText' });
    }
    for (const [monthKey, monthItems] of grouped) {
      items.push({ type: 'monthHeader', key: `mh-${monthKey}`, monthKey, items: monthItems });
      monthItems.forEach((e, idx) => {
        items.push({ type: 'entry', key: `e-${e.id}`, e, idx, isLast: idx === monthItems.length - 1 });
      });
    }
    return items;
  }, [monthlyStats, filtered, grouped]);

  const renderSportFilter = useCallback(() => {
    if (sportKeys.length <= 1) return null;
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8 }}>
        <TouchableOpacity
          onPress={() => setSelectedSport(null)}
          style={[styles.filterBtnBase, { backgroundColor: !selectedSport ? P : TH.card, borderWidth: 1, borderColor: !selectedSport ? P : TH.border }]}
        >
          <Text style={[styles.badgeFont, { fontWeight: '600', color: !selectedSport ? '#fff' : TH.sub }]}>{T('allStatus')}</Text>
        </TouchableOpacity>
        {sportKeys.map(([key, { icon, count }]) => {
          const active = selectedSport === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setSelectedSport(active ? null : key)}
              style={[styles.filterBtnBase, { backgroundColor: active ? P : TH.card, borderWidth: 1, borderColor: active ? P : TH.border, flexDirection: 'row', alignItems: 'center', gap: 4 }]}
            >
              <Text style={styles.badgeFont}>{icon}</Text>
              <Text style={[styles.badgeFont, { fontWeight: '600', color: active ? '#fff' : TH.text }]}>{key}</Text>
              <Text style={[styles.badgeFont, { color: active ? '#fff' : TH.sub }]}>({count})</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  }, [sportKeys, selectedSport, P, TH, T]);

  const renderItem = useCallback(({ item }: { item: FlatItem }) => {
    if (item.type === 'statCards') {
      return (
        <View style={styles.statCardsRow}>
          <Card style={styles.statCardInner}>
            <Text style={[styles.statCardValue, { color: P }]}>{totalMin}</Text>
            <Text style={[styles.subFont, { color: TH.sub }]}>{T('exerciseMin')}</Text>
          </Card>
          <Card style={styles.statCardInner}>
            <Text style={[styles.statCardValue, { color: P }]}>{filtered.length}</Text>
            <Text style={[styles.subFont, { color: TH.sub }]}>{T('exerciseTotalCount')}</Text>
          </Card>
        </View>
      );
    }
    if (item.type === 'sportFilter') return renderSportFilter();
    if (item.type === 'monthlyBar') {
      const maxMin = Math.max(...monthlyStats.map(([, s]) => s.min));
      return (
        <Card style={{ marginBottom: 14 }}>
          <Text style={{ fontSize: FONT_SUB, fontWeight: '700', color: TH.text, marginBottom: 10 }}>{T('exerciseTotalTime')}</Text>
          {monthlyStats.map(([monthKey, stats]) => {
            const pct = maxMin > 0 ? (stats.min / maxMin * 100) : 0;
            return (
              <View key={monthKey} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                  <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{formatMonth(monthKey)}</Text>
                  <Text style={{ fontSize: FONT_BADGE, color: TH.text, fontWeight: '600' }}>{formatDuration(stats.min)} · {stats.count}{T('exerciseWorkouts')}</Text>
                </View>
                <View style={{ height: 6, backgroundColor: `${P}20`, borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{ height: 6, width: `${pct}%`, backgroundColor: P, borderRadius: 3 }} />
                </View>
              </View>
            );
          })}
        </Card>
      );
    }
    if (item.type === 'emptyText') {
      return <Text style={{ color: TH.sub, textAlign: 'center', marginTop: 60, fontSize: FONT_EMPTY }}>{T('exerciseNoHistory')}</Text>;
    }
    if (item.type === 'monthHeader') {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginLeft: 4 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: P }} />
          <Text style={{ fontSize: FONT_SUB, fontWeight: '700', color: TH.text }}>{formatMonth(item.monthKey!)}</Text>
          <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{item.items!.length} {T('exerciseWorkouts')}</Text>
        </View>
      );
    }
    // entry
    const e = item.e!;
    const isExpanded = expandedId === e.id;
    const durMin = Math.floor(e.durationSec / 60);
    const durSec = e.durationSec % 60;
    return (
      <View style={{ flexDirection: 'row', marginLeft: 4 }}>
        <View style={{ alignItems: 'center', width: 24 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: P, zIndex: 1 }} />
          {!item.isLast && <View style={{ width: 2, flex: 1, backgroundColor: `${P}30` }} />}
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setExpandedId(isExpanded ? null : e.id)}
          style={{
            flex: 1, backgroundColor: TH.card, borderRadius: 12, padding: 14,
            marginBottom: 10, marginLeft: 8,
            borderLeftWidth: 3, borderLeftColor: P,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: FONT_STAT_SECTION }}>{e.sportIcon}</Text>
              <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{formatTime(e.timestamp ?? 0)}</Text>
            </View>
            <View style={{ backgroundColor: `${P}15`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
              <Text style={{ color: P, fontWeight: '700', fontSize: FONT_SUB }}>{durMin}:{String(durSec).padStart(2, '0')}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>{e.sportKey}</Text>
            {e.reps != null ? (
              <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{e.reps} {T('exerciseReps')}</Text>
            ) : e.distanceKm ? (
              <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{e.distanceKm.toFixed(2)} km</Text>
            ) : null}
            {e.calories ? (
              <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{e.calories} kcal</Text>
            ) : null}
          </View>
          {isExpanded && <DetailCard e={e} TH={TH} P={P} T={T} MapView={MapView} Polyline={Polyline} />}
        </TouchableOpacity>
      </View>
    );
  }, [P, TH, T, totalMin, filtered.length, monthlyStats, expandedId, MapView, Polyline, renderSportFilter]);

  const ListHeader = useMemo(() => (
    <ScreenHeader title={T('exerciseHistory')} onBack={() => nav.goBack()} />
  ), [T, nav]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      <FlatList<FlatItem>
        data={flatData}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        removeClippedSubviews={true}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
