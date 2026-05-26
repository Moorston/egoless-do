'use client';

import { useMemo } from 'react';
import { THEMES, aggregateWeightData, aggregateDailyCalories, aggregateWeeklyKm, buildHeatmapGrid } from '@egoless-do/core';
import { useT, cs } from './helpers';
import { useWebStore } from '../store/useWebStore';
import LineChart from './charts/LineChart';
import BarChart from './charts/BarChart';
import HeatmapGrid from './charts/HeatmapGrid';

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
  const heatmapGrid = useMemo(() => buildHeatmapGrid(store.checkinHistory ?? [], 4), [store.checkinHistory]);
  const caloriesData = useMemo(() => aggregateDailyCalories(store.foodLog ?? [], 7), [store.foodLog]);
  const exerciseTrendData = useMemo(() => aggregateWeeklyKm(exerciseLog, 8), [exerciseLog]);

  const keyMetrics = [
    { label: T('streak'), value: `${store.streak} ${T('days')}`, icon: '🔥', bg: '#F97316' },
    { label: T('statsReflections'), value: `${store.reflections.length} ${T('fastTimes')}`, icon: '✦', bg: P },
    { label: T('statsMeditation'), value: `${store.totalMedMinutes} ${T('medMinutes')}`, icon: '☯', bg: '#22C55E' },
    { label: T('statsActiveHabits'), value: `${activeHabits} ${T('habitDays')}`, icon: '◇', bg: '#3B82F6' },
    { label: T('totalFasting'), value: `${totalFastHours}h`, icon: '⏱', bg: '#8B5CF6' },
    { label: T('statsFoodLog'), value: `${store.foodLog.length} ${T('fastTimes')}`, icon: '🍽', bg: '#F59E0B' },
  ];

  const exerciseMetrics = [
    { label: T('exerciseWeekKm'), value: `${weekKm.toFixed(1)} km`, icon: '📅', bg: '#00897B' },
    { label: T('exerciseMonthKm'), value: `${monthKm.toFixed(1)} km`, icon: '📆', bg: '#5C6BC0' },
    { label: T('exerciseBestPace'), value: `${bestPaceStr} /km`, icon: '⚡', bg: '#FF6F00' },
    { label: T('exerciseTotalTime'), value: `${Math.round(exerciseLog.reduce((s, e) => s + e.durationSec, 0) / 60)} ${T('exerciseMin')}`, icon: '🏃', bg: '#E91E63' },
    { label: T('exerciseTotalCount'), value: `${exerciseLog.length} ${T('fastTimes')}`, icon: '🏋', bg: '#9C27B0' },
  ];

  const cardStyle: React.CSSProperties = { ...cs(TH), padding: 16 };

  return (
    <>
      {/* ── Key Metrics ── */}
      <div style={{ fontSize: 15, fontWeight: 600, color: TH.sub, marginBottom: 10 }}>{T('statsKeyMetrics')}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
        {keyMetrics.map((s, i) => (
          <div key={i} style={{
            background: s.bg, borderRadius: 14, padding: 14,
            display: 'flex', flexDirection: 'column', gap: 3,
          } as React.CSSProperties}>
            <div style={{ fontSize: 20 }}>{s.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginTop: 2 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.75)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Weight Trend (conditional) ── */}
      {weightData.length >= 2 && (
        <div style={cardStyle}>
          <div style={{ fontSize: 15, fontWeight: 600, color: TH.text, marginBottom: 12 }}>
            📈 {T('statsWeightTrend')}
          </div>
          <LineChart data={weightData.map(d => ({ label: d.date, value: d.value }))}
            color="#E91E63" showArea suffix={` ${T('statsKg')}`} />
        </div>
      )}

      {/* ── Check-in Heatmap ── */}
      <div style={cardStyle}>
        <div style={{ fontSize: 15, fontWeight: 600, color: TH.text, marginBottom: 12 }}>
          📅 {T('statsCheckinHeatmap')}
        </div>
        <HeatmapGrid grid={heatmapGrid}
          activeColor={P} inactiveColor={`${P}18`} />
      </div>

      {/* ── Daily Calories (conditional) ── */}
      {caloriesData.some(d => d.value > 0) && (
        <div style={cardStyle}>
          <div style={{ fontSize: 15, fontWeight: 600, color: TH.text, marginBottom: 12 }}>
            📊 {T('statsDailyCalories')}
          </div>
          <BarChart data={caloriesData} color="#F59E0B" />
        </div>
      )}

      {/* ── Exercise Trend (conditional) ── */}
      {exerciseTrendData.some(d => d.value > 0) && (
        <div style={cardStyle}>
          <div style={{ fontSize: 15, fontWeight: 600, color: TH.text, marginBottom: 12 }}>
            🏃 {T('statsExerciseTrend')}
          </div>
          <LineChart data={exerciseTrendData} color="#3B82F6" showArea suffix=" km" />
        </div>
      )}

      {/* ── Exercise Stats Grid ── */}
      <div style={{ fontSize: 15, fontWeight: 600, color: TH.sub, marginBottom: 10 }}>{T('statsExerciseStats')}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
        {exerciseMetrics.map((s, i) => (
          <div key={i} style={{
            background: s.bg, borderRadius: 14, padding: 14,
            display: 'flex', flexDirection: 'column', gap: 3,
          } as React.CSSProperties}>
            <div style={{ fontSize: 20 }}>{s.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginTop: 2 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.75)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Premium Banner ── */}
      <div style={{
        background: `linear-gradient(135deg,#4C1D95,${P})`, borderRadius: 16, padding: 16,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{T('premiumTitle')}</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,.6)', marginTop: 2 }}>{T('premiumSub')}</div>
        </div>
        <button style={{
          padding: '8px 14px', borderRadius: 10,
          border: '1px solid rgba(255,255,255,.3)', background: 'rgba(255,255,255,.15)',
          color: '#fff', fontSize: 14, cursor: 'pointer',
        }}>{T('learnMore')}</button>
      </div>
    </>
  );
}
