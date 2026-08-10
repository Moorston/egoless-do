import {FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL, FONT_TINY} from '@egoless-do/core';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Plus, Lightbulb, TrendingUp, AlertTriangle, X } from 'lucide-react-native';
import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, useT } from '../../../components/UI';
import { useAppStore, useShallowStore } from '../../../store/useAppStore';


interface Strategy {
  id: string;
  title: string;
  description: string;
  effectiveness: 'high' | 'medium' | 'low';
  relatedReflectionIds: string[];
  createdAt: number;
}

export default function StrategyLibrary() {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const { reflections: rawReflections } = useShallowStore(s => ({
    reflections: s.reflections,
  }));
  const nav = useNavigation();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const reflections = useMemo(() =>
    (rawReflections ?? []).filter(r => !r.deleted),
    [rawReflections]
  );

  const strategies = useMemo((): Strategy[] => {
    // Extract strategies from reflections with 'insight' or 'learn' tags
    const insightReflections = reflections.filter(r => 
      r.tags.some(t => t.includes('洞察') || t.includes('领悟') || t.includes('策略') || t.includes('方法'))
    );

    return insightReflections.map((r, idx) => ({
      id: `strategy-${idx}`,
      title: r.content.slice(0, 30) + (r.content.length > 30 ? '...' : ''),
      description: r.content,
      effectiveness: 'medium' as const,
      relatedReflectionIds: [r.id],
      createdAt: r.timestamp,
    }));
  }, [reflections]);

  const effectiveStrategies = useMemo(() => 
    strategies.filter(s => s.effectiveness === 'high'),
    [strategies]
  );

  const otherStrategies = useMemo(() => 
    strategies.filter(s => s.effectiveness !== 'high'),
    [strategies]
  );

  const handleAddStrategy = useCallback(() => {
    if (!newTitle.trim()) return;
    // Save strategy as a reflection with a dedicated tag
    const store = useAppStore.getState();
    const desc = newDescription.trim() ? `\n${newDescription.trim()}` : '';
    store.addReflection({
      content: `【策略】${newTitle.trim()}${desc}`,
      tags: ['策略', 'coping-strategy'],
      mood: '',
    });
    setNewTitle('');
    setNewDescription('');
    setShowAddModal(false);
  }, [newTitle, newDescription]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={TH.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: TH.text }]}>应对策略库</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addButton}>
          <Plus size={20} color={P} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Effective Strategies */}
        {effectiveStrategies.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <TrendingUp size={18} color="#10B981" />
              <Text style={[styles.sectionTitle, { color: TH.text }]}>有效的策略</Text>
            </View>
            {effectiveStrategies.map(strategy => (
              <View
                key={strategy.id}
                style={[styles.strategyCard, { backgroundColor: TH.card, borderColor: '#10B981' }]}
              >
                <View style={styles.strategyHeader}>
                  <Lightbulb size={16} color="#10B981" />
                  <Text style={[styles.strategyTitle, { color: TH.text }]}>{strategy.title}</Text>
                </View>
                <Text style={[styles.strategyDescription, { color: TH.sub }]} numberOfLines={3}>
                  {strategy.description}
                </Text>
                <Text style={[styles.strategyDate, { color: TH.sub }]}>
                  {new Date(strategy.createdAt).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Other Strategies */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Lightbulb size={18} color={P} />
            <Text style={[styles.sectionTitle, { color: TH.text }]}>
              {effectiveStrategies.length > 0 ? '其他策略' : '我的策略'} ({otherStrategies.length})
            </Text>
          </View>

          {otherStrategies.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Lightbulb size={48} color={TH.sub} />
              <Text style={[styles.emptyTitle, { color: TH.text }]}>暂无策略</Text>
              <Text style={[styles.emptyText, { color: TH.sub }]}>
                随着你记录更多应对经验，这里会积累你的策略
              </Text>
            </View>
          ) : (
            otherStrategies.map(strategy => (
              <View
                key={strategy.id}
                style={[styles.strategyCard, { backgroundColor: TH.card, borderColor: TH.border }]}
              >
                <Text style={[styles.strategyTitle, { color: TH.text }]}>{strategy.title}</Text>
                <Text style={[styles.strategyDescription, { color: TH.sub }]} numberOfLines={2}>
                  {strategy.description}
                </Text>
                <Text style={[styles.strategyDate, { color: TH.sub }]}>
                  {new Date(strategy.createdAt).toLocaleDateString()}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Tips */}
        <View style={[styles.tipsContainer, { backgroundColor: `${P}10`, borderColor: `${P}30` }]}>
          <AlertTriangle size={16} color={P} />
          <Text style={[styles.tipsText, { color: TH.text }]}>
            记录你的应对策略，帮助未来遇到类似情况时快速找到解决方案
          </Text>
        </View>
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: TH.cardSolid }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: TH.text }]}>添加策略</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={24} color={TH.sub} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: TH.sub }]}>策略标题</Text>
            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="例如：深呼吸缓解焦虑"
              placeholderTextColor={TH.sub}
              style={[styles.input, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
            />

            <Text style={[styles.inputLabel, { color: TH.sub }]}>详细描述</Text>
            <TextInput
              value={newDescription}
              onChangeText={setNewDescription}
              placeholder="描述这个策略的具体做法..."
              placeholderTextColor={TH.sub}
              multiline
              numberOfLines={4}
              style={[styles.input, styles.textArea, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={[styles.modalButton, { borderColor: TH.border }]}
              >
                <Text style={{ color: TH.sub }}>{T('commonCancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddStrategy}
                style={[styles.modalButton, { backgroundColor: P, opacity: newTitle.trim() ? 1 : 0.5 }]}
                disabled={!newTitle.trim()}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>添加</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    fontSize: FONT_TITLE(),
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: FONT_BODY(),
    fontWeight: '600',
  },
  strategyCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  strategyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  strategyTitle: {
    fontSize: FONT_BODY(),
    fontWeight: '600',
    flex: 1,
  },
  strategyDescription: {
    fontSize: FONT_SMALL(),
    lineHeight: 20,
    marginBottom: 8,
  },
  strategyDate: {
    fontSize: FONT_TINY(),
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: FONT_BODY(),
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: FONT_SMALL(),
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  tipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  tipsText: {
    fontSize: FONT_SMALL(),
    flex: 1,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: FONT_TITLE(),
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: FONT_SUB(),
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: FONT_BODY(),
    marginBottom: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
