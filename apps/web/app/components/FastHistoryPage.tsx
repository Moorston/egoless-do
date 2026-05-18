'use client';

import { useAppStore } from '@egoless/core';
import { useTheme, useT } from './helpers';

export default function FastHistoryPage({ onClose }: { onClose: () => void }) {
  const fastHistory = useAppStore((s) => s.fastHistory);
  const { TH, P } = useTheme();
  const T = useT();

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: TH.bg, overflowY: 'auto' }}>
      <div style={{ maxWidth: 390, margin: '0 auto' }}>
        <div style={{ padding: '20px 16px 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: 20, cursor: 'pointer' }}>←</button>
          <div style={{ fontWeight: 700, fontSize: 18, color: TH.text }}>{T('fastingHistory')}</div>
        </div>
        <div style={{ padding: '0 16px' }}>
          {fastHistory.length === 0 && <div style={{ textAlign: 'center', color: TH.sub, padding: '40px 0', fontSize: 13 }}>{T('noHistory')}</div>}
          {fastHistory.map((f, i) => (
            <div key={i} style={{ background: TH.card, borderRadius: 16, padding: 14, marginBottom: 10, border: `1px solid ${TH.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, color: TH.text }}>{f.date}</div>
                <div style={{ fontSize: 13, color: TH.sub, marginTop: 2 }}>约 {f.kcal} kcal</div>
              </div>
              <div style={{ fontWeight: 700, color: P, fontSize: 15 }}>{f.dur}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
