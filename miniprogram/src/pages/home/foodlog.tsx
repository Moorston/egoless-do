import { View, Text, ScrollView, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState, useMemo } from 'react';
import { useStore } from '../../utils/store';
import { COLORS, QUICK_FOODS, t } from '../../core';
import { getPrimaryColor } from '../../utils/theme';

export default function FoodLogPage() {
  const P = getPrimaryColor();
  const store = useStore();
  const lang = store.language;
  const [showAdd, setShowAdd] = useState(false);
  const [fn, setFn] = useState('');
  const [fc, setFc] = useState('');
  const [fnote, setFnote] = useState('');
  const totalCal = useMemo(() => store.foodLog.reduce((a, f) => a + (f.calories ?? 0), 0), [store.foodLog]);

  return (
    <ScrollView scrollY style={{ height: '100vh', background: '#0F0A1E', padding: '32rpx' }}>
      <View style={{ display: 'flex', alignItems: 'center', gap: '16rpx', marginBottom: '28rpx' }}>
        <Text onClick={() => Taro.navigateBack()} style={{ color: '#fff', fontSize: '44rpx' }}>←</Text>
        <View>
          <Text style={{ fontWeight: '700', fontSize: '44rpx', color: '#fff', display: 'block' }}>{t('foodTitle', lang)}</Text>
          <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block' }}>{new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}</Text>
        </View>
      </View>

      {/* Calorie overview */}
      <View style={{ background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.09)', borderRadius: '32rpx', padding: '40rpx', alignItems: 'center', marginBottom: '24rpx' }}>
        <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block', marginBottom: '16rpx' }}>{t('foodTodayKcal', lang)}</Text>
        <View style={{ display: 'flex', alignItems: 'baseline', gap: '16rpx' }}>
          <Text style={{ fontSize: '84rpx', fontWeight: '800', color: COLORS.ORANGE }}>{totalCal}</Text>
          <Text style={{ fontSize: '40rpx', color: 'rgba(255,255,255,.45)' }}>/ {store.calGoal}</Text>
        </View>
        <Text style={{ color: COLORS.GREEN, fontSize: '40rpx', display: 'block', marginTop: '12rpx' }}>{t('foodRemaining', lang)}: {Math.max(0, store.calGoal - totalCal)} kcal</Text>
      </View>

      {/* Food list */}
      <View style={{ background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.09)', borderRadius: '32rpx', padding: '32rpx', marginBottom: '24rpx' }}>
        {store.foodLog.length === 0 ? (
          <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', textAlign: 'center', display: 'block', padding: '48rpx' }}>{t('foodEmpty', lang)}</Text>
        ) : (
          store.foodLog.map((f, i) => (
            <View key={f.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '16rpx 0', borderBottom: i < store.foodLog.length - 1 ? '1rpx solid rgba(255,255,255,.09)' : 'none' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', fontSize: '40rpx', color: '#fff', display: 'block' }}>{f.name}</Text>
                {f.note ? <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block' }}>{f.note}</Text> : null}
              </View>
              <Text style={{ fontWeight: '700', color: P, fontSize: '40rpx' }}>{f.calories ?? 0} kcal</Text>
            </View>
          ))
        )}
      </View>

      <View onClick={() => setShowAdd(true)} style={{ background: COLORS.ORANGE, borderRadius: '24rpx', padding: '28rpx', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: '40rpx', textAlign: 'center', display: 'block' }}>+ {t('foodAdd', lang)}</Text>
      </View>

      {/* Add Food Modal */}
      {showAdd && (
        <View style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48rpx' }}>
          <View style={{ background: '#1A1030', borderRadius: '40rpx', padding: '48rpx', width: '100%' }}>
            <Text style={{ fontWeight: '700', fontSize: '40rpx', marginBottom: '32rpx', color: '#fff', display: 'block' }}>{t('foodAddTitle', lang)}</Text>
            <View style={{ background: 'rgba(255,255,255,.07)', border: `2rpx solid ${P}`, borderRadius: '20rpx', padding: '20rpx 24rpx', marginBottom: '20rpx' }}>
              <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block', marginBottom: '8rpx' }}>{t('foodName', lang)}</Text>
              <Input value={fn} onInput={e => setFn(e.detail.value)} placeholder={t('foodName', lang)} style={{ color: '#fff', fontSize: '40rpx' }} />
            </View>
            <View style={{ background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.1)', borderRadius: '20rpx', padding: '20rpx 24rpx', marginBottom: '20rpx' }}>
              <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block', marginBottom: '8rpx' }}>{t('calories', lang) || '卡路里'}</Text>
              <Input type="number" value={fc} onInput={e => setFc(e.detail.value)} placeholder="0" style={{ color: '#fff', fontSize: '40rpx' }} />
            </View>
            <View style={{ background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.1)', borderRadius: '20rpx', padding: '20rpx 24rpx', marginBottom: '20rpx' }}>
              <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block', marginBottom: '8rpx' }}>{t('note', lang) || '备注'}</Text>
              <Input value={fnote} onInput={e => setFnote(e.detail.value)} placeholder={t('notePlaceholder', lang)} style={{ color: '#fff', fontSize: '40rpx' }} />
            </View>
            <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block', marginBottom: '16rpx' }}>{t('foodQuickAdd', lang)}</Text>
            <View style={{ display: 'flex', flexWrap: 'wrap', gap: '12rpx', marginBottom: '32rpx' }}>
              {QUICK_FOODS.map(f => (
                <View key={f.name} onClick={() => { setFn(f.name); setFc(String(f.cal)); }}
                  style={{ padding: '16rpx 24rpx', borderRadius: '16rpx', border: '1rpx solid rgba(255,255,255,.2)' }}>
                  <Text style={{ color: '#fff', fontSize: '40rpx', display: 'block' }}>{f.name}</Text>
                  <Text style={{ color: P, fontSize: '40rpx', display: 'block', marginTop: '4rpx' }}>{f.calories ?? 0}</Text>
                </View>
              ))}
            </View>
            <View style={{ display: 'flex', gap: '16rpx' }}>
              <View onClick={() => setShowAdd(false)} style={{ flex: 1, border: '1rpx solid rgba(255,255,255,.2)', borderRadius: '24rpx', padding: '24rpx', alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,.5)', fontSize: '40rpx', textAlign: 'center', display: 'block' }}>{t('commonCancel', lang)}</Text>
              </View>
              <View onClick={() => { if (fn) { store.addFoodEntry(fn, +fc || 0, fnote); setShowAdd(false); } }}
                style={{ flex: 1, background: COLORS.ORANGE, borderRadius: '24rpx', padding: '24rpx', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: '40rpx', textAlign: 'center', display: 'block' }}>{t('foodConfirm', lang)}</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

