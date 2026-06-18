'use client';

import { THEMES, t, FONT_BODY, FONT_SUB, FONT_STAT_SECTION, dateStr, yesterday, isGraceAvailable } from '@egoless-do/core';
import { useWebStore } from '../store/useWebStore';
import { Flame, Shield } from 'lucide-react';

export default function AppHeader() {
  const theme = useWebStore((s) => s.theme);
  const streak = useWebStore((s) => s.streak);
  const language = useWebStore((s) => s.language);
  const checkinHistory = useWebStore((s) => s.checkinHistory);
  const graceHistory = useWebStore((s) => s.graceHistory);
  const graceQuota = useWebStore((s) => s.userProfile?.graceMonthlyQuota ?? 2);
  const TH = THEMES[theme];
  const P = TH.primary;
  const T = (k: string) => t(k, language);

  const yStr = yesterday();
  const currentMonth = dateStr().slice(0, 7);
  const yesterdayRecord = checkinHistory?.find((h) => h.date === yStr && !h.deleted);
  const showGrace = yesterdayRecord?.done !== true;
  const graceAvailable = isGraceAvailable(graceHistory ?? [], graceQuota, currentMonth, yStr);

  return (
    <div style={{ padding: '20px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0, position: 'relative', zIndex: 1 }}>
      <div>
        <div style={{ fontSize: FONT_BODY, color: TH.sub, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 500 }}>Egoless Do</div>
        <div style={{ fontSize: FONT_STAT_SECTION, fontWeight: 700, marginTop: 2 }}>{T('appName')}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('streak')}</div>
        <div style={{ fontSize: FONT_STAT_SECTION, fontWeight: 800, color: '#EA6060', lineHeight: 1.2 }}>{streak} <span style={{ fontSize: FONT_BODY }}>{T('days')} <Flame size={20} style={{verticalAlign:'middle', color: '#EA6060'}} /></span></div>
        {showGrace && graceAvailable && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end', marginTop: 2 }}>
            <Shield size={11} color="rgba(128,128,128,.7)" />
            <span style={{ fontSize: 10, color: 'rgba(128,128,128,.7)' }}>{T('graceStreakPending')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
