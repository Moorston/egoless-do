import React from 'react';
import { View, Text } from 'react-native';
import { useTheme, useT } from '../../../components/UI';
import { FONT_SMALL, FONT_TINY } from '@egoless-do/core';
import { getMoodIcon, formatDateShort } from '@egoless-do/core';

interface Props {
  count: number;
  moods: string[];
  startDate?: number;
  endDate?: number;
}

export default function SelectionSummary({ count, moods, startDate, endDate }: Props) {
  const TH = useTheme();
  const T = useT();

  if (count === 0) return null;

  return (
    <View>
      <Text style={{ fontSize: FONT_SMALL, color: TH.text, fontWeight: '600' }}>
        {T('quickTrailSelected').replace('{n}', String(count))}
      </Text>

      {moods.length > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
          {moods.slice(0, 6).map((mood, i) => (
            <React.Fragment key={i}>
              <Text style={{ fontSize: FONT_SMALL }}>{getMoodIcon(mood)}</Text>
              {i < Math.min(moods.length, 6) - 1 && (
                <Text style={{ fontSize: FONT_TINY, color: TH.sub }}>→</Text>
              )}
            </React.Fragment>
          ))}
          {moods.length > 6 && (
            <Text style={{ fontSize: FONT_TINY, color: TH.sub }}>...</Text>
          )}
        </View>
      )}

      {startDate != null && endDate != null && (
        <Text style={{ fontSize: FONT_TINY, color: TH.sub, marginTop: 2 }}>
          {formatDateShort(startDate)} ─── {formatDateShort(endDate)}
        </Text>
      )}
    </View>
  );
}
