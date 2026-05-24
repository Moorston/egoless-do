'use client';

import { useState } from 'react';
import { SPORT_GROUPS, THEMES } from '@egoless-do/core';
import type { SportItem } from '@egoless-do/core';
import { useT } from './helpers';
import { useWebStore } from '../store/useWebStore';
import { useOverlay } from './useOverlay';

export default function ExerciseTab() {
  const overlay = useOverlay();
  const store = useWebStore();
  const TH = THEMES[store.theme];
  const P = TH.primary;
  const T = useT();
  const [showOther, setShowOther] = useState(false);

  return (
    <>
      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 12, color: TH.sub }}>{T('exerciseSelect')}</div>
      {[
        { icon: '🚶', label: T('exerciseWalk'), sport: T('exerciseWalk') },
        { icon: '🏃', label: T('exerciseRun'), sport: T('exerciseRun') },
        { icon: '🚴', label: T('exerciseCycle'), sport: T('exerciseCycle') },
        { icon: '🏋', label: T('exerciseOther'), more: true },
      ].map(({ icon, label, sport: sn, more }) => (
        <div key={label} onClick={() => more ? setShowOther(true) : overlay.open('sport', { sport: { key: sn ?? '', icon, color: P } })}
          style={{
            background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 16,
            display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', cursor: 'pointer', marginBottom: 8
          }}>
          <span style={{ fontSize: 32 }}>{icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 16, color: TH.text }}>{label}</div>
          </div>
          <span style={{ color: TH.sub, fontSize: 18 }}>›</span>
        </div>
      ))}

      <button onClick={() => overlay.open('globalMap')} style={{
        width: '100%', marginTop: 12, padding: 14, borderRadius: 12, border: 'none',
        background: P, color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer'
      }}>
        🌍 {T('exerciseGlobal')}
      </button>

      {showOther && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 390, background: TH.cardSolid, borderRadius: '24px 24px 0 0', padding: 24, maxHeight: '88vh', overflowY: 'auto' }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: TH.border, margin: '0 auto 16px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 20, color: TH.text }}>{T('exerciseCategory')}</div>
              <button onClick={() => setShowOther(false)} style={{ width: 34, height: 34, borderRadius: 17, background: TH.card, border: 'none', fontSize: 16, cursor: 'pointer', color: TH.text }}>×</button>
            </div>
            {SPORT_GROUPS.map((g) => (
              <div key={g.group}>
                <div style={{ fontSize: 16, color: TH.sub, fontWeight: 600, padding: '12px 0 6px' }}>{g.group}</div>
                {g.items.map((s) => (
                  <div key={s.key} onClick={() => { overlay.open('sport', { sport: s }); setShowOther(false); }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: `1px solid ${TH.border}`, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 24, width: 36, textAlign: 'center' }}>{s.icon}</span>
                      <span style={{ fontSize: 16, color: TH.text }}>{s.key}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
