'use client';

import { useState, useMemo } from 'react';
import { COLORS, dateStr, getTodayFoodLog, getActivePlan, getTodayItems, getTodayCustomTodos, FONT_BODY, FONT_BUTTON, FONT_TITLE, FONT_SUB, FONT_BACK, FONT_BADGE } from '@egoless-do/core';
import type { CheckinEntry } from '@egoless-do/core';
import { RowItem, Checkbox, useTheme, useT, inp } from './helpers';
import { useWebStore } from '../store/useWebStore';
import { ChevronLeft, Utensils, PersonStanding, Star, ClipboardList, CheckCircle2, Circle, X, Check, Pencil, Droplets, Scale, Sparkles } from 'lucide-react';

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
  const dailyCustomTodos = useMemo(() => {
    if (!activePlan) return [];
    return getTodayCustomTodos(store.dailyCustomTodos ?? [], activePlan.id, today);
  }, [store.dailyCustomTodos, activePlan, today]);
  const [planToggles, setPlanToggles] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (!activePlan) return initial;
    const items = (store.planItems ?? []).filter(i => !i.deleted && i.planId === activePlan.id);
    const checkins = store.planItemCheckins ?? [];
    items.forEach(item => {
      // manual 和 reflection 类型支持手动切换
      if (item.link === 'manual' || item.link === 'reflection') {
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
      <div style={{ padding: '16px 16px 32px', maxWidth: 500, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <button onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: FONT_BACK, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}><ChevronLeft size={22} /></button>
          <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text }}>{T('checkinTitle')}</div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: FONT_SUB, color: TH.sub }}>{today}</div>
        </div>

        {/* Status buttons - TOP */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16, marginBottom: 20 }}>
          <button onClick={() => setLocalDone(false)}
            style={{
              flex: 1, padding: '14px 0', borderRadius: 12, fontWeight: 700, fontSize: FONT_BUTTON, cursor: 'pointer',
              border: '2px solid', borderColor: localDone === false ? '#C53364' : TH.border,
              background: localDone === false ? 'rgba(197,51,100,0.1)' : 'transparent',
              color: localDone === false ? '#C53364' : TH.sub,
              transition: 'all .2s',
            }}>
            <X size={18} style={{verticalAlign:'middle',marginRight:4}} /> {T('checkinNotDone')}
          </button>
          <button onClick={() => setLocalDone(true)}
            style={{
              flex: 1, padding: '14px 0', borderRadius: 12, fontWeight: 700, fontSize: FONT_BUTTON, cursor: 'pointer',
              border: '2px solid', borderColor: localDone === true ? '#17EAD9' : TH.border,
              background: localDone === true ? 'rgba(23,234,217,0.1)' : 'transparent',
              color: localDone === true ? '#17EAD9' : TH.sub,
              transition: 'all .2s',
            }}>
            <Check size={18} style={{verticalAlign:'middle',marginRight:4}} /> {T('checkinDone')}
          </button>
        </div>

        {/* Tasks section - merged */}
        <div style={{ background: TH.card, borderRadius: 16, padding: '16px', marginBottom: 12, border: `1px solid ${TH.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <ClipboardList size={18} style={{ color: P }} />
            <span style={{ fontWeight: 600, fontSize: FONT_BODY, color: TH.text }}>{T('checkinPractice')} & {T('planTodoList')}</span>
          </div>

          {/* Practices */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 8, paddingLeft: 4 }}>{T('checkinPractice')}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[{ key: 'sit' as const, icon: <PersonStanding size={16} style={{verticalAlign:'middle', color: P}} />, label: T('checkinSit') }, { key: 'stand' as const, icon: <PersonStanding size={16} style={{verticalAlign:'middle', color: P}} />, label: T('checkinStand') }, { key: 'chant' as const, icon: <Star size={16} style={{verticalAlign:'middle', color: P}} />, label: T('checkinSutra') }].map(({ key, icon, label }) => (
                <button key={key} onClick={() => setPractices((p) => ({ ...p, [key]: !p[key] }))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10,
                    border: `1px solid ${practices[key] ? P : TH.border}`,
                    background: practices[key] ? `${P}15` : 'transparent',
                    color: practices[key] ? P : TH.text,
                    cursor: 'pointer', fontSize: FONT_BODY, transition: 'all .15s',
                  }}>
                  {icon} {label}
                  {practices[key] && <Check size={14} style={{ marginLeft: 2 }} />}
                </button>
              ))}
            </div>
          </div>

          {/* Plan items */}
          {todayPlanItems.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 8, paddingLeft: 4 }}>{T('planTodoList')}</div>
              {todayPlanItems.map(item => {
                const storeDone = planCheckins.some(c => c.planItemId === item.id && c.date === today && c.done);
                const autoChecked = storeDone && planCheckins.some(c => c.planItemId === item.id && c.date === today && c.done && c.linkedModule);
                const done = planToggles[item.id] ?? storeDone;
                return (
                  <div key={item.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 4px', borderRadius: 8,
                    background: done ? `${P}10` : 'transparent',
                    marginBottom: 4,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                      <Checkbox on={done} onChange={() => setPlanToggles(prev => ({ ...prev, [item.id]: !done }))} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: FONT_BODY, color: done ? TH.sub : TH.text,
                          textDecoration: done ? 'line-through' : 'none',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{item.name}</div>
                      </div>
                      {autoChecked && (
                        <span style={{ fontSize: FONT_BADGE, color: P, fontWeight: 500, flexShrink: 0 }}>
                          <CheckCircle2 size={10} style={{verticalAlign:'middle'}} />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Custom todos */}
          {dailyCustomTodos.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 8, paddingLeft: 4 }}>{T('planDailyCustomTodos')}</div>
              {dailyCustomTodos.map(todo => (
                <div key={todo.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 4px', borderRadius: 8,
                  background: todo.done ? `${P}10` : 'transparent',
                  marginBottom: 4,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Checkbox on={todo.done} onChange={() => store.toggleDailyCustomTodo(todo.id)} />
                    <div style={{
                      fontSize: FONT_BODY, color: todo.done ? TH.sub : TH.text,
                      textDecoration: todo.done ? 'line-through' : 'none',
                    }}>{todo.name}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Habits */}
          {(store.habits ?? []).filter((h) => h.status === 'inProgress').length > 0 && (
            <div>
              <div style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 8, paddingLeft: 4 }}>{T('checkinHabitCheck')}</div>
              {(store.habits ?? []).filter((h) => h.status === 'inProgress').map(h => (
                <div key={h.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 4px', borderRadius: 8,
                  marginBottom: 4,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Checkbox on={!!habitCheckins[h.id]} onChange={() => setHabitCheckins((c) => ({ ...c, [h.id]: !c[h.id] }))} />
                    <div>
                      <div style={{ fontSize: FONT_BODY, color: TH.text }}>{h.name}</div>
                      <div style={{ fontSize: FONT_SUB, color: TH.sub }}>{h.streak} {T('checkinStreak')}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Submit button - inside tasks card */}
          <button onClick={submit}
            style={{
              width: '100%', padding: 14, borderRadius: 12, border: 'none', marginTop: 12,
              background: localDone === true
                ? 'linear-gradient(135deg, #17EAD9, #6078EA)'
                : localDone === false
                  ? 'linear-gradient(135deg, #622774, #C53364)'
                  : P,
              color: '#fff', fontWeight: 700, fontSize: FONT_BUTTON, cursor: 'pointer',
              transition: 'all .2s',
            }}>
            {localDone === true ? T('checkinSubmit') : localDone === false ? T('checkinSave') : T('checkinSelectStatus')}
          </button>
        </div>

        {/* Data section - merged */}
        <div style={{ background: TH.card, borderRadius: 16, padding: '16px', marginBottom: 12, border: `1px solid ${TH.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Scale size={18} style={{ color: P }} />
            <span style={{ fontWeight: 600, fontSize: FONT_BODY, color: TH.text }}>{T('checkinWeight')} / {T('checkinWater')} / {T('checkinFood')}</span>
          </div>

          {/* Weight */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${TH.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Scale size={16} style={{ color: P }} />
              <span style={{ color: TH.text }}>{T('checkinWeight')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
                style={{ width: 60, textAlign: 'center', border: `1px solid ${TH.border}`, borderRadius: 8, outline: 'none', fontSize: FONT_BODY, fontWeight: 600, padding: '6px 0', background: TH.cardSolid, color: TH.text }} />
              <span style={{ color: TH.sub, fontSize: FONT_SUB }}>{weightUnit === 'kg' ? T('checkinKg') : T('checkinLb')}</span>
            </div>
          </div>

          {/* Water */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${TH.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Droplets size={16} style={{ color: P }} />
              <span style={{ color: TH.text }}>{T('checkinWater')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="number" value={waterMl || ''} onChange={(e) => setWaterMl(Math.max(0, parseInt(e.target.value) || 0))} placeholder="0"
                style={{ width: 60, textAlign: 'center', border: `1px solid ${TH.border}`, borderRadius: 8, outline: 'none', fontSize: FONT_BODY, fontWeight: 600, padding: '6px 0', background: TH.cardSolid, color: TH.text }} />
              <span style={{ color: TH.sub, fontSize: FONT_SUB }}>ml</span>
              <button onClick={() => setWaterMl(w => w + 250)}
                style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: `${P}20`, color: P, fontSize: FONT_SUB, fontWeight: 600, cursor: 'pointer' }}>+250</button>
            </div>
          </div>

          {/* Food */}
          <div style={{ padding: '10px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Utensils size={16} style={{ color: P }} />
                <span style={{ color: TH.text }}>{T('checkinFood')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: FONT_TITLE, fontWeight: 600, color: P }}>{totalCal}</span>
                <span style={{ color: TH.sub, fontSize: FONT_SUB }}>kcal</span>
                <button onClick={() => setShowFoodAdd(!showFoodAdd)} style={{ width: 24, height: 24, borderRadius: 12, border: 'none', background: P, color: '#fff', fontSize: FONT_BUTTON, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              </div>
            </div>
            {showFoodAdd && (
              <div style={{ marginTop: 10, padding: 10, background: TH.cardSolid, borderRadius: 10, border: `1px solid ${TH.border}` }}>
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

        {/* Note section */}
        <div style={{ background: TH.card, borderRadius: 16, padding: '16px', marginBottom: 12, border: `1px solid ${TH.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Sparkles size={18} style={{ color: P }} />
            <span style={{ fontWeight: 600, fontSize: FONT_BODY, color: TH.text }}>{T('checkinNote')}</span>
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={T('checkinNotePlaceholder')} rows={3}
            style={{ width: '100%', background: TH.cardSolid, border: `1px solid ${TH.border}`, borderRadius: 12, padding: '10px 12px', color: TH.text, fontSize: FONT_BODY, resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {/* Cancel button */}
        <button onClick={onClose}
          style={{ width: '100%', padding: 14, borderRadius: 12, border: `1px solid ${TH.border}`, background: 'transparent', color: TH.sub, fontSize: FONT_BUTTON, cursor: 'pointer' }}>
          {T('commonCancel')}
        </button>
      </div>
    </div>
  );
}
