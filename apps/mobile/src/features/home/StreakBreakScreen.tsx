import React, { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../store/useAppStore';
import { useTheme, useT, ScreenHeader, Card } from '../../components/UI';
import { COLORS, detectStreakBreaks, computeLongestStreak, FONT_STAT_SECTION, FONT_SUB, FONT_BODY, FONT_BADGE } from '@egoless-do/core';
import { PartyPopper, ArrowRight } from 'lucide-react-native';

export default function StreakBreakScreen() {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const store = useAppStore();
  const nav = useNavigation();

  const breaks = useMemo(() => detectStreakBreaks(store.checkinHistory ?? []), [store.checkinHistory]);
  const longestStreak = useMemo(() => computeLongestStreak(store.checkinHistory ?? []), [store.checkinHistory]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: TH.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}>
        <ScreenHeader title={T('streakBreakTitle')} onBack={() => nav.goBack()} />

        {/* Stats summary */}
        <View style={{
          backgroundColor: TH.card, borderRadius: 16, borderWidth: 1, borderColor: TH.border,
          padding: 16, marginBottom: 12, flexDirection: 'row', gap: 16,
        }}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '800', color: '#EF4444' }}>{breaks.length}</Text>
            <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 4 }}>{T('streakBreakTotal')}</Text>
          </View>
          <View style={{ width: 1, backgroundColor: TH.border }} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '800', color: COLORS.GREEN }}>{longestStreak}</Text>
            <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 4 }}>{T('days')}</Text>
          </View>
        </View>

        {/* Break list */}
        {breaks.length === 0 ? (
          <Card>
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <PartyPopper size={32} color={COLORS.GREEN} style={{ marginBottom: 8 }} />
              <Text style={{ fontSize: FONT_BODY, color: TH.sub }}>{T('streakBreakEmpty')}</Text>
            </View>
          </Card>
        ) : (
          breaks.map((b, i) => (
            <Card key={i}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>
                  {b.breakDate}
                </Text>
                <View style={{
                  backgroundColor: '#EF444420', borderRadius: 8,
                  paddingHorizontal: 10, paddingVertical: 3,
                }}>
                  <Text style={{ color: '#EF4444', fontSize: FONT_BADGE, fontWeight: '600' }}>
                    -{b.lostStreak} {T('streakBreakDays')}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
                <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('streakBreakRange')}：{b.startDate}</Text>
                <ArrowRight size={12} color={TH.sub} />
                <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{b.breakDate}</Text>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
