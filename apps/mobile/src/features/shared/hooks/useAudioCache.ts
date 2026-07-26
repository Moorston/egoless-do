import { File, Directory, Paths } from 'expo-file-system';
import { useState, useCallback, useRef } from 'react';

// New expo-file-system API: File / Directory / Paths (replaces expo-file-system/legacy).
// Remaining gap vs legacy: no resumable download. We preserve progress via XMLHttpRequest
// (RN's fetch().body does not reliably support streaming/getReader), buffering the payload
// then writing it with the new File API.
const audioDir = new Directory(Paths.document, 'audio');

function localFile(id: string): File {
  return new File(audioDir, `${id}.mp3`);
}

async function ensureAudioDir(): Promise<void> {
  if (!audioDir.exists) audioDir.create({ intermediates: true });
}

export function useAudioCache() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const activeDownloads = useRef(new Map<string, Promise<string>>());

  /** Returns local file URI if cached, otherwise null */
  const getCachedPath = useCallback(async (id: string): Promise<string | null> => {
    const file = localFile(id);
    return file.exists ? file.uri : null;
  }, []);

  /** Download audio from remote URL and cache locally (preserves progress via XHR) */
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
      const dest = localFile(id);
      setDownloading(id);
      setProgress(0);

      const data: ArrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', remoteUrl);
        xhr.responseType = 'arraybuffer';
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response as ArrayBuffer);
          else reject(new Error(`Download failed: HTTP ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error('Network error during audio download'));
        xhr.ontimeout = () => reject(new Error('Audio download timed out'));
        xhr.onprogress = (e: ProgressEvent) => {
          if (e.lengthComputable && e.total > 0) {
            const fraction = e.loaded / e.total;
            setProgress(fraction);
            onProgress?.(fraction);
          }
        };
        xhr.send();
      });

      // Write to disk (new API, synchronous). Clean up on write failure.
      try {
        dest.write(new Uint8Array(data));
      } catch (writeErr) {
        if (dest.exists) dest.delete();
        throw writeErr;
      }
      return dest.uri;
    })();

    // Cleanup after settle; error propagates to caller.
    const wrapped = promise.finally(() => {
      setDownloading(null);
      setProgress(0);
      activeDownloads.current.delete(id);
    });

    activeDownloads.current.set(id, wrapped);
    return wrapped;
  }, []);

  /** Check if audio is cached for given id */
  const isCached = useCallback(async (id: string): Promise<boolean> => {
    return localFile(id).exists;
  }, []);

  /** Remove cached audio file for given id */
  const removeCached = useCallback(async (id: string): Promise<void> => {
    const file = localFile(id);
    if (file.exists) file.delete();
  }, []);

  return { getCachedPath, downloadAudio, isCached, removeCached, downloading, progress };
}
