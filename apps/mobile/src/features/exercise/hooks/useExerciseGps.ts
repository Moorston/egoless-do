let _LocationMod: any = null;

async function getLocation() {
  if (_LocationMod === null) {
    try { _LocationMod = await import('expo-location'); } catch { _LocationMod = false; }
  }
  return _LocationMod;
}

export async function reqLocPerm() {
  const m = await getLocation();
  if (!m) return { status: 'denied' };
  try { return await m.requestForegroundPermissionsAsync(); } catch { return { status: 'denied' }; }
}

export async function getCurPos() {
  const m = await getLocation();
  if (!m) return null;
  try { return await m.getCurrentPositionAsync({}); } catch { return null; }
}

export async function watchPos(cb: (loc: any) => void) {
  const m = await getLocation();
  if (!m) return { remove: () => {} };
  try { return await m.watchPositionAsync({ accuracy: m.Accuracy.High, timeInterval: 2000, distanceInterval: 5 }, cb); } catch { return { remove: () => {} }; }
}

export function computeDistance(coords: { latitude: number; longitude: number }[]): number {
  if (coords.length < 2) return 0;
  return coords.reduce((total, c, i) => {
    if (i === 0) return 0;
    const prev = coords[i - 1];
    const dlat = (c.latitude - prev.latitude) * Math.PI / 180;
    const dlng = (c.longitude - prev.longitude) * Math.PI / 180;
    const a = Math.sin(dlat / 2) ** 2 + Math.cos(prev.latitude * Math.PI / 180) *
              Math.cos(c.latitude * Math.PI / 180) * Math.sin(dlng / 2) ** 2;
    return total + 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, 0);
}
