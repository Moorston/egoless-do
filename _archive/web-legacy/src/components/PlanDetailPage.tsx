'use client';

import { THEMES } from '@egoless-do/core';
import { useWebStore } from '../store/useWebStore';
import PlanDetailContent from './PlanDetailContent';

export default function PlanDetailPage({ planId, onClose }: { planId: string; onClose: () => void }) {
  const TH = THEMES[useWebStore().theme];
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: TH.bg, overflowY: 'auto' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 32px' }}>
        <PlanDetailContent planId={planId} onClose={onClose} />
      </div>
    </div>
  );
}
