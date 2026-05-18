'use client';

import { useAppStore, GREEN, RED } from '@egoless/core';
import { useTheme, useT } from './helpers';

export default function HistoryPage({ onClose }: { onClose: () => void }) {
  const checkinHistory = useAppStore((s) => s.checkinHistory);
  const { TH } = useTheme();
  const T = useT();

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: TH.bg, overflowY: 'auto' }}>
      <div style={{ maxWidth: 390, margin: '0 auto' }}>
        <div style={{ padding: '20px 16px 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: 20, cursor: 'pointer' }}>←</button>
          <div style={{ fontWeight: 700, fontSize: 18, color: TH.text }}>打卡历史</div>
        </div>
        <div style={{ padding: '0 16px' }}>
          {checkinHistory.length === 0 && <div style={{ textAlign: 'center', color: TH.sub, padding: '40px 0', fontSize: 13 }}>{T('noHistory')}</div>}
          {checkinHistory.map((h, i) => (
            <div key={i} style={{ background: TH.card, borderRadius: 16, padding: 14, marginBottom: 10, border: `1px solid ${TH.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: TH.text }}>{h.date}</div>
                  {h.note && <div style={{ fontSize: 13, color: TH.sub, marginTop: 2 }}>{h.note}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span style={{ padding: '3px 10px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: h.done ? 'rgba(16,185,129,.15)' : 'rgba(239,68,68,.1)', color: h.done ? GREEN : RED }}>
                    {h.done ? '已完成' : '未完成'}
                  </span>
                  <span style={{ fontSize: 13, color: TH.sub }}>连续 {h.streak} 天</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
