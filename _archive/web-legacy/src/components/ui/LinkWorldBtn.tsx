'use client';

import React from 'react';
import { THEMES, t, FONT_BODY } from '@egoless-do/core';
import { useWebStore } from '../../store/useWebStore';
import { ChevronRight } from 'lucide-react';

export function LinkWorldBtn({ label, onClick }: { label?: string; onClick: () => void }) {
  const theme = useWebStore((s) => s.theme);
  const language = useWebStore((s) => s.language);
  const TH = THEMES[theme];
  const P = TH.primary;
  return (
    <div onClick={onClick} style={{ background: TH.card, borderRadius: 16, marginBottom: 12, border: `1px solid ${TH.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={P} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
      <span style={{ fontSize: FONT_BODY, color: TH.text }}>{t('linkWorld', language)}{label ? ` — ${label}` : ''}</span>
      <span style={{ marginLeft: 'auto', color: TH.sub }}><ChevronRight size={16} style={{verticalAlign:'middle'}} /></span>
    </div>
  );
}
