'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { COLORS, FOOD_PRESETS, dateStr, getTodayFoodLog, getActivePlan, getTodayItems, FONT_BODY, FONT_BUTTON, FONT_TITLE, FONT_SUB, FONT_BADGE, FONT_HERO, FONT_STAT_CARD, FONT_CLOSE, FONT_LABEL, FONT_EMPTY, FONT_STAT_SECTION } from '@egoless-do/core';
import type { CheckinEntry } from '@egoless-do/core';
import { useTheme, useT, cs, inp, useCachedStyle } from './helpers';
import { useWebStore } from '../store/useWebStore';
import { useOverlay } from './useOverlay';
import { CalendarCheck, Trophy, Zap, Utensils, Scale, Droplets, Pencil, Check, CheckCircle2, Circle, Star, ClipboardList, Shield, X, ChevronRight, Wheat, Beef, Leaf, Apple, CupSoda, Cookie } from 'lucide-react';

const FOOD_ICON_MAP: Record<string, React.ComponentType<any>> = { Wheat, Beef, Leaf, Apple, CupSoda, Cookie, Utensils, Star };

function computeLongestStreak(history: CheckinEntry[]): number {
  const doneDates = history.filter(c => c.done).map(c => c.date).sort();
  if (doneDates.length === 0) return 0;
  let max = 1, current = 1;
  for (let i = 1; i < doneDates.length; i++) {
    const prev = new Date(doneDates[i - 1]);
    const curr = new Date(doneDates[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) { current++; max = Math.max(max, current); }
    else if (diff > 1) current = 1;
  }
  return max;
}

export default function HomeTab() {
  const store = useWebStore();
  const { TH, P } = useTheme();
  const T = useT();
  const overlay = useOverlay();

  const [showFood, setShowFood] = useState(false);
  const [fn, setFn] = useState('');
  const [fc, setFc] = useState('');
  const [fnote, setFnote] = useState('');
  const [foodTab, setFoodTab] = useState(0);
  const [foodSearch, setFoodSearch] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [showWG, setShowWG] = useState(false);
  const [wgi, setWgi] = useState(String(store.waterGoal));
  const [showCG, setShowCG] = useState(false);
  const [cgi, setCgi] = useState(String(store.calGoal));

  useEffect(() => {
    store.checkAutoStatus();
    store.autoSyncPlanItems();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalCal = useMemo(() => getTodayFoodLog(store.foodLog ?? []).reduce((a, f) => a + f.calories, 0), [store.foodLog]);

  const todayWeight = useMemo(() => {
    const today = dateStr();
    const todayCheckin = (store.checkinHistory ?? []).find((c: CheckinEntry) => c.date === today);
    return todayCheckin?.weight;
  }, [store.checkinHistory]);

  const cardStyle = useCachedStyle(() => cs(TH), [TH]);
  const waterProgress = useCachedStyle(() => ({
    height: 6,
    background: COLORS.BLUE,
    borderRadius: 3,
    width: `${Math.min(store.waterMl / store.waterGoal * 100, 100)}%`,
    transition: 'width .4s'
  }), [store.waterMl, store.waterGoal]);

  const calProgress = useCachedStyle(() => ({
    height: 4,
    background: COLORS.ORANGE,
    borderRadius: 2,
    width: `${Math.min(totalCal / store.calGoal * 100, 100)}%`,
    transition: 'width .4s'
  }), [totalCal, store.calGoal]);

  const savedKcal = useMemo(() => (store.fastingHistory ?? []).reduce((sum, f) => sum + (f.estimatedKcal ?? 0), 0), [store.fastingHistory]);

  const totalCompleted = useMemo(() => (store.checkinHistory ?? []).filter((c: CheckinEntry) => c.done).length, [store.checkinHistory]);
  const longestStreak = useMemo(() => computeLongestStreak(store.checkinHistory ?? []), [store.checkinHistory]);
  const savedMeals = useMemo(() => (store.fastingHistory ?? []).length, [store.fastingHistory]);

  const statsData = useMemo(() => [
    { Icon: CalendarCheck, label: T('totalCompleted'), value: totalCompleted, unit: T('days'), bg: COLORS.ORANGE },
    { Icon: Trophy, label: T('longestStreak'), value: longestStreak, unit: T('days'), bg: COLORS.YELLOW },
    { Icon: Zap, label: T('savedCalories'), value: savedKcal, unit: T('kcalUnit'), bg: '#FF8A65' },
    { Icon: Utensils, label: T('savedMeals'), value: savedMeals, unit: T('mealUnit'), bg: COLORS.BLUE },
  ], [totalCompleted, longestStreak, savedKcal, savedMeals, T]);

  const today = dateStr();

  const allTabs = useMemo(() => [
    ...FOOD_PRESETS.map(c => ({ key: c.key, label: store.language === 'en' ? c.labelEn : c.label, icon: c.icon, items: c.items })),
    { key: 'my', label: T('foodMyPresets'), icon: 'Star', items: [] as { name: string; nameEn: string; cal: number; unit: string; unitEn: string }[] },
  ], [T, store.language]);

  const getFilteredItems = useCallback(() => {
    const tab = allTabs[foodTab];
    if (!tab) return [];
    let items: { name: string; nameEn: string; cal: number; unit: string; unitEn: string }[] = [];
    if (tab.key === 'my') {
      items = (store.customFoodPresets ?? []).map(p => ({ name: p.name, nameEn: p.name, cal: p.calories, unit: '份', unitEn: 'serving' }));
    } else {
      items = tab.items;
    }
    if (foodSearch.trim()) {
      const q = foodSearch.trim().toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q) || i.nameEn.toLowerCase().includes(q));
    }
    return items;
  }, [allTabs, foodTab, foodSearch, store.customFoodPresets]);

  const resetFoodForm = useCallback(() => { setFn(''); setFc(''); setFnote(''); setShowManual(false); setFoodSearch(''); setFoodTab(0); }, []);

  // Today's plan items (new plan system)
  const activePlan = useMemo(() => getActivePlan(store.plans ?? []), [store.plans]);
  const todayPlanItems = useMemo(() => {
    if (!activePlan) return [];
    return getTodayItems(store.planItems ?? [], activePlan, today);
  }, [store.planItems, activePlan, today]);
  const planCheckins = store.planItemCheckins ?? [];
  const todayPlanDoneCount = todayPlanItems.filter(i => planCheckins.some(c => c.planItemId === i.id && c.date === today && c.done)).length;

  const todayRecord = (store.checkinHistory ?? []).find((c: CheckinEntry) => c.date === today);
  const bannerState: 'notChecked' | 'notDone' | 'done' = !todayRecord ? 'notChecked' : todayRecord.done ? 'done' : 'notDone';

  const bannerConfig = {
    notChecked: { bg: 'linear-gradient(135deg,#16A34A,#15803D)', sub: T('checkinDoneToday'), btn: T('openCheckin'), BtnIcon: ClipboardList },
    notDone:    { bg: 'linear-gradient(135deg,#F59E0B,#D97706)', sub: T('checkinModifyNotDone'), btn: T('checkinModify'), BtnIcon: Pencil },
    done:       { bg: 'linear-gradient(135deg,#3B82F6,#2563EB)', sub: T('checkinDoneBanner'), btn: T('checkinDoneBanner'), BtnIcon: Check },
  }[bannerState];

  return (
    <>
      <div style={{ borderRadius: 16, background: bannerConfig.bg, padding: '18px 20px', marginBottom: 12, color: '#fff' }}>
        <div style={{ fontWeight: 700, fontSize: FONT_TITLE, textAlign: 'center' }}>{T('todayCheckin')}</div>
        <div style={{ textAlign: 'center', fontSize: FONT_BODY, opacity: 0.8, marginTop: 3, marginBottom: 14 }}>{bannerConfig.sub}</div>
        <button onClick={() => { if (bannerState !== 'done') overlay.open('checkin'); }}
          style={{ width: '100%', padding: '11px 0', borderRadius: 12, border: '2px solid rgba(255,255,255,.6)', background: 'rgba(255,255,255,.18)', color: '#fff', fontWeight: 700, fontSize: FONT_BUTTON, cursor: bannerState === 'done' ? 'default' : 'pointer', opacity: bannerState === 'done' ? 0.7 : 1 }}>
          <bannerConfig.BtnIcon size={16} style={{verticalAlign:'middle',marginRight:4}} /> {bannerConfig.btn}
        </button>
      </div>

      {/* Today's plan */}
      {activePlan && todayPlanItems.length > 0 && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: FONT_BODY, fontWeight: 600, color: TH.text }}><ClipboardList size={16} style={{verticalAlign:'middle',marginRight:4}} /> {activePlan.name}</span>
            <span style={{ fontSize: FONT_BADGE, color: P, cursor: 'pointer' }} onClick={() => overlay.open('planDetail', { planId: activePlan!.id })}>{T('planTodoList')} <ChevronRight size={14} style={{verticalAlign:'middle'}} /></span>
          </div>
          {todayPlanItems.slice(0, 5).map(item => {
            const done = planCheckins.some(c => c.planItemId === item.id && c.date === today && c.done);
            const isManual = item.link === 'manual';
            return (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0',
                borderBottom: `1px solid ${TH.border}`,
              }}>
                <span style={{ fontSize: FONT_BODY }}>{done ? <CheckCircle2 size={16} style={{verticalAlign:'middle'}} /> : <Circle size={16} style={{verticalAlign:'middle'}} />}</span>
                <span style={{ flex: 1, fontSize: FONT_SUB, color: done ? TH.sub : TH.text, textDecoration: done ? 'line-through' : 'none' }}>{item.name}</span>
                {isManual ? (
                  <button onClick={() => done ? store.uncheckinPlanItem(item.id) : store.checkinPlanItem(item.id)} style={{
                    fontSize: FONT_SUB, color: done ? TH.sub : P, background: done ? 'transparent' : `${P}15`,
                    border: `1px solid ${done ? TH.border : P}40`, borderRadius: 6,
                    padding: '2px 8px', cursor: 'pointer',
                  }}>{done ? T('planUncheckin') : T('planCheckin')}</button>
                ) : (
                  <span style={{ fontSize: FONT_BADGE, color: done ? COLORS.GREEN : TH.sub, fontWeight: 500 }}>
                    {done ? <><Check size={11} style={{verticalAlign:'middle',marginRight:2}} />{T('planCheckin')}</> : T(`planLink${item.link.charAt(0).toUpperCase() + item.link.slice(1)}`)}
                  </span>
                )}
              </div>
            );
          })}
          <div style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 6, textAlign: 'right' }}>
            {todayPlanDoneCount}/{todayPlanItems.length} {T('planProgress')}
          </div>
        </div>
      )}

      <div style={{ ...cardStyle, textAlign: 'center', padding: '20px 16px' } as React.CSSProperties}>
        <div style={{ fontSize: FONT_STAT_SECTION }}><Shield size={40} /></div>
        <div style={{ color: TH.sub, fontSize: FONT_BODY, marginTop: 6 }}>{T('streak')}</div>
        <div style={{ fontSize: FONT_HERO, fontWeight: 800, color: COLORS.ORANGE, lineHeight: 1.1 }}>{store.streak}</div>
        <div style={{ color: TH.sub, fontSize: FONT_BODY, marginTop: 4 }}>{T('days')}</div>
        <div style={{ fontSize: FONT_BODY, color: TH.sub, marginTop: 8 }}>{T('gracePeriodHint')}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {statsData.map((item) => (
          <div key={item.label} style={{ background: item.bg, borderRadius: 14, padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: FONT_STAT_CARD }}><item.Icon size={22} style={{verticalAlign:'middle'}} /></div>
            <div style={{ fontSize: FONT_BODY, color: 'rgba(255,255,255,.78)' }}>{item.label}</div>
            <div style={{ fontWeight: 700, color: '#fff', fontSize: FONT_TITLE }}>{item.value}<span style={{ fontSize: FONT_BODY, fontWeight: 400 }}> {item.unit}</span></div>
          </div>
        ))}
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: FONT_BODY, fontWeight: 600 }}><Scale size={16} style={{verticalAlign:'middle',marginRight:4}} /> {T('todayWeight')}</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: FONT_STAT_CARD, fontWeight: 700, color: P }}>{todayWeight != null ? todayWeight : '—'}</span>
            <span style={{ color: TH.sub, fontSize: FONT_BODY }}>{T('checkinKg')}</span>
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: FONT_BODY, fontWeight: 600 }}>{T('water')}</span>
          <span style={{ color: TH.sub, fontSize: FONT_BODY, cursor: 'pointer' }} onClick={() => { setWgi(String(store.waterGoal)); setShowWG(true); }}>
            <span style={{ fontWeight: 600, color: P }}>{store.waterMl}</span> ml / {store.waterGoal}ml <Pencil size={14} style={{verticalAlign:'middle'}} />
          </span>
        </div>
        <div style={{ height: 6, background: TH.border, borderRadius: 3, marginBottom: 12, overflow: 'hidden' }}>
          <div style={waterProgress} />
        </div>
        <button onClick={() => store.addWater(250)} style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: COLORS.BLUE, color: '#fff', fontWeight: 600, fontSize: FONT_BUTTON, cursor: 'pointer' }}>+ 250ml</button>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: FONT_BODY, fontWeight: 600, color: COLORS.ORANGE }}>{T('addFood')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: FONT_STAT_CARD, fontWeight: 700, color: COLORS.ORANGE }}>{totalCal}</span>
          <span style={{ color: TH.sub, fontSize: FONT_BODY }}>/ {store.calGoal} kcal</span>
          <span style={{ cursor: 'pointer', fontSize: FONT_BODY }} onClick={() => { setCgi(String(store.calGoal)); setShowCG(true); }}><Pencil size={16} style={{verticalAlign:'middle'}} /></span>
        </div>
        <div style={{ height: 4, background: TH.border, borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
          <div style={calProgress} />
        </div>
      </div>

      <button onClick={() => { resetFoodForm(); setShowFood(true); }}
        style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: COLORS.ORANGE, color: '#fff', fontWeight: 700, fontSize: FONT_BUTTON, cursor: 'pointer', marginBottom: 12, position: 'relative', zIndex: 1 }}>
        {T('addFoodBtn')}
      </button>

      {showFood && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 300, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 420, background: TH.cardSolid, display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 20px 12px' }}>
              <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text }}>{T('addFood')}</div>
              <button onClick={() => { setShowFood(false); resetFoodForm(); }} style={{ background: 'transparent', border: 'none', fontSize: FONT_CLOSE, color: TH.sub, cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {/* Search */}
            <div style={{ padding: '0 20px 12px' }}>
              <input value={foodSearch} onChange={(e) => setFoodSearch(e.target.value)} placeholder={T('foodSearch')}
                style={{ ...inp(TH), width: '100%', boxSizing: 'border-box' } as React.CSSProperties} />
            </div>

            {/* Category tabs */}
            <div style={{ display: 'flex', gap: 6, padding: '0 16px 10px', overflowX: 'auto' }}>
              {allTabs.map((tab, i) => (
                <button key={tab.key} onClick={() => { setFoodTab(i); setFoodSearch(''); }}
                  style={{
                    flexShrink: 0, padding: '6px 14px', borderRadius: 20, border: 'none',
                    background: foodTab === i ? P : TH.card,
                    color: foodTab === i ? '#fff' : TH.sub, fontSize: FONT_SUB,
                    fontWeight: foodTab === i ? 700 : 400, cursor: 'pointer',
                  }}>
                  {(() => { const FoodIcon = FOOD_ICON_MAP[tab.icon]; return FoodIcon ? <FoodIcon size={16} style={{verticalAlign:'middle',marginRight:4}} /> : null; })()} {tab.label}
                </button>
              ))}
            </div>

            {/* Food list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
              {getFilteredItems().map((f, i) => (
                <div key={`${f.name}-${i}`}
                  onClick={() => {
                    store.addFood({ name: f.name, calories: f.cal, note: '', timestamp: Date.now() });
                    setShowFood(false); resetFoodForm();
                  }}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 0', borderBottom: `1px solid ${TH.border}`, cursor: 'pointer',
                  }}>
                  <div>
                    <div style={{ color: TH.text, fontSize: FONT_BUTTON }}>{f.name}</div>
                    <div style={{ color: TH.sub, fontSize: FONT_BADGE }}>{f.unit}</div>
                  </div>
                  <span style={{ color: P, fontSize: FONT_BUTTON, fontWeight: 600 }}>{f.cal} kcal</span>
                </div>
              ))}
              {getFilteredItems().length === 0 && (
                <div style={{ color: TH.sub, textAlign: 'center', padding: '32px 0', fontSize: FONT_EMPTY }}>
                  {foodTab === allTabs.length - 1 ? T('foodEmpty') : T('foodNoHistory')}
                </div>
              )}
            </div>

            {/* Manual input */}
            {showManual && (
              <div style={{ padding: 20, borderTop: `1px solid ${TH.border}` }}>
                <input value={fn} onChange={(e) => setFn(e.target.value)} placeholder={T('foodName')}
                  style={{ ...inp(TH), width: '100%', boxSizing: 'border-box', marginBottom: 8 } as React.CSSProperties} />
                <input type="number" value={fc} onChange={(e) => setFc(e.target.value)} placeholder={T('calories2')}
                  style={{ ...inp(TH), width: '100%', boxSizing: 'border-box', marginBottom: 8 } as React.CSSProperties} />
                <textarea value={fnote} onChange={(e) => setFnote(e.target.value)} placeholder={T('notePlaceholder')} rows={2}
                  style={{ width: '100%', background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 10, padding: '10px 12px', color: TH.text, fontSize: FONT_BODY, resize: 'none', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { if (fn.trim()) { store.addFood({ name: fn, calories: +fc || 0, note: fnote, timestamp: Date.now() }); setShowFood(false); resetFoodForm(); } }}
                    style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: COLORS.ORANGE, color: '#fff', fontWeight: 700, fontSize: FONT_BUTTON, cursor: 'pointer' }}>{T('confirm')}</button>
                  <button onClick={() => { if (fn.trim()) store.addCustomFoodPreset(fn, +fc || 0, fnote); }}
                    style={{ padding: '12px 16px', borderRadius: 12, border: `1px solid ${P}`, background: 'transparent', color: P, fontSize: FONT_BUTTON, cursor: 'pointer' }}>{T('foodSavePreset')}</button>
                </div>
              </div>
            )}

            {/* Bottom bar */}
            {!showManual && (
              <button onClick={() => setShowManual(true)}
                style={{ padding: 16, borderTop: `1px solid ${TH.border}`, background: 'transparent', color: P, fontSize: FONT_BUTTON, fontWeight: 600, cursor: 'pointer', border: 'none', width: '100%' }}>
                {T('foodManualInput')}
              </button>
            )}
          </div>
        </div>
      )}

      {showWG && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: TH.cardSolid, borderRadius: 20, padding: 24, width: '100%', maxWidth: 320, textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: FONT_TITLE, marginBottom: 6, color: TH.text }}>{T('waterGoalSetting')}</div>
            <div style={{ fontSize: FONT_BODY, color: TH.sub, marginBottom: 16 }}>{T('waterGoalHint')}</div>
            <input type="number" value={wgi} onChange={(e) => setWgi(e.target.value)}
              style={{ ...inp(TH), fontSize: FONT_STAT_CARD, fontWeight: 700, textAlign: 'center', marginBottom: 20, border: `2px solid ${COLORS.BLUE}`, width: '100%', boxSizing: 'border-box' } as React.CSSProperties} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowWG(false)} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${TH.border}`, background: 'transparent', color: TH.sub, fontSize: FONT_BUTTON, cursor: 'pointer' }}>{T('cancel')}</button>
              <button onClick={() => { store.setWaterGoal(Math.max(500, Math.min(3000, +wgi || 2000))); setShowWG(false); }}
                style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: COLORS.BLUE, color: '#fff', fontWeight: 700, fontSize: FONT_BUTTON, cursor: 'pointer' }}>{T('save')}</button>
            </div>
          </div>
        </div>
      )}

      {showCG && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: TH.cardSolid, borderRadius: 20, padding: 24, width: '100%', maxWidth: 320, textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: FONT_TITLE, marginBottom: 6, color: TH.text }}>{T('calGoalSetting')}</div>
            <div style={{ fontSize: FONT_BODY, color: TH.sub, marginBottom: 16 }}>{T('calGoalHint')}</div>
            <input type="number" value={cgi} onChange={(e) => setCgi(e.target.value)}
              style={{ ...inp(TH), fontSize: FONT_STAT_CARD, fontWeight: 700, textAlign: 'center', marginBottom: 20, border: `2px solid ${COLORS.GREEN}`, width: '100%', boxSizing: 'border-box' } as React.CSSProperties} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowCG(false)} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${TH.border}`, background: 'transparent', color: TH.sub, fontSize: FONT_BUTTON, cursor: 'pointer' }}>{T('cancel')}</button>
              <button onClick={() => { store.setCalGoal(Math.max(500, Math.min(10000, +cgi || 2000))); setShowCG(false); }}
                style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: COLORS.GREEN, color: '#fff', fontWeight: 700, fontSize: FONT_BUTTON, cursor: 'pointer' }}>{T('save')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
