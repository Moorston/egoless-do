'use client';

import React from 'react';
import { THEMES, FONT_BODY, FONT_SUB, FONT_TITLE } from '@egoless-do/core';
import { useWebStore } from '../../store/useWebStore';

export function RowItem({ label, right, sub, icon, last, onClick }: { label: string; right: React.ReactNode; sub?: string; icon?: React.ReactNode; last?: boolean; onClick?: () => void }) {
  const theme = useWebStore((s) => s.theme);
  const TH = THEMES[theme];
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: last ? 'none' : `1px solid ${TH.border}`, cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {icon && <span style={{ fontSize: FONT_TITLE }}>{icon}</span>}
        <div>
          <div style={{ fontSize: FONT_BODY, color: TH.text }}>{label}</div>
          {sub && <div style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 1 }}>{sub}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: TH.sub, fontSize: FONT_BODY }}>{right}</div>
    </div>
  );
}
