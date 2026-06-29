'use client';

import React, { Component } from 'react';
import * as Sentry from '@sentry/nextjs';
import { t, FONT_CLOSE, createLogger } from '@egoless-do/core';
import { useWebStore } from '../../store/useWebStore';
import { AlertTriangle } from 'lucide-react';

const log = createLogger('Web');

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
    log.error('ErrorBoundary caught:', error, info);
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{ padding: 20, textAlign: 'center', color: '#EF4444' }}>
          <div style={{ fontSize: FONT_CLOSE, marginBottom: 8 }}><AlertTriangle size={24} /></div>
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
