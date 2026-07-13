import {COLORS, isPlanActive, dateStr, validatePlanForm, createNewItem, canEditPlanItem, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_ERROR, FONT_BADGE, FONT_LABEL , LINK_OPTIONS, PRIORITY_OPTIONS, FREQUENCY_OPTIONS, createDefaultFrequency , FONT_SMALL, scaleFontSize} from '@egoless-do/core';
import type { ItemForm, Vision } from '@egoless-do/core';
import { useRoute, RouteProp } from '@react-navigation/native';
import { ChevronLeft, ChevronDown, ChevronRight, Calendar, X } from 'lucide-react-native';
import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Alert,
  KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import DatePickerModal from '../../components/DatePickerModal';
import DateRangePickerModal from '../../components/DateRangePickerModal';
import { Card, useTheme, useT, PrimaryButton } from '../../components/UI';
import { useRootNavigation } from '../../navigation/hooks';
import type { RootStackParamList } from '../../navigation/types';
import { useAppStore, useShallowStore, type MobileStore } from '../../store/useAppStore';




function FrequencyNumberInput({ value, prefix, suffix, min, max, editable, inputStyle, onCommit }: {
  value: number; prefix: string; suffix: string; min: number; max: number; editable: boolean; inputStyle: object; onCommit: (n: number) => void;
}) {
  const [text, setText] = React.useState(String(value));
  React.useEffect(() => { setText(String(value)); }, [value]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <Text style={{ fontSize: FONT_LABEL(), color: '#888' }}>{prefix}</Text>
      <TextInput
        value={text}
        onChangeText={v => setText(v)}
        onBlur={() => { const n = parseInt(text); const clamped = Math.max(min, Math.min(max, n || min)); setText(String(clamped)); onCommit(clamped); }}
        keyboardType="number-pad"
        editable={editable}
        style={[inputStyle, { width: 60, textAlign: 'center', marginBottom: 0 }]}
      />
      <Text style={{ fontSize: FONT_LABEL(), color: '#888' }}>{suffix}</Text>
    </View>
  );
}

export default function PlanCreateScreen() {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const { reflections, plans, planItems, visions, habits,
    addPlan, updatePlan, addPlanItem, updatePlanItem, deletePlanItem } = useShallowStore(s => ({
    reflections: s.reflections,
    plans: s.plans,
    planItems: s.planItems,
    visions: s.visions,
    habits: s.habits,
    addPlan: s.addPlan,
    updatePlan: s.updatePlan,
    addPlanItem: s.addPlanItem,
    updatePlanItem: s.updatePlanItem,
    deletePlanItem: s.deletePlanItem,
  }));
  const nav = useRootNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'PlanCreate'>>();
  const planId = route.params?.planId as string | undefined;
  const reflectionId = route.params?.reflectionId as string | undefined;

  const reflection = useMemo(() => reflectionId ? (reflections ?? []).find(r => !r.deleted && r.id === reflectionId) : null, [reflections, reflectionId]);

  const existingPlan = useMemo(() => planId ? (plans ?? []).find(p => !p.deleted && p.id === planId) : null, [plans, planId]);
  const existingItems = useMemo(() => planId ? (planItems ?? []).filter(i => i.planId === planId && !i.deleted) : [], [planItems, planId]);

  const [name, setName] = useState(existingPlan?.name ?? '');
  const [goal, setGoal] = useState(existingPlan?.goal ?? '');
  const [slogan, setSlogan] = useState(existingPlan?.slogan ?? '');
  const [startDate, setStartDate] = useState(existingPlan?.startDate ?? '');
  const [endDate, setEndDate] = useState(existingPlan?.endDate ?? '');
  const [visionId, setVisionId] = useState<string | undefined>(existingPlan?.visionId);
  const [showVisionPicker, setShowVisionPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<ItemForm[]>(() => {
    const baseItems = existingItems.map(i => ({
      id: i.id, name: i.name, description: i.description,
      startDate: i.startDate, endDate: i.endDate, contentUrl: i.contentUrl,
      link: i.link, priority: i.priority ?? 'medium', targetMetric: i.targetMetric ?? '', linkConfig: i.linkConfig,
      frequency: i.frequency, tags: i.tags,
    }));
    if (reflection) {
      const lines = (reflection.content ?? '').split('\n').filter((l: string) => l.trim());
      const defaultName = lines[0]?.slice(0, 50) || reflection.content?.slice(0, 50) || '';
      const newItem = createNewItem(existingPlan?.startDate ?? '', existingPlan?.endDate ?? '');
      baseItems.push({
        ...newItem,
        name: defaultName,
        description: reflection.content ?? '',
        link: 'reflection',
      });
    }
    return baseItems;
  });
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => {
    const baseExpanded = new Set(existingItems.map(i => i.id));
    if (reflection) {
      const newItemId = items[items.length - 1]?.id;
      if (newItemId) baseExpanded.add(newItemId);
    }
    return baseExpanded;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [datePicker, setDatePicker] = useState<{ field: string; value: string; min?: string; max?: string } | null>(null);
  const [showRangePicker, setShowRangePicker] = useState(false);

  const isEdit = !!existingPlan;
  const isActive = existingPlan ? isPlanActive(existingPlan.status) : false;

  // Vision
  const selectedVision = useMemo(() =>
    visionId ? (visions ?? []).find((v: Vision) => v.id === visionId && !v.deleted) : null,
    [visions, visionId]
  );
  const activeVisions = useMemo(() =>
    (visions ?? []).filter((v: Vision) => !v.deleted && v.status === 'active'),
    [visions]
  );

  // Auto-adjust item dates when plan dates change
  useEffect(() => {
    if (!startDate && !endDate) return;
    setItems(prev => prev.map(item => {
      let changed = false;
      let s = item.startDate;
      let e = item.endDate;
      if (startDate && s && s < startDate) { s = startDate; changed = true; }
      if (endDate && e && e > endDate) { e = endDate; changed = true; }
      if (s && e && e < s) { e = s; changed = true; }
      return changed ? { ...item, startDate: s, endDate: e } : item;
    }));
  }, [startDate, endDate]);

  const validate = (): boolean => {
    const e = validatePlanForm({ name, goal, startDate, endDate, items }, T);
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (saving) return; // Prevent double-click creating duplicates
    if (!validate()) return;
    if (!isEdit) {
      const activePlan = (plans ?? []).find(p => !p.deleted && isPlanActive(p.status));
      if (activePlan) {
        Alert.alert(T('planActiveExists'));
        return;
      }
    }
    if (isEdit && planId) {
      updatePlan(planId, { name, goal, slogan, startDate, endDate, visionId });
      const existingIds = new Set(existingItems.map(i => i.id));
      const currentIds = new Set(items.map(i => i.id));
      // Delete removed existing items
      existingIds.forEach(id => {
        if (!currentIds.has(id)) deletePlanItem(id);
      });
      items.forEach((item, idx) => {
        if (existingIds.has(item.id)) {
          updatePlanItem(item.id, {
            name: item.name, description: item.description,
            startDate: item.startDate, endDate: item.endDate,
            contentUrl: item.contentUrl, link: item.link, priority: item.priority, targetMetric: item.targetMetric, linkConfig: item.linkConfig,
            frequency: item.frequency, tags: item.tags,
            order: idx,
          });
        } else {
          addPlanItem({
            planId, name: item.name, description: item.description,
            startDate: item.startDate, endDate: item.endDate,
            contentUrl: item.contentUrl, link: item.link, priority: item.priority, targetMetric: item.targetMetric, linkConfig: item.linkConfig,
            frequency: item.frequency, tags: item.tags,
            order: idx,
          });
        }
      });
      setSaving(true);
      Alert.alert(T('planSaved'), T('planSavedMsg'), [
        { text: T('planContinueEdit'), onPress: () => setSaving(false) },
        { text: T('planBack'), onPress: () => { setSaving(false); nav.goBack(); } },
      ]);
    } else {
      const newPlanId = addPlan({ name, goal, slogan, startDate, endDate, visionId });
      if (newPlanId) {
        setSaving(true);
        Alert.alert(T('planSaved'), T('planSavedMsg'), [
          { text: T('planContinueEdit'), onPress: () => setSaving(false) },
          { text: T('planBack'), onPress: () => { setSaving(false); nav.goBack(); } },
        ]);
      } else {
        // addPlan failed (likely another active plan exists, or validation error)
        Alert.alert(T('planSaveFailedTitle'), T('planSaveFailedMsg'), [{ text: T('ok') }]);
      }
    }
  };

  const addItem = () => {
    const newItem = createNewItem(startDate, endDate);
    setItems(prev => [...prev, newItem]);
    setExpandedItems(prev => new Set(prev).add(newItem.id));
  };

  const removeItem = (id: string) => {
    Alert.alert(T('planDeleteItem'), T('planDeleteItemConfirm'), [
      { text: T('cancel'), style: 'cancel' },
      { text: T('planDeleteItem'), style: 'destructive', onPress: () => setItems(prev => prev.filter(i => i.id !== id)) },
    ]);
  };

  const updateItem = (id: string, patch: Partial<ItemForm>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  };

  const toggleItem = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const inputStyle = {
    backgroundColor: TH.card, borderRadius: 10, borderWidth: 1, borderColor: TH.border,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: FONT_BODY(), color: TH.text,
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 10 }}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <ChevronLeft size={24} color={TH.text} />
        </TouchableOpacity>
        <Text style={{ fontWeight: '700', fontSize: FONT_TITLE(), color: TH.text }}>{isEdit ? T('planEditTitle') : T('planCreate')}</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        {/* Plan basic info */}
        <Card>
          <Text style={{ fontSize: FONT_LABEL(), fontWeight: '600', color: TH.sub, marginBottom: 4 }}>{T('planName')} *</Text>
          <TextInput
            value={name} onChangeText={setName} placeholder={T('planName')}
            placeholderTextColor={TH.sub}
            editable={!isActive}
            style={[inputStyle, { marginBottom: errors.name ? 4 : 12, borderColor: errors.name ? COLORS.RED : TH.border, ...(isActive ? { opacity: 0.5 } : {}) }]}
          />
          {errors.name ? <Text style={{ fontSize: FONT_ERROR(), color: COLORS.RED, marginBottom: 8 }}>{errors.name}</Text> : null}

          <Text style={{ fontSize: FONT_LABEL(), fontWeight: '600', color: TH.sub, marginBottom: 4 }}>{T('planGoal')} *</Text>
          <TextInput
            value={goal} onChangeText={setGoal} placeholder={T('planGoal')}
            placeholderTextColor={TH.sub} multiline
            style={[inputStyle, { minHeight: 60, textAlignVertical: 'top', marginBottom: errors.goal ? 4 : 12, borderColor: errors.goal ? COLORS.RED : TH.border }]}
          />
          {errors.goal ? <Text style={{ fontSize: FONT_ERROR(), color: COLORS.RED, marginBottom: 8 }}>{errors.goal}</Text> : null}

          {/* Vision Selector */}
          <Text style={{ fontSize: FONT_LABEL(), fontWeight: '600', color: TH.sub, marginBottom: 4 }}>{T('planLinkVision')}</Text>
          {selectedVision ? (
            <View style={{ backgroundColor: TH.card, borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: TH.border, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FONT_BADGE(), color: '#8B5CF6', fontWeight: '600' }}>
                  {selectedVision.type === 'lifetime' ? '⭐' : selectedVision.type === 'long' ? '🟣' : '🟢'} {T(`vow${selectedVision.type === 'lifetime' ? 'Lifetime' : selectedVision.type === 'long' ? 'Long' : 'Short'}`)}
                </Text>
                <Text style={{ fontSize: FONT_BODY(), color: TH.text, marginTop: 2 }} numberOfLines={1}>{selectedVision.text}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowVisionPicker(true)} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: `${TH.primary}15` }}>
                <Text style={{ fontSize: FONT_BADGE(), color: TH.primary, fontWeight: '600' }}>{T('planChangeVision')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setVisionId(undefined)} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: '#EF444415' }}>
                <Text style={{ fontSize: FONT_BADGE(), color: '#EF4444', fontWeight: '600' }}>{T('planUnlinkVision')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setShowVisionPicker(true)}
              style={[inputStyle, { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }]}
            >
              <Text style={{ fontSize: FONT_BADGE(), color: TH.primary, fontWeight: '600' }}>🔗</Text>
              <Text style={{ fontSize: FONT_BODY(), color: TH.sub }}>{T('planSelectVision')}</Text>
            </TouchableOpacity>
          )}

          <Text style={{ fontSize: FONT_LABEL(), fontWeight: '600', color: TH.sub, marginBottom: 4 }}>{T('planSlogan')}</Text>
          <TextInput
            value={slogan} onChangeText={setSlogan} placeholder={T('planSlogan')}
            placeholderTextColor={TH.sub}
            style={[inputStyle, { marginBottom: 12 }]}
          />

          <Text style={{ fontSize: FONT_LABEL(), fontWeight: '600', color: TH.sub, marginBottom: 6 }}>{T('planPeriod')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 6 }}>
            {([
              { key: '1m', months: 1, label: T('planPeriod1m') },
              { key: '3m', months: 3, label: T('planPeriod3m') },
              { key: '6m', months: 6, label: T('planPeriod6m') },
              { key: '1y', months: 12, label: T('planPeriod1y') },
            ] as const).map(opt => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => {
                  const start = new Date();
                  const end = new Date(start);
                  end.setMonth(end.getMonth() + opt.months);
                  end.setDate(end.getDate() - 1);
                  setStartDate(dateStr(start));
                  setEndDate(dateStr(end));
                }}
                style={{
                  paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
                  backgroundColor: TH.card, borderWidth: 1, borderColor: TH.border,
                }}
              >
                <Text style={{ color: TH.sub, fontSize: FONT_SUB(), fontWeight: '500' }}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={{ fontSize: FONT_LABEL(), color: TH.sub, marginBottom: 4 }}>{T('planTime')} *</Text>
          <TouchableOpacity
            onPress={() => !isActive && setShowRangePicker(true)}
            disabled={isActive}
            style={[inputStyle, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderColor: (errors.startDate || errors.endDate) ? COLORS.RED : TH.border, ...(isActive ? { opacity: 0.5 } : {}) }]}
          >
            <Text style={{ fontSize: FONT_BODY(), color: (startDate && endDate) ? TH.text : TH.sub }}>
              {startDate && endDate ? `${startDate}  —  ${endDate}` : T('planDateRangePlaceholder')}
            </Text>
            <Calendar size={16} color={TH.sub} />
          </TouchableOpacity>
          {errors.startDate ? <Text style={{ fontSize: FONT_ERROR(), color: COLORS.RED, marginTop: 4 }}>{errors.startDate}</Text> : null}
          {errors.endDate ? <Text style={{ fontSize: FONT_ERROR(), color: COLORS.RED, marginTop: 4 }}>{errors.endDate}</Text> : null}
        </Card>

        {/* Items */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8 }}>
          <Text style={{ fontSize: FONT_BODY(), fontWeight: '600', color: TH.text }}>{T('planItems')}</Text>
          <TouchableOpacity onPress={addItem} style={{ backgroundColor: P, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ color: '#fff', fontSize: FONT_SUB(), fontWeight: '600' }}>+ {T('planAddItem')}</Text>
          </TouchableOpacity>
        </View>

        {items.length === 0 && (
          <Card style={{ alignItems: 'center', padding: 24 }}>
            <Text style={{ color: TH.sub, fontSize: FONT_SUB() }}>{T('planNoItems')}</Text>
          </Card>
        )}

        {items.map((item, idx) => {
          const isExpanded = expandedItems.has(item.id);
          const _existingItem = existingItems.find(i => i.id === item.id);
          const _editable = !_existingItem || canEditPlanItem(_existingItem.status);
          return (
            <Card key={item.id} style={{ padding: 0, overflow: 'hidden' }}>
              {/* Header */}
              <TouchableOpacity
                onPress={() => toggleItem(item.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 }}
              >
                {isExpanded ? <ChevronDown size={16} color={TH.sub} /> : <ChevronRight size={16} color={TH.sub} />}
                <Text style={{ flex: 1, fontSize: FONT_SUB(), fontWeight: '600', color: TH.text }} numberOfLines={1}>
                  {item.name || `${T('planItemName')} ${idx + 1}`}
                </Text>
                {(() => { const p = PRIORITY_OPTIONS.find(o => o.value === (item.priority ?? 'medium')); return p ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: p.color }} /> : null; })()}
                {item.link !== 'manual' && (
                  <Text style={{ fontSize: FONT_BADGE(), color: TH.sub }}>
                    {T(`planLink${item.link.charAt(0).toUpperCase() + item.link.slice(1)}`)}
                  </Text>
                )}
                {item.tags && item.tags.length > 0 && item.tags.map((tag, ti) => (
                  <View key={ti} style={{ paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3, backgroundColor: `${P}15`, borderWidth: 1, borderColor: `${P}30` }}>
                    <Text style={{ fontSize: FONT_BADGE(), color: P }}>{tag}</Text>
                  </View>
                ))}
              </TouchableOpacity>

              {/* Expanded content */}
              {isExpanded && (
                <View style={{ paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: TH.border }}>
                  {/* Check if existing item is editable */}
                  {(() => {
                    const existingItem = existingItems.find(i => i.id === item.id);
                    if (existingItem && !canEditPlanItem(existingItem.status)) {
                      return (
                        <View style={{ backgroundColor: `${COLORS.ORANGE}15`, padding: 10, borderRadius: 8, marginTop: 10, marginBottom: 8 }}>
                          <Text style={{ fontSize: FONT_SUB(), color: COLORS.ORANGE }}>{T('freqCannotEdit')}</Text>
                        </View>
                      );
                    }
                    return null;
                  })()}
                  <View pointerEvents={_editable ? 'auto' : 'none'} style={_editable ? {} : { opacity: 0.5 }}>
                  <Text style={{ fontSize: FONT_LABEL(), color: TH.sub, marginBottom: 4, marginTop: 10 }}>{T('planItemName')} *</Text>
                  <TextInput
                    value={item.name} onChangeText={v => updateItem(item.id, { name: v })}
                    placeholder={T('planItemName')} placeholderTextColor={TH.sub}
                    editable={_editable}
                    style={[inputStyle, { marginBottom: 4, borderColor: errors[`item_${idx}_name`] ? COLORS.RED : TH.border }]}
                  />
                  {errors[`item_${idx}_name`] ? <Text style={{ fontSize: FONT_BADGE(), color: COLORS.RED, marginBottom: 6 }}>{errors[`item_${idx}_name`]}</Text> : null}

                  <Text style={{ fontSize: FONT_LABEL(), color: TH.sub, marginBottom: 4 }}>{T('planPriority')}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                    {PRIORITY_OPTIONS.map(opt => {
                      const active = (item.priority ?? 'medium') === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          onPress={() => updateItem(item.id, { priority: opt.value })}
                          style={{
                            flexDirection: 'row', alignItems: 'center', gap: 4,
                            paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
                            backgroundColor: active ? `${opt.color}20` : TH.card,
                            borderWidth: 1, borderColor: active ? opt.color : TH.border,
                          }}
                        >
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: opt.color }} />
                          <Text style={{ color: active ? opt.color : TH.sub, fontSize: FONT_SUB(), fontWeight: active ? '600' : '400' }}>
                            {T(opt.labelKey)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={{ fontSize: FONT_LABEL(), color: errors[`item_${idx}_targetMetric`] ? COLORS.RED : TH.sub, marginBottom: 4 }}>{T('planItemTarget')} *</Text>
                  <TextInput
                    value={item.targetMetric} onChangeText={v => updateItem(item.id, { targetMetric: v })}
                    placeholder={T('planItemTarget')} placeholderTextColor={TH.sub}
                    editable={_editable}
                    style={[inputStyle, { borderColor: errors[`item_${idx}_targetMetric`] ? COLORS.RED : TH.border, marginBottom: 8 }]}
                  />

                  <Text style={{ fontSize: FONT_LABEL(), color: errors[`item_${idx}_description`] ? COLORS.RED : TH.sub, marginBottom: 4 }}>{T('planItemDesc')} *</Text>
                  <TextInput
                    value={item.description} onChangeText={v => updateItem(item.id, { description: v })}
                    placeholder={T('planItemDesc')} placeholderTextColor={TH.sub} multiline
                    editable={_editable}
                    style={[inputStyle, { minHeight: 40, textAlignVertical: 'top', borderColor: errors[`item_${idx}_description`] ? COLORS.RED : TH.border, marginBottom: 8 }]}
                  />

                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: FONT_LABEL(), color: TH.sub, marginBottom: 4 }}>{T('planItemStart')} *</Text>
                      <TouchableOpacity
                        onPress={() => { const today = dateStr(); const minStart = startDate ? (today < startDate ? startDate : today) : today; setDatePicker({ field: `itemStart_${item.id}`, value: item.startDate, min: minStart, max: endDate || undefined }); }}
                        style={[inputStyle, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderColor: errors[`item_${idx}_startDate`] ? COLORS.RED : TH.border }]}
                      >
                        <Text style={{ fontSize: FONT_BODY(), color: item.startDate ? TH.text : TH.sub }}>{item.startDate || 'YYYY-MM-DD'}</Text>
                        <Calendar size={14} color={TH.sub} />
                      </TouchableOpacity>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: FONT_LABEL(), color: TH.sub, marginBottom: 4 }}>{T('planItemEnd')} *</Text>
                      <TouchableOpacity
                        onPress={() => setDatePicker({ field: `itemEnd_${item.id}`, value: item.endDate, min: item.startDate || startDate || undefined, max: endDate || undefined })}
                        style={[inputStyle, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderColor: errors[`item_${idx}_endDate`] ? COLORS.RED : TH.border }]}
                      >
                        <Text style={{ fontSize: FONT_BODY(), color: item.endDate ? TH.text : TH.sub }}>{item.endDate || 'YYYY-MM-DD'}</Text>
                        <Calendar size={14} color={TH.sub} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  {(errors[`item_${idx}_startDate`] || errors[`item_${idx}_endDate`]) ? (
                    <Text style={{ fontSize: FONT_BADGE(), color: COLORS.RED, marginBottom: 6 }}>
                      {errors[`item_${idx}_startDate`] || errors[`item_${idx}_endDate`]}
                    </Text>
                  ) : null}

                  <Text style={{ fontSize: FONT_LABEL(), color: TH.sub, marginBottom: 4 }}>{T('planItemContent')}</Text>
                  {item.tags && item.tags.length > 0 ? (
                    <TextInput
                      value={item.tags.join(', ')}
                      editable={false}
                      style={[inputStyle, { marginBottom: 8, color: TH.sub }]}
                    />
                  ) : (
                    <TextInput
                      value={item.contentUrl} onChangeText={v => updateItem(item.id, { contentUrl: v })}
                      placeholder="https://..." placeholderTextColor={TH.sub}
                      editable={_editable}
                      style={[inputStyle, { marginBottom: 8 }]}
                    />
                  )}

                  <Text style={{ fontSize: FONT_LABEL(), color: TH.sub, marginBottom: 4 }}>{T('planItemLink')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }} contentContainerStyle={{ gap: 6 }}>
                    {LINK_OPTIONS.map(opt => (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => updateItem(item.id, { link: opt.value })}
                        style={{
                          paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
                          backgroundColor: item.link === opt.value ? P : TH.card,
                          borderWidth: 1, borderColor: item.link === opt.value ? P : TH.border,
                        }}
                      >
                        <Text style={{ color: item.link === opt.value ? '#fff' : TH.sub, fontSize: FONT_SUB(), fontWeight: item.link === opt.value ? '600' : '400' }}>
                          {T(opt.labelKey)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Frequency selector */}
                  <Text style={{ fontSize: FONT_LABEL(), color: TH.sub, marginBottom: 4 }}>{T('checkinFreq')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }} contentContainerStyle={{ gap: 6 }}>
                    {FREQUENCY_OPTIONS.map(opt => {
                      const active = (item.frequency?.mode ?? 'daily') === opt.mode;
                      return (
                        <TouchableOpacity
                          key={opt.mode}
                          onPress={() => updateItem(item.id, { frequency: opt.mode === 'daily' ? undefined : createDefaultFrequency(opt.mode) })}
                          style={{
                            paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
                            backgroundColor: active ? P : TH.card,
                            borderWidth: 1, borderColor: active ? P : TH.border,
                          }}
                        >
                          <Text style={{ color: active ? '#fff' : TH.sub, fontSize: FONT_SUB(), fontWeight: active ? '600' : '400' }}>
                            {T(opt.labelKey)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Frequency config */}
                  {item.frequency && item.frequency.mode === 'interval' && (() => {
                    const [prefix, suffix] = T('freqEveryNDays').split('{n}');
                    return (
                      <FrequencyNumberInput
                        value={item.frequency.every} prefix={prefix} suffix={suffix} min={1} max={365}
                        editable={_editable} inputStyle={inputStyle}
                        onCommit={n => updateItem(item.id, { frequency: { mode: 'interval', every: n } })}
                      />
                    );
                  })()}

                  {item.frequency && item.frequency.mode === 'weekly' && (() => {
                    const [prefix, suffix] = T('freqNTimesPerWeek').split('{n}');
                    return (
                      <FrequencyNumberInput
                        value={item.frequency.target} prefix={prefix} suffix={suffix} min={1} max={7}
                        editable={_editable} inputStyle={inputStyle}
                        onCommit={n => updateItem(item.id, { frequency: { mode: 'weekly', target: n } })}
                      />
                    );
                  })()}

                  {item.frequency && item.frequency.mode === 'weekly_fixed' && (
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                      {[0, 1, 2, 3, 4, 5, 6].map(d => {
                        const active = item.frequency && 'days' in item.frequency && item.frequency.days.includes(d);
                        const label = [T('weekdaySun'), T('weekdayMon'), T('weekdayTue'), T('weekdayWed'), T('weekdayThu'), T('weekdayFri'), T('weekdaySat')][d];
                        return (
                          <TouchableOpacity
                            key={d}
                            onPress={() => {
                              if (!item.frequency || !('days' in item.frequency)) return;
                              const days = active ? item.frequency.days.filter(x => x !== d) : [...item.frequency.days, d].sort();
                              updateItem(item.id, { frequency: { mode: 'weekly_fixed', days } });
                            }}
                            style={{
                              width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
                              backgroundColor: active ? P : TH.card,
                              borderWidth: 1, borderColor: active ? P : TH.border,
                            }}
                          >
                            <Text style={{ color: active ? '#fff' : TH.sub, fontSize: FONT_SMALL(), fontWeight: active ? '700' : '400' }}>{label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {item.frequency && item.frequency.mode === 'monthly' && (() => {
                    const [prefix, suffix] = T('freqNTimesPerMonth').split('{n}');
                    return (
                      <FrequencyNumberInput
                        value={item.frequency.target} prefix={prefix} suffix={suffix} min={1} max={31}
                        editable={_editable} inputStyle={inputStyle}
                        onCommit={n => updateItem(item.id, { frequency: { mode: 'monthly', target: n } })}
                      />
                    );
                  })()}

                  {item.frequency && item.frequency.mode === 'monthly_fixed' && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(d => {
                        const active = item.frequency && 'dates' in item.frequency && item.frequency.dates.includes(d);
                        return (
                          <TouchableOpacity
                            key={d}
                            onPress={() => {
                              if (!item.frequency || !('dates' in item.frequency)) return;
                              const dates = active ? item.frequency.dates.filter(x => x !== d) : [...item.frequency.dates, d].sort((a, b) => a - b);
                              updateItem(item.id, { frequency: { mode: 'monthly_fixed', dates } });
                            }}
                            style={{
                              width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
                              backgroundColor: active ? P : TH.card,
                              borderWidth: 1, borderColor: active ? P : TH.border,
                            }}
                          >
                            <Text style={{ color: active ? '#fff' : TH.sub, fontSize: FONT_SMALL(), fontWeight: active ? '700' : '400' }}>{d}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {item.link === 'habit' && (
                    <>
                      <Text style={{ fontSize: FONT_LABEL(), color: TH.sub, marginBottom: 4 }}>{T('planLinkHabit')}</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }} contentContainerStyle={{ gap: 6 }}>
                        {(habits ?? []).filter(h => !h.deleted).map(h => {
                          const active = item.linkConfig?.habitId === h.id;
                          return (
                            <TouchableOpacity
                              key={h.id}
                              onPress={() => updateItem(item.id, { linkConfig: { ...item.linkConfig, habitId: h.id } })}
                              style={{
                                paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
                                backgroundColor: active ? P : TH.card,
                                borderWidth: 1, borderColor: active ? P : TH.border,
                              }}
                            >
                              <Text style={{ color: active ? '#fff' : TH.sub, fontSize: FONT_SUB(), fontWeight: active ? '600' : '400' }}>
                                {h.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </>
                  )}
                  </View>

                  <TouchableOpacity
                    onPress={() => removeItem(item.id)}
                    style={{ paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: `${COLORS.RED}40`, alignItems: 'center' }}
                  >
                    <Text style={{ color: COLORS.RED, fontSize: FONT_SUB() }}>{T('planDeleteItem')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Card>
          );
        })}

        {/* Add next task button */}
        {items.length > 0 && (
          <TouchableOpacity
            onPress={addItem}
            style={{
              paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: `${P}40`,
              borderStyle: 'dashed', alignItems: 'center', marginTop: 4,
            }}
          >
            <Text style={{ color: P, fontSize: FONT_SUB(), fontWeight: '600' }}>{T('planAddItemHint')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Save button */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 32, backgroundColor: TH.bg }}>
        <PrimaryButton label={T('planSave')} onPress={handleSave} />
      </View>

      {/* Date Range Picker Modal for plan dates */}
      <DateRangePickerModal
        visible={showRangePicker}
        startDate={startDate}
        endDate={endDate}
        onClose={() => setShowRangePicker(false)}
        onConfirm={(start, end) => {
          setStartDate(start);
          setEndDate(end);
          setShowRangePicker(false);
        }}
      />

      {/* Date Picker Modal for item dates */}
      {datePicker && (
        <DatePickerModal
          visible
          value={datePicker.value || dateStr()}
          minDate={datePicker.min}
          maxDate={datePicker.max}
          onClose={() => setDatePicker(null)}
          onConfirm={(date) => {
            const { field } = datePicker;
            if (field.startsWith('itemStart_')) {
              const id = field.slice(10);
              const item = items.find(i => i.id === id);
              updateItem(id, { startDate: date, ...(item && item.endDate && item.endDate < date ? { endDate: date } : {}) });
            } else if (field.startsWith('itemEnd_')) {
              updateItem(field.slice(8), { endDate: date });
            }
            setDatePicker(null);
          }}
        />
      )}

      {/* Vision Picker Modal */}
      {showVisionPicker && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowVisionPicker(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.75)', justifyContent: 'center', padding: 24 }}>
            <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 24, maxHeight: '80%' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text }}>{T('planSelectVision')}</Text>
                <TouchableOpacity onPress={() => setShowVisionPicker(false)}><X size={20} color={TH.sub} /></TouchableOpacity>
              </View>
              <ScrollView>
                {activeVisions.length === 0 ? (
                  <View style={{ alignItems: 'center', padding: 24 }}>
                    <Text style={{ fontSize: scaleFontSize(40), marginBottom: 8 }}>🎯</Text>
                    <Text style={{ fontSize: FONT_BODY(), color: TH.sub, textAlign: 'center' }}>{T('vowNoVision')}</Text>
                  </View>
                ) : activeVisions.map((v: Vision) => {
                  const typeColor = v.type === 'lifetime' ? '#F59E0B' : v.type === 'long' ? '#8B5CF6' : '#10B981';
                  const typeLabel = v.type === 'lifetime' ? T('vowLifetime') : v.type === 'long' ? T('vowLong') : T('vowShort');
                  return (
                    <TouchableOpacity
                      key={v.id}
                      onPress={() => {
                        setVisionId(v.id);
                        if (!slogan || slogan.trim() === '') setSlogan(v.text);
                        setShowVisionPicker(false);
                      }}
                      style={{
                        padding: 14, borderRadius: 12, marginBottom: 8,
                        backgroundColor: visionId === v.id ? `${typeColor}15` : TH.card,
                        borderWidth: 1, borderColor: visionId === v.id ? typeColor : TH.border,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Text style={{ fontSize: FONT_BADGE(), color: typeColor, fontWeight: '600' }}>
                          {v.type === 'lifetime' ? '⭐' : v.type === 'long' ? '🟣' : '🟢'} {typeLabel}
                        </Text>
                      </View>
                      <Text style={{ fontSize: FONT_BODY(), color: TH.text, lineHeight: 20 }}>{v.text}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}
