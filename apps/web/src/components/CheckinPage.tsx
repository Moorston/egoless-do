'use client';

import { useState, useMemo } from 'react';
import { COLORS, dateStr, getTodayFoodLog, getActivePlan, getTodayItems, FONT_BODY, FONT_BUTTON, FONT_TITLE, FONT_SUB, FONT_BACK, FONT_BADGE } from '@egoless-do/core';
import type { CheckinEntry } from '@egoless-do/core';
import { RowItem, Toggle, useTheme, useT, inp } from './helpers';
import { useWebStore } from '../store/useWebStore';
import { ChevronLeft, Utensils, PersonStanding, Star, ClipboardList, CheckCircle2, Circle, X, Check, Pencil, Droplets, Scale, Sparkles, Lock } from 'lucide-react';

function parseExistingNote(raw: string): { userNote: string; practices: string[]; customs: string[]; fasted: boolean; waterMl: number; habits: string[] } {
  if (!raw) return { userNote: '', practices: [], customs: [], fasted: false, waterMl: 0, habits: [] };
  try {
    const data = JSON.parse(raw);
    if (typeof data === 'object' && data !== null) {
      return {
        userNote: data.note ?? '',
        practices: data.practices ?? [],
        customs: data.customs ?? [],
        fasted: !!data.fasted,
        waterMl: typeof data.water === 'number' ? data.water : 0,
        habits: data.habits ?? [],
      };
    }
  } catch {
    // legacy format
  }
  return { userNote: raw, practices: [], customs: [], fasted: false, waterMl: 0, habits: [] };
}

export default function CheckinPage({ onClose }: { onClose: () => void }) {
  const store = useWebStore();
  const { TH, P } = useTheme();
  const T = useT();
  const weightUnit = store.weightUnit;

  const today = dateStr();
  const existing = useMemo(() =>
    (store.checkinHistory ?? []).find((c: CheckinEntry) => c.date === today),
    [store.checkinHistory, today],
  );
  const parsed = useMemo(() => parseExistingNote(existing?.note ?? ''), [existing]);

  const totalCal = useMemo(() => getTodayFoodLog(store.foodLog ?? []).reduce((a, f) => a + f.calories, 0), [store.foodLog]);

  const [weight, setWeight] = useState(() => existing?.weight != null ? String(existing.weight) : '65');
  const [waterMl, setWaterMl] = useState(() => parsed.waterMl || (store.waterMl ?? 0));
  const [showFoodAdd, setShowFoodAdd] = useState(false);
  const [foodName, setFoodName] = useState('');
  const [foodCal, setFoodCal] = useState('');
  const [foodNote, setFoodNote] = useState('');
  const [practices, setPractices] = useState(() => ({
    sit: parsed.practices.includes('sit'),
    stand: parsed.practices.includes('stand'),
    chant: parsed.practices.includes('chant'),
  }));
  const [note, setNote] = useState(() => parsed.userNote);
  const [freeItems, setFreeItems] = useState<{ id: string; name: string }[]>(
    () => parsed.customs.map((name, i) => ({ id: `existing-${i}`, name })),
  );
  const [freeCheckins, setFreeCheckins] = useState<Record<string, boolean>>(
    () => Object.fromEntries(parsed.customs.map((_, i) => [`existing-${i}`, true])),
  );
  const [localDone, setLocalDone] = useState<boolean | null>(() => existing?.done ?? null);
  const [habitCheckins, setHabitCheckins] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    (store.habits ?? []).filter(h => h.status === 'inProgress').forEach(h => {
      initial[h.id] = h.checkedDates?.includes(today) ?? false;
    });
    return initial;
  });

  // Today's plan items
  const activePlan = useMemo(() => getActivePlan(store.plans ?? []), [store.plans]);
  const todayPlanItems = useMemo(() => {
    if (!activePlan) return [];
    return getTodayItems(store.planItems ?? [], activePlan, today);
  }, [store.planItems, activePlan, today]);
  const planCheckins = store.planItemCheckins ?? [];
  const [planToggles, setPlanToggles] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (!activePlan) return initial;
    const items = (store.planItems ?? []).filter(i => !i.deleted && i.planId === activePlan.id);
    const checkins = store.planItemCheckins ?? [];
    items.forEach(item => {
      if (item.link === 'manual') {
        initial[item.id] = checkins.some(c => c.planItemId === item.id && c.date === today && c.done);
      }
    });
    return initial;
  });

  const submit = () => {
    if (localDone === null) return;
    Object.entries(habitCheckins).forEach(([id, checked]) => {
      const habit = (store.habits ?? []).find(h => h.id === id);
      const alreadyDone = habit?.checkedDates?.includes(today) ?? false;
      if (checked !== alreadyDone) store.checkinHabit(id, today);
    });
    Object.entries(planToggles).forEach(([itemId, desired]) => {
      const current = planCheckins.some(c => c.planItemId === itemId && c.date === today && c.done);
      if (desired && !current) store.checkinPlanItem(itemId);
      if (!desired && current) store.uncheckinPlanItem(itemId);
    });
    if (waterMl > 0) {
      store.resetWater();
      store.addWater(waterMl);
    }
    const noteData: Record<string, unknown> = {};
    if (note) noteData.note = note;
    if (waterMl > 0) noteData.water = waterMl;
    const pr: string[] = [];
    if (practices.sit) pr.push('sit');
    if (practices.stand) pr.push('stand');
    if (practices.chant) pr.push('chant');
    if (pr.length) noteData.practices = pr;
    const customs = freeItems.filter(item => freeCheckins[item.id] && item.name).map(item => item.name);
    if (customs.length) noteData.customs = customs;
    const checkedHabits = Object.entries(habitCheckins)
      .filter(([, checked]) => checked)
      .map(([id]) => (store.habits ?? []).find(h => h.id === id)?.name)
      .filter(Boolean);
    if (checkedHabits.length) noteData.habits = checkedHabits;
    if (totalCal > 0) noteData.food = totalCal;
    const weightNum = weight ? parseFloat(weight) : undefined;
    store.submitCheckin(localDone, JSON.stringify(noteData), undefined, weightNum);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: TH.bg, overflowY: 'auto', WebkitOverflowScrolling: 'touch', fontFamily: '-apple-system,system-ui,sans-serif', color: TH.text, fontSize: FONT_BODY }}>
      <div style={{ padding: '16px 16px 32px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <button onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: FONT_BACK, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}><ChevronLeft size={22} /></button>
          <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text }}>{T('checkinTitle')}</div>
        </div>
        <div style={{ textAlign: 'center', fontSize: FONT_BODY, color: TH.sub, marginBottom: 20 }}>{T('checkinSubtitle')}</div>

        {/* Today's checkin: weight + water + food */}
        <div style={{ borderTop: `1px solid ${TH.border}`, borderBottom: `1px solid ${TH.border}` }}>
        <div style={{ padding: '13px 0' }}>
          {/* Weight */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: `1px solid ${TH.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: FONT_BODY }}><Scale size={16} style={{verticalAlign:'middle'}} /></span><span style={{ color: TH.text }}>{T('checkinWeight')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
                style={{ width: 60, textAlign: 'center', border: `1px solid ${TH.border}`, borderRadius: 8, outline: 'none', fontSize: FONT_BODY, fontWeight: 600, padding: '6px 0', background: TH.card, color: TH.text }} />
              <span style={{ color: TH.sub, fontSize: FONT_SUB }}>{weightUnit === 'kg' ? T('checkinKg') : T('checkinLb')}</span>
            </div>
          </div>

          {/* Water */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: `1px solid ${TH.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: FONT_BODY }}><Droplets size={16} style={{verticalAlign:'middle'}} /></span><span style={{ color: TH.text }}>{T('checkinWater')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="number" value={waterMl || ''} onChange={(e) => setWaterMl(Math.max(0, parseInt(e.target.value) || 0))} placeholder="0"
                style={{ width: 60, textAlign: 'center', border: `1px solid ${TH.border}`, borderRadius: 8, outline: 'none', fontSize: FONT_BODY, fontWeight: 600, padding: '6px 0', background: TH.card, color: TH.text }} />
              <span style={{ color: TH.sub, fontSize: FONT_SUB }}>ml</span>
            </div>
          </div>

          {/* Food */}
          <div style={{ padding: '13px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: FONT_BODY }}><Utensils size={16} style={{verticalAlign:'middle'}} /></span><span style={{ color: TH.text }}>{T('checkinFood')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: FONT_TITLE, fontWeight: 600, color: P }}>{totalCal}</span>
                <span style={{ color: TH.sub, fontSize: FONT_SUB }}>kcal</span>
                <button onClick={() => setShowFoodAdd(!showFoodAdd)} style={{ width: 24, height: 24, borderRadius: 12, border: 'none', background: P, color: '#fff', fontSize: FONT_BUTTON, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              </div>
            </div>
            {showFoodAdd && (
              <div style={{ marginTop: 10, padding: 10, background: TH.card, borderRadius: 10, border: `1px solid ${TH.border}` }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input value={foodName} onChange={(e) => setFoodName(e.target.value)} placeholder={T('foodName')}
                    style={{ ...inp(TH), flex: 2, padding: '7px 10px' } as React.CSSProperties} />
                  <input type="number" value={foodCal} onChange={(e) => setFoodCal(e.target.value)} placeholder={T('calories2')}
                    style={{ ...inp(TH), flex: 1, padding: '7px 10px' } as React.CSSProperties} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { if (foodName.trim()) { store.addFood({ name: foodName, calories: +foodCal || 0, note: foodNote, timestamp: Date.now() }); setFoodName(''); setFoodCal(''); setFoodNote(''); setShowFoodAdd(false); } }}
                    style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', background: P, color: '#fff', fontWeight: 600, fontSize: FONT_BUTTON, cursor: 'pointer' }}>{T('confirm')}</button>
                  <button onClick={() => { setShowFoodAdd(false); setFoodName(''); setFoodCal(''); }}
                    style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${TH.border}`, background: 'transparent', color: TH.sub, fontSize: FONT_BUTTON, cursor: 'pointer' }}>{T('commonCancel')}</button>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>

        {/* Practices */}
        <div style={{ borderTop: `1px solid ${TH.border}`, borderBottom: `1px solid ${TH.border}` }}>
        <div style={{ padding: '13px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: FONT_BODY }}><Star size={16} style={{verticalAlign:'middle'}} /></span><span style={{ fontWeight: 600, color: TH.text }}>{T('checkinPractice')}</span>
          </div>
          {[{ key: 'sit' as const, icon: <PersonStanding size={16} style={{verticalAlign:'middle'}} />, label: T('checkinSit') }, { key: 'stand' as const, icon: <PersonStanding size={16} style={{verticalAlign:'middle'}} />, label: T('checkinStand') }, { key: 'chant' as const, icon: <Star size={16} style={{verticalAlign:'middle'}} />, label: T('checkinSutra') }].map(({ key, icon, label }, i, arr) => (
            <RowItem key={key} icon={icon} label={label} last={i === arr.length - 1}
              right={<Toggle on={practices[key]} onChange={() => setPractices((p) => ({ ...p, [key]: !p[key] }))} />} />
          ))}
        </div>
        </div>

        {/* Today's plan items */}
        {todayPlanItems.length > 0 && (
          <div style={{ padding: '13px 0', borderBottom: `1px solid ${TH.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: FONT_BODY }}><ClipboardList size={16} style={{verticalAlign:'middle'}} /></span><span style={{ fontWeight: 600, color: TH.text }}>{T('planTodoList')}</span>
            </div>
            {todayPlanItems.map(item => {
              const done = planCheckins.some(c => c.planItemId === item.id && c.date === today && c.done);
              const autoChecked = done && planCheckins.some(c => c.planItemId === item.id && c.date === today && c.done && c.linkedModule);
              return (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${TH.border}`, opacity: autoChecked ? 0.7 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: FONT_BODY }}><ClipboardList size={16} style={{verticalAlign:'middle'}} /></span>
                    <div>
                      <div style={{ fontSize: FONT_BODY, color: TH.text }}>{item.name}</div>
                      <div style={{ fontSize: FONT_SUB, color: TH.sub }}>{item.link === 'manual' ? T('planLinkManual') : T(`planLink${item.link.charAt(0).toUpperCase() + item.link.slice(1)}`)}</div>
                    </div>
                  </div>
                  {autoChecked ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: FONT_BADGE, color: COLORS.GREEN, fontWeight: 600 }}>
                      <Lock size={14} style={{verticalAlign:'middle'}} /> {T('planAutoChecked')}
                    </span>
                  ) : (
                    <Toggle on={done} onChange={() => done ? store.uncheckinPlanItem(item.id) : store.checkinPlanItem(item.id)} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Habit checkin */}
        {(store.habits ?? []).filter((h) => h.status === 'inProgress').length > 0 && (
          <div style={{ padding: '13px 0', borderBottom: `1px solid ${TH.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: FONT_BODY }}><Star size={16} style={{verticalAlign:'middle'}} /></span><span style={{ fontWeight: 600, color: TH.text }}>{T('checkinHabitCheck')}</span>
            </div>
            {(store.habits ?? []).filter((h) => h.status === 'inProgress').map((h, i, arr) => (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i === arr.length - 1 ? 'none' : `1px solid ${TH.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: FONT_BODY }}><Star size={16} style={{verticalAlign:'middle'}} /></span>
                  <div>
                    <div style={{ fontSize: FONT_BODY, color: TH.text }}>{h.name}</div>
                    <div style={{ fontSize: FONT_SUB, color: TH.sub }}>{h.streak} {T('checkinStreak')}</div>
                  </div>
                </div>
                <Toggle on={!!habitCheckins[h.id]} onChange={() => setHabitCheckins((c) => ({ ...c, [h.id]: !c[h.id] }))} />
              </div>
            ))}
          </div>
        )}

        {/* Note */}
        <div style={{ padding: '14px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: FONT_BODY }}><Sparkles size={16} style={{verticalAlign:'middle'}} /></span>
            <span style={{ fontSize: FONT_BODY, fontWeight: 600, color: TH.text }}>{T('checkinNote')}</span>
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={T('checkinNotePlaceholder')} rows={3}
            style={{ width: '100%', background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 12, padding: '10px 12px', color: TH.text, fontSize: FONT_BODY, resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {/* Done / Not Done buttons */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <button onClick={() => setLocalDone(false)}
            style={{
              flex: 1, padding: '13px 0', borderRadius: 12, fontWeight: 700, fontSize: FONT_BUTTON, cursor: 'pointer',
              border: '2px solid', borderColor: localDone === false ? '#C53364' : TH.border,
              background: 'transparent', color: localDone === false ? '#C53364' : TH.sub,
            }}>
            <X size={16} style={{verticalAlign:'middle',marginRight:4}} /> {T('checkinNotDone')}
          </button>
          <button onClick={() => setLocalDone(true)}
            style={{
              flex: 1, padding: '13px 0', borderRadius: 12, fontWeight: 700, fontSize: FONT_BUTTON, cursor: 'pointer',
              border: '2px solid', borderColor: localDone === true ? '#17EAD9' : TH.border,
              background: 'transparent', color: localDone === true ? '#17EAD9' : TH.sub,
            }}>
            <Check size={16} style={{verticalAlign:'middle',marginRight:4}} /> {T('checkinDone')}
          </button>
        </div>

        {/* Submit button */}
        <button onClick={submit}
          style={{
            width: '100%', padding: 14, borderRadius: 12, border: 'none', marginBottom: 10,
            background: localDone === true
              ? 'linear-gradient(135deg, #17EAD9, #6078EA)'
              : localDone === false
                ? 'linear-gradient(135deg, #622774, #C53364)'
                : P,
            color: '#fff', fontWeight: 700, fontSize: FONT_BUTTON, cursor: 'pointer',
          }}>
          {localDone === true ? T('checkinSubmit') : localDone === false ? T('checkinSave') : T('checkinSelectStatus')}
        </button>

        {/* Cancel button */}
        <div style={{ padding: '12px 0' }}>
          <button onClick={onClose}
            style={{ width: '100%', padding: 14, borderRadius: 12, border: `1px solid ${TH.border}`, background: 'transparent', color: TH.sub, fontSize: FONT_BUTTON, cursor: 'pointer' }}>
            {T('commonCancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
