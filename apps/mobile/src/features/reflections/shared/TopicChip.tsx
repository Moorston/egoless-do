import { FONT_SMALL, FONT_TINY } from '@egoless-do/core';
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';

import { useTheme } from '../../../components/UI';

interface Props {
  word: string;
  category: string;
  count: number;
  onPress: () => void;
}

export default function TopicChip({ word, category, count, onPress }: Props) {
  const TH = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: `${TH.primary}12`,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: `${TH.primary}30`,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginRight: 8,
        marginBottom: 8,
        minWidth: 72,
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: FONT_SMALL, fontWeight: '600', color: TH.text }}>
        {word}
      </Text>
      {category ? (
        <Text style={{ fontSize: FONT_TINY, color: TH.sub, marginTop: 2 }}>
          {category}
        </Text>
      ) : null}
      <Text style={{ fontSize: FONT_TINY, color: TH.primary, marginTop: 2 }}>
        {count}次
      </Text>
    </TouchableOpacity>
  );
}
