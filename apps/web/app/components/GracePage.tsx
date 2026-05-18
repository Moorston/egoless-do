'use client';

import { useState } from 'react';
import { useAppStore, GREEN } from '@egoless/core';
import { useTheme, useT, cs } from './helpers';

export default function GracePage({ onClose }: { onClose: () => void }) {
  const addCheckin = useAppStore((s) => s.addCheckin);
  const checkinHistory = useAppStore((s) => s.checkinHistory);
  const { TH, P } = useTheme();
  const T = useT();
  const [done, setDone] = useState(false);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);
  const missed = !checkinHistory.some((h) => h.date === yStr);

  const restore = () => {
    addCheckin({ date: yStr, done: true, note: '宽限期补卡', streak: 5 });
    setDone(true);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: TH.bg, overflowY: 'auto' }}>
      <div style={{ maxWidth: 390, margin: '0 auto' }}>
        <div style={{ padding: '20px 16px 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: 20, cursor: 'pointer' }}>←</button>
          <div style={{ fontWeight: 700, fontSize: 18, color: TH.text }}>{T('graceRestore')}</div>
        </div>
        <div style={{ padding: '0 16px' }}>
          <div style={{ ...cs(TH), padding: 16 } as React.CSSProperties}>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: TH.sub, marginBottom: 16 }}>
              宽限期机制：中断1天内补打卡，连胜不断。<br />
              昨天未打卡，今天可以补卡：
            </div>
            <div style={{ padding: '12px 0', borderBottom: `1px solid ${TH.border}`, marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: TH.text, marginBottom: 4 }}>{yStr}（昨天）</div>
              <div style={{ fontSize: 13, color: TH.sub }}>状态：{missed ? '未打卡' : '已打卡'}</div>
            </div>
            {done ? (
              <div style={{ textAlign: 'center', padding: 12, fontSize: 14, color: GREEN, fontWeight: 600 }}>✅ 已补卡成功！</div>
            ) : (
              <button onClick={restore} disabled={!missed}
                style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: missed ? P : TH.border, color: '#fff', fontWeight: 700, fontSize: 15, cursor: missed ? 'pointer' : 'default', opacity: missed ? 1 : 0.5 }}>
                ✓ 补打卡（1天宽限期）
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
