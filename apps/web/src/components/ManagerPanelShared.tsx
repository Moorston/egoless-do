'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { COLORS, FONT_BODY } from '@egoless-do/core';
import { useTheme, useT } from './helpers';

// ─── Confirm Dialog ─────────────────────────────────────────────
export function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
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
export function useWebDragReorder(
  orderedItems: string[],
  onReorder: (from: number, to: number) => void,
) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragOverIdxRef = useRef<number | null>(null);
  const startIdx = useRef(0);
  const startY = useRef(0);
  const rowHeight = 44;

  const handleMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const idx = orderedItems.indexOf(id);
    setDraggedId(id);
    setDragOverIdx(idx);
    dragOverIdxRef.current = idx;
    startIdx.current = idx;
    startY.current = e.clientY;
  }, [orderedItems]);

  useEffect(() => {
    if (!draggedId) return;
    const handleMouseMove = (e: MouseEvent) => {
      const offset = Math.round((e.clientY - startY.current) / rowHeight);
      const target = Math.max(0, Math.min(orderedItems.length - 1, startIdx.current + offset));
      dragOverIdxRef.current = target;
      setDragOverIdx(target);
    };
    const handleMouseUp = () => {
      const idx = dragOverIdxRef.current;
      if (idx !== null) {
        const currentIdx = orderedItems.indexOf(draggedId);
        if (currentIdx >= 0 && currentIdx !== idx) {
          onReorder(currentIdx, idx);
        }
      }
      setDraggedId(null);
      setDragOverIdx(null);
      dragOverIdxRef.current = null;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggedId, orderedItems, onReorder]);

  return { draggedId, dragOverIdx, handleMouseDown };
}
