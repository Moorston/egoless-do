'use client';

import { useMemo } from 'react';
import { useTheme, useT, cs } from './helpers';
import CalendarGrid from './charts/CalendarGrid';
import { useWebStore } from '../store/useWebStore';
import { useShallow } from 'zustand/react/shallow';
import { X } from 'lucide-react';
import { FONT_BODY, FONT_SUB, FONT_TITLE, computeLongestStreak, INCOMPLETE_REASONS, parseCheckinNote } from '@egoless-do/core';
import type { CheckinEntry } from '@egoless-do/core';

interface CheckinStatsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CheckinStatsModal({ visible, onClose }: CheckinStatsModalProps) {
  const { TH, P } = useTheme();
  const T = useT();

  const { checkinHistory, totalCompleted, streak } = useWebStore(useShallow((s) => ({
    checkinHistory: s.checkinHistory,
    totalCompleted: (s.checkinHistory ?? []).filter((c: CheckinEntry) => c.done).length,
    streak: s.streak,
  })));

  const history = checkinHistory ?? [];
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  // 本月打卡天数
  const monthDone = useMemo(() => {
    return history.filter((c: CheckinEntry) => {
      if (!c.done) return false;
      const d = new Date(c.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    }).length;
  }, [history, currentYear, currentMonth]);

  // 本月已过天数
  const monthPassed = today.getDate();

  // 本月完成率
  const monthRate = monthPassed === 0 ? 0 : Math.round((monthDone / monthPassed) * 100);

  // 最长连续记录
  const longestStreak = useMemo(() => {
    return computeLongestStreak(history.filter((c: CheckinEntry) => c.done).map(c => c.date));
  }, [history]);

  // 平均每周打卡
  const avgPerWeek = useMemo(() => {
    if (history.length === 0) return 0;
    const dates = history.filter((c: CheckinEntry) => c.done).map(c => c.date).sort();
    if (dates.length === 0) return 0;
    const firstDate = new Date(dates[0]);
    const lastDate = new Date(dates[dates.length - 1]);
    const weeks = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / (7 * 24 * 60 * 60 * 1000)));
    return Math.round((totalCompleted / weeks) * 10) / 10;
  }, [history, totalCompleted]);

  const stats = [
    { label: T('monthCompletionRate'), value: `${monthRate}%`, sub: `${monthDone}/${monthPassed} ${T('days')}` },
    { label: T('monthCheckinDays'), value: monthDone, sub: `${T('total')} ${new Date(currentYear, currentMonth + 1, 0).getDate()} ${T('days')}` },
    { label: T('longestStreak'), value: longestStreak, sub: T('days') },
    { label: T('totalCompleted'), value: totalCompleted, sub: T('days') },
    { label: T('streak'), value: streak, sub: T('days') },
    { label: T('avgPerWeek'), value: avgPerWeek, sub: T('days') },
  ];

  // 本月未完成原因分布
  const reasonDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    history
      .filter((c: CheckinEntry) => {
        if (!c.done) return false;
        const d = new Date(c.date);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      })
      .forEach((c: CheckinEntry) => {
        const parsed = parseCheckinNote(c.note ?? '');
        if (parsed.incompleteReason) {
          counts[parsed.incompleteReason] = (counts[parsed.incompleteReason] ?? 0) + 1;
        }
      });
    return INCOMPLETE_REASONS
      .map(r => ({ ...r, count: counts[r.code] ?? 0 }))
      .filter(r => r.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [history, currentYear, currentMonth]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: TH.bg, width: '100%', maxWidth: 390, maxHeight: '88vh', overflowY: 'auto',
        borderRadius: '24px 24px 0 0', padding: '16px 16px 32px',
      }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: FONT_TITLE, fontWeight: 700, color: TH.text }}>{T('checkinStats')}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} color={TH.sub} />
          </button>
        </div>

        {/* Calendar */}
        <div style={{ background: TH.card, borderRadius: 16, padding: 16, marginBottom: 16, border: `1px solid ${TH.border}` }}>
          <CalendarGrid history={history.map((c: CheckinEntry) => ({ date: c.date, done: c.done }))} />
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: reasonDistribution.length > 0 ? 16 : 0 }}>
          {stats.map((stat, i) => (
            <div key={i} style={{
              background: TH.card, borderRadius: 14, padding: 12, border: `1px solid ${TH.border}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}>
              <span style={{ fontSize: 26, fontWeight: 700, color: P }}>{stat.value}</span>
              <span style={{ fontSize: FONT_BODY, color: TH.sub, textAlign: 'center' }}>{stat.label}</span>
              <span style={{ fontSize: FONT_SUB, color: TH.sub }}>{stat.sub}</span>
            </div>
          ))}
        </div>

        {/* Incomplete Reason Distribution */}
        {reasonDistribution.length > 0 && (
          <div style={{ background: TH.card, borderRadius: 16, padding: 16, border: `1px solid ${TH.border}` }}>
            <div style={{ fontSize: FONT_BODY, fontWeight: 600, color: TH.text, marginBottom: 12 }}>{T('incompleteReasonStats')}</div>
            {reasonDistribution.map((r) => {
              const labelKey = `incompleteReason${r.code.charAt(0).toUpperCase() + r.code.slice(1)}` as string;
              return (
                <div key={r.code} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                  <span style={{ fontSize: FONT_BODY, color: TH.text }}>{r.icon} {T(labelKey as any)}</span>
                  <span style={{ fontSize: FONT_BODY, fontWeight: 600, color: P }}>{r.count} {T('days')}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
