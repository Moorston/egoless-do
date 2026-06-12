import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Plus, Zap, Send } from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { useTheme, useT } from '../../components/UI';
import { FONT_BODY, FONT_SMALL } from '@egoless-do/core';
import { getTrailStats, getMoodIcon } from '@egoless-do/core';
import CreateThoughtTrailModal from './CreateThoughtTrailModal';

export default function MindTrailScreen() {
  const TH = useTheme();
  const T = useT();
  const store = useAppStore();
  const nav = useNavigation();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [inputText, setInputText] = useState('');

  const handleCreateTrail = useCallback((trailId: string) => {
    (nav as any).navigate('ThoughtTrailDetail', { trailId });
  }, [nav]);

  const thoughtTrails = useMemo(() => 
    (store.thoughtTrails ?? []).filter(t => !t.deleted),
    [store.thoughtTrails]
  );

  const manualTrails = useMemo(() => 
    thoughtTrails.filter(t => t.source === 'manual' || !t.source),
    [thoughtTrails]
  );

  const reflections = useMemo(() => 
    (store.reflections ?? []).filter(r => !r.deleted),
    [store.reflections]
  );

  const renderThoughtTrailTab = () => {
    return (
      <View style={styles.tabContent}>
        {/* Manual Trails */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: TH.text }]}>
              {T('thoughtTrail')} ({manualTrails.length})
            </Text>
          </View>

          {manualTrails.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: TH.sub }]}>暂无手动创建的脉络</Text>
            </View>
          ) : (
            manualTrails.map(trail => {
              const stats = getTrailStats(trail, reflections);
              return (
                <TouchableOpacity
                  key={trail.id}
                  onPress={() => (nav as any).navigate('ThoughtTrailDetail', { trailId: trail.id })}
                  style={[styles.trailCard, { backgroundColor: TH.card, borderColor: TH.border }]}
                >
                  <Text style={[styles.trailName, { color: TH.text }]}>{trail.name}</Text>
                  <Text style={[styles.trailInfo, { color: TH.sub }]}>
                    {stats.count} {T('thoughtTrailReflections')}
                    {stats.dateRange ? ` · ${stats.dateRange.start} ~ ${stats.dateRange.end}` : ''}
                  </Text>
                  {stats.moodChanges.length > 0 && (
                    <Text style={[styles.moodChanges, { color: TH.sub }]}>
                      心情变化: {stats.moodChanges.map(m => getMoodIcon(m)).join(' → ')}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: TH.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={TH.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: TH.text }]}>{T('mindTrail')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {renderThoughtTrailTab()}
      </ScrollView>

      {/* Bottom Bar */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.bottomBar, { backgroundColor: TH.bg, borderTopColor: TH.border }]}>
          <View style={[styles.inputRow, { backgroundColor: TH.card, borderColor: TH.border }]}>
            <Zap size={16} color="#8B5CF6" />
            <TextInput
              style={[styles.input, { color: TH.text }]}
              placeholder={T('trailInputGuide')}
              placeholderTextColor={TH.sub}
              value={inputText}
              onChangeText={setInputText}
              returnKeyType="send"
              onSubmitEditing={() => {
                const text = inputText.trim();
                setInputText('');
                (nav as any).navigate('QuickCreateTrail', text ? { initialText: text } : {});
              }}
            />
            <TouchableOpacity
              onPress={() => {
                const text = inputText.trim();
                setInputText('');
                (nav as any).navigate('QuickCreateTrail', text ? { initialText: text } : {});
              }}
              style={[styles.sendBtn, { backgroundColor: '#8B5CF6' }]}
            >
              <Send size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
            style={[styles.manualBtn, { borderColor: TH.primary }]}
          >
            <Plus size={18} color={TH.primary} />
            <Text style={[styles.manualBtnText, { color: TH.primary }]}>{T('manualCreateTrail')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Create Modal */}
      <CreateThoughtTrailModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateTrail}
      />
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
  tabContent: {
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: FONT_BODY,
  },
  trailCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  trailName: {
    fontSize: FONT_BODY,
    fontWeight: '600',
    marginBottom: 4,
  },
  trailInfo: {
    fontSize: FONT_SMALL,
    marginBottom: 4,
  },
  moodChanges: {
    fontSize: FONT_SMALL,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    borderTopWidth: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: FONT_BODY,
    paddingVertical: 4,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  manualBtnText: {
    fontSize: FONT_BODY,
    fontWeight: '600',
  },
});
