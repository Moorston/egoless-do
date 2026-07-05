'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { COLORS, cardAccent, cardTextColor, dateStr, yesterday, getTodayFoodLog, getRecentFoods, FONT_BODY, FONT_BUTTON, FONT_TITLE, FONT_SUB, FONT_BADGE, FONT_STAT_CARD, FONT_HERO, FONT_CLOSE, FONT_EMPTY, FONT_STAT_SECTION, computeLongestStreak } from '@egoless-do/core';
import type { CheckinEntry } from '@egoless-do/core';
import { useTheme, useT, cs, inp, useCachedStyle } from './helpers';
import { useWebStore } from '../store/useWebStore';
import { useShallow } from 'zustand/react/shallow';
import { useOverlay } from './useOverlay';
import { useFoodSearch, FOOD_ICON_MAP } from './useFoodSearch';
import { CalendarCheck, Trophy, Zap, Utensils, Scale, Droplets, Pencil, Check, ClipboardList, Shield, X, BarChart3 } from 'lucide-react';
import CheckinStatsModal from './CheckinStatsModal';

const WATER_GOAL_MIN = 500;
const WATER_GOAL_MAX = 3000;
const CAL_GOAL_MIN = 500;
const CAL_GOAL_MAX = 10000;

export default function HomeTab() {
  const {
    theme, language, streak, waterMl, waterGoal, calGoal, foodLog, habits,
    reflections, fastingHistory, checkinHistory, userProfile, customFoodPresets,
    graceHistory, weightUnit,
    addFood, deleteFood, addWater, setWaterGoal, setCalGoal, addCustomFoodPreset,
    checkAutoStatus, autoSyncPlanItems,
  } = useWebStore(useShallow((s) => ({
    theme: s.theme,
    language: s.language,
    streak: s.streak,
    waterMl: s.waterMl,
    waterGoal: s.waterGoal,
    calGoal: s.calGoal,
    foodLog: s.foodLog,
    habits: s.habits,
    reflections: s.reflections,
    fastingHistory: s.fastingHistory,
    checkinHistory: s.checkinHistory,
    userProfile: s.userProfile,
    customFoodPresets: s.customFoodPresets,
    graceHistory: s.graceHistory,
    weightUnit: s.weightUnit,
    addFood: s.addFood,
    deleteFood: s.deleteFood,
    addWater: s.addWater,
    setWaterGoal: s.setWaterGoal,
    setCalGoal: s.setCalGoal,
    addCustomFoodPreset: s.addCustomFoodPreset,
    checkAutoStatus: s.checkAutoStatus,
    autoSyncPlanItems: s.autoSyncPlanItems,
  })));
  const { TH, P } = useTheme();
  const T = useT();
  const overlay = useOverlay();

  const [showFood, setShowFood] = useState(false);
  const [showWG, setShowWG] = useState(false);
  const [wgi, setWgi] = useState(String(waterGoal));
  const [showCG, setShowCG] = useState(false);
  const [cgi, setCgi] = useState(String(calGoal));
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [editFood, setEditFood] = useState<{ name: string; cal: number } | null>(null);
  const [editPortion, setEditPortion] = useState(1);

  const {
    fn, setFn, fc, setFc, fnote, setFnote,
    foodTab, setFoodTab, foodSearch, setFoodSearch,
    showManual, setShowManual,
    allTabs, filteredItems, resetFoodForm,
  } = useFoodSearch(language);

  useEffect(() => {
    checkAutoStatus();
    autoSyncPlanItems();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalCal = useMemo(() => getTodayFoodLog(foodLog ?? []).filter(f => !f.deleted).reduce((a, f) => a + f.calories, 0), [foodLog]);
  const recentFoods = useMemo(() => getRecentFoods(foodLog ?? [], 3), [foodLog]);
  const todayFoods = useMemo(() => getTodayFoodLog(foodLog ?? []).filter(f => !f.deleted).slice(0, 3), [foodLog]);
  const todayFoodTotal = useMemo(() => getTodayFoodLog(foodLog ?? []).filter(f => !f.deleted).length, [foodLog]);
  const [portionFood, setPortionFood] = useState<{ name: string; calories: number } | null>(null);
  const [portion, setPortion] = useState(1);

  const todayWeight = useMemo(() => {
    const today = dateStr();
    const todayCheckin = (checkinHistory ?? []).find((c: CheckinEntry) => !c.deleted && c.date === today);
    return todayCheckin?.weight;
  }, [checkinHistory]);

  const cardStyle = useCachedStyle(() => cs(TH), [TH]);
  const waterProgress = useCachedStyle(() => ({
    height: 6,
    background: P,
    borderRadius: 3,
    width: `${Math.min(waterGoal > 0 ? waterMl / waterGoal * 100 : 0, 100)}%`,
    transition: 'width .4s'
  }), [waterMl, waterGoal, P]);

  const calProgress = useCachedStyle(() => ({
    height: 4,
    background: P,
    borderRadius: 2,
    width: `${Math.min(calGoal > 0 ? totalCal / calGoal * 100 : 0, 100)}%`,
    transition: 'width .4s'
  }), [totalCal, calGoal, P]);

  const savedKcal = useMemo(() => (fastingHistory ?? []).filter(f => !f.deleted).reduce((sum, f) => sum + (f.estimatedKcal ?? 0), 0), [fastingHistory]);

  const totalCompleted = useMemo(() => (checkinHistory ?? []).filter((c: CheckinEntry) => !c.deleted && c.done).length, [checkinHistory]);
  const longestStreak = useMemo(() => computeLongestStreak((checkinHistory ?? []).filter((c: CheckinEntry) => !c.deleted && c.done).map(c => c.date)), [checkinHistory]);
  const savedMeals = useMemo(() => (fastingHistory ?? []).filter(f => !f.deleted).length, [fastingHistory]);

  const statsOps = [0.12, 0.17, 0.22, 0.27];

  const statsData = useMemo(() => [
    { Icon: CalendarCheck, label: T('totalCompleted'), value: totalCompleted, unit: T('days'), color: cardAccent(TH.primary, TH.bg, statsOps[0]) },
    { Icon: Trophy, label: T('longestStreak'), value: longestStreak, unit: T('days'), color: cardAccent(TH.primary, TH.bg, statsOps[1]) },
    { Icon: Zap, label: T('savedCalories'), value: savedKcal, unit: T('kcalUnit'), color: cardAccent(TH.primary, TH.bg, statsOps[2]) },
    { Icon: Utensils, label: T('savedMeals'), value: savedMeals, unit: T('mealUnit'), color: cardAccent(TH.primary, TH.bg, statsOps[3]) },
  ], [totalCompleted, longestStreak, savedKcal, savedMeals, T, TH.primary, TH.bg]);

  const today = dateStr();

  const todayRecord = (checkinHistory ?? []).find((c: CheckinEntry) => !c.deleted && c.date === today);
  const bannerState: 'notChecked' | 'notDone' | 'done' = !todayRecord ? 'notChecked' : todayRecord.done ? 'done' : 'notDone';

  const bannerBg = cardAccent(TH.primary, TH.bg, 0.45);
  const warnBg = cardAccent('#F59E0B', TH.bg, 0.45);
  const bannerConfig = {
    notChecked: { bg: bannerBg, sub: T('checkinDoneToday'), btn: T('openCheckin'), BtnIcon: ClipboardList },
    notDone:    { bg: warnBg, sub: T('checkinModifyNotDone'), btn: T('checkinModify'), BtnIcon: Pencil },
    done:       { bg: bannerBg, sub: T('checkinDoneBanner'), btn: T('checkinDoneBanner'), BtnIcon: Check },
  }[bannerState];

  return (
    <>
      {/* Check-in banner */}
      {(() => { const tc = cardTextColor(TH.bg); return (
      <div style={{ borderRadius: 16, background: bannerConfig.bg, padding: '18px 20px', marginBottom: 12, color: tc }}>
        <div style={{ fontWeight: 700, fontSize: FONT_TITLE, textAlign: 'center' }}>{T('todayCheckin')}</div>
        <div style={{ textAlign: 'center', fontSize: FONT_BODY, opacity: 0.8, marginTop: 3, marginBottom: 14 }}>{bannerConfig.sub}</div>
        <button onClick={() => { if (bannerState !== 'done') overlay.open('checkin'); }}
          style={{ width: '100%', padding: '11px 0', borderRadius: 12, border: `2px solid ${tc}60`, background: `${tc}18`, color: tc, fontWeight: 700, fontSize: FONT_BUTTON, cursor: bannerState === 'done' ? 'default' : 'pointer', opacity: bannerState === 'done' ? 0.7 : 1 }}>
          <bannerConfig.BtnIcon size={16} style={{verticalAlign:'middle',marginRight:4}} /> {bannerConfig.btn}
        </button>
      </div>
      ); })()}

      {/* Grace reminder banner */}
      {(() => {
        const yStr = yesterday();
        const yesterdayRecord = (checkinHistory ?? []).find((h: CheckinEntry) => !h.deleted && h.date === yStr);
        const yesterdayDone = yesterdayRecord?.done === true;
        if (yesterdayDone) return null;
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        const dayBeforeYesterdayStr = dateStr(twoDaysAgo);
        const dayBeforeYesterdayRecord = (checkinHistory ?? []).find((h: CheckinEntry) => !h.deleted && h.date === dayBeforeYesterdayStr);
        const dayBeforeYesterdayDone = dayBeforeYesterdayRecord?.done === true;
        if (!dayBeforeYesterdayDone) return null;
        return (
          <div onClick={() => overlay.open('grace')} style={{
            borderRadius: 14, background: warnBg,
            padding: '12px 14px', marginBottom: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Shield size={20} color={cardTextColor(TH.bg)} />
            <div style={{ flex: 1 }}>
              <div style={{ color: cardTextColor(TH.bg), fontWeight: 700, fontSize: FONT_BODY }}>{T('graceRemindTitle')}</div>
              <div style={{ color: cardTextColor(TH.bg), opacity: 0.8, fontSize: FONT_SUB, marginTop: 2 }}>{T('graceRemindDesc')}</div>
            </div>
            <span style={{ color: cardTextColor(TH.bg), fontSize: FONT_SUB }}>→</span>
          </div>
        );
      })()}

      {/* Streak card */}
      {(() => { const tc = cardTextColor(TH.bg); return (
      <div onClick={() => overlay.open('grace')} style={{
        borderRadius: 16, background: bannerBg,
        padding: '20px 16px', textAlign: 'center', color: tc, marginBottom: 12, cursor: 'pointer',
      } as React.CSSProperties}>
        <div style={{ fontSize: FONT_STAT_SECTION }}><Shield size={40} color={tc} /></div>
        <div style={{ color: tc, opacity: 0.7, fontSize: FONT_BODY, marginTop: 6 }}>{T('streak')}</div>
        <div style={{ fontSize: FONT_HERO, fontWeight: 800, color: tc, lineHeight: 1.1 }}>{streak}</div>
        <div style={{ color: tc, opacity: 0.5, fontSize: FONT_BODY, marginTop: 4 }}>{T('days')}</div>
        <div style={{ fontSize: FONT_BODY, color: tc, opacity: 0.5, marginTop: 8 }}>{T('gracePeriodHint')}</div>
      </div>
      ); })()}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {statsData.map((item, index) => { const tc = cardTextColor(TH.bg); return (
          <div key={item.label} onClick={index < 2 ? () => setShowStatsModal(true) : undefined} style={{ background: item.color, borderRadius: 14, padding: '16px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: index < 2 ? 'pointer' : 'default' }}>
            <div style={{ fontSize: 26, color: tc }}><item.Icon size={26} style={{verticalAlign:'middle'}} /></div>
            <div style={{ fontSize: FONT_BODY, color: tc, opacity: 0.85, textAlign: 'center' }}>{item.label}</div>
            <div style={{ fontWeight: 700, color: tc, fontSize: 26 }}>{item.value}<span style={{ fontSize: FONT_SUB, fontWeight: 400 }}> {item.unit}</span></div>
            {index < 2 && <BarChart3 size={12} color={`${tc}80`} />}
          </div>
        ); })}
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: FONT_BODY, fontWeight: 600 }}><Scale size={16} style={{verticalAlign:'middle',marginRight:4}} /> {T('todayWeight')}</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: FONT_STAT_CARD, fontWeight: 700, color: P }}>{todayWeight != null ? todayWeight : '—'}</span>
            <span style={{ color: TH.sub, fontSize: FONT_BODY }}>{weightUnit === 'kg' ? T('checkinKg') : T('checkinLb')}</span>
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: FONT_BODY, fontWeight: 600 }}>{T('water')}</span>
          <span style={{ color: TH.sub, fontSize: FONT_BODY, cursor: 'pointer' }} onClick={() => { setWgi(String(waterGoal)); setShowWG(true); }}>
            <span style={{ fontWeight: 600, color: P }}>{waterMl}</span> ml / {waterGoal}ml <Pencil size={14} style={{verticalAlign:'middle'}} />
          </span>
        </div>
        <div style={{ height: 6, background: TH.border, borderRadius: 3, marginBottom: 12, overflow: 'hidden' }}>
          <div style={waterProgress} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[200, 250, 350, 500].map(ml => (
            <button key={ml} onClick={() => addWater(ml)}
              style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${TH.border}`, background: TH.card, color: P, fontWeight: 600, fontSize: FONT_SUB, cursor: 'pointer' }}>
              {ml}ml
            </button>
          ))}
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: FONT_BODY, fontWeight: 600, color: P }}>{T('todayFood')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: FONT_STAT_CARD, fontWeight: 700, color: P }}>{totalCal}</span>
          <span style={{ color: TH.sub, fontSize: FONT_BODY }}>/ {calGoal} kcal</span>
          <span style={{ cursor: 'pointer', fontSize: FONT_BODY }} onClick={() => { setCgi(String(calGoal)); setShowCG(true); }}><Pencil size={16} style={{verticalAlign:'middle'}} /></span>
        </div>
        <div style={{ height: 4, background: TH.border, borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
          <div style={calProgress} />
        </div>

        {/* Recent Foods */}
        {recentFoods.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 6 }}>{T('recentFoods')}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {recentFoods.map(f => (
                <div key={f.name} onClick={() => { setPortionFood(f); setPortion(1); }}
                  style={{ flex: 1, borderRadius: 10, padding: 10, textAlign: 'center', background: TH.card, border: `1px solid ${TH.border}`, cursor: 'pointer' }}>
                  <div style={{ color: TH.text, fontSize: FONT_SUB, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
                  <div style={{ color: P, fontSize: FONT_SUB, fontWeight: 600 }}>{f.calories}kcal</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Today's Food List */}
        {todayFoods.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 6 }}>{T('todayFood')} ({todayFoodTotal})</div>
            {todayFoods.map(f => (
              <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${TH.border}` }}>
                <span style={{ color: TH.text, fontSize: FONT_BODY, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
                <span style={{ color: P, fontSize: FONT_SUB, fontWeight: 600, margin: '0 8px' }}>{f.calories} kcal</span>
                <span onClick={() => deleteFood(f.id)} style={{ cursor: 'pointer', color: TH.sub }}><X size={14} /></span>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => { resetFoodForm(); setShowFood(true); }}
          style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: P, color: '#fff', fontWeight: 700, fontSize: FONT_BUTTON, cursor: 'pointer', marginTop: 10 }}>
          {T('addFoodBtn')}
        </button>
      </div>

      {showFood && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 300, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 420, background: TH.cardSolid, display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 20px 12px' }}>
              <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text }}>{T('addFood')}</div>
              <button onClick={() => { setShowFood(false); resetFoodForm(); setEditFood(null); }} style={{ background: 'transparent', border: 'none', fontSize: FONT_CLOSE, color: TH.sub, cursor: 'pointer' }}><X size={20} /></button>
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
              {filteredItems.map((f, i) => (
                <div key={`${f.name}-${i}`}>
                  <div
                    onClick={() => { setEditFood({ name: f.name, cal: f.cal }); setEditPortion(1); }}
                    onDoubleClick={() => { addFood({ name: f.name, calories: f.cal, note: '', timestamp: Date.now() }); setShowFood(false); resetFoodForm(); setEditFood(null); }}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 0', borderBottom: `1px solid ${TH.border}`, cursor: 'pointer',
                      background: editFood?.name === f.name ? `${P}10` : 'transparent',
                    }}>
                    <div>
                      <div style={{ color: TH.text, fontSize: FONT_BUTTON }}>{f.name}</div>
                      <div style={{ color: TH.sub, fontSize: FONT_BADGE }}>{f.unit}</div>
                    </div>
                    <span style={{ color: P, fontSize: FONT_BUTTON, fontWeight: 600 }}>{f.cal} kcal</span>
                  </div>
                  {/* Inline portion selector */}
                  {editFood?.name === f.name && (
                    <div style={{ padding: '12px 0', borderBottom: `1px solid ${TH.border}` }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                        {[0.5, 1, 1.5, 2].map(p => (
                          <button key={p} onClick={(e) => { e.stopPropagation(); setEditPortion(p); }}
                            style={{
                              flex: 1, padding: '8px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                              background: editPortion === p ? P : TH.card, color: editPortion === p ? '#fff' : TH.text,
                              fontWeight: editPortion === p ? 700 : 400, fontSize: FONT_SUB,
                              outline: editPortion === p ? 'none' : `1px solid ${TH.border}`,
                            }}>
                            {p}{T('servingsUnit')}
                          </button>
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ color: TH.sub, fontSize: FONT_SUB }}>{T('foodTotalCal')}</span>
                        <span style={{ fontWeight: 700, color: '#F97316', fontSize: FONT_BODY }}>{Math.round(f.cal * editPortion)} kcal</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={(e) => { e.stopPropagation(); setEditFood(null); }}
                          style={{ flex: 1, padding: 8, borderRadius: 10, border: `1px solid ${TH.border}`, background: 'transparent', color: TH.sub, fontSize: FONT_SUB, cursor: 'pointer' }}>
                          {T('cancel')}
                        </button>
                        <button onClick={(e) => {
                          e.stopPropagation();
                          addFood({ name: f.name, calories: Math.round(f.cal * editPortion), note: '', timestamp: Date.now() });
                          setShowFood(false); resetFoodForm(); setEditFood(null);
                        }}
                          style={{ flex: 1, padding: 8, borderRadius: 10, border: 'none', background: P, color: '#fff', fontWeight: 700, fontSize: FONT_SUB, cursor: 'pointer' }}>
                          {T('confirm')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {filteredItems.length === 0 && (
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
                  <button onClick={() => { if (fn.trim()) { addFood({ name: fn, calories: +fc || 0, note: fnote, timestamp: Date.now() }); setShowFood(false); resetFoodForm(); } }}
                    style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: P, color: '#fff', fontWeight: 700, fontSize: FONT_BUTTON, cursor: 'pointer' }}>{T('confirm')}</button>
                  <button onClick={() => { if (fn.trim()) addCustomFoodPreset(fn, +fc || 0, fnote); }}
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

      {/* Portion Selector (for recent foods) */}
      {portionFood && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setPortionFood(null)}>
          <div style={{ background: TH.cardSolid, borderRadius: 20, padding: 24, width: '100%', maxWidth: 340 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text, marginBottom: 4 }}>{portionFood.name}</div>
            <div style={{ color: TH.sub, fontSize: FONT_BODY, marginBottom: 16 }}>{T('foodPerUnit')} {portionFood.calories} kcal</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[0.5, 1, 1.5, 2].map(p => (
                <button key={p} onClick={() => setPortion(p)}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: portion === p ? P : TH.card, color: portion === p ? '#fff' : TH.text,
                    fontWeight: portion === p ? 700 : 400, fontSize: FONT_BODY,
                    outline: portion === p ? 'none' : `1px solid ${TH.border}`,
                  }}>
                  {p}{T('servingsUnit')}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
              <span style={{ color: TH.sub, fontSize: FONT_BODY }}>{T('foodTotalCal')}</span>
              <span style={{ fontSize: 26, fontWeight: 800, color: '#F97316' }}>
                {Math.round(portionFood.calories * portion)} <span style={{ fontSize: FONT_SUB, fontWeight: 400, color: TH.sub }}>kcal</span>
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setPortionFood(null)}
                style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${TH.border}`, background: 'transparent', color: TH.sub, fontSize: FONT_BODY, cursor: 'pointer' }}>
                {T('cancel')}
              </button>
              <button onClick={() => {
                addFood({ name: portionFood.name, calories: Math.round(portionFood.calories * portion), note: '', timestamp: Date.now() });
                setPortionFood(null);
              }}
                style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: P, color: '#fff', fontWeight: 700, fontSize: FONT_BODY, cursor: 'pointer' }}>
                {T('confirm')}
              </button>
            </div>
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
              <button onClick={() => { setWaterGoal(Math.max(WATER_GOAL_MIN, Math.min(WATER_GOAL_MAX, +wgi || 2000))); setShowWG(false); }}
                style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: P, color: '#fff', fontWeight: 700, fontSize: FONT_BUTTON, cursor: 'pointer' }}>{T('save')}</button>
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
              <button onClick={() => { setCalGoal(Math.max(CAL_GOAL_MIN, Math.min(CAL_GOAL_MAX, +cgi || 2000))); setShowCG(false); }}
                style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: TH.accent, color: '#fff', fontWeight: 700, fontSize: FONT_BUTTON, cursor: 'pointer' }}>{T('save')}</button>
            </div>
          </div>
        </div>
      )}

      <CheckinStatsModal
        visible={showStatsModal}
        onClose={() => setShowStatsModal(false)}
      />
    </>
  );
}
