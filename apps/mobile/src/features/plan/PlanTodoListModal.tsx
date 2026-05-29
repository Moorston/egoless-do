import React, { useMemo } from 'react';
import {
  View, Text, TouchableOpacity, Modal, ScrollView,
} from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { THEMES, COLORS, getTodayItems, getActivePlan, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE } from '@egoless-do/core';
import type { PlanItem } from '@egoless-do/core';
import { useTheme, useT } from '../../components/UI';
import { X, CheckCircle2, Check } from 'lucide-react-native';

export default function PlanTodoListModal({ onClose }: { onClose: () => void }) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const store = useAppStore();
  const today = new Date().toISOString().slice(0, 10);

  const activePlan = useMemo(() => getActivePlan(store.plans ?? []), [store.plans]);
  const todayItems = useMemo(() => {
    if (!activePlan) return [];
    return getTodayItems(store.planItems ?? [], activePlan, today);
  }, [store.planItems, activePlan, today]);

  const checkins = store.planItemCheckins ?? [];

  const isItemDone = (item: PlanItem) => checkins.some(c => c.planItemId === item.id && c.date === today && c.done);

  const doneCount = todayItems.filter(i => isItemDone(i)).length;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
      >
        <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()}>
          <View style={{
            backgroundColor: TH.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20,
            padding: 20, paddingBottom: 32, maxHeight: '70%',
          }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontWeight: '700', fontSize: FONT_TITLE, color: TH.text, flex: 1 }}>{T('planTodoList')}</Text>
              <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{today}</Text>
              <TouchableOpacity onPress={onClose} style={{ marginLeft: 12 }}>
                <X size={20} color={TH.sub} />
              </TouchableOpacity>
            </View>

            {todayItems.length === 0 ? (
              <View style={{ alignItems: 'center', padding: 32 }}>
                <CheckCircle2 size={32} color={COLORS.GREEN} style={{ marginBottom: 8 }} />
                <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>今日无待办项目</Text>
              </View>
            ) : (
              <ScrollView>
                {todayItems.map(item => {
                  const done = isItemDone(item);
                  const isManual = item.link === 'manual';
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => {
                        if (!isManual) return;
                        done ? store.uncheckinPlanItem(item.id) : store.checkinPlanItem(item.id);
                      }}
                      activeOpacity={isManual ? 0.7 : 1}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        padding: 14, marginBottom: 8, borderRadius: 12,
                        backgroundColor: done ? `${COLORS.GREEN}10` : TH.card,
                        borderWidth: 1, borderColor: done ? `${COLORS.GREEN}40` : TH.border,
                      }}
                    >
                      {/* Checkbox */}
                      <View style={{
                        width: 22, height: 22, borderRadius: 6,
                        borderWidth: 2, borderColor: done ? COLORS.GREEN : TH.border,
                        alignItems: 'center', justifyContent: 'center',
                        backgroundColor: done ? COLORS.GREEN : 'transparent',
                      }}>
                        {done ? <Check size={14} color="#fff" /> : null}
                      </View>

                      {/* Content */}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{
                          fontSize: FONT_BODY, fontWeight: '500',
                          color: done ? TH.sub : TH.text,
                          textDecorationLine: done ? 'line-through' : 'none',
                        }}>{item.name}</Text>
                        {item.description ? (
                          <Text style={{ fontSize: FONT_BADGE, color: TH.sub, marginTop: 2 }} numberOfLines={1}>
                            {item.description}
                          </Text>
                        ) : null}
                      </View>

                      {/* Link badge */}
                      {!isManual && (
                        <View style={{ backgroundColor: `${P}15`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ fontSize: FONT_BADGE, color: P }}>
                            {T(`planLink${item.link.charAt(0).toUpperCase() + item.link.slice(1)}`)}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
                <Text style={{ textAlign: 'center', fontSize: FONT_SUB, color: TH.sub, marginTop: 8 }}>
                  {doneCount}/{todayItems.length} {T('planProgress')}
                </Text>
              </ScrollView>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
