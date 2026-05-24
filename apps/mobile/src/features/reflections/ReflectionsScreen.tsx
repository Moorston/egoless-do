import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  KeyboardAvoidingView, Platform, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { useAppStore } from '../../store/useAppStore';
import {
  useTheme, ScreenHeader, TagPill, PrimaryButton, OutlineButton,
  ThemedInput, useT,
} from '../../components/UI';
import { MIND_COLORS, TAGS_PRESET, MOODS, COLORS } from '@egoless-do/core';

export default function ReflectionsScreen() {
  const TH    = useTheme();
  const P     = TH.primary;
  const store = useAppStore();
  const T     = useT();
  const route = useRoute<any>();

  const [filterTag, setFilterTag] = useState('');
  const [showNew, setShowNew]     = useState(route.params?.showNew ?? false);
  const [content, setContent]     = useState('');
  const [tags, setTags]           = useState<string[]>([]);
  const [mood, setMood]           = useState('');
  const [colorIdx, setColorIdx]   = useState(0);
  const [confirmDel, setConfirmDel] = useState<string|null>(null);

  // Tag management state
  const [showTagManager, setShowTagManager] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [editingTag, setEditingTag] = useState<{ old: string; new: string } | null>(null);

  // Mood management state
  const [showMoodManager, setShowMoodManager] = useState(false);
  const [newMood, setNewMood] = useState('');
  const [editingMood, setEditingMood] = useState<{ old: string; new: string } | null>(null);

  const allTags  = [...new Set((store.reflections ?? []).flatMap(r => r.tags))];
  const filtered = filterTag ? (store.reflections ?? []).filter(r => r.tags.includes(filterTag)) : (store.reflections ?? []);

  // Stats
  const totalCount = (store.reflections ?? []).length;
  const topTag = useMemo(() => {
    const counts: Record<string, number> = {};
    (store.reflections ?? []).forEach(r => (r.tags ?? []).forEach(t => { counts[t] = (counts[t]||0)+1; }));
    const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]);
    return sorted[0]?.[0] ?? '-';
  }, [store.reflections]);
  const streakDays = useMemo(() => {
    const dates = [...new Set((store.reflections ?? []).map(r => new Date(r.created_at ?? 0).toISOString().slice(0,10)))].sort().reverse();
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
    filtered.forEach(r => {
      const d = new Date(r.created_at).toLocaleDateString('zh-CN', { month:'long', day:'numeric', weekday:'short' });
      if (!m[d]) m[d] = [];
      m[d].push(r);
    });
    return m;
  }, [filtered]);

  const habitTags = (store.habits ?? []).filter(h => h.createTag).map(h => `#${h.name}`);
  const allTagOptions = useMemo(() => [...TAGS_PRESET, ...habitTags, ...(store.customTags ?? [])], [habitTags, store.customTags]);
  const allMoodOptions = useMemo(() => [...MOODS, ...(store.customMoods ?? [])], [store.customMoods]);

  const saveReflection = () => {
    if (!content.trim()) return;
    store.addReflection({ content, tags, mood, colorIdx });
    setContent(''); setTags([]); setMood(''); setColorIdx(0);
    setShowNew(false);
  };

  const handleAddTag = () => {
    if (newTag.trim()) {
      const tag = newTag.startsWith('#') ? newTag : `#${newTag}`;
      // Check tag length (max 4 words)
      const words = tag.replace('#', '').trim().split(/\s+/);
      if (words.length > 4) {
        alert(T('tagTooLong'));
        return;
      }
      // Check max custom tags (10)
      if ((store.customTags ?? []).length >= 10) {
        alert(T('maxTagsReached'));
        return;
      }
      store.addCustomTag(tag);
      setNewTag('');
    }
  };

  const handleUpdateTag = () => {
    if (editingTag && editingTag.new.trim()) {
      const newTagValue = editingTag.new.startsWith('#') ? editingTag.new : `#${editingTag.new}`;
      // Check tag length (max 4 words)
      const words = newTagValue.replace('#', '').trim().split(/\s+/);
      if (words.length > 4) {
        alert(T('tagTooLong'));
        return;
      }
      store.updateCustomTag(editingTag.old, newTagValue);
      setEditingTag(null);
    }
  };

  const handleAddMood = () => {
    if (newMood.trim()) {
      // Check mood length (max 4 words)
      const words = newMood.trim().split(/\s+/);
      if (words.length > 4) {
        alert(T('moodTooLong'));
        return;
      }
      // Check max custom moods (10)
      if ((store.customMoods ?? []).length >= 10) {
        alert(T('maxMoodsReached'));
        return;
      }
      store.addCustomMood(newMood);
      setNewMood('');
    }
  };

  const handleUpdateMood = () => {
    if (editingMood && editingMood.new.trim()) {
      // Check mood length (max 4 words)
      const words = editingMood.new.trim().split(/\s+/);
      if (words.length > 4) {
        alert(T('moodTooLong'));
        return;
      }
      store.updateCustomMood(editingMood.old, editingMood.new);
      setEditingMood(null);
    }
  };

  return (
    <SafeAreaView edges={[]} style={{ flex:1, backgroundColor:TH.bg }}>
      <ScrollView contentContainerStyle={{ padding:16, paddingBottom:100 }}>
        <ScreenHeader title={T('reflTitle')} compact
          right={
            <TouchableOpacity onPress={() => setShowNew(true)}
              style={{ backgroundColor:P, paddingHorizontal:16, paddingVertical:8, borderRadius:20 }}>
              <Text style={{ color:'#fff', fontWeight:'700', fontSize:16 }}>{T('reflNew')}</Text>
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
              <Text style={{ fontSize:22, fontWeight:'800', color:P }}>{v}</Text>
              <Text style={{ fontSize:16, color:TH.sub, marginTop:2 }}>{l}</Text>
            </View>
          ))}
        </View>

        {/* Tag filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom:12, gap:8 }}>
          <TagPill label={T('habitStatusAll')} active={!filterTag} onPress={() => setFilterTag('')} />
          {allTags.map(t => (
            <TagPill key={t} label={t} active={filterTag===t} onPress={() => setFilterTag(filterTag===t ? '' : t)} />
          ))}
        </ScrollView>

        {/* Timeline */}
        {Object.entries(byDay).map(([day, items]) => (
          <View key={day}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:10 }}>
              <View style={{ width:8, height:8, borderRadius:4, backgroundColor:P }} />
              <Text style={{ color:TH.sub, fontSize:16, fontWeight:'600' }}>{day}</Text>
              <View style={{ flex:1, height:1, backgroundColor:TH.border }} />
            </View>
            {items.map(r => {
              const bgIdx = MIND_COLORS.findIndex(c => c[0] === (r.colors?.[0]));
              const bgColor = MIND_COLORS[bgIdx >= 0 ? bgIdx : 0]?.[0] ?? MIND_COLORS[0][0];
              const rTimestamp = r.created_at ?? r.timestamp ?? 0;
              const isToday = new Date(rTimestamp).toISOString().slice(0,10) === new Date().toISOString().slice(0,10);
              return (
              <View key={r.id} style={{ borderRadius:16, padding:16, marginBottom:12, backgroundColor: bgColor }}>
                {/* Decorative circle */}
                <View style={{ position:'absolute', top:-20, right:-20, width:80, height:80, borderRadius:40, backgroundColor:'rgba(255,255,255,.08)' }} />

                {/* Delete button (today only) */}
                {isToday && (
                  <TouchableOpacity onPress={() => setConfirmDel(r.id)}
                    style={{ position:'absolute', top:8, right:8, width:24, height:24, borderRadius:12, backgroundColor:'rgba(0,0,0,.3)', alignItems:'center', justifyContent:'center' }}>
                    <Text style={{ color:'#fff', fontSize:16 }}>×</Text>
                  </TouchableOpacity>
                )}

                <Text style={{ color:'#fff', fontSize:16, lineHeight:22, marginBottom:10 }}>{r.content}</Text>
                <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6 }}>
                  {r.tags.map(tag => (
                    <View key={tag} style={{ paddingHorizontal:10, paddingVertical:3, borderRadius:10, backgroundColor:'rgba(255,255,255,.2)' }}>
                      <Text style={{ color:'rgba(255,255,255,.9)', fontSize:16 }}>{tag}</Text>
                    </View>
                  ))}
                  {r.mood && (
                    <View style={{ paddingHorizontal:10, paddingVertical:3, borderRadius:10, backgroundColor:'rgba(255,255,255,.15)' }}>
                      <Text style={{ color:'rgba(255,255,255,.8)', fontSize:16 }}>{r.mood}</Text>
                    </View>
                  )}
                  {r.is_pinned && <Text style={{ color:'rgba(255,255,255,.8)', fontSize:16 }}>📌</Text>}
                </View>
                <Text style={{ color:'rgba(255,255,255,.5)', fontSize:16, marginTop:8 }}>
                  {new Date(r.created_at ?? r.timestamp ?? 0).toLocaleTimeString('zh-CN', { hour:'2-digit', minute:'2-digit' })}
                </Text>
              </View>
            );
            })}
          </View>
        ))}
        {filtered.length===0 && (
          <Text style={{ color:TH.sub, textAlign:'center', marginTop:60, fontSize:16 }}>{T('reflEmpty')}</Text>
        )}
      </ScrollView>

      {/* New reflection modal */}
      <Modal visible={showNew} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{ flex:1, justifyContent:'flex-end' }}>
          <View style={{ backgroundColor:TH.cardSolid, borderTopLeftRadius:24, borderTopRightRadius:24, paddingHorizontal:24, paddingBottom:40, maxHeight:'90%' }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingTop:20, marginBottom:16 }}>
              <Text style={{ color:TH.text, fontWeight:'700', fontSize:18 }}>{T('reflNewTitle')}</Text>
              <TouchableOpacity onPress={() => setShowNew(false)}><Text style={{ color:TH.sub, fontSize:26 }}>×</Text></TouchableOpacity>
            </View>
            <ScrollView>
              {/* Color palette */}
              <View style={{ flexDirection:'row', gap:10, marginBottom:16 }}>
                {MIND_COLORS.map((c,i) => (
                  <TouchableOpacity key={i} onPress={() => setColorIdx(i)}
                    style={{ width:28, height:28, borderRadius:14, backgroundColor:c[0], borderWidth: colorIdx===i ? 3 : 0, borderColor:'#fff' }} />
                ))}
              </View>

              {/* Content with 20-char limit */}
              <View style={{ marginBottom:16 }}>
                <ThemedInput value={content} onChangeText={setContent}
                  placeholder={T('reflPlaceholder')}
                  multiline numberOfLines={4} style={{ minHeight:90 }} />
                <Text style={{ color: content.length > 20 ? COLORS.RED : TH.sub, fontSize:16, textAlign:'right', marginTop:4 }}>
                  {content.length}/20
                </Text>
              </View>

              {/* Tags */}
              <Text style={{ color:TH.sub, fontSize:16, marginBottom:8 }}>{T('reflAddTag')}</Text>
              <View style={{ flexDirection:'row', flexWrap:'wrap', marginBottom:16 }}>
                {allTagOptions.map(t => (
                  <TagPill key={t} label={t} active={tags.includes(t)}
                    onPress={() => setTags(ts => ts.includes(t) ? ts.filter(x=>x!==t) : [...ts,t])} />
                ))}
                <TouchableOpacity onPress={() => setShowTagManager(true)}
                  style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:16, borderWidth:1, borderColor:TH.border, borderStyle:'dashed' }}>
                  <Text style={{ color:TH.sub, fontSize:16 }}>⚙️</Text>
                </TouchableOpacity>
              </View>

              {/* Mood */}
              <Text style={{ color:TH.sub, fontSize:16, marginBottom:8 }}>{T('reflMood')}</Text>
              <View style={{ flexDirection:'row', flexWrap:'wrap', marginBottom:24 }}>
                {allMoodOptions.map(m => (
                  <TagPill key={m} label={m} active={mood===m} onPress={() => setMood(mood===m ? '' : m)} />
                ))}
                <TouchableOpacity onPress={() => setShowMoodManager(true)}
                  style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:16, borderWidth:1, borderColor:TH.border, borderStyle:'dashed' }}>
                  <Text style={{ color:TH.sub, fontSize:16 }}>⚙️</Text>
                </TouchableOpacity>
              </View>

              <PrimaryButton label={T('saveReflection')} onPress={saveReflection} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Confirm delete modal */}
      <Modal visible={!!confirmDel} transparent animationType="fade">
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,.7)', justifyContent:'center', padding:24 }}>
          <View style={{ backgroundColor:TH.cardSolid, borderRadius:20, padding:24, alignItems:'center' }}>
            <Text style={{ fontWeight:'700', fontSize:16, color:TH.text, marginBottom:12 }}>{T('reflDeleteConfirm')}</Text>
            <View style={{ flexDirection:'row', gap:10, width:'100%' }}>
              <OutlineButton label={T('cancel')} onPress={() => setConfirmDel(null)} style={{ flex:1 }} />
              <PrimaryButton label={T('confirm')} onPress={() => { if(confirmDel) store.deleteReflection(confirmDel); setConfirmDel(null); }} color={COLORS.RED} style={{ flex:1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Tag Manager Modal */}
      <Modal visible={showTagManager} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{ flex:1, justifyContent:'center', padding:24 }}>
          <View style={{ backgroundColor:TH.cardSolid, borderRadius:20, padding:24, maxHeight:'80%' }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <Text style={{ fontWeight:'700', fontSize:18, color:TH.text }}>{T('tagManager')}</Text>
              <TouchableOpacity onPress={() => setShowTagManager(false)}><Text style={{ color:TH.sub, fontSize:26 }}>×</Text></TouchableOpacity>
            </View>
            
            {/* Add new tag */}
            <View style={{ flexDirection:'row', gap:8, marginBottom:16 }}>
              <TextInput value={newTag} onChangeText={setNewTag} placeholder={T('newTagPlaceholder')}
                placeholderTextColor={TH.sub}
                style={{ flex:1, padding:10, borderRadius:8, borderWidth:1, borderColor:TH.border, backgroundColor:TH.card, color:TH.text, fontSize:16 }} />
              <TouchableOpacity onPress={handleAddTag}
                style={{ paddingHorizontal:16, paddingVertical:10, borderRadius:8, backgroundColor:P }}>
                <Text style={{ color:'#fff', fontSize:16 }}>{T('add')}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              {/* Preset tags */}
              <Text style={{ color:TH.sub, fontSize:16, marginBottom:8 }}>{T('presetTags')}</Text>
              {TAGS_PRESET.map((tag) => (
                <View key={tag} style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:8, borderBottomWidth:1, borderBottomColor:TH.border }}>
                  <Text style={{ color:TH.text, fontSize:16 }}>{tag}</Text>
                  <Text style={{ color:TH.sub, fontSize:14 }}>{T('preset')}</Text>
                </View>
              ))}

              {/* Custom tags */}
              {(store.customTags ?? []).length > 0 && (
                <>
                  <Text style={{ color:TH.sub, fontSize:16, marginTop:16, marginBottom:8 }}>{T('customTags')}</Text>
                  {(store.customTags ?? []).map((tag) => (
                    <View key={tag} style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:8, borderBottomWidth:1, borderBottomColor:TH.border }}>
                      {editingTag?.old === tag ? (
                        <View style={{ flexDirection:'row', gap:8, flex:1 }}>
                          <TextInput value={editingTag.new} onChangeText={(v) => setEditingTag({ ...editingTag, new: v })}
                            style={{ flex:1, padding:6, borderRadius:4, borderWidth:1, borderColor:TH.border, backgroundColor:TH.card, color:TH.text, fontSize:16 }} />
                          <TouchableOpacity onPress={handleUpdateTag} style={{ padding:6, borderRadius:4, backgroundColor:COLORS.GREEN }}>
                            <Text style={{ color:'#fff', fontSize:14 }}>✓</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => setEditingTag(null)} style={{ padding:6, borderRadius:4, backgroundColor:COLORS.RED }}>
                            <Text style={{ color:'#fff', fontSize:14 }}>×</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <>
                          <Text style={{ color:TH.text, fontSize:16 }}>{tag}</Text>
                          <View style={{ flexDirection:'row', gap:8 }}>
                            <TouchableOpacity onPress={() => setEditingTag({ old: tag, new: tag })} style={{ padding:6 }}>
                              <Text style={{ color:P, fontSize:14 }}>✏️</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => store.removeCustomTag(tag)} style={{ padding:6 }}>
                              <Text style={{ color:COLORS.RED, fontSize:14 }}>🗑</Text>
                            </TouchableOpacity>
                          </View>
                        </>
                      )}
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Mood Manager Modal */}
      <Modal visible={showMoodManager} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{ flex:1, justifyContent:'center', padding:24 }}>
          <View style={{ backgroundColor:TH.cardSolid, borderRadius:20, padding:24, maxHeight:'80%' }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <Text style={{ fontWeight:'700', fontSize:18, color:TH.text }}>{T('moodManager')}</Text>
              <TouchableOpacity onPress={() => setShowMoodManager(false)}><Text style={{ color:TH.sub, fontSize:26 }}>×</Text></TouchableOpacity>
            </View>
            
            {/* Add new mood */}
            <View style={{ flexDirection:'row', gap:8, marginBottom:16 }}>
              <TextInput value={newMood} onChangeText={setNewMood} placeholder={T('newMoodPlaceholder')}
                placeholderTextColor={TH.sub}
                style={{ flex:1, padding:10, borderRadius:8, borderWidth:1, borderColor:TH.border, backgroundColor:TH.card, color:TH.text, fontSize:16 }} />
              <TouchableOpacity onPress={handleAddMood}
                style={{ paddingHorizontal:16, paddingVertical:10, borderRadius:8, backgroundColor:P }}>
                <Text style={{ color:'#fff', fontSize:16 }}>{T('add')}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              {/* Preset moods */}
              <Text style={{ color:TH.sub, fontSize:16, marginBottom:8 }}>{T('presetMoods')}</Text>
              {MOODS.map((mood) => (
                <View key={mood} style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:8, borderBottomWidth:1, borderBottomColor:TH.border }}>
                  <Text style={{ color:TH.text, fontSize:16 }}>{mood}</Text>
                  <Text style={{ color:TH.sub, fontSize:14 }}>{T('preset')}</Text>
                </View>
              ))}

              {/* Custom moods */}
              {(store.customMoods ?? []).length > 0 && (
                <>
                  <Text style={{ color:TH.sub, fontSize:16, marginTop:16, marginBottom:8 }}>{T('customMoods')}</Text>
                  {(store.customMoods ?? []).map((mood) => (
                    <View key={mood} style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:8, borderBottomWidth:1, borderBottomColor:TH.border }}>
                      {editingMood?.old === mood ? (
                        <View style={{ flexDirection:'row', gap:8, flex:1 }}>
                          <TextInput value={editingMood.new} onChangeText={(v) => setEditingMood({ ...editingMood, new: v })}
                            style={{ flex:1, padding:6, borderRadius:4, borderWidth:1, borderColor:TH.border, backgroundColor:TH.card, color:TH.text, fontSize:16 }} />
                          <TouchableOpacity onPress={handleUpdateMood} style={{ padding:6, borderRadius:4, backgroundColor:COLORS.GREEN }}>
                            <Text style={{ color:'#fff', fontSize:14 }}>✓</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => setEditingMood(null)} style={{ padding:6, borderRadius:4, backgroundColor:COLORS.RED }}>
                            <Text style={{ color:'#fff', fontSize:14 }}>×</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <>
                          <Text style={{ color:TH.text, fontSize:16 }}>{mood}</Text>
                          <View style={{ flexDirection:'row', gap:8 }}>
                            <TouchableOpacity onPress={() => setEditingMood({ old: mood, new: mood })} style={{ padding:6 }}>
                              <Text style={{ color:P, fontSize:14 }}>✏️</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => store.removeCustomMood(mood)} style={{ padding:6 }}>
                              <Text style={{ color:COLORS.RED, fontSize:14 }}>🗑</Text>
                            </TouchableOpacity>
                          </View>
                        </>
                      )}
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
