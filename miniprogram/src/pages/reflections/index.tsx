import { View, Text, ScrollView, Textarea } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useState, useMemo } from 'react';
import { useStore } from '../../utils/store';
import { useT } from '../../utils/i18n';
import { MIND_COLORS, TAGS_PRESET, MOODS, COLORS } from '../../core';
import { getPrimaryColor } from '../../utils/theme';

export default function ReflectionsPage() {
  const P = getPrimaryColor();
  const store = useStore();
  const T = useT();
  const router = useRouter();
  const [filterTag, setFilterTag] = useState('');
  const [showNew, setShowNew] = useState(router.params.showNew === 'true');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [mood, setMood] = useState('');
  const [cidx, setCidx] = useState(0);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const allTags = useMemo(() => [...new Set(store.reflections.flatMap(r => r.tags))], [store.reflections]);
  const filtered = filterTag ? store.reflections.filter(r => r.tags.includes(filterTag)) : store.reflections;

  const totalCount = store.reflections.length;
  const topTag = useMemo(() => {
    const counts: Record<string, number> = {};
    store.reflections.forEach(r => r.tags.forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-';
  }, [store.reflections]);

  const habitTags = store.habits.filter(h => h.createTag).map(h => `#${h.name}`);

  const byDay = useMemo(() => {
    const m: Record<string, typeof filtered> = {};
    filtered.forEach(r => {
      const d = new Date(r.timestamp ?? r.created_at ?? 0).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
      if (!m[d]) m[d] = [];
      m[d].push(r);
    });
    return m;
  }, [filtered]);

  return (
    <View style={{ background: '#0F0A1E', minHeight: '100vh' }}>
      <ScrollView scrollY style={{ height: '100vh', padding: '32rpx' }}>
        {/* Header */}
        <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32rpx' }}>
          <Text style={{ color: '#fff', fontSize: '44rpx', fontWeight: 'bold' }}>{T('reflTitle')}</Text>
          <View onClick={() => setShowNew(true)} style={{ background: P, borderRadius: '40rpx', padding: '12rpx 28rpx' }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: '40rpx' }}>{T('reflNew')}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={{ display: 'flex', justifyContent: 'center', gap: '48rpx', marginBottom: '32rpx' }}>
          {[
            { v: totalCount, l: T('reflTotal') },
            { v: topTag, l: T('reflTopTag') },
          ].map(({ v, l }) => (
            <View key={l} style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: '44rpx', fontWeight: '800', color: P, display: 'block', textAlign: 'center' }}>{v}</Text>
              <Text style={{ fontSize: '40rpx', color: 'rgba(255,255,255,.45)', display: 'block', marginTop: '4rpx', textAlign: 'center' }}>{l}</Text>
            </View>
          ))}
        </View>

        {/* Tag filter */}
        <ScrollView scrollX style={{ marginBottom: '24rpx' }}>
          <View style={{ display: 'flex', gap: '12rpx' }}>
            <View onClick={() => setFilterTag('')} style={{ padding: '10rpx 24rpx', borderRadius: '40rpx', border: `2rpx solid ${!filterTag ? P : 'rgba(255,255,255,.2)'}`, background: !filterTag ? `${P}30` : 'transparent' }}>
              <Text style={{ color: !filterTag ? '#fff' : 'rgba(255,255,255,.5)', fontSize: '40rpx' }}>{T('habitStatusAll')}</Text>
            </View>
            {allTags.map(t => (
              <View key={t} onClick={() => setFilterTag(filterTag === t ? '' : t)} style={{ padding: '10rpx 24rpx', borderRadius: '40rpx', border: `2rpx solid ${filterTag === t ? P : 'rgba(255,255,255,.2)'}`, background: filterTag === t ? `${P}30` : 'transparent' }}>
                <Text style={{ color: filterTag === t ? '#fff' : 'rgba(255,255,255,.5)', fontSize: '40rpx' }}>{t}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Timeline */}
        {Object.entries(byDay).map(([day, items]) => (
          <View key={day}>
            <View style={{ display: 'flex', alignItems: 'center', gap: '16rpx', marginBottom: '20rpx' }}>
              <View style={{ width: '16rpx', height: '16rpx', borderRadius: '8rpx', background: P }} />
              <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', fontWeight: '600' }}>{day}</Text>
              <View style={{ flex: 1, height: '2rpx', background: 'rgba(255,255,255,.09)' }} />
            </View>
            {items.map(r => {
              const bgIdx = MIND_COLORS.findIndex(c => c[0] === (r.colors?.[0]));
              const colorBg = MIND_COLORS[bgIdx >= 0 ? bgIdx : 0]?.[0] ?? MIND_COLORS[0][0];
              const rTimestamp = r.timestamp ?? r.created_at ?? 0;
              const today = new Date().toISOString().slice(0, 10);
              const isToday = new Date(rTimestamp).toISOString().slice(0, 10) === today;
              return (
                <View key={r.id} style={{ borderRadius: '32rpx', padding: '32rpx', marginBottom: '24rpx', background: r.colors?.[0] ?? colorBg }}>
                  {/* Decorative circle */}
                  <View style={{ position: 'absolute', top: '-40rpx', right: '-40rpx', width: '160rpx', height: '160rpx', borderRadius: '80rpx', background: 'rgba(255,255,255,.08)' }} />
                  {/* Delete button */}
                  {isToday && (
                    <Text onClick={() => setConfirmDel(r.id)} style={{ position: 'absolute', top: '16rpx', right: '16rpx', width: '48rpx', height: '48rpx', borderRadius: '24rpx', background: 'rgba(0,0,0,.3)', textAlign: 'center', lineHeight: '48rpx', color: '#fff', fontSize: '40rpx' }}>×</Text>
                  )}
                  <Text style={{ color: '#fff', fontSize: '40rpx', lineHeight: '1.65', display: 'block', marginBottom: '20rpx' }}>{r.content}</Text>
                  <View style={{ display: 'flex', flexWrap: 'wrap', gap: '12rpx' }}>
                    {r.tags.map(tag => (
                      <View key={tag} style={{ padding: '6rpx 20rpx', borderRadius: '20rpx', background: 'rgba(255,255,255,.22)' }}>
                        <Text style={{ color: 'rgba(255,255,255,.9)', fontSize: '40rpx' }}>{tag}</Text>
                      </View>
                    ))}
                    {r.mood && (
                      <View style={{ padding: '6rpx 20rpx', borderRadius: '20rpx', background: 'rgba(255,255,255,.15)' }}>
                        <Text style={{ color: 'rgba(255,255,255,.8)', fontSize: '40rpx' }}>{r.mood}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ color: 'rgba(255,255,255,.5)', fontSize: '40rpx', display: 'block', marginTop: '16rpx' }}>
                    {new Date(r.timestamp ?? r.created_at ?? 0).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
        {filtered.length === 0 && (
          <Text style={{ color: 'rgba(255,255,255,.45)', textAlign: 'center', display: 'block', marginTop: '120rpx', fontSize: '40rpx' }}>{T('reflEmpty')}</Text>
        )}
      </ScrollView>

      {/* New reflection modal */}
      {showNew && (
        <View style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}>
          <View style={{ background: '#1A1030', borderRadius: '48rpx 48rpx 0 0', padding: '48rpx 40rpx', width: '100%', maxHeight: '80vh' }}>
            <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32rpx' }}>
              <Text style={{ color: '#fff', fontSize: '40rpx', fontWeight: 'bold' }}>{T('reflNewTitle')}</Text>
              <Text onClick={() => setShowNew(false)} style={{ color: 'rgba(255,255,255,.4)', fontSize: '52rpx' }}>×</Text>
            </View>
            {/* Color palette */}
            <View style={{ display: 'flex', gap: '16rpx', marginBottom: '28rpx' }}>
              {MIND_COLORS.map((c, i) => (
                <View key={i} onClick={() => setCidx(i)} style={{ width: '56rpx', height: '56rpx', borderRadius: '28rpx', background: c[0], border: cidx === i ? '4rpx solid #fff' : '4rpx solid transparent' }} />
              ))}
            </View>
            {/* Content with 20-char limit */}
            <Textarea value={content} onInput={e => setContent(e.detail.value)} placeholder={T('reflPlaceholder')} autoHeight
              style={{ width: '100%', background: 'rgba(255,255,255,.07)', border: `2rpx solid ${content.length > 20 ? COLORS.RED : 'rgba(255,255,255,.1)'}`, borderRadius: '20rpx', padding: '24rpx', color: '#fff', fontSize: '40rpx', minHeight: '160rpx', boxSizing: 'border-box', marginBottom: '8rpx' }} />
            <Text style={{ color: content.length > 20 ? COLORS.RED : 'rgba(255,255,255,.45)', fontSize: '40rpx', textAlign: 'right', display: 'block', marginBottom: '24rpx' }}>{content.length}/20</Text>
            {/* Tags */}
            <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block', marginBottom: '16rpx' }}>{T('reflAddTag')}</Text>
            <View style={{ display: 'flex', flexWrap: 'wrap', gap: '12rpx', marginBottom: '24rpx' }}>
              {[...TAGS_PRESET, ...habitTags].map(t => (
                <View key={t} onClick={() => setTags(ts => ts.includes(t) ? ts.filter(x => x !== t) : [...ts, t])} style={{ padding: '10rpx 24rpx', borderRadius: '40rpx', border: `2rpx solid ${tags.includes(t) ? P : 'rgba(255,255,255,.2)'}`, background: tags.includes(t) ? `${P}30` : 'transparent' }}>
                  <Text style={{ color: tags.includes(t) ? '#fff' : 'rgba(255,255,255,.5)', fontSize: '40rpx' }}>{t}</Text>
                </View>
              ))}
            </View>
            {/* Mood */}
            <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block', marginBottom: '16rpx' }}>{T('reflMood')}</Text>
            <View style={{ display: 'flex', flexWrap: 'wrap', gap: '12rpx', marginBottom: '48rpx' }}>
              {MOODS.map(m => (
                <View key={m} onClick={() => setMood(mood === m ? '' : m)} style={{ padding: '10rpx 24rpx', borderRadius: '40rpx', border: `2rpx solid ${mood === m ? P : 'rgba(255,255,255,.2)'}`, background: mood === m ? `${P}30` : 'transparent' }}>
                  <Text style={{ color: mood === m ? '#fff' : 'rgba(255,255,255,.5)', fontSize: '40rpx' }}>{m}</Text>
                </View>
              ))}
            </View>
            <View onClick={() => { if (!content.trim()) return; store.addReflection({ content, tags, mood, colorIdx: cidx }); setContent(''); setTags([]); setMood(''); setShowNew(false); }}
              style={{ background: P, borderRadius: '24rpx', padding: '28rpx', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: '40rpx', textAlign: 'center', display: 'block' }}>{T('saveReflection')}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Confirm delete modal */}
      {confirmDel && (
        <View style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48rpx' }}>
          <View style={{ background: '#1A1030', borderRadius: '40rpx', padding: '48rpx', width: '100%', alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', fontSize: '40rpx', color: '#fff', marginBottom: '24rpx', display: 'block' }}>{T('reflDeleteConfirm')}</Text>
            <View style={{ display: 'flex', gap: '16rpx', width: '100%' }}>
              <View onClick={() => setConfirmDel(null)} style={{ flex: 1, border: '1rpx solid rgba(255,255,255,.2)', borderRadius: '24rpx', padding: '24rpx', alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,.5)', fontSize: '40rpx', textAlign: 'center', display: 'block' }}>{T('cancel')}</Text>
              </View>
              <View onClick={() => { if (confirmDel) store.deleteReflection(confirmDel); setConfirmDel(null); }}
                style={{ flex: 1, background: COLORS.RED, borderRadius: '24rpx', padding: '24rpx', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: '40rpx', textAlign: 'center', display: 'block' }}>{T('confirm')}</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

