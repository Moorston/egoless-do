import { useState } from 'react';
import { View, Text, ScrollView, Textarea } from '@tarojs/components';
import { useAppStore, THEMES, t, TAGS_PRESET, MOODS, MIND_COLORS } from '@egoless/core';
import { Card, Btn, Modal } from '../../components/helpers';

export default function Reflections() {
  const themeName = useAppStore((s) => s.themeName);
  const TH = THEMES[themeName];
  const lang = useAppStore((s) => s.lang);
  const T = (k: string) => t(k, lang);

  const reflections = useAppStore((s) => s.reflections);
  const addReflection = useAppStore((s) => s.addReflection);
  const deleteReflection = useAppStore((s) => s.deleteReflection);

  const [showAdd, setShowAdd] = useState(false);
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('🌿 平静');
  const [tags, setTags] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const activeTags = [...new Set(reflections.flatMap((r: any) => r.tags))];

  function handleAdd() {
    if (!content.trim()) return;
    const colors = MIND_COLORS[Math.floor(Math.random() * MIND_COLORS.length)];
    addReflection({ content: content.trim(), tags, mood, colors } as any);
    setContent(''); setTags([]); setMood('🌿 平静');
    setShowAdd(false);
  }

  function toggleTag(tag: string) {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  }

  const sortedReflections = [...reflections].sort((a: any, b: any) => b.timestamp - a.timestamp);
  const grouped: Record<string, any[]> = {};
  sortedReflections.forEach((r: any) => {
    const d = new Date(r.timestamp).toISOString().slice(0, 10);
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(r);
  });

  return (
    <ScrollView style={{ minHeight: '100vh', padding: '14px 16px', background: TH.bg } as any}>
      {/* Stats */}
      <View style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
        <Card style={{ padding: 10, textAlign: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: TH.primary, display: 'block' }}>{reflections.length}</Text>
          <Text style={{ fontSize: 10, color: TH.sub, display: 'block' }}>总条数</Text>
        </Card>
        <Card style={{ padding: 10, textAlign: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: TH.primary, display: 'block' }}>
            {activeTags.length}
          </Text>
          <Text style={{ fontSize: 10, color: TH.sub, display: 'block' }}>标签数</Text>
        </Card>
        <Card style={{ padding: 10, textAlign: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: TH.primary, display: 'block' }}>
            {reflections.filter((r: any) => r.isPinned).length}
          </Text>
          <Text style={{ fontSize: 10, color: TH.sub, display: 'block' }}>已置顶</Text>
        </Card>
      </View>

      {/* Add Button */}
      <Btn onClick={() => setShowAdd(true)}>✏️ 记录感念</Btn>

      {/* Timeline */}
      {Object.entries(grouped).map(([date, items]) => (
        <View key={date} style={{ marginTop: 14 }}>
          <Text style={{ fontSize: 12, color: TH.sub, marginBottom: 8, display: 'block' }}>{date}</Text>
          {items.map((r: any) => (
            <Card key={r.id} style={{
              background: `linear-gradient(135deg, ${r.colors?.[0] || '#2D1B69'}, ${r.colors?.[1] || '#7C3AED'})`,
              position: 'relative',
            }}>
              <Text style={{ fontSize: 13, color: '#fff', lineHeight: 1.6, display: 'block' }}>{r.content}</Text>
              <View style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {r.tags?.map((tag: string, ti: number) => (
                  <Text key={ti} style={{ fontSize: 10, color: 'rgba(255,255,255,.6)', background: 'rgba(255,255,255,.15)', borderRadius: 8, padding: '2px 6px' }}>
                    {tag}
                  </Text>
                ))}
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', marginLeft: 'auto' }}>{r.mood}</Text>
              </View>
              <View
                onClick={() => setShowDeleteConfirm(r.id)}
                style={{ position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 12, color: '#fff' }}>×</Text>
              </View>
            </Card>
          ))}
        </View>
      ))}

      {/* Add Modal */}
      <Modal show={showAdd} onClose={() => setShowAdd(false)} title="✏️ 记录感念">
        <Textarea
          value={content} onInput={(e) => setContent(e.detail.value)}
          placeholder="记录此刻的感念..."
          style={{
            width: '100%', height: 100, background: 'rgba(255,255,255,.06)', borderRadius: 8,
            padding: 10, color: '#E0E0E0', fontSize: 13, marginBottom: 12, boxSizing: 'border-box',
          }}
        />
        <Text style={{ fontSize: 12, color: TH.sub, marginBottom: 6, display: 'block' }}>标签</Text>
        <View style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {TAGS_PRESET.map((tag: string) => (
            <View key={tag} onClick={() => toggleTag(tag)}
              style={{
                padding: '4px 10px', borderRadius: 12,
                background: tags.includes(tag) ? TH.primary : 'rgba(255,255,255,.08)',
                color: tags.includes(tag) ? '#fff' : TH.sub, fontSize: 11,
              }}>
              <Text>{tag}</Text>
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 12, color: TH.sub, marginBottom: 6, display: 'block' }}>心情</Text>
        <View style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {MOODS.map((m: string) => (
            <View key={m} onClick={() => setMood(m)}
              style={{
                padding: '4px 10px', borderRadius: 12,
                background: mood === m ? TH.primary : 'rgba(255,255,255,.08)',
                color: mood === m ? '#fff' : TH.sub, fontSize: 11,
              }}>
              <Text>{m}</Text>
            </View>
          ))}
        </View>
        <Btn onClick={handleAdd} style={{ background: TH.primary }}>保存</Btn>
      </Modal>

      {/* Delete Confirm */}
      <Modal show={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} title="确认删除">
        <Text style={{ textAlign: 'center', fontSize: 13, color: TH.sub, marginBottom: 16, display: 'block' }}>确定要删除这条感念吗？</Text>
        <View style={{ display: 'flex', gap: 10 }}>
          <Btn onClick={() => { setShowDeleteConfirm(null); }}
            style={{ flex: 1, background: 'rgba(255,255,255,.1)', color: TH.text }}>
            取消
          </Btn>
          <Btn onClick={() => { if (showDeleteConfirm) deleteReflection(showDeleteConfirm); setShowDeleteConfirm(null); }}
            style={{ flex: 1, background: '#ef4444' }}>
            删除
          </Btn>
        </View>
      </Modal>
    </ScrollView>
  );
}
