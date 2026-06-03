'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { MOODS, COLORS, ensureOrderContains, FONT_BODY, FONT_TITLE, FONT_SUB, FONT_CLOSE } from '@egoless-do/core';
import { useTheme, useT } from './helpers';
import { useWebStore } from '../store/useWebStore';
import { X, Check, Pencil, Trash2, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import { ConfirmDialog, useWebDragReorder } from './ManagerPanelShared';

// ─── Mood Manager Panel ───────────────────────────────────────────
const MoodManagerPanel = React.memo(function MoodManagerPanel({ onClose }: { onClose: () => void }) {
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
    const usedCount = (store.reflections ?? []).filter(r => r.mood === confirmDel).length;
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
});

export default MoodManagerPanel;
