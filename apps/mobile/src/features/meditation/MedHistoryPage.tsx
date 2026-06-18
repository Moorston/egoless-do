import React, { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRootNavigation } from '../../navigation/hooks';
import { useAppStore } from '../../store/useAppStore';
import { useTheme, ScreenHeader, useT } from '../../components/UI';
import { FONT_BODY, FONT_SUB, FONT_BADGE, FONT_EMPTY } from '@egoless-do/core';

export default function MedHistoryPage() {
  const nav = useRootNavigation();
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const store = useAppStore();

  const sorted = useMemo(() =>
    [...(store.medHistory ?? [])].filter(m => !m.deleted).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    [store.medHistory]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof sorted>();
    for (const m of sorted) {
      const key = (m.date ?? '').slice(0, 7); // "2026-06"
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries());
  }, [sorted]);

  const formatMonth = (key: string) => {
    const [y, mo] = key.split('-');
    return `${y}年${parseInt(mo)}月`;
  };

  const formatDay = (dateStr: string) => {
    const parts = dateStr.split('-');
    return parts.length >= 3 ? `${parseInt(parts[1])}-${parseInt(parts[2])}` : dateStr;
  };

  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const getWeekday = (ds: string) => {
    const [y, m, d] = ds.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return isNaN(date.getTime()) ? '' : weekdays[date.getDay()];
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        <ScreenHeader title={T('meditationHistory')} onBack={() => nav.goBack()} />

        {sorted.length === 0 && (
          <Text style={{ color: TH.sub, textAlign: 'center', marginTop: 60, fontSize: FONT_EMPTY }}>{T('noHistory')}</Text>
        )}

        {grouped.map(([monthKey, items]) => (
          <View key={monthKey} style={{ marginBottom: 20 }}>
            {/* Month header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginLeft: 4 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: P }} />
              <Text style={{ fontSize: FONT_SUB, fontWeight: '700', color: TH.text }}>{formatMonth(monthKey)}</Text>
              <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{items.length} {T('fastTimes')}</Text>
            </View>

            {items.map((m, idx) => {
              const isLast = idx === items.length - 1;
              return (
                <View key={m.date ?? idx} style={{ flexDirection: 'row', marginLeft: 4 }}>
                  {/* Timeline line + dot */}
                  <View style={{ alignItems: 'center', width: 24 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: P, zIndex: 1 }} />
                    {!isLast && <View style={{ width: 2, flex: 1, backgroundColor: `${P}30` }} />}
                  </View>

                  {/* Content card */}
                  <View style={{
                    flex: 1, backgroundColor: TH.card, borderRadius: 12, padding: 14,
                    marginBottom: 10, marginLeft: 8,
                    borderLeftWidth: 3, borderLeftColor: P,
                  }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{formatDay(m.date)}</Text>
                        <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>周{getWeekday(m.date)}</Text>
                      </View>
                      <View style={{ backgroundColor: `${P}15`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                        <Text style={{ color: P, fontWeight: '700', fontSize: FONT_SUB }}>{m.dur}</Text>
                      </View>
                    </View>
                    {m.mood ? (
                      <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{m.mood}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
