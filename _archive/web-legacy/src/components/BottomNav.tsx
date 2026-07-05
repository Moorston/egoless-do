'use client';

import { THEMES, t, FONT_BODY } from '@egoless-do/core';
import { useWebStore } from '../store/useWebStore';

interface TabDef {
  key: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  labelKey: string;
}

const BOTTOM_NAV_KEYS = ['home', 'fasting', 'meditation', 'exercise', 'settings'];

export default function BottomNav({ tabs, activeTab, onTabChange }: {
  tabs: TabDef[];
  activeTab: number;
  onTabChange: (index: number) => void;
}) {
  const theme = useWebStore((s) => s.theme);
  const language = useWebStore((s) => s.language);
  const TH = THEMES[theme];
  const P = TH.primary;
  const T = (k: string) => t(k, language);

  const btnTabs = tabs.filter(tab => BOTTOM_NAV_KEYS.includes(tab.key));

  return (
    <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%',
      background: TH.navBg, backdropFilter: 'blur(20px)', borderTop: `1px solid ${TH.border}`,
      display: 'flex', padding: '8px 0 18px', zIndex: 50 }}>
      {btnTabs.map((tab) => {
        const idx = tabs.findIndex(x => x.key === tab.key);
        const isActive = activeTab === idx;
        return (
          <button key={tab.key} onClick={() => onTabChange(idx)}
            style={{ flex: 1, border: 'none', background: 'transparent', cursor: 'pointer',
              color: isActive ? P : TH.sub,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 0' }}>
            <tab.Icon size={20} />
            <span style={{ fontSize: FONT_BODY, fontWeight: isActive ? 700 : 500 }}>{T(tab.labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}
