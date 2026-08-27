import type { Plan, PlanItem } from '@egoless-do/core';
import { COLORS } from '@egoless-do/core';
import { CircleCheck, Pause, Pencil, Play, Trash2, XCircle } from 'lucide-react-native';
import React from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';

import { useT, useTheme } from '../../../components/UI';
import { styles } from '../styles';

export interface PlanActionBarProps {
  plan: Plan;
  items: PlanItem[];
  itemProgressMap: Map<string, { doneCount: number; expectedDays: number; progress: number }>;
  // 权限判断（从父组件传入）
  editable: boolean;
  pausable: boolean;
  resumable: boolean;
  cancellable: boolean;
  completable: boolean;
  deletable: boolean;
  // store actions（从父组件传入）
  deletePlan: (id: string) => void;
  completePlan: (id: string, reason?: string) => void;
  resumePlan: (id: string) => void;
  pausePlan: (id: string) => void;
  cancelPlan: (id: string) => void;
  canArchivePlan: (planId: string) => { allowed: boolean; linkedReflectionCount: number };
  unlinkAllReflectionsFromPlan: (planId: string) => void;
  // 导航
  onEdit: () => void;  // nav.navigate('PlanCreate', { planId })
  onClose: () => void;  // 删除后关闭
}

export function PlanActionBar({
  plan,
  items,
  itemProgressMap,
  editable,
  pausable,
  resumable,
  cancellable,
  completable,
  deletable,
  deletePlan,
  completePlan,
  resumePlan,
  pausePlan,
  cancelPlan,
  canArchivePlan,
  unlinkAllReflectionsFromPlan,
  onEdit,
  onClose,
}: PlanActionBarProps) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;

  const checkCanArchive = (onConfirm: () => void) => {
    const result = canArchivePlan(plan.id);
    if (!result.allowed) {
      Alert.alert(
        T('planCannotOperate'),
        T('planCannotOperateDetail').replace('{count}', String(result.linkedReflectionCount)),
        [
          { text: T('commonCancel'), style: 'cancel' },
          { text: T('planUnlinkAndContinue'), style: 'destructive', onPress: () => {
            unlinkAllReflectionsFromPlan(plan.id);
            onConfirm();
          }},
        ]
      );
      return;
    }
    onConfirm();
  };

  const handleDelete = () => {
    checkCanArchive(() => {
      Alert.alert(T('planDelete'), T('planDeleteConfirm'), [
        { text: T('commonCancel'), style: 'cancel' },
        { text: T('commonConfirm'), style: 'destructive', onPress: async () => { await deletePlan(plan.id); onClose(); } },
      ]);
    });
  };

  const handleComplete = () => {
    const incomplete = items.filter(item => {
      const prog = itemProgressMap.get(item.id);
      return !prog || prog.progress < 100;
    });

    if (incomplete.length === 0) {
      completePlan(plan.id);
      return;
    }

    Alert.alert(
      T('planCompleteWithIncomplete'),
      T('planCompleteWithIncompleteDetail').replace('{count}', String(incomplete.length)),
      [
        { text: T('commonCancel'), style: 'cancel' },
        { text: T('planCompleteConfirmBtn'), onPress: () => completePlan(plan.id) },
      ],
    );
  };

  const handleResume = () => {
    resumePlan(plan.id);
  };

  const handlePause = () => {
    pausePlan(plan.id);
  };

  const handleCancel = () => {
    checkCanArchive(() => {
      Alert.alert(T('planCancelPlan'), T('planConfirmCancel'), [
        { text: T('commonCancel'), style: 'cancel' },
        { text: T('commonConfirm'), style: 'destructive', onPress: () => cancelPlan(plan.id) },
      ]);
    });
  };

  return (
    <View style={styles.actionsContainer}>
      {editable && (
        <TouchableOpacity onPress={onEdit}
          style={[styles.actionButtonOutline, { backgroundColor: TH.card, borderColor: TH.border }]}
          accessibilityLabel={T('commonEdit')}
        >
          <Pencil size={16} color={TH.text} />
          <Text style={[styles.textActionLabel, { color: TH.text }]}>{T('commonEdit')}</Text>
        </TouchableOpacity>
      )}
      {pausable && (
        <TouchableOpacity onPress={handlePause}
          style={[styles.actionButtonFill, { backgroundColor: COLORS.YELLOW }]}
          accessibilityLabel={T('planPause')}
        >
          <Pause size={16} color="#fff" />
          <Text style={styles.textActionLabelWhite}>{T('planPause')}</Text>
        </TouchableOpacity>
      )}
      {resumable && (
        <TouchableOpacity onPress={handleResume}
          style={[styles.actionButtonFill, { backgroundColor: COLORS.GREEN }]}
          accessibilityLabel={T('planResume')}
        >
          <Play size={16} color="#fff" />
          <Text style={styles.textActionLabelWhite}>{T('planResume')}</Text>
        </TouchableOpacity>
      )}
      {cancellable && (
        <TouchableOpacity onPress={handleCancel}
          style={[styles.actionButtonDanger, { borderColor: `${COLORS.RED}30` }]}
          accessibilityLabel={T('planCancelPlan')}
        >
          <XCircle size={16} color={COLORS.RED} />
          <Text style={[styles.textActionLabel, { color: COLORS.RED }]}>{T('planCancelPlan')}</Text>
        </TouchableOpacity>
      )}
      {completable && (
        <TouchableOpacity onPress={handleComplete}
          style={[styles.actionButtonFill, { backgroundColor: P }]}
          accessibilityLabel={T('planComplete')}
        >
          <CircleCheck size={16} color="#fff" />
          <Text style={styles.textActionLabelWhite}>{T('planComplete')}</Text>
        </TouchableOpacity>
      )}
      {deletable && (
        <TouchableOpacity onPress={handleDelete}
          style={[styles.actionButtonDanger, { borderColor: `${COLORS.RED}30` }]}
          accessibilityLabel={T('planDelete')}
        >
          <Trash2 size={16} color={COLORS.RED} />
          <Text style={[styles.textActionLabel, { color: COLORS.RED }]}>{T('planDelete')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
