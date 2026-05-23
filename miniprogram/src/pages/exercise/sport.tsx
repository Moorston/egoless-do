import { View, Text } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useState, useEffect, useRef } from 'react';
import { SPORT_BG_COLORS, fmt, COLORS } from '../../core';
import { getPrimaryColor } from '../../utils/theme';
import { useT } from '../../utils/i18n';

export default function SportPage() {
  const P = getPrimaryColor();
  const T = useT();
  const router = useRouter();
  const sportName = decodeURIComponent(router.params.key ?? '跑步');
  const icon = decodeURIComponent(router.params.icon ?? '🏃');
  const color = decodeURIComponent(router.params.color ?? P);

  const [page, setPage] = useState<'prep' | 'active'>('prep');
  const [sec, setSec] = useState(0);
  const [active, setActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (page === 'active' && active) {
      timerRef.current = setInterval(() => setSec(s => s + 1), 1000);
    } else if (timerRef.current) { clearInterval(timerRef.current); }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [page, active]);

  const bg = SPORT_BG_COLORS[sportName] || color || '#4CAF50';

  if (page === 'active') {
    return (
      <View style={{ flex: 1, background: '#2a2835', minHeight: '100vh' }}>
        <View style={{ padding: '28rpx 40rpx' }}>
          <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1rpx solid rgba(255,255,255,.08)', paddingBottom: '28rpx' }}>
            <View style={{ display: 'flex', alignItems: 'center', gap: '16rpx' }}>
              <Text style={{ fontSize: '40rpx' }}>{icon}</Text>
              <Text style={{ fontSize: '40rpx', fontWeight: '600', color: '#bbb' }}>{sportName}</Text>
            </View>
            <View style={{ display: 'flex', gap: '32rpx' }}>
              <Text style={{ color: '#aaa' }}>❤️</Text>
              <Text style={{ color: '#22C55E' }}>↗</Text>
            </View>
          </View>

          <View style={{ paddingHorizontal: '56rpx', paddingTop: '64rpx' }}>
            <Text style={{ fontSize: '176rpx', fontWeight: '900', color: '#fff', display: 'block' }}>{Math.floor(sec / 60) || 0}</Text>
            <Text style={{ fontSize: '40rpx', color: 'rgba(255,255,255,.45)', display: 'block', marginTop: '12rpx', marginBottom: '96rpx' }}>{T('exerciseTotalBurn')}</Text>
            <View style={{ display: 'flex', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: '76rpx', fontWeight: '800', color: '#fff', display: 'block' }}>{Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}</Text>
                <Text style={{ fontSize: '40rpx', color: 'rgba(255,255,255,.45)', display: 'block', marginTop: '8rpx' }}>{T('exerciseTotalDuration')}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ position: 'absolute', bottom: '96rpx', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '48rpx' }}>
          <View onClick={() => setActive(v => !v)} style={{ width: '152rpx', height: '152rpx', borderRadius: '76rpx', background: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: '56rpx', color: '#333' }}>{active ? '⏸' : '▶'}</Text>
          </View>
          <View onClick={() => Taro.navigateBack()} style={{ width: '104rpx', height: '104rpx', borderRadius: '52rpx', background: 'rgba(255,255,255,.1)', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }}>
            <Text style={{ color: '#fff', fontSize: '40rpx' }}>✕</Text>
          </View>
        </View>
      </View>
    );
  }

  // Prep page
  return (
    <View style={{ flex: 1, background: '#0F0A1E', minHeight: '100vh', padding: '28rpx 40rpx' }}>
      <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingVertical: '24rpx' }}>
        <View style={{ display: 'flex', alignItems: 'center', gap: '16rpx' }}>
          <Text style={{ fontSize: '40rpx' }}>{icon}</Text>
          <Text style={{ fontWeight: '600', fontSize: '40rpx', color: '#fff' }}>{sportName}</Text>
        </View>
        <Text onClick={() => Taro.navigateBack()} style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx' }}>✕</Text>
      </View>

      <View style={{ alignItems: 'center', justifyContent: 'center', minHeight: '1000rpx' }}>
        <View style={{ width: '100%', borderRadius: '36rpx', overflow: 'hidden', height: '520rpx', background: bg, alignItems: 'center', justifyContent: 'center', marginBottom: '32rpx' }}>
          <Text style={{ fontSize: '144rpx' }}>{icon}</Text>
          <View style={{ position: 'absolute', bottom: '24rpx', left: '24rpx', right: '24rpx', background: 'rgba(255,255,255,.85)', borderRadius: '24rpx', padding: '20rpx', display: 'flex', gap: '16rpx' }}>
            <Text style={{ fontSize: '40rpx' }}>💡</Text>
            <Text style={{ fontSize: '40rpx', color: '#333', lineHeight: '1.5', flex: 1 }}>{sportName}{T('exerciseTip')}</Text>
          </View>
        </View>

        <View onClick={() => { setSec(0); setActive(true); setPage('active'); }}
          style={{ width: '100%', height: '128rpx', borderRadius: '64rpx', background: bg, alignItems: 'center', justifyContent: 'center', marginBottom: '24rpx' }}>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: '56rpx', letterSpacing: '4rpx' }}>GO</Text>
        </View>

        <Text onClick={() => Taro.navigateBack()} style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', textAlign: 'center', display: 'block' }}>{T('exerciseBack')}</Text>
      </View>
    </View>
  );
}

