'use client';

import { THEMES, t, FONT_BODY, FONT_SUB, FONT_STAT_SECTION } from '@egoless-do/core';
import { useWebStore } from '../store/useWebStore';
import { Flame } from 'lucide-react';

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
        <div style={{ fontSize: FONT_BODY, color: TH.sub, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 500 }}>Egoless Do</div>
        <div style={{ fontSize: FONT_STAT_SECTION, fontWeight: 700, marginTop: 2 }}>{T('appName')}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('streak')}</div>
        <div style={{ fontSize: FONT_STAT_SECTION, fontWeight: 800, color: '#EA6060', lineHeight: 1.2 }}>{streak} <span style={{ fontSize: FONT_BODY }}>{T('days')} <Flame size={20} style={{verticalAlign:'middle', color: '#EA6060'}} /></span></div>
      </div>
    </div>
  );
}
