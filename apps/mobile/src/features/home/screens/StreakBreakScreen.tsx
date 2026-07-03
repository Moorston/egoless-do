import React, { useMemo, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRootNavigation } from '../../../navigation/hooks';
import { useAppStore } from '../../../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useTheme, useT, ScreenHeader, Card } from '../../../components/UI';
import {
  COLORS,
  detectStreakBreaks, computeLongestStreak, computeCurrentStreak,
  computeBreakInsights, computeHypotheticalStreak, generateEncouragement, getRecoveryData,
  FONT_STAT_SECTION, FONT_SUB, FONT_BODY, FONT_BADGE, FONT_TINY,
} from '@egoless-do/core';
import { PartyPopper, ArrowRight, Flame, Heart, Clock, Sprout, Shield } from 'lucide-react-native';

export default function StreakBreakScreen() {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const { checkinHistory, graceHistory, userProfile } = useAppStore(useShallow(s => ({
    checkinHistory: s.checkinHistory,
    graceHistory: s.graceHistory,
    userProfile: s.userProfile,
  })));
  const nav = useRootNavigation();

  const history = (checkinHistory ?? []).filter(c => !c.deleted);
  const graceHistoryArr = graceHistory ?? [];
  const quota = userProfile?.graceMonthlyQuota ?? 2;

  const breaks = useMemo(() => detectStreakBreaks(history), [history]);
  const doneDates = useMemo(() => history.filter(c => c.done).map(c => c.date), [history]);
  const longestStreak = useMemo(() => computeLongestStreak(doneDates), [doneDates]);
  const currentStreak = useMemo(() => computeCurrentStreak(history), [history]);
  const insight = useMemo(() => computeBreakInsights(breaks, history), [breaks, history]);
  const recovery = useMemo(() => getRecoveryData(history, breaks), [history, breaks]);
  const encouragement = useMemo(
    () => generateEncouragement(breaks, longestStreak, doneDates.length, currentStreak, insight),
    [breaks, longestStreak, doneDates, currentStreak, insight],
  );
  const hypotheticals = useMemo(
    () => breaks.map(b => computeHypotheticalStreak(b, history, graceHistoryArr, quota)),
    [breaks, history, graceHistoryArr, quota],
  );

  const handleCheckin = useCallback(() => {
    // Go back to main tabs and switch to Home tab
    nav.goBack();
  }, [nav]);

  const weekdayLabels = ['一', '二', '三', '四', '五', '六', '日'];
  const monthLabels = insight.monthlyTrend.map(t => {
    const m = parseInt(t.month.split('-')[1]);
    return `${m}月`;
  });

  const renderBreakItem = useCallback(({ item, index }: { item: (typeof breaks)[number]; index: number }) => {
    const b = item;
    const hypothetical = hypotheticals[index];
    return (
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>
              {b.breakDate}
            </Text>
            {hypothetical?.available && (
              <View style={{
                backgroundColor: `${COLORS.ORANGE}15`, borderColor: `${COLORS.ORANGE}40`,
                borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2,
                flexDirection: 'row', alignItems: 'center', gap: 4,
              }}>
                <Shield size={12} color={COLORS.ORANGE} />
                <Text style={{ fontSize: FONT_TINY, color: COLORS.ORANGE, fontWeight: '600' }}>
                  {T('streakBreakHypothetical').replace('{n}', String(hypothetical.hypotheticalStreak))}
                </Text>
              </View>
            )}
          </View>
          <View style={{
            backgroundColor: '#EF444420', borderRadius: 8,
            paddingHorizontal: 10, paddingVertical: 3,
          }}>
            <Text style={{ color: '#EF4444', fontSize: FONT_BADGE, fontWeight: '600' }}>
              -{b.lostStreak} {T('streakBreakDays')}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('streakBreakRange')}：{b.startDate}</Text>
          <ArrowRight size={12} color={TH.sub} />
          <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{b.breakDate}</Text>
        </View>
      </Card>
    );
  }, [T, TH, hypotheticals]);

  const breakKeyExtractor = useCallback((item: (typeof breaks)[number], index: number) => item.breakDate ?? String(index), []);


  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: TH.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}>
        <ScreenHeader title={T('streakBreakTitle')} onBack={() => nav.goBack()} />

        {/* Recovery Card */}
        <Card>
          <View style={{ alignItems: 'center', paddingVertical: 4 }}>
            {recovery.state === 'active' && (
              <>
                <Flame size={40} color={P} style={{ marginBottom: 10 }} />
                <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '800', color: P, marginBottom: 4 }}>
                  {T('streakBreakActiveStreak').replace('{n}', String(currentStreak))}
                </Text>
                {(recovery.daysSinceLastBreak ?? 0) > 0 && (
                  <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 8 }}>
                    {T('streakBreakDaysSince').replace('{n}', String(recovery.daysSinceLastBreak))}
                  </Text>
                )}
                <Text style={{ fontSize: FONT_BODY, color: TH.text }}>{T('streakBreakGettingStronger')}</Text>
              </>
            )}
            {recovery.state === 'just_broke' && (
              <>
                <Heart size={40} color={COLORS.ORANGE} style={{ marginBottom: 10 }} />
                <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '800', color: TH.text, marginBottom: 4 }}>
                  {T('streakBreakRestart')}
                </Text>
                <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 8 }}>
                  {T('streakBreakPrevStreak').replace('{n}', String(recovery.previousStreak ?? 0))}，{T('streakBreakCanBeLonger')}
                </Text>
                <Pressable onPress={handleCheckin} style={{
                  paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10,
                  backgroundColor: P,
                }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BODY }}>
                    {T('streakBreakCheckinNow')}
                  </Text>
                </Pressable>
              </>
            )}
            {recovery.state === 'at_risk' && (
              <>
                <Clock size={40} color={COLORS.ORANGE} style={{ marginBottom: 10 }} />
                <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '800', color: TH.text, marginBottom: 4 }}>
                  {T('streakBreakDontForget')}
                </Text>
                <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 8 }}>
                  {T('streakBreakActiveStreak').replace('{n}', String(currentStreak))}，{T('streakBreakGettingStronger')}
                </Text>
                <Pressable onPress={handleCheckin} style={{
                  paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10,
                  backgroundColor: P,
                }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BODY }}>
                    {T('streakBreakCheckinNow')}
                  </Text>
                </Pressable>
              </>
            )}
            {recovery.state === 'long_absence' && (
              <>
                <Sprout size={40} color={COLORS.GREEN} style={{ marginBottom: 10 }} />
                <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '800', color: TH.text, marginBottom: 4 }}>
                  {T('streakBreakNeverTooLate')}
                </Text>
                <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 8 }}>
                  {T('streakBreakDaysSince').replace('{n}', String(recovery.daysSinceLastCheckin ?? 0))}
                </Text>
                <Pressable onPress={handleCheckin} style={{
                  paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10,
                  backgroundColor: P,
                }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BODY }}>
                    {T('streakBreakCheckinNow')}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </Card>

        {/* Insight Card — hidden when breaks < 3 */}
        {insight.totalBreaks >= 3 && (
          <Card>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text, marginBottom: 14 }}>
              {T('streakBreakInsight')}
            </Text>

            {/* Weekday distribution */}
            <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 8 }}>{T('streakBreakHighDay')}</Text>
            <MiniBarChart values={insight.weekdayDist} labels={weekdayLabels} color={P} th={TH} />

            {/* Stats row */}
            <View style={{ flexDirection: 'row', marginVertical: 14, justifyContent: 'center', gap: 16 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: P }}>{insight.avgStreak}</Text>
                <Text style={{ fontSize: FONT_TINY, color: TH.sub }}>{T('streakBreakAvgStreak')}</Text>
              </View>
              <View style={{ width: 1, backgroundColor: TH.border }} />
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: P }}>{insight.avgRecoveryDays}</Text>
                <Text style={{ fontSize: FONT_TINY, color: TH.sub }}>{T('streakBreakAvgRecovery')}</Text>
              </View>
            </View>

            {/* Monthly trend */}
            <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 8 }}>{T('streakBreakTrend')}</Text>
            <MiniBarChart values={insight.monthlyTrend.map(t => t.count)} labels={monthLabels} color={P} th={TH} />
          </Card>
        )}

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

        {breaks.length === 0 ? (
          <Card>
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <PartyPopper size={32} color={COLORS.GREEN} style={{ marginBottom: 8 }} />
              <Text style={{ fontSize: FONT_BODY, color: TH.sub }}>{T('streakBreakEmpty')}</Text>
            </View>
          </Card>
        ) : (
          <FlatList
            data={breaks}
            renderItem={renderBreakItem}
            keyExtractor={breakKeyExtractor}
            removeClippedSubviews={true}
            scrollEnabled={false}
          />
        )}

        {/* Encouragement Card */}
        {encouragement.length > 0 && (
          <Card>
            {encouragement.map((msg, i) => (
              <Text key={i} style={{
                fontSize: FONT_BODY, color: i === 0 ? TH.text : TH.sub,
                fontWeight: i === 0 ? '600' : '400',
                lineHeight: 24,
              }}>
                {msg}
              </Text>
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MiniBarChart({ values, labels, color, th }: {
  values: number[];
  labels: string[];
  color: string;
  th: { sub: string };
}) {
  const max = Math.max(...values, 1);
  const maxHeight = 36;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: maxHeight + 18 }}>
      {values.map((v, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
          <View style={{
            width: '100%',
            height: (v / max) * maxHeight,
            backgroundColor: v === max && v > 0 ? color : `${color}40`,
            borderRadius: 3,
            minHeight: v > 0 ? 2 : 0,
          }} />
          <Text style={{ fontSize: 10, color: th.sub }}>{labels[i]}</Text>
        </View>
      ))}
    </View>
  );
}
