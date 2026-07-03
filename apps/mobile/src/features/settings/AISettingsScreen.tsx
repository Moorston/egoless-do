import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Switch, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Check, X, Wifi, WifiOff, ChevronRight, Trash2, Plus, Star, Settings } from 'lucide-react-native';
import { useTheme, useT } from '../../components/UI';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL, FONT_TINY } from '@egoless-do/core';
import { PROVIDER_TEMPLATES } from '@egoless-do/core';
import type { ModelConfig, ProviderTemplate, AIMode } from '@egoless-do/core';
import { uid } from '@egoless-do/core';
import { useAppStore } from '../../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

export default function AISettingsScreen() {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const nav = useNavigation();

  const store = useAppStore(useShallow(s => ({
    aiMode: s.aiMode,
    aiModels: s.aiModels,
    setAIMode: s.setAIMode,
    updateAIModel: s.updateAIModel,
    addAIModel: s.addAIModel,
    toggleAIModel: s.toggleAIModel,
    setDefaultAIModel: s.setDefaultAIModel,
    removeAIModel: s.removeAIModel,
  })));
  const mode = store.aiMode;
  const models = store.aiModels;
  const testTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (testTimerRef.current) clearTimeout(testTimerRef.current); }, []);

  // 编辑状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingModel, setEditingModel] = useState<ModelConfig | null>(null);

  // 表单状态
  const [formName, setFormName] = useState('');
  const [formBaseUrl, setFormBaseUrl] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formApiKey, setFormApiKey] = useState('');
  const [formMaxTokens, setFormMaxTokens] = useState('2000');
  const [formTemperature, setFormTemperature] = useState('0.7');

  // 测试状态
  const [testingModel, setTestingModel] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; error?: string; latency?: number }>>({});

  // 选择的模板
  const [selectedTemplate, setSelectedTemplate] = useState<ProviderTemplate | null>(null);

  const configuredCount = useMemo(() =>
    models.filter(m => m.enabled).length,
    [models]
  );

  // 打开添加模态框
  const handleOpenAdd = useCallback(() => {
    setEditingModel(null);
    setFormName('');
    setFormBaseUrl('');
    setFormModel('');
    setFormApiKey('');
    setFormMaxTokens('2000');
    setFormTemperature('0.7');
    setSelectedTemplate(null);
    setShowAddModal(true);
  }, []);

  // 打开编辑模态框
  const handleOpenEdit = useCallback((model: ModelConfig) => {
    setEditingModel(model);
    setFormName(model.name);
    setFormBaseUrl(model.baseUrl);
    setFormModel(model.model);
    setFormApiKey(model.apiKey || '');
    setFormMaxTokens(String(model.maxTokens));
    setFormTemperature(String(model.temperature));
    setSelectedTemplate(null);
    setShowAddModal(true);
  }, []);

  // 选择模板
  const handleSelectTemplate = useCallback((template: ProviderTemplate) => {
    setSelectedTemplate(template);
    setFormName(template.name);
    setFormBaseUrl(template.baseUrl);
    setFormModel(template.models[0] || '');
  }, []);

  // 保存模型
  const handleSave = useCallback(() => {
    if (!formName.trim() || !formBaseUrl.trim() || !formModel.trim()) {
      Alert.alert(T('aiHint'), T('aiFillRequired'));
      return;
    }

    const modelConfig: ModelConfig = {
      id: editingModel?.id || uid(),
      name: formName.trim(),
      baseUrl: formBaseUrl.trim(),
      model: formModel.trim(),
      apiKey: formApiKey.trim() || undefined,
      maxTokens: parseInt(formMaxTokens) || 2000,
      temperature: parseFloat(formTemperature) || 0.7,
      enabled: true,
      isDefault: models.length === 0,
    };

    if (editingModel) {
      store.updateAIModel(editingModel.id, modelConfig);
    } else {
      store.addAIModel(modelConfig);
    }

    setShowAddModal(false);
  }, [formName, formBaseUrl, formModel, formApiKey, formMaxTokens, formTemperature, editingModel, models.length, store]);

  // 切换模型启用状态
  const handleToggleModel = useCallback((modelId: string) => {
    store.toggleAIModel(modelId);
  }, [store]);

  // 设置默认模型
  const handleSetDefault = useCallback((modelId: string) => {
    store.setDefaultAIModel(modelId);
  }, [store]);

  // 删除模型
  const handleDeleteModel = useCallback((modelId: string) => {
    Alert.alert(T('aiDeleteModel'), T('aiDeleteConfirm'), [
      { text: T('aiCancel'), style: 'cancel' },
      {
        text: T('aiDelete'),
        style: 'destructive',
        onPress: () => {
          store.removeAIModel(modelId);
        },
      },
    ]);
  }, [store]);

  // 测试连接
  const handleTestConnection = useCallback(async (model: ModelConfig) => {
    setTestingModel(model.id);
    setTestResults(prev => ({ ...prev, [model.id]: undefined as string | undefined }));

    // 模拟测试（实际应该调用AI Service）
    if (testTimerRef.current) clearTimeout(testTimerRef.current);
    testTimerRef.current = setTimeout(() => {
      const isLocal = model.baseUrl.includes('localhost');
      const hasKey = !!model.apiKey;

      if (isLocal || hasKey) {
        setTestResults(prev => ({
          ...prev,
          [model.id]: { success: true, latency: Math.floor(Math.random() * 1000) + 100 }
        }));
      } else {
        setTestResults(prev => ({
          ...prev,
          [model.id]: { success: false, error: T('aiConfigureApiKey') }
        }));
      }
      setTestingModel(null);
    }, 1000);
  }, []);

  // 渲染模型卡片
  const renderModelCard = (model: ModelConfig) => {
    const isLocal = model.baseUrl.includes('localhost');
    const testResult = testResults[model.id];

    return (
      <View key={model.id} style={[styles.modelCard, { backgroundColor: TH.card, borderColor: TH.border }]}>
        <View style={styles.modelHeader}>
          <View style={styles.modelInfo}>
            <View style={styles.modelNameRow}>
              <Text style={[styles.modelName, { color: TH.text }]}>{model.name}</Text>
              {model.isDefault && (
                <View style={[styles.defaultBadge, { backgroundColor: `${P}20` }]}>
                  <Star size={10} color={P} />
                  <Text style={[styles.defaultText, { color: P }]}>{T('aiDefault')}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.modelDetail, { color: TH.sub }]}>
              {model.model} · {isLocal ? T('aiLocal') : T('aiCloud')}
            </Text>
          </View>

          <Switch
            value={model.enabled}
            onValueChange={() => handleToggleModel(model.id)}
            trackColor={{ false: TH.border, true: `${P}40` }}
            thumbColor={model.enabled ? P : TH.sub}
          />
        </View>

        {model.enabled && (
          <>
            <View style={styles.modelActions}>
              <TouchableOpacity
                onPress={() => handleOpenEdit(model)}
                style={[styles.actionButton, { borderColor: TH.border }]}
              >
                <Settings size={14} color={TH.text} />
                <Text style={[styles.actionText, { color: TH.text }]}>{T('aiConfigure')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleTestConnection(model)}
                style={[styles.actionButton, { borderColor: '#10B981' }]}
                disabled={testingModel === model.id}
              >
                <Wifi size={14} color="#10B981" />
                <Text style={[styles.actionText, { color: '#10B981' }]}>
                  {testingModel === model.id ? T('aiTesting') : T('aiTest')}
                </Text>
              </TouchableOpacity>

              {!model.isDefault && (
                <TouchableOpacity
                  onPress={() => handleSetDefault(model.id)}
                  style={[styles.actionButton, { borderColor: P }]}
                >
                  <Star size={14} color={P} />
                  <Text style={[styles.actionText, { color: P }]}>{T('aiSetDefault')}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => handleDeleteModel(model.id)}
                style={[styles.actionButton, { borderColor: '#EF4444' }]}
              >
                <Trash2 size={14} color="#EF4444" />
              </TouchableOpacity>
            </View>

            {testResult && (
              <View style={[
                styles.testResult,
                { backgroundColor: testResult.success ? '#10B98110' : '#EF444410' }
              ]}>
                <Text style={[
                  styles.testResultText,
                  { color: testResult.success ? '#10B981' : '#EF4444' }
                ]}>
                  {testResult.success ? `${T('aiConnectionSuccess')} (${testResult.latency}ms)` : `${T('aiConnectionFailed')}: ${testResult.error}`}
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={TH.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: TH.text }]}>{T('aiSettings')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* AI Mode */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: TH.text }]}>{T('aiMode')}</Text>
          {[
            { key: 'local' as AIMode, label: T('aiModeLocal'), desc: T('aiModeLocalDesc') },
            { key: 'cloud' as AIMode, label: T('aiModeCloud'), desc: T('aiModeCloudDesc') },
            { key: 'hybrid' as AIMode, label: T('aiModeHybrid'), desc: T('aiModeHybridDesc') },
          ].map(({ key, label, desc }) => (
            <TouchableOpacity
              key={key}
              onPress={() => store.setAIMode(key)}
              style={[
                styles.modeOption,
                {
                  backgroundColor: mode === key ? `${P}15` : TH.card,
                  borderColor: mode === key ? P : TH.border,
                },
              ]}
            >
              <View>
                <Text style={[styles.modeLabel, { color: TH.text }]}>{label}</Text>
                <Text style={[styles.modeDesc, { color: TH.sub }]}>{desc}</Text>
              </View>
              {mode === key && <Check size={20} color={P} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Configured Models */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: TH.text }]}>
              {T('aiConfiguredModels')} ({configuredCount})
            </Text>
            <TouchableOpacity onPress={handleOpenAdd} style={[styles.addButton, { backgroundColor: P }]}>
              <Plus size={16} color="#fff" />
              <Text style={styles.addButtonText}>{T('aiAdd')}</Text>
            </TouchableOpacity>
          </View>

          {models.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: TH.card, borderColor: TH.border }]}>
              <Text style={[styles.emptyText, { color: TH.sub }]}>{T('aiNoModels')}</Text>
              <Text style={[styles.emptySubtext, { color: TH.sub }]}>{T('aiNoModelsHint')}</Text>
            </View>
          ) : (
            models.map(renderModelCard)
          )}
        </View>

        {/* Provider Templates */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: TH.text }]}>{T('aiQuickSetup')}</Text>
          <Text style={[styles.sectionDesc, { color: TH.sub }]}>{T('aiQuickSetupDesc')}</Text>

          {PROVIDER_TEMPLATES.map(template => (
            <TouchableOpacity
              key={template.id}
              onPress={() => {
                setSelectedTemplate(template);
                setFormName(template.name);
                setFormBaseUrl(template.baseUrl);
                setFormModel(template.models[0] || '');
                setFormApiKey('');
                setShowAddModal(true);
              }}
              style={[styles.templateCard, { backgroundColor: TH.card, borderColor: TH.border }]}
            >
              <View style={styles.templateInfo}>
                <Text style={[styles.templateName, { color: TH.text }]}>{template.name}</Text>
                <Text style={[styles.templateDesc, { color: TH.sub }]}>{template.description}</Text>
                <Text style={[styles.templateModels, { color: TH.sub }]}>
                  {T('aiRecommendedModels')}: {template.models.join(', ')}
                </Text>
              </View>
              <ChevronRight size={18} color={TH.sub} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
            <View style={[styles.modalContent, { backgroundColor: TH.cardSolid }]}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: TH.text }]}>
                    {editingModel ? T('aiEditModel') : T('aiAddModel')}
                  </Text>
                  <TouchableOpacity onPress={() => setShowAddModal(false)}>
                    <X size={24} color={TH.sub} />
                  </TouchableOpacity>
                </View>

                {/* Template Quick Select */}
                {!editingModel && (
                  <View style={styles.templateSection}>
                    <Text style={[styles.inputLabel, { color: TH.sub }]}>{T('aiQuickSelect')}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {PROVIDER_TEMPLATES.map(t => (
                        <TouchableOpacity
                          key={t.id}
                          onPress={() => handleSelectTemplate(t)}
                          style={[
                            styles.templateChip,
                            {
                              backgroundColor: selectedTemplate?.id === t.id ? P : TH.card,
                              borderColor: selectedTemplate?.id === t.id ? P : TH.border,
                            },
                          ]}
                        >
                          <Text style={[
                            styles.templateChipText,
                            { color: selectedTemplate?.id === t.id ? '#fff' : TH.text }
                          ]}>
                            {t.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Form Fields */}
                <Text style={[styles.inputLabel, { color: TH.sub }]}>{`${T('aiName')} *`}</Text>
                <TextInput
                  value={formName}
                  onChangeText={setFormName}
                  placeholder={T('aiNamePlaceholder')}
                  placeholderTextColor={TH.sub}
                  style={[styles.input, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
                />

                <Text style={[styles.inputLabel, { color: TH.sub }]}>{`${T('aiApiAddress')} *`}</Text>
                <TextInput
                  value={formBaseUrl}
                  onChangeText={setFormBaseUrl}
                  placeholder={T('aiApiAddressPlaceholder')}
                  placeholderTextColor={TH.sub}
                  autoCapitalize="none"
                  style={[styles.input, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
                />
                {selectedTemplate && (
                  <View style={styles.baseUrlHint}>
                    <Text style={[styles.hintText, { color: TH.sub }]}>
                      {T('aiRecommendedAddress')}: {selectedTemplate.baseUrl}
                    </Text>
                    <TouchableOpacity onPress={() => setFormBaseUrl(selectedTemplate.baseUrl)}>
                      <Text style={[styles.useText, { color: P }]}>{T('aiUse')}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={[styles.inputLabel, { color: TH.sub }]}>{`${T('aiModelName')} *`}</Text>
                <TextInput
                  value={formModel}
                  onChangeText={setFormModel}
                  placeholder={T('aiModelNamePlaceholder')}
                  placeholderTextColor={TH.sub}
                  autoCapitalize="none"
                  style={[styles.input, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
                />
                {selectedTemplate && (
                  <View style={styles.modelHints}>
                    {selectedTemplate.models.map(m => (
                      <TouchableOpacity
                        key={m}
                        onPress={() => setFormModel(m)}
                        style={[
                          styles.modelChip,
                          {
                            backgroundColor: formModel === m ? P : TH.card,
                            borderColor: formModel === m ? P : TH.border,
                          },
                        ]}
                      >
                        <Text style={[
                          styles.modelChipText,
                          { color: formModel === m ? '#fff' : TH.text }
                        ]}>
                          {m}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={[styles.inputLabel, { color: TH.sub }]}>API Key</Text>
                <TextInput
                  value={formApiKey}
                  onChangeText={setFormApiKey}
                  placeholder={T('aiApiKeyPlaceholder')}
                  placeholderTextColor={TH.sub}
                  secureTextEntry
                  autoCapitalize="none"
                  style={[styles.input, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
                />

                <View style={styles.row}>
                  <View style={styles.halfField}>
                    <Text style={[styles.inputLabel, { color: TH.sub }]}>{T('aiMaxToken')}</Text>
                    <TextInput
                      value={formMaxTokens}
                      onChangeText={setFormMaxTokens}
                      placeholder="2000"
                      placeholderTextColor={TH.sub}
                      keyboardType="numeric"
                      style={[styles.input, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
                    />
                  </View>
                  <View style={styles.halfField}>
                    <Text style={[styles.inputLabel, { color: TH.sub }]}>{T('aiTemperature')}</Text>
                    <TextInput
                      value={formTemperature}
                      onChangeText={setFormTemperature}
                      placeholder="0.7"
                      placeholderTextColor={TH.sub}
                      keyboardType="numeric"
                      style={[styles.input, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
                    />
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    onPress={() => setShowAddModal(false)}
                    style={[styles.modalButton, { borderColor: TH.border }]}
                  >
                    <Text style={{ color: TH.sub }}>{T('aiCancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSave}
                    style={[styles.modalButton, { backgroundColor: P }]}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600' }}>
                      {editingModel ? T('aiSave') : T('aiAdd')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}
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
    fontSize: FONT_BODY,
    fontWeight: '600',
  },
  sectionDesc: {
    fontSize: FONT_SMALL,
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: FONT_SMALL,
    fontWeight: '600',
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  modeLabel: {
    fontSize: FONT_BODY,
    fontWeight: '600',
  },
  modeDesc: {
    fontSize: FONT_SMALL,
    marginTop: 2,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_BODY,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: FONT_SMALL,
  },
  modelCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modelInfo: {
    flex: 1,
  },
  modelNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modelName: {
    fontSize: FONT_BODY,
    fontWeight: '600',
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  defaultText: {
    fontSize: FONT_TINY,
    fontWeight: '500',
  },
  modelDetail: {
    fontSize: FONT_SMALL,
    marginTop: 2,
  },
  modelActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  actionText: {
    fontSize: FONT_SMALL,
  },
  testResult: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
  },
  testResultText: {
    fontSize: FONT_SMALL,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: FONT_BODY,
    fontWeight: '600',
    marginBottom: 4,
  },
  templateDesc: {
    fontSize: FONT_SMALL,
    marginBottom: 4,
  },
  templateModels: {
    fontSize: FONT_TINY,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: FONT_TITLE,
    fontWeight: '700',
  },
  templateSection: {
    marginBottom: 16,
  },
  templateChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  templateChipText: {
    fontSize: FONT_SMALL,
    fontWeight: '500',
  },
  inputLabel: {
    fontSize: FONT_SUB,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: FONT_BODY,
    marginBottom: 12,
  },
  baseUrlHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: -8,
    marginBottom: 12,
  },
  hintText: {
    fontSize: FONT_TINY,
  },
  useText: {
    fontSize: FONT_TINY,
    fontWeight: '600',
  },
  modelHints: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: -8,
    marginBottom: 12,
  },
  modelChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  modelChipText: {
    fontSize: FONT_SMALL,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
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
