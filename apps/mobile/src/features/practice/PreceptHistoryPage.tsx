import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRootNavigation } from '../../navigation/hooks';
import { useAppStore, useShallowStore } from '../../store/useAppStore';
import { useTheme, useT } from '../../components/UI';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_STAT_CARD, dateStr, computeStreak } from '@egoless-do/core';
import { isPreceptHabit, getPreceptDisplayName, getPreceptType, PRECEPT_PREFIX_AVOID } from '@egoless-do/core';
import { ChevronLeft, ChevronRight, Shield, X, Trash2 } from 'lucide-react-native';
import type { Habit } from '@egoless-do/core';

export default function PreceptHistoryPage() {
  const TH = useTheme();
  const T = useT();
  const nav = useRootNavigation();
  const { habits, reflections } = useShallowStore(s => ({
    habits: s.habits,
    reflections: s.reflections,
  }));
  const [monthOffset, setMonthOffset] = useState(0);

  const now = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const year = now.getFullYear();
  const month = now.getMonth();

  const preceptHabits = useMemo(() => {
    return (habits ?? []).filter(h => !h.deleted && isPreceptHabit(h.name));
  }, [habits]);

  const violationReflections = useMemo(() => {
    return (reflections ?? [])
      .filter(r => !r.deleted && (r.tags ?? []).includes('持戒'))
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [reflections]);

  // Stats
  const stats = useMemo(() => {
    const allDates = new Set<string>();
    preceptHabits.forEach(h => (h.checkedDates ?? []).forEach(d => allDates.add(d)));
    const totalDays = allDates.size;

    // Longest streak
    let longestStreak = 0;
    preceptHabits.forEach(h => {
      const s = computeStreak(h.checkedDates ?? []);
      if (s > longestStreak) longestStreak = s;
    });

    // Month data
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let monthDone = 0;
    let monthTotal = 0;
    const today = new Date();
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (new Date(year, month, d) > today) break;
      monthTotal++;
      if (preceptHabits.length > 0 && preceptHabits.every(h => (h.checkedDates ?? []).includes(ds))) monthDone++;
    }
    const monthRate = monthTotal > 0 ? Math.round((monthDone / monthTotal) * 100) : 0;

    return { totalDays, longestStreak, monthRate, monthDone, monthTotal, violationCount: violationReflections.length };
  }, [preceptHabits, violationReflections, year, month]);

  // Heatmap data
  const heatmapDays = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const days: { date: string; hasRecord: boolean; isToday: boolean }[] = [];
    for (let i = 0; i < offset; i++) days.push({ date: '', hasRecord: false, isToday: false });
    const today = dateStr();
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const hasRecord = preceptHabits.length > 0 && preceptHabits.every(h => (h.checkedDates ?? []).includes(ds));
      days.push({ date: ds, hasRecord, isToday: ds === today });
    }
    return days;
  }, [preceptHabits, year, month]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: TH.bg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 0 }}>
        <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text }}>{T('preceptHistory') || '持戒历史'}</Text>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <X size={22} color={TH.sub} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* Stats Card */}
        <View style={{ borderRadius: 16, borderWidth: 1, borderColor: `${TH.primary}30`, padding: 16, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            {[
              { value: stats.totalDays, label: '累计天数' },
              { value: stats.longestStreak, label: '最长连续' },
              { value: `${stats.monthRate}%`, label: '本月完成' },
              { value: stats.violationCount, label: '觉察记录' },
            ].map((s, i) => (
              <View key={i} style={{ alignItems: 'center', gap: 2 }}>
                <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '800', color: i === 3 ? '#EF4444' : TH.text }}>{s.value}</Text>
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
            <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: TH.text }}>
              {year}年{month + 1}月 · {stats.monthDone}/{stats.monthTotal}天
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

        {/* Per-precept stats */}
        {preceptHabits.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: FONT_SUB, fontWeight: '700', color: TH.text, marginBottom: 10 }}>每条戒统计</Text>
            {preceptHabits.map(h => {
              const name = getPreceptDisplayName(h.name);
              const type = getPreceptType(h.name);
              const isAvoid = type === 'avoid';
              const color = isAvoid ? '#EF4444' : '#10B981';
              const violations = violationReflections.filter(r => r.content.startsWith(name));
              return (
                <View key={h.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: `${TH.border}20` }}>
                  <Text style={{ fontSize: 16, marginRight: 8 }}>{isAvoid ? '🚫' : '✨'}</Text>
                  <Text style={{ flex: 1, fontSize: FONT_BODY, color: TH.text, fontWeight: '600' }}>{name}</Text>
                  <Text style={{ fontSize: 12, color: TH.sub, marginRight: 8 }}>{h.doneDays}天 🔥{h.streak}</Text>
                  {violations.length > 0 && (
                    <Text style={{ fontSize: 12, color: '#EF4444' }}>违{violations.length}</Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Insight Timeline */}
        {violationReflections.length > 0 && (
          <View>
            <Text style={{ fontSize: FONT_SUB, fontWeight: '700', color: TH.text, marginBottom: 10 }}>觉察时间线</Text>
            {violationReflections.map(r => {
              const d = new Date(r.timestamp);
              const dateLabel = `${d.getMonth() + 1}/${d.getDate()}`;
              const triggerTag = (r.tags ?? []).find(t => t !== '持戒');
              return (
                <View key={r.id} style={{ borderLeftWidth: 3, borderLeftColor: '#F59E0B', paddingLeft: 12, paddingVertical: 8, marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 2 }}>
                    <Text style={{ fontSize: 12, color: TH.sub }}>{dateLabel}</Text>
                    {triggerTag && <Text style={{ fontSize: 12, color: '#F59E0B' }}>#{triggerTag}</Text>}
                  </View>
                  <Text style={{ fontSize: FONT_BODY, color: TH.text }} numberOfLines={2}>{r.content}</Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
