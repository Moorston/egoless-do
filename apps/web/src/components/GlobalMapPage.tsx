'use client';

import { useState } from 'react';
import { GLOBAL_USERS } from '@egoless-do/core';
import type { GlobalUser } from '@egoless-do/core';
import { useT, useTheme } from './helpers';

const USERS_WITH_STREAK = GLOBAL_USERS.map((u) => ({
  ...u,
  streak: Math.round(u.days * (0.6 + Math.random() * 0.35)),
}));

export default function GlobalMapPage({ onClose }: { onClose: () => void }) {
  const { TH, P } = useTheme();
  const [sel, setSel] = useState<GlobalUser | null>(null);
  const [showBoard, setShowBoard] = useState(false);
  const T = useT();

  if (showBoard) {
    return <LeaderboardPage users={USERS_WITH_STREAK} onClose={() => setShowBoard(false)} />;
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#000', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <iframe title="gmap" src="https://www.openstreetmap.org/export/embed.html?bbox=-180,-85,180,85&layer=mapnik"
          style={{ width: '100%', height: '100%', border: 'none', position: 'absolute', inset: 0 }} scrolling="no" />
        {GLOBAL_USERS.map((u) => (
          <button key={u.id} onClick={() => setSel(u)}
            style={{ position: 'absolute', left: `${((u.lng + 180) / 360) * 100}%`, top: `${((90 - u.lat) / 180) * 100}%`,
              transform: 'translate(-50%,-50%)', width: 26, height: 26, borderRadius: 13,
              background: u.id === 1 ? P : 'rgba(255,107,53,.9)', border: '2px solid #fff', cursor: 'pointer',
              fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, zIndex: 2 }}>
            {u.name[0]}
          </button>
        ))}
        {sel && (
          <div style={{ position: 'absolute', bottom: 80, left: 16, right: 16, background: 'rgba(0,0,0,.85)', borderRadius: 12, padding: 12, zIndex: 3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>{sel.name}</div>
                <div style={{ fontSize: 16, color: 'rgba(255,255,255,.6)', marginTop: 3 }}>{T('checkinHistory')} {sel.days} {T('days')} · {sel.sport}</div>
                <div style={{ fontSize: 16, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{sel.since} {T('startDate')} · {sel.duration}</div>
              </div>
              <button onClick={() => setSel(null)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,.5)', fontSize: 18, cursor: 'pointer' }}>×</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(180deg,rgba(0,0,0,.6),transparent)', zIndex: 10 }}>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>←</button>
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <span style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>{T('globalPulse')}</span>
      </div>

      <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
        <button onClick={() => setShowBoard(true)}
          style={{ padding: '12px 28px', borderRadius: 24, border: 'none', background: `${P}E0`, color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer', boxShadow: `0 4px 20px ${P}60`, backdropFilter: 'blur(8px)' }}>
          🏆 {T('globalLeaderboard')}
        </button>
      </div>
    </div>
  );
}

function LeaderboardPage({ users, onClose }: { users: (GlobalUser & { streak: number })[]; onClose: () => void }) {
  const [tab, setTab] = useState(0);
  const T = useT();
  const { TH, P } = useTheme();

  const sorted = tab === 0
    ? [...users].sort((a, b) => b.streak - a.streak)
    : [...users].sort((a, b) => b.days - a.days);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: TH.bg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 16px 10px', display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1, flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: 20, cursor: 'pointer' }}>←</button>
        <div style={{ fontWeight: 700, fontSize: 18, color: TH.text }}>{T('globalLeaderboard')}</div>
      </div>

      <div style={{ display: 'flex', gap: 0, padding: '0 16px', marginBottom: 12, flexShrink: 0, position: 'relative', zIndex: 1 }}>
        {[T('globalCurrentStreak'), T('globalTotalDays')].map((l, i) => (
          <button key={l} onClick={() => setTab(i)}
            style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: tab === i ? P : 'transparent', color: tab === i ? '#fff' : TH.sub, fontWeight: tab === i ? 700 : 400, fontSize: 16 }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 16px', flex: 1, overflowY: 'auto', position: 'relative', zIndex: 1 }}>
        {sorted.map((u, i) => (
          <div key={u.id} style={{ background: TH.card, borderRadius: 16, marginBottom: 10, border: `1px solid ${TH.border}`, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
            <div style={{ width: 30, height: 30, borderRadius: 15,
              background: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : P,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 16, color: TH.text }}>{u.name}</div>
              <div style={{ fontSize: 16, color: TH.sub, marginTop: 2 }}>{u.sport} · {u.since}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: P }}>{tab === 0 ? u.streak : u.days}</div>
              <div style={{ fontSize: 16, color: TH.sub }}>{tab === 0 ? T('globalDaysCurrent') : T('globalDaysTotal')}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
