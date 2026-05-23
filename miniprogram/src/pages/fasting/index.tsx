import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useStore } from '../../utils/store';
import { useT } from '../../utils/i18n';
import { fmt, estimateFastKcal, FASTING_DURATIONS, COLORS } from '../../core';
import { getPrimaryColor } from '../../utils/theme';
import FabButton from '../../components/FabButton';

export default function FastingPage() {
  const P = getPrimaryColor();
  const store = useStore();
  const T = useT();
  const [elapsed, setElapsed] = useState(0);
  const [showDur, setShowDur] = useState(false);
  const [tmpDur, setTmpDur] = useState(8);
  const [agreed, setAgreed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isActive = !!store.activeFasting;

  useEffect(() => {
    if (store.activeFasting) {
      const el = Math.floor((Date.now() - store.activeFasting.startedAt) / 1000);
      setElapsed(el);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } else { if (timerRef.current) clearInterval(timerRef.current); setElapsed(0); }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive]);

  const pct = useMemo(() => store.activeFasting ? Math.min(elapsed / (store.activeFasting.targetHours * 3600), 1) : 0, [store.activeFasting, elapsed]);
  const kcal = useMemo(() => estimateFastKcal(elapsed), [elapsed]);

  const totalFastHours = useMemo(() => {
    const totalSec = store.fastingHistory.reduce((sum, f) => {
      const s = f.startedAt ?? 0; const e = f.endedAt ?? 0;
      return sum + (e > 0 ? (e - s) / 1000 : 0);
    }, 0);
    return Math.round(totalSec / 3600);
  }, [store.fastingHistory]);

  const longestStreak = useMemo(() => {
    if (!store.fastingHistory.length) return 0;
    const dates = [...new Set(store.fastingHistory.map(f => new Date(f.startedAt ?? 0).toISOString().slice(0, 10)))].sort().reverse();
    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
      if (Math.abs((new Date(dates[i - 1]).getTime() - new Date(dates[i]).getTime()) / 86400000 - 1) < 0.1) streak++; else break;
    }
    return streak;
  }, [store.fastingHistory]);

  const statsData = useMemo(() => [
    { icon: '⏳', label: T('fastTotal'), value: `${store.fastingHistory.length} ${T('fastTimes')}`, bg: '#EF9A9A' },
    { icon: '⏰', label: T('fastTotalHours'), value: `${totalFastHours} ${T('fastHours')}`, bg: COLORS.GREEN },
    { icon: '🔥', label: T('fastStreak'), value: `${store.streak} ${T('days')}`, bg: '#FF8A65' },
    { icon: '🏆', label: T('fastLongest'), value: `${longestStreak} ${T('days')}`, bg: '#9C27B0' },
  ], [store.fastingHistory.length, store.streak, totalFastHours, longestStreak]);

  return (
    <ScrollView scrollY style={{ height: '100vh', background: '#0F0A1E', padding: '32rpx' }}>
      <Text style={{ color: '#fff', fontSize: '44rpx', fontWeight: 'bold', display: 'block', marginBottom: '8rpx' }}>{T('fasting')}</Text>
      <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block', marginBottom: '32rpx' }}>{T('fasting')}</Text>

      {/* Main card */}
      <View style={{ background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.09)', borderRadius: '32rpx', padding: '48rpx 32rpx', alignItems: 'center', marginBottom: '24rpx' }}>
        {isActive ? (
          <>
            <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block', textAlign: 'center', marginBottom: '12rpx' }}>{T('fastTarget')} {store.activeFasting!.targetHours}h</Text>
            <Text style={{ color: P, fontSize: '96rpx', fontWeight: 'bold', display: 'block', textAlign: 'center', letterSpacing: '-4rpx', margin: '16rpx 0' }}>{fmt(elapsed)}</Text>
            <View style={{ width: '100%', height: '12rpx', background: 'rgba(255,255,255,.1)', borderRadius: '6rpx', overflow: 'hidden', marginBottom: '8rpx' }}>
              <View style={{ height: '12rpx', background: COLORS.GREEN, borderRadius: '6rpx', width: `${pct * 100}%` }} />
            </View>
            <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', textAlign: 'center', display: 'block', marginBottom: '32rpx' }}>
              {T('fastActive')} 🔥 {Math.round(pct * 100)}%
            </Text>
            <View onClick={() => store.stopFasting()} style={{ width: '100%', background: COLORS.RED, borderRadius: '24rpx', padding: '28rpx', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: '40rpx', textAlign: 'center', display: 'block' }}>{T('stopFasting')}</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block', textAlign: 'center', marginBottom: '12rpx' }}>{T('fastTarget')}</Text>
            <Text onClick={() => { setTmpDur(8); setAgreed(false); setShowDur(true); }} style={{ color: COLORS.ORANGE, fontWeight: '800', fontSize: '76rpx', display: 'block', textAlign: 'center' }}>{tmpDur}h <Text style={{ fontSize: '40rpx', color: 'rgba(255,255,255,.45)' }}>▼</Text></Text>
            <View style={{ display: 'flex', gap: '16rpx', marginTop: '32rpx', width: '100%' }}>
              <View onClick={() => { setTmpDur(tmpDur); setAgreed(false); setShowDur(true); }} style={{ flex: 1, background: COLORS.GREEN, borderRadius: '24rpx', padding: '28rpx', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: '40rpx', textAlign: 'center', display: 'block' }}>{T('startFasting')}</Text>
              </View>
              <View onClick={() => store.startFasting(8)} style={{ flex: 1, border: `2rpx solid ${COLORS.ORANGE}`, borderRadius: '24rpx', padding: '28rpx', alignItems: 'center' }}>
                <Text style={{ color: COLORS.ORANGE, fontWeight: '600', fontSize: '40rpx', textAlign: 'center', display: 'block' }}>{T('quickStart')}</Text>
              </View>
            </View>
          </>
        )}
      </View>

      {/* Global fasting */}
      <View onClick={() => Taro.navigateTo({ url: '/pages/home/globalmap' })}
        style={{ background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.09)', borderRadius: '32rpx', display: 'flex', alignItems: 'center', gap: '16rpx', padding: '24rpx', marginBottom: '24rpx' }}>
        <Text style={{ fontSize: '40rpx' }}>🌍</Text>
        <Text style={{ color: '#fff', fontSize: '40rpx', flex: 1 }}>{T('globalFasting')}</Text>
        <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx' }}>›</Text>
      </View>

      {/* History entry */}
      <View onClick={() => Taro.navigateTo({ url: '/pages/fasting/history' })}
        style={{ background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.09)', borderRadius: '32rpx', display: 'flex', alignItems: 'center', gap: '16rpx', padding: '24rpx', marginBottom: '24rpx' }}>
        <Text style={{ fontSize: '40rpx' }}>⏱</Text>
        <Text style={{ color: '#fff', fontSize: '40rpx', flex: 1 }}>{T('fastingHistory')}</Text>
        <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx' }}>›</Text>
      </View>

      {/* Stats */}
      <Text style={{ fontWeight: '600', fontSize: '40rpx', marginBottom: '20rpx', color: '#fff', display: 'block' }}>{T('fastYourStats')}</Text>
      <View style={{ display: 'flex', flexWrap: 'wrap', gap: '16rpx', marginBottom: '24rpx' }}>
        {statsData.map(s => (
          <View key={s.label} style={{ width: '48%', background: s.bg, borderRadius: '28rpx', padding: '32rpx 24rpx', alignItems: 'center' }}>
            <Text style={{ fontSize: '52rpx', display: 'block' }}>{s.icon}</Text>
            <Text style={{ fontSize: '40rpx', color: 'rgba(255,255,255,.85)', textAlign: 'center', display: 'block' }}>{s.label}</Text>
            <Text style={{ fontWeight: '700', color: '#fff', fontSize: '40rpx', display: 'block' }}>{s.value}</Text>
          </View>
        ))}
      </View>

      {/* Realtime kcal */}
      <View style={{ display: 'flex', gap: '16rpx', marginBottom: '24rpx' }}>
        <View style={{ flex: 1, background: COLORS.ORANGE, borderRadius: '28rpx', padding: '32rpx 24rpx', alignItems: 'center' }}>
          <Text style={{ fontSize: '52rpx', display: 'block' }}>🔥</Text>
          <Text style={{ fontSize: '40rpx', color: 'rgba(255,255,255,.85)', textAlign: 'center', display: 'block' }}>{T('fastKcalSaved')}</Text>
          <Text style={{ fontWeight: '700', color: '#fff', fontSize: '40rpx', display: 'block' }}>{kcal} <Text style={{ fontSize: '40rpx', fontWeight: '400' }}>kcal</Text></Text>
        </View>
        <View style={{ flex: 1, background: COLORS.GREEN, borderRadius: '28rpx', padding: '32rpx 24rpx', alignItems: 'center' }}>
          <Text style={{ fontSize: '52rpx', display: 'block' }}>⚖️</Text>
          <Text style={{ fontSize: '40rpx', color: 'rgba(255,255,255,.85)', textAlign: 'center', display: 'block' }}>{T('fastWeightLoss')}</Text>
          <Text style={{ fontWeight: '700', color: '#fff', fontSize: '40rpx', display: 'block' }}>{(kcal / 7700).toFixed(2)} <Text style={{ fontSize: '40rpx', fontWeight: '400' }}>{T('fastKg')}</Text></Text>
        </View>
      </View>

      {/* Health tips */}
      <View style={{ background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.09)', borderRadius: '32rpx', padding: '32rpx', marginBottom: '24rpx' }}>
        <View style={{ display: 'flex', alignItems: 'center', gap: '16rpx', marginBottom: '20rpx' }}>
          <Text style={{ fontSize: '40rpx' }}>⚠️</Text>
          <Text style={{ fontWeight: '700', fontSize: '40rpx', color: COLORS.YELLOW }}>{T('healthWarning')}</Text>
        </View>
        {[T('fastTips'), T('fastTip2'), T('fastTip3'), T('fastTip4')].map((tip, i) => (
          <View key={i} style={{ display: 'flex', gap: '16rpx', marginBottom: '12rpx' }}>
            <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx' }}>•</Text>
            <Text style={{ fontSize: '40rpx', color: 'rgba(255,255,255,.45)', lineHeight: '1.5' }}>{tip}</Text>
          </View>
        ))}
      </View>

      {/* Duration picker modal */}
      {showDur && (
        <View style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48rpx' }}>
          <View style={{ background: '#1A1030', borderRadius: '40rpx', padding: '48rpx', width: '100%' }}>
            <Text style={{ fontWeight: '700', fontSize: '40rpx', textAlign: 'center', marginBottom: '40rpx', color: '#fff', display: 'block' }}>{T('fastSelectDuration')}</Text>
            <View style={{ display: 'flex', flexWrap: 'wrap', gap: '16rpx', justifyContent: 'center', marginBottom: '40rpx' }}>
              {[1, 2, 4, 6, 8, 10, 12].map(d => (
                <View key={d} onClick={() => setTmpDur(d)} style={{ width: '140rpx', paddingVertical: '24rpx', borderRadius: '24rpx', alignItems: 'center', background: tmpDur === d ? P : 'rgba(255,255,255,.07)' }}>
                  <Text style={{ fontWeight: '700', fontSize: '40rpx', color: tmpDur === d ? '#fff' : 'rgba(255,255,255,.5)', textAlign: 'center', display: 'block' }}>{d}h</Text>
                </View>
              ))}
            </View>
            <View style={{ background: 'rgba(255,248,200,.08)', borderRadius: '24rpx', padding: '24rpx', marginBottom: '32rpx', display: 'flex', gap: '16rpx' }}>
              <Text>⚠️</Text>
              <View>
                <Text style={{ fontWeight: '600', fontSize: '40rpx', color: '#FCD34D', display: 'block', marginBottom: '8rpx' }}>{T('fastWarmTitle')}</Text>
                <Text style={{ fontSize: '40rpx', color: 'rgba(255,255,255,.45)', display: 'block' }}>{T('fastWarmText')}</Text>
              </View>
            </View>
            <View onClick={() => setAgreed(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '16rpx', marginBottom: '32rpx' }}>
              <View style={{ width: '36rpx', height: '36rpx', borderRadius: '8rpx', border: `4rpx solid ${agreed ? P : 'rgba(255,255,255,.2)'}`, background: agreed ? P : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {agreed && <Text style={{ color: '#fff', fontSize: '40rpx' }}>✓</Text>}
              </View>
              <Text style={{ fontSize: '40rpx', color: '#fff' }}>{T('fastAgree')}</Text>
            </View>
            <View style={{ display: 'flex', gap: '16rpx' }}>
              <View onClick={() => setShowDur(false)} style={{ flex: 1, border: '1rpx solid rgba(255,255,255,.2)', borderRadius: '24rpx', padding: '24rpx', alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,.5)', fontSize: '40rpx', textAlign: 'center', display: 'block' }}>{T('cancel')}</Text>
              </View>
              <View onClick={() => { if (agreed) { store.startFasting(tmpDur); setShowDur(false); } }}
                style={{ flex: 1, background: agreed ? P : 'rgba(128,128,128,.2)', borderRadius: '24rpx', padding: '24rpx', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: '40rpx', textAlign: 'center', display: 'block' }}>{T('start')}</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
    <FabButton />
  );
}

