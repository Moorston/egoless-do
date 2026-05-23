// ─── PocketBase client (server-side only) ─────────────────────────
import PocketBase from 'pocketbase';

const PB_URL = process.env.POCKETBASE_URL ?? 'http://localhost:8090';

let _pb: PocketBase | null = null;

export function getPb(): PocketBase {
  if (!_pb) {
    _pb = new PocketBase(PB_URL);
    _pb.autoCancellation(false);
  }
  return _pb;
}

export { PocketBase };
