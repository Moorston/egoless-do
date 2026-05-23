import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useStore } from '../../utils/store';
import { t, COLORS } from '../../core';
import { getPrimaryColor } from '../../utils/theme';

function formatTime(ts?: number, date?: string): string {
  if (ts) {
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  return date ?? '';
}

export default function CheckinHistoryPage() {
  const P = getPrimaryColor();
  const store = useStore();
  const lang = store.language;
  const history = store.checkinHistory ?? [];

  return (
    <ScrollView scrollY style={{ height: '100vh', background: '#0F0A1E', padding: '32rpx' }}>
      {/* Header */}
      <View style={{ display: 'flex', alignItems: 'center', gap: '16rpx', marginBottom: '28rpx' }}>
        <Text onClick={() => Taro.navigateBack()} style={{ color: '#fff', fontSize: '44rpx' }}>←</Text>
        <Text style={{ fontWeight: '700', fontSize: '40rpx', color: '#fff' }}>{t('checkinHistory', lang)}</Text>
      </View>

      {history.length === 0 && (
        <Text style={{ textAlign: 'center', color: 'rgba(255,255,255,.45)', padding: '80rpx 0', fontSize: '40rpx', display: 'block' }}>{t('checkinNoRecords', lang)}</Text>
      )}

      {history.map((h, i) => (
        <View key={i} onClick={() => Taro.navigateTo({ url: `/pages/home/checkin-detail?date=${h.date}` })}
          style={{ background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.09)', borderRadius: '28rpx', padding: '28rpx', marginBottom: '16rpx' }}>
          <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, marginRight: '16rpx' }}>
              <Text style={{ fontWeight: '600', fontSize: '40rpx', color: '#fff', display: 'block' }}>{formatTime(h.timestamp, h.date)}</Text>
              {h.note ? <Text style={{ fontSize: '40rpx', color: 'rgba(255,255,255,.45)', display: 'block', marginTop: '4rpx' }} numberOfLines={1}>{h.note.slice(0, 30)}{h.note.length > 30 ? '...' : ''}</Text> : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <View style={{ paddingHorizontal: '20rpx', paddingVertical: '6rpx', borderRadius: '20rpx', background: h.done ? 'rgba(16,185,129,.15)' : 'rgba(239,68,68,.1)' }}>
                <Text style={{ fontSize: '40rpx', fontWeight: '600', color: h.done ? COLORS.GREEN : COLORS.RED }}>
                  {h.done ? t('checkinDone', lang) : t('checkinNotDone', lang)}
                </Text>
              </View>
              <Text style={{ fontSize: '40rpx', color: 'rgba(255,255,255,.45)', marginTop: '8rpx' }}>{h.streak} {t('checkinStreak', lang)}</Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
