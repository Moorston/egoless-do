'use client';

import { useState, useMemo } from 'react';
import { COLORS, dateStr, getTodayFoodLog, getActivePlan, getTodayItems, FONT_BODY, FONT_BUTTON, FONT_TITLE, FONT_SUB, FONT_BACK, FONT_BADGE } from '@egoless-do/core';
import type { CheckinEntry } from '@egoless-do/core';
import { RowItem, Toggle, useTheme, useT, inp } from './helpers';
import { useWebStore } from '../store/useWebStore';
import { ChevronLeft, Hand, Utensils, PersonStanding, BookOpen, Star, ClipboardList, CheckCircle2, Circle, X, Check, Pencil, Droplets } from 'lucide-react';

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

  const today = dateStr();
  const existing = useMemo(() =>
    (store.checkinHistory ?? []).find((c: CheckinEntry) => c.date === today),
    [store.checkinHistory, today],
  );
  const parsed = useMemo(() => parseExistingNote(existing?.note ?? ''), [existing]);

  // Calculate today's total calories from foodLog
  const totalCal = useMemo(() => getTodayFoodLog(store.foodLog ?? []).reduce((a, f) => a + f.calories, 0), [store.foodLog]);

  const [weight, setWeight] = useState(() => existing?.weight != null ? String(existing.weight) : '65');
  const [fasted, setFasted] = useState(() => parsed.fasted);
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
  const [habitCheckins, setHabitCheckins] = useState<Record<string, boolean>>({});

  // Today's plan items (new plan system)
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

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: TH.bg, overflowY: 'auto', WebkitOverflowScrolling: 'touch', fontFamily: '-apple-system,system-ui,sans-serif', color: TH.text, fontSize: FONT_BODY }}>
      <div style={{ padding: '16px 16px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <button onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: FONT_BACK, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}><ChevronLeft size={22} /></button>
          <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text }}>{T('checkinTitle')}</div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: FONT_BODY, color: TH.sub, marginBottom: 6 }}>{T('checkinWeight')}</div>
          <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${TH.border}`, borderRadius: 10, background: TH.card }}>
            <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
              style={{ flex: 1, textAlign: 'center', border: 'none', outline: 'none', fontSize: FONT_BODY, fontWeight: 600, padding: '8px 0', background: 'transparent', color: TH.text }} />
            <span style={{ flex: 1, textAlign: 'center', color: TH.sub, fontSize: FONT_BODY, padding: '8px 0' }}>{T('checkinKg')}</span>
          </div>
        </div>

        <RowItem label={T('checkinAbstinence')} icon={<Hand size={18} style={{verticalAlign:'middle'}} />} right={<Toggle on={fasted} onChange={() => setFasted((v) => !v)} />} />
        
        {/* Today's food calories display */}
        <div style={{ padding: '13px 0', borderBottom: `1px solid ${TH.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: FONT_TITLE }}><Utensils size={18} style={{verticalAlign:'middle'}} /></span><span style={{ color: TH.text }}>{T('checkinFood')}</span>
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
                  style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', background: COLORS.ORANGE, color: '#fff', fontWeight: 600, fontSize: FONT_BUTTON, cursor: 'pointer' }}>{T('confirm')}</button>
                <button onClick={() => { setShowFoodAdd(false); setFoodName(''); setFoodCal(''); }}
                  style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${TH.border}`, background: 'transparent', color: TH.sub, fontSize: FONT_BUTTON, cursor: 'pointer' }}>{T('commonCancel')}</button>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '13px 0', borderBottom: `1px solid ${TH.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: FONT_TITLE }}><Droplets size={18} style={{verticalAlign:'middle'}} /></span><span style={{ color: TH.text }}>{T('checkinWater')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${TH.border}`, borderRadius: 10, background: TH.card }}>
            <input type="number" value={waterMl || ''} onChange={(e) => setWaterMl(Math.max(0, parseInt(e.target.value) || 0))} placeholder="0"
              style={{ flex: 1, textAlign: 'center', border: 'none', outline: 'none', fontSize: FONT_BODY, fontWeight: 600, padding: '8px 0', background: 'transparent', color: TH.text }} />
            <span style={{ flex: 1, textAlign: 'center', color: TH.sub, fontSize: FONT_BODY, padding: '8px 0' }}>ml</span>
          </div>
        </div>

        <div style={{ padding: '13px 0', borderBottom: `1px solid ${TH.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: FONT_TITLE }}><Star size={18} style={{verticalAlign:'middle'}} /></span><span style={{ fontWeight: 600, color: TH.text }}>{T('checkinPractice')}</span>
          </div>
          {[{ key: 'sit' as const, icon: <PersonStanding size={18} style={{verticalAlign:'middle'}} />, label: T('checkinSit') }, { key: 'stand' as const, icon: <PersonStanding size={18} style={{verticalAlign:'middle'}} />, label: T('checkinStand') }, { key: 'chant' as const, icon: <BookOpen size={18} style={{verticalAlign:'middle'}} />, label: T('checkinSutra') }].map(({ key, icon, label }, i, arr) => (
            <RowItem key={key} icon={icon} label={label} last={i === arr.length - 1}
              right={<Toggle on={practices[key]} onChange={() => setPractices((p) => ({ ...p, [key]: !p[key] }))} />} />
          ))}
        </div>

        {/* Today's plan items */}
        {todayPlanItems.length > 0 && (
          <div style={{ padding: '13px 0', borderBottom: `1px solid ${TH.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: FONT_TITLE }}><ClipboardList size={18} style={{verticalAlign:'middle'}} /></span><span style={{ fontWeight: 600, color: TH.text }}>{T('planTodoList')}</span>
            </div>
            {todayPlanItems.map(item => {
              const done = planCheckins.some(c => c.planItemId === item.id && c.date === today && c.done);
              const isManual = item.link === 'manual';
              return (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${TH.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: FONT_BODY }}><ClipboardList size={16} style={{verticalAlign:'middle'}} /></span>
                    <div>
                      <div style={{ fontSize: FONT_BODY, color: TH.text }}>{item.name}</div>
                      <div style={{ fontSize: FONT_SUB, color: TH.sub }}>{isManual ? T('planLinkManual') : T(`planLink${item.link.charAt(0).toUpperCase() + item.link.slice(1)}`)}</div>
                    </div>
                  </div>
                  {isManual ? (
                    <Toggle on={!!planToggles[item.id]} onChange={() => setPlanToggles((c) => ({ ...c, [item.id]: !c[item.id] }))} />
                  ) : (
                    <span style={{ fontSize: FONT_BODY, color: done ? COLORS.GREEN : TH.sub }}>{done ? <CheckCircle2 size={16} style={{verticalAlign:'middle'}} /> : <Circle size={16} style={{verticalAlign:'middle'}} />}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {(store.habits ?? []).filter((h) => h.status === 'inProgress').length > 0 && (
          <div style={{ padding: '13px 0', borderBottom: `1px solid ${TH.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: FONT_TITLE }}><Circle size={18} style={{verticalAlign:'middle'}} /></span><span style={{ fontWeight: 600, color: TH.text }}>{T('checkinHabitCheck')}</span>
            </div>
            {(store.habits ?? []).filter((h) => h.status === 'inProgress').map((h, i, arr) => (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i === arr.length - 1 ? 'none' : `1px solid ${TH.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: FONT_BODY }}><Circle size={16} style={{verticalAlign:'middle'}} /></span>
                  <div>
                    <div style={{ fontSize: FONT_BODY, color: TH.text }}>{h.name}</div>
                    <div style={{ fontSize: FONT_BODY, color: TH.sub }}>{h.streak} {T('checkinStreak')}</div>
                  </div>
                </div>
                <Toggle on={!!habitCheckins[h.id]} onChange={() => setHabitCheckins((c) => ({ ...c, [h.id]: !c[h.id] }))} />
              </div>
            ))}
          </div>
        )}

        <div style={{ padding: '13px 0', borderBottom: `1px solid ${TH.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: FONT_TITLE }}><Pencil size={18} style={{verticalAlign:'middle'}} /></span><span style={{ fontWeight: 600, color: TH.text }}>{T('checkinCustom')}</span>
            </div>
            <button onClick={() => setFreeItems((f) => [...f, { id: String(Date.now()), name: '' }])}
              style={{ width: 28, height: 28, borderRadius: 14, border: 'none', background: P, color: '#fff', fontSize: FONT_TITLE, cursor: 'pointer' }}>+</button>
          </div>
          {freeItems.map((item) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Toggle on={!!freeCheckins[item.id]} onChange={() => setFreeCheckins((c) => ({ ...c, [item.id]: !c[item.id] }))} />
              <input value={item.name} onChange={(e) => setFreeItems((f) => f.map((x) => x.id === item.id ? { ...x, name: e.target.value } : x))}
                placeholder={`${T('checkinFree')} ${freeItems.indexOf(item) + 1}`} style={{ ...inp(TH), flex: 1, padding: '7px 10px' } as React.CSSProperties} />
            </div>
          ))}
        </div>

        <div style={{ padding: '14px 0' }}>
          <div style={{ fontSize: FONT_BODY, color: TH.sub, marginBottom: 8 }}>{T('checkinNote')}</div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={T('checkinNotePlaceholder')} rows={3}
            style={{ width: '100%', background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 12, padding: '10px 12px', color: TH.text, fontSize: FONT_BODY, resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <button onClick={() => setLocalDone(false)}
            style={{ flex: 1, padding: '13px 0', borderRadius: 12, fontWeight: 700, fontSize: FONT_BUTTON, cursor: 'pointer',
              border: '2px solid', borderColor: localDone === false ? COLORS.RED : TH.border, background: localDone === false ? 'rgba(239,68,68,.15)' : 'transparent', color: localDone === false ? COLORS.RED : TH.sub }}>
            <X size={16} style={{verticalAlign:'middle',marginRight:4}} /> {T('checkinNotDone')}
          </button>
          <button onClick={() => setLocalDone(true)}
            style={{ flex: 1, padding: '13px 0', borderRadius: 12, fontWeight: 700, fontSize: FONT_BUTTON, cursor: 'pointer',
              border: '2px solid', borderColor: localDone === true ? COLORS.GREEN : TH.border, background: localDone === true ? 'rgba(16,185,129,.15)' : 'transparent', color: localDone === true ? COLORS.GREEN : TH.sub }}>
            <Check size={16} style={{verticalAlign:'middle',marginRight:4}} /> {T('checkinDone')}
          </button>
        </div>

        <button onClick={() => {
          if (localDone === null) return;
          const today = dateStr();
          Object.entries(habitCheckins).forEach(([id, checked]) => {
            if (checked) store.checkinHabit(id, today);
          });
          // Save plan item toggles
          Object.entries(planToggles).forEach(([itemId, desired]) => {
            const current = planCheckins.some(c => c.planItemId === itemId && c.date === today && c.done);
            if (desired && !current) store.checkinPlanItem(itemId);
            if (!desired && current) store.uncheckinPlanItem(itemId);
          });
          // Set water amount directly
          if (waterMl > 0) {
            store.resetWater();
            store.addWater(waterMl);
          }
          // Build structured note (JSON for new format, fallback-compatible)
          const noteData: Record<string, unknown> = {};
          if (note) noteData.note = note;
          if (fasted) noteData.fasted = true;
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
        }}
          style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', marginBottom: 10, background: localDone === true ? COLORS.GREEN : localDone === false ? COLORS.RED : P, color: '#fff', fontWeight: 700, fontSize: FONT_BUTTON, cursor: 'pointer' }}>
          {localDone === true ? T('checkinSubmit') : localDone === false ? T('checkinSave') : T('checkinSelectStatus')}
        </button>

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
