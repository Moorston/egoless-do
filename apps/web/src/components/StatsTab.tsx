'use client';

import { useTheme, useT, cs } from './helpers';
import { useWebStore } from '../store/useWebStore';

export default function StatsTab() {
  const store = useWebStore();
  const { TH, P } = useTheme();
  const T = useT();
  const activeHabits = store.habits.filter((h) => h.status === 'inProgress').length;

  const totalFastHours = (() => {
    const totalSec = store.fastingHistory.reduce((sum, f) => {
      if (f.endedAt && f.startedAt) return sum + (f.endedAt - f.startedAt) / 1000;
      return sum;
    }, 0);
    return Math.round(totalSec / 3600);
  })();

  const statsItems = [
    { label: T('streak'), value: `${store.streak} ${T('days')}`, icon: '🔥' },
    { label: T('statsReflections'), value: `${store.reflections.length} ${T('fastTimes')}`, icon: '✦' },
    { label: T('totalFasting'), value: `${totalFastHours}h`, icon: '⏱' },
    { label: T('statsFoodLog'), value: `${store.foodLog.length} ${T('fastTimes')}`, icon: '🍽' },
    { label: T('statsMeditation'), value: `${store.totalMedMinutes} ${T('medMinutes')}`, icon: '☯' },
    { label: T('statsActiveHabits'), value: `${activeHabits} ${T('habitDays')}`, icon: '◇' },
  ];

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        {statsItems.map((s, i) => (
          <div key={i} style={{ ...cs(TH), padding: 14 } as React.CSSProperties}>
            <div style={{ fontSize: 20 }}>{s.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: TH.text }}>{s.value}</div>
            <div style={{ fontSize: 16, color: TH.sub, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={cs(TH)}>
        <div style={{ fontSize: 16, color: TH.sub, marginBottom: 12 }}>{T('statsWeekChart')}</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 60 }}>
          {(() => {
            const today = new Date();
            const items = [];
            for (let i = 6; i >= 0; i--) {
              const d = new Date(today);
              d.setDate(d.getDate() - i);
              const dateStr = d.toISOString().slice(0, 10);
              const record = store.checkinHistory.find(c => c.date === dateStr);
              const v = record?.done ? 1 : 0;
              const label = d.toLocaleDateString(store.language === 'zh' ? 'zh-CN' : 'en-US', { weekday: 'narrow' });
              items.push(
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: '100%', background: v === 1 ? P : `${P}40`, height: v * 50, borderRadius: 4 }} />
                  <span style={{ fontSize: 9, color: TH.sub }}>{label}</span>
                </div>
              );
            }
            return items;
          })()}
        </div>
      </div>

      <div style={{ background: `linear-gradient(135deg,#4C1D95,${P})`, borderRadius: 16, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{T('premiumTitle')}</div>
          <div style={{ fontSize: 16, color: 'rgba(255,255,255,.6)', marginTop: 2 }}>{T('premiumSub')}</div>
        </div>
        <button style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,.3)', background: 'rgba(255,255,255,.15)', color: '#fff', fontSize: 16, cursor: 'pointer' }}>{T('learnMore')}</button>
      </div>
    </>
  );
}
