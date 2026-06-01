'use client';

import { useMemo } from 'react';
import { THEMES, aggregateWeightData, aggregateDailyCalories, aggregateWeeklyKm, FONT_BODY, FONT_BUTTON, FONT_TITLE, FONT_SUB, FONT_BADGE, FONT_STAT_CARD, FONT_STAT_SECTION, FONT_BACK } from '@egoless-do/core';
import { useT, cs } from './helpers';
import { useWebStore } from '../store/useWebStore';
import LineChart from './charts/LineChart';
import BarChart from './charts/BarChart';
import CalendarGrid from './charts/CalendarGrid';
import { Flame, Sparkles, Brain, Circle, Timer, Utensils, CalendarCheck, CalendarDays, Zap, PersonStanding, Dumbbell, BarChart3, TrendingUp, Shield } from 'lucide-react';

export default function StatsTab() {
  const store = useWebStore();
  const TH = THEMES[store.theme];
  const P = TH.primary;
  const T = useT();
  const activeHabits = store.habits.filter((h) => h.status === 'inProgress').length;

  const exerciseLog = store.exerciseLog ?? [];
  const now = Date.now();
  const weekStart = now - 7 * 24 * 3600 * 1000;
  const monthStart = now - 30 * 24 * 3600 * 1000;
  const weekKm = exerciseLog.filter(e => e.timestamp >= weekStart).reduce((s, e) => s + (e.distanceKm ?? 0), 0);
  const monthKm = exerciseLog.filter(e => e.timestamp >= monthStart).reduce((s, e) => s + (e.distanceKm ?? 0), 0);
  const allPaces = exerciseLog.filter(e => e.avgPace && e.avgPace > 0).map(e => e.avgPace!);
  const bestPace = allPaces.length > 0 ? Math.min(...allPaces) : 0;
  const bestPaceStr = bestPace > 0 ? `${Math.floor(bestPace / 60)}:${String(Math.floor(bestPace % 60)).padStart(2, '0')}` : '--';

  const totalFastHours = (() => {
    const totalSec = store.fastingHistory.reduce((sum, f) => {
      if (f.endedAt && f.startedAt) return sum + (f.endedAt - f.startedAt) / 1000;
      return sum;
    }, 0);
    return Math.round(totalSec / 3600);
  })();

  // Chart data (memoized)
  const weightData = useMemo(() => aggregateWeightData(store.checkinHistory ?? [], 30), [store.checkinHistory]);
  const caloriesData = useMemo(() => aggregateDailyCalories(store.foodLog ?? [], 7), [store.foodLog]);
  const exerciseTrendData = useMemo(() => aggregateWeeklyKm(exerciseLog, 8), [exerciseLog]);

  const graceCount = (store.graceHistory ?? []).length;
  const keyMetrics = [
    { label: T('streak'), value: `${store.streak} ${T('days')}`, Icon: Flame, bg: '#F97316' },
    { label: T('statsReflections'), value: `${store.reflections.length} ${T('fastTimes')}`, Icon: Sparkles, bg: P },
    { label: T('statsMeditation'), value: `${store.totalMedMinutes} ${T('medMinutes')}`, Icon: Brain, bg: '#22C55E' },
    { label: T('statsActiveHabits'), value: `${activeHabits} ${T('habitDays')}`, Icon: Circle, bg: '#3B82F6' },
    { label: T('totalFasting'), value: `${totalFastHours}h`, Icon: Timer, bg: '#8B5CF6' },
    { label: T('graceStatsTitle'), value: `${graceCount} ${T('graceUsedTimes')}`, Icon: Shield, bg: '#F59E0B' },
  ];

  const exerciseMetrics = [
    { label: T('exerciseWeekKm'), value: `${weekKm.toFixed(1)} km`, Icon: CalendarCheck, bg: '#00897B' },
    { label: T('exerciseMonthKm'), value: `${monthKm.toFixed(1)} km`, Icon: CalendarDays, bg: '#5C6BC0' },
    { label: T('exerciseBestPace'), value: `${bestPaceStr} /km`, Icon: Zap, bg: '#FF6F00' },
    { label: T('exerciseTotalTime'), value: `${Math.round(exerciseLog.reduce((s, e) => s + e.durationSec, 0) / 60)} ${T('exerciseMin')}`, Icon: PersonStanding, bg: '#E91E63' },
    { label: T('exerciseTotalCount'), value: `${exerciseLog.length} ${T('fastTimes')}`, Icon: Dumbbell, bg: '#9C27B0' },
  ];

  const cardStyle: React.CSSProperties = { ...cs(TH), padding: 16 };

  return (
    <>
      {/* ── Check-in Calendar ── */}
      <div style={cardStyle}>
        <div style={{ fontSize: FONT_BUTTON, fontWeight: 600, color: TH.text, marginBottom: 12 }}>
          <CalendarCheck size={15} style={{verticalAlign:'middle',marginRight:4}} />{T('statsCheckinHeatmap')}
        </div>
        <CalendarGrid history={store.checkinHistory ?? []} />
      </div>

      {/* ── Key Metrics ── */}
      <div style={{ fontSize: FONT_BUTTON, fontWeight: 600, color: TH.sub, marginBottom: 10 }}>{T('statsKeyMetrics')}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
        {keyMetrics.map((s, i) => (
          <div key={i} style={{
            background: s.bg, borderRadius: 14, padding: 14,
            display: 'flex', flexDirection: 'column', gap: 3,
          } as React.CSSProperties}>
            <div style={{ fontSize: FONT_BACK, color: '#fff' }}><s.Icon size={20} /></div>
            <div style={{ fontSize: FONT_TITLE, fontWeight: 800, color: '#fff', marginTop: 2 }}>{s.value}</div>
            <div style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.75)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Exercise Stats Grid ── */}
      <div style={{ fontSize: FONT_BUTTON, fontWeight: 600, color: TH.sub, marginBottom: 10 }}>{T('statsExerciseStats')}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
        {exerciseMetrics.map((s, i) => (
          <div key={i} style={{
            background: s.bg, borderRadius: 14, padding: 14,
            display: 'flex', flexDirection: 'column', gap: 3,
          } as React.CSSProperties}>
            <div style={{ fontSize: FONT_BACK, color: '#fff' }}><s.Icon size={20} /></div>
            <div style={{ fontSize: FONT_TITLE, fontWeight: 800, color: '#fff', marginTop: 2 }}>{s.value}</div>
            <div style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.75)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Exercise Trend (conditional) ── */}
      {exerciseTrendData.some(d => d.value > 0) && (
        <div style={cardStyle}>
          <div style={{ fontSize: FONT_BUTTON, fontWeight: 600, color: TH.text, marginBottom: 12 }}>
            <PersonStanding size={15} style={{verticalAlign:'middle',marginRight:4}} />{T('statsExerciseTrend')}
          </div>
          <LineChart data={exerciseTrendData} color="#3B82F6" showArea suffix=" km" />
        </div>
      )}

      {/* ── Weight Trend (conditional) ── */}
      {weightData.length >= 2 && (
        <div style={cardStyle}>
          <div style={{ fontSize: FONT_BUTTON, fontWeight: 600, color: TH.text, marginBottom: 12 }}>
            <TrendingUp size={15} style={{verticalAlign:'middle',marginRight:4}} />{T('statsWeightTrend')}
          </div>
          <LineChart data={weightData.map(d => ({ label: d.date, value: d.value }))}
            color="#E91E63" showArea suffix={` ${T('statsKg')}`} />
        </div>
      )}

      {/* ── Daily Calories (conditional) ── */}
      {caloriesData.some(d => d.value > 0) && (
        <div style={cardStyle}>
          <div style={{ fontSize: FONT_BUTTON, fontWeight: 600, color: TH.text, marginBottom: 12 }}>
            <BarChart3 size={15} style={{verticalAlign:'middle',marginRight:4}} />{T('statsDailyCalories')}
          </div>
          <BarChart data={caloriesData} color="#F59E0B" />
        </div>
      )}

      {/* ── Premium Banner ── */}
      <div style={{
        background: `linear-gradient(135deg,#4C1D95,${P})`, borderRadius: 16, padding: 16,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: FONT_BODY, fontWeight: 600, color: '#fff' }}>{T('premiumTitle')}</div>
          <div style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.6)', marginTop: 2 }}>{T('premiumSub')}</div>
        </div>
        <button style={{
          padding: '8px 14px', borderRadius: 10,
          border: '1px solid rgba(255,255,255,.3)', background: 'rgba(255,255,255,.15)',
          color: '#fff', fontSize: FONT_SUB, cursor: 'pointer',
        }}>{T('learnMore')}</button>
      </div>
    </>
  );
}
