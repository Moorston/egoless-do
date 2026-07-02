// ─── PocketBase client singleton ─────────────────────────────────
// Shared across all platforms. Call setPocketbaseUrl() once at app init.
import PocketBase from 'pocketbase';

let _pb: PocketBase | null = null;

export function setPocketbaseUrl(url: string) {
  _pb = new PocketBase(url);
}

export function getPb(): PocketBase {
  if (!_pb) throw new Error('PocketBase not initialized. Call setPocketbaseUrl() first.');
  return _pb;
}
