import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Alert,
  PanResponder, GestureResponderEvent, PanResponderGestureState,
} from 'react-native';
import { useAppStore } from '../store/useAppStore';
import {
  COLORS, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BUTTON,
} from '@egoless-do/core';
import {
  ChevronLeft, ChevronUp, ChevronDown,
  Check, X, Pencil, Trash2,
} from 'lucide-react-native';
import { useTheme, useT } from './UI';

const ROW_HEIGHT = 48;

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

  onBack: () => void;
}

function useDragReorder(
  orderedItems: string[],
  onReorder: (from: number, to: number) => void,
) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const dragStartIdx = useRef(0);
  const gestureStartY = useRef(0);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_: GestureResponderEvent, g: PanResponderGestureState) => {
      if (!draggedId) return false;
      return Math.abs(g.dy) > 5;
    },
    onPanResponderGrant: () => {},
    onPanResponderMove: (_: GestureResponderEvent, g: PanResponderGestureState) => {
      if (!draggedId) return;
      const currentIdx = orderedItems.indexOf(draggedId);
      if (currentIdx < 0) return;
      const offset = Math.round((gestureStartY.current + g.dy) / ROW_HEIGHT);
      const target = Math.max(0, Math.min(orderedItems.length - 1, dragStartIdx.current + offset));
      if (target !== currentIdx) {
        onReorder(currentIdx, target);
      }
    },
    onPanResponderRelease: () => { setDraggedId(null); },
    onPanResponderTerminate: () => { setDraggedId(null); },
  }), [draggedId, orderedItems, onReorder]);

  const onDragStart = useCallback((id: string) => {
    setDraggedId(id);
    dragStartIdx.current = orderedItems.indexOf(id);
    gestureStartY.current = 0;
  }, [orderedItems]);

  return { draggedId, panResponder, onDragStart };
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

  const getFrequency = useCallback((item: string) => {
    if (!sortByFreq) return 0;
    return props.getReflectionsContainingItem(item);
  }, [sortByFreq, props.getReflectionsContainingItem]);

  const hasFrequency = useMemo(() => {
    if (!sortByFreq) return false;
    return props.sections.some(s => s.items.some(i => getFrequency(i) > 0));
  }, [sortByFreq, props.sections, getFrequency]);

  const handleReorder = useCallback((from: number, to: number) => {
    props.reorderItem(from, to, allOrderedItems);
  }, [props, allOrderedItems]);

  const { draggedId, panResponder, onDragStart } = useDragReorder(allOrderedItems, handleReorder);

  const inputWords = input.trim().split(/\s+/).filter(Boolean);
  const isTooManyWords = inputWords.length > 4;
  const isMaxItems = props.customItems.length >= 10;
  const inputHasError = isTooManyWords || isMaxItems;

  const handleAdd = () => {
    if (!input.trim()) return;
    const fmt = props.formatInput ? props.formatInput(input.trim()) : input.trim();
    const err = props.validateInput ? props.validateInput(input) : null;
    if (err) { alert(err); return; }
    props.addItem(fmt);
    setInput('');
  };

  const handleUpdate = () => {
    if (editing && editing.new.trim()) {
      const fmt = props.formatInput ? props.formatInput(editing.new.trim()) : editing.new.trim();
      const err = props.validateInput ? props.validateInput(editing.new) : null;
      if (err) { alert(err); return; }
      props.updateItem(editing.old, fmt);
      setEditing(null);
    }
  };

  const handleDelete = (item: string) => {
    const usedCount = props.getReflectionsContainingItem(item);
    const message = usedCount > 0
      ? `${T(props.deleteConfirmKey)} ${T(props.usedByKey).replace('{count}', String(usedCount))}`
      : T(props.deleteConfirmKey);
    Alert.alert(T(props.deleteTitleKey), message, [
      { text: T('cancel'), style: 'cancel' },
      { text: T('confirm'), style: 'destructive', onPress: () => props.removeItem(item) },
    ]);
  };

  const sectionHeader = (title: string) => (
    <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginTop:12, marginBottom:8 }}>
      <View style={{ flex:1, height:1, backgroundColor:TH.border }} />
      <Text style={{ fontSize:FONT_SUB, color:TH.sub, fontWeight:'600' }}>{title}</Text>
      <View style={{ flex:1, height:1, backgroundColor:TH.border }} />
    </View>
  );

  const renderRow = (item: string, isPreset: boolean, isReadonly: boolean) => {
    const fullIdx = allOrderedItems.indexOf(item);
    const isDragging = draggedId === item;
    const freq = sortByFreq ? props.getReflectionsContainingItem(item) : 0;
    return (
      <View key={item} {...panResponder.panHandlers}
        style={{
          flexDirection:'row', justifyContent:'space-between', alignItems:'center',
          paddingVertical:8, borderBottomWidth:1, borderBottomColor:TH.border,
          borderLeftWidth: isDragging ? 3 : 0, borderLeftColor: P,
          backgroundColor: isDragging ? `${P}10` : 'transparent',
          minHeight: ROW_HEIGHT,
        }}>
        {editing?.old === item ? (
          <View style={{ flexDirection:'row', gap:8, flex:1 }}>
            <TextInput value={editing.new} onChangeText={(v) => setEditing({ ...editing, new: v })}
              style={{ flex:1, padding:6, borderRadius:4, borderWidth:1, borderColor:TH.border, backgroundColor:TH.card, color:TH.text, fontSize:FONT_BODY }} />
            <TouchableOpacity onPress={handleUpdate} style={{ padding:6, borderRadius:4, backgroundColor:COLORS.GREEN }}>
              <Check size={14} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditing(null)} style={{ padding:6, borderRadius:4, backgroundColor:COLORS.RED }}>
              <X size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={{ flexDirection:'row', alignItems:'center', flex:1, gap:6 }}>
              <Text style={{ color:TH.text, fontSize:FONT_SUB }}>{item}</Text>
              {sortByFreq && freq > 0 && (
                <View style={{ backgroundColor:`${P}20`, paddingHorizontal:6, paddingVertical:2, borderRadius:8 }}>
                  <Text style={{ color:P, fontSize:10, fontWeight:'600' }}>{freq}</Text>
                </View>
              )}
              {isPreset && props.presetLabelKey && <Text style={{ color:TH.sub, fontSize:10 }}>{T(props.presetLabelKey)}</Text>}
              {isReadonly && props.readonlyLabelKey && <Text style={{ color:TH.sub, fontSize:10 }}>{T(props.readonlyLabelKey)}</Text>}
            </View>
            {!sortByFreq && (
              <View style={{ flexDirection:'row', gap:4, alignItems:'center' }}>
                <TouchableOpacity
                  delayLongPress={300}
                  onLongPress={() => onDragStart(item)}
                  onPress={() => props.reorderItem(fullIdx, fullIdx - 1, allOrderedItems)}
                  disabled={fullIdx === 0}
                  style={{ padding:8, minWidth:32, minHeight:32, alignItems:'center', justifyContent:'center' }}>
                  <ChevronUp size={16} color={fullIdx === 0 ? TH.border : P} />
                </TouchableOpacity>
                <TouchableOpacity
                  delayLongPress={300}
                  onLongPress={() => onDragStart(item)}
                  onPress={() => props.reorderItem(fullIdx, fullIdx + 1, allOrderedItems)}
                  disabled={fullIdx === allOrderedItems.length - 1}
                  style={{ padding:8, minWidth:32, minHeight:32, alignItems:'center', justifyContent:'center' }}>
                  <ChevronDown size={16} color={fullIdx === allOrderedItems.length - 1 ? TH.border : P} />
                </TouchableOpacity>
                {!isReadonly && (
                  <>
                    <TouchableOpacity onPress={() => setEditing({ old: item, new: item })} style={{ padding:8, minWidth:32, minHeight:32, alignItems:'center', justifyContent:'center' }}>
                      <Pencil size={14} color={P} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item)} style={{ padding:8, minWidth:44, minHeight:44, alignItems:'center', justifyContent:'center' }}>
                      <Trash2 size={14} color={COLORS.RED} />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </>
        )}
      </View>
    );
  };

  const sortedSections = useMemo(() => {
    if (!sortByFreq) return props.sections;
    return props.sections.map(s => ({
      ...s,
      items: [...s.items].sort((a, b) => props.getReflectionsContainingItem(b) - props.getReflectionsContainingItem(a)),
    }));
  }, [props.sections, sortByFreq, props.getReflectionsContainingItem]);

  return (
    <ScrollView scrollEnabled={!draggedId} keyboardShouldPersistTaps="handled">
      <View>
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <Text style={{ fontWeight:'700', fontSize:FONT_TITLE, color:TH.text }}>{T(props.titleKey)}</Text>
          <TouchableOpacity onPress={props.onBack} style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
            <ChevronLeft size={20} color={TH.sub} />
            <Text style={{ color:TH.sub, fontSize:FONT_BODY }}>{T(props.backLabelKey)}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection:'row', gap:8, marginBottom:8 }}>
          <TextInput value={input} onChangeText={setInput} placeholder={T(props.inputPlaceholderKey)}
            placeholderTextColor={TH.sub}
            onSubmitEditing={handleAdd}
            style={{ flex:1, padding:10, borderRadius:8, borderWidth:1, borderColor: inputHasError ? COLORS.RED : TH.border, backgroundColor:TH.card, color:TH.text, fontSize:FONT_BODY }} />
          <TouchableOpacity onPress={handleAdd}
            style={{ paddingHorizontal:16, paddingVertical:10, borderRadius:8, backgroundColor:P }}>
            <Text style={{ color:'#fff', fontSize:FONT_BUTTON }}>{T('add')}</Text>
          </TouchableOpacity>
        </View>
        {inputHasError && (
          <Text style={{ color:COLORS.RED, fontSize:FONT_SUB, marginBottom:16 }}>
            {isTooManyWords ? T(props.tooLongKey) : T(props.maxReachedKey)}
          </Text>
        )}

        <TouchableOpacity
          onPress={() => setSortByFreq(v => !v)}
          style={{ flexDirection:'row', alignItems:'center', gap:4, marginBottom:8 }}
        >
          <Text style={{ color: sortByFreq ? P : TH.sub, fontSize:FONT_SUB }}>
            {T(sortByFreq ? 'sortByFreqOn' : 'sortByFreqOff')}
          </Text>
        </TouchableOpacity>

        {sortedSections.map(section => (
          section.items.length > 0 && (
            <React.Fragment key={section.titleKey}>
              {sectionHeader(T(section.titleKey))}
              {section.items.map(item => renderRow(item, section.isPreset ?? false, section.isReadonly ?? false))}
            </React.Fragment>
          )
        ))}
      </View>
    </ScrollView>
  );
}
