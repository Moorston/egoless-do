// ─── SleepSummaryCard — inline-editing sleep summary card ────────
// Replaces the old three-state (Empty/Read/Edit) card with a two-state
// (Empty/Read) inline-editing card.
//
// Visual states:
//   · Empty   — no todaySleep data; CTA button to start recording
//   · Read    — quality stars + work-state chips are directly editable
//
// Reference pattern: ExerciseCard inline editing (features/practice/body/components).

import {
  FONT_TITLE,
  FONT_BODY,
  FONT_LABEL,
  FONT_SUB,
  type I18nKey,
  type SleepEntry,
  type WorkState,
  type Theme,
} from '@egoless-do/core';
import * as Haptics from 'expo-haptics';
import {Star, Moon, Sun, ArrowRight, Check} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme, useT } from '../../components/UI';
import {useUiStore} from '../../store/uiStore';

import {
  formatDuration,
  formatTime,
  formatSleepDate,
  countGratitude,
  qualityLabel,
  WORK_STATE_OPTIONS,
} from './sleepSummaryLogic';

// ─── Props ────────────────────────────────────────────────────────

interface Props {
  todaySleep: SleepEntry | null | undefined;
  onSaveQuickDiary: (quality: number, workState?: WorkState | null) => void;
  onOpenFullDiary: () => void;
  sleepGoalEnabled?: boolean;
  sleepGoalHours?: number;
  sleepHistory?: SleepEntry[];
}

// ─── Constants ────────────────────────────────────────────────────

// Quality star colors: 1=red → 5=gold (severity gradient)
const QUALITY_COLORS = ['#EF4444', '#F97316', '#F59E0B', '#EAB308', '#FACC15'];

// 空态引导去重：session 级标记（首次进入显示完整引导，之后简化）
let hasShownEmptyGuide = false;

// ─── Component ────────────────────────────────────────────────────

export default function SleepSummaryCard({
  todaySleep,
  onSaveQuickDiary,
  onOpenFullDiary,
  sleepGoalEnabled = false,
  sleepGoalHours = 8,
  sleepHistory = [],
}: Props) {
  const TH = useTheme();
  const T = useT();

  // Display values derived from props.
  const quality = todaySleep?.quality ?? 0;
  const durationMin = todaySleep?.durationMin ?? 0;
  const bedtimeAt = todaySleep?.bedtimeAt;
  const wakeAt = todaySleep?.wakeAt;
  const barrierDone = todaySleep?.barrierDone ?? false;
  const gratitudeCount = countGratitude(todaySleep?.gratitude);
  const dateStr = todaySleep?.date;

  // ── Animation: save success indicator ────────────────────────────

  const [showSaved, setShowSaved] = useState(false);
  const savedOpacity = useRef(new Animated.Value(0)).current;

  const flashSaved = useCallback(() => {
    setShowSaved(true);
    savedOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(savedOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.delay(400),
      Animated.timing(savedOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => setShowSaved(false));
  }, [savedOpacity]);

  // ── Animation: per-star press scale ─────────────────────────────

  const starScales = useRef<[Animated.Value, Animated.Value, Animated.Value, Animated.Value, Animated.Value]>([
    new Animated.Value(1), new Animated.Value(1), new Animated.Value(1), new Animated.Value(1), new Animated.Value(1),
  ]).current;

  const animateStar = useCallback((index: number) => {
    const sv = starScales[index];
    sv.setValue(1);
    Animated.sequence([
      Animated.timing(sv, { toValue: 1.25, duration: 120, useNativeDriver: true }),
      Animated.spring(sv, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  }, [starScales]);

  // ── Animation: chip row spring on selection ──────────────────────

  const chipScale = useRef(new Animated.Value(1)).current;

  const animateChip = useCallback(() => {
    chipScale.setValue(1);
    Animated.sequence([
      Animated.timing(chipScale, { toValue: 1.04, duration: 100, useNativeDriver: true }),
      Animated.spring(chipScale, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
  }, [chipScale]);

  // ── Feedback ───────────────────────────────────────────────────

  const triggerFeedback = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    useUiStore.getState().showToast(T('sleepSaved'), 'success');
    flashSaved();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- warning-reduction: behavior preserved, proper exhaustive-deps fix deferred
  }, [flashSaved]);

  // ── Event handlers ─────────────────────────────────────────────

  const handleStarPress = useCallback((i: number) => {
    animateStar(i - 1);
    const currentWorkState = todaySleep?.workState ?? null;
    onSaveQuickDiary(i, currentWorkState === null ? undefined : currentWorkState);
    triggerFeedback();
  }, [todaySleep?.workState, onSaveQuickDiary, triggerFeedback, animateStar]);

  const handleWorkStatePress = useCallback((key: WorkState) => {
    animateChip();
    const currentQuality = Math.max(1, todaySleep?.quality ?? 0);
    const next: WorkState | null = todaySleep?.workState === key ? null : key;
    onSaveQuickDiary(currentQuality, next === null ? undefined : next);
    triggerFeedback();
  }, [todaySleep?.quality, todaySleep?.workState, onSaveQuickDiary, triggerFeedback, animateChip]);

  const handleEmptyCta = useCallback(() => {
    onSaveQuickDiary(3, undefined);
    triggerFeedback();
  }, [onSaveQuickDiary, triggerFeedback]);

  // ── Render helpers ─────────────────────────────────────────────

  const renderStars = (value: number, size = 28) => (
    <View style={s.starRow} testID="sleep-quality-stars">
      {[1, 2, 3, 4, 5].map(i => {
        const filled = i <= value;
        const color = filled ? QUALITY_COLORS[Math.min(i - 1, 4)] : TH.border;
        return (
          <Animated.View key={i} style={{ transform: [{ scale: starScales[i - 1] }] }}>
            <TouchableOpacity
              testID={`star-${i}`}
              onPress={() => handleStarPress(i)}
              disabled={!todaySleep}
              accessibilityLabel={filled ? T('sleepCurrentStar', { n: i }) : T('sleepSetStar', { n: i })}
              accessibilityRole="button"
              accessibilityState={{ selected: filled }}
              accessibilityHint={T('sleepTapToSaveQuality')}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Star
                size={size}
                color={color}
                fill={filled ? color : 'transparent'}
              />
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </View>
  );

  const renderWorkStateChips = () => (
    <Animated.View style={[s.chipRowWrap, { transform: [{ scale: chipScale }] }]}>
      <View style={s.chipRow}>
      {WORK_STATE_OPTIONS.map(({ key, labelKey }) => {
        const selected = todaySleep?.workState === key;
        return (
          <TouchableOpacity
            key={key}
            testID={`workstate-${key}`}
            onPress={() => handleWorkStatePress(key)}
            disabled={!todaySleep}
            accessibilityLabel={`${T('sleepWorkState')}: ${T(labelKey as I18nKey)}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityHint={T('sleepTapToSaveWorkState')}
            style={[
              s.chip,
              {
                borderColor: selected ? TH.primary : TH.border,
                backgroundColor: selected ? `${TH.primary}20` : 'transparent',
              },
            ]}
          >
            <Text style={[s.chipText, { color: selected ? TH.primary : TH.text }]}>
              {T(labelKey as I18nKey)}
            </Text>
          </TouchableOpacity>
        );
      })}
      </View>
    </Animated.View>
  );

  const renderGoalComparison = () => {
    if (!sleepGoalEnabled || durationMin <= 0) return null;
    const targetMin = sleepGoalHours * 60;
    const diff = durationMin - targetMin;
    const absMin = Math.abs(diff);
    const h = Math.floor(absMin / 60);
    const m = absMin % 60;
    const diffStr = h > 0 ? `${h}h${m}m` : `${m}m`;
    const isOnTarget = absMin <= 30;
    return (
      <Text style={[s.goalText, { color: isOnTarget ? '#10B981' : TH.sub }]}>
        {isOnTarget ? T('sleepGoalAchieved') : `${diff > 0 ? T('sleepMore') : T('sleepLess')} ${diffStr}`}
      </Text>
    );
  };

  // ── Empty state (no data) ──────────────────────────────────────

  if (!todaySleep) {
    return <EmptySleepCard theme={TH} onCta={handleEmptyCta} T={T as unknown as (key: string) => string} />;
  }

  // ── Read mode (has data) ───────────────────────────────────────

  const isOnTarget = sleepGoalEnabled && durationMin > 0 && Math.abs(durationMin - sleepGoalHours * 60) <= 30;

  return (
    <View
      style={[
        s.card,
        {
          backgroundColor: TH.card,
          borderColor: isOnTarget ? '#10B981' : TH.border,
          borderWidth: isOnTarget ? 2 : 1,
        },
      ]}
      testID="sleep-card-read"
    >
      {/* Save success indicator (top-right) */}
      {showSaved && (
        <Animated.View style={[s.savedWrap, { opacity: savedOpacity }]}>
          <View style={s.savedBadge}>
            <Check size={14} color="#fff" />
          </View>
        </Animated.View>
      )}
      {/* Header */}
      <View style={s.headerRow}>
        <Text style={[s.cardTitle, { color: TH.primary }]} accessibilityRole="header">
          {`${T('sleepRecord')} · ${formatSleepDate(dateStr)}`}
        </Text>
        <TouchableOpacity
          testID="sleep-diary-link"
          onPress={onOpenFullDiary}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={T('sleepOpenFullDiary')}
          accessibilityRole="link"
        >
          <Text style={[s.diaryLinkText, { color: TH.primary }]}>{T('sleepFullDiary')} →</Text>
        </TouchableOpacity>
      </View>

      {/* Quality stars (primary visual) */}
      {renderStars(quality, 28)}
      <Text style={[s.qualityLabel, { color: TH.sub }]}>
        {quality > 0 ? `${T('sleepQuality')}：${T(qualityLabel(quality) as import('@egoless-do/core').I18nKey)}` : T('sleepTapToRate')}
      </Text>

      {/* Duration + goal comparison */}
      <View style={s.durationRow}>
        <Text style={[s.durationText, { color: TH.text }]}>
          {durationMin > 0 ? formatDuration(durationMin) : '--'}
        </Text>
        {sleepGoalEnabled && (
          <Text style={[s.goalBaseText, { color: TH.sub }]}>
            {T('sleepGoal')} {sleepGoalHours}h · {renderGoalComparison()}
          </Text>
        )}
      </View>

      {/* Times */}
      <View style={s.timeRow}>
        {bedtimeAt && (
          <View style={s.timeItem}>
            <Moon size={14} color={TH.sub} />
            <Text style={[s.timeText, { color: TH.sub }]}>
              {formatTime(bedtimeAt)}
            </Text>
          </View>
        )}
        {bedtimeAt && wakeAt && (
          <ArrowRight size={14} color={TH.border} />
        )}
        {wakeAt && (
          <View style={s.timeItem}>
            <Sun size={14} color={TH.sub} />
            <Text style={[s.timeText, { color: TH.sub }]}>
              {formatTime(wakeAt)}
            </Text>
          </View>
        )}
      </View>

      {/* Work state chips */}
      <Text style={[s.sectionLabel, { color: TH.sub }]}>
        {T('sleepWorkState')}
      </Text>
      {renderWorkStateChips()}

      {/* Barrier + gratitude */}
      <View style={s.metaRow}>
        {barrierDone && (
          <View style={[s.badge, { backgroundColor: 'rgba(16,185,129,0.2)' }]}>
            <Text style={[s.badgeText, { color: '#10B981' }]}>{T('sleepRitual')}</Text>
          </View>
        )}
        {gratitudeCount > 0 && (
          <Text style={[s.metaText, { color: TH.sub }]}>{`${T('sleepGratitude')} ×${gratitudeCount}`}</Text>
        )}
      </View>

      {/* 7-day mini trend */}
      <MiniTrendChart data={sleepHistory} goalHours={sleepGoalHours} goalEnabled={sleepGoalEnabled} TH={TH} T={T as unknown as (key: string) => string} />
    </View>
  );
}

// ─── Mini Trend Chart（7 天睡眠时长柱状图）────────────────────────

const TREND_DAYS = 7;
const CHART_HEIGHT = 40;
const BAR_WIDTH = 8;
const BAR_GAP = 6;

interface TrendDay {
  date: string;
  durationMin: number;
  hasData: boolean;
}

function MiniTrendChart({
  data,
  goalHours,
  goalEnabled,
  TH,
  T: _T,
}: {
  data: SleepEntry[];
  goalHours: number;
  goalEnabled: boolean;
  TH: Theme;
  T: (key: string) => string;
}) {
  // 生成最近 7 天数据
  const trendData: TrendDay[] = useMemo(() => {
    const result: TrendDay[] = [];
    const historyMap = new Map(data.filter(d => !d.deleted).map(d => [d.date, d.durationMin ?? 0]));
    for (let i = TREND_DAYS - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dur = historyMap.get(ds) ?? 0;
      result.push({ date: ds, durationMin: dur, hasData: dur > 0 });
    }
    return result;
  }, [data]);

  const maxDur = Math.max(...trendData.map(d => d.durationMin), goalHours * 60);
  const goalLineY = goalEnabled ? CHART_HEIGHT - (goalHours * 60 / maxDur) * CHART_HEIGHT : null;

  return (
    <View style={s.trendWrap}>
      <View style={s.trendHeader}>
        <Text style={[s.trendTitle, { color: TH.sub }]}>{_T('sleepLast7Days')}</Text>
        {goalEnabled && <Text style={[s.trendGoal, { color: `${TH.sub}99` }]}>{_T('sleepGoal')} {goalHours}h</Text>}
      </View>
      <View style={s.trendChart}>
        {/* Goal line */}
        {goalLineY != null && (
          <View style={[s.goalLine, { top: goalLineY, borderColor: `${TH.primary}40` }]} />
        )}
        {/* Bars */}
        <View style={s.trendBars}>
          {trendData.map((d, _i) => {
            const barH = d.hasData ? Math.max((d.durationMin / maxDur) * CHART_HEIGHT, 3) : 2;
            const weekday = [_T('weekdaySun'), _T('weekdayMon'), _T('weekdayTue'), _T('weekdayWed'), _T('weekdayThu'), _T('weekdayFri'), _T('weekdaySat')][new Date(d.date).getDay()];
            return (
              <View key={d.date} style={s.trendCol}>
                <View
                  style={[
                    s.trendBar,
                    {
                      height: barH,
                      backgroundColor: d.hasData ? TH.primary : `${TH.border}60`,
                      width: BAR_WIDTH,
                    },
                  ]}
                />
                <Text style={[s.trendLabel, { color: `${TH.sub}99` }]}>{weekday}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ─── Empty state (illustration + CTA) ────────────────────────────

function EmptySleepCard({ theme, onCta, T: _T }: { theme: Theme; onCta: () => void; T: (key: string) => string }) {
  const isFirstTime = !hasShownEmptyGuide;
  hasShownEmptyGuide = true;

  const breathe = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1.08, duration: 2000, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathe]);

  return (
    <TouchableOpacity
      testID="sleep-card-empty"
      activeOpacity={0.85}
      onPress={onCta}
      style={[s.card, s.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      accessibilityLabel={_T('sleepEmptyTapToRecord')}
      accessibilityRole="button"
    >
      <Animated.View style={[s.emptyIconWrap, { transform: [{ scale: breathe }] }]}>
        <MoonIcon color={theme.primary} />
      </Animated.View>
      <Text style={[s.emptyTitle, { color: theme.text }]}>
        {isFirstTime ? _T('sleepStartRecording') : _T('sleepNoRecords')}
      </Text>
      {isFirstTime && (
        <Text style={[s.emptySubtitle, { color: theme.sub }]}>{_T('sleepEmptySubtitle')}</Text>
      )}
      <TouchableOpacity
        style={[s.emptyCta, { backgroundColor: theme.primary }]}
        onPress={onCta}
        activeOpacity={0.8}
        accessibilityLabel={_T('sleepRecordLastNight')}
      >
        <Text style={s.emptyCtaText}>{_T('sleepRecordLastNight')}</Text>
        <ArrowRight size={18} color="#fff" />
      </TouchableOpacity>
      {isFirstTime && (
        <View style={[s.emptyTip, { backgroundColor: `${theme.primary}10` }]}>
          <Star size={14} color={theme.primary} />
          <Text style={[s.emptyTipText, { color: theme.primary }]}>{_T('sleepQuickRecordTip')}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Moon illustration (SVG) ──────────────────────────────────────

function MoonIcon({ color }: { color: string }) {
  return (
    <Svg width={96} height={96} viewBox="0 0 96 96" fill="none">
      {/* Crescent moon body */}
      <Circle cx={44} cy={48} r={28} fill={`${color}18`} />
      <Circle cx={54} cy={42} r={24} fill="#F9FAFB" stroke={`${color}40`} strokeWidth={1.5} />
      {/* Decorative stars */}
      <Circle cx={68} cy={22} r={2.5} fill={color} opacity={0.7} />
      <Circle cx={78} cy={34} r={1.8} fill={color} opacity={0.5} />
      <Circle cx={74} cy={54} r={1.8} fill={color} opacity={0.6} />
      <Circle cx={20} cy={28} r={1.5} fill={color} opacity={0.4} />
      {/* Sleeping "Z" hint */}
      <Circle cx={34} cy={44} r={1.5} fill={color} opacity={0.8} />
      <Circle cx={40} cy={40} r={1.2} fill={color} opacity={0.6} />
    </Svg>
  );
}

// ─── Styles ──────────────────────────────────────────────────────

const s = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: FONT_TITLE(),
    fontWeight: '700',
  },
  diaryLinkText: {
    fontSize: FONT_BODY(),
    fontWeight: '600',
  },
  starRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  qualityLabel: {
    fontSize: FONT_LABEL(),
    marginBottom: 8,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  durationText: {
    fontSize: 32,
    fontWeight: '800',
  },
  goalBaseText: {
    fontSize: FONT_LABEL(),
  },
  goalText: {
    fontSize: FONT_LABEL(),
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: FONT_LABEL(),
  },
  timeDash: {
    fontSize: FONT_LABEL(),
  },
  sectionLabel: {
    fontSize: FONT_LABEL(),
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chipRowWrap: {
    // wrapper for chip row spring animation
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: {
    fontSize: FONT_LABEL(),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: FONT_SUB(),
    fontWeight: '600',
  },
  metaText: {
    fontSize: FONT_LABEL(),
  },
  // Save success indicator
  savedWrap: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
  },
  savedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Empty state
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyIconWrap: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: FONT_TITLE(),
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: FONT_LABEL(),
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  emptyCtaText: {
    fontSize: FONT_BODY(),
    fontWeight: '700',
    color: '#fff',
  },
  emptyTip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  emptyTipText: {
    fontSize: FONT_SUB(),
    fontWeight: '500',
  },
  // Mini trend chart
  trendWrap: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trendTitle: {
    fontSize: FONT_LABEL(),
    fontWeight: '600',
  },
  trendGoal: {
    fontSize: FONT_SUB(),
  },
  trendChart: {
    position: 'relative',
    height: CHART_HEIGHT,
  },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
  },
  trendBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: CHART_HEIGHT,
    gap: BAR_GAP,
  },
  trendCol: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    height: '100%',
  },
  trendBar: {
    borderRadius: 2,
    minHeight: 2,
  },
  trendLabel: {
    fontSize: 9,
    marginTop: 4,
  },
});
