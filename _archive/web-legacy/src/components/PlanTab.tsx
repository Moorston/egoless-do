'use client';

import { useMemo, useEffect } from 'react';
import { THEMES, COLORS, getActivePlan, FONT_BODY, FONT_BUTTON, FONT_HERO } from '@egoless-do/core';
import { useT, cs } from './helpers';
import { useWebStore } from '../store/useWebStore';
import { useOverlay } from './useOverlay';
import { ClipboardList } from 'lucide-react';
import PlanDetailContent from './PlanDetailContent';

export default function PlanTab() {
  const store = useWebStore();
  const TH = THEMES[store.theme];
  const P = TH.primary;
  const T = useT();
  const overlay = useOverlay();

  // Auto-check status on mount
  useEffect(() => {
    store.checkAutoStatus();
    store.autoSyncPlanItems();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activePlan = useMemo(() => getActivePlan(store.plans ?? []), [store.plans]);

  // Empty state
  if (!activePlan) {
    return (
      <>
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
      </>
    );
  }

  return (
    <>
      <div style={{ padding: '0 16px', maxWidth: 480, margin: '0 auto' }}>
        <PlanDetailContent planId={activePlan.id} onClose={() => {}} />
      </div>
    </>
  );
}
