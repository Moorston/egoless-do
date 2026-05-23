'use client';

import { useState } from 'react';
import { THEMES, COLORS, yesterday } from '@egoless-do/core';
import { useT } from './helpers';
import { useWebStore } from '../store/useWebStore';

export default function GracePage({ onClose }: { onClose: () => void }) {
  const store = useWebStore();
  const TH = THEMES[store.theme];
  const P = TH.primary;
  const T = useT();
  const [done, setDone] = useState(false);

  const yStr = yesterday();
  const missed = !store.checkinHistory?.some((h) => h.date === yStr);

  const restore = () => {
    store.submitCheckin(true, T('graceSuccess'), yStr);
    setDone(true);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: TH.bg, overflowY: 'auto' }}>
      <div style={{ maxWidth: 390, margin: '0 auto' }}>
        <div style={{ padding: '20px 16px 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: 20, cursor: 'pointer' }}>←</button>
          <div style={{ fontWeight: 700, fontSize: 18, color: TH.text }}>{T('graceTitle')}</div>
        </div>
        <div style={{ padding: '0 16px' }}>
          <div style={{ background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 16, lineHeight: 1.7, color: TH.sub, marginBottom: 16 }}>
              {T('graceDesc')}
            </div>
            <div style={{ padding: '12px 0', borderBottom: `1px solid ${TH.border}`, marginBottom: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: TH.text, marginBottom: 4 }}>{yStr}（{T('graceYesterday')}）</div>
              <div style={{ fontSize: 16, color: TH.sub }}>{T('checkinSelectStatus')}：{missed ? T('graceNotDone') : T('graceDone')}</div>
            </div>
            {done ? (
              <div style={{ textAlign: 'center', padding: 12, fontSize: 16, color: COLORS.GREEN, fontWeight: 600 }}>✅ {T('graceSuccess')}</div>
            ) : (
              <button onClick={restore} disabled={!missed}
                style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: missed ? P : TH.border, color: '#fff', fontWeight: 700, fontSize: 16, cursor: missed ? 'pointer' : 'default', opacity: missed ? 1 : 0.5 }}>
                {T('graceButton')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
