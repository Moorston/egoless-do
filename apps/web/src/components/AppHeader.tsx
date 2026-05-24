'use client';

import { THEMES, t } from '@egoless-do/core';
import { useWebStore } from '../store/useWebStore';

export default function AppHeader() {
  const theme = useWebStore((s) => s.theme);
  const streak = useWebStore((s) => s.streak);
  const language = useWebStore((s) => s.language);
  const TH = THEMES[theme];
  const P = TH.primary;
  const T = (k: string) => t(k, language);

  return (
    <div style={{ padding: '20px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0, position: 'relative', zIndex: 1 }}>
      <div>
        <div style={{ fontSize: 16, color: TH.sub, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 500 }}>Egoless Do</div>
        <div style={{ fontSize: 24, fontWeight: 700, marginTop: 2 }}>{T('appName')}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 16, color: TH.sub }}>{T('streak')}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: P, lineHeight: 1.2 }}>{streak} <span style={{ fontSize: 16 }}>{T('days')} 🔥</span></div>
      </div>
    </div>
  );
}
