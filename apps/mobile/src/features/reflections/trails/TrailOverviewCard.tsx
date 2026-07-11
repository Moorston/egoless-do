import type {TrailOverview} from '@egoless-do/core';
import { FONT_SMALL , getMoodIcon } from '@egoless-do/core';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { useTheme, useT } from '../../../components/UI';

interface TrailOverviewCardProps {
  overview: TrailOverview;
}

const TREND_ICONS = { up: '↑', down: '↓', flat: '→' };

export const TrailOverviewCard = React.memo(function TrailOverviewCard({ overview }: TrailOverviewCardProps) {
  const TH = useTheme();
  const T = useT();

  if (overview.reflectionCount === 0 && overview.noteCount === 0) return null;

  const parts: string[] = [];

  // 感念 + 反思数
  parts.push(
    T('trailOverviewFormat')
      .replace('{reflections}', String(overview.reflectionCount))
      .replace('{notes}', String(overview.noteCount))
  );

  // 日期范围
  if (overview.dateRange) {
    parts.push(`${overview.dateRange.start} ~ ${overview.dateRange.end}`);
  }

  // 跨度天数
  if (overview.daySpan > 0) {
    parts.push(T('trailOverviewDaySpan').replace('{days}', String(overview.daySpan)));
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.text, { color: TH.sub }]} numberOfLines={2}>
        {parts.join(' · ')}
      </Text>
      {overview.moodChanges.length > 0 && (
        <Text style={[styles.moodText, { color: TH.sub }]}>
          {overview.moodChanges.map(m => getMoodIcon(m)).join('→')}
          {overview.trend !== 'flat' && ` ${TREND_ICONS[overview.trend]}`}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  text: {
    fontSize: FONT_SMALL(),
    lineHeight: 18,
  },
  moodText: {
    fontSize: FONT_SMALL(),
    marginTop: 2,
  },
});
