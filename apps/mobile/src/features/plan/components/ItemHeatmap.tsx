import { COLORS, dateStr, FONT_SUB, FONT_BADGE , FONT_SMALL } from '@egoless-do/core';
import type { PlanItem, PlanItemCheckin, Theme } from '@egoless-do/core';
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, LayoutChangeEvent } from 'react-native';

interface ItemHeatmapProps {
  item: PlanItem;
  checkins: PlanItemCheckin[];
  TH: Theme;
  T: (k: string) => string;
}

export const ItemHeatmap = React.memo(function ItemHeatmap({ item, checkins, TH, T }: ItemHeatmapProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const cellSize = containerWidth > 0 ? Math.floor(containerWidth / 7) : 0;

  // Pre-build done dates set for this item
  const doneDates = useMemo(() => {
    const set = new Set<string>();
    for (const c of checkins) {
      if (c.planItemId === item.id && c.done && !c.deleted) {
        set.add(c.date);
      }
    }
    return set;
  }, [checkins, item.id]);

  // Build weeks grid
  const { weeks } = useMemo(() => {
    const [sy, sm, sd] = item.startDate.split('-').map(Number);
    const [ey, em, ed] = item.endDate.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    const startDay = start.getDay();

    const dates: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(dateStr(d));
    }

    const weeks: (string | null)[][] = [];
    let week: (string | null)[] = new Array<string | null>(startDay).fill(null);

    for (const ds of dates) {
      week.push(ds);
      if (week.length === 7) { weeks.push(week); week = []; }
    }
    if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week); }

    return { weeks };
  }, [item.startDate, item.endDate]);

  const weekLabels = useMemo(() => [
    T('weekdaySun'), T('weekdayMon'), T('weekdayTue'), T('weekdayWed'),
    T('weekdayThu'), T('weekdayFri'), T('weekdaySat'),
  ], [T]);

  const onLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  if (cellSize <= 0) {
    return <View onLayout={onLayout} style={{ width: '100%' }} />;
  }

  return (
    <View onLayout={onLayout}>
      {/* Weekday labels row */}
      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
        {weekLabels.map((label, i) => (
          <View key={i} style={{ width: cellSize }}>
            <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, textAlign: 'center' }}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Grid */}
      <View>
        {weeks.map((w, wi) => (
          <View key={wi} style={{ flexDirection: 'row' }}>
            {w.map((ds, di) => {
              const dayNum = ds ? parseInt(ds.slice(8), 10) : 0;
              const done = ds ? doneDates.has(ds) : false;
              return (
                <View key={di} style={{ width: cellSize, height: cellSize, padding: 2 }}>
                  {ds ? (
                    <View style={{
                      flex: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: done ? COLORS.GREEN : `${TH.border}60`,
                    }}>
                      <Text style={{ fontSize: FONT_SMALL(), fontWeight: '500', color: done ? '#fff' : TH.text }}>{dayNum}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Legend */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{T('heatmapLess')}</Text>
        {[`${TH.border}60`, COLORS.GREEN].map((c, i) => (
          <View key={i} style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: c }} />
        ))}
        <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{T('heatmapMore')}</Text>
      </View>
    </View>
  );
});
