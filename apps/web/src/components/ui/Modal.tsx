'use client';

import React, { useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { THEMES } from '@egoless-do/core';
import { useWebStore } from '../../store/useWebStore';

const BREAKPOINT_MOBILE = 390;

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Max width of the modal content (default 390) */
  maxWidth?: number;
  /** z-index (default 500) */
  zIndex?: number;
}

export function Modal({ open, onClose, children, maxWidth = BREAKPOINT_MOBILE, zIndex = 500 }: ModalProps) {
  const theme = useWebStore((s) => s.theme);
  const TH = THEMES[theme];
  const contentRef = useRef<HTMLDivElement>(null);

  const handleBackdrop = useCallback((e: React.MouseEvent) => {
    if (contentRef.current && !contentRef.current.contains(e.target as Node)) {
      onClose();
    }
  }, [onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      onClick={handleBackdrop}
      style={{
        position: 'fixed', inset: 0, zIndex,
        background: 'rgba(0,0,0,.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        ref={contentRef}
        style={{
          background: TH.bg, borderRadius: 20, width: '100%', maxWidth,
          maxHeight: '85vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch',
          boxShadow: '0 8px 40px rgba(0,0,0,.4)',
        }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
