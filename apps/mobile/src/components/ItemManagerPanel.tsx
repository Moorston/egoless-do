import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Alert,
  StyleSheet,
} from 'react-native';
import { FlatList, Swipeable } from 'react-native-gesture-handler';
import { useAppStore } from '../store/useAppStore';
import {
  COLORS, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BUTTON,
} from '@egoless-do/core';
import {
  ChevronLeft, Check, X, Pencil, Trash2, Eye, EyeOff,
} from 'lucide-react-native';
import { useTheme, useT } from './UI';

const ROW_HEIGHT = 56;

export interface ManagerSection {
  titleKey: string;
  items: string[];
  isPreset?: boolean;
  isReadonly?: boolean;
}

export interface ItemManagerPanelProps {
  titleKey: string;
  backLabelKey: string;
  inputPlaceholderKey: string;
  tooLongKey: string;
  maxReachedKey: string;
  deleteConfirmKey: string;
  usedByKey: string;
  deleteTitleKey: string;
  presetLabelKey?: string;
  readonlyLabelKey?: string;

  sections: ManagerSection[];

  addItem: (item: string) => void;
  updateItem: (oldItem: string, newItem: string) => void;
  removeItem: (item: string) => void;
  reorderItem: (from: number, to: number, orderedItems: string[]) => void;
  getReflectionsContainingItem: (item: string) => number;

  customItems: string[];
  formatInput?: (input: string) => string;
  validateInput?: (input: string) => string | null;

  // Hidden items support
  hiddenItems?: string[];
  onToggleHidden?: (item: string) => void;

  onBack: () => void;
}

export default function ItemManagerPanel(props: ItemManagerPanelProps) {
  const TH = useTheme();
  const P = TH.primary;
  const T = useT();

  const [input, setInput] = useState('');
  const [editing, setEditing] = useState<{ old: string; new: string } | null>(null);
  const [sortByFreq, setSortByFreq] = useState(false);

  const allOrderedItems = useMemo(() => {
    const set = new Set<string>();
    props.sections.forEach(s => s.items.forEach(i => set.add(i)));
    return Array.from(set);
  }, [props.sections]);

  const inputWords = input.trim().split(/\s+/).filter(Boolean);
  const isTooManyWords = inputWords.length > 4;
  const isMaxItems = props.customItems.length >= 10;
  const inputHasError = isTooManyWords || isMaxItems;

  const handleAdd = useCallback(() => {
    if (!input.trim()) return;
    const fmt = props.formatInput ? props.formatInput(input.trim()) : input.trim();
    const err = props.validateInput ? props.validateInput(fmt) : null;
    if (err) { Alert.alert(err); return; }
    props.addItem(fmt);
    setInput('');
  }, [input, props.formatInput, props.validateInput, props.addItem]);

  const handleUpdate = useCallback(() => {
    if (editing && editing.new.trim()) {
      const fmt = props.formatInput ? props.formatInput(editing.new.trim()) : editing.new.trim();
      const err = props.validateInput ? props.validateInput(fmt) : null;
      if (err) { Alert.alert(err); return; }
      props.updateItem(editing.old, fmt);
      setEditing(null);
    }
  }, [editing, props]);

  const handleDelete = useCallback((item: string) => {
    const usedCount = props.getReflectionsContainingItem(item);
    if (usedCount > 0) {
      Alert.alert(T(props.deleteTitleKey), T(props.usedByKey).replace('{count}', String(usedCount)), [
        { text: T('confirm'), style: 'cancel' },
      ]);
      return;
    }
    Alert.alert(T(props.deleteTitleKey), T(props.deleteConfirmKey), [
      { text: T('cancel'), style: 'cancel' },
      { text: T('confirm'), style: 'destructive', onPress: () => props.removeItem(item) },
    ]);
  }, [props, T]);

  const sortedSections = useMemo(() => {
    if (!sortByFreq) return props.sections;
    return props.sections.map(s => ({
      ...s,
      items: [...s.items].sort((a, b) => props.getReflectionsContainingItem(b) - props.getReflectionsContainingItem(a)),
    }));
  }, [props.sections, sortByFreq, props.getReflectionsContainingItem]);

  // Flatten all items for FlatList
  const flatData = useMemo(() => {
    const items: { item: string; section: ManagerSection }[] = [];
    sortedSections.forEach(section => {
      section.items.forEach(item => {
        items.push({ item, section });
      });
    });
    return items;
  }, [sortedSections]);

  const renderRightActions = useCallback((progress: any, dragX: any, item: string) => {
    const usedCount = props.getReflectionsContainingItem(item);
    if (usedCount > 0) {
      return null;
    }
    return (
      <TouchableOpacity
        style={[styles.deleteAction, { backgroundColor: COLORS.RED }]}
        onPress={() => handleDelete(item)}
      >
        <Trash2 size={20} color="#fff" />
      </TouchableOpacity>
    );
  }, [handleDelete, props]);

  const renderItem = useCallback(({ item: itemName, section }: { item: string; section: ManagerSection }) => {
    const isHidden = props.hiddenItems?.includes(itemName) ?? false;

    if (editing?.old === itemName) {
      return (
        <View style={[styles.row, { backgroundColor: TH.card }]}>
          <View style={styles.editRow}>
            <TextInput
              value={editing.new}
              onChangeText={(v) => setEditing({ ...editing, new: v })}
              style={[styles.editInput, { borderColor: TH.border, backgroundColor: TH.bg, color: TH.text }]}
              autoFocus
            />
            <TouchableOpacity onPress={handleUpdate} style={[styles.editButton, { backgroundColor: P }]}>
              <Check size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditing(null)} style={[styles.editButton, { backgroundColor: COLORS.RED }]}>
              <X size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <Swipeable
        renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, itemName)}
        overshootRight={false}
      >
        <View style={[styles.row, { backgroundColor: TH.card, borderBottomColor: TH.border }]}>
          <View style={styles.rowContent}>
            <View style={styles.rowLeft}>
              <Text style={[styles.itemName, { color: isHidden ? TH.sub : TH.text }]} numberOfLines={1}>
                {itemName}
              </Text>
              {sortByFreq && (
                <View style={[styles.freqBadge, { backgroundColor: `${P}20` }]}>
                  <Text style={[styles.freqText, { color: P }]}>
                    {props.getReflectionsContainingItem(itemName)}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.rowRight}>
              {props.onToggleHidden && (
                <TouchableOpacity
                  onPress={() => props.onToggleHidden!(itemName)}
                  style={styles.actionButton}
                >
                  {isHidden ? <EyeOff size={18} color={TH.sub} /> : <Eye size={18} color={P} />}
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setEditing({ old: itemName, new: itemName })}
                style={styles.actionButton}
              >
                <Pencil size={18} color={P} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Swipeable>
    );
  }, [editing, TH, P, sortByFreq, props, handleUpdate, renderRightActions]);

  const keyExtractor = useCallback((item: { item: string; section: ManagerSection }) => item.item, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: TH.border }]}>
        <Text style={[styles.headerTitle, { color: TH.text }]}>{T(props.titleKey)}</Text>
        <TouchableOpacity onPress={props.onBack} style={styles.backButton}>
          <ChevronLeft size={24} color={TH.sub} />
          <Text style={[styles.backText, { color: TH.sub }]}>{T(props.backLabelKey)}</Text>
        </TouchableOpacity>
      </View>

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={T(props.inputPlaceholderKey)}
          placeholderTextColor={TH.sub}
          onSubmitEditing={handleAdd}
          style={[styles.input, { borderColor: inputHasError ? COLORS.RED : TH.border, backgroundColor: TH.card, color: TH.text }]}
        />
        <TouchableOpacity onPress={handleAdd} style={[styles.addButton, { backgroundColor: P }]}>
          <Text style={styles.addButtonText}>{T('add')}</Text>
        </TouchableOpacity>
      </View>
      {inputHasError && (
        <Text style={[styles.errorText, { color: COLORS.RED }]}>
          {isTooManyWords ? T(props.tooLongKey) : T(props.maxReachedKey)}
        </Text>
      )}

      {/* Sort toggle */}
      <TouchableOpacity
        onPress={() => setSortByFreq(v => !v)}
        style={styles.sortToggle}
      >
        <Text style={[styles.sortText, { color: sortByFreq ? P : TH.sub }]}>
          {T(sortByFreq ? 'sortByFreqOn' : 'sortByFreqOff')}
        </Text>
      </TouchableOpacity>

      {/* List */}
      <FlatList
        data={flatData}
        renderItem={({ item }) => renderItem(item)}
        keyExtractor={keyExtractor}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Bottom back button */}
      <TouchableOpacity
        onPress={props.onBack}
        style={[styles.bottomBackButton, { backgroundColor: TH.card, borderColor: TH.border }]}
      >
        <ChevronLeft size={20} color={TH.sub} />
        <Text style={[styles.bottomBackText, { color: TH.sub }]}>{T(props.backLabelKey)}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontWeight: '700',
    fontSize: FONT_TITLE,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'flex-end',
  },
  backText: {
    fontSize: FONT_TITLE,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: FONT_BODY,
    minHeight: 44,
  },
  addButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: FONT_BUTTON,
    fontWeight: '600',
  },
  errorText: {
    fontSize: FONT_SUB,
    marginBottom: 12,
  },
  sortToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
    minHeight: 44,
  },
  sortText: {
    fontSize: FONT_SUB,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
  },
  row: {
    minHeight: ROW_HEIGHT,
    borderBottomWidth: 1,
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  rowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemName: {
    fontSize: FONT_BODY,
    flex: 1,
  },
  freqBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  freqText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  editInput: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: FONT_BODY,
    minHeight: 44,
  },
  editButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    minHeight: ROW_HEIGHT,
  },
  bottomBackButton: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    marginTop: 16,
    marginBottom: 16,
  },
  bottomBackText: {
    fontSize: FONT_BUTTON,
    fontWeight: '600',
  },
});
