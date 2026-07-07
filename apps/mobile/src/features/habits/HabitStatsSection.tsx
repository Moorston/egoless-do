// ─── HabitStatsSection: statistics charts for habit detail ───────
import { FONT_BODY, FONT_SMALL, COLORS, computeWeeklyCompletionRates, computeWeeklyStreaks } from '@egoless-do/core';
import React, { useMemo } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';

import { useTheme, useT } from '../../components/UI';
import BarChart from '../../components/charts/BarChart';
import LineChart from '../../components/charts/LineChart';


interface Props {
  checkedDates: string[];
}

const WEEK_LABELS = ['7w', '6w', '5w', '4w', '3w', '2w', '1w', ''];

export default function HabitStatsSection({ checkedDates }: Props) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = Math.min(screenWidth - 64, 360);

  const completionRates = useMemo(
    () => computeWeeklyCompletionRates(checkedDates, 8),
    [checkedDates],
  );

  const weeklyStreaks = useMemo(
    () => computeWeeklyStreaks(checkedDates, 8),
    [checkedDates],
  );

  if (checkedDates.length === 0) return null;

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text, marginBottom: 12 }}>
        {T('habitStats') ?? '习惯统计'}
      </Text>

      {/* Completion Rate Chart */}
      <View style={{ backgroundColor: TH.card, borderRadius: 12, borderWidth: 1, borderColor: TH.border, padding: 16, marginBottom: 12 }}>
        <Text style={{ fontSize: FONT_SMALL, fontWeight: '600', color: TH.text, marginBottom: 8 }}>
          {T('habitWeeklyCompletion') ?? '每周完成率'}
        </Text>
        <LineChart
          data={completionRates}
          labels={WEEK_LABELS}
          width={chartWidth}
          height={140}
          color={P}
          showDots={true}
          showArea={true}
          suffix="%"
        />
      </View>

      {/* Weekly Streak Chart */}
      <View style={{ backgroundColor: TH.card, borderRadius: 12, borderWidth: 1, borderColor: TH.border, padding: 16 }}>
        <Text style={{ fontSize: FONT_SMALL, fontWeight: '600', color: TH.text, marginBottom: 8 }}>
          {T('habitWeeklyStreak') ?? '每周最长连续天数'}
        </Text>
        <BarChart
          data={weeklyStreaks}
          labels={WEEK_LABELS}
          width={chartWidth}
          height={140}
          color={COLORS.ORANGE}
        />
      </View>
    </View>
  );
}
