// ─── SleepReportPage — Session report UI ─────────────────────────
// Shows barrier stats, gratitude count, practice log, streak.

import { formatSleepDuration } from '@egoless-do/core';
import { X, Clock, Moon, Star, Heart, Wind } from 'lucide-react-native';
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, useT } from '../../../components/UI';
import { styles } from '../sleepStyles';

/**
 * Props for the {@link SleepReportPage} component.
 *
 * @property barrierDuration - Configured barrier duration in minutes.
 * @property barrierElapsed - Actual elapsed barrier time in seconds.
 *   Compared against `barrierDuration * 60` to determine whether the
 *   barrier was completed or skipped.
 * @property awayMin - Total minutes the user spent away from the app
 *   during the barrier session.
 * @property quality - Sleep quality rating (1-5 stars) from the gratitude
 *   phase. 0 means not rated.
 * @property gratitude - Array of gratitude strings entered by the user.
 *   Empty strings are filtered out before display.
 * @property completedPractice - List of practice type identifiers the user
 *   completed during the barrier session (e.g. "breathing", "meditation").
 * @property sleepStreak - Current consecutive-day sleep streak count.
 * @property onFinish - Callback invoked when the user taps the "back to
 *   home" button.
 * @property onViewHistory - Callback invoked when the user taps the
 *   "view history" button to navigate to sleep history.
 */
interface Props {
  barrierDuration: number;
  barrierElapsed: number;
  awayMin: number;
  quality: number;
  gratitude: string[];
  completedPractice: string[];
  sleepStreak: number;
  onFinish: () => void;
  onViewHistory: () => void;
}

/**
 * Sleep Report page component.
 *
 * Renders a summary card at the end of a sleep session showing:
 *
 * - Whether the barrier was **completed** (elapsed >= duration) or was
 *   skipped early, with an appropriate title.
 * - **Barrier duration** formatted via `formatSleepDuration` (only shown
 *   if the user spent any time in the barrier).
 * - **Away time** with a red highlight if it exceeded 5 minutes, green
 *   otherwise.
 * - **Sleep quality** as filled star icons (only if rated).
 * - **Gratitude count** showing how many non-empty gratitude entries the
 *   user provided.
 * - **Practice log** listing the completed practice types in purple.
 * - **Sleep streak** in consecutive days with a fire emoji (only if > 0).
 *
 * Below the card are two action buttons:
 * - "Back to home" (`onFinish`)
 * - "View history" (`onViewHistory`)
 *
 * @param props - {@link Props}
 * @returns A `SafeAreaView` containing the session report layout, themed
 *   with the current app theme via `useTheme()`.
 */
export default function SleepReportPage(props: Props) {
  const { barrierDuration, barrierElapsed, awayMin, quality, gratitude, completedPractice, sleepStreak,
    onFinish, onViewHistory } = props;
  const TH = useTheme();
  const T = useT();
  const completed = barrierElapsed >= barrierDuration * 60;
  const validGratitude = gratitude.filter(g => g.trim());

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: TH.bg }}>
      <View style={styles.prepHeader}>
        <Text style={[styles.prepTitle, { color: TH.text }]}>{T('sleepReport')}</Text>
        <TouchableOpacity onPress={onFinish}>
          <X size={22} color={TH.sub} />
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        <View style={[styles.reportCard, { borderColor: `${TH.primary}20` }]}>
          <Text style={[styles.reportTitle, { color: TH.primary }]}>
            {completed ? `🌙 ${T('sleepBarrierComplete')}` : `🌙 ${T('sleepRitual')}`}
          </Text>
          {barrierElapsed > 0 && (
            <View style={styles.reportRow}>
              <Clock size={16} color={TH.sub} />
              <Text style={[styles.reportLabel, { color: TH.sub }]}>{T('sleepDuration')}</Text>
              <Text style={[styles.reportValue, { color: TH.text }]}>{formatSleepDuration(Math.floor(barrierElapsed / 60))}</Text>
            </View>
          )}
          {awayMin > 0 && (
            <View style={styles.reportRow}>
              <Moon size={16} color={TH.sub} />
              <Text style={[styles.reportLabel, { color: TH.sub }]}>{T('sleepAwayTime')}</Text>
              <Text style={[styles.reportValue, { color: awayMin > 5 ? '#EF4444' : '#10B981' }]}>
                {awayMin}{T('sleepMinutes')}
              </Text>
            </View>
          )}
          {quality > 0 && (
            <View style={styles.reportRow}>
              <Star size={16} color="#F59E0B" />
              <Text style={[styles.reportLabel, { color: TH.sub }]}>睡眠质量</Text>
              <Text style={[styles.reportValue, { color: '#F59E0B' }]}>{'★'.repeat(quality)}</Text>
            </View>
          )}
          {validGratitude.length > 0 && (
            <View style={styles.reportRow}>
              <Heart size={16} color={TH.sub} />
              <Text style={[styles.reportLabel, { color: TH.sub }]}>{T('sleepGratitude')}</Text>
              <Text style={[styles.reportValue, { color: TH.text }]}>
                {validGratitude.length}{T('sleepCompleted')}
              </Text>
            </View>
          )}
          {completedPractice.length > 0 && (
            <View style={styles.reportRow}>
              <Wind size={16} color="#8B5CF6" />
              <Text style={[styles.reportLabel, { color: TH.sub }]}>修行记录</Text>
              <Text style={[styles.reportValue, { color: '#8B5CF6' }]}>{completedPractice.join(', ')}</Text>
            </View>
          )}
          {sleepStreak > 0 && (
            <View style={styles.reportRow}>
              <Text style={{ fontSize: 16 }}>🔥</Text>
              <Text style={[styles.reportLabel, { color: TH.sub }]}>连续天数</Text>
              <Text style={[styles.reportValue, { color: '#EF4444' }]}>{sleepStreak} 天</Text>
            </View>
          )}
        </View>

        <View style={styles.reportBtnRow}>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: TH.primary, flex: 1 }]}
            onPress={onFinish}
          >
            <Text style={styles.saveBtnText}>回到首页</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: `${TH.primary}15`, flex: 1, borderWidth: 1, borderColor: `${TH.primary}30` }]}
            onPress={onViewHistory}
          >
            <Text style={[styles.saveBtnText, { color: TH.primary }]}>查看历史</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
