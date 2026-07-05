'use client';

import React from 'react';
import { THEMES } from '@egoless-do/core';
import { useWebStore } from '../../store/useWebStore';

export function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  const theme = useWebStore((s) => s.theme);
  const TH = THEMES[theme];
  return (
    <div onClick={onChange} style={{ width: 44, height: 24, borderRadius: 12, background: on ? TH.primary : 'rgba(128,128,128,.3)', position: 'relative', cursor: 'pointer', transition: 'background .2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 2, left: on ? 22 : 2, width: 20, height: 20, borderRadius: 10, background: '#fff', transition: 'left .2s' }} />
    </div>
  );
}
