import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import { GLOBAL_USERS, THEMES } from '../../core';
import type { GlobalUser } from '../../core';
import { getPrimaryColor } from '../../utils/theme';
import { useT } from '../../utils/i18n';

const P = getPrimaryColor();
const USERS_WITH_STREAK = GLOBAL_USERS.map(u => ({ ...u, streak: Math.round(u.days * (0.6 + Math.random() * 0.35)) }));

export default function GlobalMapPage() {
  const [sel, setSel] = useState<GlobalUser | null>(null);
  const [showBoard, setShowBoard] = useState(false);
  const T = useT();

  if (showBoard) {
    return <LeaderboardPage users={USERS_WITH_STREAK} onClose={() => setShowBoard(false)} />;
  }

  return (
    <View style={{ background: '#0d1b2a', minHeight: '100vh', position: 'relative' }}>
      {/* User markers */}
      {GLOBAL_USERS.map(u => {
        const left = ((u.lng + 180) / 360) * 100;
        const top = ((90 - u.lat) / 180) * 100;
        return (
          <View key={u.id} onClick={() => setSel(u)} style={{
            position: 'absolute', left: `${left}%`, top: `${top}%`,
            width: '52rpx', height: '52rpx', borderRadius: '26rpx',
            background: u.id === 1 ? P : 'rgba(255,107,53,.9)',
            border: '4rpx solid #fff', alignItems: 'center', justifyContent: 'center', zIndex: 2,
          }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: '40rpx' }}>{u.name[0]}</Text>
          </View>
        );
      })}

      {/* Selected user info */}
      {sel && (
        <View style={{ position: 'absolute', bottom: '160rpx', left: '32rpx', right: '32rpx', background: 'rgba(0,0,0,.85)', borderRadius: '24rpx', padding: '24rpx', zIndex: 3 }}>
          <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <Text style={{ fontWeight: '700', fontSize: '40rpx', color: '#fff', display: 'block' }}>{sel.name}</Text>
              <Text style={{ fontSize: '40rpx', color: 'rgba(255,255,255,.6)', display: 'block', marginTop: '6rpx' }}>{T('checkinHistory')} {sel.days} {T('days')} · {sel.sport}</Text>
              <Text style={{ fontSize: '40rpx', color: 'rgba(255,255,255,.5)', display: 'block', marginTop: '4rpx' }}>{sel.since} {T('startDate')} · {sel.duration}</Text>
            </View>
            <Text onClick={() => setSel(null)} style={{ color: 'rgba(255,255,255,.5)', fontSize: '40rpx' }}>×</Text>
          </View>
        </View>
      )}

      {/* Top overlay */}
      <View style={{ position: 'absolute', top: '24rpx', left: '32rpx', right: '32rpx', display: 'flex', alignItems: 'center', gap: '24rpx', zIndex: 10 }}>
        <Text onClick={() => Taro.navigateBack()} style={{ color: '#fff', fontSize: '40rpx' }}>←</Text>
        <Text style={{ fontSize: '40rpx' }}>🌍</Text>
        <Text style={{ fontWeight: '700', fontSize: '40rpx', color: '#fff' }}>{T('globalPulse')}</Text>
      </View>

      {/* Bottom leaderboard button */}
      <View style={{ position: 'absolute', bottom: '48rpx', left: 0, right: 0, alignItems: 'center', zIndex: 10 }}>
        <View onClick={() => setShowBoard(true)} style={{ paddingHorizontal: '56rpx', paddingVertical: '24rpx', borderRadius: '48rpx', background: `${P}E0` }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: '40rpx' }}>🏆 {T('globalLeaderboard')}</Text>
        </View>
      </View>
    </View>
  );
}

function LeaderboardPage({ users, onClose }: { users: (GlobalUser & { streak: number })[]; onClose: () => void }) {
  const [tab, setTab] = useState(0);
  const T = useT();
  const sorted = tab === 0
    ? [...users].sort((a, b) => b.streak - a.streak)
    : [...users].sort((a, b) => b.days - a.days);

  return (
    <View style={{ background: '#0F0A1E', minHeight: '100vh', padding: '32rpx' }}>
      <View style={{ display: 'flex', alignItems: 'center', gap: '24rpx', marginBottom: '24rpx' }}>
        <Text onClick={onClose} style={{ color: '#fff', fontSize: '40rpx' }}>←</Text>
        <Text style={{ fontWeight: '700', fontSize: '40rpx', color: '#fff' }}>{T('globalLeaderboard')}</Text>
      </View>
      <View style={{ display: 'flex', gap: 0, marginBottom: '24rpx' }}>
        {[T('globalCurrentStreak'), T('globalTotalDays')].map((l, i) => (
          <View key={l} onClick={() => setTab(i)} style={{ flex: 1, paddingVertical: '20rpx', borderRadius: '20rpx', background: tab === i ? P : 'transparent', alignItems: 'center' }}>
            <Text style={{ color: tab === i ? '#fff' : 'rgba(255,255,255,.5)', fontWeight: tab === i ? '700' : '400', fontSize: '40rpx' }}>{l}</Text>
          </View>
        ))}
      </View>
      {sorted.map((u, i) => (
        <View key={u.id} style={{ background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.09)', borderRadius: '32rpx', display: 'flex', alignItems: 'center', gap: '24rpx', padding: '24rpx', marginBottom: '20rpx' }}>
          <View style={{ width: '60rpx', height: '60rpx', borderRadius: '30rpx', background: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : P, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: '40rpx' }}>{i + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '600', fontSize: '40rpx', color: '#fff', display: 'block' }}>{u.name}</Text>
            <Text style={{ fontSize: '40rpx', color: 'rgba(255,255,255,.45)', display: 'block', marginTop: '4rpx' }}>{u.sport} · {u.since}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontWeight: '800', fontSize: '40rpx', color: P }}>{tab === 0 ? u.streak : u.days}</Text>
            <Text style={{ fontSize: '40rpx', color: 'rgba(255,255,255,.45)' }}>{tab === 0 ? T('globalDaysCurrent') : T('globalDaysTotal')}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

