import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { getCurrentInstance } from '@tarojs/taro';
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

export default function CheckinDetailPage() {
  const P = getPrimaryColor();
  const store = useStore();
  const lang = store.language;
  const date = getCurrentInstance().router?.params?.date ?? '';
  const record = (store.checkinHistory ?? []).find((c: any) => c.date === date);

  if (!record) {
    return (
      <ScrollView scrollY style={{ height: '100vh', background: '#0F0A1E', padding: '32rpx' }}>
        <View style={{ display: 'flex', alignItems: 'center', gap: '16rpx', marginBottom: '28rpx' }}>
          <Text onClick={() => Taro.navigateBack()} style={{ color: '#fff', fontSize: '44rpx' }}>←</Text>
        </View>
        <Text style={{ textAlign: 'center', color: 'rgba(255,255,255,.45)', padding: '80rpx 0', fontSize: '40rpx', display: 'block' }}>{t('checkinNoRecords', lang)}</Text>
      </ScrollView>
    );
  }

  const detailRows = [
    { label: t('checkinTime', lang), value: formatTime(record.timestamp, record.date) },
    { label: t('checkinStatus', lang), value: record.done ? t('checkinDone', lang) : t('checkinNotDone', lang), color: record.done ? COLORS.GREEN : COLORS.RED },
    { label: t('checkinStreak', lang), value: `${record.streak} ${t('days', lang)}` },
    ...(record.weight != null ? [{ label: t('todayWeight', lang), value: `${record.weight} ${t('checkinKg', lang)}` }] : []),
  ];

  return (
    <ScrollView scrollY style={{ height: '100vh', background: '#0F0A1E', padding: '32rpx' }}>
      {/* Header */}
      <View style={{ display: 'flex', alignItems: 'center', gap: '16rpx', marginBottom: '28rpx' }}>
        <Text onClick={() => Taro.navigateBack()} style={{ color: '#fff', fontSize: '44rpx' }}>←</Text>
        <Text style={{ fontWeight: '700', fontSize: '40rpx', color: '#fff' }}>{t('checkinDetailTitle', lang)}</Text>
      </View>

      {/* Status card */}
      <View style={{
        background: record.done ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.08)',
        borderRadius: '32rpx', padding: '40rpx', marginBottom: '24rpx', alignItems: 'center',
      }}>
        <Text style={{ fontSize: '72rpx', display: 'block', marginBottom: '16rpx' }}>{record.done ? '✅' : '📝'}</Text>
        <Text style={{ fontWeight: '700', fontSize: '40rpx', color: record.done ? COLORS.GREEN : COLORS.RED, display: 'block' }}>
          {record.done ? t('checkinDone', lang) : t('checkinNotDone', lang)}
        </Text>
        <Text style={{ fontSize: '40rpx', color: 'rgba(255,255,255,.45)', display: 'block', marginTop: '8rpx' }}>{formatTime(record.timestamp, record.date)}</Text>
      </View>

      {/* Detail rows */}
      <View style={{ background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.09)', borderRadius: '28rpx', padding: '0 32rpx', marginBottom: '24rpx' }}>
        {detailRows.map((r, i) => (
          <View key={r.label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            paddingVertical: '26rpx', borderBottom: i === detailRows.length - 1 ? 'none' : '1rpx solid rgba(255,255,255,.09)',
          }}>
            <Text style={{ fontSize: '40rpx', color: 'rgba(255,255,255,.45)' }}>{r.label}</Text>
            <Text style={{ fontSize: '40rpx', fontWeight: '600', color: (r as any).color ?? '#fff' }}>{r.value}</Text>
          </View>
        ))}
      </View>

      {/* Note */}
      {record.note ? (
        <View style={{ background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.09)', borderRadius: '28rpx', padding: '32rpx', marginBottom: '60rpx' }}>
          <Text style={{ fontSize: '40rpx', color: 'rgba(255,255,255,.45)', display: 'block', marginBottom: '16rpx' }}>{t('checkinContent', lang)}</Text>
          <Text style={{ fontSize: '40rpx', color: '#fff', lineHeight: '44rpx', display: 'block' }}>{record.note}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
