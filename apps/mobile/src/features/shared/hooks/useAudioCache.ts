import { useState, useCallback, useRef } from 'react';
import * as FileSystem from 'expo-file-system';

const AUDIO_DIR = `${FileSystem.documentDirectory ?? ''}audio/`;

async function ensureAudioDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(AUDIO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(AUDIO_DIR, { intermediates: true });
  }
}

function localPath(id: string): string {
  return `${AUDIO_DIR}${id}.mp3`;
}

export function useAudioCache() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const activeDownloads = useRef(new Map<string, Promise<string>>());

  /** Returns local file URI if cached, otherwise null */
  const getCachedPath = useCallback(async (id: string): Promise<string | null> => {
    const path = localPath(id);
    const info = await FileSystem.getInfoAsync(path);
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
      await ensureAudioDir();
      const dest = localPath(id);
      setDownloading(id);
      setProgress(0);

      const downloadResumable = FileSystem.createDownloadResumable(
        remoteUrl,
        dest,
        {},
        (p) => {
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
          const info = await FileSystem.getInfoAsync(dest);
          if (info.exists) await FileSystem.deleteAsync(dest, { idempotent: true });
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
    const path = localPath(id);
    const info = await FileSystem.getInfoAsync(path);
    return info.exists;
  }, []);

  /** Remove cached audio file for given id */
  const removeCached = useCallback(async (id: string): Promise<void> => {
    const path = localPath(id);
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) await FileSystem.deleteAsync(path, { idempotent: true });
  }, []);

  return { getCachedPath, downloadAudio, isCached, removeCached, downloading, progress };
}
