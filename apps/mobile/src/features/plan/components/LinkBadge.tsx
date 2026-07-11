import { LINK_COLORS , FONT_SMALL } from '@egoless-do/core';
import type { PlanItemLink } from '@egoless-do/core';
import React from 'react';
import { View, Text } from 'react-native';

export const LinkBadge = React.memo(function LinkBadge({ link, T, P }: { link: PlanItemLink; T: (k: string) => string; P: string }) {
  if (link === 'manual') return null;
  const color = LINK_COLORS[link] ?? P;
  return (
    <View style={{ backgroundColor: `${color}15`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
      <Text style={{ fontSize: FONT_SMALL(), color, fontWeight: '500' }}>
        {T(`planLink${link.charAt(0).toUpperCase() + link.slice(1)}`)}
      </Text>
    </View>
  );
});
