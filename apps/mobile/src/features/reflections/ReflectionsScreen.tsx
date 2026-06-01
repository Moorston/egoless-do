import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  KeyboardAvoidingView, Platform, TextInput, Linking, Alert,
  PanResponder, GestureResponderEvent, PanResponderGestureState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../store/useAppStore';
import {
  useTheme, ScreenHeader, TagPill, PrimaryButton, OutlineButton,
  ThemedInput, useT,
} from '../../components/UI';
import { MIND_COLORS, TAGS_PRESET, MOODS, COLORS, ensureOrderContains, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BUTTON, FONT_STAT_CARD, FONT_CLOSE, FONT_BADGE, FONT_LABEL, FONT_EMPTY } from '@egoless-do/core';
import {
  Link, Pin, Settings, Pencil, Trash2, Check, X, ChevronLeft, ChevronUp, ChevronDown, Eye, EyeOff, AlertCircle,
} from 'lucide-react-native';

// ── TagManagerPanel ──────────────────────────────────────────────
const ROW_HEIGHT = 48;

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
    const idx = orderedItems.indexOf(id);
    setDraggedId(id);
    dragStartIdx.current = idx;
    gestureStartY.current = 0;
  }, [orderedItems]);

  return { draggedId, panResponder, onDragStart };
}

function TagManagerPanel({ onBack }: { onBack: () => void }) {
  const TH = useTheme();
  const P = TH.primary;
  const store = useAppStore();
  const T = useT();

  const [newTag, setNewTag] = useState('');
  const [editingTag, setEditingTag] = useState<{ old: string; new: string } | null>(null);

  const habitTags = useMemo(() =>
    (store.habits ?? []).filter(h => h.createTag).map(h => `#${h.name}`),
    [store.habits]
  );

  const orderedManagerTags = useMemo(() => {
    const required = [...TAGS_PRESET, ...(store.customTags ?? []), ...habitTags];
    const order = store.allTagsOrder ?? [];
    return order.length > 0 ? ensureOrderContains(order, required) : required;
  }, [store.allTagsOrder, store.customTags, habitTags]);

  const handleReorder = useCallback((from: number, to: number) => {
    store.reorderAllTag(from, to);
  }, [store]);

  const { draggedId, panResponder, onDragStart } = useDragReorder(orderedManagerTags, handleReorder);

  const presetTags = useMemo(() => orderedManagerTags.filter(t => TAGS_PRESET.includes(t)), [orderedManagerTags]);
  const customTagsList = useMemo(() => orderedManagerTags.filter(t => (store.customTags ?? []).includes(t)), [orderedManagerTags, store.customTags]);
  const habitTagsFiltered = useMemo(() => orderedManagerTags.filter(t => habitTags.includes(t)), [orderedManagerTags, habitTags]);

  // Validation
  const newTagWords = newTag.replace('#', '').trim().split(/\s+/).filter(Boolean);
  const isTooManyWords = newTagWords.length > 4;
  const isMaxTags = (store.customTags ?? []).length >= 10;
  const inputHasError = isTooManyWords || isMaxTags;

  const handleAddTag = () => {
    if (newTag.trim()) {
      const tag = newTag.startsWith('#') ? newTag : `#${newTag}`;
      const words = tag.replace('#', '').trim().split(/\s+/);
      if (words.length > 4) { alert(T('tagTooLong')); return; }
      if ((store.customTags ?? []).length >= 10) { alert(T('maxTagsReached')); return; }
      store.addCustomTag(tag);
      setNewTag('');
    }
  };

  const handleUpdateTag = () => {
    if (editingTag && editingTag.new.trim()) {
      const newTagValue = editingTag.new.startsWith('#') ? editingTag.new : `#${editingTag.new}`;
      const words = newTagValue.replace('#', '').trim().split(/\s+/);
      if (words.length > 4) { alert(T('tagTooLong')); return; }
      store.updateCustomTag(editingTag.old, newTagValue);
      setEditingTag(null);
    }
  };

  const handleDeleteTag = (tag: string) => {
    const usedCount = (store.reflections ?? []).filter(r => r.tags.includes(tag)).length;
    const message = usedCount > 0
      ? `${T('tagDeleteConfirm')} ${T('tagUsedBy').replace('{count}', String(usedCount))}`
      : T('tagDeleteConfirm');
    Alert.alert(T('tagDelete'), message, [
      { text: T('cancel'), style: 'cancel' },
      { text: T('confirm'), style: 'destructive', onPress: () => store.removeCustomTag(tag) },
    ]);
  };

  const sectionHeader = (title: string) => (
    <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginTop:12, marginBottom:8 }}>
      <View style={{ flex:1, height:1, backgroundColor:TH.border }} />
      <Text style={{ fontSize:FONT_SUB, color:TH.sub, fontWeight:'600' }}>{title}</Text>
      <View style={{ flex:1, height:1, backgroundColor:TH.border }} />
    </View>
  );

  const renderTagRow = (tag: string, isPreset: boolean, isHabit: boolean, canEditDelete: boolean) => {
    const fullIdx = orderedManagerTags.indexOf(tag);
    const isDragging = draggedId === tag;
    return (
      <View key={tag} {...panResponder.panHandlers}
        style={{
          flexDirection:'row', justifyContent:'space-between', alignItems:'center',
          paddingVertical:8, borderBottomWidth:1, borderBottomColor:TH.border,
          borderLeftWidth: isDragging ? 3 : 0, borderLeftColor: P,
          backgroundColor: isDragging ? `${P}10` : 'transparent',
          minHeight: ROW_HEIGHT,
        }}>
        {editingTag?.old === tag ? (
          <View style={{ flexDirection:'row', gap:8, flex:1 }}>
            <TextInput value={editingTag.new} onChangeText={(v) => setEditingTag({ ...editingTag, new: v })}
              style={{ flex:1, padding:6, borderRadius:4, borderWidth:1, borderColor:TH.border, backgroundColor:TH.card, color:TH.text, fontSize:FONT_BODY }} />
            <TouchableOpacity onPress={handleUpdateTag} style={{ padding:6, borderRadius:4, backgroundColor:COLORS.GREEN }}>
              <Check size={14} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditingTag(null)} style={{ padding:6, borderRadius:4, backgroundColor:COLORS.RED }}>
              <X size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={{ flexDirection:'row', alignItems:'center', flex:1, gap:6 }}>
              <Text style={{ color:TH.text, fontSize:FONT_SUB }}>{tag}</Text>
              {isPreset && <Text style={{ color:TH.sub, fontSize:FONT_BADGE }}>{T('preset')}</Text>}
              {isHabit && <Text style={{ color:TH.sub, fontSize:FONT_BADGE }}>{T('habitTag')}</Text>}
            </View>
            <View style={{ flexDirection:'row', gap:4, alignItems:'center' }}>
              <TouchableOpacity
                delayLongPress={300}
                onLongPress={() => onDragStart(tag)}
                onPress={() => store.reorderAllTag(fullIdx, fullIdx - 1)}
                disabled={fullIdx === 0}
                style={{ padding:8, minWidth:32, minHeight:32, alignItems:'center', justifyContent:'center' }}>
                <ChevronUp size={16} color={fullIdx === 0 ? TH.border : P} />
              </TouchableOpacity>
              <TouchableOpacity
                delayLongPress={300}
                onLongPress={() => onDragStart(tag)}
                onPress={() => store.reorderAllTag(fullIdx, fullIdx + 1)}
                disabled={fullIdx === orderedManagerTags.length - 1}
                style={{ padding:8, minWidth:32, minHeight:32, alignItems:'center', justifyContent:'center' }}>
                <ChevronDown size={16} color={fullIdx === orderedManagerTags.length - 1 ? TH.border : P} />
              </TouchableOpacity>
              {canEditDelete && (
                <>
                  <TouchableOpacity onPress={() => setEditingTag({ old: tag, new: tag })} style={{ padding:8, minWidth:32, minHeight:32, alignItems:'center', justifyContent:'center' }}>
                    <Pencil size={14} color={P} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteTag(tag)} style={{ padding:8, minWidth:44, minHeight:44, alignItems:'center', justifyContent:'center' }}>
                    <Trash2 size={14} color={COLORS.RED} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        )}
      </View>
    );
  };

  return (
    <ScrollView scrollEnabled={!draggedId} keyboardShouldPersistTaps="handled">
      <View>
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <Text style={{ fontWeight:'700', fontSize:FONT_TITLE, color:TH.text }}>{T('tagManager')}</Text>
          <TouchableOpacity onPress={onBack} style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
            <ChevronLeft size={20} color={TH.sub} />
            <Text style={{ color:TH.sub, fontSize:FONT_BODY }}>{T('reflBack')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection:'row', gap:8, marginBottom:8 }}>
          <TextInput value={newTag} onChangeText={setNewTag} placeholder={T('newTagPlaceholder')}
            placeholderTextColor={TH.sub}
            style={{ flex:1, padding:10, borderRadius:8, borderWidth:1, borderColor: inputHasError ? COLORS.RED : TH.border, backgroundColor:TH.card, color:TH.text, fontSize:FONT_BODY }} />
          <TouchableOpacity onPress={handleAddTag}
            style={{ paddingHorizontal:16, paddingVertical:10, borderRadius:8, backgroundColor:P }}>
            <Text style={{ color:'#fff', fontSize:FONT_BUTTON }}>{T('add')}</Text>
          </TouchableOpacity>
        </View>
        {inputHasError && (
          <Text style={{ color:COLORS.RED, fontSize:FONT_SUB, marginBottom:16 }}>
            {isTooManyWords ? T('tagTooLong') : T('maxTagsReached')}
          </Text>
        )}

        {presetTags.length > 0 && (
          <>
            {sectionHeader(T('tagSectionPreset'))}
            {presetTags.map(tag => renderTagRow(tag, true, false, false))}
          </>
        )}

        {customTagsList.length > 0 && (
          <>
            {sectionHeader(T('tagSectionCustom'))}
            {customTagsList.map(tag => renderTagRow(tag, false, false, true))}
          </>
        )}

        {habitTagsFiltered.length > 0 && (
          <>
            {sectionHeader(T('tagSectionHabit'))}
            {habitTagsFiltered.map(tag => renderTagRow(tag, false, true, false))}
          </>
        )}
      </View>
    </ScrollView>
  );
}

// ── MoodManagerPanel ─────────────────────────────────────────────
function MoodManagerPanel({ onBack }: { onBack: () => void }) {
  const TH = useTheme();
  const P = TH.primary;
  const store = useAppStore();
  const T = useT();

  const [newMood, setNewMood] = useState('');
  const [editingMood, setEditingMood] = useState<{ old: string; new: string } | null>(null);

  const orderedManagerMoods = useMemo(() => {
    const required = [...MOODS, ...(store.customMoods ?? [])];
    const order = store.allMoodsOrder ?? [];
    return order.length > 0 ? ensureOrderContains(order, required) : required;
  }, [store.allMoodsOrder, store.customMoods]);

  const handleReorder = useCallback((from: number, to: number) => {
    store.reorderAllMood(from, to);
  }, [store]);

  const { draggedId, panResponder, onDragStart } = useDragReorder(orderedManagerMoods, handleReorder);

  const presetMoods = useMemo(() => orderedManagerMoods.filter(m => (MOODS as string[]).includes(m)), [orderedManagerMoods]);
  const customMoodsList = useMemo(() => orderedManagerMoods.filter(m => (store.customMoods ?? []).includes(m)), [orderedManagerMoods, store.customMoods]);

  // Validation
  const newMoodWords = newMood.trim().split(/\s+/).filter(Boolean);
  const isTooManyWords = newMoodWords.length > 4;
  const isMaxMoods = (store.customMoods ?? []).length >= 10;
  const inputHasError = isTooManyWords || isMaxMoods;

  const handleAddMood = () => {
    if (newMood.trim()) {
      const words = newMood.trim().split(/\s+/);
      if (words.length > 4) { alert(T('moodTooLong')); return; }
      if ((store.customMoods ?? []).length >= 10) { alert(T('maxMoodsReached')); return; }
      store.addCustomMood(newMood);
      setNewMood('');
    }
  };

  const handleUpdateMood = () => {
    if (editingMood && editingMood.new.trim()) {
      const words = editingMood.new.trim().split(/\s+/);
      if (words.length > 4) { alert(T('moodTooLong')); return; }
      store.updateCustomMood(editingMood.old, editingMood.new);
      setEditingMood(null);
    }
  };

  const handleDeleteMood = (mood: string) => {
    const usedCount = (store.reflections ?? []).filter(r => r.mood === mood).length;
    const message = usedCount > 0
      ? `${T('moodDeleteConfirm')} ${T('moodUsedBy').replace('{count}', String(usedCount))}`
      : T('moodDeleteConfirm');
    Alert.alert(T('moodDelete'), message, [
      { text: T('cancel'), style: 'cancel' },
      { text: T('confirm'), style: 'destructive', onPress: () => store.removeCustomMood(mood) },
    ]);
  };

  const sectionHeader = (title: string) => (
    <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginTop:12, marginBottom:8 }}>
      <View style={{ flex:1, height:1, backgroundColor:TH.border }} />
      <Text style={{ fontSize:FONT_SUB, color:TH.sub, fontWeight:'600' }}>{title}</Text>
      <View style={{ flex:1, height:1, backgroundColor:TH.border }} />
    </View>
  );

  const renderMoodRow = (mood: string, isPreset: boolean, canEditDelete: boolean) => {
    const fullIdx = orderedManagerMoods.indexOf(mood);
    const isDragging = draggedId === mood;
    return (
      <View key={mood} {...panResponder.panHandlers}
        style={{
          flexDirection:'row', justifyContent:'space-between', alignItems:'center',
          paddingVertical:8, borderBottomWidth:1, borderBottomColor:TH.border,
          borderLeftWidth: isDragging ? 3 : 0, borderLeftColor: P,
          backgroundColor: isDragging ? `${P}10` : 'transparent',
          minHeight: ROW_HEIGHT,
        }}>
        {editingMood?.old === mood ? (
          <View style={{ flexDirection:'row', gap:8, flex:1 }}>
            <TextInput value={editingMood.new} onChangeText={(v) => setEditingMood({ ...editingMood, new: v })}
              style={{ flex:1, padding:6, borderRadius:4, borderWidth:1, borderColor:TH.border, backgroundColor:TH.card, color:TH.text, fontSize:FONT_BODY }} />
            <TouchableOpacity onPress={handleUpdateMood} style={{ padding:6, borderRadius:4, backgroundColor:COLORS.GREEN }}>
              <Check size={14} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditingMood(null)} style={{ padding:6, borderRadius:4, backgroundColor:COLORS.RED }}>
              <X size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={{ flexDirection:'row', alignItems:'center', flex:1, gap:6 }}>
              <Text style={{ color:TH.text, fontSize:FONT_SUB }}>{mood}</Text>
              {isPreset && <Text style={{ color:TH.sub, fontSize:FONT_BADGE }}>{T('preset')}</Text>}
            </View>
            <View style={{ flexDirection:'row', gap:4, alignItems:'center' }}>
              <TouchableOpacity
                delayLongPress={300}
                onLongPress={() => onDragStart(mood)}
                onPress={() => store.reorderAllMood(fullIdx, fullIdx - 1)}
                disabled={fullIdx === 0}
                style={{ padding:8, minWidth:32, minHeight:32, alignItems:'center', justifyContent:'center' }}>
                <ChevronUp size={16} color={fullIdx === 0 ? TH.border : P} />
              </TouchableOpacity>
              <TouchableOpacity
                delayLongPress={300}
                onLongPress={() => onDragStart(mood)}
                onPress={() => store.reorderAllMood(fullIdx, fullIdx + 1)}
                disabled={fullIdx === orderedManagerMoods.length - 1}
                style={{ padding:8, minWidth:32, minHeight:32, alignItems:'center', justifyContent:'center' }}>
                <ChevronDown size={16} color={fullIdx === orderedManagerMoods.length - 1 ? TH.border : P} />
              </TouchableOpacity>
              {canEditDelete && (
                <>
                  <TouchableOpacity onPress={() => setEditingMood({ old: mood, new: mood })} style={{ padding:8, minWidth:32, minHeight:32, alignItems:'center', justifyContent:'center' }}>
                    <Pencil size={14} color={P} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteMood(mood)} style={{ padding:8, minWidth:44, minHeight:44, alignItems:'center', justifyContent:'center' }}>
                    <Trash2 size={14} color={COLORS.RED} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        )}
      </View>
    );
  };

  return (
    <ScrollView scrollEnabled={!draggedId} keyboardShouldPersistTaps="handled">
      <View>
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <Text style={{ fontWeight:'700', fontSize:FONT_TITLE, color:TH.text }}>{T('moodManager')}</Text>
          <TouchableOpacity onPress={onBack} style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
            <ChevronLeft size={20} color={TH.sub} />
            <Text style={{ color:TH.sub, fontSize:FONT_BODY }}>{T('reflBack')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection:'row', gap:8, marginBottom:8 }}>
          <TextInput value={newMood} onChangeText={setNewMood} placeholder={T('newMoodPlaceholder')}
            placeholderTextColor={TH.sub}
            style={{ flex:1, padding:10, borderRadius:8, borderWidth:1, borderColor: inputHasError ? COLORS.RED : TH.border, backgroundColor:TH.card, color:TH.text, fontSize:FONT_BODY }} />
          <TouchableOpacity onPress={handleAddMood}
            style={{ paddingHorizontal:16, paddingVertical:10, borderRadius:8, backgroundColor:P }}>
            <Text style={{ color:'#fff', fontSize:FONT_BUTTON }}>{T('add')}</Text>
          </TouchableOpacity>
        </View>
        {inputHasError && (
          <Text style={{ color:COLORS.RED, fontSize:FONT_SUB, marginBottom:16 }}>
            {isTooManyWords ? T('moodTooLong') : T('maxMoodsReached')}
          </Text>
        )}

        {presetMoods.length > 0 && (
          <>
            {sectionHeader(T('moodSectionPreset'))}
            {presetMoods.map(mood => renderMoodRow(mood, true, false))}
          </>
        )}

        {customMoodsList.length > 0 && (
          <>
            {sectionHeader(T('moodSectionCustom'))}
            {customMoodsList.map(mood => renderMoodRow(mood, false, true))}
          </>
        )}
      </View>
    </ScrollView>
  );
}

// ── ReflectionsScreen ────────────────────────────────────────────
export default function ReflectionsScreen() {
  const TH    = useTheme();
  const P     = TH.primary;
  const store = useAppStore();
  const T     = useT();
  const route = useRoute<any>();
  const nav   = useNavigation<any>();

  const [filterTag, setFilterTag] = useState('');
  const [showNew, setShowNew]     = useState(false);
  const [showDeletedTags, setShowDeletedTags] = useState(false);

  useEffect(() => {
    if (route.params?.showNew) {
      setShowNew(true);
      nav.setParams({ showNew: false });
    }
  }, [route.params?.showNew]);
  const [content, setContent]     = useState('');
  const [tags, setTags]           = useState<string[]>([]);
  const [mood, setMood]           = useState('');
  const [link, setLink]           = useState('');
  const [colorIdx, setColorIdx]   = useState(0);
  const [confirmDel, setConfirmDel] = useState<string|null>(null);

  // Long press action menu state
  const [actionMenuId, setActionMenuId] = useState<string|null>(null);

  // Edit state
  const [editId, setEditId]               = useState<string|null>(null);
  const [editContent, setEditContent]     = useState('');
  const [editTags, setEditTags]           = useState<string[]>([]);
  const [editMood, setEditMood]           = useState('');
  const [editLink, setEditLink]           = useState('');
  const [editColorIdx, setEditColorIdx]   = useState(0);

  // Tag/Mood manager visibility
  const [showTagManager, setShowTagManager] = useState(false);
  const [showMoodManager, setShowMoodManager] = useState(false);

  const allTags = useMemo(() => {
    const reflTags = [...new Set((store.reflections ?? []).flatMap(r => r.tags))];
    const habitTagsList = (store.habits ?? []).filter(h => h.createTag).map(h => `#${h.name}`);
    const allAvailable = [...new Set([...reflTags, ...habitTagsList])];
    const order = store.allTagsOrder ?? [];
    if (order.length > 0) {
      const ordered = order.filter(t => allAvailable.includes(t));
      const remaining = allAvailable.filter(t => !order.includes(t));
      return [...ordered, ...remaining];
    }
    const customSet = new Set(store.customTags ?? []);
    const customInUse = (store.customTags ?? []).filter(t => allAvailable.includes(t));
    const others = allAvailable.filter(t => !customSet.has(t));
    return [...customInUse, ...others];
  }, [store.reflections, store.customTags, store.allTagsOrder, store.habits]);

  // All tags used in data (including deleted tags that still have data)
  const allUsedTags = useMemo(() => {
    const reflTags = [...new Set((store.reflections ?? []).flatMap(r => r.tags))];
    const habitTagsList = (store.habits ?? []).filter(h => h.createTag).map(h => `#${h.name}`);
    return [...new Set([...reflTags, ...habitTagsList])];
  }, [store.reflections, store.habits]);

  // Tags that are deleted but still have data
  const deletedTagsWithData = useMemo(() => {
    const availableSet = new Set(allTags);
    return allUsedTags.filter(t => !availableSet.has(t));
  }, [allTags, allUsedTags]);

  // Current visible tags in filter bar
  const visibleTags = showDeletedTags ? allUsedTags : allTags;
  const filtered = filterTag ? (store.reflections ?? []).filter(r => r.tags.includes(filterTag)) : (store.reflections ?? []);

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = { '': (store.reflections ?? []).length };
    (store.reflections ?? []).forEach(r => (r.tags ?? []).forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
    return counts;
  }, [store.reflections]);

  // Stats
  const totalCount = (store.reflections ?? []).length;
  const topTag = useMemo(() => {
    const counts: Record<string, number> = {};
    (store.reflections ?? []).forEach(r => (r.tags ?? []).forEach(t => { counts[t] = (counts[t]||0)+1; }));
    const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]);
    return sorted[0]?.[0] ?? '-';
  }, [store.reflections]);
  const streakDays = useMemo(() => {
    const dates = [...new Set((store.reflections ?? []).map(r => new Date(r.timestamp ?? 0).toISOString().slice(0,10)))].sort().reverse();
    let streak = 0;
    let current = new Date();
    for (const d of dates) {
      const expected = current.toISOString().slice(0,10);
      if (d === expected) { streak++; current.setDate(current.getDate()-1); }
      else break;
    }
    return streak;
  }, [store.reflections]);

  const byDay = useMemo(() => {
    const m: Record<string, typeof filtered> = {};
    // Sort filtered by timestamp descending (newest first)
    const sorted = [...filtered].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
    sorted.forEach(r => {
      const d = new Date(r.timestamp).toLocaleDateString('zh-CN', { month:'long', day:'numeric', weekday:'short' });
      if (!m[d]) m[d] = [];
      m[d].push(r);
    });
    return m;
  }, [filtered]);

  const habitTags = (store.habits ?? []).filter(h => h.createTag).map(h => `#${h.name}`);
  const allTagOptions = useMemo(() => {
    const required = [...TAGS_PRESET, ...(store.customTags ?? [])];
    const order = store.allTagsOrder ?? [];
    const effective = order.length > 0 ? ensureOrderContains(order, required) : required;
    return [...effective, ...habitTags];
  }, [store.allTagsOrder, store.customTags, habitTags]);
  const allMoodOptions = useMemo(() => {
    const required = [...MOODS, ...(store.customMoods ?? [])];
    const order = store.allMoodsOrder ?? [];
    return order.length > 0 ? ensureOrderContains(order, required) : required;
  }, [store.allMoodsOrder, store.customMoods]);

  const saveReflection = () => {
    if (!content.trim()) return;
    store.addReflection({ content, tags, mood, colorIdx, link: link.trim() || undefined });
    setContent(''); setTags([]); setMood(''); setLink(''); setColorIdx(0);
    setShowNew(false);
  };

  const openEdit = (r: any) => {
    setEditId(r.id);
    setEditContent(r.content || '');
    setEditTags(r.tags || []);
    setEditMood(r.mood || '');
    setEditLink(r.link || '');
    const bgIdx = MIND_COLORS.findIndex(c => c[0] === (r.colors?.[0]));
    setEditColorIdx(bgIdx >= 0 ? bgIdx : 0);
  };

  const saveEdit = () => {
    if (!editId || !editContent.trim()) return;
    const idx = Math.min(Math.max(editColorIdx, 0), MIND_COLORS.length - 1);
    store.updateReflection(editId, {
      content: editContent,
      tags: editTags,
      mood: editMood,
      link: editLink.trim() || undefined,
      colors: MIND_COLORS[idx] as unknown as readonly [string, string],
    });
    setEditId(null);
    setShowTagManager(false);
    setShowMoodManager(false);
  };

  const cancelEdit = () => {
    setEditId(null);
    setShowTagManager(false);
    setShowMoodManager(false);
  };

  const handleShare = async (r: any) => {
    try {
      const { Share } = require('react-native');
      const tagsStr = r.tags?.length ? `\n标签: ${r.tags.join(' ')}` : '';
      const moodStr = r.mood ? `\n心情: ${r.mood}` : '';
      const linkStr = r.link ? `\n链接: ${r.link}` : '';
      const timeStr = new Date(r.timestamp ?? 0).toLocaleString('zh-CN');
      await Share.share({
        message: `${r.content}${tagsStr}${moodStr}${linkStr}\n\n— ${timeStr}`,
      });
    } catch {}
    setActionMenuId(null);
  };

  return (
    <SafeAreaView edges={[]} style={{ flex:1, backgroundColor:TH.bg }}>
      <ScrollView contentContainerStyle={{ padding:16, paddingBottom:100 }}>
        <ScreenHeader title={T('reflTitle')} compact
          right={
            <TouchableOpacity onPress={() => setShowNew(true)}
              style={{ backgroundColor:P, paddingHorizontal:16, paddingVertical:8, borderRadius:20 }}>
              <Text style={{ color:'#fff', fontWeight:'700', fontSize:FONT_BUTTON }}>{T('reflNew')}</Text>
            </TouchableOpacity>
          }
        />

        {/* Stats */}
        <View style={{ flexDirection:'row', justifyContent:'center', gap:24, marginBottom:16 }}>
          {[
            { v:totalCount, l:T('reflTotal') },
            { v:topTag, l:T('reflTopTag') },
            { v:streakDays, l:T('reflStreak') },
          ].map(({ v,l }) => (
            <View key={l} style={{ alignItems:'center' }}>
              <Text style={{ fontSize:FONT_STAT_CARD, fontWeight:'800', color:P }}>{v}</Text>
              <Text style={{ fontSize:FONT_BODY, color:TH.sub, marginTop:2 }}>{l}</Text>
            </View>
          ))}
        </View>

        {/* Tag filter */}
        <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap:8 }} style={{ flex:1 }}>
            <TagPill label={`${T('habitStatusAll')} ${tagCounts[''] ?? 0}`} active={!filterTag} onPress={() => setFilterTag('')} />
            {visibleTags.map(t => {
              const isDeleted = !allTags.includes(t);
              return (
                <TagPill
                  key={t}
                  label={`${t} ${tagCounts[t] ?? 0}`}
                  active={filterTag===t}
                  onPress={() => setFilterTag(filterTag===t ? '' : t)}
                  color={isDeleted ? TH.sub : undefined}
                  style={isDeleted ? { borderWidth:1, borderStyle:'dashed', borderColor:TH.sub } : undefined}
                  textStyle={isDeleted ? { textDecorationLine:'line-through', opacity:0.6 } : undefined}
                />
              );
            })}
          </ScrollView>
          {deletedTagsWithData.length > 0 && (
            <TouchableOpacity
              onPress={() => setShowDeletedTags(!showDeletedTags)}
              style={{ padding:6, borderRadius:8, backgroundColor:showDeletedTags ? `${P}20` : 'transparent' }}
            >
              {showDeletedTags ? <EyeOff size={18} color={P} /> : <Eye size={18} color={TH.sub} />}
            </TouchableOpacity>
          )}
        </View>

        {/* Timeline */}
        {Object.entries(byDay).map(([day, items]) => (
          <View key={day}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:10 }}>
              <View style={{ width:8, height:8, borderRadius:4, backgroundColor:P }} />
              <Text style={{ color:TH.sub, fontSize:FONT_SUB, fontWeight:'600' }}>{day}</Text>
              <View style={{ flex:1, height:1, backgroundColor:TH.border }} />
            </View>
            {items.map(r => {
              const bgIdx = MIND_COLORS.findIndex(c => c[0] === (r.colors?.[0]));
              const bgColor = MIND_COLORS[bgIdx >= 0 ? bgIdx : 0]?.[0] ?? MIND_COLORS[0][0];
              return (
              <TouchableOpacity key={r.id} onLongPress={() => setActionMenuId(r.id)} activeOpacity={0.9}
                style={{ borderRadius:16, padding:16, marginBottom:12, backgroundColor: bgColor }}>
                {/* Decorative circle */}
                <View style={{ position:'absolute', top:-20, right:-20, width:80, height:80, borderRadius:40, backgroundColor:'rgba(255,255,255,.08)' }} />

                <Text style={{ color:'#fff', fontSize:FONT_BODY, lineHeight:22, marginBottom:10 }}>{r.content}</Text>
                {r.link && (
                  <TouchableOpacity onPress={() => Linking.openURL(r.link!).catch(() => {})} style={{ marginBottom:8 }}>
                    <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
                      <Link size={14} color="rgba(255,255,255,.7)" />
                      <Text style={{ color:'rgba(255,255,255,.7)', fontSize:FONT_SUB, textDecorationLine:'underline' }}>{r.link}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6 }}>
                  {r.tags.map(tag => (
                    <View key={tag} style={{ paddingHorizontal:10, paddingVertical:3, borderRadius:10, backgroundColor:'rgba(255,255,255,.2)' }}>
                      <Text style={{ color:'rgba(255,255,255,.9)', fontSize:FONT_SUB }}>{tag}</Text>
                    </View>
                  ))}
                  {r.mood && (
                    <View style={{ paddingHorizontal:10, paddingVertical:3, borderRadius:10, backgroundColor:'rgba(255,255,255,.15)' }}>
                      <Text style={{ color:'rgba(255,255,255,.8)', fontSize:FONT_SUB }}>{r.mood}</Text>
                    </View>
                  )}
                  {r.isPinned && <Pin size={16} color="rgba(255,255,255,.8)" />}
                </View>
                <Text style={{ color:'rgba(255,255,255,.5)', fontSize:FONT_SUB, marginTop:8 }}>
                  {new Date(r.timestamp ?? 0).toLocaleTimeString('zh-CN', { hour:'2-digit', minute:'2-digit' })}
                </Text>
              </TouchableOpacity>
            );
            })}
          </View>
        ))}
        {filtered.length===0 && (
          <Text style={{ color:TH.sub, textAlign:'center', marginTop:60, fontSize:FONT_EMPTY }}>{T('reflEmpty')}</Text>
        )}
      </ScrollView>

      {/* New reflection modal */}
      <Modal visible={showNew} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{ flex:1, justifyContent:'flex-end' }}>
          <View style={{ backgroundColor:TH.cardSolid, borderTopLeftRadius:24, borderTopRightRadius:24, paddingHorizontal:24, paddingBottom:40, maxHeight:'90%' }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingTop:20, marginBottom:16 }}>
              <Text style={{ color:TH.text, fontWeight:'700', fontSize:FONT_TITLE }}>{T('reflNewTitle')}</Text>
              <TouchableOpacity onPress={() => { setShowNew(false); setShowTagManager(false); setShowMoodManager(false); }}><X size={26} color={TH.sub} /></TouchableOpacity>
            </View>
            {showTagManager ? (
              <TagManagerPanel onBack={() => setShowTagManager(false)} />
            ) : showMoodManager ? (
              <MoodManagerPanel onBack={() => setShowMoodManager(false)} />
            ) : (
            <ScrollView keyboardShouldPersistTaps="handled">
              {/* Color palette */}
              <View style={{ flexDirection:'row', gap:10, marginBottom:16 }}>
                {MIND_COLORS.map((c,i) => (
                  <TouchableOpacity key={i} onPress={() => setColorIdx(i)}
                    style={{ width:28, height:28, borderRadius:14, backgroundColor:c[0], borderWidth: colorIdx===i ? 3 : 0, borderColor:'#fff' }} />
                ))}
              </View>

              {/* Content with 200-char limit */}
              <View style={{ marginBottom:16 }}>
                <ThemedInput value={content} onChangeText={setContent}
                  placeholder={T('reflPlaceholder')}
                  multiline numberOfLines={4} style={{ minHeight:90 }} />
                <Text style={{ color: content.length > 200 ? COLORS.RED : TH.sub, fontSize:FONT_BODY, textAlign:'right', marginTop:4 }}>
                  {content.length}/200
                </Text>
              </View>

              {/* Tags */}
              <Text style={{ color:TH.sub, fontSize:FONT_LABEL, marginBottom:8 }}>{T('reflAddTag')}</Text>
              <View style={{ flexDirection:'row', flexWrap:'wrap', marginBottom:16 }}>
                {allTagOptions.map(t => (
                  <TagPill key={t} label={t} active={tags.includes(t)}
                    onPress={() => setTags(ts => ts.includes(t) ? ts.filter(x=>x!==t) : [...ts,t])} />
                ))}
                <TouchableOpacity onPress={() => setShowTagManager(true)}
                  style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:16, borderWidth:1, borderColor:TH.border, borderStyle:'dashed' }}>
                  <Settings size={16} color={TH.sub} />
                </TouchableOpacity>
              </View>

              {/* Mood */}
              <Text style={{ color:TH.sub, fontSize:FONT_LABEL, marginBottom:8 }}>{T('reflMood')}</Text>
              <View style={{ flexDirection:'row', flexWrap:'wrap', marginBottom:24 }}>
                {allMoodOptions.map(m => (
                  <TagPill key={m} label={m} active={mood===m} onPress={() => setMood(mood===m ? '' : m)} />
                ))}
                <TouchableOpacity onPress={() => setShowMoodManager(true)}
                  style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:16, borderWidth:1, borderColor:TH.border, borderStyle:'dashed' }}>
                  <Settings size={16} color={TH.sub} />
                </TouchableOpacity>
              </View>

              <PrimaryButton label={T('saveReflection')} onPress={saveReflection} />
            </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Action menu modal (long press) */}
      <Modal visible={!!actionMenuId} transparent animationType="fade" onRequestClose={() => setActionMenuId(null)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setActionMenuId(null)}
          style={{ flex:1, backgroundColor:'rgba(0,0,0,.5)', justifyContent:'flex-end' }}>
          <View style={{ backgroundColor:TH.cardSolid, borderTopLeftRadius:24, borderTopRightRadius:24, paddingBottom:40, paddingTop:20 }}>
            <View style={{ width:40, height:4, borderRadius:2, backgroundColor:TH.border, alignSelf:'center', marginBottom:20 }} />
            <TouchableOpacity onPress={() => {
              const r = (store.reflections ?? []).find(x => x.id === actionMenuId);
              if (r) openEdit(r);
              setActionMenuId(null);
            }} style={{ marginHorizontal:16, marginBottom:12, paddingVertical:14, borderRadius:12, backgroundColor:P, alignItems:'center' }}>
              <Text style={{ color:'#fff', fontSize:FONT_BUTTON, fontWeight:'600' }}>{T('reflEditTitle')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              const { Share } = require('react-native');
              const r = (store.reflections ?? []).find(x => x.id === actionMenuId);
              if (r) {
                const tagsStr = r.tags?.length ? `\n标签: ${r.tags.join(' ')}` : '';
                const moodStr = r.mood ? `\n心情: ${r.mood}` : '';
                const timeStr = new Date(r.timestamp ?? 0).toLocaleString('zh-CN');
                Share.share({ message: `${r.content}${tagsStr}${moodStr}\n\n— ${timeStr}` }).catch(() => {});
              }
              setActionMenuId(null);
            }} style={{ marginHorizontal:16, marginBottom:12, paddingVertical:14, borderRadius:12, backgroundColor:'rgba(59,130,246,.15)', alignItems:'center' }}>
              <Text style={{ color:'#3B82F6', fontSize:FONT_BUTTON, fontWeight:'600' }}>{T('reflShare')}</Text>
            </TouchableOpacity>
            {(() => {
              const r = (store.reflections ?? []).find(x => x.id === actionMenuId);
              const isToday = r && new Date(r.timestamp ?? 0).toISOString().slice(0,10) === new Date().toISOString().slice(0,10);
              return isToday ? (
                <TouchableOpacity onPress={() => {
                  setConfirmDel(actionMenuId);
                  setActionMenuId(null);
                }} style={{ marginHorizontal:16, marginBottom:12, paddingVertical:14, borderRadius:12, backgroundColor:'rgba(239,68,68,.15)', alignItems:'center' }}>
                  <Text style={{ color:COLORS.RED, fontSize:FONT_BUTTON, fontWeight:'600' }}>{T('reflDelete')}</Text>
                </TouchableOpacity>
              ) : null;
            })()}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Confirm delete modal */}
      <Modal visible={!!confirmDel} transparent animationType="fade">
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,.7)', justifyContent:'center', padding:24 }}>
          <View style={{ backgroundColor:TH.cardSolid, borderRadius:20, padding:24, alignItems:'center' }}>
            <Text style={{ fontWeight:'700', fontSize:FONT_BODY, color:TH.text, marginBottom:12 }}>{T('reflDeleteConfirm')}</Text>
            <View style={{ flexDirection:'row', gap:10, width:'100%' }}>
              <OutlineButton label={T('cancel')} onPress={() => setConfirmDel(null)} style={{ flex:1 }} />
              <PrimaryButton label={T('confirm')} onPress={() => { if(confirmDel) store.deleteReflection(confirmDel); setConfirmDel(null); }} color={COLORS.RED} style={{ flex:1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit reflection modal */}
      <Modal visible={!!editId} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{ flex:1, justifyContent:'flex-end' }}>
          <View style={{ backgroundColor:TH.cardSolid, borderTopLeftRadius:24, borderTopRightRadius:24, paddingHorizontal:24, paddingBottom:40, maxHeight:'90%' }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingTop:20, marginBottom:16 }}>
              <Text style={{ color:TH.text, fontWeight:'700', fontSize:FONT_TITLE }}>{T('reflEditTitle')}</Text>
              <TouchableOpacity onPress={cancelEdit}><X size={26} color={TH.sub} /></TouchableOpacity>
            </View>
            {showTagManager ? (
              <TagManagerPanel onBack={() => setShowTagManager(false)} />
            ) : showMoodManager ? (
              <MoodManagerPanel onBack={() => setShowMoodManager(false)} />
            ) : (
            <ScrollView keyboardShouldPersistTaps="handled">
              {/* Color palette */}
              <View style={{ flexDirection:'row', gap:10, marginBottom:16 }}>
                {MIND_COLORS.map((c,i) => (
                  <TouchableOpacity key={i} onPress={() => setEditColorIdx(i)}
                    style={{ width:28, height:28, borderRadius:14, backgroundColor:c[0], borderWidth: editColorIdx===i ? 3 : 0, borderColor:'#fff' }} />
                ))}
              </View>

              {/* Content with 200-char limit */}
              <View style={{ marginBottom:16 }}>
                <ThemedInput value={editContent} onChangeText={setEditContent}
                  placeholder={T('reflPlaceholder')}
                  multiline numberOfLines={4} style={{ minHeight:90 }} />
                <Text style={{ color: editContent.length > 200 ? COLORS.RED : TH.sub, fontSize:FONT_BODY, textAlign:'right', marginTop:4 }}>
                  {editContent.length}/200
                </Text>
              </View>

              {/* Tags */}
              <Text style={{ color:TH.sub, fontSize:FONT_LABEL, marginBottom:8 }}>{T('reflAddTag')}</Text>
              <View style={{ flexDirection:'row', flexWrap:'wrap', marginBottom:16 }}>
                {allTagOptions.map(t => (
                  <TagPill key={t} label={t} active={editTags.includes(t)}
                    onPress={() => setEditTags(ts => ts.includes(t) ? ts.filter(x=>x!==t) : [...ts,t])} />
                ))}
                <TouchableOpacity onPress={() => setShowTagManager(true)}
                  style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:16, borderWidth:1, borderColor:TH.border, borderStyle:'dashed' }}>
                  <Settings size={16} color={TH.sub} />
                </TouchableOpacity>
              </View>

              {/* Mood */}
              <Text style={{ color:TH.sub, fontSize:FONT_LABEL, marginBottom:8 }}>{T('reflMood')}</Text>
              <View style={{ flexDirection:'row', flexWrap:'wrap', marginBottom:24 }}>
                {allMoodOptions.map(m => (
                  <TagPill key={m} label={m} active={editMood===m} onPress={() => setEditMood(editMood===m ? '' : m)} />
                ))}
                <TouchableOpacity onPress={() => setShowMoodManager(true)}
                  style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:16, borderWidth:1, borderColor:TH.border, borderStyle:'dashed' }}>
                  <Settings size={16} color={TH.sub} />
                </TouchableOpacity>
              </View>

              <PrimaryButton label={T('reflSaveEdit')} onPress={saveEdit} />
            </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}
