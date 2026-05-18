import { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, StyleSheet, Platform } from 'react-native';
import { useAppStore, THEMES, MIND_COLORS, TAGS_PRESET, MOODS, t } from '@egoless/core';

export default function ReflectionsScreen() {
  const themeName = useAppStore((s) => s.themeName);
  const TH = THEMES[themeName];
  const P = TH.primary;
  const lang = useAppStore((s) => s.lang);
  const T = (k: string) => t(k, lang);

  const reflections = useAppStore((s) => s.reflections);
  const addReflection = useAppStore((s) => s.addReflection);
  const deleteReflection = useAppStore((s) => s.deleteReflection);
  const habits = useAppStore((s) => s.habits);

  const [filterTag, setFilterTag] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [content, setContent] = useState('');
  const [selTags, setSelTags] = useState<string[]>([]);
  const [mood, setMood] = useState('');
  const [colorIdx, setColorIdx] = useState(0);

  const allTags = [...new Set(reflections.flatMap((r) => r.tags))];
  const filtered = filterTag ? reflections.filter((r) => r.tags.includes(filterTag)) : reflections;

  const mindByDay = useMemo(() => {
    const m: Record<string, typeof reflections> = {};
    filtered.forEach((r) => {
      const d = new Date(r.timestamp).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
      if (!m[d]) m[d] = [];
      m[d].push(r);
    });
    return m;
  }, [filtered]);

  const habitTags = habits.filter((h) => h.createTag).map((h) => `#${h.name}`);
  const allTagOptions = [...TAGS_PRESET, ...habitTags];

  function handleAdd() {
    if (!content.trim()) return;
    addReflection({ content, tags: selTags, mood, colors: MIND_COLORS[colorIdx] });
    setContent('');
    setSelTags([]);
    setMood('');
    setShowNew(false);
  }

  return (
    <View style={[s.bg, { backgroundColor: TH.bg }]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <View style={[s.flexRow, { marginBottom: 12 }]}>
          <Text style={[s.pageTitle, { color: TH.text }]}>{T('mindPulse')}</Text>
          <TouchableOpacity onPress={() => setShowNew(true)} style={[s.addBtn, { backgroundColor: P }]}>
            <Text style={s.addBtnText}>+ {T('newReflection')}</Text>
          </TouchableOpacity>
        </View>

        {/* tag filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[{ t: T('allStatus'), active: !filterTag, fn: () => setFilterTag('') } as const,
              ...allTags.map((tag) => ({ t: tag, active: filterTag === tag, fn: () => setFilterTag((f) => f === tag ? '' : tag) } as const)),
            ].map(({ t: label, active, fn }) => (
              <TouchableOpacity key={label} onPress={fn}
                style={[s.tagChip, { borderColor: P, backgroundColor: active ? P : 'transparent' }]}>
                <Text style={{ fontSize: 12, color: active ? '#fff' : P }}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* stats row */}
        <View style={[s.card, { backgroundColor: TH.card, borderColor: TH.border, padding: 12, marginBottom: 12 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={[s.statNum, { color: P }]}>{reflections.length}</Text>
              <Text style={[s.statLabel, { color: TH.sub }]}>感念总数</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={[s.statNum, { color: P, fontSize: 14 }]}>{allTags[0] || '--'}</Text>
              <Text style={[s.statLabel, { color: TH.sub }]}>最高频标签</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={[s.statNum, { color: P }]}>3</Text>
              <Text style={[s.statLabel, { color: TH.sub }]}>连续天数</Text>
            </View>
          </View>
        </View>

        {/* timeline */}
        {Object.entries(mindByDay).map(([day, items]) => (
          <View key={day}>
            <View style={[s.timelineDot, { marginBottom: 8, marginTop: 4 }]}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: P }} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: TH.sub, marginLeft: 10 }}>{day}</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: TH.border, marginLeft: 10 }} />
            </View>
            {items.map((r) => (
              <TouchableOpacity key={r.id} onLongPress={() => deleteReflection(r.id)}
                style={[s.mindCard, { backgroundColor: r.colors[0] }]}>
                <View style={[s.mindCardBg, { backgroundColor: r.colors[1] }]} />
                <Text style={s.mindContent}>{r.content}</Text>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  {r.tags.map((tag) => (
                    <Text key={tag} style={s.mindTag}>{tag}</Text>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={s.mindMeta}>{r.mood}</Text>
                  <Text style={s.mindMeta}>
                    {new Date(r.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* New Reflection Modal */}
      <Modal visible={showNew} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: TH.cardSolid }]}>
            <View style={[s.flexRow, { marginBottom: 16 }]}>
              <Text style={[s.modalTitle, { color: TH.text }]}>{T('newReflection')}</Text>
              <TouchableOpacity onPress={() => setShowNew(false)}>
                <Text style={{ fontSize: 22, color: TH.sub }}>×</Text>
              </TouchableOpacity>
            </View>

            {/* color picker */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              {MIND_COLORS.map((c, i) => (
                <TouchableOpacity key={i} onPress={() => setColorIdx(i)}
                  style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c[1],
                    borderWidth: colorIdx === i ? 3 : 0, borderColor: '#fff' }} />
              ))}
            </View>

            <TextInput value={content} onChangeText={setContent}
              placeholder="记录此刻的感悟与灵感..."
              placeholderTextColor={TH.sub}
              style={[s.textArea, { backgroundColor: TH.card, borderColor: TH.border, color: TH.text }]}
              multiline />

            <Text style={[s.fieldLabel, { color: TH.sub }]}>添加标签</Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {allTagOptions.map((tag) => (
                <TouchableOpacity key={tag} onPress={() => setSelTags((ts) => ts.includes(tag) ? ts.filter((x) => x !== tag) : [...ts, tag])}
                  style={[s.tagChip, { borderColor: P, backgroundColor: selTags.includes(tag) ? P : 'transparent' }]}>
                  <Text style={{ fontSize: 12, color: selTags.includes(tag) ? '#fff' : P }}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[s.fieldLabel, { color: TH.sub }]}>心情</Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
              {MOODS.map((m) => (
                <TouchableOpacity key={m} onPress={() => setMood(m)}
                  style={[s.moodChip, { borderColor: P, backgroundColor: mood === m ? P : 'transparent' }]}>
                  <Text style={{ fontSize: 12, color: mood === m ? '#fff' : P }}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={handleAdd} style={[s.saveBtn, { backgroundColor: P }]}>
              <Text style={s.saveBtnText}>{T('saveReflection')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1 },
  flexRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pageTitle: { fontSize: 15, fontWeight: '600' },
  addBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  tagChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  card: { borderRadius: 16, borderWidth: 1 },
  statNum: { fontWeight: '700', fontSize: 18 },
  statLabel: { fontSize: 11, marginTop: 2 },
  timelineDot: { flexDirection: 'row', alignItems: 'center' },
  mindCard: { borderRadius: 18, padding: 18, marginBottom: 10, marginLeft: 20, overflow: 'hidden' },
  mindCardBg: { position: 'absolute', top: 0, right: 0, width: 80, height: 80, borderRadius: 40, transform: [{ translateX: 20 }, { translateY: -20 }], opacity: 0.5 },
  mindContent: { fontSize: 13, lineHeight: 22, marginBottom: 10, color: '#fff' },
  mindTag: { fontSize: 10, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: 'rgba(255,255,255,.2)', color: 'rgba(255,255,255,.9)', overflow: 'hidden' },
  mindMeta: { fontSize: 11, color: 'rgba(255,255,255,.6)' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.75)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '88%' },
  modalTitle: { fontWeight: '700', fontSize: 18 },
  textArea: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, minHeight: 90, textAlignVertical: 'top', marginBottom: 14 },
  fieldLabel: { fontSize: 12, marginBottom: 8 },
  moodChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, borderWidth: 1 },
  saveBtn: { borderRadius: 12, padding: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
