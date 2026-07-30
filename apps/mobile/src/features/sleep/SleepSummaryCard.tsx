// ─── SleepSummaryCard — merged sleep summary + quick diary card ────
// Replaces the separate SleepSummaryCard (read-only) and QuickDiary (write-only)
// regions in HomePage with a single inline-editing card.
//
// Three visual states:
//   · Empty   — no todaySleep data; entire row tappable to start recording
//   · Read    — displays duration / quality / times / work-state; ✎ edit button
//   · Edit    — quality stars + work-state chips; save / cancel / full diary link
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
import { Star } from 'lucide-react-native';
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import { useTheme, useT } from '../../components/UI';

import {
  formatDuration,
  formatTime,
  countGratitude,
  findWorkStateLabelKey,
} from './sleepSummaryLogic';

// ─── Props ────────────────────────────────────────────────────────

interface Props {
  todaySleep: SleepEntry | null | undefined;
  onSaveQuickDiary: (quality: number, workState?: WorkState) => void;
  onOpenFullDiary: () => void;
}

// ─── Constants ────────────────────────────────────────────────────

const WORK_STATE_OPTIONS: { key: WorkState; labelKey: I18nKey }[] = [
  { key: 'energetic', labelKey: 'sleepWorkEnergetic' },
  { key: 'normal',    labelKey: 'sleepWorkNormal' },
  { key: 'tired',     labelKey: 'sleepWorkTired' },
  { key: 'exhausted', labelKey: 'sleepWorkExhausted' },
];

const STAR_FILL = '#F59E0B';

// ─── Component ────────────────────────────────────────────────────

export default function SleepSummaryCard({ todaySleep, onSaveQuickDiary, onOpenFullDiary }: Props) {
  const TH = useTheme();
  const T = useT();

  const [editing, setEditing] = useState(false);
  const [draftQuality, setDraftQuality] = useState(0);
  const [draftWorkState, setDraftWorkState] = useState<WorkState | null>(null);

  // Display values derived from props — used in both read and edit modes.
  const quality = todaySleep?.quality ?? 0;
  const workState = todaySleep?.workState ?? null;
  const durationMin = todaySleep?.durationMin ?? 0;
  const bedtimeAt = todaySleep?.bedtimeAt;
  const wakeAt = todaySleep?.wakeAt;
  const barrierDone = todaySleep?.barrierDone ?? false;
  const gratitudeCount = countGratitude(todaySleep?.gratitude);

  // ── State transitions ─────────────────────────────────────────

  const enterEditMode = useCallback(() => {
    setDraftQuality(todaySleep?.quality ?? 0);
    setDraftWorkState(todaySleep?.workState ?? null);
    setEditing(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- read todaySleep fields inside setter
  }, []);

  const handleCancel = useCallback(() => {
    setEditing(false);
  }, []);

  const handleSave = useCallback(() => {
    if (draftQuality === 0) return;
    onSaveQuickDiary(draftQuality, draftWorkState ?? undefined);
    setEditing(false);
  }, [draftQuality, draftWorkState, onSaveQuickDiary]);

  // ── Render helpers ────────────────────────────────────────────

  const renderStars = (value: number, size = 28, interactive = false, onStarPress?: () => void) => (
    <View style={s.starRow} testID={interactive || onStarPress ? 'edit-stars' : 'sleep-quality-stars'}>
      {[1, 2, 3, 4, 5].map(i => (
        <TouchableOpacity
          key={i}
          testID={onStarPress ? `empty-star-${i}` : `edit-star-${i}`}
          disabled={!interactive && !onStarPress}
          onPress={interactive ? () => setDraftQuality(i) : onStarPress}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Star
            size={size}
            color={i <= value ? STAR_FILL : TH.border}
            fill={i <= value ? STAR_FILL : 'transparent'}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderWorkStateLabel = () => {
    if (!workState) return null;
    const labelKey = findWorkStateLabelKey(workState);
    return (
      <Text style={[s.workStateLabel, { color: TH.primary }]}>
        {labelKey ? T(labelKey as I18nKey) : workState}
      </Text>
    );
  };

  // ── Empty state (no data) ─────────────────────────────────────

  if (!todaySleep) {
    return (
      <TouchableOpacity
        testID="sleep-card-empty"
        activeOpacity={0.8}
        onPress={enterEditMode}
        style={[s.card, { backgroundColor: TH.card, borderColor: TH.border }]}
      >
        <Text style={[s.cardTitle, { color: TH.primary }]}>昨晚睡眠</Text>
        <View style={s.emptyRow}>
          {renderStars(0, 28, false, enterEditMode)}
          <Text style={[s.emptyText, { color: TH.primary }]}>点星记录昨晚睡眠 →</Text>
        </View>
        <Text style={[s.emptyHint, { color: TH.sub }]}>睡得怎么样？开始记录吧</Text>
      </TouchableOpacity>
    );
  }

  // ── Edit mode ─────────────────────────────────────────────────

  if (editing) {
    return (
      <View style={[s.card, { backgroundColor: TH.card, borderColor: TH.border }]} testID="sleep-card-edit">
        {/* Header */}
        <View style={s.headerRow}>
          <Text style={[s.cardTitle, { color: TH.primary }]}>昨晚睡眠</Text>
          <TouchableOpacity testID="sleep-cancel-btn" onPress={handleCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[s.cancelText, { color: TH.sub }]}>取消</Text>
          </TouchableOpacity>
        </View>

        {/* Duration + quality (interactive) */}
        <View style={s.durationRow}>
          <Text style={[s.durationText, { color: TH.text }]}>
            {durationMin > 0 ? formatDuration(durationMin) : '--'}
          </Text>
          {renderStars(draftQuality, 32, true)}
        </View>

        {/* Times (read-only in edit mode) */}
        <View style={s.timeRow}>
          {bedtimeAt && (
            <Text style={[s.timeText, { color: TH.sub }]}>
              🛌 {formatTime(bedtimeAt)}
            </Text>
          )}
          {wakeAt && (
            <Text style={[s.timeText, { color: TH.sub }]}>
              ☀️ {formatTime(wakeAt)}
            </Text>
          )}
        </View>

        {/* Work state chips */}
        <Text style={[s.sectionLabel, { color: TH.sub }]}>
          {T('sleepWorkState') || '工作状态'}
        </Text>
        <View style={s.chipRow}>
          {WORK_STATE_OPTIONS.map(({ key, labelKey }) => {
            const selected = draftWorkState === key;
            return (
              <TouchableOpacity
                key={key}
                testID={`workstate-${key}`}
                onPress={() => setDraftWorkState(selected ? null : key)}
                style={[
                  s.chip,
                  {
                    borderColor: selected ? TH.primary : TH.border,
                    backgroundColor: selected ? `${TH.primary}20` : 'transparent',
                  },
                ]}
              >
                <Text style={[s.chipText, { color: selected ? TH.primary : TH.text }]}>
                  {T(labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Save button */}
        <TouchableOpacity
          testID="sleep-save-btn"
          onPress={handleSave}
          disabled={draftQuality === 0}
          style={[
            s.saveBtn,
            { backgroundColor: draftQuality > 0 ? TH.primary : `${TH.primary}50` },
          ]}
        >
          <Text style={s.saveBtnText}>保存</Text>
        </TouchableOpacity>

        {/* Full diary link */}
        <TouchableOpacity testID="sleep-full-diary-btn" onPress={onOpenFullDiary} style={s.fullDiaryLink}>
          <Text style={[s.fullDiaryText, { color: TH.primary }]}>完整日记 →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Read mode (has data) ──────────────────────────────────────

  return (
    <View style={[s.card, { backgroundColor: TH.card, borderColor: TH.border }]} testID="sleep-card-read">
      {/* Header */}
      <View style={s.headerRow}>
        <Text style={[s.cardTitle, { color: TH.primary }]}>昨晚睡眠</Text>
        <TouchableOpacity testID="sleep-edit-btn" onPress={enterEditMode} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[s.editText, { color: TH.primary }]}>✎ 编辑</Text>
        </TouchableOpacity>
      </View>

      {/* Duration + quality */}
      <View style={s.durationRow}>
        <Text style={[s.durationText, { color: TH.text }]}>
          {durationMin > 0 ? formatDuration(durationMin) : '--'}
        </Text>
        {quality > 0 ? renderStars(quality, 24) : null}
      </View>

      {/* Times + work state */}
      <View style={s.timeRow}>
        {bedtimeAt && (
          <Text style={[s.timeText, { color: TH.sub }]}>
            🛌 {formatTime(bedtimeAt)}
          </Text>
        )}
        {wakeAt && (
          <Text style={[s.timeText, { color: TH.sub }]}>
            ☀️ {formatTime(wakeAt)}
          </Text>
        )}
        {renderWorkStateLabel()}
      </View>

      {/* Barrier + gratitude */}
      <View style={s.metaRow}>
        {barrierDone && (
          <View style={[s.badge, { backgroundColor: 'rgba(16,185,129,0.2)' }]}>
            <Text style={[s.badgeText, { color: '#10B981' }]}>✅ 仪轨</Text>
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
  durationRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 8,
  },
  durationText: {
    fontSize: 48,
    fontWeight: '900',
  },
  starRow: {
    flexDirection: 'row',
    gap: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  timeText: {
    fontSize: FONT_LABEL(),
  },
  workStateLabel: {
    fontSize: FONT_LABEL(),
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
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
  editText: {
    fontSize: FONT_BODY(),
    fontWeight: '600',
  },
  cancelText: {
    fontSize: FONT_BODY(),
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
  // Edit state
  sectionLabel: {
    fontSize: FONT_LABEL(),
    marginTop: 16,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  saveBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: FONT_BODY(),
    fontWeight: '700',
    color: '#fff',
  },
  fullDiaryLink: {
    marginTop: 12,
    alignItems: 'center',
  },
  fullDiaryText: {
    fontSize: FONT_BODY(),
    fontWeight: '600',
  },
});
