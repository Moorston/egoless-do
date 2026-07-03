import React, { useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Trash2 } from 'lucide-react-native';
import { useRootNavigation } from '../../navigation/hooks';
import { useTheme, useT } from '../../components/UI';
import { useAppStore } from '../../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_STAT_CARD, FONT_SMALL, dateStr, BREATHING_PRESETS } from '@egoless-do/core';
import type { BreathingRecord } from '@egoless-do/core';

export default function BreathHistoryPage() {
  const TH = useTheme();
  const T = useT();
  const nav = useRootNavigation();
  const { breathHistory, removeBreathRecord } = useAppStore(useShallow(s => ({ breathHistory: s.breathHistory, removeBreathRecord: s.removeBreathRecord })));

  const records: BreathingRecord[] = useMemo(() => {
    return ((breathHistory ?? []) as BreathingRecord[])
      .filter((r: BreathingRecord) => !r.deleted)
      .sort((a: BreathingRecord, b: BreathingRecord) => b.updatedAt - a.updatedAt);
  }, [breathHistory]);

  // Stats
  const stats = useMemo(() => {
    if (records.length === 0) {
      return { total: 0, totalMin: 0, streak: 0, distressImprove: 0, mostUsedKey: '' };
    }

    const totalMin = Math.round(records.reduce((s: number, r: BreathingRecord) => s + r.durationSec, 0) / 60);

    // Streak: consecutive days with at least one record
    const dates = new Set(records.map((r: BreathingRecord) => r.date));
    const sortedDates = [...dates].sort().reverse();
    let streak = 0;
    const today = dateStr();
    let checkDate = today;
    if (!dates.has(today)) {
      // Check from yesterday
      const d = new Date();
      d.setDate(d.getDate() - 1);
      checkDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    if (dates.has(checkDate)) {
      streak = 1;
      const d = new Date(checkDate + 'T00:00:00');
      for (let i = 1; i < 365; i++) {
        d.setDate(d.getDate() - 1);
        const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (dates.has(ds)) streak++;
        else break;
      }
    }

    // Distress improvement
    const withDistress = records.filter((r: BreathingRecord) => r.preDistress > 0);
    let distressImprove = 0;
    if (withDistress.length > 0) {
      const avgPre = withDistress.reduce((s: number, r: BreathingRecord) => s + r.preDistress, 0) / withDistress.length;
      const avgPost = withDistress.reduce((s: number, r: BreathingRecord) => s + r.postDistress, 0) / withDistress.length;
      distressImprove = avgPre > 0 ? Math.round(((avgPre - avgPost) / avgPre) * 100) : 0;
    }

    // Most used preset
    const presetCounts = new Map<string, number>();
    records.forEach((r: BreathingRecord) => presetCounts.set(r.presetKey, (presetCounts.get(r.presetKey) ?? 0) + 1));
    let mostUsedKey = '';
    let maxCount = 0;
    presetCounts.forEach((count, key) => { if (count > maxCount) { maxCount = count; mostUsedKey = key; } });

    return { total: records.length, totalMin, streak, distressImprove, mostUsedKey };
  }, [records]);

  const mostUsedPreset = useMemo(() => {
    return BREATHING_PRESETS.find(p => p.key === stats.mostUsedKey);
  }, [stats.mostUsedKey]);

  const handleDelete = useCallback((record: BreathingRecord) => {
    Alert.alert(T('breathDeleteRecord'), T('breathDeleteConfirm'), [
      { text: T('cancel'), style: 'cancel' },
      { text: T('delete'), style: 'destructive', onPress: () => removeBreathRecord(record.id) },
    ]);
  }, [removeBreathRecord, T]);

  const formatTime = useCallback((sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }, []);

  const renderItem = useCallback(({ item: record }: { item: BreathingRecord }) => {
    const preset = BREATHING_PRESETS.find(p => p.key === record.presetKey);
    const presetName = preset ? T(preset.nameKey) : record.presetKey;
    const distressChange = record.preDistress - record.postDistress;
    const distressPercent = record.preDistress > 0 ? Math.round((distressChange / record.preDistress) * 100) : 0;
    const isImprove = distressChange > 0;

    return (
      <View style={{ borderRadius: 14, borderWidth: 1, borderColor: `${TH.border}40`, padding: 14, marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text }}>{presetName}</Text>
              <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>{record.date}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
              <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>{record.cycles} {T('breathCycles')}</Text>
              <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>{formatTime(record.durationSec)}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => handleDelete(record)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Trash2 size={16} color={`${TH.sub}60`} />
          </TouchableOpacity>
        </View>

        {/* Distress change */}
        {record.preDistress > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>😌</Text>
            <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>{record.preDistress}</Text>
            <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>→</Text>
            <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>{record.postDistress}</Text>
            <Text style={{ fontSize: FONT_SMALL, color: distressChange === 0 ? TH.sub : isImprove ? '#10B981' : '#EF4444', fontWeight: '600' }}>
              {distressChange === 0 ? '—' : isImprove ? '↓' : '↑'}{distressChange === 0 ? '' : `${Math.abs(distressPercent)}%`}
            </Text>
          </View>
        )}

        {/* Reflection */}
        {record.reflection && (
          <Text style={{ fontSize: FONT_SMALL, color: TH.sub, marginTop: 6, fontStyle: 'italic' }} numberOfLines={2}>
            "{record.reflection}"
          </Text>
        )}
      </View>
    );
  }, [T, TH.border, TH.sub, TH.text, formatTime, handleDelete]);

  const keyExtractor = useCallback((item: BreathingRecord, index: number) => item.id ?? String(index), []);

  const ListHeaderComponent = useMemo(() => (
    <>
      {/* Stats Card */}
      {records.length > 0 && (
        <View style={{ borderRadius: 16, borderWidth: 1, borderColor: '#06b6d430', padding: 16, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            {[
              { value: stats.total, label: T('breathTotalSessions'), color: TH.text },
              { value: `${stats.totalMin}${T('bodyMin') || 'min'}`, label: T('breathTotalMinutes'), color: TH.text },
              { value: stats.streak, label: T('breathStreak'), color: '#F59E0B' },
              { value: `${stats.distressImprove}%`, label: T('breathDistressImprove'), color: '#10B981' },
            ].map((s, i) => (
              <View key={i} style={{ alignItems: 'center', gap: 2 }}>
                <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '800', color: s.color }}>{s.value}</Text>
                <Text style={{ fontSize: 11, color: TH.sub }}>{s.label}</Text>
              </View>
            ))}
          </View>
          {mostUsedPreset && (
            <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: `${TH.border}30` }}>
              <Text style={{ fontSize: FONT_SUB, color: TH.sub, textAlign: 'center' }}>
                {T('breathMostUsed')}: {T(mostUsedPreset.nameKey)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Recent sessions */}
      <Text style={{ fontSize: FONT_SUB, fontWeight: '700', color: TH.text, marginBottom: 10 }}>{T('breathRecentSessions')}</Text>

      {records.length === 0 && (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <Text style={{ fontSize: FONT_BODY, color: TH.sub }}>{T('breathNoRecords')}</Text>
        </View>
      )}
    </>
  ), [records.length, stats.total, stats.totalMin, stats.streak, stats.distressImprove, T, TH.text, TH.sub, TH.border, mostUsedPreset]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: TH.bg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 0 }}>
        <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text }}>{T('breathingHistory')}</Text>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <X size={22} color={TH.sub} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={records}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        removeClippedSubviews={true}
        ListHeaderComponent={ListHeaderComponent}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      />
    </SafeAreaView>
  );
}
