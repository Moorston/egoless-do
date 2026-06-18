import React, { useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { COLORS, dateStr, FONT_SUB } from '@egoless-do/core';
import type { Plan, PlanItem, PlanItemCheckin } from '@egoless-do/core';

export const Heatmap = React.memo(function Heatmap({ checkins, items, plan, TH, T }: { checkins: PlanItemCheckin[]; items: PlanItem[]; plan: Plan; TH: any; T: (k: string) => string }) {
  const [containerWidth, setContainerWidth] = useState(0);
  const cellSize = containerWidth > 0 ? Math.floor(containerWidth / 7) : 0;

  const rateMap = useMemo(() => {
    const map = new Map<string, number>();
    // Pre-build done checkin set: "planItemId:date" → true
    const doneSet = new Set<string>();
    for (const c of checkins) {
      if (c.done) doneSet.add(`${c.planItemId}:${c.date}`);
    }
    // Pre-filter active items
    const activeItems = items.filter(i => !i.deleted);
    const [sy, sm, sd] = plan.startDate.split('-').map(Number);
    const [ey, em, ed] = plan.endDate.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ds = dateStr(d);
      let total = 0;
      let done = 0;
      for (const item of activeItems) {
        if (ds >= item.startDate && ds <= item.endDate) {
          total++;
          if (doneSet.has(`${item.id}:${ds}`)) done++;
        }
      }
      map.set(ds, total === 0 ? -1 : done / total);
    }
    return map;
  }, [checkins, items, plan.startDate, plan.endDate]);

  const { weeks } = useMemo(() => {
    const [sy, sm, sd] = plan.startDate.split('-').map(Number);
    const [ey, em, ed] = plan.endDate.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    const startDay = start.getDay();

    const dates: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(dateStr(d));
    }

    const weeks: (string | null)[][] = [];
    let week: (string | null)[] = new Array(startDay).fill(null);

    for (const ds of dates) {
      week.push(ds);
      if (week.length === 7) { weeks.push(week); week = []; }
    }
    if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week); }

    return { weeks };
  }, [plan.startDate, plan.endDate]);

  const weekLabels = useMemo(() => [
    T('weekdaySun'), T('weekdayMon'), T('weekdayTue'), T('weekdayWed'),
    T('weekdayThu'), T('weekdayFri'), T('weekdaySat'),
  ], [T]);

  return (
    <View onLayout={e => setContainerWidth(e.nativeEvent.layout.width)}>
      {cellSize > 0 && (
        <>
          <View style={{ flexDirection: 'row', marginBottom: 4 }}>
            {weekLabels.map((label, i) => (
              <View key={i} style={{ width: cellSize }}>
                <Text style={{ fontSize: 10, color: TH.sub, textAlign: 'center' }}>{label}</Text>
              </View>
            ))}
          </View>

          <View>
            {weeks.map((w, wi) => (
              <View key={wi} style={{ flexDirection: 'row' }}>
                {w.map((ds, di) => {
                  const rate = ds ? (rateMap.get(ds) ?? -1) : -1;
                  const dayNum = ds ? parseInt(ds.slice(8), 10) : 0;
                  return (
                    <View key={di} style={{ width: cellSize, height: cellSize, padding: 2 }}>
                      {ds ? (
                        <View style={{
                          flex: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center',
                          backgroundColor: rate < 0 ? 'transparent' : rate >= 0.8 ? COLORS.GREEN : rate >= 0.5 ? COLORS.YELLOW : rate > 0 ? COLORS.RED : `${TH.border}60`,
                        }}>
                          <Text style={{ fontSize: 12, fontWeight: '500', color: rate >= 0.5 ? '#fff' : TH.text }}>{dayNum}</Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <Text style={{ fontSize: 10, color: TH.sub }}>{T('heatmapLess')}</Text>
            {[`${TH.border}60`, COLORS.RED, COLORS.YELLOW, COLORS.GREEN].map((c, i) => (
              <View key={i} style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: c }} />
            ))}
            <Text style={{ fontSize: 10, color: TH.sub }}>{T('heatmapMore')}</Text>
          </View>

          <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 8, textAlign: 'center' }}>
            {plan.startDate} ~ {plan.endDate}
          </Text>
        </>
      )}
    </View>
  );
});
