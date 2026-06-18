'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { TAGS_PRESET, COLORS, ensureOrderContains, FONT_BODY, FONT_TITLE, FONT_SUB, FONT_CLOSE } from '@egoless-do/core';
import { useTheme, useT } from './helpers';
import { useWebStore } from '../store/useWebStore';
import { X, Check, Pencil, Trash2, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import { ConfirmDialog, useWebDragReorder } from './ManagerPanelShared';

// ─── Tag Manager Panel ────────────────────────────────────────────
const TagManagerPanel = React.memo(function TagManagerPanel({ onClose }: { onClose: () => void }) {
  const store = useWebStore();
  const { TH, P } = useTheme();
  const T = useT();
  const [newTag, setNewTag] = useState('');
  const [editingTag, setEditingTag] = useState<{ old: string; new: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const habitTagsList = useMemo(() => (store.habits ?? []).filter(h => !h.deleted && h.createTag).map(h => `#${h.name}`), [store.habits]);

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
    const usedCount = (store.reflections ?? []).filter(r => !r.deleted && r.tags.includes(confirmDel)).length;
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
});

export default TagManagerPanel;
