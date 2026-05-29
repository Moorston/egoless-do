'use client';

import { THEMES, FONT_BODY, FONT_TITLE, FONT_BACK } from '@egoless-do/core';
import { useWebStore } from '../store/useWebStore';
import { useT } from './helpers';
import { ChevronLeft } from 'lucide-react';

export default function FastHistoryPage({ onClose }: { onClose: () => void }) {
  const store = useWebStore();
  const TH = THEMES[store.theme];
  const P = TH.primary;
  const T = useT();
  const fastHistory = store.fastingHistory;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: TH.bg, overflowY: 'auto' }}>
      <div style={{ maxWidth: 390, margin: '0 auto' }}>
        <div style={{ padding: '20px 16px 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: FONT_BACK, cursor: 'pointer' }}><ChevronLeft size={20} /></button>
          <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text }}>{T('fastingHistory')}</div>
        </div>
        <div style={{ padding: '0 16px' }}>
          {fastHistory.length === 0 && (
            <div style={{ textAlign: 'center', color: TH.sub, padding: '40px 0', fontSize: FONT_BODY }}>{T('noHistory')}</div>
          )}
          {fastHistory.map((f, i) => {
            const started = f.startedAt ?? 0;
            const ended = f.endedAt ?? Date.now();
            const durSec = Math.floor((ended - started) / 1000);
            const h = Math.floor(durSec / 3600);
            const m = Math.floor((durSec % 3600) / 60);
            return (
              <div key={i} style={{
                background: TH.card, borderRadius: 16, padding: 14, marginBottom: 10,
                border: `1px solid ${TH.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: FONT_BODY, color: TH.text }}>
                    {new Date(started).toLocaleDateString('zh-CN')}
                  </div>
                  <div style={{ fontSize: FONT_BODY, color: TH.sub, marginTop: 2 }}>
                    ~{f.estimatedKcal ?? 0} kcal
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: P, fontSize: FONT_BODY }}>{h}h {m}m</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
