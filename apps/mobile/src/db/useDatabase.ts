// ─── React hook: open DB, run migrations, expose instance ────────
import { useEffect, useState } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';
import { openDatabase } from './schema';

export function useDatabase() {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const instance = await openDatabase();
      setDb(instance);
      setReady(true);
    })();
  }, []);

  return { db, ready };
}
