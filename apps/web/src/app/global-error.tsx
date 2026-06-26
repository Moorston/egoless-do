'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="zh">
      <body style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Something went wrong</h2>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>A critical error occurred. The issue has been reported.</p>
        <button
          onClick={() => reset()}
          style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: 'none', background: '#3B82F6', color: '#fff', cursor: 'pointer', fontSize: '1rem' }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
