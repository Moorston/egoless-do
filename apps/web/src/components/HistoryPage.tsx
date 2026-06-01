'use client';

import { useState } from 'react';
import { THEMES, COLORS, FONT_BODY, FONT_TITLE, FONT_BACK, formatTime } from '@egoless-do/core';
import { useT } from './helpers';
import { useWebStore } from '../store/useWebStore';
import { useOverlay } from './useOverlay';
import { ChevronLeft } from 'lucide-react';

export default function HistoryPage({ onClose }: { onClose: () => void }) {
  const store = useWebStore();
  const TH = THEMES[store.theme];
  const T = useT();
  const overlay = useOverlay();
  const checkinHistory = store.checkinHistory || [];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: TH.bg, overflowY: 'auto' }}>
      <div style={{ maxWidth: 390, margin: '0 auto' }}>
        <div style={{ padding: '20px 16px 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: FONT_BACK, cursor: 'pointer' }}><ChevronLeft size={20} /></button>
          <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text }}>{T('checkinHistory')}</div>
        </div>
        <div style={{ padding: '0 16px' }}>
          {checkinHistory.length === 0 && (
            <div style={{ textAlign: 'center', color: TH.sub, padding: '40px 0', fontSize: FONT_BODY }}>{T('checkinNoRecords')}</div>
          )}
          {checkinHistory.map((h, i) => (
            <div key={i} onClick={() => overlay.open('checkinDetail', { checkinDetailDate: h.date })} style={{
              background: TH.card, borderRadius: 16, padding: 14, marginBottom: 10,
              border: `1px solid ${TH.border}`, cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: FONT_BODY, color: TH.text }}>{formatTime(h.timestamp, h.date)}</div>
                  {h.note && <div style={{ fontSize: FONT_BODY, color: TH.sub, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.note.slice(0, 30)}{h.note.length > 30 ? '...' : ''}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, marginLeft: 10 }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 10, fontSize: FONT_BODY, fontWeight: 600,
                    background: h.done ? 'rgba(16,185,129,.15)' : 'rgba(239,68,68,.1)',
                    color: h.done ? COLORS.GREEN : COLORS.RED
                  }}>
                    {h.done ? T('checkinDone') : T('checkinNotDone')}
                  </span>
                  <span style={{ fontSize: FONT_BODY, color: TH.sub }}>{h.streak} {T('checkinStreak')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
