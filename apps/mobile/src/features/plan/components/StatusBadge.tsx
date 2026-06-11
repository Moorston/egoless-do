import React from 'react';
import { View, Text } from 'react-native';
import { PLAN_STATUS_COLORS, statusToI18nKey, FONT_BADGE } from '@egoless-do/core';
import type { PlanStatus, PlanItemStatus } from '@egoless-do/core';

export const StatusLabel = React.memo(function StatusLabel({ status, T }: { status: PlanStatus | PlanItemStatus; T: (k: string) => string }) {
  return (
    <View style={{ backgroundColor: `${PLAN_STATUS_COLORS[status]}20`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
      <Text style={{ fontSize: FONT_BADGE, fontWeight: '600', color: PLAN_STATUS_COLORS[status] }}>{T(statusToI18nKey(status))}</Text>
    </View>
  );
});
