import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useT } from '../../components/UI';
import { useRootNavigation } from '../../navigation/hooks';
import { useAppStore } from '../../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL, FONT_STAT_SECTION } from '@egoless-do/core';
import type { MantraDef } from '@egoless-do/core';

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dateKey(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export default function SutraHistoryScreen() {
  const nav = useRootNavigation();
  const TH = useTheme();
  const T = useT();
  const { mantraSessions, mantraDefs } = useAppStore(useShallow(s => ({ mantraSessions: s.mantraSessions, mantraDefs: s.mantraDefs })));

  const allSessions = useMemo(() =>
    (mantraSessions ?? []).filter(s => !s.deleted).sort((a, b) => b.startedAt - a.startedAt),
    [mantraSessions]
  );

  const mySutras = useMemo(() =>
    (mantraDefs ?? []).filter(d => !d.deleted && d.preset !== true),
    [mantraDefs]
  );

  const sutraMap = useMemo(() => {
    const m: Record<string, MantraDef> = {};
    for (const d of (mantraDefs ?? []).filter(d => !d.deleted)) m[d.id] = d;
    return m;
  }, [mantraDefs]);

  const stats = useMemo(() => {
    const totalCount = allSessions.reduce((sum, s) => sum + s.count, 0);
    const totalSec = allSessions.reduce((sum, s) => sum + s.durationSec, 0);
    const dateSet = new Set<string>();
    allSessions.forEach(s => dateSet.add(dateKey(new Date(s.startedAt))));

    let streak = 0;
    const today = startOfDay(new Date());
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    if (dateSet.has(dateKey(today)) || dateSet.has(dateKey(yesterday))) {
      streak = 1;
      let check = new Date(dateSet.has(dateKey(today)) ? today : yesterday);
      for (let i = 1; i < 365; i++) {
        check.setDate(check.getDate() - 1);
        if (dateSet.has(dateKey(check))) streak++;
        else break;
      }
    }
    return { totalCount, totalSec, streak };
  }, [allSessions]);

  const now = new Date();
  const monthYear = now.getFullYear();
  const monthIdx = now.getMonth();
  const heatmapData = useMemo(() => {
    const daysInMonth = new Date(monthYear, monthIdx + 1, 0).getDate();
    const firstDay = new Date(monthYear, monthIdx, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;

    const dayCountMap: Record<string, number> = {};
    allSessions.forEach(s => {
      const d = new Date(s.startedAt);
      if (d.getFullYear() === monthYear && d.getMonth() === monthIdx) {
        dayCountMap[dateKey(d)] = (dayCountMap[dateKey(d)] || 0) + s.count;
      }
    });

    const maxCount = Math.max(1, ...Object.values(dayCountMap));
    const today = new Date();
    const days: { date: string; count: number; intensity: number; isToday: boolean }[] = [];
    for (let i = 0; i < offset; i++) days.push({ date: '', count: 0, intensity: 0, isToday: false });
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(monthYear, monthIdx, d);
      const ds = dateKey(dt);
      const count = dayCountMap[ds] || 0;
      days.push({ date: ds, count, intensity: count > 0 ? Math.max(0.2, count / maxCount) : 0, isToday: dt.toDateString() === today.toDateString() });
    }
    return days;
  }, [allSessions, monthYear, monthIdx]);

  const distribution: { sutra: MantraDef; total: number; pct: number }[] = useMemo(() => {
    const total = stats.totalCount;
    return mySutras
      .map(sutra => {
        const sutraTotal = (mantraSessions ?? []).filter(s => !s.deleted && s.mantraId === sutra.id).reduce((a, b) => a + b.count, 0);
        const pct = total > 0 ? Math.round((sutraTotal / total) * 100) : 0;
        return { sutra, total: sutraTotal, pct };
      })
      .filter(d => d.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [mySutras, mantraSessions, stats.totalCount]);

  const formatTime = (sec: number) => {
    if (sec < 60) return sec + '秒';
    if (sec < 3600) return Math.floor(sec / 60) + '分' + (sec % 60 > 0 ? (sec % 60) + '秒' : '');
    return Math.floor(sec / 3600) + '小时' + Math.floor((sec % 3600) / 60) + '分';
  };

  const formatShortTime = (sec: number) => {
    if (sec < 60) return sec + 's';
    if (sec < 3600) return Math.floor(sec / 60) + 'm' + (sec % 60 > 0 ? (sec % 60) + 's' : '');
    return Math.floor(sec / 3600) + 'h' + Math.floor((sec % 3600) / 60) + 'm';
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => nav.goBack()} style={{ marginRight: 12 }}>
          <Text style={{ fontSize: 24, color: TH.text }}>←</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: FONT_TITLE, fontWeight: '800', color: TH.text, flex: 1 }}>{T('sutraHistory')}</Text>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '800', color: '#D4A574' }}>{stats.totalCount.toLocaleString()}</Text>
          <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>累计</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        {/* Stats card */}
        <View style={{ borderRadius: 16, borderWidth: 1, borderColor: TH.primary + '30', padding: 16, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '800', color: '#D4A574' }}>{stats.totalCount.toLocaleString()}</Text>
              <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>累计颗数</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '800', color: '#10B981' }}>{formatTime(stats.totalSec)}</Text>
              <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>累计时长</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '800', color: '#F59E0B' }}>🔥 {stats.streak}</Text>
              <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>连续</Text>
            </View>
          </View>
        </View>

        {/* Calendar heatmap this month */}
        <View style={{ borderRadius: 16, borderWidth: 1, borderColor: TH.primary + '20', padding: 16, marginBottom: 16 }}>
          <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text, marginBottom: 12 }}>
            {monthYear}年{monthIdx + 1}月
          </Text>
          <View style={{ flexDirection: 'row', marginBottom: 4 }}>
            {WEEKDAY_LABELS.map(d => (
              <View key={d} style={{ width: '14.28%', alignItems: 'center' }}>
                <Text style={{ fontSize: 10, color: TH.sub }}>{d}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {heatmapData.map((day, i) => (
              <View key={i} style={{ width: '14.28%', alignItems: 'center', paddingVertical: 2, minHeight: 32 }}>
                {day.date ? (
                  <View style={{
                    width: 30, height: 30, borderRadius: 15,
                    backgroundColor: day.count > 0 ? 'rgba(212, 165, 116, ' + day.intensity + ')' : day.isToday ? TH.primary + '20' : 'transparent',
                    borderWidth: day.isToday ? 2 : 0,
                    borderColor: day.isToday ? TH.primary : 'transparent',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 12, color: TH.text, fontWeight: day.isToday ? '700' : '400' }}>
                      {Number(day.date.split('-')[2])}
                    </Text>
                  </View>
                ) : <View style={{ width: 30, height: 30 }} />}
              </View>
            ))}
          </View>
        </View>

        {/* Distribution */}
        {distribution.length > 0 && (
          <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: TH.border }}>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text, marginBottom: 8 }}>经文分布</Text>
            {distribution.map(({ sutra, total, pct }) => (
              <View key={sutra.id} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: FONT_SUB, color: TH.text }}>{sutra.name}</Text>
                  <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{pct}%</Text>
                </View>
                <View style={{ height: 8, backgroundColor: TH.primary + '15', borderRadius: 4, overflow: 'hidden' }}>
                  <View style={{ width: (pct + '%') as any, height: '100%', backgroundColor: '#D4A574', borderRadius: 4 }} />
                </View>
                <Text style={{ fontSize: 10, color: TH.sub, marginTop: 2 }}>{total.toLocaleString()} 颗 ({pct}%)</Text>
              </View>
            ))}
          </View>
        )}

        {/* History list */}
        <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: TH.border }}>
          <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text, marginBottom: 8 }}>{T('sutraHistory')}</Text>
          {allSessions.length === 0 ? (
            <Text style={{ color: TH.sub, fontSize: FONT_SUB, textAlign: 'center', paddingVertical: 16 }}>{T('sutraNoRecords')}</Text>
          ) : allSessions.slice(0, 30).map(s => {
            const sutra = sutraMap[s.mantraId];
            const d = new Date(s.startedAt);
            const dateStr = (d.getMonth() + 1) + '/' + d.getDate();
            return (
              <View key={s.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: TH.border }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: FONT_BODY, color: TH.text, fontWeight: '600' }}>{sutra?.name ?? '未知'}</Text>
                  <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{dateStr}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                  <Text style={{ fontSize: 10, color: TH.sub }}>{s.count}颗 · {s.rounds}遍</Text>
                  <Text style={{ fontSize: 10, color: TH.sub }}>{formatShortTime(s.durationSec)}</Text>
                  {s.dedication ? <Text style={{ fontSize: 10, color: '#D4A574' }}>回向</Text> : null}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
