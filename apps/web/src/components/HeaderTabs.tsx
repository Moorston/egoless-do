'use client';

import { Home, ClipboardList, Target, Sparkles } from 'lucide-react';
import { FONT_BODY } from '@egoless-do/core';
import { useTheme, useT } from './helpers';

const TABS = [
  { key: 'home',        Icon: Home,          labelKey: 'home' },
  { key: 'plan',        Icon: ClipboardList,  labelKey: 'plan' },
  { key: 'habits',      Icon: Target,         labelKey: 'habits' },
  { key: 'reflections', Icon: Sparkles,       labelKey: 'reflections' },
];

export default function HeaderTabs({ active, onTabChange, onNavigateHome }: {
  active: string;
  onTabChange?: (key: string) => void;
  onNavigateHome?: () => void;
}) {
  const { TH, P } = useTheme();
  const T = useT();

  const handleTab = (key: string) => {
    if (key === 'home') {
      onNavigateHome?.();
      return;
    }
    if (key === active) return;
    onTabChange?.(key);
  };

  return (
    <div style={{ display: 'flex', padding: '0 12px 12px', gap: 6 }}>
      {TABS.map((t) => {
        const isActive = t.key === active;
        return (
          <button key={t.key} onClick={() => handleTab(t.key)}
            style={{
              flex: 1, minWidth: 0, padding: '8px 6px', border: 'none', borderRadius: 12,
              fontSize: FONT_BODY, cursor: 'pointer', whiteSpace: 'nowrap' as const,
              fontWeight: isActive ? 700 : 500,
              minHeight: 36,
              background: isActive ? P : TH.card,
              color: isActive ? '#fff' : TH.sub,
              overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
            <t.Icon size={14} strokeWidth={isActive ? 2.2 : 1.5} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {T(t.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
