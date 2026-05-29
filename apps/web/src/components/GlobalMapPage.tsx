'use client';

import { useState, useCallback } from 'react';
import { GLOBAL_USERS, FONT_TITLE, FONT_SUB, FONT_BACK, FONT_STAT_CARD, FONT_BODY, FONT_BUTTON, FONT_STAT_SECTION } from '@egoless-do/core';
import { useT, useTheme } from './helpers';
import AmapContainer from './AmapContainer';
import { Globe, X, Trophy, ChevronLeft, Flame } from 'lucide-react';

const USERS_WITH_STREAK = GLOBAL_USERS.map((u) => ({
  ...u,
  streak: Math.round(u.days * (0.6 + Math.random() * 0.35)),
  online: Math.random() > 0.4,
}));

export default function GlobalMapPage({ onClose, title, icon }: { onClose: () => void; title?: string; icon?: string }) {
  const { TH, P } = useTheme();
  const [sel, setSel] = useState<typeof USERS_WITH_STREAK[0] | null>(null);
  const [showBoard, setShowBoard] = useState(false);
  const T = useT();
  const pageTitle = title ?? T('globalPulse');
  const pageIcon = icon ?? 'Globe';

  const onlineCount = USERS_WITH_STREAK.filter(u => u.online).length;

  const handleMapReady = useCallback((map: any) => {
    GLOBAL_USERS.forEach((u) => {
      const color = u.id === 1 ? P : 'rgba(255,107,53,.9)';
      const isOnline = USERS_WITH_STREAK.find(x => x.id === u.id)?.online;

      // Pulse ring
      const pulse = new (window as any).AMap.CircleMarker({
        center: [u.lng, u.lat],
        radius: 20,
        fillColor: color,
        fillOpacity: 0.3,
        strokeColor: 'transparent',
        cursor: 'pointer',
        zIndex: 1,
      });
      map.add(pulse);

      // Animate pulse with CSS
      const pulseEl = pulse.getExtData?.() || pulse.getContent?.();
      // Use DOM-based animation after marker renders
      setTimeout(() => {
        const els = document.querySelectorAll('.amap-marker');
        // We'll use the main marker click instead
      }, 500);

      // Main marker
      const marker = new (window as any).AMap.CircleMarker({
        center: [u.lng, u.lat],
        radius: 10,
        fillColor: color,
        fillOpacity: 0.9,
        strokeColor: '#fff',
        strokeWeight: 2,
        cursor: 'pointer',
        zIndex: 2,
      });
      marker.on('click', () => setSel({ ...u, streak: USERS_WITH_STREAK.find(x => x.id === u.id)?.streak ?? u.days, online: isOnline ?? false }));
      map.add(marker);

      // Online indicator
      if (isOnline) {
        const onlineDot = new (window as any).AMap.CircleMarker({
          center: [u.lng, u.lat],
          radius: 4,
          fillColor: '#22C55E',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 1,
          zIndex: 3,
        });
        map.add(onlineDot);
      }
    });

    // Add connecting arcs between nearby users
    for (let i = 0; i < GLOBAL_USERS.length; i++) {
      for (let j = i + 1; j < GLOBAL_USERS.length; j++) {
        const a = GLOBAL_USERS[i], b = GLOBAL_USERS[j];
        const dist = Math.sqrt((a.lng - b.lng) ** 2 + (a.lat - b.lat) ** 2);
        if (dist < 50) {
          const midLng = (a.lng + b.lng) / 2;
          const midLat = (a.lat + b.lat) / 2 + dist * 0.15;
          const polyline = new (window as any).AMap.Polyline({
            path: [[a.lng, a.lat], [midLng, midLat], [b.lng, b.lat]],
            strokeColor: `${P}30`,
            strokeWeight: 1.5,
            lineJoin: 'round',
            lineCap: 'round',
            zIndex: 0,
          });
          map.add(polyline);
        }
      }
    }
  }, [P]);

  if (showBoard) {
    return <LeaderboardPage users={USERS_WITH_STREAK} onClose={() => setShowBoard(false)} />;
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#0a0f1e', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <AmapContainer
          center={[105, 20]}
          zoom={2}
          style={{ position: 'absolute', inset: 0 }}
          onMapReady={handleMapReady}
        />

        {/* Selected user card */}
        {sel && (
          <div style={{
            position: 'absolute', bottom: 100, left: 16, right: 16, maxWidth: 390, margin: '0 auto',
            background: 'rgba(10,15,30,.92)', borderRadius: 16, padding: 16, zIndex: 3,
            border: '1px solid rgba(255,255,255,.1)', backdropFilter: 'blur(12px)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 22,
                  background: sel.id === 1 ? P : 'rgba(255,107,53,.9)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ color: '#fff', fontWeight: 800, fontSize: FONT_TITLE }}>{sel.name[0]}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: FONT_TITLE, color: '#fff' }}>{sel.name}</span>
                    {sel.online && <span style={{ width: 8, height: 8, borderRadius: 4, background: '#22C55E', display: 'inline-block' }} />}
                  </div>
                  <div style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)', marginTop: 3 }}>{sel.sport} · {sel.duration}</div>
                </div>
              </div>
              <button onClick={() => setSel(null)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,.5)', fontSize: FONT_TITLE, cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', marginTop: 14, gap: 8 }}>
              <div style={{ flex: 1, background: 'rgba(255,255,255,.06)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
                <div style={{ fontSize: FONT_STAT_CARD, fontWeight: 800, color: '#FF6B35' }}>{sel.streak}</div>
                <div style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>{T('globalCurrentStreak')}</div>
              </div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,.06)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
                <div style={{ fontSize: FONT_STAT_CARD, fontWeight: 800, color: P }}>{sel.days}</div>
                <div style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>{T('globalDaysTotal')}</div>
              </div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,.06)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
                <div style={{ fontSize: FONT_SUB, fontWeight: 700, color: 'rgba(255,255,255,.7)' }}>{sel.since}</div>
                <div style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>{T('startDate')}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'linear-gradient(180deg,rgba(10,15,30,.85),transparent)', zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: FONT_BACK, cursor: 'pointer' }}><ChevronLeft size={20} /></button>
          <span style={{ fontSize: FONT_BACK }}><Globe size={20} /></span>
          <span style={{ fontWeight: 700, fontSize: FONT_BODY, color: '#fff' }}>{pageTitle}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(34,197,94,.15)', borderRadius: 12, padding: '5px 10px' }}>
          <span style={{ width: 7, height: 7, borderRadius: 3.5, background: '#22C55E', display: 'inline-block' }} />
          <span style={{ fontSize: FONT_SUB, color: '#22C55E', fontWeight: 600 }}>{onlineCount} online</span>
        </div>
      </div>

      {/* Bottom button */}
      <div style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
        <button onClick={() => setShowBoard(true)}
          style={{
            padding: '14px 28px', borderRadius: 28, border: 'none',
            background: `${P}E0`, color: '#fff', fontWeight: 700, fontSize: FONT_BUTTON, cursor: 'pointer',
            boxShadow: `0 4px 20px ${P}60`, backdropFilter: 'blur(8px)',
          }}>
          <Trophy size={16} style={{verticalAlign:'middle',marginRight:4}} />{T('globalLeaderboard')}
        </button>
      </div>

      {/* CSS pulse animation */}
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ── Leaderboard ──
function LeaderboardPage({ users, onClose }: { users: typeof USERS_WITH_STREAK; onClose: () => void }) {
  const [tab, setTab] = useState(0);
  const T = useT();
  const { TH, P } = useTheme();

  const sorted = tab === 0
    ? [...users].sort((a, b) => b.streak - a.streak)
    : [...users].sort((a, b) => b.days - a.days);

  const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: TH.bg, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 10px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: FONT_BACK, cursor: 'pointer' }}><ChevronLeft size={20} /></button>
        <div style={{ fontWeight: 700, fontSize: FONT_BACK, color: TH.text }}><Trophy size={20} style={{verticalAlign:'middle',marginRight:4}} />{T('globalLeaderboard')}</div>
      </div>

      {/* Top 3 podium */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', padding: '16px 16px 20px', gap: 8 }}>
        {[1, 0, 2].map(rank => {
          const u = sorted[rank];
          if (!u) return null;
          const isFirst = rank === 0;
          const heights = [140, 110, 90];
          const sizes = [56, 44, 40];
          return (
            <div key={u.id} style={{ textAlign: 'center', flex: isFirst ? 1.2 : 1 }}>
              <div style={{
                width: sizes[rank], height: sizes[rank], borderRadius: sizes[rank] / 2,
                background: medalColors[rank],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '3px solid rgba(255,255,255,.3)', margin: '0 auto 8px',
              }}>
                <span style={{ color: '#fff', fontWeight: 900, fontSize: isFirst ? FONT_STAT_CARD : FONT_TITLE }}>{u.name[0]}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: isFirst ? FONT_BODY : FONT_SUB, color: TH.text }} title={u.name}>
                {u.name}
              </div>
              <div style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 2 }}>
                {tab === 0 ? <>{u.streak} <Flame size={12} style={{verticalAlign:'middle'}} /></> : `${u.days} ${T('days')}`}
              </div>
              <div style={{
                width: '100%', height: heights[rank], borderRadius: 12,
                background: `${medalColors[rank]}30`,
                marginTop: 8, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 10,
              }}>
                <span style={{ fontSize: FONT_STAT_SECTION, fontWeight: 900, color: medalColors[rank] }}>{rank + 1}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tab switch */}
      <div style={{ display: 'flex', padding: '0 16px', marginBottom: 12, gap: 8, flexShrink: 0 }}>
        {[T('globalCurrentStreak'), T('globalDaysTotal')].map((l, i) => (
          <button key={l} onClick={() => setTab(i)}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: tab === i ? P : TH.card, color: tab === i ? '#fff' : TH.sub,
              fontWeight: tab === i ? 700 : 500, fontSize: FONT_BODY,
              outline: tab === i ? 'none' : `1px solid ${TH.border}`,
            }}>
            {l}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ padding: '0 16px 30px', flex: 1 }}>
        {sorted.map((u, i) => (
          <div key={u.id} style={{
            background: TH.card, borderRadius: 14, marginBottom: 8,
            border: `1px solid ${TH.border}`,
            display: 'flex', alignItems: 'center', gap: 12, padding: 14,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 14,
              background: i < 3 ? medalColors[i] : P,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: FONT_SUB }}>{i + 1}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 600, fontSize: FONT_BODY, color: TH.text }}>{u.name}</span>
                {u.online && <span style={{ width: 6, height: 6, borderRadius: 3, background: '#22C55E', display: 'inline-block' }} />}
              </div>
              <div style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 2 }}>{u.sport} · {u.since}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 800, fontSize: FONT_TITLE, color: i < 3 ? medalColors[i] : P }}>
                {tab === 0 ? u.streak : u.days}
              </div>
              <div style={{ fontSize: FONT_SUB, color: TH.sub }}>{tab === 0 ? T('globalDaysCurrent') : T('globalDaysTotal')}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
