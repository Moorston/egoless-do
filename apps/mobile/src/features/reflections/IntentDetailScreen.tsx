import React, { useMemo, useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Target, Link, TrendingUp, CheckCircle, XCircle, Clock } from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { useTheme, useT } from '../../components/UI';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL, FONT_TINY } from '@egoless-do/core';
import { getMoodIcon } from '@egoless-do/core';
import type { IntentStatus } from '@egoless-do/core';

const STATUS_CONFIG: Record<IntentStatus, { label: string; color: string; icon: React.ReactNode }> = {
  seed: { label: '种子', color: '#8B5CF6', icon: <Clock size={16} color="#8B5CF6" /> },
  growing: { label: '成长', color: '#3B82F6', icon: <TrendingUp size={16} color="#3B82F6" /> },
  active: { label: '活跃', color: '#10B981', icon: <Target size={16} color="#10B981" /> },
  achieved: { label: '达成', color: '#F59E0B', icon: <CheckCircle size={16} color="#F59E0B" /> },
  integrated: { label: '融入', color: '#EC4899', icon: <CheckCircle size={16} color="#EC4899" /> },
  abandoned: { label: '放弃', color: '#6B7280', icon: <XCircle size={16} color="#6B7280" /> },
};

export default function IntentDetailScreen() {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const store = useAppStore();
  const nav = useNavigation();
  const route = useRoute();

  const { intentId } = route.params as { intentId: string };
  const intent = useMemo(() => 
    (store.intents ?? []).find(i => i.id === intentId),
    [store.intents, intentId]
  );

  const linkedReflections = useMemo(() => {
    if (!intent) return [];
    return intent.linkedReflectionIds
      .map(id => (store.reflections ?? []).find(r => r.id === id))
      .filter(r => r != null && !r.deleted);
  }, [intent, store.reflections]);

  const linkedPlans = useMemo(() => {
    if (!intent) return [];
    return intent.linkedPlanIds
      .map(id => (store.plans ?? []).find(p => p.id === id))
      .filter(p => p != null && !p.deleted);
  }, [intent, store.plans]);

  const linkedHabits = useMemo(() => {
    if (!intent) return [];
    return intent.linkedHabitIds
      .map(id => (store.habits ?? []).find(h => h.id === id))
      .filter(h => h != null && !h.deleted);
  }, [intent, store.habits]);

  const handleUpdateStatus = useCallback((newStatus: IntentStatus) => {
    if (!intent) return;
    
    Alert.alert(
      '更新状态',
      `确定要将意图状态更新为「${STATUS_CONFIG[newStatus].label}」吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: () => {
            store.updateIntentStatus(intentId, newStatus);
          },
        },
      ]
    );
  }, [store, intent, intentId]);

  // Check if intent is inactive
  const inactiveWarning = useMemo(() => {
    if (!intent) return null;
    const now = Date.now();
    const daysSinceUpdate = Math.floor((now - intent.updatedAt) / (24 * 60 * 60 * 1000));
    
    if (intent.status === 'seed' && daysSinceUpdate >= 7) {
      return {
        type: 'seed',
        message: `这个意图已经${daysSinceUpdate}天没有进展了`,
        suggestion: '要不要开始行动，或者重新考虑这个意图？',
      };
    }
    
    if (intent.status === 'active' && daysSinceUpdate >= 30) {
      return {
        type: 'active',
        message: `这个意图已经活跃${daysSinceUpdate}天了`,
        suggestion: '检查一下进度，看看是否需要调整？',
      };
    }
    
    return null;
  }, [intent]);

  if (!intent) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: TH.bg }}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: TH.sub }]}>意图不存在</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusConfig = STATUS_CONFIG[intent.status];

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={TH.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: TH.text }]}>意图详情</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}20` }]}>
          {statusConfig.icon}
          <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
        </View>

        {/* Inactive Warning */}
        {inactiveWarning && (
          <View style={[styles.warningCard, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
            <Text style={[styles.warningTitle, { color: '#92400E' }]}>⏰ {inactiveWarning.message}</Text>
            <Text style={[styles.warningText, { color: '#92400E' }]}>{inactiveWarning.suggestion}</Text>
            <View style={styles.warningActions}>
              <TouchableOpacity
                onPress={() => handleUpdateStatus(inactiveWarning.type === 'seed' ? 'growing' : 'achieved')}
                style={[styles.warningButton, { backgroundColor: '#F59E0B' }]}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>
                  {inactiveWarning.type === 'seed' ? '开始行动' : '标记达成'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleUpdateStatus('abandoned')}
                style={[styles.warningButton, { borderColor: '#92400E' }]}
              >
                <Text style={{ color: '#92400E' }}>放弃</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Content */}
        <View style={[styles.contentCard, { backgroundColor: TH.card, borderColor: TH.border }]}>
          <Text style={[styles.contentTitle, { color: TH.text }]}>{intent.content}</Text>
          {intent.why && (
            <Text style={[styles.contentWhy, { color: TH.sub }]}>原因：{intent.why}</Text>
          )}
          <Text style={[styles.contentDate, { color: TH.sub }]}>
            创建于 {new Date(intent.createdAt).toLocaleDateString()}
          </Text>
        </View>

        {/* Source */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: TH.text }]}>来源</Text>
          <Text style={[styles.sectionContent, { color: TH.sub }]}>
            {intent.source === 'reflection' && '从感念中提炼'}
            {intent.source === 'review' && '从复盘中发现'}
            {intent.source === 'insight' && '从洞察中产生'}
            {intent.source === 'external' && '外部触发'}
          </Text>
        </View>

        {/* Linked Reflections */}
        {linkedReflections.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: TH.text }]}>关联感念</Text>
            {linkedReflections.map(r => (
              <View key={r.id} style={[styles.linkedItem, { backgroundColor: TH.card, borderColor: TH.border }]}>
                <Text style={[styles.linkedContent, { color: TH.text }]} numberOfLines={2}>
                  {r.content}
                </Text>
                <Text style={[styles.linkedDate, { color: TH.sub }]}>
                  {new Date(r.timestamp).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Linked Plans */}
        {linkedPlans.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: TH.text }]}>关联计划</Text>
            {linkedPlans.map(p => (
              <TouchableOpacity
                key={p.id}
                onPress={() => (nav as any).navigate('PlanDetail', { planId: p.id })}
                style={[styles.linkedItem, { backgroundColor: TH.card, borderColor: TH.border }]}
              >
                <Text style={[styles.linkedContent, { color: TH.text }]}>{p.name}</Text>
                <Text style={[styles.linkedDate, { color: TH.sub }]}>
                  {p.startDate} ~ {p.endDate}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Linked Habits */}
        {linkedHabits.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: TH.text }]}>关联习惯</Text>
            {linkedHabits.map(h => (
              <View key={h.id} style={[styles.linkedItem, { backgroundColor: TH.card, borderColor: TH.border }]}>
                <Text style={[styles.linkedContent, { color: TH.text }]}>{h.name}</Text>
                <Text style={[styles.linkedDate, { color: TH.sub }]}>
                  {h.streak} 天连续
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Learnings */}
        {intent.learnings && intent.learnings.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: TH.text }]}>学到的东西</Text>
            {intent.learnings.map((learning, idx) => (
              <View key={idx} style={[styles.learningItem, { backgroundColor: `${P}10` }]}>
                <Text style={[styles.learningText, { color: TH.text }]}>{learning}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Outcome */}
        {intent.outcome && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: TH.text }]}>结果</Text>
            <Text style={[styles.sectionContent, { color: TH.text }]}>{intent.outcome}</Text>
          </View>
        )}

        {/* Status Update */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: TH.text }]}>更新状态</Text>
          <View style={styles.statusOptions}>
            {(['seed', 'growing', 'active', 'achieved', 'integrated', 'abandoned'] as IntentStatus[]).map(status => {
              const config = STATUS_CONFIG[status];
              const isCurrent = intent.status === status;
              return (
                <TouchableOpacity
                  key={status}
                  onPress={() => !isCurrent && handleUpdateStatus(status)}
                  style={[
                    styles.statusOption,
                    {
                      backgroundColor: isCurrent ? `${config.color}20` : TH.card,
                      borderColor: isCurrent ? config.color : TH.border,
                    },
                  ]}
                >
                  {config.icon}
                  <Text style={[styles.statusOptionLabel, { color: isCurrent ? config.color : TH.text }]}>
                    {config.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: FONT_BODY,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 16,
  },
  statusText: {
    fontSize: FONT_SMALL,
    fontWeight: '600',
  },
  contentCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  contentTitle: {
    fontSize: FONT_BODY,
    fontWeight: '600',
    marginBottom: 8,
  },
  contentWhy: {
    fontSize: FONT_SMALL,
    marginBottom: 8,
  },
  contentDate: {
    fontSize: FONT_TINY,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: FONT_BODY,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: FONT_BODY,
    lineHeight: 22,
  },
  linkedItem: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  linkedContent: {
    fontSize: FONT_SMALL,
    marginBottom: 4,
  },
  linkedDate: {
    fontSize: FONT_TINY,
  },
  learningItem: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  learningText: {
    fontSize: FONT_SMALL,
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  statusOptionLabel: {
    fontSize: FONT_SMALL,
    fontWeight: '500',
  },
  warningCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  warningTitle: {
    fontSize: FONT_BODY,
    fontWeight: '600',
    marginBottom: 4,
  },
  warningText: {
    fontSize: FONT_SMALL,
    marginBottom: 12,
  },
  warningActions: {
    flexDirection: 'row',
    gap: 8,
  },
  warningButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
