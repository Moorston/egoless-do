import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_STAT_CARD, dateStr } from '@egoless-do/core';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, useT } from '../../components/UI';
import { useRootNavigation } from '../../navigation/hooks';
import { useAppStore, useShallowStore } from '../../store/useAppStore';

const GIVE_TYPE_CONFIG: Record<string, { icon: string; color: string; labelKey: string }> = {
  material: { icon: '💰', color: '#F59E0B', labelKey: 'giveMaterial' },
  dharma: { icon: '📖', color: '#3B82F6', labelKey: 'giveDharma' },
  fearless: { icon: '🛡', color: '#10B981', labelKey: 'giveFearless' },
};

export default function GiveHistoryPage() {
  const TH = useTheme();
  const T = useT();
  const nav = useRootNavigation();
  const { giveHistory: giveHistoryRaw } = useShallowStore(s => ({
    giveHistory: s.giveHistory,
  }));
  const [monthOffset, setMonthOffset] = useState(0);

  const now = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const year = now.getFullYear();
  const month = now.getMonth();

  const giveHistory = useMemo(() => {
    return (giveHistoryRaw ?? []).filter(g => !g.deleted).sort((a, b) => b.timestamp - a.timestamp);
  }, [giveHistoryRaw]);

  // Stats
  const stats = useMemo(() => {
    const total = giveHistory.length;
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
    const monthRecords = giveHistory.filter(g => g.timestamp >= monthStart.getTime() && g.timestamp <= monthEnd.getTime());
    const monthCount = monthRecords.length;

    // Longest consecutive streak
    const dateSet = new Set<string>();
    giveHistory.forEach(g => dateSet.add(dateStr(new Date(g.timestamp))));
    const sortedDates = [...dateSet].sort();
    let longest = 0, current = sortedDates.length > 0 ? 1 : 0;
    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1]);
      const cur = new Date(sortedDates[i]);
      const diff = (cur.getTime() - prev.getTime()) / 86400000;
      if (diff === 1) { current++; } else { longest = Math.max(longest, current); current = 1; }
    }
    longest = Math.max(longest, current);

    // Type distribution
    const byType = { material: 0, dharma: 0, fearless: 0 };
    giveHistory.forEach(g => { byType[g.type] = (byType[g.type] || 0) + 1; });
    const typePercent = { material: 0, dharma: 0, fearless: 0 };
    if (total > 0) {
      typePercent.material = Math.round((byType.material / total) * 100);
      typePercent.dharma = Math.round((byType.dharma / total) * 100);
      typePercent.fearless = Math.round((byType.fearless / total) * 100);
    }

    return { total, monthCount, longest, byType, typePercent };
  }, [giveHistory, year, month]);

  // Heatmap
  const heatmapDays = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const days: { date: string; hasRecord: boolean; isToday: boolean }[] = [];
    for (let i = 0; i < offset; i++) days.push({ date: '', hasRecord: false, isToday: false });
    const today = dateStr();
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const hasRecord = giveHistory.some(g => dateStr(new Date(g.timestamp)) === ds);
      days.push({ date: ds, hasRecord, isToday: ds === today });
    }
    return days;
  }, [giveHistory, year, month]);

  const displayHistory = useMemo(() => giveHistory.slice(0, 50), [giveHistory]);

  const renderTimelineItem = useCallback(({ item }: { item: typeof giveHistory[number] }) => {
    const config = GIVE_TYPE_CONFIG[item.type] || GIVE_TYPE_CONFIG.material;
    const d = new Date(item.timestamp);
    return (
      <View style={{ borderLeftWidth: 3, borderLeftColor: config.color, paddingLeft: 12, paddingVertical: 8, marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <Text style={{ fontSize: 12, color: TH.sub }}>{d.getMonth() + 1}/{d.getDate()}</Text>
          <Text style={{ fontSize: 14 }}>{config.icon}</Text>
          {item.anonymous && <Text style={{ fontSize: 14 }}>🤐</Text>}
          {item.amount && <Text style={{ fontSize: 12, color: '#F59E0B' }}>¥{item.amount}</Text>}
        </View>
        <Text style={{ fontSize: FONT_BODY(), color: TH.text }} numberOfLines={2}>{item.content}</Text>
        {item.motivation && (
          <Text style={{ fontSize: 12, color: TH.sub, fontStyle: 'italic', marginTop: 2 }}>
            心念：{item.motivation}
          </Text>
        )}
      </View>
    );
  }, [TH, T]);

  const listHeader = useMemo(() => (
    <>
      {/* Stats Card */}
      <View style={{ borderRadius: 16, borderWidth: 1, borderColor: `${TH.primary}30`, padding: 16, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          {[
            { value: stats.total, label: '累计' },
            { value: stats.monthCount, label: '本月' },
            { value: stats.longest, label: '最长连续' },
          ].map((s, i) => (
            <View key={i} style={{ alignItems: 'center', gap: 2 }}>
              <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '800', color: TH.text }}>{s.value}</Text>
              <Text style={{ fontSize: 11, color: TH.sub }}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Heatmap */}
      <View style={{ borderRadius: 16, borderWidth: 1, borderColor: `${TH.primary}20`, padding: 16, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <TouchableOpacity onPress={() => setMonthOffset(o => o - 1)}>
            <ChevronLeft size={20} color={TH.sub} />
          </TouchableOpacity>
          <Text style={{ fontSize: FONT_SUB(), fontWeight: '600', color: TH.text }}>
            {year}年{month + 1}月 · {stats.monthCount}次
          </Text>
          <TouchableOpacity onPress={() => setMonthOffset(o => Math.min(o + 1, 0))}>
            <ChevronRight size={20} color={TH.sub} />
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {['一', '二', '三', '四', '五', '六', '日'].map(d => (
            <View key={d} style={{ width: '14.28%', alignItems: 'center', paddingVertical: 4 }}>
              <Text style={{ fontSize: 10, color: TH.sub }}>{d}</Text>
            </View>
          ))}
          {heatmapDays.map((day, i) => (
            <View key={i} style={{ width: '14.28%', alignItems: 'center', paddingVertical: 3 }}>
              {day.date ? (
                <View style={{
                  width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: day.hasRecord ? '#F59E0B' : day.isToday ? `${TH.primary}30` : 'transparent',
                }}>
                  <Text style={{ fontSize: 12, color: day.hasRecord ? '#fff' : TH.text, fontWeight: day.isToday ? '700' : '400' }}>
                    {parseInt(day.date.split('-')[2])}
                  </Text>
                </View>
              ) : <View style={{ width: 28, height: 28 }} />}
            </View>
          ))}
        </View>
      </View>

      {/* Type Distribution */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: FONT_SUB(), fontWeight: '700', color: TH.text, marginBottom: 10 }}>{T('giveDistribution') || '类型分布'}</Text>
        {Object.entries(GIVE_TYPE_CONFIG).map(([type, config]) => {
          const count = stats.byType[type as keyof typeof stats.byType] || 0;
          const percent = stats.typePercent[type as keyof typeof stats.typePercent] || 0;
          return (
            <View key={type} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 16, marginRight: 8 }}>{config.icon}</Text>
              <Text style={{ width: 60, fontSize: FONT_BODY(), color: TH.text }}>{T(config.labelKey) || type}</Text>
              <View style={{ flex: 1, height: 8, backgroundColor: `${config.color}20`, borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ width: `${percent}%`, height: '100%', backgroundColor: config.color, borderRadius: 4 }} />
              </View>
              <Text style={{ width: 50, textAlign: 'right', fontSize: FONT_BODY(), color: TH.sub }}>{count} ({percent}%)</Text>
            </View>
          );
        })}
      </View>

      {giveHistory.length > 0 && (
        <Text style={{ fontSize: FONT_SUB(), fontWeight: '700', color: TH.text, marginBottom: 10 }}>善行时间线</Text>
      )}
    </>
  ), [TH, T, stats, year, month, heatmapDays, giveHistory.length]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: TH.bg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 0 }}>
        <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text }}>{T('giveHistory') || '布施历史'}</Text>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <X size={22} color={TH.sub} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={displayHistory}
        keyExtractor={item => item.id}
        renderItem={renderTimelineItem}
        removeClippedSubviews={true}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListHeaderComponent={listHeader}
      />
    </SafeAreaView>
  );
}
