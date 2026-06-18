import React, { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRootNavigation } from '../../navigation/hooks';
import { useAppStore } from '../../store/useAppStore';
import { useTheme, ScreenHeader, useT } from '../../components/UI';
import { FONT_BODY, FONT_SUB, FONT_BADGE, FONT_EMPTY, COLORS } from '@egoless-do/core';

export default function FastHistoryPage() {
  const nav = useRootNavigation();
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const store = useAppStore();

  const sorted = useMemo(() =>
    [...(store.fastingHistory ?? [])].filter(f => !f.deleted).sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0)),
    [store.fastingHistory]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof sorted>();
    for (const f of sorted) {
      const d = new Date(f.startedAt ?? 0);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(f);
    }
    return Array.from(map.entries());
  }, [sorted]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const formatMonth = (key: string) => {
    const [y, m] = key.split('-');
    return `${y}年${parseInt(m)}月`;
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        <ScreenHeader title={T('fastingHistory')} onBack={() => nav.goBack()} />

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

            {items.map((f, idx) => {
              const started = f.startedAt ?? 0;
              const ended = f.endedAt ?? Date.now();
              const durSec = Math.floor((ended - started) / 1000);
              const h = Math.floor(durSec / 3600);
              const m = Math.floor((durSec % 3600) / 60);
              const isLast = idx === items.length - 1;
              return (
                <View key={f.id ?? idx} style={{ flexDirection: 'row', marginLeft: 4 }}>
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
                      <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{formatTime(started)}</Text>
                      <View style={{ backgroundColor: `${P}15`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                        <Text style={{ color: P, fontWeight: '700', fontSize: FONT_SUB }}>{h}h {m}m</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>
                        {T('fastTarget')}: {f.targetHours}h
                      </Text>
                      <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>
                        ~{f.estimatedKcal ?? 0} kcal
                      </Text>
                    </View>
                    {f.insight ? (
                      <Text style={{ fontSize: FONT_BADGE, color: TH.sub, marginTop: 4, fontStyle: 'italic' }} numberOfLines={2}>
                        {f.insight}
                      </Text>
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
