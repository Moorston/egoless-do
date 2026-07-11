import { COLORS, FONT_BODY, FONT_SUB, FONT_BADGE, FONT_TINY, FONT_EMPTY, getFrequencySummary } from '@egoless-do/core';
import type { PlanItem, PlanItemCheckin } from '@egoless-do/core';
import { Check, ClipboardList, Pencil, Plus, Trash2, Repeat } from 'lucide-react-native';
import React from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert } from 'react-native';

import { useTheme } from '../../components/UI';

import { LinkBadge } from './components/LinkBadge';

interface Props {
  todayItems: PlanItem[];
  dailyCustomTodos: Array<{ id: string; name: string; done: boolean; recurring?: boolean }>;
  statusMap: Map<string, { done: boolean; autoChecked: boolean }>;
  onToggleItem: (id: string) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onAddTodo: () => void;
  newTodoText: string;
  onChangeNewTodoText: (text: string) => void;
  checkins: PlanItemCheckin[];
  today: string;
  T: (key: string) => string;
  P: string;
}

export default function PlanTodoList({
  todayItems, dailyCustomTodos, statusMap,
  onToggleItem, onToggleTodo, onDeleteTodo,
  onAddTodo, newTodoText, onChangeNewTodoText,
  checkins, today, T, P,
}: Props) {
  const TH = useTheme();
  const hasItems = todayItems.length > 0 || dailyCustomTodos.length > 0;

  return (
    <>
      {/* Plan items */}
      {!hasItems ? (
        <Text style={{ fontSize: FONT_EMPTY(), color: TH.sub, textAlign: 'center', padding: 24 }}>{T('planNoItems')}</Text>
      ) : (
        <>
          {/* Plan items group header */}
          {todayItems.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12 }}>
              <ClipboardList size={14} color={P} />
              <Text style={{ fontSize: FONT_SUB(), fontWeight: '600', color: TH.text }}>{T('planTodoList')} ({todayItems.length})</Text>
            </View>
          )}
          {todayItems.map((item, i, arr) => {
            const status = statusMap.get(item.id);
            const done = status?.done ?? false;
            const autoChecked = status?.autoChecked ?? false;
            return (
              <View key={item.id} style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                paddingVertical: 10, paddingHorizontal: 12,
                borderBottomWidth: i < arr.length - 1 || dailyCustomTodos.length > 0 ? 1 : 0,
                borderBottomColor: TH.border, opacity: autoChecked ? 0.7 : 1,
              }}>
                <TouchableOpacity onPress={() => onToggleItem(item.id)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={done ? `${item.name} 取消完成` : `${item.name} 完成`}>
                  <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: done ? P : TH.border, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? P : 'transparent' }}>
                    {done && <Check size={14} color="#fff" />}
                  </View>
                </TouchableOpacity>
                {autoChecked && (
                  <View style={{ backgroundColor: `${COLORS.GREEN}20`, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 }}>
                    <Text style={{ fontSize: 9, color: COLORS.GREEN, fontWeight: '600' }}>{T('planAutoChecked')}</Text>
                  </View>
                )}
                {item.status === 'delayed' && !done && (
                  <View style={{ backgroundColor: `${COLORS.ORANGE}20`, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 }}>
                    <Text style={{ fontSize: 9, color: COLORS.ORANGE, fontWeight: '600' }}>{T('planStatusDelayed')}</Text>
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: FONT_BODY(), fontWeight: '500', color: TH.text }}>{item.name}</Text>
                  <Text style={{ fontSize: FONT_TINY(), color: P, marginTop: 1 }}>
                    {getFrequencySummary(item.frequency ?? { mode: 'daily' }, T, checkins, today, item.id)}
                  </Text>
                  {item.description ? (
                    <Text style={{ fontSize: FONT_BADGE(), color: TH.sub, marginTop: 2 }} numberOfLines={1}>{item.description}</Text>
                  ) : null}
                </View>
                <LinkBadge link={item.link} T={T} P={P} />
              </View>
            );
          })}

          {/* Custom todos group header */}
          {dailyCustomTodos.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12, borderTopWidth: todayItems.length > 0 ? 1 : 0, borderTopColor: TH.border }}>
              <Pencil size={14} color={P} />
              <Text style={{ fontSize: FONT_SUB(), fontWeight: '600', color: TH.text }}>{T('planDailyCustomTodos')} ({dailyCustomTodos.length})</Text>
            </View>
          )}
          {/* Custom todos */}
          {dailyCustomTodos.map((todo, i, arr) => (
            <View key={todo.id} style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              paddingVertical: 10, paddingHorizontal: 12,
              borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: TH.border,
            }}>
              <TouchableOpacity onPress={() => onToggleTodo(todo.id)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={todo.done ? `${todo.name} 取消完成` : `${todo.name} 完成`}>
                <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: todo.done ? P : TH.border, alignItems: 'center', justifyContent: 'center', backgroundColor: todo.done ? P : 'transparent' }}>
                  {todo.done && <Check size={14} color="#fff" />}
                </View>
              </TouchableOpacity>
              <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: FONT_BODY(), fontWeight: '500', color: TH.text }}>{todo.name}</Text>
                {todo.recurring && <Repeat size={12} color={P} />}
              </View>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(T('planDeleteCustomTodo'), T('planDeleteCustomTodoConfirm'), [
                    { text: T('commonCancel'), style: 'cancel' },
                    { text: T('commonConfirm'), style: 'destructive', onPress: () => onDeleteTodo(todo.id) },
                  ]);
                }}
                style={{ padding: 4 }}
                accessibilityLabel={`${T('planDeleteCustomTodo')} ${todo.name}`}
              >
                <Trash2 size={16} color={COLORS.RED} />
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      {/* Add custom todo */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderTopWidth: hasItems ? 1 : 0, borderTopColor: TH.border }}>
        <TextInput
          placeholder={T('planAddCustomTodoPlaceholder')}
          placeholderTextColor={TH.sub}
          style={{ flex: 1, borderWidth: 1, borderColor: TH.border, borderRadius: 8, padding: 10, fontSize: FONT_BODY(), color: TH.text, backgroundColor: TH.bg }}
          value={newTodoText}
          onChangeText={onChangeNewTodoText}
          onSubmitEditing={onAddTodo}
          returnKeyType="done"
        />
        <TouchableOpacity onPress={onAddTodo} disabled={!newTodoText.trim()} hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: newTodoText.trim() ? P : TH.border, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={T('planAddCustomTodoPlaceholder')}>
          <Plus size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </>
  );
}