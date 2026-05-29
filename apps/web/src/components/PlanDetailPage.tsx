'use client';

import { useMemo } from 'react';
import { THEMES, COLORS, getPlanItems, computePlanProgress, FONT_BODY, FONT_BUTTON, FONT_TITLE, FONT_SUB, FONT_BADGE, FONT_BACK, FONT_ERROR } from '@egoless-do/core';
import type { Plan, PlanItem, PlanItemCheckin, PlanStatus } from '@egoless-do/core';
import { useT, cs } from './helpers';
import { useWebStore } from '../store/useWebStore';
import { ChevronLeft } from 'lucide-react';

const STATUS_COLORS: Record<PlanStatus, string> = {
  not_started: COLORS.GRAY, in_progress: COLORS.GREEN, paused: COLORS.YELLOW,
  completed: COLORS.BLUE, cancelled: COLORS.RED, delayed: COLORS.ORANGE,
};

function StatusLabel({ status, T }: { status: PlanStatus; T: (k: string) => string }) {
  const key = `planStatus${status.charAt(0).toUpperCase() + status.slice(1).replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())}`;
  return (
    <span style={{
      fontSize: FONT_BADGE, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
      background: `${STATUS_COLORS[status]}20`, color: STATUS_COLORS[status],
    }}>{T(key)}</span>
  );
}

function Heatmap({ checkins, items, plan, theme }: { checkins: PlanItemCheckin[]; items: PlanItem[]; plan: Plan; theme: string }) {
  const TH = THEMES[theme as keyof typeof THEMES] ?? THEMES.dark;
  const days: { date: string; rate: number }[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const start = new Date(plan.startDate);
  const end = new Date(plan.endDate > today ? today : plan.endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    const activeItems = items.filter(i => !i.deleted && dateStr >= i.startDate && dateStr <= i.endDate);
    if (activeItems.length === 0) {
      days.push({ date: dateStr, rate: -1 });
    } else {
      const done = activeItems.filter(i => checkins.some(c => c.planItemId === i.id && c.date === dateStr && c.done)).length;
      days.push({ date: dateStr, rate: done / activeItems.length });
    }
  }

  const color = (rate: number) => {
    if (rate < 0) return TH.border;
    if (rate >= 0.8) return COLORS.GREEN;
    if (rate >= 0.5) return COLORS.YELLOW;
    if (rate > 0) return COLORS.RED;
    return `${TH.border}80`;
  };

  return (
    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
      {days.map((d, i) => (
        <div key={i} title={`${d.date} ${d.rate >= 0 ? Math.round(d.rate * 100) + '%' : '-'}`}
          style={{ width: 16, height: 16, borderRadius: 3, background: color(d.rate) }} />
      ))}
    </div>
  );
}

export default function PlanDetailPage({ planId, onClose }: { planId: string; onClose: () => void }) {
  const store = useWebStore();
  const TH = THEMES[store.theme];
  const P = TH.primary;
  const T = useT();
  const today = new Date().toISOString().slice(0, 10);

  const plan = useMemo(() => store.plans.find(p => p.id === planId), [store.plans, planId]);
  const items = useMemo(() => getPlanItems(store.planItems, planId), [store.planItems, planId]);
  const checkins = store.planItemCheckins ?? [];
  const progress = plan ? computePlanProgress(plan, items) : 0;

  if (!plan) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: TH.bg, overflowY: 'auto' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px' }}>
          <div style={{ padding: '20px 0 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: FONT_BACK, cursor: 'pointer' }}><ChevronLeft size={20} /></button>
            <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text }}>{T('planDetail') || '计划详情'}</div>
          </div>
          <div style={{ ...cs(TH), textAlign: 'center', padding: 32, color: TH.sub }}>计划不存在</div>
        </div>
      </div>
    );
  }

  const totalDays = Math.round((new Date(plan.endDate).getTime() - new Date(plan.startDate).getTime()) / 86400000) + 1;
  const elapsed = Math.max(0, Math.round((new Date(today > plan.endDate ? plan.endDate : today).getTime() - new Date(plan.startDate).getTime()) / 86400000) + 1);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: TH.bg, overflowY: 'auto' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px' }}>
        <div style={{ padding: '20px 0 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: FONT_BACK, cursor: 'pointer' }}><ChevronLeft size={20} /></button>
          <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text }}>{plan.name}</div>
          <div style={{ flex: 1 }} />
          <StatusLabel status={plan.status} T={T} />
        </div>

        {/* Plan info */}
        <div style={cs(TH)}>
          {plan.slogan && <div style={{ fontSize: FONT_SUB, color: TH.sub, fontStyle: 'italic', marginBottom: 8 }}>&ldquo;{plan.slogan}&rdquo;</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1, height: 6, background: TH.border, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: 6, width: `${progress}%`, background: P, borderRadius: 3, transition: 'width .3s' }} />
            </div>
            <span style={{ fontSize: FONT_BODY, fontWeight: 600, color: TH.text }}>{progress}%</span>
          </div>
          <div style={{ fontSize: FONT_SUB, color: TH.sub }}>
            {T('planStartDate')}: {plan.startDate} | {T('planEndDate')}: {plan.endDate} | {elapsed}/{totalDays} {T('planDays')}
          </div>
        </div>

        {/* Goal */}
        <div style={cs(TH)}>
          <div style={{ fontSize: FONT_SUB, fontWeight: 600, color: TH.sub, marginBottom: 4 }}>{T('planGoal')}</div>
          <div style={{ fontSize: FONT_BODY, color: TH.text }}>{plan.goal}</div>
        </div>

        {/* Items */}
        <div style={cs(TH)}>
          <div style={{ fontSize: FONT_BODY, fontWeight: 600, color: TH.text, marginBottom: 12 }}>{T('planItems')}</div>
          {items.length === 0 ? (
            <div style={{ fontSize: FONT_SUB, color: TH.sub, textAlign: 'center', padding: 12 }}>{T('planNoItems')}</div>
          ) : (
            items.map(item => {
              const itemCheckins = checkins.filter(c => c.planItemId === item.id && c.done);
              return (
                <div key={item.id} style={{
                  padding: '10px 12px', marginBottom: 8, borderRadius: 10,
                  background: `${TH.card}80`, border: `1px solid ${TH.border}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: FONT_BODY, fontWeight: 600, color: TH.text, flex: 1 }}>{item.name}</span>
                    <span style={{
                      fontSize: FONT_BADGE, fontWeight: 600, padding: '2px 6px', borderRadius: 6,
                      background: `${STATUS_COLORS[item.status]}20`, color: STATUS_COLORS[item.status],
                    }}>{item.status === 'in_progress' ? '进行中' : item.status === 'completed' ? '已完成' : item.status === 'paused' ? '已暂停' : item.status === 'delayed' ? '已延期' : '未开始'}</span>
                  </div>
                  {item.description && <div style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 4 }}>{item.description}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 4, background: TH.border, borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: 4, width: `${item.progress}%`, background: P, borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: FONT_SUB, color: TH.sub }}>{item.progress}%</span>
                    <span style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('planCheckinDays')}: {itemCheckins.length}</span>
                  </div>
                  {item.contentUrl && (
                    <a href={item.contentUrl} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: FONT_SUB, color: P, textDecoration: 'none', marginTop: 4, display: 'inline-block' }}>
                      {item.contentUrl}
                    </a>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Heatmap */}
        <div style={cs(TH)}>
          <div style={{ fontSize: FONT_BODY, fontWeight: 600, color: TH.text, marginBottom: 12 }}>{T('planHeatmap')}</div>
          <Heatmap checkins={checkins} items={items} plan={plan} theme={store.theme} />
        </div>
      </div>
    </div>
  );
}
