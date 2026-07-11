import { COLORS, FONT_BODY, FONT_SUB, FONT_LABEL, FONT_BADGE } from '@egoless-do/core';
import { ClipboardList, Sparkles, Check, X } from 'lucide-react-native';
import React, { memo } from 'react';
import { View, Text } from 'react-native';

import { useTheme, useT, Checkbox } from '../../../components/UI';


interface PlanItem {
  id: string;
  name: string;
  link?: string;
}

interface CustomTodo {
  id: string;
  name: string;
  done: boolean;
}

interface PlanCheckin {
  planItemId: string;
  date: string;
  done: boolean;
  linkedModule?: string;
}

interface HomePlanSectionProps {
  /** Active plan items for today */
  todayPlanItems: PlanItem[];
  /** Custom todos for today */
  dailyCustomTodos: CustomTodo[];
  /** Plan item checkins */
  planCheckins: PlanCheckin[];
  /** Current view date */
  viewDate: string;
  /** Whether the section is read-only */
  isReadOnly: boolean;
  /** Toggle a plan item */
  onTogglePlanItem: (itemId: string) => void;
  /** Toggle a custom todo */
  onToggleCustomTodo: (id: string) => void;
}

const HomePlanSection = memo(function HomePlanSection({
  todayPlanItems, dailyCustomTodos, planCheckins, viewDate, isReadOnly,
  onTogglePlanItem, onToggleCustomTodo,
}: HomePlanSectionProps) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;

  const hasContent = todayPlanItems.length > 0 || dailyCustomTodos.length > 0;
  if (!hasContent) return null;

  return (
    <>
      {/* Plan items */}
      {todayPlanItems.length > 0 && (
        <>
          <Text style={{ color: TH.sub, fontSize: FONT_LABEL(), marginTop: 16, marginBottom: 8 }}>{T('planTodoList')}</Text>
          {todayPlanItems.map(item => {
            const done = planCheckins.some(c => c.planItemId === item.id && c.date === viewDate && c.done);
            const autoChecked = done && planCheckins.some(c => c.planItemId === item.id && c.date === viewDate && c.done && c.linkedModule);
            return (
              <View key={item.id} style={{
                flexDirection: 'row', alignItems: 'center',
                justifyContent: 'space-between', paddingVertical: 12,
                borderBottomWidth: 1, borderBottomColor: TH.border,
                opacity: autoChecked ? 0.7 : 1,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <ClipboardList size={16} color={P} />
                  <View>
                    <Text style={{ color: TH.text, fontSize: FONT_BODY() }} numberOfLines={1}>{item.name}</Text>
                    {item.link && item.link !== 'manual' && (
                      <Text style={{ color: TH.sub, fontSize: FONT_SUB() }}>
                        {T(`planLink${item.link.charAt(0).toUpperCase() + item.link.slice(1)}`)}
                      </Text>
                    )}
                  </View>
                </View>
                {autoChecked ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Check size={14} color={COLORS.GREEN} />
                    <Text style={{ fontSize: FONT_BADGE(), color: COLORS.GREEN, fontWeight: '600' }}>{T('planAutoChecked')}</Text>
                  </View>
                ) : isReadOnly ? (
                  done ? <Check size={18} color={COLORS.GREEN} /> : <X size={18} color={TH.sub} />
                ) : (
                  <Checkbox on={done} onChange={() => onTogglePlanItem(item.id)} />
                )}
              </View>
            );
          })}
        </>
      )}

      {/* Daily custom todos */}
      {dailyCustomTodos.length > 0 && (
        <>
          <Text style={{ color: TH.sub, fontSize: FONT_LABEL(), marginTop: 16, marginBottom: 8 }}>{T('planDailyCustomTodos')}</Text>
          {dailyCustomTodos.map(todo => (
            <View key={todo.id} style={{
              flexDirection: 'row', alignItems: 'center',
              justifyContent: 'space-between', paddingVertical: 12,
              borderBottomWidth: 1, borderBottomColor: TH.border,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Sparkles size={16} color={P} />
                <Text style={{ color: TH.text, fontSize: FONT_BODY() }}>{todo.name}</Text>
              </View>
              {isReadOnly ? (
                todo.done ? <Check size={18} color={COLORS.GREEN} /> : <X size={18} color={TH.sub} />
              ) : (
                <Checkbox on={todo.done} onChange={() => onToggleCustomTodo(todo.id)} />
              )}
            </View>
          ))}
        </>
      )}
    </>
  );
});

export default HomePlanSection;
