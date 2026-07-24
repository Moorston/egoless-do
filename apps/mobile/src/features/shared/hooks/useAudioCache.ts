import { useState, useCallback, useRef } from 'react';

// Lazy-loaded expo-file-system (legacy API) — deferred until first audio cache access
// Using legacy import to maintain compatibility with getInfoAsync/deleteAsync/makeDirectoryAsync
let _FS: typeof import('expo-file-system/legacy') | null = null;
function getFS() { return _FS ??= require('expo-file-system/legacy'); }

let _audioDir: string | null = null;
function getAudioDir(): string {
  if (!_audioDir) _audioDir = `${getFS().documentDirectory ?? ''}audio/`;
  return _audioDir;
}

async function ensureAudioDir(): Promise<void> {
  const FS = getFS();
  const dir = getAudioDir();
  const info = await FS.getInfoAsync(dir);
  if (!info.exists) {
    await FS.makeDirectoryAsync(dir, { intermediates: true });
  }
}

function localPath(id: string): string {
  return `${getAudioDir()}${id}.mp3`;
}

export function useAudioCache() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const activeDownloads = useRef(new Map<string, Promise<string>>());

  /** Returns local file URI if cached, otherwise null */
  const getCachedPath = useCallback(async (id: string): Promise<string | null> => {
    const FS = getFS();
    const path = localPath(id);
    const info = await FS.getInfoAsync(path);
    return info.exists ? path : null;
  }, []);

  /** Download audio from remote URL and cache locally */
  const downloadAudio = useCallback(async (
    id: string,
    remoteUrl: string,
    onProgress?: (fraction: number) => void,
  ): Promise<string> => {
    // Deduplicate concurrent downloads for the same id
    const existing = activeDownloads.current.get(id);
    if (existing) return existing;

    const promise = (async () => {
      const FS = getFS();
      await ensureAudioDir();
      const dest = localPath(id);
      setDownloading(id);
      setProgress(0);

      const downloadResumable = FS.createDownloadResumable(
        remoteUrl,
        dest,
        {},
        (p: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => {
          const fraction = p.totalBytesExpectedToWrite > 0
            ? p.totalBytesWritten / p.totalBytesExpectedToWrite
            : 0;
          setProgress(fraction);
          onProgress?.(fraction);
        },
      );

      try {
        const result = await downloadResumable.downloadAsync();
        if (!result?.uri) throw new Error('Download returned no URI');
        return result.uri;
      } catch (err) {
        // Clean up partial file
        try {
          const info = await FS.getInfoAsync(dest);
          if (info.exists) await FS.deleteAsync(dest, { idempotent: true });
        } catch {}
        throw err;
      } finally {
        setDownloading(null);
        setProgress(0);
        activeDownloads.current.delete(id);
      }
    })();

    activeDownloads.current.set(id, promise);
    return promise;
  }, []);

  /** Check if audio is cached for given id */
  const isCached = useCallback(async (id: string): Promise<boolean> => {
    const FS = getFS();
    const path = localPath(id);
    const info = await FS.getInfoAsync(path);
    return info.exists;
  }, []);

  /** Remove cached audio file for given id */
  const removeCached = useCallback(async (id: string): Promise<void> => {
    const FS = getFS();
    const path = localPath(id);
    const info = await FS.getInfoAsync(path);
    if (info.exists) await FS.deleteAsync(path, { idempotent: true });
  }, []);

  return { getCachedPath, downloadAudio, isCached, removeCached, downloading, progress };
}
