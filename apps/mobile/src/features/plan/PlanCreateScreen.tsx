import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppStore } from '../../store/useAppStore';
import { THEMES, COLORS, canEditPlan, dateStr, validatePlanForm, createNewItem, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BUTTON, FONT_ERROR, FONT_BADGE, FONT_LABEL } from '@egoless-do/core';
import type { ItemForm } from '@egoless-do/core';
import { LINK_OPTIONS } from '@egoless-do/core';
import { Card, useTheme, useT, PrimaryButton, OutlineButton, ThemedInput } from '../../components/UI';
import DatePickerModal from '../../components/DatePickerModal';
import { ChevronLeft, ChevronDown, ChevronRight, Calendar } from 'lucide-react-native';

export default function PlanCreateScreen() {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const store = useAppStore();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const planId = route.params?.planId as string | undefined;

  const existingPlan = planId ? (store.plans ?? []).find(p => p.id === planId) : null;
  const existingItems = planId ? (store.planItems ?? []).filter(i => i.planId === planId && !i.deleted) : [];

  const [name, setName] = useState(existingPlan?.name ?? '');
  const [goal, setGoal] = useState(existingPlan?.goal ?? '');
  const [slogan, setSlogan] = useState(existingPlan?.slogan ?? '');
  const [startDate, setStartDate] = useState(existingPlan?.startDate ?? '');
  const [endDate, setEndDate] = useState(existingPlan?.endDate ?? '');
  const [items, setItems] = useState<ItemForm[]>(() =>
    existingItems.map(i => ({
      id: i.id, name: i.name, description: i.description,
      startDate: i.startDate, endDate: i.endDate, contentUrl: i.contentUrl,
      link: i.link, linkConfig: i.linkConfig,
    }))
  );
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [datePicker, setDatePicker] = useState<{ field: string; value: string; min?: string; max?: string } | null>(null);

  const isEdit = !!existingPlan;

  const validate = (): boolean => {
    const e = validatePlanForm({ name, goal, startDate, endDate, items }, T);
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    if (isEdit && planId) {
      store.updatePlan(planId, { name, goal, slogan, startDate, endDate });
      const existingIds = new Set(existingItems.map(i => i.id));
      const currentIds = new Set(items.map(i => i.id));
      // Delete removed existing items
      existingIds.forEach(id => {
        if (!currentIds.has(id)) store.deletePlanItem(id);
      });
      items.forEach((item, idx) => {
        if (existingIds.has(item.id)) {
          store.updatePlanItem(item.id, {
            name: item.name, description: item.description,
            startDate: item.startDate, endDate: item.endDate,
            contentUrl: item.contentUrl, link: item.link, linkConfig: item.linkConfig,
            order: idx,
          });
        } else {
          store.addPlanItem({
            planId, name: item.name, description: item.description,
            startDate: item.startDate, endDate: item.endDate,
            contentUrl: item.contentUrl, link: item.link, linkConfig: item.linkConfig,
            order: idx,
          });
        }
      });
    } else {
      const newPlanId = store.addPlan({ name, goal, slogan, startDate, endDate });
      if (newPlanId) {
        items.forEach((item, idx) => {
          store.addPlanItem({
            planId: newPlanId, name: item.name, description: item.description,
            startDate: item.startDate, endDate: item.endDate,
            contentUrl: item.contentUrl, link: item.link, linkConfig: item.linkConfig,
            order: idx,
          });
        });
      }
    }
    nav.goBack();
  };

  const addItem = () => {
    const newItem = createNewItem(startDate, endDate);
    setItems(prev => [...prev, newItem]);
    setExpandedItems(prev => new Set(prev).add(newItem.id));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
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
    paddingHorizontal: 12, paddingVertical: 10, fontSize: FONT_BODY, color: TH.text,
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 10 }}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <ChevronLeft size={24} color={TH.text} />
        </TouchableOpacity>
        <Text style={{ fontWeight: '700', fontSize: FONT_TITLE, color: TH.text }}>{isEdit ? T('planEditTitle') : T('planCreate')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Plan basic info */}
        <Card>
          <Text style={{ fontSize: FONT_LABEL, fontWeight: '600', color: TH.sub, marginBottom: 4 }}>{T('planName')} *</Text>
          <TextInput
            value={name} onChangeText={setName} placeholder={T('planName')}
            placeholderTextColor={TH.sub}
            style={[inputStyle, { marginBottom: errors.name ? 4 : 12, borderColor: errors.name ? COLORS.RED : TH.border }]}
          />
          {errors.name ? <Text style={{ fontSize: FONT_ERROR, color: COLORS.RED, marginBottom: 8 }}>{errors.name}</Text> : null}

          <Text style={{ fontSize: FONT_LABEL, fontWeight: '600', color: TH.sub, marginBottom: 4 }}>{T('planGoal')} *</Text>
          <TextInput
            value={goal} onChangeText={setGoal} placeholder={T('planGoal')}
            placeholderTextColor={TH.sub} multiline
            style={[inputStyle, { minHeight: 60, textAlignVertical: 'top', marginBottom: errors.goal ? 4 : 12, borderColor: errors.goal ? COLORS.RED : TH.border }]}
          />
          {errors.goal ? <Text style={{ fontSize: FONT_ERROR, color: COLORS.RED, marginBottom: 8 }}>{errors.goal}</Text> : null}

          <Text style={{ fontSize: FONT_LABEL, fontWeight: '600', color: TH.sub, marginBottom: 4 }}>{T('planSlogan')}</Text>
          <TextInput
            value={slogan} onChangeText={setSlogan} placeholder={T('planSlogan')}
            placeholderTextColor={TH.sub}
            style={[inputStyle, { marginBottom: 12 }]}
          />

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FONT_LABEL, color: TH.sub, marginBottom: 4 }}>{T('planStartDate')} *</Text>
              <TouchableOpacity
                onPress={() => setDatePicker({ field: 'planStart', value: startDate })}
                style={[inputStyle, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderColor: errors.startDate ? COLORS.RED : TH.border }]}
              >
                <Text style={{ fontSize: FONT_BODY, color: startDate ? TH.text : TH.sub }}>{startDate || 'YYYY-MM-DD'}</Text>
                <Calendar size={16} color={TH.sub} />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FONT_LABEL, color: TH.sub, marginBottom: 4 }}>{T('planEndDate')} *</Text>
              <TouchableOpacity
                onPress={() => setDatePicker({ field: 'planEnd', value: endDate, min: startDate || undefined })}
                style={[inputStyle, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderColor: errors.endDate ? COLORS.RED : TH.border }]}
              >
                <Text style={{ fontSize: FONT_BODY, color: endDate ? TH.text : TH.sub }}>{endDate || 'YYYY-MM-DD'}</Text>
                <Calendar size={16} color={TH.sub} />
              </TouchableOpacity>
            </View>
          </View>
          {errors.endDate ? <Text style={{ fontSize: FONT_ERROR, color: COLORS.RED, marginTop: 4 }}>{errors.endDate}</Text> : null}
        </Card>

        {/* Items */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8 }}>
          <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>{T('planItems')}</Text>
          <TouchableOpacity onPress={addItem} style={{ backgroundColor: P, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ color: '#fff', fontSize: FONT_SUB, fontWeight: '600' }}>+ {T('planAddItem')}</Text>
          </TouchableOpacity>
        </View>

        {items.length === 0 && (
          <Card style={{ alignItems: 'center', padding: 24 }}>
            <Text style={{ color: TH.sub, fontSize: FONT_SUB }}>{T('planNoItems')}</Text>
          </Card>
        )}

        {items.map((item, idx) => {
          const isExpanded = expandedItems.has(item.id);
          return (
            <Card key={item.id} style={{ padding: 0, overflow: 'hidden' }}>
              {/* Header */}
              <TouchableOpacity
                onPress={() => toggleItem(item.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 }}
              >
                {isExpanded ? <ChevronDown size={16} color={TH.sub} /> : <ChevronRight size={16} color={TH.sub} />}
                <Text style={{ flex: 1, fontSize: FONT_SUB, fontWeight: '600', color: TH.text }} numberOfLines={1}>
                  {item.name || `${T('planItemName')} ${idx + 1}`}
                </Text>
                <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>
                  {item.link === 'manual' ? T('planLinkManual') : T(`planLink${item.link.charAt(0).toUpperCase() + item.link.slice(1)}`)}
                </Text>
              </TouchableOpacity>

              {/* Expanded content */}
              {isExpanded && (
                <View style={{ paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: TH.border }}>
                  <Text style={{ fontSize: FONT_LABEL, color: TH.sub, marginBottom: 4, marginTop: 10 }}>{T('planItemName')} *</Text>
                  <TextInput
                    value={item.name} onChangeText={v => updateItem(item.id, { name: v })}
                    placeholder={T('planItemName')} placeholderTextColor={TH.sub}
                    style={[inputStyle, { marginBottom: 4, borderColor: errors[`item_${idx}_name`] ? COLORS.RED : TH.border }]}
                  />
                  {errors[`item_${idx}_name`] ? <Text style={{ fontSize: FONT_BADGE, color: COLORS.RED, marginBottom: 6 }}>{errors[`item_${idx}_name`]}</Text> : null}

                  <Text style={{ fontSize: FONT_LABEL, color: TH.sub, marginBottom: 4 }}>{T('planItemDesc')}</Text>
                  <TextInput
                    value={item.description} onChangeText={v => updateItem(item.id, { description: v })}
                    placeholder={T('planItemDesc')} placeholderTextColor={TH.sub} multiline
                    style={[inputStyle, { minHeight: 40, textAlignVertical: 'top', marginBottom: 8 }]}
                  />

                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: FONT_LABEL, color: TH.sub, marginBottom: 4 }}>{T('planItemStart')} *</Text>
                      <TouchableOpacity
                        onPress={() => setDatePicker({ field: `itemStart_${item.id}`, value: item.startDate, min: startDate || undefined, max: endDate || undefined })}
                        style={[inputStyle, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderColor: errors[`item_${idx}_startDate`] ? COLORS.RED : TH.border }]}
                      >
                        <Text style={{ fontSize: FONT_BODY, color: item.startDate ? TH.text : TH.sub }}>{item.startDate || 'YYYY-MM-DD'}</Text>
                        <Calendar size={14} color={TH.sub} />
                      </TouchableOpacity>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: FONT_LABEL, color: TH.sub, marginBottom: 4 }}>{T('planItemEnd')} *</Text>
                      <TouchableOpacity
                        onPress={() => setDatePicker({ field: `itemEnd_${item.id}`, value: item.endDate, min: item.startDate || startDate || undefined, max: endDate || undefined })}
                        style={[inputStyle, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderColor: errors[`item_${idx}_endDate`] ? COLORS.RED : TH.border }]}
                      >
                        <Text style={{ fontSize: FONT_BODY, color: item.endDate ? TH.text : TH.sub }}>{item.endDate || 'YYYY-MM-DD'}</Text>
                        <Calendar size={14} color={TH.sub} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  {(errors[`item_${idx}_startDate`] || errors[`item_${idx}_endDate`]) ? (
                    <Text style={{ fontSize: FONT_BADGE, color: COLORS.RED, marginBottom: 6 }}>
                      {errors[`item_${idx}_startDate`] || errors[`item_${idx}_endDate`]}
                    </Text>
                  ) : null}

                  <Text style={{ fontSize: FONT_LABEL, color: TH.sub, marginBottom: 4 }}>{T('planItemContent')}</Text>
                  <TextInput
                    value={item.contentUrl} onChangeText={v => updateItem(item.id, { contentUrl: v })}
                    placeholder="https://..." placeholderTextColor={TH.sub}
                    style={[inputStyle, { marginBottom: 8 }]}
                  />

                  <Text style={{ fontSize: FONT_LABEL, color: TH.sub, marginBottom: 4 }}>{T('planItemLink')}</Text>
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
                        <Text style={{ color: item.link === opt.value ? '#fff' : TH.sub, fontSize: FONT_SUB, fontWeight: item.link === opt.value ? '600' : '400' }}>
                          {T(opt.labelKey)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <TouchableOpacity
                    onPress={() => removeItem(item.id)}
                    style={{ paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: `${COLORS.RED}40`, alignItems: 'center' }}
                  >
                    <Text style={{ color: COLORS.RED, fontSize: FONT_SUB }}>{T('planDeleteItem')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Card>
          );
        })}
      </ScrollView>

      {/* Save button */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 32, backgroundColor: TH.bg }}>
        <PrimaryButton label={T('planSave')} onPress={handleSave} />
      </View>

      {/* Date Picker Modal */}
      {datePicker && (
        <DatePickerModal
          visible
          value={datePicker.value || dateStr()}
          minDate={datePicker.min}
          maxDate={datePicker.max}
          onClose={() => setDatePicker(null)}
          onConfirm={(date) => {
            const { field } = datePicker;
            if (field === 'planStart') setStartDate(date);
            else if (field === 'planEnd') setEndDate(date);
            else if (field.startsWith('itemStart_')) updateItem(field.slice(11), { startDate: date });
            else if (field.startsWith('itemEnd_')) updateItem(field.slice(9), { endDate: date });
            setDatePicker(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}
