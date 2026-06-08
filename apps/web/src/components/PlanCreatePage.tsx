'use client';

import { useState, useMemo, useEffect } from 'react';
import { THEMES, COLORS, canEditPlan, dateStr, validatePlanForm, createNewItem, FONT_BODY, FONT_BUTTON, FONT_TITLE, FONT_SUB, FONT_BADGE, FONT_BACK, FONT_ERROR } from '@egoless-do/core';
import type { ItemForm, PlanItemLink } from '@egoless-do/core';
import { LINK_OPTIONS, PRIORITY_OPTIONS } from '@egoless-do/core';
import { useT, cs, inp } from './helpers';
import { useWebStore } from '../store/useWebStore';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import DateRangePickerModal from './DateRangePickerModal';

export default function PlanCreatePage({ planId, onClose }: { planId?: string; onClose: () => void }) {
  const store = useWebStore();
  const TH = THEMES[store.theme];
  const P = TH.primary;
  const T = useT();

  const existingPlan = planId ? (store.plans ?? []).find(p => p.id === planId) : null;
  const existingItems = planId ? (store.planItems ?? []).filter(i => i.planId === planId && !i.deleted) : [];

  const [name, setName] = useState(existingPlan?.name ?? '');
  const [goal, setGoal] = useState(existingPlan?.goal ?? '');
  const [slogan, setSlogan] = useState(existingPlan?.slogan ?? '');
  const [startDate, setStartDate] = useState(existingPlan?.startDate ?? '');
  const [endDate, setEndDate] = useState(existingPlan?.endDate ?? '');
  const [items, setItems] = useState<ItemForm[]>(() =>
    existingItems.map(i => ({
      id: i.id, name: i.name, description: i.description,
      startDate: i.startDate, endDate: i.endDate, contentUrl: i.contentUrl,
      link: i.link, priority: i.priority ?? 'medium', targetMetric: i.targetMetric ?? '', linkConfig: i.linkConfig,
    }))
  );
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => new Set(existingItems.map(i => i.id)));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showRangePicker, setShowRangePicker] = useState(false);

  const isEdit = !!existingPlan;

  // Auto-adjust item dates when plan dates change
  useEffect(() => {
    if (!startDate && !endDate) return;
    setItems(prev => prev.map(item => {
      let changed = false;
      let s = item.startDate;
      let e = item.endDate;
      if (startDate && s && s < startDate) { s = startDate; changed = true; }
      if (endDate && e && e > endDate) { e = endDate; changed = true; }
      if (s && e && e < s) { e = s; changed = true; }
      return changed ? { ...item, startDate: s, endDate: e } : item;
    }));
  }, [startDate, endDate]);

  const validate = (): boolean => {
    const e = validatePlanForm({ name, goal, startDate, endDate, items }, T);
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const [showActiveAlert, setShowActiveAlert] = useState(false);

  const handleSave = () => {
    if (!validate()) return;
    // Check if there's already an active plan (not_started, in_progress, paused)
    if (!isEdit) {
      const activePlan = (store.plans ?? []).find(p =>
        !p.deleted && (p.status === 'not_started' || p.status === 'in_progress' || p.status === 'paused')
      );
      if (activePlan) {
        setShowActiveAlert(true);
        return;
      }
    }
    if (isEdit && planId) {
      store.updatePlan(planId, { name, goal, slogan, startDate, endDate });
      const existingIds = new Set(existingItems.map(i => i.id));
      const currentIds = new Set(items.map(i => i.id));
      // Delete removed existing items
      existingIds.forEach(id => {
        if (!currentIds.has(id)) store.deletePlanItem(id);
      });
      items.forEach((item, idx) => {
        if (existingIds.has(item.id)) {
          store.updatePlanItem(item.id, {
            name: item.name, description: item.description,
            startDate: item.startDate, endDate: item.endDate,
            contentUrl: item.contentUrl, link: item.link, priority: item.priority, targetMetric: item.targetMetric, linkConfig: item.linkConfig,
            order: idx,
          });
        } else {
          store.addPlanItem({
            planId, name: item.name, description: item.description,
            startDate: item.startDate, endDate: item.endDate,
            contentUrl: item.contentUrl, link: item.link, priority: item.priority, targetMetric: item.targetMetric, linkConfig: item.linkConfig,
            order: idx,
          });
        }
      });
    } else {
      const newPlanId = store.addPlan({ name, goal, slogan, startDate, endDate });
      if (newPlanId) {
        items.forEach((item, idx) => {
          store.addPlanItem({
            planId: newPlanId, name: item.name, description: item.description,
            startDate: item.startDate, endDate: item.endDate,
            contentUrl: item.contentUrl, link: item.link, priority: item.priority, targetMetric: item.targetMetric, linkConfig: item.linkConfig,
            order: idx,
          });
        });
      }
    }
    onClose();
  };

  const addItem = () => {
    const newItem = createNewItem(startDate, endDate);
    setItems(prev => [...prev, newItem]);
    setExpandedItems(prev => new Set(prev).add(newItem.id));
  };

  const removeItem = (id: string) => {
    if (!window.confirm(T('planDeleteItemConfirm'))) return;
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateItem = (id: string, patch: Partial<ItemForm>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  };

  const toggleItem = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: TH.bg, overflowY: 'auto' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 80px' }}>
        <div style={{ padding: '20px 0 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: FONT_BACK, cursor: 'pointer' }}><ChevronLeft size={20} /></button>
          <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text }}>{isEdit ? T('planEditTitle') : T('planCreate')}</div>
        </div>

        {/* Plan basic info */}
        <div style={cs(TH)}>
          <div style={{ fontSize: FONT_SUB, fontWeight: 600, color: TH.sub, marginBottom: 4 }}>{T('planName')} *</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder={T('planName')}
            style={{ ...inp(TH), marginBottom: errors.name ? 4 : 12, borderColor: errors.name ? COLORS.RED : undefined }} />
          {errors.name && <div style={{ fontSize: FONT_ERROR, color: COLORS.RED, marginBottom: 8 }}>{errors.name}</div>}

          <div style={{ fontSize: FONT_SUB, fontWeight: 600, color: TH.sub, marginBottom: 4 }}>{T('planGoal')} *</div>
          <textarea value={goal} onChange={e => setGoal(e.target.value)} placeholder={T('planGoal')}
            style={{ ...inp(TH), minHeight: 60, resize: 'vertical', marginBottom: errors.goal ? 4 : 12, borderColor: errors.goal ? COLORS.RED : undefined }} />
          {errors.goal && <div style={{ fontSize: FONT_ERROR, color: COLORS.RED, marginBottom: 8 }}>{errors.goal}</div>}

          <div style={{ fontSize: FONT_SUB, fontWeight: 600, color: TH.sub, marginBottom: 4 }}>{T('planSlogan')}</div>
          <input value={slogan} onChange={e => setSlogan(e.target.value)} placeholder={T('planSlogan')}
            style={{ ...inp(TH), marginBottom: 12 }} />

          <div style={{ fontSize: FONT_SUB, fontWeight: 600, color: TH.sub, marginBottom: 6 }}>{T('planPeriod')}</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {([
              { key: '1m', months: 1, label: T('planPeriod1m') },
              { key: '3m', months: 3, label: T('planPeriod3m') },
              { key: '6m', months: 6, label: T('planPeriod6m') },
              { key: '1y', months: 12, label: T('planPeriod1y') },
            ] as const).map(opt => (
              <button
                key={opt.key}
                onClick={() => {
                  const start = new Date();
                  const end = new Date(start);
                  end.setMonth(end.getMonth() + opt.months);
                  end.setDate(end.getDate() - 1);
                  setStartDate(dateStr(start));
                  setEndDate(dateStr(end));
                }}
                style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: FONT_SUB, fontWeight: 500,
                  background: TH.card, border: `1px solid ${TH.border}`, color: TH.sub, cursor: 'pointer',
                }}
              >{opt.label}</button>
            ))}
          </div>

          <div style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 4 }}>{T('planPeriod')} *</div>
          <div
            onClick={() => setShowRangePicker(true)}
            style={{
              ...inp(TH), cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderColor: (errors.startDate || errors.endDate) ? COLORS.RED : undefined,
            }}
          >
            <span style={{ color: (startDate && endDate) ? TH.text : TH.sub }}>
              {startDate && endDate ? `${startDate}  —  ${endDate}` : '选择计划日期范围'}
            </span>
            <span style={{ fontSize: FONT_SUB, color: TH.sub }}>📅</span>
          </div>
          {errors.startDate && <div style={{ fontSize: FONT_ERROR, color: COLORS.RED, marginTop: 4 }}>{errors.startDate}</div>}
          {errors.endDate && <div style={{ fontSize: FONT_ERROR, color: COLORS.RED, marginTop: 4 }}>{errors.endDate}</div>}
        </div>

        {/* Items */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '16px 0 8px' }}>
          <div style={{ fontSize: FONT_BUTTON, fontWeight: 600, color: TH.text }}>{T('planItems')}</div>
          <button onClick={addItem} style={{
            background: P, border: 'none', color: '#fff', fontSize: FONT_BADGE, fontWeight: 600,
            padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
          }}>+ {T('planAddItem')}</button>
        </div>

        {items.length === 0 && (
          <div style={{ ...cs(TH), textAlign: 'center', padding: 24, color: TH.sub, fontSize: FONT_BODY }}>
            {T('planNoItems')}
          </div>
        )}

        {items.map((item, idx) => {
          const isExpanded = expandedItems.has(item.id);
          return (
            <div key={item.id} style={{ ...cs(TH), padding: 0, overflow: 'hidden' }}>
              {/* Header */}
              <div
                onClick={() => toggleItem(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: FONT_SUB, color: TH.sub, transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}><ChevronRight size={14} style={{verticalAlign:'middle'}} /></span>
                <span style={{ flex: 1, fontSize: FONT_BODY, fontWeight: 600, color: TH.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.name || `${T('planItemName')} ${idx + 1}`}
                </span>
                {(() => { const p = PRIORITY_OPTIONS.find(o => o.value === (item.priority ?? 'medium')); return p ? <span style={{ width: 8, height: 8, borderRadius: 4, background: p.color, display: 'inline-block' }} /> : null; })()}
                <span style={{ fontSize: FONT_SUB, color: TH.sub }}>{item.link === 'manual' ? T('planLinkManual') : T(`planLink${item.link.charAt(0).toUpperCase() + item.link.slice(1)}`)}</span>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${TH.border}` }}>
                  <div style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 4, marginTop: 10 }}>{T('planItemName')} *</div>
                  <input value={item.name} onChange={e => updateItem(item.id, { name: e.target.value })}
                    placeholder={T('planItemName')}
                    style={{ ...inp(TH), marginBottom: 4, borderColor: errors[`item_${idx}_name`] ? COLORS.RED : undefined }} />
                  {errors[`item_${idx}_name`] && <div style={{ fontSize: FONT_ERROR, color: COLORS.RED, marginBottom: 6 }}>{errors[`item_${idx}_name`]}</div>}

                  <div style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 4 }}>{T('planPriority')}</div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    {PRIORITY_OPTIONS.map(opt => {
                      const active = (item.priority ?? 'medium') === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => updateItem(item.id, { priority: opt.value })}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '5px 12px', borderRadius: 8, fontSize: FONT_SUB, fontWeight: active ? 600 : 400,
                            background: active ? `${opt.color}20` : TH.card,
                            border: `1px solid ${active ? opt.color : TH.border}`,
                            color: active ? opt.color : TH.sub, cursor: 'pointer',
                          }}
                        >
                          <span style={{ width: 8, height: 8, borderRadius: 4, background: opt.color, display: 'inline-block' }} />
                          {T(opt.labelKey)}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ fontSize: FONT_SUB, color: errors[`item_${idx}_targetMetric`] ? COLORS.RED : TH.sub, marginBottom: 4 }}>{T('planItemTarget')} *</div>
                  <input value={item.targetMetric} onChange={e => updateItem(item.id, { targetMetric: e.target.value })}
                    placeholder={T('planItemTarget')}
                    style={{ ...inp(TH), borderColor: errors[`item_${idx}_targetMetric`] ? COLORS.RED : undefined, marginBottom: 8 }} />

                  <div style={{ fontSize: FONT_SUB, color: errors[`item_${idx}_description`] ? COLORS.RED : TH.sub, marginBottom: 4 }}>{T('planItemDesc')} *</div>
                  <textarea value={item.description} onChange={e => updateItem(item.id, { description: e.target.value })}
                    placeholder={T('planItemDesc')}
                    style={{ ...inp(TH), minHeight: 40, resize: 'vertical', borderColor: errors[`item_${idx}_description`] ? COLORS.RED : undefined, marginBottom: 8 }} />

                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 4 }}>{T('planItemStart')} *</div>
                      <input type="date" value={item.startDate}
                        min={startDate || undefined} max={endDate || undefined}
                        onChange={e => {
                          const d = e.target.value;
                          updateItem(item.id, { startDate: d, ...(item.endDate && item.endDate < d ? { endDate: d } : {}) });
                        }}
                        style={{ ...inp(TH), borderColor: errors[`item_${idx}_startDate`] ? COLORS.RED : undefined }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 4 }}>{T('planItemEnd')} *</div>
                      <input type="date" value={item.endDate}
                        min={item.startDate || startDate || undefined} max={endDate || undefined}
                        onChange={e => updateItem(item.id, { endDate: e.target.value })}
                        style={{ ...inp(TH), borderColor: errors[`item_${idx}_endDate`] ? COLORS.RED : undefined }} />
                    </div>
                  </div>
                  {(errors[`item_${idx}_startDate`] || errors[`item_${idx}_endDate`]) && (
                    <div style={{ fontSize: FONT_ERROR, color: COLORS.RED, marginBottom: 6 }}>
                      {errors[`item_${idx}_startDate`] || errors[`item_${idx}_endDate`]}
                    </div>
                  )}

                  <div style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 4 }}>{T('planItemContent')}</div>
                  <input value={item.contentUrl} onChange={e => updateItem(item.id, { contentUrl: e.target.value })}
                    placeholder="https://..."
                    style={{ ...inp(TH), marginBottom: 8 }} />

                  <div style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 4 }}>{T('planItemLink')}</div>
                  <select value={item.link} onChange={e => updateItem(item.id, { link: e.target.value as PlanItemLink, linkConfig: e.target.value === 'habit' ? item.linkConfig : undefined })}
                    style={{ ...inp(TH), marginBottom: 8 }}>
                    {LINK_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{T(opt.labelKey)}</option>
                    ))}
                  </select>

                  {item.link === 'habit' && (
                    <>
                      <div style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 4 }}>{T('planLinkHabit')}</div>
                      <select value={item.linkConfig?.habitId ?? ''} onChange={e => updateItem(item.id, { linkConfig: { ...item.linkConfig, habitId: e.target.value } })}
                        style={{ ...inp(TH), marginBottom: 8 }}>
                        <option value="">--</option>
                        {(store.habits ?? []).filter(h => !h.deleted).map(h => (
                          <option key={h.id} value={h.id}>{h.name}</option>
                        ))}
                      </select>
                    </>
                  )}

                  <button onClick={() => removeItem(item.id)} style={{
                    width: '100%', padding: '8px 0', borderRadius: 8, border: `1px solid ${COLORS.RED}40`,
                    background: 'transparent', color: COLORS.RED, fontSize: FONT_BADGE, cursor: 'pointer',
                  }}>{T('planDeleteItem')}</button>
                </div>
              )}
            </div>
          );
        })}

        {/* Add next task button */}
        {items.length > 0 && (
          <button onClick={addItem} style={{
            width: '100%', padding: '14px 0', borderRadius: 12, cursor: 'pointer',
            border: `1.5px dashed ${P}40`, background: 'transparent',
            color: P, fontSize: FONT_SUB, fontWeight: 600, marginTop: 4,
          }}>{T('planAddItemHint')}</button>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          style={{
            position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
            width: 'calc(100% - 32px)', maxWidth: 448, padding: 14, borderRadius: 14, border: 'none',
            background: P, color: '#fff', fontWeight: 700, fontSize: FONT_BUTTON, cursor: 'pointer', zIndex: 10,
          }}
        >{T('planSave')}</button>
      </div>

      {/* Date Range Picker Modal */}
      <DateRangePickerModal
        visible={showRangePicker}
        startDate={startDate}
        endDate={endDate}
        onClose={() => setShowRangePicker(false)}
        onConfirm={(start, end) => {
          setStartDate(start);
          setEndDate(end);
          setShowRangePicker(false);
        }}
      />

      {/* Active plan exists alert */}
      {showActiveAlert && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: TH.cardSolid, borderRadius: 20, padding: 24, width: '100%', maxWidth: 320, textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: FONT_TITLE, marginBottom: 12, color: TH.text }}>{T('planActiveExists')}</div>
            <button onClick={() => setShowActiveAlert(false)}
              style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: P, color: '#fff', fontWeight: 600, fontSize: FONT_BUTTON, cursor: 'pointer' }}>
              {T('confirm')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
