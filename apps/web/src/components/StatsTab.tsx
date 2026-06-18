'use client';

import { useMemo } from 'react';
import { THEMES, aggregateWeightData, aggregateDailyCalories, aggregateWeeklyKm, FONT_BODY, FONT_BUTTON, FONT_SUB } from '@egoless-do/core';
import { useT, cs } from './helpers';
import { useWebStore } from '../store/useWebStore';
import { useShallow } from 'zustand/react/shallow';
import LineChart from './charts/LineChart';
import BarChart from './charts/BarChart';
import CalendarGrid from './charts/CalendarGrid';
import { Flame, Sparkles, Brain, Circle, Timer, CalendarCheck, CalendarDays, Zap, PersonStanding, Dumbbell, BarChart3, TrendingUp, Shield } from 'lucide-react';

export default function StatsTab() {
  const {
    theme, language, streak, reflections, totalMedMinutes, habits,
    fastingHistory, checkinHistory, foodLog, exerciseLog, graceHistory,
  } = useWebStore(useShallow((s) => ({
    theme: s.theme,
    language: s.language,
    streak: s.streak,
    reflections: s.reflections,
    totalMedMinutes: s.totalMedMinutes,
    habits: s.habits,
    fastingHistory: s.fastingHistory,
    checkinHistory: s.checkinHistory,
    foodLog: s.foodLog,
    exerciseLog: s.exerciseLog,
    graceHistory: s.graceHistory,
  })));
  const TH = THEMES[theme];
  const P = TH.primary;
  const T = useT();
  const activeHabits = (habits ?? []).filter((h) => !h.deleted && h.status === 'inProgress').length;

  const { exerciseLogData, weekKm, monthKm, bestPace, bestPaceStr } = useMemo(() => {
    const data = (exerciseLog ?? []).filter(e => !e.deleted);
    const now = Date.now();
    const weekStart = now - 7 * 24 * 3600 * 1000;
    const monthStart = now - 30 * 24 * 3600 * 1000;
    const wk = data.filter(e => e.timestamp >= weekStart).reduce((s, e) => s + (e.distanceKm ?? 0), 0);
    const mk = data.filter(e => e.timestamp >= monthStart).reduce((s, e) => s + (e.distanceKm ?? 0), 0);
    const paces = data.filter(e => e.avgPace && e.avgPace > 0).map(e => e.avgPace!);
    const bp = paces.length > 0 ? Math.min(...paces) : 0;
    const bps = bp > 0 ? `${Math.floor(bp / 60)}:${String(Math.floor(bp % 60)).padStart(2, '0')}` : '--';
    return { exerciseLogData: data, weekKm: wk, monthKm: mk, bestPace: bp, bestPaceStr: bps };
  }, [exerciseLog]);

  const totalFastHours = useMemo(() => {
    const totalSec = (fastingHistory ?? []).filter(f => !f.deleted).reduce((sum, f) => {
      if (f.endedAt && f.startedAt) return sum + (f.endedAt - f.startedAt) / 1000;
      return sum;
    }, 0);
    return Math.round(totalSec / 3600);
  }, [fastingHistory]);

  // Chart data (memoized)
  const weightData = useMemo(() => aggregateWeightData(checkinHistory ?? [], 30), [checkinHistory]);
  const caloriesData = useMemo(() => aggregateDailyCalories(foodLog ?? [], 7), [foodLog]);
  const exerciseTrendData = useMemo(() => aggregateWeeklyKm(exerciseLogData, 8), [exerciseLogData]);

  const graceCount = useMemo(() => (graceHistory ?? []).filter(g => !g.deleted).length, [graceHistory]);
  const keyMetrics = [
    { label: T('streak'), value: `${streak}`, unit: T('days'), Icon: Flame },
    { label: T('statsReflections'), value: `${(reflections ?? []).filter(r => !r.deleted).length}`, unit: T('fastTimes'), Icon: Sparkles },
    { label: T('statsMeditation'), value: `${totalMedMinutes}`, unit: T('medMinutes'), Icon: Brain },
    { label: T('statsActiveHabits'), value: `${activeHabits}`, unit: T('habitDays'), Icon: Circle },
    { label: T('totalFasting'), value: `${totalFastHours}`, unit: 'h', Icon: Timer },
    { label: T('graceStatsTitle'), value: `${graceCount}`, unit: T('graceUsedTimes'), Icon: Shield },
  ];

  const exerciseMetrics = [
    { label: T('exerciseWeekKm'), value: `${weekKm.toFixed(1)}`, unit: 'km', Icon: CalendarCheck },
    { label: T('exerciseMonthKm'), value: `${monthKm.toFixed(1)}`, unit: 'km', Icon: CalendarDays },
    { label: T('exerciseBestPace'), value: bestPaceStr, unit: '/km', Icon: Zap },
    { label: T('exerciseTotalTime'), value: `${Math.round(exerciseLogData.reduce((s, e) => s + e.durationSec, 0) / 60)}`, unit: T('exerciseMin'), Icon: PersonStanding },
    { label: T('exerciseTotalCount'), value: `${exerciseLogData.length}`, unit: T('fastTimes'), Icon: Dumbbell },
  ];

  const cardStyle: React.CSSProperties = { ...cs(TH), padding: 16 };

  return (
    <>
      {/* ── Check-in Calendar ── */}
      <div style={cardStyle}>
        <div style={{ fontSize: FONT_BUTTON, fontWeight: 600, color: TH.text, marginBottom: 12 }}>
          <CalendarCheck size={15} style={{verticalAlign:'middle',marginRight:4}} />{T('statsCheckinHeatmap')}
        </div>
        <CalendarGrid history={checkinHistory ?? []} />
      </div>

      {/* ── Key Metrics ── */}
      <div style={{ fontSize: FONT_BODY, fontWeight: 600, color: TH.sub, marginBottom: 10 }}>{T('statsKeyMetrics')}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {keyMetrics.map((s, i) => (
          <div key={i} style={{
            background: TH.card, borderRadius: 14, padding: 16, border: `1px solid ${TH.border}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          }}>
            <s.Icon size={26} color={P} />
            <span style={{ fontWeight: 700, color: P, fontSize: 26, textAlign: 'center' }}>{s.value}<span style={{ fontSize: FONT_SUB, fontWeight: 400, color: TH.sub }}> {s.unit}</span></span>
            <span style={{ fontSize: FONT_BODY, color: TH.sub, textAlign: 'center' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Exercise Stats Grid ── */}
      <div style={{ fontSize: FONT_BODY, fontWeight: 600, color: TH.sub, marginBottom: 10 }}>{T('statsExerciseStats')}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {exerciseMetrics.map((s, i) => (
          <div key={i} style={{
            background: TH.card, borderRadius: 14, padding: 16, border: `1px solid ${TH.border}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          }}>
            <s.Icon size={26} color={P} />
            <span style={{ fontWeight: 700, color: P, fontSize: 26, textAlign: 'center' }}>{s.value}<span style={{ fontSize: FONT_SUB, fontWeight: 400, color: TH.sub }}> {s.unit}</span></span>
            <span style={{ fontSize: FONT_BODY, color: TH.sub, textAlign: 'center' }}>{s.label}</span>
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
