'use client';

import { THEMES, t } from '@egoless-do/core';
import { useWebStore } from '../store/useWebStore';

interface TabDef {
  key: string;
  icon: string;
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

  const btnTabs = tabs.filter(t => BOTTOM_NAV_KEYS.includes(t.key));

  return (
    <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%',
      background: TH.navBg, backdropFilter: 'blur(20px)', borderTop: `1px solid ${TH.border}`,
      display: 'flex', padding: '8px 0 18px', zIndex: 50 }}>
      {btnTabs.map((t) => {
        const idx = tabs.findIndex(x => x.key === t.key);
        return (
          <button key={t.key} onClick={() => onTabChange(idx)}
            style={{ flex: 1, border: 'none', background: 'transparent', cursor: 'pointer',
              color: activeTab === idx ? P : TH.sub,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 0' }}>
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            <span style={{ fontSize: 15 }}>{T(t.labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}
