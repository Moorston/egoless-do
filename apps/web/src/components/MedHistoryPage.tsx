'use client';

import { THEMES } from '@egoless-do/core';
import { useWebStore } from '../store/useWebStore';
import { useT } from './helpers';

export default function MedHistoryPage({ onClose }: { onClose: () => void }) {
  const store = useWebStore();
  const TH = THEMES[store.theme];
  const P = TH.primary;
  const T = useT();
  const medHistory = store.medHistory || [];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: TH.bg, overflowY: 'auto' }}>
      <div style={{ maxWidth: 390, margin: '0 auto' }}>
        <div style={{ padding: '20px 16px 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: 20, cursor: 'pointer' }}>←</button>
          <div style={{ fontWeight: 700, fontSize: 18, color: TH.text }}>{T('meditationHistory')}</div>
        </div>
        <div style={{ padding: '0 16px' }}>
          {medHistory.length === 0 && (
            <div style={{ textAlign: 'center', color: TH.sub, padding: '40px 0', fontSize: 16 }}>{T('noHistory')}</div>
          )}
          {medHistory.map((m, i) => (
            <div key={i} style={{
              background: TH.card, borderRadius: 16, padding: 14, marginBottom: 10,
              border: `1px solid ${TH.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16, color: TH.text }}>{m.date}</div>
                <div style={{ fontSize: 16, color: TH.sub, marginTop: 2 }}>{m.mood}</div>
              </div>
              <div style={{ fontWeight: 700, color: P, fontSize: 16 }}>{m.dur}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
