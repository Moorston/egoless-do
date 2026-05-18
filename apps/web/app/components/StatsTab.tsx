'use client';

import { useAppStore } from '@egoless/core';
import { useTheme, useT, cs } from './helpers';

export default function StatsTab() {
  const reflections = useAppStore((s) => s.reflections);
  const totalMedMin = useAppStore((s) => s.totalMedMin);
  const habits = useAppStore((s) => s.habits);
  const streak = useAppStore((s) => s.streak);
  const { TH, P } = useTheme();
  const T = useT();
  const activeHabits = habits.filter((h) => h.status === 'inProgress').length;

  const statsItems = [
    { label: T('streak'), value: `${streak} ${T('days')}`, icon: '🔥' },
    { label: '感念总数', value: `${reflections.length} 条`, icon: '✦' },
    { label: T('totalFasting'), value: '48h', icon: '⏱' },
    { label: T('totalExercise'), value: '5 次', icon: '🏃' },
    { label: '冥想时长', value: `${totalMedMin} 分`, icon: '☯' },
    { label: '活跃习惯', value: `${activeHabits} 个`, icon: '◇' },
  ];

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        {statsItems.map((s, i) => (
          <div key={i} style={{ ...cs(TH), padding: 14 } as React.CSSProperties}>
            <div style={{ fontSize: 20 }}>{s.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: TH.text }}>{s.value}</div>
            <div style={{ fontSize: 13, color: TH.sub, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={cs(TH)}>
        <div style={{ fontSize: 13, color: TH.sub, marginBottom: 12 }}>本周完成情况</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 60 }}>
          {[0.8, 1, 0.6, 1, 0.9, 0.4, 0.7].map((v, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: '100%', background: v === 1 ? P : `${P}40`, height: v * 50, borderRadius: 4 }} />
              <span style={{ fontSize: 9, color: TH.sub }}>{'一二三四五六日'[i]}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: `linear-gradient(135deg,#4C1D95,${P})`, borderRadius: 16, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{T('premiumTitle')}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', marginTop: 2 }}>{T('premiumSub')}</div>
        </div>
        <button style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,.3)', background: 'rgba(255,255,255,.15)', color: '#fff', fontSize: 12, cursor: 'pointer' }}>{T('learnMore')}</button>
      </div>
    </>
  );
}
