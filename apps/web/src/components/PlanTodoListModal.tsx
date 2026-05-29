'use client';

import { useMemo } from 'react';
import { THEMES, COLORS, getTodayItems, getActivePlan, FONT_BODY, FONT_BUTTON, FONT_TITLE, FONT_SUB, FONT_BADGE, FONT_CLOSE, FONT_STAT_CARD } from '@egoless-do/core';
import type { PlanItem } from '@egoless-do/core';
import { useT, cs } from './helpers';
import { useWebStore } from '../store/useWebStore';
import { X, CheckCircle2, Check } from 'lucide-react';

export default function PlanTodoListModal({ onClose }: { onClose: () => void }) {
  const store = useWebStore();
  const TH = THEMES[store.theme];
  const P = TH.primary;
  const T = useT();
  const today = new Date().toISOString().slice(0, 10);

  const activePlan = useMemo(() => getActivePlan(store.plans), [store.plans]);
  const todayItems = useMemo(() => {
    if (!activePlan) return [];
    return getTodayItems(store.planItems, activePlan, today);
  }, [store.planItems, activePlan, today]);

  const checkins = store.planItemCheckins ?? [];

  const isItemDone = (item: PlanItem) => checkins.some(c => c.planItemId === item.id && c.date === today && c.done);

  const doneCount = todayItems.filter(i => isItemDone(i)).length;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', zIndex: 1, width: '100%', maxWidth: 480,
          background: TH.bg, borderRadius: '20px 20px 0 0', padding: '20px 16px 32px',
          maxHeight: '70vh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text, flex: 1 }}>{T('planTodoList')}</div>
          <div style={{ fontSize: FONT_SUB, color: TH.sub }}>{today}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: TH.sub, fontSize: FONT_CLOSE, cursor: 'pointer', marginLeft: 12 }}><X size={20} /></button>
        </div>

        {todayItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: TH.sub }}>
            <div style={{ fontSize: FONT_STAT_CARD, marginBottom: 8 }}><CheckCircle2 size={32} style={{verticalAlign:'middle'}} /></div>
            <div style={{ fontSize: FONT_BODY }}>今日无待办项目</div>
          </div>
        ) : (
          <>
            {todayItems.map(item => {
              const done = isItemDone(item);
              const isManual = item.link === 'manual';
              return (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', marginBottom: 8, borderRadius: 12,
                  background: done ? `${COLORS.GREEN}10` : TH.card,
                  border: `1px solid ${done ? COLORS.GREEN + '40' : TH.border}`,
                  cursor: isManual ? 'pointer' : 'default',
                  transition: 'all .2s',
                }}
                  onClick={() => {
                    if (!isManual) return;
                    done ? store.uncheckinPlanItem(item.id) : store.checkinPlanItem(item.id);
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: 6, border: `2px solid ${done ? COLORS.GREEN : TH.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: done ? COLORS.GREEN : 'transparent', flexShrink: 0,
                    transition: 'all .2s',
                  }}>
                    {done && <Check size={14} color="#fff" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: FONT_BUTTON, fontWeight: 500, color: done ? TH.sub : TH.text,
                      textDecoration: done ? 'line-through' : 'none',
                    }}>{item.name}</div>
                    {item.description && (
                      <div style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.description}
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontSize: FONT_BADGE, color: isManual ? TH.sub : P,
                    background: isManual ? 'transparent' : `${P}15`,
                    padding: isManual ? '0' : '2px 8px', borderRadius: 6,
                  }}>
                    {isManual ? '' : T(`planLink${item.link.charAt(0).toUpperCase() + item.link.slice(1)}`)}
                  </span>
                </div>
              );
            })}
            <div style={{ textAlign: 'center', fontSize: FONT_SUB, color: TH.sub, marginTop: 8 }}>
              {doneCount}/{todayItems.length} {T('planProgress')}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
