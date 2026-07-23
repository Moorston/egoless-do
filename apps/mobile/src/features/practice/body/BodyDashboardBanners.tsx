// ─── BodyDashboardBanners ─────────────────────────────────────
// Banner 轮播组件：4 个 Banner 卡片 + 指示器
// 从 BodyDashboard.tsx 提取，所有数据通过 Props 传入

import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL, FONT_STAT_CARD, type BodyGoal, type BodyTrainingPlan, type DayOverride, type ExerciseDef, type BodyCheckin } from '@egoless-do/core';
import type { FlowState } from './hooks/useBodyFlowState';
import { Play, TrendingUp, Scale, History, ChevronRight, Calendar } from 'lucide-react-native';
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

import { BANNER_WIDTH, styles } from './BodyDashboardStyles';

interface BannerCarouselProps {
  TH: { primary: string; sub: string; bg: string; card: string; border: string; text: string };
  T: (key: string, params?: Record<string, string | number>) => string;
  nav: { navigate: (route: string, params?: never) => void };
  currentBanner: number;
  onBannerChange: (index: number) => void;
  bannerScrollRef: React.RefObject<ScrollView>;
  todayPlanDisplay: { icon: string; label: string; note?: string } | null;
  todayExercises?: ExerciseDef[];
  hasOverride: boolean;
  todayOverride?: DayOverride;
  hasActiveFlow: boolean;
  allFlowDone: boolean;
  flowState: FlowState | null;
  activeTrainingPlan?: BodyTrainingPlan;
  onFlowStart: () => void;
  onFlowStartWithPlan: (planId: string) => void;
  onUndoOverride: () => void;
  profile: Record<string, unknown>;
  activeGoal?: BodyGoal;
  onEditGoal: () => void;
  onOpenAssessment: () => void;
  onOpenCheckin: () => void;
  onOpenWeightRecord: () => void;
  onOpenWeightTrend: () => void;
  latestCheckin?: BodyCheckin;
  checkinHistory?: { deleted?: boolean; weight?: number; date: string }[];
  weightTrend: { current: number; diff: number; date: string } | null;
}

export default function BannerCarousel({
  TH, T, nav, currentBanner, onBannerChange, bannerScrollRef,
  todayPlanDisplay, todayExercises, hasOverride, todayOverride,
  hasActiveFlow, allFlowDone, flowState, activeTrainingPlan,
  onFlowStart, onFlowStartWithPlan, onUndoOverride,
  profile, onOpenAssessment, onOpenCheckin, onOpenWeightRecord, onOpenWeightTrend,
  latestCheckin, checkinHistory, weightTrend,
}: BannerCarouselProps) {
  return (
    <>
      {/* ── Banner Carousel ── */}
  <View style={styles.bannerContainer}>
    <ScrollView
      ref={bannerScrollRef}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      onMomentumScrollEnd={(e) => {
        const index = Math.round(e.nativeEvent.contentOffset.x / BANNER_WIDTH);
        onBannerChange(index);
      }}
      style={{ width: BANNER_WIDTH }}
    >
      {/* Banner 1: 今日方案 */}
      <View style={[styles.bannerCard, { backgroundColor: '#f59e0b' }]}>
        <View style={styles.bannerHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 20 }}>📋</Text>
            <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#fff' }}>{T('bodyTodayPlan')}</Text>
          </View>
          <TouchableOpacity
            onPress={() => nav.navigate('ExerciseHistory' as never)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
          >
            <Text style={{ fontSize: FONT_SMALL(), color: '#fff', fontWeight: '600' }}>{T('exerciseHistory')}</Text>
          </TouchableOpacity>
        </View>
        {/* Override status bar */}
        {hasOverride && todayOverride && (
          <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: 8, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: FONT_SMALL(), color: '#fff' }}>
              {todayOverride.type === 'skip' ? T('bodyOverrideSkip')
                : todayOverride.type === 'swap' ? T('bodyOverrideSwap')
                : todayOverride.type === 'adjust' ? T('bodyOverrideAdjust')
                : T('bodyOverrideCustom')}
            </Text>
            <TouchableOpacity onPress={onUndoOverride} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: FONT_SMALL(), color: '#fff', fontWeight: '600', textDecorationLine: 'underline' }}>{T('bodyUndo')}</Text>
            </TouchableOpacity>
          </View>
        )}
        {todayOverride?.type === 'skip' ? (
          /* 跳过状态：显示已跳过 + 撤销，无开始按钮 */
          <View style={styles.bannerContent}>
            <View style={styles.bannerIconCircle}>
              <Text style={{ fontSize: 24 }}>⏭️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FONT_TITLE(), fontWeight: '800', color: '#fff' }}>{T('bodyOverrideSkip')}</Text>
              <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>{T('bodyUndoHint')}</Text>
            </View>
          </View>
        ) : todayPlanDisplay ? (
          <>
            <View style={styles.bannerContent}>
              <View style={styles.bannerIconCircle}>
                <Text style={{ fontSize: 24 }}>{todayPlanDisplay.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FONT_TITLE(), fontWeight: '800', color: '#fff' }}>{todayPlanDisplay.label}</Text>
                {todayPlanDisplay.note && (
                  <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.8)', marginTop: 2 }} numberOfLines={1}>
                    {todayPlanDisplay.note}
                  </Text>
                )}
              </View>
            </View>
            {/* ── Flow progress — 今日有计划即显示，不管 flowState 状态 ── */}
            {!allFlowDone && (
              <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 12, marginBottom: 10, gap: 8 }}>
                {/* Step 1: 调身练习 */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: flowState?.exerciseCompleted ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 14 }}>{flowState?.exerciseCompleted ? '✅' : '🏃'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#fff' }}>{T('bodyFlowPractice')}</Text>
                      {flowState?.exerciseCompleted && (
                        <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.7)' }}>
                          {flowState?.totalDurationSec ? `${Math.floor(flowState.totalDurationSec / 60)}:${String(flowState.totalDurationSec % 60).padStart(2, '0')}` : T('bodyFlowDone')}
                        </Text>
                      )}
                    </View>
                    {todayExercises && todayExercises.length > 0 && (
                      <View style={{ marginTop: 4 }}>
                        {todayExercises.slice(0, 5).map((e, i) => (
                          <Text key={i} style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.8)', lineHeight: 16 }}>
                            {e.icon} {e.nameZh}{e.defaultSets && e.defaultReps ? `  ${e.defaultSets}组×${e.defaultReps}次` : ''}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
                {/* Separator */}
                <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginLeft: 38 }} />
                {/* Step 2: 调息安神 */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: flowState?.breathingCompleted ? 'rgba(255,255,255,0.3)' : !flowState?.exerciseCompleted ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 14 }}>{flowState?.breathingCompleted ? '✅' : flowState?.exerciseCompleted ? '🌬️' : '○'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: flowState?.exerciseCompleted ? '#fff' : 'rgba(255,255,255,0.5)' }}>{T('bodyFlowBreathing')}</Text>
                    {flowState?.breathingCompleted && (
                      <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                        {Math.floor((flowState?.breathingDurationMs ?? 0) / 60000)}{T('bodyMin')}
                      </Text>
                    )}
                    {!flowState?.breathingCompleted && flowState?.exerciseCompleted && (
                      <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{T('bodyFlowBreathingHint')}</Text>
                    )}
                  </View>
                </View>
                {/* Separator */}
                <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginLeft: 38 }} />
                {/* Step 3: 记录感受 */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: flowState?.awarenessCompleted ? 'rgba(255,255,255,0.3)' : flowState?.breathingCompleted ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 14 }}>{flowState?.awarenessCompleted ? '✅' : flowState?.breathingCompleted ? '🧠' : '○'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: flowState?.breathingCompleted ? '#fff' : 'rgba(255,255,255,0.5)' }}>{T('bodyFlowAwareness')}</Text>
                    {flowState?.awarenessCompleted && (
                      <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{T('bodyFlowDone')}</Text>
                    )}
                    {!flowState?.awarenessCompleted && flowState?.breathingCompleted && (
                      <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{T('bodyFlowAwarenessHint')}</Text>
                    )}
                  </View>
                </View>
              </View>
            )}
            {allFlowDone && (
              <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: 10, marginBottom: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#fff' }}>{'✅ '}{T('bodyTodayComplete')}</Text>
              </View>
            )}
            {!hasActiveFlow ? (
              <TouchableOpacity
                onPress={() => {
                  if (activeTrainingPlan?.id) {
                    onFlowStartWithPlan?.(activeTrainingPlan.id);
                  } else {
                    onFlowStart?.();
                  }
                }}
                activeOpacity={0.85}
                style={styles.bannerButton}
              >
                <Play size={20} color="#f59e0b" />
                <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#f59e0b' }}>{T('bodyStartToday')}</Text>
              </TouchableOpacity>
            ) : !allFlowDone ? (
              <TouchableOpacity
                onPress={() => {
                  if (activeTrainingPlan?.id) {
                    onFlowStartWithPlan?.(activeTrainingPlan.id);
                  } else {
                    onFlowStart?.();
                  }
                }}
                activeOpacity={0.85}
                style={styles.bannerButton}
              >
                <Play size={20} color="#f59e0b" />
                <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#f59e0b' }}>
                  {!flowState?.exerciseCompleted ? T('bodyStartToday')
                    : !flowState?.breathingCompleted ? T('bodyFlowStartBreathing')
                    : T('bodyFlowAwareness')}
                </Text>
              </TouchableOpacity>
            ) : null}
          </>
        ) : (
          <>
            <View style={styles.bannerContent}>
              <View style={styles.bannerIconCircle}>
                <Text style={{ fontSize: 24 }}>😴</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FONT_TITLE(), fontWeight: '800', color: '#fff' }}>{T('bodyTodayPlanRest')}</Text>
                <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
                  {T('bodyFlowChooseExercise')}
                </Text>
              </View>
            </View>
            {/* Rest day suggestions */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {[
                { icon: '🧘', label: T('bodyPartWalking') },
                { icon: '🧘‍♀️', label: T('bodyPartYoga') },
                { icon: '🌬️', label: T('bodyFlowBreathing') },
              ].map((item, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => { if (activeTrainingPlan?.id) onFlowStartWithPlan?.(activeTrainingPlan.id); else onFlowStart?.(); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                >
                  <Text style={{ fontSize: 14 }}>{item.icon}</Text>
                  <Text style={{ fontSize: FONT_SMALL(), color: '#fff' }}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Body awareness quick stats */}
            {latestCheckin && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 8 }}>
                {[
                  { label: T('bodyEnergy'), value: latestCheckin.energy, color: '#fff' },
                  { label: T('bodyPain'), value: latestCheckin.pain, color: '#fff' },
                  { label: T('bodyComfort'), value: latestCheckin.comfort, color: '#fff' },
                ].map((item, i) => (
                  <View key={i} style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '800', color: item.color }}>{String(item.value)}</Text>
                    <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.7)' }}>{item.label}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </View>

      {/* Banner 2: 身体档案 */}
      <View style={[styles.bannerCard, { backgroundColor: '#8b5cf6' }]}>
        <View style={styles.bannerHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 20 }}>📋</Text>
            <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#fff' }}>{T('bodyProfile')}</Text>
          </View>
        </View>
        <View style={styles.bannerContent}>
          <View style={{ flex: 1 }}>
            {/* Body metrics - single row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              {[
                { value: profile.weight ? `${profile.weight}` : '-', unit: 'kg', label: T('bodyWeight') },
                { value: profile.height ? `${profile.height}` : '-', unit: 'cm', label: T('bodyHeight') },
                { value: profile.weight && profile.height ? `${(profile.weight / ((profile.height / 100) ** 2)).toFixed(1)}` : '-', unit: '', label: 'BMI' },
                { value: profile.bodyFat ? `${profile.bodyFat}` : '-', unit: '%', label: T('bodyBodyFat') },
              ].map((item, i) => (
                <View key={i} style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '800', color: '#fff' }}>{String(item.value)}{item.unit}</Text>
                  <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.7)' }}>{item.label}</Text>
                </View>
              ))}
            </View>
            {/* Self assessment full content */}
            {profile.selfAssessment ? (
              <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 10 }}>
                <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.9)', lineHeight: 18 }}>
                  🗣️ {profile.selfAssessment}
                </Text>
                {(profile.bodyTags as string[] ?? []).length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {(profile.bodyTags as string[]).map((tag: string) => (
                      <View key={tag} style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                        <Text style={{ fontSize: FONT_SMALL(), color: '#fff' }}>#{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.7)' }}>
                {T('bodySelfAssessmentPlaceholder')}
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          onPress={() => onOpenAssessment()}
          activeOpacity={0.85}
          style={[styles.bannerButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]}
        >
          <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#8b5cf6' }}>{T('bodySelfAssessment')}</Text>
        </TouchableOpacity>
      </View>

      {/* Banner 3: 身体觉知 */}
      <View style={[styles.bannerCard, { backgroundColor: '#10b981' }]}>
        <View style={styles.bannerHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 20 }}>🧘</Text>
            <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#fff' }}>{T('bodyAwareness')}</Text>
          </View>
          <TouchableOpacity
            onPress={() => nav.navigate('BodyCheckinHistory' as never)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}
          >
            <Text style={{ fontSize: FONT_SMALL(), color: '#fff' }}>{T('bodyAwarenessRecords')}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.bannerContent}>
          <View style={{ flex: 1 }}>
            {latestCheckin ? (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                  {[
                    { label: T('bodyEnergy'), value: latestCheckin.energy, color: '#fff' },
                    { label: T('bodyPain'), value: latestCheckin.pain, color: '#fff' },
                    { label: T('bodyComfort'), value: latestCheckin.comfort, color: '#fff' },
                    { label: T('bodySleepQuality'), value: latestCheckin.sleep, color: '#fff' },
                  ].map((item, i) => (
                    <View key={i} style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '800', color: item.color }}>{String(item.value)}</Text>
                      <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.7)' }}>{item.label}</Text>
                    </View>
                  ))}
                </View>
                {/* Tags */}
                {latestCheckin.tags && latestCheckin.tags.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {latestCheckin.tags.map((tag: string) => (
                      <View key={tag} style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                        <Text style={{ fontSize: FONT_SMALL(), color: '#fff' }}>#{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {/* Note */}
                {latestCheckin.note && (
                  <Text style={{ fontSize: FONT_BODY(), color: 'rgba(255,255,255,0.8)', marginBottom: 4 }} numberOfLines={2}>
                    📝 {latestCheckin.note}
                  </Text>
                )}
                <Text style={{ fontSize: FONT_BODY(), color: 'rgba(255,255,255,0.6)' }}>
                  {latestCheckin.date}
                </Text>
              </>
            ) : (
              <Text style={{ fontSize: FONT_BODY(), color: 'rgba(255,255,255,0.8)' }}>
                {T('bodyAwarenessNoData')}
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          onPress={() => onOpenCheckin()}
          activeOpacity={0.85}
          style={[styles.bannerButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]}
        >
          <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#10b981' }}>{T('bodyFlowAwareness')}</Text>
        </TouchableOpacity>
      </View>

      {/* Banner 4: 体重趋势 */}
      <View style={[styles.bannerCard, { backgroundColor: '#3b82f6' }]}>
        <View style={styles.bannerHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 20 }}>⚖️</Text>
            <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#fff' }}>{T('bodyWeightTrend')}</Text>
          </View>
          <TouchableOpacity
            onPress={() => onOpenWeightRecord()}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
          >
            <Text style={{ fontSize: FONT_SMALL(), color: '#fff', fontWeight: '600' }}>{T('bodyRecordWeight')}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.bannerContent}>
          <View style={{ flex: 1 }}>
            {weightTrend ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <Text style={{ fontSize: FONT_TITLE(), fontWeight: '800', color: '#fff' }}>
                    {`${weightTrend.current} kg`}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <TrendingUp size={16} color={weightTrend.diff > 0 ? '#fbbf24' : '#34d399'} style={weightTrend.diff < 0 ? { transform: [{ scaleY: -1 }] } : undefined} />
                    <Text style={{ fontSize: FONT_BODY(), color: weightTrend.diff > 0 ? '#fbbf24' : '#34d399', fontWeight: '600' }}>
                      {`${weightTrend.diff > 0 ? '+' : ''}${weightTrend.diff.toFixed(1)} kg`}
                    </Text>
                  </View>
                </View>
                {/* Line chart - last 7 days */}
                <View style={{ height: 80, marginTop: 4 }}>
                  {(() => {
                    const records = (checkinHistory ?? [])
                      .filter(r => !r.deleted && r.weight != null && r.weight > 0)
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .slice(-7);
                    if (records.length < 2) return null;
                    const weights = records.map(r => r.weight);
                    const minW = Math.min(...weights);
                    const maxW = Math.max(...weights);
                    const range = maxW - minW || 1;
                    const chartHeight = 50;
                    const labelHeight = 20;
                    const totalHeight = chartHeight + labelHeight;
                    const chartWidth = BANNER_WIDTH - 80;
                    const stepX = chartWidth / (records.length - 1);

                    return (
                      <View style={{ position: 'relative', height: totalHeight }}>
                        {/* Line segments */}
                        {records.map((r, i) => {
                          if (i === 0) return null;
                          const prevR = records[i - 1];
                          const x1 = (i - 1) * stepX;
                          const y1 = chartHeight - ((prevR.weight - minW) / range) * (chartHeight - 15);
                          const x2 = i * stepX;
                          const y2 = chartHeight - ((r.weight - minW) / range) * (chartHeight - 15);
                          const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
                          const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
                          return (
                            <View
                              key={`line-${i}`}
                              style={{
                                position: 'absolute',
                                left: x1,
                                top: y1,
                                width: length,
                                height: 2,
                                backgroundColor: 'rgba(255,255,255,0.8)',
                                transform: [{ rotate: `${angle}deg` }],
                                transformOrigin: '0 0',
                              }}
                            />
                          );
                        })}
                        {/* Data points with weight labels */}
                        {records.map((r, i) => {
                          const x = i * stepX;
                          const y = chartHeight - ((r.weight - minW) / range) * (chartHeight - 15);
                          const isLast = i === records.length - 1;
                          return (
                            <React.Fragment key={`point-${i}`}>
                              {/* Weight value above point */}
                              <Text style={{
                                position: 'absolute',
                                left: x - 15,
                                top: y - 18,
                                fontSize: FONT_SMALL(),
                                color: '#fff',
                                fontWeight: isLast ? '700' : '500',
                                width: 30,
                                textAlign: 'center',
                              }}>
                                {String(r.weight)}
                              </Text>
                              {/* Point */}
                              <View style={{
                                position: 'absolute',
                                left: x - 5,
                                top: y - 5,
                                width: isLast ? 12 : 8,
                                height: isLast ? 12 : 8,
                                borderRadius: isLast ? 6 : 4,
                                backgroundColor: isLast ? '#fff' : 'rgba(255,255,255,0.7)',
                              }} />
                            </React.Fragment>
                          );
                        })}
                        {/* Date labels at bottom */}
                        {records.map((r, i) => (
                          <Text
                            key={`label-${i}`}
                            style={{
                              position: 'absolute',
                              left: i * stepX - 12,
                              top: chartHeight + 4,
                              fontSize: FONT_SMALL(),
                              color: 'rgba(255,255,255,0.8)',
                              width: 24,
                              textAlign: 'center',
                            }}
                          >
                            {r.date.slice(8)}
                          </Text>
                        ))}
                      </View>
                    );
                  })()}
                </View>
              </>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Text style={{ fontSize: 40, marginBottom: 8 }}>📊</Text>
                <Text style={{ fontSize: FONT_BODY(), color: 'rgba(255,255,255,0.8)' }}>
                  {T('bodyWeightNoData')}
                </Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity
          onPress={() => onOpenWeightTrend()}
          activeOpacity={0.85}
          style={[styles.bannerButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]}
        >
          <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#3b82f6' }}>{T('bodyMoreWeightTrend')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>

    {/* Banner indicators */}
    <View style={styles.bannerIndicators}>
      {[0, 1, 2, 3].map(i => (
        <View
          key={i}
          style={[
            styles.bannerDot,
            { backgroundColor: i === currentBanner ? '#fff' : 'rgba(255,255,255,0.4)' }
          ]}
        />
      ))}
    </View>
    {/* Guide text */}
    <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, textAlign: 'center', marginTop: 6 }}>
      {T('bodySwipeHint')}
    </Text>
  </View>
    </>
  );
}
