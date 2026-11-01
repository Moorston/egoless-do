import type { DailyCustomTodo, DailyTodoHistory, HistorySummary, MergedHistoryItem, Plan, PlanItem, PlanItemCheckin, TodoItemStatus } from '@egoless-do/core';
import { COLORS, getFrequencySummary, statusToI18nKey } from '@egoless-do/core';
import { Check, ChevronDown, ChevronRight, ClipboardList, Pencil, Plus, Repeat, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Card, useT, useTheme } from '../../../components/UI';
import { styles } from '../styles';

import { LinkBadge } from './LinkBadge';

export interface TodoTabContentProps {
  // useDailyTodo return values
  todayItems: PlanItem[];
  dailyCustomTodos: DailyCustomTodo[];
  statusMap: Map<string, TodoItemStatus>;
  stats: { totalDone: number; totalItems: number };
  historyGroups: DailyTodoHistory[];
  historySummary: HistorySummary;
  showHistory: boolean;
  setShowHistory: (v: boolean | ((prev: boolean) => boolean)) => void;
  newTodoName: string;
  setNewTodoName: (v: string) => void;
  newTodoRecurring: boolean;
  setNewTodoRecurring: (v: boolean | ((prev: boolean) => boolean)) => void;
  toggleItem: (itemId: string) => void;
  addCustomTodo: () => void;
  deleteCustomTodo: (id: string) => void;
  toggleCustomTodo: (id: string) => void;
  mergeHistoryItems: (group: DailyTodoHistory) => MergedHistoryItem[];
  // parent state
  plan: Plan;
  checkins: PlanItemCheckin[];
  today: string;
  // accordion state
  expandedDates: Set<string>;
  toggleDateExpand: (date: string) => void;
}

// TodoTabContent 为待办标签页主体（今日任务 + 自定义待办 + 历史时间线），条件分支较多，暂禁用行数限制
// eslint-disable-next-line max-lines-per-function
export function TodoTabContent({
  todayItems,
  dailyCustomTodos,
  statusMap,
  stats,
  historyGroups,
  historySummary,
  showHistory,
  setShowHistory,
  newTodoName,
  setNewTodoName,
  newTodoRecurring,
  setNewTodoRecurring,
  toggleItem,
  addCustomTodo,
  deleteCustomTodo,
  toggleCustomTodo,
  mergeHistoryItems,
  plan,
  checkins,
  today,
  expandedDates,
  toggleDateExpand,
}: TodoTabContentProps) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;

  return (
    <>
      {/* Today's tasks — only for active plans */}
      {(plan.status === 'in_progress' || plan.status === 'paused') && (
        <>
          <Card style={styles.todayStatsCard}>
            <Text style={[styles.textBodyDimMb8, { color: TH.sub }]}>{T('planTodoToday')}</Text>
            <View style={styles.todayStatsRow}>
              <Text style={[styles.textStatValue, { color: P }]}>{stats.totalDone}</Text>
              <Text style={[styles.textBodyDim, { color: TH.sub }]}>/ {stats.totalItems}</Text>
            </View>
            <Text style={[styles.textSubDimMt4, { color: TH.sub }]}>{today}</Text>
          </Card>

          <Card>
            {/* Plan items */}
            {todayItems.length === 0 && dailyCustomTodos.length === 0 ? (
              <Text style={[styles.textEmptyCentered, { color: TH.sub }]}>{T('planNoItems')}</Text>
            ) : (
              <>
                {/* Plan items group header */}
                {todayItems.length > 0 && (
                  <View style={styles.groupHeaderRow}>
                    <ClipboardList size={14} color={P} />
                    <Text style={[styles.textSubSemiBold, { color: TH.text }]}>{T('planTodoList')} ({String(todayItems.length)})</Text>
                  </View>
                )}
                {todayItems.map((item, i, arr) => {
                  const status = statusMap.get(item.id);
                  const done = status?.done ?? false;
                  const autoChecked = status?.autoChecked ?? false;
                  return (
                    <View
                      key={item.id}
                      style={[styles.todoItemRow, { borderBottomColor: TH.border, borderBottomWidth: i < arr.length - 1 || dailyCustomTodos.length > 0 ? 1 : 0, opacity: autoChecked ? 0.7 : 1 }]}
                    >
                      <TouchableOpacity onPress={() => toggleItem(item.id)} style={styles.checkboxTouchTarget} accessibilityLabel={done ? `${item.name} 取消完成` : `${item.name} 完成`}>
                        <View style={[styles.checkbox, { borderColor: done ? P : TH.border, backgroundColor: done ? P : 'transparent' }]}>
                          {done && <Check size={14} color="#fff" />}
                        </View>
                      </TouchableOpacity>
                      {autoChecked && (
                        <View style={styles.autoCheckedBadge}>
                          <Text style={styles.autoCheckedBadgeText}>{T('planAutoChecked')}</Text>
                        </View>
                      )}
                      {item.status === 'delayed' && !done && (
                        <View style={styles.delayedBadge}>
                          <Text style={styles.delayedBadgeText}>{T('planStatusDelayed')}</Text>
                        </View>
                      )}
                      <View style={styles.todoContentCol}>
                        <Text style={[styles.textBodyMedium, { color: TH.text }]}>{item.name}</Text>
                        <Text style={[styles.textFrequencyTiny, { color: P }]}>
                          {getFrequencySummary(item.frequency ?? { mode: 'daily' }, T, checkins, today, item.id)}
                        </Text>
                        {item.description ? (
                          <Text style={[styles.textBadgeDimMt2, { color: TH.sub }]} numberOfLines={1}>{item.description}</Text>
                        ) : null}
                      </View>
                      <LinkBadge link={item.link} T={T} P={P} />
                    </View>
                  );
                })}

                {/* Custom todos group header */}
                {dailyCustomTodos.length > 0 && (
                  <View style={[styles.customTodoHeaderRow, { borderTopColor: TH.border, borderTopWidth: todayItems.length > 0 ? 1 : 0 }]}>
                    <Pencil size={14} color={P} />
                    <Text style={[styles.textSubSemiBold, { color: TH.text }]}>{T('planDailyCustomTodos')} ({String(dailyCustomTodos.length)})</Text>
                  </View>
                )}
                {/* Custom todos */}
                {dailyCustomTodos.map((todo, i, arr) => (
                  <View
                    key={todo.id}
                    style={[styles.customTodoRow, { borderBottomColor: TH.border, borderBottomWidth: i < arr.length - 1 ? 1 : 0 }]}
                  >
                    <TouchableOpacity onPress={() => toggleCustomTodo(todo.id)} style={styles.checkboxTouchTarget} accessibilityLabel={todo.done ? `${todo.name} 取消完成` : `${todo.name} 完成`}>
                      <View style={[styles.checkbox, { borderColor: todo.done ? P : TH.border, backgroundColor: todo.done ? P : 'transparent' }]}>
                        {todo.done && <Check size={14} color="#fff" />}
                      </View>
                    </TouchableOpacity>
                    <View style={styles.customTodoContentCol}>
                      <Text style={[styles.textBodyMedium, { color: TH.text }]}>{todo.name}</Text>
                      {todo.recurring && <Repeat size={12} color={P} />}
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        Alert.alert(T('planDeleteCustomTodo'), T('planDeleteCustomTodoConfirm'), [
                          { text: T('commonCancel'), style: 'cancel' },
                          { text: T('commonConfirm'), style: 'destructive', onPress: () => deleteCustomTodo(todo.id) },
                        ]);
                      }}
                      style={styles.deleteTodoTouchTarget}
                      accessibilityLabel={`${T('planDeleteCustomTodo')} ${todo.name}`}
                    >
                      <Trash2 size={16} color={COLORS.RED} />
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}

            {/* Add custom todo */}
              <View style={[styles.addTodoContainer, { borderTopColor: TH.border, borderTopWidth: todayItems.length > 0 || dailyCustomTodos.length > 0 ? 1 : 0 }]}>
                <TextInput
                  style={[styles.addTodoInput, { borderColor: TH.border, color: TH.text, backgroundColor: TH.bg }]}
                  placeholder={T('planAddCustomTodoPlaceholder')}
                  placeholderTextColor={TH.sub}
                  value={newTodoName}
                  onChangeText={setNewTodoName}
                  onSubmitEditing={addCustomTodo}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  onPress={() => setNewTodoRecurring(!newTodoRecurring)}
                  style={[styles.recurringButton, { borderColor: newTodoRecurring ? P : TH.border, backgroundColor: newTodoRecurring ? `${P}15` : 'transparent' }]}
                  accessibilityLabel={newTodoRecurring ? '取消重复' : '设为重复'}
                >
                  <Repeat size={16} color={newTodoRecurring ? P : TH.sub} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={addCustomTodo}
                  style={[styles.addButton, { backgroundColor: P }]}
                  accessibilityLabel={T('planAddCustomTodoPlaceholder')}
                >
                  <Plus size={16} color="#fff" />
                </TouchableOpacity>
              </View>
          </Card>
        </>
      )}
      {plan.status !== 'in_progress' && plan.status !== 'paused' && (
        <Card style={styles.inactiveCard}>
          <Text style={[styles.textBodyDim, { color: TH.sub }]}>{T(statusToI18nKey(plan.status))}</Text>
        </Card>
      )}

      {/* History section */}
      <View style={styles.historySection}>
        <TouchableOpacity onPress={() => setShowHistory(v => !v)}
          style={[styles.historyHeader, { marginBottom: showHistory ? 12 : 0 }]}
          accessibilityLabel={showHistory ? '收起历史记录' : '展开历史记录'}
        >
          <View style={styles.historyTitleRow}>
            <Text style={[styles.textHistoryTitle, { color: TH.text }]}>{T('planTodoHistory')}</Text>
            {showHistory ? <ChevronDown size={18} color={TH.text} /> : <ChevronRight size={18} color={TH.text} />}
          </View>
          <Text style={[styles.textSubDim, { color: TH.sub }]}>{String(historyGroups.length)} {T('planDays')}</Text>
        </TouchableOpacity>

        {showHistory && (
          <>
            {historyGroups.length > 0 && (
              <View style={[styles.historySummaryCard, { backgroundColor: TH.card, borderColor: TH.border }]}>
                {[
                  { value: String(historySummary.totalDays), label: T('planDays') },
                  { value: String(historySummary.totalDoneItems), label: T('planTodoDone') },
                ].map(s => (
                  <View key={s.label} style={styles.historyStatItem}>
                    <Text style={[styles.textHistoryStatValue, { color: P }]}>{String(s.value)}</Text>
                    <Text style={[styles.textHistoryStatLabel, { color: TH.sub }]}>{s.label}</Text>
                  </View>
                ))}
              </View>
            )}

            {historyGroups.length === 0 ? (
              <Text style={[styles.textNoHistory, { color: TH.sub }]}>{T('noHistory')}</Text>
            ) : (
              <View style={styles.timelineContainer}>
                <View style={[styles.timelineLine, { backgroundColor: TH.border }]} />
                {historyGroups.map((group) => {
                  const allItems = mergeHistoryItems(group);
                  const doneCount = allItems.filter(i => i.done).length;
                  const isExpanded = expandedDates.has(group.date);
                  return (
                    <View key={group.date} style={styles.timelineItem}>
                      <View style={[styles.timelineDot, { backgroundColor: P, borderColor: TH.bg }]} />
                      <View style={[styles.historyItemCard, { backgroundColor: TH.card, borderColor: TH.border }]}>
                        <TouchableOpacity
                          onPress={() => toggleDateExpand(group.date)}
                          style={[styles.historyItemHeader, { borderBottomColor: TH.border, borderBottomWidth: isExpanded ? 1 : 0 }]}
                          accessibilityLabel={isExpanded ? `收起 ${group.date}` : `展开 ${group.date}`}
                        >
                          <View style={styles.historyItemTitleRow}>
                            {isExpanded ? <ChevronDown size={16} color={TH.text} /> : <ChevronRight size={16} color={TH.text} />}
                            <Text style={[styles.textBodyDate, { color: TH.text }]}>{group.date}</Text>
                          </View>
                          <Text style={[styles.textBodyDoneCount, { color: P }]}>{doneCount} {T('planTodoDone')}</Text>
                        </TouchableOpacity>
                        {isExpanded && allItems.map((item, i) => (
                          <View key={i} style={[styles.historyItemRow, { borderTopColor: TH.border, borderTopWidth: i > 0 ? 1 : 0, opacity: item.done ? 1 : 0.5 }]}>
                            <View style={[styles.historyCheckbox, { backgroundColor: item.done ? P : `${TH.border}80` }]}>
                              {item.done && <Check size={10} color="#fff" />}
                            </View>
                            <Text style={[styles.historyItemName, { color: TH.text, textDecorationLine: item.done ? 'line-through' : 'none' }]}>{item.name}</Text>
                            {item.type === 'plan' && <LinkBadge link={item.link} T={T} P={P} />}
                            {item.type === 'custom' && (
                              <View style={styles.customTodoBadge}>
                                <Text style={styles.customTodoBadgeText}>{T('planDailyCustomTodos')}</Text>
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </View>
    </>
  );
}
