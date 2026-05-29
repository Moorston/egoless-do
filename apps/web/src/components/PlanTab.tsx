'use client';

import { useState, useMemo, useEffect } from 'react';
import { THEMES, COLORS, getActivePlan, getPlanItems, getTodayItems, computePlanProgress, canEditPlan, canDeletePlan, isPlanActive, FONT_BODY, FONT_BUTTON, FONT_TITLE, FONT_SUB, FONT_BADGE, FONT_HERO, FONT_STAT_CARD, FONT_BACK } from '@egoless-do/core';
import type { PlanStatus } from '@egoless-do/core';
import { useT, cs } from './helpers';
import { useWebStore } from '../store/useWebStore';
import { useOverlay } from './useOverlay';
import PlanTodoListModal from './PlanTodoListModal';
import { CheckCircle2, ClipboardList } from 'lucide-react';

const STATUS_COLORS: Record<PlanStatus, string> = {
  not_started: COLORS.GRAY, in_progress: COLORS.GREEN, paused: COLORS.YELLOW,
  completed: COLORS.BLUE, cancelled: COLORS.RED, delayed: COLORS.ORANGE,
};

export default function PlanTab() {
  const store = useWebStore();
  const TH = THEMES[store.theme];
  const P = TH.primary;
  const T = useT();
  const overlay = useOverlay();
  const today = new Date().toISOString().slice(0, 10);

  const [showTodoList, setShowTodoList] = useState(false);

  // Auto-check status on mount
  useEffect(() => {
    store.checkAutoStatus();
    store.autoSyncPlanItems();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activePlan = useMemo(() => getActivePlan(store.plans), [store.plans]);
  const planItems = useMemo(() => activePlan ? getPlanItems(store.planItems, activePlan.id) : [], [store.planItems, activePlan]);
  const todayItems = useMemo(() => activePlan ? getTodayItems(store.planItems, activePlan, today) : [], [store.planItems, activePlan, today]);
  const checkins = store.planItemCheckins ?? [];
  const progress = activePlan ? computePlanProgress(activePlan, planItems) : 0;
  const todayDone = todayItems.filter(i => checkins.some(c => c.planItemId === i.id && c.date === today && c.done)).length;

  const statusLabel = (s: PlanStatus) => {
    const key = `planStatus${s.charAt(0).toUpperCase() + s.slice(1).replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())}`;
    return T(key);
  };

  // Empty state
  if (!activePlan) {
    return (
      <div style={{ padding: '0 16px' }}>
        <div style={{ ...cs(TH), textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: FONT_HERO, marginBottom: 16 }}><ClipboardList size={48} /></div>
          <div style={{ fontSize: FONT_BODY, color: TH.sub, marginBottom: 20 }}>{T('planEmpty')}</div>
          <button onClick={() => overlay.open('planCreate')} style={{
            background: P, border: 'none', color: '#fff', fontSize: FONT_BUTTON, fontWeight: 600,
            padding: '12px 28px', borderRadius: 12, cursor: 'pointer',
          }}>{T('planCreateBtn')}</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 16px', maxWidth: 480, margin: '0 auto' }}>
      {/* Plan header */}
      <div style={cs(TH)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: FONT_BACK }}><ClipboardList size={20} /></span>
          <span style={{ fontSize: FONT_TITLE, fontWeight: 700, color: TH.text, flex: 1 }}>{activePlan.name}</span>
          <span style={{
            fontSize: FONT_BADGE, fontWeight: 600, padding: '3px 10px', borderRadius: 6,
            background: `${STATUS_COLORS[activePlan.status]}20`, color: STATUS_COLORS[activePlan.status],
          }}>{statusLabel(activePlan.status)}</span>
        </div>

        {activePlan.slogan && (
          <div style={{ fontSize: FONT_BADGE, color: TH.sub, fontStyle: 'italic', marginBottom: 8 }}>
            &ldquo;{activePlan.slogan}&rdquo;
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1, height: 6, background: TH.border, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: 6, width: `${progress}%`, background: P, borderRadius: 3, transition: 'width .3s' }} />
          </div>
          <span style={{ fontSize: FONT_SUB, fontWeight: 600, color: TH.text }}>{progress}%</span>
        </div>

        <div style={{ fontSize: FONT_SUB, color: TH.sub }}>
          {activePlan.startDate} ~ {activePlan.endDate}
        </div>
      </div>

      {/* Goal */}
      <div style={cs(TH)}>
        <div style={{ fontSize: FONT_BADGE, fontWeight: 600, color: TH.sub, marginBottom: 4 }}>{T('planGoal')}</div>
        <div style={{ fontSize: FONT_SUB, color: TH.text }}>{activePlan.goal}</div>
      </div>

      {/* Items summary */}
      <div style={cs(TH)}>
        <div style={{ fontSize: FONT_SUB, fontWeight: 600, color: TH.text, marginBottom: 12 }}>{T('planItems')}</div>
        {planItems.length === 0 ? (
          <div style={{ fontSize: FONT_BADGE, color: TH.sub, textAlign: 'center', padding: 12 }}>{T('planNoItems')}</div>
        ) : (
          planItems.map(item => (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px', marginBottom: 6, borderRadius: 8,
              background: `${TH.card}80`, border: `1px solid ${TH.border}`,
            }}>
              <span style={{ fontSize: FONT_SUB, fontWeight: 500, color: TH.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
              <span style={{
                fontSize: FONT_BADGE, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                background: `${STATUS_COLORS[item.status]}20`, color: STATUS_COLORS[item.status],
              }}>{statusLabel(item.status)}</span>
              <span style={{ fontSize: FONT_SUB, color: TH.sub, whiteSpace: 'nowrap' }}>{item.progress}%</span>
            </div>
          ))
        )}
      </div>

      {/* TodoList entry */}
      <div
        onClick={() => setShowTodoList(true)}
        style={{
          ...cs(TH), cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, padding: 16, background: `${P}10`, border: `1px solid ${P}30`,
        }}
      >
        <span style={{ fontSize: FONT_TITLE }}><CheckCircle2 size={18} /></span>
        <span style={{ fontSize: FONT_BUTTON, fontWeight: 600, color: P }}>{T('planTodoList')}</span>
        {todayItems.length > 0 && (
          <span style={{ fontSize: FONT_BADGE, color: TH.sub }}>({todayDone}/{todayItems.length})</span>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        {canEditPlan(activePlan.status) && (
          <button onClick={() => overlay.open('planCreate', { planId: activePlan.id })} style={{
            flex: 1, padding: '10px 0', borderRadius: 10, border: `1px solid ${P}40`,
            background: `${P}10`, color: P, fontSize: FONT_BUTTON, fontWeight: 600, cursor: 'pointer',
          }}>{T('planEdit')}</button>
        )}

        {activePlan.status === 'not_started' && (
          <button onClick={() => store.startPlan(activePlan.id)} style={{
            flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
            background: COLORS.GREEN, color: '#fff', fontSize: FONT_BUTTON, fontWeight: 600, cursor: 'pointer',
          }}>{T('planStart')}</button>
        )}

        {activePlan.status === 'in_progress' && (
          <>
            <button onClick={() => store.pausePlan(activePlan.id)} style={{
              flex: 1, padding: '10px 0', borderRadius: 10, border: `1px solid ${COLORS.YELLOW}40`,
              background: `${COLORS.YELLOW}10`, color: COLORS.YELLOW, fontSize: FONT_BUTTON, fontWeight: 600, cursor: 'pointer',
            }}>{T('planPause')}</button>
            <button onClick={() => { if (confirm(T('planConfirmComplete'))) store.completePlan(activePlan.id); }} style={{
              flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
              background: COLORS.BLUE, color: '#fff', fontSize: FONT_BUTTON, fontWeight: 600, cursor: 'pointer',
            }}>{T('planComplete')}</button>
            <button onClick={() => { if (confirm(T('planConfirmCancel'))) store.cancelPlan(activePlan.id); }} style={{
              flex: 1, padding: '10px 0', borderRadius: 10, border: `1px solid ${COLORS.RED}40`,
              background: `${COLORS.RED}10`, color: COLORS.RED, fontSize: FONT_BUTTON, fontWeight: 600, cursor: 'pointer',
            }}>{T('planCancelPlan')}</button>
          </>
        )}

        {activePlan.status === 'paused' && (
          <button onClick={() => store.resumePlan(activePlan.id)} style={{
            flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
            background: COLORS.GREEN, color: '#fff', fontSize: FONT_BUTTON, fontWeight: 600, cursor: 'pointer',
          }}>{T('planResume')}</button>
        )}

        {activePlan.status === 'delayed' && (
          <>
            <button onClick={() => overlay.open('planCreate', { planId: activePlan.id })} style={{
              flex: 1, padding: '10px 0', borderRadius: 10, border: `1px solid ${P}40`,
              background: `${P}10`, color: P, fontSize: FONT_BUTTON, fontWeight: 600, cursor: 'pointer',
            }}>{T('planEdit')}</button>
            <button onClick={() => { if (confirm(T('planConfirmComplete'))) store.completePlan(activePlan.id); }} style={{
              flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
              background: COLORS.BLUE, color: '#fff', fontSize: FONT_BUTTON, fontWeight: 600, cursor: 'pointer',
            }}>{T('planComplete')}</button>
            <button onClick={() => { if (confirm(T('planConfirmCancel'))) store.cancelPlan(activePlan.id); }} style={{
              flex: 1, padding: '10px 0', borderRadius: 10, border: `1px solid ${COLORS.RED}40`,
              background: `${COLORS.RED}10`, color: COLORS.RED, fontSize: FONT_BUTTON, fontWeight: 600, cursor: 'pointer',
            }}>{T('planCancelPlan')}</button>
          </>
        )}
      </div>

      {canDeletePlan(activePlan.status) && (
        <button onClick={() => { if (confirm(T('planConfirmDelete'))) store.deletePlan(activePlan.id); }} style={{
          width: '100%', padding: '10px 0', borderRadius: 10, border: `1px solid ${COLORS.RED}40`,
          background: 'transparent', color: COLORS.RED, fontSize: FONT_BUTTON, fontWeight: 600, cursor: 'pointer',
          marginTop: 8,
        }}>{T('planDelete')}</button>
      )}

      {/* TodoList modal */}
      {showTodoList && <PlanTodoListModal onClose={() => setShowTodoList(false)} />}
    </div>
  );
}
