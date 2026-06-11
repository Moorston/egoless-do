'use client';

import { useState, useMemo, useCallback } from 'react';
import { THEMES, COLORS, yesterday, dateStr, FONT_BODY, FONT_TITLE, FONT_SUB, FONT_BACK, FONT_TINY, getMonthGraceCount, getRemainingGrace, isGraceAvailable } from '@egoless-do/core';
import { useT } from './helpers';
import { useWebStore } from '../store/useWebStore';
import { useOverlay } from './useOverlay';
import { ChevronLeft, CheckCircle2, Shield, ShieldCheck, Clock, Calendar, Settings } from 'lucide-react';

export default function GracePage({ onClose }: { onClose: () => void }) {
  const store = useWebStore();
  const TH = THEMES[store.theme];
  const P = TH.primary;
  const T = useT();
  const overlay = useOverlay();

  const yStr = yesterday();
  const currentMonth = dateStr().slice(0, 7);

  const yesterdayRecord = store.checkinHistory?.find((h) => h.date === yStr);
  const yesterdayDone = yesterdayRecord?.done === true;
  const missed = !yesterdayDone;

  // Quota
  const quota = store.userProfile?.graceMonthlyQuota ?? 2;
  const monthUsed = useMemo(() => getMonthGraceCount(store.graceHistory ?? [], currentMonth), [store.graceHistory, currentMonth]);
  const remaining = useMemo(() => getRemainingGrace(store.graceHistory ?? [], quota, currentMonth), [store.graceHistory, quota, currentMonth]);
  const available = useMemo(() => isGraceAvailable(store.graceHistory ?? [], quota, currentMonth, yStr), [store.graceHistory, quota, currentMonth, yStr]);

  // Grace history (sorted by date desc)
  const graceHistory = useMemo(() =>
    (store.graceHistory ?? []).filter(g => !g.deleted).sort((a, b) => b.date.localeCompare(a.date)),
    [store.graceHistory],
  );

  const handleRestore = useCallback(() => {
    if (!available) return;
    // Open checkin page in grace mode
    overlay.switch('checkin', { checkinGraceDate: yStr });
  }, [available, overlay, yStr]);

  const updateQuota = useCallback((q: number) => {
    store.updateUserProfile({ graceMonthlyQuota: q });
  }, [store]);

  // Quota selector options
  const quotaOptions = [0, 1, 2, 3, 4, 5];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: TH.bg, overflowY: 'auto' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 32px' }}>
        {/* Header */}
        <div style={{ padding: '20px 0 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: FONT_BACK, cursor: 'pointer' }}>
            <ChevronLeft size={20} />
          </button>
          <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text }}>{T('graceTitle')}</div>
        </div>

        {/* Status Card */}
        <div style={{ background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 16, padding: 20, marginBottom: 12 }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            {missed ? (
              available ? (
                <div>
                  <Shield size={48} color={P} style={{ marginBottom: 12 }} />
                  <div style={{ fontSize: FONT_TITLE, fontWeight: 700, color: TH.text }}>{T('graceNeedRestore')}</div>
                </div>
              ) : (
                <div>
                  <Shield size={48} color={TH.sub} style={{ marginBottom: 12 }} />
                  <div style={{ fontSize: FONT_TITLE, fontWeight: 700, color: COLORS.ORANGE }}>{T('graceQuotaExhausted')}</div>
                  <div style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 4 }}>{T('graceQuotaReset')}</div>
                </div>
              )
            ) : (
              <div>
                <CheckCircle2 size={48} color={COLORS.GREEN} style={{ marginBottom: 12 }} />
                <div style={{ fontSize: FONT_TITLE, fontWeight: 700, color: COLORS.GREEN }}>{T('graceAlreadyDone')}</div>
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
          {missed && available && (
            <button onClick={handleRestore}
              style={{
                width: '100%', padding: 14, borderRadius: 12, border: 'none',
                background: P, color: '#fff', fontWeight: 700, fontSize: FONT_BODY, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
              <Shield size={18} color="#fff" />
              {T('graceButton')}
            </button>
          )}

          {/* Grace hint */}
          {missed && !available && quota > 0 && (
            <div style={{ padding: 12, textAlign: 'center' }}>
              <span style={{ fontSize: FONT_BODY, color: TH.sub }}>
                {T('graceQuotaUsed').replace('{used}', String(monthUsed)).replace('{total}', String(quota))}
              </span>
            </div>
          )}
        </div>

        {/* Quota Progress */}
        {quota > 0 && (
          <div style={{ background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: FONT_BODY, fontWeight: 600, color: TH.text }}>
                {T('graceQuotaUsed').replace('{used}', String(monthUsed)).replace('{total}', String(quota))}
              </span>
              <span style={{ fontSize: FONT_SUB, color: TH.sub }}>{remaining} {T('graceUsedTimes')}</span>
            </div>
            <div style={{ height: 8, background: TH.border, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: 8, borderRadius: 4,
                width: `${Math.min(100, (monthUsed / quota) * 100)}%`,
                background: monthUsed >= quota ? COLORS.ORANGE : P,
              }} />
            </div>
          </div>
        )}

        {/* Quota Setting */}
        <div style={{ background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 16, padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Settings size={16} color={P} />
            <span style={{ fontSize: FONT_BODY, fontWeight: 600, color: TH.text }}>{T('graceSettingTitle')}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {quotaOptions.map(q => (
              <button key={q} onClick={() => updateQuota(q)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, textAlign: 'center',
                  background: quota === q ? P : TH.card,
                  border: `1px solid ${quota === q ? P : TH.border}`,
                  color: quota === q ? '#fff' : TH.text, fontWeight: 700, fontSize: FONT_BODY,
                  cursor: 'pointer', transition: 'all .15s',
                }}>
                {q}
              </button>
            ))}
          </div>
          <div style={{ fontSize: FONT_TINY, color: TH.sub, marginTop: 8 }}>{T('graceSettingHint')}</div>
        </div>

        {/* Grace History Timeline */}
        <div style={{ background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 16, padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Calendar size={16} color={P} />
            <span style={{ fontSize: FONT_BODY, fontWeight: 600, color: TH.text }}>{T('graceHistory')}</span>
          </div>
          {graceHistory.length === 0 ? (
            <div style={{ fontSize: FONT_SUB, color: TH.sub, textAlign: 'center', padding: 12 }}>
              {T('graceHistoryEmpty')}
            </div>
          ) : (
            <div>
              {graceHistory.map((entry, idx) => {
                const restoredDate = new Date(entry.restoredAt);
                const timeStr = restoredDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={entry.date} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    paddingBottom: idx < graceHistory.length - 1 ? 12 : 0,
                    marginBottom: idx < graceHistory.length - 1 ? 12 : 0,
                    borderBottom: idx < graceHistory.length - 1 ? `1px solid ${TH.border}` : 'none',
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: 4, background: P,
                      marginTop: 6, flexShrink: 0,
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: FONT_BODY, fontWeight: 600, color: TH.text }}>{entry.date}</div>
                      <div style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('graceCheckinTitle')} · {timeStr}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Info Card */}
        <div style={{ background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: FONT_BODY, color: TH.sub, lineHeight: 1.7 }}>
            {T('graceDesc')}
          </div>
        </div>
      </div>
    </div>
  );
}
