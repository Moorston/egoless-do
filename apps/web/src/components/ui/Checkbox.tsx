'use client';

import React from 'react';
import { THEMES } from '@egoless-do/core';
import { useWebStore } from '../../store/useWebStore';
import { Check } from 'lucide-react';

export function Checkbox({ on, onChange }: { on: boolean; onChange: () => void }) {
  const theme = useWebStore((s) => s.theme);
  const TH = THEMES[theme];
  const P = TH.primary;
  return (
    <div onClick={onChange} style={{
      width: 22, height: 22, borderRadius: 6,
      border: `2px solid ${on ? P : TH.border}`,
      background: on ? P : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', transition: 'all .15s', flexShrink: 0,
    }}>
      {on && <Check size={14} color="#fff" strokeWidth={3} />}
    </div>
  );
}
