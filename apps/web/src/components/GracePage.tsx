'use client';

import { useState } from 'react';
import { THEMES, COLORS, yesterday, FONT_BODY, FONT_TITLE, FONT_SUB, FONT_BACK } from '@egoless-do/core';
import { useT } from './helpers';
import { useWebStore } from '../store/useWebStore';
import { ChevronLeft, CheckCircle2, Shield, ShieldCheck, Clock } from 'lucide-react';

export default function GracePage({ onClose }: { onClose: () => void }) {
  const store = useWebStore();
  const TH = THEMES[store.theme];
  const P = TH.primary;
  const T = useT();
  const [done, setDone] = useState(false);

  const yStr = yesterday();

  // Fix: properly check if yesterday has a completed checkin record
  const yesterdayRecord = store.checkinHistory?.find((h) => h.date === yStr);
  const yesterdayDone = yesterdayRecord?.done === true;
  const missed = !yesterdayDone;

  const restore = () => {
    store.submitCheckin(true, T('graceSuccess'), yStr);
    store.addGraceRecord(yStr);
    setDone(true);
  };

  const graceCount = (store.graceHistory ?? []).length;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: TH.bg, overflowY: 'auto' }}>
      <div style={{ maxWidth: 390, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ padding: '20px 16px 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: FONT_BACK, cursor: 'pointer' }}>
            <ChevronLeft size={20} />
          </button>
          <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text }}>{T('graceTitle')}</div>
        </div>

        <div style={{ padding: '0 16px' }}>
          {/* Status Card */}
          <div style={{ background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 16, padding: 20, marginBottom: 12 }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              {done ? (
                <div>
                  <ShieldCheck size={48} color={COLORS.GREEN} style={{ marginBottom: 12 }} />
                  <div style={{ fontSize: FONT_TITLE, fontWeight: 700, color: COLORS.GREEN }}>{T('graceSuccess')}</div>
                </div>
              ) : missed ? (
                <div>
                  <Shield size={48} color={P} style={{ marginBottom: 12 }} />
                  <div style={{ fontSize: FONT_TITLE, fontWeight: 700, color: TH.text }}>{T('graceNeedRestore')}</div>
                </div>
              ) : (
                <div>
                  <CheckCircle2 size={48} color={COLORS.GREEN} style={{ marginBottom: 12 }} />
                  <div style={{ fontSize: FONT_TITLE, fontWeight: 700, color: COLORS.GREEN }}>{T('graceNoNeed')}</div>
                </div>
              )}
            </div>

            {/* Yesterday status */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: 14, background: TH.cardSolid, borderRadius: 12, marginBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Clock size={18} color={TH.sub} />
                <div>
                  <div style={{ fontSize: FONT_BODY, fontWeight: 600, color: TH.text }}>{yStr}</div>
                  <div style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('graceYesterday')}</div>
                </div>
              </div>
              <div style={{
                padding: '4px 10px', borderRadius: 8,
                background: missed ? `${COLORS.ORANGE}20` : `${COLORS.GREEN}20`,
              }}>
                <span style={{
                  fontSize: FONT_SUB, fontWeight: 600,
                  color: missed ? COLORS.ORANGE : COLORS.GREEN,
                }}>
                  {missed ? T('graceNotDone') : T('graceDone')}
                </span>
              </div>
            </div>

            {/* Restore button */}
            {!done && missed && (
              <button onClick={restore}
                style={{
                  width: '100%', padding: 14, borderRadius: 12, border: 'none',
                  background: P, color: '#fff', fontWeight: 700, fontSize: FONT_BODY, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                <Shield size={18} color="#fff" />
                {T('graceButton')}
              </button>
            )}

            {!done && !missed && (
              <div style={{ textAlign: 'center', padding: 12 }}>
                <span style={{ fontSize: FONT_BODY, color: TH.sub }}>{T('graceAlreadyDone')}</span>
              </div>
            )}
          </div>

          {/* Stats Card */}
          {graceCount > 0 && (
            <div style={{ background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 16, padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Clock size={18} color={P} />
                  <span style={{ fontSize: FONT_BODY, fontWeight: 600, color: TH.text }}>{T('graceStatsTitle')}</span>
                </div>
                <span style={{ fontSize: FONT_BODY, fontWeight: 700, color: P }}>
                  {graceCount} {T('graceUsedTimes')}
                </span>
              </div>
            </div>
          )}

          {/* Info Card */}
          <div style={{ background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: FONT_BODY, color: TH.sub, lineHeight: 1.7 }}>
              {T('graceDesc')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
