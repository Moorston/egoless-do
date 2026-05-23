import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useStore } from '../../utils/store';
import { getPrimaryColor } from '../../utils/theme';
import { useT } from '../../utils/i18n';

export default function FastHistoryPage() {
  const P = getPrimaryColor();
  const T = useT();
  const store = useStore();

  return (
    <ScrollView scrollY style={{ height: '100vh', background: '#0F0A1E', padding: '32rpx' }}>
      <View style={{ display: 'flex', alignItems: 'center', gap: '16rpx', marginBottom: '28rpx' }}>
        <Text onClick={() => Taro.navigateBack()} style={{ color: '#fff', fontSize: '44rpx' }}>←</Text>
        <Text style={{ fontWeight: '700', fontSize: '40rpx', color: '#fff' }}>{T('fastingHistory')}</Text>
      </View>
      {store.fastingHistory.length === 0 && (
        <Text style={{ color: 'rgba(255,255,255,.45)', textAlign: 'center', display: 'block', marginTop: '120rpx', fontSize: '40rpx' }}>{T('noHistory')}</Text>
      )}
      {store.fastingHistory.map((f, i) => {
        const started = f.startedAt ?? 0;
        const ended = f.endedAt ?? Date.now();
        const durSec = Math.floor((ended - started) / 1000);
        const h = Math.floor(durSec / 3600);
        const m = Math.floor((durSec % 3600) / 60);
        return (
          <View key={f.id ?? i} style={{ background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.09)', borderRadius: '28rpx', padding: '28rpx', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20rpx' }}>
            <View>
              <Text style={{ fontWeight: '600', fontSize: '40rpx', color: '#fff', display: 'block' }}>{new Date(started).toLocaleDateString('zh-CN')}</Text>
              <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block', marginTop: '4rpx' }}>~{f.estimatedKcal ?? 0} kcal</Text>
            </View>
            <Text style={{ fontWeight: '700', color: P, fontSize: '40rpx' }}>{h}h {m}m</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

