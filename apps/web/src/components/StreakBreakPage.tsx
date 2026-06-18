'use client';

import { useMemo, useCallback } from 'react';
import {
  THEMES, COLORS,
  detectStreakBreaks, computeLongestStreak, computeCurrentStreak,
  computeBreakInsights, computeHypotheticalStreak, generateEncouragement, getRecoveryData,
  dateStr,
  FONT_BACK, FONT_TITLE, FONT_SUB, FONT_BODY, FONT_BADGE, FONT_STAT_SECTION, FONT_TINY,
} from '@egoless-do/core';
import { useT } from './helpers';
import { useWebStore } from '../store/useWebStore';
import { useOverlay } from './useOverlay';
import { ChevronLeft, PartyPopper, ArrowRight, Flame, Heart, Clock, Sprout, Shield } from 'lucide-react';

export default function StreakBreakPage({ onClose }: { onClose: () => void }) {
  const store = useWebStore();
  const TH = THEMES[store.theme];
  const P = TH.primary;
  const T = useT();
  const overlay = useOverlay();

  const history = useMemo(() => (store.checkinHistory ?? []).filter(c => !c.deleted), [store.checkinHistory]);
  const graceHistory = store.graceHistory ?? [];
  const quota = store.userProfile?.graceMonthlyQuota ?? 2;

  const breaks = useMemo(() => detectStreakBreaks(history), [history]);
  const doneDates = useMemo(() => history.filter(c => c.done).map(c => c.date), [history]);
  const longestStreak = useMemo(() => computeLongestStreak(doneDates), [doneDates]);
  const currentStreak = useMemo(() => computeCurrentStreak(history), [history]);
  const insight = useMemo(() => computeBreakInsights(breaks, history), [breaks, history]);
  const recovery = useMemo(() => getRecoveryData(history, breaks), [history, breaks]);
  const encouragement = useMemo(
    () => generateEncouragement(breaks, longestStreak, doneDates.length, currentStreak, insight),
    [breaks, longestStreak, doneDates, currentStreak, insight],
  );
  const hypotheticals = useMemo(
    () => breaks.map(b => computeHypotheticalStreak(b, history, graceHistory, quota)),
    [breaks, history, graceHistory, quota],
  );

  const handleCheckin = useCallback(() => {
    overlay.switch('checkin');
  }, [overlay]);

  // Weekday labels: Mon-Sun
  const weekdayLabels = [T('weekdayMon'), T('weekdayTue'), T('weekdayWed'), T('weekdayThu'), T('weekdayFri'), T('weekdaySat'), T('weekdaySun')];
  // Month labels: last 6 months
  const monthLabels = insight.monthlyTrend.map(t => {
    const m = parseInt(t.month.split('-')[1]);
    return T(`month${m}`);
  });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: TH.bg, overflowY: 'auto' }}>
      <div style={{ maxWidth: 390, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ padding: '20px 16px 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: FONT_BACK, cursor: 'pointer' }}><ChevronLeft size={20} /></button>
          <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text }}>{T('streakBreakTitle')}</div>
        </div>

        <div style={{ padding: '0 16px' }}>
          {/* Recovery Card */}
          <div style={{
            background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 16,
            padding: 20, marginBottom: 12, textAlign: 'center',
          }}>
            {recovery.state === 'active' && (
              <>
                <Flame size={40} color={P} style={{ marginBottom: 10 }} />
                <div style={{ fontSize: FONT_STAT_SECTION, fontWeight: 800, color: P, marginBottom: 4 }}>
                  {T('streakBreakActiveStreak').replace('{n}', String(currentStreak))}
                </div>
                {(recovery.daysSinceLastBreak ?? 0) > 0 && (
                  <div style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 8 }}>
                    {T('streakBreakDaysSince').replace('{n}', String(recovery.daysSinceLastBreak))}
                  </div>
                )}
                <div style={{ fontSize: FONT_BODY, color: TH.text }}>{T('streakBreakGettingStronger')}</div>
              </>
            )}
            {recovery.state === 'just_broke' && (
              <>
                <Heart size={40} color={COLORS.ORANGE} style={{ marginBottom: 10 }} />
                <div style={{ fontSize: FONT_STAT_SECTION, fontWeight: 800, color: TH.text, marginBottom: 4 }}>
                  {T('streakBreakRestart')}
                </div>
                <div style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 8 }}>
                  {T('streakBreakPrevStreak').replace('{n}', String(recovery.previousStreak ?? 0))}，{T('streakBreakCanBeLonger')}
                </div>
                <button onClick={handleCheckin} style={{
                  padding: '10px 24px', borderRadius: 10, border: 'none',
                  background: P, color: '#fff', fontWeight: 700, fontSize: FONT_BODY, cursor: 'pointer',
                }}>
                  {T('streakBreakCheckinNow')}
                </button>
              </>
            )}
            {recovery.state === 'at_risk' && (
              <>
                <Clock size={40} color={COLORS.ORANGE} style={{ marginBottom: 10 }} />
                <div style={{ fontSize: FONT_STAT_SECTION, fontWeight: 800, color: TH.text, marginBottom: 4 }}>
                  {T('streakBreakDontForget')}
                </div>
                <div style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 8 }}>
                  {T('streakBreakActiveStreak').replace('{n}', String(currentStreak))}，{T('streakBreakGettingStronger')}
                </div>
                <button onClick={handleCheckin} style={{
                  padding: '10px 24px', borderRadius: 10, border: 'none',
                  background: P, color: '#fff', fontWeight: 700, fontSize: FONT_BODY, cursor: 'pointer',
                }}>
                  {T('streakBreakCheckinNow')}
                </button>
              </>
            )}
            {recovery.state === 'long_absence' && (
              <>
                <Sprout size={40} color={COLORS.GREEN} style={{ marginBottom: 10 }} />
                <div style={{ fontSize: FONT_STAT_SECTION, fontWeight: 800, color: TH.text, marginBottom: 4 }}>
                  {T('streakBreakNeverTooLate')}
                </div>
                <div style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 8 }}>
                  {T('streakBreakDaysSince').replace('{n}', String(recovery.daysSinceLastCheckin ?? 0))}
                </div>
                <button onClick={handleCheckin} style={{
                  padding: '10px 24px', borderRadius: 10, border: 'none',
                  background: P, color: '#fff', fontWeight: 700, fontSize: FONT_BODY, cursor: 'pointer',
                }}>
                  {T('streakBreakCheckinNow')}
                </button>
              </>
            )}
          </div>

          {/* Insight Card — hidden when breaks < 3 */}
          {insight.totalBreaks >= 3 && (
            <div style={{
              background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 16,
              padding: 16, marginBottom: 12,
            }}>
              <div style={{ fontSize: FONT_BODY, fontWeight: 600, color: TH.text, marginBottom: 14 }}>
                {T('streakBreakInsight')}
              </div>

              {/* Weekday distribution */}
              <div style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 8 }}>{T('streakBreakHighDay')}</div>
              <MiniBarChart values={insight.weekdayDist} labels={weekdayLabels} color={P} th={TH} />

              {/* Stats row */}
              <div style={{ display: 'flex', gap: 16, margin: '14px 0', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: FONT_BODY, fontWeight: 700, color: P }}>{insight.avgStreak}</div>
                  <div style={{ fontSize: FONT_TINY, color: TH.sub }}>{T('streakBreakAvgStreak')}</div>
                </div>
                <div style={{ width: 1, background: TH.border }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: FONT_BODY, fontWeight: 700, color: P }}>{insight.avgRecoveryDays}</div>
                  <div style={{ fontSize: FONT_TINY, color: TH.sub }}>{T('streakBreakAvgRecovery')}</div>
                </div>
              </div>

              {/* Monthly trend */}
              <div style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 8 }}>{T('streakBreakTrend')}</div>
              <MiniBarChart values={insight.monthlyTrend.map(t => t.count)} labels={monthLabels} color={P} th={TH} />
            </div>
          )}

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
              <div style={{ marginBottom: 8 }}><PartyPopper size={32} color={COLORS.GREEN} /></div>
              <div style={{ fontSize: FONT_BODY, color: TH.sub }}>{T('streakBreakEmpty')}</div>
            </div>
          ) : (
            breaks.map((b, i) => (
              <div key={i} style={{
                background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 16,
                padding: 16, marginBottom: 10,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: FONT_BODY, fontWeight: 600, color: TH.text }}>{b.breakDate}</div>
                    {hypotheticals[i]?.available && (
                      <div style={{
                        background: `${COLORS.ORANGE}15`, border: `1px solid ${COLORS.ORANGE}40`,
                        borderRadius: 6, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        <Shield size={12} color={COLORS.ORANGE} />
                        <span style={{ fontSize: FONT_TINY, color: COLORS.ORANGE, fontWeight: 600 }}>
                          {T('streakBreakHypothetical').replace('{n}', String(hypotheticals[i].hypotheticalStreak))}
                        </span>
                      </div>
                    )}
                  </div>
                  <div style={{
                    background: '#EF444420', color: '#EF4444', fontSize: FONT_BADGE, fontWeight: 600,
                    padding: '3px 10px', borderRadius: 8,
                  }}>
                    -{b.lostStreak} {T('streakBreakDays')}
                  </div>
                </div>
                <div style={{ fontSize: FONT_SUB, color: TH.sub }}>
                  {T('streakBreakRange')}：{b.startDate} <ArrowRight size={13} style={{ verticalAlign: 'middle' }} /> {b.breakDate}
                </div>
              </div>
            ))
          )}

          {/* Encouragement Card */}
          {encouragement.length > 0 && (
            <div style={{
              background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 16,
              padding: 16, marginTop: breaks.length > 0 ? 2 : 0,
            }}>
              {encouragement.map((msg, i) => (
                <div key={i} style={{
                  fontSize: FONT_BODY, color: i === 0 ? TH.text : TH.sub,
                  fontWeight: i === 0 ? 600 : 400,
                  lineHeight: 1.8,
                }}>
                  {msg}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniBarChart({ values, labels, color, th }: {
  values: number[];
  labels: string[];
  color: string;
  th: { sub: string };
}) {
  const max = Math.max(...values, 1);
  const maxHeight = 36;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: maxHeight + 18 }}>
      {values.map((v, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{
            width: '100%',
            height: (v / max) * maxHeight,
            background: v === max && v > 0 ? color : `${color}40`,
            borderRadius: 3,
            minHeight: v > 0 ? 2 : 0,
          }} />
          <span style={{ fontSize: 10, color: th.sub }}>{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}
