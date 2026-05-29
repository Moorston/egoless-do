'use client';

import { useMemo } from 'react';
import { THEMES, COLORS, getHistoryPlans, FONT_BODY, FONT_BUTTON, FONT_TITLE, FONT_SUB, FONT_BADGE, FONT_BACK, FONT_STAT_CARD, FONT_STAT_SECTION } from '@egoless-do/core';
import type { Plan, PlanStatus } from '@egoless-do/core';
import { useT, cs } from './helpers';
import { useWebStore } from '../store/useWebStore';
import { useOverlay } from './useOverlay';
import { ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';

const STATUS_COLORS: Record<PlanStatus, string> = {
  not_started: COLORS.GRAY, in_progress: COLORS.GREEN, paused: COLORS.YELLOW,
  completed: COLORS.BLUE, cancelled: COLORS.RED, delayed: COLORS.ORANGE,
};

export default function PlanHistoryPage({ onClose }: { onClose: () => void }) {
  const store = useWebStore();
  const TH = THEMES[store.theme];
  const T = useT();
  const overlay = useOverlay();

  const historyPlans = useMemo(() => getHistoryPlans(store.plans), [store.plans]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: TH.bg, overflowY: 'auto' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px' }}>
        <div style={{ padding: '20px 0 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: FONT_BACK, cursor: 'pointer' }}><ChevronLeft size={20} /></button>
          <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text }}>{T('planHistory')}</div>
        </div>

        {historyPlans.length === 0 ? (
          <div style={{ ...cs(TH), textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: FONT_STAT_SECTION, marginBottom: 8 }}><ClipboardList size={32} /></div>
            <div style={{ fontSize: FONT_BUTTON, color: TH.sub }}>暂无历史计划</div>
          </div>
        ) : (
          historyPlans.map(plan => (
            <div
              key={plan.id}
              onClick={() => overlay.open('planDetail', { planId: plan.id })}
              style={{ ...cs(TH), cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <span style={{ fontSize: FONT_STAT_CARD }}><ClipboardList size={24} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: FONT_BUTTON, fontWeight: 600, color: TH.text, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {plan.name}
                </div>
                <div style={{ fontSize: FONT_SUB, color: TH.sub }}>
                  {plan.startDate} ~ {plan.endDate}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span style={{
                  fontSize: FONT_BADGE, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                  background: `${STATUS_COLORS[plan.status]}20`, color: STATUS_COLORS[plan.status],
                }}>{T(`planStatus${plan.status.charAt(0).toUpperCase() + plan.status.slice(1).replace(/_([a-z])/g, (_, c) => c.toUpperCase())}`)}</span>
                <span style={{ fontSize: FONT_SUB, color: TH.sub }}>{plan.progress}%</span>
              </div>
              <span style={{ fontSize: FONT_SUB, color: TH.sub }}><ChevronRight size={14} style={{verticalAlign:'middle'}} /></span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
