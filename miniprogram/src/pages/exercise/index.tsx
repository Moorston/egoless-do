import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import { SPORT_GROUPS, THEMES, t } from '../../core';
import type { SportItem } from '../../core';
import { useStore } from '../../utils/store';
import { getPrimaryColor } from '../../utils/theme';
import FabButton from '../../components/FabButton';

export default function ExercisePage() {
  const P = getPrimaryColor();
  const store = useStore();
  const lang = store.language;
  const TH = THEMES[store.theme];
  const [showOther, setShowOther] = useState(false);

  const startSport = (s: SportItem) => {
    Taro.navigateTo({ url: `/pages/exercise/sport?key=${encodeURIComponent(s.key)}&icon=${encodeURIComponent(s.icon)}&color=${encodeURIComponent(s.color ?? P)}` });
  };

  return (
    <ScrollView scrollY style={{ height: '100vh', background: '#0F0A1E', padding: '32rpx' }}>
      <Text style={{ color: '#fff', fontSize: '44rpx', fontWeight: 'bold', display: 'block', marginBottom: '8rpx' }}>{t('exerciseSelect', lang)}</Text>
      <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block', marginBottom: '32rpx' }}>{t('exerciseSelect', lang)}</Text>
      <Text style={{ fontWeight: '600', fontSize: '40rpx', marginBottom: '24rpx', color: 'rgba(255,255,255,.5)', display: 'block' }}>{t('exerciseSelect', lang)}</Text>

      {[
        { icon: '🚶', label: t('exerciseWalk', lang), key: '行走' },
        { icon: '🏃', label: t('exerciseRun', lang), key: '跑步' },
        { icon: '🚴', label: t('exerciseCycle', lang), key: '骑行' },
        { icon: '🏋', label: t('exerciseOther', lang), more: true },
      ].map(({ icon, label, key: sk, more }) => (
        <View key={label} onClick={() => more ? setShowOther(true) : startSport({ key: sk, icon, color: P })}
          style={{ background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.09)', borderRadius: '32rpx', display: 'flex', alignItems: 'center', gap: '24rpx', padding: '32rpx', marginBottom: '16rpx' }}>
          <Text style={{ fontSize: '64rpx' }}>{icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '600', fontSize: '40rpx', color: '#fff', display: 'block' }}>{label}</Text>
          </View>
          <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx' }}>›</Text>
        </View>
      ))}

      {/* Global exercise */}
      <View onClick={() => Taro.navigateTo({ url: '/pages/home/globalmap' })}
        style={{ background: P, borderRadius: '24rpx', padding: '28rpx', alignItems: 'center', marginTop: '24rpx', marginBottom: '24rpx' }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: '40rpx', textAlign: 'center', display: 'block' }}>🌍 {t('exerciseGlobal', lang)}</Text>
      </View>

      {/* Other sports drawer */}
      {showOther && (
        <View style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}>
          <View style={{ background: '#1A1030', borderRadius: '48rpx 48rpx 0 0', padding: '48rpx 40rpx', width: '100%', maxHeight: '88vh' }}>
            <View style={{ width: '80rpx', height: '8rpx', borderRadius: '4rpx', background: 'rgba(255,255,255,.2)', alignSelf: 'center', marginBottom: '32rpx' }} />
            <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32rpx' }}>
              <Text style={{ fontWeight: '700', fontSize: '40rpx', color: '#fff' }}>{t('exerciseCategory', lang)}</Text>
              <Text onClick={() => setShowOther(false)} style={{ width: '68rpx', height: '68rpx', borderRadius: '34rpx', background: 'rgba(255,255,255,.07)', textAlign: 'center', lineHeight: '68rpx', fontSize: '40rpx', color: '#fff' }}>×</Text>
            </View>
            <ScrollView scrollY style={{ maxHeight: '60vh' }}>
              {SPORT_GROUPS.map(g => (
                <View key={g.group}>
                  <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', fontWeight: '600', paddingVertical: '16rpx', display: 'block' }}>{g.group}</Text>
                  {g.items.map(s => (
                    <View key={s.key} onClick={() => { startSport(s); setShowOther(false); }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingVertical: '26rpx', borderBottom: '1rpx solid rgba(255,255,255,.09)' }}>
                      <View style={{ display: 'flex', alignItems: 'center', gap: '24rpx' }}>
                        <Text style={{ fontSize: '48rpx', width: '72rpx', textAlign: 'center' }}>{s.icon}</Text>
                        <Text style={{ fontSize: '40rpx', color: '#fff' }}>{s.key}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </ScrollView>
    <FabButton />
  );
}

