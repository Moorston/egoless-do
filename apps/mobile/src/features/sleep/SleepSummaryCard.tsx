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
} from '@egoless-do/core';
import * as Haptics from 'expo-haptics';
import { Star, Moon, Sun } from 'lucide-react-native';
import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import { useTheme, useT } from '../../components/UI';
import { useUiStore } from '../../store/uiStore';

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
}

// ─── Constants ────────────────────────────────────────────────────

const STAR_FILL = '#F59E0B';

// ─── Component ────────────────────────────────────────────────────

export default function SleepSummaryCard({
  todaySleep,
  onSaveQuickDiary,
  onOpenFullDiary,
  sleepGoalEnabled = false,
  sleepGoalHours = 8,
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

  // ── Feedback ───────────────────────────────────────────────────

  const triggerFeedback = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    useUiStore.getState().showToast('已保存', 'success');
  }, []);

  // ── Event handlers ─────────────────────────────────────────────

  const handleStarPress = useCallback((i: number) => {
    const currentWorkState = todaySleep?.workState ?? null;
    onSaveQuickDiary(i, currentWorkState === null ? undefined : currentWorkState);
    triggerFeedback();
  }, [todaySleep?.workState, onSaveQuickDiary, triggerFeedback]);

  const handleWorkStatePress = useCallback((key: WorkState) => {
    const currentQuality = Math.max(1, todaySleep?.quality ?? 0);
    const next: WorkState | null = todaySleep?.workState === key ? null : key;
    onSaveQuickDiary(currentQuality, next === null ? undefined : next);
    triggerFeedback();
  }, [todaySleep?.quality, todaySleep?.workState, onSaveQuickDiary, triggerFeedback]);

  const handleEmptyCta = useCallback(() => {
    onSaveQuickDiary(3, undefined);
    triggerFeedback();
  }, [onSaveQuickDiary, triggerFeedback]);

  // ── Render helpers ─────────────────────────────────────────────

  const renderStars = (value: number, size = 28) => (
    <View style={s.starRow} testID="sleep-quality-stars">
      {[1, 2, 3, 4, 5].map(i => {
        const filled = i <= value;
        return (
          <TouchableOpacity
            key={i}
            testID={`star-${i}`}
            onPress={() => handleStarPress(i)}
            disabled={!todaySleep}
            accessibilityLabel={filled ? `当前 ${i} 星` : `设为 ${i} 星`}
            accessibilityRole="button"
            accessibilityState={{ selected: filled }}
            accessibilityHint="点击直接保存睡眠质量"
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Star
              size={size}
              color={filled ? STAR_FILL : TH.border}
              fill={filled ? STAR_FILL : 'transparent'}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderWorkStateChips = () => (
    <View style={s.chipRow}>
      {WORK_STATE_OPTIONS.map(({ key, labelKey }) => {
        const selected = todaySleep?.workState === key;
        return (
          <TouchableOpacity
            key={key}
            testID={`workstate-${key}`}
            onPress={() => handleWorkStatePress(key)}
            disabled={!todaySleep}
            accessibilityLabel={`工作状态: ${T(labelKey as I18nKey)}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityHint="点击直接保存工作状态"
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
        {isOnTarget ? '达成目标' : `${diff > 0 ? '多' : '差'} ${diffStr}`}
      </Text>
    );
  };

  // ── Empty state (no data) ──────────────────────────────────────

  if (!todaySleep) {
    return (
      <TouchableOpacity
        testID="sleep-card-empty"
        activeOpacity={0.8}
        onPress={handleEmptyCta}
        style={[s.card, { backgroundColor: TH.card, borderColor: TH.border }]}
        accessibilityLabel="睡眠记录为空，点击快速记录"
        accessibilityRole="button"
      >
        <Text style={[s.cardTitle, { color: TH.primary }]}>睡眠记录</Text>
        <View style={s.emptyRow}>
          <Text style={[s.emptyText, { color: TH.primary }]}>记录昨晚睡眠 →</Text>
        </View>
        <Text style={[s.emptyHint, { color: TH.sub }]}>睡得怎么样？开始记录吧</Text>
      </TouchableOpacity>
    );
  }

  // ── Read mode (has data) ───────────────────────────────────────

  return (
    <View style={[s.card, { backgroundColor: TH.card, borderColor: TH.border }]} testID="sleep-card-read">
      {/* Header */}
      <View style={s.headerRow}>
        <Text style={[s.cardTitle, { color: TH.primary }]} accessibilityRole="header">
          {`睡眠记录 · ${formatSleepDate(dateStr)}`}
        </Text>
        <TouchableOpacity
          testID="sleep-diary-link"
          onPress={onOpenFullDiary}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="打开完整睡眠日记"
          accessibilityRole="link"
        >
          <Text style={[s.diaryLinkText, { color: TH.primary }]}>完整日记 →</Text>
        </TouchableOpacity>
      </View>

      {/* Quality stars (primary visual) */}
      {renderStars(quality, 28)}
      <Text style={[s.qualityLabel, { color: TH.sub }]}>
        {quality > 0 ? `质量：${qualityLabel(quality)}` : '点击星星评价'}
      </Text>

      {/* Duration + goal comparison */}
      <View style={s.durationRow}>
        <Text style={[s.durationText, { color: TH.text }]}>
          {durationMin > 0 ? formatDuration(durationMin) : '--'}
        </Text>
        {sleepGoalEnabled && (
          <Text style={[s.goalBaseText, { color: TH.sub }]}>
            目标 {sleepGoalHours}h · {renderGoalComparison()}
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
          <Text style={[s.timeDash, { color: TH.border }]}>—</Text>
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
        {T('sleepWorkState') || '工作状态'}
      </Text>
      {renderWorkStateChips()}

      {/* Barrier + gratitude */}
      <View style={s.metaRow}>
        {barrierDone && (
          <View style={[s.badge, { backgroundColor: 'rgba(16,185,129,0.2)' }]}>
            <Text style={[s.badgeText, { color: '#10B981' }]}>仪轨</Text>
          </View>
        )}
        {gratitudeCount > 0 && (
          <Text style={[s.metaText, { color: TH.sub }]}>{`感恩 ×${gratitudeCount}`}</Text>
        )}
      </View>
    </View>
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
  // Empty state
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: FONT_BODY(),
    fontWeight: '700',
  },
  emptyHint: {
    fontSize: FONT_LABEL(),
  },
});
