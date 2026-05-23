'use client';

import { useState, useMemo } from 'react';
import { MIND_COLORS, TAGS_PRESET, MOODS } from '@egoless-do/core';
import type { Mood } from '@egoless-do/core';
import { useTheme, useT, cs, useCachedStyle } from './helpers';
import { useWebStore } from '../store/useWebStore';

export default function ReflectionsTab({ showNew, setShowNew, content, setContent, selTags, setSelTags, mood, setMood, colorIdx, setColorIdx }: {
  showNew: boolean; setShowNew: (v: boolean) => void;
  content: string; setContent: (v: string) => void;
  selTags: string[]; setSelTags: React.Dispatch<React.SetStateAction<string[]>>;
  mood: string; setMood: (v: string) => void;
  colorIdx: number; setColorIdx: (v: number) => void;
}) {
  const store = useWebStore();
  const { TH, P } = useTheme();
  const T = useT();
  const [filterTag, setFilterTag] = useState('');
  const [showError, setShowError] = useState(false);

  const allTags = useMemo(() => [...new Set(store.reflections.flatMap((r) => r.tags))], [store.reflections]);
  const filtered = useMemo(() => 
    filterTag ? store.reflections.filter((r) => r.tags.includes(filterTag)) : store.reflections,
    [filterTag, store.reflections]
  );
  const habitTags = useMemo(() => store.habits.filter((h) => h.createTag).map((h) => `#${h.name}`), [store.habits]);
  const allTagOptions = useMemo(() => [...TAGS_PRESET, ...habitTags], [habitTags]);

  const topTag = useMemo(() => {
    if (allTags.length === 0) return '--';
    const tagCounts: Record<string, number> = {};
    store.reflections.forEach(r => r.tags.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
    return allTags.reduce((a, b) => (tagCounts[a] || 0) > (tagCounts[b] || 0) ? a : b);
  }, [store.reflections, allTags]);

  const consecutiveDays = useMemo(() => {
    if (store.reflections.length === 0) return 0;
    const days = new Set(store.reflections.map(r => new Date(r.timestamp).toDateString()));
    let streak = 0;
    let date = new Date();
    while (days.has(date.toDateString())) {
      streak++;
      date.setDate(date.getDate() - 1);
    }
    return streak;
  }, [store.reflections]);

  const mindByDay = useMemo(() => {
    const m: Record<string, typeof store.reflections> = {};
    filtered.forEach((r) => {
      const d = new Date(r.timestamp).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
      if (!m[d]) m[d] = []; m[d].push(r);
    });
    return m;
  }, [filtered]);

  const cardStyle = useCachedStyle(() => ({ ...cs(TH), padding: '12px 16px', marginBottom: 12 }), [TH]);

  const handleAddReflection = () => {
    if (content.length > 20) {
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
      return;
    }
    if (content.trim()) {
      try {
        store.addReflection({ content, tags: selTags, mood: mood as Mood, colorIdx });
        setContent('');
        setSelTags([]);
        setMood('');
        setShowNew(false);
      } catch (e) {
        setShowError(true);
        setTimeout(() => setShowError(false), 3000);
      }
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: TH.text }}>{T('mindPulse')}</div>
        <button onClick={() => setShowNew(true)} style={{ padding: '6px 16px', borderRadius: 20, border: 'none', background: P, color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>+ {T('newReflection')}</button>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {[{ t: T('habitStatusAll'), active: !filterTag, fn: () => setFilterTag('') } as const, ...allTags.map((t) => ({ t, active: filterTag === t, fn: () => setFilterTag((f) => f === t ? '' : t) } as const))].map(({ t, active, fn }) => (
          <button key={t} onClick={fn} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 16, cursor: 'pointer', border: '1px solid', background: active ? P : 'transparent', color: active ? '#fff' : P, borderColor: P }}>{t}</button>
        ))}
      </div>

      <div style={cardStyle as React.CSSProperties}>
        <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: P }}>{store.reflections.length}</div>
            <div style={{ fontSize: 16, color: TH.sub }}>{T('reflTotal')}</div>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: P }}>{topTag}</div>
            <div style={{ fontSize: 16, color: TH.sub }}>{T('reflTopTag')}</div>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: P }}>{consecutiveDays}</div>
            <div style={{ fontSize: 16, color: TH.sub }}>{T('reflStreak')}</div>
          </div>
        </div>
      </div>

      {showError && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#EF4444', color: '#fff', padding: '12px 24px', borderRadius: 12, zIndex: 400, fontSize: 16, fontWeight: 600 }}>
          {T('insightTooLong')}
        </div>
      )}

      {Object.entries(mindByDay).map(([day, items]) => (
        <div key={day}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, marginTop: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 5, background: P, flexShrink: 0 }} />
            <div style={{ fontSize: 16, fontWeight: 600, color: TH.sub }}>{day}</div>
            <div style={{ flex: 1, height: 1, background: TH.border }} />
          </div>
          {items.map((r) => {
            const isToday = new Date(r.timestamp).toDateString() === new Date().toDateString();
            return (
            <div key={r.id} style={{ background: `linear-gradient(135deg,${r.colors[0]},${r.colors[1]})`, borderRadius: 18, padding: 18, marginBottom: 10, marginLeft: 20, position: 'relative', overflow: 'hidden' }}>
              {isToday && <button onClick={() => { if (confirm(T('confirmDeleteReflection'))) store.deleteReflection(r.id); }} style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, border: 'none', background: 'rgba(0,0,0,.25)', color: 'rgba(255,255,255,.7)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>×</button>}
              <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,.05)', transform: 'translate(20px,-20px)' }} />
              <div style={{ fontSize: 16, lineHeight: 1.7, marginBottom: 10, color: '#fff' }}>{r.content}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {r.tags.map((tag) => <span key={tag} style={{ fontSize: 16, padding: '2px 8px', borderRadius: 10, background: 'rgba(255,255,255,.2)', color: 'rgba(255,255,255,.9)' }}>{tag}</span>)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 16, color: 'rgba(255,255,255,.6)' }}>{r.mood}</span>
                <span style={{ fontSize: 16, color: 'rgba(255,255,255,.6)' }}>{new Date(r.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          );
        })}
        </div>
      ))}

      {showNew && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setShowNew(false); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 390, background: TH.cardSolid, borderRadius: '24px 24px 0 0', padding: '24px 24px 80px', maxHeight: '88vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: TH.text }}>{T('newReflection')}</div>
              <button onClick={() => setShowNew(false)} style={{ background: 'transparent', border: 'none', fontSize: 22, color: TH.sub, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {MIND_COLORS.map((c, i) => (
                <div key={i} onClick={() => setColorIdx(i)} style={{ width: 26, height: 26, borderRadius: 13, background: `linear-gradient(135deg,${c[0]},${c[1]})`, cursor: 'pointer', border: colorIdx === i ? '3px solid #fff' : '3px solid transparent', flexShrink: 0 }} />
              ))}
            </div>
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder={T('reflectionPlaceholder')}
                style={{ width: '100%', minHeight: 90, background: TH.card, border: `1px solid ${content.length > 20 ? '#EF4444' : TH.border}`, borderRadius: 12, padding: 12, color: TH.text, fontSize: 16, resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
              <div style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 16, color: content.length > 20 ? '#EF4444' : TH.sub }}>
                {content.length}/20
              </div>
            </div>
            <div style={{ fontSize: 16, color: TH.sub, marginBottom: 8 }}>{T('addTags')}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {allTagOptions.map((tag) => (
                <button key={tag} onClick={() => setSelTags((ts) => ts.includes(tag) ? ts.filter((x) => x !== tag) : [...ts, tag])}
                  style={{ padding: '4px 12px', borderRadius: 20, fontSize: 16, cursor: 'pointer', border: '1px solid', background: selTags.includes(tag) ? P : 'transparent', color: selTags.includes(tag) ? '#fff' : P, borderColor: P }}>{tag}</button>
              ))}
            </div>
            <div style={{ fontSize: 16, color: TH.sub, marginBottom: 8 }}>{T('mood')}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
              {MOODS.map((m) => (
                <button key={m} onClick={() => setMood(m)}
                  style={{ padding: '5px 12px', borderRadius: 16, fontSize: 16, cursor: 'pointer', border: '1px solid', background: mood === m ? P : 'transparent', color: mood === m ? '#fff' : P, borderColor: P }}>{m}</button>
              ))}
            </div>
            <button onClick={handleAddReflection}
              style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: P, color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>{T('saveReflection')}</button>
          </div>
        </div>
      )}
    </>
  );
}
