// ─── PocketBase client singleton & community API ──────────────────
// Shared across all platforms. Call setPocketbaseUrl() once at app init.
import PocketBase, { type RecordModel } from 'pocketbase';

let _pb: PocketBase | null = null;

export function setPocketbaseUrl(url: string) {
  _pb = new PocketBase(url);
}

export function getPb(): PocketBase {
  if (!_pb) throw new Error('PocketBase not initialized. Call setPocketbaseUrl() first.');
  return _pb;
}

// ── Types ─────────────────────────────────────────────────────────
export interface CheckinRecord {
  id: string;
  user_id: string;
  habit_type: string;
  lat_blur?: number;
  lng_blur?: number;
  insight?: string;
  checked_at: string;
}

export interface MapPin {
  id: string;
  habit_type: string;
  lat: number;
  lng: number;
  insight?: string;
  pinned_at: string;
}

export interface PublishedMind {
  id: string;
  anon_id: string;
  content: string;
  tags?: string[];
  mood?: string;
  card_theme?: string;
}

// ── Checkins ──────────────────────────────────────────────────────
export async function pbCreateCheckin(
  token: string,
  data: Omit<CheckinRecord, 'id'>
): Promise<CheckinRecord> {
  const pb = getPb();
  pb.authStore.save(token, null);
  return pb.collection('checkins').create<CheckinRecord>(data);
}

export async function pbListCheckins(token: string): Promise<CheckinRecord[]> {
  const pb = getPb();
  pb.authStore.save(token, null);
  const result = await pb.collection('checkins').getList<CheckinRecord>(1, 50, {
    sort: '-checked_at',
  });
  return result.items;
}

// ── Map Pins (public read, auth to create) ────────────────────────
export async function pbListMapPins(token?: string): Promise<MapPin[]> {
  const pb = getPb();
  if (token) pb.authStore.save(token, null);
  const result = await pb.collection('map_pins').getList<MapPin>(1, 200, {
    sort: '-pinned_at',
  });
  return result.items;
}

export async function pbCreateMapPin(
  token: string,
  data: Omit<MapPin, 'id'>
): Promise<MapPin> {
  const pb = getPb();
  pb.authStore.save(token, null);
  return pb.collection('map_pins').create<MapPin>(data);
}

// ── Published Minds (public read, auth to create) ─────────────────
export async function pbListPublishedMinds(token?: string): Promise<PublishedMind[]> {
  const pb = getPb();
  if (token) pb.authStore.save(token, null);
  const result = await pb.collection('published_minds').getList<PublishedMind>(1, 50, {
    sort: '-created',
  });
  return result.items;
}

export async function pbPublishMind(
  token: string,
  data: Omit<PublishedMind, 'id'>
): Promise<PublishedMind> {
  const pb = getPb();
  pb.authStore.save(token, null);
  return pb.collection('published_minds').create<PublishedMind>(data);
}
