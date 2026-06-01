'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { MIND_COLORS, TAGS_PRESET, MOODS, COLORS, ensureOrderContains, FONT_BODY, FONT_BUTTON, FONT_TITLE, FONT_SUB, FONT_BADGE, FONT_CLOSE } from '@egoless-do/core';
import { useTheme, useT, cs, useCachedStyle } from './helpers';
import { useWebStore } from '../store/useWebStore';
import { Link, X, Settings, Check, Pencil, Trash2, ChevronUp, ChevronDown, Eye, EyeOff, AlertCircle, GripVertical } from 'lucide-react';

// ─── Confirm Dialog ─────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  const { TH, P } = useTheme();
  const T = useT();
  return (
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 340, background: TH.cardSolid, borderRadius: 16, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,.3)' }}>
        <div style={{ fontSize: FONT_BODY, color: TH.text, marginBottom: 20, lineHeight: 1.6 }}>{message}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '10px 16px', borderRadius: 10, border: `1px solid ${TH.border}`, background: 'transparent', color: TH.text, fontSize: FONT_BODY, fontWeight: 600, cursor: 'pointer' }}>{T('cancel')}</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '10px 16px', borderRadius: 10, border: 'none', background: COLORS.RED, color: '#fff', fontSize: FONT_BODY, fontWeight: 600, cursor: 'pointer' }}>{T('confirm')}</button>
        </div>
      </div>
    </div>
  );
}

// ─── useDragReorder (Web) ──────────────────────────────────────
function useWebDragReorder(
  orderedItems: string[],
  onReorder: (from: number, to: number) => void,
) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const startIdx = useRef(0);
  const startY = useRef(0);
  const rowHeight = 44;

  const handleMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const idx = orderedItems.indexOf(id);
    setDraggedId(id);
    setDragOverIdx(idx);
    startIdx.current = idx;
    startY.current = e.clientY;
  }, [orderedItems]);

  useEffect(() => {
    if (!draggedId) return;
    const handleMouseMove = (e: MouseEvent) => {
      const offset = Math.round((e.clientY - startY.current) / rowHeight);
      const target = Math.max(0, Math.min(orderedItems.length - 1, startIdx.current + offset));
      setDragOverIdx(target);
    };
    const handleMouseUp = () => {
      if (dragOverIdx !== null) {
        const currentIdx = orderedItems.indexOf(draggedId);
        if (currentIdx >= 0 && currentIdx !== dragOverIdx) {
          onReorder(currentIdx, dragOverIdx);
        }
      }
      setDraggedId(null);
      setDragOverIdx(null);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggedId, dragOverIdx, orderedItems, onReorder]);

  return { draggedId, dragOverIdx, handleMouseDown };
}

// ─── Tag Manager Panel ────────────────────────────────────────────
function TagManagerPanel({ onClose }: { onClose: () => void }) {
  const store = useWebStore();
  const { TH, P } = useTheme();
  const T = useT();
  const [newTag, setNewTag] = useState('');
  const [editingTag, setEditingTag] = useState<{ old: string; new: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const habitTagsList = useMemo(() => store.habits.filter(h => h.createTag).map(h => `#${h.name}`), [store.habits]);

  const orderedTags = useMemo(() => {
    const required = [...TAGS_PRESET, ...(store.customTags ?? []), ...habitTagsList];
    const order = store.allTagsOrder ?? [];
    return order.length > 0 ? ensureOrderContains(order, required) : required;
  }, [store.allTagsOrder, store.customTags, habitTagsList]);

  const handleReorder = useCallback((from: number, to: number) => {
    store.reorderAllTag(from, to);
  }, [store]);

  const { draggedId, dragOverIdx, handleMouseDown } = useWebDragReorder(orderedTags, handleReorder);

  const customTags = store.customTags ?? [];
  const presetSet = new Set(TAGS_PRESET);
  const customSet = new Set(customTags);

  const getTagSection = (tag: string): 'preset' | 'custom' | 'habit' => {
    if (presetSet.has(tag)) return 'preset';
    if (customSet.has(tag)) return 'custom';
    return 'habit';
  };

  // Real-time input validation
  const inputWords = newTag.replace('#', '').trim().split(/\s+/).filter(Boolean);
  const tagTooLong = inputWords.length > 4;
  const maxTagsReached = customTags.length >= 10;

  const handleAddTag = () => {
    if (newTag.trim()) {
      const tag = newTag.startsWith('#') ? newTag : `#${newTag}`;
      const words = tag.replace('#', '').trim().split(/\s+/);
      if (words.length > 4) { alert(T('tagTooLong')); return; }
      if (customTags.length >= 10) { alert(T('maxTagsReached')); return; }
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

  const doDeleteTag = (tag: string) => {
    store.removeCustomTag(tag);
    setConfirmDel(null);
  };

  const handleDeleteTag = (tag: string) => {
    setConfirmDel(tag);
  };

  const confirmMessage = useMemo(() => {
    if (!confirmDel) return '';
    const usedCount = store.reflections.filter(r => r.tags.includes(confirmDel)).length;
    return usedCount > 0
      ? `${T('tagDeleteConfirm')} ${T('tagUsedBy').replace('{count}', String(usedCount))}`
      : T('tagDeleteConfirm');
  }, [confirmDel, store.reflections, T]);

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 390, background: TH.cardSolid, borderRadius: 20, padding: 24, maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text }}>{T('tagManager')}</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: FONT_CLOSE, color: TH.sub, cursor: 'pointer' }}><X size={22} /></button>
        </div>

        {/* Add new tag */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder={T('newTagPlaceholder')}
            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: `1px solid ${tagTooLong || maxTagsReached ? COLORS.RED : TH.border}`, background: TH.card, color: TH.text, fontSize: FONT_BODY }} />
          <button onClick={handleAddTag}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: P, color: '#fff', fontSize: FONT_BODY, cursor: 'pointer' }}>{T('add')}</button>
        </div>
        {(tagTooLong || maxTagsReached) && (
          <div style={{ fontSize: FONT_SUB, color: COLORS.RED, marginBottom: 12 }}>
            {tagTooLong ? T('tagTooLong') : T('maxTagsReached')}
          </div>
        )}

        {/* Tag list with section headers */}
        {orderedTags.map((tag, idx, arr) => {
          const section = getTagSection(tag);
          const prevSection = idx > 0 ? getTagSection(arr[idx - 1]) : null;
          const showHeader = section !== prevSection;
          const isPreset = section === 'preset';
          const isCustom = section === 'custom';
          const isHabit = section === 'habit';
          const canEditDelete = isCustom;
          const isDragging = draggedId === tag;
          const isDropTarget = dragOverIdx === idx && draggedId !== tag;

          return (
            <div key={tag}>
              {showHeader && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 8 }}>
                  <div style={{ flex: 1, height: 1, background: TH.border }} />
                  <span style={{ fontSize: FONT_SUB, color: TH.sub, fontWeight: 600 }}>
                    {section === 'preset' ? T('tagSectionPreset') : section === 'custom' ? T('tagSectionCustom') : T('tagSectionHabit')}
                  </span>
                  <div style={{ flex: 1, height: 1, background: TH.border }} />
                </div>
              )}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0',
                borderBottom: `1px solid ${TH.border}`,
                borderLeft: isDragging ? `3px solid ${P}` : isDropTarget ? `3px solid ${P}40` : '3px solid transparent',
                background: isDragging ? `${P}10` : isDropTarget ? `${P}08` : 'transparent',
                opacity: isDragging ? 0.7 : 1,
                transition: 'background 0.15s, border-color 0.15s',
              }}>
                {editingTag?.old === tag ? (
                  <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                    <input value={editingTag.new} onChange={(e) => setEditingTag({ ...editingTag, new: e.target.value })}
                      style={{ flex: 1, padding: '4px 8px', borderRadius: 4, border: `1px solid ${TH.border}`, background: TH.card, color: TH.text, fontSize: FONT_BODY }} />
                    <button onClick={handleUpdateTag} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: COLORS.GREEN, color: '#fff', fontSize: FONT_SUB, cursor: 'pointer' }}><Check size={14} /></button>
                    <button onClick={() => setEditingTag(null)} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: COLORS.RED, color: '#fff', fontSize: FONT_SUB, cursor: 'pointer' }}><X size={14} /></button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: 6 }}>
                      <span onMouseDown={(e) => handleMouseDown(e, tag)} style={{ cursor: 'grab', display: 'flex', alignItems: 'center', color: TH.sub }} title={T('moveToTop')}>
                        <GripVertical size={14} />
                      </span>
                      <span style={{ color: TH.text, fontSize: FONT_BODY }}>{tag}</span>
                      {isPreset && <span style={{ color: TH.sub, fontSize: FONT_SUB }}>{T('preset')}</span>}
                      {isHabit && <span style={{ color: TH.sub, fontSize: FONT_SUB }}>{T('habitTag')}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <button onClick={() => store.reorderAllTag(idx, idx - 1)} disabled={idx === 0} style={{ padding: '4px', borderRadius: 4, border: 'none', background: 'transparent', color: idx === 0 ? TH.border : P, fontSize: FONT_SUB, cursor: idx === 0 ? 'default' : 'pointer' }}><ChevronUp size={16} /></button>
                      <button onClick={() => store.reorderAllTag(idx, idx + 1)} disabled={idx === arr.length - 1} style={{ padding: '4px', borderRadius: 4, border: 'none', background: 'transparent', color: idx === arr.length - 1 ? TH.border : P, fontSize: FONT_SUB, cursor: idx === arr.length - 1 ? 'default' : 'pointer' }}><ChevronDown size={16} /></button>
                      {canEditDelete && (
                        <>
                          <button onClick={() => setEditingTag({ old: tag, new: tag })} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: 'transparent', color: P, fontSize: FONT_SUB, cursor: 'pointer' }}><Pencil size={14} /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteTag(tag); }} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: 'transparent', color: COLORS.RED, fontSize: FONT_SUB, cursor: 'pointer' }}><Trash2 size={14} /></button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom confirm dialog */}
      {confirmDel && (
        <ConfirmDialog message={confirmMessage} onConfirm={() => doDeleteTag(confirmDel)} onCancel={() => setConfirmDel(null)} />
      )}
    </div>
  );
}

// ─── Mood Manager Panel ───────────────────────────────────────────
function MoodManagerPanel({ onClose }: { onClose: () => void }) {
  const store = useWebStore();
  const { TH, P } = useTheme();
  const T = useT();
  const [newMood, setNewMood] = useState('');
  const [editingMood, setEditingMood] = useState<{ old: string; new: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const orderedMoods = useMemo(() => {
    const required = [...MOODS, ...(store.customMoods ?? [])];
    const order = store.allMoodsOrder ?? [];
    return order.length > 0 ? ensureOrderContains(order, required) : required;
  }, [store.allMoodsOrder, store.customMoods]);

  const handleReorder = useCallback((from: number, to: number) => {
    store.reorderAllMood(from, to);
  }, [store]);

  const { draggedId, dragOverIdx, handleMouseDown } = useWebDragReorder(orderedMoods, handleReorder);

  const customMoods = store.customMoods ?? [];
  const presetSet = new Set(MOODS as string[]);

  const getMoodSection = (mood: string): 'preset' | 'custom' => {
    return presetSet.has(mood) ? 'preset' : 'custom';
  };

  // Real-time input validation
  const inputWords = newMood.trim().split(/\s+/).filter(Boolean);
  const moodTooLong = inputWords.length > 4;
  const maxMoodsReached = customMoods.length >= 10;

  const handleAddMood = () => {
    if (newMood.trim()) {
      const words = newMood.trim().split(/\s+/);
      if (words.length > 4) { alert(T('moodTooLong')); return; }
      if (customMoods.length >= 10) { alert(T('maxMoodsReached')); return; }
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

  const doDeleteMood = (mood: string) => {
    store.removeCustomMood(mood);
    setConfirmDel(null);
  };

  const handleDeleteMood = (mood: string) => {
    setConfirmDel(mood);
  };

  const confirmMessage = useMemo(() => {
    if (!confirmDel) return '';
    const usedCount = store.reflections.filter(r => r.mood === confirmDel).length;
    return usedCount > 0
      ? `${T('moodDeleteConfirm')} ${T('moodUsedBy').replace('{count}', String(usedCount))}`
      : T('moodDeleteConfirm');
  }, [confirmDel, store.reflections, T]);

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 390, background: TH.cardSolid, borderRadius: 20, padding: 24, maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text }}>{T('moodManager')}</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: FONT_CLOSE, color: TH.sub, cursor: 'pointer' }}><X size={22} /></button>
        </div>

        {/* Add new mood */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input value={newMood} onChange={(e) => setNewMood(e.target.value)} placeholder={T('newMoodPlaceholder')}
            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: `1px solid ${moodTooLong || maxMoodsReached ? COLORS.RED : TH.border}`, background: TH.card, color: TH.text, fontSize: FONT_BODY }} />
          <button onClick={handleAddMood}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: P, color: '#fff', fontSize: FONT_BODY, cursor: 'pointer' }}>{T('add')}</button>
        </div>
        {(moodTooLong || maxMoodsReached) && (
          <div style={{ fontSize: FONT_SUB, color: COLORS.RED, marginBottom: 12 }}>
            {moodTooLong ? T('moodTooLong') : T('maxMoodsReached')}
          </div>
        )}

        {/* Mood list with section headers */}
        {orderedMoods.map((mood, idx, arr) => {
          const section = getMoodSection(mood);
          const prevSection = idx > 0 ? getMoodSection(arr[idx - 1]) : null;
          const showHeader = section !== prevSection;
          const isPreset = section === 'preset';
          const isCustom = section === 'custom';
          const isDragging = draggedId === mood;
          const isDropTarget = dragOverIdx === idx && draggedId !== mood;

          return (
            <div key={mood}>
              {showHeader && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 8 }}>
                  <div style={{ flex: 1, height: 1, background: TH.border }} />
                  <span style={{ fontSize: FONT_SUB, color: TH.sub, fontWeight: 600 }}>
                    {section === 'preset' ? T('moodSectionPreset') : T('moodSectionCustom')}
                  </span>
                  <div style={{ flex: 1, height: 1, background: TH.border }} />
                </div>
              )}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0',
                borderBottom: `1px solid ${TH.border}`,
                borderLeft: isDragging ? `3px solid ${P}` : isDropTarget ? `3px solid ${P}40` : '3px solid transparent',
                background: isDragging ? `${P}10` : isDropTarget ? `${P}08` : 'transparent',
                opacity: isDragging ? 0.7 : 1,
                transition: 'background 0.15s, border-color 0.15s',
              }}>
                {editingMood?.old === mood ? (
                  <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                    <input value={editingMood.new} onChange={(e) => setEditingMood({ ...editingMood, new: e.target.value })}
                      style={{ flex: 1, padding: '4px 8px', borderRadius: 4, border: `1px solid ${TH.border}`, background: TH.card, color: TH.text, fontSize: FONT_BODY }} />
                    <button onClick={handleUpdateMood} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: COLORS.GREEN, color: '#fff', fontSize: FONT_SUB, cursor: 'pointer' }}><Check size={14} /></button>
                    <button onClick={() => setEditingMood(null)} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: COLORS.RED, color: '#fff', fontSize: FONT_SUB, cursor: 'pointer' }}><X size={14} /></button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: 6 }}>
                      <span onMouseDown={(e) => handleMouseDown(e, mood)} style={{ cursor: 'grab', display: 'flex', alignItems: 'center', color: TH.sub }} title={T('moveToTop')}>
                        <GripVertical size={14} />
                      </span>
                      <span style={{ color: TH.text, fontSize: FONT_BODY }}>{mood}</span>
                      {isPreset && <span style={{ color: TH.sub, fontSize: FONT_SUB }}>{T('preset')}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <button onClick={() => store.reorderAllMood(idx, idx - 1)} disabled={idx === 0} style={{ padding: '4px', borderRadius: 4, border: 'none', background: 'transparent', color: idx === 0 ? TH.border : P, fontSize: FONT_SUB, cursor: idx === 0 ? 'default' : 'pointer' }}><ChevronUp size={16} /></button>
                      <button onClick={() => store.reorderAllMood(idx, idx + 1)} disabled={idx === arr.length - 1} style={{ padding: '4px', borderRadius: 4, border: 'none', background: 'transparent', color: idx === arr.length - 1 ? TH.border : P, fontSize: FONT_SUB, cursor: idx === arr.length - 1 ? 'default' : 'pointer' }}><ChevronDown size={16} /></button>
                      {isCustom && (
                        <>
                          <button onClick={() => setEditingMood({ old: mood, new: mood })} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: 'transparent', color: P, fontSize: FONT_SUB, cursor: 'pointer' }}><Pencil size={14} /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteMood(mood); }} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: 'transparent', color: COLORS.RED, fontSize: FONT_SUB, cursor: 'pointer' }}><Trash2 size={14} /></button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom confirm dialog */}
      {confirmDel && (
        <ConfirmDialog message={confirmMessage} onConfirm={() => doDeleteMood(confirmDel)} onCancel={() => setConfirmDel(null)} />
      )}
    </div>
  );
}

// ─── Main ReflectionsTab ──────────────────────────────────────────
export default function ReflectionsTab({ newMindTrigger }: { newMindTrigger?: number }) {
  const [showNew, setShowNew] = useState(false);
  const [content, setContent] = useState('');
  const [selTags, setSelTags] = useState<string[]>([]);
  const [mood, setMood] = useState('');
  const [link, setLink] = useState('');
  const [colorIdx, setColorIdx] = useState(0);
  const lastTrigger = useRef(0);

  // Edit state
  const [editId, setEditId] = useState<string|null>(null);
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editMood, setEditMood] = useState('');
  const [editLink, setEditLink] = useState('');
  const [editColorIdx, setEditColorIdx] = useState(0);

  // Action menu state (right-click context menu)
  const [actionMenuId, setActionMenuId] = useState<string|null>(null);
  const [actionMenuPos, setActionMenuPos] = useState({ x: 0, y: 0 });

  // Manager panel state
  const [showTagManager, setShowTagManager] = useState(false);
  const [showMoodManager, setShowMoodManager] = useState(false);

  // Open new-mind form when FAB triggers
  useEffect(() => {
    if (newMindTrigger !== undefined && newMindTrigger !== lastTrigger.current) {
      lastTrigger.current = newMindTrigger;
      setShowNew(true);
    }
  }, [newMindTrigger]);
  const store = useWebStore();
  const { TH, P } = useTheme();
  const T = useT();
  const [filterTag, setFilterTag] = useState('');
  const [showError, setShowError] = useState(false);
  const [showDeletedTags, setShowDeletedTags] = useState(false);

  const allTags = useMemo(() => {
    const reflTags = [...new Set(store.reflections.flatMap((r) => r.tags))];
    const habitTagsList = store.habits.filter(h => h.createTag).map(h => `#${h.name}`);
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
    const reflTags = [...new Set(store.reflections.flatMap((r) => r.tags))];
    const habitTagsList = store.habits.filter(h => h.createTag).map(h => `#${h.name}`);
    return [...new Set([...reflTags, ...habitTagsList])];
  }, [store.reflections, store.habits]);

  // Tags that are deleted but still have data
  const deletedTagsWithData = useMemo(() => {
    const availableSet = new Set(allTags);
    return allUsedTags.filter(t => !availableSet.has(t));
  }, [allTags, allUsedTags]);

  // Current visible tags in filter bar
  const visibleTags = showDeletedTags ? allUsedTags : allTags;
  const filtered = useMemo(() =>
    filterTag ? store.reflections.filter((r) => r.tags.includes(filterTag)) : store.reflections,
    [filterTag, store.reflections]
  );
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = { '': store.reflections.length };
    store.reflections.forEach(r => r.tags.forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
    return counts;
  }, [store.reflections]);
  const habitTags = useMemo(() => store.habits.filter((h) => h.createTag).map((h) => `#${h.name}`), [store.habits]);
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
    // Sort filtered by timestamp descending (newest first)
    const sorted = [...filtered].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
    sorted.forEach((r) => {
      const d = new Date(r.timestamp).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
      if (!m[d]) m[d] = []; m[d].push(r);
    });
    return m;
  }, [filtered]);

  const cardStyle = useCachedStyle(() => ({ ...cs(TH), padding: '12px 16px', marginBottom: 12 }), [TH]);

  const handleAddReflection = () => {
    if (content.length > 200) {
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
      return;
    }
    if (content.trim()) {
      try {
        store.addReflection({ content, tags: selTags, mood, colorIdx, link: link.trim() || undefined });
        setContent('');
        setSelTags([]);
        setMood('');
        setLink('');
        setShowNew(false);
      } catch (e) {
        setShowError(true);
        setTimeout(() => setShowError(false), 3000);
      }
    }
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
          {[{ t: T('habitStatusAll'), active: !filterTag, fn: () => setFilterTag(''), isDeleted: false } as const, ...visibleTags.map((t) => {
            const isDeleted = !allTags.includes(t);
            return { t, active: filterTag === t, fn: () => setFilterTag((f) => f === t ? '' : t), isDeleted } as const;
          })].map(({ t, active, fn, isDeleted }) => (
            <button key={t} onClick={fn} style={{
              padding: '6px 14px', borderRadius: 20, fontSize: FONT_BUTTON, cursor: 'pointer',
              border: isDeleted ? `1px dashed ${TH.sub}` : `1px solid ${P}`,
              background: active ? P : 'transparent',
              color: active ? '#fff' : (isDeleted ? TH.sub : P),
              textDecoration: isDeleted ? 'line-through' : 'none',
              opacity: isDeleted ? 0.6 : 1,
            }}>{t} {tagCounts[filterTag === t ? '' : t] ?? tagCounts[t] ?? 0}</button>
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

      <div style={cardStyle as React.CSSProperties}>
        <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: P }}>{store.reflections.length}</div>
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
            const bgColor = r.colors?.[0] || MIND_COLORS[0][0];
            const bgColor2 = r.colors?.[1] || MIND_COLORS[0][1];
            return (
            <div key={r.id} onContextMenu={(e) => { e.preventDefault(); setActionMenuId(r.id); setActionMenuPos({ x: e.clientX, y: e.clientY }); }}
              style={{ background: `linear-gradient(135deg,${bgColor},${bgColor2})`, borderRadius: 18, padding: 18, marginBottom: 10, marginLeft: 20, position: 'relative', overflow: 'hidden', cursor: 'context-menu' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,.05)', transform: 'translate(20px,-20px)' }} />
              <div style={{ fontSize: FONT_BODY, lineHeight: 1.7, marginBottom: 10, color: '#fff' }}>{r.content}</div>
              {r.link && (
                <a href={r.link} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: FONT_SUB, color: 'rgba(255,255,255,.7)', textDecoration: 'underline', marginBottom: 8 }}>
                  <Link size={14} style={{verticalAlign:'middle',marginRight:4}} />{r.link}
                </a>
              )}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {r.tags.map((tag) => <span key={tag} style={{ fontSize: FONT_BODY, padding: '2px 8px', borderRadius: 10, background: 'rgba(255,255,255,.2)', color: 'rgba(255,255,255,.9)' }}>{tag}</span>)}
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
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {MIND_COLORS.map((c, i) => (
                <div key={i} onClick={() => setColorIdx(i)} style={{ width: 26, height: 26, borderRadius: 13, background: `linear-gradient(135deg,${c[0]},${c[1]})`, cursor: 'pointer', border: colorIdx === i ? '3px solid #fff' : '3px solid transparent', flexShrink: 0 }} />
              ))}
            </div>
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder={T('reflectionPlaceholder')}
                style={{ width: '100%', minHeight: 90, background: TH.card, border: `1px solid ${content.length > 200 ? '#EF4444' : TH.border}`, borderRadius: 12, padding: 12, color: TH.text, fontSize: FONT_BODY, resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
              <div style={{ position: 'absolute', bottom: 8, right: 12, fontSize: FONT_BODY, color: content.length > 200 ? '#EF4444' : TH.sub }}>
                {content.length}/200
              </div>
            </div>
            <div style={{ fontSize: FONT_BODY, color: TH.sub, marginBottom: 8 }}>{T('addTags')}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {allTagOptions.map((tag) => (
                <button key={tag} onClick={() => setSelTags((ts) => ts.includes(tag) ? ts.filter((x) => x !== tag) : [...ts, tag])}
                  style={{ padding: '4px 12px', borderRadius: 20, fontSize: FONT_BODY, cursor: 'pointer', border: '1px solid', background: selTags.includes(tag) ? P : 'transparent', color: selTags.includes(tag) ? '#fff' : P, borderColor: P }}>{tag}</button>
              ))}
              <button onClick={() => setShowTagManager(true)}
                style={{ padding: '4px 12px', borderRadius: 20, fontSize: FONT_BODY, cursor: 'pointer', border: '1px dashed', background: 'transparent', color: TH.sub, borderColor: TH.sub }}><Settings size={16} style={{verticalAlign:'middle'}} /></button>
            </div>
            <div style={{ fontSize: FONT_BODY, color: TH.sub, marginBottom: 8 }}>{T('mood')}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
              {allMoodOptions.map((m) => (
                <button key={m} onClick={() => setMood(m)}
                  style={{ padding: '5px 12px', borderRadius: 16, fontSize: FONT_BODY, cursor: 'pointer', border: '1px solid', background: mood === m ? P : 'transparent', color: mood === m ? '#fff' : P, borderColor: P }}>{m}</button>
              ))}
              <button onClick={() => setShowMoodManager(true)}
                style={{ padding: '5px 12px', borderRadius: 16, fontSize: FONT_BODY, cursor: 'pointer', border: '1px dashed', background: 'transparent', color: TH.sub, borderColor: TH.sub }}><Settings size={16} style={{verticalAlign:'middle'}} /></button>
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
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {MIND_COLORS.map((c, i) => (
                <div key={i} onClick={() => setEditColorIdx(i)} style={{ width: 26, height: 26, borderRadius: 13, background: `linear-gradient(135deg,${c[0]},${c[1]})`, cursor: 'pointer', border: editColorIdx === i ? '3px solid #fff' : '3px solid transparent', flexShrink: 0 }} />
              ))}
            </div>
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} placeholder={T('reflectionPlaceholder')}
                style={{ width: '100%', minHeight: 90, background: TH.card, border: `1px solid ${editContent.length > 200 ? '#EF4444' : TH.border}`, borderRadius: 12, padding: 12, color: TH.text, fontSize: FONT_BODY, resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
              <div style={{ position: 'absolute', bottom: 8, right: 12, fontSize: FONT_BODY, color: editContent.length > 200 ? '#EF4444' : TH.sub }}>
                {editContent.length}/200
              </div>
            </div>
            <div style={{ fontSize: FONT_BODY, color: TH.sub, marginBottom: 8 }}>{T('addTags')}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {allTagOptions.map((tag) => (
                <button key={tag} onClick={() => setEditTags((ts) => ts.includes(tag) ? ts.filter((x) => x !== tag) : [...ts, tag])}
                  style={{ padding: '4px 12px', borderRadius: 20, fontSize: FONT_BODY, cursor: 'pointer', border: '1px solid', background: editTags.includes(tag) ? P : 'transparent', color: editTags.includes(tag) ? '#fff' : P, borderColor: P }}>{tag}</button>
              ))}
              <button onClick={() => setShowTagManager(true)}
                style={{ padding: '6px 12px', borderRadius: 16, border: `1px dashed ${TH.border}`, background: 'transparent', color: TH.sub, cursor: 'pointer' }}>
                <Settings size={16} />
              </button>
            </div>
            <div style={{ fontSize: FONT_BODY, color: TH.sub, marginBottom: 8 }}>{T('mood')}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
              {allMoodOptions.map((m) => (
                <button key={m} onClick={() => setEditMood(m)}
                  style={{ padding: '5px 12px', borderRadius: 16, fontSize: FONT_BODY, cursor: 'pointer', border: '1px solid', background: editMood === m ? P : 'transparent', color: editMood === m ? '#fff' : P, borderColor: P }}>{m}</button>
              ))}
              <button onClick={() => setShowMoodManager(true)}
                style={{ padding: '6px 12px', borderRadius: 16, border: `1px dashed ${TH.border}`, background: 'transparent', color: TH.sub, cursor: 'pointer' }}>
                <Settings size={16} />
              </button>
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
            <button onClick={() => { openEdit(store.reflections.find(r => r.id === actionMenuId)); setActionMenuId(null); }}
              style={{ width: '100%', padding: '10px 16px', border: 'none', borderRadius: 8, background: TH.card, color: TH.text, fontSize: FONT_BODY, fontWeight: 600, cursor: 'pointer', marginBottom: 8 }}>
              {T('reflEditTitle')}
            </button>
            <button onClick={() => {
              const r = store.reflections.find(r => r.id === actionMenuId);
              if (r) {
                const tagsStr = r.tags?.length ? `\n标签: ${r.tags.join(' ')}` : '';
                const moodStr = r.mood ? `\n心情: ${r.mood}` : '';
                const timeStr = new Date(r.timestamp ?? 0).toLocaleString('zh-CN');
                const text = `${r.content}${tagsStr}${moodStr}\n\n— ${timeStr}`;
                navigator.clipboard.writeText(text).catch(() => {});
              }
              setActionMenuId(null);
            }}
              style={{ width: '100%', padding: '10px 16px', border: 'none', borderRadius: 8, background: TH.card, color: TH.text, fontSize: FONT_BODY, fontWeight: 600, cursor: 'pointer', marginBottom: 8 }}>
              {T('reflShare')}
            </button>
            {(() => {
              const r = store.reflections.find(r => r.id === actionMenuId);
              const isWithin7Days = r && (Date.now() - r.timestamp) < 7 * 24 * 60 * 60 * 1000;
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
    </>
  );
}
