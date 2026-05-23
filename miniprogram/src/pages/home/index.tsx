import { View, Text, ScrollView, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState, useMemo } from 'react';
import { useStore } from '../../utils/store';
import { useT } from '../../utils/i18n';
import { COLORS, QUICK_FOODS, THEMES } from '../../core';
import type { CheckinRecord } from '../../core';
import { getPrimaryColor } from '../../utils/theme';
import FabButton from '../../components/FabButton';

function computeLongestStreak(history: CheckinRecord[]): number {
  const doneDates = history.filter(c => c.done).map(c => c.date).sort();
  if (doneDates.length === 0) return 0;
  let max = 1, current = 1;
  for (let i = 1; i < doneDates.length; i++) {
    const prev = new Date(doneDates[i - 1]);
    const curr = new Date(doneDates[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) { current++; max = Math.max(max, current); }
    else if (diff > 1) current = 1;
  }
  return max;
}

export default function HomePage() {
  const P = getPrimaryColor();
  const store = useStore();
  const T = useT();
  const themeBg = THEMES[store.theme]?.bg ?? '#0F0A1E';
  const themeCardSolid = THEMES[store.theme]?.cardSolid ?? '#1A1030';
  const locale = store.language === 'zh' ? 'zh-CN' : 'en-US';
  const [showFood, setShowFood] = useState(false);
  const [fn, setFn] = useState('');
  const [fc, setFc] = useState('');
  const [fnote, setFnote] = useState('');
  const [showWG, setShowWG] = useState(false);
  const [wgi, setWgi] = useState(String(store.waterGoal));
  const [showCG, setShowCG] = useState(false);
  const [cgi, setCgi] = useState(String(store.calGoal));

  const totalCal = useMemo(() => store.foodLog.reduce((a, f) => a + (f.calories ?? 0), 0), [store.foodLog]);

  const todayWeight = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayCheckin = (store.checkinHistory ?? []).find((c: CheckinRecord) => c.date === today);
    return todayCheckin?.weight;
  }, [store.checkinHistory]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRecord = (store.checkinHistory ?? []).find((c: CheckinRecord) => c.date === todayStr);
  const bannerState: 'notChecked' | 'notDone' | 'done' = !todayRecord ? 'notChecked' : todayRecord.done ? 'done' : 'notDone';
  const bannerColors: Record<string, string> = { notChecked: '#16A34A', notDone: '#F59E0B', done: '#3B82F6' };
  const bannerSubText: Record<string, string> = { notChecked: T('checkinDoneToday'), notDone: T('checkinModifyNotDone'), done: T('checkinDoneBanner') };
  const bannerBtnText: Record<string, string> = { notChecked: `📋 ${T('openCheckin')}`, notDone: `✏️ ${T('checkinModify')}`, done: `✓ ${T('checkinDoneBanner')}` };

  const savedKcal = useMemo(() => (store.fastingHistory ?? []).reduce((sum, f) => sum + (f.estimatedKcal ?? 0), 0), [store.fastingHistory]);

  const totalCompleted = useMemo(() => (store.checkinHistory ?? []).filter((c: CheckinRecord) => c.done).length, [store.checkinHistory]);
  const longestStreak = useMemo(() => computeLongestStreak(store.checkinHistory ?? []), [store.checkinHistory]);
  const savedMeals = useMemo(() => (store.fastingHistory ?? []).length, [store.fastingHistory]);

  const statsData = useMemo(() => [
    { icon: '📅', label: T('totalCompleted'), value: `${totalCompleted}`, unit: T('days'), bg: COLORS.ORANGE },
    { icon: '🏆', label: T('longestStreak'), value: `${longestStreak}`, unit: T('days'), bg: COLORS.YELLOW },
    { icon: '💪', label: T('savedCalories'), value: `${savedKcal}`, unit: T('kcalUnit'), bg: '#FF8A65' },
    { icon: '🍽', label: T('savedMeals'), value: `${savedMeals}`, unit: T('mealUnit'), bg: COLORS.BLUE },
  ], [totalCompleted, longestStreak, savedKcal, savedMeals, T]);

  const resetFoodForm = () => { setFn(''); setFc(''); setFnote(''); };

  return (
    <ScrollView scrollY style={{ height: '100vh', background: themeBg, padding: '32rpx' }}>
      {/* Header */}
      <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8rpx' }}>
        <View>
          <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', letterSpacing: '6rpx' }}>Egoless Do</Text>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: '52rpx', display: 'block', marginTop: '4rpx' }}>{T('appName')}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx' }}>{T('streak')}</Text>
          <Text style={{ color: P, fontWeight: '800', fontSize: '56rpx' }}>{store.streak} <Text style={{ fontSize: '40rpx' }}>{T('days')} 🔥</Text></Text>
        </View>
      </View>
      <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block', marginBottom: '28rpx' }}>
        {T('today')} · {new Date().toLocaleDateString(locale, { month: 'long', day: 'numeric', weekday: 'short' })}
      </Text>

      {/* Check-in Banner */}
      <View onClick={() => { if (bannerState !== 'done') Taro.navigateTo({ url: '/pages/home/checkin' }); else Taro.showToast({ title: T('checkinDoneBanner'), icon: 'none' }); }}
        style={{ borderRadius: '32rpx', padding: '36rpx', marginBottom: '24rpx', background: bannerColors[bannerState], opacity: bannerState === 'done' ? 0.8 : 1 }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: '40rpx', textAlign: 'center', display: 'block' }}>{T('todayCheckin')}</Text>
        <Text style={{ color: 'rgba(255,255,255,.75)', fontSize: '40rpx', textAlign: 'center', display: 'block', marginTop: '6rpx' }}>{bannerSubText[bannerState]}</Text>
        <View style={{ marginTop: '28rpx', borderRadius: '20rpx', borderWidth: '3rpx', borderColor: 'rgba(255,255,255,.55)', borderStyle: 'solid', padding: '22rpx', background: 'rgba(255,255,255,.18)', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: '40rpx', textAlign: 'center', display: 'block' }}>{bannerBtnText[bannerState]}</Text>
        </View>
      </View>

      {/* Streak Card */}
      <View style={{ background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.09)', borderRadius: '32rpx', padding: '48rpx 32rpx', alignItems: 'center', marginBottom: '24rpx' }}>
        <Text style={{ fontSize: '80rpx', display: 'block', textAlign: 'center' }}>🔷</Text>
        <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block', marginTop: '12rpx', textAlign: 'center' }}>{T('streak')}</Text>
        <Text style={{ color: COLORS.ORANGE, fontWeight: '800', fontSize: '112rpx', display: 'block', textAlign: 'center', lineHeight: '1.2' }}>{store.streak}</Text>
        <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block', textAlign: 'center' }}>{T('days')}</Text>
        <Text style={{ color: 'rgba(255,255,255,.35)', fontSize: '40rpx', display: 'block', marginTop: '16rpx', textAlign: 'center' }}>{T('gracePeriodHint')}</Text>
      </View>

      {/* Stats Grid — 4 cards */}
      <View style={{ display: 'flex', flexWrap: 'wrap', gap: '16rpx', marginBottom: '24rpx' }}>
        {statsData.map(s => (
          <View key={s.label} style={{ width: '48%', background: s.bg, borderRadius: '28rpx', padding: '28rpx', alignItems: 'center' }}>
            <Text style={{ fontSize: '44rpx', display: 'block' }}>{s.icon}</Text>
            <Text style={{ fontSize: '40rpx', color: 'rgba(255,255,255,.8)', display: 'block', textAlign: 'center' }}>{s.label}</Text>
            <Text style={{ fontWeight: '700', color: '#fff', fontSize: '40rpx', display: 'block' }}>{s.value}<Text style={{ fontSize: '40rpx', fontWeight: '400' }}> {s.unit}</Text></Text>
          </View>
        ))}
      </View>

      {/* Water Card */}
      <View style={{ background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.09)', borderRadius: '32rpx', padding: '32rpx', marginBottom: '24rpx' }}>
        <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12rpx' }}>
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: '40rpx' }}>💧 {T('water')}</Text>
          <Text onClick={() => { setWgi(String(store.waterGoal)); setShowWG(true); }} style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx' }}>
            <Text style={{ fontWeight: '600', color: P }}>{store.waterMl}</Text> ml / {store.waterGoal}ml ✏️
          </Text>
        </View>
        <View style={{ height: '12rpx', background: 'rgba(255,255,255,.1)', borderRadius: '6rpx', overflow: 'hidden', marginBottom: '24rpx' }}>
          <View style={{ height: '12rpx', background: COLORS.BLUE, borderRadius: '6rpx', width: `${Math.min(store.waterMl / Math.max(store.waterGoal, 1) * 100, 100)}%` }} />
        </View>
        <View onClick={() => store.addWater(250)} style={{ background: COLORS.BLUE, borderRadius: '20rpx', padding: '24rpx', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: '40rpx', textAlign: 'center', display: 'block' }}>+ 250ml</Text>
        </View>
      </View>

      {/* Calorie Card */}
      <View style={{ background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.09)', borderRadius: '32rpx', padding: '32rpx', marginBottom: '24rpx' }}>
        <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8rpx' }}>
          <Text style={{ color: COLORS.ORANGE, fontWeight: '600', fontSize: '40rpx' }}>🍽 {T('addFood')}</Text>
        </View>
        <View style={{ display: 'flex', alignItems: 'center', gap: '16rpx' }}>
          <Text style={{ fontSize: '44rpx', fontWeight: '700', color: COLORS.ORANGE }}>{totalCal}</Text>
          <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx' }}>/ {store.calGoal} kcal</Text>
          <Text onClick={() => { setCgi(String(store.calGoal)); setShowCG(true); }} style={{ fontSize: '40rpx' }}>✏️</Text>
        </View>
        <View style={{ height: '8rpx', background: 'rgba(255,255,255,.1)', borderRadius: '4rpx', overflow: 'hidden', marginTop: '16rpx' }}>
          <View style={{ height: '8rpx', background: COLORS.ORANGE, borderRadius: '4rpx', width: `${Math.min(totalCal / Math.max(store.calGoal, 1) * 100, 100)}%` }} />
        </View>
      </View>

      {/* Weight Card */}
      <View style={{ background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.09)', borderRadius: '32rpx', padding: '32rpx', marginBottom: '24rpx' }}>
        <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: '40rpx' }}>⚖️ {T('todayWeight')}</Text>
          <View style={{ display: 'flex', alignItems: 'baseline', gap: '8rpx' }}>
            <Text style={{ fontSize: '44rpx', fontWeight: '700', color: P }}>{todayWeight != null ? `${todayWeight}` : '—'}</Text>
            <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx' }}>{T('checkinKg')}</Text>
          </View>
        </View>
      </View>

      {/* Add Food Button */}
      <View onClick={() => { resetFoodForm(); setShowFood(true); }}
        style={{ background: COLORS.ORANGE, borderRadius: '24rpx', padding: '28rpx', alignItems: 'center', marginBottom: '24rpx' }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: '40rpx', textAlign: 'center', display: 'block' }}>+ {T('addFood')}</Text>
      </View>

      {/* Quick Nav */}
      <View style={{ display: 'flex', gap: '16rpx', marginBottom: '32rpx' }}>
        {[
          { icon: '◇', label: T('habits'), page: '/pages/habits/index' },
          { icon: '✦', label: T('reflections'), page: '/pages/reflections/index' },
          { icon: '📊', label: T('stats'), page: '/pages/stats/index' },
        ].map(({ icon, label, page }) => (
          <View key={label} onClick={() => Taro.navigateTo({ url: page })}
            style={{ flex: 1, background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.09)', borderRadius: '28rpx', padding: '28rpx', alignItems: 'center' }}>
            <Text style={{ fontSize: '48rpx', display: 'block', textAlign: 'center' }}>{icon}</Text>
            <Text style={{ color: '#fff', fontSize: '40rpx', display: 'block', textAlign: 'center', marginTop: '8rpx' }}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Add Food Modal */}
      {showFood && (
        <View style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48rpx' }}>
           <View style={{ background: themeCardSolid, borderRadius: '40rpx', padding: '48rpx', width: '100%' }}>
            <Text style={{ fontWeight: '700', fontSize: '40rpx', marginBottom: '32rpx', color: '#fff', display: 'block' }}>{T('addFood')}</Text>
            <View style={{ background: 'rgba(255,255,255,.07)', border: `2rpx solid ${P}`, borderRadius: '20rpx', padding: '20rpx 24rpx', marginBottom: '20rpx' }}>
              <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block', marginBottom: '8rpx' }}>{T('foodName')}</Text>
              <Input value={fn} onInput={e => setFn(e.detail.value)} placeholder={T('notePlaceholder')} placeholderStyle="color:rgba(255,255,255,.3)" style={{ color: '#fff', fontSize: '40rpx' }} />
            </View>
            <View style={{ background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.1)', borderRadius: '20rpx', padding: '20rpx 24rpx', marginBottom: '20rpx' }}>
              <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block', marginBottom: '8rpx' }}>{T('calories') || 'Calories'}</Text>
              <Input type="number" value={fc} onInput={e => setFc(e.detail.value)} placeholder="0" placeholderStyle="color:rgba(255,255,255,.3)" style={{ color: '#fff', fontSize: '40rpx' }} />
            </View>
            <View style={{ background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.1)', borderRadius: '20rpx', padding: '20rpx 24rpx', marginBottom: '20rpx' }}>
              <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block', marginBottom: '8rpx' }}>{T('note') || 'Note'}</Text>
              <Input value={fnote} onInput={e => setFnote(e.detail.value)} placeholder={T('notePlaceholder')} placeholderStyle="color:rgba(255,255,255,.3)" style={{ color: '#fff', fontSize: '40rpx' }} />
            </View>
            <View style={{ display: 'flex', gap: '16rpx', marginBottom: '24rpx' }}>
              {QUICK_FOODS.map(f => (
                <View key={f.name} onClick={() => { setFn(f.name); setFc(String(f.cal)); }} style={{ flex: 1, background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.1)', borderRadius: '16rpx', padding: '16rpx' }}>
                  <Text style={{ color: '#fff', fontSize: '40rpx', display: 'block' }}>{f.name}</Text>
                  <Text style={{ color: P, fontSize: '40rpx', display: 'block', marginTop: '4rpx' }}>{f.calories ?? 0}</Text>
                </View>
              ))}
            </View>
            <View style={{ display: 'flex', gap: '16rpx' }}>
              <View onClick={() => setShowFood(false)} style={{ flex: 1, border: '1rpx solid rgba(255,255,255,.2)', borderRadius: '24rpx', padding: '24rpx', alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,.5)', fontSize: '40rpx', textAlign: 'center', display: 'block' }}>{T('cancel')}</Text>
              </View>
              <View onClick={() => { if (fn) { store.addFoodEntry(fn, +fc || 0, fnote); setShowFood(false); } }}
                style={{ flex: 1, background: COLORS.ORANGE, borderRadius: '24rpx', padding: '24rpx', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: '40rpx', textAlign: 'center', display: 'block' }}>{T('confirm')}</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Water Goal Modal */}
      {showWG && (
        <View style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48rpx' }}>
          <View style={{ background: themeCardSolid, borderRadius: '40rpx', padding: '48rpx', width: '100%', alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', fontSize: '40rpx', marginBottom: '12rpx', color: '#fff', display: 'block' }}>{T('waterGoalSetting')}</Text>
            <Text style={{ fontSize: '40rpx', color: 'rgba(255,255,255,.45)', marginBottom: '32rpx', display: 'block' }}>{T('waterGoalHint')}</Text>
            <View style={{ width: '100%', background: 'rgba(255,255,255,.07)', border: `2rpx solid ${COLORS.BLUE}`, borderRadius: '24rpx', padding: '28rpx', marginBottom: '40rpx' }}>
              <Input type="number" value={wgi} onInput={e => setWgi(e.detail.value)} placeholder="2000" placeholderStyle="color:rgba(255,255,255,.3)" style={{ color: '#fff', fontSize: '44rpx', fontWeight: '700', textAlign: 'center' }} />
            </View>
            <View style={{ display: 'flex', gap: '16rpx', width: '100%' }}>
              <View onClick={() => setShowWG(false)} style={{ flex: 1, border: '1rpx solid rgba(255,255,255,.2)', borderRadius: '24rpx', padding: '24rpx', alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,.5)', fontSize: '40rpx', textAlign: 'center', display: 'block' }}>{T('cancel')}</Text>
              </View>
              <View onClick={() => { store.setWaterGoal(Math.max(500, Math.min(3000, +wgi || 2000))); setShowWG(false); }}
                style={{ flex: 1, background: COLORS.BLUE, borderRadius: '24rpx', padding: '24rpx', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: '40rpx', textAlign: 'center', display: 'block' }}>{T('save')}</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Calorie Goal Modal */}
      {showCG && (
        <View style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48rpx' }}>
          <View style={{ background: themeCardSolid, borderRadius: '40rpx', padding: '48rpx', width: '100%', alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', fontSize: '40rpx', marginBottom: '12rpx', color: '#fff', display: 'block' }}>{T('calGoalSetting')}</Text>
            <Text style={{ fontSize: '40rpx', color: 'rgba(255,255,255,.45)', marginBottom: '32rpx', display: 'block' }}>{T('calGoalHint')}</Text>
            <View style={{ width: '100%', background: 'rgba(255,255,255,.07)', border: `2rpx solid ${COLORS.GREEN}`, borderRadius: '24rpx', padding: '28rpx', marginBottom: '40rpx' }}>
              <Input type="number" value={cgi} onInput={e => setCgi(e.detail.value)} placeholder="2000" placeholderStyle="color:rgba(255,255,255,.3)" style={{ color: '#fff', fontSize: '44rpx', fontWeight: '700', textAlign: 'center' }} />
            </View>
            <View style={{ display: 'flex', gap: '16rpx', width: '100%' }}>
              <View onClick={() => setShowCG(false)} style={{ flex: 1, border: '1rpx solid rgba(255,255,255,.2)', borderRadius: '24rpx', padding: '24rpx', alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,.5)', fontSize: '40rpx', textAlign: 'center', display: 'block' }}>{T('cancel')}</Text>
              </View>
              <View onClick={() => { store.setCalGoal(Math.max(500, Math.min(10000, +cgi || 2000))); setShowCG(false); }}
                style={{ flex: 1, background: COLORS.GREEN, borderRadius: '24rpx', padding: '24rpx', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: '40rpx', textAlign: 'center', display: 'block' }}>{T('save')}</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
    <FabButton />
  );
}

