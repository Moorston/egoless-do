// ─── HabitCard: habit card with original prominent style ─────────
import {
  COLORS, dateStr, FONT_TITLE, FONT_BODY, FONT_BUTTON, FONT_SUB,
  FONT_SMALL, FONT_BADGE, FONT_STAT_CARD,
  HABIT_LINK_COLORS,
} from '@egoless-do/core';
import type { Habit } from '@egoless-do/core';
import { Target, Pause, X, CheckCircle, Bell, BellOff } from 'lucide-react-native';
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

import { useTheme, useT , Card, ProgressBar } from '../../../components/UI';
import { STATUS_COLORS, STATUS_LABELS } from '../constants';

interface Props {
  habit: Habit;
  primaryColor: string;
  onPress: (h: Habit) => void;
  onLongPress: (h: Habit) => void;
  onCheckin: (id: string, date: string) => void;
  onStart: (id: string) => void;
  onCalendar: (id: string) => void;
}

function HabitCard({
  habit: h, primaryColor: P, onPress, onLongPress, onCheckin, onStart, onCalendar,
}: Props) {
  const TH = useTheme();
  const T = useT();
  const sc = STATUS_COLORS[h.status];
  const today = dateStr();
  const isCheckedToday = (h.checkedDates ?? []).includes(today);

  return (
    <View>
      {/* Timeline indicator */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: sc }} />
        <Text style={{ color: TH.sub, fontSize: FONT_SUB(), fontWeight: '600' }}>{h.startDate}</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: TH.border }} />
      </View>

      <TouchableOpacity onPress={() => onPress(h)} onLongPress={() => onLongPress(h)} activeOpacity={0.9}>
        <Card style={{ padding: 14, marginLeft: 16, marginBottom: 16 }}>
          {/* Header: name + status badge */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <Text style={{ color: TH.text, fontWeight: '700', fontSize: FONT_TITLE(), flex: 1, marginRight: 8 }}>{h.name}</Text>
            <View style={{ backgroundColor: `${sc}22`, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: sc, fontSize: FONT_BADGE(), fontWeight: '600' }}>{T(STATUS_LABELS[h.status])}</Text>
            </View>
          </View>

          {/* Goal */}
          {h.goal ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
              <Target size={15} color={P} />
              <Text style={{ color: TH.text, fontSize: FONT_BODY(), fontWeight: '700' }}>{h.goal}</Text>
            </View>
          ) : null}

          {/* Meta: start date + target days */}
          <Text style={{ color: TH.sub, fontSize: FONT_BODY(), marginBottom: 8 }}>
            {T('habitStart')} {h.startDate} · {T('habitGoal')} {String(h.targetDays)} {T('habitDays')}
          </Text>

          {/* Alarm */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 }}>
            {h.alarmEnabled ? <Bell size={14} color={P} /> : <BellOff size={14} color={TH.sub} />}
            <Text style={{ color: TH.sub, fontSize: FONT_SUB() }}>
              {T('habitAlarm')}: {h.alarmEnabled
                ? `${String(h.alarmHour).padStart(2, '0')}:${String(h.alarmMinute).padStart(2, '0')}`
                : T('habitAlarmOff')}
            </Text>
          </View>

          {/* Insight */}
          {h.insight ? (
            <Text style={{ color: TH.sub, fontSize: FONT_SUB(), marginBottom: 8, fontStyle: 'italic' }}>
              {T('habitVision')}{h.insight}
            </Text>
          ) : null}

          {/* Link */}
          {(h.link && h.link !== 'none') ? (
            <Text style={{ color: HABIT_LINK_COLORS[h.link], fontSize: FONT_SUB(), marginBottom: 8 }}>
              {T('habitLinked')}: {h.link === 'fasting'
                ? `${T('habitLinkedFasting')}（${h.linkConfig?.targetHours ?? 16}h）`
                : h.link === 'exercise'
                  ? `${T('habitLinkedExercise')}（${h.linkConfig?.targetMinutes ?? 30}min）`
                  : h.link === 'sleep' ? T('habitLinkedSleep') : T('habitLinkedMeditation')}
            </Text>
          ) : null}

          {/* Auto tag */}
          {h.createTag && (
            <View style={{ marginBottom: 8, alignSelf: 'flex-start', backgroundColor: `${P}30`, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 }}>
              <Text style={{ color: P, fontSize: FONT_SUB() }}>#{h.name}</Text>
            </View>
          )}

          {/* Pause/abandon reason */}
          {h.pauseReason ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <Pause size={14} color={COLORS.YELLOW} />
              <Text style={{ color: COLORS.YELLOW, fontSize: FONT_SUB() }}>{h.pauseReason}</Text>
            </View>
          ) : null}
          {h.abandonReason ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <X size={14} color={COLORS.RED} />
              <Text style={{ color: COLORS.RED, fontSize: FONT_SUB() }}>{h.abandonReason}</Text>
            </View>
          ) : null}

          {/* Progress bar */}
          <View style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ color: TH.sub, fontSize: FONT_SUB() }}>{h.doneDays}/{h.targetDays} {T('habitDays')}</Text>
              <Text style={{ color: TH.sub, fontSize: FONT_SUB() }}>{Math.round(h.doneDays / Math.max(h.targetDays, 1) * 100)}%</Text>
            </View>
            <ProgressBar pct={h.doneDays / Math.max(h.targetDays, 1) * 100} color={P} />
          </View>

          {/* Stats row (tap to open calendar) */}
          <TouchableOpacity onPress={() => onCalendar(h.id)}>
            <View style={{ flexDirection: 'row', gap: 20, marginBottom: 12 }}>
              {[
                { v: String(h.doneDays), l: T('habitCumDays'), c: P },
                { v: String(h.streak), l: T('habitStreakDays'), c: COLORS.ORANGE },
                { v: h.interrupted, l: T('habitInterrupted'), c: COLORS.RED },
                { v: String(Math.max(0, h.targetDays - h.doneDays)), l: T('habitRemainDays'), c: COLORS.GREEN },
              ].map(({ v, l, c }) => (
                <View key={l} style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '800', color: c }}>{v}</Text>
                  <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginTop: 2 }}>{l}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>

          {/* Action button */}
          {h.status === 'notStarted' && (
            <TouchableOpacity onPress={() => onStart(h.id)} style={{ paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.GREEN, alignItems: 'center' }}>
              <Text style={{ color: COLORS.GREEN, fontSize: FONT_BUTTON(), fontWeight: '600' }}>{T('habitStartBtn')}</Text>
            </TouchableOpacity>
          )}
          {h.status === 'inProgress' && (isCheckedToday ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: `${P}20` }}>
              <CheckCircle size={18} color={P} />
              <Text style={{ color: P, fontSize: FONT_BUTTON(), fontWeight: '600' }}>{T('habitChecked')}</Text>
            </View>
          ) : (
            <TouchableOpacity onPress={() => onCheckin(h.id, today)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: P }}>
              <CheckCircle size={18} color="#fff" />
              <Text style={{ color: '#fff', fontSize: FONT_BUTTON(), fontWeight: '600' }}>{T('habitCheckinBtn')}</Text>
            </TouchableOpacity>
          ))}
        </Card>
      </TouchableOpacity>
    </View>
  );
}

export default React.memo(HabitCard);
