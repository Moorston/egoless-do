// ─── React hook: open DB, run migrations, expose instance ────────
import { useEffect, useState } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';
import { openDatabase } from './schema';

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
        console.error('[useDatabase] Failed to open database:', e);
        setError(e instanceof Error ? e : new Error(String(e)));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { db, ready, error };
}
