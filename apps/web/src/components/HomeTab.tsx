'use client';

import { useState, useMemo } from 'react';
import { COLORS, QUICK_FOODS } from '@egoless-do/core';
import type { CheckinRecord } from '@egoless-do/core';
import { useTheme, useT, cs, inp, useCachedStyle } from './helpers';
import { useWebStore } from '../store/useWebStore';
import { useOverlay } from './useOverlay';

function computeLongestStreak(history: CheckinRecord[]): number {
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
  const [showWG, setShowWG] = useState(false);
  const [wgi, setWgi] = useState(String(store.waterGoal));
  const [showCG, setShowCG] = useState(false);
  const [cgi, setCgi] = useState(String(store.calGoal));

  const totalCal = useMemo(() => store.foodLog.reduce((a, f) => a + f.calories, 0), [store.foodLog]);

  const todayWeight = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayCheckin = store.checkinHistory.find((c: CheckinRecord) => c.date === today);
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

  const savedKcal = useMemo(() => store.fastingHistory.reduce((sum, f) => sum + (f.estimatedKcal ?? 0), 0), [store.fastingHistory]);

  const totalCompleted = useMemo(() => store.checkinHistory.filter((c: CheckinRecord) => c.done).length, [store.checkinHistory]);
  const longestStreak = useMemo(() => computeLongestStreak(store.checkinHistory), [store.checkinHistory]);
  const savedMeals = useMemo(() => store.fastingHistory.length, [store.fastingHistory]);

  const statsData = useMemo(() => [
    { icon: '📅', label: T('totalCompleted'), value: totalCompleted, unit: T('days'), bg: COLORS.ORANGE },
    { icon: '🏆', label: T('longestStreak'), value: longestStreak, unit: T('days'), bg: COLORS.YELLOW },
    { icon: '💪', label: T('savedCalories'), value: savedKcal, unit: T('kcalUnit'), bg: '#FF8A65' },
    { icon: '🍽', label: T('savedMeals'), value: savedMeals, unit: T('mealUnit'), bg: COLORS.BLUE },
  ], [totalCompleted, longestStreak, savedKcal, savedMeals, T]);

  const today = new Date().toISOString().slice(0, 10);
  const todayRecord = store.checkinHistory.find((c: CheckinRecord) => c.date === today);
  const bannerState: 'notChecked' | 'notDone' | 'done' = !todayRecord ? 'notChecked' : todayRecord.done ? 'done' : 'notDone';

  const bannerConfig = {
    notChecked: { bg: 'linear-gradient(135deg,#16A34A,#15803D)', sub: T('checkinDoneToday'), btn: `📋 ${T('openCheckin')}` },
    notDone:    { bg: 'linear-gradient(135deg,#F59E0B,#D97706)', sub: T('checkinModifyNotDone'), btn: `✏️ ${T('checkinModify')}` },
    done:       { bg: 'linear-gradient(135deg,#3B82F6,#2563EB)', sub: T('checkinDoneBanner'), btn: `✓ ${T('checkinDoneBanner')}` },
  }[bannerState];

  return (
    <>
      <div style={{ borderRadius: 16, background: bannerConfig.bg, padding: '18px 20px', marginBottom: 12, color: '#fff' }}>
        <div style={{ fontWeight: 700, fontSize: 17, textAlign: 'center' }}>{T('todayCheckin')}</div>
        <div style={{ textAlign: 'center', fontSize: 16, opacity: 0.8, marginTop: 3, marginBottom: 14 }}>{bannerConfig.sub}</div>
        <button onClick={() => { if (bannerState !== 'done') overlay.open('checkin'); }}
          style={{ width: '100%', padding: '11px 0', borderRadius: 12, border: '2px solid rgba(255,255,255,.6)', background: 'rgba(255,255,255,.18)', color: '#fff', fontWeight: 700, fontSize: 16, cursor: bannerState === 'done' ? 'default' : 'pointer', opacity: bannerState === 'done' ? 0.7 : 1 }}>
          {bannerConfig.btn}
        </button>
      </div>

      <div style={{ ...cardStyle, textAlign: 'center', padding: '20px 16px' } as React.CSSProperties}>
        <div style={{ fontSize: 34 }}>🔷</div>
        <div style={{ color: TH.sub, fontSize: 16, marginTop: 6 }}>{T('streak')}</div>
        <div style={{ fontSize: 52, fontWeight: 800, color: COLORS.ORANGE, lineHeight: 1.1 }}>{store.streak}</div>
        <div style={{ color: TH.sub, fontSize: 16, marginTop: 4 }}>{T('days')}</div>
        <div style={{ fontSize: 16, color: TH.sub, marginTop: 8 }}>{T('gracePeriodHint')}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {statsData.map((item) => (
          <div key={item.label} style={{ background: item.bg, borderRadius: 14, padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 22 }}>{item.icon}</div>
            <div style={{ fontSize: 16, color: 'rgba(255,255,255,.78)' }}>{item.label}</div>
            <div style={{ fontWeight: 700, color: '#fff', fontSize: 17 }}>{item.value}<span style={{ fontSize: 16, fontWeight: 400 }}> {item.unit}</span></div>
          </div>
        ))}
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>⚖️ {T('todayWeight')}</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: P }}>{todayWeight != null ? todayWeight : '—'}</span>
            <span style={{ color: TH.sub, fontSize: 16 }}>{T('checkinKg')}</span>
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>{T('water')}</span>
          <span style={{ color: TH.sub, fontSize: 16, cursor: 'pointer' }} onClick={() => { setWgi(String(store.waterGoal)); setShowWG(true); }}>
            <span style={{ fontWeight: 600, color: P }}>{store.waterMl}</span> ml / {store.waterGoal}ml ✏️
          </span>
        </div>
        <div style={{ height: 6, background: TH.border, borderRadius: 3, marginBottom: 12, overflow: 'hidden' }}>
          <div style={waterProgress} />
        </div>
        <button onClick={() => store.addWater(250)} style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: COLORS.BLUE, color: '#fff', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>+ 250ml</button>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: COLORS.ORANGE }}>{T('addFood')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: COLORS.ORANGE }}>{totalCal}</span>
          <span style={{ color: TH.sub, fontSize: 16 }}>/ {store.calGoal} kcal</span>
          <span style={{ cursor: 'pointer', fontSize: 16 }} onClick={() => { setCgi(String(store.calGoal)); setShowCG(true); }}>✏️</span>
        </div>
        <div style={{ height: 4, background: TH.border, borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
          <div style={calProgress} />
        </div>
      </div>

      <button onClick={() => setShowFood(true)}
        style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: COLORS.ORANGE, color: '#fff', fontWeight: 600, fontSize: 16, cursor: 'pointer', marginBottom: 12, position: 'relative', zIndex: 1 }}>
        {T('addFoodBtn')}
      </button>

      {showFood && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: TH.cardSolid, borderRadius: 20, padding: 24, width: '100%', maxWidth: 340 }}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16, color: TH.text }}>{T('addFood')}</div>
            <input value={fn} onChange={(e) => setFn(e.target.value)} placeholder={T('foodName')} style={{ ...inp(TH), marginBottom: 10, border: `2px solid ${P}` } as React.CSSProperties} />
            <input type="number" value={fc} onChange={(e) => setFc(e.target.value)} placeholder={T('calories2')} style={{ ...inp(TH), marginBottom: 10 } as React.CSSProperties} />
            <textarea value={fnote} onChange={(e) => setFnote(e.target.value)} placeholder={T('notePlaceholder')} rows={2}
              style={{ width: '100%', background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 10, padding: '10px 12px', color: TH.text, fontSize: 16, resize: 'none', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
            <div style={{ fontSize: 16, color: TH.sub, marginBottom: 8 }}>{T('quickAdd')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16 }}>
              {QUICK_FOODS.map((f) => (
                <button key={f.name} onClick={() => { setFn(f.name); setFc(String(f.cal)); }}
                  style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${TH.border}`, background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ fontSize: 16, color: TH.text }}>{f.name}</div>
                  <div style={{ fontSize: 16, color: P, marginTop: 2 }}>{f.cal}</div>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowFood(false); setFn(''); setFc(''); setFnote(''); }} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${TH.border}`, background: 'transparent', color: TH.sub, fontSize: 16, cursor: 'pointer' }}>{T('cancel')}</button>
              <button onClick={() => { if (fn.trim()) { store.addFood({ name: fn, calories: +fc || 0, note: fnote, timestamp: Date.now() }); setFn(''); setFc(''); setFnote(''); setShowFood(false); } }}
                style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: COLORS.ORANGE, color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>{T('confirm')}</button>
            </div>
          </div>
        </div>
      )}

      {showWG && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: TH.cardSolid, borderRadius: 20, padding: 24, width: '100%', maxWidth: 320, textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6, color: TH.text }}>{T('waterGoalSetting')}</div>
            <div style={{ fontSize: 16, color: TH.sub, marginBottom: 16 }}>{T('waterGoalHint')}</div>
            <input type="number" value={wgi} onChange={(e) => setWgi(e.target.value)}
              style={{ ...inp(TH), fontSize: 22, fontWeight: 700, textAlign: 'center', marginBottom: 20, border: `2px solid ${COLORS.BLUE}`, width: '100%', boxSizing: 'border-box' } as React.CSSProperties} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowWG(false)} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${TH.border}`, background: 'transparent', color: TH.sub, fontSize: 16, cursor: 'pointer' }}>{T('cancel')}</button>
              <button onClick={() => { store.setWaterGoal(Math.max(500, Math.min(3000, +wgi || 2000))); setShowWG(false); }}
                style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: COLORS.BLUE, color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>{T('save')}</button>
            </div>
          </div>
        </div>
      )}

      {showCG && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: TH.cardSolid, borderRadius: 20, padding: 24, width: '100%', maxWidth: 320, textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6, color: TH.text }}>{T('calGoalSetting')}</div>
            <div style={{ fontSize: 16, color: TH.sub, marginBottom: 16 }}>{T('calGoalHint')}</div>
            <input type="number" value={cgi} onChange={(e) => setCgi(e.target.value)}
              style={{ ...inp(TH), fontSize: 22, fontWeight: 700, textAlign: 'center', marginBottom: 20, border: `2px solid ${COLORS.GREEN}`, width: '100%', boxSizing: 'border-box' } as React.CSSProperties} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowCG(false)} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${TH.border}`, background: 'transparent', color: TH.sub, fontSize: 16, cursor: 'pointer' }}>{T('cancel')}</button>
              <button onClick={() => { store.setCalGoal(Math.max(500, Math.min(10000, +cgi || 2000))); setShowCG(false); }}
                style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: COLORS.GREEN, color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>{T('save')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
