'use client';

import { useState } from 'react';
import { SPORT_GROUPS, SPORT_BG_COLORS } from '@egoless/core';
import type { SportItem } from '@egoless/core';
import { useTheme, useT, cs, LinkWorldBtn } from './helpers';

export default function ExerciseTab({ onOpenGlobalMap, onOpenSport }: { onOpenGlobalMap?: () => void; onOpenSport?: (s: SportItem) => void }) {
  const { TH, P } = useTheme();
  const T = useT();
  const [showOther, setShowOther] = useState(false);

  return (
    <>
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12, color: TH.sub }}>{T('selectExercise')}</div>
      {[
        { icon: '🚶', label: '行走', sport: '行走' },
        { icon: '🏃', label: '跑步', sport: '跑步' },
        { icon: '🚴', label: '骑行', sport: '骑行' },
        { icon: '🏋', label: '其他运动', more: true },
      ].map(({ icon, label, sport: sn, more }) => (
        <div key={label} onClick={() => more ? setShowOther(true) : onOpenSport?.({ key: sn, icon, color: P })}
          style={{ ...cs(TH), display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', cursor: 'pointer' } as React.CSSProperties}>
          <span style={{ fontSize: 32 }}>{icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: TH.text }}>{label}</div>
          </div>
          <span style={{ color: TH.sub, fontSize: 18 }}>›</span>
        </div>
      ))}

      <LinkWorldBtn label="查看全球锻炼者" onClick={() => onOpenGlobalMap?.()} />

      {showOther && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 390, background: TH.cardSolid, borderRadius: '24px 24px 0 0', padding: 24, maxHeight: '88vh', overflowY: 'auto' }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: TH.border, margin: '0 auto 16px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 20, color: TH.text }}>选择运动类别</div>
              <button onClick={() => setShowOther(false)} style={{ width: 34, height: 34, borderRadius: 17, background: TH.card, border: 'none', fontSize: 16, cursor: 'pointer', color: TH.text }}>×</button>
            </div>
            {SPORT_GROUPS.map((g) => (
              <div key={g.group}>
                <div style={{ fontSize: 12, color: TH.sub, fontWeight: 600, padding: '12px 0 6px' }}>{g.group}</div>
                {g.items.map((s) => (
                  <div key={s.key} onClick={() => { onOpenSport?.(s); setShowOther(false); }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: `1px solid ${TH.border}`, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 24, width: 36, textAlign: 'center' }}>{s.icon}</span>
                      <span style={{ fontSize: 16, color: TH.text }}>{s.key}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
