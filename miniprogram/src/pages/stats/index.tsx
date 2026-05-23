import { View, Text, ScrollView } from '@tarojs/components';
import { useStore } from '../../utils/store';
import { COLORS } from '../../core';
import type { Habit } from '../../core';
import { getPrimaryColor } from '../../utils/theme';
import { useT } from '../../utils/i18n';

export default function StatsPage() {
  const P = getPrimaryColor();
  const store = useStore();
  const T = useT();
  const activeHabits = store.habits.filter((h: Habit) => h.status === 'inProgress').length;
  const totalCal = store.foodLog.reduce((a, f) => a + (f.calories ?? 0), 0);
  const today = new Date();
  const bars: number[] = [];
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const record = (store.checkinHistory ?? []).find((c: any) => c.date === dateStr);
    bars.push(record?.done ? 1 : 0);
    days.push(d.toLocaleDateString('zh-CN', { weekday: 'narrow' }));
  }

  return (
    <ScrollView scrollY style={{ height: '100vh', background: '#0F0A1E', padding: '32rpx' }}>
      <Text style={{ color: '#fff', fontSize: '44rpx', fontWeight: 'bold', display: 'block', marginBottom: '8rpx' }}>{T('statsTitle')}</Text>
      <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block', marginBottom: '32rpx' }}>{T('statsOverview')}</Text>

      {/* 6-grid stats */}
      <View style={{ display: 'flex', flexWrap: 'wrap', gap: '16rpx', marginBottom: '24rpx' }}>
        {[
          { icon: '🔥', l: T('streak'), v: `${store.streak}${T('days')}`, bg: COLORS.ORANGE },
          { icon: '✦', l: T('statsReflections'), v: `${store.reflections.length}${T('fastTimes')}`, bg: P },
          { icon: '⏱', l: T('statsTotalFasting'), v: `${store.fastingHistory.length}${T('fastTimes')}`, bg: COLORS.GREEN },
          { icon: '🍽', l: T('statsFoodLog'), v: `${store.foodLog.length}${T('fastTimes')}`, bg: COLORS.YELLOW },
          { icon: '☯', l: T('statsMeditation'), v: `${store.totalMedMinutes}${T('medMinutes')}`, bg: '#0EA5E9' },
          { icon: '◇', l: T('statsActiveHabits'), v: `${activeHabits}${T('habitDays')}`, bg: COLORS.BLUE },
        ].map(s => (
          <View key={s.l} style={{ width: '48%', background: s.bg, borderRadius: '28rpx', padding: '28rpx 24rpx' }}>
            <Text style={{ fontSize: '44rpx', display: 'block' }}>{s.icon}</Text>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: '44rpx', display: 'block', marginTop: '8rpx' }}>{s.v}</Text>
            <Text style={{ color: 'rgba(255,255,255,.8)', fontSize: '40rpx', display: 'block', marginTop: '4rpx' }}>{s.l}</Text>
          </View>
        ))}
      </View>

      {/* Weekly chart */}
      <View style={{ background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.09)', borderRadius: '28rpx', padding: '28rpx', marginBottom: '24rpx' }}>
        <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block', marginBottom: '28rpx' }}>{T('statsWeekChart')}</Text>
        <View style={{ display: 'flex', alignItems: 'flex-end', gap: '12rpx', height: '280rpx' }}>
          {bars.map((v, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ width: '100%', borderRadius: '12rpx', background: v === 1 ? P : `${P}40`, height: `${v * 220}rpx` }} />
              <Text style={{ color: 'rgba(255,255,255,.4)', fontSize: '40rpx', textAlign: 'center', display: 'block', marginTop: '12rpx' }}>{days[i]}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Premium */}
      <View style={{ background: 'linear-gradient(135deg, #4C1D95, #7C3AED)', borderRadius: '28rpx', padding: '32rpx', marginBottom: '24rpx' }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: '40rpx', display: 'block', marginBottom: '8rpx' }}>{T('statsUpgrade')}</Text>
        <Text style={{ color: 'rgba(255,255,255,.7)', fontSize: '40rpx', display: 'block', marginBottom: '24rpx' }}>{T('statsUpgradeDesc')}</Text>
        <View style={{ alignSelf: 'flex-start', border: '2rpx solid rgba(255,255,255,.4)', borderRadius: '20rpx', padding: '12rpx 28rpx' }}>
          <Text style={{ color: '#fff', fontSize: '40rpx' }}>{T('statsLearnMore')}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

