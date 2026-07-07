// ─── React hook: open DB, run migrations, expose instance ────────
import { createLogger } from '@egoless-do/core';
import type { SQLiteDatabase } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { openDatabase } from './schema';

const log = createLogger('DB');

export function useDatabase() {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const instance = await openDatabase();
        if (cancelled) return;
        setDb(instance);
        setReady(true);
      } catch (e) {
        if (cancelled) return;
        log.error(e instanceof Error ? e : new Error(String(e)), { message: 'Failed to open database' });
        setError(e instanceof Error ? e : new Error(String(e)));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { db, ready, error };
}
