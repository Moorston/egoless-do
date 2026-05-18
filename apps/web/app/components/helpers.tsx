'use client';

import React from 'react';
import { useAppStore, THEMES, t } from '@egoless/core';

export function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange} style={{ width: 44, height: 24, borderRadius: 12, background: on ? '#7C3AED' : 'rgba(128,128,128,.3)', position: 'relative', cursor: 'pointer', transition: 'background .2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 2, left: on ? 22 : 2, width: 20, height: 20, borderRadius: 10, background: '#fff', transition: 'left .2s' }} />
    </div>
  );
}

export function RowItem({ label, right, sub, icon, last, onClick }: { label: string; right: React.ReactNode; sub?: string; icon?: string; last?: boolean; onClick?: () => void }) {
  const TH = THEMES[useAppStore.getState().themeName];
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: last ? 'none' : `1px solid ${TH.border}`, cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
        <div>
          <div style={{ fontSize: 14, color: TH.text }}>{label}</div>
          {sub && <div style={{ fontSize: 13, color: TH.sub, marginTop: 1 }}>{sub}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: TH.sub, fontSize: 13 }}>{right}</div>
    </div>
  );
}

export function LinkWorldBtn({ label, onClick }: { label?: string; onClick: () => void }) {
  const TH = THEMES[useAppStore.getState().themeName];
  const P = TH.primary;
  const lang = useAppStore.getState().lang;
  return (
    <div onClick={onClick} style={{ background: TH.card, borderRadius: 16, marginBottom: 12, border: `1px solid ${TH.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={P} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
      <span style={{ fontSize: 13, color: TH.text }}>{t('linkWorld', lang)}{label ? ` — ${label}` : ''}</span>
      <span style={{ marginLeft: 'auto', color: TH.sub }}>›</span>
    </div>
  );
}

export function useTheme() {
  const themeName = useAppStore((s) => s.themeName);
  const TH = THEMES[themeName];
  const P = TH.primary;
  return { TH, P };
}

export function useT() {
  const lang = useAppStore((s) => s.lang);
  return (k: string) => t(k, lang);
}

export const cs = (TH: (typeof THEMES)[keyof typeof THEMES]): React.CSSProperties => ({
  background: TH.card, borderRadius: 16, padding: 16, marginBottom: 12, border: `1px solid ${TH.border}`, position: 'relative', zIndex: 1,
});

export const inp = (TH: (typeof THEMES)[keyof typeof THEMES]): React.CSSProperties => ({
  width: '100%', background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 10, padding: '10px 12px', color: TH.text, fontSize: 15, outline: 'none', boxSizing: 'border-box',
});
