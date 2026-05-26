'use client';

import { useState, useCallback, useContext, createContext } from 'react';
import type { SportItem } from '@egoless-do/core';

// ── Overlay types ──────────────────────────────────────────────────
export type OverlayKey =
  | 'globalMap'
  | 'checkin'
  | 'sport'
  | 'fastHistory'
  | 'medHistory'
  | 'history'
  | 'checkinDetail'
  | 'foodLog'
  | 'grace'
  | 'exerciseHistory';

export interface OverlayProps {
  sport?: SportItem;
  checkinDetailDate?: string;
  globalMapTitle?: string;
  globalMapIcon?: string;
}

interface OverlayContextValue {
  overlay: OverlayKey | null;
  overlayProps: OverlayProps;
  open: (key: OverlayKey, props?: OverlayProps) => void;
  close: () => void;
}

export const OverlayContext = createContext<OverlayContextValue | null>(null);

// ── Hook ───────────────────────────────────────────────────────────
export function useOverlayState() {
  const [overlay, setOverlay] = useState<OverlayKey | null>(null);
  const [overlayProps, setOverlayProps] = useState<OverlayProps>({});

  const open = useCallback((key: OverlayKey, props?: OverlayProps) => {
    setOverlay(key);
    setOverlayProps(props ?? {});
  }, []);

  const close = useCallback(() => {
    setOverlay(null);
    setOverlayProps({});
  }, []);

  return { overlay, overlayProps, open, close };
}

/** Access overlay context from any child component. */
export function useOverlay(): OverlayContextValue {
  const ctx = useContext(OverlayContext);
  if (!ctx) throw new Error('useOverlay must be used within OverlayContext');
  return ctx;
}
