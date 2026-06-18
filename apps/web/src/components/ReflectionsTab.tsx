'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { MIND_COLORS_EXTENDED, TAGS_PRESET, MOODS, COLORS, ensureOrderContains, FONT_BODY, FONT_BUTTON, FONT_TITLE, FONT_SUB, FONT_SMALL, FONT_TINY, FONT_CLOSE, dateStr, REFLECTION_CATEGORIES, highlightSearchMatch } from '@egoless-do/core';
import { useTheme, useT, cs, useCachedStyle } from './helpers';
import { useWebStore } from '../store/useWebStore';
import { useOverlay } from './useOverlay';
import { useReflections } from './useReflections';
import LineChart from './charts/LineChart';
import { Link, X, Settings, Eye, EyeOff, ClipboardList, ExternalLink, TrendingUp, Grid3x3, Network, Bookmark, ArrowLeft, Pin } from 'lucide-react';
import TagManagerPanel from './TagManagerPanel';
import MoodManagerPanel from './MoodManagerPanel';

const MAX_REFLECTION_LENGTH = 200;
const DELETE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function parseColors(c: unknown): [string, string] | null {
  if (Array.isArray(c) && c.length >= 2) return c as [string, string];
  if (typeof c === 'string') { try { const p = JSON.parse(c); return Array.isArray(p) && p.length >= 2 ? p as [string, string] : null; } catch { return null; } }
  return null;
}

// ─── Main ReflectionsTab ──────────────────────────────────────────
export default function ReflectionsTab({ newMindTrigger }: { newMindTrigger?: number }) {
  const [showNew, setShowNew] = useState(false);
  const [content, setContent] = useState('');
  const [selTags, setSelTags] = useState<string[]>([]);
  const [mood, setMood] = useState('');
  const [link, setLink] = useState('');
  const [colorIdx, setColorIdx] = useState(0);
  const [category, setCategory] = useState('');
  const lastTrigger = useRef(0);

  // Edit state
  const [editId, setEditId] = useState<string|null>(null);
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editMood, setEditMood] = useState('');
  const [editLink, setEditLink] = useState('');
  const [editColorIdx, setEditColorIdx] = useState(0);
  const [editCategory, setEditCategory] = useState('');

  // Action menu state (right-click context menu)
  const [actionMenuId, setActionMenuId] = useState<string|null>(null);
  const [actionMenuPos, setActionMenuPos] = useState({ x: 0, y: 0 });

  // Manager panel state
  const [showTagManager, setShowTagManager] = useState(false);
  const [showMoodManager, setShowMoodManager] = useState(false);

  const store = useWebStore();
  const { TH, P } = useTheme();
  const T = useT();

  // Create plan item state
  const [showCreatePlanItem, setShowCreatePlanItem] = useState(false);
  const [selectedReflectionId, setSelectedReflectionId] = useState<string | null>(null);
  const [planItemName, setPlanItemName] = useState('');
  const [planItemDescription, setPlanItemDescription] = useState('');
  const [planItemTargetMetric, setPlanItemTargetMetric] = useState('');
  const [planItemStartDate, setPlanItemStartDate] = useState(() => {
    const today = dateStr();
    const activePlan = store.getActivePlan();
    if (activePlan) {
      return today >= activePlan.startDate ? today : activePlan.startDate;
    }
    return today;
  });
  const [planItemEndDate, setPlanItemEndDate] = useState(() => {
    const activePlan = store.getActivePlan();
    if (activePlan) return activePlan.endDate;
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [planItemPriority, setPlanItemPriority] = useState<'high' | 'medium' | 'low'>('medium');

  // Open new-mind form when FAB triggers
  useEffect(() => {
    if (newMindTrigger !== undefined && newMindTrigger !== lastTrigger.current) {
      lastTrigger.current = newMindTrigger;
      setShowNew(true);
    }
  }, [newMindTrigger]);
  const overlay = useOverlay();
  const [showError, setShowError] = useState(false);
  const showErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [detailId, setDetailId] = useState<string|null>(null);

  // Use the shared hook for all filter/computed state
  const {
    filters, setFilters,
    searchInput, setSearchInput,
    showDeletedTags, setShowDeletedTags,
    showInsights, setShowInsights,
    insightsTab, setInsightsTab,
    moodTrendDays, setMoodTrendDays,
    toggleTag, toggleMood, applyCollection, clearAllFilters, removeFilter,
    activeFilters, hasActiveFilters,
    allTags, allUsedTags, deletedTagsWithData, visibleTags,
    allTagOptions, allMoodOptions,
    filtered, byDay: mindByDay,
    dynamicTagCounts, dynamicMoodCounts,
    totalCount, topTag, streakDays: consecutiveDays,
    sparklineData, moodStats, allMoods,
    moodTrend, heatmapData, tagGraph, smartCollections, tagFrequency,
  } = useReflections();

  const cardStyle = useCachedStyle(() => ({ ...cs(TH), padding: '12px 16px', marginBottom: 12 }), [TH]);

  useEffect(() => () => { if (showErrorTimerRef.current) clearTimeout(showErrorTimerRef.current); }, []);

  const scheduleHideError = () => {
    if (showErrorTimerRef.current) clearTimeout(showErrorTimerRef.current);
    showErrorTimerRef.current = setTimeout(() => setShowError(false), 3000);
  };

  const handleAddReflection = () => {
    if (content.length > MAX_REFLECTION_LENGTH) {
      setShowError(true);
      scheduleHideError();
      return;
    }
    if (content.trim()) {
      try {
        // Add category tag if selected
        const categoryTag = category ? `#${REFLECTION_CATEGORIES.find(c => c.key === category)?.label}` : '';
        const finalTags = categoryTag && !selTags.includes(categoryTag) ? [categoryTag, ...selTags] : selTags;
        store.addReflection({ content, tags: finalTags, mood, colorIdx, link: link.trim() || undefined });
        setContent('');
        setSelTags([]);
        setMood('');
        setLink('');
        setCategory('');
        setShowNew(false);
      } catch (e) {
        setShowError(true);
        scheduleHideError();
      }
    }
  };

  const openEdit = (r: any) => {
    setEditId(r.id);
    setEditContent(r.content || '');
    setEditTags(r.tags || []);
    setEditMood(r.mood || '');
    setEditLink(r.link || '');
    const bgIdx = MIND_COLORS_EXTENDED.findIndex(c => c[0] === (parseColors(r.colors)?.[0]));
    setEditColorIdx(bgIdx >= 0 ? bgIdx : 0);
    const cat = REFLECTION_CATEGORIES.find(c => r.tags?.includes(`#${c.label}`));
    setEditCategory(cat?.key || '');
  };

  const saveEdit = () => {
    if (!editId || !editContent.trim()) return;
    const idx = Math.min(Math.max(editColorIdx, 0), MIND_COLORS_EXTENDED.length - 1);
    const categoryTag = editCategory ? `#${REFLECTION_CATEGORIES.find(c => c.key === editCategory)?.label}` : '';
    const oldCategoryTags = REFLECTION_CATEGORIES.map(c => `#${c.label}`);
    let finalTags = editTags.filter(t => !oldCategoryTags.includes(t));
    if (categoryTag) finalTags = [categoryTag, ...finalTags];

    store.updateReflection(editId, {
      content: editContent,
      tags: finalTags,
      mood: editMood,
      link: editLink.trim() || undefined,
      colors: MIND_COLORS_EXTENDED[idx] as unknown as readonly [string, string],
    });
    setEditId(null);
  };

  const cancelEdit = () => {
    setEditId(null);
    setShowTagManager(false);
    setShowMoodManager(false);
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: FONT_BODY, fontWeight: 600, color: TH.text }}>{T('mindPulse')}</div>
        <button onClick={() => setShowNew(true)} style={{ padding: '6px 16px', borderRadius: 20, border: 'none', background: P, color: '#fff', fontSize: FONT_BODY, fontWeight: 600, cursor: 'pointer' }}>+ {T('newReflection')}</button>
      </div>

      {/* Tag filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1, overflowX: 'auto', paddingBottom: 4 }}>
          {[{ t: T('reflAll'), tagKey: '', active: filters.tags.length === 0, fn: () => setFilters({ ...filters, tags: [], collectionId: undefined }), isDeleted: false } as const, ...visibleTags.map((t) => {
            const isDeleted = !allTags.includes(t);
            return { t, tagKey: t, active: filters.tags.includes(t), fn: () => toggleTag(t), isDeleted } as const;
          })].map(({ t, tagKey, active, fn, isDeleted }) => (
            <button key={tagKey || 'all'} onClick={fn} style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 20, fontSize: FONT_SMALL, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              border: isDeleted ? `1px dashed ${TH.sub}` : `1px solid ${active ? P : TH.border}`,
              background: active ? `${P}20` : TH.card,
              color: isDeleted ? TH.sub : TH.text,
              textDecoration: isDeleted ? 'line-through' : 'none',
              opacity: isDeleted ? 0.6 : 1,
            }}>
              {t}
              <span style={{ background: `${P}20`, padding: '1px 5px', borderRadius: 6, fontSize: FONT_TINY, fontWeight: 600, color: P }}>{dynamicTagCounts[tagKey] ?? 0}</span>
            </button>
          ))}
        </div>
        {deletedTagsWithData.length > 0 && (
          <button onClick={() => setShowDeletedTags(!showDeletedTags)}
            style={{ padding: '6px 8px', borderRadius: 8, border: `1px solid ${TH.border}`, background: showDeletedTags ? `${P}20` : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title={showDeletedTags ? T('hideDeletedTags') : T('showDeletedTags')}>
            {showDeletedTags ? <EyeOff size={16} color={P} /> : <Eye size={16} color={TH.sub} />}
          </button>
        )}
      </div>

      {/* Search bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, background: TH.card, borderRadius: 12, padding: '8px 12px' }}>
        <span style={{ fontSize: FONT_BODY }}>🔍</span>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={T('reflSearchPlaceholder')}
          style={{ flex: 1, background: 'transparent', border: 'none', color: TH.text, fontSize: FONT_BODY, outline: 'none' }}
        />
        {searchInput.length > 0 && (
          <button onClick={() => { setSearchInput(''); removeFilter('search'); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: TH.sub }}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Active Filters Bar */}
      {hasActiveFilters && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 4, flexWrap: 'wrap' }}>
          {activeFilters.map((f, i) => (
            <button key={`${f.key}-${f.value ?? i}`}
              onClick={() => removeFilter(f.key, f.value)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 16, fontSize: FONT_SMALL, cursor: 'pointer', border: `1px solid ${P}30`, background: `${P}15`, color: P, whiteSpace: 'nowrap' }}>
              {f.label} <X size={12} />
            </button>
          ))}
          <button onClick={clearAllFilters}
            style={{ padding: '4px 10px', borderRadius: 16, fontSize: FONT_SMALL, cursor: 'pointer', border: `1px solid ${TH.border}`, background: 'transparent', color: TH.sub, whiteSpace: 'nowrap' }}>
            {T('reflClearAll')}
          </button>
        </div>
      )}

      {/* Mood filter */}
      {allMoods.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
          {(() => {
            const moodIcon = (m: string) => m === '开心' || m === 'Happy' || m === '開心' ? '😊' : m === '平静' || m === 'Calm' || m === '平靜' ? '🌿' : m === '焦虑' || m === 'Anxious' || m === '焦慮' ? '😰' : m === '难过' || m === 'Sad' || m === '難過' ? '😢' : m === '兴奋' || m === 'Excited' || m === '興奮' ? '🎉' : m === '感恩' || m === 'Grateful' ? '🙏' : '💭';
            return [
              <button key="all-mood" onClick={() => toggleMood('')}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 20, fontSize: FONT_SMALL, cursor: 'pointer', whiteSpace: 'nowrap', border: `1px solid ${filters.moods.length === 0 ? P : TH.border}`, background: filters.moods.length === 0 ? `${P}20` : TH.card, color: TH.text }}>
                😊 {T('reflAllMoods')}
              </button>,
              ...allMoods.map(m => (
                <button key={m} onClick={() => toggleMood(m)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 20, fontSize: FONT_SMALL, cursor: 'pointer', whiteSpace: 'nowrap', border: `1px solid ${filters.moods.includes(m) ? P : TH.border}`, background: filters.moods.includes(m) ? `${P}20` : TH.card, color: TH.text }}>
                  <span>{moodIcon(m)}</span>
                  {m}
                  <span style={{ background: `${P}20`, padding: '1px 5px', borderRadius: 6, fontSize: FONT_TINY, fontWeight: 600, color: P }}>{dynamicMoodCounts[m] ?? 0}</span>
                </button>
              ))
            ];
          })()}
        </div>
      )}

      {/* Data Insights Toggle */}
      <button onClick={() => setShowInsights(!showInsights)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: TH.card, borderRadius: 12, padding: '10px 14px', marginBottom: 12, border: 'none', cursor: 'pointer' }}>
        <span style={{ color: TH.text, fontSize: FONT_BODY, fontWeight: 600 }}>{T('reflInsights')}</span>
        <span style={{ color: TH.sub }}>{showInsights ? '▲' : '▼'}</span>
      </button>

      {/* Data Insights Panel */}
      {showInsights && (
        <div style={{ background: TH.card, borderRadius: 16, padding: 16, marginBottom: 16 }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: TH.border, borderRadius: 10, padding: 3 }}>
            {([
              { key: 'stats' as const, icon: <TrendingUp size={14} />, label: T('reflInsightsStats') },
              { key: 'heatmap' as const, icon: <Grid3x3 size={14} />, label: T('reflInsightsHeatmap') },
              { key: 'mood' as const, icon: <span>😊</span>, label: T('reflInsightsMood') },
              { key: 'tags' as const, icon: <Network size={14} />, label: T('reflInsightsTags') },
            ]).map(tab => (
              <button key={tab.key} onClick={() => setInsightsTab(tab.key)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '6px 8px', borderRadius: 8, fontSize: FONT_SMALL, fontWeight: 600, cursor: 'pointer', border: 'none', background: insightsTab === tab.key ? TH.cardSolid : 'transparent', color: insightsTab === tab.key ? TH.text : TH.sub, transition: 'all 0.2s' }}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Stats tab */}
          {insightsTab === 'stats' && (
            <>
              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: P }}>{sparklineData.reduce((a, b) => a + b, 0)}</div>
                  <div style={{ fontSize: FONT_SMALL, color: TH.sub }}>{T('reflRecent7Days')}</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: P }}>{totalCount}</div>
                  <div style={{ fontSize: FONT_SMALL, color: TH.sub }}>{T('reflTotal')}</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: P }}>{consecutiveDays}</div>
                  <div style={{ fontSize: FONT_SMALL, color: TH.sub }}>{T('reflConsecutive')}</div>
                </div>
              </div>
              {/* Mood Distribution */}
              {moodStats.length > 0 && (
                <>
                  <div style={{ fontSize: FONT_SUB, fontWeight: 600, color: TH.text, marginBottom: 10 }}>{T('reflMoodDistribution')}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {moodStats.map(([moodName, count]) => {
                      const maxCount = moodStats[0]?.[1] ?? 1;
                      const widthPercent = (count / maxCount) * 100;
                      return (
                        <div key={moodName} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: TH.text, fontSize: FONT_SUB, width: 60 }}>{moodName}</span>
                          <div style={{ flex: 1, height: 8, background: TH.border, borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ width: `${widthPercent}%`, height: '100%', background: P, borderRadius: 4, transition: 'width 0.3s' }} />
                          </div>
                          <span style={{ color: TH.sub, fontSize: FONT_SMALL, width: 24, textAlign: 'right' }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}

          {/* Heatmap tab */}
          {insightsTab === 'heatmap' && (
            <>
              <div style={{ fontSize: FONT_SUB, fontWeight: 600, color: TH.text, marginBottom: 10 }}>{T('reflHeatmapTitle')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 8 }}>
                {heatmapData.map((day, idx) => {
                  const opacity = day.count === 0 ? 0.1 : 0.3 + Math.min(day.count / 3, 0.7);
                  return (
                    <div key={idx} title={`${day.date}: ${day.count}`} style={{ width: '100%', aspectRatio: 1, borderRadius: 3, background: day.count > 0 ? P : TH.border, opacity, transition: 'opacity 0.2s' }} />
                  );
                })}
              </div>
            </>
          )}

          {/* Mood trend tab */}
          {insightsTab === 'mood' && (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {[7, 30, 90].map(d => (
                  <button key={d} onClick={() => setMoodTrendDays(d)}
                    style={{ padding: '4px 12px', borderRadius: 12, fontSize: FONT_SMALL, cursor: 'pointer', border: `1px solid ${P}`, background: moodTrendDays === d ? P : 'transparent', color: moodTrendDays === d ? '#fff' : P }}>
                    {d}{T('days')}
                  </button>
                ))}
              </div>
              {moodTrend.length > 0 ? (
                <LineChart data={moodTrend.map(p => ({ label: p.date.slice(5), value: p.avgScore }))} color={P} height={160} showArea />
              ) : (
                <div style={{ color: TH.sub, fontSize: FONT_SUB, textAlign: 'center', padding: 20 }}>{T('reflNoMoodData')}</div>
              )}
            </>
          )}

          {/* Tags tab */}
          {insightsTab === 'tags' && (
            <>
              <div style={{ fontSize: FONT_SUB, fontWeight: 600, color: TH.text, marginBottom: 10 }}>{T('reflTagCloud')}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {tagFrequency.map(([tag, count]) => {
                  const maxCount = tagFrequency[0]?.[1] ?? 1;
                  const scale = count / maxCount;
                  const fontSize = 12 + scale * 8;
                  return (
                    <span key={tag} style={{ padding: '4px 10px', borderRadius: 12, background: `${P}${Math.round(scale * 40 + 10).toString(16).padStart(2, '0')}`, color: P, fontSize, fontWeight: scale > 0.5 ? 700 : 400, transition: 'all 0.2s' }}>
                      {tag}
                    </span>
                  );
                })}
              </div>
              {/* Tag co-occurrence */}
              {tagGraph.edges.length > 0 && (
                <>
                  <div style={{ fontSize: FONT_SUB, fontWeight: 600, color: TH.text, marginBottom: 10 }}>{T('reflTagRelations')}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {tagGraph.edges.slice(0, 8).map((edge, idx) => {
                      const source = tagGraph.nodes.find(n => n.tag === edge.source);
                      const target = tagGraph.nodes.find(n => n.tag === edge.target);
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: FONT_SMALL, color: TH.sub }}>
                          <span style={{ color: P }}>{source?.tag ?? edge.source}</span>
                          <span style={{ flex: 1, height: 1, background: TH.border }} />
                          <span style={{ fontSize: FONT_TINY, color: TH.sub }}>{edge.weight}</span>
                          <span style={{ flex: 1, height: 1, background: TH.border }} />
                          <span style={{ color: P }}>{target?.tag ?? edge.target}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      <div style={cardStyle as React.CSSProperties}>
        <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: P }}>{totalCount}</div>
            <div style={{ fontSize: FONT_BODY, color: TH.sub }}>{T('reflTotal')}</div>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: FONT_BODY, color: P }}>{topTag}</div>
            <div style={{ fontSize: FONT_BODY, color: TH.sub }}>{T('reflTopTag')}</div>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: P }}>{consecutiveDays}</div>
            <div style={{ fontSize: FONT_BODY, color: TH.sub }}>{T('reflStreak')}</div>
          </div>
        </div>
      </div>

      {showError && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#EF4444', color: '#fff', padding: '12px 24px', borderRadius: 12, zIndex: 400, fontSize: FONT_BODY, fontWeight: 600 }}>
          {T('insightTooLong')}
        </div>
      )}

      {Object.entries(mindByDay).map(([day, items]) => (
        <div key={day}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, marginTop: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 5, background: P, flexShrink: 0 }} />
            <div style={{ fontSize: FONT_BODY, fontWeight: 600, color: TH.sub }}>{day}</div>
            <div style={{ flex: 1, height: 1, background: TH.border }} />
          </div>
          {items.map((r) => {
            const _c = parseColors(r.colors);
            const bgColor = _c?.[0] || MIND_COLORS_EXTENDED[0][0];
            const bgColor2 = _c?.[1] || MIND_COLORS_EXTENDED[0][1];
            const linkedPlanItem = r.linkedPlanItemId
              ? (store.planItems ?? []).find(i => i.id === r.linkedPlanItemId && !i.deleted)
              : null;
            const contentText = r.content;
            return (
            <div key={r.id}
              onContextMenu={(e) => { e.preventDefault(); setActionMenuId(r.id); setActionMenuPos({ x: e.clientX, y: e.clientY }); }}
              onClick={() => setDetailId(r.id)}
              style={{ background: `linear-gradient(135deg,${bgColor},${bgColor2})`, borderRadius: 18, padding: 18, marginBottom: 10, marginLeft: 20, position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', transform: 'translateY(0)' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,.05)', transform: 'translate(20px,-20px)' }} />
              {linkedPlanItem && (
                <div
                  onClick={(e) => { e.stopPropagation(); overlay.open('planDetail', { planId: linkedPlanItem.planId }); }}
                  title={`${T('reflItemPlanLink')}: ${linkedPlanItem.name}`}
                  style={{ position: 'absolute', top: 10, right: 10, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 8, background: 'rgba(255,255,255,.2)', cursor: 'pointer', zIndex: 1 }}
                >
                  <ExternalLink size={14} color="rgba(255,255,255,.9)" />
                  <span style={{ fontSize: FONT_SMALL, color: 'rgba(255,255,255,.9)' }}>{linkedPlanItem.name.slice(0, 10)}</span>
                </div>
              )}
              <div style={{ fontSize: FONT_BODY, lineHeight: 1.7, marginBottom: 10, color: '#fff', paddingRight: linkedPlanItem ? 120 : 0 }}>
                {filters.search.trim() ? (
                  highlightSearchMatch(contentText, filters.search).map((seg, i) => (
                    seg.highlight
                      ? <mark key={i} style={{ background: 'rgba(255,255,0,.4)', color: '#fff', padding: 0 }}>{seg.text}</mark>
                      : <span key={i}>{seg.text}</span>
                  ))
                ) : contentText.length > 80 ? (
                  <>{contentText.slice(0, 80)}...</>
                ) : contentText}
              </div>
              {r.link && /^(https?:\/\/|mailto:)/i.test(r.link) && (
                <a href={r.link} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: FONT_SUB, color: 'rgba(255,255,255,.7)', textDecoration: 'underline', marginBottom: 8 }}>
                  <Link size={14} style={{verticalAlign:'middle',marginRight:4}} />{r.link}
                </a>
              )}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {r.tags.map((tag) => {
                  const cat = REFLECTION_CATEGORIES.find(c => `#${c.label}` === tag);
                  return (
                    <span key={tag} style={{ fontSize: FONT_BODY, padding: '2px 8px', borderRadius: 10, background: cat ? `${cat.color}40` : 'rgba(255,255,255,.2)', color: 'rgba(255,255,255,.9)' }}>
                      {cat ? `${cat.icon} ${tag}` : tag}
                    </span>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: FONT_BODY, color: 'rgba(255,255,255,.6)' }}>{r.mood}</span>
                <span style={{ fontSize: FONT_BODY, color: 'rgba(255,255,255,.6)' }}>{new Date(r.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
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
              <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text }}>{T('newReflection')}</div>
              <button onClick={() => setShowNew(false)} style={{ background: 'transparent', border: 'none', fontSize: FONT_CLOSE, color: TH.sub, cursor: 'pointer' }}><X size={22} /></button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {MIND_COLORS_EXTENDED.map((c, i) => (
                <div key={i} onClick={() => setColorIdx(i)} style={{ width: 28, height: 28, borderRadius: '50%', background: colorIdx === i ? c[0] : 'transparent', padding: colorIdx === i ? 2 : 0, cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: `linear-gradient(135deg,${c[0]},${c[1]})`, border: colorIdx === i ? '2px solid #fff' : 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
            {/* Category */}
            <div style={{ fontSize: FONT_BODY, color: TH.sub, marginBottom: 8 }}>{T('reflCategory')}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {REFLECTION_CATEGORIES.map(cat => (
                <button key={cat.key} onClick={() => setCategory(category === cat.key ? '' : cat.key)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, fontSize: FONT_SUB, cursor: 'pointer', border: `1px solid ${category === cat.key ? cat.color : TH.border}`, background: category === cat.key ? cat.color : 'transparent', color: category === cat.key ? '#fff' : TH.text }}>
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder={T('reflectionPlaceholder')}
                style={{ width: '100%', minHeight: 90, background: TH.card, border: `1px solid ${content.length > MAX_REFLECTION_LENGTH ? '#EF4444' : TH.border}`, borderRadius: 12, padding: 12, color: TH.text, fontSize: FONT_BODY, resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
              <div style={{ position: 'absolute', bottom: 8, right: 12, fontSize: FONT_BODY, color: content.length > MAX_REFLECTION_LENGTH ? '#EF4444' : TH.sub }}>
                {content.length}/{MAX_REFLECTION_LENGTH}
              </div>
            </div>
            <div style={{ fontSize: FONT_BODY, color: TH.sub, marginBottom: 8 }}>{T('addTags')}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {allTagOptions.map((tag) => (
                <button key={tag} onClick={() => setSelTags((ts) => ts.includes(tag) ? ts.filter((x) => x !== tag) : [...ts, tag])}
                  style={{ padding: '4px 12px', borderRadius: 20, fontSize: FONT_BODY, cursor: 'pointer', border: '1px solid', background: selTags.includes(tag) ? `${P}30` : 'transparent', color: P, borderColor: P }}>{tag}</button>
              ))}
              <button onClick={() => setShowTagManager(true)}
                style={{ padding: '4px 12px', borderRadius: 20, fontSize: FONT_BODY, cursor: 'pointer', border: '1px dashed', background: 'transparent', color: TH.sub, borderColor: TH.sub }}><Settings size={16} style={{verticalAlign:'middle'}} /></button>
            </div>
            <div style={{ fontSize: FONT_BODY, color: TH.sub, marginBottom: 8 }}>{T('mood')}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
              {allMoodOptions.map((m) => (
                <button key={m} onClick={() => setMood(mood === m ? '' : m)}
                  style={{ padding: '4px 12px', borderRadius: 20, fontSize: FONT_BODY, cursor: 'pointer', border: '1px solid', background: mood === m ? `${P}30` : 'transparent', color: P, borderColor: P }}>{m}</button>
              ))}
              <button onClick={() => setShowMoodManager(true)}
                style={{ padding: '4px 12px', borderRadius: 20, fontSize: FONT_BODY, cursor: 'pointer', border: '1px dashed', background: 'transparent', color: TH.sub, borderColor: TH.sub }}><Settings size={16} style={{verticalAlign:'middle'}} /></button>
            </div>
            <button onClick={handleAddReflection}
              style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: P, color: '#fff', fontWeight: 700, fontSize: FONT_BODY, cursor: 'pointer' }}>{T('saveReflection')}</button>
          </div>
        </div>
      )}

      {/* Edit reflection modal */}
      {editId && (
        <div onClick={(e) => { if (e.target === e.currentTarget) cancelEdit(); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 390, background: TH.cardSolid, borderRadius: '24px 24px 0 0', padding: '24px 24px 80px', maxHeight: '88vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text }}>{T('reflEditTitle')}</div>
              <button onClick={cancelEdit} style={{ background: 'transparent', border: 'none', fontSize: FONT_CLOSE, color: TH.sub, cursor: 'pointer' }}><X size={22} /></button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {MIND_COLORS_EXTENDED.map((c, i) => (
                <div key={i} onClick={() => setEditColorIdx(i)} style={{ width: 28, height: 28, borderRadius: '50%', background: editColorIdx === i ? c[0] : 'transparent', padding: editColorIdx === i ? 2 : 0, cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: `linear-gradient(135deg,${c[0]},${c[1]})`, border: editColorIdx === i ? '2px solid #fff' : 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
            {/* Category */}
            <div style={{ fontSize: FONT_BODY, color: TH.sub, marginBottom: 8 }}>{T('reflCategory')}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {REFLECTION_CATEGORIES.map(cat => (
                <button key={cat.key} onClick={() => setEditCategory(editCategory === cat.key ? '' : cat.key)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, fontSize: FONT_SUB, cursor: 'pointer', border: `1px solid ${editCategory === cat.key ? cat.color : TH.border}`, background: editCategory === cat.key ? cat.color : 'transparent', color: editCategory === cat.key ? '#fff' : TH.text }}>
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} placeholder={T('reflectionPlaceholder')}
                style={{ width: '100%', minHeight: 90, background: TH.card, border: `1px solid ${editContent.length > MAX_REFLECTION_LENGTH ? '#EF4444' : TH.border}`, borderRadius: 12, padding: 12, color: TH.text, fontSize: FONT_BODY, resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
              <div style={{ position: 'absolute', bottom: 8, right: 12, fontSize: FONT_BODY, color: editContent.length > MAX_REFLECTION_LENGTH ? '#EF4444' : TH.sub }}>
                {editContent.length}/{MAX_REFLECTION_LENGTH}
              </div>
            </div>
            <div style={{ fontSize: FONT_BODY, color: TH.sub, marginBottom: 8 }}>{T('addTags')}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {allTagOptions.map((tag) => (
                <button key={tag} onClick={() => setEditTags((ts) => ts.includes(tag) ? ts.filter((x) => x !== tag) : [...ts, tag])}
                  style={{ padding: '4px 12px', borderRadius: 20, fontSize: FONT_BODY, cursor: 'pointer', border: '1px solid', background: editTags.includes(tag) ? `${P}30` : 'transparent', color: P, borderColor: P }}>{tag}</button>
              ))}
              <button onClick={() => setShowTagManager(true)}
                style={{ padding: '6px 12px', borderRadius: 16, border: `1px dashed ${TH.border}`, background: 'transparent', color: TH.sub, cursor: 'pointer' }}>
                <Settings size={16} />
              </button>
            </div>
            <div style={{ fontSize: FONT_BODY, color: TH.sub, marginBottom: 8 }}>{T('mood')}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
              {allMoodOptions.map((m) => (
                <button key={m} onClick={() => setEditMood(editMood === m ? '' : m)}
                  style={{ padding: '4px 12px', borderRadius: 20, fontSize: FONT_BODY, cursor: 'pointer', border: '1px solid', background: editMood === m ? `${P}30` : 'transparent', color: P, borderColor: P }}>{m}</button>
              ))}
              <button onClick={() => setShowMoodManager(true)}
                style={{ padding: '4px 12px', borderRadius: 20, fontSize: FONT_BODY, cursor: 'pointer', border: '1px dashed', background: 'transparent', color: TH.sub, borderColor: TH.sub }}><Settings size={16} style={{verticalAlign:'middle'}} /></button>
            </div>
            <button onClick={saveEdit}
              style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: P, color: '#fff', fontWeight: 700, fontSize: FONT_BODY, cursor: 'pointer' }}>{T('reflSaveEdit')}</button>
          </div>
        </div>
      )}

      {/* Tag Manager Panel */}
      {showTagManager && <TagManagerPanel onClose={() => setShowTagManager(false)} />}

      {/* Mood Manager Panel */}
      {showMoodManager && <MoodManagerPanel onClose={() => setShowMoodManager(false)} />}

      {/* Context Menu */}
      {actionMenuId && (
        <>
          <div onClick={() => setActionMenuId(null)} style={{ position: 'fixed', inset: 0, zIndex: 500 }} />
          <div style={{
            position: 'fixed', left: actionMenuPos.x, top: actionMenuPos.y,
            background: TH.cardSolid, borderRadius: 12, padding: 12,
            boxShadow: '0 4px 20px rgba(0,0,0,.3)', zIndex: 501, minWidth: 160,
          }}>
            <button onClick={() => { const r = (store.reflections ?? []).find(r => r.id === actionMenuId && !r.deleted); if (r) openEdit(r); setActionMenuId(null); }}
              style={{ width: '100%', padding: '10px 16px', border: 'none', borderRadius: 8, background: TH.card, color: TH.text, fontSize: FONT_BODY, fontWeight: 600, cursor: 'pointer', marginBottom: 8 }}>
              {T('reflEditTitle')}
            </button>
            {/* Plan task link/unlink */}
            {(() => {
              const r = (store.reflections ?? []).find(r => r.id === actionMenuId && !r.deleted);
              const isLinked = r?.linkedPlanItemId;
              return isLinked ? (
                <button onClick={() => {
                  if (r && confirm(T('reflUnlinkConfirm'))) {
                    if (r.linkedPlanItemId) {
                      store.deletePlanItem(r.linkedPlanItemId);
                    }
                    store.unlinkReflectionFromPlanItem(r.id);
                  }
                  setActionMenuId(null);
                }}
                  style={{ width: '100%', padding: '10px 16px', border: 'none', borderRadius: 8, background: TH.card, color: TH.text, fontSize: FONT_BODY, fontWeight: 600, cursor: 'pointer', marginBottom: 8 }}>
                  {T('reflUnlinkAction')}
                </button>
              ) : (
                <button onClick={() => {
                  const activePlan = store.getActivePlan();
                  if (!activePlan) {
                    alert(T('reflNoActivePlan'));
                    setActionMenuId(null);
                    return;
                  }
                  const r = (store.reflections ?? []).find(x => x.id === actionMenuId && !x.deleted);
                  const lines = (r?.content ?? '').split('\n').filter((l: string) => l.trim());
                  const defaultName = lines[0]?.slice(0, 50) || r?.content?.slice(0, 50) || '';
                  setSelectedReflectionId(actionMenuId);
                  setPlanItemName(defaultName);
                  setPlanItemDescription(r?.content ?? '');
                  setPlanItemTargetMetric('');
                  setPlanItemPriority('medium');
                  setShowCreatePlanItem(true);
                  setActionMenuId(null);
                }}
                  style={{ width: '100%', padding: '10px 16px', border: 'none', borderRadius: 8, background: TH.card, color: TH.text, fontSize: FONT_BODY, fontWeight: 600, cursor: 'pointer', marginBottom: 8 }}>
                  {T('reflCreatePlanItem')}
                </button>
              );
            })()}
            <button onClick={async () => {
              const r = (store.reflections ?? []).find(r => r.id === actionMenuId && !r.deleted);
              if (r?.content) {
                try {
                  if (navigator.share) {
                    await navigator.share({ title: r.content.slice(0, 50), text: r.content });
                  } else {
                    await navigator.clipboard.writeText(r.content);
                  }
                } catch {}
              }
              setActionMenuId(null);
            }}
              style={{ width: '100%', padding: '10px 16px', border: 'none', borderRadius: 8, background: TH.card, color: TH.text, fontSize: FONT_BODY, fontWeight: 600, cursor: 'pointer', marginBottom: 8 }}>
              {T('reflShare')}
            </button>
            {(() => {
              const r = (store.reflections ?? []).find(r => r.id === actionMenuId && !r.deleted);
              const isWithin7Days = r && (Date.now() - r.timestamp) < DELETE_WINDOW_MS;
              return isWithin7Days ? (
                <button onClick={() => { if (confirm(T('confirmDeleteReflection'))) store.deleteReflection(actionMenuId); setActionMenuId(null); }}
                  style={{ width: '100%', padding: '10px 16px', border: 'none', borderRadius: 8, background: 'rgba(239,68,68,.15)', color: COLORS.RED, fontSize: FONT_BODY, fontWeight: 600, cursor: 'pointer' }}>
                  {T('reflDelete')}
                </button>
              ) : null;
            })()}
          </div>
        </>
      )}

      {/* Card detail overlay */}
      {detailId && (() => {
        const r = (store.reflections ?? []).find(x => x.id === detailId && !x.deleted);
        if (!r) return null;
        const linkedPlanItem = r.linkedPlanItemId
          ? (store.planItems ?? []).find(i => i.id === r.linkedPlanItemId && !i.deleted)
          : null;
        const _c2 = parseColors(r.colors);
        const bgColor = _c2?.[0] || MIND_COLORS_EXTENDED[0][0];
        const bgColor2 = _c2?.[1] || MIND_COLORS_EXTENDED[0][1];
        const isWithin7Days = (Date.now() - r.timestamp) < DELETE_WINDOW_MS;
        return (
          <div onClick={() => setDetailId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, maxHeight: '90vh', background: `linear-gradient(135deg,${bgColor},${bgColor2})`, borderRadius: 18, padding: 24, overflow: 'auto', position: 'relative' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <button onClick={() => setDetailId(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}>
                  <ArrowLeft size={22} color="#fff" />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {r.isPinned && <Pin size={14} color="#fff" />}
                  <span style={{ color: 'rgba(255,255,255,.7)', fontSize: FONT_SMALL }}>
                    {new Date(r.timestamp).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                    {' '}
                    {new Date(r.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div style={{ color: '#fff', fontSize: FONT_BODY, lineHeight: 1.8, marginBottom: 16, whiteSpace: 'pre-wrap' }}>{r.content}</div>

              {/* Tags + Mood */}
              {(r.tags.length > 0 || r.mood) && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                  {r.tags.map((tag) => (
                    <span key={tag} style={{ fontSize: FONT_SMALL, padding: '3px 10px', borderRadius: 12, background: 'rgba(255,255,255,.2)', color: '#fff' }}>{tag}</span>
                  ))}
                  {r.mood && (
                    <span style={{ fontSize: FONT_SMALL, padding: '3px 10px', borderRadius: 12, background: 'rgba(255,255,255,.15)', color: 'rgba(255,255,255,.8)' }}>{r.mood}</span>
                  )}
                </div>
              )}

              {/* Link */}
              {r.link && /^(https?:\/\/|mailto:)/i.test(r.link) && (
                <a href={r.link} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,.7)', fontSize: FONT_SMALL, textDecoration: 'underline', marginBottom: 12 }}>
                  <Link size={14} />{r.link}
                </a>
              )}

              {/* Linked plan item */}
              {linkedPlanItem && (
                <div
                  onClick={() => { setDetailId(null); overlay.open('planDetail', { planId: linkedPlanItem.planId }); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, background: 'rgba(255,255,255,.15)', padding: '8px 12px', borderRadius: 10, cursor: 'pointer' }}
                >
                  <ExternalLink size={14} color="#fff" />
                  <span style={{ color: '#fff', fontSize: FONT_SMALL }}>{linkedPlanItem.name}</span>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button onClick={() => { setDetailId(null); openEdit(r); }}
                  style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 10, background: 'rgba(255,255,255,.25)', color: '#fff', fontSize: FONT_BUTTON, fontWeight: 600, cursor: 'pointer' }}>
                  {T('reflEditTitle')}
                </button>
                <button onClick={() => { store.togglePin(r.id); }}
                  style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 10, background: 'rgba(255,255,255,.25)', color: '#fff', fontSize: FONT_BUTTON, fontWeight: 600, cursor: 'pointer' }}>
                  {r.isPinned ? T('reflUnpin') : T('reflPin')}
                </button>
                {isWithin7Days && (
                  <button onClick={() => { if (confirm(T('confirmDeleteReflection'))) { store.deleteReflection(r.id); setDetailId(null); } }}
                    style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 10, background: 'rgba(239,68,68,.4)', color: '#fff', fontSize: FONT_BUTTON, fontWeight: 600, cursor: 'pointer' }}>
                    {T('reflDelete')}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Create plan task modal */}
      {showCreatePlanItem && selectedReflectionId && (() => {
        const reflection = (store.reflections ?? []).find(r => r.id === selectedReflectionId && !r.deleted);
        if (!reflection) return null;

        const lines = reflection.content.split('\n').filter(l => l.trim());
        const defaultName = lines[0]?.slice(0, 50) || reflection.content.slice(0, 50);

        return (
        <div onClick={(e) => { if (e.target === e.currentTarget) { setShowCreatePlanItem(false); setSelectedReflectionId(null); } }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 390, background: TH.cardSolid, borderRadius: 24, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text }}>{T('reflCreatePlanItemTitle')}</div>
              <button onClick={() => setShowCreatePlanItem(false)} style={{ background: 'transparent', border: 'none', fontSize: FONT_CLOSE, color: TH.sub, cursor: 'pointer' }}><X size={22} /></button>
            </div>
            <div style={{ fontSize: FONT_BODY, color: TH.sub, marginBottom: 16 }}>
              {T('reflLinkedPlan')}: {store.getActivePlan()?.name || T('reflNoPlan')}
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: FONT_BODY, color: TH.sub, marginBottom: 6 }}>{T('reflTaskName')} *</div>
              <input
                type="text"
                value={planItemName}
                onChange={(e) => setPlanItemName(e.target.value)}
                placeholder={T('reflTaskName')}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${TH.border}`, background: TH.card, color: TH.text, fontSize: FONT_BODY, boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: FONT_BODY, color: TH.sub, marginBottom: 6 }}>{T('reflTaskTarget')} *</div>
              <input
                type="text"
                value={planItemTargetMetric}
                onChange={(e) => setPlanItemTargetMetric(e.target.value)}
                placeholder={T('reflTaskTargetPlaceholder')}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${TH.border}`, background: TH.card, color: TH.text, fontSize: FONT_BODY, boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: FONT_BODY, color: TH.sub, marginBottom: 6 }}>{T('reflTaskDesc')}</div>
              <textarea
                value={planItemDescription}
                onChange={(e) => setPlanItemDescription(e.target.value)}
                placeholder={T('reflTaskDescPlaceholder')}
                rows={3}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${TH.border}`, background: TH.card, color: TH.text, fontSize: FONT_BODY, resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: FONT_BODY, color: TH.sub, marginBottom: 6 }}>{T('reflTaskLink')}</div>
              <input
                type="text"
                value={reflection.tags.join(', ')}
                readOnly
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${TH.border}`, background: TH.card, color: TH.sub, fontSize: FONT_BODY, boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: FONT_BODY, color: TH.sub, marginBottom: 6 }}>{T('reflTaskStart')}</div>
              <input type="date" value={planItemStartDate} onChange={(e) => setPlanItemStartDate(e.target.value)}
                min={(() => { const today = dateStr(); const plan = store.getActivePlan(); const planStart = plan?.startDate ?? today; return today >= planStart ? today : planStart; })()}
                max={planItemEndDate}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${TH.border}`, background: TH.card, color: TH.text, fontSize: FONT_BODY }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: FONT_BODY, color: TH.sub, marginBottom: 6 }}>{T('reflTaskEnd')}</div>
              <input type="date" value={planItemEndDate} onChange={(e) => setPlanItemEndDate(e.target.value)}
                min={planItemStartDate}
                max={store.getActivePlan()?.endDate}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${TH.border}`, background: TH.card, color: TH.text, fontSize: FONT_BODY }} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: FONT_BODY, color: TH.sub, marginBottom: 6 }}>{T('reflTaskPriority')}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { value: 'high' as const, label: T('reflPriorityHigh'), color: '#FF4444' },
                  { value: 'medium' as const, label: T('reflPriorityMedium'), color: '#FFAA00' },
                  { value: 'low' as const, label: T('reflPriorityLow'), color: '#44AA44' },
                ].map(p => (
                  <button key={p.value} onClick={() => setPlanItemPriority(p.value)}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: `1px solid ${planItemPriority === p.value ? p.color : TH.border}`, background: planItemPriority === p.value ? `${p.color}20` : 'transparent', color: planItemPriority === p.value ? p.color : TH.text, fontSize: FONT_BODY, cursor: 'pointer' }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowCreatePlanItem(false)}
                style={{ flex: 1, padding: 14, borderRadius: 12, border: `1px solid ${TH.border}`, background: 'transparent', color: TH.text, fontSize: FONT_BODY, fontWeight: 600, cursor: 'pointer' }}>{T('cancel')}</button>
              <button onClick={() => {
                if (selectedReflectionId) {
                  const finalName = planItemName || defaultName;
                  if (!finalName.trim()) {
                    alert(T('reflTaskNameRequired'));
                    return;
                  }
                  if (!planItemTargetMetric.trim()) {
                    alert(T('reflTaskTargetRequired'));
                    return;
                  }
                  const success = store.createPlanItemFromReflection(
                    selectedReflectionId,
                    planItemStartDate,
                    planItemEndDate,
                    planItemPriority,
                    finalName,
                    planItemDescription || reflection.content,
                    planItemTargetMetric
                  );
                  if (success) {
                    setShowCreatePlanItem(false);
                    setSelectedReflectionId(null);
                    setPlanItemName('');
                    setPlanItemDescription('');
                    setPlanItemTargetMetric('');
                  }
                }
              }}
                style={{ flex: 1, padding: 14, borderRadius: 12, border: 'none', background: P, color: '#fff', fontSize: FONT_BODY, fontWeight: 700, cursor: 'pointer' }}>{T('reflTaskCreate')}</button>
            </div>
          </div>
        </div>
        );
      })()}
    </>
  );
}
