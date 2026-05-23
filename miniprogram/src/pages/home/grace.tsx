import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import { useStore } from '../../utils/store';
import { COLORS, yesterday, t } from '../../core';
import { getPrimaryColor } from '../../utils/theme';

export default function GracePage() {
  const P = getPrimaryColor();
  const store = useStore();
  const lang = store.language;
  const [done, setDone] = useState(false);
  const yStr = yesterday();
  const missed = !store.checkinHistory?.some(h => h.date === yStr);

  const restore = () => {
    store.submitCheckin(true, t('graceSuccess', lang), yStr);
    setDone(true);
  };

  return (
    <ScrollView scrollY style={{ height: '100vh', background: '#0F0A1E', padding: '32rpx' }}>
      <View style={{ display: 'flex', alignItems: 'center', gap: '16rpx', marginBottom: '28rpx' }}>
        <Text onClick={() => Taro.navigateBack()} style={{ color: '#fff', fontSize: '44rpx' }}>←</Text>
        <Text style={{ fontWeight: '700', fontSize: '40rpx', color: '#fff' }}>{t('graceTitle', lang)}</Text>
      </View>

      <View style={{ background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.09)', borderRadius: '32rpx', padding: '32rpx' }}>
        <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', lineHeight: '1.7', display: 'block', marginBottom: '32rpx' }}>
          {t('graceDesc', lang)}
        </Text>
        <View style={{ padding: '24rpx 0', borderBottom: '1rpx solid rgba(255,255,255,.09)', marginBottom: '24rpx' }}>
          <Text style={{ fontSize: '40rpx', fontWeight: '600', color: '#fff', display: 'block', marginBottom: '8rpx' }}>{yStr}（{t('graceYesterday', lang)}）</Text>
          <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block' }}>{t('checkinSelectStatus', lang)}：{missed ? t('graceNotDone', lang) : t('graceDone', lang)}</Text>
        </View>
        {done ? (
          <Text style={{ textAlign: 'center', padding: '24rpx', fontSize: '40rpx', color: COLORS.GREEN, fontWeight: '600', display: 'block' }}>✅ {t('graceSuccess', lang)}</Text>
        ) : (
          <View onClick={restore} style={{ background: missed ? P : 'rgba(128,128,128,.2)', borderRadius: '24rpx', padding: '28rpx', alignItems: 'center', opacity: missed ? 1 : 0.5 }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: '40rpx', textAlign: 'center', display: 'block' }}>{t('graceButton', lang)}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

