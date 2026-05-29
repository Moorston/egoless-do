'use client';

import { useMemo } from 'react';
import { THEMES, COLORS, detectStreakBreaks, computeLongestStreak, FONT_BACK, FONT_TITLE, FONT_STAT_SECTION, FONT_SUB, FONT_BODY, FONT_BADGE, FONT_STAT_CARD } from '@egoless-do/core';
import { useT } from './helpers';
import { useWebStore } from '../store/useWebStore';
import { ChevronLeft, PartyPopper, ArrowRight } from 'lucide-react';

export default function StreakBreakPage({ onClose }: { onClose: () => void }) {
  const store = useWebStore();
  const TH = THEMES[store.theme];
  const P = TH.primary;
  const T = useT();

  const breaks = useMemo(() => detectStreakBreaks(store.checkinHistory ?? []), [store.checkinHistory]);
  const longestStreak = useMemo(() => computeLongestStreak(store.checkinHistory ?? []), [store.checkinHistory]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: TH.bg, overflowY: 'auto' }}>
      <div style={{ maxWidth: 390, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ padding: '20px 16px 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: FONT_BACK, cursor: 'pointer' }}><ChevronLeft size={20} /></button>
          <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text }}>{T('streakBreakTitle')}</div>
        </div>

        <div style={{ padding: '0 16px' }}>
          {/* Stats summary */}
          <div style={{
            background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 16,
            padding: 16, marginBottom: 12, display: 'flex', gap: 16,
          }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: FONT_STAT_SECTION, fontWeight: 800, color: '#EF4444' }}>{breaks.length}</div>
              <div style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 4 }}>{T('streakBreakTotal')}</div>
            </div>
            <div style={{ width: 1, background: TH.border }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: FONT_STAT_SECTION, fontWeight: 800, color: COLORS.GREEN }}>{longestStreak}</div>
              <div style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 4 }}>{T('days')}</div>
            </div>
          </div>

          {/* Break list */}
          {breaks.length === 0 ? (
            <div style={{
              background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 16,
              padding: 32, textAlign: 'center',
            }}>
              <div style={{ fontSize: FONT_STAT_CARD, marginBottom: 8 }}><PartyPopper size={32} /></div>
              <div style={{ fontSize: FONT_BODY, color: TH.sub }}>{T('streakBreakEmpty')}</div>
            </div>
          ) : (
            breaks.map((b, i) => (
              <div key={i} style={{
                background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 16,
                padding: 16, marginBottom: 10,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: FONT_BODY, fontWeight: 600, color: TH.text }}>
                    {b.breakDate}
                  </div>
                  <div style={{
                    background: '#EF444420', color: '#EF4444', fontSize: FONT_BADGE, fontWeight: 600,
                    padding: '3px 10px', borderRadius: 8,
                  }}>
                    -{b.lostStreak} {T('streakBreakDays')}
                  </div>
                </div>
                <div style={{ fontSize: FONT_SUB, color: TH.sub }}>
                  {T('streakBreakRange')}：{b.startDate} <ArrowRight size={13} style={{verticalAlign:'middle'}} /> {b.breakDate}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
