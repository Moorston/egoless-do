import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useRootNavigation } from '../../navigation/hooks';
import { useTheme, useT } from '../../components/UI';
import { useAppStore } from '../../store/useAppStore';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL, FONT_STAT_SECTION } from '@egoless-do/core';
import type { RootStackParamList } from '../../navigation/types';

export default function MantraHistoryScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'MantraHistory'>>();
  const { mantraId } = route.params ?? {};
  const nav = useRootNavigation();
  const TH = useTheme();
  const T = useT();
  const store = useAppStore();
  const [monthOffset, setMonthOffset] = useState(0);

  // 当前显示的月份
  const displayMonth = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const monthYear = displayMonth.getFullYear();
  const monthIdx = displayMonth.getMonth();
  const monthStr = `${monthYear}-${String(monthIdx + 1).padStart(2, '0')}`;

  // 咒语名称映射
  const mantraNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const d of (store.mantraDefs ?? []).filter(d => !d.deleted)) {
      map[d.id] = d.name;
    }
    return map;
  }, [store.mantraDefs]);

  // 当前咒语（单咒语模式）
  const singleMantra = useMemo(() =>
    mantraId ? (store.mantraDefs ?? []).find(d => d.id === mantraId) : undefined,
    [store.mantraDefs, mantraId]
  );

  // 过滤后的 sessions
  const sessions = useMemo(() =>
    (store.mantraSessions ?? [])
      .filter(s => !s.deleted && (mantraId ? s.mantraId === mantraId : true))
      .sort((a, b) => b.startedAt - a.startedAt),
    [store.mantraSessions, mantraId]
  );

  // ── StatsCard ──
  const stats = useMemo(() => {
    const totalCount = sessions.reduce((sum, s) => sum + s.count, 0);
    const totalSec = sessions.reduce((sum, s) => sum + s.durationSec, 0);
    const avgSec = sessions.length > 0 ? Math.round(totalSec / sessions.length) : 0;

    // 连续天数计算
    const dateSet = new Set<string>();
    sessions.forEach(s => {
      const d = new Date(s.startedAt);
      dateSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    });
    const sortedDates = [...dateSet].sort().reverse();
    let streak = 0;
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    if (sortedDates.includes(todayStr) || sortedDates.includes(yesterdayStr)) {
      streak = 1;
      let checkDate = new Date(sortedDates.includes(todayStr) ? today : yesterday);
      for (let i = 1; i < 365; i++) {
        checkDate.setDate(checkDate.getDate() - 1);
        const ds = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
        if (dateSet.has(ds)) streak++;
        else break;
      }
    }
    return { totalCount, totalSec, avgSec, streak };
  }, [sessions]);

  // ── 热力图 ──
  const heatmapData = useMemo(() => {
    const daysInMonth = new Date(monthYear, monthIdx + 1, 0).getDate();
    const firstDay = new Date(monthYear, monthIdx, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;

    // 按月统计持咒量（次数）
    const dayCountMap: Record<string, number> = {};
    sessions.forEach(s => {
      const d = new Date(s.startedAt);
      if (d.getFullYear() === monthYear && d.getMonth() === monthIdx) {
        const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        dayCountMap[ds] = (dayCountMap[ds] || 0) + s.count;
      }
    });

    const maxCount = Math.max(1, ...Object.values(dayCountMap));
    const today = new Date();

    const days: { date: string; count: number; intensity: number; isToday: boolean; isFuture: boolean }[] = [];
    for (let i = 0; i < offset; i++) days.push({ date: '', count: 0, intensity: 0, isToday: false, isFuture: false });
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${monthYear}-${String(monthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const count = dayCountMap[ds] || 0;
      const dt = new Date(monthYear, monthIdx, d);
      days.push({
        date: ds,
        count,
        intensity: count > 0 ? Math.max(0.2, count / maxCount) : 0,
        isToday: dt.toDateString() === today.toDateString(),
        isFuture: dt > today,
      });
    }
    return days;
  }, [sessions, monthYear, monthIdx]);

  // ── 按月分组时间线 ──
  const groupedSessions = useMemo(() => {
    const groups: Record<string, typeof sessions> = {};
    for (const s of sessions) {
      const d = new Date(s.startedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [sessions]);

  const formatTime = (sec: number) => {
    if (sec < 60) return `${sec}秒`;
    if (sec < 3600) return `${Math.floor(sec / 60)}分${sec % 60 > 0 ? `${sec % 60}秒` : ''}`;
    return `${Math.floor(sec / 3600)}小时${Math.floor((sec % 3600) / 60)}分`;
  };

  const formatShortTime = (sec: number) => {
    if (sec < 60) return `${sec}s`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m${sec % 60 > 0 ? `${sec % 60}s` : ''}`;
    return `${Math.floor(sec / 3600)}h${Math.floor((sec % 3600) / 60)}m`;
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const weekdayLabels = ['一', '二', '三', '四', '五', '六', '日'];

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      {/* 顶部 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => nav.goBack()} style={{ marginRight: 12 }}>
          <Text style={{ fontSize: 24, color: TH.text }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: FONT_TITLE, fontWeight: '800', color: TH.text }}>
            {singleMantra?.name ?? '持咒记录'}
          </Text>
          {!singleMantra && <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>全部咒语</Text>}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#FBBF24' }}>
            {stats.totalCount.toLocaleString()}
          </Text>
          <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>累计</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>

        {/* ── StatsCard ── */}
        <View style={{ borderRadius: 16, borderWidth: 1, borderColor: `${TH.primary}30`, padding: 16, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#FBBF24' }}>
                {stats.totalCount.toLocaleString()}
              </Text>
              <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>累计次数</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#10B981' }}>
                {formatTime(stats.totalSec)}
              </Text>
              <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>累计时长</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#F59E0B' }}>
                🔥 {stats.streak}
              </Text>
              <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>连续</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#6366F1' }}>
                {formatShortTime(stats.avgSec)}
              </Text>
              <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>平均</Text>
            </View>
          </View>
        </View>

        {/* ── 热力图 ── */}
        <View style={{ borderRadius: 16, borderWidth: 1, borderColor: `${TH.primary}20`, padding: 16, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <TouchableOpacity onPress={() => setMonthOffset(o => o - 1)} style={{ padding: 4 }}>
              <Text style={{ fontSize: 18, color: TH.sub }}>‹</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>
              {monthYear}年{monthIdx + 1}月
            </Text>
            <TouchableOpacity onPress={() => setMonthOffset(o => Math.min(o + 1, 0))} style={{ padding: 4 }}>
              <Text style={{ fontSize: 18, color: TH.sub }}>›</Text>
            </TouchableOpacity>
          </View>

          {/* 星期标签 */}
          <View style={{ flexDirection: 'row', marginBottom: 4 }}>
            {weekdayLabels.map(d => (
              <View key={d} style={{ width: '14.28%', alignItems: 'center' }}>
                <Text style={{ fontSize: 10, color: TH.sub }}>{d}</Text>
              </View>
            ))}
          </View>

          {/* 日历格 */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {heatmapData.map((day, i) => (
              <View key={i} style={{ width: '14.28%', alignItems: 'center', paddingVertical: 2, minHeight: 32 }}>
                {day.date ? (
                  <View style={{
                    width: 30, height: 30, borderRadius: 15,
                    backgroundColor: day.count > 0
                      ? `rgba(251, 191, 36, ${day.isFuture ? 0.1 : day.intensity})`
                      : day.isToday ? `${TH.primary}20` : 'transparent',
                    borderWidth: day.isToday ? 2 : 0,
                    borderColor: day.isToday ? TH.primary : 'transparent',
                    alignItems: 'center', justifyContent: 'center',
                    opacity: day.isFuture ? 0.3 : 1,
                  }}>
                    <Text style={{ fontSize: 12, color: day.isFuture ? `${TH.sub}60` : TH.text, fontWeight: day.isToday ? '700' : '400' }}>
                      {parseInt(day.date.split('-')[2])}
                    </Text>
                  </View>
                ) : <View style={{ width: 30, height: 30 }} />}
              </View>
            ))}
          </View>
        </View>

        {/* ── 时间线 ── */}
        {sessions.length === 0 ? (
          <View style={{ alignItems: 'center', padding: 40 }}>
            <Text style={{ fontSize: 40, marginBottom: 8 }}>📿</Text>
            <Text style={{ fontSize: FONT_BODY, color: TH.sub, textAlign: 'center' }}>暂无持咒记录</Text>
          </View>
        ) : (
          groupedSessions.map(([monthKey, groupSessions]) => (
            <View key={monthKey} style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text, marginBottom: 8 }}>
                {parseInt(monthKey.split('-')[0])}年{parseInt(monthKey.split('-')[1])}月
                <Text style={{ fontSize: FONT_SMALL, fontWeight: '400', color: TH.sub }}> · {groupSessions.length}次</Text>
              </Text>
              {groupSessions.map(s => (
                <View key={s.id} style={{
                  backgroundColor: TH.card, borderRadius: 14, padding: 14, marginBottom: 8,
                  borderWidth: 1, borderColor: TH.border,
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {!mantraId && mantraNames[s.mantraId] && (
                        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#FBBF2420' }}>
                          <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: '#D97706' }}>{mantraNames[s.mantraId]}</Text>
                        </View>
                      )}
                      <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: TH.text }}>{formatDate(s.startedAt)}</Text>
                    </View>
                    <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>{formatShortTime(s.durationSec)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 20 }}>
                    <View>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: '#FBBF24' }}>{s.count.toLocaleString()}</Text>
                      <Text style={{ fontSize: 10, color: TH.sub }}>次数</Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: '#10B981' }}>{s.rounds}</Text>
                      <Text style={{ fontSize: 10, color: TH.sub }}>遍</Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: '#F59E0B' }}>{s.targetRounds}</Text>
                      <Text style={{ fontSize: 10, color: TH.sub }}>目标</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}