'use client';

const AMAP_KEY = process.env.NEXT_PUBLIC_AMAP_KEY ?? '';
const AMAP_SECURITY_KEY = process.env.NEXT_PUBLIC_AMAP_SECURITY_KEY ?? '';

let loadPromise: Promise<typeof AMap> | null = null;

export function loadAMap(): Promise<typeof AMap> {
  if (loadPromise) return loadPromise;

  if (typeof window === 'undefined') {
    return Promise.reject(new Error('AMap can only be loaded in browser'));
  }

  (window as any)._AMapSecurityConfig = { securityJsCode: AMAP_SECURITY_KEY };

  loadPromise = import('@amap/amap-jsapi-loader').then((mod) => {
    const AMapLoader = mod.default;
    return AMapLoader.load({
      key: AMAP_KEY,
      version: '2.0',
      plugins: ['AMap.Scale', 'AMap.ToolBar'],
    }) as Promise<typeof AMap>;
  });

  return loadPromise;
}
