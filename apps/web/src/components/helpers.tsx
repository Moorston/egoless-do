'use client';

import React, { useState, useEffect, useMemo, Component, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { THEMES, t } from '@egoless-do/core';
import { useWebStore } from '../store/useWebStore';

export function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  const theme = useWebStore((s) => s.theme);
  const TH = THEMES[theme];
  return (
    <div onClick={onChange} style={{ width: 44, height: 24, borderRadius: 12, background: on ? TH.primary : 'rgba(128,128,128,.3)', position: 'relative', cursor: 'pointer', transition: 'background .2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 2, left: on ? 22 : 2, width: 20, height: 20, borderRadius: 10, background: '#fff', transition: 'left .2s' }} />
    </div>
  );
}

export function RowItem({ label, right, sub, icon, last, onClick }: { label: string; right: React.ReactNode; sub?: string; icon?: string; last?: boolean; onClick?: () => void }) {
  const theme = useWebStore((s) => s.theme);
  const TH = THEMES[theme];
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: last ? 'none' : `1px solid ${TH.border}`, cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
        <div>
          <div style={{ fontSize: 16, color: TH.text }}>{label}</div>
          {sub && <div style={{ fontSize: 16, color: TH.sub, marginTop: 1 }}>{sub}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: TH.sub, fontSize: 16 }}>{right}</div>
    </div>
  );
}

export function LinkWorldBtn({ label, onClick }: { label?: string; onClick: () => void }) {
  const theme = useWebStore((s) => s.theme);
  const language = useWebStore((s) => s.language);
  const TH = THEMES[theme];
  const P = TH.primary;
  return (
    <div onClick={onClick} style={{ background: TH.card, borderRadius: 16, marginBottom: 12, border: `1px solid ${TH.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={P} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
      <span style={{ fontSize: 16, color: TH.text }}>{t('linkWorld', language)}{label ? ` — ${label}` : ''}</span>
      <span style={{ marginLeft: 'auto', color: TH.sub }}>›</span>
    </div>
  );
}

export function useTheme() {
  const theme = useWebStore((s) => s.theme);
  const TH = THEMES[theme];
  const P = TH.primary;
  return { TH, P };
}

export function useT() {
  const language = useWebStore((s) => s.language);
  return (k: string) => t(k, language);
}

export const cs = (TH: (typeof THEMES)[keyof typeof THEMES]): React.CSSProperties => ({
  background: TH.card, borderRadius: 16, padding: 16, marginBottom: 12, border: `1px solid ${TH.border}`, position: 'relative', zIndex: 1,
});

export const inp = (TH: (typeof THEMES)[keyof typeof THEMES]): React.CSSProperties => ({
  width: '100%', background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 10, padding: '10px 12px', color: TH.text, fontSize: 16, outline: 'none', boxSizing: 'border-box',
});

export function useResponsive() {
  const [width, setWidth] = useState(390);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    setWidth(window.innerWidth);
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return {
    isMobile: !mounted || width < 768,
    isTablet: mounted && width >= 768 && width < 1024,
    isDesktop: mounted && width >= 1024,
    width,
    maxWidth: width < 768 ? 390 : width < 1024 ? 768 : 1200,
  };
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundaryInner extends Component<
  { children: React.ReactNode; fallback?: React.ReactNode; lang?: string },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{ padding: 20, textAlign: 'center', color: '#EF4444' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
          <div>{t('errorBoundary', this.props.lang)}</div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function ErrorBoundary({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const lang = useWebStore((s) => s.language);
  return <ErrorBoundaryInner lang={lang} fallback={fallback}>{children}</ErrorBoundaryInner>;
}

export function useCachedStyle<T>(factory: () => T, deps: React.DependencyList): T {
  return useMemo(factory, deps);
}

// ── Shared Modal Component ───────────────────────────────────────

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Max width of the modal content (default 390) */
  maxWidth?: number;
  /** z-index (default 500) */
  zIndex?: number;
}

export function Modal({ open, onClose, children, maxWidth = 390, zIndex = 500 }: ModalProps) {
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
